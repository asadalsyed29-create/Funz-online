// Models for hats, items and creatures. They are smooth cartoon shapes drawn with soft
// cartoon shading and a thin dark outline. Hats sit on top of a ball of radius 0.45
// with its middle at 0,0,0 and face +x. Creatures face +x too.

const ITEMS = {
  shell: { name: 'Shell', color: '#ffb3a7', use: 'Speed boost for 20 seconds', time: 20, eff: 'fast' },
  mushroom: { name: 'Mushroom', color: '#e0543c', use: 'Grow big for 20 seconds', time: 20, eff: 'big' },
  feather: { name: 'Feather', color: '#f4f1e8', use: 'Super jump for 20 seconds', time: 20, eff: 'superJump' },
  crystal: { name: 'Crystal', color: '#7fe0ff', use: 'Glow in the dark for 90 seconds', time: 90, eff: 'glow' },
  gem: { name: 'Gem', color: '#ff6ad5', use: 'Shiny! Found in caves and pyramids' },
  relic: { name: 'Relic', color: '#d8b46a', use: 'An old thing from long ago' },
  star: { name: 'Station star', color: '#c8fbff', use: 'From the top of the abandoned station!' },
  coin: { name: 'Coin', color: '#ffcf4a', use: 'Gives you 5 coins to spend in the wardrobe' },
  trophy: { name: 'Parkour trophy', color: '#ffc45a', use: 'You beat the parkour climb!' },
  cloud: { name: 'Cloud puff', color: '#f2f6ff', use: 'Float down slowly for 30 seconds', time: 30, eff: 'float' },
  pepper: { name: 'Fire pepper', color: '#ff4a2a', use: 'Super speed for 15 seconds', time: 15, eff: 'fast' },
  fossil: { name: 'Fossil', color: '#e8dcc0', use: 'A very very old bone' },
  pearl: { name: 'Pearl', color: '#f6f0ff', use: 'A shiny pearl from the sea' },
  key: { name: 'Sky key', color: '#ffd24a', use: 'Found on the sky islands!' },
};

// a few helpers on top of the mesh builder
const MB = {
  // a dome (half ball) sitting at height y0
  dome(mb, r, y0, h, col, seg = 20, grad = 0.15, ry = 10) {
    const p = []; for (let k = 0; k <= ry; k++) { const t = k / ry * Math.PI / 2; p.push([Math.cos(t) * r, y0 + Math.sin(t) * h]); }
    p[p.length - 1][0] = 0; mb.lathe(p, seg, col, grad);
  },
  // a smooth tube along a list of points
  tube(mb, pts, r, seg, col) { for (let k = 0; k < pts.length - 1; k++) mb.caps(pts[k], pts[k + 1], typeof r === 'function' ? r(k / (pts.length - 1)) : r, typeof r === 'function' ? r((k + 1) / (pts.length - 1)) : r, seg, col); },
  // cute eyes: white, a dark pupil and a tiny shine. at = middle between the eyes, s = spread, f = facing (+x)
  eyes(mb, x, y, z, s, size = 0.06) {
    for (const k of [-1, 1]) {
      mb.sph([x, y, z + k * s], [size * 0.7, size, size], 8, hex('#ffffff'), 0);
      mb.sph([x + size * 0.45, y, z + k * s], [size * 0.42, size * 0.68, size * 0.62], 8, hex('#1a1a26'), 0);
      mb.sph([x + size * 0.78, y + size * 0.3, z + k * s - size * 0.15], size * 0.17, 5, [1, 1, 1, 0.9], 0);
    }
  },
  cheeks(mb, x, y, z, s, col = '#ff8fa8') { for (const k of [-1, 1]) mb.sph([x, y, z + k * s], [0.012, 0.035, 0.05], 6, hex(col), 0); },
};

