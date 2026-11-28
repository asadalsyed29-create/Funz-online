// The places that make each travel region special. Dustmaw Reaches: the landing camp, The Cactus and Bonewash.

// a straight round post between two points that you bump into (built from flat faces so it collides)
function tubeC(mb, a, b, r, seg, col) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(d[0], d[1], d[2]) || 0.01;
  mb.push(a, M4.aim(d)); mb.cyl(0, 0, 0, r, r, len, seg, col); mb.pop();
}

function buildDustLandmarks(gl, st, T) {
  const out = [], R = (k, s) => T.N.hash(k, s, 2900);
  // ---------- Dustmaw Landing: where you arrive ----------
  {
    const mb = new MeshBuilder().collect(), y = SPAWN_H, H = bh(mb), C = h => hex(h), s = { key: 'landing', items: [], lights: [], triggers: [], label: null, x: 0, z: 0 };
    // a ring of flat sandstone slabs
    for (let r = 0; r < 3; r++) for (let k = 0; k < 18; k++) {
      const a0 = k / 18 * 6.2832 + r * 0.17, a1 = (k + 1) / 18 * 6.2832 + r * 0.17 - 0.02, r0 = 6 + r * 5.5, r1 = r0 + 5.2, yy = y + 0.12;
      mb.quad([Math.cos(a1) * r0, yy, Math.sin(a1) * r0], [Math.cos(a1) * r1, yy, Math.sin(a1) * r1], [Math.cos(a0) * r1, yy, Math.sin(a0) * r1], [Math.cos(a0) * r0, yy, Math.sin(a0) * r0], shadeC(C((k + r) % 3 ? '#d9b98a' : '#c9a574'), 0.93 + R(k, r) * 0.1));
    }
    // the campfire in the middle
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.2832; mb.ico(Math.cos(a) * 2.1, y + 0.3, Math.sin(a) * 2.1, [0.55, 0.4, 0.5], 0, () => rockC(C('#8a7a6a'))); }
    for (let k = 0; k < 4; k++) { const a = k * 0.8; mb.push([0, y + 0.35, 0], M4.mul3(M4.rotY(a), M4.rotZ(Math.PI / 2))); mb.cyl(0, -1.1, 0, 0.18, 0.16, 2.2, 6, C('#6a4a2e'), true); mb.pop(); }
    for (let k = 0; k < 5; k++) mb.cone(Math.cos(k * 1.3) * 0.4, y + 0.4, Math.sin(k * 1.3) * 0.4, 0.45, 1.1 + (k % 2) * 0.6, 5, glowC(C(k % 2 ? '#ffb030' : '#ff7a1a')));
    s.lights.push({ p: [0, y + 1.6, 0], r: 14, c: [1, 0.6, 0.25] });
    // two canvas tents with striped cloth, crates and water jars
    for (const [tx, tz, ta, tc] of [[-9, 6, 0.5, '#d8c4a0'], [8, 9, -0.6, '#c0704a']]) {
      mb.push([tx, y, tz], M4.rotY(ta));
      const c = C(tc), dk = shadeC(c, 0.78);
      mb.quad([-2.4, 0, 1.8], [2.4, 0, 1.8], [2.4, 2.6, 0], [-2.4, 2.6, 0], c); mb.quad([2.4, 0, -1.8], [-2.4, 0, -1.8], [-2.4, 2.6, 0], [2.4, 2.6, 0], dk);
      mb.tri([-2.4, 0, -1.8], [-2.4, 2.6, 0], [-2.4, 0, 1.8], shadeC(c, 0.66)); mb.tri([2.4, 0, 1.8], [2.4, 2.6, 0], [2.4, 0, -1.8], shadeC(c, 0.9));
      for (let q = -1; q <= 1; q++) mb.box(-2.45, 0.9 + q * 0.6, 1.14 - q * 0.04, 2.45, 1.0 + q * 0.6, 1.2, C('#8a3a2a'), true, true);
      mb.cyl(-2.5, 0, 0, 0.07, 0.07, 3, 5, C('#6a4a2e')); mb.cyl(2.5, 0, 0, 0.07, 0.07, 3, 5, C('#6a4a2e'));
      mb.pop();
    }
    H.crate(-4, -8, 0.9, y); H.crate(-3, -8.6, 0.7, y); H.crate(-3.6, -8.2, 0.6, y + 0.9);
    for (let k = 0; k < 3; k++) { mb.push([5 + k * 0.9, y, -7 + k * 0.3]); mb.lathe([[0, 0], [0.32, 0.05], [0.42, 0.4], [0.3, 0.8], [0.16, 0.95], [0.2, 1.05], [0, 1.05]], 10, C(k % 2 ? '#b86a3a' : '#c88050'), 0.25); mb.pop(); }
    // a signpost
    mb.cyl(0, y, 14, 0.14, 0.12, 3.2, 6, C('#7a5432'));
    mb.push([0, y + 2.6, 14], M4.rotY(0.2)); H.box(-1.6, -0.3, -0.06, 1.6, 0.3, 0.06, '#b58556'); mb.pop();
    mb.push([0, y + 2.0, 14], M4.rotY(-0.4)); H.box(-1.4, -0.25, -0.06, 1.4, 0.25, 0.06, '#a8784c'); mb.pop();
    s.signs = [{ p: [0, y + 4, 14], t: 'Dustmaw Landing' }];
    s.mesh = mb.build(gl); st.grid.add(mb.tris, s); out.push(s);
  }
  // ---------- The Cactus: a cactus as tall as a tower, with a wooden path winding up to its flower ----------
  {
    const S0 = DUST_SPECIALS[0], cx = S0.x, cz = S0.z, y0 = T.h(cx, cz) - 0.5, TOP = 72, R0 = 6.2;
    const mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h);
    const s = { key: 'cactus', items: [], lights: [], triggers: [], label: 'The Cactus', x: cx, z: cz, far: 3200, rad: 40 };
    const green = C('#4f8a3e'), ridge = C('#6aa84e'), groove = C('#2f5e2c');
    const cactusCol = (t, ph) => { const r = Math.cos(ph * 14); return r > 0.55 ? mixC(ridge, C('#86c060'), t * 0.3) : r < -0.4 ? groove : mixC(green, ridge, (r + 0.4) / 1.2 * 0.5); };
    // trunk: ribbed, a bit wider at the bottom, rounded on top
    const prof = []; for (let k = 0; k <= 16; k++) { const t = k / 16; prof.push([R0 * (1 - t * 0.12) + Math.sin(t * 9) * 0.12, t * TOP]); }
    for (const [r, yy] of [[R0 * 0.85, TOP + 2.2], [R0 * 0.62, TOP + 4], [R0 * 0.3, TOP + 5.2], [0, TOP + 5.6]]) prof.push([r, yy]);
    mb.push([cx, y0, cz]); mb.lathe(prof, 70, cactusCol, 0.12); mb.pop();
    // its arms: out sideways, then up, with rounded tips
    const arm = (ang, h, out, up, r) => {
      const ax = Math.cos(ang), az = Math.sin(ang), base = [cx + ax * (R0 - 1), y0 + h, cz + az * (R0 - 1)], elbow = [cx + ax * (R0 + out), y0 + h + 2.5, cz + az * (R0 + out)], tip = [elbow[0], elbow[1] + up, elbow[2]];
      mb.caps(base, elbow, r, r, 40, cactusCol); mb.caps(elbow, tip, r, r * 0.92, 40, cactusCol);
      tubeC(col, base, elbow, r * 0.9, 8, green); tubeC(col, elbow, tip, r * 0.85, 8, green);
      return tip;
    };
    const tipA = arm(1.88, 28, 11, 18, 3.4), tipB = arm(5.65, 44, 9, 15, 3.0);
    // spines: little pale needles in rows along the ridges
    for (let k = 0; k < 520; k++) {
      const a = Math.floor(R(k, 1) * 14) / 14 * 6.2832 + 0.0, yy = 1 + R(k, 2) * (TOP - 2), rr = R0 * (1 - yy / TOP * 0.12) + 0.05, px = cx + Math.cos(a) * rr, pz = cz + Math.sin(a) * rr, py = y0 + yy;
      const o = [Math.cos(a), 0, Math.sin(a)], sp = 0.9, c = C(R(k, 3) < 0.5 ? '#f4ecd0' : '#e0d4a8');
      for (const [dx, dy] of [[0.3, 0.4], [-0.3, 0.4], [0, -0.35]]) dmb.tri([px, py, pz], [px + o[0] * sp - o[2] * dx, py + dy, pz + o[2] * sp + o[0] * dx], [px + o[0] * sp * 0.8, py + dy * 0.6, pz + o[2] * sp * 0.8], c, true);
    }
    // flowers on the top and on the arm tips
    const bloom = (p, n, sz) => { for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + R(k, 9), d = sz * 1.4, fx = p[0] + Math.cos(a) * d, fz = p[2] + Math.sin(a) * d, fy = p[1] + 0.3 + R(k, 7) * 0.4;
      for (let q = 0; q < 6; q++) { const b = q / 6 * 6.2832; dmb.tri([fx, fy + 0.2, fz], [fx + Math.cos(b) * sz, fy + 0.55, fz + Math.sin(b) * sz], [fx + Math.cos(b + 0.6) * sz, fy + 0.5, fz + Math.sin(b + 0.6) * sz], C(q % 2 ? '#ff8fb0' : '#ffb8cc'), true); }
      dmb.ico(fx, fy + 0.35, fz, 0.28 * sz, 0, () => C('#ffd84a')); } };
    bloom([cx, y0 + TOP + 4.6, cz], 7, 1.2); bloom(tipA, 4, 0.9); bloom(tipB, 4, 0.9);
    // the path: wooden planks spiralling up around the trunk with a rail on the outside
    const turns = (TOP - 2) / 10, steps = Math.round(turns * 36), RI = R0 + 0.1, RO = R0 + 4.2, wood = C('#a8784c'), woodD = C('#7a5432');
    const P = (a, r, yy) => [cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r];
    for (let k = 0; k < steps; k++) {
      const a0 = k / 36 * 6.2832, a1 = (k + 1) / 36 * 6.2832, h0 = y0 + 0.6 + k / steps * (TOP - 2), h1 = y0 + 0.6 + (k + 1) / steps * (TOP - 2), c = shadeC(k % 2 ? wood : C('#b88a58'), 0.92 + R(k, 4) * 0.1);
      mb.quad(P(a0, RI, h0), P(a1, RI, h1), P(a1, RO, h1), P(a0, RO, h0), c);
      mb.quad(P(a0, RO, h0), P(a1, RO, h1), P(a1, RO, h1 - 0.35), P(a0, RO, h0 - 0.35), woodD, true);
      mb.quad(P(a0, RO, h0 - 0.35), P(a1, RO, h1 - 0.35), P(a1, RI, h1 - 0.35), P(a0, RI, h0 - 0.35), shadeC(woodD, 0.8), true);
      // rail: a low wall you can't fall past, with a post every few planks
      mb.quad(P(a1, RO, h1), P(a0, RO, h0), P(a0, RO, h0 + 1.1), P(a1, RO, h1 + 1.1), shadeC(woodD, 1.1));
      mb.quad(P(a0, RO, h0), P(a1, RO, h1), P(a1, RO, h1 + 1.1), P(a0, RO, h0 + 1.1), shadeC(woodD, 0.9), true);
      if (k % 4 === 0) { const p = P(a0, RO + 0.1, h0); mb.cyl(p[0], h0 - 0.4, p[2], 0.16, 0.16, 1.7, 5, woodD, true); }
      if (k % 6 === 0) { const p = P(a0 + 0.08, RI, h0 - 0.2); dmb.box(p[0] - 0.1, p[1] - 1.2, p[2] - 0.1, p[0] + 0.1, p[1], p[2] + 0.1, woodD, true, true); }
    }
    // a round deck at the top, the flower in the middle of it and a relic to find
    const yt = y0 + TOP + 0.6;
    for (let k = 0; k < 18; k++) { const a0 = k / 18 * 6.2832, a1 = (k + 1) / 18 * 6.2832; mb.quad(P(a0, RI, yt), P(a1, RI, yt), P(a1, RO + 1, yt), P(a0, RO + 1, yt), shadeC(wood, 0.95 + (k % 2) * 0.06)); }
    // the trunk itself is solid (an invisible copy you bump into)
    col.cyl(cx, y0 - 1, cz, RI, RI, TOP + 6, 18, green);
    s.items.push({ id: 'cactus:top', type: 'relic', p: [cx + RO - 1, yt + 0.6, cz] });
    s.signs = [{ p: [cx + RO + 2, y0 + 4, cz + 3], t: 'The Cactus: climb to the top!' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); out.push(s);
  }
  // ---------- Bonewash: the bones of something enormous, half buried in the sand ----------
  {
    const S1 = DUST_SPECIALS[1], cx = S1.x, cz = S1.z, y0 = T.h(cx, cz) - 1.2, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h);
    const s = { key: 'bonewash', items: [], lights: [], triggers: [], label: 'Bonewash', x: cx, z: cz, far: 2600, rad: 90 };
    const bone = k => shadeC(C(k % 3 ? '#efe4cc' : '#e2d4b4'), 0.94 + R(k, 11) * 0.1), ang = 0.4, ax = Math.cos(ang), az = Math.sin(ang), sx = -az, sz = ax;
    const at = (u, v, h) => [cx + ax * u + sx * v, y0 + h, cz + az * u + sz * v];
    // the backbone: big round bones in a gentle curve
    const spine = []; for (let k = 0; k <= 34; k++) { const u = -70 + k * 4.2; spine.push(at(u, Math.sin(u / 30) * 6, 3.5 + Math.sin(k / 34 * Math.PI) * 6)); }
    for (let k = 0; k < spine.length; k++) { const p = spine[k], r = 2.2 - Math.abs(k - 14) * 0.045; mb.ico(p[0], p[1], p[2], [r, r * 1.1, r], 1, () => bone(k)); dmb.cone(p[0], p[1] + r * 0.8, p[2], r * 0.4, r * 1.6, 5, bone(k + 1)); if (k) tubeC(mb, spine[k - 1], p, r * 0.45, 6, bone(k)); }
    // ribs: tall arches you can roll under
    for (let k = 3; k < 22; k++) {
      const p = spine[k], len = 15 + Math.sin((k - 3) / 19 * Math.PI) * 9;
      for (const sd of [-1, 1]) {
        let prev = p;
        for (let q = 1; q <= 8; q++) { const t = q / 8, v = sd * Math.sin(t * 1.9) * len * 0.75, h = p[1] - y0 - (t * t) * (p[1] - y0 + 6) + Math.sin(t * Math.PI) * len * 0.35, pt = [p[0] + sx * v - ax * t * 2, y0 + h, p[2] + sz * v - az * t * 2]; tubeC(mb, prev, pt, 0.95 - t * 0.35, 6, bone(k * 3 + q)); prev = pt; }
      }
    }
    // the skull at the front, with dark eye holes and long teeth
    const hp = at(-82, Math.sin(-82 / 30) * 6, 6);
    mb.push(hp, M4.rotY(-ang)); mb.ico(0, 0, 0, [13, 8, 9], 2, (nx, ny, nz) => shadeC(bone(3), 0.85 + ny * 0.15)); mb.pop();
    for (const sd of [-1, 1]) { const e = [hp[0] - ax * 6 + sx * sd * 4.5, hp[1] + 3, hp[2] - az * 6 + sz * sd * 4.5]; dmb.ico(e[0], e[1], e[2], [2.6, 2.2, 2.6], 1, () => C('#2a2018')); }
    for (let k = 0; k < 9; k++) { const v = -6 + k * 1.5, base = [hp[0] - ax * 11 + sx * v, hp[1] - 4.5, hp[2] - az * 11 + sz * v]; mb.cone(base[0], y0 - 0.5, base[2], 0.7, base[1] - y0 + 3, 5, bone(k)); }
    // sand heaped against the bones, and a relic hidden inside the ribs
    for (let k = 0; k < 14; k++) { const u = -70 + R(k, 12) * 140, v = (R(k, 13) - 0.5) * 30, p = at(u, v, 0); dmb.ico(p[0], y0 - 1.5, p[2], [6 + R(k, 14) * 5, 2.4, 5 + R(k, 15) * 4], 1, () => C('#e0bc84')); }
    const rel = at(-20, 0, 0); s.items.push({ id: 'bonewash:relic', type: 'relic', p: [rel[0], T.h(rel[0], rel[2]) + 0.8, rel[2]] });
    s.signs = [{ p: [hp[0] - ax * 16, y0 + 9, hp[2] - az * 16], t: 'Bonewash' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); out.push(s);
  }
  return out;
}

