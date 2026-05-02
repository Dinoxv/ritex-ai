import { NextResponse } from 'next/server';
import { setBotState } from '@/lib/services/db.service';

export async function POST() {
  try {
    setBotState('close_all_requested', '1');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
