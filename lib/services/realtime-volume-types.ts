// Realtime Volume Trigger Engine — Type Definitions
// Compatible with Hyperliquid & Binance Futures via ExchangeWebSocketService

export interface TradeRingEntry {
  time: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

export interface WindowSnapshot {
  timestamp: number;
  vol_3s: number;
  vol_5s: number;
  vol_10s: number;
  vol_30s: number;
  notional_5s: number;     // sum(price × size) over 5s window
  buy_ratio: number;       // buyVol / totalVol in 5s window
  tradeCount: number;      // raw trade count in 5s window
}

export interface VolumeBaseline {
  ewma_vol_5s: number;     // EWMA over last N snapshots
  ewma_vol_10s: number;
  ewma_notional: number;
  sampleCount: number;     // how many snapshots we have seen
  updatedAt: number;
}

export interface VolumeTrigger {
  symbol: string;
  exchange: 'hyperliquid' | 'binance';
  detectedAt: number;
  expiresAt: number;
  ratio: number;            // current vol_5s / ewma_vol_5s
  window: WindowSnapshot;
  side: 'buy' | 'sell' | 'both';
}

export interface RealtimeVolumeConfig {
  flushIntervalMs: number;       // default: 250
  windowSizes: number[];         // default: [3000, 5000, 10000, 30000]
  baselineSamples: number;       // default: 20 — EWMA lookback
  spikeRatioThreshold: number;   // default: 2.5 — ratio to fire trigger
  triggerTtlMs: number;          // default: 10000 — trigger lifespan
  maxSymbols: number;            // default: 30 — cap concurrent subscriptions
  ringBufferMs: number;          // default: 35000 — oldest trade to keep in memory
}

export const DEFAULT_REALTIME_VOLUME_CONFIG: RealtimeVolumeConfig = {
  flushIntervalMs: 250,
  windowSizes: [3000, 5000, 10000, 30000],
  baselineSamples: 20,
  spikeRatioThreshold: 2.5,
  triggerTtlMs: 10000,
  maxSymbols: 30,
  ringBufferMs: 35000,
};
