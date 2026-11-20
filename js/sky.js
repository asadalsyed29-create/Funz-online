// Clouds and weather. The sky is split into big weather cells; each cell has its own weather
// (clear, fair, cloudy, overcast or stormy) and gets the kinds of clouds that go with it.
const CLOUD_CELL = 900;
const CLOUD_KINDS = {
  cumulus: 'Cumulus', congestus: 'Cumulus congestus', cb: 'Cumulonimbus', stratus: 'Stratus', strato: 'Stratocumulus',
  alto: 'Altocumulus', cirrus: 'Cirrus', nimbo: 'Nimbostratus', lens: 'Lenticular',
};
// 0 = clear ... 1 = stormy
function weatherAt(N, x, z) { const v = N.fbm(x / 2600 + 3.1, z / 2600 - 1.7, 950, 2); return Math.max(0, Math.min(1, (v - 0.5) * 2.1 + 0.46)); }
// the weather and the clouds slowly blow east, the same for every player (uses the real clock)
function windShift() { return ((Date.now() / 1000) % 2592000) * 3; }
const WEATHER_NAMES = w => w < 0.32 ? 'Clear' : w < 0.5 ? 'Fair' : w < 0.64 ? 'Cloudy' : w < 0.78 ? 'Overcast' : 'Stormy';

