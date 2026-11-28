// Structures all over the world: the plaza, parkour, ring race, villages, ruins,
// pyramids, shipwrecks, caves and the giant abandoned station.
const REG = 192;

// everything solid that isn't terrain or a part lives here as triangles
class TriGrid {
  constructor() { this.cells = new Map(); }
  key(i, j) { return i * 65537 + j; }
  add(tris, owner) {
    const keys = new Set();
    for (const t of tris) {
      const [a, b, c] = t, nx = Math.min(a[0], b[0], c[0]), xx = Math.max(a[0], b[0], c[0]), nz = Math.min(a[2], b[2], c[2]), xz = Math.max(a[2], b[2], c[2]);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      t.n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(...t.n) || 1; t.n = t.n.map(v => v / l);
      t.ylo = Math.min(a[1], b[1], c[1]); t.yhi = Math.max(a[1], b[1], c[1]);
      for (let i = Math.floor(nx / 8); i <= Math.floor(xx / 8); i++) for (let j = Math.floor(nz / 8); j <= Math.floor(xz / 8); j++) {
        const k = this.key(i, j); let L = this.cells.get(k); if (!L) this.cells.set(k, L = []); L.push(t); keys.add(k);
      }
    }
    owner.gridKeys = keys; owner.gridTris = new Set(tris);
  }
  remove(owner) { if (!owner.gridKeys) return; for (const k of owner.gridKeys) { const L = this.cells.get(k); if (L) { const f = L.filter(t => !owner.gridTris.has(t)); if (f.length) this.cells.set(k, f); else this.cells.delete(k); } } owner.gridKeys = null; }
  near(x, z, r, out) { const seen = new Set(); for (let i = Math.floor((x - r) / 8); i <= Math.floor((x + r) / 8); i++) for (let j = Math.floor((z - r) / 8); j <= Math.floor((z + r) / 8); j++) { const L = this.cells.get(this.key(i, j)); if (L) for (const t of L) if (!seen.has(t)) { seen.add(t); out.push(t); } } return out; }
}

const STRUCT_TYPES = {
  ruins: 'Castle ruins', circle: 'Moon henge', village: 'Windmill village', tower: 'Watch keep', bigtree: 'Treehouse village', cabin: 'A-frame lodge',
  pyramid: 'Sun temple', pod: 'Crashed starship', igloo: 'Snow fort', frozen: 'Ice palace', cave: 'Crystal mine', stilts: 'Swamp witch house',
  arch: 'Crystal geode', shroomring: 'Mushroom house', wreck: 'Pirate wreck', lighthouse: 'Harbour beacon',
};

