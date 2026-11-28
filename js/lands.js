// Landmark islands for the themed regions. Every island is a landmark: a volcano, a spire that pokes
// above the clouds, a giant mesa, or a cluster of floating isles, with land around it to play on.
// Each high landmark has a shooting elevator at its foot up to ONE cool place halfway up (a hangout,
// an observatory, hot springs, a café, a library...), and another elevator from there to the very top.

const LAND_GROUP = { cinder: 'hot', magma: 'hot', obsidian: 'hot', ashveil: 'hot', glacier: 'cold', aurora: 'cold', frostpeak: 'cold', snowdrift: 'cold' };
const LAND_ORDER = {
  hot: ['volcano', 'cloudspire', 'volcano', 'floating', 'mesa', 'volcano', 'cloudspire', 'floating', 'mesa', 'volcano'],
  cold: ['cloudspire', 'floating', 'mesa', 'cloudspire', 'volcano', 'floating', 'mesa', 'cloudspire', 'floating', 'mesa'],
  mild: ['cloudspire', 'floating', 'volcano', 'mesa', 'floating', 'cloudspire', 'mesa', 'volcano', 'floating', 'cloudspire'],
};
// H = how tall the landmark is, LR = how wide its foot is, R = the whole island
const LAND_SIZE = { volcano: { H: 175, LR: 360, R: 780 }, cloudspire: { H: 300, LR: 200, R: 650 }, mesa: { H: 130, LR: 270, R: 690 }, floating: { H: 0, LR: 0, R: 600 } };
const LAND_NAMES = {
  volcano: ['Mount Scorch', 'Emberhorn', 'Smokecrown', 'Blazepeak', 'Cinder Crown', 'Ashfang', 'Firethroat', 'Magmaw', 'Heatwave Peak'],
  cloudspire: ['Above the Clouds', 'Skyneedle', 'Cloudpiercer', 'Highwind Spire', 'Stormtop', 'Heavenreach', 'Mistcrown', 'Windwhistle Peak', 'Sky Splitter'],
  mesa: ['Giant\'s Table', 'Sunshelf', 'Flattop', 'Broadcrown', 'Redwall', 'Highstep', 'Stonestack', 'Thunder Mesa', 'Tall Table'],
  floating: ['Floating Isles', 'Driftrocks', 'Skyscatter', 'Hovering Holm', 'Cloudstep Isles', 'Upfall', 'Airborne Keys', 'Levitas', 'Gravity Gap'],
};
const PLACE_KINDS = ['hangout', 'observatory', 'hotspring', 'cafe', 'library', 'garden', 'arcade', 'campsite', 'museum'];
const PLACE_NAMES = {
  hangout: ['The Comfy Ledge', 'Chill Shelf', 'The Cozy Nook'], observatory: ['Star Observatory', 'Skywatch Dome', 'Comet Lookout'],
  hotspring: ['Steamy Springs', 'Warm Pools', 'Cloud Baths'], cafe: ['Cliffside Café', 'Cloud Café', 'Sky High Café'],
  library: ['Hidden Library', 'Quiet Pages', 'Book Nook'], garden: ['Hanging Garden', 'Secret Garden', 'Bloom Ledge'],
  arcade: ['Glow Arcade', 'High Score Hall', 'Pixel Palace'], campsite: ['Ledge Camp', 'Starlight Camp', 'Cliff Camp'],
  museum: ['Relic Museum', 'Wonder Hall', 'Old Things Hall'],
};
const PLACE_TXT = { hangout: 'a comfy hangout', observatory: 'an observatory', hotspring: 'hot springs', cafe: 'a café', library: 'a library', garden: 'a garden', arcade: 'an arcade', campsite: 'a campsite', museum: 'a museum' };
const LAND_TXT = { volcano: 'a volcano with lava inside', cloudspire: 'a spire that pokes above the clouds', mesa: 'a giant flat-topped mesa', floating: 'rocks floating in the sky', landing: 'where you land', special: 'a special landmark' };
const LAND_DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

