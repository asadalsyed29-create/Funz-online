// Outer space. Fly a ship straight up past the clouds and you come out here: the sun, the five planets
// (fly into one to land on it), the space stations you build, and the Rip: a round tear in space that
// leads to the Prism Reach, a land made of shapes with one very strange planet.
// Both are pocket worlds high above everything (see REALMS in realms.js), so nothing else is drawn there.
REALMS.orbit = { name: 'Outer space', o: [0, 9000, 0], half: [2900, 1500], grav: 9, mood: 'glow', fog: [0.004, 0.006, 0.02], fogD: 1 / 90000, amb: [0.16, 0.17, 0.24], sunC: [1.25, 1.12, 0.95], zen: [0.0, 0.0, 0.015], hor: [0.02, 0.015, 0.05], stars: 1, space: true };
REALMS.rift = { name: 'The Prism Reach', o: [0, 16000, 0], half: [2900, 1500], grav: 14, mood: 'glow', fog: [0.08, 0.02, 0.12], fogD: 1 / 7000, amb: [0.42, 0.36, 0.56], sunC: [1.0, 0.82, 1.05], zen: [0.03, 0.0, 0.08], hor: [0.3, 0.06, 0.34], stars: 1, space: true };

const SUN_R = 230;
const SPACE_PLANETS = [
  { name: 'Nautara', d: 720, y: -30, r: 150, air: '#6aa8ff' },
  { name: 'Kelar', d: 1080, y: 50, r: 125, air: '#5ff0f0' },
  { name: 'Vyrnox', d: 1440, y: -60, r: 140, air: '#ff7a3a' },
  { name: 'Oskarr', d: 1800, y: 40, r: 160, air: '#cfe4ff' },
  { name: 'Artex', d: 2160, y: -20, r: 130, air: '#b8b8c8' },
];
// where things are, relative to the middle of each pocket world
const spacePlanetAt = k => { const P = SPACE_PLANETS[k], a = k * 2.1 + 0.6; return [Math.cos(a) * P.d, P.y, Math.sin(a) * P.d]; };
const RIP = { p: [-1650, 220, 1500], r: 78 };
const RIFT_BACK = { p: [0, 150, 560], r: 42 };
const TESS = { p: [0, 520, -1350], h: 170 };
const RIFT_STAR = [1700, 1000, 900];
const RIFT_LAND = 230, HEX = 9;

// ---------- a little 3D noise for painting the planets ----------
const sHash = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
function sNoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(sHash(ix, iy, iz), sHash(ix + 1, iy, iz), u), L(sHash(ix, iy + 1, iz), sHash(ix + 1, iy + 1, iz), u), v), L(L(sHash(ix, iy, iz + 1), sHash(ix + 1, iy, iz + 1), u), L(sHash(ix, iy + 1, iz + 1), sHash(ix + 1, iy + 1, iz + 1), u), v), w);
}
function sFbm(x, y, z) { let a = 0.5, s = 0; for (let i = 0; i < 5; i++) { s += a * sNoise(x, y, z); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; z = z * 2.03 + 3.1; a *= 0.5; } return s; }
const sSS = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const sMix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// the ground of each planet (the same look as the planets map): colour, and lava or city lights glow
function planetColor(k, x, y, z) {
  const e = sFbm(x * 2.6 + k * 5, y * 2.6, z * 2.6), d = sFbm(x * 7 + 3, y * 7 + 3, z * 7 + 3);
  let c;
  if (k === 0) { // Nautara: blue sea, green and brown land, white poles
    if (e > 0.53) c = sMix([0.26, 0.5, 0.2], [0.55, 0.45, 0.28], sSS(0.58, 0.72, e + d * 0.15)).map(v => v * (0.85 + d * 0.3));
    else c = sMix([0.03, 0.12, 0.38], [0.1, 0.35, 0.6], sSS(0.4, 0.53, e));
    c = sMix(c, [0.95, 0.96, 0.98], sSS(0.78, 0.86, Math.abs(y) + d * 0.1));
  } else if (k === 1) { // Kelar: bright shallow seas and little sandy islands
    c = sMix([0.02, 0.3, 0.45], [0.15, 0.75, 0.78], sSS(0.45, 0.62, e));
    if (e > 0.62) c = sMix([0.93, 0.85, 0.6], [0.3, 0.6, 0.25], sSS(0.65, 0.72, e + d * 0.08));
  } else if (k === 2) { // Vyrnox: black rock split by glowing lava
    const cr = Math.abs(sFbm(x * 4 + 1.3, y * 4, z * 4) - 0.5);
    if (cr < 0.022 || e > 0.74) return glowC(sMix([1, 0.3, 0.04], [1, 0.62, 0.15], Math.random() * 0.4));
    c = sMix([0.09, 0.07, 0.07], [0.3, 0.2, 0.16], e).map(v => v * (0.7 + d * 0.6));
  } else if (k === 3) { // Oskarr: ice, frozen bands and blue cracks
    c = sMix([0.72, 0.82, 0.92], [0.97, 0.98, 1], e); c = sMix(c, [0.5, 0.68, 0.88], 0.35 * sSS(0.3, 0, Math.abs(Math.sin(y * 9 + e * 4))));
    if (Math.abs(sFbm(x * 5, y * 5, z * 5) - 0.5) < 0.02) c = [0.25, 0.45, 0.75];
  } else { // Artex: metal plates with city lights
    const la = Math.atan2(z, x) * 6, lo = Math.asin(Math.max(-1, Math.min(1, y))) * 8, cell = sHash(Math.floor(la), Math.floor(lo), 1);
    if (sHash(Math.floor(x * 40), Math.floor(y * 40), Math.floor(z * 40)) > 0.86 && e > 0.45) return glowC([1, 0.8, 0.4]);
    c = (cell > 0.5 ? [0.62, 0.6, 0.56] : [0.42, 0.44, 0.48]).map(v => v * (0.8 + d * 0.3));
    const g = Math.max(Math.abs(la - Math.floor(la) - 0.5), Math.abs(lo - Math.floor(lo) - 0.5)); if (g > 0.46) c = c.map(v => v * 0.6);
  }
  return [c[0], c[1], c[2], 1];
}

