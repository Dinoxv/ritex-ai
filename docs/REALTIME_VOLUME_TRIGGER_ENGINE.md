# Realtime Volume Trigger Engine — Technical Spec

**Version**: 1.0  
**Date**: 2026-04-17  
**Scope**: hyperscalper — compatible with Hyperliquid & Binance Futures

---

## 1. Problem Statement

`ScannerService.scanVolumeSpike()` hiện tại đọc từ candle 1m/5m — freshness bị giới hạn bởi thời điểm candle đóng. Không thể phát hiện spike xảy ra *giữa* candle.

**Mục tiêu**: detect volume spike tick-by-tick bằng cách đọc trực tiếp từ WebSocket trade stream của cả hai sàn, gộp qua rolling window, so với EWMA baseline, và emit trigger ngay trong vòng 250–500ms.

---

## 2. Architecture Overview

```
WebSocket Trade Stream (Hyper | Binance)
          │
          ▼
  ┌───────────────────┐
  │   TradeBuffer     │  per symbol — batches pending trades
  │   (250ms flush)   │
  └─────────┬─────────┘
            │ flush
            ▼
  ┌───────────────────┐
  │  RollingWindow    │  vol_3s / vol_5s / vol_10s / vol_30s
  │  Calculator       │  notional / buy_ratio / sell_ratio
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │  EWMA Baseline    │  last 20 window snapshots per symbol
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │  Trigger Engine   │  ratio >= threshold → ActiveTrigger
  │  + TTL Manager    │  TTL 5–15s, refresh on continuation
  └─────────┬─────────┘
            │
            ▼
  useRealtimeVolumeStore  →  useScannerStore (signal source)
```

---

## 3. Data Types

```typescript
// File: lib/services/realtime-volume-engine.ts

export interface TradeBuffer {
  pending: TradeData[];
  flushTimer: ReturnType<typeof setTimeout> | null;
}

export interface WindowSnapshot {
  timestamp: number;
  vol_3s: number;
  vol_5s: number;
  vol_10s: number;
  vol_30s: number;
  notional_5s: number;      // size × price sum
  buy_ratio: number;        // buyVol / totalVol
  tradeCount: number;
}

export interface VolumeBaseline {
  ewma_vol_5s: number;      // EWMA over last 20 snapshots
  ewma_vol_10s: number;
  ewma_notional: number;
  updatedAt: number;
}

export interface VolumeTrigger {
  symbol: string;
  exchange: 'hyperliquid' | 'binance';
  detectedAt: number;
  expiresAt: number;
  ratio: number;            // current / baseline
  window: WindowSnapshot;
  side: 'buy' | 'sell' | 'both';
}

export interface RealtimeVolumeConfig {
  flushIntervalMs: number;  // default: 250
  windowSizes: number[];    // default: [3000, 5000, 10000, 30000]
  baselineSamples: number;  // default: 20
  spikeRatioThreshold: number; // default: 2.5
  triggerTtlMs: number;     // default: 10000
  maxSymbols: number;       // default: 30
}
```

---

## 4. Core Engine

### 4.1 RealtimeVolumeEngine class

```typescript
// lib/services/realtime-volume-engine.ts

export class RealtimeVolumeEngine {
  private buffers = new Map<string, TradeBuffer>();
  private history = new Map<string, WindowSnapshot[]>(); // last N snapshots
  private baselines = new Map<string, VolumeBaseline>();
  private config: RealtimeVolumeConfig;
  private wsService: ExchangeWebSocketService;
  private onTrigger: (t: VolumeTrigger) => void;
  private exchange: 'hyperliquid' | 'binance';

  constructor(
    wsService: ExchangeWebSocketService,
    exchange: 'hyperliquid' | 'binance',
    config: Partial<RealtimeVolumeConfig>,
    onTrigger: (t: VolumeTrigger) => void
  ) { ... }

  subscribe(symbols: string[]): void {
    for (const sym of symbols) {
      this.initBuffer(sym);
      this.wsService.subscribeToTrades(sym, (trades) => {
        this.ingestTrades(sym, trades);
      });
    }
  }

  unsubscribe(symbols: string[]): void { ... }

  private ingestTrades(symbol: string, trades: TradeData[]): void {
    const buf = this.buffers.get(symbol)!;
    buf.pending.push(...trades);
    if (!buf.flushTimer) {
      buf.flushTimer = setTimeout(() => {
        this.flush(symbol);
      }, this.config.flushIntervalMs);
    }
  }

  private flush(symbol: string): void {
    const buf = this.buffers.get(symbol)!;
    buf.flushTimer = null;
    const trades = buf.pending.splice(0);
    if (!trades.length) return;

    const snapshot = this.computeWindow(symbol, trades);
    this.updateBaseline(symbol, snapshot);
    this.evaluateTrigger(symbol, snapshot);
  }

  private computeWindow(symbol: string, trades: TradeData[]): WindowSnapshot {
    const now = Date.now();
    const allHistory = this.getAllRecentTrades(symbol); // merge new + ring buffer
    // Filter by window size, sum volume/notional, compute buy_ratio
    ...
  }

  private updateBaseline(symbol: string, snapshot: WindowSnapshot): void {
    // EWMA: new_ewma = alpha * current + (1-alpha) * old_ewma
    const alpha = 2 / (this.config.baselineSamples + 1);
    ...
  }

  private evaluateTrigger(symbol: string, snapshot: WindowSnapshot): void {
    const baseline = this.baselines.get(symbol);
    if (!baseline) return;
    const ratio = snapshot.vol_5s / (baseline.ewma_vol_5s || 1);
    if (ratio >= this.config.spikeRatioThreshold) {
      this.onTrigger({
        symbol,
        exchange: this.exchange,
        detectedAt: Date.now(),
        expiresAt: Date.now() + this.config.triggerTtlMs,
        ratio,
        window: snapshot,
        side: snapshot.buy_ratio > 0.65 ? 'buy'
             : snapshot.buy_ratio < 0.35 ? 'sell'
             : 'both',
      });
    }
  }
}
```

