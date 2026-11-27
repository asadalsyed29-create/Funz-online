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
