// Special worlds: Space (the Star garden), under the sea (the Coral kingdom) and deep underground
// (the Crystal hollow). Each one is a pocket world far away from the main land; you get there through
// a portal. Plus the sky islands floating over the land, and cannons that shoot you up to them.
const REALMS = {
  space: { name: 'Star garden', o: [6000, 2200, 6000], grav: 7, mood: 'glow', fog: [0.03, 0.02, 0.08], fogD: 1 / 900, amb: [0.32, 0.3, 0.45], sunC: [0.75, 0.72, 0.85], zen: [0.01, 0.0, 0.04], hor: [0.08, 0.04, 0.18], stars: 1 },
  sea: { name: 'Coral kingdom', o: [-6000, -420, 6000], grav: 8, swim: true, mood: 'ocean', fog: [0.04, 0.24, 0.36], fogD: 1 / 85, amb: [0.3, 0.5, 0.58], sunC: [0.35, 0.5, 0.55], zen: [0.04, 0.24, 0.36], hor: [0.04, 0.24, 0.36] },
  crystal: { name: 'Crystal hollow', o: [6000, -640, -6000], grav: 22, mood: 'cave', fog: [0.08, 0.05, 0.14], fogD: 1 / 160, amb: [0.42, 0.36, 0.58], sunC: [0, 0, 0], zen: [0.04, 0.02, 0.08], hor: [0.04, 0.02, 0.08] },
};
// where the portals are on the main land (set when the world is made)
const PORTALS = [];