// Each kind of cloud is a cluster of soft see-through puffs: [x, y, z, radius, brightness 0..1, alpha].
// Brightness is low at the bottom of a cloud (grey) and high at the top (white).
function buildCloudModels(gl, N) {
  const out = {}, R = (k, s) => N.hash(k, s, 960);
  const make = fn => { const p = []; fn((x, y, z, r, b, a = 1) => p.push(x, y, z, r, Math.max(0, Math.min(1, b)), a)); return new Float32Array(p); };
  // a rounded heap: puffs fill a half-ellipsoid; lower ones are greyer
  const heap = (put, cx, cy, cz, W, H, D, n, seed, dark = 0) => {
    for (let k = 0; k < n; k++) {
      const u = R(k, seed) * 2 - 1, w = R(k, seed + 1) * 2 - 1, h = Math.pow(R(k, seed + 2), 0.8);
      const sx = u * Math.sqrt(1 - h * h * 0.6), sz = w * Math.sqrt(1 - h * h * 0.6);
      const r = (0.32 + R(k, seed + 3) * 0.22) * Math.min(W, H * 2.2, D) * (1 - h * 0.35);
      put(cx + sx * W * 0.75, cy + h * H, cz + sz * D * 0.75, r, 0.35 + h * 0.75 - dark, 0.85);
    }
    for (let k = 0; k < n * 0.4; k++) put(cx + (R(k, seed + 7) - 0.5) * W * 1.4, cy + R(k, seed + 8) * H * 0.15, cz + (R(k, seed + 9) - 0.5) * D * 1.2, Math.min(W, D) * 0.35, 0.3 - dark, 0.8); // flat grey bottom
  };
  out.cumulus = [0, 1, 2].map(v => make(put => { const W = 70 + R(v, 1) * 40; heap(put, 0, 0, 0, W, 45 + R(v, 2) * 20, W * 0.6, 30, v * 13); heap(put, W * 0.45, 0, 8, W * 0.45, 30, W * 0.35, 12, v * 13 + 5); }));
  out.congestus = [0, 1].map(v => make(put => { heap(put, 0, 0, 0, 70, 50, 50, 22, v * 7 + 40); heap(put, 5, 40, 0, 48, 60, 38, 22, v * 7 + 41); heap(put, -4, 95, 3, 32, 45, 28, 16, v * 7 + 42); }));
  out.cb = [0, 1].map(v => make(put => {
    heap(put, 0, 0, 0, 200, 90, 160, 50, v + 60, 0.35);           // dark rainy base
    heap(put, 0, 80, 0, 150, 160, 120, 45, v + 61, 0.1);          // the tower
    heap(put, 10, 230, 0, 120, 140, 100, 35, v + 62);
    for (let k = 0; k < 60; k++) { const a = R(k, v + 63) * 6.283, d = Math.sqrt(R(k, v + 64)), r = 70 + R(k, v + 65) * 50; put(60 + Math.cos(a) * d * 330, 400 + R(k, v + 66) * 25, Math.sin(a) * d * 200, r, 0.75 + R(k, 3) * 0.3, 0.9); } // the anvil
    for (let k = 0; k < 18; k++) { const a = R(k, v + 67) * 6.283, d = 0.4 + R(k, v + 68) * 0.5; put(60 + Math.cos(a) * d * 280, 370, Math.sin(a) * d * 170, 32, 0.45, 0.8); } // mammatus pouches
  }));
  // a sheet: wide and thin, made of big flat-ish puffs; see-through near the edges
  const sheet = (put, W, D, n, r, b0, b1, seed) => { for (let k = 0; k < n; k++) { const u = R(k, seed) * 2 - 1, w = R(k, seed + 1) * 2 - 1, e = Math.max(Math.abs(u), Math.abs(w)); put(u * W, (R(k, seed + 2) - 0.5) * r * 0.5, w * D, r * (0.7 + R(k, seed + 3) * 0.6), b0 + (b1 - b0) * R(k, seed + 4), e > 0.8 ? 0.45 : 0.85); } };
  out.stratus = [make(put => sheet(put, 400, 300, 70, 95, 0.55, 0.75, 70))];
  out.nimbo = [make(put => { sheet(put, 420, 320, 80, 100, 0.12, 0.35, 75); for (let k = 0; k < 20; k++) put((R(k, 76) - 0.5) * 700, -40, (R(k, 77) - 0.5) * 500, 70, 0.05, 0.75); })];
  out.strato = [0, 1].map(v => make(put => { for (let i = -4; i <= 4; i++) for (let j = -3; j <= 3; j++) { if (R(i * 9 + j, v + 80) < 0.2) continue; const x = i * 75 + (R(i, j + v) - 0.5) * 30, z = j * 80 + (R(j, i + v) - 0.5) * 30; put(x, 0, z, 48, 0.45, 0.85); put(x + 10, 18, z, 38, 0.85, 0.85); } }));
  out.alto = [0, 1].map(v => make(put => { for (let i = -6; i <= 6; i++) for (let j = -5; j <= 5; j++) { if (R(i * 13 + j, v + 90) < 0.3) continue; const x = i * 40 + (j % 2) * 18 + (R(i, j) - 0.5) * 16, z = j * 34 + (R(j, i) - 0.5) * 16, e = Math.max(Math.abs(i) / 6, Math.abs(j) / 5); put(x, 0, z, 26 + R(i, j + 3) * 8, 0.62, e > 0.75 ? 0.35 : 0.6); put(x + 6, 8, z, 18, 0.95, e > 0.75 ? 0.35 : 0.6); } }));
  // cirrus: long faint streaks made of rows of small puffs
  out.cirrus = [0, 1].map(v => make(put => { for (let k = 0; k < 8; k++) { const x0 = (R(k, v + 100) - 0.5) * 800, z0 = (R(k, v + 101) - 0.5) * 600, L = 220 + R(k, v + 102) * 260, a = 0.3 + (R(k, v + 103) - 0.5) * 0.4, bend = (R(k, v + 104) - 0.5) * 0.003; for (let q = 0; q < 46; q++) { const t = q / 45 - 0.5, x = x0 + Math.cos(a) * t * L, z = z0 + Math.sin(a) * t * L + t * t * L * L * bend; put(x, (R(q, k) - 0.5) * 6, z + (R(k, q) - 0.5) * 10, 20 * (1 - Math.abs(t) * 1.3) + 6, 1, 0.2); } } }));
  out.lens = [make(put => { for (let L = 0; L < 3; L++) for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283, d = Math.sqrt(R(k, L + 110)); put(Math.cos(a) * d * (220 - L * 50), L * 26, Math.sin(a) * d * (140 - L * 32), 45 - L * 6, 0.7 + L * 0.12, 0.85); } })];
  return out;
}
// put the puffs of all clouds near the camera into a particle buffer, far ones first
function fillClouds(out, list, eye, tint, flash, maxN) {
  const P = []; let n = 0;
  for (const cl of list) {
    const pf = cl.puffs, c = Math.cos(cl.rot), s = Math.sin(cl.rot), S = cl.s, dark = cl.kind === 'cb' || cl.kind === 'nimbo';
    for (let i = 0; i < pf.length; i += 6) {
      const lx = pf[i] * S, lz = pf[i + 2] * S, x = cl.x + lx * c - lz * s, y = cl.y + pf[i + 1] * S, z = cl.z + lx * s + lz * c;
      P.push([(x - eye[0]) ** 2 + (y - eye[1]) ** 2 + (z - eye[2]) ** 2, x, y, z, pf[i + 3] * S, pf[i + 4], pf[i + 5], dark && flash ? flash : 0]);
    }
  }
  // keep the nearest puffs when there are too many (so the clouds right above you never vanish), then draw far to near
  if (P.length > maxN) { P.sort((a, b) => a[0] - b[0]); P.length = maxN; }
  P.sort((a, b) => b[0] - a[0]);
  const top = tint.top, bot = tint.bot;
  for (const q of P) {
    if (n >= maxN) break;
    const b = q[5], f = q[7], o = n * 44;
    const r = (bot[0] + (top[0] - bot[0]) * b) + f, g = (bot[1] + (top[1] - bot[1]) * b) + f, bl = (bot[2] + (top[2] - bot[2]) * b) + f * 1.1;
    let k = 0; for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const j = o + k * 11; out[j] = q[1]; out[j + 1] = q[2]; out[j + 2] = q[3]; out[j + 3] = cx; out[j + 4] = cy; out[j + 5] = q[4]; out[j + 6] = r; out[j + 7] = g; out[j + 8] = bl; out[j + 9] = q[6]; out[j + 10] = 11; k++; }
    n++;
  }
  return n;
}

