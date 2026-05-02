import { NextResponse } from 'next/server';
import { getAllPositions } from '@/lib/services/db.service';

export async function GET() {
  try {
    const rows = getAllPositions();
    const positions = rows.map((r) => ({
      symbol: r.symbol,
      side: r.side,
      size: r.size,
      entryPrice: r.entry_price,
      openedAt: r.opened_at,
      notional: r.notional,
      safetyStopOrderId: r.safety_stop_order_id,
    }));
    return NextResponse.json({ positions });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
