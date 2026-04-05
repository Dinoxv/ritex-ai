# AI Trading Logic — RITEX AI

## Overview

Event-driven AI analysis system that uses Claude API to evaluate scanner signals and sends BUY/SELL notifications via Telegram when confidence exceeds a configurable threshold.

**Architecture:** Browser Scanner → Next.js API Route (server-side) → Claude API → Analysis → Telegram Bot

---

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        RITEX AI Frontend                        │
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Scanner   │───▸│ AI Strategy  │───▸│ AI Strategy Panel    │  │
│  │ Store     │    │ Store        │    │ (Sidebar UI)         │  │
│  │           │    │              │    │                      │  │
│  │ runScan() │    │ analyzeSignal│    │ • Action Badge       │  │
│  │ 8 modules │    │ rateLimit    │    │ • Confidence Bar     │  │
│  │           │    │ sendTelegram │    │ • Entry/TP/SL        │  │
│  └──────────┘    └──────┬───────┘    │ • Reasoning          │  │
│                         │            │ • History             │  │
│                         ▼            └──────────────────────┘  │
│              ┌─────────────────────┐                           │
│              │   fetch('/api/...')  │                           │
│              └──────────┬──────────┘                           │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (Server)                  │
│                                                                 │
│  POST /api/ai-strategy/          POST /api/telegram/            │
│  ┌─────────────────────┐         ┌──────────────────────┐      │
│  │ 1. Validate request │         │ 1. Validate request  │      │
│  │ 2. Build prompt     │         │ 2. POST to Telegram  │      │
│  │ 3. Call Claude API  │         │ 3. Return messageId  │      │
│  │ 4. Parse JSON resp  │         └──────────────────────┘      │
│  │ 5. Return analysis  │                                       │
│  └─────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
                   ┌──────────────┐    ┌──────────────┐
                   │ Claude API   │    │ Telegram Bot │
                   │ (Anthropic)  │    │ API          │
                   └──────────────┘    └──────────────┘
```

---

## Strategy: Stochastic Reversal Scalp

### Entry Conditions

| Direction | Stochastic Condition | MACD Condition | Summary |
|-----------|---------------------|----------------|---------|
| **LONG** | %K crosses **above 20** (exits oversold) | Histogram turns **positive** | Oversold bounce with bullish momentum |
| **SHORT** | %K crosses **below 80** (exits overbought) | Histogram turns **negative** | Overbought rejection with bearish momentum |

### Risk Management

| Parameter | Value |
|-----------|-------|
| Take Profit | **2%** from entry |
| Stop Loss | **1%** from entry |
| Risk:Reward | **2:1** |
| Timeframes | **5m / 15m** alignment preferred |

### Example

```
Symbol: BTC at $83,310
Stochastic 5m: %K=22.5, %D=18.3 (exiting oversold, %K crossed above 20)
MACD 5m: MACD=0.000125, Signal=-0.000045 (histogram positive)

AI Analysis:
  Action: BUY
  Confidence: 82%
  Entry: $83,310
  TP: $84,976 (+2%)
  SL: $82,477 (-1%)
  R:R: 2.0
```

---

## Trigger Flow (Event-Driven)

```
1. Scanner runs (auto or manual)
   └── useScannerStore.runScan()
       ├── Run 8 scanner modules (stochastic, ema, macd, rsi, divergence, volume, channel, S/R)
       ├── Aggregate results → newResults[]
       └── IF ai.enabled && ai.claudeApiKey && newResults.length > 0:
           └── useAIStrategyStore.analyzeSignal(firstSignal)

2. AI Analysis
   └── analyzeSignal(signal)
       ├── Rate limit check (maxCallsPerHour)
       ├── POST /api/ai-strategy/ { symbol, strategy, signal, claudeApiKey, claudeModel }
       │   ├── Server builds prompt from strategy definition + indicator snapshot
       │   ├── Server calls Claude API with system prompt (strategy rules) + user prompt (data)
       │   └── Server parses JSON response → AIAnalysisResult
       ├── Store result in history (max 50)
       └── IF telegramEnabled && action != WAIT && confidence >= threshold:
           └── sendTelegramAlert(result)

3. Telegram Alert
   └── sendTelegramAlert(result)
       ├── Build HTML message with emoji/formatting
       └── POST /api/telegram/ { botToken, chatId, message }
           └── Server forwards to api.telegram.org/botXXX/sendMessage
