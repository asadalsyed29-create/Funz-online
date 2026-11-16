// Music and sound effects, all made in the browser (no sound files).
// The music is written as it plays: chords, a bass line and a tune that changes
// with where you are (grassland, forest, beach, desert, snow, caves, the station, night...).
const MOODS = {
  meadow:  { bpm: 96, root: 60, scale: [0, 2, 4, 7, 9], prog: [0, 3, 4, 2], lead: 'pluck', pad: 0.5, bass: 1, perc: 0.5, dens: 0.55, bell: 0.2 },
  plaza:   { bpm: 100, root: 62, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 4, 5, 3], lead: 'marimba', pad: 0.5, bass: 1, perc: 0.6, dens: 0.6, bell: 0.15 },
  forest:  { bpm: 82, root: 57, scale: [0, 2, 3, 5, 7, 9, 10], prog: [0, 6, 3, 0], lead: 'flute', pad: 0.7, bass: 0.8, perc: 0.2, dens: 0.4, bell: 0.1 },
  beach:   { bpm: 88, root: 65, scale: [0, 2, 4, 6, 7, 9, 11], prog: [0, 1, 4, 0], lead: 'marimba', pad: 0.6, bass: 1, perc: 0.45, dens: 0.45, bell: 0 },
  desert:  { bpm: 86, root: 62, scale: [0, 1, 4, 5, 7, 8, 10], prog: [0, 1, 0, 6], lead: 'pluck', pad: 0.5, bass: 1, perc: 0.55, dens: 0.5, bell: 0 },
  snow:    { bpm: 70, root: 64, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 2, 6], lead: 'bell', pad: 0.8, bass: 0.5, perc: 0, dens: 0.3, bell: 0.4 },
  mountain:{ bpm: 76, root: 55, scale: [0, 2, 4, 7, 9], prog: [0, 3, 1, 4], lead: 'flute', pad: 0.8, bass: 0.7, perc: 0.1, dens: 0.35, bell: 0.2 },
  swamp:   { bpm: 72, root: 53, scale: [0, 3, 5, 6, 7, 10], prog: [0, 0, 3, 1], lead: 'marimba', pad: 0.6, bass: 1, perc: 0.3, dens: 0.3, bell: 0 },
  glow:    { bpm: 78, root: 61, scale: [0, 2, 4, 6, 8, 10], prog: [0, 1, 0, 2], lead: 'bell', pad: 0.9, bass: 0.6, perc: 0, dens: 0.45, bell: 0.5 },
  ocean:   { bpm: 74, root: 62, scale: [0, 2, 4, 7, 9], prog: [0, 3, 0, 4], lead: 'flute', pad: 0.9, bass: 0.6, perc: 0, dens: 0.25, bell: 0.3 },
  cave:    { bpm: 64, root: 50, scale: [0, 2, 3, 7, 8], prog: [0, 0, 3, 4], lead: 'bell', pad: 0.9, bass: 0.8, perc: 0, dens: 0.2, bell: 0, drip: 1 },
  station: { bpm: 104, root: 57, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 4], lead: 'synth', pad: 0.8, bass: 1, perc: 0.6, dens: 0.6, bell: 0.2, arp: 1 },
  sky:     { bpm: 90, root: 67, scale: [0, 2, 4, 7, 9], prog: [0, 3, 1, 4], lead: 'bell', pad: 0.9, bass: 0.6, perc: 0.2, dens: 0.5, bell: 0.4, arp: 1 },
  volcano: { bpm: 92, root: 52, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 5, 0], lead: 'synth', pad: 0.7, bass: 1, perc: 0.7, dens: 0.45, bell: 0 },
  night:   { bpm: 66, root: 60, scale: [0, 2, 4, 7, 9], prog: [0, 5, 3, 4], lead: 'bell', pad: 0.8, bass: 0.5, perc: 0, dens: 0.25, bell: 0.3 },
};

