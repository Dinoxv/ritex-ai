import { create } from 'zustand';
import type { ExchangeTradingService } from '@/lib/services/types';

export interface SymbolMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
}

interface SymbolMetaStore {
  metadata: Record<string, SymbolMeta>;
  loading: boolean;
  error: string | null;
  service: ExchangeTradingService | null;
  setService: (service: ExchangeTradingService) => void;
  fetchMetadata: () => Promise<void>;
  getDecimals: (symbol: string) => { price: number; size: number };
}

const DEFAULT_PRICE_DECIMALS = 2;
const DEFAULT_SIZE_DECIMALS = 4;

export const useSymbolMetaStore = create<SymbolMetaStore>((set, get) => ({
  metadata: {},
  loading: false,
  error: null,
  service: null,

  setService: (service: ExchangeTradingService) => {
    set({ service });
  },

  fetchMetadata: async () => {
    const { service } = get();
    if (!service) {
      console.warn('Service not initialized yet, skipping metadata fetch');
      return;
    }

    set({ loading: true, error: null });

    try {
      // Fetch all perp DEX metadata (main + HIP-3 DEXes)
      const allMetas = await service.getAllPerpMetas();

      const metadata: Record<string, SymbolMeta> = {};
      allMetas.forEach((dexMeta: any) => {
        if (!dexMeta.universe || !Array.isArray(dexMeta.universe)) return;
        dexMeta.universe.forEach((symbol: SymbolMeta) => {
          metadata[symbol.name] = symbol;
        });
      });

      set({ metadata, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      });
    }
  },

  getDecimals: (symbol: string) => {
    const { metadata } = get();
    const symbolMeta = metadata[symbol];
    const sizeDecimals = symbolMeta?.szDecimals ?? DEFAULT_SIZE_DECIMALS;

    const priceDecimals = sizeDecimals === 0 ? 6 : Math.max(sizeDecimals, 2);

    return {
      price: priceDecimals,
      size: sizeDecimals,
    };
  },
}));
