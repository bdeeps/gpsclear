// Chapter 5: what goes wrong, and the fixes. A phone in the open typically gets about 5 m (95 percent) horizontally
// (GPS.gov: smartphones are accurate to a 4.9 m radius under open sky). Errors come from the ionosphere (charged
// air that delays radio by a few metres to tens of metres), from signals bouncing off walls (multipath), from blocked
// satellites in street canyons, and from the geometry of the satellites left (dilution of precision, DOP).
// Fixes: two frequencies (the ionosphere delays them differently), augmentation (WAAS and other SBAS give 1 to 3 m)
// and RTK (carrier phase with a nearby base station, centimetres). This chapter's numbers are a model, tuned to those
// typical figures: the satellite positions are a fixed illustrative sky, and the street is 20 m wide.
import { THREE, M, COL, V, D2R, leastSquares, makeSat } from '../gps.js';

// azimuth (deg from north), elevation (deg)
const SKY = [[10, 62], [48, 28], [95, 44], [130, 12], [165, 70], [205, 36], [240, 20], [275, 56], [315, 30], [340, 8], [70, 77], [185, 10]];
const S = 10;                                                   // street half-width, metres
const IONO_H = 350;                                             // km, thin-shell height used for the slant factor
const FIX = {
  none: { n: 'Phone alone', sigma: 2.4, ion: 1, say: 'Single frequency, no help: about 5 m in the open.' },
  sbas: { n: 'WAAS / SBAS', sigma: 1.0, ion: 0.15, say: 'Corrections from ground stations, broadcast by satellite: 1 to 3 m.' },
  rtk: { n: 'RTK', sigma: 0.008, ion: 0.0, say: 'Carrier-phase with a nearby base station: centimetres.' },
};
const unit = (az, el) => { az *= D2R; el *= D2R; return [Math.cos(el) * Math.sin(az), Math.cos(el) * Math.cos(az), Math.sin(el)]; };   // east, north, up

// Classify each satellite for building height H.
function classify(H) {
  return SKY.map(([az, el]) => {
    const sa = Math.abs(Math.sin(az * D2R)), t = Math.tan(el * D2R), need = H * sa / S;          // blocked if tan(el) < H*|sin az| / S
    const blocked = t < need && sa > 0.02;
    const k = sa > 0.02 ? (S * t / sa) : Infinity;                                               // height of the ray at the near wall
    const bounce = blocked && H < 3 * k;                                                         // can arrive off the far wall
    const extra = 2 * S * sa * Math.cos(el * D2R);                                               // extra path length via the bounce, m
    return { az, el, state: !blocked ? 'direct' : bounce ? 'bounce' : 'hidden', extra };
  });
}
function solve(st) {
  const fx = FIX[st.fix], cl = classify(st.h);
  const used = cl.filter((c) => c.state === 'direct' || (c.state === 'bounce' && st.bounce));
  const los = used.map((c) => unit(c.az, c.el));
  const errs = used.map((c) => {
    const el = c.el * D2R, slant = 1 / Math.sqrt(1 - Math.pow(Math.cos(el) / (1 + IONO_H / 6371), 2));
    return st.ion * slant * fx.ion + (c.state === 'bounce' ? c.extra : 0);
  });
  const ls = leastSquares(los, errs);
  return { cl, used, ls, fx };
}

