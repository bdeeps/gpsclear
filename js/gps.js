// Shared parts for GPSClear: orbit maths, a stylised Earth, a small satellite, the real C/A code generator,
// dilution of precision (DOP) and a least-squares position solver.
// Units in the 3D scenes: the Earth's mean radius (6,371 km) is RE = 5 units. Y is north, Earth turns about Y.
import { THREE, M, canvasTexture, clamp, lerp, smooth } from './kit.js';

export { THREE, M, clamp, lerp, smooth };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const COL = { gold: 0xffb547, coral: 0xff7a59, cyan: 0x8ef0ff, violet: 0xc49bff, lime: 0xa3e635, grey: 0x6b7385, white: 0xe9eef8 };
export const RE = 5, R_KM = 6371, KM = RE / R_KM;     // scene units per km
export const C_KMS = 299792.458;                       // speed of light, km/s
export const C_MS = 299792458;                         // m/s
export const MU = 3.986004418e14;                      // Earth's gravitational parameter, m^3/s^2
export const SIDEREAL = 86164.0905;                    // one turn of the Earth against the stars, s
export const D2R = Math.PI / 180;
export const pad = (n) => String(n).padStart(2, '0');
export const clock = (sec) => { sec = Math.floor(sec); return `${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor(sec / 60) % 60)}`; };

// ---------------------------------------------------------------- orbits
// A circular orbit of radius a (km), inclination inc and ascending node raan (radians), at argument u.
// Inertial axes: z is north. Mapped to scene axes (x, z, -y) so that Earth's spin is a turn about scene Y.
export function orbitVec(a, inc, raan, u, out = new THREE.Vector3()) {
  const cu = Math.cos(u), su = Math.sin(u), cO = Math.cos(raan), sO = Math.sin(raan), ci = Math.cos(inc), si = Math.sin(inc);
  const x = cO * cu - sO * ci * su, y = sO * cu + cO * ci * su, z = si * su;
  return out.set(x, z, -y).multiplyScalar(a * KM);
}
export const satPos = (s, t, out) => orbitVec(s.a, s.inc, s.raan, s.u0 + (2 * Math.PI * t) / s.T, out);

// Orbit constants. Altitudes, inclinations and periods are the published figures (see history.json sources).
// The way satellites are spread around each ring is schematic: even spacing, not the real slots.
export const SYSTEMS = {
  gps: { name: 'GPS', country: 'USA', color: 0xffb547, css: '#ffb547', planes: [5, 5, 5, 5, 5, 6], inc: 55, alt: 20200, T: 43082, note: '31 working satellites, 6 planes, 55°' },
  glonass: { name: 'GLONASS', country: 'Russia', color: 0xff7a59, css: '#ff7a59', planes: [8, 8, 8], inc: 64.8, alt: 19130, T: 40544, note: '24 satellites, 3 planes, 64.8°' },
  galileo: { name: 'Galileo', country: 'Europe', color: 0x8ef0ff, css: '#8ef0ff', planes: [10, 10, 10], inc: 56, alt: 23222, T: 50681, note: '24 + spares, 3 planes, 56°' },
  beidou: { name: 'BeiDou', country: 'China', color: 0xa3e635, css: '#a3e635', planes: [8, 8, 8], inc: 55, alt: 21528, T: 46399, note: '24 medium orbit + 3 inclined + 3 geostationary', extra: true },
};
export function makeSystem(key) {
  const D = SYSTEMS[key], sats = [], a = R_KM + D.alt;
  D.planes.forEach((n, k) => {
    const raan = (k * 2 * Math.PI) / D.planes.length + (key === 'glonass' ? 0.3 : key === 'galileo' ? 0.9 : key === 'beidou' ? 1.6 : 0);
    for (let j = 0; j < n; j++) sats.push({ sys: key, plane: k, a, inc: D.inc * D2R, raan, u0: (2 * Math.PI * j) / n + k * (key === 'gps' ? 0.35 : 0.8), T: D.T });
  });
  if (key === 'beidou') {
    const ag = R_KM + 35786;
    for (let k = 0; k < 3; k++) sats.push({ sys: key, plane: 3, a: ag, inc: 55 * D2R, raan: 1.0 + (k * 2 * Math.PI) / 3, u0: 0.2, T: SIDEREAL, kind: 'igso' });
    [80, 110.5, 140].forEach((lon) => sats.push({ sys: key, plane: 4, a: ag, inc: 0, raan: 0, u0: lon * D2R, T: SIDEREAL, kind: 'geo' }));
  }
  return sats;
}
export function orbitRing(sat, color, opacity = 0.4, seg = 160) {
  const pts = [];
  for (let i = 0; i < seg; i++) pts.push(orbitVec(sat.a, sat.inc, sat.raan, (i / seg) * Math.PI * 2));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
}

