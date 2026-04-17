import type { ExchangeProvider, CandleData } from './exchange-provider.interface';

function toSymbol(coin: string): string {
  const c = coin.toUpperCase();
  return c.endsWith('USDT') ? c : `${c}USDT`;
}

export class BinanceProvider implements ExchangeProvider {
  private readonly baseUrl: string;

  constructor(isTestnet: boolean = false) {
    this.baseUrl = isTestnet ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
  }

  async getCandles(params: {
    coin: string;
    interval: string;
    startTime?: number;
    endTime?: number;
  }): Promise<CandleData[]> {
    const qs = new URLSearchParams({
      symbol: toSymbol(params.coin),
      interval: params.interval,
      limit: '1500',
    });

    if (params.startTime) qs.set('startTime', String(params.startTime));
    if (params.endTime) qs.set('endTime', String(params.endTime));

    const response = await fetch(`${this.baseUrl}/fapi/v1/klines?${qs.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance klines failed: ${response.status} - ${errorText}`);
    }

    const rows = (await response.json()) as any[];

    return rows.map((row) => ({
      time: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
  }

  subscribeToCandlesStream(
    _params: { coin: string; interval: string },
    _callback: (candle: CandleData) => void
  ): () => void {
    throw new Error('WebSocket streams are handled by websocket services');
  }
}
