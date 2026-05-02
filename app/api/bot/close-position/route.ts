import { NextResponse } from 'next/server';
import { setBotState } from '@/lib/services/db.service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { symbol?: string };
    const symbol = (body.symbol ?? '').trim().toUpperCase();
    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }
    // Daemon polls bot_state key `close_position_SYMBOL` to detect close requests
    setBotState(`close_position_${symbol}`, '1');
    return NextResponse.json({ ok: true, symbol });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
