// Landmark islands for the themed regions. There are no plain islands: every island IS one huge landmark
// (a volcano, a spire that pokes above the clouds, a giant mesa, a cluster of floating isles, a special
// landmark blown up big, or the plaza you start on), with only a strip of beach round its foot.
// Each high landmark has a shooting elevator at its foot up to ONE cool place halfway up (a hangout,
// an observatory, hot springs, a café, a library...), and another elevator from there to the very top.

const LAND_GROUP = { dust: 'hot', cinder: 'hot', magma: 'hot', obsidian: 'hot', ashveil: 'hot', glacier: 'cold', aurora: 'cold', frostpeak: 'cold', snowdrift: 'cold' };
const LAND_ORDER = {
  hot: ['volcano', 'cloudspire', 'volcano', 'floating', 'mesa', 'volcano', 'cloudspire', 'floating', 'mesa', 'volcano'],
  cold: ['cloudspire', 'floating', 'mesa', 'cloudspire', 'volcano', 'floating', 'mesa', 'cloudspire', 'floating', 'mesa'],
  mild: ['cloudspire', 'floating', 'volcano', 'mesa', 'floating', 'cloudspire', 'mesa', 'volcano', 'floating', 'cloudspire'],
};
// H = how tall the landmark is, LR = how wide its foot is, R = the whole island (only a beach round the landmark)
const LAND_SIZE = { volcano: { H: 380, LR: 760, R: 860 }, cloudspire: { H: 620, LR: 520, R: 620 }, mesa: { H: 270, LR: 660, R: 760 }, floating: { H: 0, LR: 0, R: 620 }, plaza: { H: 60, LR: 470, R: 560 } };
// each kind comes in three shapes (v = 0, 1, 2), each its own height. Cloud spires go right up above every cloud.
const LAND_VH = { volcano: [380, 300, 470], cloudspire: [1180, 1320, 1250], mesa: [270, 200, 340] };
// how wide a volcano's crater is
const landRc = I => I.LR * (I.v === 1 ? 0.24 : 0.14);
const SPECIAL_BIG = 3; // the special landmarks (The Great Mushroom, The Shell...) are built this many times bigger
const LAND_NAMES = {
  volcano: ['Mount Scorch', 'Emberhorn', 'Smokecrown', 'Blazepeak', 'Cinder Crown', 'Ashfang', 'Firethroat', 'Magmaw', 'Heatwave Peak'],
  cloudspire: ['Above the Clouds', 'Skyneedle', 'Cloudpiercer', 'Highwind Spire', 'Stormtop', 'Heavenreach', 'Mistcrown', 'Windwhistle Peak', 'Sky Splitter'],
  mesa: ['Giant\'s Table', 'Sunshelf', 'Flattop', 'Broadcrown', 'Redwall', 'Highstep', 'Stonestack', 'Thunder Mesa', 'Tall Table'],
  floating: ['Floating Isles', 'Driftrocks', 'Skyscatter', 'Hovering Holm', 'Cloudstep Isles', 'Upfall', 'Airborne Keys', 'Levitas', 'Gravity Gap'],
};
const PLACE_KINDS = ['hangout', 'observatory', 'hotspring', 'cafe', 'library', 'garden', 'arcade', 'campsite', 'museum', 'shrine'];
const PLACE_NAMES = {
  hangout: ['The Comfy Ledge', 'Chill Shelf', 'The Cozy Nook'], observatory: ['Star Observatory', 'Skywatch Dome', 'Comet Lookout'],
  hotspring: ['Steamy Springs', 'Warm Pools', 'Cloud Baths'], cafe: ['Cliffside Café', 'Cloud Café', 'Sky High Café'],
  library: ['Hidden Library', 'Quiet Pages', 'Book Nook'], garden: ['Hanging Garden', 'Secret Garden', 'Bloom Ledge'],
  arcade: ['Glow Arcade', 'High Score Hall', 'Pixel Palace'], campsite: ['Ledge Camp', 'Starlight Camp', 'Cliff Camp'],
  museum: ['Relic Museum', 'Wonder Hall', 'Old Things Hall'], shrine: ['Bell Shrine', 'Lantern Shrine', 'Cliff Shrine'],
};
const PLACE_TXT = { shrine: 'a shrine with a giant bell', hangout: 'a comfy hangout', observatory: 'an observatory', hotspring: 'hot springs', cafe: 'a café', library: 'a library', garden: 'a garden', arcade: 'an arcade', campsite: 'a campsite', museum: 'a museum' };
const LAND_TXT = { volcano: 'a giant volcano with lava inside', cloudspire: 'a giant spire that pokes above the clouds', mesa: 'a giant flat-topped mesa', floating: 'giant rocks floating in the sky', plaza: 'the giant plaza where you start', hub: 'the plaza where you start, with the fun park, the arena and the station', special: 'a giant landmark' };
const LAND_DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// the special landmarks move out from the plaza so each gets its own island, and are built big.
// Ones close together (the Broken Bridge and the Power Station) stay together on one island.
const SPECIAL_GROUPS = {};
for (const [th, C] of Object.entries(REGION_THEMES)) {
  const groups = [];
  for (const sp of C.specials) { const g = groups.find(q => q.some(o => Math.hypot(o.x - sp.x, o.z - sp.z) < 700)); if (g) g.push(sp); else groups.push([sp]); }
  SPECIAL_GROUPS[th] = groups.map(g => {
    const gx = g.reduce((a, q) => a + q.x, 0) / g.length, gz = g.reduce((a, q) => a + q.z, 0) / g.length, dl = Math.hypot(gx, gz) || 1, D = 2700, ox = gx / dl * D - gx, oz = gz / dl * D - gz;
    const S = g.length > 1 ? 1 : SPECIAL_BIG; // a pair joined by a bridge keeps its size, so the bridge still works
    for (const sp of g) { sp.x = Math.round(sp.x + ox); sp.z = Math.round(sp.z + oz); sp.gx = Math.round(gx + ox); sp.gz = Math.round(gz + oz); sp.bigS = S; }
    const cx = gx + ox, cz = gz + oz, far = Math.max(...g.map(sp => Math.hypot(sp.x - cx, sp.z - cz) * S + sp.r * 1.1 * (S > 1 ? 1.2 : 1)));
    return { list: g, x: Math.round(cx), z: Math.round(cz), R: Math.round(far + 120), flat: Math.round(far) };
  });
}

