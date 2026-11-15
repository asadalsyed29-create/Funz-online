// Funz Online: one shared peaceful world. Menus, controls, game loop,
// the world-keeper rules, saving, and admin tools.
(() => {
  const $ = id => document.getElementById(id);
  const COLORS = ['#48d6ac', '#5aa9ff', '#ff7a8a', '#ffc45a', '#b48cff', '#ff9f5a', '#e8eef7', '#7be36b'];
  const EMOTES = ['👋', '❤️', '😂', '🔥', '✨', '👍'];
  const SEED = 20261115;                 // the world is always the same island
  const MAX_PLAYERS = 30, MAX_EDITS = 40000, SPEED = 165, REACH = 6, DAY_MS = 8 * 60 * 1000;
  const ADMIN_PUB = { kty: 'EC', crv: 'P-256', x: 'ElMxPCYM-fDGDUiwud0eo8Uojz3sEaSeyzh6w_nW2Rk', y: 'Z0isPmpbPF-0J9BpskcpSe9tvLWSjF1ZCF6VlIWS9yo' };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('funz.' + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('funz.' + k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem('funz.' + k); } catch (e) {} },
  };

  // ---------- menu ----------
  document.body.classList.toggle('touch', Device.useTouch);
  $('deviceBadge').innerHTML = icon(Device.type, 16) + ' '; $('deviceBadge').appendChild(document.createTextNode('You are on: ' + Device.short));
  const nameInput = $('nameInput');
  nameInput.value = store.get('name', '');
  let myColor = store.get('color', COLORS[Math.floor(Math.random() * COLORS.length)]);
  let myHat = store.get('hat', 'none'); if (!HATS[myHat]) myHat = 'none';

  // Special items: the crown and the name Outernautica can't be picked anymore,
  // but anyone who already had them keeps them in their wardrobe forever.
  const RESERVED_HATS = ['crown'];
  const reservedName = n => n.toLowerCase().replace(/[^a-z]/g, '').includes('outernautica');
  // The owner pass comes from a secret one-time unlock link. Whoever has it owns
  // the crown and the name Outernautica, and is the admin.
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
  function drawPreview() {
    const c = $('avatarPreview'), g = c.getContext('2d'), dpr = 2;
    c.width = 160 * dpr; c.height = 120 * dpr; g.setTransform(dpr * 2.2, 0, 0, dpr * 2.2, 0, 0);
    drawAvatar(g, 160 / 4.4, 120 / 4.4 + 6, myColor, myHat, 0, Math.PI / 2);
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
  const myName = () => {
    const n = cleanName(nameInput.value) || 'Explorer' + Math.floor(Math.random() * 900 + 100);
    if (reservedName(n) && !owned.has('name:outernautica')) { menuMsg('That name is special and can\'t be used. Pick another one!'); return null; }
    nameInput.value = n; store.set('name', n); return n;
  };
  const menuMsg = t => { $('menuMsg').textContent = t || ''; };

  $('chatToggle').innerHTML = icon('chat', 24);
  $('leaveBtn').innerHTML = icon('leave', 15) + ' Leave';
  $('adminBtn').innerHTML = icon('star', 15) + ' Admin';
  $('playBtn').onclick = () => play();
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') play(); });

  // install
  let installEvt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (!Device.standalone) $('installBtn').classList.remove('hidden'); });
  $('installBtn').onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('installBtn').classList.add('hidden'); };
  addEventListener('appinstalled', () => $('installBtn').classList.add('hidden'));
  if ((Device.os === 'iPhone' || Device.os === 'iPad') && !Device.standalone) $('iosHint').classList.remove('hidden');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

  // ---------- admin crypto ----------
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
  const me = () => G && G.me;

  function loadSave() { try { return JSON.parse(store.get('world', '{}')).edits || []; } catch (e) { return []; } }
  function loadBans() { try { return JSON.parse(store.get('world', '{}')).bans || []; } catch (e) { return []; } }
  function saveWorld() { if (!G || !G.world || !G.dirty) return; G.dirty = false; store.set('world', JSON.stringify({ t: Date.now(), edits: G.world.editList(), bans: [...G.bans] })); }
  setInterval(saveWorld, 8000);
  addEventListener('pagehide', saveWorld);

  async function play() {
    const name = myName();
    if (!name) return;
    $('playBtn').disabled = true; menuMsg('Entering the world…');
    G = {
      role: null, myId: null, players: new Map(), world: new World(SEED), r: null,
      tool: 0, building: !Device.useTouch, dayStart: performance.now() - DAY_MS * 0.875,
      lastSend: 0, lastState: 0, lastHeard: performance.now(), rate: new Map(), running: true, dirty: false,
      muted: new Set(), kicked: new Map(), bans: new Set(loadBans()), frozen: false, nonces: new Map(), reconnecting: false,
      profile: { name, color: myColor, hat: myHat, dev: Device.short, devType: Device.type },
    };
    G.world.loadEdits(loadSave());
    G.r = new Renderer($('game'), G.world);
    const s = G.world.spawn();
    G.me = { id: 'me', ...G.profile, x: s.x + (Math.random() - .5) * 80, y: s.y + (Math.random() - .5) * 80, dir: Math.PI / 2, moving: false };
    G.me.tx = G.me.x; G.me.ty = G.me.y;
    await connectWorld(true);
  }

  async function connectWorld(first) {
    let role;
    try { role = await Net.connect(); }
    catch (e) {
      if (!G) return;
      role = 'offline';
    }
    if (!G) { Net.leave(); return; }
    G.role = role; G.lastHeard = performance.now();
    if (role === 'guest') {
      Net.toKeeper({ t: 'hello', ...G.profile, x: Math.round(G.me.x), y: Math.round(G.me.y) });
      return; // the rest happens when "welcome" arrives
    }
    // keeper or offline: this browser runs the world
    G.myId = 'keeper'; G.me.id = 'keeper';
    G.players.clear(); G.players.set('keeper', G.me);
    G.me.admin = !!(await adminSign(store.get('pass', ''), 'self-' + Math.random()));
    if (first) enterGame();
    G.reconnecting = false;
    renderPeople();
    if (role === 'offline') { $('roomLabel').innerHTML = '<i class="live off"></i>Offline'; sys('Could not reach the world, so you are exploring offline. Your builds are saved on this device.'); }
    else { $('roomLabel').innerHTML = '<i class="live"></i>Online'; sys(first ? 'Welcome to Funz Online! You are the first one here, more people can join any time.' : 'Back online.'); }
  }

  function addPlayer(p) {
    const pl = Object.assign({ dir: Math.PI / 2, moving: false }, p);
    pl.tx = pl.x; pl.ty = pl.y;
    G.players.set(p.id, pl);
    return pl;
  }

  function enterGame() {
    $('menu').classList.add('hidden'); $('playBtn').disabled = false; menuMsg('');
    $('hud').classList.remove('hidden'); $('chat').classList.remove('hidden'); $('toast').classList.add('hidden');
    if (Device.useTouch) { $('touch').classList.remove('hidden'); $('buildToggle').classList.remove('hidden'); $('chatToggle').classList.remove('hidden'); $('chat').classList.add('hidden'); }
    buildHotbar(); buildEmotes(); selectTool(0, true); toggleBuild(G.building);
    $('adminBtn').classList.toggle('hidden', !G.me.admin);
    onResize(); last = performance.now();
    requestAnimationFrame(loop);
  }

  function leave(msg) {
    if (!G) return;
    saveWorld(); G.running = false; Net.leave(); G = null;
    ['hud', 'chat', 'touch', 'chatToggle', 'buildToggle'].forEach(id => $(id).classList.add('hidden'));
    $('chatLog').textContent = '';
    $('menu').classList.remove('hidden'); $('playBtn').disabled = false; menuMsg(msg || '');
  }
  $('leaveBtn').onclick = () => leave();

  // the keeper went away: someone takes over and everyone reconnects
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
  function allow(id, kind, per, ms) {
    const k = id + kind, now = performance.now(), list = (G.rate.get(k) || []).filter(t => now - t < ms);
    if (list.length >= per) { G.rate.set(k, list); return false; }
    list.push(now); G.rate.set(k, list); return true;
  }
  const publicP = p => ({ id: p.id, name: p.name, color: p.color, hat: p.hat, dev: p.dev, devType: p.devType, admin: !!p.admin, fly: !!p.fly, x: Math.round(p.tx), y: Math.round(p.ty) });
  const roster = () => [...G.players.values()].map(publicP);
  const dayPhase = () => ((performance.now() - G.dayStart) / DAY_MS) % 1;
  const findPlayer = name => { name = (name || '').toLowerCase().replace(/^@/, ''); return [...G.players.values()].find(p => p.name.toLowerCase() === name) || [...G.players.values()].find(p => p.name.toLowerCase().startsWith(name)); };

  function keeperGot(id, m) {
    const p = G.players.get(id);
    if (m.t === 'hello') {
      if (p) return;
      const wantName = cleanName(m.name) || 'Explorer';
      const name = reservedName(wantName) ? 'Explorer' + Math.floor(Math.random() * 900 + 100) : wantName; // shown after the owner pass is checked
      const ban = G.kicked.get(wantName.toLowerCase());
      if (G.bans.has(wantName.toLowerCase())) { Net.toOne(id, { t: 'banned' }); Net.drop(id); return; }
      if (ban && ban > Date.now()) { Net.toOne(id, { t: 'kicked' }); Net.drop(id); return; }
      if (G.players.size >= MAX_PLAYERS) { Net.toOne(id, { t: 'full' }); Net.drop(id); return; }
      const s = G.world.spawn();
      const np = addPlayer({ id, name, color: COLORS.includes(m.color) ? m.color : COLORS[0], hat: HATS[m.hat] && !RESERVED_HATS.includes(m.hat) ? m.hat : 'none', wantName, wantHat: HATS[m.hat] ? m.hat : 'none',
        dev: cleanText(m.dev).slice(0, 40), devType: ['phone', 'tablet', 'computer'].includes(m.devType) ? m.devType : '',
        x: num(m.x, 0, WORLD * TILE) ?? s.x, y: num(m.y, 0, WORLD * TILE) ?? s.y });
      const nonce = Math.random().toString(36).slice(2) + Date.now(); G.nonces.set(id, nonce);
      Net.toOne(id, { t: 'welcome', id, edits: G.world.editList(), bans: [...G.bans], phase: dayPhase(), roster: roster(), nonce });
      renderPeople();
      const msg = np.name + ' joined (' + np.dev + ')'; sys(msg); Net.toAll({ t: 'sys', text: msg }, id);
      return;
    }
    if (!p) return;
    if (m.t === 'pos') {
      const x = num(m.x, 0, WORLD * TILE), y = num(m.y, 0, WORLD * TILE);
      if (x == null || y == null) return;
      p.tx = x; p.ty = y; p.dir = num(m.d, -10, 10) ?? p.dir; p.moving = !!m.mv; p.fly = !!m.fl && !!p.admin;
    } else if (m.t === 'admin') {
      const nonce = G.nonces.get(id); G.nonces.delete(id);
      if (nonce && typeof m.sig === 'string') adminVerify(nonce, m.sig).then(ok => { if (ok && G && G.players.get(id) === p) { p.admin = true; p.name = p.wantName; p.hat = p.wantHat; renderPeople(); sys('★ ' + p.name + ' is the admin'); Net.toAll({ t: 'sys', text: '★ ' + p.name + ' is the admin' }); } });
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
      const x = m.x, y = m.y, k = m.k;
      if (!Number.isInteger(x) || !Number.isInteger(y) || !G.world.inside(x, y) || !(k === 0 || (BLOCKS[k] && k < 20))) return;
      if (!allow(id, 'b', 15, 1000)) return;
      if (!p.admin && Math.hypot(x * TILE + 16 - p.tx, y * TILE + 16 - p.ty) > (REACH + 2) * TILE) return;
      if (k !== 0 && G.world.edits.size >= MAX_EDITS && !G.world.edits.has(x + ',' + y)) return;
      applyBlock(x, y, k); Net.toAll({ t: 'block', x, y, k });
    } else if (m.t === 'adminCmd') {
      if (p.admin) adminCommand(p, typeof m.o === 'string' ? cleanText(m.o) : m.o);
    }
  }

  function guestGot(m, self) {
    if (m.t === 'freeze') { G.frozen = !!m.on; showToast(m.on ? 'The admin froze you' : 'You can move again', 1800); return; }
    if (m.t === 'tp') { const x = num(m.x, 0, WORLD * TILE), y = num(m.y, 0, WORLD * TILE); if (x != null && y != null) { G.me.x = x; G.me.y = y; } return; }
    if (self) { if (m.t === 'sys') sys(cleanText(m.text)); return; }
    if (m.t === 'welcome') {
      const first = !G.myId;
      G.myId = m.id; G.me.id = m.id;
      G.world.loadEdits(m.edits || []); G.dirty = true;
      G.bans = new Set((m.bans || []).filter(b => typeof b === 'string'));
      G.r.chunks.clear(); G.r.order.length = 0; G.r.drawMinimapBase();
      G.dayStart = performance.now() - m.phase * DAY_MS;
      G.players.clear(); G.players.set(m.id, G.me);
      for (const r of m.roster) if (r.id !== m.id) addPlayer(r);
      G.me.admin = false;
      adminSign(store.get('pass', ''), m.nonce).then(sig => { if (sig) Net.toKeeper({ t: 'admin', sig }); });
      $('roomLabel').innerHTML = '<i class="live"></i>Online';
      if (first && !G.running2) { G.running2 = true; enterGame(); sys('Welcome to Funz Online! ' + (m.roster.length - 1) + ' other ' + (m.roster.length === 2 ? 'player is' : 'players are') + ' here.'); }
      else { showToast('Back online!', 1500); }
      G.reconnecting = false; renderPeople();
      return;
    }
    if (!G.myId) { if (m.t === 'full') leave('The world is full right now (' + MAX_PLAYERS + ' players). Try again soon!'); if (m.t === 'kicked') leave('The admin removed you from the world for a while.'); if (m.t === 'banned') leave('You are banned from this world.'); return; }
    if (m.t === 'roster') {
      const ids = new Set(m.roster.map(r => r.id));
      for (const id of [...G.players.keys()]) if (!ids.has(id)) G.players.delete(id);
      for (const r of m.roster) { const p = G.players.get(r.id); if (!p) addPlayer(r); else if (p !== G.me) Object.assign(p, { admin: r.admin, name: r.name, hat: r.hat }); else p.admin = r.admin; }
      renderPeople();
    } else if (m.t === 'state') {
      G.dayStart = performance.now() - m.phase * DAY_MS;
      for (const [id, x, y, d, mv, fl] of m.p) { const p = G.players.get(id); if (p && p !== G.me) { p.tx = x; p.ty = y; p.dir = d; p.moving = mv; p.fly = fl; } }
    } else if (m.t === 'bye') { const p = G.players.get(m.id); if (p) { sys(p.name + ' left'); G.players.delete(m.id); renderPeople(); } }
    else if (m.t === 'chat') { const p = G.players.get(m.id); if (p) say(p, cleanText(m.text)); }
    else if (m.t === 'emote') { const p = G.players.get(m.id); if (p && EMOTES.includes(m.e)) emote(p, m.e); }
    else if (m.t === 'block') { if (Number.isInteger(m.x) && Number.isInteger(m.y)) applyBlock(m.x, m.y, m.k); }
    else if (m.t === 'sys') sys(cleanText(m.text));
    else if (m.t === 'announce') announce(cleanText(m.text));
    else if (m.t === 'bans') { G.bans = new Set((m.list || []).filter(b => typeof b === 'string')); G.dirty = true; renderAdmin(); }
    else if (m.t === 'clearchat') $('chatLog').textContent = '';
    else if (m.t === 'banned') { leave('You are banned from this world.'); }
    else if (m.t === 'kicked') { G.kickedSelf = true; leave('The admin removed you from the world for a while.'); }
  }

  function applyBlock(x, y, k) {
    if (!G.world.set(x, y, k)) return;
    G.dirty = true; G.r.invalidate(x, y);
  }

  // ---------- admin ----------
  // Commands come from the admin panel ({cmd, target, text}) or from chat ("/kick name").
  function parseCommand(text) {
    const [cmd, ...rest] = text.slice(1).split(' ');
    const c = (cmd || '').toLowerCase(), args = rest.join(' ').trim();
    if (['say'].includes(c)) { const [n, ...t] = rest; const p = findPlayer(n); return { cmd: c, target: p && p.id, text: t.join(' '), who: n }; }
    if (['announce'].includes(c)) return { cmd: c, text: args };
    if (['unban'].includes(c)) return { cmd: c, text: args };
    const p = args ? findPlayer(args) : null;
    return { cmd: c, target: p && p.id, who: args };
  }
  function adminCommand(admin, o) {
    if (typeof o === 'string') o = parseCommand(o);
    if (!o || typeof o !== 'object') return;
    const reply = t => { if (admin === G.me) sys(t); else Net.toOne(admin.id, { t: 'sys', text: t }); };
    const tell = (p, msg) => { if (p === G.me) guestGot(msg, true); else Net.toOne(p.id, msg); };
    const both = (text) => { sys(text); Net.toAll({ t: 'sys', text }); };
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
        renderPeople(); renderAdmin(); both(p.name + (o.cmd === 'ban' ? ' was banned' : ' was kicked') + ' by the admin'); break; }
      case 'unban': { const k = text.toLowerCase(); if (G.bans.delete(k)) { G.dirty = true; Net.toAll({ t: 'bans', list: [...G.bans] }); reply(text + ' is not banned anymore'); renderAdmin(); } else reply(text + ' was not banned'); break; }
      case 'mute': if (p.admin) break; G.muted.add(p.name.toLowerCase()); tell(p, { t: 'sys', text: 'The admin muted you.' }); reply(p.name + ' is muted'); break;
      case 'unmute': G.muted.delete(p.name.toLowerCase()); tell(p, { t: 'sys', text: 'You can chat again.' }); reply(p.name + ' can chat again'); break;
      case 'freeze': if (p.admin) break; tell(p, { t: 'freeze', on: true }); reply(p.name + ' is frozen'); break;
      case 'thaw': tell(p, { t: 'freeze', on: false }); reply(p.name + ' can move again'); break;
      case 'tp': tell(admin, { t: 'tp', x: p.tx, y: p.ty + 30 }); break;
      case 'bring': if (p !== admin) tell(p, { t: 'tp', x: admin.tx, y: admin.ty + 30 }); break;
      case 'day': G.dayStart = performance.now() - DAY_MS * 0.0; both('The admin made it day'); break;
      case 'night': G.dayStart = performance.now() - DAY_MS * 0.5; both('The admin made it night'); break;
      case 'clearchat': $('chatLog').textContent = ''; Net.toAll({ t: 'clearchat' }); both('The admin cleared the chat'); break;
      case 'players': reply([...G.players.values()].map(x => x.name).join(', ')); break;
      default: reply('Unknown command. Type /help');
    }
  }
  function runAdmin(o) { if (G.role === 'guest') Net.toKeeper({ t: 'adminCmd', o }); else adminCommand(G.me, o); }

  // admin panel
  let panelPlayer = null;
  $('adminBtn').onclick = () => { $('adminPanel').classList.toggle('hidden'); renderAdmin(); };
  function renderAdmin() {
    const box = $('adminPanel'); if (!G || box.classList.contains('hidden')) return;
    box.textContent = '';
    const head = document.createElement('div'); head.className = 'aHead';
    head.innerHTML = icon('star', 18) + '<b>Admin powers</b>';
    const x = document.createElement('button'); x.className = 'iconBtn'; x.innerHTML = icon('close', 18); x.onclick = () => box.classList.add('hidden'); head.appendChild(x);
    box.appendChild(head);
    const btn = (ic, label, fn, on) => { const b = document.createElement('button'); b.className = 'aBtn' + (on ? ' on' : ''); b.innerHTML = icon(ic, 18) + '<span>' + label + '</span>'; b.onclick = fn; return b; };
    const grid = document.createElement('div'); grid.className = 'aGrid';
    grid.append(
      btn('fly', G.me.fly ? 'Flying' : 'Fly', () => { G.me.fly = !G.me.fly; showToast(G.me.fly ? 'Flying! Fly over anything' : 'Back on the ground', 1200); renderAdmin(); }, G.me.fly),
      btn('sun', 'Day', () => runAdmin({ cmd: 'day' })),
      btn('moon', 'Night', () => runAdmin({ cmd: 'night' })),
      btn('clear', 'Clear chat', () => runAdmin({ cmd: 'clearchat' })),
    );
    box.appendChild(grid);
    const row = document.createElement('div'); row.className = 'aRow';
    const inp = document.createElement('input'); inp.maxLength = 120; inp.placeholder = 'Announcement for everyone';
    const go = btn('announce', 'Send', () => { if (inp.value.trim()) { runAdmin({ cmd: 'announce', text: inp.value }); inp.value = ''; } });
    row.append(inp, go); box.appendChild(row);

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
        acts.append(
          btn('go', 'Go to', () => runAdmin({ cmd: 'tp', target: p.id })),
          btn('bring', 'Bring', () => runAdmin({ cmd: 'bring', target: p.id })),
          btn('freeze', 'Freeze', () => runAdmin({ cmd: 'freeze', target: p.id })),
          btn('thaw', 'Unfreeze', () => runAdmin({ cmd: 'thaw', target: p.id })),
          btn(muted ? 'unmute' : 'mute', muted ? 'Unmute' : 'Mute', () => { runAdmin({ cmd: muted ? 'unmute' : 'mute', target: p.id }); setTimeout(renderAdmin, 200); }),
          btn('kick', 'Kick', () => runAdmin({ cmd: 'kick', target: p.id })),
          btn('ban', 'Ban', () => runAdmin({ cmd: 'ban', target: p.id })),
        );
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
    for (const p of list.slice(0, 12)) {
      const row = document.createElement('div'); row.className = 'p' + (p.admin ? ' admin' : '');
      const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = p.color;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = (p.admin ? '★ ' : '') + p.name + (p === G.me ? ' (you)' : '');
      const dv = document.createElement('span'); dv.className = 'dev'; dv.innerHTML = icon(p.devType || 'computer', 13); dv.appendChild(document.createTextNode(' ' + (p.dev || '')));
      row.append(dot, nm, dv);
      box.appendChild(row);
    }
    if (list.length > 12) { const more = document.createElement('div'); more.textContent = '+' + (list.length - 12) + ' more'; box.appendChild(more); }
    if (G.role === 'keeper') Net.toAll({ t: 'roster', roster: roster() });
    $('adminBtn').classList.toggle('hidden', !G.me.admin);
    renderAdmin();
  }

  let toastTimer;
  function showToast(t, ms) { $('toast').textContent = t; $('toast').classList.remove('hidden'); clearTimeout(toastTimer); if (ms) toastTimer = setTimeout(() => $('toast').classList.add('hidden'), ms); }

  // ---------- building ----------
  function buildHotbar() {
    const bar = $('hotbar'); bar.textContent = '';
    HOTBAR.forEach((k, i) => {
      const b = document.createElement('button'); b.title = k ? BLOCKS[k].name : 'Break';
      if (k) { const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = BLOCKS[k].color; b.appendChild(sw); }
      else { const x = document.createElement('span'); x.className = 'x'; x.innerHTML = icon('pick', 22); b.appendChild(x); }
      if (!Device.useTouch) { const key = document.createElement('span'); key.className = 'k'; key.textContent = (i + 1) % 10; b.appendChild(key); }
      b.onclick = () => { selectTool(i); if (Device.useTouch && !G.building) toggleBuild(true); };
      bar.appendChild(b);
    });
  }
  function selectTool(i, quiet) { G.tool = i; [...$('hotbar').children].forEach((b, j) => b.classList.toggle('on', j === i)); if (!quiet) showToast(HOTBAR[i] ? BLOCKS[HOTBAR[i]].name : 'Break', 700); }
  function toggleBuild(on) { G.building = on ?? !G.building; $('buildToggle').classList.toggle('on', G.building); $('buildToggle').innerHTML = icon(G.building ? 'check' : 'build', 24) + '<span>' + (G.building ? 'Done' : 'Build') + '</span>'; }
  $('buildToggle').onclick = () => toggleBuild();

  function tileAtScreen(sx, sy) {
    const r = G.r, wx = r.cam.x + (sx - r.w / 2) / r.cam.z, wy = r.cam.y + (sy - r.h / 2) / r.cam.z;
    return { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
  }
  function canEdit(x, y, k) {
    if (!G.world.inside(x, y)) return false;
    if (!G.me.admin && Math.hypot(x * TILE + 16 - G.me.x, y * TILE + 16 - G.me.y) > REACH * TILE) return false;
    const cur = G.world.objAt(x, y);
    if (k === 0) return cur !== 0;
    if (cur === k) return false;
    if (BLOCKS[k].solid) for (const p of G.players.values()) if (Math.abs(p.x - (x * TILE + 16)) < 26 && Math.abs(p.y - (y * TILE + 16)) < 26) return false;
    return true;
  }
  function edit(x, y, k) {
    if (!G.myId || !canEdit(x, y, k)) return;
    applyBlock(x, y, k);
    if (G.role === 'guest') Net.toKeeper({ t: 'block', x, y, k }); else Net.toAll({ t: 'block', x, y, k });
  }

  // ---------- input ----------
  const keys = new Set(); const stick = { x: 0, y: 0, id: null }; let mouse = null;
  addEventListener('keydown', e => {
    if (!G || !G.myId) return;
    if (document.activeElement === $('chatInput')) { if (e.key === 'Escape') $('chatInput').blur(); return; }
    if (e.key === 'Enter' || e.key === '/') { e.preventDefault(); $('chat').classList.remove('hidden'); $('chatInput').focus(); if (e.key === '/') $('chatInput').value = '/'; return; }
    if (/^[0-9]$/.test(e.key)) { selectTool((+e.key + 9) % 10); return; }
    if (e.key.toLowerCase() === 'f' && G.me.admin) { G.me.fly = !G.me.fly; showToast(G.me.fly ? 'Flying! Fly over anything' : 'Back on the ground', 1200); renderAdmin(); return; }
    keys.add(e.key.toLowerCase());
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  const cv = $('game');
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') mouse = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerleave', () => { mouse = null; });
  cv.addEventListener('pointerdown', e => {
    if (!G || !G.myId) return;
    const t = tileAtScreen(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') edit(t.x, t.y, e.button === 2 || e.shiftKey ? 0 : HOTBAR[G.tool]);
    else if (G.building) edit(t.x, t.y, HOTBAR[G.tool]);
  });
  addEventListener('wheel', e => { if (!G || !G.myId) return; selectTool((G.tool + (e.deltaY > 0 ? 1 : 9)) % 10); }, { passive: true });

  const st = $('stick'), knob = $('knob');
  st.addEventListener('pointerdown', e => { stick.id = e.pointerId; st.setPointerCapture(e.pointerId); moveStick(e); });
  st.addEventListener('pointermove', e => { if (e.pointerId === stick.id) moveStick(e); });
  const endStick = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  st.addEventListener('pointerup', endStick); st.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    const r = st.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - r.left - R, dy = e.clientY - r.top - R; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    stick.x = dx / R; stick.y = dy / R;
  }

  function onResize() { if (G && G.r) G.r.resize(); document.body.classList.toggle('small', innerWidth < 600); }
  addEventListener('resize', onResize);

  // ---------- movement ----------
  function move(p, dx, dy) {
    const W = G.world, R = 10;
    const blocked = (x, y) => W.solid(Math.floor((x - R) / TILE), Math.floor((y - R) / TILE)) || W.solid(Math.floor((x + R) / TILE), Math.floor((y - R) / TILE)) ||
      W.solid(Math.floor((x - R) / TILE), Math.floor((y + R) / TILE)) || W.solid(Math.floor((x + R) / TILE), Math.floor((y + R) / TILE));
    if (blocked(p.x, p.y)) { p.x += dx; p.y += dy; return; } // stuck inside something: let them walk out
    if (!blocked(p.x + dx, p.y)) p.x += dx;
    if (!blocked(p.x, p.y + dy)) p.y += dy;
  }

  // ---------- loop ----------
  let last = performance.now();
  function loop(now) {
    if (!G || !G.running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const m = G.me;
    let ix = 0, iy = 0;
    if (keys.has('a') || keys.has('arrowleft')) ix--; if (keys.has('d') || keys.has('arrowright')) ix++;
    if (keys.has('w') || keys.has('arrowup')) iy--; if (keys.has('s') || keys.has('arrowdown')) iy++;
    if (stick.id !== null) { ix = stick.x; iy = stick.y; }
    if (G.frozen) ix = iy = 0;
    if (m.fly && !m.admin) m.fly = false;
    const mag = Math.hypot(ix, iy);
    if (mag > 0.15) {
      const k = Math.min(1, mag) / mag, run = (keys.has('shift') ? 1.6 : 1) * (m.fly ? 2.2 : 1);
      const dx = ix * k * SPEED * run * dt, dy = iy * k * SPEED * run * dt;
      if (m.fly) { m.x = Math.max(0, Math.min(WORLD * TILE, m.x + dx)); m.y = Math.max(0, Math.min(WORLD * TILE, m.y + dy)); } else move(m, dx, dy); m.dir = Math.atan2(iy, ix); m.moving = true;
    } else m.moving = false;
    m.tx = m.x; m.ty = m.y;
    for (const p of G.players.values()) if (p !== m) { const a = 1 - Math.pow(0.0005, dt); p.x += (p.tx - p.x) * a; p.y += (p.ty - p.y) * a; }

    if (G.role === 'guest' && G.myId && now - G.lastSend > 66) {
      G.lastSend = now; Net.toKeeper({ t: 'pos', x: Math.round(m.x), y: Math.round(m.y), d: +m.dir.toFixed(2), mv: m.moving, fl: !!m.fly });
      if (now - G.lastHeard > 6000) reconnect(); // keeper went quiet
    }
    if (G.role === 'keeper' && now - G.lastState > 66) {
      G.lastState = now;
      Net.toAll({ t: 'state', phase: dayPhase(), p: [...G.players.values()].map(p => [p.id, Math.round(p.tx), Math.round(p.ty), +(+p.dir).toFixed(2), !!p.moving, !!p.fly]) });
    }

    const ph = dayPhase(), sun = Math.cos(ph * Math.PI * 2);
    const dark = Math.max(0, Math.min(0.72, (-sun + 0.15) * 0.85));
    const hrs = (ph * 24 + 12) % 24;
    const night = dark > 0.3; if (night !== G.wasNight) { G.wasNight = night; $('clockIc').innerHTML = icon(night ? 'moon' : 'sun', 15); }
    $('clockT').textContent = String(Math.floor(hrs)).padStart(2, '0') + ':' + String(Math.floor((hrs % 1) * 60)).padStart(2, '0');

    let cursor = null;
    if (mouse && G.myId) { const t = tileAtScreen(mouse.x, mouse.y); cursor = { x: t.x, y: t.y, ok: canEdit(t.x, t.y, HOTBAR[G.tool]) }; }
    G.r.frame(G.players.values(), m, { now, dark, cursor });
    requestAnimationFrame(loop);
  }
})();
