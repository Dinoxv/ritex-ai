export interface StochasticVariantConfig {
  enabled: boolean;
  period: number;
  smoothK: number;
  smoothD: number;
}

export interface StochasticSettings {
  showMultiVariant: boolean;
  showDivergence: boolean;
  divergenceVariant: 'ultraFast' | 'fast' | 'medium' | 'slow';
  overboughtLevel: number;
  oversoldLevel: number;
  variants: {
    ultraFast: StochasticVariantConfig;
    fast: StochasticVariantConfig;
    medium: StochasticVariantConfig;
    slow: StochasticVariantConfig;
  };
}

export interface EmaConfig {
  enabled: boolean;
  period: number;
}

export interface EmaSettings {
  ema1: EmaConfig;
  ema2: EmaConfig;
  ema3: EmaConfig;
}

export interface MacdTimeframeConfig {
  enabled: boolean;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export interface MacdSettings {
  showMultiTimeframe: boolean;
  timeframes: {
    '1m': MacdTimeframeConfig;
    '5m': MacdTimeframeConfig;
    '15m': MacdTimeframeConfig;
    '1h': MacdTimeframeConfig;
  };
}

export interface KalmanTrendSettings {
  enabled: boolean;
  processNoise: number;
  measurementNoise: number;
  bandMultiplier: number;
  volConfirm: boolean;
  volThreshold: number;
  showSignals: boolean;
}

export interface SieuXuHuongSettings {
  enabled: boolean;
  pivLen: number;
  smaMin: number;
  smaMax: number;
  smaMult: number;
  trendLen: number;
  atrMult: number;
  tpMult: number;
  showSignals: boolean;
}

export interface IndicatorSettings {
  stochastic: StochasticSettings;
  ema: EmaSettings;
  macd: MacdSettings;
  kalmanTrend: KalmanTrendSettings;
  sieuXuHuong: SieuXuHuongSettings;
}

export interface StochasticScannerConfig {
  enabled: boolean;
  oversoldThreshold: number;
  overboughtThreshold: number;
  timeframes: ('1m' | '5m')[];
}

export interface EmaAlignmentScannerConfig {
  enabled: boolean;
  timeframes: ('1m' | '5m')[];
  lookbackBars: number;
  ema1Period: number;
  ema2Period: number;
  ema3Period: number;
}

export interface ChannelScannerConfig {
  enabled: boolean;
  timeframes: ('1m' | '5m')[];
  minTouches: number;
  pivotStrength: number;
  lookbackBars: number;
}

export interface DivergenceScannerConfig {
  enabled: boolean;
  scanBullish: boolean;
  scanBearish: boolean;
  scanHidden: boolean;
  pivotStrength: number;
  timeframes: ('1m' | '5m')[];
  minStrength: number;
  useDynamicThresholds: boolean;
  minPriceChangeATR: number;
  minRsiChange: number;
  atrPeriod: number;
}

export interface MacdReversalScannerConfig {
  enabled: boolean;
  timeframes: ('1m' | '5m')[];
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  recentReversalLookback: number;
  minCandles: number;
}

export interface RsiReversalScannerConfig {
  enabled: boolean;
  timeframes: ('1m' | '5m')[];
  period: number;
  oversoldLevel: number;
  overboughtLevel: number;
  recentReversalLookback: number;
  minCandles: number;
}

export interface VolumeSpikeConfig {
  enabled: boolean;
  timeframes: ('1m' | '5m')[];
  volumeThreshold: number;
  priceChangeThreshold: number;
  lookbackPeriod: number;
}

export interface SupportResistanceScannerConfig {
  enabled: boolean;
  timeframes: ('1m' | '5m')[];
  distanceThreshold: number;
  minTouches: number;
}

export interface KalmanTrendScannerConfig {
  enabled: boolean;
  timeframes: ('1m' | '5m')[];
}

export interface RitchiTrendScannerConfig {
  enabled: boolean;
  timeframes: ('1m' | '5m')[];
  pivLen: number;
  smaMin: number;
  smaMax: number;
}

export interface ScannerSettings {
  enabled: boolean;
  scanInterval: number;
  topMarkets: number;
  playSound: boolean;
  runtimeByExchange: {
    hyperliquid: {
      enabled: boolean;
      scanInterval: number;
      topMarkets: number;
      playSound: boolean;
    };
    binance: {
      enabled: boolean;
      scanInterval: number;
      topMarkets: number;
      playSound: boolean;
    };
  };
  candleCacheDuration: number;
  mediumDurationWarningSec: number;
  highDurationWarningSec: number;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  telegramSignalFilter: 'all' | 'bullish' | 'bearish';
  telegramShowTpSl: boolean;
  telegramByExchange: {
    hyperliquid: {
      enabled: boolean;
      botToken: string;
      chatId: string;
      signalFilter: 'all' | 'bullish' | 'bearish';
      showTpSl: boolean;
    };
    binance: {
      enabled: boolean;
      botToken: string;
      chatId: string;
      signalFilter: 'all' | 'bullish' | 'bearish';
      showTpSl: boolean;
    };
  };
  stochasticScanner: StochasticScannerConfig;
  emaAlignmentScanner: EmaAlignmentScannerConfig;
  channelScanner: ChannelScannerConfig;
  divergenceScanner: DivergenceScannerConfig;
  macdReversalScanner: MacdReversalScannerConfig;
  rsiReversalScanner: RsiReversalScannerConfig;
  volumeSpikeScanner: VolumeSpikeConfig;
  supportResistanceScanner: SupportResistanceScannerConfig;
  kalmanTrendScanner: KalmanTrendScannerConfig;
  ritchiTrendScanner: RitchiTrendScannerConfig;
}

export interface OrderSettings {
  cloudPercentage: number;
  smallPercentage: number;
  bigPercentage: number;
  leverage: number;
  byExchange: {
    hyperliquid: {
      cloudPercentage: number;
      smallPercentage: number;
      bigPercentage: number;
      leverage: number;
    };
    binance: {
      cloudPercentage: number;
      smallPercentage: number;
      bigPercentage: number;
      leverage: number;
    };
  };
}

export type ThemeName = 'dark' | 'hyper' | 'hyper-black' | 'midnight' | 'light' | 'dark-blue' | 'afternoon' | 'psychedelic' | 'nintendo' | 'gameboy' | 'sega' | 'playstation' | 'cyberpunk' | 'vaporwave' | 'matrix' | 'synthwave' | 'ocean' | 'c64' | 'amber' | 'girly';

export interface ThemeSettings {
  selected: ThemeName;
  playTradeSound: boolean;
}

export interface ChartSettings {
  showPivotMarkers: boolean;
  showRsiMarkers: boolean;
  showDivergenceMarkers: boolean;
  showMacdMarkers: boolean;
  showCrossoverMarkers: boolean;
  showBreakeven: boolean;
  schmecklesMode: boolean;
  invertedMode: boolean;
}

export interface AIStrategyConfig {
  enabled: boolean;
  claudeApiKey: string;
  claudeModel: string;
  confidenceThreshold: number;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  telegramByExchange: {
    hyperliquid: {
      enabled: boolean;
      botToken: string;
      chatId: string;
    };
    binance: {
      enabled: boolean;
      botToken: string;
      chatId: string;
    };
  };
  strategy: 'stochastic_reversal_scalp';
  maxCallsPerHour: number;
}

export type BotIndicatorType = 'ritchi' | 'kalmanTrend' | 'macdReversal';
export type BotExchange = 'binance' | 'hyperliquid';
export type BotSymbolMode = 'auto' | 'manual';

export interface BotTradingSettings {
  enabled: boolean;
  indicator: BotIndicatorType;
  paperMode: boolean;
  exchange: BotExchange;
  timeframe: '1m' | '5m';
  scanIntervalSec: number;
  initialMarginUsdt: number;
  maxLossPercentPerDay: number;
  leverageByExchange: {
    binance: number;
    hyperliquid: number;
  };
  symbolMode: BotSymbolMode;
  manualSymbols: string[];
}

export interface AppSettings {
  indicators: IndicatorSettings;
  scanner: ScannerSettings;
  orders: OrderSettings;
  theme: ThemeSettings;
  chart: ChartSettings;
  ai: AIStrategyConfig;
  bot: BotTradingSettings;
  pinnedSymbols: string[];
}

export const DEFAULT_STOCHASTIC_ULTRA_FAST: StochasticVariantConfig = {
  enabled: true,
  period: 9,
  smoothK: 1,
  smoothD: 3,
};

export const DEFAULT_STOCHASTIC_FAST: StochasticVariantConfig = {
  enabled: true,
  period: 14,
  smoothK: 1,
  smoothD: 3,
};

export const DEFAULT_STOCHASTIC_MEDIUM: StochasticVariantConfig = {
  enabled: true,
  period: 40,
  smoothK: 1,
  smoothD: 4,
};

export const DEFAULT_STOCHASTIC_SLOW: StochasticVariantConfig = {
  enabled: true,
  period: 60,
  smoothK: 10,
  smoothD: 10,
};

export const DEFAULT_MACD_CONFIG: MacdTimeframeConfig = {
  enabled: true,
  fastPeriod: 5,
  slowPeriod: 13,
  signalPeriod: 5,
};

export const DEFAULT_SETTINGS: AppSettings = {
  indicators: {
    stochastic: {
      showMultiVariant: true,
      showDivergence: true,
      divergenceVariant: 'fast',
      overboughtLevel: 80,
      oversoldLevel: 20,
      variants: {
        ultraFast: DEFAULT_STOCHASTIC_ULTRA_FAST,
        fast: DEFAULT_STOCHASTIC_FAST,
        medium: DEFAULT_STOCHASTIC_MEDIUM,
        slow: DEFAULT_STOCHASTIC_SLOW,
      },
    },
    ema: {
      ema1: { enabled: true, period: 5 },
      ema2: { enabled: true, period: 13 },
      ema3: { enabled: true, period: 21 },
    },
    macd: {
      showMultiTimeframe: true,
      timeframes: {
        '1m': { ...DEFAULT_MACD_CONFIG, enabled: true },
        '5m': { ...DEFAULT_MACD_CONFIG, enabled: false },
        '15m': { ...DEFAULT_MACD_CONFIG, enabled: false },
        '1h': { ...DEFAULT_MACD_CONFIG, enabled: false },
      },
    },
    kalmanTrend: {
      enabled: false,
      processNoise: 0.0005,
      measurementNoise: 0.4,
      bandMultiplier: 2.0,
      volConfirm: true,
      volThreshold: 0.3,
      showSignals: true,
    },
    sieuXuHuong: {
      enabled: false,
      pivLen: 5,
      smaMin: 5,
      smaMax: 50,
      smaMult: 1.0,
      trendLen: 100,
      atrMult: 2.0,
      tpMult: 3.0,
      showSignals: true,
    },
  },
  scanner: {
    enabled: false,
    scanInterval: 1,
    topMarkets: 50,
    playSound: true,
    runtimeByExchange: {
      hyperliquid: {
        enabled: false,
        scanInterval: 1,
        topMarkets: 50,
        playSound: true,
      },
      binance: {
        enabled: false,
        scanInterval: 1,
        topMarkets: 50,
        playSound: true,
      },
    },
    candleCacheDuration: 1,
    mediumDurationWarningSec: 1.2,
    highDurationWarningSec: 2.0,
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    telegramSignalFilter: 'all',
    telegramShowTpSl: false,
    telegramByExchange: {
      hyperliquid: {
        enabled: false,
        botToken: '',
        chatId: '',
        signalFilter: 'all',
        showTpSl: false,
      },
      binance: {
        enabled: false,
        botToken: '',
        chatId: '',
        signalFilter: 'all',
        showTpSl: false,
      },
    },
    stochasticScanner: {
      enabled: false,
      oversoldThreshold: 20,
      overboughtThreshold: 80,
      timeframes: ['1m', '5m'],
    },
    emaAlignmentScanner: {
      enabled: false,
      timeframes: ['1m', '5m'],
      lookbackBars: 3,
      ema1Period: 5,
      ema2Period: 13,
      ema3Period: 21,
    },
    channelScanner: {
      enabled: false,
      timeframes: ['1m', '5m'],
      minTouches: 3,
      pivotStrength: 3,
      lookbackBars: 50,
    },
    divergenceScanner: {
      enabled: false,
      scanBullish: true,
      scanBearish: true,
      scanHidden: false,
      pivotStrength: 15,
      timeframes: ['1m', '5m'],
      minStrength: 30,
      useDynamicThresholds: true,
      minPriceChangeATR: 1.5,
      minRsiChange: 5,
      atrPeriod: 14,
    },
    macdReversalScanner: {
      enabled: false,
      timeframes: ['1m', '5m'],
      fastPeriod: 5,
      slowPeriod: 13,
      signalPeriod: 5,
      recentReversalLookback: 3,
      minCandles: 50,
    },
    rsiReversalScanner: {
      enabled: false,
      timeframes: ['1m', '5m'],
      period: 14,
      oversoldLevel: 30,
      overboughtLevel: 70,
      recentReversalLookback: 3,
      minCandles: 50,
    },
    volumeSpikeScanner: {
      enabled: false,
      timeframes: ['1m', '5m'],
      volumeThreshold: 3.0,
      priceChangeThreshold: 0.5,
      lookbackPeriod: 10,
    },
    supportResistanceScanner: {
      enabled: false,
      timeframes: ['1m', '5m'],
      distanceThreshold: 1.0,
      minTouches: 2,
    },
    kalmanTrendScanner: {
      enabled: false,
      timeframes: ['1m', '5m'],
    },
    ritchiTrendScanner: {
      enabled: false,
      timeframes: ['1m', '5m'],
      pivLen: 5,
      smaMin: 5,
      smaMax: 50,
    },
  },
  orders: {
    cloudPercentage: 5,
    smallPercentage: 10,
    bigPercentage: 25,
    leverage: 10,
    byExchange: {
      hyperliquid: {
        cloudPercentage: 5,
        smallPercentage: 10,
        bigPercentage: 25,
        leverage: 10,
      },
      binance: {
        cloudPercentage: 5,
        smallPercentage: 10,
        bigPercentage: 25,
        leverage: 10,
      },
    },
  },
  theme: {
    selected: 'dark-blue',
    playTradeSound: false,
  },
  chart: {
    showPivotMarkers: true,
    showRsiMarkers: true,
    showDivergenceMarkers: true,
    showMacdMarkers: true,
    showCrossoverMarkers: true,
    showBreakeven: true,
    schmecklesMode: false,
    invertedMode: false,
  },
  ai: {
    enabled: false,
    claudeApiKey: '',
    claudeModel: 'claude-sonnet-4-20250514',
    confidenceThreshold: 0.7,
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    telegramByExchange: {
      hyperliquid: {
        enabled: false,
        botToken: '',
        chatId: '',
      },
      binance: {
        enabled: false,
        botToken: '',
        chatId: '',
      },
    },
    strategy: 'stochastic_reversal_scalp',
    maxCallsPerHour: 30,
  },
  bot: {
    enabled: false,
    indicator: 'ritchi',
    paperMode: true,
    exchange: 'binance',
    timeframe: '1m',
    scanIntervalSec: 30,
    initialMarginUsdt: 25,
    maxLossPercentPerDay: 3,
    leverageByExchange: {
      binance: 10,
      hyperliquid: 10,
    },
    symbolMode: 'auto',
    manualSymbols: [],
  },
  pinnedSymbols: [],
};
