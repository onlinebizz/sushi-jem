-- Credit-system tables (schema only, no data).
-- Applied to production on 2026-10-19. Kept for reference and new environments.
-- The Worker also self-heals its schema (see ensureSchema in worker.js), so this
-- file is a mirror of what the code expects, not a required manual step.

CREATE TABLE IF NOT EXISTS credits (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dev (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pw_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iter INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dev_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- The remaining base tables (already present in production; listed for completeness
-- and for bootstrapping a fresh database):
CREATE TABLE IF NOT EXISTS content (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pw_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iter INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_fail (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  ct TEXT NOT NULL,
  size INTEGER NOT NULL,
  chunks INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS media_chunk (
  mid TEXT NOT NULL,
  idx INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (mid, idx)
);