class Structures {
  constructor(T) {
    this.T = T; this.N = T.N; this.list = new Map(); this.grid = new TriGrid();
    this.caves = new Map(); this.boosts = [];
  }
  // which structure (if any) is in a region
  plan(rx, rz) {
    const N = this.N, r = N.hash(rx, rz, 900);
    const x = rx * REG + REG / 2 + (N.hash(rx, rz, 901) - 0.5) * 90, z = rz * REG + REG / 2 + (N.hash(rx, rz, 902) - 0.5) * 90;
    if (Math.abs(x) > LIMIT - 200 || Math.abs(z) > LIMIT - 200) return null;
    if (this.T.theme) { if (Math.hypot(x, z) < 120 || (landsOf(this.T.theme) || []).some(I => I.LR && Math.hypot(x - I.x, z - I.z) < I.LR + 40)) return null; for (const sp of themeSpecials(this.T.theme)) if (Math.hypot(x - sp.x, z - sp.z) < sp.r * 1.4) return null; }
    else if (Math.hypot(x, z) < 170 || Math.hypot(x - STATION.x, z - STATION.z) < 260 || Math.hypot(x - 100, z + 160) < 110 || Math.hypot(x + 520, z) < 110 || (VOLCANO.on && landsOf('berekor').some(I => I.LR && Math.hypot(x - I.x, z - I.z) < I.LR + 40))) return null;
    // every Berekor island has its own landmark in the middle (beta)
    const MK = [];
    for (const m of MK) if (Math.floor(m.x / REG) === rx && Math.floor(m.z / REG) === rz) {
      const mi = this.T.info(m.x, m.z); return { key: rx + ',' + rz, type: m.type, x: m.x, z: m.z, y: mi.h, b: mi.b, rot: N.hash(rx, rz, 904) * 6.28, seed: Math.floor(N.hash(rx, rz, 905) * 1e6) };
    }
    const inf = this.T.info(x, z); if (inf.h < 1.2) return null;
    const pick = (opts) => opts[Math.floor(N.hash(rx, rz, 903) * opts.length)];
    let type = null;
    const hilly = Math.abs(this.T.h(x + 12, z) - this.T.h(x - 12, z)) + Math.abs(this.T.h(x, z + 12) - this.T.h(x, z - 12)) > 9;
    if ((rx === 1 && rz === 0) || ((inf.b === 6 || hilly) && r < 0.75) || r > 0.9) type = 'cave';
    else if (r < 0.5) type = { 2: pick(['ruins', 'circle', 'village', 'tower']), 3: pick(['bigtree', 'cabin', 'ruins']), 4: pick(['pyramid', 'ruins', 'pod']),
      5: pick(['igloo', 'frozen', 'pod']), 6: pick(['tower', 'cave']), 7: pick(['stilts', 'ruins']), 8: pick(['arch', 'shroomring']), 1: pick(['wreck', 'lighthouse']), 12: pick(['pyramid', 'ruins', 'tower']), 13: pick(['pod', 'ruins']), 14: pick(['village', 'cabin']), 16: pick(['cabin', 'village', 'ruins']), 17: pick(['bigtree', 'ruins']), 18: pick(['igloo', 'frozen']), 19: pick(['pod', 'circle']), 20: pick(['arch', 'cave', 'tower']) }[inf.b] || (BIOMES[inf.b] && BIOMES[inf.b].st ? pick(BIOMES[inf.b].st) : null);
    if (!type) return null;
    let rot = N.hash(rx, rz, 904) * 6.28;
    if (type === 'cave') { // the cave mouth looks downhill
      const gx = this.T.h(x + 8, z) - this.T.h(x - 8, z), gz = this.T.h(x, z + 8) - this.T.h(x, z - 8);
      if (Math.hypot(gx, gz) > 0.5) rot = Math.atan2(-gx, -gz);
    }
    return { key: rx + ',' + rz, type, x, z, y: inf.h, b: inf.b, rot, seed: Math.floor(N.hash(rx, rz, 905) * 1e6) };
  }
  // make sure structures near (x,z) are built; drop far ones
  update(gl, x, z, rad) {
    const want = new Set();
    for (let rx = Math.floor((x - rad) / REG); rx <= Math.floor((x + rad) / REG); rx++) for (let rz = Math.floor((z - rad) / REG); rz <= Math.floor((z + rad) / REG); rz++) {
      const k = rx + ',' + rz; want.add(k);
      if (!this.list.has(k)) { const p = this.plan(rx, rz); this.list.set(k, p ? this.build(gl, p) : null); return; } // one per frame
    }
    for (const [k, s] of this.list) if (!want.has(k)) { if (s) { gl.free(s.mesh); this.grid.remove(s); } this.list.delete(k); }
  }
  build(gl, p) {
    const mb = new MeshBuilder().collect(); const s = { ...p, items: [], lights: [], triggers: [], label: STRUCT_TYPES[p.type] };
    const R = M4.rotY(p.rot); mb.at([p.x, p.y, p.z], R);
    const L = (lx, ly, lz) => { const v = M4.apply3(R, [lx, ly, lz]); return [p.x + v[0], p.y + v[1], p.z + v[2]]; };
    const item = (type, lx, ly, lz) => s.items.push({ id: 's:' + p.key + ':' + s.items.length, type, p: L(lx, ly, lz) });
    const N = this.N, rnd = k => N.hash(p.seed, k, 950);
    buildStructure(mb, p, s, item, L, rnd);
    s.mesh = mb.build(gl); this.grid.add(mb.tris, s);
    return s;
  }
}

