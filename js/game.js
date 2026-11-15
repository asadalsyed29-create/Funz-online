// The game world on screen: streaming the huge map, rolling-ball physics,
// creatures, building rays, and drawing everything.
function closestOnTri(p, a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return a;
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]], d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]; }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}
function rayTri(o, d, a, b, c) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2]; if (Math.abs(det) < 1e-7) return -1;
  const f = 1 / det, s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]], u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]); if (u < 0 || u > 1) return -1;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]], v = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]); if (v < 0 || u + v > 1) return -1;
  return f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]);
}

class Game {
  constructor(canvas, overlay, seed, B) {
    this.gfx = new GL(canvas); this.canvas = canvas; this.ov = overlay; this.o = overlay.getContext('2d');
    this.T = new Terrain(seed); this.St = new Structures(this.T); this.B = B;
    this.chunks = new Map(); this.models = new Map(); this.itemModels = {}; this.creatureModels = {};
    this.landmarks = buildLandmarks(this.gfx, this.St);
    const rr = raceRings(this.T); this.rings = rr.rings; this.raceStart = rr.start;
    this.ringM = this.ringModel('#48d6ac'); this.ringNext = this.ringModel('#ffc45a'); this.ringDone = this.ringModel('#8a93a8');
    this.water = this.waterModel(); this.shadow = this.shadowModel(); this.cursorM = this.cursorModel(); this.cloudM = this.cloudModel();
    this.cam = { yaw: Math.PI * 0.75, pitch: 0.42, dist: 9, eye: [0, 0, 0], target: [0, 0, 0] };
    this.fov = 1.05; this.power = new Set(); this.anim = new Map();
    this.partChunks = new Map(); this.partDirty = new Set(); this.partModels = new Map(); this.wireMesh = null; this.wiresDirty = true;
    this.creatures = []; this.creatureChunks = new Set(); this.birds = [];
    this.cave = null; this.caves = new Map();
    this.radius = 5;
    this.mini = document.createElement('canvas'); this.mini.width = this.mini.height = 100; this.miniRow = 0; this.miniCenter = null;
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, innerWidth > 1400 ? 1.5 : 2);
    this.dpr = dpr; this.w = innerWidth; this.h = innerHeight;
    for (const c of [this.canvas, this.ov]) { c.width = Math.round(this.w * dpr); c.height = Math.round(this.h * dpr); }
    this.gfx.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
  ballFor(color, hat) { const k = color + '|' + hat; if (!this.models.has(k)) this.models.set(k, ballModel(this.gfx, color, hat)); return this.models.get(k); }
  itemFor(t) { return this.itemModels[t] || (this.itemModels[t] = itemModel(this.gfx, t)); }
  creatureFor(t) { return this.creatureModels[t] || (this.creatureModels[t] = creatureModel(this.gfx, t)); }
  partFor(id, rot, on) { const k = id + ':' + rot + ':' + on; if (!this.partModels.has(k)) this.partModels.set(k, partModel(this.gfx, id, rot, on)); return this.partModels.get(k); }
  ringModel(c) { const mb = new MeshBuilder(); for (let k = 0; k < 24; k++) { const a0 = k / 24 * 6.28, a1 = (k + 1) / 24 * 6.28; mb.at([0, 0, 0], M4.rotZ(a0)); mb.box(1.35, -0.17, -0.17, 1.65, 0.17 + (a1 - a0) * 1.5, 0.17, glowC(hex(c)), false); } return mb.build(this.gfx); }
  waterModel() { const mb = new MeshBuilder(), c = hex('#2c7cc8', 0.32), E = 700; for (let i = -4; i < 4; i++) for (let j = -4; j < 4; j++) mb.quad([i * E / 4, 0, j * E / 4], [i * E / 4, 0, (j + 1) * E / 4], [(i + 1) * E / 4, 0, (j + 1) * E / 4], [(i + 1) * E / 4, 0, j * E / 4], c); return mb.build(this.gfx); }
  shadowModel() { const mb = new MeshBuilder(), c = [0, 0, 0, 0.18]; for (let j = 0; j < 14; j++) { const a = j / 14 * 6.28, b = (j + 1) / 14 * 6.28; mb.tri([0, 0, 0], [Math.cos(b), 0, Math.sin(b)], [Math.cos(a), 0, Math.sin(a)], c); } return mb.build(this.gfx); }
  cursorModel() { const mb = new MeshBuilder(), c = [1, 1, 1, 0.16]; mb.box(-0.02, -0.02, -0.02, 1.02, 1.02, 1.02, c, false); return mb.build(this.gfx); }
  cloudModel() { const mb = new MeshBuilder(); for (let k = 0; k < 5; k++) mb.ico(k * 5 - 10, Math.sin(k) * 1.5, (k % 2) * 3, 4 + (k % 3) * 1.5, 0, (x, y) => [1, 1, 1, 0.42 + y * 0.03]); return mb.build(this.gfx); }

