import { HyperliquidService } from './hyperliquid.service';
import type {
  AccountBalance,
  AllMids,
  AssetPosition,
  CandleParams,
  CancelResponse,
  ClosePositionParams,
  Fill,
  FrontendOrder,
  LongParams,
  MetaAndAssetCtxs,
  OrderParams,
  OrderResponse,
  PerpDexInfo,
  PerpsMeta,
  ShortParams,
  SpotMeta,
  SpotMetaAndAssetCtxs,
  StopLossParams,
  SuccessResponse,
  TakeProfitParams,
  TradesParams,
  TransformedCandle,
  TriggerMarketOrderParams,
  WsTrade,
} from './types';
import type { SymbolMetadata } from './metadata-cache.service';
import type { UserFill } from '@/types';

/**
 * Binance USDⓈ-M Futures Service
 * 
 * IMPORTANT: This service ONLY supports USDⓈ-M (USD-margined) Perpetual Futures
 * - Base URL: https://fapi.binance.com (NOT /dapi for COIN-M)
 * - Symbols: BTCUSDT, ETHUSDT, etc. (USDT-margined perpetuals)
 * - Contract Type: PERPETUAL only
 * - Margin Asset: USDT
 * 
 * NOT supported:
 * - COIN-M Futures (BTCUSD_PERP, etc.)
 * - Quarterly/Delivery contracts
 * - Spot trading
 */

type BinanceOrderSide = 'BUY' | 'SELL';
type BinanceOrderType =
  | 'LIMIT'
  | 'MARKET'
  | 'STOP'
  | 'STOP_MARKET'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_MARKET';

type BinanceExchangeInfoSymbol = {
  symbol: string;
  contractType: string;
  status: string;
  quantityPrecision: number;
  pricePrecision: number;
  filters: Array<Record<string, string>>;
  quoteAsset?: string; // For USDⓈ-M validation
  marginAsset?: string; // For USDⓈ-M validation
};

type BinancePositionRisk = {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unrealizedProfit: string;
  leverage: string;
};

type BinanceAccountTrade = {
  symbol: string;
  side: BinanceOrderSide;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  price: string;
  qty: string;
  realizedPnl: string;
  commission: string;
  time: number;
  orderId: number;
  id: number;
};

type BinanceMetaCache = {
  byCoin: Map<string, SymbolMetadata>;
  universe: Array<{ name: string; szDecimals: number; maxLeverage: number; isDelisted?: boolean }>;
  expiresAt: number;
};

const DUMMY_WALLET = '0x0000000000000000000000000000000000000000';

function toCoinSymbol(coin: string): string {
  const c = coin.toUpperCase();
  return c.endsWith('USDT') ? c : `${c}USDT`;
}

function fromBinanceSymbol(symbol: string): string {
  return symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol;
}

function inferTickSize(filters: Array<Record<string, string>>): number {
  const priceFilter = filters.find((f) => f.filterType === 'PRICE_FILTER');
  const tick = parseFloat(priceFilter?.tickSize || '0.01');
  return Number.isFinite(tick) && tick > 0 ? tick : 0.01;
}

function inferStepSize(filters: Array<Record<string, string>>): number {
  const lotFilter = filters.find((f) => f.filterType === 'LOT_SIZE');
  const step = parseFloat(lotFilter?.stepSize || '0.001');
  return Number.isFinite(step) && step > 0 ? step : 0.001;
}

function decimalsFromStep(step: number): number {
  if (step >= 1) return 0;
  const text = step.toString();
  if (!text.includes('.')) return 0;
  return text.split('.')[1]?.replace(/0+$/, '').length || 0;
}

function normalizeInterval(interval: string): string {
  return interval === '1M' ? '1M' : interval;
}