// Berekor (owner only for now): its plaza island keeps the plaza, the fun park, the arena and the station;
// every other island is one giant landmark, starting with the volcano
const BEREKOR_HUB = { ax: 0, az: 0, bx: 640, bz: -420, r: 620 };
function BEREKOR_HUB_LANDS() {
  const H = BEREKOR_HUB, V = LAND_SIZE.volcano;
  return [{ id: 'landing', kind: 'hub', name: 'Berekor Plaza', x: (H.ax + H.bx) / 2, z: (H.az + H.bz) / 2, R: H.r + 400, H: 0, LR: 0, dir: 0 },
    { id: 'volcano', kind: 'volcano', v: 0, name: 'Mount Scorch', x: VOLCANO.x, z: VOLCANO.z, R: V.R, H: V.H, LR: V.LR, dir: 3, place: 'hotspring', placeName: 'Steamy Springs' }];
}
// how far a spot is inside the plaza island (above 0 = on it)
function berekorHubE(x, z, wob) {
  const H = BEREKOR_HUB, vx = H.bx - H.ax, vz = H.bz - H.az, t = Math.max(0, Math.min(1, ((x - H.ax) * vx + (z - H.az) * vz) / (vx * vx + vz * vz)));
  return 1 - Math.hypot(x - H.ax - vx * t, z - H.az - vz * t) / (H.r * (1 + 0.35 * wob));
}
const _lands = {};
function landsOf(theme) {
  if (_lands[theme]) return _lands[theme];
  const C = theme === 'berekor' ? { landing: 'Berekor Plaza' } : REGION_THEMES[theme]; if (!C) return null;
  let s = 7; for (const ch of theme) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const P = LAND_SIZE.plaza, out = theme === 'berekor' ? BEREKOR_HUB_LANDS() : [{ id: 'landing', kind: 'plaza', name: C.landing, x: 0, z: 0, R: P.R, H: P.H, LR: P.LR, dir: 0 }];
  for (const g of SPECIAL_GROUPS[theme] || []) out.push({ id: g.list[0].id, kind: 'special', name: g.list.map(q => q.name).join(' and '), x: g.x, z: g.z, R: g.R, flat: g.flat, sps: g.list });
  // (Berekor's volcano is already placed, so it has one random volcano fewer)
  const order = LAND_ORDER[LAND_GROUP[theme] || 'mild'].filter((k, i) => theme !== 'berekor' || i !== 2), nOff = Math.floor(rnd() * 9), pOff = Math.floor(rnd() * 9), used = {};
  let tries = 0, n = 0;
  while (n < order.length && tries < 6000) {
    tries++;
    const kind = order[n], S = LAND_SIZE[kind], a = rnd() * 6.2832, r = 2000 + rnd() * (6900 - S.R - 2000), x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    if (out.some(q => Math.hypot(q.x - x, q.z - z) < (q.R + S.R) * 1.25 + 120)) continue;
    const kc = used[kind] = (used[kind] || 0) + 1; let pk = 0; while (pk < PLACE_KINDS.length && out.some(q => q.place === PLACE_KINDS[(pOff + n * 3 + pk) % PLACE_KINDS.length])) pk++; const place = PLACE_KINDS[(pOff + n * 3 + pk) % PLACE_KINDS.length]; // no two places alike
    const v = (kc + nOff) % 3; // landmarks of the same kind each get a different shape and height
    out.push({ id: 'land' + n, kind, v, name: LAND_NAMES[kind][(nOff + kc * 2) % LAND_NAMES[kind].length], x, z, R: S.R, H: (LAND_VH[kind] || [S.H])[v] || S.H, LR: S.LR, dir: Math.floor(rnd() * 4), place, placeName: PLACE_NAMES[place][(nOff + n) % 3] });
    n++;
  }
  _lands[theme] = out; return out;
}
// how high a landmark's own rock is at distance d from its middle
function landProfile(I, d, N, x, z) {
  if (d >= I.LR) return -1e9;
  const ang = Math.atan2(z - I.z, x - I.x);
  if (I.kind === 'volcano') {
    // v0: a steep cone. v1: a broad shield with a wide crater. v2: tall and jagged, its rim broken into teeth.
    const rc = landRc(I), ex = [1.15, 0.75, 1.5][I.v || 0], dep = [60, 45, 80][I.v || 0], cone = q => I.H * Math.pow(Math.max(0, 1 - q / I.LR), ex);
    if (d < rc) return cone(rc) - dep * (1 - (d / rc) ** 2);
    const teeth = I.v === 2 ? 0.16 * Math.sin(ang * 5 + 1) * smooth(rc, rc + 50, d) * smooth(I.LR * 0.55, rc + 60, d) : 0;
    return cone(d) * (1 + teeth + 0.06 * Math.sin(ang * 11 + d / 50) * smooth(rc, rc + 60, d)) + (N.fbm(x / 60, z / 60, 235, 2) - 0.5) * 10 * smooth(rc, rc + 40, d);
  }
  if (I.kind === 'cloudspire') {
    const n = (N.fbm(x / 90, z / 90, 233, 2) - 0.5) * 0.3, rough = (N.fbm(x / 40, z / 40, 236, 2) - 0.5) * 14 * smooth(I.LR * 0.4, I.LR * 0.6, d);
    if (I.v === 1) { // a stack of five giant rock drums, each with a ledge
      const t = smooth(I.LR * (1 + n), I.LR * 0.35, d), k = Math.floor(t * 5), f = t * 5 - k; return I.H * (k + smooth(0.7, 1, f)) / 5 + rough;
    }
    if (I.v === 2) { // a fluted column with deep grooves and a sharp pinnacle in the middle of its top
      const dd = d * (1 + 0.2 * Math.sin(ang * 7 + n * 4)); return I.H * smooth(I.LR * (1 + n), I.LR * 0.42, dd) + I.H * 0.06 * smooth(I.LR * 0.16, 0, d) + rough;
    }
    return I.H * smooth(I.LR * (1 + n), I.LR * 0.4, d) + rough;
  }
  if (I.kind === 'mesa') {
    const n = (N.fbm(x / 120, z / 120, 234, 2) - 0.5) * 0.2;
    if (I.v === 1) { const t = smooth(I.LR * (1 + n), I.LR * 0.9, d); return I.H * t + (N.fbm(x / 30, z / 30, 237, 2) - 0.5) * 6 * (1 - t); } // one sheer wall all round
    if (I.v === 2) { const lo = smooth(I.LR * (1 + n), I.LR * 0.92, d), hi = smooth(I.LR * (0.6 + n), I.LR * 0.52, d); return I.H * (0.45 * lo + 0.55 * hi); } // a big lower shelf, then the tall top
    const t = smooth(I.LR * (1 + n), I.LR * 0.72, d), h = I.H * t; return t > 0.98 ? I.H : Math.floor(h / 30) * 30 + smooth(0.6, 1, h / 30 % 1) * 30;
  }
  if (I.kind === 'plaza') {
    // four round tiers, each with ramps up on four sides
    const T = [[I.LR, 0], [I.LR * 0.78, 15], [I.LR * 0.56, 30], [I.LR * 0.34, 45], [I.LR * 0.18, 60]], dx = Math.abs(x - I.x), dz = Math.abs(z - I.z);
    let h = 0; for (let k = 1; k < T.length; k++) if (d < T[k][0]) h = T[k][1]; else { const ed = d - T[k][0]; if (ed < 4) h = Math.max(h, T[k][1] - (T[k][1] - T[k - 1][1]) * ed / 4); }
    if (Math.min(dx, dz) < 12) { const up = (I.LR * 0.97 - d) / (I.LR * 0.97 - I.LR * 0.18) * 60; h = Math.max(Math.min(h, 60), Math.max(0, Math.min(60, up))); }
    return h + 2.5;
  }
  return -1e9;
}
const landAt = (theme, x, z) => { const L = landsOf(theme); if (!L) return null; let best = null, bd = 1e18; for (const I of L) { const d = Math.hypot(x - I.x, z - I.z) / I.R; if (d < bd) { bd = d; best = I; } } return bd < 1.3 ? best : null; };

