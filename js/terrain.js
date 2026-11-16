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
  mb.push([x, y - 0.5, z]); mb.lathe([[0.32 * s, 0], [0.26 * s, 1.2 * s], [0.2 * s, 2.6 * s], [0, 2.7 * s]], 7, hex('#6b4a2b')); mb.pop();
  const g = hue(snowy ? '#2f6a4a' : '#2e7a3e', r2, 0.2), lift = mixC(g, [0.75, 0.95, 0.6, 1], 0.25);
  for (let k = 0; k < 4; k += mb.lod ? 2 : 1) {
    const yy = y + (1.3 + k * 1.2) * s, rr = (2.5 - k * 0.55) * s, h = (mb.lod ? 3.2 : 2.2) * s;
    mb.push([x, yy, z], M4.rotY(k * 0.9 + r2 * 3));
    mb.lathe([[0, -0.05 * s], [rr * 0.9, -0.15 * s], [rr, 0.05 * s], [rr * 0.62, h * 0.38], [rr * 0.25, h * 0.75], [0, h]], mb.lod ? 5 : 8, (t, ph) => { const sc = 0.93 + 0.07 * Math.cos(ph * 7); return snowy && t > 0.55 ? hex('#f4f8fc') : t < 0.2 ? shadeC(g, 0.75 * sc) : mixC(shadeC(g, sc), lift, t * 0.4); }, 0);
    mb.pop();
  }
}
function trunk(mb, x, y, z, s, h, col, lean = 0) {
  mb.push([x, y - 0.6, z], M4.rotZ(lean)); mb.lathe([[0.55 * s, 0], [0.38 * s, 0.4 * s], [0.3 * s, h * 0.6], [0.24 * s, h], [0, h + 0.05]], mb.lod ? 4 : 8, hex(col), 0.25); mb.pop();
}
// round fluffy treetop made of smooth puffs, lighter on top
function puffs(mb, x, y, z, s, c, r2, list) {
  const base = hue(c, r2), top = mixC(base, [1, 1, 0.8, 1], 0.22), low = shadeC(base, 0.72);
  const col = (nx, ny) => ny > 0.2 ? mixC(base, top, (ny - 0.2) * 1.25) : mixC(low, base, (ny + 1) / 1.2);
  // clean low-poly: each puff is a faceted ball, lighter on top
  const icol = (a, b) => col(a, b);
  for (const [dx, dy, dz, r] of mb.lod ? list.slice(0, 3) : list.slice(0, 5)) mb.ico(x + dx * s, y + dy * s, z + dz * s, [r * s * (mb.lod ? 1.15 : 1.05), r * s * 0.92, r * s * (mb.lod ? 1.15 : 1.05)], mb.lod ? 0 : 1, icol, false, null, (a, b, c) => 0.07 * Math.sin(a * 5 + r2 * 9) * Math.cos(c * 4 + r2 * 5));
}
function roundTree(mb, x, y, z, s, c, r2 = 0.5) {
  trunk(mb, x, y, z, s, 4 * s, '#7a5232', (r2 - 0.5) * 0.15);
  puffs(mb, x, y, z, s, c, r2, [[0, 4.4, 0, 2.1], [1.4, 3.7, 0.4, 1.4], [-1.3, 3.8, -0.5, 1.4], [0.3, 3.6, 1.4, 1.3], [-0.4, 3.7, -1.4, 1.3], [0.4, 5.6, -0.3, 1.3], [-0.8, 5.1, 0.7, 1.1]]);
}
function birch(mb, x, y, z, s, r2) {
  trunk(mb, x, y, z, s * 0.6, 5.5 * s, '#eeeae2');
  for (let k = 0; k < 4; k++) mb.cyl(x, y + (0.6 + k * 1.1) * s, z, 0.17 * s, 0.16 * s, 0.1 * s, 7, hex('#3a3a3a'), false, k);
  puffs(mb, x, y, z, s, r2 < 0.5 ? '#9ccf4a' : '#c8d84a', r2, [[0, 5.6, 0, 1.4], [0.4, 4.6, 0.3, 1.2], [-0.4, 4.9, -0.3, 1.1], [0.1, 6.5, 0, 0.9]]);
}
function blossom(mb, x, y, z, s, r2) {
  trunk(mb, x, y, z, s * 0.9, 3 * s, '#6a4038', 0.12);
  puffs(mb, x + 0.3 * s, y, z, s, r2 < 0.5 ? '#ffb3d1' : '#ffc8e0', r2, [[0, 3.8, 0, 1.8], [1.4, 3.3, 0.4, 1.2], [-1.3, 3.4, -0.4, 1.2], [0.2, 3.3, 1.3, 1.1], [-0.2, 3.4, -1.3, 1.1], [0.3, 4.9, 0, 1.1]]);
}
function willow(mb, x, y, z, s, r2) {
  trunk(mb, x, y, z, s * 1.1, 3.6 * s, '#5a4a32');
  const g = hue('#6a9a3a', r2);
  puffs(mb, x, y, z, s, '#6a9a3a', r2, [[0, 4.1, 0, 2.2], [1.2, 3.8, 0.5, 1.4], [-1.2, 3.9, -0.5, 1.4]]);
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + r2, R = 2.1 * s; mb.caps([x + Math.cos(a) * R, y + 3.8 * s, z + Math.sin(a) * R], [x + Math.cos(a) * (R + 0.3 * s), y + 1.2 * s, z + Math.sin(a) * (R + 0.3 * s)], 0.28 * s, 0.12 * s, 6, shadeC(g, 0.85 + (k % 3) * 0.07)); }
}
function bush(mb, x, y, z, s, c, r2 = 0.5) { puffs(mb, x, y, z, s, c, r2, [[0, 0.45, 0, 0.75], [0.55, 0.35, 0.2, 0.5], [-0.5, 0.35, -0.2, 0.5], [0.1, 0.8, 0, 0.45]]); if (r2 > 0.6) for (let k = 0; k < 5; k++) mb.sph([x + Math.cos(k * 1.7) * 0.6 * s, y + (0.55 + (k % 2) * 0.3) * s, z + Math.sin(k * 1.7) * 0.6 * s], 0.08, 5, hex('#e0404a'), 0); }
function rock(mb, x, y, z, s, c, r2 = 0.5) { const moss = c !== '#c9965a' && c !== '#b8b0a0' && r2 > 0.6; mb.ico(x, y + 0.1 * s, z, [s * (0.9 + r2 * 0.3), s * 0.75, s], 1, (a, b) => b > 0.5 ? mixC(hue(c, r2), [0.45, 0.68, 0.35, 1], moss ? 0.5 : 0) : shadeC(hue(c, r2), 0.8 + b * 0.22 + a * 0.05), false, null, wobble(r2 * 3)); }
function flowers(mb, x, y, z, r) {
  const cols = ['#ff8fb1', '#ffe066', '#ffffff', '#b28dff', '#ff9f5a', '#6fc8ff'];
  for (let k = 0; k < 3; k++) {
    const a = r * 20 + k * 2.1, px = x + Math.cos(a) * 0.5, pz = z + Math.sin(a) * 0.5, c = hex(cols[(Math.floor(r * 60) + k) % 6]);
    mb.cyl(px, y - 0.1, pz, 0.025, 0.02, 0.5, 3, hex('#3f8a3a'), false);
    mb.up = true; for (let q = 0; q < 5; q++) { const b = q / 5 * 6.283 + a; mb.tri([px, y + 0.42, pz], [px + Math.cos(b - 0.45) * 0.17, y + 0.46, pz + Math.sin(b - 0.45) * 0.17], [px + Math.cos(b + 0.45) * 0.17, y + 0.46, pz + Math.sin(b + 0.45) * 0.17], c, true); mb.tri([px, y + 0.42, pz], [px + Math.cos(b + 0.45) * 0.17, y + 0.46, pz + Math.sin(b + 0.45) * 0.17], [px + Math.cos(b - 0.45) * 0.17, y + 0.46, pz + Math.sin(b - 0.45) * 0.17], shadeC(c, 0.8), true); }
    mb.up = false; mb.ico(px, y + 0.47, pz, 0.06, 0, () => hex('#ffcc33'));
  }
}
function sunflower(mb, x, y, z, s, rot) {
  mb.cyl(x, y - 0.1, z, 0.05, 0.04, 1.6 * s, 4, hex('#4f8a3a'), false);
  const hx = x + Math.cos(rot) * 0.1, hy = y + 1.6 * s, hz = z + Math.sin(rot) * 0.1;
  for (let q = 0; q < 10; q++) { const b = q / 10 * 6.283; mb.tri([hx, hy + Math.cos(b) * 0.1, hz + Math.sin(b) * 0.1], [hx + 0.02, hy + Math.cos(b - 0.3) * 0.38, hz + Math.sin(b - 0.3) * 0.38], [hx + 0.02, hy + Math.cos(b + 0.3) * 0.38, hz + Math.sin(b + 0.3) * 0.38], hex('#ffd02a'), true); mb.tri([hx, hy + Math.cos(b) * 0.1, hz + Math.sin(b) * 0.1], [hx + 0.02, hy + Math.cos(b + 0.3) * 0.38, hz + Math.sin(b + 0.3) * 0.38], [hx + 0.02, hy + Math.cos(b - 0.3) * 0.38, hz + Math.sin(b - 0.3) * 0.38], hex('#e8a820'), true); }
  mb.ico(hx + 0.04, hy, hz, [0.06, 0.16, 0.16], 1, () => hex('#5a3a1a'));
}
function tuft(mb, x, y, z, c, s = 1) { mb.up = true; const g = hex(c), g2 = mixC(g, [0.9, 1, 0.6, 1], 0.25); for (let k = 0; k < 5; k++) { const a = k * 1.26 + x, h = (0.5 + (k % 3) * 0.15) * s, lean = 0.12; const p0 = [x + Math.cos(a) * 0.22, y - 0.05, z + Math.sin(a) * 0.22], p1 = [x + Math.cos(a + 0.5) * 0.22, y - 0.05, z + Math.sin(a + 0.5) * 0.22], tp = [x + Math.cos(a + 0.25) * (0.22 + lean), y + h, z + Math.sin(a + 0.25) * (0.22 + lean)]; mb.tri(p0, p1, tp, k % 2 ? g : g2, true); mb.tri(p1, p0, tp, shadeC(g, 0.85), true); }  mb.up = false; }
function fern(mb, x, y, z, s, rot) { mb.up = true; const g = hex('#3f9a4e'); for (let k = 0; k < 6; k++) { const a = rot + k / 6 * 6.283, L = 1.1 * s; const tip = [x + Math.cos(a) * L, y + 0.25 * s, z + Math.sin(a) * L], m = [x + Math.cos(a) * L * 0.5, y + 0.55 * s, z + Math.sin(a) * L * 0.5]; const w = 0.18 * s, nx = -Math.sin(a) * w, nz = Math.cos(a) * w; mb.tri([x, y, z], [m[0] + nx, m[1], m[2] + nz], tip, g, true); mb.tri([x, y, z], tip, [m[0] - nx, m[1], m[2] - nz], shadeC(g, 0.9), true); mb.tri([x, y, z], tip, [m[0] + nx, m[1], m[2] + nz], shadeC(g, 0.75), true); mb.tri([x, y, z], [m[0] - nx, m[1], m[2] - nz], tip, shadeC(g, 0.7), true); }  mb.up = false; }
function shrooms(mb, x, y, z, r) { for (let k = 0; k < 3; k++) { const a = r * 9 + k * 2.2, px = x + Math.cos(a) * 0.35, pz = z + Math.sin(a) * 0.35, h = 0.25 + (k % 2) * 0.15; mb.cyl(px, y - 0.05, pz, 0.06, 0.05, h, 5, hex('#f4ead8'), false); mb.cyl(px, y + h - 0.02, pz, 0.22, 0, 0.18, 7, hex(r > 0.5 ? '#e0443c' : '#c88a4a')); if (r > 0.5) mb.ico(px + 0.06, y + h + 0.08, pz, 0.035, 0, () => hex('#ffffff')); } }
function log(mb, x, y, z, s, rot) { mb.at([x, y + 0.3 * s, z], M4.rotY(rot)); mb.at([x, y + 0.3 * s, z], M4.mul3(M4.rotY(rot), M4.rotZ(Math.PI / 2))); mb.cyl(0, -1.4 * s, 0, 0.35 * s, 0.33 * s, 2.8 * s, 7, hex('#7a5232')); mb.cyl(0, -1.42 * s, 0, 0.3 * s, 0.3 * s, 0.02, 7, hex('#c8a070')); mb.reset(); mb.ico(x + 0.3, y + 0.62 * s, z, 0.25, 0, () => hex('#4f9a4e')); }
function palm(mb, x, y, z, s, rot) {
  const dx = Math.cos(rot) * 0.9 * s, dz = Math.sin(rot) * 0.9 * s, H = 6.2 * s, pts = [];
  for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([x + dx * t * t, y - 0.3 + H * t, z + dz * t * t]); }
  MB.tube(mb, pts, t => (0.3 - t * 0.1) * s, 7, hex('#9a7a4a'));
  for (let k = 1; k < 6; k++) mb.tor([pts[k][0], pts[k][1], pts[k][2]], (0.3 - k / 6 * 0.1) * s, 0.05 * s, 10, 4, hex('#7a5a32'));
  const [px, py, pz] = pts[6], g = hex('#3f9a4e'), g2 = hex('#5ab85a'); mb.up = true;
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + rot, L = 2.8 * s, mid = [px + Math.cos(a) * L * 0.55, py + 0.35, pz + Math.sin(a) * L * 0.55], tip = [px + Math.cos(a) * L, py - 0.9, pz + Math.sin(a) * L], w = 0.45 * s, nx = -Math.sin(a) * w, nz = Math.cos(a) * w;
    mb.tri([px, py, pz], [mid[0] + nx, mid[1], mid[2] + nz], mid, k % 2 ? g : g2, true); mb.tri([px, py, pz], mid, [mid[0] - nx, mid[1], mid[2] - nz], g, true);
    mb.tri(mid, [mid[0] + nx, mid[1], mid[2] + nz], tip, k % 2 ? g : g2, true); mb.tri(mid, tip, [mid[0] - nx, mid[1], mid[2] - nz], g, true);
    mb.tri([px, py, pz], mid, [mid[0] + nx, mid[1], mid[2] + nz], shadeC(g, 0.8), true); mb.tri([px, py, pz], [mid[0] - nx, mid[1], mid[2] - nz], mid, shadeC(g, 0.8), true);
    mb.tri(mid, tip, [mid[0] + nx, mid[1], mid[2] + nz], shadeC(g, 0.8), true); mb.tri(mid, [mid[0] - nx, mid[1], mid[2] - nz], tip, shadeC(g, 0.8), true); }
  mb.up = false;
  for (let k = 0; k < 3; k++) mb.sph([px + Math.cos(k * 2.1) * 0.25, py - 0.3, pz + Math.sin(k * 2.1) * 0.25], 0.2, 6, hex('#7a5a2a'), 0.2);
}
function cactus(mb, x, y, z, s, rot, r2 = 0.5) {
  const g = hex('#4f9a4a'), ribs = (t, ph) => shadeC(g, 0.86 + 0.14 * Math.cos(ph * 8)), ax = Math.cos(rot), az = Math.sin(rot);
  const arm = (ox, oz, y0, len, up) => { MB.tube(mb, [[x, y + y0 * s, z], [x + ox * s, y + y0 * s, z + oz * s], [x + ox * s, y + (y0 + up) * s, z + oz * s]], 0.2 * s, 8, g); mb.sph([x + ox * s, y + (y0 + up) * s, z + oz * s], 0.2 * s, 8, g, 0); };
  mb.push([x, y - 0.3, z]); mb.lathe([[0.42 * s, 0], [0.42 * s, 2.9 * s], [0.3 * s, 3.25 * s], [0, 3.4 * s]], 12, ribs, 0.1); mb.pop();
  arm(ax * 0.75, az * 0.75, 1.2, 0, 1.1); arm(-ax * 0.65, -az * 0.65, 0.8, 0, 0.8);
  if (r2 > 0.5) for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; mb.sph([x + Math.cos(a) * 0.12, y + 3.12 * s, z + Math.sin(a) * 0.12], [0.1, 0.05, 0.1], 5, hex(r2 > 0.75 ? '#ff6fae' : '#ffd24a'), 0); }
}
function deadBush(mb, x, y, z, s) { mb.up = true; const c = hex('#8a6a42'); for (let k = 0; k < 5; k++) { const a = k * 1.3; mb.cyl(x, y - 0.1, z, 0.05, 0.02, 0.9 * s, 3, c, false, a); mb.at([x, y, z], M4.mul3(M4.rotY(a), M4.rotZ(0.6))); mb.cyl(0, 0, 0, 0.04, 0.01, 0.8 * s, 3, c, false); mb.reset(); }  mb.up = false; }
function bones(mb, x, y, z, rot) { const c = hex('#f2ead8'); mb.at([x, y + 0.15, z], M4.mul3(M4.rotY(rot), M4.rotZ(Math.PI / 2))); for (let k = 0; k < 5; k++) mb.cyl(0, -1 + k * 0.45, 0, 0.08, 0.06, 0.2, 5, c); mb.cyl(0, -1.2, 0, 0.05, 0.05, 2.4, 5, c); mb.reset(); mb.ico(x + Math.cos(rot) * 1.4, y + 0.25, z + Math.sin(rot) * 1.4, 0.32, 1, () => c); }
function seashell(mb, x, y, z, r) { mb.up = true; const c = hex(r > 0.5 ? '#ffb3a7' : '#f4e0c8'); for (let k = 0; k < 6; k++) { const a0 = -1 + k * 0.33, a1 = a0 + 0.33; mb.tri([x, y + 0.02, z], [x + Math.sin(a1) * 0.3, y + 0.1, z + Math.cos(a1) * 0.3], [x + Math.sin(a0) * 0.3, y + 0.1, z + Math.cos(a0) * 0.3], shadeC(c, k % 2 ? 1 : 0.85), true); }  mb.up = false; }
function iceSpike(mb, x, y, z, s) { mb.cyl(x, y - 0.5, z, 0.8 * s, 0, 5 * s, 6, glowC(hex('#bfe6ff'))); mb.cyl(x + 0.7 * s, y - 0.5, z + 0.3, 0.4 * s, 0, 2.5 * s, 5, hex('#d8f0ff')); mb.cyl(x - 0.5 * s, y - 0.5, z - 0.4, 0.35 * s, 0, 2 * s, 5, hex('#e8f6ff')); }
function snowBush(mb, x, y, z, s) { puffs(mb, x, y, z, s, '#3f6a4a', 0.5, [[0, 0.4, 0, 0.75], [0.5, 0.3, 0.2, 0.5]]); mb.sph([x, y + 0.85 * s, z], [0.65 * s, 0.25 * s, 0.6 * s], 8, hex('#f4f8fc'), 0.1); }
function crystals(mb, x, y, z, s, c) {
  const base = hex(c), tip = mixC(base, [1, 1, 1, 1], 0.55);
  mb.ico(x, y + 0.05, z, [0.7 * s, 0.25 * s, 0.7 * s], 0, (a, b) => hex('#6a6f80'));
  for (let k = 0; k < 6; k++) {
    const a = k * 1.1, h = (0.7 + (k % 3) * 0.55) * s, w = (0.16 + (k % 2) * 0.08) * s;
    mb.at([x + Math.cos(a) * 0.35 * s * (k ? 1 : 0), y - 0.2, z + Math.sin(a) * 0.35 * s * (k ? 1 : 0)], M4.mul3(M4.rotY(a), M4.rotZ(k ? 0.35 * Math.sin(k * 2.3) : 0)));
    mb.cyl(0, 0, 0, w, w * 1.05, h, 6, glowC(base), false, k);
    mb.cyl(0, h, 0, w * 1.05, 0, w * 2.2, 6, glowC(tip), false, k);
    mb.reset();
  }
}
function deadTree(mb, x, y, z, s, rot) {
  const c = hex('#5a4a3a'); mb.cyl(x, y - 0.6, z, 0.38 * s, 0.14 * s, 5 * s, 6, c);
  for (let k = 0; k < 3; k++) { const a = rot + k * 2.1, yy = y + (2 + k) * s; mb.at([x, yy, z], M4.mul3(M4.rotY(-a), M4.rotZ(-0.9))); mb.cyl(0, 0, 0, 0.13 * s, 0.04 * s, 1.8 * s, 4, c, false); mb.reset(); }
  for (let k = 0; k < 4; k++) mb.cyl(x + Math.cos(rot + k) * 0.3, y + (1 + k) * s, z + Math.sin(rot + k) * 0.3, 0.05, 0.04, 1.2, 3, hex('#6a8a3a'), false);
}
function reeds(mb, x, y, z, r) { const g = hex('#7a8a3a'), b = hex('#6a4a2a'); for (let k = 0; k < 5; k++) { const px = x + Math.cos(k * 1.3 + r * 9) * 0.45, pz = z + Math.sin(k * 1.3 + r * 9) * 0.45, h = 1.3 + (k % 3) * 0.3; mb.cyl(px, y - 0.3, pz, 0.04, 0.025, h, 3, g, false); if (k % 2 === 0) mb.cyl(px, y + h - 0.6, pz, 0.08, 0.07, 0.4, 5, b); } }
function lily(mb, x, z, r = 0.5) { mb.cyl(x, SEA - 0.05, z, 0.65, 0.65, 0.05, 9, hex('#4f9a4a')); if (r > 0.4) { const fx = x + 0.2; for (let q = 0; q < 6; q++) { const b = q / 6 * 6.283; mb.tri([fx, SEA + 0.05, z], [fx + Math.cos(b - 0.4) * 0.2, SEA + 0.22, z + Math.sin(b - 0.4) * 0.2], [fx + Math.cos(b + 0.4) * 0.2, SEA + 0.22, z + Math.sin(b + 0.4) * 0.2], hex('#ffb3d1'), true); } mb.ico(fx, SEA + 0.12, z, 0.06, 0, () => hex('#ffe066')); } }
function giantShroom(mb, x, y, z, s, r) {
  const cap = hex(r > 0.5 ? '#c05ae0' : '#5a7ae0'), capHi = mixC(cap, [1, 0.9, 1, 1], 0.35);
  mb.push([x, y - 0.4, z]); mb.lathe([[0.55 * s, 0], [0.42 * s, 0.4 * s], [0.34 * s, 2.5 * s], [0.4 * s, 3.9 * s], [0, 4 * s]], 10, (t) => mixC(hex('#efe6f8'), hex('#d8c8f0'), t), 0.15);
  // glowing gills under the cap, then the round cap
  mb.lathe([[0, 3.95 * s], [1.2 * s, 3.85 * s], [2.45 * s, 3.62 * s]], 16, glowC(mixC(cap, [1, 1, 0.8, 1], 0.5)), 0);
  mb.lathe([[2.5 * s, 3.6 * s], [2.6 * s, 3.85 * s], [2.3 * s, 4.5 * s], [1.6 * s, 5.0 * s], [0.7 * s, 5.25 * s], [0, 5.3 * s]], 18, (t) => mixC(cap, capHi, t * 0.8), 0.2);
  mb.pop();
  for (let k = 0; k < 7; k++) { const a = k * 0.9 + r * 5, R = (0.6 + (k % 3) * 0.6) * s, yy = y - 0.4 + (5.25 - (R / s) * (R / s) * 0.22) * s; mb.sph([x + Math.cos(a) * R, yy, z + Math.sin(a) * R], [0.22 * s, 0.08 * s, 0.22 * s], 6, glowC(hex('#fff2a8')), 0); }
}
function glowGrass(mb, x, y, z, r) { mb.up = true; const c = glowC(hex(r > 0.5 ? '#9ff0ff' : '#e0a8ff')); for (let k = 0; k < 4; k++) { const a = k * 1.6 + r * 7; mb.tri([x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2], [x + Math.cos(a + 1.2) * 0.2, y, z + Math.sin(a + 1.2) * 0.2], [x + Math.cos(a) * 0.05, y + 0.8, z + Math.sin(a) * 0.05], c, true); mb.tri([x + Math.cos(a + 1.2) * 0.2, y, z + Math.sin(a + 1.2) * 0.2], [x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2], [x + Math.cos(a) * 0.05, y + 0.8, z + Math.sin(a) * 0.05], c, true); }  mb.up = false; }
function glowFlower(mb, x, y, z, r) { mb.cyl(x, y - 0.1, z, 0.04, 0.03, 0.9, 3, hex('#4a6a8a'), false); mb.ico(x, y + 0.95, z, 0.2, 1, () => glowC(hex(r > 0.5 ? '#ff8ff0' : '#8ff6ff'))); }
function coral(mb, x, y, z, s, r) { if (y > -1.5) return; s = Math.min(s, (-y - 0.5) / 1.6); const c = hex(['#ff7a8a', '#ffb35a', '#c88aff', '#5ad8c8'][Math.floor(r * 4)]); for (let k = 0; k < 4; k++) { const a = k * 1.6 + r * 8; mb.at([x, y - 0.2, z], M4.mul3(M4.rotY(a), M4.rotZ(0.35))); mb.cyl(0, 0, 0, 0.18 * s, 0.1 * s, 1.4 * s, 5, c); mb.ico(0, 1.4 * s, 0, 0.16 * s, 0, () => shadeC(c, 1.1)); mb.reset(); } }
function seaweed(mb, x, y, z, r) { if (y > -1.6) return; const g = hex('#3a8a5a'); for (let k = 0; k < 3; k++) { const px = x + Math.cos(k * 2 + r * 7) * 0.4, pz = z + Math.sin(k * 2 + r * 7) * 0.4, h = Math.min(2 + r * 2, -y - 0.6); mb.cyl(px, y - 0.2, pz, 0.12, 0.04, h, 4, g, false, k); } }
function _end() {} // marks the end of the plant list