// ---------- the other travel regions (worlds.js): a landing camp and their special places ----------
// a path of planks spiralling up around a round thing (with a rail on the outside); returns the height at the top
function spiralPath(mb, dmb, cx, cz, y0, top, RI, W, wood, woodD, R, openEnd = 0) {
  const turns = top / 10, steps = Math.round(turns * 36), RO = RI + W, P = (a, r, yy) => [cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r];
  for (let k = 0; k < steps; k++) {
    const a0 = k / 36 * 6.2832, a1 = (k + 1) / 36 * 6.2832, h0 = y0 + 0.6 + k / steps * top, h1 = y0 + 0.6 + (k + 1) / steps * top, c = shadeC(k % 2 ? wood : mixC(wood, [1, 1, 1, 1], 0.12), 0.92 + R(k, 4) * 0.1);
    mb.quad(P(a0, RI, h0), P(a1, RI, h1), P(a1, RO, h1), P(a0, RO, h0), c);
    mb.quad(P(a0, RO, h0), P(a1, RO, h1), P(a1, RO, h1 - 0.35), P(a0, RO, h0 - 0.35), woodD, true);
    mb.quad(P(a0, RO, h0 - 0.35), P(a1, RO, h1 - 0.35), P(a1, RI, h1 - 0.35), P(a0, RI, h0 - 0.35), shadeC(woodD, 0.8), true);
    if (k < steps - openEnd) { mb.quad(P(a1, RO, h1), P(a0, RO, h0), P(a0, RO, h0 + 1.1), P(a1, RO, h1 + 1.1), shadeC(woodD, 1.1)); mb.quad(P(a0, RO, h0), P(a1, RO, h1), P(a1, RO, h1 + 1.1), P(a0, RO, h0 + 1.1), shadeC(woodD, 0.9), true); }
    if (k % 4 === 0 && k < steps - openEnd) { const p = P(a0, RO + 0.1, h0); mb.cyl(p[0], h0 - 0.4, p[2], 0.16, 0.16, 1.7, 5, woodD, true); }
  }
  return y0 + 0.6 + top;
}
// a ring of quads (collide) between two rings of points: used for domes and caps you can stand on
function ringSurf(mb, cx, cz, rings, seg, colFn) {
  for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < seg; k++) {
    const a0 = k / seg * 6.2832, a1 = (k + 1) / seg * 6.2832, [r0, y0] = rings[i], [r1, y1] = rings[i + 1];
    const A = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0], B = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0], Cq = [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], D = [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1], c = colFn(i, k);
    mb.quad(A, B, Cq, D, c); mb.quad(D, Cq, B, A, c, true); // both sides, so it shows from above and below
  }
}

