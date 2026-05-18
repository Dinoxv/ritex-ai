'use client';

import { useEffect, useRef, useState, memo } from 'react';
import {
  createChart,
  CrosshairMode,
  LineType,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  HistogramSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useCandleStore } from '@/stores/useCandleStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getCandleTimeWindow } from '@/lib/time-utils';
import { DEFAULT_CANDLE_COUNT } from '@/lib/constants';
import type { CandleData, TimeInterval } from '@/types';
import {
  calculateEMA, calculateRSI, calculateMACD, calculateATR, calculateStochastic,
  detectPivots, detectChannels, calculateTrendlines, detectDivergence,
  detectMacdReversals, detectRsiReversals, detectStochasticPivots,
  calculateTrendMatrix
} from '@/lib/indicators';
import { ChartToolbar, type ChartType, type IndicatorOption } from './ChartToolbar';

interface LightweightChartProps {
  coin: string;
  exchange: string;
  className?: string;
}

const CHART_PREFS_STORAGE_KEY = 'hyperscalper-lightweight-chart-prefs-v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface ChartPrefs {
  interval: TimeInterval;
  chartType: ChartType;
  enabledIndicators: Record<string, boolean>;
}

const UP = '#26a69a';
const DOWN = '#ef5350';
const UP_FILL = 'rgba(38, 166, 154, 0.55)';
const DOWN_FILL = 'rgba(239, 83, 80, 0.55)';

type LwcOhlc = { time: UTCTimestamp; open: number; high: number; low: number; close: number };
type LwcValue = { time: UTCTimestamp; value: number; color?: string };

type TrendMatrixSeriesRefs = {
  htfBias: ISeriesApi<'Line'> | null;
  pendingHigh: ISeriesApi<'Line'> | null;
  pendingLow: ISeriesApi<'Line'> | null;
  atrStop: ISeriesApi<'Line'> | null;
  tp1: ISeriesApi<'Line'> | null;
  tp2: ISeriesApi<'Line'> | null;
  tp3: ISeriesApi<'Line'> | null;
  tp4: ISeriesApi<'Line'> | null;
  entry: ISeriesApi<'Line'> | null;
  markerCarrier: ISeriesApi<'Line'> | null;
};

function toOhlc(rows: CandleData[]): LwcOhlc[] {
  const out: LwcOhlc[] = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    out[i] = {
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      open: c.open, high: c.high, low: c.low, close: c.close,
    };
  }
  return out;
}

function toHeikinAshi(rows: CandleData[]): LwcOhlc[] {
  const out: LwcOhlc[] = new Array(rows.length);
  let prevOpen = 0, prevClose = 0;
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    out[i] = {
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      open: haOpen, high: haHigh, low: haLow, close: haClose,
    };
    prevOpen = haOpen;
    prevClose = haClose;
  }
  return out;
}

function toCloseLine(rows: CandleData[]): LwcValue[] {
  const out: LwcValue[] = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    out[i] = { time: Math.floor(c.time / 1000) as UTCTimestamp, value: c.close };
  }
  return out;
}

function toColumns(rows: CandleData[]): LwcValue[] {
  const out: LwcValue[] = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    out[i] = {
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      value: c.close,
      color: c.close >= c.open ? UP_FILL : DOWN_FILL,
    };
  }
  return out;
}

function toVolume(rows: CandleData[]): LwcValue[] {
  const out: LwcValue[] = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    out[i] = {
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? UP_FILL : DOWN_FILL,
    };
  }
  return out;
}

function formatTime(tsSec: number) {
  const d = new Date(tsSec * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function isOhlcType(t: ChartType) {
  return t === 'bar' || t === 'high-low' || t === 'candlestick' || t === 'hollow-candles' || t === 'heikin-ashi';
}

function addMainSeries(chart: IChartApi, type: ChartType, baselineSeed: number): ISeriesApi<any> {
  switch (type) {
    case 'bar':
    case 'high-low':
      return chart.addSeries(BarSeries, { upColor: UP, downColor: DOWN, openVisible: true, thinBars: false });
    case 'candlestick':
    case 'heikin-ashi':
      return chart.addSeries(CandlestickSeries, {
        upColor: UP, downColor: DOWN,
        borderUpColor: UP, borderDownColor: DOWN,
        wickUpColor: UP, wickDownColor: DOWN,
      });
    case 'hollow-candles':
      return chart.addSeries(CandlestickSeries, {
        upColor: 'rgba(0,0,0,0)', downColor: 'rgba(0,0,0,0)',
        borderUpColor: UP, borderDownColor: DOWN,
        wickUpColor: UP, wickDownColor: DOWN,
      });
    case 'line':
    case 'line-with-markers':
      return chart.addSeries(LineSeries, { color: UP, lineWidth: 2 });
    case 'step-line':
      return chart.addSeries(LineSeries, { color: UP, lineWidth: 2, lineType: LineType.WithSteps });
    case 'area':
    case 'hlc-area':
      return chart.addSeries(AreaSeries, {
        lineColor: UP, topColor: 'rgba(38,166,154,0.45)', bottomColor: 'rgba(38,166,154,0.02)', lineWidth: 2,
      });
    case 'baseline':
      return chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: baselineSeed },
        topLineColor: UP, topFillColor1: 'rgba(38,166,154,0.45)', topFillColor2: 'rgba(38,166,154,0.02)',
        bottomLineColor: DOWN, bottomFillColor1: 'rgba(239,83,80,0.45)', bottomFillColor2: 'rgba(239,83,80,0.02)',
      });
    case 'columns':
      return chart.addSeries(HistogramSeries, { color: UP, priceFormat: { type: 'price' } });
  }
}

