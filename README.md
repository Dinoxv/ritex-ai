# Toilabap.com x Hyperscalper

![Toilabap x Ritchi icon](public/Ritchi-icon.png)

Toilabap.com la nen tang algo trading toan dien, va Hyperscalper la lop terminal realtime de scan, xac nhan, va thuc thi quyet dinh nhanh hon thi truong.

Core philosophy:

Write strategy logic once. Run on any exchange, any asset class, without changing your core trading logic.

## Slogan he thong (chinh thuc)

- One codebase. Any exchange. Zero friction.
- Tu prompt den lenh live trong 90 giay.
- Ca Map hanh dong truoc. Ban vao lenh dung luc.

## Van de thi truong ma chung ta giai

Truyen thong:
- 2-4 gio chi de lay va normalize du lieu moi lan test y tuong.
- Backtest va live la hai he thong code khac nhau.
- Tu y tuong den deploy thuong cham hon nhịp doi chieu cua thi truong.

Voi Toilabap x Hyperscalper:
- Exchange abstraction: mot interface cho Stocks, Crypto, Forex, Futures.
- Scanner + charting event-driven: test va verify setup ngay tren runtime.
- Trend Matrix Strategy [Ritchi] la blueprint production-grade co san.

## Flagship strategy: Trend Matrix [Ritchi] v3.1.1

4 lop confluence cot loi:
- Market structure shift (CHoCH / BOS).
- Liquidity behavior (sweep, pending zones, FVG context).
- Volatility-aware risk (ATR trailing stop).
- Partial take-profit nhieu muc de toi uu phan phoi loi nhuan.

Outcome mong muon:
- Bat dung khoanh khac doi chieu.
- Vao lenh cung chieu dong tien lon.
- Giu ky luat rui ro o cap production.

## Kien truc stack

```text
YOUR STRATEGY LOGIC
	-> TOILABAP FRAMEWORK LAYER (Backtest, Paper, Live)
	-> EXCHANGE ABSTRACTION (Alpaca, Binance, OANDA, ...)
	-> ASSET CLASSES (Stocks, Crypto, Forex, Futures)
```

Trong Hyperscalper:
- Frontend runtime: Next.js + React + lightweight-charts.
- State/runtime: scanner, candles, bot lifecycle qua stores.
- Deployment guardrails: PM2 + deployment ID + static-load recovery.

## Quickstart

1. Cai dependencies

```bash
npm install
```

2. Chay local

```bash
npm run dev
```

3. Build production

```bash
npm run build
```

4. Deploy voi PM2

```bash
npm run deploy:pm2
```

## Tai lieu

- AI trading flow: AI_TRADING_LOGIC.md
- Trend Matrix scanner: RITCHI_TREND_SCANNER.md
- Bot trading phase 1: docs/BotTrading-Binance-Phase1.md
- Realtime volume trigger: docs/REALTIME_VOLUME_TRIGGER_ENGINE.md
- Loading freeze runbook: docs/LOADING_FREEZE_RUNBOOK.md
- Rebrand and messaging: REBRAND_PLAYBOOK.md

## Brand message chot

Toilabap.com khong ban mot dashboard.
Toilabap.com ban toc do tu duy va kha nang theo dau Tien Lon trong thi truong van dong lien tuc.
