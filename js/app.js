// Funz Online 3D: one shared peaceful world. Menus, controls, the game loop,
// the world-keeper rules, items, the ring race, saving, and admin tools.
(() => {
  const $ = id => document.getElementById(id);
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
  // ---------- your look: skin, two colours, hat and trail ----------
  // The crown and the name Outernautica belong only to the owner (unlocked once with a secret link).
  const reservedName = n => n.toLowerCase().replace(/[^a-z]/g, '').includes('outernautica');
  const isOwner = () => !!store.get('pass', '');
  const prog = new Progress(store);
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  const look = {
    color: store.get('color', pickOne(COLORS.slice(0, 8))), color2: store.get('color2', '#e8eef7'),
    skin: store.get('skin', 'band'), hat: store.get('hat', 'none'), trail: store.get('trail', 'dust'),
  };
  const LOOK_KINDS = { skin: SKINS, color: COLORS, color2: COLORS, hat: HATS, trail: TRAILS };
  const validLook = (k, v) => k === 'color' || k === 'color2' ? COLORS.includes(v) : !!LOOK_KINDS[k][v];
  function myLook() {
    const o = {};
    for (const k in look) o[k] = validLook(k, look[k]) && prog.owns(k, look[k], isOwner()) ? look[k] : ({ color: COLORS[0], color2: '#e8eef7', skin: 'plain', hat: 'none', trail: 'none' })[k];
    return o;
  }

  // wardrobe: pick what to wear; locked things show their price or the quest that unlocks them
  let wTab = 'skin', thumbs = null;
  const W_TABS = [['skin', 'Skins'], ['color', 'Color'], ['color2', 'Second color'], ['hat', 'Hats'], ['trail', 'Trails']];
  function thumbMaker() {
    if (thumbs !== null) return thumbs;
    try { const c = document.createElement('canvas'); c.width = c.height = 128; thumbs = { c, gfx: new GL(c, true), hats: {}, cache: new Map() }; thumbs.gfx.gl.viewport(0, 0, 128, 128); }
    catch (e) { thumbs = false; }
    return thumbs;
  }
  // a little picture of a ball with a skin and hat
  function thumb(skin, hat, A, B) {
    const T = thumbMaker(); if (!T) return '';
    const key = skin + '|' + hat + '|' + A + '|' + B; if (T.cache.has(key)) return T.cache.get(key);
    const G2 = T.gfx, gl = G2.gl, eye = hat !== 'none' ? [0, 0.75, 2.2] : [0, 0.35, 2.2];
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.disable(gl.BLEND);
    const vp = M4.mul(M4.persp(hat !== 'none' ? 0.62 : 0.5, 1, 0.1, 50), M4.lookAt(eye, [0, hat !== 'none' ? 0.18 : 0, 0], [0, 1, 0]));
    G2.begin({ vp, eye, sun: [0.45, 0.75, 0.5], sunC: [0.75, 0.72, 0.64], sky: [0.5, 0.55, 0.68], ground: [0.28, 0.26, 0.3], fog: [0, 0, 0], fogD: 0, time: 1, horizon: [0.6, 0.75, 0.95], lp: new Float32Array(32), lc: new Float32Array(24) });
    const M = M4.model([0, 0, 0], M4.mul3(M4.rotY(0.5), M4.rotX(0.25)), 0.45), sk = (SKINS[skin] || SKINS.plain).n;
    const a = new Float32Array(hex(A).slice(0, 3)), b = new Float32Array(hex(B).slice(0, 3));
    if (CLEAR_SKINS.includes(sk)) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
    G2.ball(M, sk, a, b); G2.ball(M, sk, a, b, 1, 0.045); gl.disable(gl.BLEND);
    if (hat !== 'none') { const h = T.hats[hat] || (T.hats[hat] = hatModel(G2, hat)); G2.mat(1, 0.35, 0.7); const HM = M4.model([0, 0, 0], M4.rotY(-0.9), 1); G2.draw(h, HM); G2.outline(h, HM, 0.016); }
    const url = T.c.toDataURL(); T.cache.set(key, url); return url;
  }
  const lockText = (kind, id) => {
    const l = prog.lockOf(kind, id); if (!l) return null;
    if (l.owner) return { t: '★ Owner', c: 'c' };
    if (l.quest) { const q = QUESTS.find(q => q.id === l.quest); return { t: 'Quest', c: 'q', q }; }
    return { t: l.coins + ' coins', c: 'c', coins: l.coins };
  };
  const KIND_NAME = { skin: 'Skin', color: 'Color', color2: 'Second color', hat: 'Hat', trail: 'Trail' };
  const nameOf = (kind, id) => kind === 'skin' ? SKINS[id].name : kind === 'hat' ? HATS[id].name : kind === 'trail' ? TRAILS[id].name : kind === 'color2' ? 'Second color' : 'Color';
  function wTile(kind, id, L, owner, tag) {
    const b = document.createElement('button'), owns = prog.owns(kind, id, owner), lk = owns ? null : lockText(kind, id), name = nameOf(kind, id);
    if (L[kind] === id) b.classList.add('on'); if (!owns) b.classList.add('locked');
    if (kind === 'color' || kind === 'color2') { b.classList.add('sw'); b.style.background = 'radial-gradient(circle at 35% 30%,rgba(255,255,255,.55),transparent 45%),' + id; }
    else if (kind === 'trail') {
      const T = TRAIL_FX[id]; b.innerHTML = '<span class="nm"></span><div class="trailDots"></div>'; b.querySelector('.nm').textContent = name;
      const dots = b.querySelector('.trailDots'); (T ? (T.cols || ['#ff5f5f', '#ffd24a', '#7be36b', '#5aa9ff', '#b48cff']) : ['#555']).slice(0, 5).forEach(c => { const i = document.createElement('i'); i.style.background = c; i.style.color = c; dots.appendChild(i); });
    } else { const img = document.createElement('img'); img.alt = ''; img.src = kind === 'skin' ? thumb(id, 'none', L.color, L.color2) : thumb(L.skin, id, L.color, L.color2); b.appendChild(img); }
    b.title = name;
    if (tag || lk) { const t = document.createElement('span'); t.className = 'lk ' + (tag ? 'c' : lk.c); t.textContent = tag || lk.t; b.appendChild(t); }
    b.onclick = () => {
      if (!owns) {
        if (lk.coins) {
          if (prog.coins >= lk.coins) { if (confirm('Buy ' + name + ' for ' + lk.coins + ' coins?')) { prog.buy(kind, id); Sound.play('chest'); wear(kind, id); } }
          else wInfo('You need ' + lk.coins + ' coins for ' + name + '. You have ' + prog.coins + '. Find coins and finish quests to get more!');
        } else if (lk.q) wInfo(name + ' unlocks when you finish the quest "' + lk.q.name + '": ' + lk.q.desc + '.');
        return;
      }
      wear(kind, id);
    };
    return b;
  }
  function renderWardrobe() {
    const owner = isOwner();
    $('coinCount').textContent = owner ? '∞' : prog.coins;
    const tabs = $('wTabs'); tabs.textContent = '';
    const T = [...W_TABS, ['shop', 'Shop']]; if (owner) T.push(['owner', '★ Owner']);
    if (!T.some(t => t[0] === wTab)) wTab = 'skin';
    for (const [k, n] of T) { const b = document.createElement('button'); b.textContent = n; if (k === wTab) b.className = 'on'; if (k === 'owner') b.classList.add('own'); b.onclick = () => { wTab = k; renderWardrobe(); }; tabs.appendChild(b); }
    const grid = $('wGrid'); grid.textContent = ''; const L = myLook();
    const idsOf = kind => kind === 'color' || kind === 'color2' ? COLORS : Object.keys(LOOK_KINDS[kind]);
    const head = t => { const h = document.createElement('div'); h.className = 'wSec'; h.textContent = t; grid.appendChild(h); };
    if (wTab === 'shop') {
      // everything you can buy with coins
      let n = 0;
      for (const kind of ['skin', 'hat', 'trail', 'color']) {
        const list = idsOf(kind).filter(id => { const l = prog.lockOf(kind, id); return l && l.coins; }); if (!list.length) continue;
        head(KIND_NAME[kind] + 's');
        for (const id of list) { const owns = prog.owns(kind, id, owner); grid.appendChild(wTile(kind, id, L, owner, owns ? (owner ? 'Yours ★' : 'Yours') : null)); n++; }
      }
      wInfo(owner ? 'You own everything in the shop already!' : 'Buy things with coins. You get coins from coins lying around, treasure and quests.');
      return;
    }
    if (wTab === 'owner') {
      head('Skins'); for (const id of Object.keys(SKINS).filter(id => ownerOnly('skin', id))) grid.appendChild(wTile('skin', id, L, owner));
      head('Hats'); for (const id of Object.keys(HATS).filter(id => ownerOnly('hat', id))) grid.appendChild(wTile('hat', id, L, owner));
      head('Trails'); for (const id of Object.keys(TRAILS).filter(id => ownerOnly('trail', id))) grid.appendChild(wTile('trail', id, L, owner));
      head('Colors'); for (const id of COLORS.filter(id => ownerOnly('color', id))) grid.appendChild(wTile('color', id, L, owner)); for (const id of COLORS.filter(id => ownerOnly('color', id))) grid.appendChild(wTile('color2', id, L, owner, '2nd'));
      wInfo('★ Special things only the owner can wear.');
      return;
    }
    const sorted = idsOf(wTab).filter(id => !ownerOnly(wTab, id));
    sorted.sort((a, b) => (prog.owns(wTab, b, owner) - prog.owns(wTab, a, owner)));
    for (const id of sorted) grid.appendChild(wTile(wTab, id, L, owner));
    wInfo(null);
  }
  // in the game the wardrobe opens over the world
  function openWardrobe(on) {
    const w = $('wardrobe');
    if (on) { $('hud').appendChild(w); w.classList.remove('hidden'); $('wardClose').classList.remove('hidden'); renderWardrobe(); }
    else if (G) w.classList.add('hidden');
  }
  function wardrobeToMenu() { const w = $('wardrobe'); document.querySelector('.menuWrap').appendChild(w); w.classList.remove('hidden'); $('wardClose').classList.add('hidden'); renderWardrobe(); }
  $('wardClose').onclick = () => openWardrobe(false);
  $('wardBtn').onclick = () => { if ($('wardrobe').classList.contains('hidden') || $('wardrobe').parentElement.id !== 'hud') openWardrobe(true); else openWardrobe(false); };
  function wInfo(t) { const L = myLook(); $('wInfo').textContent = t || ('Wearing: ' + SKINS[L.skin].name + ' skin · ' + HATS[L.hat].name + (L.hat === 'none' ? ' hat' : '') + ' · ' + TRAILS[L.trail].name + (L.trail === 'none' ? ' trail' : ' trail')); }
  function wear(kind, id) {
    look[kind] = id; store.set(kind, id); renderWardrobe(); drawPreview();
    if (G) { const L = myLook(); Object.assign(G.me, L); Object.assign(G.profile, L); if (G.role === 'guest') Net.toKeeper({ t: 'look', ...L }); else renderPeople(); }
  }

  // spinning 3D preview of your ball on the menu
  let preview = null;
  function drawPreview() {
    try {
      if (!preview) { const c = $('avatarPreview'); c.width = 360; c.height = 270; preview = { gfx: new GL(c, true), c, hats: {} }; preview.gfx.gl.viewport(0, 0, 360, 270); }
      if (!preview.loop) { preview.loop = true; requestAnimationFrame(spin); }
    } catch (e) { $('avatarPreview').classList.add('hidden'); }
  }
  function spin(t) {
    if (!preview || $('menu').classList.contains('hidden')) { if (preview) preview.loop = false; return; }
    const G2 = preview.gfx, gl = G2.gl, look = myLook(), eye = [0, 0.55, 2.3];
    const hat = look.hat !== 'none' ? (preview.hats[look.hat] || (preview.hats[look.hat] = hatModel(G2, look.hat))) : null;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const vp = M4.mul(M4.persp(0.55, 4 / 3, 0.1, 50), M4.lookAt(eye, [0, 0.14, 0], [0, 1, 0]));
    G2.begin({ vp, eye, sun: [0.45, 0.75, 0.5], sunC: [0.75, 0.72, 0.64], sky: [0.5, 0.55, 0.68], ground: [0.28, 0.26, 0.3], fog: [0.07, 0.13, 0.22], fogD: 0, time: t / 1000, horizon: [0.6, 0.75, 0.95], lp: new Float32Array(32), lc: new Float32Array(24) });
    const a = t / 1400, bob = Math.abs(Math.sin(t / 380)) * 0.08, hd = 0.6 + Math.sin(t / 2400) * 0.9;
    const M = M4.model([0, bob, 0], M4.mul3(M4.rotY(hd), M4.rotZ(-a)), 0.45);
    const A = new Float32Array(hex(look.color).slice(0, 3)), B = new Float32Array(hex(look.color2).slice(0, 3)), sk = (SKINS[look.skin] || SKINS.plain).n;
    gl.disable(gl.BLEND);
    if (!CLEAR_SKINS.includes(sk)) G2.ball(M, sk, A, B);
    G2.ball(M, sk, A, B, 1, 0.045);
    if (hat) { G2.mat(1, 0.35, 0.7); const HM = M4.model([0, bob, 0], M4.rotY(-hd + Math.PI / 2 - Math.PI / 2), 1); G2.draw(hat, HM); G2.outline(hat, HM, 0.016); }
    if (CLEAR_SKINS.includes(sk)) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); G2.ball(M, sk, A, B); gl.disable(gl.BLEND); }
    requestAnimationFrame(spin);
  }
  drawPreview(); renderWardrobe();

  // secret unlock link: ?unlock=...
  const unlock = new URLSearchParams(location.search).get('unlock');
  if (unlock) {
    history.replaceState(null, '', location.pathname);
    setTimeout(() => adminSign(unlock, 'test').then(ok => {
      if (ok) { store.set('pass', unlock); renderWardrobe(); drawPreview(); menuMsg('★ The crown and the name Outernautica are now in your wardrobe forever!'); }
      else menuMsg('That unlock link is not right.');
    }), 0);
  }

  const cleanName = s => (s || '').replace(/[\u0000-\u001f\u007f<>★]/g, '').trim().slice(0, 16);
  const cleanText = s => (typeof s === 'string' ? s : '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
  const menuMsg = t => { $('menuMsg').textContent = t || ''; };
  const myName = () => {
    const n = cleanName(nameInput.value) || 'Explorer' + Math.floor(Math.random() * 900 + 100);
    if (reservedName(n) && !isOwner()) { menuMsg('That name is special and can\'t be used. Pick another one!'); return null; }
    const owner = (saved().names || []).find(e => Array.isArray(e) && e[0] === nameKey(n));
    if (owner && idKey && owner[1] !== idKey.fp) { menuMsg('Someone else already took the name "' + n + '". Pick another one!'); return null; }
    nameInput.value = n; store.set('name', n); return n;
  };

  $('chatToggle').innerHTML = icon('chat', 22);
  $('emoteToggle').innerHTML = icon('smile', 22);
  $('peopleToggle').innerHTML = icon('users', 22);
  $('leaveBtn').innerHTML = icon('leave', 15) + ' Leave';
  $('adminBtn').innerHTML = icon('star', 15) + ' Admin';
  $('bagBtn').innerHTML = icon('bag', 22);
  $('wardBtn').innerHTML = icon('shirt', 22);
  const musicIcon = () => { $('musicBtn').innerHTML = icon(Sound.on ? 'music' : 'musicOff', 21); $('musicBtn').classList.toggle('off', !Sound.on); };
  try { Sound.on = localStorage.getItem('funz.music') !== 'off'; } catch (e) {}
  musicIcon();
  $('musicBtn').onclick = () => { Sound.start(); Sound.setMusic(!Sound.on); musicIcon(); showToast(Sound.on ? 'Music on' : 'Music off', 1000); };
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

  // ---------- updates: always get the newest version ----------
  const VERSION = window.FUNZ_VERSION || '';
  if ($('verLabel') && VERSION) $('verLabel').textContent = 'Version ' + VERSION;
  if (new URLSearchParams(location.search).has('u')) history.replaceState(null, '', location.pathname);
  let updateWaiting = null;
  async function applyUpdate(v) {
    try { sessionStorage.setItem('funz.updated', v); } catch (e) {}
    menuMsg('Getting the newest version…');
    try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
    try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) {}
    location.replace(location.pathname + '?u=' + encodeURIComponent(v));
  }
  async function checkUpdate() {
    if (!VERSION || !location.protocol.startsWith('http')) return;
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const v = (await r.json()).v; if (typeof v !== 'string' || !v || v === VERSION) return;
      let tried = null; try { tried = sessionStorage.getItem('funz.updated'); } catch (e) {}
      if (tried === v) return; // already tried this one, don't loop
      if (G) { if (!updateWaiting) sys('A new update is ready! You get it the next time you open the game.'); updateWaiting = v; return; }
      applyUpdate(v);
    } catch (e) {}
  }
  checkUpdate(); setInterval(checkUpdate, 4 * 60 * 1000);

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

  // ---------- names: once someone takes a name, nobody else can use it ----------
  // Every device makes its own secret key. A name belongs to the key that used it first.
  const nameKey = n => (n || '').toLowerCase().replace(/\s+/g, '');
  const randomName = () => 'Explorer' + Math.floor(Math.random() * 9000 + 1000);
  const isRandomName = n => /^explorer\d+$/i.test(n || '');
  let idKey = null;
  async function fingerprint(pub) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pub.x + '.' + pub.y))); return [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  async function myIdentity() {
    if (idKey) return idKey;
    try {
      let j = store.json('idkey', null);
      if (!j || !j.d) { const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']); const e = await crypto.subtle.exportKey('jwk', kp.privateKey); j = { d: e.d, x: e.x, y: e.y }; store.set('idkey', JSON.stringify(j)); }
      const priv = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: j.d, x: j.x, y: j.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
      idKey = { priv, pub: { x: j.x, y: j.y }, fp: await fingerprint(j) };
    } catch (e) { idKey = { priv: null, pub: null, fp: '' }; }
    return idKey;
  }
  myIdentity();
  async function idSign(nonce) { try { const k = await myIdentity(); if (!k.priv) return null; return b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k.priv, new TextEncoder().encode(nonce))); } catch (e) { return null; } }
  async function idVerify(pub, nonce, sig) { try { const k = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']); return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, unb64u(sig), new TextEncoder().encode(nonce)); } catch (e) { return false; } }
  function addNames(list) { let n = 0; for (const e of list || []) if (Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'string' && e[0].length <= 20 && e[1].length <= 20 && !G.names.has(e[0]) && G.names.size < 6000) { G.names.set(e[0], e[1]); n++; } if (n) G.dirty = true; }

  // ---------- game state ----------
  let G = null;
  const saveKey = 'world5';
  function saved() { return store.json(saveKey, {}); }
  function saveWorld() { if (!G || !G.dirty) return; G.dirty = false; store.set(saveKey, JSON.stringify({ t: Date.now(), parts: G.B.list(), wires: [...G.B.wires], levers: [...G.circ.levers], bans: [...G.bans], board: G.board, names: [...G.names] })); }
  setInterval(saveWorld, 8000);
  addEventListener('pagehide', saveWorld);
  const defaultSpawn = () => [0, SPAWN_H + 1.5, 7];

  // a saved spawn point is only used if it isn't buried in the ground
  function safeSpawn(game, s) {
    if (!Array.isArray(s) || s.length !== 3 || !s.every(v => typeof v === 'number' && isFinite(v))) return null;
    if (s[1] < -150) return s; // down in a cave
    const g = game.T.ground(s[0], s[2]);
    return s[1] < g + 0.4 ? [s[0], g + 1.5, s[2]] : s;
  }

  async function play() {
    const name = myName(); if (!name) return;
    Sound.start();
    $('playBtn').disabled = true; menuMsg('Entering the world…');
    if (Device.useTouch) { try { await document.documentElement.requestFullscreen(); await screen.orientation.lock('landscape'); } catch (e) {} }
    const s = saved(), B = new Builds(); B.load(s.parts, s.wires);
    let game;
    try { game = new Game($('game'), $('ov'), SEED, B); }
    catch (e) { console.error(e); $('playBtn').disabled = false; menuMsg('Your device can\'t show 3D graphics (WebGL). Try another browser.'); return; }
    game.radius = Device.type === 'phone' ? 4 : Device.type === 'tablet' ? 5 : 6; game.near = Device.type === 'phone' ? 1.3 : 2.3;
    if (Device.type !== 'computer') { game.maxDpr = 1.35; game.maxClouds = 1400; game.maxLights = 5; } else game.maxDpr = 1.25;
    game.resize();
    game.allPartsChanged();
    game.onTouch = () => { prog.add('touched'); questCheck(); };
    const circ = new Circuits(B); for (const l of s.levers || []) circ.levers.add(l);
    const spawn = safeSpawn(game, store.json('spawn5', null)) || defaultSpawn();
    const body = game.newBody([spawn[0] + (Math.random() - .5), spawn[1] + 1, spawn[2] + (Math.random() - .5)]);
    G = {
      role: null, myId: null, players: new Map(), B, game, circ, body,
      tool: 0, cat: 'blocks', building: !Device.useTouch, dayStart: performance.now() - DAY_MS * 0.875,
      lastSend: 0, lastState: 0, lastCirc: 0, lastHeard: performance.now(), rate: new Map(), running: true, dirty: false,
      muted: new Set(), kicked: new Map(), bans: new Set(s.bans || []), nonces: new Map(), reconnecting: false,
      taken: new Map(), drops: new Map(), wx: 'auto', frozen: false, effects: {}, inv: store.json('inv', {}), race: null, raceCool: 0,
      board: Array.isArray(s.board) ? s.board.slice(0, 5) : [], spawn, lastSpawnPad: '', wireFrom: null,
      profile: { name, ...myLook(), dev: Device.short, devType: Device.type },
      names: new Map((s.names || []).filter(e => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'string')), pending: new Set(),
    };
    G.me = { id: 'me', ...G.profile, p: body.p, R: body.R, r: body.r };
    await connectWorld(true);
  }

  async function connectWorld(first) {
    let role;
    try { role = await Net.connect(); } catch (e) { role = 'offline'; }
    if (!G) { Net.leave(); return; }
    G.role = role; G.lastHeard = performance.now();
    if (role === 'guest') { const k = await myIdentity(); Net.toKeeper({ t: 'hello', ...G.profile, pub: k.pub, p: G.body.p.map(v => +v.toFixed(2)) }); return; }
    G.myId = 'keeper'; G.me.id = 'keeper';
    G.players.clear(); G.players.set('keeper', G.me);
    G.me.admin = !!(await adminSign(store.get('pass', ''), 'self-' + Math.random()));
    { const k = await myIdentity(), key = nameKey(G.me.name), owner = G.names.get(key);
      if (!G.me.admin && owner && owner !== k.fp) { const was = G.me.name; G.me.name = G.profile.name = randomName(); setTimeout(() => sys('The name "' + was + '" already belongs to another player, so you are ' + G.me.name + ' for now. Pick a new name in the menu!'), 1500); }
      else if (!owner && !isRandomName(G.me.name) && k.fp && !reservedName(G.me.name)) { G.names.set(key, k.fp); G.dirty = true; } }
    if (first) enterGame();
    G.reconnecting = false; renderPeople();
    if (role === 'offline') { $('roomLabel').innerHTML = '<i class="live off"></i>Offline'; sys('Could not reach the world, so you are exploring offline. Your builds are saved on this device.'); }
    else { $('roomLabel').innerHTML = '<i class="live"></i>Online'; sys(first ? 'Welcome to Funz Online! You are the first one here, more people can join any time.' : 'Back online.'); }
  }

  function addPlayer(p) {
    const pl = Object.assign({ R: [1, 0, 0, 0, 1, 0, 0, 0, 1], r: 0.45 }, p);
    pl.p = [...(p.p || defaultSpawn())]; pl.tp = [...pl.p];
    G.players.set(p.id, pl); return pl;
  }

  function enterGame() {
    $('menu').classList.add('hidden'); $('playBtn').disabled = false; menuMsg('');
    $('hud').appendChild($('wardrobe')); $('wardrobe').classList.add('hidden');
    $('hud').classList.remove('hidden'); $('chat').classList.remove('hidden'); $('toast').classList.add('hidden');
    if (Device.useTouch) { $('touch').classList.remove('hidden'); $('buildToggle').classList.remove('hidden'); $('chat').classList.add('hidden'); $('emotes').classList.add('hidden'); }
    buildHotbar(); buildEmotes(); selectTool(0, true); toggleBuild(G.building); renderBag();
    $('adminBtn').classList.toggle('hidden', !G.me.admin);
    onResize(); last = performance.now();
    showToast(Device.useTouch ? 'Joystick to roll · drag to look · jump button to jump' : 'WASD to roll · drag to look · Space to jump · the station is on your minimap!', 5000);
    requestAnimationFrame(loop);
  }

  function leave(msg) {
    if (!G) return;
    saveWorld(); G.running = false; Net.leave(); G = null;
    ['hud', 'chat', 'touch', 'buildToggle', 'bag', 'adminPanel'].forEach(id => $(id).classList.add('hidden'));
    document.body.classList.remove('building', 'showPeople');
    $('chatLog').textContent = '';
    const o = $('ov').getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, 9999, 9999);
    $('menu').classList.remove('hidden'); $('playBtn').disabled = false; menuMsg(msg || ''); wardrobeToMenu();
    if (preview && !preview.loop) { preview.loop = true; requestAnimationFrame(spin); }
    if (updateWaiting && !msg) applyUpdate(updateWaiting);
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
  const publicP = p => ({ id: p.id, name: p.name, color: p.color, color2: p.color2, skin: p.skin, hat: p.hat, trail: p.trail, dev: p.dev, devType: p.devType, admin: !!p.admin, p: p.p.map(v => +v.toFixed(2)) });
  const okLook = (kind, v, admin) => (kind === 'color' || kind === 'color2' ? COLORS.includes(v) : !!LOOK_KINDS[kind][v]) && (admin || !ownerOnly(kind, v));
  const cleanLook = (m, admin) => ({ color: okLook('color', m.color, admin) ? m.color : COLORS[0], color2: okLook('color2', m.color2, admin) ? m.color2 : '#e8eef7', skin: okLook('skin', m.skin, admin) ? m.skin : 'plain', hat: okLook('hat', m.hat, admin) ? m.hat : 'none', trail: okLook('trail', m.trail, admin) ? m.trail : 'none' });
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
      if (p || G.pending.has(id)) return;
      G.pending.add(id);
      const pub = m.pub && typeof m.pub.x === 'string' && typeof m.pub.y === 'string' && m.pub.x.length < 60 && m.pub.y.length < 60 ? { x: m.pub.x, y: m.pub.y } : null;
      (pub ? fingerprint(pub).catch(() => '') : Promise.resolve('')).then(fp => { if (!G) return; G.pending.delete(id); if (!G.players.get(id)) welcome(id, m, pub, fp); });
      return;
    }
    if (!p) return;
    if (m.t === 'idsig') {
      const nonce = G.nonces.get('id' + id); G.nonces.delete('id' + id);
      if (!nonce || typeof m.sig !== 'string' || !p.pub) return;
      idVerify(p.pub, 'id:' + nonce, m.sig).then(ok => {
        if (!G || G.players.get(id) !== p) return;
        if (ok) { p.idOk = true; const key = nameKey(p.name); if (!G.names.has(key) && !isRandomName(p.name) && !reservedName(p.name)) { G.names.set(key, p.fp); G.dirty = true; Net.toAll({ t: 'names', add: [[key, p.fp]] }); } }
        else renamePlayer(p, 'The name check failed');
      });
      return;
    }
    if (!p) return;
    if (m.t === 'look') {
      if (!allow(id, 'l', 6, 5000)) return;
      Object.assign(p, cleanLook(m, p.admin)); renderPeople();
    } else if (m.t === 'pos') {
      const v = vec(m.p); if (!okVec(v)) return;
      p.tp = v; p.fly = !!m.fl && !!p.admin; p.big = !!m.big; p.glow = !!m.gl;
    } else if (m.t === 'admin') {
      const nonce = G.nonces.get(id); G.nonces.delete(id);
      if (nonce && typeof m.sig === 'string') adminVerify(nonce, m.sig).then(ok => {
        if (ok && G && G.players.get(id) === p) {
          p.admin = true; p.name = p.wantName; if (p.wantLook) Object.assign(p, p.wantLook); renderPeople();
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

  function welcome(id, m, pub, fp) {
    const wantName = cleanName(m.name) || randomName();
    const ban = G.kicked.get(wantName.toLowerCase());
    if (G.bans.has(wantName.toLowerCase())) { Net.toOne(id, { t: 'banned' }); Net.drop(id); return; }
    if (ban && ban > Date.now()) { Net.toOne(id, { t: 'kicked' }); Net.drop(id); return; }
    if (G.players.size >= MAX_PLAYERS) { Net.toOne(id, { t: 'full' }); Net.drop(id); return; }
    // the name: the owner's special name, a name someone else owns, or a name someone here is using right now
    let name = reservedName(wantName) ? randomName() : wantName, renamed = null;
    const key = nameKey(name), owner = G.names.get(key), online = [...G.players.values()].some(q => nameKey(q.name) === key);
    if ((owner && owner !== fp) || online) { renamed = name; name = randomName(); }
    const pos = vec(m.p);
    const np = addPlayer({ id, name, wantName, ...cleanLook(m, false), wantLook: cleanLook(m, true), pub, fp,
      dev: cleanText(m.dev).slice(0, 40), devType: ['phone', 'tablet', 'computer'].includes(m.devType) ? m.devType : '',
      p: okVec(pos) ? pos : defaultSpawn() });
    const nonce = Math.random().toString(36).slice(2) + Date.now(); G.nonces.set(id, nonce); G.nonces.set('id' + id, nonce);
    Net.toOne(id, { t: 'welcome', id, name, renamed, parts: G.B.list(), wires: [...G.B.wires], power: [...G.circ.on], bans: [...G.bans], taken: takenList(), board: G.board, phase: dayPhase(), roster: roster(), nonce, names: [...G.names], drops: [...G.drops.values()], wx: G.wx, clouds: G.game.extraClouds || [] });
    renderPeople();
    if (!reservedName(wantName)) { const msg = np.name + ' joined (' + np.dev + ')'; sys(msg); Net.toAll({ t: 'sys', text: msg }, id); }
    // a name that belongs to someone has to be proven with that device's key
    if (owner && !renamed) setTimeout(() => { if (G && G.players.get(id) === np && !np.idOk && !np.admin) renamePlayer(np, 'Could not check the name'); }, 15000);
  }
  function renamePlayer(p, why) {
    const was = p.name; p.name = randomName(); renderPeople();
    Net.toOne(p.id, { t: 'rename', name: p.name, was });
  }

  function tryTake(p, itemId, claimType) {
    if (typeof itemId !== 'string' || itemId.length > 80 || itemId === 'trophy' || G.taken.has(itemId)) return;
    const it = G.game.findItem(itemId);
    if (it === null) return;
    if (it && Math.hypot(it.p[0] - p.tp[0], it.p[1] - p.tp[1], it.p[2] - p.tp[2]) > 3.5) return;
    const type = it ? it.type : claimType; if (!ITEMS[type] || type === 'trophy') return;
    if (itemId.startsWith('drop:')) { if (!G.drops.has(itemId)) return; G.drops.delete(itemId); syncDrops(); Net.toAll({ t: 'drop', del: itemId }); }
    else { G.taken.set(itemId, Date.now() + ITEM_RESPAWN); Net.toAll({ t: 'taken', id: itemId }); }
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
      if (typeof m.name === 'string') { G.me.name = G.profile.name = cleanName(m.name); }
      if (m.renamed) setTimeout(() => sys('The name "' + cleanText(m.renamed) + '" is already taken, so you are ' + G.me.name + ' for now. Pick a new name in the menu!'), 1200);
      addNames(m.names);
      G.drops = new Map((Array.isArray(m.drops) ? m.drops : []).filter(d => d && ITEMS[d.type] && okVec(vec(d.p))).map(d => [String(d.id), { id: String(d.id), type: d.type, p: vec(d.p) }])); syncDrops(); setWeather(m.wx); if (Array.isArray(m.clouds)) G.game.addClouds(m.clouds);
      idSign('id:' + m.nonce).then(sig => { if (sig && G) Net.toKeeper({ t: 'idsig', sig }); });
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
    if (m.t === 'names') { addNames(m.add); return; }
    if (m.t === 'drop') { if (m.del) G.drops.delete(String(m.del)); for (const d of Array.isArray(m.add) ? m.add : []) if (d && ITEMS[d.type] && okVec(vec(d.p))) G.drops.set(String(d.id), { id: String(d.id), type: d.type, p: vec(d.p) }); syncDrops(); return; }
    if (m.t === 'wx') { setWeather(m.mode); return; }
    if (m.t === 'clouds') { if (Array.isArray(m.add)) G.game.addClouds(m.add); return; }
    if (m.t === 'flash') { G.game.flash = 1; setTimeout(() => Sound.play('thunder'), 500); return; }
    if (m.t === 'rename') { if (typeof m.name === 'string') { G.me.name = G.profile.name = cleanName(m.name); sys('The name "' + cleanText(m.was) + '" belongs to another player, so you are ' + G.me.name + ' for now. Pick a new name in the menu!'); renderPeople(); } return; }
    if (m.t === 'roster') {
      const ids = new Set(m.roster.map(r => r.id));
      for (const id of [...G.players.keys()]) if (!ids.has(id)) G.players.delete(id);
      for (const r of m.roster) { const p = G.players.get(r.id); if (!p) addPlayer(r); else if (p !== G.me) Object.assign(p, { admin: r.admin, name: r.name, hat: r.hat, color: r.color, color2: r.color2, skin: r.skin, trail: r.trail }); else p.admin = r.admin; }
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
    const b = G.body.p; G.game.fx.burst([b[0], b[1] + 0.3, b[2]], 18, { cols: type === 'coin' ? ['#ffd24a', '#fff2a8'] : ['#ffffff', ITEMS[type].color, '#fff2a8'], shape: 26, size: 0.18, speed: 3.5, life: 0.8, lift: 1.5 });
    if (type === 'coin') { prog.give(5); Sound.play('coin'); showToast('+5 coins!', 1000); renderBag(); questCheck(); return; }
    Sound.play('pickup'); prog.add('items'); if (type === 'star') prog.max('star', 1); if (type === 'trophy') prog.max('trophy', 1); questCheck();
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
    $('bagCoins').textContent = prog.coins;
    const qb = $('quests'); qb.textContent = '';
    const qs = [...QUESTS].sort((a, b) => (!!prog.done[a.id] - !!prog.done[b.id]) || (prog.value(b) / b.goal - prog.value(a) / a.goal));
    for (const q of qs) {
      const done = !!prog.done[q.id], v = Math.min(q.goal, prog.value(q)), row = document.createElement('div'); row.className = 'qRow' + (done ? ' done' : '');
      const un = prog.unlocks(q.id);
      row.innerHTML = '<b></b><span class="rw"></span><small></small><div class="bar"><i></i></div>';
      row.querySelector('b').textContent = (done ? '✓ ' : '') + q.name; row.querySelector('.rw').textContent = '+' + q.coins;
      row.querySelector('small').textContent = q.desc + (un.length ? ' · unlocks ' + un.join(', ') : '') + (done ? '' : ' (' + (q.stat === 'dist' || q.stat === 'swim' ? Math.floor(v) + 'm' : Math.floor(v)) + '/' + q.goal + ')');
      row.querySelector('.bar i').style.width = (v / q.goal * 100) + '%'; qb.appendChild(row);
    }
    const bd = $('board'); bd.textContent = '';
    if (!G.board.length) { const e = document.createElement('p'); e.className = 'aEmpty'; e.textContent = 'No race records yet. Roll onto the gold ring at the plaza to start!'; bd.appendChild(e); }
    G.board.forEach((r, i) => { const row = document.createElement('div'); row.className = 'rec'; row.textContent = (i + 1) + '. ' + r.name + ' · ' + r.time.toFixed(2) + 's'; bd.appendChild(row); });
  }
  $('bagBtn').onclick = () => { $('bag').classList.toggle('hidden'); renderBag(); };
  $('bagClose').onclick = () => $('bag').classList.add('hidden');
  $('respawnBtn').onclick = () => respawn();
  // quests: finishing one gives coins and unlocks things in the wardrobe
  function questCheck() {
    for (const q of prog.check()) {
      const un = prog.unlocks(q.id);
      setTimeout(() => { banner('Quest complete!', q.name, '+' + q.coins + ' coins' + (un.length ? ' · unlocked: ' + un.join(', ') : '')); Sound.play('quest'); }, 300);
      sys('Quest complete: ' + q.name + '! +' + q.coins + ' coins' + (un.length ? '. Unlocked: ' + un.join(', ') : ''));
    }
    renderBag(); if (!$('wardrobe').classList.contains('hidden') && $('wardrobe').parentElement.id === 'hud') renderWardrobe();
  }
  let bannerT = null;
  function banner(t1, t2, t3, ms = 4200) {
    const b = $('banner'); b.innerHTML = '<div class="t1"></div><div class="t2"></div><div class="t3"></div>';
    b.querySelector('.t1').textContent = t1; b.querySelector('.t2').textContent = t2; b.querySelector('.t3').textContent = t3 || '';
    b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.add('hidden'), ms);
  }
  function respawn() {
    if (!G) return;
    const s = safeSpawn(G.game, G.spawn) || defaultSpawn();
    G.body.p = [s[0], s[1] + 1.2, s[2]]; G.body.v = [0, 0, 0]; G.body.caveLock = null; G.game.cave = null;
    if (G.race) { G.race = null; showToast('Race cancelled', 1200); }
  }

  // ---------- admin ----------
  function parseCommand(text) {
    const [cmd, ...rest] = text.slice(1).split(' ');
    const c = (cmd || '').toLowerCase(), args = rest.join(' ').trim();
    if (c === 'say') { const [n, ...t] = rest; const p = findPlayer(n); return { cmd: c, target: p && p.id, text: t.join(' '), who: n }; }
    if (c === 'announce' || c === 'unban') return { cmd: c, text: args };
    if (c === 'spawn') return { cmd: c, type: (rest[0] || 'coin').toLowerCase(), n: +rest[1] || 1 };
    if (c === 'weather') return { cmd: c, mode: (rest[0] || 'auto').toLowerCase() };
    if (c === 'lightning') return { cmd: 'flash' };
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
      case 'help': reply('Admin: /announce text · /say name text · /kick name · /ban name · /unban name · /mute name · /unmute name · /freeze name · /thaw name · /tp name · /bring name · /bringall · /day · /night · /clearchat · /players · /spawn coin 10 · /weather storm · /lightning'); break;
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
      case 'spawn': { // drop coins or items around the admin for anyone to pick up
        const type = ITEMS[o.type] && o.type !== 'trophy' ? o.type : 'coin', n = Math.max(1, Math.min(20, o.n | 0 || 1)), add = [];
        for (let k = 0; k < n && G.drops.size < 300; k++) {
          const a = Math.random() * 6.283, d = n > 1 ? 1.5 + Math.random() * 4 : 2.5, x = admin.tp[0] + Math.cos(a) * d, z = admin.tp[2] + Math.sin(a) * d;
          const g = G.game.realm ? admin.tp[1] - 0.4 : G.game.cave ? G.game.cave.floor(x, z) : Math.max(G.game.T.ground(x, z), SEA);
          const it = { id: 'drop:' + Date.now().toString(36) + ':' + Math.floor(Math.random() * 1e6).toString(36), type, p: [+x.toFixed(2), +(g + 0.6).toFixed(2), +z.toFixed(2)] };
          G.drops.set(it.id, it); add.push(it);
        }
        syncDrops(); Net.toAll({ t: 'drop', add }); reply('Spawned ' + add.length + ' × ' + ITEMS[type].name); break; }
      case 'weather': { const mode = ['auto', 'clear', 'cloudy', 'rain', 'storm'].includes(o.mode) ? o.mode : 'auto'; setWeather(mode); Net.toAll({ t: 'wx', mode }); both('The admin made the weather ' + (mode === 'auto' ? 'normal again' : mode)); break; }
      case 'clouds': { // put real clouds of one kind in the sky around the admin
        const kind = CLOUD_KINDS[o.kind] ? o.kind : 'cumulus', n = Math.max(1, Math.min(10, o.n | 0 || 1)), at = admin.tp, H = { cumulus: 340, congestus: 300, cb: 230, stratus: 280, strato: 330, alto: 700, cirrus: 1100, nimbo: 240, lens: 480 }, add = [];
        for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, d = 120 + Math.random() * 380; add.push({ kind, v: Math.floor(Math.random() * 3), x: Math.round(at[0] + Math.cos(a) * d), y: H[kind] + Math.round(Math.random() * 40), z: Math.round(at[2] + Math.sin(a) * d), s: +(0.9 + Math.random() * 0.5).toFixed(2), rot: +(Math.random() * 6.283).toFixed(2), ph: Math.round(Math.random() * 100) }); }
        G.game.addClouds(add); Net.toAll({ t: 'clouds', add }); reply('Spawned ' + n + ' ' + CLOUD_KINDS[kind] + (n > 1 ? ' clouds' : ' cloud')); break; }
      case 'flash': G.game.flash = 1; setTimeout(() => Sound.play('thunder'), 500); Net.toAll({ t: 'flash' }); break;
      case 'bringall': for (const q of G.players.values()) if (q !== admin) tell(q, { t: 'tp', p: [admin.tp[0] + (Math.random() - 0.5) * 4, admin.tp[1] + 1.5, admin.tp[2] + (Math.random() - 0.5) * 4] }); reply('Everyone is here!'); break;
      default: reply('Unknown command. Type /help');
    }
  }
  function syncDrops() { if (G) G.game.drops = [...G.drops.values()]; }
  const WX = { auto: null, clear: 0.15, cloudy: 0.58, rain: 0.75, storm: 0.92 };
  function setWeather(mode) { if (!G) return; G.wx = WX[mode] !== undefined ? mode : 'auto'; G.game.setWeather(WX[G.wx]); if ($('adminPanel') && !$('adminPanel').classList.contains('hidden')) renderAdmin(); }
  // teleport the admin: to a place, or to the nearest spot of a kind of land
  function teleportTo(where) {
    const T = G.game.T, me = G.body.p; let p = null;
    if (where === 'plaza') p = [0, SPAWN_H + 2, 8];
    else if (where === 'station') p = [STATION.x - STATION.R - 12, STATION.ground + 2, STATION.z];
    else if (where === 'parkour') p = [44, T.ground(44, 30) + 2, 30];
    else if (where === 'up') p = [me[0], me[1] + 60, me[2]];
    else {
      const b = +where; let best = null;
      for (let r = 60; r < 6000 && !best; r += 70) for (let a = 0; a < 6.283; a += 140 / r) { const x = me[0] + Math.cos(a) * r, z = me[2] + Math.sin(a) * r; if (Math.abs(x) > LIMIT - 50 || Math.abs(z) > LIMIT - 50) continue; const inf = T.info(x, z); if (inf.b === b && inf.h > -1) { best = [x, inf.h + 2, z]; break; } }
      p = best; if (!p) { showToast('Could not find that land nearby', 1500); return; }
    }
    if (p[1] < 0 && where !== 'up') p[1] = Math.max(T.ground(p[0], p[2]), 0) + 2;
    G.body.p = p; G.body.v = [0, 0, 0]; G.game.cave = null; G.body.caveLock = null; Sound.play('tp'); showToast('Teleported!', 900);
  }
  function runAdmin(o) { if (G.role === 'guest') Net.toKeeper({ t: 'adminCmd', o }); else adminCommand(G.me, o); }
  function setFly(on) { G.me.fly = on; G.body.v = [0, 0, 0]; showToast(on ? 'Flying! Jump to go up, Shift or the down button to go down' : 'Back on the ground', 1600); $('downBtn').classList.toggle('hidden', !on || !Device.useTouch); renderAdmin(); }

  let panelPlayer = null; const spawnPick = { type: 'coin', cloud: 'cumulus', n: 5 };
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
    const sec = (ic, title) => { const t = document.createElement('div'); t.className = 'aTitle'; t.innerHTML = icon(ic, 16) + ' ' + title; box.appendChild(t); const g = document.createElement('div'); g.className = 'aGrid'; box.appendChild(g); return g; };
    const tbtn = (label, fn, on) => { const b = document.createElement('button'); b.className = 'aBtn' + (on ? ' on' : ''); b.innerHTML = '<span></span>'; b.firstChild.textContent = label; b.onclick = fn; return b; };
    // spawn: 1. pick one thing  2. for clouds, pick the kind of cloud  3. type how many
    const sp = sec('coin', 'Spawn: pick one thing');
    for (const t of ['coin', 'shell', 'mushroom', 'feather', 'crystal', 'gem', 'cloud', 'pepper', 'pearl', 'relic', 'star', 'fossil', 'key']) sp.append(tbtn(ITEMS[t].name, () => { spawnPick.type = t; renderAdmin(); }, spawnPick.type === t));
    sp.append(tbtn('☁ Real clouds', () => { spawnPick.type = 'sky'; renderAdmin(); }, spawnPick.type === 'sky'));
    if (spawnPick.type === 'sky') { const cs = sec('sun', 'Which kind of cloud?'); for (const [k, n] of Object.entries(CLOUD_KINDS)) cs.append(tbtn(n, () => { spawnPick.cloud = k; renderAdmin(); }, spawnPick.cloud === k)); }
    { const r = document.createElement('div'); r.className = 'aRow'; const amt = document.createElement('input'); amt.type = 'number'; amt.min = 1; amt.max = spawnPick.type === 'sky' ? 10 : 20; amt.value = spawnPick.n; amt.placeholder = 'How many'; amt.oninput = () => { spawnPick.n = amt.value; };
      const what = spawnPick.type === 'sky' ? CLOUD_KINDS[spawnPick.cloud] : ITEMS[spawnPick.type].name;
      r.append(amt, btn('check', 'Spawn ' + what, () => { const n = Math.max(1, Math.min(+amt.max, Math.floor(+amt.value) || 1)); if (spawnPick.type === 'sky') runAdmin({ cmd: 'clouds', kind: spawnPick.cloud, n, at: G.body.p.map(v => +v.toFixed(1)) }); else runAdmin({ cmd: 'spawn', type: spawnPick.type, n }); })); box.appendChild(r); }
    const wx = sec('sun', 'Weather');
    for (const [m, n] of [['auto', 'Normal'], ['clear', 'Clear'], ['cloudy', 'Cloudy'], ['rain', 'Rain'], ['storm', 'Storm']]) wx.append(tbtn(n, () => runAdmin({ cmd: 'weather', mode: m }), G.wx === m));
    wx.append(tbtn('⚡ Lightning', () => runAdmin({ cmd: 'flash' })));
    const tp = sec('go', 'Teleport');
    for (const [w, n] of [['plaza', 'Plaza'], ['station', 'Station'], ['parkour', 'Parkour'], ['up', 'Up high'], ['1', 'Beach'], ['3', 'Forest'], ['4', 'Desert'], ['5', 'Snow'], ['6', 'Mountains'], ['7', 'Swamp'], ['8', 'Glow fields'], ['0', 'Ocean']]) tp.append(tbtn(n, () => teleportTo(w)));
    tp.append(tbtn('Bring everyone', () => runAdmin({ cmd: 'bringall' })));
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
  $('emoteToggle').onclick = () => $('emotes').classList.toggle('hidden');
  $('peopleToggle').onclick = () => $('peopleToggle').classList.toggle('on', document.body.classList.toggle('showPeople'));
  function buildEmotes() {
    const box = $('emotes'); box.textContent = '';
    for (const e of EMOTES) {
      const b = document.createElement('button'); b.textContent = e;
      b.onclick = () => { if (!G || !G.myId) return; prog.add('emotes'); questCheck(); if (Device.useTouch) box.classList.add('hidden'); if (G.role === 'guest') Net.toKeeper({ t: 'emote', e }); else { emote(G.me, e); Net.toAll({ t: 'emote', id: G.myId, e }); } };
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
    const tabs = $('tabs'); tabs.textContent = '';
    for (const c of CATS) { // the three kinds of things you can build are always on show
      const t = document.createElement('button'); if (c === G.cat) t.className = 'on';
      t.innerHTML = icon(CAT_ICONS[c], 16) + '<span>' + CAT_NAMES[c] + '</span>';
      t.onclick = () => { if (G.cat === c) return; G.cat = c; G.tool = 0; G.wireFrom = null; buildHotbar(); selectTool(0); };
      tabs.appendChild(t);
    }
    const bar = $('hotbar'); bar.textContent = ''; bar.scrollLeft = 0;
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
    G.tool = i; G.wireFrom = null; [...$('hotbar').children].forEach((b, j) => b.classList.toggle('on', j === i));
    const k = curTool();
    $('toolName').textContent = k === 0 ? 'Break' : k === 'wire' ? 'Wire tool' : k === 'cut' ? 'Cut wires' : PARTS[k].name;
    const on = $('hotbar').children[i]; if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (quiet) return;
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
      prog.add('wired'); questCheck(); Sound.play('click');
      if (G.role === 'guest') Net.toKeeper({ t: 'wire', a, b: key, add: true }); else { applyWire(a, key, true); Net.toAll({ t: 'wire', a, b: key, add: true }); }
      showToast('Connected!', 900); return;
    }
    const t = target(sx, sy, k === 0 ? 'pick' : 'place'); if (!t) return;
    if (!t.ok) { if (t.why) showToast(t.why, 1500); return; }
    const r = facing();
    if (k !== 0) { prog.add('built'); questCheck(); Sound.play('place'); } else Sound.play('break');
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
    if (k === 'o') { $('wardBtn').click(); return; }
    if (k === 'm') { $('musicBtn').click(); return; }
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

  // ---------- what you've done (for quests) and which music to play ----------
  function track(now, dt) {
    const b = G.body, lp = G.lastP || b.p, d = Math.hypot(b.p[0] - lp[0], b.p[2] - lp[2]); G.lastP = [...b.p];
    if (d < 5 && !G.me.fly) { prog.add('dist', d); if (b.p[1] < SEA - 0.1 && !G.game.cave) { prog.add('swim', d); if (!G.wasWet) Sound.play('splash'); G.wasWet = true; } else G.wasWet = false; }
    prog.max('high', Math.floor(b.p[1]));
    if (now - (G.lastTrack || 0) < 1000) return; G.lastTrack = now;
    const game = G.game, inSt = insideStation(b.p), cave = game.cave, info = game.T.info(b.p[0], b.p[2]);
    if (!cave && !inSt && info.b >= 1 && info.b <= 8) { if (prog.mark('biomes', info.b)) { prog.max('b' + info.b, 1); banner('New land found', BIOMES[info.b].name, 'Keep exploring for more!', 3000); Sound.play('discover'); } }
    if (inSt || nearStation(b.p[0], b.p[2], 70)) prog.max('station', 1);
    const night = G.wasNight; if (night) G.sawNight = true; else if (G.sawNight) { G.sawNight = false; prog.add('nights'); }
    questCheck();
    Sound.setRain(game.rain || 0);
    Sound.setMood(cave ? 'cave' : inSt ? 'station' : G.dark > 0.45 ? 'night' : ({ 0: 'ocean', 1: 'beach', 2: 'meadow', 3: 'forest', 4: 'desert', 5: 'snow', 6: 'mountain', 7: 'swamp', 8: 'glow', 9: 'plaza', 10: 'station' }[info.b] || 'meadow'));
  }

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
    for (const cp of game.landmarks[1].checkpoints) if (Math.hypot(b.p[0] - cp[0], b.p[1] - cp[1], b.p[2] - cp[2]) < 2 && G.lastSpawnPad !== cp.join()) { G.lastSpawnPad = cp.join(); G.spawn = [...cp]; store.set('spawn5', JSON.stringify(G.spawn)); showToast('Checkpoint! You\'ll respawn here', 1500); }
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
          showToast('Finished in ' + time.toFixed(2) + 's!', 3500); prog.add('races'); questCheck(); Sound.play('quest');
          if (G.role === 'guest') Net.toKeeper({ t: 'race', time }); else recordRace(G.me.name, time);
        } else showToast('Ring ' + G.race.next + '/12', 700);
      }
      if (G.race && now - G.race.start > 6 * 60 * 1000) { G.race = null; showToast('Race timed out', 1500); }
    }
    // boost rings (like the ones on the Station Road) fling you along
    for (const bo of game.St.boosts) {
      if (Math.abs(bo.p[0] - b.p[0]) > 4 || Math.abs(bo.p[2] - b.p[2]) > 4 || now < (b.boostCool || 0)) continue;
      const ddx = b.p[0] - bo.p[0], ddy = b.p[1] - bo.p[1], ddz = b.p[2] - bo.p[2], along = ddx * bo.dir[0] + ddz * bo.dir[1];
      if (Math.abs(along) < 1.2 && Math.hypot(ddx - along * bo.dir[0], ddy, ddz - along * bo.dir[1]) < 3) {
        const s = (b.v[0] * bo.dir[0] + b.v[2] * bo.dir[1]) < 0 ? -1 : 1;
        b.v[0] = bo.dir[0] * s * 27; b.v[2] = bo.dir[1] * s * 27; b.v[1] = Math.max(b.v[1], 3); b.boostT = 2.2; b.boostCool = now + 800; fx('boost');
      }
    }
    game.triggers(b, fx);
    if (G.role !== 'guest') for (const [id, at] of G.taken) if (at && Date.now() > at) { G.taken.delete(id); Net.toAll({ t: 'back', id }); }
  }
  function fx(kind, arg) {
    const bp = G.body.p, P = G.game.fx;
    if (kind === 'jumped') { prog.add('jumps'); Sound.play('jump'); P.burst([bp[0], bp[1] - 0.35, bp[2]], 8, { col: [0.92, 0.88, 0.8], shape: 0, size: 0.22, speed: 1.6, up: 0.3, life: 0.5, drag: 3 }); return; }
    if (kind === 'boost') { showToast('Whoosh!', 600); Sound.play('boost'); P.burst(bp, 14, { cols: ['#8af0ff', '#ffffff'], shape: 29, size: 0.3, speed: 4, life: 0.4 }); return; }
    if (kind === 'jump') { Sound.play('boost'); P.burst(bp, 12, { cols: ['#7be36b', '#ffffff'], shape: 26, size: 0.2, speed: 3, life: 0.6 }); }
    if (kind === 'speed') Sound.play('boost');
    if (kind === 'tp') { Sound.play('tp'); P.burst(bp, 24, { cols: ['#b48cff', '#8af0ff', '#ffffff'], shape: 26, size: 0.2, speed: 4, life: 0.8 }); }
    if (kind === 'cave-in') { const c = G.game.cave; if (c) { prog.mark('cavesSeen', String(c.key)); prog.max('caves', prog.count('cavesSeen')); questCheck(); } }
    if (kind === 'tp') showToast('Whoosh! Teleported', 900);
    else if (kind === 'tp-alone') showToast('Use the wire tool (Circuits tab) to connect this teleporter to another one', 2500);
    else if (kind === 'cave-in') showToast('You found a cave! Look for gems and crystals. The gold ring takes you back up', 3500);
    else if (kind === 'cave-out') showToast('Back outside!', 1200);
    else if (kind === 'spawn') {
      const k = arg.join(','); if (G.lastSpawnPad === k) return; G.lastSpawnPad = k;
      G.spawn = [arg[0] + 0.5, arg[1] + 1.5, arg[2] + 0.5]; store.set('spawn5', JSON.stringify(G.spawn)); showToast('Spawn point set!', 1500);
    }
  }

  if (new URLSearchParams(location.search).has('debug')) window.__funz = () => G;
  const NO_RENDER = new URLSearchParams(location.search).has('norender'); // for tests

  // ---------- loop ----------
  let last = performance.now();
  function loop(now) {
    if (!G || !G.running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // keep it smooth: draw the 3D a bit smaller when frames are slow, sharper again when there's room
    { const P = G.perf || (G.perf = { t: 0, n: 0, sum: 0, good: 0 }); P.sum += (now - (P.last || now)) / 1000; P.last = now; P.n++;
      if (P.n >= 40 && !NO_RENDER) { const avg = P.sum / P.n, g = G.game; P.n = 0; P.sum = 0;
        if (avg > 1 / 40 && (g.scale || 1) > 0.6) { g.scale = Math.max(0.6, (g.scale || 1) - 0.1); g.resize(); P.good = 0; }
        else if (avg < 1 / 56 && (g.scale || 1) < 1) { if (++P.good >= 3) { g.scale = Math.min(1, (g.scale || 1) + 0.1); g.resize(); P.good = 0; } } else P.good = 0; } }
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
    track(now, dt);
    // if someone keeps pushing but isn't getting anywhere, remind them about the flag button
    if (now - (G.stuckAt || 0) > 2500) {
      const sp = G.stuckP || b.p, moved = Math.hypot(b.p[0] - sp[0], b.p[1] - sp[1], b.p[2] - sp[2]);
      if (G.stuckPush > 100 && moved < 0.6 && !m.fly && !G.frozen) showToast('Stuck? Jump, or tap the flag button to go back to your spawn point', 3500);
      G.stuckAt = now; G.stuckP = [...b.p]; G.stuckPush = 0;
    }
    if (go) G.stuckPush = (G.stuckPush || 0) + 1;
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
    const dark = Math.max(0, Math.min(0.72, (-sun + 0.15) * 0.85)); G.dark = dark;
    const hrs = (ph * 24 + 12) % 24;
    const night = dark > 0.3; if (night !== G.wasNight) { G.wasNight = night; $('clockIc').innerHTML = icon(night ? 'moon' : 'sun', 15); }
    $('clockT').textContent = String(Math.floor(hrs)).padStart(2, '0') + ':' + String(Math.floor((hrs % 1) * 60)).padStart(2, '0');
    if ($('placeT').textContent !== (G.game.place || '')) $('placeT').textContent = G.game.place || '';
    const chips = Object.entries(G.effects).map(([k, t]) => ({ fast: 'Speed', big: 'Big', superJump: 'Super jump', glow: 'Glow' }[k] + ' ' + Math.ceil((t - now) / 1000) + 's'));
    if (G.race) chips.unshift('Race ' + ((now - G.race.start) / 1000).toFixed(1) + 's · ring ' + (G.race.next + 1) + '/12');
    const ct = chips.join('  ·  '); if ($('effects').textContent !== ct) $('effects').textContent = ct;
    $('effects').classList.toggle('hidden', !ct);

    G.game.updateCamera(b.p, dt);
    let cursor = null;
    if (mouse && G.myId && !drags.size && G.building) { const k = curTool(); const t = target(mouse.x, mouse.y, k === 0 || k === 'wire' || k === 'cut' ? 'pick' : 'place'); if (t) cursor = t; }
    const items = G.game.nearbyItems(b.p).filter(it => !G.taken.has(it.id) && !(it.type === 'trophy' && G.inv.trophy));
    if (!NO_RENDER) G.game.render([...G.players.values()], m, { now, dt, dark, sunAngle: ph * Math.PI * 2 + Math.PI / 2, cursor, items, race: G.race, wireFrom: G.wireFrom, budget: Device.type === 'phone' ? 7 : 10 });
    requestAnimationFrame(loop);
  }
})();
