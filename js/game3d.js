// The 3D side of Funz Online: rolling-ball physics, camera, building rays, drawing.
class Game3D {
  constructor(canvas, overlay, world) {
    this.gfx = new GL(canvas); this.canvas = canvas; this.ov = overlay; this.o = overlay.getContext('2d');
    this.world = world;
    this.chunks = new Map(); this.dirty = new Set();
    this.models = new Map(); this.itemModels = {};
    this.ringM = ringModel(this.gfx, '#48d6ac'); this.ringNext = ringModel(this.gfx, '#ffc45a'); this.ringDone = ringModel(this.gfx, '#8a93a8');
    this.shadow = shadowModel(this.gfx); this.water = waterModel(this.gfx); this.cursorM = cursorModel(this.gfx);
    this.cam = { yaw: Math.PI, pitch: 0.45, dist: 8, eye: [0, 0, 0], target: [0, 0, 0] };
    this.fov = 1.05;
    this.lampList = world.lamps();
    this.mini = this.makeMinimap();
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr; this.w = innerWidth; this.h = innerHeight;
    for (const c of [this.canvas, this.ov]) { c.width = Math.round(this.w * dpr); c.height = Math.round(this.h * dpr); }
    this.gfx.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
  ballFor(color, hat) { const k = color + '|' + hat; if (!this.models.has(k)) this.models.set(k, ballModel(this.gfx, color, hat)); return this.models.get(k); }
  itemFor(t) { return this.itemModels[t] || (this.itemModels[t] = itemModel(this.gfx, t)); }

  // ---------- world changes ----------
  blockChanged(x, y, z) {
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = Math.floor((x + dx) / CH) + ',' + Math.floor((z + dz) / CH);
      if (this.chunks.has(k)) this.dirty.add(k);
    }
    this.lampList = this.world.lamps();
  }
  rebuildAll() { for (const k of this.chunks.keys()) this.dirty.add(k); this.lampList = this.world.lamps(); this.mini = this.makeMinimap(); }