function buildSeriesData(rows: CandleData[], type: ChartType): LwcOhlc[] | LwcValue[] {
  if (type === 'heikin-ashi') return toHeikinAshi(rows);
  if (isOhlcType(type)) return toOhlc(rows);
  if (type === 'columns') return toColumns(rows);
  return toCloseLine(rows);
}

// ---------------- indicator overlay definitions ----------------

interface OverlayDef {
  id: string;
  label: string;
  color: string;
  compute: (rows: CandleData[]) => LwcValue[];
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function stddev(values: number[], period: number, means: (number | null)[]): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const m = means[i];
    if (m == null) continue;
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = values[j] - m;
      s += d * d;
    }
    out[i] = Math.sqrt(s / period);
  }
  return out;
}

function emaOverlay(period: number): (rows: CandleData[]) => LwcValue[] {
  return (rows: CandleData[]) => {
    if (rows.length === 0) return [];
    const closes = rows.map((c) => c.close);
    const ema = calculateEMA(closes, period);
    const out: LwcValue[] = [];
    for (let i = period - 1; i < rows.length; i++) {
      out.push({ time: Math.floor(rows[i].time / 1000) as UTCTimestamp, value: ema[i] });
    }
    return out;
  };
}

function smaOverlay(period: number): (rows: CandleData[]) => LwcValue[] {
  return (rows: CandleData[]) => {
    if (rows.length === 0) return [];
    const closes = rows.map((c) => c.close);
    const s = sma(closes, period);
    const out: LwcValue[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (s[i] != null) out.push({ time: Math.floor(rows[i].time / 1000) as UTCTimestamp, value: s[i] as number });
    }
    return out;
  };
}

function bbOverlay(kind: 'upper' | 'lower' | 'mid', period = 20, mult = 2): (rows: CandleData[]) => LwcValue[] {
  return (rows: CandleData[]) => {
    if (rows.length === 0) return [];
    const closes = rows.map((c) => c.close);
    const mid = sma(closes, period);
    const sd = stddev(closes, period, mid);
    const out: LwcValue[] = [];
    for (let i = 0; i < rows.length; i++) {
      const m = mid[i];
      const s = sd[i];
      if (m == null || s == null) continue;
      const v = kind === 'mid' ? m : kind === 'upper' ? m + mult * s : m - mult * s;
      out.push({ time: Math.floor(rows[i].time / 1000) as UTCTimestamp, value: v });
    }
    return out;
  };
}

