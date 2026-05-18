import type { CandleData } from '@/types';
import type { UTCTimestamp } from 'lightweight-charts';

export interface TrendMatrixOptions {
  msLen?: number;
  htfTF?: string;
  htfEmaLen?: number;
  atrLength?: number;
  atrMult?: number;
  targetStepMult?: number;
  riskPercent?: number;
  maxLossPercent?: number;
  partialTpPct?: number;
  bullColor?: string;
  bearColor?: string;
  showSig?: boolean;
  showTP?: boolean;
  showStop?: boolean;
  showHTF?: boolean;
  showPending?: boolean;
}

export interface TrendMatrixOverlayPoint {
  time: UTCTimestamp;
  value: number;
  color: string;
}

export interface TrendMatrixResult {
  biasZones: TrendMatrixOverlayPoint[];
  tpLines: TrendMatrixOverlayPoint[];
  slLines: TrendMatrixOverlayPoint[];
  entryMarkers: TrendMatrixOverlayPoint[];
  chochZones: TrendMatrixOverlayPoint[];
  buySellLabels: TrendMatrixOverlayPoint[];
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = new Array<number>(values.length);
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

function atr(candles: CandleData[], period: number): number[] {
  if (!candles.length) return [];
  const tr = new Array<number>(candles.length);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const pc = candles[i - 1].close;
    tr[i] = Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  }

