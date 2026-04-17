import type { TradeData } from '@/lib/websocket/exchange-websocket.interface';
import type { ExchangeWebSocketService } from '@/lib/websocket/exchange-websocket.interface';
import {
  type TradeRingEntry,
  type WindowSnapshot,
  type VolumeBaseline,
  type VolumeTrigger,
  type RealtimeVolumeConfig,
  DEFAULT_REALTIME_VOLUME_CONFIG,
} from './realtime-volume-types';

interface TradeBuffer {
  pending: TradeRingEntry[];
  flushTimer: ReturnType<typeof setTimeout> | null;
}

export class RealtimeVolumeEngine {
  private buffers = new Map<string, TradeBuffer>();
  // ring buffer: last 35s of individual trade entries per symbol
  private ring = new Map<string, TradeRingEntry[]>();
  // last N window snapshots for EWMA
  private history = new Map<string, WindowSnapshot[]>();
  private baselines = new Map<string, VolumeBaseline>();
  // WS subscription IDs so we can unsubscribe cleanly
  private subscriptionIds = new Map<string, string>();

  private config: RealtimeVolumeConfig;
  private wsService: ExchangeWebSocketService;
  private exchange: 'hyperliquid' | 'binance';
  private onTrigger: (trigger: VolumeTrigger) => void;
  private onSnapshot: ((symbol: string, snap: WindowSnapshot) => void) | undefined;