const OVERLAYS: OverlayDef[] = [
  {
    id: 'pivot',
    label: 'Pivot (Price)',
    color: '#f87171',
    compute: (rows) => {
      if (!rows.length) return [];
      const pivots = detectPivots(rows, 3);
      return pivots.map((p) => ({ time: Math.floor(rows[p.index].time / 1000) as UTCTimestamp, value: p.price, color: p.type === 'high' ? '#f87171' : '#34d399' }));
    },
  },
  // Channel
  {
    id: 'channel',
    label: 'Channel',
    color: '#818cf8',
    compute: (rows) => {
      if (!rows.length) return [];
      const channels = detectChannels(rows, { pivotStrength: 3, lookbackBars: 50, minTouches: 3 });
      const out: LwcValue[] = [];
      channels.forEach((ch) => {
        const start = ch.startIndex;
        const end = ch.endIndex;
        for (let i = start; i <= end; i++) {
          const t = Math.floor(rows[i].time / 1000) as UTCTimestamp;
          out.push({ time: t, value: ch.upperLine.slope * i + ch.upperLine.intercept, color: '#818cf8' });
          out.push({ time: t, value: ch.lowerLine.slope * i + ch.lowerLine.intercept, color: '#818cf8' });
        }
      });
      return out;
    },
  },
  // Trendline
  {
    id: 'trendline',
    label: 'Trendline',
    color: '#f472b6',
    compute: (rows) => {
      if (!rows.length) return [];
      const trendlines = calculateTrendlines(rows);
      const out: LwcValue[] = [];
      trendlines.supportLine.forEach((line) => {
        line.points.forEach((pt) => out.push({ time: pt.time as UTCTimestamp, value: pt.value, color: '#34d399' }));
      });
      trendlines.resistanceLine.forEach((line) => {
        line.points.forEach((pt) => out.push({ time: pt.time as UTCTimestamp, value: pt.value, color: '#f87171' }));
      });
      return out;
    },
  },
  // Divergence (price/RSI)
  {
    id: 'divergence',
    label: 'Divergence (Price/RSI)',
    color: '#fbbf24',
    compute: (rows) => {
      if (!rows.length) return [];
      const pivots = detectPivots(rows, 3);
      const closes = rows.map((c) => c.close);
      const rsi = calculateRSI(closes, 14);
      const rsiPivots = pivots.map((p) => ({ ...p, value: rsi[p.index], type: p.type as 'high' | 'low' }));
      const divs = detectDivergence(pivots, rsiPivots, rows);
      return divs.map((d) => ({ time: Math.floor(d.endTime / 1000) as UTCTimestamp, value: d.endPriceValue, color: d.type.includes('bullish') ? '#34d399' : '#f87171' }));
    },
  },
  // Marker (MACD/RSI/Stoch reversal)
  {
    id: 'marker',
    label: 'Reversal Marker',
    color: '#f472b6',
    compute: (rows) => {
      if (!rows.length) return [];
      const closes = rows.map((c) => c.close);
      const macd = calculateMACD(closes, 12, 26, 9);
      const rsi = calculateRSI(closes, 14);
      const stoch = calculateStochastic(rows, 14, 3, 3);
      const macdMarkers = detectMacdReversals(macd, rows);
      const rsiMarkers = detectRsiReversals(rsi, rows);
      const stochMarkers = detectStochasticPivots(stoch, rows);
      const out: LwcValue[] = [];
      macdMarkers.forEach((m) => out.push({ time: Math.floor(m.time / 1000) as UTCTimestamp, value: m.price, color: m.direction === 'bullish' ? '#34d399' : '#f87171' }));
      rsiMarkers.forEach((m) => out.push({ time: Math.floor(m.time / 1000) as UTCTimestamp, value: m.price, color: m.direction === 'bullish' ? '#34d399' : '#f87171' }));
      stochMarkers.forEach((m) => out.push({ time: Math.floor(m.time / 1000) as UTCTimestamp, value: m.value, color: m.type === 'high' ? '#f87171' : '#34d399' }));
      return out;
    },
  },
  // Trend Matrix (Ritchi SMC style)
  {
    id: 'trendMatrix',
    label: 'Trend Matrix (SMC)',
    color: '#34d399',
    compute: () => [],
  },
];

// ---------------- pane indicator definitions (RSI, MACD on separate panes) ----------------

type PaneSeriesKind = 'line' | 'histogram';

interface PaneSeriesSpec {
  kind: PaneSeriesKind;
  color: string;
  /** Optional override per series for additional opts (e.g. histogram base). */
  extraOpts?: Record<string, unknown>;
}

interface PaneIndicatorDef {
  id: string;
  label: string;
  color: string; // swatch color in dropdown
  paneIndex: number;
  paneHeightPx: number;
  /** Series specs in order. compute() must return parallel arrays. */
  series: PaneSeriesSpec[];
  /** Optional price lines drawn on the pane scale (e.g. RSI 30/70). */
  priceLines?: Array<{ price: number; color: string; label?: string }>;
  /** One LwcValue[] per series spec (or LwcHist[] for histogram). */
  compute: (rows: CandleData[]) => Array<Array<LwcValue | LwcHist>>;
}

interface LwcHist { time: UTCTimestamp; value: number; color?: string }

function rsiCompute(period = 14) {
  return (rows: CandleData[]): Array<Array<LwcValue>> => {
    if (rows.length === 0) return [[]];
    const closes = rows.map((c) => c.close);
    const rsi = calculateRSI(closes, period);
    const out: LwcValue[] = [];
    // calculateRSI returns array starting at index 0 filled with 50 for first `period` entries,
    // and one value per close from index `period` onward. Skip seeded zeros for cleaner chart.
    for (let i = period; i < rsi.length && i < rows.length; i++) {
      out.push({ time: Math.floor(rows[i].time / 1000) as UTCTimestamp, value: rsi[i] });
    }
    return [out];
  };
}

