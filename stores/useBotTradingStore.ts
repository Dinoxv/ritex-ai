import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExchangeTradingService } from '@/lib/services/types';
import { ScannerService } from '@/lib/services/scanner.service';
import { useSettingsStore } from './useSettingsStore';
import { useTopSymbolsStore } from './useTopSymbolsStore';
import { useSymbolVolatilityStore } from './useSymbolVolatilityStore';
import { useDexStore } from './useDexStore';
import toast from 'react-hot-toast';
import type { BotIndicatorType } from '@/models/Settings';
import { calculateSieuXuHuong } from '@/lib/indicators';
import { INTERVAL_TO_MS } from '@/lib/time-utils';
import { getRawPositionSignedSize, getRawPositionSymbol } from '@/lib/utils/exchange-normalizers';
import type { TimeInterval } from '@/types';
import { calcAtr, calcSlDistanceFromAtr, calcStopPrice } from '@/lib/services/sizing.service';

type BotSignal = 'bullish' | 'bearish';
type BotPositionSide = 'long' | 'short';

interface BotTrackedPosition {
  symbol: string;
  side: BotPositionSide;
  size: number;
  entryPrice: number;
  openedAt: number;
  notional: number;
  safetyStopOrderId: string | null;
}

interface BotDailyStats {
  dayKey: string;
  totalTradedNotional: number;
  realizedPnl: number;
  realizedPnlBySymbol: Record<string, number>;
  tradingDisabled: boolean;
}

type BotLogAction =
  | 'open'
  | 'close-reversal'
  | 'close-manual'
  | 'skip'
  | 'info'
  | 'error';

export interface BotLogEntry {
  id: string;
  timestamp: number;
  symbol: string;
  indicator: BotIndicatorType;
  action: BotLogAction;
  side?: BotPositionSide;
  signal?: BotSignal | null;
  price?: number;
  size?: number;
  realizedPnl?: number;
  closePrice?: number;
  openPrice?: number;
  slippageBps?: number;
  message: string;
}

