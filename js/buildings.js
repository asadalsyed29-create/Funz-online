// Buildings and ruins, in a clean low-poly style. Everything is built in local space
// (y = 0 is the ground, the front faces +z) and the mesh builder turns it into place.
const BC = {
  stone: '#a9a49a', stoneD: '#86817a', stoneL: '#c9c4b8', moss: '#6f9a4e', wood: '#8a5d38', woodD: '#5e3e24', woodL: '#b58556',
  plaster: '#efe4cc', roofR: '#c2553f', roofB: '#4f6fa8', roofG: '#5f8a4a', thatch: '#c9a35a', glass: '#9fd4ff', door: '#5a3a22',
  sand: '#e2c48a', sandD: '#c49f62', ice: '#cfeaff', snow: '#f4f8fc', gold: '#ffcf4a', metal: '#b8c0cc', metalD: '#6a7280',
};
function bh(mb) {
  const C = h => hex(h);
  const H = {
    box: (x0, y0, z0, x1, y1, z1, c) => mb.bevel(x0, y0, z0, x1, y1, z1, C(c), Math.min(0.08, (x1 - x0) / 6, (y1 - y0) / 6, (z1 - z0) / 6)),
    flatBox: (x0, y0, z0, x1, y1, z1, c) => mb.box(x0, y0, z0, x1, y1, z1, C(c)),
    // a gable roof along x, ridge height rh, with an overhang
    roof(x0, x1, z0, z1, y, rh, c, o = 0.5) {
      const zc = (z0 + z1) / 2, col = C(c), dk = shadeC(col, 0.82);
      mb.quad([x0 - o, y - 0.15, z1 + o], [x1 + o, y - 0.15, z1 + o], [x1 + o, y + rh, zc], [x0 - o, y + rh, zc], col);
      mb.quad([x1 + o, y - 0.15, z0 - o], [x0 - o, y - 0.15, z0 - o], [x0 - o, y + rh, zc], [x1 + o, y + rh, zc], dk);
      mb.quad([x0 - o, y - 0.35, z1 + o], [x0 - o, y - 0.15, z1 + o], [x0 - o, y + rh, zc], [x0 - o, y + rh - 0.2, zc], dk);
      mb.quad([x1 + o, y - 0.15, z1 + o], [x1 + o, y - 0.35, z1 + o], [x1 + o, y + rh - 0.2, zc], [x1 + o, y + rh, zc], dk);
      mb.tri([x0, y, z1], [x0, y + rh, zc], [x0, y, z0], shadeC(C(BC.plaster), 0.9)); mb.tri([x1, y, z0], [x1, y + rh, zc], [x1, y, z1], shadeC(C(BC.plaster), 0.9));
      for (let k = 1; k < 4; k++) { const t = k / 4; mb.box(x0 - o, y - 0.15 + rh * t - 0.03, zc + (z1 + o - zc) * (1 - t) - 0.05, x1 + o, y - 0.15 + rh * t + 0.03, zc + (z1 + o - zc) * (1 - t) + 0.05, shadeC(col, 0.7), true, true); }
    },
    door(x, z, w, h, face = 1) { mb.box(x - w / 2 - 0.12, 0, z - 0.08 * face, x + w / 2 + 0.12, h + 0.12, z + 0.1 * face, C(BC.woodD), true, true); mb.box(x - w / 2, 0, z, x + w / 2, h, z + 0.12 * face, C(BC.door), true, true); mb.ico(x + w * 0.3, h * 0.48, z + 0.16 * face, 0.06, 0, () => C(BC.gold)); },
    window(x, y, z, w, h, face = 1, lit = false) { mb.box(x - w / 2 - 0.1, y - h / 2 - 0.1, z - 0.02 * face, x + w / 2 + 0.1, y + h / 2 + 0.1, z + 0.08 * face, C(BC.woodL), true, true); mb.box(x - w / 2, y - h / 2, z + 0.06 * face, x + w / 2, y + h / 2, z + 0.1 * face, lit ? glowC(C('#ffe7a0')) : C(BC.glass), true, true); mb.box(x - 0.04, y - h / 2, z + 0.1 * face, x + 0.04, y + h / 2, z + 0.12 * face, C(BC.woodL), true, true); },
    lantern(x, y, z) { mb.cyl(x, 0, z, 0.08, 0.06, y, 5, C('#3a3f55')); mb.box(x - 0.18, y, z - 0.18, x + 0.18, y + 0.36, z + 0.18, glowC(C('#ffe08a'))); mb.cyl(x, y + 0.36, z, 0.26, 0, 0.22, 4, C('#3a3f55'), true, 0.785); },
    fence(x0, z0, x1, z1, c = BC.woodL) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.6)); for (let k = 0; k <= n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; mb.box(x - 0.08, -0.2, z - 0.08, x + 0.08, 1.0, z + 0.08, C(c)); } const a = Math.atan2(z1 - z0, x1 - x0); mb.push([(x0 + x1) / 2, 0, (z0 + z1) / 2], M4.rotY(-a)); mb.box(-L / 2, 0.45, -0.04, L / 2, 0.55, 0.04, C(c), true, true); mb.box(-L / 2, 0.8, -0.04, L / 2, 0.9, 0.04, C(c), true, true); mb.pop(); },
    barrel(x, z, y = 0) { mb.cyl(x, y, z, 0.42, 0.45, 0.5, 8, C(BC.woodL)); mb.cyl(x, y + 0.5, z, 0.45, 0.42, 0.5, 8, C(BC.woodL)); for (const yy of [0.15, 0.5, 0.85]) mb.cyl(x, y + yy, z, 0.46, 0.46, 0.06, 8, C(BC.metalD), false); },
    crate(x, z, s = 0.8, y = 0) { mb.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, C('#b08a5a')); mb.box(x - s / 2 - 0.02, y + s * 0.42, z - s / 2 - 0.02, x + s / 2 + 0.02, y + s * 0.58, z + s / 2 + 0.02, C('#8a6a42'), true, true); },
    column(x, z, h, r, c, broken) {
      mb.box(x - r * 1.35, -0.3, z - r * 1.35, x + r * 1.35, 0.35, z + r * 1.35, C(c));
      mb.cyl(x, 0.35, z, r, r * 0.9, h - 0.7, 8, C(c));
      if (!broken) mb.box(x - r * 1.3, h - 0.35, z - r * 1.3, x + r * 1.3, h, z + r * 1.3, C(c));
      else mb.cyl(x, h - 0.35, z, r * 0.9, r * 0.4, 0.5, 8, shadeC(C(c), 0.9), true, 0.4);
    },
    torch(x, z, h = 1.6) { mb.cyl(x, 0, z, 0.07, 0.05, h, 5, C(BC.woodD)); mb.cyl(x, h, z, 0.14, 0.08, 0.18, 6, C(BC.metalD)); mb.ico(x, h + 0.32, z, 0.17, 0, () => glowC(C('#ffb347'))); },
    stairs(x, z, w, steps, rise, run, c) { for (let k = 0; k < steps; k++) mb.box(x - w / 2, -0.4, z - k * run - run, x + w / 2, (k + 1) * rise, z - k * run, C(c)); },
    rocks(x, z, n, c, sc, rnd) { for (let k = 0; k < n; k++) { const a = rnd(k) * 6.28, d = rnd(k + 20) * 2; mb.ico(x + Math.cos(a) * d, 0.1, z + Math.sin(a) * d, [sc * (0.6 + rnd(k + 40) * 0.6), sc * 0.5, sc * (0.6 + rnd(k + 60) * 0.5)], 0, (p, q) => shadeC(C(c), 0.85 + q * 0.2)); } },
  };
  return H;
}

