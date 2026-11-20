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

function buildStructure(mb, p, s, item, L, rnd) {
  const H = bh(mb), C = h => hex(h);
  switch (p.type) {
    case 'ruins': { // an old temple: a stepped platform with cracked tiles, fluted columns (some broken), a carved gateway, vines, a fallen statue and an altar
      const desert = p.b === 4, c = desert ? BC.sand : BC.stone, cd = desert ? BC.sandD : BC.stoneD, cl = desert ? '#efd8a8' : BC.stoneL;
      H.box(-8, -1, -8, 8, 0.4, 8, cd); H.box(-6.5, 0.4, -6.5, 6.5, 0.9, 6.5, c);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const x = -6 + i * 2, z = -6 + j * 2, cr = rnd(i * 7 + j) < 0.18; if (rnd(i * 13 + j + 3) < 0.08) continue; H.deco(x + 0.05, 0.9, z + 0.05, x + 1.95, 0.95 + (cr ? 0.08 : 0), z + 1.95, shadeC(C(cl), 0.88 + rnd(i + j * 6) * 0.16)); }
      H.stairs(0, -8, 4, 2, 0.45, 0.6, c); for (const sx of [-1, 1]) H.box(sx * 2.4 - 0.4, -0.4, -9.2, sx * 2.4 + 0.4, 1.4, -8, cd);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.39, x = Math.cos(a) * 5.4, z = Math.sin(a) * 5.4, br = rnd(k) < 0.45; mb.push([0, 0.9, 0]); H.column(x, z, br ? 1.5 + rnd(k + 9) * 2 : 5.2, 0.42, c, br); mb.pop();
        if (br) { mb.push([x + Math.cos(a) * 1.6, 1.25, z + Math.sin(a) * 1.6], M4.mul3(M4.rotY(-a + 1), M4.rotZ(Math.PI / 2))); mb.cyl(0, -0.5, 0, 0.4, 0.4, 1.0, 12, C(c)); mb.pop(); } }
      // the gateway lintel with a carved band and a glowing rune
      mb.push([0, 0.9, 0]); H.box(-5.8, 5.2, -0.6, 5.8, 6.0, 0.6, c); H.box(-6, 6, -0.7, -1, 6.4, 0.7, cd);
      for (let k = 0; k < 9; k++) H.deco(-5.4 + k * 1.3, 5.45, 0.6, -5.0 + k * 1.3, 5.75, 0.66, cd);
      mb.ico(0, 5.6, 0.68, [0.25, 0.25, 0.05], 0, () => glowC(C('#7ae8ff'))); H.vines(-5.6, 0.62, 5.6, 0.62, 5.2, 9, rnd, 70); mb.pop();
      for (let k = 0; k < 6; k++) { const a = rnd(k + 30) * 6.28, d = 8 + rnd(k + 31) * 3; H.box(Math.cos(a) * d - 0.4, -0.2, Math.sin(a) * d - 0.3, Math.cos(a) * d + 0.4, 0.4, Math.sin(a) * d + 0.3, cd); }
      // a fallen statue head and a little altar with a fire bowl
      mb.ico(6.5, 0.9, 9, [1.1, 1.0, 1.0], 1, (x, y) => shadeC(C(cl), 0.85 + y * 0.1)); mb.ico(7.35, 1.1, 9.2, [0.25, 0.4, 0.3], 0, () => C(cl)); for (const dz of [-0.35, 0.35]) mb.ico(7.25, 1.3, 9 + dz, [0.12, 0.08, 0.12], 0, () => C(cd));
      H.box(-1, 0.9, 1.5, 1, 1.9, 2.6, cd); mb.cyl(0, 1.9, 2.05, 0.55, 0.4, 0.3, 8, C(BC.metalD)); mb.ico(0, 2.35, 2.05, 0.3, 0, () => glowC(C('#ffb347')));
      if (!desert) for (let k = 0; k < 7; k++) H.deco(-6 + k * 1.9, 0.9, 3.5 + rnd(k) * 2.5, -5 + k * 1.9, 0.99, 4.5 + rnd(k) * 2.5, BC.moss);
      H.torch(-2.4, -6.6); H.torch(2.4, -6.6); s.lights.push({ p: L(0, 2.4, -6.6), r: 9, c: [1, 0.7, 0.35] }, { p: L(0, 2.8, 2.05), r: 7, c: [1, 0.7, 0.35] });
      item('coin', 0, 1.6, 0); item(desert ? 'gem' : 'relic', 4, 1.6, 3); break;
    }
    case 'circle': { // standing stones with glowing carved runes, lintels, a rune ring on the ground and a crystal altar
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * 6.283, h = 4.4 + rnd(k) * 1.6;
        mb.push([Math.cos(a) * 11, 0, Math.sin(a) * 11], M4.mul3(M4.rotY(-a), M4.rotZ((rnd(k + 5) - 0.5) * 0.12)));
        mb.lathe([[1.05, -1], [1.0, 0.3], [0.9, h * 0.6], [0.72, h - 0.3], [0.4, h], [0, h + 0.08]], 6, (t, ph) => shadeC(C(BC.stoneD), 0.86 + rnd(k) * 0.16 + Math.cos(ph * 3 + k) * 0.05), 0.1);
        for (let q = 0; q < 3; q++) H.deco(-0.86 + q * 0.02, 1.2 + q * 0.9, -0.12, -0.8, 1.6 + q * 0.9, 0.12, glowC(C('#7ae8ff')));
        H.deco(-0.3, 0, -1.1, 0.3, 0.25, 1.1, BC.moss);
        mb.pop();
        if (k % 2 === 0) { const b = (k + 1) / 10 * 6.283, m = (a + b) / 2; mb.push([Math.cos(m) * 11.2, 4.6 + rnd(k) * 0.5, Math.sin(m) * 11.2], M4.rotY(-m)); H.box(-0.7, 0, -3.6, 0.7, 0.9, 3.6, BC.stoneD); mb.pop(); }
      }
      H.box(-2.2, -0.6, -1.4, 2.2, 0.9, 1.4, BC.stone); H.flatBox(-2.4, 0.9, -1.6, 2.4, 1.15, 1.6, BC.stoneL); for (const sx of [-1.9, 1.9]) H.box(sx - 0.25, -0.5, -1.7, sx + 0.25, 0.95, 1.7, BC.stoneD);
      for (let k = 0; k < 5; k++) { const a = k * 1.256; mb.push([Math.cos(a) * 0.25, 1.15, Math.sin(a) * 0.25], M4.rotZ(Math.cos(a) * 0.3)); mb.cyl(0, 0, 0, 0.16, 0, 0.8 + (k % 2) * 0.5, 6, glowC(C(k % 2 ? '#c8a8ff' : '#9ff0ff'))); mb.pop(); }
      mb.ico(0, 2.3, 0, [0.4, 0.75, 0.4], 0, () => glowC(C('#9ff0ff')));
      for (const R of [6.5, 7.5]) mb.tor([0, 0.06, 0], R, 0.06, 40, 3, glowC(C('#7ae8ff')));
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; mb.ico(Math.cos(a) * 7, 0.05, Math.sin(a) * 7, [0.5, 0.15, 0.5], 0, () => C(k % 2 ? BC.stoneL : BC.stone)); H.deco(Math.cos(a + 0.26) * 7 - 0.12, 0.04, Math.sin(a + 0.26) * 7 - 0.12, Math.cos(a + 0.26) * 7 + 0.12, 0.09, Math.sin(a + 0.26) * 7 + 0.12, glowC(C('#c8a8ff'))); }
      s.lights.push({ p: L(0, 2.5, 0), r: 10, c: [0.4, 0.9, 1] }); item('crystal', 0, 3.2, 0); break;
    }
    case 'village': { // cottages around a well, a cobbled path, a market stall, a garden, a haystack, a bench and lanterns
      const roofs = [BC.roofR, BC.roofB, BC.roofG, '#a8683a'], walls = [BC.plaster, '#f2dcc0', '#e8eef2', BC.plaster];
      for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.4, x = Math.cos(a) * 13, z = Math.sin(a) * 13; cottage(mb, H, x, z, -a - Math.PI / 2, 5.5, 4.4, 3.2, roofs[k], walls[k], q => rnd(q + k * 9)); }
      for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283, r = 3.2 + (k % 2) * 0.7; mb.cyl(Math.cos(a) * r, -0.05, Math.sin(a) * r, 0.42, 0.42, 0.12, 6, shadeC(C('#b8b0a0'), 0.9 + (k % 3) * 0.06), true, k); }
      // the well: a stone ring, water, two posts, a little roof, a crank, a rope and a bucket
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; mb.push([Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4], M4.rotY(-a)); H.box(-0.3, -0.5, -0.42, 0.3, 0.45 + (k % 2) * 0.05, 0.42, k % 2 ? BC.stone : BC.stoneD); H.box(-0.32, 0.45, -0.44, 0.32, 0.9, 0.44, k % 2 ? BC.stoneD : BC.stone); mb.pop(); }
      mb.cyl(0, 0.55, 0, 1.15, 1.15, 0.06, 12, C('#3f86c8'), true);
      for (const sx of [-1, 1]) H.flatBox(sx * 1.35 - 0.12, 0.9, -0.12, sx * 1.35 + 0.12, 3.1, 0.12, BC.wood);
      mb.push([0, 3.1, 0]); H.roof(-1.8, 1.8, -1.2, 1.2, 0, 1.1, BC.roofR, 0.2, 3); mb.pop();
      mb.push([0, 2.3, 0], M4.rotZ(Math.PI / 2)); mb.cyl(0, -1.3, 0, 0.12, 0.12, 2.6, 6, C(BC.woodL)); mb.pop(); H.deco(1.5, 2.25, -0.05, 1.6, 2.6, 0.05, BC.woodD); H.deco(1.5, 2.55, -0.05, 1.8, 2.65, 0.05, BC.woodD);
      mb.cyl(0, 1.5, 0, 0.02, 0.02, 0.8, 4, C('#d8c8a0')); mb.cyl(0, 1.2, 0, 0.2, 0.24, 0.32, 8, C(BC.woodL)); mb.tor([0, 1.52, 0], 0.22, 0.02, 8, 3, C(BC.metalD));
      // a market stall with a striped awning and crates of fruit
      mb.push([-6.5, 0, -1.5], M4.rotY(0.6));
      H.box(-1.5, 0, -0.6, 1.5, 0.9, 0.6, BC.woodL); for (const [x, zz] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) H.flatBox(x - 0.07, 0.9, zz - 0.07, x + 0.07, 2.4 + (zz < 0 ? 0.4 : 0), zz + 0.07, BC.wood);
      for (let k = 0; k < 6; k++) mb.quad([-1.7 + k * 0.567, 2.3, 1.0], [-1.7 + (k + 1) * 0.567, 2.3, 1.0], [-1.7 + (k + 1) * 0.567, 2.9, -0.8], [-1.7 + k * 0.567, 2.9, -0.8], C(k % 2 ? '#ffffff' : '#e8504a'));
      for (let k = 0; k < 3; k++) { H.deco(-1.3 + k * 0.9, 0.9, -0.45, -0.6 + k * 0.9, 1.15, 0.45, '#9a6a3a'); for (let q = 0; q < 6; q++) mb.ico(-1.15 + k * 0.9 + (q % 3) * 0.2, 1.22, -0.25 + Math.floor(q / 3) * 0.4, 0.13, 0, () => C(['#ff5a3a', '#ffd23a', '#7bd85a'][k])); }
      mb.pop();
      // a vegetable garden with a scarecrow
      for (let r = 0; r < 4; r++) { H.flatBox(5, -0.1, -6 + r * 1.1, 9, 0.18, -5.6 + r * 1.1, '#6a4a2a'); for (let q = 0; q < 5; q++) { mb.ico(5.4 + q * 0.8, 0.38, -5.8 + r * 1.1, 0.22, 0, () => C(r % 2 ? '#7bd85a' : '#ff8a3a')); if (r % 2) mb.cone(5.4 + q * 0.8, 0.45, -5.8 + r * 1.1, 0.08, 0.35, 4, C('#4faa3a')); } }
      H.fence(4.5, -6.6, 9.5, -6.6); H.fence(9.5, -6.6, 9.5, -1.6); H.fence(4.5, -6.6, 4.5, -1.6);
      H.flatBox(7, 0, -4.05, 7.12, 2.6, -3.95, BC.wood); H.flatBox(6.2, 1.8, -4.05, 7.9, 1.92, -3.95, BC.wood); mb.ico(7.06, 2.85, -4, 0.3, 1, () => C('#e8d8a0')); mb.cyl(7.06, 3.05, -4, 0.45, 0.2, 0.22, 8, C('#c8a050')); mb.box(6.8, 1.4, -4.15, 7.32, 2.4, -3.85, C('#4a7ac8'), true, true);
      // a haystack, a bench, a signpost
      mb.ico(-3, 0.6, 7.5, [1.3, 1.0, 1.1], 1, (x, y) => shadeC(C('#e8c860'), 0.85 + y * 0.15)); mb.ico(-1.8, 0.4, 7.9, [0.6, 0.45, 0.5], 0, () => C('#dcbc58'));
      mb.push([3.5, 0, 6.5], M4.rotY(-0.5)); H.flatBox(-1, 0.42, -0.25, 1, 0.52, 0.25, BC.woodL); H.flatBox(-1, 0.52, -0.3, 1, 1.0, -0.22, BC.woodL); for (const sx of [-0.85, 0.85]) H.flatBox(sx - 0.06, 0, -0.25, sx + 0.06, 0.42, 0.25, BC.woodD); mb.pop();
      H.flatBox(2.4, 0, -2.6, 2.55, 2.4, -2.45, BC.wood); for (const [y, a] of [[2.1, 0.4], [1.7, -0.6]]) { mb.push([2.47, y, -2.52], M4.rotY(a)); H.flatBox(0, -0.15, -0.04, 1.1, 0.15, 0.04, BC.woodL); mb.pop(); }
      for (let k = 0; k < 4; k++) { const a = k * 1.571 + 1.2; H.lantern(Math.cos(a) * 7, 2.4, Math.sin(a) * 7); s.lights.push({ p: L(Math.cos(a) * 7, 2.6, Math.sin(a) * 7), r: 8, c: [1, 0.8, 0.45] }); }
      H.barrel(-3, 4); H.crate(-4, 5); H.crate(-3.7, 5.1, 0.6, 0.8);
      item('coin', 6, 0.6, 0); item('mushroom', -6, 0.6, 3); break;
    }
    case 'tower': { // a stone watchtower with block courses, arrow slits, a wooden lookout on struts, a shingled cone roof, a flag and a ramp winding up
      for (let k = 0; k < 18; k++) { const y = -1 + k * 0.62, r = 3.1 - k * 0.022; mb.cyl(0, y, 0, r, r - 0.02, 0.62, 10, shadeC(C(k % 2 ? BC.stone : '#9c978d'), 0.95 + (k % 3) * 0.04), true, k % 2 ? 0.31 : 0); }
      mb.cyl(0, -1, 0, 3.5, 3.2, 1.2, 10, C(BC.stoneD));
      for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.8; mb.push([Math.cos(a) * 2.75, 5.5 + (k % 2) * 2, Math.sin(a) * 2.75], M4.rotY(-a)); H.deco(0, -0.6, -0.1, 0.12, 0.6, 0.1, '#2a2620'); H.deco(0.02, -0.68, -0.22, 0.14, -0.6, 0.22, BC.stoneL); mb.pop(); }
      mb.push([0, 0, 3.0]); H.door(0, 0.05, 1.2, 2.2); mb.pop();
      mb.cyl(0, 9.5, 0, 3.7, 3.7, 0.6, 10, C(BC.woodD));
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; mb.push([Math.cos(a) * 2.8, 8.4, Math.sin(a) * 2.8], M4.mul3(M4.rotY(-a), M4.rotZ(-0.75))); H.deco(-0.08, 0, -0.08, 0.08, 1.4, 0.08, BC.woodD); mb.pop(); }
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; H.flatBox(Math.cos(a) * 3.4 - 0.12, 10.1, Math.sin(a) * 3.4 - 0.12, Math.cos(a) * 3.4 + 0.12, 13, Math.sin(a) * 3.4 + 0.12, BC.wood); }
      mb.cyl(0, 10.8, 0, 3.5, 3.5, 0.15, 10, C(BC.woodL), false); mb.cyl(0, 11.6, 0, 3.5, 3.5, 0.1, 10, C(BC.woodL), false);
      for (let k = 0; k < 5; k++) mb.cyl(0, 13 + k * 0.62, 0, 4.4 - k * 0.86, 3.6 - k * 0.86 > 0 ? 3.62 - k * 0.86 : 0.1, 0.66, 10, shadeC(C(BC.roofR), k % 2 ? 0.86 : 1), true, 0.31);
      mb.cyl(0, 16.1, 0, 0.3, 0, 0.6, 10, C(BC.roofR));
      mb.cyl(0, 16.4, 0, 0.06, 0.06, 1.8, 4, C(BC.metalD)); mb.ico(0, 18.25, 0, 0.1, 0, () => C(BC.gold));
      for (let k = 0; k < 4; k++) { const f = k / 4, f1 = (k + 1) / 4, w = Math.sin(k * 1.4) * 0.12; mb.tri2([0.06 + f * 1.4, 18.1 + w, 0], [0.06 + f1 * 1.4, 18.1 + Math.sin((k + 1) * 1.4) * 0.12, 0], [0.06 + f1 * 1.4, 17.4 + Math.sin((k + 1) * 1.4) * 0.12, 0], C(k % 2 ? '#ffcf4a' : '#e8504a')); mb.tri2([0.06 + f * 1.4, 18.1 + w, 0], [0.06 + f1 * 1.4, 17.4 + Math.sin((k + 1) * 1.4) * 0.12, 0], [0.06 + f * 1.4, 17.4 + w, 0], C(k % 2 ? '#ffcf4a' : '#e8504a')); }
      for (let k = 0; k < 24; k++) {
        const a0 = k / 24 * 6.28 * 1.5, a1 = (k + 1) / 24 * 6.28 * 1.5, y0 = k / 24 * 9.5, y1 = (k + 1) / 24 * 9.5, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
        mb.quad(P(a0, 3.2, y0), P(a0, 6, y0), P(a1, 6, y1), P(a1, 3.2, y1), shadeC(C(BC.woodL), k % 2 ? 0.92 : 1));
        mb.quad(P(a0, 3.2, y0 - 0.3), P(a1, 3.2, y1 - 0.3), P(a1, 6, y1 - 0.3), P(a0, 6, y0 - 0.3), C(BC.woodD));
        mb.quad(P(a0, 6, y0 - 0.3), P(a1, 6, y1 - 0.3), P(a1, 6, y1 + 0.5), P(a0, 6, y0 + 0.5), C(BC.wood));
        if (k % 3 === 0) { mb.box(P(a0, 6, 0)[0] - 0.1, y0, P(a0, 6, 0)[2] - 0.1, P(a0, 6, 0)[0] + 0.1, y0 + 1.1, P(a0, 6, 0)[2] + 0.1, C(BC.woodD)); if (y0 > 0.8) mb.box(P(a0, 5.95, 0)[0] - 0.08, -0.5, P(a0, 5.95, 0)[2] - 0.08, P(a0, 5.95, 0)[0] + 0.08, y0 - 0.3, P(a0, 5.95, 0)[2] + 0.08, C(BC.woodD), true, true); }
        const ra = P(a0, 6, y0 + 1.0), rb = P(a1, 6, y1 + 1.0); mb.caps(ra, rb, 0.035, 0.035, 4, C('#d8c8a0'));
      }
      H.lantern(4.3, 2.0, 3.0); s.lights.push({ p: L(0, 12, 0), r: 10, c: [1, 0.8, 0.5] }, { p: L(4.3, 2.3, 3.0), r: 7, c: [1, 0.8, 0.45] }); item('feather', 0, 10.8, 0); break;
    }
    case 'bigtree': { // a giant old tree with roots, branches and a treehouse with a railing, lanterns and a rope swing
      const bark = C('#6b4a2b');
      mb.lathe([[3.6, -1], [3.0, 0.8], [2.6, 4], [2.5, 12], [2.2, 17], [1.6, 20], [0, 20.5]], 12, (t, ph) => shadeC(bark, 0.84 + 0.16 * Math.cos(ph * 7 + t * 8)), 0.1);
      for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.3; MB.tube(mb, [[Math.cos(a) * 2.2, 1.2, Math.sin(a) * 2.2], [Math.cos(a) * 3.6, 0.3, Math.sin(a) * 3.6], [Math.cos(a + 0.15) * 5, -0.4, Math.sin(a + 0.15) * 5]], t => 0.9 - t * 0.6, 6, shadeC(bark, 0.9)); }
      const leaf = (q, w) => w > 0.35 ? C('#58b84e') : w < -0.3 ? C('#2f7a3a') : C('#3f9a4e');
      for (let k = 0; k < 7; k++) { const a = k * 0.9, r = 5.5 + rnd(k) * 2.2, bx = Math.cos(a) * 7, bz = Math.sin(a) * 7, by = 19 + rnd(k) * 3.5; MB.tube(mb, [[Math.cos(a) * 1.5, 16 + (k % 3), Math.sin(a) * 1.5], [bx * 0.6, by - 1.5, bz * 0.6]], t => 0.7 - t * 0.35, 6, bark); mb.ico(bx, by, bz, [r, r * 0.78, r], 1, leaf); mb.ico(bx * 1.15, by - r * 0.4, bz * 1.15, r * 0.5, 0, leaf); }
      mb.ico(0, 26, 0, [7.5, 6, 7.5], 1, leaf);
      // the treehouse platform, little house, railing and lanterns
      mb.cyl(0, 11, 0, 5, 5, 0.4, 12, C(BC.woodL)); for (let k = 0; k < 12; k++) { const a = (k + 0.5) / 12 * 6.283; mb.push([Math.cos(a) * 3.8, 9.6, Math.sin(a) * 3.8], M4.mul3(M4.rotY(-a), M4.rotZ(0.7))); H.deco(-0.08, 0, -0.08, 0.08, 1.9, 0.08, BC.woodD); mb.pop(); }
      mb.push([0, 11.4, 0]); H.flatBox(-2, 0, 1.6, 2, 2.6, 4.2, BC.woodL); for (let k = 0; k < 6; k++) H.deco(-2.02, 0.1 + k * 0.42, 4.2, 2.02, 0.14 + k * 0.42, 4.24, BC.wood); H.roof(-2, 2, 1.6, 4.2, 2.6, 1.3, BC.roofG, 0.3, 4); H.window(1.1, 1.5, 4.2, 0.7, 0.7, 1, true); H.door(-0.8, 4.2, 0.8, 1.8); mb.pop();
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; H.flatBox(Math.cos(a) * 4.8 - 0.07, 11.4, Math.sin(a) * 4.8 - 0.07, Math.cos(a) * 4.8 + 0.07, 12.4, Math.sin(a) * 4.8 + 0.07, BC.woodD); }
      mb.tor([0, 12.4, 0], 4.8, 0.07, 24, 3, C(BC.woodL)); mb.tor([0, 11.9, 0], 4.8, 0.04, 24, 3, C('#d8c8a0'));
      for (const a of [0.8, 2.6, 4.4]) { mb.cyl(Math.cos(a) * 4.8, 12.4, Math.sin(a) * 4.8, 0.03, 0.03, 0.7, 4, C('#3a3f55')); mb.box(Math.cos(a) * 4.8 - 0.14, 13.1, Math.sin(a) * 4.8 - 0.14, Math.cos(a) * 4.8 + 0.14, 13.4, Math.sin(a) * 4.8 + 0.14, glowC(C('#ffe08a'))); }
      // a rope swing hanging from a branch
      for (const dz of [-0.4, 0.4]) mb.cyl(6.2, 2.2, 3 + dz, 0.03, 0.03, 13.5, 4, C('#d8c8a0')); H.flatBox(5.9, 2.0, 2.5, 6.5, 2.2, 3.5, BC.woodL);
      for (let k = 0; k < 22; k++) { const a0 = k / 22 * 6.28 * 1.3, a1 = (k + 1) / 22 * 6.28 * 1.3, y0 = k / 22 * 11, y1 = (k + 1) / 22 * 11, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r]; mb.quad(P(a0, 3, y0), P(a0, 5.4, y0), P(a1, 5.4, y1), P(a1, 3, y1), shadeC(C(BC.woodL), k % 2 ? 0.9 : 1)); mb.quad(P(a0, 3, y0 - 0.25), P(a1, 3, y1 - 0.25), P(a1, 5.4, y1 - 0.25), P(a0, 5.4, y0 - 0.25), C(BC.woodD)); if (k % 3 === 0) mb.box(P(a0, 5.35, 0)[0] - 0.07, y0, P(a0, 5.35, 0)[2] - 0.07, P(a0, 5.35, 0)[0] + 0.07, y0 + 1, P(a0, 5.35, 0)[2] + 0.07, C(BC.woodD), true, true); }
      s.lights.push({ p: L(0, 13, 2.5), r: 9, c: [1, 0.8, 0.45] }); item('relic', 0, 12, 0); break;
    }
    case 'cabin': { // a log cabin with notched corners, a stone chimney, a porch with a railing and a rocking chair, and a woodpile with an axe
      const w = 7, d = 5.6, h = 3.2;
      H.box(-w / 2 - 0.3, -0.6, -d / 2 - 0.3, w / 2 + 0.3, 0.3, d / 2 + 1.9, BC.stoneD);
      for (let k = 0; k < 8; k++) { const y = 0.3 + k * 0.38 + 0.19; for (const [a, b, rot, len] of [[0, d / 2, 0, w + 0.8], [0, -d / 2, 0, w + 0.8], [w / 2, 0, 1, d + 0.8], [-w / 2, 0, 1, d + 0.8]]) { mb.push([a, y + (rot ? 0.19 : 0), b], M4.mul3(M4.rotY(rot ? Math.PI / 2 : 0), M4.rotZ(Math.PI / 2))); mb.cyl(0, -len / 2, 0, 0.2, 0.2, len, 7, shadeC(C(BC.wood), 0.9 + ((k * 3 + a) % 2) * 0.1), true); mb.cyl(0, -len / 2 - 0.01, 0, 0.16, 0.16, 0.02, 7, C('#d8b080')); mb.cyl(0, len / 2 - 0.01, 0, 0.16, 0.16, 0.02, 7, C('#d8b080')); mb.pop(); } }
      H.roof(-w / 2, w / 2, -d / 2, d / 2, h + 0.3, 2.2, '#7a4a32', 0.7, 6);
      H.door(0, d / 2 + 0.2, 1.1, 2.1); H.window(-2.1, 2, d / 2 + 0.2, 0.9, 0.8, 1, true, '#7a3a2a'); H.window(2.1, 2, d / 2 + 0.2, 0.9, 0.8, 1, true, '#7a3a2a'); mb.push([-w / 2 - 0.2, 0, 0], M4.rotY(-Math.PI / 2)); H.window(0, 2, 0, 0.8, 0.7, 1, true); mb.pop();
      // the porch: posts, a railing and a slanted roof
      for (const x of [-w / 2, -w / 4, w / 4, w / 2]) H.flatBox(x - 0.12, 0.3, d / 2 + 1.6, x + 0.12, 2.6, d / 2 + 1.84, BC.woodD);
      for (const [x0, x1] of [[-w / 2, -0.8], [0.8, w / 2]]) { H.flatBox(x0, 1.15, d / 2 + 1.66, x1, 1.25, d / 2 + 1.78, BC.woodL); for (let x = x0 + 0.3; x < x1; x += 0.35) H.deco(x - 0.03, 0.3, d / 2 + 1.69, x + 0.03, 1.15, d / 2 + 1.75, BC.woodL); }
      mb.quad([-w / 2 - 0.3, 2.6, d / 2 + 2.1], [w / 2 + 0.3, 2.6, d / 2 + 2.1], [w / 2 + 0.3, 3.2, d / 2], [-w / 2 - 0.3, 3.2, d / 2], C('#7a4a32'));
      mb.push([2.3, 0.3, d / 2 + 0.9], M4.rotY(-0.4)); H.deco(-0.3, 0.42, -0.3, 0.3, 0.5, 0.3, BC.woodL); H.deco(-0.3, 0.5, -0.32, 0.3, 1.2, -0.25, BC.woodL); for (const sx of [-0.3, 0.27]) { H.deco(sx, 0, -0.3, sx + 0.04, 0.45, 0.3, BC.woodD); mb.tor([sx + 0.02, 0.0, 0], 0.4, 0.03, 10, 3, C(BC.woodD)); } mb.pop();
      // a chimney of stacked stones
      for (let k = 0; k < 10; k++) H.flatBox(2 - (k % 2) * 0.05, 0.3 + k * 0.7, -1.4 - (k % 2) * 0.05, 3 + (k % 2) * 0.05, 1.0 + k * 0.7, -0.4 + (k % 2) * 0.05, k % 2 ? BC.stoneD : BC.stone); H.flatBox(1.85, 7.3, -1.55, 3.15, 7.5, -0.25, BC.stoneL);
      // a woodpile with a little roof, a chopping stump and an axe
      for (let k = 0; k < 9; k++) { mb.push([-w / 2 - 1.4, 0.25 + Math.floor(k / 3) * 0.42, -1 + (k % 3) * 0.44], M4.rotZ(Math.PI / 2)); mb.cyl(0, -0.8, 0, 0.2, 0.2, 1.6, 7, C(BC.woodL)); mb.cyl(0, 0.79, 0, 0.17, 0.17, 0.02, 7, C('#e8c890')); mb.pop(); }
      mb.quad([-w / 2 - 2.4, 1.7, -1.6], [-w / 2 - 2.4, 1.7, 0.4], [-w / 2 - 0.4, 2.1, 0.4], [-w / 2 - 0.4, 2.1, -1.6], C('#7a4a32'));
      mb.cyl(3.5, -0.3, 4.8, 0.45, 0.45, 0.8, 8, C(BC.woodL)); mb.cyl(3.5, 0.49, 4.8, 0.4, 0.4, 0.02, 8, C('#e8c890'));
      mb.push([3.5, 0.5, 4.8], M4.rotZ(0.5)); mb.cyl(0, 0, 0, 0.04, 0.04, 0.9, 5, C(BC.woodD)); H.deco(-0.15, 0.75, -0.02, 0.12, 0.95, 0.02, BC.metal); mb.pop();
      H.lantern(-w / 2 - 0.05, 2.2, d / 2 + 1.9); s.lights.push({ p: L(0, 2, d / 2 + 1.2), r: 8, c: [1, 0.8, 0.45] });
      item('mushroom', 0, 0.9, 6); break;
    }
    case 'pyramid': { // a stepped pyramid with carved bands, a pillared doorway, a stair ramp, carved obelisks, a cat statue and a golden top
      const steps = 9;
      for (let k = 0; k < steps; k++) { const w = 18 - k * 2; H.flatBox(-w, k * 1.6 - 1, -w, w, (k + 1) * 1.6 - 1, w, k % 2 ? BC.sand : '#d8b878'); H.flatBox(-w - 0.05, (k + 1) * 1.6 - 1.15, -w - 0.05, w + 0.05, (k + 1) * 1.6 - 1, w + 0.05, BC.sandD);
        if (k % 2 === 0) for (let q = 0; q < Math.floor(w / 1.5); q++) for (const sd of [-1, 1]) H.deco(-w + 0.6 + q * 3, k * 1.6 - 0.5, sd * w - 0.03, -w + 1.4 + q * 3, k * 1.6 - 0.1, sd * w + 0.03, shadeC(C(BC.sandD), 0.9)); }
      mb.quad([-2.5, -0.9, 22], [2.5, -0.9, 22], [2.5, steps * 1.6 - 1, 2], [-2.5, steps * 1.6 - 1, 2], C('#c9a060'));
      for (let k = 0; k < 18; k++) { const t = k / 18; H.deco(-2.4, -0.9 + t * steps * 1.6, 22 - t * 20 - 0.05, 2.4, -0.85 + t * steps * 1.6, 22 - t * 20 + 0.05, BC.sandD); }
      for (const sx of [-1, 1]) mb.quad([sx * 2.5, -0.9, 22], [sx * 2.5, steps * 1.6 - 1, 2], [sx * 2.5, steps * 1.6 - 0.6, 2], [sx * 2.5, -0.5, 22], C(BC.sandD));
      H.flatBox(-1.6, -1, 17.99, 1.6, 2.6, 18.05, '#2a2016'); for (const sx of [-1, 1]) { mb.cyl(sx * 2.1, -1, 18.4, 0.4, 0.35, 3.8, 8, C(BC.sand)); mb.cyl(sx * 2.1, 2.8, 18.4, 0.35, 0.55, 0.3, 8, C(BC.sandD)); } H.box(-2.8, 3.0, 18, 2.8, 3.6, 18.9, BC.sandD); mb.ico(0, 3.3, 18.92, [0.35, 0.2, 0.05], 0, () => glowC(C('#5ae8d8')));
      for (const [x, z] of [[-21, 21], [21, 21], [-21, -21], [21, -21]]) { mb.cyl(x, -1, z, 0.9, 0.55, 7, 4, C(BC.sand), true, 0.785); mb.cyl(x, 6, z, 0.55, 0, 1.2, 4, C(BC.gold), true, 0.785); for (let q = 0; q < 4; q++) H.deco(x - 0.12, 1 + q * 1.3, z + 0.72 - q * 0.05, x + 0.12, 1.6 + q * 1.3, z + 0.8 - q * 0.05, glowC(C('#5ae8d8'))); H.box(x - 1.3, -1, z - 1.3, x + 1.3, 0, z + 1.3, BC.sandD); }
      // a sitting cat statue beside the stairs
      for (const sx of [-1, 1]) { mb.push([sx * 6, 0, 21], M4.rotY(Math.PI)); H.box(-1, -0.5, -1.5, 1, 0.6, 1.5, BC.sandD); mb.ico(0, 1.6, 0.2, [0.7, 1.1, 0.8], 1, () => C(BC.sand)); mb.ico(0, 2.9, -0.2, [0.55, 0.5, 0.5], 1, () => C(BC.sand)); for (const ez of [-0.3, 0.3]) mb.cone(ez, 3.25, -0.2, 0.2, 0.45, 4, C(BC.sand)); mb.ico(0, 2.95, -0.7, [0.05, 0.08, 0.02], 0, () => glowC(C('#5ae8d8'))); mb.caps([0, 0.7, 0.9], [0.5 * sx, 0.6, 1.5], 0.12, 0.08, 6, C(BC.sand)); mb.pop(); }
      mb.cyl(0, steps * 1.6 - 1, 0, 1.6, 0, 1.6, 4, glowC(C(BC.gold)), true, 0.785);
      for (const sx of [-1, 1]) H.torch(sx * 3.5, 22.5, 1.8);
      s.lights.push({ p: L(0, steps * 1.6 + 1, 0), r: 10, c: [1, 0.8, 0.3] }, { p: L(0, 2, 22.5), r: 8, c: [1, 0.7, 0.3] });
      item('gem', 0, steps * 1.6 + 0.2, -3); item('coin', 10, 0.6, 22); break;
    }
    case 'pod': { // a crashed space capsule in a scorched crater: panel lines, glowing windows, an antenna dish, a parachute spread on the ground, an open hatch, glowing cracks
      mb.cyl(0, -0.6, 0, 7, 5.5, 0.62, 16, C('#4a4038'), true); mb.cyl(0, 0.0, 0, 5.4, 5.4, 0.04, 16, C('#2e2824'), true);
      for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3; mb.push([Math.cos(a) * 2.8, 0.05, Math.sin(a) * 2.8], M4.rotY(-a)); H.deco(-2, 0, -0.06, 2, 0.02, 0.06, glowC(C('#ff7a3a'))); mb.pop(); }
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283 + rnd(k) * 0.2; mb.ico(Math.cos(a) * 6.6, 0.1, Math.sin(a) * 6.6, [1 + rnd(k + 3) * 0.8, 0.5 + rnd(k + 5) * 0.4, 0.9], 0, (q, w) => shadeC(C('#6a5e52'), 0.8 + w * 0.25)); }
      mb.push([0.4, 1.3, 0], M4.mul3(M4.rotY(0.5), M4.rotZ(-1.0)));
      mb.lathe([[0, -1.9], [2.2, -1.75], [2.35, -1.45], [2.0, -0.6], [1.7, 0.6], [1.0, 1.9], [0.75, 2.1], [0, 2.15]], 16, (t, ph) => t < 0.12 ? C('#3a3030') : t > 0.38 && t < 0.48 ? C('#5ff0e0') : Math.floor(ph / 6.283 * 16) % 4 === 0 ? C('#9aa2ae') : (Math.floor(t * 10) % 3 === 0 ? C('#d0d6de') : C(BC.metal)), 0);
      mb.cyl(0, -1.95, 0, 1.6, 1.4, 0.3, 12, C('#5a4a3a')); for (let k = 0; k < 3; k++) mb.cyl(0, -2.2 - k * 0.1, 0, 0.5 - k * 0.12, 0.4 - k * 0.12, 0.12, 8, C('#4a4a52'));
      for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.6; mb.push([Math.cos(a) * 1.82, 0.0, Math.sin(a) * 1.82], M4.mul3(M4.rotY(-a), M4.rotZ(0.33))); mb.box(-0.02, -0.32, -0.3, 0.1, 0.32, 0.3, glowC(C('#8ff6ff'))); mb.box(-0.03, -0.38, -0.36, 0.06, 0.38, 0.36, C(BC.metalD), true, true); mb.pop(); }
      mb.cyl(0, 2.1, 0, 0.05, 0.05, 1.3, 5, C(BC.metalD)); mb.ico(0, 3.45, 0, 0.14, 0, () => glowC(C('#ff5f7e')));
      mb.push([0.6, 1.4, 0.8], M4.rotX(-0.8)); mb.cyl(0, 0, 0, 0.03, 0.03, 0.5, 4, C(BC.metalD)); mb.lathe([[0.02, 0.45], [0.35, 0.55], [0.5, 0.7]], 10, C('#e8ecf2'), 0); mb.pop();
      mb.push([0, -0.2, 2.0], M4.rotX(-1.2)); H.flatBox(-0.7, 0, -0.06, 0.7, 1.4, 0.06, BC.metal); H.deco(-0.5, 0.2, 0.06, 0.5, 1.2, 0.08, '#9aa2ae'); mb.pop();
      mb.pop();
      if (mb.tris) { const cb = new MeshBuilder().collect(); cb._set(mb.A, mb.P); cb.ico(0.4, 1.3, 0, [2.2, 1.8, 2.2], 0, () => [0, 0, 0, 1]); mb.tris.push(...cb.tris); }
      // the parachute lying on the ground in striped panels, with its cords
      mb.push([-8, 0.05, 3], M4.rotY(0.4)); for (let k = 0; k < 8; k++) { const a0 = k / 8 * 3.4 - 1.7, a1 = (k + 1) / 8 * 3.4 - 1.7; mb.tri2([0, 0.02, 0], [Math.cos(a0) * 4, 0.1 + (k % 2) * 0.25, Math.sin(a0) * 4], [Math.cos(a1) * 4, 0.1 + ((k + 1) % 2) * 0.25, Math.sin(a1) * 4], C(k % 2 ? '#ffffff' : '#ff7a3a')); }
      for (let k = 0; k < 4; k++) mb.caps([0, 0.05, 0], [5 - k * 0.3, 0.05, -2 + k * 1.2], 0.02, 0.02, 3, C('#d8d8d8')); mb.pop();
      for (let k = 0; k < 7; k++) { const a = rnd(k) * 6.28, d = 7.5 + rnd(k + 9) * 4; mb.push([Math.cos(a) * d, 0, Math.sin(a) * d], M4.mul3(M4.rotY(a), M4.rotZ((rnd(k + 2) - 0.5) * 0.5))); H.flatBox(-0.7, -0.2, -0.4, 0.7, 0.12, 0.4, k % 2 ? BC.metal : BC.metalD); H.deco(-0.5, 0.12, -0.02, 0.5, 0.14, 0.02, BC.metalD); mb.pop(); }
      mb.push([-6, 0, -4], M4.rotY(0.8)); H.flatBox(-1.2, -0.1, -0.8, 1.2, 0.08, 0.8, '#3f5e9a'); for (let k = -1; k <= 1; k++) H.flatBox(k * 0.8 - 0.02, 0.08, -0.8, k * 0.8 + 0.02, 0.1, 0.8, BC.metal); mb.pop();
      s.lights.push({ p: L(0, 3.5, 0), r: 9, c: [0.4, 0.9, 1] }); item('relic', 0, 0.6, 5); break;
    }
    case 'igloo': { // an igloo of snow blocks with a tunnel, a snowman with a scarf, a fire, a sled and an ice-fishing hole with a stool
      const blocks = (x, y, z) => { const a = Math.atan2(z, x), row = Math.floor((y + 0.1) * 6); return shadeC(C('#eef6ff'), (Math.floor(a * 3 + (row % 2) * 0.5) + row) % 2 ? 0.94 : 1.0); };
      mb.ico(0, -0.5, 0, 4, 2, blocks, false, m => m[1] > -0.1);
      for (let k = 1; k < 4; k++) mb.tor([0, -0.5 + k * 1.0, 0], Math.sqrt(16 - (k * 1.0) ** 2) + 0.02, 0.05, 24, 3, C('#c8dcf0'));
      mb.push([0, -0.5, 4.2]); mb.lathe([[1.6, 0], [1.6, 1.2], [1.1, 2.0], [0, 2.2]], 10, C('#e2eefa')); mb.pop();
      H.flatBox(-1.6, -0.5, 3.2, 1.6, 1.6, 5.4, '#e2eefa'); H.flatBox(-0.8, -0.5, 5.39, 0.8, 1.2, 5.42, '#2a3a4a'); mb.ico(0, 1.0, 5.43, [0.3, 0.2, 0.02], 0, () => glowC(C('#ffd08a')));
      for (let k = 0; k < 3; k++) mb.tor([0, -0.5 + k * 0.6, 4.2], 1.62, 0.04, 12, 3, C('#c8dcf0'));
      // the snowman: three balls, coal eyes and buttons, a carrot, a scarf, stick arms and a hat
      mb.ico(6, 0.5, 2, 0.9, 1, () => C(BC.snow)); mb.ico(6, 1.8, 2, 0.65, 1, () => C(BC.snow)); mb.ico(6, 2.8, 2, 0.45, 1, () => C(BC.snow));
      mb.push([6, 2.8, 2.4], M4.rotX(Math.PI / 2)); mb.cyl(0, 0, 0, 0.08, 0, 0.45, 5, C('#ff8a3a')); mb.pop();
      for (const sx of [-1, 1]) mb.ico(6 + sx * 0.16, 2.95, 2.38, 0.05, 0, () => C('#22262e')); for (let k = 0; k < 3; k++) mb.ico(6, 1.5 + k * 0.28, 2.62, 0.06, 0, () => C('#22262e'));
      mb.tor([6, 2.4, 2], 0.42, 0.1, 12, 4, C('#e8343a')); mb.caps([6.25, 2.35, 2.35], [6.4, 1.8, 2.55], 0.09, 0.07, 5, C('#e8343a'));
      for (const sx of [-1, 1]) { MB.tube(mb, [[6 + sx * 0.55, 1.9, 2], [6 + sx * 1.2, 2.3, 2.1], [6 + sx * 1.5, 2.6, 2.05]], 0.04, 4, C(BC.woodD)); mb.caps([6 + sx * 1.2, 2.3, 2.1], [6 + sx * 1.35, 2.55, 2.3], 0.025, 0.02, 3, C(BC.woodD)); }
      mb.cyl(6, 3.15, 2, 0.35, 0.35, 0.08, 8, C('#3a3f55')); mb.cyl(6, 3.2, 2, 0.24, 0.24, 0.45, 8, C('#3a3f55')); mb.cyl(6, 3.27, 2, 0.25, 0.25, 0.08, 8, C('#e8343a'), false);
      // ice fishing hole with a stool and a rod
      mb.cyl(-5, -0.45, 3, 1, 1, 0.5, 12, C('#bfe6ff')); mb.cyl(-5, 0.03, 3, 0.7, 0.7, 0.02, 12, C('#2a6aa8'), true);
      mb.cyl(-6.4, 0, 3.2, 0.3, 0.3, 0.06, 8, C(BC.woodL), true); mb.cyl(-6.4, 0.45, 3.2, 0.3, 0.3, 0.06, 8, C(BC.woodL), true); for (let k = 0; k < 3; k++) { const a = k * 2.09; mb.cyl(-6.4 + Math.cos(a) * 0.2, 0, 3.2 + Math.sin(a) * 0.2, 0.03, 0.03, 0.45, 4, C(BC.woodD)); }
      mb.caps([-6.1, 0.5, 3.1], [-5.1, 1.5, 3], 0.025, 0.012, 4, C('#3a3a48')); mb.cyl(-5.1, 0.03, 3, 0.006, 0.006, 1.47, 3, C('#e8e8f0'));
      // a little campfire and a sled
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; mb.ico(3.5 + Math.cos(a) * 0.7, 0.05, -4 + Math.sin(a) * 0.7, [0.22, 0.15, 0.2], 0, () => C('#7a7a80')); }
      for (let k = 0; k < 3; k++) { const a = k * 1.05; mb.push([3.5, 0.15, -4], M4.mul3(M4.rotY(a), M4.rotZ(Math.PI / 2))); mb.cyl(0, -0.45, 0, 0.08, 0.08, 0.9, 5, C(BC.woodD)); mb.pop(); }
      mb.cone(3.5, 0.1, -4, 0.35, 0.8, 6, glowC(C('#ffa03a'))); mb.cone(3.5, 0.15, -4, 0.2, 0.55, 5, glowC(C('#fff0a0')));
      mb.push([-3, 0, -5], M4.rotY(0.5)); H.flatBox(-0.6, 0.3, -1.1, 0.6, 0.38, 1.0, '#c8483a'); for (const sx of [-0.5, 0.5]) { H.flatBox(sx - 0.04, 0, -1.1, sx + 0.04, 0.06, 1.2, BC.metalD); MB.tube(mb, [[sx, 0.03, 1.2], [sx, 0.2, 1.4], [sx, 0.4, 1.3]], 0.04, 4, C(BC.metalD)); H.flatBox(sx - 0.03, 0.06, -0.8, sx + 0.03, 0.3, -0.7, BC.metalD); H.flatBox(sx - 0.03, 0.06, 0.6, sx + 0.03, 0.3, 0.7, BC.metalD); } mb.pop();
      s.lights.push({ p: L(3.5, 1, -4), r: 8, c: [1, 0.6, 0.3] }); item('crystal', 0, 0.6, 7); break;
    }
    case 'frozen': { // a giant ice spire with facets, a glowing core, ledges with icicles, shards and snow drifts
      const ice = C(BC.ice), iceL = C('#e8f6ff');
      mb.lathe([[3.4, -1], [3.0, 3], [2.6, 6], [2.4, 9], [2.0, 12], [1.2, 15], [0, 18]], 6, (t, ph) => shadeC(Math.floor(ph * 0.95) % 2 ? C('#a8d4f4') : C('#d8eeff'), 0.85 + t * 0.2), 0);
      for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6 * 6.283; mb.push([Math.cos(a) * 2.75, 0, Math.sin(a) * 2.75], M4.mul3(M4.rotY(-a), M4.rotZ(0.06))); H.deco(0, 0.5 + (k % 3), -0.08, 0.12, 6 + (k % 2) * 4, 0.08, glowC(C('#8ff6ff'))); mb.pop(); }
      for (const [y, r] of [[4, 3.2], [9, 2.6]]) { mb.cyl(0, y, 0, r + 0.6, r + 0.4, 0.4, 6, C(BC.snow), true, 0.3); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + 0.3; mb.cyl(Math.cos(a) * (r + 0.35), y - 0.6 - (k % 3) * 0.3, Math.sin(a) * (r + 0.35), 0, 0.1, 0.6 + (k % 3) * 0.3, 4, glowC(iceL)); } }
      for (let k = 0; k < 11; k++) { const a = k * 0.7, d = 4 + rnd(k) * 3.5, h = 2 + rnd(k + 5) * 4; mb.push([Math.cos(a) * d, -0.5, Math.sin(a) * d], M4.mul3(M4.rotY(-a), M4.rotZ(0.3 * (rnd(k + 3) - 0.5)))); mb.cyl(0, 0, 0, 0.7, 0.5, h, 6, k % 2 ? ice : glowC(ice), true, k); mb.cyl(0, h, 0, 0.5, 0, 1.2, 6, k % 2 ? iceL : glowC(iceL), true, k); mb.pop(); }
      for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.5; mb.ico(Math.cos(a) * 5.5, -0.3, Math.sin(a) * 5.5, [2 + rnd(k) * 1.5, 0.8, 1.5], 1, () => C(BC.snow)); }
      s.lights.push({ p: L(0, 6, 0), r: 12, c: [0.5, 0.85, 1] }); item('gem', 4, 0.6, 0); break;
    }
    case 'stilts': { // a swamp hut on braced stilts: plank walls, a layered thatch roof, a porch, a dock with a rowboat, a fishing net and lanterns
      for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) mb.cyl(x, -2, z, 0.3, 0.25, 4.6, 7, C('#4a3a2a'));
      for (const [a, b] of [[[-3, -3], [3, -3]], [[-3, 3], [3, 3]], [[-3, -3], [-3, 3]], [[3, -3], [3, 3]]]) { mb.caps([a[0], 0.3, a[1]], [b[0], 2.3, b[1]], 0.1, 0.1, 5, C('#5a4632')); mb.caps([b[0], 0.3, b[1]], [a[0], 2.3, a[1]], 0.1, 0.1, 5, C('#5a4632')); }
      H.flatBox(-3.6, 2.5, -3.6, 3.6, 2.8, 3.6, BC.wood); for (let k = 0; k < 12; k++) H.deco(-3.6 + k * 0.6, 2.79, -3.6, -3.06 + k * 0.6, 2.82, 3.6, shadeC(C(BC.woodL), 0.88 + (k % 3) * 0.06));
      H.flatBox(-2.8, 2.8, -2.8, 2.8, 5.2, 2.8, '#8a7a52'); for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) { H.deco(-2.82, 2.9 + k * 0.4, sd * 2.8 - 0.04, 2.82, 2.95 + k * 0.4, sd * 2.8 + 0.04, '#6a5a3a'); H.deco(sd * 2.8 - 0.04, 2.9 + k * 0.4, -2.82, sd * 2.8 + 0.04, 2.95 + k * 0.4, 2.82, '#6a5a3a'); }
      for (let k = 0; k < 4; k++) mb.cyl(0, 5.0 + k * 0.55, 0, 4.4 - k * 0.95, 3.6 - k * 0.95, 0.75, 8, shadeC(C(BC.thatch), k % 2 ? 0.9 : 1), true, 0.39 + k * 0.2);
      mb.cyl(0, 7.2, 0, 0.6, 0.0, 0.8, 8, shadeC(C(BC.thatch), 0.8));
      mb.push([0, 2.8, 0]); H.door(0, 2.8, 1, 1.9); H.window(-1.8, 1.5, 2.8, 0.7, 0.6, 1, true); H.window(1.8, 1.5, 2.8, 0.7, 0.6, 1, true); mb.pop();
      for (let x = -3.4; x <= 3.4; x += 0.85) H.flatBox(x - 0.05, 2.8, 3.45, x + 0.05, 3.7, 3.55, BC.woodD); H.flatBox(-3.6, 3.65, 3.43, -1.1, 3.75, 3.57, BC.woodL); H.flatBox(1.1, 3.65, 3.43, 3.6, 3.75, 3.57, BC.woodL);
      mb.quad([-1, 0, 9], [1, 0, 9], [1, 2.8, 3.6], [-1, 2.8, 3.6], C(BC.woodL));
      for (let k = 0; k < 6; k++) H.flatBox(-1.1, 0.05 + k * 0.47, 8.5 - k * 0.9, 1.1, 0.12 + k * 0.47, 8.8 - k * 0.9, BC.woodD);
      // a dock to the side with a rowboat tied up
      H.flatBox(3.6, 0.3, -1, 9, 0.5, 1, BC.woodL); for (const x of [4.5, 6.5, 8.5]) for (const z of [-1.05, 1.05]) mb.cyl(x, -1.5, z, 0.12, 0.12, 2.6, 5, C('#4a3a2a'));
      mb.push([7, -0.15, 2.3], M4.rotY(0.15)); mb.lathe([[0, 0], [0.55, 0.05], [0.7, 0.45]], 10, C('#7a5a3a'), 0); mb.lathe([[0.66, 0.45], [0.51, 0.09], [0, 0.05]], 10, C('#5a4028'), 0); mb.pop(); mb.push([7, -0.15, 2.3], M4.rotY(0.15)); H.deco(-0.5, 0.25, -0.05, 0.5, 0.32, 0.05, BC.woodL); mb.pop();
      mb.caps([8.5, 0.6, 1.05], [7.2, 0.35, 2.1], 0.02, 0.02, 3, C('#d8c8a0'));
      // a fishing net hung on two poles
      for (const z of [-1.5, 1.5]) mb.cyl(-5, -0.5, z, 0.06, 0.06, 2.6, 4, C(BC.woodD)); for (let k = 0; k < 6; k++) { mb.caps([-5, 0.6 + k * 0.3, -1.5], [-5, 0.5 + k * 0.3, 1.5], 0.012, 0.012, 3, C('#c8b890')); mb.caps([-5, 0.4, -1.5 + k * 0.6], [-5, 2.0, -1.5 + k * 0.6], 0.012, 0.012, 3, C('#c8b890')); }
      H.lantern(3.4, 3.8, 3.4); H.barrel(-2.4, 3.15, 2.8); s.lights.push({ p: L(3.4, 4, 3.4), r: 9, c: [1, 0.8, 0.45] });
      item('mushroom', 0, 3.4, 0); break;
    }
    case 'arch': { // a glowing crystal arch on two pillars of stacked rock, floating crystals and a ring of runes
      for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) mb.ico(sx * 9 + (rnd(k + sx * 3) - 0.5) * 0.6, 0.3 + k * 1.1, (rnd(k + 7) - 0.5) * 0.6, [2.1 - k * 0.25, 0.75, 1.9 - k * 0.2], 1, (q, w) => shadeC(C('#6a5a7a'), 0.82 + w * 0.22 + (k % 2) * 0.05));
      for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI, x = Math.cos(a) * 9, y = 3.6 + Math.sin(a) * 8.4; mb.push([x, y, 0], M4.rotZ(a + Math.PI / 2)); mb.cyl(0, -0.75, 0, 0.75 + (k % 2) * 0.2, 0.75 + ((k + 1) % 2) * 0.2, 1.5, 6, glowC(C(k % 2 ? '#c08fff' : '#8ff6ff')), true, k * 0.5); for (const sd of [-1, 1]) { mb.push([0, 0, sd * 0.6], M4.rotX(sd * 0.8)); mb.cyl(0, 0, 0, 0.18, 0, 0.8, 5, glowC(C('#e8d8ff'))); mb.pop(); } mb.pop(); }
      for (let k = 0; k < 8; k++) { const a = rnd(k) * 6.28, d = 3 + rnd(k + 8) * 5; mb.push([Math.cos(a) * d, -0.3, Math.sin(a) * d], M4.rotZ((rnd(k + 2) - 0.5) * 0.6)); mb.cyl(0, 0, 0, 0.35, 0, 1.6 + rnd(k) * 1.5, 6, glowC(C(k % 2 ? '#c08fff' : '#8ff6ff'))); mb.pop(); }
      for (let k = 0; k < 5; k++) { const a = k * 1.256; mb.ico(Math.cos(a) * 3, 4 + (k % 3) * 1.2, Math.sin(a) * 3, [0.3, 0.55, 0.3], 0, () => glowC(C(k % 2 ? '#e8d8ff' : '#8ff6ff'))); }
      mb.tor([0, 0.05, 0], 5, 0.08, 30, 3, glowC(C('#c08fff'))); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; H.deco(Math.cos(a) * 5.6 - 0.15, 0.02, Math.sin(a) * 5.6 - 0.15, Math.cos(a) * 5.6 + 0.15, 0.08, Math.sin(a) * 5.6 + 0.15, glowC(C('#8ff6ff'))); }
      s.lights.push({ p: L(0, 9, 0), r: 14, c: [0.7, 0.5, 1] }); item('crystal', 0, 0.6, 0); item('gem', 3, 0.6, 2); break;
    }
    case 'shroomring': { // a fairy ring of giant mushrooms, little mushrooms, a stump table with toadstool seats, glowing lights and spores
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; giantShroom(mb, Math.cos(a) * 10, 0, Math.sin(a) * 10, 1 + rnd(k) * 0.6, rnd(k + 1)); }
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283 + 0.2, r = 7.5 + (k % 3) * 0.6, h = 0.4 + (k % 3) * 0.25, col = C(k % 2 ? '#e8504a' : '#c88aff'); mb.cyl(Math.cos(a) * r, -0.05, Math.sin(a) * r, 0.1, 0.08, h, 5, C('#f4ead8'), false); mb.cyl(Math.cos(a) * r, h - 0.05, Math.sin(a) * r, 0.35, 0.0, 0.28, 7, col); }
      for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; mb.ico(Math.cos(a) * 6, 0.25, Math.sin(a) * 6, 0.12, 0, () => glowC(C(k % 3 ? '#fff2a8' : '#ff9ad8'))); }
      for (let k = 0; k < 20; k++) { const a = rnd(k + 40) * 6.283, r = 2 + rnd(k + 41) * 6; mb.ico(Math.cos(a) * r, 1 + rnd(k + 42) * 4, Math.sin(a) * r, 0.06, 0, () => glowC(C('#e8ffb0'))); }
      mb.lathe([[1.3, -0.3], [1.15, 0.2], [1.05, 0.7], [1.08, 0.72], [0, 0.73]], 10, (t) => t > 0.95 ? C('#d8b080') : C('#6a4a32'), 0); for (let k = 0; k < 3; k++) mb.tor([0, 0.725, 0], 0.3 + k * 0.25, 0.015, 12, 3, C('#a8805a'));
      mb.cyl(0, 0.73, 0, 0.15, 0.15, 0.06, 6, C('#ffffff')); mb.ico(0.4, 0.8, 0.2, 0.08, 0, () => C('#ff5a5a'));
      for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.4; mb.cyl(Math.cos(a) * 2.2, -0.05, Math.sin(a) * 2.2, 0.15, 0.13, 0.4, 6, C('#f4ead8'), false); mb.cyl(Math.cos(a) * 2.2, 0.32, Math.sin(a) * 2.2, 0.45, 0.35, 0.18, 8, C('#e8504a')); }
      item('mushroom', 0, 1.3, 0); item('crystal', 2, 0.6, 1); break;
    }
    case 'wreck': { // a shipwreck half sunk in the sand: a tilted hull with portholes, a broken bow showing its ribs, a snapped mast, a torn sail, an anchor, cannons and treasure
      mb.push([0, -1.1, 0], M4.mul3(M4.rotZ(0.06), M4.rotX(0.32)));
      boatHull(mb, 17, 6, 2.6, 0.78);
      mb.cyl(-1, 2.2, 0, 0.32, 0.27, 7.5, 8, C(BC.woodD)); for (const y of [3.4, 5.6]) mb.tor([-1, y, 0], 0.33, 0.05, 10, 3, C(BC.metalD));
      mb.push([-1, 7.4, 0], M4.rotZ(1.9)); mb.cyl(0, 0, 0, 0.26, 0.2, 4.5, 8, C(BC.woodD)); mb.pop();
      mb.push([-1, 6.2, 0], M4.rotX(Math.PI / 2)); mb.cyl(0, -2.4, 0, 0.1, 0.1, 4.8, 5, C(BC.woodD)); mb.pop();
      for (let k = 0; k < 4; k++) { const z0 = -2.2 + k * 1.1, z1 = z0 + 1.1, tear = k === 2 ? 1.2 : 0; mb.tri2([-0.8, 6.1, z0], [-0.8, 6.1, z1], [-0.6, 3.0 + tear, z1 * 0.9], C(k % 2 ? '#e8e0cc' : '#d8d0bc')); mb.tri2([-0.8, 6.1, z0], [-0.6, 3.0 + tear, z1 * 0.9], [-0.6, 3.0, z0 * 0.9], C(k % 2 ? '#d8d0bc' : '#e8e0cc')); }
      for (let k = 0; k < 3; k++) mb.caps([-1, 7.2, 0], [4 - k * 1.3, 2.6, (k - 1) * 2.2], 0.025, 0.025, 3, C('#c8b890'));
      mb.box(-7.4, 2.5, -1.6, -5, 4.3, 1.6, C(BC.wood)); H.roof(-7.4, -5, -1.6, 1.6, 4.3, 0.9, BC.woodD, 0.2, 3); H.window(-5, 3.4, 0, 0.6, 0.6, 1); H.window(-6.2, 3.4, 1.6, 0.5, 0.5, 1); H.window(-6.2, 3.4, -1.6, 0.5, 0.5, -1);
      for (const sd of [-1, 1]) for (const x of [-3, 1]) { mb.push([x, 2.4, sd * 2.6], M4.rotX(sd * Math.PI / 2)); mb.cyl(0, 0, 0, 0.18, 0.14, 1.0, 8, C('#2a2a30')); mb.tor([0, 1.0, 0], 0.15, 0.04, 8, 3, C('#2a2a30')); mb.pop(); }
      mb.pop();
      // the anchor lying in the sand, with its chain
      mb.push([-9, 0.15, 2.5], M4.mul3(M4.rotY(0.7), M4.rotZ(Math.PI / 2 - 0.15))); mb.cyl(0, -1.4, 0, 0.12, 0.12, 2.6, 6, C(BC.metalD)); mb.tor([0, 1.35, 0], 0.25, 0.06, 10, 4, C(BC.metalD)); H.deco(-0.7, 0.7, -0.08, 0.7, 0.85, 0.08, BC.metalD); MB.tube(mb, [[-0.9, -0.9, 0], [-0.6, -1.4, 0], [0, -1.55, 0], [0.6, -1.4, 0], [0.9, -0.9, 0]], 0.1, 5, C(BC.metalD)); for (const sx of [-1, 1]) mb.cyl(sx * 0.95, -0.95, 0, 0.18, 0, 0.4, 4, C(BC.metalD)); mb.pop();
      for (let k = 0; k < 8; k++) mb.tor([-8.4 + k * 0.5, 0.05, 1.6 - k * 0.35], 0.16, 0.05, 8, 3, C('#5a5a60'));
      H.barrel(5, 5.4); H.barrel(6.2, 4.8); mb.push([4.2, 0.45, 6.6], M4.rotZ(Math.PI / 2)); H.barrel(0, 0); mb.pop();
      H.crate(-5, 6); H.crate(-6.1, 6.5, 0.6); mb.ico(-2, 0.1, 6.5, [1.2, 0.4, 0.9], 0, () => C('#d8c48f'));
      for (let k = 0; k < 6; k++) { const a = rnd(k + 60) * 6.28, d = 9 + rnd(k + 61) * 3; mb.push([Math.cos(a) * d, 0.05, Math.sin(a) * d], M4.rotY(a)); H.deco(-0.9, 0, -0.12, 0.9, 0.08, 0.12, BC.wood); mb.pop(); }
      mb.push([8, 0.15, -3], M4.rotY(0.4)); H.flatBox(-0.8, -0.1, -0.6, 0.8, 0.5, 0.6, '#7a4a2a'); mb.push([0, 0.5, -0.6], M4.rotX(-0.9)); mb.lathe([[0.62, 0], [0.5, 0.35], [0, 0.45]], 8, C('#9a6a3a'), 0); mb.pop();
      for (const sx of [-0.8, 0.8]) H.deco(sx - 0.05, -0.1, -0.62, sx + 0.05, 0.5, 0.62, BC.gold); for (let k = 0; k < 6; k++) mb.cyl(-0.5 + k * 0.2, 0.5, -0.2 + (k % 2) * 0.3, 0.1, 0.1, 0.06, 8, glowC(C(BC.gold))); mb.pop();
      s.lights.push({ p: L(8, 1, -3), r: 6, c: [1, 0.85, 0.4] }); item('shell', 4, 0.6, 7); item('coin', 8, 1, -3); break;
    }
    case 'lighthouse': { // a striped lighthouse on a stone base: windows, a door with steps, a railed balcony, a framed glass lamp room, a keeper's cottage, rocks and a little dock
      H.box(-4, -0.8, -4, 4, 0.4, 4, BC.stoneD); H.blockWall(-4, 4, -0.6, 0.4, 3.98, 4.04, BC.stone, rnd, 5);
      for (let k = 0; k < 6; k++) mb.cyl(0, 0.4 + k * 2.8, 0, 3 - k * 0.25, 2.75 - k * 0.25, 2.8, 14, k % 2 ? C('#eef3fb') : C('#d0503c'));
      for (let k = 0; k < 5; k++) mb.tor([0, 3.2 + k * 2.8, 0], 2.78 - k * 0.25, 0.05, 20, 3, C('#3a3f55'));
      mb.cyl(0, 17.2, 0, 2.7, 2.6, 0.35, 14, C('#3a3f55'));
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; H.flatBox(Math.cos(a) * 2.5 - 0.05, 17.5, Math.sin(a) * 2.5 - 0.05, Math.cos(a) * 2.5 + 0.05, 18.4, Math.sin(a) * 2.5 + 0.05, '#3a3f55'); }
      mb.tor([0, 18.4, 0], 2.5, 0.06, 24, 3, C('#3a3f55'));
      mb.cyl(0, 17.5, 0, 1.6, 1.6, 2.2, 8, glowC(C('#fff2a8'))); for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * 6.283; H.deco(Math.cos(a) * 1.62 - 0.05, 17.5, Math.sin(a) * 1.62 - 0.05, Math.cos(a) * 1.62 + 0.05, 19.7, Math.sin(a) * 1.62 + 0.05, '#2a2e3a'); }
      mb.cyl(0, 19.7, 0, 2.1, 0, 1.9, 8, C('#3a3f55')); mb.ico(0, 21.7, 0, 0.25, 0, () => C(BC.gold)); mb.cyl(0, 21.9, 0, 0.04, 0.04, 0.8, 4, C('#3a3f55'));
      for (const [y, r] of [[6, 2.5], [11.5, 2.0], [14.5, 1.8]]) H.window(0, y, r + 0.02, 0.6, 0.9, 1, true); H.window(0, 8.8, -2.3, 0.6, 0.9, -1, true);
      mb.push([0, 0.4, 3.0]); H.door(0, 0, 1.1, 2.1); mb.pop(); H.stairs(0, 5.2, 1.6, 1, 0.4, 0.8, BC.stone);
      for (let k = 0; k < 2; k++) mb.tor([2.9 + k * 0.05, 1.6 + k * 0.1, 0], 0.32, 0.08, 12, 4, (a) => Math.floor(a * 2) % 2 ? C('#ffffff') : C('#e8343a'));
      cottage(mb, H, 7, 0, Math.PI / 2, 4.6, 3.8, 2.8, BC.roofB, BC.plaster, rnd);
      H.rocks(-6, 4, 7, '#8a857c', 1.2, rnd); H.rocks(-5, -5, 5, '#7a756c', 1.0, k => rnd(k + 90));
      H.flatBox(-4, 0.1, -8.5, -2.6, 0.3, -3.8, BC.woodL); for (const z of [-8.3, -6.3]) for (const x of [-3.9, -2.7]) mb.cyl(x, -1.5, z, 0.1, 0.1, 2.1, 5, C(BC.woodD));
      s.lights.push({ p: L(0, 18.5, 0), r: 24, c: [1, 0.9, 0.6] }); item('shell', 5, 0.6, -5); break;
    }
    case 'cave': { // a mine entrance in a rocky outcrop: a timber frame with braces, rails with a minecart, lanterns, crystals, a sign and a pickaxe
      const rc = '#77736e';
      mb.ico(-4.2, 2, 0, [3.2, 3.4, 3], 1, (q, w) => shadeC(C(rc), 0.82 + w * 0.2)); mb.ico(4.2, 2, 0, [3.2, 3.4, 3], 1, (q, w) => shadeC(C(rc), 0.82 + w * 0.2));
      mb.ico(0, 6.2, -0.4, [5.2, 3, 3.6], 1, (q, w) => shadeC(C(rc), 0.8 + w * 0.22));
      for (let k = 0; k < 6; k++) { const a = k * 1.1; mb.ico(Math.cos(a) * 6.5, 0.3, Math.sin(a) * 2.5 - 1.5, [1 + rnd(k) * 0.8, 0.8, 1], 0, (q, w) => shadeC(C('#8a857c'), 0.85 + w * 0.2)); }
      mb.quad([-2.4, -0.5, 0.25], [2.4, -0.5, 0.25], [2.4, 4.4, 0.25], [-2.4, 4.4, 0.25], C('#05070c'), true);
      for (const sx of [-1, 1]) H.flatBox(sx * 2.4 - 0.22, -0.5, 0.3, sx * 2.4 + 0.22, 4.4, 0.74, BC.woodD);
      H.flatBox(-2.9, 4.2, 0.25, 2.9, 4.75, 0.78, BC.woodD); for (const sx of [-1, 1]) { mb.push([sx * 1.9, 3.7, 0.55], M4.rotZ(sx * 0.8)); H.deco(-0.08, -0.6, -0.08, 0.08, 0.6, 0.08, BC.woodD); mb.pop(); }
      for (let k = 0; k < 4; k++) H.deco(-2.2 + k * 1.4, 4.2, 0.78, -1.6 + k * 1.4, 4.75, 0.82, BC.metalD);
      H.lantern(-3.4, 2.4, 1.6); H.lantern(3.4, 2.4, 1.6);
      for (const [x, z, c, h] of [[-3, 2.5, '#8ff6ff', 1.5], [3.2, 2.6, '#c08fff', 1.2], [-3.6, 3.2, '#c08fff', 0.8], [3.8, 1.9, '#8ff6ff', 0.9]]) { mb.cyl(x, -0.5, z, 0.3, 0, h, 6, glowC(C(c))); mb.cyl(x + 0.3, -0.5, z + 0.1, 0.18, 0, h * 0.6, 6, glowC(C(c))); }
      for (let k = 0; k < 8; k++) H.flatBox(-0.75, -0.45, 0.6 + k * 0.85, 0.75, -0.38, 0.85 + k * 0.85, BC.woodD);
      for (const sx of [-0.55, 0.55]) H.flatBox(sx - 0.05, -0.38, 0.5, sx + 0.05, -0.3, 7.4, BC.metalD);
      // the minecart on the rails, loaded with ore
      mb.push([0, -0.3, 5.2]); H.flatBox(-0.75, 0.25, -0.9, 0.75, 1.1, 0.9, '#6a5a4a'); for (const z of [-0.9, 0.9]) H.deco(-0.78, 0.3, z - 0.03, 0.78, 1.05, z + 0.03, BC.metalD); for (const sx of [-0.58, 0.58]) for (const z of [-0.55, 0.55]) { mb.push([sx, 0.2, z], M4.rotZ(Math.PI / 2)); mb.cyl(0, -0.06, 0, 0.2, 0.2, 0.12, 8, C('#3a3a40')); mb.pop(); }
      for (let k = 0; k < 6; k++) mb.ico(-0.4 + (k % 3) * 0.4, 1.15, -0.4 + Math.floor(k / 3) * 0.6, 0.25, 0, () => k % 3 === 1 ? glowC(C('#8ff6ff')) : C('#5a5658')); mb.pop();
      H.flatBox(3.6, -0.5, 4.5, 3.75, 1.6, 4.65, BC.wood); H.flatBox(3.0, 1.2, 4.52, 4.4, 1.8, 4.6, BC.woodL);
      mb.push([-3.2, 0.1, 4.5], M4.rotZ(0.5)); mb.cyl(0, 0, 0, 0.04, 0.04, 1.2, 5, C(BC.woodD)); mb.push([0, 1.15, 0], M4.rotZ(Math.PI / 2)); mb.caps([0, -0.4, 0], [0, 0.4, 0], 0.05, 0.02, 5, C(BC.metal)); mb.pop(); mb.pop();
      s.triggers.push({ kind: 'cave', p: L(0, 1, 0.8), r: 2.2, cave: p.key, out: L(0, 1.5, 4) });
      s.lights.push({ p: L(0, 1.5, 2), r: 7, c: [1, 0.8, 0.45] }); break;
    }
  }
}