// ---------- hats ----------
function hatModel(gl, hat) {
  const mb = new MeshBuilder(), C = hex, G = c => glowC(hex(c));
  const stripes = (a, b, n) => (t) => (Math.floor(t * n) % 2 ? C(a) : C(b));
  switch (hat) {
    case 'cap': {
      MB.dome(mb, 0.33, 0.3, 0.27, (t) => t < 0.12 ? C('#e8eef7') : C('#3f7fe0'));
      mb.sph([0.27, 0.33, 0], [0.22, 0.035, 0.25], 14, C('#2e64c0'), 0.1);
      mb.sph([0, 0.575, 0], 0.045, 8, C('#e8eef7'));
      break;
    }
    case 'beanie': {
      mb.lathe([[0.335, 0.27], [0.355, 0.31], [0.355, 0.39], [0.34, 0.42], [0.32, 0.47], [0.27, 0.56], [0.19, 0.63], [0.09, 0.67], [0, 0.68]], 22, (t, ph, k) => k < 4 ? (Math.floor(ph * 9.5 / Math.PI) % 2 ? C('#f1f4fa') : C('#dfe5ef')) : C('#e05561'), 0.1);
      mb.sph([0, 0.74, 0], 0.1, 10, C('#ffffff'), 0.15);
      break;
    }
    case 'tophat': {
      mb.lathe([[0, 0.36], [0.4, 0.36], [0.43, 0.385], [0.4, 0.405], [0.25, 0.41], [0.235, 0.47], [0.23, 0.82], [0.25, 0.85], [0, 0.86]], 24, (t, ph, k) => k === 5 ? C('#c0443a') : C('#232633'), 0.05);
      break;
    }
    case 'flower': {
      mb.push([0.08, 0.41, 0.2], M4.rotX(-0.5));
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; mb.sph([Math.cos(a) * 0.1, 0.02, Math.sin(a) * 0.1], [0.075, 0.03, 0.055], 10, C(k % 2 ? '#ff8fbf' : '#ffa3cd'), 0.1); }
      mb.sph([0, 0.045, 0], [0.06, 0.045, 0.06], 10, C('#ffd84a'), 0.1);
      mb.pop();
      mb.sph([0.03, 0.42, 0.33], [0.06, 0.02, 0.035], 8, C('#4caa52'));
      break;
    }
    case 'bow': {
      for (const s of [-1, 1]) { mb.push([0, 0.47, s * 0.13], M4.rotX(s * 0.35)); mb.sph([0, 0, 0], [0.07, 0.12, 0.13], 12, C('#ff5fa2'), 0.15); mb.pop(); }
      mb.sph([0, 0.47, 0], 0.065, 10, C('#e8418a'));
      break;
    }
    case 'headphones': {
      const band = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI; band.push([0, 0.05 + Math.sin(a) * 0.47, -Math.cos(a) * 0.45]); }
      MB.tube(mb, band, 0.038, 8, C('#2b2f3d'));
      for (const s of [-1, 1]) {
        mb.push([0, 0.02, s * 0.44], M4.rotX(s * Math.PI / 2));
        mb.lathe([[0, -0.07], [0.13, -0.07], [0.15, -0.03], [0.15, 0.04], [0.13, 0.07], [0, 0.07]], 18, C('#2b2f3d'), 0.1);
        mb.pop();
        mb.sph([0, 0.02, s * 0.53], [0.1, 0.1, 0.025], 14, G('#5ff0e0'), 0);
      }
      break;
    }
    case 'party': {
      mb.lathe([[0.22, 0.36], [0.2, 0.42], [0.15, 0.55], [0.1, 0.68], [0.05, 0.8], [0, 0.88]], 20, (t, ph) => Math.floor(t * 5 + ph / 6.283 * 2) % 2 ? C('#ffd24a') : C('#b56cff'), 0.1);
      mb.tor([0, 0.36, 0], 0.21, 0.03, 18, 6, C('#ff6fae'));
      mb.sph([0, 0.92, 0], 0.07, 10, C('#ff6fae'));
      break;
    }
    case 'chef': {
      mb.lathe([[0.3, 0.32], [0.31, 0.36], [0.31, 0.47], [0, 0.47]], 22, C('#f4f6fb'), 0.1);
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; mb.sph([Math.cos(a) * 0.2, 0.58, Math.sin(a) * 0.2], 0.15, 10, C('#ffffff'), 0.2); }
      mb.sph([0, 0.66, 0], 0.2, 12, C('#ffffff'), 0.2);
      break;
    }
    case 'cat': {
      for (const s of [-1, 1]) {
        mb.push([-0.02, 0.33, s * 0.2], M4.rotX(s * 0.3));
        mb.lathe([[0, 0], [0.12, 0], [0.08, 0.1], [0.03, 0.2], [0, 0.24]], 4, C('#3b3542'), 0);
        mb.push([0.035, 0.0, 0], null, [0.65, 0.8, 0.65]); mb.lathe([[0, 0], [0.12, 0], [0.08, 0.1], [0.03, 0.2], [0, 0.24]], 4, C('#ff9bb5'), 0); mb.pop();
        mb.pop();
      }
      break;
    }
    case 'propeller': {
      MB.dome(mb, 0.33, 0.3, 0.27, (t, ph) => Math.floor(ph / 6.283 * 4) % 2 ? C('#ff5a5a') : C('#ffd24a'));
      mb.sph([0.27, 0.33, 0], [0.2, 0.03, 0.24], 12, C('#4a8ae8'), 0.1);
      mb.caps([0, 0.56, 0], [0, 0.66, 0], 0.02, 0.02, 6, C('#c8ccd4'));
      mb.push([0, 0.68, 0], M4.rotY(0.4)); for (const s of [-1, 1]) mb.sph([0, 0, s * 0.17], [0.05, 0.015, 0.16], 10, C('#5aa9ff'), 0); mb.pop();
      mb.sph([0, 0.68, 0], 0.035, 8, C('#ff5a5a'));
      break;
    }
    case 'halo': mb.tor([0, 0.66, 0], 0.24, 0.035, 26, 8, G('#fff2a8')); break;
    case 'wizard': {
      mb.lathe([[0.42, 0.34], [0.43, 0.36], [0.3, 0.38], [0.24, 0.42], [0.2, 0.52], [0.15, 0.65], [0.1, 0.78], [0.06, 0.88], [0.02, 0.96], [0, 0.98]], 22, (t, ph, k) => k === 3 ? C('#ffd24a') : C('#5b3cc4'), 0.1);
      for (let k = 0; k < 5; k++) { const a = k * 2.4, y = 0.5 + k * 0.08, r = 0.205 - k * 0.032; mb.sph([Math.cos(a) * r, y, Math.sin(a) * r], 0.025, 6, G('#fff2a8'), 0); }
      break;
    }
    case 'unicorn': {
      mb.push([0.15, 0.4, 0], M4.rotZ(-0.35));
      mb.lathe([[0.08, 0], [0.07, 0.1], [0.05, 0.2], [0.03, 0.3], [0.012, 0.38], [0, 0.4]], 14, (t, ph) => (Math.floor(t * 8 + ph / 6.283) % 2) ? C('#ffe9a8') : C('#ffb3e6'), 0);
      mb.pop();
      for (let k = 0; k < 5; k++) mb.sph([-0.1 - k * 0.07, 0.42 - k * 0.04, 0], 0.07, 8, C(['#ff8fd0', '#b48cff', '#5aa9ff', '#7be36b', '#ffd24a'][k]), 0.1);
      break;
    }
    case 'sprout': {
      MB.tube(mb, [[0, 0.43, 0], [0.01, 0.55, 0], [0.03, 0.64, 0]], 0.022, 6, C('#5aa84a'));
      for (const s of [-1, 1]) { mb.push([0.03, 0.66, s * 0.09], M4.rotX(s * 0.6)); mb.sph([0, 0, 0], [0.05, 0.02, 0.1], 10, C('#7bd85a'), 0.2); mb.pop(); }
      break;
    }
    case 'bucket': {
      mb.lathe([[0.3, 0.33], [0.45, 0.25], [0.48, 0.27], [0.32, 0.36], [0.29, 0.44], [0.27, 0.53], [0.21, 0.61], [0, 0.62]], 24, (t, ph, k) => k === 3 ? C('#4a5a2e') : C('#7d8c4c'), 0.1);
      mb.caps([0.05, 0.47, 0.29], [0.2, 0.42, 0.25], 0.012, 0.012, 5, C('#c8ccd8')); mb.sph([0.22, 0.42, 0.25], [0.05, 0.025, 0.025], 8, C('#ff7a2a'), 0.1);
      break;
    }
    case 'helmet': {
      MB.dome(mb, 0.49, 0.02, 0.5, (t, ph) => Math.abs(Math.sin(ph)) < 0.13 ? C('#ffd24a') : C('#e8343a'));
      mb.sph([0.33, 0.17, 0], [0.16, 0.13, 0.3], 14, C('#1a2a4a'), 0.05); mb.sph([0.36, 0.2, 0.08], [0.06, 0.03, 0.08], 8, C('#8ab8e8'), 0);
      mb.sph([-0.08, 0.52, 0], [0.18, 0.03, 0.06], 8, C('#2a2e3a'), 0.1);
      break;
    }
    case 'headband': {
      mb.tor([0, 0.27, 0], 0.37, 0.055, 26, 8, (a) => Math.floor(a / 6.283 * 26) % 6 < 1 ? C('#ffffff') : C('#e8343a'));
      for (const s of [-1, 1]) mb.caps([-0.38, 0.27, s * 0.03], [-0.52, 0.12, s * 0.12], 0.04, 0.03, 6, C('#e8343a'));
      break;
    }
    case 'cowboy': {
      mb.lathe([[0, 0.36], [0.36, 0.35], [0.5, 0.42], [0.52, 0.45], [0.48, 0.42], [0.36, 0.39], [0.26, 0.39], [0.25, 0.48], [0.23, 0.6], [0.14, 0.64], [0, 0.6]], 24, (t, ph, k) => k === 7 ? C('#5a3a22') : C('#b07a44'), 0.1);
      break;
    }
    case 'winter': {
      MB.dome(mb, 0.34, 0.27, 0.32, (t, ph) => (Math.floor(t * 6) % 2 ? C('#3c8ee0') : C('#f4f6fb')));
      for (const s of [-1, 1]) mb.sph([0, 0.18, s * 0.34], [0.13, 0.15, 0.04], 10, C('#3c8ee0'), 0.1);
      mb.sph([0, 0.64, 0], 0.09, 10, C('#f4f6fb'));
      break;
    }
    case 'viking': {
      MB.dome(mb, 0.35, 0.26, 0.3, (t) => t < 0.15 ? C('#a87a3a') : C('#aeb6c4'));
      mb.caps([0.3, 0.3, 0], [0.33, 0.55, 0], 0.03, 0.03, 6, C('#a87a3a'));
      for (const s of [-1, 1]) MB.tube(mb, [[0, 0.42, s * 0.3], [0, 0.48, s * 0.42], [0, 0.6, s * 0.48], [0, 0.72, s * 0.46]], t => 0.075 * (1 - t) + 0.01, 10, C('#f4ead2'));
      break;
    }
    case 'mushroom': {
      mb.lathe([[0.18, 0.4], [0.42, 0.42], [0.44, 0.47], [0.38, 0.6], [0.24, 0.7], [0, 0.73]], 24, C('#e0443c'), 0.15);
      const dots = [[0.3, 0.55, 0.1], [-0.15, 0.62, 0.22], [0.05, 0.69, -0.12], [-0.28, 0.55, -0.15], [0.15, 0.58, -0.3], [-0.05, 0.56, 0.36]];
      for (const d of dots) { const l = Math.hypot(...d); mb.sph(d, 0.055, 6, C('#ffffff'), 0); }
      break;
    }
    case 'pirate': {
      MB.dome(mb, 0.33, 0.3, 0.24, C('#22252f'));
      for (let k = 0; k < 3; k++) { const a = k / 3 * 6.283 + Math.PI / 3; mb.push([Math.cos(a) * 0.25, 0.42, Math.sin(a) * 0.25], M4.rotY(-a)); mb.sph([0, 0, 0], [0.08, 0.13, 0.3], 12, C('#2c303c'), 0.1); mb.pop(); }
      mb.sph([0.31, 0.47, 0], [0.03, 0.06, 0.055], 8, C('#f4f4f4'), 0);
      break;
    }
    case 'miner': {
      MB.dome(mb, 0.35, 0.28, 0.3, C('#ffcc2a'));
      mb.sph([0.25, 0.3, 0], [0.2, 0.03, 0.26], 12, C('#e8b420'), 0.1);
      mb.push([0.3, 0.45, 0], M4.rotZ(-Math.PI / 2 + 0.5)); mb.lathe([[0, -0.02], [0.07, -0.02], [0.08, 0.06], [0, 0.06]], 14, C('#c8ccd4')); mb.pop();
      mb.sph([0.345, 0.475, 0], [0.025, 0.06, 0.06], 10, G('#fff7c0'), 0);
      break;
    }
    case 'antenna': MB.tube(mb, [[0, 0.42, 0], [0, 0.6, 0], [0.02, 0.76, 0]], 0.018, 6, C('#c8ccd4')); mb.sph([0.02, 0.82, 0], 0.075, 12, G('#7be36b'), 0); break;
    case 'bunny': {
      for (const s of [-1, 1]) {
        mb.push([-0.04, 0.38, s * 0.13], M4.mul3(M4.rotX(s * 0.2), M4.rotZ(0.15)));
        mb.sph([0, 0.2, 0], [0.07, 0.22, 0.04], 12, C('#f8f4f4'), 0.1);
        mb.sph([0.025, 0.2, 0], [0.05, 0.17, 0.025], 10, C('#ffb3c6'), 0);
        mb.pop();
      }
      break;
    }
    case 'cone': {
      mb.rbox(-0.25, 0.36, -0.25, 0.25, 0.41, 0.25, C('#ff7a1a'));
      mb.lathe([[0.2, 0.4], [0.16, 0.5], [0.12, 0.62], [0.08, 0.74], [0.04, 0.86], [0, 0.88]], 18, (t) => (t > 0.25 && t < 0.42) || (t > 0.6 && t < 0.75) ? C('#ffffff') : C('#ff7a1a'), 0.1);
      break;
    }
    case 'grad': {
      MB.dome(mb, 0.31, 0.32, 0.2, C('#22252f'));
      mb.push([0, 0.53, 0], M4.rotY(Math.PI / 4)); mb.rbox(-0.3, -0.02, -0.3, 0.3, 0.02, 0.3, C('#2c303c')); mb.pop();
      mb.sph([0, 0.56, 0], 0.03, 6, C('#ffd24a'));
      MB.tube(mb, [[0, 0.56, 0], [0.2, 0.56, 0.2], [0.3, 0.45, 0.3]], 0.012, 5, C('#ffd24a'));
      mb.sph([0.3, 0.42, 0.3], [0.025, 0.05, 0.025], 6, C('#ffd24a'));
      break;
    }
    case 'stormcloud': {
      // a little thundercloud floating over your head, with a lightning bolt
      const top = C('#e8ecf6'), base = C('#5a6070');
      for (const [x, y, z, r] of [[0, 0.82, 0, 0.17], [0.15, 0.78, 0.06, 0.13], [-0.15, 0.79, -0.04, 0.13], [0.05, 0.94, -0.03, 0.12], [-0.06, 0.78, 0.13, 0.11]]) mb.sph([x, y, z], [r, r * 0.85, r], 10, (nx, ny) => ny < -0.2 ? base : mixC(base, top, (ny + 0.2) / 1.2), 0);
      const g = glowC(C('#fff27a')); mb.tri([0.02, 0.68, 0], [-0.06, 0.55, 0], [0.03, 0.57, 0], g); mb.tri([0.02, 0.68, 0], [0.03, 0.57, 0], [-0.06, 0.55, 0], g); mb.tri([0.0, 0.59, 0], [-0.03, 0.44, 0], [0.07, 0.57, 0], g); mb.tri([0.0, 0.59, 0], [0.07, 0.57, 0], [-0.03, 0.44, 0], g);
      for (const [x, z] of [[0.12, 0.05], [-0.1, -0.06], [0.04, -0.12]]) mb.caps([x, 0.68, z], [x - 0.01, 0.6, z], 0.008, 0.008, 4, C('#9ad0ff'));
      break;
    }
    case 'starcrown': {
      const g = C('#fff2a8');
      mb.tor([0, 0.4, 0], 0.27, 0.03, 24, 6, C('#ffcf4a'));
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283, x = Math.cos(a) * 0.27, z = Math.sin(a) * 0.27; mb.push([x, 0.5 + (k === 0 ? 0.05 : 0), z], M4.rotY(-a + Math.PI / 2)); for (let q = 0; q < 5; q++) { const b = q / 5 * 6.283 + Math.PI / 2, o = [Math.cos(b) * 0.09, Math.sin(b) * 0.09, 0], l = b + 0.628, r = b - 0.628, L = [Math.cos(l) * 0.04, Math.sin(l) * 0.04, 0], R = [Math.cos(r) * 0.04, Math.sin(r) * 0.04, 0]; mb.tri([0, 0, 0.02], R, o, glowC(g)); mb.tri([0, 0, 0.02], o, L, glowC(g)); mb.tri([0, 0, -0.02], o, R, glowC(g)); mb.tri([0, 0, -0.02], L, o, glowC(g)); } mb.pop(); }
      break;
    }
    case 'crown': {
      const g = C('#ffcf4a');
      mb.lathe([[0.3, 0.3], [0.31, 0.34], [0.3, 0.46], [0.28, 0.48], [0.27, 0.47], [0.27, 0.32], [0, 0.32]], 24, g, 0.1);
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; mb.caps([Math.cos(a) * 0.28, 0.46, Math.sin(a) * 0.28], [Math.cos(a) * 0.3, 0.62, Math.sin(a) * 0.3], 0.06, 0.012, 8, g); mb.sph([Math.cos(a) * 0.3, 0.64, Math.sin(a) * 0.3], 0.03, 6, g); mb.sph([Math.cos(a + 0.63) * 0.31, 0.39, Math.sin(a + 0.63) * 0.31], 0.04, 8, G(k % 2 ? '#cdb4ff' : '#a8d8ff'), 0); }
      break;
    }
  }
  return mb.build(gl);
}