  // ---------- building changes ----------
  partChanged(x, y, z) { this.partDirty.add(Math.floor(x / 16) + ',' + Math.floor(z / 16)); this.wiresDirty = true; }
  allPartsChanged() { for (const k of this.partChunks.keys()) this.partDirty.add(k); for (const [k] of this.B.parts) { const [x, , z] = unkey(k); this.partDirty.add(Math.floor(x / 16) + ',' + Math.floor(z / 16)); } this.wiresDirty = true; }
  static isStatic(id) { return PARTS[id].cat === 'blocks' || id === 47; }
  buildPartChunk(key) {
    const [px, pz] = key.split(',').map(Number), mb = new MeshBuilder(), clear = new MeshBuilder(), dyn = [];
    for (const [k, part] of this.B.parts) {
      const [x, y, z] = unkey(k); if (Math.floor(x / 16) !== px || Math.floor(z / 16) !== pz) continue;
      if (!Game.isStatic(part.id)) { dyn.push([k, x, y, z, part]); continue; }
      const P = PARTS[part.id], c = shadeC(hex(P.color), 0.95 + this.T.N.hash(x, z + y * 7, 3) * 0.1), target = P.glass ? clear : mb;
      if (P.ramp) {
        target.at([x + 0.5, y, z + 0.5], M4.rotY(-part.rot * Math.PI / 2));
        target.quad([-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5], c); target.quad([0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5], shadeC(c, 0.9));
        target.tri([0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], shadeC(c, 0.85)); target.tri([-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, -0.5], shadeC(c, 0.85)); target.reset();
      } else if (part.id === 47) { target.ico(x + 0.5, y + 0.5, z + 0.5, 0.55, 1, (a, b) => shadeC(hex(P.color), 0.85 + b * 0.2)); }
      else if (P.glass) target.box(x, y, z, x + 1, y + 1, z + 1, [c[0], c[1], c[2], 0.2], false);
      else { const open = d => { const o = this.B.get(x + d[0], y + d[1], z + d[2]); return !o || !Game.isStatic(o.id) || PARTS[o.id].ramp || PARTS[o.id].slab || o.id === 47 || PARTS[o.id].glass; };
        const h = P.slab || 1, b = 0.04, s = k => shadeC(c, k);
        if (h < 1 || open([0, 1, 0])) mb.quad([x, y + h, z], [x, y + h, z + 1], [x + 1, y + h, z + 1], [x + 1, y + h, z], c);
        if (open([0, -1, 0])) mb.quad([x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1], s(0.7));
        if (open([0, 0, 1])) mb.quad([x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + h, z + 1], [x, y + h, z + 1], s(0.93));
        if (open([0, 0, -1])) mb.quad([x + 1, y, z], [x, y, z], [x, y + h, z], [x + 1, y + h, z], s(0.93));
        if (open([1, 0, 0])) mb.quad([x + 1, y, z + 1], [x + 1, y, z], [x + 1, y + h, z], [x + 1, y + h, z + 1], s(0.86));
        if (open([-1, 0, 0])) mb.quad([x, y, z], [x, y, z + 1], [x, y + h, z + 1], [x, y + h, z], s(0.86));
        if (h === 1 && open([0, 1, 0])) { mb.quad([x + b, y + 1.001, z + b], [x + b, y + 1.001, z + 1 - b], [x + 1 - b, y + 1.001, z + 1 - b], [x + 1 - b, y + 1.001, z + b], s(1.04)); }
      }
    }
    return { mesh: mb.build(this.gfx), clear: clear.build(this.gfx), dyn };
  }
  rebuildWires() {
    const mb = new MeshBuilder();
    for (const w of this.B.wires) {
      const [a, b] = w.split('|'), A = unkey(a), Bv = unkey(b);
      const on = this.power.has(a) || this.power.has(b), col = on ? glowC(hex('#ff6a4a')) : hex('#7a3a2a');
      const p0 = [A[0] + 0.5, A[1] + 0.35, A[2] + 0.5], p1 = [Bv[0] + 0.5, Bv[1] + 0.35, Bv[2] + 0.5], seg = 10, sag = Math.min(1.5, Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) * 0.08);
      let prev = p0;
      for (let k = 1; k <= seg; k++) {
        const t = k / seg, p = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - Math.sin(t * Math.PI) * sag, p0[2] + (p1[2] - p0[2]) * t];
        const w2 = 0.05; mb.box(Math.min(prev[0], p[0]) - w2, Math.min(prev[1], p[1]) - w2, Math.min(prev[2], p[2]) - w2, Math.max(prev[0], p[0]) + w2, Math.max(prev[1], p[1]) + w2, Math.max(prev[2], p[2]) + w2, col, false);
        prev = p;
      }
    }
    this.gfx.free(this.wireMesh); this.wireMesh = mb.build(this.gfx); this.wiresDirty = false;
  }
  setPower(on) { this.power = on; this.wiresDirty = true; }
  // moving parts slide toward where their power says
  animParts(dt) {
    for (const [k, part] of this.B.parts) {
      if (part.id !== 61 && part.id !== 62 && part.id !== 63) continue;
      const target = this.power.has(k) ? 1 : 0, cur = this.anim.get(k) || 0;
      const next = cur < target ? Math.min(target, cur + dt * (part.id === 61 ? 2.5 : 0.45)) : Math.max(target, cur - dt * (part.id === 61 ? 2.5 : 0.45));
      this.anim.set(k, next);
    }
  }
  partOffset(k, part) {
    const a = this.anim.get(k) || 0;
    if (part.id === 62) return [0, 4 * a, 0];
    if (part.id === 63) { const d = DIRS[part.rot]; return [d[0] * 4 * a, 0, d[1] * 4 * a]; }
    if (part.id === 61) return [0, -0.98 * a, 0];
    return [0, 0, 0];
  }
  wired(k) { return this.B.wiresOf(k).length > 0; }
  active(k) { return !this.wired(k) || this.power.has(k); }

  // ---------- physics ----------
  newBody(p) { return { p: [...p], v: [0, 0, 0], R: [1, 0, 0, 0, 1, 0, 0, 0, 1], r: 0.45, grounded: false, ground: null, tpCool: 0, padCool: 0, boostT: 0 }; }
  step(b, input, dt, opts) {
    const targetR = opts.big ? 0.8 : 0.45;
    if (b.r !== targetR) { const d = (targetR - b.r) * Math.min(1, dt * 6); b.r += d; if (d > 0) b.p[1] += d; if (Math.abs(b.r - targetR) < 0.005) b.r = targetR; }
    const v = b.v;
    if (opts.fly) {
      const sp = 18; v[0] = input.x * sp; v[2] = input.z * sp; v[1] = ((input.up ? 1 : 0) - (input.down ? 1 : 0)) * sp * 0.7;
      for (let i = 0; i < 3; i++) b.p[i] += v[i] * dt;
      b.p[0] = Math.max(-LIMIT, Math.min(LIMIT, b.p[0])); b.p[2] = Math.max(-LIMIT, Math.min(LIMIT, b.p[2])); b.p[1] = Math.min(b.p[1], 600);
      this.roll(b, dt); b.grounded = false; return;
    }
    const maxS = 8 * (opts.fast ? 1.7 : 1), acc = b.grounded ? 28 : 11;
    v[0] += input.x * acc * dt; v[2] += input.z * acc * dt;
    const hs = Math.hypot(v[0], v[2]);
    if (hs > maxS && b.boostT <= 0) { const k = Math.max(maxS / hs, 1 - dt * 4); v[0] *= k; v[2] *= k; }
    if (b.boostT > 0) b.boostT -= dt;
    if (!input.x && !input.z && b.grounded) { const k = Math.exp(-3.2 * dt); v[0] *= k; v[2] *= k; }
    v[1] -= 24 * dt;
    const depth = (this.cave ? -1e9 : SEA - 0.15) - b.p[1];
    if (depth > -b.r) { const sub = Math.min(1, (depth + b.r) / (2 * b.r)); v[1] += 40 * sub * dt; const k = Math.exp(-2.2 * sub * dt); v[0] *= k; v[2] *= k; v[1] *= Math.exp(-4.5 * sub * dt); }
    // fans blow you up
    const fx = Math.floor(b.p[0]), fz = Math.floor(b.p[2]);
    for (let dy = 0; dy < 10; dy++) { const y = Math.floor(b.p[1]) - dy, part = this.B.get(fx, y, fz); if (part) { if (part.id === 48 && this.active(pkey(fx, y, fz))) v[1] += (48 - dy * 2.5) * dt; break; } }
    if (input.jump && (b.grounded || (depth > -0.1 && depth < 0.6))) { v[1] = opts.superJump ? 13 : 8.8; b.grounded = false; }
    b.grounded = false; b.ground = null; b.carry = null;
    const steps = 3;
    for (let s = 0; s < steps; s++) { const h = dt / steps; b.p[0] += v[0] * h; b.p[1] += v[1] * h; b.p[2] += v[2] * h; this.collide(b); }
    if (b.carry) { b.p[0] += b.carry[0]; b.p[1] += b.carry[1]; b.p[2] += b.carry[2]; }
    if (b.grounded) this.machines(b, opts);
    b.tpCool -= dt; b.padCool -= dt;
    if (Math.abs(b.p[0]) > LIMIT) { b.p[0] = Math.sign(b.p[0]) * LIMIT; v[0] = 0; }
    if (Math.abs(b.p[2]) > LIMIT) { b.p[2] = Math.sign(b.p[2]) * LIMIT; v[2] = 0; }
    this.roll(b, dt);
  }
  push(b, q, info) {
    const p = b.p, r = b.r; let dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]; let d = Math.hypot(dx, dy, dz);
    if (d >= r) return;
    if (d < 1e-6) { dx = 0; dy = 1; dz = 0; d = 0; } else { dx /= d; dy /= d; dz /= d; }
    p[0] += dx * (r - d); p[1] += dy * (r - d); p[2] += dz * (r - d);
    const v = b.v, vn = v[0] * dx + v[1] * dy + v[2] * dz;
    const bounce = info && info.bouncy;
    if (vn < 0) { const k = bounce ? 1.85 : 1; v[0] -= dx * vn * k; v[1] -= dy * vn * k; v[2] -= dz * vn * k; if (bounce && dy > 0.5) v[1] = Math.max(v[1], 11); }
    if (dy > 0.55) { b.grounded = true; if (info) b.ground = info; }
  }
  collide(b) {
    const p = b.p, r = b.r, tris = [];
    if (this.cave) this.cave.tris(p[0], p[2], r + 0.1, tris);
    else { // terrain
      for (let i = Math.floor((p[0] - r) / CELL); i <= Math.floor((p[0] + r) / CELL); i++) for (let j = Math.floor((p[2] - r) / CELL); j <= Math.floor((p[2] + r) / CELL); j++) this.T.cellTris(i, j, tris);
      // tunnels/fast falls: never end up under the ground
      const g = this.T.ground(p[0], p[2]); if (p[1] < g + r * 0.2 && p[1] > g - 3 && !insideStation(p)) { p[1] = Math.max(p[1], g + r); if (b.v[1] < 0) b.v[1] = 0; b.grounded = true; }
    }
    this.St.grid.near(p[0], p[2], r + 0.5, tris);
    for (const t of tris) { if (t.ylo !== undefined && (p[1] + r < t.ylo || p[1] - r > t.yhi)) continue; this.push(b, closestOnTri(p, t[0], t[1], t[2])); }
    // decorations (tree trunks, rocks)
    if (!this.cave) {
      const ch = this.chunks.get(Math.floor(p[0] / CHUNK) + ',' + Math.floor(p[2] / CHUNK));
      if (ch) for (const c of ch.colliders) {
        if (Math.abs(c.x - p[0]) > c.r + r || Math.abs(c.z - p[2]) > c.r + r || p[1] - r > c.y1 || p[1] + r < c.y0) continue;
        const q = [c.x, Math.max(c.y0, Math.min(c.y1, p[1])), c.z], dx = p[0] - c.x, dz = p[2] - c.z, dd = Math.hypot(dx, dz) || 1;
        if (p[1] > c.y1) this.push(b, [c.x + dx / dd * Math.min(dd, c.r), c.y1, c.z + dz / dd * Math.min(dd, c.r)]);
        else this.push(b, [c.x + dx / dd * c.r, q[1], c.z + dz / dd * c.r]);
      }
    }
    // built parts
    for (let x = Math.floor(p[0] - r) - 1; x <= Math.floor(p[0] + r) + 1; x++) for (let y = Math.floor(p[1] - r) - 5; y <= Math.floor(p[1] + r) + 1; y++) for (let z = Math.floor(p[2] - r) - 1; z <= Math.floor(p[2] + r) + 1; z++) {
      const part = this.B.get(x, y, z); if (!part) continue;
      const k = pkey(x, y, z), dynamic = part.id === 61 || part.id === 62 || part.id === 63;
      if (!dynamic && (y < Math.floor(p[1] - r) - 1 || x < Math.floor(p[0] - r) || x > Math.floor(p[0] + r) || z < Math.floor(p[2] - r) || z > Math.floor(p[2] + r))) continue;
      if (part.id === 61 && (this.anim.get(k) || 0) > 0.6) continue;
      const off = dynamic ? this.partOffset(k, part) : null, sh = partShape(part, x, y, z, off), info = { k, part, at: [x, y, z] };
      if (sh.box) { const [x0, y0, z0, x1, y1, z1] = sh.box; this.push(b, [Math.max(x0, Math.min(x1, p[0])), Math.max(y0, Math.min(y1, p[1])), Math.max(z0, Math.min(z1, p[2]))], info); }
      else if (sh.sphere) { const [sx, sy, sz, sr] = sh.sphere, dx = p[0] - sx, dy = p[1] - sy, dz = p[2] - sz, d = Math.hypot(dx, dy, dz) || 1; this.push(b, [sx + dx / d * sr, sy + dy / d * sr, sz + dz / d * sr], { ...info, bouncy: part.id === 47 }); }
      else for (const t of sh.tris) this.push(b, closestOnTri(p, t[0], t[1], t[2]), info);
      if (dynamic && b.ground && b.ground.k === k) { const prev = b.lastOff && b.lastOff.k === k ? b.lastOff.o : off; b.carry = [off[0] - prev[0], 0, off[2] - prev[2]]; b.lastOff = { k, o: off }; }
    }
  }
  machines(b, opts) {
    const g = b.ground; if (!g) return;
    const id = g.part.id, k = g.k;
    if (id === 40 && b.padCool <= 0 && this.active(k)) { b.v[1] = 17; b.grounded = false; b.padCool = 0.3; opts.fx('jump'); }
    else if (id === 41 && b.padCool <= 0 && this.active(k)) { const d = DIRS[g.part.rot]; b.v[0] = d[0] * 22; b.v[2] = d[1] * 22; b.boostT = 1.2; b.padCool = 0.4; opts.fx('speed'); }
    else if (id === 42 && b.tpCool <= 0) {
      const links = this.B.wiresOf(k).filter(o => { const op = this.B.parts.get(o); return op && op.id === 42; }).sort();
      if (links.length) { const t = unkey(links[0]); b.p = [t[0] + 0.5, t[1] + 0.3 + b.r + 0.05, t[2] + 0.5]; b.v = [0, 0, 0]; b.tpCool = 1.6; opts.fx('tp'); }
      else { b.tpCool = 3; opts.fx('tp-alone'); }
    } else if (id === 46) opts.fx('spawn', g.at);
  }
  roll(b, dt) { const v = b.v, hs = Math.hypot(v[0], v[2]); if (hs < 0.01) return; b.R = M4.ortho3(M4.mul3(M4.axisAngle(v[2] / hs, 0, -v[0] / hs, hs * dt / b.r), b.R)); }
  rollBy(p, dx, dz, r) { const d = Math.hypot(dx, dz); if (d < 1e-4 || d > 3) return; p.R = M4.ortho3(M4.mul3(M4.axisAngle(dz / d, 0, -dx / d, d / r), p.R || [1, 0, 0, 0, 1, 0, 0, 0, 1])); }
  // structure doors: caves
  triggers(b, fx) {
    if (b.tpCool > 0) return;
    if (this.cave) { const e = this.cave.exit; if (Math.hypot(b.p[0] - e[0], b.p[1] - e[1], b.p[2] - e[2]) < 2) { const out = this.cave.ex.out; b.p = [...out]; b.v = [0, 0, 0]; b.tpCool = 1.5; this.cave = null; fx('cave-out'); } return; }
    for (const s of this.St.list.values()) if (s) for (const t of s.triggers) {
      if (Math.hypot(b.p[0] - t.p[0], b.p[1] - t.p[1], b.p[2] - t.p[2]) < t.r) {
        let c = this.caves.get(t.cave); if (!c) { c = new Cave(this.T.N, t.cave, t); c.build(this.gfx); this.caves.set(t.cave, c); }
        this.cave = c; b.p = [c.exit[0] + 3, c.exit[1] + 0.5, c.exit[2]]; b.v = [0, 0, 0]; b.tpCool = 1.5; fx('cave-in'); return;
      }
    }
  }
  caveAt(p) { if (p[1] > -150) return null; for (const c of this.caves.values()) if (Math.abs(p[0] - c.o[0]) < 64 && Math.abs(p[2] - c.o[2]) < 64 && Math.abs(p[1] - c.o[1]) < 40) return c; return null; }

  // a few things to find lying around in every chunk
  chunkItems(cx, cz) {
    const N = this.T.N, out = [];
    for (let k = 0; k < 2; k++) {
      if (N.hash(cx * 7 + k, cz, 600) > 0.42) continue;
      const x = cx * CHUNK + 4 + N.hash(cx, cz * 5 + k, 601) * (CHUNK - 8), z = cz * CHUNK + 4 + N.hash(cx * 3 + k, cz, 602) * (CHUNK - 8);
      const inf = this.T.info(x, z), y = this.T.ground(x, z);
      if (y < SEA - 0.5 || inf.b === 9 || inf.b === 10) continue;
      const r = N.hash(cx, cz + k * 13, 603);
      const type = r < 0.12 ? 'coin' : ({ 1: 'shell', 2: 'feather', 3: 'mushroom', 4: 'gem', 5: 'crystal', 6: 'crystal', 7: 'mushroom', 8: 'crystal' }[inf.b] || 'coin');
      out.push({ id: 'c:' + cx + ':' + cz + ':' + k, type, p: [x, y + 0.6, z] });
    }
    return out;
  }
  findItem(id) {
    const s = String(id).split(':');
    if (s[0] === 'c') { const it = this.chunkItems(+s[1], +s[2]).find(i => i.id === id); return it || null; }
    for (const l of this.landmarks) { const it = l.items.find(i => i.id === id); if (it) return it; }
    for (const st of this.St.list.values()) if (st) { const it = st.items.find(i => i.id === id); if (it) return it; }
    for (const c of this.caves.values()) { const it = c.items.find(i => i.id === id); if (it) return it; }
    return undefined; // unknown here (not loaded): trust it
  }
  nearbyItems(p) {
    const out = [];
    if (this.cave) out.push(...this.cave.items);
    else {
      const cx = Math.floor(p[0] / CHUNK), cz = Math.floor(p[2] / CHUNK);
      for (let i = cx - 2; i <= cx + 2; i++) for (let j = cz - 2; j <= cz + 2; j++) { const ch = this.chunks.get(i + ',' + j); if (ch && ch.items) out.push(...ch.items); }
      for (const st of this.St.list.values()) if (st) out.push(...st.items);
    }
    for (const l of this.landmarks) out.push(...l.items);
    return out;
  }

  // ---------- creatures ----------
  updateCreatures(dt, me, players, night) {
    const N = this.T.N, pcx = Math.floor(me.p[0] / CHUNK), pcz = Math.floor(me.p[2] / CHUNK), act = new Set();
    if (!this.cave) for (let i = pcx - 3; i <= pcx + 3; i++) for (let j = pcz - 3; j <= pcz + 3; j++) {
      const k = i + ',' + j; act.add(k); if (this.creatureChunks.has(k)) continue;
      this.creatureChunks.add(k);
      const x = i * CHUNK + 32, z = j * CHUNK + 32, inf = this.T.info(x, z);
      const types = Object.entries(CREATURES).filter(([, c]) => c.biomes.includes(inf.b)).map(([t]) => t);
      if (!types.length || N.hash(i, j, 700) > 0.55) continue;
      const t = types[Math.floor(N.hash(i, j, 701) * types.length)], n = 1 + Math.floor(N.hash(i, j, 702) * (t === 'fish' ? 5 : 3));
      for (let q = 0; q < n; q++) {
        const cx = x + (N.hash(i, j, 710 + q) - 0.5) * 50, cz = z + (N.hash(i, j, 720 + q) - 0.5) * 50;
        this.creatures.push({ type: t, chunk: k, p: [cx, 0, cz], yaw: N.hash(i, j, 730 + q) * 6.28, target: null, t: Math.random() * 5, hop: 0, flee: 0 });
      }
    }
    if (this.cave && !this.cave.bugs) { this.cave.bugs = true; this.cave.ch.slice(1).forEach((c, q) => this.creatures.push({ type: 'beetle', chunk: 'cave:' + this.cave.key, p: [this.cave.o[0] + c[0], 0, this.cave.o[2] + c[1]], yaw: q, t: 0, hop: 0, flee: 0 })); }
    this.creatures = this.creatures.filter(c => act.has(c.chunk) || (this.cave && c.chunk === 'cave:' + this.cave.key));
    for (const k of [...this.creatureChunks]) if (!act.has(k)) this.creatureChunks.delete(k);
    for (const c of this.creatures) {
      const C = CREATURES[c.type]; c.t -= dt;
      let near = null, nd = 7; for (const p of players) { const d = Math.hypot(p.p[0] - c.p[0], p.p[2] - c.p[2]); if (d < nd) { nd = d; near = p; } }
      let sp = C.speed;
      if (near && c.type !== 'bird') { c.yaw = Math.atan2(c.p[2] - near.p[2], c.p[0] - near.p[0]); sp *= 1.8; c.t = 1; }
      else if (c.t <= 0) { c.t = 2 + Math.random() * 4; c.idle = Math.random() < 0.4; c.yaw += (Math.random() - 0.5) * 2.5; }
      if (c.idle && !near) sp = 0;
      const nx = c.p[0] + Math.cos(c.yaw) * sp * dt, nz = c.p[2] + Math.sin(c.yaw) * sp * dt;
      const gnd = this.cave ? this.cave.floor(nx, nz) : this.T.ground(nx, nz);
      const water = !this.cave && gnd < SEA - 0.3;
      if (C.swim ? (gnd > SEA - 1.2) : (water && !C.fly)) { c.yaw += Math.PI * 0.7; continue; }
      c.p[0] = nx; c.p[2] = nz;
      if (C.swim) c.p[1] = SEA - 0.8 + Math.sin(c.t * 2) * 0.2;
      else if (C.fly) c.p[1] = gnd + 1.5 + Math.sin(performance.now() / 300 + c.yaw) * 0.6;
      else { if (C.hop && sp > 0) { c.hop += dt * 6; c.p[1] = gnd + Math.abs(Math.sin(c.hop)) * 0.5; } else c.p[1] = gnd; }
      c.vis = !(c.type === 'moth' && !night);
    }
    // birds circle in the sky in a few flocks
    if (!this.cave && this.birds.length === 0) for (let f = 0; f < 3; f++) for (let k = 0; k < 5; k++) this.birds.push({ f, k, ph: Math.random() * 6 });
    this.birdCenter = this.birdCenter || [me.p[0], me.p[2]];
    if (Math.hypot(this.birdCenter[0] - me.p[0], this.birdCenter[1] - me.p[2]) > 300) this.birdCenter = [me.p[0], me.p[2]];
  }

  // ---------- camera ----------
  updateCamera(target, dt) {
    const c = this.cam, t = [target[0], target[1] + 0.6, target[2]];
    c.target = c.target[1] || c.target[0] ? c.target.map((v, i) => (Math.abs(t[i] - v) > 30 ? t[i] : v + (t[i] - v) * Math.min(1, dt * 10))) : t;
    const dir = [Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch)];
    let d = c.dist;
    for (let s = 0.5; s < c.dist; s += 0.4) {
      const x = c.target[0] + dir[0] * s, y = c.target[1] + dir[1] * s, z = c.target[2] + dir[2] * s;
      const blocked = this.cave ? (y > this.cave.ceil(x, z) - 0.3 || y < this.cave.floor(x, z) + 0.3) : y < this.T.ground(x, z) + 0.4;
      const part = this.B.get(Math.floor(x), Math.floor(y), Math.floor(z));
      if (blocked || (part && PARTS[part.id].cat === 'blocks' && !PARTS[part.id].glass)) { d = Math.max(0.9, s - 0.4); break; }
    }
    if (insideStation(c.target)) { const R = STATION.R - 2, cc = [STATION.x, STATION.ground, STATION.z]; while (d > 1 && Math.hypot(c.target[0] + dir[0] * d - cc[0], c.target[1] + dir[1] * d - cc[1], c.target[2] + dir[2] * d - cc[2]) > R) d -= 0.5; }
    c.eye = [c.target[0] + dir[0] * d, c.target[1] + dir[1] * d, c.target[2] + dir[2] * d];
  }
  forward() { return [-Math.sin(this.cam.yaw), -Math.cos(this.cam.yaw)]; }
  ray(sx, sy) {
    const c = this.cam, f = [c.target[0] - c.eye[0], c.target[1] - c.eye[1], c.target[2] - c.eye[2]], fl = Math.hypot(...f); f[0] /= fl; f[1] /= fl; f[2] /= fl;
    let r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r); r = r.map(x => x / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], th = Math.tan(this.fov / 2), asp = this.w / this.h;
    const nx = (sx / this.w) * 2 - 1, ny = 1 - (sy / this.h) * 2;
    const d = [0, 1, 2].map(i => f[i] + r[i] * nx * th * asp + u[i] * ny * th), dl = Math.hypot(...d);
    return { o: [...c.eye], d: d.map(x => x / dl) };
  }
  // what the pointer is aiming at: {p (hit point), n (normal), part (cell key) }
  pick(sx, sy, maxD) {
    const { o, d } = this.ray(sx, sy); let best = null;
    // built parts: step through cells
    let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
    const st = d.map(v => Math.sign(v)), td = d.map(v => v ? Math.abs(1 / v) : 1e9);
    const tm = [0, 1, 2].map(i => { const c = [x, y, z][i]; return d[i] > 0 ? (c + 1 - o[i]) * td[i] : d[i] < 0 ? (o[i] - c) * td[i] : 1e9; });
    let n = [0, 1, 0], t = 0;
    while (t < maxD) {
      if (this.B.get(x, y, z) && t > 0.3) { best = { t, n: [...n], part: [x, y, z] }; break; }
      const a = tm[0] < tm[1] ? (tm[0] < tm[2] ? 0 : 2) : (tm[1] < tm[2] ? 1 : 2);
      t = tm[a]; tm[a] += td[a]; if (a === 0) x += st[0]; else if (a === 1) y += st[1]; else z += st[2]; n = [0, 0, 0]; n[a] = -st[a];
    }
    const lim = best ? best.t : maxD;
    // terrain or cave floor
    let prev = 0;
    for (let s = 0.3; s < lim; s += 0.35) {
      const px = o[0] + d[0] * s, py = o[1] + d[1] * s, pz = o[2] + d[2] * s;
      const g = this.cave ? this.cave.floor(px, pz) : this.T.ground(px, pz);
      if (py < g) { let lo = prev, hi = s; for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; const mx = o[0] + d[0] * m, mz = o[2] + d[2] * m; if (o[1] + d[1] * m < (this.cave ? this.cave.floor(mx, mz) : this.T.ground(mx, mz))) hi = m; else lo = m; } best = { t: hi, n: [0, 1, 0], ground: true }; break; }
      prev = s;
    }
    // structures
    const tris = []; for (let s = 0; s < (best ? best.t : maxD); s += 6) this.St.grid.near(o[0] + d[0] * s, o[2] + d[2] * s, 6, tris);
    for (const tr of tris) { const tt = rayTri(o, d, tr[0], tr[1], tr[2]); if (tt > 0.3 && (!best || tt < best.t)) best = { t: tt, n: tr.n || [0, 1, 0], struct: true }; }
    if (!best) return null;
    best.p = [o[0] + d[0] * best.t, o[1] + d[1] * best.t, o[2] + d[2] * best.t];
    return best;
  }

  // ---------- drawing ----------
  render(players, me, o) {
    const gl = this.gfx.gl, G = this.gfx, c = this.cam, now = o.now;
    this.cave = this.caveAt(me.p) || (this.cave && me.p[1] < -150 ? this.cave : null);
    const inSt = insideStation(c.target);
    const k = Math.min(1, o.dark / 0.72);
    let sky = [0.55 * (1 - k) + 0.05 * k, 0.78 * (1 - k) + 0.07 * k, 0.96 * (1 - k) + 0.17 * k];
    const dusk = Math.max(0, 1 - Math.abs(k - 0.45) * 3) * 0.5; sky = sky.map((v, i) => v * (1 - dusk) + [0.98, 0.6, 0.45][i] * dusk);
    let amb = [0.38 * (1 - k) + 0.07 * k, 0.42 * (1 - k) + 0.09 * k, 0.5 * (1 - k) + 0.2 * k], gnd = [0.26 * (1 - k) + 0.05, 0.24 * (1 - k) + 0.05, 0.2 * (1 - k) + 0.1], sunC = [0.62 * (1 - k) + 0.03, 0.6 * (1 - k) + 0.03, 0.54 * (1 - k) + 0.07];
    let fog = sky, fogD = 1 / (this.radius * CHUNK * 0.62);
    if (this.cave) { sky = [0.02, 0.02, 0.04]; fog = sky; amb = [0.1, 0.1, 0.14]; gnd = [0.05, 0.05, 0.07]; sunC = [0, 0, 0]; fogD = 1 / 45; }
    else if (inSt) { amb = [0.24, 0.32, 0.36]; gnd = [0.12, 0.16, 0.18]; sunC = sunC.map(v => v * 0.3); fog = [0.05, 0.12, 0.14]; fogD = 1 / 110; }
    gl.clearColor(sky[0], sky[1], sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const proj = M4.persp(this.fov, this.w / this.h, 0.1, this.radius * CHUNK * 1.3 + 200), view = M4.lookAt(c.eye, c.target, [0, 1, 0]);
    this.vp = M4.mul(proj, view);
    const sa = o.sunAngle, sun = [Math.cos(sa) * 0.5, Math.max(0.2, Math.sin(sa)), 0.55], sl = Math.hypot(...sun);
    // lights near the camera
    const L = [];
    const addL = (p, r, col) => { const d = Math.hypot(p[0] - c.target[0], p[2] - c.target[2]); if (d < 90) L.push([p, r, col, d]); };
    for (const s of this.landmarks) for (const l of s.lights) addL(l.p, l.r, l.c);
    for (const s of this.St.list.values()) if (s) for (const l of s.lights) addL(l.p, l.r, l.c);
    if (this.cave) for (const l of this.cave.lights) addL(l.p, l.r, l.c);
    for (const [kk, part] of this.B.parts) if (part.id === 60 && this.active(kk)) { const [x, y, z] = unkey(kk); addL([x + 0.5, y + 0.6, z + 0.5], 9, [1, 0.85, 0.5]); }
    for (const p of players) if (p.glow) addL([p.p[0], p.p[1] + 0.4, p.p[2]], 10, [0.5, 0.85, 1]);
    if (this.cave) addL([me.p[0], me.p[1] + 1.2, me.p[2]], 10, [0.6, 0.55, 0.45]);
    L.sort((a, b) => a[3] - b[3]);
    const lp = new Float32Array(32), lc = new Float32Array(24), lk = this.cave || inSt ? 1 : Math.min(1, o.dark / 0.45) * 0.85 + 0.15;
    L.slice(0, 8).forEach((l, i) => { lp.set([l[0][0], l[0][1], l[0][2], l[1]], i * 4); lc.set(l[2].map(v => v * lk), i * 3); });
    G.scene({ vp: this.vp, sun: sun.map(v => v / sl), sunC, sky: amb, ground: gnd, fog, fogD, eye: c.eye, lp, lc });

    // stream terrain chunks
    const ccx = Math.floor(c.target[0] / CHUNK), ccz = Math.floor(c.target[2] / CHUNK), RAD = this.radius;
    if (!this.cave) {
      const want = [];
      for (let z = ccz - RAD; z <= ccz + RAD; z++) for (let x = ccx - RAD; x <= ccx + RAD; x++) {
        const d = Math.hypot(x - ccx, z - ccz); if (d > RAD + 0.5) continue;
        if (!this.chunks.has(x + ',' + z)) want.push([d, x, z]);
      }
      want.sort((a, b) => a[0] - b[0]);
      let t0 = performance.now();
      for (const [, x, z] of want) { if (performance.now() - t0 > (o.budget || 10)) break; const ch = buildTerrainChunk(G, this.T, x, z); ch.items = this.chunkItems(x, z); this.chunks.set(x + ',' + z, ch); }
      for (const [kk, ch] of this.chunks) { const [x, z] = kk.split(',').map(Number); if (Math.hypot(x - ccx, z - ccz) > RAD + 2.5) { G.free(ch.mesh); this.chunks.delete(kk); } }
      this.St.update(G, c.target[0], c.target[2], RAD * CHUNK + 60);
    }
    // parts
    for (const kk of this.partDirty) { const old = this.partChunks.get(kk); if (old) { G.free(old.mesh); G.free(old.clear); } this.partChunks.set(kk, this.buildPartChunk(kk)); }
    this.partDirty.clear();
    if (this.wiresDirty) this.rebuildWires();

    gl.disable(gl.BLEND);
    const vis = (x, z, r) => { const dx = x - c.target[0], dz = z - c.target[2]; return dx * dx + dz * dz < (r * r); };
    const far = RAD * CHUNK + 40;
    if (!this.cave) for (const [kk, ch] of this.chunks) { const [x, z] = kk.split(',').map(Number); if (Math.hypot(x - ccx, z - ccz) <= RAD + 0.5) G.draw(ch.mesh); }
    if (this.cave) G.draw(this.cave.mesh);
    for (const s of this.landmarks) if (vis(s.x, s.z, far + 80)) { G.draw(s.mesh); if (s.inside) G.draw(s.inside); }
    if (!this.cave) for (const s of this.St.list.values()) if (s && vis(s.x, s.z, far)) G.draw(s.mesh);
    for (const [kk, pc] of this.partChunks) { const [x, z] = kk.split(',').map(Number); if (vis(x * 16 + 8, z * 16 + 8, far)) { G.draw(pc.mesh); for (const [pk, px, py, pz, part] of pc.dyn) { const off = this.partOffset(pk, part), on = this.wired(pk) ? this.power.has(pk) : (PARTS[part.id].input ? this.power.has(pk) : undefined); G.draw(this.partFor(part.id, part.rot, on), M4.model([px + off[0], py + off[1], pz + off[2]])); } } }
    G.draw(this.wireMesh);
    // items
    const t = now / 1000;
    for (const it of o.items) {
      if (!vis(it.p[0], it.p[2], 60)) continue;
      G.draw(this.itemFor(it.type), M4.model([it.p[0], it.p[1] + Math.sin(t * 2 + it.p[0]) * 0.12, it.p[2]], M4.rotY(t * 1.5 + it.p[2])), 1, null, 0.25);
    }
    // race rings
    if (!this.cave) {
      this.rings.forEach((r, i) => { if (!vis(r.x, r.z, far)) return; const m = o.race ? (i === o.race.next ? this.ringNext : i < o.race.next ? this.ringDone : this.ringM) : this.ringM; G.draw(m, M4.model([r.x, r.y, r.z], M4.rotY(r.yaw))); });
      const rs = this.raceStart; G.draw(o.race ? this.ringDone : this.ringNext, M4.model([rs[0], rs[1], rs[2]], [1, 0, 0, 0, 0, 1, 0, -1, 0], 0.7));
    }
    // creatures
    for (const cr of this.creatures) { if (cr.vis === false || !vis(cr.p[0], cr.p[2], 120)) continue; G.draw(this.creatureFor(cr.type), M4.model(cr.p, M4.rotY(-cr.yaw))); }
    if (!this.cave && o.dark < 0.5) for (const b of this.birds) { const a = t * 0.25 + b.f * 2.1 + b.k * 0.18, R = 40 + b.f * 15; const p = [this.birdCenter[0] + Math.cos(a + b.f) * R + b.k * 1.5, 45 + b.f * 8 + Math.sin(t + b.k) * 2, this.birdCenter[1] + Math.sin(a + b.f) * R]; G.draw(this.creatureFor('bird'), M4.model(p, M4.mul3(M4.rotY(-a - Math.PI / 2), M4.rotX(Math.sin(t * 8 + b.k) * 0.4)))); }
    // players
    for (const p of players) G.draw(this.ballFor(p.color, p.hat), M4.model(p.p, p.R, (p.r || 0.45) / 0.45));
    // see-through things last
    gl.enable(gl.BLEND); gl.depthMask(false);
    for (const p of players) {
      const gy = this.cave ? this.cave.floor(p.p[0], p.p[2]) : Math.max(this.T.ground(p.p[0], p.p[2]), SEA - 0.1), hgt = p.p[1] - gy;
      if (hgt < 0 || hgt > 24 || insideStation(p.p)) continue;
      G.draw(this.shadow, M4.model([p.p[0], gy + 0.05, p.p[2]], null, (p.r || 0.45) * (1 - Math.min(0.6, hgt / 12))), Math.max(0.2, 1 - hgt / 14));
    }
    if (!this.cave) {
      G.draw(this.water, M4.model([Math.round(c.target[0] / 40) * 40, SEA - 0.1, Math.round(c.target[2] / 40) * 40]), 1, [1, 1, 1], 0);
      for (let q = 0; q < 14; q++) { const cx = Math.floor(c.target[0] / 300) * 300 + (q % 4) * 140 - 210 + ((t * 2 + q * 37) % 300) - 150, cz = Math.floor(c.target[2] / 300) * 300 + Math.floor(q / 4) * 140 - 210; G.draw(this.cloudM, M4.model([cx, 110 + (q % 3) * 12, cz], M4.rotY(q)), 0.9, o.dark > 0.3 ? [0.3, 0.32, 0.4] : [1, 1, 1], 1); }
    }
    for (const pc of this.partChunks.values()) G.draw(pc.clear);
    if (o.cursor) G.draw(this.cursorM, M4.model(o.cursor.cell), 1, o.cursor.ok ? [1, 1, 1] : [1, 0.3, 0.3], 1);
    gl.depthMask(true);
    this.drawOverlay(players, me, o);
  }
  project(x, y, z) {
    const m = this.vp, cw = m[3] * x + m[7] * y + m[11] * z + m[15]; if (cw < 0.1) return null;
    const cx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw, cy = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw;
    return [(cx * 0.5 + 0.5) * this.w, (1 - (cy * 0.5 + 0.5)) * this.h, cw];
  }
  drawOverlay(players, me, o) {
    const g = this.o; g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, this.w, this.h); g.textAlign = 'center';
    const labels = [];
    for (const p of players) { const s = this.project(p.p[0], p.p[1] + (p.r || 0.45) + 0.6 + (p.hat && p.hat !== 'none' ? 0.4 : 0), p.p[2]); if (s && s[2] < 70) labels.push([s, p]); }
    labels.sort((a, b) => b[0][2] - a[0][2]);
    for (const [s, p] of labels) this.label(g, s[0], s[1], p, o.now, s[2]);
    const sign = (x, y, z, text, col, maxD = 50) => { const s = this.project(x, y, z); if (!s || s[2] > maxD) return; g.font = '700 13px system-ui'; const w = g.measureText(text).width + 18; g.globalAlpha = Math.min(1, (maxD - s[2]) / 10); g.fillStyle = 'rgba(10,16,34,.72)'; this.rr(g, s[0] - w / 2, s[1] - 12, w, 22, 8); g.fill(); g.fillStyle = col; g.fillText(text, s[0], s[1] + 4); g.globalAlpha = 1; };
    if (!this.cave) {
      for (const s of this.landmarks) { if (s.signs) for (const sg of s.signs) sign(sg.p[0], sg.p[1], sg.p[2], sg.t, '#5ff0e0', s.station ? 160 : 60); }
      for (const s of this.St.list.values()) if (s && s.label) sign(s.x, s.y + (s.type === 'cave' ? 9 : 12), s.z, s.label, '#ffd27a', 70);
      const pk = this.landmarks[1]; sign(pk.start[0], pk.start[1] + 2.5, pk.start[2], 'Parkour climb: trophy at the top', '#b8a8ff', 50);
      if (!o.race) sign(this.raceStart[0], this.raceStart[1] + 1.6, this.raceStart[2], 'Ring race: roll here to start', '#ffc45a', 45);
      else { const r = this.rings[o.race.next]; if (r) { const s = this.project(r.x, r.y + 2.2, r.z); if (s) { g.font = '800 16px system-ui'; g.fillStyle = '#ffc45a'; g.fillText(String(o.race.next + 1), s[0], s[1]); } } }
    } else sign(this.cave.exit[0], this.cave.exit[1] + 2.4, this.cave.exit[2], 'Way out', '#ffc45a', 40);
    if (o.wireFrom) { const [x, y, z] = o.wireFrom; const s = this.project(x + 0.5, y + 1.2, z + 0.5); if (s) { g.font = '700 12px system-ui'; g.fillStyle = '#ff8a5a'; g.fillText('wire from here', s[0], s[1]); } }
    this.drawMinimap(g, players, me);
  }
  label(g, x, y, p, now, dist) {
    const sc = Math.max(0.7, Math.min(1.1, 14 / dist)); g.save(); g.translate(x, y); g.scale(sc, sc);
    g.font = '600 12px system-ui'; const tag = (p.admin ? '★ ' : '') + p.name, w = g.measureText(tag).width + 26;
    g.fillStyle = p.admin ? 'rgba(120,80,0,.75)' : 'rgba(0,0,0,.5)'; this.rr(g, -w / 2, -9, w, 18, 7); g.fill();
    g.fillStyle = p.admin ? '#ffd27a' : '#fff'; g.fillText(tag, -7, 4);
    drawDeviceIcon(g, p.devType, w / 2 - 10, 0, p.admin ? '#ffd27a' : 'rgba(255,255,255,.85)');
    if (p.say && now - p.sayAt < 6000) {
      g.font = '13px system-ui'; const lines = this.wrap(g, p.say, 180), lh = 16, bw = Math.min(196, Math.max(...lines.map(l => g.measureText(l).width)) + 18), bh = lines.length * lh + 10, by = -14 - bh;
      g.fillStyle = 'rgba(255,255,255,.96)'; this.rr(g, -bw / 2, by, bw, bh, 9); g.fill(); g.beginPath(); g.moveTo(-5, by + bh); g.lineTo(5, by + bh); g.lineTo(0, by + bh + 6); g.fill();
      g.fillStyle = '#1b1b2b'; lines.forEach((l, i) => g.fillText(l, 0, by + 18 + i * lh));
    }
    if (p.emote && now - p.emoteAt < 2500) { const t = (now - p.emoteAt) / 2500; g.globalAlpha = 1 - t * t; g.font = '26px system-ui'; g.fillText(p.emote, 0, -30 - t * 26 - (p.say && now - p.sayAt < 6000 ? 40 : 0)); g.globalAlpha = 1; }
    g.restore();
  }
  wrap(g, text, max) { const words = text.split(/\s+/), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines.slice(0, 4); }
  rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // minimap redraws a few rows each frame around where you are
  drawMinimap(g, players, me) {
    const S = 100, span = 520, mg = this.mini.getContext('2d');
    if (!this.miniCenter || Math.hypot(me.p[0] - this.miniCenter[0], me.p[2] - this.miniCenter[1]) > 120) { this.miniCenter = [Math.round(me.p[0]), Math.round(me.p[2])]; this.miniRow = 0; }
    if (this.miniRow < S && !this.cave) {
      const img = mg.createImageData(S, 4);
      for (let r = 0; r < 4 && this.miniRow + r < S; r++) for (let i = 0; i < S; i++) {
        const x = this.miniCenter[0] + (i / S - 0.5) * span, z = this.miniCenter[1] + ((this.miniRow + r) / S - 0.5) * span, inf = this.T.info(x, z);
        const c = hex(inf.h < -1.2 ? '#2c74b8' : BIOMES[inf.b].ground), k = 0.75 + Math.min(0.4, Math.max(0, inf.h) / 120);
        img.data.set([c[0] * 255 * k, c[1] * 255 * k, c[2] * 255 * k, 255], (r * S + i) * 4);
      }
      mg.putImageData(img, 0, this.miniRow); this.miniRow += 4;
    }
    const size = this.w < 700 ? 92 : 128, x = this.w - size - 10, y = 10 + (parseFloat(getComputedStyle(document.body).getPropertyValue('--sat')) || 0);
    g.save(); g.beginPath(); g.arc(x + size / 2, y + size / 2, size / 2, 0, 7); g.clip();
    g.fillStyle = '#0a1124'; g.fillRect(x, y, size, size);
    const sc = size / span, ox = x + size / 2 - (me.p[0] - this.miniCenter[0]) * sc, oy = y + size / 2 - (me.p[2] - this.miniCenter[1]) * sc;
    if (!this.cave) g.drawImage(this.mini, ox - size / 2, oy - size / 2, size, size);
    for (const p of players) { g.fillStyle = p === me ? '#fff' : p.color; g.beginPath(); g.arc(x + size / 2 + (p.p[0] - me.p[0]) * sc, y + size / 2 + (p.p[2] - me.p[2]) * sc, p === me ? 3.2 : 2.6, 0, 7); g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(x + size / 2, y + size / 2, size / 2, 0, 7); g.stroke();
    const f = this.forward(); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x + size / 2, y + size / 2); g.lineTo(x + size / 2 + f[0] * 12, y + size / 2 + f[1] * 12); g.stroke();
    // arrows at the edge pointing to the station and the plaza
    const mark = (tx, tz, col, txt) => {
      const dx = tx - me.p[0], dz = tz - me.p[2], d = Math.hypot(dx, dz); let px, py;
      if (d * sc < size / 2 - 6) { px = x + size / 2 + dx * sc; py = y + size / 2 + dz * sc; } else { px = x + size / 2 + dx / d * (size / 2 - 6); py = y + size / 2 + dz / d * (size / 2 - 6); }
      g.fillStyle = col; g.beginPath(); g.arc(px, py, 4.5, 0, 7); g.fill(); g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.stroke();
      if (txt) { g.font = '700 10px system-ui'; g.fillStyle = col; g.fillText(txt, px, py + 14); }
    };
    mark(STATION.x, STATION.z, '#5ff0e0', 'Station'); mark(0, 0, '#ffc45a', '');
    g.font = '600 10px system-ui'; g.fillStyle = 'rgba(255,255,255,.8)';
    const b = this.cave ? 'Cave' : insideStation(me.p) ? 'Inside the station' : BIOMES[this.T.info(me.p[0], me.p[2]).b].name;
    g.fillText(b, x + size / 2, y + size + 13);
  }
}
