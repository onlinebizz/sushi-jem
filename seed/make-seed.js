#!/usr/bin/env node
/* Builds seed.sql for a local test deployment of the inline editor.
   Usage:  node seed/make-seed.js [password]   (default: sushijem2026)
   Then:   npx wrangler d1 execute DB --local --config wrangler.edit.toml --file seed/seed.sql
   The seed copies public/content.json into the t_content table (the test tables
   use the t_ prefix from wrangler.edit.toml) and creates the t_admin row. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pw = process.argv[2] || 'sushijem2026';
const devPw = process.argv[3] || '6ixdev2026';
const content = fs.readFileSync(path.join(__dirname, '..', 'public', 'content.json'), 'utf8');
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(pw, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
const esc = (s) => s.replace(/'/g, "''");
const now = Date.now();

const devSalt = crypto.randomBytes(16).toString('hex');
const devHash = crypto.pbkdf2Sync(devPw, Buffer.from(devSalt, 'hex'), 100000, 32, 'sha256').toString('hex');
const creditsState = JSON.stringify({ dailyLimit: 2, weeklyLimit: 7, bonus: 0, locked: false });

const sql = `CREATE TABLE IF NOT EXISTS t_content (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS t_admin (id INTEGER PRIMARY KEY CHECK (id = 1), pw_hash TEXT NOT NULL, salt TEXT NOT NULL, iter INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS t_sessions (token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS t_login_fail (ip TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS t_media (id TEXT PRIMARY KEY, ct TEXT NOT NULL, size INTEGER NOT NULL, chunks INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS t_media_chunk (mid TEXT NOT NULL, idx INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (mid, idx));
CREATE TABLE IF NOT EXISTS t_credits (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS t_change_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, kind TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS t_dev (id INTEGER PRIMARY KEY CHECK (id = 1), pw_hash TEXT NOT NULL, salt TEXT NOT NULL, iter INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS t_dev_sessions (token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
INSERT OR REPLACE INTO t_content (k, v, updated_at) VALUES ('content', '${esc(content)}', ${now});
INSERT OR REPLACE INTO t_admin (id, pw_hash, salt, iter, updated_at) VALUES (1, '${hash}', '${salt}', 100000, ${now});
INSERT OR REPLACE INTO t_credits (k, v, updated_at) VALUES ('state', '${esc(creditsState)}', ${now});
INSERT OR REPLACE INTO t_dev (id, pw_hash, salt, iter, updated_at) VALUES (1, '${devHash}', '${devSalt}', 100000, ${now});
`;

fs.writeFileSync(path.join(__dirname, 'seed.sql'), sql);
console.log('seed/seed.sql written (admin password: ' + pw + ' · developer password: ' + devPw + ')');
