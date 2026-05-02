/**
 * tests/backtest/runner.ts
 *
 * Phase 3 backtest — simulates the bot trading cycle on historical Binance
 * 1-minute candle data and computes key performance metrics.
 *
 * Usage:
 *   npx tsx tests/backtest/runner.ts
 *
 * Data is fetched from Binance public API (no credentials needed).
 * Results are saved to tests/backtest/baselines/<run-id>.json
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { calculateSieuXuHuong } from '@/lib/indicators';
import { calcPositionSize, calcSlDistanceFromAtr, calcStopPrice } from '@/lib/services/sizing.service';
import type { DaemonSettings } from '@/lib/bot-engine/types';
import { DEFAULT_DAEMON_SETTINGS } from '@/lib/bot-engine/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', '1000PEPEUSDT'];
const TIMEFRAME = '1m';
// 30 days × 1440 bars/day = 43200 bars (Binance max per request = 1500, so we paginate)
const DAYS = 30;
const TOTAL_BARS = DAYS * 1440;
const EQUITY_INITIAL = 1000; // USDT simulated account
const RISK_PERCENT = 1.0;    // % of equity per trade
const ATR_MULT = 1.5;        // ATR multiplier for SL
const LEVERAGE = 10;

const settings: DaemonSettings = {
  ...DEFAULT_DAEMON_SETTINGS,
  riskPercent: RISK_PERCENT,
  atrMultiplier: ATR_MULT,
  leverageByExchange: { binance: LEVERAGE, hyperliquid: LEVERAGE },
  paperMode: true,
};

interface SimpleCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  symbol: string;
  side: 'long' | 'short';
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  size: number;
  notional: number;
  pnl: number;
  reason: string;
  stopPrice: number;
}

interface SymbolResult {
  symbol: string;
  trades: Trade[];
  equity: number;
  equityCurve: number[];
  maxDrawdown: number;
  winRate: number;
  totalPnl: number;
  totalTrades: number;
  avgPnlPerTrade: number;
  sharpeRatio: number;
}

interface BacktestReport {
  runId: string;
  generatedAt: string;
  phase: 'phase3';
  config: {
    symbols: string[];
    timeframe: string;
    days: number;
    initialEquity: number;
    riskPercent: number;
    atrMultiplier: number;
    leverage: number;
  };
  symbols: SymbolResult[];
  aggregate: {
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    avgPnlPerTrade: number;
    maxDrawdown: number;
  };
}

// ─── Binance fetch ────────────────────────────────────────────────────────────

async function fetchCandles(symbol: string, interval: string, totalBars: number): Promise<SimpleCandle[]> {
  const BASE = 'https://fapi.binance.com';
  const MAX_LIMIT = 1500;
  const all: SimpleCandle[] = [];
  let endTime: number | undefined;

  while (all.length < totalBars) {
    const limit = Math.min(MAX_LIMIT, totalBars - all.length);
    let url = `${BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    if (endTime) url += `&endTime=${endTime}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Binance klines error (${res.status}): ${txt.slice(0, 300)}`);
    }
    const data = (await res.json()) as any[][];
    if (!data.length) break;

    const batch: SimpleCandle[] = data.map((k) => ({
      time: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));

    all.unshift(...batch); // prepend older data
    endTime = batch[0].time - 1;

    if (data.length < limit) break;
    await new Promise((r) => setTimeout(r, 300)); // rate limit
  }

  return all.sort((a, b) => a.time - b.time);
}

// ─── ATR calculation ──────────────────────────────────────────────────────────

function calcAtr(candles: SimpleCandle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const recent = candles.slice(-(period + 1));
  let sum = 0;
  for (let i = 1; i < recent.length; i++) {
    sum += Math.max(
      recent[i].high - recent[i].low,
      Math.abs(recent[i].high - recent[i - 1].close),
      Math.abs(recent[i].low - recent[i - 1].close)
    );
  }
  return sum / period;
}

// ─── Signal scan (same logic as daemon) ──────────────────────────────────────

function getSignal(candles: SimpleCandle[]): { signal: 'bullish' | 'bearish'; isFallback: boolean } | null {
  if (candles.length < 50) return null;
  const result = calculateSieuXuHuong(
    candles as any,
    settings.pivLen,
    settings.smaMin,
    settings.smaMax,
    settings.smaMult,
    settings.trendLen,
    settings.ritchiAtrMult,
    settings.tpMult,
  );
  if (!result?.buySignals || !result?.sellSignals) return null;
  const lastIndex = result.buySignals.length - 1;
  if (lastIndex < 0) return null;

  const lookback = Math.max((settings.pivLen ?? 5) + 2, 10);
  const recentBuy = result.buySignals.slice(-lookback).some(Boolean);
  const recentSell = result.sellSignals.slice(-lookback).some(Boolean);
  const directionValue = result.direction[lastIndex];

  let isFallback = false;
  let trendBuy = false, trendSell = false;

  if (!recentBuy && !recentSell) {
    const trendAge = result.trendAge[lastIndex] ?? 0;
    const minAge = Math.max(0.2, Math.min(0.35, 20 / settings.trendLen));
    const stableBars = 4;
    const window = result.direction.slice(Math.max(0, lastIndex - stableBars + 1), lastIndex + 1);
    const stable = window.length === stableBars && directionValue !== undefined && window.every((v) => v === directionValue);
    if (trendAge >= minAge && stable) {
      trendBuy = directionValue === true;
      trendSell = directionValue === false;
      isFallback = true;
    }
  }

  if (!recentBuy && !recentSell && !trendBuy && !trendSell) return null;
  return {
    signal: (recentBuy || trendBuy) ? 'bullish' : 'bearish',
    isFallback,
  };
}

// ─── Backtest simulation ──────────────────────────────────────────────────────

function simulateSymbol(symbol: string, allCandles: SimpleCandle[]): SymbolResult {
  const trades: Trade[] = [];
  let equity = EQUITY_INITIAL;
  const equityCurve: number[] = [equity];

  let position: {
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    entryTime: number;
    notional: number;
    stopPrice: number;
  } | null = null;

  const WARMUP = 200;         // bars before first signal check
  const LOOKBACK = 500;       // fixed rolling window to keep calculateSieuXuHuong O(1) per bar

  for (let i = WARMUP; i < allCandles.length; i++) {
    const window = allCandles.slice(Math.max(0, i - LOOKBACK + 1), i + 1);
    const current = allCandles[i];
    const currentPrice = current.close;

    // Check if stop hit (using high/low of candle)
    if (position) {
      const stopHit = position.side === 'long'
        ? current.low <= position.stopPrice
        : current.high >= position.stopPrice;

      if (stopHit) {
        const exitPrice = position.stopPrice; // simulated fill at stop
        const pnl = position.side === 'long'
          ? (exitPrice - position.entryPrice) * position.size
          : (position.entryPrice - exitPrice) * position.size;
        equity += pnl;
        trades.push({
          symbol,
          side: position.side,
          entryTime: position.entryTime,
          exitTime: current.time,
          entryPrice: position.entryPrice,
          exitPrice,
          size: position.size,
          notional: position.notional,
          pnl,
          reason: 'stop-hit',
          stopPrice: position.stopPrice,
        });
        equityCurve.push(equity);
        position = null;
        continue;
      }
    }

    // Compute signal every bar
    const sig = getSignal(window);
    if (!sig) continue;
    const signalSide: 'long' | 'short' = sig.signal === 'bullish' ? 'long' : 'short';

    // No position → open
    if (!position) {
      const atr = calcAtr(window, 14);
      const slDist = ATR_MULT > 0 && atr > 0
        ? calcSlDistanceFromAtr(atr, ATR_MULT)
        : currentPrice * 0.015;
      const size = calcPositionSize({ equity, riskPercent: RISK_PERCENT, slDistance: slDist });
      const stopPrice = calcStopPrice(currentPrice, signalSide, slDist);
      position = {
        side: signalSide,
        size,
        entryPrice: currentPrice,
        entryTime: current.time,
        notional: currentPrice * size,
        stopPrice,
      };
      continue;
    }

    // Same side → hold
    if (position.side === signalSide) continue;

    // Opposite → close + reverse
    const exitPrice = currentPrice;
    const pnl = position.side === 'long'
      ? (exitPrice - position.entryPrice) * position.size
      : (position.entryPrice - exitPrice) * position.size;
    equity += pnl;
    trades.push({
      symbol,
      side: position.side,
      entryTime: position.entryTime,
      exitTime: current.time,
      entryPrice: position.entryPrice,
      exitPrice,
      size: position.size,
      notional: position.notional,
      pnl,
      reason: 'reversal',
      stopPrice: position.stopPrice,
    });
    equityCurve.push(equity);

    // Open in new direction
    const atr = calcAtr(window, 14);
    const slDist = ATR_MULT > 0 && atr > 0
      ? calcSlDistanceFromAtr(atr, ATR_MULT)
      : currentPrice * 0.015;
    const size = calcPositionSize({ equity, riskPercent: RISK_PERCENT, slDistance: slDist });
    const stopPrice = calcStopPrice(currentPrice, signalSide, slDist);
    position = {
      side: signalSide,
      size,
      entryPrice: currentPrice,
      entryTime: current.time,
      notional: currentPrice * size,
      stopPrice,
    };
  }

  // Close any open position at end of data
  if (position && allCandles.length > 0) {
    const last = allCandles[allCandles.length - 1];
    const exitPrice = last.close;
    const pnl = position.side === 'long'
      ? (exitPrice - position.entryPrice) * position.size
      : (position.entryPrice - exitPrice) * position.size;
    equity += pnl;
    trades.push({
      symbol,
      side: position.side,
      entryTime: position.entryTime,
      exitTime: last.time,
      entryPrice: position.entryPrice,
      exitPrice,
      size: position.size,
      notional: position.notional,
      pnl,
      reason: 'end-of-data',
      stopPrice: position.stopPrice,
    });
    equityCurve.push(equity);
  }

  // Compute metrics
  const wins = trades.filter((t) => t.pnl > 0).length;
  const totalPnl = equity - EQUITY_INITIAL;
  const winRate = trades.length > 0 ? wins / trades.length : 0;
  const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;

  // Max drawdown
  let peak = EQUITY_INITIAL;
  let maxDD = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = (peak - eq) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe (daily returns from equity curve)
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  let sharpe = 0;
  if (returns.length > 1) {
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
    sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;
  }

  return {
    symbol,
    trades,
    equity,
    equityCurve,
    maxDrawdown: maxDD,
    winRate,
    totalPnl,
    totalTrades: trades.length,
    avgPnlPerTrade: avgPnl,
    sharpeRatio: sharpe,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const runId = `phase3-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
  console.log(`\n=== HyperScalper Phase 3 Backtest ===`);
  console.log(`Run ID: ${runId}`);
  console.log(`Symbols: ${SYMBOLS.join(', ')}`);
  console.log(`Period: last ${DAYS} days @ ${TIMEFRAME}\n`);

  const symbolResults: SymbolResult[] = [];

  for (const symbol of SYMBOLS) {
    console.log(`Fetching ${symbol} candles (${TOTAL_BARS} bars)…`);
    let candles: SimpleCandle[];
    try {
      candles = await fetchCandles(symbol, TIMEFRAME, TOTAL_BARS);
    } catch (err) {
      console.error(`  SKIP ${symbol}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    console.log(`  Got ${candles.length} candles. Running simulation…`);

    const result = simulateSymbol(symbol, candles);
    symbolResults.push(result);

    console.log(`  Trades: ${result.totalTrades}  Win: ${(result.winRate * 100).toFixed(1)}%  PnL: $${result.totalPnl.toFixed(2)}  MaxDD: ${(result.maxDrawdown * 100).toFixed(1)}%  Sharpe: ${result.sharpeRatio.toFixed(2)}`);
  }

  // Aggregate
  const aggregate = {
    totalTrades: symbolResults.reduce((s, r) => s + r.totalTrades, 0),
    totalPnl: symbolResults.reduce((s, r) => s + r.totalPnl, 0),
    winRate: symbolResults.length > 0
      ? symbolResults.reduce((s, r) => s + r.winRate, 0) / symbolResults.length
      : 0,
    avgPnlPerTrade: 0,
    maxDrawdown: Math.max(...symbolResults.map((r) => r.maxDrawdown), 0),
  };
  aggregate.avgPnlPerTrade = aggregate.totalTrades > 0
    ? aggregate.totalPnl / aggregate.totalTrades
    : 0;

  console.log(`\n─── Aggregate ─────────────────────────────────────────────`);
  console.log(`Total Trades:  ${aggregate.totalTrades}`);
  console.log(`Total PnL:     $${aggregate.totalPnl.toFixed(2)} (${((aggregate.totalPnl / (EQUITY_INITIAL * SYMBOLS.length)) * 100).toFixed(1)}%)`);
  console.log(`Win Rate:      ${(aggregate.winRate * 100).toFixed(1)}%`);
  console.log(`Avg PnL/Trade: $${aggregate.avgPnlPerTrade.toFixed(4)}`);
  console.log(`Max Drawdown:  ${(aggregate.maxDrawdown * 100).toFixed(1)}%`);
  console.log(`───────────────────────────────────────────────────────────\n`);

  const report: BacktestReport = {
    runId,
    generatedAt: new Date().toISOString(),
    phase: 'phase3',
    config: {
      symbols: SYMBOLS,
      timeframe: TIMEFRAME,
      days: DAYS,
      initialEquity: EQUITY_INITIAL,
      riskPercent: RISK_PERCENT,
      atrMultiplier: ATR_MULT,
      leverage: LEVERAGE,
    },
    symbols: symbolResults,
    aggregate,
  };

  // Save baseline
  const baselineDir = join(process.cwd(), 'tests', 'backtest', 'baselines');
  if (!existsSync(baselineDir)) mkdirSync(baselineDir, { recursive: true });

  const reportPath = join(baselineDir, `${runId}.json`);
  const baselinePath = join(baselineDir, 'phase3-baseline.json');

  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  writeFileSync(baselinePath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`Saved: ${reportPath}`);
  console.log(`Baseline: ${baselinePath}`);
  console.log(`\nBacktest complete.`);
}

main().catch((err) => {
  console.error('Backtest failed:', err);
  process.exit(1);
});
