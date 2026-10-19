-- Published-content history (added 2026-10-19 with the developer panel upgrade).
-- The Worker self-heals this table on first request (see ensureSchema in worker.js);
-- this file mirrors the schema for reference or fresh environments.

CREATE TABLE IF NOT EXISTS content_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  updated_at INTEGER NOT NULL,
  v TEXT NOT NULL,
  by TEXT NOT NULL DEFAULT 'admin'
);