// ---------- gadgets (drawn on top of the ball like a hat, but they don't roll) ----------
function gadgetModel(gl, id) {
  const mb = new MeshBuilder(), C = hex, G = c => glowC(hex(c));
  switch (id) {
    case 'balloon': MB.tube(mb, [[-0.05, 0.42, 0], [-0.12, 0.9, 0.05], [-0.1, 1.35, 0]], 0.008, 4, C('#f4f4f4')); mb.sph([-0.1, 1.62, 0], [0.27, 0.32, 0.27], 16, C('#ff5f7e'), 0.1); mb.caps([-0.1, 1.31, 0], [-0.1, 1.27, 0], 0.04, 0.02, 6, C('#e0405e')); break;
    case 'glider': { mb.caps([-0.05, 0.42, 0], [-0.05, 0.85, 0], 0.02, 0.02, 5, C('#5a5f70')); const w = C('#ffc45a'), w2 = C('#ff8a5a'); mb.tri2([0.4, 0.95, 0], [-0.35, 0.85, 0.95], [-0.25, 0.9, 0], w); mb.tri2([0.4, 0.95, 0], [-0.25, 0.9, 0], [-0.35, 0.85, -0.95], w2); mb.caps([-0.33, 0.86, -0.9], [-0.33, 0.86, 0.9], 0.02, 0.02, 5, C('#5a5f70')); break; }
    case 'spring': for (let k = 0; k < 5; k++) mb.tor([-0.42, 0.05 + k * 0.08, 0], 0.11, 0.025, 14, 5, C(k % 2 ? '#c8ccd4' : '#a8b0bc')); mb.sph([-0.42, 0.45, 0], [0.13, 0.04, 0.13], 10, C('#ff5f5f'), 0); break;
    case 'magnet': mb.push([0, 0.35, 0.5], M4.rotX(Math.PI / 2)); for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI, b = (k + 1) / 8 * Math.PI; if (k < 8) mb.caps([Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0], [Math.cos(b) * 0.15, Math.sin(b) * 0.15, 0], 0.05, 0.05, 6, C('#e0404a')); } for (const s2 of [-1, 1]) mb.caps([s2 * 0.15, 0, 0], [s2 * 0.15, -0.14, 0], 0.052, 0.052, 6, C('#e8eef7')); mb.pop(); break;
    case 'lantern': MB.tube(mb, [[-0.25, 0.35, 0], [-0.3, 0.75, 0], [-0.05, 0.92, 0], [0.12, 0.85, 0]], 0.018, 5, C('#5a4a3a')); mb.caps([0.12, 0.84, 0], [0.12, 0.76, 0], 0.01, 0.01, 4, C('#3a3f55')); mb.rbox(0.05, 0.56, -0.07, 0.19, 0.74, 0.07, G('#ffe08a')); mb.rbox(0.03, 0.74, -0.09, 0.21, 0.78, 0.09, C('#3a3f55')); mb.rbox(0.03, 0.52, -0.09, 0.21, 0.56, 0.09, C('#3a3f55')); break;
    case 'jets': for (const s2 of [-1, 1]) { mb.push([-0.42, 0.05, s2 * 0.2], M4.rotZ(Math.PI / 2)); mb.lathe([[0, -0.1], [0.08, -0.1], [0.09, 0.15], [0.06, 0.24], [0, 0.25]], 12, C('#c8ccd4'), 0.2); mb.pop(); mb.sph([-0.57, 0.05, s2 * 0.2], [0.06, 0.05, 0.05], 8, G('#ff9a3a'), 0); } break;
    case 'snorkel': mb.tor([0, 0.05, 0], 0.455, 0.035, 28, 6, C('#2a2f3a')); mb.sph([0.42, 0.12, 0], [0.06, 0.12, 0.2], 10, [0.6, 0.85, 1, 0.45], 0); MB.tube(mb, [[0.1, 0.4, 0.3], [0.05, 0.6, 0.32], [0.0, 0.8, 0.3]], 0.03, 6, C('#ffc45a')); break;
  }
  return mb.build(gl);
}

