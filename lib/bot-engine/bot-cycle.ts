/**
 * bot-cycle.ts – Core trading cycle logic for the daemon.
 *
 * Ported from useBotTradingStore.ts runCycle() + scanner.service.ts scanRitchiTrend().
 * No React / Zustand / browser dependencies – pure Node.js.
 */

import { calculateSieuXuHuong } from '@/lib/indicators';
import {
  getAllPositions,
  upsertPosition,
  deletePosition,
  getDailyStats,
  upsertDailyStats,
  insertLog,
  getBotState,
  setBotState,
  getLastActedSignal,
  setLastActedSignal,
} from '@/lib/services/db.service';
import { AlertService } from '@/lib/services/alert.service';
import { calcPositionSize, calcSlDistanceFromAtr, calcStopPrice } from '@/lib/services/sizing.service';
import type { BinanceDirectClient } from './binance-direct';
import type {
  DaemonSettings,
  DaemonPosition,
  DaemonDailyStats,
  BotSignal,
  SimpleCandle,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _logCounter = 0;
function newLogId(): string {
  return `d_${Date.now()}_${++_logCounter}`;
}

function getDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultStats(dayKey: string): DaemonDailyStats {
  return { dayKey, totalTradedNotional: 0, realizedPnl: 0, tradingDisabled: false };
}

function loadStats(): DaemonDailyStats {
  const dayKey = getDayKey();
  const row = getDailyStats(dayKey);
  if (!row) return defaultStats(dayKey);
  return {
    dayKey: row.day_key,
    totalTradedNotional: row.total_traded_notional,
    realizedPnl: row.realized_pnl,
    tradingDisabled: row.trading_disabled === 1,
  };
}

function saveStats(stats: DaemonDailyStats): void {
  upsertDailyStats({
    day_key: stats.dayKey,
    total_traded_notional: stats.totalTradedNotional,
    realized_pnl: stats.realizedPnl,
    trading_disabled: stats.tradingDisabled ? 1 : 0,
  });
}

function loadPositions(): Record<string, DaemonPosition> {
  const rows = getAllPositions();
  const map: Record<string, DaemonPosition> = {};
  for (const r of rows) {
    map[r.symbol] = {
      symbol: r.symbol,
      side: r.side,
      size: r.size,
      entryPrice: r.entry_price,
      openedAt: r.opened_at,
      notional: r.notional,
      safetyStopOrderId: r.safety_stop_order_id,
    };
  }
  return map;
}

function savePosition(pos: DaemonPosition): void {
  upsertPosition({
    symbol: pos.symbol,
    side: pos.side,
    size: pos.size,
    entry_price: pos.entryPrice,
    opened_at: pos.openedAt,
    notional: pos.notional,
    safety_stop_order_id: pos.safetyStopOrderId,
  });
}

function log(
  symbol: string,
  indicator: string,
  action: string,
  message: string,
  extras: Partial<{
    side: string;
    signal: string;
    price: number;
    size: number;
    realized_pnl: number;
    close_price: number;
    open_price: number;
    slippage_bps: number;
  }> = {}
): void {
  const ts = Date.now();
  console.log(`[BotCycle ${new Date(ts).toISOString()}] [${action.toUpperCase()}] ${symbol}: ${message}`);
  insertLog({
    id: newLogId(),
    timestamp: ts,
    symbol,
    indicator,
    action,
    message,
    ...extras,
  });
}

// ─── Ritchi signal scan ───────────────────────────────────────────────────────

interface ScanSignal {
  signalType: BotSignal;
  isFallback: boolean;
}

function scanRitchi(
  candles: SimpleCandle[],
  settings: DaemonSettings
): ScanSignal | null {
  if (candles.length < 50) return null;

  // calculateSieuXuHuong expects candles with open/high/low/close (FullCandleData compatible)
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

  const signalLookback = Math.max((settings.pivLen ?? 5) + 2, 10);
  const recentBuy = result.buySignals.slice(-signalLookback).some(Boolean);
  const recentSell = result.sellSignals.slice(-signalLookback).some(Boolean);
  const directionValue = result.direction[lastIndex];

  let isFallback = false;
  let trendBuy = false;
  let trendSell = false;

  if (!recentBuy && !recentSell) {
    const trendAge = result.trendAge[lastIndex] ?? 0;
    const minAge = Math.max(0.2, Math.min(0.35, 20 / settings.trendLen));
    const stableBars = 4;
    const window = result.direction.slice(Math.max(0, lastIndex - stableBars + 1), lastIndex + 1);
    const directionStable = window.length === stableBars
      && directionValue !== undefined
      && window.every((v) => v === directionValue);

    if (trendAge >= minAge && directionStable) {
      trendBuy = directionValue === true;
      trendSell = directionValue === false;
      isFallback = true;
    }
  }

  const useBuy = recentBuy || trendBuy;
  const useSell = recentSell || trendSell;

  if (!useBuy && !useSell) return null;
  return { signalType: useBuy ? 'bullish' : 'bearish', isFallback };
}

// ─── Main cycle ───────────────────────────────────────────────────────────────

export async function runBotCycle(
  client: BinanceDirectClient,
  settings: DaemonSettings,
  trackedSymbols: string[],
  alerts: AlertService
): Promise<void> {
  if (!settings.enabled || trackedSymbols.length === 0) return;

  // Refresh daily stats (reset if new day)
  let stats = loadStats();
  if (stats.dayKey !== getDayKey()) {
    stats = defaultStats(getDayKey());
    saveStats(stats);
  }

  if (stats.tradingDisabled) {
    console.log('[BotCycle] Trading disabled for today (daily loss limit). Skipping cycle.');
    return;
  }

  const positions = loadPositions();
  const indicator = settings.indicator;

  // Handle close_all_requested flag (set by /api/bot/close-all)
  if (getBotState('close_all_requested') === '1') {
    setBotState('close_all_requested', '0');
    for (const pos of Object.values(positions)) {
      await forceClosePosition(pos, client, settings, stats, indicator, positions, alerts, 'manual-close-all');
    }
    saveStats(stats);
    return;
  }

  // Get account balance for risk sizing (Fix #7)
  let equity = 0;
  if (!settings.paperMode && settings.riskPercent > 0) {
    try {
      const bal = await client.getAccountBalance();
      equity = bal.equity;
    } catch (err) {
      console.warn('[BotCycle] Failed to fetch account balance for sizing:', err instanceof Error ? err.message : err);
    }
  }

  // Post-reversal cooldown tracking (in-memory, reset on daemon restart)
  const lastReversalAt: Record<string, number> = {};

  for (const symbol of trackedSymbols) {
    try {
      await processSymbol(
        symbol,
        client,
        settings,
        positions,
        stats,
        indicator,
        equity,
        lastReversalAt,
        alerts
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(symbol, indicator, 'error', `Cycle error: ${msg}`);
      await alerts.sendError(`runCycle(${symbol})`, msg);
    }
  }

  // Persist updated stats
  saveStats(stats);

  // Update heartbeat
  setBotState('last_heartbeat', new Date().toISOString());
}

async function processSymbol(
  symbol: string,
  client: BinanceDirectClient,
  settings: DaemonSettings,
  positions: Record<string, DaemonPosition>,
  stats: DaemonDailyStats,
  indicator: string,
  equity: number,
  lastReversalAt: Record<string, number>,
  alerts: AlertService
): Promise<void> {
  // Check for per-symbol close request
  const closeKey = `close_position_${symbol.toUpperCase()}`;
  if (getBotState(closeKey) === '1') {
    setBotState(closeKey, '0');
    const pos = positions[symbol];
    if (pos) {
      await forceClosePosition(pos, client, settings, stats, indicator, positions, alerts, 'manual');
    }
    return;
  }

  // 1. Fetch candles
  const candles = await client.getCandles(symbol, settings.timeframe, 200);
  if (!candles || candles.length < 50) {
    log(symbol, indicator, 'skip', 'Not enough candles for signal computation');
    return;
  }

  // 2. Compute signal
  let signalResult: ScanSignal | null = null;
  if (indicator === 'ritchi') {
    signalResult = scanRitchi(candles, settings);
  }
  // Other indicators (kalmanTrend, macdReversal) not yet ported — skip gracefully
  if (!signalResult) {
    log(symbol, indicator, 'skip', 'No signal this cycle');
    return;
  }

  // 3. Post-reversal fallback cooldown
  const REVERSAL_COOLDOWN_BARS = 3;
  const intervalMs = settings.timeframe === '5m' ? 5 * 60 * 1000 : 60 * 1000;
  const cooldownMs = intervalMs * REVERSAL_COOLDOWN_BARS;
  const timeSinceReversal = Date.now() - (lastReversalAt[symbol] ?? 0);
  if (signalResult.isFallback && timeSinceReversal < cooldownMs) {
    log(symbol, indicator, 'skip', `Fallback signal suppressed — post-reversal cooldown (${Math.ceil((cooldownMs - timeSinceReversal) / 1000)}s remaining)`);
    return;
  }

  const signal = signalResult.signalType;
  const signalSide: 'long' | 'short' = signal === 'bullish' ? 'long' : 'short';
  const currentPosition = positions[symbol] ?? null;

  // 4. No position → open (B-02: stale-signal guard)
  if (!currentPosition) {
    const lastActed = getLastActedSignal(symbol, settings.timeframe);
    if (lastActed === signalSide) {
      // Signal hasn't flipped since last position — this is a stale lookback signal, skip it
      log(symbol, indicator, 'skip', `Stale signal suppressed — last acted=${lastActed}, current=${signalSide} (no flip detected)`);
      return;
    }
    await openPosition(symbol, signalSide, client, settings, stats, positions, indicator, equity, candles, alerts);
    return;
  }

  // 5. Same side → hold
  if (currentPosition.side === signalSide) {
    return;
  }

  // 6. Opposite side → close + reverse
  await closeAndReversePosition(
    symbol,
    signalSide,
    currentPosition,
    client,
    settings,
    stats,
    positions,
    indicator,
    equity,
    candles,
    lastReversalAt,
    alerts
  );
}

// ─── Open new position ────────────────────────────────────────────────────────

async function openPosition(
  symbol: string,
  side: 'long' | 'short',
  client: BinanceDirectClient,
  settings: DaemonSettings,
  stats: DaemonDailyStats,
  positions: Record<string, DaemonPosition>,
  indicator: string,
  equity: number,
  candles: SimpleCandle[],
  alerts: AlertService
): Promise<void> {
  const leverage = settings.leverageByExchange[settings.exchange] ?? 10;

  // Determine size
  let midPrice: number;
  try {
    midPrice = await client.getMidPrice(symbol);
  } catch {
    return;
  }
  if (!Number.isFinite(midPrice) || midPrice <= 0) return;

  const meta = await client.getSymbolMeta(symbol);

  // ATR-based SL distance (Fix #6) — sync with indicator: ATR(50) instead of ATR(14)
  const atr = client.calcAtr(candles, 50);
  const slDist = settings.atrMultiplier > 0 && atr > 0
    ? calcSlDistanceFromAtr(atr, settings.atrMultiplier)
    : midPrice * (settings.safetyStopLossPercent / 100);

  // Risk-based sizing (Fix #7) or fallback to fixed margin
  let rawSize: number;
  if (settings.riskPercent > 0 && equity > 0) {
    rawSize = calcPositionSize({ equity, riskPercent: settings.riskPercent, slDistance: slDist });
  } else {
    rawSize = (settings.initialMarginUsdt * leverage) / midPrice;
  }

  let numericSize = rawSize;
  let safetyStopOrderId: string | null = null;

  if (!settings.paperMode) {
    try {
      await client.setLeverage(symbol, leverage);
    } catch (err) {
      console.warn(`[BotCycle] setLeverage failed for ${symbol}:`, err instanceof Error ? err.message : err);
    }

    const sizeStr = client.ensureMinNotional(rawSize, midPrice, meta, 10);
    numericSize = parseFloat(sizeStr);

    const binanceSide = side === 'long' ? 'BUY' : 'SELL';
    await client.openMarketOrder(symbol, binanceSide, sizeStr);

    // Place safety stop (Fix #6: use ATR-based stop price)
    try {
      const stopPx = calcStopPrice(midPrice, side, slDist);
      const formattedStop = client.formatPrice(stopPx, meta);
      const formattedSize = client.formatSize(numericSize, meta);
      const slSide = side === 'long' ? 'SELL' : 'BUY';
      safetyStopOrderId = String(await client.placeStopMarket(symbol, slSide, formattedSize, formattedStop));
    } catch (slErr) {
      log(symbol, indicator, 'error', `Failed to place safety stop: ${slErr instanceof Error ? slErr.message : slErr}`);
    }
  }

  const pos: DaemonPosition = {
    symbol,
    side,
    size: numericSize,
    entryPrice: midPrice,
    openedAt: Date.now(),
    notional: midPrice * numericSize,
    safetyStopOrderId,
  };
  positions[symbol] = pos;
  savePosition(pos);
  // B-02: record which signal side triggered this open so stale-signal guard works correctly
  setLastActedSignal(symbol, settings.timeframe, side);

  stats.totalTradedNotional += pos.notional;

  const signalLabel = side === 'long' ? 'bullish' : 'bearish';
  log(symbol, indicator, 'open', settings.paperMode
    ? `[PAPER] Opened ${side.toUpperCase()} signal=${signalLabel}`
    : `Opened ${side.toUpperCase()} signal=${signalLabel}`, {
    side,
    signal: side === 'long' ? 'bullish' : 'bearish',
    price: midPrice,
    size: numericSize,
  });

  await alerts.sendPositionOpen(symbol, side, midPrice, numericSize);
}

// ─── Close + reverse position ─────────────────────────────────────────────────

async function closeAndReversePosition(
  symbol: string,
  newSide: 'long' | 'short',
  currentPosition: DaemonPosition,
  client: BinanceDirectClient,
  settings: DaemonSettings,
  stats: DaemonDailyStats,
  positions: Record<string, DaemonPosition>,
  indicator: string,
  equity: number,
  candles: SimpleCandle[],
  lastReversalAt: Record<string, number>,
  alerts: AlertService
): Promise<void> {
  let closePrice: number;
  try {
    closePrice = await client.getMidPrice(symbol);
  } catch {
    return;
  }
  if (!Number.isFinite(closePrice) || closePrice <= 0) return;

  // Cancel existing safety stop before close
  if (!settings.paperMode && currentPosition.safetyStopOrderId) {
    try {
      await client.cancelOrder(symbol, Number(currentPosition.safetyStopOrderId));
    } catch { /* already gone */ }
  }

  // Close existing position (B-01: use closeMarketOrder so hedge mode positionSide=LONG/SHORT is correct)
  if (!settings.paperMode) {
    const meta = await client.getSymbolMeta(symbol);
    const closeSide = currentPosition.side === 'long' ? 'SELL' : 'BUY';
    const closeSize = client.formatSize(currentPosition.size, meta);
    await client.closeMarketOrder(symbol, closeSide, closeSize);
  }

  const pnlPerCoin = currentPosition.side === 'long'
    ? closePrice - currentPosition.entryPrice
    : currentPosition.entryPrice - closePrice;
  const realizedPnl = pnlPerCoin * currentPosition.size;

  const closeNotional = closePrice * currentPosition.size;
  stats.totalTradedNotional += closeNotional;
  stats.realizedPnl += realizedPnl;

  const nextLoss = Math.max(0, -stats.realizedPnl);
  const maxLossUsd = stats.totalTradedNotional > 0
    ? (stats.totalTradedNotional * settings.maxLossPercentPerDay) / 100
    : 0;
  const hitDailyLoss = maxLossUsd > 0 && nextLoss >= maxLossUsd;

  delete positions[symbol];
  deletePosition(symbol);

  log(symbol, indicator, 'close-reversal',
    settings.paperMode
      ? `[PAPER] Closed ${currentPosition.side.toUpperCase()} → reversal → ${newSide.toUpperCase()}`
      : `Closed ${currentPosition.side.toUpperCase()} due to reversal signal → ${newSide.toUpperCase()}`, {
    side: currentPosition.side,
    price: closePrice,
    size: currentPosition.size,
    realized_pnl: realizedPnl,
    signal: newSide === 'long' ? 'bullish' : 'bearish',
  });

  await alerts.sendPositionClose(symbol, currentPosition.side, closePrice, currentPosition.size, realizedPnl, 'reversal');

  if (hitDailyLoss) {
    stats.tradingDisabled = true;
    setBotState('is_running', '0');
    log(symbol, indicator, 'info', 'Daily loss limit reached — trading disabled for today');
    await alerts.sendDailyLimitReached(stats.realizedPnl);
    return;
  }

  lastReversalAt[symbol] = Date.now();

  // Re-enter in new direction
  await openPosition(symbol, newSide, client, settings, stats, positions, indicator, equity, candles, alerts);
}

// ─── Force close a position (manual or close-all) ─────────────────────────────

async function forceClosePosition(
  pos: DaemonPosition,
  client: BinanceDirectClient,
  settings: DaemonSettings,
  stats: DaemonDailyStats,
  indicator: string,
  positions: Record<string, DaemonPosition>,
  alerts: AlertService,
  reason: string
): Promise<void> {
  const { symbol } = pos;
  let closePrice: number;
  try {
    closePrice = await client.getMidPrice(symbol);
  } catch {
    return;
  }
  if (!Number.isFinite(closePrice) || closePrice <= 0) return;

  if (!settings.paperMode && pos.safetyStopOrderId) {
    try {
      await client.cancelOrder(symbol, Number(pos.safetyStopOrderId));
    } catch { /* already gone */ }
  }

  if (!settings.paperMode) {
    const meta = await client.getSymbolMeta(symbol);
    const closeSide = pos.side === 'long' ? 'SELL' : 'BUY';
    // B-01: use closeMarketOrder so hedge mode sends correct positionSide
    await client.closeMarketOrder(symbol, closeSide, client.formatSize(pos.size, meta));
  }

  const pnlPerCoin = pos.side === 'long'
    ? closePrice - pos.entryPrice
    : pos.entryPrice - closePrice;
  const realizedPnl = pnlPerCoin * pos.size;

  stats.totalTradedNotional += closePrice * pos.size;
  stats.realizedPnl += realizedPnl;

  delete positions[symbol];
  deletePosition(symbol);

  log(symbol, indicator, `close-${reason}`,
    settings.paperMode
      ? `[PAPER] Force-closed ${pos.side.toUpperCase()} reason=${reason}`
      : `Force-closed ${pos.side.toUpperCase()} reason=${reason}`, {
    side: pos.side,
    price: closePrice,
    size: pos.size,
    realized_pnl: realizedPnl,
  });

  await alerts.sendPositionClose(symbol, pos.side, closePrice, pos.size, realizedPnl, reason);
}
