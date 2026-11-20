// Surface textures, painted by code when the game starts (so nothing to download).
// Each layer is a tiling square: red = brightness detail (128 = no change), green = height (for bumps).
const TEX_LAYERS = ['grass', 'sand', 'snow', 'rock', 'bark', 'leaves', 'planks', 'bricks', 'metal', 'roof', 'plaster', 'dirt'];
function makeTextureLayers(S, only) {
  const out = new Uint8Array(S * S * 4 * (only == null ? TEX_LAYERS.length : 1));
  let seed = 1234567 + (only || 0) * 7919;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // tiling value noise: f cells across the tile
  const lat = new Float32Array(4096); for (let i = 0; i < 4096; i++) lat[i] = rnd();
  const nz = (u, v, f, o = 0) => {
    const x = u * f, y = v * f, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const L = (a, b) => lat[((((a % f) + f) % f) * 61 + (((b % f) + f) % f) * 17 + o * 131) & 4095];
    const a = L(xi, yi), b = L(xi + 1, yi), c = L(xi, yi + 1), d = L(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const fbm = (u, v, f, oct = 4, o = 0) => { let s = 0, a = 0.5, t = 0; for (let k = 0; k < oct; k++) { s += nz(u, v, f << k, o + k) * a; t += a; a *= 0.5; } return s / t; };
  const D = new Float32Array(S * S), Hh = new Float32Array(S * S);
  const put = (x, y, d, h, mode) => { x = ((x % S) + S) % S; y = ((y % S) + S) % S; const i = y * S + x; if (mode === 'max') { if (h > Hh[i]) { D[i] = d; Hh[i] = h; } } else { D[i] = d; Hh[i] = h; } };
  // a little stamp shape (leaf / blade) drawn with wrap-around
  const stamp = (cx, cy, ang, len, wid, d, h) => {
    const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.ceil(Math.max(len, wid)) + 1;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const u = (x * ca + y * sa) / len, v = (-x * sa + y * ca) / wid, q = u * u + v * v;
      if (q < 1) put(Math.round(cx + x), Math.round(cy + y), d * (0.8 + 0.2 * (1 - q)), h * (1 - q * 0.6) + 0.2, 'max');
    }
  };
  TEX_LAYERS.forEach((name, L) => {
    if (only != null && L !== only) return;
    D.fill(1); Hh.fill(0.5);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S, i = y * S + x; let d = 1, h = 0.5;
      if (name === 'grass') { const b = fbm(u, v, 8, 4, 1); d = 0.78 + b * 0.3; h = b * 0.4; }
      else if (name === 'sand') { const b = fbm(u, v, 16, 3, 2), r = Math.sin((v * 7 + fbm(u, v, 4, 2, 3) * 1.4) * Math.PI * 2); d = 0.92 + b * 0.12 + r * 0.025 + (rnd() - 0.5) * 0.1; h = 0.5 + r * 0.12 + b * 0.2; }
      else if (name === 'snow') { const b = fbm(u, v, 8, 4, 4); d = 0.93 + b * 0.1; h = b; if (rnd() > 0.996) d = 1.35; }
      else if (name === 'rock') { const w = fbm(u, v, 4, 3, 5), st = Math.sin((v * 6 + w * 1.1) * Math.PI * 2), f = fbm(u, v, 32, 3, 6), cr = Math.abs(fbm(u, v, 8, 3, 7) - 0.5);
        d = 0.82 + st * 0.08 + f * 0.25 - (cr < 0.025 ? 0.3 : 0); h = 0.45 + st * 0.15 + f * 0.3 - (cr < 0.025 ? 0.35 : 0); }
      else if (name === 'bark') { const w = fbm(u, v, 4, 3, 8), rid = 0.5 + 0.5 * Math.sin((u * 10 + w * 1.6) * Math.PI * 2), fine = 0.5 + 0.5 * Math.sin((u * 37 + w * 3) * Math.PI * 2), n = fbm(u, v, 16, 2, 9);
        d = 0.78 + rid * 0.24 + fine * 0.06 + n * 0.1; h = rid * 0.8 + n * 0.2; if (rid < 0.16) { d *= 0.72; h = 0.05; } }
      else if (name === 'leaves') { d = 0.68 + fbm(u, v, 8, 3, 11) * 0.15; h = 0.1; }
      else if (name === 'planks') { const row = Math.floor(v * 4), off = lat[row * 7 & 4095], g = Math.sin((v * 44 + fbm(u + off, v, 4, 3, 12) * 4) * Math.PI * 2) * 0.5 + 0.5, pv = (v * 4) % 1;
        const seam = Math.abs(((u + off * 3) * 2) % 1) < 0.012; d = 0.86 + (lat[row * 13 & 4095] - 0.5) * 0.2 + g * 0.1 + fbm(u, v, 16, 2, 13) * 0.08; h = 0.6 + g * 0.1;
        if (pv < 0.035 || pv > 0.965 || seam) { d = 0.42; h = 0.0; } }
      else if (name === 'bricks') { const row = Math.floor(v * 8), bu = (u * 4 + (row % 2) * 0.5) % 1, bv = (v * 8) % 1, bi = Math.floor(u * 4 + (row % 2) * 0.5);
        const mortar = bv < 0.08 || bu < 0.04; const n = fbm(u, v, 16, 3, 14);
        d = mortar ? 1.12 + n * 0.08 : 0.82 + lat[(row * 31 + bi * 7) & 4095] * 0.22 + n * 0.12; h = mortar ? 0.1 : 0.7 + n * 0.2; }
      else if (name === 'metal') { const pu = (u * 2) % 1, pv = (v * 2) % 1, seam = pu < 0.012 || pv < 0.012, n = fbm(u, v, 8, 3, 15);
        const riv = [[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94], [0.5, 0.06], [0.5, 0.94]].some(([a, b]) => Math.hypot(pu - a, pv - b) < 0.022);
        const scr = Math.abs(Math.sin((u * 3 + v * 9 + n) * 20)) > 0.995; d = 0.88 + n * 0.16 + (scr ? 0.15 : 0) + (lat[(Math.floor(u * 2) * 3 + Math.floor(v * 2) * 5) & 4095] - 0.5) * 0.1; h = 0.6;
        if (seam) { d = 0.45; h = 0; } if (riv) { d = 1.25; h = 1; } }
      else if (name === 'roof') { const row = Math.floor(v * 8), tu = (u * 8 + (row % 2) * 0.5) % 1, tv = (v * 8) % 1, n = fbm(u, v, 16, 2, 16);
        d = 0.7 + tv * 0.35 + n * 0.1 + (lat[(row * 17 + Math.floor(u * 8 + (row % 2) * 0.5) * 3) & 4095] - 0.5) * 0.12; h = tv; if (tu < 0.05) { d *= 0.75; h *= 0.5; } }
      else if (name === 'plaster') { const n = fbm(u, v, 16, 4, 17); d = 0.92 + n * 0.12; h = n; }
      else if (name === 'dirt') { const n = fbm(u, v, 16, 4, 18); d = 0.8 + n * 0.3; h = n; }
      D[i] = d; Hh[i] = h;
    }
    // stamped details
    if (name === 'grass') for (let k = 0; k < S * 5; k++) { const sh = 0.75 + rnd() * 0.6; stamp(rnd() * S, rnd() * S, rnd() * Math.PI, S * (0.012 + rnd() * 0.02), S * 0.0045 + 0.6, sh, 0.5 + sh * 0.4); }
    if (name === 'leaves') for (let k = 0; k < S * 2.2; k++) { const sh = 0.75 + rnd() * 0.6; stamp(rnd() * S, rnd() * S, rnd() * Math.PI, S * (0.028 + rnd() * 0.022), S * (0.013 + rnd() * 0.008), sh, 0.4 + rnd() * 0.6); }
    if (name === 'dirt') for (let k = 0; k < S * 0.6; k++) { const sh = 0.8 + rnd() * 0.5; stamp(rnd() * S, rnd() * S, rnd() * 3, S * (0.006 + rnd() * 0.01), S * (0.005 + rnd() * 0.008), sh, 0.9); }
    const base = (only == null ? L : 0) * S * S * 4, k = S / 64;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, gx = (Hh[y * S + (x + 1) % S] - Hh[y * S + (x + S - 1) % S]) * k, gy = (Hh[((y + 1) % S) * S + x] - Hh[((y + S - 1) % S) * S + x]) * k;
      out[base + i * 4] = Math.max(0, Math.min(255, D[i] * 128)); out[base + i * 4 + 1] = Math.max(0, Math.min(255, Hh[i] * 255));
      out[base + i * 4 + 2] = Math.max(0, Math.min(255, 128 + gx * 127)); out[base + i * 4 + 3] = Math.max(0, Math.min(255, 128 + gy * 127));
    }
  });
  return out;
}
