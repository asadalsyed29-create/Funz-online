// Particles: trails behind balls, puffs when you land, sparkles when you pick things up,
// and little things floating in the air (snow, leaves, fireflies, glowing motes...).
// Shapes: 0 soft dot, 1 dot, 2 star, 3 heart, 4 square, 5 ring, 6 sparkle, 7 snowflake, 8 leaf, 9 streak (+20 = glowing)
const TRAIL_FX = {
  dust: { shape: 0, cols: ['#d8cbb0', '#c9b896'], size: 0.22, life: 0.7, rise: 0.4, every: 0.35, ground: true },
  sparkle: { shape: 26, cols: ['#fff6b0', '#ffffff', '#ffd24a'], size: 0.2, life: 0.8, rise: 0.3, every: 0.25 },
  hearts: { shape: 3, cols: ['#ff5f8f', '#ff8fb5', '#ff3f6e'], size: 0.17, life: 1.1, rise: 0.9, every: 0.4 },
  notes: { shape: 4, cols: ['#ff5f8f', '#5aa9ff', '#ffd24a', '#7be36b', '#b48cff'], size: 0.09, life: 1.3, rise: 0.2, every: 0.18, spin: true, fall: true },
  bolt: { shape: 29, cols: ['#8af0ff', '#ffffff'], size: 0.28, life: 0.35, rise: 0, every: 0.2 },
  bubbles: { shape: 5, cols: ['#bfeaff', '#ffffff'], size: 0.13, life: 1.4, rise: 1.0, every: 0.3 },
  leaves: { shape: 8, cols: ['#6cc04a', '#9ad85a', '#3f9a4e'], size: 0.14, life: 1.6, rise: 0.1, every: 0.35, spin: true, fall: true },
  snow: { shape: 27, cols: ['#ffffff', '#dff2ff'], size: 0.15, life: 1.5, rise: -0.2, every: 0.3 },
  stars: { shape: 22, cols: ['#fff2a8', '#ffd24a', '#ffffff'], size: 0.16, life: 1.0, rise: 0.4, every: 0.28 },
  fire: { shape: 20, cols: ['#ff7a1a', '#ffb02a', '#ff4a1a'], size: 0.3, life: 0.6, rise: 1.6, every: 0.12, shrink: true },
  rainbow: { shape: 20, cols: null, size: 0.22, life: 1.0, rise: 0, every: 0.12, rainbow: true },
  royal: { shape: 22, cols: ['#ffd24a', '#b48cff', '#fff2a8', '#7a2cff'], size: 0.2, life: 1.2, rise: 0.6, every: 0.14 },
  pastel: { shape: 22, cols: ['#a8d8ff', '#cdb4ff', '#ffffff', '#d8ecff'], size: 0.2, life: 1.3, rise: 0.5, every: 0.12 },
  storm: { shape: 29, cols: ['#fffbe0', '#8af0ff', '#c8d0ff'], size: 0.34, life: 0.3, rise: 0, every: 0.12, rain: true },
};
const rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const hsv3 = h => { const f = n => { const k = (n + h * 6) % 6; return 1 - Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)]; };

