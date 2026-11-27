// The big map of the Berekor region: the whole world as one picture (baked by tools/bake-map.js),
// with you, other players, places you've found, the names of the islands and lands, and a waypoint.
// Tap an island to see its own map. Drag to move, pinch or scroll to zoom.
const BigMap = (() => {
  const $ = id => document.getElementById(id);
  let data = null, img = null, mask = null, loading = null, isOpen = false, host = null, loadedFor = null;
  let view = { cx: 0, cz: 0, k: 0.05 }, isle = -1, placing = false, raf = 0, shade = new Map();
  const ptrs = new Map(); let pinch = null, tapStart = null;

  const regionNow = () => (host && host.region && host.region()) || 'berekor';
  function load() {
    const want = regionNow();
    if (loading && loadedFor === want) return loading;
    loadedFor = want; data = null; img = null; shade.clear(); isle = -1;
    const v = window.FUNZ_VERSION || '1', file = want === 'berekor' ? 'world' : want;
    loading = Promise.all([
      fetch('map/' + file + '.json?v=' + v).then(r => r.json()),
      new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = 'map/' + file + '.jpg?v=' + v; }),
    ]).then(([d, im]) => {
      if (loadedFor !== want) return;
      data = d; img = im;
      const raw = atob(d.mask); mask = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) mask[i] = raw.charCodeAt(i);
    }).catch(e => { loading = null; throw e; });
    return loading;
  }
  // which island is at a spot (-1 = sea)
  function isleAt(x, z) {
    if (!data) return -1; const L = data.grid, i = Math.floor((x + data.span / 2) / data.span * L), j = Math.floor((z + data.span / 2) / data.span * L);
    if (i < 0 || j < 0 || i >= L || j >= L) return -1; return mask[j * L + i] - 1;
  }
  // a dark cover over everything except one island (made once per island)
  function shadeFor(k) {
    if (shade.has(k)) return shade.get(k);
    const L = data.grid, c = document.createElement('canvas'); c.width = c.height = L; const g = c.getContext('2d'), im = g.createImageData(L, L);
    for (let i = 0; i < L * L; i++) { const on = mask[i] - 1 === k; im.data[i * 4] = 6; im.data[i * 4 + 1] = 10; im.data[i * 4 + 2] = 24; im.data[i * 4 + 3] = on ? 0 : 165; }
    g.putImageData(im, 0, 0); shade.set(k, c); return c;
  }

  function build() {
    if ($('mapScreen')) return;
    const el = document.createElement('div'); el.id = 'mapScreen'; el.className = 'hidden';
    el.innerHTML = `<div class="mapBox">
      <div class="mapHead"><button id="mapBack" class="mBtn hidden"></button><b id="mapTitle"></b>
        <button id="mapWay" class="mBtn"></button><button id="mapGo" class="mBtn hidden"></button><button id="mapMe" class="mBtn"></button><button id="mapOut" class="mBtn"></button><button id="mapIn" class="mBtn"></button><button id="mapClose" class="mBtn"></button></div>
      <div class="mapWrap"><canvas id="mapCv"></canvas><div id="mapMsg"></div></div>
      <div id="mapInfo"></div></div>`;
    document.body.appendChild(el);
    $('mapWay').innerHTML = icon('go', 16) + ' Waypoint';
    $('mapMe').innerHTML = icon('spawn', 16) + ' Me'; $('mapOut').textContent = '−'; $('mapIn').textContent = '+'; $('mapClose').innerHTML = icon('close', 18);
    $('mapBack').innerHTML = '<span class="flip">' + icon('bring', 16) + '</span> Whole map';
    $('mapGo').innerHTML = icon('bring', 16) + ' Go there'; $('mapGo').onclick = () => { const g = host.game(); if (g && g.waypoint && host.teleport(g.waypoint.x, g.waypoint.z)) close(); };
    $('mapClose').onclick = close; $('mapBack').onclick = () => showWorld(true);
    $('mapIn').onclick = () => zoomAt(1.6); $('mapOut').onclick = () => zoomAt(1 / 1.6);
    $('mapMe').onclick = () => { const me = host.me(); if (me) { view.cx = me.x; view.cz = me.z; view.k = Math.max(view.k, 0.12); clampView(); } };
    $('mapWay').onclick = () => {
      const g = host.game(); if (g && g.waypoint && !placing) { g.waypoint = null; updateWayBtn(); info(); return; }
      placing = !placing; updateWayBtn(); info();
    };
    const cv = $('mapCv');
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 1) tapStart = [e.clientX, e.clientY, 0]; else { tapStart = null; pinch = pinchState(); } });
    cv.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      if (ptrs.size === 1) { const dx = e.clientX - p[0], dy = e.clientY - p[1]; view.cx -= dx / view.k; view.cz -= dy / view.k; if (tapStart) tapStart[2] += Math.abs(dx) + Math.abs(dy); }
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2 && pinch) { const n = pinchState(), r = cv.getBoundingClientRect(); const before = toWorld(pinch.mx - r.left, pinch.my - r.top); view.k = clampK(view.k * n.d / pinch.d); const after = toWorld(n.mx - r.left, n.my - r.top); view.cx += before[0] - after[0]; view.cz += before[1] - after[1]; pinch = n; }
      clampView();
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (tapStart && ptrs.size === 0 && tapStart[2] < 10) { const r = cv.getBoundingClientRect(); tap(e.clientX - r.left, e.clientY - r.top); }
      if (ptrs.size === 0) tapStart = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    addEventListener('keydown', e => { if (isOpen && (e.key === 'Escape' || e.key.toLowerCase() === 'g')) { e.stopImmediatePropagation(); close(); } }, true);
    addEventListener('resize', () => { if (isOpen) fit(); });
  }
  function pinchState() { const [a, b] = [...ptrs.values()]; return { d: Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }; }
  function size() { const cv = $('mapCv'), r = cv.parentNode.getBoundingClientRect(); return [r.width, r.height]; }
  function toWorld(px, py) { const [w, h] = size(); return [view.cx + (px - w / 2) / view.k, view.cz + (py - h / 2) / view.k]; }
  function toScreen(x, z) { const [w, h] = size(); return [w / 2 + (x - view.cx) * view.k, h / 2 + (z - view.cz) * view.k]; }
  function minK() { const [w, h] = size(); return Math.min(w, h) / (data ? data.span : 16000) * 0.98; }
  function clampK(k) { return Math.max(minK(), Math.min(1.6, k)); }
  function clampView() { view.k = clampK(view.k); const half = (data ? data.span : 16000) / 2; view.cx = Math.max(-half, Math.min(half, view.cx)); view.cz = Math.max(-half, Math.min(half, view.cz)); }
  function zoomAt(f, px, py) { const [w, h] = size(); if (px === undefined) { px = w / 2; py = h / 2; } const before = toWorld(px, py); view.k = clampK(view.k * f); const after = toWorld(px, py); view.cx += before[0] - after[0]; view.cz += before[1] - after[1]; clampView(); }
  function fit() { if (isle >= 0) showIsle(isle); else { view.k = minK(); clampView(); } }

  function tap(px, py) {
    const [x, z] = toWorld(px, py);
    if (placing) {
      const g = host.game(); if (g) { g.waypoint = { x, z }; host.toast('Waypoint set. Follow the yellow marker on your compass!'); }
      placing = false; updateWayBtn(); info(); return;
    }
    if (isle < 0) { const k = isleAt(x, z); if (k >= 0) showIsle(k); }
  }
  const regionName = () => (REGIONS[regionNow()] || {}).name || 'Berekor';
  function showWorld() { isle = -1; $('mapBack').classList.add('hidden'); $('mapTitle').textContent = regionNow() === 'berekor' ? 'Berekor region' : regionName(); view.cx = 0; view.cz = 0; view.k = minK(); clampView(); info(); }
  function showIsle(k) {
    const it = data.isles[k]; isle = k; const [w, h] = size(), pad = 1.12;
    view.cx = (it.x0 + it.x1) / 2; view.cz = (it.z0 + it.z1) / 2; view.k = clampK(Math.min(w / ((it.x1 - it.x0) * pad), h / ((it.z1 - it.z0) * pad)));
    $('mapBack').classList.remove('hidden'); $('mapTitle').textContent = it.name; info();
  }
  function updateWayBtn() { const g = host && host.game(); $('mapGo').classList.toggle('hidden', !(g && g.waypoint) || placing); $('mapWay').classList.toggle('on', placing); $('mapWay').innerHTML = icon('go', 16) + (placing ? ' Tap the map' : g && g.waypoint ? ' Clear waypoint' : ' Waypoint'); }
  function info() {
    const el = $('mapInfo'); if (!data) { el.textContent = ''; return; }
    if (placing) { el.textContent = 'Tap anywhere on the map to put your waypoint there.'; return; }
    if (isle >= 0) { const it = data.isles[isle], names = it.lands.map(b => ({ 1: 'beaches', 2: 'grassland', 3: 'forest', 4: 'desert', 5: 'snow', 6: 'mountains', 7: 'swamp', 8: 'glow fields', 11: 'the volcano', 12: 'red mesas', 13: 'dust flats', 14: 'oases', 16: 'autumn woods', 17: 'elder forest', 18: 'frostglow', 19: 'salt flats', 20: 'hoodoo badlands' }[b])).filter(Boolean); const IS = regionNow() === 'berekor' ? (typeof BEREKOR_ISLES !== 'undefined' ? BEREKOR_ISLES : null) : regionNow() === 'dustmaw' && typeof DUST_ISLES !== 'undefined' ? DUST_ISLES : null, mk = IS ? IS.marks.find(m => m.isle === isle) : null, th = IS ? THEME_TXT[IS.themes[isle]] : '';
      el.textContent = it.name + ': ' + (th || names.join(', ')) + (mk ? '. Landmark: ' + STRUCT_TYPES[mk.type] : '') + '.'; return; }
    el.textContent = data.isles.filter(q => !q.gone).length + ' islands in ' + regionName() + '. Tap an island to see its map.';
  }

  // ---------- drawing ----------
  const THEME_TXT = { snow: 'a snowy island', frost: 'ice spikes and glowing crystals', elder: 'a forest of giant old trees', autumn: 'orange and red autumn woods', peaks: 'tall rocky mountains', desert: 'dunes and hot sand', swamp: 'a misty swamp', meadow: 'flower meadows', glow: 'glowing mushroom fields', mesa: 'huge stepped red mesas', dunes: 'a sea of tall dunes', hoodoo: 'striped rock spires and badlands', oasis: 'palm groves and ponds', salt: 'white salt flats' };
  const BIOME_COL = { 16: '#ffe0b0', 17: '#d8ffd0', 18: '#e8e8ff', 19: '#ffffff', 20: '#ffe0c8', 12: '#ffd8c0', 13: '#fff0d8', 14: '#e0ffd0', 3: '#e8ffe0', 4: '#fff2d0', 5: '#ffffff', 6: '#eef0f4', 7: '#e0f0c8', 8: '#f0e4ff', 11: '#ffd0b0', 2: '#f0ffe0' };
  function frame() {
    raf = isOpen ? requestAnimationFrame(frame) : 0; if (!isOpen) return;
    const cv = $('mapCv'), [w, h] = size(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#132f5c'; g.fillRect(0, 0, w, h);
    if (!data) { $('mapMsg').textContent = 'Drawing the map…'; return; }
    $('mapMsg').textContent = '';
    const half = data.span / 2, [ax, az] = toScreen(-half, -half), s = data.span * view.k;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, ax, az, s, s);
    if (isle >= 0) { g.imageSmoothingEnabled = true; g.drawImage(shadeFor(isle), ax, az, s, s); }
    // a thin frame around the edge of the world
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.strokeRect(ax, az, s, s);
    const inView = (x, z, m = 40) => { const [px, py] = toScreen(x, z); return px > -m && py > -m && px < w + m && py < h + m; };
    const text = (t, x, y, font, fill, stroke = 'rgba(10,16,34,.85)', lw = 3) => { g.font = font; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(t, x, y); g.fillStyle = fill; g.fillText(t, x, y); };
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // markers first, then names: the most important names are placed first and others skip spots that are taken
    const labels = [], lab = (t, x, y, font, fill, pri, stroke, lw) => labels.push({ t, x, y, font, fill, pri, stroke, lw });
    const zoomed = view.k > minK() * 2.2 || isle >= 0;
    if (zoomed) for (const lb of data.labels) {
      if (isle >= 0 && lb.isle !== isle) continue; if (!inView(lb.x, lb.z)) continue;
      if (lb.b === 2 && view.k < minK() * 4) continue;
      const [px, py] = toScreen(lb.x, lb.z); lab(lb.name, px, py, 'italic 600 12px Georgia, serif', BIOME_COL[lb.b] || '#fff', 1 + lb.size / 1e5, 'rgba(10,16,34,.7)', 3);
    }
    data.isles.forEach((it, k) => {
      if (it.gone || (isle >= 0 && k !== isle)) return; if (!inView(it.lx, it.lz, 200)) return;
      if (isle < 0 && it.size < 300 && view.k < minK() * 1.8) return;
      const [px, py] = toScreen(it.lx, it.lz), big = k === 0 ? 19 : it.size > 1000 ? 16 : 13;
      lab(it.name.toUpperCase(), px, py, '700 ' + big + 'px Georgia, serif', '#fff4dc', 5 + it.size / 1e4, 'rgba(20,14,6,.8)', 4);
    });
    // places: always-known ones, the volcano, and the structures you've discovered
    const gm = host.game(), me = host.me();
    if (gm) {
      const known = gm.known || new Set(), list = [];
      for (const q of gm.places(0, 0, 0)) if (q.always) list.push(q);
      const MK = gm.region === 'dustmaw' ? (typeof DUST_ISLES !== 'undefined' ? DUST_ISLES.marks : []) : !gm.region && typeof BEREKOR_ISLES !== 'undefined' && VOLCANO.on ? BEREKOR_ISLES.marks : [];
      for (const m of MK) list.push({ x: m.x, z: m.z, name: STRUCT_TYPES[m.type], col: '#fff4dc', mark: true });
      for (const key of known) { if (!key.startsWith('s:')) continue; const [rx, rz] = key.slice(2).split(',').map(Number); const p = gm.St.plan(rx, rz); if (p) list.push({ x: p.x, z: p.z, name: STRUCT_TYPES[p.type], col: p.type === 'cave' ? '#b8a8ff' : '#ffffff', found: true }); }
      if (!gm.region) list.push({ x: 0, z: 0, name: 'Plaza', col: '#ffc45a', big: true }, { x: STATION.x, z: STATION.z, name: 'Station', col: '#5ff0e0', big: true });
      for (const q of list) if (q.always && gm.region) q.big = true;
      for (const q of list) {
        if (isle >= 0 && isleAt(q.x, q.z) !== isle) continue; if (!inView(q.x, q.z)) continue;
        const [px, py] = toScreen(q.x, q.z), r = q.big || q.kind === 'volcano' ? 5.5 : 4;
        g.fillStyle = q.col; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); g.stroke();
        lab(q.name, px, py + r + 9, '700 11px system-ui', q.col, q.kind === 'volcano' ? 9 : q.big ? 8 : 3);
      }
      // the waypoint: a yellow pin
      if (gm.waypoint) { const [px, py] = toScreen(gm.waypoint.x, gm.waypoint.z); g.fillStyle = '#ffe14a'; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 6, py - 12); g.arc(px, py - 15, 7, Math.PI * 0.8, Math.PI * 2.2); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#0a1124'; g.beginPath(); g.arc(px, py - 15, 2.5, 0, 7); g.fill(); }
      // other players
      for (const p of gm.lastPlayers || []) { if (!p || !p.p || p === gm.lastMe) continue; const [px, py] = toScreen(p.p[0], p.p[2]); if (px < -20 || py < -20 || px > w + 20 || py > h + 20) continue; g.fillStyle = p.color || '#fff'; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, 4.5, 0, 7); g.fill(); g.stroke(); if (p.name) lab(p.name, px, py - 11, '700 11px system-ui', '#fff', 7); }
    }
    // you: an arrow pointing the way the camera looks
    if (me) {
      const [px, py] = toScreen(me.x, me.z), a = Math.atan2(me.fz, me.fx) + Math.PI / 2;
      g.save(); g.translate(px, py); g.rotate(a);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(0, 0, 15, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.strokeStyle = '#0a1124'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 7); g.lineTo(0, 3); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke();
      g.restore();
      lab('You', px, py + 22, '700 11px system-ui', '#fff', 20);
    }
    labels.sort((a, b) => b.pri - a.pri); const taken = [];
    for (const L of labels) {
      g.font = L.font; const tw = g.measureText(L.t).width + 4, th = parseInt(L.font.match(/(\d+)px/)[1]) + 2, r = [L.x - tw / 2, L.y - th / 2, L.x + tw / 2, L.y + th / 2];
      if (taken.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue;
      taken.push(r); text(L.t, L.x, L.y, L.font, L.fill, L.stroke || 'rgba(10,16,34,.85)', L.lw || 3);
    }
    // scale bar
    const steps = [50, 100, 250, 500, 1000, 2000, 5000]; let m = steps[0]; for (const st of steps) if (st * view.k < 120) m = st;
    const bx = 12, by = h - 16; g.fillStyle = 'rgba(10,16,34,.75)'; g.fillRect(bx - 6, by - 16, m * view.k + 12, 24);
    g.fillStyle = '#fff'; g.fillRect(bx, by, m * view.k, 3); g.fillRect(bx, by - 4, 2, 7); g.fillRect(bx + m * view.k - 2, by - 4, 2, 7);
    g.textAlign = 'left'; g.font = '700 10px system-ui'; g.fillText(m >= 1000 ? m / 1000 + ' km' : m + ' m', bx, by - 9);
  }

  function open() {
    build(); if (isOpen) return; isOpen = true; $('mapScreen').classList.remove('hidden'); placing = false; updateWayBtn();
    const ready = () => { const me = host.me(); showWorld(); if (me) { const k = isleAt(me.x, me.z); if (k >= 0) showIsle(k); } };
    if (loadedFor !== regionNow()) data = null;
    if (data) ready(); else { info(); load().then(() => { if (isOpen) ready(); }).catch(() => { $('mapMsg').textContent = 'Could not load the map. Check your connection and try again.'; }); }
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() { if (!isOpen) return; isOpen = false; placing = false; $('mapScreen').classList.add('hidden'); ptrs.clear(); }
  return { init(h) { host = h; build(); }, open, close, toggle() { isOpen ? close() : open(); }, get isOpen() { return isOpen; }, preload: () => load().catch(() => {}) };
})();
