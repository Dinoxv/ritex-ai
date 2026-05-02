/**
 * types.ts – Shared types used by the bot engine daemon.
 * These mirror the types in useBotTradingStore.ts but are standalone (no React deps).
 */

export type BotSignal = 'bullish' | 'bearish';
export type BotPositionSide = 'long' | 'short';
export type BotIndicator = 'ritchi' | 'kalmanTrend' | 'macdReversal';
export type BotExchange = 'binance' | 'hyperliquid';

export interface DaemonSettings {
  enabled: boolean;
  indicator: BotIndicator;
  paperMode: boolean;
  exchange: BotExchange;
  timeframe: '1m' | '5m';
  scanIntervalSec: number;
  initialMarginUsdt: number;
  maxLossPercentPerDay: number;
  leverageByExchange: { binance: number; hyperliquid: number };
  symbolMode: 'auto' | 'manual' | 'favourite';
  manualSymbols: string[];
  /** Symbols included when symbolMode='favourite' */
  favouriteSymbols: string[];
  safetyStopLossPercent: number;
  /** ATR multiplier for dynamic SL distance (Fix #6). Default: 1.5 */
  atrMultiplier: number;
  /** % of equity to risk per trade (Fix #7). Default: 1.0. 0 = disabled (use initialMarginUsdt) */
  riskPercent: number;
  /** Telegram bot token for alerts (Fix #8) */
  telegramBotToken?: string;
  /** Telegram chat id for alerts (Fix #8) */
  telegramChatId?: string;
  /** Webhook URL for alerts (Fix #8) */
  alertWebhookUrl?: string;
  // Ritchi indicator params (passed from frontend sieuXuHuong settings)
  pivLen: number;
  smaMin: number;
  smaMax: number;
  smaMult: number;
  trendLen: number;
  ritchiAtrMult: number;
  tpMult: number;
}

export const DEFAULT_DAEMON_SETTINGS: DaemonSettings = {
  enabled: false,
  indicator: 'ritchi',
  paperMode: false,
  exchange: 'binance',
  timeframe: '1m',
  scanIntervalSec: 30,
  initialMarginUsdt: 25,
  maxLossPercentPerDay: 3,
  leverageByExchange: { binance: 10, hyperliquid: 10 },
  symbolMode: 'manual',
  manualSymbols: [],
  favouriteSymbols: [],
  safetyStopLossPercent: 1.5,
  atrMultiplier: 1.5,
  riskPercent: 1.0,
  pivLen: 5,
  smaMin: 5,
  smaMax: 50,
  smaMult: 1.0,
  trendLen: 100,
  ritchiAtrMult: 2.0,
  tpMult: 3.0,
};

export interface DaemonPosition {
  symbol: string;
  side: BotPositionSide;
  size: number;
  entryPrice: number;
  openedAt: number;
  notional: number;
  safetyStopOrderId: string | null;
}

export interface DaemonDailyStats {
  dayKey: string;
  totalTradedNotional: number;
  realizedPnl: number;
  tradingDisabled: boolean;
}

export interface SimpleCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolMeta {
  tickSize: number;
  sizeDecimals: number;
}
