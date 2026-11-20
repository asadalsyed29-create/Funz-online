// More minigames: the sky race high above the Fun Park, the fishing pier on the west beach,
// and the game arena (tag and hide and seek, with friendly bots when there aren't enough players).

// ======================= SKY RACE =======================
// a glowing track floating 140 m up, with boost pads, jumps, spinning sweepers and bumpers
const SKY_PTS = [[0, 0, 0], [0, 0, -34], [-4, -3, -62], [-26, -6, -86], [-58, -9, -94], [-88, -12, -78], [-102, -15, -48], [-98, -18, -16], [-74, -21, 8], [-44, -25, 18], [-14, -28, 34], [18, -31, 38], [46, -34, 22], [58, -37, -8], [52, -40, -40], [30, -42, -58]];
const SKY_W = 9;
class SkyRace {
  constructor(game, park) {
    this.g = game; this.park = park;
    this.pad = park.W(32, 0, 26);
    this.o = park.W(30, 140, 20);
    // sample the path smoothly (Catmull-Rom) every ~1.5 m
    const P = SKY_PTS.map(q => [this.o[0] + q[0], this.o[1] + q[1], this.o[2] + q[2]]), S = []; let s = 0;
    for (let k = 0; k < P.length - 1; k++) {
      const p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(P.length - 1, k + 2)], n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[2] - p1[2]) / 1.5);
      for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; const q = [0, 1, 2].map(i => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
        if (S.length) s += Math.hypot(q[0] - S[S.length - 1].p[0], q[2] - S[S.length - 1].p[2]); S.push({ p: q, s }); }
    }
    { const q = P[P.length - 1]; s += Math.hypot(q[0] - S[S.length - 1].p[0], q[2] - S[S.length - 1].p[2]); S.push({ p: [...q], s }); }
    S.forEach((a, i) => { const b = S[Math.min(S.length - 1, i + 1)], c = S[Math.max(0, i - 1)], dx = b.p[0] - c.p[0], dz = b.p[2] - c.p[2], l = Math.hypot(dx, dz) || 1; a.d = [dx / l, dz / l]; a.r = [-dz / l, dx / l]; });
    this.S = S; this.L = s;
    const at = sv => { let i = 0; while (i < S.length - 1 && S[i].s < sv) i++; return i; };
    this.at = at;
    // the features, by distance along the track
    this.gaps = [[208, 220], [378, 388]].map(([a, b]) => [at(a), at(b)]);
    for (const [g0] of this.gaps) { const i0 = at(S[g0].s - 9); for (let i = i0; i <= g0; i++) S[i].p[1] += 2.4 * (S[i].s - S[i0].s) / (S[g0].s - S[i0].s); } // kicker ramps
    this.boosts = [36, 104, 168, 196, 252, 330, 366, 430].map(v => at(v));
    this.sweepers = [140, 300].map(v => ({ i: at(v), w: v === 140 ? 1.3 : -1.6 }));
    this.bumpers = [[262, -2.6], [270, 2.6], [278, -0.4], [286, 2.8], [292, -2.8]].map(([v, off]) => { const a = S[at(v)]; return [a.p[0] + a.r[0] * off, a.p[1], a.p[2] + a.r[1] * off]; });
    this.cps = [0, at(96), at(186), at(240), at(318), at(356), at(420)];
    this.finishI = S.length - 8;
    this.state = null; this.best = null; this.ghost = null;
    try { const g = JSON.parse(localStorage.getItem('funz.skyghost') || 'null'); if (g && g.t > 0 && Array.isArray(g.pts)) { this.best = g.t; this.ghost = g.pts; } } catch (e) {}
  }
  floorAt(i) { return !this.gaps.some(([a, b]) => i > a && i < b); }
  build(gl, st) {
    const S = this.S, mb = new MeshBuilder().collect(), C = hex, hw = SKY_W / 2, up = 0.7;
    const s = { key: 'skyrace', items: [], lights: [], triggers: [], x: this.o[0] - 20, z: this.o[2] - 30, far: 1600, rad: 110, signs: [] };
    const E = (a, side, w = hw, dy = 0) => [a.p[0] + a.r[0] * side * w, a.p[1] + dy, a.p[2] + a.r[1] * side * w];
    for (let i = 0; i < S.length - 1; i++) {
      if (!this.floorAt(i) || !this.floorAt(i + 1)) continue;
      const a = S[i], b = S[i + 1], band = Math.floor(a.s / 6) % 2, col = C(band ? '#2c3654' : '#343f62'), side = C('#1d2438');
      mb.quad(E(a, -1), E(a, 1), E(b, 1), E(b, -1), col);
      mb.quad(E(b, -1, hw, -up), E(b, 1, hw, -up), E(a, 1, hw, -up), E(a, -1, hw, -up), side);
      mb.quad(E(a, -1, hw, -up), E(a, -1), E(b, -1), E(b, -1, hw, -up), side);
      mb.quad(E(b, 1, hw, -up), E(b, 1), E(a, 1), E(a, 1, hw, -up), side);
      // glowing lane edges on the floor and rails along both sides
      for (const sd of [-1, 1]) {
        mb.quad(E(a, sd, sd < 0 ? hw - 0.25 : hw - 0.45, 0.02), E(a, sd, sd < 0 ? hw - 0.45 : hw - 0.25, 0.02), E(b, sd, sd < 0 ? hw - 0.45 : hw - 0.25, 0.02), E(b, sd, sd < 0 ? hw - 0.25 : hw - 0.45, 0.02), glowC(C('#5ff0e0')), true);
        const A0 = E(a, sd), B0 = E(b, sd), A1 = E(a, sd, hw, 1.0), B1 = E(b, sd, hw, 1.0), wc = [0.55, 0.75, 0.95, 1];
        mb.quad(A0, B0, B1, A1, wc); mb.quad(A0, A1, B1, B0, shadeC(wc, 0.8), true);
        mb.quad(E(a, sd, hw - 0.06, 1.0), E(a, sd, hw + 0.06, 1.0), E(b, sd, hw + 0.06, 1.0), E(b, sd, hw - 0.06, 1.0), glowC(C(sd < 0 ? '#ff5ad8' : '#5ab8ff')), true);
        if (sd < 0) mb.quad(E(a, sd, hw - 0.06, 1.0), E(b, sd, hw - 0.06, 1.0), E(b, sd, hw + 0.06, 1.0), E(a, sd, hw + 0.06, 1.0), glowC(C('#ff5ad8')), true);
      }
      if (i % 9 === 0) { mb.cyl(a.p[0], a.p[1] - up - 0.5, a.p[2], 1.3, 1.6, 0.5, 10, C('#3a4466'), true); mb.cyl(a.p[0], a.p[1] - up - 0.62, a.p[2], 1.0, 1.0, 0.12, 10, glowC(C('#7ae8ff')), true); }
      if (i % 8 === 4 && !this.boosts.some(k => Math.abs(k - i) < 4)) { // faint arrows showing the way
        const c = [a.p[0], a.p[1] + 0.025, a.p[2]], f = a.d, r = a.r, ar = (u, v) => [c[0] + f[0] * u + r[0] * v, c[1], c[2] + f[1] * u + r[1] * v];
        mb.quad(ar(-0.3, -1.2), ar(-0.3, -0.9), ar(0.5, 0.15), ar(0.5, -0.15), [0.42, 0.5, 0.72, 1], true); mb.quad(ar(0.5, -0.15), ar(0.5, 0.15), ar(-0.3, 0.9), ar(-0.3, 1.2), [0.42, 0.5, 0.72, 1], true);
      }
    }
    // boost pads: orange glowing chevrons across the whole lane
    for (const i of this.boosts) { const a = S[i]; for (let k = 0; k < 3; k++) { const c = [a.p[0] + a.d[0] * (k - 1) * 1.1, a.p[1] + 0.03, a.p[2] + a.d[1] * (k - 1) * 1.1], f = a.d, r = a.r, ar = (u, v) => [c[0] + f[0] * u + r[0] * v, c[1], c[2] + f[1] * u + r[1] * v];
      mb.quad(ar(-0.45, -hw + 0.6), ar(-0.1, -hw + 0.6), ar(0.45, 0), ar(0.1, 0), glowC(C('#ff9a3a')), true); mb.quad(ar(0.1, 0), ar(0.45, 0), ar(-0.1, hw - 0.6), ar(-0.45, hw - 0.6), glowC(C('#ff9a3a')), true); } }
    // checkpoint arches and the finish gate
    this.cps.forEach((i, k) => { if (!k) return; const a = S[i]; mb.push([a.p[0], a.p[1], a.p[2]], M4.mul3(M4.rotY(Math.atan2(a.d[0], a.d[1])), M4.rotX(Math.PI / 2))); mb.tor([0, 0, 0], hw + 0.6, 0.22, 28, 8, (A) => Math.sin(A) < 0 ? glowC(C('#ffd24a')) : C('#3a4466')); mb.pop(); });
    // start and finish platforms
    for (const [i, col, word] of [[0, '#7aff9a', 'Start'], [S.length - 1, '#ffd24a', 'Finish']]) {
      // local frame: x across the track, z backwards along it (so -z is the way to go)
      const a = S[i], c = a.p, u0 = i ? -2 : -14, u1 = i ? 14 : 2;
      mb.push(c, M4.rotY(Math.atan2(-a.r[1], a.r[0])));
      mb.box(-9, -1.2, -u1, 9, 0, -u0, C('#3a4568'));
      for (let k = -8; k <= 8; k += 4) mb.box(k - 0.06, 0.005, -u1 + 0.5, k + 0.06, 0.02, -u0 - 0.5, glowC(C('#5ff0e0')), false, true);
      for (const [x0, z0, x1, z1] of [[-9, -u1, -8.6, -u0], [8.6, -u1, 9, -u0], i ? [-9, -u1, 9, -u1 + 0.4] : [-9, -u0 - 0.4, 9, -u0]]) mb.box(x0, 0, z0, x1, 1, z1, C('#8aa0c8'));
      for (const sd of [-1, 1]) { mb.cyl(sd * (hw + 0.6), 0, 0, 0.35, 0.3, 5.2, 10, C('#4a5680')); mb.ico(sd * (hw + 0.6), 5.4, 0, 0.45, 1, () => glowC(C(col))); const q = [c[0] + a.r[0] * sd * (hw + 0.6), c[1] + 5.4, c[2] + a.r[1] * sd * (hw + 0.6)]; s.lights.push({ p: q, r: 10, c: [0.7, 1, 0.8] }); }
      mb.caps([-(hw + 0.6), 4.8, 0], [hw + 0.6, 4.8, 0], 0.22, 0.22, 8, glowC(C(col)));
      mb.pop();
      s.signs.push({ p: [c[0], c[1] + 6.2, c[2]], t: word });
    }
    // the launch pad down in the Fun Park, with its beam
    const pd = this.pad; for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; mb.box(pd[0] + Math.cos(a) * 1.3 - 0.18, pd[1] + 0.05, pd[2] + Math.sin(a) * 1.3 - 0.18, pd[0] + Math.cos(a) * 1.3 + 0.18, pd[1] + 0.12, pd[2] + Math.sin(a) * 1.3 + 0.18, glowC(C('#5af0ff')), false, true); }
    mb.cyl(pd[0], pd[1], pd[2], 1.05, 1.05, 0.06, 14, C('#2c3654'), true);
    s.signs.push({ p: [pd[0], pd[1] + 1.8, pd[2]], t: 'Sky race: roll here to launch!' });
    s.mesh = mb.build(gl); st.grid.add(mb.tris, s);
    // moving bits
    const sw = new MeshBuilder(); sw.cyl(0, 0, 0, 0.42, 0.42, 1.5, 12, hex('#4a5680')); sw.ico(0, 1.6, 0, 0.35, 1, () => glowC(hex('#ff5a6a')));
    sw.push([0, 0.55, 0], M4.rotZ(Math.PI / 2)); sw.caps([0, -hw + 0.3, 0], [0, hw - 0.3, 0], 0.26, 0.26, 10, hex('#ff5a6a')); sw.pop(); this.sweepM = sw.build(gl);
    const bm = new MeshBuilder(); bm.cyl(0, 0, 0, 0.75, 0.75, 1.0, 14, hex('#c84ad8')); bm.cyl(0, 1.0, 0, 0.75, 0.55, 0.25, 14, glowC(hex('#ff8af0'))); this.bumpM = bm.build(gl);
    const beam = new MeshBuilder(); beam.cyl(0, 0, 0, 1, 1, 1, 16, glowC(hex('#5af0ff')), false); this.beamM = beam.build(gl);
    return s;
  }
  // ---------- each frame ----------
  update(dt, b, now, ui, cam) {
    const S = this.S, st = this.state;
    if (!st) {
      if (now > (this.cool || 0) && Math.hypot(b.p[0] - this.pad[0], b.p[2] - this.pad[2]) < 1.4 && Math.abs(b.p[1] - this.pad[1]) < 2) {
        this.state = { ph: 'launch', t: 0, from: [...b.p], cp: 0, pi: 0 }; Sound.play('boost');
        ui.banner('Sky race', 'Up you go!', 'Boost pads speed you up. Hit them before the jumps!');
      }
      return false;
    }
    st.t += dt;
    const a0 = S[0], startP = [a0.p[0] - a0.d[0] * 6, a0.p[1] + 0.5, a0.p[2] - a0.d[1] * 6], face = a => { cam.yaw = Math.atan2(-a.d[0], -a.d[1]); };
    if (st.ph === 'launch') { // ride the beam up to the start platform
      const k = Math.min(1, st.t / 2.2), e = k * k * (3 - 2 * k);
      b.p = st.from.map((v, i) => v + (startP[i] - v) * e); if (k < 0.95) b.p[0] = st.from[0] + (startP[0] - st.from[0]) * Math.max(0, (e - 0.5) * 2), b.p[2] = st.from[2] + (startP[2] - st.from[2]) * Math.max(0, (e - 0.5) * 2);
      b.v = [0, 0, 0]; if (Math.random() < 0.6) this.g.fx.emit([b.p[0] + (Math.random() - 0.5), b.p[1] - 0.5, b.p[2] + (Math.random() - 0.5)], { v: [0, -3, 0], life: 0.6, size: 0.14, col: [0.5, 0.95, 1], shape: 26, drag: 1 });
      if (k >= 1) { st.ph = 'count'; st.t = 0; face(a0); Sound.play('tp'); }
      return true;
    }
    if (st.ph === 'count') {
      if (Math.hypot(b.p[0] - startP[0], b.p[2] - startP[2]) > 20) { this.state = null; return false; }
      b.p = [...startP]; b.v = [0, 0, 0];
      const n = 3 - Math.floor(st.t); if (n !== st.lastN && n > 0) { st.lastN = n; ui.toast(String(n), 700); Sound.play('click'); }
      if (st.t >= 3) { st.ph = 'race'; st.t = 0; st.rec = []; st.recT = 0; ui.toast('Go!', 900); Sound.play('boost'); }
      return true;
    }
    if (st.ph === 'done') { if (st.t > 2.5) { b.p = [this.pad[0] + 3, this.pad[1] + 1, this.pad[2]]; b.v = [0, 0, 0]; Sound.play('tp'); this.state = null; this.cool = now + 4000; } return false; }
    // racing: where along the track are we?
    let bi = st.pi, bd = 1e9;
    for (let i = Math.max(0, st.pi - 12); i < Math.min(S.length, st.pi + 40); i++) { const q = S[i].p, d = Math.hypot(b.p[0] - q[0], b.p[2] - q[2]) + Math.abs(b.p[1] - q[1]) * 0.5; if (d < bd) { bd = d; bi = i; } }
    if (bd < 10) st.pi = bi;
    for (let k = this.cps.length - 1; k > st.cp; k--) if (st.pi >= this.cps[k]) { st.cp = k; ui.toast('Checkpoint ' + k + ' · ' + st.t.toFixed(1) + ' s', 1100); Sound.play('coin'); break; }
    // boost pads
    for (const i of this.boosts) { const a = S[i], dx = b.p[0] - a.p[0], dz = b.p[2] - a.p[2], along = dx * a.d[0] + dz * a.d[1], side = dx * a.r[0] + dz * a.r[1];
      if (Math.abs(along) < 1.8 && Math.abs(side) < SKY_W / 2 && Math.abs(b.p[1] - a.p[1]) < 1.4 && now > (st.boostCool || 0)) { b.v[0] = a.d[0] * 23; b.v[2] = a.d[1] * 23; b.v[1] = Math.max(b.v[1], 1); b.boostT = 1.3; st.boostCool = now + 400; Sound.play('boost'); this.g.fx.burst(b.p, 10, { cols: ['#ffb45a', '#ffffff'], shape: 29, size: 0.3, speed: 4, life: 0.4 }); } }
    // spinning sweepers knock you sideways
    for (const sw of this.sweepers) { const a = S[sw.i], ang = now / 1000 * sw.w, ux = Math.cos(ang), uz = Math.sin(ang), dx = b.p[0] - a.p[0], dz = b.p[2] - a.p[2];
      if (Math.abs(b.p[1] - a.p[1] - 0.55) > 1.0) continue;
      const along = Math.max(-SKY_W / 2, Math.min(SKY_W / 2, dx * ux + dz * uz)), px = dx - ux * along, pz = dz - uz * along, pd = Math.hypot(px, pz);
      if (pd < 0.72 && pd > 0.001) { const nx = px / pd, nz = pz / pd; b.p[0] += nx * (0.72 - pd); b.p[2] += nz * (0.72 - pd); const sp = Math.abs(sw.w * along) + 7; b.v[0] = nx * sp; b.v[2] = nz * sp; b.v[1] = 4; b.boostT = 0.5; Sound.play('land'); }
      const cd = Math.hypot(dx, dz); if (cd < 0.87 && cd > 0.001) { b.p[0] = a.p[0] + dx / cd * 0.87; b.p[2] = a.p[2] + dz / cd * 0.87; } }
    // bumpers bounce you off
    for (const q of this.bumpers) { const dx = b.p[0] - q[0], dz = b.p[2] - q[2], d = Math.hypot(dx, dz);
      if (d < 1.2 && b.p[1] - q[1] < 1.6 && d > 0.001) { const nx = dx / d, nz = dz / d, vn = b.v[0] * nx + b.v[2] * nz; b.p[0] = q[0] + nx * 1.2; b.p[2] = q[2] + nz * 1.2; const k = Math.max(9, -vn * 1.4); b.v[0] += nx * (k - Math.min(0, vn)); b.v[2] += nz * (k - Math.min(0, vn)); b.boostT = 0.4; Sound.play('jump'); } }
    // jumps: a gentle magnet keeps you lined up with the track while you fly over a gap, and the speed stays sane
    { const hs = Math.hypot(b.v[0], b.v[2]); if (hs > 26) { b.v[0] *= 26 / hs; b.v[2] *= 26 / hs; } }
    if (!b.grounded && this.gaps.some(([g0, g1]) => st.pi > g0 - 10 && st.pi < g1 + 14)) {
      const a = S[Math.min(S.length - 1, st.pi + 3)], hs = Math.hypot(b.v[0], b.v[2]), side = (b.p[0] - a.p[0]) * a.r[0] + (b.p[2] - a.p[2]) * a.r[1], k = Math.min(1, dt * 6);
      b.v[0] += (a.d[0] * hs - side * a.r[0] * 2.5 - b.v[0]) * k; b.v[2] += (a.d[1] * hs - side * a.r[1] * 2.5 - b.v[2]) * k;
    }
    // ghost recording
    st.recT += dt; if (st.recT >= 0.1) { st.recT -= 0.1; st.rec.push(+b.p[0].toFixed(1), +b.p[1].toFixed(1), +b.p[2].toFixed(1)); }
    // fell off: back to the last checkpoint
    if (b.p[1] < S[st.pi].p[1] - 14) { const a = S[this.cps[st.cp]]; b.p = st.cp ? [a.p[0], a.p[1] + 1, a.p[2]] : [...startP]; b.v = [0, 0, 0]; st.pi = this.cps[st.cp]; face(a); ui.toast('Whoops! Back to the checkpoint', 1200); Sound.play('tp'); }
    else if (Math.hypot(b.p[0] - S[st.pi].p[0], b.p[2] - S[st.pi].p[2]) > 120) { this.state = null; ui.toast('Sky race stopped', 1400); return false; }
    if (st.pi >= this.finishI && Math.abs(b.p[1] - S[st.pi].p[1]) < 2.5) this.finish(st, ui);
    return false;
  }
  finish(st, ui) {
    const t = st.t, nb = this.best == null || t < this.best;
    if (nb) { this.best = t; this.ghost = st.rec; try { localStorage.setItem('funz.skyghost', JSON.stringify({ t, pts: st.rec })); } catch (e) {} }
    const coins = Math.max(15, Math.round(100 - t));
    ui.finish('Sky race: ' + t.toFixed(2) + ' s' + (nb ? ' · new best!' : ' · best ' + this.best.toFixed(2) + ' s') + ' · +' + coins + ' coins', coins, 'sky', t);
    st.ph = 'done'; st.t = 0;
  }
  draw(G, t, me) {
    G.mat(1, 0.3, 0.6); G.tex(0);
    for (const sw of this.sweepers) { const a = this.S[sw.i], M = M4.model(a.p, M4.rotY(-t * sw.w), 1); G.draw(this.sweepM, M); G.outline(this.sweepM, M, 0.02); }
    for (const q of this.bumpers) { const k = 1 + Math.sin(t * 6 + q[0]) * 0.04; G.draw(this.bumpM, M4.model(q, null, [k, 1, k]), 1, null, 0.2); }
  }
  drawClear(G, t, me) {
    // the launch beam
    G.mat(0, 0, 0); const pd = this.pad, h = this.o[1] - pd[1];
    G.draw(this.beamM, M4.model(pd, M4.rotY(t), [0.9, h, 0.9]), 0.12 + Math.sin(t * 3) * 0.03, null, 1);
    // your best run, as a see-through ghost ball
    const st = this.state;
    if (st && st.ph === 'race' && this.ghost && this.ghost.length > 6) {
      const f = st.t * 10, i = Math.min(Math.floor(f), this.ghost.length / 3 - 2), k = Math.min(1, f - i), g = this.ghost, p = [0, 1, 2].map(c => g[i * 3 + c] + (g[i * 3 + 3 + c] - g[i * 3 + c]) * k);
      if (Math.hypot(p[0] - me.p[0], p[2] - me.p[2]) > 0.6) G.ball(M4.model(p, null, 0.45), 0, [0.55, 0.95, 1], [0.55, 0.95, 1], 0.35);
    }
  }
  chip() {
    const st = this.state; if (!st) return '';
    if (st.ph === 'race') return 'Sky race · ' + st.t.toFixed(1) + ' s · checkpoint ' + st.cp + '/' + (this.cps.length - 1) + (this.best ? ' · best ' + this.best.toFixed(1) + ' s' : '');
    if (st.ph === 'count') return 'Sky race · get ready!';
    return 'Sky race';
  }
}

