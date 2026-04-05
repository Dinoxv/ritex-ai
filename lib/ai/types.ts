export interface AIStrategyConfig {
  enabled: boolean;
  claudeApiKey: string;
  claudeModel: string;
  confidenceThreshold: number; // 0-1, default 0.7
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  strategy: StrategyType;
  maxCallsPerHour: number;
}

export type StrategyType = 'stochastic_reversal_scalp';

export interface StrategyDefinition {
  id: StrategyType;
  name: string;
  description: string;
  requiredScanTypes: string[];
  systemPrompt: string;
}

export interface IndicatorSnapshot {
  symbol: string;
  signalType: 'bullish' | 'bearish';
  scanType: string;
  description: string;
  matchedAt: number;
  stochastics?: Array<{ k: number; d: number; timeframe: string }>;
  macdReversals?: Array<{ direction: string; timeframe: string; macdValue: number; signalValue: number }>;
  rsiReversals?: Array<{ direction: string; timeframe: string }>;
  closePrices?: number[];
}

export interface AIAnalysisRequest {
  symbol: string;
  strategy: StrategyType;
  signal: IndicatorSnapshot;
  claudeApiKey: string;
  claudeModel: string;
}

export interface AIAnalysisResult {
  action: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  entryPrice: number | null;
  tp: number | null;
  sl: number | null;
  reasoning: string;
  riskReward: number | null;
  timestamp: number;
  symbol: string;
  strategy: StrategyType;
}

export interface TelegramRequest {
  botToken: string;
  chatId: string;
  message: string;
}

export const DEFAULT_AI_CONFIG: AIStrategyConfig = {
  enabled: false,
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-20250514',
  confidenceThreshold: 0.7,
  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
  strategy: 'stochastic_reversal_scalp',
  maxCallsPerHour: 30,
};
