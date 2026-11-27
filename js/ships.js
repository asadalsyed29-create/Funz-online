// Ships you can call down, fly around the world and out into space. 50 of them in 5 tiers:
// the bigger the ship, the more coins it costs. Each one is built from a few numbers (shape, size,
// colours), so every ship looks different. They all face +x, with the pilot seat near the front.
const SHIP_TIERS = [
  { name: 'Skiffs', about: 'Small, quick, one seat', size: 1, speed: 42, cost: [120, 450] },
  { name: 'Runners', about: 'Fast ships with a little cabin', size: 1.6, speed: 60, cost: [700, 1800] },
  { name: 'Haulers', about: 'Big cabins you can walk around and decorate', size: 2.6, speed: 52, cost: [2500, 6000] },
  { name: 'Cruisers', about: 'Huge ships with rooms and a bridge', size: 4.2, speed: 66, cost: [8000, 18000] },
  { name: 'Motherships', about: 'The biggest things that fly', size: 7, speed: 58, cost: [25000, 60000] },
];
// [id, name, shape, main colour, second colour, glow colour]
const SHIP_LIST = [
  // Skiffs
  ['dart', 'Dart', 'dart', '#eef2f8', '#3a7aff', '#5ff0e0'], ['hopper', 'Hopper', 'pod', '#ffd24a', '#2a2e38', '#ff9a3a'], ['minnow', 'Minnow', 'manta', '#5ad8ff', '#ffffff', '#9ff0ff'],
  ['sparrow', 'Sparrow', 'dart', '#c8503a', '#f4ead2', '#ffb04a'], ['pebble', 'Pebble', 'pod', '#9a9aa8', '#5a5a68', '#7affc0'], ['glider', 'Glider', 'manta', '#7ae06a', '#2a4a2a', '#d8ff7a'],
  ['bolt', 'Bolt', 'needle', '#ffe14a', '#3a3a48', '#ffe14a'], ['bubble', 'Bubble', 'saucer', '#ff9ad8', '#ffffff', '#ff9ad8'], ['scout', 'Scout', 'wedge', '#6a7a5a', '#c8b878', '#ff7a3a'], ['comet', 'Comet', 'needle', '#ffffff', '#ff5a5a', '#ffd27a'],
  // Runners
  ['kestrel', 'Kestrel', 'dart', '#4a5a7a', '#ffd24a', '#5ad8ff'], ['stingray', 'Stingray', 'manta', '#2a3a5a', '#5ad8ff', '#5ad8ff'], ['jackal', 'Jackal', 'wedge', '#b8763a', '#2a2420', '#ff6a2a'],
  ['halo', 'Halo', 'ring', '#eef2f8', '#c8a050', '#fff2a8'], ['nova', 'Nova', 'saucer', '#7a3aff', '#ffd24a', '#c07aff'], ['viper', 'Viper', 'needle', '#3aa84a', '#1a1a1a', '#7affc0'],
  ['firefly', 'Firefly', 'beetle', '#3a3028', '#ffd24a', '#ffe88a'], ['zephyr', 'Zephyr', 'manta', '#e8f4ff', '#7ab0dc', '#bfe6ff'], ['ember', 'Ember', 'wedge', '#2a1a18', '#ff6a1a', '#ff8a2a'], ['aurora', 'Aurora', 'dart', '#1a3a4a', '#7affc0', '#7affc0'],
  // Haulers
  ['mule', 'Mule', 'block', '#8a8a7a', '#ffb04a', '#ffd27a'], ['tortoise', 'Tortoise', 'beetle', '#4a6a3a', '#a89a6a', '#d8ff7a'], ['barge', 'Barge', 'block', '#5a6a7a', '#e8e8e8', '#5ad8ff'],
  ['pelican', 'Pelican', 'whale', '#d8d4cc', '#ff8a5a', '#ffd27a'], ['lantern', 'Lantern', 'saucer', '#3a2a4a', '#ffb04a', '#ffd27a'], ['coral', 'Coral', 'beetle', '#ff7a6a', '#fff0e0', '#ffb05a'],
  ['ironhide', 'Ironhide', 'block', '#4a4a50', '#c83a3a', '#ff5a5a'], ['nomad', 'Nomad', 'whale', '#b89a6a', '#5a4a3a', '#ffd27a'], ['frost', 'Frost', 'wedge', '#dceef8', '#7ab0dc', '#9ff0ff'], ['orbit', 'Orbit', 'ring', '#5a6a8a', '#eef2f8', '#9ff0ff'],
  // Cruisers
  ['tempest', 'Tempest', 'wedge', '#3a4a5a', '#5ad8ff', '#5ad8ff'], ['leviathan', 'Leviathan', 'whale', '#2a4a6a', '#9ad8f0', '#7affc0'], ['citadel', 'Citadel', 'block', '#8a8aa0', '#ffd24a', '#ffe88a'],
  ['sunspear', 'Sunspear', 'needle', '#f4ead2', '#c8902a', '#ffd24a'], ['nebula', 'Nebula', 'saucer', '#2a1a4a', '#ff7ad8', '#c07aff'], ['basilisk', 'Basilisk', 'beetle', '#1a3a2a', '#7ae06a', '#7affc0'],
  ['tidebreaker', 'Tidebreaker', 'manta', '#1a4a6a', '#e8f4ff', '#5ad8ff'], ['warden', 'Warden', 'block', '#3a3a3a', '#ff7a2a', '#ff9a3a'], ['crown', 'Crown', 'ring', '#f4ead2', '#d8a83a', '#fff2a8'], ['stormcaller', 'Stormcaller', 'wedge', '#2a2a3a', '#9a7aff', '#c8b4ff'],
  // Motherships
  ['ark', 'Ark', 'whale', '#d8d0c0', '#5a7a9a', '#9ff0ff'], ['bastion', 'Bastion', 'block', '#5a5a64', '#c8a050', '#ffd27a'], ['halcyon', 'Halcyon', 'saucer', '#eef2f8', '#7ab0dc', '#bfe6ff'],
  ['colossus', 'Colossus', 'wedge', '#4a4038', '#ff8a3a', '#ff9a3a'], ['eclipse', 'Eclipse', 'ring', '#1a1a24', '#ffd24a', '#ffe14a'], ['hive', 'Hive', 'beetle', '#c8a03a', '#3a2a1a', '#ffd24a'],
  ['starwhale', 'Star Whale', 'whale', '#3a4a7a', '#c8d8ff', '#9ad8ff'], ['monolith', 'Monolith', 'block', '#141418', '#7a3aff', '#c07aff'], ['seraph', 'Seraph', 'manta', '#f4f0ff', '#d8b4ff', '#ffffff'],
  ['veker', 'Veker Mothership', 'veker', '#2e3440', '#c8d0dc', '#5ff0e0'],
];
const SHIPS = {};
SHIP_LIST.forEach(([id, name, shape, c1, c2, c3], i) => {
  const tier = Math.floor(i / 10), T = SHIP_TIERS[tier], k = (i % 10) / 9;
  SHIPS[id] = { id, name, shape, c1, c2, c3, tier, n: i, size: T.size * (1 + k * 0.35) * (id === 'veker' ? 1.5 : 1), speed: T.speed + k * 8, cost: Math.round((T.cost[0] + (T.cost[1] - T.cost[0]) * k) / 50) * 50, cabin: tier >= 2 };
});

