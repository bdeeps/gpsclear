// Chapter 6: other constellations, and what the phone does. Four global systems: GPS (USA, about 20,200 km, 55 degrees),
// GLONASS (Russia, about 19,100 km, 64.8 degrees, 3 planes), Galileo (Europe, about 23,222 km, 56 degrees, 3 planes) and BeiDou
// (China: medium-orbit satellites at about 21,528 km and 55 degrees, plus inclined and geostationary ones at 35,786 km).
// Regional systems (NavIC for India, QZSS for Japan) are not drawn. Rings and satellite spacing are circular and even:
// a schematic, not the real slots. A-GPS: a phone gets the satellite orbit data over the internet (the "ephemeris") instead
// of waiting for it from the satellite, which repeats it every 30 s at 50 bits per second.
import { THREE, M, RE, KM, COL, SYSTEMS, makeSystem, satPos, orbitRing, geoVec, makeEarth, worldLights, earthAngle, elevationOf, D2R, clock } from '../gps.js';
import { swarm } from '../kit.js';

const KEYS = ['gps', 'glonass', 'galileo', 'beidou'];

export default {
  id: 'world',
  short: 'Four systems, one phone',
  title: 'Your phone listens to four systems',
  subtitle: 'GPS, GLONASS, Galileo and BeiDou all work the same way, and phones use them together.',
  view: { pos: [0, 26, 78], target: [0, 0, 0] },
  learn: `<p>“GPS” is also what many people call <b>any</b> satellite navigation system. Strictly it is the American one. There are four global systems: <b>GPS</b> (USA), <b>GLONASS</b> (Russia), <b>Galileo</b> (Europe) and <b>BeiDou</b> (China). India (NavIC) and Japan (QZSS) run regional ones. They all work the same way: clocks in orbit broadcast their time and position, and the receiver measures delays.</p>
    <p>They sit at different heights and tilts. GLONASS is tilted most (64.8°) so it does well at high latitudes. BeiDou adds satellites in geostationary and inclined orbits, which sit over Asia. A modern phone chip listens to <b>all four at once</b>. More satellites in view means better geometry and, in a city, a better chance that some are above the buildings.</p>
    <p>Cold start is slow: a satellite sends the details of its orbit (the <b>ephemeris</b>) at only 50 bits a second, repeating every 30 s. <b>A-GPS</b> gives your phone that data from the internet, so it can find the satellites in seconds instead of half a minute or more.</p>
    <p class="tip"><b>Try it:</b> switch systems on and off and watch the count above the pin’s horizon. Then press <b>Start a fix</b> with and without A-GPS.</p>
    <p class="note">Orbits are circles with evenly spaced satellites, and the regional systems are left out.</p>`,
  terms: [
    { t: 'GNSS', d: 'Global navigation satellite system: the general name for GPS, GLONASS, Galileo, BeiDou and the like.' },
    { t: 'Ephemeris', d: 'The precise orbit data a satellite broadcasts about itself. A receiver needs it to know where the satellite is.' },
    { t: 'A-GPS', d: 'Assisted GPS: the phone fetches ephemeris and approximate time and place from the network, so it starts faster.' },
    { t: 'Geostationary orbit', d: 'An orbit at 35,786 km that takes one sidereal day, so the satellite hangs over one spot on the equator.' },
  ],
  defaults: { speed: 30, lat: 45, gps: true, glonass: true, galileo: true, beidou: true, assist: 'none' },
  controls: [
    { key: 'gps', type: 'toggle', label: 'GPS (USA)' },
    { key: 'glonass', type: 'toggle', label: 'GLONASS (Russia)' },
    { key: 'galileo', type: 'toggle', label: 'Galileo (Europe)' },
    { key: 'beidou', type: 'toggle', label: 'BeiDou (China)' },
    { key: 'lat', type: 'range', label: 'Pin latitude', min: -85, max: 85, step: 1, fmt: (v) => `${Math.abs(v)}° ${v < 0 ? 'S' : 'N'}` },
    { key: 'speed', type: 'range', label: 'Time speed', min: 0, max: 120, step: 1, fmt: (v) => (v === 0 ? 'Paused' : `${v} min per second`) },
    { key: 'assist', type: 'seg', label: 'Phone starts with', options: [{ v: 'none', label: 'Nothing' }, { v: 'agps', label: 'A-GPS' }] },
    { key: 'start', type: 'buttons', label: 'Cold start', items: [{ label: 'Start a fix', act: (s, inst) => inst.start() }] },
  ],
  quiz: [
    { q: 'Which of these is a global satellite navigation system?', options: ['NavIC', 'Galileo', 'QZSS', 'WAAS'], answer: 1, why: 'Galileo is European and global. NavIC and QZSS are regional, and WAAS is an augmentation for GPS.' },
    { q: 'Why does a phone use several systems together?', options: ['Each gives a different map', 'More satellites in view, better geometry and more survive between buildings', 'To save battery', 'Because GPS stopped working'], answer: 1, why: 'Over 100 satellites are available. More in view helps geometry and in cities some are always above the roofs.' },
    { q: 'What does A-GPS speed up?', options: ['The satellite’s orbit', 'Getting the orbit data, so a first fix takes seconds', 'The speed of light', 'Mobile data'], answer: 1, why: 'The phone fetches the ephemeris over the network instead of waiting for the satellite to send it at 50 bits a second.' },
  ],
  reel: [
    { ms: 5600, caption: 'GPS, GLONASS, Galileo and BeiDou all work the same way, and your phone listens to all four at once.', set: { speed: 30, lat: 45, gps: true, glonass: true, galileo: true, beidou: true }, view: { pos: [0, 26, 78], target: [0, 0, 0] }, spin: 0.3 },
  ],
  build({ stage, s }) {
    stage.setWorldMode(true);
    const root = new THREE.Group(); stage.root.add(root);
    worldLights(root);
    const earth = makeEarth(); root.add(earth);
    const pin = new THREE.Group(); earth.add(pin);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M.glow(COL.coral)); head.position.y = 0.2; pin.add(head);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), M.glow(0xffffff)); stem.position.y = 0.1; pin.add(stem);
    const sys = {};
    KEYS.forEach((k) => {
      const sats = makeSystem(k), D = SYSTEMS[k], rings = [];
      const seen = new Set();
      sats.forEach((sat) => { const id = sat.plane; if (!seen.has(id)) { seen.add(id); const r = orbitRing(sat, D.color, 0.35); rings.push(r); root.add(r); } });
      const mesh = swarm(sats.length, new THREE.OctahedronGeometry(0.36, 0), M.glow(D.color)); mesh.frustumCulled = false; root.add(mesh);
      sys[k] = { sats, rings, mesh, vis: 0 };
    });
    let tt = 0, fix = null;
    const P = new THREE.Vector3(), world = new THREE.Vector3(), tmp = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const upd = (st) => {
      const th = earthAngle(tt); earth.rotation.y = th;
      geoVec(st.lat * D2R, 0, RE, P); pin.position.copy(P); pin.quaternion.setFromUnitVectors(Y, P.clone().normalize());
      world.copy(P).applyAxisAngle(Y, th);
      KEYS.forEach((k) => {
        const g = sys[k], on = st[k]; let v = 0;
        g.sats.forEach((sat, i) => {
          satPos(sat, tt, tmp);
          const seen = elevationOf(world, tmp) > 5 * D2R;
          if (seen) v++;
          g.mesh.place(i, [tmp.x, tmp.y, tmp.z], null, on ? (seen ? 1.7 : 0.9) : 0.0001);
        });
        g.mesh.done(); g.rings.forEach((r) => { r.visible = on; });
        g.vis = on ? v : 0;
      });
    };
    upd(s);
    // a cold start: collect the orbit data
    const NEED = 30;                                   // seconds of listening for the ephemeris from a satellite with a good signal
    return {
      start() { fix = { t: 0, done: false }; },
      update(dt, st) {
        tt += dt * st.speed * 60; upd(st);
        if (fix && !fix.done) { fix.t += dt * 3; const need = st.assist === 'agps' ? 3 : NEED; if (fix.t >= need) fix.done = true; }
      },
      readout(st) {
        const tot = KEYS.reduce((a, k) => a + sys[k].vis, 0);
        const rows = KEYS.map((k) => `<div class="row"><span>${SYSTEMS[k].name}</span><b style="color:${SYSTEMS[k].css}">${st[k] ? sys[k].vis : 'off'}</b></div>`).join('');
        let bar = '';
        if (fix) {
          const need = st.assist === 'agps' ? 3 : NEED, k = Math.min(1, fix.t / need);
          bar = `<div class="row"><span>${fix.done ? 'First fix' : 'Listening for orbit data'}</span><b class="${fix.done ? 'ok' : ''}">${fix.done ? (st.assist === 'agps' ? 'in about 3 s' : 'after about 30 s') : Math.min(need, fix.t).toFixed(0) + ' s'}</b></div><div style="height:6px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:4px"><div style="height:6px;border-radius:3px;width:${(k * 100).toFixed(0)}%;background:${fix.done ? '#a3e635' : '#ffb547'}"></div></div>`;
        }
        return `<div class="big">${tot} in view</div>${rows}${bar}<div class="row"><span>Clock</span><b>${clock(tt)}</b></div>`;
      },
    };
  },
};
