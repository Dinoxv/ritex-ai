import type {
  ExchangeWebSocketService,
  CandleSubscriptionParams,
  TradeSubscriptionParams,
  CandleCallback,
  TradeCallback,
  AllMidsCallback,
  CandleData,
  TradeData,
  AllMidsData,
} from './exchange-websocket.interface';
import { useWebSocketStatusStore } from '@/stores/useWebSocketStatusStore';
import { useSymbolMetaStore } from '@/stores/useSymbolMetaStore';
import { formatPrice, formatSize } from '@/lib/format-utils';

interface SubRecord {
  id: string;
  type: 'candle' | 'trade' | 'allMids';
  stream: string;
  callback: CandleCallback | TradeCallback | AllMidsCallback;
}

function toStreamSymbol(coin: string): string {
  const c = coin.toLowerCase();
  return c.endsWith('usdt') ? c : `${c}usdt`;
}

function fromStreamSymbol(symbol: string): string {
  const up = symbol.toUpperCase();
  return up.endsWith('USDT') ? up.slice(0, -4) : up;
}

export class BinanceWebSocketService implements ExchangeWebSocketService {
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private isReady = false;
  private nextId = 1;
  private subscriptions = new Map<string, SubRecord>();
  private streamRefs = new Map<string, number>();

  constructor(isTestnet: boolean = false) {
    // USDⓈ-M Futures WebSocket — must use fstream.binance.com (NOT stream.binance.com which is Spot-only)
    this.wsUrl = isTestnet ? 'wss://testnet.binancefuture.com/ws' : 'wss://fstream.binance.com/ws';
  }

  private ensureConnected(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    useWebSocketStatusStore.getState().setOverallStatus('connecting');
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      this.isReady = true;
      useWebSocketStatusStore.getState().setOverallStatus('connected');

      // Resubscribe all streams after reconnect
      const allStreams = Array.from(this.streamRefs.keys());
      if (allStreams.length > 0) {
        this.send({ method: 'SUBSCRIBE', params: allStreams, id: this.nextId++ });
      }
    };

    this.ws.onclose = () => {
      this.isReady = false;
      useWebSocketStatusStore.getState().setOverallStatus('disconnected');
    };

