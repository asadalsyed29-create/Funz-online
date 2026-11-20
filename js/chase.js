// Storm chase minigame: a supercell drops a tornado. Chase it, get close for points, and to make an
// intercept roll into its core and hammer your nail into the ground (N, or the nail button). Without the
// nail the tornado sucks you up and throws you out. The closer you are, the more the camera shakes.
const CHASE_START = [-30, 0, 6];
const EF_NAMES = ['EF0', 'EF1', 'EF2', 'EF3', 'EF4', 'EF5'];
class StormChase {
  constructor(game, now) {
    this.g = game; this.t0 = now; this.T = 240; // seconds
    const a = Math.random() * 6.283, d = 520 + Math.random() * 200, pl = CHASE_START;
    this.ef = 1 + Math.floor(Math.pow(Math.random(), 0.8) * 5);
    this.r = 6 + this.ef * 5.5;                                   // the core (deadly) radius
    this.vmax = [105, 150, 200, 260, 320, 400][this.ef];          // km/h in the core
    this.p = [pl[0] + Math.cos(a) * d, 0, pl[2] + Math.sin(a) * d];
    this.head = Math.random() * 6.283; this.speed = 4.2 + Math.random() * 1.6;
    this.form = 18; this.alive = 0; this.score = 0; this.best = 0; this.near = 9999; this.intercepted = false; this.anchor = null;
    this.flung = 0; this.msg = null; this.debris = [];
    for (let k = 0; k < 26; k++) this.debris.push({ a: Math.random() * 6.283, rr: 0.8 + Math.random() * 1.4, h: Math.random() * 45, sp: 0.6 + Math.random() * 0.8, spin: [Math.random() * 6, Math.random() * 6], kind: k % 3, out: 0, v: null, p: null });
    // the storm itself: a supercell whose wall cloud hangs over the tornado
    this.cloud = { kind: 'supercell', v: 0, x: 0, y: 200, z: 0, s: 1.05, rot: 0, ph: 0 };
    game.addClouds([this.cloud]); this.cloud = game.extraClouds[game.extraClouds.length - 1];
    this.moveCloud();
    this.mesh = null; this.debrisM = null;
  }
  moveCloud() { const c = this.cloud; if (!c) return; c.x = this.p[0] + 480 * c.s; c.z = this.p[2] - 240 * c.s; }
  ground(x, z) { return Math.max(this.g.T.ground(x, z), SEA - 0.1); }
  // wind (m/s) at a point: spinning around the core, pulled in, lifted up near the middle
  wind(p) {
    const dx = p[0] - this.p[0], dz = p[2] - this.p[2], d = Math.hypot(dx, dz) || 0.01, r = this.r, k = this.alive;
    const vm = this.vmax / 3.6 * k, vt = d < r ? vm * d / r : vm * Math.pow(r / d, 0.9);
    const ux = dx / d, uz = dz / d, inflow = vt * 0.35;
    return [(-uz * vt - ux * inflow), d < r * 1.3 ? vm * 0.35 * (1 - d / (r * 1.3)) : 0, (ux * vt - uz * inflow)];
  }
  // returns false when the chase is over
  update(dt, b, now, nailDown) {
    const t = (now - this.t0) / 1000, g = this.g;
    // the tornado forms, wanders along with the storm, and ropes out at the end
    this.alive = t < this.form ? 0 : Math.min(1, (t - this.form) / 6) * (t > this.T - 15 ? Math.max(0, (this.T - t) / 15) : 1);
    this.head += (Math.sin(t * 0.13) * 0.25 + Math.sin(t * 0.41) * 0.12) * dt;
    this.p[0] += Math.cos(this.head) * this.speed * dt; this.p[2] += Math.sin(this.head) * this.speed * dt;
    this.p[1] = this.ground(this.p[0], this.p[2]); this.moveCloud();
    const dx = b.p[0] - this.p[0], dz = b.p[2] - this.p[2], d = Math.hypot(dx, dz);
    this.near = d;
    // the nail
    if (nailDown && !this.anchor && b.grounded !== false) { this.anchor = [b.p[0], b.p[1], b.p[2]]; Sound.play('land'); g.fx && g.fx.burst([b.p[0], b.p[1] - 0.4, b.p[2]], 14, { col: [0.5, 0.4, 0.3], size: 0.14, speed: 2 }); }
    if (!nailDown && this.anchor) this.anchor = null;
    // wind on the ball
    if (this.alive > 0 && d < this.r * 6) {
      const w = this.wind(b.p);
      if (this.anchor) { b.p = [...this.anchor]; b.v = [0, 0, 0]; }
      else {
        const k = Math.min(1, dt * (d < this.r ? 2.4 : 0.9)); if (d < this.r * 3) b.boostT = Math.max(b.boostT || 0, 0.15);
        b.v[0] += (w[0] - b.v[0]) * k; b.v[2] += (w[2] - b.v[2]) * k; b.v[1] += w[1] * dt * 1.4;
        if (d < this.r) { this.flung += dt; if (this.flung > 1.6) { // thrown out of the tornado
          const ux = dx / (d || 1), uz = dz / (d || 1); b.v = [ux * 26 - uz * 12, 16, uz * 26 + ux * 12]; this.flung = 0; this.score = Math.max(0, this.score - 50);
          this.say('The tornado threw you out! Use the nail (N) to stay put', 2600); Sound.play('boom'); } }
        else this.flung = Math.max(0, this.flung - dt);
      }
    } else if (this.anchor) { b.p = [...this.anchor]; b.v = [0, 0, 0]; }
    // points: being close is worth a lot, an intercept is worth the most
    if (this.alive > 0.3) {
      if (d < this.r * 8) this.score += dt * (d < this.r * 2 ? 12 : d < this.r * 4 ? 5 : 1.5);
      if (this.anchor && d < this.r) {
        const w = this.wind(b.p), kmh = Math.hypot(w[0], w[2]) * 3.6; this.best = Math.max(this.best, kmh);
        if (!this.intercepted) { this.intercepted = true; this.score += 300; this.say('INTERCEPT! You are inside the ' + EF_NAMES[this.ef] + ' tornado', 3000); Sound.play('quest'); }
      }
    }
    // camera shake: grows as you get close, strongest in the core
    g.shake = this.alive * (d < this.r ? 1 : Math.max(0, 1 - (d - this.r) / (this.r * 5))) * (0.35 + this.ef * 0.13) * (this.anchor ? 1.2 : 1);
    // debris and dust
    if (this.alive > 0.05 && g.fx) {
      const n = Math.floor(dt * 70 * this.alive + Math.random());
      for (let q = 0; q < n; q++) { const a = Math.random() * 6.283, rr = this.r * (0.6 + Math.random() * 0.9), px = this.p[0] + Math.cos(a) * rr, pz = this.p[2] + Math.sin(a) * rr, vt = 14 + this.ef * 4;
        g.fx.emit([px, this.p[1] + Math.random() * 3, pz], { v: [-Math.sin(a) * vt - Math.cos(a) * 3, 3 + Math.random() * 6, Math.cos(a) * vt - Math.sin(a) * 3], life: 1.6, size: 0.9 + Math.random() * 1.4, col: Math.random() < 0.5 ? [0.42, 0.36, 0.3] : [0.55, 0.5, 0.45], a: 0.55, shape: 0, drag: 0.4, grow: 1.2 }); }
    }
    for (const db of this.debris) {
      if (db.out > 0) { // flung debris flies off in a curve and falls
        db.out -= dt; db.v[1] -= 9.8 * dt; for (let i = 0; i < 3; i++) db.p[i] += db.v[i] * dt; db.spin[0] += dt * 6; db.spin[1] += dt * 4;
        if (db.p[1] < this.ground(db.p[0], db.p[2])) { db.out = 0; }
        if (Math.hypot(db.p[0] - b.p[0], db.p[1] - b.p[1], db.p[2] - b.p[2]) < 1.4 && !this.anchor) { b.v[0] += db.v[0] * 0.4; b.v[2] += db.v[2] * 0.4; b.v[1] += 4; this.score = Math.max(0, this.score - 10); this.say('Ouch! Flying debris', 1200); db.out = 0; }
        continue;
      }
      db.a += dt * db.sp * (2.2 + this.ef * 0.3) / db.rr; db.h += (Math.sin(db.a * 0.7) * 6 - 0.5) * dt; if (db.h < 0) db.h = 40; if (db.h > 55) db.h = 1;
      db.spin[0] += dt * 3; db.spin[1] += dt * 2.3;
      if (this.alive > 0.5 && Math.random() < dt * 0.06) { // gets thrown out
        const R = this.r * db.rr, px = this.p[0] + Math.cos(db.a) * R, pz = this.p[2] + Math.sin(db.a) * R, vt = 18 + this.ef * 5;
        db.p = [px, this.p[1] + db.h, pz]; db.v = [-Math.sin(db.a) * vt + Math.cos(db.a) * 10, 6, Math.cos(db.a) * vt + Math.sin(db.a) * 10]; db.out = 6;
      }
    }
    if (this.alive > 0.3 && d < this.r * 3 && Math.random() < dt * 0.8) Sound.play('wind');
    if (this.msg && now > this.msg.until) this.msg = null;
    if (t > this.T || Math.hypot(b.p[0] - this.p[0], b.p[2] - this.p[2]) > 2600) return false;
    return true;
  }
  say(text, ms) { this.msg = { text, until: performance.now() + ms }; }
  // ---- drawing ----
  build(G) {
    // the funnel: a lathe from the ground up to the cloud base, wedge / cone / rope by strength
    const mb = new MeshBuilder(), r = this.r, top = 200, prof = [];
    const wide = this.ef >= 4 ? 1.6 : this.ef >= 2 ? 1 : 0.55;
    for (let k = 0; k <= 14; k++) { const t = k / 14, rr = r * (0.75 + 0.25 * wide) * (1 - t) + r * 2.6 * wide * Math.pow(t, 2.2) + r * 0.3 * t + 0.6; prof.push([rr, t * (top + 20)]); }
    mb.lathe(prof, 26, (t, ph) => { const band = 0.5 + 0.5 * Math.sin(ph * 3 + t * 22); const c = 0.36 + band * 0.12 + t * 0.12; return [c, c * 0.97, c * 0.95, 0.36 + 0.1 * (1 - t)]; }, 0);
    this.mesh = mb.build(G);
    const db = new MeshBuilder();
    db.box(-0.9, -0.08, -0.22, 0.9, 0.08, 0.22, hex('#9a6a3a'));          // a plank
    this.debrisM = [db.build(G)];
    const b2 = new MeshBuilder(); b2.box(-0.4, -0.4, -0.4, 0.4, 0.4, 0.4, hex('#b08a5a')); b2.box(-0.42, -0.06, -0.42, 0.42, 0.06, 0.42, hex('#7a5a3a')); this.debrisM.push(b2.build(G)); // a crate
    const b3 = new MeshBuilder(); b3.cyl(0, -0.8, 0, 0.12, 0.08, 1.6, 5, hex('#6e4a2c')); b3.ico(0, 0.9, 0, 0.45, 0, () => hex('#4f8a3a')); this.debrisM.push(b3.build(G)); // a branch
    const nm = new MeshBuilder(); nm.cyl(0, 0, 0, 0.06, 0.02, 1.0, 6, hex('#c8ccd4')); nm.cyl(0, 1.0, 0, 0.18, 0.18, 0.07, 10, hex('#9aa0aa')); this.nailM = nm.build(G);
  }
  draw(G, t, me) {
    if (!this.mesh) this.build(G);
    // debris
    G.mat(1, 0.25, 0.2); G.tex(0);
    for (const db of this.debris) {
      const p = db.out > 0 ? db.p : [this.p[0] + Math.cos(db.a) * this.r * db.rr, this.p[1] + db.h, this.p[2] + Math.sin(db.a) * this.r * db.rr];
      if (this.alive < 0.05 && db.out <= 0) continue;
      G.draw(this.debrisM[db.kind], M4.model(p, M4.mul3(M4.rotX(db.spin[0]), M4.rotZ(db.spin[1])), 1));
    }
    // the nail on the ball: on its side when ready, driven into the ground when used
    if (me) { G.mat(1, 0.4, 0.9); const R = me.r || 0.45;
      if (this.anchor) G.draw(this.nailM, M4.model([me.p[0], me.p[1] - R - 0.55, me.p[2]], null, 1.1));
      else G.draw(this.nailM, M4.model([me.p[0], me.p[1] + R * 0.6, me.p[2]], M4.rotZ(-0.9), 0.8)); }
  }
  drawFunnel(G, t) {
    if (!this.mesh || this.alive <= 0.01) return;
    G.mat(0, 0.15, 0); G.tex(0);
    const k = this.alive, M = M4.model([this.p[0], this.p[1] - 1, this.p[2]], M4.rotY(t * 2.2), [k, 1, k]);
    G.draw(this.mesh, M, Math.min(1, k * 1.2));
    G.draw(this.mesh, M4.model([this.p[0], this.p[1] - 1, this.p[2]], M4.rotY(-t * 1.3 + 1), [k * 1.12, 1, k * 1.12]), 0.55 * k);
    if (this.near < this.r * 1.4) G.draw(this.mesh, M4.model([this.p[0], this.p[1] - 1, this.p[2]], M4.rotY(t * 2.6), [-k * 0.97, 1, k * 0.97]), 0.9 * k); // seen from inside: the swirling walls all around you
  }
}
