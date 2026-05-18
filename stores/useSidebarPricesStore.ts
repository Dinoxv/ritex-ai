import { create } from 'zustand';
import type { ExchangeWebSocketService } from '@/lib/websocket/exchange-websocket.interface';
import { useWebSocketStatusStore } from '@/stores/useWebSocketStatusStore';
import { useCandleStore } from './useCandleStore';
import { useWebSocketService } from '@/lib/websocket/websocket-singleton';

interface SidebarPricesStore {
  prices: Record<string, number>;
  externalPrices: Record<string, number>;
  isSubscribed: boolean;
  subscriptionId: string | null;
  subscribedExchange: 'hyperliquid' | 'binance';
  wsService: ExchangeWebSocketService | null;

  subscribe: () => void;
  unsubscribe: () => void;
  getPrice: (coin: string) => number | null;
  mergeExternalPrices: (data: { meta: any; assetCtxs: any[] }) => void;
}

export const useSidebarPricesStore = create<SidebarPricesStore>((set, get) => ({
  prices: {},
  externalPrices: {},
  isSubscribed: false,
  subscriptionId: null,
  subscribedExchange: 'hyperliquid',
  wsService: null,

  subscribe: () => {
    const { isSubscribed, subscribedExchange } = get();
    const currentService = useCandleStore.getState().service;
    const exchangeKey = currentService?.getExchangeKey() || '';
    const exchange: 'hyperliquid' | 'binance' = exchangeKey.startsWith('binance') ? 'binance' : 'hyperliquid';

    if (isSubscribed && subscribedExchange === exchange) {
      return;
    }

    if (isSubscribed) {
      get().unsubscribe();
    }

    const { service: wsService } = useWebSocketService(exchange);

    const subscriptionId = wsService.subscribeToAllMids((mids) => {
      // Merge WS mids with external (HIP-3 DEX) prices — WS doesn't include HIP-3 tokens
      const { externalPrices } = get();
      set({ prices: { ...externalPrices, ...mids } });
    });

    useWebSocketStatusStore.getState().setStreamSubscriptionCount('prices', 1);
    set({ isSubscribed: true, subscriptionId, wsService, subscribedExchange: exchange });
  },

  unsubscribe: () => {
    const { subscriptionId, wsService, isSubscribed } = get();

    if (!isSubscribed || !subscriptionId) {
      return;
    }

    if (!wsService) {
      set({ isSubscribed: false, subscriptionId: null, prices: {}, subscribedExchange: 'hyperliquid' });
      return;
    }

    wsService.unsubscribe(subscriptionId);
    useWebSocketStatusStore.getState().setStreamSubscriptionCount('prices', 0);
    set({ isSubscribed: false, subscriptionId: null, prices: {}, subscribedExchange: 'hyperliquid' });
  },

  getPrice: (coin: string) => {
    return get().prices[coin] || null;
  },

  mergeExternalPrices: (data: { meta: any; assetCtxs: any[] }) => {
    const { meta, assetCtxs } = data;
    const external: Record<string, number> = {};
    meta.universe.forEach((u: any, i: number) => {
      // Prefer markPx (futures mark price) over midPx (last trade price) for accuracy
      const px = parseFloat(assetCtxs[i]?.markPx || assetCtxs[i]?.midPx || '0');
      if (px > 0) external[u.name] = px;
    });
    set((state) => ({
      externalPrices: { ...state.externalPrices, ...external },
      prices: { ...state.prices, ...external },
    }));
  },
}));
