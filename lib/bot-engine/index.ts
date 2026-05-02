/**
 * lib/bot-engine/index.ts – Bot engine daemon entry point.
 *
 * Run by PM2 as a separate process:
 *   tsx lib/bot-engine/index.ts
 *
 * Reads settings from SQLite (written by /api/bot/start).
 * Polls is_running flag every POLL_INTERVAL_MS.
 * When running, executes runBotCycle() for each tracked symbol.
 */

import { getBotState, getBotSettingsKey, setBotState } from '@/lib/services/db.service';
import { AlertService } from '@/lib/services/alert.service';
import { runBotCycle } from './bot-cycle';
import { BinanceDirectClient } from './binance-direct';
import type { DaemonSettings } from './types';
import { DEFAULT_DAEMON_SETTINGS } from './types';

// ─── Configuration ────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;   // Check is_running flag every 5s
const MAX_CYCLE_ERRORS = 5;       // Stop daemon after N consecutive errors

// ─── State ────────────────────────────────────────────────────────────────────

let consecutiveErrors = 0;
let lastCycleMs = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadSettings(): DaemonSettings {
  try {
    const blob = getBotSettingsKey('daemon_settings');
    if (blob) {
      return { ...DEFAULT_DAEMON_SETTINGS, ...(JSON.parse(blob) as Partial<DaemonSettings>) };
    }
  } catch (err) {
    console.warn('[Daemon] Failed to parse daemon_settings:', err instanceof Error ? err.message : err);
  }
  return { ...DEFAULT_DAEMON_SETTINGS };
}

function loadTrackedSymbols(): string[] {
  try {
    const raw = getBotState('tracked_symbols');
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}

function isRunning(): boolean {
  return getBotState('is_running') === '1';
}

function getApiCredentials(): { apiKey: string; apiSecret: string; isTestnet: boolean } {
  const raw = getBotSettingsKey('api_credentials');
  if (raw) {
    try {
      return JSON.parse(raw) as { apiKey: string; apiSecret: string; isTestnet: boolean };
    } catch { /* ignore */ }
  }
  return {
    apiKey: process.env.BINANCE_API_KEY ?? '',
    apiSecret: process.env.BINANCE_API_SECRET ?? '',
    isTestnet: process.env.BINANCE_TESTNET === 'true',
  };
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  if (!isRunning()) {
    return; // Bot is stopped — idle
  }

  const settings = loadSettings();
  if (!settings.enabled) {
    return;
  }

  const trackedSymbols = loadTrackedSymbols();
  if (trackedSymbols.length === 0) {
    console.log('[Daemon] No tracked symbols — skipping cycle');
    return;
  }

  // Throttle: respect scanIntervalSec
  const scanIntervalMs = (settings.scanIntervalSec ?? 30) * 1_000;
  const now = Date.now();
  if (now - lastCycleMs < scanIntervalMs) {
    return; // Not yet time for next cycle
  }
  lastCycleMs = now;

  const creds = getApiCredentials();
  if (!settings.paperMode && (!creds.apiKey || !creds.apiSecret)) {
    console.warn('[Daemon] Missing Binance API credentials — bot cannot trade. Enable paper mode or set credentials.');
    return;
  }

  const client = new BinanceDirectClient(creds.apiKey, creds.apiSecret, creds.isTestnet);
  const alerts = new AlertService({
    telegramBotToken: settings.telegramBotToken,
    telegramChatId: settings.telegramChatId,
    webhookUrl: settings.alertWebhookUrl,
  });

  try {
    console.log(`[Daemon] Running cycle — symbols: [${trackedSymbols.join(', ')}]`);
    await runBotCycle(client, settings, trackedSymbols, alerts);
    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Daemon] Cycle error (${consecutiveErrors}/${MAX_CYCLE_ERRORS}): ${msg}`);

    if (consecutiveErrors >= MAX_CYCLE_ERRORS) {
      console.error('[Daemon] Too many consecutive errors — stopping bot');
      setBotState('is_running', '0');
      await alerts.sendError('Daemon', `Stopped after ${MAX_CYCLE_ERRORS} consecutive errors. Last: ${msg}`);
      consecutiveErrors = 0;
    }
  }
}

async function main(): Promise<void> {
  console.log('[Daemon] Bot engine daemon started');
  setBotState('daemon_started_at', new Date().toISOString());
  setBotState('last_heartbeat', new Date().toISOString());

  // Main poll loop
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error('[Daemon] Unexpected error in tick():', err instanceof Error ? err.message : err);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('[Daemon] Fatal error:', err);
  process.exit(1);
});
