import { NextRequest, NextResponse } from 'next/server';
import {
  getServerPublicIp,
  testBinanceConnection,
  testHyperliquidConnection,
} from '@/lib/server/exchange-connection';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const exchange = body?.exchange;
    const serverIp = await getServerPublicIp();

    if (exchange === 'hyperliquid') {
      const result = await testHyperliquidConnection({
        privateKey: String(body?.privateKey || ''),
        walletAddress: String(body?.walletAddress || ''),
        isTestnet: Boolean(body?.isTestnet),
      });

      return NextResponse.json({ ok: true, serverIp, message: result.message });
    }

    if (exchange === 'binance') {
      const result = await testBinanceConnection(
        {
          apiKey: String(body?.apiKey || ''),
          apiSecret: String(body?.apiSecret || ''),
          isTestnet: Boolean(body?.isTestnet),
        },
        serverIp
      );

      return NextResponse.json({ ok: true, serverIp, message: result.message });
    }

    return NextResponse.json({ ok: false, error: 'Exchange khong duoc ho tro' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Test connection that bai',
      },
      { status: 400 }
    );
  }
}