// The Fun Park: a big deck east of the plaza with ball soccer, mini golf (you are the ball!),
// bowling (you are the ball again) and a treasure hunt. Everything here runs on your own device.
const PARK = { x: 120, z: -40, w: 42, d: 36 };
const GOLF_HOLES = [
  { tee: [6, -30], cup: [20, -30], par: 2, lanes: [[4, -32, 22, -28]] },
  { tee: [6, -22], cup: [36, -22], par: 3, lanes: [[4, -24, 38, -20]], bump: [21, -22] },
  { tee: [6, -12], cup: [30, -6], par: 3, lanes: [[4, -14, 32, -10], [28, -14, 32, -4]], post: [17, -12] },
];
const BOWL = { z: 11.5, x0: 4, x1: 37, pins: 33 };
class FunPark {
  constructor(game) {
    this.g = game; const T = game.T;
    let mx = -1e9, mn = 1e9;
    for (let x = -PARK.w; x <= PARK.w; x += 3) for (let z = -PARK.d; z <= PARK.d; z += 3) { const h = T.ground(PARK.x + x, PARK.z + z); mx = Math.max(mx, h); mn = Math.min(mn, h); }
    this.Y = Math.ceil((mx + 0.25) * 4) / 4; this.low = mn;
    this.mode = null; this.goals = 0; this.charge = 0;
    this.sb = { p: this.W(-22, 1.1, 0), v: [0, 0, 0], r: 1.1, ang: [0, 0] };
    this.resetPins();
    this.pads = { golf: [2, -2], bowl: [1, BOWL.z], soccer: [-2, 0], hunt: [20, 30] };
  }
  W(x, y, z) { return [PARK.x + x, this.Y + y, PARK.z + z]; }
  L(p) { return [p[0] - PARK.x, p[1] - this.Y, p[2] - PARK.z]; }
  // ---------- the deck and everything built on it ----------
  build(gl, st) {
    const mb = new MeshBuilder().collect(), C = h => hex(h), Y = this.Y, W = PARK.w, D = PARK.d, H = bh(mb);
    const s = { key: 'park', items: [], lights: [], triggers: [], label: null, x: PARK.x, z: PARK.z, rad: 60, signs: [] };
    mb.push([PARK.x, 0, PARK.z]);
    // the deck, its sides down into the ground, and ramps up on every side
    mb.box(-W, Y - 0.6, -D, W, Y, D, C('#a4abb6'));
    mb.box(-W, this.low - 2, -D, W, Y - 0.6, D, C('#9aa0aa'));
    for (const [ax, az, rot] of [[-W, 0, 0], [W, 0, Math.PI], [0, -D, -Math.PI / 2], [0, D, Math.PI / 2]]) {
      mb.push([ax, 0, az], M4.rotY(rot)); const g0 = this.low - 0.5, len = Math.max(6, (Y - g0) * 4);
      mb.quad([0, Y, -6], [0, Y, 6], [-len, g0, 6], [-len, g0, -6], C('#b8bec8')); mb.quad([0, Y, 6], [0, g0 - 1, 6], [-len, g0 - 1, 6], [-len, g0, 6], C('#9aa0aa')); mb.quad([0, g0 - 1, -6], [0, Y, -6], [-len, g0, -6], [-len, g0 - 1, -6], C('#9aa0aa'));
      mb.pop();
    }
    // soccer pitch with lines, low walls and two goals
    const px0 = -40, px1 = -4, pz0 = -28, pz1 = 28, pcx = -22;
    mb.box(px0, Y, pz0, px1, Y + 0.03, pz1, C('#4caf50'), false, true);
    for (let k = 0; k < 8; k++) mb.box(px0, Y + 0.031, pz0 + k * 7, px1, Y + 0.035, pz0 + k * 7 + 3.5, C('#43a047'), false, true);
    const line = (x0, z0, x1, z1) => mb.box(x0, Y + 0.036, z0, x1, Y + 0.05, z1, C('#ffffff'), false, true);
    line(px0 + 1, pz0 + 1, px1 - 1, pz0 + 1.25); line(px0 + 1, pz1 - 1.25, px1 - 1, pz1 - 1); line(px0 + 1, pz0 + 1, px0 + 1.25, pz1 - 1); line(px1 - 1.25, pz0 + 1, px1 - 1, pz1 - 1); line(px0 + 1, -0.12, px1 - 1, 0.12);
    for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283, b = (k + 1) / 28 * 6.283; mb.box(pcx + Math.cos(a) * 5 - 0.12, Y + 0.036, Math.sin(a) * 5 - 0.12, pcx + Math.cos(a) * 5 + 0.12, Y + 0.05, Math.sin(a) * 5 + 0.12, C('#ffffff'), false, true); }
    for (const [x0, z0, x1, z1] of [[px0 - 0.4, pz0 - 0.4, px1 + 0.4, pz0], [px0 - 0.4, pz1, px1 + 0.4, pz1 + 0.4], [px0 - 0.4, pz0, px0, pz1], [px1, pz0, px1 + 0.4, -3], [px1, 3, px1 + 0.4, pz1]]) H.box(x0, Y, z0, x1, Y + 0.7, z1, '#e8eaee');
    for (const sz of [-1, 1]) { const gz = sz > 0 ? pz1 - 1 : pz0 + 1;
      for (const gx of [pcx - 3.6, pcx + 3.6]) mb.cyl(gx, Y, gz, 0.16, 0.16, 3.2, 8, C('#ffffff'));
      mb.caps([pcx - 3.6, Y + 3.2, gz], [pcx + 3.6, Y + 3.2, gz], 0.16, 0.16, 8, C('#ffffff'));
      mb.up = true; mb.quad([pcx - 3.6, Y + 3.2, gz + sz * 1.6], [pcx + 3.6, Y + 3.2, gz + sz * 1.6], [pcx + 3.6, Y, gz + sz * 1.8], [pcx - 3.6, Y, gz + sz * 1.8], [0.85, 0.88, 0.92, 0.3], true); mb.up = false;
    }
    // mini golf: green lanes with wooden walls, cups with flags
    GOLF_HOLES.forEach((h, i) => {
      for (const [x0, z0, x1, z1] of h.lanes) { mb.box(x0, Y, z0, x1, Y + 0.05, z1, C(i % 2 ? '#3fa35a' : '#36a05a'), false, true); }
      const rects = h.lanes, inAny = (x, z) => rects.some(([a, b, c, d]) => x > a + 0.01 && x < c - 0.01 && z > b + 0.01 && z < d - 0.01);
      for (const [x0, z0, x1, z1] of rects) { // walls on every edge not shared with another lane piece
        for (let x = x0; x < x1; x += 1) { if (!inAny(x + 0.5, z0 - 0.2)) H.box(x, Y, z0 - 0.3, x + 1, Y + 0.45, z0, '#8a5a32'); if (!inAny(x + 0.5, z1 + 0.2)) H.box(x, Y, z1, x + 1, Y + 0.45, z1 + 0.3, '#8a5a32'); }
        for (let z = z0; z < z1; z += 1) { if (!inAny(x0 - 0.2, z + 0.5)) H.box(x0 - 0.3, Y, z, x0, Y + 0.45, z + 1, '#8a5a32'); if (!inAny(x1 + 0.2, z + 0.5)) H.box(x1, Y, z, x1 + 0.3, Y + 0.45, z + 1, '#8a5a32'); }
      }
      mb.box(h.tee[0] - 0.7, Y + 0.05, h.tee[1] - 0.7, h.tee[0] + 0.7, Y + 0.07, h.tee[1] + 0.7, C('#cdeccd'), false, true);
      mb.cyl(h.cup[0], Y + 0.051, h.cup[1], 0.62, 0.62, 0.02, 16, C('#1a1d22'), true);
      mb.cyl(h.cup[0] + 0.45, Y, h.cup[1], 0.04, 0.04, 2.4, 5, C('#e8e8e8'), false, true);
      mb.tri2([h.cup[0] + 0.47, Y + 2.4, h.cup[1]], [h.cup[0] + 0.47, Y + 1.85, h.cup[1]], [h.cup[0] + 1.3, Y + 2.12, h.cup[1]], C(['#ff5a6a', '#ffd24a', '#5ab8f0'][i]));
      if (h.bump) { const [bx, bz] = h.bump; mb.quad([bx - 2, Y + 0.05, bz - 2], [bx - 2, Y + 0.05, bz + 2], [bx, Y + 0.6, bz + 2], [bx, Y + 0.6, bz - 2], C('#2f8a4c')); mb.quad([bx, Y + 0.6, bz - 2], [bx, Y + 0.6, bz + 2], [bx + 2, Y + 0.05, bz + 2], [bx + 2, Y + 0.05, bz - 2], C('#2f8a4c')); }
      if (h.post) mb.cyl(h.post[0], Y, h.post[1], 0.4, 0.4, 0.8, 10, C('#ff9a3a'));
    });
    // bowling lane: shiny wood, side gutters, a back wall
    mb.box(BOWL.x0, Y, BOWL.z - 1.6, BOWL.x1, Y + 0.04, BOWL.z + 1.6, C('#d8a868'), false, true);
    for (let k = 0; k < 6; k++) mb.box(BOWL.x0 + 3 + k * 0.6, Y + 0.041, BOWL.z - 0.06 + (k - 2.5) * 0.45, BOWL.x0 + 3.3 + k * 0.6, Y + 0.05, BOWL.z + 0.06 + (k - 2.5) * 0.45, C('#7a4a2a'), false, true);
    for (const sz of [-1, 1]) H.box(BOWL.x0, Y, BOWL.z + sz * 1.6 - (sz < 0 ? 0.35 : 0), BOWL.x1 + 1, Y + 0.5, BOWL.z + sz * 1.6 + (sz > 0 ? 0.35 : 0), '#4a4f5c');
    H.box(BOWL.x1, Y, BOWL.z - 1.6, BOWL.x1 + 1, Y + 1.8, BOWL.z + 1.6, '#2e3240');
    // start pads (coloured rings on the floor) and a big sign arch at the entrance
    const pad = (x, z, col) => { for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; mb.box(x + Math.cos(a) * 1.3 - 0.18, Y + 0.05, z + Math.sin(a) * 1.3 - 0.18, x + Math.cos(a) * 1.3 + 0.18, Y + 0.12, z + Math.sin(a) * 1.3 + 0.18, glowC(C(col)), false, true); } };
    pad(...this.pads.golf, '#7aff9a'); pad(...this.pads.bowl, '#ffc45a'); pad(...this.pads.hunt, '#ff9ad8');
    for (const sx of [-1, 1]) { H.box(-W - 0.6, Y, sx * 6 - 0.6, -W + 0.6, Y + 5, sx * 6 + 0.6, '#5a6aa8'); }
    H.box(-W - 0.7, Y + 5, -6.7, -W + 0.7, Y + 6.2, 6.7, '#7a8ad8');
    for (let k = 0; k < 6; k++) { const z = -5 + k * 2; mb.ico(-W, Y + 6.6, z, 0.35, 0, () => glowC(C(['#ff5a6a', '#ffd24a', '#7aff9a', '#5ab8f0', '#c9a8ff', '#ff9ad8'][k]))); s.lights.push({ p: [PARK.x - W, Y + 6.6, PARK.z + z], r: 6, c: [1, 0.9, 0.7] }); }
    mb.pop();
    s.signs = [
      { p: this.W(-W, 7.8, 0), t: 'Fun Park' },
      { p: this.W(this.pads.golf[0], 1.8, this.pads.golf[1]), t: 'Mini golf: roll here to start' },
      { p: this.W(this.pads.bowl[0], 1.8, this.pads.bowl[1]), t: 'Bowling: roll here to start' },
      { p: this.W(-22, 5, 0), t: 'Ball soccer: push the big ball into a goal!' },
      { p: this.W(this.pads.hunt[0], 1.8, this.pads.hunt[1]), t: 'Treasure hunt: roll here to start' },
    ];
    s.mesh = mb.build(gl); st.grid.add(mb.tris, s);
    // moving things: soccer ball is drawn with the ball shader; pins and the aim dots get their own meshes
    const pm = new MeshBuilder(); pm.lathe([[0, 0], [0.16, 0.02], [0.2, 0.28], [0.15, 0.62], [0.09, 0.82], [0.13, 1.0], [0.1, 1.15], [0, 1.2]], 12, t => t > 0.62 && t < 0.72 ? hex('#e83a4a') : hex('#f8f8f6'), 0); this.pinM = pm.build(gl);
    const am = new MeshBuilder(); am.ico(0, 0, 0, 0.12, 1, () => glowC(hex('#ffffff'))); this.dotM = am.build(gl);
    const cm = new MeshBuilder(); cm.box(-0.5, 0, -0.35, 0.5, 0.6, 0.35, hex('#8a5a2a')); cm.box(-0.52, 0.55, -0.37, 0.52, 0.75, 0.37, hex('#b07a3a')); cm.box(-0.08, 0.3, 0.35, 0.08, 0.55, 0.4, glowC(hex('#ffd24a'))); this.chestM = cm.build(gl);
    this.s = s; return s;
  }
  // ---------- pins ----------
  resetPins() {
    this.pins = [];
    for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) this.pins.push({ p: [BOWL.pins + row * 0.75, 0, BOWL.z + (k - row / 2) * 0.6], v: [0, 0, 0], tilt: 0, td: 0, down: false });
  }
  // ---------- each frame ----------
  // returns true when it took over the ball's controls (golf / bowling aiming)
  update(dt, b, input, now, ui) {
    const lp = this.L(b.p), near = (q, r = 1.4) => Math.hypot(lp[0] - q[0], lp[2] - q[1]) < r && Math.abs(lp[1]) < 2;
    // starting a game
    if (!this.mode && now > (this.cool || 0)) {
      if (near(this.pads.golf)) this.startGolf(b, ui);
      else if (near(this.pads.bowl)) this.startBowl(b, ui);
      else if (near(this.pads.hunt)) this.startHunt(b, ui);
    }
    this.updateSoccer(dt, b, ui);
    this.updatePins(dt, b);
    if (this.mode === 'hunt') this.updateHunt(b, ui, now);
    if (this.mode === 'golf' || this.mode === 'bowl') {
      const moving = Math.hypot(b.v[0], b.v[2]) > 0.25 || !b.grounded;
      if (!this.rolling) {
        // hold jump to charge, let go to shoot towards where the camera looks
        if (input.up) { this.charge = Math.min(1, this.charge + dt * 0.8); this.charging = true; }
        else if (this.charging) {
          const yaw = this.g.cam.yaw, pw = 3 + this.charge * (this.mode === 'golf' ? 13 : 20);
          b.v = [-Math.sin(yaw) * pw, 0, -Math.cos(yaw) * pw]; b.boostT = 0.3; this.charging = false; this.charge = 0; this.rolling = true; this.rollT = 0;
          if (this.mode === 'golf') this.strokes++; Sound.play('jump');
        }
        if (this.mode === 'golf') { const h = GOLF_HOLES[this.hole]; b.p = this.W(this.at[0], 0.5, this.at[1]); b.v = [0, 0, 0]; }
        else { b.p = this.W(BOWL.x0 + 1.2, 0.5, this.at[1]); b.v = [0, 0, 0]; }
      } else {
        this.rollT += dt;
        if (this.mode === 'golf') {
          const h = GOLF_HOLES[this.hole], dc = Math.hypot(lp[0] - h.cup[0], lp[2] - h.cup[1]), sp = Math.hypot(b.v[0], b.v[2]);
          if (dc < 0.62 && sp < 7) { this.sunk(b, ui); return true; }
          const inLane = h.lanes.some(([a, z0, c, z1]) => lp[0] > a - 0.5 && lp[0] < c + 0.5 && lp[2] > z0 - 0.5 && lp[2] < z1 + 0.5);
          if (!inLane || lp[1] < -1) { ui.toast('Out of bounds! +1 stroke', 1400); this.strokes++; this.rolling = false; }
          else if (!moving && this.rollT > 0.4) { this.at = [lp[0], lp[2]]; this.rolling = false; }
        } else {
          if (lp[0] > BOWL.x1 - 0.8 || (!moving && this.rollT > 0.6) || this.rollT > 7) { // the roll is over: count pins after they settle
            if (!this.settle) this.settle = now + 1500;
            if (now > this.settle) this.bowlScore(b, ui);
          }
        }
      }
      input.x = 0; input.z = 0; input.jump = false; input.up = false;
      return true;
    }
    return false;
  }
  startGolf(b, ui) { this.mode = 'golf'; this.hole = 0; this.strokes = 0; this.total = 0; this.at = [...GOLF_HOLES[0].tee]; this.rolling = false; this.charge = 0; ui.banner('Mini golf', 'You are the ball!', 'Hold jump to charge, let go to shoot where the camera looks'); }
  sunk(b, ui) {
    const h = GOLF_HOLES[this.hole], d = this.strokes - h.par, word = this.strokes === 1 ? 'Hole in one!' : d <= -2 ? 'Eagle!' : d === -1 ? 'Birdie!' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : '+' + d;
    this.total += this.strokes; Sound.play(this.strokes === 1 ? 'quest' : 'coin'); ui.toast('Hole ' + (this.hole + 1) + ': ' + this.strokes + ' strokes · ' + word, 2600);
    this.hole++; this.rolling = false; this.strokes = 0; this.charge = 0;
    if (this.hole >= GOLF_HOLES.length) { const par = GOLF_HOLES.reduce((s, h) => s + h.par, 0), coins = Math.max(5, 40 - (this.total - par) * 6); ui.finish('Mini golf done! ' + this.total + ' strokes (par ' + par + ') · +' + coins + ' coins', coins, 'golf'); this.stop(b); return; }
    this.at = [...GOLF_HOLES[this.hole].tee];
  }
  startBowl(b, ui) { this.mode = 'bowl'; this.frame = 0; this.roll = 0; this.pinsTotal = 0; this.at = [0, BOWL.z]; this.rolling = false; this.charge = 0; this.resetPins(); ui.banner('Bowling', '3 frames, 2 rolls each', 'Turn the camera to aim, hold jump to charge, let go to bowl'); }
  bowlScore(b, ui) {
    const down = this.pins.filter(p => p.down).length;
    this.settle = 0; this.rolling = false;
    if (this.roll === 0 && down === 10) { ui.toast('Strike! All 10 pins!', 2400); Sound.play('quest'); this.pinsTotal += 20; this.nextFrame(b, ui); return; }
    if (this.roll === 1) { if (down === 10) { ui.toast('Spare!', 2000); Sound.play('coin'); this.pinsTotal += 5; } else ui.toast(down + ' pins this frame', 1800); this.pinsTotal += down; this.nextFrame(b, ui); return; }
    ui.toast(down + ' pins down! One more roll', 1600); this.roll = 1;
    for (const p of this.pins) if (p.down) p.gone = true;
  }
  nextFrame(b, ui) {
    this.frame++; this.roll = 0; this.resetPins();
    if (this.frame >= 3) { const coins = Math.round(this.pinsTotal * 1.2); ui.finish('Bowling done! Score ' + this.pinsTotal + ' · +' + coins + ' coins', coins, 'bowl'); this.stop(b); return; }
    ui.toast('Frame ' + (this.frame + 1) + ' of 3', 1400);
  }
  startHunt(b, ui) {
    // a chest is buried somewhere up to ~450 m away; you get warmer / colder hints
    const a = Math.random() * 6.283, d = 160 + Math.random() * 290, x = PARK.x + Math.cos(a) * d, z = PARK.z + Math.sin(a) * d;
    this.mode = 'hunt'; this.chest = [x, Math.max(this.g.T.ground(x, z), SEA), z]; this.huntT = performance.now(); this.lastD = null; this.hint = 'Somewhere out there…';
    const dir = ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'][Math.round((Math.atan2(-(z - PARK.z), x - PARK.x) / 6.283 * 8 + 8)) % 8];
    ui.banner('Treasure hunt', 'A chest is hidden about ' + Math.round(d / 50) * 50 + ' m to the ' + dir, 'Follow the warmer / colder hints!');
  }
  updateHunt(b, ui, now) {
    const d = Math.hypot(b.p[0] - this.chest[0], b.p[2] - this.chest[2]);
    if (this.lastD == null || Math.abs(d - this.lastD) > 25) { this.hint = this.lastD == null ? 'Go find it!' : d < this.lastD ? (d < 60 ? 'Very hot!' : d < 150 ? 'Warmer!' : 'Getting warmer') : (d > 300 ? 'Freezing cold!' : 'Colder…'); this.lastD = d; }
    if (d < 2.2 && Math.abs(b.p[1] - this.chest[1]) < 3) {
      const secs = (now - this.huntT) / 1000, coins = Math.max(20, Math.round(90 - secs / 4));
      ui.finish('You found the treasure in ' + Math.round(secs) + ' s! +' + coins + ' coins', coins, 'hunt'); Sound.play('chest'); this.stop(b);
    }
  }
  stop(b) { this.mode = null; this.rolling = false; this.charge = 0; this.charging = false; this.cool = performance.now() + 3000; this.resetPins(); }
  // ---------- ball soccer ----------
  updateSoccer(dt, b, ui) {
    const s = this.sb, P = PARK, Y = this.Y, r = s.r;
    s.v[1] -= 24 * dt; for (let i = 0; i < 3; i++) s.p[i] += s.v[i] * dt;
    const lp = this.L(s.p);
    if (lp[1] < r) { lp[1] = r; if (s.v[1] < 0) s.v[1] = -s.v[1] * 0.45; const k = Math.exp(-0.9 * dt); s.v[0] *= k; s.v[2] *= k; }
    // goals: between the posts, past the line
    if (Math.abs(lp[0] + 22) < 3.4 && Math.abs(lp[2]) > 27 && lp[1] < 3) { this.goals++; ui.toast('Goal! Total goals: ' + this.goals, 2200); Sound.play('quest'); ui.goal && ui.goal(); lp[0] = -22; lp[1] = 3; lp[2] = 0; s.v = [0, 0, 0]; }
    // pitch walls
    if (lp[0] < -40 + r) { lp[0] = -40 + r; s.v[0] = Math.abs(s.v[0]) * 0.7; }
    if (lp[0] > -4 - r) { lp[0] = -4 - r; s.v[0] = -Math.abs(s.v[0]) * 0.7; }
    if (Math.abs(lp[2]) > 28 - r && !(Math.abs(lp[0] + 22) < 3.4)) { lp[2] = Math.sign(lp[2]) * (28 - r); s.v[2] = -s.v[2] * 0.7; }
    if (Math.abs(lp[2]) > 30) { lp[2] = Math.sign(lp[2]) * 30; s.v[2] = 0; }
    s.p = this.W(lp[0], lp[1], lp[2]);
    // the player pushes it
    const dx = s.p[0] - b.p[0], dy = s.p[1] - b.p[1], dz = s.p[2] - b.p[2], d = Math.hypot(dx, dy, dz), R = r + (b.r || 0.45);
    if (d < R && d > 0.01) {
      const nx = dx / d, ny = dy / d, nz = dz / d, rel = (b.v[0] - s.v[0]) * nx + (b.v[1] - s.v[1]) * ny + (b.v[2] - s.v[2]) * nz;
      if (rel > 0) { const j = rel * 1.35; s.v[0] += nx * j; s.v[1] += Math.max(0, ny * j) + j * 0.12; s.v[2] += nz * j; b.v[0] -= nx * rel * 0.5; b.v[2] -= nz * rel * 0.5; if (j > 3) Sound.play('land'); }
      s.p[0] = b.p[0] + nx * R; s.p[2] = b.p[2] + nz * R;
    }
    s.ang[0] += s.v[2] * dt / r; s.ang[1] -= s.v[0] * dt / r;
  }
  // ---------- pins ----------
  updatePins(dt, b) {
    for (const p of this.pins) {
      if (p.gone) continue;
      for (let i = 0; i < 3; i += 2) p.p[i] += p.v[i] * dt;
      const k = Math.exp(-2.2 * dt); p.v[0] *= k; p.v[2] *= k;
      if (p.down && p.tilt < 1.5) p.tilt = Math.min(1.55, p.tilt + dt * 5);
      // the ball hits a pin
      const lp = this.L(b.p), dx = p.p[0] - lp[0], dz = p.p[2] - lp[2], d = Math.hypot(dx, dz);
      if (d < 0.45 + 0.22 && lp[1] < 1.6) { const sp = Math.hypot(b.v[0], b.v[2]); p.v = [dx / d * sp * 0.9 + b.v[0] * 0.4, 0, dz / d * sp * 0.9 + b.v[2] * 0.4]; if (!p.down) { p.down = true; p.td = Math.atan2(dz, dx); Sound.play('click'); } }
    }
    for (const a of this.pins) for (const c of this.pins) { // pins knock each other over
      if (a === c || a.gone || c.gone) continue; const dx = c.p[0] - a.p[0], dz = c.p[2] - a.p[2], d = Math.hypot(dx, dz), sp = Math.hypot(a.v[0], a.v[2]);
      if (d < 0.5 && d > 0.01 && sp > 0.8 && !c.down) { c.down = true; c.td = Math.atan2(dz, dx); c.v = [dx / d * sp * 0.7, 0, dz / d * sp * 0.7]; }
    }
  }
  // ---------- drawing ----------
  draw(G, t, b) {
    const s = this.sb;
    G.ball(M4.model(s.p, M4.mul3(M4.rotX(s.ang[0]), M4.rotZ(s.ang[1])), s.r), 9, [0.97, 0.97, 0.97], [0.12, 0.12, 0.14], 1, 0);
    G.mat(0.6, 0.3, 0.6); G.tex(0);
    for (const p of this.pins) {
      if (p.gone) continue;
      const R = M4.mul3(M4.rotY(-p.td), M4.rotZ(-p.tilt));
      G.draw(this.pinM, M4.model(this.W(p.p[0], p.tilt > 0.5 ? 0.18 : 0, p.p[2]), R, 1));
    }
    if (this.mode === 'hunt') { const c = this.chest; if (Math.hypot(c[0] - b.p[0], c[2] - b.p[2]) < 80) G.draw(this.chestM, M4.model(c, M4.rotY(t * 0.5), 1.4), 1, null, 0.3); }
    if ((this.mode === 'golf' || this.mode === 'bowl') && !this.rolling) { // aim dots
      const yaw = this.g.cam.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), n = 4 + Math.round(this.charge * 8);
      for (let k = 1; k <= n; k++) G.draw(this.dotM, M4.model([b.p[0] + fx * k * 0.6, b.p[1] - 0.3, b.p[2] + fz * k * 0.6], null, 1 + this.charge * 0.6), 1, null, 1);
    }
  }
  chip() {
    if (this.mode === 'golf') return 'Mini golf · hole ' + (this.hole + 1) + '/3 · strokes ' + this.strokes + ' · par ' + GOLF_HOLES[this.hole].par + (this.charging ? ' · power ' + Math.round(this.charge * 100) + '%' : '');
    if (this.mode === 'bowl') return 'Bowling · frame ' + (this.frame + 1) + '/3 · roll ' + (this.roll + 1) + ' · score ' + this.pinsTotal + (this.charging ? ' · power ' + Math.round(this.charge * 100) + '%' : '');
    if (this.mode === 'hunt') return 'Treasure hunt · ' + this.hint;
    return this.goals ? 'Soccer goals: ' + this.goals : '';
  }
}