// a cottage: stone base, walls, gable roof, door, windows and a chimney
function cottage(mb, H, x, z, rot, w, d, h, roofC, wallC = BC.plaster) {
  mb.push([x, 0, z], M4.rotY(rot));
  H.box(-w / 2 - 0.15, -0.6, -d / 2 - 0.15, w / 2 + 0.15, 0.55, d / 2 + 0.15, BC.stoneD);
  H.flatBox(-w / 2, 0.5, -d / 2, w / 2, h, d / 2, wallC);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) H.flatBox(sx * w / 2 - 0.18, 0.5, sz * d / 2 - 0.18, sx * w / 2 + 0.18, h, sz * d / 2 + 0.18, BC.woodD); // corner beams
  H.flatBox(-w / 2 - 0.05, h - 0.3, -d / 2 - 0.05, w / 2 + 0.05, h, d / 2 + 0.05, BC.woodD);
  H.roof(-w / 2, w / 2, -d / 2, d / 2, h, d * 0.55, roofC);
  H.door(0, d / 2, 1.1, 2.0);
  H.window(-w / 4 - 0.3, h * 0.6, d / 2, 0.8, 0.8, 1, true); H.window(w / 4 + 0.3, h * 0.6, d / 2, 0.8, 0.8, 1, true);
  H.window(0, h * 0.6, -d / 2, 0.8, 0.8, -1, true);
  H.flatBox(w / 4, h, -d / 4 - 0.4, w / 4 + 0.7, h + d * 0.55 + 0.6, -d / 4 + 0.3, BC.stoneD);
  mb.pop();
}

