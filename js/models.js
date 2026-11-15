// Models for players, hats, items and creatures.
const HATS = { none: 'None', cap: 'Cap', beanie: 'Beanie', crown: 'Crown', flower: 'Flower', headphones: 'Headphones', tophat: 'Top hat', antenna: 'Antenna', halo: 'Halo' };

const ITEMS = {
  shell: { name: 'Shell', color: '#ffb3a7', use: 'Speed boost for 20 seconds', time: 20, eff: 'fast' },
  mushroom: { name: 'Mushroom', color: '#e0543c', use: 'Grow big for 20 seconds', time: 20, eff: 'big' },
  feather: { name: 'Feather', color: '#f4f1e8', use: 'Super jump for 20 seconds', time: 20, eff: 'superJump' },
  crystal: { name: 'Crystal', color: '#7fe0ff', use: 'Glow in the dark for 90 seconds', time: 90, eff: 'glow' },
  gem: { name: 'Gem', color: '#ff6ad5', use: 'Shiny! Found in caves and pyramids' },
  relic: { name: 'Relic', color: '#d8b46a', use: 'An old thing from long ago' },
  star: { name: 'Station star', color: '#c8fbff', use: 'From the top of the abandoned station!' },
  coin: { name: 'Coin', color: '#ffcf4a', use: 'Collect them all!' },
  trophy: { name: 'Parkour trophy', color: '#ffc45a', use: 'You beat the parkour climb!' },
};

function ballModel(gl, color, hat) {
  const mb = new MeshBuilder(), c = hex(color), light = mixC(c, [1, 1, 1, 1], 0.5), dark = shadeC(c, 0.72);
  mb.ico(0, 0, 0, 0.45, 2, (x, y, z) => {
    if (Math.abs(z) < 0.16) return light;                      // band around the middle
    if (Math.hypot(x, y) < 0.32 && z > 0.85) return dark;       // badges on the sides
    if (Math.hypot(x, y) < 0.32 && z < -0.85) return dark;
    return shadeC(c, 0.95 + y * 0.08);
  });
  const H = (x0, y0, z0, x1, y1, z1, col) => mb.bevel(x0, y0, z0, x1, y1, z1, hex(col), 0.03);
  switch (hat) {
    case 'cap': mb.ico(0, 0.36, 0, 0.27, 1, (x, y) => y > -0.1 ? hex('#e8eef7') : hex('#c9d3e2'), false, m => m[1] > -0.05); H(0.1, 0.36, -0.2, 0.5, 0.42, 0.2, '#4a8ae8'); mb.ico(0, 0.63, 0, 0.04, 0, () => hex('#4a8ae8')); break;
    case 'beanie': mb.ico(0, 0.34, 0, 0.29, 1, (x, y) => Math.abs(y - 0.5) < 0.12 ? hex('#ffffff') : hex('#3d4b7a'), false, m => m[1] > 0); mb.cyl(0, 0.3, 0, 0.3, 0.3, 0.1, 10, hex('#5b6ba3')); mb.ico(0, 0.68, 0, 0.08, 1, () => hex('#ffffff')); break;
    case 'crown': {
      const g = hex('#ffcf4a'); mb.cyl(0, 0.38, 0, 0.26, 0.28, 0.16, 10, g);
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; mb.cyl(Math.cos(a) * 0.22, 0.54, Math.sin(a) * 0.22, 0.07, 0, 0.16, 4, g); mb.ico(Math.cos(a) * 0.27, 0.45, Math.sin(a) * 0.27, 0.035, 0, () => glowC(hex(k % 2 ? '#ff5a6e' : '#5aa9ff'))); }
      break;
    }
    case 'flower': for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; mb.ico(0.12 + Math.cos(a) * 0.1, 0.44, Math.sin(a) * 0.1, 0.07, 0, () => hex('#ff9fc0')); } mb.ico(0.12, 0.45, 0, 0.06, 0, () => hex('#ffe066')); break;
    case 'headphones': mb.cyl(0, 0.43, 0, 0.05, 0.05, 0.05, 6, hex('#2a2f3a')); for (const s of [-1, 1]) { mb.at([0, 0, s * 0.44], M4.rotX(Math.PI / 2)); mb.cyl(0, -0.06, 0, 0.14, 0.14, 0.12, 10, hex('#2a2f3a')); mb.cyl(0, s > 0 ? 0.06 : -0.07, 0, 0.1, 0.1, 0.01, 10, glowC(hex('#5ff0e0'))); mb.reset(); } for (let k = 0; k < 8; k++) { const a0 = k / 8 * Math.PI, a1 = (k + 1) / 8 * Math.PI; mb.box(-0.04, Math.sin(a0) * 0.47, -Math.cos(a0) * 0.47 - 0.03, 0.04, Math.sin(a1) * 0.47 + 0.03, -Math.cos(a1) * 0.47 + 0.03, hex('#2a2f3a')); } break;
    case 'tophat': mb.cyl(0, 0.38, 0, 0.38, 0.38, 0.04, 12, hex('#1e2130')); mb.cyl(0, 0.42, 0, 0.22, 0.24, 0.42, 12, hex('#1e2130')); mb.cyl(0, 0.46, 0, 0.235, 0.235, 0.08, 12, hex('#b0503c')); break;
    case 'antenna': mb.cyl(0, 0.4, 0, 0.03, 0.02, 0.4, 5, hex('#c8ccd4')); mb.ico(0, 0.84, 0, 0.08, 1, () => glowC(hex('#7be36b'))); break;
    case 'halo': for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; mb.ico(Math.cos(a) * 0.24, 0.62, Math.sin(a) * 0.24, 0.045, 0, () => glowC(hex('#fff2a8'))); } break;
  }
  return mb.build(gl);
}