function macdCompute(fast = 12, slow = 26, signal = 9) {
  return (rows: CandleData[]): Array<Array<LwcValue | LwcHist>> => {
    if (rows.length === 0) return [[], [], []];
    const closes = rows.map((c) => c.close);
    const { macd, signal: sig, histogram } = calculateMACD(closes, fast, slow, signal);
    const macdLine: LwcValue[] = [];
    const sigLine: LwcValue[] = [];
    const hist: LwcHist[] = [];
    // Skip leading entries until slow EMA settles to avoid jagged start.
    const startIdx = slow + signal;
    for (let i = startIdx; i < rows.length; i++) {
      const t = Math.floor(rows[i].time / 1000) as UTCTimestamp;
      macdLine.push({ time: t, value: macd[i] });
      sigLine.push({ time: t, value: sig[i] });
      const h = histogram[i];
      hist.push({ time: t, value: h, color: h >= 0 ? 'rgba(38,166,154,0.7)' : 'rgba(239,83,80,0.7)' });
    }
    return [macdLine, sigLine, hist];
  };
}

const PANE_INDICATORS: PaneIndicatorDef[] = [
  // RSI (giữ nguyên)
  {
    id: 'rsi14',
    label: 'RSI (14)',
    color: '#fbbf24',
    paneIndex: 1,
    paneHeightPx: 110,
    series: [{ kind: 'line', color: '#fbbf24' }],
    priceLines: [
      { price: 70, color: 'rgba(239,83,80,0.5)', label: '70' },
      { price: 30, color: 'rgba(38,166,154,0.5)', label: '30' },
      { price: 50, color: 'rgba(148,163,184,0.3)' },
    ],
    compute: rsiCompute(14),
  },
  // MACD (giữ nguyên)
  {
    id: 'macd',
    label: 'MACD (12, 26, 9)',
    color: '#60a5fa',
    paneIndex: 2,
    paneHeightPx: 110,
    series: [
      { kind: 'line', color: '#60a5fa' },                 // MACD line
      { kind: 'line', color: '#f97316' },                 // Signal line
      { kind: 'histogram', color: '#94a3b8', extraOpts: { base: 0 } }, // Histogram
    ],
    compute: macdCompute(12, 26, 9),
  },
  // ATR
  {
    id: 'atr14',
    label: 'ATR (14)',
    color: '#f472b6',
    paneIndex: 3,
    paneHeightPx: 90,
    series: [
      { kind: 'line', color: '#f472b6' },
    ],
    priceLines: [],
    compute: (rows) => {
      if (!rows.length) return [[]];
      const atr = calculateATR(rows, 14);
      const out = [];
      for (let i = 13; i < atr.length && i < rows.length; i++) {
        out.push({ time: Math.floor(rows[i].time / 1000) as UTCTimestamp, value: atr[i] });
      }
      return [out];
    },
  },
  // Stochastic
  {
    id: 'stoch14',
    label: 'Stochastic (14, 3, 3)',
    color: '#34d399',
    paneIndex: 4,
    paneHeightPx: 110,
    series: [
      { kind: 'line', color: '#34d399' }, // %K
      { kind: 'line', color: '#f59e42' }, // %D
    ],
    priceLines: [
      { price: 80, color: 'rgba(239,83,80,0.5)', label: '80' },
      { price: 20, color: 'rgba(38,166,154,0.5)', label: '20' },
      { price: 50, color: 'rgba(148,163,184,0.3)' },
    ],
    compute: (rows) => {
      if (!rows.length) return [[], []];
      const stoch = calculateStochastic(rows, 14, 3, 3);
      const outK = [];
      const outD = [];
      for (let i = 0; i < stoch.length && i < rows.length; i++) {
        const t = Math.floor(rows[i + (rows.length - stoch.length)].time / 1000) as UTCTimestamp;
        outK.push({ time: t, value: stoch[i].k });
        outD.push({ time: t, value: stoch[i].d });
      }
      return [outK, outD];
    },
  },
];

const HIDDEN_INDICATOR_IDS = new Set(['ema5', 'ema13', 'ema21', 'sma20', 'bbUpper', 'bbMid', 'bbLower', 'emaAlign']);

const ACTIVE_OVERLAYS = OVERLAYS.filter((overlay) => !HIDDEN_INDICATOR_IDS.has(overlay.id));

const INDICATOR_OPTIONS: IndicatorOption[] = [
  ...ACTIVE_OVERLAYS.map((o) => ({ id: o.id, label: o.label, color: o.color })),
  ...PANE_INDICATORS.map((p) => ({ id: p.id, label: p.label, color: p.color })),
];