---

## 5. Zustand Store

```typescript
// stores/useRealtimeVolumeStore.ts

interface RealtimeVolumeState {
  engine: RealtimeVolumeEngine | null;
  activeTriggers: Map<string, VolumeTrigger>; // key: symbol
  latestWindows: Map<string, WindowSnapshot>;
  config: RealtimeVolumeConfig;

  // Actions
  initEngine: (exchange: 'hyperliquid' | 'binance') => void;
  subscribeSymbols: (symbols: string[]) => void;
  unsubscribeSymbols: (symbols: string[]) => void;
  getTrigger: (symbol: string) => VolumeTrigger | null;
  hasTrigger: (symbol: string) => boolean;
  updateConfig: (partial: Partial<RealtimeVolumeConfig>) => void;
  pruneExpiredTriggers: () => void; // call on interval
}
```

**Defaults:**
```typescript
const DEFAULT_CONFIG: RealtimeVolumeConfig = {
  flushIntervalMs: 250,
  windowSizes: [3000, 5000, 10000, 30000],
  baselineSamples: 20,
  spikeRatioThreshold: 2.5,
  triggerTtlMs: 10000,
  maxSymbols: 30,
};
```

---

## 6. Integration với Scanner

### 6.1 Bổ sung signal vào `useScannerStore`

```typescript
// stores/useScannerStore.ts — thêm vào runScan()

const { hasTrigger } = useRealtimeVolumeStore.getState();

const results = symbols.map(sym => {
  const candleSignal = scannerService.scanVolumeSpike(sym, params);
  const realtimeSignal = hasTrigger(sym);
  return {
    ...candleSignal,
    realtimeVolumeTrigger: realtimeSignal, // NEW field
    signalScore: candleSignal.signalScore + (realtimeSignal ? 2 : 0),
  };
});
```

### 6.2 UI Badge

Trong scanner table, thêm indicator khi `realtimeVolumeTrigger === true`:

```tsx
{result.realtimeVolumeTrigger && (
  <Badge variant="destructive" className="text-xs animate-pulse">
    LIVE VOL ⚡
  </Badge>
)}
```

---

## 7. Exchange Compatibility

| Feature | Hyperliquid | Binance Futures |
|---|---|---|
| Trade stream | `eventClient.trades(coin, cb)` | `aggTrade` WebSocket |
| Batch size | Multi-trade array per message | Single trade per message |
| Trade fields | `time, px, sz, side` | `T, p, q, m` (mapped) |
| Interface | `ExchangeWebSocketService.subscribeToTrades()` | Same interface |
| Granularity | ~10–50ms per batch | ~1ms per trade |
| Switch | `websocket-singleton.ts` exchange type | Same factory |

**Binance note**: `aggTrade` đã aggregate — đủ để detect spike. Nếu cần finer granularity có thể switch sang `trade` stream (raw tick).

---

## 8. File Structure

```
lib/
  services/
    realtime-volume-engine.ts     ← Core engine class
    realtime-volume-types.ts      ← All types/interfaces
stores/
  useRealtimeVolumeStore.ts       ← Zustand store + engine lifecycle
components/
  scanner/
    RealtimeVolumeIndicator.tsx   ← Badge component
```

---

## 9. Config Tuning Guide

| Parameter | Conservative | Aggressive |
|---|---|---|
| `flushIntervalMs` | 500ms | 100ms |
| `spikeRatioThreshold` | 3.0x | 2.0x |
| `triggerTtlMs` | 15s | 5s |
| `baselineSamples` | 30 | 10 |
| `maxSymbols` | 20 | 50 |

**Khuyến nghị**: Start với `2.5x threshold, 250ms flush, 10s TTL`. Tune sau khi observe false positive rate.

---

## 10. Implementation Order

1. `realtime-volume-types.ts` — định nghĩa tất cả types
2. `realtime-volume-engine.ts` — core engine + buffer + EWMA
3. `useRealtimeVolumeStore.ts` — Zustand wrapper + lifecycle
4. Tích hợp vào `useScannerStore.ts` — thêm `realtimeVolumeTrigger` field
5. `RealtimeVolumeIndicator.tsx` — UI badge
6. Test với 5 symbols trên Hyperliquid trước, sau đó Binance
