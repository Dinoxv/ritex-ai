import { create } from 'zustand';
import type { CandleData, TimeInterval } from '@/types';
import type { ExchangeWebSocketService } from '@/lib/websocket/exchange-websocket.interface';
import { useWebSocketStatusStore } from '@/stores/useWebSocketStatusStore';
import { formatCandle } from '@/lib/format-utils';
import { MAX_CANDLES } from '@/lib/constants';
import type { ExchangeTradingService, TransformedCandle } from '@/lib/services/types';
import { downsampleCandles } from '@/lib/candle-utils';
import { INTERVAL_TO_MS } from '@/lib/time-utils';
import { useDexStore } from './useDexStore';

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
  fetchCandles: (coin: string, interval: TimeInterval, startTime: number, endTime: number) => Promise<void>;
  fetchOlderCandles: (coin: string, interval: TimeInterval) => Promise<boolean>;
  subscribeToCandles: (coin: string, interval: TimeInterval) => void;
  unsubscribeFromCandles: (coin: string, interval: TimeInterval) => void;
  clearCandles: (coin: string, interval?: TimeInterval) => void;
  cleanup: () => void;
  getCandlesSync: (coin: string, interval: TimeInterval) => TransformedCandle[] | null;
  getClosePrices: (coin: string, interval: TimeInterval, count: number) => number[] | null;
}

const getCandleKey = (coin: string, interval: string): string => `${coin}-${interval}`;

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
    set({ service });
  },

  setActiveSymbol: (coin: string | null) => {
    set({ activeSymbol: coin });
  },

  fetchCandles: async (coin, interval, startTime, endTime) => {
    const key = getCandleKey(coin, interval);
    const { loading, service } = get();

    if (!service) {
      return;
    }

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

      const formattedData = data.map((candle) => formatCandle(candle, coin));

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
    const key = getCandleKey(coin, interval);
    const { loadingOlder, service, candles } = get();

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

      const merged = [...newCandles, ...existing].sort((a, b) => (a.time as number) - (b.time as number));

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
    const key = getCandleKey(coin, interval);
    const { subscriptions } = get();

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
      const exchange = useDexStore.getState().selectedExchange;
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
    const key = getCandleKey(coin, interval);
    const { subscriptions, wsService } = get();

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
    const { candles, loading, errors } = get();
    const newCandles = { ...candles };
    const newLoading = { ...loading };
    const newErrors = { ...errors };

    if (interval) {
      const key = getCandleKey(coin, interval);
      delete newCandles[key];
      delete newLoading[key];
      delete newErrors[key];
    } else {
      const intervals: TimeInterval[] = ['1m', '5m', '15m', '1h'];
      intervals.forEach(int => {
        const key = getCandleKey(coin, int);
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
    const key = getCandleKey(coin, interval);
    const { candles } = get();
    const cachedCandles = candles[key];

    if (!cachedCandles || cachedCandles.length === 0) {
      return null;
    }

    return cachedCandles as TransformedCandle[];
  },

  getClosePrices: (coin, interval, count) => {
    const key = getCandleKey(coin, interval);
    const { candles } = get();
    const cachedCandles = candles[key];

    if (!cachedCandles || cachedCandles.length === 0) {
      return null;
    }

    const closePrices = downsampleCandles(cachedCandles as TransformedCandle[], count);
    return closePrices;
  },
}));
