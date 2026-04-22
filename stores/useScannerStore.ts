import { create } from 'zustand';
import type { ScanResult, ScannerStatus, ScanType } from '@/models/Scanner';
import { ScannerService } from '@/lib/services/scanner.service';
import type { ExchangeTradingService } from '@/lib/services/types';
import { useSettingsStore } from './useSettingsStore';
import { useTopSymbolsStore } from './useTopSymbolsStore';
import { playNotificationSound } from '@/lib/sound-utils';
import { useAIStrategyStore } from './useAIStrategyStore';
import type { IndicatorSnapshot } from '@/lib/ai/types';
import { useRealtimeVolumeStore } from './useRealtimeVolumeStore';
import { formatVietnamTimestamp } from '@/lib/time-utils';

const scannerLogger = {
  info: (message: string, ...args: unknown[]) => console.log('[ScannerStore][INFO]', message, ...args),
  warn: (message: string, ...args: unknown[]) => console.warn('[ScannerStore][WARN]', message, ...args),
  error: (message: string, ...args: unknown[]) => console.error('[ScannerStore][ERROR]', message, ...args),
};

type ScannerTypeMetrics = {
  runs: number;
  totalDurationMs: number;
  averageDurationMs: number;
  totalSignals: number;
  lastDurationMs: number;
};

type ScannerMetrics = {
  totalRuns: number;
  failedRuns: number;
  totalDurationMs: number;
  averageDurationMs: number;
  lastDurationMs: number | null;
  lastRunAt: number | null;
  byType: Partial<Record<ScanType, ScannerTypeMetrics>>;
};

const createDefaultScannerMetrics = (): ScannerMetrics => ({
  totalRuns: 0,
  failedRuns: 0,
  totalDurationMs: 0,
  averageDurationMs: 0,
  lastDurationMs: null,
  lastRunAt: null,
  byType: {},
});

const updateScannerMetrics = (
  current: ScannerMetrics,
  runDurationMs: number,
  failed: boolean,
  byTypeDurations: Partial<Record<ScanType, number>>,
  byTypeSignals: Partial<Record<ScanType, number>>
): ScannerMetrics => {
  const totalRuns = current.totalRuns + 1;
  const failedRuns = current.failedRuns + (failed ? 1 : 0);
  const totalDurationMs = current.totalDurationMs + runDurationMs;

  const nextByType: Partial<Record<ScanType, ScannerTypeMetrics>> = { ...current.byType };
  const scanTypes = Object.keys(byTypeDurations) as ScanType[];

  for (const scanType of scanTypes) {
    const duration = byTypeDurations[scanType] ?? 0;
    const signals = byTypeSignals[scanType] ?? 0;
    const prev = nextByType[scanType] ?? {
      runs: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
      totalSignals: 0,
      lastDurationMs: 0,
    };

    const runs = prev.runs + 1;
    const typeTotalDuration = prev.totalDurationMs + duration;

    nextByType[scanType] = {
      runs,
      totalDurationMs: typeTotalDuration,
      averageDurationMs: typeTotalDuration / runs,
      totalSignals: prev.totalSignals + signals,
      lastDurationMs: duration,
    };
  }

  return {
    totalRuns,
    failedRuns,
    totalDurationMs,
    averageDurationMs: totalDurationMs / totalRuns,
    lastDurationMs: runDurationMs,
    lastRunAt: Date.now(),
    byType: nextByType,
  };
};

interface ScannerStore {
  results: ScanResult[];
  status: ScannerStatus;
  scannerMetrics: ScannerMetrics;
  intervalId: NodeJS.Timeout | null;
  previousSymbols: Set<string>;
  service: ExchangeTradingService | null;
  scannerService: ScannerService | null;
  setService: (service: ExchangeTradingService) => void;
  runScan: () => Promise<void>;
  startAutoScan: () => void;
  startAutoScanWithDelay: () => void;
  stopAutoScan: () => void;
  clearResults: () => void;
}

