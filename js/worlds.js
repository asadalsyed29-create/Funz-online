// The travel regions beyond Dustmaw. Each one has its own land shapes, ground, plants, sky and kinds of island.
// Biomes 21 and up are added to BIOMES here: ground colours (g2 = a second colour mixed in patches),
// decorations (deco), the music mood, the ambient bits in the air, things to find and the structures they get.

// ---------- little decorations used by the new lands ----------
function glowTree(mb, x, y, z, s, col, r2) {
  // a slim dark tree with round glowing fruit-lamps hanging from its crown
  trunk(mb, x, y, z, s * 0.8, 3.2 * s, '#2a2238', (r2 - 0.5) * 0.15);
  const c = hex(col);
  for (let k = 0; k < (mb.lod ? 2 : 4); k++) { const a = k * 1.7 + r2 * 5, d = (0.6 + (k % 2) * 0.5) * s; clump(mb, x + Math.cos(a) * d, y + (3.4 + (k % 3) * 0.5) * s, z + Math.sin(a) * d, (1.0 + (k % 2) * 0.3) * s, shadeC(hex('#2e3a6a'), 0.9 + k * 0.05), r2 + k); }
  if (!mb.lod) for (let k = 0; k < 7; k++) { const a = k * 0.9 + r2 * 3, d = (0.9 + (k % 3) * 0.45) * s, yy = y + (2.6 + (k % 2) * 0.6) * s; mb.cyl(x + Math.cos(a) * d, yy, z + Math.sin(a) * d, 0.02, 0.02, 0.5 * s, 3, hex('#3a3050'), false); mb.sph([x + Math.cos(a) * d, yy - 0.05, z + Math.sin(a) * d], 0.2 * s, 6, glowC(c), 0); }
}
function shellDeco(mb, x, y, z, s, r2) {
  // a small spiral seashell lying on the sand
  const c = hex(r2 < 0.5 ? '#f4c8b0' : '#f0e0c8'), d = shadeC(c, 0.8);
  for (let k = 0; k < 6; k++) { const t = k / 6, a = t * 5 + r2 * 6, r = (0.28 - t * 0.2) * s; mb.sph([x + Math.cos(a) * 0.12 * s * (1 - t), y + 0.08 + t * 0.12 * s, z + Math.sin(a) * 0.12 * s * (1 - t)], [r, r * 0.8, r], 6, k % 2 ? c : d, 0.1); }
}
function bigLeaf(mb, x, y, z, s, rot) {
  // a jungle plant with a few huge leaves
  mb.up = true; const g = hex('#2f8a3a'), g2 = hex('#4aa848');
  for (let k = 0; k < 5; k++) { const a = rot + k * 1.26, L = 1.6 * s, w = 0.5 * s; const base = [x, y + 0.1, z], mid = [x + Math.cos(a) * L * 0.5, y + 0.9 * s, z + Math.sin(a) * L * 0.5], tip = [x + Math.cos(a) * L, y + 0.5 * s, z + Math.sin(a) * L];
    const side = [-Math.sin(a) * w, 0, Math.cos(a) * w]; mb.tri2(base, [mid[0] + side[0], mid[1], mid[2] + side[2]], tip, k % 2 ? g : g2); mb.tri2(base, tip, [mid[0] - side[0], mid[1], mid[2] - side[2]], shadeC(k % 2 ? g : g2, 0.85)); }
  mb.up = false;
}
function mangrove(mb, x, y, z, s, r2) {
  // a mangrove: the trunk stands on arching roots above the mud, with a wide dark green crown
  const bark = hex('#5a4a36');
  for (let k = 0; k < 6; k++) { const a = k * 1.05 + r2 * 4, d = 1.3 * s; MB.tube(mb, [[x + Math.cos(a) * d, y - 0.4, z + Math.sin(a) * d], [x + Math.cos(a) * d * 0.6, y + 0.9 * s, z + Math.sin(a) * d * 0.6], [x, y + 1.5 * s, z]], t => 0.09 * s + t * 0.05 * s, 4, bark); }
  mb.cyl(x, y + 1.4 * s, z, 0.28 * s, 0.2 * s, 2.6 * s, 6, bark);
  puffs(mb, x, y + 3.8 * s, z, s, '#3f6a34', r2, [[0, 0.3, 0, 1.4], [1.2, 0, 0.3, 1], [-1.1, 0.1, -0.4, 1], [0.3, -0.1, 1.2, 0.9], [-0.4, 0.2, -1.2, 0.9]]);
}
function starfish(mb, x, y, z, r2) { const c = hex(r2 < 0.5 ? '#ff8a5a' : '#e8604a'); for (let k = 0; k < 5; k++) { const a = k * 1.2566 + r2 * 3; mb.tri([x, y + 0.06, z], [x + Math.cos(a - 0.25) * 0.08, y + 0.05, z + Math.sin(a - 0.25) * 0.08], [x + Math.cos(a) * 0.3, y + 0.03, z + Math.sin(a) * 0.3], c, true); mb.tri([x, y + 0.06, z], [x + Math.cos(a) * 0.3, y + 0.03, z + Math.sin(a) * 0.3], [x + Math.cos(a + 0.25) * 0.08, y + 0.05, z + Math.sin(a + 0.25) * 0.08], shadeC(c, 0.85), true); } }
function obsidian(mb, x, y, z, s) { mb.cyl(x, y - 0.5, z, 0.7 * s, 0, 3.6 * s, 5, hex('#1a1622')); mb.cyl(x + 0.6 * s, y - 0.5, z + 0.2, 0.35 * s, 0, 1.8 * s, 4, hex('#2a2234')); mb.cyl(x - 0.4 * s, y - 0.5, z - 0.4, 0.3 * s, 0, 1.4 * s, 4, hex('#221c2a')); }
function emberRock(mb, x, y, z, s, r2) { rock(mb, x, y, z, s, '#2a2220', r2); mb.sph([x + 0.2 * s, y + 0.35 * s, z], [0.35 * s, 0.12 * s, 0.3 * s], 6, glowC(hex('#ff7a2a')), 0); }
function basalt(mb, x, y, z, s, r2) { for (let k = 0; k < 7; k++) { const a = k * 1.1 + r2 * 4, d = k ? 0.75 * s : 0, h = (1.2 + ((k * 7 + Math.floor(r2 * 9)) % 5) * 0.55) * s; mb.cyl(x + Math.cos(a) * d, y - 0.6, z + Math.sin(a) * d, 0.42 * s, 0.42 * s, h, 6, shadeC(hex('#3a3634'), 0.85 + (k % 3) * 0.1)); } }
function charTree(mb, x, y, z, s, rot) {
  // a burnt tree: a black trunk with bare broken branches and a few glowing embers in the bark
  const c = hex('#1e1a18'); mb.push([x, y - 0.5, z]); mb.lathe([[0.4 * s, 0], [0.3 * s, 0.6 * s], [0.22 * s, 4 * s], [0.08 * s, 6.2 * s], [0, 6.4 * s]], mb.lod ? 5 : 7, c, 0); mb.pop();
  if (!mb.lod) for (let k = 0; k < 5; k++) { const a = rot + k * 1.3, yy = y + (2 + k * 0.8) * s, L = (1.6 - k * 0.2) * s; branch(mb, [x, yy, z], [x + Math.cos(a) * L, yy + 0.8 * s, z + Math.sin(a) * L], 0.12 * s, 0.03 * s, c); }
  if (!mb.lod) for (let k = 0; k < 3; k++) mb.sph([x + Math.cos(rot + k * 2) * 0.25 * s, y + (0.8 + k * 1.1) * s, z + Math.sin(rot + k * 2) * 0.25 * s], 0.07 * s, 4, glowC(hex('#ff6a1a')), 0);
}
function ashPile(mb, x, y, z, s) { mb.sph([x, y - 0.2, z], [1.1 * s, 0.45 * s, 0.9 * s], 7, hex('#a6a29c'), 0.15); }
function iceBlock(mb, x, y, z, s, rot) { mb.push([x, y - 0.4, z], M4.mul3(M4.rotY(rot), M4.rotZ(0.15))); mb.box(-0.9 * s, 0, -0.7 * s, 0.9 * s, 1.5 * s, 0.7 * s, hex('#bfe0f4')); mb.box(-0.6 * s, 1.5 * s, -0.5 * s, 0.3 * s, 2.1 * s, 0.4 * s, hex('#d6ecfa')); mb.pop(); }
function scrapPile(mb, x, y, z, s, r2) {
  // a heap of rusty sheets, a wheel and a bent pipe
  const R = ['#8a4a2a', '#a8603a', '#6a5a4e', '#7a6a5a'];
  for (let k = 0; k < 5; k++) { const a = k * 1.3 + r2 * 6; mb.push([x + Math.cos(a) * 0.5 * s, y + 0.1 + k * 0.12 * s, z + Math.sin(a) * 0.5 * s], M4.mul3(M4.rotY(a), M4.rotX(0.3 + k * 0.2))); mb.box(-0.8 * s, 0, -0.5 * s, 0.8 * s, 0.08 * s, 0.5 * s, hex(R[k % 4])); mb.pop(); }
  mb.push([x + 0.6 * s, y + 0.45 * s, z - 0.3 * s], M4.rotX(1.2)); mb.tor([0, 0, 0], 0.45 * s, 0.14 * s, 10, 5, hex('#2a2624')); mb.pop();
  MB.tube(mb, [[x - 0.8 * s, y, z + 0.3 * s], [x - 0.5 * s, y + 0.8 * s, z], [x + 0.2 * s, y + 1.0 * s, z - 0.2 * s]], () => 0.12 * s, 6, hex('#7a5a44'));
}
function barrel(mb, x, y, z, s, r2) { const c = hex(r2 < 0.33 ? '#3a6a8a' : r2 < 0.66 ? '#a84a2a' : '#5a6a3a'); mb.push([x, y - 0.1, z]); mb.lathe([[0, 0], [0.42 * s, 0], [0.48 * s, 0.5 * s], [0.42 * s, 1.1 * s], [0, 1.1 * s]], 10, c, 0.1); mb.pop(); for (const yy of [0.25, 0.8]) mb.cyl(x, y - 0.1 + yy * s, z, 0.47 * s, 0.47 * s, 0.06 * s, 10, hex('#2a2a2a'), false); }
function pipeDeco(mb, x, y, z, s, rot) { mb.push([x, y + 0.5 * s, z], M4.mul3(M4.rotY(rot), M4.rotZ(Math.PI / 2))); mb.cyl(0, -2.5 * s, 0, 0.5 * s, 0.5 * s, 5 * s, 10, hex('#7a5a44')); mb.cyl(0, -2.6 * s, 0, 0.6 * s, 0.6 * s, 0.25 * s, 10, hex('#5a4234')); mb.cyl(0, 2.35 * s, 0, 0.6 * s, 0.6 * s, 0.25 * s, 10, hex('#5a4234')); mb.pop(); }
function pylon(mb, x, y, z, s) {
  // a rusty lattice power pylon with cut cables hanging from its arms
  const c = hex('#6a4a38'), H = 16 * s, legs = [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]].map(([a, b]) => [a * s, b * s]);
  for (const [lx, lz] of legs) MB.tube(mb, [[x + lx, y - 0.5, z + lz], [x + lx * 0.15, y + H, z + lz * 0.15]], () => 0.12 * s, 4, c);
  if (!mb.lod) for (let k = 1; k < 6; k++) { const f = k / 6, yy = y + H * f, w = 1.6 * s * (1 - f * 0.85); mb.box(x - w, yy, z - w - 0.05, x + w, yy + 0.15, z - w + 0.05, c); mb.box(x - w, yy, z + w - 0.05, x + w, yy + 0.15, z + w + 0.05, c); }
  mb.box(x - 4 * s, y + H * 0.8, z - 0.12, x + 4 * s, y + H * 0.8 + 0.3, z + 0.12, c);
  if (!mb.lod) for (const sx of [-1, 1]) MB.tube(mb, [[x + sx * 3.8 * s, y + H * 0.8, z], [x + sx * 4.2 * s, y + H * 0.55, z + 0.4], [x + sx * 4.4 * s, y + H * 0.35, z + 0.2]], () => 0.04, 3, hex('#1a1a1a'));
}
function lampPost(mb, x, y, z, s, col) { mb.cyl(x, y - 0.3, z, 0.1, 0.08, 4.2 * s, 6, hex('#3a3c40')); mb.box(x - 0.05, y + 3.9 * s, z - 0.05, x + 0.9 * s, y + 4.0 * s, z + 0.05, hex('#3a3c40')); mb.sph([x + 0.85 * s, y + 3.75 * s, z], 0.22 * s, 6, glowC(hex(col)), 0); }
function brokenWall(mb, x, y, z, s, rot, r2) {
  mb.push([x, y - 0.4, z], M4.rotY(rot)); const c = hex('#9a9690'), d = hex('#7a7672');
  for (let k = 0; k < 5; k++) { const h = (1 + ((k * 5 + Math.floor(r2 * 7)) % 4) * 0.7) * s; mb.box(-2.5 * s + k * s, 0, -0.3, -1.6 * s + k * s, h, 0.3, k % 2 ? c : d); }
  mb.box(-0.6 * s, 0, 0.5, 0.2 * s, 0.4 * s, 1.0, d); mb.pop();
}
function neonPost(mb, x, y, z, s, col) { mb.box(x - 0.12, y - 0.3, z - 0.12, x + 0.12, y + 3.4 * s, z + 0.12, hex('#1e1e26')); mb.box(x - 0.16, y + 0.4 * s, z - 0.16, x + 0.16, y + 3.2 * s, z - 0.12, glowC(hex(col))); mb.box(x - 0.6 * s, y + 3.3 * s, z - 0.2, x + 0.6 * s, y + 3.6 * s, z + 0.2, glowC(hex(col))); }
function towerBlock(mb, x, y, z, s, r2, rot) {
  // a small empty block of flats with a few lit windows
  const H = (8 + Math.floor(r2 * 4) * 3) * s, W = 3.2 * s; mb.push([x, y - 0.5, z], M4.rotY(rot)); mb.box(-W, 0, -W, W, H, W, hex(r2 < 0.5 ? '#3a3a48' : '#46424e'));
  if (!mb.lod) for (let fl = 1; fl * 2.6 * s < H - 1; fl++) for (let k = -1; k <= 1; k++) { const lit = ((fl * 3 + k * 5 + Math.floor(r2 * 11)) % 4) === 0, wc = lit ? glowC(hex(r2 < 0.5 ? '#ffd27a' : '#7af0ff')) : hex('#22222a'); mb.box(k * 1.9 * s - 0.5 * s, fl * 2.6 * s, -W - 0.06, k * 1.9 * s + 0.5 * s, fl * 2.6 * s + 1.1 * s, -W, wc, false); mb.box(k * 1.9 * s - 0.5 * s, fl * 2.6 * s, W, k * 1.9 * s + 0.5 * s, fl * 2.6 * s + 1.1 * s, W + 0.06, wc, false); }
  mb.pop();
}

