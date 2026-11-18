// Chapter 2: distance from time. Radio waves travel at the speed of light, about 299,792 km/s, so a signal from a satellite
// 20,200 km straight up takes about 67 ms, and one near the horizon (about 25,800 km) about 86 ms. Each GPS satellite sends a
// repeating 1,023-chip code (the C/A code) at 1.023 million chips per second: one chip lasts about 0.98 microseconds, which is
// about 293 m of travel. The receiver makes the same code and slides its copy until the two match. 1 ns of timing is about 30 cm.
// The code below is the real PRN 1 sequence. The pulses on the beam are slowed down enormously so you can see them.
import { THREE, M, RE, KM, R_KM, C_KMS, C_MS, COL, CODE, AUTO, CHIP_S, CHIP_M, slantRange, makeEarth, worldLights, makeSat, geoVec } from '../gps.js';
import { canvasTexture, clamp } from '../kit.js';

const RS = R_KM + 20200;
const delayChips = (el, clockNs) => {
  const t = slantRange(el * Math.PI / 180) / C_KMS + clockNs * 1e-9;     // seconds
  return ((t * 1000) % 1) * 1023;                                        // position inside the 1 ms code
};
const ms = (el) => (slantRange(el * Math.PI / 180) / C_KMS) * 1000;

export default {
  id: 'range',
  short: 'Time is distance',
  title: 'A late signal is a long way off',
  subtitle: 'Radio travels at the speed of light, so a delay of a few milliseconds is thousands of kilometres.',
  view: { pos: [-1, 12, 50], target: [-1, 9, 0] },
  learn: `<p>Each satellite repeatedly broadcasts a long, random-looking pattern of ones and zeros, the <b>code</b>, plus the time it sent it. The pattern is fixed, so your receiver can make its own copy of it at the same moment.</p>
    <p>The signal is late, because it had to travel. A satellite straight overhead is <b>20,200 km</b> away, and light covers that in about <b>67 milliseconds</b>. Near the horizon the same satellite is about 25,800 km away, about <b>86 ms</b>. So the receiver slides its copy of the code until it <b>lines up</b> with the one it hears. The slide is the travel time. Multiply by the speed of light and you have a <b>range</b>.</p>
    <p>The code repeats every millisecond (about 300 km of travel), so it gives the fraction of a millisecond. The time stamp in the message gives the rest. One <b>chip</b> of the code is about <b>293 m</b> long, and a good receiver locates the match to a small fraction of a chip. Every <b>nanosecond</b> of timing error is <b>30 cm</b> of range.</p>
    <p class="tip"><b>Try it:</b> drag <b>Slide the copy</b> until the green peak lights up, or press <b>Lock on</b>. Then move the satellite lower and watch the match move. Add clock error and see it turn into metres.</p>`,
  terms: [
    { t: 'C/A code', d: 'The open GPS code: 1,023 chips, repeating every millisecond, different for every satellite.' },
    { t: 'Chip', d: 'One bit of the code. At 1.023 million per second, a chip lasts about 0.98 µs, which is about 293 m of travel.' },
    { t: 'Pseudorange', d: 'The distance worked out from signal delay. It is “pseudo” because it still includes the receiver’s clock error.' },
    { t: 'Correlation', d: 'How well two patterns agree. The receiver’s copy only “lights up” when it lines up with the satellite’s code.' },
  ],
  defaults: { elev: 90, slide: 0, clockNs: 0 },
  controls: [
    { key: 'elev', type: 'range', label: 'Satellite height in the sky', min: 5, max: 90, step: 1, fmt: (v) => (v >= 90 ? 'Straight overhead' : `${v}° above the horizon`), hint: 'Lower in the sky means farther away.' },
    { key: 'slide', type: 'range', label: 'Slide the copy', min: 0, max: 1022, step: 1, fmt: (v) => `${v} chips · ${(v * CHIP_S * 1e6).toFixed(0)} µs` },
    { key: 'buttons', type: 'buttons', label: 'Receiver', items: [{ label: 'Lock on', act: (s) => { s.slide = Math.round(delayChips(s.elev, s.clockNs)) % 1023; } }, { label: 'Scramble', act: (s) => { s.slide = (s.slide + 311) % 1023; } }] },
    { key: 'clockNs', type: 'range', label: 'Receiver clock error', min: 0, max: 3000, step: 10, fmt: (v) => `${v} ns` },
  ],
  quiz: [
    { q: 'About how long does a GPS signal take to arrive from a satellite overhead?', options: ['67 microseconds', '67 milliseconds', '67 seconds', 'It is instant'], answer: 1, why: '20,200 km at 299,792 km/s is about 0.067 s, or 67 ms.' },
    { q: 'How much range error is one nanosecond of timing error?', options: ['About 30 cm', 'About 30 m', 'About 3 km', 'About 3 mm'], answer: 0, why: 'Light travels about 0.3 m in a nanosecond, so one nanosecond of clock error is about 30 cm.' },
    { q: 'How does the receiver find the delay?', options: ['It measures the signal’s brightness', 'It slides its own copy of the code until it matches', 'It asks the satellite', 'It uses the compass'], answer: 1, why: 'The receiver makes the same code and slides it in time until the two line up. The slide is the delay.' },
  ],
  reel: [
    { ms: 5600, caption: 'A signal from 20,200 km takes 67 milliseconds. The receiver slides its copy of the code until it matches.', set: { elev: 90, slide: 0, clockNs: 0 }, anim: { slide: [0, Math.round(delayChips(90, 0))] }, view: { pos: [-1, 12, 50], target: [-1, 9, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.setWorldMode(true);
    const root = new THREE.Group(); stage.root.add(root);
    worldLights(root);
    const earth = makeEarth(); earth.rotation.y = -Math.PI / 2 + 0.1; earth.rotation.z = 0; root.add(earth);
    // The earth is turned so the pin on top shows. The receiver sits at the north pole direction (0, RE, 0).
    const rx = new THREE.Vector3(0, RE, 0);
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 24), M.plastic(COL.coral)); puck.position.copy(rx).y += 0.05; root.add(puck);
    stage.label('Receiver', [0, RE + 0.8, 0], root, 'hot');
    const sat = makeSat(1.6); root.add(sat);
    const satLbl = stage.label('Satellite', [0, 1.3, 0], sat);

    // beam
    const beamG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    const beam = new THREE.Line(beamG, new THREE.LineBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.35 })); root.add(beam);
    const N = 42, beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), M.glow(COL.cyan), N); root.add(beads);
    const dum = new THREE.Object3D();

    // the code panel
    const W = 1400, H = 860, CH = 48;
    const panel = canvasTexture(W, H, (c, w, h, fn) => fn && fn(c));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(24, 24 * H / W), new THREE.MeshBasicMaterial({ map: panel.tex, transparent: true })); plane.position.set(-1, -0.2, 19); root.add(plane);
    let sig = '';
    const FONT = (w, z) => `${w} ${z}px Geist, system-ui, sans-serif`;
    const draw = (st) => {
      const key = `${st.elev}|${st.slide}|${st.clockNs}`; if (key === sig) return; sig = key;
      const D = delayChips(st.elev, st.clockNs), Di = Math.round(D) % 1023, S = Math.round(st.slide) % 1023;
      const lock = ((S - Di) % 1023 + 1023) % 1023 === 0;
      panel.redraw((c) => {
        c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(7,8,12,.9)'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 3; c.strokeRect(1, 1, W - 2, H - 2);
        c.textBaseline = 'alphabetic';
        const w = (W - 72) / CH;
        const strip = (y, label, off, col) => {
          c.font = FONT(600, 40); c.fillStyle = '#c9d1e3'; c.fillText(label, 36, y - 14);
          for (let k = 0; k < CH; k++) { const b = CODE[(k + off) % 1023]; c.fillStyle = b ? col : 'rgba(255,255,255,.1)'; c.fillRect(36 + k * w + 1, y, w - 2, 62); }
        };
        strip(86, 'The satellite’s code, arriving late', Di, '#8ef0ff');
        strip(224, 'The receiver’s own copy', S, lock ? '#a3e635' : '#ffb547');
        let same = 0; for (let k = 0; k < CH; k++) if (CODE[(k + Di) % 1023] === CODE[(k + S) % 1023]) same++;
        for (let k = 0; k < CH; k++) { const eq = CODE[(k + Di) % 1023] === CODE[(k + S) % 1023]; c.fillStyle = eq ? (lock ? '#a3e635' : 'rgba(255,255,255,.35)') : '#ff7a59'; c.fillRect(36 + k * w + 1, 296, w - 2, 14); }
        c.font = FONT(600, 44); c.fillStyle = lock ? '#a3e635' : '#ffb547';
        c.fillText(lock ? 'Every chip matches: locked on' : `${same} of ${CH} match: about half, so not it`, 36, 378);
        const gx = 36, gy = 430, gw = W - 72, gh = 340;
        c.fillStyle = '#c9d1e3'; c.font = FONT(600, 38); c.fillText('How well they match at every slide, 0 to 1 ms', gx, gy + 6);
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 2; c.strokeRect(gx, gy + 24, gw, gh - 24);
        const y0 = gy + 24 + (gh - 24) * 0.82, yh = (gh - 24) * 0.74;
        c.strokeStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.moveTo(gx, y0); c.lineTo(gx + gw, y0); c.stroke();
        c.beginPath(); c.lineWidth = 4; c.strokeStyle = '#8ef0ff';
        for (let x = 0; x < 1023; x++) { const v = AUTO[((x - Di) % 1023 + 1023) % 1023]; const px = gx + (x / 1022) * gw, py = y0 - yh * Math.max(v, -0.1); (x ? c.lineTo(px, py) : c.moveTo(px, py)); }
        c.stroke();
        const cx = gx + (S / 1022) * gw; c.strokeStyle = lock ? '#a3e635' : '#ffb547'; c.lineWidth = 4; c.setLineDash([10, 10]); c.beginPath(); c.moveTo(cx, gy + 28); c.lineTo(cx, gy + gh); c.stroke(); c.setLineDash([]);
        c.fillStyle = lock ? '#a3e635' : '#ffb547'; c.beginPath(); c.arc(cx, y0 - yh * Math.max(AUTO[((S - Di) % 1023 + 1023) % 1023], -0.1), 13, 0, 7); c.fill();
        c.fillStyle = '#9aa3b8'; c.font = FONT(500, 32); c.fillText('0', gx, gy + gh + 44); c.fillText('1 millisecond', gx + gw - 230, gy + gh + 44);
      });
    };
    const satPosFor = (el) => {
      const e = el * Math.PI / 180, lam = Math.acos(clamp((R_KM * Math.cos(e)) / RS, -1, 1)) - e;
      return new THREE.Vector3(Math.sin(lam), Math.cos(lam), 0).multiplyScalar(RS * KM);
    };
    let tt = 0;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), dir = new THREE.Vector3();
    const layout = (st) => {
      A.copy(satPosFor(st.elev)); B.copy(rx);
      sat.position.copy(A); sat.lookAt(0, 0, 0);
      const arr = beamG.attributes.position.array; arr.set([A.x, A.y, A.z, B.x, B.y, B.z]); beamG.attributes.position.needsUpdate = true; beamG.computeBoundingSphere();
      draw(st);
      for (let i = 0; i < N; i++) {
        const ph = (i / N + tt * 0.22) % 1, bit = CODE[Math.floor(i + tt * 0) % 1023];
        dir.copy(A).lerp(B, ph);
        dum.position.copy(dir); dum.scale.setScalar(CODE[i * 7 % 1023] ? 0.2 : 0.09); dum.updateMatrix(); beads.setMatrixAt(i, dum.matrix);
      }
      beads.instanceMatrix.needsUpdate = true;
    };
    layout(s);
    return {
      update(dt, st) { tt += dt; layout(st); },
      readout(st) {
        const e = st.elev * Math.PI / 180, d = slantRange(e), t = (d / C_KMS) * 1000;
        const D = delayChips(st.elev, st.clockNs), Di = Math.round(D) % 1023, lock = (Math.round(st.slide) % 1023) === Di;
        return `<div class="big">${t.toFixed(1)} ms</div>
          <div class="row"><span>Distance to satellite</span><b>${Math.round(d).toLocaleString('en-US')} km</b></div>
          <div class="row"><span>Copy matches the signal?</span><b class="${lock ? 'ok' : 'no'}">${lock ? 'Locked on' : 'Not yet'}</b></div>
          <div class="row"><span>One chip of the code</span><b>${CHIP_M.toFixed(0)} m</b></div>
          <div class="row"><span>Clock error ${st.clockNs} ns becomes</span><b>${(st.clockNs * C_MS * 1e-9).toFixed(st.clockNs ? 0 : 0)} m of range</b></div>`;
      },
    };
  },
};