export const useScannerStore = create<ScannerStore>((set, get) => ({
  results: [],
  status: {
    isRunning: false,
    isScanning: false,
    lastScanTime: null,
    error: null,
  },
  scannerMetrics: createDefaultScannerMetrics(),
  intervalId: null,
  previousSymbols: new Set(),
  service: null,
  scannerService: null,

  setService: (service: ExchangeTradingService) => {
    set({
      service,
      scannerService: new ScannerService(service)
    });
  },

  runScan: async () => {
    const { status, scannerService } = get();
    if (status.isScanning) return;
    const runStartedAt = Date.now();
    const scanTypeDurations: Partial<Record<ScanType, number>> = {};
    const scanTypeSignals: Partial<Record<ScanType, number>> = {};

    if (!scannerService) {
      scannerLogger.warn('Scanner service not initialized');
      return;
    }

    set({
      status: {
        ...status,
        isScanning: true,
        error: null,
        progress: {
          stage: 'preparing',
          completed: 0,
          total: 1,
          message: 'Preparing scanner run',
        },
      },
    });

    try {
      const settings = useSettingsStore.getState().settings.scanner;
      const indicatorSettings = useSettingsStore.getState().settings.indicators;

      const topSymbolsStore = useTopSymbolsStore.getState();
      const symbols = topSymbolsStore.symbols
        .slice(0, settings.topMarkets)
        .map(s => s.name);

      if (symbols.length === 0) {
        set({
          status: {
            ...get().status,
            isScanning: false,
            lastScanTime: Date.now(),
            error: 'No symbols available to scan',
            progress: undefined,
          },
        });
        return;
      }

      // ✨ NEW: Ensure candles are available for all symbols before scanning
      scannerLogger.info(`Ensuring candles for ${symbols.length} symbols...`);
      await scannerService.ensureCandlesForSymbols(symbols, settings, (progress) => {
        set({
          status: {
            ...get().status,
            progress: {
              stage: 'fetching-candles',
              completed: progress.completed,
              total: progress.total,
              message: progress.message,
            },
          },
        });
      });
      scannerLogger.info('Candles ready, starting scan...');

      const newResults: ScanResult[] = [];
      const { hasTrigger } = useRealtimeVolumeStore.getState();
      const enabledScannerCount = [
        settings.stochasticScanner.enabled,
        settings.volumeSpikeScanner.enabled,
        settings.emaAlignmentScanner.enabled,
        settings.macdReversalScanner.enabled,
        settings.rsiReversalScanner.enabled,
        settings.channelScanner.enabled,
        settings.divergenceScanner.enabled,
        !!settings.supportResistanceScanner?.enabled,
        !!settings.kalmanTrendScanner?.enabled,
        !!settings.ritchiTrendScanner?.enabled,
      ].filter(Boolean).length;
      const totalScannerSteps = Math.max(enabledScannerCount, 1);
      let completedScannerSteps = 0;

      const markScannerProgress = (scannerLabel: string) => {
        set({
          status: {
            ...get().status,
            progress: {
              stage: 'scanning',
              completed: completedScannerSteps,
              total: totalScannerSteps,
              message: `Running ${scannerLabel} scanner`,
            },
          },
        });
      };

      if (settings.stochasticScanner.enabled) {
        markScannerProgress('Stochastic');
        const stepStartedAt = Date.now();
        const stochResults = await scannerService.scanMultipleSymbols(symbols, {
          timeframes: settings.stochasticScanner.timeframes,
          config: settings.stochasticScanner,
          variants: indicatorSettings.stochastic.variants,
        });
        newResults.push(...stochResults);
        scanTypeDurations.stochastic = Date.now() - stepStartedAt;
        scanTypeSignals.stochastic = stochResults.length;
        completedScannerSteps += 1;
        markScannerProgress('Stochastic');
      }

      if (settings.volumeSpikeScanner.enabled) {
        markScannerProgress('Volume Spike');
        const stepStartedAt = Date.now();
        const volumeResults = await scannerService.scanMultipleSymbolsForVolume(symbols, {
          timeframes: settings.volumeSpikeScanner.timeframes,
          config: settings.volumeSpikeScanner,
        });
        newResults.push(...volumeResults);
        scanTypeDurations.volumeSpike = Date.now() - stepStartedAt;
        scanTypeSignals.volumeSpike = volumeResults.length;
        completedScannerSteps += 1;
        markScannerProgress('Volume Spike');
      }

      if (settings.emaAlignmentScanner.enabled) {
        markScannerProgress('EMA Alignment');
        const stepStartedAt = Date.now();
        const emaResults = await scannerService.scanMultipleSymbolsForEmaAlignment(symbols, {
          timeframes: settings.emaAlignmentScanner.timeframes,
          config: settings.emaAlignmentScanner,
        });
        newResults.push(...emaResults);
        scanTypeDurations.emaAlignment = Date.now() - stepStartedAt;
        scanTypeSignals.emaAlignment = emaResults.length;
        completedScannerSteps += 1;
        markScannerProgress('EMA Alignment');
      }

      if (settings.macdReversalScanner.enabled) {
        markScannerProgress('MACD Reversal');
        const stepStartedAt = Date.now();
        const macdResults = await scannerService.scanMultipleSymbolsForMacdReversal(symbols, {
          timeframes: settings.macdReversalScanner.timeframes,
          config: settings.macdReversalScanner,
        });
        newResults.push(...macdResults);
        scanTypeDurations.macdReversal = Date.now() - stepStartedAt;
        scanTypeSignals.macdReversal = macdResults.length;
        completedScannerSteps += 1;
        markScannerProgress('MACD Reversal');
      }

      if (settings.rsiReversalScanner.enabled) {
        markScannerProgress('RSI Reversal');
        const stepStartedAt = Date.now();
        const rsiResults = await scannerService.scanMultipleSymbolsForRsiReversal(symbols, {
          timeframes: settings.rsiReversalScanner.timeframes,
          config: settings.rsiReversalScanner,
        });
        newResults.push(...rsiResults);
        scanTypeDurations.rsiReversal = Date.now() - stepStartedAt;
        scanTypeSignals.rsiReversal = rsiResults.length;
        completedScannerSteps += 1;
        markScannerProgress('RSI Reversal');
      }

      if (settings.channelScanner.enabled) {
        markScannerProgress('Channel');
        const stepStartedAt = Date.now();
        const channelResults = await scannerService.scanMultipleSymbolsForChannel(symbols, {
          timeframes: settings.channelScanner.timeframes,
          config: settings.channelScanner,
        });
        newResults.push(...channelResults);
        scanTypeDurations.channel = Date.now() - stepStartedAt;
        scanTypeSignals.channel = channelResults.length;
        completedScannerSteps += 1;
        markScannerProgress('Channel');
      }

      if (settings.divergenceScanner.enabled) {
        markScannerProgress('Divergence');
        const stepStartedAt = Date.now();
        const divergenceResults = await scannerService.scanMultipleSymbolsForDivergence(symbols, {
          timeframes: settings.divergenceScanner.timeframes,
          config: settings.divergenceScanner,
        });
        newResults.push(...divergenceResults);
        scanTypeDurations.divergence = Date.now() - stepStartedAt;
        scanTypeSignals.divergence = divergenceResults.length;
        completedScannerSteps += 1;
        markScannerProgress('Divergence');
      }

      if (settings.supportResistanceScanner?.enabled) {
        markScannerProgress('Support/Resistance');
        const stepStartedAt = Date.now();
        const supportResistanceResults = await scannerService.scanMultipleSymbolsForSupportResistance(symbols, {
          timeframes: settings.supportResistanceScanner.timeframes,
          config: settings.supportResistanceScanner,
        });
        newResults.push(...supportResistanceResults);
        scanTypeDurations.supportResistance = Date.now() - stepStartedAt;
        scanTypeSignals.supportResistance = supportResistanceResults.length;
        completedScannerSteps += 1;
        markScannerProgress('Support/Resistance');
      }

      if (settings.kalmanTrendScanner?.enabled) {
        markScannerProgress('Kalman Trend');
        const stepStartedAt = Date.now();
        const kalmanResults = await scannerService.scanMultipleSymbolsForKalmanTrend(symbols, {
          timeframes: settings.kalmanTrendScanner.timeframes,
          config: settings.kalmanTrendScanner,
        });
        newResults.push(...kalmanResults);
        scanTypeDurations.kalmanTrend = Date.now() - stepStartedAt;
        scanTypeSignals.kalmanTrend = kalmanResults.length;
        completedScannerSteps += 1;
        markScannerProgress('Kalman Trend');
      }

      if (settings.ritchiTrendScanner?.enabled) {
        markScannerProgress('Ritchi Trend');
        const stepStartedAt = Date.now();
        const ritchiResults = await scannerService.scanMultipleSymbolsForRitchiTrend(symbols, {
          timeframes: settings.ritchiTrendScanner.timeframes,
          config: settings.ritchiTrendScanner,
        });
        newResults.push(...ritchiResults);
        scanTypeDurations.ritchiTrend = Date.now() - stepStartedAt;
        scanTypeSignals.ritchiTrend = ritchiResults.length;
        completedScannerSteps += 1;
        markScannerProgress('Ritchi Trend');
      }

      // Augment results with realtime volume trigger signal
      for (const result of newResults) {
        if (hasTrigger(result.symbol)) {
          result.realtimeVolumeTrigger = true;
        }
      }

      const newSymbols = new Set(newResults.map((r: ScanResult) => r.symbol));

      if (newResults.length > 0 && settings.playSound) {
        const firstResult = newResults[0];
        scannerLogger.info(`Scan completed with ${newResults.length} result(s): ${newResults.map(r => r.symbol).join(', ')} - Playing sound`);
        playNotificationSound(firstResult.signalType).catch(err =>
          scannerLogger.error('Error playing sound:', err)
        );
      } else if (settings.playSound) {
        scannerLogger.info('Scan completed with no results - skipping sound');
      } else {
        scannerLogger.info('Sound disabled in settings');
      }

      // Scanner Telegram Alerts
      if (
        newResults.length > 0 &&
        settings.telegramEnabled &&
        settings.telegramBotToken &&
        settings.telegramChatId
      ) {
        const filteredResults = settings.telegramSignalFilter === 'all'
          ? newResults
          : newResults.filter(r => r.signalType === settings.telegramSignalFilter);

        if (filteredResults.length > 0) {
          sendScannerTelegramAlerts(filteredResults, settings.telegramBotToken, settings.telegramChatId, settings.telegramShowTpSl).catch(err =>
            scannerLogger.error('[Scanner Telegram] Error sending alerts:', err)
          );
        }
      }

      set({
        status: {
          ...get().status,
          progress: {
            stage: 'finalizing',
            completed: 1,
            total: 1,
            message: 'Finalizing scanner results',
          },
        },
      });

      const runDurationMs = Date.now() - runStartedAt;
      set((state) => ({
        results: newResults,
        previousSymbols: newSymbols,
        status: {
          ...state.status,
          isScanning: false,
          lastScanTime: Date.now(),
          error: null,
          progress: undefined,
        },
        scannerMetrics: updateScannerMetrics(
          state.scannerMetrics,
          runDurationMs,
          false,
          scanTypeDurations,
          scanTypeSignals
        ),
      }));

      // AI Strategy: analyze first signal if AI is enabled
      const aiSettings = useSettingsStore.getState().settings.ai;
      if (aiSettings.enabled && aiSettings.claudeApiKey && newResults.length > 0) {
        const firstSignal = newResults[0];
        const snapshot: IndicatorSnapshot = {
          symbol: firstSignal.symbol,
          signalType: firstSignal.signalType,
          scanType: firstSignal.scanType,
          description: firstSignal.description,
          matchedAt: Date.now(),
          stochastics: firstSignal.stochastics,
          macdReversals: firstSignal.macdReversals,
          rsiReversals: firstSignal.rsiReversals,
          closePrices: firstSignal.closePrices,
        };
        useAIStrategyStore.getState().analyzeSignal(snapshot);
      }
    } catch (error) {
      scannerLogger.error('Scanner error:', error);
      const runDurationMs = Date.now() - runStartedAt;
      set((state) => ({
        status: {
          ...state.status,
          isScanning: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: undefined,
        },
        scannerMetrics: updateScannerMetrics(
          state.scannerMetrics,
          runDurationMs,
          true,
          scanTypeDurations,
          scanTypeSignals
        ),
      }));
    }
  },

  startAutoScan: () => {
    const { intervalId, status } = get();

    if (status.isRunning) return;

    get().runScan();

    const settings = useSettingsStore.getState().settings.scanner;
    const intervalMs = settings.scanInterval * 60 * 1000;

    const newIntervalId = setInterval(() => {
      get().runScan();
    }, intervalMs);

    set({
      intervalId: newIntervalId,
      status: {
        ...status,
        isRunning: true,
      },
    });
  },

  startAutoScanWithDelay: () => {
    const { intervalId, status } = get();

    if (status.isRunning) return;

    const settings = useSettingsStore.getState().settings.scanner;
    const intervalMs = settings.scanInterval * 60 * 1000;

    const newIntervalId = setInterval(() => {
      get().runScan();
    }, intervalMs);

    set({
      intervalId: newIntervalId,
      status: {
        ...status,
        isRunning: true,
      },
    });
  },

  stopAutoScan: () => {
    const { intervalId, status } = get();

    if (intervalId) {
      clearInterval(intervalId);
    }

    set({
      intervalId: null,
      status: {
        ...status,
        isRunning: false,
      },
    });
  },

  clearResults: () => {
    set({ results: [], previousSymbols: new Set() });
  },
}));

