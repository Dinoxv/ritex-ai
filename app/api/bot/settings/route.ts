import { NextResponse } from 'next/server';
import {
  getBotState,
  getBotSettingsKey,
  setBotState,
  setBotSettingsKey,
} from '@/lib/services/db.service';
import type { DaemonSettings } from '@/lib/bot-engine/types';
import { DEFAULT_DAEMON_SETTINGS } from '@/lib/bot-engine/types';

export async function GET() {
  try {
    const blob = getBotSettingsKey('daemon_settings');
    const settings: DaemonSettings = blob
      ? { ...DEFAULT_DAEMON_SETTINGS, ...(JSON.parse(blob) as Partial<DaemonSettings>) }
      : { ...DEFAULT_DAEMON_SETTINGS };
    // Strip secrets from response
    const { telegramBotToken: _t, telegramChatId: _c, alertWebhookUrl: _w, ...safeSettings } = settings;
    return NextResponse.json({ settings: safeSettings });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DaemonSettings>;
    const current: DaemonSettings = (() => {
      const blob = getBotSettingsKey('daemon_settings');
      return blob
        ? { ...DEFAULT_DAEMON_SETTINGS, ...(JSON.parse(blob) as Partial<DaemonSettings>) }
        : { ...DEFAULT_DAEMON_SETTINGS };
    })();
    const merged: DaemonSettings = { ...current, ...body };
    setBotSettingsKey('daemon_settings', JSON.stringify(merged));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
