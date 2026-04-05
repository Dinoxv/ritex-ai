import { create } from 'zustand';
import { HyperliquidService } from '@/lib/services/hyperliquid.service';
import { useDexStore } from './useDexStore';

export interface SymbolWithVolume {
  name: string;
  volume: number;
}

interface TopSymbolsStore {
  symbols: SymbolWithVolume[];
  isLoading: boolean;
  error: string | null;
  service: HyperliquidService | null;
  setService: (service: HyperliquidService) => void;
  fetchTopSymbols: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  updateFromGlobalPoll: (data: { meta: any; assetCtxs: any[] }) => void;
}

export const useTopSymbolsStore = create<TopSymbolsStore>((set, get) => ({
  symbols: [],
  isLoading: false,
  error: null,
  service: null,

  setService: (service: HyperliquidService) => {
    set({ service });
  },

  fetchTopSymbols: async () => {
    const { service } = get();
    if (!service) {
      console.warn('Service not initialized yet, skipping top symbols fetch');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { marketType, selectedDex } = useDexStore.getState();

      let symbolsWithVolume: SymbolWithVolume[];

      if (marketType === 'spot') {
        const { meta, assetCtxs } = await service.getSpotMetaAndAssetCtxs();
        symbolsWithVolume = meta.universe
          .map((pair: any, index: number) => ({
            name: pair.name as string,
            volume: parseFloat(assetCtxs[index]?.dayNtlVlm || '0'),
          }))
          .filter((s: SymbolWithVolume) => s.volume > 0)
          .sort((a: SymbolWithVolume, b: SymbolWithVolume) => b.volume - a.volume)
          .slice(0, 20)
          .map(({ name, volume }: SymbolWithVolume) => ({ name, volume }));
      } else {
        const { meta, assetCtxs } = await service.getMetaAndAssetCtxs(selectedDex);
        symbolsWithVolume = meta.universe
          .map((u, index) => ({
            name: u.name,
            volume: parseFloat(assetCtxs[index]?.dayNtlVlm || '0'),
            isDelisted: u.isDelisted,
          }))
          .filter((s) => !s.isDelisted)
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 20)
          .map(({ name, volume }) => ({ name, volume }));
      }

      set({ symbols: symbolsWithVolume, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  startAutoRefresh: () => {
    get().fetchTopSymbols();
  },

  stopAutoRefresh: () => {
  },

  updateFromGlobalPoll: (data: { meta: any; assetCtxs: any[] }) => {
    const { meta, assetCtxs } = data;

    const symbolsWithVolume: SymbolWithVolume[] = meta.universe
      .map((u: any, index: number) => ({
        name: u.name,
        volume: parseFloat(assetCtxs[index]?.dayNtlVlm || '0'),
        isDelisted: u.isDelisted,
      }))
      .filter((s: any) => !s.isDelisted)
      .sort((a: any, b: any) => b.volume - a.volume)
      .slice(0, 20)
      .map(({ name, volume }: any) => ({ name, volume }));

    set({ symbols: symbolsWithVolume });
  },
}));
