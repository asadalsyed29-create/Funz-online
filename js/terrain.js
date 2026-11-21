// The massive low-poly world: noise, height, biomes, chunk meshes and decorations.
const SEA = 0, LIMIT = 8000, CHUNK = 64, CELL = 4, CN = CHUNK / CELL;
const STATION = { x: 640, z: -420, ground: 10, R: 60 };
let SPAWN_H = 6; // set from the land around the plaza when the world is made

const BIOMES = {
  0: { name: 'Ocean', ground: '#c9b47f' },
  1: { name: 'Beach', ground: '#e8d49c' },
  2: { name: 'Grassland', ground: '#6cbf55' },
  3: { name: 'Forest', ground: '#3f8f45' },
  4: { name: 'Desert', ground: '#e6c07a', rock: '#c9965a' },
  5: { name: 'Snowland', ground: '#eef3f9', rock: '#a9b4c4' },
  6: { name: 'Mountains', ground: '#8c8a90' },
  7: { name: 'Swamp', ground: '#5d7a3e' },
  8: { name: 'Glow fields', ground: '#6e5fb0', rock: '#4f4680' },
  9: { name: 'Plaza', ground: '#d8c9a8' },
  10: { name: 'Station grounds', ground: '#98a0aa' },
};

class Noise {
  constructor(seed) { this.seed = seed >>> 0; }
  hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((this.seed + s) | 0, 2246822519)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  v(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = this.hash(xi, yi, s), b = this.hash(xi + 1, yi, s), c = this.hash(xi, yi + 1, s), d = this.hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  }
  fbm(x, y, s, oct = 4) { let t = 0, a = 1, f = 1, n = 0; for (let o = 0; o < oct; o++) { t += this.v(x * f, y * f, s + o * 31) * a; n += a; a *= 0.5; f *= 2.03; } return t / n; }
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

class Terrain {
  constructor(seed) {
    this.N = new Noise(seed); this.cache = new Map();
    // The plaza and the station sit level with the land around them (never down in a pit).
    this.flat = false;
    const ring = (cx, cz, r) => { let s = 0; for (let k = 0; k < 12; k++) s += this.info(cx + Math.cos(k / 12 * 6.2832) * r, cz + Math.sin(k / 12 * 6.2832) * r).h; return s / 12; };
    SPAWN_H = Math.max(4, Math.round(ring(0, 0, 50) * 10) / 10);
    STATION.ground = Math.max(4, Math.round(ring(STATION.x, STATION.z, 140) * 10) / 10);
    this.flat = true;
  }
  // height + biome numbers at a point
  info(x, z) {
    const N = this.N, d0 = Math.hypot(x, z), dS = Math.hypot(x - STATION.x, z - STATION.z);
    const edge = Math.max(0, (Math.max(Math.abs(x), Math.abs(z)) - 6400) / 1600);
    const cont = N.fbm(x / 1700, z / 1700, 1, 4) + 0.32 * Math.exp(-(d0 * d0) / 490000) + 0.3 * Math.exp(-(dS * dS) / 360000) - edge * 0.7;
    const land = cont - 0.46;
    let h = land * 150;
    const lw = Math.max(0, Math.min(1, land * 6 + 0.35));
    h += (N.fbm(x / 230, z / 230, 7, 3) - 0.5) * 20 * lw;
    const st = v => (v - 0.5) * 1.7 + 0.5;
    const mnt = smooth(0.56, 0.7, st(N.fbm(x / 1300, z / 1300, 13, 3))) * Math.max(0, Math.min(1, land * 8));
    if (mnt > 0) { const r = 1 - Math.abs(2 * N.fbm(x / 380, z / 380, 17, 4) - 1); h += r * r * 150 * mnt; }
    const temp = st(N.fbm(x / 2600, z / 2600, 23, 3)) - Math.max(0, h) * 0.0025;
    const moist = st(N.fbm(x / 2100, z / 2100, 29, 3));
    const glow = st(N.fbm(x / 900, z / 900, 37, 2));
    const swampW = smooth(0.62, 0.7, moist) * smooth(16, 4, h) * (1 - mnt);
    if (swampW > 0) h = h + (0.4 + (N.v(x / 14, z / 14, 41) - 0.5) * 2.4 - h) * swampW * 0.85;
    const desertW = smooth(0.58, 0.66, temp) * smooth(0.46, 0.38, moist);
    if (desertW > 0 && h > 2) h += (Math.sin(x / 23 + N.v(x / 60, z / 60, 43) * 6) * 0.5 + 0.5) * 5 * desertW;
    // flat places: the plaza and the station grounds
    let b = -1;
    if (this.flat) {
      const wP = smooth(75, 30, d0); if (wP > 0) { h += (SPAWN_H - h) * wP; if (d0 < 27) b = 9; }
      const wS = smooth(190, 100, dS); if (wS > 0) { h += (STATION.ground - h) * wS; if (wS > 0.9) b = 10; }
    }
    if (b < 0) {
      if (h < -1.5) b = 0; else if (h < 1.6 && swampW < 0.5) b = 1;
      else if (h > 60 && mnt > 0.3) b = temp < 0.38 || h > 110 ? 5 : 6;
      else if (temp < 0.3) b = 5;
      else if (swampW > 0.5) b = 7;
      else if (desertW > 0.5) b = 4;
      else if (glow > 0.7) b = 8;
      else if (moist > 0.52) b = 3;
      else b = 2;
    }
    return { h, b, temp, moist };
  }
  h(x, z) { return this.info(x, z).h; }
  // height at a grid vertex (cached, used by physics)
  vh(i, j) {
    const k = i * 131071 + j; let v = this.cache.get(k);
    if (v === undefined) { v = this.info(i * CELL, j * CELL).h; if (this.cache.size > 60000) this.cache.clear(); this.cache.set(k, v); }
    return v;
  }
  // exact height on the triangle surface
  ground(x, z) {
    const i = Math.floor(x / CELL), j = Math.floor(z / CELL), fx = x / CELL - i, fz = z / CELL - j;
    const a = this.vh(i, j), b = this.vh(i + 1, j), c = this.vh(i, j + 1), d = this.vh(i + 1, j + 1);
    if ((i + j) & 1) { // diagonal from (1,0) to (0,1)
      return fx + fz < 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
    }
    return fx > fz ? a + (b - a) * fx + (d - b) * fz : a + (c - a) * fz + (d - c) * fx;
  }
  // the (up to 2) triangles of a cell, for collisions
  cellTris(i, j, out) {
    const P = (a, b) => [a * CELL, this.vh(a, b), b * CELL];
    const A = P(i, j), B = P(i + 1, j), C = P(i, j + 1), D = P(i + 1, j + 1);
    if ((i + j) & 1) { out.push([A, C, B], [B, C, D]); } else { out.push([A, D, B], [A, C, D]); }
  }
}

// ---------- chunk meshes ----------
// colour of the ground at a spot (blended with the land around it, so biomes fade into each other)
function groundColor(T, x, z, info, ny, h) {
  const B = BIOMES[info.b]; let c = hex(B.ground);
  if (info.b === 2) c = mixC(hex('#5cb04c'), hex('#84c255'), smooth(0.35, 0.65, T.N.v(x / 90, z / 90, 61)));
  if (info.b === 3) c = mixC(hex('#3f8f45'), hex('#57983e'), smooth(0.3, 0.7, T.N.v(x / 70, z / 70, 62)));
  if (info.b === 6 && h > 95) c = hex('#eef3f9');
  if (h < -1.2) c = mixC(hex('#d8c48f'), hex('#6f8a7a'), Math.min(1, -h / 25));
  return c;
}
function vertexColor(T, x, z, h, ny) {
  // average a few spots around so the edges between biomes are soft
  let r = 0, g = 0, b = 0;
  for (const [dx, dz, w] of [[0, 0, 2], [5, 0, 1], [-5, 0, 1], [0, 5, 1], [0, -5, 1]]) { const inf = T.info(x + dx, z + dz), c = groundColor(T, x + dx, z + dz, inf, ny, inf.h); r += c[0] * w; g += c[1] * w; b += c[2] * w; }
  let c = [r / 6, g / 6, b / 6, 1];
  const inf = T.info(x, z), B = BIOMES[inf.b];
  if (inf.b !== 9 && inf.b !== 10) {
    const rk = smooth(0.84, 0.66, ny); if (rk > 0) c = mixC(c, hex(B.rock || (h > 80 ? '#8a8a92' : '#8a857c')), rk);   // steep = rock
    if (h > 1.6 && h < 3.5 && inf.b !== 7) c = mixC(c, hex('#e8d49c'), smooth(3.5, 2, h) * 0.6);                       // sandy edge by the sea
    if (h > -0.6 && h < 0.9 && inf.b !== 7) c = shadeC(c, 0.86);                                                        // wet sand
  }
  return c;
}
function buildTerrainChunk(gl, T, cx, cz, decos) {
  const mb = new MeshBuilder(), H = [], I = [], E = CN + 3;
  // heights with a one-cell border so normals match the next chunk
  for (let j = -1; j <= CN + 1; j++) for (let i = -1; i <= CN + 1; i++) {
    const gi = cx * CN + i, gj = cz * CN + j, inf = T.info(gi * CELL, gj * CELL);
    H.push(inf.h); if (i >= 0 && j >= 0 && i <= CN && j <= CN) { I[j * (CN + 1) + i] = inf; T.cache.set(gi * 131071 + gj, inf.h); }
  }
  const hAt = (i, j) => H[(j + 1) * E + (i + 1)];
  const inf = (i, j) => I[j * (CN + 1) + i];
  const base = mb.v.length / 10;
  for (let j = 0; j <= CN; j++) for (let i = 0; i <= CN; i++) {
    const x = cx * CHUNK + i * CELL, z = cz * CHUNK + j * CELL, h = hAt(i, j);
    let nx = hAt(i - 1, j) - hAt(i + 1, j), ny = 2 * CELL, nz = hAt(i, j - 1) - hAt(i, j + 1); const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    mb.vert([x, h, z], [nx, ny, nz], vertexColor(T, x, z, h, ny));
  }
  const V = (i, j) => base + j * (CN + 1) + i;
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) {
    const gi = cx * CN + i, gj = cz * CN + j, A = V(i, j), B = V(i + 1, j), C = V(i, j + 1), D = V(i + 1, j + 1);
    if ((gi + gj) & 1) mb.i.push(A, C, B, B, C, D); else mb.i.push(A, D, B, A, C, D);
  }
  // decorations (their own mesh, drawn with cartoon shading)
  const colliders = [], dmb = new MeshBuilder(), lmb = new MeshBuilder(); lmb.lod = true; // full detail for close, simple for far
  const noCol = [];
  const N = T.N;
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) {
    const gx = cx * CN + i, gz = cz * CN + j, r = N.hash(gx, gz, 501);
    const x = gx * CELL + 0.6 + N.hash(gx, gz, 502) * (CELL - 1.2), z = gz * CELL + 0.6 + N.hash(gx, gz, 503) * (CELL - 1.2);
    const info = inf(i, j); if (info.b === 9 || info.b === 10) continue;
    if (Math.abs(x - 120) < 62 && Math.abs(z + 40) < 56) continue; // the Fun Park deck and its ramps
    if ((Math.abs(x - 100) < 72 && Math.abs(z + 160) < 72) || (x > -580 && x < -458 && z > -14 && z < 18)) continue; // the game arena, the fishing pier and its bait shop
    const y = T.ground(x, z); if (y < SEA - 0.3 && info.b !== 7 && info.b !== 0) continue;
    const s = 0.8 + N.hash(gx, gz, 504) * 0.6, rot = N.hash(gx, gz, 505) * 6.28;
    decorate(dmb, colliders, info.b, r, x, y, z, s, rot, N.hash(gx, gz, 506), decos);
    if (r < 0.13 || info.b === 8) decorate(lmb, noCol, info.b, r, x, y, z, s, rot, N.hash(gx, gz, 506), decos); // far away only the bigger things
  }
  return { mesh: mb.build(gl), deco: dmb.build(gl), decoLo: lmb.build(gl), colliders };
}

