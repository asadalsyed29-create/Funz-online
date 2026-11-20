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
  const add = (anim, parent, at, fn, o = {}) => { const mb = new MeshBuilder(); mb.lowpoly = false; mb.segK = 0.62; fn(mb); parts.push({ m: mb.build(gl), at, parent, anim, ...o }); return parts.length - 1; };
  const eyes = (parent, at, s, size) => add('eyes', parent, at, mb => MB.eyes(mb, 0, 0, 0, s, size));
  // fur with a soft, uneven shade so it never looks like flat plastic
  const fur = (a, b, k = 0.07, cut = -0.35) => (x, y, z) => shadeC(b && y < cut ? b : a, 1 + Math.sin(x * 29 + y * 17) * Math.sin(z * 23 - y * 13) * k);
  // a leg in two parts (thigh and shin) so it bends at the knee, with a foot at the end
  const leg2 = (parent, at, l1, l2, r, col, ph, foot, o = {}) => {
    const up = add('leg', parent, at, mb => mb.caps([0, 0, 0], [0, -l1, 0], r * (o.thick || 1.4), r, 10, col), { ph, amp: o.amp || 0.5 });
    add('knee', up, [0, -l1, 0], mb => { const e = [o.bend || 0, -l2, 0]; mb.caps([0, 0, 0], e, r, r * 0.82, 10, o.low || col); if (foot) foot(mb, e, r); }, { ph });
    return up;
  };
  const hoof = col => (mb, e, r) => { mb.cyl(e[0], e[1] - r * 0.9, e[2], r * 1.05, r * 0.95, r * 1.2, 10, col); mb.box(e[0] + r * 0.4, e[1] - r * 0.95, e[2] - r * 0.08, e[0] + r * 1.1, e[1] + r * 0.2, e[2] + r * 0.08, shadeC(col, 0.6), false, true); };
  const paw = col => (mb, e, r) => { mb.sph([e[0] + r * 0.5, e[1] - r * 0.4, e[2]], [r * 1.6, r * 0.75, r * 1.35], 10, col, 0); for (const z of [-0.6, 0, 0.6]) mb.sph([e[0] + r * 1.75, e[1] - r * 0.55, e[2] + z * r], r * 0.42, 6, shadeC(col, 0.92), 0); };
  const webbed = col => (mb, e, r) => { for (const a of [-0.55, 0, 0.55]) { mb.caps([e[0], e[1] - r * 0.3, e[2]], [e[0] + Math.cos(a) * r * 3, e[1] - r * 0.5, e[2] + Math.sin(a) * r * 3], r * 0.5, r * 0.4, 6, col); mb.sph([e[0] + Math.cos(a) * r * 3.1, e[1] - r * 0.5, e[2] + Math.sin(a) * r * 3.1], r * 0.55, 6, col, 0); } mb.tri2([e[0], e[1] - r * 0.45, e[2]], [e[0] + Math.cos(-0.55) * r * 3, e[1] - r * 0.5, e[2] + Math.sin(-0.55) * r * 3], [e[0] + r * 3, e[1] - r * 0.5, e[2]], col); mb.tri2([e[0], e[1] - r * 0.45, e[2]], [e[0] + r * 3, e[1] - r * 0.5, e[2]], [e[0] + Math.cos(0.55) * r * 3, e[1] - r * 0.5, e[2] + Math.sin(0.55) * r * 3], col); };
  const whiskers = (mb, x, y, len, col = '#f8f4ee') => { for (const k of [-1, 1]) for (const a of [-0.25, 0, 0.25]) mb.caps([x, y, 0.04 * k], [x - 0.02, y + a * len * 0.5, (0.04 + len) * k], 0.004, 0.003, 4, C(col)); };
  const tube2 = (mb, pts, r, seg, colFn) => { for (let k = 0; k < pts.length - 1; k++) mb.caps(pts[k], pts[k + 1], r(k / (pts.length - 1)), r((k + 1) / (pts.length - 1)), seg, colFn(k)); };
  switch (type) {
    case 'hopper': { // a fluffy bunny
      const c = C('#f4ebe2'), cream = C('#fffaf3'), pink = C('#ffb3c4'), F = fur(c);
      const body = add('hopbody', -1, [0, 0.27, 0], mb => {
        mb.sph([-0.07, 0, 0], [0.27, 0.25, 0.25], 16, F, 0.15); mb.sph([0.1, 0.05, 0], [0.19, 0.2, 0.19], 14, F, 0.1); mb.sph([0.14, -0.02, 0], [0.13, 0.15, 0.15], 12, cream, 0);
        for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; mb.sph([-0.33 + Math.cos(a) * 0.025, 0.07 + Math.sin(a) * 0.035, Math.sin(a * 1.7) * 0.035], 0.055, 8, cream, 0); }
        for (let k = 0; k < 5; k++) mb.sph([0.12 + k * 0.012, 0.16 + Math.sin(k) * 0.02, (k - 2) * 0.05], 0.05, 6, cream, 0); });
      const head = add('head', body, [0.2, 0.22, 0], mb => {
        mb.sph([0.04, 0.03, 0], [0.17, 0.15, 0.155], 16, F, 0.08); for (const k of [-1, 1]) mb.sph([0.1, -0.02, 0.075 * k], [0.085, 0.075, 0.075], 10, cream, 0);
        mb.sph([0.17, -0.02, 0], [0.07, 0.055, 0.075], 10, cream, 0); mb.box(0.205, -0.088, -0.016, 0.222, -0.05, 0.016, C('#ffffff'), false); mb.box(0.214, -0.088, -0.001, 0.223, -0.05, 0.001, C('#d8ccc0'), false, true);
        mb.caps([0.218, -0.04, -0.022], [0.212, -0.05, 0.022], 0.006, 0.006, 5, C('#c88a9a')); MB.cheeks(mb, 0.15, -0.02, 0, 0.1); whiskers(mb, 0.21, -0.025, 0.14); });
      add('nose', head, [0.228, 0.0, 0], mb => mb.sph([0, 0, 0], [0.018, 0.016, 0.027], 8, pink, 0));
      eyes(head, [0.145, 0.065, 0], 0.085, 0.046);
      for (const k of [-1, 1]) add('ear', head, [-0.03, 0.13, 0.07 * k], mb => { mb.push([0, 0, 0], M4.mul3(M4.rotX(k * 0.22), M4.rotZ(k > 0 ? -0.1 : 0.15))); mb.caps([0, 0, 0], [0, 0.32, 0], 0.045, 0.05, 10, F); mb.sph([0, 0.29, 0], [0.05, 0.08, 0.06], 10, F, 0); mb.sph([0.028, 0.18, 0], [0.025, 0.13, 0.036], 8, pink, 0); mb.pop(); }, { side: k });
      for (const k of [-1, 1]) {
        add('hopleg', body, [0.15, -0.16, 0.08 * k], mb => { mb.caps([0, 0.02, 0], [0.02, -0.07, 0], 0.045, 0.04, 8, F); mb.sph([0.045, -0.08, 0], [0.06, 0.035, 0.045], 8, cream, 0); });
        add('hopback', body, [-0.13, -0.12, 0.15 * k], mb => { mb.sph([0, 0, 0], [0.13, 0.11, 0.07], 10, F, 0.1); mb.sph([0.07, -0.11, 0.01 * k], [0.15, 0.04, 0.06], 10, cream, 0); for (const z of [-0.025, 0.025]) mb.sph([0.21, -0.12, z], 0.02, 5, C('#efe2d6'), 0); });
      }
      break;
    }
    case 'deer': { // antlerbuck: slim legs with knees, spots, a big rack of antlers
      const c = C('#b8794a'), cream = C('#f4e6cc'), dark = C('#2a1e18'), spot = (x, y, z) => y > 0.05 && Math.sin(x * 37) * Math.sin(z * 41 + y * 29) > 0.8;
      const F = (x, y, z) => x < -0.82 ? C('#fff8ee') : y < -0.4 ? cream : spot(x, y, z) ? cream : shadeC(c, 1 + Math.sin(x * 29 + y * 17) * 0.06);
      const body = add('body', -1, [0, 0.8, 0], mb => { mb.sph([0.13, 0.02, 0], [0.26, 0.22, 0.2], 16, F, 0.12); mb.sph([-0.15, 0, 0], [0.27, 0.2, 0.19], 16, F, 0.12); mb.sph([-0.02, 0.05, 0], [0.3, 0.18, 0.18], 14, F, 0.1); });
      for (const [x, z, ph, b] of [[0.24, 0.1, 0, 0.02], [0.24, -0.1, Math.PI, 0.02], [-0.25, 0.1, Math.PI, -0.04], [-0.25, -0.1, 0, -0.04]]) leg2(body, [x, -0.12, z], 0.32, 0.33, 0.04, c, ph, hoof(dark), { bend: b, low: C('#a06a40'), thick: 1.6 });
      const head = add('head', body, [0.3, 0.1, 0], mb => {
        mb.caps([0, 0, 0], [0.12, 0.3, 0], 0.1, 0.075, 12, C('#b07448')); mb.sph([0.1, 0.18, 0], [0.06, 0.09, 0.075], 10, cream, 0);
        mb.sph([0.18, 0.36, 0], [0.15, 0.115, 0.115], 16, fur(c), 0.08); mb.caps([0.24, 0.35, 0], [0.4, 0.29, 0], 0.08, 0.055, 12, C('#a8704a')); mb.sph([0.32, 0.29, 0], [0.07, 0.04, 0.06], 8, cream, 0);
        mb.sph([0.43, 0.3, 0], [0.035, 0.03, 0.045], 8, dark, 0); mb.caps([0.36, 0.26, -0.03], [0.36, 0.26, 0.03], 0.005, 0.005, 4, dark);
        for (const k of [-1, 1]) { const A = C('#efe2c6'); tube2(mb, [[0.13, 0.45, 0.05 * k], [0.1, 0.62, 0.13 * k], [0.02, 0.78, 0.21 * k], [-0.04, 0.9, 0.24 * k]], t => 0.024 - t * 0.012, 6, () => A);
          for (const [p, q] of [[[0.1, 0.6, 0.12 * k], [0.24, 0.72, 0.14 * k]], [[0.04, 0.74, 0.19 * k], [0.13, 0.88, 0.2 * k]], [[-0.02, 0.86, 0.23 * k], [-0.12, 0.96, 0.27 * k]], [[0.12, 0.52, 0.09 * k], [0.18, 0.56, 0.05 * k]]]) mb.caps(p, q, 0.016, 0.008, 6, A); } });
      eyes(head, [0.26, 0.4, 0], 0.09, 0.04);
      for (const k of [-1, 1]) add('ear', head, [0.1, 0.42, 0.12 * k], mb => { mb.push([0, 0, 0], M4.rotX(-k * 1.0)); mb.sph([0, 0.07, 0], [0.04, 0.09, 0.028], 10, c, 0); mb.sph([0.012, 0.07, 0], [0.022, 0.065, 0.018], 8, C('#e8b0a0'), 0); mb.pop(); }, { side: k });
      add('tail', body, [-0.4, 0.08, 0], mb => { mb.sph([-0.04, 0.03, 0], [0.05, 0.08, 0.05], 8, c, 0); mb.sph([-0.07, 0.01, 0], [0.025, 0.07, 0.045], 8, C('#ffffff'), 0); });
      break;
    }
    case 'fox': { // orange coat, white chest and cheeks, black socks, a big bushy tail
      const c = C('#ee7426'), w = C('#fff4e6'), dark = C('#2c201c'), F = fur(c, w, 0.07, -0.25);
      const body = add('body', -1, [0, 0.42, 0], mb => { mb.sph([0.1, 0.02, 0], [0.2, 0.17, 0.15], 14, F, 0.1); mb.sph([-0.13, 0, 0], [0.22, 0.15, 0.14], 14, F, 0.1); mb.sph([0.2, -0.02, 0], [0.1, 0.13, 0.11], 10, w, 0); });
      for (const [x, z, ph] of [[0.17, 0.08, 0], [0.17, -0.08, Math.PI], [-0.19, 0.08, Math.PI], [-0.19, -0.08, 0]]) leg2(body, [x, -0.08, z], 0.17, 0.17, 0.032, c, ph, paw(dark), { low: dark, bend: x < 0 ? -0.03 : 0.01 });
      const head = add('head', body, [0.27, 0.1, 0], mb => {
        mb.sph([0.05, 0.05, 0], [0.15, 0.13, 0.15], 16, fur(c), 0.08); for (const k of [-1, 1]) { mb.sph([0.07, 0.0, 0.09 * k], [0.09, 0.07, 0.07], 10, w, 0); mb.caps([0.04, -0.01, 0.12 * k], [-0.03, -0.03, 0.17 * k], 0.04, 0.008, 6, w); }
        mb.caps([0.12, 0.05, 0], [0.29, 0.02, 0], 0.065, 0.028, 12, c); mb.caps([0.12, 0.0, 0], [0.28, 0.0, 0], 0.055, 0.025, 10, w);
        mb.sph([0.305, 0.022, 0], [0.026, 0.022, 0.03], 8, dark, 0); mb.caps([0.22, -0.02, -0.03], [0.22, -0.02, 0.03], 0.004, 0.004, 4, dark); whiskers(mb, 0.26, 0.0, 0.12, '#3a2c26'); });
      eyes(head, [0.15, 0.09, 0], 0.068, 0.034);
      for (const k of [-1, 1]) add('ear', head, [0.0, 0.15, 0.075 * k], mb => { mb.push([0, 0, 0], M4.rotX(-k * 0.28)); mb.caps([0, 0, 0], [0, 0.16, 0], 0.065, 0.006, 8, c); mb.caps([0.012, 0.01, 0], [0.012, 0.13, 0], 0.04, 0.004, 6, w); mb.caps([-0.012, 0.005, 0], [-0.012, 0.15, 0], 0.06, 0.005, 6, dark); mb.pop(); }, { side: k });
      const t1 = add('tailseg', body, [-0.31, 0.06, 0], mb => tube2(mb, [[0, 0, 0], [-0.12, 0.04, 0], [-0.24, 0.07, 0]], t => 0.05 + t * 0.06, 12, () => c), { ph: 0 });
      add('tailseg', t1, [-0.24, 0.07, 0], mb => { tube2(mb, [[0, 0, 0], [-0.1, 0.03, 0], [-0.19, 0.08, 0]], t => 0.11 - t * 0.04, 12, k => k ? w : c); mb.sph([-0.21, 0.09, 0], 0.06, 10, w, 0); }, { ph: 0.8 });
      break;
    }
    case 'goat': { // shaggy cliff goat with a beard and ridged curly horns
      const c = C('#efeae1'), sh = C('#ddd5c6'), F = fur(c, null, 0.09);
      const body = add('body', -1, [0, 0.64, 0], mb => { mb.sph([0.09, 0.02, 0], [0.23, 0.21, 0.19], 14, F, 0.1); mb.sph([-0.14, 0, 0], [0.25, 0.2, 0.19], 14, F, 0.1);
        for (let k = 0; k < 14; k++) { const x = -0.33 + k * 0.05, z = (k % 2 ? 1 : -1) * 0.15; mb.sph([x, -0.13 - (k % 3) * 0.02, z], [0.06, 0.09, 0.05], 8, sh, 0); mb.sph([x + 0.02, -0.15, -z], [0.05, 0.08, 0.05], 8, sh, 0); } });
      for (const [x, z, ph] of [[0.2, 0.09, 0], [0.2, -0.09, Math.PI], [-0.22, 0.09, Math.PI], [-0.22, -0.09, 0]]) leg2(body, [x, -0.12, z], 0.24, 0.26, 0.038, c, ph, hoof(C('#3e3a34')), { low: C('#c8c2b6'), thick: 1.7 });
      const head = add('head', body, [0.27, 0.1, 0], mb => {
        mb.caps([0, 0, 0], [0.1, 0.2, 0], 0.09, 0.075, 12, F); mb.sph([0.17, 0.26, 0], [0.14, 0.11, 0.11], 14, F, 0.08); mb.caps([0.2, 0.25, 0], [0.33, 0.19, 0], 0.07, 0.05, 10, c); mb.sph([0.345, 0.2, 0], [0.025, 0.03, 0.04], 8, C('#c0a8a0'), 0);
        for (let k = 0; k < 4; k++) mb.caps([0.25 + k * 0.005, 0.16, (k - 1.5) * 0.012], [0.22 + k * 0.01, 0.0 - k * 0.01, (k - 1.5) * 0.015], 0.025, 0.008, 6, sh);
        for (const k of [-1, 1]) { const pts = [[0.12, 0.36, 0.05 * k], [0.08, 0.46, 0.08 * k], [-0.02, 0.51, 0.1 * k], [-0.1, 0.46, 0.12 * k], [-0.11, 0.37, 0.13 * k], [-0.06, 0.32, 0.13 * k]]; tube2(mb, pts, t => 0.04 * (1 - t) + 0.012, 8, i => i % 2 ? C('#5e574c') : C('#7a7264')); } });
      eyes(head, [0.24, 0.3, 0], 0.075, 0.035);
      for (const k of [-1, 1]) add('ear', head, [0.1, 0.3, 0.1 * k], mb => { mb.push([0, 0, 0], M4.rotX(k * 1.25)); mb.sph([0, 0.06, 0], [0.03, 0.075, 0.022], 8, c, 0); mb.sph([0.01, 0.06, 0], [0.018, 0.055, 0.014], 6, C('#e8c0b0'), 0); mb.pop(); }, { side: k });
      add('tail', body, [-0.37, 0.12, 0], mb => mb.sph([-0.02, 0.05, 0], [0.035, 0.07, 0.035], 8, c, 0));
      break;
    }
    case 'crab': { // bumpy shell, jointed legs, claws that open and close, eyes on stalks
      const c = C('#e4513c'), lite = C('#f58466'), under = C('#f4c0a0');
      const body = add('body', -1, [0, 0.22, 0], mb => { mb.sph([0, 0, 0], [0.22, 0.13, 0.3], 18, (x, y) => y < -0.4 ? under : shadeC(c, 1 + Math.sin(x * 20) * Math.sin(y * 9 + 1) * 0.05), 0.2);
        for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI - Math.PI / 2; mb.sph([Math.cos(a) * 0.12 - 0.02, 0.1 + Math.sin(k) * 0.01, Math.sin(a) * 0.18], 0.03, 6, lite, 0); }
        for (const k of [-1, 1]) for (let q = 0; q < 3; q++) mb.cone(0.13 - q * 0.04, 0.0, (0.25 + q * 0.015) * k, 0.025, 0.04, 5, lite);
        mb.sph([0.2, -0.04, 0], [0.03, 0.025, 0.06], 6, C('#7a2a22'), 0); });
      for (const k of [-1, 1]) {
        const arm = add('claw', body, [0.13, 0, 0.24 * k], mb => { tube2(mb, [[0, 0, 0], [0.12, 0.05, 0.09 * k], [0.22, 0.08, 0.06 * k]], t => 0.035 - t * 0.005, 8, () => c); mb.sph([0.28, 0.09, 0.05 * k], [0.1, 0.075, 0.075], 12, c, 0.1); mb.caps([0.34, 0.08, 0.05 * k], [0.45, 0.08, 0.03 * k], 0.035, 0.012, 8, lite); });
        add('pincer', arm, [0.33, 0.12, 0.05 * k], mb => mb.caps([0, 0, 0], [0.11, -0.01, -0.02 * k], 0.026, 0.009, 8, lite), { side: k });
        for (let q = 0; q < 4; q++) { const up = add('crableg', body, [-0.13 + q * 0.07, -0.03, 0.27 * k], mb => mb.caps([0, 0, 0], [-0.02, 0.06, 0.13 * k], 0.024, 0.02, 6, c), { ph: q * 1.6 + (k > 0 ? 0 : 0.8), side: k });
          add('still', up, [-0.02, 0.06, 0.13 * k], mb => { mb.caps([0, 0, 0], [-0.04, -0.2, 0.08 * k], 0.02, 0.008, 6, shadeC(c, 0.9)); }); }
        const stalk = add('antenna', body, [0.15, 0.1, 0.065 * k], mb => mb.caps([0, 0, 0], [0.02, 0.12, 0.01 * k], 0.016, 0.014, 6, c), { side: k });
        add('eyes', stalk, [0.03, 0.14, 0.01 * k], mb => { mb.sph([0, 0, 0], 0.035, 8, C('#ffffff'), 0); mb.sph([0.02, 0.005, 0], [0.02, 0.026, 0.024], 8, C('#1a1a26'), 0); mb.sph([0.03, 0.017, -0.006], 0.007, 4, [1, 1, 1, 1], 0); });
      }
      break;
    }
    case 'turtle': { // a domed shell made of plates, flippers, a beaky head
      const shell = C('#4a8f4c'), plate = C('#5aa65a'), rim = C('#3a6e3c'), skin = C('#93c47e');
      const body = add('body', -1, [0, 0.2, 0], mb => {
        mb.sph([0, 0, 0], [0.37, 0.2, 0.3], 18, (x, y) => y < 0.1 ? C('#e2cf96') : shell, 0.2); mb.sph([0, -0.06, 0], [0.33, 0.07, 0.27], 12, C('#e2cf96'), 0);
        const pl = [[0.15, 0.17, 0], [-0.02, 0.2, 0], [-0.19, 0.16, 0], [0.12, 0.13, 0.15], [0.12, 0.13, -0.15], [-0.08, 0.15, 0.16], [-0.08, 0.15, -0.16], [-0.24, 0.1, 0.12], [-0.24, 0.1, -0.12]];
        for (const p of pl) { const ny = p[1] / 0.2; mb.push(p, null); mb.sph([0, 0, 0], [0.085, 0.03 + ny * 0.01, 0.075], 10, (x, y) => y > 0.4 ? plate : shadeC(plate, 0.75), 0); mb.pop(); }
        for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283; mb.sph([Math.cos(a) * 0.35, -0.02, Math.sin(a) * 0.28], [0.05, 0.03, 0.05], 6, k % 2 ? rim : shadeC(rim, 1.15), 0); } });
      const head = add('peek', body, [0.34, 0.03, 0], mb => { mb.caps([-0.1, 0, 0], [0.06, 0.03, 0], 0.07, 0.065, 10, skin); mb.sph([0.11, 0.05, 0], [0.11, 0.09, 0.085], 14, (x, y, z) => Math.sin(x * 30) * Math.sin(z * 30) > 0.7 ? shadeC(skin, 0.85) : skin, 0.1);
        mb.caps([0.18, 0.02, 0], [0.22, 0.0, 0], 0.04, 0.012, 8, C('#6a7a4a')); mb.caps([0.17, 0.0, -0.05], [0.17, 0.0, 0.05], 0.005, 0.005, 4, C('#3a4a2a')); MB.cheeks(mb, 0.17, 0.03, 0, 0.065, '#ff9fb0'); });
      eyes(head, [0.15, 0.09, 0], 0.055, 0.03);
      for (const [x, z, ph, s] of [[0.22, 0.24, 0, 1.2], [-0.22, 0.24, Math.PI, 0.8], [0.22, -0.24, Math.PI, 1.2], [-0.22, -0.24, 0, 0.8]]) add('paddle', body, [x, -0.08, z], mb => { const k = Math.sign(z); mb.push([0, 0, 0], M4.rotY(-k * (x > 0 ? 0.5 : -0.4))); mb.sph([0.03, -0.03, 0.07 * k * s], [0.07, 0.035, 0.11 * s], 10, (xx, yy, zz) => Math.sin(xx * 40 + zz * 30) > 0.6 ? shadeC(skin, 0.82) : skin, 0); mb.pop(); }, { ph });
      add('tail', body, [-0.34, -0.04, 0], mb => mb.caps([0, 0, 0], [-0.1, -0.02, 0], 0.035, 0.008, 6, skin));
      break;
    }
    case 'lizard': { // sun lizard: banded, a crest of spikes, sprawled legs with toes, a long swishy tail
      const c = C('#e0a83a'), band = C('#b4602a'), belly = C('#f6dca0'), crest = C('#e8502a');
      const F = (x, y, z) => y < -0.4 ? belly : Math.sin(x * 14) > 0.55 ? band : shadeC(c, 1 + Math.sin(z * 30) * 0.04);
      const body = add('wiggle', -1, [0, 0.12, 0], mb => { mb.sph([0.03, 0, 0], [0.22, 0.075, 0.1], 14, F, 0.2); mb.sph([-0.12, 0, 0], [0.12, 0.065, 0.085], 10, F, 0.2); for (let k = 0; k < 6; k++) mb.cone(0.15 - k * 0.06, 0.06, 0, 0.022, 0.05 - Math.abs(k - 2) * 0.006, 4, crest); });
      const head = add('head', body, [0.2, 0.01, 0], mb => { mb.sph([0.06, 0.01, 0], [0.09, 0.06, 0.075], 12, c, 0.15); mb.caps([0.08, 0.0, 0], [0.18, -0.01, 0], 0.055, 0.03, 10, c); mb.sph([0.04, -0.05, 0], [0.05, 0.035, 0.045], 8, C('#ff7a3a'), 0); mb.caps([0.16, -0.025, -0.025], [0.16, -0.025, 0.025], 0.004, 0.004, 4, C('#5a3a1a')); for (let k = 0; k < 3; k++) mb.cone(0.02 - k * 0.03, 0.055, 0, 0.015, 0.035, 4, crest); });
      eyes(head, [0.1, 0.045, 0], 0.05, 0.026);
      const toes = (mb, e, r) => { for (const a of [-0.6, 0, 0.6]) mb.caps(e, [e[0] + Math.cos(a) * 0.05, e[1] - 0.005, e[2] + Math.sin(a) * 0.05], r * 0.5, r * 0.35, 5, c); };
      for (const [x, z, ph] of [[0.12, 1, 0], [0.12, -1, Math.PI], [-0.13, 1, Math.PI], [-0.13, -1, 0]]) { const up = add('crableg', body, [x, -0.01, 0.07 * z], mb => mb.caps([0, 0, 0], [0.02, -0.01, 0.1 * z], 0.024, 0.02, 6, c), { ph, side: z }); add('still', up, [0.02, -0.01, 0.1 * z], mb => { mb.caps([0, 0, 0], [0.03, -0.1, 0.03 * z], 0.019, 0.015, 6, c); toes(mb, [0.03, -0.105, 0.03 * z], 0.02); }); }
      const t1 = add('tailseg', body, [-0.22, 0, 0], mb => tube2(mb, [[0, 0, 0], [-0.14, -0.01, 0]], t => 0.06 - t * 0.02, 8, () => c), { ph: 0 });
      const t2 = add('tailseg', t1, [-0.14, -0.01, 0], mb => tube2(mb, [[0, 0, 0], [-0.14, -0.02, 0]], t => 0.04 - t * 0.015, 8, () => band), { ph: 0.9 });
      add('tailseg', t2, [-0.14, -0.02, 0], mb => tube2(mb, [[0, 0, 0], [-0.16, -0.02, 0]], t => 0.025 - t * 0.02, 8, () => c), { ph: 1.8 });
      break;
    }
    case 'penguin': { // snowpuff: fluffy, a wispy tuft, a tiny scarf, webbed feet
      const dark = C('#2c3142'), w = C('#ffffff'), org = C('#ffa13a');
      const body = add('waddle', -1, [0, 0.05, 0], mb => { mb.sph([0, 0.33, 0], [0.3, 0.36, 0.28], 18, (x, y) => x > 0.3 && y < 0.6 ? w : shadeC(dark, 1 + Math.sin(y * 20) * 0.04), 0.1);
        for (let k = 0; k < 10; k++) { const a = (k / 10 - 0.5) * 2.2; mb.sph([Math.cos(a) * 0.26, 0.08, Math.sin(a) * 0.24], 0.06, 6, k > 2 && k < 7 ? w : dark, 0); }
        mb.caps([0.27, 0.52, 0], [0.37, 0.505, 0], 0.045, 0.012, 8, org); mb.caps([0.27, 0.49, 0], [0.35, 0.485, 0], 0.035, 0.01, 8, shadeC(org, 0.85)); MB.cheeks(mb, 0.27, 0.48, 0, 0.16);
        mb.tor([0, 0.4, 0], 0.255, 0.04, 22, 6, (a) => Math.floor(a * 3) % 2 ? C('#e8343a') : C('#ffffff')); mb.caps([-0.22, 0.4, 0.1], [-0.3, 0.22, 0.14], 0.04, 0.035, 6, C('#e8343a')); });
      add('tuft', body, [0.05, 0.68, 0], mb => { for (const [a, b] of [[-0.3, 0.1], [0, 0.13], [0.35, 0.09]]) mb.caps([0, 0, 0], [Math.sin(a) * 0.05 + 0.02, b, Math.sin(a) * 0.04], 0.02, 0.005, 5, dark); });
      eyes(body, [0.24, 0.6, 0], 0.09, 0.045);
      for (const k of [-1, 1]) { add('flipper', body, [0, 0.46, 0.27 * k], mb => { mb.push([0, 0, 0], M4.rotX(k * 0.2)); mb.sph([0, -0.15, 0.02 * k], [0.1, 0.19, 0.03], 12, dark, 0.1); mb.pop(); }, { side: k });
        add('leg', body, [0.08, 0.05, 0.1 * k], mb => webbed(org)(mb, [0, 0, 0], 0.03), { ph: k > 0 ? 0 : Math.PI, amp: 0.3 }); }
      break;
    }
    case 'slime': { // bog blob: see-through jelly with a glowing core, bubbles, drips and a little sprout
      const body = add('jelly', -1, [0, 0, 0], mb => {
        mb.sph([0, 0.28, 0], [0.38, 0.3, 0.36], 20, (x, y) => C(y > 0.5 ? '#9af07a' : '#62c84e', 0.55), 0.1);
        for (let k = 0; k < 5; k++) { const a = k * 1.3; mb.sph([Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.28], [0.07, 0.06, 0.07], 8, C('#58b844', 0.6), 0); }
        mb.sph([0, 0.24, 0], 0.13, 10, glowC(C('#d4ff9a')), 0); for (let k = 0; k < 7; k++) mb.sph([Math.sin(k * 2.1) * 0.2, 0.15 + (k % 3) * 0.1, Math.cos(k * 2.1) * 0.18], 0.025 + (k % 2) * 0.012, 6, C('#e8ffd8', 0.8), 0);
        mb.caps([0, 0.56, 0], [0.02, 0.66, 0], 0.012, 0.01, 5, C('#4a8a2a')); for (const k of [-1, 1]) mb.sph([0.03, 0.68, 0.04 * k], [0.02, 0.012, 0.045], 6, C('#6ad04a'), 0);
        mb.caps([0.335, 0.27, -0.06], [0.345, 0.25, 0], 0.01, 0.01, 4, C('#1e3a1a')); mb.caps([0.345, 0.25, 0], [0.335, 0.27, 0.06], 0.01, 0.01, 4, C('#1e3a1a')); });
      eyes(body, [0.32, 0.38, 0], 0.11, 0.055);
      break;
    }
    case 'frog': { // big eyes on top, a wide smile, spots, a throat that puffs, webbed feet
      const c = C('#58b846'), belly = C('#e8f2b0'), spot = C('#3a8a32');
      const body = add('hopbody', -1, [0, 0.18, 0], mb => { mb.sph([0, 0.02, 0], [0.26, 0.19, 0.24], 16, (x, y, z) => y < -0.3 ? belly : Math.sin(x * 21 + 1) * Math.sin(z * 19) > 0.65 ? spot : c, 0.15);
        mb.caps([0.235, 0.02, -0.11], [0.255, 0.035, 0], 0.008, 0.008, 4, C('#1e3a1a')); mb.caps([0.255, 0.035, 0], [0.235, 0.02, 0.11], 0.008, 0.008, 4, C('#1e3a1a'));
        for (const k of [-1, 1]) { mb.sph([0.14, 0.18, k * 0.12], 0.09, 12, c, 0); mb.sph([0.24, 0.07, 0.03 * k], 0.008, 4, C('#1e3a1a'), 0); } });
      add('throat', body, [0.17, -0.08, 0], mb => mb.sph([0, 0, 0], [0.07, 0.05, 0.08], 10, C('#f4f8c8'), 0));
      eyes(body, [0.2, 0.22, 0], 0.12, 0.045);
      for (const k of [-1, 1]) {
        add('hopback', body, [-0.12, -0.09, 0.19 * k], mb => { mb.sph([0.0, 0, 0], [0.13, 0.075, 0.075], 12, c, 0.2); mb.caps([0.08, -0.03, 0.02 * k], [-0.04, -0.08, 0.05 * k], 0.04, 0.03, 8, c); webbed(c)(mb, [-0.04, -0.08, 0.05 * k], 0.022); });
        add('hopleg', body, [0.15, -0.1, 0.13 * k], mb => { mb.caps([0, 0, 0], [0.04, -0.07, 0.02 * k], 0.03, 0.025, 8, c); webbed(c)(mb, [0.04, -0.07, 0.02 * k], 0.017); });
      }
      break;
    }
    case 'moth': case 'butterfly': {
      const moth = type === 'moth', bc = C(moth ? '#6a5a7a' : '#2a2a36');
      const body = add('flybody', -1, [0, 0, 0], mb => { mb.sph([0.04, 0, 0], [0.06, 0.05, 0.05], 10, moth ? C('#e8e0f0') : bc, 0); mb.sph([0.1, 0.005, 0], 0.04, 8, bc, 0);
        for (let k = 0; k < 4; k++) mb.sph([-0.03 - k * 0.04, -0.005 * k, 0], [0.035, 0.034 - k * 0.006, 0.034 - k * 0.006], 8, moth ? (k % 2 ? C('#8a7a9a') : C('#a898b8')) : bc, 0);
        for (const k of [-1, 1]) { if (moth) { MB.tube(mb, [[0.12, 0.03, 0.02 * k], [0.17, 0.09, 0.07 * k], [0.2, 0.12, 0.1 * k]], 0.006, 4, C('#d8c8e8')); for (let q = 0; q < 4; q++) { const p = [0.14 + q * 0.018, 0.05 + q * 0.02, (0.04 + q * 0.018) * k]; mb.caps(p, [p[0] + 0.02, p[1] + 0.015, p[2] - 0.012 * k], 0.003, 0.002, 3, C('#d8c8e8')); mb.caps(p, [p[0] - 0.005, p[1] + 0.022, p[2] + 0.015 * k], 0.003, 0.002, 3, C('#d8c8e8')); } }
          else { MB.tube(mb, [[0.12, 0.03, 0.02 * k], [0.18, 0.11, 0.06 * k], [0.2, 0.15, 0.08 * k]], 0.004, 4, bc); mb.sph([0.205, 0.155, 0.082 * k], 0.012, 5, bc, 0); } } });
      for (const k of [-1, 1]) add('wing', body, [0.03, 0.02, 0.03 * k], mb => {
        if (moth) { mb.sph([0.04, 0, 0.13 * k], [0.1, 0.01, 0.15], 14, (x, y, z) => { const r = Math.hypot(x + 0.1, z * k - 0.2); return r < 0.25 ? glowC(C('#fff2a0')) : r < 0.4 ? glowC(C('#ff9af0')) : Math.abs(z) > 0.85 ? glowC(C('#e0c8ff')) : glowC(C('#b090f0')); }, 0); mb.sph([-0.08, -0.005, 0.1 * k], [0.08, 0.009, 0.1], 12, (x, y, z) => Math.hypot(x, z) > 0.8 ? glowC(C('#ffd8f8')) : glowC(C('#c8a8ff')), 0); }
        else { const F = (x, y, z) => Math.abs(Math.sin(Math.atan2(z, x) * 5)) < 0.12 ? C('#1a1a22') : Math.hypot(x, z) > 0.88 ? (Math.sin(Math.atan2(z, x) * 14) > 0.3 ? C('#ffffff') : C('#1a1a22')) : Math.hypot(x, z) < 0.5 ? C('#ffc83a') : C('#ff7a2a');
          mb.sph([0.05, 0, 0.12 * k], [0.095, 0.008, 0.135], 14, F, 0); mb.sph([-0.07, 0, 0.09 * k], [0.07, 0.008, 0.09], 12, F, 0); mb.caps([-0.1, 0, 0.13 * k], [-0.16, 0, 0.16 * k], 0.012, 0.004, 4, C('#1a1a22')); }
      }, { side: k, amp: 1.1 });
      break;
    }
    case 'bird': { // a little songbird with a crest, a two-part beak, a fanned tail and feathery wings
      const c = C('#3f86e6'), br = C('#ffb36a'), w = C('#eef4ff');
      const body = add('flybody', -1, [0, 0, 0], mb => { mb.sph([0, 0, 0], [0.19, 0.13, 0.13], 14, (x, y) => y < -0.25 ? w : x > 0.4 && y < 0.3 ? br : c, 0.1); mb.sph([0.14, 0.07, 0], [0.09, 0.085, 0.085], 12, c, 0);
        mb.caps([0.21, 0.075, 0], [0.3, 0.065, 0], 0.028, 0.006, 8, C('#ffc43a')); mb.caps([0.21, 0.055, 0], [0.28, 0.055, 0], 0.02, 0.005, 8, C('#e8a02a'));
        for (const [a, l] of [[0.5, 0.09], [0.9, 0.11], [1.3, 0.08]]) mb.caps([0.12, 0.14, 0], [0.12 - Math.cos(a) * l, 0.14 + Math.sin(a) * l, 0], 0.015, 0.004, 5, c);
        for (const z of [-0.06, 0, 0.06]) mb.sph([-0.27, 0.02, z * 1.2], [0.1, 0.01, 0.035], 8, shadeC(c, 0.85), 0);
        for (const k of [-1, 1]) mb.caps([0.02, -0.12, 0.04 * k], [-0.03, -0.15, 0.04 * k], 0.012, 0.01, 4, C('#d8a050')); });
      eyes(body, [0.17, 0.09, 0], 0.07, 0.025);
      for (const k of [-1, 1]) add('wing', body, [-0.02, 0.05, 0.08 * k], mb => { mb.sph([0, 0, 0.13 * k], [0.11, 0.015, 0.15], 12, c, 0); for (let q = 0; q < 4; q++) mb.sph([-0.06 - q * 0.015, -0.003, (0.18 + q * 0.035) * k], [0.07, 0.008, 0.03], 8, q % 2 ? shadeC(c, 0.8) : C('#2a5aa8'), 0); }, { side: k, amp: 0.8 });
      break;
    }
    case 'fish': { // a proper fish shape with stripes and fins
      const c = C('#ff9a4a'), lite = C('#fff0d8');
      const body = add('swim', -1, [0, 0, 0], mb => {
        mb.push([0, 0, 0], M4.rotZ(-Math.PI / 2), [1, 1, 0.48]);
        mb.lathe([[0, -0.2], [0.04, -0.18], [0.09, -0.08], [0.13, 0.04], [0.12, 0.13], [0.08, 0.2], [0, 0.23]], 16, (t, ph) => Math.sin(ph) < -0.2 && Math.cos(ph) < 0.5 ? lite : (t > 0.35 && t < 0.45) || (t > 0.68 && t < 0.76) ? C('#ffffff') : c, 0);
        mb.pop();
        mb.tri2([0.08, 0.1, 0], [-0.1, 0.18, 0], [-0.08, 0.1, 0], shadeC(c, 0.85)); mb.tri2([0.0, -0.1, 0], [-0.12, -0.15, 0], [-0.1, -0.08, 0], shadeC(c, 0.85));
        for (const k of [-1, 1]) mb.tri2([0.08, -0.03, 0.055 * k], [0.02, -0.08, 0.1 * k], [0.0, -0.02, 0.06 * k], shadeC(c, 0.9));
        mb.caps([0.22, -0.02, -0.02], [0.22, -0.02, 0.02], 0.005, 0.005, 4, C('#7a3a1a')); });
      eyes(body, [0.13, 0.03, 0], 0.055, 0.028);
      add('tail', body, [-0.19, 0, 0], mb => { mb.tri2([0, 0, 0], [-0.13, 0.12, 0], [-0.08, 0, 0], shadeC(c, 0.9)); mb.tri2([0, 0, 0], [-0.08, 0, 0], [-0.13, -0.12, 0], shadeC(c, 0.9)); }, { amp: 1.4 });
      break;
    }
    case 'jelly': { // a glowing bell with a frilly rim, frilly arms and long thin tentacles
      const body = add('jellyfloat', -1, [0, 0, 0], mb => {
        mb.lathe([[0.3, 0], [0.33, 0.07], [0.29, 0.2], [0.18, 0.31], [0, 0.35]], 18, (t) => C(t > 0.6 ? '#ffc8f0' : '#e898e0', 0.5), 0);
        for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; mb.sph([Math.cos(a) * 0.3, -0.005, Math.sin(a) * 0.3], [0.04, 0.025, 0.04], 6, C('#ffb8f0', 0.6), 0); }
        for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + 0.4; mb.sph([Math.cos(a) * 0.09, 0.17, Math.sin(a) * 0.09], [0.06, 0.02, 0.035], 8, glowC(C('#ffe0fa')), 0); }
        mb.sph([0, 0.1, 0], 0.08, 8, glowC(C('#ffc8f0')), 0); });
      for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283; add('tentacle', body, [Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06], mb => { for (let q = 0; q < 6; q++) mb.sph([Math.sin(q * 1.3) * 0.03, -0.06 - q * 0.08, Math.cos(q * 1.1) * 0.03], [0.04 - q * 0.004, 0.05, 0.02], 6, C('#ff9ad8', 0.75), 0); }, { ph: k * 1.5 }); }
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.2; add('tentacle', body, [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], mb => MB.tube(mb, [[0, 0, 0], [0.03, -0.3, 0], [-0.02, -0.6, 0.02], [0.02, -0.95, 0]], t => 0.012 - t * 0.008, 4, glowC(C('#ff9ad8'))), { ph: k }); }
      eyes(body, [0.26, 0.13, 0], 0.08, 0.035);
      break;
    }
    case 'beetle': default: { // cave beetle: a horn, a split shell with glowing lines, jointed legs, feelers
      const dk = C('#20242f'), sh = C('#2c3240');
      const body = add('body', -1, [0, 0.15, 0], mb => {
        for (const k of [-1, 1]) mb.sph([-0.04, 0.02, 0.07 * k], [0.19, 0.12, 0.085], 14, (x, y, z) => y > 0.2 && Math.abs(Math.sin(x * 9)) < 0.18 ? glowC(C('#5ff0e0')) : z * k > 0.85 ? glowC(C('#3ac8d8')) : sh, 0.1);
        mb.sph([0.15, 0.0, 0], [0.08, 0.08, 0.1], 10, dk, 0); mb.caps([-0.04, 0.13, 0], [-0.04, 0.13, 0.001], 0.004, 0.004, 4, dk); mb.sph([-0.04, -0.06, 0], [0.18, 0.05, 0.13], 10, dk, 0); });
      const head = add('head', body, [0.21, -0.03, 0], mb => { mb.sph([0.02, 0, 0], [0.07, 0.06, 0.08], 10, dk, 0); mb.caps([0.05, 0.03, 0], [0.12, 0.12, 0], 0.025, 0.008, 6, C('#3a4252')); mb.caps([0.12, 0.12, 0], [0.1, 0.17, 0], 0.008, 0.004, 5, C('#3a4252')); });
      eyes(head, [0.07, 0.02, 0], 0.05, 0.02);
      for (const k of [-1, 1]) add('antenna', head, [0.06, 0.04, 0.04 * k], mb => MB.tube(mb, [[0, 0, 0], [0.05, 0.07, 0.04 * k], [0.12, 0.1, 0.08 * k]], 0.006, 4, dk), { side: k });
      for (let q = 0; q < 3; q++) for (const k of [-1, 1]) { const up = add('crableg', body, [0.08 - q * 0.08, -0.05, 0.1 * k], mb => mb.caps([0, 0, 0], [0.0, 0.03, 0.1 * k], 0.016, 0.013, 5, dk), { ph: q * 2 + (k > 0 ? 0 : 1), side: k });
        add('still', up, [0, 0.03, 0.1 * k], mb => { mb.caps([0, 0, 0], [(q - 1) * 0.03, -0.13, 0.06 * k], 0.012, 0.006, 5, dk); }); }
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
    case 'nose': { const q = Math.max(0, Math.sin(t * 11 + s.seed)) * (Math.sin(t * 0.8 + s.seed) > 0 ? 1 : 0); return { s: [1, 1 + q * 0.18, 1 + q * 0.12] }; }
    case 'tailseg': return { R: M4.mul3(M4.rotY(Math.sin(t * (mv > 0.5 ? 7 : 2.6) - (part.ph || 0) + s.seed) * (0.18 + mv * 0.2) * (part.amp || 1)), M4.rotZ(Math.sin(t * 1.3 - (part.ph || 0)) * 0.06)) };
    case 'pincer': return { R: M4.rotY(-k * (0.05 + Math.max(0, Math.sin(t * 3 + s.seed + k)) * 0.5)) };
    case 'throat': { const q = (Math.sin(t * 6 + s.seed) * 0.5 + 0.5) * (Math.sin(t * 0.9 + s.seed) > 0.3 ? 1 : 0); return { s: [1 + q * 0.5, 1 + q * 0.7, 1 + q * 0.5] }; }
    case 'antenna': return { R: M4.mul3(M4.rotX(Math.sin(t * 2.6 + s.seed + k) * 0.18), M4.rotZ(Math.sin(t * 1.9 + s.seed) * 0.12)) };
    case 'tuft': return { R: M4.rotX(Math.sin(t * 2.2 + s.seed) * 0.15) };
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
