// Turns 16×16 columns of the voxel world into meshes, plus models for players and things.
const FLOWER_COLS = ['#ff8fb1', '#ffe066', '#ffffff', '#b28dff', '#ff9f5a'];

function blockColor(id, face, n) {
  const b = BLOCKS[id] || { color: '#ff00ff' };
  let h = face === 'top' ? (b.top || b.color) : (b.side || b.color);
  const c = hex(h); const k = 0.94 + n * 0.12;
  c[0] *= k; c[1] *= k; c[2] *= k;
  if (b.glass) c[3] = 0.22;                         // see-through
  else if (b.glow || (b.glowTop && face === 'top')) c[3] = 0.9; // glowing
  return c;
}

function buildChunk(gl, world, cx, cz) {
  const x0 = cx * CH, z0 = cz * CH;
  let top = 0;
  for (let z = -1; z <= CH; z++) for (let x = -1; x <= CH; x++) top = Math.max(top, world.groundTop(x0 + x, z0 + z) + 2);
  top = Math.max(top, world.chunkTop.get(cx + ',' + cz) || 0, WATER + 1) + 1;
  const SX = CH + 2, SY = top + 2;
  const ids = new Uint8Array(SX * SY * SX);
  const at = (x, y, z) => (y < 0 ? 23 : y >= SY - 1 ? 0 : ids[((z + 1) * SY + y) * SX + (x + 1)]);
  for (let z = -1; z <= CH; z++) for (let y = 0; y < SY - 1; y++) for (let x = -1; x <= CH; x++) ids[((z + 1) * SY + y) * SX + (x + 1)] = world.get(x0 + x, y, z0 + z);
  const opaque = id => id !== 0 && !BLOCKS[id].glass && !BLOCKS[id].deco;
  const solid = new MeshBuilder(), clear = new MeshBuilder();
  for (let z = 0; z < CH; z++) for (let y = 0; y < SY - 1; y++) for (let x = 0; x < CH; x++) {
    const id = at(x, y, z); if (!id) continue;
    const b = BLOCKS[id], wx = x0 + x, wz = z0 + z, n = world.hash(wx * 3 + y, wz, 5);
    if (b.deco) { // flower: two crossed little quads
      const c = hex(FLOWER_COLS[Math.floor(world.hash(wx, wz, 77) * 5)]), g = [0.25, 0.55, 0.3, 1];
      const mx = wx + 0.5, mz = wz + 0.5, s = 0.28;
      for (const [ax, az] of [[1, 0], [0, 1]]) for (const sg of [1, -1]) {
        solid.quad([mx - ax * s * sg, y, mz - az * s * sg], [mx + ax * s * sg, y, mz + az * s * sg], [mx + ax * s * sg, y + 0.45, mz + az * s * sg], [mx - ax * s * sg, y + 0.45, mz - az * s * sg], [az * sg, 0.3, ax * sg], g);
      }
      solid.box(mx - 0.1, y + 0.4, mz - 0.1, mx + 0.1, y + 0.6, mz + 0.1, c);
      continue;
    }
    const mb = b.glass ? clear : solid;
    const show = nid => b.glass ? (nid === 0 || (!BLOCKS[nid].glass && !opaque(nid))) : !opaque(nid);
    const X = wx, Y = y, Z = wz;
    if (show(at(x, y + 1, z))) {
      // simple corner shading on top faces
      const o = (dx, dz) => opaque(at(x + dx, y + 1, z + dz)) ? 1 : 0;
      const ao = (a, bb, c) => 1 - 0.17 * (a + bb + (a && bb ? 1 : c));
      const col = blockColor(id, 'top', n);
      const cs = [ao(o(-1, 0), o(0, -1), o(-1, -1)), ao(o(-1, 0), o(0, 1), o(-1, 1)), ao(o(1, 0), o(0, 1), o(1, 1)), ao(o(1, 0), o(0, -1), o(1, -1))];
      const p = [[X, Y + 1, Z], [X, Y + 1, Z + 1], [X + 1, Y + 1, Z + 1], [X + 1, Y + 1, Z]];
      const base = mb.v.length / 10;
      p.forEach((q, i) => mb.v.push(q[0], q[1], q[2], 0, 1, 0, col[0] * cs[i], col[1] * cs[i], col[2] * cs[i], col[3]));
      if (cs[0] + cs[2] > cs[1] + cs[3]) mb.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else mb.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    }
    const side = blockColor(id, 'side', n), dark = (c, k) => [c[0] * k, c[1] * k, c[2] * k, c[3]];
    if (show(at(x, y - 1, z)) && y > 0) mb.quad([X, Y, Z], [X + 1, Y, Z], [X + 1, Y, Z + 1], [X, Y, Z + 1], [0, -1, 0], dark(side, 0.7));
    if (show(at(x, y, z + 1))) mb.quad([X, Y, Z + 1], [X + 1, Y, Z + 1], [X + 1, Y + 1, Z + 1], [X, Y + 1, Z + 1], [0, 0, 1], dark(side, 0.92));
    if (show(at(x, y, z - 1))) mb.quad([X + 1, Y, Z], [X, Y, Z], [X, Y + 1, Z], [X + 1, Y + 1, Z], [0, 0, -1], dark(side, 0.92));
    if (show(at(x + 1, y, z))) mb.quad([X + 1, Y, Z + 1], [X + 1, Y, Z], [X + 1, Y + 1, Z], [X + 1, Y + 1, Z + 1], [1, 0, 0], dark(side, 0.86));
    if (show(at(x - 1, y, z))) mb.quad([X, Y, Z], [X, Y, Z + 1], [X, Y + 1, Z + 1], [X, Y + 1, Z], [-1, 0, 0], dark(side, 0.86));
  }
  return { solid: solid.build(gl), clear: clear.build(gl) };
}

