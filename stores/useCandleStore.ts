import { create } from 'zustand';
import type { CandleData, TimeInterval } from '@/types';
import type { ExchangeWebSocketService } from '@/lib/websocket/exchange-websocket.interface';
import { useWebSocketStatusStore } from '@/stores/useWebSocketStatusStore';
import { formatCandle } from '@/lib/format-utils';
import { MAX_CANDLES } from '@/lib/constants';
import type { ExchangeTradingService, TransformedCandle } from '@/lib/services/types';
import { downsampleCandles } from '@/lib/candle-utils';
import { INTERVAL_TO_MS } from '@/lib/time-utils';

interface CandleStore {
  candles: Record<string, CandleData[]>;
  loading: Record<string, boolean>;
  loadingOlder: Record<string, boolean>;
  errors: Record<string, string | null>;
  subscriptions: Record<string, { subscriptionId: string; cleanup: () => void; refCount: number }>;
  wsService: ExchangeWebSocketService | null;
  service: ExchangeTradingService | null;
  activeSymbol: string | null;

  setService: (service: ExchangeTradingService) => void;
  setActiveSymbol: (coin: string | null) => void;
  getCandleKey: (coin: string, interval: TimeInterval) => string;
  selectCandles: (coin: string, interval: TimeInterval) => CandleData[];
  selectLoading: (coin: string, interval: TimeInterval) => boolean;
  fetchCandles: (coin: string, interval: TimeInterval, startTime: number, endTime: number) => Promise<void>;
  fetchOlderCandles: (coin: string, interval: TimeInterval) => Promise<boolean>;
  subscribeToCandles: (coin: string, interval: TimeInterval) => void;
  unsubscribeFromCandles: (coin: string, interval: TimeInterval) => void;
  clearCandles: (coin: string, interval?: TimeInterval) => void;
  cleanup: () => void;
  getCandlesSync: (coin: string, interval: TimeInterval) => TransformedCandle[] | null;
  getClosePrices: (coin: string, interval: TimeInterval, count: number) => number[] | null;
}

const EMPTY_CANDLES: CandleData[] = [];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeCandles = (candles: CandleData[]): CandleData[] => {
  if (candles.length <= 1) {
    return candles;
  }

  const sorted = candles
    .filter((candle) =>
      isFiniteNumber(candle.time) &&
      isFiniteNumber(candle.open) &&
      isFiniteNumber(candle.high) &&
      isFiniteNumber(candle.low) &&
      isFiniteNumber(candle.close) &&
      isFiniteNumber(candle.volume)
    )
    .sort((a, b) => (a.time as number) - (b.time as number));

  if (sorted.length <= 1) {
    return sorted;
  }

  const deduped = new Map<number, CandleData>();
  for (const candle of sorted) {
    deduped.set(candle.time as number, candle);
  }

  return Array.from(deduped.values());
};

const getExchangeScope = (service: ExchangeTradingService | null): string => {
  return service?.getExchangeKey() || 'unknown';
};

const getCandleKey = (coin: string, interval: string, exchangeScope: string): string => {
  return `${exchangeScope}:${coin}-${interval}`;
};