  // ---------- physics ----------
  newBody(p) { return { p: [...p], v: [0, 0, 0], R: [1, 0, 0, 0, 1, 0, 0, 0, 1], r: 0.45, grounded: false, ground: 0, groundAt: null, tpCool: 0, padCool: 0 }; }
  step(b, input, dt, opts) {
    const W = this.world;
    const targetR = opts.big ? 0.8 : 0.45;
    if (b.r !== targetR) { b.r += (targetR - b.r) * Math.min(1, dt * 6); if (Math.abs(b.r - targetR) < 0.01) b.r = targetR; if (targetR > b.r) b.p[1] += 0.02; }
    const v = b.v;
    if (opts.fly) {
      const sp = 14;
      v[0] = input.x * sp; v[2] = input.z * sp; v[1] = (input.up ? 1 : 0) * sp * 0.7 - (input.down ? 1 : 0) * sp * 0.7;
      b.p[0] += v[0] * dt; b.p[1] += v[1] * dt; b.p[2] += v[2] * dt;
      b.p[0] = Math.max(0, Math.min(WORLD, b.p[0])); b.p[2] = Math.max(0, Math.min(WORLD, b.p[2])); b.p[1] = Math.max(0, Math.min(HMAX + 40, b.p[1]));
      this.roll(b, dt); b.grounded = false; return;
    }
    const maxS = 7.5 * (opts.fast ? 1.7 : 1), acc = b.grounded ? 26 : 10;
    v[0] += input.x * acc * dt; v[2] += input.z * acc * dt;
    const hs = Math.hypot(v[0], v[2]);
    if (hs > maxS && !(b.boostT > 0)) { const k = Math.max(maxS / hs, 1 - dt * 4); v[0] *= k; v[2] *= k; }
    if (b.boostT > 0) b.boostT -= dt;
    if (!input.x && !input.z && b.grounded) { const k = Math.exp(-3.2 * dt); v[0] *= k; v[2] *= k; }
    v[1] -= 24 * dt;
    // water: float and slow down
    const depth = WATER - 0.2 - b.p[1];
    if (depth > -b.r) { const sub = Math.min(1, (depth + b.r) / (2 * b.r)); v[1] += 40 * sub * dt; const k = Math.exp(-2.2 * sub * dt); v[0] *= k; v[1] *= Math.exp(-4.5 * sub * dt); v[2] *= k; }
    if (input.jump && (b.grounded || (depth > -0.1 && depth < 0.6))) { v[1] = opts.superJump ? 13 : 8.5; b.grounded = false; }
    b.grounded = false; b.ground = 0;
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      const h = dt / steps;
      b.p[0] += v[0] * h; b.p[1] += v[1] * h; b.p[2] += v[2] * h;
      this.collide(b);
    }
    if (b.grounded) this.machines(b, opts);
    b.tpCool -= dt; b.padCool -= dt;
    this.roll(b, dt);
  }
  collide(b) {
    const W = this.world, p = b.p, v = b.v, r = b.r;
    for (let y = Math.floor(p[1] - r); y <= Math.floor(p[1] + r); y++)
      for (let z = Math.floor(p[2] - r); z <= Math.floor(p[2] + r); z++)
        for (let x = Math.floor(p[0] - r); x <= Math.floor(p[0] + r); x++) {
          if (!W.solid(x, y, z)) continue;
          const cx = Math.max(x, Math.min(x + 1, p[0])), cy = Math.max(y, Math.min(y + 1, p[1])), cz = Math.max(z, Math.min(z + 1, p[2]));
          let dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz; let d = Math.hypot(dx, dy, dz);
          if (d >= r) continue;
          if (d < 1e-5) { dx = 0; dy = 1; dz = 0; d = 0; p[1] = y + 1 + r; } else { dx /= d; dy /= d; dz /= d; p[0] += dx * (r - d); p[1] += dy * (r - d); p[2] += dz * (r - d); }
          const id = W.get(x, y, z), bouncy = id === 47;
          const vn = v[0] * dx + v[1] * dy + v[2] * dz;
          if (vn < 0) { const k = bouncy ? 1.85 : 1; v[0] -= dx * vn * k; v[1] -= dy * vn * k; v[2] -= dz * vn * k; if (bouncy && dy > 0.6) v[1] = Math.max(v[1], 11); }
          if (dy > 0.6) { b.grounded = true; b.ground = id; b.groundAt = [x, y, z]; }
        }
  }
  machines(b, opts) {
    const id = b.ground, at = b.groundAt;
    if (id === 40 && b.padCool <= 0) { b.v[1] = 17; b.grounded = false; b.padCool = 0.3; opts.fx && opts.fx('jump'); }
    else if (id === 41 && b.padCool <= 0) {
      let hx = b.v[0], hz = b.v[2], l = Math.hypot(hx, hz);
      if (l < 0.5) { hx = -Math.sin(this.cam.yaw); hz = -Math.cos(this.cam.yaw); l = 1; }
      b.v[0] = hx / l * 22; b.v[2] = hz / l * 22; b.boostT = 1.2; b.padCool = 0.4; opts.fx && opts.fx('speed');
    } else if (BLOCKS[id] && BLOCKS[id].tp && b.tpCool <= 0) {
      const list = this.world.teleporters(id);
      if (list.length > 1) {
        const i = list.findIndex(q => q[0] === at[0] && q[1] === at[1] && q[2] === at[2]);
        const t = list[(i + 1) % list.length];
        b.p = [t[0] + 0.5, t[1] + 1 + b.r + 0.05, t[2] + 0.5]; b.v = [0, 0, 0]; b.tpCool = 1.6;
        opts.fx && opts.fx('tp', BLOCKS[id].tp);
      } else if (b.tpCool <= 0) { b.tpCool = 3; opts.fx && opts.fx('tp-alone'); }
    } else if (id === 46) { opts.fx && opts.fx('spawn', at); }
  }
  roll(b, dt) {
    const v = b.v, hs = Math.hypot(v[0], v[2]);
    if (hs < 0.01) return;
    const R = M4.axisAngle(v[2] / hs, 0, -v[0] / hs, hs * dt / b.r);
    b.R = M4.ortho3(M4.mul3(R, b.R));
  }
  // roll a remote ball from how far it moved
  rollBy(p, dx, dz, r) {
    const d = Math.hypot(dx, dz); if (d < 1e-4 || d > 3) return;
    p.R = M4.ortho3(M4.mul3(M4.axisAngle(dz / d, 0, -dx / d, d / r), p.R || [1, 0, 0, 0, 1, 0, 0, 0, 1]));
  }

  // ---------- camera ----------
  updateCamera(target, dt) {
    const c = this.cam, t = [target[0], target[1] + 0.6, target[2]];
    c.target = c.target[1] ? c.target.map((v, i) => v + (t[i] - v) * Math.min(1, dt * 10)) : t;
    const dir = [Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch)];
    let d = c.dist;
    for (let s = 0.5; s < c.dist; s += 0.25) { // don't go inside blocks
      const x = c.target[0] + dir[0] * s, y = c.target[1] + dir[1] * s, z = c.target[2] + dir[2] * s;
      if (this.world.solid(Math.floor(x), Math.floor(y), Math.floor(z))) { d = Math.max(0.8, s - 0.4); break; }
    }
    c.eye = [c.target[0] + dir[0] * d, c.target[1] + dir[1] * d, c.target[2] + dir[2] * d];
  }
  forward() { return [-Math.sin(this.cam.yaw), -Math.cos(this.cam.yaw)]; }
  ray(sx, sy) {
    const c = this.cam, f = [c.target[0] - c.eye[0], c.target[1] - c.eye[1], c.target[2] - c.eye[2]];
    const fl = Math.hypot(...f); f[0] /= fl; f[1] /= fl; f[2] /= fl;
    let r = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0]; // cross(f, up)
    r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r); r = r.map(x => x / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const th = Math.tan(this.fov / 2), asp = this.w / this.h;
    const nx = (sx / this.w) * 2 - 1, ny = 1 - (sy / this.h) * 2;
    const d = [f[0] + r[0] * nx * th * asp + u[0] * ny * th, f[1] + r[1] * nx * th * asp + u[1] * ny * th, f[2] + r[2] * nx * th * asp + u[2] * ny * th];
    const dl = Math.hypot(...d); return { o: [...c.eye], d: d.map(x => x / dl) };
  }
  // first block the ray hits: {x,y,z, nx,ny,nz}
  pick(sx, sy, maxD = 60) {
    const { o, d } = this.ray(sx, sy);
    let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
    const st = d.map(v => Math.sign(v)), td = d.map(v => v ? Math.abs(1 / v) : 1e9);
    let tm = [0, 1, 2].map(i => { const p = o[i], c = [x, y, z][i]; return d[i] > 0 ? (c + 1 - p) * td[i] : d[i] < 0 ? (p - c) * td[i] : 1e9; });
    let n = [0, 0, 0], t = 0;
    while (t < maxD) {
      const id = this.world.get(x, y, z);
      if (id && t > 0.2) return { x, y, z, nx: n[0], ny: n[1], nz: n[2], id, t };
      const a = tm[0] < tm[1] ? (tm[0] < tm[2] ? 0 : 2) : (tm[1] < tm[2] ? 1 : 2);
      t = tm[a]; tm[a] += td[a];
      if (a === 0) x += st[0]; else if (a === 1) y += st[1]; else z += st[2];
      n = [0, 0, 0]; n[a] = -st[a];
      if (y < -1 || y > HMAX + 40) return null;
    }
    return null;
  }

  // ---------- drawing ----------
  sky(dark) {
    const day = [0.53, 0.78, 0.95], night = [0.04, 0.06, 0.16], dusk = [0.95, 0.6, 0.45];
    const k = Math.min(1, dark / 0.72), mid = Math.max(0, 1 - Math.abs(k - 0.45) * 3) * 0.6;
    return day.map((v, i) => (v * (1 - k) + night[i] * k) * (1 - mid) + dusk[i] * mid);
  }
  render(players, me, o) {
    const gl = this.gfx.gl, G = this.gfx, c = this.cam;
    const sky = this.sky(o.dark);
    gl.clearColor(sky[0], sky[1], sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const proj = M4.persp(this.fov, this.w / this.h, 0.1, 400), view = M4.lookAt(c.eye, c.target, [0, 1, 0]);
    this.vp = M4.mul(proj, view);
    gl.uniformMatrix4fv(G.u.uVP, false, this.vp);
    const sa = o.sunAngle, sun = [Math.cos(sa) * 0.5, Math.max(0.15, Math.sin(sa)), 0.6]; const sl = Math.hypot(...sun);
    gl.uniform3fv(G.u.uSun, sun.map(v => v / sl));
    const lk = 1 - o.dark / 0.72;
    gl.uniform3fv(G.u.uSunC, [0.6 * lk + 0.04, 0.58 * lk + 0.04, 0.52 * lk + 0.08]);
    gl.uniform3fv(G.u.uAmb, [0.36 * lk + 0.1, 0.39 * lk + 0.11, 0.46 * lk + 0.2]);
    gl.uniform3fv(G.u.uFog, sky); gl.uniform1f(G.u.uFogD, 1 / 95); gl.uniform3fv(G.u.uEye, c.eye);
    // nearby lights: lamps and glowing players
    const L = [];
    for (const l of this.lampList) { const dx = l[0] - me.p[0], dz = l[2] - me.p[2]; if (dx * dx + dz * dz < 2500) L.push([l[0] + 0.5, l[1] + 0.5, l[2] + 0.5, 7, [1, 0.8, 0.45]]); }
    for (const p of players) if (p.glow) L.push([p.p[0], p.p[1] + 0.3, p.p[2], 8, [0.5, 0.85, 1]]);
    L.sort((a, b) => Math.hypot(a[0] - me.p[0], a[2] - me.p[2]) - Math.hypot(b[0] - me.p[0], b[2] - me.p[2]));
    const lp = new Float32Array(32), lc = new Float32Array(24); const night = Math.min(1, o.dark / 0.5) * 0.85 + 0.15;
    L.slice(0, 8).forEach((l, i) => { lp.set([l[0], l[1], l[2], l[3]], i * 4); lc.set(l[4].map(v => v * night), i * 3); });
    gl.uniform4fv(G.u.uL, lp); gl.uniform3fv(G.u.uLC, lc);

    // chunks around the camera
    const ccx = Math.floor(c.target[0] / CH), ccz = Math.floor(c.target[2] / CH), RAD = o.radius || 6;
    const want = [];
    for (let z = ccz - RAD; z <= ccz + RAD; z++) for (let x = ccx - RAD; x <= ccx + RAD; x++) {
      if (x < 0 || z < 0 || x >= WORLD / CH || z >= WORLD / CH) continue;
      const d = Math.hypot(x - ccx, z - ccz); if (d > RAD + 0.5) continue;
      const k = x + ',' + z;
      if (!this.chunks.has(k) || this.dirty.has(k)) want.push([d, x, z, k]);
    }
    want.sort((a, b) => a[0] - b[0]);
    let built = 0;
    for (const [, x, z, k] of want) {
      if (built >= (o.buildBudget || 2)) break;
      const old = this.chunks.get(k); if (old) { G.free(old.solid); G.free(old.clear); }
      this.chunks.set(k, buildChunk(G, this.world, x, z)); this.dirty.delete(k); built++;
    }
    // forget far chunks to save memory
    if (this.chunks.size > 260) for (const [k, ch] of this.chunks) { const [x, z] = k.split(',').map(Number); if (Math.hypot(x - ccx, z - ccz) > RAD + 3) { G.free(ch.solid); G.free(ch.clear); this.chunks.delete(k); } }

    gl.disable(gl.BLEND);
    for (const [k, ch] of this.chunks) { const [x, z] = k.split(',').map(Number); if (Math.hypot(x - ccx, z - ccz) <= RAD + 0.5) G.draw(ch.solid); }
    // items
    const t = o.now / 1000;
    for (const it of this.world.items) {
      if (o.taken.has(it.id)) continue;
      const dx = it.x - me.p[0], dz = it.z - me.p[2]; if (dx * dx + dz * dz > 1600) continue;
      G.draw(this.itemFor(it.type), M4.model([it.x, it.y + Math.sin(t * 2 + it.id) * 0.12, it.z], M4.rotY(t * 1.5 + it.id)));
    }
    // race rings
    this.world.rings.forEach((r, i) => {
      const m = o.race ? (i === o.race.next ? this.ringNext : i < o.race.next ? this.ringDone : this.ringM) : this.ringM;
      G.draw(m, M4.model([r.x, r.y, r.z], M4.rotY(r.yaw)));
    });
    const rs = this.world.raceStart;
    G.draw(o.race ? this.ringDone : this.ringNext, M4.model([rs[0], rs[1] - 0.5, rs[2]], [1, 0, 0, 0, 0, 1, 0, -1, 0], 0.8));
    // players
    for (const p of players) {
      const m = this.ballFor(p.color, p.hat);
      G.draw(m, M4.model(p.p, p.R, (p.r || 0.45) / 0.45), p.ghost ? 0.5 : 1);
    }
    // transparent stuff last
    gl.enable(gl.BLEND); gl.depthMask(false);
    for (const p of players) {
      let gy = Math.floor(p.p[1]); for (let k = 0; k < 24 && gy > -2 && !this.world.solid(Math.floor(p.p[0]), gy - 1, Math.floor(p.p[2])); k++) gy--;
      const gyw = Math.max(gy, WATER - 0.1), hgt = p.p[1] - gyw; if (hgt > 24) continue;
      const s = (p.r || 0.45) * (1 - Math.min(0.6, hgt / 12));
      G.draw(this.shadow, M4.model([p.p[0], gyw + 0.02, p.p[2]], null, s), Math.max(0.2, 1 - hgt / 14));
    }
    G.draw(this.water);
    for (const [k, ch] of this.chunks) { const [x, z] = k.split(',').map(Number); if (Math.hypot(x - ccx, z - ccz) <= RAD + 0.5) G.draw(ch.clear); }
    if (o.cursor) G.draw(this.cursorM, M4.model([o.cursor.x, o.cursor.y, o.cursor.z]), 1, o.cursor.ok ? [1, 1, 1] : [1, 0.3, 0.3]);
    gl.depthMask(true);
    this.drawOverlay(players, me, o);
  }
  project(x, y, z) {
    const m = this.vp, cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw < 0.1) return null;
    const cx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw, cy = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw;
    return [(cx * 0.5 + 0.5) * this.w, (1 - (cy * 0.5 + 0.5)) * this.h, cw];
  }
  drawOverlay(players, me, o) {
    const g = this.o; g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, this.w, this.h);
    g.textAlign = 'center';
    const labels = [];
    for (const p of players) {
      const s = this.project(p.p[0], p.p[1] + (p.r || 0.45) + 0.55 + (p.hat && p.hat !== 'none' ? 0.35 : 0), p.p[2]);
      if (s && s[2] < 60) labels.push([s, p]);
    }
    labels.sort((a, b) => b[0][2] - a[0][2]);
    for (const [s, p] of labels) this.label(g, s[0], s[1], p, o.now, s[2]);
    // signs
    const sign = (x, y, z, t, col) => { const s = this.project(x, y, z); if (!s || s[2] > 45) return; g.font = '700 13px system-ui'; const w = g.measureText(t).width + 16; g.fillStyle = 'rgba(10,16,34,.7)'; this.rr(g, s[0] - w / 2, s[1] - 12, w, 22, 8); g.fill(); g.fillStyle = col; g.fillText(t, s[0], s[1] + 4); };
    const rs = this.world.raceStart; if (!o.race) sign(rs[0], rs[1] + 1.2, rs[2], 'Ring race: roll here to start', '#ffc45a');
    const tp = this.world.towerSteps[0]; sign(tp[0] + 0.5, tp[1] + 2.5, tp[2] + 0.5, 'Parkour tower: trophy at the top', '#b8a8ff');
    if (o.race) { const r = this.world.rings[o.race.next]; if (r) { const s = this.project(r.x, r.y + 2, r.z); if (s) { g.font = '800 15px system-ui'; g.fillStyle = '#ffc45a'; g.fillText(String(o.race.next + 1), s[0], s[1]); } } }
    this.drawMinimap(g, players, me);
  }
  label(g, x, y, p, now, dist) {
    const sc = Math.max(0.7, Math.min(1.1, 14 / dist));
    g.save(); g.translate(x, y); g.scale(sc, sc);
    g.font = '600 12px system-ui';
    const tag = (p.admin ? '★ ' : '') + p.name, w = g.measureText(tag).width + 26;
    g.fillStyle = p.admin ? 'rgba(120,80,0,.75)' : 'rgba(0,0,0,.5)'; this.rr(g, -w / 2, -9, w, 18, 7); g.fill();
    g.fillStyle = p.admin ? '#ffd27a' : '#fff'; g.fillText(tag, -7, 4);
    drawDeviceIcon(g, p.devType, w / 2 - 10, 0, p.admin ? '#ffd27a' : 'rgba(255,255,255,.85)');
    if (p.say && now - p.sayAt < 6000) {
      g.font = '13px system-ui';
      const lines = this.wrap(g, p.say, 180), lh = 16, bw = Math.min(196, Math.max(...lines.map(l => g.measureText(l).width)) + 18), bh = lines.length * lh + 10, by = -14 - bh;
      g.fillStyle = 'rgba(255,255,255,.96)'; this.rr(g, -bw / 2, by, bw, bh, 9); g.fill();
      g.beginPath(); g.moveTo(-5, by + bh); g.lineTo(5, by + bh); g.lineTo(0, by + bh + 6); g.fill();
      g.fillStyle = '#1b1b2b'; lines.forEach((l, i) => g.fillText(l, 0, by + 18 + i * lh));
    }
    if (p.emote && now - p.emoteAt < 2500) { const t = (now - p.emoteAt) / 2500; g.globalAlpha = 1 - t * t; g.font = '26px system-ui'; g.fillText(p.emote, 0, -30 - t * 26 - (p.say && now - p.sayAt < 6000 ? 40 : 0)); g.globalAlpha = 1; }
    g.restore();
  }
  wrap(g, text, max) { const words = text.split(/\s+/), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines.slice(0, 4); }
  rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  makeMinimap() {
    const c = document.createElement('canvas'); c.width = c.height = WORLD; const g = c.getContext('2d'), img = g.createImageData(WORLD, WORLD);
    const cols = ['#2c74b8', '#e2cf95', '#5fb35a', '#3f8a46', '#7cc46a', '#8a8f99', '#f2f6fb', '#cfc6b4'].map(h => hex(h).slice(0, 3).map(v => v * 255));
    for (let i = 0; i < WORLD * WORLD; i++) {
      let col = cols[this.world.biome[i]]; if (this.world.tree[i]) col = [42, 100, 52];
      const sh = 0.8 + Math.min(0.35, this.world.h[i] / 60);
      img.data.set([col[0] * sh, col[1] * sh, col[2] * sh, 255], i * 4);
    }
    g.putImageData(img, 0, 0); return c;
  }
  drawMinimap(g, players, me) {
    const size = this.w < 600 ? 92 : 132, x = this.w - size - 10, y = 10;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 3, y - 3, size + 6, size + 6);
    g.imageSmoothingEnabled = false; g.drawImage(this.mini, x, y, size, size);
    const s = size / WORLD;
    for (const p of players) { g.fillStyle = p === me ? '#fff' : p.color; g.beginPath(); g.arc(x + p.p[0] * s, y + p.p[2] * s, p === me ? 3 : 2.5, 0, 7); g.fill(); }
    // which way the camera looks
    const f = this.forward(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + me.p[0] * s, y + me.p[2] * s); g.lineTo(x + (me.p[0] + f[0] * 14) * s, y + (me.p[2] + f[1] * 14) * s); g.stroke();
  }
}
