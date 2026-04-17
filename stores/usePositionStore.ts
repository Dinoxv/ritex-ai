import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Position } from '@/models/Position';
import type { ExchangeTradingService } from '@/lib/services/types';
import { getRawPositionSymbol, normalizeExchangePosition } from '@/lib/utils/exchange-normalizers';

interface PositionStore {
  positions: Record<string, Position | null>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  pollingIntervals: Record<string, NodeJS.Timeout>;
  batchPollingInterval: NodeJS.Timeout | null;
  batchPollingCoins: string[];
  service: ExchangeTradingService | null;

  setService: (service: ExchangeTradingService) => void;
  fetchPosition: (coin: string) => Promise<void>;
  fetchAllPositions: (coins?: string[]) => Promise<void>;
  fetchAndStoreAllOpenPositions: () => Promise<string[]>;
  subscribeToPosition: (coin: string) => void;
  unsubscribeFromPosition: (coin: string) => void;
  startPolling: (coin: string, interval: number) => void;
  stopPolling: (coin: string) => void;
  startPollingMultiple: (coins: string[], interval?: number) => void;
  stopPollingMultiple: (coins: string[]) => void;
  getPosition: (coin: string) => Position | null;
  updatePositionsFromGlobalPoll: (allPositions: any[]) => void;
}

export const usePositionStore = create<PositionStore>()(
  persist(
    (set, get) => ({
      positions: {},
      loading: {},
      errors: {},
      pollingIntervals: {},
      batchPollingInterval: null,
      batchPollingCoins: [],
      service: null,

      setService: (service: ExchangeTradingService) => {
        set({ service });
      },

      fetchPosition: async (coin: string) => {
        const { service } = get();
        if (!service) {
          console.warn('Service not initialized yet, skipping position fetch');
          return;
        }

        set((state) => ({
          loading: { ...state.loading, [coin]: true },
          errors: { ...state.errors, [coin]: null },
        }));

        try {
          const allPositions = await service.getOpenPositions();
          const rawPosition = allPositions.find((position) => getRawPositionSymbol(position) === coin);

          const position = rawPosition ? normalizeExchangePosition(rawPosition) : null;

          set((state) => ({
            positions: { ...state.positions, [coin]: position },
            loading: { ...state.loading, [coin]: false },
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          set((state) => ({
            loading: { ...state.loading, [coin]: false },
            errors: { ...state.errors, [coin]: errorMessage },
          }));
        }
      },

      fetchAllPositions: async (coins?: string[]) => {
        const { service } = get();
        if (!service) {
          console.warn('Service not initialized yet, skipping positions fetch');
          return;
        }

        const targetCoins = coins || get().batchPollingCoins;

        if (targetCoins.length === 0) return;

        const loadingState = targetCoins.reduce((acc, coin) => ({ ...acc, [coin]: true }), {});
        const errorState = targetCoins.reduce((acc, coin) => ({ ...acc, [coin]: null }), {});

        set((state) => ({
          loading: { ...state.loading, ...loadingState },
          errors: { ...state.errors, ...errorState },
        }));

        try {
          const allPositions = await service.getOpenPositions();

          const positionMap: Record<string, Position | null> = {};
          const positionLoadingState: Record<string, boolean> = {};

          targetCoins.forEach(coin => {
            const rawPosition = allPositions.find((position: any) => getRawPositionSymbol(position) === coin);
            positionMap[coin] = rawPosition ? normalizeExchangePosition(rawPosition) : null;
            positionLoadingState[coin] = false;
          });

          set((state) => ({
            positions: { ...state.positions, ...positionMap },
            loading: { ...state.loading, ...positionLoadingState },
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStateUpdate = targetCoins.reduce((acc, coin) => ({ ...acc, [coin]: errorMessage }), {});
          const loadingStateUpdate = targetCoins.reduce((acc, coin) => ({ ...acc, [coin]: false }), {});

          set((state) => ({
            loading: { ...state.loading, ...loadingStateUpdate },
            errors: { ...state.errors, ...errorStateUpdate },
          }));
        }
      },

      fetchAndStoreAllOpenPositions: async () => {
        const { service } = get();
        if (!service) {
          console.warn('Service not initialized yet, skipping open positions fetch');
          return [];
        }

        try {
          const allPositions = await service.getOpenPositions();
          const positionMap: Record<string, Position | null> = {};
          const symbols: string[] = [];

          allPositions.forEach((rawPosition: any) => {
            const position = normalizeExchangePosition(rawPosition);
            positionMap[position.symbol] = position;
            symbols.push(position.symbol);
          });

          set((state) => ({
            positions: { ...state.positions, ...positionMap },
          }));

          return symbols;
        } catch (error) {
          console.error('Failed to fetch open positions:', error);
          return [];
        }
      },

      startPolling: (coin: string, interval: number = 5000) => {
      },

      stopPolling: (coin: string) => {
      },

      subscribeToPosition: (coin: string) => {
      },

      unsubscribeFromPosition: (coin: string) => {
      },

      startPollingMultiple: (coins: string[], interval: number = 5000) => {
      },

      stopPollingMultiple: (coins: string[]) => {
      },

      getPosition: (coin: string) => {
        return get().positions[coin] || null;
      },

      updatePositionsFromGlobalPoll: (allPositions: any[]) => {
        const positionMap: Record<string, Position | null> = {};

        allPositions.forEach((rawPosition: any) => {
          const position = normalizeExchangePosition(rawPosition);
          positionMap[position.symbol] = position;
        });

        set({ positions: positionMap });
      },
    }),
    {
      name: 'hyperscalper-positions',
      partialize: (state) => ({ positions: state.positions }),
    }
  )
);
