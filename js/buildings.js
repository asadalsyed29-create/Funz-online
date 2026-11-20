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
    deco: (x0, y0, z0, x1, y1, z1, c) => mb.box(x0, y0, z0, x1, y1, z1, typeof c === 'string' ? C(c) : c, true, true), // looks only, you roll through it
    // a gable roof along x, ridge height rh, with an overhang, rows of shingles and a ridge cap
    roof(x0, x1, z0, z1, y, rh, c, o = 0.5, rows = 5) {
      const zc = (z0 + z1) / 2, col = C(c), dk = shadeC(col, 0.82);
      mb.quad([x0 - o, y - 0.15, z1 + o], [x1 + o, y - 0.15, z1 + o], [x1 + o, y + rh, zc], [x0 - o, y + rh, zc], col);
      mb.quad([x1 + o, y - 0.15, z0 - o], [x0 - o, y - 0.15, z0 - o], [x0 - o, y + rh, zc], [x1 + o, y + rh, zc], dk);
      mb.quad([x0 - o, y - 0.35, z1 + o], [x0 - o, y - 0.15, z1 + o], [x0 - o, y + rh, zc], [x0 - o, y + rh - 0.2, zc], dk);
      mb.quad([x1 + o, y - 0.15, z1 + o], [x1 + o, y - 0.35, z1 + o], [x1 + o, y + rh - 0.2, zc], [x1 + o, y + rh, zc], dk);
      mb.quad([x0 - o, y - 0.35, z0 - o], [x0 - o, y + rh - 0.2, zc], [x0 - o, y + rh, zc], [x0 - o, y - 0.15, z0 - o], dk);
      mb.quad([x1 + o, y - 0.35, z0 - o], [x1 + o, y - 0.15, z0 - o], [x1 + o, y + rh, zc], [x1 + o, y + rh - 0.2, zc], dk);
      mb.tri([x0, y, z1], [x0, y + rh, zc], [x0, y, z0], shadeC(C(BC.plaster), 0.9)); mb.tri([x1, y, z0], [x1, y + rh, zc], [x1, y, z1], shadeC(C(BC.plaster), 0.9));
      for (const sd of [1, -1]) for (let k = 1; k < rows; k++) { const t = k / rows, zz = zc + ((sd > 0 ? z1 : z0) + sd * o - zc) * (1 - t), yy = y - 0.15 + (rh + 0.15) * t;
        mb.box(x0 - o, yy - 0.04, Math.min(zz, zz + sd * 0.12) - 0.02, x1 + o, yy + 0.03, Math.max(zz, zz + sd * 0.12) + 0.02, shadeC(col, k % 2 ? 0.74 : 0.8), true, true); }
      mb.box(x0 - o - 0.05, y + rh - 0.08, zc - 0.16, x1 + o + 0.05, y + rh + 0.12, zc + 0.16, shadeC(col, 0.62), true, true);
    },
    door(x, z, w, h, face = 1) {
      mb.box(x - w / 2 - 0.14, 0, z - 0.08 * face, x + w / 2 + 0.14, h + 0.16, z + 0.1 * face, C(BC.woodD), true, true);
      mb.box(x - w / 2, 0, z, x + w / 2, h, z + 0.12 * face, C(BC.door), true, true);
      for (let k = 1; k < 4; k++) mb.box(x - w / 2 + k * w / 4 - 0.015, 0.05, z + 0.12 * face, x - w / 2 + k * w / 4 + 0.015, h - 0.05, z + 0.135 * face, shadeC(C(BC.door), 0.75), true, true);
      for (const yy of [h * 0.22, h * 0.78]) mb.box(x - w / 2, yy - 0.04, z + 0.12 * face, x + w / 2, yy + 0.04, z + 0.15 * face, C(BC.metalD), true, true);
      mb.ico(x + w * 0.32, h * 0.48, z + 0.18 * face, 0.06, 0, () => C(BC.gold));
      mb.box(x - w / 2 - 0.3, -0.1, z, x + w / 2 + 0.3, 0.12, z + 0.5 * face, C(BC.stoneL), true, true); // a door step
    },
    window(x, y, z, w, h, face = 1, lit = false, shutters = false) {
      mb.box(x - w / 2 - 0.1, y - h / 2 - 0.1, z - 0.02 * face, x + w / 2 + 0.1, y + h / 2 + 0.1, z + 0.08 * face, C(BC.woodL), true, true);
      mb.box(x - w / 2, y - h / 2, z + 0.06 * face, x + w / 2, y + h / 2, z + 0.1 * face, lit ? glowC(C('#ffe7a0')) : C(BC.glass), true, true);
      mb.box(x - 0.035, y - h / 2, z + 0.1 * face, x + 0.035, y + h / 2, z + 0.13 * face, C(BC.woodL), true, true);
      mb.box(x - w / 2, y - 0.035, z + 0.1 * face, x + w / 2, y + 0.035, z + 0.13 * face, C(BC.woodL), true, true);
      mb.box(x - w / 2 - 0.16, y - h / 2 - 0.16, z, x + w / 2 + 0.16, y - h / 2 - 0.06, z + 0.2 * face, C(BC.woodD), true, true); // sill
      if (shutters) for (const sx of [-1, 1]) { const c = typeof shutters === 'string' ? shutters : '#4f7a5a'; mb.box(x + sx * (w / 2 + 0.12) - 0.2 * (sx > 0 ? 0 : 1), y - h / 2, z + 0.02 * face, x + sx * (w / 2 + 0.12) + 0.2 * (sx > 0 ? 1 : 0), y + h / 2, z + 0.09 * face, C(c), true, true);
        for (let k = 0; k < 4; k++) mb.box(x + sx * (w / 2 + 0.12) - 0.2 * (sx > 0 ? 0 : 1), y - h / 2 + 0.1 + k * h / 4, z + 0.09 * face, x + sx * (w / 2 + 0.12) + 0.2 * (sx > 0 ? 1 : 0), y - h / 2 + 0.13 + k * h / 4, z + 0.1 * face, shadeC(C(c), 0.75), true, true); }
    },
    // a box of flowers under a window
    flowerBox(x, y, z, w, face = 1) { mb.box(x - w / 2, y - 0.22, z, x + w / 2, y, z + 0.3 * face, C('#8a5a32'), true, true); for (let k = 0; k < 5; k++) mb.ico(x - w / 2 + 0.12 + k * (w - 0.24) / 4, y + 0.08, z + 0.15 * face, 0.11, 0, () => C(['#ff6f8f', '#ffd24a', '#ff9f3a', '#c88aff', '#ffffff'][k])); },
    lantern(x, y, z) { mb.cyl(x, 0, z, 0.08, 0.06, y, 5, C('#3a3f55')); mb.box(x - 0.2, y - 0.04, z - 0.2, x + 0.2, y, z + 0.2, C('#3a3f55')); mb.box(x - 0.16, y, z - 0.16, x + 0.16, y + 0.36, z + 0.16, glowC(C('#ffe08a'))); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.box(x + a * 0.17 - 0.025, y, z + b * 0.17 - 0.025, x + a * 0.17 + 0.025, y + 0.36, z + b * 0.17 + 0.025, C('#3a3f55'), true, true); mb.cyl(x, y + 0.36, z, 0.27, 0, 0.22, 4, C('#3a3f55'), true, 0.785); mb.tor([x, y + 0.64, z], 0.06, 0.015, 8, 3, C('#3a3f55')); },
    fence(x0, z0, x1, z1, c = BC.woodL) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.6)); for (let k = 0; k <= n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; mb.box(x - 0.08, -0.2, z - 0.08, x + 0.08, 1.0, z + 0.08, C(c)); mb.cyl(x, 1.0, z, 0.1, 0, 0.14, 4, C(c), true, 0.785); } const a = Math.atan2(z1 - z0, x1 - x0); mb.push([(x0 + x1) / 2, 0, (z0 + z1) / 2], M4.rotY(-a)); mb.box(-L / 2, 0.42, -0.04, L / 2, 0.52, 0.04, C(c), true, true); mb.box(-L / 2, 0.78, -0.04, L / 2, 0.88, 0.04, C(c), true, true); mb.pop(); },
    barrel(x, z, y = 0) { mb.push([x, y, z]); mb.lathe([[0.4, 0], [0.47, 0.25], [0.5, 0.5], [0.47, 0.75], [0.4, 1.0], [0, 1.0]], 10, (t, ph) => shadeC(C(BC.woodL), Math.floor(ph * 2.5) % 2 ? 0.92 : 1.0), 0.1); mb.pop(); for (const yy of [0.15, 0.5, 0.85]) mb.cyl(x, y + yy - 0.03, z, yy === 0.5 ? 0.505 : 0.475, yy === 0.5 ? 0.505 : 0.475, 0.06, 10, C(BC.metalD), false); },
    crate(x, z, s = 0.8, y = 0) { mb.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, C('#b08a5a')); for (const sd of [-1, 1]) { mb.box(x - s / 2 - 0.02, y + 0.04, z + sd * s / 2 - 0.03, x + s / 2 + 0.02, y + s * 0.14, z + sd * s / 2 + 0.03, C('#8a6a42'), true, true); mb.box(x - s / 2 - 0.02, y + s * 0.86, z + sd * s / 2 - 0.03, x + s / 2 + 0.02, y + s - 0.04, z + sd * s / 2 + 0.03, C('#8a6a42'), true, true); } mb.push([x, y + s / 2, z + s / 2 + 0.02], M4.rotZ(0.78)); mb.box(-s * 0.68, -0.05, 0, s * 0.68, 0.05, 0.03, C('#8a6a42'), true, true); mb.pop(); },
    // a fluted column with a base and a top; broken ones end in a jagged stump
    column(x, z, h, r, c, broken) {
      mb.box(x - r * 1.4, -0.3, z - r * 1.4, x + r * 1.4, 0.2, z + r * 1.4, C(c)); mb.cyl(x, 0.2, z, r * 1.25, r * 1.1, 0.25, 12, C(c));
      mb.push([x, 0, z]); mb.lathe([[r, 0.45], [r * 0.92, h - 0.7]], 12, (t, ph) => shadeC(C(c), Math.cos(ph * 12) > 0.3 ? 1.04 : 0.86), 0); mb.pop();
      if (!broken) { mb.cyl(x, h - 0.7, z, r * 0.95, r * 1.25, 0.35, 12, C(c)); mb.box(x - r * 1.35, h - 0.35, z - r * 1.35, x + r * 1.35, h, z + r * 1.35, C(c)); }
      else { mb.cyl(x, h - 0.7, z, r * 0.92, r * 0.92, 0.1, 12, C(c), false); for (let k = 0; k < 5; k++) { const a = k * 1.256; mb.cyl(x + Math.cos(a) * r * 0.45, h - 0.62, z + Math.sin(a) * r * 0.45, r * 0.45, 0, 0.2 + (k % 3) * 0.18, 4, shadeC(C(c), 0.9), true, a); } }
    },
    torch(x, z, h = 1.6) { mb.cyl(x, 0, z, 0.07, 0.05, h, 5, C(BC.woodD)); mb.cyl(x, h, z, 0.16, 0.09, 0.2, 6, C(BC.metalD)); mb.ico(x, h + 0.3, z, 0.16, 0, () => glowC(C('#ffb347'))); mb.ico(x, h + 0.5, z, 0.09, 0, () => glowC(C('#fff0a0'))); },
    stairs(x, z, w, steps, rise, run, c) { for (let k = 0; k < steps; k++) mb.box(x - w / 2, -0.4, z - k * run - run, x + w / 2, (k + 1) * rise, z - k * run, C(c)); },
    rocks(x, z, n, c, sc, rnd) { for (let k = 0; k < n; k++) { const a = rnd(k) * 6.28, d = rnd(k + 20) * 2; mb.ico(x + Math.cos(a) * d, 0.1, z + Math.sin(a) * d, [sc * (0.6 + rnd(k + 40) * 0.6), sc * 0.5, sc * (0.6 + rnd(k + 60) * 0.5)], 0, (p, q) => shadeC(C(c), 0.85 + q * 0.2)); } },
    // hanging moss and vines along an edge from (x0,z0) to (x1,z1) at height y
    vines(x0, z0, x1, z1, y, n, rnd, k0 = 0) { for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, L = 0.5 + rnd(k0 + k) * 1.6; mb.box(x - 0.05, y - L, z - 0.05, x + 0.05, y, z + 0.05, C(k % 3 ? '#5a8a3e' : '#7aaa4e'), true, true); mb.ico(x, y - L, z, 0.1, 0, () => C('#6a9a46')); } },
    // a stone wall made of offset blocks with uneven shades
    blockWall(x0, x1, y0, y1, z0, z1, c, rnd, k0 = 0) {
      const rows = Math.max(1, Math.round((y1 - y0) / 0.55)), rh = (y1 - y0) / rows;
      for (let r = 0; r < rows; r++) { let x = x0 - (r % 2 ? 0.45 : 0); let k = 0;
        while (x < x1) { const w = 0.8 + rnd(k0 + r * 17 + k) * 0.6, xa = Math.max(x0, x), xb = Math.min(x1, x + w); if (xb - xa > 0.05) mb.box(xa + 0.02, y0 + r * rh + 0.02, z0 - 0.03 * rnd(k0 + k + r), xb - 0.02, y0 + (r + 1) * rh - 0.02, z1 + 0.03 * rnd(k0 + k * 3 + r), shadeC(C(c), 0.88 + rnd(k0 + r * 31 + k) * 0.2), true); x += w; k++; } }
    },
  };
  return H;
}

