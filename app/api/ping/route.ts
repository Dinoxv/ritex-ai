import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const deploymentId = process.env.NEXT_DEPLOYMENT_ID ?? '';
  return NextResponse.json(
    { ok: true, deploymentId },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
