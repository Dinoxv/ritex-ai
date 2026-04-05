import { create } from 'zustand';
import { AIAnalysisResult, IndicatorSnapshot } from '@/lib/ai/types';
import { useSettingsStore } from './useSettingsStore';

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
      const res = await fetch('/api/ai-strategy', {
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
        ai.telegramEnabled &&
        ai.telegramBotToken &&
        ai.telegramChatId &&
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
    if (!ai.telegramBotToken || !ai.telegramChatId) return;

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
      `⚡ Strategy: Stochastic Reversal Scalp`,
      `🕐 ${new Date(result.timestamp).toLocaleTimeString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: ai.telegramBotToken,
          chatId: ai.telegramChatId,
          message,
        }),
      });
    } catch {
      // Silent fail for telegram
    }
  },

  clearHistory: () => set({ history: [], lastResult: null }),
}));
