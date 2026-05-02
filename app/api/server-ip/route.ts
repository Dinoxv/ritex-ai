import { NextResponse } from 'next/server';
import { getServerPublicIp } from '@/lib/server/exchange-connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ip = await getServerPublicIp();
  const expectedIpRaw = process.env.BINANCE_WHITELIST_IP || '';
  const expectedIp = expectedIpRaw.trim();

  if (!ip) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Khong lay duoc public IP cua may chu',
        expectedIp,
      },
      { status: 503 }
    );
  }

  const matchesExpected = expectedIp.length > 0 ? ip === expectedIp : null;

  return NextResponse.json({
    ok: true,
    ip,
    expectedIp,
    ipWhitelistConfigured: expectedIp.length > 0,
    matchesExpected,
  });
}