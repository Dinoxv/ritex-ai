# Toilabap.com x Hyperscalper

![Toilabap Logo](docs/toilabap.com/toilabap.com-logo-dark.svg)
![Toilabap Icon](docs/toilabap.com/toilabap.com-icon.svg)

Toilabap.com là nền tảng algo trading toàn diện. Hyperscalper là lớp terminal realtime giúp bạn đi từ quan sát thị trường đến hành động giao dịch nhanh hơn, rõ ràng hơn, kỷ luật hơn.

Thông điệp cốt lõi:

Write strategy logic once. Run on any exchange, any asset class, without changing your core trading logic.

## Định Vị Thương Hiệu

- One codebase. Any exchange. Zero friction.
- Từ prompt đến lệnh live trong 90 giây.
- Cá Mập hành động trước. Bạn vào lệnh đúng lúc.

Toilabap không bán một dashboard.
Toilabap bán tốc độ tư duy và khả năng theo dấu dòng tiền lớn trong thị trường vận động liên tục.

## Vấn Đề Thị Trường

Cách truyền thống thường khiến trader mất lợi thế:
- Mất 2-4 giờ chỉ để lấy và normalize data mỗi lần test ý tưởng.
- Backtest và live là hai hệ thống code khác nhau, dễ lệch hành vi.
- Khi deploy xong, nhịp thị trường đã đổi chiều.

Với Toilabap x Hyperscalper:
- Exchange abstraction: một interface cho Stocks, Crypto, Forex, Futures.
- Scanner + charting event-driven: test và verify setup ngay trên runtime.
- Trend Matrix Strategy [Ritchi] là blueprint production-grade tích hợp sẵn.

## Flagship Strategy: Trend Matrix [Ritchi] v3.1.1

4 lớp confluence cốt lõi:
- Market structure shift (CHoCH / BOS).
- Liquidity behavior (sweep, pending zones, FVG context).
- Volatility-aware risk (ATR trailing stop).
- Partial take-profit nhieu muc de toi uu phan phoi loi nhuan.

Kết quả mục tiêu:
- Bắt đúng khoảnh khắc đổi chiều.
- Vào lệnh cùng chiều dòng tiền lớn.
- Giữ kỷ luật rủi ro ở chuẩn production.

## Lời Hứa Sản Phẩm

Từ hypothesis đến live execution, bạn không cần đổi tư duy, không cần viết lại core logic, không cần đánh đổi tốc độ vì hạ tầng.

## Kiến Trúc Stack

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

1. Cài dependencies

```bash
npm install
```

2. Chạy local

```bash
npm run dev
```

3. Build production

```bash
npm run build
```

4. Deploy với PM2

```bash
npm run deploy:pm2
```

## Tài Liệu

- AI trading flow: AI_TRADING_LOGIC.md
- Trend Matrix scanner: RITCHI_TREND_SCANNER.md
- Bot trading phase 1: docs/BotTrading-Binance-Phase1.md
- Realtime volume trigger: docs/REALTIME_VOLUME_TRIGGER_ENGINE.md
- Loading freeze runbook: docs/LOADING_FREEZE_RUNBOOK.md
- Rebrand and messaging: REBRAND_PLAYBOOK.md

## Brand Message Chốt

Thị trường không chờ ai.
Toilabap giúp bạn rút ngắn khoảng cách từ Ý Tưởng đến Chiến Lược Thực Thi để vào lệnh với tốc độ của hệ thống, không phải tốc độ thao tác tay.