const Sound = {
  ctx: null, on: true, music: 0.6, sfx: 0.8, mood: 'meadow', want: 'meadow', bar: 0, step: 0, next: 0, timer: null,
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    try { this.on = localStorage.getItem('funz.music') !== 'off'; } catch (e) {}
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
    this.mus = c.createGain(); this.mus.gain.value = this.on ? this.music * 0.5 : 0; this.mus.connect(this.master);
    this.fx = c.createGain(); this.fx.gain.value = this.sfx * 0.5; this.fx.connect(this.master);
    // a soft echoey room for the music
    this.rev = c.createConvolver(); this.rev.buffer = this.impulse(2.6); const rg = c.createGain(); rg.gain.value = 0.38; this.rev.connect(rg); rg.connect(this.mus);
    this.dry = c.createGain(); this.dry.gain.value = 0.8; this.dry.connect(this.mus);
    this.send = c.createGain(); this.send.gain.value = 1; this.send.connect(this.rev);
    this.bus = c.createGain(); this.bus.connect(this.dry); this.bus.connect(this.send);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.next = c.currentTime + 0.2; this.timer = setInterval(() => this.tick(), 60);
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend(); else this.ctx.resume(); });
  },
  impulse(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    return b;
  },
  setMusic(on) { this.on = on; try { localStorage.setItem('funz.music', on ? 'on' : 'off'); } catch (e) {} if (this.mus) this.mus.gain.setTargetAtTime(on ? this.music * 0.5 : 0, this.ctx.currentTime, 0.4); },
  setMood(m) { if (MOODS[m]) this.want = m; },
  // gentle rain noise that fades in and out
  setRain(k) {
    const c = this.ctx; if (!c) return;
    if (!this.rainG) { const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.4; this.rainG = c.createGain(); this.rainG.gain.value = 0; s.connect(f); f.connect(this.rainG); this.rainG.connect(this.fx); s.start(); }
    this.rainG.gain.setTargetAtTime(k * 0.22, c.currentTime, 0.8);
  },
  // a seeded random so a tune repeats like a real song
  rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; },
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  note(M, deg, oct = 0) { const n = M.scale.length, o = Math.floor(deg / n), d = ((deg % n) + n) % n; return M.root + M.scale[d] + 12 * (o + oct); },
  tick() {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    while (this.next < c.currentTime + 0.25) { this.play16(this.next); const M = MOODS[this.mood]; this.next += 60 / M.bpm / 4; }
  },
  play16(t) {
    if (this.step === 0 && this.bar % 2 === 0 && this.want !== this.mood) { this.mood = this.want; this.bar = 0; this.fade(t); }
    const M = MOODS[this.mood], s = this.step, beat = 60 / M.bpm, sx = beat / 4;
    const chord = M.prog[Math.floor(this.bar / 2) % M.prog.length];
    if (this.on) {
      // pad chord at the start of every two bars
      if (s === 0 && this.bar % 2 === 0 && M.pad) for (const k of [0, 2, 4]) this.voice('pad', this.hz(this.note(M, chord + k, 0)), t, beat * 8, 0.05 * M.pad);
      // bass
      if (M.bass && (s === 0 || (s === 8 && M.perc > 0.3) || (s === 10 && M.bpm > 90))) this.voice('bass', this.hz(this.note(M, chord, -1)), t, beat * (s === 0 ? 1.6 : 0.8), 0.16 * M.bass);
      // the tune: four-bar phrases that come back (A A B A)
      const phrase = [0, 0, 1, 0][Math.floor(this.bar / 2) % 4], r = this.rng(9973 * (phrase + 1) + 31 * (this.bar % 2) + s * 7 + this.mood.length * 1013 + 5);
      const strong = s % 4 === 0, play = r() < M.dens * (strong ? 1.25 : 0.55);
      if (play) { const deg = chord + Math.floor(r() * (strong ? 3 : 5)) * (strong ? 2 : 1); this.voice(M.lead, this.hz(this.note(M, deg, 1)), t, sx * (strong ? 3 : 2), 0.11); }
      if (M.arp && s % 2 === 0) this.voice('pluck', this.hz(this.note(M, chord + [0, 2, 4, 7][(s / 2) % 4], 1)), t, sx * 1.5, 0.035);
      if (M.bell && s === 12 && this.rng(this.bar * 77 + 3)() < M.bell) this.voice('bell', this.hz(this.note(M, chord + 4, 2)), t, beat * 3, 0.05);
      if (M.perc) { if (s % 2 === 0) this.noise(t, 0.03, 0.025 * M.perc * (s % 4 === 2 ? 1.6 : 1), 7000); if (s === 0 && M.perc > 0.4) this.kick(t, 0.25 * M.perc); }
      if (M.drip && s === 6 && Math.random() < 0.5) this.drip(t);
    }
    this.step = (s + 1) % 16; if (this.step === 0) this.bar++;
  },
  fade(t) { const g = this.bus.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t); g.exponentialRampToValueAtTime(1, t + 1.5); },
  env(g, t, a, peak, dur, rel = 0.3) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur), rel); },
  osc(type, f, t, end, dest, detune = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(dest); o.start(t); o.stop(end); return o; },
  voice(kind, f, t, dur, vol, dest) {
    const c = this.ctx, g = c.createGain(); g.connect(dest || this.bus);
    if (kind === 'pad') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(g); this.osc('sawtooth', f, t, t + dur + 2, lp, -8); this.osc('sawtooth', f, t, t + dur + 2, lp, 8); this.osc('triangle', f / 2, t, t + dur + 2, lp); this.env(g, t, 0.8, vol, dur, 0.6); }
    else if (kind === 'bass') { this.osc('sine', f, t, t + dur + 1, g); this.osc('triangle', f, t, t + dur + 1, g); this.env(g, t, 0.01, vol, dur * 0.5, 0.15); }
    else if (kind === 'pluck') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3500, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.4); lp.connect(g); this.osc('triangle', f, t, t + dur + 1, lp); this.osc('square', f, t, t + dur + 1, lp).detune.value = 3; g.gain.value = 0; this.env(g, t, 0.005, vol * 0.8, 0.01, dur * 0.35); }
    else if (kind === 'marimba') { this.osc('sine', f, t, t + 1.2, g); const g2 = c.createGain(); g2.gain.value = 0.25; g2.connect(g); this.osc('sine', f * 4, t, t + 0.3, g2); this.env(g, t, 0.004, vol, 0.01, 0.22); }
    else if (kind === 'bell') { this.osc('sine', f, t, t + 3, g); const g2 = c.createGain(); g2.gain.value = 0.35; g2.connect(g); this.osc('sine', f * 2.76, t, t + 2, g2); const g3 = c.createGain(); g3.gain.value = 0.12; g3.connect(g); this.osc('sine', f * 5.4, t, t + 1, g3); this.env(g, t, 0.004, vol, 0.01, 0.7); }
    else if (kind === 'flute') { const o = this.osc('sine', f, t, t + dur + 1, g); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.2; lg.gain.value = f * 0.006; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 1); this.osc('triangle', f * 2, t, t + dur + 1, g).detune.value = 4; this.env(g, t, 0.07, vol * 0.8, dur, 0.18); }
    else if (kind === 'synth') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(600, t + 0.3); lp.connect(g); this.osc('square', f, t, t + dur + 1, lp); this.osc('sawtooth', f, t, t + dur + 1, lp, 9); this.env(g, t, 0.01, vol * 0.6, dur * 0.5, 0.15); }
  },
  noise(t, dur, vol, hp = 3000, dest) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const g = c.createGain(); s.connect(f); f.connect(g); g.connect(dest || this.bus); this.env(g, t, 0.003, vol, 0.005, dur); s.start(t, Math.random() * 0.5); s.stop(t + dur * 5 + 0.1); },
  kick(t, vol, dest) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15); o.connect(g); g.connect(dest || this.bus); this.env(g, t, 0.003, vol, 0.01, 0.1); o.start(t); o.stop(t + 0.6); },
  drip(t) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1500 + Math.random() * 800, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.08); o.connect(g); g.connect(this.bus); this.env(g, t, 0.002, 0.06, 0.01, 0.06); o.start(t); o.stop(t + 0.4); },
  // ---------- sound effects ----------
  play(name) {
    const c = this.ctx; if (!c || c.state !== 'running') return; const t = c.currentTime + 0.01, D = this.fx;
    const tone = (type, f0, f1, dur, vol, at = 0) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + at); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + at + dur); o.connect(g); g.connect(D); this.env(g, t + at, 0.005, vol, 0.01, dur * 0.5); o.start(t + at); o.stop(t + at + dur * 3 + 0.2); };
    switch (name) {
      case 'jump': tone('sine', 300, 620, 0.12, 0.18); break;
      case 'land': tone('sine', 160, 90, 0.08, 0.12); break;
      case 'pickup': [0, 4, 7].forEach((n, i) => tone('triangle', this.hz(84 + n), 0, 0.12, 0.13, i * 0.06)); break;
      case 'coin': tone('square', 988, 0, 0.06, 0.07); tone('square', 1319, 0, 0.2, 0.07, 0.07); break;
      case 'chest': [0, 4, 7, 12, 16].forEach((n, i) => tone('triangle', this.hz(72 + n), 0, 0.2, 0.14, i * 0.08)); break;
      case 'quest': [0, 4, 7, 12].forEach((n, i) => { tone('triangle', this.hz(72 + n), 0, 0.3, 0.15, i * 0.12); tone('sine', this.hz(60 + n), 0, 0.3, 0.08, i * 0.12); }); tone('triangle', this.hz(91), 0, 0.8, 0.12, 0.5); break;
      case 'discover': [0, 7, 12, 19].forEach((n, i) => tone('sine', this.hz(67 + n), 0, 0.5, 0.12, i * 0.1)); break;
      case 'boost': tone('sawtooth', 200, 900, 0.3, 0.07); this.noise(t, 0.2, 0.06, 1500, D); break;
      case 'boom': this.kick(t, 0.6, D); this.noise(t, 0.35, 0.25, 300, D); tone('sine', 90, 40, 0.4, 0.3); break;
      case 'splash': this.noise(t, 0.25, 0.12, 800, D); break;
      case 'tp': tone('sine', 400, 1600, 0.35, 0.12); tone('sine', 600, 2400, 0.35, 0.06, 0.05); break;
      case 'click': tone('square', 1200, 0, 0.02, 0.04); break;
      case 'place': tone('triangle', 220, 160, 0.06, 0.12); this.noise(t, 0.04, 0.05, 2000, D); break;
      case 'break': this.noise(t, 0.1, 0.12, 900, D); tone('square', 180, 90, 0.08, 0.05); break;
      case 'wind': this.noise(t, 0.8, 0.06, 500, D); break;
      case 'thunder': { const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(120, t + 2.5); const g = c.createGain(); s.connect(f); f.connect(g); g.connect(D); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.05); g.gain.exponentialRampToValueAtTime(0.25, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 3); s.loop = true; s.start(t); s.stop(t + 3.2); break; }
    }
  },
};