// ---------- building them ----------
function buildLandIsles(gl, st, T, theme) {
  const out = []; let n = 0;
  for (const I of landsOf(theme) || []) {
    if (I.kind === 'hub') { n++; continue; } // Berekor's plaza island is built by its own code
    if (I.kind === 'special') { const s = specialLift(gl, st, T, I, n++); if (s) out.push(s); continue; }
    out.push(buildLand(gl, st, T, I, n++)); if (I.H > 100) out.push(landFar(gl, T, I));
  }
  return out;
}
// build a special landmark big: everything its builder makes is blown up SPECIAL_BIG times round the island's middle
function buildSpecialBig(build, T, sp) {
  const B = bigStart(T, sp); let s; try { s = build(); } finally { MeshBuilder.BIG = null; }
  return bigEnd(s, B);
}
function bigStart(T, sp) { const S = sp.bigS || 1; if (S === 1) return null; const B = { c: [sp.gx ?? sp.x, T.h(sp.x, sp.z), sp.gz ?? sp.z], s: S, sp }; MeshBuilder.BIG = B; return B; }
function bigEnd(s, B) {
  MeshBuilder.BIG = null; if (s && B && B.sp) landSpecialTop(B.sp, s);
  if (!s || !B) return s; const S = B.s, sc = p => MeshBuilder.scaleAt(B, p);
  for (const it of s.items || []) it.p = sc(it.p);
  for (const l of s.lights || []) { l.p = sc(l.p); l.r *= S; }
  for (const t of s.triggers || []) { t.p = sc(t.p); if (t.r) t.r *= S; if (t.h) t.h *= S; if (t.back) t.back = sc(t.back); }
  for (const g of s.signs || []) g.p = sc(g.p);
  [s.x, , s.z] = sc([s.x, 0, s.z]); s.rad = (s.rad || 40) * S; s.far = Math.max(s.far || 0, 6500); landSpecialTop(B.sp, s); return s;
}
// remember the highest treasure of a special landmark: its elevator goes up there
function landSpecialTop(sp, s) {
  for (const th in SPECIAL_GROUPS) for (const g of SPECIAL_GROUPS[th]) if (g.list.includes(sp)) { const I = (landsOf(th) || []).find(q => q.sps === g.list), hi = (s.items || []).reduce((a, it) => !a || it.p[1] > a[1] ? it.p : a, null); if (I && hi && (!I.topP || hi[1] > I.topP[1])) I.topP = [...hi]; }
}
// a shooting elevator up the side of a special landmark, to its highest treasure
function specialLift(gl, st, T, I, idx) {
  const mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), s = { key: 'L:' + I.id, items: [], lights: [], triggers: [], label: null, x: I.x, z: I.z, far: 6500, rad: I.R, signs: [], spots: [] };
  const H = landHelpers(mb, dmb, s, '#ffd27a'), dl = Math.hypot(I.x, I.z) || 1, ux = -I.x / dl, uz = -I.z / dl, pr = I.flat + 14, pb = [I.x + ux * pr, 0, I.z + uz * pr]; pb[1] = Math.max(T.h(pb[0], pb[2]), SEA) + 0.3;
  const top = I.topP; s.spots.push({ kind: 'lift', name: 'Elevator', p: [pb[0] + uz * 5, pb[1] + 2, pb[2] - ux * 5] });
  if (top && top[1] > pb[1] + 15) {
    const hi = top[1] + 10; H.pad(pb, hi - pb[1], 'Shooting elevator: up to the top of ' + I.name);
    H.lift(pb, [[pb[0], pb[1] + 2, pb[2]], [pb[0], hi, pb[2]], [top[0], hi, top[2]], [top[0], top[1] + 1.5, top[2]]]);
    s.spots.push({ kind: 'summit', name: 'Top of ' + I.name, p: [top[0], top[1] + 1.5, top[2]] });
  } else s.spots.length = 0;
  s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
}
// the landmark's rock as one mesh, so it shows from far away (the land itself is only made close to you)
function landFar(gl, T, I) {
  const mb = new MeshBuilder(), NA = 64, NR = 36, P = [], RR = I.LR * 1.08;
  for (let r = 0; r <= NR; r++) for (let a = 0; a < NA; a++) { const rr = (r / NR) * RR, th = a / NA * 6.2832, x = I.x + Math.cos(th) * rr, z = I.z + Math.sin(th) * rr; P.push([x, Math.max(T.info(x, z).h, SEA - 1) - 3.5, z]); }
  const at = (r, a) => P[r * NA + ((a % NA) + NA) % NA];
  for (let r = 0; r <= NR; r++) for (let a = 0; a < NA; a++) {
    const p = at(r, a), q0 = at(Math.max(0, r - 1), a), q1 = at(Math.min(NR, r + 1), a), w0 = at(r, a - 1), w1 = at(r, a + 1);
    const u = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]], v = [w1[0] - w0[0], w1[1] - w0[1], w1[2] - w0[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; if (r === 0) n = [0, 1, 0]; if (n[1] < 0) n = n.map(k => -k); const l = Math.hypot(...n) || 1;
    mb.vert(p, [n[0] / l, n[1] / l, n[2] / l], vertexColor(T, p[0], p[2], p[1] + 3.5, n[1] / l));
  }
  for (let r = 0; r < NR; r++) for (let a = 0; a < NA; a++) { const A = r * NA + a, B = r * NA + (a + 1) % NA, C = (r + 1) * NA + a, D = (r + 1) * NA + (a + 1) % NA; mb.i.push(A, B, C, C, B, D); }
  return { key: 'Lfar:' + I.id, items: [], lights: [], triggers: [], label: null, x: I.x, z: I.z, far: 7500, rad: RR, mesh: mb.build(gl) };
}
// glowing elevator pads and the lifts that shoot you along a path
function landHelpers(mb, dmb, s, col) {
  const C = h => hex(h), liftCol = C(col);
  return {
    pad(p, tube, txt) {
      mb.cyl(p[0], p[1] - 0.6, p[2], 3.2, 3.4, 0.75, 20, C('#4a4e58'));
      dmb.cyl(p[0], p[1] + 0.16, p[2], 2.6, 2.6, 0.04, 20, glowC(liftCol));
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832; dmb.box(p[0] + Math.cos(a) * 2.9 - 0.2, p[1] + 0.1, p[2] + Math.sin(a) * 2.9 - 0.2, p[0] + Math.cos(a) * 2.9 + 0.2, p[1] + 0.25, p[2] + Math.sin(a) * 2.9 + 0.2, glowC(C('#ffffff')), false, true); }
      if (tube > 0) {
        dmb.cyl(p[0], p[1], p[2], 2.3, 2.3, tube, 18, [0.6, 0.9, 1, 0.16], false);
        for (let y = 6; y < tube; y += 9) dmb.cyl(p[0], p[1] + y, p[2], 2.42, 2.42, 0.45, 18, glowC(liftCol), false);
        for (const a of [0.8, 2.4, 3.9, 5.5]) dmb.cyl(p[0] + Math.cos(a) * 2.5, p[1], p[2] + Math.sin(a) * 2.5, 0.18, 0.18, tube, 5, C('#5a5e68'), false);
      }
      if (txt) s.signs.push({ p: [p[0], p[1] + 4, p[2]], t: txt });
    },
    lift(p, path, name) { s.triggers.push({ lift: true, p: [p[0], p[1] + 1, p[2]], r: 2.6, path, name }); },
    arc(a, b, up) { const pts = []; for (let k = 1; k <= 24; k++) { const t = k / 24; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * up * t * (1 - t), a[2] + (b[2] - a[2]) * t]); } return pts; },
  };
}
function buildLand(gl, st, T, I, idx) {
  const mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), R = (a, b) => T.N.hash(a, b, 3100 + idx * 13);
  const s = { key: 'L:' + I.id, items: [], lights: [], triggers: [], label: null, x: I.x, z: I.z, far: 7000, rad: (I.LR || 160) + 60, signs: [], spots: [] };
  const [dx, dz] = LAND_DIRS[I.dir], rot = M4.rotY(Math.atan2(-dz, dx)), cx = I.x, cz = I.z, gAt = (x, z) => Math.max(T.h(x, z), SEA);
  const along = (r, y) => [cx + dx * r, y, cz + dz * r];
  const sideOff = (p, k) => [p[0] - dz * k, p[1], p[2] + dx * k];
  const { pad, lift, arc } = landHelpers(mb, dmb, s, I.kind === 'volcano' ? '#ffb347' : I.kind === 'floating' ? '#9fffd0' : '#7fe0ff');
  const DS = 1.6; // the cool places are built this much bigger than normal

  if (I.kind === 'plaza') {
    // the plaza you start on: giant round tiers with ramps; a fountain, pillars and lamps on top; an elevator up from the beach
    const top = I.H + 2.5, stone = C('#d8d0c0'), gold = C('#e8b84a');
    mb.cyl(cx + 40, top, cz + 40, 9, 9, 1.4, 28, stone); dmb.cyl(cx + 40, top + 1.0, cz + 40, 8, 8, 0.5, 28, [0.45, 0.8, 1, 0.8]); mb.cyl(cx + 40, top, cz + 40, 1.4, 1, 6, 10, stone); dmb.sph([cx + 40, top + 6.6, cz + 40], 1.4, 10, [0.6, 0.9, 1, 0.35], 0);
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.2832, px = cx + Math.cos(a) * (I.LR * 0.18 - 8), pz = cz + Math.sin(a) * (I.LR * 0.18 - 8); mb.cyl(px, top, pz, 1.6, 1.4, 16, 12, stone); mb.box(px - 2.2, top + 16, pz - 2.2, px + 2.2, top + 17.4, pz + 2.2, stone); dmb.sph([px, top + 18.4, pz], 1, 8, glowC(gold), 0); }
    for (const [ax, az] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) for (let k = 1; k <= 4; k++) { const r = I.LR * (0.18 + k * 0.19) - 6, lx = cx + ax * r - az * 14, lz = cz + az * r + ax * 14; for (const sd of [1, -1]) { const qx = cx + ax * r - az * 14 * sd, qz = cz + az * r + ax * 14 * sd, gy = gAt(qx, qz); dmb.cyl(qx, gy, qz, 0.25, 0.2, 6, 6, C('#3a3c40')); dmb.sph([qx, gy + 6.3, qz], 0.6, 6, glowC(C('#ffd27a')), 0); } void lx; void lz; }
    const pb = along(I.LR + 30, 0); pb[1] = gAt(pb[0], pb[2]) + 0.3; const tp = [cx + dx * 30, top + 1.5, cz + dz * 30];
    pad(pb, top + 6 - pb[1], 'Shooting elevator: up to the plaza'); lift(pb, [[pb[0], pb[1] + 2, pb[2]], [pb[0], top + 6, pb[2]], [tp[0], top + 6, tp[2]], tp]);
    const dn = sideOff(along(60, top), 10); pad(dn, 0, 'Down to the beach'); const ob = sideOff(pb, 8); ob[1] = gAt(ob[0], ob[2]) + 1.5; lift(dn, [[dn[0], top + 4, dn[2]], [ob[0], top + 4, ob[2]], ob]);
    s.lights.push({ p: [cx + 40, top + 6, cz + 40], r: 40, c: [1, 0.9, 0.7] });
    s.spots.push({ kind: 'plaza', name: I.name, p: [cx + 20, top + 1.5, cz + 20] }, { kind: 'lift', name: 'Elevator', p: sideOff([pb[0], pb[1] + 2, pb[2]], 5) });
  } else if (I.kind === 'floating') {
    // giant rocks floating over the island, climbing higher and higher; hop pads between them; the cool place on the middle one
    const base = gAt(cx, cz), fl = [], N = 7, grass = C(theme0(T).g), rock = C(theme0(T).rock);
    for (let k = 0; k < N; k++) { const a = I.dir * 1.57 + k * 0.95, d = 90 + k * 55, r = k === 3 ? 70 : 38 + R(k, 1) * 34; fl.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, y: base + 70 + k * 55, r }); }
    fl.forEach((f, k) => {
      const top = f.y, r = f.r;
      ringSurf(mb, f.x, f.z, [[0.1, top], [r, top], [r * 0.97, top - 3], [r * 0.82, top - r * 0.3], [r * 0.52, top - r * 0.65], [r * 0.18, top - r * 1.05], [0.1, top - r * 1.25]], 28, (i, q) => i === 0 ? shadeC(grass, 0.94 + R(q, k) * 0.1) : shadeC(rock, 0.8 + R(q, i + k * 9) * 0.25));
      for (let t = 0; t < 7 && k !== 3; t++) { const a = R(k, t + 5) * 6.28, dd = r * 0.7 * R(t, k + 2); const tx = f.x + Math.cos(a) * dd, tz = f.z + Math.sin(a) * dd, sc = 1.5 + R(t, k) * 1.5; dmb.cyl(tx, top, tz, 0.35 * sc, 0.3 * sc, 3 * sc, 6, C('#6a4a32')); dmb.cone(tx, top + 2.4 * sc, tz, 2.2 * sc, 4.8 * sc, 8, shadeC(grass, 0.75)); }
      for (let t = 0; t < 5; t++) { const a = R(k, t + 20) * 6.28; dmb.ico(f.x + Math.cos(a) * r * 0.3, top - r * 1.3 - t * 6, f.z + Math.sin(a) * r * 0.3, 4 - t * 0.6, 0, () => shadeC(rock, 0.8)); }
    });
    for (let k = 0; k < 30; k++) { const a = R(k, 40) * 6.28, d = 80 + R(k, 41) * 400; dmb.ico(cx + Math.cos(a) * d, base + 40 + R(k, 42) * 420, cz + Math.sin(a) * d, 4 + R(k, 43) * 10, 0, () => shadeC(rock, 0.75 + R(k, 44) * 0.3)); }
    const p0 = [cx, base, cz]; pad(p0, fl[0].y + 8 - base, 'Shooting elevator: up to ' + I.name);
    lift(p0, [[cx, base + 2, cz], [cx, fl[0].y + 8, cz], [fl[0].x, fl[0].y + 8, fl[0].z], [fl[0].x, fl[0].y + 1.5, fl[0].z]]);
    for (let k = 0; k < N; k++) {
      const f = fl[k], nx = fl[k + 1] || { x: cx + dx * 200, z: cz + dz * 200, y: gAt(cx + dx * 200, cz + dz * 200), r: 0 }, hd = Math.hypot(nx.x - f.x, nx.z - f.z), ux = (nx.x - f.x) / hd, uz = (nx.z - f.z) / hd;
      const pp = [f.x + ux * f.r * 0.7, f.y, f.z + uz * f.r * 0.7], to = [nx.x - ux * nx.r * 0.3, nx.y + 1.5, nx.z - uz * nx.r * 0.3];
      pad(pp, 0, k < N - 1 ? 'Hop to the next isle' : 'Back down');
      lift(pp, [[pp[0], pp[1] + 2, pp[2]], ...arc([pp[0], pp[1] + 2, pp[2]], to, k < N - 1 ? 30 : 40)]);
    }
    const f3 = fl[3], o3 = [f3.x - dx * 11 * DS, f3.y, f3.z - dz * 11 * DS];
    mb.push(o3, rot, DS); dmb.push(o3, rot, DS); buildPlace(mb, dmb, I.place, 22, 18, s, R, false); mb.pop(); dmb.reset();
    const hiF = fl[N - 1];
    s.spots.push({ kind: I.place, name: I.placeName, p: [f3.x, f3.y + 2, f3.z] }, { kind: 'summit', name: 'Highest isle', p: [hiF.x, hiF.y + 2, hiF.z] }, { kind: 'lift', name: 'Elevator', p: [cx + 6, base + 2, cz] });
    s.signs.push({ p: [f3.x, f3.y + 12, f3.z], t: I.placeName });
    s.items.push({ id: s.key + ':top', type: 'relic', p: [hiF.x, hiF.y + 1.5, hiF.z] });
    s.lights.push({ p: [f3.x, f3.y + 8, f3.z], r: 40, c: [1, 0.85, 0.6] });
  } else {
    // where the cool place sits: half way up, sticking out of the side the landmark faces
    const deckY = Math.round(I.H * 0.5), L = 26, W = 20, LW = L * DS, WW = W * DS;
    let rEdge = I.kind === 'volcano' ? landRc(I) + 20 : 0; while (rEdge < I.LR && T.h(cx + dx * rEdge, cz + dz * rEdge) > deckY + 3) rEdge += 2;
    const rIn = rEdge - 8, d0 = along(rIn, deckY), mid = along(rIn + LW * 0.5, deckY);
    mb.push(d0, rot, DS); dmb.push(d0, rot, DS);
    // the deck, its rails, posts down to the rock and a rock roof over the back so it sits in the mountain
    const rockC = C(theme0(T).rock);
    placeBase(mb, dmb, I.place, L, W, R, rockC, (xx, zz) => { const w = mb.tf([xx, 0, zz]); return (gAt(w[0], w[2]) - deckY) / DS; });
    buildPlace(mb, dmb, I.place, L, W, s, R, I.place === 'hangout');
    mb.pop(); dmb.reset();
    // the elevator at the foot, outside the rock, that shoots you up beside the deck and onto it
    const rP = I.LR + 14, pb = along(rP, 0); pb[1] = gAt(pb[0], pb[2]) + 0.3;
    for (let k = -3; k <= 3; k++) for (let q = -3; q <= 3; q++) mb.box(pb[0] + k * 2 - 1, pb[1] - 3, pb[2] + q * 2 - 1, pb[0] + k * 2 + 1, pb[1] - 0.6, pb[2] + q * 2 + 1, C(R(k + 9, q + 9) > 0.5 ? '#8a8a86' : '#7a7a76'), true, true);
    pad(pb, deckY + 6 - pb[1], 'Shooting elevator: up to ' + I.placeName);
    lift(pb, [[pb[0], pb[1] + 2, pb[2]], [pb[0], deckY + 6, pb[2]], [mid[0], deckY + 6, mid[2]], [mid[0], deckY + 1.5, mid[2]]]);
    // from the deck: on to the top, or back down
    const rc = landRc(I), topR = I.kind === 'volcano' ? rc + 14 : 0, top = along(topR, 0); top[1] = gAt(top[0], top[2]) + 1.5;
    const hi = I.H + 24, up = sideOff(along(rIn + LW - 7, deckY), WW / 2 - 5), dn = sideOff(along(rIn + LW - 7, deckY), -WW / 2 + 5);
    pad(up, 0, 'Up to the top'); pad(dn, 0, 'Back down');
    lift(up, [[up[0], deckY + 2, up[2]], [up[0], hi, up[2]], [top[0], hi, top[2]], top]);
    const out2 = sideOff(pb, 7); out2[1] = gAt(out2[0], out2[2]) + 1.5;
    lift(dn, [[dn[0], deckY + 3, dn[2]], [out2[0], deckY + 3, out2[2]], out2]);
    // the top: a flag, the relic, and a pad back down to the deck
    const tp = sideOff(along(topR + 10, 0), 6); tp[1] = gAt(tp[0], tp[2]) + 0.3;
    pad(tp, 0, 'Back down to ' + I.placeName);
    lift(tp, [[tp[0], tp[1] + 3, tp[2]], [tp[0], hi, tp[2]], [mid[0], hi, mid[2]], [mid[0], deckY + 1.5, mid[2]]]);
    const fp = sideOff(top, -5); fp[1] = gAt(fp[0], fp[2]);
    mb.cyl(fp[0], fp[1] - 0.5, fp[2], 0.3, 0.24, 14, 6, C('#d8d8d0'));
    dmb.quad([fp[0], fp[1] + 13.4, fp[2]], [fp[0] + 6, fp[1] + 12.4, fp[2] + 0.4], [fp[0] + 6, fp[1] + 10.2, fp[2] + 0.4], [fp[0], fp[1] + 9.6, fp[2]], C('#ff4a4a'));
    dmb.quad([fp[0], fp[1] + 9.6, fp[2]], [fp[0] + 6, fp[1] + 10.2, fp[2] + 0.4], [fp[0] + 6, fp[1] + 12.4, fp[2] + 0.4], [fp[0], fp[1] + 13.4, fp[2]], C('#d83a3a'));
    s.signs.push({ p: [fp[0], fp[1] + 15, fp[2]], t: 'Top of ' + I.name });
    s.items.push({ id: s.key + ':top', type: 'relic', p: [top[0], top[1] + 0.5, top[2]] });
    s.spots.push({ kind: I.place, name: I.placeName, p: [mid[0], deckY + 2, mid[2]] }, { kind: 'summit', name: 'Top of ' + I.name, p: [top[0], top[1] + 1, top[2]] }, { kind: 'lift', name: 'Elevator', p: sideOff([pb[0], pb[1] + 2, pb[2]], 5) });
    s.signs.push({ p: [mid[0], deckY + 12, mid[2]], t: I.placeName });
    if (I.kind === 'volcano') {
      const fy = gAt(cx, cz);
      dmb.cyl(cx, fy + 1.2, cz, rc * 0.85, rc * 0.85, 0.3, 32, glowC(C('#ff6a1a')));
      for (let k = 0; k < 24; k++) { const a = R(k, 70) * 6.28, d = R(k, 71) * rc * 0.75; dmb.ico(cx + Math.cos(a) * d, fy + 1.6, cz + Math.sin(a) * d, 1.5 + R(k, 72) * 3, 0, () => C('#2a1a14')); }
      for (let k = 0; k < 26; k++) { const a = R(k, 73) * 6.28, d = R(k, 74) * rc * 0.6; dmb.sph([cx + Math.cos(a) * d, fy + 70 + k * 12, cz + Math.sin(a) * d], 16 + k * 1.6, 7, [0.25, 0.22, 0.22, 0.3], 0); }
      s.triggers.push({ kill: true, p: [cx, fy, cz], r: rc * 0.8, h: 4, back: [top[0], top[1] + 1, top[2]], msg: 'Too hot! The lava threw you back onto the rim' });
      s.lights.push({ p: [cx, fy + 12, cz], r: 140, c: [1, 0.45, 0.15] });
    }
    if (I.kind === 'cloudspire') {
      // a ring of clouds around the spire, above the cool place and below the top
      const cyy = I.H * 0.72;
      for (let k = 0; k < 90; k++) { const a = k / 90 * 6.2832 + R(k, 80) * 0.1, d = I.LR * 0.5 + 30 + R(k, 81) * 160; dmb.sph([cx + Math.cos(a) * d, cyy + (R(k, 82) - 0.5) * 24, cz + Math.sin(a) * d], [30 + R(k, 83) * 25, 10 + R(k, 84) * 8, 30 + R(k, 85) * 25], 7, [1, 1, 1, 0.42], 0); }
    }
  }
  s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
}
// the theme's colours for grass and rock
function theme0(T) { const C = REGION_THEMES[T.theme], B = C ? BIOMES[C.kinds[Object.keys(C.kinds)[0]].b] || {} : { ground: '#6cbf55', rock: '#8c8a90' }; return { g: B.ground || '#6a9a4a', rock: B.rock || '#7a7670' }; }