// a cottage: stone base, timber-framed walls, a shingled roof, a porch roof over the door, windows with shutters and flower boxes, a chimney
function cottage(mb, H, x, z, rot, w, d, h, roofC, wallC = BC.plaster, rnd = () => 0.5) {
  const C = c => hex(c);
  mb.push([x, 0, z], M4.rotY(rot));
  H.box(-w / 2 - 0.2, -0.6, -d / 2 - 0.2, w / 2 + 0.2, 0.55, d / 2 + 0.2, BC.stoneD);
  for (let k = 0; k < 10; k++) { const sx = -w / 2 - 0.22 + ((k * 0.73) % 1) * (w + 0.2); H.deco(sx, 0.05 + (k % 2) * 0.22, d / 2 + 0.18, sx + 0.5, 0.25 + (k % 2) * 0.22, d / 2 + 0.24, shadeC(C(BC.stoneD), 0.85 + (k % 3) * 0.08)); }
  H.flatBox(-w / 2, 0.5, -d / 2, w / 2, h, d / 2, wallC);
  const beam = C(BC.woodD);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) H.flatBox(sx * w / 2 - 0.18, 0.5, sz * d / 2 - 0.18, sx * w / 2 + 0.18, h, sz * d / 2 + 0.18, BC.woodD); // corner posts
  H.flatBox(-w / 2 - 0.05, h - 0.3, -d / 2 - 0.05, w / 2 + 0.05, h, d / 2 + 0.05, BC.woodD);
  H.flatBox(-w / 2 - 0.04, 1.55, -d / 2 - 0.04, w / 2 + 0.04, 1.7, d / 2 + 0.04, BC.woodD);
  // timber framing: braces on the side walls
  for (const sx of [-1, 1]) { mb.push([sx * (w / 2 + 0.03), 1.7, 0], M4.rotY(Math.PI / 2)); for (const dz of [-1, 1]) { mb.push([dz * d / 4, (h - 1.7) / 2 - 0.15, 0], M4.rotZ(dz * 0.7)); mb.box(-0.07, -(h - 1.7) * 0.6, -0.05, 0.07, (h - 1.7) * 0.6, 0.05, beam, true, true); mb.pop(); } mb.pop(); }
  H.roof(-w / 2, w / 2, -d / 2, d / 2, h, d * 0.55, roofC, 0.5, 6);
  H.door(0, d / 2, 1.1, 2.0);
  // a little roof over the door, held by two brackets
  mb.quad([-0.95, 2.55, d / 2 + 0.95], [0.95, 2.55, d / 2 + 0.95], [0.95, 2.95, d / 2], [-0.95, 2.95, d / 2], shadeC(C(roofC), 0.95));
  for (const sx of [-0.8, 0.8]) { mb.push([sx, 2.5, d / 2 + 0.3], M4.rotX(-0.8)); mb.box(-0.05, -0.35, -0.05, 0.05, 0.35, 0.05, beam, true, true); mb.pop(); }
  for (const sx of [-1, 1]) { H.window(sx * (w / 4 + 0.35), h * 0.62, d / 2, 0.8, 0.8, 1, true, rnd(sx + 3) > 0.5 ? '#4f7a5a' : '#5a6fa8'); H.flowerBox(sx * (w / 4 + 0.35), h * 0.62 - 0.55, d / 2 + 0.05, 1.0); }
  H.window(0, h * 0.62, -d / 2, 0.8, 0.8, -1, true); for (const sx of [-1, 1]) { mb.push([sx * w / 2, 0, 0], M4.rotY(sx * Math.PI / 2)); H.window(0, h * 0.62, 0, 0.7, 0.7, 1, true); mb.pop(); }
  // the chimney: stacked stones with a cap
  const cx = w / 4, cz = -d / 4; for (let k = 0; k < 7; k++) H.flatBox(cx - 0.02 * (k % 2), h - 0.2 + k * 0.42 * (d * 0.55 + 0.9) / 2.94, cz - 0.4 - 0.02 * (k % 2), cx + 0.7 + 0.02 * (k % 2), h - 0.2 + (k + 1) * 0.42 * (d * 0.55 + 0.9) / 2.94, cz + 0.3 + 0.02 * (k % 2), k % 2 ? BC.stoneD : BC.stone);
  H.flatBox(cx - 0.1, h + d * 0.55 + 0.65, cz - 0.5, cx + 0.8, h + d * 0.55 + 0.8, cz + 0.4, BC.stoneL);
  mb.pop();
}

// a low-poly wooden boat hull along x (bow at +x), keel at y = 0. upTo < 1 leaves the bow broken off (with its ribs showing).
function boatHull(mb, Lh, W, Hh, upTo = 1) {
  const C = h => hex(h), n = 9, S = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = -Lh / 2 + t * Lh, w = W / 2 * (t < 0.6 ? 0.82 + 0.18 * Math.sin(t / 0.6 * Math.PI / 2) : Math.cos((t - 0.6) / 0.4 * Math.PI / 2) ** 0.8), rise = Hh * (0.12 * (1 - t) ** 2 + 0.25 * t * t);
    S.push({ x, w, top: Hh + rise, bil: Hh * 0.38, t });
  }
  const band = k => shadeC(C(BC.wood), k % 2 ? 0.86 : 1);
  for (let i = 0; i < n; i++) {
    const a = S[i], b = S[i + 1]; if (b.t > upTo + 1e-6) break;
    for (const sd of [-1, 1]) {
      const P = (s, y, ww) => [s.x, y, sd * ww];
      const q = (p0, p1, p2, p3, c) => sd > 0 ? mb.quad(p0, p1, p2, p3, c) : mb.quad(p1, p0, p3, p2, c);
      for (let k = 0; k < 4; k++) { const f0 = k / 4, f1 = (k + 1) / 4, ya0 = a.bil + (a.top - a.bil) * f0, ya1 = a.bil + (a.top - a.bil) * f1, yb0 = b.bil + (b.top - b.bil) * f0, yb1 = b.bil + (b.top - b.bil) * f1;
        q(P(a, ya0, a.w * (0.86 + 0.14 * f0)), P(b, yb0, b.w * (0.86 + 0.14 * f0)), P(b, yb1, b.w * (0.86 + 0.14 * f1)), P(a, ya1, a.w * (0.86 + 0.14 * f1)), band(k + i)); }
      q(P(a, 0, 0), P(b, 0, 0), P(b, b.bil, b.w * 0.86), P(a, a.bil, a.w * 0.86), C(BC.woodD));
      q(P(a, a.top, a.w), P(b, b.top, b.w), P(b, b.top + 0.18, b.w), P(a, a.top + 0.18, a.w), C(BC.woodL)); // rail
      if (i % 2 === 1 && i < n - 2) { const pz = sd * (a.w * 0.99), py = a.bil + (a.top - a.bil) * 0.72; mb.cyl(a.x + (b.x - a.x) / 2, py - 0.18, pz, 0.2, 0.2, 0.36, 8, C('#2a2a30'), true); mb.tor([a.x + (b.x - a.x) / 2, py, pz], 0.22, 0.04, 10, 3, C('#c8a040')); } // portholes
    }
    mb.quad([a.x, a.top - 0.35, a.w * 0.95], [b.x, b.top - 0.35, b.w * 0.95], [b.x, b.top - 0.35, -b.w * 0.95], [a.x, a.top - 0.35, -a.w * 0.95], C(BC.woodL)); // deck
    for (let k = -2; k <= 2; k++) mb.box(a.x, a.top - 0.34, k * a.w * 0.36 - 0.02, b.x, a.top - 0.33, k * a.w * 0.36 + 0.02, C(BC.woodD), true, true);
  }
  const s0 = S[0]; mb.quad([s0.x, 0, 0], [s0.x, s0.top, -s0.w], [s0.x, s0.top, s0.w], [s0.x, 0, 0], C(BC.woodD)); mb.tri([s0.x, 0, 0], [s0.x, s0.bil, s0.w * 0.86], [s0.x, s0.top, s0.w], C(BC.woodD)); mb.tri([s0.x, 0, 0], [s0.x, s0.top, -s0.w], [s0.x, s0.bil, -s0.w * 0.86], C(BC.woodD)); mb.tri([s0.x, 0, 0], [s0.x, s0.top, s0.w], [s0.x, s0.top, -s0.w], C(BC.woodD));
  if (upTo < 1) { const e = S[Math.floor(upTo * n)];
    for (let k = 0; k < 5; k++) { const z = -e.w + k * e.w / 2, h = e.top * (0.4 + ((k * 37) % 5) / 8); mb.tri2([e.x, 0, 0], [e.x + 0.6 + (k % 2) * 0.5, h, z], [e.x, h * 0.8, z + e.w / 4], C(BC.woodD)); }
    for (let r = 1; r <= 3; r++) { const x = e.x + r * 0.9, w = e.w * (1 - r * 0.18); MB.tube(mb, [[x, 0, 0], [x, e.bil, w * 0.85], [x, e.top * (1 - r * 0.15), w]], 0.12, 5, C(BC.woodD)); MB.tube(mb, [[x, 0, 0], [x, e.bil, -w * 0.85], [x, e.top * (1 - r * 0.2), -w]], 0.12, 5, C(BC.woodD)); }
    mb.box(e.x, -0.1, -0.12, e.x + 3, 0.2, 0.12, C(BC.woodD)); }
  return S;
}

// extra building pieces used by the structures below
function bx(mb) {
  const C = h => (typeof h === 'string' ? hex(h) : h);
  const X = {
    // a walkable ramp (planks across) along a list of points, with rope rails if asked
    ramp(pts, w, col, rails, edge) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, r = [-dz / l * w / 2, dx / l * w / 2];
        const L = (p, k, dy = 0) => [p[0] + r[0] * k, p[1] + dy, p[2] + r[1] * k];
        mb.quad(L(a, -1), L(a, 1), L(b, 1), L(b, -1), C(col)); mb.quad(L(b, -1, -0.25), L(b, 1, -0.25), L(a, 1, -0.25), L(a, -1, -0.25), shadeC(C(col), 0.6));
        const n = Math.max(1, Math.round(l / 0.5)); for (let k = 1; k < n; k++) { const t = k / n, p = [a[0] + dx * t, a[1] + (b[1] - a[1]) * t, a[2] + dz * t]; mb.quad(L(p, -1, 0.01), L(p, 1, 0.01), L([p[0] + dx / l * 0.05, p[1], p[2] + dz / l * 0.05], 1, 0.01), L([p[0] + dx / l * 0.05, p[1], p[2] + dz / l * 0.05], -1, 0.01), shadeC(C(col), 0.7), true); }
        if (rails) for (const k of [-1, 1]) { mb.caps(L(a, k, 0.9), L(b, k, 0.9), 0.04, 0.04, 4, C(edge || '#d8c8a0')); for (let q = 0; q <= n; q += 2) { const t = q / n, p = [a[0] + dx * t, a[1] + (b[1] - a[1]) * t, a[2] + dz * t]; mb.box(L(p, k)[0] - 0.05, p[1], L(p, k)[2] - 0.05, L(p, k)[0] + 0.05, p[1] + 0.95, L(p, k)[2] + 0.05, C('#6a4a2a')); } }
      }
    },
    // a wall from (x0,z0) to (x1,z1) whose top follows h(t) (0..1 along the wall) - jagged when broken, with merlons where it is whole
    wall(x0, z0, x1, z1, th, h, col, merl, gap) {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.9)), a = Math.atan2(z1 - z0, x1 - x0);
      mb.push([x0, 0, z0], M4.rotY(-a));
      for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, hh = h((t0 + t1) / 2); if (hh <= 0.05 || (gap && gap((t0 + t1) / 2))) continue; const c = shadeC(C(col), 0.9 + ((k * 7) % 5) * 0.03);
        mb.box(t0 * L, -0.5, -th / 2, t1 * L + 0.01, hh, th / 2, c);
        for (let r = 1; r < hh / 0.55; r++) mb.box(t0 * L, r * 0.55 - 0.03, -th / 2 - 0.02, t1 * L, r * 0.55 + 0.03, th / 2 + 0.02, shadeC(c, 0.78), true, true);
        if (merl && hh >= merl - 0.01 && k % 2 === 0) mb.box(t0 * L, hh, -th / 2, t1 * L, hh + 0.75, th / 2, c); }
      mb.pop();
    },
    // a round stone tower with block rings, arrow slits and a crenellated top (or a broken one)
    rtower(x, z, r, h, col, broken, rnd, k0 = 0) {
      for (let k = 0; k < Math.ceil(h / 0.6); k++) { const y = k * 0.6, top = Math.min(h, y + 0.6); mb.cyl(x, y - (k ? 0 : 0.6), z, r, r, top - y + (k ? 0 : 0.6), 12, shadeC(C(col), k % 2 ? 0.92 : 1.0), true, k % 2 ? 0.26 : 0); }
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + k0, y = 1.6 + k * 2.2; if (y > h - 1) break; mb.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r], M4.rotY(-a)); mb.box(-0.05, -0.5, -0.09, 0.05, 0.5, 0.09, C('#221e1a'), true, true); mb.pop(); }
      if (!broken) { mb.cyl(x, h, z, r + 0.3, r + 0.3, 0.4, 12, shadeC(C(col), 0.85)); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; mb.push([x + Math.cos(a) * (r + 0.05), h + 0.4, z + Math.sin(a) * (r + 0.05)], M4.rotY(-a)); mb.box(-0.3, 0, -0.4, 0.3, 0.8, 0.4, C(col)); mb.pop(); } }
      else for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + k0; mb.push([x + Math.cos(a) * r * 0.82, h, z + Math.sin(a) * r * 0.82], M4.rotY(-a)); mb.box(-0.35, 0, -0.45, 0.35, 0.3 + rnd(k0 * 9 + k) * 1.4, 0.45, C(col)); mb.pop(); }
    },
    // a stone arch (half ring of wedge blocks) in the x-y plane at depth z
    arch(cx, cy, z0, z1, R, w, col, n = 9) { for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI, a1 = (k + 1) / n * Math.PI, P = (a, rr, z) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z], c = shadeC(C(col), k % 2 ? 0.9 : 1.02);
      mb.quad(P(a0, R + w, z1), P(a1, R + w, z1), P(a1, R, z1), P(a0, R, z1), c); mb.quad(P(a1, R + w, z0), P(a0, R + w, z0), P(a0, R, z0), P(a1, R, z0), c);
      mb.quad(P(a0, R + w, z0), P(a1, R + w, z0), P(a1, R + w, z1), P(a0, R + w, z1), shadeC(c, 0.9)); mb.quad(P(a0, R, z1), P(a1, R, z1), P(a1, R, z0), P(a0, R, z0), shadeC(c, 0.75)); } },
    // a four-sided pointed roof over a square
    pyroof(x, y, z, hw, h, col, o = 0.3) { const T = [x, y + h, z], P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + a * (hw + o), y, z + b * (hw + o)]); for (let k = 0; k < 4; k++) mb.tri(P[k], T, P[(k + 1) % 4], shadeC(C(col), [0.85, 0.95, 1.0, 0.8][k])); mb.quad(P[3], P[2], P[1], P[0], shadeC(C(col), 0.6)); },
    // a cone roof with shingle rings
    cone(x, y, z, r, h, col, seg = 12) { mb.cyl(x, y, z, r, 0, h, seg, C(col)); for (let k = 1; k < 4; k++) { const t = k / 4; mb.cyl(x, y + h * t - 0.06, z, r * (1 - t) + 0.04, r * (1 - t) + 0.04, 0.08, seg, shadeC(C(col), 0.75), false); } },
    // a simple palm
    palm(x, z, h, lean) { const pts = []; for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push([x + lean * t * t, h * t, z]); } MB.tube(mb, pts, t => 0.3 - t * 0.12, 6, hex('#9a7a4a')); const [px, py, pz] = pts[5]; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, e = [px + Math.cos(a) * 2.6, py - 0.9, pz + Math.sin(a) * 2.6], m = [px + Math.cos(a) * 1.4, py + 0.4, pz + Math.sin(a) * 1.4], s = [-Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4]; mb.tri2([px, py, pz], [m[0] + s[0], m[1], m[2] + s[2]], e, hex('#4f9a44')); mb.tri2([px, py, pz], e, [m[0] - s[0], m[1], m[2] - s[2]], hex('#3f8a3e')); } for (let k = 0; k < 3; k++) mb.sph([px + Math.cos(k * 2) * 0.35, py - 0.3, pz + Math.sin(k * 2) * 0.35], 0.2, 6, hex('#7a5a2a'), 0); },
  };
  return X;
}

