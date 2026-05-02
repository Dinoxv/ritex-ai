/**
 * db.service.ts – SQLite wrapper (server-side only, used by daemon & API routes)
 * Uses better-sqlite3 for synchronous, single-process access.
 */
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'bot.db');
const MIGRATION_PATH = join(process.cwd(), 'scripts', 'migrations', '001-initial.sql');

const MAX_LOGS_STORED = 500;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');

  // Run initial migration
  if (existsSync(MIGRATION_PATH)) {
    const sql = readFileSync(MIGRATION_PATH, 'utf-8');
    _db.exec(sql);
  } else {
    // Inline fallback schema (in case migration file is missing)
    _db.exec(`
      CREATE TABLE IF NOT EXISTS positions (
        symbol TEXT PRIMARY KEY, side TEXT NOT NULL,
        size REAL NOT NULL, entry_price REAL NOT NULL,
        opened_at INTEGER NOT NULL, notional REAL NOT NULL,
        safety_stop_order_id TEXT
      );
      CREATE TABLE IF NOT EXISTS daily_stats (
        day_key TEXT PRIMARY KEY, total_traded_notional REAL NOT NULL DEFAULT 0,
        realized_pnl REAL NOT NULL DEFAULT 0, trading_disabled INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS bot_logs (
        id TEXT PRIMARY KEY, timestamp INTEGER NOT NULL, symbol TEXT NOT NULL,
        indicator TEXT NOT NULL, action TEXT NOT NULL, side TEXT, signal TEXT,
        price REAL, size REAL, realized_pnl REAL, close_price REAL, open_price REAL,
        slippage_bps REAL, message TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bot_logs_timestamp ON bot_logs (timestamp DESC);
      CREATE TABLE IF NOT EXISTS bot_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS bot_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
  }

  return _db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DbPosition {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entry_price: number;
  opened_at: number;
  notional: number;
  safety_stop_order_id: string | null;
}

export interface DbDailyStats {
  day_key: string;
  total_traded_notional: number;
  realized_pnl: number;
  trading_disabled: number; // 0 | 1
}

export interface DbLogEntry {
  id: string;
  timestamp: number;
  symbol: string;
  indicator: string;
  action: string;
  side?: string | null;
  signal?: string | null;
  price?: number | null;
  size?: number | null;
  realized_pnl?: number | null;
  close_price?: number | null;
  open_price?: number | null;
  slippage_bps?: number | null;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Positions
// ─────────────────────────────────────────────────────────────────────────────

export function getAllPositions(): DbPosition[] {
  return getDb().prepare('SELECT * FROM positions').all() as DbPosition[];
}

export function upsertPosition(pos: DbPosition): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO positions
         (symbol, side, size, entry_price, opened_at, notional, safety_stop_order_id)
       VALUES
         (@symbol, @side, @size, @entry_price, @opened_at, @notional, @safety_stop_order_id)`
    )
    .run(pos);
}

export function deletePosition(symbol: string): void {
  getDb().prepare('DELETE FROM positions WHERE symbol = ?').run(symbol);
}

export function clearAllPositions(): void {
  getDb().prepare('DELETE FROM positions').run();
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Stats
// ─────────────────────────────────────────────────────────────────────────────

export function getDailyStats(dayKey: string): DbDailyStats | null {
  return (
    getDb()
      .prepare('SELECT * FROM daily_stats WHERE day_key = ?')
      .get(dayKey) as DbDailyStats | undefined
  ) ?? null;
}

export function upsertDailyStats(stats: DbDailyStats): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO daily_stats
         (day_key, total_traded_notional, realized_pnl, trading_disabled)
       VALUES
         (@day_key, @total_traded_notional, @realized_pnl, @trading_disabled)`
    )
    .run(stats);
}

// ─────────────────────────────────────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────────────────────────────────────

export function insertLog(entry: DbLogEntry): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO bot_logs
       (id, timestamp, symbol, indicator, action, side, signal, price, size,
        realized_pnl, close_price, open_price, slippage_bps, message)
     VALUES
       (@id, @timestamp, @symbol, @indicator, @action, @side, @signal, @price, @size,
        @realized_pnl, @close_price, @open_price, @slippage_bps, @message)`
  ).run({
    id: entry.id,
    timestamp: entry.timestamp,
    symbol: entry.symbol,
    indicator: entry.indicator,
    action: entry.action,
    side: entry.side ?? null,
    signal: entry.signal ?? null,
    price: entry.price ?? null,
    size: entry.size ?? null,
    realized_pnl: entry.realized_pnl ?? null,
    close_price: entry.close_price ?? null,
    open_price: entry.open_price ?? null,
    slippage_bps: entry.slippage_bps ?? null,
    message: entry.message,
  });

  // Prune old rows
  db.prepare(
    `DELETE FROM bot_logs WHERE id NOT IN (
       SELECT id FROM bot_logs ORDER BY timestamp DESC LIMIT ${MAX_LOGS_STORED}
     )`
  ).run();
}

export function getLogs(limit = 100): DbLogEntry[] {
  return getDb()
    .prepare('SELECT * FROM bot_logs ORDER BY timestamp DESC LIMIT ?')
    .all(limit) as DbLogEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bot State (key/value)
// ─────────────────────────────────────────────────────────────────────────────

export function getBotState(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM bot_state WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setBotState(key: string, value: string): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO bot_state (key, value) VALUES (?, ?)')
    .run(key, value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bot Settings (key/value JSON blob)
// ─────────────────────────────────────────────────────────────────────────────

export function getBotSettingsKey(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM bot_settings WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setBotSettingsKey(key: string, value: string): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)')
    .run(key, value);
}
