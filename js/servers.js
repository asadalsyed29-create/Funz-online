// Servers: worlds anyone can make. Public ones show in the server list, link-only ones need the link,
// private ones need the link and a password. A server never ends: whoever plays in it keeps a copy of the
// world, and the next person to open it picks up where it stopped.
const Servers = (() => {
  const KEY = 'funz.servers', LOBBY_ID = 'nautic-online-lobby-v1', HUB = 'https://asadalsyed29-create.github.io/Ultranautic-hub/';
  const all = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const saveAll = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const get = id => all()[id] || null;
  function put(s) { const o = all(); o[s.id] = Object.assign(o[s.id] || {}, s); saveAll(o); return o[s.id]; }
  function remove(id) { const o = all(); delete o[id]; saveAll(o); try { localStorage.removeItem('funz.srvworld.' + id); } catch (e) {} }
  const newId = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(10)); for (const b of r) s += a[b % a.length]; return s; };
  const worldId = id => 'nautic-online-srv-' + id;
  const link = id => HUB + '#online=' + id;
  async function hash(pw) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nautic-online:' + pw))); return [...h].map(b => b.toString(16).padStart(2, '0')).join(''); }
  // only safe, small fields travel between players
  function clean(s) {
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !/^[a-z0-9]{6,16}$/.test(s.id)) return null;
    return { id: s.id, name: String(s.name || 'Server').replace(/[<>]/g, '').slice(0, 30), vis: ['public', 'link', 'private'].includes(s.vis) ? s.vis : 'link',
      pw: typeof s.pw === 'string' ? s.pw.slice(0, 64) : '', mods: [], // mods were removed (2026-11-23): old servers and links play with none
      made: +s.made || Date.now(), owner: String(s.owner || '').slice(0, 40) };
  }

  // ---------- the public server list ----------
  // one device runs the list for everyone (like the worlds do); servers with people in them tell it they're open
  let lob = null; // { peer, keeper, conn, ads: Map }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function lobbyJoin() {
    return new Promise((res, rej) => {
      const p = new Peer(); let done = false;
      const t = setTimeout(() => { if (!done) { done = true; p.destroy(); rej('missing'); } }, 8000);
      p.on('open', () => { const c = p.connect(LOBBY_ID, { reliable: true });
        c.on('open', () => { if (done) return; done = true; clearTimeout(t); res({ peer: p, keeper: false, conn: c, ads: new Map(), wait: [] }); }); });
      p.on('error', e => { if (!done) { done = true; clearTimeout(t); p.destroy(); rej(e.type === 'peer-unavailable' ? 'missing' : 'net'); } });
    });
  }
  function lobbyKeep() {
    return new Promise((res, rej) => {
      const p = new Peer(LOBBY_ID); let done = false;
      const t = setTimeout(() => { if (!done) { done = true; p.destroy(); rej('net'); } }, 8000);
      p.on('open', () => { done = true; clearTimeout(t); const L = { peer: p, keeper: true, conns: new Set(), ads: new Map(), wait: [] };
        p.on('connection', c => { L.conns.add(c); c.on('data', d => lobbyGot(L, c, d)); c.on('close', () => L.conns.delete(c)); });
        p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} }); res(L); });
      p.on('error', e => { if (!done) { done = true; clearTimeout(t); p.destroy(); rej(e.type === 'unavailable-id' ? 'taken' : 'net'); } });
    });
  }
  function lobbyGot(L, c, d) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'ad' && d.s) { const s = d.s; if (typeof s.id === 'string' && /^[a-z0-9]{6,16}$/.test(s.id)) L.ads.set(s.id, { id: s.id, name: String(s.name || '').slice(0, 30), n: Math.max(0, Math.min(99, +s.n || 0)), mods: (s.mods || []).slice(0, 20).map(x => String(x).slice(0, 40)), t: Date.now() }); }
    if (d.t === 'list') c.send({ t: 'list', list: lobbyList(L) });
  }
  const lobbyList = L => { const now = Date.now(); for (const [k, a] of L.ads) if (now - a.t > 75000) L.ads.delete(k); return [...L.ads.values()]; };
  async function lobby() {
    if (lob && lob.peer && !lob.peer.destroyed && (lob.keeper || (lob.conn && lob.conn.open))) return lob;
    if (typeof Peer === 'undefined') throw 'offline';
    for (let i = 0; i < 4; i++) {
      try { lob = await lobbyJoin(); lob.conn.on('data', d => { if (d && d.t === 'list') { const w = lob.wait.splice(0); w.forEach(f => f(d.list || [])); } }); lob.conn.on('close', () => { lob = null; }); return lob; } catch (e) { if (e === 'net') throw e; }
      try { lob = await lobbyKeep(); return lob; } catch (e) { if (e === 'net') throw e; }
      await sleep(300 + Math.random() * 800);
    }
    throw 'busy';
  }
  // the open public servers right now
  async function list() {
    const L = await lobby();
    if (L.keeper) return lobbyList(L);
    return new Promise(res => { L.wait.push(res); L.conn.send({ t: 'list' }); setTimeout(() => res([]), 5000); });
  }
  // a server's keeper tells the list it's open (call every ~20 seconds)
  async function advertise(s, n) {
    if (!s || s.vis !== 'public') return;
    try { const L = await lobby(); const ad = { id: s.id, name: s.name, n, mods: s.mods.map(m => m.name) };
      if (L.keeper) { L.ads.set(s.id, Object.assign(ad, { t: Date.now() })); } else L.conn.send({ t: 'ad', s: ad }); } catch (e) {}
  }
  function lobbyLeave() { if (lob && !lob.keeper) { try { lob.peer.destroy(); } catch (e) {} lob = null; } }

  return { all, get, put, remove, newId, worldId, link, hash, clean, list, advertise, lobbyLeave };
})();