function buildStructure(mb, p, s, item, L, rnd) {
  const H = bh(mb), X = bx(mb), C = h => hex(h);
  switch (p.type) {
    case 'ruins': { // castle ruins: crumbling curtain walls with a gate arch, four round towers (two broken), a wall walk you can climb to, a tree in the courtyard
      const desert = p.b === 4, c = desert ? '#d8b878' : '#a29d93', cd = desert ? BC.sandD : '#7d786f';
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (rnd(i * 5 + j) > 0.3) H.deco(-8 + i * 3.3, -0.05, -8 + j * 3.3, -5.4 + i * 3.3, 0.06, -5.4 + j * 3.3, shadeC(C(cd), 0.9 + rnd(i + j * 7) * 0.15));
      X.wall(-9, -9, 9, -9, 1.4, t => 6, c, 6);                                   // the back wall stands tall
      X.wall(-9, 9, -9, -9, 1.4, t => 1.2 + t * 4.8 * (0.7 + 0.3 * Math.sin(t * 20)), c, 6); // the left wall crumbles away
      X.wall(9, -9, 9, 9, 1.4, t => t > 0.35 && t < 0.62 ? 0 : 5 - Math.abs(Math.sin(t * 9)) * 1.6, c, 0);
      X.wall(-9, 9, 9, 9, 1.4, t => 5, c, 5, t => Math.abs(t - 0.5) < 0.13); // front wall with the gate
      X.arch(0, 3.2, 8.3, 9.7, 2.1, 0.8, c); mb.box(-2.9, 3.2, 8.3, -2.1, 5.0, 9.7, C(c)); mb.box(2.1, 3.2, 8.3, 2.9, 5.0, 9.7, C(c)); mb.box(-2.9, 5.0, 8.3, 2.9, 6.0, 9.7, C(c));
      for (let k = 0; k < 7; k++) H.deco(-1.8 + k * 0.6, 3.6, 8.9, -1.72 + k * 0.6, 5.2, 9.0, BC.metalD); for (let k = 0; k < 3; k++) H.deco(-2, 3.8 + k * 0.5, 8.86, 2, 3.88 + k * 0.5, 9.04, BC.metalD); // the portcullis, stuck half open
      X.rtower(-9, -9, 2.4, 9, c, false, rnd, 0); X.rtower(9, -9, 2.4, 4.5, c, true, rnd, 1); X.rtower(-9, 9, 2.4, 7, c, false, rnd, 2); X.rtower(9, 9, 2.4, 2, c, true, rnd, 3);
      X.cone(-9, 9.4, -9, 3.0, 3.5, desert ? '#c87a3a' : '#5a6a8a');
      // a ramp up to the wall walk on the back wall
      X.ramp([[7.5, 0, -6.2], [-3, 6, -6.2]], 1.8, cd, true); H.box(-8, 5.6, -8.3, 8, 6.05, -6.2, cd);
      for (let k = 0; k < 4; k++) { const x = 6 - k * 3.2; H.flatBox(x - 0.15, -0.5, -6.3, x + 0.15, k * 1.6 + 0.5, -6.0, BC.woodD); }
      mb.push([14, 1.6, 2], M4.mul3(M4.rotY(0.4), M4.rotZ(Math.PI / 2))); mb.cyl(0, -2.4, 0, 2.2, 2.2, 4.8, 12, C(c)); mb.pop(); // a fallen tower chunk
      for (let k = 0; k < 9; k++) { const a = rnd(k + 40) * 6.28, d = 10.5 + rnd(k + 41) * 4; mb.ico(Math.cos(a) * d, 0.2, Math.sin(a) * d, [0.6 + rnd(k) * 0.6, 0.45, 0.6], 0, () => shadeC(C(c), 0.85 + rnd(k + 3) * 0.2)); }
      MB.tube(mb, [[3, -0.3, 2], [3.3, 2.5, 2.2], [3.1, 5, 2.4]], t => 0.45 - t * 0.2, 7, C('#6a4a2e')); mb.ico(3.1, 6.6, 2.4, [3, 2.2, 3], 1, (a, b) => b > 0.3 ? C('#5aae4a') : C('#3f8a3e'));
      if (!desert) H.vines(-8, -8.3, 8, -8.3, 6, 12, rnd, 60);
      mb.tri2([-4, 6, -8.25], [-2.6, 6, -8.25], [-3.3, 3, -8.25], C('#c8343a')); mb.tri2([3, 6, -8.25], [4.4, 6, -8.25], [3.7, 3.6, -8.25], C('#3a5ac8'));
      H.torch(-3.6, 10.5); H.torch(3.6, 10.5); s.lights.push({ p: L(0, 2.4, 10.5), r: 9, c: [1, 0.7, 0.35] });
      item('coin', 0, 0.6, 0); item(desert ? 'gem' : 'relic', -5, 6.6, -7.2); break;
    }
    case 'circle': { // moon henge: a stepped round dais, a tall rune monolith ringed by floating stone rings, a spiral of standing stones and a pale moon orb
      for (let k = 0; k < 3; k++) mb.cyl(0, -0.5 + k * 0.45, 0, 6.5 - k * 1.6, 6.3 - k * 1.6, 0.95, 20, shadeC(C('#9a968e'), 0.95 + k * 0.05));
      for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; H.deco(Math.cos(a) * 5.6 - 0.1, 0.45, Math.sin(a) * 5.6 - 0.1, Math.cos(a) * 5.6 + 0.1, 0.48, Math.sin(a) * 5.6 + 0.1, glowC(C('#9ab8ff'))); }
      mb.cyl(0, 1.3, 0, 0.95, 0.55, 9.5, 4, C('#6e6a74'), true, 0.785); for (let k = 0; k < 6; k++) for (let sd = 0; sd < 4; sd++) { const a = sd * 1.571 + 0.785, r = 0.93 - (k * 1.5 / 9.5) * 0.4; mb.push([Math.cos(a) * r * 0.72, 2 + k * 1.4, Math.sin(a) * r * 0.72], M4.rotY(-a)); H.deco(0, 0, -0.18, 0.04, 0.5, 0.18, glowC(C('#9ab8ff'))); mb.pop(); }
      for (const [y, R, tx, tz] of [[4.5, 2.6, 0.4, 0], [7, 2.1, -0.3, 0.5], [9.4, 1.6, 0.2, -0.6]]) { mb.push([0, y, 0], M4.mul3(M4.rotX(tx), M4.rotZ(tz))); mb.tor([0, 0, 0], R, 0.22, 24, 6, C('#8a8692')); mb.tor([0, 0, 0], R - 0.24, 0.05, 24, 3, glowC(C('#c8d8ff'))); mb.pop(); }
      mb.sph([0, 11.6, 0], 0.9, 14, (x, y, z) => glowC(C(Math.sin(x * 9) * Math.sin(z * 7) > 0.5 ? '#c8ccd8' : '#eef2ff')), 0);
      for (let k = 0; k < 16; k++) { const t = k / 16, a = t * 9.4, r = 13 - t * 5.5, h = 1.2 + t * 3.4; mb.push([Math.cos(a) * r, 0, Math.sin(a) * r], M4.mul3(M4.rotY(-a), M4.rotZ((rnd(k) - 0.5) * 0.15))); mb.lathe([[0.55, -0.6], [0.5, h * 0.7], [0.25, h], [0, h + 0.1]], 5, shadeC(C('#7a767e'), 0.9 + rnd(k + 3) * 0.15), 0.1); H.deco(0.42, h * 0.5, -0.1, 0.5, h * 0.5 + 0.35, 0.1, glowC(C('#9ab8ff'))); mb.pop(); }
      s.lights.push({ p: L(0, 11.6, 0), r: 16, c: [0.6, 0.7, 1] }); item('crystal', 2.5, 1.9, 0); break;
    }
    case 'village': { // windmill village: a stone windmill with big sails, a round hut, a two-storey house, a red barn, a fountain, a cart and a pen
      // the windmill
      mb.push([-8, 0, -7]);
      mb.cyl(0, -0.5, 0, 3.4, 3.4, 1.4, 8, C(BC.stoneD), true, 0.39); mb.cyl(0, 0.9, 0, 3.0, 2.0, 8.5, 8, C('#e8e0d0'), true, 0.39); for (let k = 1; k < 5; k++) mb.cyl(0, 0.9 + k * 1.7, 0, 3.02 - k * 0.2, 3.02 - k * 0.2, 0.12, 8, C(BC.woodD), false, 0.39);
      mb.cyl(0, 9.4, 0, 2.4, 2.4, 0.3, 8, C(BC.woodD), true, 0.39); X.cone(0, 9.7, 0, 2.5, 3.2, '#a8452e', 8);
      mb.push([0, 0, 2.92]); H.door(0, 0.05, 1.1, 2.0); mb.pop(); H.window(0, 4.5, 2.62, 0.7, 0.8, 1, true); H.window(0, 7.0, 2.28, 0.6, 0.7, 1, true);
      mb.push([0, 9.6, 2.6]); mb.caps([0, 0, -0.4], [0, 0, 0.6], 0.2, 0.25, 8, C(BC.woodD)); mb.push([0, 0, 0.6], M4.rotZ(0.4));
      for (let k = 0; k < 4; k++) { mb.push([0, 0, 0], M4.rotZ(k * Math.PI / 2)); mb.box(-0.12, 0, -0.08, 0.12, 6.8, 0.08, C(BC.wood)); for (let q = 0; q < 6; q++) mb.box(0.1, 1.2 + q * 0.95, -0.05, 1.3, 1.26 + q * 0.95, 0.05, C(BC.woodL), true, true); mb.quad([0.12, 1.2, 0.06], [1.3, 1.2, 0.06], [1.3, 6.4, 0.06], [0.12, 6.4, 0.06], C('#f2ead8'), true); mb.quad([0.12, 1.2, 0.06], [0.12, 6.4, 0.06], [1.3, 6.4, 0.06], [1.3, 1.2, 0.06], C('#d8d0bc'), true); mb.pop(); }
      mb.pop(); mb.pop(); mb.pop();
      // a round hut with a tall straw roof
      mb.push([8, 0, -6]); mb.cyl(0, -0.3, 0, 2.7, 2.7, 2.9, 12, C('#e8d2b0')); for (let k = 0; k < 5; k++) mb.cyl(0, 2.4 + k * 0.6, 0, 3.6 - k * 0.72, 3.0 - k * 0.72, 0.65, 12, shadeC(C(BC.thatch), k % 2 ? 0.9 : 1)); mb.cyl(0, 5.4, 0, 0.5, 0, 0.6, 8, shadeC(C(BC.thatch), 0.8));
      mb.push([0, 0, 2.68]); H.door(0, 0.02, 1.0, 1.9); mb.pop(); for (const a of [0.9, 2.3]) { mb.push([Math.cos(a) * 2.68, 0, Math.sin(a) * 2.68], M4.rotY(Math.PI / 2 - a)); H.window(0, 1.6, 0, 0.6, 0.6, 1, true); mb.pop(); } mb.pop();
      // a two-storey house: stone ground floor, an overhanging timber upper floor, a steep roof and a balcony
      mb.push([7.5, 0, 7.5], M4.rotY(-0.6)); H.box(-3, -0.5, -2, 3, 2.6, 2, BC.stone); H.flatBox(-3.4, 2.6, -2.4, 3.4, 5.2, 2.4, '#f2e6cc');
      for (const x of [-3.4, -1.2, 1.2, 3.4]) H.deco(x - 0.12, 2.6, 2.38, x + 0.12, 5.2, 2.5, BC.woodD); H.deco(-3.4, 3.8, 2.38, 3.4, 3.95, 2.5, BC.woodD);
      H.roof(-3.4, 3.4, -2.4, 2.4, 5.2, 3.2, BC.roofB, 0.5, 6); H.door(0, 2.0, 1.1, 2.1); H.window(-2, 1.4, 2.0, 0.8, 0.8, 1, true, '#7a3a2a'); H.window(2, 1.4, 2.0, 0.8, 0.8, 1, true, '#7a3a2a'); H.window(-2.3, 4.2, 2.45, 0.8, 0.9, 1, true); H.window(2.3, 4.2, 2.45, 0.8, 0.9, 1, true);
      H.flatBox(-1, 3.0, 2.45, 1, 3.15, 3.4, BC.woodL); for (let k = 0; k < 6; k++) H.deco(-0.95 + k * 0.38, 3.15, 3.32, -0.9 + k * 0.38, 3.9, 3.4, BC.woodL); H.deco(-1, 3.85, 3.3, 1, 3.95, 3.42, BC.woodL); H.window(0, 4.1, 2.45, 0.7, 1.4, 1, true);
      mb.pop();
      // a red barn with a gambrel roof and white X doors
      mb.push([-8, 0, 7], M4.rotY(0.5)); H.flatBox(-4, -0.4, -2.6, 4, 3.2, 2.6, '#b8432e');
      const gb = [[-2.9, 3.2], [-2.4, 5.2], [0, 6.4], [2.4, 5.2], [2.9, 3.2]]; for (let k = 0; k < 4; k++) { const [z0, y0] = gb[k], [z1, y1] = gb[k + 1]; mb.quad([-4.3, y0, z0], [-4.3, y1, z1], [4.3, y1, z1], [4.3, y0, z0], shadeC(C('#5a4a4a'), k % 2 ? 0.9 : 1)); mb.quad([4.3, y0, z0], [4.3, y1, z1], [-4.3, y1, z1], [-4.3, y0, z0], C('#4a3a3a')); }
      for (const sx of [-4, 4]) { mb.tri([sx, 3.2, -2.6], [sx, 5.2, -2.1], [sx, 3.2, 2.6], C('#b8432e')); mb.tri([sx, 3.2, 2.6], [sx, 5.2, -2.1], [sx, 5.2, 2.1], C('#b8432e')); mb.tri([sx, 5.2, -2.1], [sx, 6.4, 0], [sx, 5.2, 2.1], C('#b8432e')); mb.tri([sx, 3.2, 2.6], [sx, 5.2, 2.1], [sx, 3.2, -2.6], C('#a03a28')); mb.tri([sx, 5.2, 2.1], [sx, 5.2, -2.1], [sx, 3.2, -2.6], C('#a03a28')); mb.tri([sx, 5.2, 2.1], [sx, 6.4, 0], [sx, 5.2, -2.1], C('#a03a28')); }
      mb.push([4.02, 0, 0], M4.rotY(Math.PI / 2)); H.deco(-1.4, 0, 0, 1.4, 2.6, 0.08, '#8a2e22'); for (const sx of [-0.7, 0.7]) { mb.push([sx, 1.3, 0.09], M4.rotZ(1.07)); H.deco(-1.45, -0.07, 0, 1.45, 0.07, 0.04, '#ffffff'); mb.pop(); mb.push([sx, 1.3, 0.09], M4.rotZ(-1.07)); H.deco(-1.45, -0.07, 0, 1.45, 0.07, 0.04, '#ffffff'); mb.pop(); } H.deco(-1.45, 0, 0.08, 1.45, 0.12, 0.13, '#ffffff'); H.deco(-1.45, 2.5, 0.08, 1.45, 2.62, 0.13, '#ffffff'); H.deco(-0.04, 0, 0.08, 0.04, 2.6, 0.13, '#ffffff'); mb.pop();
      mb.pop();
      // the fountain in the square
      mb.cyl(0, -0.3, 0, 3.2, 3.2, 0.8, 8, C(BC.stone), true, 0.39); mb.cyl(0, 0.45, 0, 2.8, 2.8, 0.06, 8, glowC(C('#5ab8f0')), true, 0.39); mb.cyl(0, 0.5, 0, 0.35, 0.3, 1.6, 8, C(BC.stoneL)); mb.lathe([[0.2, 2.0], [1.1, 2.2], [1.2, 2.45], [0.9, 2.4], [0, 2.35]], 10, C(BC.stoneL), 0); mb.cyl(0, 2.35, 0, 0.95, 0.95, 0.05, 10, glowC(C('#8ad8ff'))); mb.cyl(0, 2.4, 0, 0.12, 0.05, 0.9, 6, glowC(C('#c8f0ff')));
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; mb.caps([Math.cos(a) * 0.9, 2.4, Math.sin(a) * 0.9], [Math.cos(a) * 1.9, 0.55, Math.sin(a) * 1.9], 0.05, 0.03, 4, glowC(C('#c8f0ff'))); }
      // a cart, a pen with hay, lanterns
      mb.push([3.5, 0, -1.5], M4.rotY(0.8)); H.flatBox(-1.2, 0.6, -0.7, 1.2, 1.3, 0.7, BC.woodL); for (const z of [-0.8, 0.8]) { mb.push([0, 0.55, z], M4.rotX(Math.PI / 2)); mb.cyl(0, -0.06, 0, 0.55, 0.55, 0.12, 10, C(BC.woodD)); mb.pop(); } mb.caps([1.2, 0.8, -0.3], [2.6, 0.5, -0.3], 0.05, 0.05, 4, C(BC.woodD)); mb.caps([1.2, 0.8, 0.3], [2.6, 0.5, 0.3], 0.05, 0.05, 4, C(BC.woodD)); for (let k = 0; k < 4; k++) mb.sph([-0.7 + k * 0.45, 1.45, 0], 0.28, 6, C(['#ffb43a', '#ff7a3a', '#ffd23a', '#7bd85a'][k]), 0); mb.pop();
      H.fence(-3, -12, 3, -12); H.fence(3, -12, 3, -16.5); H.fence(-3, -12, -3, -16.5); H.fence(-3, -16.5, 3, -16.5); mb.ico(0, 0.6, -14.5, [1.3, 0.9, 1.0], 1, (x, y) => shadeC(C('#e8c860'), 0.85 + y * 0.15));
      for (const [x, z] of [[-3, 3], [3, 3.5], [0, -4], [-4, -2]]) { H.lantern(x, 2.4, z); s.lights.push({ p: L(x, 2.6, z), r: 8, c: [1, 0.8, 0.45] }); }
      item('coin', 0, 0.9, 4.5); item('mushroom', 5, 0.6, 0); break;
    }
    case 'tower': { // watch keep: a tall square stone keep, a zig-zag scaffold of ramps up its four sides, a roofed wooden lookout, hanging banners and a beacon fire on top
      const c = '#9c978d';
      for (let k = 0; k < 24; k++) { const y = -0.6 + k * 0.62, hw = 3 - k * 0.012; mb.box(-hw, y, -hw, hw, y + 0.62, hw, shadeC(C(c), k % 2 ? 0.92 : 1.0)); }
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) mb.box(sx * 3.05 - 0.4, -0.6, sz * 3.05 - 0.4, sx * 3.05 + 0.4, 14.3, sz * 3.05 + 0.4, C('#8a857b'));
      for (let k = 0; k < 3; k++) for (const [sx, sz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) H.deco(sx ? sx * 3.0 - 0.05 : -0.1, 4 + k * 3.4, sz ? sz * 3.0 - 0.05 : -0.1, sx ? sx * 3.0 + 0.05 : 0.1, 5 + k * 3.4, sz ? sz * 3.0 + 0.05 : 0.1, '#221e1a');
      H.door(0, 2.9, 1.2, 2.2);
      // the scaffold: a ramp up each side, landings on the corners, posts down to the ground
      const R = 4.4, pts = [[-R, 0, R], [R, 3.5, R], [R, 7, -R], [-R, 10.5, -R], [-R, 14, R]];
      for (let i = 0; i < 4; i++) X.ramp([pts[i], pts[i + 1]], 1.8, BC.woodL, true);
      for (let i = 1; i < 4; i++) { const q = pts[i]; mb.box(q[0] - 1, q[1] - 0.25, q[2] - 1, q[0] + 1, q[1], q[2] + 1, C(BC.woodL)); }
      for (let i = 0; i < 4; i++) for (let k = 1; k < 4; k++) { const t = k / 4, a = pts[i], b = pts[i + 1], x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t; const ox = Math.sign(x) * 0.8, oz = Math.sign(z) * 0.8; mb.box(x + ox - 0.1, -0.5, z + oz - 0.1, x + ox + 0.1, y - 0.25, z + oz + 0.1, C(BC.woodD), true, true); }
      // the lookout: a deck, posts, a railing and a pointed roof, with a beacon fire
      mb.box(-4.8, 13.75, -4.8, 4.8, 14.0, 4.8, C(BC.woodL)); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) mb.box(sx * 4.6 - 0.15, 14, sz * 4.6 - 0.15, sx * 4.6 + 0.15, 17, sz * 4.6 + 0.15, C(BC.woodD));
      for (const [a, b] of [[[-4.6, -4.6], [4.6, -4.6]], [[4.6, -4.6], [4.6, 4.6]], [[-4.6, -4.6], [-4.6, 2.6]]]) { mb.caps([a[0], 15, a[1]], [b[0], 15, b[1]], 0.06, 0.06, 4, C(BC.woodL)); }
      X.pyroof(0, 17, 0, 4.6, 3.4, '#5a6a8a', 0.6); mb.cyl(0, 20.4, 0, 0.05, 0.05, 1.2, 4, C(BC.metalD));
      mb.cyl(0, 14, 0, 0.9, 0.6, 0.6, 8, C(BC.metalD)); mb.cone(0, 14.6, 0, 0.6, 1.2, 6, glowC(C('#ffa03a'))); mb.cone(0, 14.6, 0, 0.35, 0.8, 5, glowC(C('#fff0a0')));
      for (const [x, z, col] of [[-1.6, 3.06, '#c8343a'], [1.6, 3.06, '#3a5ac8']]) { mb.quad([x - 0.6, 13.6, z], [x + 0.6, 13.6, z], [x + 0.6, 9.2, z], [x - 0.6, 9.2, z], C(col), true); mb.tri([x - 0.6, 9.2, z], [x + 0.6, 9.2, z], [x, 8.5, z], C(col), true); mb.ico(x, 11.5, z + 0.02, [0.3, 0.3, 0.02], 0, () => C(BC.gold)); }
      s.lights.push({ p: L(0, 15.5, 0), r: 12, c: [1, 0.7, 0.35] }); item('feather', 2, 14.6, 2); break;
    }
    case 'bigtree': { // treehouse village: a huge banyan tree with hanging roots, a wide flat crown and three round treehouses joined by rope bridges
      const bark = C('#6e4e30'), barkD = C('#5a3e24'), leaf = (q, w) => w > 0.35 ? C('#6ac05a') : w < -0.3 ? C('#2f7a3a') : C('#48a050');
      mb.lathe([[4.2, -1], [3.2, 1], [2.8, 6], [3.0, 12], [3.6, 15], [0, 15.5]], 14, (t, ph) => shadeC(bark, 0.82 + 0.18 * Math.cos(ph * 9 + t * 6)), 0.1);
      for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.2, bx2 = Math.cos(a) * 11, bz = Math.sin(a) * 11; MB.tube(mb, [[Math.cos(a) * 2.5, 13.5, Math.sin(a) * 2.5], [Math.cos(a) * 6.5, 16.5, Math.sin(a) * 6.5], [bx2, 17, bz]], t => 1.2 - t * 0.6, 7, bark);
        mb.ico(bx2, 18.5, bz, [5.5, 2.4, 5.5], 1, leaf); if (k % 2 === 0) mb.cyl(bx2 * 0.8, -0.5, bz * 0.8, 0.45, 0.3, 17, 6, barkD); else for (let q = 0; q < 3; q++) mb.cyl(bx2 * 0.75 + q * 0.4, 12 - q * 2, bz * 0.75, 0.05, 0.05, 4 + q * 2, 3, C('#7a6a3a')); }
      mb.ico(0, 19.5, 0, [8, 3.2, 8], 1, leaf);
      const pod = (x, y, z, r, col) => { mb.cyl(x, y, z, r + 1.2, r + 1.2, 0.35, 14, C(BC.woodL)); mb.cyl(x, y + 0.35, z, r, r, 2.6, 12, C('#c8a070')); for (let k = 0; k < 4; k++) mb.cyl(x, y + 0.55 + k * 0.62, z, r + 0.02, r + 0.02, 0.06, 12, C(BC.woodD), false); X.cone(x, y + 2.95, z, r + 0.6, 2.2, col); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; mb.box(x + Math.cos(a) * (r + 1.05) - 0.06, y + 0.35, z + Math.sin(a) * (r + 1.05) - 0.06, x + Math.cos(a) * (r + 1.05) + 0.06, y + 1.3, z + Math.sin(a) * (r + 1.05) + 0.06, C(BC.woodD), true, true); } mb.tor([x, y + 1.3, z], r + 1.05, 0.06, 20, 3, C(BC.woodL)); mb.push([x, y + 0.35, z + r]); H.window(0, 1.5, 0, 0.6, 0.6, 1, true); mb.pop(); };
      // the first deck wraps the trunk, reached by a ramp spiralling up
      mb.cyl(0, 7, 0, 5.6, 5.6, 0.35, 16, C(BC.woodL));
      for (let k = 0; k < 20; k++) { const a0 = k / 20 * 6.28, a1 = (k + 1) / 20 * 6.28, y0 = k / 20 * 7, y1 = (k + 1) / 20 * 7, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r]; mb.quad(P(a0, 3.6, y0), P(a0, 5.6, y0), P(a1, 5.6, y1), P(a1, 3.6, y1), shadeC(C(BC.woodL), k % 2 ? 0.9 : 1)); mb.quad(P(a0, 3.6, y0 - 0.25), P(a1, 3.6, y1 - 0.25), P(a1, 5.6, y1 - 0.25), P(a0, 5.6, y0 - 0.25), C(BC.woodD)); if (k % 2) mb.box(P(a0, 5.5, 0)[0] - 0.06, y0, P(a0, 5.5, 0)[2] - 0.06, P(a0, 5.5, 0)[0] + 0.06, y0 + 1, P(a0, 5.5, 0)[2] + 0.06, C(BC.woodD), true, true); }
      pod(10, 9, 3, 1.8, BC.roofR); pod(-8, 11, -6.5, 1.6, BC.roofB);
      X.ramp([[5.3, 7.35, 1.2], [8.2, 9.35, 2.6]], 1.4, BC.woodL, true); X.ramp([[-3.8, 7.35, -3.6], [-6.5, 11.35, -5.6]], 1.4, BC.woodL, true);
      mb.cyl(10, -0.5, 3, 0.4, 0.3, 9.6, 6, barkD); mb.cyl(-8, -0.5, -6.5, 0.4, 0.3, 11.6, 6, barkD);
      for (const [x, y, z] of [[4, 8.6, -4], [-5, 8.6, 3], [10, 10.6, 5]]) { mb.cyl(x, y, z, 0.03, 0.03, 0.6, 3, C('#3a3f55')); mb.box(x - 0.15, y - 0.3, z - 0.15, x + 0.15, y, z + 0.15, glowC(C('#ffe08a'))); }
      s.lights.push({ p: L(0, 9, 4), r: 10, c: [1, 0.8, 0.45] }, { p: L(10, 11, 3), r: 7, c: [1, 0.8, 0.45] }); item('relic', -8, 11.9, -4.2); break;
    }
    case 'cabin': { // A-frame lodge: two steep roof sides down to the ground, a big glass front, a deck on posts, a fire pit with log seats, a canoe on a rack and an outhouse
      const D = 4.5, W = 4.6, Hh = 7.4;
      mb.quad([W, 0, D], [W, 0, -D], [0, Hh, -D], [0, Hh, D], C('#4a3a34')); mb.quad([-W, 0, -D], [-W, 0, D], [0, Hh, D], [0, Hh, -D], C('#4a3a34'));
      for (const sd of [-1, 1]) for (let k = 1; k < 9; k++) { const t = k / 9; mb.box(sd * W * (1 - t) - 0.15, Hh * t - 0.05, -D - 0.25, sd * W * (1 - t) + 0.15, Hh * t + 0.05, D + 0.25, C('#3a2c28'), true, true); }
      mb.box(-0.3, Hh - 0.2, -D - 0.3, 0.3, Hh + 0.2, D + 0.3, C('#2c2220'));
      mb.tri([-W, 0, -D], [0, Hh, -D], [W, 0, -D], C(BC.woodL));
      mb.tri([W - 0.3, 0.3, D - 0.2], [0, Hh - 0.5, D - 0.2], [-W + 0.3, 0.3, D - 0.2], glowC(C('#ffd890')));
      for (let k = -2; k <= 2; k++) { const x = k * 1.4; mb.box(x - 0.08, 0.3, D - 0.15, x + 0.08, Hh - 0.5 - Math.abs(x) * Hh / W, D - 0.05, C(BC.woodD), true, true); } for (const y of [2.2, 4.4]) mb.box(-W * (1 - y / Hh) + 0.3, y - 0.07, D - 0.15, W * (1 - y / Hh) - 0.3, y + 0.07, D - 0.05, C(BC.woodD), true, true);
      mb.box(-0.6, 0, D - 0.3, 0.6, 2.1, D - 0.1, C(BC.door), true, true);
      mb.cyl(-2.2, 4.5, -1.5, 0.22, 0.22, 4, 8, C(BC.metalD)); mb.cyl(-2.2, 8.5, -1.5, 0.4, 0, 0.4, 8, C(BC.metalD));
      // the deck on posts with a railing and steps
      H.flatBox(-W, 0.6, D, W, 0.85, D + 3.4, BC.woodL); for (const x of [-W + 0.2, 0, W - 0.2]) for (const z of [D + 0.2, D + 3.2]) mb.box(x - 0.12, -0.5, z - 0.12, x + 0.12, 0.6, z + 0.12, C(BC.woodD));
      for (const [x0, x1] of [[-W, -0.9], [0.9, W]]) { H.flatBox(x0, 1.7, D + 3.3, x1, 1.82, D + 3.42, BC.woodL); for (let x = x0; x <= x1; x += 0.5) H.deco(x - 0.04, 0.85, D + 3.32, x + 0.04, 1.7, D + 3.4, BC.woodL); }
      for (let k = 0; k < 3; k++) H.flatBox(-0.9, -0.2, D + 3.4 + k * 0.45, 0.9, 0.6 - k * 0.22, D + 3.85 + k * 0.45, BC.woodD);
      // a fire pit with log seats
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; mb.ico(5 + Math.cos(a) * 1.0, 0.1, 9 + Math.sin(a) * 1.0, [0.3, 0.22, 0.25], 0, () => C('#7a7a80')); }
      mb.cone(5, 0.1, 9, 0.5, 1.0, 6, glowC(C('#ffa03a'))); mb.cone(5, 0.15, 9, 0.28, 0.7, 5, glowC(C('#fff0a0')));
      for (const a of [0.3, 2.4, 4.4]) { mb.push([5 + Math.cos(a) * 2.6, 0.3, 9 + Math.sin(a) * 2.6], M4.mul3(M4.rotY(-a), M4.rotX(Math.PI / 2))); mb.cyl(0, -0.8, 0, 0.3, 0.3, 1.6, 8, C(BC.wood)); mb.pop(); }
      // the canoe on its rack, and the outhouse
      for (const z of [-1, 1]) { H.flatBox(-8.2 + z * 0, -0.4, -2.6 + z * 0.9, -8.0, 1.2, -2.4 + z * 0.9, BC.woodD); H.flatBox(-6.2, -0.4, -2.6 + z * 0.9, -6.0, 1.2, -2.4 + z * 0.9, BC.woodD); }
      H.flatBox(-8.3, 1.1, -3.6, -5.9, 1.25, -1.4, BC.woodD);
      mb.push([-7.1, 1.25, -2.5], M4.mul3(M4.rotY(Math.PI / 2), M4.rotZ(Math.PI / 2)), [1, 1, 1]); mb.push([0, 0, 0], null, [0.5, 1, 0.45]); mb.lathe([[0, -2.6], [0.45, -1.8], [0.7, 0], [0.45, 1.8], [0, 2.6]], 10, smoothC(C('#d8483a')), 0); mb.pop(); mb.pop();
      mb.push([-6, 0, -7], M4.rotY(0.6)); H.flatBox(-0.8, -0.3, -0.8, 0.8, 2.4, 0.8, BC.wood); X.pyroof(0, 2.4, 0, 0.8, 0.9, '#4a3a34', 0.2); H.deco(-0.5, 0, 0.8, 0.5, 2.0, 0.86, BC.door); mb.ico(0, 1.7, 0.88, [0.1, 0.14, 0.02], 0, () => glowC(C('#ffe08a'))); mb.pop();
      s.lights.push({ p: L(0, 2.5, D + 1), r: 10, c: [1, 0.8, 0.45] }, { p: L(5, 1, 9), r: 8, c: [1, 0.6, 0.3] }); item('mushroom', 5, 0.6, 12); break;
    }
    case 'pyramid': { // sun temple: a big plinth with steps, a hall under a golden-banded dome, four slim minarets, an arched porch and a pool with palms
      const sd = BC.sandD, sa = BC.sand;
      H.box(-13, -1.2, -13, 13, 1.2, 13, sd); for (let k = 0; k < 4; k++) H.flatBox(-4, -1, 13 + k * 0.7, 4, 1.2 - (k + 1) * 0.5, 13.7 + k * 0.7, sa);
      H.flatBox(-6.5, 1.2, -6.5, 6.5, 7.5, 6.5, '#e8cc90'); for (let k = 0; k < 6; k++) H.deco(-6.55, 2 + k, -6.55, 6.55, 2.08 + k, 6.55, sd);
      mb.cyl(0, 7.5, 0, 6.8, 6.8, 0.6, 16, C(sd)); mb.push([0, 8.1, 0]); mb.lathe([[6.2, 0], [6.1, 1.6], [5.4, 3.4], [4.0, 4.9], [2.2, 5.8], [0, 6.1]], 18, (t, ph) => smoothC(t > 0.28 && t < 0.36 ? C(BC.gold) : C('#f0dca8')), 0); mb.pop();
      mb.cyl(0, 14.2, 0, 0.7, 0.5, 1.2, 8, C(sa)); mb.cyl(0, 15.4, 0, 0.6, 0, 1.4, 8, glowC(C(BC.gold)));
      for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) { mb.cyl(x, 1.2, z, 1.2, 0.9, 13, 10, C('#ecd49a')); mb.cyl(x, 10, z, 1.6, 1.6, 0.35, 10, C(sd)); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; H.deco(x + Math.cos(a) * 1.5 - 0.05, 10.35, z + Math.sin(a) * 1.5 - 0.05, x + Math.cos(a) * 1.5 + 0.05, 10.9, z + Math.sin(a) * 1.5 + 0.05, sd); }
        mb.push([x, 14.2, z]); mb.lathe([[1.0, 0], [1.05, 0.5], [0.7, 1.2], [0, 1.6]], 10, smoothC(C(BC.gold)), 0); mb.pop(); mb.cyl(x, 15.7, z, 0.05, 0.05, 0.9, 4, C(BC.gold)); }
      for (let k = 0; k < 5; k++) { const x = -5.2 + k * 2.6; mb.cyl(x - 1.3, 1.2, 8.2, 0.35, 0.32, 3.4, 8, C(sa)); X.arch(x, 4.6, 7.8, 8.6, 1.0, 0.45, sa, 7); } mb.cyl(5.2 + 1.3, 1.2, 8.2, 0.35, 0.32, 3.4, 8, C(sa)); H.box(-6.9, 6.0, 7.6, 6.9, 6.6, 8.8, sd); H.flatBox(-6.5, 1.2, 6.5, 6.5, 1.3, 8.8, sa);
      H.flatBox(-1.4, 1.2, 6.49, 1.4, 4.4, 6.55, '#2a2016'); X.arch(0, 4.4, 6.45, 6.6, 1.3, 0.35, sd, 7); mb.ico(0, 5.0, 6.6, [0.4, 0.3, 0.05], 0, () => glowC(C('#5ae8d8')));
      H.box(-3.5, 1.15, 9.6, 3.5, 1.5, 12.4, sd); mb.box(-3.1, 1.45, 10, 3.1, 1.48, 12, glowC(C('#4ab8e8')));
      X.palm(-5, 10.5, 5, 0.8); X.palm(5, 11.5, 4.5, -0.7); X.palm(-9, 3, 5.5, 0.5);
      for (const sx of [-1, 1]) H.torch(sx * 4.5, 13.5, 1.8);
      s.lights.push({ p: L(0, 15, 0), r: 12, c: [1, 0.8, 0.3] }, { p: L(0, 3, 9), r: 9, c: [1, 0.7, 0.3] }); item('gem', 0, 1.9, 11); item('coin', 9, 1.9, 9); break;
    }
    case 'pod': { // crashed starship: a long hull broken in two, wings, glowing engines, a cracked cockpit, a scorched trench behind it, a survival tent and a blinking beacon
      const hull = C('#d4d8e0'), hd = C('#8a92a0'), acc = C('#e85a3a');
      for (let k = 0; k < 14; k++) { const x = -26 + k * 1.6; mb.box(x, -0.3, -1.6 - k * 0.04, x + 1.6, 0.02, 1.6 + k * 0.04, C('#3a3028'), true); mb.ico(x + 0.8, 0.2, 2.6 + k * 0.05, [1, 0.5 + (k % 3) * 0.2, 0.8], 0, () => C('#7a6a58')); mb.ico(x + 0.8, 0.2, -2.6 - k * 0.05, [1, 0.5 + (k % 2) * 0.3, 0.8], 0, () => C('#7a6a58')); }
      const fus = (x0, x1, r0, r1) => { mb.push([0, 0, 0], M4.rotZ(-Math.PI / 2), [1, 1, 0.75]); mb.lathe([[r0, x0], [r0 * 1.05, x0 + (x1 - x0) * 0.3], [r1 * 1.1, x0 + (x1 - x0) * 0.7], [r1, x1]], 12, (t, ph) => Math.floor(t * 6) % 2 && Math.cos(ph * 2) > 0.85 ? hd : Math.abs(Math.sin(ph)) < 0.12 ? acc : hull, 0); mb.pop(); };
      // the back half: engines and wings
      mb.push([-4.5, 1.6, 0], M4.mul3(M4.rotY(0.12), M4.rotZ(0.05))); fus(-5, 1, 1.9, 2.1);
      for (const sd of [-1, 1]) { mb.push([-5.0, -0.3, sd * 1.2], M4.rotZ(Math.PI / 2)); mb.cyl(0, 0, 0, 0.8, 0.65, 1.0, 12, hd); mb.cyl(0, -0.02, 0, 0.6, 0.6, 0.04, 12, glowC(C('#5ae8ff'))); mb.pop();
        mb.quad([-3.5, -0.4, sd * 1.4], [0.5, -0.4, sd * 1.6], [-1.5, -0.6, sd * 7.5], [-4.2, -0.6, sd * 7.5], hull); mb.quad([-4.2, -0.75, sd * 7.5], [-1.5, -0.75, sd * 7.5], [0.5, -0.55, sd * 1.6], [-3.5, -0.55, sd * 1.4], hd); mb.quad([-4.2, -0.6, sd * 7.5], [-1.5, -0.6, sd * 7.5], [-1.5, -0.75, sd * 7.5], [-4.2, -0.75, sd * 7.5], acc);
        mb.box(-4.4, -0.65, sd * 7.5 - 0.15, -1.4, 0.5, sd * 7.5 + 0.15, acc); }
      mb.quad([-4.5, 1.6, 0], [-2, 1.6, 0], [-3.8, 4.4, 0], [-4.8, 4.4, 0], hull); mb.quad([-2, 1.6, 0], [-4.5, 1.6, 0], [-4.8, 4.4, 0], [-3.8, 4.4, 0], hd);
      mb.pop();
      // the front half, tipped nose-down into the sand with a cracked canopy
      mb.push([4.8, 1.0, 1.0], M4.mul3(M4.rotY(-0.35), M4.rotZ(-0.22))); fus(-1, 6, 2.0, 0.2);
      mb.push([1.6, 1.2, 0], null, [1.4, 0.7, 0.9]); mb.sph([0, 0, 0], 1.0, 12, (x, y) => y > 0 ? C('#4ab8e8') : hd, 0); mb.pop();
      for (let k = 0; k < 4; k++) mb.caps([1.2 + k * 0.3, 1.9, -0.6 + k * 0.4], [1.8 + k * 0.2, 1.7, -0.2 + k * 0.3], 0.02, 0.02, 3, C('#ffffff'));
      for (let k = 0; k < 5; k++) mb.box(-1.1, -1.2 + k * 0.5, -1.5, -0.95, -1.0 + k * 0.5, 1.5, glowC(C(k % 2 ? '#ff7a3a' : '#5ae8ff')), true, true);
      mb.pop();
      for (let k = 0; k < 10; k++) { const a = rnd(k) * 6.28, d = 7 + rnd(k + 9) * 6; mb.push([Math.cos(a) * d, 0.1, Math.sin(a) * d], M4.mul3(M4.rotY(a), M4.rotZ((rnd(k + 2) - 0.5) * 0.8))); mb.box(-0.6, -0.1, -0.4, 0.6, 0.1, 0.4, k % 3 ? hull : hd); mb.pop(); }
      // the survival camp: a tent, crates, and a beacon with a blinking light
      mb.push([6, 0, 9], M4.rotY(-0.5)); mb.quad([-1.4, 0, 1.2], [1.4, 0, 1.2], [1.4, 1.8, 0], [-1.4, 1.8, 0], C('#ff8a2a')); mb.quad([1.4, 0, -1.2], [-1.4, 0, -1.2], [-1.4, 1.8, 0], [1.4, 1.8, 0], C('#e8702a')); mb.tri([-1.4, 0, 1.2], [-1.4, 1.8, 0], [-1.4, 0, -1.2], C('#c85a1a')); mb.tri([1.4, 0, -1.2], [1.4, 1.8, 0], [1.4, 0, 1.2], C('#c85a1a')); mb.pop();
      H.crate(3.4, 10.5); H.crate(3.9, 11.4, 0.6); mb.cyl(9, 0, 6, 0.1, 0.06, 3.2, 5, C(BC.metalD)); for (let k = 0; k < 3; k++) mb.caps([9, 0, 6], [9 + Math.cos(k * 2.1) * 1.1, 0, 6 + Math.sin(k * 2.1) * 1.1], 0.05, 0.05, 3, C(BC.metalD)); mb.ico(9, 3.35, 6, 0.22, 1, () => glowC(C('#ff3a4a')));
      s.lights.push({ p: L(-9, 1.2, 0), r: 8, c: [0.4, 0.9, 1] }, { p: L(9, 3.4, 6), r: 8, c: [1, 0.3, 0.3] }); item('relic', 6, 0.6, 12); break;
    }
    case 'igloo': { // snow fort: block walls with battlements, two round snow towers with flags, a gate, a little igloo inside, snowball piles and a snowman guard
      const sn = '#eef4fc', sb = '#dce8f6';
      const blocks = (x0, z0, x1, z1) => X.wall(x0, z0, x1, z1, 1.0, () => 2.2, sn, 2.2);
      blocks(-7, -7, 7, -7); blocks(-7, -7, -7, 7); blocks(7, -7, 7, 7); X.wall(-7, 7, 7, 7, 1.0, () => 2.2, sn, 2.2, t => Math.abs(t - 0.5) < 0.12);
      for (const sx of [-1, 1]) { const x = sx * 7, z = 7; mb.cyl(x, -0.5, z, 1.9, 1.7, 4.5, 12, C(sb)); for (let k = 0; k < 7; k++) mb.cyl(x, k * 0.6, z, 1.92 - k * 0.03, 1.92 - k * 0.03, 0.05, 12, C('#c8d8ec'), false); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; if (k % 2) mb.box(x + Math.cos(a) * 1.6 - 0.35, 4, z + Math.sin(a) * 1.6 - 0.35, x + Math.cos(a) * 1.6 + 0.35, 4.7, z + Math.sin(a) * 1.6 + 0.35, C(sn)); }
        mb.cyl(x, 4, z, 0.05, 0.05, 2.4, 4, C(BC.woodD)); mb.tri2([x, 6.3, z], [x + 1.2, 6.0, z], [x, 5.6, z], C(sx > 0 ? '#3a8ae8' : '#e8343a')); }
      mb.ico(-2, -0.4, -3, 2.6, 2, (x, y, z) => { const a = Math.atan2(z, x), row = Math.floor((y + 0.1) * 5); return shadeC(C(sn), (Math.floor(a * 3 + (row % 2) * 0.5) + row) % 2 ? 0.93 : 1.0); }, false, m => m[1] > -0.1);
      mb.push([-2, -0.4, -0.3]); mb.lathe([[1.1, 0], [1.1, 0.9], [0.7, 1.45], [0, 1.6]], 10, C(sb)); mb.pop(); H.flatBox(-2.5, -0.4, 0.75, -1.5, 0.9, 0.82, '#2a3a4a');
      for (const [x, z] of [[3, -4], [4.5, 2]]) for (let k = 0; k < 10; k++) { const lv = k < 6 ? 0 : k < 9 ? 1 : 2, i = lv === 0 ? k : lv === 1 ? k - 6 : 0; mb.sph([x + (i % 3) * 0.42 - 0.42 + lv * 0.21, 0.2 + lv * 0.36, z + Math.floor(i / 3) * 0.42 - 0.2 + lv * 0.2], 0.22, 6, C('#ffffff'), 0); }
      const sx2 = 3.2, sz2 = 8.6; mb.ico(sx2, 0.5, sz2, 0.9, 1, () => C(BC.snow)); mb.ico(sx2, 1.75, sz2, 0.62, 1, () => C(BC.snow)); mb.ico(sx2, 2.7, sz2, 0.42, 1, () => C(BC.snow));
      mb.cyl(sx2, 3.0, sz2, 0.32, 0.38, 0.45, 8, C('#8a8f98')); for (const ex of [-0.15, 0.15]) mb.ico(sx2 + ex, 2.82, sz2 + 0.38, 0.05, 0, () => C('#22262e')); mb.push([sx2, 2.7, sz2 + 0.42], M4.rotX(Math.PI / 2)); mb.cyl(0, 0, 0, 0.07, 0, 0.4, 5, C('#ff8a3a')); mb.pop();
      MB.tube(mb, [[sx2 + 0.55, 1.8, sz2], [sx2 + 1.0, 1.6, sz2 + 0.4], [sx2 + 1.1, 3.0, sz2 + 0.5]], 0.05, 4, C(BC.woodD)); mb.box(sx2 + 0.9, 2.5, sz2 + 0.35, sx2 + 1.3, 2.56, sz2 + 0.65, C(BC.woodD));
      s.lights.push({ p: L(-2, 1, 0.5), r: 7, c: [1, 0.8, 0.5] }); item('crystal', -2, 0.6, 2); break;
    }
    case 'frozen': { // ice palace: a hexagon floor of ice, six tall pointed spires joined by ice arches, and a glowing frozen throne in the middle
      const ice = C('#bfe0f8'), iceL = C('#e4f4ff');
      mb.cyl(0, -0.6, 0, 9.5, 9.8, 1.4, 6, C('#d8ecfa'), true, 0.52); mb.cyl(0, 0.79, 0, 8.6, 8.6, 0.03, 6, glowC(C('#9ad8ff')), true, 0.52);
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + 0.52, x = Math.cos(a) * 8, z = Math.sin(a) * 8, h = 7 + (k % 3) * 2.5;
        mb.cyl(x, 0.8, z, 1.1, 0.8, h, 6, ice, true, a); mb.cyl(x, 0.8 + h, z, 0.8, 0, 3.2, 6, iceL, true, a); mb.cyl(x, 1, z, 0.35, 0.25, h, 6, glowC(C('#8ff6ff')), true, a + 0.3);
        const b = (k + 1) / 6 * 6.283 + 0.52, nx = Math.cos(b) * 8, nz = Math.sin(b) * 8, mx = (x + nx) / 2, mz = (z + nz) / 2; mb.push([mx, 5.2, mz], M4.rotY(-Math.atan2(nz - z, nx - x))); X.arch(0, 0, -0.35, 0.35, 3.3, 0.5, '#d4ecfc', 9); mb.pop();
        for (let q = 0; q < 4; q++) mb.cyl(mx + (q - 1.5) * (nx - x) / 6, 4.6 - (q % 2) * 0.4, mz + (q - 1.5) * (nz - z) / 6, 0, 0.12, 0.8, 4, glowC(iceL)); }
      mb.box(-1.4, 0.8, -1.2, 1.4, 1.8, 1.2, ice); mb.box(-1.4, 1.8, -1.2, 1.4, 5, -0.7, ice); for (let k = 0; k < 5; k++) mb.cyl(-1.1 + k * 0.55, 5, -0.95, 0.2, 0, 1 + (k % 2 ? 0.4 : 1.1), 4, glowC(C('#8ff6ff'))); for (const sx of [-1.4, 1.1]) mb.box(sx, 1.8, -1.2, sx + 0.3, 2.6, 1.2, iceL);
      for (let k = 0; k < 5; k++) { const a = k * 1.256 + 0.3; mb.ico(Math.cos(a) * 12, -0.3, Math.sin(a) * 12, [2.5, 0.8, 1.6], 1, () => C(BC.snow)); }
      s.lights.push({ p: L(0, 4, 0), r: 14, c: [0.5, 0.85, 1] }); item('gem', 0, 2.4, 0.4); break;
    }
    case 'stilts': { // swamp witch house: a crooked two-floor house on a giant stump, a twisted roof and chimney, a zig-zag boardwalk, a glowing cauldron and green lanterns
      const bark = C('#5a4430');
      mb.lathe([[4.6, -1], [3.6, 0.4], [3.3, 2], [3.4, 3.4], [0, 3.5]], 12, (t, ph) => shadeC(bark, 0.82 + 0.18 * Math.cos(ph * 8)), 0.1); for (let k = 0; k < 6; k++) { const a = k * 1.05; MB.tube(mb, [[Math.cos(a) * 3, 1, Math.sin(a) * 3], [Math.cos(a) * 4.6, -0.2, Math.sin(a) * 4.6], [Math.cos(a) * 5.8, -0.6, Math.sin(a) * 5.8]], t => 0.6 - t * 0.4, 6, bark); }
      mb.cyl(0, 3.45, 0, 3.0, 3.0, 0.04, 12, C('#c8a070'), true); for (let k = 0; k < 4; k++) mb.tor([0, 3.5, 0], 0.7 + k * 0.6, 0.02, 14, 3, C('#a8805a'));
      mb.push([0, 3.5, 0], M4.rotY(0.15)); H.flatBox(-2.4, 0, -2.2, 2.4, 2.8, 2.2, '#6a7a5a'); for (let k = 0; k < 7; k++) H.deco(-2.42, 0.1 + k * 0.4, 2.2, 2.42, 0.14 + k * 0.4, 2.26, '#4a5a3a'); H.door(0, 2.2, 1.0, 2.0); mb.ico(-1.4, 1.6, 2.24, [0.4, 0.4, 0.04], 0, () => glowC(C('#9aff6a'))); mb.pop();
      mb.push([0.2, 6.3, 0], M4.mul3(M4.rotY(-0.25), M4.rotZ(0.08))); H.flatBox(-2, 0, -1.8, 2, 2.2, 1.8, '#7a8a62'); mb.ico(0, 1.2, 1.84, [0.4, 0.4, 0.04], 0, () => glowC(C('#9aff6a'))); mb.pop();
      mb.push([0.4, 8.5, 0], M4.mul3(M4.rotY(0.3), M4.rotZ(-0.12))); X.pyroof(0, 0, 0, 2.2, 4.2, '#3a3448', 0.4); mb.pop();
      MB.tube(mb, [[1.4, 8, -1], [1.6, 10, -1.1], [1.2, 11.2, -0.8], [1.5, 12, -0.6]], 0.28, 6, C('#6a5a5a')); mb.cyl(1.5, 12, -0.6, 0.38, 0.38, 0.2, 6, C('#4a3a3a'));
      X.ramp([[8, 0, 6], [3.5, 1.8, 6], [3.5, 3.5, 2.7]], 1.4, '#7a6a4a', true); for (const [x, z] of [[6.5, 5.5], [5, 6.6], [3, 5], [4, 4]]) mb.box(x - 0.08, -0.6, z - 0.08, x + 0.08, 2, z + 0.08, C('#4a3a2a'));
      mb.push([-5, 0, 4]); mb.lathe([[0, 0], [0.7, 0.15], [0.85, 0.6], [0.7, 0.95]], 10, C('#2a2a30'), 0); mb.cyl(0, 0.85, 0, 0.66, 0.66, 0.04, 10, glowC(C('#7aff5a'))); for (let k = 0; k < 4; k++) mb.sph([Math.cos(k * 1.6) * 0.3, 0.95, Math.sin(k * 1.6) * 0.3], 0.1 + (k % 2) * 0.05, 6, glowC(C('#b8ff9a')), 0); for (let k = 0; k < 3; k++) { const a = k * 2.1; mb.caps([Math.cos(a) * 0.75, 0.6, Math.sin(a) * 0.75], [Math.cos(a) * 1.0, -0.1, Math.sin(a) * 1.0], 0.06, 0.05, 4, C('#2a2a30')); } mb.pop();
      for (let k = 0; k < 5; k++) { const a = k * 1.4 + 0.5; mb.cone(-5 + Math.cos(a) * 1.4, -0.1, 4 + Math.sin(a) * 1.4, 0.18, 0.6, 5, C('#4a3a2a')); }
      for (const [x, y, z] of [[2.6, 6, 2.4], [-2.6, 7, 1.8], [7.6, 2.2, 6.5]]) { mb.cyl(x, y, z, 0.03, 0.03, 0.6, 3, C('#2a2a30')); mb.box(x - 0.16, y - 0.36, z - 0.16, x + 0.16, y, z + 0.16, glowC(C('#9aff6a'))); }
      for (let k = 0; k < 3; k++) { const x = -3 + k * 1.1, z = -3.5 - k * 0.6; mb.sph([x, 0.3, z], [0.45, 0.35, 0.45], 8, (nx, ny, nz) => smoothC(shadeC(C('#ff8a2a'), 0.85 + Math.abs(Math.cos(Math.atan2(nz, nx) * 4)) * 0.2)), 0); mb.cyl(x, 0.6, z, 0.05, 0.04, 0.2, 4, C('#4a7a3a')); }
      mb.push([2.6, 3.5, 2.6], M4.rotZ(0.25)); mb.cyl(0, 0, 0, 0.04, 0.04, 2, 4, C(BC.woodD)); for (let k = 0; k < 8; k++) mb.caps([0, 0.15, 0], [Math.cos(k) * 0.2, -0.35, Math.sin(k) * 0.2], 0.02, 0.01, 3, C('#c8a050')); mb.pop();
      s.lights.push({ p: L(-5, 1.5, 4), r: 8, c: [0.5, 1, 0.4] }, { p: L(0, 6, 3), r: 8, c: [0.5, 1, 0.4] }); item('mushroom', 0, 4.2, 1.6); break;
    }
    case 'arch': { // floating crystals: three rock islands hanging in the air with crystals on top, light beams down to a ring of crystal pillars and a tall crystal in the middle
      const isl = (x, y, z, r) => { mb.ico(x, y, z, [r, r * 0.35, r], 1, (q, w) => w > 0.3 ? C('#6aa85a') : shadeC(C('#6a5a7a'), 0.85 + w * 0.2), false, m => m[1] > 0); mb.push([x, y, z]); mb.lathe([[0, -r * 1.6], [r * 0.4, -r * 1.0], [r * 0.85, -r * 0.4], [r, 0]], 8, (t, ph) => shadeC(C('#5a4a6a'), 0.8 + t * 0.25 + Math.cos(ph * 5) * 0.05), 0); mb.pop();
        for (let k = 0; k < 5; k++) { const a = k * 1.3, d = k ? r * 0.45 : 0; mb.push([x + Math.cos(a) * d, y + r * 0.3, z + Math.sin(a) * d], M4.rotZ(k ? (k % 2 ? 0.3 : -0.3) : 0)); mb.cyl(0, 0, 0, r * 0.14, r * 0.15, r * (k ? 0.6 : 1.1), 6, glowC(C(k % 2 ? '#c08fff' : '#8ff6ff')), false, k); mb.cyl(0, r * (k ? 0.6 : 1.1), 0, r * 0.15, 0, r * 0.3, 6, glowC(C('#f0e8ff')), true, k); mb.pop(); } };
      isl(-7, 9, -3, 3.2); isl(6, 12, -5, 2.6); isl(1, 15, 6, 2.2);
      for (const [x, y, z] of [[-7, 4, -3], [6, 7, -5], [1, 11.2, 6]]) mb.cyl(x, 0, z, 0.08, 0.08, y, 5, glowC(C('#c8a8ff')));
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; mb.push([Math.cos(a) * 10, -0.3, Math.sin(a) * 10], M4.rotZ(Math.sin(a) * 0.15)); mb.cyl(0, 0, 0, 0.6, 0.45, 2.5 + (k % 3) * 1.2, 6, glowC(C(k % 2 ? '#c08fff' : '#8ff6ff')), false, k); mb.cyl(0, 2.5 + (k % 3) * 1.2, 0, 0.45, 0, 1, 6, glowC(C('#f0e8ff')), true, k); mb.pop(); }
      mb.ico(0, 0.3, 0, [2.2, 0.8, 2.2], 1, (q, w) => shadeC(C('#6a5a7a'), 0.85 + w * 0.2)); mb.cyl(0, 0.6, 0, 0.9, 0.7, 6, 6, glowC(C('#8ff6ff'))); mb.cyl(0, 6.6, 0, 0.7, 0, 2.4, 6, glowC(C('#f0e8ff')));
      s.lights.push({ p: L(0, 6, 0), r: 14, c: [0.7, 0.5, 1] }); item('crystal', 3, 0.6, 3); item('gem', -3, 0.6, 2); break;
    }
    case 'shroomring': { // mushroom house: a giant red-and-white mushroom with a home in its stem, a ramp curling up to a balcony, a chimney through the cap and a glowing garden
      const stem = C('#f2e8d8');
      mb.lathe([[3.2, -0.6], [2.7, 1], [2.4, 4], [2.6, 7], [3.2, 7.6], [0, 7.7]], 16, (t, ph) => shadeC(stem, 0.9 + 0.1 * Math.cos(ph * 10)), 0.1);
      mb.push([0, 7.4, 0]); mb.lathe([[3.4, 0], [5.8, -0.2], [7.0, 0.4]], 18, smoothC(C('#f4e8d0')), 0); mb.lathe([[7.0, 0.4], [7.1, 0.9], [6.4, 2.4], [4.8, 3.8], [2.6, 4.7], [0, 5.0]], 20, smoothC(C('#d8342a')), 0.1); mb.pop();
      for (let k = 0; k < 14; k++) { const a = k * 2.39996, r = 1.4 + (k % 5) * 1.1, y = 7.4 + 5.0 - (r / 7) * (r / 7) * 4.5; mb.sph([Math.cos(a) * r, y, Math.sin(a) * r], [0.55, 0.18, 0.55], 8, smoothC(C('#ffffff')), 0); }
      mb.push([0, 0, 2.55]); H.door(0, 0.02, 1.2, 2.2); mb.pop(); for (const [a, y] of [[0.6, 3.2], [2.4, 2.4], [4.1, 4.8], [5.4, 2.8]]) { mb.push([Math.cos(a) * 2.42, 0, Math.sin(a) * 2.42], M4.rotY(Math.PI / 2 - a)); H.window(0, y, 0, 0.6, 0.6, 1, true); mb.pop(); }
      for (let k = 0; k < 20; k++) { const a0 = k / 20 * 6.28 + 1.6, a1 = (k + 1) / 20 * 6.28 + 1.6, y0 = k / 20 * 5.6, y1 = (k + 1) / 20 * 5.6, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r]; mb.quad(P(a0, 2.6, y0), P(a0, 4.2, y0), P(a1, 4.2, y1), P(a1, 2.6, y1), shadeC(C(BC.woodL), k % 2 ? 0.9 : 1)); mb.quad(P(a0, 2.6, y0 - 0.2), P(a1, 2.6, y1 - 0.2), P(a1, 4.2, y1 - 0.2), P(a0, 4.2, y0 - 0.2), C(BC.woodD)); if (k % 2) mb.box(P(a0, 4.1, 0)[0] - 0.05, y0, P(a0, 4.1, 0)[2] - 0.05, P(a0, 4.1, 0)[0] + 0.05, y0 + 0.9, P(a0, 4.1, 0)[2] + 0.05, C(BC.woodD), true, true); }
      mb.cyl(0, 5.6, 0, 4.4, 4.4, 0.3, 16, C(BC.woodL)); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; mb.box(Math.cos(a) * 4.3 - 0.05, 5.9, Math.sin(a) * 4.3 - 0.05, Math.cos(a) * 4.3 + 0.05, 6.8, Math.sin(a) * 4.3 + 0.05, C(BC.woodD), true, true); } mb.tor([0, 6.8, 0], 4.3, 0.06, 20, 3, C(BC.woodL));
      mb.cyl(2.2, 10, -2, 0.35, 0.35, 3.2, 8, C('#8a7a6a')); mb.cyl(2.2, 13.2, -2, 0.5, 0.5, 0.2, 8, C('#6a5a4a'));
      for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283 + rnd(k) * 0.3, r = 6 + rnd(k + 5) * 4, h = 0.3 + rnd(k + 9) * 0.6, col = k % 3 ? '#9aff6a' : '#ff9ad8'; mb.cyl(Math.cos(a) * r, -0.05, Math.sin(a) * r, 0.07, 0.06, h, 5, C('#f4ead8'), false); mb.push([Math.cos(a) * r, h - 0.05, Math.sin(a) * r]); mb.lathe([[0.3, 0], [0.25, 0.15], [0, 0.22]], 7, glowC(C(col)), 0); mb.pop(); }
      for (let k = 0; k < 7; k++) mb.cyl(0, -0.05, 3.5 + k * 1.1, 0.45, 0.45, 0.1, 7, C('#b8b0a0'), true, k);
      mb.cyl(1.8, 0, 9, 0.08, 0.08, 1.1, 5, C(BC.woodD)); mb.push([1.8, 1.1, 9]); mb.lathe([[0.3, 0], [0.32, 0.15], [0.2, 0.35], [0, 0.4]], 8, smoothC(C('#d8342a')), 0); mb.pop();
      s.lights.push({ p: L(0, 3, 3.5), r: 9, c: [1, 0.85, 0.5] }); item('mushroom', 3.4, 6.4, 0); item('crystal', 6, 0.6, 3); break;
    }
    case 'wreck': { // pirate wreck: a big ship lying on its side in the sand with its masts flat along the beach, torn sails, a camp with a fire, a map table and treasure
      mb.push([0, 0.8, 0], M4.mul3(M4.rotX(1.2), M4.rotZ(0.05)));
      boatHull(mb, 20, 7, 3, 1);
      for (const [x, h] of [[-4, 10], [3, 12]]) { mb.cyl(x, 3, 0, 0.35, 0.28, h, 8, C(BC.woodD)); mb.push([x, 3 + h * 0.7, 0], M4.rotX(Math.PI / 2)); mb.cyl(0, -2.6, 0, 0.12, 0.12, 5.2, 5, C(BC.woodD)); mb.pop();
        for (let k = 0; k < 4; k++) { const z0 = -2.5 + k * 1.25, z1 = z0 + 1.25, cut = k === 1 || k === 3 ? 1.5 : 0; mb.tri2([x + 0.2, 3 + h * 0.7, z0], [x + 0.2, 3 + h * 0.7, z1], [x + 0.6, 3 + h * 0.3 + cut, z1 * 0.9], C(k % 2 ? '#ece4d0' : '#d8d0bc')); mb.tri2([x + 0.2, 3 + h * 0.7, z0], [x + 0.6, 3 + h * 0.3 + cut, z1 * 0.9], [x + 0.6, 3 + h * 0.3, z0 * 0.9], C(k % 2 ? '#d8d0bc' : '#ece4d0')); }
        mb.tor([x, 3 + h, 0], 0.6, 0.12, 10, 4, C(BC.woodL)); }
      mb.box(-10.5, 3.2, -2.4, -7, 5.4, 2.4, C(BC.wood)); for (let k = 0; k < 3; k++) H.window(-7, 4.3, -1.4 + k * 1.4, 0.6, 0.6, 1, k === 1);
      mb.push([10.5, 3.6, 0], M4.rotZ(-0.5)); mb.cyl(0, 0, 0, 0.18, 0.08, 4, 6, C(BC.woodD)); mb.pop();
      mb.tri2([-10.6, 5.4, -0.3], [-10.6, 7.4, -0.3], [-12, 6.6, -0.3], C('#1a1a22')); mb.ico(-11.2, 6.5, -0.32, [0.25, 0.25, 0.02], 0, () => C('#ffffff'));
      mb.pop();
      // a beach camp: tent, fire, a table with a map, barrels and the treasure chest
      mb.push([-4, 0, 9], M4.rotY(0.4)); mb.quad([1.6, 0, 1.4], [1.6, 0, -1.4], [0, 2, -1.4], [0, 2, 1.4], C('#d8c8a8')); mb.quad([-1.6, 0, -1.4], [-1.6, 0, 1.4], [0, 2, 1.4], [0, 2, -1.4], C('#c8b898')); mb.cyl(0, 0, 1.6, 0.05, 0.05, 2.4, 4, C(BC.woodD)); mb.pop();
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; mb.ico(2 + Math.cos(a) * 0.9, 0.1, 10 + Math.sin(a) * 0.9, [0.25, 0.18, 0.2], 0, () => C('#8a8478')); } mb.cone(2, 0.1, 10, 0.45, 1.0, 6, glowC(C('#ffa03a'))); mb.cone(2, 0.15, 10, 0.25, 0.7, 5, glowC(C('#fff0a0')));
      mb.push([5, 0, 7.5], M4.rotY(-0.3)); H.flatBox(-1, 0.8, -0.6, 1, 0.9, 0.6, BC.woodL); for (const [x, z] of [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]]) H.flatBox(x - 0.05, 0, z - 0.05, x + 0.05, 0.8, z + 0.05, BC.woodD); H.deco(-0.6, 0.9, -0.4, 0.6, 0.92, 0.4, '#f0e2b8'); mb.caps([-0.3, 0.93, -0.2], [0.1, 0.93, 0.1], 0.015, 0.015, 3, C('#c8343a')); mb.caps([0.1, 0.93, -0.1], [0.3, 0.93, 0.1], 0.015, 0.015, 3, C('#c8343a')); mb.caps([0.1, 0.93, 0.1], [0.3, 0.93, -0.1], 0.015, 0.015, 3, C('#c8343a')); mb.pop();
      H.barrel(8, 4); H.barrel(8.8, 5.1); H.crate(7, 2.5);
      mb.push([-9, 0.15, 6], M4.rotY(0.6)); H.flatBox(-0.8, -0.1, -0.6, 0.8, 0.5, 0.6, '#7a4a2a'); mb.push([0, 0.5, -0.6], M4.rotX(-0.9)); mb.lathe([[0.62, 0], [0.5, 0.35], [0, 0.45]], 8, C('#9a6a3a'), 0); mb.pop(); for (const sx of [-0.8, 0.8]) H.deco(sx - 0.05, -0.1, -0.62, sx + 0.05, 0.5, 0.62, BC.gold); for (let k = 0; k < 6; k++) mb.cyl(-0.5 + k * 0.2, 0.5, -0.2 + (k % 2) * 0.3, 0.1, 0.1, 0.06, 8, glowC(C(BC.gold))); mb.pop();
      s.lights.push({ p: L(2, 1, 10), r: 8, c: [1, 0.6, 0.3] }, { p: L(-9, 1, 6), r: 6, c: [1, 0.85, 0.4] }); item('shell', 4, 0.6, 12); item('coin', -9, 1, 6); break;
    }
    case 'lighthouse': { // harbour beacon: a tall open steel tower with criss-cross braces and stairs inside, a lamp cabin on top, a boathouse with a slipway and a lifeboat
      const red = C('#d8443a'), wht = C('#f2f4f8');
      H.box(-4, -0.8, -4, 4, 0.5, 4, '#8a8a90');
      const top = 18, w0 = 3.2, w1 = 1.4, at = (sx, sz, t) => [sx * (w0 + (w1 - w0) * t), 0.5 + (top - 0.5) * t, sz * (w0 + (w1 - w0) * t)];
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let k = 0; k < 6; k++) mb.caps(at(sx, sz, k / 6), at(sx, sz, (k + 1) / 6), 0.18, 0.18, 6, k % 2 ? wht : red);
      for (let k = 0; k < 6; k++) { const t0 = k / 6, t1 = (k + 1) / 6, cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; for (let q = 0; q < 4; q++) { const [ax, az] = cs[q], [bx2, bz] = cs[(q + 1) % 4]; mb.caps(at(ax, az, t0), at(bx2, bz, t1), 0.07, 0.07, 4, C('#3a3f55')); mb.caps(at(bx2, bz, t0), at(ax, az, t1), 0.07, 0.07, 4, C('#3a3f55')); mb.caps(at(ax, az, t1), at(bx2, bz, t1), 0.1, 0.1, 4, k % 2 ? red : wht); } }
      for (let k = 0; k < 12; k++) { const a0 = k * 1.1, y0 = 0.5 + k * 1.45, y1 = y0 + 1.45, r = 0.9; X.ramp([[Math.cos(a0) * r, y0, Math.sin(a0) * r], [Math.cos(a0 + 1.1) * r, y1, Math.sin(a0 + 1.1) * r]], 0.7, '#5a6070'); }
      mb.cyl(0, 0.5, 0, 0.15, 0.15, top, 6, C('#3a3f55'));
      mb.cyl(0, top, 0, 2.6, 2.6, 0.4, 12, C('#3a3f55')); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; mb.box(Math.cos(a) * 2.45 - 0.04, top + 0.4, Math.sin(a) * 2.45 - 0.04, Math.cos(a) * 2.45 + 0.04, top + 1.4, Math.sin(a) * 2.45 + 0.04, C('#3a3f55')); } mb.tor([0, top + 1.4, 0], 2.45, 0.06, 24, 3, C('#3a3f55'));
      mb.box(-1.5, top + 0.4, -1.5, 1.5, top + 1.4, 1.5, red); mb.cyl(0, top + 1.4, 0, 1.3, 1.3, 1.8, 8, glowC(C('#fff2a8'))); for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * 6.283; mb.box(Math.cos(a) * 1.32 - 0.05, top + 1.4, Math.sin(a) * 1.32 - 0.05, Math.cos(a) * 1.32 + 0.05, top + 3.2, Math.sin(a) * 1.32 + 0.05, C('#2a2e3a'), true, true); } mb.cyl(0, top + 3.2, 0, 1.7, 0, 1.4, 8, red); mb.cyl(0, top + 4.6, 0, 0.04, 0.04, 1, 4, C('#3a3f55'));
      // the boathouse with a slipway and a lifeboat
      mb.push([8, 0, 2], M4.rotY(Math.PI / 2)); H.flatBox(-3, -0.4, -2.5, 3, 3.2, 2.5, '#e8e4dc'); for (let k = 0; k < 7; k++) H.deco(-3.02, 0.2 + k * 0.45, 2.5, 3.02, 0.24 + k * 0.45, 2.56, '#c8c4bc'); H.roof(-3, 3, -2.5, 2.5, 3.2, 1.8, '#d8443a', 0.4, 5); H.deco(-1.5, 0, 2.5, 1.5, 2.6, 2.6, '#3a5a7a'); H.window(-2.2, 2, 2.5, 0.5, 0.5, 1, true); mb.pop();
      mb.quad([9.5, 0.05, -1.5], [6.5, 0.05, -1.5], [6.5, -1.2, -10], [9.5, -1.2, -10], C(BC.woodL)); for (let k = 0; k < 10; k++) H.deco(6.5, 0.06 - k * 0.13, -1.5 - k * 0.85, 9.5, 0.1 - k * 0.13, -1.3 - k * 0.85, BC.woodD);
      mb.push([8, 0.3, -4], M4.rotY(Math.PI / 2)); mb.push([0, 0, 0], null, [1, 1, 0.55]); mb.lathe([[0, 0], [0.9, 0.1], [1.1, 0.7]], 12, C('#ff8a2a'), 0); mb.lathe([[1.05, 0.7], [0.85, 0.14], [0, 0.06]], 12, C('#f2f2f2'), 0); mb.pop(); mb.pop();
      for (let k = 0; k < 2; k++) mb.tor([4.1, 1.5 + k * 0.1, -3 + k * 0.6], 0.32, 0.08, 12, 4, (a) => Math.floor(a * 2) % 2 ? C('#ffffff') : C('#e8343a'));
      H.rocks(-6, 4, 7, '#8a857c', 1.2, rnd);
      s.lights.push({ p: L(0, top + 2.3, 0), r: 26, c: [1, 0.9, 0.6] }); item('shell', -4, 0.6, -6); break;
    }
    case 'cave': { // crystal mine: a craggy rocky hill, a tall jagged opening with stalactites, crystals spilling out, a headframe tower with a wheel, rails and an ore cart
      const crag = (x, y, z, sx, sy, sz, sd, col) => mb.ico(x, y, z, [sx, sy, sz], 2, (a, b2) => b2 > 0.62 ? rockC(shadeC(C('#6aa85a'), 0.9 + a * 0.08)) : rockC(shadeC(C(col), 0.76 + b2 * 0.2 + a * 0.05)), false, null, (a, b2, c2) => 0.2 * Math.sin(a * 4 + sd) * Math.cos(c2 * 5 + sd * 1.7) + 0.12 * Math.sin(b2 * 7 + sd * 2.3));
      crag(0, 2.6, -6.5, 9.5, 7.5, 6, 1, '#7a7570'); crag(-3, 9, -7, 4, 3.4, 3.4, 5, '#8a847c'); crag(3.5, 9.8, -7.5, 3.4, 3.2, 3, 6, '#6f6a64');
      crag(-5.4, 1.6, -0.6, 3.9, 4.4, 3.6, 2, '#857f78'); crag(5.4, 1.4, -0.7, 3.8, 4.0, 3.4, 3, '#6f6a64'); crag(0, 6.0, -1.8, 4.6, 2.4, 3.2, 4, '#7a7570');
      for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.4, d = 9 + rnd(k) * 3; crag(Math.cos(a) * d, 0.1, Math.sin(a) * d * 0.6 - 2, 0.7 + rnd(k + 3), 0.5 + rnd(k + 4) * 0.5, 0.7 + rnd(k + 5) * 0.8, k + 9, '#7d7872'); }
      // the opening: a dark jagged hole in the rock with a dark tunnel behind it
      const hole = [[-1.9, -0.5], [-1.5, 2.8], [-0.7, 4.0], [0.3, 4.5], [1.1, 3.9], [1.7, 2.6], [1.9, -0.5]], hz = 1.2;
      for (let k = 1; k < hole.length - 1; k++) mb.tri([0, 1.5, hz], [hole[k + 1][0], hole[k + 1][1], hz], [hole[k][0], hole[k][1], hz], C('#05070c'), true);
      mb.box(-1.9, -0.5, -4, 1.9, 4.5, hz - 0.02, C('#0a0c12'), true, true);
      for (let k = 0; k < 7; k++) { const x = -1.3 + k * 0.42, top = 3.6 + Math.sin(k * 1.7) * 0.6; mb.cyl(x, top - 0.6 - (k % 3) * 0.3, hz + 0.15, 0, 0.13, 0.7 + (k % 3) * 0.3, 5, rockC(C('#6a655f'))); }
      for (const sx of [-1, 1]) H.flatBox(sx * 1.85 - 0.2, -0.5, hz + 0.05, sx * 1.85 + 0.2, 3.2, hz + 0.45, BC.woodD); H.flatBox(-2.3, 3.0, hz + 0.05, 2.3, 3.5, hz + 0.5, BC.woodD);
      for (const sx of [-1, 1]) { mb.push([sx * 1.3, 2.6, hz + 0.3], M4.rotZ(sx * 0.75)); H.deco(-0.07, -0.55, -0.07, 0.07, 0.55, 0.07, BC.woodD); mb.pop(); }
      mb.push([3.8, 2.2, hz + 1.6]); H.flatBox(-0.05, -2.6, -0.05, 0.05, 0.3, 0.05, BC.wood); H.flatBox(-0.7, 0, -0.04, 0.7, 0.5, 0.04, BC.woodL); mb.pop();
      for (const [x, z, c, h] of [[-2.6, 3.4, '#8ff6ff', 1.6], [2.8, 3.2, '#c08fff', 1.3], [-1.3, 4.6, '#c08fff', 0.9], [1.5, 4.8, '#8ff6ff', 1.0], [-3.8, 2.6, '#8ff6ff', 0.9], [-0.6, -1.5, '#8ff6ff', 1.2], [0.8, -2.5, '#c08fff', 1.0]]) for (let q = 0; q < 3; q++) { mb.push([x + q * 0.25, -0.5, z + (q % 2) * 0.2], M4.rotZ((q - 1) * 0.35)); mb.cyl(0, 0, 0, 0.22 - q * 0.04, 0, h - q * 0.25, 6, glowC(C(c)), true, q); mb.pop(); }
      // the headframe tower: four legs, cross braces, a platform and a big wheel
      const hx = 7.5, hz2 = 5; for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) mb.caps([hx + sx * 1.6, -0.5, hz2 + sz * 1.6], [hx + sx * 0.9, 7.5, hz2 + sz * 0.9], 0.15, 0.13, 5, C(BC.woodD));
      for (let k = 0; k < 3; k++) { const y0 = k * 2.5, y1 = y0 + 2.5, f = t => 1.6 - (t / 8) * 0.7; mb.caps([hx - f(y0), y0, hz2 + f(y0)], [hx + f(y1), y1, hz2 + f(y1)], 0.06, 0.06, 4, C(BC.wood)); mb.caps([hx + f(y0), y0, hz2 + f(y0)], [hx - f(y1), y1, hz2 + f(y1)], 0.06, 0.06, 4, C(BC.wood)); }
      mb.box(hx - 1.2, 7.5, hz2 - 1.2, hx + 1.2, 7.75, hz2 + 1.2, C(BC.woodL)); mb.push([hx, 8.9, hz2], M4.rotX(Math.PI / 2)); mb.tor([0, 0, 0], 1.0, 0.1, 16, 4, C(BC.metalD)); for (let k = 0; k < 4; k++) { mb.push([0, 0, 0], M4.rotY(k * 0.785)); mb.box(-0.98, -0.04, -0.04, 0.98, 0.04, 0.04, C(BC.metalD)); mb.pop(); } mb.pop(); mb.cyl(hx, 2, hz2 + 0.9, 0.02, 0.02, 6.9, 3, C('#c8c0b0'));
      for (let k = 0; k < 9; k++) H.flatBox(-0.75, -0.45, 1.6 + k * 0.9, 0.75, -0.38, 1.85 + k * 0.9, BC.woodD); for (const sx of [-0.55, 0.55]) H.flatBox(sx - 0.05, -0.38, 1.2, sx + 0.05, -0.3, 9.8, BC.metalD);
      mb.push([0, -0.3, 7.2]); H.flatBox(-0.75, 0.25, -0.9, 0.75, 1.1, 0.9, '#6a5a4a'); for (const sx of [-0.58, 0.58]) for (const z of [-0.55, 0.55]) { mb.push([sx, 0.2, z], M4.rotZ(Math.PI / 2)); mb.cyl(0, -0.06, 0, 0.2, 0.2, 0.12, 8, C('#3a3a40')); mb.pop(); } for (let k = 0; k < 6; k++) mb.ico(-0.4 + (k % 3) * 0.4, 1.15, -0.4 + Math.floor(k / 3) * 0.6, 0.25, 0, () => k % 3 === 1 ? glowC(C('#8ff6ff')) : rockC(C('#5a5658'))); mb.pop();
      H.lantern(-2.6, 2.6, 2.4); H.lantern(2.6, 2.6, 2.4);
      s.triggers.push({ kind: 'cave', p: L(0, 1, 1.8), r: 2.2, cave: p.key, out: L(0, 1.5, 6) });
      s.lights.push({ p: L(0, 1.5, 3), r: 8, c: [0.6, 0.9, 1] }); break;
    }
  }
}