// ---------- owner gadgets ----------
const PB = '#a8d8ff', PP = '#cdb4ff';
// the owner ship: a sleek pastel jet with a glass bubble cockpit, facing +x
function shipModel(gl) {
  const mb = new MeshBuilder(), C = hex, G = c => glowC(hex(c));
  mb.push([0, 0, 0], M4.rotZ(-Math.PI / 2), [1, 1.6, 1]);
  mb.lathe([[0, -2.6], [0.55, -2.3], [0.9, -1.4], [1.05, -0.2], [0.95, 1.0], [0.6, 2.0], [0.2, 2.6], [0, 2.7]], 24, (t, ph) => Math.abs(Math.sin(ph)) > 0.92 && t > 0.2 && t < 0.8 ? C(PP) : mixC(C('#eef3fb'), C(PB), 0.25 + 0.2 * Math.cos(ph)), 0.15);
  mb.pop();
  // the open cockpit under the canopy: a seat and a little dashboard
  mb.sph([0.9, 0.88, 0], [1.25, 0.22, 0.62], 16, C('#3a3f55'), 0);
  mb.rbox(0.25, 0.85, -0.36, 0.55, 1.5, 0.36, C(PP)); mb.rbox(0.25, 0.85, -0.36, 1.05, 1.0, 0.36, C(PP));
  mb.rbox(1.55, 0.9, -0.38, 1.85, 1.12, 0.38, C('#2a2f3d')); for (let k = 0; k < 3; k++) mb.sph([1.7, 1.13, -0.2 + k * 0.2], 0.045, 6, G(['#5ff0e0', '#ff9ad8', '#ffd24a'][k]), 0);
  for (const s2 of [-1, 1]) {
    mb.sph([-0.6, -0.1, s2 * 1.8], [1.4, 0.12, 1.3], 16, (x, y, z) => mixC(C(PP), C(PB), Math.abs(z)), 0.1);
    mb.push([-2.2, 0.1, s2 * 0.75], M4.rotZ(Math.PI / 2)); mb.lathe([[0, -0.6], [0.42, -0.5], [0.45, 0.6], [0.3, 0.9], [0, 0.95]], 14, C('#c8ccd8'), 0.2); mb.pop();
    mb.sph([-2.85, 0.1, s2 * 0.75], [0.12, 0.32, 0.32], 10, G('#ff9ad8'), 0);
    mb.sph([-0.6, -0.08, s2 * 3.05], 0.12, 8, G(s2 > 0 ? '#7be36b' : '#ff5f7e'), 0);
  }
  mb.sph([-2.0, 0.9, 0], [0.9, 0.7, 0.08], 12, C(PP), 0.1); // tail fin
  // a little crown on the nose
  for (let k = 0; k < 3; k++) mb.caps([2.0, 0.55, (k - 1) * 0.16], [2.1, 0.8, (k - 1) * 0.18], 0.06, 0.015, 6, C('#ffcf4a'));
  return mb.build(gl);
}
// the glass canopy, built around its hinge at the back (it swings up so you can jump in)
function canopyModel(gl) {
  const mb = new MeshBuilder();
  mb.sph([1.3, 0, 0], [1.35, 0.78, 0.7], 18, [0.78, 0.9, 1, 0.22], 0);
  return mb.build(gl);
}
function canopyFrame(gl) {
  const mb = new MeshBuilder();
  mb.tor([1.3, 0, 0], 1, 0.05, 28, 5, hex(PP)); // stretched into an oval by the draw matrix
  mb.caps([0, 0, -0.5], [0, 0, 0.5], 0.08, 0.08, 8, hex('#c8ccd8'));
  return mb.build(gl);
}
// what you see from inside the ship: the dashboard and the window frame (camera looks along +x)
function cockpitModel(gl) {
  const mb = new MeshBuilder(), C = hex, G = c => glowC(hex(c));
  mb.rbox(0.55, -0.62, -0.75, 1.1, -0.38, 0.75, C('#3a3f55'));
  mb.rbox(0.6, -0.4, -0.55, 0.95, -0.36, 0.55, C('#2a2f3d'));
  for (let k = 0; k < 5; k++) mb.sph([0.75, -0.37, -0.4 + k * 0.2], [0.04, 0.012, 0.04], 6, G(['#5ff0e0', '#ff9ad8', '#ffd24a', '#7be36b', PB][k]), 0);
  mb.sph([0.78, -0.37, 0], [0.1, 0.02, 0.18], 10, G('#a8d8ff'), 0);
  for (const s2 of [-1, 1]) MB.tube(mb, [[0.9, -0.4, s2 * 0.8], [1.1, 0.1, s2 * 0.9], [0.8, 0.55, s2 * 0.7], [0.2, 0.75, s2 * 0.4]], 0.035, 6, C('#eef3fb'));
  return mb.build(gl);
}
// pastel wings that flap (made of long soft feathers)
function wingsModel(gl, side) {
  const mb = new MeshBuilder();
  for (let k = 0; k < 6; k++) { const a = -0.25 + k * 0.13, L = 0.55 + k * 0.07; mb.push([0, 0, 0], M4.mul3(M4.rotX(-side * (0.15 + k * 0.05)), M4.rotZ(a))); mb.sph([-0.02 * k, 0.03, side * L * 0.5], [0.025, 0.08 + k * 0.012, L * 0.5], 10, mixC(hex(PB), hex(PP), k / 5), 0); mb.pop(); }
  mb.sph([0, 0, side * 0.12], [0.1, 0.05, 0.16], 8, [1, 1, 1, 1], 0);
  return mb.build(gl);
}
function dragonRig(gl) {
  const parts = [], C = hex, add = (anim, parent, at, fn, o = {}) => { const mb = new MeshBuilder(); mb.segK = 0.8; fn(mb); parts.push({ m: mb.build(gl), at, parent, anim, ...o }); return parts.length - 1; };
  const body = add('flybody', -1, [0, 0, 0], mb => { mb.sph([0, 0, 0], [0.22, 0.17, 0.16], 14, (x, y) => y < -0.3 ? C('#fff2f8') : C(PP), 0.1); for (let k = 0; k < 4; k++) mb.caps([0.12 - k * 0.09, 0.14 - k * 0.01, 0], [0.12 - k * 0.09, 0.22, 0], 0.03, 0.005, 5, C(PB)); });
  const head = add('head', body, [0.2, 0.12, 0], mb => { mb.sph([0.08, 0.04, 0], [0.14, 0.12, 0.12], 14, C(PP), 0.1); mb.sph([0.2, 0.0, 0], [0.07, 0.06, 0.08], 10, C('#e8d8ff'), 0); for (const k of [-1, 1]) mb.caps([0.02, 0.12, k * 0.06], [-0.06, 0.24, k * 0.08], 0.025, 0.006, 5, C('#ffe08a')); MB.cheeks(mb, 0.17, 0.0, 0, 0.09); });
  add('eyes', head, [0.15, 0.08, 0], mb => MB.eyes(mb, 0, 0, 0, 0.06, 0.035));
  for (const k of [-1, 1]) add('wing', body, [0, 0.1, 0.1 * k], mb => { mb.sph([0, 0, 0.18 * k], [0.12, 0.012, 0.2], 10, C(PB), 0); mb.sph([-0.05, 0, 0.3 * k], [0.08, 0.01, 0.1], 8, C('#d8ecff'), 0); }, { side: k, amp: 0.9 });
  add('tail', body, [-0.2, 0, 0], mb => { MB.tube(mb, [[0, 0, 0], [-0.15, -0.03, 0.03], [-0.3, 0.02, 0]], t => 0.06 * (1 - t) + 0.015, 8, C(PP)); mb.sph([-0.33, 0.03, 0], [0.04, 0.06, 0.02], 6, C(PB), 0); }, { amp: 1.2 });
  return { parts };
}
function auraModel(gl) { const mb = new MeshBuilder(); mb.tor([0, 0, 0], 0.85, 0.025, 40, 6, glowC(hex(PB))); mb.push([0, 0, 0], M4.rotX(1.1)); mb.tor([0, 0, 0], 0.75, 0.02, 40, 6, glowC(hex(PP))); mb.pop(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; mb.sph([Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85], 0.05, 6, glowC(hex('#ffffff')), 0); } return mb.build(gl); }

