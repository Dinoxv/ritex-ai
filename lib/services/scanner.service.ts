import type { ExchangeTradingService } from './types';
import type { TimeInterval } from '@/types';
import type {
  StochasticValue,
  ScanResult,
  VolumeValue,
  EmaAlignmentValue,
  MacdReversalValue,
  RsiReversalValue,
  ChannelValue,
  DivergenceValue,
  SupportResistanceValue,
  KalmanTrendValue,
  RitchiTrendValue
} from '@/models/Scanner';
import type {
  StochasticScannerConfig,
  StochasticVariantConfig,
  VolumeSpikeConfig,
  EmaAlignmentScannerConfig,
  MacdReversalScannerConfig,
  RsiReversalScannerConfig,
  ChannelScannerConfig,
  DivergenceScannerConfig,
  SupportResistanceScannerConfig,
  KalmanTrendScannerConfig,
  RitchiTrendScannerConfig,
  ScannerSettings
} from '@/models/Settings';
import type { TransformedCandle } from './types';
import {
  calculateStochastic,
  detectEmaAlignment,
  calculateMACD,
  calculateRSI,
  detectChannels,
  detectPivots,
  detectStochasticPivots,
  detectRSIPivots,
  detectDivergence,
  calculateTrendlines,
  calculateATR,
  calculateKalmanTrend,
  calculateSieuXuHuong,
  type DivergenceOptions
} from '@/lib/indicators';
import { aggregate1mTo5m } from '@/lib/candle-aggregator';
import { downsampleCandles } from '@/lib/candle-utils';
import { useCandleStore } from '@/stores/useCandleStore';
import { useDexStore } from '@/stores/useDexStore';
import { INTERVAL_TO_MS } from '@/lib/time-utils';

export interface StochasticScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: StochasticScannerConfig;
  variants: Record<'ultraFast' | 'fast' | 'medium' | 'slow', StochasticVariantConfig>;
}

export interface VolumeScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: VolumeSpikeConfig;
}

export interface EmaAlignmentScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: EmaAlignmentScannerConfig;
}

export interface MacdReversalScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: MacdReversalScannerConfig;
}

export interface RsiReversalScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: RsiReversalScannerConfig;
}

export interface ChannelScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: ChannelScannerConfig;
}

export interface DivergenceScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: DivergenceScannerConfig;
}

export interface SupportResistanceScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: SupportResistanceScannerConfig;
}

export interface KalmanTrendScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: KalmanTrendScannerConfig;
}

export interface RitchiTrendScanParams {
  symbol: string;
  timeframes: TimeInterval[];
  config: RitchiTrendScannerConfig;
}

interface CandleFetchProgress {
  stage: 'fetching-candles';
  completed: number;
  total: number;
  message?: string;
}

export class ScannerService {
  private candleFetchInFlight = new Map<string, Promise<void>>();
  private readonly scanConcurrencyLimit = 8;

  constructor(private hyperliquidService: ExchangeTradingService) {}

  private logInfo(message: string, ...args: unknown[]) {
    console.log('[ScannerService][INFO]', message, ...args);
  }

  private logWarn(message: string, ...args: unknown[]) {
    console.warn('[ScannerService][WARN]', message, ...args);
  }

  private logError(message: string, ...args: unknown[]) {
    console.error('[ScannerService][ERROR]', message, ...args);
  }

