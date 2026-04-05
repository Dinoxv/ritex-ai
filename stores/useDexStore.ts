import { create } from 'zustand';
import { HyperliquidService } from '@/lib/services/hyperliquid.service';
import type { PerpDexInfo } from '@/lib/services/types';

export type MarketType = 'perp' | 'spot';

interface DexStore {
  dexes: PerpDexInfo[];
  selectedDex: string | undefined; // undefined = main exchange, string = HIP-3 dex name
  marketType: MarketType;
  isLoading: boolean;
  error: string | null;
  service: HyperliquidService | null;
  setService: (service: HyperliquidService) => void;
  setSelectedDex: (dex: string | undefined) => void;
  setMarketType: (type: MarketType) => void;
  fetchDexes: () => Promise<void>;
}

export const useDexStore = create<DexStore>((set, get) => ({
  dexes: [],
  selectedDex: undefined,
  marketType: 'perp',
  isLoading: false,
  error: null,
  service: null,

  setService: (service: HyperliquidService) => {
    set({ service });
  },

  setSelectedDex: (dex: string | undefined) => {
    set({ selectedDex: dex });
  },

  setMarketType: (type: MarketType) => {
    set({ marketType: type });
  },

  fetchDexes: async () => {
    const { service } = get();
    if (!service) return;

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