const SPECIAL_BUILD = {
  // Lumenhollow: a mushroom as big as a hill. Shelf fungi spiral up the stem and come out through a hole onto the glowing cap.
  greatshroom(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, TOP = 58, R0 = 9, W = 4.4, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h);
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3400, rad: 60 };
    mb.push([cx, y0, cz]); mb.lathe([[R0 * 1.5, 0], [R0 * 1.15, 3], [R0, 12], [R0 * 0.94, 40], [R0 * 1.02, TOP + 2]], 40, t => smoothC(mixC(C('#e8dcf4'), C('#c8b4e4'), t)), 0.15); mb.pop();
    const yt = spiralPath(mb, dmb, cx, cz, y0, TOP, R0 + 0.1, W, C('#8a5ab0'), C('#5a3a78'), R, 5), RO = R0 + W + 0.3, CAP = 50;
    // the cap: a hole in the middle where the path comes out, a gently rounded top, and glowing gills underneath
    const top = [[RO, yt], [RO + 6, yt + 2.2], [RO + 16, yt + 2.6], [RO + 26, yt + 1.4], [CAP - 6, yt - 2.5], [CAP, yt - 7]];
    ringSurf(mb, cx, cz, top, 48, (i, k) => smoothC(shadeC(C(i % 2 ? '#c05ae0' : '#b04ad0'), 0.92 + R(k, i) * 0.12)));
    ringSurf(mb, cx, cz, [[CAP, yt - 7], [CAP - 2, yt - 8.6], [RO + 2, yt - 3]].reverse(), 48, () => glowC(C('#ffd0ff')));
    for (let k = 0; k < 40; k++) { const a = R(k, 31) * 6.283, d = RO + 4 + R(k, 32) * (CAP - RO - 10), ty = top.reduce((acc, q, i) => i && d >= top[i - 1][0] && d <= q[0] ? top[i - 1][1] + (q[1] - top[i - 1][1]) * (d - top[i - 1][0]) / (q[0] - top[i - 1][0]) : acc, yt); dmb.sph([cx + Math.cos(a) * d, ty + 0.3, cz + Math.sin(a) * d], [1.6 + R(k, 33) * 1.4, 0.4, 1.6 + R(k, 33) * 1.4], 8, glowC(C('#fff2a8')), 0); }
    // little glowing shelf fungi on the stem below the path
    for (let k = 0; k < 30; k++) { const a = R(k, 34) * 6.283, yy = y0 + 2 + R(k, 35) * (TOP - 6); dmb.sph([cx + Math.cos(a) * (R0 + 0.3), yy, cz + Math.sin(a) * (R0 + 0.3)], [1.2, 0.25, 1.2], 6, glowC(C(k % 2 ? '#9ff0ff' : '#ff9ad8')), 0); }
    col.cyl(cx, y0 - 1, cz, R0 + 0.1, R0 + 0.1, TOP + 1, 20, C('#ffffff'));
    s.lights.push({ p: [cx, yt + 6, cz], r: 40, c: [0.8, 0.5, 1] }, { p: [cx + 20, yt - 10, cz], r: 30, c: [1, 0.7, 1] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + RO + 14, yt + 3.4, cz] });
    s.signs = [{ p: [cx + R0 + W + 3, y0 + 4, cz + 3], t: 'The Great Mushroom: climb up to the cap!' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
  // Kelar Coasts: a giant spiral seashell lying on the beach. Roll in through the mouth and follow it round to the pearl.
  shell(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz), mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h);
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3000, rad: 50 };
    const K = 64, SEG = 18, rings = [];
    for (let k = 0; k <= K; k++) { // a log spiral: the tube winds inwards and gets thinner
      const t = k / K, a = t * 7.5, sc = Math.exp(-t * 1.9), rr = 32 * sc, r = Math.max(1.6, 11 * sc);
      const c = [cx + Math.cos(a) * rr, y0 + r - 0.6 + t * 4, cz + Math.sin(a) * rr], tg = [-Math.sin(a) - 0.3 * Math.cos(a), 0.05, Math.cos(a) - 0.3 * Math.sin(a)];
      const tl = Math.hypot(...tg); rings.push({ c, r, t: tg.map(v => v / tl) });
    }
    for (let k = 0; k < K; k++) for (let q = 0; q < SEG; q++) {
      const P = (ri, qq) => { const g = rings[ri], up = [0, 1, 0], side = [g.t[2], 0, -g.t[0]], sl = Math.hypot(side[0], side[2]) || 1, a = qq / SEG * 6.2832; return [g.c[0] + (side[0] / sl * Math.cos(a)) * g.r, g.c[1] + Math.sin(a) * g.r * 0.95, g.c[2] + (side[2] / sl * Math.cos(a)) * g.r]; };
      const stripe = Math.floor(k / 3) % 2, inside = q > SEG * 0.55 && q < SEG * 0.95;
      const c = inside ? smoothC(C('#f6c8c0')) : smoothC(shadeC(C(stripe ? '#e8a888' : '#f4dcc4'), 0.9 + R(k, q) * 0.1));
      mb.quad(P(k, q), P(k + 1, q), P(k + 1, q + 1), P(k, q + 1), c);
      mb.quad(P(k, q + 1), P(k + 1, q + 1), P(k + 1, q), P(k, q), shadeC(C('#f8d0c8'), 0.8 + (q % 3) * 0.06), true); // the glossy pink inside
    }
    // knobs along the outer whorl
    for (let k = 4; k < K - 6; k += 4) { const g = rings[k]; dmb.cone(g.c[0], g.c[1] + g.r * 0.85, g.c[2], g.r * 0.18, g.r * 0.4, 6, smoothC(C('#e0b090'))); }
    const end = rings[K]; s.items.push({ id: sp.id + ':pearl', type: 'pearl', p: [end.c[0], end.c[1] - end.r + 1, end.c[2]] });
    s.lights.push({ p: [end.c[0], end.c[1], end.c[2]], r: 10, c: [1, 0.85, 0.9] });
    s.signs = [{ p: [rings[0].c[0] + 6, y0 + 14, rings[0].c[2] - 6], t: 'The Shell: roll inside to find the pearl' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Kelar Coasts: a tall sea rock with a striped lighthouse on top and stairs winding up around both
  lightrock(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, ROCK = 26, RR = 11, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h);
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3600, rad: 40 };
    mb.push([cx, y0, cz]); mb.lathe([[RR * 1.4, 0], [RR * 1.1, 4], [RR, 12], [RR * 0.95, ROCK - 2], [RR * 0.9, ROCK]], 28, (t, ph) => shadeC(C('#8a8478'), 0.85 + Math.abs(Math.sin(ph * 7 + t * 9)) * 0.2), 0); mb.pop();
    const y1 = spiralPath(mb, dmb, cx, cz, y0, ROCK - 0.6, RR + 0.1, 3.6, C('#a8784c'), C('#6a4a2e'), R, 3);
    ringSurf(mb, cx, cz, [[0.1, y1], [RR + 3.7, y1]], 24, k => shadeC(C('#9a9488'), 0.95));
    // the lighthouse: red and white bands, a gallery, and a glowing lamp room
    const LH = 22, LR = 4.2; mb.push([cx, y1, cz]); mb.lathe([[LR, 0], [LR * 0.8, LH]], 20, t => smoothC(C(Math.floor(t * 6) % 2 ? '#d8342a' : '#f4f0e8')), 0); mb.pop();
    col.cyl(cx, y1, cz, LR, LR * 0.8, LH, 14, C('#ffffff'));
    mb.cyl(cx, y1 + LH, cz, LR + 1.2, LR + 1.2, 0.4, 20, C('#2a2a2a'));
    dmb.cyl(cx, y1 + LH + 0.4, cz, LR * 0.75, LR * 0.75, 3, 14, glowC(C('#fff2a8')), false);
    dmb.cone(cx, y1 + LH + 3.4, cz, LR * 0.95, 2.6, 14, C('#d8342a'));
    // a door at the bottom, and a light that sweeps round at night
    dmb.box(cx + LR - 0.1, y1, cz - 0.8, cx + LR + 0.05, y1 + 2.2, cz + 0.8, C('#4a3020'));
    s.lights.push({ p: [cx, y1 + LH + 2, cz], r: 60, c: [1, 0.95, 0.7] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + RR + 1, y1 + 0.6, cz + 2] });
    s.signs = [{ p: [cx + RR + 6, y0 + 4, cz], t: 'Lighthouse Rock' }];
    col.cyl(cx, y0 - 1, cz, RR + 0.1, RR + 0.1, ROCK, 18, C('#ffffff'));
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
  // Rustworks: the Broken Bridge. A rusty bridge over the sea with holes in it; some planks fall when you roll on them.
  bridge(gl, st, T, sp, R, game) {
    const SP = themeSpecials('rust'), A = SP[0], B = SP[1], z = A.z, x0 = A.x + 90, x1 = B.x - 120, DECK = 24, W = 3.2;
    const mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), rust = C('#8a4a2a'), rustD = C('#5a3220'), conc = C('#8a8a86');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: (x0 + x1) / 2, z, far: 3400, rad: 160 };
    const yA = T.h(x0 - 150, z), yB = T.h(x1 + 100, z);
    // ramps up from the land at both ends (with low walls)
    const ramp = (xa, ya, xb, yb) => { mb.quad([xa, ya, z - W], [xa, ya, z + W], [xb, yb, z + W], [xb, yb, z - W], conc); for (const sd of [-1, 1]) { mb.quad([xa, ya, z + sd * W], [xb, yb, z + sd * W], [xb, yb + 1, z + sd * W], [xa, ya + 1, z + sd * W], shadeC(conc, 0.85)); mb.quad([xb, yb, z + sd * W], [xa, ya, z + sd * W], [xa, ya + 1, z + sd * W], [xb, yb + 1, z + sd * W], shadeC(conc, 0.85)); }
      for (let k = 1; k < 6; k++) { const t = k / 6, x = xa + (xb - xa) * t, y = ya + (yb - ya) * t; mb.box(x - 1, T.h(x, z) - 2, z - W + 0.5, x + 1, y - 0.2, z + W - 0.5, shadeC(conc, 0.8), true, true); } };
    ramp(x0 - 150, yA + 0.1, x0, DECK); ramp(x1, DECK, x1 + 100, yB + 0.1);
    // the deck: 2 m sections. f = a plank that falls; '.' = a hole (jump it); otherwise solid steel
    const plan = '########ffff####ff##.##ffffff####.#ffff###ff#####fffff##.##ffff####ff###ffffff#####.##ff####fffffff######ffff###ff####';
    const n = Math.round((x1 - x0) / 2), planks = [];
    for (let k = 0; k < n; k++) {
      const c = plan[k % plan.length], xa = x0 + k * 2, xb = xa + 2;
      if (c === '#') { mb.box(xa, DECK - 0.4, z - W, xb, DECK, z + W, shadeC(k % 2 ? rust : C('#9a5a34'), 0.9 + R(k, 41) * 0.15)); continue; }
      if (c === 'f') planks.push({ x0: xa + 0.05, x1: xb - 0.05, z0: z - W + 0.3, z1: z + W - 0.3, y: DECK, dy: 0, vy: 0, st: 0, t: 0, rot: (R(k, 42) - 0.5) * 0.08 });
    }
    // two side girders, broken in a few places, with rails on the solid parts
    for (const sd of [-1, 1]) for (let k = 0; k < n; k++) { if (R(k, 43 + sd) < 0.12) continue; const xa = x0 + k * 2; mb.box(xa, DECK - 1.6, z + sd * W - (sd > 0 ? 0 : 0.5), xa + 2, DECK + 1.1, z + sd * W + (sd > 0 ? 0.5 : 0), shadeC(rustD, 0.9 + R(k, 44) * 0.2)); }
    // concrete piers down into the sea, and two towers with hanging cables
    for (let x = x0 + 20; x < x1 - 10; x += 40) { mb.box(x - 2, -12, z - W - 1, x + 2, DECK - 0.4, z + W + 1, shadeC(conc, 0.75 + R(x, 45) * 0.1)); }
    for (const tx of [x0 + 30, x1 - 30]) {
      for (const sd of [-1, 1]) mb.box(tx - 1, DECK, z + sd * (W + 0.6) - 0.6, tx + 1, DECK + 26, z + sd * (W + 0.6) + 0.6, rustD);
      mb.box(tx - 1, DECK + 24, z - W - 1.2, tx + 1, DECK + 26, z + W + 1.2, rustD);
      for (const sd of [-1, 1]) for (let q = 0; q < 6; q++) { const ex = tx + (tx < (x0 + x1) / 2 ? 1 : -1) * (16 + q * 14), sag = q === 3 ? 18 : 0; MB.tube(dmb, [[tx, DECK + 25, z + sd * (W + 0.6)], [(tx + ex) / 2, DECK + 14 - sag * 0.5, z + sd * (W + 0.6)], [ex, DECK + 1 + (q === 3 ? -14 : 0), z + sd * (W + 0.6)]], () => 0.08, 3, C('#2a2624')); }
    }
    // warning signs at the ends
    s.signs = [{ p: [x0 - 140, yA + 4, z + W + 2], t: 'The Broken Bridge: some planks fall!' }];
    s.items.push({ id: sp.id + ':mid', type: 'gem', p: [(x0 + x1) / 2, DECK + 0.8, z] });
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s);
    if (game) game.extras = new FallingPlanks(gl, planks, W);
    return s;
  },
  // Rustworks: the way down into the Underground Power Station (a bunker with a dark stairway)
  station(gl, st, T, sp, R) {
    const cx = sp.x + 30, cz = sp.z, y0 = T.h(cx, cz) - 0.3, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), conc = C('#7a7a76'), concD = C('#5a5a56');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 2600, rad: 30 };
    // the bunker: thick walls, a flat roof, an open front with a stairway going down into the dark
    mb.box(cx - 10, y0, cz - 9, cx + 10, y0 + 1, cz - 7, conc); mb.box(cx - 10, y0, cz + 7, cx + 10, y0 + 7, cz + 9, conc); mb.box(cx - 10, y0, cz - 9, cx + 10, y0 + 7, cz - 7, conc);
    mb.box(cx + 8, y0, cz - 9, cx + 10, y0 + 7, cz + 9, conc); mb.box(cx - 10, y0 + 6, cz - 9, cx + 10, y0 + 8, cz + 9, concD);
    mb.box(cx - 10, y0, cz - 9, cx - 8, y0 + 7, cz - 3, conc); mb.box(cx - 10, y0, cz + 3, cx - 8, y0 + 7, cz + 9, conc);
    for (let k = 0; k < 8; k++) dmb.box(cx - 7 + k * 1.6, y0 - k * 0.5, cz - 3, cx - 5.4 + k * 1.6, y0 + 0.2 - k * 0.5, cz + 3, shadeC(concD, 1 - k * 0.08));
    dmb.box(cx + 4, y0 - 4, cz - 3, cx + 7.9, y0 + 5.9, cz + 3, C('#0a0a0c'));
    // yellow and black stripes over the door, and a glowing sign
    for (let k = 0; k < 8; k++) dmb.box(cx - 10.05, y0 + 5 + 0, cz - 3 + k * 0.75, cx - 10, y0 + 6, cz - 2.25 + k * 0.75, C(k % 2 ? '#1a1a1a' : '#f0c020'), false);
    dmb.box(cx - 10.1, y0 + 6.2, cz - 2.5, cx - 10.05, y0 + 7.6, cz + 2.5, glowC(C('#7af0ff')), false);
    // a big rusty pipe going into the ground and a dead power pylon
    MB.tube(dmb, [[cx + 4, y0 + 7.5, cz + 12], [cx + 4, y0 + 2, cz + 16], [cx + 4, y0 - 3, cz + 18]], () => 1.2, 10, C('#7a5a44'));
    pylon(dmb, cx + 26, y0, cz - 14, 1.3);
    s.triggers.push({ p: [cx + 5, y0 - 1.5, cz], r: 3.2, cave: 'powerstation', make: () => new PowerStation([cx, -420, cz], [cx + 5, y0, cz]) });
    s.lights.push({ p: [cx - 11, y0 + 6, cz], r: 10, c: [0.4, 0.9, 1] });
    s.signs = [{ p: [cx - 12, y0 + 9, cz], t: 'Underground Power Station' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Tidewild: a turtle as big as an island, asleep in the shallows, with a little garden growing on its shell
  turtle(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = Math.max(T.h(cx, cz), 0) - 1, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h);
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3200, rad: 50 };
    const prof = [[34, y0 + 1], [32, y0 + 5], [28, y0 + 9], [22, y0 + 13], [15, y0 + 16], [7, y0 + 17.6], [0.1, y0 + 18]];
    ringSurf(mb, cx, cz, prof, 40, (i, k) => { const plate = (Math.floor(k / 5) + i) % 2; return smoothC(shadeC(C(plate ? '#6a7a3a' : '#5a6a30'), 0.9 + R(k, i) * 0.1)); });
    mb.push([cx, y0, cz]); mb.lathe([[35, 0], [34.5, 1.4], [34, 1]], 40, C('#c8b878'), 0); mb.pop();
    // head, flippers and tail
    const head = [cx + 40, y0 + 3, cz]; mb.ico(head[0], head[1], head[2], [8, 5.5, 6.5], 1, () => smoothC(C('#7a8a5a')));
    for (const sd of [-1, 1]) { dmb.sph([head[0] + 4, head[1] + 1.5, cz + sd * 3.6], 0.9, 8, C('#1a1a1a'), 0); dmb.ico(cx + 18, y0 + 0.5, cz + sd * 30, [9, 1.6, 5], 1, () => C('#6a7a4a')); dmb.ico(cx - 20, y0 + 0.5, cz + sd * 28, [6, 1.4, 4], 1, () => C('#6a7a4a')); }
    dmb.cone(cx - 38, y0, cz, 3, 8, 6, C('#6a7a4a'));
    // a garden on top: palms, a hut and a relic
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + 0.4, d = 6 + (k % 2) * 4; palm(dmb, cx + Math.cos(a) * d, y0 + 17.4 - d * 0.12, cz + Math.sin(a) * d, 1.1, a); }
    const H = bh(dmb); dmb.push([cx - 3, y0 + 17.6, cz + 2]); H.box(-2, 0, -2, 2, 2.4, 2, '#a8784c'); dmb.cone(0, 2.4, 0, 3, 2, 4, C('#c8a860')); dmb.pop();
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + 3, y0 + 18.6, cz - 2] });
    s.signs = [{ p: [head[0] + 6, y0 + 10, cz], t: 'The Great Turtle (it is asleep)' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Cinderfall: a black rock shaped like a giant anvil, with a ramp cut into its side and lava glowing in the cracks
  anvil(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), rk = C('#2a2626'), rk2 = C('#3a3434');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3200, rad: 50 };
    mb.box(cx - 16, y0, cz - 12, cx + 16, y0 + 8, cz + 12, rk2); mb.box(cx - 8, y0 + 8, cz - 7, cx + 8, y0 + 22, cz + 7, rk); mb.box(cx - 34, y0 + 22, cz - 10, cx + 24, y0 + 30, cz + 10, rk2);
    mb.quad([cx - 34, y0 + 22, cz - 10], [cx - 34, y0 + 22, cz + 10], [cx - 46, y0 + 26, cz], [cx - 46, y0 + 26, cz], rk);
    // the ramp: from the ground round the base and up the side to the top
    const pts = [[cx + 30, cz + 22, y0], [cx + 30, cz - 22, y0 + 10], [cx - 26, cz - 22, y0 + 26], [cx - 26, cz - 12, y0 + 30]];
    for (let k = 0; k + 1 < pts.length; k++) { const [ax, az, ay] = pts[k], [bx, bz, by] = pts[k + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), nx = -dz / l * 2.5, nz = dx / l * 2.5;
      mb.quad([ax - nx, ay, az - nz], [ax + nx, ay, az + nz], [bx + nx, by, bz + nz], [bx - nx, by, bz - nz], shadeC(rk2, 1.2));
      mb.quad([ax - nx, ay - 0.6, az - nz], [bx - nx, by - 0.6, bz - nz], [bx + nx, by - 0.6, bz + nz], [ax + nx, ay - 0.6, az + nz], rk, true);
      for (let q = 1; q < 8; q++) { const t = q / 8, x = ax + dx * t, z = az + dz * t, y = ay + (by - ay) * t; mb.box(x - 0.6, Math.min(y0, T.h(x, z)) - 1, z - 0.6, x + 0.6, y - 0.6, z + 0.6, rk, true, true); } }
    for (let k = 0; k < 30; k++) { const a = R(k, 51), side = Math.floor(a * 4), u = R(k, 52); const p = side === 0 ? [cx - 16 + u * 32, y0 + 1 + R(k, 53) * 6, cz + 12.05] : side === 1 ? [cx - 34 + u * 58, y0 + 23 + R(k, 53) * 6, cz + 10.05] : side === 2 ? [cx - 8 + u * 16, y0 + 9 + R(k, 53) * 12, cz - 7.05] : [cx - 34 + u * 58, y0 + 23 + R(k, 53) * 6, cz - 10.05];
      dmb.box(p[0] - 0.08, p[1] - 1.2, p[2] - 0.04, p[0] + 0.08, p[1] + 1.2, p[2] + 0.04, glowC(C('#ff6a1a')), false, true); }
    s.lights.push({ p: [cx, y0 + 12, cz + 14], r: 24, c: [1, 0.45, 0.2] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx - 10, y0 + 30.6, cz] });
    s.signs = [{ p: [cx + 30, y0 + 4, cz + 26], t: 'The Anvil: ramp to the top' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Cinderfall: a throne carved out of black rock on top of a stepped hill, with a lava pool in front
  throne(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.3, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), rk = C('#2e2828'), rk2 = C('#46403c'), gold = C('#c8962a');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3200, rad: 40 };
    for (let k = 0; k < 8; k++) mb.box(cx - 24 + k * 2, y0 + k * 1.5, cz - 22 + k * 2, cx + 24 - k * 2, y0 + (k + 1) * 1.5, cz + 22 - k * 2, shadeC(k % 2 ? rk : rk2, 0.95));
    const yt = y0 + 12; // the throne on the top step
    mb.box(cx - 6, yt, cz - 4, cx + 6, yt + 4, cz + 4, rk2); mb.box(cx - 6, yt, cz + 4, cx + 6, yt + 18, cz + 7, rk);
    for (const sd of [-1, 1]) mb.box(cx + sd * 6 - 1.2, yt, cz - 4, cx + sd * 6 + 1.2, yt + 7, cz + 4, rk);
    for (let k = 0; k < 5; k++) dmb.cone(cx - 5 + k * 2.5, yt + 18, cz + 5.5, 0.9, 4 + (k % 2) * 3, 5, rk);
    for (const sd of [-1, 1]) dmb.sph([cx + sd * 6, yt + 7.4, cz], 0.9, 8, glowC(C('#ff7a2a')), 0);
    dmb.box(cx - 6.2, yt + 17.6, cz + 3.9, cx + 6.2, yt + 18.2, cz + 7.1, gold);
    dmb.box(cx - 10, y0 + 0.2, cz - 34, cx + 10, y0 + 0.4, cz - 24, glowC(C('#ff6a1a')), false, true);
    s.lights.push({ p: [cx, y0 + 3, cz - 29], r: 26, c: [1, 0.45, 0.15] }, { p: [cx, yt + 9, cz - 4], r: 14, c: [1, 0.6, 0.3] });
    s.items.push({ id: sp.id + ':seat', type: 'relic', p: [cx, yt + 4.6, cz] });
    s.signs = [{ p: [cx, y0 + 5, cz - 26], t: 'Ember Throne' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Ashveil: the biggest tree that ever burned. A path winds up its black trunk to a lookout in the broken top.
  burnttree(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, TOP = 56, R0 = 7, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h), bark = C('#1e1a18');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3400, rad: 60 };
    mb.push([cx, y0, cz]); mb.lathe([[R0 * 2.2, 0], [R0 * 1.3, 3], [R0, 10], [R0 * 0.95, TOP], [R0 * 0.7, TOP + 8], [R0 * 0.3, TOP + 12], [0, TOP + 12.5]], 30, (t, ph) => shadeC(bark, 0.8 + Math.abs(Math.sin(ph * 11 + t * 5)) * 0.35), 0); mb.pop();
    for (let k = 0; k < 6; k++) { const a = k * 1.1 + 0.3, h = 24 + k * 6, L = 24 - k * 2.5; tubeC(mb, [cx + Math.cos(a) * R0 * 0.8, y0 + h, cz + Math.sin(a) * R0 * 0.8], [cx + Math.cos(a) * (R0 + L), y0 + h + L * 0.6, cz + Math.sin(a) * (R0 + L)], 1.8 - k * 0.15, 6, bark); }
    for (let k = 0; k < 6; k++) { const a = k * 1.05; dmb.push([cx + Math.cos(a) * (R0 + 2), y0, cz + Math.sin(a) * (R0 + 2)], M4.mul3(M4.rotY(-a), M4.rotZ(-1.2))); dmb.lathe([[2.2, 0], [1.2, 5], [0, 9]], 6, bark, 0); dmb.pop(); }
    const yt = spiralPath(mb, dmb, cx, cz, y0, TOP, R0 + 0.1, 3.6, C('#5a4a3e'), C('#3a2e26'), R, 3);
    ringSurf(mb, cx, cz, [[0.1, yt], [R0 + 3.7, yt]], 20, () => C('#4a3e34'));
    for (let k = 0; k < 40; k++) { const a = R(k, 61) * 6.283, yy = y0 + 2 + R(k, 62) * (TOP - 4); dmb.sph([cx + Math.cos(a) * (R0 * 0.98), yy, cz + Math.sin(a) * (R0 * 0.98)], 0.35, 4, glowC(C(k % 3 ? '#ff6a1a' : '#ffb84a')), 0); }
    col.cyl(cx, y0 - 1, cz, R0 + 0.1, R0 + 0.1, TOP + 1, 18, bark);
    s.lights.push({ p: [cx, y0 + 20, cz], r: 26, c: [1, 0.45, 0.2] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + R0 + 1.5, yt + 0.6, cz] });
    s.signs = [{ p: [cx + R0 + 6, y0 + 4, cz], t: 'The Burnt Tree' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
  // Glacier Sea: a whale frozen inside a huge block of clear ice. Ice steps lead to the top.
  whale(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), ice = [0.72, 0.88, 0.98, 0.35];
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3200, rad: 50 };
    // the whale (drawn first, inside the ice)
    dmb.ico(cx, y0 + 10, cz, [26, 8, 9], 2, (nx, ny) => smoothC(ny < -0.2 ? C('#d8dce4') : C('#3a4a62')));
    dmb.ico(cx + 20, y0 + 11, cz, [9, 6.5, 7.5], 1, (nx, ny) => smoothC(ny < -0.3 ? C('#d8dce4') : C('#3a4a62')));
    for (const sd of [-1, 1]) { dmb.sph([cx + 24, y0 + 12, cz + sd * 6.8], 0.8, 6, C('#0a0a10'), 0); dmb.ico(cx + 6, y0 + 5, cz + sd * 9, [6, 1.2, 3], 1, () => C('#34445a')); dmb.ico(cx - 30, y0 + 11, cz + sd * 6, [5, 1, 4.5], 1, () => C('#34445a')); }
    // the ice block: see-through, and solid to roll on
    const icem = new MeshBuilder().collect(); icem.box(cx - 36, y0, cz - 14, cx + 32, y0 + 22, cz + 14, ice);
    for (let k = 0; k < 11; k++) mb.box(cx + 34 + k * 2.2, y0, cz - 4, cx + 36.2 + k * 2.2, y0 + 22 - k * 2, cz + 4, [0.8, 0.92, 1, 1]);
    for (let k = 0; k < 18; k++) { const x = cx - 34 + R(k, 71) * 64, z = cz + (R(k, 72) < 0.5 ? -14 : 14); dmb.box(x - 0.05, y0 + R(k, 73) * 18, z - 0.06, x + 0.05, y0 + 4 + R(k, 73) * 18, z + 0.06, [0.95, 1, 1, 1], false, true); }
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx, y0 + 22.6, cz] });
    s.signs = [{ p: [cx + 40, y0 + 25, cz + 6], t: 'The Frozen Whale' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); s.clear = icem.build(gl); st.grid.add(mb.tris, s); st.grid.add(icem.tris, s); return s;
  },
  // Aurora Shelf: a tower of glowing crystal with a path of light spiralling up it
  spire(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, TOP = 50, R0 = 6, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h);
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3600, rad: 40 };
    mb.cyl(cx, y0 - 1, cz, R0 * 1.15, R0, TOP + 1.5, 6, smoothC(C('#9ad8f0')));
    const yt = spiralPath(mb, dmb, cx, cz, y0, TOP, R0 + 0.1, 3.4, C('#c8e8ff'), glowC(C('#7affc0')), R, 3);
    ringSurf(mb, cx, cz, [[0.1, yt], [R0 + 3.5, yt]], 6, () => smoothC(C('#bfe6ff')));
    crystalShard(dmb, [cx, yt, cz], [0, 1, 0], 26, 4, C('#9ff0ff'));
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; crystalShard(dmb, [cx + Math.cos(a) * (R0 + 6), y0, cz + Math.sin(a) * (R0 + 6)], [Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4], 10 + (k % 3) * 5, 1.8, C(k % 2 ? '#7affc0' : '#ff9ad8')); }
    col.cyl(cx, y0 - 1, cz, R0 + 0.1, R0 + 0.1, TOP + 1, 12, C('#ffffff'));
    s.lights.push({ p: [cx, yt + 10, cz], r: 50, c: [0.5, 1, 0.9] }, { p: [cx, y0 + 6, cz], r: 26, c: [0.9, 0.6, 1] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + R0 + 1.5, yt + 0.6, cz] });
    s.signs = [{ p: [cx + R0 + 6, y0 + 4, cz], t: 'The Crystal Spire' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
  // Neon Stacks: a giant dead radio mast. Stairs go round its concrete core up to the dish platform.
  antenna(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, TOP = 48, R0 = 4.5, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h), steel = C('#6a6e76'), rust = C('#8a5a44');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 4000, rad: 40 };
    mb.cyl(cx, y0 - 1, cz, R0, R0, TOP + 1.5, 12, C('#7a7a7a'));
    const yt = spiralPath(mb, dmb, cx, cz, y0, TOP, R0 + 0.1, 3.4, C('#5a5e66'), C('#3a3e46'), R, 3);
    ringSurf(mb, cx, cz, [[0.1, yt], [R0 + 3.5, yt], [R0 + 9, yt]], 16, (i, k) => shadeC(steel, 0.9 + (k % 2) * 0.08));
    // the lattice mast above the platform, with red lights and a tilted dish
    const legs = [[-2, -2], [2, -2], [2, 2], [-2, 2]];
    for (const [lx, lz] of legs) tubeC(dmb, [cx + lx, yt, cz + lz], [cx + lx * 0.2, yt + 44, cz + lz * 0.2], 0.25, 4, rust);
    for (let k = 1; k < 10; k++) { const f = k / 10, w = 2 * (1 - f * 0.8), yy = yt + 44 * f; for (let q = 0; q < 4; q++) { const [ax, az] = legs[q], [bx, bz] = legs[(q + 1) % 4]; tubeC(dmb, [cx + ax / 2 * w, yy, cz + az / 2 * w], [cx + bx / 2 * w, yy + 4.4, cz + bz / 2 * w], 0.1, 3, rust); } }
    for (let k = 0; k < 4; k++) dmb.sph([cx, yt + 12 + k * 10, cz], 0.5, 6, glowC(C('#ff3a3a')), 0);
    dmb.push([cx + 6, yt + 6, cz], M4.mul3(M4.rotY(0.6), M4.rotZ(-0.9))); dmb.lathe([[0, 0], [3, 0.6], [5.5, 2.2], [6, 2.6]], 16, steel, 0); dmb.cyl(0, 0, 0, 0.2, 0.2, 4, 5, rust); dmb.pop();
    tubeC(mb, [cx + 6, yt, cz], [cx + 6, yt + 5, cz], 0.6, 6, steel);
    col.cyl(cx, y0 - 1, cz, R0 + 0.1, R0 + 0.1, TOP + 1, 12, steel);
    s.lights.push({ p: [cx, yt + 40, cz], r: 30, c: [1, 0.2, 0.2] }, { p: [cx, y0 + 5, cz], r: 18, c: [0.9, 0.4, 1] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx - R0 - 4, yt + 0.6, cz] });
    s.signs = [{ p: [cx + R0 + 6, y0 + 4, cz], t: 'The Dead Antenna' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
  // Whisperwood: an oak so old it is hollow. A path of shelf fungus winds up the trunk to a lookout in the leaves.
  hollowoak(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, TOP = 46, R0 = 8, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h), bark = C('#5a4230');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3600, rad: 70 };
    mb.push([cx, y0, cz]); mb.lathe([[R0 * 2.1, 0], [R0 * 1.35, 3], [R0 * 1.05, 10], [R0, TOP], [R0 * 1.15, TOP + 4], [0.1, TOP + 4.2]], 30, (t, ph) => shadeC(bark, 0.78 + Math.abs(Math.sin(ph * 13 + t * 7)) * 0.32), 0); mb.pop();
    for (let k = 0; k < 7; k++) { const a = k * 0.9; dmb.push([cx + Math.cos(a) * (R0 + 1), y0, cz + Math.sin(a) * (R0 + 1)], M4.mul3(M4.rotY(-a), M4.rotZ(-1.25))); dmb.lathe([[2.4, 0], [1.4, 6], [0, 11]], 6, shadeC(bark, 0.9), 0); dmb.pop(); }
    // the hollow: a dark doorway with a glowing lantern inside
    dmb.push([cx + R0 + 0.2, y0, cz], M4.rotY(0)); dmb.box(-0.4, 0, -2.4, 0.3, 5.2, 2.4, C('#140e0a'), false, true); dmb.pop(); dmb.sph([cx + R0 - 0.6, y0 + 2.2, cz], 0.5, 8, glowC(C('#ffd27a')), 0);
    const yt = spiralPath(mb, dmb, cx, cz, y0, TOP, R0 + 0.1, 3.8, C('#c8a060'), C('#8a6a40'), R, 3);
    ringSurf(mb, cx, cz, [[0.1, yt], [R0 + 3.9, yt]], 24, () => C('#7a5a3a'));
    // big branches and a crown of leaves, left open above the lookout
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.4, L = 20 + (k % 3) * 4, a0 = [cx + Math.cos(a) * R0 * 0.7, y0 + TOP - 6 - (k % 2) * 6, cz + Math.sin(a) * R0 * 0.7], a1 = [cx + Math.cos(a) * (R0 + L), y0 + TOP + 8 + (k % 3) * 3, cz + Math.sin(a) * (R0 + L)];
      tubeC(dmb, a0, a1, 1.6, 6, bark);
      for (let q = 0; q < 4; q++) { const f = 0.5 + q * 0.18, p = [a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f + 3, a0[2] + (a1[2] - a0[2]) * f]; dmb.ico(p[0], p[1], p[2], [7 + R(k, q) * 3, 5 + R(q, k) * 2, 7 + R(k + 3, q) * 3], 1, (nx, ny) => shadeC(C(ny > 0.3 ? '#5a9a3a' : ny > -0.3 ? '#4a8a34' : '#3a6a2a'), 0.9 + R(k, q + 5) * 0.15)); } }
    for (let k = 0; k < 24; k++) { const a = R(k, 81) * 6.283, d = 16 + R(k, 82) * 20; dmb.sph([cx + Math.cos(a) * d, y0 + TOP + 3 + R(k, 83) * 8, cz + Math.sin(a) * d], 0.25, 4, glowC(C('#ffe88a')), 0); }
    col.cyl(cx, y0 - 1, cz, R0 + 0.1, R0 + 0.1, TOP + 1, 20, bark);
    s.lights.push({ p: [cx + R0 + 2, y0 + 3, cz], r: 10, c: [1, 0.8, 0.4] }, { p: [cx, yt + 8, cz], r: 30, c: [0.9, 1, 0.7] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + R0 + 1.5, yt + 0.6, cz] });
    s.signs = [{ p: [cx + R0 + 7, y0 + 4, cz + 4], t: 'The Hollow Oak: climb to the lookout' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
  // Coral Reach: a huge arch of living coral. Roll up one side, over the top and down the other.
  coralarch(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.3, L = 46, H = 24, Wd = 3.2, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), cols = ['#ff7a6a', '#ff9a5a', '#ff8ac8', '#ffb05a'];
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3400, rad: 60 };
    const N = 40, P = k => { const t = k / N, x = cx - L + t * 2 * L; return [x, y0 + H * Math.sin(Math.PI * t), cz]; };
    for (let k = 0; k < N; k++) { const a = P(k), b = P(k + 1), c = smoothC(shadeC(C(cols[k % 4]), 0.92 + R(k, 1) * 0.12));
      mb.quad([a[0], a[1], cz - Wd], [a[0], a[1], cz + Wd], [b[0], b[1], cz + Wd], [b[0], b[1], cz - Wd], c);
      // the body of the arch under the path
      dmb.quad([a[0], a[1], cz + Wd], [a[0], a[1] - 5, cz + Wd], [b[0], b[1] - 5, cz + Wd], [b[0], b[1], cz + Wd], shadeC(c, 0.85));
      dmb.quad([b[0], b[1], cz - Wd], [b[0], b[1] - 5, cz - Wd], [a[0], a[1] - 5, cz - Wd], [a[0], a[1], cz - Wd], shadeC(c, 0.85));
      dmb.quad([a[0], a[1] - 5, cz - Wd], [b[0], b[1] - 5, cz - Wd], [b[0], b[1] - 5, cz + Wd], [a[0], a[1] - 5, cz + Wd], shadeC(c, 0.7));
      // coral growing on it
      if (k % 2 === 0) { const sd = k % 4 ? 1 : -1; crystals(dmb, a[0], a[1] - 2.5, cz + sd * (Wd + 0.3), 1.4, cols[(k + 1) % 4]); }
      if (k % 3 === 0) dmb.sph([a[0], a[1] - 1.5, cz + (k % 2 ? 1 : -1) * (Wd + 0.4)], 0.5, 6, glowC(C('#9ff0ff')), 0); }
    // big coral feet
    for (const sd of [-1, 1]) { const fx = cx + sd * (L - 4); dmb.ico(fx, y0 + 2, cz, [9, 5, 8], 1, (nx, ny) => smoothC(shadeC(C('#e8907a'), 0.85 + ny * 0.15))); crystals(dmb, fx + sd * 4, y0 + 2, cz + 5, 2.4, '#ff8ac8'); crystals(dmb, fx - sd * 3, y0 + 2, cz - 5, 2, '#ffb05a'); }
    s.lights.push({ p: [cx, y0 + H - 4, cz], r: 26, c: [1, 0.7, 0.8] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx, y0 + H + 0.8, cz] });
    s.signs = [{ p: [cx - L - 6, y0 + 4, cz + 6], t: 'The Coral Arch: roll over the top!' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Sunspray Isles: a crab as big as a house, turned to stone on the beach. A sand ramp goes up its back.
  crab(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = Math.max(T.h(cx, cz), 0) - 0.5, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), shell = C('#d8623a'), dark = C('#a8442a');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3200, rad: 50 };
    mb.ico(cx, y0 + 8, cz, [22, 9, 16], 2, (nx, ny, nz) => smoothC(shadeC(ny > 0.2 ? shell : dark, 0.9 + Math.abs(nx) * 0.1)), false, m => m[1] > -0.35);
    for (const sd of [-1, 1]) {
      for (let k = 0; k < 4; k++) { const ax = cx - 12 + k * 7, base = [ax, y0 + 6, cz + sd * 13], knee = [ax - 2 + k, y0 + 12, cz + sd * 22], foot = [ax - 3 + k * 1.5, y0, cz + sd * 28]; tubeC(dmb, base, knee, 1.5, 6, dark); tubeC(dmb, knee, foot, 1.2, 6, dark); }
      const arm = [cx + 18, y0 + 6, cz + sd * 10], cl = [cx + 32, y0 + 6, cz + sd * 16]; tubeC(dmb, arm, cl, 2.2, 8, shell);
      dmb.ico(cl[0] + 4, cl[1], cl[2], [7, 4.5, 4], 1, () => smoothC(shell)); dmb.ico(cl[0] + 9, cl[1] + 3, cl[2] - sd * 1.5, [4, 1.6, 2], 1, () => smoothC(dark));
      tubeC(dmb, [cx + 18, y0 + 14, cz + sd * 4], [cx + 20, y0 + 20, cz + sd * 5], 0.5, 5, dark); dmb.sph([cx + 20, y0 + 20.6, cz + sd * 5], 1.2, 8, C('#141010'), 0); dmb.sph([cx + 20.6, y0 + 21, cz + sd * 5.3], 0.35, 6, C('#ffffff'), 0);
    }
    // the sand ramp up the back
    const r0 = [cx - 46, y0], r1 = [cx - 16, y0 + 15];
    mb.quad([r0[0], r0[1], cz - 3], [r0[0], r0[1], cz + 3], [r1[0], r1[1], cz + 3], [r1[0], r1[1], cz - 3], C('#eadcb0'));
    for (const sd of [-1, 1]) mb.quad([r0[0], r0[1] - 2, cz + sd * 3], [r1[0], r1[1] - 2, cz + sd * 3], [r1[0], r1[1], cz + sd * 3], [r0[0], r0[1], cz + sd * 3], C('#d8c898'), sd > 0);
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx, y0 + 17.6, cz] });
    s.signs = [{ p: [cx - 50, y0 + 4, cz + 5], t: 'The Giant Crab: up the ramp!' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Magma Deep: an old stone bridge over a lake of lava
  firebridge(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.3, L = 50, H = 12, Wd = 3, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), stone = C('#5a504a'), stone2 = C('#4a423e');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3400, rad: 60 };
    // the lava lake (a glowing pool you really don't want to roll into)
    for (let k = 0; k < 36; k++) { const a0 = k / 36 * 6.283, a1 = (k + 1) / 36 * 6.283, rr = q => 36 + Math.sin(q * 3) * 4; dmb.tri([cx, y0 + 0.5, cz], [cx + Math.cos(a1) * rr(a1), y0 + 0.5, cz + Math.sin(a1) * rr(a1)], [cx + Math.cos(a0) * rr(a0), y0 + 0.5, cz + Math.sin(a0) * rr(a0)], glowC(C(k % 2 ? '#ff6a1a' : '#ff8a2a'))); }
    for (let k = 0; k < 30; k++) { const a = R(k, 91) * 6.283, d = R(k, 92) * 30; dmb.sph([cx + Math.cos(a) * d, y0 + 0.6, cz + Math.sin(a) * d], [1.2 + R(k, 93), 0.3, 1 + R(k, 94)], 6, glowC(C('#ffd04a')), 0); }
    s.triggers.push({ p: [cx, y0 + 0.5, cz], r: 33, h: 1.2, kill: true, back: [cx - L - 4, y0 + 3, cz], msg: 'Too hot! Stay on the bridge.' });
    const N = 30, P = k => { const t = k / N; return [cx - L + t * 2 * L, y0 + 2 + H * Math.sin(Math.PI * t)]; };
    for (let k = 0; k < N; k++) { const [ax, ay] = P(k), [bx, by] = P(k + 1), c = shadeC(k % 2 ? stone : stone2, 0.95 + R(k, 2) * 0.1);
      mb.quad([ax, ay, cz - Wd], [ax, ay, cz + Wd], [bx, by, cz + Wd], [bx, by, cz - Wd], c);
      for (const sd of [-1, 1]) { mb.box(Math.min(ax, bx), Math.min(ay, by), cz + sd * Wd - 0.4, Math.max(ax, bx), Math.max(ay, by) + 1.1, cz + sd * Wd + 0.4, shadeC(stone2, 0.9)); dmb.quad([ax, ay, cz + sd * Wd], [bx, by, cz + sd * Wd], [bx, by - 3, cz + sd * Wd], [ax, ay - 3, cz + sd * Wd], shadeC(stone2, 0.8)); }
      if (k % 6 === 3) for (const sd of [-1, 1]) { dmb.cyl(ax, ay + 1, cz + sd * Wd, 0.25, 0.25, 2.2, 6, C('#3a3230')); dmb.sph([ax, ay + 3.5, cz + sd * Wd], 0.5, 8, glowC(C('#ffb04a')), 0); } }
    for (const t of [0.33, 0.66]) { const x = cx - L + t * 2 * L, y = y0 + 2 + H * Math.sin(Math.PI * t); dmb.cyl(x, y0 - 2, cz, 3.2, 2.6, y - y0 + 1, 8, stone2); }
    s.lights.push({ p: [cx, y0 + 4, cz], r: 44, c: [1, 0.45, 0.15] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx, y0 + H + 2.8, cz] });
    s.signs = [{ p: [cx - L - 5, y0 + 5, cz + 5], t: 'The Fire Bridge: do not fall in' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Obsidian Wastes: a huge blade of black glass standing in the sand, with a path cut round it
  blade(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, TOP = 48, R0 = 6, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h), glass = C('#1e1826');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3600, rad: 40 };
    mb.cyl(cx, y0 - 1, cz, R0 * 1.25, R0, TOP + 1.5, 5, glass);
    const yt = spiralPath(mb, dmb, cx, cz, y0, TOP, R0 + 0.1, 3.4, C('#3a3044'), glowC(C('#9a5aff')), R, 3);
    ringSurf(mb, cx, cz, [[0.1, yt], [R0 + 3.5, yt]], 5, () => C('#2a2232'));
    crystalShard(dmb, [cx, yt, cz], [0.08, 1, 0.04], 34, 4.4, C('#2a2038'));
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + 0.3; crystalShard(dmb, [cx + Math.cos(a) * (R0 + 7 + (k % 3) * 3), y0, cz + Math.sin(a) * (R0 + 7 + (k % 3) * 3)], [Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5], 8 + (k % 4) * 4, 1.6, C(k % 2 ? '#3a2a4a' : '#1a1420')); }
    col.cyl(cx, y0 - 1, cz, R0 + 0.1, R0 + 0.1, TOP + 1, 10, glass);
    s.lights.push({ p: [cx, yt + 12, cz], r: 40, c: [0.7, 0.4, 1] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + R0 + 1.5, yt + 0.6, cz] });
    s.signs = [{ p: [cx + R0 + 7, y0 + 4, cz], t: 'The Obsidian Blade' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
  // Frostpeak Range: a castle of ice with walls, towers, a gate, and a keep you can climb
  icecastle(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, S = 28, WH = 12, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h), ice = C('#bfe0f4'), ice2 = C('#a8d0ec'), deep = C('#7ab0dc');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3600, rad: 60 };
    mb.box(cx - S - 4, y0 - 2, cz - S - 4, cx + S + 4, y0 + 0.6, cz + S + 4, ice2);
    // four walls, with a gate in the front one
    const wall = (x0, z0, x1, z1) => { mb.box(x0, y0, z0, x1, y0 + WH, z1, ice); const along = Math.abs(x1 - x0) > Math.abs(z1 - z0); for (let q = 0; ; q++) { const t = q * 4 + 1; if (t > (along ? x1 - x0 : z1 - z0) - 1) break; along ? dmb.box(x0 + t, y0 + WH, z0, x0 + t + 2, y0 + WH + 1.6, z1, ice2) : dmb.box(x0, y0 + WH, z0 + t, x1, y0 + WH + 1.6, z0 + t + 2, ice2); } };
    wall(cx - S, cz - S, cx + S, cz - S + 2); wall(cx - S, cz + S - 2, cx - 5, cz + S); wall(cx + 5, cz + S - 2, cx + S, cz + S); wall(cx - S, cz - S, cx - S + 2, cz + S); wall(cx + S - 2, cz - S, cx + S, cz + S);
    dmb.box(cx - 5, y0 + 8, cz + S - 2, cx + 5, y0 + WH, cz + S, ice);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const tx = cx + sx * S, tz = cz + sz * S; mb.cyl(tx, y0, tz, 5, 4.6, WH + 8, 10, ice); dmb.cone(tx, y0 + WH + 8, tz, 5.6, 9, 10, deep); dmb.sph([tx + sx * 0.1, y0 + WH + 4, tz + sz * 4.7], [1, 1.6, 0.3], 6, glowC(C('#9ff0ff')), 0); }
    // the keep in the middle, with a path round it to the top
    const R0 = 7, TOP = 34; mb.cyl(cx, y0, cz, R0, R0, TOP + 1, 12, ice);
    const yt = spiralPath(mb, dmb, cx, cz, y0, TOP, R0 + 0.1, 3.4, C('#dceef8'), deep, R, 3);
    ringSurf(mb, cx, cz, [[0.1, yt], [R0 + 3.5, yt]], 12, () => C('#d8ecf8'));
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; dmb.box(cx + Math.cos(a) * (R0 + 2.6) - 0.8, yt, cz + Math.sin(a) * (R0 + 2.6) - 0.8, cx + Math.cos(a) * (R0 + 2.6) + 0.8, yt + 1.6, cz + Math.sin(a) * (R0 + 2.6) + 0.8, ice2); }
    dmb.cone(cx, yt + 1.6, cz, 3, 8, 8, deep); dmb.cyl(cx, yt + 9.4, cz, 0.12, 0.12, 4, 4, C('#dddddd')); dmb.box(cx + 0.1, yt + 12, cz - 0.05, cx + 3, yt + 13.6, cz + 0.05, C('#5a9aff'));
    col.cyl(cx, y0 - 1, cz, R0 + 0.1, R0 + 0.1, TOP + 1, 12, ice);
    s.lights.push({ p: [cx, y0 + 6, cz + S], r: 20, c: [0.6, 0.9, 1] }, { p: [cx, yt + 4, cz], r: 28, c: [0.7, 0.9, 1] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + R0 + 1.5, yt + 0.6, cz] });
    s.signs = [{ p: [cx, y0 + WH + 4, cz + S + 3], t: 'The Ice Castle' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
  // Snowdrift Hollows: a giant snowman with a snowy slide wrapped round him, from his hat to the ground
  snowman(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 1, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), snow = C('#f6fafc');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3400, rad: 40 };
    const balls = [[11, y0 + 10], [8, y0 + 26], [6, y0 + 38]];
    for (const [r, y] of balls) mb.ico(cx, y, cz, r, 2, (nx, ny) => smoothC(shadeC(snow, 0.9 + ny * 0.1)));
    const [hr, hy] = balls[2];
    // face, buttons, scarf, hat, arms
    for (const sd of [-1, 1]) dmb.sph([cx + hr * 0.85, hy + 1.5, cz + sd * 2.2], 0.7, 8, C('#141414'), 0);
    dmb.push([cx + hr - 0.5, hy, cz], M4.rotZ(-Math.PI / 2)); dmb.cone(0, 0, 0, 0.9, 5, 8, C('#ff8a2a')); dmb.pop();
    for (let k = 0; k < 5; k++) { const a = -0.5 + k * 0.25; dmb.sph([cx + Math.cos(a) * hr * 0.95, hy - 2.2 + Math.sin(a) * 1.5, cz + Math.sin(a) * hr * 0.95 * 0.3], 0.35, 6, C('#141414'), 0); }
    for (let k = 0; k < 3; k++) dmb.sph([cx + balls[1][0] * 0.98, balls[1][1] + 3 - k * 3, cz], 0.9, 8, C('#141414'), 0);
    for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; dmb.box(cx + Math.cos(a) * 6.6 - 1.2, y0 + 32.4, cz + Math.sin(a) * 6.6 - 1.2, cx + Math.cos(a) * 6.6 + 1.2, y0 + 34.4, cz + Math.sin(a) * 6.6 + 1.2, C(k % 2 ? '#d83a3a' : '#f0f0f0')); }
    dmb.box(cx + 4, y0 + 26, cz + 5.5, cx + 6, y0 + 33, cz + 7.5, C('#d83a3a'));
    dmb.cyl(cx, hy + hr - 1, cz, 6.5, 6.5, 0.8, 16, C('#1a1a1a')); dmb.cyl(cx, hy + hr - 0.2, cz, 4.2, 4.2, 6, 16, C('#1a1a1a')); dmb.cyl(cx, hy + hr - 0.2, cz, 4.25, 4.25, 1.2, 16, C('#d83a3a'));
    for (const sd of [-1, 1]) { tubeC(dmb, [cx, balls[1][1] + 2, cz + sd * 7], [cx - 2, balls[1][1] + 10, cz + sd * 16], 0.4, 5, C('#5a3a22')); tubeC(dmb, [cx - 1.2, balls[1][1] + 6.8, cz + sd * 12.6], [cx - 3, balls[1][1] + 9, cz + sd * 12.2], 0.25, 4, C('#5a3a22')); }
    // the slide: round and round from the top of the hat to the ground
    const yt = spiralPath(mb, dmb, cx, cz, y0, 46, 11.6, 3.4, C('#e8f2f8'), C('#bcd8ec'), R, 3);
    ringSurf(mb, cx, cz, [[0.1, yt], [15, yt]], 20, () => C('#eef6fa'));
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx - 12, yt + 0.6, cz] });
    s.signs = [{ p: [cx + 18, y0 + 4, cz + 4], t: 'The Giant Snowman: climb up, slide down!' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Gearfall: three giant gears stacked like steps on an old machine. Stairs lead from one to the next.
  gear(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), iron = C('#7a6a5a'), brass = C('#b8904a'), dark = C('#3a3430');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 3400, rad: 50 };
    const G = [[cx, cz, 22, 14, iron, 24], [cx + 8, cz - 4, 13, 24, brass, 16], [cx + 12, cz - 6, 7, 31, iron, 10]];
    for (const [gx, gz, r, h, c, teeth] of G) {
      mb.cyl(gx, y0 + h - 2.5, gz, r, r, 2.5, 32, c);
      for (let k = 0; k < teeth; k++) { const a = k / teeth * 6.283, ca = Math.cos(a), sa = Math.sin(a); mb.push([gx + ca * (r + 1.2), y0 + h - 2.5, gz + sa * (r + 1.2)], M4.rotY(-a)); mb.box(-1.3, 0, -1.2, 1.3, 2.5, 1.2, shadeC(c, 0.9)); mb.pop(); }
      dmb.cyl(gx, y0 + h, gz, r * 0.3, r * 0.3, 0.3, 16, dark); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; dmb.sph([gx + Math.cos(a) * r * 0.7, y0 + h + 0.1, gz + Math.sin(a) * r * 0.7], [1.2, 0.3, 1.2], 6, dark, 0); }
      dmb.cyl(gx, y0 - 1, gz, r * 0.18, r * 0.18, h - 1.5, 10, dark);
    }
    // stairs: ground to gear 1, gear 1 to gear 2, gear 2 to gear 3
    const stairs = (x, z, ya, yb, dx, dz) => { const n = Math.ceil((yb - ya) / 0.9); for (let k = 0; k < n; k++) { const px = x + dx * k * 1.4, pz = z + dz * k * 1.4, yy = ya + (k + 1) * (yb - ya) / n; mb.box(px - 1.6, ya - 1, pz - 1.6, px + 1.6, yy, pz + 1.6, shadeC(C('#6a6a6a'), 0.9 + (k % 2) * 0.08)); } };
    stairs(cx - 22 - 1.6 - 14 * 1.4, cz, y0, y0 + 14, 1, 0);
    stairs(cx - 2, cz + 4, y0 + 14, y0 + 24, 1, 0);
    stairs(cx + 10, cz - 6 + 13 + 2, y0 + 24, y0 + 31, 0, -1);
    s.lights.push({ p: [cx, y0 + 18, cz], r: 30, c: [1, 0.85, 0.6] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + 12, y0 + 31.6, cz - 6] });
    s.signs = [{ p: [cx - 50, y0 + 4, cz + 4], t: 'The Great Gear: climb the gears' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); return s;
  },
  // Skyport: a tall control tower with a landing pad on top and an old ship still parked there
  skytower(gl, st, T, sp, R) {
    const cx = sp.x, cz = sp.z, y0 = T.h(cx, cz) - 0.5, TOP = 56, R0 = 6, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), col = new MeshBuilder().collect(), C = h => hex(h), wall = C('#c8ccd4'), trim = C('#5a6070');
    const s = { key: sp.id, items: [], lights: [], triggers: [], label: sp.name, x: cx, z: cz, far: 4000, rad: 50 };
    mb.cyl(cx, y0 - 1, cz, R0, R0, TOP + 1.5, 14, wall);
    for (let k = 1; k < 10; k++) dmb.cyl(cx, y0 + k * 5.5, cz, R0 + 0.05, R0 + 0.05, 0.5, 14, glowC(C('#9ff0ff')), false);
    const yt = spiralPath(mb, dmb, cx, cz, y0, TOP, R0 + 0.1, 3.4, C('#8a8e98'), trim, R, 3);
    // the pad: a wide disc with landing lights and a big H
    ringSurf(mb, cx, cz, [[0.1, yt], [R0 + 3.5, yt], [18, yt]], 28, (i, k) => shadeC(C('#4a4e58'), 0.95 + (k % 2) * 0.05));
    for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; dmb.sph([cx + Math.cos(a) * 17.2, yt + 0.15, cz + Math.sin(a) * 17.2], 0.4, 6, glowC(C(k % 2 ? '#ffd27a' : '#7affc0')), 0); }
    dmb.box(cx - 5, yt + 0.05, cz - 4, cx - 3.6, yt + 0.12, cz + 4, C('#f0f0f0')); dmb.box(cx + 3.6, yt + 0.05, cz - 4, cx + 5, yt + 0.12, cz + 4, C('#f0f0f0')); dmb.box(cx - 3.6, yt + 0.05, cz - 0.7, cx + 3.6, yt + 0.12, cz + 0.7, C('#f0f0f0'));
    // a parked ship
    const sx = cx - 9, sz = cz + 6; dmb.ico(sx, yt + 2.2, sz, [5, 1.6, 2.4], 1, (nx, ny) => smoothC(C(ny > 0.3 ? '#dfe4ec' : '#9aa0ac')));
    dmb.ico(sx + 2, yt + 3.2, sz, [1.8, 1, 1.4], 1, () => glowC(C('#7ad8ff'))); dmb.box(sx - 2, yt + 1.8, sz - 6, sx + 1, yt + 2.2, sz + 6, C('#b8bec8')); for (const sd of [-1, 1]) dmb.cyl(sx - 1, yt, sz + sd * 2, 0.15, 0.15, 1.6, 5, trim);
    dmb.sph([sx - 5, yt + 2.2, sz], [0.6, 0.8, 0.8], 8, glowC(C('#ff9a3a')), 0);
    dmb.cyl(cx + 12, yt, cz - 8, 0.2, 0.2, 8, 6, trim); dmb.sph([cx + 12, yt + 8.4, cz - 8], 0.6, 8, glowC(C('#ff3a3a')), 0);
    col.cyl(cx, y0 - 1, cz, R0 + 0.1, R0 + 0.1, TOP + 1, 14, wall);
    s.lights.push({ p: [cx, yt + 4, cz], r: 34, c: [0.6, 0.9, 1] }, { p: [cx, y0 + 5, cz], r: 18, c: [0.6, 0.9, 1] });
    s.items.push({ id: sp.id + ':top', type: 'relic', p: [cx + 9, yt + 0.6, cz + 6] });
    s.signs = [{ p: [cx + R0 + 7, y0 + 4, cz], t: 'Skyport Tower: landing pad at the top' }];
    s.mesh = mb.build(gl); s.deco = dmb.build(gl); st.grid.add(mb.tris, s); st.grid.add(col.tris, s); return s;
  },
};

