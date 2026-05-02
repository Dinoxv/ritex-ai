import { NextResponse } from 'next/server';
import { getLogs } from '@/lib/services/db.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 500);
    const rows = getLogs(limit);
    return NextResponse.json({ logs: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