const SCAN_TYPE_LABELS: Record<string, string> = {
  stochastic: 'Stochastic',
  emaAlignment: 'EMA Alignment',
  channel: 'Channel',
  divergence: 'Divergence',
  macdReversal: 'MACD Reversal',
  rsiReversal: 'RSI Reversal',
  volumeSpike: 'Volume Spike',
  supportResistance: 'S/R Level',
  kalmanTrend: 'Kalman Trend',
  ritchiTrend: 'Ritchi Trend',
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function getTimeframe(result: ScanResult): string {
  if (result.kalmanTrends?.[0]) return result.kalmanTrends[0].timeframe.toUpperCase();
  if (result.ritchiTrends?.[0]) return result.ritchiTrends[0].timeframe.toUpperCase();
  if (result.stochastics?.[0]) return result.stochastics[0].timeframe.toUpperCase();
  if (result.emaAlignments?.[0]) return result.emaAlignments[0].timeframe.toUpperCase();
  if (result.macdReversals?.[0]) return result.macdReversals[0].timeframe.toUpperCase();
  if (result.rsiReversals?.[0]) return result.rsiReversals[0].timeframe.toUpperCase();
  if (result.volumeSpikes?.[0]) return result.volumeSpikes[0].timeframe.toUpperCase();
  if (result.channels?.[0]) return result.channels[0].timeframe.toUpperCase();
  if (result.supportResistanceLevels?.[0]) return result.supportResistanceLevels[0].timeframe.toUpperCase();
  return '1M';
}

function getEntryPrice(result: ScanResult): number {
  if (result.closePrices && result.closePrices.length > 0) {
    return result.closePrices[result.closePrices.length - 1];
  }
  if (result.ritchiTrends?.[0]) return result.ritchiTrends[0].price;
  if (result.macdReversals?.[0]) return result.macdReversals[0].price;
  if (result.rsiReversals?.[0]) return result.rsiReversals[0].price;
  if (result.supportResistanceLevels?.[0]) return result.supportResistanceLevels[0].currentPrice;
  if (result.channels?.[0]) return result.channels[0].currentPrice;
  return 0;
}

function getVolumeDeltaRaw(result: ScanResult): number {
  if (result.kalmanTrends?.[0]) return Math.abs(result.kalmanTrends[0].delta);
  if (result.volumeSpikes?.[0]) return result.volumeSpikes[0].volumeRatio;
  return 1.0;
}

function getVolumeDelta(result: ScanResult): string {
  if (result.kalmanTrends?.[0]) {
    const d = result.kalmanTrends[0].delta;
    return (d >= 0 ? '+' : '') + d.toFixed(2);
  }
  if (result.volumeSpikes?.[0]) {
    return '+' + result.volumeSpikes[0].volumeRatio.toFixed(2);
  }
  return '—';
}

function getStrategyName(result: ScanResult): string {
  if (result.scanType === 'kalmanTrend') return 'Volume Trend Strategy [RitchiVietnam]';
  if (result.scanType === 'ritchiTrend') return 'Siêu Xu Hướng [Ritchi]';
  return SCAN_TYPE_LABELS[result.scanType] || result.scanType;
}

async function sendScannerTelegramAlerts(
  results: ScanResult[],
  botToken: string,
  chatId: string,
  showTpSl: boolean = false,
) {
  for (const r of results) {
    const isBuy = r.signalType === 'bullish';
    const emoji = isBuy ? '🟢' : '🔴';
    const arrow = isBuy ? '▲' : '▼';
    const side = isBuy ? 'LONG' : 'SHORT';
    const action = isBuy ? 'BUY' : 'SELL';
    const tf = getTimeframe(r);
    const entry = getEntryPrice(r);
    const delta = getVolumeDelta(r);
    const strategy = getStrategyName(r);

    const now = new Date();
    const timestamp = formatVietnamTimestamp(now);

    const lines = [
      `${emoji} ${arrow} <b>${action} — ${r.symbol}USDT</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 Sàn: HYPERLIQUID  |  KH: ${tf}  |  Side: ${side}`,
      `💰 Giá vào: ${formatPrice(entry)}`,
      `📈 Volume Delta: ${delta}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
    ];

    if (showTpSl && entry > 0) {
      const deltaRaw = getVolumeDeltaRaw(r);
      const d = Math.max(0.5, Math.min(deltaRaw, 5.0));
      const pct = d; // TP/SL % = Volume Delta value directly

      const sign = isBuy ? 1 : -1;
      const tp = entry * (1 + sign * pct / 100);
      const sl = entry * (1 - sign * pct / 100);

      const tpLabel = `${isBuy ? '+' : '-'}${pct.toFixed(2)}%`;
      const slLabel = `${isBuy ? '-' : '+'}${pct.toFixed(2)}%`;

      lines.push(
        `📌 Take Profit: ${formatPrice(tp)} (${tpLabel})`,
        `🛑 Stop Loss: ${formatPrice(sl)} (${slLabel})`,
        `━━━━━━━━━━━━━━━━━━━━━━`,
      );
    }

    lines.push(
      `🕐 ${timestamp}`,
      `<i>${strategy}</i>`,
    );

    try {
      await fetch('/api/telegram/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId, message: lines.join('\n') }),
      });
      console.log(`[Scanner Telegram] Sent alert for ${r.symbol}`);
    } catch (err) {
      console.error(`[Scanner Telegram] Failed to send for ${r.symbol}:`, err);
    }
  }
}
