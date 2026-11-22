// Nautic Online accounts: sign up / log in with a username and password (one account works on every device).
// The account server gives a signed "ticket" that other players check to know a name really belongs to you.
window.Accounts = (() => {
  const API = 'https://nautic-accounts.WORKERS_SUBDOMAIN.workers.dev';
  const PUB = { kty: 'EC', crv: 'P-256', x: 'yvlRzzAeuA1AI2Ak4RR3RrdOryapqKk34uZJAemQWyw', y: '_AqomVuq1ZFTKfQS5aVUmLS4nwPz80p5dPP3AP-e7HA' };
  const KEY = 'funz.account';
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  let me = null;
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v.name === 'string' && typeof v.token === 'string') me = v; } catch (e) {}
  const save = () => { try { if (me) localStorage.setItem(KEY, JSON.stringify(me)); else localStorage.removeItem(KEY); } catch (e) {} };

  async function call(method, path, body, token) {
    let res;
    try {
      res = await fetch(API + path, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    } catch (e) { return { offline: true, error: 'Can\'t reach the account server. Check your internet and try again.' }; }
    let data = {}; try { data = await res.json(); } catch (e) {}
    if (!res.ok) return { status: res.status, error: data.error || 'Something went wrong. Try again.' };
    return data;
  }
  const done = r => { if (r && r.token && r.name) { me = { name: r.name, token: r.token, ticket: r.ticket || '' }; save(); } return r; };

  // checks a ticket and gives back the name it belongs to (or null)
  const seen = new Map();
  async function verify(t) {
    if (typeof t !== 'string' || t.length > 400) return null;
    if (seen.has(t)) return seen.get(t);
    let name = null;
    try {
      const [p, s] = t.split('.');
      const k = await crypto.subtle.importKey('jwk', PUB, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      if (await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, unb64u(s), new TextEncoder().encode(p))) {
        const o = JSON.parse(new TextDecoder().decode(unb64u(p)));
        if (o && typeof o.n === 'string' && +o.e > Date.now() - 864e5) name = o.n;
      }
    } catch (e) {}
    if (seen.size > 500) seen.clear();
    seen.set(t, name);
    return name;
  }

  return {
    get name() { return me ? me.name : ''; },
    get ticket() { return me ? me.ticket : ''; },
    signedIn: () => !!me,
    signup: async (name, password, extra) => done(await call('POST', '/signup', Object.assign({ name, password }, extra || {}))),
    login: async (name, password) => done(await call('POST', '/login', { name, password })),
    async logout() { const t = me && me.token; me = null; save(); if (t) call('POST', '/logout', null, t); },
    // gets a fresh ticket; logs you out only if the server says the session is gone
    async refresh() {
      if (!me) return null;
      const r = await call('GET', '/me', null, me.token);
      if (r.status === 401) { me = null; save(); return { out: true }; }
      if (r.name && r.ticket) { me.name = r.name; me.ticket = r.ticket; save(); }
      return r;
    },
    verify
  };
})();
