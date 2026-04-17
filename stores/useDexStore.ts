import { create } from 'zustand';
import type { ExchangeTradingService, PerpDexInfo } from '@/lib/services/types';

export type MarketType = 'perp' | 'spot';
export type ExchangeType = 'hyperliquid' | 'binance';

interface DexStore {
  selectedExchange: ExchangeType;
  dexes: PerpDexInfo[];
  selectedDex: string | undefined; // undefined = main exchange, string = HIP-3 dex name
  marketType: MarketType;
  isLoading: boolean;
  error: string | null;
  service: ExchangeTradingService | null;
  setSelectedExchange: (exchange: ExchangeType) => void;
  setService: (service: ExchangeTradingService) => void;
  setSelectedDex: (dex: string | undefined) => void;
  setMarketType: (type: MarketType) => void;
  fetchDexes: () => Promise<void>;
}

export const useDexStore = create<DexStore>((set, get) => ({
  selectedExchange: 'hyperliquid',
  dexes: [],
  selectedDex: undefined,
  marketType: 'perp',
  isLoading: false,
  error: null,
  service: null,

  setSelectedExchange: (exchange: ExchangeType) => {
    set({
      selectedExchange: exchange,
      selectedDex: undefined,
      marketType: 'perp',
      dexes: exchange === 'hyperliquid' ? get().dexes : [],
    });
  },

  setService: (service: ExchangeTradingService) => {
    set({ service });
  },

  setSelectedDex: (dex: string | undefined) => {
    set({ selectedDex: dex });
  },

  setMarketType: (type: MarketType) => {
    set({ marketType: type });
  },

  fetchDexes: async () => {
    const { service, selectedExchange } = get();
    if (!service) return;

    if (selectedExchange !== 'hyperliquid') {
      set({ dexes: [], isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const rawDexes = await service.getPerpDexs();
      // Filter out null entries (main dex) - we only need HIP-3 dexes
      const dexes = rawDexes.filter((d): d is NonNullable<typeof d> => d !== null);
      set({ dexes, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch dexes',
        isLoading: false,
      });
    }
  },
}));