// ---------- models ----------
const HATS = { none: 'None', cap: 'Cap', beanie: 'Beanie', crown: 'Crown', flower: 'Flower', headphones: 'Headphones', tophat: 'Top hat' };

function ballModel(gl, color, hat) {
  const mb = new MeshBuilder(), c = hex(color), light = c.map((v, i) => i < 3 ? v + (1 - v) * 0.45 : 1);
  // a stripe around the ball so you can see it roll
  mb.sphere(0, 0, 0, 0.45, 10, (nx, ny, nz) => Math.abs(nz) < 0.2 ? light : c);
  const H = (x0, y0, z0, x1, y1, z1, col) => mb.box(x0, y0, z0, x1, y1, z1, hex(col));
  if (hat === 'cap') { H(-0.26, 0.4, -0.26, 0.26, 0.56, 0.26, '#e8eef7'); H(0.1, 0.4, -0.2, 0.5, 0.45, 0.2, '#c9d3e2'); }
  else if (hat === 'beanie') { H(-0.28, 0.38, -0.28, 0.28, 0.6, 0.28, '#3d4b7a'); H(-0.3, 0.36, -0.3, 0.3, 0.44, 0.3, '#5b6ba3'); H(-0.07, 0.6, -0.07, 0.07, 0.72, 0.07, '#ffffff'); }
  else if (hat === 'crown') { H(-0.26, 0.4, -0.26, 0.26, 0.55, 0.26, '#ffcf4a'); for (const [x, z] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) H(x - 0.05, 0.55, z - 0.05, x + 0.05, 0.7, z + 0.05, '#ffcf4a'); H(-0.05, 0.47, 0.25, 0.05, 0.53, 0.28, '#ff5a6e'); }
  else if (hat === 'flower') { H(0.05, 0.4, -0.1, 0.25, 0.48, 0.1, '#ffe066'); for (const [x, z] of [[.15, -.2], [.15, .2], [-.05, 0], [.35, 0]]) H(x - 0.08, 0.4, z - 0.08, x + 0.08, 0.46, z + 0.08, '#ff9fc0'); }
  else if (hat === 'headphones') { H(-0.05, 0.42, -0.4, 0.05, 0.5, 0.4, '#2a2f3a'); H(-0.12, -0.1, -0.5, 0.12, 0.15, -0.4, '#2a2f3a'); H(-0.12, -0.1, 0.4, 0.12, 0.15, 0.5, '#2a2f3a'); }
  else if (hat === 'tophat') { H(-0.35, 0.4, -0.35, 0.35, 0.45, 0.35, '#1e2130'); H(-0.22, 0.45, -0.22, 0.22, 0.85, 0.22, '#1e2130'); H(-0.23, 0.48, -0.23, 0.23, 0.56, 0.23, '#b0503c'); }
  return mb.build(gl);
}