// ---------- the plaza, parkour, ring race and station (always the same) ----------
function buildLandmarks(gl, st) {
  const out = [];
  // plaza
  {
    const mb = new MeshBuilder().collect(), y = SPAWN_H, s = { key: 'plaza', items: [], lights: [], triggers: [], label: null, x: 0, z: 0 }, H = bh(mb), C = h => hex(h);
    // paving: rings of two-tone stone tiles with a teal star pattern in the middle
    const ringR = [0, 5.2, 8.5, 12, 16, 20.5, 23.5], seg = 24;
    for (let r = 0; r < ringR.length - 1; r++) for (let k = 0; k < seg; k++) {
      const a0 = k / seg * 6.2832, a1 = (k + 1) / seg * 6.2832, r0 = ringR[r], r1 = ringR[r + 1], yy = y + 0.16;
      const col = r === ringR.length - 2 ? C(BC.stoneD) : r === 1 ? C(k % 2 ? '#48d6ac' : '#2fae8a') : shadeC(C((k + r) % 2 ? '#d8d2c4' : '#c8c0b0'), 0.96 + ((k * 7 + r * 3) % 5) * 0.012);
      if (r0 === 0) mb.tri([0, yy, 0], [Math.cos(a0) * r1, yy, Math.sin(a0) * r1], [Math.cos(a1) * r1, yy, Math.sin(a1) * r1], col);
      else mb.quad([Math.cos(a1) * r0, yy, Math.sin(a1) * r0], [Math.cos(a1) * r1, yy, Math.sin(a1) * r1], [Math.cos(a0) * r1, yy, Math.sin(a0) * r1], [Math.cos(a0) * r0, yy, Math.sin(a0) * r0], col);
    }
    // the fountain: a round pool, two bowls and a glowing orb on top
    mb.cyl(0, y - 0.2, 0, 4.6, 4.6, 1.0, 16, C(BC.stoneL)); mb.cyl(0, y + 0.8, 0, 4.8, 4.8, 0.18, 16, C(BC.stone));
    mb.cyl(0, y + 0.62, 0, 4.0, 4.0, 0.06, 16, glowC(C('#5ab8f0')), true);
    mb.cyl(0, y + 0.6, 0, 0.7, 0.55, 1.4, 8, C(BC.stoneL));
    mb.push([0, y + 2.0, 0]); mb.lathe([[0.4, 0], [1.9, 0.35], [2.1, 0.62], [1.8, 0.62], [0, 0.4]], 14, C(BC.stone), 0); mb.pop();
    mb.cyl(0, y + 2.4, 0, 0.32, 0.26, 1.3, 8, C(BC.stoneL));
    mb.push([0, y + 3.6, 0]); mb.lathe([[0.25, 0], [1.0, 0.25], [1.1, 0.45], [0.9, 0.45], [0, 0.3]], 12, C(BC.stone), 0); mb.pop();
    mb.ico(0, y + 4.6, 0, 0.6, 1, () => glowC(C('#8ff6ff')));
    // benches around the fountain, flower planters and lamps further out
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * 6.2832, bx = Math.cos(a) * 9.2, bz = Math.sin(a) * 9.2;
      mb.push([bx, y, bz], M4.rotY(-a + Math.PI / 2));
      H.box(-1.3, 0.45, -0.3, 1.3, 0.6, 0.3, BC.woodL); H.box(-1.3, 0.6, 0.22, 1.3, 1.25, 0.34, BC.wood);
      for (const sx of [-1.05, 1.05]) H.flatBox(sx - 0.08, 0, -0.25, sx + 0.08, 0.45, 0.25, '#3a3f55');
      mb.pop();
      const a2 = a + Math.PI / 6, px = Math.cos(a2) * 14, pz = Math.sin(a2) * 14;
      mb.push([px, y, pz], M4.rotY(-a2));
      H.box(-1.3, 0, -0.8, 1.3, 0.7, 0.8, BC.stoneL); mb.box(-1.15, 0.7, -0.65, 1.15, 0.78, 0.65, C('#6a4a32'), true);
      for (let q = 0; q < 3; q++) { mb.ico(-0.75 + q * 0.75, 1.05, 0, 0.42, 0, () => C(q % 2 ? '#5aa86a' : '#4a9a5a')); const fc = ['#ff8fb8', '#ffd24a', '#cdb4ff', '#a8d8ff', '#ff9a6a', '#ffffff'][(k + q) % 6]; for (let f = 0; f < 3; f++) mb.ico(-0.75 + q * 0.75 + Math.cos(f * 2.1) * 0.3, 1.32, Math.sin(f * 2.1) * 0.3, 0.1, 0, () => C(fc)); }
      mb.pop();
      const a3 = a + 0.26, lx = Math.cos(a3) * 21.5, lz = Math.sin(a3) * 21.5;
      mb.cyl(lx, y, lz, 0.32, 0.26, 0.4, 6, C('#3a3f55')); mb.cyl(lx, y + 0.4, lz, 0.11, 0.09, 3.8, 6, C('#3a3f55'));
      mb.box(lx - 0.3, y + 4.2, lz - 0.3, lx + 0.3, y + 4.8, lz + 0.3, glowC(C('#ffe9a8'))); mb.cyl(lx, y + 4.8, lz, 0.45, 0.05, 0.4, 4, C('#3a3f55'), true, 0.785); mb.box(lx - 0.36, y + 4.12, lz - 0.36, lx + 0.36, y + 4.2, lz + 0.36, C('#3a3f55'));
      s.lights.push({ p: [lx, y + 4.5, lz], r: 9, c: [1, 0.85, 0.55] });
    }
    // welcome arch facing the station: two pillars and a round arch of blocks
    const sa = Math.atan2(STATION.z, STATION.x);
    mb.push([Math.cos(sa) * 26, y, Math.sin(sa) * 26], M4.rotY(-sa + Math.PI / 2));
    for (const sx of [-4.6, 4.6]) { H.box(sx - 0.8, 0, -0.8, sx + 0.8, 0.6, 0.8, BC.stoneD); H.box(sx - 0.6, 0.6, -0.6, sx + 0.6, 5.2, 0.6, BC.stoneL); H.box(sx - 0.75, 5.2, -0.75, sx + 0.75, 5.6, 0.75, '#48d6ac'); }
    for (let k = 0; k < 9; k++) { const a0 = Math.PI * k / 9, a1 = Math.PI * (k + 1) / 9, r0 = 4.0, r1 = 5.3, P = (a, r, z) => [-Math.cos(a) * r, 5.6 + Math.sin(a) * r * 0.62, z], col = C(k % 2 ? '#48d6ac' : '#2fae8a');
      for (const [z0, z1] of [[-0.55, 0.55]]) { mb.quad(P(a0, r1, z1), P(a1, r1, z1), P(a1, r1, z0), P(a0, r1, z0), col); mb.quad(P(a0, r0, z0), P(a1, r0, z0), P(a1, r0, z1), P(a0, r0, z1), shadeC(col, 0.8)); mb.quad(P(a0, r0, z1), P(a1, r0, z1), P(a1, r1, z1), P(a0, r1, z1), shadeC(col, 0.92)); mb.quad(P(a1, r0, z0), P(a0, r0, z0), P(a0, r1, z0), P(a1, r1, z0), shadeC(col, 0.92)); } }
    mb.ico(0, 9.4, 0, 0.5, 1, () => glowC(C('#ffd27a')));
    mb.pop();
    s.signs = [{ p: [Math.cos(sa) * 26, y + 10.6, Math.sin(sa) * 26], t: 'The station is this way →' }];
    s.lights.push({ p: [0, y + 4.6, 0], r: 11, c: [0.4, 0.9, 1] });
    s.mesh = mb.build(gl); st.grid.add(mb.tris, s); out.push(s);
  }
  // parkour: fair jumps, checkpoints every 8 steps, trophy at the top
  {
    const mb = new MeshBuilder().collect(), cx = 44, cz = 38, base = st.T.h(cx, cz), s = { key: 'parkour', items: [], lights: [], triggers: [], label: 'Parkour climb', x: cx, z: cz, y: base, checkpoints: [] };
    mb.cyl(cx, base - 2, cz, 1.2, 1.2, 26, 8, hex('#5a4aa8'), true);
    let lastTop = base;
    for (let k = 0; k < 24; k++) {
      const a = k * 0.62, px = cx + Math.cos(a) * 6.5, pz = cz + Math.sin(a) * 6.5, top = base + 0.8 + k * 0.85;
      const big = k % 8 === 7, w = big ? 1.9 : 1.35;
      const col = big ? hex('#48d6ac') : hex(k % 2 ? '#8b7ae6' : '#a596ff');
      mb.bevel(px - w, top - 0.5, pz - w, px + w, top, pz + w, col, 0.12);
      mb.cyl(px, base - 2, pz, 0.15, 0.15, top - 0.5 - base + 2, 4, hex('#3a3f55'), false);
      if (big) s.checkpoints.push([px, top + 0.6, pz]);
      lastTop = top;
    }
    mb.bevel(cx - 2.6, lastTop + 0.35, cz - 2.6, cx + 2.6, lastTop + 0.85, cz + 2.6, hex('#ffc45a'), 0.15);
    s.items.push({ id: 'trophy', type: 'trophy', p: [cx, lastTop + 1.6, cz] });
    s.lights.push({ p: [cx, lastTop + 2, cz], r: 10, c: [1, 0.8, 0.3] });
    s.start = [cx + 6.5, base + 1.5, cz + 2];
    s.mesh = mb.build(gl); st.grid.add(mb.tris, s); out.push(s);
  }
  out.push(buildStation(gl, st));
  // the Station Road: glowing posts and boost rings all the way from the plaza to the station door
  {
    const L = Math.hypot(STATION.x, STATION.z), dx = STATION.x / L, dz = STATION.z / L, px = -dz, pz = dx;
    st.boosts = [];
    let mb = null, seg = null;
    const flush = () => { if (mb && seg) { seg.mesh = mb.build(gl); out.push(seg); } mb = null; seg = null; };
    for (let d = 44; d < L - STATION.R - 14; d += 22) {
      if (!mb || d - seg.d0 >= 110) { flush(); mb = new MeshBuilder(); seg = { key: 'road' + d, d0: d, x: dx * (d + 55), z: dz * (d + 55), items: [], lights: [], triggers: [], label: null }; }
      for (const side of [-1, 1]) {
        const x = dx * d + px * side * 4.5, z = dz * d + pz * side * 4.5, y = st.T.h(x, z); if (y < SEA + 0.2) continue;
        mb.cyl(x, y - 0.4, z, 0.13, 0.09, 2.3, 5, hex('#39405a'), false);
        mb.ico(x, y + 2.05, z, 0.28, 1, () => glowC(hex('#5ff0e0')));
        mb.at([x, y + 1.35, z], M4.rotY(Math.atan2(dx, dz))); // little arrows pointing at the station
        mb.tri([-0.3, 0, -0.02], [0.3, 0, -0.02], [0, 0.26, 0.2], glowC(hex('#ffc45a'))); mb.tri([0.3, 0, -0.02], [-0.3, 0, -0.02], [0, 0.26, 0.2], glowC(hex('#ffc45a'))); mb.reset();
      }
      if (Math.round((d - 44) / 22) % 4 === 1) { const x = dx * d, z = dz * d, y = st.T.h(x, z); if (y > SEA + 0.2) st.boosts.push({ p: [x, y + 1.9, z], yaw: Math.atan2(dx, dz), dir: [dx, dz] }); }
    }
    flush();
  }
  return out;
}

