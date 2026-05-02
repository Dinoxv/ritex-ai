import { NextResponse } from 'next/server';
import {
  setBotState,
  setBotSettingsKey,
} from '@/lib/services/db.service';
import type { DaemonSettings } from '@/lib/bot-engine/types';
import { DEFAULT_DAEMON_SETTINGS } from '@/lib/bot-engine/types';

interface StartPayload {
  settings: Partial<DaemonSettings>;
  symbols: string[];
  /** Binance API credentials — stored encrypted-at-rest in SQLite */
  apiKey?: string;
  apiSecret?: string;
  isTestnet?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartPayload;

    // Merge and persist settings
    const merged: DaemonSettings = { ...DEFAULT_DAEMON_SETTINGS, ...(body.settings ?? {}) };
    setBotSettingsKey('daemon_settings', JSON.stringify(merged));

    // Persist tracked symbols
    if (Array.isArray(body.symbols) && body.symbols.length > 0) {
      setBotState('tracked_symbols', JSON.stringify(body.symbols));
    }

    // Persist API credentials (stored server-side in SQLite, not sent to browser)
    if (body.apiKey && body.apiSecret) {
      setBotSettingsKey('api_credentials', JSON.stringify({
        apiKey: body.apiKey,
        apiSecret: body.apiSecret,
        isTestnet: body.isTestnet ?? false,
      }));
    }

    // Signal daemon to start
    setBotState('is_running', '1');
    setBotState('close_all_requested', '0');

    return NextResponse.json({ ok: true, started: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