function itemModel(gl, type) {
  const mb = new MeshBuilder(), c = hex(ITEMS[type].color);
  const glow = [c[0], c[1], c[2], 0.9];
  if (type === 'coin') { mb.box(-0.22, -0.22, -0.05, 0.22, 0.22, 0.05, glow); mb.box(-0.1, -0.1, 0.05, 0.1, 0.1, 0.07, hex('#fff1b0', 0.9)); }
  else if (type === 'mushroom') { mb.box(-0.06, -0.25, -0.06, 0.06, 0, 0.06, hex('#f4ead8')); mb.box(-0.22, 0, -0.22, 0.22, 0.14, 0.22, c); mb.box(-0.1, 0.14, -0.1, 0.1, 0.18, 0.1, hex('#ffffff')); }
  else if (type === 'feather') { mb.box(-0.03, -0.25, -0.03, 0.03, 0.25, 0.03, hex('#d8d2c4')); mb.box(-0.12, -0.1, -0.02, 0.12, 0.25, 0.02, c); }
  else if (type === 'crystal') { mb.box(-0.1, -0.25, -0.1, 0.1, 0.25, 0.1, glow); mb.box(-0.06, 0.25, -0.06, 0.06, 0.35, 0.06, glow); }
  else if (type === 'trophy') { mb.box(-0.15, -0.3, -0.15, 0.15, -0.2, 0.15, hex('#8a6a2a')); mb.box(-0.04, -0.2, -0.04, 0.04, 0, 0.04, glow); mb.box(-0.2, 0, -0.2, 0.2, 0.3, 0.2, glow); }
  else { mb.sphere(0, 0, 0, 0.2, 6, () => c); mb.box(-0.02, -0.02, -0.25, 0.02, 0.02, -0.15, hex('#e8d8c8')); }
  return mb.build(gl);
}
function ringModel(gl, color) { const mb = new MeshBuilder(); mb.ring(1.5, 0.22, 28, hex(color, 0.9)); return mb.build(gl); }
function shadowModel(gl) {
  const mb = new MeshBuilder(), seg = 16, c = [0, 0, 0, 0.17];
  for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2, b = (j + 1) / seg * Math.PI * 2; mb.quad([0, 0, 0], [Math.cos(b), 0, Math.sin(b)], [Math.cos(a), 0, Math.sin(a)], [0, 0, 0], [0, 1, 0], c); }
  return mb.build(gl);
}
function waterModel(gl) {
  const mb = new MeshBuilder(), c = hex('#2c74b8', 0.33), y = WATER - 0.12, E = 600;
  mb.quad([-E, y, -E], [-E, y, WORLD + E], [WORLD + E, y, WORLD + E], [WORLD + E, y, -E], [0, 1, 0], c);
  return mb.build(gl);
}
function cursorModel(gl) { const mb = new MeshBuilder(), c = [1, 1, 1, 0.18]; mb.box(-0.01, -0.01, -0.01, 1.01, 1.01, 1.01, c); return mb.build(gl); }