// ---------------------------------------------------------------- the ground
export const geoVec = (lat, lon, r = RE, out = new THREE.Vector3()) => out.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)).multiplyScalar(r);
export const earthAngle = (t) => (2 * Math.PI * t) / SIDEREAL;
// Elevation (rad) of satellite s above the horizon of ground point p (both in the same frame).
export function elevationOf(p, s) {
  const dx = s.x - p.x, dy = s.y - p.y, dz = s.z - p.z, d = Math.hypot(dx, dy, dz), pl = p.length();
  return Math.asin(clamp((dx * p.x + dy * p.y + dz * p.z) / (d * pl), -1, 1));
}

const LAND = {
  na: [[-168, 66], [-156, 71], [-125, 70], [-95, 72], [-80, 70], [-62, 60], [-55, 50], [-66, 44], [-75, 38], [-81, 31], [-80, 25], [-84, 30], [-90, 29.5], [-97, 27], [-97, 21], [-91, 19], [-87, 21], [-88, 15], [-83, 10], [-79, 8.5], [-84, 9], [-88, 13], [-95, 16], [-105, 20], [-110, 24], [-112, 30], [-115, 31], [-118, 34], [-122, 37], [-124, 42], [-124, 48], [-130, 54], [-140, 60], [-150, 60], [-158, 57], [-165, 61]],
  gl: [[-73, 78], [-60, 82], [-30, 83], [-20, 75], [-22, 70], [-40, 62], [-48, 61], [-55, 66], [-60, 76]],
  sa: [[-79, 8], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-35, -5], [-39, -14], [-41, -22], [-48, -26], [-58, -35], [-65, -41], [-66, -47], [-69, -52], [-74, -52], [-74, -42], [-72, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0], [-77, 4]],
  eu: [[-9, 37], [-9, 43], [-2, 43.5], [-4, 48], [2, 51], [8, 54], [10, 57], [5, 60], [5, 63], [14, 68], [25, 71], [40, 68], [60, 70], [80, 73], [100, 77], [115, 74], [140, 72], [160, 70], [180, 68], [180, 65], [170, 60], [160, 55], [155, 50], [142, 52], [140, 46], [130, 42], [127, 35], [122, 31], [121, 24], [110, 20], [106, 10], [103, 1.5], [100, 7], [98, 10], [98, 16], [94, 17], [92, 22], [88, 22], [85, 20], [80, 15], [78, 8], [73, 17], [70, 21], [67, 24], [62, 25], [57, 26], [56, 26], [59, 22], [55, 17], [44, 12], [43, 16], [38, 22], [35, 28], [34.5, 31], [36, 36], [30, 36.5], [26, 38], [26, 40.5], [23, 40], [22, 36.5], [21, 39], [19, 42], [13.5, 45.5], [12, 44], [16, 41], [18, 40], [16, 38], [12, 42], [9, 44], [3, 43], [0, 39], [-2, 37], [-5, 36]],
  af: [[-17, 21], [-16, 28], [-6, 35], [10, 37], [11, 33], [20, 31], [32, 31], [34, 28], [38, 20], [43, 12], [51, 12], [45, 2], [40, -10], [35, -20], [33, -27], [27, -34], [20, -35], [17, -30], [12, -17], [13, -8], [9, -1], [9, 4], [0, 5], [-8, 4], [-15, 10], [-17, 15]],
  au: [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [135, -35], [130, -32], [116, -35], [114, -28]],
  uk: [[-5, 50], [1, 51], [-2, 57], [-6, 58], [-5, 54]],
  jp: [[130, 31], [135, 34], [140, 36], [142, 42], [140, 41], [136, 37], [131, 34]],
  id: [[95, 5], [104, -2], [106, -6], [102, -4], [98, 1]],
  an: [[-180, -90], [180, -90], [180, -72], [-180, -72]],
};
// A stylised Earth: sea, rough continents and a 30° grid. Longitude 0 faces +X, east is -Z.
export function makeEarth(opts = {}) {
  const g = new THREE.Group();
  const tex = canvasTexture(2048, 1024, (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e2a4d'); gr.addColorStop(0.5, '#0a3a66'); gr.addColorStop(1, '#0e2a4d');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2f6b57'; c.strokeStyle = '#5fae8f'; c.lineWidth = 2;
    const X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
    Object.values(LAND).forEach((poly) => { c.beginPath(); poly.forEach(([lo, la], i) => (i ? c.lineTo(X(lo), Y(la)) : c.moveTo(X(lo), Y(la)))); c.closePath(); c.fill(); c.stroke(); });
    c.strokeStyle = 'rgba(190,220,255,.22)'; c.lineWidth = 1.5;
    for (let lo = -180; lo <= 180; lo += 30) { c.beginPath(); c.moveTo(X(lo), 0); c.lineTo(X(lo), H); c.stroke(); }
    for (let la = -60; la <= 60; la += 30) { c.beginPath(); c.moveTo(0, Y(la)); c.lineTo(W, Y(la)); c.stroke(); }
    c.strokeStyle = 'rgba(190,220,255,.4)'; c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.stroke();
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(opts.r || RE, 72, 48), new THREE.MeshStandardMaterial({ map: tex.tex, roughness: 0.85, metalness: 0 }));
  g.add(mesh);
  const air = new THREE.Mesh(new THREE.SphereGeometry((opts.r || RE) * 1.035, 48, 32), new THREE.MeshBasicMaterial({ color: 0x6fb4ff, transparent: true, opacity: 0.1, side: THREE.BackSide, depthWrite: false }));
  g.add(air);
  g.mesh = mesh;
  return g;
}
export function worldLights(root) {
  const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.set(40, 20, 30);
  root.add(sun, new THREE.HemisphereLight(0xcfe3ff, 0x10131a, 0.9));
}

// A small navigation satellite: gold body, two solar wings and a dish that faces the Earth (+Z after lookAt).
export function makeSat(size = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.7), M.metal(0xe3b04b, { roughness: 0.35 }));
  const panel = M.plastic(0x2c5fb3, { roughness: 0.3, metalness: 0.4, emissive: 0x0a1f4a, emissiveIntensity: 0.6 });
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.02, 0.5), panel), wingR = wingL.clone();
  wingL.position.x = -0.75; wingR.position.x = 0.75;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.12, 14), M.metal(0xd9dde6));
  dish.rotation.x = Math.PI / 2; dish.position.z = 0.4;
  g.add(body, wingL, wingR, dish);
  g.scale.setScalar(size);
  return g;
}

