// Bakes the big map picture of the whole world (the world is the same every time because of its seed).
// Run again after changing the land in js/terrain.js:   node tools/bake-map.js   (then: python3 tools/pack-map.py)
// For a travel region:   REGION=dustmaw node tools/bake-map.js   (then: python3 tools/pack-map.py dustmaw)
// Writes map/world.raw (RGB, SIZE x SIZE) and map/world.json (size, area, region names).
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..'), SIZE = +process.env.SIZE || 2048, SPAN = 16000, REGION = process.env.REGION || 'berekor', FILE = REGION === 'berekor' ? 'world' : REGION;
const ctx = { console, Math, Map, Set, Float32Array, Uint16Array, Uint32Array, Uint8Array, Int32Array, Array, Object, JSON, performance: { now: () => 0 }, window: { NAUTIC_BETA: true }, document: { createElement: () => ({ getContext: () => null }) }, navigator: { userAgent: '' }, addEventListener() {} };
vm.createContext(ctx);
for (const f of ['js/gl.js', 'js/isles.js', 'js/terrain.js', 'js/worlds.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
vm.runInContext('VOLCANO.on = true; globalThis.K = { Terrain, BIOMES, VOLCANO, STATION, REGIONS, hex, mixC, shadeC, smooth, lavaAt };', ctx);
const { Terrain, BIOMES, REGIONS, VOLCANO, hex, mixC, smooth, lavaAt } = ctx.K, RG = REGIONS[REGION];
if (REGION !== 'berekor') { VOLCANO.on = false; vm.runInContext('REGION_NOW = ' + JSON.stringify(REGION), ctx); }
const T = new Terrain(RG.seed, RG.theme), N = T.N, S1 = SIZE + 1, step = SPAN / SIZE;
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
  if (BIOMES[b].g2) c = mixC(c, hex(BIOMES[b].g2), smooth(0.3, 0.7, N.fbm(x / 120, z / 120, 72, 2)));
  if (b === 2) c = mixC(hex('#5cb04c'), hex('#80be55'), smooth(0.3, 0.7, N.fbm(x / 160, z / 160, 61, 3)));
  if (b === 3) c = mixC(hex('#2f7a3a'), hex('#46883a'), smooth(0.3, 0.7, N.fbm(x / 120, z / 120, 62, 3)));
  if (b === 8) c = mixC(hex('#6a5cae'), hex('#8270c4'), smooth(0.3, 0.7, N.fbm(x / 140, z / 140, 63, 3)));
  if (b === 4) c = mixC(hex('#e2b872'), hex('#ecc888'), smooth(0.3, 0.7, N.fbm(x / 110, z / 110, 64, 3)));
  if (b === 6 && h > 95) c = hex('#eef3f9');
  if (b === 11) c = mixC(hex('#7a6658'), hex('#4e4240'), smooth(0.3, 0.7, N.v(x / 40, z / 40, 78)));
  if (b === 12) c = mixC(hex('#c4683c'), hex('#d98a52'), smooth(0.3, 0.7, N.fbm(x / 90, z / 90, 65, 2)));
  if (b === 13) c = mixC(hex('#d6c09a'), hex('#c8ae84'), smooth(0.3, 0.7, N.fbm(x / 120, z / 120, 66, 2)));
  if (b === 14) c = hex('#6fa042');
  if (b === 16) c = mixC(hex('#b8862e'), hex('#c8602a'), smooth(0.3, 0.7, N.fbm(x / 120, z / 120, 67, 3)));
  if (b === 17) c = mixC(hex('#1f5228'), hex('#2e6a30'), smooth(0.3, 0.7, N.fbm(x / 120, z / 120, 68, 3)));
  if (b === 19) c = mixC(hex('#f4f0e8'), hex('#e6decf'), smooth(0.3, 0.7, N.fbm(x / 120, z / 120, 70, 2)));
  if (b === 20) c = mixC(hex('#b07c5c'), hex('#c8a07a'), smooth(0.3, 0.7, N.fbm(x / 60, z / 60, 71, 2)));
  if (b === 18) c = mixC(hex('#cad4f4'), hex('#e2dcfa'), smooth(0.3, 0.7, N.fbm(x / 120, z / 120, 69, 3)));
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
fs.writeFileSync(path.join(ROOT, 'map/' + FILE + '.raw'), out);
// the drawn map: flat storybook colours, an inked coast, a contour line in the sea and little symbols
// (trees, cacti, peaks, mushrooms) like a hand-drawn adventure map
{
  const D = SIZE / 2, dr = Buffer.alloc(D * D * 3), hAt = (i, j) => at(H, i * 2, j * 2), bAt = (i, j) => at(Bm, i * 2, j * 2);
  const PAPER = hex('#e9dfc8'), INK = [0.17, 0.2, 0.26];
  const FLAT = { 1: '#efe2b8', 2: '#cbd6a0', 3: '#a9c48e', 4: '#ecd39a', 5: '#e8ecee', 6: '#c9c4bc', 7: '#a8b88a', 8: '#c6b4dc', 9: '#e6dcc4', 10: '#d0d2d4', 11: '#8e7c72', 12: '#dc9e74', 13: '#e4d2ac', 14: '#b4cf8c', 15: '#e6dcc4', 16: '#e2bf84', 17: '#93b47e', 18: '#dcdcf2', 19: '#f8f6f0', 20: '#d4a888' };
  const put = (i, j, c, a = 1) => { if (i < 0 || j < 0 || i >= D || j >= D) return; const o = (j * D + i) * 3; for (let q = 0; q < 3; q++) dr[o + q] = dr[o + q] * (1 - a) + Math.max(0, Math.min(255, c[q] * 255)) * a; };
  // the sea, smoothed (little puddles and swamp water don't count), and each sea pixel's distance from the coast
  const raw = new Uint8Array(D * D); for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) raw[j * D + i] = hAt(i, j) < -0.4 ? 1 : 0;
  const SM = new Uint8Array(D * D), R = 3; for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) { let n = 0, t = 0; for (let b2 = -R; b2 <= R; b2++) for (let a = -R; a <= R; a++) { const x = i + a, y = j + b2; if (x < 0 || y < 0 || x >= D || y >= D) { n++; t++; continue; } n += raw[y * D + x]; t++; } SM[j * D + i] = n * 2 > t ? 1 : 0; }
  const dist = new Int16Array(D * D).fill(-1); let fr = []; for (let c = 0; c < D * D; c++) if (!SM[c]) { dist[c] = 0; fr.push(c); }
  while (fr.length) { const nf = []; for (const c of fr) { const i = c % D, j = (c / D) | 0; for (const [a, b2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b2; if (x < 0 || y < 0 || x >= D || y >= D) continue; const n = y * D + x; if (dist[n] < 0) { dist[n] = dist[c] + 1; nf.push(n); } } } fr = nf; }
  const sea = (i, j) => i >= 0 && j >= 0 && i < D && j < D && SM[j * D + i] === 1;
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    const h = hAt(i, j), b = bAt(i, j); let c;
    if (sea(i, j)) {
      const d = dist[j * D + i]; c = mixC(hex('#8fb0cc'), hex('#6487b0'), smooth(2, 14, d));
      if (d === 7 || (d === 15 && (i + j) % 6 < 3)) c = hex('#5a9ea4');      // contour lines following the coast (the far one dashed)
    } else {
      c = mixC(hex(FLAT[b] || (BIOMES[b] && (BIOMES[b].flat || BIOMES[b].ground)) || '#d8cfa8'), PAPER, b >= 21 ? 0.15 : 0.25);
      if (h > 45) c = mixC(c, hex('#f2efe6'), smooth(60, 130, h) * 0.35);     // high ground goes pale
      if (b === 11 && lavaAt(T, -SPAN / 2 + (i + 0.5) * 2 * step, -SPAN / 2 + (j + 0.5) * 2 * step, h) > 0.4) c = hex('#e8603a');
      if (sea(i - 1, j) || sea(i + 1, j) || sea(i, j - 1) || sea(i, j + 1)) c = INK; // inked coast
      else if (b !== bAt(i + 1, j) || b !== bAt(i, j + 1)) c = mixC(c, INK, 0.18); // soft lines between lands
    }
    const g = 0.97 + grain(i, j, 7) * 0.04, o = (j * D + i) * 3;
    dr[o] = Math.min(255, c[0] * g * 255); dr[o + 1] = Math.min(255, c[1] * g * 255); dr[o + 2] = Math.min(255, c[2] * g * 255);
  }
  // little symbols, one per cell of a loose grid
  const CELL = 15;
  const tree = (x, y, c) => { for (let k = 0; k < 4; k++) put(x, y + k, INK); for (let a = -3; a <= 3; a++) for (let b2 = -3; b2 <= 3; b2++) { const d = a * a + b2 * b2; if (d <= 9) put(x + a, y - 3 + b2, d >= 6 ? INK : c); } };
  const pine = (x, y, c) => { for (let r = 0; r < 8; r++) { const w = Math.floor(r / 2); for (let a = -w; a <= w; a++) put(x + a, y - 7 + r, a === -w || a === w || r === 7 ? INK : c); } put(x, y + 1, INK); put(x, y + 2, INK); };
  const cactus = (x, y, c) => { for (let k = -6; k <= 2; k++) { put(x, y + k, c); put(x - 1, y + k, INK); put(x + 1, y + k, INK); } for (let k = -3; k <= -1; k++) { put(x - 3, y + k - 1, c); put(x + 3, y + k - 2, c); } put(x - 2, y - 1, c); put(x + 2, y - 2, c); };
  const peak = (x, y, c) => { for (let r = 0; r < 9; r++) for (let a = -r; a <= r; a++) put(x + a, y - 8 + r, a === -r || a === r || r === 8 ? INK : r < 3 ? hex('#ffffff') : c); };
  const shroom = (x, y, c) => { for (let k = 0; k < 4; k++) put(x, y + k, hex('#f4ecdc')); for (let a = -3; a <= 3; a++) for (let b2 = -2; b2 <= 0; b2++) put(x + a, y + b2, (b2 === -2 && Math.abs(a) > 1) ? hex('#f4ecdc') : (Math.abs(a) === 3 || b2 === -2) ? INK : c); };
  const rockS = (x, y, c) => { for (let a = -3; a <= 3; a++) for (let b2 = -2; b2 <= 1; b2++) put(x + a, y + b2, Math.abs(a) === 3 || b2 === -2 || b2 === 1 ? INK : c); };
  const SYM = { 3: [tree, '#5f9a5a'], 17: [pine, '#3e7a48'], 16: [tree, '#d88a3a'], 5: [pine, '#5e8a6a'], 4: [cactus, '#6a9a52'], 12: [rockS, '#b8643c'], 20: [rockS, '#a8705a'], 14: [tree, '#62a052'], 8: [shroom, '#a070d0'], 18: [peak, '#c8d0f0'], 6: [peak, '#a8a29a'], 7: [tree, '#7a9a5a'], 2: [tree, '#8cb06a'] };
  for (let cj = 0; cj < D / CELL; cj++) for (let ci = 0; ci < D / CELL; ci++) {
    const r = N.hash(ci, cj, 311); const i = Math.floor((ci + 0.2 + N.hash(ci, cj, 312) * 0.6) * CELL), j = Math.floor((cj + 0.2 + N.hash(ci, cj, 313) * 0.6) * CELL);
    if (i >= D || j >= D) continue; const h = hAt(i, j), b = bAt(i, j); if (h < 2) continue;
    let ok = true; for (let a = -4; a <= 4 && ok; a += 4) for (let b2 = -6; b2 <= 3; b2 += 3) if (sea(i + a, j + b2) || hAt(i + a, j + b2) < 1) { ok = false; break; }
    const BS = BIOMES[b] && BIOMES[b].sym, sy = b >= 21 ? (BS && [{ tree, pine, cactus, peak, shroom, rock: rockS }[BS[0]], BS[1]]) : SYM[b === 6 || (h > 70 && b !== 4) ? 6 : b]; if (!ok || !sy || r < (b === 2 ? 0.7 : b === 5 ? 0.6 : 0.15)) continue;
    sy[0](i, j, hex(sy[1]));
  }
  fs.writeFileSync(path.join(ROOT, 'map/' + FILE + '-d.raw'), dr);
}
// names of the big lands: flood fill each kind of land on a small grid, name the big ones at their middle
const L = 256, cell = SIZE / L, bg = new Uint8Array(L * L), seen = new Uint8Array(L * L), labels = [];
for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) { const b = at(Bm, Math.floor((i + 0.5) * cell), Math.floor((j + 0.5) * cell)); bg[j * L + i] = at(H, Math.floor((i + 0.5) * cell), Math.floor((j + 0.5) * cell)) < -0.4 ? 0 : b; }
const NAMED = { 3: 'Forest', 4: RG.theme ? 'Dunes' : 'Desert', 5: 'Snowland', 6: 'Mountains', 7: 'Swamp', 8: 'Glow fields', 11: 'Volcano', 1: 'Beach', 2: 'Grassland', 12: 'Red mesas', 13: 'Dust flats', 14: 'Oasis', 16: 'Autumn woods', 17: 'Elder forest', 18: 'Frostglow', 19: 'Salt flats', 20: 'Badlands' }, MIN = { 16: 60, 17: 60, 18: 60, 4: RG.theme ? 120 : 40, 7: 60, 8: 60, 3: 90, 5: 160, 6: 60, 2: 400, 1: 9999, 11: 1, 12: 50, 13: 80, 14: 12, 19: 60, 20: 60 };
for (const b in BIOMES) if (+b >= 21) { NAMED[b] = BIOMES[b].name; MIN[b] = 60; }
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
const ISLE_NAMES = {
  whisper: ['Whisper Isle', 'Oakhollow', 'Mossgrove', 'Old Root', 'Fernmere', 'Acorn Key', 'Bramblewick', 'Thornfield', 'Quietwood', 'Owlrest', 'Little Glade', 'Leafholm', 'Hushwater', 'Barkley Isle', 'Greenmantle', 'Twigsby', 'Deepwood', 'Shadeholm', 'Ivy Key', 'Elmreach'],
  coral: ['Coral Main', 'Pinkshore', 'Anemone Key', 'Reefholm', 'Clownfish Isle', 'Pearlbay', 'Sea Fan Key', 'Urchin Isle', 'Brightwater', 'Little Reef', 'Spongerock', 'Shellmere', 'Kelpholm', 'Sunfish Key', 'Rosesand', 'Bubble Isle', 'Lagoonette', 'Starfish Key', 'Polyp Isle', 'Wavecrest'],
  sunspray: ['Sunspray Main', 'Windcliff', 'Crabclaw Key', 'Palmhigh', 'Spraypoint', 'Gustholm', 'Coconut Cliffs', 'Surfside', 'Breezy Key', 'Little Spray', 'Sunreach', 'Toucan Isle', 'Saltwind', 'Kiteholm', 'Bluffton', 'Seagrape Key', 'Highsand', 'Wavebreak', 'Sandpiper Isle', 'Foam Key'],
  magma: ['Magma Main', 'Lavaholm', 'Fireside', 'Molten Key', 'Searock', 'Flarepeak', 'Cinderpool', 'Blaze Key', 'Little Magma', 'Glowpit', 'Hotfoot Isle', 'Scorchwater', 'Ember Key', 'Furnace Isle', 'Redflow', 'Sulphur Key', 'Heatwave', 'Burnmark', 'Lavaby', 'Ignis Isle'],
  obsidian: ['Glassfield', 'Blackshard', 'Obsidia Key', 'Sharpstone', 'Darkglass', 'Mirrorrock', 'Shardholm', 'Little Glass', 'Nightedge', 'Voidstone', 'Splinter Key', 'Gloomsand', 'Razor Isle', 'Inkrock', 'Shadowglass', 'Coalby', 'Jetstone', 'Gleam Key', 'Raven Isle', 'Duskshard'],
  frostpeak: ['Frostpeak', 'Icecrown', 'Glacier Top', 'Hailstone', 'Coldspire', 'Avalanche Key', 'Snowcap', 'Rimepeak', 'Little Frost', 'Wintergate', 'Bluepeak', 'Chillwind', 'Summit Isle', 'Icefall', 'Northholm', 'Crag Key', 'Silverpeak', 'Whitecliff', 'Frozen Key', 'Stormcrown'],
  snowdrift: ['Driftholm', 'Snowmere', 'Flurry Key', 'Pinewhite', 'Softsnow', 'Mitten Isle', 'Sledhill', 'Frostbun', 'Little Drift', 'Snowball Key', 'Cocoa Isle', 'Woolly Key', 'Icicle Isle', 'Fluffholm', 'Powder Key', 'Sleighby', 'Quietsnow', 'Snowpine', 'Hollowdrift', 'Chilly Key'],
  gearfall: ['Gearfall Main', 'Cogholm', 'Ratchet Key', 'Bolt Isle', 'Spanner Key', 'Old Mill', 'Crankton', 'Little Gear', 'Axle Isle', 'Flywheel Key', 'Pulley Isle', 'Grinder Key', 'Steamholm', 'Lever Isle', 'Oilwater', 'Copperby', 'Hinge Key', 'Valve Isle', 'Pistonholm', 'Nutsby'],
  skyport: ['Skyport Main', 'Dockside', 'Hangar Key', 'Beacon Isle', 'Runway Key', 'Cloudgate', 'Terminal Isle', 'Little Port', 'Skylift', 'Cargo Key', 'Signal Isle', 'Pad Nine', 'Jetwash', 'Arrival Key', 'Contrail Isle', 'Liftoff Key', 'Towerholm', 'Gateway Isle', 'Radar Key', 'Orbit Isle'],
  lumen: ['Glowmere', 'Duskfen', 'Shimmer Key', 'Wickhollow', 'Moonmoss', 'Lanternreach', 'Faintwater', 'Starling Isle', 'Pale Hollow', 'Glimmerrun', 'Nightcap', 'Sporewood', 'Violet Key', 'Emberglow', 'Hushwater', 'Little Lumen', 'Wisplight', 'Gloomberry', 'Softshine', 'Candlewick', 'Owlrest', 'Blinkstone', 'Dimmer Isle', 'Lastlight', 'Cinderbloom', 'Faylock', 'Glowtide', 'Twinkle Key', 'Murkmoss', 'Dewlamp'],
  kelar: ['Kelar Main', 'Coralby', 'Saltwhistle', 'Palmrest', 'Gullhaven', 'Sunreef', 'Turtle Bay', 'Coconut Key', 'Bluewater', 'Shellbeach', 'Parrot Isle', 'Lagoona', 'Driftpalm', 'Mango Key', 'Seaspray', 'Little Kelar', 'Pearlstrand', 'Breezy Isle', 'Crabclaw', 'Sandy Hook', 'Tidecrest', 'Warmwater', 'Kelp Key', 'Hibiscus Isle', 'Long Reef', 'Seastar', 'Gull Rock', 'Sunfish Key', 'Flying Fish', 'Last Palm'],
  rustworks: ['Scrapyard Isle', 'Pylon Key', 'Gearwick', 'Boltmouth', 'Old Foundry', 'Smelter Isle', 'Cogsworth', 'Rivetrock', 'Slagheap', 'Wirewood', 'Pistonbay', 'Brassmoor', 'Sprocket Key', 'Tin Isle', 'Clank Isle', 'Furnace Point', 'Chainlink', 'Little Works', 'Valve Key', 'Girder Isle', 'Coalbank', 'Ironreach', 'Spanner Key', 'Crane Isle', 'Dynamo', 'Fuse Key', 'Grease Isle', 'Last Shift', 'Steamhole', 'Nutbolt'],
  tidewild: ['Mangrove Tangle', 'Brinepool', 'Low Tide Key', 'Mudflat', 'Rootwater', 'Crabmarsh', 'Silt Isle', 'Heronreach', 'Tanglewood', 'Saltmarsh', 'Ebbside', 'Mosswater', 'Eel Key', 'Driftmud', 'Little Tide', 'Reedbank', 'Shellmud', 'Puddle Key', 'Snapper Isle', 'Slick Isle'],
  cinder: ['Smoulder Isle', 'Basalt Key', 'Charmouth', 'Ashpeak', 'Blazeholm', 'Scorchrock', 'Magma Key', 'Burnside', 'Sparkfell', 'Kiln Isle', 'Brimstone', 'Firestep', 'Obsidia', 'Little Cinder', 'Hotfoot', 'Coalfire', 'Searing Key', 'Flarepoint', 'Redhollow', 'Ember Isle'],
  ashveil: ['Greyhollow', 'Soot Isle', 'Cinderwood', 'Ashmere', 'Dustveil', 'Charwood', 'Paleburn', 'Smokereach', 'Embermoor', 'Grimwood', 'Hollow Ash', 'Silent Isle', 'Little Ash', 'Grey Key', 'Burntwater', 'Fogwood', 'Dimvale', 'Cinderfen', 'Stillwood', 'Wraith Isle'],
  glacier: ['Floe', 'Hoarfrost', 'Bitterwind', 'Iceholm', 'Snowmere', 'Frostbite', 'Coldharbour', 'Rimeback', 'Whiteout', 'Glacier Key', 'Sleetfall', 'Polar Isle', 'Brrr Isle', 'Little Floe', 'Crackice', 'Frozen Key', 'Icefang', 'Shiverrock', 'Chillwater', 'Northmost'],
  aurora: ['Starfrost', 'Lumen Key', 'Glowfloe', 'Prismhold', 'Shimmerice', 'Veilpoint', 'Skylight', 'Nightglass', 'Crystalmere', 'Little Aurora', 'Greenfire', 'Halo Key', 'Ribbon Isle', 'Coldglow', 'Starfall', 'Silverrime', 'Dawnice', 'Faint Key', 'Polaris', 'Wonderice'],
  stacks: ['Tower Isle', 'Skyrail Key', 'Lamplight', 'Neonreach', 'Blocktown', 'Highrise', 'Glowgrid', 'Circuit Isle', 'Signal Key', 'Wattmoor', 'Pixel Isle', 'Little Stacks', 'Voltage', 'Rooftop Key', 'Glasswall', 'Echo Isle', 'Static Key', 'Gridlock', 'Nightshift', 'Last Lamp'],
  berekor: ['Berekor Mainland', 'Whitecrown', 'Elderwood', 'Mistpeak', 'Hollowfrost', 'Amberleaf', 'Sandscar', 'Saltreach', 'Brannock', 'Ilvary', 'Dune Key', 'Wenn', 'Bogmoor', 'Glimmerholm', 'Wisp Isle', 'Little Tarn', 'Fenrow', 'Quill Isle', 'Lantern Isle', 'Oakum'],
  dustmaw: ['Sandhollow', 'Rustmesa', 'Scorchkey', 'Dry Gulch', 'Ochre Atoll', 'Saltpan', 'Redrock', 'Thirstwell', 'Mesa Vell', 'Dustfall', 'Gritstone', 'Hollow Sun', 'Brittle Key', 'Sunbake', 'Copperbluff', 'Bleakwater', 'Tumble Isle', 'Ashen Mesa', 'Pebbleshoal', 'Cinder Dune', 'Dryreed', 'Sandpiper Key', 'Glassmouth', 'Old Well', 'Driftbone', 'Scrubhook', 'Kiln Key', 'Tinder Isle', 'Rattleback', 'Saltcrown', 'Wither Key', 'Dune Fang', 'Ember Flat', 'Burrow Isle', 'Sunspit', 'Grain Isle', 'Hookstone', 'Parchmoor', 'Last Drop', 'Thornpoint', 'Quiet Sands', 'Ashwind', 'Little Mesa', 'Dry Tooth', 'Shimmerkey'] }[REGION];
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
  if (cells.length < (RG.theme ? 70 : 40)) continue;
  let x0 = L, x1 = 0, z0 = L, z1 = 0; const kinds = {};
  for (const c of cells) { const ci = c % L, cj = (c / L) | 0; x0 = Math.min(x0, ci); x1 = Math.max(x1, ci); z0 = Math.min(z0, cj); z1 = Math.max(z1, cj); kinds[bg[c]] = (kinds[bg[c]] || 0) + 1; }
  const W = v => Math.round(-SPAN / 2 + v * SPAN / L), set = new Set(cells);
  const lands = Object.entries(kinds).filter(([b, n]) => NAMED[b] && (n >= 6 || +b === 11)).sort((a, b) => b[1] - a[1]).map(([b]) => +b);
  isles.push({ x0: W(x0), z0: W(z0), x1: W(x1 + 1), z1: W(z1 + 1), size: cells.length, lands, cells: set, home: set.has((L / 2) * L + L / 2) });
}
isles.sort((a, b) => (b.home - a.home) || (b.size - a.size));
// keep the island numbers of the region's island table (its themes and landmarks go by these numbers)
const TBL = vm.runInContext({ berekor: 'BEREKOR_ISLES', dustmaw: 'DUST_ISLES' }[REGION] || 'null', ctx);
if (TBL) {
  for (const it of isles) { const v = {}; for (const c of it.cells) { const k = TBL.at(-SPAN / 2 + ((c % L) + 0.5) * SPAN / L, -SPAN / 2 + (((c / L) | 0) + 0.5) * SPAN / L); if (k >= 0) v[k] = (v[k] || 0) + 1; } const e = Object.entries(v).sort((a, b) => b[1] - a[1])[0]; it.tk = e ? +e[0] : 999; }
  const used = new Set(), ord = isles.slice().sort((a, b) => b.size - a.size); for (const it of ord) { if (used.has(it.tk)) it.tk = 999; used.add(it.tk); }
  const fixed = isles.filter(it => it.tk < 999).sort((a, b) => a.tk - b.tk), rest = isles.filter(it => it.tk >= 999);
  isles.length = 0; let k = 0; for (const it of fixed) { while (k < it.tk) { isles.push(null); k++; } isles.push(it); k++; } for (const it of rest) isles.push(it);
  for (let q = isles.length - 1; q >= 0; q--) if (!isles[q]) isles[q] = { x0: 0, z0: 0, x1: 0, z1: 0, size: 0, lands: [], cells: new Set(), gone: true };
}
// where to write each island's name: its spot farthest from the sea
const far = new Int32Array(L * L).fill(-1); let fr = []; for (let c = 0; c < L * L; c++) if (!land[c]) { far[c] = 0; fr.push(c); }
while (fr.length) { const nf = []; for (const c of fr) { const ci = c % L, cj = (c / L) | 0; for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + a, nj = cj + d; if (ni < 0 || nj < 0 || ni >= L || nj >= L) continue; const n = nj * L + ni; if (far[n] < 0) { far[n] = far[c] + 1; nf.push(n); } } } fr = nf; }
for (const it of isles) { let best = -1, bc = 0; for (const c of it.cells) if (far[c] > best) { best = far[c]; bc = c; } it.lx = Math.round(-SPAN / 2 + ((bc % L) + 0.5) * SPAN / L); it.lz = Math.round(-SPAN / 2 + (((bc / L) | 0) + 0.5) * SPAN / L); }
isles.forEach((it, k) => { it.name = ISLE_NAMES[k] || 'Isle ' + (k + 1); });
// which island each name sits on
for (const lb of labels) { const ci = Math.floor((lb.x + SPAN / 2) / SPAN * L), cj = Math.floor((lb.z + SPAN / 2) / SPAN * L); const it = isles.find(q => q.cells.has(cj * L + ci)); lb.isle = it ? isles.indexOf(it) : -1; }
// a small mask of the islands so a tap on the map knows which island it hit
const mask = Buffer.alloc(L * L); isles.forEach((it, k) => { for (const c of it.cells) mask[c] = k + 1; });
fs.writeFileSync(path.join(ROOT, 'map/' + FILE + '.json'), JSON.stringify({ size: SIZE, span: SPAN, region: RG.name, labels, isles: isles.map(({ cells, home, ...r }) => r), grid: L, mask: mask.toString('base64') }));
console.log('done in', ((Date.now() - t0) / 1000).toFixed(0) + 's,', labels.length, 'names');
