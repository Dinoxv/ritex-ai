import { create } from 'zustand';
import { RealtimeVolumeEngine } from '@/lib/services/realtime-volume-engine';
import {
  type VolumeTrigger,
  type WindowSnapshot,
  type RealtimeVolumeConfig,
  DEFAULT_REALTIME_VOLUME_CONFIG,
} from '@/lib/services/realtime-volume-types';

interface RealtimeVolumeState {
  engine: RealtimeVolumeEngine | null;
  exchange: 'hyperliquid' | 'binance' | null;
  activeTriggers: Map<string, VolumeTrigger>;   // key: symbol
  latestWindows: Map<string, WindowSnapshot>;    // key: symbol
  config: RealtimeVolumeConfig;
  pruneIntervalId: ReturnType<typeof setInterval> | null;

  // Actions
  initEngine: (exchange: 'hyperliquid' | 'binance') => Promise<void>;
  subscribeSymbols: (symbols: string[]) => void;
  unsubscribeSymbols: (symbols: string[]) => void;
  destroyEngine: () => void;
  getTrigger: (symbol: string) => VolumeTrigger | null;
  hasTrigger: (symbol: string) => boolean;
  updateConfig: (partial: Partial<RealtimeVolumeConfig>) => void;
  pruneExpiredTriggers: () => void;
}

export const useRealtimeVolumeStore = create<RealtimeVolumeState>((set, get) => ({
  engine: null,
  exchange: null,
  activeTriggers: new Map(),
  latestWindows: new Map(),
  config: { ...DEFAULT_REALTIME_VOLUME_CONFIG },
  pruneIntervalId: null,

  initEngine: async (exchange) => {
    const { engine: existing, pruneIntervalId } = get();
    // Destroy previous engine if exchange changed
    if (existing) {
      existing.unsubscribeAll();
      if (pruneIntervalId) clearInterval(pruneIntervalId);
    }

    const { useWebSocketService } = await import('@/lib/websocket/websocket-singleton');
    const { service, trackSubscription } = useWebSocketService(exchange);
    // Track subscription lifecycle on the shared WS manager
    const releaseTrack = trackSubscription();

    const config = get().config;

    const engine = new RealtimeVolumeEngine(
      service,
      exchange,
      config,
      // onTrigger
      (trigger) => {
        set((state) => {
          const next = new Map(state.activeTriggers);
          next.set(trigger.symbol, trigger);
          return { activeTriggers: next };
        });
      },
      // onSnapshot
      (symbol, snap) => {
        set((state) => {
          const next = new Map(state.latestWindows);
          next.set(symbol, snap);
          return { latestWindows: next };
        });
      }
    );

    // Attach cleanup on unsubscribeAll
    const originalDestroy = engine.unsubscribeAll.bind(engine);
    (engine as RealtimeVolumeEngine & { _releaseTrack?: () => void })._releaseTrack = releaseTrack;

    const newPruneId = setInterval(() => {
      get().pruneExpiredTriggers();
    }, 2000);

    set({ engine, exchange, pruneIntervalId: newPruneId });
  },

  subscribeSymbols: (symbols) => {
    const { engine, config } = get();
    if (!engine) {
      console.warn('[RealtimeVolumeStore] engine not initialised — call initEngine() first');
      return;
    }
    const capped = symbols.slice(0, config.maxSymbols);
    engine.subscribe(capped);
  },

  unsubscribeSymbols: (symbols) => {
    const { engine } = get();
    engine?.unsubscribe(symbols);
  },

  destroyEngine: () => {
    const { engine, pruneIntervalId } = get();
    if (engine) {
      engine.unsubscribeAll();
      // Release WS manager ref if we stored it
      const e = engine as RealtimeVolumeEngine & { _releaseTrack?: () => void };
      e._releaseTrack?.();
    }
    if (pruneIntervalId) clearInterval(pruneIntervalId);
    set({
      engine: null,
      exchange: null,
      activeTriggers: new Map(),
      latestWindows: new Map(),
      pruneIntervalId: null,
    });
  },

  getTrigger: (symbol) => {
    return get().activeTriggers.get(symbol) ?? null;
  },

  hasTrigger: (symbol) => {
    const trigger = get().activeTriggers.get(symbol);
    if (!trigger) return false;
    return trigger.expiresAt > Date.now();
  },

  updateConfig: (partial) => {
    const newConfig = { ...get().config, ...partial };
    get().engine?.updateConfig(partial);
    set({ config: newConfig });
  },

  pruneExpiredTriggers: () => {
    const { activeTriggers } = get();
    const now = Date.now();
    let dirty = false;
    const next = new Map(activeTriggers);
    for (const [sym, trigger] of next) {
      if (trigger.expiresAt <= now) {
        next.delete(sym);
        dirty = true;
      }
    }
    if (dirty) set({ activeTriggers: next });
  },
}));
