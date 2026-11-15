// The world: terrain made from a seed, plus the blocks players place or break.
const TILE = 32, WORLD = 256;

const BLOCKS = {
  1: { name: 'Wood',   solid: true,  color: '#9b6a3c' },
  2: { name: 'Stone',  solid: true,  color: '#8a8f99' },
  3: { name: 'Brick',  solid: true,  color: '#b0503c' },
  4: { name: 'Glass',  solid: true,  color: 'rgba(170,225,255,.55)' },
  5: { name: 'Bush',   solid: true,  color: '#3f9a4e' },
  6: { name: 'Lamp',   solid: true,  color: '#ffd36a', light: 150 },
  7: { name: 'Path',   solid: false, color: '#d8c08a' },
  8: { name: 'Water',  solid: true,  color: '#2f7fc4' },
  9: { name: 'Floor',  solid: false, color: '#c49a6c' },
  20: { name: 'Tree',  solid: true },
  21: { name: 'Rock',  solid: true },
  22: { name: 'Flower', solid: false },
};
const HOTBAR = [1, 2, 3, 4, 9, 7, 5, 6, 8, 0]; // 0 = break tool

class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.edits = new Map();      // "x,y" -> block id (0 = cleared)
    this.ground = new Uint8Array(WORLD * WORLD); // 0 deep, 1 water, 2 sand, 3 grass, 4 forest, 5 meadow
    this.natural = new Uint8Array(WORLD * WORLD);
    this.generate();
  }

  // --- noise ---
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
  fbm(x, y, s) {
    let t = 0, amp = 1, f = 1, n = 0;
    for (let o = 0; o < 4; o++) { t += this.vnoise(x * f, y * f, s + o * 17) * amp; n += amp; amp *= 0.5; f *= 2; }
    return t / n;
  }

  generate() {
    const c = WORLD / 2;
    for (let y = 0; y < WORLD; y++) for (let x = 0; x < WORLD; x++) {
      const dx = (x - c) / c, dy = (y - c) / c;
      const edge = Math.max(0, Math.hypot(dx, dy) - 0.55) * 1.1; // island-ish edges
      const h = this.fbm(x / 34, y / 34, 1) - edge;
      const wet = this.fbm(x / 22, y / 22, 50);
      let g;
      if (h < 0.30) g = 0; else if (h < 0.37) g = 1; else if (h < 0.41) g = 2;
      else g = wet > 0.58 ? 4 : wet < 0.38 ? 5 : 3;
      const i = y * WORLD + x;
      this.ground[i] = g;
      const r = this.hash(x, y, 99);
      let o = 0;
      if (g === 4) o = r < 0.32 ? 20 : r < 0.36 ? 22 : 0;
      else if (g === 3) o = r < 0.025 ? 20 : r < 0.035 ? 21 : r < 0.07 ? 22 : 0;
      else if (g === 5) o = r < 0.12 ? 22 : r < 0.13 ? 21 : 0;
      else if (g === 2) o = r < 0.012 ? 21 : 0;
      this.natural[i] = o;
    }
    // clear a plaza in the middle where everyone spawns
    for (let y = c - 4; y <= c + 4; y++) for (let x = c - 4; x <= c + 4; x++) {
      const i = y * WORLD + x;
      if (this.ground[i] < 2) this.ground[i] = 3;
      this.natural[i] = 0;
    }
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < WORLD && y < WORLD; }
  groundAt(x, y) { return this.inside(x, y) ? this.ground[y * WORLD + x] : 0; }
  objAt(x, y) {
    if (!this.inside(x, y)) return 2;
    const k = x + ',' + y;
    return this.edits.has(k) ? this.edits.get(k) : this.natural[y * WORLD + x];
  }
  solid(x, y) {
    if (!this.inside(x, y)) return true;
    const o = this.objAt(x, y);
    if (o === 7 || o === 9) return false;       // path / floor = bridge over water
    if (o && BLOCKS[o].solid) return true;
    return this.groundAt(x, y) <= 1;            // water
  }
  set(x, y, k) {
    if (!this.inside(x, y)) return false;
    if (k !== 0 && !BLOCKS[k]) return false;
    const key = x + ',' + y;
    if (k === this.natural[y * WORLD + x]) this.edits.delete(key); else this.edits.set(key, k);
    return true;
  }
  editList() { return Array.from(this.edits, ([k, v]) => { const [x, y] = k.split(',').map(Number); return [x, y, v]; }); }
  spawn() { const c = WORLD / 2; return { x: c * TILE + TILE / 2, y: c * TILE + TILE / 2 }; }
}

World.prototype.loadEdits = function (list) {
  this.edits.clear();
  for (const [x, y, k] of list || []) this.set(x, y, k);
};