// a flat ring (Artex's wreckage ring, the halo round the Rip): rings of quads, two-sided
function flatRing(mb, R0, R1, n, col) { for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, P = (r, a) => [Math.cos(a) * r, 0, Math.sin(a) * r], c = col(i / n, a0); mb.quad(P(R0, a0), P(R0, a1), P(R1, a1), P(R1, a0), c, true); mb.quad(P(R0, a0), P(R1, a0), P(R1, a1), P(R0, a1), c, true); } }
// a hexagon prism standing on y0 up to y1
function hexPrism(mb, cx, cz, r, y0, y1, top, side, rim) {
  const P = (k, y, rr = r) => { const a = k / 6 * 6.2832 + Math.PI / 6; return [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr]; };
  for (let k = 0; k < 6; k++) { mb.quad(P(k + 1, y0), P(k, y0), P(k, y1), P(k + 1, y1), shadeC(side, 0.8 + 0.2 * Math.cos(k + 0.5))); mb.quad(P(k, y1), P(k, y1, r * 0.78), P(k + 1, y1, r * 0.78), P(k + 1, y1), rim); mb.tri([cx, y1 + 0.02, cz], P(k + 1, y1, r * 0.78), P(k, y1, r * 0.78), top); }
}
// solid geometric shapes floating about
function shape(mb, kind, s, col) {
  const g = glowC(mixC(col, [1, 1, 1, 1], 0.35));
  if (kind === 0) { mb.box(-s, -s, -s, s, s, s, col); for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { mb.box(a * s - 0.4, -s - 0.4, b * s - 0.4, a * s + 0.4, s + 0.4, b * s + 0.4, g, false, true); mb.box(-s - 0.4, a * s - 0.4, b * s - 0.4, s + 0.4, a * s + 0.4, b * s + 0.4, g, false, true); mb.box(a * s - 0.4, b * s - 0.4, -s - 0.4, a * s + 0.4, b * s + 0.4, s + 0.4, g, false, true); } }
  else if (kind === 1) { const V = [[s, 0, 0], [-s, 0, 0], [0, s * 1.3, 0], [0, -s * 1.3, 0], [0, 0, s], [0, 0, -s]]; for (const [a, b, c] of [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]]) mb.tri(V[a], V[b], V[c], shadeC(col, 0.75 + 0.25 * ((a + b + c) % 3) / 2)); }
  else if (kind === 2) { const V = [[0, s * 1.2, 0], [s, -s * 0.6, s * 0.6], [-s, -s * 0.6, s * 0.6], [0, -s * 0.6, -s]]; for (const [a, b, c] of [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]]) mb.tri(V[a], V[b], V[c], shadeC(col, 0.8 + 0.1 * a + 0.05 * c)); }
  else mb.ico(0, 0, 0, s, 0, (x, y, z) => shadeC(col, 0.75 + 0.25 * (y * 0.5 + 0.5)));
}
// a cube made only of its glowing edges
function cubeFrame(mb, s, w, col) { for (const a of [-1, 1]) for (const b of [-1, 1]) { mb.box(a * s - w, -s - w, b * s - w, a * s + w, s + w, b * s + w, col, false, true); mb.box(-s - w, a * s - w, b * s - w, s + w, a * s + w, b * s + w, col, false, true); mb.box(a * s - w, b * s - w, -s - w, a * s + w, b * s + w, s + w, col, false, true); } }