export const useCandleStore = create<CandleStore>((set, get) => ({
  candles: {},
  loading: {},
  loadingOlder: {},
  errors: {},
  subscriptions: {},
  wsService: null,
  service: null,
  activeSymbol: null,

  setService: (service: ExchangeTradingService) => {
    // Clean up all existing WS subscriptions before switching service.
    // If we don't do this, the old exchange's WS keeps sending candle updates
    // that overwrite the new exchange's REST-fetched candles (e.g., HL LAB at $0.93
    // would overwrite Binance LABUSDT at $2.50).
    const { subscriptions, wsService } = get();
    Object.values(subscriptions).forEach((sub) => {
      if (wsService) {
        try { wsService.unsubscribe(sub.subscriptionId); } catch { /* ignore */ }
      }
      try { sub.cleanup(); } catch { /* ignore */ }
    });

    set({
      service,
      subscriptions: {},
      candles: {},
      loading: {},
      loadingOlder: {},
      errors: {},
      wsService: null,
    });
  },

  setActiveSymbol: (coin: string | null) => {
    set({ activeSymbol: coin });
  },

  getCandleKey: (coin, interval) => {
    const exchangeScope = getExchangeScope(get().service);
    return getCandleKey(coin, interval, exchangeScope);
  },

  selectCandles: (coin, interval) => {
    const key = get().getCandleKey(coin, interval);
    return get().candles[key] || EMPTY_CANDLES;
  },

  selectLoading: (coin, interval) => {
    const key = get().getCandleKey(coin, interval);
    return get().loading[key] || false;
  },

  fetchCandles: async (coin, interval, startTime, endTime) => {
    const { loading, service } = get();

    if (!service) {
      return;
    }

    const key = getCandleKey(coin, interval, getExchangeScope(service));

    if (loading[key]) {
      return;
    }

    set((state) => ({
      loading: { ...state.loading, [key]: true },
      errors: { ...state.errors, [key]: null },
    }));

    try {
      const data = await service.getCandles({
        coin,
        interval,
        startTime,
        endTime,
      });

      const formattedData = normalizeCandles(data.map((candle) => formatCandle(candle, coin)));

      set((state) => ({
        candles: { ...state.candles, [key]: formattedData },
        loading: { ...state.loading, [key]: false },
      }));
    } catch (error) {
      set((state) => ({
        errors: { ...state.errors, [key]: error instanceof Error ? error.message : 'Unknown error' },
        loading: { ...state.loading, [key]: false },
      }));
    }
  },

  fetchOlderCandles: async (coin, interval) => {
    const { loadingOlder, service, candles } = get();
    const key = getCandleKey(coin, interval, getExchangeScope(service));

    if (!service || loadingOlder[key]) return false;

    const existing = candles[key];
    if (!existing || existing.length === 0) return false;

    const oldestTime = existing[0].time as number;
    const intervalMs = INTERVAL_TO_MS[interval];
    const batchSize = 500;
    const endTime = oldestTime; // already in ms
    const startTime = endTime - (batchSize * intervalMs);

    set((state) => ({
      loadingOlder: { ...state.loadingOlder, [key]: true },
    }));

    try {
      const data = await service.getCandles({
        coin,
        interval,
        startTime,
        endTime: endTime - 1,
      });

      if (data.length === 0) {
        set((state) => ({ loadingOlder: { ...state.loadingOlder, [key]: false } }));
        return false;
      }

      const formattedData = data.map((candle) => formatCandle(candle, coin));
      const existingTimes = new Set(existing.map(c => c.time));
      const newCandles = formattedData.filter(c => !existingTimes.has(c.time));

      if (newCandles.length === 0) {
        set((state) => ({ loadingOlder: { ...state.loadingOlder, [key]: false } }));
        return false;
      }

      const merged = normalizeCandles([...newCandles, ...existing]);

      set((state) => ({
        candles: { ...state.candles, [key]: merged },
        loadingOlder: { ...state.loadingOlder, [key]: false },
      }));

      return true;
    } catch (error) {
      set((state) => ({ loadingOlder: { ...state.loadingOlder, [key]: false } }));
      return false;
    }
  },

  subscribeToCandles: (coin, interval) => {
    const { subscriptions, service } = get();
    const key = getCandleKey(coin, interval, getExchangeScope(service));

    if (subscriptions[key]) {
      set((state) => ({
        subscriptions: {
          ...state.subscriptions,
          [key]: {
            ...state.subscriptions[key],
            refCount: state.subscriptions[key].refCount + 1
          }
        }
      }));
      return;
    }

    const initWebSocket = async () => {
      const { useWebSocketService } = await import('@/lib/websocket/websocket-singleton');

      // Derive WS exchange type from the current service, NOT from useDexStore.selectedExchange.
      // selectedExchange defaults to 'hyperliquid' even when the URL forces Binance via
      // routeForcesBinance (e.g. /binance-apikey/LAB/). Using selectedExchange would connect
      // to the Hyperliquid WebSocket instead of Binance, sending wrong candle prices.
      const currentService = get().service;
      const exchangeKey = currentService?.getExchangeKey() || '';
      const exchange = exchangeKey.startsWith('binance') ? 'binance' : 'hyperliquid';

      const { service, trackSubscription } = useWebSocketService(exchange);

      const cleanup = trackSubscription();

      const subscriptionId = service.subscribeToCandles(
        { coin, interval },
        (candle) => {
          const state = get();
          const existingCandles = state.candles[key] || [];
          const formattedCandle = formatCandle(candle, coin);

          if (existingCandles.length === 0) {
            set((state) => ({
              candles: { ...state.candles, [key]: [formattedCandle] },
            }));
            return;
          }

          const lastCandle = existingCandles[existingCandles.length - 1];

          if (candle.time === lastCandle.time) {
            const updatedCandles = existingCandles.slice();
            updatedCandles[updatedCandles.length - 1] = formattedCandle;

            set((state) => ({
              candles: { ...state.candles, [key]: updatedCandles },
            }));
          } else if (candle.time > lastCandle.time) {
            const updatedCandles = [...existingCandles, formattedCandle];
            const limitedCandles = updatedCandles.length > MAX_CANDLES
              ? updatedCandles.slice(-MAX_CANDLES)
              : updatedCandles;

            set((state) => ({
              candles: { ...state.candles, [key]: limitedCandles },
            }));
          }
        }
      );

      set((state) => {
        const newSubscriptions = {
          ...state.subscriptions,
          [key]: { subscriptionId, cleanup, refCount: 1 }
        };
        const subscriptionCount = Object.keys(newSubscriptions).length;
        useWebSocketStatusStore.getState().setStreamSubscriptionCount('candles', subscriptionCount);

        return {
          wsService: service,
          subscriptions: newSubscriptions,
        };
      });
    };

    initWebSocket();
  },

  unsubscribeFromCandles: (coin, interval) => {
    const { subscriptions, wsService, service } = get();
    const key = getCandleKey(coin, interval, getExchangeScope(service));

    const subscription = subscriptions[key];
    if (!subscription) {
      return;
    }

    const newRefCount = subscription.refCount - 1;

    if (newRefCount > 0) {
      set((state) => ({
        subscriptions: {
          ...state.subscriptions,
          [key]: {
            ...state.subscriptions[key],
            refCount: newRefCount
          }
        }
      }));
      return;
    }

    if (wsService) {
      wsService.unsubscribe(subscription.subscriptionId);
    }
    subscription.cleanup();

    const newSubscriptions = { ...subscriptions };
    delete newSubscriptions[key];
    const subscriptionCount = Object.keys(newSubscriptions).length;
    useWebSocketStatusStore.getState().setStreamSubscriptionCount('candles', subscriptionCount);

    set({ subscriptions: newSubscriptions });
  },

  clearCandles: (coin, interval?) => {
    const { candles, loading, errors, service } = get();
    const newCandles = { ...candles };
    const newLoading = { ...loading };
    const newErrors = { ...errors };
    const exchangeScope = getExchangeScope(service);

    if (interval) {
      const key = getCandleKey(coin, interval, exchangeScope);
      delete newCandles[key];
      delete newLoading[key];
      delete newErrors[key];
    } else {
      const intervals: TimeInterval[] = ['1m', '5m', '15m', '1h'];
      intervals.forEach(int => {
        const key = getCandleKey(coin, int, exchangeScope);
        delete newCandles[key];
        delete newLoading[key];
        delete newErrors[key];
      });
    }

    set({
      candles: newCandles,
      loading: newLoading,
      errors: newErrors,
    });
  },

  cleanup: () => {
    const { subscriptions, wsService } = get();

    Object.entries(subscriptions).forEach(([key, subscription]) => {
      if (wsService) {
        wsService.unsubscribe(subscription.subscriptionId);
      }
      subscription.cleanup();
    });

    set({
      subscriptions: {},
      wsService: null,
    });
  },

  getCandlesSync: (coin, interval) => {
    const { candles, service } = get();
    const key = getCandleKey(coin, interval, getExchangeScope(service));
    const cachedCandles = candles[key];

    if (!cachedCandles || cachedCandles.length === 0) {
      return null;
    }

    return cachedCandles as TransformedCandle[];
  },

  getClosePrices: (coin, interval, count) => {
    const { candles, service } = get();
    const key = getCandleKey(coin, interval, getExchangeScope(service));
    const cachedCandles = candles[key];

    if (!cachedCandles || cachedCandles.length === 0) {
      return null;
    }

    const closePrices = downsampleCandles(cachedCandles as TransformedCandle[], count);
    return closePrices;
  },
}));