function buildStructure(mb, p, s, item, L, rnd) {
  const H = bh(mb), C = h => hex(h);
  switch (p.type) {
    case 'ruins': { // an old temple: a stepped platform, broken columns, a gateway and fallen stones
      const c = p.b === 4 ? BC.sand : BC.stone, cd = p.b === 4 ? BC.sandD : BC.stoneD;
      H.box(-8, -1, -8, 8, 0.4, 8, cd); H.box(-6.5, 0.4, -6.5, 6.5, 0.9, 6.5, c);
      H.stairs(0, -8, 4, 2, 0.45, 0.6, c);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.39, x = Math.cos(a) * 5.4, z = Math.sin(a) * 5.4, br = rnd(k) < 0.45; mb.push([0, 0.9, 0]); H.column(x, z, br ? 1.5 + rnd(k + 9) * 2 : 5.2, 0.42, c, br); mb.pop(); }
      mb.push([0, 0.9, 0]); H.box(-5.8, 5.2, -0.6, 5.8, 6.0, 0.6, c); H.box(-6, 6, -0.7, -1, 6.4, 0.7, cd); mb.pop();
      for (let k = 0; k < 2; k++) { mb.push([3 - k * 9, 0.6, 9 + k], M4.mul3(M4.rotY(0.4 + k), M4.rotZ(Math.PI / 2))); mb.cyl(0, -1.2, 0, 0.42, 0.42, 2.4, 8, C(c)); mb.pop(); }
      for (let k = 0; k < 6; k++) { const a = rnd(k + 30) * 6.28, d = 8 + rnd(k + 31) * 3; H.box(Math.cos(a) * d - 0.4, -0.2, Math.sin(a) * d - 0.3, Math.cos(a) * d + 0.4, 0.4, Math.sin(a) * d + 0.3, cd); }
      if (p.b !== 4) for (let k = 0; k < 5; k++) H.flatBox(-6 + k * 2.6, 0.9, 4 + rnd(k) * 2, -5 + k * 2.6, 0.97, 5 + rnd(k) * 2, BC.moss);
      H.torch(-2.4, -6.6); H.torch(2.4, -6.6); s.lights.push({ p: L(0, 2.4, -6.6), r: 9, c: [1, 0.7, 0.35] });
      item('coin', 0, 1.6, 0); item(p.b === 4 ? 'gem' : 'relic', 4, 1.6, 3); break;
    }
    case 'circle': { // standing stones with lintels and a glowing altar
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * 6.283, h = 4.4 + rnd(k) * 1.6;
        mb.push([Math.cos(a) * 11, 0, Math.sin(a) * 11], M4.mul3(M4.rotY(-a), M4.rotZ((rnd(k + 5) - 0.5) * 0.12)));
        mb.cyl(0, -1, 0, 1.0, 0.75, h + 1, 5, shadeC(C(BC.stoneD), 0.9 + rnd(k) * 0.2), true, rnd(k) * 3);
        mb.pop();
        if (k % 2 === 0) { const b = (k + 1) / 10 * 6.283, m = (a + b) / 2; mb.push([Math.cos(m) * 11.2, 4.6 + rnd(k) * 0.5, Math.sin(m) * 11.2], M4.rotY(-m)); H.box(-0.7, 0, -3.6, 0.7, 0.9, 3.6, BC.stoneD); mb.pop(); }
      }
      H.box(-2.2, -0.6, -1.4, 2.2, 0.9, 1.4, BC.stone); H.flatBox(-2.4, 0.9, -1.6, 2.4, 1.15, 1.6, BC.stoneL);
      mb.ico(0, 2.1, 0, [0.5, 0.9, 0.5], 0, () => glowC(C('#9ff0ff')));
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; mb.ico(Math.cos(a) * 7, 0.05, Math.sin(a) * 7, [0.5, 0.15, 0.5], 0, () => C(k % 2 ? BC.stoneL : BC.stone)); }
      s.lights.push({ p: L(0, 2.5, 0), r: 10, c: [0.4, 0.9, 1] }); item('crystal', 0, 3.2, 0); break;
    }
    case 'village': { // cottages around a well, with fences, a garden and lanterns
      const roofs = [BC.roofR, BC.roofB, BC.roofG, BC.roofR];
      for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.4, x = Math.cos(a) * 13, z = Math.sin(a) * 13; cottage(mb, H, x, z, -a - Math.PI / 2, 5.5, 4.4, 3.2, roofs[k]); }
      // the well
      mb.cyl(0, -0.5, 0, 1.6, 1.6, 1.4, 10, C(BC.stone)); mb.cyl(0, 0.85, 0, 1.25, 1.25, 0.06, 10, C('#3f86c8'), true);
      for (const sx of [-1, 1]) H.flatBox(sx * 1.35 - 0.12, 0.9, -0.12, sx * 1.35 + 0.12, 3.1, 0.12, BC.wood);
      mb.push([0, 3.1, 0]); H.roof(-1.8, 1.8, -1.2, 1.2, 0, 1.1, BC.roofR, 0.2); mb.pop();
      mb.cyl(0, 2.2, 0, 0.18, 0.18, 0.4, 6, C(BC.woodL));
      // a little vegetable garden
      for (let r = 0; r < 4; r++) { H.flatBox(5, -0.1, -6 + r * 1.1, 9, 0.18, -5.6 + r * 1.1, '#6a4a2a'); for (let q = 0; q < 5; q++) mb.ico(5.4 + q * 0.8, 0.4, -5.8 + r * 1.1, 0.25, 0, () => C(r % 2 ? '#7bd85a' : '#ff8a3a')); }
      H.fence(4.5, -6.6, 9.5, -6.6); H.fence(9.5, -6.6, 9.5, -1.6); H.fence(4.5, -6.6, 4.5, -1.6);
      for (let k = 0; k < 4; k++) { const a = k * 1.571 + 1.2; H.lantern(Math.cos(a) * 7, 2.4, Math.sin(a) * 7); s.lights.push({ p: L(Math.cos(a) * 7, 2.6, Math.sin(a) * 7), r: 8, c: [1, 0.8, 0.45] }); }
      H.barrel(-3, 4); H.crate(-4, 5); H.crate(-3.7, 5.1, 0.6, 0.8);
      item('coin', 6, 0.6, 0); item('mushroom', -6, 0.6, 3); break;
    }
    case 'tower': { // a stone watchtower with a wooden lookout and a ramp winding up
      mb.cyl(0, -1, 0, 3.1, 2.7, 10.5, 8, C(BC.stone));
      for (let k = 0; k < 5; k++) mb.cyl(0, 1 + k * 2, 0, 3.0 - k * 0.07, 2.95 - k * 0.07, 0.12, 8, C(BC.stoneD), false);
      mb.cyl(0, 9.5, 0, 3.6, 3.6, 0.6, 8, C(BC.woodD));
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; H.flatBox(Math.cos(a) * 3.3 - 0.12, 10.1, Math.sin(a) * 3.3 - 0.12, Math.cos(a) * 3.3 + 0.12, 13, Math.sin(a) * 3.3 + 0.12, BC.wood); }
      mb.cyl(0, 10.8, 0, 3.4, 3.4, 0.15, 8, C(BC.woodL), false);
      mb.cyl(0, 13, 0, 4.4, 0, 3.2, 8, C(BC.roofR), true, 0.39);
      mb.cyl(0, 16.1, 0, 0.06, 0.06, 1.6, 4, C(BC.metalD)); mb.tri([0.06, 17.6, 0], [1.2, 17.3, 0], [0.06, 17.0, 0], C('#ffcf4a'), true); mb.tri([0.06, 17.6, 0], [0.06, 17.0, 0], [1.2, 17.3, 0], C('#e0a83a'), true);
      for (let k = 0; k < 24; k++) {
        const a0 = k / 24 * 6.28 * 1.5, a1 = (k + 1) / 24 * 6.28 * 1.5, y0 = k / 24 * 9.5, y1 = (k + 1) / 24 * 9.5, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
        mb.quad(P(a0, 3.2, y0), P(a0, 6, y0), P(a1, 6, y1), P(a1, 3.2, y1), C(BC.woodL));
        mb.quad(P(a0, 3.2, y0 - 0.3), P(a1, 3.2, y1 - 0.3), P(a1, 6, y1 - 0.3), P(a0, 6, y0 - 0.3), C(BC.woodD));
        mb.quad(P(a0, 6, y0 - 0.3), P(a1, 6, y1 - 0.3), P(a1, 6, y1 + 0.5), P(a0, 6, y0 + 0.5), C(BC.wood));
        if (k % 3 === 0) mb.box(P(a0, 6, 0)[0] - 0.1, y0, P(a0, 6, 0)[2] - 0.1, P(a0, 6, 0)[0] + 0.1, y0 + 1.1, P(a0, 6, 0)[2] + 0.1, C(BC.woodD));
      }
      s.lights.push({ p: L(0, 12, 0), r: 10, c: [1, 0.8, 0.5] }); item('feather', 0, 10.8, 0); break;
    }
    case 'bigtree': { // a giant old tree with a treehouse
      mb.cyl(0, -1, 0, 3.4, 2.4, 19, 9, C('#6b4a2b'));
      for (let k = 0; k < 5; k++) { const a = k * 1.26 + 0.3; mb.push([Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6], M4.mul3(M4.rotY(-a), M4.rotZ(-0.9))); mb.cyl(0, -0.4, 0, 0.9, 0.3, 3.4, 6, C('#5e3e24')); mb.pop(); }
      const leaf = (y) => (q, w) => w > 0.35 ? C('#4fae4a') : w < -0.3 ? C('#2f7a3a') : C('#3f9a4e');
      for (let k = 0; k < 6; k++) { const a = k * 1.05, r = 6 + rnd(k) * 2; mb.ico(Math.cos(a) * 6.5, 20 + rnd(k) * 3, Math.sin(a) * 6.5, [r, r * 0.8, r], 1, leaf()); }
      mb.ico(0, 26, 0, [7.5, 6, 7.5], 1, leaf());
      // treehouse on a platform
      mb.cyl(0, 11, 0, 5, 5, 0.4, 10, C(BC.woodL));
      mb.push([0, 11.4, 0]); H.flatBox(-2, 0, 1.6, 2, 2.6, 4.2, BC.woodL); H.roof(-2, 2, 1.6, 4.2, 2.6, 1.3, BC.roofG, 0.3); H.window(0, 1.5, 4.2, 0.8, 0.7, 1, true); mb.pop();
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; H.flatBox(Math.cos(a) * 4.8 - 0.07, 11.4, Math.sin(a) * 4.8 - 0.07, Math.cos(a) * 4.8 + 0.07, 12.4, Math.sin(a) * 4.8 + 0.07, BC.woodD); }
      // a ramp of planks spiralling up the trunk
      for (let k = 0; k < 22; k++) { const a0 = k / 22 * 6.28 * 1.3, a1 = (k + 1) / 22 * 6.28 * 1.3, y0 = k / 22 * 11, y1 = (k + 1) / 22 * 11, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r]; mb.quad(P(a0, 3, y0), P(a0, 5.4, y0), P(a1, 5.4, y1), P(a1, 3, y1), C(BC.woodL)); mb.quad(P(a0, 3, y0 - 0.25), P(a1, 3, y1 - 0.25), P(a1, 5.4, y1 - 0.25), P(a0, 5.4, y0 - 0.25), C(BC.woodD)); }
      s.lights.push({ p: L(0, 13, 2.5), r: 9, c: [1, 0.8, 0.45] }); item('relic', 0, 12, 0); break;
    }
    case 'cabin': { // a log cabin with a porch, chimney and woodpile
      const w = 7, d = 5.6, h = 3.2;
      H.box(-w / 2 - 0.3, -0.6, -d / 2 - 0.3, w / 2 + 0.3, 0.3, d / 2 + 1.9, BC.stoneD);
      for (let k = 0; k < 8; k++) { const y = 0.3 + k * 0.38 + 0.19; for (const [a, b, rot, len] of [[0, d / 2, 0, w + 0.6], [0, -d / 2, 0, w + 0.6], [w / 2, 0, 1, d + 0.6], [-w / 2, 0, 1, d + 0.6]]) { mb.push([a, y, b], M4.mul3(M4.rotY(rot ? Math.PI / 2 : 0), M4.rotZ(Math.PI / 2))); mb.cyl(0, -len / 2, 0, 0.2, 0.2, len, 6, shadeC(C(BC.wood), 0.92 + (k % 2) * 0.1), true); mb.pop(); } }
      H.roof(-w / 2, w / 2, -d / 2, d / 2, h + 0.3, 2.2, '#7a4a32', 0.7);
      H.door(0, d / 2 + 0.2, 1.1, 2.1); H.window(-2.1, 2, d / 2 + 0.2, 0.9, 0.8, 1, true); H.window(2.1, 2, d / 2 + 0.2, 0.9, 0.8, 1, true);
      for (const x of [-w / 2, w / 2]) H.flatBox(x - 0.12, 0.3, d / 2 + 1.6, x + 0.12, 2.6, d / 2 + 1.84, BC.woodD);
      mb.quad([-w / 2 - 0.3, 2.6, d / 2 + 2.1], [w / 2 + 0.3, 2.6, d / 2 + 2.1], [w / 2 + 0.3, 3.2, d / 2], [-w / 2 - 0.3, 3.2, d / 2], C('#7a4a32'));
      H.flatBox(2, 3, -1.4, 3, 7, -0.4, BC.stoneD); H.flatBox(1.9, 6.8, -1.5, 3.1, 7.1, -0.3, BC.stone);
      for (let k = 0; k < 6; k++) { mb.push([-w / 2 - 1.4, 0.25 + Math.floor(k / 3) * 0.45, -1 + (k % 3) * 0.48], M4.rotZ(Math.PI / 2)); mb.cyl(0, -0.8, 0, 0.22, 0.22, 1.6, 6, C(BC.woodL)); mb.pop(); }
      mb.cyl(3.5, -0.3, 4.8, 0.45, 0.45, 0.8, 7, C(BC.woodL)); s.lights.push({ p: L(0, 2, d / 2 + 1.2), r: 8, c: [1, 0.8, 0.45] });
      item('mushroom', 0, 0.9, 6); break;
    }
    case 'pyramid': { // a stepped pyramid with a doorway, a stair ramp, obelisks and a golden top
      const steps = 9;
      for (let k = 0; k < steps; k++) { const w = 18 - k * 2; H.flatBox(-w, k * 1.6 - 1, -w, w, (k + 1) * 1.6 - 1, w, k % 2 ? BC.sand : '#d8b878'); H.flatBox(-w - 0.05, (k + 1) * 1.6 - 1.15, -w - 0.05, w + 0.05, (k + 1) * 1.6 - 1, w + 0.05, BC.sandD); }
      mb.quad([-2.5, -0.9, 22], [2.5, -0.9, 22], [2.5, steps * 1.6 - 1, 2], [-2.5, steps * 1.6 - 1, 2], C('#c9a060'));
      for (const sx of [-1, 1]) mb.quad([sx * 2.5, -0.9, 22], [sx * 2.5, steps * 1.6 - 1, 2], [sx * 2.5, steps * 1.6 - 0.6, 2], [sx * 2.5, -0.5, 22], C(BC.sandD));
      H.flatBox(-1.6, -1, 17.99, 1.6, 2.6, 18.05, '#2a2016');
      for (const [x, z] of [[-21, 21], [21, 21], [-21, -21], [21, -21]]) { mb.cyl(x, -1, z, 0.9, 0.55, 7, 4, C(BC.sand), true, 0.785); mb.cyl(x, 6, z, 0.55, 0, 1.2, 4, C(BC.gold), true, 0.785); }
      mb.cyl(0, steps * 1.6 - 1, 0, 1.6, 0, 1.6, 4, glowC(C(BC.gold)), true, 0.785);
      for (const sx of [-1, 1]) H.torch(sx * 3.5, 22.5, 1.8);
      s.lights.push({ p: L(0, steps * 1.6 + 1, 0), r: 10, c: [1, 0.8, 0.3] }, { p: L(0, 2, 22.5), r: 8, c: [1, 0.7, 0.3] });
      item('gem', 0, steps * 1.6 + 0.2, -3); item('coin', 10, 0.6, 22); break;
    }
    case 'pod': { // a crashed space pod in a crater, with scattered parts
      mb.cyl(0, -0.8, 0, 6, 4.5, 0.5, 12, C('#5a5048'), true);
      mb.push([0, 1.6, 0], M4.rotZ(0.35)); mb.lathe([[0, -2.4], [1.6, -2.1], [2.6, -1], [2.8, 0.4], [2.2, 1.8], [1.0, 2.6], [0, 2.8]], 12, (t) => t > 0.55 ? glowC(C('#8ff6ff')) : C(BC.metal), 0); mb.pop();
      if (mb.tris) { const cb = new MeshBuilder().collect(); cb._set(mb.A, mb.P); cb.ico(0, 1.6, 0, 2.6, 0, () => [0, 0, 0, 1]); mb.tris.push(...cb.tris); } // a round collision shell for the pod
      for (let k = 0; k < 3; k++) { const a = k * 2.1; mb.push([Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6], M4.rotZ(0.5)); H.flatBox(-0.2, -1, -0.2, 0.2, 2, 0.2, BC.metalD); mb.pop(); }
      for (let k = 0; k < 7; k++) { const a = rnd(k) * 6.28, d = 4 + rnd(k + 9) * 5; mb.push([Math.cos(a) * d, 0, Math.sin(a) * d], M4.rotY(a)); H.flatBox(-0.6, -0.3, -0.3, 0.6, 0.2, 0.3, k % 2 ? BC.metal : BC.metalD); mb.pop(); }
      s.lights.push({ p: L(0, 3.5, 0), r: 8, c: [0.4, 0.9, 1] }); item('relic', 0, 0.6, 4); break;
    }
    case 'igloo': { // an igloo with a tunnel, a snowman and an ice-fishing hole
      mb.ico(0, -0.5, 0, 4, 1, (x, y) => shadeC(C('#eef6ff'), 0.88 + y * 0.12), false, m => m[1] > -0.1);
      for (let k = 1; k < 4; k++) mb.tor([0, -0.5 + k * 1.0, 0], Math.sqrt(16 - (k * 1.0) ** 2) + 0.02, 0.05, 20, 3, C('#c8dcf0'));
      mb.push([0, -0.5, 4.2]); mb.lathe([[1.6, 0], [1.6, 1.2], [1.1, 2.0], [0, 2.2]], 8, C('#e2eefa')); mb.pop();
      H.flatBox(-1.6, -0.5, 3.2, 1.6, 1.6, 5.4, '#e2eefa'); H.flatBox(-0.8, -0.5, 5.39, 0.8, 1.2, 5.42, '#2a3a4a');
      // snowman
      mb.ico(6, 0.5, 2, 0.9, 1, () => C(BC.snow)); mb.ico(6, 1.8, 2, 0.65, 1, () => C(BC.snow)); mb.ico(6, 2.8, 2, 0.45, 1, () => C(BC.snow));
      mb.push([6, 2.8, 2.4], M4.rotX(Math.PI / 2)); mb.cyl(0, 0, 0, 0.08, 0, 0.45, 5, C('#ff8a3a')); mb.pop();
      for (const sx of [-1, 1]) mb.ico(6 + sx * 0.16, 2.95, 2.38, 0.05, 0, () => C('#22262e'));
      mb.cyl(6, 3.15, 2, 0.35, 0.35, 0.08, 8, C('#3a3f55')); mb.cyl(6, 3.2, 2, 0.24, 0.24, 0.45, 8, C('#3a3f55'));
      mb.cyl(-5, -0.45, 3, 1, 1, 0.5, 10, C('#bfe6ff')); mb.cyl(-5, 0.03, 3, 0.7, 0.7, 0.02, 10, C('#2a6aa8'), true);
      item('crystal', 0, 0.6, 7); break;
    }
    case 'frozen': { // a giant ice spire with crystal shards
      mb.cyl(0, -1, 0, 3.2, 2.2, 13, 6, glowC(C(BC.ice)), true, 0.3); mb.cyl(0, 12, 0, 2.2, 0, 5, 6, glowC(C('#e8f6ff')), true, 0.3);
      for (let k = 0; k < 9; k++) { const a = k * 0.7, d = 4 + rnd(k) * 3, h = 2 + rnd(k + 5) * 4; mb.push([Math.cos(a) * d, -0.5, Math.sin(a) * d], M4.mul3(M4.rotY(-a), M4.rotZ(0.3 * (rnd(k + 3) - 0.5)))); mb.cyl(0, 0, 0, 0.7, 0.5, h, 5, C(BC.ice)); mb.cyl(0, h, 0, 0.5, 0, 1.2, 5, C('#e8f6ff')); mb.pop(); }
      s.lights.push({ p: L(0, 6, 0), r: 12, c: [0.5, 0.85, 1] }); item('gem', 4, 0.6, 0); break;
    }
    case 'stilts': { // a swamp hut on stilts with a dock and lanterns
      for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) mb.cyl(x, -2, z, 0.3, 0.25, 4.6, 6, C('#4a3a2a'));
      H.flatBox(-3.6, 2.5, -3.6, 3.6, 2.8, 3.6, BC.wood);
      H.flatBox(-2.8, 2.8, -2.8, 2.8, 5.2, 2.8, '#8a7a52');
      mb.cyl(0, 5.1, 0, 4.4, 2.2, 1.4, 8, C(BC.thatch), true, 0.39); mb.cyl(0, 6.5, 0, 2.2, 0, 1.6, 8, shadeC(C(BC.thatch), 0.92), true, 0.39);
      mb.push([0, 2.8, 0]); H.door(0, 2.8, 1, 1.9); mb.pop();
      mb.quad([-1, 0, 9], [1, 0, 9], [1, 2.8, 3.6], [-1, 2.8, 3.6], C(BC.woodL));
      for (let k = 0; k < 6; k++) H.flatBox(-1.1, 0.05 + k * 0.47, 8.5 - k * 0.9, 1.1, 0.12 + k * 0.47, 8.8 - k * 0.9, BC.woodD);
      H.lantern(3.4, 3.8, 3.4); s.lights.push({ p: L(3.4, 4, 3.4), r: 9, c: [1, 0.8, 0.45] });
      item('mushroom', 0, 3.4, 0); break;
    }
    case 'arch': { // a glowing crystal arch on two rock pillars
      for (const sx of [-1, 1]) mb.ico(sx * 9, 1.2, 0, [2, 2.2, 2], 0, (q, w) => shadeC(C('#6a5a7a'), 0.85 + w * 0.2));
      for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI; mb.ico(Math.cos(a) * 9, 2 + Math.sin(a) * 9, 0, 1.3, 0, () => glowC(C(k % 2 ? '#c08fff' : '#8ff6ff'))); }
      for (let k = 0; k < 8; k++) { const a = rnd(k) * 6.28, d = 3 + rnd(k + 8) * 5; mb.push([Math.cos(a) * d, -0.3, Math.sin(a) * d], M4.rotZ((rnd(k + 2) - 0.5) * 0.6)); mb.cyl(0, 0, 0, 0.35, 0, 1.6 + rnd(k) * 1.5, 5, glowC(C(k % 2 ? '#c08fff' : '#8ff6ff'))); mb.pop(); }
      s.lights.push({ p: L(0, 9, 0), r: 14, c: [0.7, 0.5, 1] }); item('crystal', 0, 0.6, 0); item('gem', 3, 0.6, 2); break;
    }
    case 'shroomring': { // a fairy ring of giant mushrooms with tiny glowing lights
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; giantShroom(mb, Math.cos(a) * 10, 0, Math.sin(a) * 10, 1 + rnd(k) * 0.6, rnd(k + 1)); }
      for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; mb.ico(Math.cos(a) * 6, 0.25, Math.sin(a) * 6, 0.12, 0, () => glowC(C(k % 3 ? '#fff2a8' : '#ff9ad8'))); }
      mb.cyl(0, -0.3, 0, 1.2, 1.4, 0.7, 8, C('#6a5a7a'));
      item('mushroom', 0, 0.6, 0); item('crystal', 2, 0.6, 1); break;
    }
    case 'wreck': { // a shipwreck on the sand: hull planks, a broken mast, a torn sail and barrels
      mb.push([0, 0, 0], M4.rotZ(0.22));
      const hull = (k, s2) => { const y = 0.2 + k * 0.62, half = 2.6 + k * 0.32; mb.quad([-8 + k * 0.4, y, s2 * half], [8.5 - k * 0.2, y, s2 * half], [8.5 - k * 0.2, y + 0.6, s2 * (half + 0.3)], [-8 + k * 0.4, y + 0.6, s2 * (half + 0.3)], shadeC(C(BC.wood), 0.85 + (k % 2) * 0.12)); };
      for (let k = 0; k < 6; k++) { mb.push([0, 0, 0]); hull(k, 1); mb.pop(); mb.push([0, 0, 0], M4.rotY(Math.PI)); hull(k, 1); mb.pop(); }
      H.flatBox(-7, -0.5, -2.6, 8, 0.4, 2.6, BC.woodD);
      mb.cyl(0, 0, 0, 0.32, 0.26, 6.5, 7, C(BC.woodD));
      mb.push([0, 6.4, 0], M4.rotZ(-0.9)); mb.cyl(0, 0, 0, 0.26, 0.2, 3.5, 7, C(BC.woodD)); mb.pop();
      mb.tri2([0.3, 2.2, 0], [0.3, 6, 0], [3.4, 3.4, 0.4], C('#e8e0cc')); mb.tri2([0.3, 2.2, 0], [3.4, 3.4, 0.4], [2.8, 1.8, 0.3], C('#d8d0bc'));
      mb.pop();
      H.barrel(4, 5); H.barrel(5.2, 4.4); mb.push([3.4, 0.4, 6], M4.rotZ(Math.PI / 2)); H.barrel(0, 0); mb.pop();
      H.crate(-5, 5); mb.ico(-2, 0.1, 6, [1, 0.4, 0.8], 0, () => C('#d8c48f'));
      item('shell', 4, 0.6, 7); item('coin', -3, 1, 0); break;
    }
    case 'lighthouse': { // a striped lighthouse with a balcony, a lamp room and a keeper's house
      H.box(-4, -0.8, -4, 4, 0.4, 4, BC.stoneD);
      for (let k = 0; k < 6; k++) mb.cyl(0, 0.4 + k * 2.8, 0, 3 - k * 0.25, 2.75 - k * 0.25, 2.8, 10, k % 2 ? C('#eef3fb') : C('#d0503c'));
      mb.cyl(0, 17.2, 0, 2.6, 2.6, 0.35, 10, C('#3a3f55'));
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; H.flatBox(Math.cos(a) * 2.45 - 0.05, 17.5, Math.sin(a) * 2.45 - 0.05, Math.cos(a) * 2.45 + 0.05, 18.4, Math.sin(a) * 2.45 + 0.05, '#3a3f55'); }
      mb.tor([0, 18.4, 0], 2.45, 0.06, 20, 3, C('#3a3f55'));
      mb.cyl(0, 17.5, 0, 1.6, 1.6, 2.2, 8, glowC(C('#fff2a8'))); mb.cyl(0, 19.7, 0, 2.1, 0, 1.9, 8, C('#3a3f55')); mb.ico(0, 21.7, 0, 0.25, 0, () => C(BC.gold));
      H.window(0, 6, 2.5, 0.6, 0.9, 1, true); H.window(0, 11.5, 2.0, 0.6, 0.9, 1, true);
      cottage(mb, H, 7, 0, Math.PI / 2, 4.6, 3.8, 2.8, BC.roofB);
      H.rocks(-6, 4, 6, '#8a857c', 1.2, rnd);
      s.lights.push({ p: L(0, 18.5, 0), r: 24, c: [1, 0.9, 0.6] }); item('shell', 5, 0.6, -5); break;
    }
    case 'cave': { // a rocky cave mouth with mine beams, lanterns and glowing crystals
      const rc = '#77736e';
      mb.ico(-4.2, 2, 0, [3.2, 3.4, 3], 1, (q, w) => shadeC(C(rc), 0.82 + w * 0.2)); mb.ico(4.2, 2, 0, [3.2, 3.4, 3], 1, (q, w) => shadeC(C(rc), 0.82 + w * 0.2));
      mb.ico(0, 6.2, -0.4, [5.2, 3, 3.6], 1, (q, w) => shadeC(C(rc), 0.8 + w * 0.22));
      mb.quad([-2.4, -0.5, 0.25], [2.4, -0.5, 0.25], [2.4, 4.4, 0.25], [-2.4, 4.4, 0.25], C('#05070c'), true);
      for (const sx of [-1, 1]) H.flatBox(sx * 2.4 - 0.2, -0.5, 0.3, sx * 2.4 + 0.2, 4.4, 0.7, BC.woodD);
      H.flatBox(-2.8, 4.2, 0.3, 2.8, 4.7, 0.7, BC.woodD);
      H.lantern(-3.4, 2.4, 1.6); H.lantern(3.4, 2.4, 1.6);
      mb.cyl(-3, -0.5, 2.5, 0.3, 0, 1.5, 5, glowC(C('#8ff6ff'))); mb.cyl(3.2, -0.5, 2.6, 0.3, 0, 1.2, 5, glowC(C('#c08fff')));
      for (let k = 0; k < 6; k++) H.flatBox(-0.7, -0.45, 1 + k * 0.9, 0.7, -0.38, 1.25 + k * 0.9, BC.woodD);
      for (const sx of [-0.55, 0.55]) H.flatBox(sx - 0.05, -0.38, 0.8, sx + 0.05, -0.3, 6.2, BC.metalD);
      s.triggers.push({ kind: 'cave', p: L(0, 1, 0.8), r: 2.2, cave: p.key, out: L(0, 1.5, 4) });
      s.lights.push({ p: L(0, 1.5, 2), r: 7, c: [1, 0.8, 0.45] }); break;
    }
  }
}