// ---------- building the two pocket worlds ----------
function buildSpace(R, gl) {
  const o = R.o, L = (x, y, z) => [o[0] + x, o[1] + y, o[2] + z], add = (mesh, kind = 'deco') => R.meshes.push({ mesh, kind });
  R.spin = []; R.clearM = []; R.stands = []; R.exit = [1e9, 1e9, 1e9]; R.sgrid = new TriGrid();
  if (R.kind === 'orbit') {
    // the sun: a boiling ball of light with soft glowing layers round it
    const sun = new MeshBuilder(); sun.lowpoly = false;
    sun.sph(L(0, 0, 0), SUN_R, 40, (x, y, z) => glowC(sMix([1, 0.5, 0.1], [1, 0.95, 0.68], sFbm(x * 6, y * 6, z * 6))), 0);
    R.big = [sun.build(gl)]; R.sunAt = L(0, 0, 0);
    const halo = new MeshBuilder(); halo.lowpoly = false;
    for (let q = 1; q <= 4; q++) halo.sph(L(0, 0, 0), SUN_R * (1 + q * 0.12), 24, [1, 0.75 - q * 0.08, 0.3, 0.16 / q], 0);
    R.clearM.push(halo.build(gl));
    // the planets, painted like on the planets map, with clouds on the ones with air
    const pm = new MeshBuilder(), cl = new MeshBuilder(); pm.lowpoly = false; cl.lowpoly = false;
    SPACE_PLANETS.forEach((P, k) => {
      const c = L(...spacePlanetAt(k)); P.at = c;
      pm.sph(c, P.r, 60, (x, y, z) => planetColor(k, x, y, z), 0);
      if (k !== 2 && k !== 4) cl.sph(c, P.r * 1.025, 40, (x, y, z) => { const a = sSS(0.55, 0.75, sFbm(x * 4 + 7, y * 4, z * 4)); return [1, 1, 1, a * (k === 3 ? 0.2 : 0.42)]; }, 0);
      const air = hex(P.air); cl.sph(c, P.r * 1.07, 28, [air[0], air[1], air[2], 0.07], 0);
      if (k === 4) { cl.push(c, M4.mul3(M4.rotZ(0.25), M4.rotX(0.15))); flatRing(cl, P.r * 1.5, P.r * 2.4, 120, t => { const b = 0.55 + 0.45 * Math.sin(t * 900) * Math.sin(t * 260); return [0.72 * b, 0.64 * b, 0.52 * b, 0.42]; }); cl.pop(); }
      if (k === 0) pm.sph([c[0] + P.r * 1.9, c[1] + 40, c[2] - P.r * 1.2], 28, 24, (x, y, z) => shadeC([0.78, 0.78, 0.8, 1], 0.75 + 0.25 * sFbm(x * 5, y * 5, z * 5)), 0);
    });
    R.big.push(pm.build(gl)); R.clearM.push(cl.build(gl));
    // an asteroid belt between Vyrnox and Oskarr
    const ast = new MeshBuilder();
    for (let q = 0; q < 220; q++) { const a = sHash(q, 1, 2) * 6.2832, d = 1620 + (sHash(q, 3, 4) - 0.5) * 120, s = 3 + Math.pow(sHash(q, 5, 6), 3) * 22; ast.ico(o[0] + Math.cos(a) * d, o[1] + (sHash(q, 7, 8) - 0.5) * 70, o[2] + Math.sin(a) * d, [s, s * (0.6 + sHash(q, 9, 1) * 0.4), s * (0.8 + sHash(q, 2, 9) * 0.3)], 1, (x, y, z) => rockC(shadeC(hex(q % 3 ? '#7a7068' : '#8a8078'), 0.7 + 0.3 * (y * 0.5 + 0.5))), false, null, (x, y, z) => 0.18 * Math.sin(x * 5 + q) * Math.cos(z * 4 + q)); }
    add(ast.build(gl));
    // the Rip: a round tear in space, swirling purple and teal, with jagged shards round its edge
    const ripN = [-RIP.p[0], 0, -RIP.p[2]], rip = new MeshBuilder(), rp = L(...RIP.p);
    for (let j = 0; j < 10; j++) for (let i = 0; i < 64; i++) {
      const a0 = i / 64 * 6.2832, a1 = (i + 1) / 64 * 6.2832, J = r => r * (1 + 0.1 * Math.sin(a0 * 7) + 0.05 * Math.sin(a0 * 19)), r0 = RIP.r * j / 10, r1 = RIP.r * (j + 1) / 10;
      const s = 0.5 + 0.5 * Math.sin(a0 * 3 + j * 0.9), col = glowC(sMix(sMix([0.05, 0.0, 0.12], [0.55, 0.1, 0.9], j / 10), sMix([0.1, 0.95, 0.9], [1, 0.4, 0.85], s), Math.pow(j / 10, 1.6) * s));
      const P = (r, a) => [Math.cos(a) * J(r), 0, Math.sin(a) * J(r)];
      rip.quad(P(r0, a0), P(r0, a1), P(r1, a1), P(r1, a0), col, true); rip.quad(P(r0, a0), P(r1, a0), P(r1, a1), P(r0, a1), col, true);
    }
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.2832 + sHash(i, 1, 1) * 0.2, r = RIP.r * 1.05, L2 = 10 + sHash(i, 2, 2) * 28, w = 0.08; rip.tri2([Math.cos(a - w) * r, 0, Math.sin(a - w) * r], [Math.cos(a) * (r + L2), (sHash(i, 3, 3) - 0.5) * 8, Math.sin(a) * (r + L2)], [Math.cos(a + w) * r, 0, Math.sin(a + w) * r], glowC(i % 2 ? [0.6, 1, 0.98] : [1, 0.55, 0.95])); }
    R.ripAim = M4.aim(ripN); R.spin.push({ mesh: rip.build(gl), p: rp, rot: t => M4.mul3(R.ripAim, M4.rotY(t * 0.35)), glow: 1 });
    const rh = new MeshBuilder(); rh.push(rp, R.ripAim); flatRing(rh, RIP.r * 1.1, RIP.r * 1.9, 64, t => [0.7, 0.3, 1, 0.12 + 0.1 * Math.sin(t * 6.28 * 5)]); rh.pop(); R.clearM.push(rh.build(gl));
    R.lights.push({ p: rp, r: 160, c: [0.8, 0.4, 1] });
    R.start = L(...spacePlanetAt(0)).map((v, i) => v + [0, 260, 0][i]);
    R.stationMesh = null; buildStations(R, gl);
  } else {
    // the Prism Reach: a floating land of hexagon columns in candy colours, with glowing rims
    const land = new MeshBuilder().collect(), PAL = ['#5ff0e0', '#9a7bff', '#ff7ad9', '#ffd36a', '#7affa0', '#6ab8ff'];
    R.hexH = new Map();
    const hx = HEX * Math.sqrt(3);
    for (let q = -30; q <= 30; q++) for (let r = -30; r <= 30; r++) {
      const x = hx * (q + r / 2), z = HEX * 1.5 * r, d = Math.hypot(x, z); if (d > RIFT_LAND) continue;
      const n = sFbm(x * 0.012 + 3, 0, z * 0.012), lvl = Math.floor(n * 7) + (d > RIFT_LAND - 30 ? -1 : 0), h = lvl * 2.5 + (sHash(q, r, 3) > 0.96 ? 14 + sHash(q, r, 4) * 30 : 0), col = hex(PAL[(lvl + 6) % PAL.length]);
      R.hexH.set(q + ',' + r, h); hexPrism(land, o[0] + x, o[2] + z, HEX * 0.97, o[1] - 30 - d * 0.15, o[1] + h, col, shadeC(col, 0.55), glowC(mixC(col, [1, 1, 1, 1], 0.45)));
    }
    R.solid(land); add(land.build(gl), 'world');
    R.floorAt = (x, z) => { x -= o[0]; z -= o[2]; const qf = (Math.sqrt(3) / 3 * x - z / 3) / HEX, rf = (2 / 3 * z) / HEX; let q = Math.round(qf), r = Math.round(rf), s = Math.round(-qf - rf); const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s + qf + rf); if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s; const h = R.hexH.get(q + ',' + r); return h == null ? o[1] - 400 : o[1] + h; };
    // a pyramid, an arch of cubes and glowing frames on the land
    const dec = new MeshBuilder().collect();
    dec.push(L(60, R.floorAt(o[0] + 60, o[2] - 70) - o[1], -70)); shape(dec, 2, 26, hex('#ffd36a')); dec.pop();
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI, x = -80 + Math.cos(a) * 40, y = Math.sin(a) * 40; dec.push(L(x, R.floorAt(o[0] - 80, o[2] + 40) - o[1] + y + 4, 40), M4.rotZ(a)); shape(dec, 0, 4, hex(PAL[i % PAL.length])); dec.pop(); }
    R.solid(dec); add(dec.build(gl));
    // shapes hanging in the sky, some of them turning slowly
    const sky = new MeshBuilder();
    for (let i = 0; i < 70; i++) { const a = sHash(i, 1, 7) * 6.2832, d = 320 + sHash(i, 2, 7) * 1400, y = 40 + sHash(i, 3, 7) * 700; sky.push(L(Math.cos(a) * d, y, Math.sin(a) * d), M4.mul3(M4.rotY(i), M4.rotX(i * 0.7))); shape(sky, i % 4, 5 + sHash(i, 4, 7) * 22, hex(PAL[i % PAL.length])); sky.pop(); }
    add(sky.build(gl));
    for (let i = 0; i < 9; i++) { const m = new MeshBuilder(), a = i * 0.7 + 0.3, d = 330 + i * 120, s = 14 + i * 4; if (i % 3 === 0) cubeFrame(m, s, 0.8, glowC(hex(PAL[i % PAL.length]))); else { shape(m, i % 4, s, hex(PAL[(i + 2) % PAL.length])); cubeFrame(m, s * 1.6, 0.5, glowC(hex(PAL[(i + 3) % PAL.length]))); } R.spin.push({ mesh: m.build(gl), p: L(Math.cos(a) * d, 120 + i * 50, Math.sin(a) * d), rot: t => M4.mul3(M4.rotY(t * (0.2 + i * 0.03)), M4.rotX(t * 0.13 * (i % 2 ? 1 : -1))), glow: 0.3 }); }
    // Tessaron, the cube planet: every face is a city of raised blocks with light shining up through the gaps
    const tp = L(...TESS.p), H = TESS.h, cube = new MeshBuilder().collect(), FACE = [I3, M4.rotX(Math.PI), M4.rotX(Math.PI / 2), M4.rotX(-Math.PI / 2), M4.rotZ(Math.PI / 2), M4.rotZ(-Math.PI / 2)], FC = ['#5ff0e0', '#ff7ad9', '#9a7bff', '#ffd36a', '#7affa0', '#6ab8ff'];
    FACE.forEach((F, f) => {
      cube.push(tp, F); const base = hex(FC[f]), N = 12, cs = H * 2 / N;
      cube.box(-H, H - 4, -H, H, H, H, glowC(mixC(base, [1, 1, 1, 1], 0.3)), false, f !== 0);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const hh = 2 + Math.pow(sHash(i, j, f + 11), 2.2) * (f === 0 ? 14 : 30), x0 = -H + i * cs + 1, z0 = -H + j * cs + 1; cube.box(x0, H, z0, x0 + cs - 2, H + hh, z0 + cs - 2, shadeC(mixC(base, [0.2, 0.2, 0.3, 1], 0.55), 0.8 + 0.4 * sHash(i, j, f)), true, f !== 0); }
      cube.pop();
    });
    R.solid(cube); add(cube.build(gl));
    for (let k = 0; k < 3; k++) { const ring = new MeshBuilder(); for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832; ring.push([Math.cos(a) * H * 2.1, 0, Math.sin(a) * H * 2.1], M4.rotY(-a)); shape(ring, i % 2 ? 2 : 1, 7, hex(FC[(k * 2 + i) % 6])); ring.pop(); } const tilt = [I3, M4.rotX(Math.PI / 2), M4.rotZ(Math.PI / 2)][k]; R.spin.push({ mesh: ring.build(gl), p: tp, rot: t => M4.mul3(tilt, M4.rotY(t * (0.12 + k * 0.05) * (k % 2 ? -1 : 1))), glow: 0.2 }); }
    // its moon is a pyramid going round it
    const moon = new MeshBuilder(); moon.push([H * 3.4, 0, 0]); shape(moon, 2, 34, hex('#ff7ad9')); moon.pop(); R.spin.push({ mesh: moon.build(gl), p: tp, rot: t => M4.rotY(t * 0.08), glow: 0.1 });
    // the prism star that lights it all
    const star = new MeshBuilder(); shape(star, 1, 90, glowC([1, 0.85, 1])); R.spin.push({ mesh: star.build(gl), p: L(...RIFT_STAR), rot: t => M4.rotY(t * 0.2), glow: 1 }); R.sunAt = L(...RIFT_STAR);
    // the way back to space: another little tear
    const back = new MeshBuilder(); for (let j = 0; j < 6; j++) for (let i = 0; i < 40; i++) { const a0 = i / 40 * 6.2832, a1 = (i + 1) / 40 * 6.2832, r0 = RIFT_BACK.r * j / 6, r1 = RIFT_BACK.r * (j + 1) / 6, col = glowC(sMix([0.02, 0.02, 0.08], [0.4, 0.9, 1], Math.pow(j / 6, 2) * (0.6 + 0.4 * Math.sin(a0 * 4 + j)))), P = (r, a) => [Math.cos(a) * r, Math.sin(a) * r, 0]; back.quad(P(r0, a0), P(r0, a1), P(r1, a1), P(r1, a0), col, true); back.quad(P(r0, a0), P(r1, a0), P(r1, a1), P(r0, a1), col, true); }
    R.spin.push({ mesh: back.build(gl), p: L(...RIFT_BACK.p), rot: t => M4.rotZ(t * 0.5), glow: 1 });
    for (let k = 0; k < 8; k++) R.lights.push({ p: L(Math.cos(k * 0.8) * 120, 20, Math.sin(k * 0.8) * 120), r: 70, c: [[0.5, 1, 0.95], [1, 0.5, 0.9], [0.7, 0.6, 1]][k % 3] });
    for (let k = 0; k < 10; k++) { const a = k * 0.63, d = 40 + k * 17, x = Math.cos(a) * d, z = Math.sin(a) * d; R.item('prism' + k, 'gem', x, R.floorAt(o[0] + x, o[2] + z) - o[1] + 1.2, z); }
    R.start = L(0, 260, 420);
  }
}

