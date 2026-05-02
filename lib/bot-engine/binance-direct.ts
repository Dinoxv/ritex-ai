/**
 * binance-direct.ts – Standalone Binance USDM Futures client for the daemon.
 *
 * Uses direct HMAC-SHA256 signing (Node.js crypto module) to call Binance
 * without depending on the Next.js API proxy.  The daemon runs as a separate
 * PM2 process and must sign requests itself.
 */

import { createHmac } from 'crypto';
import type { SimpleCandle, SymbolMeta } from './types';

const BINANCE_MAINNET = 'https://fapi.binance.com';
const BINANCE_TESTNET = 'https://testnet.binancefuture.com';

interface BinancePositionRisk {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unrealizedProfit: string;
  leverage: string;
}

interface BinanceAccountInfo {
  availableBalance: string;
  totalWalletBalance: string;
  totalInitialMargin: string;
}

interface BinanceOrderResult {
  orderId: number;
  clientOrderId: string;
  status: string;
}

function toCoinSymbol(coin: string): string {
  const c = coin.toUpperCase();
  return c.endsWith('USDT') ? c : `${c}USDT`;
}

function fromBinanceSymbol(symbol: string): string {
  return symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol;
}

function decimalsFromStep(step: number): number {
  if (step >= 1) return 0;
  const text = step.toFixed(10).replace(/0+$/, '');
  if (!text.includes('.')) return 0;
  return text.split('.')[1]?.length ?? 0;
}

