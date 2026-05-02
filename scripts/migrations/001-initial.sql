-- Bot Trading Phase 3 – SQLite Schema

CREATE TABLE IF NOT EXISTS positions (
  symbol                TEXT PRIMARY KEY,
  side                  TEXT NOT NULL,   -- 'long' | 'short'
  size                  REAL NOT NULL,
  entry_price           REAL NOT NULL,
  opened_at             INTEGER NOT NULL,
  notional              REAL NOT NULL,
  safety_stop_order_id  TEXT
);

CREATE TABLE IF NOT EXISTS daily_stats (
  day_key                  TEXT PRIMARY KEY,   -- 'YYYY-MM-DD'
  total_traded_notional    REAL NOT NULL DEFAULT 0,
  realized_pnl             REAL NOT NULL DEFAULT 0,
  trading_disabled         INTEGER NOT NULL DEFAULT 0  -- 0 | 1
);

CREATE TABLE IF NOT EXISTS bot_logs (
  id           TEXT PRIMARY KEY,
  timestamp    INTEGER NOT NULL,
  symbol       TEXT NOT NULL,
  indicator    TEXT NOT NULL,
  action       TEXT NOT NULL,
  side         TEXT,
  signal       TEXT,
  price        REAL,
  size         REAL,
  realized_pnl REAL,
  close_price  REAL,
  open_price   REAL,
  slippage_bps REAL,
  message      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bot_logs_timestamp ON bot_logs (timestamp DESC);

-- key/value store for bot state (is_running, last_heartbeat, tracked_symbols …)
CREATE TABLE IF NOT EXISTS bot_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- key/value store for serialised settings blob sent from frontend
CREATE TABLE IF NOT EXISTS bot_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