class Particles {
  constructor() { this.list = []; this.max = 1500; this.data = new Float32Array(1600 * 44); this.trailAcc = new Map(); this.amb = 0; }
  emit(p, o) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({ p: [p[0], p[1], p[2]], v: o.v || [0, 0, 0], life: 0, max: o.life || 1, size: o.size || 0.2, col: o.col || [1, 1, 1], a: o.a ?? 1, shape: o.shape || 0, grav: o.grav || 0, drag: o.drag ?? 1.5, shrink: o.shrink, grow: o.grow || 0, wob: o.wob || 0, ph: Math.random() * 6.28 });
  }
  // a burst of n particles flying out from p
  burst(p, n, o) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = (o.speed || 3) * (0.4 + Math.random() * 0.6), r = Math.sqrt(1 - u * u);
      const col = o.cols ? rgb(o.cols[k % o.cols.length]) : o.col;
      this.emit(p, { ...o, col, v: [Math.cos(a) * r * s, Math.abs(u) * s * (o.up ?? 1) + (o.lift || 0), Math.sin(a) * r * s], life: (o.life || 1) * (0.7 + Math.random() * 0.5) });
    }
  }
  // trail behind a moving ball. id = who, kind = TRAILS key
  trail(id, kind, p, v, r, grounded, dt, t) {
    const T = TRAIL_FX[kind]; if (!T) return;
    const sp = Math.hypot(v[0], v[1], v[2]); if (sp < 1.2 || (T.ground && !grounded)) return;
    let acc = (this.trailAcc.get(id) || 0) + sp * dt;
    while (acc > T.every) {
      acc -= T.every;
      const col = T.rainbow ? hsv3((t * 0.4) % 1) : rgb(T.cols[Math.floor(Math.random() * T.cols.length)]);
      const j = () => (Math.random() - 0.5) * r * 1.2;
      this.emit([p[0] + j(), p[1] - r * (T.ground ? 0.8 : 0.2) + j() * 0.5, p[2] + j()], { v: [-v[0] * 0.08 + j(), T.rise, -v[2] * 0.08 + j()], life: T.life, size: T.size * (0.7 + Math.random() * 0.6), col, shape: T.shape, grav: T.fall ? 0.6 : 0, drag: 1.2, shrink: T.shrink, wob: T.spin ? 1.5 : 0 });
    }
    this.trailAcc.set(id, acc);
  }
  // things floating in the air around the camera
  ambient(c, biome, night, dt, inCave, inStation) {
    this.amb += dt;
    let kind = null, rate = 0;
    if (biome === -2) { kind = 'bubble'; rate = 14; }
    else if (inCave) { kind = 'cave'; rate = 6; }
    else if (inStation) { kind = 'station'; rate = 10; }
    else if (biome === 5) { kind = 'snow'; rate = 40; }
    else if (biome === 8) { kind = 'glow'; rate = 16; }
    else if (biome === 18) { kind = Math.random() < 0.5 ? 'snow' : 'glow'; rate = 24; }
    else if (biome === 3 || biome === 16 || biome === 17) { kind = night > 0.4 ? 'fire' : 'leaf'; rate = night > 0.4 ? 10 : 6; }
    else if (biome === 7 || biome === 2) { kind = night > 0.4 ? 'fire' : (biome === 2 ? 'pollen' : 'leaf'); rate = night > 0.4 ? 10 : 4; }
    else if (biome === 4 || biome === 12 || biome === 13) { kind = 'sand'; rate = biome === 13 ? 16 : 10; }
    else if (biome === 11) { kind = 'ember'; rate = 14; }
    else if (biome === 1) { kind = 'pollen'; rate = 2; }
    else if (BIOMES[biome] && BIOMES[biome].amb) { kind = BIOMES[biome].amb; if (kind === 'fire' && night < 0.4 && biome !== 22) kind = 'leaf'; rate = kind === 'ash' || kind === 'snow' ? 26 : 10; }
    if (!kind) return;
    const n = Math.floor(this.amb * rate); this.amb -= n / rate;
    for (let k = 0; k < Math.min(n, 6); k++) {
      const a = Math.random() * 6.283, d = 3 + Math.random() * 22, p = [c[0] + Math.cos(a) * d, c[1] + (Math.random() - 0.3) * 8, c[2] + Math.sin(a) * d];
      if (kind === 'snow') this.emit([p[0], c[1] + 10 + Math.random() * 4, p[2]], { v: [0.4, -1.4, 0.2], life: 9, size: 0.09 + Math.random() * 0.07, col: [1, 1, 1], shape: 27, drag: 0, wob: 0.8 });
      else if (kind === 'glow') this.emit(p, { v: [0, 0.25, 0], life: 5, size: 0.08 + Math.random() * 0.08, col: Math.random() < 0.5 ? [0.75, 0.55, 1] : [0.4, 1, 0.9], shape: 20, drag: 0, wob: 0.6 });
      else if (kind === 'fire') this.emit([p[0], c[1] - 1 + Math.random() * 3, p[2]], { v: [0, 0.15, 0], life: 4, size: 0.07, col: [1, 0.9, 0.35], shape: 20, drag: 0, wob: 1.2 });
      else if (kind === 'leaf') this.emit([p[0], c[1] + 8 + Math.random() * 4, p[2]], { v: [0.6, -0.9, 0.3], life: 9, size: 0.13, col: rgb(['#6cc04a', '#9ad85a', '#e0a83a', '#d8763a'][k % 4]), shape: 8, drag: 0, wob: 1.8 });
      else if (kind === 'pollen') this.emit(p, { v: [0.3, 0.1, 0.2], life: 5, size: 0.05, col: [1, 1, 0.85], shape: 20, a: 0.6, drag: 0, wob: 0.8 });
      else if (kind === 'ember') { if (k % 3) this.emit([p[0], c[1] - 2 + Math.random() * 3, p[2]], { v: [0.3, 1.1 + Math.random(), 0.2], life: 4, size: 0.05 + Math.random() * 0.04, col: [1, 0.45 + Math.random() * 0.3, 0.1], shape: 20, drag: 0, wob: 1.4 }); else this.emit([p[0], c[1] + 2 + Math.random() * 4, p[2]], { v: [0.5, 0.3, 0.2], life: 7, size: 0.18 + Math.random() * 0.12, col: [0.3, 0.27, 0.27], shape: 0, a: 0.35, drag: 0, wob: 0.6 }); }
      else if (kind === 'ash') this.emit([p[0], c[1] + 8 + Math.random() * 4, p[2]], { v: [0.5, -0.9, 0.2], life: 9, size: 0.07 + Math.random() * 0.05, col: Math.random() < 0.15 ? [1, 0.5, 0.2] : [0.7, 0.68, 0.66], shape: 20, drag: 0, wob: 0.6 });
      else if (kind === 'sand') this.emit([p[0], c[1] - 1 + Math.random() * 2, p[2]], { v: [2.2, 0.1, 0.8], life: 3, size: 0.06, col: [0.95, 0.85, 0.6], shape: 0, a: 0.7, drag: 0 });
      else if (kind === 'bubble') this.emit([p[0], c[1] - 3, p[2]], { v: [0, 1.6, 0], life: 4, size: 0.08 + Math.random() * 0.08, col: [0.8, 0.95, 1], shape: 5, drag: 0, wob: 0.5, a: 0.8 });
      else if (kind === 'cave') this.emit(p, { v: [0, 0.1, 0], life: 6, size: 0.05, col: [0.4, 1, 0.9], shape: 20, drag: 0, wob: 0.5 });
      else if (kind === 'station') this.emit(p, { v: [0, 0.2, 0], life: 5, size: 0.06, col: [0.4, 1, 0.95], shape: 26, drag: 0, wob: 0.5 });
    }
  }
  update(dt) {
    const L = this.list; let j = 0;
    for (let i = 0; i < L.length; i++) {
      const q = L[i]; q.life += dt; if (q.life >= q.max) continue;
      const k = Math.exp(-q.drag * dt); q.v[0] *= k; q.v[2] *= k; q.v[1] = q.v[1] * k - q.grav * dt;
      q.p[0] += (q.v[0] + (q.wob ? Math.sin(q.life * 2.3 + q.ph) * q.wob : 0)) * dt; q.p[1] += q.v[1] * dt; q.p[2] += (q.v[2] + (q.wob ? Math.cos(q.life * 1.9 + q.ph) * q.wob : 0)) * dt;
      L[j++] = q;
    }
    L.length = j;
  }
  // fill the vertex data, returns how many particles to draw
  fill() {
    const D = this.data, L = this.list, n = Math.min(L.length, 1600); let o = 0;
    for (let i = 0; i < n; i++) {
      const q = L[i], t = q.life / q.max, fade = Math.min(1, t * 6) * (1 - t * t), s = q.size * (q.shrink ? 1 - t * 0.8 : 1 + q.grow * t);
      for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        D[o++] = q.p[0]; D[o++] = q.p[1]; D[o++] = q.p[2]; D[o++] = cx; D[o++] = cy; D[o++] = s;
        D[o++] = q.col[0]; D[o++] = q.col[1]; D[o++] = q.col[2]; D[o++] = q.a * fade; D[o++] = q.shape;
      }
    }
    return n;
  }
}