function LightweightChart({ coin, exchange: _exchange, className }: LightweightChartProps) {
  const [interval, setIntervalState] = useState<TimeInterval>(() => {
    if (typeof window === 'undefined') return '5m';
    try {
      const raw = localStorage.getItem(CHART_PREFS_STORAGE_KEY);
      if (!raw) return '5m';
      const parsed = JSON.parse(raw) as Partial<ChartPrefs>;
      return parsed.interval ?? '5m';
    } catch {
      return '5m';
    }
  });
  const [chartType, setChartType] = useState<ChartType>(() => {
    if (typeof window === 'undefined') return 'candlestick';
    try {
      const raw = localStorage.getItem(CHART_PREFS_STORAGE_KEY);
      if (!raw) return 'candlestick';
      const parsed = JSON.parse(raw) as Partial<ChartPrefs>;
      return parsed.chartType ?? 'candlestick';
    } catch {
      return 'candlestick';
    }
  });
  const [enabledIndicators, setEnabledIndicators] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(CHART_PREFS_STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<ChartPrefs>;
      if (!parsed.enabledIndicators) return defaults;
      return Object.fromEntries(
        Object.entries({ ...defaults, ...parsed.enabledIndicators }).filter(([id]) => !HIDDEN_INDICATOR_IDS.has(id))
      );
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CHART_PREFS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<ChartPrefs>;
      if (!parsed.enabledIndicators || typeof parsed.enabledIndicators !== 'object') return;

      const cleanedEnabledIndicators = Object.fromEntries(
        Object.entries(parsed.enabledIndicators).filter(([id]) => !HIDDEN_INDICATOR_IDS.has(id))
      );

      const hadLegacyKeys = Object.keys(cleanedEnabledIndicators).length !== Object.keys(parsed.enabledIndicators).length;
      if (!hadLegacyKeys) return;

      const cleanedPrefs: ChartPrefs = {
        interval: parsed.interval ?? '5m',
        chartType: parsed.chartType ?? 'candlestick',
        enabledIndicators: cleanedEnabledIndicators,
      };

      localStorage.setItem(CHART_PREFS_STORAGE_KEY, JSON.stringify(cleanedPrefs));
    } catch {
      // Ignore malformed localStorage payloads.
    }
  }, []);

  const trendMatrixSettings = useSettingsStore((s) => s.settings.indicators.trendMatrix);
  const updateTrendMatrixSettings = useSettingsStore((s) => s.updateTrendMatrixSettings);
  const [hover, setHover] = useState<{
    time: number;
    open?: number; high?: number; low?: number; close?: number;
    value?: number;
    volume: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlaySeriesRef = useRef<Record<string, ISeriesApi<'Line'> | null>>({});
  const paneSeriesRef = useRef<Record<string, ISeriesApi<any>[]>>({});
  const trendMatrixSeriesRef = useRef<TrendMatrixSeriesRefs | null>(null);
  const chartTypeRef = useRef<ChartType>(chartType);
  const lastDataLenRef = useRef<number>(0);
  // Track first candle timestamp to detect when a full-history fetch replaces WS-primed data.
  // Without this, the WS update (1 candle) sets lastDataLenRef=1, then the REST fetch arrives
  // with 2000+ older candles and the code falls into update() → lightweight-charts throws
  // "Cannot update with a point in the past" → React error boundary → "Application error".
  const lastFirstCandleTimeRef = useRef<number>(0);

  const candles = useCandleStore((s) => s.selectCandles(coin, interval));
  const fetchCandles = useCandleStore((s) => s.fetchCandles);
  const subscribeToCandles = useCandleStore((s) => s.subscribeToCandles);
  const unsubscribeFromCandles = useCandleStore((s) => s.unsubscribeFromCandles);
  const candleService = useCandleStore((s) => s.service);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefs: ChartPrefs = { interval, chartType, enabledIndicators };
    try {
      localStorage.setItem(CHART_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  }, [interval, chartType, enabledIndicators]);

  // Fetch + subscribe per interval (SymbolView only auto-subs 1m/5m/15m/1h).
  useEffect(() => {
    if (!candleService) return;
    const now = Date.now();
    const { startTime, endTime } = interval === '5m'
      ? { startTime: now - SEVEN_DAYS_MS, endTime: now }
      : getCandleTimeWindow(interval, DEFAULT_CANDLE_COUNT);
    fetchCandles(coin, interval, startTime, endTime);
    subscribeToCandles(coin, interval);
    return () => { unsubscribeFromCandles(coin, interval); };
  }, [coin, interval, candleService, fetchCandles, subscribeToCandles, unsubscribeFromCandles]);

  // Create chart + volume series + crosshair handler ONCE.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: '#0f1722' },
        textColor: '#cbd5e1',
        fontSize: 11,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(80, 80, 80, 0.15)' },
        horzLines: { color: 'rgba(80, 80, 80, 0.15)' },
      },
      rightPriceScale: { borderColor: '#1a1a1a', scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderColor: '#1a1a1a', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    } as any);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chartRef.current = chart;
    volumeSeriesRef.current = volumeSeries;

    const handleCrosshair = (param: any) => {
      if (!param.time || !param.seriesData) { setHover(null); return; }
      const main = mainSeriesRef.current;
      const md = main ? param.seriesData.get(main) : null;
      const vd = param.seriesData.get(volumeSeries) as any;
      if (!md) { setHover(null); return; }
      if (isOhlcType(chartTypeRef.current)) {
        setHover({ time: Number(param.time), open: md.open, high: md.high, low: md.low, close: md.close, volume: vd?.value ?? 0 });
      } else {
        setHover({ time: Number(param.time), value: md.value, volume: vd?.value ?? 0 });
      }
    };
    chart.subscribeCrosshairMove(handleCrosshair);

    const ro = new ResizeObserver(() => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(container);

    return () => {
      try { chart.unsubscribeCrosshairMove(handleCrosshair); } catch {}
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlaySeriesRef.current = {};
      paneSeriesRef.current = {};
      trendMatrixSeriesRef.current = null;
      lastDataLenRef.current = 0;
    };
  }, []);

  // (Re)create main series when chartType changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (mainSeriesRef.current) {
      try { chart.removeSeries(mainSeriesRef.current); } catch {}
      mainSeriesRef.current = null;
    }
    const baselineSeed = candles && candles.length > 0 ? candles[candles.length - 1].close : 0;
    mainSeriesRef.current = addMainSeries(chart, chartType, baselineSeed);
    chartTypeRef.current = chartType;
    lastDataLenRef.current = 0; // force fresh setData
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  // Reset on coin/interval change
  useEffect(() => {
    lastDataLenRef.current = 0;
    lastFirstCandleTimeRef.current = 0;
  }, [coin, interval]);

  // Create / remove overlay series when toggles change.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const o of ACTIVE_OVERLAYS) {
      if (o.id === 'trendMatrix') continue;
      const existing = overlaySeriesRef.current[o.id];
      const want = !!enabledIndicators[o.id];
      if (want && !existing) {
        const s = chart.addSeries(LineSeries, {
          color: o.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        overlaySeriesRef.current[o.id] = s;
      } else if (!want && existing) {
        try { chart.removeSeries(existing); } catch {}
        overlaySeriesRef.current[o.id] = null;
      }
    }

    // Trend Matrix uses multiple overlay series + a marker carrier.
    {
      const want = !!enabledIndicators.trendMatrix;
      const existing = trendMatrixSeriesRef.current;
      if (want && !existing) {
        const bull = trendMatrixSettings.bullColor;
        const bear = trendMatrixSettings.bearColor;
        trendMatrixSeriesRef.current = {
          htfBias: chart.addSeries(LineSeries, { color: '#94a3b8', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
          pendingHigh: chart.addSeries(LineSeries, { color: bull, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }),
          pendingLow: chart.addSeries(LineSeries, { color: bear, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }),
          atrStop: chart.addSeries(LineSeries, { color: 'rgba(255,82,82,0.9)', lineWidth: 2, priceLineVisible: false, lastValueVisible: false }),
          tp1: chart.addSeries(LineSeries, { color: bull, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
          tp2: chart.addSeries(LineSeries, { color: bull, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
          tp3: chart.addSeries(LineSeries, { color: bull, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
          tp4: chart.addSeries(LineSeries, { color: bull, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
          entry: chart.addSeries(LineSeries, { color: '#facc15', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }),
          markerCarrier: chart.addSeries(LineSeries, { color: 'rgba(0,0,0,0)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }),
        };
      } else if (!want && existing) {
        for (const key of Object.keys(existing) as Array<keyof TrendMatrixSeriesRefs>) {
          const s = existing[key];
          if (s) {
            try { chart.removeSeries(s); } catch {}
          }
        }
        trendMatrixSeriesRef.current = null;
      }
    }

    // Pane indicators (RSI / MACD on separate panes via v5 paneIndex arg).
    for (const p of PANE_INDICATORS) {
      const existing = paneSeriesRef.current[p.id];
      const want = !!enabledIndicators[p.id];
      if (want && (!existing || existing.length === 0)) {
        const created: ISeriesApi<any>[] = [];
        for (const spec of p.series) {
          const opts: any = {
            color: spec.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: false,
            ...(spec.extraOpts ?? {}),
          };
          const s = spec.kind === 'histogram'
            ? chart.addSeries(HistogramSeries, opts, p.paneIndex)
            : chart.addSeries(LineSeries, opts, p.paneIndex);
          created.push(s);
        }
        // Sizing: panes() returns array length == max pane index used + 1.
        try {
          const panes = chart.panes();
          if (panes[p.paneIndex]) panes[p.paneIndex].setHeight(p.paneHeightPx);
        } catch {}
        // Price lines (e.g. RSI 30/70) attached to first series of the pane.
        if (p.priceLines && created.length > 0) {
          for (const pl of p.priceLines) {
            try {
              created[0].createPriceLine({
                price: pl.price,
                color: pl.color,
                lineWidth: 1,
                lineStyle: 2, // dashed
                axisLabelVisible: !!pl.label,
                title: pl.label ?? '',
              } as any);
            } catch {}
          }
        }
        paneSeriesRef.current[p.id] = created;
      } else if (!want && existing && existing.length > 0) {
        for (const s of existing) { try { chart.removeSeries(s); } catch {} }
        paneSeriesRef.current[p.id] = [];
      }
    }
  }, [enabledIndicators, trendMatrixSettings.bullColor, trendMatrixSettings.bearColor]);

  // Push data into series whenever candles or chartType changes.
  useEffect(() => {
    const ms = mainSeriesRef.current;
    const vs = volumeSeriesRef.current;
    if (!ms || !vs) return;
    if (!candles || candles.length === 0) return;

    const mainData = buildSeriesData(candles, chartType);
    const volData = toVolume(candles);

    // Detect WS-vs-fetch race: WS may prime 1 candle before REST fetch delivers full history.
    // If the first candle's timestamp changed, the data was completely replaced — force setData.
    const firstCandleTime = (mainData as any)[0]?.time ?? 0;
    const dataWasReplaced = lastFirstCandleTimeRef.current !== 0 &&
      firstCandleTime !== 0 &&
      firstCandleTime !== lastFirstCandleTimeRef.current;

    const doSetData = () => {
      ms.setData(mainData as any);
      vs.setData(volData);
      lastFirstCandleTimeRef.current = firstCandleTime;
      if (chartType === 'line-with-markers') {
        try {
          createSeriesMarkers(ms, (mainData as LwcValue[]).map((d) => ({
            time: d.time, position: 'inBar' as const, color: UP, shape: 'circle' as const, size: 1,
          })));
        } catch {}
      }
    };

    try {
      if (lastDataLenRef.current === 0 || candles.length < lastDataLenRef.current || dataWasReplaced) {
        doSetData();
      } else if (candles.length === lastDataLenRef.current) {
        ms.update((mainData as any)[mainData.length - 1]);
        vs.update(volData[volData.length - 1]);
      } else {
        const newCount = candles.length - lastDataLenRef.current;
        for (let i = candles.length - newCount; i < candles.length; i++) {
          ms.update((mainData as any)[i]);
          vs.update(volData[i]);
        }
      }
    } catch {
      // Fallback: if update() threw (e.g. timestamp regression from late-arriving fetch),
      // force a full setData which is always safe.
      try { doSetData(); } catch {}
    }
    lastDataLenRef.current = candles.length;
    if (lastFirstCandleTimeRef.current === 0 && firstCandleTime !== 0) {
      lastFirstCandleTimeRef.current = firstCandleTime;
    }

    // Update overlays (full setData each time — cheap for line series).
    for (const o of ACTIVE_OVERLAYS) {
      if (o.id === 'trendMatrix') continue;
      const s = overlaySeriesRef.current[o.id];
      if (!s) continue;
      // Some overlays (e.g. Channel) emit two points per timestamp (upper + lower line).
      // lightweight-charts v5 throws on duplicate/non-ascending times, so dedup here.
      try {
        const raw = o.compute(candles) as any[];
        const seenT = new Set<number>();
        const safe = raw
          .filter((d) => Number.isFinite(Number(d.time)) && Number.isFinite(d.value))
          .sort((a, b) => Number(a.time) - Number(b.time))
          .filter((d) => { const t = Number(d.time); if (seenT.has(t)) return false; seenT.add(t); return true; });
        s.setData(safe as any);
      } catch (err) {
        console.warn(`[LightweightChart] overlay ${o.id} setData error (non-fatal):`, err);
      }
    }

    // Update Trend Matrix multi-series overlay.
    if (enabledIndicators.trendMatrix && trendMatrixSeriesRef.current) {
      const tm = calculateTrendMatrix(candles, {
        ...trendMatrixSettings,
        bullColor: trendMatrixSettings.bullColor,
        bearColor: trendMatrixSettings.bearColor,
      });
      const refs = trendMatrixSeriesRef.current;

      const pendingHigh = tm.chochZones.filter((p) => p.color === 'rgba(52,230,126,0.28)').map((p) => ({ time: p.time, value: p.value }));
      const pendingLow = tm.chochZones.filter((p) => p.color === 'rgba(255,82,241,0.28)').map((p) => ({ time: p.time, value: p.value }));

      const tp1 = tm.tpLines.filter((p) => p.color.includes('0.70')).map((p) => ({ time: p.time, value: p.value }));
      const tp2 = tm.tpLines.filter((p) => p.color.includes('0.60')).map((p) => ({ time: p.time, value: p.value }));
      const tp3 = tm.tpLines.filter((p) => p.color.includes('0.50')).map((p) => ({ time: p.time, value: p.value }));
      const tp4 = tm.tpLines.filter((p) => p.color.includes('0.40')).map((p) => ({ time: p.time, value: p.value }));

      // Sanitize all TM data: filter NaN values and deduplicate by timestamp.
      // lightweight-charts throws synchronously if setData receives NaN values or
      // non-strictly-ascending timestamps, propagating as a React error boundary crash.
      const sanitizeLwc = <T extends { time: number; value: number }>(data: T[]): T[] => {
        const seen = new Set<number>();
        return data
          .filter((d) => Number.isFinite(d.value) && Number.isFinite(Number(d.time)))
          .sort((a, b) => Number(a.time) - Number(b.time))
          .filter((d) => { const t = Number(d.time); if (seen.has(t)) return false; seen.add(t); return true; });
      };

      try {
        refs.htfBias?.setData(sanitizeLwc(tm.biasZones.map((p) => ({ time: p.time, value: p.value }))) as any);
        refs.pendingHigh?.setData(sanitizeLwc(pendingHigh) as any);
        refs.pendingLow?.setData(sanitizeLwc(pendingLow) as any);
        refs.atrStop?.setData(sanitizeLwc(tm.slLines.map((p) => ({ time: p.time, value: p.value }))) as any);
        refs.tp1?.setData(sanitizeLwc(tp1) as any);
        refs.tp2?.setData(sanitizeLwc(tp2) as any);
        refs.tp3?.setData(sanitizeLwc(tp3) as any);
        refs.tp4?.setData(sanitizeLwc(tp4) as any);
        refs.entry?.setData(sanitizeLwc(tm.entryMarkers.map((p) => ({ time: p.time, value: p.value }))) as any);
        if (refs.markerCarrier) {
          refs.markerCarrier.setData(toCloseLine(candles) as any);
          try {
            createSeriesMarkers(
              refs.markerCarrier,
              tm.buySellLabels.map((m) => ({
                time: m.time,
                position: m.color === trendMatrixSettings.bullColor ? 'belowBar' : 'aboveBar',
                shape: m.color === trendMatrixSettings.bullColor ? 'arrowUp' : 'arrowDown',
                color: m.color,
                text: m.color === trendMatrixSettings.bullColor ? 'BUY' : 'SELL',
                size: 1,
              }))
            );
          } catch {}
        }
      } catch (err) {
        console.warn('[LightweightChart] TM setData error (non-fatal):', err);
      }
    }

    // Update pane indicators (RSI / MACD).
    for (const p of PANE_INDICATORS) {
      const seriesArr = paneSeriesRef.current[p.id];
      if (!seriesArr || seriesArr.length === 0) continue;
      const dataArr = p.compute(candles);
      for (let i = 0; i < seriesArr.length && i < dataArr.length; i++) {
        seriesArr[i].setData(dataArr[i] as any);
      }
    }
  }, [candles, chartType, enabledIndicators, trendMatrixSettings]);

  return (
    <div className={`flex flex-col w-full h-full bg-[#0f1722] ${className ?? ''}`} data-chart="lightweight">
      <ChartToolbar
        interval={interval}
        onIntervalChange={setIntervalState}
        chartType={chartType}
        onChartTypeChange={setChartType}
        indicators={INDICATOR_OPTIONS}
        enabledIndicators={enabledIndicators}
        onToggleIndicator={(id) =>
          setEnabledIndicators((prev) => ({ ...prev, [id]: !prev[id] }))
        }
        trendMatrixSettings={trendMatrixSettings}
        onTrendMatrixSettingsChange={(next) =>
          updateTrendMatrixSettings(next)
        }
      />

      {/* Chart area */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />

        {hover && (
          <div className="pointer-events-none absolute top-2 left-2 z-10 px-2 py-1 text-[10px] font-mono bg-black/70 border border-gray-700 text-gray-300">
            <div className="text-[#26a69a]">{formatTime(hover.time)}</div>
            {hover.open !== undefined ? (
              <div>
                O <span className="text-white">{hover.open}</span>{'  '}
                H <span className="text-white">{hover.high}</span>{'  '}
                L <span className="text-white">{hover.low}</span>{'  '}
                C <span className="text-white">{hover.close}</span>
              </div>
            ) : (
              <div>
                Price <span className="text-white">{hover.value}</span>
              </div>
            )}
            <div>VOL <span className="text-white">{hover.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          </div>
        )}

        {(!candles || candles.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-400 font-mono">
            LOADING CANDLES…
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(LightweightChart);