function itemModel(gl, type) {
  const mb = new MeshBuilder(), c = hex(ITEMS[type].color), g = glowC(c);
  switch (type) {
    case 'coin': mb.at([0, 0, 0], M4.rotX(Math.PI / 2)); mb.cyl(0, -0.05, 0, 0.26, 0.26, 0.1, 12, g); mb.cyl(0, 0.05, 0, 0.15, 0.15, 0.02, 6, hex('#fff1b0', 0.9)); break;
    case 'mushroom': mb.cyl(0, -0.28, 0, 0.08, 0.07, 0.26, 6, hex('#f4ead8')); mb.ico(0, -0.02, 0, 0.24, 1, (x, y) => y > 0.6 && Math.abs(x) < 0.3 ? hex('#ffffff') : c, false, m => m[1] > -0.1); break;
    case 'feather': mb.at([0, 0, 0], M4.rotZ(0.4)); mb.cyl(0, -0.3, 0, 0.02, 0.01, 0.6, 3, hex('#c8bfae')); for (let k = 0; k < 6; k++) { const y = -0.15 + k * 0.07, w = 0.12 - Math.abs(k - 2.5) * 0.02; mb.tri([0, y, 0], [w, y + 0.12, 0], [0, y + 0.1, 0], c); mb.tri([0, y, 0], [0, y + 0.1, 0], [-w, y + 0.12, 0], shadeC(c, 0.9)); mb.tri([0, y, 0], [0, y + 0.1, 0], [w, y + 0.12, 0], c); mb.tri([0, y, 0], [-w, y + 0.12, 0], [0, y + 0.1, 0], shadeC(c, 0.9)); } break;
    case 'crystal': mb.cyl(0, -0.25, 0, 0.13, 0, 0.6, 6, g); mb.cyl(0, -0.25, 0, 0.13, 0.13, 0.05, 6, g); mb.cyl(0.13, -0.28, 0.05, 0.07, 0, 0.32, 5, g); break;
    case 'gem': mb.cyl(0, 0, 0, 0.24, 0, 0.22, 8, g); mb.cyl(0, 0, 0, 0.24, 0.16, 0.08, 8, g); mb.cyl(0, -0.25, 0, 0, 0.24, 0.25, 8, shadeC(g, 0.8)); break;
    case 'relic': mb.cyl(0, -0.3, 0, 0.14, 0.18, 0.2, 7, hex('#8a6a3a')); mb.cyl(0, -0.1, 0, 0.18, 0.1, 0.3, 7, c); mb.ico(0, 0.25, 0, 0.1, 0, () => glowC(hex('#5ff0e0'))); break;
    case 'star': for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; mb.tri([0, 0, 0.06], [Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], [Math.cos(a + 0.63) * 0.13, Math.sin(a + 0.63) * 0.13, 0], g); mb.tri([0, 0, 0.06], [Math.cos(a - 0.63) * 0.13, Math.sin(a - 0.63) * 0.13, 0], [Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], g); mb.tri([0, 0, -0.06], [Math.cos(a + 0.63) * 0.13, Math.sin(a + 0.63) * 0.13, 0], [Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], g); mb.tri([0, 0, -0.06], [Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], [Math.cos(a - 0.63) * 0.13, Math.sin(a - 0.63) * 0.13, 0], g); } break;
    case 'trophy': mb.cyl(0, -0.4, 0, 0.2, 0.2, 0.1, 8, hex('#6a4a2a')); mb.cyl(0, -0.3, 0, 0.05, 0.05, 0.25, 6, g); mb.cyl(0, -0.05, 0, 0.1, 0.25, 0.32, 10, g); for (const s of [-1, 1]) mb.box(s * 0.25 - 0.04, 0.05, -0.03, s * 0.25 + 0.04 + s * 0.06, 0.2, 0.03, g); break;
    case 'shell': default: for (let k = 0; k < 7; k++) { const a0 = -1.2 + k * 0.35, a1 = a0 + 0.35; mb.tri([0, -0.15, 0], [Math.sin(a0) * 0.28, 0.12, Math.cos(a0) * 0.05], [Math.sin(a1) * 0.28, 0.12, Math.cos(a1) * 0.05], shadeC(c, k % 2 ? 1 : 0.88)); mb.tri([0, -0.15, 0], [Math.sin(a1) * 0.28, 0.12, Math.cos(a1) * 0.05], [Math.sin(a0) * 0.28, 0.12, Math.cos(a0) * 0.05], shadeC(c, 0.8)); }
  }
  return mb.build(gl);
}

