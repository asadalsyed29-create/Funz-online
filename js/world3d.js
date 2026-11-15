// The 3D island: voxel terrain from a seed, natural stuff, the blocks players
// place, items to find, the ring race and the parkour tower.
const WORLD = 256, HMAX = 40, WATER = 6, CH = 16;

const BLOCKS = {
  // building blocks
  1: { name: 'Wood', color: '#9b6a3c' },
  2: { name: 'Stone', color: '#8f949e' },
  3: { name: 'Brick', color: '#b0503c' },
  4: { name: 'Glass', color: '#aee3ff', glass: true },
  5: { name: 'Leaves', color: '#3f9a4e' },
  6: { name: 'Lamp', color: '#ffd36a', glow: true, light: 7 },
  7: { name: 'Planks', color: '#c49a6c' },
  8: { name: 'White', color: '#eef1f6' },
  9: { name: 'Dark', color: '#2c3140' },
  // machines
  40: { name: 'Jump pad', color: '#5b6bd6', top: '#8fd3ff', machine: true, glowTop: true },
  41: { name: 'Speed pad', color: '#5b6bd6', top: '#ffd34d', machine: true, glowTop: true },
  42: { name: 'Teleporter (red)', color: '#3a3f55', top: '#ff5a6e', machine: true, glowTop: true, tp: 'red' },
  43: { name: 'Teleporter (blue)', color: '#3a3f55', top: '#4fa8ff', machine: true, glowTop: true, tp: 'blue' },
  44: { name: 'Teleporter (green)', color: '#3a3f55', top: '#48d6ac', machine: true, glowTop: true, tp: 'green' },
  45: { name: 'Teleporter (yellow)', color: '#3a3f55', top: '#ffc45a', machine: true, glowTop: true, tp: 'yellow' },
  46: { name: 'Spawn point', color: '#e8eef7', top: '#b48cff', machine: true, glowTop: true },
  47: { name: 'Bouncy block', color: '#ff7ab8', machine: true },
  // nature (can't be picked in the build tab)
  20: { name: 'Grass', color: '#5fb35a', side: '#7a6a45' },
  21: { name: 'Dirt', color: '#7a5f3f' },
  22: { name: 'Sand', color: '#e2cf95' },
  23: { name: 'Rock', color: '#8a8f99' },
  24: { name: 'Trunk', color: '#6b4a2b' },
  25: { name: 'Leaves', color: '#2f7a3a' },
  26: { name: 'Snow', color: '#f2f6fb', side: '#8a8f99' },
  27: { name: 'Flower', color: '#ff8fb1', deco: true },
  28: { name: 'Plaza', color: '#b9b2a2' },
  29: { name: 'Tower', color: '#7d6bd6', top: '#b8a8ff' },
  30: { name: 'Forest grass', color: '#3f8a46', side: '#6a5a3a' },
  31: { name: 'Meadow', color: '#7cc46a', side: '#7a6a45' },
};
const BUILD_BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const BUILD_MACHINES = [40, 41, 42, 43, 44, 45, 46, 47];

const ITEMS = {
  shell: { name: 'Shell', color: '#ffb3a7', use: 'Speed boost for 20 seconds', time: 20 },
  mushroom: { name: 'Mushroom', color: '#e0543c', use: 'Grow big for 20 seconds', time: 20 },
  feather: { name: 'Feather', color: '#f4f1e8', use: 'Super jump for 20 seconds', time: 20 },
  crystal: { name: 'Crystal', color: '#7fe0ff', use: 'Glow in the dark for 90 seconds', time: 90 },
  coin: { name: 'Coin', color: '#ffcf4a', use: 'Collect them all!' },
  trophy: { name: 'Tower trophy', color: '#ffc45a', use: 'You beat the parkour tower!' },
};