interface BotBacktestSymbolResult {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface BotBacktestResult {
  generatedAt: number;
  timeframe: TimeInterval;
  bars: number;
  symbols: string[];
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxDrawdown: number;
  profitFactor: number;
  bySymbol: BotBacktestSymbolResult[];
}

type RitchiPresetName = 'Conservative' | 'Balanced' | 'Aggressive';

interface RitchiBacktestConfig {
  pivLen: number;
  smaMin: number;
  smaMax: number;
  smaMult: number;
  trendLen: number;
  atrMult: number;
  tpMult: number;
}

export interface BotBacktestPresetResult {
  preset: RitchiPresetName;
  config: RitchiBacktestConfig;
  result: BotBacktestResult;
}

interface BotTradingStore {
  service: ExchangeTradingService | null;
  scannerService: ScannerService | null;
  isRunning: boolean;
  isExecuting: boolean;
  trackedSymbols: string[];
  desiredAutoSymbols: string[];
  positions: Record<string, BotTrackedPosition>;
  lastSignals: Record<string, BotSignal | null>;
  logs: BotLogEntry[];
  keepRunning: boolean;
  isBacktesting: boolean;
  backtestResult: BotBacktestResult | null;
  backtestPresetResults: BotBacktestPresetResult[];
  dailyStats: BotDailyStats;
  intervalId: NodeJS.Timeout | null;
  lastReversalAt: Record<string, number>;
  reversalPendingVerification: Record<string, boolean>;
  setService: (service: ExchangeTradingService) => void;
  start: () => Promise<void>;
  stop: () => void;
  runCycle: () => Promise<void>;
  closeAllPositionsNow: () => Promise<void>;
  closePositionNow: (symbol: string) => Promise<void>;
  clearLogs: () => void;
  importLogs: (entries: Array<Omit<BotLogEntry, 'id'>>) => void;
  toggleManualSymbol: (symbol: string) => void;
  syncTrackedSymbols: () => void;
  runRitchiBacktest: (bars?: number) => Promise<void>;
  runRitchiBacktestPresetCompare: (bars?: number) => Promise<void>;
  ensureAutoResume: () => Promise<void>;
}

const getDayKey = (): string => new Date().toISOString().slice(0, 10);

const defaultDailyStats = (): BotDailyStats => ({
  dayKey: getDayKey(),
  totalTradedNotional: 0,
  realizedPnl: 0,
  realizedPnlBySymbol: {},
  tradingDisabled: false,
});

const getTopVolatileSymbols = (count: number): string[] => {
  const limit = Math.max(1, Math.min(10, Math.floor(count) || 3));
  const ranked = [...useTopSymbolsStore.getState().symbols]
    .map((item) => {
      const volatility = useSymbolVolatilityStore.getState().volatility[item.name]?.percentChange ?? 0;
      return { symbol: item.name, score: Math.abs(volatility) };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.symbol);

  return ranked.slice(0, limit);
};

const createLogId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const MAX_LOGS = 500;
const createSystemLog = (message: string): BotLogEntry => ({
  id: createLogId(),
  timestamp: Date.now(),
  symbol: 'SYSTEM',
  indicator: useSettingsStore.getState().settings.bot.indicator,
  action: 'skip',
  message,
});

const normalizeBinanceSymbolInput = (symbol: string): string => {
  const raw = symbol.trim().toUpperCase();
  if (!raw) return '';
  if (raw.endsWith('/USDT')) return raw.slice(0, -5);
  if (raw.endsWith('USDT')) return raw.slice(0, -4);
  return raw;
};

const runRitchiBacktestWithConfig = async ({
  service,
  symbols,
  timeframe,
  bars,
  fixedNotional,
  config,
}: {
  service: ExchangeTradingService;
  symbols: string[];
  timeframe: TimeInterval;
  bars: number;
  fixedNotional: number;
  config: RitchiBacktestConfig;
}): Promise<BotBacktestResult> => {
  const { meta } = await service.getMetaAndAssetCtxs();
  const supportedSymbols = new Set(meta.universe.map((item) => String(item.name).toUpperCase()));
  const normalizedSymbols = symbols
    .map(normalizeBinanceSymbolInput)
    .filter((symbol) => symbol.length > 0 && supportedSymbols.has(symbol));
  const validSymbols = Array.from(new Set(normalizedSymbols));

  if (validSymbols.length === 0) {
    throw new Error('Khong co symbol hop le cho Binance backtest. Vui long kiem tra danh sach coin.');
  }

  const intervalMs = INTERVAL_TO_MS[timeframe];
  const endTime = Date.now();
  const startTime = endTime - bars * intervalMs;
  const symbolResults: BotBacktestSymbolResult[] = [];

  for (const symbol of validSymbols) {
    const candles = await service.getCandles({
      coin: symbol,
      interval: timeframe,
      startTime,
      endTime,
    });

    if (!candles || candles.length < 120) {
      continue;
    }

    const backtestCandles = candles.map((candle) => ({
      ...candle,
      openFormatted: String(candle.open),
      highFormatted: String(candle.high),
      lowFormatted: String(candle.low),
      closeFormatted: String(candle.close),
      volumeFormatted: String(candle.volume),
    }));

    const ritchi = calculateSieuXuHuong(
      backtestCandles,
      config.pivLen,
      config.smaMin,
      config.smaMax,
      config.smaMult,
      config.trendLen,
      config.atrMult,
      config.tpMult,
    );

    type SimPosition = { side: BotPositionSide; entryPrice: number; size: number };
    type ClosedTrade = { pnl: number };
    let position: SimPosition | null = null;
    const closedTrades: ClosedTrade[] = [];

    for (let i = 1; i < candles.length; i += 1) {
      const candle = candles[i];
      const price = candle.close;
      const buySignal = ritchi.buySignals[i];
      const sellSignal = ritchi.sellSignals[i];
      if (!Number.isFinite(price) || price <= 0) {
        continue;
      }

      if (!position) {
        if (buySignal || sellSignal) {
          const side: BotPositionSide = buySignal ? 'long' : 'short';
          position = {
            side,
            entryPrice: price,
            size: fixedNotional / price,
          };
        }
        continue;
      }

      const isReversal = (position.side === 'long' && sellSignal) || (position.side === 'short' && buySignal);
      if (!isReversal) {
        continue;
      }

      const pnlPerUnit = position.side === 'long' ? price - position.entryPrice : position.entryPrice - price;
      const pnl = pnlPerUnit * position.size;
      closedTrades.push({ pnl });
      position = null;
    }

    if (position) {
      const lastPrice = candles[candles.length - 1].close;
      if (Number.isFinite(lastPrice) && lastPrice > 0) {
        const pnlPerUnit =
          position.side === 'long' ? lastPrice - position.entryPrice : position.entryPrice - lastPrice;
        const pnl = pnlPerUnit * position.size;
        closedTrades.push({ pnl });
      }
    }

    if (closedTrades.length === 0) {
      symbolResults.push({
        symbol,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnl: 0,
        maxDrawdown: 0,
        profitFactor: 0,
      });
      continue;
    }

    let cumulative = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let wins = 0;
    let losses = 0;

    for (const trade of closedTrades) {
      cumulative += trade.pnl;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      if (trade.pnl > 0) {
        wins += 1;
        grossProfit += trade.pnl;
      } else if (trade.pnl < 0) {
        losses += 1;
        grossLoss += Math.abs(trade.pnl);
      }
    }

    const trades = closedTrades.length;
    const totalPnl = closedTrades.reduce((sum, item) => sum + item.pnl, 0);
    symbolResults.push({
      symbol,
      trades,
      wins,
      losses,
      winRate: (wins / trades) * 100,
      totalPnl,
      avgPnl: totalPnl / trades,
      maxDrawdown,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0,
    });
  }

  const totalTrades = symbolResults.reduce((sum, item) => sum + item.trades, 0);
  const wins = symbolResults.reduce((sum, item) => sum + item.wins, 0);
  const losses = symbolResults.reduce((sum, item) => sum + item.losses, 0);
  const totalPnl = symbolResults.reduce((sum, item) => sum + item.totalPnl, 0);
  const grossProfit = symbolResults.reduce((sum, item) => sum + Math.max(item.totalPnl, 0), 0);
  const grossLoss = symbolResults.reduce((sum, item) => sum + Math.max(-item.totalPnl, 0), 0);
  const maxDrawdown = symbolResults.reduce((max, item) => Math.max(max, item.maxDrawdown), 0);

  return {
    generatedAt: Date.now(),
    timeframe,
    bars,
    symbols: validSymbols,
    totalTrades,
    wins,
    losses,
    winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
    totalPnl,
    avgPnl: totalTrades > 0 ? totalPnl / totalTrades : 0,
    maxDrawdown,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0,
    bySymbol: symbolResults.sort((a, b) => b.totalPnl - a.totalPnl),
  };
};

export const useBotTradingStore = create<BotTradingStore>()(
  persist(
    (set, get) => ({
  service: null,
  scannerService: null,
  isRunning: false,
  isExecuting: false,
  trackedSymbols: [],
  desiredAutoSymbols: [],
  positions: {},
  lastSignals: {},
  logs: [],
  keepRunning: false,
  isBacktesting: false,
  backtestResult: null,
  backtestPresetResults: [],
  dailyStats: defaultDailyStats(),
  intervalId: null,
  lastReversalAt: {},
  reversalPendingVerification: {},

  setService: (service) => {
    set({
      service,
      scannerService: new ScannerService(service),
    });
  },

  ensureAutoResume: async () => {
    const { keepRunning, isRunning, service, scannerService } = get();
    if (!keepRunning || isRunning || !service || !scannerService) {
      return;
    }
    // Sync open positions from exchange before resuming so local state reflects reality.
    try {
      const exchangePositions = await service.getOpenPositions();
      const syncedPositions: Record<string, BotTrackedPosition> = {};
      for (const pos of exchangePositions) {
        const symbol = getRawPositionSymbol(pos);
        const signedSize = getRawPositionSignedSize(pos);
        const size = Math.abs(signedSize);
        if (size <= 0) continue;
        const payload = (pos as { position?: { entryPx?: string; entryPrice?: string } }).position;
        const entryPrice = Number.parseFloat(String(payload?.entryPx ?? payload?.entryPrice ?? '0'));
        if (!Number.isFinite(entryPrice) || entryPrice <= 0) continue;
        syncedPositions[symbol] = {
          symbol,
          side: signedSize >= 0 ? 'long' : 'short',
          size,
          entryPrice,
          openedAt: Date.now(),
          notional: size * entryPrice,
          safetyStopOrderId: null,
        };
      }
      const count = Object.keys(syncedPositions).length;
      set({ positions: syncedPositions });
      set((prev) => ({
        logs: [
          {
            id: createLogId(),
            timestamp: Date.now(),
            symbol: 'SYSTEM',
            indicator: useSettingsStore.getState().settings.bot.indicator,
            action: 'info' as const,
            message: `[BotResume] Synced ${count} position(s) from Binance`,
          },
          ...prev.logs,
        ].slice(0, MAX_LOGS),
      }));
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      set((prev) => ({
        logs: [
          {
            id: createLogId(),
            timestamp: Date.now(),
            symbol: 'SYSTEM',
            indicator: useSettingsStore.getState().settings.bot.indicator,
            action: 'error' as const,
            message: `[BotResume] WARNING: Position sync failed, starting without sync. Error: ${msg}`,
          },
          ...prev.logs,
        ].slice(0, MAX_LOGS),
      }));
    }
    await get().start();
  },

  toggleManualSymbol: (symbol) => {
    const settingsStore = useSettingsStore.getState();
    const manualSymbols = settingsStore.settings.bot.manualSymbols;
    if (manualSymbols.includes(symbol)) {
      settingsStore.updateBotSettings({ manualSymbols: manualSymbols.filter((item) => item !== symbol) });
    } else {
      settingsStore.updateBotSettings({ manualSymbols: [...manualSymbols, symbol] });
    }
  },

  syncTrackedSymbols: () => {
    const settingsStore = useSettingsStore.getState();
    const botSettings = settingsStore.settings.bot;
    const pinnedSymbols = Array.isArray(settingsStore.settings.pinnedSymbols)
      ? settingsStore.settings.pinnedSymbols.filter((symbol): symbol is string => typeof symbol === 'string')
      : [];
    const state = get();
    let nextTracked: string[] = [];

    if (botSettings.symbolMode === 'manual') {
      nextTracked = [...botSettings.manualSymbols];
      set({ desiredAutoSymbols: [] });
    } else if (botSettings.symbolMode === 'favourite') {
      const desired = [...pinnedSymbols];
      const withOpenPositions = Object.keys(state.positions);
      const keepOpen = withOpenPositions.filter((symbol) => !desired.includes(symbol));
      nextTracked = Array.from(new Set([...keepOpen, ...desired]));
      set({ desiredAutoSymbols: desired });
    } else {
      const desired = getTopVolatileSymbols(botSettings.autoTopSymbolsCount);
      const withOpenPositions = Object.keys(state.positions);
      const keepOpen = withOpenPositions.filter((symbol) => !desired.includes(symbol));
      // Prioritize evaluating existing out-of-top open positions first.
      // This helps bot close legacy positions before rotating into new symbols.
      nextTracked = Array.from(new Set([...keepOpen, ...desired]));
      set({ desiredAutoSymbols: desired });
    }

    set({ trackedSymbols: nextTracked });
  },

  start: async () => {
    const settingsStore = useSettingsStore.getState();
    const nextBotSettings: Partial<typeof settingsStore.settings.bot> = {};
    if (settingsStore.settings.bot.exchange !== 'binance') {
      nextBotSettings.exchange = 'binance';
    }
    if (settingsStore.settings.bot.paperMode) {
      nextBotSettings.paperMode = false;
    }
    if (Object.keys(nextBotSettings).length > 0) {
      settingsStore.updateBotSettings(nextBotSettings);
    }

    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
    }

    set({ isRunning: true, keepRunning: true });
    get().syncTrackedSymbols();
    set((prev) => ({
      logs: [
        createSystemLog('Bot started'),
        ...prev.logs,
      ].slice(0, MAX_LOGS),
    }));
    await get().runCycle();

    const scanIntervalSec = Math.max(5, useSettingsStore.getState().settings.bot.scanIntervalSec);
    const nextIntervalId = setInterval(() => {
      get().runCycle();
    }, scanIntervalSec * 1000);

    set({ intervalId: nextIntervalId, isRunning: true, keepRunning: true });
  },

  stop: () => {
    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
    }
    set((prev) => ({
      isRunning: false,
      intervalId: null,
      isExecuting: false,
      keepRunning: false,
      reversalPendingVerification: {},
      logs: [
        createSystemLog('Bot stopped'),
        ...prev.logs,
      ].slice(0, MAX_LOGS),
    }));
  },

  clearLogs: () => set({ logs: [] }),
  importLogs: (entries) => {
    set((prev) => {
      const imported = entries.map((entry) => ({
        ...entry,
        id: createLogId(),
      }));
      const merged = [...imported, ...prev.logs]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_LOGS);
      return { logs: merged };
    });
  },

  runRitchiBacktest: async (bars = 600) => {
    const { service, isBacktesting } = get();
    if (!service || isBacktesting) return;

    const settingsStore = useSettingsStore.getState();
    const botSettings = settingsStore.settings.bot;
    const indicatorSettings = settingsStore.settings.indicators.sieuXuHuong;

    const normalizedBars = Math.max(120, Math.min(5000, Math.floor(bars)));
    const exchange = useDexStore.getState().selectedExchange;
    if (exchange !== 'binance') {
      toast.error('Backtest phase 1 supports Binance only');
      return;
    }

    const pinnedSymbols = Array.isArray(settingsStore.settings.pinnedSymbols)
      ? settingsStore.settings.pinnedSymbols.filter((symbol): symbol is string => typeof symbol === 'string')
      : [];

    let symbols: string[] = [];
    if (botSettings.symbolMode === 'manual') {
      symbols = [...botSettings.manualSymbols];
    } else if (botSettings.symbolMode === 'favourite') {
      symbols = [...pinnedSymbols];
    } else {
      symbols = getTopVolatileSymbols(botSettings.autoTopSymbolsCount);
    }

    if (symbols.length === 0) {
      toast.error('No symbols available for backtest');
      return;
    }

    set({ isBacktesting: true });
    try {
      const timeframe = botSettings.timeframe as TimeInterval;
      const leverage = botSettings.leverageByExchange.binance;
      const fixedNotional = botSettings.initialMarginUsdt * leverage;
      const result = await runRitchiBacktestWithConfig({
        service,
        symbols,
        timeframe,
        bars: normalizedBars,
        fixedNotional,
        config: {
          pivLen: indicatorSettings.pivLen,
          smaMin: indicatorSettings.smaMin,
          smaMax: indicatorSettings.smaMax,
          smaMult: indicatorSettings.smaMult,
          trendLen: indicatorSettings.trendLen,
          atrMult: indicatorSettings.atrMult,
          tpMult: indicatorSettings.tpMult,
        },
      });

      set({ backtestResult: result });
      toast.success('Ritchi mini backtest completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Backtest failed');
    } finally {
      set({ isBacktesting: false });
    }
  },

  runRitchiBacktestPresetCompare: async (bars = 600) => {
    const { service, isBacktesting } = get();
    if (!service || isBacktesting) return;

    const settingsStore = useSettingsStore.getState();
    const botSettings = settingsStore.settings.bot;
    const indicatorSettings = settingsStore.settings.indicators.sieuXuHuong;

    const normalizedBars = Math.max(120, Math.min(5000, Math.floor(bars)));
    const exchange = useDexStore.getState().selectedExchange;
    if (exchange !== 'binance') {
      toast.error('Backtest phase 1 supports Binance only');
      return;
    }

    const pinnedSymbols = Array.isArray(settingsStore.settings.pinnedSymbols)
      ? settingsStore.settings.pinnedSymbols.filter((symbol): symbol is string => typeof symbol === 'string')
      : [];

    let symbols: string[] = [];
    if (botSettings.symbolMode === 'manual') {
      symbols = [...botSettings.manualSymbols];
    } else if (botSettings.symbolMode === 'favourite') {
      symbols = [...pinnedSymbols];
    } else {
      symbols = getTopVolatileSymbols(botSettings.autoTopSymbolsCount);
    }

    if (symbols.length === 0) {
      toast.error('No symbols available for backtest');
      return;
    }

    const timeframe = botSettings.timeframe as TimeInterval;
    const leverage = botSettings.leverageByExchange.binance;
    const fixedNotional = botSettings.initialMarginUsdt * leverage;

    const presets: Array<{ preset: RitchiPresetName; config: RitchiBacktestConfig }> = [
      {
        preset: 'Conservative',
        config: {
          pivLen: Math.max(6, indicatorSettings.pivLen + 2),
          smaMin: Math.max(6, indicatorSettings.smaMin + 2),
          smaMax: Math.max(60, indicatorSettings.smaMax + 10),
          smaMult: Math.max(1.1, indicatorSettings.smaMult + 0.15),
          trendLen: Math.max(120, indicatorSettings.trendLen + 20),
          atrMult: Math.max(2.2, indicatorSettings.atrMult + 0.3),
          tpMult: Math.max(3.2, indicatorSettings.tpMult + 0.2),
        },
      },
      {
        preset: 'Balanced',
        config: {
          pivLen: indicatorSettings.pivLen,
          smaMin: indicatorSettings.smaMin,
          smaMax: indicatorSettings.smaMax,
          smaMult: indicatorSettings.smaMult,
          trendLen: indicatorSettings.trendLen,
          atrMult: indicatorSettings.atrMult,
          tpMult: indicatorSettings.tpMult,
        },
      },
      {
        preset: 'Aggressive',
        config: {
          pivLen: Math.max(2, indicatorSettings.pivLen - 2),
          smaMin: Math.max(3, indicatorSettings.smaMin - 2),
          smaMax: Math.max(20, indicatorSettings.smaMax - 15),
          smaMult: Math.max(0.6, indicatorSettings.smaMult - 0.2),
          trendLen: Math.max(40, indicatorSettings.trendLen - 30),
          atrMult: Math.max(1.2, indicatorSettings.atrMult - 0.4),
          tpMult: Math.max(1.8, indicatorSettings.tpMult - 0.6),
        },
      },
    ];

    set({ isBacktesting: true });
    try {
      const results: BotBacktestPresetResult[] = [];
      for (const preset of presets) {
        const result = await runRitchiBacktestWithConfig({
          service,
          symbols,
          timeframe,
          bars: normalizedBars,
          fixedNotional,
          config: preset.config,
        });
        results.push({
          preset: preset.preset,
          config: preset.config,
          result,
        });
      }

      set({
        backtestPresetResults: results,
        backtestResult: results.find((item) => item.preset === 'Balanced')?.result ?? results[0]?.result ?? null,
      });
      toast.success('Ritchi preset comparison completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Preset comparison failed');
    } finally {
      set({ isBacktesting: false });
    }
  },

  closeAllPositionsNow: async () => {
    const { service, positions } = get();
    if (!service) return;

    const symbols = Object.keys(positions);
    if (symbols.length === 0) return;

    for (const symbol of symbols) {
      const position = positions[symbol];
      if (!position) continue;

      try {
        const closePrice = Number.parseFloat(await service.getMidPrice(symbol));
        if (!Number.isFinite(closePrice) || closePrice <= 0) {
          continue;
        }
        const botSettings = useSettingsStore.getState().settings.bot;
        if (!botSettings.paperMode) {
          const metadata = await service.getMetadataCache(symbol);
          const closeSize = service.formatSizeCached(position.size, metadata);
          if (position.side === 'long') {
            await service.placeMarketSell(symbol, closeSize, String(closePrice), metadata);
          } else {
            await service.placeMarketBuy(symbol, closeSize, String(closePrice), metadata);
          }
        }

        const pnlPerCoin = position.side === 'long'
          ? closePrice - position.entryPrice
          : position.entryPrice - closePrice;
        const realizedPnl = pnlPerCoin * position.size;

        set((prev) => {
          const nextPositions = { ...prev.positions };
          delete nextPositions[symbol];
          return {
            positions: nextPositions,
            dailyStats: {
              ...prev.dailyStats,
              realizedPnl: prev.dailyStats.realizedPnl + realizedPnl,
              realizedPnlBySymbol: {
                ...prev.dailyStats.realizedPnlBySymbol,
                [symbol]: (prev.dailyStats.realizedPnlBySymbol[symbol] || 0) + realizedPnl,
              },
            },
            logs: [
              {
                id: createLogId(),
                timestamp: Date.now(),
                symbol,
                indicator: useSettingsStore.getState().settings.bot.indicator,
                action: 'close-manual' as const,
                side: position.side,
                signal: null,
                price: closePrice,
                size: position.size,
                realizedPnl,
                message: botSettings.paperMode
                  ? 'Position closed manually (paper mode)'
                  : 'Position closed manually from bot panel',
              },
              ...prev.logs,
            ].slice(0, MAX_LOGS),
          };
        });
      } catch (error) {
        set((prev) => ({
          logs: [
            {
              id: createLogId(),
              timestamp: Date.now(),
              symbol,
              indicator: useSettingsStore.getState().settings.bot.indicator,
              action: 'error' as const,
              message: error instanceof Error ? error.message : 'Failed to close position manually',
            },
            ...prev.logs,
          ].slice(0, MAX_LOGS),
        }));
      }
    }

    toast.success('All bot positions close command submitted');
  },

  closePositionNow: async (symbol: string) => {
    const { service, positions } = get();
    if (!service) return;
    const position = positions[symbol];
    if (!position) return;

    try {
      const closePrice = Number.parseFloat(await service.getMidPrice(symbol));
      if (!Number.isFinite(closePrice) || closePrice <= 0) return;
      const botSettings = useSettingsStore.getState().settings.bot;
      if (!botSettings.paperMode) {
        const metadata = await service.getMetadataCache(symbol);
        const closeSize = service.formatSizeCached(position.size, metadata);
        if (position.side === 'long') {
          await service.placeMarketSell(symbol, closeSize, String(closePrice), metadata);
        } else {
          await service.placeMarketBuy(symbol, closeSize, String(closePrice), metadata);
        }
      }

      const pnlPerCoin = position.side === 'long'
        ? closePrice - position.entryPrice
        : position.entryPrice - closePrice;
      const realizedPnl = pnlPerCoin * position.size;

      set((prev) => {
        const nextPositions = { ...prev.positions };
        delete nextPositions[symbol];
        return {
          positions: nextPositions,
          dailyStats: {
            ...prev.dailyStats,
            realizedPnl: prev.dailyStats.realizedPnl + realizedPnl,
            realizedPnlBySymbol: {
              ...prev.dailyStats.realizedPnlBySymbol,
              [symbol]: (prev.dailyStats.realizedPnlBySymbol[symbol] || 0) + realizedPnl,
            },
          },
          logs: [
            {
              id: createLogId(),
              timestamp: Date.now(),
              symbol,
              indicator: botSettings.indicator,
              action: 'close-manual' as const,
              side: position.side,
              signal: null,
              price: closePrice,
              size: position.size,
              realizedPnl,
              message: botSettings.paperMode
                ? 'Position closed manually (paper mode)'
                : 'Position closed manually',
            },
            ...prev.logs,
          ].slice(0, MAX_LOGS),
        };
      });
      toast.success(`${symbol} position closed`);
    } catch (error) {
      set((prev) => ({
        logs: [
          {
            id: createLogId(),
            timestamp: Date.now(),
            symbol,
            indicator: useSettingsStore.getState().settings.bot.indicator,
            action: 'error' as const,
            message: error instanceof Error ? error.message : 'Failed to close position',
          },
          ...prev.logs,
        ].slice(0, MAX_LOGS),
      }));
    }
  },

  runCycle: async () => {
    const state = get();
    const { service, scannerService, isExecuting } = state;
    if (!service || !scannerService || isExecuting) {
      return;
    }

    const settingsStore = useSettingsStore.getState();
    const botSettings = settingsStore.settings.bot;
    const scannerSettings = settingsStore.settings.scanner;
    if (!botSettings.enabled) {
      return;
    }
    if (botSettings.exchange !== 'binance') {
      return;
    }

    const dayKey = getDayKey();
    let dailyStats = state.dailyStats;
    if (dailyStats.dayKey !== dayKey) {
      dailyStats = defaultDailyStats();
      set({ dailyStats });
    }

    if (dailyStats.tradingDisabled) {
      set((prev) => {
        // Only log once per disable event (avoid spamming)
        const lastLog = prev.logs[0];
        if (lastLog?.message === 'Daily loss limit reached — trading disabled for today') return prev;
        return {
          logs: [
            createSystemLog('Daily loss limit reached — trading disabled for today'),
            ...prev.logs,
          ].slice(0, MAX_LOGS),
        };
      });
      return;
    }

    get().syncTrackedSymbols();
    const symbols = get().trackedSymbols;
    if (symbols.length === 0) {
      set((prev) => {
        const lastLog = prev.logs[0];
        if (lastLog?.message === 'No symbols tracked — check symbol mode and top volatility list') return prev;
        return {
          logs: [
            createSystemLog('No symbols tracked — check symbol mode and top volatility list'),
            ...prev.logs,
          ].slice(0, MAX_LOGS),
        };
      });
      return;
    }

    set({ isExecuting: true });
    try {
      for (const symbol of symbols) {
        const latestState = get();
        const desiredAutoSet = new Set(latestState.desiredAutoSymbols);
        const outOfScopeOpenPositions =
          botSettings.symbolMode !== 'manual'
            ? Object.values(latestState.positions).filter((position) => !desiredAutoSet.has(position.symbol))
            : [];

        // Managed list modes (auto/favourite): if desired list changed and we still
        // have open positions outside desired list, delay opening newly desired symbols
        // until those positions close.
        if (botSettings.symbolMode !== 'manual' && outOfScopeOpenPositions.length > 0) {
          const hasCurrentPosition = Boolean(latestState.positions[symbol]);
          const isDesiredSymbol = desiredAutoSet.has(symbol);
          if (!hasCurrentPosition && isDesiredSymbol) {
            set((prev) => ({
              logs: [
                {
                  id: createLogId(),
                  timestamp: Date.now(),
                  symbol,
                  indicator: botSettings.indicator,
                  action: 'skip' as const,
                  signal: null,
                  message: 'Waiting for existing out-of-list positions to close before opening new symbols',
                },
                ...prev.logs,
              ].slice(0, MAX_LOGS),
            }));
            continue;
          }
        }

        // Periodic reconcile: every 2 intervals, re-check exchange truth for symbols
        // whose last reversal-open failed (reversalPendingVerification flag is set).
        if (get().reversalPendingVerification[symbol] && !botSettings.paperMode) {
          const cycleIntervalMs = INTERVAL_TO_MS[botSettings.timeframe];
          const timeSinceReversal = Date.now() - (get().lastReversalAt[symbol] ?? 0);
          if (timeSinceReversal >= 2 * cycleIntervalMs) {
            try {
              const maybeInvalidate = service as ExchangeTradingService & { invalidateAccountCache?: () => void };
              if (typeof maybeInvalidate.invalidateAccountCache === 'function') {
                maybeInvalidate.invalidateAccountCache();
              }
              const exchangePositions = await service.getOpenPositions();
              const exchangePosition = exchangePositions.find((pos) => getRawPositionSymbol(pos) === symbol);
              if (exchangePosition) {
                const signedSize = getRawPositionSignedSize(exchangePosition);
                const size = Math.abs(signedSize);
                const payload = (exchangePosition as { position?: { entryPx?: string; entryPrice?: string } }).position;
                const entryPrice = Number.parseFloat(String(payload?.entryPx ?? payload?.entryPrice ?? '0'));
                if (size > 0 && Number.isFinite(entryPrice) && entryPrice > 0) {
                  set((prev) => ({
                    positions: {
                      ...prev.positions,
                      [symbol]: { symbol, side: signedSize >= 0 ? 'long' : 'short', size, entryPrice, openedAt: Date.now(), notional: size * entryPrice, safetyStopOrderId: null },
                    },
                    reversalPendingVerification: { ...prev.reversalPendingVerification, [symbol]: false },
                    logs: [
                      {
                        id: createLogId(),
                        timestamp: Date.now(),
                        symbol,
                        indicator: botSettings.indicator,
                        action: 'open' as const,
                        message: `[RECONCILED] Position recovered from exchange after prior reversal open failure`,
                      },
                      ...prev.logs,
                    ].slice(0, MAX_LOGS),
                  }));
                  toast.success(`${symbol} position recovered from exchange reconciliation`);
                }
              } else {
                set((prev) => ({
                  reversalPendingVerification: { ...prev.reversalPendingVerification, [symbol]: false },
                  logs: [
                    {
                      id: createLogId(),
                      timestamp: Date.now(),
                      symbol,
                      indicator: botSettings.indicator,
                      action: 'skip' as const,
                      signal: null,
                      message: `[RECONCILED] Confirmed flat on exchange after reversal open failure — no position found`,
                    },
                    ...prev.logs,
                  ].slice(0, MAX_LOGS),
                }));
              }
            } catch {
              // Reconcile fetch failed — leave flag set, will retry next cycle
            }
          }
        }

        let result: { signalType: BotSignal; isFallback?: boolean } | null = null;

        if (botSettings.indicator === 'ritchi') {
          const ritchiSettings = settingsStore.settings.indicators.sieuXuHuong;
          const r = await scannerService.scanRitchiTrend({
            symbol,
            timeframes: [botSettings.timeframe],
            config: {
              enabled: true,
              timeframes: [botSettings.timeframe],
              pivLen: ritchiSettings.pivLen,
              smaMin: ritchiSettings.smaMin,
              smaMax: ritchiSettings.smaMax,
              smaMult: ritchiSettings.smaMult,
              trendLen: ritchiSettings.trendLen,
              atrMult: ritchiSettings.atrMult,
              tpMult: ritchiSettings.tpMult,
            },
          });
          result = r ? { signalType: r.signalType, isFallback: r.isFallback } : null;
        } else if (botSettings.indicator === 'kalmanTrend') {
          const r = await scannerService.scanKalmanTrend({
            symbol,
            timeframes: [botSettings.timeframe],
            config: {
              enabled: true,
              timeframes: [botSettings.timeframe],
            },
          });
          result = r ? { signalType: r.signalType } : null;
        } else if (botSettings.indicator === 'macdReversal') {
          const r = await scannerService.scanMacdReversal({
            symbol,
            timeframes: [botSettings.timeframe],
            config: {
              enabled: true,
              timeframes: [botSettings.timeframe],
              fastPeriod: scannerSettings.macdReversalScanner.fastPeriod,
              slowPeriod: scannerSettings.macdReversalScanner.slowPeriod,
              signalPeriod: scannerSettings.macdReversalScanner.signalPeriod,
              recentReversalLookback: scannerSettings.macdReversalScanner.recentReversalLookback,
              minCandles: scannerSettings.macdReversalScanner.minCandles,
            },
          });
          result = r ? { signalType: r.signalType } : null;
        }

        // Post-reversal cooldown: suppress fallback (trend-direction) signals for 3 bars
        const REVERSAL_COOLDOWN_BARS = 3;
        const cooldownMs = INTERVAL_TO_MS[botSettings.timeframe] * REVERSAL_COOLDOWN_BARS;
        const timeSinceReversal = Date.now() - (get().lastReversalAt[symbol] ?? 0);
        if (result?.isFallback && timeSinceReversal < cooldownMs) {
          result = null;
          set((prev) => ({
            logs: [
              {
                id: createLogId(),
                timestamp: Date.now(),
                symbol,
                indicator: botSettings.indicator,
                action: 'skip' as const,
                signal: null,
                message: `Fallback signal suppressed — post-reversal cooldown (${Math.ceil((cooldownMs - timeSinceReversal) / 1000)}s remaining)`,
              },
              ...prev.logs,
            ].slice(0, MAX_LOGS),
          }));
        }

        const signal = result?.signalType ?? null;
        const currentPosition = get().positions[symbol] || null;
        set((prev) => ({ lastSignals: { ...prev.lastSignals, [symbol]: signal } }));

        if (!signal) {
          // Compute a descriptive skip reason for easier debugging
          const skipReason = (() => {
            if (!result) return 'No signal — indicator returned null (candles unavailable or no crossover)';
            return 'No valid signal for current cycle';
          })();
          set((prev) => ({
            logs: [
              {
                id: createLogId(),
                timestamp: Date.now(),
                symbol,
                indicator: botSettings.indicator,
                action: 'skip' as const,
                signal: null,
                message: skipReason,
              },
              ...prev.logs,
            ].slice(0, MAX_LOGS),
          }));
          continue;
        }

        const signalSide: BotPositionSide = signal === 'bullish' ? 'long' : 'short';
        const isPaperMode = botSettings.paperMode;
        if (!currentPosition) {
          const leverage = botSettings.leverageByExchange[botSettings.exchange];
          const midPrice = Number.parseFloat(await service.getMidPrice(symbol));
          if (!Number.isFinite(midPrice) || midPrice <= 0) {
            continue;
          }
          const notional = botSettings.initialMarginUsdt * leverage;
          const rawSize = notional / midPrice;
          let numericSize = rawSize;
          let safetyStopOrderId: string | null = null;

          if (!isPaperMode) {
            const metadata = await service.getMetadataCache(symbol);
            await service.setLeverage(symbol, leverage, metadata);
            const { size } = service.ensureMinNotional(rawSize, midPrice, metadata, 10);
            if (signalSide === 'long') {
              await service.placeMarketBuy(symbol, size, String(midPrice), metadata);
            } else {
              await service.placeMarketSell(symbol, size, String(midPrice), metadata);
            }
            numericSize = Number.parseFloat(size);
            // Place safety STOP_MARKET after market order succeeds (non-blocking)
            try {
              // ATR-based SL (Fix #6): use ATR(50) × atrMultiplier when configured, fallback to percent
              let stopPrice: number;
              if (botSettings.atrMultiplier > 0) {
                try {
                  const atrStart = Date.now() - 55 * INTERVAL_TO_MS[botSettings.timeframe];
                  const atrCandles = await service.getCandles({ coin: symbol, interval: botSettings.timeframe, startTime: atrStart });
                  const atr = calcAtr(atrCandles, 50);
                  stopPrice = atr > 0
                    ? calcStopPrice(midPrice, signalSide, calcSlDistanceFromAtr(atr, botSettings.atrMultiplier))
                    : calcStopPrice(midPrice, signalSide, midPrice * (botSettings.safetyStopLossPercent / 100));
                } catch {
                  stopPrice = calcStopPrice(midPrice, signalSide, midPrice * (botSettings.safetyStopLossPercent / 100));
                }
              } else {
                stopPrice = calcStopPrice(midPrice, signalSide, midPrice * (botSettings.safetyStopLossPercent / 100));
              }
              const formattedStop = service.formatPriceCached(stopPrice, metadata);
              const slResp = await service.placeStopLoss(
                { coin: symbol, triggerPrice: formattedStop, size: service.formatSizeCached(numericSize, metadata), isBuy: signalSide === 'short' },
                metadata,
              );
              const oid = (slResp as any)?.response?.data?.statuses?.[0]?.resting?.oid;
              safetyStopOrderId = oid != null ? String(oid) : null;
            } catch (slErr) {
              const slErrMsg = slErr instanceof Error ? slErr.message : String(slErr);
              set((prev) => ({
                logs: [
                  { id: createLogId(), timestamp: Date.now(), symbol, indicator: botSettings.indicator, action: 'error' as const, message: `[SL] Failed to place safety stop for ${symbol}: ${slErrMsg}` },
                  ...prev.logs,
                ].slice(0, MAX_LOGS),
              }));
            }
          }

          set((prev) => ({
            positions: {
              ...prev.positions,
              [symbol]: {
                symbol,
                side: signalSide,
                size: numericSize,
                entryPrice: midPrice,
                openedAt: Date.now(),
                notional: midPrice * numericSize,
                safetyStopOrderId,
              },
            },
            dailyStats: {
              ...prev.dailyStats,
              totalTradedNotional: prev.dailyStats.totalTradedNotional + midPrice * numericSize,
            },
            logs: [
              {
                id: createLogId(),
                timestamp: Date.now(),
                symbol,
                indicator: botSettings.indicator,
                action: 'open' as const,
                side: signalSide,
                signal,
                price: midPrice,
                size: numericSize,
                message: isPaperMode
                  ? `[PAPER] Opened ${signalSide.toUpperCase()} from ${botSettings.indicator} signal`
                  : `Opened ${signalSide.toUpperCase()} from ${botSettings.indicator} signal`,
              },
              ...prev.logs,
            ].slice(0, MAX_LOGS),
          }));
          continue;
        }

        if (currentPosition.side === signalSide) {
          continue;
        }

        const closePrice = Number.parseFloat(await service.getMidPrice(symbol));
        if (!Number.isFinite(closePrice) || closePrice <= 0) {
          continue;
        }
        if (!isPaperMode) {
          const metadata = await service.getMetadataCache(symbol);
          // Cancel safety stop before closing position to prevent double-fill
          if (currentPosition.safetyStopOrderId) {
            try {
              await service.cancelOrder(symbol, Number(currentPosition.safetyStopOrderId), metadata);
            } catch { /* order may already be filled/gone — safe to ignore */ }
          }
          const closeSize = service.formatSizeCached(currentPosition.size, metadata);
          if (currentPosition.side === 'long') {
            await service.placeMarketSell(symbol, closeSize, String(closePrice), metadata);
          } else {
            await service.placeMarketBuy(symbol, closeSize, String(closePrice), metadata);
          }
        }

        const pnlPerCoin = currentPosition.side === 'long'
          ? closePrice - currentPosition.entryPrice
          : currentPosition.entryPrice - closePrice;
        const realizedPnl = pnlPerCoin * currentPosition.size;

        const closeNotional = closePrice * currentPosition.size;
        const currentDailyStats = get().dailyStats;
        const nextTotalTradedNotional = currentDailyStats.totalTradedNotional + closeNotional;
        const nextRealizedPnl = currentDailyStats.realizedPnl + realizedPnl;
        const nextLoss = Math.max(0, -nextRealizedPnl);
        const maxLossUsd = (Math.max(0, nextTotalTradedNotional) * botSettings.maxLossPercentPerDay) / 100;
        const hitDailyLoss = maxLossUsd > 0 && nextLoss >= maxLossUsd;

        set((prev) => {
          const nextPositions = { ...prev.positions };
          delete nextPositions[symbol];
          return {
            positions: nextPositions,
            dailyStats: {
              ...prev.dailyStats,
              totalTradedNotional: prev.dailyStats.totalTradedNotional + closeNotional,
              realizedPnl: prev.dailyStats.realizedPnl + realizedPnl,
              realizedPnlBySymbol: {
                ...prev.dailyStats.realizedPnlBySymbol,
                [symbol]: (prev.dailyStats.realizedPnlBySymbol[symbol] || 0) + realizedPnl,
              },
              tradingDisabled: hitDailyLoss || prev.dailyStats.tradingDisabled,
            },
            logs: [
              {
                id: createLogId(),
                timestamp: Date.now(),
                symbol,
                indicator: botSettings.indicator,
                action: 'close-reversal' as const,
                side: currentPosition.side,
                signal,
                price: closePrice,
                size: currentPosition.size,
                realizedPnl,
                message: isPaperMode
                  ? `[PAPER] Closed ${currentPosition.side.toUpperCase()} due to reversal signal`
                  : `Closed ${currentPosition.side.toUpperCase()} due to reversal signal`,
              },
              ...prev.logs,
            ].slice(0, MAX_LOGS),
          };
        });

        if (hitDailyLoss) {
          toast.error('Bot stopped: daily max loss reached');
          get().stop();
          break;
        }

        // Re-enter immediately in the opposite direction so reversal happens in one cycle.
        // NOTE: Close has already succeeded at this point. If the open below fails, the bot
        // will be flat on both exchange and local state — safe, but operator should verify
        // exchange position manually if an error is logged below.
        const openPrice = Number.parseFloat(await service.getMidPrice(symbol));
        if (!Number.isFinite(openPrice) || openPrice <= 0) {
          // Record reversal timestamp even without re-entry so cooldown is respected.
          set((prev) => ({ lastReversalAt: { ...prev.lastReversalAt, [symbol]: Date.now() } }));
          continue;
        }
        const reversalSlippageBps = closePrice > 0
          ? (Math.abs(openPrice - closePrice) / closePrice) * 10000
          : 0;

        const leverage = botSettings.leverageByExchange[botSettings.exchange];
        const openNotional = botSettings.initialMarginUsdt * leverage;
        const openRawSize = openNotional / openPrice;
        let openNumericSize = openRawSize;
        let reversalSafetyStopOrderId: string | null = null;

        if (!isPaperMode) {
          let openOrderFailed = false;
          try {
            const metadata = await service.getMetadataCache(symbol);
            await service.setLeverage(symbol, leverage, metadata);
            const { size } = service.ensureMinNotional(openRawSize, openPrice, metadata, 10);
            if (signalSide === 'long') {
              await service.placeMarketBuy(symbol, size, String(openPrice), metadata);
            } else {
              await service.placeMarketSell(symbol, size, String(openPrice), metadata);
            }
            openNumericSize = Number.parseFloat(size);
            // Place safety STOP_MARKET for the new position (non-blocking)
            try {
              // ATR-based SL (Fix #6): use ATR(50) × atrMultiplier when configured, fallback to percent
              let stopPrice: number;
              if (botSettings.atrMultiplier > 0) {
                try {
                  const atrStart = Date.now() - 55 * INTERVAL_TO_MS[botSettings.timeframe];
                  const atrCandles = await service.getCandles({ coin: symbol, interval: botSettings.timeframe, startTime: atrStart });
                  const atr = calcAtr(atrCandles, 50);
                  stopPrice = atr > 0
                    ? calcStopPrice(openPrice, signalSide, calcSlDistanceFromAtr(atr, botSettings.atrMultiplier))
                    : calcStopPrice(openPrice, signalSide, openPrice * (botSettings.safetyStopLossPercent / 100));
                } catch {
                  stopPrice = calcStopPrice(openPrice, signalSide, openPrice * (botSettings.safetyStopLossPercent / 100));
                }
              } else {
                stopPrice = calcStopPrice(openPrice, signalSide, openPrice * (botSettings.safetyStopLossPercent / 100));
              }
              const formattedStop = service.formatPriceCached(stopPrice, metadata);
              const slResp = await service.placeStopLoss(
                { coin: symbol, triggerPrice: formattedStop, size: service.formatSizeCached(openNumericSize, metadata), isBuy: signalSide === 'short' },
                metadata,
              );
              const oid = (slResp as any)?.response?.data?.statuses?.[0]?.resting?.oid;
              reversalSafetyStopOrderId = oid != null ? String(oid) : null;
            } catch (slErr) {
              const slErrMsg = slErr instanceof Error ? slErr.message : String(slErr);
              set((prev) => ({
                logs: [
                  { id: createLogId(), timestamp: Date.now(), symbol, indicator: botSettings.indicator, action: 'error' as const, message: `[SL] Failed to place safety stop after reversal open for ${symbol}: ${slErrMsg}` },
                  ...prev.logs,
                ].slice(0, MAX_LOGS),
              }));
            }
          } catch (openErr) {
            openOrderFailed = true;
            const openErrMsg = openErr instanceof Error ? openErr.message : 'Unknown error';
            let reconciledPosition: BotTrackedPosition | null = null;
            let reconcileErrorMessage = '';

            try {
              const maybeInvalidate = service as ExchangeTradingService & { invalidateAccountCache?: () => void };
              if (typeof maybeInvalidate.invalidateAccountCache === 'function') {
                maybeInvalidate.invalidateAccountCache();
              }

              const exchangePositions = await service.getOpenPositions();
              const exchangePosition = exchangePositions.find((pos) => getRawPositionSymbol(pos) === symbol);

              if (exchangePosition) {
                const signedSize = getRawPositionSignedSize(exchangePosition);
                const size = Math.abs(signedSize);
                const payload = (exchangePosition as { position?: { entryPx?: string; entryPrice?: string } }).position;
                const entryPrice = Number.parseFloat(String(payload?.entryPx ?? payload?.entryPrice ?? '0'));
                if (size > 0 && Number.isFinite(entryPrice) && entryPrice > 0) {
                  reconciledPosition = {
                    symbol,
                    side: signedSize >= 0 ? 'long' : 'short',
                    size,
                    entryPrice,
                    openedAt: Date.now(),
                    notional: size * entryPrice,
                    safetyStopOrderId: null,
                  };
                }
              }
            } catch (reconcileErr) {
              reconcileErrorMessage = reconcileErr instanceof Error ? reconcileErr.message : 'Unknown reconciliation error';
            }

            set((prev) => ({
              positions: reconciledPosition
                ? { ...prev.positions, [symbol]: reconciledPosition }
                : prev.positions,
              lastReversalAt: { ...prev.lastReversalAt, [symbol]: Date.now() },
              reversalPendingVerification: {
                ...prev.reversalPendingVerification,
                [symbol]: !reconciledPosition,
              },
              logs: [
                {
                  id: createLogId(),
                  timestamp: Date.now(),
                  symbol,
                  indicator: botSettings.indicator,
                  action: 'error' as const,
                  message: reconciledPosition
                    ? `REVERSAL OPEN FAILED then reconciled from exchange (local position restored). Error: ${openErrMsg}`
                    : `REVERSAL OPEN FAILED after close succeeded — bot remains flat. verify ${symbol} on exchange manually. Error: ${openErrMsg}${reconcileErrorMessage ? ` | Reconcile error: ${reconcileErrorMessage}` : ''}`,
                },
                ...prev.logs,
              ].slice(0, MAX_LOGS),
            }));
            toast.error(
              reconciledPosition
                ? `Reversal open failed for ${symbol}, recovered by exchange reconciliation`
                : `Reversal open failed for ${symbol} — bot is flat, check exchange position`,
            );
          }
          if (openOrderFailed) continue;
        }

        set((prev) => ({
          positions: {
            ...prev.positions,
            [symbol]: {
              symbol,
              side: signalSide,
              size: openNumericSize,
              entryPrice: openPrice,
              openedAt: Date.now(),
              notional: openPrice * openNumericSize,
              safetyStopOrderId: reversalSafetyStopOrderId,
            },
          },
          lastReversalAt: { ...prev.lastReversalAt, [symbol]: Date.now() },
          reversalPendingVerification: { ...prev.reversalPendingVerification, [symbol]: false },
          dailyStats: {
            ...prev.dailyStats,
            totalTradedNotional: prev.dailyStats.totalTradedNotional + openPrice * openNumericSize,
          },
          logs: [
            {
              id: createLogId(),
              timestamp: Date.now(),
              symbol,
              indicator: botSettings.indicator,
              action: 'open' as const,
              side: signalSide,
              signal,
              price: openPrice,
              size: openNumericSize,
              closePrice,
              openPrice,
              slippageBps: reversalSlippageBps,
              message: isPaperMode
                ? `[PAPER] Reversed to ${signalSide.toUpperCase()} in same cycle (slippage ${reversalSlippageBps.toFixed(1)} bps)`
                : `Reversed to ${signalSide.toUpperCase()} in same cycle (slippage ${reversalSlippageBps.toFixed(1)} bps)`,
            },
            ...prev.logs,
          ].slice(0, MAX_LOGS),
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown bot error';
      set((prev) => ({
        logs: [
          {
            id: createLogId(),
            timestamp: Date.now(),
            symbol: 'SYSTEM',
            indicator: useSettingsStore.getState().settings.bot.indicator,
            action: 'error' as const,
            message,
          },
          ...prev.logs,
        ].slice(0, MAX_LOGS),
      }));
      toast.error(`Bot error: ${message}`);
    } finally {
      set({ isExecuting: false });
    }
  },
}),
    {
      name: 'ritex-bot-runtime',
      partialize: (state) => ({
        keepRunning: state.keepRunning,
      }),
    }
  )
);