// the bridge planks that drop: they shake when you roll on them, fall into the sea, then come back a few seconds later
class FallingPlanks {
  constructor(gl, list, W) {
    this.list = list; this.last = 0;
    const mb = new MeshBuilder(); mb.box(-0.95, -0.35, -W + 0.3, 0.95, 0, W - 0.3, hex('#8a6a4a')); for (let k = -1; k <= 1; k++) mb.box(-0.95, -0.36, k * 1.2 - 0.06, 0.95, 0.01, k * 1.2 + 0.06, hex('#5a4030'), false, true);
    mb.box(-0.9, -0.02, -0.4, -0.75, 0.02, 0.4, hex('#3a2a20'), false, true); this.mesh = mb.build(gl);
  }
  collide(b, push) {
    const p = b.p, r = b.r;
    for (const pl of this.list) {
      if (pl.st >= 3) continue; const top = pl.y + pl.dy;
      if (p[0] < pl.x0 - r || p[0] > pl.x1 + r || p[2] < pl.z0 - r || p[2] > pl.z1 + r || p[1] - r > top + 0.1 || p[1] + r < top - 0.4) continue;
      push(b, [Math.max(pl.x0, Math.min(pl.x1, p[0])), Math.max(top - 0.35, Math.min(top, p[1])), Math.max(pl.z0, Math.min(pl.z1, p[2]))]);
      if (pl.st === 0 && p[1] > top) { pl.st = 1; pl.t = 0; }
    }
  }
  draw(G, t) {
    const dt = Math.min(0.1, Math.max(0, t - (this.last || t))); this.last = t;
    for (const pl of this.list) {
      pl.t += dt;
      if (pl.st === 1 && pl.t > 0.55) { pl.st = 2; pl.t = 0; }
      else if (pl.st === 2) { pl.vy -= 26 * dt; pl.dy += pl.vy * dt; if (pl.dy < -40) { pl.st = 3; pl.t = 0; } }
      else if (pl.st === 3 && pl.t > 4) { pl.st = 0; pl.dy = 0; pl.vy = 0; pl.t = 0; }
      if (pl.st >= 3) continue;
      const sh = pl.st === 1 ? Math.sin(pl.t * 60) * 0.05 : 0, tilt = pl.st === 2 ? Math.min(0.6, pl.t * 1.2) : 0;
      G.draw(this.mesh, M4.model([(pl.x0 + pl.x1) / 2 + sh, pl.y + pl.dy, (pl.z0 + pl.z1) / 2], M4.mul3(M4.rotY(pl.rot), M4.rotZ(tilt))));
    }
  }
}