// ======================= FISHING PIER =======================
// a wooden pier into the sea on the west beach. Cast, wait for a bite, then reel it in.
const PIER = { x0: -484, x1: -556, z: 0, y: 1.5, end: [-562, 0] };
const FISH_RARITY = [
  { n: 'Common', c: '#d4dceb', coins: 8, d: 0.25 }, { n: 'Uncommon', c: '#7be36b', coins: 16, d: 0.45 },
  { n: 'Rare', c: '#5ab8f0', coins: 35, d: 0.68 }, { n: 'Legendary', c: '#ffc45a', coins: 90, d: 0.9 },
];
const FISH = {
  perch: { name: 'Sunny perch', rar: 0, cm: [14, 30], col: '#d8c24a', w: 30 },
  bluegill: { name: 'Bluegill', rar: 0, cm: [10, 25], col: '#4a7ad8', w: 30 },
  trout: { name: 'Rainbow trout', rar: 1, cm: [30, 70], col: '#e88aa8', w: 16 },
  puffer: { name: 'Pufferfish', rar: 1, cm: [15, 35], col: '#e8d48a', w: 13 },
  clown: { name: 'Clownfish', rar: 1, cm: [8, 14], col: '#ff7a2a', w: 13 },
  sword: { name: 'Swordfish', rar: 2, cm: [120, 300], col: '#5a7aa8', w: 6 },
  koi: { name: 'Golden koi', rar: 2, cm: [40, 90], col: '#ffb43a', w: 6 },
  squid: { name: 'Glow squid', rar: 2, cm: [30, 80], col: '#5af0e0', w: 9, night: true },
  eel: { name: 'Thunder eel', rar: 3, cm: [90, 200], col: '#ffe24a', w: 1.6, rain: true },
  angler: { name: 'Lantern anglerfish', rar: 3, cm: [20, 60], col: '#7a5ab8', w: 2.2, night: true },
  boot: { name: 'Old boot', rar: -1, cm: [26, 30], col: '#7a5236', w: 5 },
};
// each fish is its own model: made hanging head-up (as if on the line), back towards +z, about 1 unit long
function fishModel(gl, id) {
  const mb = new MeshBuilder(), C = hex, G = c => glowC(hex(c)), eye = (y, z, r, x) => { for (const s of [-1, 1]) { mb.sph([s * x, y, z], r, 8, C('#ffffff'), 0); mb.sph([s * (x + r * 0.55), y, z + r * 0.15], r * 0.55, 6, C('#111318'), 0); } };
  const tail = (y0, y1, w, col, fork = 0.4) => { mb.tri2([0, y0, 0], [0, y1, w], [0, y1 + (y0 - y1) * fork, 0], col); mb.tri2([0, y0, 0], [0, y1 + (y0 - y1) * fork, 0], [0, y1, -w], col); };
  const fin = (pts, col) => { for (let k = 1; k < pts.length - 1; k++) mb.tri2([0, ...pts[0]], [0, ...pts[k]], [0, ...pts[k + 1]], col); };
  const side = (x, y, z, len, col) => { for (const s of [-1, 1]) mb.tri2([s * x, y, z], [s * (x + len * 0.7), y - len, z - len * 0.3], [s * (x + len * 0.2), y - len * 0.9, z + len * 0.25], col); };
  const body = (prof, flat, col) => { mb.push([0, 0, 0], null, [flat, 1, 1]); mb.lathe(prof, 16, col, 0); mb.pop(); };
  const belly = (top, low) => (t, ph) => Math.sin(ph) < -0.35 ? C(low) : C(top);
  switch (id) {
    case 'perch': {
      body([[0, -0.33], [0.05, -0.3], [0.12, -0.16], [0.16, 0.04], [0.15, 0.22], [0.11, 0.36], [0.05, 0.46], [0, 0.5]], 0.45, (t, ph) => Math.sin(ph) < -0.4 ? C('#f2ecc0') : (t > 0.25 && t < 0.75 && Math.floor(t * 9) % 2 ? C('#5a6a2a') : C('#c8b83a')));
      fin([[0.0, 0.14], [-0.12, 0.19], [-0.02, 0.24], [0.08, 0.26], [0.18, 0.22], [0.3, 0.16], [0.3, 0.12]], C('#9a8a2a'));
      tail(-0.3, -0.52, 0.16, C('#d07a2a')); side(0.06, 0.28, -0.04, 0.12, C('#e89a3a')); eye(0.38, 0.03, 0.035, 0.05);
      break;
    }
    case 'bluegill': {
      body([[0, -0.3], [0.05, -0.27], [0.18, -0.12], [0.24, 0.05], [0.22, 0.22], [0.15, 0.35], [0.06, 0.44], [0, 0.47]], 0.3, belly('#3a6ac8', '#ff9a3a'));
      fin([[-0.15, 0.16], [0.1, 0.27], [0.25, 0.25], [0.3, 0.18]], C('#2a4a98')); fin([[-0.15, -0.16], [0.05, -0.24], [0.2, -0.2]], C('#2a4a98'));
      for (const s of [-1, 1]) mb.sph([s * 0.06, 0.3, 0.06], [0.015, 0.04, 0.035], 6, C('#101830'), 0);
      tail(-0.27, -0.48, 0.15, C('#2a5ab8'), 0.25); side(0.07, 0.25, -0.05, 0.1, C('#5a8ae8')); eye(0.36, 0.05, 0.035, 0.05);
      break;
    }
    case 'trout': {
      const N = (t, ph) => (Math.sin(t * 91 + ph * 7) * Math.sin(t * 37 - ph * 13)) > 0.7;
      body([[0, -0.4], [0.04, -0.37], [0.09, -0.2], [0.11, 0.05], [0.1, 0.28], [0.07, 0.42], [0, 0.5]], 0.62, (t, ph) => Math.abs(Math.cos(ph)) > 0.8 && Math.sin(ph) < 0.35 ? C('#f07a9a') : N(t, ph) && Math.sin(ph) > -0.2 ? C('#3a4a3a') : Math.sin(ph) > 0.3 ? C('#7a9a7a') : C('#e8eef2'));
      fin([[0.0, 0.08], [0.12, 0.13], [0.26, 0.1], [0.24, 0.06]], C('#7a9a7a')); fin([[-0.22, 0.06], [-0.26, 0.1], [-0.3, 0.06]], C('#7a9a7a'));
      tail(-0.37, -0.56, 0.13, C('#8aa08a'), 0.15); side(0.05, 0.3, -0.05, 0.09, C('#e8b0c0')); eye(0.41, 0.02, 0.025, 0.045);
      break;
    }
    case 'puffer': {
      mb.ico(0, 0.06, 0, 0.3, 2, (x, y, z) => z < -0.25 ? C('#fff6d8') : (Math.sin(x * 19) * Math.sin(y * 17) > 0.45 ? C('#8a6a2a') : C('#e8cc7a')));
      for (let k = 0; k < 40; k++) { const u = Math.acos(1 - 2 * (k + 0.5) / 40), v = k * 2.39996, d = [Math.sin(u) * Math.cos(v), Math.cos(u), Math.sin(u) * Math.sin(v)]; if (d[1] > 0.85) continue; mb.caps([d[0] * 0.27, 0.06 + d[1] * 0.27, d[2] * 0.27], [d[0] * 0.4, 0.06 + d[1] * 0.4, d[2] * 0.4], 0.025, 0.004, 4, C('#f6eccc')); }
      mb.sph([0, 0.37, 0.02], [0.06, 0.04, 0.05], 8, C('#d88a5a'), 0); tail(-0.22, -0.4, 0.1, C('#d8b85a'), 0.2); eye(0.22, 0.08, 0.06, 0.13);
      break;
    }
    case 'clown': {
      const band = t => (t > 0.18 && t < 0.28) || (t > 0.5 && t < 0.6) || (t > 0.8 && t < 0.88), edge = t => (t > 0.16 && t < 0.18) || (t > 0.28 && t < 0.3) || (t > 0.48 && t < 0.5) || (t > 0.6 && t < 0.62) || (t > 0.78 && t < 0.8) || (t > 0.88 && t < 0.9);
      body([[0, -0.32], [0.05, -0.29], [0.13, -0.15], [0.17, 0.05], [0.16, 0.24], [0.11, 0.38], [0.04, 0.47], [0, 0.49]], 0.5, t => edge(t) ? C('#16181e') : band(t) ? C('#ffffff') : C('#ff7a1a'));
      fin([[-0.05, 0.13], [0.0, 0.2], [0.12, 0.24], [0.28, 0.2], [0.3, 0.14]], C('#ff8a2a'));
      tail(-0.29, -0.47, 0.13, C('#ff8a2a'), 0.0); side(0.07, 0.26, -0.03, 0.1, C('#ff9a3a')); eye(0.38, 0.04, 0.035, 0.055);
      break;
    }
    case 'sword': {
      body([[0, -0.36], [0.03, -0.33], [0.07, -0.15], [0.09, 0.05], [0.07, 0.18], [0.04, 0.24], [0, 0.26]], 0.7, belly('#3a5a8a', '#e0e6ee'));
      mb.cone(0, 0.24, 0, 0.022, 0.28, 6, C('#2a3a5a'));
      fin([[0.0, 0.02], [0.24, 0.14], [0.18, 0.08], [0.0, 0.12]], C('#2a4a7a'));
      tail(-0.33, -0.44, 0.22, C('#2a4a7a'), 0.75); side(0.05, 0.15, -0.04, 0.12, C('#4a6a9a')); eye(0.19, 0.02, 0.025, 0.04);
      break;
    }
    case 'koi': {
      const spot = (t, ph) => Math.sin(t * 23 + ph * 3) + Math.sin(ph * 5 - t * 11) > 0.9;
      body([[0, -0.36], [0.05, -0.33], [0.1, -0.18], [0.13, 0.04], [0.12, 0.24], [0.09, 0.38], [0.04, 0.47], [0, 0.49]], 0.62, (t, ph) => spot(t, ph) ? C('#fff8ea') : C('#ffb02a'));
      fin([[0.0, -0.05], [0.14, 0.02], [0.3, 0.02], [0.32, -0.02]], C('#ffd06a'));
      tail(-0.33, -0.62, 0.22, C('#ffd06a'), 0.3); side(0.06, 0.28, -0.04, 0.16, C('#ffd06a')); eye(0.4, 0.03, 0.028, 0.045);
      for (const s of [-1, 1]) mb.caps([s * 0.03, 0.47, -0.02], [s * 0.1, 0.38, -0.1], 0.008, 0.004, 4, C('#e8a02a'));
      break;
    }
    case 'squid': {
      mb.lathe([[0, -0.05], [0.12, -0.04], [0.13, 0.1], [0.11, 0.3], [0.06, 0.45], [0, 0.52]], 14, (t, ph) => Math.sin(ph * 3 + t * 20) > 0.6 ? G('#9afff0') : C('#2aa8b8'));
      for (const s of [-1, 1]) mb.tri2([0, 0.3, 0], [s * 0.2, 0.42, 0], [0, 0.5, 0], G('#5af0e0'));
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, r = 0.08; let p = [Math.cos(a) * r, -0.04, Math.sin(a) * r]; for (let j = 0; j < 4; j++) { const q = [p[0] * 1.05 + Math.sin(j + k) * 0.02, p[1] - 0.11, p[2] * 1.05 + Math.cos(j * 1.3 + k) * 0.02]; mb.caps(p, q, 0.025 - j * 0.004, 0.02 - j * 0.004, 5, j === 3 ? G('#9afff0') : C('#2a98a8')); p = q; } }
      eye(0.0, 0.0, 0.035, 0.1);
      break;
    }
    case 'eel': {
      body([[0, -0.52], [0.03, -0.45], [0.05, -0.2], [0.055, 0.2], [0.05, 0.4], [0.03, 0.5], [0, 0.52]], 0.8, (t, ph) => Math.abs(Math.cos(ph)) > 0.75 && (Math.floor(t * 18) % 2 ? Math.sin(ph) > -0.1 : Math.sin(ph) < 0.1) ? G('#ffe24a') : C('#1e2440'));
      fin([[-0.48, 0.0], [-0.3, 0.07], [0.0, 0.08], [0.3, 0.07], [0.4, 0.0]].map(([y, z]) => [y, z + 0.04]), G('#ffd02a'));
      eye(0.45, 0.02, 0.02, 0.035);
      break;
    }
    case 'angler': {
      body([[0, -0.35], [0.04, -0.32], [0.1, -0.15], [0.18, 0.05], [0.26, 0.2], [0.25, 0.32], [0.16, 0.4], [0, 0.42]], 0.85, belly('#4a3a6a', '#2a2238'));
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; mb.cone(Math.cos(a) * 0.15 * 0.85, 0.37, Math.sin(a) * 0.15, 0.022, 0.07, 4, C('#f4f0e8')); }
      mb.sph([0, 0.4, 0], [0.13, 0.02, 0.13], 8, C('#120c18'), 0);
      mb.caps([0, 0.36, 0.2], [0, 0.52, 0.32], 0.012, 0.008, 4, C('#3a2a4a')); mb.caps([0, 0.52, 0.32], [0, 0.5, 0.42], 0.008, 0.008, 4, C('#3a2a4a'));
      mb.ico(0, 0.46, 0.44, 0.05, 1, () => G('#fff2a0'));
      tail(-0.32, -0.48, 0.12, C('#3a2a5a'), 0.2); side(0.15, 0.1, -0.02, 0.1, C('#5a4a7a')); eye(0.3, 0.12, 0.03, 0.12);
      break;
    }
    default: { // an old boot, hanging from its laces
      mb.box(-0.12, -0.5, -0.32, 0.12, -0.42, 0.14, C('#2a2018')); mb.box(-0.11, -0.42, -0.3, 0.11, -0.22, 0.13, C('#7a5236'));
      mb.cyl(0, -0.25, 0.04, 0.11, 0.12, 0.6, 10, C('#6a4630')); mb.cyl(0, 0.33, 0.04, 0.125, 0.125, 0.04, 10, C('#4a3020'));
      for (let k = 0; k < 4; k++) mb.box(-0.13, -0.1 + k * 0.1, 0.12, 0.13, -0.08 + k * 0.1, 0.15, C('#d8d0c0'));
      mb.ico(0.05, -0.2, 0.15, 0.04, 0, () => C('#4a7a3a'));
    }
  }
  return mb.build(gl);
}
// the little fish picture used in the reel bar
function fishIconSvg(col) { return '<svg viewBox="0 0 40 24" width="34" height="20"><path d="M3 12 Q14 1 27 7 L37 2 L34 12 L37 22 L27 17 Q14 23 3 12 Z" fill="' + col + '" stroke="#0a1022" stroke-width="2"/><circle cx="10" cy="10" r="2" fill="#0a1022"/></svg>'; }