function raceRings(T) {
  const rings = [];
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2 + 0.3, R = 78 + Math.sin(k * 1.7) * 12;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    let gh = -99; for (let dz = -3; dz <= 3; dz += 3) for (let dx = -3; dx <= 3; dx += 3) gh = Math.max(gh, T.h(x + dx, z + dz));
    rings.push({ x, y: Math.max(gh, SEA) + 2, z, yaw: -a });
  }
  return { rings, start: [Math.cos(0.3 - 0.35) * 30, SPAWN_H + 0.1, Math.sin(0.3 - 0.35) * 30] };
}

// The giant abandoned station: a huge ball half in the ground that you can explore.
function buildStation(gl, st) {
  const S = STATION, cx = S.x, cy = S.ground, cz = S.z, R = S.R;
  const mb = new MeshBuilder().collect();
  const s = { key: 'station', items: [], lights: [], triggers: [], label: 'Abandoned station', x: cx, z: cz, y: cy, station: true };
  const door = Math.atan2(-cz, -cx); // faces the plaza
  const ang = (x, z) => { let d = Math.atan2(z, x) - door; while (d > Math.PI) d -= 6.28; while (d < -Math.PI) d += 6.28; return d; };
  const N = st.N;
  const holes = [[0.3, 0.92], [-2.2, 0.8], [2.1, 0.75]]; // broken skylights (angle, height)
  const keep = m => {
    if (m[1] < -0.06) return false;
    if (Math.abs(ang(m[0], m[2])) < 0.085 && m[1] * R < 9) return false; // the doorway
    for (const [a, y] of holes) if (Math.abs(ang(m[0], m[2]) - a) < 0.12 && Math.abs(m[1] - y) < 0.06) return false;
    return true;
  };
  const panel = (x, y, z) => {
    const n = N.hash(Math.floor(x * 40), Math.floor(z * 40 + y * 90), 77);
    if (Math.abs(y - 0.12) < 0.03) return glowC(hex('#5ff0e0'));
    if (n < 0.06) return hex('#7a5a48');           // rust
    if (n < 0.14) return hex('#5d646e');           // dark panel
    return shadeC(hex('#d9dee6'), 0.86 + n * 0.12);
  };
  mb.ico(cx, cy, cz, R, 4, panel, false, keep);
  const inside = new MeshBuilder();
  inside.ico(cx, cy, cz, R - 0.4, 4, (x, y, z) => { const n = N.hash(Math.floor(x * 40), Math.floor(z * 40 + y * 90), 78); return Math.abs(y - 0.3) < 0.02 || Math.abs(y - 0.55) < 0.02 ? glowC(hex('#3fd8c8')) : shadeC(hex('#3a414d'), 0.85 + n * 0.2); }, true, keep);
  // doorway frame and tunnel
  mb.at([cx + Math.cos(door) * (R - 1), cy, cz + Math.sin(door) * (R - 1)], M4.rotY(-door + Math.PI / 2));
  mb.box(-6.4, -0.5, -3, -5.2, 9.5, 3, hex('#4a515c')); mb.box(5.2, -0.5, -3, 6.4, 9.5, 3, hex('#4a515c')); mb.box(-6.4, 9.5, -3, 6.4, 10.6, 3, hex('#4a515c'));
  mb.box(-5.2, 8.6, 2.9, 5.2, 9.2, 3.1, glowC(hex('#ffb84a')));
  mb.reset();
  // floor
  for (let k = 0; k < 36; k++) {
    const a0 = k / 36 * 6.28, a1 = (k + 1) / 36 * 6.28;
    for (let r = 0; r < 4; r++) {
      const r0 = 6 + r * 13.4, r1 = 6 + (r + 1) * 13.4, P = (a, rr) => [cx + Math.cos(a) * rr, cy + 0.05, cz + Math.sin(a) * rr];
      mb.quad(P(a0, r0), P(a0, r1), P(a1, r1), P(a1, r0), (k + r) % 2 ? hex('#59616c') : hex('#4f5762'));
    }
    if (k % 3 === 0) { const P = (rr, w) => [cx + Math.cos(a0) * rr + Math.cos(a0 + 1.57) * w, cy + 0.08, cz + Math.sin(a0) * rr + Math.sin(a0 + 1.57) * w]; mb.quad(P(8, -0.12), P(55, -0.12), P(55, 0.12), P(8, 0.12), glowC(hex('#3fd8c8')), true); }
  }
  // the glowing core
  mb.cyl(cx, cy, cz, 6, 6, 1.2, 12, hex('#3a414d'));
  mb.cyl(cx, cy + 1.2, cz, 3.2, 3.2, 44, 10, glowC(hex('#6ff6ff')));
  for (let k = 0; k < 6; k++) mb.cyl(cx, cy + 6 + k * 7, cz, 4, 4, 0.8, 10, hex('#4a515c'));
  mb.ico(cx, cy + 47, cz, 3.5, 1, () => glowC(hex('#c8fbff')));
  // a beam of light from the top that you can see from far away
  mb.cyl(cx, cy + R - 1, cz, 2.2, 1.2, 12, 8, hex('#4a515c'), false);
  { const beam = new MeshBuilder(); beam.cyl(cx, cy + R + 8, cz, 2.4, 1.6, 520, 6, glowC(hex('#b8fbff')), false); for (let k = 0; k < 3; k++) beam.cyl(cx, cy + R + 14 + k * 9, cz, 3.2 - k * 0.6, 3.2 - k * 0.6, 0.5, 10, glowC(hex('#5ff0e0'))); s.beam = beam.build(gl); const halo = new MeshBuilder(); halo.cyl(cx, cy + R + 8, cz, 8, 5, 520, 8, [0.55, 0.95, 1, 0.09], false); s.halo = halo.build(gl); }
  // spiral ramp around the core up to the top deck
  const turns = 1.5, segs = 72, top = 36, r0 = 8, r1 = 13;
  for (let k = 0; k < segs; k++) {
    const a0 = k / segs * turns * 6.28 + door, a1 = (k + 1) / segs * turns * 6.28 + door, y0 = cy + k / segs * top, y1 = cy + (k + 1) / segs * top;
    const P = (a, r, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    mb.quad(P(a0, r0, y0), P(a1, r0, y1), P(a1, r1, y1), P(a0, r1, y0), k % 2 ? hex('#8a93a3') : hex('#7d8696'));
    mb.quad(P(a0, r1, y0 - 0.4), P(a1, r1, y1 - 0.4), P(a1, r0, y1 - 0.4), P(a0, r0, y0 - 0.4), hex('#3a414d'));
    mb.quad(P(a0, r0, y0 - 0.4), P(a1, r0, y1 - 0.4), P(a1, r0, y1 + 0.7), P(a0, r0, y0 + 0.7), hex('#5d646e')); // inner rail
    if (k % 6 === 0) mb.quad(P(a0, r1 - 0.05, y0 + 0.02), P(a1, r1 - 0.05, y1 + 0.02), P(a1, r1 - 0.35, y1 + 0.02), P(a0, r1 - 0.35, y0 + 0.02), glowC(hex('#ffb84a')), true);
  }
  // decks at three levels
  for (const [lvl, gapA] of [[12, Math.PI], [24, 2 * Math.PI], [36, 3 * Math.PI]]) {
    const y = cy + lvl, ro = Math.sqrt(R * R - lvl * lvl) - 1.5;
    for (let k = 0; k < 40; k++) {
      const a0 = k / 40 * 6.28, a1 = (k + 1) / 40 * 6.28, P = (a, r, yy) => [cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r];
      mb.quad(P(a0, r1, y), P(a1, r1, y), P(a1, ro, y), P(a0, ro, y), (k % 2) ? hex('#6a7380') : hex('#636c79'));
      mb.quad(P(a0, ro, y - 0.5), P(a1, ro, y - 0.5), P(a1, r1, y - 0.5), P(a0, r1, y - 0.5), hex('#2f353f'));
      if (k % 4 === 0) mb.quad(P(a0, ro - 0.2, y + 0.02), P(a1, ro - 0.2, y + 0.02), P(a1, ro - 0.6, y + 0.02), P(a0, ro - 0.6, y + 0.02), glowC(hex('#3fd8c8')), true);
    }
    s.items.push({ id: 'st:' + lvl, type: 'relic', p: [cx + Math.cos(door + gapA + 1.2) * (ro - 4), y + 0.6, cz + Math.sin(door + gapA + 1.2) * (ro - 4)] });
  }
  // abandoned stuff: crates, consoles, fallen panels
  for (let k = 0; k < 26; k++) {
    const a = N.hash(k, 3, 801) * 6.28, r = 18 + N.hash(k, 4, 801) * 34, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (Math.abs(ang(x - cx, z - cz)) < 0.2) continue;
    const t = N.hash(k, 5, 801);
    mb.at([x, cy, z], M4.rotY(a));
    if (t < 0.45) mb.bevel(-0.9, 0, -0.9, 0.9, 1.6, 0.9, hex(t < 0.2 ? '#8a6a48' : '#5d646e'), 0.12);
    else if (t < 0.75) { mb.box(-1.2, 0, -0.5, 1.2, 1.1, 0.5, hex('#3a414d')); mb.quad([-1, 1.1, -0.4], [1, 1.1, -0.4], [1, 1.9, -0.1], [-1, 1.9, -0.1], glowC(hex(t < 0.6 ? '#5ff0e0' : '#ff8a5a')), true); }
    else mb.box(-2, 0, -0.1, 2, 0.25, 3, hex('#c8ccd4'));
  }
  mb.reset();
  s.items.push({ id: 'st:core', type: 'star', p: [cx + 4.5, cy + 37, cz] }, { id: 'st:floor', type: 'relic', p: [cx - 25, cy + 0.6, cz + 12] });
  s.lights.push({ p: [cx, cy + 20, cz], r: 40, c: [0.35, 0.9, 1] }, { p: [cx, cy + 46, cz], r: 18, c: [0.6, 0.95, 1] });
  s.signs = [{ p: [cx + Math.cos(door) * (R + 2), cy + 12, cz + Math.sin(door) * (R + 2)], t: 'Abandoned station' }];
  s.mesh = mb.build(gl); s.inside = inside.build(gl);
  st.grid.add(mb.tris, s);
  s.door = door;
  return s;
}
const insideStation = p => !REGION_NOW && Math.hypot(p[0] - STATION.x, p[1] - STATION.ground, p[2] - STATION.z) < STATION.R - 1 && p[1] > STATION.ground - 2;
const nearStation = (x, z, pad = 18) => !REGION_NOW && Math.hypot(x - STATION.x, z - STATION.z) < STATION.R + pad;

// ---------- caves: a separate underground level under each cave entrance ----------
class Cave {
  constructor(N, key, entrance) {
    this.N = N; this.key = key; this.ex = entrance;
    const h = N.hash(key.length, [...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7), 960);
    this.o = [entrance.p[0], -300 - Math.floor(h * 4) * 70, entrance.p[2]];
    this.seed = Math.floor(h * 1e6);
    const rnd = k => N.hash(this.seed, k, 961);
    this.ch = [[0, 0, 11]]; // the first room is big and open, with the way out in the middle
    for (let k = 1; k < 7; k++) { const a = rnd(k) * 6.28, d = 18 + rnd(k + 20) * 34; this.ch.push([Math.cos(a) * d, Math.sin(a) * d, 7 + rnd(k + 40) * 6]); }
    this.items = this.ch.slice(1).map((c, k) => ({ id: 'cave:' + key + ':' + k, type: k % 3 === 0 ? 'gem' : 'crystal', p: [this.o[0] + c[0], 0, this.o[2] + c[1]] }));
    for (const it of this.items) it.p[1] = this.floor(it.p[0], it.p[2]) + 0.6;
    this.lights = this.ch.slice(1).map(c => ({ p: [this.o[0] + c[0] + 2, this.floor(this.o[0] + c[0] + 2, this.o[2] + c[1]) + 1.5, this.o[2] + c[1]], r: 16, c: c[2] > 10 ? [0.8, 0.5, 1] : [0.4, 0.9, 1] }));
    this.exit = [this.o[0], this.floor(this.o[0], this.o[2]) + 1.2, this.o[2]];
  }
  open(x, z) {
    const lx = x - this.o[0], lz = z - this.o[2];
    if (Math.abs(lx) > 62 || Math.abs(lz) > 62) return 0;
    let o = 0;
    for (const [cx, cz, r] of this.ch) o = Math.max(o, smooth(r, r - 4, Math.hypot(lx - cx, lz - cz)));
    for (let k = 1; k < this.ch.length; k++) { // tunnels between chambers
      const [ax, az] = this.ch[k - 1], [bx, bz] = this.ch[k];
      const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((lx - ax) * dx + (lz - az) * dz) / (dx * dx + dz * dz)));
      o = Math.max(o, smooth(3.6, 2.2, Math.hypot(lx - ax - dx * t, lz - az - dz * t)));
    }
    const w = Math.abs(this.N.fbm(x / 26, z / 26, this.seed % 1000 + 970, 2) - 0.5);
    o = Math.max(o, smooth(0.05, 0.015, w) * 0.9);
    return o;
  }
  floor(x, z) { return this.o[1] + (this.N.fbm(x / 18, z / 18, 980, 3) - 0.5) * 4; }
  ceil(x, z) { const o = this.open(x, z); return this.floor(x, z) + (o < 0.18 ? o * 2 : o * (8 + this.N.fbm(x / 9, z / 9, 990, 2) * 6)); }
  build(gl) {
    const mb = new MeshBuilder(), C = 2, n = 64;
    const fl = [], ce = [], op = [];
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { const x = this.o[0] + i * C, z = this.o[2] + j * C; fl.push(this.floor(x, z)); ce.push(this.ceil(x, z)); op.push(this.open(x, z)); }
    const W = 2 * n + 1, idx = (i, j) => (j + n) * W + (i + n);
    const rock = hex('#4a4652'), rock2 = hex('#3a3842'), moss = hex('#3f6a5a');
    for (let j = -n; j < n; j++) for (let i = -n; i < n; i++) {
      const ks = [idx(i, j), idx(i + 1, j), idx(i, j + 1), idx(i + 1, j + 1)];
      if (ks.every(k => op[k] <= 0)) continue;
      const P = (k, ii, jj, arr) => [this.o[0] + ii * C, arr[k], this.o[2] + jj * C];
      const f = [P(ks[0], i, j, fl), P(ks[1], i + 1, j, fl), P(ks[2], i, j + 1, fl), P(ks[3], i + 1, j + 1, fl)];
      const c = [P(ks[0], i, j, ce), P(ks[1], i + 1, j, ce), P(ks[2], i, j + 1, ce), P(ks[3], i + 1, j + 1, ce)];
      const nn = this.N.hash(i, j, 999), fc = nn < 0.15 ? moss : shadeC(rock, 0.9 + nn * 0.2);
      mb.tri(f[0], f[3], f[1], fc); mb.tri(f[0], f[2], f[3], shadeC(fc, 0.95));
      mb.tri(c[0], c[1], c[3], shadeC(rock2, 0.9 + nn * 0.2)); mb.tri(c[0], c[3], c[2], rock2);
    }
    for (const [cx, cz, r] of this.ch.slice(1)) {
      const x = this.o[0] + cx + 2, z = this.o[2] + cz, y = this.floor(x, z);
      crystals(mb, x, y, z, 1.6, r > 10 ? '#c08fff' : '#8ff6ff');
      giantShroom(mb, this.o[0] + cx - 3, this.floor(this.o[0] + cx - 3, this.o[2] + cz + 2), this.o[2] + cz + 2, 0.5, r / 13);
    }
    // the way back up: a glowing ring at the start
    mb.at(this.exit, M4.rotX(Math.PI / 2)); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; mb.ico(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0, 0.25, 0, () => glowC(hex('#ffc45a'))); }
    this.mesh = mb.build(gl);
  }
  tris(x, z, r, out) {
    const C = 2;
    for (let i = Math.floor((x - r - this.o[0]) / C); i <= Math.floor((x + r - this.o[0]) / C); i++) for (let j = Math.floor((z - r - this.o[2]) / C); j <= Math.floor((z + r - this.o[2]) / C); j++) {
      const X = k => this.o[0] + k * C, Z = k => this.o[2] + k * C;
      const f = (a, b) => [X(a), this.floor(X(a), Z(b)), Z(b)], c = (a, b) => [X(a), this.ceil(X(a), Z(b)), Z(b)];
      out.push([f(i, j), f(i + 1, j + 1), f(i + 1, j)], [f(i, j), f(i, j + 1), f(i + 1, j + 1)], [c(i, j), c(i + 1, j), c(i + 1, j + 1)], [c(i, j), c(i + 1, j + 1), c(i, j + 1)]);
    }
  }
}

