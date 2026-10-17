// Sushi Jem admin backend — D1-backed content storage + session auth.
// Serves /api/* endpoints; everything else falls through to static assets (public/).
// Admin UI lives at /admin (public/admin.html).

const COOKIE = 'sj_admin';
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days
const PBKDF2_ITER = 100000;
const MAX_CONTENT_BYTES = 2_000_000;

function json(status, obj, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {}),
  });
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(h) {
  const a = new Uint8Array(h.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
  return a;
}
async function sha256(s) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
async function pbkdf2(password, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: iter }, key, 256);
  return hex(bits);
}
function randomToken() {
  const a = crypto.getRandomValues(new Uint8Array(32));
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function timingSafeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function getAdmin(db) {
  const row = await db.prepare('SELECT pw_hash, salt, iter FROM admin WHERE id = 1').first();
  return row || null;
}
async function createSession(db, tokenHash) {
  const now = Date.now();
  await db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
  await db.prepare('INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?,?,?)').bind(tokenHash, now, now + SESSION_TTL_MS).run();
}
async function authed(req, env) {
  const cookie = req.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp(COOKIE + '=([a-f0-9]{64})'));
  if (!m) return false;
  const th = await sha256(m[1]);
  const row = await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(th, Date.now()).first();
  return !!row;
}
function sameOrigin(req, url) {
  const o = req.headers.get('Origin');
  return !o || o === url.origin;
}
function sessionCookie(token, maxAgeSec) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    const db = env.DB;

    if (p === '/api/content') {
      if (req.method === 'GET') {
        const row = await db.prepare('SELECT v, updated_at FROM content WHERE k = ?').bind('content').first();
        if (!row) return json(200, { content: null, updated_at: null });
        try {
          return json(200, { content: JSON.parse(row.v), updated_at: row.updated_at });
        } catch (e) {
          return json(200, { content: null, updated_at: null });
        }
      }
      if (req.method === 'PUT') {
        if (!sameOrigin(req, url)) return json(403, { error: 'origin' });
        if (!(await authed(req, env))) return json(401, { error: 'auth' });
        const body = await req.text();
        if (body.length > MAX_CONTENT_BYTES) return json(413, { error: 'too large' });
        let content;
        try { content = JSON.parse(body); } catch (e) { return json(400, { error: 'bad json' }); }
        if (!content || typeof content !== 'object' || !content.config || !content.menu || !content.strings) {
          return json(400, { error: 'bad content: config, menu and strings are required' });
        }
        const now = Date.now();
        await db
          .prepare('INSERT INTO content (k, v, updated_at) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at')
          .bind('content', JSON.stringify(content), now)
          .run();
        return json(200, { ok: true, updated_at: now });
      }
      return json(405, { error: 'method' });
    }

    if (p === '/api/login' && req.method === 'POST') {
      if (!sameOrigin(req, url)) return json(403, { error: 'origin' });
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      const now = Date.now();
      const fail = await db.prepare('SELECT count, locked_until FROM login_fail WHERE ip = ?').bind(ip).first();
      if (fail && fail.locked_until > now) {
        return json(423, { error: 'locked', retry_after: fail.locked_until - now });
      }
      let body;
      try { body = await req.json(); } catch (e) { return json(400, { error: 'bad json' }); }
      const admin = await getAdmin(db);
      if (!admin) return json(500, { error: 'admin not initialized' });
      const hash = await pbkdf2(String(body.password || ''), admin.salt, admin.iter);
      if (!timingSafeEq(hash, admin.pw_hash)) {
        const count = (fail ? fail.count : 0) + 1;
        const locked = count >= 5 ? now + 15 * 60 * 1000 : 0;
        await db
          .prepare('INSERT INTO login_fail (ip, count, locked_until) VALUES (?,?,?) ON CONFLICT(ip) DO UPDATE SET count = excluded.count, locked_until = excluded.locked_until')
          .bind(ip, count, locked)
          .run();
        return json(401, { error: 'bad password' });
      }
      await db.prepare('DELETE FROM login_fail WHERE ip = ?').bind(ip).run();
      const token = randomToken();
      await createSession(db, await sha256(token));
      return json(200, { ok: true }, { 'Set-Cookie': sessionCookie(token, SESSION_TTL_MS / 1000) });
    }

    if (p === '/api/logout' && req.method === 'POST') {
      const cookie = req.headers.get('Cookie') || '';
      const m = cookie.match(new RegExp(COOKIE + '=([a-f0-9]{64})'));
      if (m) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(m[1])).run();
      return json(200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
    }

    if (p === '/api/session' && req.method === 'GET') {
      const ok = await authed(req, env);
      const row = ok ? await db.prepare('SELECT updated_at FROM content WHERE k = ?').bind('content').first() : null;
      return json(ok ? 200 : 401, ok ? { ok: true, updated_at: row ? row.updated_at : null } : { error: 'auth' });
    }

    if (p === '/api/password' && req.method === 'POST') {
      if (!sameOrigin(req, url)) return json(403, { error: 'origin' });
      if (!(await authed(req, env))) return json(401, { error: 'auth' });
      let body;
      try { body = await req.json(); } catch (e) { return json(400, { error: 'bad json' }); }
      const admin = await getAdmin(db);
      if (!admin) return json(500, { error: 'admin not initialized' });
      const curHash = await pbkdf2(String(body.current || ''), admin.salt, admin.iter);
      if (!timingSafeEq(curHash, admin.pw_hash)) return json(401, { error: 'current password is wrong' });
      const next = String(body.next || '');
      if (next.length < 8) return json(400, { error: 'new password must be at least 8 characters' });
      const salt = randomToken().slice(0, 32);
      const hash = await pbkdf2(next, salt, PBKDF2_ITER);
      await db.prepare('UPDATE admin SET pw_hash = ?, salt = ?, iter = ?, updated_at = ? WHERE id = 1').bind(hash, salt, PBKDF2_ITER, Date.now()).run();
      await db.prepare('DELETE FROM sessions').run();
      return json(200, { ok: true, relogin: true });
    }

    if (p.startsWith('/api/')) return json(404, { error: 'not found' });

    if (p === '/admin' || p === '/admin/') {
      return env.ASSETS.fetch(new Request(new URL('/admin.html', url.origin), req));
    }

    return env.ASSETS.fetch(req);
  },
};