class FishingPier {
  constructor(game) {
    this.g = game; const T = game.T; this.Y = PIER.y;
    this.land = Math.max(T.ground(PIER.x0 + 6, 0), 0.3);
    this.state = null; this.models = new Map();
  }
  build(gl, st) {
    const mb = new MeshBuilder().collect(), C = hex, Y = this.Y, H = bh(mb), T = this.g.T, z0 = -2.2, z1 = 2.2, E = PIER.end;
    const s = { key: 'pier', items: [], lights: [], triggers: [], x: (PIER.x0 + PIER.x1) / 2, z: 0, rad: 60, signs: [] };
    const wood = k => C(['#a8774a', '#9a6a3e', '#b4824f', '#8f633a'][k & 3]);
    // ramp up from the sand, then the long deck with planks across it
    const gx = PIER.x0 + 7, gy = T.ground(gx, 0);
    for (let k = 0; k < 7; k++) { const xa = PIER.x0 + 7 - k, xb = xa - 1, ya = gy + (Y - gy) * k / 7, yb = gy + (Y - gy) * (k + 1) / 7; mb.quad([xa, ya, z1], [xa, ya, z0], [xb, yb, z0], [xb, yb, z1], wood(k)); mb.quad([xa, ya - 0.3, z1], [xa, ya, z1], [xb, yb, z1], [xb, yb - 0.3, z1], C('#6a4a2a')); mb.quad([xb, yb - 0.3, z0], [xb, yb, z0], [xa, ya, z0], [xa, ya - 0.3, z0], C('#6a4a2a')); }
    for (let x = PIER.x0; x > E[0] + 6; x -= 0.6) mb.box(x - 0.58, Y - 0.18, z0, x, Y, z1, wood(Math.floor(-x * 1.7)));
    mb.box(E[0] - 6, Y - 0.18, -6, E[0] + 6, Y, 6, wood(1)); // the end platform
    for (let x = E[0] - 5.4; x < E[0] + 6; x += 1.2) mb.box(x, Y + 0.001, -6, x + 0.04, Y + 0.01, 6, C('#6a4a2a'), false, true);
    // posts down into the water, rails along the sides
    const post = (x, z, top = 1.1) => { mb.cyl(x, T.ground(x, z) - 1, z, 0.16, 0.16, Y + top - T.ground(x, z) + 1, 7, C('#6a4a2a')); mb.cyl(x, Y + top, z, 0.2, 0.12, 0.12, 7, C('#5a3a20')); };
    for (let x = PIER.x0; x > E[0] + 6; x -= 4) { post(x, z0 - 0.1); post(x, z1 + 0.1); }
    for (const zz of [z0 - 0.1, z1 + 0.1]) { mb.box(E[0] + 6, Y + 0.8, zz - 0.05, PIER.x0, Y + 0.92, zz + 0.05, C('#c8a878')); mb.box(E[0] + 6, Y + 0.4, zz - 0.04, PIER.x0, Y + 0.48, zz + 0.04, C('#c8a878')); }
    for (const [x, z] of [[E[0] - 6, -6], [E[0] - 6, 6], [E[0] + 6, -6], [E[0] + 6, 6], [E[0] - 6, 0], [E[0], -6], [E[0], 6]]) post(x, z);
    mb.box(E[0] - 6.05, Y + 0.8, -6, E[0] - 5.95, Y + 0.92, 6, C('#c8a878')); for (const zz of [-6, 6]) mb.box(E[0] - 6, Y + 0.8, zz - 0.05, E[0] + 6, Y + 0.92, zz + 0.05, C('#c8a878'));
    for (const zz of [-6, 6]) mb.box(E[0] + 6, Y + 0.8, zz - (zz < 0 ? 0 : 3.75), E[0] + 6.1, Y + 0.92, zz + (zz < 0 ? 3.75 : 0), C('#c8a878'));
    // a bench, a bait bucket, a fish crate, a rod rack and lanterns
    mb.push([E[0] + 3.5, Y, 4.6]); H.box(-1.4, 0.45, -0.4, 1.4, 0.58, 0.4, '#b4824f'); H.box(-1.3, 0, -0.3, -1.1, 0.45, 0.3, '#6a4a2a'); H.box(1.1, 0, -0.3, 1.3, 0.45, 0.3, '#6a4a2a'); H.box(-1.4, 0.58, 0.32, 1.4, 1.1, 0.42, '#a8774a'); mb.pop();
    mb.push([E[0] + 1.5, Y, -4.8]); mb.cyl(0, 0, 0, 0.32, 0.38, 0.55, 12, C('#5a8ac8')); mb.cyl(0, 0.55, 0, 0.38, 0.38, 0.04, 12, C('#4a7ab8'), false); mb.cyl(0, 0.5, 0, 0.33, 0.33, 0.02, 12, C('#3a5a7a')); mb.pop();
    mb.push([E[0] + 4, Y, -4.6]); H.crate(0, 0, 0.9); mb.ico(0.15, 0.95, 0.1, 0.12, 0, () => C('#c8d0d8')); mb.pop();
    mb.push([E[0] + 5.4, Y, 0]); H.box(-0.1, 0, -1.4, 0.1, 1.6, -1.2, '#6a4a2a'); H.box(-0.1, 0, 1.2, 0.1, 1.6, 1.4, '#6a4a2a'); H.box(-0.12, 1.35, -1.4, 0.12, 1.45, 1.4, '#8f633a');
    for (let k = 0; k < 3; k++) { const zz = -0.8 + k * 0.8; mb.caps([0.05, 0.1, zz], [0.25, 2.4, zz + 0.1], 0.03, 0.012, 5, C(['#3a3a48', '#c84a3a', '#3a6ac8'][k])); } mb.pop();
    for (const [x, z] of [[E[0] - 6, -6], [E[0] - 6, 6], [E[0] + 6, -6], [E[0] + 6, 6]]) { mb.cyl(x, Y + 1.2, z, 0.05, 0.05, 1.0, 5, C('#3a3f55')); mb.box(x - 0.16, Y + 2.2, z - 0.16, x + 0.16, Y + 2.52, z + 0.16, glowC(C('#ffe08a'))); s.lights.push({ p: [x, Y + 2.4, z], r: 9, c: [1, 0.85, 0.55] }); }
    // the fishing spot: a blue ring
    for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; mb.box(E[0] + Math.cos(a) * 1.3 - 0.16, Y + 0.01, E[1] + Math.sin(a) * 1.3 - 0.16, E[0] + Math.cos(a) * 1.3 + 0.16, Y + 0.08, E[1] + Math.sin(a) * 1.3 + 0.16, glowC(C('#5ab8ff')), false, true); }
    // the bait shop on the sand
    const hx = PIER.x0 + 14, hz = 8, hy = T.ground(hx, hz);
    mb.push([hx, hy, hz], M4.rotY(Math.PI / 2));
    H.box(-3, -0.5, -2.4, 3, 0.2, 2.4, '#8f633a'); H.box(-2.8, 0.2, -2.2, 2.8, 2.8, 2.2, '#e6dcc4'); H.roof(-3, 3, -2.2, 2.2, 2.8, 1.4, '#3a7ab8');
    H.door(0.8, 2.2, 1, 1.9); H.window(-1.4, 1.6, 2.2, 1.2, 0.9, 1, true);
    mb.push([0, 3.2, 2.6]); mb.box(-1.5, 0.0, 0, 1.5, 0.6, 0.1, C('#2a4a7a')); mb.sph([-0.3, 0.3, 0.12], [0.55, 0.18, 0.04], 10, C('#ffb43a'), 0); mb.tri([0.2, 0.3, 0.14], [0.6, 0.55, 0.14], [0.6, 0.05, 0.14], C('#ffb43a')); mb.pop();
    for (const zx of [-2.6, 2.6]) H.barrel(zx, 3.2);
    mb.pop();
    s.signs = [{ p: [E[0], Y + 2.2, E[1]], t: 'Fishing spot: roll onto the blue ring' }, { p: [hx, hy + 5, hz], t: 'Bait & tackle' }];
    s.mesh = mb.build(gl); st.grid.add(mb.tris, s);
    const rod = new MeshBuilder();
    rod.cyl(0, 0, 0, 0.045, 0.04, 0.55, 8, hex('#c8a070')); rod.cyl(0, 0.55, 0, 0.03, 0.009, 2.1, 6, hex('#2a2e3a')); rod.cyl(0.02, 0.35, 0, 0.09, 0.09, 0.07, 10, hex('#c84a3a')); rod.caps([0, 0.39, 0], [0.09, 0.39, 0], 0.02, 0.02, 5, hex('#d8d8e0'));
    for (const y of [0.9, 1.4, 1.9, 2.4]) rod.tor([0, y, 0.02], 0.02, 0.006, 8, 4, hex('#d8d8e0'));
    this.rodM = rod.build(gl);
    const ln = new MeshBuilder(); ln.cyl(0, 0, 0, 0.012, 0.012, 1, 4, glowC(hex('#f0f4ff')), false); this.lineM = ln.build(gl);
    const bob = new MeshBuilder(); bob.ico(0, 0, 0, 0.13, 1, (x, y) => y > 0 ? hex('#e8343a') : hex('#f8f8f8')); bob.cyl(0, 0.1, 0, 0.02, 0.02, 0.14, 5, hex('#222')); this.bobM = bob.build(gl);
    return s;
  }
  model(id) { return this.models.get(id) || (this.models.set(id, fishModel(this.g.gfx, id)), this.models.get(id)); }
  pick(night, rain) {
    let tot = 0; const L = [];
    for (const [id, f] of Object.entries(FISH)) { let w = f.w; if (f.night && !night) w = 0; if (f.rain && rain) w *= 4; if (night && f.night) w *= 1.5; if (w > 0) { L.push([id, w]); tot += w; } }
    let r = Math.random() * tot; for (const [id, w] of L) { r -= w; if (r <= 0) return id; } return 'perch';
  }
  // ---------- each frame (returns true while it holds the ball still) ----------
  update(dt, b, input, now, ui, env) {
    const E = PIER.end, Y = this.Y, onPad = Math.hypot(b.p[0] - E[0], b.p[2] - E[1]) < 1.3 && Math.abs(b.p[1] - Y - 0.45) < 1.2;
    if (!this.state) { if (!onPad) this.left = true; if (onPad && this.left && now > (this.cool || 0)) { this.left = false; this.state = { ph: 'ready', t: 0, charge: 0 }; ui.banner('Fishing', 'Hold jump to cast where the camera looks', 'Move to stop fishing'); } return false; }
    if (Math.hypot(b.p[0] - E[0], b.p[2] - E[1]) > 6) { this.stop(ui); return false; }
    const F = this.state, cam = this.g.cam, yaw = cam.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), moving = Math.hypot(input.x, input.z) > 0.3;
    F.t += dt; b.p = [E[0], Y + 0.46, E[1]]; b.v = [0, 0, 0];
    if (F.ph === 'ready' && moving && !F.charging) { this.stop(ui); return false; }
    const jump = input.up; input.x = 0; input.z = 0; input.jump = false; input.up = false;
    const water = (x, z) => this.g.T.ground(x, z) < -0.7 && !(x > E[0] - 6.5 && Math.abs(z) < 6.5) && !(x > E[0] && Math.abs(z) < 3);
    if (F.ph === 'ready') {
      if (jump) { F.charging = true; F.charge = Math.min(1, F.charge + dt * 0.9); }
      else if (F.charging) {
        const d = 7 + F.charge * 20, tx = b.p[0] + fx * d, tz = b.p[2] + fz * d; F.charging = false;
        if (!water(tx, tz)) { ui.toast('Cast into the water!', 1200); F.charge = 0; }
        else { F.ph = 'fly'; F.t = 0; F.from = this.tip(b, fx, fz, 0); F.to = [tx, SEA + 0.02, tz]; F.charge = 0; Sound.play('jump'); }
      }
    } else if (F.ph === 'fly') {
      const k = Math.min(1, F.t / 0.8); F.bob = F.from.map((v, i) => v + (F.to[i] - v) * k); F.bob[1] += Math.sin(k * Math.PI) * 4;
      if (k >= 1) { F.ph = 'wait'; F.t = 0; F.bite = 2.5 + Math.random() * 6.5; F.nib = 1 + Math.random() * 1.5; Sound.play('splash'); this.g.fx.burst(F.to, 10, { cols: ['#d8f0ff', '#ffffff'], shape: 0, size: 0.14, speed: 2, up: 1.5, life: 0.5 }); }
    } else if (F.ph === 'wait') {
      F.bob = [F.to[0], SEA + 0.02 + Math.sin(F.t * 3) * 0.025, F.to[2]];
      if (F.t > F.nib && F.t < F.bite - 0.6) { F.bob[1] -= 0.06; if (F.t > F.nib + 0.25) F.nib = F.t + 0.8 + Math.random() * 1.6; }
      if (jump && !F.held) { ui.toast('Too early! Wait for the bobber to go under', 1400); F.ph = 'ready'; F.t = 0; }
      if (F.t > F.bite) { F.ph = 'bite'; F.t = 0; F.fish = this.pick(env.night, env.rain); Sound.play('splash'); Sound.play('click'); this.g.fx.burst(F.to, 14, { cols: ['#d8f0ff', '#ffffff'], shape: 0, size: 0.16, speed: 2.5, up: 2, life: 0.6 }); }
    } else if (F.ph === 'bite') {
      F.bob = [F.to[0] + Math.sin(F.t * 30) * 0.05, SEA - 0.22, F.to[2]];
      if (jump && !F.held) { const f = FISH[F.fish], d = f.rar < 0 ? 0 : FISH_RARITY[f.rar].d; F.ph = 'reel'; F.t = 0; F.prog = 0.3; F.fp = 0.5; F.ft = 0.5; F.zp = 0.36; F.zv = 0; F.dd = d; F.next = 0; Sound.play('jump'); }
      else if (F.t > 1.0) { ui.toast('It got away! Be quicker when the bobber goes under', 1600); F.ph = 'ready'; F.t = 0; }
    } else if (F.ph === 'reel') {
      // keep the green zone on the fish: hold jump to push it right, let go and it slides left
      const d = F.dd; F.zv += (jump ? 2.6 : -2.4) * dt; F.zv *= Math.exp(-1.2 * dt); F.zp += F.zv * dt;
      if (F.zp < 0) { F.zp = 0; F.zv = Math.abs(F.zv) * 0.3; } if (F.zp > 0.7) { F.zp = 0.7; F.zv = -Math.abs(F.zv) * 0.3; }
      F.next -= dt; if (F.next <= 0) { F.ft = Math.random(); F.next = (1.3 - d) * (0.5 + Math.random()); if (d > 0.8 && Math.random() < 0.4) F.next *= 0.4; }
      F.fp += Math.sign(F.ft - F.fp) * Math.min(Math.abs(F.ft - F.fp), (0.15 + d * 0.9) * dt);
      const inZ = F.fp >= F.zp - 0.02 && F.fp <= F.zp + 0.3 + 0.02; F.prog += (inZ ? 0.3 - d * 0.08 : -(0.16 + d * 0.12)) * dt;
      F.bob = [F.to[0] + Math.sin(F.t * 9) * 0.25 * (0.5 + d), SEA - 0.05 + Math.sin(F.t * 17) * 0.05, F.to[2] + Math.cos(F.t * 7) * 0.25 * (0.5 + d)];
      F.to = [F.to[0] + (b.p[0] - F.to[0]) * dt * 0.05, F.to[1], F.to[2] + (b.p[2] - F.to[2]) * dt * 0.05];
      if (Math.random() < dt * 8) this.g.fx.emit([F.bob[0], SEA + 0.05, F.bob[2]], { v: [(Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2], life: 0.4, size: 0.1, col: [0.85, 0.95, 1], shape: 0, drag: 1 });
      ui.fishBar({ zp: F.zp, zw: 0.3, fp: F.fp, prog: Math.max(0, Math.min(1, F.prog)), col: FISH[F.fish].col, inZ });
      if (F.prog >= 1) this.caught(F, ui);
      else if (F.prog <= 0) { ui.fishBar(null); ui.toast('The line went slack… it got away!', 1800); F.ph = 'ready'; F.t = 0; Sound.play('land'); }
    } else if (F.ph === 'show') {
      if (F.t > 3.2) { F.ph = 'ready'; F.t = 0; F.fish = null; }
    }
    if (F.ph !== 'reel' && this.bar) { this.bar = false; ui.fishBar(null); } else if (F.ph === 'reel') this.bar = true;
    F.held = jump;
    return true;
  }
  caught(F, ui) {
    const f = FISH[F.fish], cm = Math.round(f.cm[0] + (f.cm[1] - f.cm[0]) * Math.pow(Math.random(), 1.6));
    F.cm = cm; F.ph = 'show'; F.t = 0; ui.fishBar(null);
    ui.caught(F.fish, f, cm, f.rar < 0 ? null : FISH_RARITY[f.rar]);
  }
  stop(ui) { this.state = null; this.cool = performance.now() + 1500; ui.fishBar(null); ui.toast('Done fishing', 900); }
  tip(b, fx, fz, swing) { const d = [fx * 0.55, 0.83, fz * 0.55], l = Math.hypot(...d), base = [b.p[0] + fz * 0.35, b.p[1] - 0.05, b.p[2] - fx * 0.35]; return base.map((v, i) => v + d[i] / l * 2.65); }
  draw(G, t, me) {
    const F = this.state; if (!F) return;
    const yaw = this.g.cam.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), b = me;
    let lean = 0.55; if (F.ph === 'ready' && F.charging) lean = 0.55 - F.charge * 0.9; if (F.ph === 'fly') lean = 0.55 + Math.max(0, 1 - F.t * 4) * 0.6; if (F.ph === 'reel') lean = 0.2 + Math.sin(t * 9) * 0.08;
    const d = [fx * lean, 0.83, fz * lean], l = Math.hypot(...d), base = [b.p[0] + fz * 0.35, b.p[1] - 0.05, b.p[2] - fx * 0.35], tip = base.map((v, i) => v + d[i] / l * 2.65);
    G.mat(1, 0.3, 0.6); G.tex(0);
    const RM = M4.model(base, M4.aim(d), 1); G.draw(this.rodM, RM); G.outline(this.rodM, RM, 0.01);
    const end = F.ph === 'show' ? null : F.ph === 'ready' ? [tip[0], tip[1] - 0.8, tip[2]] : F.bob;
    if (end) { const v = [end[0] - tip[0], end[1] - tip[1], end[2] - tip[2]], len = Math.hypot(...v); G.draw(this.lineM, M4.model(tip, M4.aim(v), [1, len, 1]), 1, null, 0.4); }
    if (end) G.draw(this.bobM, M4.model(end, null, 1));
    if (F.ph === 'show' && F.fish) {
      const f = FISH[F.fish], sc = Math.max(0.75, Math.min(1.4, F.cm / 100)), m = this.model(F.fish), rx = Math.cos(yaw), rz = -Math.sin(yaw), up = Math.min(1, F.t * 3);
      const at = [b.p[0] - fx * 2.0, b.p[1] + 0.3 + up * 0.8, b.p[2] - fz * 2.0], R = M4.mul3(M4.rotY(Math.sin(t * 1.3) * 0.35), [-rz, 0, rx, rx, 0, rz, 0, 1, 0]);
      const M = M4.model(at, M4.mul3(R, M4.rotX(Math.sin(t * 9) * 0.12 * Math.max(0, 1 - F.t / 2))), sc); G.draw(m, M, 1, null, f.rar === 3 ? 0.15 : 0); G.outline(m, M, 0.012 / sc);
      const mouth = [at[0] + rx * sc * 0.5, at[1], at[2] + rz * sc * 0.5], v = [mouth[0] - tip[0], mouth[1] - tip[1], mouth[2] - tip[2]]; G.draw(this.lineM, M4.model(tip, M4.aim(v), [1, Math.hypot(...v), 1]), 1, null, 0.4);
    }
  }
  chip() {
    const F = this.state; if (!F) return '';
    return { ready: F.charging ? 'Fishing · power ' + Math.round(F.charge * 100) + '%' : 'Fishing · hold jump to cast · move to stop', fly: 'Fishing · casting…', wait: 'Fishing · waiting for a bite… press jump when the bobber goes under', bite: 'Fishing · a bite! Press jump now!', reel: 'Fishing · reel it in: keep the green zone on the fish', show: 'Fishing · nice catch!' }[F.ph] || 'Fishing';
  }
}

