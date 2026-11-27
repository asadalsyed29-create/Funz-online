// Nautic Online 3D: one shared peaceful world. Menus, controls, the game loop,
// the world-keeper rules, items, the ring race, saving, and admin tools.
(() => {
  const $ = id => document.getElementById(id);
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
  const LOOKALIKE = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'u', 'υ': 'u', 'х': 'x', 'і': 'i', 'ı': 'i', 'т': 't', 'п': 'n', 'н': 'h', 'к': 'k', 'ο': 'o', 'α': 'a', 'ε': 'e', 'τ': 't', 'ν': 'n', 'ρ': 'p', 'ι': 'i', 'κ': 'k', '0': 'o', '1': 'i', '!': 'i', '|': 'l', '3': 'e', '4': 'a', '@': 'a', '7': 't', '5': 's', '$': 's', 'µ': 'u', 'ü': 'u' };
  const reservedName = n => { const s = String(n || '').normalize('NFKD').toLowerCase().replace(/./gu, c => LOOKALIKE[c] || c).replace(/[^a-z]/g, ''); return s.includes('outernautica') || s.includes('outernautic') || s.includes('outrnautica') || s.includes('outernatica'); };
  // only a pass that really signs with the owner key counts (checked once when the game opens)
  let OWNER = false;
  const isOwner = () => OWNER;
  const prog = new Progress(store);
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  const look = {
    color: store.get('color', pickOne(COLORS.slice(0, 8))), color2: store.get('color2', '#e8eef7'),
    skin: store.get('skin', 'band'), hat: store.get('hat', 'none'), trail: store.get('trail', 'dust'), gadget: store.get('gadget', 'none'),
  };
  const LOOK_KINDS = { skin: SKINS, color: COLORS, color2: COLORS, hat: HATS, trail: TRAILS, gadget: { none: 1, ...GADGETS } };
  const validLook = (k, v) => k === 'color' || k === 'color2' ? COLORS.includes(v) : !!LOOK_KINDS[k][v];
  let ownerGadgets = (() => { const v = store.json('og', []); return Array.isArray(v) ? v.filter(k => OWNER_GADGETS[k]) : []; })();
  function myLook() {
    const o = { og: isOwner() ? [...ownerGadgets] : [] };
    for (const k in look) o[k] = k === 'gadget' ? (look.gadget !== 'none' && GADGETS[look.gadget] && prog.ownsGadget(look.gadget, isOwner()) ? look.gadget : 'none') : validLook(k, look[k]) && prog.owns(k, look[k], isOwner()) ? look[k] : ({ color: COLORS[0], color2: '#e8eef7', skin: 'plain', hat: 'none', trail: 'none' })[k];
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
  function thumb(skin, hat, A, B, gadget) {
    const T = thumbMaker(); if (!T) return '';
    if (SKINS[skin] && SKINS[skin].cols) { A = SKINS[skin].cols[0]; B = SKINS[skin].cols[1]; }
    const key = skin + '|' + hat + '|' + A + '|' + B + '|' + (gadget || ''); if (T.cache.has(key)) return T.cache.get(key);
    if (gadget) hat = hat === 'none' ? 'none' : hat;
    const G2 = T.gfx, gl = G2.gl, tall = hat !== 'none' || gadget, eye = gadget === 'balloon' ? [0, 1.4, 3.8] : tall ? [0, 0.75, 2.6] : [0, 0.35, 2.2];
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.disable(gl.BLEND);
    const vp = M4.mul(M4.persp(tall ? 0.62 : 0.5, 1, 0.1, 50), M4.lookAt(eye, [0, gadget === 'balloon' ? 0.6 : tall ? 0.18 : 0, 0], [0, 1, 0]));
    G2.begin({ vp, eye, sun: [0.45, 0.75, 0.5], sunC: [0.75, 0.72, 0.64], sky: [0.5, 0.55, 0.68], ground: [0.28, 0.26, 0.3], fog: [0, 0, 0], fogD: 0, time: 1, horizon: [0.6, 0.75, 0.95], lp: new Float32Array(32), lc: new Float32Array(24) });
    const M = M4.model([0, 0, 0], M4.mul3(M4.rotY(0.5), M4.rotX(0.25)), 0.45), sk = (SKINS[skin] || SKINS.plain).n;
    const a = new Float32Array(hex(A).slice(0, 3)), b = new Float32Array(hex(B).slice(0, 3));
    if (CLEAR_SKINS.includes(sk)) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
    G2.ball(M, sk, a, b); G2.ball(M, sk, a, b, 1, 0.045); gl.disable(gl.BLEND);
    if (hat !== 'none') { const h = T.hats[hat] || (T.hats[hat] = hatModel(G2, hat)); G2.mat(1, 0.35, 0.7); const HM = M4.model([0, 0, 0], M4.rotY(-0.9), 1); G2.draw(h, HM); G2.outline(h, HM, 0.016); }
    if (gadget) { const gm = T.hats['g:' + gadget] || (T.hats['g:' + gadget] = gadgetModel(G2, gadget)); G2.mat(1, 0.35, 0.6); const GM = M4.model([0, 0, 0], M4.rotY(-0.9 + (gadget === 'jets' || gadget === 'spring' ? 2.2 : 0)), 1); G2.draw(gm, GM); G2.outline(gm, GM, 0.014); }
    const url = T.c.toDataURL(); T.cache.set(key, url); return url;
  }
  const lockText = (kind, id) => {
    const l = prog.lockOf(kind, id); if (!l) return null;
    if (l.owner) return { t: 'Owner', c: 'c' };
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
    const T = [...W_TABS, ['shop', 'Shop']]; if (owner) T.push(['owner', 'Owner']);
    if (!T.some(t => t[0] === wTab)) wTab = 'skin';
    for (const [k, n] of T) { const b = document.createElement('button'); b.textContent = n; if (k === wTab) b.className = 'on'; if (k === 'owner') b.classList.add('own'); b.onclick = () => { wTab = k; renderWardrobe(); }; tabs.appendChild(b); }
    const grid = $('wGrid'); grid.textContent = ''; const L = myLook();
    const idsOf = kind => kind === 'color' || kind === 'color2' ? COLORS : Object.keys(LOOK_KINDS[kind]);
    const head = t => { const h = document.createElement('div'); h.className = 'wSec'; h.textContent = t; grid.appendChild(h); };
    if (wTab === 'shop') {
      // gadgets first: made from coins and things you found, yours forever
      head('Gadgets (use one at a time)');
      const inv = G ? G.inv : store.json('inv', {});
      for (const id of Object.keys(GADGETS)) {
        const Gd = GADGETS[id], owns = prog.ownsGadget(id, owner), b = document.createElement('button'); b.className = 'gad' + (L.gadget === id ? ' on' : '') + (owns ? '' : ' locked');
        const img = document.createElement('img'); img.alt = ''; img.src = thumb(L.skin, 'none', L.color, L.color2, id); b.appendChild(img);
        const t = document.createElement('span'); t.className = 'lk c'; t.textContent = owns ? (L.gadget === id ? 'Using' : 'Yours') : Object.entries(Gd.cost).map(([k, n]) => k === 'coins' ? n + '¢' : n + ' ' + ITEMS[k].name.toLowerCase()).join(' + '); b.appendChild(t);
        b.title = Gd.name + ': ' + Gd.desc;
        b.onclick = () => {
          if (owns) { wear('gadget', L.gadget === id ? 'none' : id); wInfo(L.gadget === id ? Gd.name + ' put away' : 'Using the ' + Gd.name + ': ' + Gd.desc); return; }
          const miss = prog.missing(id, inv);
          if (miss.length) { wInfo(Gd.name + ': ' + Gd.desc + '. You need ' + miss.join(', ') + '.'); return; }
          if (confirm('Make the ' + Gd.name + '? It costs ' + Object.entries(Gd.cost).map(([k, n]) => k === 'coins' ? n + ' coins' : n + ' ' + ITEMS[k].name.toLowerCase() + (n > 1 ? 's' : '')).join(', ') + '.')) { prog.craft(id, inv); store.set('inv', JSON.stringify(inv)); Sound.play('chest'); wear('gadget', id); if (G) renderBag(); }
        };
        grid.appendChild(b);
      }
      let n = 0;
      for (const kind of ['skin', 'hat', 'trail', 'color']) {
        const list = idsOf(kind).filter(id => { const l = prog.lockOf(kind, id); return l && l.coins; }); if (!list.length) continue;
        head(KIND_NAME[kind] + 's');
        for (const id of list) { const owns = prog.owns(kind, id, owner); grid.appendChild(wTile(kind, id, L, owner, owns ? 'Yours' : null)); n++; }
      }
      wInfo(owner ? 'You own everything in the shop already! Tap a gadget to use it.' : 'Gadgets need coins plus things you found. Tap one to see what it does.');
      return;
    }
    if (wTab === 'owner') {
      head('Skins'); for (const id of Object.keys(SKINS).filter(id => ownerOnly('skin', id))) grid.appendChild(wTile('skin', id, L, owner));
      head('Hats'); for (const id of Object.keys(HATS).filter(id => ownerOnly('hat', id))) grid.appendChild(wTile('hat', id, L, owner));
      head('Trails'); for (const id of Object.keys(TRAILS).filter(id => ownerOnly('trail', id))) grid.appendChild(wTile('trail', id, L, owner));
      head('Owner gadget');
      for (const [k, g] of Object.entries(OWNER_GADGETS)) {
        const b = document.createElement('button'), on = ownerGadgets.includes(k); b.className = 'ogad' + (on ? ' on' : ''); b.title = g.name + ': ' + g.desc;
        b.innerHTML = '<span class="em"></span><span class="lk c"></span>'; b.firstChild.innerHTML = icon(k === 'ship' ? 'ship' : 'star', 30); b.lastChild.textContent = g.name;
        b.onclick = () => { ownerGadgets = on ? ownerGadgets.filter(x => x !== k) : [...ownerGadgets, k]; store.set('og', JSON.stringify(ownerGadgets)); wear('og', null); wInfo((on ? 'Put away: ' : 'Using: ') + g.name + '. ' + g.desc); };
        grid.appendChild(b);
      }
      head('Colors'); for (const id of COLORS.filter(id => ownerOnly('color', id))) grid.appendChild(wTile('color', id, L, owner)); for (const id of COLORS.filter(id => ownerOnly('color', id))) grid.appendChild(wTile('color2', id, L, owner, '2nd'));
      wInfo('Special things only the owner can wear.');
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
    if (kind !== 'og') { look[kind] = id; store.set(kind, id); } renderWardrobe(); drawPreview(); if (G) $('shipBtn').classList.toggle('hidden', !myLook().og.includes('ship'));
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
  setTimeout(() => adminSign(store.get('pass', ''), 'owner-' + Math.random()).then(sig => {
    OWNER = !!sig; if (!sig && store.get('pass', '')) store.del('pass');
    if (!OWNER && reservedName(nameInput.value)) nameInput.value = '';
    renderWardrobe(); drawPreview();
  }), 0);

  // secret unlock link: ?unlock=...
  const unlock = new URLSearchParams(location.search).get('unlock');
  if (unlock) {
    history.replaceState(null, '', location.pathname);
    setTimeout(() => adminSign(unlock, 'test').then(ok => {
      if (ok) { store.set('pass', unlock); OWNER = true; renderWardrobe(); drawPreview(); menuMsg('The crown and the name Outernautica are now in your wardrobe forever!'); }
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
  $('shipBtn').innerHTML = icon('ship', 24); $('nailBtn').innerHTML = icon('nail', 24);
  $('nailBtn').onclick = () => toggleNail();
  $('wardClose').innerHTML = icon('close', 18); $('bagClose').innerHTML = icon('close', 18);
  $('gateInstall').textContent = 'Open UltraNautic Hub'; document.querySelectorAll('#gateIos .gIc').forEach(e => { e.innerHTML = icon('share', 16); });
  $('shipBtn').onclick = () => toggleShip();

  // ---------- new buttons (only on the beta account for now): map, friends, photo mode, settings ----------
  const Extra = { look: 1, photo: false, closeAll() { ['friendsBox', 'setBox'].forEach(id => { const el = $(id); if (el) el.classList.add('hidden'); }); } };
  try { Extra.look = Math.max(0.4, Math.min(2.2, +localStorage.getItem('funz.look') || 1)); } catch (e) {}
  Extra.setPhoto = on => {
    if (!window.NAUTIC_BETA || Extra.photo === on) return; Extra.photo = on;
    document.body.classList.toggle('photo', on);
    if (on) { BigMap.close(); Extra.closeAll(); const h = $('photoHint'); h.classList.remove('hidden'); clearTimeout(Extra.hintT); Extra.hintT = setTimeout(() => h.classList.add('hidden'), 2200); }
  };
  if (window.NAUTIC_BETA) {
    const col = document.createElement('div'); col.id = 'sideBtns2';
    col.innerHTML = '<button id="mapBtn" title="Map (G)"></button><button id="friendsBtn" title="Friends"></button><button id="photoBtn" title="Photo mode (P)"></button><button id="setBtn" title="Settings"></button>';
    if (Device.useTouch) { $('quick').append(...col.children); } else $('hud').appendChild(col); // on phones they join the round buttons at the top
    $('mapBtn').innerHTML = icon('map', 22); $('friendsBtn').innerHTML = icon('friends', 22); $('photoBtn').innerHTML = icon('camera', 22); $('setBtn').innerHTML = icon('gear', 22);
    const hint = document.createElement('div'); hint.id = 'photoHint'; hint.className = 'hidden'; hint.textContent = 'Photo mode: drag to look around, tap to bring the buttons back'; document.body.appendChild(hint);
    const panel = (id, title) => { const b = document.createElement('div'); b.id = id; b.className = 'xPanel hidden'; b.innerHTML = '<div class="aHead"><b>' + title + '</b><button class="iconBtn">' + icon('close', 18) + '</button></div><div class="xBody"></div>'; b.querySelector('.iconBtn').onclick = () => b.classList.add('hidden'); $('hud').appendChild(b); return b; };
    const fBox = panel('friendsBox', 'Friends'), sBox = panel('setBox', 'Settings');
    // travel happens from the big map: leave this world and join the same server in the other region (and go to a waypoint there)
    const travel = (id, wp) => {
      if (!G) return false; if (G.chase || G.mg || G.race) { showToast('You can travel when this game is over', 2000); return false; }
      const r = REGIONS[id]; if (!r || !r.built) return false; const srv = G.server; leave('Travelling to ' + r.name + '…'); play(srv, id === 'berekor' ? null : id);
      if (wp) { let n = 0; const t = setInterval(() => { n++; if (G && G.game && G.body && ((G.region || 'berekor') === id)) { clearInterval(t); setTimeout(() => { if (!G || !G.game) return; const T = G.game.T; G.body.p = [wp.x, Math.max(T.ground(wp.x, wp.z), SEA) + 2.5, wp.z]; G.body.v = [0, 0, 0]; Sound.play('tp'); }, 1500); } else if (n > 80) clearInterval(t); }, 250); }
      return true;
    };
    BigMap.init({ travel, region: () => (G && G.region) || 'berekor', game: () => G && G.game, me: () => { if (!G || !G.body || !G.game) return null; const f = G.game.forward(); return { x: G.body.p[0], z: G.body.p[2], fx: f[0], fz: f[1] }; }, toast: t => showToast(t, 2500),
      teleport: (x, z) => { if (!G) return false; if (G.chase || G.mg || G.race) { showToast('You can teleport again when this game is over', 2000); return false; } const T = G.game.T; G.body.p = [x, Math.max(T.ground(x, z), SEA) + 2.5, z]; G.body.v = [0, 0, 0]; G.game.cave = null; G.body.caveLock = null; G.game.waypoint = null; Sound.play('tp'); showToast('Teleported to your waypoint', 1500); return true; } });
    setTimeout(() => BigMap.preload(), 4000);
    const show = b => { const was = !b.classList.contains('hidden'); Extra.closeAll(); $('bag').classList.add('hidden'); if (!was) b.classList.remove('hidden'); return !was; };
    $('mapBtn').onclick = () => BigMap.open();
    $('photoBtn').onclick = () => Extra.setPhoto(true);
    // friends: everyone in this server, with a button to go to them
    const renderFriends = () => {
      const body = fBox.querySelector('.xBody'); body.textContent = ''; if (!G) return;
      const list = [...G.players.values()].filter(p => p !== G.me);
      if (!list.length) { const e = document.createElement('p'); e.className = 'aEmpty'; e.textContent = 'Nobody else is in this server right now.'; body.appendChild(e); return; }
      const busy = G.chase || G.mg || G.race;
      for (const p of list) {
        const row = document.createElement('div'); row.className = 'xRow';
        const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = p.color;
        const nm = document.createElement('span'); nm.className = 'xName'; nm.textContent = p.name;
        const d = p.p ? Math.hypot(p.p[0] - G.body.p[0], p.p[2] - G.body.p[2]) : 0; const far = document.createElement('span'); far.className = 'xDim'; far.textContent = d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(1) + ' km';
        const go = document.createElement('button'); go.className = 'mini'; go.textContent = 'Go to'; go.disabled = !!busy || !p.p;
        go.onclick = () => { if (!G || !p.p) return; const a = Math.random() * 6.283; G.body.p = [p.p[0] + Math.cos(a) * 2.5, p.p[1] + 1.5, p.p[2] + Math.sin(a) * 2.5]; G.body.v = [0, 0, 0]; G.game.cave = null; G.body.caveLock = null; Sound.play('tp'); showToast('Went to ' + p.name, 1200); fBox.classList.add('hidden'); };
        row.append(dot, nm, far, go); body.appendChild(row);
      }
      if (busy) { const e = document.createElement('p'); e.className = 'xDim'; e.textContent = 'You can go to friends again when this game is over.'; body.appendChild(e); }
    };
    $('friendsBtn').onclick = () => { if (show(fBox)) renderFriends(); };
    // settings: graphics, music and sound volume, look speed
    const Gq = () => { try { return localStorage.getItem('funz.gfx') || 'auto'; } catch (e) { return 'auto'; } };
    const renderSet = () => {
      const body = sBox.querySelector('.xBody'); body.textContent = '';
      const t = s => { const e = document.createElement('div'); e.className = 'aTitle'; e.textContent = s; body.appendChild(e); };
      t('Graphics');
      const row = document.createElement('div'); row.className = 'xSeg';
      for (const [v, n] of [['auto', 'Auto'], ['low', 'Low'], ['mid', 'Medium'], ['high', 'High']]) { const b = document.createElement('button'); b.textContent = n; b.classList.toggle('on', Gq() === v); b.onclick = () => { try { v === 'auto' ? localStorage.removeItem('funz.gfx') : localStorage.setItem('funz.gfx', v); } catch (e) {} renderSet(); showToast('Graphics change the next time you join a server', 2200); }; row.appendChild(b); }
      body.appendChild(row);
      const slider = (label, val, min, max, step, fmt, on) => {
        t(label); const r = document.createElement('div'); r.className = 'xSlide';
        const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val; const v = document.createElement('span'); v.textContent = fmt(val);
        i.oninput = () => { v.textContent = fmt(+i.value); on(+i.value); }; r.append(i, v); body.appendChild(r);
      };
      const pct = x => Math.round(x * 100) + '%';
      slider('Music volume', Sound.on ? Sound.music : 0, 0, 1, 0.05, pct, x => { Sound.start(); Sound.music = x; try { localStorage.setItem('funz.musicVol', x); } catch (e) {} Sound.setMusic(x > 0); musicIcon(); });
      slider('Sound effects volume', Sound.sfx, 0, 1, 0.05, pct, x => { Sound.start(); Sound.sfx = x; try { localStorage.setItem('funz.sfxVol', x); } catch (e) {} if (Sound.fx) Sound.fx.gain.value = x * 0.5; });
      slider('Look speed', Extra.look, 0.4, 2.2, 0.1, x => x.toFixed(1) + 'x', x => { Extra.look = x; try { localStorage.setItem('funz.look', x); } catch (e) {} });
    };
    try { const mv = localStorage.getItem('funz.musicVol'), sv = localStorage.getItem('funz.sfxVol'); if (mv != null) Sound.music = +mv; if (sv != null) Sound.sfx = +sv; } catch (e) {}
    $('setBtn').onclick = () => { if (show(sBox)) renderSet(); };
  }
  const musicIcon = () => { $('musicBtn').innerHTML = icon(Sound.on ? 'music' : 'musicOff', 21); $('musicBtn').classList.toggle('off', !Sound.on); };
  try { Sound.on = localStorage.getItem('funz.music') !== 'off'; } catch (e) {}
  musicIcon();
  $('musicBtn').onclick = () => { Sound.start(); Sound.setMusic(!Sound.on); musicIcon(); showToast(Sound.on ? 'Music on' : 'Music off', 1000); };
  $('jumpBtn').innerHTML = icon('up', 26);
  $('respawnBtn').innerHTML = icon('spawn', 18);

  // ---------- mods (made in the Mod Editor, modmaker/): 3D parts on the map with their own code ----------
  let modSig = '', modTimer = 0;
  // puts the server's mods into the world (needs G)
  function loadMods(server) {
    if (!G || !G.game) return;
    const mods = server && Array.isArray(server.mods) ? server.mods : [], sig = JSON.stringify(mods.map(m => [m.id, m.edited || 0, (m.items || []).length, (m.code || '').length]));
    if (sig === modSig && G.game.mods) return; modSig = sig;
    G.game.mods = null; G.modPow = {}; G.modMusic = null;
    if (!mods.length) return;
    const merged = { items: [], codes: [] };
    mods.forEach((m, i) => { const pre = 'm' + i + '_'; for (const d of m.items || []) merged.items.push(Object.assign({}, d, { id: pre + d.id, parent: d.parent ? pre + d.parent : null })); merged.codes.push(m.code || ''); });
    try { const W = new ModKit.World(merged, modHost(), { T: G.game.T, live: true }); G.game.mods = W; W.start(); if (W.errors.length && G.test) setTimeout(() => sys('Mod code problem: ' + W.errors[0].owner + ' line ' + W.errors[0].line + ': ' + W.errors[0].msg), 1200); }
    catch (e) { console.error('mods', e); }
  }
  function modsHello() {
    if (!G || !G.server || !G.server.mods.length) return;
    sys('Mods in this server: ' + G.server.mods.map(m => m.name).join(', ') + '.');
  }
  function modItemsTick() {}
  // what the mods' code can do to this player and this screen
  function modHost() {
    const me = () => G.me;
    return {
      myId: () => (G && G.myId) || 'me',
      player: id => { if (!G) return null; const mine = !id || id === 'me' || id === G.myId; const p = mine ? G.me : G.players.get(id); if (!p) return null; return { p: mine ? G.body.p : p.p, v: mine ? G.body.v : [0, 0, 0], name: p.name, coins: mine ? prog.coins : 0 }; },
      isNight: () => !!G && G.dark > 0.45,
      kill: () => { if (!G) return; respawn(); Sound.play('break'); showToast('Knocked out! Back to your spawn point', 1500); },
      respawn: () => respawn(),
      teleport: p => { if (!G) return; G.body.p = [...p]; G.body.v = [0, 0, 0]; G.body.tpCool = 0.5; },
      velocity: (v, how) => { if (!G) return; const b = G.body; if (how === 'up') b.v[1] = clamp(v[1], -80, 80); else if (how) { for (let i = 0; i < 3; i++) b.v[i] += clamp(v[i], -80, 80); } else b.v = v.map(x => clamp(x, -80, 80)); b.grounded = false; b.boostT = 0.8; b.padCool = 0.3; },
      boost: n => { if (!G) return; const b = G.body, hs = Math.hypot(b.v[0], b.v[2]), f = G.game.forward(), d = hs > 0.5 ? [b.v[0] / hs, b.v[2] / hs] : f; b.v[0] = d[0] * clamp(n, 1, 80); b.v[2] = d[1] * clamp(n, 1, 80); b.boostT = 1.2; Sound.play('boost'); },
      power: o => { if (!G) return; if (!o) G.modPow = {}; else Object.assign(G.modPow, o); },
      coins: n => { if (!G || !n) return; n = Math.round(clamp(n, 0, 100)); const left = G.test ? 0 : Math.max(0, 100 - (G.modCoins || 0)); const got = Math.min(n, left); if (got) { G.modCoins = (G.modCoins || 0) + got; prog.give(got); prog.save(); renderBag(); } Sound.play('coin'); showToast('+' + n + ' coins' + (got < n ? (G.test ? ' (not real while testing)' : ' (mods can give up to 100 coins each visit)') : ''), 1600); },
      checkpoint: p => { if (!G) return; G.spawn = [...p]; },
      say: t => showToast(cleanText(t), 2600), banner: t => banner(cleanText(t), '', '', 3600), chat: t => sys(cleanText(t)),
      win: t => { banner('You win!', cleanText(t), '', 5000); Sound.play('quest'); modFx(G.body.p, 'confetti'); },
      sound: n => Sound.play(n), fx: (p, k) => modFx(p, k), shake: k => { if (G) G.game.shake = clamp(k, 0, 3) * 0.5; setTimeout(() => { if (G) G.game.shake = 0; }, 600); },
      blast: (c, r) => { if (!G) return; const b = G.body, d = [b.p[0] - c[0], b.p[1] - c[1], b.p[2] - c[2]], l = Math.hypot(...d); if (l < r) { const k = (1 - l / r) * 22 / (l || 1); b.v = [b.v[0] + d[0] * k, Math.max(b.v[1], 9 + d[1] * k), b.v[2] + d[2] * k]; b.grounded = false; } },
      time: t => { if (!G) return; const ph = { day: 0, sunrise: 0.9, sunset: 0.42, night: 0.55 }[t]; if (ph != null) G.dayStart = performance.now() - DAY_MS * ph; },
      weather: w => setWeather({ clear: 'clear', rain: 'rain', storm: 'storm', cloudy: 'cloudy' }[w] || 'auto'),
      music: m => { if (G) G.modMusic = m || null; },
      share: (ev, id) => { if (!G || !G.myId || G.test) return; const msg = { t: 'modev', ev, i: String(id).slice(0, 40) }; if (G.role === 'keeper') Net.toAll(Object.assign(msg, { p: G.myId })); else if (G.role === 'guest') Net.toKeeper(msg); },
    };
  }
  function modFx(p, k) {
    if (!G) return; const F = G.game.fx, C = { sparkles: ['#fff7c0', '#ffffff', '#ffd23a'], fire: ['#ff7a1a', '#ffd23a', '#ff3a1a'], smoke: ['#8a8f99', '#c3c8d0'], confetti: ['#ffd23a', '#ff5a8a', '#5ff0e0', '#7be36b', '#b07aff'], bubbles: ['#cfeeff', '#ffffff'], stars: ['#fff2a8', '#ffffff'], hearts: ['#ff5a8a', '#ff9ac0'], snow: ['#ffffff', '#e8f4ff'], explode: ['#ffb347', '#ff5a1a', '#cfcfcf', '#ffffff'] };
    const shape = { sparkles: 26, fire: 20, smoke: 0, confetti: 22, bubbles: 5, stars: 26, hearts: 22, snow: 27, explode: 0 }[k] ?? 26;
    F.burst(p, k === 'explode' ? 50 : 26, { cols: C[k] || C.sparkles, shape, size: k === 'explode' ? 0.5 : 0.22, speed: k === 'explode' ? 9 : 4, life: k === 'smoke' ? 2 : 1, up: k === 'fire' || k === 'smoke' || k === 'bubbles' ? 1.6 : 1, drag: 1.5 });
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, +v || 0));
  // every frame: which mod parts my ball touched, then run the mods' code
  function modsFrame(dt) {
    const W = G && G.game.mods; if (!W) return;
    W.touchFrame(W.touchNow || new Set(), G.myId || 'me'); W.touchNow = new Set(); W.update(dt);
  }
  // a click or tap on a mod part
  function modClick(x, y) {
    const W = G && G.game.mods; if (!W) return false;
    const { o, d } = G.game.ray(x, y), hit = W.pick(o, d, 80, it => W.inWorld(it) && !W.hidden(it)); if (!hit) return false;
    W.fire('click', { it: hit.it, player: G.myId || 'me' }); modHost().share('click', hit.it.id); return true;
  }
  // a touch or click from another player
  function modRemote(m, from) {
    const W = G && G.game.mods; if (!W || !['touch', 'untouch', 'click'].includes(m.ev)) return;
    const it = W.items.get(String(m.i)); if (it) W.fire(m.ev, { it, player: from });
  }
  // what the gadget you use does (mod gadgets)
  function gadgetFx(id) { const g = GADGETS[id]; return g && g.fx ? g.fx : null; }
  // a public server's keeper keeps it on the server list
  setInterval(() => { if (G && G.role === 'keeper' && G.server && G.server.vis === 'public') Servers.advertise(G.server, G.players.size); }, 20000);

  // ---------- servers: make one, find public ones, join with a link ----------
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let srvTab = 'public';
  function openServers(tab) { srvTab = tab || srvTab; $('srvScreen').classList.remove('hidden'); renderServers(); }
  $('serversBtn').onclick = () => openServers();
  $('srvClose').onclick = () => { $('srvScreen').classList.add('hidden'); Servers.lobbyLeave(); };
  function srvMsg(t) { $('srvMsg').textContent = t || ''; }
  async function joinServer(sv, pw) {
    if (!myName()) { $('srvScreen').classList.add('hidden'); return; }
    let s = Object.assign({}, Servers.get(sv.id) || {}, sv);
    if (pw) s.pwh = await Servers.hash(pw);
    if (s.vis === 'private' && !s.pwh && s.owner !== (await myIdentity()).fp) { srvTab = 'pw'; pwFor = s; renderServers(); return; }
    s = Servers.clean(s) ? Object.assign(Servers.clean(s), { pwh: s.pwh || '' }) : null; if (!s) return;
    Servers.put(s); $('srvScreen').classList.add('hidden'); play(s);
  }
  let pwFor = null;
  function renderServers() {
    const body = $('srvBody'); body.textContent = ''; srvMsg('');
    document.querySelectorAll('#srvTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === srvTab));
    if (srvTab === 'pw' && pwFor) {
      body.append(el('p', 'srvNote', pwFor.name + ' is private. Type its password to join.'));
      const inp = el('input'); inp.type = 'password'; inp.placeholder = 'Password'; inp.maxLength = 40; body.append(inp);
      const go = el('button', 'big', 'Join'); go.onclick = () => { if (inp.value) joinServer(pwFor, inp.value); }; body.append(go); inp.focus(); return;
    }
    if (srvTab === 'public') {
      body.append(srvRow('Nautic Online', 'The big open world, everyone can join', [['Join', () => { if (!myName()) return; $('srvScreen').classList.add('hidden'); Servers.lobbyLeave(); play(); }]]));
      const note = el('p', 'srvNote', 'Looking for public servers…'); body.append(note);
      Servers.list().then(list => {
        if (srvTab !== 'public') return; note.remove();
        const known = Object.values(Servers.all()).filter(x => x.vis === 'public' && !list.some(l => l.id === x.id));
        if (!list.length) body.append(el('p', 'srvNote', 'No public servers have players right now. Make one, or open one you played before in My servers.'));
        for (const a of list) body.append(srvRow(a.name, a.n + (a.n === 1 ? ' player' : ' players') + (a.mods.length ? ' · Mods: ' + a.mods.join(', ') : ''), [['Join', () => joinServer({ id: a.id, name: a.name, vis: 'public' })]]));
        for (const k of known) body.append(srvRow(k.name, 'Nobody in it right now · opens again when you join', [['Join', () => joinServer(k)]]));
      }).catch(() => { note.textContent = 'Could not reach the server list. Check your internet.'; });
      return;
    }
    if (srvTab === 'mine') {
      const code = el('div', 'srvJoinRow'); const ci = el('input'); ci.placeholder = 'Paste a server link'; const cb = el('button', 'mini', 'Join');
      cb.onclick = () => { const sv = parseServer(ci.value.trim()); if (sv) joinServer(sv); else srvMsg('That is not a server link.'); }; code.append(ci, cb); body.append(code);
      const mine = Object.values(Servers.all()).sort((a, b) => (b.seen || b.made || 0) - (a.seen || a.made || 0));
      if (!mine.length) body.append(el('p', 'srvNote', 'Servers you make or join show up here.'));
      for (const m of mine) body.append(srvRow(m.name, { public: 'Public', link: 'Only people with the link', private: 'Private (password)' }[m.vis] + (m.mods && m.mods.length ? ' · Mods: ' + m.mods.map(x => x.name).join(', ') : ''),
        [['Join', () => joinServer(m)], ['Copy link', () => copyLink(m)], ['Remove', () => { Servers.remove(m.id); renderServers(); }]]));
      return;
    }
    // make a server
    const ni = el('input'); ni.placeholder = 'Server name'; ni.maxLength = 30; ni.value = (myName() || 'My') + "'s server";
    body.append(el('label', 'srvLbl', 'Name'), ni, el('label', 'srvLbl', 'Who can join'));
    let vis = 'public'; const seg = el('div', 'srvSeg'), pwi = el('input'); pwi.type = 'password'; pwi.placeholder = 'Password'; pwi.maxLength = 40; pwi.classList.add('hidden');
    for (const [v, t] of [['public', 'Public'], ['link', 'Link only'], ['private', 'Private']]) { const b = el('button', v === vis ? 'on' : '', t); b.onclick = () => { vis = v; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); pwi.classList.toggle('hidden', v !== 'private'); visNote.textContent = VN[v]; }; seg.append(b); }
    const VN = { public: 'Shows in the server list for everyone.', link: 'Not in the list. Anyone with the link can join.', private: 'Not in the list. People need the link and the password.' };
    const visNote = el('p', 'srvNote', VN[vis]); body.append(seg, visNote, pwi);
    body.append(el('label', 'srvLbl', 'Mods'));
    const myMods = Object.values(ModKit.loadAll().mods).sort((a, b) => (b.edited || 0) - (a.edited || 0)), picked = new Set();
    if (!myMods.length) body.append(el('p', 'srvNote', 'No mods yet. Make some in the Mods tab of UltraNautic Hub.'));
    for (const m of myMods) { const r = el('label', 'srvMod'); const c = el('input'); c.type = 'checkbox'; c.onchange = () => c.checked ? picked.add(m.id) : picked.delete(m.id); r.append(c, el('span', '', m.name)); body.append(r); }
    const make = el('button', 'big', 'Make server');
    make.onclick = async () => {
      const name = ni.value.trim().replace(/[<>]/g, '') || 'My server'; if (vis === 'private' && pwi.value.length < 3) { srvMsg('Pick a password with at least 3 letters.'); return; }
      const id = Servers.newId(), pw = vis === 'private' ? await Servers.hash(pwi.value) : '';
      const sv = Servers.clean({ id, name, vis, pw, made: Date.now(), owner: (await myIdentity()).fp, mods: myMods.filter(m => picked.has(m.id)).slice(0, 10).map(ModKit.clean) });
      sv.pwh = pw; Servers.put(sv); copyLink(sv, true); $('srvScreen').classList.add('hidden'); play(sv);
    };
    body.append(make);
  }
  function srvRow(name, sub, btns) {
    const r = el('div', 'srvRow'), t = el('div', 'srvT'); t.append(el('b', '', name), el('span', '', sub)); r.append(t);
    for (const [label, fn] of btns) { const b = el('button', 'mini' + (label === 'Join' ? '' : ' ghost'), label); b.onclick = fn; r.append(b); }
    return r;
  }
  // the link carries the server's settings, so it works even when nobody is in it
  function serverLink(s) { const meta = { n: s.name, v: s.vis, p: s.pw || '', m: s.mods || [], o: s.owner || '' }; return Servers.link(s.id) + '.' + btoa(unescape(encodeURIComponent(JSON.stringify(meta)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function parseServer(t) {
    const m = String(t || '').match(/(?:online=|server=)?([a-z0-9]{6,16})(?:\.([A-Za-z0-9_-]+))?$/); if (!m) return null;
    let meta = {}; if (m[2]) try { meta = JSON.parse(decodeURIComponent(escape(atob(m[2].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) {}
    return Servers.clean({ id: m[1], name: meta.n, vis: meta.v, pw: meta.p, owner: meta.o, mods: meta.m || [] }) || null;
  }
  function copyLink(s, made) {
    const l = serverLink(s);
    const done = () => showToast(made ? 'Server made! Its link is copied, send it to friends.' : 'Link copied', 2600);
    try { navigator.clipboard.writeText(l).then(done, () => showToast(l, 6000)); } catch (e) { showToast(l, 6000); }
  }
  document.querySelectorAll('#srvTabs button').forEach(b => b.onclick = () => { srvTab = b.dataset.t; renderServers(); });
  // opened from a server link (the hub passes it along)
  { const q = new URLSearchParams(location.search).get('server'); if (q) { const sv = parseServer(q); if (sv) setTimeout(() => { if (myName()) joinServer(sv); else { srvTab = 'mine'; openServers(); } }, 600); } }
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') openServers(); });

  // Nautic Online is played inside UltraNautic Hub (the hub opens it with ?app=1); a plain browser tab sends you to the hub
  const HUB = 'https://asadalsyed29-create.github.io/Ultranautic-hub/', P0 = new URLSearchParams(location.search);
  const gate = !Device.standalone && location.protocol === 'https:' && !P0.has('debug') && !P0.has('browser');
  if (gate) $('gate').classList.remove('hidden');
  $('gateInstall').onclick = () => { location.href = HUB; };
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

  // building is switched off: the world is for exploring (the code stays for the owner base later)
  const BUILDING = false;
  if (!BUILDING) document.body.classList.add('noBuild');

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
  let saveKey = 'world5'; // the main world; each server has its own saved copy ('srvworld.<id>')
  function saved() { return store.json(saveKey, {}); }
  function saveWorld() { if (G && G.server && G.role === 'guest') G.dirty = true; // guests keep a copy too, so the server lives on
    if (!G || !G.dirty) return; G.dirty = false; store.set(saveKey, JSON.stringify({ t: Date.now(), parts: G.B.list(), wires: [...G.B.wires], levers: [...G.circ.levers], bans: [...G.bans], board: G.board, names: [...G.names] })); }
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

  async function play(server, region) {
    const name = myName(); if (!name) return;
    region = window.NAUTIC_BETA && region && REGIONS[region] && REGIONS[region].built && region !== 'berekor' ? region : null;
    VOLCANO.on = !!window.NAUTIC_BETA && !region;
    saveKey = (server ? 'srvworld.' + server.id : 'world5') + (region ? '.' + region : '');
    Sound.start();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $('serversBtn').disabled = true; menuMsg('Entering the world…');
    if (Device.useTouch) { try { await document.documentElement.requestFullscreen(); await screen.orientation.lock('landscape'); } catch (e) {} }
    modSig = ''; clearInterval(modTimer);
    const s = saved(), B = new Builds(); if (BUILDING) B.load(s.parts, s.wires);
    let game;
    try { game = new Game($('game'), $('ov'), SEED, B, region); }
    catch (e) { console.error(e); $('serversBtn').disabled = false; menuMsg('Your device can\'t show 3D graphics (WebGL). Try another browser.'); return; }
    game.radius = Device.type === 'phone' ? 4 : Device.type === 'tablet' ? 5 : 6; game.near = Device.type === 'phone' ? 1.3 : 2.3;
    if (Device.type !== 'computer') { game.maxDpr = 1.5; game.maxClouds = 1400; game.maxLights = 5; } else game.maxDpr = 1.25;
    game.resize();
    game.allPartsChanged();
    game.onTouch = () => { prog.add('touched'); questCheck(); };
    const circ = new Circuits(B); for (const l of s.levers || []) circ.levers.add(l);
    const spawn = region ? defaultSpawn() : (server && server.test && safeSpawn(game, server.at)) || safeSpawn(game, store.json('spawn5', null)) || defaultSpawn();
    const body = game.newBody([spawn[0] + (Math.random() - .5), spawn[1] + 1, spawn[2] + (Math.random() - .5)]);
    G = {
      role: null, myId: null, players: new Map(), mgBots: new Map(), B, game, circ, body,
      tool: 0, cat: 'blocks', building: false, dayStart: performance.now() - DAY_MS * 0.875,
      lastSend: 0, lastState: 0, lastCirc: 0, lastHeard: performance.now(), rate: new Map(), running: true, dirty: false,
      muted: new Set(), kicked: new Map(), bans: new Set(s.bans || []), nonces: new Map(), reconnecting: false,
      taken: new Map(), drops: new Map(), wx: 'auto', frozen: false, effects: {}, inv: store.json('inv', {}), race: null, raceCool: 0,
      board: Array.isArray(s.board) ? s.board.slice(0, 5) : [], spawn, lastSpawnPad: '', wireFrom: null,
      profile: { name, ...myLook(), dev: Device.short, devType: Device.type },
      server: server || null, mod: {}, region,
      names: new Map((s.names || []).filter(e => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'string')), pending: new Set(),
    };
    G.me = { id: 'me', ...G.profile, p: body.p, R: body.R, r: body.r };
    G.test = !!(server && server.test); G.modPow = {};
    loadMods(server);
    await connectWorld(true);
  }

  async function connectWorld(first) {
    let role;
    try { role = G.test ? 'offline' : await Net.connect((G.server ? Servers.worldId(G.server.id) : Net.MAIN_ID) + (G.region ? '.' + G.region : '')); } catch (e) { role = 'offline'; }
    if (!G) { Net.leave(); return; }
    G.role = role; G.lastHeard = performance.now();
    if (role === 'guest') { const k = await myIdentity(); Net.toKeeper({ t: 'hello', ...G.profile, pub: k.pub, p: G.body.p.map(v => +v.toFixed(2)), pwh: G.server ? G.server.pwh || '' : '' }); return; }
    if (G.server && !G.test) { G.server = Servers.put(Object.assign({}, G.server, { seen: Date.now() })); modsHello(); }
    G.myId = 'keeper'; G.me.id = 'keeper';
    G.players.clear(); G.players.set('keeper', G.me);
    G.me.admin = !!(await adminSign(store.get('pass', ''), 'self-' + Math.random()));
    if (G.me.admin) await refreshProof(); else { G.me.proof = null; if (reservedName(G.me.name)) G.me.name = G.profile.name = randomName(); }
    { const k = await myIdentity(), key = nameKey(G.me.name), owner = G.names.get(key);
      if (!G.me.admin && owner && owner !== k.fp) { const was = G.me.name; G.me.name = G.profile.name = randomName(); setTimeout(() => sys('The name "' + was + '" already belongs to another player, so you are ' + G.me.name + ' for now. Pick a new name in the menu!'), 1500); }
      else if (!owner && !isRandomName(G.me.name) && k.fp && !reservedName(G.me.name)) { G.names.set(key, k.fp); G.dirty = true; } }
    if (first) enterGame();
    G.reconnecting = false; renderPeople();
    if (first && G.region) setTimeout(() => { if (G) banner('Welcome to', REGIONS[G.region].name, 'Planet ' + REGIONS[G.region].planet, 3500); }, 600);
    if (G.test) { $('roomLabel').textContent = G.server.name; $('leaveBtn').textContent = 'Back to editor'; sys('Testing your mod. Only you are here, and nothing is saved. Press Back to editor when you are done.'); }
    else if (role === 'offline') { $('roomLabel').innerHTML = '<i class="live off"></i>Offline'; sys('Could not reach the world, so you are exploring offline. Your builds are saved on this device.'); }
    else if (G.server) { $('roomLabel').innerHTML = '<i class="live"></i>'; $('roomLabel').appendChild(document.createTextNode(G.server.name)); sys(first ? 'Welcome to ' + G.server.name + '! The server stays open: when everyone leaves, it is saved and picks up again when someone comes back.' : 'Back online.'); }
    else { $('roomLabel').innerHTML = '<i class="live"></i>Online'; sys(first ? 'Welcome to Nautic Online! You are the first one here, more people can join any time.' : 'Back online.'); }
  }

  function addPlayer(p) {
    const pl = Object.assign({ R: [1, 0, 0, 0, 1, 0, 0, 0, 1], r: 0.45 }, p);
    pl.p = [...(p.p || defaultSpawn())]; pl.tp = [...pl.p];
    G.players.set(p.id, pl); return pl;
  }

  function enterGame() {
    $('menu').classList.add('hidden'); $('serversBtn').disabled = false; menuMsg('');
    $('hud').appendChild($('wardrobe')); $('wardrobe').classList.add('hidden');
    $('hud').classList.remove('hidden'); $('chat').classList.remove('hidden'); $('toast').classList.add('hidden');
    if (Device.useTouch) { $('touch').classList.remove('hidden'); if (BUILDING) $('buildToggle').classList.remove('hidden'); $('chat').classList.add('hidden'); $('emotes').classList.add('hidden'); }
    buildHotbar(); buildEmotes(); selectTool(0, true); toggleBuild(G.building); renderBag();
    $('adminBtn').classList.toggle('hidden', !G.me.admin);
    $('shipBtn').classList.toggle('hidden', !myLook().og.includes('ship'));
    onResize(); last = performance.now();
    showToast(Device.useTouch ? 'Joystick to roll · drag to look · jump button to jump' : 'WASD to roll · drag to look · Space to jump · the station is on your minimap!', 5000);
    requestAnimationFrame(loop);
  }

  function leave(msg) {
    if (!G) return;
    if (G.test) { const id = G.server.mods[0] ? G.server.mods[0].id : ''; G.running = false; G.game.mods = null; location.href = 'modmaker/?app=1&open=' + encodeURIComponent(id); return; }
    if (!G.test) saveWorld(); clearInterval(modTimer); if (G.game) G.game.mods = null; modSig = ''; G.running = false; Net.leave(); if (G.game) G.game.fpv = null; G = null;
    ['hud', 'chat', 'touch', 'buildToggle', 'bag', 'adminPanel'].forEach(id => $(id).classList.add('hidden'));
    if (window.NAUTIC_BETA) { BigMap.close(); Extra.closeAll(); Extra.setPhoto(false); }
    document.body.classList.remove('building', 'showPeople');
    $('chatLog').textContent = '';
    const o = $('ov').getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, 9999, 9999);
    $('menu').classList.remove('hidden'); $('serversBtn').disabled = false; menuMsg(msg || ''); wardrobeToMenu();
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
      G.players.delete(id); renderPeople(); if (G.game.arena) G.game.arena.hostRemove(id);
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
  const publicP = p => ({ id: p.id, name: p.name, color: p.color, color2: p.color2, skin: p.skin, hat: p.hat, trail: p.trail, gadget: p.gadget, og: p.og || [], dev: p.dev, devType: p.devType, admin: !!p.admin, proof: p.admin ? p.proof || null : null, pt: p.admin ? p.pt || 0 : 0, p: p.p.map(v => +v.toFixed(2)) });
  const okLook = (kind, v, admin) => (kind === 'color' || kind === 'color2' ? COLORS.includes(v) : !!LOOK_KINDS[kind][v]) && (admin || !ownerOnly(kind, v));
  const cleanLook = (m, admin) => ({ color: okLook('color', m.color, admin) ? m.color : COLORS[0], color2: okLook('color2', m.color2, admin) ? m.color2 : '#e8eef7', skin: okLook('skin', m.skin, admin) ? m.skin : 'plain', hat: okLook('hat', m.hat, admin) ? m.hat : 'none', trail: okLook('trail', m.trail, admin) ? m.trail : 'none', gadget: GADGETS[m.gadget] ? m.gadget : 'none', og: admin && Array.isArray(m.og) ? m.og.filter(k => OWNER_GADGETS[k]).slice(0, 5) : [] });
  const roster = () => [...G.players.values()].map(publicP);
  const dayPhase = () => ((performance.now() - G.dayStart) / DAY_MS) % 1;
  // the world clock everyone shares (the keeper's clock), used so animals move the same for everyone
  let clockOff = 0;
  const worldT = () => +((Date.now() + clockOff) / 1000).toFixed(3);
  function syncClock(wt, hard) { if (typeof wt !== 'number' || !isFinite(wt)) return; const target = wt * 1000 - Date.now(); if (hard || Math.abs(target - clockOff) > 1500) clockOff = target; else clockOff += (target - clockOff) * 0.05; }
  const findPlayer = name => { name = (name || '').toLowerCase().replace(/^@/, ''); if (!name) return null; return [...G.players.values()].find(p => p.name.toLowerCase() === name) || [...G.players.values()].find(p => p.name.toLowerCase().startsWith(name)); };
  const takenList = () => [...G.taken.keys()];
  // nobody can build or break at the station; only the admin can at the spawn plaza and the parkour
  const inSpawn = (x, z) => Math.hypot(x + 0.5, z + 0.5) < 50 || Math.hypot(x + 0.5 - 44, z + 0.5 - 38) < 16;
  const canBuildHere = (x, y, z, p) => !nearStation(x + 0.5, z + 0.5) && Math.abs(x) < LIMIT && Math.abs(z) < LIMIT && y > -760 && y < 600 && (!inSpawn(x, z) || !!(p && p.admin));
  const sendPower = () => Net.toAll({ t: 'pw', on: [...G.circ.on] });

  // ---------- nobody can pretend to be the owner ----------
  // The owner's device signs "admin:<id>" with the owner key. Every player checks that
  // signature for themselves, so even a changed game can't show anyone else as the owner.
  async function refreshProof() {
    const t = Date.now(), proof = await adminSign(store.get('pass', ''), 'admin:keeper:' + t);
    if (G && proof) { G.me.proof = proof; G.me.pt = t; }
  }
  setInterval(() => { if (G && G.role === 'keeper' && G.me.admin) refreshProof().then(() => { if (G && G.role === 'keeper') Net.toAll({ t: 'roster', roster: roster() }); }); }, 90 * 1000);
  const proofOk = new Map();
  const proofMsg = r => r.id === 'keeper' ? 'admin:keeper:' + (+r.pt || 0) : 'admin:' + r.id;
  const fakeName = id => 'Explorer' + (1000 + [...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9000, 7));
  function applyRoster(p, r) {
    const claim = !!r.admin && typeof r.proof === 'string' && r.proof.length < 200;
    const fresh = r.id !== 'keeper' || Math.abs(Date.now() - (+r.pt || 0)) < 15 * 60 * 1000;
    const vk = claim ? proofMsg(r) + '|' + r.proof : '', ok = claim && fresh && proofOk.get(vk) === true;
    const name = cleanName(r.name) || fakeName(r.id);
    Object.assign(p, cleanLook(r, ok), { admin: ok, name: !ok && reservedName(name) ? fakeName(r.id) : name, dev: cleanText(r.dev).slice(0, 40), devType: r.devType });
    if (claim && fresh && !proofOk.has(vk)) {
      proofOk.set(vk, 'wait');
      adminVerify(proofMsg(r), r.proof).then(v => { proofOk.set(vk, v); const q = G && G.players.get(r.id); if (v && q && q !== G.me) { applyRoster(q, r); renderPeople(); } });
    }
    return p;
  }

  function keeperGot(id, m) {
    const p = G.players.get(id);
    if (m.t === 'hello') {
      if (p || G.pending.has(id)) return;
      if (G.server && G.server.vis === 'private' && G.server.pw && m.pwh !== G.server.pw) { Net.toOne(id, { t: 'badpw' }); Net.drop(id); return; }
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
    if (m.t === 'modev') { if (!allow(id, 'mv', 30, 2000)) return; modRemote(m, id); Net.toAll({ t: 'modev', ev: m.ev, i: String(m.i).slice(0, 40), p: id }, id); return; }
    if (m.t === 'look') {
      if (!allow(id, 'l', 6, 5000)) return;
      Object.assign(p, cleanLook(m, p.admin)); renderPeople();
    } else if (m.t === 'pos') {
      const v = vec(m.p); if (!okVec(v)) return;
      p.tp = v; p.fly = !!m.fl && !!p.admin; p.big = !!m.big; p.glow = !!m.gl; p.ship = !!m.sh && !!p.admin;
    } else if (m.t === 'admin') {
      const nonce = G.nonces.get(id); G.nonces.delete(id);
      if (nonce && typeof m.sig === 'string') Promise.all([adminVerify(nonce, m.sig), typeof m.proof === 'string' ? adminVerify('admin:' + id, m.proof) : false]).then(([ok, pok]) => {
        if (ok && G && G.players.get(id) === p) {
          p.admin = true; p.proof = pok ? m.proof : null; p.pt = 0; p.name = p.wantName; if (p.wantLook) Object.assign(p, p.wantLook); renderPeople();
          const t = p.name + ' (the owner) joined'; sys(t); Net.toAll({ t: 'sys', text: t });
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
      if (!BUILDING) return;
      const { x, y, z, k } = m, r = (m.r | 0) & 3;
      if (![x, y, z].every(Number.isInteger) || !(k === 0 || PARTS[k])) return;
      if (!allow(id, 'b', 15, 1000) || !canBuildHere(x, y, z, p)) return;
      if (!p.admin && Math.hypot(x + 0.5 - p.tp[0], y + 0.5 - p.tp[1], z + 0.5 - p.tp[2]) > REACH + 3) return;
      if (k !== 0 && G.B.parts.size >= MAX_EDITS && !G.B.parts.has(pkey(x, y, z))) return;
      applyBlock(x, y, z, k, r); Net.toAll({ t: 'block', x, y, z, k, r });
    } else if (m.t === 'wire') {
      if (!BUILDING) return;
      const okKey = s => typeof s === 'string' && /^-?\d+,-?\d+,-?\d+$/.test(s) && G.B.parts.has(s);
      if (!okKey(m.a) || !allow(id, 'w', 10, 1000) || !canBuildHere(...unkey(m.a), p)) return;
      if (m.add) { if (!okKey(m.b) || m.a === m.b || G.B.wires.size >= MAX_WIRES) return; const A = unkey(m.a), Bv = unkey(m.b); if (Math.hypot(A[0] - Bv[0], A[1] - Bv[1], A[2] - Bv[2]) > 40) return; applyWire(m.a, m.b, true); Net.toAll({ t: 'wire', a: m.a, b: m.b, add: true }); }
      else { for (const o of G.B.wiresOf(m.a)) { applyWire(m.a, o, false); Net.toAll({ t: 'wire', a: m.a, b: o, add: false }); } }
    } else if (m.t === 'take') {
      tryTake(p, m.id, m.type);
    } else if (m.t === 'mg') {
      if (m.a === 'join' && G.game.arena && allow(id, 'mg', 3, 4000)) { const r = G.game.arena.hostJoin(id, m.k, p.name); if (r) Net.toOne(id, { t: 'mg', s: { note: r } }); }
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
    Net.toOne(id, { t: 'welcome', server: G.server || null, id, name, renamed, parts: G.B.list(), wires: [...G.B.wires], power: [...G.circ.on], bans: [...G.bans], taken: takenList(), board: G.board, phase: dayPhase(), wt: worldT(), roster: roster(), nonce, names: [...G.names], drops: [...G.drops.values()], wx: G.wx, clouds: G.game.extraClouds || [] });
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
    if (m.t === 'modev') { if (typeof m.p === 'string' && m.p !== G.myId) modRemote(m, m.p); return; }
    if (m.t === 'freeze') { G.frozen = !!m.on; showToast(m.on ? 'The admin froze you' : 'You can move again', 1800); return; }
    if (m.t === 'tp') { const v = vec(m.p); if (okVec(v)) { G.body.p = v; G.body.v = [0, 0, 0]; } return; }
    if (self) { if (m.t === 'sys') sys(cleanText(m.text)); return; }
    if (m.t === 'welcome') {
      const first = !G.myId;
      G.myId = m.id; G.me.id = m.id;
      if (G.server) { const sv = Servers.clean(m.server); if (sv) { G.server = Servers.put(Object.assign(sv, { seen: Date.now(), pwh: G.server.pwh || '' })); $('roomLabel').innerHTML = '<i class="live"></i>'; $('roomLabel').appendChild(document.createTextNode(sv.name)); } if (first) { loadMods(G.server); modsHello(); } }
      if (typeof m.name === 'string') { G.me.name = G.profile.name = cleanName(m.name); }
      if (m.renamed) setTimeout(() => sys('The name "' + cleanText(m.renamed) + '" is already taken, so you are ' + G.me.name + ' for now. Pick a new name in the menu!'), 1200);
      addNames(m.names);
      G.drops = new Map((Array.isArray(m.drops) ? m.drops : []).filter(d => d && ITEMS[d.type] && okVec(vec(d.p))).map(d => [String(d.id), { id: String(d.id), type: d.type, p: vec(d.p) }])); syncDrops(); setWeather(m.wx); if (Array.isArray(m.clouds)) G.game.addClouds(m.clouds);
      idSign('id:' + m.nonce).then(sig => { if (sig && G) Net.toKeeper({ t: 'idsig', sig }); });
      if (BUILDING) G.B.load(m.parts || [], m.wires || []); G.dirty = true; G.game.allPartsChanged(); G.game.setPower(new Set(m.power || []));
      G.bans = new Set((m.bans || []).filter(b => typeof b === 'string'));
      G.taken = new Map((m.taken || []).map(i => [i, 0]));
      G.board = Array.isArray(m.board) ? m.board.slice(0, 5) : [];
      G.dayStart = performance.now() - m.phase * DAY_MS; syncClock(m.wt, true);
      G.players.clear(); G.players.set(m.id, G.me);
      for (const r of m.roster) if (r.id !== m.id) applyRoster(addPlayer({ id: r.id, p: r.p, name: '' }), r);
      G.me.admin = false;
      Promise.all([adminSign(store.get('pass', ''), m.nonce), adminSign(store.get('pass', ''), 'admin:' + m.id)]).then(([sig, proof]) => { if (sig && G) Net.toKeeper({ t: 'admin', sig, proof }); });
      $('roomLabel').innerHTML = '<i class="live"></i>Online';
      if (first) { enterGame(); sys('Welcome to Nautic Online! ' + (m.roster.length - 1) + ' other ' + (m.roster.length === 2 ? 'player is' : 'players are') + ' here.'); }
      else showToast('Back online!', 1500);
      G.reconnecting = false; renderPeople(); renderBag();
      return;
    }
    if (!G.myId) {
      if (m.t === 'full') leave('The world is full right now (' + MAX_PLAYERS + ' players). Try again soon!');
      if (m.t === 'kicked') leave('The admin removed you from the world for a while.');
      if (m.t === 'banned') leave('You are banned from this world.');
      if (m.t === 'badpw') { if (G.server) { const sv = Servers.get(G.server.id); if (sv) { delete sv.pwh; Servers.put(sv); } } leave('That password is not right for this server.'); }
      return;
    }
    if (m.t === 'names') { addNames(m.add); return; }
    if (m.t === 'mg') { mgRecv(m.s); return; }
    if (m.t === 'drop') { if (m.del) G.drops.delete(String(m.del)); for (const d of Array.isArray(m.add) ? m.add : []) if (d && ITEMS[d.type] && okVec(vec(d.p))) G.drops.set(String(d.id), { id: String(d.id), type: d.type, p: vec(d.p) }); syncDrops(); return; }
    if (m.t === 'wx') { setWeather(m.mode); return; }
    if (m.t === 'clouds') { if (Array.isArray(m.add)) G.game.addClouds(m.add); return; }
    if (m.t === 'flash') { G.game.flash = 1; setTimeout(() => Sound.play('thunder'), 500); return; }
    if (m.t === 'rename') { if (typeof m.name === 'string') { G.me.name = G.profile.name = cleanName(m.name); sys('The name "' + cleanText(m.was) + '" belongs to another player, so you are ' + G.me.name + ' for now. Pick a new name in the menu!'); renderPeople(); } return; }
    if (m.t === 'roster') {
      const ids = new Set(m.roster.map(r => r.id));
      for (const id of [...G.players.keys()]) if (!ids.has(id)) G.players.delete(id);
      for (const r of m.roster) { if (!r || typeof r.id !== 'string') continue; const p = G.players.get(r.id); if (!p) { applyRoster(addPlayer({ id: r.id, p: r.p, name: '' }), r); } else if (p !== G.me) applyRoster(p, r); else { p.admin = !!r.admin && OWNER; if (p.admin && cleanName(r.name) && p.name !== cleanName(r.name)) { p.name = G.profile.name = cleanName(r.name); } } }
      renderPeople();
    } else if (m.t === 'state') {
      G.dayStart = performance.now() - m.phase * DAY_MS; syncClock(m.wt);
      for (const [id, x, y, z, fl, big, gl, sh] of m.p) { const p = G.players.get(id); if (p && p !== G.me) { p.tp = [x, y, z]; p.fly = !!fl && !!p.admin; p.big = big; p.glow = gl; p.ship = !!sh && !!p.admin; } }
    } else if (m.t === 'bye') { const p = G.players.get(m.id); if (p) { sys(p.name + ' left'); G.players.delete(m.id); renderPeople(); } }
    else if (m.t === 'chat') { const p = G.players.get(m.id); if (p) say(p, cleanText(m.text)); }
    else if (m.t === 'emote') { const p = G.players.get(m.id); if (p && EMOTES.includes(m.e)) emote(p, m.e); }
    else if (m.t === 'block') { if (BUILDING && [m.x, m.y, m.z].every(Number.isInteger) && (m.k === 0 || PARTS[m.k])) applyBlock(m.x, m.y, m.z, m.k, m.r | 0); }
    else if (m.t === 'wire') { if (BUILDING && typeof m.a === 'string' && typeof m.b === 'string') applyWire(m.a, m.b, !!m.add); }
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
    Sound.play('pickup'); prog.add('items'); if (type === 'star') prog.max('star', 1); if (type === 'key') prog.max('skykey', 1); if (type === 'trophy') prog.max('trophy', 1); questCheck();
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
      row.querySelector('b').innerHTML = done ? icon('check', 14) + ' ' : ''; row.querySelector('b').appendChild(document.createTextNode(q.name)); row.querySelector('.rw').textContent = '+' + q.coins;
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
    G.body.p = [s[0], s[1] + 1.2, s[2]]; G.body.v = [0, 0, 0]; G.body.caveLock = null; G.game.cave = null; G.game.realm = null;
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
      case 'weather': { const mode = ['auto', 'clear', 'cloudy', 'rain', 'storm'].includes(o.mode) ? o.mode : 'auto'; setWeather(mode); Net.toAll({ t: 'wx', mode });
        // rain and storms come with their real clouds, right above the admin
        if (mode === 'storm' || mode === 'rain') { const at = admin.tp, add = [{ kind: mode === 'storm' ? 'supercell' : 'nimbo', v: Math.floor(Math.random() * 2), x: Math.round(at[0] - (mode === 'storm' ? 450 : -20)), y: mode === 'storm' ? 200 : 240, z: Math.round(at[2] - 10), s: mode === 'storm' ? 1.1 : 1.1, rot: mode === 'storm' ? 0 : +(Math.random() * 6.28).toFixed(2), ph: +(Math.random() * 6.28).toFixed(2), wind: 0 }]; G.game.addClouds(add); Net.toAll({ t: 'clouds', add }); }
        both('The admin made the weather ' + (mode === 'auto' ? 'normal again' : mode)); break; }
      case 'clouds': { // put real clouds of one kind in the sky around the admin
        const kind = CLOUD_KINDS[o.kind] ? o.kind : 'cumulus', n = Math.max(1, Math.min(10, o.n | 0 || 1)), at = admin.tp, H = { supercell: 200, cumulus: 340, congestus: 300, cb: 230, stratus: 280, strato: 330, alto: 700, cirrus: 1100, nimbo: 240, lens: 480 }, add = [];
        for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, d = 120 + Math.random() * 380; add.push({ kind, v: Math.floor(Math.random() * 3), x: Math.round(at[0] + Math.cos(a) * d), y: H[kind] + Math.round(Math.random() * 40), z: Math.round(at[2] + Math.sin(a) * d), s: +(0.9 + Math.random() * 0.5).toFixed(2), rot: +(Math.random() * 6.283).toFixed(2), ph: Math.round(Math.random() * 100) }); }
        G.game.addClouds(add); Net.toAll({ t: 'clouds', add }); reply('Spawned ' + n + ' ' + CLOUD_KINDS[kind] + (n > 1 ? ' clouds' : ' cloud')); break; }
      case 'flash': G.game.flash = 1; setTimeout(() => Sound.play('thunder'), 500); Net.toAll({ t: 'flash' }); break;
      case 'bringall': for (const q of G.players.values()) if (q !== admin) tell(q, { t: 'tp', p: [admin.tp[0] + (Math.random() - 0.5) * 4, admin.tp[1] + 1.5, admin.tp[2] + (Math.random() - 0.5) * 4] }); reply('Everyone is here!'); break;
      default: reply('Unknown command. Type /help');
    }
  }
  // ---------- storm chase minigame ----------
  function startChase(now) {
    G.chase = new StormChase(G.game, now); G.nail = false; $('nailBtn').classList.remove('hidden');
    showToast('Storm chase! A supercell is building. Find the tornado, get close, and press N (or the nail) inside it to intercept', 5200);
    banner('Storm chase', 'Chase the tornado!'); Sound.play('quest'); prog.add('chases'); questCheck();
  }
  function endChase() {
    const C = G.chase; if (!C) return;
    const coins = Math.round(C.score / 8);
    prog.give(coins); if (C.intercepted) prog.add('intercepts'); questCheck(); prog.save();
    showToast('Chase over! ' + Math.floor(C.score) + ' points' + (C.intercepted ? ' · intercept at ' + Math.round(C.best) + ' km/h' : '') + ' · +' + coins + ' coins', 5000);
    const L = G.game.extraClouds; if (L) { const i = L.indexOf(C.cloud); if (i >= 0) L.splice(i, 1); }
    G.chase = null; G.nail = false; G.chaseCool = performance.now() + 5000; G.game.shake = 0; $('nailBtn').classList.add('hidden'); $('nailBtn').classList.remove('on');
  }
  // ---------- sky race, fishing pier, game arena ----------
  const SKY_FAST = 45;
  const gameUI = {
    toast: (t, ms) => showToast(t, ms), banner: (a, b, c) => banner(a, b, c),
    finish: (t, coins, kind, time) => { showToast(t, 5000); prog.give(coins); if (kind === 'sky') { prog.add('skyraces'); if (time < SKY_FAST) prog.add('skyFast'); } questCheck(); prog.save(); Sound.play('quest'); },
    fishBar: st => {
      const el = $('fishBar'); if (!st) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      if (el.dataset.col !== st.col) { el.dataset.col = st.col; el.querySelector('.fbFish').innerHTML = fishIconSvg(st.col); }
      el.querySelector('.fbZone').style.left = (st.zp * 100) + '%'; el.querySelector('.fbZone').style.width = (st.zw * 100) + '%';
      el.querySelector('.fbZone').classList.toggle('on', st.inZ);
      el.querySelector('.fbFish').style.left = (st.fp * 100) + '%'; el.querySelector('.fbProg i').style.width = (st.prog * 100) + '%';
    },
    caught: (id, f, cm, rar) => {
      const isNew = prog.mark('fishSeen', id), big = rar ? Math.round(rar.coins * (0.8 + 0.4 * (cm - f.cm[0]) / Math.max(1, f.cm[1] - f.cm[0]))) : 1, coins = big + (isNew && rar ? 10 : 0);
      prog.give(coins); if (rar) { prog.add('fish'); if (f.rar === 3) prog.add('legendFish'); } prog.max('fishKinds', prog.count('fishSeen') - (prog.has('fishSeen', 'boot') ? 1 : 0));
      const rec = prog.stats['fishBest_' + id] || 0; if (cm > rec) prog.max('fishBest_' + id, cm);
      questCheck(); prog.save(); Sound.play(rar && f.rar >= 2 ? 'quest' : 'chest');
      banner(rar ? rar.n + (isNew ? ' · new fish!' : '') : 'Junk', f.name + ' · ' + cm + ' cm', '+' + coins + (coins === 1 ? ' coin' : ' coins') + (rec && cm > rec ? ' · your biggest one yet!' : '') + ' · ' + (prog.count('fishSeen') - (prog.has('fishSeen', 'boot') ? 1 : 0)) + '/10 kinds caught', 3600);
    },
  };
  const hostIO = {
    pos: id => { const p = G.players.get(id); return p ? p.tp : null; }, alive: id => G.players.has(id),
    tp: (id, p) => { if (id === G.myId) { G.body.p = [...p]; G.body.v = [0, 0, 0]; } else Net.toOne(id, { t: 'tp', p: p.map(v => +v.toFixed(2)) }); },
  };
  function mgClear() { G.mg = null; G.mgBots.clear(); $('blind').classList.add('hidden'); }
  function mgRecv(s) {
    if (!G || !s || typeof s !== 'object') return;
    if (s.note) { showToast(cleanText(String(s.note)), 2600); return; }
    if (s.ph === 'gone') { mgClear(); return; }
    if (!Array.isArray(s.ids) || !Array.isArray(s.it)) return;
    G.mg = s; G.mgAt = performance.now();
    const seen = new Set();
    for (const r of Array.isArray(s.bots) ? s.bots.slice(0, 8) : []) {
      if (!Array.isArray(r) || r.length < 9) continue; const id = String(r[0]).slice(0, 12), tp = vec([r[6], r[7], r[8]]); if (!okVec(tp)) continue; seen.add(id);
      let o = G.mgBots.get(id); if (!o) { o = { id, bot: true, p: [...tp], R: [1, 0, 0, 0, 1, 0, 0, 0, 1], r: 0.45, trail: 'none', og: [], devType: 'bot' }; G.mgBots.set(id, o); }
      Object.assign(o, { name: cleanName(String(r[1])), skin: SKINS[r[2]] ? r[2] : 'plain', color: COLORS.includes(r[3]) ? r[3] : '#5aa9ff', color2: COLORS.includes(r[4]) ? r[4] : '#5aa9ff', hat: HATS[r[5]] && !ownerOnly('hat', r[5]) ? r[5] : 'none', tp });
      if (G.role !== 'guest') o.p = [...tp];
    }
    for (const id of [...G.mgBots.keys()]) if (!seen.has(id)) G.mgBots.delete(id);
    const mine = s.ids.includes(G.myId), near = Math.hypot(G.body.p[0] - ARENA.x, G.body.p[2] - ARENA.z) < 140;
    if (Array.isArray(s.ev) && s.ev[0] !== G.mgEv) { G.mgEv = s.ev[0]; if ((mine || near) && s.ev[1]) showToast(cleanText(String(s.ev[1])), 2600); }
    if (s.ph === 'end' && s.res && mine && G.mgPaid !== s.rid) { const r = s.res[G.myId]; if (Array.isArray(r)) { G.mgPaid = s.rid; const coins = Math.max(0, Math.min(60, r[0] | 0)); prog.give(coins); prog.add('arenaRounds'); if (r[2]) prog.add(s.k === 'tag' ? 'tagWins' : 'hideWins'); questCheck(); prog.save(); banner(s.k === 'tag' ? 'Tag' : 'Hide and seek', r[2] ? 'You win!' : 'Round over', cleanText(String(r[1])), 5000); Sound.play(r[2] ? 'quest' : 'coin'); } }
  }
  function arenaStep(now, dt) {
    if (!G.game.arena) return;
    const A = G.game.arena, b = G.body, pad = A.padAt(b.p), mg = G.mg;
    if (pad && now > (G.mgJoin || 0) && !(mg && mg.ids.includes(G.myId) && mg.ph !== 'end')) { G.mgJoin = now + 2000; if (G.role === 'guest') Net.toKeeper({ t: 'mg', a: 'join', k: pad }); else { const r = A.hostJoin(G.myId, pad, G.me.name); if (r) showToast(r, 2600); } }
    if (G.role !== 'guest') { const s = A.hostTick(dt, now, hostIO); if (s) { if (now - (G.mgSent || 0) > 100 || s.ph === 'gone') { G.mgSent = now; Net.toAll({ t: 'mg', s }); } mgRecv(s); } }
    if (G.mg && now - G.mgAt > 3000) mgClear();
    const a = 1 - Math.pow(0.0008, dt);
    for (const o of G.mgBots.values()) { const ox = o.p[0], oz = o.p[2]; if (G.role === 'guest') for (let i = 0; i < 3; i++) o.p[i] += (o.tp[i] - o.p[i]) * a; G.game.rollBy(o, o.p[0] - (o._rx ?? ox), o.p[2] - (o._rz ?? oz), 0.45); o._rx = o.p[0]; o._rz = o.p[2]; }
    // who is it, who is seeking, and hide the hiders' names from the seekers
    const s = G.mg, live = s && s.ph !== 'lobby' && s.ph !== 'end', seeker = live && s.k === 'hide' && s.it.includes(G.myId);
    for (const p of [...G.players.values(), ...G.mgBots.values()]) {
      const inR = live && s.ids.includes(p.id); p.it = !!(inR && s.it.includes(p.id)); p.seek = !!(s && s.k === 'hide');
      p.badge = p.it ? (s.k === 'tag' ? { t: 'It!', c: '#e8343a' } : { t: 'Seeker', c: '#c8901a' }) : null; p.hideLabel = !!(seeker && inR && !p.it && p !== G.me);
    }
    const blind = !!(s && s.k === 'hide' && s.ph === 'hide' && s.it.includes(G.myId));
    $('blind').classList.toggle('hidden', !blind); if (blind) $('blind').querySelector('span').textContent = s.left + '';
    return blind;
  }
  function mgChip() {
    const s = G.mg; if (!s || !s.ids.includes(G.myId)) return '';
    const iAm = s.it.includes(G.myId), t = Math.floor(s.left / 60) + ':' + String(s.left % 60).padStart(2, '0'), names = s.it.map(id => (s.names && s.names[id]) || 'someone').join(', ');
    if (s.ph === 'lobby') return (s.k === 'tag' ? 'Tag' : 'Hide and seek') + ' · starting in ' + s.left + ' s · ' + s.ids.length + ' joined (bots fill the rest)';
    if (s.ph === 'end') return 'Round over';
    if (s.k === 'tag') return iAm ? 'Tag · you are it! Roll into someone · ' + t : 'Tag · run! ' + names + (s.it.length > 1 ? ' are' : ' is') + ' it · ' + t;
    if (s.ph === 'hide') return iAm ? 'Hide and seek · counting… ' + s.left : 'Hide and seek · hide! The seeker comes out in ' + s.left + ' s';
    const left = s.ids.filter(id => !s.it.includes(id)).length;
    return iAm ? 'Hide and seek · find them! ' + left + ' still hiding · ' + t : 'Hide and seek · stay hidden! ' + left + ' still hiding · ' + t;
  }
  const parkUI = {
    toast: (t, ms) => showToast(t, ms), banner: (a, b, c) => banner(a, b, c),
    finish: (t, coins, kind) => { showToast(t, 5000); prog.give(coins); prog.add({ golf: 'golfs', bowl: 'bowls', hunt: 'hunts' }[kind]); questCheck(); prog.save(); Sound.play('quest'); },
    goal: () => { prog.add('goals'); questCheck(); },
  };
  function toggleNail() {
    if (!G || !G.chase) return;
    G.nail = !G.nail; $('nailBtn').classList.toggle('on', G.nail);
    showToast(G.nail ? 'Nail down: you are stuck to the ground' : 'Nail up: you can roll again', 1200);
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
    else if (where === 'isles') p = [SKY_ISLES[0][0], SKY_ISLES[0][1] + 2, SKY_ISLES[0][2]];
    else if (REALMS[where]) { const R = G.game.realmGet(where); G.body.p = [...R.start]; G.body.v = [0, 0, 0]; G.game.cave = null; Sound.play('tp'); showToast(R.name + '!', 1200); return; }
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
    sp.append(tbtn('Real clouds', () => { spawnPick.type = 'sky'; renderAdmin(); }, spawnPick.type === 'sky'));
    if (spawnPick.type === 'sky') { const cs = sec('sun', 'Which kind of cloud?'); for (const [k, n] of Object.entries(CLOUD_KINDS)) cs.append(tbtn(n, () => { spawnPick.cloud = k; renderAdmin(); }, spawnPick.cloud === k)); }
    { const r = document.createElement('div'); r.className = 'aRow'; const amt = document.createElement('input'); amt.type = 'number'; amt.min = 1; amt.max = spawnPick.type === 'sky' ? 10 : 20; amt.value = spawnPick.n; amt.placeholder = 'How many'; amt.oninput = () => { spawnPick.n = amt.value; };
      const what = spawnPick.type === 'sky' ? CLOUD_KINDS[spawnPick.cloud] : ITEMS[spawnPick.type].name;
      r.append(amt, btn('check', 'Spawn ' + what, () => { const n = Math.max(1, Math.min(+amt.max, Math.floor(+amt.value) || 1)); if (spawnPick.type === 'sky') runAdmin({ cmd: 'clouds', kind: spawnPick.cloud, n, at: G.body.p.map(v => +v.toFixed(1)) }); else runAdmin({ cmd: 'spawn', type: spawnPick.type, n }); })); box.appendChild(r); }
    const wx = sec('sun', 'Weather');
    for (const [m, n] of [['auto', 'Normal'], ['clear', 'Clear'], ['cloudy', 'Cloudy'], ['rain', 'Rain'], ['storm', 'Storm']]) wx.append(tbtn(n, () => runAdmin({ cmd: 'weather', mode: m }), G.wx === m));
    wx.append(tbtn('Lightning', () => runAdmin({ cmd: 'flash' })));
    const tp = sec('go', 'Teleport');
    for (const [w, n] of [['plaza', 'Plaza'], ['station', 'Station'], ['parkour', 'Parkour'], ['up', 'Up high'], ['1', 'Beach'], ['3', 'Forest'], ['4', 'Desert'], ['5', 'Snow'], ['6', 'Mountains'], ['7', 'Swamp'], ['8', 'Glow fields'], ['0', 'Ocean'], ['space', 'Space'], ['sea', 'Coral kingdom'], ['crystal', 'Crystal hollow']]) tp.append(tbtn(n, () => teleportTo(w)));
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
    if (G && G.game.mods) G.game.mods.fire('chat', { text, player: p.id === 'me' ? G.myId : p.id });
    const row = document.createElement('div'); row.className = 'm';
    const b = document.createElement('b'); b.style.color = p.admin ? '#ffd27a' : p.color; b.innerHTML = p.admin ? icon('star', 13) + ' ' : ''; b.appendChild(document.createTextNode(p.name + ':'));
    row.append(b, document.createTextNode(text)); addLog(row);
  }
  function sys(text) { const row = document.createElement('div'); row.className = 'sys'; row.textContent = text; addLog(row); }
  function announce(text) { const row = document.createElement('div'); row.className = 'ann'; row.innerHTML = icon('announce', 15) + ' '; row.appendChild(document.createTextNode(text)); addLog(row); showToast(text, 5000); }
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
      const b = document.createElement('button'); b.innerHTML = emoteSvg(e, 26); b.title = e;
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
      const nm = document.createElement('span'); nm.className = 'nm'; nm.innerHTML = p.admin ? icon('star', 13) + ' ' : ''; nm.appendChild(document.createTextNode(p.name + (p === G.me ? ' (you)' : '')));
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
  const BASE_CATS = ['blocks', 'machines', 'circuits', 'decor'], CAT_NAMES = { blocks: 'Blocks', machines: 'Machines', circuits: 'Circuits', decor: 'Decor', mods: 'Mods' }, CAT_ICONS = { blocks: 'build', machines: 'gear', circuits: 'chip', decor: 'star', mods: 'nail' };
  const catList = () => TOOL_CATS.mods && TOOL_CATS.mods.length ? [...BASE_CATS, 'mods'] : BASE_CATS;
  const toolList = () => [...TOOL_CATS[G.cat], 0];
  const curTool = () => toolList()[G.tool];
  function nextCat() { const CATS = catList(); G.cat = CATS[(CATS.indexOf(G.cat) + 1) % CATS.length]; G.tool = 0; G.wireFrom = null; buildHotbar(); selectTool(0); }
  function buildHotbar() {
    const tabs = $('tabs'); tabs.textContent = '';
    for (const c of catList()) { // the kinds of things you can build are always on show
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
    if (!G.myId || !BUILDING) return;
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
    if (G.game.mods && !e.repeat) G.game.mods.fire('key', { key: e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase() });
    if (BUILDING && /^[0-9]$/.test(e.key)) { const i = (+e.key + 9) % 10; if (i < toolList().length) selectTool(i); return; }
    if (BUILDING && (e.key === '-' || e.key === '=')) { const n = toolList().length; selectTool((G.tool + (e.key === '=' ? 1 : n - 1)) % n); return; }
    const k = e.key.toLowerCase();
    if (k === 'f' && G.me.admin) { setFly(!G.me.fly); return; }
    if (k === 'tab') { e.preventDefault(); if (BUILDING) nextCat(); return; }
    if (k === 'i' || k === 'b') { $('bagBtn').click(); return; }
    if (k === 'r') { respawn(); return; }
    if (k === 'o') { $('wardBtn').click(); return; }
    if (k === 'v') { toggleShip(); return; }
    if (k === 'n') { toggleNail(); return; }
    if (k === 'm') { $('musicBtn').click(); return; }
    if (window.NAUTIC_BETA && k === 'g') { BigMap.toggle(); return; }
    if (window.NAUTIC_BETA && k === 'p') { Extra.setPhoto(!Extra.photo); return; }
    if (window.NAUTIC_BETA && e.key === 'Escape' && Extra.photo) { Extra.setPhoto(false); return; }
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
    if (d.moved > 6) { const ls = Extra.look; G.game.cam.yaw -= dx * 0.008 * ls; G.game.cam.pitch = G.ship && G.ship.st === 'fly' ? Math.max(-1.3, Math.min(1.3, G.game.cam.pitch + dy * 0.006 * ls)) : Math.max(-0.2, Math.min(1.35, G.game.cam.pitch + dy * 0.006 * ls)); }
  });
  const endDrag = e => {
    const d = drags.get(e.pointerId); drags.delete(e.pointerId); if (!d || !G || !G.myId) return;
    if (d.moved > 6 || e.type === 'pointercancel') return;
    if (Extra.photo) { Extra.setPhoto(false); return; }
    if (window.NAUTIC_BETA && G.game.miniBox && Math.hypot(e.clientX - G.game.miniBox[0], e.clientY - G.game.miniBox[1]) < G.game.miniBox[2]) { BigMap.open(); return; }
    if (!G.building && modClick(e.clientX, e.clientY)) return;
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
    const game = G.game, inSt = insideStation(b.p), cave = game.cave || game.realm, info = game.T.info(b.p[0], b.p[2]);
    if (!cave && !inSt && ((info.b >= 1 && info.b <= 8) || (info.b >= 12 && BIOMES[info.b] && info.b !== 15))) { if (prog.mark('biomes', info.b)) { prog.max('b' + info.b, 1); banner('New land found', BIOMES[info.b].name, 'Keep exploring for more!', 3000); Sound.play('discover'); } }
    if (inSt || nearStation(b.p[0], b.p[2], 70)) prog.max('station', 1);
    if (VOLCANO.on && !cave && Math.hypot(b.p[0] - VOLCANO.x, b.p[2] - VOLCANO.z) < VOLCANO.R * 0.6) prog.max('volcano', 1);
    // discovering places (they get their names on the compass and map)
    if (!cave) for (const q of game.places(b.p[0], b.p[2], 60)) if (Math.hypot(q.x - b.p[0], q.z - b.p[2]) < 28 && prog.mark('places', q.key)) { prog.mark('kinds', q.kind); banner('Discovered', q.name, 'It is on your map now', 3000); Sound.play('discover'); }
    game.known = new Set(Object.keys(prog.sets.places || {}));
    const night = G.wasNight; if (night) G.sawNight = true; else if (G.sawNight) { G.sawNight = false; prog.add('nights'); }
    questCheck();
    Sound.setRain(game.rain || 0);
    if (game.realm) { Sound.setMood(game.realm.mood); return; }
    if (G.modMusic) { Sound.setMood(G.modMusic); return; }
    Sound.setMood(cave ? 'cave' : inSt ? 'station' : G.dark > 0.45 ? 'night' : ({ 0: 'ocean', 1: 'beach', 2: 'meadow', 3: 'forest', 4: 'desert', 5: 'snow', 6: 'mountain', 7: 'swamp', 8: 'glow', 9: 'plaza', 10: 'station', 11: 'volcano', 12: 'desert', 13: 'desert', 14: 'beach', 15: 'desert', 16: 'forest', 17: 'forest', 18: 'snow', 19: 'desert', 20: 'desert' }[info.b] || (BIOMES[info.b] && BIOMES[info.b].mood) || 'meadow'));
  }

  // ---------- the owner ship: it flies down, you jump in, then you fly it from the cockpit ----------
  function toggleShip() {
    if (!G || !myLook().og.includes('ship')) return;
    const b = G.body, f = G.game.forward();
    if (!G.ship) { const tp = [b.p[0] + f[0] * 4, b.p[1] + 2.4, b.p[2] + f[1] * 4]; G.ship = { st: 'arrive', t: 0, from: [tp[0] - f[0] * 45, tp[1] + 35, tp[2] - f[1] * 45], to: tp, p: [...tp], hd: Math.atan2(f[1], f[0]) }; Sound.play('boost'); showToast('Here comes your ship!', 1500); }
    else if (G.ship.st === 'fly') { G.ship.st = 'away'; G.ship.t = 0; G.me.ship = false; G.game.fpv = null; b.p = [G.ship.p[0], G.ship.p[1] - 1.6, G.ship.p[2]]; b.v = [0, 0, 0]; G.game.cam.pitch = 0.42; $('downBtn').classList.toggle('hidden', !G.me.fly || !Device.useTouch); showToast('Bye ship!', 1000); }
  }
  // returns true while the ship is moving the ball (so normal rolling is skipped)
  function shipStep(dt, ix, iy, up, down) {
    const S = G.ship; if (!S) return false; S.t += dt; const b = G.body, cam = G.game.cam, ease = x => x * x * (3 - 2 * x);
    if (S.st === 'arrive') { const k = ease(Math.min(1, S.t / 1.6)); S.p = S.from.map((v, i) => v + (S.to[i] - v) * k); S.pitch = -0.4 * (1 - k); S.open = ease(Math.max(0, Math.min(1, (S.t - 0.9) / 0.7))); if (S.t >= 1.6) { S.st = 'board'; S.t = 0; S.b0 = [...b.p]; Sound.play('jump'); } return false; }
    if (S.st === 'board') { // jump up and into the seat, then the canopy swings shut
      const k = Math.min(1, S.t / 1.0), seat = [S.p[0] + Math.cos(S.hd) * 0.95, S.p[1] + 1.3, S.p[2] + Math.sin(S.hd) * 0.95];
      b.p = S.b0.map((v, i) => v + (seat[i] - v) * ease(k)); b.p[1] += Math.sin(k * Math.PI) * 2.6; b.v = [0, 0, 0];
      S.open = 1 - ease(Math.max(0, Math.min(1, (S.t - 1.05) / 0.5))); if (k >= 1 && S.t > 1.0 && !S.landed) { S.landed = true; Sound.play('land'); }
      if (S.t >= 1.7) { S.st = 'fly'; G.me.ship = true; cam.pitch = 0.05; cam.yaw = Math.atan2(-Math.cos(S.hd), -Math.sin(S.hd)); Sound.play('tp'); showToast('Flying! Drag to steer, W/joystick to fly, jump to go up, Shift or down to go down, V to get out', 4000); $('downBtn').classList.toggle('hidden', !Device.useTouch); } return true; }
    if (S.st === 'fly') {
      const cp = Math.cos(cam.pitch), d = [-Math.sin(cam.yaw) * cp, -Math.sin(cam.pitch), -Math.cos(cam.yaw) * cp], rt = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)], sp = 34;
      const v = [d[0] * -iy * sp + rt[0] * ix * 16, d[1] * -iy * sp + (up ? 12 : 0) - (down ? 12 : 0), d[2] * -iy * sp + rt[2] * ix * 16];
      S.v = (S.v || [0, 0, 0]).map((x, i) => x + (v[i] - x) * Math.min(1, dt * 3)); for (let i = 0; i < 3; i++) S.p[i] += S.v[i] * dt;
      S.p[0] = Math.max(-LIMIT, Math.min(LIMIT, S.p[0])); S.p[2] = Math.max(-LIMIT, Math.min(LIMIT, S.p[2])); S.p[1] = Math.min(S.p[1], 1500);
      if (!G.game.realm && !G.game.cave) S.p[1] = Math.max(S.p[1], Math.max(G.game.T.ground(S.p[0], S.p[2]), SEA) + 1.5);
      S.hd = Math.atan2(d[2], d[0]); S.pitch = -cam.pitch;
      b.p = [...S.p]; b.v = [0, 0, 0]; G.game.fpv = [S.p[0] + d[0] * 0.95, S.p[1] + 1.35, S.p[2] + d[2] * 0.95];
      return true;
    }
    if (S.st === 'away') { S.open = 0; S.p[1] += dt * 25; S.p[0] += Math.cos(S.hd) * dt * 40; S.p[2] += Math.sin(S.hd) * dt * 40; if (S.t > 2.2) G.ship = null; return false; }
    return false;
  }

  // ---------- activities ----------
  function activities(now) {
    const b = G.body, game = G.game;
    for (const it of game.nearbyItems(b.p)) { // pick up items you roll into
      const pr = G.me.gadget === 'magnet' || (gadgetFx(G.me.gadget) || {}).magnet ? 5.5 : 1.4; if (Math.abs(it.p[0] - b.p[0]) > pr || Math.abs(it.p[2] - b.p[2]) > pr || Math.abs(it.p[1] - b.p[1]) > pr + 0.2) continue;
      if (it.type === 'trophy') { if (!G.inv.trophy) { gotItem('trophy'); sys('You beat the parkour climb!'); } continue; }
      if (G.taken.has(it.id) || G.asked === it.id) continue;
      G.asked = it.id; setTimeout(() => { if (G && G.asked === it.id) G.asked = null; }, 800);
      if (G.role === 'guest') Net.toKeeper({ t: 'take', id: it.id, type: it.type }); else tryTake(G.me, it.id, it.type);
    }
    // parkour checkpoints
    if (!game.region) for (const cp of game.landmarks[1].checkpoints) if (Math.hypot(b.p[0] - cp[0], b.p[1] - cp[1], b.p[2] - cp[2]) < 2 && G.lastSpawnPad !== cp.join()) { G.lastSpawnPad = cp.join(); G.spawn = [...cp]; store.set('spawn5', JSON.stringify(G.spawn)); showToast('Checkpoint! You\'ll respawn here', 1500); }
    // storm chase
    if (!game.region) { const cp = CHASE_START, gy = game.T.ground(cp[0], cp[2]);
      if (!G.chase && !G.race && now > (G.chaseCool || 0) && Math.hypot(b.p[0] - cp[0], b.p[2] - cp[2]) < 1.8 && Math.abs(b.p[1] - gy) < 2.5) startChase(now); }
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
    if (kind === 'cannon') { Sound.play('boom'); P.burst(bp, 30, { cols: ['#cfcfcf', '#ffb347', '#ffffff'], shape: 0, size: 0.4, speed: 5, life: 0.8 }); prog.add('cannons'); questCheck(); showToast('Boom!', 800); return; }
    if (kind === 'realm-in') { const R = REALMS[arg]; Sound.play('tp'); banner('Welcome to', R.name, arg === 'space' ? 'Low gravity: jump across the floating rocks!' : arg === 'sea' ? 'You can breathe down here. Find the pearls!' : 'Look for glowing crystals and gems', 4000); prog.max('realm_' + arg, 1); questCheck(); return; }
    if (kind === 'realm-out') { Sound.play('tp'); showToast('Back on the main land!', 1400); return; }
    if (kind === 'flap') { Sound.play('jump'); P.burst([bp[0], bp[1], bp[2]], 10, { cols: ['#cdb4ff', '#a8d8ff', '#ffffff'], shape: 22, size: 0.16, speed: 2.5, life: 0.6 }); return; }
    if (kind === 'hot' && G) { respawn(); showToast('Too hot! Back to spawn', 1500); return; }
    if (kind === 'jumped') { if (G.game.mods) G.game.mods.fire('jump', { player: G.myId }); prog.add('jumps'); Sound.play('jump'); P.burst([bp[0], bp[1] - 0.35, bp[2]], 8, { col: [0.92, 0.88, 0.8], shape: 0, size: 0.22, speed: 1.6, up: 0.3, life: 0.5, drag: 3 }); return; }
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
      G.spawn = [arg[0] + 0.5, arg[1] + 1.5, arg[2] + 0.5]; if (!G.region) store.set('spawn5', JSON.stringify(G.spawn)); showToast('Spawn point set!', 1500);
    }
  }

  if (new URLSearchParams(location.search).has('debug')) window.__funz = () => G;
  const NO_RENDER = new URLSearchParams(location.search).has('norender'); // for tests

  // testing a mod from the Mod Editor: ?modtest=<id>&at=x,y,z (offline, just you, nothing saved)
  { const q = new URLSearchParams(location.search), id = q.get('modtest');
    if (id) { const m = ModKit.loadAll().mods[id], at = (q.get('at') || '').split(',').map(Number);
      if (m) setTimeout(() => { if (!myName()) { const n = (() => { try { return (JSON.parse(localStorage.getItem('ultranautic.account') || 'null') || {}).name; } catch (e) { return null; } })(); if (n) $('nameInput').value = n; }
        play({ id: 'modtest', name: 'Testing ' + m.name, vis: 'link', pw: '', mods: [ModKit.clean(m)], test: true, at: at.length === 3 && at.every(isFinite) ? [at[0], at[1] + 1.5, at[2]] : null }); }, 400); } }

  // ---------- loop ----------
  let last = performance.now();
  function loop(now) {
    if (!G || !G.running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // keep it smooth: draw the 3D a bit smaller when frames are slow, sharper again when there's room
    { const P = G.perf || (G.perf = { t: 0, n: 0, sum: 0, good: 0 }); P.sum += (now - (P.last || now)) / 1000; P.last = now; P.n++;
      if (P.n >= 40 && !NO_RENDER) { const avg = P.sum / P.n, g = G.game; P.n = 0; P.sum = 0;
        const hq = /[?&]hq/.test(location.search), floor = P.lowered ? 0.6 : 0.85;
        if (avg > 1 / 40 && (g.scale || 1) > floor + 0.01) { g.scale = Math.max(floor, (g.scale || 1) - 0.05); g.resize(); P.good = 0; }
        else if (avg > 1 / 40 && !hq && !P.lowered && g.gfx.lower) { if (!g.gfx.lower()) P.lowered = true; P.good = 0; }
        else if (avg > 1 / 40 && !hq && g.gfx.lower) { P.lowered = true; }
        else if (avg < 1 / 56 && (g.scale || 1) < 1) { if (++P.good >= 3) { g.scale = Math.min(1, (g.scale || 1) + 0.1); g.resize(); P.good = 0; } } else P.good = 0; } }
    const m = G.me, b = G.body, cam = G.game.cam;
    for (const k in G.effects) if (G.effects[k] < now) delete G.effects[k];
    let ix = 0, iy = 0;
    if (keys.has('a') || keys.has('arrowleft')) ix--; if (keys.has('d') || keys.has('arrowright')) ix++;
    if (keys.has('w') || keys.has('arrowup')) iy--; if (keys.has('s') || keys.has('arrowdown')) iy++;
    if (keys.has('q')) cam.yaw += dt * 2; if (keys.has('e')) cam.yaw -= dt * 2;
    if (stick.id !== null) { ix = stick.x; iy = stick.y; }
    const blind = arenaStep(now, dt);
    const MP = G.modPow || {};
    if (G.frozen || blind || MP.frozen) ix = iy = 0;
    if (m.fly && !m.admin) m.fly = false;
    const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
    const f = G.game.forward(), rt = [-f[1], f[0]], go = l > 0.12 ? 1 : 0;
    const input = { x: (rt[0] * ix - f[0] * iy) * go, z: (rt[1] * ix - f[1] * iy) * go,
      jump: !G.frozen && !blind && !MP.frozen && (keys.has(' ') || jumpHeld), up: keys.has(' ') || jumpHeld, down: keys.has('shift') || downHeld };
    const gset = new Set(m.gadget && m.gadget !== 'none' ? [m.gadget] : []), gfx = gadgetFx(m.gadget);
    if (gfx) { if (gfx.float) gset.add('balloon'); if (gfx.glide) gset.add('glider'); if (gfx.dive) gset.add('snorkel'); if (gfx.glow) gset.add('lantern'); }
    if (G.ship && G.ship.st === 'fly') { ix = stick.id !== null ? stick.x : ix; }
    for (const k of m.og || []) gset.add(k);
    if (G.chase && !G.chase.update(dt, b, now, G.nail)) endChase();
    if (G.game.park) G.game.park.update(dt, b, input, now, parkUI);
    const fishing = G.game.pier && G.game.pier.update(dt, b, input, now, gameUI, { night: G.dark > 0.3, rain: (G.game.rain || 0) > 0.3 });
    const skyHold = G.game.sky && G.game.sky.update(dt, b, now, gameUI, G.game.cam);
    if (!fishing && !skyHold && !shipStep(dt, ix, iy, input.up, input.down)) G.game.step(b, input, dt, { fly: m.fly, big: !!G.effects.big || !!MP.big, fast: !!G.effects.fast, superJump: !!G.effects.superJump, g: gset, fx, mod: { speed: (gfx && gfx.speed || 1) * (MP.speed > 0 ? Math.min(MP.speed, 6) : 1), jump: (gfx && gfx.jump || 1) * (MP.jump > 0 ? Math.min(MP.jump, 8) : 1), gravity: MP.gravity != null ? Math.max(0, Math.min(MP.gravity, 5)) : null } });
    modsFrame(dt);
    if (G.chase && G.chase.anchor) { b.p = [...G.chase.anchor]; b.v = [0, 0, 0]; }
    if (!fishing && !skyHold && G.game.arena && G.game.arena.bounce(b)) Sound.play('boost');
    const RR = G.game.realmAt(b.p);
    if (RR && b.p[1] < RR.o[1] - 70) { b.p = [...RR.start]; b.v = [0, 0, 0]; showToast('Whoops! Back to the start', 1200); }
    else if (!RR && (b.p[1] < -780 || (b.p[1] < -60 && b.p[1] > -150) || (G.game.cave && b.p[1] < G.game.cave.o[1] - 30))) { respawn(); showToast('Oops! Back to your spawn point', 1500); }
    m.p = b.p; m.R = b.R; m.r = b.r; m.tp = b.p; m.glow = !!G.effects.glow || gset.has('lantern') || gset.has('aura'); m.big = !!G.effects.big;
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
    G.game.updateCreatures(dt, m, [...G.players.values()], G.wasNight, worldT() % 100000);

    if (G.role === 'guest' && G.myId && now - G.lastSend > 66) {
      G.lastSend = now; Net.toKeeper({ t: 'pos', p: b.p.map(v => +v.toFixed(2)), fl: !!m.fly, big: m.big, gl: m.glow, sh: !!m.ship });
      if (now - G.lastHeard > 6000) reconnect();
    }
    if (G.role === 'keeper' && now - G.lastState > 66) {
      G.lastState = now;
      Net.toAll({ t: 'state', phase: dayPhase(), wt: worldT(), p: [...G.players.values()].map(p => [p.id, +p.p[0].toFixed(2), +p.p[1].toFixed(2), +p.p[2].toFixed(2), !!p.fly, !!p.big, !!p.glow, !!p.ship]) });
    }

    const ph = dayPhase(), sun = Math.cos(ph * Math.PI * 2);
    const dark = Math.max(0, Math.min(0.72, (-sun + 0.15) * 0.85)); G.dark = dark;
    const hrs = (ph * 24 + 12) % 24;
    const night = dark > 0.3; if (night !== G.wasNight) { G.wasNight = night; $('clockIc').innerHTML = icon(night ? 'moon' : 'sun', 15); }
    $('clockT').textContent = String(Math.floor(hrs)).padStart(2, '0') + ':' + String(Math.floor((hrs % 1) * 60)).padStart(2, '0');
    if ($('placeT').textContent !== (G.game.place || '')) $('placeT').textContent = G.game.place || '';
    const chips = Object.entries(G.effects).map(([k, t]) => ({ fast: 'Speed', big: 'Big', superJump: 'Super jump', glow: 'Glow' }[k] + ' ' + Math.ceil((t - now) / 1000) + 's'));
    if (G.chase) { const C = G.chase, left = Math.max(0, C.T - (now - C.t0) / 1000); chips.unshift((C.alive > 0.05 ? EF_NAMES[C.ef] + ' tornado ' + Math.round(C.near) + ' m' : 'Storm chase · a tornado is forming…') + ' · ' + Math.floor(C.score) + ' pts · ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0') + (G.nail ? ' · nailed down' : '')); if (C.msg) chips.unshift(C.msg.text); }
    { const pc = G.game.park && G.game.park.chip(); if (pc) chips.unshift(pc); }
    for (const c of [G.game.sky && G.game.sky.chip(), G.game.pier && G.game.pier.chip(), mgChip()]) if (c) chips.unshift(c);
    if (G.race) chips.unshift('Race ' + ((now - G.race.start) / 1000).toFixed(1) + 's · ring ' + (G.race.next + 1) + '/12');
    const ct = chips.join('  ·  '); if ($('effects').textContent !== ct) $('effects').textContent = ct;
    $('effects').classList.toggle('hidden', !ct);

    G.game.updateCamera(b.p, dt);
    let cursor = null;
    if (mouse && G.myId && !drags.size && G.building) { const k = curTool(); const t = target(mouse.x, mouse.y, k === 0 || k === 'wire' || k === 'cut' ? 'pick' : 'place'); if (t) cursor = t; }
    const items = G.game.nearbyItems(b.p).filter(it => !G.taken.has(it.id) && !(it.type === 'trophy' && G.inv.trophy));
    if (!NO_RENDER) G.game.render([...G.players.values(), ...G.mgBots.values()], m, { now, dt, dark, chase: G.chase, shipPitch: G.ship ? G.ship.pitch : 0, shipFx: G.ship && G.ship.st !== 'fly' ? { p: G.ship.p, hd: G.ship.hd, pitch: G.ship.pitch || 0, open: G.ship.open || 0 } : null, sunAngle: ph * Math.PI * 2 + Math.PI / 2, cursor, items, race: G.race, wireFrom: G.wireFrom, budget: Device.type === 'phone' ? 7 : 10 });
    requestAnimationFrame(loop);
  }
})();
