# BotTrading Binance — Phase 1 Audit & System Reference

**Version**: 1.0.0  
**Date**: 2026-04-30  
**Branch**: `feat/bot-trading-release-ready`  
**Author**: System Audit (Copilot)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-30 | Initial audit — Phase 1 production verified |

---

## 1. Overview

Bot trading Binance USDⓈ-M Futures chạy browser-side, quản lý bởi Zustand store `useBotTradingStore`.  
Indicator: **Ritchi Trend (Siêu Xu Hướng)** — timeframe `1m`, scan mỗi 30s, top-3 volatile symbols.

**Route**: `/binance-apikey/bot`  
**PM2 process**: `hyperscalper-frontend` (id=3), port 3001

---

## 2. Default Bot Settings

| Setting | Value | File |
|---------|-------|------|
| `indicator` | `ritchi` | `models/Settings.ts:588` |
| `paperMode` | `false` | `models/Settings.ts:589` |
| `exchange` | `binance` | `models/Settings.ts:590` |
| `timeframe` | `1m` | `models/Settings.ts:591` |
| `scanIntervalSec` | `30` | `models/Settings.ts:592` |
| `initialMarginUsdt` | `25` | `models/Settings.ts:593` |
| `maxLossPercentPerDay` | `3` (%) | `models/Settings.ts:594` |
| `leverageByExchange.binance` | `10x` | `models/Settings.ts:596` |
| `symbolMode` | `auto` (top-3 volatile) | `models/Settings.ts:599` |
| `manualSymbols` | `[]` | `models/Settings.ts:600` |

**Notional per position**: `25 USDT × 10x = 250 USDT`

---

## 3. Ritchi Trend (Siêu Xu Hướng) Default Config

| Param | Default | Description |
|-------|---------|-------------|
| `pivLen` | 5 | Pivot lookback length |
| `smaMin` | 5 | SMA minimum period |
| `smaMax` | 50 | SMA maximum period |
| `smaMult` | 1.0 | SMA multiplier |
| `trendLen` | 100 | Trend length |
| `atrMult` | 2.0 | ATR multiplier for stop loss |
| `tpMult` | 3.0 | Take profit multiplier |

Config source: `models/Settings.ts:393` → `settings.indicators.sieuXuHuong`  
Implementation: `lib/indicators.ts:2144` → `calculateSieuXuHuong()`

---

## 4. Full Trading Pipeline

```
start()
  └── force exchange='binance', paperMode=false
  └── syncTrackedSymbols()
  └── runCycle() immediately, then setInterval(30s)

runCycle()
  ├── Gate: botSettings.exchange === 'binance' (abort if not)
  ├── Gate: !dailyStats.tradingDisabled (abort if daily loss hit)
  ├── syncTrackedSymbols() → getTopVolatileSymbols() → top 3 by |percentChange|
  │
  └── for each symbol:
      ├── scanRitchiTrend(symbol, timeframe='1m', config=sieuXuHuong)
      │   ├── getCandlesFromStore(symbol, '1m', 150) [chart cache]
      │   ├── if < 50 candles → fetchCandlesDirect()
      │   │     └── BinanceService.getCandles()
      │   │           └── GET /fapi/v1/klines?symbol=XYZUSDT&interval=1m&limit=150
      │   └── calculateSieuXuHuong(candles, pivLen, smaMin, smaMax, ...)
      │         └── check last 3 bars for buySignal/sellSignal
      │
      ├── No signal → log 'skip', continue
      │
      ├── Signal + No position → OPEN
      │   ├── getMidPrice(symbol) → GET /fapi/v1/premiumIndex
      │   ├── rawSize = (initialMarginUsdt × leverage) / midPrice
      │   ├── getMetadataCache(symbol) [stepSize, tickSize, minNotional]
      │   ├── setLeverage(symbol, 10) → POST /fapi/v1/leverage
      │   ├── ensureMinNotional(rawSize, midPrice, metadata, 10)
      │   └── placeMarketBuy/Sell(symbol, size) → POST /fapi/v1/order MARKET
      │
      └── Signal + Existing position + Signal reversed → CLOSE + REOPEN
          ├── placeMarketSell/Buy (close) → POST /fapi/v1/order MARKET
          ├── update dailyStats (PnL, loss check)
          └── if !tradingDisabled → OPEN new position (same flow as above)
```

---

## 5. Symbol Selection

```
useGlobalPollingStore.fetchSlowData() [every 90s on Binance]
  └── BinanceService.getMetaAndAssetCtxs()
        ├── GET /fapi/v1/ticker/24hr    → dayNtlVlm, prevDayPx, midPx
        └── GET /fapi/v1/premiumIndex   → markPx
  └── useSymbolVolatilityStore.updateFromGlobalPoll(metaData)
        └── percentChange = (markPx - prevDayPx) / prevDayPx × 100  [ALL symbols]
  └── useTopSymbolsStore.updateFromGlobalPoll(metaData)
        └── sort by dayNtlVlm desc

getTopVolatileSymbols()
  └── useTopSymbolsStore.symbols ranked by |volatility[name].percentChange| desc
  └── return top 3 names
```