// ---------- the new kinds of land ----------
const DECO = {
  glowmoss: o => { const { mb, x, y, z, s, r, r2 } = o; if (r < 0.025) { giantShroom(mb, x, y, z, s * 1.1, r2); o.cyl(0.6 * s, 5 * s); } else if (r < 0.045) { glowTree(mb, x, y, z, s, r2 < 0.5 ? '#9ff0ff' : '#ff9ad8', r2); o.cyl(0.3 * s, 4 * s); } else if (r < 0.2) glowGrass(mb, x, y, z, r2); else if (r < 0.24) glowFlower(mb, x, y, z, r2); else if (r < 0.255) crystals(mb, x, y, z, s * 0.8, '#8ff6ff'); },
  lantern: o => { const { mb, x, y, z, s, r, r2, rot } = o; if (r < 0.07) { glowTree(mb, x, y, z, s * 1.2, ['#ffd27a', '#9ff0ff', '#ff9ad8'][Math.floor(r2 * 3)], r2); o.cyl(0.35 * s, 4 * s); } else if (r < 0.12) fern(mb, x, y, z, s, rot); else if (r < 0.2) glowGrass(mb, x, y, z, r2); else if (r < 0.22) shrooms(mb, x, y, z, r2); },
  coralsand: o => { const { mb, x, y, z, s, r, r2, rot } = o; if (r < 0.03) { palm(mb, x, y, z, s * 1.1, rot); o.cyl(0.3, 6 * s); } else if (r < 0.05) shellDeco(mb, x, y, z, s, r2); else if (r < 0.06) starfish(mb, x, y, z, r2); else if (r < 0.09) tuft(mb, x, y, z, '#a8b85a', 0.8); },
  jungle: o => { const { mb, x, y, z, s, r, r2, rot } = o; if (r < 0.04) { palm(mb, x, y, z, s * 1.2, rot); o.cyl(0.3, 6 * s); } else if (r < 0.08) { roundTree(mb, x, y, z, s * 1.2, '#2f8a3a', r2); o.cyl(0.4 * s, 6 * s); } else if (r < 0.2) bigLeaf(mb, x, y, z, s, rot); else if (r < 0.3) fern(mb, x, y, z, s * 1.1, rot); else if (r < 0.33) flowers(mb, x, y, z, r2); },
  headland: o => { const { mb, x, y, z, s, r, r2 } = o; if (r < 0.015) o.stone(s * 1.2, '#c8bca8'); else if (r < 0.14) tuft(mb, x, y, z, r2 < 0.5 ? '#78b048' : '#90c058', s); else if (r < 0.18) flowers(mb, x, y, z, r2); },
  mangrove: o => { const { mb, x, y, z, s, r, r2 } = o; if (r < 0.05) { mangrove(mb, x, y, z, s, r2); o.cyl(0.4 * s, 5 * s); } else if (r < 0.17) reeds(mb, x, y, z, r2); else if (r < 0.2 && y < 1.2) lily(mb, x, z, r2); else if (r < 0.22) shrooms(mb, x, y, z, r2); },
  tidepool: o => { const { mb, x, y, z, s, r, r2 } = o; if (r < 0.05) o.stone(s * (0.8 + r2), r2 < 0.5 ? '#6a6a66' : '#7a7a70'); else if (r < 0.07) starfish(mb, x, y, z, r2); else if (r < 0.1) seaweed(mb, x, y, z, r2); else if (r < 0.115) coral(mb, x, y, z, s * 0.7, r2); else if (r < 0.13) shellDeco(mb, x, y, z, s, r2); },
  lava: o => { const { mb, x, y, z, s, r, r2 } = o; if (r < 0.025) { obsidian(mb, x, y, z, s); o.cyl(0.6 * s, 3 * s); } else if (r < 0.045) emberRock(mb, x, y, z, s * 1.2, r2); else if (r < 0.055) crystals(mb, x, y, z, s * 0.7, '#ff7a2a'); else if (r < 0.07) o.stone(s, '#2a2220'); },
  basalt: o => { const { mb, x, y, z, s, r, r2 } = o; if (r < 0.03) { basalt(mb, x, y, z, s, r2); o.cyl(1.2 * s, 3 * s); } else if (r < 0.05) o.stone(s, '#3a3634'); else if (r < 0.08) tuft(mb, x, y, z, '#6a6a4a', 0.7); },
  ashwood: o => { const { mb, x, y, z, s, r, rot } = o; if (r < 0.07) { charTree(mb, x, y, z, s, rot); o.cyl(0.35 * s, 6 * s); } else if (r < 0.1) ashPile(mb, x, y, z, s); else if (r < 0.11) o.stone(s, '#5a5654'); else if (r < 0.125) log(mb, x, y, z, s, rot); },
  ashdune: o => { const { mb, x, y, z, s, r, rot } = o; if (r < 0.01) o.stone(s, '#7a7672'); else if (r < 0.025) deadBush(mb, x, y, z, s); else if (r < 0.03) bones(mb, x, y, z, rot); else if (r < 0.04) charTree(mb, x, y, z, s * 0.7, rot); },
  glacier: o => { const { mb, x, y, z, s, r, rot } = o; if (r < 0.02) { iceBlock(mb, x, y, z, s * 1.3, rot); o.cyl(1.1 * s, 2.5 * s); } else if (r < 0.04) { iceSpike(mb, x, y, z, s); o.cyl(0.6 * s, 4 * s); } else if (r < 0.05) o.stone(s, '#8ab4d4'); },
  tundra: o => { const { mb, x, y, z, s, r, r2 } = o; if (r < 0.05) { pine(mb, x, y, z, s * 1.1, true, r2); o.cyl(0.35 * s, 7 * s); } else if (r < 0.09) snowBush(mb, x, y, z, s); else if (r < 0.12) tuft(mb, x, y, z, '#8a7a5a', 0.7); else if (r < 0.13) o.stone(s, '#8a96a4'); },
  aurora: o => { const { mb, x, y, z, s, r, r2 } = o; if (r < 0.03) crystals(mb, x, y, z, s * 1.2, '#7affc0'); else if (r < 0.05) crystals(mb, x, y, z, s, '#ff9ad8'); else if (r < 0.07) { iceSpike(mb, x, y, z, s * 1.2); o.cyl(0.6 * s, 5 * s); } else if (r < 0.14) glowGrass(mb, x, y, z, r2); },
  scrap: o => { const { mb, x, y, z, s, r, r2, rot } = o; if (r < 0.004) { pylon(mb, x, y, z, s); o.cyl(2 * s, 16 * s); } else if (r < 0.022) { scrapPile(mb, x, y, z, s, r2); o.cyl(1 * s, 1.2 * s); } else if (r < 0.04) { barrel(mb, x, y, z, s, r2); o.cyl(0.5 * s, 1.1 * s); } else if (r < 0.052) pipeDeco(mb, x, y, z, s, rot); else if (r < 0.07) deadBush(mb, x, y, z, s); },
  concrete: o => { const { mb, x, y, z, s, r, r2, rot } = o; if (r < 0.01) { lampPost(mb, x, y, z, s, '#ffd27a'); o.cyl(0.2, 4 * s); } else if (r < 0.025) { brokenWall(mb, x, y, z, s, rot, r2); } else if (r < 0.035) { barrel(mb, x, y, z, s, r2); o.cyl(0.5 * s, 1.1 * s); } else if (r < 0.07) tuft(mb, x, y, z, '#7a8a4a', 0.7); },
  neon: o => { const { mb, x, y, z, s, r, r2, rot } = o; if (r < 0.006) { towerBlock(mb, x, y, z, s, r2, rot); o.cyl(4.4 * s, 20 * s); } else if (r < 0.02) { neonPost(mb, x, y, z, s, r2 < 0.5 ? '#ff4ad8' : '#4af0ff'); o.cyl(0.25, 3.5 * s); } else if (r < 0.03) { barrel(mb, x, y, z, s, r2); o.cyl(0.5 * s, 1.1 * s); } },
  overgrown: o => { const { mb, x, y, z, s, r, r2, rot } = o; if (r < 0.02) brokenWall(mb, x, y, z, s, rot, r2); else if (r < 0.04) { roundTree(mb, x, y, z, s, '#4a8a3a', r2); o.cyl(0.4 * s, 6 * s); } else if (r < 0.05) { scrapPile(mb, x, y, z, s, r2); o.cyl(1 * s, 1.2 * s); } else if (r < 0.2) fern(mb, x, y, z, s, rot); },
};
Object.assign(BIOMES, {
  21: { name: 'Glowmoss', ground: '#24405a', g2: '#2e3a66', rock: '#2a2e48', deco: DECO.glowmoss, mood: 'glow', amb: 'glow', item: 'crystal', st: ['shroomring', 'arch', 'pod'] , flat: '#5f86b0', sym: ['shroom', '#c05ae0'] },
  22: { name: 'Lantern woods', ground: '#2a2a4a', g2: '#33305a', rock: '#2a2840', deco: DECO.lantern, mood: 'glow', amb: 'fire', item: 'mushroom', st: ['shroomring', 'cabin', 'ruins'] , flat: '#6a62a8', sym: ['tree', '#ffd27a'] },
  23: { name: 'Coral sands', ground: '#f4e6d0', g2: '#f6d8d0', rock: '#d8c0a8', deco: DECO.coralsand, mood: 'beach', amb: 'pollen', item: 'shell', st: ['wreck', 'lighthouse', 'village'] , flat: '#f6ead8', sym: ['tree', '#5aa04a'] },
  24: { name: 'Jungle', ground: '#3f8a3a', g2: '#4f9a3a', rock: '#6a6a50', deco: DECO.jungle, mood: 'forest', amb: 'leaf', item: 'feather', st: ['ruins', 'pyramid', 'cabin'] , flat: '#6ab05a', sym: ['tree', '#2f7a3a'] },
  25: { name: 'Headlands', ground: '#7ab04a', g2: '#8cbc58', rock: '#c8bca8', deco: DECO.headland, mood: 'meadow', amb: 'pollen', item: 'feather', st: ['lighthouse', 'tower', 'circle'] , flat: '#a8cc78', sym: ['tree', '#5a9a4a'] },
  26: { name: 'Mangroves', ground: '#5a5a3a', g2: '#4a5a38', rock: '#5a5446', deco: DECO.mangrove, mood: 'swamp', amb: 'leaf', item: 'mushroom', st: ['stilts', 'wreck'] , flat: '#8a8a5a', sym: ['tree', '#3f6a34'] },
  27: { name: 'Tide pools', ground: '#8a8478', g2: '#7a8a80', rock: '#6a6a66', deco: DECO.tidepool, mood: 'beach', item: 'shell', st: ['wreck', 'lighthouse'] , flat: '#aaa69a', sym: ['rock', '#6a6a66'] },
  28: { name: 'Lava fields', ground: '#2a2220', g2: '#3a2a24', rock: '#1a1614', deco: DECO.lava, mood: 'volcano', amb: 'ember', item: 'gem', st: ['cave', 'ruins', 'tower'], hot: true , flat: '#5a4440', sym: ['peak', '#3a2a28'] },
  29: { name: 'Basalt steps', ground: '#3a3836', g2: '#46403c', rock: '#2a2826', deco: DECO.basalt, mood: 'volcano', amb: 'ember', item: 'gem', st: ['cave', 'tower'] , flat: '#6a6662', sym: ['rock', '#3a3634'] },
  30: { name: 'Ash forest', ground: '#8a8682', g2: '#76726e', rock: '#5a5654', deco: DECO.ashwood, mood: 'night', amb: 'ash', item: 'gem', st: ['ruins', 'cabin', 'cave'] , flat: '#b0aca6', sym: ['pine', '#2a2420'] },
  31: { name: 'Ash dunes', ground: '#a4a09a', g2: '#948e88', rock: '#7a7672', deco: DECO.ashdune, mood: 'desert', amb: 'ash', item: 'gem', st: ['ruins', 'pyramid'] , flat: '#c6c2bc', sym: ['rock', '#7a7672'] },
  32: { name: 'Glacier', ground: '#cfe6f4', g2: '#bcdcf0', rock: '#8ab4d4', deco: DECO.glacier, mood: 'snow', amb: 'snow', item: 'crystal', st: ['igloo', 'frozen'] , flat: '#dceef8', sym: ['peak', '#a8d0ec'] },
  33: { name: 'Tundra', ground: '#e6ecf0', g2: '#d8e0e4', rock: '#8a96a4', deco: DECO.tundra, mood: 'snow', amb: 'snow', item: 'crystal', st: ['igloo', 'cabin'] , flat: '#eef2f4', sym: ['pine', '#3e6a5a'] },
  34: { name: 'Aurora frost', ground: '#c8d0ec', g2: '#b8c4e8', rock: '#6a78a8', deco: DECO.aurora, mood: 'glow', amb: 'glow', item: 'crystal', st: ['frozen', 'arch'] , flat: '#c8d4f0', sym: ['peak', '#7affc0'] },
  35: { name: 'Scrapyard', ground: '#7a5a44', g2: '#8a6448', rock: '#5a4234', deco: DECO.scrap, mood: 'station', amb: 'sand', item: 'gem', st: ['pod', 'tower', 'ruins'] , flat: '#a8846a', sym: ['rock', '#6a4a38'] },
  36: { name: 'Concrete', ground: '#8a8a88', g2: '#7c7c7a', rock: '#6a6a68', deco: DECO.concrete, mood: 'station', item: 'gem', st: ['tower', 'ruins', 'pod'], seams: true , flat: '#b4b4b0', sym: ['rock', '#6a6a68'] },
  37: { name: 'Neon plaza', ground: '#2a2a36', g2: '#32323e', rock: '#24242c', deco: DECO.neon, mood: 'station', amb: 'glow', item: 'crystal', st: ['tower', 'pod'], seams: true , flat: '#5a5a72', sym: ['rock', '#ff4ad8'] },
  38: { name: 'Overgrown ruins', ground: '#4a6a3a', g2: '#5a6a44', rock: '#6a6a60', deco: DECO.overgrown, mood: 'forest', amb: 'leaf', item: 'mushroom', st: ['ruins', 'tower'] , flat: '#8aa870', sym: ['tree', '#4a8a3a'] },
});

