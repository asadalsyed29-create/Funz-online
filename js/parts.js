// Things players build: blocks, ramps, machines, and circuit parts joined by wires.
const PARTS = {
  // blocks
  1: { name: 'Wood', color: '#9b6a3c', cat: 'blocks' },
  2: { name: 'Stone', color: '#8f949e', cat: 'blocks' },
  3: { name: 'Brick', color: '#b0503c', cat: 'blocks' },
  4: { name: 'Glass', color: '#aee3ff', cat: 'blocks', glass: true },
  5: { name: 'Leaves', color: '#3f9a4e', cat: 'blocks' },
  6: { name: 'Metal', color: '#a8b0bc', cat: 'blocks' },
  7: { name: 'Planks', color: '#c49a6c', cat: 'blocks' },
  8: { name: 'White', color: '#eef1f6', cat: 'blocks' },
  9: { name: 'Dark', color: '#2c3140', cat: 'blocks' },
  10: { name: 'Red', color: '#e0505a', cat: 'blocks' },
  11: { name: 'Blue', color: '#4a8ae8', cat: 'blocks' },
  12: { name: 'Yellow', color: '#f2c64a', cat: 'blocks' },
  13: { name: 'Wood ramp', color: '#9b6a3c', cat: 'blocks', ramp: true },
  14: { name: 'Stone ramp', color: '#8f949e', cat: 'blocks', ramp: true },
  15: { name: 'Slab', color: '#a8b0bc', cat: 'blocks', slab: 0.5 },
  // machines
  40: { name: 'Jump pad', color: '#4a5266', top: '#8fd3ff', cat: 'machines', slab: 0.3, tip: 'Launches you up. Wire it to make it work only when powered.' },
  41: { name: 'Speed pad', color: '#4a5266', top: '#ffd34d', cat: 'machines', slab: 0.3, rotates: true, tip: 'Zooms you the way the arrow points.' },
  42: { name: 'Teleporter', color: '#3a3f55', top: '#b48cff', cat: 'machines', slab: 0.3, tip: 'Wire two teleporters together to link them.' },
  46: { name: 'Spawn point', color: '#e8eef7', top: '#48d6ac', cat: 'machines', slab: 0.3, tip: 'Roll on it and you respawn here.' },
  47: { name: 'Bouncy block', color: '#ff7ab8', cat: 'machines', tip: 'Boing!' },
  48: { name: 'Fan', color: '#5d646e', top: '#cfe9ff', cat: 'machines', slab: 0.4, tip: 'Blows balls up into the air. Wire it to switch it on and off.' },
  // circuit inputs
  50: { name: 'Button', color: '#3a3f55', top: '#ff5a6e', cat: 'circuits', slab: 0.15, input: true, tip: 'Roll on it: gives power for 2 seconds.' },
  51: { name: 'Lever', color: '#3a3f55', top: '#ffc45a', cat: 'circuits', slab: 0.15, input: true, tip: 'Roll on it to switch on or off.' },
  52: { name: 'Pressure plate', color: '#6a7380', top: '#cfd6e0', cat: 'circuits', slab: 0.1, input: true, tip: 'Powered while a ball sits on it.' },
  53: { name: 'Sensor', color: '#3a3f55', top: '#5ff0e0', cat: 'circuits', input: true, tip: 'Powered when a ball is within 5 blocks.' },
  54: { name: 'Clock', color: '#3a3f55', top: '#7be36b', cat: 'circuits', input: true, tip: 'Blinks power on and off every 2 seconds.' },
  55: { name: 'Inverter', color: '#3a3f55', top: '#ff9f5a', cat: 'circuits', logic: true, tip: 'Flips power: on becomes off, off becomes on.' },
  56: { name: 'Delay', color: '#3a3f55', top: '#5aa9ff', cat: 'circuits', logic: true, tip: 'Passes power along 1 second later.' },
  // outputs
  60: { name: 'Lamp', color: '#ffe08a', cat: 'circuits', output: true, tip: 'Lights up. Glows always if not wired.' },
  61: { name: 'Door', color: '#7a8496', cat: 'circuits', output: true, tip: 'Opens (sinks down) when powered.' },
  62: { name: 'Lift', color: '#5aa9ff', cat: 'circuits', output: true, tip: 'Rises 4 blocks when powered, carrying balls.' },
  63: { name: 'Slider', color: '#b48cff', cat: 'circuits', output: true, rotates: true, tip: 'Slides 4 blocks the way the arrow points when powered.' },
};
const TOOL_CATS = {
  blocks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  machines: [40, 41, 42, 46, 47, 48],
  circuits: [50, 51, 52, 53, 54, 55, 56, 60, 61, 62, 63, 'wire', 'cut'],
};
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const pkey = (x, y, z) => x + ',' + y + ',' + z;
const unkey = k => k.split(',').map(Number);

