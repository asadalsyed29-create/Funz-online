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
function groundColor(T, x, z, info, ny, h) {
  const B = BIOMES[info.b]; let c = hex(B.ground);
  if (info.b === 6 && h > 95) c = hex('#eef3f9');
  if (ny < 0.72 && info.b !== 9 && info.b !== 10) c = hex(B.rock || '#8a857c');
  if (h < -1.2) c = mixC(hex('#c9b47f'), hex('#6f8a7a'), Math.min(1, -h / 25));
  const n = T.N.hash(Math.floor(x * 3), Math.floor(z * 3), 5);
  return shadeC(c, 0.92 + n * 0.14);
}

function buildTerrainChunk(gl, T, cx, cz, decos) {
  const mb = new MeshBuilder(), H = [], I = [];
  for (let j = 0; j <= CN; j++) for (let i = 0; i <= CN; i++) {
    const x = cx * CHUNK + i * CELL, z = cz * CHUNK + j * CELL, inf = T.info(x, z);
    H.push(inf.h); I.push(inf); T.cache.set((cx * CN + i) * 131071 + (cz * CN + j), inf.h);
  }
  const at = (i, j) => [cx * CHUNK + i * CELL, H[j * (CN + 1) + i], cz * CHUNK + j * CELL];
  const inf = (i, j) => I[j * (CN + 1) + i];
  const tri = (a, b, c, ia) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); ny /= l;
    const mx = (a[0] + b[0] + c[0]) / 3, mz = (a[2] + b[2] + c[2]) / 3, my = (a[1] + b[1] + c[1]) / 3;
    mb.tri(a, b, c, groundColor(T, mx, mz, ia, Math.abs(ny), my));
  };
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) {
    const gi = cx * CN + i, gj = cz * CN + j;
    const A = at(i, j), B = at(i + 1, j), C = at(i, j + 1), D = at(i + 1, j + 1);
    if ((gi + gj) & 1) { tri(A, C, B, inf(i, j)); tri(B, C, D, inf(i + 1, j + 1)); }
    else { tri(A, D, B, inf(i + 1, j)); tri(A, C, D, inf(i, j + 1)); }
  }
  // decorations
  const colliders = [];
  const N = T.N;
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) {
    const gx = cx * CN + i, gz = cz * CN + j, r = N.hash(gx, gz, 501);
    const x = gx * CELL + 0.6 + N.hash(gx, gz, 502) * (CELL - 1.2), z = gz * CELL + 0.6 + N.hash(gx, gz, 503) * (CELL - 1.2);
    const info = inf(i, j); if (info.b === 9 || info.b === 10) continue;
    const y = T.ground(x, z); if (y < SEA - 0.3 && info.b !== 7) continue;
    const s = 0.8 + N.hash(gx, gz, 504) * 0.6, rot = N.hash(gx, gz, 505) * 6.28;
    decorate(mb, colliders, info.b, r, x, y, z, s, rot, N.hash(gx, gz, 506), decos);
  }
  return { mesh: mb.build(gl), colliders };
}

