import { NextResponse } from 'next/server';
import { setBotState } from '@/lib/services/db.service';

export async function POST() {
  try {
    setBotState('is_running', '0');
    return NextResponse.json({ ok: true, stopped: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