class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.edits = new Map(); // "x,y,z" -> id (0 = air)
    this.h = new Uint8Array(WORLD * WORLD);
    this.biome = new Uint8Array(WORLD * WORLD); // 0 sea 1 sand 2 grass 3 forest 4 meadow 5 rock 6 snow 7 plaza
    this.tree = new Uint8Array(WORLD * WORLD);
    this.top = new Uint8Array(WORLD * WORLD);   // decoration on top: 0 none, 23 rock, 27 flower
    this.tower = new Map();
    this.chunkTop = new Map(); // tallest built/tower block in each chunk
    this.generate();
    for (const k of this.tower.keys()) { const [x, y, z] = k.split(',').map(Number); this.bumpTop(x, y, z); }
  }
  hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (this.seed + s) * 2246822519) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = this.hash(xi, yi, s), b = this.hash(xi + 1, yi, s), c = this.hash(xi, yi + 1, s), d = this.hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  fbm(x, y, s) { let t = 0, a = 1, f = 1, n = 0; for (let o = 0; o < 4; o++) { t += this.vnoise(x * f, y * f, s + o * 17) * a; n += a; a *= .5; f *= 2; } return t / n; }

  generate() {
    const c = WORLD / 2;
    for (let z = 0; z < WORLD; z++) for (let x = 0; x < WORLD; x++) {
      const dx = (x - c) / c, dz = (z - c) / c;
      const edge = Math.max(0, Math.hypot(dx, dz) - 0.55) * 1.2;
      const n = this.fbm(x / 40, z / 40, 1) - edge;
      const mtn = Math.max(0, this.fbm(x / 28, z / 28, 9) - 0.55) * 60;
      let h = Math.floor(WATER + (n - 0.38) * 34 + (n > 0.42 ? mtn : 0));
      h = Math.max(1, Math.min(HMAX - 8, h));
      const i = z * WORLD + x, wet = this.fbm(x / 22, z / 22, 50);
      let b;
      if (h < WATER) b = 0; else if (h <= WATER + 1) b = 1; else if (h > 22) b = 6; else if (h > 16) b = 5;
      else b = wet > 0.58 ? 3 : wet < 0.38 ? 4 : 2;
      // plaza in the middle
      const pd = Math.hypot(x - c, z - c);
      if (pd < 7) { h = 9; b = 7; } else if (pd < 12) { h = Math.round(h + (9 - h) * (1 - (pd - 7) / 5)); if (h > WATER + 1 && b < 5) b = b || 2; }
      this.h[i] = h; this.biome[i] = b;
      const r = this.hash(x, z, 99);
      if (x % 3 === 0 && z % 3 === 0 && (b === 3 ? r < 0.75 : b === 2 ? r < 0.12 : b === 4 ? r < 0.03 : false)) this.tree[i] = 1;
      else if (b === 2 || b === 4) this.top[i] = r > 0.9 ? 27 : r < 0.01 ? 23 : 0;
      else if (b === 1 && r < 0.01) this.top[i] = 23;
      else if (b === 3 && r > 0.95) this.top[i] = 27;
    }
    // keep trees off the plaza ring
    for (let z = c - 12; z <= c + 12; z++) for (let x = c - 12; x <= c + 12; x++) { this.tree[z * WORLD + x] = 0; this.top[z * WORLD + x] = 0; }
    // parkour tower: a spiral of floating steps next to the plaza
    const tx = c + 18, tz = c;
    for (let x = tx - 1; x <= tx + 1; x++) for (let z = tz - 1; z <= tz + 1; z++) { this.tree[z * WORLD + x] = 0; this.top[z * WORLD + x] = 0; }
    const base = this.h[tz * WORLD + tx];
    for (let y = base; y < base + 30; y++) this.tower.set(tx + ',' + y + ',' + tz, 29); // the pole
    this.towerSteps = [];
    for (let k = 0; k < 26; k++) {
      const a = k * 0.62, R = 3 + (k % 3 === 2 ? 1 : 0);
      const sx = Math.round(tx + Math.cos(a) * R), sz = Math.round(tz + Math.sin(a) * R), sy = base + 1 + k;
      this.tower.set(sx + ',' + sy + ',' + sz, 29); this.towerSteps.push([sx, sy, sz]);
    }
    for (let x = tx - 1; x <= tx + 1; x++) for (let z = tz - 1; z <= tz + 1; z++) this.tower.set(x + ',' + (base + 30) + ',' + z, 29);
    this.trophy = [tx + 0.5, base + 31.6, tz + 0.5];

    this.makeItems(); this.makeRings();
  }
  makeItems() {
    this.items = [];
    for (let z = 2; z < WORLD - 2; z++) for (let x = 2; x < WORLD - 2; x++) {
      const i = z * WORLD + x, b = this.biome[i], r = this.hash(x, z, 321);
      if (this.tree[i] || this.top[i] === 23) continue;
      let t = null;
      if (r < 0.0016) t = 'coin';
      else if (b === 1 && r < 0.012) t = 'shell';
      else if (b === 3 && r < 0.010) t = 'mushroom';
      else if (b === 4 && r < 0.008) t = 'feather';
      else if ((b === 5 || b === 6) && r < 0.02) t = 'crystal';
      if (t) this.items.push({ id: this.items.length, type: t, x: x + 0.5, y: this.h[i] + 0.55, z: z + 0.5 });
    }
    this.items.push({ id: this.items.length, type: 'trophy', x: this.trophy[0], y: this.trophy[1], z: this.trophy[2] });
  }
  makeRings() {
    const c = WORLD / 2; this.rings = [];
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2, R = 34 + Math.sin(k * 1.7) * 6;
      const x = c + Math.cos(a) * R, z = c + Math.sin(a) * R;
      let gh = 0; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) gh = Math.max(gh, this.groundTop(Math.floor(x + dx), Math.floor(z + dz)));
      this.rings.push({ x, y: Math.max(gh, WATER) + 1.8, z, yaw: -a });
    }
    this.raceStart = [c, 9.6, c - 4];
  }
  groundTop(x, z) { if (x < 0 || z < 0 || x >= WORLD || z >= WORLD) return 0; const i = z * WORLD + x; return this.h[i] + (this.tree[i] ? 5 : 0); }

  inside(x, y, z) { return x >= 0 && z >= 0 && x < WORLD && z < WORLD && y >= 0 && y < HMAX + 24; }
  // block id at a voxel (0 = air)
  natural(x, y, z) {
    if (x < 0 || z < 0 || x >= WORLD || z >= WORLD || y < 0) return 0;
    const i = z * WORLD + x, h = this.h[i], b = this.biome[i];
    if (y < h) {
      if (y === h - 1) return b === 0 ? 22 : b === 1 ? 22 : b === 3 ? 30 : b === 4 ? 31 : b === 5 ? 23 : b === 6 ? 26 : b === 7 ? 28 : 20;
      return y > h - 4 && b !== 5 && b !== 6 ? (b <= 1 ? 22 : 21) : 23;
    }
    const tw = this.tower.get(x + ',' + y + ',' + z); if (tw) return tw;
    if (y === h && this.top[i]) return this.top[i];
    if (this.tree[i] && y >= h && y < h + 4) return 24;
    // leaves around nearby trees
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= WORLD || zz >= WORLD) continue;
      const j = zz * WORLD + xx; if (!this.tree[j]) continue;
      const th = this.h[j];
      if (y >= th + 3 && y <= th + 4 && !(dx === 0 && dz === 0 && y < th + 4)) return 25;
      if (y === th + 5 && dx === 0 && dz === 0) return 25;
    }
    return 0;
  }
  get(x, y, z) { const k = x + ',' + y + ',' + z; return this.edits.has(k) ? this.edits.get(k) : this.natural(x, y, z); }
  solid(x, y, z) {
    if (x < 0 || z < 0 || x >= WORLD || z >= WORLD) return y < WATER - 2;
    if (y < 0) return true;
    const id = this.get(x, y, z); return id !== 0 && !(BLOCKS[id] && BLOCKS[id].deco);
  }
  bumpTop(x, y, z) { const k = Math.floor(x / CH) + ',' + Math.floor(z / CH); if ((this.chunkTop.get(k) || 0) < y + 1) this.chunkTop.set(k, y + 1); }
  set(x, y, z, id) {
    if (!this.inside(x, y, z) || (id !== 0 && !BLOCKS[id])) return false;
    if (id) this.bumpTop(x, y, z);
    const k = x + ',' + y + ',' + z;
    if (id === this.natural(x, y, z)) this.edits.delete(k); else this.edits.set(k, id);
    return true;
  }
  loadEdits(list) { this.edits.clear(); for (const e of list || []) if (Array.isArray(e) && e.length === 4) this.set(e[0], e[1], e[2], e[3]); }
  editList() { return Array.from(this.edits, ([k, v]) => { const [x, y, z] = k.split(',').map(Number); return [x, y, z, v]; }); }
  spawn() { return [WORLD / 2 + 0.5, 11, WORLD / 2 + 0.5]; }
  teleporters(id) { const out = []; for (const [k, v] of this.edits) if (v === id) out.push(k.split(',').map(Number)); return out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]); }
  lamps() { const out = []; for (const [k, v] of this.edits) if (v === 6) out.push(k.split(',').map(Number)); return out; }
}
