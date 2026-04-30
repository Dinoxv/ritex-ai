import { create } from 'zustand';
import type { ExchangeTradingService } from '@/lib/services/types';
import { useOrderStore } from './useOrderStore';
import { usePositionStore } from './usePositionStore';
import { useSymbolVolatilityStore } from './useSymbolVolatilityStore';
import { useTopSymbolsStore } from './useTopSymbolsStore';
import { useCandleStore } from './useCandleStore';
import { useDexStore } from './useDexStore';
import { useSidebarPricesStore } from './useSidebarPricesStore';
import { useSettingsStore } from './useSettingsStore';

interface GlobalPollingStore {
  service: ExchangeTradingService | null;
  fastPollingInterval: NodeJS.Timeout | null;
  slowPollingInterval: NodeJS.Timeout | null;
  candlePollingInterval: NodeJS.Timeout | null;
  isPolling: boolean;
  lastFastPollTime: number | null;
  lastSlowPollTime: number | null;
  lastCandlePollTime: number | null;
  isFirstCandleFetch: boolean;
  restCooldownUntil: number;

  setService: (service: ExchangeTradingService) => void;
  startGlobalPolling: () => void;
  stopGlobalPolling: () => void;
  fetchFastData: () => Promise<void>;
  fetchSlowData: () => Promise<void>;
  fetchCandleData: () => Promise<void>;
}