// ======================= GAME ARENA: TAG + HIDE AND SEEK =======================
// The world keeper runs each round (positions, who's it, who got found). Bots fill in so there are always 4 players.
const ARENA = { x: 100, z: -160, r: 34 };
const ARENA_PADS = { tag: [-5, 27], hide: [5, 27] };
const BOT_NAMES = ['Pip bot', 'Zed bot', 'Mochi bot', 'Bolt bot', 'Nova bot', 'Dot bot'];
class GameArena {
  constructor(game) {
    this.g = game; const T = game.T, R = ARENA.r + 3;
    let mx = -1e9, mn = 1e9; for (let x = -R; x <= R; x += 3) for (let z = -R; z <= R; z += 3) if (x * x + z * z < R * R) { const h = T.ground(ARENA.x + x, ARENA.z + z); mx = Math.max(mx, h); mn = Math.min(mn, h); }
    this.Y = Math.ceil((mx + 0.3) * 4) / 4; this.low = mn;
    const sp = [[0, 0]], ang = k => k * Math.PI / 2 + Math.PI / 4;
    for (let k = 0; k < 4; k++) sp.push([Math.cos(ang(k)) * 20, Math.sin(ang(k)) * 20]);
    for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; sp.push([Math.cos(a) * 15.6, Math.sin(a) * 15.6]); }
    for (let k = 0; k < 4; k++) { const a = ang(k) + 0.32; sp.push([Math.cos(a) * 31, Math.sin(a) * 31]); }
    this.spots = sp; this.R = null; this.seq = 0; this.ev = 0;
  }
  W(x, y, z) { return [ARENA.x + x, this.Y + y, ARENA.z + z]; }
  build(gl, st) {
    const mb = new MeshBuilder().collect(), C = hex, Y = this.Y, A = ARENA, R = A.r, H = bh(mb), N = 48, ax = A.x, az = A.z;
    const s = { key: 'arena', items: [], lights: [], triggers: [], x: ax, z: az, rad: 60, signs: [] };
    const ring = (r0, r1, col, nc, y = Y) => { for (let k = 0; k < N; k++) { const a0 = k / N * 6.2832, a1 = (k + 1) / N * 6.2832, P = (r, a) => [ax + Math.cos(a) * r, y, az + Math.sin(a) * r]; if (r0 > 0) mb.quad(P(r0, a0), P(r0, a1), P(r1, a1), P(r1, a0), col, nc); else mb.tri([ax, y, az], P(r1, a1), P(r1, a0), col, nc); } };
    // the deck: rings of dark panels with glowing lines, and its side down to the ground
    ring(0, 6, C('#3d4a6a')); ring(6, 13, C('#323d5a')); ring(13, 24, C('#3a4664')); ring(24, R, C('#303a56'));
    for (const r of [6, 13, 24, R - 0.8]) ring(r - 0.12, r + 0.12, glowC(C(r === 13 ? '#ff5ad8' : '#5ff0e0')), true, Y + 0.012);
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.2832, c = Math.cos(a), sn = Math.sin(a); mb.quad([ax + c * 24.3 - sn * 0.06, Y + 0.01, az + sn * 24.3 + c * 0.06], [ax + c * 24.3 + sn * 0.06, Y + 0.01, az + sn * 24.3 - c * 0.06], [ax + c * 32.6 + sn * 0.06, Y + 0.01, az + sn * 32.6 - c * 0.06], [ax + c * 32.6 - sn * 0.06, Y + 0.01, az + sn * 32.6 + c * 0.06], [0.28, 0.33, 0.48, 1], true); }
    mb.cyl(ax, this.low - 2, az, R, R, Y - this.low + 2, N, C('#262e46'), false);
    mb.cyl(ax, Y - 0.5, az, R + 0.02, R + 0.02, 0.18, N, glowC(C('#5ab8ff')), false);
    // the low wall around it, open at four entrances, with ramps down to the grass
    const ent = a => [0, 1, 2, 3].some(k => Math.abs(Math.atan2(Math.sin(a - k * Math.PI / 2), Math.cos(a - k * Math.PI / 2))) < 0.12);
    for (let k = 0; k < N; k++) { const a = (k + 0.5) / N * 6.2832; if (ent(a)) continue; mb.push([ax + Math.cos(a) * (R - 0.3), Y, az + Math.sin(a) * (R - 0.3)], M4.rotY(-a)); mb.box(-0.3, 0, -2.3, 0.3, 1.2, 2.3, C('#56628a')); mb.box(-0.32, 1.2, -2.3, 0.32, 1.32, 2.3, glowC(C('#5ab8ff')), false, true); mb.pop(); }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), g0 = Math.min(...[6, 14, 24].map(d => this.g.T.ground(ax + ca * (R + d), az + sa * (R + d)))) - 0.3, len = Math.max(6, (Y - g0) * 4);
      mb.push([ax + ca * R, 0, az + sa * R], M4.rotY(-a));
      mb.quad([0, Y, -3.5], [0, Y, 3.5], [len, g0, 3.5], [len, g0, -3.5], C('#4a5678'));
      mb.quad([0, Y, 3.5], [0, g0 - 1.5, 3.5], [len, g0 - 1.5, 3.5], [len, g0, 3.5], C('#262e46')); mb.quad([len, g0, -3.5], [len, g0 - 1.5, -3.5], [0, g0 - 1.5, -3.5], [0, Y, -3.5], C('#262e46'));
      for (const zz of [-3.3, 3.3]) mb.quad([0, Y + 0.012, zz - 0.1], [0, Y + 0.012, zz + 0.1], [len, g0 + 0.012, zz + 0.1], [len, g0 + 0.012, zz - 0.1], glowC(C('#5ff0e0')), true);
      for (const zz of [-3.9, 3.9]) { mb.cyl(0, Y, zz, 0.3, 0.25, 4.2, 8, C('#4a5680')); mb.ico(0, Y + 4.4, zz, 0.35, 1, () => glowC(C('#ffd24a'))); }
      mb.caps([0, Y + 4.0, -3.9], [0, Y + 4.0, 3.9], 0.16, 0.16, 8, glowC(C('#5ab8ff')));
      mb.pop(); s.lights.push({ p: [ax + ca * R, Y + 4.4, az + sa * R], r: 10, c: [1, 0.9, 0.6] }); }
    // the dome in the middle (two doors) - a good hiding spot
    const domeCol = (x, y, z) => y > 0.52 && y < 0.6 ? glowC(C('#5ff0e0')) : (Math.floor(Math.atan2(z, x) * 4) + Math.floor(y * 6)) % 2 ? C('#5a6a92') : C('#4e5c82');
    const keep = m => m[1] > 0.02 && !(m[1] < 0.5 && Math.abs(m[2]) < 0.32);
    mb.ico(ax, Y, az, 5.2, 2, domeCol, false, keep); mb.ico(ax, Y, az, 5.0, 2, () => C('#2a3248'), true, keep);
    mb.ico(ax, Y + 5.3, az, 0.5, 1, () => glowC(C('#ff5ad8'))); s.lights.push({ p: [ax, Y + 2.5, az], r: 8, c: [0.6, 0.9, 1] });
    // four tubes you can roll through
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4;
      mb.push([ax + Math.cos(a) * 20, Y, az + Math.sin(a) * 20], M4.rotY(-a));
      const P = (r, f, z) => [r * Math.cos(f), 1.6 + r * Math.sin(f), z], M = 14;
      for (let j = 0; j < M; j++) { const f0 = j / M * 6.2832, f1 = (j + 1) / M * 6.2832;
        mb.quad(P(1.65, f0, -5), P(1.65, f1, -5), P(1.65, f1, 5), P(1.65, f0, 5), C(j % 2 ? '#4a6a9a' : '#4f72a4'));
        mb.quad(P(1.42, f0, 5), P(1.42, f1, 5), P(1.42, f1, -5), P(1.42, f0, -5), C('#2a3450'));
        for (const z of [-5, 5]) { mb.quad(P(1.42, f0, z), P(1.65, f0, z), P(1.65, f1, z), P(1.42, f1, z), glowC(C('#5ab8ff')), true); mb.quad(P(1.42, f0, z), P(1.42, f1, z), P(1.65, f1, z), P(1.65, f0, z), glowC(C('#5ab8ff')), true); }
        for (const z of [-2.5, 0, 2.5]) mb.quad(P(1.66, f0, z - 0.1), P(1.66, f1, z - 0.1), P(1.66, f1, z + 0.1), P(1.66, f0, z + 0.1), glowC(C('#5ff0e0')), true); }
      mb.pop(); }
    // eight walls to hide behind
    for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; mb.push([ax + Math.cos(a) * 13, Y, az + Math.sin(a) * 13], M4.rotY(-a));
      H.box(-0.3, 0, -3, 0.3, 2.6, 3, '#5a6688'); mb.box(-0.32, 2.05, -3, 0.32, 2.2, 3, glowC(C(k % 2 ? '#ff5ad8' : '#5ff0e0')), false, true);
      for (const zz of [-1.6, 1.6]) mb.box(-0.32, 0.5, zz - 0.5, 0.32, 1.5, zz + 0.5, C('#3a4466'), true, true); mb.pop(); }
    // stacks of containers near the edge
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4 + 0.32, cx = ax + Math.cos(a) * 28, cz = az + Math.sin(a) * 28; mb.push([cx, Y, cz], M4.rotY(-a));
      const box = (x0, y0, z0, x1, y1, z1, c) => { H.box(x0, y0, z0, x1, y1, z1, c); for (let z = z0 + 0.4; z < z1 - 0.2; z += 0.5) mb.box(x0 - 0.02, y0 + 0.15, z, x1 + 0.02, y1 - 0.15, z + 0.12, shadeC(C(c), 0.82), true, true); };
      box(-1.1, 0, -2.6, 1.1, 2.2, 0, ['#c87a3a', '#3a8ac8', '#c8483a', '#4ab87a'][k]); box(-1.1, 0, 0.2, 1.1, 2.2, 2.8, ['#3a8ac8', '#c8a83a', '#4ab87a', '#c87a3a'][k]); box(-1.1, 2.2, -1.2, 1.1, 4.4, 1.4, ['#8a5ac8', '#c8483a', '#3a8ac8', '#c8a83a'][k]);
      mb.pop(); }
    // bounce pads
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, x = ax + Math.cos(a) * 8.5, z = az + Math.sin(a) * 8.5; mb.cyl(x, Y, z, 1.25, 1.15, 0.14, 16, C('#2a3a2a')); mb.cyl(x, Y + 0.14, z, 1.0, 1.0, 0.02, 16, glowC(C('#7aff9a')), true); }
    // join pads (red for tag, purple for hide and seek)
    for (const [k, col] of [['tag', '#ff5a5a'], ['hide', '#c98aff']]) { const [px, pz] = ARENA_PADS[k]; for (let j = 0; j < 20; j++) { const a = j / 20 * 6.283; mb.box(ax + px + Math.cos(a) * 1.3 - 0.18, Y + 0.02, az + pz + Math.sin(a) * 1.3 - 0.18, ax + px + Math.cos(a) * 1.3 + 0.18, Y + 0.09, az + pz + Math.sin(a) * 1.3 + 0.18, glowC(C(col)), false, true); } }
    s.signs = [{ p: this.W(0, 6.2, R), t: 'Game arena' }, { p: this.W(...[ARENA_PADS.tag[0], 1.8, ARENA_PADS.tag[1]]), t: 'Tag: roll here to join' }, { p: this.W(...[ARENA_PADS.hide[0], 2.7, ARENA_PADS.hide[1]]), t: 'Hide and seek: roll here to join' }];
    s.mesh = mb.build(gl); st.grid.add(mb.tris, s);
    const im = new MeshBuilder(); im.tor([0, 0, 0], 0.78, 0.07, 24, 6, glowC(hex('#ff3a4a'))); im.cyl(0, 0.95, 0, 0, 0.18, 0.32, 6, glowC(hex('#ff3a4a'))); this.itM = im.build(gl);
    const sm = new MeshBuilder(); sm.tor([0, 0, 0], 0.78, 0.07, 24, 6, glowC(hex('#ffd24a'))); sm.ico(0, 1.2, 0, 0.16, 1, () => glowC(hex('#ffd24a'))); this.seekM = sm.build(gl);
    return s;
  }
  padAt(p) { for (const k in ARENA_PADS) { const q = ARENA_PADS[k]; if (Math.hypot(p[0] - ARENA.x - q[0], p[2] - ARENA.z - q[1]) < 1.3 && Math.abs(p[1] - this.Y - 0.45) < 1.5) return k; } return null; }
  inside(p, extra = 0) { return Math.hypot(p[0] - ARENA.x, p[2] - ARENA.z) < ARENA.r + extra && p[1] > this.Y - 4 && p[1] < this.Y + 30; }
  bounce(b) { if (!b.grounded || Math.abs(b.p[1] - this.Y - 0.6) > 0.5) return false; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; if (Math.hypot(b.p[0] - ARENA.x - Math.cos(a) * 8.5, b.p[2] - ARENA.z - Math.sin(a) * 8.5) < 1.1) { b.v[1] = 15; b.grounded = false; return true; } } return false; }
  spotW(k, j = 0) { const s = this.spots[k]; return this.W(s[0] + (j ? (Math.random() - 0.5) * 2 : 0), 0.6, s[1] + (j ? (Math.random() - 0.5) * 2 : 0)); }

  // ---------- the keeper runs the rounds ----------
  hostJoin(id, k, name) {
    const R = this.R; if (k !== 'tag' && k !== 'hide') return null;
    if (R && R.ids.includes(id)) return null;
    if (R && R.ph !== 'lobby') return 'A round is going on. Wait for it to finish!';
    if (R && R.k !== k) return 'A ' + (R.k === 'tag' ? 'tag' : 'hide and seek') + ' round is starting, roll onto that pad to join!';
    if (!R) { this.R = { rid: Date.now() % 1e9, k, ph: 'lobby', t0: performance.now(), dur: 8, ids: [id], names: {}, bots: new Map(), it: new Set(), fd: new Set(), itMs: {}, cool: {}, last: {}, res: null }; this.event(name + ' started a ' + (k === 'tag' ? 'tag' : 'hide and seek') + ' round! Roll onto the pad to join'); }
    else { R.ids.push(id); R.t0 = Math.max(R.t0, performance.now() - (R.dur - 4) * 1000); this.event(name + ' joined!'); }
    this.R.names[id] = name; return null;
  }
  hostRemove(id) { const R = this.R; if (!R || !R.ids.includes(id)) return; R.ids = R.ids.filter(x => x !== id); R.it.delete(id); this.event((R.names[id] || 'Someone') + ' left the round'); }
  event(text) { this.ev++; this.evText = text; }
  isBot(id) { return typeof id === 'string' && id.startsWith('bot:'); }
  addBots(n) {
    const R = this.R, used = new Set();
    for (let k = 0; k < n; k++) {
      let nm; do nm = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]; while (used.has(nm)); used.add(nm);
      const id = 'bot:' + k, skins = ['plain', 'band', 'stripes', 'dots', 'split', 'checker', 'swirl', 'star'], hats = ['none', 'cap', 'beanie', 'party', 'cat', 'headphones'];
      const sp = this.W(ARENA_PADS.tag[0] + (k - 1.5) * 2.5, 0.6, ARENA_PADS.tag[1] - 3);
      R.bots.set(id, { id, name: nm, skin: skins[Math.floor(Math.random() * skins.length)], color: COLORS[Math.floor(Math.random() * 16)], color2: COLORS[Math.floor(Math.random() * 16)], hat: hats[Math.floor(Math.random() * hats.length)],
        b: { p: sp, v: [0, 0, 0], r: 0.45, R: [1, 0, 0, 0, 1, 0, 0, 0, 1], grounded: false, boostT: 0, airT: 0, hopCool: 0, tpCool: 0, padCool: 0 }, tgt: null, stuck: 0, sideT: 0, side: 1, plan: 0, path: [] });
      R.ids.push(id); R.names[id] = nm;
    }
  }
  hostTick(dt, now, io) {
    const R = this.R; if (!R) return null;
    const el = (now - R.t0) / 1000, pos = id => this.isBot(id) ? (R.bots.get(id) || {}).b?.p : io.pos(id);
    // players who disconnected or went far away leave the round
    for (const id of [...R.ids]) if (!this.isBot(id) && (!io.alive(id) || !pos(id) || Math.hypot(pos(id)[0] - ARENA.x, pos(id)[2] - ARENA.z) > 260)) this.hostRemove(id);
    if (!R.ids.some(id => !this.isBot(id))) { this.R = null; return { rid: R.rid, k: R.k, ph: 'gone' }; }
    if (R.ph === 'lobby' && el > R.dur) {
      const real = R.ids.length; if (real < 4) this.addBots(4 - real);
      const pickOne = () => R.ids[Math.floor(Math.random() * R.ids.length)];
      if (R.k === 'tag') { const it = pickOne(); R.it.add(it); R.cool[it] = now + 2500; this.phase('play', 90, now); this.event(R.names[it] + ' is it! Run!'); }
      else { const sk = pickOne(); R.it.add(sk); this.phase('hide', 20, now); io.tp(sk, this.W(0, 0.6, 0)); if (this.isBot(sk)) R.bots.get(sk).b.p = this.W(0, 0.6, 0); this.event(R.names[sk] + ' is the seeker! Everyone else, hide!');
        R.bots.forEach(bt => { if (!R.it.has(bt.id)) bt.tgt = this.spotW(1 + Math.floor(Math.random() * (this.spots.length - 1)), 1); }); }
    }
    if (R.ph === 'hide' && el > R.dur) { this.phase('seek', 100, now); this.event('Ready or not, here ' + (R.it.size > 1 ? 'they come' : 'I come') + '!'); }
    // keep everyone in the arena
    if (R.ph !== 'lobby' && R.ph !== 'end') for (const id of R.ids) { const p = pos(id); if (p && !this.inside(p, 4)) { const q = this.spotW(Math.floor(Math.random() * this.spots.length), 1); if (this.isBot(id)) { const bb = R.bots.get(id).b; bb.p = q; bb.v = [0, 0, 0]; } else io.tp(id, q); } }
    // tags and finds
    if (R.ph === 'play' || R.ph === 'seek') {
      for (const a of [...R.it]) { if (now < (R.cool[a] || 0)) continue; const pa = pos(a); if (!pa) continue;
        for (const b of R.ids) { if (R.it.has(b) || (R.last[a] === b && now < (R.cool[b] || 0) + 1500)) continue; const pb = pos(b); if (!pb) continue;
          const lag = this.isBot(a) && this.isBot(b) ? 0 : 0.35;
          if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) < 1.0 + lag) {
            if (R.k === 'tag') { R.it.delete(a); R.it.add(b); R.cool[b] = now + 2000; R.last[b] = a; this.event(R.names[a] + ' tagged ' + R.names[b] + '! ' + R.names[b] + ' is it'); }
            else { R.it.add(b); R.fd.add(b); R.cool[b] = now + 1500; this.event(R.names[a] + ' found ' + R.names[b] + '!'); }
            break; } } }
      if (R.k === 'tag') for (const id of R.it) R.itMs[id] = (R.itMs[id] || 0) + dt * 1000;
    }
    const left = R.dur - (now - R.t0) / 1000;
    if ((R.ph === 'play' || R.ph === 'seek') && (left <= 0 || (R.k === 'hide' && R.ids.every(id => R.it.has(id))))) { this.finish(now); return this.snap(now); }
    if (R.ph === 'end' && left <= 0) { this.R = null; return { rid: R.rid, k: R.k, ph: 'gone' }; }
    this.runBots(dt, now, pos);
    return this.snap(now);
  }
  phase(ph, dur, now) { this.R.ph = ph; this.R.dur = dur; this.R.t0 = now; }
  finish(now) {
    const R = this.R, res = {}; let line;
    if (R.k === 'tag') {
      const order = [...R.ids].sort((a, b) => (R.itMs[a] || 0) - (R.itMs[b] || 0));
      order.forEach((id, i) => { const coins = [40, 25, 15][i] || 10, secs = Math.round((R.itMs[id] || 0) / 1000); res[id] = [coins, (i === 0 ? 'You won tag! ' : 'You came ' + (['1st', '2nd', '3rd'][i] || (i + 1) + 'th') + '. ') + 'You were it for ' + secs + ' s · +' + coins + ' coins', i === 0]; });
      res[order[0]] && (line = R.names[order[0]] + ' wins tag!');
    } else {
      const hiders = R.ids.filter(id => !R.it.has(id)), seekWin = !hiders.length, first = R.ids.find(id => R.it.has(id) && !R.fd.has(id));
      for (const id of R.ids) { const won = seekWin ? id === first : hiders.includes(id), coins = won ? 45 : 12; res[id] = [coins, (won ? (seekWin ? 'You found everyone! ' : 'Nobody found you! You win! ') : seekWin ? 'Everyone got found. ' : 'Time is up, the hiders win. ') + '+' + coins + ' coins', won]; }
      line = seekWin ? R.names[first] + ' found everyone!' : 'Time is up! ' + hiders.map(id => R.names[id]).join(', ') + (hiders.length > 1 ? ' win!' : ' wins!');
    }
    R.res = res; this.phase('end', 7, now); this.event(line);
  }
  snap(now) {
    const R = this.R;
    return { rid: R.rid, k: R.k, ph: R.ph, left: Math.max(0, Math.ceil(R.dur - (now - R.t0) / 1000)), ids: R.ids, it: [...R.it], fd: [...R.fd], names: R.names,
      bots: [...R.bots.values()].map(bt => [bt.id, bt.name, bt.skin, bt.color, bt.color2, bt.hat, +bt.b.p[0].toFixed(2), +bt.b.p[1].toFixed(2), +bt.b.p[2].toFixed(2)]),
      ev: [this.ev, this.evText], res: R.ph === 'end' ? R.res : null, cool: Object.keys(R.cool).filter(id => now < R.cool[id]) };
  }
  // ---------- bots: simple rolling players that use the real ball physics ----------
  runBots(dt, now, pos) {
    const R = this.R, g = this.g; if (!R.bots.size) return;
    const save = [g.cave, g.realm]; g.cave = null; g.realm = null;
    const others = id => R.ids.filter(x => x !== id).map(x => [x, pos(x)]).filter(e => e[1]);
    for (const bt of R.bots.values()) {
      const b = bt.b, me = b.p, isIt = R.it.has(bt.id); let tgt = null, speed = 0.82;
      const near = list => { let best = null, bd = 1e9; for (const [id, p] of list) { const d = Math.hypot(p[0] - me[0], p[2] - me[2]); if (d < bd) { bd = d; best = [id, p, d]; } } return best; };
      bt.plan -= dt;
      if (R.ph === 'lobby' || R.ph === 'end') tgt = null;
      else if (R.k === 'tag') {
        if (isIt) { if (now > (R.cool[bt.id] || 0)) { const n = near(others(bt.id).filter(([id]) => !R.it.has(id) && !(R.last[bt.id] === id && now < (R.cool[id] || 0) + 1500))); if (n) { const tp = n[1]; tgt = [tp[0], 0, tp[2]]; speed = 0.95; } } }
        else { const n = near(others(bt.id).filter(([id]) => R.it.has(id)));
          if (n && n[2] < 13) { const dx = me[0] - n[1][0], dz = me[2] - n[1][2], l = Math.hypot(dx, dz) || 1; tgt = [me[0] + dx / l * 8 - dz / l * bt.side * 4, 0, me[2] + dz / l * 8 + dx / l * bt.side * 4]; if (bt.plan <= 0) { bt.side = Math.random() < 0.5 ? -1 : 1; bt.plan = 1.5; } speed = 0.9; }
          else { if (!bt.tgt || bt.plan <= 0 || Math.hypot(bt.tgt[0] - me[0], bt.tgt[2] - me[2]) < 2) { bt.tgt = this.spotW(Math.floor(Math.random() * this.spots.length), 1); bt.plan = 4 + Math.random() * 4; } tgt = bt.tgt; speed = 0.5; } }
        // stay inside the arena when running away
        if (tgt) { const dx = tgt[0] - ARENA.x, dz = tgt[2] - ARENA.z, d = Math.hypot(dx, dz); if (d > ARENA.r - 4) { tgt[0] = ARENA.x + dx / d * (ARENA.r - 4) * 0.6; tgt[2] = ARENA.z + dz / d * (ARENA.r - 4) * 0.6; } }
      } else {
        if (isIt) {
          if (R.ph === 'hide') { b.p = this.W(0, 0.6, 0); b.v = [0, 0, 0]; continue; }
          const n = near(others(bt.id).filter(([id]) => !R.it.has(id)));
          if (n && n[2] < 9) { tgt = [n[1][0], 0, n[1][2]]; speed = 0.92; }
          else { if (!bt.path.length) bt.path = [...this.spots.keys()].sort(() => Math.random() - 0.5); if (!bt.tgt || Math.hypot(bt.tgt[0] - me[0], bt.tgt[2] - me[2]) < 2.5 || bt.plan <= 0) { bt.tgt = this.spotW(bt.path.pop()); bt.plan = 9; } tgt = bt.tgt; speed = 0.75; }
        } else {
          const n = near(others(bt.id).filter(([id]) => R.it.has(id)));
          if (R.ph === 'seek' && n && n[2] < 6) { let far = 0, fd = 0; this.spots.forEach((s, k) => { const q = this.spotW(k), d = Math.hypot(q[0] - n[1][0], q[2] - n[1][2]); if (d > fd) { fd = d; far = k; } }); bt.tgt = this.spotW(far, 1); speed = 0.9; }
          tgt = bt.tgt && Math.hypot(bt.tgt[0] - me[0], bt.tgt[2] - me[2]) > 0.8 ? bt.tgt : null;
        }
      }
      let ix = 0, iz = 0, jump = false;
      if (tgt) { const dx = tgt[0] - me[0], dz = tgt[2] - me[2], l = Math.hypot(dx, dz); if (l > 0.4) { ix = dx / l * speed; iz = dz / l * speed; } }
      // unstick: if pushing but not moving, steer sideways for a bit and hop
      const hs = Math.hypot(b.v[0], b.v[2]);
      if ((ix || iz) && hs < 1.0 && b.grounded) bt.stuck += dt; else bt.stuck = Math.max(0, bt.stuck - dt);
      if (bt.stuck > 0.6) { bt.stuck = 0; bt.sideT = 1.1; bt.side = Math.random() < 0.5 ? -1 : 1; jump = Math.random() < 0.6; }
      if (bt.sideT > 0) { bt.sideT -= dt; const ox = ix, oz = iz; ix = ox * 0.3 - oz * bt.side; iz = oz * 0.3 + ox * bt.side; }
      g.step(b, { x: ix, z: iz, jump, up: false, down: false }, dt, { g: new Set(), fx: () => {}, slow: 0.92 });
      this.bounce(b);
      if (b.p[1] < this.Y - 8) { b.p = this.spotW(0); b.v = [0, 0, 0]; }
    }
    g.cave = save[0]; g.realm = save[1];
  }
  // ---------- drawing (rings around whoever is it / seeking) ----------
  draw(G, t, players) {
    G.mat(0, 0, 0); G.tex(0);
    for (const p of players) { if (!p.it) continue; const m = p.seek ? this.seekM : this.itM, s = (p.r || 0.45) / 0.45; G.draw(m, M4.model([p.p[0], p.p[1] - 0.15, p.p[2]], M4.rotY(t * 2), s), 1, null, 1); }
  }
}
