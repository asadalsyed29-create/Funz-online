// The big map of the Berekor region: the whole world as one picture (baked by tools/bake-map.js),
// with you, other players, places you've found, the names of the islands and lands, and a waypoint.
// Tap an island to see its own map. Drag to move, pinch or scroll to zoom.
const BigMap = (() => {
  const $ = id => document.getElementById(id);
  let data = null, img = null, dimg = null, viewR = null, mask = null, loading = null, isOpen = false, host = null, loadedFor = null;
  let view = { cx: 0, cz: 0, k: 0.05 }, isle = -1, placing = false, raf = 0, shade = new Map();
  const ptrs = new Map(); let pinch = null, tapStart = null;
  let mode = 'region', farWay = null; // mode: 'region' or 'planets'; farWay = a waypoint put in a region you're not in yet
  const BUILT = () => Object.keys(REGIONS).filter(k => REGIONS[k].built);
  const TAGS = { berekor: 'Where every journey starts', dustmaw: 'Hot sand, old bones and one very big cactus' };
  const tagOf = id => TAGS[id] || (regionTheme(id) || {}).tag || '';

  const regionNow = () => (host && host.region && host.region()) || 'berekor';
  const viewing = () => viewR || regionNow(), here = () => viewing() === regionNow();
  // the waypoint shown on this map: the game's one where you are, or one waiting in another region
  const getWay = () => { if (here()) { const g = host.game(); return g && g.waypoint; } return farWay && farWay.region === viewing() ? farWay : null; };
  const setWay = w => { if (here()) { const g = host.game(); if (g) g.waypoint = w; farWay = null; } else farWay = w ? { region: viewing(), x: w.x, z: w.z } : null; };
  function load() {
    const want = viewing();
    if (loading && loadedFor === want) return loading;
    loadedFor = want; data = null; img = null; dimg = null; shade.clear(); isle = -1;
    const v = window.FUNZ_VERSION || '1', file = want === 'berekor' ? 'world' : want;
    loading = Promise.all([
      fetch('map/' + file + '.json?v=' + v).then(r => r.json()),
      new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = 'map/' + file + '.jpg?v=' + v; }),
      new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = 'map/' + file + '-d.png?v=' + v; }),
    ]).then(([d, im, dm]) => {
      if (loadedFor !== want) return;
      data = d; img = im; dimg = dm;
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
        <button id="mapWay" class="mBtn"></button><button id="mapGo" class="mBtn hidden"></button><button id="mapTravel" class="mBtn hidden"></button><button id="mapPlanets" class="mBtn"></button><button id="mapMe" class="mBtn"></button><button id="mapOut" class="mBtn"></button><button id="mapIn" class="mBtn"></button><button id="mapClose" class="mBtn"></button></div>
      <div class="mapWrap"><canvas id="mapCv"></canvas><div id="mapMsg"></div><button id="mapPrev" class="mArrow">‹</button><button id="mapNext" class="mArrow">›</button></div>
      <div id="mapInfo"></div></div>`;
    document.body.appendChild(el);
    $('mapWay').innerHTML = icon('go', 16) + ' Waypoint';
    $('mapMe').innerHTML = icon('spawn', 16) + ' Me'; $('mapOut').textContent = '−'; $('mapIn').textContent = '+'; $('mapClose').innerHTML = icon('close', 18);
    $('mapBack').innerHTML = '<span class="flip">' + icon('bring', 16) + '</span> Whole map';
    $('mapGo').innerHTML = icon('bring', 16) + ' Go there';
    $('mapGo').onclick = () => { const w = getWay(); if (!w) return; if (here()) { if (host.teleport(w.x, w.z)) close(); } else if (host.travel(viewing(), w)) { farWay = null; close(); } };
    $('mapTravel').innerHTML = icon('planet', 16) + ' Travel here'; $('mapTravel').onclick = () => { if (host.travel(viewing(), null)) close(); };
    $('mapPlanets').innerHTML = icon('planet', 16) + ' Planets'; $('mapPlanets').onclick = () => { mode === 'planets' ? showRegion(viewing()) : showPlanets(); };
    const flip = d => { const L = BUILT(), i = L.indexOf(viewing()); showRegion(L[(i + d + L.length) % L.length]); };
    for (const [id, d] of [['mapPrev', -1], ['mapNext', 1]]) $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); flip(d); });
    $('mapClose').onclick = close; $('mapBack').onclick = () => showWorld(true);
    $('mapIn').onclick = () => zoomAt(1.6); $('mapOut').onclick = () => zoomAt(1 / 1.6);
    $('mapMe').onclick = () => { const me = host.me(); if (!here()) { viewR = null; data = null; load().then(() => { if (isOpen) { showWorld(); $('mapMe').click(); } }); return; } if (me) { view.cx = me.x; view.cz = me.z; view.k = Math.max(view.k, 0.12); clampView(); } };
    $('mapWay').onclick = () => {
      if (getWay() && !placing) { setWay(null); updateWayBtn(); info(); return; }
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
    if (mode === 'planets') { tapPlanet(px, py); return; }
    const [x, z] = toWorld(px, py);
    if (placing) {
      setWay({ x, z }); host.toast(here() ? 'Waypoint set. Follow the yellow marker on your compass!' : 'Waypoint set in ' + regionName() + '. Tap Go there to travel straight to it.');
      placing = false; updateWayBtn(); info(); return;
    }
    if (isle < 0) { const k = isleAt(x, z); if (k >= 0) showIsle(k); }
  }
  // ---------- the planets map ----------
  const PLANET_LOOK = { Nautara: ['#3f8fd8', '#6cc06a', '#1d4a8a'], Kelar: ['#2fb8c4', '#f0dca0', '#13607a'], Vyrnox: ['#d8582a', '#3a2a28', '#6a1e10'], Oskarr: ['#d8e8f8', '#9cc0e8', '#5a7aa8'], Artex: ['#8a8e98', '#f0c040', '#3a3e48'] };
  let planetHits = [];
  function planetList() { const out = []; for (const [id, r] of Object.entries(REGIONS)) { let p = out.find(q => q.name === r.planet); if (!p) out.push(p = { name: r.planet, regions: [] }); p.regions.push({ id, ...r }); } return out; }
  function showPlanets() { mode = 'planets'; placing = false; isle = -1; $('mapTitle').textContent = 'Planets'; $('mapBack').classList.add('hidden'); updateWayBtn(); info(); }
  function showRegion(id) {
    mode = 'region'; viewR = id === regionNow() ? null : id; placing = false; updateWayBtn(); if (loadedFor !== viewing()) data = null; info();
    load().then(() => { if (isOpen && mode === 'region') showWorld(); }).catch(() => { $('mapMsg').textContent = 'Could not load the map. Check your connection and try again.'; });
  }
  function tapPlanet(px, py) {
    const hit = planetHits.find(q => Math.hypot(px - q.x, py - q.y) < q.r + 14); if (!hit) return;
    const built = hit.p.regions.filter(r => r.built);
    if (!built.length) { host.toast('Planet ' + hit.p.name + ' is not built yet.'); return; }
    showRegion(built.some(r => r.id === regionNow()) ? regionNow() : built[0].id);
  }
  function drawPlanets(g, w, h) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0b1330'); sky.addColorStop(1, '#1a1440'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * w, y = (Math.sin(i * 37.3 + 2) * 0.5 + 0.5) * h, r = (i % 7 === 0) ? 1.4 : 0.8; g.fillStyle = 'rgba(255,255,240,' + (0.35 + (i % 5) * 0.12) + ')'; g.fillRect(x, y, r, r); }
    const ps = planetList(), n = ps.length, cur = (REGIONS[regionNow()] || {}).planet || 'Nautara', R = Math.max(18, Math.min(w / (n * 3.4), h * 0.17)); planetHits = [];
    g.strokeStyle = 'rgba(244,234,210,.25)'; g.lineWidth = 1.5; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(w * 0.08, h * 0.42); g.lineTo(w * 0.92, h * 0.42); g.stroke(); g.setLineDash([]);
    ps.forEach((p, k) => {
      const x = w * (0.12 + 0.76 * (n > 1 ? k / (n - 1) : 0.5)), y = h * 0.42 + (k % 2 ? -h * 0.06 : h * 0.04), L = PLANET_LOOK[p.name] || ['#888', '#aaa', '#444'], built = p.regions.some(r => r.built);
      planetHits.push({ x, y, r: R, p });
      if (p.name === cur) { g.strokeStyle = '#ffe14a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R + 7, 0, 7); g.stroke(); }
      g.save(); g.beginPath(); g.arc(x, y, R, 0, 7); g.clip();
      g.fillStyle = L[0]; g.fillRect(x - R, y - R, R * 2, R * 2);
      for (let b = 0; b < 5; b++) { g.fillStyle = L[1]; g.beginPath(); g.ellipse(x + Math.sin(k * 3 + b * 2.1) * R * 0.55, y + Math.cos(k * 5 + b * 1.7) * R * 0.5, R * (0.18 + (b % 3) * 0.08), R * (0.12 + (b % 2) * 0.08), b, 0, 7); g.fill(); }
      const sh = g.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.1, x, y, R * 1.1); sh.addColorStop(0, 'rgba(255,255,255,.25)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,.55)'); g.fillStyle = sh; g.fillRect(x - R, y - R, R * 2, R * 2);
      if (!built) { g.fillStyle = 'rgba(10,14,30,.45)'; g.fillRect(x - R, y - R, R * 2, R * 2); }
      g.restore(); g.strokeStyle = '#2a2e38'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const tx = (t, yy, font, fill) => { g.font = font; g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.9)'; g.strokeText(t, x, yy); g.fillStyle = fill; g.fillText(t, x, yy); };
      tx(p.name, y + R + 16, '700 16px Georgia, serif', '#fff4dc');
      let yy = y + R + 33; for (const r of p.regions) { tx(r.name, yy, (r.built ? '600 ' : 'italic 500 ') + '11px Georgia, serif', r.id === regionNow() ? '#ffe14a' : r.built ? '#e8f0ff' : 'rgba(220,220,230,.5)'); yy += 14; }
      if (p.name === cur) tx('You are here', y - R - 16, '700 12px system-ui', '#ffe14a');
      else if (!built) tx('Not built yet', y - R - 14, 'italic 600 11px system-ui', 'rgba(220,220,230,.7)');
    });
  }
  const regionName = () => (REGIONS[viewing()] || {}).name || 'Berekor';
  function showWorld() { isle = -1; $('mapBack').classList.add('hidden'); $('mapTitle').textContent = (viewing() === 'berekor' ? 'Berekor region' : regionName()) + ', planet ' + ((REGIONS[viewing()] || {}).planet || 'Nautara'); view.cx = 0; view.cz = 0; view.k = minK(); clampView(); info(); }
  function showIsle(k) {
    const it = data.isles[k]; isle = k; const [w, h] = size(), pad = 1.12;
    view.cx = (it.x0 + it.x1) / 2; view.cz = (it.z0 + it.z1) / 2; view.k = clampK(Math.min(w / ((it.x1 - it.x0) * pad), h / ((it.z1 - it.z0) * pad)));
    $('mapBack').classList.remove('hidden'); $('mapTitle').textContent = it.name; info();
  }
  function updateWayBtn() {
    const w = host && getWay(), pl = mode === 'planets';
    $('mapGo').classList.toggle('hidden', !w || placing || pl); $('mapTravel').classList.toggle('hidden', here() || pl || !!w);
    $('mapWay').classList.toggle('hidden', pl); $('mapMe').classList.toggle('hidden', pl); $('mapIn').classList.toggle('hidden', pl); $('mapOut').classList.toggle('hidden', pl);
    $('mapPrev').classList.toggle('hidden', pl); $('mapNext').classList.toggle('hidden', pl);
    $('mapPlanets').innerHTML = icon('planet', 16) + (pl ? ' Back to map' : ' Planets');
    $('mapWay').classList.toggle('on', placing); $('mapWay').innerHTML = icon('go', 16) + (placing ? ' Tap the map' : w ? ' Clear waypoint' : ' Waypoint');
  }
  function info() {
    const el = $('mapInfo');
    if (mode === 'planets') { el.textContent = 'Tap a planet to see its map. From there you can travel to any region that is built.'; return; }
    if (!data) { el.textContent = ''; return; }
    if (placing) { el.textContent = 'Tap anywhere on the map to put your waypoint there.'; return; }
    if (isle >= 0) { const it = data.isles[isle], names = it.lands.map(b => ({ 1: 'beaches', 2: 'grassland', 3: 'forest', 4: 'desert', 5: 'snow', 6: 'mountains', 7: 'swamp', 8: 'glow fields', 11: 'the volcano', 12: 'red mesas', 13: 'dust flats', 14: 'oases', 16: 'autumn woods', 17: 'elder forest', 18: 'frostglow', 19: 'salt flats', 20: 'hoodoo badlands' }[b] || (b >= 21 && BIOMES[b] ? BIOMES[b].name.toLowerCase() : null))).filter(Boolean); const IS = viewing() === 'berekor' ? (typeof BEREKOR_ISLES !== 'undefined' ? BEREKOR_ISLES : null) : viewing() === 'dustmaw' && typeof DUST_ISLES !== 'undefined' ? DUST_ISLES : null, mk = IS ? IS.marks.find(m => m.isle === isle) : null, th = IS ? THEME_TXT[IS.themes[isle]] : '';
      el.textContent = it.name + ': ' + (th || names.join(', ')) + (mk ? '. Landmark: ' + STRUCT_TYPES[mk.type] : '') + '.'; return; }
    el.textContent = data.isles.filter(q => !q.gone).length + ' islands in ' + regionName() + '. Tap an island to see its map.' + (here() ? '' : ' Tap Travel here to go, or put a waypoint and tap Go there.');
  }

  // ---------- drawing ----------
  const THEME_TXT = { snow: 'a snowy island', frost: 'ice spikes and glowing crystals', elder: 'a forest of giant old trees', autumn: 'orange and red autumn woods', peaks: 'tall rocky mountains', desert: 'dunes and hot sand', swamp: 'a misty swamp', meadow: 'flower meadows', glow: 'glowing mushroom fields', mesa: 'huge stepped red mesas', dunes: 'a sea of tall dunes', hoodoo: 'striped rock spires and badlands', oasis: 'palm groves and ponds', salt: 'white salt flats' };
  const BIOME_COL = { 16: '#ffe0b0', 17: '#d8ffd0', 18: '#e8e8ff', 19: '#ffffff', 20: '#ffe0c8', 12: '#ffd8c0', 13: '#fff0d8', 14: '#e0ffd0', 3: '#e8ffe0', 4: '#fff2d0', 5: '#ffffff', 6: '#eef0f4', 7: '#e0f0c8', 8: '#f0e4ff', 11: '#ffd0b0', 2: '#f0ffe0' };
  // little drawn pictures for landmarks (cream with dark ink), with a flag: green = found, grey = not found yet
  const INK = '#2a2e38', CREAM = '#f4ead2';
  const PICS = {
    tower: g => { g.rect(-4, -12, 8, 14); g.rect(-5, -14, 2, 3); g.rect(-1, -14, 2, 3); g.rect(3, -14, 2, 3); },
    ruins: g => { g.rect(-8, -6, 4, 8); g.rect(-3, -10, 5, 12); g.rect(3, -4, 5, 6); },
    lighthouse: g => { g.moveTo(-4, 2); g.lineTo(-2, -12); g.lineTo(2, -12); g.lineTo(4, 2); g.closePath(); },
    pyramid: g => { g.moveTo(-10, 2); g.lineTo(0, -11); g.lineTo(10, 2); g.closePath(); },
    pod: g => { g.ellipse(0, -3, 10, 4, -0.3, 0, 7); },
    wreck: g => { g.moveTo(-10, -4); g.lineTo(10, -4); g.lineTo(6, 2); g.lineTo(-6, 2); g.closePath(); g.rect(-1, -13, 2, 9); },
    igloo: g => { g.arc(0, 2, 8, Math.PI, 0); g.closePath(); },
    frozen: g => { g.moveTo(-8, 2); g.lineTo(-6, -8); g.lineTo(-3, -2); g.lineTo(0, -13); g.lineTo(3, -2); g.lineTo(6, -8); g.lineTo(8, 2); g.closePath(); },
    cabin: g => { g.moveTo(-8, 2); g.lineTo(0, -10); g.lineTo(8, 2); g.closePath(); },
    village: g => { g.rect(-7, -5, 9, 7); g.moveTo(-8, -5); g.lineTo(-2.5, -10); g.lineTo(3, -5); g.rect(4, -12, 2, 14); },
    stilts: g => { g.rect(-6, -10, 12, 7); g.rect(-5, -3, 1.5, 5); g.rect(3.5, -3, 1.5, 5); },
    shroomring: g => { g.arc(0, -4, 8, Math.PI, 0); g.closePath(); g.rect(-2, -4, 4, 6); },
    bigtree: g => { g.arc(0, -7, 7, 0, 7); g.rect(-1.5, -1, 3, 4); },
    circle: g => { g.rect(-8, -7, 3, 9); g.rect(-1.5, -10, 3, 12); g.rect(5, -7, 3, 9); },
    arch: g => { g.moveTo(-8, 2); g.lineTo(-8, -6); g.arc(0, -6, 8, Math.PI, 0); g.lineTo(8, 2); g.lineTo(4, 2); g.lineTo(4, -6); g.arc(0, -6, 4, 0, Math.PI, true); g.lineTo(-4, 2); g.closePath(); },
    cave: g => { g.moveTo(-10, 2); g.lineTo(-4, -9); g.lineTo(2, -5); g.lineTo(5, -10); g.lineTo(10, 2); g.closePath(); },
    volcano: g => { g.moveTo(-12, 3); g.lineTo(-4, -10); g.lineTo(4, -10); g.lineTo(12, 3); g.closePath(); },
    landing: g => { g.moveTo(-8, 2); g.lineTo(0, -9); g.lineTo(8, 2); g.closePath(); },
    cactus: g => { g.rect(-2, -14, 4, 16); g.rect(-7, -9, 3, 6); g.rect(-7, -4, 6, 2); g.rect(4, -11, 3, 6); g.rect(1, -6, 6, 2); },
    bonewash: g => { g.rect(-9, -2, 18, 2); for (let k = -6; k <= 6; k += 4) g.rect(k - 0.7, -9, 1.4, 7); },
    plaza: g => { g.arc(0, -3, 6, 0, 7); },
    greatshroom: g => { g.moveTo(-12, -6); g.quadraticCurveTo(0, -20, 12, -6); g.closePath(); g.rect(-2.5, -6, 5, 8); },
    shell: g => { g.moveTo(-10, 2); g.quadraticCurveTo(-10, -12, 2, -10); g.quadraticCurveTo(10, -8, 10, 2); g.closePath(); },
    lightrock: g => { g.rect(-6, -3, 12, 5); g.moveTo(-3, -3); g.lineTo(-2, -15); g.lineTo(2, -15); g.lineTo(3, -3); g.closePath(); },
    bridge: g => { g.rect(-12, -6, 24, 3); g.rect(-9, -16, 2, 13); g.rect(7, -16, 2, 13); },
    station: g => { g.rect(-9, -8, 18, 10); g.moveTo(-6, -8); g.lineTo(0, -13); g.lineTo(6, -8); },
    turtle: g => { g.ellipse(0, -4, 11, 6, 0, Math.PI, 0); g.closePath(); g.rect(10, -5, 4, 3); },
    anvil: g => { g.moveTo(-12, -10); g.lineTo(10, -10); g.lineTo(6, -6); g.lineTo(3, -6); g.lineTo(5, 2); g.lineTo(-5, 2); g.lineTo(-3, -6); g.lineTo(-8, -6); g.closePath(); },
    throne: g => { g.rect(-6, -14, 12, 9); g.rect(-8, -5, 16, 7); },
    burnttree: g => { g.rect(-1.5, -14, 3, 16); g.moveTo(0, -8); g.lineTo(-8, -14); g.lineTo(-7, -15); g.lineTo(0, -10); g.moveTo(0, -11); g.lineTo(7, -16); g.lineTo(8, -15); g.lineTo(1, -9); },
    whale: g => { g.ellipse(-1, -5, 11, 5, 0, 0, 7); g.moveTo(9, -5); g.lineTo(14, -10); g.lineTo(14, 0); g.closePath(); },
    spire: g => { g.moveTo(-5, 2); g.lineTo(0, -18); g.lineTo(5, 2); g.closePath(); },
    antenna: g => { g.moveTo(-6, 2); g.lineTo(0, -18); g.lineTo(6, 2); g.closePath(); g.rect(-0.7, -22, 1.4, 4); },
    station: g => { g.arc(0, -4, 7, 0, 7); g.moveTo(4, -4); g.arc(0, -4, 3, 0, 7, true); },
  };
  function drawPic(g, k, x, y, flag) {
    g.save(); g.translate(x, y); g.beginPath(); PICS[k](g);
    g.fillStyle = ({ volcano: '#8e7c72', cactus: '#6aa252', greatshroom: '#c05ae0', shell: '#f4c8b0', turtle: '#5a9a5a', whale: '#9ac0e0', spire: '#9ff0ff', anvil: '#5a5a62', throne: '#6a3a2a', burnttree: '#3a3432', antenna: '#8a6a5a', bridge: '#a8603a' })[k] || CREAM; g.strokeStyle = INK; g.lineWidth = 1.6; g.lineJoin = 'round'; g.fill('evenodd'); g.stroke();
    if (k === 'volcano') { g.fillStyle = '#ff6a2a'; g.beginPath(); g.moveTo(-4, -10); g.lineTo(4, -10); g.lineTo(2, -6); g.lineTo(-2, -6); g.closePath(); g.fill(); }
    if (flag) { g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4, -6); g.lineTo(9, -18); g.stroke(); g.fillStyle = flag === 'found' ? '#3ee04a' : '#a8acb4'; g.beginPath(); g.moveTo(9, -18); g.lineTo(17, -15); g.lineTo(11, -11); g.closePath(); g.fill(); g.lineWidth = 1; g.stroke(); }
    g.restore();
  }
  function frame() {
    raf = isOpen ? requestAnimationFrame(frame) : 0; if (!isOpen) return;
    const cv = $('mapCv'), [w, h] = size(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mode === 'planets') { $('mapMsg').textContent = ''; drawPlanets(g, w, h); return; }
    const drawn = !!dimg;
    g.fillStyle = drawn ? '#6487b0' : '#132f5c'; g.fillRect(0, 0, w, h);
    if (!data) { $('mapMsg').textContent = 'Drawing the map…'; return; }
    $('mapMsg').textContent = '';
    const half = data.span / 2, [ax, az] = toScreen(-half, -half), s = data.span * view.k;
    if (drawn) { g.imageSmoothingEnabled = s / dimg.width < 1.5; g.drawImage(dimg, ax, az, s, s); }
    else { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, ax, az, s, s); }
    // a dashed grid every 2 km, like a drawn map
    if (drawn) { g.save(); g.strokeStyle = 'rgba(44,52,66,.32)'; g.lineWidth = 1.5; g.setLineDash([7, 5]); g.beginPath(); for (let q = -half + 2000; q < half; q += 2000) { const [qx] = toScreen(q, 0), [, qy] = toScreen(0, q); g.moveTo(qx, az); g.lineTo(qx, az + s); g.moveTo(ax, qy); g.lineTo(ax + s, qy); } g.stroke(); g.restore(); }
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
      if ((lb.b === 2 && view.k < minK() * 4) || lb.b === 11) continue;
      const [px, py] = toScreen(lb.x, lb.z); lab(lb.name, px, py, 'italic 600 12px Georgia, serif', BIOME_COL[lb.b] || '#fff', 1 + lb.size / 1e5, 'rgba(10,16,34,.7)', 3);
    }
    data.isles.forEach((it, k) => {
      if (it.gone || (isle >= 0 && k !== isle)) return; if (!inView(it.lx, it.lz, 200)) return;
      if (isle < 0 && it.size < 300 && view.k < minK() * 1.8) return;
      const [px, py] = toScreen(it.lx, it.lz), big = k === 0 ? 19 : it.size > 1000 ? 16 : 13;
      lab(it.name.toUpperCase(), px, py, '700 ' + big + 'px Georgia, serif', '#fff4dc', 5 + it.size / 1e4, 'rgba(20,14,6,.8)', 4); if (k === 0) labels[labels.length - 1].pri = 12;
    });
    // places: always-known ones, each island's landmark (a flag shows if you've found it), and the structures you've discovered
    const gm = host.game(), me = here() ? host.me() : null, vr = viewing();
    {
      const known = (gm && gm.known) || new Set(), list = [];
      if (gm && here()) { for (const q of gm.places(0, 0, 0)) if (q.always) list.push(q); }
      else if (vr !== 'berekor') { list.push({ x: 0, z: 0, kind: 'landing', name: (regionTheme(vr) || {}).landing || 'Dustmaw Landing', col: '#ffc45a', always: true }); for (const sp of themeSpecials((REGIONS[vr] || {}).theme)) list.push({ x: sp.x, z: sp.z, kind: sp.id, name: sp.name, col: '#ffd890', always: true }); }
      else if (vr === 'berekor' && VOLCANO.on) list.push({ x: VOLCANO.x, z: VOLCANO.z, kind: 'volcano', name: 'Volcano', col: '#ff7a2a', always: true });
      const MK = vr === 'dustmaw' ? (typeof DUST_ISLES !== 'undefined' ? DUST_ISLES.marks : []) : vr === 'berekor' && typeof BEREKOR_ISLES !== 'undefined' && VOLCANO.on ? BEREKOR_ISLES.marks : [];
      const markKeys = new Set();
      for (const m of MK) { const key = 's:' + Math.floor(m.x / REG) + ',' + Math.floor(m.z / REG); markKeys.add(key); list.push({ x: m.x, z: m.z, name: STRUCT_TYPES[m.type], type: m.type, col: '#fff4dc', mark: true, flag: here() && known.has(key) ? 'found' : 'not' }); }
      if (gm && here()) for (const key of known) { if (!key.startsWith('s:') || markKeys.has(key)) continue; const [rx, rz] = key.slice(2).split(',').map(Number); const p = gm.St.plan(rx, rz); if (p) list.push({ x: p.x, z: p.z, name: STRUCT_TYPES[p.type], type: p.type, col: p.type === 'cave' ? '#b8a8ff' : '#ffffff', found: true, flag: 'found' }); }
      if (vr === 'berekor') list.push({ x: 0, z: 0, name: 'Plaza', kind: 'plaza', col: '#ffc45a', big: true }, { x: STATION.x, z: STATION.z, name: 'Station', kind: 'station', col: '#5ff0e0', big: true });
      for (const q of list) if (q.always && vr !== 'berekor') q.big = true;
      for (const q of list) {
        if (isle >= 0 && isleAt(q.x, q.z) !== isle) continue; if (!inView(q.x, q.z)) continue;
        const [px, py] = toScreen(q.x, q.z), pic = q.type || q.kind;
        if (PICS[pic]) { drawPic(g, pic, px, py, q.flag); lab(q.name, px, py + 13, '700 11px Georgia, serif', q.col === '#ffffff' ? '#fff4dc' : q.col, q.kind === 'volcano' ? 9 : q.big ? 8 : 3, 'rgba(30,26,20,.85)', 3); continue; }
        const r = q.big ? 5.5 : 4;
        g.fillStyle = q.col; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); g.stroke();
        lab(q.name, px, py + r + 9, '700 11px system-ui', q.col, q.big ? 8 : 3);
      }
    }
    const wpt = getWay();
    if (wpt) { const [px, py] = toScreen(wpt.x, wpt.z); g.fillStyle = '#ffe14a'; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 6, py - 12); g.arc(px, py - 15, 7, Math.PI * 0.8, Math.PI * 2.2); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#0a1124'; g.beginPath(); g.arc(px, py - 15, 2.5, 0, 7); g.fill(); }
    if (gm && here()) {
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
    // the region's name and saying in the top left corner
    if (isle < 0) {
      g.textAlign = 'left'; const t1 = regionName(), t2 = tagOf(viewing()) ? '"' + tagOf(viewing()) + '"' : '';
      text(t1, 12, 22, '700 24px Georgia, serif', '#fff4dc', 'rgba(30,26,20,.9)', 4);
      if (t2) text(t2, 14, 44, 'italic 600 12px Georgia, serif', '#fff4dc', 'rgba(30,26,20,.9)', 3);
      g.font = '700 24px Georgia, serif'; const tw = Math.max(g.measureText(t1).width, t2.length * 6.2); taken.push([0, 0, tw + 30, 56]); g.textAlign = 'center';
    }
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
    build(); if (isOpen) return; isOpen = true; $('mapScreen').classList.remove('hidden'); placing = false; mode = 'region'; viewR = null; updateWayBtn();
    const ready = () => { const me = host.me(); showWorld(); if (me) { const k = isleAt(me.x, me.z); if (k >= 0) showIsle(k); } };
    viewR = null; if (loadedFor !== viewing()) data = null;
    if (data) ready(); else { info(); load().then(() => { if (isOpen) ready(); }).catch(() => { $('mapMsg').textContent = 'Could not load the map. Check your connection and try again.'; }); }
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() { if (!isOpen) return; isOpen = false; placing = false; $('mapScreen').classList.add('hidden'); ptrs.clear(); }
  return { init(h) { host = h; build(); }, open, close, toggle() { isOpen ? close() : open(); }, get isOpen() { return isOpen; }, preload: () => load().catch(() => {}) };
})();