// the Underground Power Station: a big hall under Rustworks, entered from the bunker (it works like a cave)
class PowerStation {
  constructor(o, door) {
    this.o = o; this.key = 'powerstation'; this.ch = [[0, 0, 10]]; this.door = door;
    this.exit = [o[0] - 28, o[1] + 1.2, o[2]];
    this.items = [{ id: 'power:core', type: 'relic', p: [o[0] + 4, o[1] + 9.6, o[2]] }, { id: 'power:a', type: 'crystal', p: [o[0] + 24, o[1] + 6.6, o[2] - 17] }, { id: 'power:b', type: 'gem', p: [o[0] - 12, o[1] + 0.6, o[2] + 16] }];
    this.lights = [[-20, 0], [0, -12], [0, 12], [20, 0]].map(([x, z]) => ({ p: [o[0] + x, o[1] + 12, o[2] + z], r: 22, c: [1, 0.85, 0.55] })).concat([{ p: [o[0] + 4, o[1] + 6, o[2]], r: 18, c: [0.3, 0.9, 1] }]);
    this.grid = new TriGrid();
  }
  floor() { return this.o[1]; }
  ceil() { return this.o[1] + 15.5; }
  open() { return 1; }
  build(gl) {
    const [ox, oy, oz] = this.o, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), conc = C('#6a6a66'), concD = C('#4a4a48'), metal = C('#5a5e66'), rust = C('#7a4a2a');
    const X = 36, Z = 26, H = 16;
    mb.box(ox - X, oy - 1, oz - Z, ox + X, oy, oz + Z, conc);
    for (let i = -X; i < X; i += 6) for (let j = -Z; j < Z; j += 6) dmb.box(ox + i + 0.05, oy + 0.01, oz + j + 0.05, ox + i + 5.95, oy + 0.02, oz + j + 5.95, shadeC(conc, 0.92 + ((i + j) / 6 % 2 ? 0.08 : 0)), false, true);
    mb.box(ox - X - 1, oy, oz - Z - 1, ox + X + 1, oy + H, oz - Z, concD); mb.box(ox - X - 1, oy, oz + Z, ox + X + 1, oy + H, oz + Z + 1, concD);
    mb.box(ox - X - 1, oy, oz - Z, ox - X, oy + H, oz + Z, concD); mb.box(ox + X, oy, oz - Z, ox + X + 1, oy + H, oz + Z, concD);
    mb.box(ox - X, oy + H, oz - Z, ox + X, oy + H + 1, oz + Z, shadeC(concD, 0.8));
    // generators in two rows: big drums with glowing coils
    for (const gz of [-14, 14]) for (let k = 0; k < 4; k++) { const gx = ox - 22 + k * 11, gzz = oz + gz; mb.cyl(gx, oy, gzz, 3.6, 3.6, 6.5, 16, metal); dmb.cyl(gx, oy + 6.5, gzz, 2.6, 2.2, 1.2, 12, C('#3a3e46')); for (let q = 0; q < 3; q++) dmb.cyl(gx, oy + 1.4 + q * 1.8, gzz, 3.66, 3.66, 0.35, 16, glowC(C(k % 2 ? '#7af0ff' : '#ffd27a')), false); }
    // the reactor core in the middle on a raised platform, with ramps up to it
    mb.box(ox - 4, oy, oz - 8, ox + 12, oy + 3, oz + 8, metal);
    mb.quad([ox - 16, oy, oz - 3], [ox - 16, oy, oz + 3], [ox - 4, oy + 3, oz + 3], [ox - 4, oy + 3, oz - 3], C('#6a6e76'));
    mb.cyl(ox + 4, oy + 3, oz, 2.6, 2.6, 6, 16, C('#2a2e36'));
    dmb.cyl(ox + 4, oy + 3.2, oz, 2.0, 2.0, 5.6, 16, glowC(C('#4af0ff')), false);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832; dmb.cyl(ox + 4 + Math.cos(a) * 2.7, oy + 3, oz + Math.sin(a) * 2.7, 0.15, 0.15, 6.2, 5, metal); }
    mb.cyl(ox + 4, oy + 9, oz, 3.2, 3.2, 0.5, 16, metal);
    // a catwalk along one wall with a ramp up, and pipes along the ceiling
    mb.box(ox + 10, oy + 6, oz - Z + 1, ox + X - 1, oy + 6.3, oz - Z + 5, metal); mb.box(ox + 10, oy + 6.3, oz - Z + 5, ox + X - 1, oy + 7.4, oz - Z + 5.2, metal);
    mb.quad([ox - 6, oy, oz - Z + 1], [ox - 6, oy, oz - Z + 5], [ox + 10, oy + 6, oz - Z + 5], [ox + 10, oy + 6, oz - Z + 1], C('#6a6e76'));
    for (let k = 0; k < 4; k++) dmb.cyl(ox - X, oy + H - 2 - k * 0.9, oz - 20 + k * 3, 0.5, 0.5, 0.01, 8, rust); // pipe ends
    for (let k = 0; k < 4; k++) { const pz = oz - 20 + k * 13; dmb.push([ox, oy + H - 1.5 - (k % 2), pz], M4.rotZ(Math.PI / 2)); dmb.cyl(0, -X, 0, 0.55, 0.55, 2 * X, 10, k % 2 ? rust : metal); dmb.pop(); }
    // control desks with glowing screens, hanging lamps, warning stripes on the floor
    for (let k = 0; k < 3; k++) { const dx = ox - 30 + k * 5, dz = oz + Z - 4; mb.box(dx, oy, dz - 1, dx + 3.6, oy + 1.2, dz + 1, metal); dmb.box(dx + 0.3, oy + 1.2, dz + 0.2, dx + 3.3, oy + 2.6, dz + 0.4, glowC(C(k === 1 ? '#7aff9a' : '#7af0ff')), false); }
    for (const l of this.lights.slice(0, 4)) { dmb.cyl(l.p[0], l.p[1], l.p[2], 0.04, 0.04, oy + H - l.p[1], 3, C('#1a1a1a')); dmb.cone(l.p[0], l.p[1] - 0.2, l.p[2], 1.1, 0.9, 10, C('#3a3e46')); dmb.sph([l.p[0], l.p[1] - 0.25, l.p[2]], 0.45, 6, glowC(C('#fff2c0')), 0); }
    for (let k = 0; k < 10; k++) dmb.box(ox - 5 - 0.01, oy + 0.03, oz - 8 + k * 1.6, ox - 4.2, oy + 0.04, oz - 7.2 + k * 1.6, C(k % 2 ? '#1a1a1a' : '#f0c020'), false, true);
    // the way out: a glowing ring by the stairs
    dmb.at(this.exit, M4.rotX(Math.PI / 2)); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; dmb.ico(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0, 0.25, 0, () => glowC(C('#ffc45a'))); } dmb.reset();
    this.mesh = mb.build(gl); this.deco = dmb.build(gl); this.grid.add(mb.tris, this);
  }
  tris(x, z, r, out) { this.grid.near(x, z, r, out); }
}