export class BinanceService extends HyperliquidService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private metadataCache: BinanceMetaCache = {
    byCoin: new Map(),
    universe: [],
    expiresAt: 0,
  };

  // Performance optimization: Cache for positions and orders
  private positionCache: {
    data: any[] | null;
    expiresAt: number;
  } = {
    data: null,
    expiresAt: 0,
  };

  private orderCache: {
    data: any[] | null;
    expiresAt: number;
  } = {
    data: null,
    expiresAt: 0,
  };

  private readonly POSITION_CACHE_TTL = 5_000; // 5s
  private readonly ORDER_CACHE_TTL = 3_000; // 3s

  constructor(apiKey: string | null, apiSecret: string | null, isTestnet: boolean = false) {
    super(null, DUMMY_WALLET, isTestnet);
    this.apiKey = apiKey || '';
    this.apiSecret = apiSecret || '';
    this.baseUrl = isTestnet ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
  }

  getExchangeKey(): string {
    return `binance:${this.baseUrl.includes('testnet') ? 'testnet' : 'mainnet'}`;
  }

  /**
   * Invalidate position cache (call after order placement/cancellation)
   */
  private invalidatePositionCache(): void {
    this.positionCache = {
      data: null,
      expiresAt: 0,
    };
  }

  /**
   * Invalidate order cache (call after order placement/cancellation)
   */
  private invalidateOrderCache(): void {
    this.orderCache = {
      data: null,
      expiresAt: 0,
    };
  }

  /**
   * Invalidate all caches
   */
  private invalidateAllCaches(): void {
    this.invalidatePositionCache();
    this.invalidateOrderCache();
  }

  private ensureApiCredentials(): void {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Binance API key/secret chưa được cấu hình');
    }
  }

  private async signPayload(payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const bytes = new Uint8Array(signature);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async publicRequest<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    });

    const url = `${this.baseUrl}${path}${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Binance API lỗi (${res.status}): ${txt}`);
    }
    return (await res.json()) as T;
  }

  private async signedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    this.ensureApiCredentials();

    const finalParams: Record<string, string | number | boolean> = {
      ...params,
      recvWindow: 5000,
      timestamp: Date.now(),
    };

    const qs = new URLSearchParams();
    Object.entries(finalParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    });

    const payload = qs.toString();
    const signature = await this.signPayload(payload);
    const withSig = `${payload}&signature=${signature}`;

    const url = `${this.baseUrl}${path}?${withSig}`;
    const res = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      let errorMsg = `Binance signed API lỗi (${res.status}): ${txt}`;
      
      // Parse error code and provide helpful troubleshooting
      try {
        const errJson = JSON.parse(txt);
        if (errJson.code === -2015) {
          errorMsg += '\n\n🔧 TROUBLESHOOTING ERROR -2015:\n';
          errorMsg += '1️⃣ Kiểm tra API Key có đúng không (copy lại từ Binance)\n';
          errorMsg += '2️⃣ Đảm bảo API Key có quyền "Enable Futures" trong Binance API Management\n';
          errorMsg += '3️⃣ Nếu bật IP Whitelist, thêm IP: ' + errJson.msg?.match(/request ip: ([\d.]+)/)?.[1] + '\n';
          errorMsg += '4️⃣ API Key phải là Futures API, không phải Spot API\n';
          errorMsg += '5️⃣ Thử tạo API Key mới với quyền "Enable Reading" + "Enable Futures" + "Enable Spot & Margin Trading"';
        }
      } catch {
        // If JSON parse fails, keep original error
      }
      
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  }

  private async ensureMetadataFresh(): Promise<void> {
    if (Date.now() < this.metadataCache.expiresAt && this.metadataCache.universe.length > 0) {
      console.log(`[Binance] Using cached metadata (${this.metadataCache.universe.length} symbols, expires in ${Math.round((this.metadataCache.expiresAt - Date.now()) / 1000)}s)`);
      return;
    }

    console.log('[Binance] Fetching fresh metadata from API...');
    // IMPORTANT: Using /fapi/v1 endpoint for USDⓈ-M Futures ONLY (not COIN-M)
    // USDⓈ-M = USD-margined perpetual futures (BTCUSDT, ETHUSDT, etc.)
    // COIN-M = Coin-margined futures would use /dapi/v1 instead
    const exchangeInfo = await this.publicRequest<{ symbols: BinanceExchangeInfoSymbol[] }>('/fapi/v1/exchangeInfo');

    // Filter for USDⓈ-M Futures only:
    // 1. contractType = PERPETUAL (not CURRENT_QUARTER, NEXT_QUARTER, etc.)
    // 2. symbol ends with USDT (USDⓈ-M margin asset)
    // 3. quoteAsset = USDT (if available, extra validation)
    const tradable = exchangeInfo.symbols.filter((s) => {
      const isPerpetual = s.contractType === 'PERPETUAL';
      const isUSDT = s.symbol.endsWith('USDT');
      const isUSDTQuote = !s.quoteAsset || s.quoteAsset === 'USDT';
      const isUSDTMargin = !s.marginAsset || s.marginAsset === 'USDT';
      return isPerpetual && isUSDT && isUSDTQuote && isUSDTMargin;
    });

    console.log(`[Binance] ✅ Loaded ${tradable.length} USDⓈ-M Futures symbols (USDT-margined perpetuals only)`);
    
    // Debug: Check for RAVE and RIVER
    const raveRiver = tradable.filter(s => s.symbol.includes('RAVE') || s.symbol.includes('RIVER'));
    if (raveRiver.length > 0) {
      console.log(`[Binance] Found RAVE/RIVER tokens:`, raveRiver.map(s => s.symbol));
    }

    const universe = tradable.map((s) => ({
      name: fromBinanceSymbol(s.symbol),
      szDecimals: s.quantityPrecision,
      maxLeverage: 125,
      isDelisted: s.status !== 'TRADING',
    }));

    const byCoin = new Map<string, SymbolMetadata>();
    tradable.forEach((s, idx) => {
      const coin = fromBinanceSymbol(s.symbol);
      byCoin.set(coin, {
        coinIndex: idx,
        tickSize: inferTickSize(s.filters),
        sizeDecimals: decimalsFromStep(inferStepSize(s.filters)),
        timestamp: Date.now(),
      });
    });

    this.metadataCache = {
      byCoin,
      universe,
      expiresAt: Date.now() + 30_000, // 30s cache for fresh data
    };
  }

  private toAppOrder(order: any): FrontendOrder {
    const side = String(order.side || 'BUY').toUpperCase() === 'BUY' ? 'B' : 'A';
    const orderType = String(order.type || 'LIMIT').toLowerCase();
    const isTrigger = orderType.includes('stop') || orderType.includes('take_profit');
    const triggerPx = order.stopPrice || '0';

    return {
      oid: Number(order.orderId),
      coin: fromBinanceSymbol(order.symbol),
      side,
      limitPx: order.price || '0',
      sz: order.origQty || order.executedQty || '0',
      timestamp: Number(order.updateTime || order.time || Date.now()),
      orderType,
      triggerPx,
      isTrigger,
      isPositionTpsl: Boolean(order.reduceOnly),
      reduceOnly: Boolean(order.reduceOnly),
    } as FrontendOrder;
  }

  private toOrderResponse(orderId: number): OrderResponse {
    return {
      status: 'ok',
      response: {
        type: 'order',
        data: {
          statuses: [{ resting: { oid: orderId } }],
        },
      },
    } as unknown as OrderResponse;
  }

  private emptyCancelResponse(): CancelResponse {
    return {
      status: 'ok',
      response: {
        type: 'cancel',
        data: { statuses: [] },
      },
    } as CancelResponse;
  }

  private async placeOrder(params: {
    coin: string;
    side: BinanceOrderSide;
    type: BinanceOrderType;
    quantity: string;
    price?: string;
    stopPrice?: string;
    reduceOnly?: boolean;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
  }): Promise<OrderResponse> {
    const symbol = toCoinSymbol(params.coin);
    const payload: Record<string, string | number | boolean> = {
      symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
    };

    if (params.price) payload.price = params.price;
    if (params.stopPrice) payload.stopPrice = params.stopPrice;
    if (typeof params.reduceOnly === 'boolean') payload.reduceOnly = params.reduceOnly;
    if (params.timeInForce) payload.timeInForce = params.timeInForce;

    const result = await this.signedRequest<{ orderId: number }>('POST', '/fapi/v1/order', payload);
    
    // Invalidate caches after successful order placement
    this.invalidateAllCaches();
    
    return this.toOrderResponse(result.orderId);
  }

  async getCandles(params: CandleParams): Promise<TransformedCandle[]> {
    const symbol = toCoinSymbol(params.coin);
    const candleParams: Record<string, string | number | boolean> = {
      symbol,
      interval: normalizeInterval(params.interval),
      limit: 1500,
    };
    if (params.startTime) candleParams.startTime = params.startTime;
    if (params.endTime) candleParams.endTime = params.endTime;

    const klines = await this.publicRequest<any[]>('/fapi/v1/klines', candleParams);

    return klines.map((k) => ({
      time: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));
  }

  async getRecentTrades(params: TradesParams): Promise<WsTrade[]> {
    const symbol = toCoinSymbol(params.coin);
    const trades = await this.publicRequest<any[]>('/fapi/v1/trades', { symbol, limit: 100 });
    return trades.map((t) => ({
      coin: fromBinanceSymbol(symbol),
      side: t.isBuyerMaker ? 'A' : 'B',
      px: String(t.price),
      sz: String(t.qty),
      time: Number(t.time),
      hash: '',
      tid: Number(t.id),
    })) as unknown as WsTrade[];
  }

  async subscribeToCandles(_params: CandleParams, _callback: (data: TransformedCandle) => void): Promise<() => void> {
    return () => {};
  }

  async subscribeToTrades(_params: TradesParams, _callback: (data: WsTrade[]) => void): Promise<() => void> {
    return () => {};
  }

  async resolveSymbolMetadata(coin: string): Promise<SymbolMetadata> {
    await this.ensureMetadataFresh();
    const meta = this.metadataCache.byCoin.get(coin.toUpperCase());
    if (!meta) {
      throw new Error(`Không tìm thấy metadata cho ${coin}`);
    }
    return meta;
  }

  async getMetadataCache(coin: string): Promise<SymbolMetadata> {
    return this.resolveSymbolMetadata(coin);
  }

  formatPriceCached(price: number, metadata: SymbolMetadata): string {
    const rounded = Math.round(price / metadata.tickSize) * metadata.tickSize;
    const decimals = metadata.tickSize >= 1 ? 0 : (metadata.tickSize.toString().split('.')[1]?.length || 2);
    return rounded.toFixed(Math.min(decimals, 8));
  }

  formatSizeCached(size: number, metadata: SymbolMetadata): string {
    return Math.max(size, Math.pow(10, -metadata.sizeDecimals)).toFixed(metadata.sizeDecimals);
  }

  ensureMinNotional(size: number, price: number, metadata: SymbolMetadata, minNotional: number = 10): { size: string; wasBumped: boolean } {
    const formatted = this.formatSizeCached(size, metadata);
    if (parseFloat(formatted) * price >= minNotional) {
      return { size: formatted, wasBumped: false };
    }

    const minQty = Math.ceil((minNotional / price) * Math.pow(10, metadata.sizeDecimals)) / Math.pow(10, metadata.sizeDecimals);
    return { size: minQty.toFixed(metadata.sizeDecimals), wasBumped: true };
  }

  invalidateAccountCache(): void {
    // No-op for Binance service cache
  }

  async getAccountBalanceCached(user?: string): Promise<AccountBalance> {
    return this.getAccountBalance(user);
  }

  async getCoinIndex(coin: string): Promise<number> {
    const metadata = await this.getMetadataCache(coin);
    return metadata.coinIndex;
  }

  async formatPrice(price: number, coin: string): Promise<string> {
    const metadata = await this.getMetadataCache(coin);
    return this.formatPriceCached(price, metadata);
  }

  async formatSize(size: number, coin: string): Promise<string> {
    const metadata = await this.getMetadataCache(coin);
    return this.formatSizeCached(size, metadata);
  }

  async getAccountState(_user?: string): Promise<any> {
    const [account, positions] = await Promise.all([
      this.signedRequest<any>('GET', '/fapi/v2/account'),
      this.getOpenPositions(),
    ]);

    return {
      withdrawable: account.availableBalance || '0',
      marginSummary: { accountValue: account.totalWalletBalance || '0' },
      assetPositions: positions,
    } as any;
  }

  async getOpenPositions(_user?: string): Promise<AssetPosition[]> {
    // Use cache if still fresh
    if (this.positionCache.data && Date.now() < this.positionCache.expiresAt) {
      return this.positionCache.data;
    }

    const data = await this.signedRequest<BinancePositionRisk[]>('GET', '/fapi/v2/positionRisk');

    const positions = data
      .filter((p) => Math.abs(parseFloat(p.positionAmt)) > 0)
      .map((p) => {
        const szi = parseFloat(p.positionAmt);
        return {
          position: {
            coin: fromBinanceSymbol(p.symbol),
            szi: String(szi),
            entryPx: p.entryPrice,
            unrealizedPnl: p.unrealizedProfit,
            positionValue: String(Math.abs(szi * parseFloat(p.markPrice))),
            leverage: { value: p.leverage },
          },
        };
      }) as unknown as AssetPosition[];

    // Update cache
    this.positionCache = {
      data: positions,
      expiresAt: Date.now() + this.POSITION_CACHE_TTL,
    };

    return positions;
  }

  async getAccountBalance(_user?: string): Promise<AccountBalance> {
    const account = await this.signedRequest<any>('GET', '/fapi/v2/account');
    return {
      withdrawable: account.availableBalance || '0',
      marginUsed: account.totalInitialMargin || '0',
      accountValue: account.totalWalletBalance || '0',
    };
  }

  async getOpenOrders(_user?: string): Promise<FrontendOrder[]> {
    // Use cache if still fresh
    if (this.orderCache.data && Date.now() < this.orderCache.expiresAt) {
      return this.orderCache.data;
    }

    const orders = await this.signedRequest<any[]>('GET', '/fapi/v1/openOrders');
    const mappedOrders = orders.map((o) => this.toAppOrder(o));

    // Update cache
    this.orderCache = {
      data: mappedOrders,
      expiresAt: Date.now() + this.ORDER_CACHE_TTL,
    };

    return mappedOrders;
  }

  async getUserFillsByTime(startTime: number, endTime?: number, _user?: string): Promise<UserFill[]> {
    const symbols = await this.getAllPerpMetas();
    const targetSymbols = symbols[0]?.universe?.slice(0, 30)?.map((u: any) => u.name) || [];

    const fills: UserFill[] = [];

    for (const coin of targetSymbols) {
      try {
        const tradeParams: Record<string, string | number | boolean> = {
          symbol: toCoinSymbol(coin),
          startTime,
          limit: 1000,
        };
        if (endTime) tradeParams.endTime = endTime;

        const rows = await this.signedRequest<BinanceAccountTrade[]>('GET', '/fapi/v1/userTrades', tradeParams);

        rows.forEach((t) => {
          fills.push({
            coin,
            price: parseFloat(t.price),
            size: parseFloat(t.qty),
            side: t.side === 'BUY' ? 'buy' : 'sell',
            time: t.time,
            startPosition: 0,
            closedPnl: parseFloat(t.realizedPnl || '0'),
            fee: parseFloat(t.commission || '0'),
            oid: t.orderId,
            tid: t.id,
            hash: `${t.symbol}-${t.id}`,
            crossed: false,
            feeToken: 'USDT',
          });
        });
      } catch {
        // Skip symbols that fail
      }
    }

    return fills.sort((a, b) => b.time - a.time);
  }

  async placeMarketBuy(coin: string, size: string, _price: string, _metadata: SymbolMetadata): Promise<OrderResponse> {
    return this.placeOrder({ coin, side: 'BUY', type: 'MARKET', quantity: size });
  }

  async placeMarketSell(coin: string, size: string, _price: string, _metadata: SymbolMetadata): Promise<OrderResponse> {
    return this.placeOrder({ coin, side: 'SELL', type: 'MARKET', quantity: size });
  }

  async placeLimitOrder(params: OrderParams, _metadata: SymbolMetadata): Promise<OrderResponse> {
    return this.placeOrder({
      coin: params.coin,
      side: params.isBuy ? 'BUY' : 'SELL',
      type: 'LIMIT',
      quantity: params.size,
      price: params.price,
      reduceOnly: params.reduceOnly || false,
      timeInForce: 'GTC',
    });
  }

  async placeBatchLimitOrders(orders: OrderParams[], metadata: SymbolMetadata): Promise<OrderResponse> {
    return this.placeBatchMixedOrders(
      orders.map((o) => ({
        a: metadata.coinIndex,
        b: o.isBuy,
        p: o.price,
        s: o.size,
        r: o.reduceOnly || false,
        t: { limit: { tif: 'Gtc' as const } },
      }))
    );
  }

  async placeStopLoss(params: StopLossParams, _metadata: SymbolMetadata): Promise<OrderResponse> {
    return this.placeOrder({
      coin: params.coin,
      side: params.isBuy ? 'BUY' : 'SELL',
      type: 'STOP_MARKET',
      quantity: params.size,
      stopPrice: params.triggerPrice,
      reduceOnly: true,
    });
  }

  async placeTakeProfit(params: TakeProfitParams, _metadata: SymbolMetadata): Promise<OrderResponse> {
    return this.placeOrder({
      coin: params.coin,
      side: params.isBuy ? 'BUY' : 'SELL',
      type: 'TAKE_PROFIT_MARKET',
      quantity: params.size,
      stopPrice: params.triggerPrice,
      reduceOnly: true,
    });
  }

  async placeTriggerMarketOrder(params: TriggerMarketOrderParams, _metadata: SymbolMetadata): Promise<OrderResponse> {
    return this.placeOrder({
      coin: params.coin,
      side: params.isBuy ? 'BUY' : 'SELL',
      type: 'STOP_MARKET',
      quantity: params.size,
      stopPrice: params.triggerPrice,
    });
  }

  async placeBatchMixedOrders(
    orders: Array<{
      a: number;
      b: boolean;
      p: string;
      s: string;
      r: boolean;
      t: { limit: { tif: 'Gtc' | 'Ioc' } } | { trigger: { triggerPx: string; isMarket: boolean; tpsl: 'tp' | 'sl' } };
    }>
  ): Promise<OrderResponse> {
    await this.ensureMetadataFresh();

    const statuses: Array<{ resting?: { oid: number }; error?: string }> = [];

    for (const o of orders) {
      const coin = this.metadataCache.universe[o.a]?.name;
      if (!coin) {
        statuses.push({ error: `Unknown coinIndex ${o.a}` });
        continue;
      }

      try {
        const isLimit = 'limit' in o.t;
        const side: BinanceOrderSide = o.b ? 'BUY' : 'SELL';
        let orderType: BinanceOrderType = 'LIMIT';
        if ('trigger' in o.t) {
          orderType = o.t.trigger.tpsl === 'tp' ? 'TAKE_PROFIT_MARKET' : 'STOP_MARKET';
        }

        const orderPayload: {
          coin: string;
          side: BinanceOrderSide;
          type: BinanceOrderType;
          quantity: string;
          price?: string;
          stopPrice?: string;
          reduceOnly?: boolean;
          timeInForce?: 'GTC' | 'IOC' | 'FOK';
        } = {
          coin,
          side,
          type: orderType,
          quantity: o.s,
          reduceOnly: o.r,
        };

        if ('limit' in o.t) {
          orderPayload.price = o.p;
          orderPayload.timeInForce = o.t.limit.tif === 'Ioc' ? 'IOC' : 'GTC';
        } else {
          orderPayload.stopPrice = o.t.trigger.triggerPx;
        }

        const res = await this.placeOrder(orderPayload);

        const status0 = res?.response?.data?.statuses?.[0] as any;
        const oid = status0 && typeof status0 === 'object' && 'resting' in status0
          ? status0.resting?.oid
          : undefined;
        statuses.push(typeof oid === 'number' ? { resting: { oid } } : {});
      } catch (err) {
        statuses.push({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return {
      status: 'ok',
      response: {
        type: 'order',
        data: { statuses },
      },
    } as unknown as OrderResponse;
  }

  async cancelOrder(coin: string, orderId: number, _metadata: SymbolMetadata): Promise<CancelResponse> {
    await this.signedRequest('DELETE', '/fapi/v1/order', {
      symbol: toCoinSymbol(coin),
      orderId,
    });
    
    // Invalidate caches after successful cancellation
    this.invalidateAllCaches();
    
    return this.emptyCancelResponse();
  }

  async cancelAllOrders(coin: string, _metadata: SymbolMetadata): Promise<CancelResponse> {
    await this.signedRequest('DELETE', '/fapi/v1/allOpenOrders', {
      symbol: toCoinSymbol(coin),
    });
    return this.emptyCancelResponse();
  }

  async cancelEntryOrders(coin: string, metadata: SymbolMetadata): Promise<CancelResponse> {
    const orders = await this.getOpenOrders();
    const entry = orders.filter((o) => o.coin === coin && !o.isPositionTpsl && !o.isTrigger);
    for (const o of entry) {
      await this.cancelOrder(coin, Number(o.oid), metadata);
    }
    return this.emptyCancelResponse();
  }

  async cancelExitOrders(coin: string, metadata: SymbolMetadata): Promise<CancelResponse> {
    const orders = await this.getOpenOrders();
    const exits = orders.filter((o) => o.coin === coin && (o.isPositionTpsl || o.isTrigger));
    for (const o of exits) {
      await this.cancelOrder(coin, Number(o.oid), metadata);
    }
    return this.emptyCancelResponse();
  }

  async cancelTPOrders(coin: string, metadata: SymbolMetadata): Promise<CancelResponse> {
    const orders = await this.getOpenOrders();
    const tp = orders.filter((o) => o.coin === coin && String(o.orderType || '').includes('take_profit'));
    for (const o of tp) {
      await this.cancelOrder(coin, Number(o.oid), metadata);
    }
    return this.emptyCancelResponse();
  }

  async cancelSLOrders(coin: string, metadata: SymbolMetadata): Promise<CancelResponse> {
    const orders = await this.getOpenOrders();
    const sl = orders.filter((o) => o.coin === coin && String(o.orderType || '').includes('stop'));
    for (const o of sl) {
      await this.cancelOrder(coin, Number(o.oid), metadata);
    }
    return this.emptyCancelResponse();
  }

  async openLong(params: LongParams, metadata: SymbolMetadata): Promise<OrderResponse> {
    if (!params.price) {
      throw new Error('Price is required');
    }

    return this.placeOrder({
      coin: params.coin,
      side: 'BUY',
      type: 'LIMIT',
      quantity: this.formatSizeCached(parseFloat(params.size), metadata),
      price: params.price,
      timeInForce: 'GTC',
    });
  }

  async openShort(params: ShortParams, metadata: SymbolMetadata): Promise<OrderResponse> {
    if (!params.price) {
      throw new Error('Price is required');
    }

    return this.placeOrder({
      coin: params.coin,
      side: 'SELL',
      type: 'LIMIT',
      quantity: this.formatSizeCached(parseFloat(params.size), metadata),
      price: params.price,
      timeInForce: 'GTC',
    });
  }

  async setLeverage(coin: string, leverage: number, _metadata: SymbolMetadata, _isCross: boolean = true): Promise<SuccessResponse | null> {
    await this.signedRequest('POST', '/fapi/v1/leverage', {
      symbol: toCoinSymbol(coin),
      leverage,
    });
    return { status: 'ok' } as unknown as SuccessResponse;
  }

  async closePosition(
    params: ClosePositionParams,
    price: string,
    _metadata: SymbolMetadata,
    positionData: AssetPosition
  ): Promise<OrderResponse> {
    const size = params.size || Math.abs(parseFloat(positionData.position.szi)).toString();
    const isLong = parseFloat(positionData.position.szi) > 0;

    return this.placeOrder({
      coin: params.coin,
      side: isLong ? 'SELL' : 'BUY',
      type: 'LIMIT',
      quantity: size,
      price,
      reduceOnly: true,
      timeInForce: 'IOC',
    });
  }

  async getMeta(): Promise<PerpsMeta> {
    await this.ensureMetadataFresh();
    return { universe: this.metadataCache.universe } as unknown as PerpsMeta;
  }

  async getAllMids(): Promise<AllMids> {
    const rows = await this.publicRequest<Array<{ symbol: string; markPrice: string }>>('/fapi/v1/premiumIndex');
    const mids: Record<string, string> = {};
    rows.forEach((r) => {
      if (r.symbol.endsWith('USDT')) {
        mids[fromBinanceSymbol(r.symbol)] = r.markPrice;
      }
    });
    return mids as unknown as AllMids;
  }

  async getMidPrice(coin: string): Promise<string> {
    const row = await this.publicRequest<{ markPrice: string }>('/fapi/v1/premiumIndex', {
      symbol: toCoinSymbol(coin),
    });
    return row.markPrice || '0';
  }

  async getMetaAndAssetCtxs(_dex?: string): Promise<MetaAndAssetCtxs> {
    await this.ensureMetadataFresh();

    const [ticker24h, premium] = await Promise.all([
      this.publicRequest<Array<{ symbol: string; quoteVolume: string; lastPrice: string; openPrice: string }>>('/fapi/v1/ticker/24hr'),
      this.publicRequest<Array<{ symbol: string; markPrice: string }>>('/fapi/v1/premiumIndex'),
    ]);

    const volMap = new Map<string, { dayNtlVlm: string; prevDayPx: string; midPx: string }>();
    ticker24h.forEach((t) => {
      if (!t.symbol.endsWith('USDT')) return;
      const coin = fromBinanceSymbol(t.symbol);
      volMap.set(coin, {
        dayNtlVlm: t.quoteVolume || '0',
        prevDayPx: t.openPrice || t.lastPrice || '0',
        midPx: t.lastPrice || '0',
      });
    });

    const markMap = new Map<string, string>();
    premium.forEach((p) => {
      if (!p.symbol.endsWith('USDT')) return;
      markMap.set(fromBinanceSymbol(p.symbol), p.markPrice || '0');
    });

    const meta = { universe: this.metadataCache.universe } as unknown as PerpsMeta;
    const assetCtxs = this.metadataCache.universe.map((u) => {
      const vol = volMap.get(u.name) || { dayNtlVlm: '0', prevDayPx: '0', midPx: '0' };
      const markPx = markMap.get(u.name) || vol.midPx || '0';
      return {
        dayNtlVlm: vol.dayNtlVlm,
        funding: '0',
        openInterest: '0',
        prevDayPx: vol.prevDayPx,
        markPx,
        midPx: vol.midPx,
      };
    });

    return { meta, assetCtxs };
  }

  async getPerpDexs(): Promise<Array<PerpDexInfo | null>> {
    return [];
  }

  async getAllPerpMetas(): Promise<PerpsMeta[]> {
    const meta = await this.getMeta();
    return [meta];
  }

  async getSpotMeta(): Promise<SpotMeta> {
    return { universe: [] } as unknown as SpotMeta;
  }

  async getSpotMetaAndAssetCtxs(): Promise<SpotMetaAndAssetCtxs> {
    return { meta: { universe: [] } as unknown as SpotMeta, assetCtxs: [] as any };
  }
}