  private getCandleFetchBatchSize(): number {
    const selectedExchange = useDexStore.getState().selectedExchange;
    return selectedExchange === 'binance' ? 20 : 10;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchCandlesWithRetry(
    symbol: string,
    startTime: number,
    endTime: number,
    maxRetries = 3
  ): Promise<void> {
    const candleStore = useCandleStore.getState();
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        await candleStore.fetchCandles(symbol, '1m', startTime, endTime);
        return;
      } catch (error) {
        attempt += 1;
        const isFinalAttempt = attempt > maxRetries;

        if (isFinalAttempt) {
          throw error;
        }

        const backoffMs = Math.min(400 * (2 ** (attempt - 1)), 4000);
        this.logWarn(
          `Retrying candle fetch for ${symbol} (attempt ${attempt}/${maxRetries}, wait ${backoffMs}ms)`
        );
        await this.sleep(backoffMs);
      }
    }
  }

  private updateRequiredCandlesForTimeframes(
    currentRequired: number,
    lookbackCandles: number,
    timeframes: ('1m' | '5m')[]
  ): number {
    let required = currentRequired;
    if (timeframes.includes('1m')) {
      required = Math.max(required, lookbackCandles);
    }
    if (timeframes.includes('5m')) {
      required = Math.max(required, lookbackCandles * 5);
    }
    return required;
  }

  private getRequired1mCandles(settings: ScannerSettings): number {
    let requiredCandles = 0;

    if (settings.stochasticScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        150,
        settings.stochasticScanner.timeframes
      );
    }

    if (settings.volumeSpikeScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        150,
        settings.volumeSpikeScanner.timeframes
      );
    }

    if (settings.emaAlignmentScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        Math.max(150, settings.emaAlignmentScanner.lookbackBars),
        settings.emaAlignmentScanner.timeframes
      );
    }

    if (settings.macdReversalScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        Math.max(150, settings.macdReversalScanner.minCandles),
        settings.macdReversalScanner.timeframes
      );
    }

    if (settings.rsiReversalScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        Math.max(150, settings.rsiReversalScanner.minCandles),
        settings.rsiReversalScanner.timeframes
      );
    }

    if (settings.channelScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        settings.channelScanner.lookbackBars,
        settings.channelScanner.timeframes
      );
    }

    if (settings.divergenceScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        150,
        settings.divergenceScanner.timeframes
      );
    }

    if (settings.supportResistanceScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        150,
        settings.supportResistanceScanner.timeframes
      );
    }

    if (settings.kalmanTrendScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        150,
        settings.kalmanTrendScanner.timeframes
      );
    }

    if (settings.ritchiTrendScanner.enabled) {
      requiredCandles = this.updateRequiredCandlesForTimeframes(
        requiredCandles,
        150,
        settings.ritchiTrendScanner.timeframes
      );
    }

    return Math.max(requiredCandles, 150);
  }

  /**
   * Ensure candles are available for scanning
   * Fetches missing candles before running scans
   */
  async ensureCandlesForSymbols(
    symbols: string[],
    settings: ScannerSettings,
    onProgress?: (progress: CandleFetchProgress) => void
  ): Promise<void> {
    const candleStore = useCandleStore.getState();
    const uniqueSymbols = Array.from(new Set(symbols));
    const requiredCandles = this.getRequired1mCandles(settings);
    const missingSymbols: string[] = [];
    const existingInFlightPromises: Promise<void>[] = [];

    // Check which symbols don't have candles
    for (const symbol of uniqueSymbols) {
      const candles = candleStore.getCandlesSync(symbol, '1m');
      if (candles && candles.length >= requiredCandles) {
        continue;
      }

      const inFlight = this.candleFetchInFlight.get(symbol);
      if (inFlight) {
        existingInFlightPromises.push(inFlight);
        continue;
      }

      if (!candles || candles.length < requiredCandles) {
        missingSymbols.push(symbol);
      }
    }

    if (missingSymbols.length === 0 && existingInFlightPromises.length === 0) {
      onProgress?.({ stage: 'fetching-candles', completed: 0, total: 0, message: 'Candles already ready' });
      return; // All symbols have candles
    }

    const totalWorkItems = missingSymbols.length + existingInFlightPromises.length;
    let completedItems = 0;

    if (missingSymbols.length > 0) {
      this.logInfo(
        `Fetching candles for ${missingSymbols.length} symbols (required 1m candles: ${requiredCandles})`,
        missingSymbols.slice(0, 5)
      );
    }

    // Fetch candles for missing symbols in parallel (limit concurrency to avoid overload)
    const BATCH_SIZE = this.getCandleFetchBatchSize();
    const endTime = Date.now();
    const startTime = endTime - (1500 * 60 * 1000); // 1500 minutes (1m candles)

    for (let i = 0; i < missingSymbols.length; i += BATCH_SIZE) {
      const batch = missingSymbols.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(symbol => {
        const fetchPromise = this
          .fetchCandlesWithRetry(symbol, startTime, endTime)
          .catch(err => {
            this.logWarn(`Failed to fetch candles for ${symbol}:`, err.message);
          })
          .finally(() => {
            this.candleFetchInFlight.delete(symbol);
            completedItems += 1;
            onProgress?.({
              stage: 'fetching-candles',
              completed: completedItems,
              total: totalWorkItems,
              message: `Fetched candles ${completedItems}/${totalWorkItems}`,
            });
          });

        this.candleFetchInFlight.set(symbol, fetchPromise);
        return fetchPromise;
      });

      await Promise.all(batchPromises);
    }

    if (existingInFlightPromises.length > 0) {
      await Promise.allSettled(existingInFlightPromises);
      completedItems += existingInFlightPromises.length;
      onProgress?.({
        stage: 'fetching-candles',
        completed: completedItems,
        total: totalWorkItems,
        message: `Synced in-flight fetches ${completedItems}/${totalWorkItems}`,
      });
    }

    if (missingSymbols.length > 0) {
      this.logInfo(`Candles fetching completed for ${missingSymbols.length} symbols`);
    }
  }

  private getIntervalMinutes(interval: TimeInterval): number {
    const intervalMap: Record<TimeInterval, number> = {
      '1m': 1,
      '3m': 3,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '2h': 120,
      '4h': 240,
      '8h': 480,
      '12h': 720,
      '1d': 1440,
      '3d': 4320,
      '1w': 10080,
      '1M': 43200,
    };
    return intervalMap[interval];
  }

  private async fetchCandlesDirect(
    symbol: string,
    targetTimeframe: TimeInterval,
    lookbackCandles: number
  ): Promise<TransformedCandle[] | null> {
    try {
      const intervalMs = INTERVAL_TO_MS[targetTimeframe];
      if (!intervalMs) return null;
      const endTime = Date.now();
      const startTime = endTime - lookbackCandles * intervalMs * 2; // fetch 2x to be safe
      const candles = await this.hyperliquidService.getCandles({
        coin: symbol,
        interval: targetTimeframe,
        startTime,
        endTime,
      });
      if (!candles || candles.length === 0) return null;
      return candles.slice(-lookbackCandles);
    } catch {
      return null;
    }
  }

  private getCandlesFromStore(
    symbol: string,
    targetTimeframe: TimeInterval,
    lookbackCandles: number
  ): TransformedCandle[] | null {
    const candleStore = useCandleStore.getState();

    if (targetTimeframe === '1m') {
      const candles = candleStore.getCandlesSync(symbol, '1m');
      if (!candles || candles.length < lookbackCandles) {
        return null;
      }
      return candles.slice(-lookbackCandles);
    } else if (targetTimeframe === '5m') {
      const baseCandleCount = lookbackCandles * 5;
      const candles1m = candleStore.getCandlesSync(symbol, '1m');
      if (!candles1m || candles1m.length < baseCandleCount) {
        return null;
      }
      const recentCandles = candles1m.slice(-baseCandleCount);
      const aggregatedCandles = aggregate1mTo5m(recentCandles);
      if (!aggregatedCandles || aggregatedCandles.length < lookbackCandles) {
        return null;
      }
      return aggregatedCandles.slice(-lookbackCandles);
    }

    return null;
  }

  async scanStochastic(params: StochasticScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config, variants } = params;

    const enabledVariants = Object.entries(variants).filter(([_, variantConfig]) => variantConfig.enabled);
    const enabledVariantCount = enabledVariants.length;

    if (enabledVariantCount === 0) {
      return null;
    }

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = 150;

        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length === 0) {
          continue;
        }

        const timeframeResults: { k: number; d: number; signalType: 'bullish' | 'bearish' }[] = [];

        for (const [variantKey, variantConfig] of enabledVariants) {
          const stochData = calculateStochastic(
            candles,
            variantConfig.period,
            variantConfig.smoothK,
            variantConfig.smoothD
          );

          if (stochData.length === 0) break;

          const latestStoch = stochData[stochData.length - 1];

          if (latestStoch.k < config.oversoldThreshold) {
            timeframeResults.push({
              k: latestStoch.k,
              d: latestStoch.d,
              signalType: 'bullish',
            });
          } else if (latestStoch.k > config.overboughtThreshold) {
            timeframeResults.push({
              k: latestStoch.k,
              d: latestStoch.d,
              signalType: 'bearish',
            });
          }
        }

        if (timeframeResults.length === enabledVariantCount) {
          const signalType = timeframeResults[0].signalType;
          const allSameSignal = timeframeResults.every(r => r.signalType === signalType);

          if (allSameSignal) {
            const description = signalType === 'bullish'
              ? `All stochastic variants oversold on ${timeframe} (K < ${config.oversoldThreshold})`
              : `All stochastic variants overbought on ${timeframe} (K > ${config.overboughtThreshold})`;

            return {
              symbol,
              stochastics: timeframeResults.map(r => ({ k: r.k, d: r.d, timeframe })),
              matchedAt: Date.now(),
              signalType,
              description,
              scanType: 'stochastic',
              closePrices,
            };
          }
        }
      } catch (error) {
        console.error(`Error scanning ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanVolumeSpike(params: VolumeScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = 150;

        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length < config.lookbackPeriod + 1) {
          continue;
        }

        const currentCandle = candles[candles.length - 1];
        const volumeCandles = candles.slice(-(config.lookbackPeriod + 1), -1);
        const avgVolume = volumeCandles.reduce((sum, c) => sum + c.volume, 0) / volumeCandles.length;

        const volumeRatio = currentCandle.volume / avgVolume;
        const isVolumeSpike = volumeRatio >= config.volumeThreshold;

        const priceChangePercent = ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100;
        const isPriceMove = Math.abs(priceChangePercent) >= config.priceChangeThreshold;

        if (isVolumeSpike && isPriceMove) {
          const signalType: 'bullish' | 'bearish' = priceChangePercent > 0 ? 'bullish' : 'bearish';
          const direction = signalType === 'bullish' ? 'increase' : 'decrease';

          const volumeValue: VolumeValue = {
            timeframe,
            volumeRatio,
            priceChangePercent,
            avgVolume,
            currentVolume: currentCandle.volume,
          };

          return {
            symbol,
            volumeSpikes: [volumeValue],
            matchedAt: Date.now(),
            signalType,
            description: `Volume spike (${volumeRatio.toFixed(1)}x) with ${Math.abs(priceChangePercent).toFixed(2)}% price ${direction} on ${timeframe}`,
            scanType: 'volumeSpike',
            closePrices,
          };
        }
      } catch (error) {
        console.error(`Error scanning volume for ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanEmaAlignment(params: EmaAlignmentScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = 150;

        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length < config.lookbackBars) {
          continue;
        }

        const emaAlignment = detectEmaAlignment(
          candles as any,
          config.ema1Period,
          config.ema2Period,
          config.ema3Period,
          config.lookbackBars
        );

        if (emaAlignment) {
          const emaValue: EmaAlignmentValue = {
            timeframe,
            alignmentType: emaAlignment.type,
            barsAgo: emaAlignment.barsAgo,
            ema1: emaAlignment.ema1,
            ema2: emaAlignment.ema2,
            ema3: emaAlignment.ema3,
          };

          const description = emaAlignment.barsAgo === 0
            ? `EMA alignment just formed on ${timeframe} (${emaAlignment.type})`
            : `EMA ${emaAlignment.type} alignment ${emaAlignment.barsAgo} bars ago on ${timeframe}`;

          return {
            symbol,
            emaAlignments: [emaValue],
            matchedAt: Date.now(),
            signalType: emaAlignment.type,
            description,
            scanType: 'emaAlignment',
            closePrices,
          };
        }
      } catch (error) {
        console.error(`Error scanning EMA alignment for ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanMacdReversal(params: MacdReversalScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = Math.max(150, config.minCandles);

        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length < config.minCandles) {
          continue;
        }

        const closes = candles.map(c => c.close);
        const macdResult = calculateMACD(closes, config.fastPeriod, config.slowPeriod, config.signalPeriod);

        if (macdResult.histogram.length < config.recentReversalLookback + 1) {
          continue;
        }

        const recentHistogram = macdResult.histogram.slice(-config.recentReversalLookback);
        let foundReversal = false;
        let signalType: 'bullish' | 'bearish' | null = null;

        for (let i = 1; i < recentHistogram.length; i++) {
          const prev = recentHistogram[i - 1];
          const curr = recentHistogram[i];
          const prevMacd = macdResult.macd[macdResult.macd.length - config.recentReversalLookback + i - 1];
          const currMacd = macdResult.macd[macdResult.macd.length - config.recentReversalLookback + i];
          const prevSignal = macdResult.signal[macdResult.signal.length - config.recentReversalLookback + i - 1];
          const currSignal = macdResult.signal[macdResult.signal.length - config.recentReversalLookback + i];

          if (prevMacd <= prevSignal && currMacd > currSignal) {
            foundReversal = true;
            signalType = 'bullish';
            break;
          }

          if (prevMacd >= prevSignal && currMacd < currSignal) {
            foundReversal = true;
            signalType = 'bearish';
            break;
          }
        }

        if (foundReversal && signalType) {
          const lastIndex = macdResult.histogram.length - 1;
          const lastCandle = candles[candles.length - 1];
          const macdValue: MacdReversalValue = {
            timeframe,
            direction: signalType,
            time: lastCandle.time,
            price: lastCandle.close,
            macdValue: macdResult.macd[lastIndex],
            signalValue: macdResult.signal[lastIndex],
          };

          const description = `MACD ${signalType} crossover on ${timeframe}`;

          return {
            symbol,
            macdReversals: [macdValue],
            matchedAt: Date.now(),
            signalType,
            description,
            scanType: 'macdReversal',
            closePrices,
          };
        }
      } catch (error) {
        console.error(`Error scanning MACD reversal for ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanRsiReversal(params: RsiReversalScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = Math.max(150, config.minCandles);

        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length < config.minCandles) {
          continue;
        }

        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, config.period);

        if (rsi.length < config.recentReversalLookback + 1) {
          continue;
        }

        const recentRsi = rsi.slice(-config.recentReversalLookback);
        let foundReversal = false;
        let signalType: 'bullish' | 'bearish' | null = null;

        for (let i = 1; i < recentRsi.length; i++) {
          const prev = recentRsi[i - 1];
          const curr = recentRsi[i];

          if (prev <= config.oversoldLevel && curr > config.oversoldLevel) {
            foundReversal = true;
            signalType = 'bullish';
            break;
          }

          if (prev >= config.overboughtLevel && curr < config.overboughtLevel) {
            foundReversal = true;
            signalType = 'bearish';
            break;
          }
        }

        if (foundReversal && signalType) {
          const lastCandle = candles[candles.length - 1];
          const zone = signalType === 'bullish' ? 'oversold' : 'overbought';
          const rsiValue: RsiReversalValue = {
            timeframe,
            direction: signalType,
            time: lastCandle.time,
            price: lastCandle.close,
            rsiValue: rsi[rsi.length - 1],
            zone,
          };

          const zoneText = signalType === 'bullish' ? 'oversold' : 'overbought';
          const description = `RSI ${zoneText} reversal on ${timeframe} (${rsi[rsi.length - 1].toFixed(1)})`;

          return {
            symbol,
            rsiReversals: [rsiValue],
            matchedAt: Date.now(),
            signalType,
            description,
            scanType: 'rsiReversal',
            closePrices,
          };
        }
      } catch (error) {
        console.error(`Error scanning RSI reversal for ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanChannel(params: ChannelScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = config.lookbackBars;

        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length < config.lookbackBars) {
          continue;
        }

        const channels = detectChannels(candles as any, {
          pivotStrength: config.pivotStrength,
          lookbackBars: config.lookbackBars,
          minTouches: config.minTouches,
        });

        if (channels.length > 0) {
          const bestChannel = channels[0];
          const currentPrice = candles[candles.length - 1].close;
          const lastIndex = candles.length - 1;
          const upperPrice = bestChannel.upperLine.slope * lastIndex + bestChannel.upperLine.intercept;
          const lowerPrice = bestChannel.lowerLine.slope * lastIndex + bestChannel.lowerLine.intercept;

          const distanceToUpper = ((upperPrice - currentPrice) / currentPrice) * 100;
          const distanceToLower = ((currentPrice - lowerPrice) / currentPrice) * 100;

          let signalType: 'bullish' | 'bearish';
          if (Math.abs(distanceToLower) < Math.abs(distanceToUpper)) {
            signalType = 'bullish';
          } else {
            signalType = 'bearish';
          }

          const channelValue: ChannelValue = {
            timeframe,
            type: bestChannel.type,
            touches: bestChannel.touches,
            strength: bestChannel.strength,
            angle: bestChannel.angle,
            upperPrice,
            lowerPrice,
            currentPrice,
            distanceToUpper,
            distanceToLower,
          };

          const channelTypeStr = bestChannel.type === 'horizontal' ? 'Horizontal' :
                                 bestChannel.type === 'ascending' ? 'Ascending' : 'Descending';
          const description = `${channelTypeStr} channel detected on ${timeframe} (${bestChannel.touches} touches)`;

          return {
            symbol,
            channels: [channelValue],
            matchedAt: Date.now(),
            signalType,
            description,
            scanType: 'channel',
            closePrices,
          };
        }
      } catch (error) {
        console.error(`Error scanning channel for ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanDivergence(params: DivergenceScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = 150;

        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length < 50) {
          continue;
        }

        const pricePivots = detectPivots(candles as any, config.pivotStrength);

        const closePricesForRsi = candles.map(c => c.close);
        const rsiData = calculateRSI(closePricesForRsi, 14);
        const rsiPivots = detectRSIPivots(rsiData, candles as any, config.pivotStrength);

        let divergenceOptions: DivergenceOptions | undefined = undefined;

        if (config.useDynamicThresholds) {
          const atrPeriod = config.atrPeriod || 14;
          const atrValues = calculateATR(candles as any, atrPeriod);

          divergenceOptions = {
            minPriceChangeATR: config.minPriceChangeATR,
            minRsiChange: config.minRsiChange,
            atrValues,
            rsiValues: rsiData,
          };
        }

        const divergences = detectDivergence(pricePivots, rsiPivots, candles as any, divergenceOptions);

        if (divergences.length > 0) {
          const recentDivergence = divergences[divergences.length - 1];

          const shouldReport =
            (config.scanBullish && recentDivergence.type === 'bullish') ||
            (config.scanBearish && recentDivergence.type === 'bearish') ||
            (config.scanHidden && (recentDivergence.type === 'hidden-bullish' || recentDivergence.type === 'hidden-bearish'));

          if (shouldReport) {
            const minStrength = (config as any).minStrength ?? 30;
            const strength = recentDivergence.strength ?? 0;

            if (strength < minStrength) {
              continue;
            }

            const isBullish = recentDivergence.type === 'bullish' || recentDivergence.type === 'hidden-bullish';
            const endRsi = recentDivergence.endRsiValue;

            if (isBullish && recentDivergence.type === 'bullish' && endRsi >= 40) {
              continue;
            }
            if (!isBullish && recentDivergence.type === 'bearish' && endRsi <= 60) {
              continue;
            }

            const signalType: 'bullish' | 'bearish' = isBullish ? 'bullish' : 'bearish';

            const divergenceValue: DivergenceValue = {
              type: recentDivergence.type,
              startTime: recentDivergence.startTime,
              endTime: recentDivergence.endTime,
              startPriceValue: recentDivergence.startPriceValue,
              endPriceValue: recentDivergence.endPriceValue,
              startRsiValue: recentDivergence.startRsiValue,
              endRsiValue: recentDivergence.endRsiValue,
              strength: recentDivergence.strength,
            };

            const typeStr = recentDivergence.type.replace('-', ' ');
            const description = `${typeStr} divergence (strength: ${strength}) detected on ${timeframe}`;

            return {
              symbol,
              divergences: [divergenceValue],
              matchedAt: Date.now(),
              signalType,
              description,
              scanType: 'divergence',
              closePrices,
            };
          }
        }
      } catch (error) {
        console.error(`Error scanning divergence for ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanSupportResistance(params: SupportResistanceScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = 150;

        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length < 30) {
          continue;
        }

        const trendlines = calculateTrendlines(candles as any);

        if (trendlines.supportLine.length === 0 && trendlines.resistanceLine.length === 0) {
          continue;
        }

        const currentPrice = candles[candles.length - 1].close;
        const currentTime = candles[candles.length - 1].time;

        let supportLevel: number | null = null;
        let resistanceLevel: number | null = null;
        let supportTouches = 0;
        let resistanceTouches = 0;

        if (trendlines.supportLine.length > 0) {
          const supportPoints = trendlines.supportLine[0].points;
          if (supportPoints.length >= 2) {
            // Use first two points to calculate slope (it's a linear trendline)
            const p1 = supportPoints[0];
            const p2 = supportPoints[1];

            if (p2.time !== p1.time) {
              const slope = (p2.value - p1.value) / (p2.time - p1.time);
              supportLevel = p1.value + slope * (currentTime - p1.time);
            } else {
              supportLevel = p1.value;
            }

            supportTouches = supportPoints.length;
          }
        }

        if (trendlines.resistanceLine.length > 0) {
          const resistancePoints = trendlines.resistanceLine[0].points;
          if (resistancePoints.length >= 2) {
            // Use first two points to calculate slope (it's a linear trendline)
            const p1 = resistancePoints[0];
            const p2 = resistancePoints[1];

            if (p2.time !== p1.time) {
              const slope = (p2.value - p1.value) / (p2.time - p1.time);
              resistanceLevel = p1.value + slope * (currentTime - p1.time);
            } else {
              resistanceLevel = p1.value;
            }

            resistanceTouches = resistancePoints.length;
          }
        }

        if (supportLevel === null && resistanceLevel === null) {
          continue;
        }

        if (supportTouches < config.minTouches && resistanceTouches < config.minTouches) {
          continue;
        }

        // Check if S/R line crosses last 3 candles
        const last3Candles = candles.slice(-3);
        let supportCrossesRecent = false;
        let resistanceCrossesRecent = false;

        if (supportLevel !== null && trendlines.supportLine.length > 0) {
          const supportPoints = trendlines.supportLine[0].points;
          if (supportPoints.length >= 2) {
            supportCrossesRecent = last3Candles.some(candle => {
              // Calculate support line value at this candle's time
              const lastPoint = supportPoints[supportPoints.length - 1];
              const firstPoint = supportPoints[0];
              const slope = (lastPoint.value - firstPoint.value) / (lastPoint.time - firstPoint.time);
              const intercept = firstPoint.value - slope * firstPoint.time;
              const lineValueAtCandle = slope * candle.time + intercept;

              // Check if line crosses through candle (within high/low range) with 2% tolerance
              const tolerance = candle.close * 0.02;
              return lineValueAtCandle >= (candle.low - tolerance) &&
                     lineValueAtCandle <= (candle.high + tolerance);
            });
          }
        }

        if (resistanceLevel !== null && trendlines.resistanceLine.length > 0) {
          const resistancePoints = trendlines.resistanceLine[0].points;
          if (resistancePoints.length >= 2) {
            resistanceCrossesRecent = last3Candles.some(candle => {
              // Calculate resistance line value at this candle's time
              const lastPoint = resistancePoints[resistancePoints.length - 1];
              const firstPoint = resistancePoints[0];
              const slope = (lastPoint.value - firstPoint.value) / (lastPoint.time - firstPoint.time);
              const intercept = firstPoint.value - slope * firstPoint.time;
              const lineValueAtCandle = slope * candle.time + intercept;

              // Check if line crosses through candle (within high/low range) with 2% tolerance
              const tolerance = candle.close * 0.02;
              return lineValueAtCandle >= (candle.low - tolerance) &&
                     lineValueAtCandle <= (candle.high + tolerance);
            });
          }
        }

        // Only show alert if at least one line crosses recent candles
        if (!supportCrossesRecent && !resistanceCrossesRecent) {
          continue;
        }

        const distanceToSupport = supportLevel !== null
          ? ((currentPrice - supportLevel) / currentPrice) * 100
          : Infinity;
        const distanceToResistance = resistanceLevel !== null
          ? ((resistanceLevel - currentPrice) / currentPrice) * 100
          : Infinity;

        const supportDistance = Math.abs(distanceToSupport);
        const resistanceDistance = Math.abs(distanceToResistance);

        // Determine which level to report - prefer the one crossing recent candles
        let nearLevel: 'support' | 'resistance';
        if (supportCrossesRecent && !resistanceCrossesRecent) {
          nearLevel = 'support';
        } else if (resistanceCrossesRecent && !supportCrossesRecent) {
          nearLevel = 'resistance';
        } else {
          // Both crossing or neither, use closest
          nearLevel = supportDistance < resistanceDistance ? 'support' : 'resistance';
        }

        const signalType: 'bullish' | 'bearish' = nearLevel === 'support' ? 'bullish' : 'bearish';

        const supportResistanceValue: SupportResistanceValue = {
          timeframe,
          supportLevel: supportLevel ?? 0,
          resistanceLevel: resistanceLevel ?? 0,
          currentPrice,
          distanceToSupport,
          distanceToResistance,
          supportTouches,
          resistanceTouches,
          nearLevel,
        };

        const levelPrice = nearLevel === 'support' ? supportLevel : resistanceLevel;
        const distance = nearLevel === 'support' ? supportDistance : resistanceDistance;
        const touches = nearLevel === 'support' ? supportTouches : resistanceTouches;

        // Determine proximity description
        const isNear = distance <= config.distanceThreshold;
        const proximityText = isNear ? 'near' : 'approaching';
        const priceDirection = nearLevel === 'support'
          ? (currentPrice > supportLevel! ? 'above' : 'at')
          : (currentPrice < resistanceLevel! ? 'below' : 'at');

        const description = `Price crossing ${nearLevel} at ${levelPrice?.toFixed(2)} on ${timeframe} (${priceDirection}, ${distance.toFixed(2)}% away, ${touches} touches)`;

        return {
          symbol,
          supportResistanceLevels: [supportResistanceValue],
          matchedAt: Date.now(),
          signalType,
          description,
          scanType: 'supportResistance',
          closePrices,
        };
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  async scanMultipleSymbols(
    symbols: string[],
    params: Omit<StochasticScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanStochastic({ ...scanParams, symbol })
    );
  }

  async scanMultipleSymbolsForVolume(
    symbols: string[],
    params: Omit<VolumeScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanVolumeSpike({ ...scanParams, symbol })
    );
  }

  async scanMultipleSymbolsForEmaAlignment(
    symbols: string[],
    params: Omit<EmaAlignmentScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanEmaAlignment({ ...scanParams, symbol })
    );
  }

  async scanMultipleSymbolsForMacdReversal(
    symbols: string[],
    params: Omit<MacdReversalScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanMacdReversal({ ...scanParams, symbol })
    );
  }

  async scanMultipleSymbolsForRsiReversal(
    symbols: string[],
    params: Omit<RsiReversalScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanRsiReversal({ ...scanParams, symbol })
    );
  }

  async scanMultipleSymbolsForChannel(
    symbols: string[],
    params: Omit<ChannelScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanChannel({ ...scanParams, symbol })
    );
  }

  async scanMultipleSymbolsForDivergence(
    symbols: string[],
    params: Omit<DivergenceScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanDivergence({ ...scanParams, symbol })
    );
  }

  async scanMultipleSymbolsForSupportResistance(
    symbols: string[],
    params: Omit<SupportResistanceScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanSupportResistance({ ...scanParams, symbol })
    );
  }

  async scanKalmanTrend(params: KalmanTrendScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = 150;
        const candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        if (!candles || candles.length < 50) {
          continue;
        }

        const kalmanResult = calculateKalmanTrend(candles as any);

        if (!kalmanResult || !kalmanResult.buySignals || !kalmanResult.sellSignals) {
          continue;
        }

        const lastIndex = kalmanResult.buySignals.length - 1;
        if (lastIndex < 0) continue;

        // Check last 3 bars for signals
        const recentBuy = kalmanResult.buySignals.slice(-3).some(Boolean);
        const recentSell = kalmanResult.sellSignals.slice(-3).some(Boolean);

        if (!recentBuy && !recentSell) {
          continue;
        }

        const directionValue = kalmanResult.direction[lastIndex];
        const signalType = recentBuy ? 'bullish' : 'bearish';
        const delta = kalmanResult.delta[lastIndex] || 0;

        const kalmanTrendValue: KalmanTrendValue = {
          direction: directionValue ? 'bullish' : 'bearish',
          timeframe,
          buySignal: recentBuy,
          sellSignal: recentSell,
          delta,
        };

        return {
          symbol,
          kalmanTrends: [kalmanTrendValue],
          matchedAt: Date.now(),
          signalType: signalType as 'bullish' | 'bearish',
          description: `Kalman Trend ${signalType === 'bullish' ? 'BUY' : 'SELL'} signal on ${timeframe}`,
          scanType: 'kalmanTrend',
          closePrices,
        };
      } catch (error) {
        console.error(`Error scanning Kalman Trend for ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanMultipleSymbolsForKalmanTrend(
    symbols: string[],
    params: Omit<KalmanTrendScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanKalmanTrend({ ...scanParams, symbol })
    );
  }

  async scanRitchiTrend(params: RitchiTrendScanParams): Promise<ScanResult | null> {
    const { symbol, timeframes, config } = params;

    const candleStore = useCandleStore.getState();
    const closePrices = candleStore.getClosePrices(symbol, '1m', 100) || [];

    for (const timeframe of timeframes) {
      try {
        const lookbackCandles = 150;
        let candles = this.getCandlesFromStore(symbol, timeframe, lookbackCandles);

        // Fallback: fetch directly from exchange API when store lacks candles (bot mode)
        if (!candles || candles.length < 50) {
          candles = await this.fetchCandlesDirect(symbol, timeframe, lookbackCandles);
        }

        if (!candles || candles.length < 50) {
          continue;
        }

        // Calculate Ritchi Trend (Siêu Xu Hướng)
        const ritchiResult = calculateSieuXuHuong(
          candles as any,
          config.pivLen,
          config.smaMin,
          config.smaMax,
          config.smaMult ?? 1.0,
          config.trendLen ?? 100,
          config.atrMult ?? 2.0,
          config.tpMult ?? 3.0,
        );

        if (!ritchiResult || !ritchiResult.buySignals || !ritchiResult.sellSignals) {
          continue;
        }

        const lastIndex = ritchiResult.buySignals.length - 1;
        if (lastIndex < 0) continue;

        // Widen crossover capture window to reduce missed entries when scan ticks drift.
        // With pivLen=5 (default), this becomes max(7, 10) = 10 bars on 1m.
        const signalLookback = Math.max((config.pivLen ?? 5) + 2, 10);

        // Phase 1: check for a fresh crossover signal within the lookback window
        const recentBuy = ritchiResult.buySignals.slice(-signalLookback).some(Boolean);
        const recentSell = ritchiResult.sellSignals.slice(-signalLookback).some(Boolean);

        const directionValue = ritchiResult.direction[lastIndex];

        // Phase 2: fallback — enter on established trend direction when no fresh crossover signal.
        // Require both mature trend age and recent direction stability to avoid sideways churning.
        let isTrendFallback = false;
        let trendFallbackBuy = false;
        let trendFallbackSell = false;
        if (!recentBuy && !recentSell) {
          const trendLen = config.trendLen ?? 100;
          const trendAge = ritchiResult.trendAge[lastIndex] ?? 0;
          // Dynamic threshold: require at least 20% maturity for default trendLen=100.
          // For shorter trendLen, threshold increases slightly; for longer trendLen, caps at 20%.
          const minTrendAgeForFallback = Math.max(0.2, Math.min(0.35, 20 / trendLen));

          const stableBars = 4;
          const directionWindow = ritchiResult.direction.slice(Math.max(0, lastIndex - stableBars + 1), lastIndex + 1);
          const directionStable = directionWindow.length === stableBars
            && directionValue !== undefined
            && directionWindow.every((v) => v === directionValue);

          if (trendAge >= minTrendAgeForFallback && directionStable) {
            trendFallbackBuy = directionValue === true;
            trendFallbackSell = directionValue === false;
            isTrendFallback = true;
          }
        }

        const useBuy = recentBuy || trendFallbackBuy;
        const useSell = recentSell || trendFallbackSell;

        if (!useBuy && !useSell) {
          continue;
        }

        const signalType = useBuy ? 'bullish' : 'bearish';
        
        // Find the signal index — prefer a recent crossover bar, else use current bar
        let signalIndex = lastIndex;
        if (!isTrendFallback) {
          for (let i = lastIndex; i >= Math.max(0, lastIndex - signalLookback); i--) {
            if ((useBuy && ritchiResult.buySignals[i]) || (useSell && ritchiResult.sellSignals[i])) {
              signalIndex = i;
              break;
            }
          }
        }

        const price = candles[signalIndex].close;
        const stopLoss = ritchiResult.stopLoss[signalIndex] || 0;
        const takeProfit = ritchiResult.takeProfit[signalIndex] || 0;

        const ritchiTrendValue: RitchiTrendValue = {
          direction: directionValue ? 'bullish' : 'bearish',
          timeframe,
          buySignal: useBuy,
          sellSignal: useSell,
          price,
          stopLoss,
          takeProfit,
        };

        const signalSource = isTrendFallback ? 'trend-direction' : 'crossover';
        return {
          symbol,
          ritchiTrends: [ritchiTrendValue],
          matchedAt: Date.now(),
          signalType: signalType as 'bullish' | 'bearish',
          description: `Ritchi Trend ${signalType === 'bullish' ? 'BUY' : 'SELL'} signal on ${timeframe} (${signalSource})`,
          scanType: 'ritchiTrend',
          closePrices,
          isFallback: isTrendFallback,
        };
      } catch (error) {
        console.error(`Error scanning Ritchi Trend for ${symbol} on ${timeframe}:`, error);
        continue;
      }
    }

    return null;
  }

  async scanMultipleSymbolsForRitchiTrend(
    symbols: string[],
    params: Omit<RitchiTrendScanParams, 'symbol'>
  ): Promise<ScanResult[]> {
    return this.runScanForSymbols(symbols, params, (symbol, scanParams) =>
      this.scanRitchiTrend({ ...scanParams, symbol })
    );
  }

  private async runScanForSymbols<TParams extends object>(
    symbols: string[],
    params: TParams,
    scanFn: (symbol: string, params: TParams) => Promise<ScanResult | null>
  ): Promise<ScanResult[]> {
    const queue = [...symbols];
    const settledResults: PromiseSettledResult<ScanResult | null>[] = [];
    const workerCount = Math.min(this.scanConcurrencyLimit, queue.length || 1);

    const worker = async () => {
      while (queue.length > 0) {
        const symbol = queue.shift();
        if (!symbol) {
          continue;
        }

        try {
          const value = await scanFn(symbol, params);
          settledResults.push({ status: 'fulfilled', value });
        } catch (reason) {
          this.logError(`Scan worker failed for ${symbol}`, reason);
          settledResults.push({ status: 'rejected', reason });
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return settledResults
      .filter((result): result is PromiseFulfilledResult<ScanResult | null> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value as ScanResult);
  }
}
