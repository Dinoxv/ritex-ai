import { StrategyDefinition, StrategyType } from './types';

const STOCHASTIC_REVERSAL_SCALP: StrategyDefinition = {
  id: 'stochastic_reversal_scalp',
  name: 'Stochastic Reversal Scalp',
  description: 'Enter when Stochastic exits oversold/overbought + MACD confirms direction. TP 2%.',
  requiredScanTypes: ['stochastic', 'macdReversal'],
  systemPrompt: `You are an expert crypto scalp trading analyst. Analyze the following technical indicators for a perpetual futures position.

STRATEGY: Stochastic Reversal Scalp
RULES:
- LONG entry: Stochastic %K crosses above 20 (exits oversold) AND MACD histogram turns positive (bullish momentum)
- SHORT entry: Stochastic %K crosses below 80 (exits overbought) AND MACD histogram turns negative (bearish momentum)
- Take Profit: 2% from entry
- Stop Loss: 1% from entry (2:1 R:R)
- Timeframe confirmation: prefer 5m/15m alignment

ANALYSIS REQUIREMENTS:
1. Check if the signal meets ALL entry conditions
2. Evaluate the strength of the stochastic reversal 
3. Confirm MACD direction alignment
4. Assess overall confidence (0.0 to 1.0)
5. If confidence >= 0.7, recommend BUY or SELL with exact levels
6. If conditions are not fully met, recommend WAIT

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no explanation outside JSON):
{
  "action": "BUY" | "SELL" | "WAIT",
  "confidence": 0.0-1.0,
  "entryPrice": number or null,
  "tp": number or null,
  "sl": number or null,
  "reasoning": "brief explanation",
  "riskReward": number or null
}`,
};

export const STRATEGIES: Record<StrategyType, StrategyDefinition> = {
  stochastic_reversal_scalp: STOCHASTIC_REVERSAL_SCALP,
};

export function buildAnalysisPrompt(
  strategy: StrategyDefinition,
  signal: {
    symbol: string;
    signalType: string;
    scanType: string;
    description: string;
    stochastics?: Array<{ k: number; d: number; timeframe: string }>;
    macdReversals?: Array<{ direction: string; timeframe: string; macdValue: number; signalValue: number }>;
    closePrices?: number[];
  }
): string {
  const lastPrice = signal.closePrices?.length ? signal.closePrices[signal.closePrices.length - 1] : null;

  return `SYMBOL: ${signal.symbol}
SIGNAL TYPE: ${signal.signalType}
SCAN TYPE: ${signal.scanType}
SIGNAL DESCRIPTION: ${signal.description}
CURRENT PRICE: ${lastPrice ?? 'unknown'}

STOCHASTIC DATA:
${signal.stochastics?.map(s => `  ${s.timeframe}: %K=${s.k.toFixed(2)}, %D=${s.d.toFixed(2)}`).join('\n') ?? 'N/A'}

MACD DATA:
${signal.macdReversals?.map(m => `  ${m.timeframe}: direction=${m.direction}, MACD=${m.macdValue.toFixed(6)}, Signal=${m.signalValue.toFixed(6)}`).join('\n') ?? 'N/A'}

Based on these indicators and the Stochastic Reversal Scalp strategy rules, provide your analysis.`;
}