// ---------- the models ----------
function shipModelOf(gl, id) {
  const S = SHIPS[id] || SHIPS.dart, mb = new MeshBuilder(), C = hex, G = c => glowC(hex(c)), c1 = C(S.c1), c2 = C(S.c2), s = S.size, sh = S.shape;
  const eng = (x, y, z, r) => { mb.push([x, y, z], M4.rotZ(Math.PI / 2)); mb.lathe([[0, -r * 1.6], [r, -r * 1.2], [r * 1.05, r * 0.6], [r * 0.7, r * 1.0], [0, r * 1.05]], 12, mixC(c2, [0.2, 0.2, 0.25, 1], 0.5), 0.2); mb.pop(); mb.sph([x - r * 1.6, y, z], [r * 0.2, r * 0.75, r * 0.75], 10, G(S.c3), 0); };
  const cockpit = (x, y, l, w) => mb.sph([x, y, 0], [l, w * 0.6, w], 14, G('#7ad8ff'), 0);
  const wing = (x0, x1, y, z0, z1, th, col) => { for (const sd of [-1, 1]) { const a = [x1, y, sd * z0], b = [x0, y, sd * z0], c = [x0 - (x1 - x0) * 0.4, y, sd * z1], d = [x0 + (x1 - x0) * 0.2, y, sd * z1]; mb.quad(a, b, c, d, col); mb.quad(d, c, b, a, shadeC(col, 0.7)); mb.sph([(c[0] + d[0]) / 2, y, sd * z1], [Math.abs(d[0] - c[0]) * 0.55, th, th], 6, G(S.c3), 0); } };
  if (sh === 'dart' || sh === 'needle') {
    const L = sh === 'needle' ? 4 : 3, R = sh === 'needle' ? 0.55 : 0.85;
    mb.push([0, 0, 0], M4.rotZ(-Math.PI / 2), [s, s, s]); mb.lathe([[0, -L * 0.9], [R * 0.7, -L * 0.8], [R, -L * 0.3], [R * 0.95, L * 0.3], [R * 0.5, L * 0.75], [0, L]], 18, (t, ph) => Math.abs(Math.sin(ph * 2)) > 0.9 ? c2 : c1, 0.15); mb.pop();
    cockpit(L * 0.3 * s, R * 0.75 * s, 0.9 * s, 0.45 * s);
    wing(-0.4 * s, 0.9 * s, 0, R * s, (sh === 'needle' ? 1.8 : 2.6) * s, 0.06 * s, c2);
    mb.sph([-L * 0.65 * s, R * 0.9 * s, 0], [0.8 * s, 0.75 * s, 0.06 * s], 8, c2, 0);
    for (const sd of [-1, 1]) eng(-L * 0.75 * s, 0, sd * R * 0.7 * s, 0.32 * s);
  } else if (sh === 'pod' || sh === 'beetle') {
    const L = sh === 'beetle' ? 2.6 : 2;
    mb.sph([0, 0, 0], [L * s, 0.9 * s * (sh === 'beetle' ? 0.8 : 1), 1.1 * s], 18, (x, y) => y > 0.35 ? c2 : c1, 0.25);
    if (sh === 'beetle') for (const sd of [-1, 1]) mb.sph([-0.2 * s, 0.55 * s, sd * 0.6 * s], [L * 0.85 * s, 0.5 * s, 0.75 * s], 14, c2, 0.2);
    cockpit(L * 0.55 * s, 0.45 * s, 0.8 * s, 0.6 * s);
    for (const sd of [-1, 1]) { mb.sph([-0.3 * s, -0.25 * s, sd * 1.25 * s], [0.9 * s, 0.1 * s, 0.45 * s], 8, c2, 0); eng(-L * 0.9 * s, -0.1 * s, sd * 0.6 * s, 0.3 * s); }
    if (sh === 'beetle') for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) MB.tube(mb, [[(-0.8 + k * 0.8) * s, -0.4 * s, sd * 0.9 * s], [(-1 + k * 0.8) * s, -0.9 * s, sd * 1.4 * s], [(-1.1 + k * 0.8) * s, -1.2 * s, sd * 1.5 * s]], 0.07 * s, 5, c2);
  } else if (sh === 'manta') {
    mb.sph([0, 0, 0], [2.2 * s, 0.45 * s, 2.8 * s], 20, (x, y, z) => Math.abs(z) > 0.7 ? c2 : c1, 0.25);
    cockpit(1.1 * s, 0.3 * s, 0.8 * s, 0.45 * s);
    MB.tube(mb, [[-1.8 * s, 0, 0], [-3.2 * s, 0.1 * s, 0], [-4.4 * s, 0.3 * s, 0]], 0.12 * s, 6, c2);
    for (const sd of [-1, 1]) { mb.sph([0.2 * s, -0.05 * s, sd * 2.7 * s], 0.15 * s, 6, G(S.c3), 0); eng(-1.6 * s, 0, sd * 0.9 * s, 0.28 * s); }
  } else if (sh === 'saucer' || sh === 'ring') {
    if (sh === 'saucer') { mb.lathe([[0, -0.5 * s], [1.6 * s, -0.4 * s], [2.6 * s, -0.05 * s], [2.7 * s, 0.05 * s], [1.6 * s, 0.4 * s], [0, 0.5 * s]].map(([r, y]) => [r, y]), 28, (t) => t > 0.4 && t < 0.6 ? c2 : c1, 0.2); mb.sph([0, 0.45 * s, 0], [1.1 * s, 0.7 * s, 1.1 * s], 16, G('#7ad8ff'), 0); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; mb.sph([Math.cos(a) * 2.45 * s, 0, Math.sin(a) * 2.45 * s], 0.12 * s, 6, G(S.c3), 0); } }
    else { mb.tor([0, 0, 0], 2.4 * s, 0.4 * s, 32, 10, c1); mb.sph([0, 0, 0], [1.4 * s, 0.6 * s, 0.7 * s], 16, c2, 0.2); cockpit(0.8 * s, 0.35 * s, 0.6 * s, 0.4 * s); for (const sd of [-1, 1]) MB.tube(mb, [[0, 0, sd * 0.6 * s], [0, 0, sd * 2.1 * s]], 0.12 * s, 6, c2); for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + 0.785; mb.sph([Math.cos(a) * 2.4 * s, 0, Math.sin(a) * 2.4 * s], 0.25 * s, 8, G(S.c3), 0); } eng(-1.4 * s, 0, 0, 0.3 * s); }
  } else if (sh === 'wedge') {
    const P = (x, y, z) => [x * s, y * s, z * s], n = P(3.2, 0, 0), bl = P(-2.2, -0.3, -2), br = P(-2.2, -0.3, 2), tp = P(-1.6, 0.9, 0), bb = P(-2.2, -0.5, 0);
    mb.tri(n, tp, br, c1); mb.tri(n, bl, tp, shadeC(c1, 0.9)); mb.tri(n, br, bb, shadeC(c2, 0.8)); mb.tri(n, bb, bl, shadeC(c2, 0.75)); mb.tri(bl, br, tp, c2); mb.tri(bl, bb, br, shadeC(c2, 0.7));
    mb.tri(tp, br, bl, c2);
    cockpit(0.6 * s, 0.35 * s, 0.9 * s, 0.35 * s);
    for (const sd of [-1, 1]) { eng(-2.2 * s, 0.1 * s, sd * 0.9 * s, 0.3 * s); mb.sph([-1.5 * s, -0.1 * s, sd * 1.75 * s], 0.12 * s, 6, G(S.c3), 0); }
  } else if (sh === 'block') {
    mb.rbox(-2.6 * s, -0.8 * s, -1.2 * s, 1.8 * s, 0.9 * s, 1.2 * s, c1); mb.rbox(1.6 * s, -0.5 * s, -0.9 * s, 2.8 * s, 0.6 * s, 0.9 * s, c2);
    cockpit(2.5 * s, 0.25 * s, 0.4 * s, 0.6 * s);
    for (let k = 0; k < 4; k++) mb.box((-2.2 + k * 1.0) * s, 0.9 * s, -0.7 * s, (-1.6 + k * 1.0) * s, 1.15 * s, 0.7 * s, shadeC(c2, 0.9));
    for (const sd of [-1, 1]) { mb.box(-2 * s, -0.1 * s, sd * 1.2 * s, 1.2 * s, 0.05 * s, sd * 1.21 * s + sd * 0.01, G(S.c3)); eng(-2.7 * s, 0.2 * s, sd * 0.7 * s, 0.35 * s); eng(-2.7 * s, -0.4 * s, sd * 0.7 * s, 0.25 * s); }
  } else if (sh === 'whale') {
    mb.push([0, 0, 0], M4.rotZ(-Math.PI / 2), [s, s, s]); mb.lathe([[0, -3.2], [0.9, -2.8], [1.3, -1.4], [1.4, 0.6], [1.15, 2.2], [0.5, 3.0], [0, 3.1]], 22, (t, ph) => Math.cos(ph) < -0.5 ? c2 : c1, 0.2); mb.pop();
    cockpit(2.4 * s, 0.7 * s, 0.7 * s, 0.6 * s);
    for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) mb.sph([(-1.8 + k * 0.7) * s, 0.35 * s, sd * 1.33 * s], [0.18 * s, 0.12 * s, 0.03 * s], 6, G('#ffe88a'), 0);
    for (const sd of [-1, 1]) { mb.sph([0, -0.6 * s, sd * 1.7 * s], [1.0 * s, 0.1 * s, 0.6 * s], 10, c2, 0); eng(-3.0 * s, 0, sd * 0.6 * s, 0.4 * s); }
    mb.sph([-2.4 * s, 1.0 * s, 0], [0.8 * s, 0.6 * s, 0.07 * s], 8, c2, 0);
  } else { // veker: a long dark command ship with a raised bridge, side hangars and a ring of lights
    mb.rbox(-4 * s, -0.7 * s, -1.4 * s, 3 * s, 0.7 * s, 1.4 * s, c1);
    const P = (x, y, z) => [x * s, y * s, z * s]; mb.tri(P(3, 0.7, -1.4), P(3, 0.7, 1.4), P(5.4, 0, 0), shadeC(c1, 1.1)); mb.tri(P(3, -0.7, 1.4), P(3, -0.7, -1.4), P(5.4, 0, 0), shadeC(c1, 0.7)); mb.tri(P(3, 0.7, 1.4), P(3, -0.7, 1.4), P(5.4, 0, 0), shadeC(c1, 0.9)); mb.tri(P(3, -0.7, -1.4), P(3, 0.7, -1.4), P(5.4, 0, 0), shadeC(c1, 0.9));
    mb.rbox(-2.6 * s, 0.7 * s, -0.6 * s, -0.6 * s, 1.5 * s, 0.6 * s, c2); mb.box(-1.0 * s, 1.15 * s, -0.62 * s, -0.62 * s, 1.35 * s, 0.62 * s, G('#7ad8ff'));
    for (const sd of [-1, 1]) { mb.rbox(-3.4 * s, -0.5 * s, sd * 1.4 * s, 1.2 * s, 0.3 * s, sd * 2.4 * s, shadeC(c1, 0.9)); mb.box(-3.2 * s, -0.3 * s, sd * 2.41 * s, 0.9 * s, 0.1 * s, sd * 2.42 * s, G(S.c3)); }
    for (let k = 0; k < 14; k++) mb.box((-3.6 + k * 0.5) * s, 0.0, -1.42 * s, (-3.45 + k * 0.5) * s, 0.25 * s, 1.42 * s, G(S.c3));
    for (const sd of [-1, 0, 1]) eng(-4.1 * s, 0, sd * 0.85 * s, 0.45 * s);
    MB.tube(mb, [[-1.6 * s, 1.5 * s, 0], [-1.6 * s, 2.6 * s, 0]], 0.05 * s, 5, c2); mb.sph([-1.6 * s, 2.65 * s, 0], 0.1 * s, 6, G('#ff4a4a'), 0);
  }
  return mb.build(gl);
}
// how big each ship is (for the camera and where you sit)
const shipLen = id => { const S = SHIPS[id]; return S ? S.size * (S.shape === 'veker' ? 9.4 : S.shape === 'whale' ? 6.2 : S.shape === 'block' ? 5.4 : 5) : 5; };
const shipSeat = id => { const S = SHIPS[id] || SHIPS.dart, s = S.size; return S.shape === 'veker' ? [-0.9 * s, 1.55 * s, 0] : S.shape === 'block' ? [2.4 * s, 0.6 * s, 0] : S.shape === 'whale' ? [2.3 * s, 1.0 * s, 0] : S.shape === 'saucer' ? [0, 0.6 * s, 0] : [0.6 * s, 0.7 * s, 0]; };