class Builds {
  constructor() { this.parts = new Map(); this.wires = new Set(); this.chunkOf = new Map(); }
  get(x, y, z) { return this.parts.get(pkey(x, y, z)); }
  set(x, y, z, id, rot = 0) {
    const k = pkey(x, y, z);
    if (!id) { this.parts.delete(k); for (const w of [...this.wires]) { const [a, b] = w.split('|'); if (a === k || b === k) this.wires.delete(w); } }
    else this.parts.set(k, { id, rot: rot & 3 });
  }
  wire(a, b, add) { const w = a < b ? a + '|' + b : b + '|' + a; if (add) this.wires.add(w); else this.wires.delete(w); }
  wiresOf(k) { const out = []; for (const w of this.wires) { const [a, b] = w.split('|'); if (a === k) out.push(b); else if (b === k) out.push(a); } return out; }
  list() { return [...this.parts].map(([k, v]) => [...unkey(k), v.id, v.rot]); }
  load(list, wires) { this.parts.clear(); this.wires.clear(); for (const e of list || []) if (Array.isArray(e) && PARTS[e[3]]) this.parts.set(pkey(e[0], e[1], e[2]), { id: e[3], rot: (e[4] || 0) & 3 }); for (const w of wires || []) if (typeof w === 'string' && w.includes('|')) this.wires.add(w); }
}

// ---------- circuits (run by the world keeper) ----------
class Circuits {
  constructor(B) { this.B = B; this.on = new Set(); this.levers = new Set(); this.buttons = new Map(); this.delays = new Map(); this.touching = new Set(); }
  // which parts have a ball on top / near
  sense(players) {
    const now = performance.now(), touch = new Set();
    for (const p of players) {
      const x = Math.floor(p[0]), z = Math.floor(p[2]);
      for (let dy = -2; dy <= 0; dy++) { const k = pkey(x, Math.floor(p[1] - 0.5) + dy, z), part = this.B.parts.get(k); if (part && PARTS[part.id].input) touch.add(k); }
    }
    for (const k of touch) {
      const part = this.B.parts.get(k);
      if (!this.touching.has(k)) { if (part.id === 51) { if (this.levers.has(k)) this.levers.delete(k); else this.levers.add(k); } }
      if (part.id === 50) this.buttons.set(k, now + 2000);
    }
    this.touching = touch;
    return { touch, now, players };
  }
  step(players) {
    const { touch, now } = this.sense(players), B = this.B, src = new Map();
    for (const [k, part] of B.parts) {
      const id = part.id; if (!PARTS[id].input) continue;
      let v = false;
      if (id === 50) v = (this.buttons.get(k) || 0) > now;
      else if (id === 51) v = this.levers.has(k);
      else if (id === 52) v = touch.has(k);
      else if (id === 53) { const [x, y, z] = unkey(k); v = players.some(p => Math.hypot(p[0] - x - 0.5, p[1] - y - 0.5, p[2] - z - 0.5) < 5); }
      else if (id === 54) v = Math.floor(now / 1000) % 2 === 0;
      src.set(k, v);
    }
    // spread power along wires a few times so chains settle
    let on = new Set([...src].filter(([, v]) => v).map(([k]) => k));
    for (let pass = 0; pass < 6; pass++) {
      const next = new Set([...src].filter(([, v]) => v).map(([k]) => k));
      for (const [k, part] of B.parts) {
        const P = PARTS[part.id]; if (P.input) continue;
        const ins = B.wiresOf(k).filter(o => { const op = B.parts.get(o); return op && on.has(o) && (PARTS[op.id].input || PARTS[op.id].logic || o < k || true); });
        const powered = ins.length > 0;
        if (part.id === 55) { if (!powered) next.add(k); }
        else if (part.id === 56) { const was = this.delays.get(k) || []; if (pass === 5) { was.push([now, powered]); while (was.length > 1 && now - was[1][0] > 1000) was.shift(); this.delays.set(k, was); } const old = was.find(e => now - e[0] >= 1000); if (old ? old[1] : false) next.add(k); }
        else if (powered) next.add(k);
      }
      on = next;
    }
    const changed = on.size !== this.on.size || [...on].some(k => !this.on.has(k));
    this.on = on;
    return changed;
  }
}