export default {
  id: 'errors',
  short: 'What goes wrong',
  title: 'Sky, walls and bad geometry',
  subtitle: 'The ionosphere, bounced signals and blocked satellites, and the fixes people invented.',
  view: { pos: [48, 50, 100], target: [0, 18, 0] },
  learn: `<p>With a clear view of the sky a phone is usually good to about <b>5 m</b>. Four things make it worse.</p>
    <p><b>The ionosphere.</b> A layer of charged air, 60 to 1,000 km up, slows radio waves a little, by a few metres to tens of metres, more for a satellite low in the sky (the signal crosses more air). Receivers that use <b>two frequencies</b> can cancel it, because the delay depends on frequency.</p>
    <p><b>Walls.</b> In a street between tall buildings, satellites are blocked, and some signals arrive only after <b>bouncing</b> (multipath), so they travel farther than they should. Corrections can’t fix this: it happens only around you.</p>
    <p><b>Geometry.</b> Satellites bunched in one part of the sky make a poor fix, however good each one is. The number that says so is the <b>dilution of precision</b> (DOP): the lower the better.</p>
    <p>The fixes: <b>WAAS and other SBAS</b> broadcast corrections (1 to 3 m), and <b>RTK</b> uses the signal’s carrier wave and a nearby base station (centimetres).</p>
    <p class="tip"><b>Try it:</b> raise the buildings and watch satellites go grey. Turn on bounced signals and see the position drift. Then switch the fix to RTK.</p>
    <p class="note">The sky is a fixed example of twelve satellites, and the error numbers are a model tuned to typical figures, not a measurement.</p>`,
  terms: [
    { t: 'Ionospheric delay', d: 'The slowing of radio waves by charged particles high in the atmosphere.' },
    { t: 'Multipath', d: 'A signal that reaches the receiver after bouncing, so its path is longer than the direct one.' },
    { t: 'DOP', d: 'Dilution of precision: how much the layout of the satellites multiplies the range errors. HDOP covers the horizontal.' },
    { t: 'SBAS (WAAS)', d: 'Satellite-based augmentation: ground stations measure errors and geostationary satellites broadcast corrections.' },
    { t: 'RTK', d: 'Real-time kinematic: carrier-phase positioning with a base station nearby, accurate to centimetres.' },
  ],
  defaults: { h: 0, ion: 6, fix: 'none', bounce: false },
  controls: [
    { key: 'h', type: 'range', label: 'Building height', min: 0, max: 40, step: 1, fmt: (v) => (v === 0 ? 'Open sky' : `${v} m, street 20 m wide`) },
    { key: 'bounce', type: 'toggle', label: 'Receiver uses bounced signals (multipath)', hint: 'A phone cannot tell a bounced signal from a direct one.' },
    { key: 'ion', type: 'range', label: 'Ionosphere delay (straight up)', min: 0, max: 15, step: 0.5, fmt: (v) => `${v.toFixed(1)} m` },
    { key: 'fix', type: 'seg', label: 'Method', options: Object.entries(FIX).map(([v, f]) => ({ v, label: f.n })) },
  ],
  quiz: [
    { q: 'What is “multipath”?', options: ['A receiver using several satellites', 'A signal that bounced, so it travelled farther', 'Two phones sharing a signal', 'A path of the satellite’s orbit'], answer: 1, why: 'Signals bounce off buildings. The bounced copy travels a longer path, so the range looks too long.' },
    { q: 'Why do two-frequency receivers cancel the ionosphere?', options: ['They are bigger', 'The delay depends on the frequency, so comparing two reveals it', 'They ignore low satellites', 'They use the compass'], answer: 1, why: 'The ionosphere slows different frequencies by different amounts. Measuring the difference lets the receiver work out the delay.' },
    { q: 'A good fix needs satellites…', options: ['As close together as possible', 'Spread across the sky', 'All overhead', 'Only near the horizon'], answer: 1, why: 'Satellites spread in different directions give well-crossing range lines, and a low DOP. Bunched ones give a poor one.' },
  ],
  reel: [
    { ms: 5400, caption: 'In a street canyon, tall walls block satellites and bounce the signal, and the fix drifts.', set: { h: 0, bounce: true, ion: 6, fix: 'none' }, anim: { h: [0, 30] }, view: { pos: [48, 50, 100], target: [0, 18, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.setWorldMode(false);
    const root = new THREE.Group(); stage.root.add(root);
    // street and buildings (north-south along z)
    const road = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, 80), M.matte(0x1b1e26)); road.rotation.x = -Math.PI / 2; road.position.y = 0.01; road.receiveShadow = true; root.add(road);
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 80), M.glow(0x555c6e)); dash.rotation.x = -Math.PI / 2; dash.position.y = 0.02; root.add(dash);
    const bm = M.plastic(0x7b8cab, { roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.85 });
    const bl = [-1, 1].map((sgn) => { const b = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 60), bm); b.position.x = sgn * (S + 7); b.castShadow = true; b.receiveShadow = true; root.add(b); return b; });
    // receiver
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24), M.plastic(COL.lime)); puck.position.y = 0.2; root.add(puck);
    stage.label('Where you really are', [0, 1.0, 0], puck, 'hot');
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), M.glow(COL.coral)); dot.position.y = 0.6; root.add(dot);
    const dotLbl = stage.label('Where the phone thinks', [0, 1.0, 0], dot);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: COL.coral, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; root.add(ring);
    const tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0.3, 0), V(1, 0.6, 0)]), new THREE.LineBasicMaterial({ color: COL.coral })); root.add(tether);
    // sky dome
    const DOME = 60;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8ef0ff, wireframe: true, transparent: true, opacity: 0.06, depthWrite: false })); root.add(dome);
    const sats = SKY.map(([az, el], i) => {
      const [e, n, u] = unit(az, el), g = new THREE.Group(); g.position.set(e * DOME, u * DOME, -n * DOME); g.lookAt(0, 0, 0);
      const m = makeSat(1.9); g.add(m); root.add(g); return g;
    });
    const mk = (col, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3 * 2 * 2), 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op })); l.frustumCulled = false; root.add(l); return l; };
    const directL = mk(COL.lime, 0.55), bounceL = mk(COL.gold, 0.9);
    const cols = { direct: 0xa3e635, bounce: 0xffb547, hidden: 0x555c6e };
    let info = null;
    const layout = (st) => {
      const r = solve(st); info = r;
      bl.forEach((b) => { b.scale.y = Math.max(0.01, st.h); b.position.y = st.h / 2; b.visible = st.h > 0.1; });
      let nd = 0, nb = 0; const da = directL.geometry.attributes.position.array, ba = bounceL.geometry.attributes.position.array;
      r.cl.forEach((c, i) => {
        const g = sats[i], m = g.children[0];
        const dim = c.state === 'hidden' || (c.state === 'bounce' && !st.bounce);
        m.scale.setScalar(dim ? 1 : 1.3);
        m.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = dim ? 0.3 : 1; } });
        const [e, n, u] = unit(c.az, c.el);
        if (c.state === 'direct') { da.set([0, 0.6, 0, e * DOME, u * DOME, -n * DOME], nd * 6); nd++; }
        else if (c.state === 'bounce') {
          // the signal passes over the near building, hits the far wall and bounces down to the receiver
          const t = S / Math.max(0.02, Math.abs(e)), wall = V((e > 0 ? -1 : 1) * S, u * t, -n * t);
          if (st.bounce) { ba.set([e * DOME, u * DOME, -n * DOME, wall.x, wall.y, wall.z, wall.x, wall.y, wall.z, 0, 0.6, 0], nb * 12); nb++; }
        }
      });
      directL.geometry.setDrawRange(0, nd * 2); directL.geometry.attributes.position.needsUpdate = true;
      bounceL.geometry.setDrawRange(0, nb * 4); bounceL.geometry.attributes.position.needsUpdate = true;
      const ls = r.ls;
      if (ls) {
        const fx = r.fx, sig = Math.max(0.005, 2 * ls.hdop * fx.sigma), ex = ls.err.e, en = ls.err.n;
        dot.visible = ring.visible = tether.visible = dotLbl.visible = true;
        dot.position.set(ex, 0.6, -en);
        ring.position.set(ex, 0.08, -en); ring.scale.setScalar(Math.max(0.15, sig));
        const ta = tether.geometry.attributes.position.array; ta.set([0, 0.3, 0, ex, 0.6, -en]); tether.geometry.attributes.position.needsUpdate = true;
        info.off = Math.hypot(ex, en); info.rad = sig;
      } else { dot.visible = ring.visible = tether.visible = dotLbl.visible = false; }
    };
    layout(s);
    return {
      update(dt, st) { layout(st); },
      readout(st) {
        const r = info, n = r.used.length, cnt = (k) => r.cl.filter((c) => c.state === k).length;
        if (!r.ls) return `<div class="big">No fix</div><p class="r-say">Fewer than four usable satellites. Lower the buildings or let it use bounced signals.</p><div class="row"><span>Direct / bounced / hidden</span><b>${cnt('direct')} / ${cnt('bounce')} / ${cnt('hidden')}</b></div>`;
        const tot = Math.hypot(r.ls.err.e, r.ls.err.n) + r.rad;
        const fmt = (m) => (m < 0.1 ? `${(m * 100).toFixed(1)} cm` : m < 10 ? `${m.toFixed(1)} m` : `${Math.round(m)} m`);
        return `<div class="big">about ${fmt(tot)} off</div><p class="r-say">${r.fx.say}</p>
          <div class="row"><span>Satellites used</span><b>${n} of ${r.cl.length}</b></div>
          <div class="row"><span>Direct / bounced / hidden</span><b>${cnt('direct')} / ${cnt('bounce')} / ${cnt('hidden')}</b></div>
          <div class="row"><span>HDOP (lower is better)</span><b class="${r.ls.hdop < 2 ? 'ok' : 'no'}">${r.ls.hdop.toFixed(1)}</b></div>
          <div class="row"><span>Pulled sideways by delays</span><b>${fmt(r.off)}</b></div>`;
      },
    };
  },
};
