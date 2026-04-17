import { create } from 'zustand';
import type { ExchangeWebSocketService } from '@/lib/websocket/exchange-websocket.interface';
import { useWebSocketStatusStore } from '@/stores/useWebSocketStatusStore';
import { useDexStore } from './useDexStore';
import { useWebSocketService } from '@/lib/websocket/websocket-singleton';

interface SidebarPricesStore {
  prices: Record<string, number>;
  externalPrices: Record<string, number>;
  isSubscribed: boolean;
  subscriptionId: string | null;
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
  wsService: null,

  subscribe: () => {
    const { isSubscribed } = get();

    if (isSubscribed) {
      return;
    }

    const exchange = useDexStore.getState().selectedExchange;
    const { service: wsService } = useWebSocketService(exchange);

    const subscriptionId = wsService.subscribeToAllMids((mids) => {
      // Merge WS mids with external (HIP-3 DEX) prices — WS doesn't include HIP-3 tokens
      const { externalPrices } = get();
      set({ prices: { ...externalPrices, ...mids } });
    });

    useWebSocketStatusStore.getState().setStreamSubscriptionCount('prices', 1);
    set({ isSubscribed: true, subscriptionId, wsService });
  },

  unsubscribe: () => {
    const { subscriptionId, wsService, isSubscribed } = get();

    if (!isSubscribed || !subscriptionId) {
      return;
    }

    if (!wsService) {
      set({ isSubscribed: false, subscriptionId: null, prices: {} });
      return;
    }

    wsService.unsubscribe(subscriptionId);
    useWebSocketStatusStore.getState().setStreamSubscriptionCount('prices', 0);
    set({ isSubscribed: false, subscriptionId: null, prices: {} });
  },

  getPrice: (coin: string) => {
    return get().prices[coin] || null;
  },

  mergeExternalPrices: (data: { meta: any; assetCtxs: any[] }) => {
    const { meta, assetCtxs } = data;
    const external: Record<string, number> = {};
    meta.universe.forEach((u: any, i: number) => {
      const px = parseFloat(assetCtxs[i]?.midPx || assetCtxs[i]?.markPx || '0');
      if (px > 0) external[u.name] = px;
    });
    set((state) => ({
      externalPrices: { ...state.externalPrices, ...external },
      prices: { ...state.prices, ...external },
    }));
  },
}));