// the clouds of one weather cell
function cloudsInCell(N, T, i, j, force) {
  const cx = (i + 0.5) * CLOUD_CELL, cz = (j + 0.5) * CLOUD_CELL, w = force != null ? force : weatherAt(N, cx, cz), out = [];
  const R = k => N.hash(i * 31 + k, j * 17 - k, 970), at = (k, spread = 0.8) => [cx + (R(k) - 0.5) * CLOUD_CELL * spread, cz + (R(k + 50) - 0.5) * CLOUD_CELL * spread];
  const add = (kind, k, y, s, v) => { const [x, z] = at(k); out.push({ kind, v: v ?? Math.floor(R(k + 90) * 3), x, y, z, s, rot: R(k + 70) * 6.283, ph: R(k + 80) * 100, w }); };
  if (w < 0.32) { if (R(1) < 0.7) add('cumulus', 1, 330 + R(2) * 60, 0.7 + R(3) * 0.4); if (R(4) < 0.6) add('cirrus', 4, 1100 + R(5) * 100, 1 + R(6) * 0.5); }
  else if (w < 0.5) { const n = 2 + Math.floor(R(7) * 2); for (let k = 0; k < n; k++) add('cumulus', 10 + k * 3, 320 + R(11 + k) * 80, 0.8 + R(12 + k) * 0.6); if (R(20) < 0.6) add('alto', 20, 700 + R(21) * 100, 1 + R(22) * 0.5); if (R(23) < 0.5) add('cirrus', 23, 1150, 1.2); }
  else if (w < 0.64) { add('strato', 30, 300 + R(31) * 40, 1 + R(32) * 0.5); const n = 1 + Math.floor(R(33) * 2); for (let k = 0; k < n; k++) add('congestus', 34 + k * 3, 300 + R(35 + k) * 40, 0.9 + R(36 + k) * 0.6); add('cumulus', 40, 360, 1); }
  else if (w < 0.78) { add(w > 0.71 ? 'nimbo' : 'stratus', 50, w > 0.71 ? 240 : 280, 1 + R(51) * 0.4, 0); add('strato', 52, 380, 1.2); }
  else { add('cb', 60, 240, 1 + R(61) * 0.4); add('nimbo', 62, 250, 1.1, 0); if (R(63) < 0.5) add('congestus', 64, 300, 1.2); }
  const inf = T.info(cx, cz); if ((inf.b === 6 || inf.h > 90) && R(66) < 0.8) add('lens', 66, Math.max(450, inf.h + 200), 1 + R(67) * 0.5, 0);
  return out;
}