function buildRegionLandmarks(gl, st, T, region, game) {
  const RT = regionTheme(region), out = [], R = (k, s) => T.N.hash(k, s, 2900), B0 = BIOMES[RT.kinds[Object.keys(RT.kinds)[0]].b];
  // the landing: a ring of slabs in the region's colours, a fire or lamp, a signpost with its name
  {
    const mb = new MeshBuilder().collect(), y = SPAWN_H, H = bh(mb), C = h => hex(h), s = { key: 'landing', items: [], lights: [], triggers: [], label: null, x: 0, z: 0 };
    const slab = mixC(hex(B0.rock || '#8a8a86'), [0.85, 0.82, 0.78, 1], 0.45);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 18; k++) {
      const a0 = k / 18 * 6.2832 + r * 0.17, a1 = (k + 1) / 18 * 6.2832 + r * 0.17 - 0.02, r0 = 6 + r * 5.5, r1 = r0 + 5.2, yy = y + 0.12;
      mb.quad([Math.cos(a1) * r0, yy, Math.sin(a1) * r0], [Math.cos(a1) * r1, yy, Math.sin(a1) * r1], [Math.cos(a0) * r1, yy, Math.sin(a0) * r1], [Math.cos(a0) * r0, yy, Math.sin(a0) * r0], shadeC(slab, 0.9 + R(k, r) * 0.14));
    }
    for (let k = 0; k < 4; k++) { const a = k / 4 * 6.2832 + 0.4; mb.cyl(Math.cos(a) * 3.2, y, Math.sin(a) * 3.2, 0.15, 0.12, 3, 6, C('#3a3c40')); mb.sph([Math.cos(a) * 3.2, y + 3.1, Math.sin(a) * 3.2], 0.35, 6, glowC(C(region === 'lumen' || region === 'stacks' || region === 'aurora' ? '#9ff0ff' : '#ffd27a')), 0); }
    s.lights.push({ p: [0, y + 3, 0], r: 16, c: [1, 0.85, 0.6] });
    H.crate(-4, -8, 0.9, y); H.crate(-3, -8.6, 0.7, y); H.crate(-3.6, -8.2, 0.6, y + 0.9);
    mb.cyl(0, y, 14, 0.14, 0.12, 3.2, 6, C('#7a5432'));
    mb.push([0, y + 2.6, 14], M4.rotY(0.2)); H.box(-1.6, -0.3, -0.06, 1.6, 0.3, 0.06, '#b58556'); mb.pop();
    s.signs = [{ p: [0, y + 4, 14], t: RT.landing }];
    s.mesh = mb.build(gl); st.grid.add(mb.tris, s); out.push(s);
  }
  for (const sp of RT.specials) if (SPECIAL_BUILD[sp.id]) out.push(SPECIAL_BUILD[sp.id](gl, st, T, sp, R, game));
  out.push(...buildLandIsles(gl, st, T, REGIONS[region].theme)); // the landmark islands, with their elevators and cool places
  return out;
}