> **Fix v1.0**: `updateFromGlobalPoll` đã bỏ filter `subscribedSymbols` — tất cả symbols trong universe đều được tính volatility, không chỉ những symbol đang mở trên chart.

---

## 6. Key Files

| File | Role |
|------|------|
| `app/[address]/bot/page.tsx` | Route entry — redirect non-binance slugs → `/binance-apikey/bot` |
| `components/layout/AppShell.tsx` | Nav button Bot → always push `/${BINANCE_ROUTE_SLUG}/bot` |
| `stores/useBotTradingStore.ts` | Bot engine — lifecycle, scan cycle, order placement |
| `stores/useSymbolVolatilityStore.ts` | Volatility tracker — percentChange per symbol |
| `stores/useTopSymbolsStore.ts` | Universe ranked by volume |
| `stores/useGlobalPollingStore.ts` | Poll meta/prices every 90s (Binance) |
| `lib/services/binance.service.ts` | Binance Futures API (`/fapi/v1/...`) |
| `lib/services/scanner.service.ts` | `scanRitchiTrend()` — signal generation |
| `lib/indicators.ts:2144` | `calculateSieuXuHuong()` — indicator math |
| `lib/hooks/use-exchange-service.ts` | Injects `BinanceService` at binance-apikey route |
| `lib/constants/routing.ts` | `BINANCE_ROUTE_SLUG = 'binance-apikey'` |
| `models/Settings.ts` | All default settings |
| `components/providers/ServiceProvider.tsx` | Wires exchangeService to all stores |

---

## 7. Binance API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/fapi/v1/klines` | Fetch candles |
| GET | `/fapi/v1/premiumIndex` | Get mark price |
| GET | `/fapi/v1/ticker/24hr` | Volume + prev day price |
| GET | `/fapi/v1/exchangeInfo` | Symbol metadata (stepSize, tickSize) |
| POST | `/fapi/v1/leverage` | Set leverage per symbol |
| POST | `/fapi/v1/order` | Place MARKET order |

Base URL: `https://fapi.binance.com` (mainnet) | `https://testnet.binancefuture.com` (testnet)

---

## 8. Risk Controls

| Control | Behavior |
|---------|----------|
| `maxLossPercentPerDay = 3%` | Sau mỗi lần đóng lệnh, tính cumulative loss. Nếu vượt 3% → `tradingDisabled=true`, bot dừng cả ngày |
| `paperMode = false` | Start() force false — lệnh thật, không paper |
| `maxPositions` | Implicit: chỉ scan top-3 symbols, mỗi symbol max 1 position |
| Signal gate | Chỉ open/flip khi signal xuất hiện trong 3 nến gần nhất |
| Leverage set mỗi lần | `setLeverage()` gọi trước mỗi lần open — đảm bảo đúng leverage dù user đổi setting |

---

## 9. Known Behaviors & Notes

1. **`useDexStore.selectedExchange` mặc định `'hyperliquid'`** — chỉ ảnh hưởng polling interval (5s vs 12s). Không ảnh hưởng bot trading.

2. **Backtest function** (không phải live trading) check `useDexStore.selectedExchange === 'binance'` — nếu user muốn backtest cần đổi exchange dropdown sang Binance.

3. **Auto symbol rotation**: Khi top-3 thay đổi, bot delay open vị thế mới cho đến khi các vị thế nằm ngoài top-3 được đóng.

4. **Symbol normalization**: `toCoinSymbol('SKY') → 'SKYUSDT'`, `toCoinSymbol('BTCUSDT') → 'BTCUSDT'` (không double append).

5. **`keepRunning` flag**: Nếu browser refresh, `ServiceProvider.ensureBotAutoResume()` tự resume bot nếu `keepRunning=true` trong persisted storage.

---

## 10. Bugs Fixed in This Phase

| Bug | Fix | File |
|-----|-----|------|
| Debug `fetch('http://localhost:7746/ingest/...')` còn sót | Removed | `app/[address]/bot/page.tsx` |
| Non-Binance address truy cập `/[address]/bot` không redirect | Server-side `redirect()` added | `app/[address]/bot/page.tsx` |
| Nav button Bot dùng wallet address thay vì binance slug | Fixed to use `BINANCE_ROUTE_SLUG` | `components/layout/AppShell.tsx` |
| SKYAI 0% volatility → không vào top-3 | Remove `subscribedSymbols` filter | `stores/useSymbolVolatilityStore.ts` |
| Bot symbols không có candle (not on chart) → scan skip | `fetchCandlesDirect()` fallback | `lib/services/scanner.service.ts` |

---

## 11. Deploy

```bash
cd /root/hyperscalper
bash deploy-pm2.sh
```

PM2 process: `hyperscalper-frontend` (id=3), port 3001  
Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/binance-apikey/bot`