// ---------- inside your ship: a cabin you can walk around and decorate ----------
// It works like a cave: a room far below the world. The ship stays parked where you left it while you are inside.
const DECOR = {
  sofa: { name: 'Sofa', solid: true, f: (mb, C) => { mb.rbox(-1.4, 0, -0.5, 1.4, 0.55, 0.5, C('#5a6aa8')); mb.rbox(-1.4, 0.55, 0.25, 1.4, 1.2, 0.5, C('#4a5a98')); mb.rbox(-1.55, 0, -0.5, -1.3, 0.85, 0.5, C('#4a5a98')); mb.rbox(1.3, 0, -0.5, 1.55, 0.85, 0.5, C('#4a5a98')); } },
  bed: { name: 'Bed', solid: true, f: (mb, C) => { mb.rbox(-1, 0, -1.6, 1, 0.45, 1.6, C('#8a6a4a')); mb.rbox(-0.95, 0.45, -1.55, 0.95, 0.7, 1.55, C('#eef2f8')); mb.rbox(-0.8, 0.7, 1.0, 0.8, 0.95, 1.5, C('#ffffff')); mb.rbox(-0.95, 0.72, -1.55, 0.95, 0.8, 0.4, C('#5a9ad8')); } },
  table: { name: 'Table', solid: true, f: (mb, C) => { mb.rbox(-0.9, 0.8, -0.6, 0.9, 0.9, 0.6, C('#a8784c')); for (const [x, z] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) mb.box(x - 0.05, 0, z - 0.05, x + 0.05, 0.8, z + 0.05, C('#6a4a2a')); } },
  chair: { name: 'Chair', solid: true, f: (mb, C) => { mb.rbox(-0.35, 0.45, -0.35, 0.35, 0.55, 0.35, C('#c8503a')); mb.rbox(-0.35, 0.55, 0.25, 0.35, 1.2, 0.35, C('#c8503a')); for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) mb.box(x - 0.04, 0, z - 0.04, x + 0.04, 0.45, z + 0.04, C('#3a3a3a')); } },
  plant: { name: 'Plant', solid: true, f: (mb, C) => { mb.cyl(0, 0, 0, 0.35, 0.45, 0.6, 10, C('#c8783a')); for (let k = 0; k < 6; k++) { const a = k * 1.05; mb.sph([Math.cos(a) * 0.25, 1.0 + (k % 2) * 0.3, Math.sin(a) * 0.25], [0.25, 0.5, 0.25], 6, C(k % 2 ? '#4a9a3a' : '#5aae4a'), 0); } } },
  lamp: { name: 'Lamp', f: (mb, C) => { mb.cyl(0, 0, 0, 0.3, 0.3, 0.06, 10, C('#3a3a3a')); mb.cyl(0, 0, 0, 0.04, 0.04, 1.6, 5, C('#3a3a3a')); mb.cyl(0, 1.5, 0, 0.4, 0.2, 0.4, 10, glowC(C('#ffe08a'))); } },
  rug: { name: 'Rug', f: (mb, C) => { mb.box(-1.4, 0.01, -1, 1.4, 0.04, 1, C('#b84a5a'), false, true); mb.box(-1.1, 0.04, -0.7, 1.1, 0.05, 0.7, C('#e8c070'), false, true); } },
  screen: { name: 'Big screen', f: (mb, C) => { mb.box(-1.2, 0.9, -0.06, 1.2, 2.3, 0.06, C('#1a1a1a')); mb.box(-1.1, 1.0, -0.08, 1.1, 2.2, -0.07, glowC(C('#5ad8ff')), false, true); mb.box(-0.1, 0, -0.1, 0.1, 0.9, 0.1, C('#3a3a3a')); } },
  crate: { name: 'Crate', solid: true, f: (mb, C) => { mb.box(-0.5, 0, -0.5, 0.5, 1, 0.5, C('#a8784c')); mb.box(-0.52, 0.45, -0.52, 0.52, 0.55, 0.52, C('#6a4a2a')); } },
  tank: { name: 'Fish tank', solid: true, f: (mb, C) => { mb.box(-0.8, 0, -0.35, 0.8, 0.5, 0.35, C('#3a3a3a')); mb.box(-0.78, 0.5, -0.33, 0.78, 1.4, 0.33, [0.5, 0.8, 1, 0.3]); for (let k = 0; k < 3; k++) mb.sph([-0.4 + k * 0.4, 0.8 + (k % 2) * 0.2, 0], [0.1, 0.06, 0.04], 6, glowC(C(k % 2 ? '#ffb04a' : '#ff6a8a')), 0); } },
  shelf: { name: 'Shelf', solid: true, f: (mb, C) => { mb.box(-0.9, 0, -0.25, 0.9, 1.8, 0.25, C('#8a6a4a')); for (let k = 0; k < 3; k++) { mb.box(-0.85, 0.1 + k * 0.6, -0.3, 0.85, 0.15 + k * 0.6, 0.2, C('#6a4a2a')); for (let q = 0; q < 5; q++) mb.box(-0.75 + q * 0.32, 0.15 + k * 0.6, -0.15, -0.55 + q * 0.32, 0.5 + k * 0.6, 0.15, C(['#c83a3a', '#3a7ac8', '#e8c040', '#3aa84a', '#8a4ac8'][(q + k) % 5])); } } },
  globe: { name: 'Planet globe', f: (mb, C) => { mb.cyl(0, 0, 0, 0.3, 0.3, 0.1, 10, C('#c8a050')); mb.cyl(0, 0, 0, 0.04, 0.04, 0.9, 5, C('#c8a050')); mb.sph([0, 1.15, 0], 0.32, 12, (x, y) => y > 0.2 ? C('#4a9a3a') : C('#3a7ac8'), 0); } },
  arcade: { name: 'Arcade machine', solid: true, f: (mb, C) => { mb.rbox(-0.45, 0, -0.4, 0.45, 1.9, 0.4, C('#7a3aff')); mb.box(-0.35, 1.1, -0.42, 0.35, 1.6, -0.41, glowC(C('#7affc0')), false, true); mb.box(-0.4, 0.9, -0.55, 0.4, 1.0, -0.3, C('#2a2a2a')); } },
  poster: { name: 'Poster', f: (mb, C) => { mb.box(-0.6, 1.2, -0.03, 0.6, 2.2, 0.03, C('#f4ead2')); mb.box(-0.5, 1.3, -0.05, 0.5, 2.1, -0.04, C('#3a5aa8'), false, true); mb.sph([0, 1.75, -0.06], [0.25, 0.25, 0.01], 10, glowC(C('#ffd24a')), 0); } },
  trophy: { name: 'Trophy', f: (mb, C) => { mb.box(-0.25, 0, -0.25, 0.25, 0.3, 0.25, C('#3a3a3a')); mb.cyl(0, 0.3, 0, 0.08, 0.08, 0.3, 6, C('#ffd24a')); mb.cyl(0, 0.6, 0, 0.12, 0.3, 0.4, 10, glowC(C('#ffd24a'))); } },
  plantbig: { name: 'Tall palm', solid: true, f: (mb, C) => { mb.cyl(0, 0, 0, 0.4, 0.5, 0.6, 10, C('#eef2f8')); mb.cyl(0, 0.5, 0, 0.08, 0.06, 2.2, 6, C('#8a6a4a')); for (let k = 0; k < 6; k++) { const a = k * 1.05; MB.tube(mb, [[0, 2.7, 0], [Math.cos(a) * 0.7, 2.9, Math.sin(a) * 0.7], [Math.cos(a) * 1.2, 2.4, Math.sin(a) * 1.2]], 0.08, 4, C('#3a9a3a')); } } },
};
const CABIN_SIZE = [[7, 5], [10, 7], [16, 10], [24, 15], [36, 22]]; // half sizes would be these / 2
const cabinDecor = id => { try { const all = JSON.parse(localStorage.getItem('nautic.cabin') || '{}'); return Array.isArray(all[id]) ? all[id].filter(d => DECOR[d[0]]) : []; } catch (e) { return []; } };
const saveCabinDecor = (id, list) => { try { const all = JSON.parse(localStorage.getItem('nautic.cabin') || '{}'); all[id] = list.slice(0, 80); localStorage.setItem('nautic.cabin', JSON.stringify(all)); } catch (e) {} };
class ShipCabin {
  constructor(id, o) {
    const S = SHIPS[id]; this.id = id; this.ship = true; this.key = 'cabin:' + id; this.o = o; this.ch = [[0, 0, 10]];
    const [W, D] = CABIN_SIZE[S.tier]; this.W = W / 2; this.D = D / 2; this.H = 3.2 + S.tier * 0.5;
    this.exit = [o[0] - this.W + 1.4, o[1] + 1.2, o[2]];
    this.seat = [o[0] + this.W - 1.6, o[1] + 0.6, o[2]];
    this.items = []; this.lights = [{ p: [o[0], o[1] + this.H - 0.6, o[2]], r: Math.max(this.W, this.D) * 2, c: [1, 0.95, 0.85] }, { p: [this.seat[0], o[1] + 2, o[2]], r: 8, c: [0.4, 0.9, 1] }];
    this.grid = new TriGrid();
  }
  tris(x, z, r, out) { this.grid.near(x, z, r, out); }
  floor() { return this.o[1]; }
  ceil() { return this.o[1] + this.H; }
  open() { return 1; }
  build(gl) {
    const S = SHIPS[this.id], [ox, oy, oz] = this.o, W = this.W, D = this.D, H = this.H, mb = new MeshBuilder().collect(), dmb = new MeshBuilder(), C = h => hex(h), wall = mixC(C(S.c1), [0.85, 0.87, 0.9, 1], 0.55), trim = C(S.c2), glow = glowC(C(S.c3));
    mb.box(ox - W - 1, oy - 1, oz - D - 1, ox + W + 1, oy, oz + D + 1, C('#4a4e58'));
    for (let i = -W; i < W; i += 2) for (let j = -D; j < D; j += 2) dmb.box(ox + i + 0.04, oy + 0.01, oz + j + 0.04, ox + i + 1.96, oy + 0.02, oz + j + 1.96, shadeC(C('#5a5e68'), ((i + j) / 2) % 2 ? 0.92 : 1.04), false, true);
    mb.box(ox - W - 1, oy, oz - D - 1, ox + W + 1, oy + H, oz - D, wall); mb.box(ox - W - 1, oy, oz + D, ox + W + 1, oy + H, oz + D + 1, wall);
    mb.box(ox - W - 1, oy, oz - D, ox - W, oy + H, oz + D, wall); mb.box(ox + W, oy, oz - D, ox + W + 1, oy + H, oz + D, wall);
    mb.box(ox - W - 1, oy + H, oz - D - 1, ox + W + 1, oy + H + 1, oz + D + 1, shadeC(wall, 0.8));
    // windows all round (the sky outside), a glowing strip along the walls, lights in the ceiling
    for (const sd of [-1, 1]) for (let x = -W + 2; x < W - 1; x += 3) dmb.box(ox + x, oy + 1.3, oz + sd * (D - 0.02), ox + x + 1.8, oy + Math.min(H - 0.6, 2.6), oz + sd * (D - 0.04), glowC(C('#8ac8f0')), false, true);
    for (const sd of [-1, 1]) dmb.box(ox - W, oy + 0.3, oz + sd * (D - 0.05), ox + W, oy + 0.4, oz + sd * (D - 0.06), glow, false, true);
    for (let x = -W + 2; x < W; x += 4) dmb.box(ox + x - 0.5, oy + H - 0.03, oz - 0.5, ox + x + 0.5, oy + H - 0.02, oz + 0.5, glowC(C('#fff2d8')), false, true);
    // the pilot seat and controls at the front, with the big front window
    dmb.box(ox + W - 0.04, oy + 1.0, oz - Math.min(D - 1, 3), ox + W - 0.02, oy + Math.min(H - 0.4, 2.8), oz + Math.min(D - 1, 3), glowC(C('#9ad8ff')), false, true);
    const sx = this.seat[0]; mb.box(sx - 0.5, oy, oz - 0.6, sx + 0.5, oy + 0.5, oz + 0.6, trim); mb.box(sx - 0.6, oy + 0.5, oz - 0.6, sx - 0.4, oy + 1.6, oz + 0.6, trim);
    mb.box(sx + 0.9, oy, oz - 1.4, sx + 1.4, oy + 1.0, oz + 1.4, C('#2a2e38')); for (let k = 0; k < 5; k++) dmb.sph([sx + 1.15, oy + 1.04, oz - 1 + k * 0.5], 0.08, 6, glowC(C(['#5ff0e0', '#ff9ad8', '#ffd24a', '#7be36b', '#ff5a5a'][k])), 0);
    dmb.cyl(sx, oy + 0.02, oz, 1.2, 1.2, 0.02, 16, glowC(C('#5ff0e0')), false);
    // the door out: a glowing ring at the back
    dmb.at(this.exit, M4.rotX(Math.PI / 2)); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; dmb.ico(Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0, 0.2, 0, () => glowC(C('#ffc45a'))); } dmb.reset();
    // your decorations
    const col = new MeshBuilder().collect();
    for (const [k, x, z, r] of cabinDecor(this.id)) { const d = DECOR[k]; dmb.push([ox + x, oy, oz + z], M4.rotY(r || 0)); d.f(dmb, C); dmb.pop(); if (d.solid) { col.push([ox + x, oy, oz + z], M4.rotY(r || 0)); col.box(-0.7, 0, -0.5, 0.7, 1, 0.5, C('#000000')); col.pop(); } }
    this.mesh = mb.build(gl); this.deco = dmb.build(gl); this.grid.add(mb.tris, this); this.grid.add(col.tris, this);
  }
}