// ---------- items ----------
function itemModel(gl, type) {
  const mb = new MeshBuilder(), c = hex(ITEMS[type].color), g = glowC(c), C = hex;
  switch (type) {
    case 'coin': {
      mb.push([0, 0, 0], M4.rotX(Math.PI / 2));
      mb.lathe([[0, -0.05], [0.24, -0.05], [0.27, -0.03], [0.27, 0.03], [0.24, 0.05], [0.18, 0.05], [0.17, 0.06], [0, 0.06]], 24, (t, ph, k) => k >= 5 ? C('#fff1a0', 0.9) : g, 0);
      mb.push([0, 0, 0], M4.rotX(Math.PI)); mb.lathe([[0, -0.05], [0.24, -0.05], [0.18, -0.06], [0, -0.06]], 24, C('#fff1a0', 0.9), 0); mb.pop();
      mb.pop();
      break;
    }
    case 'mushroom': {
      mb.lathe([[0.08, -0.3], [0.085, -0.15], [0.07, -0.02], [0, -0.02]], 12, C('#f4ead8'), 0.1);
      mb.lathe([[0.1, -0.05], [0.26, -0.04], [0.27, 0.0], [0.22, 0.12], [0.12, 0.2], [0, 0.22]], 18, c, 0.1);
      for (const d of [[0.15, 0.13, 0.05], [-0.1, 0.15, 0.1], [0.02, 0.2, -0.08], [-0.12, 0.1, -0.15]]) mb.sph(d, 0.04, 6, C('#ffffff'), 0);
      break;
    }
    case 'feather': {
      mb.push([0, 0, 0], M4.rotZ(0.4));
      MB.tube(mb, [[0, -0.32, 0], [0, 0, 0], [0.02, 0.3, 0]], 0.012, 5, C('#c8bfae'));
      mb.sph([0.01, 0.05, 0], [0.11, 0.27, 0.02], 14, (x, y) => y > 0.75 ? C('#ff9f5a') : c, 0.15);
      mb.pop();
      break;
    }
    case 'crystal': mb.cyl(0, -0.25, 0, 0.13, 0, 0.6, 6, g); mb.cyl(0, -0.25, 0, 0.13, 0.13, 0.05, 6, g); mb.cyl(0.13, -0.28, 0.05, 0.07, 0, 0.32, 5, g); mb.cyl(-0.1, -0.28, -0.06, 0.06, 0, 0.26, 5, g); break;
    case 'gem': mb.cyl(0, 0, 0, 0.24, 0.15, 0.1, 8, g); mb.cyl(0, 0.1, 0, 0.15, 0, 0.001, 8, g); mb.cyl(0, -0.25, 0, 0, 0.24, 0.25, 8, shadeC(g, 0.8)); break;
    case 'relic': {
      mb.lathe([[0, -0.32], [0.16, -0.32], [0.18, -0.28], [0.12, -0.2], [0.1, -0.08], [0.17, 0.05], [0.19, 0.14], [0.14, 0.2], [0, 0.2]], 18, (t, ph, k) => k < 3 ? C('#8a6a3a') : c, 0.1);
      mb.sph([0, 0.27, 0], 0.09, 10, glowC(C('#5ff0e0')), 0);
      break;
    }
    case 'star': {
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + Math.PI / 2, o = [Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], l = a + 0.628, r = a - 0.628, L = [Math.cos(l) * 0.14, Math.sin(l) * 0.14, 0], R = [Math.cos(r) * 0.14, Math.sin(r) * 0.14, 0];
        mb.tri([0, 0, 0.09], R, o, g); mb.tri([0, 0, 0.09], o, L, g); mb.tri([0, 0, -0.09], o, R, shadeC(g, 0.85)); mb.tri([0, 0, -0.09], L, o, shadeC(g, 0.85)); }
      break;
    }
    case 'trophy': {
      mb.rbox(-0.2, -0.45, -0.2, 0.2, -0.33, 0.2, C('#6a4a2a'));
      mb.lathe([[0.12, -0.33], [0.05, -0.28], [0.04, -0.12], [0.08, -0.08], [0.2, 0.0], [0.26, 0.12], [0.27, 0.2], [0.24, 0.21], [0, 0.12]], 22, g, 0);
      for (const s of [-1, 1]) MB.tube(mb, [[s * 0.24, 0.13, 0], [s * 0.36, 0.1, 0], [s * 0.34, 0.0, 0], [s * 0.2, -0.02, 0]], 0.025, 6, g);
      break;
    }
    case 'cloud': for (const [x, y, r] of [[0, 0, 0.2], [0.17, -0.04, 0.14], [-0.17, -0.04, 0.15], [0.08, 0.1, 0.13]]) mb.sph([x, y, 0], r, 10, C('#ffffff'), 0.25); break;
    case 'pepper': {
      mb.lathe([[0, -0.3], [0.05, -0.25], [0.11, -0.1], [0.13, 0.05], [0.11, 0.14], [0, 0.16]], 14, c, 0.1);
      MB.tube(mb, [[0, 0.15, 0], [0.03, 0.24, 0], [0.09, 0.28, 0]], 0.025, 6, C('#4caa52'));
      break;
    }
    case 'fossil': {
      MB.tube(mb, [[-0.25, 0, 0], [0.25, 0, 0]], 0.05, 8, c);
      for (const s of [-1, 1]) { mb.sph([s * 0.27, 0.05, 0], 0.075, 8, c); mb.sph([s * 0.27, -0.05, 0], 0.075, 8, c); }
      break;
    }
    case 'pearl': {
      mb.lathe([[0, -0.1], [0.28, -0.08], [0.3, -0.04], [0, -0.05]], 18, C('#9a7aa8'), 0);
      mb.sph([0, 0.07, 0], 0.13, 14, glowC(c), 0);
      break;
    }
    case 'key': {
      mb.push([0, 0, 0], M4.rotX(Math.PI / 2)); mb.tor([0, 0.18, 0], 0.11, 0.035, 16, 6, g); mb.pop();
      mb.caps([0, 0.06, 0], [0, -0.32, 0], 0.035, 0.035, 8, g);
      mb.rbox(0, -0.3, -0.03, 0.12, -0.24, 0.03, g); mb.rbox(0, -0.2, -0.03, 0.09, -0.15, 0.03, g);
      break;
    }
    case 'shell': default: {
      mb.push([0, -0.12, 0], M4.rotX(-0.3));
      mb.sph([0, 0, 0], [0.28, 0.06, 0.24], 16, (x, y, z) => shadeC(c, 0.85 + 0.15 * Math.cos(Math.atan2(z, x) * 14)), 0);
      mb.sph([0, 0.06, -0.22], [0.08, 0.05, 0.05], 8, shadeC(c, 0.85), 0);
      mb.pop();
    }
  }
  return mb.build(gl);
}