  const out = new Array<number>(candles.length).fill(0);
  if (candles.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  out[period - 1] = sum / period;
  for (let i = period; i < candles.length; i++) {
    out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  }
  return out;
}

function pivotHigh(candles: CandleData[], idx: number, len: number): number | null {
  if (idx < len || idx + len >= candles.length) return null;
  const center = candles[idx].high;
  for (let j = 1; j <= len; j++) {
    if (candles[idx - j].high >= center || candles[idx + j].high >= center) return null;
  }
  return center;
}

function pivotLow(candles: CandleData[], idx: number, len: number): number | null {
  if (idx < len || idx + len >= candles.length) return null;
  const center = candles[idx].low;
  for (let j = 1; j <= len; j++) {
    if (candles[idx - j].low <= center || candles[idx + j].low <= center) return null;
  }
  return center;
}

export function calculateTrendMatrix(
  candles: CandleData[],
  options: TrendMatrixOptions = {}
): TrendMatrixResult {
  if (!candles.length) {
    return {
      biasZones: [],
      tpLines: [],
      slLines: [],
      entryMarkers: [],
      chochZones: [],
      buySellLabels: [],
    };
  }

  const msLen = options.msLen ?? 10;
  const htfEmaLen = options.htfEmaLen ?? 50;
  const atrLength = options.atrLength ?? 14;
  const atrMult = options.atrMult ?? 4.0;
  const targetStepMult = options.targetStepMult ?? 2.0;
  const maxLossPercent = options.maxLossPercent ?? 3.0;
  const bullColor = options.bullColor ?? 'rgba(52, 230, 126, 0.85)';
  const bearColor = options.bearColor ?? 'rgba(255, 82, 241, 0.85)';
  const showSig = options.showSig ?? true;
  const showTP = options.showTP ?? true;
  const showStop = options.showStop ?? true;
  const showHTF = options.showHTF ?? true;
  const showPending = options.showPending ?? true;

  const closes = candles.map(c => c.close);
  const htfEma = ema(closes, htfEmaLen);
  const atrValues = atr(candles, atrLength);

  const biasZones: TrendMatrixOverlayPoint[] = [];
  const tpLines: TrendMatrixOverlayPoint[] = [];
  const slLines: TrendMatrixOverlayPoint[] = [];
  const entryMarkers: TrendMatrixOverlayPoint[] = [];
  const chochZones: TrendMatrixOverlayPoint[] = [];
  const buySellLabels: TrendMatrixOverlayPoint[] = [];

  let direction = false;
  let atrTS: number | null = null;
  let phVal: number | null = null;
  let plVal: number | null = null;
  let posDir = 0; // 1 long, -1 short, 0 flat
  let hardSL = 0;
  let tp1 = 0;
  let tp2 = 0;
  let tp3 = 0;
  let tp4 = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const t = Math.floor(c.time / 1000) as UTCTimestamp;
    const a = atrValues[i] || 0;

    const ph = pivotHigh(candles, i, msLen);
    const pl = pivotLow(candles, i, msLen);
    if (ph != null) phVal = ph;
    if (pl != null) plVal = pl;

    const htfBull = c.close > (htfEma[i] ?? c.close);
    const htfBear = c.close < (htfEma[i] ?? c.close);

    if (showHTF) {
      biasZones.push({
        time: t,
        value: c.close,
        color: htfBull ? 'rgba(52,230,126,0.20)' : 'rgba(255,82,241,0.20)',
      });
    }

    if (showPending) {
      if (phVal != null) chochZones.push({ time: t, value: phVal, color: 'rgba(52,230,126,0.28)' });
      if (plVal != null) chochZones.push({ time: t, value: plVal, color: 'rgba(255,82,241,0.28)' });
    }

    const bullCHoCH = phVal != null && c.close > phVal && !direction && htfBull;
    const bearCHoCH = plVal != null && c.close < plVal && direction && htfBear;

    if (bullCHoCH) {
      direction = true;
      posDir = 1;
      atrTS = c.close - a * atrMult;
      hardSL = c.close * (1 - maxLossPercent / 100);
      tp1 = c.close + a * targetStepMult;
      tp2 = c.close + a * targetStepMult * 2;
      tp3 = c.close + a * targetStepMult * 3;
      tp4 = c.close + a * targetStepMult * 4;
      if (showSig) {
        entryMarkers.push({ time: t, value: c.low, color: bullColor });
        buySellLabels.push({ time: t, value: c.close, color: bullColor });
      }
    }

    if (bearCHoCH) {
      direction = false;
      posDir = -1;
      atrTS = c.close + a * atrMult;
      hardSL = c.close * (1 + maxLossPercent / 100);
      tp1 = c.close - a * targetStepMult;
      tp2 = c.close - a * targetStepMult * 2;
      tp3 = c.close - a * targetStepMult * 3;
      tp4 = c.close - a * targetStepMult * 4;
      if (showSig) {
        entryMarkers.push({ time: t, value: c.high, color: bearColor });
        buySellLabels.push({ time: t, value: c.close, color: bearColor });
      }
    }

    if (posDir === 1) {
      atrTS = Math.max(atrTS ?? (c.close - a * atrMult), c.close - a * atrMult);
      const liveSL = Math.max(atrTS, hardSL);
      if (showStop) slLines.push({ time: t, value: liveSL, color: 'rgba(255,82,82,0.85)' });
      if (showTP) {
        tpLines.push({ time: t, value: tp1, color: 'rgba(52,230,126,0.70)' });
        tpLines.push({ time: t, value: tp2, color: 'rgba(52,230,126,0.60)' });
        tpLines.push({ time: t, value: tp3, color: 'rgba(52,230,126,0.50)' });
        tpLines.push({ time: t, value: tp4, color: 'rgba(52,230,126,0.40)' });
      }
      if (c.low <= liveSL) {
        posDir = 0;
      }
    } else if (posDir === -1) {
      atrTS = Math.min(atrTS ?? (c.close + a * atrMult), c.close + a * atrMult);
      const liveSL = Math.min(atrTS, hardSL);
      if (showStop) slLines.push({ time: t, value: liveSL, color: 'rgba(255,82,82,0.85)' });
      if (showTP) {
        tpLines.push({ time: t, value: tp1, color: 'rgba(255,82,241,0.70)' });
        tpLines.push({ time: t, value: tp2, color: 'rgba(255,82,241,0.60)' });
        tpLines.push({ time: t, value: tp3, color: 'rgba(255,82,241,0.50)' });
        tpLines.push({ time: t, value: tp4, color: 'rgba(255,82,241,0.40)' });
      }
      if (c.high >= liveSL) {
        posDir = 0;
      }
    }
  }

  return {
    biasZones,
    tpLines,
    slLines,
    entryMarkers,
    chochZones,
    buySellLabels,
  };
}
