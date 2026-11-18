// Chapter 1: the constellation. About 31 working GPS satellites in six orbital planes tilted 55 degrees to the equator,
// about 20,200 km up, each circling in about 11 h 58 min (half a sidereal day) so the pattern repeats over the same
// ground twice a day. The design is 24 slots, always kept so that at least four satellites are in view almost anywhere.
// Sources: GPS.gov "Space Segment" and the GPS Standard Positioning Service Performance Standard. How satellites are spread
// round each ring here is schematic (even spacing); the planes, tilt, height and period are the published figures.
import { THREE, M, RE, KM, COL, SYSTEMS, makeSystem, satPos, orbitRing, orbitVec, geoVec, makeEarth, worldLights, makeSat, earthAngle, elevationOf, clock, D2R, clamp } from '../gps.js';

const PLANE_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];

export default {
  id: 'sky',
  short: 'The constellation',
  title: 'About 31 satellites, six rings',
  subtitle: 'A net of clocks in orbit, arranged so some are always overhead.',
  view: { pos: [0, 24, 58], target: [0, 0, 0] },
  learn: `<p>GPS is a fleet of about <b>31 working satellites</b> that circle the Earth <b>20,200 km</b> up, about three Earth-widths from the surface. They sit in <b>six orbital planes</b>, each tilted <b>55°</b> to the equator, like six hoops sharing a centre.</p>
    <p>At that height a satellite takes about <b>12 hours</b> (11 h 58 min) to go round, so the whole pattern comes back over the same place twice a day. The design is <b>24 slots</b>. The extra satellites are spares kept running so the constellation never thins out. The aim is simple: from almost anywhere on the ground, <b>at least four</b> are above the horizon, and usually eight or more.</p>
    <p>None of them “sees” you. They only broadcast: their name, their position and the exact time. Your receiver listens, and never transmits anything.</p>
    <p class="tip"><b>Try it:</b> speed up time and watch the Earth turn under the hoops. Move the pin north or south and see how many satellites sit above its horizon (the green ones).</p>
    <p class="note">Satellites here are spaced evenly round each ring. The real slots are arranged in a more careful, uneven pattern.</p>`,
  terms: [
    { t: 'Orbital plane', d: 'The flat disc a satellite’s circular orbit lies in. GPS uses six, each tilted 55° from the equator.' },
    { t: 'Medium Earth orbit', d: 'An orbit roughly 2,000 to 35,000 km up. GPS sits at about 20,200 km, between the low orbits and geostationary.' },
    { t: 'Elevation mask', d: 'The lowest angle above the horizon at which a receiver will use a satellite, often 5° to 15°.' },
    { t: 'Constellation', d: 'A set of satellites designed to work together. “Constellation” also names the whole system, such as GPS or Galileo.' },
  ],
  defaults: { speed: 25, lat: 40, orbits: true, plane: 'all', lines: true },
  controls: [
    { key: 'speed', type: 'range', label: 'Time speed', min: 0, max: 120, step: 1, fmt: (v) => (v === 0 ? 'Paused' : `${v} min per second`) },
    { key: 'lat', type: 'range', label: 'Pin latitude', min: -85, max: 85, step: 1, fmt: (v) => `${Math.abs(v)}° ${v < 0 ? 'S' : 'N'}` },
    { key: 'plane', type: 'seg', label: 'Highlight a plane', options: [{ v: 'all', label: 'All' }, ...PLANE_NAMES.map((n, i) => ({ v: String(i), label: n }))] },
    { key: 'orbits', type: 'toggle', label: 'Show the orbit rings' },
    { key: 'lines', type: 'toggle', label: 'Show lines to satellites in view' },
  ],
  quiz: [
    { q: 'About how high do GPS satellites orbit?', options: ['400 km, like the space station', '20,200 km', '36,000 km, geostationary', '2,000 km'], answer: 1, why: 'GPS satellites are in medium Earth orbit at about 20,200 km, with a period of just under 12 hours.' },
    { q: 'Why are there more than 24 GPS satellites?', options: ['The extras send different signals to phones', 'The design needs 24; extras are spares and give better coverage', 'Each country needs its own', 'They are replaced every week'], answer: 1, why: 'The design is 24 slots. The operators keep extra satellites working, so a failure does not leave a gap.' },
    { q: 'What does a GPS satellite receive from your phone?', options: ['Your location', 'Your speed', 'Nothing at all', 'Your phone number'], answer: 2, why: 'GPS is one-way. Satellites only broadcast, so your phone listens quietly and the satellite never knows you exist.' },
  ],
  reel: [
    { ms: 5600, caption: 'Thirty-one satellites circle 20,200 km up, in six tilted rings.', set: { speed: 18, lat: 40, orbits: true, lines: false, plane: 'all' }, view: { pos: [0, 24, 58], target: [0, 0, 0] }, spin: 0.35 },
    { ms: 5600, caption: 'Each circles in 12 hours, so from anywhere on Earth several are always overhead.', set: { speed: 40, lat: 35, orbits: false, lines: true, plane: 'all' }, view: { pos: [9, 20, 36], target: [0, 4, 0] }, spin: 0.2 },
  ],
  build({ stage, s }) {
    stage.setWorldMode(true);
    const root = new THREE.Group(); stage.root.add(root);
    worldLights(root);
    const earth = makeEarth(); root.add(earth);

    // the pin on the ground
    const pin = new THREE.Group(); earth.add(pin);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), M.glow(0xffffff)); stem.position.y = 0.28;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), M.glow(COL.coral)); head.position.y = 0.6;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ color: COL.lime, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03;
    pin.add(stem, head, disc);
    const pinLbl = stage.label('You are here', [0, 1.0, 0], pin, 'hot');

    // satellites and rings
    const sats = makeSystem('gps');
    const planeRings = [], bodies = [];
    const seen = new Set();
    sats.forEach((sat) => { if (!seen.has(sat.plane)) { seen.add(sat.plane); const r = orbitRing(sat, COL.gold, 0.45); r.userData.plane = sat.plane; planeRings.push(r); root.add(r); } });
    sats.forEach((sat) => { const m = makeSat(0.9); m.userData.sat = sat; bodies.push(m); root.add(m); });

    // line of sight to visible satellites
    const maxL = 40, lineGeo = new THREE.BufferGeometry(), lp = new Float32Array(maxL * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: COL.lime, transparent: true, opacity: 0.55 })); lines.frustumCulled = false; root.add(lines);

    // a ruler from the ground to the ring
    const rulerTop = (6371 + 20200) * KM;
    const ruler = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(RE * 1.0, 0, 0), new THREE.Vector3(rulerTop, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    root.add(ruler);
    stage.label('20,200 km up', [(RE + rulerTop) / 2, 0.9, 0], root);
    stage.label('Earth turns once a day', [-RE * 1.05, RE * 1.12, 0], root);

    let tt = 0, inView = 0, minV = 99, maxV = 0;
    const P = new THREE.Vector3(), Q = new THREE.Vector3();
    const upd = (st) => {
      const th = earthAngle(tt);
      earth.rotation.y = th;
      geoVec(st.lat * D2R, 0, RE, pin.position); pin.position.copy(P.copy(pin.position));
      pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), P.clone().normalize());
      // the pin's place in the inertial frame
      const world = P.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), th);
      const arr = lineGeo.attributes.position.array;
      let n = 0, nl = 0;
      bodies.forEach((b) => {
        const sat = b.userData.sat;
        satPos(sat, tt, b.position);
        b.lookAt(0, 0, 0);
        const el = elevationOf(world, b.position);
        const vis = el > 5 * D2R;
        const dim = st.plane !== 'all' && String(sat.plane) !== st.plane;
        b.scale.setScalar(dim ? 0.55 : vis ? 1.35 : 0.9);
        b.visible = true;
        if (vis) { n++; if (st.lines && nl < maxL) { arr.set([world.x, world.y, world.z, b.position.x, b.position.y, b.position.z], nl * 6); nl++; } }
      });
      lineGeo.setDrawRange(0, nl * 2); lineGeo.attributes.position.needsUpdate = true;
      inView = n; minV = Math.min(minV, n); maxV = Math.max(maxV, n);
      planeRings.forEach((r) => { r.visible = st.orbits; r.material.opacity = st.plane === 'all' ? 0.45 : String(r.userData.plane) === st.plane ? 0.95 : 0.12; r.material.color.setHex(st.plane !== 'all' && String(r.userData.plane) === st.plane ? 0xffffff : COL.gold); });
    };
    upd(s);
    return {
      update(dt, st) { tt += dt * st.speed * 60; upd(st); },
      readout: (st) => `<div class="big">${inView} in view</div>
        <div class="row"><span>Working satellites</span><b>${sats.length}</b></div>
        <div class="row"><span>Above this pin’s horizon (5° up)</span><b class="${inView >= 4 ? 'ok' : 'no'}">${inView}</b></div>
        <div class="row"><span>Needed for a fix</span><b>4 or more</b></div>
        <div class="row"><span>Orbit time</span><b>11 h 58 min</b></div>
        <div class="row"><span>Clock</span><b>${clock(tt)}</b></div>`,
    };
  },
};
