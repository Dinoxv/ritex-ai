import type { ExchangeTradingService } from '@/lib/services/types';
import { useWebSocketService } from '@/lib/websocket/websocket-singleton';
import type { TimeInterval } from '@/types';
import type { ExchangeType } from '@/stores/useDexStore';
import { TV_SUPPORTED_RESOLUTIONS, toInternalInterval } from './resolution';
import type {
  TradingViewDatafeed,
  TvBar,
  TvDatafeedConfiguration,
  TvErrorCallback,
  TvExchangeDatafeedOptions,
  TvLibrarySymbolInfo,
  TvResolvedSymbol,
  TvSearchSymbolResultItem,
} from './types';

const TV_SYMBOL_TYPE = 'futures';

const DATAFEED_CONFIG: TvDatafeedConfiguration = {
  supported_resolutions: TV_SUPPORTED_RESOLUTIONS,
  exchanges: [
    { value: 'BINANCE', name: 'BINANCE', desc: 'Binance USDM Perpetuals' },
    { value: 'HYPERLIQUID', name: 'HYPERLIQUID', desc: 'Hyperliquid Perpetuals' },
  ],
  symbols_types: [{ name: 'Futures', value: TV_SYMBOL_TYPE }],
};

type ActiveSubscription = {
  unsubscribe: () => void;
};

function getTvExchangeLabel(exchange: ExchangeType): 'BINANCE' | 'HYPERLIQUID' {
  return exchange === 'binance' ? 'BINANCE' : 'HYPERLIQUID';
}

function normalizeBinanceDisplaySymbol(coin: string): string {
  const up = coin.toUpperCase();
  return up.endsWith('USDT') ? up : `${up}USDT`;
}

function parseRawSymbolInput(raw: string): { exchangePrefix?: string; symbolPart: string } {
  const trimmed = raw.trim();
  const separatorIndex = trimmed.indexOf(':');
  if (separatorIndex === -1) {
    return { symbolPart: trimmed };
  }

  const exchangePrefix = trimmed.slice(0, separatorIndex).toUpperCase();
  const symbolPart = trimmed.slice(separatorIndex + 1);
  return { exchangePrefix, symbolPart };
}

function toInternalCoin(raw: string, exchange: ExchangeType): string {
  const cleaned = raw.trim().toUpperCase();
  if (exchange === 'binance') {
    if (cleaned.endsWith('USDT')) {
      return cleaned.slice(0, -4);
    }
    return cleaned;
  }

  return cleaned;
}

function buildTvSymbolInfo(exchange: ExchangeType, coin: string, tickSize: number, sizeDecimals: number): TvLibrarySymbolInfo {
  const exchangeLabel = getTvExchangeLabel(exchange);
  const displaySymbol = exchange === 'binance' ? normalizeBinanceDisplaySymbol(coin) : coin.toUpperCase();
  const fullName = `${exchangeLabel}:${displaySymbol}`;

  const safeTickSize = Number.isFinite(tickSize) && tickSize > 0 ? tickSize : 0.01;
  const priceScale = Math.max(1, Math.round(1 / safeTickSize));

  return {
    ticker: fullName,
    name: displaySymbol,
    description: `${displaySymbol} Perpetual`,
    type: TV_SYMBOL_TYPE,
    session: '24x7',
    timezone: 'Etc/UTC',
    exchange: exchangeLabel,
    listed_exchange: exchangeLabel,
    minmov: 1,
    pricescale: priceScale,
    has_intraday: true,
    has_weekly_and_monthly: true,
    has_daily: true,
    volume_precision: Math.max(0, sizeDecimals),
    supported_resolutions: TV_SUPPORTED_RESOLUTIONS,
    full_name: fullName,
  };
}

async function resolveTradingSymbol(
  service: ExchangeTradingService,
  exchange: ExchangeType,
  symbolName: string
): Promise<TvResolvedSymbol> {
  const parsed = parseRawSymbolInput(symbolName);
  const effectiveExchange: ExchangeType = parsed.exchangePrefix === 'BINANCE'
    ? 'binance'
    : parsed.exchangePrefix === 'HYPERLIQUID'
      ? 'hyperliquid'
      : exchange;

  const coin = toInternalCoin(parsed.symbolPart || symbolName, effectiveExchange);
  const displaySymbol = effectiveExchange === 'binance' ? normalizeBinanceDisplaySymbol(coin) : coin;
  const exchangeLabel = getTvExchangeLabel(effectiveExchange);

  return {
    coin,
    exchange: effectiveExchange,
    displaySymbol,
    fullName: `${exchangeLabel}:${displaySymbol}`,
    intervalDefaults: ['1m', '5m', '15m', '1h'],
  };
}

export class TradingViewExchangeDatafeed implements TradingViewDatafeed {
  private readonly service: ExchangeTradingService;
  private readonly exchange: ExchangeType;
  private readonly dexName?: string;
  private readonly subscribers = new Map<string, ActiveSubscription>();

