import { NextResponse } from 'next/server';
import { getDailyStats } from '@/lib/services/db.service';

function getDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const dayKey = getDayKey();
    const row = getDailyStats(dayKey);
    if (!row) {
      return NextResponse.json({
        stats: {
          dayKey,
          totalTradedNotional: 0,
          realizedPnl: 0,
          tradingDisabled: false,
        },
      });
    }
    return NextResponse.json({
      stats: {
        dayKey: row.day_key,
        totalTradedNotional: row.total_traded_notional,
        realizedPnl: row.realized_pnl,
        tradingDisabled: row.trading_disabled === 1,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
