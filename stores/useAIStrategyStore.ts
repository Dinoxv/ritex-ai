import { create } from 'zustand';
import { AIAnalysisResult, IndicatorSnapshot } from '@/lib/ai/types';
import { useSettingsStore } from './useSettingsStore';
import { useDexStore } from './useDexStore';
import { AIStrategyConfig } from '@/models/Settings';

type AiExchange = 'hyperliquid' | 'binance';

type AiTelegramConfig = {
  enabled: boolean;
  botToken: string;
  chatId: string;
};

interface AIStrategyStore {
  isAnalyzing: boolean;
  lastResult: AIAnalysisResult | null;
  history: AIAnalysisResult[];
  callsThisHour: number;
  hourResetTime: number;
  error: string | null;
  analyzeSignal: (signal: IndicatorSnapshot) => Promise<void>;
  sendTelegramAlert: (result: AIAnalysisResult) => Promise<void>;
  clearHistory: () => void;
}

export const useAIStrategyStore = create<AIStrategyStore>()((set, get) => ({
  isAnalyzing: false,
  lastResult: null,
  history: [],
  callsThisHour: 0,
  hourResetTime: Date.now() + 3600000,
  error: null,

  analyzeSignal: async (signal: IndicatorSnapshot) => {
    const ai = useSettingsStore.getState().settings.ai;
    const selectedExchange = useDexStore.getState().selectedExchange as AiExchange;
    const telegramConfig = resolveAiTelegramConfig(ai, selectedExchange);
    if (!ai.enabled || !ai.claudeApiKey) return;

    // Rate limiting
    const now = Date.now();
    const state = get();
    let { callsThisHour, hourResetTime } = state;
    if (now > hourResetTime) {
      callsThisHour = 0;
      hourResetTime = now + 3600000;
    }
    if (callsThisHour >= ai.maxCallsPerHour) {
      set({ error: `Rate limit: ${ai.maxCallsPerHour} calls/hour reached` });
      return;
    }

    set({ isAnalyzing: true, error: null });

    try {
      const res = await fetch('/api/ai-strategy/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: signal.symbol,
          strategy: ai.strategy,
          signal,
          claudeApiKey: ai.claudeApiKey,
          claudeModel: ai.claudeModel,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        set({ isAnalyzing: false, error: errData.error || `HTTP ${res.status}` });
        return;
      }

      const result: AIAnalysisResult = await res.json();

      set((s) => ({
        isAnalyzing: false,
        lastResult: result,
        history: [result, ...s.history].slice(0, 50),
        callsThisHour: callsThisHour + 1,
        hourResetTime,
      }));

      // Auto-send Telegram if conditions met
      if (
        telegramConfig.enabled &&
        telegramConfig.botToken &&
        telegramConfig.chatId &&
        result.action !== 'WAIT' &&
        result.confidence >= ai.confidenceThreshold
      ) {
        get().sendTelegramAlert(result);
      }
    } catch (err) {
      set({ isAnalyzing: false, error: 'Network error' });
    }
  },

  sendTelegramAlert: async (result: AIAnalysisResult) => {
    const ai = useSettingsStore.getState().settings.ai;
    const selectedExchange = useDexStore.getState().selectedExchange as AiExchange;
    const telegramConfig = resolveAiTelegramConfig(ai, selectedExchange);
    if (!telegramConfig.botToken || !telegramConfig.chatId) return;

    const emoji = result.action === 'BUY' ? '🟢' : '🔴';
    const confidence = (result.confidence * 100).toFixed(0);

    const message = [
      `${emoji} <b>${result.action} ${result.symbol}</b>`,
      ``,
      `📊 Confidence: ${confidence}%`,
      result.entryPrice ? `💰 Entry: $${result.entryPrice}` : null,
      result.tp ? `🎯 TP: $${result.tp}` : null,
      result.sl ? `🛑 SL: $${result.sl}` : null,
      result.riskReward ? `📐 R:R ${result.riskReward.toFixed(1)}` : null,
      ``,
      `💡 ${result.reasoning}`,
      ``,
      `🏦 Exchange: ${selectedExchange.toUpperCase()}`,
      `⚡ Strategy: Stochastic Reversal Scalp`,
      `🕐 ${new Date(result.timestamp).toLocaleTimeString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await fetch('/api/telegram/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          message,
        }),
      });
    } catch {
      // Silent fail for telegram
    }
  },

  clearHistory: () => set({ history: [], lastResult: null }),
}));

function resolveAiTelegramConfig(ai: AIStrategyConfig, exchange: AiExchange): AiTelegramConfig {
  const exchangeConfig = ai.telegramByExchange?.[exchange];

  return {
    enabled: exchangeConfig?.enabled ?? ai.telegramEnabled ?? false,
    botToken: exchangeConfig?.botToken ?? ai.telegramBotToken ?? '',
    chatId: exchangeConfig?.chatId ?? ai.telegramChatId ?? '',
  };
}