// The volcano seen from far away: a copy of its cone (a little smaller, so the real ground covers it up close)
// with its glowing lava, and a tall plume of smoke over the crater.
function buildVolcano(gl, T) {
  const V = VOLCANO, mb = new MeshBuilder(), dmb = new MeshBuilder(), NA = 72, NR = 40, P = [];
  const s = { key: 'volcano', items: [], lights: [], triggers: [], label: null, x: V.x, z: V.z, far: 3600, rad: V.R, hideNear: 230 };
  for (let r = 0; r <= NR; r++) for (let a = 0; a < NA; a++) {
    const rr = (r / NR) * V.R * 0.98, th = a / NA * 6.2832, x = V.x + Math.cos(th) * rr, z = V.z + Math.sin(th) * rr, h = T.info(x, z).h - 3.5;
    P.push([x, h, z]);
  }
  const at = (r, a) => P[r * NA + ((a % NA) + NA) % NA];
  for (let r = 0; r <= NR; r++) for (let a = 0; a < NA; a++) {
    const p = at(r, a), q0 = at(Math.max(0, r - 1), a), q1 = at(Math.min(NR, r + 1), a), w0 = at(r, a - 1), w1 = at(r, a + 1);
    const u = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]], v = [w1[0] - w0[0], w1[1] - w0[1], w1[2] - w0[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; if (r === 0) n = [0, 1, 0]; if (n[1] < 0) n = n.map(k => -k); const l = Math.hypot(...n) || 1;
    mb.vert(p, [n[0] / l, n[1] / l, n[2] / l], vertexColor(T, p[0], p[2], p[1] + 3.5, n[1] / l));
  }
  for (let r = 0; r < NR; r++) for (let a = 0; a < NA; a++) { const A = r * NA + a, B = r * NA + (a + 1) % NA, C = (r + 1) * NA + a, D = (r + 1) * NA + (a + 1) % NA; mb.i.push(A, B, C, C, B, D); }
  s.mesh = mb.build(gl);
  // smoke: soft grey puffs rising from the crater and leaning with the wind
  const R = k => { const t = Math.sin(k * 127.1 + 311.7) * 43758.5453; return t - Math.floor(t); };
  for (let k = 0; k < 40; k++) {
    const t = k / 39, y = V.top + 40 + t * 280, drift = t * t * 130, r = 16 + t * 44 + R(k) * 12;
    const x = V.x + drift + (R(k + 50) - 0.5) * 30 * (1 + t), z = V.z + drift * 0.45 + (R(k + 90) - 0.5) * 30 * (1 + t), g = 0.5 + t * 0.25 + R(k + 7) * 0.06;
    dmb.ico(x, y, z, [r, r * 0.7, r], 2, (a, b) => [g + b * 0.1, g * 0.97 + b * 0.1, g * 0.95 + b * 0.1, 0.38 - t * 0.12]);
  }
  for (let k = 0; k < 6; k++) { const a = k / 6 * 6.2832; dmb.ico(V.x + Math.cos(a) * 22, V.lava + 8 + R(k + 3) * 6, V.z + Math.sin(a) * 22, [16, 6, 16], 1, () => [0.55, 0.42, 0.38, 0.25]); }
  s.deco = dmb.build(gl);
  s.lights.push({ p: [V.x, V.lava + 10, V.z], r: 45, c: [0.7, 0.28, 0.08] });
  return s;
}
