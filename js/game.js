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
  constructor(canvas, overlay, seed, B, region) {
    this.gfx = makeGfx(canvas, (() => { let q = null; try { q = window.NAUTIC_BETA && localStorage.getItem('funz.gfx'); } catch (e) {} return q === 'low' || q === 'mid' || q === 'high' ? q : Device.type === 'computer' ? 'high' : 'mid'; })()); this.canvas = canvas; this.ov = overlay; this.o = overlay.getContext('2d');
    this.region = region || null; REGION_NOW = this.region;
    this.T = new Terrain(region ? REGIONS[region].seed : seed, region ? REGIONS[region].theme : null); this.St = new Structures(this.T); this.B = B;
    this.chunks = new Map(); this.models = new Map(); this.itemModels = {}; this.creatureModels = {};
    this.realms = {}; this.realm = null;
    if (this.region) { // a travel region: its own places, none of Berekor's
      this.landmarks = this.region === 'dustmaw' ? buildDustLandmarks(this.gfx, this.St, this.T) : buildRegionLandmarks(this.gfx, this.St, this.T, this.region, this);
      this.park = this.sky = this.pier = this.arena = null; this.cannons = []; this.cannonM = null; this.portals = []; this.portalM = [];
      this.rings = []; this.raceStart = [1e6, -1e6, 1e6];
    } else {
      this.landmarks = buildLandmarks(this.gfx, this.St);
      this.park = new FunPark(this); this.landmarks.push(this.park.build(this.gfx, this.St));
      this.sky = new SkyRace(this, this.park); this.landmarks.push(this.sky.build(this.gfx, this.St));
      this.pier = new FishingPier(this); this.landmarks.push(this.pier.build(this.gfx, this.St));
      this.arena = new GameArena(this); this.landmarks.push(this.arena.build(this.gfx, this.St));
      // sky islands, cannons, and the portals to the special worlds
      for (const isle of buildSkyIslands(this.gfx, this.St)) this.landmarks.push(isle);
      if (VOLCANO.on) this.landmarks.push(buildVolcano(this.gfx, this.T));
      this.cannons = cannonList(this.T); this.cannonM = cannonModel(this.gfx); // a cannon near the plaza shoots you up to the sky islands, and cannons hop you between them
      const T0 = this.T;
      this.portals = [
        { kind: 'space', p: [STATION.x + STATION.R + 26, T0.ground(STATION.x + STATION.R + 26, STATION.z) + 1, STATION.z], r: 2.6, label: 'Space elevator', col: '#b48cff' },
        { kind: 'sea', p: [-560, 0.4, 84], r: 2.8, label: 'Dive to the Coral kingdom', col: '#5ff0e0' },
        { kind: 'crystal', p: [-140, T0.ground(-140, 120) + 1, 120], r: 2.6, label: 'Crystal hollow', col: '#ff8ff0' },
      ];
      PORTALS.push(...this.portals);
      this.portalM = this.portals.map(pt => { const mb = new MeshBuilder(); mb.push(pt.p, M4.rotX(Math.PI / 2)); mb.tor([0, 0, 0], 2.2, 0.28, 40, 10, glowC(hex(pt.col))); mb.pop(); mb.push([pt.p[0], pt.p[1] - 1.2, pt.p[2]]); mb.lathe([[3.2, -0.6], [3.4, 0], [3, 0.5], [0, 0.55]], 24, hex('#5a5f70'), 0.2); mb.pop(); return mb.build(this.gfx); });
      const rr = raceRings(this.T); this.rings = rr.rings; this.raceStart = rr.start;
    }
    this.ringM = this.ringModel('#48d6ac'); this.ringNext = this.ringModel('#ffc45a'); this.ringDone = this.ringModel('#8a93a8');
    this.water = this.waterModel(); this.shadow = this.shadowModel(); this.cursorM = this.cursorModel(); this.cloudM = buildCloudModels(this.gfx, this.T.N); this.cloudCells = new Map(); this.flash = 0; this.rain = 0;
    this.fx = new Particles();
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
    // the 3D picture is drawn a bit smaller than the screen when the device is slow (this.scale), the labels stay sharp
    const dpr = Math.min(window.devicePixelRatio || 1, 2), gdpr = Math.min(dpr, this.maxDpr || 1.5) * (this.scale || 1);
    this.dpr = dpr; this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = Math.round(this.w * gdpr); this.canvas.height = Math.round(this.h * gdpr);
    this.ov.width = Math.round(this.w * dpr); this.ov.height = Math.round(this.h * dpr);
    this.gfx.setSize(this.canvas.width, this.canvas.height);
    // room for notches on phones
    let pr = document.getElementById('safeProbe');
    if (!pr) { pr = document.createElement('div'); pr.id = 'safeProbe'; pr.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right)'; document.body.appendChild(pr); }
    const cs = getComputedStyle(pr); this.safeTop = parseFloat(cs.paddingTop) || 0; this.safeRight = parseFloat(cs.paddingRight) || 0;
  }
  rigFor(k, fn) { return this.models.get(k) || (this.models.set(k, fn(this.gfx)), this.models.get(k)); }
  gadgetFor(id) { const k = 'g:' + id; return this.models.get(k) || (this.models.set(k, gadgetModel(this.gfx, id)), this.models.get(k)); }
  hatFor(h) { if (!h || h === 'none') return null; return this.models.get(h) || (this.models.set(h, hatModel(this.gfx, h)), this.models.get(h)); }
  itemFor(t) { return this.itemModels[t] || (this.itemModels[t] = itemModel(this.gfx, t)); }
  creatureFor(t) {
    if (this.creatureModels[t]) return this.creatureModels[t];
    const C = CREATURES[t];
    if (!C || !C.like) return (this.creatureModels[t] = creatureRig(this.gfx, t));
    // a mod creature: the creature it is based on, painted in its own colour (eyes, noses and claws keep theirs)
    const tint = C.tint ? hex(C.tint) : null, build = MeshBuilder.prototype.build;
    if (tint) { const tl = 0.3 * tint[0] + 0.59 * tint[1] + 0.11 * tint[2] || 0.3;
      MeshBuilder.prototype.build = function (gl) { const v = this.v; for (let i = 0; i < v.length; i += 10) { const r = v[i + 6], g = v[i + 7], b = v[i + 8], L = 0.3 * r + 0.59 * g + 0.11 * b, sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (L < 0.14 || (L > 0.86 && sat < 0.12) || v[i + 9] < 0.95 && v[i + 9] > 0.85) continue; const k = Math.min(1.6, L / tl); v[i + 6] = Math.min(1, tint[0] * k); v[i + 7] = Math.min(1, tint[1] * k); v[i + 8] = Math.min(1, tint[2] * k); } return build.call(this, gl); }; }
    try { return (this.creatureModels[t] = creatureRig(this.gfx, C.like)); } finally { MeshBuilder.prototype.build = build; }
  }
  partFor(id, rot, on) { const k = id + ':' + rot + ':' + on; if (!this.partModels.has(k)) this.partModels.set(k, partModel(this.gfx, id, rot, on)); return this.partModels.get(k); }
  ringModel(c) { const mb = new MeshBuilder(), col = glowC(hex(c)); mb.push([0, 0, 0], M4.rotX(Math.PI / 2)); mb.tor([0, 0, 0], 1.5, 0.17, 40, 10, col); mb.pop(); return mb.build(this.gfx); }
  waterModel() { const mb = new MeshBuilder(), c = hex('#1d6fbf', 0.7), N = 90, E = 10; for (let i = -N / 2; i < N / 2; i++) for (let j = -N / 2; j < N / 2; j++) mb.quad([i * E, 0, j * E], [i * E, 0, (j + 1) * E], [(i + 1) * E, 0, (j + 1) * E], [(i + 1) * E, 0, j * E], c); return mb.build(this.gfx); }
  shadowModel() { const mb = new MeshBuilder(); for (let j = 0; j < 20; j++) { const a = j / 20 * 6.28, b = (j + 1) / 20 * 6.28; for (const [r0, r1, al] of [[0, 0.6, 0.2], [0.6, 1, 0.1]]) { mb.tri([Math.cos(a) * r0, 0, Math.sin(a) * r0], [Math.cos(b) * r1, 0, Math.sin(b) * r1], [Math.cos(a) * r1, 0, Math.sin(a) * r1], [0, 0, 0, al]); if (r0) mb.tri([Math.cos(a) * r0, 0, Math.sin(a) * r0], [Math.cos(b) * r0, 0, Math.sin(b) * r0], [Math.cos(b) * r1, 0, Math.sin(b) * r1], [0, 0, 0, al]); } } return mb.build(this.gfx); }
  cursorModel() { const mb = new MeshBuilder(), c = [1, 1, 1, 0.16]; mb.box(-0.02, -0.02, -0.02, 1.02, 1.02, 1.02, c, false); return mb.build(this.gfx); }
  cloudModel(seed) {
    // a big soft puffy cloud: a flat base with round puffs on top
    const mb = new MeshBuilder(), N = this.T.N, n = 6 + Math.floor(N.hash(seed, 1, 900) * 5), L = 26 + N.hash(seed, 2, 900) * 22;
    const col = (nx, ny) => ny < -0.35 ? [0.8, 0.84, 0.94, 1] : ny < 0 ? [0.92, 0.94, 0.99, 1] : [1, 1, 1, 1];
    mb.sph([0, 0, 0], [L * 0.62, 4, L * 0.32], 12, col, 0.1);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n - 0.5, x = t * L * 1.05 + (N.hash(seed, k, 901) - 0.5) * 5, z = (N.hash(seed, k, 903) - 0.5) * L * 0.35;
      const r = (7 + N.hash(seed, k, 902) * 6) * (1 - Math.abs(t) * 0.9);
      mb.sph([x, r * 0.35, z], [r, r * 0.85, r * 0.9], 12, col, 0.12);
    }
    return mb.build(this.gfx);
  }
  rgb3(h) { let v = this._rgb && this._rgb.get(h); if (!v) { (this._rgb || (this._rgb = new Map())).set(h, v = new Float32Array(hex(h || '#48d6ac').slice(0, 3))); } return v; }

  // ---------- building changes ----------
  partChanged(x, y, z) { this.partDirty.add(Math.floor(x / 16) + ',' + Math.floor(z / 16)); this.wiresDirty = true; }
  allPartsChanged() { for (const k of this.partChunks.keys()) this.partDirty.add(k); for (const [k] of this.B.parts) { const [x, , z] = unkey(k); this.partDirty.add(Math.floor(x / 16) + ',' + Math.floor(z / 16)); } this.wiresDirty = true; }
  static isStatic(id) { return PARTS[id].cat === 'blocks' || id === 47; }
  buildPartChunk(key) {
    const [px, pz] = key.split(',').map(Number), mb = new MeshBuilder(), clear = new MeshBuilder(), dyn = [];
    for (const [k, part] of this.B.parts) {
      const [x, y, z] = unkey(k); if (Math.floor(x / 16) !== px || Math.floor(z / 16) !== pz) continue;
      if (!Game.isStatic(part.id)) { dyn.push([k, x, y, z, part]); continue; }
      const P = PARTS[part.id], c0 = shadeC(hex(P.color), 0.95 + this.T.N.hash(x, z + y * 7, 3) * 0.1), c = P.glow ? glowC(c0) : c0, target = P.glass ? clear : mb;
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
    const gd = opts.g || new Set(), md = opts.mod || {}, mSp = md.speed > 0 ? md.speed : 1, maxS = 8 * (opts.fast ? 1.7 : 1) * (gd.has('jets') ? 1.45 : 1) * (opts.slow || 1) * mSp, acc = (b.grounded ? 28 : 11) * (gd.has('jets') ? 1.3 : 1) * Math.max(1, mSp);
    // on the ground, push along the slope (so hills can be climbed) instead of into it
    let ax = input.x, ay = 0, az = input.z;
    if (b.grounded && b.gn && (ax || az)) {
      const n = b.gn, d = ax * n[0] + az * n[2], tx = ax - n[0] * d, ty = -n[1] * d, tz = az - n[2] * d, tl = Math.hypot(tx, ty, tz);
      if (tl > 1e-4) { const k = Math.hypot(ax, az) / tl; ax = tx * k; ay = ty * k; az = tz * k; }
    }
    v[0] += ax * acc * dt; v[1] += ay * acc * dt; v[2] += az * acc * dt;
    const hs = Math.hypot(v[0], v[2]);
    if (hs > maxS && b.boostT <= 0) { const k = Math.max(maxS / hs, 1 - dt * 4); v[0] *= k; v[2] *= k; }
    if (b.boostT > 0) b.boostT -= dt;
    const slip = b.ground && b.ground.part && PARTS[b.ground.part.id] && PARTS[b.ground.part.id].slippery;
    if (slip) { const k = Math.exp(-0.25 * dt); v[0] *= k; v[2] *= k; }
    else if (!input.x && !input.z && b.grounded) {
      const gentle = !b.gn || b.gn[1] > 0.9, k = Math.exp(-(gentle ? 6 : 3.2) * dt); v[0] *= k; v[2] *= k;
      if (gentle && Math.hypot(v[0], v[2]) < 0.7) { v[0] = 0; v[2] = 0; } // stay put instead of slowly sliding
    }
    v[1] -= (this.realm ? this.realm.grav : 24) * (md.gravity >= 0 && md.gravity != null ? md.gravity : 1) * dt;
    // gadgets that slow your fall: balloon floats, glider glides forward
    if (!b.grounded && input.up && !opts.fly) {
      if (gd.has('balloon') && v[1] < -2.2) v[1] += (-2.2 - v[1]) * Math.min(1, dt * 8);
      if ((gd.has('glider') || gd.has('wings')) && v[1] < -3) { v[1] += (-3 - v[1]) * Math.min(1, dt * 8); v[0] += input.x * 16 * dt; v[2] += input.z * 16 * dt; const h = Math.hypot(v[0], v[2]); if (h > 16) { v[0] *= 16 / h; v[2] *= 16 / h; } }
    }
    const depth = (this.cave || this.realm ? -1e9 : SEA - 0.15) - b.p[1];
    if (depth > -b.r) { const sub = Math.min(1, (depth + b.r) / (2 * b.r)), dive = gd.has('snorkel') && input.down; v[1] += (dive ? 14 : 40) * sub * dt; const k = Math.exp(-(gd.has('snorkel') ? 0.9 : 2.2) * sub * dt); v[0] *= k; v[2] *= k; v[1] *= Math.exp(-4.5 * sub * dt); }
    // fans blow you up
    const fx = Math.floor(b.p[0]), fz = Math.floor(b.p[2]);
    for (let dy = 0; dy < 10; dy++) { const y = Math.floor(b.p[1]) - dy, part = this.B.get(fx, y, fz); if (part) { if (part.id === 48 && this.active(pkey(fx, y, fz))) v[1] += (48 - dy * 2.5) * dt; break; } }
    b.airT = b.grounded ? 0 : (b.airT || 0) + dt; b.hopCool = (b.hopCool || 0) - dt;
    if (input.jump && b.hopCool <= 0) {
      if (b.airT < 0.13 || (depth > -0.1 && depth < 0.6)) { v[1] = (opts.superJump || gd.has('spring') ? 13 : gd.has('balloon') ? 11 : 8.8) * Math.sqrt((md.jump > 0 ? md.jump : 1) * (md.gravity > 0 ? md.gravity : 1)); b.airT = 1; b.hopCool = 0.2; opts.fx('jumped'); }
      else if (gd.has('wings') && !b.wn) { v[1] = Math.max(v[1], 8.5); b.hopCool = 0.32; opts.fx('flap'); } // wings: flap again in the air
      else if (b.wn) { v[1] = Math.max(v[1], 7.5); v[0] += b.wn[0] * 3.5; v[2] += b.wn[2] * 3.5; b.hopCool = 0.35; opts.fx('jumped'); } // hop off steep walls so you never get stuck
    }
    b.grounded = false; b.ground = null; b.carry = null; b.gn = null; b.wn = null;
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
    if (dy > 0.55) { b.grounded = true; if (info) b.ground = info; if (!b.gn || dy > b.gn[1]) b.gn = [dx, dy, dz]; }
    else if (dy > 0.2 && (!b.wn || dy > b.wn[1])) b.wn = [dx, dy, dz];
  }
  collide(b) {
    const p = b.p, r = b.r, tris = [];
    if (this.realm) this.realm.grid.near(p[0], p[2], r + 0.5, tris);
    else if (this.cave) this.cave.tris(p[0], p[2], r + 0.1, tris);
    else { // terrain
      for (let i = Math.floor((p[0] - r) / CELL); i <= Math.floor((p[0] + r) / CELL); i++) for (let j = Math.floor((p[2] - r) / CELL); j <= Math.floor((p[2] + r) / CELL); j++) this.T.cellTris(i, j, tris);
      // tunnels/fast falls: never end up under the ground
      const g = this.T.ground(p[0], p[2]); if (p[1] < g + r * 0.2 && p[1] > g - 3 && !insideStation(p) && !this.realm) { p[1] = Math.max(p[1], g + r); if (b.v[1] < 0) b.v[1] = 0; b.grounded = true; }
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
      const off = dynamic ? this.partOffset(k, part) : null, sh = partShape(part, x, y, z, off), info = { k, part, at: [x, y, z], bouncy: !!PARTS[part.id].bouncy };
      if (sh.box) { const [x0, y0, z0, x1, y1, z1] = sh.box; this.push(b, [Math.max(x0, Math.min(x1, p[0])), Math.max(y0, Math.min(y1, p[1])), Math.max(z0, Math.min(z1, p[2]))], info); }
      else if (sh.sphere) { const [sx, sy, sz, sr] = sh.sphere, dx = p[0] - sx, dy = p[1] - sy, dz = p[2] - sz, d = Math.hypot(dx, dy, dz) || 1; this.push(b, [sx + dx / d * sr, sy + dy / d * sr, sz + dz / d * sr], { ...info, bouncy: part.id === 47 }); }
      else for (const t of sh.tris) this.push(b, closestOnTri(p, t[0], t[1], t[2]), info);
      if (dynamic && b.ground && b.ground.k === k) { const prev = b.lastOff && b.lastOff.k === k ? b.lastOff.o : off; b.carry = [off[0] - prev[0], 0, off[2] - prev[2]]; b.lastOff = { k, o: off }; }
    }
    // parts from mods (see modkit.js)
    if (this.mods && !this.realm && !this.cave) this.mods.collide(b, (bb, q) => this.push(bb, q, null), closestOnTri);
    if (this.extras && !this.realm && !this.cave) this.extras.collide(b, (bb, q) => this.push(bb, q, null));
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
    else if (PARTS[id] && PARTS[id].mod) { // blocks from mods
      const P = PARTS[id];
      if (P.hot && b.padCool <= 0) { b.padCool = 1; opts.fx('hot'); return; }
      if (P.launch && b.padCool <= 0) { b.v[1] = P.launch; b.grounded = false; b.padCool = 0.3; opts.fx('jump'); }
      if (P.boost && b.padCool <= 0) { const hs = Math.hypot(b.v[0], b.v[2]); if (hs > 0.5) { b.v[0] = b.v[0] / hs * P.boost; b.v[2] = b.v[2] / hs * P.boost; b.boostT = 1.2; b.padCool = 0.4; opts.fx('speed'); } }
    }
  }
  roll(b, dt) { const v = b.v, hs = Math.hypot(v[0], v[2]); if (hs < 0.01) return; b.R = M4.ortho3(M4.mul3(M4.axisAngle(v[2] / hs, 0, -v[0] / hs, hs * dt / b.r), b.R)); }
  rollBy(p, dx, dz, r) { const d = Math.hypot(dx, dz); if (d < 1e-4 || d > 3) return; p.R = M4.ortho3(M4.mul3(M4.axisAngle(dz / d, 0, -dx / d, d / r), p.R || [1, 0, 0, 0, 1, 0, 0, 0, 1])); }
  // structure doors: caves
  // the special worlds are made the first time someone goes there
  realmGet(kind) { let r = this.realms[kind]; if (!r) { r = this.realms[kind] = new Realm(kind, this.T.N); r.build(this.gfx); } return r; }
  realmAt(p) { for (const k in REALMS) { const o = REALMS[k].o; if (Math.abs(p[0] - o[0]) < 420 && Math.abs(p[2] - o[2]) < 420 && Math.abs(p[1] - o[1]) < 320) return this.realmGet(k); } return null; }
  triggers(b, fx) {
    if (b.tpCool > 0) return;
    // cannons: roll in and fly along an arc to where it points
    if (!this.realm && !this.cave) for (const cn of this.cannons) {
      if (Math.hypot(b.p[0] - cn.p[0], b.p[1] - (cn.p[1] + 1), b.p[2] - cn.p[2]) > 1.7) continue;
      const to = cn.to, d = Math.hypot(to[0] - b.p[0], to[1] - b.p[1], to[2] - b.p[2]), T = Math.max(1.6, Math.min(6.5, d / 80 + 1)), g = 24;
      b.p = [cn.p[0], cn.p[1] + 2.5, cn.p[2]]; b.v = [(to[0] - b.p[0]) / T, (to[1] - b.p[1]) / T + 0.5 * g * T, (to[2] - b.p[2]) / T]; b.boostT = T; b.tpCool = 1; fx('cannon'); return;
    }
    // portals to the special worlds, and the gold ring back
    if (this.realm) { const R = this.realm; if (Math.hypot(b.p[0] - R.exit[0], b.p[1] - R.exit[1], b.p[2] - R.exit[2]) < 2) { const pt = this.portals.find(q => q.kind === R.kind); b.p = [pt.p[0] + 5, pt.p[1] + 2, pt.p[2] + 1]; b.v = [0, 0, 0]; b.tpCool = 1.5; this.realm = null; fx('realm-out', R.kind); } return; }
    for (const pt of this.portals) if (Math.hypot(b.p[0] - pt.p[0], b.p[1] - pt.p[1], b.p[2] - pt.p[2]) < pt.r) { const R = this.realmGet(pt.kind); b.p = [...R.start]; b.v = [0, 0, 0]; b.tpCool = 1.5; this.realm = R; fx('realm-in', pt.kind); return; }
    if (this.cave) {
      const e = this.cave.exit;
      if (Math.hypot(b.p[0] - e[0], b.p[1] - e[1], b.p[2] - e[2]) < 1.8) {
        // come out on the lowest ground near the entrance, so you roll away from it and not back in
        const t = this.cave.ex; let best = null;
        for (let k = 0; k < 16; k++) { const a = k / 16 * 6.2832, x = t.p[0] + Math.cos(a) * 9, z = t.p[2] + Math.sin(a) * 9, gy = this.T.ground(x, z); if (!best || gy < best[1]) best = [x, gy, z]; }
        b.p = [best[0], Math.max(best[1], SEA) + 1.2, best[2]]; b.v = [0, 0, 0]; b.tpCool = 1.5; b.caveLock = t; this.cave = null; fx('cave-out');
      }
      return;
    }
    if (b.caveLock) { const t = b.caveLock; if (Math.hypot(b.p[0] - t.p[0], b.p[2] - t.p[2]) > t.r + 4) b.caveLock = null; }
    for (const s of [...this.St.list.values(), ...(this.region ? this.landmarks : [])]) if (s && s.triggers) for (const t of s.triggers) {
      if (b.caveLock && b.caveLock.cave === t.cave) continue;
      if (Math.hypot(b.p[0] - t.p[0], b.p[1] - t.p[1], b.p[2] - t.p[2]) < t.r) {
        let c = this.caves.get(t.cave); if (!c) { c = t.make ? t.make() : new Cave(this.T.N, t.cave, t); c.build(this.gfx); this.caves.set(t.cave, c); }
        c.ex = t; this.cave = c; b.p = [c.exit[0] + 4.5, c.floor(c.exit[0] + 4.5, c.exit[2]) + 1, c.exit[2]]; b.v = [0, 0, 0]; b.tpCool = 2; fx('cave-in'); return;
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
      const type = r < 0.12 ? 'coin' : ({ 1: 'shell', 2: 'feather', 3: 'mushroom', 4: 'gem', 5: 'crystal', 6: 'crystal', 7: 'mushroom', 8: 'crystal', 12: 'gem', 13: 'gem', 14: 'shell', 16: 'mushroom', 17: 'mushroom', 18: 'crystal', 19: 'crystal', 20: 'gem' }[inf.b] || (BIOMES[inf.b] && BIOMES[inf.b].item) || 'coin');
      out.push({ id: 'c:' + cx + ':' + cz + ':' + k, type, p: [x, y + 0.6, z] });
    }
    return out;
  }
  findItem(id) {
    const s = String(id).split(':');
    if (s[0] === 'c') { const it = this.chunkItems(+s[1], +s[2]).find(i => i.id === id); return it || null; }
    if (s[0] === 'drop') return (this.drops || []).find(d => d.id === id) || null;
    for (const l of this.landmarks) { const it = l.items.find(i => i.id === id); if (it) return it; }
    for (const st of this.St.list.values()) if (st) { const it = st.items.find(i => i.id === id); if (it) return it; }
    for (const c of this.caves.values()) { const it = c.items.find(i => i.id === id); if (it) return it; }
    return undefined; // unknown here (not loaded): trust it
  }
  nearbyItems(p) {
    const out = [];
    if (this.realm) out.push(...this.realm.items);
    else if (this.cave) out.push(...this.cave.items);
    else {
      const cx = Math.floor(p[0] / CHUNK), cz = Math.floor(p[2] / CHUNK);
      for (let i = cx - 2; i <= cx + 2; i++) for (let j = cz - 2; j <= cz + 2; j++) { const ch = this.chunks.get(i + ',' + j); if (ch && ch.items) out.push(...ch.items); }
      for (const st of this.St.list.values()) if (st) out.push(...st.items);
    }
    for (const l of this.landmarks) out.push(...l.items);
    if (this.drops) for (const d of this.drops) if (Math.abs(d.p[0] - p[0]) < 120 && Math.abs(d.p[2] - p[2]) < 120) out.push(d);
    return out;
  }

  // ---------- creatures ----------
  // Every creature's walk is worked out from the shared world clock (wt, in seconds), so everyone online
  // sees the same animals in the same places doing the same thing. Running away from players is worked out
  // from where the players are right now, so that matches for everyone too.
  updateCreatures(dt, me, players, night, wt) {
    const N = this.T.N, pcx = Math.floor(me.p[0] / CHUNK), pcz = Math.floor(me.p[2] / CHUNK), act = new Set();
    this.wt = wt;
    const mk = (type, chunk, home, seed, floor, ok) => ({ type, chunk, home, p: [home[0], 0, home[2]], yaw: seed * 6.28, seed: seed * 97 % 9, id: seed, walk: 0, mv: 0, hop: 0, nb: 1 + seed * 4, graze: 0, calm: 1, floor, ok });
    if (!this.cave && !this.realm) for (let i = pcx - 3; i <= pcx + 3; i++) for (let j = pcz - 3; j <= pcz + 3; j++) {
      const k = i + ',' + j; act.add(k); if (this.creatureChunks.has(k)) continue;
      this.creatureChunks.add(k);
      const x = i * CHUNK + 32, z = j * CHUNK + 32, inf = this.T.info(x, z);
      const types = Object.entries(CREATURES).filter(([, c]) => c.biomes.includes(inf.b)).map(([t]) => t);
      if (!types.length || N.hash(i, j, 700) > 0.55) continue;
      const t = types[Math.floor(N.hash(i, j, 701) * types.length)], n = 1 + Math.floor(N.hash(i, j, 702) * (t === 'fish' ? 5 : 3)), C = CREATURES[t];
      const ok = C.swim ? (x2, z2) => this.T.ground(x2, z2) < SEA - 1.2 : C.fly ? () => true : (x2, z2) => this.T.ground(x2, z2) > SEA + 0.15;
      for (let q = 0; q < n; q++) {
        const cx = x + (N.hash(i, j, 710 + q) - 0.5) * 50, cz = z + (N.hash(i, j, 720 + q) - 0.5) * 50;
        if (!ok(cx, cz)) continue;
        this.creatures.push(mk(t, k, [cx, 0, cz], N.hash(i, j, 730 + q), (x2, z2) => this.T.ground(x2, z2), ok));
      }
    }
    if (this.realm && !this.realm.spawned) { const R = this.realm; R.spawned = true; let q = 0; for (const [type, n] of R.spawnC) for (let k = 0; k < n; k++, q++) { const a = R.R(q, 50) * 6.283, d = 8 + R.R(q, 51) * 70, x = R.o[0] + Math.cos(a) * d, z = R.o[2] + Math.sin(a) * d;
      const ok = (x2, z2) => Math.abs(R.floorAt(x2, z2) - R.o[1]) < 25 && !(R.kind === 'space' && Math.hypot(x2 - R.o[0], z2 - R.o[2]) > 38);
      this.creatures.push(mk(type, 'realm:' + R.kind, [x, 0, z], R.R(q, 52), (x2, z2) => R.floorAt(x2, z2), ok)); } }
    if (this.cave && !this.cave.bugs) { const cv = this.cave; cv.bugs = true; cv.ch.slice(1).forEach((c, q) => this.creatures.push(mk('beetle', 'cave:' + cv.key, [cv.o[0] + c[0], 0, cv.o[2] + c[1]], (q * 0.618) % 1, (x2, z2) => cv.floor(x2, z2), (x2, z2) => Math.hypot(x2 - cv.o[0] - c[0], z2 - cv.o[2] - c[1]) < 5))); }
    this.creatures = this.creatures.filter(c => act.has(c.chunk) || (this.cave && c.chunk === 'cave:' + this.cave.key) || (this.realm && c.chunk === 'realm:' + this.realm.kind));
    if (!this.realm) for (const R of Object.values(this.realms)) R.spawned = false;
    for (const k of [...this.creatureChunks]) if (!act.has(k)) this.creatureChunks.delete(k);
    const H = (id, n, s) => { const v = Math.sin(id * 12.9898 + n * 78.233 + s * 37.719) * 43758.5453; return v - Math.floor(v); };
    for (const c of this.creatures) {
      const C = CREATURES[c.type], ox = c.p[0], oz = c.p[2], sp = C.speed;
      // the walk: a new spot every leg, picked from the clock. walk part of the leg, then rest (or graze)
      const L = 5 + H(c.id, 0, 1) * 4, wf = C.fly || C.swim ? 0.8 : 0.55, off = H(c.id, 0, 2) * 50, T = wt + off, n = Math.floor(T / L), f = T / L - n;
      const rad = C.fly ? 9 : C.swim ? 11 : 13, spot = m => { if (H(c.id, m, 3) < 0.18) return c.home; const a = H(c.id, m, 4) * 6.2832, d = Math.min(rad, sp * L * wf * 0.45) * (0.3 + 0.7 * H(c.id, m, 5)), x = c.home[0] + Math.cos(a) * d, z = c.home[2] + Math.sin(a) * d; return c.ok(x, z) && c.ok((x + c.home[0]) / 2, (z + c.home[2]) / 2) ? [x, 0, z] : c.home; };
      const A = spot(n), B = spot(n + 1), k = Math.min(1, f / wf), e = k * k * (3 - 2 * k);
      let x = A[0] + (B[0] - A[0]) * e, z = A[2] + (B[2] - A[2]) * e;
      const legD = Math.hypot(B[0] - A[0], B[2] - A[2]); let yaw = legD > 0.05 ? Math.atan2(B[2] - A[2], B[0] - A[0]) : H(c.id, n, 6) * 6.28;
      let mvT = f < wf && legD > 0.05 ? 1 : 0, dist = (n * 11 + e * legD);
      // run from players who come close (the same for everyone, because it only uses where the players are)
      let px = 0, pz = 0, near = null, nd = 7;
      if (c.type !== 'bird') for (const p of players) { const dx = x - p.p[0], dz = z - p.p[2], d = Math.hypot(dx, dz); if (d < 7 && d > 0.01) { const w = (7 - d) / 7; px += dx / d * w * 4.5; pz += dz / d * w * 4.5; } if (d < nd) { nd = d; near = p; } }
      if (px || pz) { const nx = x + px, nz = z + pz; if (c.ok(nx, nz)) { x = nx; z = nz; } yaw = Math.atan2(pz, px); mvT = 1; }
      c.yaw = yaw; c.p[0] = x; c.p[2] = z;
      c.calm += ((near ? 0 : 1) - c.calm) * Math.min(1, dt * 3);
      if (near && nd < 1.3 && !c.touched && near === me) { c.touched = true; if (this.onTouch) this.onTouch(c); }
      const gnd = c.floor(x, z);
      if (C.swim) c.p[1] = c.chunk.startsWith('realm:') ? gnd + (c.type === 'jelly' ? 6 : 3) + Math.sin(wt * 2 + c.seed) * 0.6 : SEA - 0.8 + Math.sin(wt * 2 + c.seed) * 0.2;
      else if (C.fly) c.p[1] = gnd + 1.5 + Math.sin(wt * 3.3 + c.seed) * 0.6;
      else if (C.hop && mvT) { c.hop = dist * 1.2 + c.seed; c.p[1] = gnd + Math.abs(Math.sin(c.hop)) * 0.5; }
      else { c.p[1] = gnd; c.hop = 0; }
      c.vis = !(c.type === 'moth' && !night);
      // animation: steps, blinking, grazing
      const moved = Math.hypot(c.p[0] - ox, c.p[2] - oz); c.walk += Math.min(moved, 1) * (C.hop ? 3 : 7); c.mv += (mvT - c.mv) * Math.min(1, dt * 6);
      c.nb -= dt; if (c.nb < -0.13) c.nb = 2 + Math.random() * 4;
      c.graze += ((!mvT && H(c.id, n, 7) < 0.6 && (c.type === 'deer' || c.type === 'goat' || c.type === 'hopper') ? 1 : 0) - c.graze) * Math.min(1, dt * 2);
    }
    // birds circle in flocks over a fixed grid, timed by the shared clock
    if (!this.cave && this.birds.length === 0) for (let f = 0; f < 3; f++) for (let k = 0; k < 5; k++) this.birds.push({ f, k });
    this.birdCenter = [Math.round(me.p[0] / 400) * 400, Math.round(me.p[2] / 400) * 400];
  }

  // ---------- camera ----------
  updateCamera(target, dt) {
    if (this.fpv) { const c = this.cam, cp = Math.cos(c.pitch), d = [-Math.sin(c.yaw) * cp, -Math.sin(c.pitch), -Math.cos(c.yaw) * cp]; c.eye = [...this.fpv]; c.target = [c.eye[0] + d[0], c.eye[1] + d[1], c.eye[2] + d[2]]; return; }
    const c = this.cam, t = [target[0], target[1] + 0.6, target[2]];
    c.target = c.target[1] || c.target[0] ? c.target.map((v, i) => (Math.abs(t[i] - v) > 30 ? t[i] : v + (t[i] - v) * Math.min(1, dt * 10))) : t;
    const dir = [Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch)];
    let d = c.dist;
    for (let s = 0.5; s < c.dist; s += 0.4) {
      const x = c.target[0] + dir[0] * s, y = c.target[1] + dir[1] * s, z = c.target[2] + dir[2] * s;
      const blocked = this.cave ? (y > this.cave.ceil(x, z) - 0.3 || y < this.cave.floor(x, z) + 0.3) : this.realm ? (this.realm.floorAt ? y < this.realm.floorAt(x, z) + 0.4 : false) : y < this.T.ground(x, z) + 0.4;
      const part = this.B.get(Math.floor(x), Math.floor(y), Math.floor(z));
      if (blocked || (part && PARTS[part.id].cat === 'blocks' && !PARTS[part.id].glass)) { d = Math.max(0.9, s - 0.4); break; }
    }
    if (insideStation(c.target)) { const R = STATION.R - 2, cc = [STATION.x, STATION.ground, STATION.z]; while (d > 1 && Math.hypot(c.target[0] + dir[0] * d - cc[0], c.target[1] + dir[1] * d - cc[1], c.target[2] + dir[2] * d - cc[2]) > R) d -= 0.5; }
    c.eye = [c.target[0] + dir[0] * d, c.target[1] + dir[1] * d, c.target[2] + dir[2] * d];
    if (this.shake > 0.01) { const s = this.shake, tt = performance.now() / 1000; c.eye = c.eye.map((v, i) => v + (Math.sin(tt * (31 + i * 7)) * 0.6 + (Math.random() - 0.5) * 0.8) * s * 0.55); }
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

  // clouds the admin put in the sky (everyone sees them)
  addClouds(list) {
    const L = this.extraClouds || (this.extraClouds = []);
    for (const c of list) { if (!c || !this.cloudM[c.kind] || ![c.x, c.y, c.z, c.s, c.rot].every(v => typeof v === 'number' && isFinite(v))) continue; const ms = this.cloudM[c.kind]; L.push({ kind: c.kind, v: c.v | 0, x: c.x, y: Math.max(60, Math.min(1500, c.y)), z: c.z, s: Math.max(0.3, Math.min(3, c.s)), rot: c.rot, ph: c.ph || 0, puffs: ms[(c.v | 0) % ms.length] }); }
    while (L.length > 40) L.shift();
  }
  setWeather(w) { this.wxForce = w; this.cloudCells.clear(); }
  // a lightning strike under a thunderstorm cloud (cl), seen from 'at'
  strike(cl, at) {
    const R = (STORM_KINDS[cl.kind] || STORM_KINDS.cb).bolt * cl.s, a = Math.random() * 6.283, d = Math.random() * R, bx = cl.x + (cl.kind === 'supercell' ? 400 * cl.s : 0) + Math.cos(a) * d, bz = cl.z + Math.sin(a) * d;
    const gy = Math.max(this.T.ground(bx, bz), SEA), top = cl.y - 5, mb = new MeshBuilder(), col = glowC(hex('#e8f0ff'));
    const bolt = (p0, p1, n, w, depth) => {
      let prev = p0;
      for (let k = 1; k <= n; k++) {
        const t = k / n, j = (1 - t * 0.6) * (p1[1] < p0[1] ? (p0[1] - p1[1]) / n : 6) * 0.55;
        const cur = k === n ? p1 : [p0[0] + (p1[0] - p0[0]) * t + (Math.random() - 0.5) * j * 2, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t + (Math.random() - 0.5) * j * 2];
        mb.caps(prev, cur, w, w, 4, col);
        if (depth < 1 && Math.random() < 0.18 && k < n - 2) { const len = (p0[1] - p1[1]) * 0.25; bolt(cur, [cur[0] + (Math.random() - 0.5) * len, cur[1] - len, cur[2] + (Math.random() - 0.5) * len], 5, w * 0.55, depth + 1); }
        prev = cur;
      }
    };
    bolt([bx, top, bz], [bx + (Math.random() - 0.5) * 30, gy, bz + (Math.random() - 0.5) * 30], 16, 0.9, 0);
    (this.bolts = this.bolts || []).push({ mesh: mb.build(this.gfx), t: 0.35 });
    const dist = Math.hypot(bx - at[0], bz - at[2]);
    this.flash = Math.max(this.flash, Math.max(0.25, 1 - dist / 1600));
    setTimeout(() => Sound.play('thunder'), Math.min(4.5, dist / 343) * 1000 + 100);
    if (dist < 60 && this.fx) this.fx.burst([bx, gy + 0.5, bz], 30, { col: [0.9, 0.95, 1], size: 0.2 });
  }
  stat(n) { if (!this.stats) return; const t = this.gfx.tris; this.stats[n] = Math.round(t - (this.statT || 0)); this.statT = t; }
  // ---------- drawing ----------
  render(players, me, o) {
    const gl = this.gfx.gl, G = this.gfx, c = this.cam, now = o.now, t = now / 1000;
    this.cave = this.caveAt(me.p) || (this.cave && me.p[1] < -150 ? this.cave : null);
    this.realm = this.realmAt(me.p); const RL = this.realm; this.under = !!(this.cave || RL);
    const inSt = insideStation(c.target);
    const k = Math.min(1, o.dark / 0.72), day = 1 - k, dusk = Math.max(0, 1 - Math.abs(k - 0.42) * 3.2);
    const L3 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    // sky colours through the day: blue day, orange evening, deep blue night
    let zen = L3([0.22, 0.48, 0.9], [0.02, 0.03, 0.1], k), hor = L3([0.66, 0.84, 0.98], [0.07, 0.09, 0.2], k);
    hor = L3(hor, [1.0, 0.58, 0.38], dusk * 0.75); zen = L3(zen, [0.32, 0.3, 0.62], dusk * 0.4);
    let amb = L3([0.42, 0.47, 0.58], [0.08, 0.1, 0.22], k), gnd = L3([0.3, 0.27, 0.22], [0.05, 0.05, 0.1], k);
    let sunC = L3([0.78, 0.72, 0.6], [0.04, 0.05, 0.1], k); sunC = L3(sunC, [0.95, 0.55, 0.32], dusk * 0.6);
    let fog = hor, fogD = 1 / (this.radius * CHUNK * 0.66), night = Math.max(0, (k - 0.55) / 0.45);
    // weather here: rain darkens the light and thickens the haze; storms flash with lightning
    // clouds near you (they drift with the wind); rain only falls under rain clouds, lightning only near storm clouds
    const W = windShift(), near = [], CC = CLOUD_CELL, ci = Math.floor((c.target[0] - W) / CC), cj = Math.floor(c.target[2] / CC);
    if (!this.under && !inSt) {
      for (let i = ci - 2; i <= ci + 2; i++) for (let j = cj - 2; j <= cj + 2; j++) {
        const key = i + ',' + j; let list = this.cloudCells.get(key);
        if (!list) { list = cloudsInCell(this.T.N, this.T, i, j, this.wxForce); for (const cl of list) { const ms = this.cloudM[cl.kind]; cl.puffs = ms[cl.v % ms.length]; } this.cloudCells.set(key, list); if (this.cloudCells.size > 80) this.cloudCells.delete(this.cloudCells.keys().next().value); }
        for (const cl of list) near.push({ ...cl, x: cl.x + W + Math.sin(t * 0.012 + cl.ph) * 40 });
      }
      if (Math.hypot(c.target[0] - CLOUD_SEA.x, c.target[2] - CLOUD_SEA.z) < 2600) near.push(this.cloudSea || (this.cloudSea = cloudSea(this.T.N)));
      for (const cl of this.extraClouds || []) if (Math.abs(cl.x - c.target[0]) < (cl.kind === 'supercell' ? 6000 : 2200) && Math.abs(cl.z - c.target[2]) < (cl.kind === 'supercell' ? 6000 : 2200)) near.push({ ...cl, x: cl.x + Math.sin(t * 0.012 + cl.ph) * 40 });
    }
    let rainK = 0, stormNear = null, underStorm = false, stormD = 1e9;
    for (const cl of near) { const SK = STORM_KINDS[cl.kind]; if (cl.kind !== 'nimbo' && !SK) continue; const rx = cl.kind === 'supercell' ? cl.x + 500 * cl.s : cl.x, d = Math.hypot(rx - c.target[0], cl.z - c.target[2]), R = (SK ? SK.rain : 400) * cl.s; rainK = Math.max(rainK, Math.min(1, (1 - d / R) * 1.8)); if (SK && d < SK.near * cl.s && d < stormD) { stormNear = cl; stormD = d; if (d < R) underStorm = true; } }
    if (c.target[1] > 220) rainK = 0;
    this.rain += (rainK - this.rain) * Math.min(1, (o.dt || 0.016) * 0.5); this.weather = this.rain > 0.15 ? (underStorm ? 'Stormy' : 'Rainy') : stormNear ? 'Storm nearby' : null;
    if (this.rain > 0.01) { const r = this.rain; sunC = sunC.map(v => v * (1 - r * 0.55)); zen = L3(zen, L3([0.36, 0.4, 0.48], [0.03, 0.04, 0.08], k), r * 0.75); hor = L3(hor, L3([0.58, 0.61, 0.67], [0.06, 0.07, 0.12], k), r * 0.75); fog = hor; fogD *= 1 + r * 0.9; amb = amb.map(v => v * (1 - r * 0.2)); }
    // lightning only comes out of a real thunderstorm cloud: a bolt from its base to the ground, then thunder after the sound travels
    if (stormNear && !this.under && !inSt && Math.random() < (o.dt || 0.016) * 0.22) this.strike(stormNear, c.target);
    if (this.bolts && this.bolts.length) this.bolts = this.bolts.filter(b => { b.t -= o.dt || 0.016; if (b.t <= 0) { G.free(b.mesh); return false; } return true; });
    const RTs = !RL && this.region && (regionTheme(this.region) || {}).sky;
    if (RTs) { const k2 = RTs.k * (1 - night * 0.5); hor = L3(hor, RTs.hor, k2); zen = L3(zen, RTs.zen, k2); fog = hor; fogD *= RTs.fog || 1; sunC = L3(sunC, RTs.sun, k2); if (RTs.amb) amb = amb.map(v => v * (1 - (1 - RTs.amb) * k2)); }
    if (this.region === 'dustmaw' && !RL) { const k2 = 1 - night * 0.8; hor = L3(hor, [0.9, 0.74, 0.55], 0.45 * k2); zen = L3(zen, [0.62, 0.6, 0.62], 0.2 * k2); fog = hor; fogD *= 1.3; sunC = L3(sunC, [1.05, 0.88, 0.7], 0.3 * k2); }
    if (this.flash > 0) { const f = this.flash; amb = amb.map(v => v + f * 0.7); zen = L3(zen, [0.85, 0.88, 1], f * 0.5); hor = L3(hor, [0.8, 0.82, 0.95], f * 0.4); fog = hor; this.flash = Math.max(0, f - (o.dt || 0.016) * 6); }
    if (!this.under && c.eye[1] < SEA - 0.2) { fog = [0.08, 0.3, 0.42]; fogD = 1 / 38; amb = [0.25, 0.42, 0.5]; sunC = sunC.map(v => v * 0.5); } // under the water
    if (RL) { zen = RL.zen; hor = RL.hor; fog = RL.fog; fogD = RL.fogD; amb = RL.amb; gnd = RL.amb.map(v => v * 0.5); sunC = RL.sunC; night = RL.stars ? 1 : 0; }
    if (this.cave) { zen = hor = fog = [0.015, 0.02, 0.035]; amb = [0.1, 0.11, 0.15]; gnd = [0.05, 0.05, 0.07]; sunC = [0, 0, 0]; fogD = 1 / 45; night = 0; }
    else if (inSt) { amb = [0.24, 0.32, 0.36]; gnd = [0.12, 0.16, 0.18]; sunC = sunC.map(v => v * 0.3); fog = [0.05, 0.12, 0.14]; fogD = 1 / 110; }
    const proj = M4.persp(this.fov, this.w / this.h, 0.25, 8000), view = M4.lookAt(c.eye, c.target, [0, 1, 0]);
    this.vp = M4.mul(proj, view);
    const sa = o.sunAngle, sun = [Math.cos(sa) * 0.5, Math.max(0.2, Math.sin(sa)), 0.55], sl = Math.hypot(...sun);
    const sd = [Math.cos(sa) * 0.6, Math.sin(sa), 0.55], sdl = Math.hypot(...sd);
    // camera directions (for the sky and the particles)
    const f = [c.target[0] - c.eye[0], c.target[1] - c.eye[1], c.target[2] - c.eye[2]], fl = Math.hypot(...f); f[0] /= fl; f[1] /= fl; f[2] /= fl;
    const rt = [-f[2], 0, f[0]], rl = Math.hypot(...rt) || 1; rt[0] /= rl; rt[2] /= rl;
    const up = [rt[1] * f[2] - rt[2] * f[1], rt[2] * f[0] - rt[0] * f[2], rt[0] * f[1] - rt[1] * f[0]];
    // lights near the camera
    const L = [];
    const addL = (p, r, col) => { const d = Math.hypot(p[0] - c.target[0], p[2] - c.target[2]); if (d < 90) L.push([p, r, col, d]); };
    for (const s of this.landmarks) for (const l of s.lights) addL(l.p, l.r, l.c);
    for (const s of this.St.list.values()) if (s) for (const l of s.lights) addL(l.p, l.r, l.c);
    if (this.cave) for (const l of this.cave.lights) addL(l.p, l.r, l.c);
    if (RL) for (const l of RL.lights) addL(l.p, l.r, l.c);
    if (this.mods && !this.under) for (const l of this.mods.lights()) addL(l.p, l.r, l.c);
    for (const [kk, part] of this.B.parts) if (part.id === 60 && this.active(kk)) { const [x, y, z] = unkey(kk); addL([x + 0.5, y + 0.6, z + 0.5], 9, [1, 0.85, 0.5]); }
    for (const p of players) if (p.glow) addL([p.p[0], p.p[1] + 0.4, p.p[2]], 10, [0.5, 0.85, 1]);
    if (this.cave) addL([me.p[0], me.p[1] + 1.2, me.p[2]], 10, [0.6, 0.55, 0.45]);
    L.sort((a, b) => a[3] - b[3]);
    const lp = new Float32Array(32), lc = new Float32Array(24), lk = this.cave || inSt ? 1 : Math.min(1, o.dark / 0.45) * 0.85 + 0.15;
    L.slice(0, this.maxLights || 8).forEach((l, i) => { lp.set([l[0][0] - c.eye[0], l[0][1] - c.eye[1], l[0][2] - c.eye[2], l[1]], i * 4); lc.set(l[2].map(v => v * lk), i * 3); });
    const tanY = Math.tan(this.fov / 2);
    G.begin({ proj, view, focus: c.target, vp: this.vp, eye: c.eye, sun: sun.map(v => v / sl), sunC, sky: amb, ground: gnd, fog, fogD, time: t, horizon: hor, zenith: zen, right: rt, up, fwd: f, tanX: tanY * this.w / this.h, tanY, lp, lc, night, sunDisc: sd.map(v => v / sdl), sunCol: L3([1, 0.95, 0.8], [1, 0.55, 0.3], dusk) });
    G.clear(fog);
    if (!this.under && !inSt && c.eye[1] >= SEA - 0.2) G.sky();
    if (RL && RL.stars) G.sky();
    this.statT = 0;

    // stream terrain chunks
    const ccx = Math.floor(c.target[0] / CHUNK), ccz = Math.floor(c.target[2] / CHUNK), RAD = this.radius;
    if (!this.under) {
      const want = [];
      for (let z = ccz - RAD; z <= ccz + RAD; z++) for (let x = ccx - RAD; x <= ccx + RAD; x++) {
        const d = Math.hypot(x - ccx, z - ccz); if (d > RAD + 0.5) continue;
        if (!this.chunks.has(x + ',' + z)) want.push([d, x, z]);
      }
      want.sort((a, b) => a[0] - b[0]);
      const t0 = performance.now();
      for (const [, x, z] of want) { if (performance.now() - t0 > (o.budget || 10)) break; const ch = buildTerrainChunk(G, this.T, x, z); ch.items = this.chunkItems(x, z); this.chunks.set(x + ',' + z, ch); }
      for (const [kk, ch] of this.chunks) { const [x, z] = kk.split(',').map(Number); if (Math.hypot(x - ccx, z - ccz) > RAD + 2.5) { G.free(ch.mesh); G.free(ch.deco); G.free(ch.decoLo); this.chunks.delete(kk); } }
      this.St.update(G, c.target[0], c.target[2], RAD * CHUNK + 60);
    }
    // parts
    for (const kk of this.partDirty) { const old = this.partChunks.get(kk); if (old) { G.free(old.mesh); G.free(old.clear); } this.partChunks.set(kk, this.buildPartChunk(kk)); }
    this.partDirty.clear();
    if (this.wiresDirty) this.rebuildWires();

    G.blend(false);
    // only draw what's in front of the camera (sideways angle check with some room to spare)
    const fh = Math.hypot(f[0], f[2]) || 1, fx0 = f[0] / fh, fz0 = f[2] / fh, halfH = Math.atan(Math.tan(this.fov / 2) * this.w / this.h) + 0.12;
    const inView = (x, z, rad) => { const dx = x - c.eye[0], dz = z - c.eye[2], d = Math.hypot(dx, dz); if (d < rad * 1.5 + 10) return true; const a = Math.acos(Math.max(-1, Math.min(1, (dx * fx0 + dz * fz0) / d))); return a < halfH + Math.atan(rad / d) + (f[1] < -0.5 ? 0.6 : 0); };
    const vis = (x, z, r, rad = 30) => { const dx = x - c.target[0], dz = z - c.target[2]; return dx * dx + dz * dz < (r * r) && inView(x, z, rad); };
    const far = RAD * CHUNK + 40;
    // the ground
    G.mat(0, 0, 0.06); G.tex(1); G.flat(0);
    const chunkVis = (x, z) => Math.hypot(x - ccx, z - ccz) <= (inSt ? 1.6 : RAD + 0.5) && inView(x * CHUNK + 32, z * CHUNK + 32, 48);
    if (!this.under) for (const [kk, ch] of this.chunks) { const [x, z] = kk.split(',').map(Number); if (chunkVis(x, z)) G.draw(ch.mesh); }
    this.stat('ground');
    // trees, plants and rocks: clean low-poly faces
    G.flat(1); G.mat(1, 0.18, 0.06); G.tex(2);
    if (!this.under) for (const [kk, ch] of this.chunks) { const [x, z] = kk.split(',').map(Number), d = Math.hypot(x - ccx, z - ccz); if (chunkVis(x, z)) G.draw(d <= (this.near || 2.3) ? ch.deco : ch.decoLo); }
    G.mat(0, 0, 0.06);
    if (this.cave) { G.draw(this.cave.mesh); if (this.cave.deco) G.draw(this.cave.deco); }
    if (RL) {
      for (const m of RL.meshes) { G.flat(m.kind !== 'world'); if (m.kind === 'deco') G.mat(1, 0.2, 0.1); else if (m.kind === 'glow') G.mat(1, 0.5, 0.8); else G.mat(0, 0.1, 0.1); G.tex(m.kind === 'world' ? 2 : 0); G.draw(m.mesh, null, 1, null, m.kind === 'glow' ? 0.6 : 0); }
      if (RL.planet) { G.mat(0, 0.3, 0.2); G.tex(0); G.fog(0); G.draw(RL.planet, null, 1, null, 0.15); G.fog(); }
      G.mat(0, 0, 0.06); G.tex(2); G.flat(1);
    }
    this.stat('deco');
    // big places and structures
    G.mat(0, 0.12, 0.2); G.tex(4);
    for (const s of this.landmarks) {
      if (s.station && !this.under) { // the giant station shows through the haze from far away
        if (!vis(s.x, s.z, 3000)) continue;
        if (!inSt) G.fog(Math.min(fogD, 1 / 1500));
        G.tex(5); G.draw(s.mesh); G.draw(s.inside);
        if (!inSt) { G.tex(0); G.fog(1 / 2600); G.draw(s.beam); }
        G.tex(4);
        G.fog();
      } else if (s.hideNear && Math.hypot(c.eye[0] - s.x, c.eye[2] - s.z) < s.hideNear) continue;
      else if (vis(s.x, s.z, s.far || far + 80, s.rad || 30)) { if (s.far) G.fog(Math.min(fogD, 1 / 1400)); G.draw(s.mesh); if (s.far) G.fog(); }
    }
    if (!this.under) for (const s of this.St.list.values()) if (s && vis(s.x, s.z, far, 40)) G.draw(s.mesh);
    if (!this.under) {
      G.mat(1, 0.2, 0.1); G.tex(0);
      for (const s of this.landmarks) if (s.deco && vis(s.x, s.z, s.far || far, 40)) { G.fog(Math.min(fogD, 1 / 1400)); G.draw(s.deco); G.fog(); }
      G.mat(1, 0.3, 0.5); for (const cn of this.cannons) if (vis(cn.p[0], cn.p[2], far, 6)) { const d = [cn.to[0] - cn.p[0], cn.to[2] - cn.p[2]], M = M4.model(cn.p, M4.rotY(-Math.atan2(d[1], d[0])), 1); G.draw(this.cannonM, M); G.outline(this.cannonM, M, 0.03); }
      G.mat(1, 0.5, 0.8); this.portals.forEach((pt, i) => { if (vis(pt.p[0], pt.p[2], far, 6)) G.draw(this.portalM[i], M4.model([0, Math.sin(t * 1.5 + i) * 0.15, 0]), 1, null, 0.6); });
      G.mat(0, 0.12, 0.2); G.tex(2);
    }
    this.stat('structures');
    // built things
    G.mat(0, 0.1, 0.25); G.tex(3);
    for (const [kk, pc] of this.partChunks) { const [x, z] = kk.split(',').map(Number); if (vis(x * 16 + 8, z * 16 + 8, far)) { G.draw(pc.mesh); for (const [pk, px, py, pz, part] of pc.dyn) { const off = this.partOffset(pk, part), on = this.wired(pk) ? this.power.has(pk) : (PARTS[part.id].input ? this.power.has(pk) : undefined); G.draw(this.partFor(part.id, part.rot, on), M4.model([px + off[0], py + off[1], pz + off[2]])); } } }
    G.tex(0); G.draw(this.wireMesh);
    this.stat('parts');
    // glowing rings
    G.mat(1, 0.5, 0.8);
    if (!this.under) for (const bo of this.St.boosts) if (vis(bo.p[0], bo.p[2], far)) G.draw(this.ringNext, M4.model(bo.p, M4.rotY(bo.yaw), 1.7), 1, null, 0.6);
    if (!this.under && !this.region) {
      this.rings.forEach((r, i) => { if (!vis(r.x, r.z, far)) return; const m = o.race ? (i === o.race.next ? this.ringNext : i < o.race.next ? this.ringDone : this.ringM) : this.ringM; G.draw(m, M4.model([r.x, r.y, r.z], M4.rotY(r.yaw)), 1, null, 0.6); });
      { const cp = CHASE_START, cy = this.T.ground(cp[0], cp[2]) + 0.2; G.draw(o.chase ? this.ringDone : this.ringM, M4.model([cp[0], cy, cp[2]], [1, 0, 0, 0, 0, 1, 0, -1, 0], 0.7), 1, [0.75, 0.6, 1], 0.6); }
      const rs = this.raceStart; G.draw(o.race ? this.ringDone : this.ringNext, M4.model([rs[0], rs[1], rs[2]], [1, 0, 0, 0, 0, 1, 0, -1, 0], 0.7), 1, null, 0.6);
    }
    this.stat('rings');
    // items (cartoon look with an outline)
    G.mat(1, 0.45, 0.9);
    for (const it of o.items) {
      if (!vis(it.p[0], it.p[2], 60)) continue;
      const m = this.itemFor(it.type), M = M4.model([it.p[0], it.p[1] + Math.sin(t * 2 + it.p[0]) * 0.12, it.p[2]], M4.rotY(t * 1.5 + it.p[2]), 1.15);
      G.draw(m, M, 1, null, 0.2); G.outline(m, M, 0.018);
    }
    this.stat('items');
    // creatures (each one is a little animated rig)
    G.mat(1, 0.35, 0.45);
    for (const cr of this.creatures) {
      if (cr.vis === false || !vis(cr.p[0], cr.p[2], 90, 3)) continue;
      const C = CREATURES[cr.type]; if (!C) continue; const hopH = C.hop ? Math.abs(Math.sin(cr.hop)) : 0;
      const st = { t: (this.wt ?? t) + cr.seed, walk: cr.walk, mv: cr.mv, blink: cr.nb < 0 ? 0.1 : 1, hop: hopH, hopv: Math.cos(cr.hop) > 0 ? -1 : 1, seed: cr.seed, graze: cr.graze, calm: cr.calm, flap: 16 };
      drawRig(G, this.creatureFor(cr.type), M4.model(cr.p, M4.rotY(-cr.yaw), C.size || 1), st, vis(cr.p[0], cr.p[2], 26));
    }
    if (!this.under && o.dark < 0.5) for (const b of this.birds) { const t = this.wt || 0, a = t * 0.25 + b.f * 2.1 + b.k * 0.18, R = 40 + b.f * 15; const p = [this.birdCenter[0] + Math.cos(a + b.f) * R + b.k * 1.5, 45 + b.f * 8 + Math.sin(t + b.k) * 2, this.birdCenter[1] + Math.sin(a + b.f) * R]; drawRig(G, this.creatureFor('bird'), M4.model(p, M4.mul3(M4.rotY(-a - Math.PI / 2), M4.rotX(Math.sin(t * 0.8 + b.k) * 0.15)), 1.6), { t, walk: 0, mv: 0, blink: 1, hop: 0, seed: b.k * 1.7, flap: Math.sin(t * 0.5 + b.k) > 0.3 ? 3 : 12 }, false); }
    if (o.chase) o.chase.draw(G, t, me);
    if (this.park && vis(PARK.x, PARK.z, far + 80)) this.park.draw(G, t, me);
    if (this.sky && !this.under) this.sky.draw(G, t, me);
    if (this.pier) this.pier.draw(G, t, me);
    if (this.arena) this.arena.draw(G, t, players);
    if (this.mods) { G.mat(0, 0.12, 0.3); this.mods.draw(G, t, false); G.mat(1, 0.35, 0.45); }
    if (this.extras && !this.under) { G.mat(0, 0.12, 0.3); this.extras.draw(G, t); G.mat(1, 0.35, 0.45); }
    this.stat('creatures');
    // players: the ball with its skin, an outline, and the hat on top (the hat doesn't roll)
    const clear = [];
    for (const p of players) {
      const r = p.r || 0.45, SK = SKINS[p.skin] || SKINS.plain, sk = SK.n, A = this.rgb3(SK.cols ? SK.cols[0] : p.color), B = this.rgb3(SK.cols ? SK.cols[1] : p.color2 || p.color), og = p.og || [];
      // which way it's going (for the hat), smoothed
      const lp0 = p._lp || p.p, dx = p.p[0] - lp0[0], dz = p.p[2] - lp0[2], dy = p.p[1] - lp0[1], mv = Math.hypot(dx, dz);
      if (mv > 0.004 && mv < 3) { const want = Math.atan2(dz, dx), cur = p._hd ?? want; let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); p._hd = cur + d * Math.min(1, 0.25); }
      p._walk = (p._walk || 0) + Math.min(mv, 1) * 7; p._mv = (p._mv || 0) + ((mv > 0.01 ? 1 : 0) - (p._mv || 0)) * 0.2; p._air = Math.abs(dy) > 0.02 && mv < 3;
      if (p.trail && p.trail !== 'none' && mv < 3 && o.dt && !p.ship) this.fx.trail(p.id || p.name, p.trail, p.p, [dx / o.dt, dy / o.dt, dz / o.dt], r, p.grounded !== false, o.dt, t);
      p._lp = [p.p[0], p.p[1], p.p[2]];
      const hd = p._hd || 0, HR = M4.rotY(-hd);
      if (p.ship) { // flying the owner ship
        const pit = Math.max(-0.5, Math.min(0.5, (p === me ? -o.shipPitch : Math.atan2(dy, Math.max(mv, 0.05)) * 0.5) || 0));
        if (!(p === me && this.fpv)) this.drawShip(M4.model(p.p, M4.mul3(HR, M4.rotZ(pit)), 1), 0);
        continue;
      }
      const bp = p.p;
      const M = M4.model(bp, p.R, r);
      if (CLEAR_SKINS.includes(sk)) clear.push([M, sk, A, B]); else G.ball(M, sk, A, B);
      G.ball(M, sk, A, B, 1, 0.045);
      const h = this.hatFor(p.hat), near = p === me && Math.hypot(c.eye[0] - bp[0], c.eye[1] - bp[1], c.eye[2] - bp[2]) < 1.7;
      if (p.gadget && p.gadget !== 'none' && GADGETS[p.gadget]) { G.mat(1, 0.35, 0.6); const gm = this.gadgetFor(p.gadget), bob = p.gadget === 'balloon' ? Math.sin(t * 2) * 0.06 : 0, GM = M4.model([bp[0], bp[1] + bob, bp[2]], HR, r / 0.45); G.draw(gm, GM); G.outline(gm, GM, 0.014); }
      if (h && !near) { G.mat(1, 0.35, 0.7); const HM = M4.model(bp, HR, r / 0.45); G.draw(h, HM); G.outline(h, HM, 0.016); }
      if (og.length) {
        G.mat(1, 0.35, 0.6); const st = { t: t + 1, walk: p._walk, mv: p._mv, blink: (t * 0.37) % 4 < 0.13 ? 0.1 : 1, hop: 0, seed: 1, flap: 12 };
        if (og.includes('wings')) { const fl = p._air ? Math.sin(t * 13) * 0.7 - 0.2 : Math.sin(t * 2.5) * 0.15 + 0.35; for (const sd of [-1, 1]) { const wm = this.rigFor('wing' + sd, gl => wingsModel(gl, sd)), WM = M4.mul(M4.model(bp, HR, r / 0.45), M4.model([-0.1, 0.12, sd * 0.36], M4.rotX(-sd * fl))); G.draw(wm, WM, 1, null, 0.25); G.outline(wm, WM, 0.012); } }
        if (og.includes('dragon')) { const tgt = [bp[0] + Math.cos(hd + 2.3) * 1.1, bp[1] + 0.9 + Math.sin(t * 2) * 0.15, bp[2] + Math.sin(hd + 2.3) * 1.1]; p._dg = p._dg && Math.hypot(p._dg[0] - tgt[0], p._dg[2] - tgt[2]) < 20 ? p._dg.map((v, i) => v + (tgt[i] - v) * Math.min(1, (o.dt || 0.016) * 4)) : tgt; drawRig(G, this.rigFor('dragon', dragonRig), M4.model(p._dg, HR, 1.2), { ...st, flap: 14 }, true); if (Math.random() < 0.15) this.fx.emit(p._dg, { v: [0, 0.3, 0], life: 0.9, size: 0.1, col: Math.random() < 0.5 ? [0.66, 0.85, 1] : [0.8, 0.71, 1], shape: 26, drag: 1 }); }
        if (og.includes('aura')) { const am = this.rigFor('aura', auraModel); G.mat(0, 0, 0); G.draw(am, M4.model([bp[0], bp[1] - 0.1, bp[2]], M4.rotY(t * 1.3), r / 0.45), 1, null, 1); G.draw(am, M4.model([bp[0], bp[1] + 0.1, bp[2]], M4.mul3(M4.rotY(-t * 0.9), M4.rotX(0.6)), r / 0.45 * 0.8), 1, null, 1); if (Math.random() < 0.3) this.fx.emit([bp[0] + (Math.random() - 0.5) * 1.6, bp[1] - 0.3, bp[2] + (Math.random() - 0.5) * 1.6], { v: [0, 0.8, 0], life: 1.2, size: 0.09, col: Math.random() < 0.5 ? [0.66, 0.85, 1] : [0.8, 0.71, 1], shape: 22, drag: 0.5 }); }
      }
    }
    // the ship while it flies in or away (only on this screen)
    if (o.shipFx) this.drawShip(M4.model(o.shipFx.p, M4.mul3(M4.rotY(-o.shipFx.hd), M4.rotZ(o.shipFx.pitch || 0)), 1), o.shipFx.open || 0);
    // lightning bolts (they glow)
    if (this.bolts) { G.mat(0, 0, 0); G.tex(0); for (const b of this.bolts) if (Math.sin(b.t * 60) > -0.3) G.draw(b.mesh, null, 1, null, 1); }
    // see-through things last
    G.blend(true); G.depthWrite(false);
    G.mat(0, 0, 0);
    if (!this.under) for (const s of this.landmarks) if (s.clear && vis(s.x, s.z, s.far || far, 40)) { G.mat(0, 0.6, 0.3); G.draw(s.clear); G.mat(0, 0, 0); }
    if (!G.isThree || !G.R.shadowMap.enabled) for (const p of players) { // round blob shadows (the Three.js engine has real ones)
      const gy = this.cave ? this.cave.floor(p.p[0], p.p[2]) : Math.max(this.T.ground(p.p[0], p.p[2]), SEA - 0.1), hgt = p.p[1] - gy;
      if (hgt < 0 || hgt > 24 || insideStation(p.p)) continue;
      G.draw(this.shadow, M4.model([p.p[0], gy + 0.06, p.p[2]], null, (p.r || 0.45) * 1.2 * (1 - Math.min(0.6, hgt / 12))), Math.max(0.2, 1 - hgt / 14));
    }
    if (!this.under && !inSt) {
      G.depthWrite(true); G.water(this.water, [Math.round(c.target[0] / 10) * 10, SEA - 0.1, Math.round(c.target[2] / 10) * 10]); G.depthWrite(false);
      // clouds: soft puffs (see sky.js); 'near' was worked out above
      const top = L3(L3([1, 1, 1], [1, 0.84, 0.72], dusk), [0.28, 0.31, 0.42], Math.max(0, (k - 0.35) / 0.65)), bot = L3(L3([0.6, 0.64, 0.75], [0.55, 0.42, 0.5], dusk), [0.1, 0.11, 0.18], Math.max(0, (k - 0.35) / 0.65));
      if (!this.cloudData) this.cloudData = new Float32Array(6000 * 44);
      const nCl = fillClouds(this.cloudData, near, c.eye, { top, bot }, this.flash, this.maxClouds || 2600);
      G.depthWrite(false); G.particles(this.cloudData, nCl, Math.min(fogD, 1 / 6500)); G.blend(true);
      G.fog();
    }
    if (o.chase) o.chase.drawFunnel(G, t);
    if (!this.under && !inSt && !this.region) { const stn = this.landmarks[2]; if (stn.halo && vis(stn.x, stn.z, 3000)) { G.mat(0, 0, 0); G.fog(1 / 2600); G.draw(stn.halo, null, 1, null, 1); G.fog(); } }
    G.mat(0, 0.1, 0.3); G.tex(0);
    if (RL && RL.lake) G.draw(RL.lake, null, 1, null, 0.8);
    for (const pc of this.partChunks.values()) G.draw(pc.clear);
    if (this.mods) { this.mods.draw(G, t, true); G.mat(0, 0.1, 0.3); G.tex(0); }
    for (const [M, sk, A, B] of clear) G.ball(M, sk, A, B);
    if (this.sky && !this.under) { this.sky.drawClear(G, t, me); G.mat(0, 0.1, 0.3); }
    if (o.cursor) G.draw(this.cursorM, M4.model(o.cursor.cell), 1, o.cursor.ok ? [1, 1, 1] : [1, 0.3, 0.3], 1);
    // particles
    if (o.dt && this.rain > 0.02 && !this.under && !inSt) { const n = Math.floor(this.rain * 180 * o.dt + Math.random()); for (let q = 0; q < n; q++) { const a = Math.random() * 6.283, d = 1 + Math.random() * 18; this.fx.emit([c.target[0] + Math.cos(a) * d, c.target[1] + 9 + Math.random() * 4, c.target[2] + Math.sin(a) * d], { v: [-1.2, -24, -0.4], life: 0.7, size: 0.16, col: [0.78, 0.84, 0.95], a: 0.55, shape: 9, drag: 0 }); } }
    if (o.dt) { this.fx.ambient(c.target, this.cave ? -1 : BIOMES[this.T.info(c.target[0], c.target[2]).b] ? this.T.info(c.target[0], c.target[2]).b : -1, k, o.dt, !!this.under, inSt); this.fx.update(o.dt); }
    G.particles(this.fx.data, this.fx.fill());
    G.depthWrite(true); G.blend(false);
    if (this.fpv) { G.clearDepth(); const cp = this.cam.pitch, hdg = Math.atan2(-Math.cos(this.cam.yaw), -Math.sin(this.cam.yaw)); G.mat(1, 0.3, 0.5); const CM = M4.model(c.eye, M4.mul3(M4.rotY(-hdg), M4.rotZ(-cp)), 1), cm = this.rigFor('cockpit', cockpitModel); G.draw(cm, CM); G.outline(cm, CM, 0.01); }
    G.end();
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
    for (const p of players) { if (p.hideLabel) continue; const s = this.project(p.p[0], p.p[1] + (p.r || 0.45) + 0.6 + (p.hat && p.hat !== 'none' ? 0.4 : 0), p.p[2]); if (s && s[2] < 70) labels.push([s, p]); }
    labels.sort((a, b) => b[0][2] - a[0][2]);
    for (const [s, p] of labels) this.label(g, s[0], s[1], p, o.now, s[2]);
    const sign = (x, y, z, text, col, maxD = 50) => { const s = this.project(x, y, z); if (!s || s[2] > maxD) return; g.font = '700 13px system-ui'; const w = g.measureText(text).width + 18; g.globalAlpha = Math.min(1, (maxD - s[2]) / 10); g.fillStyle = 'rgba(10,16,34,.72)'; this.rr(g, s[0] - w / 2, s[1] - 12, w, 22, 8); g.fill(); g.fillStyle = col; g.fillText(text, s[0], s[1] + 4); g.globalAlpha = 1; };
    if (!this.cave) {
      for (const s of this.landmarks) { if (s.signs) for (const sg of s.signs) sign(sg.p[0], sg.p[1], sg.p[2], sg.t, '#5ff0e0', s.station ? 160 : 60); }
      for (const s of this.St.list.values()) if (s && s.label) sign(s.x, s.y + (s.type === 'cave' ? 9 : 12), s.z, s.label, '#ffd27a', 70);
      const pk = this.region ? null : this.landmarks[1]; if (pk) sign(pk.start[0], pk.start[1] + 2.5, pk.start[2], 'Parkour climb: trophy at the top', '#b8a8ff', 50);
      if (this.region) { /* no ring race or storm chase in travel regions */ }
      else if (!o.race) sign(this.raceStart[0], this.raceStart[1] + 1.6, this.raceStart[2], 'Ring race: roll here to start', '#ffc45a', 45);
      else { const r = this.rings[o.race.next]; if (r) { const s = this.project(r.x, r.y + 2.2, r.z); if (s) { g.font = '800 16px system-ui'; g.fillStyle = '#ffc45a'; g.fillText(String(o.race.next + 1), s[0], s[1]); } } }
      if (this.region) { /* none */ }
      else if (!o.chase) sign(CHASE_START[0], this.T.ground(CHASE_START[0], CHASE_START[2]) + 1.8, CHASE_START[2], 'Storm chase: roll here to start', '#c9a8ff', 45);
      else if (o.chase.alive > 0.05) sign(o.chase.p[0], o.chase.p[1] + 30, o.chase.p[2], EF_NAMES[o.chase.ef] + ' tornado · ' + Math.round(o.chase.near) + ' m', '#ff8a7a', 3000);
      for (const pt of this.portals) sign(pt.p[0], pt.p[1] + 3.2, pt.p[2], pt.label, pt.col, 90);
      for (const cn of this.cannons) if (cn.name) sign(cn.p[0], cn.p[1] + 3.4, cn.p[2], cn.name, '#ffc45a', 50);
    } else if (this.realm) sign(this.realm.exit[0], this.realm.exit[1] + 2.6, this.realm.exit[2], 'Way back', '#ffc45a', 60);
    else sign(this.cave.exit[0], this.cave.exit[1] + 2.4, this.cave.exit[2], 'Way out', '#ffc45a', 40);
    if (o.wireFrom) { const [x, y, z] = o.wireFrom; const s = this.project(x + 0.5, y + 1.2, z + 0.5); if (s) { g.font = '700 12px system-ui'; g.fillStyle = '#ff8a5a'; g.fillText('wire from here', s[0], s[1]); } }
    if (this.mods) this.mods.overlay(g, (x, y, z) => this.project(x, y, z));
    if (this.waypoint && !this.cave && !this.realm) { const wp = this.waypoint, d = Math.hypot(wp.x - me.p[0], wp.z - me.p[2]); if (d < 25) this.waypoint = null; else if (d < 600) sign(wp.x, this.T.ground(wp.x, wp.z) + 4, wp.z, 'Waypoint ' + (d < 1000 ? Math.round(d / 5) * 5 + 'm' : (d / 1000).toFixed(1) + 'km'), '#ffe14a', 99999); }
    if (this.editor) return;
    this.drawCompass(g, me);
    this.drawMinimap(g, players, me);
  }
  // a strip at the top: turn until a marker is in the middle and you're heading straight for it
  drawCompass(g, me) {
    if (this.cave || this.realm) return;
    const W = Math.min(380, this.w * 0.4), cx = this.w / 2, y = 8 + (this.safeTop || 0), H = 30, f = this.forward();
    g.fillStyle = 'rgba(10,16,34,.55)'; this.rr(g, cx - W / 2, y, W, H, 12); g.fill();
    g.save(); this.rr(g, cx - W / 2, y, W, H, 12); g.clip();
    const bearing = (dx, dz) => Math.atan2(f[0] * dz - f[1] * dx, f[0] * dx + f[1] * dz); // + = to the right
    const X = a => cx + a / (Math.PI * 0.5) * (W / 2 - 14);
    g.textAlign = 'center';
    for (const [n, dx, dz] of [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]]) {
      const a = bearing(dx, dz); if (Math.abs(a) > Math.PI * 0.5) continue;
      g.font = '700 11px system-ui'; g.fillStyle = 'rgba(255,255,255,.45)'; g.fillText(n, X(a), y + 12);
    }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(cx - 0.75, y + H - 7, 1.5, 7);
    const mark = (tx, tz, col, name) => {
      const dx = tx - me.p[0], dz = tz - me.p[2], d = Math.hypot(dx, dz); if (d < 12) return;
      const a = bearing(dx, dz), off = Math.abs(a) > Math.PI * 0.5, x = off ? cx + Math.sign(a) * (W / 2 - 16) : X(a);
      g.fillStyle = col; g.beginPath();
      if (off) { const s = Math.sign(a); g.moveTo(x + s * 7, y + 11); g.lineTo(x - s * 4, y + 5); g.lineTo(x - s * 4, y + 17); } else g.arc(x, y + 10, 5.5, 0, 7);
      g.fill();
      g.font = '700 10px system-ui'; g.fillText(name + ' ' + (d < 1000 ? Math.round(d / 5) * 5 + 'm' : (d / 1000).toFixed(1) + 'km'), Math.max(cx - W / 2 + 34, Math.min(cx + W / 2 - 34, x)), y + 26);
    };
    // places ahead of you: their names once you've found them, a ? before that
    const known = this.known || new Set(), near = this.places(me.p[0], me.p[2], 900).map(q => ({ ...q, d: Math.hypot(q.x - me.p[0], q.z - me.p[2]) })).filter(q => q.d > 15 && Math.abs(bearing(q.x - me.p[0], q.z - me.p[2])) < Math.PI * 0.45).sort((a, b) => a.d - b.d).slice(0, 3);
    for (const q of near) mark(q.x, q.z, known.has(q.key) || q.always ? q.col : '#c8ccd8', known.has(q.key) || q.always ? q.name : '?');
    if (!this.region) { mark(0, 0, '#ffc45a', 'Plaza'); mark(STATION.x, STATION.z, '#5ff0e0', 'Station'); }
    if (this.waypoint) mark(this.waypoint.x, this.waypoint.z, '#ffe14a', 'Waypoint');
    g.restore();
  }
  // places near you for the compass and the map: structures, portals and the parkour
  places(x, z, rad = 900) {
    const out = [], c = this.planCache || (this.planCache = new Map());
    for (let rx = Math.floor((x - rad) / REG); rx <= Math.floor((x + rad) / REG); rx++) for (let rz = Math.floor((z - rad) / REG); rz <= Math.floor((z + rad) / REG); rz++) {
      const k = rx + ',' + rz; let p = c.get(k); if (p === undefined) { p = this.St.plan(rx, rz); c.set(k, p); if (c.size > 3000) c.delete(c.keys().next().value); }
      if (p) out.push({ x: p.x, z: p.z, key: 's:' + p.key, kind: p.type, name: STRUCT_TYPES[p.type], col: p.type === 'cave' ? '#b8a8ff' : '#ffffff' });
    }
    for (const pt of this.portals) out.push({ x: pt.p[0], z: pt.p[2], key: 'portal:' + pt.kind, kind: 'portal', name: pt.label, col: pt.col, always: true });
    if (this.region) { out.push({ x: 0, z: 0, key: 'landing', kind: 'landing', name: (regionTheme(this.region) || {}).landing || 'Dustmaw Landing', col: '#ffc45a', always: true }); for (const sp of themeSpecials(this.T.theme)) out.push({ x: sp.x, z: sp.z, key: sp.id, kind: sp.id, name: sp.name, col: '#ff9f5a', always: true }); return out; }
    out.push({ x: 44, z: 38, key: 'parkour', kind: 'parkour', name: 'Parkour', col: '#ff9f5a', always: true });
    out.push({ x: PARK.x, z: PARK.z, key: 'funpark', kind: 'park', name: 'Fun Park', col: '#7aff9a', always: true });
    out.push({ x: PIER.end[0] + 30, z: 0, key: 'pier', kind: 'pier', name: 'Fishing pier', col: '#5ab8ff', always: true });
    out.push({ x: ARENA.x, z: ARENA.z, key: 'arena', kind: 'arena', name: 'Game arena', col: '#ff5ad8', always: true });
    if (VOLCANO.on) out.push({ x: VOLCANO.x, z: VOLCANO.z, key: 'volcano', kind: 'volcano', name: 'Volcano', col: '#ff7a2a', always: true });
    return out;
  }
  // the owner ship; open (0..1) swings the glass canopy up on its hinge
  drawShip(SM, open) {
    const G = this.gfx, gl = G.gl; G.mat(1, 0.35, 0.8);
    const sm = this.rigFor('ship', shipModel); G.draw(sm, SM); G.outline(sm, SM, 0.03);
    const CM = M4.mul(SM, M4.model([-0.05, 0.9, 0], M4.rotZ(open * 1.25), 1));
    const fr = this.rigFor('canopyFrame', canopyFrame); G.draw(fr, M4.mul(CM, M4.model([1.3 - 1.3 * 1.35, 0.02, 0], I3, [1.35, 1, 0.7])));
    G.blend(true); G.depthWrite(false);
    G.draw(this.rigFor('canopy', canopyModel), CM);
    G.depthWrite(true); G.blend(false);
  }
  label(g, x, y, p, now, dist) {
    const sc = Math.max(0.7, Math.min(1.1, 14 / dist)); g.save(); g.translate(x, y); g.scale(sc, sc);
    if (p.badge) { g.font = '800 11px system-ui'; const bw = g.measureText(p.badge.t).width + 14; g.fillStyle = p.badge.c; this.rr(g, -bw / 2, -30, bw, 17, 7); g.fill(); g.fillStyle = '#fff'; g.fillText(p.badge.t, 0, -18); }
    g.font = '600 12px system-ui'; const tag = p.name, sw = p.admin ? 14 : 0, w = g.measureText(tag).width + 26 + sw;
    g.fillStyle = p.admin ? 'rgba(120,80,0,.75)' : 'rgba(0,0,0,.5)'; this.rr(g, -w / 2, -9, w, 18, 7); g.fill();
    g.fillStyle = p.admin ? '#ffd27a' : '#fff'; g.fillText(tag, -7 + sw / 2, 4); if (sw) drawStar(g, -w / 2 + 11, 0, 5.5, '#ffd27a');
    drawDeviceIcon(g, p.devType, w / 2 - 10, 0, p.admin ? '#ffd27a' : 'rgba(255,255,255,.85)');
    if (p.say && now - p.sayAt < 6000) {
      g.font = '13px system-ui'; const lines = this.wrap(g, p.say, 180), lh = 16, bw = Math.min(196, Math.max(...lines.map(l => g.measureText(l).width)) + 18), bh = lines.length * lh + 10, by = -14 - bh;
      g.fillStyle = 'rgba(255,255,255,.96)'; this.rr(g, -bw / 2, by, bw, bh, 9); g.fill(); g.beginPath(); g.moveTo(-5, by + bh); g.lineTo(5, by + bh); g.lineTo(0, by + bh + 6); g.fill();
      g.fillStyle = '#1b1b2b'; lines.forEach((l, i) => g.fillText(l, 0, by + 18 + i * lh));
    }
    if (p.emote && now - p.emoteAt < 2500) { const t = (now - p.emoteAt) / 2500; g.globalAlpha = 1 - t * t; const im = emoteImg(p.emote); if (im.complete && im.naturalWidth) g.drawImage(im, -15, -58 - t * 26 - (p.say && now - p.sayAt < 6000 ? 40 : 0), 30, 30); g.globalAlpha = 1; }
    g.restore();
  }
  wrap(g, text, max) { const words = text.split(/\s+/), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines.slice(0, 4); }
  rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // minimap: turns with the camera (up is the way you're looking) and redraws a few rows each frame
  drawMinimap(g, players, me) {
    this.lastPlayers = players; this.lastMe = me;
    const S = 128, MAPSPAN = 860, span = 520, mg = this.mini.getContext('2d');
    if (this.mini.width !== S) { this.mini.width = this.mini.height = S; this.miniCenter = null; }
    if (!this.miniCenter || Math.hypot(me.p[0] - this.miniCenter[0], me.p[2] - this.miniCenter[1]) > 150) {
      // keep the old picture on screen (shifted) while the new one draws in
      const nc = [Math.round(me.p[0]), Math.round(me.p[2])];
      if (this.miniCenter) { const k = S / MAPSPAN, tmp = document.createElement('canvas'); tmp.width = tmp.height = S; tmp.getContext('2d').drawImage(this.mini, 0, 0); mg.fillStyle = '#0a1124'; mg.fillRect(0, 0, S, S); mg.drawImage(tmp, (this.miniCenter[0] - nc[0]) * k, (this.miniCenter[1] - nc[1]) * k); }
      this.miniCenter = nc; this.miniRow = 0;
    }
    if (this.miniRow < S && !this.cave && !this.realm) {
      const rows = 3, img = mg.createImageData(S, rows);
      for (let r = 0; r < rows && this.miniRow + r < S; r++) for (let i = 0; i < S; i++) {
        const x = this.miniCenter[0] + (i / S - 0.5) * MAPSPAN, z = this.miniCenter[1] + ((this.miniRow + r) / S - 0.5) * MAPSPAN, inf = this.T.info(x, z);
        const c = hex(inf.h < -1.2 ? '#2c74b8' : BIOMES[inf.b].ground), k = 0.75 + Math.min(0.4, Math.max(0, inf.h) / 120);
        img.data.set([c[0] * 255 * k, c[1] * 255 * k, c[2] * 255 * k, 255], (r * S + i) * 4);
      }
      mg.putImageData(img, 0, this.miniRow); this.miniRow += rows;
    }
    const size = this.w < 700 ? 92 : 128, x = this.w - size - 10 - (this.safeRight || 0), y = 10 + (this.safeTop || 0), cx = x + size / 2, cy = y + size / 2;
    const f = this.forward(), rot = -Math.PI / 2 - Math.atan2(f[1], f[0]), sc = size / span;
    g.save(); g.beginPath(); g.arc(cx, cy, size / 2, 0, 7); g.clip();
    g.fillStyle = '#0a1124'; g.fillRect(x, y, size, size);
    g.translate(cx, cy); g.rotate(rot);
    if (!this.cave && !this.realm) { const d = MAPSPAN * sc; g.imageSmoothingEnabled = true; g.drawImage(this.mini, (this.miniCenter[0] - me.p[0]) * sc - d / 2, (this.miniCenter[1] - me.p[2]) * sc - d / 2, d, d); }
    for (const p of players) { if (p === me) continue; g.fillStyle = p.color; g.strokeStyle = '#0a1124'; g.lineWidth = 1; g.beginPath(); g.arc((p.p[0] - me.p[0]) * sc, (p.p[2] - me.p[2]) * sc, 3, 0, 7); g.fill(); g.stroke(); }
    g.restore();
    // you: an arrow in the middle that always points up
    g.fillStyle = '#fff'; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx + 5, cy + 5); g.lineTo(cx, cy + 2); g.lineTo(cx - 5, cy + 5); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, size / 2, 0, 7); g.stroke();
    // dots for the station and the plaza (they slide around the edge when far away)
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const mark = (tx, tz, col, txt) => {
      const wx = (tx - me.p[0]) * sc, wz = (tz - me.p[2]) * sc; let px = wx * cr - wz * sr, py = wx * sr + wz * cr; const d = Math.hypot(px, py), lim = size / 2 - 6;
      if (d > lim) { px *= lim / d; py *= lim / d; }
      g.fillStyle = col; g.beginPath(); g.arc(cx + px, cy + py, 4.5, 0, 7); g.fill(); g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.stroke();
      if (txt) { g.font = '700 10px system-ui'; g.textAlign = 'center'; g.fillStyle = col; g.fillText(txt, Math.max(x + 18, Math.min(x + size - 18, cx + px)), cy + py + (py > size / 2 - 22 ? -8 : 14)); }
    };
    if (!this.cave && !this.realm) {
      const known = this.known || new Set();
      for (const q of this.places(me.p[0], me.p[2], MAPSPAN * 0.75)) { if (Math.hypot(q.x - me.p[0], q.z - me.p[2]) * sc > size / 2 - 8) continue; const k = known.has(q.key) || q.always; mark(q.x, q.z, k ? q.col : 'rgba(200,204,216,.8)', Math.hypot(q.x - me.p[0], q.z - me.p[2]) < MAPSPAN * 0.35 ? (k ? q.name : '?') : ''); }
      if (!this.region) { mark(STATION.x, STATION.z, '#5ff0e0', 'Station'); mark(0, 0, '#ffc45a', ''); }
      if (this.waypoint) mark(this.waypoint.x, this.waypoint.z, '#ffe14a', '');
    }
    this.miniBox = [cx, cy, size / 2];
    this.place = this.realm ? this.realm.name : this.cave ? 'Cave' : insideStation(me.p) ? 'Inside the station' : BIOMES[this.T.info(me.p[0], me.p[2]).b].name + (this.weather ? ' · ' + this.weather : '');
  }
}