const _lands = {};
function landsOf(theme) {
  if (_lands[theme]) return _lands[theme];
  const C = REGION_THEMES[theme]; if (!C) return null;
  let s = 7; for (const ch of theme) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const out = [{ id: 'landing', kind: 'landing', name: C.landing, x: 0, z: 0, R: 480 }];
  for (const sp of C.specials) out.push({ id: sp.id, kind: 'special', name: sp.name, x: sp.x, z: sp.z, R: Math.max(360, sp.r * 2) });
  const order = LAND_ORDER[LAND_GROUP[theme] || 'mild'], nOff = Math.floor(rnd() * 9), pOff = Math.floor(rnd() * 9), used = {};
  let tries = 0, n = 0;
  while (n < order.length && tries < 2000) {
    tries++;
    const kind = order[n], S = LAND_SIZE[kind], a = rnd() * 6.2832, r = 2100 + rnd() * 3600, x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    if (out.some(q => Math.hypot(q.x - x, q.z - z) < (q.R + S.R) * 1.3 + 150)) continue;
    const kc = used[kind] = (used[kind] || 0) + 1, place = PLACE_KINDS[(pOff + n * 4) % PLACE_KINDS.length];
    out.push({ id: 'land' + n, kind, name: LAND_NAMES[kind][(nOff + kc * 2) % LAND_NAMES[kind].length], x, z, R: S.R, H: S.H, LR: S.LR, dir: Math.floor(rnd() * 4), place, placeName: PLACE_NAMES[place][(nOff + n) % 3] });
    n++;
  }
  _lands[theme] = out; return out;
}
// how high a landmark's own rock is at distance d from its middle
function landProfile(I, d, N, x, z) {
  if (I.kind === 'volcano') {
    const rc = 50, cone = q => I.H * Math.pow(Math.max(0, 1 - q / I.LR), 1.25);
    if (d < rc) return cone(rc) - 28 * (1 - (d / rc) ** 2);
    const ang = Math.atan2(z - I.z, x - I.x); return cone(d) * (1 + 0.07 * Math.sin(ang * 9 + d / 35) * smooth(rc, rc + 40, d));
  }
  if (I.kind === 'cloudspire') { const n = (N.fbm(x / 70, z / 70, 233, 2) - 0.5) * 0.3; return I.H * smooth(I.LR * (1 + n), I.LR * 0.42, d); }
  if (I.kind === 'mesa') { const n = (N.fbm(x / 90, z / 90, 234, 2) - 0.5) * 0.22, t = smooth(I.LR * (1 + n), I.LR * 0.74, d), h = I.H * t; return t > 0.98 ? I.H : Math.floor(h / 16) * 16 + smooth(0.7, 1, h / 16 % 1) * 16; }
  return -1e9;
}
const landAt = (theme, x, z) => { const L = landsOf(theme); if (!L) return null; let best = null, bd = 1e18; for (const I of L) { const d = Math.hypot(x - I.x, z - I.z) / I.R; if (d < bd) { bd = d; best = I; } } return bd < 1.3 ? best : null; };

