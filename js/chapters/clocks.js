// Chapter 4: atomic clocks and relativity. Two effects, both predicted by Einstein, change how fast a satellite clock ticks
// compared with one on the ground. Special relativity: a moving clock runs slow by about v^2 / 2c^2 (a GPS satellite moves at about
// 3.9 km/s: about 7 microseconds a day slow). General relativity: a clock higher in Earth's gravity runs fast by about
// (GM/c^2)(1/R - 1/r) (about 46 microseconds a day fast). Net: about 38 microseconds a day fast. Left alone, that is
// 38 us x 299,792 km/s, about 11.4 km of range error per day. The numbers below are computed from those two formulas for a
// circular orbit, with the ground clock at R = 6,371 km (ignoring Earth's spin and its flattening, which change the result by
// well under a microsecond a day). In practice the satellite clock is tuned before launch (10.23 MHz is set to
// 10.22999999543 MHz) and a small correction is added in the message.
import { THREE, M, RE, KM, R_KM, C_KMS, C_MS, MU, COL, makeEarth, worldLights, makeSat } from '../gps.js';
import { canvasTexture, clamp } from '../kit.js';

const DAY = 86400;
export const effects = (altKm) => {
  const r = (R_KM + altKm) * 1000, R = R_KM * 1000, c2 = C_MS * C_MS;
  const sr = -(MU / r) / (2 * c2) * DAY * 1e6;                    // microseconds per day
  const gr = (MU / c2) * (1 / R - 1 / r) * DAY * 1e6;
  return { sr, gr, net: sr + gr, v: Math.sqrt(MU / r) / 1000, T: 2 * Math.PI * Math.sqrt(r ** 3 / MU) };
};

