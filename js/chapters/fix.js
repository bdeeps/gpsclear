// Chapter 3: trilateration. One range puts you on a sphere around a satellite. Two spheres meet in a circle, three in two
// points (one is usually far out in space or underground and is thrown away). A receiver's cheap quartz clock is wrong by
// an unknown amount, which makes every measured range too long by the same distance, so a fourth satellite is needed to solve
// for the clock too: four unknowns (x, y, z, clock), four equations. The scene is a schematic, not to scale:
// 1 unit = 2,500 km here and the satellites are only about 8 to 10 units away. The solver is a real Gauss-Newton fit.
import { THREE, M, COL, V, makeSat, trilaterate, sphereCircle, solve4, C_KMS } from '../gps.js';

const UNIT = 2500;                                         // km per unit
const MS_UNIT = C_KMS / 1000 / UNIT;                             // units of range per millisecond of clock error (0.12)
const SATS = [V(-6, 9, -2), V(7, 8, 1), V(1, 10.2, -7), V(-1, 7.6, 6.5)];
const COLS = [0xff7a59, 0xffb547, 0xc49bff, 0x8ef0ff];

export default {
  id: 'fix',
  short: 'Spheres that meet',
  title: 'Where the spheres meet',
  subtitle: 'Each distance is a sphere. Four of them pin you down, and the fourth fixes your clock.',
  view: { pos: [30, 22, 34], target: [0, 8, 0] },
  learn: `<p>A range alone says only <b>how far</b>, not which way. So you are somewhere on a <b>sphere</b> around that satellite. With a second satellite you are on both spheres, which meet in a <b>circle</b>. A third cuts the circle at <b>two points</b>. One is near the ground. The other is far out in space, so the receiver throws it away.</p>
    <p>That would be enough with a perfect clock. But the clock in your phone is a cheap quartz crystal. If it is wrong by even a thousandth of a second, every range is too long by the same <b>300 km</b>, and the three spheres meet in the wrong place, or not at all. So the receiver treats its <b>clock error as a fourth unknown</b>. Four equations (x, y, z and time) need <b>four satellites</b>. Then it adjusts all four spheres by the same amount until they meet at one point. That amount is the clock error.</p>
    <p>That is the quiet trick of GPS: it is a <b>clock</b>, set to the atomic clocks in orbit every time you get a fix. Your phone gets atomic-clock time for free.</p>
    <p class="tip"><b>Try it:</b> go from one to four satellites. Then add clock error and see three spheres miss, while four, solved with the clock, still meet at your spot.</p>
    <p class="note">Not to scale: the real satellites are about 20,000 km away, and the real clock errors are far smaller than the 10 ms sliders go to.</p>`,
  terms: [
    { t: 'Trilateration', d: 'Finding a position from distances to known points. Triangulation uses angles. GPS uses distances.' },
    { t: 'Pseudorange', d: 'A measured distance that still contains the receiver’s clock error, the same for every satellite.' },
    { t: 'Clock bias', d: 'How far the receiver’s clock is from GPS time. It is solved together with the position.' },
    { t: 'Fix', d: 'One position (and time) solution from the satellites the receiver can hear.' },
  ],
  defaults: { n: 3, bias: 4, px: 1.2, pz: -0.8, corrected: true },
  controls: [
    { key: 'n', type: 'seg', label: 'Satellites used', options: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }, { v: 4, label: '4' }] },
    { key: 'bias', type: 'range', label: 'Receiver clock error', min: 0, max: 10, step: 0.1, fmt: (v) => `${v.toFixed(1)} ms = ${(v * C_KMS / 1000).toFixed(0)} km of range`, hint: 'Exaggerated: a phone’s real error before the fix is smaller, but the effect is the same.' },
    { key: 'px', type: 'range', label: 'Where you are (east–west)', min: -4, max: 4, step: 0.05, fmt: (v) => `${(v * UNIT).toFixed(0)} km` },
    { key: 'pz', type: 'range', label: 'Where you are (north–south)', min: -4, max: 4, step: 0.05, fmt: (v) => `${(-v * UNIT).toFixed(0)} km` },
    { key: 'corrected', type: 'toggle', label: 'With 4 satellites, show the corrected spheres' },
  ],
  quiz: [
    { q: 'One satellite’s distance puts you where?', options: ['At a single point', 'On a circle', 'On a sphere around that satellite', 'On a straight line'], answer: 2, why: 'A distance from a point is the same in every direction, so it describes a sphere.' },
    { q: 'Why does GPS need four satellites, not three?', options: ['To get a bigger average', 'To solve for the receiver’s clock error as well as x, y and z', 'Three cannot see the sky', 'To check the date'], answer: 1, why: 'Position has three unknowns and the receiver clock adds a fourth. Four unknowns need four equations.' },
    { q: 'A receiver’s clock runs 1 ms fast. What happens to every range?', options: ['Nothing', 'All become about 300 km too long', 'Only the farthest changes', 'They become random'], answer: 1, why: 'Light covers about 300 km in a millisecond, and the clock error is the same for every satellite, so every range is off by the same amount.' },
  ],
  reel: [
    { ms: 5200, caption: 'One distance is a sphere. Three spheres meet in a point.', set: { n: 3, bias: 0, px: 1.2, pz: -0.8, corrected: true }, anim: { px: [-2.2, 1.6] }, view: { pos: [30, 22, 34], target: [0, 8, 0] }, spin: 0.15 },
    { ms: 5600, caption: 'A cheap clock makes every range too long. A fourth satellite solves for the error too.', set: { n: 4, bias: 0, px: 1.2, pz: -0.8, corrected: true }, anim: { bias: [0, 8] }, view: { pos: [26, 18, 30], target: [0, 7, 0] }, spin: 0.15 },
  ],
  build({ stage, s }) {
    stage.setWorldMode(false);
    const root = new THREE.Group(); stage.root.add(root);
    // the ground
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x1d3a35, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.001; ground.receiveShadow = true; root.add(ground);
    const bodies = SATS.map((p, i) => { const m = makeSat(0.7); m.position.copy(p); m.lookAt(0, 0, 0); root.add(m); stage.label(`${i + 1}`, [0, 0.9, 0], m, 'hot'); return m; });
    const spheres = SATS.map((p, i) => {
      const fill = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ color: COLS[i], transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
      const wire = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: COLS[i], transparent: true, opacity: 0.16, wireframe: true, depthWrite: false }));
      const g = new THREE.Group(); g.add(fill, wire); g.position.copy(p); root.add(g); return g;
    });
    const mkLine = (col) => { const g = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, () => V(0, 0, 0))); const l = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: col, linewidth: 2 })); l.frustumCulled = false; root.add(l); return l; };
    const circles = [mkLine(0xe9eef8), mkLine(0xe9eef8), mkLine(0xe9eef8)];
    const you = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), M.glow(COL.lime)); root.add(you);
    const ans3 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), M.glow(COL.gold)); root.add(ans3);
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), M.ghost(COL.gold, 0.4)); root.add(mirror);
    const ans4 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshBasicMaterial({ color: COL.cyan, wireframe: true })); root.add(ans4);
    const lblYou = stage.label('You', [0, 0.55, 0], you, 'hot');
    const lblA = stage.label('3-satellite answer', [0, 0.55, 0], ans3);
    const lblM = stage.label('other point: discarded', [0, 0.5, 0], mirror);
    const lblB = stage.label('4-satellite answer', [0, 0.6, 0], ans4);
    const setCircle = (line, c) => {
      line.visible = !!c; if (!c) return;
      const a = new THREE.Vector3(1, 0, 0); if (Math.abs(c.n.x) > 0.9) a.set(0, 1, 0);
      const u = new THREE.Vector3().crossVectors(c.n, a).normalize(), v = new THREE.Vector3().crossVectors(c.n, u);
      const arr = line.geometry.attributes.position.array;
      for (let i = 0; i < 96; i++) { const t = (i / 96) * Math.PI * 2; const p = c.c.clone().addScaledVector(u, Math.cos(t) * c.r).addScaledVector(v, Math.sin(t) * c.r); arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; }
      line.geometry.attributes.position.needsUpdate = true;
    };
    let info = {};
    const layout = (st) => {
      const P = V(st.px, 0, st.pz), b = st.bias * MS_UNIT, n = st.n;
      const true_r = SATS.map((p) => p.distanceTo(P)), rho = true_r.map((r) => r + b);
      let X4 = null, X3 = null, mir = null, B = 0;
      if (n === 4) { const r = solve4(SATS, rho, [0, 0, 0, 0]); if (r) { X4 = V(r[0], r[1], r[2]); B = r[3]; } }
      if (n >= 3) { const [a, c, ok] = trilaterate(SATS.slice(0, 3), rho.slice(0, 3)); const lo = a.y <= c.y ? a : c, hi = a.y <= c.y ? c : a; X3 = lo; mir = hi; info.ok3 = ok; }
      const radii = n === 4 && st.corrected && X4 ? rho.map((r) => r - B) : rho;
      spheres.forEach((g, i) => { g.visible = i < n; g.scale.setScalar(Math.max(0.01, radii[i])); });
      bodies.forEach((m, i) => { m.scale.setScalar(i < n ? 0.85 : 0.4); });
      const P1 = SATS.slice(0, 2), c12 = n >= 2 ? sphereCircle(SATS[0], radii[0], SATS[1], radii[1]) : null;
      setCircle(circles[0], c12);
      setCircle(circles[1], n >= 3 ? sphereCircle(SATS[0], radii[0], SATS[2], radii[2]) : null);
      setCircle(circles[2], n >= 3 ? sphereCircle(SATS[1], radii[1], SATS[2], radii[2]) : null);
      you.position.copy(P); lblYou.visible = true;
      ans3.visible = lblA.visible = n === 3; if (X3) ans3.position.copy(X3);
      mirror.visible = lblM.visible = n === 3 && !!mir; if (mir) mirror.position.copy(mir);
      ans4.visible = lblB.visible = n === 4 && !!X4; if (X4) ans4.position.copy(X4);
      info = { ...info, n, b, err3: X3 ? X3.distanceTo(P) * UNIT : null, err4: X4 ? X4.distanceTo(P) * UNIT : null, B: (B * UNIT) / (C_KMS / 1000), X3, mir };
    };
    layout(s);
    return {
      update(dt, st) { layout(st); },
      readout(st) {
        const n = st.n;
        const head = n === 1 ? 'A sphere' : n === 2 ? 'A circle' : n === 3 ? 'Two points' : 'One point';
        const msg = n === 1 ? 'You could be anywhere on this sphere.' : n === 2 ? 'Two spheres meet in a circle.' : n === 3 ? (st.bias < 0.05 ? 'The third sphere cuts the circle at two points. One is far out in space: discarded.' : `With the clock wrong the spheres meet in the wrong place: ${info.err3 === null ? 'no answer' : Math.round(info.err3).toLocaleString('en-US') + ' km out'}.`) : `The fourth equation solves the clock. Position error: ${info.err4 === null ? 'no answer' : info.err4 < 1 ? 'about 0' : Math.round(info.err4)} km.`;
        return `<div class="big">${head}</div><p class="r-say">${msg}</p>
          <div class="row"><span>Receiver clock error</span><b>${st.bias.toFixed(1)} ms</b></div>
          <div class="row"><span>Every range too long by</span><b>${(st.bias * C_KMS / 1000).toFixed(0)} km</b></div>
          ${n === 4 && info.err4 !== null ? `<div class="row"><span>Clock error the receiver solved</span><b class="ok">${info.B.toFixed(2)} ms</b></div>` : ''}`;
      },
    };
  },
};