    this.ws.onerror = () => {
      useWebSocketStatusStore.getState().setOverallStatus('error');
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private addStreamRef(stream: string): void {
    const current = this.streamRefs.get(stream) || 0;
    this.streamRefs.set(stream, current + 1);

    if (current === 0 && this.isReady) {
      this.send({ method: 'SUBSCRIBE', params: [stream], id: this.nextId++ });
    }
  }

  private removeStreamRef(stream: string): void {
    const current = this.streamRefs.get(stream) || 0;
    if (current <= 1) {
      this.streamRefs.delete(stream);
      if (this.isReady) {
        this.send({ method: 'UNSUBSCRIBE', params: [stream], id: this.nextId++ });
      }
      return;
    }

    this.streamRefs.set(stream, current - 1);
  }

  private processBulkMarkPriceArray(arr: any[]): void {
    const mids: AllMidsData = {};
    arr.forEach((it: any) => {
      // Only USDT-margined futures mark prices; 'p' = mark price on Futures WS
      if (it?.s && it?.p && String(it.s).endsWith('USDT')) {
        mids[fromStreamSymbol(it.s)] = parseFloat(it.p);
      }
    });
    if (Object.keys(mids).length > 0) {
      this.subscriptions.forEach((sub) => {
        if (sub.type !== 'allMids' || sub.stream !== '!markPrice@arr') return;
        (sub.callback as AllMidsCallback)(mids);
      });
    }
  }

  private handleMessage(raw: string): void {
    try {
      if (typeof raw !== 'string') return;
      const msg = JSON.parse(raw);

      // Case 1: Direct JSON array — rare, only when connecting via combined stream URL
      if (Array.isArray(msg)) {
        this.processBulkMarkPriceArray(msg);
        return;
      }

      // Case 2: SUBSCRIBE method on fstream.binance.com wraps !markPrice@arr as:
      //   {"stream": "!markPrice@arr", "data": [{e: "markPriceUpdate", s: "BTCUSDT", p: "..."}, ...]}
      // msg.data is an ARRAY here — must check BEFORE the `msg?.data?.e` logic below
      if (Array.isArray(msg?.data)) {
        this.processBulkMarkPriceArray(msg.data);
        return;
      }

      // Case 3: Single-stream events (kline, aggTrade, individual markPriceUpdate)
      // SUBSCRIBE method: {"stream": "btcusdt@kline_1m", "data": {"e": "kline", ...}}
      // Raw format:        {"e": "kline", ...}
      const normalizedMsg = msg?.data?.e ? msg.data : msg;

      // Skip non-event messages (subscription confirmation: {"result": null, "id": 1})
      if (!normalizedMsg.e) {
        return;
      }

      if (normalizedMsg.e === 'kline') {
        const symbol = fromStreamSymbol(normalizedMsg.s || '');
        const stream = `${toStreamSymbol(symbol)}@kline_${normalizedMsg.k?.i || '1m'}`;

        this.subscriptions.forEach((sub) => {
          if (sub.type !== 'candle' || sub.stream !== stream) return;

          const k = normalizedMsg.k;
          if (!k) return;

          const open = parseFloat(k.o);
          const high = parseFloat(k.h);
          const low = parseFloat(k.l);
          const close = parseFloat(k.c);
          // k.v = base asset volume (e.g. BTC), matches /fapi/v1/klines k[5]
          const volume = parseFloat(k.v || '0');

          const decimals = useSymbolMetaStore.getState().getDecimals(symbol);

          const candle: CandleData = {
            time: Number(k.t),
            open,
            high,
            low,
            close,
            volume,
            openFormatted: formatPrice(open, decimals.price),
            highFormatted: formatPrice(high, decimals.price),
            lowFormatted: formatPrice(low, decimals.price),
            closeFormatted: formatPrice(close, decimals.price),
            volumeFormatted: formatSize(volume, decimals.size),
          };

          (sub.callback as CandleCallback)(candle);
        });
        return;
      }

      if (normalizedMsg.e === 'aggTrade') {
        const symbol = fromStreamSymbol(normalizedMsg.s || '');
        const stream = `${toStreamSymbol(symbol)}@aggTrade`;

        this.subscriptions.forEach((sub) => {
          if (sub.type !== 'trade' || sub.stream !== stream) return;

          const price = parseFloat(normalizedMsg.p || '0');
          const size = parseFloat(normalizedMsg.q || '0');
          // m = is the buyer the market maker → buyer is maker → seller is aggressor → 'sell'
          const side: 'buy' | 'sell' = normalizedMsg.m ? 'sell' : 'buy';
          const decimals = useSymbolMetaStore.getState().getDecimals(symbol);

          const trade: TradeData = {
            time: Number(normalizedMsg.T || Date.now()),
            price,
            size,
            side,
            priceFormatted: formatPrice(price, decimals.price),
            sizeFormatted: formatSize(size, decimals.size),
          };

          (sub.callback as TradeCallback)(trade);
        });
        return;
      }

      // Single-symbol mark price update (e.g. from btcusdt@markPrice stream, not !markPrice@arr)
      if (normalizedMsg.e === 'markPriceUpdate' && normalizedMsg.s) {
        if (!String(normalizedMsg.s).endsWith('USDT')) return;
        const mids: AllMidsData = {};
        // 'p' = mark price (USDⓈ-M Futures mark price, NOT spot price)
        mids[fromStreamSymbol(normalizedMsg.s)] = parseFloat(normalizedMsg.p || '0');

        this.subscriptions.forEach((sub) => {
          if (sub.type !== 'allMids' || sub.stream !== '!markPrice@arr') return;
          (sub.callback as AllMidsCallback)(mids);
        });
      }
    } catch {
      // Ignore malformed message
    }
  }

  subscribeToCandles(params: CandleSubscriptionParams, callback: CandleCallback): string {
    this.ensureConnected();

    const stream = `${toStreamSymbol(params.coin)}@kline_${params.interval}`;
    const id = `candle_${params.coin}_${params.interval}_${Date.now()}_${Math.random()}`;

    this.subscriptions.set(id, {
      id,
      type: 'candle',
      stream,
      callback,
    });

    this.addStreamRef(stream);
    return id;
  }

  subscribeToTrades(params: TradeSubscriptionParams, callback: TradeCallback): string {
    this.ensureConnected();

    const stream = `${toStreamSymbol(params.coin)}@aggTrade`;
    const id = `trade_${params.coin}_${Date.now()}_${Math.random()}`;

    this.subscriptions.set(id, {
      id,
      type: 'trade',
      stream,
      callback,
    });

    this.addStreamRef(stream);
    return id;
  }

  subscribeToAllMids(callback: AllMidsCallback): string {
    this.ensureConnected();

    const stream = '!markPrice@arr';
    const id = `allMids_${Date.now()}_${Math.random()}`;

    this.subscriptions.set(id, {
      id,
      type: 'allMids',
      stream,
      callback,
    });

    this.addStreamRef(stream);
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return;

    this.removeStreamRef(sub.stream);
    this.subscriptions.delete(subscriptionId);
  }

  disconnect(): void {
    this.subscriptions.clear();
    this.streamRefs.clear();
    this.isReady = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    useWebSocketStatusStore.getState().setOverallStatus('disconnected');
  }

  isConnected(): boolean {
    return this.isReady;
  }
}