class Realm {
  constructor(kind, N) { this.kind = kind; Object.assign(this, REALMS[kind]); this.N = N; this.grid = new TriGrid(); this.items = []; this.lights = []; this.meshes = []; this.spawnC = []; }
  inside(p) { return Math.abs(p[0] - this.o[0]) < 420 && Math.abs(p[2] - this.o[2]) < 420 && Math.abs(p[1] - this.o[1]) < 320; }
  R(k, s = 0) { return this.N.hash(k, s, 1300 + this.kind.length); }
  // a smooth hilly patch; h(x,z) is the height (local), col(x,z,h,ny) the colour. Adds collision too.
  patch(gl, x0, z0, x1, z1, step, h, col, keep) {
    const mb = new MeshBuilder(), tris = [], o = this.o, nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step), V = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * step, z = z0 + j * step, y = h(x, z), e = 0.5;
      let gx = h(x - e, z) - h(x + e, z), gz = h(x, z - e) - h(x, z + e), l = Math.hypot(gx, 2 * e, gz);
      V.push([o[0] + x, o[1] + y, o[2] + z]); mb.vert([o[0] + x, o[1] + y, o[2] + z], [gx / l, 2 * e / l, gz / l], col(x, z, y, 2 * e / l));
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      if (keep && !keep(x0 + (i + 0.5) * step, z0 + (j + 0.5) * step)) continue;
      mb.i.push(a, c, b, b, c, d); tris.push([V[a], V[c], V[b]], [V[b], V[c], V[d]]);
    }
    this.grid.add(tris, { k: Math.random() });
    return mb.build(gl);
  }
  solid(mb) { if (mb.tris && mb.tris.length) this.grid.add(mb.tris, { k: Math.random() }); }
  item(id, type, x, y, z) { this.items.push({ id: 'realm:' + this.kind + ':' + id, type, p: [this.o[0] + x, this.o[1] + y, this.o[2] + z] }); }
  build(gl) {
    const o = this.o, R = (k, s) => this.R(k, s), N = this.N, L = (x, y, z) => [o[0] + x, o[1] + y, o[2] + z];
    const add = (mesh, kind = 'world') => this.meshes.push({ mesh, kind });
    if (this.kind === 'space') {
      // the main floating island: a moon-rock disc with craters, a rocky underside
      const isl = (x, z) => { const d = Math.hypot(x, z); if (d > 46) return -6; let h = 2 * Math.sin(x * 0.11) * Math.cos(z * 0.09) + (N.v(x / 9, z / 9, 1301) - 0.5) * 3; for (const [cx, cz, r] of [[12, -8, 7], [-15, 10, 6], [5, 20, 4]]) { const q = Math.hypot(x - cx, z - cz) / r; if (q < 1.3) h += q < 1 ? -(1 - q * q) * 2.4 : (1.3 - q) * 3; } return h - Math.max(0, d - 38) * 0.75; };
      add(this.patch(gl, -48, -48, 48, 48, 3, isl, (x, z, h, ny) => mixC(hex('#9a96aa'), hex('#d8d4e6'), Math.max(0, Math.min(1, (h + 2) / 5))), (x, z) => Math.hypot(x, z) < 47));
      const mb = new MeshBuilder();
      mb.ico(o[0], o[1] - 12, o[2], [50, 22, 50], 2, (a, b) => shadeC(hex('#6a6478'), 0.75 + b * 0.25), false, m => m[1] < 0.2, (x, y, z) => 0.1 * Math.sin(x * 9) * Math.cos(z * 7));
      // stepping-stone asteroids up to a high lookout
      const ast = new MeshBuilder().collect();
      for (let k = 0; k < 14; k++) { const a = k * 0.75, d = 52 + k * 5, y = 2 + k * 3.2, r = 4 + R(k, 1) * 3; ast.ico(o[0] + Math.cos(a) * d, o[1] + y, o[2] + Math.sin(a) * d, [r, r * 0.55, r], 1, (p, q) => q > 0.4 ? hex('#cfc8e6') : shadeC(hex('#7a7090'), 0.8 + q * 0.2), false, null, (x, y2, z) => 0.12 * Math.sin(x * 7 + k)); if (k % 4 === 3) this.item('star' + k, 'star', Math.cos(a) * d, y + r * 0.55 + 0.9, Math.sin(a) * d); }
      const top = [Math.cos(13 * 0.75) * 117, 2 + 13 * 3.2, Math.sin(13 * 0.75) * 117];
      ast.cyl(o[0] + top[0], o[1] + top[1] + 1, o[2] + top[2], 0.15, 0.15, 6, 6, hex('#c8ccd4')); ast.tri2([o[0] + top[0], o[1] + top[1] + 7, o[2] + top[2]], [o[0] + top[0] + 3, o[1] + top[1] + 6, o[2] + top[2]], [o[0] + top[0], o[1] + top[1] + 5, o[2] + top[2]], hex('#48d6ac'));
      this.solid(ast); add(ast.build(gl), 'deco');
      // glowing space plants and crystals on the island
      const dmb = new MeshBuilder();
      for (let k = 0; k < 40; k++) { const a = R(k, 2) * 6.283, d = 6 + R(k, 3) * 34, x = Math.cos(a) * d, z = Math.sin(a) * d, y = isl(x, z); if (k % 3 === 0) crystals(dmb, o[0] + x, o[1] + y, o[2] + z, 1 + R(k, 4), R(k, 5) > 0.5 ? '#ff8ff0' : '#8ff6ff'); else glowFlower(dmb, o[0] + x, o[1] + y, o[2] + z, R(k, 6)); }
      // a little observatory dome
      dmb.push(L(-20, isl(-20, -18) - 0.5, -18)); dmb.lathe([[6, 0], [6, 3], [5.2, 5.5], [3.4, 7.2], [0, 8]], 20, (t) => t > 0.4 ? hex('#e8eef7') : hex('#8a93a8'), 0.1); dmb.pop();
      dmb.push(L(-20, isl(-20, -18) + 6, -18), M4.rotZ(-0.7)); dmb.lathe([[1.2, 0], [1.2, 6], [1.5, 6.5], [0, 6.6]], 12, hex('#3a3f55')); dmb.pop();
      add(dmb.build(gl), 'deco');
      add(mb.build(gl));
      // the big ringed planet and a moon far away (just to look at)
      const pm = new MeshBuilder();
      pm.sph(L(700, 120, -900), 260, 28, (x, y, z) => mixC(hex('#e0905a'), hex('#f2d29a'), 0.5 + 0.5 * Math.sin(y * 14 + Math.sin(x * 3) * 0.6)), 0.3);
      pm.push(L(700, 120, -900), M4.rotZ(0.35)); pm.tor([0, 0, 0], 420, 34, 64, 4, (a, b) => [0.95, 0.85, 0.7, 0.4]); pm.pop();
      pm.sph(L(-500, 300, -700), 70, 18, (x, y, z) => shadeC(hex('#c8ccd8'), 0.85 + 0.15 * Math.sin(x * 9) * Math.cos(z * 7)), 0.3);
      this.planet = pm.build(gl);
      for (let k = 0; k < 6; k++) this.lights.push({ p: L(Math.cos(k) * 20, 3, Math.sin(k) * 20), r: 18, c: k % 2 ? [0.8, 0.5, 1] : [0.4, 0.9, 1] });
      this.start = L(8, isl(8, 4) + 1.5, 4); this.exit = L(0, isl(0, 0) + 1.6, 0); this.floorAt = (x, z) => o[1] + isl(x - o[0], z - o[2]);
      for (let k = 0; k < 4; k++) this.item('gem' + k, 'gem', Math.cos(k * 1.6) * 28, isl(Math.cos(k * 1.6) * 28, Math.sin(k * 1.6) * 28) + 0.8, Math.sin(k * 1.6) * 28);
      this.spawnC = [['moth', 6]];
    } else if (this.kind === 'sea') {
      // a sandy sea floor in a bowl of rock, coral reefs, kelp, a sunken ship and giant clams
      const floor = (x, z) => { const d = Math.max(Math.abs(x), Math.abs(z)); return 1.5 * Math.sin(x * 0.07) * Math.cos(z * 0.06) + (N.v(x / 14, z / 14, 1311) - 0.5) * 3 + Math.max(0, d - 120) * 1.4; };
      add(this.patch(gl, -150, -150, 150, 150, 4, floor, (x, z, h, ny) => h > 18 ? hex('#5a6a78') : ny < 0.8 ? hex('#7a8a8a') : mixC(hex('#d8c48f'), hex('#e8d8a8'), N.v(x / 6, z / 6, 1312))));
      const dmb = new MeshBuilder(), smb = new MeshBuilder().collect();
      for (let k = 0; k < 160; k++) { const x = (R(k, 1) - 0.5) * 230, z = (R(k, 2) - 0.5) * 230, y = floor(x, z); if (k % 3 === 0) coral(dmb, o[0] + x, o[1] + y - 5, o[2] + z, 1.4 + R(k, 3), R(k, 4)); else if (k % 3 === 1) { const g = hex(R(k, 5) > 0.5 ? '#3a8a5a' : '#5aa86a'); for (let q = 0; q < 3; q++) dmb.cyl(o[0] + x + q * 0.5, o[1] + y - 0.3, o[2] + z + q * 0.3, 0.25, 0.08, 6 + R(k, q) * 8, 5, g, false, q); } else rock(dmb, o[0] + x, o[1] + y, o[2] + z, 1 + R(k, 6) * 2, '#7a8a8a', R(k, 7)); }
      // sunken ship lying on its side
      smb.push(L(30, floor(30, -25) + 2, -25), M4.mul3(M4.rotY(0.6), M4.rotX(0.35)));
      smb.box(-12, -2, -3.5, 12, 3, 3.5, hex('#6a4a2a')); smb.box(-10, 3, -3, 10, 3.6, 3, hex('#8a6a42')); smb.cyl(2, 3.5, 0, 0.4, 0.3, 14, 6, hex('#5a3a22')); smb.tri2([2, 8, 0], [2, 15, 0], [7, 9, 0.5], hex('#d8d0c0'));
      smb.pop();
      // giant clams with pearls
      for (let k = 0; k < 5; k++) { const a = k * 1.25 + 0.4, x = Math.cos(a) * 60, z = Math.sin(a) * 60, y = floor(x, z); dmb.sph(L(x, y + 0.6, z), [2.4, 0.9, 2], 12, hex('#9a7aa8'), 0.2); dmb.push(L(x, y + 1.2, z - 1.6), M4.rotX(-0.9)); dmb.sph([0, 0, 1.6], [2.4, 0.5, 2], 12, hex('#b08ac0'), 0); dmb.pop(); this.item('pearl' + k, 'pearl', x, y + 1.6, z); }
      this.item('chest', 'gem', 30, floor(30, -25) + 4, -25);
      this.solid(smb); add(smb.build(gl), 'deco'); add(dmb.build(gl), 'deco');
      for (let k = 0; k < 6; k++) this.lights.push({ p: L(Math.cos(k) * 50, floor(Math.cos(k) * 50, Math.sin(k) * 50) + 4, Math.sin(k) * 50), r: 22, c: [0.3, 0.9, 1] });
      this.start = L(0, floor(0, 6) + 2, 6); this.exit = L(0, floor(0, 0) + 1.6, 0); this.floorAt = (x, z) => o[1] + floor(x - o[0], z - o[2]);
      this.spawnC = [['fish', 14], ['jelly', 8], ['turtle', 3], ['crab', 4]];
    } else {
      // a giant cave: glowing crystal pillars, mushroom groves and a glowing lake
      const floor = (x, z) => { const d = Math.hypot(x, z); return (N.v(x / 16, z / 16, 1321) - 0.5) * 6 + Math.max(0, d - 110) * 1.5 - 4 * Math.exp(-((x - 40) ** 2 + (z + 30) ** 2) / 600); };
      add(this.patch(gl, -150, -150, 150, 150, 4, floor, (x, z, h, ny) => ny < 0.8 ? hex('#4a4058') : mixC(hex('#3a3448'), hex('#5a4a6a'), N.v(x / 8, z / 8, 1322))), 'world');
      const dome = new MeshBuilder();
      dome.ico(o[0], o[1] - 10, o[2], [150, 90, 150], 3, (a, b, c) => { const g = this.N.hash(Math.floor(a * 40), Math.floor(c * 40), 1323); return g > 0.93 ? glowC(hex(g > 0.97 ? '#ff8ff0' : '#8ff6ff')) : shadeC(hex('#2a2436'), 0.8 + b * 0.3); }, true, m => m[1] > -0.1, (x, y, z) => 0.06 * Math.sin(x * 11) * Math.cos(z * 9));
      add(dome.build(gl), 'world');
      const dmb = new MeshBuilder(), smb = new MeshBuilder().collect();
      for (let k = 0; k < 26; k++) { const a = R(k, 1) * 6.283, d = 20 + R(k, 2) * 85, x = Math.cos(a) * d, z = Math.sin(a) * d, y = floor(x, z); if (k % 2) { crystals(smb, o[0] + x, o[1] + y, o[2] + z, 4 + R(k, 3) * 4, R(k, 4) > 0.5 ? '#ff8ff0' : '#8ff6ff'); this.lights.push({ p: L(x, y + 5, z), r: 26, c: R(k, 4) > 0.5 ? [1, 0.5, 0.95] : [0.4, 0.95, 1] }); } else giantShroom(dmb, o[0] + x, o[1] + y, o[2] + z, 1.5 + R(k, 5), R(k, 6)); }
      for (let k = 0; k < 30; k++) { const a = R(k, 7) * 6.283, d = 30 + R(k, 8) * 90, x = Math.cos(a) * d, z = Math.sin(a) * d; smb.cyl(o[0] + x, o[1] + floor(x, z) - 1, o[2] + z, 1.5 + R(k, 9) * 2, 0, 6 + R(k, 10) * 10, 6, hex('#4a4058')); }
      for (let k = 0; k < 12; k++) this.item('cr' + k, k % 3 ? 'crystal' : 'gem', Math.cos(k * 0.52) * (25 + k * 6), floor(Math.cos(k * 0.52) * (25 + k * 6), Math.sin(k * 0.52) * (25 + k * 6)) + 0.8, Math.sin(k * 0.52) * (25 + k * 6));
      this.solid(smb); add(smb.build(gl), 'deco'); add(dmb.build(gl), 'deco');
      // the glowing lake
      const lake = new MeshBuilder(); lake.cyl(o[0] + 40, o[1] - 2.2, o[2] - 30, 22, 22, 0.02, 24, [0.3, 0.9, 1, 0.35]); this.lake = lake.build(gl);
      this.start = L(0, floor(0, 6) + 2, 6); this.exit = L(0, floor(0, 0) + 1.6, 0); this.floorAt = (x, z) => o[1] + floor(x - o[0], z - o[2]);
      this.spawnC = [['beetle', 8], ['moth', 8]];
    }
    // the way back: a glowing ring
    const ring = new MeshBuilder(); ring.push(this.exit, M4.rotX(Math.PI / 2)); ring.tor([0, 0, 0], 1.6, 0.18, 32, 8, glowC(hex('#ffc45a'))); ring.pop(); add(ring.build(gl), 'glow');
  }
}