// ---------- creatures (friendly, they hop around and run off if you come close) ----------
const CREATURES = {
  hopper: { name: 'Hopper', biomes: [2, 9], speed: 3, hop: true },
  deer: { name: 'Antlerbuck', biomes: [3], speed: 4 },
  crab: { name: 'Sand crab', biomes: [1, 4], speed: 2.5 },
  penguin: { name: 'Snowpuff', biomes: [5], speed: 1.8, waddle: true },
  slime: { name: 'Bog blob', biomes: [7], speed: 1.5, hop: true },
  moth: { name: 'Glowmoth', biomes: [8], speed: 2, fly: true },
  goat: { name: 'Cliff goat', biomes: [6], speed: 3, hop: true },
  bird: { name: 'Sky bird', biomes: [], speed: 9, fly: true },
  fish: { name: 'Fish', biomes: [0], speed: 3, swim: true },
  beetle: { name: 'Cave beetle', biomes: [], speed: 1.5 },
};
function creatureModel(gl, type) {
  const mb = new MeshBuilder(), eye = hex('#1a1a22');
  const eyes = (x, y, z, s) => { mb.ico(x, y, z + s, 0.045, 0, () => eye); mb.ico(x, y, z - s, 0.045, 0, () => eye); };
  switch (type) {
    case 'hopper': { const c = hex('#f0e6dc'); mb.ico(0, 0.3, 0, 0.3, 1, (x, y) => shadeC(c, 0.85 + y * 0.15)); mb.ico(0.22, 0.48, 0, 0.18, 1, () => c); for (const s of [-1, 1]) { mb.at([0.18, 0.62, s * 0.07], M4.rotX(s * 0.2)); mb.cyl(0, 0, 0, 0.05, 0.03, 0.32, 4, hex('#ffd0d8')); mb.reset(); } mb.ico(-0.3, 0.3, 0, 0.08, 0, () => hex('#ffffff')); eyes(0.35, 0.52, 0, 0.08); break; }
    case 'deer': { const c = hex('#a8784a'); mb.bevel(-0.55, 0.65, -0.22, 0.55, 1.05, 0.22, c, 0.06); for (const [x, z] of [[-0.4, -0.15], [0.4, -0.15], [-0.4, 0.15], [0.4, 0.15]]) mb.box(x - 0.05, 0, z - 0.05, x + 0.05, 0.7, z + 0.05, shadeC(c, 0.8)); mb.box(0.45, 0.9, -0.1, 0.65, 1.45, 0.1, c); mb.bevel(0.5, 1.4, -0.13, 0.9, 1.62, 0.13, c, 0.04); for (const s of [-1, 1]) { mb.box(0.6, 1.6, s * 0.08 - 0.02, 0.64, 1.95, s * 0.08 + 0.02, hex('#e8dcc4')); mb.box(0.5, 1.8, s * 0.12 - 0.02, 0.75, 1.84, s * 0.12 + 0.02, hex('#e8dcc4')); } eyes(0.82, 1.55, 0, 0.1); break; }
    case 'crab': { const c = hex('#e8604a'); mb.ico(0, 0.18, 0, 0.25, 1, (x, y) => shadeC(c, 0.8 + y * 0.2), false, m => m[1] > -0.3); for (const s of [-1, 1]) { mb.ico(0.25, 0.2, s * 0.25, 0.1, 0, () => c); for (let k = 0; k < 3; k++) mb.box(-0.15 + k * 0.12, 0, s * 0.2, -0.12 + k * 0.12, 0.1, s * 0.38, shadeC(c, 0.8)); } eyes(0.15, 0.4, 0, 0.07); break; }
    case 'penguin': { mb.ico(0, 0.35, 0, 0.32, 1, (x, y) => x > 0.3 ? hex('#ffffff') : hex('#2a2f3a')); mb.ico(0.05, 0.75, 0, 0.2, 1, (x) => x > 0.5 ? hex('#ffffff') : hex('#2a2f3a')); mb.cyl(0.24, 0.72, 0, 0.06, 0, 0.12, 4, hex('#ffa63a')); eyes(0.2, 0.82, 0, 0.08); break; }
    case 'slime': { mb.ico(0, 0.28, 0, 0.35, 1, () => hex('#7be36b', 0.38)); mb.ico(0, 0.25, 0, 0.18, 0, () => glowC(hex('#c8ff9a'))); eyes(0.3, 0.38, 0, 0.1); break; }
    case 'moth': { mb.ico(0, 0, 0, 0.08, 0, () => hex('#4a3a5a')); for (const s of [-1, 1]) { mb.tri([0, 0, 0], [-0.12, 0.05, s * 0.3], [0.15, 0.05, s * 0.25], glowC(hex('#c8a8ff'))); mb.tri([0, 0, 0], [0.15, 0.05, s * 0.25], [-0.12, 0.05, s * 0.3], glowC(hex('#c8a8ff'))); } break; }
    case 'goat': { const c = hex('#e8e4dc'); mb.bevel(-0.4, 0.45, -0.2, 0.4, 0.85, 0.2, c, 0.06); for (const [x, z] of [[-0.3, -0.12], [0.3, -0.12], [-0.3, 0.12], [0.3, 0.12]]) mb.box(x - 0.05, 0, z - 0.05, x + 0.05, 0.5, z + 0.05, hex('#8a8478')); mb.bevel(0.35, 0.75, -0.12, 0.65, 1.05, 0.12, c, 0.04); for (const s of [-1, 1]) mb.cyl(0.45, 1.0, s * 0.08, 0.04, 0, 0.22, 4, hex('#6a6458')); eyes(0.6, 0.95, 0, 0.09); break; }
    case 'bird': { const c = hex('#4a8ae8'); mb.ico(0, 0, 0, 0.18, 0, () => c); mb.cyl(0.18, 0, 0, 0.05, 0, 0.12, 4, hex('#ffc45a')); for (const s of [-1, 1]) { mb.tri([0.05, 0, 0], [-0.1, 0.02, s * 0.55], [-0.2, 0, 0], shadeC(c, 0.9)); mb.tri([0.05, 0, 0], [-0.2, 0, 0], [-0.1, 0.02, s * 0.55], shadeC(c, 0.8)); } break; }
    case 'fish': { const c = hex('#ff9f5a'); mb.ico(0, 0, 0, 0.2, 0, (x, y) => shadeC(c, 0.85 + y * 0.2)); mb.tri([-0.15, 0, 0], [-0.4, 0.15, 0], [-0.4, -0.15, 0], c); mb.tri([-0.15, 0, 0], [-0.4, -0.15, 0], [-0.4, 0.15, 0], c); break; }
    case 'beetle': { mb.ico(0, 0.15, 0, 0.2, 1, (x, y) => y > 0.3 ? glowC(hex('#5ff0e0')) : hex('#2a2f3a'), false, m => m[1] > -0.2); for (let k = 0; k < 3; k++) for (const s of [-1, 1]) mb.box(-0.12 + k * 0.1, 0, s * 0.15, -0.1 + k * 0.1, 0.06, s * 0.28, hex('#1a1f2b')); break; }
  }
  return mb.build(gl);
}