  constructor(
    wsService: ExchangeWebSocketService,
    exchange: 'hyperliquid' | 'binance',
    config: Partial<RealtimeVolumeConfig>,
    onTrigger: (trigger: VolumeTrigger) => void,
    onSnapshot?: (symbol: string, snap: WindowSnapshot) => void
  ) {
    this.wsService = wsService;
    this.exchange = exchange;
    this.config = { ...DEFAULT_REALTIME_VOLUME_CONFIG, ...config };
    this.onTrigger = onTrigger;
    this.onSnapshot = onSnapshot;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  subscribe(symbols: string[]): void {
    for (const sym of symbols) {
      if (this.subscriptionIds.has(sym)) continue;
      this.initSymbol(sym);
      const id = this.wsService.subscribeToTrades({ coin: sym }, (batch) => {
        const trades = Array.isArray(batch) ? batch : [batch];
        this.ingestTrades(sym, trades);
      });
      this.subscriptionIds.set(sym, id);
    }
  }

  unsubscribe(symbols: string[]): void {
    for (const sym of symbols) {
      const id = this.subscriptionIds.get(sym);
      if (id) {
        this.wsService.unsubscribe(id);
        this.subscriptionIds.delete(sym);
      }
      this.cleanupSymbol(sym);
    }
  }

  unsubscribeAll(): void {
    this.unsubscribe(Array.from(this.subscriptionIds.keys()));
  }

  getBaseline(symbol: string): VolumeBaseline | null {
    return this.baselines.get(symbol) ?? null;
  }

  getLatestSnapshot(symbol: string): WindowSnapshot | null {
    const hist = this.history.get(symbol);
    if (!hist || hist.length === 0) return null;
    return hist[hist.length - 1];
  }

  updateConfig(partial: Partial<RealtimeVolumeConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  // ── Private: init / cleanup ───────────────────────────────────────────────

  private initSymbol(sym: string): void {
    this.buffers.set(sym, { pending: [], flushTimer: null });
    this.ring.set(sym, []);
    this.history.set(sym, []);
  }

  private cleanupSymbol(sym: string): void {
    const buf = this.buffers.get(sym);
    if (buf?.flushTimer) clearTimeout(buf.flushTimer);
    this.buffers.delete(sym);
    this.ring.delete(sym);
    this.history.delete(sym);
    this.baselines.delete(sym);
  }

  // ── Private: ingest & flush ───────────────────────────────────────────────

  private ingestTrades(symbol: string, trades: TradeData[]): void {
    const buf = this.buffers.get(symbol);
    if (!buf) return;

    for (const t of trades) {
      buf.pending.push({
        time: t.time,
        price: t.price,
        size: t.size,
        side: t.side,
      });
    }

    if (!buf.flushTimer) {
      buf.flushTimer = setTimeout(() => this.flush(symbol), this.config.flushIntervalMs);
    }
  }

  private flush(symbol: string): void {
    const buf = this.buffers.get(symbol);
    if (!buf) return;
    buf.flushTimer = null;

    const pending = buf.pending.splice(0);
    if (pending.length === 0) return;

    // Append to ring buffer, then prune old entries
    const ring = this.ring.get(symbol)!;
    ring.push(...pending);
    const cutoff = Date.now() - this.config.ringBufferMs;
    let cutoffIdx = 0;
    while (cutoffIdx < ring.length && ring[cutoffIdx].time < cutoff) cutoffIdx++;
    if (cutoffIdx > 0) ring.splice(0, cutoffIdx);

    const snapshot = this.computeWindow(symbol);
    this.updateBaseline(symbol, snapshot);
    this.evaluateTrigger(symbol, snapshot);

    if (this.onSnapshot) {
      this.onSnapshot(symbol, snapshot);
    }
  }

  // ── Private: window computation ───────────────────────────────────────────

  private computeWindow(symbol: string): WindowSnapshot {
    const now = Date.now();
    const ring = this.ring.get(symbol) ?? [];

    const [w3, w5, w10, w30] = this.config.windowSizes; // [3000, 5000, 10000, 30000]

    let vol3 = 0, vol5 = 0, vol10 = 0, vol30 = 0;
    let notional5 = 0;
    let buyVol5 = 0, totalVol5 = 0;
    let tradeCount5 = 0;

    for (const t of ring) {
      const age = now - t.time;
      if (age <= w30) {
        vol30 += t.size;
        if (age <= w10) {
          vol10 += t.size;
          if (age <= w5) {
            vol5 += t.size;
            notional5 += t.price * t.size;
            totalVol5 += t.size;
            tradeCount5++;
            if (t.side === 'buy') buyVol5 += t.size;
            if (age <= w3) {
              vol3 += t.size;
            }
          }
        }
      }
    }

    return {
      timestamp: now,
      vol_3s: vol3,
      vol_5s: vol5,
      vol_10s: vol10,
      vol_30s: vol30,
      notional_5s: notional5,
      buy_ratio: totalVol5 > 0 ? buyVol5 / totalVol5 : 0.5,
      tradeCount: tradeCount5,
    };
  }

  // ── Private: EWMA baseline ────────────────────────────────────────────────

  private updateBaseline(symbol: string, snap: WindowSnapshot): void {
    const hist = this.history.get(symbol)!;
    hist.push(snap);
    if (hist.length > this.config.baselineSamples * 2) {
      hist.splice(0, hist.length - this.config.baselineSamples * 2);
    }

    const existing = this.baselines.get(symbol);
    const alpha = 2 / (this.config.baselineSamples + 1);
    const prevSamples = existing?.sampleCount ?? 0;

    if (!existing || prevSamples === 0) {
      this.baselines.set(symbol, {
        ewma_vol_5s: snap.vol_5s,
        ewma_vol_10s: snap.vol_10s,
        ewma_notional: snap.notional_5s,
        sampleCount: 1,
        updatedAt: Date.now(),
      });
      return;
    }

    this.baselines.set(symbol, {
      ewma_vol_5s: alpha * snap.vol_5s + (1 - alpha) * existing.ewma_vol_5s,
      ewma_vol_10s: alpha * snap.vol_10s + (1 - alpha) * existing.ewma_vol_10s,
      ewma_notional: alpha * snap.notional_5s + (1 - alpha) * existing.ewma_notional,
      sampleCount: prevSamples + 1,
      updatedAt: Date.now(),
    });
  }

  // ── Private: trigger evaluation ──────────────────────────────────────────

  private evaluateTrigger(symbol: string, snap: WindowSnapshot): void {
    const baseline = this.baselines.get(symbol);
    // Need at least baselineSamples/2 snapshots before we start firing
    if (!baseline || baseline.sampleCount < Math.ceil(this.config.baselineSamples / 2)) return;
    // Avoid divide-by-zero on very quiet markets
    if (baseline.ewma_vol_5s < 1e-12) return;

    const ratio = snap.vol_5s / baseline.ewma_vol_5s;
    if (ratio < this.config.spikeRatioThreshold) return;

    const now = Date.now();
    let side: VolumeTrigger['side'] = 'both';
    if (snap.buy_ratio > 0.65) side = 'buy';
    else if (snap.buy_ratio < 0.35) side = 'sell';

    this.onTrigger({
      symbol,
      exchange: this.exchange,
      detectedAt: now,
      expiresAt: now + this.config.triggerTtlMs,
      ratio,
      window: snap,
      side,
    });
  }
}
