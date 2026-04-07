import { create } from 'zustand';
import type { ScanResult, ScannerStatus } from '@/models/Scanner';
import type { HyperliquidService } from '@/lib/services/hyperliquid.service';
import { ScannerService } from '@/lib/services/scanner.service';
import { useSettingsStore } from './useSettingsStore';
import { useTopSymbolsStore } from './useTopSymbolsStore';
import { playNotificationSound } from '@/lib/sound-utils';
import { useAIStrategyStore } from './useAIStrategyStore';
import type { IndicatorSnapshot } from '@/lib/ai/types';

interface ScannerStore {
  results: ScanResult[];
  status: ScannerStatus;
  intervalId: NodeJS.Timeout | null;
  previousSymbols: Set<string>;
  service: HyperliquidService | null;
  scannerService: ScannerService | null;
  setService: (service: HyperliquidService) => void;
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
  intervalId: null,
  previousSymbols: new Set(),
  service: null,
  scannerService: null,

  setService: (service: HyperliquidService) => {
    set({
      service,
      scannerService: new ScannerService(service)
    });
  },

  runScan: async () => {
    const { status, scannerService } = get();
    if (status.isScanning) return;

    if (!scannerService) {
      console.warn('Scanner service not initialized');
      return;
    }

    set({
      status: {
        ...status,
        isScanning: true,
        error: null,
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
          },
        });
        return;
      }

      const newResults: ScanResult[] = [];

      if (settings.stochasticScanner.enabled) {
        const stochResults = await scannerService.scanMultipleSymbols(symbols, {
          timeframes: settings.stochasticScanner.timeframes,
          config: settings.stochasticScanner,
          variants: indicatorSettings.stochastic.variants,
        });
        newResults.push(...stochResults);
      }

      if (settings.volumeSpikeScanner.enabled) {
        const volumeResults = await scannerService.scanMultipleSymbolsForVolume(symbols, {
          timeframes: settings.volumeSpikeScanner.timeframes,
          config: settings.volumeSpikeScanner,
        });
        newResults.push(...volumeResults);
      }

      if (settings.emaAlignmentScanner.enabled) {
        const emaResults = await scannerService.scanMultipleSymbolsForEmaAlignment(symbols, {
          timeframes: settings.emaAlignmentScanner.timeframes,
          config: settings.emaAlignmentScanner,
        });
        newResults.push(...emaResults);
      }

      if (settings.macdReversalScanner.enabled) {
        const macdResults = await scannerService.scanMultipleSymbolsForMacdReversal(symbols, {
          timeframes: settings.macdReversalScanner.timeframes,
          config: settings.macdReversalScanner,
        });
        newResults.push(...macdResults);
      }

      if (settings.rsiReversalScanner.enabled) {
        const rsiResults = await scannerService.scanMultipleSymbolsForRsiReversal(symbols, {
          timeframes: settings.rsiReversalScanner.timeframes,
          config: settings.rsiReversalScanner,
        });
        newResults.push(...rsiResults);
      }

      if (settings.channelScanner.enabled) {
        const channelResults = await scannerService.scanMultipleSymbolsForChannel(symbols, {
          timeframes: settings.channelScanner.timeframes,
          config: settings.channelScanner,
        });
        newResults.push(...channelResults);
      }

      if (settings.divergenceScanner.enabled) {
        const divergenceResults = await scannerService.scanMultipleSymbolsForDivergence(symbols, {
          timeframes: settings.divergenceScanner.timeframes,
          config: settings.divergenceScanner,
        });
        newResults.push(...divergenceResults);
      }

      if (settings.supportResistanceScanner?.enabled) {
        const supportResistanceResults = await scannerService.scanMultipleSymbolsForSupportResistance(symbols, {
          timeframes: settings.supportResistanceScanner.timeframes,
          config: settings.supportResistanceScanner,
        });
        newResults.push(...supportResistanceResults);
      }

      if (settings.kalmanTrendScanner?.enabled) {
        const kalmanResults = await scannerService.scanMultipleSymbolsForKalmanTrend(symbols, {
          timeframes: settings.kalmanTrendScanner.timeframes,
          config: settings.kalmanTrendScanner,
        });
        newResults.push(...kalmanResults);
      }

      const newSymbols = new Set(newResults.map((r: ScanResult) => r.symbol));

      if (newResults.length > 0 && settings.playSound) {
        const firstResult = newResults[0];
        console.log(`[Scanner] Scan completed with ${newResults.length} result(s): ${newResults.map(r => r.symbol).join(', ')} - Playing sound`);
        playNotificationSound(firstResult.signalType).catch(err =>
          console.error('Error playing sound:', err)
        );
      } else if (settings.playSound) {
        console.log('[Scanner] Scan completed with no results - skipping sound');
      } else {
        console.log('[Scanner] Sound disabled in settings');
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
            console.error('[Scanner Telegram] Error sending alerts:', err)
          );
        }
      }

      set({
        results: newResults,
        previousSymbols: newSymbols,
        status: {
          ...get().status,
          isScanning: false,
          lastScanTime: Date.now(),
          error: null,
        },
      });

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
      console.error('Scanner error:', error);
      set({
        status: {
          ...get().status,
          isScanning: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
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
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function getTimeframe(result: ScanResult): string {
  if (result.kalmanTrends?.[0]) return result.kalmanTrends[0].timeframe.toUpperCase();
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
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

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
      // Clamp delta between 0.5 and 5.0 for reasonable TP/SL ranges
      const d = Math.max(0.5, Math.min(deltaRaw, 5.0));

      // TP/SL % scales with volume delta strength
      const tp1Pct = d * 1.5;   // e.g. delta 1.2 → 1.8%
      const tp2Pct = d * 3.0;   // e.g. delta 1.2 → 3.6%
      const tp3Pct = d * 5.0;   // e.g. delta 1.2 → 6.0%
      const tp4Pct = d * 7.0;   // e.g. delta 1.2 → 8.4%
      const slPct  = d * 1.5;   // e.g. delta 1.2 → 1.8%

      const sign = isBuy ? 1 : -1;
      const tp1 = entry * (1 + sign * tp1Pct / 100);
      const tp2 = entry * (1 + sign * tp2Pct / 100);
      const tp3 = entry * (1 + sign * tp3Pct / 100);
      const tp4 = entry * (1 + sign * tp4Pct / 100);
      const sl  = entry * (1 - sign * slPct / 100);

      const tp1Label = `${isBuy ? '+' : '-'}${tp1Pct.toFixed(1)}%`;
      const tp2Label = `${isBuy ? '+' : '-'}${tp2Pct.toFixed(1)}%`;
      const tp3Label = `${isBuy ? '+' : '-'}${tp3Pct.toFixed(1)}%`;
      const tp4Label = `${isBuy ? '+' : '-'}${tp4Pct.toFixed(1)}%`;
      const slLabel  = `${isBuy ? '-' : '+'}${slPct.toFixed(1)}%`;

      lines.push(
        `📌 <b>Take Profit:</b>`,
        `  🎯 TP1: ${formatPrice(tp1)} (${tp1Label})`,
        `  🎯 TP2: ${formatPrice(tp2)} (${tp2Label})`,
        `  🎯 TP3: ${formatPrice(tp3)} (${tp3Label})`,
        `  🎯 TP4: ${formatPrice(tp4)} (${tp4Label})`,
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