// ---------- building them ----------
function buildLandIsles(gl, st, T, theme) {
  const out = []; let n = 0; for (const I of landsOf(theme) || []) if (I.H !== undefined) { out.push(buildLand(gl, st, T, I, n++)); if (I.H) out.push(landFar(gl, T, I)); }
  return out;
}
// the landmark's rock as one mesh, so it shows from far away (the land itself is only made close to you)
function landFar(gl, T, I) {
  const mb = new MeshBuilder(), NA = 64, NR = 36, P = [], RR = I.LR * 1.15;
  for (let r = 0; r <= NR; r++) for (let a = 0; a < NA; a++) { const rr = (r / NR) * RR, th = a / NA * 6.2832, x = I.x + Math.cos(th) * rr, z = I.z + Math.sin(th) * rr; P.push([x, Math.max(T.info(x, z).h, SEA - 1) - 3.5, z]); }
  const at = (r, a) => P[r * NA + ((a % NA) + NA) % NA];
  for (let r = 0; r <= NR; r++) for (let a = 0; a < NA; a++) {
    const p = at(r, a), q0 = at(Math.max(0, r - 1), a), q1 = at(Math.min(NR, r + 1), a), w0 = at(r, a - 1), w1 = at(r, a + 1);
    const u = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]], v = [w1[0] - w0[0], w1[1] - w0[1], w1[2] - w0[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; if (r === 0) n = [0, 1, 0]; if (n[1] < 0) n = n.map(k => -k); const l = Math.hypot(...n) || 1;
    mb.vert(p, [n[0] / l, n[1] / l, n[2] / l], vertexColor(T, p[0], p[2], p[1] + 3.5, n[1] / l));
  }
  for (let r = 0; r < NR; r++) for (let a = 0; a < NA; a++) { const A = r * NA + a, B = r * NA + (a + 1) % NA, C = (r + 1) * NA + a, D = (r + 1) * NA + (a + 1) % NA; mb.i.push(A, B, C, C, B, D); }
  return { key: 'Lfar:' + I.id, items: [], lights: [], triggers: [], label: null, x: I.x, z: I.z, far: 5200, rad: RR, mesh: mb.build(gl) };
}
function buildLand(gl, st, T, I, idx) {
  const mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), R = (a, b) => T.N.hash(a, b, 3100 + idx * 13);
  const s = { key: 'L:' + I.id, items: [], lights: [], triggers: [], label: null, x: I.x, z: I.z, far: 4600, rad: (I.LR || 120) + 60, signs: [], spots: [] };
  const [dx, dz] = LAND_DIRS[I.dir], rot = M4.rotY(Math.atan2(-dz, dx)), cx = I.x, cz = I.z, gAt = (x, z) => Math.max(T.h(x, z), SEA);
  const along = (r, y) => [cx + dx * r, y, cz + dz * r];
  const sideOff = (p, k) => [p[0] - dz * k, p[1], p[2] + dx * k];
  const liftCol = C(I.kind === 'volcano' ? '#ffb347' : I.kind === 'floating' ? '#9fffd0' : '#7fe0ff');
  // a glowing pad; tube = how tall the see-through tube above it is
  const pad = (p, tube, txt) => {
    mb.cyl(p[0], p[1] - 0.6, p[2], 3.2, 3.4, 0.75, 20, C('#4a4e58'));
    dmb.cyl(p[0], p[1] + 0.16, p[2], 2.6, 2.6, 0.04, 20, glowC(liftCol));
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832; dmb.box(p[0] + Math.cos(a) * 2.9 - 0.2, p[1] + 0.1, p[2] + Math.sin(a) * 2.9 - 0.2, p[0] + Math.cos(a) * 2.9 + 0.2, p[1] + 0.25, p[2] + Math.sin(a) * 2.9 + 0.2, glowC(C('#ffffff')), false, true); }
    if (tube > 0) {
      dmb.cyl(p[0], p[1], p[2], 2.3, 2.3, tube, 18, [0.6, 0.9, 1, 0.16], false);
      for (let y = 6; y < tube; y += 9) dmb.cyl(p[0], p[1] + y, p[2], 2.42, 2.42, 0.45, 18, glowC(liftCol), false);
      for (const a of [0.8, 2.4, 3.9, 5.5]) dmb.cyl(p[0] + Math.cos(a) * 2.5, p[1], p[2] + Math.sin(a) * 2.5, 0.18, 0.18, tube, 5, C('#5a5e68'), false);
    }
    if (txt) s.signs.push({ p: [p[0], p[1] + 4, p[2]], t: txt });
  };
  const lift = (p, path, name) => s.triggers.push({ lift: true, p: [p[0], p[1] + 1, p[2]], r: 2.6, path, name });
  const arc = (a, b, up) => { const pts = []; for (let k = 1; k <= 18; k++) { const t = k / 18; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * up * t * (1 - t), a[2] + (b[2] - a[2]) * t]); } return pts; };

  if (I.kind === 'floating') {
    const base = gAt(cx, cz), fl = [];
    for (let k = 0; k < 5; k++) {
      const a = I.dir * 1.57 + k * 1.3, d = 34 + k * 12, r = k === 2 ? 25 : 14 + R(k, 1) * 7;
      fl.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, y: base + 48 + k * 22, r });
    }
    const grass = C(theme0(T).g), rock = C(theme0(T).rock);
    fl.forEach((f, k) => {
      const top = f.y, r = f.r;
      ringSurf(mb, f.x, f.z, [[0.1, top], [r, top], [r * 0.97, top - 1.6], [r * 0.82, top - 7], [r * 0.52, top - 15], [r * 0.18, top - 25], [0.1, top - 30]], 20, (i, q) => i === 0 ? shadeC(grass, 0.94 + R(q, k) * 0.1) : shadeC(rock, 0.8 + R(q, i + k * 9) * 0.25));
      for (let t = 0; t < 3 && k !== 2; t++) { const a = R(k, t + 5) * 6.28, dd = r * 0.55 * R(t, k + 2); const tx = f.x + Math.cos(a) * dd, tz = f.z + Math.sin(a) * dd; dmb.cyl(tx, top, tz, 0.35, 0.3, 3, 6, C('#6a4a32')); dmb.cone(tx, top + 2.4, tz, 2.2, 4.8, 8, shadeC(grass, 0.75)); }
      for (let t = 0; t < 4; t++) { const a = R(k, t + 20) * 6.28; dmb.ico(f.x + Math.cos(a) * r * 0.3, top - 30 - t * 2, f.z + Math.sin(a) * r * 0.3, 1.2 - t * 0.2, 0, () => shadeC(rock, 0.8)); } // crumbs falling off the bottom
    });
    // tiny floating rocks around, just to look at
    for (let k = 0; k < 14; k++) { const a = R(k, 40) * 6.28, d = 40 + R(k, 41) * 90; dmb.ico(cx + Math.cos(a) * d, base + 30 + R(k, 42) * 110, cz + Math.sin(a) * d, 2 + R(k, 43) * 4, 0, () => shadeC(rock, 0.75 + R(k, 44) * 0.3)); }
    const p0 = [cx, base, cz]; pad(p0, fl[0].y + 6 - base, 'Shooting elevator: up to ' + I.name);
    lift(p0, [[cx, base + 2, cz], [cx, fl[0].y + 6, cz], [fl[0].x, fl[0].y + 6, fl[0].z], [fl[0].x, fl[0].y + 1.5, fl[0].z]]);
    for (let k = 0; k < 5; k++) {
      const f = fl[k], nx = fl[k + 1] || { x: cx + dx * 60, z: cz + dz * 60, y: gAt(cx + dx * 60, cz + dz * 60), r: 0 }, hd = Math.hypot(nx.x - f.x, nx.z - f.z), ux = (nx.x - f.x) / hd, uz = (nx.z - f.z) / hd;
      const pp = [f.x + ux * f.r * 0.6, f.y, f.z + uz * f.r * 0.6], to = [nx.x - ux * nx.r * 0.3, nx.y + 1.5, nx.z - uz * nx.r * 0.3];
      pad(pp, 0, k < 4 ? 'Hop to the next isle' : 'Back down');
      lift(pp, [[pp[0], pp[1] + 2, pp[2]], ...arc([pp[0], pp[1] + 2, pp[2]], to, k < 4 ? 8 : 12)]);
    }
    const f2 = fl[2]; mb.push([f2.x - dx * 11, f2.y, f2.z - dz * 11], rot); dmb.push([f2.x - dx * 11, f2.y, f2.z - dz * 11], rot); buildPlace(mb, dmb, I.place, 22, 18, s, R, false); mb.pop(); dmb.reset();
    s.spots.push({ kind: I.place, name: I.placeName, p: [f2.x, f2.y + 2, f2.z] }, { kind: 'summit', name: 'Highest isle', p: [fl[4].x, fl[4].y + 2, fl[4].z] }, { kind: 'lift', name: 'Elevator', p: [cx + 5, base + 2, cz] });
    s.signs.push({ p: [f2.x, f2.y + 7, f2.z], t: I.placeName });
    s.items.push({ id: s.key + ':top', type: 'relic', p: [fl[4].x, fl[4].y + 1.5, fl[4].z] });
    s.lights.push({ p: [f2.x, f2.y + 5, f2.z], r: 26, c: [1, 0.85, 0.6] });
  } else {
    // where the cool place sits: half way up, sticking out of the side the landmark faces
    const deckY = Math.round(I.H * 0.52 + 10), L = 26, W = 20;
    let rEdge = I.kind === 'volcano' ? 60 : 0; while (rEdge < I.LR && T.h(...along(rEdge, 0).filter((_, i) => i !== 1)) > deckY + 3) rEdge += 2;
    const rIn = rEdge - 8, d0 = along(rIn, deckY), mid = along(rIn + L * 0.5, deckY);
    mb.push(d0, rot); dmb.push(d0, rot);
    // the deck, its rails, posts down to the rock and a rock roof over the back so it sits in the mountain
    const plank = C('#a8784c'), rockC = C(theme0(T).rock);
    mb.box(0, -1.2, -W / 2, L, 0, W / 2, plank);
    for (let k = 0; k < 13; k++) dmb.box(k * 2 + 0.05, 0.01, -W / 2, k * 2 + 0.12, 0.03, W / 2, shadeC(plank, 0.7), false, true);
    mb.box(L - 0.4, 0, -W / 2, L, 1.1, W / 2, C('#6a4a2e')); mb.box(8, 0, -W / 2, L, 1.1, -W / 2 + 0.4, C('#6a4a2e')); mb.box(8, 0, W / 2 - 0.4, L, 1.1, W / 2, C('#6a4a2e'));
    for (let k = 0; k < 6; k++) dmb.cyl(L - 0.2, 0, -W / 2 + 0.2 + k * (W - 0.4) / 5, 0.18, 0.18, 1.3, 6, C('#4a3220'));
    mb.box(-8, 10, -W / 2 - 4, 9, 14, W / 2 + 4, rockC);
    for (let k = 0; k < 9; k++) dmb.ico(-2 + R(k, 60) * 12, 10 + R(k, 61) * 2, -W / 2 - 3 + k * (W + 6) / 8, 2.2 + R(k, 62) * 1.8, 0, () => shadeC(rockC, 0.8 + R(k, 63) * 0.3));
    for (const zz of [-W / 2 + 1, W / 2 - 1]) for (const xx of [L * 0.45, L - 1]) { const w = mb.tf([xx, 0, zz]), gy = gAt(w[0], w[2]) - deckY; if (gy < -1) dmb.cyl(xx, gy, zz, 0.5, 0.4, -gy - 1.2, 6, C('#5a3e26')); }
    buildPlace(mb, dmb, I.place, L, W, s, R, true);
    mb.pop(); dmb.reset();
    // the elevator at the foot, outside the rock, that shoots you up beside the deck and onto it
    const rP = I.LR + 12, pb = along(rP, 0); pb[1] = gAt(pb[0], pb[2]) + 0.3;
    for (let k = -3; k <= 3; k++) for (let q = -3; q <= 3; q++) mb.box(pb[0] + k * 2 - 1, pb[1] - 3, pb[2] + q * 2 - 1, pb[0] + k * 2 + 1, pb[1] - 0.6, pb[2] + q * 2 + 1, C(R(k + 9, q + 9) > 0.5 ? '#8a8a86' : '#7a7a76'), true, true);
    pad(pb, deckY + 4 - pb[1], 'Shooting elevator: up to ' + I.placeName);
    lift(pb, [[pb[0], pb[1] + 2, pb[2]], [pb[0], deckY + 4, pb[2]], [mid[0], deckY + 4, mid[2]], [mid[0], deckY + 1.5, mid[2]]]);
    // from the deck: on to the top, or back down
    const topR = I.kind === 'volcano' ? 58 : 0, top = along(topR, 0); top[1] = gAt(top[0], top[2]) + 1.5;
    const hi = I.H + 14, up = sideOff(along(rIn + L - 5, deckY), W / 2 - 3.5), dn = sideOff(along(rIn + L - 5, deckY), -W / 2 + 3.5);
    pad(up, 0, 'Up to the top'); pad(dn, 0, 'Back down');
    lift(up, [[up[0], deckY + 2, up[2]], [up[0], hi, up[2]], [top[0], hi, top[2]], top]);
    const out2 = sideOff(pb, 7); out2[1] = gAt(out2[0], out2[2]) + 1.5;
    lift(dn, [[dn[0], deckY + 3, dn[2]], [out2[0], deckY + 3, out2[2]], out2]);
    // the top: a flag, the relic, and a pad back down to the deck
    const tp = sideOff(along(topR + (I.kind === 'volcano' ? 10 : 8), 0), 5); tp[1] = gAt(tp[0], tp[2]) + 0.3;
    pad(tp, 0, 'Back down to ' + I.placeName);
    lift(tp, [[tp[0], tp[1] + 3, tp[2]], [tp[0], hi, tp[2]], [mid[0], hi, mid[2]], [mid[0], deckY + 1.5, mid[2]]]);
    const fp = sideOff(top, -4); fp[1] = gAt(fp[0], fp[2]);
    mb.cyl(fp[0], fp[1] - 0.5, fp[2], 0.2, 0.16, 9, 6, C('#d8d8d0'));
    dmb.quad([fp[0], fp[1] + 8.4, fp[2]], [fp[0] + 4, fp[1] + 7.6, fp[2] + 0.4], [fp[0] + 4, fp[1] + 6.2, fp[2] + 0.4], [fp[0], fp[1] + 5.8, fp[2]], C('#ff4a4a'));
    dmb.quad([fp[0], fp[1] + 5.8, fp[2]], [fp[0] + 4, fp[1] + 6.2, fp[2] + 0.4], [fp[0] + 4, fp[1] + 7.6, fp[2] + 0.4], [fp[0], fp[1] + 8.4, fp[2]], C('#d83a3a'));
    s.signs.push({ p: [fp[0], fp[1] + 10, fp[2]], t: 'Top of ' + I.name });
    s.items.push({ id: s.key + ':top', type: 'relic', p: [top[0], top[1] + 0.5, top[2]] });
    s.spots.push({ kind: I.place, name: I.placeName, p: [mid[0], deckY + 2, mid[2]] }, { kind: 'summit', name: 'Top of ' + I.name, p: [top[0], top[1] + 1, top[2]] }, { kind: 'lift', name: 'Elevator', p: sideOff([pb[0], pb[1] + 2, pb[2]], 5) });
    s.signs.push({ p: [mid[0], deckY + 8, mid[2]], t: I.placeName });
    if (I.kind === 'volcano') {
      const fy = gAt(cx, cz);
      dmb.cyl(cx, fy + 1.2, cz, 40, 40, 0.3, 28, glowC(C('#ff6a1a')));
      for (let k = 0; k < 14; k++) { const a = R(k, 70) * 6.28, d = R(k, 71) * 30; dmb.ico(cx + Math.cos(a) * d, fy + 1.6, cz + Math.sin(a) * d, 1 + R(k, 72) * 2, 0, () => C('#2a1a14')); }
      for (let k = 0; k < 18; k++) { const a = R(k, 73) * 6.28, d = R(k, 74) * 26; dmb.sph([cx + Math.cos(a) * d, fy + 30 + k * 5, cz + Math.sin(a) * d], 7 + k * 0.7, 7, [0.25, 0.22, 0.22, 0.3], 0); }
      s.triggers.push({ kill: true, p: [cx, fy, cz], r: 36, h: 4, back: [top[0], top[1] + 1, top[2]], msg: 'Too hot! The lava threw you back onto the rim' });
      s.lights.push({ p: [cx, fy + 8, cz], r: 70, c: [1, 0.45, 0.15] });
    }
    if (I.kind === 'cloudspire') {
      // a ring of clouds around the spire, above the cool place and below the top
      const cy = I.H * 0.72;
      for (let k = 0; k < 60; k++) { const a = k / 60 * 6.2832 + R(k, 80) * 0.1, d = I.LR * 0.55 + 20 + R(k, 81) * 70; dmb.sph([cx + Math.cos(a) * d, cy + (R(k, 82) - 0.5) * 12, cz + Math.sin(a) * d], [12 + R(k, 83) * 10, 5 + R(k, 84) * 4, 12 + R(k, 85) * 10], 7, [1, 1, 1, 0.42], 0); }
    }
  }
  s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
}
// the theme's colours for grass and rock
function theme0(T) { const C = REGION_THEMES[T.theme], B = BIOMES[C.kinds[Object.keys(C.kinds)[0]].b] || {}; return { g: B.ground || '#6a9a4a', rock: B.rock || '#7a7670' }; }

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
  } else if (kind === 'museum') {
    for (let k = 0; k < 5; k++) { const x = 4 + (k % 3) * 7, z = k < 3 ? -4.5 : 4.5; mb.box(x - 1, 0, z - 1, x + 1, 1.2, z + 1, C('#e8e4dc')); dmb.ico(x, 2, z, 0.7, 1, () => glowC(C(['#ff5a5a', '#5aff8a', '#5ab0ff', '#ffd25a', '#d85aff'][k]))); light(x, 2.4, z, 6, [1, 1, 1]); }
    for (const z of [-2.4, 2.4]) { for (let k = 0; k < 6; k++) dmb.cyl(3 + k * 3.4, 0, z, 0.1, 0.1, 1, 5, C('#c8a040')); dmb.box(3, 0.85, z - 0.05, 20, 0.95, z + 0.05, C('#a82a2a'), false, true); }
    dmb.box(0.6, 1, -6, 0.8, 4, 6, C('#2a2a3a'), false, true); for (let k = 0; k < 3; k++) dmb.box(0.82, 1.5, -5 + k * 3.6, 0.86, 3.5, -2.4 + k * 3.6, C(['#d8c8a8', '#a8c8d8', '#c8d8a8'][k]), false, true);
  }
}
