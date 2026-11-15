// Funz Online 3D: one shared peaceful world. Menus, controls, the game loop,
// the world-keeper rules, items, the ring race, saving, and admin tools.
(() => {
  const $ = id => document.getElementById(id);
  const COLORS = ['#48d6ac', '#5aa9ff', '#ff7a8a', '#ffc45a', '#b48cff', '#ff9f5a', '#e8eef7', '#7be36b'];
  const EMOTES = ['👋', '❤️', '😂', '🔥', '✨', '👍'];
  const SEED = 20261115;
  const MAX_PLAYERS = 30, MAX_EDITS = 60000, MAX_WIRES = 4000, REACH = 9, DAY_MS = 14 * 60 * 1000, ITEM_RESPAWN = 4 * 60 * 1000;
  const ADMIN_PUB = { kty: 'EC', crv: 'P-256', x: 'ElMxPCYM-fDGDUiwud0eo8Uojz3sEaSeyzh6w_nW2Rk', y: 'Z0isPmpbPF-0J9BpskcpSe9tvLWSjF1ZCF6VlIWS9yo' };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('funz.' + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('funz.' + k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem('funz.' + k); } catch (e) {} },
    json(k, d) { try { const v = JSON.parse(store.get(k, 'null')); return v == null ? d : v; } catch (e) { return d; } },
  };

  // ---------- menu ----------
  document.body.classList.toggle('touch', Device.useTouch);
  $('deviceBadge').innerHTML = icon(Device.type, 16) + ' '; $('deviceBadge').appendChild(document.createTextNode('You are on: ' + Device.short));
  const nameInput = $('nameInput');
  nameInput.value = store.get('name', '');
  let myColor = store.get('color', COLORS[Math.floor(Math.random() * COLORS.length)]);
  let myHat = store.get('hat', 'none'); if (!HATS[myHat]) myHat = 'none';

  // The crown and the name Outernautica belong only to the owner (unlocked once
  // with a secret link). Whoever has them is the admin.
  const RESERVED_HATS = ['crown'];
  const reservedName = n => n.toLowerCase().replace(/[^a-z]/g, '').includes('outernautica');
  const owned = new Set();
  const grantOwner = () => { owned.add('hat:crown'); owned.add('name:outernautica'); };
  if (store.get('pass', '')) grantOwner();
  const ownsHat = h => !RESERVED_HATS.includes(h) || owned.has('hat:' + h);
  if (!ownsHat(myHat)) myHat = 'none';

  function picker(box, items, current, onPick, style) {
    for (const [val, label] of items) {
      const b = document.createElement('button');
      style(b, val, label); if (val === current) b.classList.add('on');
      b.onclick = () => { onPick(val); [...box.children].forEach(x => x.classList.toggle('on', x === b)); drawPreview(); };
      box.appendChild(b);
    }
  }
  picker($('colors'), COLORS.map(c => [c, c]), myColor, v => { myColor = v; store.set('color', v); }, (b, v) => { b.style.background = v; b.setAttribute('aria-label', 'Color'); });
  const buildHats = () => picker($('hats'), Object.entries(HATS).filter(([h]) => ownsHat(h)).map(([h, l]) => [h, RESERVED_HATS.includes(h) ? l + ' ★' : l]), myHat, v => { myHat = v; store.set('hat', v); }, (b, v, l) => { b.textContent = l; });
  buildHats();

  // spinning 3D preview of your ball on the menu
  let preview = null;
  function drawPreview() {
    try {
      if (!preview) { const c = $('avatarPreview'); c.width = 320; c.height = 240; preview = { gfx: new GL(c), c }; }
      preview.m = ballModel(preview.gfx, myColor, myHat);
      if (!preview.loop) { preview.loop = true; requestAnimationFrame(spin); }
    } catch (e) { $('avatarPreview').classList.add('hidden'); }
  }
  function spin(t) {
    if (!preview || $('menu').classList.contains('hidden')) { if (preview) preview.loop = false; return; }
    const { gfx } = preview, gl = gfx.gl, u = gfx.u;
    gl.clearColor(0.07, 0.13, 0.22, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gfx.scene({ vp: M4.mul(M4.persp(0.6, 4 / 3, 0.1, 50), M4.lookAt([0, 0.7, 2.1], [0, 0.12, 0], [0, 1, 0])), sun: [0.45, 0.75, 0.5], sunC: [0.62, 0.6, 0.56], sky: [0.52, 0.55, 0.62], ground: [0.25, 0.25, 0.3], fog: [0.07, 0.13, 0.22], fogD: 0, eye: [0, 0.7, 2.1] });
    gfx.draw(preview.m, M4.model([0, 0, 0], M4.rotY(t / 1200)), 1);
    requestAnimationFrame(spin);
  }
  drawPreview();

  // secret unlock link: ?unlock=...
  const unlock = new URLSearchParams(location.search).get('unlock');
  if (unlock) {
    history.replaceState(null, '', location.pathname);
    setTimeout(() => adminSign(unlock, 'test').then(ok => {
      if (ok) { store.set('pass', unlock); grantOwner(); $('hats').textContent = ''; buildHats(); menuMsg('★ The crown and the name Outernautica are now in your wardrobe forever!'); }
      else menuMsg('That unlock link is not right.');
    }), 0);
  }

  const cleanName = s => (s || '').replace(/[\u0000-\u001f\u007f<>★]/g, '').trim().slice(0, 16);
  const cleanText = s => (typeof s === 'string' ? s : '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
  const menuMsg = t => { $('menuMsg').textContent = t || ''; };
  const myName = () => {
    const n = cleanName(nameInput.value) || 'Explorer' + Math.floor(Math.random() * 900 + 100);
    if (reservedName(n) && !owned.has('name:outernautica')) { menuMsg('That name is special and can\'t be used. Pick another one!'); return null; }
    nameInput.value = n; store.set('name', n); return n;
  };

  $('chatToggle').innerHTML = icon('chat', 24);
  $('leaveBtn').innerHTML = icon('leave', 15) + ' Leave';
  $('adminBtn').innerHTML = icon('star', 15) + ' Admin';
  $('bagBtn').innerHTML = icon('bag', 22);
  $('jumpBtn').innerHTML = icon('up', 26);
  $('respawnBtn').innerHTML = icon('spawn', 18);
  $('playBtn').onclick = () => play();
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') play(); });

  let installEvt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (!Device.standalone) $('installBtn').classList.remove('hidden'); });
  $('installBtn').onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('installBtn').classList.add('hidden'); };
  addEventListener('appinstalled', () => $('installBtn').classList.add('hidden'));
  if ((Device.os === 'iPhone' || Device.os === 'iPad') && !Device.standalone) $('iosHint').classList.remove('hidden');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

  // ---------- owner signature ----------
  const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  async function adminSign(key, nonce) {
    try {
      if (!key || !key.startsWith('funz-admin-') || !crypto.subtle) return null;
      const jwk = JSON.parse(new TextDecoder().decode(unb64u(key.slice(11))));
      const k = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', ...jwk }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
      const sig = b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, new TextEncoder().encode(nonce)));
      return (await adminVerify(nonce, sig)) ? sig : null;
    } catch (e) { return null; }
  }
  async function adminVerify(nonce, sig) {
    try {
      const k = await crypto.subtle.importKey('jwk', ADMIN_PUB, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, unb64u(sig), new TextEncoder().encode(nonce));
    } catch (e) { return false; }
  }

  // ---------- game state ----------
  let G = null;
  const saveKey = 'world4';
  function saved() { return store.json(saveKey, {}); }
  function saveWorld() { if (!G || !G.dirty) return; G.dirty = false; store.set(saveKey, JSON.stringify({ t: Date.now(), parts: G.B.list(), wires: [...G.B.wires], levers: [...G.circ.levers], bans: [...G.bans], board: G.board })); }
  setInterval(saveWorld, 8000);
  addEventListener('pagehide', saveWorld);
  const DEFAULT_SPAWN = [0, SPAWN_H + 1.5, 7];

  async function play() {
    const name = myName(); if (!name) return;
    $('playBtn').disabled = true; menuMsg('Entering the world…');
    if (Device.useTouch) { try { await document.documentElement.requestFullscreen(); await screen.orientation.lock('landscape'); } catch (e) {} }
    const s = saved(), B = new Builds(); B.load(s.parts, s.wires);
    let game;
    try { game = new Game($('game'), $('ov'), SEED, B); }
    catch (e) { console.error(e); $('playBtn').disabled = false; menuMsg('Your device can\'t show 3D graphics (WebGL). Try another browser.'); return; }
    game.radius = Device.type === 'phone' ? 4 : Device.type === 'tablet' ? 5 : 6;
    game.allPartsChanged();
    const circ = new Circuits(B); for (const l of s.levers || []) circ.levers.add(l);
    const spawn = store.json('spawn4', null) || DEFAULT_SPAWN;
    const body = game.newBody([spawn[0] + (Math.random() - .5), spawn[1] + 1, spawn[2] + (Math.random() - .5)]);
    G = {
      role: null, myId: null, players: new Map(), B, game, circ, body,
      tool: 0, cat: 'blocks', building: !Device.useTouch, dayStart: performance.now() - DAY_MS * 0.875,
      lastSend: 0, lastState: 0, lastCirc: 0, lastHeard: performance.now(), rate: new Map(), running: true, dirty: false,
      muted: new Set(), kicked: new Map(), bans: new Set(s.bans || []), nonces: new Map(), reconnecting: false,
      taken: new Map(), frozen: false, effects: {}, inv: store.json('inv', {}), race: null, raceCool: 0,
      board: Array.isArray(s.board) ? s.board.slice(0, 5) : [], spawn, lastSpawnPad: '', wireFrom: null,
      profile: { name, color: myColor, hat: myHat, dev: Device.short, devType: Device.type },
    };
    G.me = { id: 'me', ...G.profile, p: body.p, R: body.R, r: body.r };
    await connectWorld(true);
  }

  async function connectWorld(first) {
    let role;
    try { role = await Net.connect(); } catch (e) { role = 'offline'; }
    if (!G) { Net.leave(); return; }
    G.role = role; G.lastHeard = performance.now();
    if (role === 'guest') { Net.toKeeper({ t: 'hello', ...G.profile, p: G.body.p.map(v => +v.toFixed(2)) }); return; }
    G.myId = 'keeper'; G.me.id = 'keeper';
    G.players.clear(); G.players.set('keeper', G.me);
    G.me.admin = !!(await adminSign(store.get('pass', ''), 'self-' + Math.random()));
    if (first) enterGame();
    G.reconnecting = false; renderPeople();
    if (role === 'offline') { $('roomLabel').innerHTML = '<i class="live off"></i>Offline'; sys('Could not reach the world, so you are exploring offline. Your builds are saved on this device.'); }
    else { $('roomLabel').innerHTML = '<i class="live"></i>Online'; sys(first ? 'Welcome to Funz Online! You are the first one here, more people can join any time.' : 'Back online.'); }
  }

  function addPlayer(p) {
    const pl = Object.assign({ R: [1, 0, 0, 0, 1, 0, 0, 0, 1], r: 0.45 }, p);
    pl.p = [...(p.p || DEFAULT_SPAWN)]; pl.tp = [...pl.p];
    G.players.set(p.id, pl); return pl;
  }

  function enterGame() {
    $('menu').classList.add('hidden'); $('playBtn').disabled = false; menuMsg('');
    $('hud').classList.remove('hidden'); $('chat').classList.remove('hidden'); $('toast').classList.add('hidden');
    if (Device.useTouch) { $('touch').classList.remove('hidden'); $('buildToggle').classList.remove('hidden'); $('chatToggle').classList.remove('hidden'); $('chat').classList.add('hidden'); }
    buildHotbar(); buildEmotes(); selectTool(0, true); toggleBuild(G.building); renderBag();
    $('adminBtn').classList.toggle('hidden', !G.me.admin);
    onResize(); last = performance.now();
    showToast(Device.useTouch ? 'Joystick to roll · drag to look · jump button to jump' : 'WASD to roll · drag to look · Space to jump · the station is on your minimap!', 5000);
    requestAnimationFrame(loop);
  }

  function leave(msg) {
    if (!G) return;
    saveWorld(); G.running = false; Net.leave(); G = null;
    ['hud', 'chat', 'touch', 'chatToggle', 'buildToggle', 'bag', 'adminPanel'].forEach(id => $(id).classList.add('hidden'));
    $('chatLog').textContent = '';
    const o = $('ov').getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, 9999, 9999);
    $('menu').classList.remove('hidden'); $('playBtn').disabled = false; menuMsg(msg || '');
    if (preview && !preview.loop) { preview.loop = true; requestAnimationFrame(spin); }
  }
  $('leaveBtn').onclick = () => leave();

  async function reconnect() {
    if (!G || G.reconnecting) return;
    G.reconnecting = true; Net.leave();
    for (const id of [...G.players.keys()]) if (G.players.get(id) !== G.me) G.players.delete(id);
    renderPeople(); showToast('Reconnecting to the world…');
    await new Promise(r => setTimeout(r, 300 + Math.random() * 1500));
    if (!G) return;
    await connectWorld(false);
    if (G && G.role !== 'guest') showToast(G.role === 'offline' ? 'Offline for now' : 'Back online!', 1500);
  }

  // ---------- networking ----------
  Net.on({
    join() {},
    leave(id) {
      if (!G || G.role !== 'keeper') return;
      const p = G.players.get(id); if (!p) return;
      G.players.delete(id); renderPeople();
      Net.toAll({ t: 'bye', id }); sys(p.name + ' left');
    },
    closed() { if (G && G.role === 'guest') reconnect(); },
    message(from, m) {
      if (!G || !m || typeof m !== 'object') return;
      if (G.role === 'keeper') keeperGot(from, m); else if (G.role === 'guest') { G.lastHeard = performance.now(); guestGot(m); }
    },
  });

  const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;
  const vec = a => Array.isArray(a) && a.length === 3 ? [num(a[0], -LIMIT, LIMIT), num(a[1], -800, 700), num(a[2], -LIMIT, LIMIT)] : null;
  const okVec = v => v && v.every(x => x != null);
  function allow(id, kind, per, ms) {
    const k = id + kind, now = performance.now(), list = (G.rate.get(k) || []).filter(t => now - t < ms);
    if (list.length >= per) { G.rate.set(k, list); return false; }
    list.push(now); G.rate.set(k, list); return true;
  }
  const publicP = p => ({ id: p.id, name: p.name, color: p.color, hat: p.hat, dev: p.dev, devType: p.devType, admin: !!p.admin, p: p.p.map(v => +v.toFixed(2)) });
  const roster = () => [...G.players.values()].map(publicP);
  const dayPhase = () => ((performance.now() - G.dayStart) / DAY_MS) % 1;
  const findPlayer = name => { name = (name || '').toLowerCase().replace(/^@/, ''); if (!name) return null; return [...G.players.values()].find(p => p.name.toLowerCase() === name) || [...G.players.values()].find(p => p.name.toLowerCase().startsWith(name)); };
  const takenList = () => [...G.taken.keys()];
  // nobody can build or break at the station; only the admin can at the spawn plaza and the parkour
  const inSpawn = (x, z) => Math.hypot(x + 0.5, z + 0.5) < 50 || Math.hypot(x + 0.5 - 44, z + 0.5 - 38) < 16;
  const canBuildHere = (x, y, z, p) => !nearStation(x + 0.5, z + 0.5) && Math.abs(x) < LIMIT && Math.abs(z) < LIMIT && y > -760 && y < 600 && (!inSpawn(x, z) || !!(p && p.admin));
  const sendPower = () => Net.toAll({ t: 'pw', on: [...G.circ.on] });

  function keeperGot(id, m) {
    const p = G.players.get(id);
    if (m.t === 'hello') {
      if (p) return;
      const wantName = cleanName(m.name) || 'Explorer';
      const name = reservedName(wantName) ? 'Explorer' + Math.floor(Math.random() * 900 + 100) : wantName;
      const ban = G.kicked.get(wantName.toLowerCase());
      if (G.bans.has(wantName.toLowerCase())) { Net.toOne(id, { t: 'banned' }); Net.drop(id); return; }
      if (ban && ban > Date.now()) { Net.toOne(id, { t: 'kicked' }); Net.drop(id); return; }
      if (G.players.size >= MAX_PLAYERS) { Net.toOne(id, { t: 'full' }); Net.drop(id); return; }
      const pos = vec(m.p);
      const np = addPlayer({ id, name, wantName, color: COLORS.includes(m.color) ? m.color : COLORS[0],
        hat: HATS[m.hat] && !RESERVED_HATS.includes(m.hat) ? m.hat : 'none', wantHat: HATS[m.hat] ? m.hat : 'none',
        dev: cleanText(m.dev).slice(0, 40), devType: ['phone', 'tablet', 'computer'].includes(m.devType) ? m.devType : '',
        p: okVec(pos) ? pos : DEFAULT_SPAWN });
      const nonce = Math.random().toString(36).slice(2) + Date.now(); G.nonces.set(id, nonce);
      Net.toOne(id, { t: 'welcome', id, parts: G.B.list(), wires: [...G.B.wires], power: [...G.circ.on], bans: [...G.bans], taken: takenList(), board: G.board, phase: dayPhase(), roster: roster(), nonce });
      renderPeople();
      if (!reservedName(wantName)) { const msg = np.name + ' joined (' + np.dev + ')'; sys(msg); Net.toAll({ t: 'sys', text: msg }, id); }
      return;
    }
    if (!p) return;
    if (m.t === 'pos') {
      const v = vec(m.p); if (!okVec(v)) return;
      p.tp = v; p.fly = !!m.fl && !!p.admin; p.big = !!m.big; p.glow = !!m.gl;
    } else if (m.t === 'admin') {
      const nonce = G.nonces.get(id); G.nonces.delete(id);
      if (nonce && typeof m.sig === 'string') adminVerify(nonce, m.sig).then(ok => {
        if (ok && G && G.players.get(id) === p) {
          p.admin = true; p.name = p.wantName; p.hat = p.wantHat; renderPeople();
          const t = '★ ' + p.name + ' (the admin) joined'; sys(t); Net.toAll({ t: 'sys', text: t });
        }
      });
    } else if (m.t === 'chat') {
      const text = cleanText(m.text);
      if (!text || !allow(id, 'c', 4, 4000)) return;
      if (text.startsWith('/')) { if (p.admin) adminCommand(p, text); return; }
      if (G.muted.has(p.name.toLowerCase())) { Net.toOne(id, { t: 'sys', text: 'You are muted right now.' }); return; }
      say(p, text); Net.toAll({ t: 'chat', id, text });
    } else if (m.t === 'emote') {
      if (!EMOTES.includes(m.e) || !allow(id, 'e', 4, 3000)) return;
      emote(p, m.e); Net.toAll({ t: 'emote', id, e: m.e });
    } else if (m.t === 'block') {
      const { x, y, z, k } = m, r = (m.r | 0) & 3;
      if (![x, y, z].every(Number.isInteger) || !(k === 0 || PARTS[k])) return;
      if (!allow(id, 'b', 15, 1000) || !canBuildHere(x, y, z, p)) return;
      if (!p.admin && Math.hypot(x + 0.5 - p.tp[0], y + 0.5 - p.tp[1], z + 0.5 - p.tp[2]) > REACH + 3) return;
      if (k !== 0 && G.B.parts.size >= MAX_EDITS && !G.B.parts.has(pkey(x, y, z))) return;
      applyBlock(x, y, z, k, r); Net.toAll({ t: 'block', x, y, z, k, r });
    } else if (m.t === 'wire') {
      const okKey = s => typeof s === 'string' && /^-?\d+,-?\d+,-?\d+$/.test(s) && G.B.parts.has(s);
      if (!okKey(m.a) || !allow(id, 'w', 10, 1000) || !canBuildHere(...unkey(m.a), p)) return;
      if (m.add) { if (!okKey(m.b) || m.a === m.b || G.B.wires.size >= MAX_WIRES) return; const A = unkey(m.a), Bv = unkey(m.b); if (Math.hypot(A[0] - Bv[0], A[1] - Bv[1], A[2] - Bv[2]) > 40) return; applyWire(m.a, m.b, true); Net.toAll({ t: 'wire', a: m.a, b: m.b, add: true }); }
      else { for (const o of G.B.wiresOf(m.a)) { applyWire(m.a, o, false); Net.toAll({ t: 'wire', a: m.a, b: o, add: false }); } }
    } else if (m.t === 'take') {
      tryTake(p, m.id, m.type);
    } else if (m.t === 'race') {
      const time = num(m.time, 5, 3600); if (time != null && allow(id, 'r', 2, 10000)) recordRace(p.name, time);
    } else if (m.t === 'adminCmd') {
      if (p.admin) adminCommand(p, typeof m.o === 'string' ? cleanText(m.o) : m.o);
    }
  }

  function tryTake(p, itemId, claimType) {
    if (typeof itemId !== 'string' || itemId.length > 80 || itemId === 'trophy' || G.taken.has(itemId)) return;
    const it = G.game.findItem(itemId);
    if (it === null) return;
    if (it && Math.hypot(it.p[0] - p.tp[0], it.p[1] - p.tp[1], it.p[2] - p.tp[2]) > 3.5) return;
    const type = it ? it.type : claimType; if (!ITEMS[type] || type === 'trophy') return;
    G.taken.set(itemId, Date.now() + ITEM_RESPAWN);
    Net.toAll({ t: 'taken', id: itemId });
    if (p === G.me) gotItem(type); else Net.toOne(p.id, { t: 'got', id: itemId, type });
  }
  function recordRace(name, time) {
    const b = G.board.filter(r => r.name !== name || r.time < time);
    if (!b.some(r => r.name === name)) b.push({ name, time: +time.toFixed(2) });
    b.sort((a, c) => a.time - c.time); G.board = b.slice(0, 5); G.dirty = true;
    Net.toAll({ t: 'board', list: G.board }); renderBag();
  }

  function guestGot(m, self) {
    if (m.t === 'freeze') { G.frozen = !!m.on; showToast(m.on ? 'The admin froze you' : 'You can move again', 1800); return; }
    if (m.t === 'tp') { const v = vec(m.p); if (okVec(v)) { G.body.p = v; G.body.v = [0, 0, 0]; } return; }
    if (self) { if (m.t === 'sys') sys(cleanText(m.text)); return; }
    if (m.t === 'welcome') {
      const first = !G.myId;
      G.myId = m.id; G.me.id = m.id;
      G.B.load(m.parts || [], m.wires || []); G.dirty = true; G.game.allPartsChanged(); G.game.setPower(new Set(m.power || []));
      G.bans = new Set((m.bans || []).filter(b => typeof b === 'string'));
      G.taken = new Map((m.taken || []).map(i => [i, 0]));
      G.board = Array.isArray(m.board) ? m.board.slice(0, 5) : [];
      G.dayStart = performance.now() - m.phase * DAY_MS;
      G.players.clear(); G.players.set(m.id, G.me);
      for (const r of m.roster) if (r.id !== m.id) addPlayer(r);
      G.me.admin = false;
      adminSign(store.get('pass', ''), m.nonce).then(sig => { if (sig) Net.toKeeper({ t: 'admin', sig }); });
      $('roomLabel').innerHTML = '<i class="live"></i>Online';
      if (first) { enterGame(); sys('Welcome to Funz Online! ' + (m.roster.length - 1) + ' other ' + (m.roster.length === 2 ? 'player is' : 'players are') + ' here.'); }
      else showToast('Back online!', 1500);
      G.reconnecting = false; renderPeople(); renderBag();
      return;
    }
    if (!G.myId) {
      if (m.t === 'full') leave('The world is full right now (' + MAX_PLAYERS + ' players). Try again soon!');
      if (m.t === 'kicked') leave('The admin removed you from the world for a while.');
      if (m.t === 'banned') leave('You are banned from this world.');
      return;
    }
    if (m.t === 'roster') {
      const ids = new Set(m.roster.map(r => r.id));
      for (const id of [...G.players.keys()]) if (!ids.has(id)) G.players.delete(id);
      for (const r of m.roster) { const p = G.players.get(r.id); if (!p) addPlayer(r); else if (p !== G.me) Object.assign(p, { admin: r.admin, name: r.name, hat: r.hat }); else p.admin = r.admin; }
      renderPeople();
    } else if (m.t === 'state') {
      G.dayStart = performance.now() - m.phase * DAY_MS;
      for (const [id, x, y, z, fl, big, gl] of m.p) { const p = G.players.get(id); if (p && p !== G.me) { p.tp = [x, y, z]; p.fly = fl; p.big = big; p.glow = gl; } }
    } else if (m.t === 'bye') { const p = G.players.get(m.id); if (p) { sys(p.name + ' left'); G.players.delete(m.id); renderPeople(); } }
    else if (m.t === 'chat') { const p = G.players.get(m.id); if (p) say(p, cleanText(m.text)); }
    else if (m.t === 'emote') { const p = G.players.get(m.id); if (p && EMOTES.includes(m.e)) emote(p, m.e); }
    else if (m.t === 'block') { if ([m.x, m.y, m.z].every(Number.isInteger) && (m.k === 0 || PARTS[m.k])) applyBlock(m.x, m.y, m.z, m.k, m.r | 0); }
    else if (m.t === 'wire') { if (typeof m.a === 'string' && typeof m.b === 'string') applyWire(m.a, m.b, !!m.add); }
    else if (m.t === 'pw') { if (Array.isArray(m.on)) G.game.setPower(new Set(m.on.filter(k => typeof k === 'string'))); }
    else if (m.t === 'taken') G.taken.set(m.id, 0);
    else if (m.t === 'back') G.taken.delete(m.id);
    else if (m.t === 'got') { if (ITEMS[m.type]) gotItem(m.type); }
    else if (m.t === 'board') { G.board = Array.isArray(m.list) ? m.list.slice(0, 5) : []; G.dirty = true; renderBag(); }
    else if (m.t === 'sys') sys(cleanText(m.text));
    else if (m.t === 'announce') announce(cleanText(m.text));
    else if (m.t === 'bans') { G.bans = new Set((m.list || []).filter(b => typeof b === 'string')); G.dirty = true; renderAdmin(); }
    else if (m.t === 'clearchat') $('chatLog').textContent = '';
    else if (m.t === 'kicked') leave('The admin removed you from the world for a while.');
    else if (m.t === 'banned') leave('You are banned from this world.');
  }

  function applyBlock(x, y, z, k, r) {
    G.B.set(x, y, z, k, r); G.dirty = true; G.game.partChanged(x, y, z);
  }
  function applyWire(a, b, add) { G.B.wire(a, b, add); G.dirty = true; G.game.wiresDirty = true; }

  // ---------- items & inventory ----------
  function gotItem(type) {
    G.inv[type] = (G.inv[type] || 0) + 1; store.set('inv', JSON.stringify(G.inv));
    showToast('Found: ' + ITEMS[type].name + '!', 1500); renderBag();
    $('bagBtn').classList.add('pop'); setTimeout(() => $('bagBtn').classList.remove('pop'), 400);
  }
  function useItem(type) {
    const it = ITEMS[type]; if (!it || !it.time || !(G.inv[type] > 0)) return;
    G.inv[type]--; if (!G.inv[type]) delete G.inv[type]; store.set('inv', JSON.stringify(G.inv));
    G.effects[it.eff] = performance.now() + it.time * 1000;
    showToast(it.name + ': ' + it.use, 2000); renderBag();
  }
  function renderBag() {
    if (!G) return;
    const box = $('bagItems'); box.textContent = '';
    const types = Object.keys(G.inv).filter(t => ITEMS[t]);
    if (!types.length) { const e = document.createElement('p'); e.className = 'aEmpty'; e.textContent = 'Nothing yet! Explore to find shells on beaches, mushrooms in forests, feathers in grasslands, crystals in the snow and mountains, gems in caves and deserts, relics in ruins and the station, and coins anywhere.'; box.appendChild(e); }
    for (const t of types) {
      const it = ITEMS[t];
      const b = document.createElement('button'); b.className = 'item' + (it.time ? '' : ' keep');
      b.innerHTML = '<span class="sw" style="background:' + it.color + '"></span><b></b><small></small><i></i>';
      b.querySelector('b').textContent = it.name; b.querySelector('small').textContent = it.time ? 'Tap to use: ' + it.use : it.use; b.querySelector('i').textContent = '×' + G.inv[t];
      if (it.time) b.onclick = () => useItem(t);
      box.appendChild(b);
    }
    const bd = $('board'); bd.textContent = '';
    if (!G.board.length) { const e = document.createElement('p'); e.className = 'aEmpty'; e.textContent = 'No race records yet. Roll onto the gold ring at the plaza to start!'; bd.appendChild(e); }
    G.board.forEach((r, i) => { const row = document.createElement('div'); row.className = 'rec'; row.textContent = (i + 1) + '. ' + r.name + ' · ' + r.time.toFixed(2) + 's'; bd.appendChild(row); });
  }
  $('bagBtn').onclick = () => { $('bag').classList.toggle('hidden'); renderBag(); };
  $('bagClose').onclick = () => $('bag').classList.add('hidden');
  $('respawnBtn').onclick = () => respawn();
  function respawn() { if (!G) return; const s = G.spawn; G.body.p = [s[0], s[1] + 1.2, s[2]]; G.body.v = [0, 0, 0]; G.game.cave = null; if (G.race) { G.race = null; showToast('Race cancelled', 1200); } }

  // ---------- admin ----------
  function parseCommand(text) {
    const [cmd, ...rest] = text.slice(1).split(' ');
    const c = (cmd || '').toLowerCase(), args = rest.join(' ').trim();
    if (c === 'say') { const [n, ...t] = rest; const p = findPlayer(n); return { cmd: c, target: p && p.id, text: t.join(' '), who: n }; }
    if (c === 'announce' || c === 'unban') return { cmd: c, text: args };
    const p = args ? findPlayer(args) : null;
    return { cmd: c, target: p && p.id, who: args };
  }
  function adminCommand(admin, o) {
    if (typeof o === 'string') o = parseCommand(o);
    if (!o || typeof o !== 'object') return;
    const reply = t => { if (admin === G.me) sys(t); else Net.toOne(admin.id, { t: 'sys', text: t }); };
    const tell = (p, msg) => { if (p === G.me) guestGot(msg, true); else Net.toOne(p.id, msg); };
    const both = text => { sys(text); Net.toAll({ t: 'sys', text }); };
    const needsTarget = ['kick', 'ban', 'mute', 'unmute', 'tp', 'bring', 'freeze', 'thaw', 'say'];
    const p = G.players.get(o.target);
    if (needsTarget.includes(o.cmd) && !p) { reply('No player called "' + (o.who || '?') + '"'); return; }
    const text = cleanText(o.text);
    switch (o.cmd) {
      case 'help': reply('Admin: /announce text · /say name text · /kick name · /ban name · /unban name · /mute name · /unmute name · /freeze name · /thaw name · /tp name · /bring name · /day · /night · /clearchat · /players'); break;
      case 'announce': if (text) { announce(text); Net.toAll({ t: 'announce', text }); } break;
      case 'say': if (text) { say(p, text); Net.toAll({ t: 'chat', id: p.id, text }); } break;
      case 'kick': case 'ban': {
        if (p.admin) { reply('You can\'t remove an admin.'); break; }
        const key = p.name.toLowerCase();
        if (o.cmd === 'ban') { G.bans.add(key); G.dirty = true; Net.toAll({ t: 'bans', list: [...G.bans] }); }
        else G.kicked.set(key, Date.now() + 10 * 60 * 1000);
        if (p !== G.me) { Net.toOne(p.id, { t: o.cmd === 'ban' ? 'banned' : 'kicked' }); Net.drop(p.id); G.players.delete(p.id); Net.toAll({ t: 'bye', id: p.id }); }
        renderPeople(); both(p.name + (o.cmd === 'ban' ? ' was banned' : ' was kicked') + ' by the admin'); break; }
      case 'unban': { const k = text.toLowerCase(); if (G.bans.delete(k)) { G.dirty = true; Net.toAll({ t: 'bans', list: [...G.bans] }); reply(text + ' is not banned anymore'); renderAdmin(); } else reply(text + ' was not banned'); break; }
      case 'mute': if (p.admin) break; G.muted.add(p.name.toLowerCase()); tell(p, { t: 'sys', text: 'The admin muted you.' }); reply(p.name + ' is muted'); break;
      case 'unmute': G.muted.delete(p.name.toLowerCase()); tell(p, { t: 'sys', text: 'You can chat again.' }); reply(p.name + ' can chat again'); break;
      case 'freeze': if (p.admin) break; tell(p, { t: 'freeze', on: true }); reply(p.name + ' is frozen'); break;
      case 'thaw': tell(p, { t: 'freeze', on: false }); reply(p.name + ' can move again'); break;
      case 'tp': tell(admin, { t: 'tp', p: [p.tp[0], p.tp[1] + 1.5, p.tp[2]] }); break;
      case 'bring': if (p !== admin) tell(p, { t: 'tp', p: [admin.tp[0], admin.tp[1] + 1.5, admin.tp[2]] }); break;
      case 'day': G.dayStart = performance.now(); both('The admin made it day'); break;
      case 'night': G.dayStart = performance.now() - DAY_MS * 0.5; both('The admin made it night'); break;
      case 'clearchat': $('chatLog').textContent = ''; Net.toAll({ t: 'clearchat' }); both('The admin cleared the chat'); break;
      case 'players': reply([...G.players.values()].map(x => x.name).join(', ')); break;
      default: reply('Unknown command. Type /help');
    }
  }
  function runAdmin(o) { if (G.role === 'guest') Net.toKeeper({ t: 'adminCmd', o }); else adminCommand(G.me, o); }
  function setFly(on) { G.me.fly = on; G.body.v = [0, 0, 0]; showToast(on ? 'Flying! Jump to go up, Shift or the down button to go down' : 'Back on the ground', 1600); $('downBtn').classList.toggle('hidden', !on || !Device.useTouch); renderAdmin(); }

  let panelPlayer = null;
  $('adminBtn').onclick = () => { $('adminPanel').classList.toggle('hidden'); renderAdmin(); };
  function renderAdmin() {
    const box = $('adminPanel'); if (!G || box.classList.contains('hidden')) return;
    box.textContent = '';
    const head = document.createElement('div'); head.className = 'aHead'; head.innerHTML = icon('star', 18) + '<b>Admin powers</b>';
    const x = document.createElement('button'); x.className = 'iconBtn'; x.innerHTML = icon('close', 18); x.onclick = () => box.classList.add('hidden'); head.appendChild(x);
    box.appendChild(head);
    const btn = (ic, label, fn, on) => { const b = document.createElement('button'); b.className = 'aBtn' + (on ? ' on' : ''); b.innerHTML = icon(ic, 18) + '<span>' + label + '</span>'; b.onclick = fn; return b; };
    const grid = document.createElement('div'); grid.className = 'aGrid';
    grid.append(btn('fly', G.me.fly ? 'Flying' : 'Fly', () => setFly(!G.me.fly), G.me.fly), btn('sun', 'Day', () => runAdmin({ cmd: 'day' })), btn('moon', 'Night', () => runAdmin({ cmd: 'night' })), btn('clear', 'Clear chat', () => runAdmin({ cmd: 'clearchat' })));
    box.appendChild(grid);
    const row = document.createElement('div'); row.className = 'aRow';
    const inp = document.createElement('input'); inp.maxLength = 120; inp.placeholder = 'Announcement for everyone';
    row.append(inp, btn('announce', 'Send', () => { if (inp.value.trim()) { runAdmin({ cmd: 'announce', text: inp.value }); inp.value = ''; } })); box.appendChild(row);
    const t = document.createElement('div'); t.className = 'aTitle'; t.innerHTML = icon('users', 16) + ' Players'; box.appendChild(t);
    for (const p of G.players.values()) {
      if (p === G.me) continue;
      const pr = document.createElement('div'); pr.className = 'aPlayer' + (panelPlayer === p.id ? ' open' : '');
      const nm = document.createElement('button'); nm.className = 'aName';
      nm.innerHTML = '<span class="dot" style="background:' + p.color + '"></span>' + icon(p.devType || 'computer', 14);
      nm.appendChild(document.createTextNode(' ' + p.name));
      nm.onclick = () => { panelPlayer = panelPlayer === p.id ? null : p.id; renderAdmin(); };
      pr.appendChild(nm);
      if (panelPlayer === p.id) {
        const acts = document.createElement('div'); acts.className = 'aGrid';
        const muted = G.role !== 'guest' && G.muted.has(p.name.toLowerCase());
        acts.append(btn('go', 'Go to', () => runAdmin({ cmd: 'tp', target: p.id })), btn('bring', 'Bring', () => runAdmin({ cmd: 'bring', target: p.id })),
          btn('freeze', 'Freeze', () => runAdmin({ cmd: 'freeze', target: p.id })), btn('thaw', 'Unfreeze', () => runAdmin({ cmd: 'thaw', target: p.id })),
          btn(muted ? 'unmute' : 'mute', muted ? 'Unmute' : 'Mute', () => { runAdmin({ cmd: muted ? 'unmute' : 'mute', target: p.id }); setTimeout(renderAdmin, 200); }),
          btn('kick', 'Kick', () => runAdmin({ cmd: 'kick', target: p.id })), btn('ban', 'Ban', () => runAdmin({ cmd: 'ban', target: p.id })));
        const sr = document.createElement('div'); sr.className = 'aRow';
        const si = document.createElement('input'); si.maxLength = 120; si.placeholder = 'Make ' + p.name + ' say…';
        sr.append(si, btn('say', 'Say', () => { if (si.value.trim()) { runAdmin({ cmd: 'say', target: p.id, text: si.value }); si.value = ''; } }));
        pr.append(acts, sr);
      }
      box.appendChild(pr);
    }
    if (G.players.size < 2) { const e = document.createElement('div'); e.className = 'aEmpty'; e.textContent = 'Nobody else is here right now.'; box.appendChild(e); }
    if (G.bans.size) {
      const bt = document.createElement('div'); bt.className = 'aTitle'; bt.innerHTML = icon('ban', 16) + ' Banned'; box.appendChild(bt);
      for (const n of G.bans) { const r = document.createElement('div'); r.className = 'aRow'; const s = document.createElement('span'); s.textContent = n; r.append(s, btn('check', 'Unban', () => runAdmin({ cmd: 'unban', text: n }))); box.appendChild(r); }
    }
  }

  // ---------- chat & emotes ----------
  function say(p, text) {
    p.say = text; p.sayAt = performance.now();
    const row = document.createElement('div'); row.className = 'm';
    const b = document.createElement('b'); b.style.color = p.admin ? '#ffd27a' : p.color; b.textContent = (p.admin ? '★ ' : '') + p.name + ':';
    row.append(b, document.createTextNode(text)); addLog(row);
  }
  function sys(text) { const row = document.createElement('div'); row.className = 'sys'; row.textContent = text; addLog(row); }
  function announce(text) { const row = document.createElement('div'); row.className = 'ann'; row.textContent = '📢 ' + text; addLog(row); showToast('📢 ' + text, 5000); }
  function addLog(row) { const log = $('chatLog'); log.appendChild(row); while (log.children.length > 80) log.firstChild.remove(); log.scrollTop = log.scrollHeight; }
  function emote(p, e) { p.emote = e; p.emoteAt = performance.now(); }

  $('chatForm').onsubmit = e => {
    e.preventDefault();
    const text = cleanText($('chatInput').value); $('chatInput').value = '';
    $('chatInput').blur();
    if (Device.useTouch) $('chat').classList.add('hidden');
    if (!text || !G || !G.myId) return;
    if (text.startsWith('/')) { if (G.me.admin) runAdmin(G.role === 'guest' ? text : parseCommand(text)); else sys('Commands are only for the admin.'); return; }
    if (G.role === 'guest') Net.toKeeper({ t: 'chat', text });
    else { say(G.me, text); Net.toAll({ t: 'chat', id: G.myId, text }); }
  };
  $('chatToggle').onclick = () => { $('chat').classList.toggle('hidden'); if (!$('chat').classList.contains('hidden')) $('chatInput').focus(); };
  function buildEmotes() {
    const box = $('emotes'); box.textContent = '';
    for (const e of EMOTES) {
      const b = document.createElement('button'); b.textContent = e;
      b.onclick = () => { if (!G || !G.myId) return; if (G.role === 'guest') Net.toKeeper({ t: 'emote', e }); else { emote(G.me, e); Net.toAll({ t: 'emote', id: G.myId, e }); } };
      box.appendChild(b);
    }
  }

  function renderPeople() {
    const box = $('people'); if (!G) return; box.textContent = '';
    const list = [...G.players.values()].sort((a, b) => (b.admin - a.admin) || (a === G.me ? -1 : b === G.me ? 1 : 0));
    const head = document.createElement('div'); head.textContent = list.length + (list.length === 1 ? ' player online' : ' players online'); head.style.opacity = .7; box.appendChild(head);
    for (const p of list.slice(0, 10)) {
      const row = document.createElement('div'); row.className = 'p' + (p.admin ? ' admin' : '');
      const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = p.color;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = (p.admin ? '★ ' : '') + p.name + (p === G.me ? ' (you)' : '');
      const dv = document.createElement('span'); dv.className = 'dev'; dv.innerHTML = icon(p.devType || 'computer', 13); dv.appendChild(document.createTextNode(' ' + (p.dev || '')));
      row.append(dot, nm, dv); box.appendChild(row);
    }
    if (list.length > 10) { const more = document.createElement('div'); more.textContent = '+' + (list.length - 10) + ' more'; box.appendChild(more); }
    if (G.role === 'keeper') Net.toAll({ t: 'roster', roster: roster() });
    $('adminBtn').classList.toggle('hidden', !G.me.admin);
    renderAdmin();
  }

  let toastTimer;
  function showToast(t, ms) { $('toast').textContent = t; $('toast').classList.remove('hidden'); clearTimeout(toastTimer); if (ms) toastTimer = setTimeout(() => $('toast').classList.add('hidden'), ms); }

  // ---------- build tab ----------
  const CATS = ['blocks', 'machines', 'circuits'], CAT_NAMES = { blocks: 'Blocks', machines: 'Machines', circuits: 'Circuits' }, CAT_ICONS = { blocks: 'build', machines: 'gear', circuits: 'chip' };
  const toolList = () => [...TOOL_CATS[G.cat], 0];
  const curTool = () => toolList()[G.tool];
  function nextCat() { G.cat = CATS[(CATS.indexOf(G.cat) + 1) % CATS.length]; G.tool = 0; G.wireFrom = null; buildHotbar(); selectTool(0); }
  function buildHotbar() {
    const bar = $('hotbar'); bar.textContent = '';
    const tab = document.createElement('button'); tab.className = 'tab';
    tab.innerHTML = icon(CAT_ICONS[G.cat], 20) + '<span>' + CAT_NAMES[G.cat] + '</span>';
    tab.onclick = nextCat; bar.appendChild(tab);
    toolList().forEach((k, i) => {
      const b = document.createElement('button');
      if (k === 'wire' || k === 'cut' || k === 0) { const x = document.createElement('span'); x.className = 'x'; x.innerHTML = icon(k === 0 ? 'pick' : k, 22); b.appendChild(x); b.title = k === 0 ? 'Break' : k === 'wire' ? 'Wire tool' : 'Cut wires'; }
      else { b.title = PARTS[k].name; b.appendChild(partSwatch(k)); }
      if (!Device.useTouch && i < 10) { const key = document.createElement('span'); key.className = 'k'; key.textContent = (i + 1) % 10; b.appendChild(key); }
      b.onclick = () => { selectTool(i); if (Device.useTouch && !G.building) toggleBuild(true); };
      bar.appendChild(b);
    });
    selectTool(Math.min(G.tool, toolList().length - 1), true);
  }
  // little drawn previews of each part for the build tab
  function partSwatch(k) {
    const P = PARTS[k], s = document.createElement('span'); s.className = 'sw';
    const top = P.top || P.color, side = P.color;
    s.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28">' + (P.ramp
      ? '<path d="M3 20 L21 20 L21 6 Z" fill="' + side + '" stroke="rgba(0,0,0,.35)" stroke-width="1"/><path d="M3 20 L21 6" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>'
      : P.slab && P.slab < 0.6 ? '<path d="M3 14 L12 9 L21 14 L12 19 Z" fill="' + top + '"/><path d="M3 14 L3 17 L12 22 L12 19 Z" fill="' + side + '" opacity=".85"/><path d="M21 14 L21 17 L12 22 L12 19 Z" fill="' + side + '" opacity=".65"/>'
      : '<path d="M3 8 L12 3 L21 8 L12 13 Z" fill="' + top + '"/><path d="M3 8 L3 17 L12 22 L12 13 Z" fill="' + side + '" opacity=".85"/><path d="M21 8 L21 17 L12 22 L12 13 Z" fill="' + side + '" opacity=".6"/>') + '</svg>';
    if (P.glass) s.style.opacity = .7;
    return s;
  }
  function selectTool(i, quiet) {
    G.tool = i; G.wireFrom = null; [...$('hotbar').children].slice(1).forEach((b, j) => b.classList.toggle('on', j === i));
    const k = curTool(); if (quiet) return;
    showToast(k === 0 ? 'Break: tap a part you built' : k === 'wire' ? 'Wire tool: tap one part, then another to connect them' : k === 'cut' ? 'Cut wires: tap a part to remove its wires' : PARTS[k].name + (PARTS[k].tip ? ': ' + PARTS[k].tip : ''), 2200);
  }
  function toggleBuild(on) { G.building = on ?? !G.building; document.body.classList.toggle('building', G.building); $('buildToggle').classList.toggle('on', G.building); $('buildToggle').innerHTML = icon(G.building ? 'check' : 'build', 24) + '<span>' + (G.building ? 'Done' : 'Build') + '</span>'; }
  $('buildToggle').onclick = () => toggleBuild();

  // which way parts face: the way the camera looks
  function facing() { const f = G.game.forward(); let best = 0, bd = -2; DIRS.forEach((d, i) => { const v = d[0] * f[0] + d[1] * f[1]; if (v > bd) { bd = v; best = i; } }); return best; }
  function target(sx, sy, mode) {
    const hit = G.game.pick(sx, sy, G.me.admin ? 90 : 34); if (!hit) return null;
    let cell;
    if (mode !== 'place') { if (!hit.part) return null; cell = hit.part; }
    else if (hit.part) cell = [hit.part[0] + hit.n[0], hit.part[1] + hit.n[1], hit.part[2] + hit.n[2]];
    else cell = [Math.floor(hit.p[0] + hit.n[0] * 0.5), Math.floor(hit.p[1] + hit.n[1] * 0.5 + 0.02), Math.floor(hit.p[2] + hit.n[2] * 0.5)];
    const reach = Math.hypot(cell[0] + 0.5 - G.body.p[0], cell[1] + 0.5 - G.body.p[1], cell[2] + 0.5 - G.body.p[2]);
    const t = { cell, ok: canBuildHere(...cell, G.me) && (G.me.admin || reach <= REACH) };
    t.why = canBuildHere(...cell, G.me) ? null : nearStation(cell[0] + 0.5, cell[2] + 0.5) ? 'Nobody can build or break at the abandoned station' : 'The spawn area is protected. Roll a bit further out to build!';
    if (mode === 'place' && t.ok) {
      if (G.B.get(...cell)) t.ok = false;
      for (const p of G.players.values()) { const r = p.r || 0.45; const cx = Math.max(cell[0], Math.min(cell[0] + 1, p.p[0])), cy = Math.max(cell[1], Math.min(cell[1] + 1, p.p[1])), cz = Math.max(cell[2], Math.min(cell[2] + 1, p.p[2])); if (Math.hypot(p.p[0] - cx, p.p[1] - cy, p.p[2] - cz) < r) t.ok = false; }
    }
    return t;
  }
  const send = msg => { if (G.role === 'guest') Net.toKeeper(msg); else Net.toAll(msg); };
  function edit(sx, sy, breaking) {
    if (!G.myId) return;
    const k = breaking ? 0 : curTool();
    if (k === 'wire' || k === 'cut') {
      const t = target(sx, sy, 'pick'); if (!t) { G.wireFrom = null; return; }
      const key = pkey(...t.cell);
      if (k === 'cut') { const list = G.B.wiresOf(key); for (const o of list) applyWire(key, o, false); if (G.role === 'guest') Net.toKeeper({ t: 'wire', a: key, add: false }); else for (const o of list) Net.toAll({ t: 'wire', a: key, b: o, add: false }); showToast('Wires cut', 900); return; }
      if (!G.wireFrom) { G.wireFrom = t.cell; showToast('Now tap the part to connect it to', 1500); return; }
      const a = pkey(...G.wireFrom); G.wireFrom = null; if (a === key) return;
      if (G.role === 'guest') Net.toKeeper({ t: 'wire', a, b: key, add: true }); else { applyWire(a, key, true); Net.toAll({ t: 'wire', a, b: key, add: true }); }
      showToast('Connected!', 900); return;
    }
    const t = target(sx, sy, k === 0 ? 'pick' : 'place'); if (!t) return;
    if (!t.ok) { if (t.why) showToast(t.why, 1500); return; }
    const r = facing();
    if (G.role === 'guest') Net.toKeeper({ t: 'block', x: t.cell[0], y: t.cell[1], z: t.cell[2], k, r });
    else { applyBlock(...t.cell, k, r); Net.toAll({ t: 'block', x: t.cell[0], y: t.cell[1], z: t.cell[2], k, r }); }
    if (G.role === 'guest') applyBlock(...t.cell, k, r);
  }

  // ---------- input ----------
  const keys = new Set(); const stick = { x: 0, y: 0, id: null }; let mouse = null, jumpHeld = false, downHeld = false;
  addEventListener('keydown', e => {
    if (!G || !G.myId) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') { if (e.key === 'Escape') document.activeElement.blur(); return; }
    if (e.key === 'Enter' || e.key === '/') { e.preventDefault(); $('chat').classList.remove('hidden'); $('chatInput').focus(); if (e.key === '/') $('chatInput').value = '/'; return; }
    if (/^[0-9]$/.test(e.key)) { const i = (+e.key + 9) % 10; if (i < toolList().length) selectTool(i); return; }
    if (e.key === '-' || e.key === '=') { const n = toolList().length; selectTool((G.tool + (e.key === '=' ? 1 : n - 1)) % n); return; }
    const k = e.key.toLowerCase();
    if (k === 'f' && G.me.admin) { setFly(!G.me.fly); return; }
    if (k === 'tab') { e.preventDefault(); nextCat(); return; }
    if (k === 'i' || k === 'b') { $('bagBtn').click(); return; }
    if (k === 'r') { respawn(); return; }
    if (k === ' ') e.preventDefault();
    keys.add(k);
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  // drag to look around, click or tap to build
  const cv = $('ov'); const drags = new Map();
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (!G || !G.myId) return;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    drags.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0, btn: e.button });
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') mouse = { x: e.clientX, y: e.clientY };
    const d = drags.get(e.pointerId); if (!d || !G) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.moved > 6) { G.game.cam.yaw -= dx * 0.008; G.game.cam.pitch = Math.max(-0.2, Math.min(1.35, G.game.cam.pitch + dy * 0.006)); }
  });
  const endDrag = e => {
    const d = drags.get(e.pointerId); drags.delete(e.pointerId); if (!d || !G || !G.myId) return;
    if (d.moved > 6 || e.type === 'pointercancel') return;
    if (e.pointerType === 'mouse') edit(e.clientX, e.clientY, d.btn === 2 || e.shiftKey);
    else if (G.building) edit(e.clientX, e.clientY, curTool() === 0);
  };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', () => { mouse = null; });
  addEventListener('wheel', e => { if (!G || !G.myId || e.target !== cv) return; G.game.cam.dist = Math.max(3, Math.min(18, G.game.cam.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: true });

  const st = $('stick'), knob = $('knob');
  st.addEventListener('pointerdown', e => { stick.id = e.pointerId; st.setPointerCapture(e.pointerId); moveStick(e); });
  st.addEventListener('pointermove', e => { if (e.pointerId === stick.id) moveStick(e); });
  const endStick = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  st.addEventListener('pointerup', endStick); st.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    const r = st.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - r.left - R, dy = e.clientY - r.top - R; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; stick.x = dx / R; stick.y = dy / R;
  }
  const hold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); on(); }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, off); };
  hold('jumpBtn', () => jumpHeld = true, () => jumpHeld = false);
  hold('downBtn', () => downHeld = true, () => downHeld = false);
  $('downBtn').innerHTML = icon('down', 24);

  function onResize() { if (G && G.game) G.game.resize(); document.body.classList.toggle('small', innerWidth < 600); }
  addEventListener('resize', onResize);

  // ---------- activities ----------
  function activities(now) {
    const b = G.body, game = G.game;
    for (const it of game.nearbyItems(b.p)) { // pick up items you roll into
      if (Math.abs(it.p[0] - b.p[0]) > 1.4 || Math.abs(it.p[2] - b.p[2]) > 1.4 || Math.abs(it.p[1] - b.p[1]) > 1.6) continue;
      if (it.type === 'trophy') { if (!G.inv.trophy) { gotItem('trophy'); sys('🏆 You beat the parkour climb!'); } continue; }
      if (G.taken.has(it.id) || G.asked === it.id) continue;
      G.asked = it.id; setTimeout(() => { if (G && G.asked === it.id) G.asked = null; }, 800);
      if (G.role === 'guest') Net.toKeeper({ t: 'take', id: it.id, type: it.type }); else tryTake(G.me, it.id, it.type);
    }
    // parkour checkpoints
    for (const cp of game.landmarks[1].checkpoints) if (Math.hypot(b.p[0] - cp[0], b.p[1] - cp[1], b.p[2] - cp[2]) < 2 && G.lastSpawnPad !== cp.join()) { G.lastSpawnPad = cp.join(); G.spawn = [...cp]; store.set('spawn4', JSON.stringify(G.spawn)); showToast('Checkpoint! You\'ll respawn here', 1500); }
    const rs = game.raceStart; // ring race
    if (!G.race && now > G.raceCool && Math.hypot(b.p[0] - rs[0], b.p[2] - rs[2]) < 1.6 && Math.abs(b.p[1] - rs[1]) < 2) {
      G.race = { next: 0, start: now }; showToast('Race! Roll through all 12 rings', 2200);
    }
    if (G.race) {
      const r = game.rings[G.race.next], nx = Math.sin(r.yaw), nz = Math.cos(r.yaw);
      const dx = b.p[0] - r.x, dy = b.p[1] - r.y, dz = b.p[2] - r.z, along = dx * nx + dz * nz;
      const off = Math.hypot(dx - along * nx, dy, dz - along * nz);
      if (Math.abs(along) < 0.9 && off < 1.7) {
        G.race.next++;
        if (G.race.next >= game.rings.length) {
          const time = (now - G.race.start) / 1000; G.race = null; G.raceCool = now + 4000;
          showToast('Finished in ' + time.toFixed(2) + 's!', 3500);
          if (G.role === 'guest') Net.toKeeper({ t: 'race', time }); else recordRace(G.me.name, time);
        } else showToast('Ring ' + G.race.next + '/12', 700);
      }
      if (G.race && now - G.race.start > 6 * 60 * 1000) { G.race = null; showToast('Race timed out', 1500); }
    }
    game.triggers(b, fx);
    if (G.role !== 'guest') for (const [id, at] of G.taken) if (at && Date.now() > at) { G.taken.delete(id); Net.toAll({ t: 'back', id }); }
  }
  function fx(kind, arg) {
    if (kind === 'tp') showToast('Whoosh! Teleported', 900);
    else if (kind === 'tp-alone') showToast('Use the wire tool (Circuits tab) to connect this teleporter to another one', 2500);
    else if (kind === 'cave-in') showToast('You found a cave! Look for gems and crystals. The gold ring takes you back up', 3500);
    else if (kind === 'cave-out') showToast('Back outside!', 1200);
    else if (kind === 'spawn') {
      const k = arg.join(','); if (G.lastSpawnPad === k) return; G.lastSpawnPad = k;
      G.spawn = [arg[0] + 0.5, arg[1] + 1.5, arg[2] + 0.5]; store.set('spawn4', JSON.stringify(G.spawn)); showToast('Spawn point set!', 1500);
    }
  }

  if (new URLSearchParams(location.search).has('debug')) window.__funz = () => G;

  // ---------- loop ----------
  let last = performance.now();
  function loop(now) {
    if (!G || !G.running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const m = G.me, b = G.body, cam = G.game.cam;
    for (const k in G.effects) if (G.effects[k] < now) delete G.effects[k];
    let ix = 0, iy = 0;
    if (keys.has('a') || keys.has('arrowleft')) ix--; if (keys.has('d') || keys.has('arrowright')) ix++;
    if (keys.has('w') || keys.has('arrowup')) iy--; if (keys.has('s') || keys.has('arrowdown')) iy++;
    if (keys.has('q')) cam.yaw += dt * 2; if (keys.has('e')) cam.yaw -= dt * 2;
    if (stick.id !== null) { ix = stick.x; iy = stick.y; }
    if (G.frozen) ix = iy = 0;
    if (m.fly && !m.admin) m.fly = false;
    const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
    const f = G.game.forward(), rt = [-f[1], f[0]], go = l > 0.12 ? 1 : 0;
    const input = { x: (rt[0] * ix - f[0] * iy) * go, z: (rt[1] * ix - f[1] * iy) * go,
      jump: !G.frozen && (keys.has(' ') || jumpHeld), up: keys.has(' ') || jumpHeld, down: keys.has('shift') || downHeld };
    G.game.step(b, input, dt, { fly: m.fly, big: !!G.effects.big, fast: !!G.effects.fast, superJump: !!G.effects.superJump, fx });
    if (b.p[1] < -780 || (b.p[1] < -60 && b.p[1] > -150) || (G.game.cave && b.p[1] < G.game.cave.o[1] - 30)) { respawn(); showToast('Oops! Back to your spawn point', 1500); }
    m.p = b.p; m.R = b.R; m.r = b.r; m.tp = b.p; m.glow = !!G.effects.glow; m.big = !!G.effects.big;
    const a = 1 - Math.pow(0.0008, dt); // others glide to where they are and roll
    for (const p of G.players.values()) if (p !== m) {
      const ox = p.p[0], oz = p.p[2];
      for (let i = 0; i < 3; i++) p.p[i] += (p.tp[i] - p.p[i]) * a;
      const tr = p.big ? 0.8 : 0.45; p.r = (p.r || 0.45) + (tr - (p.r || 0.45)) * Math.min(1, dt * 6);
      G.game.rollBy(p, p.p[0] - ox, p.p[2] - oz, p.r);
    }
    activities(now);
    G.game.animParts(dt);
    if (G.role !== 'guest' && now - G.lastCirc > 100) { // the keeper runs all the circuits
      G.lastCirc = now;
      if (G.circ.step([...G.players.values()].map(p => p.p))) { G.game.setPower(new Set(G.circ.on)); sendPower(); G.dirty = true; }
    }
    G.game.updateCreatures(dt, m, [...G.players.values()], G.wasNight);

    if (G.role === 'guest' && G.myId && now - G.lastSend > 66) {
      G.lastSend = now; Net.toKeeper({ t: 'pos', p: b.p.map(v => +v.toFixed(2)), fl: !!m.fly, big: m.big, gl: m.glow });
      if (now - G.lastHeard > 6000) reconnect();
    }
    if (G.role === 'keeper' && now - G.lastState > 66) {
      G.lastState = now;
      Net.toAll({ t: 'state', phase: dayPhase(), p: [...G.players.values()].map(p => [p.id, +p.p[0].toFixed(2), +p.p[1].toFixed(2), +p.p[2].toFixed(2), !!p.fly, !!p.big, !!p.glow]) });
    }

    const ph = dayPhase(), sun = Math.cos(ph * Math.PI * 2);
    const dark = Math.max(0, Math.min(0.72, (-sun + 0.15) * 0.85));
    const hrs = (ph * 24 + 12) % 24;
    const night = dark > 0.3; if (night !== G.wasNight) { G.wasNight = night; $('clockIc').innerHTML = icon(night ? 'moon' : 'sun', 15); }
    $('clockT').textContent = String(Math.floor(hrs)).padStart(2, '0') + ':' + String(Math.floor((hrs % 1) * 60)).padStart(2, '0');
    const chips = Object.entries(G.effects).map(([k, t]) => ({ fast: 'Speed', big: 'Big', superJump: 'Super jump', glow: 'Glow' }[k] + ' ' + Math.ceil((t - now) / 1000) + 's'));
    if (G.race) chips.unshift('Race ' + ((now - G.race.start) / 1000).toFixed(1) + 's · ring ' + (G.race.next + 1) + '/12');
    const ct = chips.join('  ·  '); if ($('effects').textContent !== ct) $('effects').textContent = ct;
    $('effects').classList.toggle('hidden', !ct);

    G.game.updateCamera(b.p, dt);
    let cursor = null;
    if (mouse && G.myId && !drags.size && G.building) { const k = curTool(); const t = target(mouse.x, mouse.y, k === 0 || k === 'wire' || k === 'cut' ? 'pick' : 'place'); if (t) cursor = t; }
    const items = G.game.nearbyItems(b.p).filter(it => !G.taken.has(it.id) && !(it.type === 'trophy' && G.inv.trophy));
    G.game.render([...G.players.values()], m, { now, dark, sunAngle: ph * Math.PI * 2 + Math.PI / 2, cursor, items, race: G.race, wireFrom: G.wireFrom, budget: Device.type === 'phone' ? 7 : 10 });
    requestAnimationFrame(loop);
  }
})();
