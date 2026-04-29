import { create } from 'zustand';
import type { ExchangeTradingService } from '@/lib/services/types';
import { ScannerService } from '@/lib/services/scanner.service';
import { useSettingsStore } from './useSettingsStore';
import { useTopSymbolsStore } from './useTopSymbolsStore';
import { useSymbolVolatilityStore } from './useSymbolVolatilityStore';
import { useDexStore } from './useDexStore';
import toast from 'react-hot-toast';
import type { BotIndicatorType } from '@/models/Settings';

type BotSignal = 'bullish' | 'bearish';
type BotPositionSide = 'long' | 'short';

interface BotTrackedPosition {
  symbol: string;
  side: BotPositionSide;
  size: number;
  entryPrice: number;
  openedAt: number;
  notional: number;
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
  message: string;
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
  dailyStats: BotDailyStats;
  intervalId: NodeJS.Timeout | null;
  setService: (service: ExchangeTradingService) => void;
  start: () => Promise<void>;
  stop: () => void;
  runCycle: () => Promise<void>;
  closeAllPositionsNow: () => Promise<void>;
  clearLogs: () => void;
  importLogs: (entries: Array<Omit<BotLogEntry, 'id'>>) => void;
  toggleManualSymbol: (symbol: string) => void;
  syncTrackedSymbols: () => void;
}

const getDayKey = (): string => new Date().toISOString().slice(0, 10);

const defaultDailyStats = (): BotDailyStats => ({
  dayKey: getDayKey(),
  totalTradedNotional: 0,
  realizedPnl: 0,
  realizedPnlBySymbol: {},
  tradingDisabled: false,
});

const getTopVolatileSymbols = (): string[] => {
  const ranked = [...useTopSymbolsStore.getState().symbols]
    .map((item) => {
      const volatility = useSymbolVolatilityStore.getState().volatility[item.name]?.percentChange ?? 0;
      return { symbol: item.name, score: Math.abs(volatility) };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.symbol);

  return ranked.slice(0, 3);
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

export const useBotTradingStore = create<BotTradingStore>((set, get) => ({
  service: null,
  scannerService: null,
  isRunning: false,
  isExecuting: false,
  trackedSymbols: [],
  desiredAutoSymbols: [],
  positions: {},
  lastSignals: {},
  logs: [],
  dailyStats: defaultDailyStats(),
  intervalId: null,

  setService: (service) => {
    set({
      service,
      scannerService: new ScannerService(service),
    });
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
    const botSettings = useSettingsStore.getState().settings.bot;
    const state = get();
    let nextTracked: string[] = [];

    if (botSettings.symbolMode === 'manual') {
      nextTracked = [...botSettings.manualSymbols];
      set({ desiredAutoSymbols: [] });
    } else {
      const desired = getTopVolatileSymbols();
      const withOpenPositions = Object.keys(state.positions);
      const keepOpen = withOpenPositions.filter((symbol) => !desired.includes(symbol));
      nextTracked = Array.from(new Set([...desired, ...keepOpen]));
      set({ desiredAutoSymbols: desired });
    }

    set({ trackedSymbols: nextTracked });
  },

  start: async () => {
    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
    }

    set({ isRunning: true });
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

    set({ intervalId: nextIntervalId, isRunning: true });
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

  runCycle: async () => {
    const state = get();
    const { service, scannerService, isExecuting } = state;
    if (!service || !scannerService || isExecuting) {
      return;
    }

    const settingsStore = useSettingsStore.getState();
    const botSettings = settingsStore.settings.bot;
    const scannerSettings = settingsStore.settings.scanner;
    const selectedExchange = useDexStore.getState().selectedExchange;
    if (!botSettings.enabled) {
      return;
    }
    if (selectedExchange !== botSettings.exchange) {
      return;
    }

    const dayKey = getDayKey();
    let dailyStats = state.dailyStats;
    if (dailyStats.dayKey !== dayKey) {
      dailyStats = defaultDailyStats();
      set({ dailyStats });
    }

    if (dailyStats.tradingDisabled) {
      return;
    }

    get().syncTrackedSymbols();
    const symbols = get().trackedSymbols;
    if (symbols.length === 0) {
      return;
    }

    set({ isExecuting: true });
    try {
      for (const symbol of symbols) {
        let result: { signalType: BotSignal } | null = null;

        if (botSettings.indicator === 'ritchi') {
          const r = await scannerService.scanRitchiTrend({
            symbol,
            timeframes: [botSettings.timeframe],
            config: {
              enabled: true,
              timeframes: [botSettings.timeframe],
              pivLen: scannerSettings.ritchiTrendScanner.pivLen,
              smaMin: scannerSettings.ritchiTrendScanner.smaMin,
              smaMax: scannerSettings.ritchiTrendScanner.smaMax,
            },
          });
          result = r ? { signalType: r.signalType } : null;
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

        const signal = result?.signalType ?? null;
        const currentPosition = get().positions[symbol] || null;
        set((prev) => ({ lastSignals: { ...prev.lastSignals, [symbol]: signal } }));

        if (!signal) {
          set((prev) => ({
            logs: [
              {
                id: createLogId(),
                timestamp: Date.now(),
                symbol,
                indicator: botSettings.indicator,
                action: 'skip' as const,
                signal: null,
                message: 'No valid signal for current cycle',
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

        const nextLoss = Math.max(0, -(dailyStats.realizedPnl + realizedPnl));
        const maxLossUsd = (Math.max(0, dailyStats.totalTradedNotional) * botSettings.maxLossPercentPerDay) / 100;
        const hitDailyLoss = maxLossUsd > 0 && nextLoss >= maxLossUsd;

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
}));