// trees, rocks, flowers... by biome. colliders get {x,z,y0,y1,r} upright cylinders
function decorate(mb, col, b, r, x, y, z, s, rot, r2, decos) {
  const cyl = (rad, h) => col.push({ x, z, y0: y - 1, y1: y + h, r: rad });
  const stone = (sc, c) => { rock(mb, x, y, z, sc, c, r2); col.push({ x, z, y0: y - 1, y1: y + sc * 0.8, r: sc * 0.9 }); };
  if (b === 3) { // forest
    if (r < 0.065) { pine(mb, x, y, z, s * 1.3, false, r2); cyl(0.35 * s, 7 * s); }
    else if (r < 0.11) { roundTree(mb, x, y, z, s * 1.15, r2 < 0.2 ? (r2 < 0.1 ? '#e0892e' : '#d8b03a') : '#3f9a4e', r2); cyl(0.35 * s, 6 * s); }
    else if (r < 0.125) { birch(mb, x, y, z, s, r2); cyl(0.25 * s, 6 * s); }
    else if (r < 0.17) bush(mb, x, y, z, s, '#2f7a3a', r2);
    else if (r < 0.29) fern(mb, x, y, z, s, rot);
    else if (r < 0.31) shrooms(mb, x, y, z, r2);
    else if (r < 0.34) flowers(mb, x, y, z, r2);
    else if (r < 0.36) { log(mb, x, y, z, s, rot); }
  } else if (b === 2) { // grassland
    if (r < 0.018) { roundTree(mb, x, y, z, s * 1.25, '#4fae4a', r2); cyl(0.4 * s, 6 * s); }
    else if (r < 0.024) { blossom(mb, x, y, z, s * 1.1, r2); cyl(0.35 * s, 5 * s); }
    else if (r < 0.035) stone(s * 0.9, '#8f8c88');
    else if (r < 0.16) flowers(mb, x, y, z, r2);
    else if (r < 0.17) sunflower(mb, x, y, z, s, rot);
    else if (r < 0.32) tuft(mb, x, y, z, r2 < 0.5 ? '#5aa84a' : '#78b84e', s);
  } else if (b === 1) { // beach
    if (r < 0.03) { palm(mb, x, y, z, s, rot); cyl(0.3, 6 * s); }
    else if (r < 0.045) stone(s * 0.6, '#b8b0a0');
    else if (r < 0.06) seashell(mb, x, y, z, r2);
    else if (r < 0.07) tuft(mb, x, y, z, '#a8b85a', 0.8);
  } else if (b === 4) { // desert
    if (r < 0.028) { cactus(mb, x, y, z, s, rot, r2); cyl(0.4, 3.2 * s); }
    else if (r < 0.042) stone(s * 1.2, '#c9965a');
    else if (r < 0.056) deadBush(mb, x, y, z, s);
    else if (r < 0.06) bones(mb, x, y, z, rot);
  } else if (b === 5) { // snow
    if (r < 0.06) { pine(mb, x, y, z, s * 1.1, true, r2); cyl(0.35 * s, 7 * s); }
    else if (r < 0.072) { iceSpike(mb, x, y, z, s); cyl(0.6 * s, 4 * s); }
    else if (r < 0.085) stone(s, '#a9b4c4');
    else if (r < 0.1) snowBush(mb, x, y, z, s);
  } else if (b === 6) { // mountains
    if (r < 0.05) stone(s * 1.4, '#7d7b82');
    else if (r < 0.08 && y < 80) { pine(mb, x, y, z, s, y > 60, r2); cyl(0.3 * s, 6 * s); }
    else if (r < 0.085) crystals(mb, x, y, z, s, '#7fe0ff');
    else if (r < 0.1) tuft(mb, x, y, z, '#8a9a6a', 0.8);
  } else if (b === 7) { // swamp
    if (r < 0.05) { deadTree(mb, x, y, z, s, rot); cyl(0.35 * s, 5 * s); }
    else if (r < 0.065) { willow(mb, x, y, z, s, r2); cyl(0.4 * s, 6 * s); }
    else if (r < 0.2) reeds(mb, x, y, z, r2);
    else if (r < 0.25) lily(mb, x, z, r2);
    else if (r < 0.27) shrooms(mb, x, y, z, r2);
  } else if (b === 8) { // glow fields
    if (r < 0.05) { giantShroom(mb, x, y, z, s, r2); cyl(0.5 * s, 5 * s); }
    else if (r < 0.08) crystals(mb, x, y, z, s, r2 > 0.5 ? '#ff8ff0' : '#8ff6ff');
    else if (r < 0.2) glowGrass(mb, x, y, z, r2);
    else if (r < 0.22) glowFlower(mb, x, y, z, r2);
  } else if (b === 0 && y > -14) { // under the sea, close to the beach
    if (r < 0.05) coral(mb, x, y, z, s, r2);
    else if (r < 0.1) seaweed(mb, x, y, z, r2);
  }
}
const hue = (c, r2, k = 0.12) => shadeC(hex(c), 1 - k / 2 + r2 * k);
const foliage = (c, r2) => (a, b) => { const base = hue(c, r2); return b > 0.35 ? mixC(base, [1, 1, 0.85, 1], 0.14) : b < -0.3 ? shadeC(base, 0.72) : base; };
const wobble = seed => (x, y, z) => 0.12 * Math.sin(x * 5 + seed * 7) * Math.cos(z * 4 + seed * 3) + 0.06 * Math.sin(y * 7 + seed);
function pine(mb, x, y, z, s, snowy, r2 = 0.5) {
  // a fir: slim trunk, then star-shaped tiers of drooping branches that get smaller towards the top
  const R = k => { const v = Math.sin((r2 * 97 + k) * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const bark = hex('#5e4028'); mb.push([x, y - 0.5, z]); mb.lathe([[0.36 * s, 0], [0.27 * s, 0.6 * s], [0.2 * s, 3.4 * s], [0.08 * s, 6.6 * s], [0, 6.8 * s]], mb.lod ? 5 : 7, (t, ph) => shadeC(bark, 0.85 + 0.15 * Math.cos(ph * 4 + t * 9)), 0); mb.pop();
  const g = hue(snowy ? '#2c6448' : '#2a7040', r2, 0.18), tipC = mixC(g, [0.62, 0.86, 0.45, 1], 0.32), dark = shadeC(g, 0.62), snow = hex('#f2f7fc');
  const tiers = mb.lod ? 3 : 6, N = mb.lod ? 6 : 10;
  for (let k = 0; k < tiers; k++) {
    const f = k / (tiers - 1), yy = y + (1.1 + f * 4.6) * s, rr = (2.55 - f * 1.75) * s * (0.92 + R(k) * 0.16), h = (1.75 - f * 0.55) * s * (mb.lod ? 1.5 : 1), droop = 0.42 * s;
    const sp = R(k + 10) * 6.283, apex = [x, yy + h, z], under = [x, yy + 0.18 * s, z], rim = [], mid = [];
    for (let i = 0; i < N; i++) {
      const a = sp + i / N * 6.283, out = i % 2 ? 0.7 : 1, r = rr * out, dy = -droop * out + (R(k * 13 + i) - 0.5) * 0.12 * s;
      rim.push([x + Math.cos(a) * r, yy + dy, z + Math.sin(a) * r]);
      mid.push([x + Math.cos(a) * r * 0.5, yy + h * 0.45 + dy * 0.4, z + Math.sin(a) * r * 0.5]);
    }
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, sh = 0.88 + ((i + k) % 3) * 0.07;
      mb.tri(apex, mid[j], mid[i], snowy ? snow : shadeC(mixC(g, tipC, 0.35), sh));
      mb.quad(mid[i], mid[j], rim[j], rim[i], snowy && i % 2 === 0 ? mixC(snow, g, 0.35) : shadeC(i % 2 ? g : tipC, sh));
      mb.tri(under, rim[i], rim[j], dark);
    }
  }
}
function trunk(mb, x, y, z, s, h, col, lean = 0) {
  mb.push([x, y - 0.6, z], M4.rotZ(lean)); mb.lathe([[0.62 * s, 0], [0.42 * s, 0.35 * s], [0.31 * s, h * 0.55], [0.24 * s, h], [0, h + 0.05]], mb.lod ? 5 : 9, (t, ph) => shadeC(hex(col), 0.84 + 0.16 * Math.cos(ph * 5 + t * 4)), 0.2); mb.pop();
}
// a leafy clump: a faceted ball with a couple of smaller bumps, lighter on top, darker underneath
function clump(mb, cx, cy, cz, r, base, seed) {
  const top = mixC(base, [1, 1, 0.78, 1], 0.24), low = shadeC(base, 0.66);
  const col = (a, b) => b > 0.15 ? mixC(base, top, (b - 0.15) * 1.2) : mixC(low, base, (b + 1) / 1.15);
  const wob = (a, b, c) => 0.09 * Math.sin(a * 6 + seed * 9) * Math.cos(c * 5 + seed * 5) + 0.05 * Math.sin(b * 8 + seed);
  mb.ico(cx, cy, cz, [r * 1.06, r * 0.86, r * 1.06], mb.lod ? 0 : 1, col, false, null, wob);
  if (!mb.lod) for (let q = 0; q < 2; q++) { const a = seed * 7 + q * 2.4, d = r * 0.72; mb.ico(cx + Math.cos(a) * d, cy + r * (0.15 + q * 0.2), cz + Math.sin(a) * d, r * 0.5, 0, (u, v) => col(u, v * 0.5 + 0.25)); }
}
// a branch from a to b (a slightly bent tube)
function branch(mb, a, b, r0, r1, col) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.25, (a[2] + b[2]) / 2]; MB.tube(mb, [a, m, b], t => r0 + (r1 - r0) * t, 5, col); }
// keep the old name: round fluffy treetop (used by bushes and the swamp willow)
function puffs(mb, x, y, z, s, c, r2, list) {
  const base = hue(c, r2);
  for (const [dx, dy, dz, r] of mb.lod ? list.slice(0, 3) : list.slice(0, 5)) clump(mb, x + dx * s, y + dy * s, z + dz * s, r * s, base, r2 + dx);
}
// a broad leafy tree: trunk with roots, a few main branches, and leaf clumps at their ends
function leafyTree(mb, x, y, z, s, c, r2, o = {}) {
  const R = k => { const v = Math.sin((r2 * 61 + k) * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const bark = o.bark || '#6e4a2c', H = (o.h || 3.4) * s, base = hue(c, r2, 0.14);
  trunk(mb, x, y, z, s * (o.thick || 1), H, bark, (r2 - 0.5) * 0.12);
  if (!mb.lod) for (let k = 0; k < 4; k++) { const a = k * 1.57 + r2 * 4; mb.push([x + Math.cos(a) * 0.35 * s, y - 0.35, z + Math.sin(a) * 0.35 * s], M4.mul3(M4.rotY(-a), M4.rotZ(-1.1))); mb.lathe([[0.2 * s, 0], [0.12 * s, 0.5 * s], [0, 0.75 * s]], 5, hex(bark), 0); mb.pop(); }
  const nb = mb.lod ? 3 : (o.branches || 4), tips = [];
  for (let k = 0; k < nb; k++) {
    const a = k / nb * 6.283 + r2 * 5 + R(k) * 0.6, out = (o.spread || 1.7) * (0.8 + R(k + 3) * 0.45), up = H / s + 0.6 + R(k + 6) * 1.3;
    const from = [x, y + H * 0.62, z], to = [x + Math.cos(a) * out * s, y + up * s, z + Math.sin(a) * out * s];
    if (!mb.lod) branch(mb, from, to, 0.2 * s, 0.09 * s, hex(bark));
    tips.push([to[0], to[1] + 0.35 * s, to[2], (o.leaf || 1.35) * s * (0.85 + R(k + 9) * 0.3)]);
  }
  tips.push([x + (R(20) - 0.5) * s, y + (H / s + 2.1) * s, z + (R(21) - 0.5) * s, (o.leaf || 1.35) * 1.15 * s]);
  if (!mb.lod) tips.push([x + (R(22) - 0.5) * 1.6 * s, y + (H / s + 1.2) * s, z + (R(23) - 0.5) * 1.6 * s, (o.leaf || 1.35) * s]);
  tips.forEach(([cx, cy, cz, r], i) => clump(mb, cx, cy, cz, r, shadeC(base, 0.92 + R(i + 30) * 0.16), r2 + i));
  if (o.fruit && !mb.lod) for (let k = 0; k < 6; k++) { const t = tips[k % tips.length], a = k * 2.3; mb.sph([t[0] + Math.cos(a) * t[3] * 0.85, t[1] - t[3] * 0.3, t[2] + Math.sin(a) * t[3] * 0.85], 0.13 * s, 6, hex(o.fruit), 0.1); }
}
function roundTree(mb, x, y, z, s, c, r2 = 0.5) { leafyTree(mb, x, y, z, s, c, r2, { fruit: r2 > 0.82 && c === '#4fae4a' ? '#e0443c' : null }); }
function birch(mb, x, y, z, s, r2) {
  // a tall slim white tree with dark bark marks and a light, airy top
  const H = 5.4 * s; mb.push([x, y - 0.5, z]); mb.lathe([[0.3 * s, 0], [0.22 * s, 0.4 * s], [0.17 * s, H * 0.6], [0.1 * s, H], [0, H + 0.05]], mb.lod ? 5 : 8, hex('#efebe2'), 0); mb.pop();
  if (!mb.lod) for (let k = 0; k < 9; k++) { const a = k * 2.4 + r2 * 3, yy = y + (0.4 + k * 0.52) * s, rr = (0.205 - k * 0.011) * s; mb.at([x, yy, z], M4.rotY(-a)); mb.box(rr - 0.02, 0, -0.09 * s, rr + 0.025, 0.07 * s + (k % 3) * 0.03, 0.09 * s, hex('#2e2e30'), false, true); mb.reset(); }
  const g = hue(r2 < 0.5 ? '#9ccf4a' : '#c9d84a', r2, 0.1), tips = [];
  for (let k = 0; k < (mb.lod ? 3 : 5); k++) { const a = k * 1.3 + r2 * 6, out = 0.8 + (k % 2) * 0.5, up = 3.4 + k * 0.55; const to = [x + Math.cos(a) * out * s, y + up * s, z + Math.sin(a) * out * s]; if (!mb.lod) branch(mb, [x, y + (up - 1.4) * s, z], to, 0.08 * s, 0.04 * s, hex('#d8d2c6')); tips.push(to); }
  tips.forEach((t, i) => clump(mb, t[0], t[1] + 0.3 * s, t[2], (0.85 + (i % 2) * 0.2) * s, shadeC(g, 0.94 + (i % 3) * 0.05), r2 + i));
  clump(mb, x, y + 6.1 * s, z, 0.9 * s, g, r2 + 9);
}
function blossom(mb, x, y, z, s, r2) {
  leafyTree(mb, x, y, z, s * 0.95, r2 < 0.5 ? '#ffb3d1' : '#ffc8e0', r2, { bark: '#5e3a34', h: 2.6, spread: 2.0, leaf: 1.2, branches: 5 });
  if (!mb.lod) { mb.up = true; for (let k = 0; k < 14; k++) { const a = k * 2.39 + r2 * 9, d = (1 + (k % 5) * 0.55) * s, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, c = hex(k % 2 ? '#ffc0d8' : '#ffd8e8'); mb.tri([px, y + 0.04, pz], [px + 0.14, y + 0.04, pz + 0.05], [px + 0.04, y + 0.04, pz + 0.15], c, true); } mb.up = false; }
}
function willow(mb, x, y, z, s, r2) {
  // a weeping willow: a wide crown with long strands of leaves hanging down to the ground
  leafyTree(mb, x, y, z, s, '#6a9a3a', r2, { bark: '#4e4030', h: 3.2, spread: 2.1, leaf: 1.4, branches: 5, thick: 1.15 });
  const g = hue('#7aaa44', r2), n = mb.lod ? 10 : 26; mb.up = true;
  for (let k = 0; k < n; k++) {
    const a = k / n * 6.283 + r2 * 3, R = (1.6 + (k % 3) * 0.55) * s, top = y + (5.0 - (k % 3) * 0.4) * s, bot = y + (0.6 + (k % 4) * 0.45) * s, w = 0.32 * s;
    const ca = Math.cos(a), sa = Math.sin(a), px = x + ca * R, pz = z + sa * R, tx = -sa * w, tz = ca * w, c = shadeC(g, 0.82 + (k % 4) * 0.07);
    const p0 = [px - tx, top, pz - tz], p1 = [px + tx, top, pz + tz], q0 = [px - tx * 0.4 + ca * 0.3 * s, bot, pz - tz * 0.4 + sa * 0.3 * s], q1 = [px + tx * 0.4 + ca * 0.3 * s, bot, pz + tz * 0.4 + sa * 0.3 * s];
    mb.quad(p0, p1, q1, q0, c, true); mb.quad(p1, p0, q0, q1, shadeC(c, 0.85), true);
  }
  mb.up = false;
}
function bush(mb, x, y, z, s, c, r2 = 0.5) {
  const base = hue(c, r2, 0.14);
  const L = [[0, 0.5, 0, 0.72], [0.62, 0.36, 0.22, 0.52], [-0.58, 0.38, -0.2, 0.55], [0.1, 0.92, 0.05, 0.48], [-0.15, 0.4, 0.6, 0.45]];
  for (const [dx, dy, dz, r] of mb.lod ? L.slice(0, 2) : L) clump(mb, x + dx * s, y + dy * s, z + dz * s, r * s, shadeC(base, 0.92 + dy * 0.12), r2 + dx);
  if (r2 > 0.6 && !mb.lod) for (let k = 0; k < 7; k++) mb.sph([x + Math.cos(k * 1.7) * 0.66 * s, y + (0.45 + (k % 3) * 0.22) * s, z + Math.sin(k * 1.7) * 0.66 * s], 0.075 * s, 5, hex(r2 > 0.8 ? '#5a6ae0' : '#e0404a'), 0);
}
function rock(mb, x, y, z, s, c, r2 = 0.5) {
  // a boulder with flat broken faces, a smaller rock leaning on it, pebbles, and moss on top in green places
  const moss = c !== '#c9965a' && c !== '#b8b0a0' && r2 > 0.55, base = hue(c, r2), mc = [0.42, 0.62, 0.32, 1];
  const col = (a, b) => b > 0.55 && moss ? mixC(base, mc, 0.65) : shadeC(base, 0.78 + b * 0.2 + a * 0.06);
  const wob = (a, b, c2) => 0.16 * Math.sin(a * 3 + r2 * 9) * Math.cos(c2 * 4 + r2 * 5) + 0.08 * Math.sin(b * 6 + r2 * 3);
  mb.ico(x, y + 0.05 * s, z, [s * (0.95 + r2 * 0.3), s * 0.78, s * (0.85 + (1 - r2) * 0.3)], 1, col, false, null, wob);
  if (!mb.lod && s > 0.7) {
    const a = r2 * 11, d = s * 0.95; mb.ico(x + Math.cos(a) * d, y + 0.0, z + Math.sin(a) * d, [s * 0.45, s * 0.38, s * 0.42], 0, col, false, null, wob);
    for (let k = 0; k < 4; k++) { const b = a + 1.2 + k * 1.1, e = s * (1.15 + (k % 2) * 0.3); mb.ico(x + Math.cos(b) * e, y - 0.05, z + Math.sin(b) * e, 0.12 + (k % 3) * 0.05, 0, () => shadeC(base, 0.85 + k * 0.05)); }
  }
}
function flowers(mb, x, y, z, r) {
  // a clump of one kind of flower: daisies, tulips, bluebells or poppies, with curvy stems and leaves
  const kind = Math.floor(r * 40) % 4, n = mb.lod ? 2 : 3, stem = hex('#3f8a3a'), leaf = hex('#4f9a44');
  const pal = [['#ffffff', '#fff2f6'], ['#ff5a6a', '#ffd23a', '#ff8fb1', '#b28dff'], ['#6f8cff', '#9a7aff'], ['#ff4a32', '#ff8a2a']][kind];
  for (let k = 0; k < n; k++) {
    const a = r * 20 + k * 1.7, d = 0.15 + (k % 2) * 0.32, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, h = 0.38 + ((k * 7 + Math.floor(r * 13)) % 4) * 0.07, c = hex(pal[(k + Math.floor(r * 9)) % pal.length]);
    const lean = [Math.cos(a + 1) * 0.06, 0, Math.sin(a + 1) * 0.06], top = [px + lean[0], y + h, pz + lean[2]];
    if (mb.lod) { mb.cyl(px, y - 0.1, pz, 0.025, 0.02, h + 0.1, 3, stem, false); mb.ico(top[0], top[1], top[2], 0.1, 0, () => c); continue; }
    mb.up = true; for (const [o0, o1] of [[0, 0.5], [0.5, 1]]) { const A = [px + lean[0] * o0 * o0, y - 0.05 + (h + 0.05) * o0, pz + lean[2] * o0 * o0], B = [px + lean[0] * o1 * o1, y - 0.05 + (h + 0.05) * o1, pz + lean[2] * o1 * o1], w = 0.018; mb.tri2([A[0] - w, A[1], A[2]], [A[0] + w, A[1], A[2]], [B[0], B[1], B[2]], stem); mb.tri2([A[0], A[1], A[2] - w], [A[0], A[1], A[2] + w], [B[0], B[1], B[2]], stem); } mb.up = false;
    mb.up = true; const la = a + 2; mb.tri([px, y + 0.06, pz], [px + Math.cos(la) * 0.2, y + 0.16, pz + Math.sin(la) * 0.2], [px + Math.cos(la + 0.4) * 0.12, y + 0.2, pz + Math.sin(la + 0.4) * 0.12], leaf, true); mb.tri([px, y + 0.06, pz], [px + Math.cos(la + 0.4) * 0.12, y + 0.2, pz + Math.sin(la + 0.4) * 0.12], [px + Math.cos(la) * 0.2, y + 0.16, pz + Math.sin(la) * 0.2], shadeC(leaf, 0.8), true); mb.up = false;
    const [tx, ty, tz] = top;
    if (kind === 0) { // daisy: a ring of thin white petals around a yellow middle
      mb.up = true; for (let q = 0; q < 8; q++) { const b = q / 8 * 6.283 + a; mb.tri([tx, ty, tz], [tx + Math.cos(b - 0.15) * 0.15, ty + 0.03, tz + Math.sin(b - 0.15) * 0.15], [tx + Math.cos(b + 0.15) * 0.15, ty + 0.03, tz + Math.sin(b + 0.15) * 0.15], c, true); mb.tri([tx, ty - 0.005, tz], [tx + Math.cos(b + 0.15) * 0.15, ty + 0.025, tz + Math.sin(b + 0.15) * 0.15], [tx + Math.cos(b - 0.15) * 0.15, ty + 0.025, tz + Math.sin(b - 0.15) * 0.15], shadeC(c, 0.85), true); } mb.up = false;
      mb.sph([tx, ty + 0.03, tz], [0.05, 0.03, 0.05], 5, hex('#ffc42a'), 0);
    } else if (kind === 1) { // tulip: a closed cup of petals
      mb.push([tx, ty - 0.02, tz]); mb.lathe([[0.02, 0], [0.07, 0.04], [0.085, 0.11], [0.07, 0.17], [0.0, 0.15]], 6, (t, ph) => shadeC(c, Math.cos(ph * 3) > 0.6 ? 1.1 : 0.92), 0.25); mb.pop();
    } else if (kind === 2) { // bluebells: little bells hanging down one side
      mb.tri2(top, [tx + Math.cos(a) * 0.12, ty + 0.03, tz + Math.sin(a) * 0.12], [tx + Math.cos(a) * 0.12, ty + 0.01, tz + Math.sin(a) * 0.12], stem);
      for (let q = 0; q < 3; q++) { const bx = tx + Math.cos(a) * (0.03 + q * 0.045), bz = tz + Math.sin(a) * (0.03 + q * 0.045), by = ty - 0.05 - q * 0.02; mb.push([bx, by, bz]); mb.lathe([[0.045, 0], [0.04, 0.01], [0.032, 0.05], [0.0, 0.065]], 6, c, 0.2); mb.pop(); }
    } else { // poppy: four round floppy petals and a dark middle
      for (let q = 0; q < 4; q++) { const b = q / 4 * 6.283 + a; mb.sph([tx + Math.cos(b) * 0.07, ty + 0.03, tz + Math.sin(b) * 0.07], [0.08, 0.025, 0.08], 5, c, 0.1); }
      mb.sph([tx, ty + 0.06, tz], [0.035, 0.03, 0.035], 5, hex('#2a1e2a'), 0);
    }
  }
}
function sunflower(mb, x, y, z, s, rot) {
  const st = hex('#4f8a3a'), lf = hex('#5a9a40'), hy = y + 1.6 * s, hx = x + Math.cos(rot) * 0.12, hz = z + Math.sin(rot) * 0.12;
  mb.caps([x, y - 0.1, z], [x, y + 0.9 * s, z], 0.055, 0.045, 5, st); mb.caps([x, y + 0.9 * s, z], [hx - Math.cos(rot) * 0.05, hy - 0.05, hz - Math.sin(rot) * 0.05], 0.045, 0.04, 5, st);
  if (!mb.lod) for (const [h, a] of [[0.5, rot + 1.6], [0.95, rot - 1.5]]) { const lx = x + Math.cos(a) * 0.45, lz = z + Math.sin(a) * 0.45; mb.sph([x + Math.cos(a) * 0.25, y + h * s + 0.05, z + Math.sin(a) * 0.25], [0.24, 0.03, 0.14], 5, lf, 0.1); mb.caps([x, y + h * s, z], [lx * 0.5 + x * 0.5, y + h * s + 0.06, lz * 0.5 + z * 0.5], 0.015, 0.012, 3, st); }
  // the head faces sideways: green back, two rings of petals, a brown seed middle
  mb.push([hx, hy, hz], M4.rotY(-rot));
  mb.sph([-0.03, 0, 0], [0.05, 0.2, 0.2], 7, hex('#5a8a3a'), 0);
  const P = mb.lod ? 10 : 16; for (let ring = 0; ring < (mb.lod ? 1 : 2); ring++) for (let q = 0; q < P; q++) { const b = (q + ring * 0.5) / P * 6.283, L = ring ? 0.36 : 0.42, c = hex(ring ? '#ffb81a' : '#ffd42a'), w = 0.11;
    mb.tri([0.01 + ring * 0.01, Math.cos(b) * 0.15, Math.sin(b) * 0.15], [0.03 + ring * 0.01, Math.cos(b - w) * L * 0.75, Math.sin(b - w) * L * 0.75], [0.05 + ring * 0.01, Math.cos(b) * L, Math.sin(b) * L], c, true); mb.tri([0.01 + ring * 0.01, Math.cos(b) * 0.15, Math.sin(b) * 0.15], [0.05 + ring * 0.01, Math.cos(b) * L, Math.sin(b) * L], [0.03 + ring * 0.01, Math.cos(b + w) * L * 0.75, Math.sin(b + w) * L * 0.75], shadeC(c, 0.92), true); }
  mb.sph([0.04, 0, 0], [0.05, 0.17, 0.17], 8, (nx, ny, nz) => Math.sin(Math.atan2(nz, ny) * 8 + Math.hypot(ny, nz) * 20) > 0 ? hex('#5a3418') : hex('#3e2410'), 0);
  mb.pop();
}
function tuft(mb, x, y, z, c, s = 1) { mb.up = true; const g = hex(c), g2 = mixC(g, [0.9, 1, 0.6, 1], 0.25); for (let k = 0; k < 5; k++) { const a = k * 1.26 + x, h = (0.5 + (k % 3) * 0.15) * s, lean = 0.12; const p0 = [x + Math.cos(a) * 0.22, y - 0.05, z + Math.sin(a) * 0.22], p1 = [x + Math.cos(a + 0.5) * 0.22, y - 0.05, z + Math.sin(a + 0.5) * 0.22], tp = [x + Math.cos(a + 0.25) * (0.22 + lean), y + h, z + Math.sin(a + 0.25) * (0.22 + lean)]; mb.tri(p0, p1, tp, k % 2 ? g : g2, true); mb.tri(p1, p0, tp, shadeC(g, 0.85), true); }  mb.up = false; }
function fern(mb, x, y, z, s, rot) { mb.up = true; const g = hex('#3f9a4e'); for (let k = 0; k < 6; k++) { const a = rot + k / 6 * 6.283, L = 1.1 * s; const tip = [x + Math.cos(a) * L, y + 0.25 * s, z + Math.sin(a) * L], m = [x + Math.cos(a) * L * 0.5, y + 0.55 * s, z + Math.sin(a) * L * 0.5]; const w = 0.18 * s, nx = -Math.sin(a) * w, nz = Math.cos(a) * w; mb.tri([x, y, z], [m[0] + nx, m[1], m[2] + nz], tip, g, true); mb.tri([x, y, z], tip, [m[0] - nx, m[1], m[2] - nz], shadeC(g, 0.9), true); mb.tri([x, y, z], tip, [m[0] + nx, m[1], m[2] + nz], shadeC(g, 0.75), true); mb.tri([x, y, z], [m[0] - nx, m[1], m[2] - nz], tip, shadeC(g, 0.7), true); }  mb.up = false; }
function shrooms(mb, x, y, z, r) {
  // fly agarics (red with white spots), brown boletes, or a cluster of tiny bonnets
  const kind = r < 0.4 ? 0 : r < 0.75 ? 1 : 2, n = kind === 2 ? 6 : 3;
  for (let k = 0; k < n; k++) {
    const a = r * 9 + k * (kind === 2 ? 1.05 : 2.2), d = kind === 2 ? 0.12 + (k % 3) * 0.08 : 0.35, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    const h = kind === 2 ? 0.12 + (k % 3) * 0.05 : 0.22 + (k % 2) * 0.16, R = kind === 2 ? 0.06 : kind === 1 ? 0.2 : 0.22 - (k % 2) * 0.04;
    const stemC = hex(kind === 1 ? '#e8dcc0' : '#f6efe2'), capC = hex(kind === 0 ? '#e23a30' : kind === 1 ? '#8a5a32' : '#d8b48a');
    if (mb.lod) { mb.cyl(px, y - 0.05, pz, R * 0.3, R * 0.25, h, 4, stemC, false); mb.cyl(px, y + h - 0.02, pz, R, 0, R * 0.8, 5, capC); continue; }
    mb.push([px, y - 0.05, pz]);
    mb.lathe([[R * 0.32, 0], [R * (kind === 1 ? 0.45 : 0.28), h * 0.35], [R * 0.24, h]], 6, stemC, 0.1);
    if (kind === 0) mb.lathe([[R * 0.24, h * 0.7], [R * 0.4, h * 0.66], [R * 0.36, h * 0.74]], 6, hex('#ffffff'), 0);
    mb.lathe([[R * 0.2, h - 0.01], [R, h + R * 0.05]], 8, hex(kind === 0 ? '#f4ead8' : '#c8b490'), 0); // gills
    mb.lathe([[R, h + R * 0.05], [R * 0.95, h + R * 0.3], [R * 0.7, h + R * 0.6], [R * 0.3, h + R * (kind === 2 ? 0.95 : 0.78)], [0, h + R * (kind === 2 ? 1.0 : 0.82)]], 8, (t) => shadeC(capC, 0.9 + t * 0.2), 0.15);
    if (kind === 0) for (let q = 0; q < 6; q++) { const b = q * 1.7 + k, rr = R * (0.35 + (q % 3) * 0.2), yy = h + R * (0.8 - (rr / R) * (rr / R) * 0.6); mb.sph([Math.cos(b) * rr, yy, Math.sin(b) * rr], [R * 0.11, R * 0.06, R * 0.11], 4, hex('#ffffff'), 0); }
    mb.pop();
  }
}
function log(mb, x, y, z, s, rot) { mb.at([x, y + 0.3 * s, z], M4.rotY(rot)); mb.at([x, y + 0.3 * s, z], M4.mul3(M4.rotY(rot), M4.rotZ(Math.PI / 2))); mb.cyl(0, -1.4 * s, 0, 0.35 * s, 0.33 * s, 2.8 * s, 7, hex('#7a5232')); mb.cyl(0, -1.42 * s, 0, 0.3 * s, 0.3 * s, 0.02, 7, hex('#c8a070')); mb.reset(); mb.ico(x + 0.3, y + 0.62 * s, z, 0.25, 0, () => hex('#4f9a4e')); }
function palm(mb, x, y, z, s, rot) {
  // a leaning ringed trunk, a crown of long arching fronds made of leaflets, and coconuts
  const dx = Math.cos(rot) * 1.1 * s, dz = Math.sin(rot) * 1.1 * s, H = 6.4 * s, pts = [];
  for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([x + dx * t * t, y - 0.3 + H * t, z + dz * t * t]); }
  MB.tube(mb, pts, t => (0.32 - t * 0.11) * s, mb.lod ? 5 : 8, hex('#9a7a4a'));
  if (!mb.lod) for (let k = 1; k < 12; k++) { const t = k / 12, i = Math.min(5, Math.floor(t * 6)), f = t * 6 - i, p = pts[i].map((v, q) => v + (pts[i + 1][q] - v) * f); mb.tor(p, (0.33 - t * 0.11) * s, 0.045 * s, 9, 3, hex(k % 2 ? '#7a5a32' : '#8a6a3c')); }
  const [px, py, pz] = pts[6], g = hex('#3f9a4e'), g2 = hex('#5ab85a'), gd = hex('#2f7a3e');
  mb.up = true;
  const nf = mb.lod ? 6 : 11;
  for (let k = 0; k < nf; k++) {
    const a = k / nf * 6.283 + rot * 2, L = (2.9 + (k % 3) * 0.35) * s, lift = k % 2 ? 0.2 : 0.55, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, nz = ca;
    const P = t => [px + ca * L * t, py + (lift + 0.9 * Math.sin(t * 2.2) - 2.1 * t * t) * s, pz + sa * L * t];
    const nseg = mb.lod ? 3 : 7; let prev = P(0);
    for (let q = 1; q <= nseg; q++) {
      const t = q / nseg, cur = P(t), w = (1.05 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.12) * s, down = 0.45 * s;
      for (const sd of [-1, 1]) {
        const leaf = [cur[0] + nx * w * sd, cur[1] - down, cur[2] + nz * w * sd], col = q % 2 ? g : g2;
        mb.tri(prev, cur, leaf, col, true); mb.tri(prev, leaf, cur, shadeC(col, 0.78), true);
      }
      mb.tri(prev, [cur[0], cur[1] + 0.04, cur[2]], [prev[0], prev[1] + 0.04, prev[2]], gd, true);
      prev = cur;
    }
  }
  mb.up = false;
  for (let k = 0; k < 4; k++) mb.sph([px + Math.cos(k * 1.6) * 0.28 * s, py - 0.32 * s, pz + Math.sin(k * 1.6) * 0.28 * s], 0.2 * s, 7, hex(k % 2 ? '#6a4a22' : '#7a5a2a'), 0.2);
}
function cactus(mb, x, y, z, s, rot, r2 = 0.5) {
  const g = smoothC(hex('#4f9a4a')), ribs = (t, ph) => smoothC(shadeC(g, 0.84 + 0.16 * Math.cos(ph * 8))), spine = hex('#f4eccc'), ax = Math.cos(rot), az = Math.sin(rot);
  const dots = (cx, cy, cz, rad, hgt, n) => { if (mb.lod) return; for (let k = 0; k < n; k++) { const a = k * 2.39996, yy = cy + (k / n) * hgt; mb.sph([cx + Math.cos(a) * rad * 1.02, yy, cz + Math.sin(a) * rad * 1.02], 0.025, 3, spine, 0); } };
  if (r2 < 0.22) { // a round barrel cactus with a crown of flowers
    mb.push([x, y - 0.15, z]); mb.lathe([[0.55 * s, 0], [0.68 * s, 0.4 * s], [0.62 * s, 0.85 * s], [0.35 * s, 1.1 * s], [0, 1.15 * s]], 12, ribs, 0.1); mb.pop();
    dots(x, y + 0.05, z, 0.66 * s, 0.8 * s, 18);
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; mb.sph([x + Math.cos(a) * 0.22 * s, y + 0.98 * s, z + Math.sin(a) * 0.22 * s], [0.09, 0.06, 0.09], 5, hex(r2 < 0.11 ? '#ff6fae' : '#ffb03a'), 0); }
    return;
  }
  if (r2 < 0.4) { // prickly pear: flat round paddles stacked on each other, with red fruit on top
    const pad = (px, py, pz, a, sc) => { mb.push([px, py, pz], M4.mul3(M4.rotY(a), M4.rotZ(0.15))); mb.sph([0, 0.45 * sc, 0], [0.45 * sc, 0.55 * sc, 0.12 * sc], 8, (nx, ny, nz) => shadeC(hex('#5aa04a'), 0.9 + nx * 0.1), 0.15); if (!mb.lod) for (let k = 0; k < 6; k++) mb.sph([Math.cos(k * 2.4) * 0.25 * sc, 0.45 * sc + Math.sin(k * 2.4) * 0.3 * sc, 0.12 * sc], 0.025, 3, spine, 0); mb.pop(); return [px, py + 0.95 * sc, pz]; };
    const p1 = pad(x, y - 0.1, z, rot, s), p2 = pad(p1[0] + ax * 0.25, p1[1] - 0.15, p1[2] + az * 0.25, rot + 0.8, s * 0.8), p3 = pad(p1[0] - ax * 0.25, p1[1] - 0.2, p1[2] - az * 0.25, rot - 0.6, s * 0.75);
    for (const p of [p2, p3]) mb.sph([p[0], p[1] + 0.05, p[2]], [0.09, 0.12, 0.09], 5, hex('#d83a5a'), 0);
    return;
  }
  // the tall saguaro: ribbed trunk, arms that bend up, a few spines and sometimes flowers
  const arm = (ox, oz, y0, up) => { const r = 0.21 * s, P = [[x + ox * 0.35 * s, y + y0 * s, z + oz * 0.35 * s], [x + ox * 0.75 * s, y + (y0 + 0.08) * s, z + oz * 0.75 * s], [x + ox * 0.95 * s, y + (y0 + 0.35) * s, z + oz * 0.95 * s], [x + ox * 0.98 * s, y + (y0 + up) * s, z + oz * 0.98 * s]];
    MB.tube(mb, P, r, mb.lod ? 5 : 8, g); mb.sph(P[3], r, 6, g, 0); dots(P[3][0], P[2][1], P[3][2], r, (up - 0.35) * s, 6); };
  mb.push([x, y - 0.3, z]); mb.lathe([[0.42 * s, 0], [0.44 * s, 1.5 * s], [0.42 * s, 2.9 * s], [0.3 * s, 3.3 * s], [0, 3.42 * s]], 12, ribs, 0.1); mb.pop();
  dots(x, y, z, 0.43 * s, 2.9 * s, 26);
  arm(ax, az, 1.2, 1.25); arm(-ax * 0.9 + az * 0.4, -az * 0.9 - ax * 0.4, 0.8, 0.9); if (r2 > 0.8) arm(az, -ax, 1.7, 0.7);
  if (r2 > 0.6) for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; mb.sph([x + Math.cos(a) * 0.14, y + 3.08 * s, z + Math.sin(a) * 0.14], [0.1, 0.06, 0.1], 5, hex(r2 > 0.75 ? '#ff6fae' : '#ffe0f0'), 0); mb.sph([x + Math.cos(a) * 0.14, y + 3.12 * s, z + Math.sin(a) * 0.14], 0.03, 3, hex('#ffd24a'), 0); }
}
function deadBush(mb, x, y, z, s) { mb.up = true; const c = hex('#8a6a42'); for (let k = 0; k < 5; k++) { const a = k * 1.3; mb.cyl(x, y - 0.1, z, 0.05, 0.02, 0.9 * s, 3, c, false, a); mb.at([x, y, z], M4.mul3(M4.rotY(a), M4.rotZ(0.6))); mb.cyl(0, 0, 0, 0.04, 0.01, 0.8 * s, 3, c, false); mb.reset(); }  mb.up = false; }
function bones(mb, x, y, z, rot) { const c = hex('#f2ead8'); mb.at([x, y + 0.15, z], M4.mul3(M4.rotY(rot), M4.rotZ(Math.PI / 2))); for (let k = 0; k < 5; k++) mb.cyl(0, -1 + k * 0.45, 0, 0.08, 0.06, 0.2, 5, c); mb.cyl(0, -1.2, 0, 0.05, 0.05, 2.4, 5, c); mb.reset(); mb.ico(x + Math.cos(rot) * 1.4, y + 0.25, z + Math.sin(rot) * 1.4, 0.32, 1, () => c); }
function seashell(mb, x, y, z, r) { mb.up = true; const c = hex(r > 0.5 ? '#ffb3a7' : '#f4e0c8'); for (let k = 0; k < 6; k++) { const a0 = -1 + k * 0.33, a1 = a0 + 0.33; mb.tri([x, y + 0.02, z], [x + Math.sin(a1) * 0.3, y + 0.1, z + Math.cos(a1) * 0.3], [x + Math.sin(a0) * 0.3, y + 0.1, z + Math.cos(a0) * 0.3], shadeC(c, k % 2 ? 1 : 0.85), true); }  mb.up = false; }
function iceSpike(mb, x, y, z, s) { mb.cyl(x, y - 0.5, z, 0.8 * s, 0, 5 * s, 6, glowC(hex('#bfe6ff'))); mb.cyl(x + 0.7 * s, y - 0.5, z + 0.3, 0.4 * s, 0, 2.5 * s, 5, hex('#d8f0ff')); mb.cyl(x - 0.5 * s, y - 0.5, z - 0.4, 0.35 * s, 0, 2 * s, 5, hex('#e8f6ff')); }
function snowBush(mb, x, y, z, s) { puffs(mb, x, y, z, s, '#3f6a4a', 0.5, [[0, 0.4, 0, 0.75], [0.5, 0.3, 0.2, 0.5]]); mb.sph([x, y + 0.85 * s, z], [0.65 * s, 0.25 * s, 0.6 * s], 8, hex('#f4f8fc'), 0.1); }
// a realistic crystal: a six-sided prism with a pointed six-sided tip. Every face catches the light a bit
// differently, the base is milky and the tip is clear and bright, like real quartz or amethyst.
function crystalShard(mb, p, dir, len, w, col, spin = 0) {
  const W = [1, 1, 1, 1], milky = mixC(col, W, 0.5), clear = mixC(col, W, 0.18), tipL = w * 2.1, body = Math.max(w * 0.8, len - tipL);
  const shade = [0.74, 0.9, 1.14, 1.02, 0.82, 1.08];
  mb.push(p, M4.mul3(M4.aim(dir), M4.rotY(spin)));
  const P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
  for (let f = 0; f < 6; f++) {
    const a0 = f / 6 * 6.2832, a1 = (f + 1) / 6 * 6.2832, k = shade[f], r0 = w * 1.06, r1 = w;
    mb.quad(P(a0, r0, -0.2), P(a0, r0, body * 0.4), P(a1, r0, body * 0.4), P(a1, r0, -0.2), smoothC(shadeC(milky, k * 0.92)));
    mb.quad(P(a0, r0, body * 0.4), P(a0, r1, body), P(a1, r1, body), P(a1, r0, body * 0.4), smoothC(shadeC(col, k)));
    mb.tri(P(a0, r1, body), [0, body + tipL, 0], P(a1, r1, body), smoothC(shadeC(clear, k * 1.1)));
    // a bright edge line where two faces meet, like light catching the ridge
    if (f % 2 === 0) mb.quad(P(a0 - 0.035, r1 * 1.01, body * 0.15), P(a0 - 0.035, r1 * 1.01, body * 0.98), P(a0 + 0.035, r1 * 1.01, body * 0.98), P(a0 + 0.035, r1 * 1.01, body * 0.15), smoothC(mixC(clear, W, 0.5)), true);
  }
  mb.pop();
}
// one big crystal with medium and small ones fanning out around it, growing from a lump of rock
function crystalCluster(mb, x, y, z, s, col, seed = 0.5, glow = false) {
  const H = k => { const v = Math.sin((seed * 97 + k) * 12.9898) * 43758.5453; return v - Math.floor(v); };
  mb.ico(x, y - 0.05 * s, z, [0.75 * s, 0.32 * s, 0.7 * s], 1, (a, b) => shadeC(hex('#6e6a72'), 0.8 + b * 0.18), false, null, (a, b, c) => 0.18 * Math.sin(a * 5 + seed * 9) * Math.cos(c * 4));
  const n = mb.lod ? 4 : 10;
  for (let k = 0; k < n; k++) {
    const big = k === 0, med = k > 0 && k < 4, tilt = big ? 0.12 : med ? 0.3 + H(k) * 0.25 : 0.6 + H(k) * 0.35, az = k * 2.39996 + seed * 6, d = big ? 0 : (med ? 0.22 : 0.4 + H(k + 9) * 0.25) * s;
    const dir = [Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az)], len = (big ? 1.9 : med ? 1.0 + H(k + 3) * 0.5 : 0.35 + H(k + 5) * 0.35) * s, w = (big ? 0.22 : med ? 0.14 : 0.07) * s;
    const c = glow && k % 3 === 0 ? glowC(hex(col)) : hex(col);
    crystalShard(mb, [x + Math.cos(az) * d, y + 0.05 * s, z + Math.sin(az) * d], dir, len, w, c, H(k + 7) * 3);
  }
}
function crystals(mb, x, y, z, s, c) { crystalCluster(mb, x, y, z, s * 1.15, c, (x * 0.013 + z * 0.007) % 1); }
function deadTree(mb, x, y, z, s, rot) {
  // a twisted dead swamp tree: gnarled trunk, crooked bare branches, hanging moss
  const c = hex('#5a4a3a'), moss = hex('#7a9a4a');
  MB.tube(mb, [[x, y - 0.6, z], [x + 0.2 * s, y + 1.6 * s, z - 0.1 * s], [x - 0.15 * s, y + 3.4 * s, z + 0.15 * s], [x + 0.1 * s, y + 5 * s, z]], t => (0.42 - t * 0.3) * s, mb.lod ? 4 : 6, c);
  const nb = mb.lod ? 3 : 5;
  for (let k = 0; k < nb; k++) {
    const a = rot + k * 2.3, yy = y + (1.8 + k * 0.7) * s, L = (1.6 - k * 0.15) * s, ca = Math.cos(a), sa = Math.sin(a);
    const p0 = [x, yy, z], p1 = [x + ca * L * 0.55, yy + 0.5 * s, z + sa * L * 0.55], p2 = [x + ca * L, yy + 0.2 * s + (k % 2) * 0.6 * s, z + sa * L];
    MB.tube(mb, [p0, p1, p2], t => (0.13 - t * 0.09) * s, 4, c);
    if (!mb.lod) { MB.tube(mb, [p1, [p1[0] - sa * 0.5 * s, p1[1] + 0.6 * s, p1[2] + ca * 0.5 * s]], 0.04 * s, 3, c);
      mb.up = true; for (let q = 0; q < 2; q++) { const m = q ? p2 : p1, hh = (0.8 + q * 0.5) * s; mb.quad([m[0] - 0.12, m[1], m[2]], [m[0] + 0.12, m[1], m[2]], [m[0] + 0.04, m[1] - hh, m[2]], [m[0] - 0.04, m[1] - hh, m[2]], moss, true); mb.quad([m[0] + 0.12, m[1], m[2]], [m[0] - 0.12, m[1], m[2]], [m[0] - 0.04, m[1] - hh, m[2]], [m[0] + 0.04, m[1] - hh, m[2]], shadeC(moss, 0.8), true); } mb.up = false; }
  }
}
function reeds(mb, x, y, z, r) { const g = hex('#7a8a3a'), b = hex('#6a4a2a'); for (let k = 0; k < 5; k++) { const px = x + Math.cos(k * 1.3 + r * 9) * 0.45, pz = z + Math.sin(k * 1.3 + r * 9) * 0.45, h = 1.3 + (k % 3) * 0.3; mb.cyl(px, y - 0.3, pz, 0.04, 0.025, h, 3, g, false); if (k % 2 === 0) mb.cyl(px, y + h - 0.6, pz, 0.08, 0.07, 0.4, 5, b); } }
function lily(mb, x, z, r = 0.5) { mb.cyl(x, SEA - 0.05, z, 0.65, 0.65, 0.05, 9, hex('#4f9a4a')); if (r > 0.4) { const fx = x + 0.2; for (let q = 0; q < 6; q++) { const b = q / 6 * 6.283; mb.tri([fx, SEA + 0.05, z], [fx + Math.cos(b - 0.4) * 0.2, SEA + 0.22, z + Math.sin(b - 0.4) * 0.2], [fx + Math.cos(b + 0.4) * 0.2, SEA + 0.22, z + Math.sin(b + 0.4) * 0.2], hex('#ffb3d1'), true); } mb.ico(fx, SEA + 0.12, z, 0.06, 0, () => hex('#ffe066')); } }
function giantShroom(mb, x, y, z, s, r) {
  const cap = smoothC(hex(r > 0.5 ? '#c05ae0' : '#5a7ae0')), capHi = smoothC(mixC(cap, [1, 0.9, 1, 1], 0.35));
  mb.push([x, y - 0.4, z]); mb.lathe([[0.55 * s, 0], [0.42 * s, 0.4 * s], [0.34 * s, 2.5 * s], [0.4 * s, 3.9 * s], [0, 4 * s]], 10, (t) => mixC(hex('#efe6f8'), hex('#d8c8f0'), t), 0.15);
  // glowing gills under the cap, then the round cap
  mb.lathe([[0, 3.95 * s], [1.2 * s, 3.85 * s], [2.45 * s, 3.62 * s]], 16, glowC(mixC(cap, [1, 1, 0.8, 1], 0.5)), 0);
  mb.lathe([[2.5 * s, 3.6 * s], [2.6 * s, 3.85 * s], [2.3 * s, 4.5 * s], [1.6 * s, 5.0 * s], [0.7 * s, 5.25 * s], [0, 5.3 * s]], 18, (t) => mixC(cap, capHi, t * 0.8), 0.2);
  mb.pop();
  for (let k = 0; k < 7; k++) { const a = k * 0.9 + r * 5, R = (0.6 + (k % 3) * 0.6) * s, yy = y - 0.4 + (5.25 - (R / s) * (R / s) * 0.22) * s; mb.sph([x + Math.cos(a) * R, yy, z + Math.sin(a) * R], [0.22 * s, 0.08 * s, 0.22 * s], 6, glowC(hex('#fff2a8')), 0); }
}
function glowGrass(mb, x, y, z, r) { mb.up = true; const c = glowC(hex(r > 0.5 ? '#9ff0ff' : '#e0a8ff')); for (let k = 0; k < 4; k++) { const a = k * 1.6 + r * 7; mb.tri([x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2], [x + Math.cos(a + 1.2) * 0.2, y, z + Math.sin(a + 1.2) * 0.2], [x + Math.cos(a) * 0.05, y + 0.8, z + Math.sin(a) * 0.05], c, true); mb.tri([x + Math.cos(a + 1.2) * 0.2, y, z + Math.sin(a + 1.2) * 0.2], [x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2], [x + Math.cos(a) * 0.05, y + 0.8, z + Math.sin(a) * 0.05], c, true); }  mb.up = false; }
function glowFlower(mb, x, y, z, r) {
  const st = hex('#4a6a8a'), c = r > 0.5 ? '#ff8ff0' : '#8ff6ff';
  mb.caps([x, y - 0.1, z], [x + 0.08, y + 0.55, z], 0.035, 0.03, 4, st); mb.caps([x + 0.08, y + 0.55, z], [x + 0.02, y + 0.95, z + 0.04], 0.03, 0.025, 4, st);
  if (!mb.lod) for (const a of [0.5, 3.4]) mb.tri2([x + 0.05, y + 0.3, z], [x + Math.cos(a) * 0.35, y + 0.45, z + Math.sin(a) * 0.35], [x + Math.cos(a + 0.5) * 0.2, y + 0.55, z + Math.sin(a + 0.5) * 0.2], hex('#3a5a7a'));
  // a glowing tulip-like bulb, open at the top, with little glowing tips sticking out
  mb.push([x + 0.02, y + 0.88, z + 0.04]); mb.lathe([[0.05, 0], [0.16, 0.08], [0.2, 0.2], [0.16, 0.32], [0.1, 0.36]], 7, glowC(hex(c)), 0); mb.pop();
  if (!mb.lod) for (let k = 0; k < 3; k++) { const a = k * 2.1; mb.caps([x + 0.02, y + 1.0, z + 0.04], [x + 0.02 + Math.cos(a) * 0.08, y + 1.32, z + 0.04 + Math.sin(a) * 0.08], 0.01, 0.008, 3, glowC(hex('#fff8c0'))); mb.sph([x + 0.02 + Math.cos(a) * 0.08, y + 1.33, z + 0.04 + Math.sin(a) * 0.08], 0.03, 3, glowC(hex('#fff8c0')), 0); }
}
function coral(mb, x, y, z, s, r) {
  if (y > -1.5) return; s = Math.min(s, (-y - 0.5) / 1.6);
  const c = hex(['#ff7a8a', '#ffb35a', '#c88aff', '#5ad8c8', '#ff9ad0'][Math.floor(r * 5)]), lite = mixC(c, [1, 1, 1, 1], 0.3), kind = Math.floor(r * 13) % 3;
  if (kind === 0 || mb.lod) { // branching coral: arms that split into twigs with round tips
    for (let k = 0; k < (mb.lod ? 3 : 4); k++) { const a = k * 1.6 + r * 8; mb.at([x, y - 0.2, z], M4.mul3(M4.rotY(a), M4.rotZ(0.35)));
      mb.cyl(0, 0, 0, 0.16 * s, 0.1 * s, 0.9 * s, 5, c);
      if (!mb.lod) for (const b of [-0.5, 0.45]) { mb.push([0, 0.9 * s, 0], M4.rotX(b)); mb.cyl(0, 0, 0, 0.09 * s, 0.06 * s, 0.6 * s, 5, c); mb.sph([0, 0.62 * s, 0], 0.08 * s, 4, lite, 0); mb.pop(); }
      else mb.ico(0, 0.9 * s, 0, 0.14 * s, 0, () => lite);
      mb.reset(); }
  } else if (kind === 1) { // brain coral: a round dome with winding ridges
    mb.sph([x, y + 0.1 * s, z], [0.75 * s, 0.55 * s, 0.75 * s], 14, (nx, ny, nz) => Math.sin(nx * 14 + Math.sin(nz * 9) * 2) > 0.2 ? lite : shadeC(c, 0.8), 0.2);
  } else { // a sea fan: a flat lacy fan on a short stalk, plus tube coral
    mb.at([x, y - 0.1, z], M4.rotY(r * 6)); mb.caps([0, 0, 0], [0, 0.4 * s, 0], 0.06 * s, 0.05 * s, 5, shadeC(c, 0.8));
    for (let k = 0; k < 7; k++) { const a0 = -1.1 + k * 0.32, a1 = a0 + 0.32; mb.tri2([0, 0.4 * s, 0], [Math.sin(a0) * 1.3 * s, (0.4 + Math.cos(a0) * 1.3) * s, 0], [Math.sin(a1) * 1.3 * s, (0.4 + Math.cos(a1) * 1.3) * s, 0], k % 2 ? c : lite); }
    mb.reset();
    for (let k = 0; k < 4; k++) { const a = k * 1.5 + r * 3, px = x + Math.cos(a) * 0.7 * s, pz = z + Math.sin(a) * 0.7 * s, h = (0.4 + (k % 2) * 0.3) * s; mb.cyl(px, y - 0.2, pz, 0.12 * s, 0.14 * s, h, 6, hex('#ffd25a'), false); mb.cyl(px, y - 0.2 + h, pz, 0.09 * s, 0.09 * s, 0.02, 6, hex('#7a3a1a')); }
  }
}
function seaweed(mb, x, y, z, r) {
  if (y > -1.6) return;
  // kelp: tall wavy ribbons with leafy blades and little air bubbles
  const g = hex('#3a8a5a'), g2 = hex('#5aa86a'), n = mb.lod ? 2 : 3;
  for (let k = 0; k < n; k++) {
    const px = x + Math.cos(k * 2 + r * 7) * 0.4, pz = z + Math.sin(k * 2 + r * 7) * 0.4, H = Math.min(2 + r * 2.5, -y - 0.6), seg = mb.lod ? 3 : 6;
    if (mb.lod) { mb.cyl(px, y - 0.2, pz, 0.12, 0.04, H, 4, g, false, k); continue; }
    let prev = [px, y - 0.2, pz]; const wa = r * 7 + k, wx = Math.cos(wa) * 0.07, wz = Math.sin(wa) * 0.07;
    for (let q = 1; q <= seg; q++) { const t = q / seg, p = [px + Math.sin(t * 5 + k + r * 9) * 0.25, y - 0.2 + H * t, pz + Math.cos(t * 4 + k) * 0.2]; mb.tri2([prev[0] - wx, prev[1], prev[2] - wz], [prev[0] + wx, prev[1], prev[2] + wz], [p[0] + wx, p[1], p[2] + wz], g); mb.tri2([prev[0] - wx, prev[1], prev[2] - wz], [p[0] + wx, p[1], p[2] + wz], [p[0] - wx, p[1], p[2] - wz], g);
      if (q < seg) { const a = q * 2.3 + k, bl = 0.35 + (q % 2) * 0.15; mb.tri2(p, [p[0] + Math.cos(a) * bl, p[1] + 0.25, p[2] + Math.sin(a) * bl], [p[0] + Math.cos(a + 0.5) * bl * 0.6, p[1] + 0.4, p[2] + Math.sin(a + 0.5) * bl * 0.6], q % 2 ? g : g2); if (q % 2) mb.sph([p[0] + Math.cos(a) * 0.08, p[1] + 0.03, p[2] + Math.sin(a) * 0.08], 0.05, 3, hex('#8ac85a'), 0); }
      prev = p; }
  }
}
function _end() {} // marks the end of the plant list
