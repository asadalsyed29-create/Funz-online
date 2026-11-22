// Nautic Online accounts (Cloudflare Worker + D1).
// POST /signup {name, password, adm?, ts?}  -> {name, token, ticket}
// POST /login  {name, password}             -> {name, token, ticket}
// GET  /me     (Authorization: Bearer token) -> {name, ticket}
// POST /logout (Authorization: Bearer token) -> {ok}
// A ticket is "payload.signature": payload = base64url({n:name,e:expiry}), signed with
// TICKET_KEY (ECDSA P-256). Players check tickets with the public key built into the game.
// Secrets: TICKET_KEY (JSON {d,x,y}), PEPPER. Binding: DB (D1).

const ADMIN_PUB = { kty: 'EC', crv: 'P-256', x: 'ElMxPCYM-fDGDUiwud0eo8Uojz3sEaSeyzh6w_nW2Rk', y: 'Z0isPmpbPF-0J9BpskcpSe9tvLWSjF1ZCF6VlIWS9yo' };
const TICKET_DAYS = 7, ITER = 20000;
const LOOKALIKE = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'u', 'υ': 'u', 'х': 'x', 'і': 'i', 'ı': 'i', 'т': 't', 'п': 'n', 'н': 'h', 'к': 'k', 'ο': 'o', 'α': 'a', 'ε': 'e', 'τ': 't', 'ν': 'n', 'ρ': 'p', 'ι': 'i', 'κ': 'k', '0': 'o', '1': 'i', '!': 'i', '|': 'l', '3': 'e', '4': 'a', '@': 'a', '7': 't', '5': 's', '$': 's', 'µ': 'u', 'ü': 'u' };
const reservedName = n => { const s = String(n || '').normalize('NFKD').toLowerCase().replace(/./gu, c => LOOKALIKE[c] || c).replace(/[^a-z]/g, ''); return s.includes('outernautica') || s.includes('outernautic') || s.includes('outrnautica') || s.includes('outernatica'); };
const nameKey = n => n.toLowerCase();
const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;

const enc = new TextEncoder();
const b64u = buf => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Max-Age': '86400' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
const fail = (msg, status = 400) => json({ error: msg }, status);

async function hashPw(env, pw, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITER }, k, 256);
  const pk = await crypto.subtle.importKey('raw', enc.encode(env.PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', pk, bits));
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

let signKey = null;
async function ticket(env, name) {
  if (!signKey) { const j = JSON.parse(env.TICKET_KEY); signKey = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: j.d, x: j.x, y: j.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']); }
  const payload = b64u(enc.encode(JSON.stringify({ n: name, e: Date.now() + TICKET_DAYS * 864e5 })));
  return payload + '.' + b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signKey, enc.encode(payload)));
}
async function newSession(env, user) {
  const raw = b64u(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created) VALUES (?, ?, ?)').bind(await sha(raw), user.id, Date.now()).run();
  return { name: user.name, token: raw, ticket: await ticket(env, user.name) };
}
async function sessionUser(env, req) {
  const h = req.headers.get('Authorization') || '', raw = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!raw || raw.length > 100) return null;
  const t = await sha(raw);
  return { t, user: await env.DB.prepare('SELECT u.id, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').bind(t).first() };
}
async function adminOk(sig, msg) {
  try {
    const k = await crypto.subtle.importKey('jwk', ADMIN_PUB, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, unb64u(sig), enc.encode(msg));
  } catch (e) { return false; }
}
async function body(req) { try { const o = await req.json(); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }

async function signup(env, req) {
  const b = await body(req), name = String(b.name || '').trim(), pw = String(b.password || '');
  if (!NAME_RE.test(name)) return fail('Usernames are 3 to 16 letters, numbers or _');
  if (pw.length < 6 || pw.length > 200) return fail('Passwords need at least 6 characters');
  if (reservedName(name)) {
    const ts = +b.ts || 0;
    if (!b.adm || Math.abs(Date.now() - ts) > 10 * 60 * 1000 || !(await adminOk(String(b.adm), 'account:' + nameKey(name) + ':' + ts))) return fail('That name is taken', 409);
  }
  const ip = req.headers.get('CF-Connecting-IP') || '', now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS c FROM signups WHERE ip = ? AND t > ?').bind(ip, now - 3600e3).first();
  if (recent && recent.c >= 8) return fail('Too many new accounts from here. Try again in an hour', 429);
  if (await env.DB.prepare('SELECT id FROM users WHERE key = ?').bind(nameKey(name)).first()) return fail('That name is taken', 409);
  const salt = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const r = await env.DB.prepare('INSERT OR IGNORE INTO users (name, key, salt, hash, created) VALUES (?, ?, ?, ?, ?)').bind(name, nameKey(name), salt, await hashPw(env, pw, salt), now).run();
  if (!r.meta || !r.meta.changes) return fail('That name is taken', 409);
  await env.DB.batch([env.DB.prepare('INSERT INTO signups (ip, t) VALUES (?, ?)').bind(ip, now), env.DB.prepare('DELETE FROM signups WHERE t < ?').bind(now - 86400e3)]);
  return json(await newSession(env, { id: r.meta.last_row_id, name }));
}

async function login(env, req) {
  const b = await body(req), name = String(b.name || '').trim(), pw = String(b.password || '');
  if (!name || name.length > 16 || !pw || pw.length > 200) return fail('Wrong username or password', 401);
  const u = await env.DB.prepare('SELECT * FROM users WHERE key = ?').bind(nameKey(name)).first();
  if (!u) return fail('Wrong username or password', 401);
  const now = Date.now();
  if (u.lock_until > now) return fail('Too many wrong passwords. Try again in ' + Math.ceil((u.lock_until - now) / 60000) + ' minutes', 429);
  if (!same(await hashPw(env, pw, u.salt), u.hash)) {
    const fails = u.fails + 1, lock = fails >= 10 ? now + 15 * 60e3 : 0;
    await env.DB.prepare('UPDATE users SET fails = ?, lock_until = ? WHERE id = ?').bind(lock ? 0 : fails, lock, u.id).run();
    return fail('Wrong username or password', 401);
  }
  if (u.fails || u.lock_until) await env.DB.prepare('UPDATE users SET fails = 0, lock_until = 0 WHERE id = ?').bind(u.id).run();
  return json(await newSession(env, u));
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const path = new URL(req.url).pathname;
    try {
      if (req.method === 'POST' && path === '/signup') return await signup(env, req);
      if (req.method === 'POST' && path === '/login') return await login(env, req);
      if (req.method === 'GET' && path === '/me') { const s = await sessionUser(env, req); return s && s.user ? json({ name: s.user.name, ticket: await ticket(env, s.user.name) }) : fail('Please log in again', 401); }
      if (req.method === 'POST' && path === '/logout') { const s = await sessionUser(env, req); if (s) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(s.t).run(); return json({ ok: true }); }
      if (req.method === 'GET' && path === '/') return json({ ok: true, service: 'Nautic Online accounts' });
      return fail('Not found', 404);
    } catch (e) { return fail('Server error', 500); }
  }
};