// ---------------------------------------------------------------- the GPS C/A code (PRN 1)
// Two 10-stage shift registers (G1: x^10+x^3+1, G2: x^10+x^9+x^8+x^6+x^3+x^2+1). PRN 1 adds G2 stages 2 and 6.
// The first ten chips of PRN 1 are 1100100000 (octal 1440): the code below is checked against that.
export const CODE = (() => {
  const g1 = Array(10).fill(1), g2 = Array(10).fill(1), out = [];
  for (let i = 0; i < 1023; i++) {
    out.push(g1[9] ^ g2[1] ^ g2[5]);
    const f1 = g1[2] ^ g1[9], f2 = g2[1] ^ g2[2] ^ g2[5] ^ g2[7] ^ g2[8] ^ g2[9];
    g1.pop(); g1.unshift(f1); g2.pop(); g2.unshift(f2);
  }
  return out;
})();
// Circular autocorrelation of the code: 1 at zero shift, and only -65/1023, -1/1023 or 63/1023 elsewhere.
export const AUTO = (() => {
  const a = [], b = CODE.map((x) => (x ? 1 : -1));
  for (let s = 0; s < 1023; s++) { let sum = 0; for (let i = 0; i < 1023; i++) sum += b[i] * b[(i + s) % 1023]; a.push(sum / 1023); }
  return a;
})();
export const CHIP_S = 1 / 1.023e6;                    // one chip: 0.9775 microseconds
export const CHIP_M = C_MS * CHIP_S;                  // about 293 m