// ---------- each region's land ----------
// kinds: one is picked for each area of land (about one island each). shape: how the land is pushed around.
// sky: colours mixed into the sky (k = how much). specials: islands raised out of the sea for the special places.
const REGION_THEMES = {
  lumen: { scale: 1100, amp: 100, beach: 21, kinds: { moss: { b: 21, shape: 'hills', amp: 12 }, woods: { b: 22, shape: 'hills', amp: 8 }, spires: { b: 21, shape: 'spikes', amp: 46 }, pools: { b: 22, b2: 21, shape: 'pools' } },
    sky: { hor: [0.2, 0.13, 0.36], zen: [0.04, 0.04, 0.16], sun: [0.55, 0.5, 0.95], amb: 0.55, k: 0.8 },
    landing: 'Lumen Landing', tag: 'It never quite gets light here', specials: [{ id: 'greatshroom', name: 'The Great Mushroom', x: 950, z: 620, r: 210 }] },
  kelar: { scale: 1000, amp: 95, beach: 23, kinds: { jungle: { b: 24, shape: 'hills', amp: 20 }, sands: { b: 23, shape: 'flat' }, cliffs: { b: 25, shape: 'cliffs', amp: 26 }, lagoon: { b: 23, b2: 24, shape: 'pools' } },
    sky: { hor: [0.72, 0.9, 1.0], zen: [0.3, 0.6, 0.95], sun: [1.05, 0.98, 0.85], k: 0.3 },
    landing: 'Kelar Harbour', tag: 'Warm water, white sand, big shells', specials: [{ id: 'shell', name: 'The Shell', x: -950, z: 520, r: 170 }, { id: 'lightrock', name: 'Lighthouse Rock', x: 1050, z: -720, r: 140 }] },
  tidewild: { scale: 800, amp: 70, beach: 27, kinds: { mangrove: { b: 26, shape: 'pools' }, pools: { b: 27, shape: 'pools' }, reed: { b: 26, b2: 27, shape: 'flat' } },
    sky: { hor: [0.7, 0.8, 0.78], zen: [0.4, 0.55, 0.62], sun: [1, 0.95, 0.85], k: 0.35, fog: 1.3 },
    landing: 'Tidewild Dock', tag: 'Half land, half sea, all mud', specials: [{ id: 'turtle', name: 'The Great Turtle', x: 800, z: 900, r: 190 }] },
  cinder: { scale: 1000, amp: 110, beach: 29, kinds: { lava: { b: 28, shape: 'spikes', amp: 40 }, basalt: { b: 29, shape: 'terrace', amp: 6 }, flow: { b: 28, b2: 29, shape: 'hills', amp: 14 } },
    sky: { hor: [0.55, 0.28, 0.18], zen: [0.22, 0.12, 0.14], sun: [1.0, 0.6, 0.4], k: 0.6, fog: 1.2 },
    landing: 'Cinder Camp', tag: 'Hot rock and falling sparks', specials: [{ id: 'anvil', name: 'The Anvil', x: -900, z: -700, r: 180 }, { id: 'throne', name: 'Ember Throne', x: 1000, z: 800, r: 170 }] },
  ashveil: { scale: 1000, amp: 90, beach: 31, kinds: { wood: { b: 30, shape: 'hills', amp: 12 }, dunes: { b: 31, shape: 'dunes' }, ridge: { b: 30, b2: 31, shape: 'ridges', amp: 20 } },
    sky: { hor: [0.6, 0.58, 0.56], zen: [0.4, 0.4, 0.42], sun: [0.85, 0.8, 0.75], k: 0.6, fog: 1.6 },
    landing: 'Ashveil Gate', tag: 'The forest that burned and never grew back', specials: [{ id: 'burnttree', name: 'The Burnt Tree', x: 800, z: -800, r: 190 }] },
  glacier: { scale: 1000, amp: 90, beach: 32, kinds: { ice: { b: 32, shape: 'flat' }, tundra: { b: 33, shape: 'hills', amp: 14 }, peaks: { b: 32, b2: 33, shape: 'spikes', amp: 50 } },
    sky: { hor: [0.82, 0.9, 0.98], zen: [0.5, 0.66, 0.9], sun: [0.95, 0.97, 1.05], k: 0.3 },
    landing: 'Floe Camp', tag: 'Cold enough to freeze a whale', specials: [{ id: 'whale', name: 'The Frozen Whale', x: -850, z: 800, r: 190 }] },
  aurora: { scale: 1100, amp: 90, beach: 34, kinds: { frost: { b: 34, shape: 'hills', amp: 10 }, shelf: { b: 34, b2: 32, shape: 'terrace', amp: 5 }, spires: { b: 34, shape: 'spikes', amp: 40 } },
    sky: { hor: [0.14, 0.3, 0.34], zen: [0.04, 0.08, 0.2], sun: [0.6, 0.9, 0.85], amb: 0.65, k: 0.75 },
    landing: 'Starfrost Camp', tag: 'Green lights over the ice', specials: [{ id: 'spire', name: 'The Crystal Spire', x: 900, z: 600, r: 180 }] },
  rust: { scale: 900, amp: 80, beach: 35, kinds: { scrap: { b: 35, shape: 'hills', amp: 6 }, works: { b: 36, shape: 'terrace', amp: 5 }, overgrown: { b: 38, b2: 36, shape: 'hills', amp: 10 } },
    sky: { hor: [0.78, 0.64, 0.5], zen: [0.5, 0.48, 0.5], sun: [1.0, 0.85, 0.7], k: 0.45, fog: 1.3 },
    landing: 'Rustworks Yard', tag: 'Everything here stopped working long ago',
    specials: [{ id: 'bridge', name: 'The Broken Bridge', x: 430, z: -260, r: 120 }, { id: 'station', name: 'Underground Power Station', x: 900, z: -260, r: 150 }] },
  stacks: { scale: 900, amp: 80, beach: 36, kinds: { plaza: { b: 37, shape: 'terrace', amp: 5 }, blocks: { b: 36, b2: 37, shape: 'terrace', amp: 8 }, park: { b: 38, shape: 'hills', amp: 6 } },
    sky: { hor: [0.24, 0.16, 0.34], zen: [0.06, 0.05, 0.14], sun: [0.8, 0.6, 1.0], amb: 0.6, k: 0.7 },
    landing: 'Stacks Station', tag: 'The lights are still on. Nobody is home', specials: [{ id: 'antenna', name: 'The Dead Antenna', x: -800, z: -700, r: 160 }] },
};
const themeSpecials = th => th === 'dust' ? DUST_SPECIALS : ((REGION_THEMES[th] || {}).specials || []);
const regionTheme = id => REGION_THEMES[(REGIONS[id] || {}).theme] || null;