// ---------- creatures (friendly, they hop around and run off if you come close) ----------
const CREATURES = {
  hopper: { name: 'Hopper', biomes: [2, 9], speed: 3, hop: true },
  deer: { name: 'Antlerbuck', biomes: [3], speed: 4 },
  fox: { name: 'Fox', biomes: [3, 2], speed: 4.5 },
  crab: { name: 'Sand crab', biomes: [1, 4], speed: 2.5 },
  turtle: { name: 'Beach turtle', biomes: [1], speed: 1 },
  lizard: { name: 'Sun lizard', biomes: [4], speed: 3.5 },
  penguin: { name: 'Snowpuff', biomes: [5], speed: 1.8, waddle: true },
  slime: { name: 'Bog blob', biomes: [7], speed: 1.5, hop: true },
  frog: { name: 'Frog', biomes: [7], speed: 2.5, hop: true },
  moth: { name: 'Glowmoth', biomes: [8], speed: 2, fly: true },
  goat: { name: 'Cliff goat', biomes: [6], speed: 3, hop: true },
  bird: { name: 'Sky bird', biomes: [], speed: 9, fly: true },
  fish: { name: 'Fish', biomes: [0], speed: 3, swim: true },
  beetle: { name: 'Cave beetle', biomes: [], speed: 1.5 },
  butterfly: { name: 'Butterfly', biomes: [2], speed: 2, fly: true },
  jelly: { name: 'Jellyfish', biomes: [], speed: 1, swim: true },
};
// Each creature is a little rig: parts (body, head, legs, tail, ears, wings, eyes) that move on their own.
// A part: { m: mesh, at: pivot (in its parent), parent: index or -1, anim: how it moves, ph: phase, amp: how much }
function creatureRig(gl, type) {
  const parts = [], C = hex;
  const add = (anim, parent, at, fn, o = {}) => { const mb = new MeshBuilder(); mb.segK = 0.65; fn(mb); parts.push({ m: mb.build(gl), at, parent, anim, ...o }); return parts.length - 1; };
  const eyes = (parent, at, s, size) => add('eyes', parent, at, mb => MB.eyes(mb, 0, 0, 0, s, size));
  const leg = (parent, at, len, r, col, ph, foot) => add('leg', parent, at, mb => { mb.caps([0, 0, 0], [0, -len, 0], r * 1.15, r, 8, col); if (foot) mb.sph([0.02, -len, 0], [r * 1.5, r * 0.9, r * 1.3], 8, foot, 0); }, { ph, amp: 0.55 });
  // a four-legged animal: body, legs, neck+head, tail
  const quad = (o) => {
    const body = add('body', -1, [0, o.h, 0], mb => { mb.sph([0, 0, 0], o.body, 16, (x, y) => (y < -0.35 && o.belly) ? o.belly : o.col, 0.12); if (o.spots) for (const sp of o.spots) mb.sph(sp, 0.04, 6, o.spotCol, 0); });
    for (const [x, z, ph] of [[o.lx, o.lz, 0], [o.lx, -o.lz, Math.PI], [-o.lx, o.lz, Math.PI], [-o.lx, -o.lz, 0]]) leg(body, [x, -o.body[1] * 0.45, z], o.h - o.body[1] * 0.55, o.legR, o.legCol, ph, o.hoof);
    const head = add('head', body, o.neckAt, o.head);
    eyes(head, o.eyeAt, o.eyeS, o.eyeSize);
    if (o.ears) for (const k of [-1, 1]) add('ear', head, [o.ears[0], o.ears[1], o.ears[2] * k], mb => o.ear(mb, k), { side: k });
    if (o.tail) add('tail', body, o.tailAt, o.tail);
    return body;
  };
  switch (type) {
    case 'hopper': {
      const c = C('#f6eee6'), pink = C('#ffb8c8');
      const body = add('hopbody', -1, [0, 0.26, 0], mb => { mb.sph([0, 0, 0], [0.29, 0.26, 0.25], 16, c, 0.18); mb.sph([0.1, -0.05, 0], [0.19, 0.17, 0.2], 12, C('#fffaf4'), 0.05); mb.sph([-0.3, 0.05, 0], 0.09, 10, C('#ffffff'), 0); });
      const head = add('head', body, [0.22, 0.2, 0], mb => { mb.sph([0.03, 0.02, 0], [0.19, 0.17, 0.18], 14, c, 0.1); mb.sph([0.16, -0.04, 0], [0.07, 0.06, 0.09], 10, C('#fffaf4'), 0); mb.sph([0.21, -0.01, 0], 0.025, 6, pink, 0); MB.cheeks(mb, 0.15, -0.03, 0, 0.11); });
      eyes(head, [0.15, 0.05, 0], 0.08, 0.045);
      for (const k of [-1, 1]) add('ear', head, [-0.02, 0.13, 0.07 * k], mb => { mb.push([0, 0, 0], M4.rotX(k * 0.2)); mb.sph([0, 0.17, 0], [0.05, 0.19, 0.065], 10, c, 0); mb.sph([0.025, 0.17, 0], [0.035, 0.15, 0.045], 8, pink, 0); mb.pop(); }, { side: k });
      for (const k of [-1, 1]) { add('hopleg', body, [0.15, -0.18, 0.1 * k], mb => mb.sph([0.03, -0.04, 0], [0.07, 0.05, 0.05], 8, c, 0)); add('hopback', body, [-0.13, -0.17, 0.14 * k], mb => mb.sph([0.06, -0.04, 0], [0.13, 0.06, 0.07], 8, c, 0)); }
      break;
    }
    case 'deer': {
      const c = C('#b8804c'), cream = C('#f2e2c4');
      quad({ h: 0.68, body: [0.44, 0.23, 0.21], col: c, belly: cream, spots: [[0.1, 0.2, 0.12], [-0.15, 0.2, -0.1], [-0.25, 0.18, 0.13], [0.05, 0.22, -0.13]], spotCol: cream, lx: 0.28, lz: 0.11, legR: 0.045, legCol: C('#9a663a'), hoof: C('#3a2a22'),
        neckAt: [0.32, 0.08, 0], head: mb => { mb.caps([0, 0, 0], [0.12, 0.26, 0], 0.1, 0.085, 10, c); mb.sph([0.2, 0.34, 0], [0.18, 0.14, 0.14], 14, c, 0.1); mb.sph([0.35, 0.3, 0], [0.08, 0.07, 0.08], 10, cream, 0); mb.sph([0.42, 0.31, 0], 0.035, 6, C('#2a1e1a'), 0);
          for (const k of [-1, 1]) { MB.tube(mb, [[0.14, 0.45, 0.06 * k], [0.12, 0.64, 0.13 * k], [0.06, 0.78, 0.2 * k]], 0.02, 6, cream); MB.tube(mb, [[0.13, 0.6, 0.12 * k], [0.24, 0.7, 0.15 * k]], 0.016, 6, cream); MB.tube(mb, [[0.09, 0.72, 0.17 * k], [0.15, 0.84, 0.18 * k]], 0.014, 6, cream); } },
        eyeAt: [0.28, 0.38, 0], eyeS: 0.085, eyeSize: 0.042,
        ears: [0.1, 0.42, 0.13], ear: (mb, k) => { mb.push([0, 0, 0], M4.rotX(-k * 0.9)); mb.sph([0, 0.05, 0], [0.035, 0.07, 0.03], 8, c, 0); mb.pop(); },
        tailAt: [-0.42, 0.08, 0], tail: mb => mb.sph([-0.04, 0.03, 0], [0.06, 0.08, 0.05], 8, C('#ffffff'), 0) });
      break;
    }
    case 'fox': {
      const c = C('#f07a2a'), w = C('#fff4e8'), dark = C('#3a2a22');
      quad({ h: 0.42, body: [0.34, 0.19, 0.17], col: c, belly: w, lx: 0.21, lz: 0.09, legR: 0.038, legCol: dark, hoof: dark,
        neckAt: [0.3, 0.1, 0], head: mb => { mb.sph([0.06, 0.06, 0], [0.17, 0.15, 0.16], 14, c, 0.1); mb.sph([0.08, -0.0, 0], [0.13, 0.08, 0.13], 10, w, 0); mb.caps([0.14, 0.03, 0], [0.3, 0.01, 0], 0.07, 0.025, 10, w); mb.sph([0.32, 0.01, 0], 0.028, 6, dark, 0); },
        eyeAt: [0.17, 0.11, 0], eyeS: 0.07, eyeSize: 0.036,
        ears: [0.03, 0.17, 0.08], ear: (mb, k) => { mb.push([0, 0, 0], M4.rotX(-k * 0.25)); mb.caps([0, 0, 0], [0, 0.16, 0], 0.06, 0.008, 6, c); mb.caps([0.02, 0.01, 0], [0.02, 0.12, 0], 0.035, 0.005, 6, dark); mb.pop(); },
        tailAt: [-0.32, 0.04, 0], tail: mb => { MB.tube(mb, [[0, 0, 0], [-0.18, 0.06, 0], [-0.32, 0.16, 0]], t => 0.06 + Math.sin(t * Math.PI) * 0.07, 12, c); mb.sph([-0.36, 0.2, 0], 0.075, 10, w, 0); } });
      break;
    }
    case 'goat': {
      const c = C('#efebe3');
      quad({ h: 0.55, body: [0.38, 0.21, 0.19], col: c, lx: 0.24, lz: 0.1, legR: 0.042, legCol: C('#8a8478'), hoof: C('#4a453e'),
        neckAt: [0.3, 0.08, 0], head: mb => { mb.caps([0, 0, 0], [0.12, 0.2, 0], 0.09, 0.08, 10, c); mb.sph([0.2, 0.28, 0], [0.16, 0.12, 0.12], 14, c, 0.1); mb.sph([0.33, 0.24, 0], [0.07, 0.06, 0.07], 8, C('#e8ddd0'), 0); mb.caps([0.24, 0.17, 0], [0.24, 0.07, 0], 0.03, 0.01, 6, C('#d8d0c0'));
          for (const k of [-1, 1]) MB.tube(mb, [[0.14, 0.38, 0.05 * k], [0.08, 0.5, 0.09 * k], [-0.04, 0.53, 0.11 * k], [-0.1, 0.43, 0.12 * k]], t => 0.04 * (1 - t) + 0.01, 8, C('#6a6458')); },
        eyeAt: [0.27, 0.32, 0], eyeS: 0.075, eyeSize: 0.036,
        ears: [0.12, 0.32, 0.12], ear: (mb, k) => mb.sph([0, 0, 0.05 * k], [0.03, 0.03, 0.08], 6, c, 0),
        tailAt: [-0.38, 0.1, 0], tail: mb => mb.sph([-0.03, 0.04, 0], [0.04, 0.07, 0.04], 6, c, 0) });
      break;
    }
    case 'crab': {
      const c = C('#ec5a44');
      const body = add('body', -1, [0, 0.2, 0], mb => { mb.sph([0, 0, 0], [0.24, 0.14, 0.32], 16, c, 0.25); mb.sph([0, 0.05, 0], [0.18, 0.08, 0.24], 12, C('#f57a62'), 0); });
      for (const k of [-1, 1]) {
        add('claw', body, [0.12, 0, 0.25 * k], mb => { MB.tube(mb, [[0, 0, 0], [0.16, 0.05, 0.1 * k], [0.26, 0.08, 0.05 * k]], 0.035, 6, c); mb.sph([0.32, 0.09, 0.04 * k], [0.1, 0.07, 0.07], 10, c, 0.1); mb.caps([0.38, 0.1, 0.04 * k], [0.46, 0.13, 0.02 * k], 0.03, 0.01, 6, c); }, { side: k });
        for (let q = 0; q < 3; q++) add('crableg', body, [-0.1 + q * 0.1, -0.03, 0.26 * k], mb => MB.tube(mb, [[0, 0, 0], [-0.02, -0.02, 0.14 * k], [-0.04, -0.17, 0.2 * k]], 0.022, 5, shadeC(c, 0.85)), { ph: q * 2 + (k > 0 ? 0 : 1), side: k });
        add('stalk', body, [0.12, 0.1, 0.07 * k], mb => { mb.caps([0, 0, 0], [0.02, 0.12, 0], 0.016, 0.016, 5, c); });
      }
      eyes(body, [0.16, 0.25, 0], 0.075, 0.04);
      break;
    }
    case 'turtle': {
      const shell = C('#4f9a52'), skin = C('#8ac078');
      const body = add('body', -1, [0, 0.2, 0], mb => { mb.sph([0, 0, 0], [0.38, 0.2, 0.3], 16, (x, y, z) => y > 0.15 ? shadeC(shell, 0.88 + 0.22 * ((Math.floor((Math.atan2(z, x) + 3.2) * 1.1) + Math.floor(y * 3)) % 2)) : C('#d8c48a'), 0.2); mb.tor([0, -0.02, 0], 0.32, 0.04, 24, 6, C('#3f7a42')); });
      const head = add('peek', body, [0.36, 0.02, 0], mb => { mb.caps([-0.1, 0, 0], [0.06, 0.02, 0], 0.07, 0.07, 8, skin); mb.sph([0.1, 0.04, 0], [0.11, 0.09, 0.09], 12, skin, 0.1); MB.cheeks(mb, 0.18, 0.02, 0, 0.07, '#ff9fb0'); });
      eyes(head, [0.15, 0.08, 0], 0.055, 0.03);
      for (const [x, z, ph] of [[0.22, 0.24, 0], [-0.22, 0.24, Math.PI], [0.22, -0.24, Math.PI], [-0.22, -0.24, 0]]) add('paddle', body, [x, -0.1, z], mb => mb.sph([0.02, -0.03, 0.04 * Math.sign(z)], [0.09, 0.05, 0.07], 8, skin, 0), { ph });
      add('tail', body, [-0.36, -0.04, 0], mb => mb.caps([0, 0, 0], [-0.1, -0.02, 0], 0.035, 0.01, 6, skin));
      break;
    }
    case 'lizard': {
      const c = C('#d8a33a');
      const body = add('wiggle', -1, [0, 0.12, 0], mb => { mb.sph([0, 0, 0], [0.24, 0.08, 0.1], 12, c, 0.2); for (let k = 0; k < 4; k++) mb.sph([0.15 - k * 0.1, 0.07, 0], 0.025, 5, C('#a8622a'), 0); });
      const head = add('head', body, [0.22, 0.01, 0], mb => mb.sph([0.08, 0.01, 0], [0.11, 0.07, 0.08], 10, c, 0.2));
      eyes(head, [0.11, 0.06, 0], 0.05, 0.028);
      for (const [x, z, ph] of [[0.13, 1, 0], [0.13, -1, Math.PI], [-0.13, 1, Math.PI], [-0.13, -1, 0]]) add('crableg', body, [x, 0, 0.07 * z], mb => MB.tube(mb, [[0, 0, 0], [0.03, -0.04, 0.11 * z], [0.06, -0.12, 0.13 * z]], 0.022, 5, c), { ph, side: z });
      add('tail', body, [-0.22, 0, 0], mb => MB.tube(mb, [[0, 0, 0], [-0.18, -0.02, 0.04], [-0.34, -0.06, 0]], t => 0.06 * (1 - t) + 0.01, 8, c));
      break;
    }
    case 'penguin': {
      const dark = C('#2c3140'), w = C('#ffffff'), org = C('#ffa63a');
      const body = add('waddle', -1, [0, 0.05, 0], mb => { mb.sph([0, 0.33, 0], [0.3, 0.36, 0.28], 16, (x, y) => x > 0.35 && y < 0.62 ? w : dark, 0.1); mb.caps([0.27, 0.5, 0], [0.4, 0.48, 0], 0.05, 0.012, 8, org); MB.cheeks(mb, 0.27, 0.48, 0, 0.16); });
      eyes(body, [0.24, 0.6, 0], 0.09, 0.045);
      for (const k of [-1, 1]) { add('flipper', body, [0, 0.45, 0.27 * k], mb => { mb.push([0, 0, 0], M4.rotX(k * 0.2)); mb.sph([0, -0.15, 0.02 * k], [0.11, 0.18, 0.035], 10, dark, 0.1); mb.pop(); }, { side: k }); add('leg', body, [0.08, 0.04, 0.1 * k], mb => mb.sph([0.04, -0.03, 0], [0.11, 0.035, 0.07], 8, org, 0), { ph: k > 0 ? 0 : Math.PI, amp: 0.3 }); }
      break;
    }
    case 'slime': {
      const body = add('jelly', -1, [0, 0, 0], mb => { mb.sph([0, 0.28, 0], [0.38, 0.3, 0.36], 18, C('#6ed85a', 0.4), 0.1); mb.sph([0, 0.22, 0], 0.15, 10, glowC(C('#c8ff9a')), 0); });
      eyes(body, [0.33, 0.38, 0], 0.11, 0.055);
      break;
    }
    case 'frog': {
      const c = C('#5cc048');
      const body = add('hopbody', -1, [0, 0.18, 0], mb => { mb.sph([0, 0.02, 0], [0.26, 0.2, 0.24], 14, (x, y) => y < -0.3 ? C('#e8f0a8') : c, 0.15); mb.sph([0.22, 0.05, 0], [0.012, 0.015, 0.12], 6, C('#2a3a22'), 0); for (const k of [-1, 1]) mb.sph([0.16, 0.2, k * 0.12], 0.085, 10, c, 0); });
      eyes(body, [0.21, 0.23, 0], 0.12, 0.042);
      for (const k of [-1, 1]) { add('hopback', body, [-0.12, -0.1, 0.2 * k], mb => mb.sph([0.02, -0.02, 0], [0.15, 0.07, 0.08], 10, c, 0.2)); add('hopleg', body, [0.16, -0.12, 0.13 * k], mb => mb.sph([0.03, -0.03, 0], [0.08, 0.035, 0.06], 8, c, 0.2)); }
      break;
    }
    case 'moth': case 'butterfly': {
      const bc = C(type === 'moth' ? '#4a3a5a' : '#2c2c38');
      const body = add('flybody', -1, [0, 0, 0], mb => { mb.sph([0, 0, 0], [0.13, 0.05, 0.05], 10, bc, 0); for (const k of [-1, 1]) MB.tube(mb, [[0.1, 0.03, 0.02 * k], [0.18, 0.1, 0.06 * k]], 0.006, 4, bc); });
      for (const k of [-1, 1]) add('wing', body, [0.01, 0.02, 0.03 * k], mb => {
        if (type === 'moth') mb.sph([0, 0, 0.15 * k], [0.12, 0.012, 0.16], 12, glowC(C('#c8a8ff')), 0);
        else { mb.sph([0.05, 0, 0.12 * k], [0.09, 0.008, 0.13], 12, (x, y, z) => Math.hypot(x, z) < 0.55 ? C('#ffd24a') : C('#ff7a3a'), 0); mb.sph([-0.07, 0, 0.1 * k], [0.06, 0.008, 0.08], 10, C('#ff7a3a'), 0); }
      }, { side: k, amp: 1.1 });
      break;
    }
    case 'bird': {
      const c = C('#4a8ae8');
      const body = add('flybody', -1, [0, 0, 0], mb => { mb.sph([0, 0, 0], [0.2, 0.14, 0.14], 12, (x, y) => y < -0.3 ? C('#e8f0ff') : c, 0.1); mb.caps([0.17, 0.02, 0], [0.3, 0.0, 0], 0.04, 0.008, 6, C('#ffc45a')); mb.sph([-0.24, 0.02, 0], [0.1, 0.012, 0.08], 8, c, 0); });
      eyes(body, [0.13, 0.06, 0], 0.07, 0.025);
      for (const k of [-1, 1]) add('wing', body, [-0.02, 0.05, 0.08 * k], mb => mb.sph([0, 0, 0.17 * k], [0.12, 0.015, 0.2], 12, shadeC(c, 0.92), 0), { side: k, amp: 0.8 });
      break;
    }
    case 'fish': {
      const c = C('#ff9f5a');
      const body = add('swim', -1, [0, 0, 0], mb => { mb.sph([0, 0, 0], [0.22, 0.13, 0.08], 12, (x, y) => y < -0.3 ? C('#fff0d8') : c, 0.1); mb.sph([0, 0.13, 0], [0.08, 0.05, 0.01], 8, shadeC(c, 0.9), 0); });
      eyes(body, [0.12, 0.03, 0], 0.06, 0.03);
      add('tail', body, [-0.2, 0, 0], mb => { mb.push([0, 0, 0], M4.rotY(Math.PI / 2)); mb.sph([0, 0, 0.08], [0.012, 0.12, 0.1], 8, shadeC(c, 0.9), 0); mb.pop(); }, { amp: 1.4 });
      break;
    }
    case 'jelly': {
      const body = add('jellyfloat', -1, [0, 0, 0], mb => { mb.lathe([[0.32, 0], [0.34, 0.08], [0.28, 0.22], [0.16, 0.32], [0, 0.35]], 16, [1, 0.6, 0.9, 0.42], 0); mb.sph([0, 0.1, 0], 0.12, 8, glowC(C('#ffc8f0')), 0); });
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; add('tentacle', body, [Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18], mb => MB.tube(mb, [[0, 0, 0], [0.03, -0.25, 0], [-0.02, -0.5, 0.02], [0.02, -0.75, 0]], 0.018, 4, glowC(C('#ff9ad8'))), { ph: k }); }
      eyes(body, [0.26, 0.12, 0], 0.08, 0.035);
      break;
    }
    case 'beetle': default: {
      const body = add('body', -1, [0, 0.14, 0], mb => mb.sph([0, 0, 0], [0.22, 0.13, 0.17], 14, (x, y, z) => y > 0.3 ? (Math.abs(z) < 0.06 ? C('#1a1f2b') : glowC(C('#5ff0e0'))) : C('#2a2f3a'), 0.1));
      const head = add('head', body, [0.2, -0.04, 0], mb => { mb.sph([0.02, 0, 0], [0.08, 0.07, 0.09], 10, C('#2a2f3a'), 0); for (const k of [-1, 1]) MB.tube(mb, [[0.06, 0.04, 0.04 * k], [0.14, 0.14, 0.1 * k]], 0.008, 4, C('#1a1f2b')); });
      eyes(head, [0.07, 0.03, 0], 0.05, 0.022);
      for (let q = 0; q < 3; q++) for (const k of [-1, 1]) add('crableg', body, [-0.1 + q * 0.1, -0.06, 0.12 * k], mb => MB.tube(mb, [[0, 0, 0], [-0.02, -0.02, 0.12 * k], [-0.04, -0.08, 0.15 * k]], 0.015, 4, C('#1a1f2b')), { ph: q * 2 + (k > 0 ? 0 : 1), side: k });
    }
  }
  return { parts };
}
// how each part moves. s: { t (seconds), walk (step phase), mv (0..1 moving), blink (0..1), hop (0..1 height), seed }
function rigPose(part, s) {
  const a = part.anim, t = s.t, w = s.walk + (part.ph || 0), mv = s.mv, k = part.side || 1;
  switch (a) {
    case 'body': return { p: [0, Math.abs(Math.sin(s.walk * 2)) * 0.035 * mv, 0], R: M4.rotX(Math.sin(s.walk) * 0.04 * mv) };
    case 'leg': return { R: M4.rotZ(Math.sin(w) * (part.amp || 0.5) * mv) };
    case 'head': return { R: M4.mul3(M4.rotY(Math.sin(t * 0.7 + s.seed) * 0.35 * (1 - mv)), M4.rotZ(Math.sin(t * 2.1 + s.seed) * 0.06 + (mv ? Math.sin(s.walk * 2) * 0.05 : 0) - (s.graze || 0) * 0.9)) };
    case 'eyes': return { s: [1, s.blink, 1] };
    case 'ear': { const tw = Math.max(0, Math.sin(t * 1.3 + s.seed * 3 + k)) ** 12; return { R: M4.rotX(k * tw * 0.5) }; }
    case 'tail': return { R: M4.rotY(Math.sin(t * (mv ? 10 : 3) + s.seed) * (mv ? 0.5 : 0.25) * (part.amp || 1)) };
    case 'wing': { const f = Math.sin(t * (s.flap || 14) + s.seed) * (part.amp || 1); return { R: M4.rotX(-k * f) }; }
    case 'flipper': return { R: M4.rotX(-k * (0.25 + Math.sin(t * 7 + s.seed) * 0.25 * (0.3 + mv))) };
    case 'waddle': return { R: M4.rotX(Math.sin(s.walk * 0.9) * 0.18 * mv + Math.sin(t * 1.4) * 0.03) };
    case 'claw': return { R: M4.mul3(M4.rotY(-k * (0.2 + Math.sin(t * 2.5 + s.seed + k) * 0.25)), M4.rotZ(Math.max(0, Math.sin(t * 1.1 + s.seed)) * 0.5)) };
    case 'crableg': return { R: M4.rotY(Math.sin(s.walk * 1.5 + (part.ph || 0)) * 0.35 * mv) };
    case 'paddle': return { R: M4.rotY(Math.sin(w) * 0.5 * mv) };
    case 'peek': return { p: [-0.08 * (1 - Math.min(1, s.calm ?? 1)), 0, 0], R: M4.rotY(Math.sin(t * 0.6 + s.seed) * 0.3) };
    case 'wiggle': return { R: M4.rotY(Math.sin(s.walk * 1.5) * 0.25 * mv) };
    case 'jelly': { const q = Math.sin(t * 3 + s.seed) * 0.06 + s.hop * 0.25; return { s: [1 + q * 0.5, 1 - q, 1 + q * 0.5] }; }
    case 'hopbody': return { R: M4.rotZ(s.hop > 0.05 ? 0.25 * s.hopv : 0), s: [1, 1 + s.hop * 0.08, 1] };
    case 'hopback': return { R: M4.rotZ(-s.hop * 1.4) };
    case 'hopleg': return { R: M4.rotZ(s.hop * 0.8) };
    case 'flybody': return { p: [0, Math.sin(t * 3 + s.seed) * 0.03, 0] };
    case 'swim': return { R: M4.rotY(Math.sin(t * 6 + s.seed) * 0.12) };
    case 'jellyfloat': { const q = Math.sin(t * 2.2 + s.seed); return { p: [0, q * 0.1, 0], s: [1 + q * 0.08, 1 - q * 0.1, 1 + q * 0.08] }; }
    case 'tentacle': return { R: M4.mul3(M4.rotZ(Math.sin(t * 2.2 + (part.ph || 0)) * 0.3), M4.rotX(Math.cos(t * 1.7 + (part.ph || 0)) * 0.2)) };
    case 'knee': return { R: M4.rotZ(-Math.max(0, Math.sin(w + 1.2)) * 0.6 * mv) };
    case 'shoulder': return { R: M4.mul3(M4.rotX(Math.sin(t * 2.2) * 0.25), M4.rotZ(Math.sin(t * 1.3) * 0.2)) };
    case 'elbow': return { R: M4.rotZ(0.3 + Math.sin(t * 4) * 0.45) };
    case 'hand': return { R: M4.rotX(Math.sin(t * 4) * 0.3) };
  }
  return null;
}
// draw a rig at model matrix M
function drawRig(G, rig, M, s, outline) {
  const W = [];
  for (let i = 0; i < rig.parts.length; i++) {
    const p = rig.parts[i], pose = rigPose(p, s) || {}, at = pose.p ? [p.at[0] + pose.p[0], p.at[1] + pose.p[1], p.at[2] + pose.p[2]] : p.at;
    const L = M4.model(at, pose.R || I3, pose.s), Wm = M4.mul(p.parent < 0 ? M : W[p.parent], L); W.push(Wm);
    G.draw(p.m, Wm); if (outline) G.outline(p.m, Wm, 0.02);
  }
}