// Slant range (km) to a satellite of orbit radius r (km) seen at elevation e (rad) from the surface.
export const slantRange = (e, r = R_KM + 20200) => Math.sqrt(r * r - R_KM * R_KM * Math.cos(e) ** 2) - R_KM * Math.sin(e);

// ---------------------------------------------------------------- small linear algebra
export function invert(A) {
  const n = A.length, M2 = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
    if (Math.abs(M2[p][c]) < 1e-12) return null;
    [M2[c], M2[p]] = [M2[p], M2[c]];
    const d = M2[c][c]; for (let j = 0; j < 2 * n; j++) M2[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M2[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M2[r][j] -= f * M2[c][j]; }
  }
  return M2.map((row) => row.slice(n));
}
const mul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
const tr = (A) => A[0].map((_, j) => A.map((r) => r[j]));
// Least squares for [east, north, up, clock] from line-of-sight unit vectors in the local frame (rows e,n,u).
// Returns the DOPs and, if given range errors (same units), the position/clock error they cause.
export function leastSquares(los, rangeErr) {
  if (los.length < 4) return null;
  const H = los.map(([e, n, u]) => [-e, -n, -u, 1]);
  const Q = invert(mul(tr(H), H));
  if (!Q) return null;
  const dop = { hdop: Math.sqrt(Q[0][0] + Q[1][1]), vdop: Math.sqrt(Q[2][2]), pdop: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2]), tdop: Math.sqrt(Q[3][3]), gdop: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2] + Q[3][3]) };
  let err = null;
  if (rangeErr) { const dx = mul(mul(Q, tr(H)), rangeErr.map((e) => [e])).map((r) => r[0]); err = { e: dx[0], n: dx[1], u: dx[2], b: dx[3] }; }
  return { ...dop, err };
}
// Two-satellite and three-satellite sphere geometry (any units).
export function sphereCircle(p1, r1, p2, r2) {
  const d = p2.clone().sub(p1), D = d.length(); if (D < 1e-6) return null;
  const n = d.clone().divideScalar(D), a = (r1 * r1 - r2 * r2 + D * D) / (2 * D), h2 = r1 * r1 - a * a;
  if (h2 < 0) return null;
  return { c: p1.clone().addScaledVector(n, a), n, r: Math.sqrt(h2) };
}
export function trilaterate(P, R) {
  const [p1, p2, p3] = P, ex = p2.clone().sub(p1), d = ex.length(); ex.divideScalar(d);
  const t = p3.clone().sub(p1), i = ex.dot(t), ey = t.clone().addScaledVector(ex, -i), j = ey.length(); ey.divideScalar(j);
  const ez = new THREE.Vector3().crossVectors(ex, ey);
  const x = (R[0] ** 2 - R[1] ** 2 + d * d) / (2 * d), y = (R[0] ** 2 - R[2] ** 2 + i * i + j * j) / (2 * j) - (i / j) * x;
  const z2 = R[0] ** 2 - x * x - y * y, z = Math.sqrt(Math.max(0, z2));
  const base = p1.clone().addScaledVector(ex, x).addScaledVector(ey, y);
  return [base.clone().addScaledVector(ez, z), base.clone().addScaledVector(ez, -z), z2 >= 0];
}
// Four spheres: solve [x, y, z, b] from |S_i - X| + b = rho_i by Gauss-Newton.
export function solve4(S, rho, x0 = [0, 0, 0, 0]) {
  let X = [...x0];
  for (let it = 0; it < 30; it++) {
    const H = [], F = [];
    S.forEach((s, i) => { const dx = X[0] - s.x, dy = X[1] - s.y, dz = X[2] - s.z, d = Math.hypot(dx, dy, dz) || 1e-9; H.push([dx / d, dy / d, dz / d, 1]); F.push([rho[i] - (d + X[3])]); });
    const Hi = invert(H); if (!Hi) return null;
    const dX = mul(Hi, F).map((r) => r[0]);
    X = X.map((v, k) => v + dX[k]);
    if (Math.hypot(...dX) < 1e-10) break;
  }
  return X;
}