// ---------- space stations: things you build in space (saved on this device) ----------
// every part: name, cost, a picture colour, how to build it (solid mb, see-through cl) and where you can stand on it
const STATION_PARTS = {
  deck: { name: 'Deck', cost: 100, c: '#9aa4b8', stand: 0.6, f(mb, cl, C) { mb.box(-8, -0.6, -8, 8, 0, 8, C('#8a94a8')); for (let i = -8; i <= 8; i += 4) for (const s of [-1, 1]) { mb.box(i - 0.15, 0, s * 8 - 0.15, i + 0.15, 1.2, s * 8 + 0.15, C('#c8ccd4')); mb.box(s * 8 - 0.15, 0, i - 0.15, s * 8 + 0.15, 1.2, i + 0.15, C('#c8ccd4')); } for (const s of [-1, 1]) { mb.box(-8, 1.1, s * 8 - 0.1, 8, 1.25, s * 8 + 0.1, glowC(C('#5ff0e0')), false, true); mb.box(s * 8 - 0.1, 1.1, -8, s * 8 + 0.1, 1.25, 8, glowC(C('#5ff0e0')), false, true); } } },
  tube: { name: 'Tunnel', cost: 120, c: '#c8ccd4', stand: 3.1, f(mb, cl, C) { mb.push([0, 0, 0], M4.rotZ(Math.PI / 2)); mb.cyl(0, -10, 0, 3, 3, 20, 12, C('#d8dce4')); for (let y = -9; y <= 9; y += 4.5) mb.cyl(0, y, 0, 3.3, 3.3, 0.6, 12, C('#5a6070')); mb.pop(); for (let x = -7; x <= 7; x += 4.5) mb.box(x, 2.2, -3.05, x + 2, 2.6, 3.05, glowC(C('#9ad8ff')), false, true); mb.box(-10, 2.95, -1.2, 10, 3.1, 1.2, C('#9aa0ac')); } },
  hub: { name: 'Hub core', cost: 300, c: '#e8eef7', stand: 7.6, f(mb, cl, C) { mb.ico(0, 0, 0, 7, 2, (x, y, z) => shadeC(C('#e8eef7'), 0.8 + 0.2 * (y * 0.5 + 0.5))); for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { mb.push([x * 7.5, 0, z * 7.5], M4.aim([x, 0, z])); mb.cyl(0, -1, 0, 2.2, 2.2, 2, 10, C('#5a6070')); mb.cyl(0, 0.9, 0, 2.4, 2.4, 0.3, 10, glowC(C('#ffc45a')), false); mb.pop(); } mb.push([0, 0, 0]); mb.cyl(0, -0.4, 0, 7.3, 7.3, 0.8, 24, glowC(C('#5ff0e0')), false); mb.pop(); mb.cyl(0, 6.6, 0, 4, 4, 1, 12, C('#9aa0ac')); } },
  solar: { name: 'Solar wings', cost: 200, c: '#3a6ad0', stand: 1.2, f(mb, cl, C) { mb.box(-1, -1, -1, 1, 1, 1, C('#9aa0ac')); mb.box(-16, -0.3, -0.3, 16, 0.3, 0.3, C('#c8ccd4')); for (const s of [-1, 1]) { mb.box(s * 3, -0.1, -5, s * 15, 0.1, 5, C('#20356e')); for (let x = 3; x < 15; x += 2) mb.box(s * x - 0.05, 0.1, -5, s * x + 0.05, 0.14, 5, glowC(C('#6a9aff')), false, true); for (let z = -5; z <= 5; z += 2.5) mb.box(s * 3, 0.1, z - 0.05, s * 15, 0.14, z + 0.05, C('#8a9ac8'), false, true); } } },
  beacon: { name: 'Beacon', cost: 80, c: '#ffd24a', stand: 4.6, f(mb, cl, C) { mb.cyl(0, -1, 0, 1.4, 1.6, 1, 8, C('#5a6070')); mb.cyl(0, 0, 0, 0.3, 0.3, 4, 6, C('#c8ccd4')); mb.ico(0, 4.6, 0, 1.1, 1, () => glowC(C('#ffd24a'))); } },
  cargo: { name: 'Cargo pods', cost: 150, c: '#e8743a', stand: 4.2, f(mb, cl, C) { [['#e8743a', -5, -3], ['#3ab0e8', 0, -3], ['#7be36b', 5, -3], ['#ffd24a', -2.5, 3], ['#e83a6a', 2.5, 3]].forEach(([c, x, z], i) => { mb.box(x - 2.2, -2, z - 2.6, x + 2.2, 2 + (i > 2 ? 0 : 0), z + 2.6, C(c)); for (let k = -2; k <= 2; k += 1) mb.box(x - 2.25, -1.8, z + k - 0.06, x + 2.25, 1.8, z + k + 0.06, shadeC(C(c), 0.7), true, true); }); mb.box(-8, -2.4, -6, 8, -2, 6, C('#5a6070')); mb.box(-3, 2, -4, 3, 4.2, 4, C('#9aa0ac')); } },
  antenna: { name: 'Antenna dish', cost: 180, c: '#c8ccd4', stand: 1.2, f(mb, cl, C) { mb.box(-2, -1, -2, 2, 1, 2, C('#5a6070')); mb.cyl(0, 1, 0, 0.4, 0.3, 8, 8, C('#c8ccd4')); mb.push([0, 9, 0], M4.rotX(0.6)); mb.lathe([[0.3, 0], [3, 0.6], [5.5, 2], [5.6, 2.2], [0, 0.4]], 18, C('#e8eef7'), 0.2); mb.cyl(0, 0.4, 0, 0.12, 0.12, 3.5, 5, C('#9aa0ac')); mb.ico(0, 4, 0, 0.45, 1, () => glowC(C('#ff5a5a'))); mb.pop(); } },
  tower: { name: 'Spire', cost: 400, c: '#9a7bff', stand: 1.2, f(mb, cl, C) { mb.cyl(0, -1, 0, 6, 6, 2, 8, C('#5a6070')); mb.cyl(0, 1, 0, 4, 1.2, 36, 8, C('#d8dce4')); for (let y = 6; y < 34; y += 6) mb.cyl(0, y, 0, 4.2 - y * 0.08, 4.2 - y * 0.08, 0.6, 8, glowC(C('#9a7bff')), false); mb.ico(0, 38, 0, 1.6, 1, () => glowC(C('#ff9ad8'))); } },
  lab: { name: 'Science lab', cost: 700, c: '#5ff0e0', stand: 6.2, f(mb, cl, C) { mb.box(-9, -2, -5, 9, 6, 5, C('#e8eef7')); mb.box(-9.05, 1.5, -5.05, 9.05, 3.5, 5.05, glowC(C('#9ad8ff')), false, true); mb.box(-9.1, 5.8, -5.1, 9.1, 6.2, 5.1, C('#5a6070')); mb.push([5, 6.2, 0], M4.rotZ(-0.7)); mb.cyl(0, 0, 0, 1.2, 1.2, 7, 10, C('#3a3f55')); mb.cyl(0, 7, 0, 1.4, 1.4, 0.5, 10, glowC(C('#5ff0e0')), false); mb.pop(); } },
  reactor: { name: 'Reactor', cost: 900, c: '#ff8a3a', stand: 12.2, f(mb, cl, C) { mb.cyl(0, -2, 0, 7, 7, 2, 16, C('#5a6070')); mb.cyl(0, 0, 0, 5, 5, 12, 16, C('#c8ccd4')); for (let y = 1.5; y < 12; y += 3) mb.cyl(0, y, 0, 5.3, 5.3, 0.8, 16, glowC(C('#ff8a3a')), false); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832; mb.push([Math.cos(a) * 6.2, 6, Math.sin(a) * 6.2], M4.rotY(-a)); mb.box(-0.15, -5, -1.4, 0.15, 5, 1.4, C('#8a94a8')); mb.pop(); } mb.cyl(0, 12, 0, 5.4, 5.4, 0.2, 16, C('#9aa0ac')); } },
  dome: { name: 'Garden dome', cost: 600, c: '#7be36b', stand: 0.4, f(mb, cl, C, dm) { mb.cyl(0, -1.5, 0, 11, 11, 1.5, 24, C('#9aa0ac')); mb.cyl(0, -0.02, 0, 10.4, 10.4, 0.4, 24, C('#5aae4a')); leafyTree(dm, 2, 0.4, 1, 1.2, '#4f9e48', 0.3); leafyTree(dm, -4, 0.4, -3, 1, '#5aae4a', 0.7); for (let k = 0; k < 6; k++) flowers(dm, Math.cos(k) * 6, 0.4, Math.sin(k) * 6, k * 0.17); cl.push([0, 0.4, 0]); cl.lathe([[10.5, 0], [10.3, 3], [9, 6.5], [6, 9.5], [0, 11]], 24, [0.7, 0.9, 1, 0.16]); cl.pop(); } },
  dock: { name: 'Ship dock', cost: 800, c: '#ffc45a', stand: 0.4, f(mb, cl, C) { mb.box(-14, -1.5, -14, 14, 0, 14, C('#4a4e58')); mb.box(-5, 0, -6, -3.5, 0.05, 6, C('#ffd24a'), false, true); mb.box(3.5, 0, -6, 5, 0.05, 6, C('#ffd24a'), false, true); mb.box(-3.5, 0, -0.75, 3.5, 0.05, 0.75, C('#ffd24a'), false, true); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.2832; mb.ico(Math.cos(a) * 12, 0.3, Math.sin(a) * 12, 0.4, 1, () => glowC(C(k % 2 ? '#5ff0e0' : '#ffc45a'))); } mb.box(10, 0, 10, 14, 12, 14, C('#d8dce4')); mb.box(9.6, 9, 9.6, 14.4, 11.5, 14.4, glowC(C('#9ad8ff')), false, true); } },
  hangar: { name: 'Hangar bay', cost: 1200, c: '#8a94a8', stand: 14.4, f(mb, cl, C) { mb.box(-15, -1, -10, 15, 0, 10, C('#4a4e58')); mb.box(-15, 0, 9, 15, 14, 10, C('#c8ccd4')); for (const s of [-1, 1]) mb.box(s * 15 - 1, 0, -10, s * 15, 14, 9, C('#d8dce4')); mb.box(-15, 14, -10, 15, 14.4, 10, C('#9aa0ac')); for (const s of [-1, 1]) mb.box(s * 14.6 - 0.3, 0, -10.1, s * 14.6 + 0.3, 14, -9.7, glowC(C('#ffc45a')), false, true); mb.box(-15, 13.4, -10.1, 15, 14, -9.7, glowC(C('#ffc45a')), false, true); for (let x = -12; x <= 12; x += 6) mb.box(x - 1, 13.9, -6, x + 1, 13.95, 6, glowC(C('#fff2d8')), false, true); } },
  ring: { name: 'Habitat ring', cost: 1500, c: '#e8eef7', stand: 6.6, f(mb, cl, C) { mb.ico(0, 0, 0, 6, 1, () => C('#d8dce4')); mb.cyl(0, 6, 0, 3, 3, 0.6, 10, C('#9aa0ac')); mb.tor([0, 0, 0], 34, 4.5, 64, 12, (a, b) => Math.sin(b) > 0.2 && Math.cos(a * 16) > 0 ? glowC(C('#9ad8ff')) : C('#e8eef7')); for (let k = 0; k < 4; k++) { const a = k / 4 * 6.2832; mb.push([0, 0, 0], M4.rotY(a)); mb.box(5, -0.6, -0.6, 30, 0.6, 0.6, C('#9aa0ac')); mb.pop(); } } },
  gate: { name: 'Star gate', cost: 2500, c: '#ff7ad9', stand: 1.2, f(mb, cl, C) { mb.push([0, 26, 0], M4.rotX(Math.PI / 2)); mb.tor([0, 0, 0], 24, 2.6, 64, 10, (a, b) => Math.cos(a * 12) > 0.6 ? glowC(C('#ff7ad9')) : C('#5a6070')); mb.pop(); mb.box(-8, -1, -3, 8, 1, 3, C('#4a4e58')); cl.push([0, 26, 0], M4.rotX(Math.PI / 2)); for (let j = 0; j < 4; j++) cl.cyl(0, -0.05 + j * 0.02, 0, 21.5 - j * 4, 21.5 - j * 4, 0.02, 32, [0.8, 0.4, 1, 0.12], false); cl.pop(); } },
  mirror: { name: 'Star mirror', cost: 5000, c: '#ffe8a0', stand: 1.2, f(mb, cl, C) { mb.box(-2, -1, -2, 2, 1, 2, C('#5a6070')); mb.cyl(0, 1, 0, 0.6, 0.6, 18, 8, C('#c8ccd4')); mb.push([0, 30, 0], M4.rotX(0.9)); for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) { if (Math.abs(q + r) > 3) continue; const x = 7.6 * (q + r / 2), z = 6.6 * r; hexPrism(mb, x, z, 3.6, -0.3, 0, smoothC([0.95, 0.92, 0.8]), C('#8a94a8'), glowC(C('#ffe8a0'))); } mb.pop(); } },
};
function stationList() { try { const l = JSON.parse(localStorage.getItem('nautic.stations') || '[]'); return Array.isArray(l) ? l.filter(p => Array.isArray(p) && STATION_PARTS[p[0]]).slice(0, 300) : []; } catch (e) { return []; } }
function saveStations(l) { try { localStorage.setItem('nautic.stations', JSON.stringify(l)); } catch (e) {} }
function buildStations(R, gl) {
  const o = R.o, mb = new MeshBuilder().collect(), cl = new MeshBuilder(), dm = new MeshBuilder(), C = h => hex(h);
  R.stands = [];
  for (const [k, x, y, z, yaw] of stationList()) {
    const P = STATION_PARTS[k], at = [o[0] + x, o[1] + y, o[2] + z], Rm = M4.rotY(yaw || 0);
    mb.push(at, Rm); cl.push(at, Rm); dm.push(at, Rm); P.f(mb, cl, C, dm); mb.pop(); cl.pop(); dm.pop();
    R.stands.push([at[0], at[1] + P.stand + 1, at[2]]);
  }
  for (const m of [R.stMesh, R.stClear, R.stDeco]) if (m) gl.free(m);
  R.stMesh = mb.build(gl); R.stClear = cl.build(gl); R.stDeco = dm.build(gl); R.sgrid = new TriGrid(); if (mb.tris.length) R.sgrid.add(mb.tris, { k: 'st' });
}
// where you can get out of a parked ship in space: the nearest spot you can stand on
function spaceStandNear(R, p) {
  let best = null, bd = 160;
  for (const s of R.stands || []) { const d = Math.hypot(s[0] - p[0], s[1] - p[1], s[2] - p[2]); if (d < bd) { bd = d; best = s; } }
  if (R.kind === 'rift') {
    const o = R.o, dx = p[0] - o[0], dz = p[2] - o[2], dl = Math.hypot(dx, dz);
    if (dl < RIFT_LAND + 120 && p[1] - o[1] < 260) { const k = Math.min(1, (RIFT_LAND - 20) / (dl || 1)), x = o[0] + dx * k, z = o[2] + dz * k; const s = [x, R.floorAt(x, z) + 1.5, z], d = Math.hypot(s[0] - p[0], s[1] - p[1], s[2] - p[2]); if (d < bd + 200) { best = s; bd = d; } }
    const tp = [o[0] + TESS.p[0], o[1] + TESS.p[1], o[2] + TESS.p[2]], H = TESS.h;
    if (Math.hypot(p[0] - tp[0], p[1] - (tp[1] + H), p[2] - tp[2]) < H * 1.8) { const s = [Math.max(tp[0] - H + 8, Math.min(tp[0] + H - 8, p[0])), tp[1] + H + 36, Math.max(tp[2] - H + 8, Math.min(tp[2] + H - 8, p[2]))]; best = s; }
  }
  return best;
}