```

---

## Data Structures

### IndicatorSnapshot (sent to Claude)

```typescript
{
  symbol: "BTC",
  signalType: "bullish" | "bearish",
  scanType: "stochastic" | "macdReversal" | ...,
  description: "Stochastic %K crossed above 20 on 5m",
  matchedAt: 1743845500000,
  stochastics: [{ k: 22.5, d: 18.3, timeframe: "5m" }],
  macdReversals: [{ direction: "bullish", timeframe: "5m", macdValue: 0.000125, signalValue: -0.000045 }],
  closePrices: [83200, 83150, 83180, 83220, 83280, 83310]
}
```

### AIAnalysisResult (from Claude)

```typescript
{
  action: "BUY" | "SELL" | "WAIT",
  confidence: 0.82,           // 0.0 to 1.0
  entryPrice: 83310,          // or null
  tp: 84976,                  // Take Profit or null
  sl: 82477,                  // Stop Loss or null
  reasoning: "Strong stochastic reversal with MACD confirmation",
  riskReward: 2.0,            // or null
  timestamp: 1743845500000,
  symbol: "BTC",
  strategy: "stochastic_reversal_scalp"
}
```

### Telegram Message Format

```
🟢 BUY BTC

📊 Confidence: 82%
💰 Entry: $83310
🎯 TP: $84976
🛑 SL: $82477
📐 R:R 2.0

💡 Strong stochastic reversal with MACD confirmation

⚡ Strategy: Stochastic Reversal Scalp
🕐 09:30:15
```

---

## Configuration (Settings → AI Tab)

| Setting | Default | Description |
|---------|---------|-------------|
| Enable AI Strategy | `false` | Master on/off switch |
| Claude API Key | `""` | Anthropic API key (sk-ant-...) |
| Claude Model | `claude-sonnet-4-20250514` | Model to use |
| Confidence Threshold | `0.7` (70%) | Min confidence for Telegram alerts |
| Strategy | Stochastic Reversal Scalp | Active strategy |
| Max Calls/Hour | `30` | Rate limit for Claude API calls |
| Enable Telegram | `false` | Enable Telegram notifications |
| Telegram Bot Token | `""` | Bot token from @BotFather |
| Telegram Chat ID | `""` | Chat/group ID for notifications |

---

## Rate Limiting

- Max `30` Claude API calls per hour (configurable)
- Hour window resets after 60 minutes from first call
- When limit reached, shows error in AI Strategy Panel
- Prevents runaway API costs

---

## File Structure

```
lib/ai/
├── types.ts          # AIStrategyConfig, AIAnalysisResult, IndicatorSnapshot, TelegramRequest
└── strategies.ts     # Strategy definitions, prompt builder

app/api/
├── ai-strategy/
│   └── route.ts      # POST: Claude API proxy (server-side, keeps API key safe)
└── telegram/
    └── route.ts      # POST: Telegram API proxy

stores/
├── useAIStrategyStore.ts    # AI analysis state, rate limiting, Telegram dispatch
├── useScannerStore.ts       # Scanner → AI hook (line ~176)
└── useSettingsStore.ts      # AI settings tab ('ai'), mergeSettings()

models/
└── Settings.ts              # AIStrategyConfig interface, DEFAULT_SETTINGS.ai

components/
├── ai/
│   └── AIStrategyPanel.tsx  # Sidebar panel: status, confidence bar, prices, history
└── layout/
    └── SettingsPanel.tsx     # AI tab: API keys, model, threshold, Telegram config
```

---

## Security

- Claude API key is stored in browser `localStorage` (Zustand persist) but **only sent server-side** via Next.js API routes
- API keys are **never exposed in client-side code** — they travel through POST body to the server route
- Telegram Bot Token follows the same pattern
- Rate limiting prevents accidental cost overruns
- No automatic order execution — AI provides analysis only, user decides to trade

---

## Testing Checklist

| Test | Command / Action | Expected |
|------|-----------------|----------|
| Build | `npx next build` | ✅ No errors, routes registered |
| Telegram API | `curl -X POST localhost:3001/api/telegram/ -d {...}` | ✅ `{"ok":true,"messageId":...}` |
| Claude API | `curl -X POST localhost:3001/api/ai-strategy/ -d {...}` | ✅ AIAnalysisResult JSON (or credit error) |
| Nginx routing | `curl -X POST https://ritexai.com/api/telegram/ -d {...}` | ✅ Routes to Next.js, not backend |
| Settings UI | Open Settings → AI tab | ✅ All fields render, persist on save |
| Scanner → AI | Enable scanner + AI, trigger scan | ✅ AI panel shows result |
| Telegram alert | Set confidence < threshold, trigger signal | ✅ Telegram receives message |
| Rate limit | Exceed maxCallsPerHour | ✅ Error shown in panel |
| Missing API key | Enable AI without key | ✅ "Set Claude API key" message |

---

## Verified Test Results (2026-04-05)

```
✅ Build: Compiled successfully, routes /api/ai-strategy and /api/telegram registered
✅ Telegram: messageId 24509, 24510, 24511 sent successfully
✅ Claude API route: Properly returns Claude error messages to UI
✅ Nginx: /api/ai-strategy/ and /api/telegram/ route to Next.js (port 3001)
✅ Error handling: Missing fields → 400, Claude errors → descriptive message
✅ Trailing slash: Fixed fetch URLs to use trailing slash (trailingSlash: true in next.config)
⚠️  Claude credits: API key has zero balance — needs top-up to test full analysis flow
```
