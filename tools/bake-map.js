// Bakes the big map picture of the whole world (the world is the same every time because of its seed).
// Run again after changing the land in js/terrain.js:   node tools/bake-map.js   (then: python3 tools/pack-map.py)
// Writes map/world.raw (RGB, SIZE x SIZE) and map/world.json (size, area, region names).
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..'), SIZE = +process.env.SIZE || 2048, SPAN = 16000, SEED = 20261115;
const ctx = { console, Math, Map, Set, Float32Array, Uint16Array, Uint32Array, Uint8Array, Int32Array, Array, Object, JSON, performance: { now: () => 0 }, window: { NAUTIC_BETA: true }, document: { createElement: () => ({ getContext: () => null }) }, navigator: { userAgent: '' }, addEventListener() {} };
vm.createContext(ctx);
for (const f of ['js/gl.js', 'js/terrain.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
vm.runInContext('globalThis.K = { Terrain, BIOMES, VOLCANO, STATION, hex, mixC, shadeC, smooth, lavaAt };', ctx);
const { Terrain, BIOMES, hex, mixC, smooth, lavaAt } = ctx.K;
const T = new Terrain(SEED), N = T.N, S1 = SIZE + 1, step = SPAN / SIZE;
const H = new Float32Array(S1 * S1), Bm = new Uint8Array(S1 * S1);
const t0 = Date.now();
for (let j = 0; j < S1; j++) {
  for (let i = 0; i < S1; i++) { const inf = T.info(-SPAN / 2 + i * step, -SPAN / 2 + j * step); H[j * S1 + i] = inf.h; Bm[j * S1 + i] = inf.b; }
  if (j % 256 === 0) console.log('row', j, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
const at = (A, i, j) => A[Math.max(0, Math.min(SIZE, j)) * S1 + Math.max(0, Math.min(SIZE, i))];
// land colour like the game's ground, painted a bit richer
function landColor(b, x, z, h) {
  let c = hex(BIOMES[b].ground);
  if (b === 2) c = mixC(hex('#5cb04c'), hex('#80be55'), smooth(0.3, 0.7, N.fbm(x / 160, z / 160, 61, 3)));
  if (b === 3) c = mixC(hex('#2f7a3a'), hex('#46883a'), smooth(0.3, 0.7, N.fbm(x / 120, z / 120, 62, 3)));
  if (b === 8) c = mixC(hex('#6a5cae'), hex('#8270c4'), smooth(0.3, 0.7, N.fbm(x / 140, z / 140, 63, 3)));
  if (b === 4) c = mixC(hex('#e2b872'), hex('#ecc888'), smooth(0.3, 0.7, N.fbm(x / 110, z / 110, 64, 3)));
  if (b === 6 && h > 95) c = hex('#eef3f9');
  if (b === 11) c = mixC(hex('#7a6658'), hex('#4e4240'), smooth(0.3, 0.7, N.v(x / 40, z / 40, 78)));
  return c;
}
const out = Buffer.alloc(SIZE * SIZE * 3);
const grain = (i, j, s) => N.hash(i, j, s);
for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++) {
  const x = -SPAN / 2 + (i + 0.5) * step, z = -SPAN / 2 + (j + 0.5) * step;
  const h = (at(H, i, j) + at(H, i + 1, j) + at(H, i, j + 1) + at(H, i + 1, j + 1)) / 4;
  const b = at(Bm, i, j);
  // slope and light from the top left (north west), a bit exaggerated so hills read
  const dx = (at(H, i + 1, j) + at(H, i + 1, j + 1) - at(H, i - 1, j) - at(H, i - 1, j + 1)) / (4 * step);
  const dz = (at(H, i, j + 1) + at(H, i + 1, j + 1) - at(H, i, j - 1) - at(H, i + 1, j - 1)) / (4 * step);
  const ex = 2.2, nx = -dx * ex, nz = -dz * ex, nl = Math.hypot(nx, 1, nz), lx = -0.55, ly = 0.7, lz = -0.45;
  const lit = (nx * lx + ly + nz * lz) / nl / Math.hypot(lx, ly, lz);
  let c;
  if (h < -0.4) {
    // water: light by the shore, deep blue further out, with thin rings that follow the coast
    const d = Math.min(1, -h / 34);
    c = mixC(mixC(hex('#5fb6d4'), hex('#2a69a8'), smooth(0, 0.35, d)), hex('#173f78'), smooth(0.3, 1, d));
    const ring = Math.abs(((-h + 2) / 7) % 1 - 0.5);
    if (-h < 30) c = mixC(c, hex('#d8f4ff'), smooth(0.04, 0, ring - 0.46 + 0) * 0.18 * (1 - -h / 30));
    if (h > -1.6) c = mixC(c, hex('#f4fbff'), 0.55); // foam at the edge
  } else {
    c = landColor(b, x, z, h);
    const steep = Math.hypot(dx, dz);
    c = mixC(c, hex(BIOMES[b].rock || (h > 80 ? '#8a8a92' : '#8a857c')), smooth(0.45, 1.0, steep) * 0.7);
    if (h < 2.6 && b !== 7 && b !== 0) c = mixC(c, hex('#e8d49c'), smooth(2.6, 1.2, h) * 0.8);
    const sh = 0.62 + 0.62 * Math.max(0, lit);
    c = [c[0] * sh, c[1] * sh, c[2] * sh];
    // faint height lines every 40 m
    const cl = Math.abs((h / 40) % 1 - 0.5);
    if (h > 12) c = mixC(c, [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7, 1], smooth(0.47, 0.5, cl) * 0.5);
    if (b === 11) { const lv = lavaAt(T, x, z, h); if (lv > 0.4) c = mixC(mixC(hex('#ffd25a'), hex('#ff5a12'), smooth(0.2, 0.6, N.v(x / 6, z / 6, 80))), c, 0); }
  }
  // paper grain, so it looks drawn on a sheet and not flat
  const g = 0.955 + grain(i, j, 3) * 0.05 + (N.v(i / 6, j / 6, 4) - 0.5) * 0.05;
  const o = (j * SIZE + i) * 3;
  out[o] = Math.max(0, Math.min(255, c[0] * g * 255)); out[o + 1] = Math.max(0, Math.min(255, c[1] * g * 255)); out[o + 2] = Math.max(0, Math.min(255, c[2] * g * 255));
}
fs.writeFileSync(path.join(ROOT, 'map/world.raw'), out);
// names of the big lands: flood fill each kind of land on a small grid, name the big ones at their middle
const L = 256, cell = SIZE / L, bg = new Uint8Array(L * L), seen = new Uint8Array(L * L), labels = [];
for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) { const b = at(Bm, Math.floor((i + 0.5) * cell), Math.floor((j + 0.5) * cell)); bg[j * L + i] = at(H, Math.floor((i + 0.5) * cell), Math.floor((j + 0.5) * cell)) < -0.4 ? 0 : b; }
const NAMED = { 3: 'Forest', 4: 'Desert', 5: 'Snowland', 6: 'Mountains', 7: 'Swamp', 8: 'Glow fields', 11: 'Volcano', 1: 'Beach', 2: 'Grassland' }, MIN = { 4: 40, 7: 60, 8: 60, 3: 90, 5: 160, 6: 60, 2: 400, 1: 9999, 11: 1 };
for (let s = 0; s < L * L; s++) {
  if (seen[s] || !NAMED[bg[s]]) continue;
  const b = bg[s], cells = [s]; seen[s] = 1;
  for (let q = 0; q < cells.length; q++) { const c = cells[q], ci = c % L, cj = (c / L) | 0; for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + a, nj = cj + d; if (ni < 0 || nj < 0 || ni >= L || nj >= L) continue; const n = nj * L + ni; if (!seen[n] && bg[n] === b) { seen[n] = 1; cells.push(n); } } }
  if (cells.length < MIN[b]) continue;
  // the spot deepest inside the area (farthest from its edge)
  const inA = new Set(cells); let best = cells[0], bd = -1;
  for (const c of cells) { const ci = c % L, cj = (c / L) | 0; let d = 0; while (d < 40) { d++; let edge = false; for (const [a, e] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]]) if (!inA.has((cj + e) * L + ci + a)) { edge = true; break; } if (edge) break; } if (d > bd) { bd = d; best = c; } }
  const wx = -SPAN / 2 + ((best % L) + 0.5) * SPAN / L, wz = -SPAN / 2 + (((best / L) | 0) + 0.5) * SPAN / L;
  labels.push({ name: NAMED[b], b, x: Math.round(wx), z: Math.round(wz), size: cells.length });
}
labels.sort((a, b) => b.size - a.size);
// the islands: every piece of land big enough gets a name (biggest first), with its box and what lands are on it
const ISLE_NAMES = ['Berekor Mainland', 'Whitecrown', 'Elderwood', 'Mistpeak', 'Hollowfrost', 'Amberleaf', 'Sandscar', 'Saltreach', 'Brannock', 'Ilvary', 'Dune Key', 'Wenn', 'Bogmoor', 'Glimmerholm', 'Wisp Isle', 'Little Tarn', 'Fenrow', 'Quill Isle', 'Lantern Isle', 'Oakum'];
// land joined only by thin necks counts as separate islands: shrink the land, find the pieces, then grow them back
const ER = +process.env.ER || 6, land = new Uint8Array(L * L); for (let c = 0; c < L * L; c++) land[c] = bg[c] !== 0 ? 1 : 0;
let core = land.slice(); for (let e = 0; e < ER; e++) { const nx = core.slice(); for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) { const c = j * L + i; if (!core[c]) continue; for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + d; if (ni < 0 || nj < 0 || ni >= L || nj >= L || !core[nj * L + ni]) { nx[c] = 0; break; } } } core = nx; }
const own = new Int32Array(L * L).fill(-1), pieces = [];
for (let s = 0; s < L * L; s++) { if (!core[s] || own[s] >= 0) continue; const k = pieces.length, cells = [s]; own[s] = k; for (let q = 0; q < cells.length; q++) { const c = cells[q], ci = c % L, cj = (c / L) | 0; for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + a, nj = cj + d; if (ni < 0 || nj < 0 || ni >= L || nj >= L) continue; const n = nj * L + ni; if (core[n] && own[n] < 0) { own[n] = k; cells.push(n); } } } pieces.push(cells); }
// grow back over the land (and small bits of land with no core join the nearest piece, or become their own)
let front = []; for (let c = 0; c < L * L; c++) if (own[c] >= 0) front.push(c);
while (front.length) { const nf = []; for (const c of front) { const ci = c % L, cj = (c / L) | 0; for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + a, nj = cj + d; if (ni < 0 || nj < 0 || ni >= L || nj >= L) continue; const n = nj * L + ni; if (land[n] && own[n] < 0) { own[n] = own[c]; nf.push(n); } } } front = nf; }
const isles = [];
for (let k = 0; k < pieces.length; k++) {
  const cells = []; for (let c = 0; c < L * L; c++) if (own[c] === k) cells.push(c);
  if (cells.length < 40) continue;
  let x0 = L, x1 = 0, z0 = L, z1 = 0; const kinds = {};
  for (const c of cells) { const ci = c % L, cj = (c / L) | 0; x0 = Math.min(x0, ci); x1 = Math.max(x1, ci); z0 = Math.min(z0, cj); z1 = Math.max(z1, cj); kinds[bg[c]] = (kinds[bg[c]] || 0) + 1; }
  const W = v => Math.round(-SPAN / 2 + v * SPAN / L), set = new Set(cells);
  const lands = Object.entries(kinds).filter(([b, n]) => NAMED[b] && (n >= 6 || +b === 11)).sort((a, b) => b[1] - a[1]).map(([b]) => +b);
  isles.push({ x0: W(x0), z0: W(z0), x1: W(x1 + 1), z1: W(z1 + 1), size: cells.length, lands, cells: set, home: set.has((L / 2) * L + L / 2) });
}
isles.sort((a, b) => (b.home - a.home) || (b.size - a.size));
// where to write each island's name: its spot farthest from the sea
const far = new Int32Array(L * L).fill(-1); let fr = []; for (let c = 0; c < L * L; c++) if (!land[c]) { far[c] = 0; fr.push(c); }
while (fr.length) { const nf = []; for (const c of fr) { const ci = c % L, cj = (c / L) | 0; for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + a, nj = cj + d; if (ni < 0 || nj < 0 || ni >= L || nj >= L) continue; const n = nj * L + ni; if (far[n] < 0) { far[n] = far[c] + 1; nf.push(n); } } } fr = nf; }
for (const it of isles) { let best = -1, bc = 0; for (const c of it.cells) if (far[c] > best) { best = far[c]; bc = c; } it.lx = Math.round(-SPAN / 2 + ((bc % L) + 0.5) * SPAN / L); it.lz = Math.round(-SPAN / 2 + (((bc / L) | 0) + 0.5) * SPAN / L); }
isles.forEach((it, k) => { it.name = ISLE_NAMES[k] || 'Isle ' + (k + 1); });
// which island each name sits on
for (const lb of labels) { const ci = Math.floor((lb.x + SPAN / 2) / SPAN * L), cj = Math.floor((lb.z + SPAN / 2) / SPAN * L); const it = isles.find(q => q.cells.has(cj * L + ci)); lb.isle = it ? isles.indexOf(it) : -1; }
// a small mask of the islands so a tap on the map knows which island it hit
const mask = Buffer.alloc(L * L); isles.forEach((it, k) => { for (const c of it.cells) mask[c] = k + 1; });
fs.writeFileSync(path.join(ROOT, 'map/world.json'), JSON.stringify({ size: SIZE, span: SPAN, region: 'Berekor', labels, isles: isles.map(({ cells, home, ...r }) => r), grid: L, mask: mask.toString('base64') }));
console.log('done in', ((Date.now() - t0) / 1000).toFixed(0) + 's,', labels.length, 'names');
