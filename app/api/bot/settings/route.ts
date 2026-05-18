import { NextResponse } from 'next/server';
import {
  getBotState,
  getBotSettingsKey,
  setBotState,
  setBotSettingsKey,
} from '@/lib/services/db.service';
import type { DaemonSettings } from '@/lib/bot-engine/types';
import { DEFAULT_DAEMON_SETTINGS } from '@/lib/bot-engine/types';

function normalizeDaemonSettings(
  settings: Partial<DaemonSettings> & { atrMult?: number }
): Partial<DaemonSettings> & { atrMult?: number } {
  const normalized = { ...settings };
  const ritchiAtrMult = Number((settings as any).ritchiAtrMult);
  const atrMultAlias = Number((settings as any).atrMult);

  const resolvedAtrMult = Number.isFinite(ritchiAtrMult) && ritchiAtrMult > 0
    ? ritchiAtrMult
    : (Number.isFinite(atrMultAlias) && atrMultAlias > 0 ? atrMultAlias : undefined);

  if (resolvedAtrMult !== undefined) {
    (normalized as any).ritchiAtrMult = resolvedAtrMult;
    normalized.atrMult = resolvedAtrMult;
  }

  return normalized;
}

export async function GET() {
  try {
    const blob = getBotSettingsKey('daemon_settings');
    const settings = blob
      ? {
          ...DEFAULT_DAEMON_SETTINGS,
          ...normalizeDaemonSettings((JSON.parse(blob) as Partial<DaemonSettings> & { atrMult?: number })),
        }
      : { ...DEFAULT_DAEMON_SETTINGS };
    // Strip secrets from response
    const { telegramBotToken: _t, telegramChatId: _c, alertWebhookUrl: _w, ...safeSettings } = settings;
    return NextResponse.json({
      settings: {
        ...safeSettings,
        atrMult: (safeSettings as any).ritchiAtrMult,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DaemonSettings> & { atrMult?: number };
    const current = (() => {
      const blob = getBotSettingsKey('daemon_settings');
      return blob
        ? {
            ...DEFAULT_DAEMON_SETTINGS,
            ...normalizeDaemonSettings((JSON.parse(blob) as Partial<DaemonSettings> & { atrMult?: number })),
          }
        : { ...DEFAULT_DAEMON_SETTINGS };
    })() as DaemonSettings & { atrMult?: number };
    const merged = {
      ...current,
      ...normalizeDaemonSettings(body),
    } as DaemonSettings & { atrMult?: number };
    setBotSettingsKey('daemon_settings', JSON.stringify(merged));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
