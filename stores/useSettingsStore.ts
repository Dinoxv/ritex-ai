import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, DEFAULT_SETTINGS, StochasticSettings, EmaSettings, MacdSettings, KalmanTrendSettings, SieuXuHuongSettings, ScannerSettings, OrderSettings, ThemeSettings, ChartSettings, AIStrategyConfig, BotTradingSettings } from '@/models/Settings';

type TabType = 'scanner' | 'indicators' | 'orders' | 'ui' | 'credentials' | 'ai';
type MobileTabType = 'scanner' | 'symbols' | 'chart' | 'actions' | 'orders-positions';

interface SettingsStore {
  isPanelOpen: boolean;
  activeTab: TabType;
  mobileActiveTab: MobileTabType;
  isMultiChartView: boolean;
  settings: AppSettings;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  toggleMultiChartView: () => void;
  setActiveTab: (tab: TabType) => void;
  setMobileActiveTab: (tab: MobileTabType) => void;
  updateStochasticSettings: (settings: Partial<StochasticSettings>) => void;
  updateEmaSettings: (settings: Partial<EmaSettings>) => void;
  updateMacdSettings: (settings: Partial<MacdSettings>) => void;
  updateKalmanTrendSettings: (settings: Partial<KalmanTrendSettings>) => void;
  updateSieuXuHuongSettings: (settings: Partial<SieuXuHuongSettings>) => void;
  updateScannerSettings: (settings: Partial<ScannerSettings>) => void;
  updateOrderSettings: (settings: Partial<OrderSettings>) => void;
  updateChartSettings: (settings: Partial<ChartSettings>) => void;
  updateThemeSettings: (settings: Partial<ThemeSettings>) => void;
  updateAISettings: (settings: Partial<AIStrategyConfig>) => void;
  updateBotSettings: (settings: Partial<BotTradingSettings>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  pinSymbol: (symbol: string) => void;
  unpinSymbol: (symbol: string) => void;
  resetSettings: () => void;
}

const mergeSettings = (storedSettings: any): AppSettings => {
  if (!storedSettings || typeof storedSettings !== 'object') {
    return DEFAULT_SETTINGS;
  }

  try {
    const sanitizedPinnedSymbols = Array.isArray(storedSettings?.pinnedSymbols)
      ? storedSettings.pinnedSymbols.filter((symbol: unknown): symbol is string => typeof symbol === 'string')
      : DEFAULT_SETTINGS.pinnedSymbols;

    return {
      indicators: {
        stochastic: {
          showMultiVariant: storedSettings.indicators?.stochastic?.showMultiVariant ?? storedSettings.indicators?.stochastic?.showMultiTimeframe ?? DEFAULT_SETTINGS.indicators.stochastic.showMultiVariant,
          showDivergence: storedSettings.indicators?.stochastic?.showDivergence ?? DEFAULT_SETTINGS.indicators.stochastic.showDivergence,
          divergenceVariant: storedSettings.indicators?.stochastic?.divergenceVariant ?? DEFAULT_SETTINGS.indicators.stochastic.divergenceVariant,
          overboughtLevel: storedSettings.indicators?.stochastic?.overboughtLevel ?? DEFAULT_SETTINGS.indicators.stochastic.overboughtLevel,
          oversoldLevel: storedSettings.indicators?.stochastic?.oversoldLevel ?? DEFAULT_SETTINGS.indicators.stochastic.oversoldLevel,
          variants: {
            ultraFast: {
              enabled: storedSettings.indicators?.stochastic?.variants?.ultraFast?.enabled ?? storedSettings.indicators?.stochastic?.variants?.fast9?.enabled ?? DEFAULT_SETTINGS.indicators.stochastic.variants.ultraFast.enabled,
              period: storedSettings.indicators?.stochastic?.variants?.ultraFast?.period ?? storedSettings.indicators?.stochastic?.variants?.fast9?.period ?? DEFAULT_SETTINGS.indicators.stochastic.variants.ultraFast.period,
              smoothK: storedSettings.indicators?.stochastic?.variants?.ultraFast?.smoothK ?? storedSettings.indicators?.stochastic?.variants?.fast9?.smoothK ?? DEFAULT_SETTINGS.indicators.stochastic.variants.ultraFast.smoothK,
              smoothD: storedSettings.indicators?.stochastic?.variants?.ultraFast?.smoothD ?? storedSettings.indicators?.stochastic?.variants?.fast9?.smoothD ?? DEFAULT_SETTINGS.indicators.stochastic.variants.ultraFast.smoothD,
            },
            fast: {
              enabled: storedSettings.indicators?.stochastic?.variants?.fast?.enabled ?? storedSettings.indicators?.stochastic?.variants?.fast14?.enabled ?? DEFAULT_SETTINGS.indicators.stochastic.variants.fast.enabled,
              period: storedSettings.indicators?.stochastic?.variants?.fast?.period ?? storedSettings.indicators?.stochastic?.variants?.fast14?.period ?? DEFAULT_SETTINGS.indicators.stochastic.variants.fast.period,
              smoothK: storedSettings.indicators?.stochastic?.variants?.fast?.smoothK ?? storedSettings.indicators?.stochastic?.variants?.fast14?.smoothK ?? DEFAULT_SETTINGS.indicators.stochastic.variants.fast.smoothK,
              smoothD: storedSettings.indicators?.stochastic?.variants?.fast?.smoothD ?? storedSettings.indicators?.stochastic?.variants?.fast14?.smoothD ?? DEFAULT_SETTINGS.indicators.stochastic.variants.fast.smoothD,
            },
            medium: {
              enabled: storedSettings.indicators?.stochastic?.variants?.medium?.enabled ?? storedSettings.indicators?.stochastic?.variants?.fast40?.enabled ?? DEFAULT_SETTINGS.indicators.stochastic.variants.medium.enabled,
              period: storedSettings.indicators?.stochastic?.variants?.medium?.period ?? storedSettings.indicators?.stochastic?.variants?.fast40?.period ?? DEFAULT_SETTINGS.indicators.stochastic.variants.medium.period,
              smoothK: storedSettings.indicators?.stochastic?.variants?.medium?.smoothK ?? storedSettings.indicators?.stochastic?.variants?.fast40?.smoothK ?? DEFAULT_SETTINGS.indicators.stochastic.variants.medium.smoothK,
              smoothD: storedSettings.indicators?.stochastic?.variants?.medium?.smoothD ?? storedSettings.indicators?.stochastic?.variants?.fast40?.smoothD ?? DEFAULT_SETTINGS.indicators.stochastic.variants.medium.smoothD,
            },
            slow: {
              enabled: storedSettings.indicators?.stochastic?.variants?.slow?.enabled ?? storedSettings.indicators?.stochastic?.variants?.full60?.enabled ?? DEFAULT_SETTINGS.indicators.stochastic.variants.slow.enabled,
              period: storedSettings.indicators?.stochastic?.variants?.slow?.period ?? storedSettings.indicators?.stochastic?.variants?.full60?.period ?? DEFAULT_SETTINGS.indicators.stochastic.variants.slow.period,
              smoothK: storedSettings.indicators?.stochastic?.variants?.slow?.smoothK ?? storedSettings.indicators?.stochastic?.variants?.full60?.smoothK ?? DEFAULT_SETTINGS.indicators.stochastic.variants.slow.smoothK,
              smoothD: storedSettings.indicators?.stochastic?.variants?.slow?.smoothD ?? storedSettings.indicators?.stochastic?.variants?.full60?.smoothD ?? DEFAULT_SETTINGS.indicators.stochastic.variants.slow.smoothD,
            },
          },
        },
        ema: {
          ema1: {
            enabled: storedSettings.indicators?.ema?.ema1?.enabled ?? DEFAULT_SETTINGS.indicators.ema.ema1.enabled,
            period: storedSettings.indicators?.ema?.ema1?.period ?? DEFAULT_SETTINGS.indicators.ema.ema1.period,
          },
          ema2: {
            enabled: storedSettings.indicators?.ema?.ema2?.enabled ?? DEFAULT_SETTINGS.indicators.ema.ema2.enabled,
            period: storedSettings.indicators?.ema?.ema2?.period ?? DEFAULT_SETTINGS.indicators.ema.ema2.period,
          },
          ema3: {
            enabled: storedSettings.indicators?.ema?.ema3?.enabled ?? DEFAULT_SETTINGS.indicators.ema.ema3.enabled,
            period: storedSettings.indicators?.ema?.ema3?.period ?? DEFAULT_SETTINGS.indicators.ema.ema3.period,
          },
        },
        macd: (() => {
          const storedMacd = storedSettings.indicators?.macd;

          // Check if we have the new timeframe structure
          if (storedMacd?.timeframes) {
            return {
              showMultiTimeframe: storedMacd.showMultiTimeframe ?? DEFAULT_SETTINGS.indicators.macd.showMultiTimeframe,
              timeframes: {
                '1m': {
                  enabled: storedMacd.timeframes['1m']?.enabled ?? DEFAULT_SETTINGS.indicators.macd.timeframes['1m'].enabled,
                  fastPeriod: storedMacd.timeframes['1m']?.fastPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['1m'].fastPeriod,
                  slowPeriod: storedMacd.timeframes['1m']?.slowPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['1m'].slowPeriod,
                  signalPeriod: storedMacd.timeframes['1m']?.signalPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['1m'].signalPeriod,
                },
                '5m': {
                  enabled: storedMacd.timeframes['5m']?.enabled ?? DEFAULT_SETTINGS.indicators.macd.timeframes['5m'].enabled,
                  fastPeriod: storedMacd.timeframes['5m']?.fastPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['5m'].fastPeriod,
                  slowPeriod: storedMacd.timeframes['5m']?.slowPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['5m'].slowPeriod,
                  signalPeriod: storedMacd.timeframes['5m']?.signalPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['5m'].signalPeriod,
                },
                '15m': {
                  enabled: storedMacd.timeframes['15m']?.enabled ?? DEFAULT_SETTINGS.indicators.macd.timeframes['15m'].enabled,
                  fastPeriod: storedMacd.timeframes['15m']?.fastPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['15m'].fastPeriod,
                  slowPeriod: storedMacd.timeframes['15m']?.slowPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['15m'].slowPeriod,
                  signalPeriod: storedMacd.timeframes['15m']?.signalPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['15m'].signalPeriod,
                },
                '1h': {
                  enabled: storedMacd.timeframes['1h']?.enabled ?? DEFAULT_SETTINGS.indicators.macd.timeframes['1h'].enabled,
                  fastPeriod: storedMacd.timeframes['1h']?.fastPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['1h'].fastPeriod,
                  slowPeriod: storedMacd.timeframes['1h']?.slowPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['1h'].slowPeriod,
                  signalPeriod: storedMacd.timeframes['1h']?.signalPeriod ?? DEFAULT_SETTINGS.indicators.macd.timeframes['1h'].signalPeriod,
                },
              },
            };
          }

          // Migrate old structure to new structure
          if (storedMacd && 'enabled' in storedMacd) {
            return {
              showMultiTimeframe: false,
              timeframes: {
                '1m': {
                  enabled: storedMacd.enabled ?? true,
                  fastPeriod: storedMacd.fastPeriod ?? 5,
                  slowPeriod: storedMacd.slowPeriod ?? 13,
                  signalPeriod: storedMacd.signalPeriod ?? 5,
                },
                '5m': { ...DEFAULT_SETTINGS.indicators.macd.timeframes['5m'] },
                '15m': { ...DEFAULT_SETTINGS.indicators.macd.timeframes['15m'] },
                '1h': { ...DEFAULT_SETTINGS.indicators.macd.timeframes['1h'] },
              },
            };
          }

          // Use defaults
          return DEFAULT_SETTINGS.indicators.macd;
        })(),
        kalmanTrend: {
          enabled: storedSettings.indicators?.kalmanTrend?.enabled ?? DEFAULT_SETTINGS.indicators.kalmanTrend.enabled,
          processNoise: storedSettings.indicators?.kalmanTrend?.processNoise ?? DEFAULT_SETTINGS.indicators.kalmanTrend.processNoise,
          measurementNoise: storedSettings.indicators?.kalmanTrend?.measurementNoise ?? DEFAULT_SETTINGS.indicators.kalmanTrend.measurementNoise,
          bandMultiplier: storedSettings.indicators?.kalmanTrend?.bandMultiplier ?? DEFAULT_SETTINGS.indicators.kalmanTrend.bandMultiplier,
          volConfirm: storedSettings.indicators?.kalmanTrend?.volConfirm ?? DEFAULT_SETTINGS.indicators.kalmanTrend.volConfirm,
          volThreshold: storedSettings.indicators?.kalmanTrend?.volThreshold ?? DEFAULT_SETTINGS.indicators.kalmanTrend.volThreshold,
          showSignals: storedSettings.indicators?.kalmanTrend?.showSignals ?? DEFAULT_SETTINGS.indicators.kalmanTrend.showSignals,
        },
        sieuXuHuong: {
          enabled: storedSettings.indicators?.sieuXuHuong?.enabled ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.enabled,
          pivLen: storedSettings.indicators?.sieuXuHuong?.pivLen ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.pivLen,
          smaMin: storedSettings.indicators?.sieuXuHuong?.smaMin ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.smaMin,
          smaMax: storedSettings.indicators?.sieuXuHuong?.smaMax ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.smaMax,
          smaMult: storedSettings.indicators?.sieuXuHuong?.smaMult ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.smaMult,
          trendLen: storedSettings.indicators?.sieuXuHuong?.trendLen ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.trendLen,
          atrMult: storedSettings.indicators?.sieuXuHuong?.atrMult ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.atrMult,
          tpMult: storedSettings.indicators?.sieuXuHuong?.tpMult ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.tpMult,
          showSignals: storedSettings.indicators?.sieuXuHuong?.showSignals ?? DEFAULT_SETTINGS.indicators.sieuXuHuong.showSignals,
        },
      },
      scanner: {
        enabled: storedSettings.scanner?.enabled ?? DEFAULT_SETTINGS.scanner.enabled,
        scanInterval: storedSettings.scanner?.scanInterval ?? DEFAULT_SETTINGS.scanner.scanInterval,
        topMarkets: storedSettings.scanner?.topMarkets ?? DEFAULT_SETTINGS.scanner.topMarkets,
        playSound: storedSettings.scanner?.playSound ?? DEFAULT_SETTINGS.scanner.playSound,
        runtimeByExchange: {
          hyperliquid: {
            enabled: storedSettings.scanner?.runtimeByExchange?.hyperliquid?.enabled
              ?? storedSettings.scanner?.enabled
              ?? DEFAULT_SETTINGS.scanner.runtimeByExchange.hyperliquid.enabled,
            scanInterval: storedSettings.scanner?.runtimeByExchange?.hyperliquid?.scanInterval
              ?? storedSettings.scanner?.scanInterval
              ?? DEFAULT_SETTINGS.scanner.runtimeByExchange.hyperliquid.scanInterval,
            topMarkets: storedSettings.scanner?.runtimeByExchange?.hyperliquid?.topMarkets
              ?? storedSettings.scanner?.topMarkets
              ?? DEFAULT_SETTINGS.scanner.runtimeByExchange.hyperliquid.topMarkets,
            playSound: storedSettings.scanner?.runtimeByExchange?.hyperliquid?.playSound
              ?? storedSettings.scanner?.playSound
              ?? DEFAULT_SETTINGS.scanner.runtimeByExchange.hyperliquid.playSound,
          },
          binance: {
            enabled: storedSettings.scanner?.runtimeByExchange?.binance?.enabled
              ?? storedSettings.scanner?.enabled
              ?? DEFAULT_SETTINGS.scanner.runtimeByExchange.binance.enabled,
            scanInterval: storedSettings.scanner?.runtimeByExchange?.binance?.scanInterval
              ?? storedSettings.scanner?.scanInterval
              ?? DEFAULT_SETTINGS.scanner.runtimeByExchange.binance.scanInterval,
            topMarkets: storedSettings.scanner?.runtimeByExchange?.binance?.topMarkets
              ?? storedSettings.scanner?.topMarkets
              ?? DEFAULT_SETTINGS.scanner.runtimeByExchange.binance.topMarkets,
            playSound: storedSettings.scanner?.runtimeByExchange?.binance?.playSound
              ?? storedSettings.scanner?.playSound
              ?? DEFAULT_SETTINGS.scanner.runtimeByExchange.binance.playSound,
          },
        },
        candleCacheDuration: storedSettings.scanner?.candleCacheDuration ?? DEFAULT_SETTINGS.scanner.candleCacheDuration,
        mediumDurationWarningSec: storedSettings.scanner?.mediumDurationWarningSec ?? DEFAULT_SETTINGS.scanner.mediumDurationWarningSec,
        highDurationWarningSec: storedSettings.scanner?.highDurationWarningSec ?? DEFAULT_SETTINGS.scanner.highDurationWarningSec,
        telegramEnabled: storedSettings.scanner?.telegramEnabled ?? DEFAULT_SETTINGS.scanner.telegramEnabled,
        telegramBotToken: storedSettings.scanner?.telegramBotToken ?? DEFAULT_SETTINGS.scanner.telegramBotToken,
        telegramChatId: storedSettings.scanner?.telegramChatId ?? DEFAULT_SETTINGS.scanner.telegramChatId,
        telegramSignalFilter: storedSettings.scanner?.telegramSignalFilter ?? DEFAULT_SETTINGS.scanner.telegramSignalFilter,
        telegramShowTpSl: storedSettings.scanner?.telegramShowTpSl ?? DEFAULT_SETTINGS.scanner.telegramShowTpSl,
        telegramByExchange: {
          hyperliquid: {
            enabled: storedSettings.scanner?.telegramByExchange?.hyperliquid?.enabled
              ?? storedSettings.scanner?.telegramEnabled
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.hyperliquid.enabled,
            botToken: storedSettings.scanner?.telegramByExchange?.hyperliquid?.botToken
              ?? storedSettings.scanner?.telegramBotToken
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.hyperliquid.botToken,
            chatId: storedSettings.scanner?.telegramByExchange?.hyperliquid?.chatId
              ?? storedSettings.scanner?.telegramChatId
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.hyperliquid.chatId,
            signalFilter: storedSettings.scanner?.telegramByExchange?.hyperliquid?.signalFilter
              ?? storedSettings.scanner?.telegramSignalFilter
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.hyperliquid.signalFilter,
            showTpSl: storedSettings.scanner?.telegramByExchange?.hyperliquid?.showTpSl
              ?? storedSettings.scanner?.telegramShowTpSl
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.hyperliquid.showTpSl,
          },
          binance: {
            enabled: storedSettings.scanner?.telegramByExchange?.binance?.enabled
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.binance.enabled,
            botToken: storedSettings.scanner?.telegramByExchange?.binance?.botToken
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.binance.botToken,
            chatId: storedSettings.scanner?.telegramByExchange?.binance?.chatId
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.binance.chatId,
            signalFilter: storedSettings.scanner?.telegramByExchange?.binance?.signalFilter
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.binance.signalFilter,
            showTpSl: storedSettings.scanner?.telegramByExchange?.binance?.showTpSl
              ?? DEFAULT_SETTINGS.scanner.telegramByExchange.binance.showTpSl,
          },
        },
        stochasticScanner: {
          enabled: storedSettings.scanner?.stochasticScanner?.enabled ?? DEFAULT_SETTINGS.scanner.stochasticScanner.enabled,
          oversoldThreshold: storedSettings.scanner?.stochasticScanner?.oversoldThreshold ?? DEFAULT_SETTINGS.scanner.stochasticScanner.oversoldThreshold,
          overboughtThreshold: storedSettings.scanner?.stochasticScanner?.overboughtThreshold ?? DEFAULT_SETTINGS.scanner.stochasticScanner.overboughtThreshold,
          timeframes: storedSettings.scanner?.stochasticScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.stochasticScanner.timeframes,
        },
        emaAlignmentScanner: {
          enabled: storedSettings.scanner?.emaAlignmentScanner?.enabled ?? DEFAULT_SETTINGS.scanner.emaAlignmentScanner.enabled,
          timeframes: storedSettings.scanner?.emaAlignmentScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.emaAlignmentScanner.timeframes,
          lookbackBars: storedSettings.scanner?.emaAlignmentScanner?.lookbackBars ?? DEFAULT_SETTINGS.scanner.emaAlignmentScanner.lookbackBars,
          ema1Period: storedSettings.scanner?.emaAlignmentScanner?.ema1Period ?? DEFAULT_SETTINGS.scanner.emaAlignmentScanner.ema1Period,
          ema2Period: storedSettings.scanner?.emaAlignmentScanner?.ema2Period ?? DEFAULT_SETTINGS.scanner.emaAlignmentScanner.ema2Period,
          ema3Period: storedSettings.scanner?.emaAlignmentScanner?.ema3Period ?? DEFAULT_SETTINGS.scanner.emaAlignmentScanner.ema3Period,
        },
        channelScanner: {
          enabled: storedSettings.scanner?.channelScanner?.enabled ?? DEFAULT_SETTINGS.scanner.channelScanner.enabled,
          timeframes: storedSettings.scanner?.channelScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.channelScanner.timeframes,
          minTouches: storedSettings.scanner?.channelScanner?.minTouches ?? DEFAULT_SETTINGS.scanner.channelScanner.minTouches,
          pivotStrength: storedSettings.scanner?.channelScanner?.pivotStrength ?? DEFAULT_SETTINGS.scanner.channelScanner.pivotStrength,
          lookbackBars: storedSettings.scanner?.channelScanner?.lookbackBars ?? DEFAULT_SETTINGS.scanner.channelScanner.lookbackBars,
        },
        divergenceScanner: {
          enabled: storedSettings.scanner?.divergenceScanner?.enabled ?? DEFAULT_SETTINGS.scanner.divergenceScanner.enabled,
          scanBullish: storedSettings.scanner?.divergenceScanner?.scanBullish ?? DEFAULT_SETTINGS.scanner.divergenceScanner.scanBullish,
          scanBearish: storedSettings.scanner?.divergenceScanner?.scanBearish ?? DEFAULT_SETTINGS.scanner.divergenceScanner.scanBearish,
          scanHidden: storedSettings.scanner?.divergenceScanner?.scanHidden ?? DEFAULT_SETTINGS.scanner.divergenceScanner.scanHidden,
          pivotStrength: storedSettings.scanner?.divergenceScanner?.pivotStrength ?? DEFAULT_SETTINGS.scanner.divergenceScanner.pivotStrength,
          timeframes: storedSettings.scanner?.divergenceScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.divergenceScanner.timeframes,
          minStrength: storedSettings.scanner?.divergenceScanner?.minStrength ?? DEFAULT_SETTINGS.scanner.divergenceScanner.minStrength,
          useDynamicThresholds: storedSettings.scanner?.divergenceScanner?.useDynamicThresholds ?? DEFAULT_SETTINGS.scanner.divergenceScanner.useDynamicThresholds,
          minPriceChangeATR: storedSettings.scanner?.divergenceScanner?.minPriceChangeATR ?? DEFAULT_SETTINGS.scanner.divergenceScanner.minPriceChangeATR,
          minRsiChange: storedSettings.scanner?.divergenceScanner?.minRsiChange ?? DEFAULT_SETTINGS.scanner.divergenceScanner.minRsiChange,
          atrPeriod: storedSettings.scanner?.divergenceScanner?.atrPeriod ?? DEFAULT_SETTINGS.scanner.divergenceScanner.atrPeriod,
        },
        macdReversalScanner: {
          enabled: storedSettings.scanner?.macdReversalScanner?.enabled ?? DEFAULT_SETTINGS.scanner.macdReversalScanner.enabled,
          timeframes: storedSettings.scanner?.macdReversalScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.macdReversalScanner.timeframes,
          fastPeriod: storedSettings.scanner?.macdReversalScanner?.fastPeriod ?? DEFAULT_SETTINGS.scanner.macdReversalScanner.fastPeriod,
          slowPeriod: storedSettings.scanner?.macdReversalScanner?.slowPeriod ?? DEFAULT_SETTINGS.scanner.macdReversalScanner.slowPeriod,
          signalPeriod: storedSettings.scanner?.macdReversalScanner?.signalPeriod ?? DEFAULT_SETTINGS.scanner.macdReversalScanner.signalPeriod,
          recentReversalLookback: storedSettings.scanner?.macdReversalScanner?.recentReversalLookback ?? DEFAULT_SETTINGS.scanner.macdReversalScanner.recentReversalLookback,
          minCandles: storedSettings.scanner?.macdReversalScanner?.minCandles ?? DEFAULT_SETTINGS.scanner.macdReversalScanner.minCandles,
        },
        rsiReversalScanner: {
          enabled: storedSettings.scanner?.rsiReversalScanner?.enabled ?? DEFAULT_SETTINGS.scanner.rsiReversalScanner.enabled,
          timeframes: storedSettings.scanner?.rsiReversalScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.rsiReversalScanner.timeframes,
          period: storedSettings.scanner?.rsiReversalScanner?.period ?? DEFAULT_SETTINGS.scanner.rsiReversalScanner.period,
          oversoldLevel: storedSettings.scanner?.rsiReversalScanner?.oversoldLevel ?? DEFAULT_SETTINGS.scanner.rsiReversalScanner.oversoldLevel,
          overboughtLevel: storedSettings.scanner?.rsiReversalScanner?.overboughtLevel ?? DEFAULT_SETTINGS.scanner.rsiReversalScanner.overboughtLevel,
          recentReversalLookback: storedSettings.scanner?.rsiReversalScanner?.recentReversalLookback ?? DEFAULT_SETTINGS.scanner.rsiReversalScanner.recentReversalLookback,
          minCandles: storedSettings.scanner?.rsiReversalScanner?.minCandles ?? DEFAULT_SETTINGS.scanner.rsiReversalScanner.minCandles,
        },
        volumeSpikeScanner: {
          enabled: storedSettings.scanner?.volumeSpikeScanner?.enabled ?? DEFAULT_SETTINGS.scanner.volumeSpikeScanner.enabled,
          timeframes: storedSettings.scanner?.volumeSpikeScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.volumeSpikeScanner.timeframes,
          volumeThreshold: storedSettings.scanner?.volumeSpikeScanner?.volumeThreshold ?? DEFAULT_SETTINGS.scanner.volumeSpikeScanner.volumeThreshold,
          priceChangeThreshold: storedSettings.scanner?.volumeSpikeScanner?.priceChangeThreshold ?? DEFAULT_SETTINGS.scanner.volumeSpikeScanner.priceChangeThreshold,
          lookbackPeriod: storedSettings.scanner?.volumeSpikeScanner?.lookbackPeriod ?? DEFAULT_SETTINGS.scanner.volumeSpikeScanner.lookbackPeriod,
        },
        supportResistanceScanner: {
          enabled: storedSettings.scanner?.supportResistanceScanner?.enabled ?? DEFAULT_SETTINGS.scanner.supportResistanceScanner.enabled,
          timeframes: storedSettings.scanner?.supportResistanceScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.supportResistanceScanner.timeframes,
          distanceThreshold: storedSettings.scanner?.supportResistanceScanner?.distanceThreshold ?? DEFAULT_SETTINGS.scanner.supportResistanceScanner.distanceThreshold,
          minTouches: storedSettings.scanner?.supportResistanceScanner?.minTouches ?? DEFAULT_SETTINGS.scanner.supportResistanceScanner.minTouches,
        },
        kalmanTrendScanner: {
          enabled: storedSettings.scanner?.kalmanTrendScanner?.enabled ?? DEFAULT_SETTINGS.scanner.kalmanTrendScanner.enabled,
          timeframes: storedSettings.scanner?.kalmanTrendScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.kalmanTrendScanner.timeframes,
        },
        ritchiTrendScanner: {
          enabled: storedSettings.scanner?.ritchiTrendScanner?.enabled ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.enabled,
          timeframes: storedSettings.scanner?.ritchiTrendScanner?.timeframes ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.timeframes,
          pivLen: storedSettings.scanner?.ritchiTrendScanner?.pivLen ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.pivLen,
          smaMin: storedSettings.scanner?.ritchiTrendScanner?.smaMin ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.smaMin,
          smaMax: storedSettings.scanner?.ritchiTrendScanner?.smaMax ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.smaMax,
          smaMult: storedSettings.scanner?.ritchiTrendScanner?.smaMult ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.smaMult,
          trendLen: storedSettings.scanner?.ritchiTrendScanner?.trendLen ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.trendLen,
          atrMult: storedSettings.scanner?.ritchiTrendScanner?.atrMult ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.atrMult,
          tpMult: storedSettings.scanner?.ritchiTrendScanner?.tpMult ?? DEFAULT_SETTINGS.scanner.ritchiTrendScanner.tpMult,
        },
      },
      orders: {
        cloudPercentage: storedSettings.orders?.cloudPercentage ?? DEFAULT_SETTINGS.orders.cloudPercentage,
        smallPercentage: storedSettings.orders?.smallPercentage ?? DEFAULT_SETTINGS.orders.smallPercentage,
        bigPercentage: storedSettings.orders?.bigPercentage ?? DEFAULT_SETTINGS.orders.bigPercentage,
        leverage: storedSettings.orders?.leverage ?? DEFAULT_SETTINGS.orders.leverage,
        byExchange: {
          hyperliquid: {
            cloudPercentage: storedSettings.orders?.byExchange?.hyperliquid?.cloudPercentage
              ?? storedSettings.orders?.cloudPercentage
              ?? DEFAULT_SETTINGS.orders.byExchange.hyperliquid.cloudPercentage,
            smallPercentage: storedSettings.orders?.byExchange?.hyperliquid?.smallPercentage
              ?? storedSettings.orders?.smallPercentage
              ?? DEFAULT_SETTINGS.orders.byExchange.hyperliquid.smallPercentage,
            bigPercentage: storedSettings.orders?.byExchange?.hyperliquid?.bigPercentage
              ?? storedSettings.orders?.bigPercentage
              ?? DEFAULT_SETTINGS.orders.byExchange.hyperliquid.bigPercentage,
            leverage: storedSettings.orders?.byExchange?.hyperliquid?.leverage
              ?? storedSettings.orders?.leverage
              ?? DEFAULT_SETTINGS.orders.byExchange.hyperliquid.leverage,
          },
          binance: {
            cloudPercentage: storedSettings.orders?.byExchange?.binance?.cloudPercentage
              ?? storedSettings.orders?.cloudPercentage
              ?? DEFAULT_SETTINGS.orders.byExchange.binance.cloudPercentage,
            smallPercentage: storedSettings.orders?.byExchange?.binance?.smallPercentage
              ?? storedSettings.orders?.smallPercentage
              ?? DEFAULT_SETTINGS.orders.byExchange.binance.smallPercentage,
            bigPercentage: storedSettings.orders?.byExchange?.binance?.bigPercentage
              ?? storedSettings.orders?.bigPercentage
              ?? DEFAULT_SETTINGS.orders.byExchange.binance.bigPercentage,
            leverage: storedSettings.orders?.byExchange?.binance?.leverage
              ?? storedSettings.orders?.leverage
              ?? DEFAULT_SETTINGS.orders.byExchange.binance.leverage,
          },
        },
      },
      theme: {
        selected: storedSettings.theme?.selected ?? DEFAULT_SETTINGS.theme.selected,
        playTradeSound: storedSettings.theme?.playTradeSound ?? DEFAULT_SETTINGS.theme.playTradeSound,
      },
      chart: {
        showPivotMarkers: storedSettings.chart?.showPivotMarkers ?? DEFAULT_SETTINGS.chart.showPivotMarkers,
        showRsiMarkers: storedSettings.chart?.showRsiMarkers ?? DEFAULT_SETTINGS.chart.showRsiMarkers,
        showDivergenceMarkers: storedSettings.chart?.showDivergenceMarkers ?? DEFAULT_SETTINGS.chart.showDivergenceMarkers,
        showMacdMarkers: storedSettings.chart?.showMacdMarkers ?? DEFAULT_SETTINGS.chart.showMacdMarkers,
        showCrossoverMarkers: storedSettings.chart?.showCrossoverMarkers ?? DEFAULT_SETTINGS.chart.showCrossoverMarkers,
        showBreakeven: storedSettings.chart?.showBreakeven ?? DEFAULT_SETTINGS.chart.showBreakeven,
        schmecklesMode: storedSettings.chart?.schmecklesMode ?? DEFAULT_SETTINGS.chart.schmecklesMode,
        invertedMode: storedSettings.chart?.invertedMode ?? DEFAULT_SETTINGS.chart.invertedMode,
      },
      ai: {
        enabled: storedSettings.ai?.enabled ?? DEFAULT_SETTINGS.ai.enabled,
        claudeApiKey: storedSettings.ai?.claudeApiKey ?? DEFAULT_SETTINGS.ai.claudeApiKey,
        claudeModel: storedSettings.ai?.claudeModel ?? DEFAULT_SETTINGS.ai.claudeModel,
        confidenceThreshold: storedSettings.ai?.confidenceThreshold ?? DEFAULT_SETTINGS.ai.confidenceThreshold,
        telegramEnabled: storedSettings.ai?.telegramEnabled ?? DEFAULT_SETTINGS.ai.telegramEnabled,
        telegramBotToken: storedSettings.ai?.telegramBotToken ?? DEFAULT_SETTINGS.ai.telegramBotToken,
        telegramChatId: storedSettings.ai?.telegramChatId ?? DEFAULT_SETTINGS.ai.telegramChatId,
        telegramByExchange: {
          hyperliquid: {
            enabled: storedSettings.ai?.telegramByExchange?.hyperliquid?.enabled
              ?? storedSettings.ai?.telegramEnabled
              ?? DEFAULT_SETTINGS.ai.telegramByExchange.hyperliquid.enabled,
            botToken: storedSettings.ai?.telegramByExchange?.hyperliquid?.botToken
              ?? storedSettings.ai?.telegramBotToken
              ?? DEFAULT_SETTINGS.ai.telegramByExchange.hyperliquid.botToken,
            chatId: storedSettings.ai?.telegramByExchange?.hyperliquid?.chatId
              ?? storedSettings.ai?.telegramChatId
              ?? DEFAULT_SETTINGS.ai.telegramByExchange.hyperliquid.chatId,
          },
          binance: {
            enabled: storedSettings.ai?.telegramByExchange?.binance?.enabled
              ?? DEFAULT_SETTINGS.ai.telegramByExchange.binance.enabled,
            botToken: storedSettings.ai?.telegramByExchange?.binance?.botToken
              ?? DEFAULT_SETTINGS.ai.telegramByExchange.binance.botToken,
            chatId: storedSettings.ai?.telegramByExchange?.binance?.chatId
              ?? DEFAULT_SETTINGS.ai.telegramByExchange.binance.chatId,
          },
        },
        strategy: storedSettings.ai?.strategy ?? DEFAULT_SETTINGS.ai.strategy,
        maxCallsPerHour: storedSettings.ai?.maxCallsPerHour ?? DEFAULT_SETTINGS.ai.maxCallsPerHour,
      },
      bot: {
        enabled: storedSettings.bot?.enabled ?? DEFAULT_SETTINGS.bot.enabled,
        indicator: storedSettings.bot?.indicator ?? DEFAULT_SETTINGS.bot.indicator,
        paperMode: storedSettings.bot?.paperMode ?? DEFAULT_SETTINGS.bot.paperMode,
        exchange: storedSettings.bot?.exchange ?? DEFAULT_SETTINGS.bot.exchange,
        timeframe: storedSettings.bot?.timeframe ?? DEFAULT_SETTINGS.bot.timeframe,
        scanIntervalSec: storedSettings.bot?.scanIntervalSec ?? DEFAULT_SETTINGS.bot.scanIntervalSec,
        autoTopSymbolsCount: Math.min(
          10,
          Math.max(
            1,
            Number(storedSettings.bot?.autoTopSymbolsCount ?? DEFAULT_SETTINGS.bot.autoTopSymbolsCount) || DEFAULT_SETTINGS.bot.autoTopSymbolsCount
          )
        ),
        initialMarginUsdt: storedSettings.bot?.initialMarginUsdt ?? DEFAULT_SETTINGS.bot.initialMarginUsdt,
        maxLossPercentPerDay: storedSettings.bot?.maxLossPercentPerDay ?? DEFAULT_SETTINGS.bot.maxLossPercentPerDay,
        leverageByExchange: {
          binance: storedSettings.bot?.leverageByExchange?.binance ?? DEFAULT_SETTINGS.bot.leverageByExchange.binance,
          hyperliquid: storedSettings.bot?.leverageByExchange?.hyperliquid ?? DEFAULT_SETTINGS.bot.leverageByExchange.hyperliquid,
        },
        symbolMode: storedSettings.bot?.symbolMode ?? DEFAULT_SETTINGS.bot.symbolMode,
        manualSymbols: Array.isArray(storedSettings.bot?.manualSymbols)
          ? storedSettings.bot.manualSymbols.filter((symbol: unknown): symbol is string => typeof symbol === 'string')
          : DEFAULT_SETTINGS.bot.manualSymbols,
        favouriteSymbols: Array.isArray(storedSettings.bot?.favouriteSymbols)
          ? storedSettings.bot.favouriteSymbols.filter((symbol: unknown): symbol is string => typeof symbol === 'string')
          : DEFAULT_SETTINGS.bot.favouriteSymbols,
        safetyStopLossPercent: storedSettings.bot?.safetyStopLossPercent ?? DEFAULT_SETTINGS.bot.safetyStopLossPercent,
        atrMultiplier: storedSettings.bot?.atrMultiplier ?? DEFAULT_SETTINGS.bot.atrMultiplier,
        riskPercent: storedSettings.bot?.riskPercent ?? DEFAULT_SETTINGS.bot.riskPercent,
        telegramBotToken: storedSettings.bot?.telegramBotToken,
        telegramChatId: storedSettings.bot?.telegramChatId,
        alertWebhookUrl: storedSettings.bot?.alertWebhookUrl,
      },
      pinnedSymbols: sanitizedPinnedSymbols,
    };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      isPanelOpen: false,
      activeTab: 'scanner',
      mobileActiveTab: 'chart',
      isMultiChartView: false,
      settings: DEFAULT_SETTINGS,
      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
      toggleMultiChartView: () => set((state) => ({ isMultiChartView: !state.isMultiChartView })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setMobileActiveTab: (tab) => set({ mobileActiveTab: tab }),
      updateStochasticSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            indicators: {
              ...state.settings.indicators,
              stochastic: {
                ...state.settings.indicators.stochastic,
                ...updates,
              },
            },
          },
        })),
      updateEmaSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            indicators: {
              ...state.settings.indicators,
              ema: {
                ...state.settings.indicators.ema,
                ...updates,
              },
            },
          },
        })),
      updateMacdSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            indicators: {
              ...state.settings.indicators,
              macd: {
                ...state.settings.indicators.macd,
                ...updates,
              },
            },
          },
        })),
      updateKalmanTrendSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            indicators: {
              ...state.settings.indicators,
              kalmanTrend: {
                ...state.settings.indicators.kalmanTrend,
                ...updates,
              },
            },
          },
        })),
      updateSieuXuHuongSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            indicators: {
              ...state.settings.indicators,
              sieuXuHuong: {
                ...state.settings.indicators.sieuXuHuong,
                ...updates,
              },
            },
          },
        })),
      updateScannerSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            scanner: {
              ...state.settings.scanner,
              ...updates,
            },
          },
        })),
      updateOrderSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            orders: {
              ...state.settings.orders,
              ...updates,
            },
          },
        })),
      updateChartSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            chart: {
              ...state.settings.chart,
              ...updates,
            },
          },
        })),
      updateThemeSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            theme: {
              ...state.settings.theme,
              ...updates,
            },
          },
        })),
      updateAISettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ai: {
              ...state.settings.ai,
              ...updates,
            },
          },
        })),
      updateBotSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            bot: {
              ...state.settings.bot,
              ...updates,
            },
          },
        })),
      updateSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...updates,
          },
        })),
      pinSymbol: (symbol) =>
        set((state) => {
          const safePinnedSymbols = Array.isArray(state.settings.pinnedSymbols)
            ? state.settings.pinnedSymbols.filter((item): item is string => typeof item === 'string')
            : [];

          if (safePinnedSymbols.includes(symbol)) {
            return state;
          }
          return {
            settings: {
              ...state.settings,
              pinnedSymbols: [...safePinnedSymbols, symbol],
            },
          };
        }),
      unpinSymbol: (symbol) =>
        set((state) => {
          const safePinnedSymbols = Array.isArray(state.settings.pinnedSymbols)
            ? state.settings.pinnedSymbols.filter((item): item is string => typeof item === 'string')
            : [];

          return {
            settings: {
              ...state.settings,
              pinnedSymbols: safePinnedSymbols.filter((s) => s !== symbol),
            },
          };
        }),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'hyperscalper-settings',
      partialize: (state) => ({
        settings: state.settings,
        mobileActiveTab: state.mobileActiveTab,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { settings?: any; mobileActiveTab?: MobileTabType };
        return {
          ...currentState,
          settings: mergeSettings(persisted?.settings),
          mobileActiveTab: persisted?.mobileActiveTab ?? 'chart',
        };
      },
    }
  )
);