// trees, rocks, flowers... by biome. colliders get {x,z,y0,y1,r} upright cylinders
function decorate(mb, col, b, r, x, y, z, s, rot, r2, decos) {
  const cyl = (rad, h) => col.push({ x, z, y0: y - 1, y1: y + h, r: rad });
  const C = hex;
  if (b === 3) { // forest
    if (r < 0.13) { pine(mb, x, y, z, s * 1.2, false); cyl(0.35 * s, 7 * s); }
    else if (r < 0.2) { roundTree(mb, x, y, z, s * 1.1, '#3f9a4e'); cyl(0.35 * s, 6 * s); }
    else if (r < 0.26) bush(mb, x, y, z, s, '#2f7a3a');
    else if (r < 0.32) flowers(mb, x, y, z, r2);
  } else if (b === 2) { // grassland
    if (r < 0.025) { roundTree(mb, x, y, z, s * 1.2, '#4fae4a'); cyl(0.4 * s, 6 * s); }
    else if (r < 0.04) { rock(mb, x, y, z, s * 0.9, '#8f8c88'); col.push({ x, z, y0: y - 1, y1: y + s * 0.8, r: s * 0.8 }); }
    else if (r < 0.14) flowers(mb, x, y, z, r2);
    else if (r < 0.24) tuft(mb, x, y, z, '#5aa84a');
  } else if (b === 1) { // beach
    if (r < 0.03) { palm(mb, x, y, z, s, rot); cyl(0.3, 6 * s); }
    else if (r < 0.05) { rock(mb, x, y, z, s * 0.6, '#b8b0a0'); col.push({ x, z, y0: y - 1, y1: y + s * 0.5, r: s * 0.6 }); }
  } else if (b === 4) { // desert
    if (r < 0.03) { cactus(mb, x, y, z, s, rot); cyl(0.4, 3.2 * s); }
    else if (r < 0.045) { rock(mb, x, y, z, s * 1.2, '#c9965a'); col.push({ x, z, y0: y - 1, y1: y + s, r: s * 1.1 }); }
    else if (r < 0.06) deadBush(mb, x, y, z, s);
  } else if (b === 5) { // snow
    if (r < 0.06) { pine(mb, x, y, z, s * 1.1, true); cyl(0.35 * s, 7 * s); }
    else if (r < 0.075) { iceSpike(mb, x, y, z, s); cyl(0.6 * s, 4 * s); }
    else if (r < 0.09) { rock(mb, x, y, z, s, '#a9b4c4'); col.push({ x, z, y0: y - 1, y1: y + s * 0.8, r: s * 0.9 }); }
  } else if (b === 6) { // mountains
    if (r < 0.05) { rock(mb, x, y, z, s * 1.4, '#7d7b82'); col.push({ x, z, y0: y - 1, y1: y + s * 1.2, r: s * 1.3 }); }
    else if (r < 0.08 && y < 80) { pine(mb, x, y, z, s, y > 60); cyl(0.3 * s, 6 * s); }
    else if (r < 0.085) crystals(mb, x, y, z, s, '#7fe0ff');
  } else if (b === 7) { // swamp
    if (r < 0.05) { deadTree(mb, x, y, z, s, rot); cyl(0.35 * s, 5 * s); }
    else if (r < 0.2) reeds(mb, x, y, z, r2);
    else if (r < 0.24) lily(mb, x, z);
  } else if (b === 8) { // glow fields
    if (r < 0.05) { giantShroom(mb, x, y, z, s, r2); cyl(0.5 * s, 5 * s); }
    else if (r < 0.08) crystals(mb, x, y, z, s, r2 > 0.5 ? '#ff8ff0' : '#8ff6ff');
    else if (r < 0.2) glowGrass(mb, x, y, z, r2);
  }
}
function pine(mb, x, y, z, s, snowy) {
  mb.cyl(x, y - 0.5, z, 0.3 * s, 0.22 * s, 2.2 * s, 5, hex('#6b4a2b'), false);
  const g = hex(snowy ? '#2f6a4a' : '#2e7a3e');
  for (let k = 0; k < 3; k++) {
    const yy = y + (1.6 + k * 1.6) * s, rr = (2.3 - k * 0.6) * s;
    mb.cyl(x, yy, z, rr, 0, 2.4 * s, 6, shadeC(g, 0.9 + k * 0.08), true, k);
    if (snowy) mb.cyl(x, yy + 1.5 * s, z, rr * 0.4, 0, 0.9 * s, 6, hex('#f4f8fc'), true, k);
  }
}
function roundTree(mb, x, y, z, s, c) {
  mb.cyl(x, y - 0.5, z, 0.35 * s, 0.25 * s, 3.2 * s, 5, hex('#7a5232'), false);
  mb.ico(x, y + 4 * s, z, 2.2 * s, 1, (a, b) => shadeC(hex(c), 0.85 + b * 0.25));
  mb.ico(x + 1 * s, y + 3.3 * s, z + 0.6 * s, 1.4 * s, 0, (a, b) => shadeC(hex(c), 0.8 + b * 0.2));
}
function bush(mb, x, y, z, s, c) { mb.ico(x, y + 0.4 * s, z, 0.8 * s, 0, (a, b) => shadeC(hex(c), 0.85 + b * 0.25)); }
function rock(mb, x, y, z, s, c) { mb.ico(x, y + 0.15 * s, z, s, 0, (a, b) => shadeC(hex(c), 0.8 + b * 0.25 + a * 0.05)); }
function flowers(mb, x, y, z, r) {
  const cols = ['#ff8fb1', '#ffe066', '#ffffff', '#b28dff', '#ff9f5a'];
  for (let k = 0; k < 3; k++) {
    const a = r * 20 + k * 2.1, px = x + Math.cos(a) * 0.5, pz = z + Math.sin(a) * 0.5;
    mb.cyl(px, y - 0.1, pz, 0.03, 0.03, 0.45, 3, hex('#3f8a3a'), false);
    mb.ico(px, y + 0.45, pz, 0.13, 0, () => hex(cols[(Math.floor(r * 50) + k) % 5]));
  }
}
function tuft(mb, x, y, z, c) { const g = hex(c); for (let k = 0; k < 3; k++) { const a = k * 2.1; mb.tri([x + Math.cos(a) * 0.25, y, z + Math.sin(a) * 0.25], [x + Math.cos(a + 1) * 0.25, y, z + Math.sin(a + 1) * 0.25], [x + Math.cos(a) * 0.1, y + 0.6, z + Math.sin(a) * 0.1], g, true); mb.tri([x + Math.cos(a + 1) * 0.25, y, z + Math.sin(a + 1) * 0.25], [x + Math.cos(a) * 0.25, y, z + Math.sin(a) * 0.25], [x + Math.cos(a) * 0.1, y + 0.6, z + Math.sin(a) * 0.1], g, true); } }
function palm(mb, x, y, z, s, rot) {
  let px = x, py = y - 0.3, pz = z; const dx = Math.cos(rot) * 0.25, dz = Math.sin(rot) * 0.25;
  for (let k = 0; k < 5; k++) { mb.cyl(px, py, pz, 0.28 - k * 0.03, 0.25 - k * 0.03, 1.3 * s, 5, shadeC(hex('#9a7a4a'), 0.9 + (k % 2) * 0.1), false); px += dx * k * 0.4; py += 1.25 * s; pz += dz * k * 0.4; }
  const g = hex('#3f9a4e');
  for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + rot, L = 2.6 * s; mb.tri([px, py, pz], [px + Math.cos(a - 0.3) * L * 0.5, py + 0.3, pz + Math.sin(a - 0.3) * L * 0.5], [px + Math.cos(a) * L, py - 0.8, pz + Math.sin(a) * L], g, true); mb.tri([px, py, pz], [px + Math.cos(a) * L, py - 0.8, pz + Math.sin(a) * L], [px + Math.cos(a + 0.3) * L * 0.5, py + 0.3, pz + Math.sin(a + 0.3) * L * 0.5], shadeC(g, 0.85), true); }
  mb.ico(px, py - 0.2, pz, 0.3, 0, () => hex('#7a5a2a'));
}
function cactus(mb, x, y, z, s, rot) {
  const g = hex('#4f9a4a');
  mb.cyl(x, y - 0.3, z, 0.4 * s, 0.35 * s, 3.3 * s, 6, g);
  const ax = Math.cos(rot), az = Math.sin(rot);
  mb.cyl(x + ax * 0.7 * s, y + 1.2 * s, z + az * 0.7 * s, 0.22 * s, 0.2 * s, 1.3 * s, 5, g);
  mb.box(x - (ax > 0 ? 0 : 0.7 * s), y + 1.1 * s, z - 0.15 * s, x + (ax > 0 ? 0.7 * s : 0), y + 1.4 * s, z + 0.15 * s, g);
}
function deadBush(mb, x, y, z, s) { const c = hex('#8a6a42'); for (let k = 0; k < 4; k++) { const a = k * 1.6; mb.tri([x, y, z], [x + Math.cos(a) * 0.6 * s, y + 0.7 * s, z + Math.sin(a) * 0.6 * s], [x + Math.cos(a) * 0.5 * s, y + 0.8 * s, z + Math.sin(a) * 0.5 * s + 0.08], c, true); } }
function iceSpike(mb, x, y, z, s) { mb.cyl(x, y - 0.5, z, 0.8 * s, 0, 5 * s, 5, hex('#bfe6ff')); mb.cyl(x + 0.7 * s, y - 0.5, z + 0.3, 0.4 * s, 0, 2.5 * s, 5, hex('#d8f0ff')); }
function crystals(mb, x, y, z, s, c) { for (let k = 0; k < 4; k++) { const a = k * 1.7; mb.cyl(x + Math.cos(a) * 0.4 * s, y - 0.2, z + Math.sin(a) * 0.4 * s, 0.25 * s, 0, (1.2 + (k % 2)) * s, 5, glowC(hex(c))); } }
function deadTree(mb, x, y, z, s, rot) {
  const c = hex('#5a4a3a'); mb.cyl(x, y - 0.6, z, 0.35 * s, 0.15 * s, 5 * s, 5, c);
  for (let k = 0; k < 3; k++) { const a = rot + k * 2.1, yy = y + (2 + k) * s; mb.cyl(x + Math.cos(a) * 0.6 * s, yy, z + Math.sin(a) * 0.6 * s, 0.12 * s, 0.05 * s, 1.4 * s, 4, c, false); }
}
function reeds(mb, x, y, z, r) { const g = hex('#7a8a3a'), b = hex('#6a4a2a'); for (let k = 0; k < 4; k++) { const px = x + Math.cos(k * 1.6 + r * 9) * 0.4, pz = z + Math.sin(k * 1.6 + r * 9) * 0.4; mb.cyl(px, y - 0.3, pz, 0.04, 0.03, 1.6, 3, g, false); mb.cyl(px, y + 1.1, pz, 0.08, 0.08, 0.35, 4, b); } }
function lily(mb, x, z) { mb.cyl(x, SEA - 0.05, z, 0.6, 0.6, 0.05, 7, hex('#4f9a4a')); mb.ico(x + 0.2, SEA + 0.1, z, 0.12, 0, () => hex('#ffb3d1')); }
function giantShroom(mb, x, y, z, s, r) {
  mb.cyl(x, y - 0.4, z, 0.45 * s, 0.35 * s, 4.2 * s, 6, hex('#efe6f8'));
  const cap = hex(r > 0.5 ? '#c05ae0' : '#5a7ae0');
  mb.cyl(x, y + 3.6 * s, z, 2.4 * s, 0.6 * s, 1.4 * s, 8, cap);
  for (let k = 0; k < 4; k++) { const a = k * 1.57 + r * 5; mb.ico(x + Math.cos(a) * 1.3 * s, y + 4.5 * s, z + Math.sin(a) * 1.3 * s, 0.25 * s, 0, () => glowC(hex('#fff2a8'))); }
}
function glowGrass(mb, x, y, z, r) { const c = glowC(hex(r > 0.5 ? '#9ff0ff' : '#e0a8ff')); for (let k = 0; k < 3; k++) { const a = k * 2.1 + r * 7; mb.tri([x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2], [x + Math.cos(a + 1.2) * 0.2, y, z + Math.sin(a + 1.2) * 0.2], [x + Math.cos(a) * 0.05, y + 0.7, z + Math.sin(a) * 0.05], c, true); } }
