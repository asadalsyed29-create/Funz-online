// ModKit: everything a Nautic Online mod is made of. Used by the Mod Editor (modmaker/) and by the game.
//  - parts: real 3D shapes (block, wedge, ball, cylinder...) with a colour, a material (the game's own painted textures),
//    see-through, glow and light. Parts can be grouped into models.
//  - the mod code: NauticX-style lines like  #if = player.main = touch = part4 = then = destroy = self
//  - the runtime that runs a mod inside the world (events, waits, variables, moving parts, players...).
const ModKit = (() => {
  const D2R = Math.PI / 180;

  // ---------- shapes ----------
  const SHAPES = {
    block: 'Block', wedge: 'Wedge', corner: 'Corner wedge', cylinder: 'Cylinder', ball: 'Ball', cone: 'Cone', pyramid: 'Pyramid',
    dome: 'Dome', ring: 'Ring', tube: 'Tube', stairs: 'Stairs', arch: 'Arch', quarter: 'Quarter pipe', hexagon: 'Hexagon', star: 'Star', heart: 'Heart',
  };
  const FLAT = { block: 1, wedge: 1, corner: 1, pyramid: 1, stairs: 1, hexagon: 1, star: 1, arch: 1, quarter: 0, heart: 0 };
  const W = [1, 1, 1, 1];
  function side(mb, seg, r0, r1, y0, y1, smooth) { // round side of a cylinder or cone (smooth normals)
    const base = mb.v.length / 10, ny = (r0 - r1) / (y1 - y0);
    for (let j = 0; j <= seg; j++) { const a = j / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), l = Math.hypot(1, ny);
      mb.vert([c * r0, y0, s * r0], [c / l, ny / l, s / l], W); mb.vert([c * r1, y1, s * r1], [c / l, ny / l, s / l], W); }
    for (let j = 0; j < seg; j++) { const a = base + j * 2; mb.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  function disc(mb, seg, r, y, up, r2 = 0) {
    const base = mb.v.length / 10, n = [0, up ? 1 : -1, 0];
    for (let j = 0; j <= seg; j++) { const a = j / seg * Math.PI * 2; mb.vert([Math.cos(a) * r, y, Math.sin(a) * r], n, W); mb.vert([Math.cos(a) * r2, y, Math.sin(a) * r2], n, W); }
    for (let j = 0; j < seg; j++) { const a = base + j * 2; if (up) mb.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else mb.i.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  function prism(mb, pts) { // a flat 2D outline (x,z in -0.5..0.5) pulled up from y -0.5 to 0.5
    const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n, cz = pts.reduce((s, p) => s + p[1], 0) / n;
    for (let k = 0; k < n; k++) { const a = pts[k], b = pts[(k + 1) % n];
      mb.tri([cx, 0.5, cz], [b[0], 0.5, b[1]], [a[0], 0.5, a[1]], W); mb.tri([cx, -0.5, cz], [a[0], -0.5, a[1]], [b[0], -0.5, b[1]], W);
      mb.quad([a[0], -0.5, a[1]], [a[0], 0.5, a[1]], [b[0], 0.5, b[1]], [b[0], -0.5, b[1]], W); }
  }
  function buildShape(mb, shape, lo) {
    const S = lo ? 10 : 28;
    switch (shape) {
      case 'wedge': // tall at the back (-z), slopes down to the front (+z)
        mb.quad([-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5], W);
        mb.quad([.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5], W);
        mb.quad([-.5, .5, -.5], [-.5, -.5, .5], [.5, -.5, .5], [.5, .5, -.5], W);
        mb.tri([-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, -.5], W); mb.tri([.5, -.5, -.5], [.5, .5, -.5], [.5, -.5, .5], W); break;
      case 'corner':
        mb.quad([-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5], W);
        mb.tri([.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], W); mb.tri([-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, -.5], W);
        mb.tri([-.5, .5, -.5], [-.5, -.5, .5], [.5, -.5, .5], W); mb.tri([-.5, .5, -.5], [.5, -.5, .5], [.5, -.5, -.5], W); break;
      case 'pyramid':
        mb.quad([-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5], W);
        for (const [a, b] of [[[-.5, -.5], [-.5, .5]], [[-.5, .5], [.5, .5]], [[.5, .5], [.5, -.5]], [[.5, -.5], [-.5, -.5]]]) mb.tri([a[0], -.5, a[1]], [b[0], -.5, b[1]], [0, .5, 0], W); break;
      case 'cylinder': side(mb, S, .5, .5, -.5, .5); disc(mb, S, .5, .5, true); disc(mb, S, .5, -.5, false); break;
      case 'cone': side(mb, S, .5, 0.001, -.5, .5); disc(mb, S, .5, -.5, false); break;
      case 'tube': side(mb, S, .5, .5, -.5, .5); { const b = mb.v.length / 10; side(mb, S, .34, .34, -.5, .5); for (let k = b; k < mb.v.length / 10; k++) { mb.v[k * 10 + 3] *= -1; mb.v[k * 10 + 5] *= -1; } for (let k = mb.i.length - S * 6; k < mb.i.length; k += 3) { const t = mb.i[k + 1]; mb.i[k + 1] = mb.i[k + 2]; mb.i[k + 2] = t; } }
        disc(mb, S, .5, .5, true, .34); disc(mb, S, .5, -.5, false, .34); break;
      case 'ball': mb.lowpoly = false; mb.sph([0, 0, 0], .5, lo ? 6 : 16, W, 0); break;
      case 'dome': { mb.lowpoly = false; const base = mb.v.length / 10, R = lo ? 4 : 9, Sg = lo ? 10 : 28;
        for (let i = 0; i <= R; i++) { const th = i / R * Math.PI / 2, y = Math.sin(th), r = Math.cos(th); for (let j = 0; j <= Sg; j++) { const a = j / Sg * Math.PI * 2; mb.vert([Math.cos(a) * r * .5, y - .5, Math.sin(a) * r * .5], [Math.cos(a) * r, y, Math.sin(a) * r], W); } }
        for (let i = 0; i < R; i++) for (let j = 0; j < Sg; j++) { const a = base + i * (Sg + 1) + j, d = a + Sg + 1; mb.i.push(a, d, a + 1, a + 1, d, d + 1); }
        disc(mb, Sg, .5, -.5, false); break; }
      case 'ring': mb.lowpoly = false; mb.tor([0, 0, 0], .4, .1, lo ? 14 : 40, lo ? 6 : 12, W); break;
      case 'stairs': for (let k = 0; k < 4; k++) mb.box(-.5, -.5, -.5 + k * .25, .5, -.5 + (4 - k) * .25, -.5 + (k + 1) * .25, W, false); break;
      case 'arch': { const Sg = lo ? 6 : 14; mb.box(-.5, -.5, -.5, -.3, .5, .5, W, false); mb.box(.3, -.5, -.5, .5, .5, .5, W, false);
        for (let j = 0; j < Sg; j++) { const a0 = Math.PI - j / Sg * Math.PI, a1 = Math.PI - (j + 1) / Sg * Math.PI, P = (a, r, z) => [Math.cos(a) * r, Math.sin(a) * r * 1.0 - .2, z];
          const t0 = [Math.max(-.5, Math.min(.5, Math.cos(a0) * .75)), .5], t1 = [Math.max(-.5, Math.min(.5, Math.cos(a1) * .75)), .5];
          for (const z of [-.5, .5]) { const fw = z > 0; const A = P(a0, .3, z), B = P(a1, .3, z), C = [t1[0], .5, z], Dd = [t0[0], .5, z]; if (fw) mb.quad(A, B, C, Dd, W); else mb.quad(A, Dd, C, B, W); }
          mb.quad(P(a0, .3, -.5), P(a0, .3, .5), P(a1, .3, .5), P(a1, .3, -.5), W); }
        mb.quad([-.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5], W); break; }
      case 'quarter': { mb.lowpoly = false; const Sg = lo ? 6 : 16;
        mb.quad([-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5], W); mb.quad([.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5], W);
        const base = mb.v.length / 10; for (let j = 0; j <= Sg; j++) { const a = j / Sg * Math.PI / 2, y = .5 - Math.cos(a), z = -.5 + Math.sin(a), n = [0, Math.cos(a), -Math.sin(a)]; mb.vert([-.5, y, z], n, W); mb.vert([.5, y, z], n, W); }
        for (let j = 0; j < Sg; j++) { const a = base + j * 2; mb.i.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        for (const x of [-.5, .5]) for (let j = 0; j < Sg; j++) { const a0 = j / Sg * Math.PI / 2, a1 = (j + 1) / Sg * Math.PI / 2, P = a => [x, .5 - Math.cos(a), -.5 + Math.sin(a)]; if (x < 0) mb.tri([x, .5, -.5], P(a1), P(a0), W); else mb.tri([x, .5, -.5], P(a0), P(a1), W); }
        break; }
      case 'hexagon': prism(mb, [0, 1, 2, 3, 4, 5].map(k => [Math.cos(k * Math.PI / 3) * .5, Math.sin(k * Math.PI / 3) * .5])); break;
      case 'star': prism(mb, Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? .21 : .5, a = -Math.PI / 2 + k * Math.PI / 5; return [Math.cos(a) * r, Math.sin(a) * r]; })); break;
      case 'heart': { const pts = []; for (let k = 0; k < 40; k++) { const t = k / 40 * Math.PI * 2, x = 16 * Math.pow(Math.sin(t), 3), z = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); pts.push([x / 34, z / 34 + 0.04]); } prism(mb, pts.reverse()); break; }
      default: mb.box(-.5, -.5, -.5, .5, .5, .5, W, false);
    }
  }
  const unitTris = {};
  function trisOf(shape) {
    if (unitTris[shape]) return unitTris[shape];
    const mb = new MeshBuilder(); buildShape(mb, shape, true); const out = [], v = mb.v;
    for (let k = 0; k < mb.i.length; k += 3) { const P = i => [v[i * 10], v[i * 10 + 1], v[i * 10 + 2]]; out.push([P(mb.i[k]), P(mb.i[k + 1]), P(mb.i[k + 2])]); }
    return (unitTris[shape] = out);
  }
  const meshCache = new WeakMap();
  function meshOf(G, shape) { let c = meshCache.get(G); if (!c) meshCache.set(G, c = {}); if (!c[shape]) { const mb = new MeshBuilder(); buildShape(mb, shape, false); c[shape] = mb.build(G); } return c[shape]; }

  // ---------- materials: the game's own painted textures ----------
  // tex: which texture layer (see textures.js), or -1 for none
  const MATS = {
    plastic: { name: 'Smooth plastic', tex: -1, spec: 0.35, rim: 0.12 }, wood: { name: 'Wood planks', tex: 6, spec: 0.05 }, bark: { name: 'Tree bark', tex: 4, spec: 0.02 },
    bricks: { name: 'Bricks', tex: 7, spec: 0.04 }, stone: { name: 'Stone', tex: 3, spec: 0.06 }, metal: { name: 'Metal plates', tex: 8, spec: 0.7, rim: 0.2 },
    roof: { name: 'Roof tiles', tex: 9, spec: 0.08 }, plaster: { name: 'Plaster', tex: 10, spec: 0.05 }, grass: { name: 'Grass', tex: 0, spec: 0.02 },
    sand: { name: 'Sand', tex: 1, spec: 0.02 }, snow: { name: 'Snow', tex: 2, spec: 0.25 }, dirt: { name: 'Dirt', tex: 11, spec: 0.02 }, leaves: { name: 'Leaves', tex: 5, spec: 0.04 },
    neon: { name: 'Neon (glows)', tex: -1, spec: 0, glow: 0.85 }, glass: { name: 'Glass', tex: -1, spec: 1, rim: 0.5, alpha: 0.38 }, ice: { name: 'Ice', tex: 2, spec: 0.9, rim: 0.4, alpha: 0.72 },
    toon: { name: 'Cartoon', tex: -1, spec: 0.2, toon: 1, rim: 0.1 },
  };
  const COLORS = { red: '#e0443c', orange: '#ff8a2a', yellow: '#ffd23a', lime: '#9be04a', green: '#3fa34d', teal: '#2bb5a0', cyan: '#3ad4f0', blue: '#3a6ee0', navy: '#1f2f6b', purple: '#8a4fe0', violet: '#b07aff', pink: '#ff7ab8', magenta: '#e03ad0',
    white: '#f4f4f2', black: '#1b1c22', grey: '#8a8f99', gray: '#8a8f99', silver: '#c3c8d0', gold: '#e8b631', brown: '#7a5232', tan: '#d2b48c', beige: '#e8dcc0', cream: '#f6edd5', maroon: '#7a1f2a', olive: '#7a7f2a', mint: '#a8f0c8', sky: '#8fd0ff', peach: '#ffc4a0', coral: '#ff7a6a', lavender: '#c9b8ff', rose: '#f0a0b8', sand: '#e8d49c', stone: '#9a978f', wood: '#a0703f', lava: '#ff5a1a', water: '#3aa8e0', grass: '#5fb54a', snow: '#f4f8fc' };
  const hexOk = v => /^#[0-9a-f]{6}$/i.test(v);
  function toColor(v) { if (v == null) return null; v = String(v).trim().toLowerCase(); if (hexOk(v)) return v; if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]; if (COLORS[v]) return COLORS[v]; if (v === 'random') return randomColor(); return null; }
  function randomColor() { const h = Math.random(), s = 0.55 + Math.random() * 0.35, l = 0.5 + Math.random() * 0.15; return hsl(h, s, l); }
  function hsl(h, s, l) { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  // ---------- math ----------
  function rotM(r) { return M4.mul3(M4.mul3(M4.rotY(-(r[1] || 0) * D2R), M4.rotX((r[0] || 0) * D2R)), M4.rotZ((r[2] || 0) * D2R)); }
  function matOf(d) { return M4.model(d.p, rotM(d.r || [0, 0, 0]), d.s); }
  const ap = (M, v) => [M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12], M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13], M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14]];
  // euler (deg) from a rotation matrix made like rotM
  function eulerOf(R) { const sb = Math.max(-1, Math.min(1, -R[7])), b = Math.asin(sb); let a, c; if (Math.abs(Math.cos(b)) > 1e-5) { a = Math.atan2(R[6], R[8]); c = Math.atan2(R[1], R[4]); } else { a = Math.atan2(-R[2], R[0]); c = 0; } return [b / D2R, -a / D2R, c / D2R].map(v => Math.round(v * 1000) / 1000); }

  // ---------- ready-made models (made from parts, so everything stays editable) ----------
  // each returns [{shape,p,r,s,c,mat,...}] around 0,0,0 standing on y = 0
  const P = (shape, p, s, c, mat = 'plastic', o = {}) => Object.assign({ shape, p, r: [0, 0, 0], s, c, mat }, o);
  const PREFABS = {
    'Oak tree': () => [P('cylinder', [0, 1.6, 0], [0.7, 3.2, 0.7], '#6b4a2e', 'bark'), P('cylinder', [0.45, 2.6, 0.1], [0.28, 1.4, 0.28], '#6b4a2e', 'bark', { r: [0, 0, -38] }),
      P('ball', [0, 4.2, 0], [3.4, 2.8, 3.4], '#4f9a3e', 'leaves'), P('ball', [1.3, 3.7, 0.6], [2.2, 1.9, 2.2], '#5aa845', 'leaves'), P('ball', [-1.1, 3.8, -0.7], [2.3, 2, 2.3], '#468f39', 'leaves'), P('ball', [0.2, 5.1, -0.4], [2, 1.6, 2], '#62b04c', 'leaves')],
    'Pine tree': () => [P('cylinder', [0, 1, 0], [0.5, 2, 0.5], '#5c3f28', 'bark'), P('cone', [0, 2.6, 0], [3.4, 2.4, 3.4], '#2f6b3f', 'leaves'), P('cone', [0, 3.9, 0], [2.7, 2.2, 2.7], '#347544', 'leaves'), P('cone', [0, 5.1, 0], [1.9, 2, 1.9], '#3a7f4a', 'leaves')],
    'Palm tree': () => { const o = [P('cylinder', [0, 1.5, 0], [0.42, 3, 0.42], '#9a7650', 'bark', { r: [0, 0, 6] }), P('cylinder', [0.3, 4.2, 0], [0.36, 2.6, 0.36], '#9a7650', 'bark', { r: [0, 0, 10] })];
      for (let k = 0; k < 6; k++) { const a = k * 60; o.push(P('wedge', [0.55 + Math.cos(a * D2R) * 1.3, 5.3, Math.sin(a * D2R) * 1.3], [0.9, 0.18, 2.6], '#3f9a3e', 'leaves', { r: [-14, -a + 90, 0] })); }
      o.push(P('ball', [0.6, 5.2, 0.25], [0.4, 0.4, 0.4], '#6b4a2e', 'plastic'), P('ball', [0.4, 5.15, -0.3], [0.38, 0.38, 0.38], '#6b4a2e', 'plastic')); return o; },
    'Bush': () => [P('ball', [0, 0.6, 0], [1.8, 1.3, 1.6], '#4a9a3e', 'leaves'), P('ball', [0.7, 0.5, 0.3], [1.2, 1, 1.2], '#55a845', 'leaves'), P('ball', [-0.6, 0.5, -0.2], [1.1, 0.9, 1.1], '#438f38', 'leaves'), P('ball', [0.3, 0.9, -0.4], [0.18, 0.18, 0.18], '#e0443c', 'plastic'), P('ball', [-0.2, 1.05, 0.4], [0.18, 0.18, 0.18], '#e0443c', 'plastic')],
    'Rock': () => [P('ball', [0, 0.5, 0], [2.4, 1.4, 1.9], '#8e8b84', 'stone', { r: [8, 20, 0] }), P('ball', [0.9, 0.35, 0.6], [1.2, 0.9, 1.1], '#7f7c76', 'stone', { r: [0, 50, 12] }), P('ball', [-0.8, 0.3, -0.4], [0.9, 0.6, 0.8], '#9a978f', 'stone')],
    'Lamp post': () => [P('cylinder', [0, 0.15, 0], [0.7, 0.3, 0.7], '#2a2d36', 'metal'), P('cylinder', [0, 2.2, 0], [0.18, 4, 0.18], '#2f333d', 'metal'), P('cylinder', [0, 4.3, 0], [0.5, 0.2, 0.5], '#2a2d36', 'metal'),
      P('ball', [0, 4.75, 0], [0.75, 0.8, 0.75], '#ffe6a8', 'neon', { light: 12 }), P('cone', [0, 5.35, 0], [1, 0.45, 1], '#2a2d36', 'metal')],
    'Bench': () => [P('block', [0, 0.55, 0], [2.4, 0.12, 0.7], '#a0703f', 'wood'), P('block', [0, 1.05, -0.33], [2.4, 0.6, 0.1], '#a0703f', 'wood', { r: [-10, 0, 0] }),
      P('block', [-1, 0.27, 0], [0.12, 0.55, 0.6], '#2f333d', 'metal'), P('block', [1, 0.27, 0], [0.12, 0.55, 0.6], '#2f333d', 'metal')],
    'Wooden crate': () => [P('block', [0, 0.6, 0], [1.2, 1.2, 1.2], '#b07a45', 'wood'), P('block', [0, 0.6, 0.61], [1.22, 0.16, 0.04], '#7a5232', 'wood', { r: [0, 0, 45] }), P('block', [0, 0.6, -0.61], [1.22, 0.16, 0.04], '#7a5232', 'wood', { r: [0, 0, -45] })],
    'Treasure chest': () => [P('block', [0, 0.4, 0], [1.4, 0.8, 0.9], '#8a5a2e', 'wood'), P('cylinder', [0, 0.8, 0], [0.9, 1.4, 0.9], '#9a6634', 'wood', { r: [0, 0, 90], s: [0.9, 1.4, 0.9] }),
      P('block', [0, 0.45, 0.46], [0.24, 0.3, 0.06], '#e8b631', 'metal'), P('block', [-0.5, 0.6, 0], [0.1, 1.2, 0.95], '#e8b631', 'metal'), P('block', [0.5, 0.6, 0], [0.1, 1.2, 0.95], '#e8b631', 'metal')],
    'Coin': () => [P('cylinder', [0, 1, 0], [1, 0.14, 1], '#ffcf3a', 'metal', { r: [90, 0, 0], glow: 0.25, solid: false, name: 'Coin' }), P('star', [0, 1, 0.075], [0.45, 0.04, 0.45], '#fff2a8', 'metal', { r: [90, 0, 0], solid: false })],
    'Gem': () => [P('pyramid', [0, 1.35, 0], [0.8, 0.6, 0.8], '#5ad8ff', 'glass', { glow: 0.3, light: 4 }), P('pyramid', [0, 0.75, 0], [0.8, 0.6, 0.8], '#3ab0f0', 'glass', { r: [180, 0, 0], glow: 0.3 })],
    'Campfire': () => { const o = []; for (let k = 0; k < 5; k++) { const a = k * 72; o.push(P('cylinder', [Math.cos(a * D2R) * 0.35, 0.25, Math.sin(a * D2R) * 0.35], [0.22, 1.3, 0.22], '#6b4a2e', 'bark', { r: [0, -a, 70] })); }
      for (let k = 0; k < 8; k++) { const a = k * 45; o.push(P('ball', [Math.cos(a * D2R) * 0.95, 0.15, Math.sin(a * D2R) * 0.95], [0.45, 0.32, 0.4], '#8a8780', 'stone')); }
      o.push(P('cone', [0, 0.7, 0], [0.7, 1.1, 0.7], '#ff7a1a', 'neon', { light: 14, solid: false }), P('cone', [0.05, 0.75, 0.05], [0.35, 1.2, 0.35], '#ffe066', 'neon', { solid: false })); return o; },
    'Little house': () => [P('block', [0, 1.5, 0], [6, 3, 5], '#efe4cf', 'plaster'), P('wedge', [0, 3.9, 1.3], [6.4, 1.8, 2.6], '#b8483a', 'roof'), P('wedge', [0, 3.9, -1.3], [6.4, 1.8, 2.6], '#b8483a', 'roof', { r: [0, 180, 0] }),
      P('block', [0, 1.05, 2.51], [1.2, 2.1, 0.08], '#7a5232', 'wood'), P('ball', [0.4, 1.05, 2.58], [0.12, 0.12, 0.12], '#e8b631', 'metal'), P('block', [-1.9, 1.7, 2.51], [1.1, 1, 0.06], '#bfe6ff', 'glass'), P('block', [1.9, 1.7, 2.51], [1.1, 1, 0.06], '#bfe6ff', 'glass'),
      P('block', [1.8, 4.4, -0.6], [0.6, 1.4, 0.6], '#9a4a3a', 'bricks'), P('block', [0, 0.1, 0], [6.4, 0.2, 5.4], '#8a8780', 'stone')],
    'Tower': () => [P('cylinder', [0, 4, 0], [4, 8, 4], '#a8a49a', 'bricks'), P('cylinder', [0, 8.3, 0], [4.6, 0.6, 4.6], '#8e8b84', 'stone'), P('cone', [0, 10.2, 0], [5, 3.4, 5], '#3a4f8a', 'roof'),
      P('block', [0, 1.3, 2.0], [1.3, 2.6, 0.2], '#5c3f28', 'wood'), P('block', [0, 5.5, 2.02], [0.8, 1.2, 0.1], '#ffd88a', 'neon', { light: 8 }), P('cylinder', [0, 12.6, 0], [0.08, 1.6, 0.08], '#2f333d', 'metal'), P('wedge', [0.45, 13, 0], [0.9, 0.5, 0.05], '#e0443c', 'plastic', { r: [0, 90, 0] })],
    'Fence': () => { const o = []; for (let k = 0; k < 4; k++) o.push(P('block', [-2.25 + k * 1.5, 0.6, 0], [0.18, 1.2, 0.18], '#b0844f', 'wood')); o.push(P('block', [0, 0.85, 0], [4.8, 0.14, 0.08], '#b0844f', 'wood'), P('block', [0, 0.45, 0], [4.8, 0.14, 0.08], '#b0844f', 'wood')); return o; },
    'Bridge': () => { const o = []; for (let k = 0; k < 10; k++) o.push(P('block', [0, 0.1 + Math.sin(k / 9 * Math.PI) * 0.6, -4.5 + k], [3, 0.16, 0.9], k % 2 ? '#a0703f' : '#946436', 'wood', { r: [Math.cos(k / 9 * Math.PI) * -15, 0, 0] }));
      for (const x of [-1.5, 1.5]) for (let k = 0; k < 4; k++) o.push(P('cylinder', [x, 0.9 + Math.sin((k / 3) * Math.PI) * 0.6, -4.5 + k * 3], [0.18, 1.6, 0.18], '#6b4a2e', 'bark')); return o; },
    'Flag': () => [P('cylinder', [0, 2.5, 0], [0.12, 5, 0.12], '#c3c8d0', 'metal'), P('ball', [0, 5.05, 0], [0.24, 0.24, 0.24], '#e8b631', 'metal'), P('block', [0.85, 4.4, 0], [1.6, 1, 0.04], '#e0443c', 'plastic'), P('star', [0.85, 4.4, 0.03], [0.5, 0.02, 0.5], '#ffffff', 'plastic', { r: [90, 0, 0] })],
    'Sign': () => [P('block', [0, 0.9, 0], [0.16, 1.8, 0.16], '#7a5232', 'wood'), P('block', [0, 1.8, 0.1], [2.2, 1, 0.12], '#b07a45', 'wood', { label: 'Hello!' })],
    'Bounce pad': () => [P('cylinder', [0, 0.15, 0], [2.4, 0.3, 2.4], '#2f333d', 'metal'), P('cylinder', [0, 0.34, 0], [2, 0.1, 2], '#3ad48a', 'neon', { name: 'BouncePad', code: '#if = player = touch = then = launch = player = 22' })],
    'Speed pad': () => [P('block', [0, 0.1, 0], [2.4, 0.2, 3.2], '#2f333d', 'metal'), P('wedge', [0, 0.28, 0.2], [1.4, 0.12, 1.2], '#ffd23a', 'neon', { r: [0, 0, 0], name: 'SpeedPad', code: '#if = player = touch = then = boost = player = 30' })],
    'Lava block': () => [P('block', [0, 0.5, 0], [4, 1, 4], '#ff5a1a', 'neon', { light: 10, name: 'Lava', code: '#if = player = touch = then = kill = player' })],
    'Checkpoint': () => [P('cylinder', [0, 0.1, 0], [3, 0.2, 3], '#8e8b84', 'stone'), P('ring', [0, 0.25, 0], [2.6, 0.6, 2.6], '#5ff0e0', 'neon', { solid: false, name: 'Checkpoint', code: '#if = player = touch = then = checkpoint = player = self\n#if = player = touch = then = say = Checkpoint!' })],
    'Portal ring': () => [P('ring', [0, 2.4, 0], [4.4, 4.4, 1.6], '#b48cff', 'neon', { r: [90, 0, 0], light: 10 }), P('cylinder', [0, 2.4, 0], [3.4, 0.05, 3.4], '#7a5cff', 'glass', { r: [90, 0, 0], solid: false, glow: 0.4, name: 'PortalInside' }), P('block', [0, 0.2, 0], [5, 0.4, 1.8], '#5a5f70', 'stone')],
    'Mushroom': () => [P('cylinder', [0, 0.6, 0], [0.5, 1.2, 0.5], '#f2ead8', 'plastic'), P('dome', [0, 1.2, 0], [1.8, 1, 1.8], '#e0443c', 'plastic'), P('ball', [0.4, 1.75, 0.3], [0.25, 0.12, 0.25], '#ffffff', 'plastic'), P('ball', [-0.45, 1.6, -0.2], [0.22, 0.1, 0.22], '#ffffff', 'plastic'), P('ball', [0, 1.9, -0.45], [0.2, 0.1, 0.2], '#ffffff', 'plastic')],
    'Fountain': () => [P('cylinder', [0, 0.35, 0], [5, 0.7, 5], '#b8b4aa', 'stone'), P('cylinder', [0, 0.62, 0], [4.4, 0.2, 4.4], '#3aa8e0', 'glass', { solid: false }), P('cylinder', [0, 1.4, 0], [0.7, 2, 0.7], '#b8b4aa', 'stone'),
      P('dome', [0, 2.4, 0], [2, 0.6, 2], '#b8b4aa', 'stone', { r: [180, 0, 0] }), P('cone', [0, 2.9, 0], [0.5, 0.9, 0.5], '#8fd0ff', 'glass', { glow: 0.3 })],
    'Boat': () => [P('block', [0, 0.45, 0], [2.2, 0.5, 4.4], '#a0703f', 'wood'), P('wedge', [0, 0.45, 2.8], [2.2, 0.5, 1.2], '#a0703f', 'wood', { r: [0, 180, 0] }), P('block', [0, 0.75, 0], [1.9, 0.15, 3.8], '#7a5232', 'wood'),
      P('cylinder', [0, 2.6, -0.3], [0.14, 4, 0.14], '#6b4a2e', 'bark'), P('wedge', [0, 3, 0.4], [0.06, 3, 1.6], '#f4efe2', 'plastic', { r: [0, 180, 0] })],
    'Stairs': () => [P('stairs', [0, 1, 0], [3, 2, 3], '#9a978f', 'stone')],
    'Spinning platform': () => [P('cylinder', [0, 4, 0], [5, 0.4, 5], '#3a6ee0', 'metal', { name: 'Spinner', code: '#spin = self = 0,40,0' }), P('cylinder', [0, 2, 0], [0.5, 4, 0.5], '#2f333d', 'metal')],
    'Moving platform': () => [P('block', [0, 3, 0], [4, 0.4, 4], '#ff8a2a', 'metal', { name: 'Mover', code: '#forever\n#move = self = 0,0,8 = 2s\n#wait = 2s\n#move = self = 0,0,-8 = 2s\n#wait = 2s\n#end' })],
    'Kill brick': () => [P('block', [0, 0.25, 0], [4, 0.5, 4], '#e0443c', 'neon', { name: 'KillBrick', code: '#if = player = touch = then = kill = player' })],
    'Finish line': () => [P('block', [-3, 2, 0], [0.4, 4, 0.4], '#f4f4f2', 'metal'), P('block', [3, 2, 0], [0.4, 4, 0.4], '#f4f4f2', 'metal'), P('block', [0, 4.2, 0], [6.4, 0.8, 0.2], '#1b1c22', 'plastic', { label: 'FINISH' }),
      P('block', [0, 2, 0], [5.6, 4, 0.4], '#ffffff', 'glass', { solid: false, alpha: 0, name: 'FinishZone', code: '#if = player = touch = then = win = You made it, {player.name}!' })],
    'Neon arch': () => [P('arch', [0, 2, 0], [5, 4, 0.8], '#ff5ad8', 'neon', { light: 10 })],
    'Snowman': () => [P('ball', [0, 0.8, 0], [1.6, 1.6, 1.6], '#f4f8fc', 'snow'), P('ball', [0, 2, 0], [1.1, 1.1, 1.1], '#f4f8fc', 'snow'), P('ball', [0, 2.9, 0], [0.8, 0.8, 0.8], '#f4f8fc', 'snow'),
      P('cone', [0, 2.9, 0.5], [0.12, 0.5, 0.12], '#ff8a2a', 'plastic', { r: [90, 0, 0] }), P('ball', [0.15, 3.05, 0.36], [0.08, 0.08, 0.08], '#1b1c22'), P('ball', [-0.15, 3.05, 0.36], [0.08, 0.08, 0.08], '#1b1c22'),
      P('cylinder', [0, 3.35, 0], [0.75, 0.08, 0.75], '#1b1c22'), P('cylinder', [0, 3.65, 0], [0.5, 0.6, 0.5], '#1b1c22')],
    'Street light (night)': () => [P('cylinder', [0, 2.5, 0], [0.16, 5, 0.16], '#2f333d', 'metal'), P('block', [0.6, 5, 0], [1.4, 0.12, 0.3], '#2f333d', 'metal'), P('block', [1.1, 4.88, 0], [0.5, 0.12, 0.34], '#fff2c0', 'neon', { light: 16, code: '#forever\n#if = night\n#glow = self\n#else\n#unglow = self\n#end\n#wait = 2s\n#end' })],
  };

  // ---------- the mod code ----------
  // A line is  #command = value = value ...   Lines that start with -- or // are notes.
  const T_ = 'target', N_ = 'number', V_ = 'place', TM = 'time', C_ = 'colour', S_ = 'text', WD = 'word', PL = 'player';
  const CMDS = {
    // structure
    on: [[WD], 'when something happens, run the lines under it (up to #end), or the command after it', '#on = click = destroy = self', 'Logic'],
    if: [[S_], 'only run if something is true. Events: touch, click, near. Or a check like coins > 5', '#if = player.main = touch = part4 = then = destroy = self', 'Logic'],
    unless: [[S_], 'only run if something is NOT true', '#unless = coins > 0', 'Logic'],
    else: [[], 'the other way, after #if', '#else', 'Logic'], end: [[], 'ends #on, #if, #repeat, #forever, #while, #function and #once', '#end', 'Logic'],
    repeat: [[N_], 'run the lines under it this many times', '#repeat = 5', 'Logic'], forever: [[], 'run the lines under it again and again', '#forever', 'Logic'],
    while: [[S_], 'keep running the lines under it while this is true', '#while = coins < 10', 'Logic'], once: [[], 'run the lines under it only the first time', '#once', 'Logic'],
    function: [[WD], 'make your own command (lines up to #end)', '#function = party', 'Logic'], call: [[WD], 'run your own command', '#call = party', 'Logic'],
    wait: [[TM], 'wait before the next line', '#wait = 2s', 'Logic'], stop: [[], 'stop this run of lines', '#stop', 'Logic'],
    send: [[WD], 'send a message to #on = message = name', '#send = open_door', 'Logic'],
    // values
    var: [[WD, S_], 'make a value with a name', '#var = coins = 0', 'Values'], set: [[WD, S_], 'change a value (or a property like part4.y)', '#set = part4.y = 20', 'Values'],
    add: [[WD, S_], 'add to a value', '#add = coins = 1', 'Values'], sub: [[WD, S_], 'take away from a value', '#sub = lives = 1', 'Values'],
    random: [[WD, N_, N_], 'set a value to a random whole number', '#random = roll = 1 = 6', 'Values'],
    hud: [[S_], 'show text in the corner of the screen ({ } shows a value)', '#hud = Coins: {coins}', 'Screen'], hide_hud: [[], 'take the corner text away', '#hide_hud', 'Screen'],
    // parts
    destroy: [[T_], 'remove a part or model', '#destroy = self', 'Parts'], hide: [[T_], 'make it invisible (you can still touch it)', '#hide = part4', 'Parts'],
    show: [[T_], 'make it visible again', '#show = part4', 'Parts'], move: [[T_, V_, TM], 'move it by x,y,z (smoothly if you give a time)', '#move = self = 0,5,0 = 2s', 'Parts'],
    move_to: [[T_, V_, TM], 'move it to a place (x,y,z or another part or player)', '#move_to = self = Goal = 3s', 'Parts'],
    turn: [[T_, V_, TM], 'turn it by x,y,z degrees', '#turn = door = 0,90,0 = 1s', 'Parts'], turn_to: [[T_, V_, TM], 'turn it to face x,y,z degrees', '#turn_to = door = 0,0,0', 'Parts'],
    size: [[T_, V_, TM], 'set its size to x,y,z', '#size = self = 4,1,4 = 1s', 'Parts'], grow: [[T_, N_, TM], 'make it bigger (2) or smaller (0.5)', '#grow = self = 2 = 1s', 'Parts'],
    spin: [[T_, V_], 'keep turning (degrees each second)', '#spin = self = 0,90,0', 'Parts'], stop_spin: [[T_], 'stop spinning', '#stop_spin = self', 'Parts'],
    bob: [[T_, N_], 'float up and down', '#bob = self = 0.5', 'Parts'], rainbow: [[T_], 'keep changing colour', '#rainbow = self', 'Parts'],
    follow: [[T_, PL], 'keep following a player', '#follow = Pet = player', 'Parts'], unfollow: [[T_], 'stop following', '#unfollow = Pet', 'Parts'],
    color: [[T_, C_], 'change its colour (#ff5a2a, red, random...)', '#color = self = gold', 'Parts'], material: [[T_, WD], 'change what it is made of: ' + Object.keys(MATS).join(', '), '#material = self = metal', 'Parts'],
    shape: [[T_, WD], 'change its shape: ' + Object.keys(SHAPES).join(', '), '#shape = self = ball', 'Parts'],
    glow: [[T_], 'make it glow', '#glow = self', 'Parts'], unglow: [[T_], 'stop glowing', '#unglow = self', 'Parts'],
    light: [[T_, N_], 'it lights up the area around it (how far)', '#light = self = 12', 'Parts'], see_through: [[T_, N_], 'how see-through (0 = solid look, 1 = invisible)', '#see_through = self = 0.5', 'Parts'],
    solid: [[T_], 'players bump into it', '#solid = self', 'Parts'], not_solid: [[T_], 'players go through it', '#not_solid = self', 'Parts'],
    label: [[T_, S_], 'show text above it ({ } shows a value)', '#label = self = {coins} coins', 'Parts'], fade_out: [[T_, TM], 'fade away', '#fade_out = self = 1s', 'Parts'], fade_in: [[T_, TM], 'fade back in', '#fade_in = self = 1s', 'Parts'],
    copy: [[T_, V_], 'make a copy of it (moved by x,y,z)', '#copy = Coin = 0,0,3', 'Parts'], spawn: [[WD, V_], 'put a copy of something from Storage into the world', '#spawn = Meteor = player', 'Parts'],
    explode: [[T_], 'blow it up (pushes players away)', '#explode = self', 'Effects'], particles: [[T_, WD], 'sparkle effect: sparkles, fire, smoke, confetti, bubbles, stars, hearts, snow', '#particles = self = confetti', 'Effects'],
    sound: [[WD], 'play a sound: jump, coin, chest, quest, discover, boost, boom, splash, tp, click, place, break, wind, thunder', '#sound = coin', 'Effects'],
    shake: [[N_], 'shake the screen', '#shake = 1', 'Effects'],
    // players
    kill: [[PL], 'knock the player out (back to their spawn)', '#kill = player', 'Players'], respawn: [[PL], 'send the player back to their spawn', '#respawn = player', 'Players'],
    teleport: [[PL, V_], 'move the player to a place', '#teleport = player = Goal', 'Players'], launch: [[PL, V_], 'throw the player up (a number) or along x,y,z', '#launch = player = 25', 'Players'],
    push: [[PL, V_], 'push the player along x,y,z', '#push = player = 0,5,20', 'Players'], boost: [[PL, N_], 'speed the player up the way they are rolling', '#boost = player = 30', 'Players'], speed: [[PL, N_], 'how fast the player rolls (1 = normal)', '#speed = player = 2', 'Players'],
    jump_power: [[PL, N_], 'how high the player jumps (1 = normal)', '#jump_power = player = 2', 'Players'], gravity: [[PL, N_], 'how strong gravity is for the player (1 = normal)', '#gravity = player = 0.3', 'Players'],
    big: [[PL], 'make the player big', '#big = player', 'Players'], normal: [[PL], 'speed, jump, gravity and size back to normal', '#normal = player', 'Players'],
    freeze: [[PL], 'the player can\'t move', '#freeze = player', 'Players'], unfreeze: [[PL], 'the player can move again', '#unfreeze = player', 'Players'],
    give_coins: [[PL, N_], 'give the player coins', '#give_coins = player = 10', 'Players'], checkpoint: [[PL, V_], 'the player comes back here when knocked out', '#checkpoint = player = self', 'Players'],
    say: [[S_], 'a little message on the screen', '#say = Hello {player.name}!', 'Screen'], message: [[S_], 'a big message across the screen', '#message = The door is open!', 'Screen'],
    chat: [[S_], 'write in the chat', '#chat = Someone found the gem!', 'Screen'], win: [[S_], 'a big "you win" message with confetti', '#win = You win!', 'Screen'],
    // world
    time: [[WD], 'set the time: day, sunset, night, sunrise', '#time = night', 'World'], weather: [[WD], 'set the weather: clear, rain, storm', '#weather = rain', 'World'],
    music: [[WD], 'change the music: meadow, forest, beach, desert, snow, cave, station, sky, volcano, night', '#music = volcano', 'World'],
  };
  const EVENTS = { start: 'when the mod starts', click: 'when someone clicks or taps it', touch: 'when a player touches it', untouch: 'when a player stops touching it', near: 'when a player comes close (= how close)', every: 'again and again (= how often)', chat: 'when someone writes this in the chat', message: 'when #send sends this', jump: 'when a player jumps', key: 'when a key is pressed (computer)' };
  const PLAYER_WORDS = ['player', 'player.main', 'player_main', 'me', 'toucher', 'clicker', 'everyone', 'all_players', 'anyone', 'someone'];

  // split a line on = (but not ==, >=, <=, !=)
  function splitLine(s) { const out = []; let cur = '', q = false; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '"') q = !q; if (!q && ch === '=' && !'=<>!'.includes(s[i - 1] || '') && s[i + 1] !== '=') { out.push(cur.trim()); cur = ''; continue; } cur += ch; } out.push(cur.trim()); return out; }
  const norm = w => String(w || '').trim().toLowerCase().replace(/\s+/g, '_');
  const NEED2 = new Set(['boost', 'move', 'move_to', 'size', 'color', 'material', 'shape', 'teleport', 'push', 'speed', 'jump_power', 'gravity', 'give_coins', 'label', 'set', 'var', 'add', 'sub', 'grow', 'turn_to', 'random']);
  const isCmd = w => Object.prototype.hasOwnProperty.call(CMDS, norm(w)) && !['on', 'if', 'unless', 'else', 'end', 'repeat', 'forever', 'while', 'once', 'function'].includes(norm(w));

  // code -> { body: [stmt], funcs: {name: body}, errs: [{line, msg}] }
  function compile(code) {
    const errs = [], funcs = {}, root = { body: [] }, stack = [root];
    const lines = String(code || '').split('\n');
    const err = (n, m) => errs.push({ line: n, msg: m });
    const cur = () => stack[stack.length - 1];
    const push = st => { const top = cur(); (top.inElse ? top.els : top.body).push(st); };
    // turn "cmd = a = b" pieces into a command statement (used inline too)
    function cmdStmt(parts, n) {
      const name = norm(parts[0]); const C = CMDS[name];
      if (!C) { const near = Object.keys(CMDS).find(k => k.startsWith(name.slice(0, 3))); err(n, 'unknown command #' + name + (near ? ' (did you mean #' + near + '?)' : '')); return null; }
      const args = parts.slice(1);
      const has = i => args[i] != null && args[i] !== '';
      if (NEED2.has(name) && !has(1)) err(n, '#' + name + ' needs more, like ' + C[2]);
      else if (C[0].length && C[0][0] !== T_ && C[0][0] !== PL && !has(0) && name !== 'shake') err(n, '#' + name + ' needs a value, like ' + C[2]);
      return { op: 'cmd', name, args, n };
    }
    // the condition pieces of an #if (stops at "then" or at a command after an event word)
    function condOf(parts, n) {
      const p = parts.map(x => x), lw = p.map(norm);
      const ev = ['touch', 'touches', 'touching', 'click', 'clicks', 'near'].find(e => lw.includes(e));
      if (ev) {
        const i = lw.indexOf(ev); const who = i > 0 ? p[i - 1] : 'player'; let k = i + 1, thing = null, dist = null;
        if (ev === 'near' && p[k] && !isNaN(parseFloat(p[k])) && !isCmd(p[k])) { dist = p[k]; k++; }
        if (p[k] && norm(p[k]) !== 'then' && !isCmd(p[k])) { thing = p[k]; k++; }
        if (ev === 'near' && !dist && p[k] && !isNaN(parseFloat(p[k]))) { dist = p[k]; k++; }
        if (p[k] && norm(p[k]) === 'then') k++;
        const kind = ev.startsWith('touch') ? 'touch' : ev.startsWith('click') ? 'click' : 'near';
        if (i > 1) err(n, 'write it like #if = player = ' + ev + ' = part4 = then = …');
        return { cond: { ev: kind, who, thing, dist }, rest: p.slice(k) };
      }
      const ti = lw.indexOf('then'); if (ti >= 0) return { cond: { expr: p.slice(0, ti).join('=') }, rest: p.slice(ti + 1) };
      return { cond: { expr: p.join('=') }, rest: [] };
    }
    lines.forEach((raw, idx) => {
      const n = idx + 1, line = raw.trim();
      if (!line || line.startsWith('--') || line.startsWith('//')) return;
      if (!line.startsWith('#')) { err(n, 'a line starts with #, like #destroy = self'); return; }
      const parts = splitLine(line.slice(1)), name = norm(parts[0]);
      if (/\.touch$/.test(name)) { err(n, 'write touch on its own: #if = player = touch = part4 = then = …'); return; }
      if (name === 'end') { if (stack.length < 2) err(n, '#end without anything to end'); else { const b = stack.pop(); if (b.op === 'function') funcs[b.fname] = b.body; } return; }
      if (name === 'else') { const top = cur(); if (top.op !== 'if') { err(n, '#else goes inside an #if'); return; } if (top.inElse) err(n, 'only one #else per #if'); top.inElse = true; top.els = top.els || []; return; }
      if (name === 'on') {
        const ev = norm(parts[1]); if (!EVENTS[ev]) { err(n, 'on what? ' + Object.keys(EVENTS).join(', ')); return; }
        let k = 2, arg = null; const wantsArg = ['near', 'every', 'chat', 'message', 'key'].includes(ev);
        if (wantsArg) { arg = parts[2] || ''; k = 3; if (!arg) { err(n, '#on = ' + ev + ' needs a value, like ' + (ev === 'every' ? '#on = every = 2s' : ev === 'near' ? '#on = near = 6' : '#on = ' + ev + ' = hello')); } }
        else if ((ev === 'touch' || ev === 'click' || ev === 'untouch') && parts[2] && !isCmd(parts[2])) { arg = parts[2]; k = 3; }
        const st = { op: 'on', ev, arg, body: [], n };
        if (parts[k]) { const c = cmdStmt(parts.slice(k), n); if (c) st.body.push(c); push(st); }
        else { push(st); stack.push(st); }
        return;
      }
      if (name === 'if' || name === 'unless') {
        const { cond, rest } = condOf(parts.slice(1), n); if (name === 'unless') cond.not = true;
        if (!cond.ev && !cond.expr.trim()) err(n, '#' + name + ' needs something to check');
        const st = { op: 'if', cond, body: [], n };
        if (rest.length && rest[0]) { const c = cmdStmt(rest, n); if (c) st.body.push(c); push(st); } else { push(st); stack.push(st); }
        return;
      }
      if (name === 'repeat' || name === 'forever' || name === 'while' || name === 'once') { const st = { op: name, arg: parts.slice(1).join('='), body: [], n }; if (name === 'repeat' && !parts[1]) err(n, 'how many times? #repeat = 5'); push(st); stack.push(st); return; }
      if (name === 'function') { const f = norm(parts[1]); if (!f) { err(n, 'give it a name: #function = party'); return; } const st = { op: 'function', fname: f, body: [], n }; if (stack.length > 1) err(n, 'make functions outside other blocks'); stack.push(st); return; }
      // NauticX style: #kill = player = if = touch   /  #destroy = self = on = click
      const lw = parts.map(norm), ii = lw.findIndex((w, i) => i > 0 && (w === 'if' || w === 'on') && ['touch', 'click'].includes(lw[i + 1]));
      if (ii > 0) { const c = cmdStmt(parts.slice(0, ii), n); if (c) push({ op: 'on', ev: lw[ii + 1], arg: parts[ii + 2] || null, body: [c], n }); return; }
      const c = cmdStmt(parts, n); if (c) push(c);
    });
    for (let k = stack.length - 1; k > 0; k--) err(stack[k].n, 'this #' + (stack[k].op === 'function' ? 'function' : stack[k].op) + ' is missing its #end');
    return { body: root.body, funcs, errs };
  }

  // ---------- expressions: numbers, values, part.y, player.name, + - * / and or not, random(1,6) ----------
  function tokens(s) {
    const out = []; let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '"' || ch === "'") { const j = s.indexOf(ch, i + 1); const e = j < 0 ? s.length : j; out.push({ t: 's', v: s.slice(i + 1, e) }); i = e + 1; continue; }
      if (ch === '#' && /^#[0-9a-f]{3,6}\b/i.test(s.slice(i))) { const m = s.slice(i).match(/^#[0-9a-f]{3,6}/i)[0]; out.push({ t: 's', v: m }); i += m.length; continue; }
      if (/[0-9.]/.test(ch)) { const m = s.slice(i).match(/^\d*\.?\d+(e-?\d+)?/i); if (m) { out.push({ t: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; } }
      if (/[A-Za-z_]/.test(ch)) { const m = s.slice(i).match(/^[A-Za-z_][\w.]*/)[0]; out.push({ t: 'id', v: m }); i += m.length; continue; }
      const two = s.slice(i, i + 2); if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
      if ('+-*/%^()<>,!'.includes(ch)) { out.push({ t: 'op', v: ch }); i++; continue; }
      i++;
    }
    return out;
  }
  const FUNCS = { random: (a = 0, b = 1) => Math.floor(a + Math.random() * (b - a + 1)), round: Math.round, floor: Math.floor, ceil: Math.ceil, abs: Math.abs, sqrt: Math.sqrt, min: Math.min, max: Math.max,
    sin: a => Math.sin(a * D2R), cos: a => Math.cos(a * D2R), tan: a => Math.tan(a * D2R), clamp: (v, a, b) => Math.max(a, Math.min(b, v)), pick: (...a) => a[Math.floor(Math.random() * a.length)] };
  function evalExpr(src, look) {
    const tk = tokens(String(src)); let i = 0;
    const peek = () => tk[i], eat = v => { if (tk[i] && tk[i].v === v) { i++; return true; } return false; };
    const kw = v => tk[i] && tk[i].t === 'id' && tk[i].v.toLowerCase() === v;
    function or() { let a = and(); while (eat('||') || (kw('or') && ++i)) { const b = and(); a = truthy(a) || truthy(b); } return a; }
    function and() { let a = not(); while (eat('&&') || (kw('and') && ++i)) { const b = not(); a = truthy(a) && truthy(b); } return a; }
    function not() { if (eat('!') || (kw('not') && ++i)) return !truthy(not()); return cmp(); }
    function cmp() { let a = sum(); for (;;) { const t = peek(); if (!t) return a; let op = t.t === 'op' && ['>', '<', '>=', '<=', '==', '!='].includes(t.v) ? t.v : t.t === 'id' && ['is', 'is_not', 'isnt'].includes(t.v.toLowerCase()) ? (t.v.toLowerCase() === 'is' ? '==' : '!=') : null; if (!op) return a; i++;
      const b = sum(); a = op === '>' ? +a > +b : op === '<' ? +a < +b : op === '>=' ? +a >= +b : op === '<=' ? +a <= +b : op === '==' ? same(a, b) : !same(a, b); } }
    function sum() { let a = prod(); for (;;) { if (eat('+')) { const b = prod(); a = typeof a === 'number' && typeof b === 'number' ? a + b : String(a) + String(b); } else if (eat('-')) a = +a - +prod(); else return a; } }
    function prod() { let a = pow(); for (;;) { if (eat('*')) a = +a * +pow(); else if (eat('/')) { const b = +pow(); a = b ? +a / b : 0; } else if (eat('%')) { const b = +pow(); a = b ? +a % b : 0; } else return a; } }
    function pow() { const a = unary(); if (eat('^')) return Math.pow(+a, +pow()); return a; }
    function unary() { if (eat('-')) return -unary(); if (eat('+')) return +unary(); return atom(); }
    function atom() {
      const t = tk[i++]; if (!t) return 0;
      if (t.t === 'n' || t.t === 's') return t.v;
      if (t.v === '(') { const v = or(); eat(')'); return v; }
      if (t.t === 'id') {
        const lw = t.v.toLowerCase();
        if (FUNCS[lw] && peek() && peek().v === '(') { i++; const a = []; if (!eat(')')) { do a.push(or()); while (eat(',')); eat(')'); } return FUNCS[lw](...a.map(Number)); }
        if (lw === 'true' || lw === 'yes' || lw === 'on') return true; if (lw === 'false' || lw === 'no' || lw === 'off') return false;
        const v = look(t.v); return v === undefined ? t.v : v;
      }
      return 0;
    }
    try { const v = or(); return i < tk.length && tk.length === 1 ? v : v; } catch (e) { return 0; }
  }
  const truthy = v => !(v === false || v === 0 || v === '' || v == null || v === 'false' || v === 'no');
  const same = (a, b) => typeof a === 'number' || typeof b === 'number' ? +a === +b : String(a).toLowerCase() === String(b).toLowerCase();
  function timeOf(v) { if (typeof v === 'number') return v; const m = String(v).trim().match(/^(-?\d*\.?\d+)\s*(ms|s|m|sec|secs|seconds?|minutes?)?$/i); if (!m) return null; const u = (m[2] || 's').toLowerCase(); return parseFloat(m[1]) * (u === 'ms' ? 0.001 : u.startsWith('m') && u !== 'ms' ? 60 : 1); }

  // all the words the editor can suggest
  function suggestions() { return Object.keys(CMDS).map(k => ({ k, ex: CMDS[k][2], help: CMDS[k][1], cat: CMDS[k][3] })); }

  // ---------- a mod running in a world ----------
  let uid = 1;
  class World {
    // mod: the mod data. host: what the world can do (see the game and the editor). opts: { G (gfx), T (terrain) }
    constructor(mod, host, opts = {}) {
      this.mod = mod; this.host = host || {}; this.T = opts.T; this.live = !!opts.live; this.t = 0;
      this.items = new Map(); this.byName = new Map(); this.vars = {}; this.threads = []; this.handlers = []; this.watch = []; this.funcs = {}; this.anims = []; this.hudText = null; this.onceDone = new Set();
      this.touching = new Set(); this.errors = [];
      for (const d of mod.items || []) this.add(JSON.parse(JSON.stringify(d)), false);
    }
    add(d, run) {
      if (!d.id || this.items.has(d.id)) d.id = 'r' + (uid++);
      const it = { d, id: d.id, alive: true, dirty: true, tris: null, box: null, M: null, base: null };
      this.items.set(d.id, it); const k = norm(d.name || ''); if (k) { if (!this.byName.has(k)) this.byName.set(k, []); this.byName.get(k).push(it); }
      if (run && d.code) this.loadScript(d.code, it);
      return it;
    }
    kids(it) { const out = []; for (const o of this.items.values()) if (o.d.parent === it.id) out.push(o); return out; }
    parts(it) { if (it.d.k !== 'model') return [it]; let out = []; for (const k of this.kids(it)) out = out.concat(this.parts(k)); return out; }
    stored(it) { let x = it; while (x) { if (x.d.store) return true; x = x.d.parent ? this.items.get(x.d.parent) : null; } return false; }
    hidden(it) { let x = it; while (x) { if (x.d.show === false) return true; x = x.d.parent ? this.items.get(x.d.parent) : null; } return false; }
    inWorld(it) { return it.alive && !this.stored(it); }
    // ---- shapes in the world ----
    refresh(it) {
      if (!it.dirty) return; it.dirty = false; const d = it.d; it.M = matOf(d);
      const T = trisOf(d.shape || 'block'), M = it.M, out = new Array(T.length); let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let k = 0; k < T.length; k++) { const a = ap(M, T[k][0]), b = ap(M, T[k][1]), c = ap(M, T[k][2]); out[k] = [a, b, c]; for (const q of [a, b, c]) for (let j = 0; j < 3; j++) { if (q[j] < lo[j]) lo[j] = q[j]; if (q[j] > hi[j]) hi[j] = q[j]; } }
      it.tris = out; it.box = [lo, hi];
    }
    boxOf(it) { let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const p of this.parts(it)) { if (!p.alive) continue; this.refresh(p); for (let j = 0; j < 3; j++) { lo[j] = Math.min(lo[j], p.box[0][j]); hi[j] = Math.max(hi[j], p.box[1][j]); } } return lo[0] > hi[0] ? null : [lo, hi]; }
    centre(it) { if (it.d.k !== 'model') return [...it.d.p]; const b = this.boxOf(it); return b ? [0, 1, 2].map(j => (b[0][j] + b[1][j]) / 2) : [0, 0, 0]; }
    draw(G, t, clear) {
      for (const it of this.items.values()) {
        const d = it.d; if (d.k === 'model' || !this.inWorld(it) || this.hidden(it)) continue;
        const M_ = MATS[d.mat] || MATS.plastic; let a = (d.alpha ?? 1) * (M_.alpha ?? 1); if (it.fade != null) a *= it.fade; if (a <= 0.01) continue;
        if ((a < 0.99) !== !!clear) continue;
        this.refresh(it);
        G.flat(FLAT[d.shape || 'block'] ? 1 : 0); G.mat(M_.toon || 0, M_.rim ?? 0.12, M_.spec ?? 0.1); G.tex(M_.tex >= 0 ? 10 + M_.tex : 0);
        const col = rgb(it.col || d.c || '#cccccc'), glow = Math.max(M_.glow || 0, d.glow || 0, it.glowOn ? 0.85 : 0);
        G.draw(meshOf(G, d.shape || 'block'), it.M, a, col, glow);
        if (this.sel && this.sel.has(it.id) && G.outline) G.outline(meshOf(G, d.shape || 'block'), it.M, 0.02 / Math.max(0.3, Math.min(...d.s.map(Math.abs))), [1, 0.75, 0.2]);
      }
      G.flat(1); G.tex(0);
    }
    lights() { const out = []; for (const it of this.items.values()) { const d = it.d; if (d.k === 'model' || !this.inWorld(it) || this.hidden(it)) continue; const L = it.lightR ?? d.light; if (L > 0) out.push({ p: d.p, r: L, c: rgb(it.col || d.c || '#ffffff').map(v => v * 0.9 + 0.1) }); } return out; }
    // ---- players bump into parts ----
    collide(b, push, closest) {
      const p = b.p, r = b.r, touched = this.touchNow || (this.touchNow = new Set());
      for (const it of this.items.values()) {
        const d = it.d; if (d.k === 'model' || !this.inWorld(it)) continue; this.refresh(it);
        const [lo, hi] = it.box; if (p[0] + r < lo[0] - 0.1 || p[0] - r > hi[0] + 0.1 || p[1] + r < lo[1] - 0.1 || p[1] - r > hi[1] + 0.1 || p[2] + r < lo[2] - 0.1 || p[2] - r > hi[2] + 0.1) continue;
        const solid = d.solid !== false && !it.ghost; let hit = false;
        for (const t of it.tris) { const q = closest(p, t[0], t[1], t[2]), dd = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (dd < r + 0.06) { hit = true; if (solid) { const old = it.moved; push(b, q, { mod: it, bouncy: false }); if (old && dd < r && q[1] < p[1]) b.carry = old; } else break; } }
        if (hit) touched.add(it.id);
      }
    }
    // ---- clicks: the nearest part under a ray ----
    pick(o, dir, maxD = 400, filter) {
      let best = null;
      for (const it of this.items.values()) {
        const d = it.d; if (d.k === 'model' || !it.alive) continue; if (filter && !filter(it)) continue; this.refresh(it);
        const [lo, hi] = it.box; let t0 = 0, t1 = maxD, ok = true; for (let j = 0; j < 3; j++) { const inv = 1 / (dir[j] || 1e-9); let a = (lo[j] - 0.05 - o[j]) * inv, bb = (hi[j] + 0.05 - o[j]) * inv; if (a > bb) [a, bb] = [bb, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, bb); if (t0 > t1) { ok = false; break; } } if (!ok) continue;
        for (const T of it.tris) { const t = rayTri(o, dir, T[0], T[1], T[2]); if (t != null && t > 0 && t < maxD && (!best || t < best.t)) { const e1 = T[1].map((v, j) => v - T[0][j]), e2 = T[2].map((v, j) => v - T[0][j]), n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nl = Math.hypot(...n) || 1; best = { t, it, n: n.map(v => v / nl) }; } }
      }
      return best;
    }
    // ---------- running the code ----------
    start() {
      this.running = true;
      for (const c of this.mod.codes || [this.mod.code]) if (c) this.loadScript(c, null);
      for (const it of [...this.items.values()]) if (it.d.code && !this.stored(it)) this.loadScript(it.d.code, it);
      this.fire('start');
    }
    loadScript(code, owner) {
      const c = compile(code); if (c.errs.length) this.errors.push(...c.errs.map(e => ({ ...e, owner: owner ? owner.d.name : 'Main' })));
      const scope = { owner, funcs: c.funcs };
      const top = [];
      for (const st of c.body) {
        if (st.op === 'on') this.handlers.push({ ev: st.ev, arg: st.arg, body: st.body, scope });
        else if (st.op === 'if' && st.cond.ev && (st.cond.ev === 'touch' || st.cond.ev === 'click')) this.handlers.push({ ev: st.cond.ev, who: st.cond.who, arg: st.cond.thing, body: st.body, els: st.els, scope, not: st.cond.not });
        else if (st.op === 'if' && st.cond.ev === 'near') this.watch.push({ st, scope, was: new Map() });
        else if (st.op === 'if' && st.cond.expr != null && !this.hasWait(st)) this.watch.push({ st, scope, was: null });
        else top.push(st);
      }
      if (top.length) this.spawnThread(top, { scope, self: owner, player: this.myId() });
    }
    hasWait(st) { return false; }
    hasHandler(ev) { return this.handlers.some(h => h.ev === ev); }
    myId() { return this.host.myId ? this.host.myId() : 'me'; }
    spawnThread(body, ctx) { const th = { gen: this.runBody(body, ctx), wake: 0, ctx }; this.threads.push(th); this.stepThread(th); }
    // event: start, click, touch, untouch, near, every, chat, message, jump, key
    fire(ev, o = {}) {
      for (const h of this.handlers) {
        if (h.ev !== ev) continue;
        const owner = h.scope.owner;
        if (ev === 'touch' || ev === 'click' || ev === 'untouch') {
          // which thing: the handler's own part (owner) or a named thing; the main script with no name means anything
          const thing = h.arg && !PLAYER_WORDS.includes(norm(h.arg)) && norm(h.arg) !== 'self' ? h.arg : null, target = o.it;
          if (!target) continue;
          if (thing) { if (!this.matches(target, thing)) continue; }
          else if (owner) { if (!this.within(target, owner)) continue; }
          if (h.who && !PLAYER_WORDS.includes(norm(h.who)) && norm(h.who) !== 'self') { // a part touching a part is checked elsewhere
            if (ev !== 'touch' || !o.byPart || !this.matches(o.byPart, h.who)) continue;
          } else if (o.byPart) continue;
          if (h.who && ['player.main', 'player_main', 'me'].includes(norm(h.who)) && o.player !== this.myId()) continue;
          this.spawnThread(h.body, { scope: h.scope, self: owner || this.topOf(target, thing), player: o.player || this.myId(), it: target });
        } else if (ev === 'chat') { if (o.text && norm(o.text).includes(norm(h.arg))) this.spawnThread(h.body, { scope: h.scope, self: owner, player: o.player }); }
        else if (ev === 'message') { if (norm(o.name) === norm(h.arg)) this.spawnThread(h.body, { scope: h.scope, self: owner, player: o.player || this.myId() }); }
        else if (ev === 'key') { if (norm(o.key) === norm(h.arg)) this.spawnThread(h.body, { scope: h.scope, self: owner, player: this.myId() }); }
        else if (ev === 'every' || ev === 'near') continue;
        else this.spawnThread(h.body, { scope: h.scope, self: owner, player: o.player || this.myId() });
      }
    }
    // the part or model that a name means for this hit: if the thing is a model name, the model
    topOf(it, name) { if (!name) { let x = it; while (x.d.parent) { const p = this.items.get(x.d.parent); if (!p) break; x = p; } return it; } let x = it; while (x) { if (norm(x.d.name) === norm(name)) return x; x = x.d.parent ? this.items.get(x.d.parent) : null; } return it; }
    within(it, top) { let x = it; while (x) { if (x === top) return true; x = x.d.parent ? this.items.get(x.d.parent) : null; } return false; }
    matches(it, name) { let x = it; const k = norm(name); while (x) { if (norm(x.d.name) === k) return true; x = x.d.parent ? this.items.get(x.d.parent) : null; } return false; }
    // things a target word means
    targets(word, ctx) {
      const w = norm(word || 'self');
      if (!word || w === 'self' || w === 'this') return ctx.self ? [ctx.self] : ctx.it ? [ctx.it] : [];
      if (w === 'it' || w === 'touched' || w === 'clicked') return ctx.it ? [ctx.it] : ctx.self ? [ctx.self] : [];
      if (w === 'parent' && ctx.self && ctx.self.d.parent) return [this.items.get(ctx.self.d.parent)].filter(Boolean);
      const path = w.split('.'); let list = (this.byName.get(path[0]) || []).filter(x => x.alive);
      for (let k = 1; k < path.length; k++) { const next = []; for (const m of list) for (const c of this.kids(m)) if (norm(c.d.name) === path[k] && c.alive) next.push(c); list = next; }
      return list.filter(x => !this.stored(x));
    }
    // players a word means (only ever this device's own player is changed)
    isMine(word, ctx) {
      const w = norm(word || 'player'), me = this.myId();
      if (['everyone', 'all_players', 'all'].includes(w)) return true;
      if (['player.main', 'player_main', 'me'].includes(w)) return true;
      if (['player', 'toucher', 'clicker', 'anyone', 'someone', ''].includes(w)) return (ctx.player || me) === me;
      return false;
    }
    look(name, ctx) {
      const lw = name.toLowerCase();
      if (lw in this.vars) return this.vars[lw];
      if (lw === 'time') return Math.round(this.t * 10) / 10;
      if (lw === 'night') return this.host.isNight ? this.host.isNight() : false;
      if (lw === 'day') return this.host.isNight ? !this.host.isNight() : true;
      const dot = lw.lastIndexOf('.'); if (dot < 0) return undefined;
      const obj = lw.slice(0, dot), prop = lw.slice(dot + 1);
      if (PLAYER_WORDS.includes(obj)) { const pl = this.host.player ? this.host.player(obj === 'player' || obj === 'toucher' || obj === 'clicker' ? ctx.player : this.myId()) : null; if (!pl) return undefined;
        if (prop === 'x' || prop === 'y' || prop === 'z') return Math.round(pl.p['xyz'.indexOf(prop)] * 100) / 100; if (prop === 'name') return pl.name; if (prop === 'coins') return pl.coins || 0; if (prop === 'speed') return Math.round(Math.hypot(pl.v ? pl.v[0] : 0, pl.v ? pl.v[2] : 0) * 10) / 10; return undefined; }
      const its = this.targets(obj, ctx); if (!its.length) return obj === 'self' ? undefined : undefined; const it = its[0], d = it.d, c = this.centre(it);
      if (prop === 'x' || prop === 'y' || prop === 'z') return Math.round(c['xyz'.indexOf(prop)] * 100) / 100;
      if (prop === 'size_x' || prop === 'size_y' || prop === 'size_z') return d.s ? d.s['xyz'.indexOf(prop.slice(5))] : 0;
      if (prop === 'turn_x' || prop === 'turn_y' || prop === 'turn_z') return d.r ? d.r['xyz'.indexOf(prop.slice(5))] : 0;
      if (prop === 'color' || prop === 'colour') return it.col || d.c; if (prop === 'name') return d.name; if (prop === 'visible') return !this.hidden(it); if (prop === 'material') return d.mat;
      if (prop === 'distance') { const pl = this.host.player && this.host.player(ctx.player); return pl ? Math.round(Math.hypot(pl.p[0] - c[0], pl.p[1] - c[1], pl.p[2] - c[2]) * 10) / 10 : 0; }
      return undefined;
    }
    val(src, ctx) { return evalExpr(src, n => this.look(n, ctx)); }
    num(src, ctx, d = 0) { const v = +this.val(src, ctx); return isFinite(v) ? v : d; }
    text(src, ctx) { return String(src || '').replace(/\{([^}]*)\}/g, (_, e) => { const v = this.val(e, ctx); return typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v); }).replace(/^"(.*)"$/, '$1'); }
    vec(src, ctx, rel) {
      const s = String(src || '').trim(); if (!s) return null;
      const bits = s.split(','); if (bits.length === 3) return bits.map(b => this.num(b, ctx));
      const w = norm(s);
      if (PLAYER_WORDS.includes(w)) { const pl = this.host.player && this.host.player(['player', 'toucher', 'clicker'].includes(w) ? ctx.player : this.myId()); return pl ? [...pl.p] : null; }
      const its = this.targets(s, ctx); if (its.length) { const c = this.centre(its[0]); if (rel === 'top') { const b = this.boxOf(its[0]); if (b) c[1] = b[1][1]; } return c; }
      const n = this.num(s, ctx, NaN); if (isFinite(n)) return [n, n, n];
      return null;
    }
    // ---- moving parts ----
    setTf(it, p, r, s) { // for a part, or a whole model (turns and sizes around its middle)
      if (it.d.k !== 'model') { if (p) { it.moved = [p[0] - it.d.p[0], p[1] - it.d.p[1], p[2] - it.d.p[2]]; it.d.p = p; } if (r) it.d.r = r; if (s) it.d.s = s; it.dirty = true; return; }
    }
    moveBy(it, dv) { for (const p of this.parts(it)) { p.d.p = [p.d.p[0] + dv[0], p.d.p[1] + dv[1], p.d.p[2] + dv[2]]; p.moved = dv; p.dirty = true; } }
    turnBy(it, dr) {
      if (it.d.k !== 'model') { it.d.r = [0, 1, 2].map(j => (it.d.r[j] || 0) + dr[j]); it.dirty = true; return; }
      const c = this.centre(it), R = rotM(dr);
      for (const p of this.parts(it)) { const o = [p.d.p[0] - c[0], p.d.p[1] - c[1], p.d.p[2] - c[2]], q = M4.apply3(R, o); p.d.p = [c[0] + q[0], c[1] + q[1], c[2] + q[2]]; p.d.r = eulerOf(M4.mul3(R, rotM(p.d.r))); p.dirty = true; }
    }
    scaleBy(it, k) {
      const c = this.centre(it);
      for (const p of this.parts(it)) { if (it.d.k === 'model') p.d.p = [0, 1, 2].map(j => c[j] + (p.d.p[j] - c[j]) * k[j]); p.d.s = p.d.s.map((v, j) => v * k[j]); p.dirty = true; }
    }
    tween(it, kind, to, dur) {
      this.anims = this.anims.filter(a => !(a.it === it && a.kind === kind));
      const from = kind === 'move' ? this.centre(it) : kind === 'turn' ? [...(it.d.r || [0, 0, 0])] : kind === 'size' ? (it.d.k === 'model' ? [1, 1, 1] : [...it.d.s]) : kind === 'fade' ? [it.fade ?? 1] : null;
      if (!dur || dur <= 0) { this.applyAnim(it, kind, from, to, 1); return; }
      this.anims.push({ it, kind, from, to, t: 0, dur, last: from });
    }
    applyAnim(it, kind, from, to, k) {
      const e = k < 1 ? 0.5 - Math.cos(k * Math.PI) / 2 : 1, cur = from.map((v, j) => v + (to[j] - v) * e);
      if (kind === 'move') { const now = this.centre(it); this.moveBy(it, [cur[0] - now[0], cur[1] - now[1], cur[2] - now[2]]); }
      else if (kind === 'turn') { if (it.d.k !== 'model') { it.d.r = cur; it.dirty = true; } else { const a = this._lastTurn && this._lastTurn.get(it) || from; this.turnBy(it, cur.map((v, j) => v - a[j])); (this._lastTurn || (this._lastTurn = new Map())).set(it, cur); if (k >= 1) this._lastTurn.delete(it); } }
      else if (kind === 'size') { if (it.d.k !== 'model') { it.d.s = cur; it.dirty = true; } else { const a = this._lastSize && this._lastSize.get(it) || from; this.scaleBy(it, cur.map((v, j) => v / (a[j] || 1))); (this._lastSize || (this._lastSize = new Map())).set(it, cur); if (k >= 1) this._lastSize.delete(it); } }
      else if (kind === 'fade') { for (const p of this.parts(it)) p.fade = cur[0]; }
    }
    copyOf(it, at) {
      const map = new Map(), out = [];
      const clone = (x, parent) => { const d = JSON.parse(JSON.stringify(x.d)); d.id = 'r' + (uid++); d.parent = parent; d.store = false; const n = this.add(d, false); n.col = x.col; map.set(x, n); out.push(n); for (const k of this.kids(x)) clone(k, d.id); return n; };
      const top = clone(it, it.d.store ? null : it.d.parent);
      if (at) { const c = this.centre(top); this.moveBy(top, [at[0] - c[0], at[1] - c[1], at[2] - c[2]]); }
      for (const n of out) if (n.d.code) this.loadScript(n.d.code, n);
      return top;
    }
    destroy(it) { for (const x of [it, ...this.parts(it), ...this.allKids(it)]) { x.alive = false; } this.anims = this.anims.filter(a => a.it.alive); }
    allKids(it) { let out = []; for (const k of this.kids(it)) out = out.concat([k], this.allKids(k)); return out; }
    // ---- one command ----
    exec(st, ctx) {
      const A = st.args, name = st.name, H = this.host;
      const tg = i => this.targets(A[i], ctx), each = (i, fn) => { for (const it of tg(i)) fn(it); };
      const mine = i => this.isMine(A[i], ctx), tm = i => { const v = A[i] ? timeOf(A[i]) : 0; return v == null ? this.num(A[i], ctx, 0) : v; };
      switch (name) {
        case 'var': case 'set': { const k = A[0] ? A[0].toLowerCase() : ''; if (!k) return; const v = this.val(A.slice(1).join('='), ctx);
          const dot = k.lastIndexOf('.'); if (dot > 0 && name === 'set') { this.setProp(k.slice(0, dot), k.slice(dot + 1), v, ctx); return; }
          if (name === 'var' && (k in this.vars) && st._done) return; this.vars[k] = v; return; }
        case 'add': case 'sub': { const k = (A[0] || '').toLowerCase(), v = this.num(A.slice(1).join('=') || '1', ctx, 1); const dot = k.lastIndexOf('.');
          if (dot > 0) { const cur = +this.look(k, ctx) || 0; this.setProp(k.slice(0, dot), k.slice(dot + 1), name === 'add' ? cur + v : cur - v, ctx); return; }
          this.vars[k] = (+this.vars[k] || 0) + (name === 'add' ? v : -v); return; }
        case 'random': { const k = (A[0] || '').toLowerCase(), a = this.num(A[1], ctx, 1), b = this.num(A[2], ctx, 6); this.vars[k] = Math.floor(a + Math.random() * (b - a + 1)); return; }
        case 'hud': this.hudText = A.join(' = '); this.hudCtx = ctx; return; case 'hide_hud': this.hudText = null; return;
        case 'send': this.fire('message', { name: A[0], player: ctx.player }); return;
        case 'destroy': each(0, it => this.destroy(it)); return;
        case 'hide': each(0, it => { it.d.show = false; }); return; case 'show': each(0, it => { it.d.show = true; for (const p of this.allKids(it)) p.d.show = p.d.show === false && p.d._hid ? true : p.d.show; }); return;
        case 'move': { const v = this.vec(A[1], ctx); if (!v) return; each(0, it => { const c = this.centre(it); this.tween(it, 'move', [c[0] + v[0], c[1] + v[1], c[2] + v[2]], tm(2)); }); return; }
        case 'move_to': { const v = this.vec(A[1], ctx, 'top'); if (!v) return; each(0, it => { const b = this.boxOf(it), h = b ? (b[1][1] - b[0][1]) / 2 : 0, isPlace = !String(A[1]).includes(','); this.tween(it, 'move', [v[0], v[1] + (isPlace ? h : 0), v[2]], tm(2)); }); return; }
        case 'turn': { const v = this.vec(A[1], ctx) || [0, 90, 0]; each(0, it => { const r = it.d.k === 'model' ? [0, 0, 0] : it.d.r || [0, 0, 0]; if (it.d.k === 'model') { if (tm(2) > 0) { this.anims.push({ it, kind: 'mturn', total: v, done: [0, 0, 0], t: 0, dur: tm(2) }); } else this.turnBy(it, v); } else this.tween(it, 'turn', r.map((x, j) => x + v[j]), tm(2)); }); return; }
        case 'turn_to': { const v = this.vec(A[1], ctx) || [0, 0, 0]; each(0, it => { if (it.d.k === 'model') return; this.tween(it, 'turn', v, tm(2)); }); return; }
        case 'size': { const v = this.vec(A[1], ctx); if (!v) return; each(0, it => { if (it.d.k === 'model') { const b = this.boxOf(it); if (!b) return; const cur = b[1].map((h, j) => h - b[0][j]); this.anims.push({ it, kind: 'mscale', total: v.map((x, j) => x / (cur[j] || 1)), done: [1, 1, 1], t: 0, dur: tm(2) }); } else this.tween(it, 'size', v.map(Math.abs), tm(2)); }); return; }
        case 'grow': { const k = this.num(A[1], ctx, 2); each(0, it => { if (it.d.k === 'model') this.anims.push({ it, kind: 'mscale', total: [k, k, k], done: [1, 1, 1], t: 0, dur: tm(2) }); else this.tween(it, 'size', it.d.s.map(x => x * k), tm(2)); }); return; }
        case 'spin': { const v = this.vec(A[1] || '0,90,0', ctx) || [0, 90, 0]; const vv = String(A[1] || '').includes(',') ? v : [0, v[0], 0]; each(0, it => { it.spin = vv; }); return; }
        case 'stop_spin': each(0, it => { it.spin = null; }); return;
        case 'bob': { const h = this.num(A[1] || '0.5', ctx, 0.5); each(0, it => { it.bob = { h, ph: this.t, last: 0 }; }); return; }
        case 'rainbow': each(0, it => { it.rainbow = true; }); return;
        case 'follow': each(0, it => { it.follow = ctx.player || this.myId(); it.followOff = null; }); return; case 'unfollow': each(0, it => { it.follow = null; }); return;
        case 'color': { const c = toColor(this.text(A[1], ctx)) || toColor(A[1]); if (!c) return; each(0, it => { for (const p of this.parts(it)) { p.col = A[1] && norm(A[1]) === 'random' ? randomColor() : c; p.rainbow = false; } }); return; }
        case 'material': { const m = norm(A[1]); if (!MATS[m]) return; each(0, it => { for (const p of this.parts(it)) p.d.mat = m; }); return; }
        case 'shape': { const s = norm(A[1]); if (!SHAPES[s]) return; each(0, it => { for (const p of this.parts(it)) { p.d.shape = s; p.dirty = true; } }); return; }
        case 'glow': each(0, it => { for (const p of this.parts(it)) p.glowOn = true; }); return; case 'unglow': each(0, it => { for (const p of this.parts(it)) p.glowOn = false; }); return;
        case 'light': { const r = this.num(A[1] || '12', ctx, 12); each(0, it => { for (const p of this.parts(it)) p.lightR = r; }); return; }
        case 'see_through': { const a = Math.max(0, Math.min(1, this.num(A[1] || '0.5', ctx, 0.5))); each(0, it => { for (const p of this.parts(it)) p.d.alpha = 1 - a; }); return; }
        case 'solid': each(0, it => { for (const p of this.parts(it)) p.d.solid = true; }); return; case 'not_solid': each(0, it => { for (const p of this.parts(it)) p.d.solid = false; }); return;
        case 'label': each(0, it => { it.labelT = A.slice(1).join(' = '); it.labelCtx = ctx; }); return;
        case 'fade_out': each(0, it => this.tween(it, 'fade', [0], tm(1) || 1)); return; case 'fade_in': each(0, it => this.tween(it, 'fade', [1], tm(1) || 1)); return;
        case 'copy': { const v = this.vec(A[1], ctx); each(0, it => { const c = this.centre(it); const n = this.copyOf(it, v && String(A[1]).includes(',') ? [c[0] + v[0], c[1] + v[1], c[2] + v[2]] : v); ctx.made = n; }); return; }
        case 'spawn': { const src = (this.byName.get(norm(A[0])) || []).find(x => x.alive); if (!src) return; const at = this.vec(A[1] || 'player', ctx) || this.centre(src); const n = this.copyOf(src, [at[0], at[1] + (A[1] ? 0 : 3), at[2]]); ctx.made = n; return; }
        case 'explode': each(0, it => { const c = this.centre(it); if (H.fx) H.fx(c, 'explode'); if (H.sound) H.sound('boom', c); if (H.blast) H.blast(c, 8); this.destroy(it); }); return;
        case 'particles': { const k = norm(A[1] || 'sparkles'); each(0, it => { if (H.fx) H.fx(this.centre(it), k); }); return; }
        case 'sound': if (H.sound) H.sound(norm(A[0])); return;
        case 'shake': if (H.shake) H.shake(this.num(A[0] || '1', ctx, 1)); return;
        case 'kill': if (mine(0) && H.kill) H.kill(); return; case 'respawn': if (mine(0) && H.respawn) H.respawn(); return;
        case 'teleport': { if (!mine(0) || !H.teleport) return; const v = this.vec(A[1], ctx, 'top'); if (v) H.teleport([v[0], v[1] + 1.2, v[2]]); return; }
        case 'launch': { if (!mine(0) || !H.velocity) return; const s = A[1] || '20'; if (s.includes(',')) H.velocity(this.vec(s, ctx), false); else H.velocity([0, this.num(s, ctx, 20), 0], 'up'); return; }
        case 'push': { if (!mine(0) || !H.velocity) return; const v = this.vec(A[1], ctx); if (v) H.velocity(v, true); return; }
        case 'boost': if (mine(0) && H.boost) H.boost(this.num(A[1] || '30', ctx, 30)); return;
        case 'speed': case 'jump_power': case 'gravity': if (mine(0) && H.power) H.power({ [name === 'jump_power' ? 'jump' : name]: this.num(A[1], ctx, 1) }); return;
        case 'big': if (mine(0) && H.power) H.power({ big: true }); return; case 'normal': if (mine(0) && H.power) H.power(null); return;
        case 'freeze': if (mine(0) && H.power) H.power({ frozen: true }); return; case 'unfreeze': if (mine(0) && H.power) H.power({ frozen: false }); return;
        case 'give_coins': if (mine(0) && H.coins) H.coins(Math.round(this.num(A[1], ctx, 1))); return;
        case 'checkpoint': { if (!mine(0) || !H.checkpoint) return; const v = this.vec(A[1] || 'self', ctx, 'top'); if (v) H.checkpoint([v[0], v[1] + 1.2, v[2]]); return; }
        case 'say': if (H.say && (ctx.player || this.myId()) === this.myId()) H.say(this.text(A.join(' = '), ctx)); return;
        case 'message': if (H.banner) H.banner(this.text(A.join(' = '), ctx)); return;
        case 'chat': if (H.chat) H.chat(this.text(A.join(' = '), ctx)); return;
        case 'win': if (H.win && (ctx.player || this.myId()) === this.myId()) H.win(this.text(A.join(' = ') || 'You win!', ctx)); return;
        case 'time': if (H.time) H.time(norm(A[0])); return; case 'weather': if (H.weather) H.weather(norm(A[0])); return; case 'music': if (H.music) H.music(norm(A[0])); return;
      }
    }
    setProp(obj, prop, v, ctx) {
      for (const it of this.targets(obj, ctx)) {
        if ('xyz'.includes(prop) && prop.length === 1) { const c = this.centre(it), d = [0, 0, 0]; d['xyz'.indexOf(prop)] = +v - c['xyz'.indexOf(prop)]; this.moveBy(it, d); }
        else if (prop.startsWith('size_')) { for (const p of this.parts(it)) { p.d.s['xyz'.indexOf(prop[5])] = Math.abs(+v) || 0.05; p.dirty = true; } }
        else if (prop.startsWith('turn_')) { if (it.d.k !== 'model') { it.d.r['xyz'.indexOf(prop[5])] = +v; it.dirty = true; } }
        else if (prop === 'color' || prop === 'colour') { const c = toColor(v); if (c) for (const p of this.parts(it)) p.col = c; }
        else if (prop === 'visible') { it.d.show = truthy(v); }
        else if (prop === 'material' && MATS[norm(v)]) { for (const p of this.parts(it)) p.d.mat = norm(v); }
        else if (prop === 'name') { it.d.name = String(v); const k = norm(v); if (!this.byName.has(k)) this.byName.set(k, []); this.byName.get(k).push(it); }
      }
    }
    // the code runs as generators: "yield n" waits n seconds (0 = next frame)
    *runBody(body, ctx) {
      for (const st of body) {
        if (ctx.stopped) return;
        if (st.op === 'cmd') {
          if (st.name === 'wait') { const s = timeOf(st.args[0]) ?? this.num(st.args[0], ctx, 1); yield Math.max(0, s); continue; }
          if (st.name === 'stop') { ctx.stopped = true; return; }
          if (st.name === 'call') { const f = norm(st.args[0]), fb = ctx.scope.funcs[f] || this.funcs[f] || this.findFunc(f); if (fb) yield* this.runBody(fb, ctx); continue; }
          this.exec(st, ctx); continue;
        }
        if (st.op === 'if') { const ok = this.check(st.cond, ctx); if (ok) yield* this.runBody(st.body, ctx); else if (st.els) yield* this.runBody(st.els, ctx); continue; }
        if (st.op === 'on') { this.handlers.push({ ev: st.ev, arg: st.arg, body: st.body, scope: ctx.scope }); continue; }
        if (st.op === 'once') { const key = st; if (this.onceDone.has(key)) continue; this.onceDone.add(key); yield* this.runBody(st.body, ctx); continue; }
        if (st.op === 'repeat') { const n = Math.min(100000, Math.round(this.num(st.arg, ctx, 1))); for (let k = 0; k < n && !ctx.stopped; k++) { this.vars.count = k + 1; yield* this.runBody(st.body, ctx); if (k % 50 === 49) yield 0; } continue; }
        if (st.op === 'forever') { for (;;) { if (ctx.stopped) return; const t0 = this.t; yield* this.runBody(st.body, ctx); if (this.t === t0) yield 0; } }
        if (st.op === 'while') { let k = 0; while (!ctx.stopped && truthy(this.val(st.arg, ctx))) { yield* this.runBody(st.body, ctx); if (++k % 20 === 0) yield 0; } continue; }
      }
    }
    findFunc(f) { for (const h of this.handlers) if (h.scope.funcs[f]) return h.scope.funcs[f]; return null; }
    check(cond, ctx) {
      let ok;
      if (cond.ev === 'touch') { const things = cond.thing ? this.targets(cond.thing, ctx) : ctx.self ? [ctx.self] : []; ok = things.some(t => this.parts(t).some(p => this.touching.has(p.id))); if (cond.who && !PLAYER_WORDS.includes(norm(cond.who))) ok = this.partsTouch(this.targets(cond.who, ctx), things); }
      else if (cond.ev === 'near') { const things = cond.thing ? this.targets(cond.thing, ctx) : ctx.self ? [ctx.self] : []; const pl = this.host.player && this.host.player(this.myId()); const d = this.num(cond.dist || '6', ctx, 6); ok = !!pl && things.some(t => { const c = this.centre(t); return Math.hypot(pl.p[0] - c[0], pl.p[1] - c[1], pl.p[2] - c[2]) < d; }); }
      else if (cond.ev === 'click') ok = false;
      else ok = truthy(this.val(cond.expr, ctx));
      return cond.not ? !ok : ok;
    }
    partsTouch(A, B) { for (const a of A) for (const b of B) { const ba = this.boxOf(a), bb = this.boxOf(b); if (ba && bb && a !== b && ba[0].every((v, j) => v <= bb[1][j] + 0.05) && bb[0].every((v, j) => v <= ba[1][j] + 0.05)) return true; } return false; }
    stepThread(th) {
      let budget = 4000;
      while (budget-- > 0) {
        let r; try { r = th.gen.next(); } catch (e) { console.warn('mod code', e); th.done = true; return; }
        if (r.done) { th.done = true; return; }
        th.wake = this.t + (r.value || 0); if (r.value > 0 || r.value === 0) return;
      }
      th.wake = this.t;
    }
    // every frame: dt seconds
    update(dt) {
      if (!this.running) return; this.t += dt;
      for (const it of this.items.values()) it.moved = null;
      // anims
      this.anims = this.anims.filter(a => {
        if (!a.it.alive) return false; a.t += dt; const k = Math.min(1, a.t / a.dur);
        if (a.kind === 'mturn') { const want = a.total.map(v => v * k), d = want.map((v, j) => v - a.done[j]); this.turnBy(a.it, d); a.done = want; }
        else if (a.kind === 'mscale') { const want = a.total.map(v => 1 + (v - 1) * k), d = want.map((v, j) => v / a.done[j]); this.scaleBy(a.it, d); a.done = want; }
        else this.applyAnim(a.it, a.kind, a.from, a.to, k);
        return k < 1;
      });
      for (const it of this.items.values()) {
        if (!it.alive) continue;
        if (it.spin) this.turnBy(it, it.spin.map(v => v * dt));
        if (it.bob) { const y = Math.sin((this.t - it.bob.ph) * 2) * it.bob.h; this.moveBy(it, [0, y - it.bob.last, 0]); it.bob.last = y; }
        if (it.rainbow) for (const p of this.parts(it)) p.col = hsl((this.t * 0.15 + (p.d.p[0] + p.d.p[2]) * 0.01) % 1, 0.75, 0.55);
        if (it.follow) { const pl = this.host.player && this.host.player(it.follow); if (pl) { const c = this.centre(it); if (!it.followOff) it.followOff = [c[0] - pl.p[0], c[1] - pl.p[1], c[2] - pl.p[2]]; const want = [pl.p[0] + it.followOff[0], pl.p[1] + it.followOff[1], pl.p[2] + it.followOff[2]], k = Math.min(1, dt * 5); this.moveBy(it, [(want[0] - c[0]) * k, (want[1] - c[1]) * k, (want[2] - c[2]) * k]); } }
      }
      // every / near
      for (const h of this.handlers) {
        if (h.ev === 'every') { const s = timeOf(h.arg) || 1; h.acc = (h.acc || 0) + dt; if (h.acc >= s) { h.acc -= s; this.spawnThread(h.body, { scope: h.scope, self: h.scope.owner, player: this.myId() }); } }
        else if (h.ev === 'near') { const pl = this.host.player && this.host.player(this.myId()); if (!pl) continue; const own = h.scope.owner; const things = own ? [own] : []; const d = this.num(h.arg, {}, 6); const now = things.some(t => { const c = this.centre(t); return Math.hypot(pl.p[0] - c[0], pl.p[1] - c[1], pl.p[2] - c[2]) < d; }); if (now && !h.was) this.spawnThread(h.body, { scope: h.scope, self: own, player: this.myId() }); h.was = now; }
      }
      // part touching part (#if = Ball = touch = Goal) and watched checks
      for (const w of this.watch) {
        const st = w.st, ctx = { scope: w.scope, self: w.scope.owner, player: this.myId() };
        const ok = this.check(st.cond, ctx);
        if (ok && !w.on) this.spawnThread(st.body, ctx); else if (!ok && w.on && st.els) this.spawnThread(st.els, ctx);
        w.on = ok;
      }
      const ready = this.threads.filter(th => !th.done && th.wake <= this.t);
      for (const th of ready) this.stepThread(th);
      this.threads = this.threads.filter(th => !th.done);
      if (this.threads.length > 400) this.threads.splice(0, this.threads.length - 400);
    }
    // the game tells the world which parts this player touched this frame
    touchFrame(touchedIds, playerId) {
      const was = this.touching; this.touching = touchedIds;
      for (const id of touchedIds) if (!was.has(id)) { const it = this.items.get(id); if (it) { this.fire('touch', { it, player: playerId }); if (this.host.share && this.hasHandler('touch')) this.host.share('touch', id); } }
      for (const id of was) if (!touchedIds.has(id)) { const it = this.items.get(id); if (it) this.fire('untouch', { it, player: playerId }); }
    }
    // text on parts and the corner text (2D canvas)
    overlay(g, project) {
      g.textAlign = 'center';
      for (const it of this.items.values()) {
        const t = it.labelT != null ? this.text(it.labelT, it.labelCtx || {}) : it.d.label; if (!t || !this.inWorld(it) || this.hidden(it)) continue;
        const b = this.boxOf(it); if (!b) continue; const c = this.centre(it), s = project(c[0], b[1][1] + 0.6, c[2]); if (!s || s[2] > 80) continue;
        g.font = '700 14px system-ui'; const w = g.measureText(t).width + 16; g.globalAlpha = Math.min(1, (80 - s[2]) / 15);
        g.fillStyle = 'rgba(12,16,28,.78)'; g.fillRect(s[0] - w / 2, s[1] - 13, w, 24); g.fillStyle = '#fff'; g.fillText(t, s[0], s[1] + 4); g.globalAlpha = 1;
      }
      if (this.hudText != null) { const t = this.text(this.hudText, this.hudCtx || {}); g.font = '700 16px system-ui'; const w = g.measureText(t).width + 22, x = g.canvas.width / (g.getTransform().a || 1) / 2 - w / 2; g.fillStyle = 'rgba(12,16,28,.8)'; g.fillRect(x, 52, w, 30); g.fillStyle = '#ffd23a'; g.textAlign = 'center'; g.fillText(t, x + w / 2, 73); }
    }
  }
  // ray against a triangle (distance or null)
  function rayTri(o, d, a, b, c) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]], det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
    if (Math.abs(det) < 1e-9) return null; const inv = 1 / det, s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]], u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv; if (u < 0 || u > 1) return null;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]], v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv; if (v < 0 || u + v > 1) return null;
    const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv; return t > 0 ? t : null;
  }

  // ---------- saving and sharing ----------
  const KEY = 'ultranautic.mods2';
  function loadAll() { try { const d = JSON.parse(localStorage.getItem(KEY) || '{}'); return { mods: d.mods || {}, on: d.on || {} }; } catch (e) { return { mods: {}, on: {} }; } }
  function saveAll(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  // a mod that came from someone else: keep only what a mod can have
  function clean(m) {
    if (!m || typeof m !== 'object') return null;
    const num = (v, d = 0) => isFinite(+v) ? Math.max(-1e5, Math.min(1e5, +v)) : d, v3 = (a, d) => Array.isArray(a) && a.length === 3 ? a.map(x => num(x, 0)) : d;
    const items = (Array.isArray(m.items) ? m.items : []).slice(0, 3000).map(d => ({
      id: String(d.id || '').slice(0, 24), k: d.k === 'model' ? 'model' : 'part', name: String(d.name || '').replace(/[<>]/g, '').slice(0, 40), parent: d.parent ? String(d.parent).slice(0, 24) : null,
      store: !!d.store, shape: SHAPES[d.shape] ? d.shape : 'block', p: v3(d.p, [0, 0, 0]), r: v3(d.r, [0, 0, 0]), s: v3(d.s, [1, 1, 1]).map(x => Math.max(0.02, Math.min(2000, Math.abs(x)))),
      c: hexOk(d.c) ? d.c : '#9aa3b5', mat: MATS[d.mat] ? d.mat : 'plastic', alpha: Math.max(0, Math.min(1, num(d.alpha ?? 1, 1))), glow: Math.max(0, Math.min(1, num(d.glow, 0))), light: Math.max(0, Math.min(60, num(d.light, 0))),
      solid: d.solid !== false, show: d.show !== false, label: String(d.label || '').replace(/[<>]/g, '').slice(0, 80), code: String(d.code || '').slice(0, 20000) }));
    return { v: 2, id: String(m.id || '').slice(0, 40), name: String(m.name || 'Mod').replace(/[<>]/g, '').slice(0, 40), about: String(m.about || '').replace(/[<>]/g, '').slice(0, 200), by: String(m.by || '').replace(/[<>]/g, '').slice(0, 30), code: String(m.code || '').slice(0, 30000), items, at: v3(m.at, null) };
  }
  // short text form for links and servers (deflate + base64url)
  async function pack(m) { const s = JSON.stringify(clean(m)); try { const cs = new Blob([s]).stream().pipeThrough(new CompressionStream('deflate-raw')); const buf = new Uint8Array(await new Response(cs).arrayBuffer()); let bin = ''; for (const b of buf) bin += String.fromCharCode(b); return 'z' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch (e) { return 'j' + btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } }
  async function unpack(t) { try { const kind = t[0], b = atob(t.slice(1).replace(/-/g, '+').replace(/_/g, '/')); if (kind === 'j') return clean(JSON.parse(decodeURIComponent(escape(b)))); const u8 = Uint8Array.from(b, c => c.charCodeAt(0)); const ds = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return clean(JSON.parse(await new Response(ds).text())); } catch (e) { return null; } }

  return { SHAPES, FLAT, MATS, COLORS, PREFABS, CMDS, EVENTS, PLAYER_WORDS, compile, evalExpr, suggestions, World, rotM, matOf, eulerOf, meshOf, trisOf, toColor, hsl, rgb, timeOf, rayTri, KEY, loadAll, saveAll, clean, pack, unpack, norm, splitLine };
})();