// ---------- sky islands and cannons (on the main land) ----------
const SKY_ISLES = [[260, 190, 230], [340, 215, 300], [230, 240, 370], [140, 265, 300], [170, 300, 190]];
function buildSkyIslands(gl, st) {
  const out = [], N = st.T.N;
  SKY_ISLES.forEach(([x, y, z], k) => {
    const mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), r = 16 + (k % 2) * 6, s = { key: 'isle' + k, items: [], lights: [], triggers: [], label: k === 0 ? 'Sky islands' : null, x, z, y, far: 1600 };
    // grassy top, rocky cone underneath
    mb.cyl(x, y - 1, z, r, r * 1.05, 1, 16, hex('#6cbf55'), true);
    mb.ico(x, y - 1, z, [r * 1.02, r * 1.4, r * 1.02], 1, (a, b) => b < -0.6 ? shadeC(hex('#7a6a58'), 0.8) : shadeC(hex('#8a7a62'), 0.85 + b * 0.15), false, m => m[1] < -0.05, (a, b, c) => 0.15 * Math.sin(a * 6 + k) * Math.cos(c * 5));
    for (let q = 0; q < 6; q++) { const a = q + k, d = r * (0.3 + N.hash(k, q, 1400) * 0.55); if (q % 3 === 0) blossom(dmb, x + Math.cos(a) * d, y, z + Math.sin(a) * d, 0.9, N.hash(k, q, 1401)); else if (q % 3 === 1) flowers(dmb, x + Math.cos(a) * d, y, z + Math.sin(a) * d, N.hash(k, q, 1402)); else bush(dmb, x + Math.cos(a) * d, y, z + Math.sin(a) * d, 1, '#4fae4a', N.hash(k, q, 1403)); }
    // little waterfall falling off the edge
    dmb.cyl(x + r * 0.95, y - 30, z, 0.9, 0.9, 30, 8, [0.6, 0.85, 1, 0.3]);
    s.items.push({ id: 'isle:' + k, type: k === SKY_ISLES.length - 1 ? 'key' : 'cloud', p: [x, y + 0.6, z] });
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); out.push(s);
  });
  return out;
}
// cannons: roll in and get shot along an arc to the target
function cannonList(T) {
  const g = (x, z) => T.ground(x, z), C = [];
  C.push({ p: [34, g(34, -22), -22], to: [SKY_ISLES[0][0] - 6, SKY_ISLES[0][1] + 1, SKY_ISLES[0][2] - 4], name: 'Cannon to the sky islands' });
  for (let k = 0; k < SKY_ISLES.length - 1; k++) { const [x, y, z] = SKY_ISLES[k], [nx, ny, nz] = SKY_ISLES[k + 1], dx = nx - x, dz = nz - z, d = Math.hypot(dx, dz); C.push({ p: [x + dx / d * 9, y, z + dz / d * 9], to: [nx - dx / d * 6, ny + 1, nz - dz / d * 6] }); }
  const L = SKY_ISLES[SKY_ISLES.length - 1]; C.push({ p: [L[0] - 9, L[1], L[2]], to: [2, SPAWN_H + 2, 12], name: 'Back to the plaza' });
  return C;
}
function cannonModel(gl) {
  const mb = new MeshBuilder();
  mb.cyl(0, 0, 0, 1.6, 1.4, 0.6, 12, hex('#5a4a3a')); for (const s of [-1, 1]) { mb.push([0, 0.9, s * 1.1], M4.rotX(Math.PI / 2)); mb.cyl(0, -0.15, 0, 0.9, 0.9, 0.3, 12, hex('#6a4a2a')); mb.pop(); }
  mb.push([0, 1.1, 0], M4.rotZ(-0.9)); mb.lathe([[0.9, -0.8], [1.0, 0], [0.85, 2.2], [0.95, 2.4], [0.95, 2.6], [0.7, 2.6], [0.6, 0]], 16, (t, ph, k) => k >= 3 ? hex('#ffd24a') : hex('#3a3f55'), 0.2); mb.pop();
  return mb.build(gl);
}