export class BinanceDirectClient {
  private readonly baseUrl: string;
  private metaCache = new Map<string, SymbolMeta>();
  private metaCacheExpiry = 0;

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    isTestnet = false
  ) {
    this.baseUrl = isTestnet ? BINANCE_TESTNET : BINANCE_MAINNET;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async getCandles(symbol: string, interval: string, limit = 200): Promise<SimpleCandle[]> {
    const coin = toCoinSymbol(symbol);
    const url = `${this.baseUrl}/fapi/v1/klines?symbol=${coin}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Binance klines error (${res.status}): ${txt.slice(0, 300)}`);
    }
    const data = (await res.json()) as any[][];
    return data.map((k) => ({
      time: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));
  }

  async getMidPrice(symbol: string): Promise<number> {
    const coin = toCoinSymbol(symbol);
    const url = `${this.baseUrl}/fapi/v1/ticker/bookTicker?symbol=${coin}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`getMidPrice failed: ${res.status}`);
    const data = (await res.json()) as { bidPrice: string; askPrice: string };
    return (Number(data.bidPrice) + Number(data.askPrice)) / 2;
  }

  async getSymbolMeta(symbol: string): Promise<SymbolMeta> {
    await this.ensureMetaFresh();
    const coin = symbol.toUpperCase().replace('USDT', '');
    const meta = this.metaCache.get(coin);
    if (!meta) throw new Error(`No metadata for ${symbol}`);
    return meta;
  }

  private async ensureMetaFresh(): Promise<void> {
    if (this.metaCache.size > 0 && Date.now() < this.metaCacheExpiry) return;
    const url = `${this.baseUrl}/fapi/v1/exchangeInfo`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`exchangeInfo failed: ${res.status}`);
    const data = (await res.json()) as { symbols: any[] };
    for (const s of data.symbols) {
      if (s.contractType !== 'PERPETUAL' || !s.symbol.endsWith('USDT')) continue;
      const coin = fromBinanceSymbol(s.symbol);
      const priceFilter = s.filters?.find((f: any) => f.filterType === 'PRICE_FILTER');
      const lotFilter = s.filters?.find((f: any) => f.filterType === 'LOT_SIZE');
      const tickSize = parseFloat(priceFilter?.tickSize ?? '0.01');
      const stepSize = parseFloat(lotFilter?.stepSize ?? '0.001');
      this.metaCache.set(coin, {
        tickSize: Number.isFinite(tickSize) && tickSize > 0 ? tickSize : 0.01,
        sizeDecimals: decimalsFromStep(Number.isFinite(stepSize) && stepSize > 0 ? stepSize : 0.001),
      });
    }
    this.metaCacheExpiry = Date.now() + 30_000;
  }

  // ─── Signed API ──────────────────────────────────────────────────────────

  private async signedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const allParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      allParams[k] = String(v);
    }
    allParams.timestamp = String(Date.now());

    const qs = new URLSearchParams(allParams).toString();
    const signature = createHmac('sha256', this.apiSecret).update(qs).digest('hex');
    const fullQs = `${qs}&signature=${signature}`;

    const url = method === 'GET' || method === 'DELETE'
      ? `${this.baseUrl}${path}?${fullQs}`
      : `${this.baseUrl}${path}`;

    const fetchOpts: RequestInit = {
      method,
      headers: { 'X-MBX-APIKEY': this.apiKey },
      signal: AbortSignal.timeout(10_000),
    };
    if (method === 'POST') {
      fetchOpts.body = fullQs;
      (fetchOpts.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const res = await fetch(url, fetchOpts);
    const txt = await res.text();
    if (!res.ok) {
      throw new Error(`Binance signed ${method} ${path} (${res.status}): ${txt.slice(0, 500)}`);
    }
    return JSON.parse(txt) as T;
  }

  async getAccountBalance(): Promise<{ equity: number; available: number }> {
    const data = await this.signedRequest<BinanceAccountInfo>('GET', '/fapi/v2/account');
    return {
      equity: Number(data.totalWalletBalance),
      available: Number(data.availableBalance),
    };
  }

  async getOpenPositions(): Promise<Array<{ symbol: string; side: 'long' | 'short'; size: number; entryPrice: number }>> {
    const data = await this.signedRequest<BinancePositionRisk[]>('GET', '/fapi/v2/positionRisk');
    return data
      .filter((p) => Math.abs(parseFloat(p.positionAmt)) > 0)
      .map((p) => {
        const amt = parseFloat(p.positionAmt);
        return {
          symbol: fromBinanceSymbol(p.symbol),
          side: (amt >= 0 ? 'long' : 'short') as 'long' | 'short',
          size: Math.abs(amt),
          entryPrice: parseFloat(p.entryPrice),
        };
      });
  }

  async setLeverage(symbol: string, leverage: number): Promise<void> {
    await this.signedRequest('POST', '/fapi/v1/leverage', {
      symbol: toCoinSymbol(symbol),
      leverage,
    });
  }

  async placeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: string): Promise<number> {
    const isHedge = await this.getPositionMode();
    const params: Record<string, string | number | boolean> = {
      symbol: toCoinSymbol(symbol),
      side,
      type: 'MARKET',
      quantity,
    };
    if (isHedge) {
      params.positionSide = side === 'BUY' ? 'LONG' : 'SHORT';
    }
    const res = await this.signedRequest<BinanceOrderResult>('POST', '/fapi/v1/order', params);
    return res.orderId;
  }

  async placeStopMarket(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: string,
    stopPrice: string
  ): Promise<number> {
    const isHedge = await this.getPositionMode();
    const params: Record<string, string | number | boolean> = {
      symbol: toCoinSymbol(symbol),
      side,
      type: 'STOP_MARKET',
      quantity,
      stopPrice,
      workingType: 'MARK_PRICE',
      priceProtect: true,
    };
    if (isHedge) {
      params.positionSide = side === 'BUY' ? 'SHORT' : 'LONG'; // reduceOnly for hedge mode
    } else {
      params.reduceOnly = true;
    }
    const res = await this.signedRequest<BinanceOrderResult>('POST', '/fapi/v1/order', params);
    return res.orderId;
  }

  async cancelOrder(symbol: string, orderId: number): Promise<void> {
    try {
      await this.signedRequest('DELETE', '/fapi/v1/order', {
        symbol: toCoinSymbol(symbol),
        orderId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // -2011 = unknown order (already filled/cancelled) — safe to ignore
      if (!msg.includes('-2011') && !msg.toLowerCase().includes('unknown order')) {
        throw err;
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private _positionMode: boolean | null = null;
  private _positionModeExpiry = 0;

  private async getPositionMode(): Promise<boolean> {
    if (this._positionMode !== null && Date.now() < this._positionModeExpiry) {
      return this._positionMode;
    }
    const res = await this.signedRequest<{ dualSidePosition: boolean }>('GET', '/fapi/v1/positionSide/dual');
    this._positionMode = res.dualSidePosition === true;
    this._positionModeExpiry = Date.now() + 15_000;
    return this._positionMode;
  }

  formatPrice(price: number, meta: SymbolMeta): string {
    const rounded = Math.round(price / meta.tickSize) * meta.tickSize;
    const decimals = meta.tickSize >= 1 ? 0 : (meta.tickSize.toString().split('.')[1]?.length ?? 2);
    return rounded.toFixed(Math.min(decimals, 8));
  }

  formatSize(size: number, meta: SymbolMeta): string {
    return Math.max(size, Math.pow(10, -meta.sizeDecimals)).toFixed(meta.sizeDecimals);
  }

  ensureMinNotional(size: number, price: number, meta: SymbolMeta, minNotional = 10): string {
    const formatted = this.formatSize(size, meta);
    if (parseFloat(formatted) * price >= minNotional) return formatted;
    const minQty = Math.ceil((minNotional / price) * Math.pow(10, meta.sizeDecimals)) / Math.pow(10, meta.sizeDecimals);
    return minQty.toFixed(meta.sizeDecimals);
  }

  /** Calculate ATR(period) from recent candles – used for dynamic SL (Fix #6) */
  calcAtr(candles: SimpleCandle[], period = 14): number {
    if (candles.length < period + 1) return 0;
    const recent = candles.slice(-(period + 1));
    let trSum = 0;
    for (let i = 1; i < recent.length; i++) {
      const tr = Math.max(
        recent[i].high - recent[i].low,
        Math.abs(recent[i].high - recent[i - 1].close),
        Math.abs(recent[i].low - recent[i - 1].close)
      );
      trSum += tr;
    }
    return trSum / period;
  }
}