// ---------- part models ----------
function partModel(gl, id, rot, powered) {
  const P = PARTS[id], mb = new MeshBuilder(), c = hex(P.color), t = P.top ? hex(P.top) : null;
  const R = M4.rotY(-rot * Math.PI / 2); mb.at([0.5, 0, 0.5], R);
  const B = (x0, y0, z0, x1, y1, z1, col) => mb.bevel(x0 - 0.5, y0, z0 - 0.5, x1 - 0.5, y1, z1 - 0.5, col, 0.05);
  const glowIf = (col, on) => on ? glowC(col) : col;
  if (P.ramp) {
    const s = k => shadeC(c, k);
    mb.quad([-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5], c);
    mb.quad([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], s(0.7));
    mb.quad([0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5], s(0.9));
    mb.tri([0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], s(0.85)); mb.tri([-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, -0.5], s(0.85));
  } else if (id === 4) { mb.box(-0.5, 0, -0.5, 0.5, 1, 0.5, [c[0], c[1], c[2], 0.2], false); mb.box(-0.5, 0.94, -0.5, 0.5, 1, 0.5, hex('#d8f2ff')); }
  else if (P.slab && !P.top) B(0, 0, 0, 1, P.slab, 1, c);
  else if (id === 40) { B(0, 0, 0, 1, 0.2, 1, c); mb.cyl(0, 0.2, 0, 0.38, 0.3, 0.12, 8, glowIf(t, powered !== false)); mb.cyl(0, 0.32, 0, 0.18, 0.18, 0.02, 8, hex('#ffffff')); }
  else if (id === 41) { B(0, 0, 0, 1, 0.2, 1, c); const g = glowIf(t, powered !== false); for (let k = 0; k < 2; k++) { const z = 0.25 - k * 0.32; mb.tri([-0.3, 0.22, z], [0.3, 0.22, z], [0, 0.22, z - 0.28], g); } }
  else if (id === 42) { B(0, 0, 0, 1, 0.25, 1, c); mb.cyl(0, 0.25, 0, 0.4, 0.4, 0.05, 10, glowC(t)); mb.cyl(0, 0.3, 0, 0.25, 0.25, 0.02, 10, hex('#1a1530')); for (let k = 0; k < 3; k++) { const a = k * 2.1; mb.box(Math.cos(a) * 0.38 - 0.05, 0.25, Math.sin(a) * 0.38 - 0.05, Math.cos(a) * 0.38 + 0.05, 0.9, Math.sin(a) * 0.38 + 0.05, glowC(t)); } }
  else if (id === 46) { B(0, 0, 0, 1, 0.2, 1, c); mb.cyl(0, 0.2, 0, 0.35, 0.35, 0.05, 8, glowC(t)); mb.box(-0.03, 0.2, -0.03, 0.03, 1.1, 0.03, hex('#d8d2c4')); mb.quad([0.03, 1.1, 0], [0.03, 0.8, 0], [0.4, 0.88, 0], [0.4, 1.05, 0], glowC(t)); }
  else if (id === 47) { mb.ico(0, 0.5, 0, 0.55, 1, (x, y) => shadeC(c, 0.85 + y * 0.2)); }
  else if (id === 48) { B(0, 0, 0, 1, 0.35, 1, c); for (let k = 0; k < 4; k++) { const a = k * 1.57; mb.tri([0, 0.37, 0], [Math.cos(a) * 0.42, 0.37, Math.sin(a) * 0.42], [Math.cos(a + 0.6) * 0.42, 0.37, Math.sin(a + 0.6) * 0.42], glowIf(t, powered !== false)); } }
  else if (id === 50) { B(0.1, 0, 0.1, 0.9, 0.12, 0.9, c); mb.cyl(0, 0.12, 0, 0.26, 0.26, powered ? 0.04 : 0.12, 10, glowIf(t, powered)); }
  else if (id === 51) { B(0.15, 0, 0.15, 0.85, 0.12, 0.85, c); mb.at([0.5, 0.12, 0.5], M4.mul3(R, M4.rotX(powered ? 0.6 : -0.6))); mb.box(-0.04, 0, -0.04, 0.04, 0.5, 0.04, hex('#d8d2c4')); mb.ico(0, 0.52, 0, 0.09, 0, () => glowIf(t, powered)); }
  else if (id === 52) { B(0.05, 0, 0.05, 0.95, powered ? 0.04 : 0.1, 0.95, glowIf(t, powered)); }
  else if (id === 53) { B(0, 0, 0, 1, 0.6, 1, c); mb.ico(0, 0.75, 0, 0.22, 1, () => glowIf(t, powered)); }
  else if (id === 54) { B(0, 0, 0, 1, 0.7, 1, c); mb.cyl(0, 0.7, 0, 0.3, 0.3, 0.05, 12, glowIf(t, powered)); mb.box(-0.02, 0.75, -0.2, 0.02, 0.77, 0.02, hex('#1a1f2b')); }
  else if (id === 55 || id === 56) { B(0, 0, 0, 1, 0.4, 1, c); mb.box(-0.25, 0.4, -0.12, 0.25, 0.45, 0.12, glowIf(t, powered)); }
  else if (id === 60) { B(0.2, 0, 0.2, 0.8, 0.25, 0.8, hex('#3a3f55')); mb.ico(0, 0.6, 0, 0.36, 1, () => powered === false ? hex('#8a8470') : glowC(c)); }
  else if (id === 61) { B(0, 0, 0, 1, 1, 1, c); mb.box(-0.3, 0.3, 0.5, 0.3, 0.4, 0.52, hex('#ffc45a')); mb.box(-0.3, 0.3, -0.52, 0.3, 0.4, -0.5, hex('#ffc45a')); }
  else if (id === 62) { B(0, 0.6, 0, 1, 1, 1, c); mb.box(-0.15, 0, -0.15, 0.15, 0.6, 0.15, hex('#4a515c')); for (const s of [-1, 1]) mb.tri([s * 0.2, 1.01, 0.2], [s * 0.2, 1.01, -0.2], [s * 0.2, 1.01, 0.2], hex('#fff')); mb.quad([-0.12, 1.01, 0.15], [0.12, 1.01, 0.15], [0.12, 1.01, -0.05], [-0.12, 1.01, -0.05], hex('#ffffff')); mb.tri([-0.25, 1.01, -0.05], [0.25, 1.01, -0.05], [0, 1.01, -0.3], hex('#ffffff')); }
  else if (id === 63) { B(0, 0.5, 0, 1, 1, 1, c); mb.box(-0.4, 0, -0.4, 0.4, 0.5, 0.4, hex('#4a515c')); mb.tri([-0.25, 1.01, 0.1], [0.25, 1.01, 0.1], [0, 1.01, -0.3], hex('#ffffff')); }
  else B(0, 0, 0, 1, 1, 1, c);
  return mb.build(gl);
}
// collision shape of a part (boxes in world space, or triangles for ramps)
function partShape(part, x, y, z, off) {
  const P = PARTS[part.id];
  if (P.ramp) {
    const R = M4.rotY(-part.rot * Math.PI / 2), T = q => { const v = M4.apply3(R, q); return [x + 0.5 + v[0], y + v[1], z + 0.5 + v[2]]; };
    return { tris: [[T([-0.5, 0, 0.5]), T([0.5, 0, 0.5]), T([0.5, 1, -0.5])], [T([-0.5, 0, 0.5]), T([0.5, 1, -0.5]), T([-0.5, 1, -0.5])], [T([0.5, 0, -0.5]), T([-0.5, 0, -0.5]), T([-0.5, 1, -0.5])], [T([0.5, 0, -0.5]), T([-0.5, 1, -0.5]), T([0.5, 1, -0.5])], [T([0.5, 0, 0.5]), T([0.5, 0, -0.5]), T([0.5, 1, -0.5])], [T([-0.5, 0, -0.5]), T([-0.5, 0, 0.5]), T([-0.5, 1, -0.5])]] };
  }
  if (part.id === 47) return { sphere: [x + 0.5, y + 0.5, z + 0.5, 0.55] };
  if (part.id === 60) return { box: [x + 0.15, y, z + 0.15, x + 0.85, y + 0.95, z + 0.85] };
  const o = off || [0, 0, 0];
  if (part.id === 62) return { box: [x + o[0], y + 0.6 + o[1], z + o[2], x + 1 + o[0], y + 1 + o[1], z + 1 + o[2]] };
  if (part.id === 63) return { box: [x + o[0], y + 0.5 + o[1], z + o[2], x + 1 + o[0], y + 1 + o[1], z + 1 + o[2]] };
  const h = P.slab || 1;
  return { box: [x + o[0], y + o[1], z + o[2], x + 1 + o[0], y + h + o[1], z + 1 + o[2]] };
}
