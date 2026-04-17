import { create } from 'zustand';
import type { ExchangeTradingService } from '@/lib/services/types';
import { downsampleCandles } from '@/lib/candle-utils';
import { useCandleStore } from './useCandleStore';

interface SymbolCandlesStore {
  closePrices: Record<string, number[]>;
  service: ExchangeTradingService | null;
  setService: (service: ExchangeTradingService) => void;
  fetchClosePrices: (symbols: string[]) => Promise<void>;
  getClosePrices: (symbol: string) => number[] | null;
}

export const useSymbolCandlesStore = create<SymbolCandlesStore>((set, get) => ({
  closePrices: {},
  service: null,

  setService: (service: ExchangeTradingService) => {
    set({ service });
  },

  fetchClosePrices: async (symbols: string[]) => {
    const candleStore = useCandleStore.getState();
    const newClosePrices: Record<string, number[]> = {};

    symbols.forEach((symbol) => {
      const cachedClosePrices = candleStore.getClosePrices(symbol, '1m', 100);
      if (cachedClosePrices && cachedClosePrices.length > 0) {
        newClosePrices[symbol] = cachedClosePrices;
      }
    });

    set({ closePrices: newClosePrices });
  },

  getClosePrices: (symbol: string) => {
    return get().closePrices[symbol] || null;
  },
}));