export const useGlobalPollingStore = create<GlobalPollingStore>((set, get) => ({
  service: null,
  fastPollingInterval: null,
  slowPollingInterval: null,
  candlePollingInterval: null,
  isPolling: false,
  lastFastPollTime: null,
  lastSlowPollTime: null,
  lastCandlePollTime: null,
  isFirstCandleFetch: true,
  restCooldownUntil: 0,

  

  setService: (service: ExchangeTradingService) => {
    console.log('[GlobalPolling] setService called, starting global polling');
    set({ service });
    useDexStore.getState().setService(service);
    useDexStore.getState().fetchDexes();
    get().startGlobalPolling();
  },

  fetchFastData: async () => {
    const { service } = get();
    if (!service) {
      return;
    }

    if (Date.now() < get().restCooldownUntil) {
      return;
    }

    try {
      const [ordersData, positionsData] = await Promise.all([
        service.getOpenOrders().catch(err => {
          console.error('[GlobalPolling] Error fetching orders:', err);
          return [];
        }),
        service.getOpenPositions().catch(err => {
          console.error('[GlobalPolling] Error fetching positions:', err);
          return [];
        }),
      ]);

      const orderStore = useOrderStore.getState();
      const positionStore = usePositionStore.getState();

      if (ordersData) {
        orderStore.updateOrdersFromGlobalPoll(ordersData);
      }

      if (positionsData) {
        positionStore.updatePositionsFromGlobalPoll(positionsData);
      }

      set({ lastFastPollTime: Date.now() });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Binance API lỗi (418)') || msg.includes('code":-1003') || msg.includes('cooldown')) {
        set({ restCooldownUntil: Date.now() + 60_000 });
      }
      console.error('[GlobalPolling] Error in fetchFastData:', error);
    }
  },

  fetchSlowData: async () => {
    const { service } = get();
    if (!service) {
      return;
    }

    if (Date.now() < get().restCooldownUntil) {
      return;
    }

    try {
      const topSymbolsStore = useTopSymbolsStore.getState();
      const symbolsBeforeUpdate = topSymbolsStore.symbols.length;
      const { selectedDex, marketType } = useDexStore.getState();

      if (marketType === 'spot') {
        // For spot, fetch via top symbols store directly
        await topSymbolsStore.fetchTopSymbols();
      } else {
        const metaData = await service.getMetaAndAssetCtxs(selectedDex).catch(err => {
          console.error('[GlobalPolling] Error fetching meta:', err);
          return null;
        });

        if (metaData) {
          const volatilityStore = useSymbolVolatilityStore.getState();

          volatilityStore.updateFromGlobalPoll(metaData);
          topSymbolsStore.updateFromGlobalPoll(metaData);

          // Merge HIP-3 DEX prices into sidebar (allMids WS doesn't include them)
          if (selectedDex) {
            useSidebarPricesStore.getState().mergeExternalPrices(metaData);
          }
        }
      }

      const symbolsAfterUpdate = topSymbolsStore.symbols.length;
      if (symbolsBeforeUpdate === 0 && symbolsAfterUpdate > 0) {
        console.log('[GlobalPolling] Top symbols just loaded, triggering immediate candle fetch');
        get().fetchCandleData();
      }

      set({ lastSlowPollTime: Date.now() });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Binance API lỗi (418)') || msg.includes('code":-1003') || msg.includes('cooldown')) {
        set({ restCooldownUntil: Date.now() + 60_000 });
      }
      console.error('[GlobalPolling] Error in fetchSlowData:', error);
    }
  },

  fetchCandleData: async () => {
    const { service, isFirstCandleFetch } = get();
    if (!service) {
      console.log('[GlobalPolling] fetchCandleData: no service, skipping');
      return;
    }

    if (Date.now() < get().restCooldownUntil) {
      return;
    }

    try {
      const candleStore = useCandleStore.getState();
      const topSymbolsStore = useTopSymbolsStore.getState();
      const settings = useSettingsStore.getState().settings;
      const selectedExchange = useDexStore.getState().selectedExchange;
      const runtimeTopMarkets = settings?.scanner?.runtimeByExchange?.[selectedExchange]?.topMarkets;
      const topCount = runtimeTopMarkets ?? settings?.scanner?.topMarkets ?? 50;
      const effectiveTopCount = selectedExchange === 'binance' ? Math.min(topCount, 12) : topCount;
      const topSymbols = topSymbolsStore.symbols.slice(0, effectiveTopCount);

      if (topSymbols.length === 0) {
        console.log('[GlobalPolling] fetchCandleData: no symbols loaded yet, skipping');
        return;
      }

      console.log(`[GlobalPolling] fetchCandleData: fetching for ${topSymbols.length} symbols`);

      const staggerDelay = selectedExchange === 'binance' ? 450 : 200;
      let index = 0;

      for (const symbol of topSymbols) {
        const symbolName = symbol.name;

        if (candleStore.activeSymbol === symbolName) {
          console.log(`[GlobalPolling] Skipping active symbol: ${symbolName}`);
          continue;
        }

        const existingCandles = candleStore.candles[`${symbolName}-1m`];
        const hasData = existingCandles && existingCandles.length >= 10;

        const endTime = Date.now();
        let startTime: number;

        if (isFirstCandleFetch) {
          startTime = endTime - (1200 * 60 * 1000);
        } else if (hasData) {
          startTime = endTime - (10 * 60 * 1000);
        } else {
          startTime = endTime - (1200 * 60 * 1000);
        }

        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, staggerDelay));
        }

        candleStore.fetchCandles(symbolName, '1m', startTime, endTime).catch(err => {
          console.error(`[GlobalPolling] Error fetching candles for ${symbolName}:`, err);
        });

        index++;
      }

      console.log('[GlobalPolling] fetchCandleData: completed, updating lastCandlePollTime');
      set({
        lastCandlePollTime: Date.now(),
        isFirstCandleFetch: false
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Binance API lỗi (418)') || msg.includes('code":-1003') || msg.includes('cooldown')) {
        set({ restCooldownUntil: Date.now() + 60_000 });
      }
      console.error('[GlobalPolling] Error in fetchCandleData:', error);
    }
  },

  startGlobalPolling: () => {
    const { fastPollingInterval, slowPollingInterval, candlePollingInterval, fetchFastData, fetchSlowData, fetchCandleData } = get();
    const selectedExchange = useDexStore.getState().selectedExchange;

    if (fastPollingInterval || slowPollingInterval || candlePollingInterval) {
      console.log('[GlobalPolling] startGlobalPolling: already running, skipping');
      return;
    }

    console.log('[GlobalPolling] startGlobalPolling: starting all polling intervals');
    fetchFastData();
    fetchSlowData();
    fetchCandleData();

    const fastIntervalMs = selectedExchange === 'binance' ? 12_000 : 5_000;
    const slowIntervalMs = selectedExchange === 'binance' ? 90_000 : 60_000;
    const candleIntervalMs = selectedExchange === 'binance' ? 180_000 : 60_000;

    const fastIntervalId = setInterval(() => {
      fetchFastData();
    }, fastIntervalMs);

    const slowIntervalId = setInterval(() => {
      fetchSlowData();
    }, slowIntervalMs);

    const candleIntervalId = setInterval(() => {
      fetchCandleData();
    }, candleIntervalMs);

    set({
      fastPollingInterval: fastIntervalId,
      slowPollingInterval: slowIntervalId,
      candlePollingInterval: candleIntervalId,
      isPolling: true
    });
    console.log('[GlobalPolling] startGlobalPolling: all intervals started');
  },

  stopGlobalPolling: () => {
    const { fastPollingInterval, slowPollingInterval, candlePollingInterval } = get();

    if (fastPollingInterval) {
      clearInterval(fastPollingInterval);
    }

    if (slowPollingInterval) {
      clearInterval(slowPollingInterval);
    }

    if (candlePollingInterval) {
      clearInterval(candlePollingInterval);
    }

    set({
      fastPollingInterval: null,
      slowPollingInterval: null,
      candlePollingInterval: null,
      isPolling: false
    });
  },
}));

if (typeof window !== 'undefined') {
  const cleanup = () => {
    const { stopGlobalPolling } = useGlobalPollingStore.getState();
    stopGlobalPolling();
  };

  window.addEventListener('beforeunload', cleanup);
}