  constructor(service: ExchangeTradingService, options: TvExchangeDatafeedOptions) {
    this.service = service;
    this.exchange = options.exchange;
    this.dexName = options.dexName;
  }

  onReady(callback: (configuration: TvDatafeedConfiguration) => void): void {
    setTimeout(() => callback(DATAFEED_CONFIG), 0);
  }

  async searchSymbols(
    userInput: string,
    exchange: string,
    _symbolType: string,
    onResultReadyCallback: (result: TvSearchSymbolResultItem[]) => void
  ): Promise<void> {
    try {
      const selectedExchange = exchange.toUpperCase();
      const exchangeFilter = selectedExchange === 'BINANCE'
        ? 'binance'
        : selectedExchange === 'HYPERLIQUID'
          ? 'hyperliquid'
          : this.exchange;

      const { meta } = await this.service.getMetaAndAssetCtxs(exchangeFilter === 'hyperliquid' ? this.dexName : undefined);
      const keyword = userInput.trim().toUpperCase();
      const exchangeLabel = getTvExchangeLabel(exchangeFilter);

      const results = meta.universe
        .filter((item) => !item.isDelisted)
        .map((item) => {
          const coin = item.name.toUpperCase();
          const symbol = exchangeFilter === 'binance' ? normalizeBinanceDisplaySymbol(coin) : coin;
          const fullName = `${exchangeLabel}:${symbol}`;
          return {
            symbol,
            full_name: fullName,
            description: `${symbol} Perpetual`,
            exchange: exchangeLabel,
            ticker: fullName,
            type: TV_SYMBOL_TYPE,
          } as TvSearchSymbolResultItem;
        })
        .filter((item) => {
          if (!keyword) return true;
          return item.symbol.includes(keyword) || item.full_name.includes(keyword);
        })
        .slice(0, 50);

      onResultReadyCallback(results);
    } catch {
      onResultReadyCallback([]);
    }
  }

  async resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: TvLibrarySymbolInfo) => void,
    onResolveErrorCallback: TvErrorCallback
  ): Promise<void> {
    try {
      const resolved = await resolveTradingSymbol(this.service, this.exchange, symbolName);
      const metadata = await this.service.resolveSymbolMetadata(resolved.coin);
      onSymbolResolvedCallback(
        buildTvSymbolInfo(resolved.exchange, resolved.coin, metadata.tickSize, metadata.sizeDecimals)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve symbol';
      onResolveErrorCallback(message);
    }
  }

  async getBars(
    symbolInfo: TvLibrarySymbolInfo,
    resolution: string,
    periodParams: { from: number; to: number; firstDataRequest: boolean },
    onHistoryCallback: (bars: TvBar[], meta: { noData: boolean }) => void,
    onErrorCallback: TvErrorCallback
  ): Promise<void> {
    try {
      const resolved = await resolveTradingSymbol(this.service, this.exchange, symbolInfo.ticker || symbolInfo.name);
      const interval = toInternalInterval(resolution);
      const fromMs = periodParams.from * 1000;
      const toMs = periodParams.to * 1000;

      const candles = await this.service.getCandles({
        coin: resolved.coin,
        interval,
        startTime: fromMs,
        endTime: toMs,
      });

      const bars: TvBar[] = candles
        .filter((c) => c.time >= fromMs && c.time <= toMs)
        .map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

      onHistoryCallback(bars, { noData: bars.length === 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load history';
      onErrorCallback(message);
    }
  }

  subscribeBars(
    symbolInfo: TvLibrarySymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: TvBar) => void,
    subscriberUID: string,
    _onResetCacheNeededCallback: () => void
  ): void {
    void (async () => {
      const resolved = await resolveTradingSymbol(this.service, this.exchange, symbolInfo.ticker || symbolInfo.name);
      const interval: TimeInterval = toInternalInterval(resolution);

      const { service: wsService, trackSubscription } = useWebSocketService(resolved.exchange);
      const release = trackSubscription();
      const subscriptionId = wsService.subscribeToCandles({ coin: resolved.coin, interval }, (candle) => {
        onRealtimeCallback({
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        });
      });

      this.subscribers.set(subscriberUID, {
        unsubscribe: () => {
          wsService.unsubscribe(subscriptionId);
          release();
        },
      });
    })().catch(() => {
      // Keep silent for widget lifecycle safety.
    });
  }

  unsubscribeBars(subscriberUID: string): void {
    const subscription = this.subscribers.get(subscriberUID);
    if (!subscription) {
      return;
    }

    subscription.unsubscribe();
    this.subscribers.delete(subscriberUID);
  }
}

export function createTradingViewExchangeDatafeed(
  service: ExchangeTradingService,
  options: TvExchangeDatafeedOptions
): TradingViewDatafeed {
  return new TradingViewExchangeDatafeed(service, options);
}