// the land of a themed region (called from Terrain.info)
Terrain.prototype.infoTheme = function (x, z) {
  const C = REGION_THEMES[this.theme], N = this.N, d0 = Math.hypot(x, z), st = v => (v - 0.5) * 1.7 + 0.5, SP = C.specials;
  const edge = Math.max(0, (Math.max(Math.abs(x), Math.abs(z)) - 6000) / 1500);
  let cont = N.fbm(x / C.scale, z / C.scale, 201, 4) + 0.5 * Math.exp(-(d0 * d0) / 300000) - edge * 0.8;
  for (const s of SP) { const d = Math.hypot(x - s.x, z - s.z); cont = Math.max(cont - (d < s.r * 2.2 ? 0.25 * smooth(s.r * 2.2, s.r * 1.4, d) : 0), 0.46 + 0.12 * smooth(s.r, s.r * 0.4, d) - (d > s.r ? 1 : 0)); }
  const land = cont - 0.5, lw = Math.max(0, Math.min(1, land * 6 + 0.35));
  let h = land * C.amp + (N.fbm(x / 210, z / 210, 207, 3) - 0.5) * 12 * lw;
  let special = null; for (const s of SP) if (Math.hypot(x - s.x, z - s.z) < s.r * 1.3) special = s;
  const kn = this.kindAt(x, z), K = C.kinds[kn], m = Math.max(0, Math.min(1, (h - 2) / 6));
  let pool = 0;
  if (h > 2 && !special) {
    if (K.shape === 'hills') h += (N.fbm(x / 260, z / 260, 211, 3) - 0.5) * 2 * K.amp * m;
    else if (K.shape === 'flat') h = 2.6 + (h - 2.6) * 0.18 + (N.v(x / 30, z / 30, 212) - 0.5) * 0.6;
    else if (K.shape === 'spikes') { const r = 1 - Math.abs(2 * N.fbm(x / 170, z / 170, 213, 3) - 1); h += r * r * r * K.amp * m; }
    else if (K.shape === 'ridges') { const r = 1 - Math.abs(2 * N.fbm(x / 150, z / 150, 214, 3) - 1); h += r * r * K.amp * m; }
    else if (K.shape === 'cliffs') h += smooth(2.5, 7, h) * K.amp + (N.fbm(x / 200, z / 200, 215, 3) - 0.5) * 10 * m;
    else if (K.shape === 'dunes') { const w = Math.sin(x / 30 + z / 80 + N.v(x / 120, z / 120, 216) * 7) * 0.5 + 0.5; h += Math.pow(w, 1.6) * 12 * m; }
    else if (K.shape === 'terrace') { h += (N.fbm(x / 240, z / 240, 217, 2) - 0.5) * 30 * m; const t = h / K.amp; h = Math.max(2.6, (Math.floor(t) + smooth(0.85, 1, t - Math.floor(t))) * K.amp); }
    if (K.shape === 'pools' || K.shape === 'flat' && kn === 'reed') {
      h = 2.4 + (h - 2.4) * 0.35;
      const p = st(N.fbm(x / 140, z / 140, 218, 3)); pool = smooth(0.6, 0.7, p);
      if (pool > 0) h += (-1.4 - h) * pool;
    }
  }
  let b = -1; const wP = smooth(70, 30, d0); if (wP > 0) { h += (SPAWN_H - h) * wP; if (d0 < 24) b = 15; }
  if (special) { const d = Math.hypot(x - special.x, z - special.z); if (d < special.r * 0.75) h += (Math.max(h, 4.5) - h) * smooth(special.r * 0.75, special.r * 0.55, d); }
  if (b < 0) {
    if (h < -1.5) b = 0; else if (h < 1.6) b = C.beach;
    else if (special) b = C.kinds[Object.keys(C.kinds)[0]].b;
    else { b = K.b; if (K.b2 && (N.v(x / 260, z / 260, 219) > 0.6 || pool > 0.2)) b = K.b2; }
  }
  return { h, b, temp: 0.5, moist: 0.5, vol: 0, special: special ? special.id : null, kind: kn };
};
// which kind of land an area is: the nearest of a scattered set of points decides (so islands near each other differ)
Terrain.prototype.kindAt = function (x, z) {
  const C = REGION_THEMES[this.theme], keys = Object.keys(C.kinds), S = 1500; x += (this.N.fbm(x / 700, z / 700, 224, 3) - 0.5) * 900; z += (this.N.fbm(x / 700, z / 700, 225, 3) - 0.5) * 900; const ci = Math.floor(x / S), cj = Math.floor(z / S); let best = 1e18, k = 0;
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    const px = (i + 0.15 + this.N.hash(i, j, 221) * 0.7) * S, pz = (j + 0.15 + this.N.hash(i, j, 222) * 0.7) * S, d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < best) { best = d; k = Math.floor(this.N.hash(i, j, 223) * keys.length); }
  }
  return keys[k];
};
