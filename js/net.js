// Multiplayer with PeerJS (WebRTC). There is ONE shared world.
// The first player online runs the world for everyone ("keeper"); everyone else
// connects to them. If the keeper leaves, someone else takes over automatically.
const Net = (() => {
  const WORLD_ID = 'funz-online-main-world-v1';
  let peer = null, keeperConn = null;
  const conns = new Map(); // keeper only: peerId -> connection
  const h = { message() {}, join() {}, leave() {}, closed() {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function on(handlers) { Object.assign(h, handlers); }
  const ready = () => typeof Peer !== 'undefined';

  // Try to join the world that's already running.
  function tryJoin() {
    return new Promise((resolve, reject) => {
      const p = new Peer();
      let done = false;
      const fail = kind => { if (done) return; done = true; clearTimeout(timer); p.destroy(); reject({ kind }); };
      const timer = setTimeout(() => fail('missing'), 9000);
      p.on('open', () => {
        const c = p.connect(WORLD_ID, { reliable: true });
        c.on('open', () => { if (done) return; done = true; clearTimeout(timer); peer = p; keeperConn = c; resolve(); });
        c.on('data', d => { if (keeperConn === c) h.message('keeper', d); });
        c.on('close', () => { if (keeperConn === c) { keeperConn = null; h.closed(); } });
      });
      p.on('error', err => {
        if (!done) fail(err.type === 'peer-unavailable' ? 'missing' : 'net');
        else if (keeperConn && err.type !== 'peer-unavailable') { /* ignore small errors */ }
      });
    });
  }

  // Nobody is running the world, so become the keeper.
  function tryKeep() {
    return new Promise((resolve, reject) => {
      const p = new Peer(WORLD_ID);
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; p.destroy(); reject({ kind: 'net' }); } }, 9000);
      p.on('open', () => { done = true; clearTimeout(timer); peer = p; resolve(); });
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
  async function connect() {
    if (!ready()) throw new Error('offline');
    for (let i = 0; i < 6; i++) {
      try { await tryJoin(); return 'guest'; } catch (e) { if (e.kind === 'net') throw new Error('offline'); }
      try { await tryKeep(); return 'keeper'; } catch (e) { if (e.kind === 'net') throw new Error('offline'); }
      await sleep(400 + Math.random() * 900); // someone else just became keeper, try again
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

  return { on, connect, leave, toKeeper, toOne, toAll, drop, count: () => conns.size };
})();
