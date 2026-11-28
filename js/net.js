// Multiplayer with PeerJS (WebRTC). There is ONE shared world.
// The first player online runs the world for everyone ("keeper"); everyone else
// connects to them. If the keeper leaves, someone else takes over automatically.
const Net = (() => {
  const MAIN_ID = 'funz-online-main-world-v1';
  let WORLD_ID = MAIN_ID; // each server has its own id; the main world keeps the old one
  let peer = null, keeperConn = null;
  const conns = new Map(); // keeper only: peerId -> connection
  const h = { message() {}, join() {}, leave() {}, closed() {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function on(handlers) { Object.assign(h, handlers); }
  const ready = () => typeof Peer !== 'undefined';

  // Try to join the world that's already running, under any of its names at once (see connect).
  // Joins the first name that answers; tells which names are free if none do.
  function tryJoin(ids) {
    return new Promise((resolve, reject) => {
      const p = new Peer();
      const st = ids.map(() => 'wait'), cs = [];
      let done = false;
      const finish = () => { clearTimeout(timer); for (const c of cs) if (c && c !== keeperConn) try { c.close(); } catch (e) {} };
      const fail = kind => { if (done) return; done = true; finish(); p.destroy(); reject({ kind, free: ids.filter((id, i) => st[i] === 'missing') }); };
      const check = () => {
        if (done) return;
        for (let i = 0; i < ids.length; i++) {
          if (st[i] === 'wait') return; // a better name might still answer
          if (st[i] === 'open') { done = true; const c = cs[i]; WORLD_ID = ids[i]; peer = p; keeperConn = c; finish(); resolve(); return; }
        }
        fail('missing');
      };
      // a name someone holds but that doesn't answer counts as 'slow'
      const timer = setTimeout(() => { st.forEach((v, i) => { if (v === 'wait') st[i] = 'slow'; }); check(); }, 8000);
      p.on('open', () => ids.forEach((id, i) => {
        const c = p.connect(id, { reliable: true }); cs[i] = c;
        c.on('open', () => { if (done) { if (c !== keeperConn) try { c.close(); } catch (e) {} } else if (st[i] === 'wait') { st[i] = 'open'; check(); } });
        c.on('data', d => { if (keeperConn === c) h.message('keeper', d); });
        c.on('close', () => { if (keeperConn === c) { keeperConn = null; h.closed(); } });
      }));
      p.on('error', err => {
        if (done) return;
        if (err.type === 'peer-unavailable') { const i = ids.findIndex(id => String(err.message || '').endsWith(' ' + id)); if (i >= 0 && st[i] === 'wait') { st[i] = 'missing'; check(); } }
        else fail('net');
      });
    });
  }

  // Nobody is running the world, so become the keeper.
  function tryKeep(id) {
    return new Promise((resolve, reject) => {
      const p = new Peer(id);
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; p.destroy(); reject({ kind: 'net' }); } }, 9000);
      p.on('open', () => { done = true; clearTimeout(timer); WORLD_ID = id; peer = p; resolve(); });
      p.on('error', err => {
        if (!done) { done = true; clearTimeout(timer); p.destroy(); reject({ kind: err.type === 'unavailable-id' ? 'taken' : 'net' }); }
      });
      p.on('connection', c => {
        conns.set(c.peer, c);
        c.on('open', () => h.join(c.peer));
        c.on('data', d => h.message(c.peer, d));
        const gone = () => { if (conns.get(c.peer) === c) { conns.delete(c.peer); h.leave(c.peer); } };
        c.on('close', gone); c.on('error', gone);
      });
      p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} });
    });
  }

  // Join the world, or start it if nobody's there. Returns 'guest' or 'keeper'.
  // A world lives under a name on the free PeerJS server. If the phone holding that name fell asleep it
  // keeps the name but never answers, so every world has backup names: everyone joins the first name that
  // answers, and if none do, starts the world under the first free one. step(i) is told each new try.
  const BACKUPS = ['', '-b', '-c', '-d', '-e'];
  const bad = new Map(); // names that let us in but never said hello back -> when
  const isBad = id => bad.has(id) && Date.now() - bad.get(id) < 120000;
  function markBad() { if (WORLD_ID) bad.set(WORLD_ID, Date.now()); }
  async function connect(worldId, step) {
    const base = worldId || MAIN_ID;
    if (!ready()) throw new Error('offline');
    const end = Date.now() + 40000;
    for (let i = 0; i < 4 && Date.now() < end; i++) {
      if (step) try { step(i); } catch (e) {}
      const ids = BACKUPS.map(s => base + s).filter(id => !isBad(id));
      let free = [];
      try { await tryJoin(ids); return 'guest'; } catch (e) { if (e.kind === 'net') throw new Error('offline'); free = e.free || []; }
      for (const id of free) {
        try { await tryKeep(id); return 'keeper'; } catch (e) { if (e.kind === 'net') throw new Error('offline'); }
      }
      await sleep(400 + Math.random() * 900); // someone else just took it, try again
    }
    throw new Error('busy');
  }

  const toKeeper = msg => { if (keeperConn && keeperConn.open) keeperConn.send(msg); };
  const toOne = (id, msg) => { const c = conns.get(id); if (!c) return; if (c.open) c.send(msg); else c.on('open', () => c.send(msg)); };
  const toAll = (msg, except) => { for (const [id, c] of conns) if (id !== except && c.open) c.send(msg); };
  const drop = id => { const c = conns.get(id); if (c) { conns.delete(id); setTimeout(() => { try { c.close(); } catch (e) {} }, 300); } };

  function leave() {
    for (const c of conns.values()) try { c.close(); } catch (e) {}
    conns.clear();
    if (keeperConn) { const c = keeperConn; keeperConn = null; try { c.close(); } catch (e) {} }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  }

  return { MAIN_ID, on, connect, markBad, leave, toKeeper, toOne, toAll, drop, count: () => conns.size };
})();