export default {
  id: 'clocks',
  short: 'Clocks and relativity',
  title: 'Time runs differently up there',
  subtitle: 'Einstein, twice: satellite clocks lose a little for speed and gain a lot for height.',
  view: { pos: [0, 14, 52], target: [0, 8, 0] },
  learn: `<p>The whole system depends on clocks agreeing to a few billionths of a second. Each satellite carries <b>atomic clocks</b> (rubidium and caesium, and a better type on newer ones). A cheap watch can drift by seconds a month. These stay within a few nanoseconds a day of GPS time, once corrected.</p>
    <p>But clocks in orbit do not tick at the same rate as clocks on the ground. <b>Special relativity</b>: a moving clock runs slow, and a GPS satellite moves at about 3.9 km/s. That costs about <b>7 µs a day</b>. <b>General relativity</b>: a clock deeper in gravity runs slow, so the satellite’s clock, higher up, runs fast, by about <b>46 µs a day</b>. The height wins: the net is about <b>+38 µs a day</b>.</p>
    <p>That sounds tiny. But signals travel 30 cm in a nanosecond, so 38 µs is about <b>11 km</b> of error, growing every day. GPS fixes it at the source: before launch the clock is set slightly slow (10.23 MHz is tuned to 10.22999999543 MHz), so that in orbit it ticks at the right rate.</p>
    <p class="tip"><b>Try it:</b> drag the orbit height. The two effects cancel at about 3,200 km, so the space station (low) runs slow, and GPS and geostationary satellites (high) run fast. Then slide the days to see how fast the error grows if nobody corrects it.</p>`,
  terms: [
    { t: 'Atomic clock', d: 'A clock that counts the ticks of atoms (such as rubidium or caesium) instead of a quartz crystal. Far steadier.' },
    { t: 'Special relativity', d: 'A moving clock ticks slower. For a GPS satellite the effect is about −7 µs a day.' },
    { t: 'General relativity', d: 'A clock higher in a gravity well ticks faster. For GPS the effect is about +46 µs a day.' },
    { t: 'Microsecond (µs)', d: 'A millionth of a second. Light travels about 300 m in one.' },
  ],
  defaults: { alt: 20200, days: 1, fixed: false },
  controls: [
    { key: 'alt', type: 'log', label: 'Orbit height', min: 300, max: 40000, fmt: (v) => `${Math.round(v).toLocaleString('en-US')} km`, hint: 'Space station about 420 km · GPS 20,200 km · geostationary 35,786 km' },
    { key: 'where', type: 'buttons', label: 'Jump to', items: [{ label: 'Space station', act: (s) => { s.alt = 420; } }, { label: 'GPS', act: (s) => { s.alt = 20200; } }, { label: 'Geostationary', act: (s) => { s.alt = 35786; } }] },
    { key: 'days', type: 'range', label: 'Days without correction', min: 0, max: 3, step: 0.05, fmt: (v) => `${v.toFixed(2)} days` },
    { key: 'fixed', type: 'toggle', label: 'Apply the correction built into GPS' },
  ],
  quiz: [
    { q: 'Overall, how does a GPS satellite clock run compared with one on the ground?', options: ['Slower, by about 38 µs a day', 'Faster, by about 38 µs a day', 'The same', 'Faster, by about 38 ms a day'], answer: 1, why: 'Gravity makes it gain about 46 µs a day and its speed makes it lose about 7 µs a day. The net is about +38 µs a day.' },
    { q: 'If the effect were not corrected, about how large would the position error be after one day?', options: ['About 1 metre', 'About 11 km', 'About 1,000 km', 'Nothing noticeable'], answer: 1, why: '38 microseconds times the speed of light is about 11 km.' },
    { q: 'How does GPS correct for it?', options: ['Engineers reset every satellite by hand each day', 'The clock is tuned slightly slow before launch', 'Receivers ignore the satellite clock', 'Satellites fly more slowly'], answer: 1, why: 'The satellite clock’s frequency is set slightly low on the ground (10.23 MHz becomes 10.22999999543 MHz) so it ticks right in orbit.' },
  ],
  reel: [
    { ms: 5800, caption: 'Relativity: satellite clocks run 38 microseconds fast every day. Uncorrected, that is 11 kilometres of error.', set: { alt: 20200, days: 0, fixed: false }, anim: { days: [0, 2] }, view: { pos: [0, 14, 52], target: [0, 8, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.setWorldMode(true);
    const root = new THREE.Group(); stage.root.add(root);
    worldLights(root);
    const earth = makeEarth(); earth.position.x = 0; root.add(earth);
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, i) => new THREE.Vector3(Math.cos((i / 160) * 6.2832), 0, Math.sin((i / 160) * 6.2832)))), new THREE.LineBasicMaterial({ color: COL.gold, transparent: true, opacity: 0.55 }));
    ring.position.copy(earth.position); root.add(ring);
    const sat = makeSat(1.2); root.add(sat);
    const vArrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 14), M.glow(COL.cyan)); root.add(vArrow);
    const lbl = stage.label('', [0, 1.2, 0], sat);
    const puck = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), M.glow(COL.coral)); puck.position.set(RE, 0, 0); root.add(puck);
    stage.label('Ground clock', [0, 0.6, 0], puck);

    const W = 1400, H = 900;
    const panel = canvasTexture(W, H, (c, w, h, fn) => fn && fn(c));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(24, 24 * H / W), new THREE.MeshBasicMaterial({ map: panel.tex, transparent: true })); plane.position.set(0, 2.2, 19); root.add(plane);
    let sig = '';
    const F = (w, sz) => `${w} ${sz}px Geist, system-ui, sans-serif`;
    const draw = (st) => {
      const key = `${Math.round(st.alt)}|${st.days}|${st.fixed}`; if (key === sig) return; sig = key;
      const e = effects(st.alt), days = st.days;
      panel.redraw((c) => {
        c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(7,8,12,.9)'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 3; c.strokeRect(1, 1, W - 2, H - 2);
        c.font = F(600, 44); c.fillStyle = '#e9eef8'; c.fillText(`A clock ${Math.round(st.alt).toLocaleString('en-US')} km up, vs one on the ground`, 40, 66);
        c.font = F(500, 32); c.fillStyle = '#9aa3b8'; c.fillText('microseconds gained (+) or lost (−) every day', 40, 112);
        const cx = 40, cy = 150, bw = 1320, rows = [['Speed (special relativity)', e.sr, '#ff7a59'], ['Height (general relativity)', e.gr, '#8ef0ff'], ['Net', e.net, '#a3e635']];
        const scale = (bw * 0.4) / Math.max(60, Math.abs(e.gr) * 1.1, Math.abs(e.sr) * 1.1), mid = cx + bw * 0.5;
        c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(mid, cy); c.lineTo(mid, cy + 3 * 100); c.stroke();
        rows.forEach(([n, v, col], i) => {
          const y = cy + i * 100; c.fillStyle = '#c9d1e3'; c.font = F(600, 34); c.fillText(n, cx, y + 36);
          const w = v * scale; c.fillStyle = col; c.fillRect(Math.min(mid, mid + w), y + 50, Math.max(3, Math.abs(w)), 38);
          c.fillStyle = '#e9eef8'; c.font = F(600, 36); const txt = `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} µs`;
          c.fillText(txt, v >= 0 ? mid + w + 14 : mid + w - 14 - c.measureText(txt).width, y + 82);
        });
        const kmErr = st.fixed ? 0.0003 * days : Math.abs(e.net) * 1e-6 * C_KMS * days;
        c.font = F(600, 42); c.fillStyle = '#e9eef8'; c.fillText(st.fixed ? 'With the correction built into GPS' : `Uncorrected, after ${days.toFixed(2)} days:`, 40, 520);
        c.font = F(500, 32); c.fillStyle = '#9aa3b8';
        c.fillText(st.fixed ? 'A few nanoseconds are left: well under a metre.' : `${Math.abs(e.net).toFixed(1)} µs × 299,792 km/s = ${(Math.abs(e.net) * 1e-6 * C_KMS).toFixed(1)} km every day`, 40, 566);
        const x0 = 40, wbar = 1320, maxKm = 40;
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.strokeRect(x0, 596, wbar, 56);
        c.fillStyle = st.fixed ? '#a3e635' : '#ff7a59'; c.fillRect(x0, 596, Math.min(wbar, Math.max(3, (kmErr / maxKm) * wbar)), 56);
        c.fillStyle = '#9aa3b8'; c.font = F(500, 30); [0, 10, 20, 30, 40].forEach((k) => { const x = x0 + (k / maxKm) * wbar; c.fillText(`${k} km`, x - (k === 0 ? 0 : k === 40 ? 84 : 36), 700); c.fillRect(x - 1, 654, 2, 12); });
        c.fillStyle = st.fixed ? '#a3e635' : '#ffb547'; c.font = F(600, 64); c.fillText(st.fixed ? 'about 0 km off' : `${kmErr.toFixed(1)} km off`, 40, 790);
        c.fillStyle = '#9aa3b8'; c.font = F(500, 32); c.fillText(`Orbit: ${e.v.toFixed(2)} km/s, one lap every ${(e.T / 3600).toFixed(2)} hours`, 40, 850);
      });
    };
    let a = 0;
    const layout = (st) => {
      const r = (R_KM + st.alt) * KM, e = effects(st.alt);
      ring.scale.setScalar(r);
      sat.position.set(earth.position.x + Math.cos(a) * r, 0, -Math.sin(a) * r); sat.lookAt(earth.position);
      const tang = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      vArrow.position.copy(sat.position).addScaledVector(tang, 1.2); vArrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tang);
      lbl.element.textContent = `${e.net >= 0 ? 'Fast' : 'Slow'} by ${Math.abs(e.net).toFixed(1)} µs/day`;
      draw(st);
    };
    layout(s);
    return {
      update(dt, st) { const e = effects(st.alt); a += dt * 0.55 * Math.pow((R_KM + 20200) / (R_KM + st.alt), 1.5) * 0.5; earth.rotation.y += dt * 0.1; layout(st); },
      readout(st) {
        const e = effects(st.alt);
        return `<div class="big">${e.net >= 0 ? '+' : '−'}${Math.abs(e.net).toFixed(1)} µs/day</div>
          <div class="row"><span>Speed effect</span><b>${e.sr.toFixed(1)} µs</b></div>
          <div class="row"><span>Height effect</span><b>+${e.gr.toFixed(1)} µs</b></div>
          <div class="row"><span>Speed</span><b>${e.v.toFixed(2)} km/s</b></div>
          <div class="row"><span>The two cancel at</span><b>about 3,200 km</b></div>`;
      },
    };
  },
};