// what each cool place is built on, so no two look alike: its floor, its edge and its roof.
// Floor at y = 0, x from 0 (the rock) to L (the open edge), z from -W/2 to W/2. gy(x, z) = how far below the floor the rock is.
function placeBase(mb, dmb, kind, L, W, R, rockC) {
  const C = h => hex(h), gy = arguments[7];
  const posts = (col, r) => { for (const zz of [-W / 2 + 1, W / 2 - 1]) for (const xx of [L * 0.45, L - 1]) { const g = gy(xx, zz); if (g < -1) dmb.cyl(xx, g, zz, r, r * 0.8, -g - 1.2, 6, C(col)); } };
  const rockRoof = () => { mb.box(-8, 10, -W / 2 - 4, 9, 14, W / 2 + 4, rockC); for (let k = 0; k < 9; k++) dmb.ico(-2 + R(k, 60) * 12, 10 + R(k, 61) * 2, -W / 2 - 3 + k * (W + 6) / 8, 2.2 + R(k, 62) * 1.8, 0, () => shadeC(rockC, 0.8 + R(k, 63) * 0.3)); };
  const rockLump = (x, y, z, r, sd) => dmb.ico(x, y, z, r, 0, () => shadeC(rockC, 0.75 + R(sd, 64) * 0.35));
  if (kind === 'hangout') { // a wooden deck with a rail, under a rock roof
    const plank = C('#a8784c'); mb.box(0, -1.2, -W / 2, L, 0, W / 2, plank);
    for (let k = 0; k < 13; k++) dmb.box(k * 2 + 0.05, 0.01, -W / 2, k * 2 + 0.12, 0.03, W / 2, shadeC(plank, 0.7), false, true);
    mb.box(L - 0.4, 0, -W / 2, L, 1.1, W / 2, C('#6a4a2e')); mb.box(8, 0, -W / 2, L, 1.1, -W / 2 + 0.4, C('#6a4a2e')); mb.box(8, 0, W / 2 - 0.4, L, 1.1, W / 2, C('#6a4a2e'));
    for (let k = 0; k < 6; k++) dmb.cyl(L - 0.2, 0, -W / 2 + 0.2 + k * (W - 0.4) / 5, 0.18, 0.18, 1.3, 6, C('#4a3220'));
    rockRoof(); posts('#5a3e26', 0.5);
  } else if (kind === 'observatory') { // a round white stone platform sticking out on a stone arm, open to the sky
    mb.box(0, -1.5, -W / 2, L * 0.5, 0, W / 2, C('#cfd2da')); mb.cyl(L * 0.55, -1.5, 0, 12, 12, 1.5, 32, C('#dcdfe6'));
    dmb.cyl(L * 0.55, 0.01, 0, 11.2, 11.2, 0.03, 32, C('#3a4a7a')); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832; dmb.box(L * 0.55 + Math.cos(a) * 9 - 0.15, 0.04, Math.sin(a) * 9 - 0.15, L * 0.55 + Math.cos(a) * 9 + 0.15, 0.06, Math.sin(a) * 9 + 0.15, glowC(C('#bfe0ff')), false, true); }
    for (let k = 0; k < 28; k++) { const a = k / 28 * 6.2832; if (Math.cos(a) < -0.6) continue; mb.cyl(L * 0.55 + Math.cos(a) * 11.6, 0, Math.sin(a) * 11.6, 0.12, 0.12, 1.2, 5, C('#9aa2b4')); }
    for (let k = 0; k < 3; k++) dmb.cyl(L * 0.55, -1.5 - k * 2.5, 0, 6 - k * 1.6, 7 - k * 1.6, 2.5, 16, C('#b8bcc8'));
  } else if (kind === 'hotspring') { // no deck: a natural rock shelf with pools, steam and a lip of boulders
    mb.box(0, -3, -W / 2 - 1, L, 0, W / 2 + 1, shadeC(rockC, 0.9));
    for (let k = 0; k < 26; k++) rockLump(L - 0.5 + (R(k, 66) - 0.5) * 2, 0.2, -W / 2 + k * W / 25, 1 + R(k, 67) * 1.2, k);
    for (let k = 0; k < 10; k++) rockLump(R(k, 68) * L, -2.4, (R(k, 69) - 0.5) * W, 2.5 + R(k, 70) * 2, k + 40);
    for (const [x, z, r] of [[4, -6, 2.4], [6, 6, 2.8]]) { dmb.cyl(x, 0.02, z, r, r, 0.12, 16, [0.45, 0.85, 0.95, 0.85]); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; rockLump(x + Math.cos(a) * (r + 0.5), 0.2, z + Math.sin(a) * (r + 0.5), 0.55, k + 80); } }
    rockRoof();
  } else if (kind === 'cafe') { // a tiled terrace with glass walls round the edge and a striped awning
    mb.box(0, -1, -W / 2, L, 0, W / 2, C('#e8e0d0'));
    for (let i = 0; i < 13; i++) for (let j = 0; j < 10; j++) if ((i + j) % 2) dmb.box(i * 2, 0.01, -W / 2 + j * 2, i * 2 + 2, 0.02, -W / 2 + j * 2 + 2, C('#3a3a3a'), false, true);
    dmb.box(L - 0.15, 0, -W / 2, L, 1.4, W / 2, [0.7, 0.9, 1, 0.3], false, true); dmb.box(4, 0, -W / 2, L, 1.4, -W / 2 + 0.15, [0.7, 0.9, 1, 0.3], false, true); dmb.box(4, 0, W / 2 - 0.15, L, 1.4, W / 2, [0.7, 0.9, 1, 0.3], false, true);
    mb.box(L - 0.25, 0, -W / 2, L, 0.25, W / 2, C('#c0c4c8')); dmb.box(L - 0.25, 1.4, -W / 2, L, 1.5, W / 2, C('#c0c4c8'), false, true);
    for (let k = 0; k < 10; k++) dmb.box(0, 5.5, -W / 2 + k * W / 10, 9, 5.7, -W / 2 + (k + 1) * W / 10, C(k % 2 ? '#ffffff' : '#e84a4a'), false, true);
    for (const z of [-W / 2 + 0.5, W / 2 - 0.5]) dmb.cyl(9, 0, z, 0.12, 0.12, 5.6, 6, C('#2a2a2a'));
    posts('#8a8e96', 0.4);
  } else if (kind === 'library') { // a room cut into the rock: rock walls, a rock ceiling and one big window over the drop
    mb.box(0, -1, -W / 2, L, 0, W / 2, C('#8a6a4a')); dmb.box(3, 0.01, -5, L - 4, 0.03, 5, C('#7a2a2a'), false, true);
    mb.box(0, 0, -W / 2 - 1.5, L, 7, -W / 2, rockC); mb.box(0, 0, W / 2, L, 7, W / 2 + 1.5, rockC); mb.box(-1, 7, -W / 2 - 1.5, L, 9, W / 2 + 1.5, rockC);
    mb.box(L - 0.6, 0, -W / 2, L, 1, W / 2, rockC); mb.box(L - 0.6, 6, -W / 2, L, 7, W / 2, rockC);
    for (const z of [-3.4, 3.4]) mb.box(L - 0.6, 1, z - 0.4, L, 6, z + 0.4, C('#5a3a22'));
    dmb.box(L - 0.3, 1, -W / 2, L - 0.25, 6, W / 2, [0.75, 0.9, 1, 0.22], false, true);
    for (let k = 0; k < 12; k++) rockLump(R(k, 71) * L, 9, (R(k, 72) - 0.5) * (W + 2), 1.6 + R(k, 73), k + 90);
  } else if (kind === 'garden') { // a grassy ledge with a hedge round it and a flower arch at the way in
    mb.box(0, -2.5, -W / 2, L, 0, W / 2, C('#6a4a32')); dmb.box(0, 0.01, -W / 2, L, 0.06, W / 2, C('#5aae4a'), false, true);
    for (let k = 0; k < 40; k++) { const t = k / 39, x = t < 0.3 ? 4 + t / 0.3 * (L - 5) : L - 0.8, z = t < 0.3 ? -W / 2 + 0.8 : -W / 2 + 0.8 + (t - 0.3) / 0.7 * (W - 1.6); dmb.sph([x, 0.7, z], 0.9, 6, C('#3a8a3a'), 0.3); }
    for (let k = 0; k < 14; k++) dmb.sph([4 + k * (L - 5) / 13, 0.7, W / 2 - 0.8], 0.9, 6, C('#3a8a3a'), 0.3);
    for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI; dmb.sph([2, 4 * Math.sin(a), -2.5 * Math.cos(a)], 0.55, 6, C(['#ff5a8a', '#ffd23a', '#ffffff'][k % 3]), 0.2); }
    for (let k = 0; k < 8; k++) rockLump(R(k, 74) * L, -2.6, (R(k, 75) - 0.5) * W, 2 + R(k, 76) * 1.5, k + 120);
    dmb.ico(-2, 6, 0, 7, 1, () => C('#4a9a4a'));
  } else if (kind === 'arcade') { // a dark metal platform with a glowing grid floor, neon rails and a metal canopy
    mb.box(0, -0.8, -W / 2, L, 0, W / 2, C('#24242e'));
    for (let k = 0; k <= 13; k++) dmb.box(k * 2 - 0.05, 0.01, -W / 2, k * 2 + 0.05, 0.03, W / 2, glowC(C('#5ad8ff')), false, true);
    for (let k = 0; k <= 10; k++) dmb.box(0, 0.01, -W / 2 + k * 2 - 0.05, L, 0.03, -W / 2 + k * 2 + 0.05, glowC(C('#ff5ad8')), false, true);
    for (const [x0, z0, x1, z1] of [[L - 0.3, -W / 2, L, W / 2], [2, -W / 2, L, -W / 2 + 0.3], [2, W / 2 - 0.3, L, W / 2]]) { mb.box(x0, 0, z0, x1, 1.1, z1, C('#3a3a48')); dmb.box(x0 - 0.02, 1.1, z0 - 0.02, x1 + 0.02, 1.2, z1 + 0.02, glowC(C('#ffd25a')), false, true); }
    mb.box(-1, 6, -W / 2 - 0.5, L * 0.6, 6.4, W / 2 + 0.5, C('#3a3a48')); dmb.box(0, 5.9, -W / 2, L * 0.6, 5.95, W / 2, glowC(C('#9a5aff')), false, true);
    for (const z of [-W / 2 + 0.3, W / 2 - 0.3]) mb.cyl(L * 0.6 - 0.5, 0, z, 0.25, 0.25, 6, 8, C('#3a3a48'));
    posts('#3a3a48', 0.45);
  } else if (kind === 'campsite') { // a rough dirt ledge with a log edge and boulders, nothing built
    mb.box(0, -2, -W / 2 - 1, L, 0, W / 2 + 1, C('#7a5a3a'));
    for (let k = 0; k < 30; k++) dmb.sph([R(k, 77) * L, 0.02, (R(k, 78) - 0.5) * W], [0.8, 0.05, 0.8], 5, C('#5aa04a'), 0);
    for (let k = 0; k < 4; k++) { dmb.push([L - 0.8, 0.4, -W / 2 + 2.5 + k * (W - 5) / 3], M4.rotX(Math.PI / 2)); dmb.cyl(0, -2.4, 0, 0.45, 0.45, 4.8, 8, C('#6a4a2e')); dmb.pop(); }
    for (let k = 0; k < 7; k++) rockLump(1 + R(k, 79) * 6, 0.5, (R(k, 80) - 0.5) * W, 1 + R(k, 81) * 1.4, k + 150);
    for (let k = 0; k < 8; k++) rockLump(R(k, 82) * L, -2.2, (R(k, 83) - 0.5) * W, 2.4 + R(k, 84) * 1.6, k + 170);
  } else if (kind === 'shrine') { // grey stone slabs with a big red gate at the edge, and stone steps down into the rock
    mb.box(0, -2, -W / 2, L, 0, W / 2, C('#9a968c'));
    for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) dmb.box(i * L / 6 + 0.1, 0.01, -W / 2 + j * W / 5 + 0.1, (i + 1) * L / 6 - 0.1, 0.04, -W / 2 + (j + 1) * W / 5 - 0.1, C(R(i, j) > 0.5 ? '#aaa69c' : '#8e8a80'), false, true);
    for (const z of [-5, 5]) mb.cyl(L - 3, 0, z, 0.6, 0.55, 8, 10, C('#c8322a'));
    mb.box(L - 3.8, 7.2, -7.5, L - 2.2, 8, 7.5, C('#c8322a')); mb.box(L - 4, 8.6, -8.5, L - 2, 9.3, 8.5, C('#2a2a2a')); mb.box(L - 3.6, 5.6, -5.5, L - 2.4, 6.1, 5.5, C('#c8322a'));
    for (let k = 0; k < 9; k++) rockLump(R(k, 85) * L, -2.4, (R(k, 86) - 0.5) * W, 2.4 + R(k, 87) * 1.6, k + 200);
    rockRoof();
  } else if (kind === 'museum') { // a white marble hall: a stepped floor, a row of columns and a roof with a pointed front
    mb.box(0, -1.5, -W / 2, L, -0.5, W / 2, C('#e8e4dc')); mb.box(0, -0.5, -W / 2 + 0.6, L - 0.6, 0, W / 2 - 0.6, C('#f2efe8'));
    for (let k = 0; k < 6; k++) { const z = -W / 2 + 1.6 + k * (W - 3.2) / 5; mb.cyl(L - 1.6, 0, z, 0.55, 0.5, 7, 12, C('#f4f2ec')); mb.box(L - 2.4, 7, z - 0.8, L - 0.8, 7.5, z + 0.8, C('#e8e4dc')); }
    mb.box(-1, 7.5, -W / 2, L, 8.5, W / 2, C('#e8e4dc'));
    dmb.tri([L, 8.5, -W / 2], [L, 8.5, W / 2], [L, 11.5, 0], C('#f4f2ec')); dmb.tri([L, 8.5, W / 2], [L, 8.5, -W / 2], [L, 11.5, 0], C('#f4f2ec'));
    dmb.quad([-1, 8.5, -W / 2], [L, 8.5, -W / 2], [L, 11.5, 0], [-1, 11.5, 0], C('#b8a890')); dmb.quad([L, 8.5, W / 2], [-1, 8.5, W / 2], [-1, 11.5, 0], [L, 11.5, 0], C('#b8a890'));
    for (let k = 0; k < 3; k++) dmb.cyl(L * 0.5, -1.5 - k * 2.5, 0, 6 - k * 1.5, 7 - k * 1.5, 2.5, 6, C('#d8d4cc'));
  }
}
// the one cool place on a landmark. Built on a floor at y = 0, x from 0 (the rock) to L (the open edge), z from -W/2 to W/2.
function buildPlace(mb, dmb, kind, L, W, s, R, onCliff) {
  const C = h => hex(h), light = (x, y, z, r, c) => s.lights.push({ p: mb.tf([x, y, z]), r, c });
  const fire = (x, z) => { for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; mb.ico(x + Math.cos(a) * 1.1, 0.25, z + Math.sin(a) * 1.1, 0.4, 0, () => C('#6a6a6a')); } dmb.ico(x, 0.5, z, 0.6, 0, () => glowC(C('#ffb347'))); dmb.cone(x, 0.3, z, 0.7, 1.6, 6, glowC(C('#ff7a2a'))); light(x, 2, z, 18, [1, 0.6, 0.3]); };
  const sofa = (x, z, w, face, col) => { const c = C(col); if (face) { mb.box(x - w / 2, 0, z, x + w / 2, 0.55, z + 1.2 * face, c); mb.box(x - w / 2, 0, z + 1.2 * face - 0.35 * face, x + w / 2, 1.3, z + 1.2 * face, shadeC(c, 0.85)); } };
  const lamp = (x, z, h, col) => { dmb.cyl(x, 0, z, 0.08, 0.08, h, 5, C('#2a2a2a')); dmb.sph([x, h + 0.2, z], 0.4, 6, glowC(C(col)), 0); };
  if (onCliff) for (let k = 0; k < 9; k++) dmb.sph([L - 0.2, 1.6 + Math.sin(k) * 0.1, -W / 2 + 1 + k * (W - 2) / 8], 0.18, 5, glowC(C(['#ffd27a', '#ff8ad8', '#7fe0ff'][k % 3])), 0); // string lights on the rail
  const cxp = L * 0.5;
  if (kind === 'hangout') {
    dmb.box(cxp - 5, 0.01, -4, cxp + 5, 0.05, 4, C('#a83a4a'), false, true); dmb.box(cxp - 4.3, 0.06, -3.3, cxp + 4.3, 0.07, 3.3, C('#e8c07a'), false, true);
    sofa(cxp, -5, 6, -1, '#4a6ab0'); sofa(cxp, 5, 6, 1, '#4a6ab0'); fire(cxp, 0);
    for (const [x, z, c] of [[cxp - 6, -2, '#ffb347'], [cxp - 6, 2.4, '#7fd0ff'], [cxp + 6, 0, '#ff7ab0']]) dmb.sph([x, 0.5, z], [1, 0.6, 1], 8, C(c), 0.3);
    lamp(2, -W / 2 + 2, 3, '#ffd27a'); lamp(2, W / 2 - 2, 3, '#ffd27a');
  } else if (kind === 'observatory') {
    const ox = 9; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; mb.cyl(ox + Math.cos(a) * 6.5, 0, Math.sin(a) * 6.5, 0.3, 0.3, 4.5, 8, C('#d8d8e0')); }
    const dome = []; for (let k = 0; k <= 6; k++) { const a = k / 6 * 1.45; dome.push([Math.cos(a) * 7 + 0.1, 4.5 + Math.sin(a) * 7]); }
    ringSurf(dmb, ox, 0, dome, 24, (i, q) => q === 0 || q === 1 ? C('#1a1e2a') : shadeC(C('#e8ecf4'), 0.9 + (i % 2) * 0.06));
    dmb.push([ox, 1.2, 0], M4.rotZ(-0.75)); dmb.cyl(0, 0, 0, 0.55, 0.8, 7, 12, C('#3a4a6a')); dmb.cyl(0, 6.6, 0, 0.85, 0.85, 0.5, 12, C('#c8a040')); dmb.pop();
    dmb.push([ox, 0, 0]); for (const a of [0, 2.1, 4.2]) dmb.cyl(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8, 0.12, 0.1, 1.6, 5, C('#2a2a2a')); dmb.pop();
    dmb.box(1, 1, -W / 2 + 1, 1.2, 4, -W / 2 + 6, glowC(C('#2a3a8a')), false, true);
    for (let k = 0; k < 12; k++) dmb.sph([1.25, 1.4 + R(k, 90) * 2.4, -W / 2 + 1.4 + R(k, 91) * 4.2], 0.08, 4, glowC(C('#ffffff')), 0);
    mb.box(L - 6, 0, W / 2 - 3, L - 2, 0.5, W / 2 - 2, C('#6a4a2e')); mb.box(L - 6, 0, -W / 2 + 2, L - 2, 0.5, -W / 2 + 3, C('#6a4a2e'));
    light(ox, 6, 0, 20, [0.7, 0.8, 1]);
  } else if (kind === 'hotspring') {
    for (let k = 0; k < 22; k++) { const a = k / 22 * 6.28; mb.ico(cxp + Math.cos(a) * 6.2, 0.35, Math.sin(a) * 6.2, 0.7 + R(k, 92) * 0.4, 0, () => shadeC(C('#8a8478'), 0.85 + R(k, 93) * 0.2)); }
    dmb.cyl(cxp, 0.15, 0, 5.8, 5.8, 0.2, 24, [0.45, 0.85, 0.95, 0.85]);
    for (let k = 0; k < 14; k++) dmb.sph([cxp + (R(k, 94) - 0.5) * 8, 1.5 + k * 0.5, (R(k, 95) - 0.5) * 8], 1 + R(k, 96), 6, [1, 1, 1, 0.18], 0);
    for (const [z, c] of [[-W / 2 + 2, '#ff8a8a'], [-W / 2 + 4, '#8ad0ff']]) dmb.box(3, 0.02, z, 6, 0.06, z + 1.2, C(c), false, true);
    lamp(2, W / 2 - 2, 2.4, '#ffe0a0'); light(cxp, 3, 0, 18, [0.7, 0.9, 1]);
  } else if (kind === 'cafe') {
    mb.box(1, 0, -6, 3, 1.2, 6, C('#6a4a2e')); dmb.box(0.9, 1.2, -6.1, 3.1, 1.32, 6.1, C('#e8dcc8'), false, true);
    dmb.box(0.2, 2.2, -3, 0.4, 4.4, 3, glowC(C('#2a6a4a')), false, true);
    for (let k = 0; k < 4; k++) dmb.cyl(2, 1.32, -4.5 + k * 3, 0.25, 0.22, 0.4, 8, C(['#ffffff', '#e86a4a', '#ffd27a', '#7fd0ff'][k]));
    for (const [x, z] of [[11, -5], [11, 5], [18, -4], [18, 4]]) {
      mb.cyl(x, 0, z, 1.3, 1.3, 1, 14, C('#f4f0e8')); for (const a of [0, 1.57, 3.14, 4.71]) mb.cyl(x + Math.cos(a) * 2, 0, z + Math.sin(a) * 2, 0.45, 0.45, 0.6, 8, C('#c86a3a'));
      dmb.cyl(x, 1, z, 0.07, 0.07, 2.5, 4, C('#dcdcdc')); dmb.cone(x, 3.4, z, 2.6, 1, 10, C(R(x, z) > 0.5 ? '#e84a4a' : '#4ab0e8'));
    }
    light(10, 3, 0, 20, [1, 0.85, 0.6]);
  } else if (kind === 'library') {
    for (const z0 of [-W / 2 + 0.5, W / 2 - 1.5]) { mb.box(1, 0, z0, 12, 5, z0 + 1, C('#5a3a22')); for (let r = 0; r < 4; r++) for (let k = 0; k < 20; k++) dmb.box(1.3 + k * 0.53, 0.3 + r * 1.2, z0 - 0.02, 1.7 + k * 0.53, 1.1 + r * 1.2 - R(k, r) * 0.3, z0 + 1.02, C(['#a83a3a', '#3a6aa8', '#3a8a4a', '#d8a83a', '#6a3a8a'][(k + r * 3) % 5]), false, true); }
    mb.box(0.5, 0, -6, 1.5, 5, 6, C('#5a3a22'));
    for (const [x, z] of [[10, -2.5], [10, 2.5], [16, 0]]) { mb.box(x - 1, 0, z - 1, x + 1, 0.6, z + 1, C('#8a3a2a')); mb.box(x - 1, 0.6, z - 1, x - 0.6, 1.6, z + 1, C('#7a3222')); }
    dmb.sph([19, 1.5, -6], 1.2, 12, C('#3a7ac8'), 0.3); dmb.cyl(19, 0, -6, 0.1, 0.4, 0.4, 6, C('#c8a040'));
    lamp(7, 0, 2.8, '#ffe0a0'); lamp(14, -4, 2.8, '#ffe0a0'); light(10, 3, 0, 18, [1, 0.85, 0.6]);
  } else if (kind === 'garden') {
    for (const [x0, z0] of [[2, -8], [2, 4], [12, -8], [12, 5]]) { mb.box(x0, 0, z0, x0 + 6, 0.6, z0 + 3, C('#6a4a2e')); for (let k = 0; k < 14; k++) dmb.sph([x0 + 0.5 + R(k, x0) * 5, 0.9, z0 + 0.5 + R(k, z0 + 50) * 2], 0.35, 5, C(['#ff5a8a', '#ffd23a', '#ffffff', '#b05aff', '#ff8a3a'][k % 5]), 0.2); }
    mb.cyl(L * 0.55, 0, 0, 2.4, 2.4, 0.8, 16, C('#c8c4b8')); dmb.cyl(L * 0.55, 0.8, 0, 2, 2, 0.05, 16, [0.5, 0.8, 1, 0.8]); dmb.cyl(L * 0.55, 0.8, 0, 0.3, 0.2, 2, 8, C('#c8c4b8')); dmb.sph([L * 0.55, 3, 0], 0.6, 8, [0.6, 0.9, 1, 0.3], 0);
    for (const z of [-5.5, 5.5]) { dmb.cyl(L - 4, 0, z, 0.3, 0.25, 2.5, 6, C('#6a4a32')); dmb.sph([L - 4, 3.2, z], 1.8, 8, C('#4a9a4a'), 0.3); }
    light(L * 0.55, 3, 0, 18, [0.9, 1, 0.8]);
  } else if (kind === 'arcade') {
    for (let k = 0; k < 6; k++) { const z = -7.5 + k * 3; mb.box(1, 0, z - 0.9, 2.6, 2.6, z + 0.9, C(['#2a2a8a', '#8a2a6a', '#2a6a8a'][k % 3])); dmb.box(2.62, 1.4, z - 0.6, 2.66, 2.3, z + 0.6, glowC(C(['#5aff8a', '#ff5ad8', '#5ad8ff', '#ffd25a'][k % 4])), false, true); dmb.box(2.6, 1.1, z - 0.6, 3.1, 1.2, z + 0.6, C('#1a1a1a'), false, true); }
    mb.box(12, 0, -2, 15, 3.4, 2, C('#e84a4a')); dmb.box(12.2, 1.4, -1.8, 14.8, 3.2, 1.8, [0.7, 0.9, 1, 0.3], false, true); for (let k = 0; k < 8; k++) dmb.sph([12.6 + R(k, 1) * 1.8, 1.6, -1.4 + R(k, 2) * 2.8], 0.3, 5, C(['#ffd23a', '#5ad8ff', '#ff5ad8'][k % 3]), 0.3);
    dmb.box(0.3, 3.2, -9, 0.5, 3.5, 9, glowC(C('#ff5ad8')), false, true); dmb.box(0.3, 3.8, -9, 0.5, 4.1, 9, glowC(C('#5ad8ff')), false, true);
    light(6, 3, 0, 20, [0.9, 0.5, 1]);
  } else if (kind === 'campsite') {
    const tent = (x, z, c) => { const col = C(c); mb.quad([x - 2, 0, z - 2], [x - 2, 0, z + 2], [x, 2.6, z + 2], [x, 2.6, z - 2], col); mb.quad([x + 2, 0, z + 2], [x + 2, 0, z - 2], [x, 2.6, z - 2], [x, 2.6, z + 2], shadeC(col, 0.8)); mb.tri([x - 2, 0, z - 2], [x, 2.6, z - 2], [x + 2, 0, z - 2], shadeC(col, 0.9)); dmb.tri([x - 2, 0, z + 2.01], [x + 2, 0, z + 2.01], [x, 2.6, z + 2.01], C('#2a2a2a')); };
    tent(5, -5, '#e8a03a'); tent(5, 5, '#3a8ae8'); fire(14, 0);
    for (const [z, a] of [[-3, 0], [3, 0]]) { dmb.push([14, 0.4, z], M4.rotZ(Math.PI / 2)); dmb.cyl(0, -2, 0, 0.4, 0.4, 4, 8, C('#6a4a2e')); dmb.pop(); mb.box(12, 0, z - 0.4, 16, 0.6, z + 0.4, C('#6a4a2e'), true, false); }
    lamp(9, 0, 2, '#ffd27a');
  } else if (kind === 'shrine') {
    const bx = 7; for (const z of [-3, 3]) mb.box(bx - 0.3, 0, z - 0.3, bx + 0.3, 6, z + 0.3, C('#5a3a22')); mb.box(bx - 0.6, 6, -3.6, bx + 0.6, 6.6, 3.6, C('#5a3a22'));
    const bell = []; for (let k = 0; k <= 6; k++) { const t = k / 6; bell.push([0.4 + 1.7 * Math.pow(t, 0.7), 5.6 - t * 3.4]); } ringSurf(dmb, bx, 0, bell, 20, () => C('#b8863a'));
    dmb.cyl(bx, 1.6, 0, 0.25, 0.25, 0.6, 8, C('#8a5a2a'));
    for (const [x, z] of [[3, -7], [3, 7], [13, -7], [13, 7], [19, -7], [19, 7]]) { mb.box(x - 0.6, 0, z - 0.6, x + 0.6, 1.4, z + 0.6, C('#8e8a80')); dmb.box(x - 0.5, 1.4, z - 0.5, x + 0.5, 2.3, z + 0.5, glowC(C('#ffc46a')), false, true); mb.box(x - 0.8, 2.3, z - 0.8, x + 0.8, 2.6, z + 0.8, C('#6e6a60')); light(x, 2, z, 10, [1, 0.75, 0.4]); }
    mb.cyl(14, 0, 0, 1.4, 1.1, 0.9, 12, C('#6e6a60')); dmb.cyl(14, 0.9, 0, 1.1, 1.1, 0.05, 12, [0.5, 0.8, 1, 0.8]);
    for (let k = 0; k < 10; k++) dmb.sph([2 + R(k, 88) * 18, 3 + R(k, 89) * 3, (R(k, 90) - 0.5) * 14], 0.12, 4, glowC(C('#ffe0a0')), 0);
  } else if (kind === 'museum') {
    for (let k = 0; k < 5; k++) { const x = 4 + (k % 3) * 7, z = k < 3 ? -4.5 : 4.5; mb.box(x - 1, 0, z - 1, x + 1, 1.2, z + 1, C('#e8e4dc')); dmb.ico(x, 2, z, 0.7, 1, () => glowC(C(['#ff5a5a', '#5aff8a', '#5ab0ff', '#ffd25a', '#d85aff'][k]))); light(x, 2.4, z, 6, [1, 1, 1]); }
    for (const z of [-2.4, 2.4]) { for (let k = 0; k < 6; k++) dmb.cyl(3 + k * 3.4, 0, z, 0.1, 0.1, 1, 5, C('#c8a040')); dmb.box(3, 0.85, z - 0.05, 20, 0.95, z + 0.05, C('#a82a2a'), false, true); }
    dmb.box(0.6, 1, -6, 0.8, 4, 6, C('#2a2a3a'), false, true); for (let k = 0; k < 3; k++) dmb.box(0.82, 1.5, -5 + k * 3.6, 0.86, 3.5, -2.4 + k * 3.6, C(['#d8c8a8', '#a8c8d8', '#c8d8a8'][k]), false, true);
  }
}

