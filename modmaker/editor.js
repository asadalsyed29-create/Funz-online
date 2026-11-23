// The Nautic Online Mod Editor: build mods as real 3D parts right on the Nautic Online map,
// and give them code in the easy #command = value language (see js/modkit.js).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const K = ModKit, SEED = 20261115;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r3 = v => Math.round(v * 1000) / 1000;

  // ---------- icons (drawn lines, no emoji) ----------
  const IC = {
    mods: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    select: '<path d="M5 3l14 8-6 1.5L10 19z"/>', move: '<path d="M12 2v20M2 12h20"/><path d="M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
    turn: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3v5h-5"/>', size: '<rect x="4" y="10" width="10" height="10"/><path d="M13 4h7v7"/><path d="M20 4l-8 8"/>',
    snap: '<path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    sunset: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0"/><path d="M12 6v3M5.6 9.6l1.4 1.4M18.4 9.6L17 11"/>', moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>', play: '<path d="M7 4l13 8-13 8z"/>', stop: '<rect x="6" y="6" width="12" height="12"/>',
    test: '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>', panelL: '<rect x="3" y="4" width="18" height="16"/><path d="M9 4v16"/>', panelR: '<rect x="3" y="4" width="18" height="16"/><path d="M15 4v16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', focus: '<circle cx="12" cy="12" r="3"/><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', group: '<rect x="3" y="3" width="18" height="18"/><rect x="7" y="7" width="5" height="5"/><rect x="12" y="12" width="5" height="5"/>',
    ungroup: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>', copy: '<rect x="8" y="8" width="13" height="13"/><path d="M16 8V3H3v13h5"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>', model: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M12 3v18M3 7l18 10M21 7L3 17"/>', script: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12l-2 2 2 2M14 12l2 2-2 2"/>',
    store: '<path d="M3 8l2-4h14l2 4M3 8h18v12H3zM9 12h6"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', file: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', several: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/><path d="M15 5h4v4M5 15v4h4"/>',
    import: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v4h16v-4"/>', export: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v4h16v-4"/>', pin: '<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  };
  const ic = n => '<svg class="ic" viewBox="0 0 24 24">' + (IC[n] || '') + '</svg>';
  const btn = (id, icon, text) => { const b = $(id); b.innerHTML = ic(icon) + (text ? '<span>' + text + '</span>' : ''); return b; };

  // ---------- saving ----------
  let store = K.loadAll();
  const account = (() => { try { return JSON.parse(localStorage.getItem('ultranautic.account') || 'null'); } catch (e) { return null; } })();
  const newId = p => (p || 'i') + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
  let saveT = 0;
  function saveSoon() { $('saveState').textContent = 'Saving…'; clearTimeout(saveT); saveT = setTimeout(saveNow, 500); }
  function saveNow() {
    clearTimeout(saveT); if (!S.mod) return;
    S.mod.items = itemsNow(); S.mod.edited = Date.now(); S.mod.at = S.cam.t.map(r3);
    store = K.loadAll(); store.mods[S.mod.id] = S.mod;
    $('saveState').textContent = K.saveAll(store) ? 'Saved' : 'Not saved: storage full';
  }

  // ---------- state ----------
  const S = { mod: null, world: null, run: null, sel: new Set(), tool: 'move', snap: true, several: false, time: 'day', cam: { t: [0, 8, 7], yaw: 2.3, pitch: 0.45, dist: 26 }, undo: [], redo: [], codeFor: null, ltab: 'add', open: new Set() };
  const itemsNow = () => [...S.world.items.values()].filter(it => it.alive).map(it => { const d = JSON.parse(JSON.stringify(it.d)); return d; });
  function snapshot() { S.undo.push(JSON.stringify({ items: itemsNow(), code: S.mod.code })); if (S.undo.length > 100) S.undo.shift(); S.redo.length = 0; undoBtns(); }
  function restore(json) { const d = JSON.parse(json); S.mod.code = d.code; makeWorld(d.items); S.sel = new Set([...S.sel].filter(id => S.world.items.has(id))); S.world.sel = S.sel; changed(true); }
  function doUndo() { if (!S.undo.length || S.run) return; S.redo.push(JSON.stringify({ items: itemsNow(), code: S.mod.code })); restore(S.undo.pop()); undoBtns(); }
  function doRedo() { if (!S.redo.length || S.run) return; S.undo.push(JSON.stringify({ items: itemsNow(), code: S.mod.code })); restore(S.redo.pop()); undoBtns(); }
  function undoBtns() { $('bUndo').disabled = !S.undo.length; $('bRedo').disabled = !S.redo.length; }
  function change(fn) { if (S.run) stopRun(); snapshot(); fn(); changed(); }
  function changed(noSave) { renderTree(); renderProps(); if (!noSave) saveSoon(); else saveSoon(); }
  function makeWorld(items) { S.world = new K.World({ items: items || [] }, {}, { T: game && game.T }); S.world.sel = S.sel; if (game && !S.run) game.mods = S.world; }
  const get = id => S.world.items.get(id);

  // ---------- the 3D view: the real Nautic Online world ----------
  let game = null;
  function startGame() {
    try { game = new Game($('game'), $('ov'), SEED, new Builds()); }
    catch (e) { console.error(e); $('loading').innerHTML = '<span>Your device can\'t show 3D graphics (WebGL). Try another browser.</span>'; return false; }
    game.editor = true; game.radius = Device.type === 'phone' ? 3 : Device.type === 'tablet' ? 4 : 5; game.near = Device.type === 'phone' ? 1.2 : 2;
    if (Device.type !== 'computer') { game.maxDpr = 1.5; game.maxClouds = 1200; game.maxLights = 6; } else game.maxDpr = 1.25;
    game.resize(); game.mods = S.world; if (S.world) S.world.T = game.T;
    return true;
  }
  const ground = (x, z) => Math.max(game.T.ground(x, z), SEA);
  function camEye() { const c = S.cam, cp = Math.cos(c.pitch); return [c.t[0] + Math.sin(c.yaw) * cp * c.dist, c.t[1] + Math.sin(c.pitch) * c.dist, c.t[2] + Math.cos(c.yaw) * cp * c.dist]; }
  function setCam() { const e = camEye(); const g = ground(e[0], e[2]) + 0.6; if (e[1] < g) e[1] = g; game.cam.eye = e; game.cam.target = [...S.cam.t]; game.cam.yaw = S.cam.yaw; game.cam.pitch = S.cam.pitch; }
  const TIMES = { day: { dark: 0, sun: 1.15, icon: 'sun', name: 'Day' }, sunset: { dark: 0.36, sun: 2.95, icon: 'sunset', name: 'Sunset' }, night: { dark: 0.74, sun: 4.6, icon: 'moon', name: 'Night' } };
  let last = performance.now(), frames = 0;
  const keys = new Set();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!game) return;
    // fly with the keyboard
    const c = S.cam, sp = (keys.has('shift') ? 60 : 18) * dt * Math.max(0.5, c.dist / 25), f = [-Math.sin(c.yaw), -Math.cos(c.yaw)], r = [Math.cos(c.yaw), -Math.sin(c.yaw)];
    let mx = 0, mz = 0; if (keys.has('w')) { mx += f[0]; mz += f[1]; } if (keys.has('s')) { mx -= f[0]; mz -= f[1]; } if (keys.has('d')) { mx += r[0]; mz += r[1]; } if (keys.has('a')) { mx -= r[0]; mz -= r[1]; }
    if (mx || mz) { c.t[0] += mx * sp; c.t[2] += mz * sp; } if (keys.has('e')) c.t[1] += sp; if (keys.has('q')) c.t[1] -= sp;
    if (hold.dir) { c.t[1] += hold.dir * 14 * dt * Math.max(0.5, c.dist / 25); }
    c.t[0] = clamp(c.t[0], -LIMIT, LIMIT); c.t[2] = clamp(c.t[2], -LIMIT, LIMIT); c.t[1] = clamp(c.t[1], ground(c.t[0], c.t[2]) - 2, 900);
    setCam();
    const T = TIMES[S.time], me = { p: [...c.t] };
    if (S.run) { S.run.update(dt); }
    try {
      game.updateCreatures(dt, me, [], T.dark > 0.5, (now / 1000) % 100000);
      game.render([], me, { now, dt, dark: T.dark, sunAngle: T.sun, items: [], budget: Device.type === 'phone' ? 6 : 9 });
    } catch (e) { console.error(e); }
    drawGizmo();
    if (++frames === 3) $('loading').classList.add('hidden');
  }

  // ---------- picking ----------
  function rayAt(sx, sy) { return game.ray(sx, sy); }
  function groundHit(o, d, maxD = 1500) {
    let t = 0, step = 0.5, prev = null;
    while (t < maxD) { const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t; if (y < ground(x, z)) { let a = prev == null ? 0 : prev, b = t; for (let k = 0; k < 14; k++) { const m = (a + b) / 2, yy = o[1] + d[1] * m; if (yy < ground(o[0] + d[0] * m, o[2] + d[2] * m)) b = m; else a = m; } return { t: b, p: [o[0] + d[0] * b, o[1] + d[1] * b, o[2] + d[2] * b] }; } prev = t; t += step; step = Math.min(8, step * 1.06); }
    return null;
  }
  function pickAt(sx, sy) { const { o, d } = rayAt(sx, sy); const w = S.run || S.world; return w.pick(o, d, 2000, it => w.inWorld(it) || (!S.run && !w.stored(it))); }
  function placeAt(sx, sy) {
    const { o, d } = rayAt(sx, sy), hp = pickAt(sx, sy), gh = groundHit(o, d);
    if (hp && (!gh || hp.t < gh.t)) return [o[0] + d[0] * hp.t, o[1] + d[1] * hp.t, o[2] + d[2] * hp.t];
    if (gh && gh.t < 300) return gh.p;
    return [S.cam.t[0], ground(S.cam.t[0], S.cam.t[2]), S.cam.t[2]];
  }
  // the thing a click picks: the top model it is in (tap again to go into the model)
  function topPick(it) { let x = it, chain = [x]; while (x.d.parent && get(x.d.parent)) { x = get(x.d.parent); chain.unshift(x); } if (S.sel.size === 1) { const cur = [...S.sel][0], i = chain.findIndex(c => c.id === cur); if (i >= 0 && i < chain.length - 1) return chain[i + 1]; } return chain[0]; }

  // ---------- selection ----------
  function select(ids, add) { if (!add) S.sel.clear(); for (const id of ids) { if (add && S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); } S.world.sel = S.sel; for (const id of S.sel) { let x = get(id); while (x && x.d.parent) { S.open.add(x.d.parent); x = get(x.d.parent); } } renderTree(); renderProps(); }
  const selItems = () => [...S.sel].map(get).filter(it => it && it.alive);
  function topSel() { const its = selItems(); return its.filter(it => { let x = it; while (x.d.parent) { if (S.sel.has(x.d.parent)) return false; x = get(x.d.parent); if (!x) break; } return true; }); }
  function partsOfSel() { const set = new Map(); for (const it of topSel()) for (const p of S.world.parts(it)) set.set(p.id, p); return [...set.values()]; }
  function selBox() { let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const it of topSel()) { const b = S.world.boxOf(it); if (!b) continue; for (let j = 0; j < 3; j++) { lo[j] = Math.min(lo[j], b[0][j]); hi[j] = Math.max(hi[j], b[1][j]); } } return lo[0] > hi[0] ? null : [lo, hi]; }

  // ---------- adding things ----------
  const DEF_COL = { block: '#9aa3b5', wedge: '#c9a36a', corner: '#c9a36a', cylinder: '#6fa8dc', ball: '#e0443c', cone: '#ff8a2a', pyramid: '#e8c35a', dome: '#7ac17a', ring: '#ffd23a', tube: '#8a8f99', stairs: '#9a978f', arch: '#b8a8ff', quarter: '#6fa8dc', hexagon: '#5ac8b8', star: '#ffd23a', heart: '#ff5a8a' };
  const DEF_SIZE = { block: [4, 1, 4], wedge: [4, 2, 4], corner: [3, 3, 3], cylinder: [2, 3, 2], ball: [2, 2, 2], cone: [2, 3, 2], pyramid: [3, 3, 3], dome: [4, 2, 4], ring: [3, 3, 3], tube: [2, 3, 2], stairs: [4, 4, 4], arch: [6, 5, 1], quarter: [4, 4, 4], hexagon: [3, 1, 3], star: [3, 0.6, 3], heart: [3, 0.6, 3] };
  function nextName(base) { const k = base.replace(/\d+$/, ''); let n = 1; const used = new Set([...S.world.items.values()].filter(i => i.alive).map(i => (i.d.name || '').toLowerCase())); while (used.has((k + n).toLowerCase())) n++; return k + n; }
  const snapV = (v, st) => S.snap ? Math.round(v / st) * st : v;
  function addShape(shape) {
    const at = placeAt(gzW() / 2, gzH() / 2), s = [...DEF_SIZE[shape]];
    change(() => { const d = { id: newId(), k: 'part', name: nextName('Part'), parent: null, shape, p: [snapV(at[0], 0.5), r3(at[1] + s[1] / 2), snapV(at[2], 0.5)], r: [0, 0, 0], s, c: DEF_COL[shape] || '#9aa3b5', mat: 'plastic', alpha: 1, glow: 0, light: 0, solid: true, show: true, label: '', code: '' }; S.world.add(d); select([d.id]); });
    if (S.tool === 'select') setTool('move');
  }
  function addPrefab(name) {
    const at = placeAt(gzW() / 2, gzH() / 2), parts = K.PREFABS[name]();
    change(() => {
      const mid = newId('m'), md = { id: mid, k: 'model', name: nextName(name.replace(/[^A-Za-z0-9]+/g, '')), parent: null, code: '', show: true }; S.world.add(md);
      const yaw = Math.round((S.cam.yaw * 180 / Math.PI) / 90) * 90, R = K.rotM([0, -yaw + 180, 0]);
      for (const q of parts) { const o = M4.apply3(R, q.p), d = { id: newId(), k: 'part', name: q.name || nextName('Part'), parent: mid, shape: q.shape, p: [r3(at[0] + o[0]), r3(at[1] + o[1]), r3(at[2] + o[2])], r: K.eulerOf(M4.mul3(R, K.rotM(q.r || [0, 0, 0]))), s: [...(q.s)], c: q.c, mat: q.mat || 'plastic', alpha: q.alpha ?? 1, glow: q.glow || 0, light: q.light || 0, solid: q.solid !== false, show: true, label: q.label || '', code: q.code || '' }; S.world.add(d); }
      S.open.add(mid); select([mid]);
    });
  }

  // ---------- thumbnails (drawn flat, for the Add tab and My mods) ----------
  function thumb(cv, parts, o = {}) {
    const W = cv.width, H = cv.height, g = cv.getContext('2d'); g.clearRect(0, 0, W, H);
    const yaw = o.yaw ?? 0.7, pit = o.pitch ?? 0.5, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit), L = [-0.45, 0.8, 0.4], ll = Math.hypot(...L);
    const view = v => { const x = v[0] * cy - v[2] * sy, z0 = v[0] * sy + v[2] * cy; return [x, v[1] * cp - z0 * sp, v[1] * sp + z0 * cp]; };
    const tris = [];
    for (const q of parts.slice(0, 600)) { const M = K.matOf(q), T = K.trisOf(q.shape || 'block'), M_ = K.MATS[q.mat] || K.MATS.plastic, col = K.rgb(q.c || '#999'), glow = (M_.glow || q.glow || 0) > 0.3, a = (q.alpha ?? 1) * (M_.alpha ?? 1);
      if (a < 0.05) continue;
      for (const t of T) { const w = t.map(p => [M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14]]);
        const e1 = w[1].map((v, j) => v - w[0][j]), e2 = w[2].map((v, j) => v - w[0][j]), n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nl = Math.hypot(...n) || 1;
        const v = w.map(view), vn = view(n.map(x => x / nl)); if (vn[2] < -0.02 && a > 0.9) continue;
        const lam = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl / ll), k = glow ? 1.15 : 0.42 + 0.7 * lam + (n[1] / nl) * 0.05;
        tris.push({ v, z: (v[0][2] + v[1][2] + v[2][2]) / 3, c: col.map(x => Math.round(clamp(x * k, 0, 1) * 255)), a: Math.min(1, a + 0.2) }); } }
    if (!tris.length) return;
    let lo = [1e9, 1e9], hi = [-1e9, -1e9]; for (const t of tris) for (const p of t.v) { lo[0] = Math.min(lo[0], p[0]); lo[1] = Math.min(lo[1], p[1]); hi[0] = Math.max(hi[0], p[0]); hi[1] = Math.max(hi[1], p[1]); }
    const sc = Math.min((W - 8) / (hi[0] - lo[0] || 1), (H - 8) / (hi[1] - lo[1] || 1)), ox = W / 2 - (lo[0] + hi[0]) / 2 * sc, oy = H / 2 + (lo[1] + hi[1]) / 2 * sc;
    tris.sort((a, b) => a.z - b.z);
    for (const t of tris) { g.fillStyle = g.strokeStyle = 'rgba(' + t.c.join(',') + ',' + t.a + ')'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ox + t.v[0][0] * sc, oy - t.v[0][1] * sc); g.lineTo(ox + t.v[1][0] * sc, oy - t.v[1][1] * sc); g.lineTo(ox + t.v[2][0] * sc, oy - t.v[2][1] * sc); g.closePath(); g.fill(); if (t.a > 0.9) g.stroke(); }
  }
  // painted material swatches from the game's own textures
  const MAT_COL = { plastic: '#9aa3b5', wood: '#b07a45', bark: '#7a5232', bricks: '#a8574a', stone: '#9a978f', metal: '#8d96a3', roof: '#b8483a', plaster: '#efe4cf', grass: '#5fb54a', sand: '#e8d49c', snow: '#f4f8fc', dirt: '#8a6a4a', leaves: '#4f9a3e', neon: '#5ff0e0', glass: '#bfe6ff', ice: '#cfeeff', toon: '#ff8a5a' };
  const matCanvas = {};
  function matSwatch(m) {
    if (matCanvas[m]) return matCanvas[m];
    const S2 = 48, cv = document.createElement('canvas'); cv.width = S2; cv.height = 30; const g = cv.getContext('2d'), M_ = K.MATS[m], base = K.rgb(MAT_COL[m]);
    const img = g.createImageData(S2, 30); let data = null; if (M_.tex >= 0 && typeof makeTextureLayers === 'function') data = makeTextureLayers(64, M_.tex);
    for (let y = 0; y < 30; y++) for (let x = 0; x < S2; x++) { const i = (y * S2 + x) * 4; let k = 1; if (data) k = data[((y + 10) * 64 + x + 6) * 4] / 128; else if (m === 'glass' || m === 'ice') k = 0.9 + (x - y > 10 && x - y < 18 ? 0.35 : 0); else if (m === 'neon') k = 1.1 - Math.hypot(x - 24, y - 15) / 60; else k = 1 - y / 120 + (x + y < 14 ? 0.15 : 0);
      img.data[i] = clamp(base[0] * k * 255, 0, 255); img.data[i + 1] = clamp(base[1] * k * 255, 0, 255); img.data[i + 2] = clamp(base[2] * k * 255, 0, 255); img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); return (matCanvas[m] = cv);
  }

  // ---------- left panel ----------
  function renderAdd() {
    const P = $('pAdd'); P.innerHTML = '';
    P.append(el('h4', '', 'Shapes')); const sh = el('div', 'shapes');
    for (const k in K.SHAPES) { const t = el('div', 'tile'), cv = document.createElement('canvas'); cv.width = 88; cv.height = 88; t.append(cv, document.createTextNode(K.SHAPES[k])); t.onclick = () => addShape(k); sh.append(t);
      requestAnimationFrame(() => thumb(cv, [{ shape: k, p: [0, 0, 0], r: [0, 0, 0], s: DEF_SIZE[k].map(v => v / Math.max(...DEF_SIZE[k])), c: DEF_COL[k], mat: 'plastic' }])); }
    P.append(sh); P.append(el('h4', '', 'Ready-made models')); P.append(el('p', 'note', 'Made from normal parts, so you can change every piece. Some already have code.'));
    const md = el('div', 'models');
    for (const k in K.PREFABS) { const t = el('div', 'tile'), cv = document.createElement('canvas'); cv.width = 144; cv.height = 120; t.append(cv, document.createTextNode(k)); t.onclick = () => addPrefab(k); md.append(t); setTimeout(() => thumb(cv, K.PREFABS[k]()), 30); }
    P.append(md);
  }
  function renderTree() {
    if (S.ltab !== 'explorer') return;
    const T = $('tree'); T.innerHTML = ''; const W_ = S.world;
    const row = (label, icon, depth, o = {}) => { const r = el('div', 'row' + (o.sel ? ' sel' : '') + (o.dim ? ' dimmed' : '')); r.style.paddingLeft = (4 + depth * 14) + 'px';
      const tw = el('span', 'tw', o.kids ? (o.open ? '<svg class="ic" viewBox="0 0 24 24" style="width:12px"><path d="M6 9l6 6 6-6"/></svg>' : '<svg class="ic" viewBox="0 0 24 24" style="width:12px"><path d="M9 6l6 6-6 6"/></svg>') : ''); if (o.kids) tw.onclick = e => { e.stopPropagation(); o.toggle(); };
      r.append(tw); if (o.color) { const sw = el('span', 'sw'); sw.style.background = o.color; r.append(sw); } else r.insertAdjacentHTML('beforeend', ic(icon));
      r.append(el('span', 'nm', '')); r.lastChild.textContent = label; if (o.tag) r.append(el('span', 'tag', o.tag)); if (o.click) r.onclick = o.click; T.append(r); return r; };
    row('Main code', 'script', 0, { sel: S.codeFor === 'main', click: () => openCode('main'), tag: (S.mod.code || '').trim() ? 'has code' : '' });
    const all = [...W_.items.values()].filter(i => i.alive);
    const kidsOf = pid => all.filter(i => (i.d.parent || null) === pid);
    const walk = (list, depth, inStore) => { for (const it of list) { const ks = kidsOf(it.id), open = S.open.has(it.id); if (!!it.d.store !== inStore && depth === 0) continue;
      row(it.d.name || '(no name)', it.d.k === 'model' ? 'model' : 'box', depth, { sel: S.sel.has(it.id), dim: it.d.show === false, color: it.d.k === 'model' ? null : it.d.c, kids: ks.length, open, tag: (it.d.code || '').trim() ? 'code' : '', toggle: () => { open ? S.open.delete(it.id) : S.open.add(it.id); renderTree(); },
        click: e => { select([it.id], S.several || e.shiftKey || e.ctrlKey || e.metaKey); } });
      if (open) walk(ks, depth + 1, inStore); } };
    const tops = kidsOf(null);
    walk(tops, 0, false);
    const st = row('Storage', 'store', 0, { tag: 'copies come from here' }); st.style.marginTop = '6px';
    walk(tops, 1, true);
    if (!all.length) T.append(el('p', 'note', 'Nothing here yet. Add shapes and models from the Add tab.'));
  }
  function renderActs() {
    const A = $('treeActs'); A.innerHTML = '';
    const mk = (icon, t, fn, title) => { const b = el('button', '', ic(icon) + t); b.title = title || t; b.onclick = fn; A.append(b); return b; };
    mk('group', 'Group', groupSel, 'Group into a model'); mk('ungroup', 'Ungroup', ungroupSel); mk('copy', 'Copy', dupSel, 'Duplicate (Ctrl+D)');
    mk('store', 'Storage', storeSel, 'Move in or out of Storage'); mk('trash', 'Delete', delSel); const sv = mk('several', 'Several', () => { S.several = !S.several; sv.classList.toggle('on', S.several); }, 'Tap to pick several'); sv.classList.toggle('on', S.several);
  }
  function setLTab(t) { S.ltab = t; for (const b of $('ltabs').children) b.classList.toggle('on', b.dataset.t === t); $('pAdd').classList.toggle('hidden', t !== 'add'); $('pExplorer').classList.toggle('hidden', t !== 'explorer'); $('treeActs').classList.toggle('hidden', t !== 'explorer'); $('pMap').classList.toggle('hidden', t !== 'map'); if (t === 'explorer') renderTree(); if (t === 'map') renderMap(); }

  // ---------- explorer actions ----------
  function groupSel() { const tops = topSel(); if (!tops.length) return toast('Pick some parts first'); change(() => { const mid = newId('m'), par = tops[0].d.parent || null; S.world.add({ id: mid, k: 'model', name: nextName('Model'), parent: par, code: '', show: true, store: tops[0].d.store && !par }); for (const it of tops) { it.d.parent = mid; it.d.store = false; } S.open.add(mid); select([mid]); }); }
  function ungroupSel() { const ms = topSel().filter(it => it.d.k === 'model'); if (!ms.length) return toast('Pick a model to ungroup'); change(() => { const ids = []; for (const m of ms) { for (const k of S.world.kids(m)) { k.d.parent = m.d.parent || null; if (!m.d.parent) k.d.store = m.d.store; ids.push(k.id); } m.alive = false; } select(ids); }); }
  function dupSel() { const tops = topSel(); if (!tops.length) return; change(() => { const ids = []; for (const it of tops) { const n = cloneItem(it, it.d.parent, [S.snap ? 2 : 1.5, 0, 0]); ids.push(n.id); } select(ids); }); }
  function cloneItem(it, parent, off) { const d = JSON.parse(JSON.stringify(it.d)); d.id = newId(); d.parent = parent; if (d.k !== 'model') d.p = d.p.map((v, j) => r3(v + off[j])); if (d.name && !/^(Coin|Lava)/.test(d.name)) d.name = nextName(d.name); const n = S.world.add(d); for (const k of S.world.kids(it)) if (k.alive && k !== n) cloneItem(k, d.id, off); return n; }
  function delSel() { const tops = topSel(); if (!tops.length) return; change(() => { for (const it of tops) S.world.destroy(it); S.sel.clear(); }); }
  function storeSel() { const tops = topSel().filter(it => !it.d.parent); if (!tops.length) return toast('Pick a top part or model (not one inside a model)'); change(() => { for (const it of tops) it.d.store = !it.d.store; }); toast(tops[0].d.store ? 'In Storage: it only shows up when code copies it with #spawn' : 'Back in the world'); }

  // ---------- map ----------
  let mapR = 1200;
  function renderMap() {
    const P = $('pMap'); P.innerHTML = '';
    const cv = document.createElement('canvas'); cv.width = 220; cv.height = 220; cv.style.cssText = 'width:100%;aspect-ratio:1;display:block;border:1px solid var(--line);cursor:crosshair;image-rendering:pixelated';
    const zr = el('div', '', ''); zr.style.cssText = 'display:flex;gap:4px;margin:6px 0';
    for (const [r, t] of [[400, 'Near'], [1200, 'Area'], [4000, 'Big'], [8000, 'Whole world']]) { const b = el('button', r === mapR ? 'on' : '', t); b.style.flex = '1'; b.style.justifyContent = 'center'; b.style.fontSize = '11px'; b.onclick = () => { mapR = r; renderMap(); }; zr.append(b); }
    P.append(el('h4', '', 'Nautic Online map'), cv, zr, el('p', 'note', 'Tap the map to fly there.'));
    const c = mapR === 8000 ? [0, 0] : [S.cam.t[0], S.cam.t[2]], g = cv.getContext('2d'), N = 110, img = g.createImageData(N, N);
    let row = 0; const T = game.T;
    const paint = () => { const t0 = performance.now(); while (row < N && performance.now() - t0 < 12) { for (let i = 0; i < N; i++) { const x = c[0] + (i / N * 2 - 1) * mapR, z = c[1] + (row / N * 2 - 1) * mapR, h = T.ground(x, z), k = (row * N + i) * 4; let col;
        if (h < SEA) { const d = clamp((SEA - h) / 30, 0, 1); col = [0.27 - d * 0.15, 0.62 - d * 0.3, 0.78 - d * 0.25]; } else { const b = BIOMES[T.info(x, z).b]; col = K.rgb(b ? b.ground : '#888888'); const sh = clamp(0.85 + h / 220, 0.75, 1.25); col = col.map(v => v * sh); }
        img.data[k] = col[0] * 255; img.data[k + 1] = col[1] * 255; img.data[k + 2] = col[2] * 255; img.data[k + 3] = 255; } row++; }
      const off = document.createElement('canvas'); off.width = off.height = N; off.getContext('2d').putImageData(img, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(off, 0, 0, 220, 220); marks();
      if (row < N && document.body.contains(cv)) requestAnimationFrame(paint); };
    const toMap = (x, z) => [((x - c[0]) / mapR + 1) / 2 * 220, ((z - c[1]) / mapR + 1) / 2 * 220];
    const places = placeList();
    const marks = () => { g.font = '700 10px system-ui'; for (const p of places) { const [x, y] = toMap(p.x, p.z); if (x < 0 || y < 0 || x > 220 || y > 220) continue; g.fillStyle = '#10131a'; g.fillRect(x - 3, y - 3, 6, 6); g.fillStyle = p.col || '#fff'; g.fillRect(x - 2, y - 2, 4, 4); }
      const [mx, my] = toMap(S.cam.t[0], S.cam.t[2]); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, 5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(mx, my); g.lineTo(mx - Math.sin(S.cam.yaw) * 12, my - Math.cos(S.cam.yaw) * 12); g.stroke(); };
    paint();
    cv.onclick = e => { const r = cv.getBoundingClientRect(), x = c[0] + ((e.clientX - r.left) / r.width * 2 - 1) * mapR, z = c[1] + ((e.clientY - r.top) / r.height * 2 - 1) * mapR; flyTo([x, ground(x, z), z]); setTimeout(renderMap, 50); };
    P.append(el('h4', '', 'Places'));
    for (const p of places.filter(p => p.big)) { const r = el('div', 'row', ic('pin') + '<span class="nm"></span>'); r.lastChild.textContent = p.name; r.onclick = () => flyTo([p.x, ground(p.x, p.z), p.z]); P.append(r); }
    const near = places.filter(p => !p.big && Math.hypot(p.x - S.cam.t[0], p.z - S.cam.t[2]) < 1500).sort((a, b) => Math.hypot(a.x - S.cam.t[0], a.z - S.cam.t[2]) - Math.hypot(b.x - S.cam.t[0], b.z - S.cam.t[2])).slice(0, 14);
    if (near.length) { P.append(el('h4', '', 'Close by')); for (const p of near) { const r = el('div', 'row', ic('pin') + '<span class="nm"></span><span class="tag"></span>'); r.children[1].textContent = p.name; r.children[2].textContent = Math.round(Math.hypot(p.x - S.cam.t[0], p.z - S.cam.t[2])) + ' m'; r.onclick = () => flyTo([p.x, ground(p.x, p.z), p.z]); P.append(r); } }
  }
  function placeList() {
    const out = [{ name: 'Spawn plaza', x: 0, z: 7, big: 1, col: '#ffffff' }, { name: 'The abandoned station', x: STATION.x, z: STATION.z + STATION.R + 20, big: 1, col: '#5ff0e0' }];
    try { if (typeof PARK !== 'undefined') out.push({ name: 'Fun Park', x: PARK.x, z: PARK.z, big: 1, col: '#7aff9a' }); if (typeof PIER !== 'undefined') out.push({ name: 'Fishing pier', x: PIER.end[0] + 30, z: 0, big: 1, col: '#5ab8ff' }); if (typeof ARENA !== 'undefined') out.push({ name: 'Game arena', x: ARENA.x, z: ARENA.z, big: 1, col: '#ff5ad8' }); } catch (e) {}
    out.push({ name: 'Parkour climb', x: 44, z: 38, big: 1, col: '#ff9f5a' });
    for (const pt of game.portals) out.push({ name: pt.label, x: pt.p[0], z: pt.p[2], big: 1, col: pt.col });
    try { for (const p of game.places(S.cam.t[0], S.cam.t[2], 1500)) if (!p.always) out.push({ name: p.name || 'Place', x: p.x, z: p.z, col: p.col }); } catch (e) {}
    return out;
  }
  function flyTo(p) { S.cam.t = [p[0], p[1] + 1, p[2]]; if (S.cam.dist > 60) S.cam.dist = 40; }

  // ---------- properties ----------
  const sel1 = () => { const a = selItems(); return a.length === 1 ? a[0] : null; };
  function renderProps() {
    const P = $('props'); P.innerHTML = ''; const its = selItems();
    const prop = (label, node) => { const r = el('div', 'prop'); r.append(el('label', '', label), node); P.append(r); return r; };
    const text = (val, fn, ph) => { const i = el('input'); i.type = 'text'; i.value = val || ''; if (ph) i.placeholder = ph; i.onchange = () => fn(i.value); i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') i.blur(); }; return i; };
    if (!its.length) {
      P.append(el('h4', '', 'This mod'));
      prop('Name', text(S.mod.name, v => { S.mod.name = v.replace(/[<>]/g, '').slice(0, 40) || 'My mod'; $('modName').textContent = S.mod.name; saveSoon(); }));
      const ab = el('textarea'); ab.value = S.mod.about || ''; ab.rows = 3; ab.style.width = '100%'; ab.placeholder = 'What does your mod add?'; ab.onchange = () => { S.mod.about = ab.value.slice(0, 200); saveSoon(); }; ab.onkeydown = e => e.stopPropagation(); prop('About', ab);
      const cb = el('button', '', ic('code') + 'Main code'); cb.onclick = () => openCode('main'); prop('Code', cb);
      const n = [...S.world.items.values()].filter(i => i.alive && i.d.k !== 'model').length;
      P.append(el('p', 'note', n + ' parts. Tap a part in the world or in the Explorer to change it.'));
      P.append(el('h4', '', 'How to use your mod'));
      P.append(el('p', 'note', 'Press Test to play it in Nautic Online. To play it with friends, open Nautic Online, go to Servers, Make a server, and tick your mod. Everyone who joins gets it.'));
      return;
    }
    const it = its[0], d = it.d, multi = its.length > 1, parts = partsOfSel();
    P.append(el('h4', '', multi ? its.length + ' things picked' : d.k === 'model' ? 'Model' : 'Part'));
    if (!multi) prop('Name', text(d.name, v => change(() => { const nm = v.trim().replace(/[<>=#]/g, '').slice(0, 40) || nextName('Part'); d.name = nm; S.world.byName = new Map(); for (const x of S.world.items.values()) { const k = K.norm(x.d.name || ''); if (!S.world.byName.has(k)) S.world.byName.set(k, []); S.world.byName.get(k).push(x); } }), 'Name used in code'));
    // transform
    if (!multi && d.k !== 'model') {
      prop('Position', xyz(d.p, (j, v) => { d.p[j] = v; it.dirty = true; }));
      prop('Turn', xyz(d.r, (j, v) => { d.r[j] = v; it.dirty = true; }));
      prop('Size', xyz(d.s, (j, v) => { d.s[j] = Math.max(0.02, Math.abs(v)); it.dirty = true; }));
    } else { const b = selBox(); if (b) { const c = b[0].map((v, j) => (v + b[1][j]) / 2); prop('Position', xyz(c, (j, v) => { const dv = [0, 0, 0]; dv[j] = v - c[j]; for (const t of topSel()) S.world.moveBy(t, dv); c[j] = v; })); } }
    if (parts.length) {
      const p0 = parts[0].d;
      // shape
      const shapes = el('div', 'sel'); const sb = el('button', '', '<span>' + (parts.every(p => p.d.shape === p0.shape) ? K.SHAPES[p0.shape] : 'Mixed') + '</span><svg class="ic" viewBox="0 0 24 24" style="width:12px"><path d="M6 9l6 6 6-6"/></svg>'); shapes.append(sb);
      sb.onclick = () => menu(sb, Object.entries(K.SHAPES).map(([k, v]) => [k, v]), p0.shape, k => change(() => { for (const p of parts) { p.d.shape = k; p.dirty = true; } }));
      prop('Shape', shapes);
      // colour
      const cbn = el('div', 'colbtn'); cbn.style.background = p0.c; cbn.textContent = p0.c; cbn.onclick = () => colorPicker(cbn, p0.c, (c, done) => { if (done === 'start') snapshot(); for (const p of parts) p.d.c = c; cbn.style.background = c; cbn.textContent = c; if (done === true) changed(); });
      prop('Colour', cbn);
      // material
      const mats = el('div', 'mats'); for (const m in K.MATS) { const t = el('div', 'mat' + (parts.every(p => p.d.mat === m) ? ' on' : '')); t.append(matSwatch(m).cloneNode()); t.firstChild.getContext('2d').drawImage(matSwatch(m), 0, 0); t.append(document.createTextNode(K.MATS[m].name.replace(' (glows)', ''))); t.onclick = () => change(() => { for (const p of parts) p.d.mat = m; }); mats.append(t); }
      P.append(el('h4', '', 'Material')); P.append(mats); P.append(el('h4', '', 'Look'));
      prop('See-through', slider(1 - (p0.alpha ?? 1), 0, 1, 0.05, v => { for (const p of parts) p.d.alpha = r3(1 - v); }));
      prop('Glow', slider(p0.glow || 0, 0, 1, 0.05, v => { for (const p of parts) p.d.glow = v; }));
      prop('Light', slider(p0.light || 0, 0, 40, 1, v => { for (const p of parts) p.d.light = v; }));
      P.append(el('h4', '', 'Behaviour'));
      prop('', check('Solid (players bump into it)', parts.every(p => p.d.solid !== false), v => change(() => { for (const p of parts) p.d.solid = v; })));
    }
    prop('', check('Visible', its.every(i => i.d.show !== false), v => change(() => { for (const i of its) i.d.show = v; })));
    if (!multi && d.k !== 'model') prop('Text above', text(d.label, v => change(() => { d.label = v.replace(/[<>]/g, '').slice(0, 80); }), 'Shown above it'));
    if (!multi) { const cb = el('button', (d.code || '').trim() ? 'on' : '', ic('code') + ((d.code || '').trim() ? 'Edit its code' : 'Add code')); cb.onclick = () => openCode(it.id); P.append(el('h4', '', 'Code')); P.append(cb); P.append(el('p', 'note', 'In its code, "self" means this ' + (d.k === 'model' ? 'model' : 'part') + '. Other code can use its name: ' + (d.name || '').replace(/</g, ''))); }
    if (S.tool !== 'select') P.append(el('p', 'note', 'Drag the coloured handles in the view to ' + S.tool + ' it.'));
  }
  function xyz(v, set) {
    const w = el('div', 'xyz');
    ['x', 'y', 'z'].forEach((a, j) => { const i = el('input', a); i.type = 'text'; i.inputMode = 'decimal'; i.value = r3(v[j]); i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') i.blur(); };
      i.onchange = () => { const n = parseFloat(i.value); if (!isFinite(n)) { i.value = r3(v[j]); return; } snapshot(); set(j, n); changed(); }; w.append(i); });
    return w;
  }
  function slider(v, a, b, st, set) {
    const w = el('div', 'slider'), tr = el('div', 'tr'), fi = el('div', 'fi'), kn = el('div', 'kn'), vl = el('span', 'vl'); tr.append(fi, kn); w.append(tr, vl);
    const show = x => { const k = (x - a) / (b - a); fi.style.width = (k * 100) + '%'; kn.style.left = (k * 100) + '%'; vl.textContent = st < 1 ? Math.round(x * 100) + '%' : x; };
    show(v);
    tr.onpointerdown = e => { snapshot(); tr.setPointerCapture(e.pointerId); const mv = ev => { const r = tr.getBoundingClientRect(); let x = a + clamp((ev.clientX - r.left) / r.width, 0, 1) * (b - a); x = Math.round(x / st) * st; x = r3(x); show(x); set(x); }; mv(e); tr.onpointermove = mv; tr.onpointerup = () => { tr.onpointermove = null; changed(); }; };
    return w;
  }
  function check(label, on, set) { const w = el('div', 'check'), b = el('span', 'box' + (on ? ' on' : '')); w.append(b, el('span', '', label)); w.onclick = () => set(!on); return w; }
  function menu(anchor, items, cur, pick) {
    closeMenus(); const m = el('div', 'menu'); m.id = 'openMenu';
    for (const [k, v] of items) { const it = el('div', k === cur ? 'on' : '', ''); it.textContent = v; it.onclick = () => { closeMenus(); pick(k); }; m.append(it); }
    document.body.append(m); const r = anchor.getBoundingClientRect(); m.style.minWidth = r.width + 'px'; m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 4) + 'px'; m.style.top = (r.bottom + m.offsetHeight > innerHeight ? Math.max(4, r.top - m.offsetHeight) : r.bottom) + 'px';
    setTimeout(() => addEventListener('pointerdown', closeOut, { once: true }), 0);
  }
  function closeOut(e) { const m = $('openMenu'); if (m && m.contains(e.target)) { addEventListener('pointerdown', closeOut, { once: true }); return; } closeMenus(); }
  function closeMenus() { const m = $('openMenu'); if (m) m.remove(); }

  // ---------- colour picker (our own) ----------
  const PALETTE = ['#f4f4f2', '#c3c8d0', '#8a8f99', '#4a4e58', '#1b1c22', '#7a5232', '#a0703f', '#d2b48c', '#e8d49c', '#f6edd5', '#e0443c', '#ff7a6a', '#ff8a2a', '#ffc4a0', '#ffd23a', '#e8b631', '#9be04a', '#5fb54a', '#3fa34d', '#2f6b3f',
    '#2bb5a0', '#a8f0c8', '#3ad4f0', '#8fd0ff', '#3a6ee0', '#1f2f6b', '#8a4fe0', '#c9b8ff', '#ff7ab8', '#e03ad0'];
  function colorPicker(anchor, cur, set) {
    const old = $('cp'); if (old) old.remove();
    const cp = el('div', ''); cp.id = 'cp'; let [h, s, v] = toHsv(cur); let started = false;
    const sv = el('div', 'sv'), svk = el('i'), hue = el('div', 'hue'), hk = el('i'), pal = el('div', 'pal'), hr = el('div', 'hexrow'), hx = el('input'), prev = el('div'), ok = el('button', 'pri', 'Done');
    sv.append(svk); hue.append(hk); hx.type = 'text'; hx.value = cur; hr.append(prev, hx, ok);
    for (const c of PALETTE) { const d = el('div'); d.style.background = c; d.onclick = () => { [h, s, v] = toHsv(c); upd(true); }; pal.append(d); }
    cp.append(pal, sv, hue, hr); document.body.append(cp);
    const r = anchor.getBoundingClientRect(); cp.style.left = clamp(r.left - 20, 4, innerWidth - 244) + 'px'; cp.style.top = clamp(r.bottom + 4, 4, innerHeight - cp.offsetHeight - 4) + 'px';
    function upd(fire) { const c = fromHsv(h, s, v); sv.style.background = 'linear-gradient(0deg,#000,transparent),linear-gradient(90deg,#fff,' + fromHsv(h, 1, 1) + ')'; svk.style.left = s * 100 + '%'; svk.style.top = (1 - v) * 100 + '%'; hk.style.left = h * 100 + '%'; prev.style.background = c; if (document.activeElement !== hx) hx.value = c; if (fire) { if (!started) { started = true; set(c, 'start'); } set(c, false); } }
    const drag = (node, fn) => { node.onpointerdown = e => { node.setPointerCapture(e.pointerId); const mv = ev => { const rr = node.getBoundingClientRect(); fn(clamp((ev.clientX - rr.left) / rr.width, 0, 1), clamp((ev.clientY - rr.top) / rr.height, 0, 1)); upd(true); }; mv(e); node.onpointermove = mv; node.onpointerup = () => { node.onpointermove = null; }; }; };
    drag(sv, (x, y) => { s = x; v = 1 - y; }); drag(hue, x => { h = x; });
    hx.onkeydown = e => e.stopPropagation(); hx.oninput = () => { const c = K.toColor(hx.value); if (c) { [h, s, v] = toHsv(c); upd(true); } };
    const close = () => { cp.remove(); removeEventListener('pointerdown', out, true); if (started) set(fromHsv(h, s, v), true); };
    const out = e => { if (!cp.contains(e.target) && e.target !== anchor) close(); };
    ok.onclick = close; setTimeout(() => addEventListener('pointerdown', out, true), 0); upd(false);
  }
  function toHsv(hex) { const [r, g, b] = K.rgb(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [((h / 6) + 1) % 1, mx ? d / mx : 0, mx]; }
  function fromHsv(h, s, v) { const f = n => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }

  // ---------- the move / turn / size handles ----------
  const gz = $('gz'), gctx = gz.getContext('2d');
  const gzW = () => gz.clientWidth, gzH = () => gz.clientHeight;
  let handles = [], drag = null;
  const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], AXC = ['#e5484d', '#46a758', '#3e7bfa'];
  function axesFor() { const one = sel1(); if (one && one.d.k !== 'model' && S.tool !== 'move') { const R = K.rotM(one.d.r); return [0, 1, 2].map(j => [R[j * 3], R[j * 3 + 1], R[j * 3 + 2]]); } return AX; }
  function drawGizmo() {
    const dpr = Math.min(devicePixelRatio || 1, 2), W = gzW(), H = gzH();
    if (gz.width !== Math.round(W * dpr) || gz.height !== Math.round(H * dpr)) { gz.width = Math.round(W * dpr); gz.height = Math.round(H * dpr); }
    const g = gctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); handles = [];
    if (S.run || S.tool === 'select' || !S.sel.size) return;
    const b = selBox(); if (!b) return;
    const o = b[0].map((v, j) => (v + b[1][j]) / 2), P = game.project(...o); if (!P) return;
    const eye = game.cam.eye, L = Math.hypot(eye[0] - o[0], eye[1] - o[1], eye[2] - o[2]) * 0.17, axes = axesFor();
    g.lineCap = 'round';
    if (S.tool === 'move' || S.tool === 'size') {
      axes.forEach((a, j) => { const q = game.project(o[0] + a[0] * L, o[1] + a[1] * L, o[2] + a[2] * L); if (!q) return;
        const hot = drag && drag.h.j === j; g.strokeStyle = AXC[j]; g.lineWidth = hot ? 5 : 3.5; g.beginPath(); g.moveTo(P[0], P[1]); g.lineTo(q[0], q[1]); g.stroke();
        const dx = q[0] - P[0], dy = q[1] - P[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; g.fillStyle = AXC[j];
        if (S.tool === 'move') { g.beginPath(); g.moveTo(q[0] + ux * 14, q[1] + uy * 14); g.lineTo(q[0] - uy * 7, q[1] + ux * 7); g.lineTo(q[0] + uy * 7, q[1] - ux * 7); g.closePath(); g.fill(); }
        else g.fillRect(q[0] - 6, q[1] - 6, 12, 12);
        handles.push({ kind: S.tool, j, a, p0: P, p1: q, o, L }); });
      g.fillStyle = 'rgba(255,255,255,.85)'; g.strokeStyle = '#11131a'; g.lineWidth = 1.5; g.fillRect(P[0] - 7, P[1] - 7, 14, 14); g.strokeRect(P[0] - 7, P[1] - 7, 14, 14);
      handles.push({ kind: S.tool === 'move' ? 'free' : 'uniform', j: -1, p0: P, o, L });
    } else if (S.tool === 'turn') {
      axes.forEach((a, j) => { const u = Math.abs(a[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], c1 = [a[1] * u[2] - a[2] * u[1], a[2] * u[0] - a[0] * u[2], a[0] * u[1] - a[1] * u[0]], l1 = Math.hypot(...c1), v1 = c1.map(x => x / l1), v2 = [a[1] * v1[2] - a[2] * v1[1], a[2] * v1[0] - a[0] * v1[2], a[0] * v1[1] - a[1] * v1[0]];
        const pts = []; for (let k = 0; k <= 48; k++) { const t = k / 48 * Math.PI * 2, w = [0, 1, 2].map(i => o[i] + (v1[i] * Math.cos(t) + v2[i] * Math.sin(t)) * L * 0.95); const q = game.project(...w); if (q) pts.push(q); }
        const hot = drag && drag.h.j === j; g.strokeStyle = AXC[j]; g.lineWidth = hot ? 5 : 3; g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
        handles.push({ kind: 'turn', j, a, pts, p0: P, o }); });
    }
    if (drag && drag.label) { g.font = '700 12px system-ui'; g.fillStyle = 'rgba(15,17,22,.8)'; const w = g.measureText(drag.label).width + 12; g.fillRect(P[0] + 16, P[1] - 30, w, 20); g.fillStyle = '#fff'; g.fillText(drag.label, P[0] + 22, P[1] - 16); }
  }
  function hitHandle(x, y) {
    let best = null, bd = 16;
    const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
    for (const h of handles) {
      let d; if (h.kind === 'free' || h.kind === 'uniform') d = Math.max(Math.abs(x - h.p0[0]), Math.abs(y - h.p0[1])) - 4;
      else if (h.kind === 'turn') { d = 1e9; for (let k = 1; k < h.pts.length; k++) d = Math.min(d, segD([x, y], h.pts[k - 1], h.pts[k])); }
      else d = Math.min(segD([x, y], h.p0, h.p1), Math.hypot(x - h.p1[0], y - h.p1[1]) - 6);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }
  function startDrag(h, x, y) {
    snapshot();
    const ps = partsOfSel(), start = new Map(ps.map(p => [p.id, { p: [...p.d.p], r: [...p.d.r], s: [...p.d.s] }]));
    const b = selBox();
    drag = { h, x0: x, y0: y, start, ps, box: b, a0: Math.atan2(y - h.p0[1], x - h.p0[0]), plane: h.kind === 'free' ? planeHit(x, y, h.o[1]) : null };
  }
  function planeHit(x, y, py) { const { o, d } = rayAt(x, y); if (Math.abs(d[1]) < 1e-4) return null; const t = (py - o[1]) / d[1]; if (t < 0 || t > 3000) return null; return [o[0] + d[0] * t, py, o[2] + d[2] * t]; }
  function moveDrag(x, y) {
    const D = drag, h = D.h, W_ = S.world, st = S.snap ? 0.5 : 0, rs = S.snap ? 15 : 0;
    const restore = () => { for (const p of D.ps) { const s0 = D.start.get(p.id); p.d.p = [...s0.p]; p.d.r = [...s0.r]; p.d.s = [...s0.s]; p.dirty = true; } };
    const along = () => { const ax = h.p1[0] - h.p0[0], ay = h.p1[1] - h.p0[1], l = Math.hypot(ax, ay) || 1; return ((x - D.x0) * ax + (y - D.y0) * ay) / l / l * h.L; };
    restore();
    if (h.kind === 'move') { let t = along(); if (st) t = Math.round(t / st) * st; for (const p of D.ps) { p.d.p = p.d.p.map((v, j) => r3(v + h.a[j] * t)); } D.label = (t >= 0 ? '+' : '') + t.toFixed(2) + ' m'; }
    else if (h.kind === 'free') { const q = planeHit(x, y, h.o[1]); if (q && D.plane) { let dx = q[0] - D.plane[0], dz = q[2] - D.plane[2]; if (st) { dx = Math.round(dx / st) * st; dz = Math.round(dz / st) * st; } for (const p of D.ps) { p.d.p = [r3(p.d.p[0] + dx), p.d.p[1], r3(p.d.p[2] + dz)]; } D.label = dx.toFixed(1) + ', ' + dz.toFixed(1); } }
    else if (h.kind === 'turn') {
      let da = Math.atan2(y - h.p0[1], x - h.p0[0]) - D.a0; da = Math.atan2(Math.sin(da), Math.cos(da)); D.acc = (D.acc ?? 0); D.lastA = D.lastA ?? D.a0; let step = Math.atan2(y - h.p0[1], x - h.p0[0]) - D.lastA; step = Math.atan2(Math.sin(step), Math.cos(step)); D.acc += step; D.lastA = Math.atan2(y - h.p0[1], x - h.p0[0]);
      const eye = game.cam.eye, toward = (eye[0] - h.o[0]) * h.a[0] + (eye[1] - h.o[1]) * h.a[1] + (eye[2] - h.o[2]) * h.a[2] > 0;
      let deg = (toward ? -D.acc : D.acc) * 180 / Math.PI; if (rs) deg = Math.round(deg / rs) * rs;
      const R = M4.axisAngle(h.a[0], h.a[1], h.a[2], deg * Math.PI / 180), o = h.o;
      for (const p of D.ps) { const v = p.d.p.map((x2, j) => x2 - o[j]), q = M4.apply3(R, v); p.d.p = q.map((x2, j) => r3(o[j] + x2)); p.d.r = K.eulerOf(M4.mul3(R, K.rotM(p.d.r))); }
      D.label = Math.round(deg) + '°';
    } else if (h.kind === 'size') {
      let t = along(); if (st) t = Math.round(t / st) * st; const one = D.ps.length === 1 && sel1() && sel1().d.k !== 'model';
      if (one) { const p = D.ps[0], s0 = D.start.get(p.id); const ns = Math.max(0.05, s0.s[h.j] + t); const real = ns - s0.s[h.j]; p.d.s[h.j] = r3(ns); p.d.p = p.d.p.map((v, j) => r3(v + h.a[j] * real / 2)); D.label = ns.toFixed(2) + ' m'; }
      else { const b = D.box, ext = b[1][h.j] - b[0][h.j] || 1, k = Math.max(0.05, (ext + t) / ext), base = b[0][h.j];
        for (const p of D.ps) { p.d.p[h.j] = r3(base + (p.d.p[h.j] - base) * k); const R = K.rotM(p.d.r); let bj = 0, bv = 0; for (let c = 0; c < 3; c++) { const v = Math.abs(R[c * 3 + h.j]); if (v > bv) { bv = v; bj = c; } } p.d.s[bj] = r3(Math.max(0.02, p.d.s[bj] * k)); }
        D.label = '×' + k.toFixed(2); }
    } else if (h.kind === 'uniform') {
      let k = Math.max(0.05, 1 - (y - D.y0) / 120); if (S.snap) k = Math.max(0.25, Math.round(k * 4) / 4); const o = h.o;
      for (const p of D.ps) { p.d.p = p.d.p.map((v, j) => r3(o[j] + (v - o[j]) * k)); p.d.s = p.d.s.map(v => r3(Math.max(0.02, v * k))); }
      D.label = '×' + k.toFixed(2);
    }
    for (const p of D.ps) p.dirty = true;
  }
  function endDrag() { drag = null; changed(); }

  // ---------- pointer: orbit, pan, zoom, pick ----------
  const pts = new Map(); let gest = null;
  gz.addEventListener('pointerdown', e => {
    closeMenus(); gz.setPointerCapture(e.pointerId); const r = gz.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    pts.set(e.pointerId, { x, y, x0: x, y0: y, btn: e.button });
    if (pts.size === 1) { const h = !S.run && hitHandle(x, y); if (h) { startDrag(h, x, y); gest = { kind: 'gizmo' }; } else gest = { kind: 'tap', btn: e.button, shift: e.shiftKey || e.ctrlKey || e.metaKey }; }
    else if (pts.size === 2) { if (drag) { endDrag(); } const [a, b] = [...pts.values()]; gest = { kind: 'two', d0: Math.hypot(a.x - b.x, a.y - b.y), m0: [(a.x + b.x) / 2, (a.y + b.y) / 2], dist0: S.cam.dist, t0: [...S.cam.t] }; }
  });
  gz.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return; const r = gz.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, dx = x - p.x, dy = y - p.y; p.x = x; p.y = y;
    if (!gest) return;
    if (gest.kind === 'gizmo' && drag) { moveDrag(x, y); return; }
    if (gest.kind === 'tap' && Math.hypot(x - p.x0, y - p.y0) > 6) gest.kind = gest.btn === 2 || gest.btn === 1 || e.shiftKey ? 'pan' : 'orbit';
    if (gest.kind === 'orbit') { S.cam.yaw -= dx * 0.006; S.cam.pitch = clamp(S.cam.pitch + dy * 0.005, -0.25, 1.52); }
    else if (gest.kind === 'pan') pan(dx, dy);
    else if (gest.kind === 'two' && pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      S.cam.dist = clamp(gest.dist0 * gest.d0 / Math.max(10, d), 2, 900); const md = [m[0] - (gest.mp || gest.m0)[0], m[1] - (gest.mp || gest.m0)[1]]; gest.mp = m; pan(md[0], md[1]); }
  });
  const up = e => {
    const p = pts.get(e.pointerId); pts.delete(e.pointerId); if (!p || !gest) return;
    if (gest.kind === 'gizmo') { if (drag) endDrag(); gest = null; return; }
    if (gest.kind === 'tap' && gest.btn === 0) tap(p.x, p.y, gest.shift);
    if (!pts.size) gest = null; else if (gest.kind === 'two') gest = { kind: 'pan' };
  };
  gz.addEventListener('pointerup', up); gz.addEventListener('pointercancel', up);
  gz.addEventListener('contextmenu', e => e.preventDefault());
  gz.addEventListener('wheel', e => { e.preventDefault(); S.cam.dist = clamp(S.cam.dist * Math.exp(e.deltaY * 0.0012), 2, 900); }, { passive: false });
  function pan(dx, dy) { const c = S.cam, k = c.dist * 0.0022, r = [Math.cos(c.yaw), -Math.sin(c.yaw)], f = [-Math.sin(c.yaw), -Math.cos(c.yaw)]; c.t[0] += -dx * k * r[0] + dy * k * f[0] * 1.2; c.t[2] += -dx * k * r[1] + dy * k * f[1] * 1.2; }
  function tap(x, y, add) {
    const hit = pickAt(x, y);
    if (S.run) { if (hit) S.run.fire('click', { it: hit.it, player: 'me' }); return; }
    if (!hit) { if (!add && !S.several) select([]); return; }
    select([topPick(hit.it).id], add || S.several);
  }
  const hold = { dir: 0 };

  // ---------- keyboard ----------
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); doRedo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); dupSel(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'g') { e.preventDefault(); e.shiftKey ? ungroupSel() : groupSel(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); saveNow(); return; }
    if (k === 'delete' || k === 'backspace') { delSel(); return; }
    if (k === '1') setTool('select'); else if (k === '2') setTool('move'); else if (k === '3') setTool('turn'); else if (k === '4') setTool('size'); else if (k === 'f') focusSel(); else if (k === 'escape') select([]);
    keys.add(k === 'shift' ? 'shift' : k);
  });
  addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); });
  addEventListener('blur', () => keys.clear());
  function focusSel() { const b = selBox(); if (!b) return; S.cam.t = b[0].map((v, j) => (v + b[1][j]) / 2); S.cam.dist = clamp(Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1], b[1][2] - b[0][2]) * 1.6 + 4, 4, 400); }

  // ---------- top bar ----------
  function setTool(t) { S.tool = t; for (const b of $('tools').children) b.classList.toggle('on', b.dataset.t === t); hint(); renderProps(); }
  function hint() { $('hint').textContent = S.run ? 'The code is running. Tap parts to click them. Press Stop to go back to building.' : Device.useTouch ? 'Drag to look around · two fingers to move and zoom · tap a part to pick it' : 'Drag to look around · right-drag to move · wheel to zoom · WASD to fly · Q/E down and up'; }
  function buildTop() {
    btn('bMods', 'mods', 'My mods').onclick = () => { saveNow(); showMods(); };
    btn('bUndo', 'undo').onclick = doUndo; btn('bRedo', 'redo').onclick = doRedo;
    btn('bLeft', 'panelL').onclick = () => { document.body.classList.toggle('noLeft'); setTimeout(() => game && game.resize(), 30); };
    btn('bRight', 'panelR').onclick = () => { document.body.classList.toggle('noRight'); setTimeout(() => game && game.resize(), 30); };
    const T = $('tools'); for (const [t, n] of [['select', 'Pick'], ['move', 'Move'], ['turn', 'Turn'], ['size', 'Size']]) { const b = el('button', '', ic(t) + '<span>' + n + '</span>'); b.dataset.t = t; b.onclick = () => setTool(t); T.append(b); }
    const sn = btn('bSnap', 'snap', 'Snap'); sn.classList.toggle('on', S.snap); sn.onclick = () => { S.snap = !S.snap; sn.classList.toggle('on', S.snap); };
    const tb = $('bTime'); const showT = () => { tb.innerHTML = ic(TIMES[S.time].icon) + '<span>' + TIMES[S.time].name + '</span>'; }; showT(); tb.onclick = () => { S.time = S.time === 'day' ? 'sunset' : S.time === 'sunset' ? 'night' : 'day'; showT(); };
    btn('bCode', 'code', 'Code').onclick = () => openCode('main');
    btn('bRun', 'play', 'Run').onclick = () => S.run ? stopRun() : startRun();
    btn('bTest', 'test', 'Test').onclick = testInGame;
    const VT = $('viewTools'); const vb = (icon, title, fn) => { const b = el('button', '', ic(icon)); b.title = title; b.onclick = fn; VT.append(b); return b; };
    vb('focus', 'Look at what is picked (F)', focusSel); vb('plus', 'Zoom in', () => { S.cam.dist = clamp(S.cam.dist * 0.75, 2, 900); }); vb('minus', 'Zoom out', () => { S.cam.dist = clamp(S.cam.dist * 1.33, 2, 900); });
    const u = vb('up', 'Fly up (hold)', () => {}), d = vb('down', 'Fly down (hold)', () => {});
    for (const [b, dir] of [[u, 1], [d, -1]]) { b.onpointerdown = () => { hold.dir = dir; }; b.onpointerup = b.onpointerleave = b.onpointercancel = () => { hold.dir = 0; }; }
    for (const b of $('ltabs').children) b.onclick = () => setLTab(b.dataset.t);
    undoBtns(); hint();
  }
  let toastT = 0;
  function toast(t, ms = 2200) { const e = $('toast'); e.textContent = t; e.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.add('hidden'), ms); }
  let bannerT = 0;
  function banner(t) { const e = $('banner'); e.textContent = t; e.classList.remove('hidden'); clearTimeout(bannerT); bannerT = setTimeout(() => e.classList.add('hidden'), 3200); }

  // ---------- running the code in the editor ----------
  function startRun() {
    saveNow(); if (S.codeFor) closeCode();
    const host = {
      myId: () => 'me', player: () => ({ p: [...S.cam.t], v: [0, 0, 0], name: account && account.name || 'You', coins: 0 }), isNight: () => S.time === 'night',
      say: t => toast(t), banner, chat: t => toast(t), win: t => { banner(t); game.fx.burst([...S.cam.t], 60, { cols: ['#ffd23a', '#ff5a8a', '#5ff0e0', '#7be36b'], shape: 22, size: 0.25, speed: 7, life: 1.4 }); },
      sound: n => { Sound.start(); Sound.play(n); }, fx: (p, k) => burst(p, k), shake: () => {}, time: t => { if (TIMES[t]) S.time = t; else if (t === 'sunrise') S.time = 'sunset'; },
    };
    Sound.start();
    S.run = new K.World({ items: itemsNow(), code: S.mod.code }, host, { T: game.T }); S.run.sel = new Set(); game.mods = S.run; S.run.start();
    if (S.run.errors.length) toast('The code has ' + S.run.errors.length + ' problem' + (S.run.errors.length > 1 ? 's' : '') + ': ' + S.run.errors[0].owner + ' line ' + S.run.errors[0].line + ', ' + S.run.errors[0].msg, 4500);
    btn('bRun', 'stop', 'Stop').classList.add('on'); hint();
  }
  function stopRun() { S.run = null; game.mods = S.world; btn('bRun', 'play', 'Run').classList.remove('on'); hint(); $('banner').classList.add('hidden'); }
  function burst(p, k) {
    const F = game.fx, C = { sparkles: ['#fff7c0', '#ffffff', '#ffd23a'], fire: ['#ff7a1a', '#ffd23a', '#ff3a1a'], smoke: ['#8a8f99', '#c3c8d0'], confetti: ['#ffd23a', '#ff5a8a', '#5ff0e0', '#7be36b', '#b07aff'], bubbles: ['#cfeeff', '#ffffff'], stars: ['#fff2a8', '#ffffff'], hearts: ['#ff5a8a', '#ff9ac0'], snow: ['#ffffff', '#e8f4ff'], explode: ['#ffb347', '#ff5a1a', '#cfcfcf', '#ffffff'] };
    const shape = { sparkles: 26, fire: 20, smoke: 0, confetti: 22, bubbles: 5, stars: 26, hearts: 22, snow: 27, explode: 0 }[k] ?? 26;
    F.burst(p, k === 'explode' ? 50 : 26, { cols: C[k] || C.sparkles, shape, size: k === 'explode' ? 0.5 : 0.22, speed: k === 'explode' ? 9 : 4, life: k === 'smoke' ? 2 : 1, up: k === 'fire' || k === 'smoke' || k === 'bubbles' ? 1.6 : 1, drag: 1.5 });
  }
  function testInGame() { saveNow(); const at = S.cam.t.map(v => v.toFixed(1)).join(','); location.href = '../index.html?app=1&modtest=' + encodeURIComponent(S.mod.id) + '&at=' + at; }

  // ---------- code editor ----------
  const ta = $('ta'), hl = $('hl'), gut = $('gut');
  const LOGIC = new Set(['on', 'if', 'unless', 'else', 'end', 'repeat', 'forever', 'while', 'once', 'function', 'call', 'wait', 'stop', 'send', 'var', 'set', 'add', 'sub', 'random']);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function highlight(src) {
    return src.split('\n').map(line => {
      const t = line.trimStart(); if (t.startsWith('--') || t.startsWith('//')) return '<span class="hc">' + esc(line) + '</span>';
      if (!t.startsWith('#')) return esc(line);
      const parts = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') q = !q; if (!q && ch === '=' && !'=<>!'.includes(line[i - 1] || '') && line[i + 1] !== '=') { parts.push(cur, '='); cur = ''; continue; } cur += ch; } parts.push(cur);
      return parts.map((p, i) => { if (p === '=' && i % 2) return '<span class="heq">=</span>'; if (i === 0) { const m = p.match(/^(\s*#)(\s*)([\w.]*)(.*)$/); if (!m) return esc(p); const nm = m[3].toLowerCase(); return esc(m[1] + m[2]) + '<span class="' + (LOGIC.has(nm) ? 'hl' : K.CMDS[nm] ? 'hk' : '') + '">' + esc(m[3]) + '</span>' + esc(m[4]); }
        const w = p.trim().toLowerCase(); let cls = '';
        if (/^#[0-9a-f]{3,6}$/i.test(w) || K.COLORS[w]) cls = 'hv'; else if (/^-?[\d.,\s]+(s|ms|m)?$/.test(w) && /\d/.test(w)) cls = 'hn'; else if (K.PLAYER_WORDS.includes(w) || w === 'self' || w.startsWith('player.')) cls = 'hp'; else if (/[{"]/.test(w)) cls = 'hs'; else if (['then', 'touch', 'click', 'near'].includes(w) || K.EVENTS[w]) cls = 'hl';
        return cls ? '<span class="' + cls + '">' + esc(p) + '</span>' : esc(p); }).join('');
    }).join('\n') + '\n';
  }
  function codeOf(f) { return f === 'main' ? S.mod.code || '' : (get(f) && get(f).d.code) || ''; }
  function openCode(f) {
    if (S.run) stopRun();
    S.codeFor = f; const it = f === 'main' ? null : get(f);
    $('codeTitle').textContent = f === 'main' ? 'Main code of ' + S.mod.name : 'Code of ' + (it.d.name || 'part') + (it.d.k === 'model' ? ' (model)' : '');
    $('code').classList.remove('hidden'); ta.value = codeOf(f) || (f === 'main' ? '-- Main code of the mod. Lines start with #\n-- Example: when a player touches Part1, it goes away\n#if = player = touch = Part1 = then = destroy = Part1\n' : '-- "self" is this ' + (it.d.k === 'model' ? 'model' : 'part') + '\n');
    codeSnap = ta.value; editorSync(); renderCmdList(); renderTree(); setTimeout(() => ta.focus({ preventScroll: true }), 50);
  }
  let codeSnap = '';
  function closeCode() { commitCode(); S.codeFor = null; $('code').classList.add('hidden'); renderTree(); renderProps(); }
  function commitCode() { if (!S.codeFor) return; const v = ta.value; if (v === codeOf(S.codeFor)) return; snapshot(); if (S.codeFor === 'main') S.mod.code = v; else { const it = get(S.codeFor); if (it) it.d.code = v; } saveSoon(); }
  function editorSync() {
    hl.innerHTML = highlight(ta.value); hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft;
    const c = K.compile(ta.value), bad = new Map(c.errs.map(e => [e.line, e.msg])), n = ta.value.split('\n').length;
    gut.innerHTML = Array.from({ length: n }, (_, i) => '<div' + (bad.has(i + 1) ? ' class="bad" title="' + esc(bad.get(i + 1)) + '"' : '') + '>' + (i + 1) + '</div>').join(''); gut.scrollTop = ta.scrollTop;
    const E = $('errs'); E.innerHTML = '';
    if (!c.errs.length) E.append(el('div', 'good', 'No problems. ' + (c.body.length ? 'Press Run to try it here, or Test to play it.' : '')));
    for (const e of c.errs.slice(0, 8)) { const d = el('div', '', ''); d.textContent = 'Line ' + e.line + ': ' + e.msg; d.onclick = () => goLine(e.line); E.append(d); }
    suggest();
  }
  function goLine(n) { const lines = ta.value.split('\n'); let pos = 0; for (let i = 0; i < n - 1; i++) pos += lines[i].length + 1; ta.focus(); ta.setSelectionRange(pos, pos + (lines[n - 1] || '').length); ta.scrollTop = Math.max(0, (n - 3) * 19); }
  ta.addEventListener('input', () => { editorSync(); clearTimeout(ta._t); ta._t = setTimeout(commitCode, 700); });
  ta.addEventListener('scroll', () => { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; });
  ta.addEventListener('keyup', suggest); ta.addEventListener('click', suggest);
  ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Tab') { e.preventDefault(); const sg = $('sugg').firstChild; if (sg && sg.tagName === 'BUTTON') sg.click(); else ins('  '); } });
  function ins(t) { const a = ta.selectionStart, b = ta.selectionEnd; ta.value = ta.value.slice(0, a) + t + ta.value.slice(b); ta.selectionStart = ta.selectionEnd = a + t.length; ta.dispatchEvent(new Event('input')); }
  // what fits where the cursor is
  function suggest() {
    const SG = $('sugg'); SG.innerHTML = ''; const pos = ta.selectionStart, before = ta.value.slice(0, pos), lineStart = before.lastIndexOf('\n') + 1, line = before.slice(lineStart);
    const m = line.match(/^\s*#(.*)$/); let list = [], word = '';
    const names = [...new Set([...S.world.items.values()].filter(i => i.alive && i.d.name).map(i => i.d.name))].slice(0, 60);
    if (!m) { if (!line.trim()) list = ['#on = click', '#if = player = touch = ', '#forever', '#wait = 1s', '#end', '#destroy = self', '#say = ']; }
    else {
      const parts = K.splitLine(m[1]); word = parts[parts.length - 1]; const cmd = K.norm(parts[0]), ix = parts.length - 1, w = word.toLowerCase().trim();
      if (ix === 0) list = Object.keys(K.CMDS).filter(k => k.startsWith(w)).slice(0, 30);
      else {
        let opts = [];
        if (cmd === 'on' && ix === 1) opts = Object.keys(K.EVENTS);
        else if ((cmd === 'if' || cmd === 'unless') && ix === 1) opts = ['player', 'player.main', ...names, 'night'];
        else if ((cmd === 'if' || cmd === 'unless') && ix === 2) opts = ['touch', 'click', 'near'];
        else if ((cmd === 'if' || cmd === 'unless') && ix === 3) opts = [...names, 'then'];
        else if ((cmd === 'if' || cmd === 'unless' || cmd === 'on') && ix >= 3) opts = ['then', ...Object.keys(K.CMDS).filter(k => !LOGIC.has(k) || k === 'send')];
        else if (cmd === 'material') opts = ix === 1 ? ['self', ...names] : Object.keys(K.MATS);
        else if (cmd === 'shape') opts = ix === 1 ? ['self', ...names] : Object.keys(K.SHAPES);
        else if (cmd === 'color') opts = ix === 1 ? ['self', ...names] : ['random', ...Object.keys(K.COLORS)];
        else if (cmd === 'sound') opts = ['coin', 'jump', 'chest', 'quest', 'discover', 'boost', 'boom', 'splash', 'tp', 'click', 'place', 'break', 'wind', 'thunder'];
        else if (cmd === 'particles') opts = ix === 1 ? ['self', ...names] : ['sparkles', 'fire', 'smoke', 'confetti', 'bubbles', 'stars', 'hearts', 'snow'];
        else if (cmd === 'time') opts = ['day', 'sunset', 'night']; else if (cmd === 'weather') opts = ['clear', 'rain', 'storm']; else if (cmd === 'music') opts = ['meadow', 'forest', 'beach', 'desert', 'snow', 'cave', 'station', 'sky', 'volcano', 'night'];
        else if (cmd === 'wait') opts = ['1s', '0.5s', '2s', '5s'];
        else if (K.CMDS[cmd]) { const t = K.CMDS[cmd][0][ix - 1]; opts = t === 'player' ? ['player', 'player.main', 'everyone'] : t === 'target' ? ['self', ...names] : t === 'place' ? ['0,5,0', 'player', ...names] : t === 'time' ? ['1s', '2s'] : []; }
        list = opts.filter(o => o.toLowerCase().startsWith(w) && o.toLowerCase() !== w).slice(0, 30);
      }
    }
    for (const s of list) { const b = el('button', '', ''); b.textContent = s; b.onmousedown = e => e.preventDefault(); b.onclick = () => { const p = ta.selectionStart; const startW = word ? p - word.trimStart().length : p; ta.setSelectionRange(m ? Math.max(lineStart, startW) : p, p); ins((m && word === '' && !/=\s*$/.test(line) && line.trim() !== '#' ? '' : '') + s); ta.focus(); }; SG.append(b); }
    if (m && !list.length) { const cmd = K.norm(K.splitLine(m[1])[0]); if (K.CMDS[cmd]) SG.append(el('span', 'note', '#' + cmd + ': ' + esc(K.CMDS[cmd][1]))); }
  }
  function renderCmdList() {
    const L = $('cmdList'); L.innerHTML = ''; const cats = {};
    L.append(el('p', 'note', 'Tap one to put it in your code.'));
    for (const s of K.suggestions()) (cats[s.cat] = cats[s.cat] || []).push(s);
    for (const c in cats) { L.append(el('h4', '', c)); for (const s of cats[c]) { const d = el('div', 'cmd', '<code></code><span></span>'); d.firstChild.textContent = s.ex; d.lastChild.textContent = s.help; d.onclick = () => { const p = ta.selectionStart, bl = ta.value.lastIndexOf('\n', p - 1) + 1, lineTxt = ta.value.slice(bl, p); ins((lineTxt.trim() ? '\n' : '') + s.ex + '\n'); }; L.append(d); } }
    L.append(el('h4', '', 'Words you can use'));
    for (const [w, h] of [['self', 'the part (or model) this code is in'], ['player', 'the player who touched or clicked'], ['player.main', 'you, the player on this device'], ['everyone', 'every player'], ['{coins}', 'shows a value inside text'], ['part4.y', 'a part\'s height (also .x .z .color .size_x)'], ['player.name', 'the player\'s name (also .x .y .z .coins)'], ['random(1,6)', 'a random number'], ['night', 'true at night'], ['and  or  not', 'join checks: coins > 5 and night']]) { const d = el('div', 'cmd', '<code></code><span></span>'); d.firstChild.textContent = w; d.lastChild.textContent = h; L.append(d); }
  }
  $('codeHelp').onclick = () => $('cside').classList.toggle('hidden');
  $('codeClose').innerHTML = ic('close'); $('codeClose').onclick = closeCode;

  // ---------- my mods ----------
  function showMods() {
    if (S.run) stopRun(); if (S.codeFor) closeCode();
    $('mods').classList.remove('hidden'); $('mNew').classList.toggle('hidden', modsTab !== 'mine'); $('mImport').classList.toggle('hidden', modsTab !== 'mine'); if (modsTab !== 'mine') { $('mClose').classList.toggle('hidden', !S.mod); showGallery(); return; }
    store = K.loadAll(); const L = $('modList'); L.innerHTML = '';
    const list = Object.values(store.mods).sort((a, b) => (b.edited || 0) - (a.edited || 0));
    $('mClose').classList.toggle('hidden', !S.mod);
    if (!list.length) L.append(el('div', 'empty', 'No mods yet. Press New mod to make your first one.'));
    for (const m of list) {
      const c = el('div', 'mcard'), cv = document.createElement('canvas'); cv.width = 500; cv.height = 220;
      const info = el('div', 'mi', '<b></b><span></span>'); info.firstChild.textContent = m.name; info.lastChild.textContent = (m.items || []).filter(i => i.k !== 'model').length + ' parts' + (m.about ? ' · ' + m.about : '');
      const bs = el('div', 'mb'); const b = (t, icon, fn, cls) => { const x = el('button', cls || '', ic(icon) + t); x.onclick = fn; bs.append(x); };
      b('Open', 'box', () => openMod(m.id), 'pri'); b('Test', 'test', () => { openMod(m.id); testInGame(); }); b('Copy', 'copy', () => { const n = JSON.parse(JSON.stringify(m)); n.id = newId('mod'); n.name = (m.name + ' copy').slice(0, 40); n.edited = Date.now(); store.mods[n.id] = n; K.saveAll(store); showMods(); });
      b('Share', 'link', () => shareMod(m)); b('Save file', 'export', () => exportMod(m)); b('Delete', 'trash', () => ask('Delete "' + m.name + '"?', 'This can\'t be undone.', 'Delete', () => { store = K.loadAll(); delete store.mods[m.id]; K.saveAll(store); if (S.mod && S.mod.id === m.id) S.mod = null; showMods(); }), 'danger');
      c.append(cv, info, bs); L.append(c); setTimeout(() => thumb(cv, (m.items || []).filter(i => i.k !== 'model' && !i.store), { yaw: 0.8, pitch: 0.55 }), 20);
    }
  }
  $('mNew').innerHTML = ic('plus') + 'New mod'; $('mImport').innerHTML = ic('import') + 'Open a file'; $('mClose').innerHTML = ic('close') + 'Back';
  $('mNew').onclick = () => promptBox('New mod', 'Give your mod a name', 'My mod', name => { const m = { v: 2, id: newId('mod'), name: name || 'My mod', about: '', by: account && account.name || '', code: '', items: [], at: [0, 6, 7], made: Date.now(), edited: Date.now() }; store = K.loadAll(); store.mods[m.id] = m; K.saveAll(store); openMod(m.id); });
  $('mClose').onclick = () => $('mods').classList.add('hidden');
  for (const t of $('mtabs').children) t.onclick = () => { modsTab = t.dataset.t; for (const x of $('mtabs').children) x.classList.toggle('on', x === t); showMods(); };
  $('mImport').onclick = () => $('fileIn').click();
  $('fileIn').onchange = async () => { const f = $('fileIn').files[0]; if (!f) return; try { const t = await f.text(); const m = t.trim().startsWith('{') ? K.clean(JSON.parse(t)) : await K.unpack(t.trim()); if (!m) throw 0; addImported(m); } catch (e) { toast('That file is not a Nautic Online mod'); } $('fileIn').value = ''; };
  function addImported(m) { m.id = newId('mod'); m.edited = Date.now(); store = K.loadAll(); store.mods[m.id] = m; K.saveAll(store); toast('Added "' + m.name + '"'); showMods(); }
  function exportMod(m) { const blob = new Blob([JSON.stringify(K.clean(m))], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (m.name || 'mod').replace(/[^\w -]+/g, '') + '.nmod'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  async function shareMod(m) {
    const code = await K.pack(m), url = location.origin + location.pathname.replace(/[^/]*$/, '') + '#mod=' + code;
    let ok = false; try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {}
    const box = modal('Share "' + m.name + '"', ''); const i = el('input'); i.type = 'text'; i.value = url; i.readOnly = true; i.onfocus = () => i.select();
    box.body.append(el('p', 'note', ok ? 'The link is copied. Anyone who opens it gets a copy of your mod in their Mod Editor.' : 'Copy this link. Anyone who opens it gets a copy of your mod in their Mod Editor.'), i);
    box.btn('Done', 'pri', () => box.close());
  }
  function openMod(id) {
    store = K.loadAll(); const m = store.mods[id]; if (!m) return;
    if (S.run) stopRun(); S.mod = m; S.mod.code = S.mod.code || ''; S.undo = []; S.redo = []; S.sel = new Set(); S.open = new Set(); undoBtns();
    makeWorld(m.items || []); $('modName').textContent = m.name; $('saveState').textContent = 'Saved';
    const at = Array.isArray(m.at) ? m.at : [0, 6, 7]; S.cam.t = [at[0], Math.max(at[1], ground(at[0], at[2])), at[2]];
    $('mods').classList.add('hidden'); renderTree(); renderProps(); try { localStorage.setItem('modmaker.last', id); } catch (e) {}
  }

  // ---------- the Mod Gallery: mods everyone can get. Requests are let through once a week ----------
  const GALLERY = '/Ultranautic-hub/gallery/';
  let modsTab = 'mine', gallery = null;
  async function showGallery() {
    const L = $('modList'); L.innerHTML = ''; L.append(el('div', 'empty', 'Loading the Mod Gallery…'));
    try { if (!gallery) { const r = await fetch(GALLERY + 'index.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw 0; gallery = await r.json(); } } catch (e) { L.innerHTML = ''; L.append(el('div', 'empty', 'Could not load the Mod Gallery. Check your connection.')); return; }
    if (modsTab !== 'gallery') return; L.innerHTML = '';
    const list = (gallery.mods || []).slice().reverse();
    if (!list.length) L.append(el('div', 'empty', 'The Mod Gallery is empty so far. Mods picked by Outernautica show up here.'));
    for (const g of list) {
      const c = el('div', 'mcard'), cv = document.createElement('canvas'); cv.width = 500; cv.height = 220;
      const info = el('div', 'mi', '<b></b><span></span>'); info.firstChild.textContent = g.name; info.lastChild.textContent = 'by ' + (g.by || 'someone') + ' · ' + (g.parts || 0) + ' parts' + (g.about ? ' · ' + g.about : '');
      const bs = el('div', 'mb'); let data = null;
      const fetchMod = async () => { if (data) return data; const r = await fetch(GALLERY + g.file, { cache: 'no-cache' }); data = K.clean(await r.json()); return data; };
      const getIt = async test => { try { const m = await fetchMod(); m.id = newId('mod'); m.edited = Date.now(); m.from = g.id; store = K.loadAll(); store.mods[m.id] = m; K.saveAll(store); if (test) { openMod(m.id); testInGame(); } else { toast('"' + m.name + '" is now in My mods', 2500); } } catch (e) { toast('Could not get that mod'); } };
      const b1 = el('button', 'pri', ic('import') + 'Get'); b1.onclick = () => getIt(false); const b2 = el('button', '', ic('test') + 'Try it'); b2.onclick = () => getIt(true); bs.append(b1, b2);
      c.append(cv, info, bs); L.append(c);
      fetchMod().then(m => thumb(cv, (m.items || []).filter(i => i.k !== 'model' && !i.store), { yaw: 0.8, pitch: 0.55 })).catch(() => {});
    }
  }

  // ---------- small boxes (no browser pop-ups) ----------
  function modal(title) {
    const m = el('div', 'modal'), d = el('div', 'dlg'), body = el('div'), bt = el('div', 'btns'); d.append(el('h3', '', ''), body, bt); d.firstChild.textContent = title; m.append(d); document.body.append(m);
    m.onpointerdown = e => { if (e.target === m) close(); };
    const close = () => m.remove();
    return { body, close, btn: (t, cls, fn) => { const b = el('button', cls, ''); b.textContent = t; b.onclick = fn; bt.append(b); return b; } };
  }
  function ask(title, text, yes, fn) { const b = modal(title); b.body.append(el('p', 'note', '')); b.body.lastChild.textContent = text; b.btn('Cancel', '', b.close); b.btn(yes, 'pri danger', () => { b.close(); fn(); }); }
  function promptBox(title, text, val, fn) { const b = modal(title), i = el('input'); i.type = 'text'; i.value = val; b.body.append(el('p', 'note', text), i); const go = () => { b.close(); fn(i.value.trim().replace(/[<>]/g, '').slice(0, 40)); }; i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') go(); }; b.btn('Cancel', '', b.close); b.btn('OK', 'pri', go); setTimeout(() => { i.focus(); i.select(); }, 30); }

  // ---------- start ----------
  function boot() {
    buildTop(); renderAdd(); renderActs();
    makeWorld([]);
    if (!startGame()) return;
    requestAnimationFrame(loop);
    addEventListener('resize', () => game && game.resize());
    new ResizeObserver(() => game && game.resize()).observe($('view'));
    // a shared link: #mod=...
    const hm = location.hash.match(/mod=([\w-]+)/);
    if (hm) { K.unpack(hm[1]).then(m => { history.replaceState(null, '', location.pathname + location.search); if (m) { m.id = newId('mod'); m.edited = Date.now(); store = K.loadAll(); store.mods[m.id] = m; K.saveAll(store); openMod(m.id); toast('You got a copy of "' + m.name + '"', 3500); } else showMods(); }); return; }
    const q = new URLSearchParams(location.search), want = q.get('open') || (() => { try { return localStorage.getItem('modmaker.last'); } catch (e) { return null; } })();
    store = K.loadAll();
    if (want && store.mods[want]) openMod(want); else showMods();
  }
  // Game sizes its canvases from the window; the editor's view is smaller, so size them from the view box
  const origResize = Game.prototype.resize;
  Game.prototype.resize = function () {
    if (!this.editor) return origResize.call(this);
    const v = $('view'), dpr = Math.min(devicePixelRatio || 1, 2), gdpr = Math.min(dpr, this.maxDpr || 1.5) * (this.scale || 1);
    this.dpr = dpr; this.w = v.clientWidth || innerWidth; this.h = v.clientHeight || innerHeight;
    this.canvas.width = Math.round(this.w * gdpr); this.canvas.height = Math.round(this.h * gdpr); this.ov.width = Math.round(this.w * dpr); this.ov.height = Math.round(this.h * dpr);
    this.gfx.setSize(this.canvas.width, this.canvas.height); this.safeTop = 0; this.safeRight = 0;
  };
  window.addEventListener('beforeunload', () => { if (S.mod) saveNow(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mod) saveNow(); });
  if (new URLSearchParams(location.search).has('debug')) window.__mm = { S, get game() { return game; }, K };
  boot();
})();
