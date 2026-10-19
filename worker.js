// Sushi Jem admin backend — D1-backed content storage + session auth.
// Serves /api/* endpoints; everything else falls through to static assets (public/).
// Admin UI lives at /admin (public/admin.html).

const COOKIE = 'sj_admin';
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days
const PBKDF2_ITER = 100000;
const MAX_CONTENT_BYTES = 2_000_000;
const MAX_IMAGE_B64 = 4_400_000; // ~3.2 MB decoded
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const CHUNK = 90_000; // chars of base64 per D1 row (statement limit is 100KB)
/* Table prefix: lets an isolated test deployment share the same D1 database
   without touching production rows. Set var TP = 't_' in the test config. */
function tables(env){
  const p = (env && env.TP) ? String(env.TP) : '';
  return {
    content: p + 'content', admin: p + 'admin', sessions: p + 'sessions',
    login_fail: p + 'login_fail', media: p + 'media', media_chunk: p + 'media_chunk'
  };
}

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

async function getAdmin(db, adminTable) {
  const row = await db.prepare('SELECT pw_hash, salt, iter FROM ' + adminTable + ' WHERE id = 1').first();
  return row || null;
}
async function createSession(db, tokenHash, sessionsTable) {
  const now = Date.now();
  await db.prepare('DELETE FROM ' + sessionsTable + ' WHERE expires_at < ?').bind(now).run();
  await db.prepare('INSERT INTO ' + sessionsTable + ' (token_hash, created_at, expires_at) VALUES (?,?,?)').bind(tokenHash, now, now + SESSION_TTL_MS).run();
}
async function authed(req, env) {
  // Bearer token auth (works even where cookies are blocked, e.g. sandboxed previews).
  // When an Authorization header is supplied it is the ONLY accepted credential:
  // an invalid token must fail with 401, never fall back to cookies.
  const ah = req.headers.get('Authorization') || '';
  if (/^Bearer\s/.test(ah)) {
    const am = ah.match(/^Bearer ([a-f0-9]{64})$/);
    if (!am) return false;
    const TBL = tables(env);
    const row = await env.DB.prepare('SELECT token_hash FROM ' + TBL.sessions + ' WHERE token_hash = ? AND expires_at > ?').bind(await sha256(am[1]), Date.now()).first();
    return !!row;
  }
  const cookie = req.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp(COOKIE + '=([a-f0-9]{64})'));
  if (!m) return false;
  const th = await sha256(m[1]);
  const row = await env.DB.prepare('SELECT token_hash FROM ' + tables(env).sessions + ' WHERE token_hash = ? AND expires_at > ?').bind(th, Date.now()).first();
  return !!row;
}
function bearerSupplied(req){
  return /^Bearer\s/.test(req.headers.get('Authorization') || '');
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
    // tolerate a port-proxy path prefix (e.g. .../port/8787/) when hosted behind a proxy
    const p = url.pathname.replace(/^.*\/port\/\d+(?=\/|$)/, '');
    const db = env.DB;
    const TBL = tables(env);

    if (p === '/api/content') {
      if (req.method === 'GET') {
        const row = await db.prepare('SELECT v, updated_at FROM ' + TBL.content + ' WHERE k = ?').bind('content').first();
        if (!row) return json(200, { content: null, updated_at: null });
        try {
          return json(200, { content: JSON.parse(row.v), updated_at: row.updated_at });
        } catch (e) {
          return json(200, { content: null, updated_at: null });
        }
      }
      if (req.method === 'PUT') {
        if (!(await authed(req, env))) return json(401, { error: 'auth' });
        if (!sameOrigin(req, url) && !bearerSupplied(req)) return json(403, { error: 'origin' });
        const body = await req.text();
        if (body.length > MAX_CONTENT_BYTES) return json(413, { error: 'too large' });
        let content;
        try { content = JSON.parse(body); } catch (e) { return json(400, { error: 'bad json' }); }
        if (!content || typeof content !== 'object' || !content.config || !content.menu || !content.strings) {
          return json(400, { error: 'bad content: config, menu and strings are required' });
        }
        const now = Date.now();
        await db
          .prepare('INSERT INTO ' + TBL.content + ' (k, v, updated_at) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at')
          .bind('content', JSON.stringify(content), now)
          .run();
        return json(200, { ok: true, updated_at: now });
      }
      return json(405, { error: 'method' });
    }

    if (p === '/api/login' && req.method === 'POST') {
      // no same-origin check here: login needs no ambient credentials (password
      // is the proof) and it must work from previews/proxies where Origin differs.
      // State-changing endpoints (PUT content, media) keep the origin check for
      // cookie sessions; Bearer tokens bypass it safely.
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      const now = Date.now();
      const fail = await db.prepare('SELECT count, locked_until FROM ' + TBL.login_fail + ' WHERE ip = ?').bind(ip).first();
      if (fail && fail.locked_until > now) {
        return json(423, { error: 'locked', retry_after: fail.locked_until - now });
      }
      let body;
      try { body = await req.json(); } catch (e) { return json(400, { error: 'bad json' }); }
      const admin = await getAdmin(db, TBL.admin);
      if (!admin) return json(500, { error: 'admin not initialized' });
      const hash = await pbkdf2(String(body.password || ''), admin.salt, admin.iter);
      if (!timingSafeEq(hash, admin.pw_hash)) {
        const count = (fail ? fail.count : 0) + 1;
        const locked = count >= 5 ? now + 15 * 60 * 1000 : 0;
        await db
          .prepare('INSERT INTO ' + TBL.login_fail + ' (ip, count, locked_until) VALUES (?,?,?) ON CONFLICT(ip) DO UPDATE SET count = excluded.count, locked_until = excluded.locked_until')
          .bind(ip, count, locked)
          .run();
        return json(401, { error: 'bad password' });
      }
      await db.prepare('DELETE FROM ' + TBL.login_fail + ' WHERE ip = ?').bind(ip).run();
      const token = randomToken();
      await createSession(db, await sha256(token), TBL.sessions);
      return json(200, { ok: true, token }, { 'Set-Cookie': sessionCookie(token, SESSION_TTL_MS / 1000) });
    }

    if (p === '/api/logout' && req.method === 'POST') {
      const cookie = req.headers.get('Cookie') || '';
      const m = cookie.match(new RegExp(COOKIE + '=([a-f0-9]{64})'));
      if (m) await db.prepare('DELETE FROM ' + TBL.sessions + ' WHERE token_hash = ?').bind(await sha256(m[1])).run();
      return json(200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
    }

    if (p === '/api/session' && req.method === 'GET') {
      const ok = await authed(req, env);
      const row = ok ? await db.prepare('SELECT updated_at FROM ' + TBL.content + ' WHERE k = ?').bind('content').first() : null;
      return json(ok ? 200 : 401, ok ? { ok: true, updated_at: row ? row.updated_at : null } : { error: 'auth' });
    }

    if (p === '/api/media' && req.method === 'POST') {
      if (!(await authed(req, env))) return json(401, { error: 'auth' });
      if (!sameOrigin(req, url) && !bearerSupplied(req)) return json(403, { error: 'origin' });
      let body;
      try { body = await req.json(); } catch (e) { return json(400, { error: 'bad json' }); }
      const m = String((body && body.data) || '').match(/^data:(image\/(?:jpeg|png|webp|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return json(400, { error: 'bad image' });
      const ct = m[1];
      const b64 = m[2];
      if (b64.length > MAX_IMAGE_B64) return json(413, { error: 'image too large (max ~3MB)' });
      const ext = ct === 'image/jpeg' ? 'jpg' : ct.split('/')[1].replace('+', '');
      const id = Date.now().toString(36) + '-' + randomToken().slice(0, 8);
      const n = Math.ceil(b64.length / CHUNK);
      const stmts = [db.prepare('INSERT INTO ' + TBL.media + ' (id, ct, size, chunks, created_at) VALUES (?,?,?,?,?)').bind(id, ct, b64.length, n, Date.now())];
      for (let i = 0; i < n; i++) stmts.push(db.prepare('INSERT INTO ' + TBL.media_chunk + ' (mid, idx, data) VALUES (?,?,?)').bind(id, i, b64.substr(i * CHUNK, CHUNK)));
      await db.batch(stmts);
      return json(200, { url: '/media/' + id + '.' + ext, id });
    }

    if (p.startsWith('/media/')) {
      const id = p.split('/')[2].split('.')[0];
      if (!/^[a-z0-9-]+$/i.test(id)) return new Response('Not found', { status: 404 });
      const meta = await db.prepare('SELECT ct FROM ' + TBL.media + ' WHERE id = ?').bind(id).first();
      if (!meta) return new Response('Not found', { status: 404 });
      const rows = await db.prepare('SELECT data FROM ' + TBL.media_chunk + ' WHERE mid = ? ORDER BY idx').bind(id).all();
      const b64 = (rows.results || []).map((r) => r.data).join('');
      let bin;
      try { bin = atob(b64); } catch (e) { return new Response('Not found', { status: 404 }); }
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Response(bytes, { headers: { 'Content-Type': meta.ct, 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }

    if (p === '/api/password' && req.method === 'POST') {
      if (!sameOrigin(req, url)) return json(403, { error: 'origin' });
      if (!(await authed(req, env))) return json(401, { error: 'auth' });
      let body;
      try { body = await req.json(); } catch (e) { return json(400, { error: 'bad json' }); }
      const admin = await getAdmin(db, TBL.admin);
      if (!admin) return json(500, { error: 'admin not initialized' });
      const curHash = await pbkdf2(String(body.current || ''), admin.salt, admin.iter);
      if (!timingSafeEq(curHash, admin.pw_hash)) return json(401, { error: 'current password is wrong' });
      const next = String(body.next || '');
      if (next.length < 8) return json(400, { error: 'new password must be at least 8 characters' });
      const salt = randomToken().slice(0, 32);
      const hash = await pbkdf2(next, salt, PBKDF2_ITER);
      await db.prepare('UPDATE ' + TBL.admin + ' SET pw_hash = ?, salt = ?, iter = ?, updated_at = ? WHERE id = 1').bind(hash, salt, PBKDF2_ITER, Date.now()).run();
      await db.prepare('DELETE FROM ' + TBL.sessions).run();
      return json(200, { ok: true, relogin: true });
    }

    if (p.startsWith('/api/')) return json(404, { error: 'not found' });

    if (p === '/admin' || p === '/admin/') {
      return env.ASSETS.fetch(new Request(new URL('/admin.html', url.origin), req));
    }

    return env.ASSETS.fetch(req);
  },
};