// Berekor's land when every island is a landmark (owner only): the plaza island is the old mainland round the
// plaza, cut round with a beach; everywhere else is sea with the giant landmark islands in it
Terrain.prototype.infoBerekorLands = function (x, z) {
  const N = this.N, LI = landsOf('berekor'), wob = N.fbm(x / 420, z / 420, 231, 3) - 0.5;
  const eh = berekorHubE(x, z, wob); let e = -2, I0 = null;
  for (const I of LI) { if (I.kind === 'hub') continue; const dd = Math.hypot(x - I.x, z - I.z); if (dd > I.R * 1.9) continue; const ee = 1 - dd / (I.R * (1 + 0.45 * wob)); if (ee > e) { e = ee; I0 = I; } }
  if (eh >= e) {
    // the plaza island: the land as it always was, sloping into the sea at the edge
    if (eh < -0.05) return { h: Math.max(-36, eh * 90 - 6), b: 0, temp: 0.5, moist: 0.5, vol: 0 };
    this.raw = true; const o = this.info(x, z); this.raw = false;
    const k = smooth(-0.05, 0.22, eh); o.h = o.h * k + Math.min(o.h, Math.max(-36, eh * 90 - 6)) * (1 - k);
    if (o.b !== 9 && o.b !== 10) { if (o.h < -1.5) o.b = 0; else if (o.h < 1.6) o.b = 1; }
    return o;
  }
  let h = e > 0 ? 1.7 + 3.5 * smooth(0, 0.3, e) + (N.fbm(x / 60, z / 60, 207, 2) - 0.5) * 1.6 * smooth(0, 0.1, e) : Math.max(-36, e * 90);
  let lmk = false;
  if (I0 && I0.H) { const p = landProfile(I0, Math.hypot(x - I0.x, z - I0.z), N, x, z); if (p > h && p > 0.5) { h = p; lmk = p > 6; } }
  let b;
  if (h < -1.5) b = 0; else if (h < 1.6) b = 1;
  else if (lmk && I0.kind === 'volcano') b = h > 20 ? 11 : 2;
  else if (lmk && I0.kind === 'cloudspire') b = h > I0.H * 0.55 ? 5 : h > 40 ? 6 : 3;
  else if (lmk && I0.kind === 'mesa') b = h > 25 ? 12 : 2;
  else b = N.v(x / 260, z / 260, 219) > 0.55 ? 3 : 2;
  return { h, b, temp: 0.5, moist: 0.5, vol: lmk && I0.kind === 'volcano' ? 1 : 0, special: lmk ? I0.id : null };
};
