# Trend Matrix Strategy [Ritchi] - Flagship Documentation

![Toilabap Logo](docs/toilabap.com/toilabap.com-logo-dark.svg)
![Toilabap Icon](docs/toilabap.com/toilabap.com-icon.svg)

## Vai tro chien luoc

Trend Matrix la blueprint production-grade duoc tich hop san trong Toilabap:
- Theo dau Tien Lon qua CHoCH, sweep, va imbalance behavior.
- Loc setup qua he thong confluence scoring.
- Quan tri rui ro qua ATR trailing + multi-level partial TP.

## 4 lop confluence

1. Market structure
- CHoCH / BOS va quality cua break.

2. Liquidity behavior
- Sweep, reclaim, pending liquidity zones.

3. Regime alignment
- Bias theo HTF + volatility state.

4. Risk and execution
- Entry zone, invalidation, TP ladder, stop migration.

## Output contract

Moi setup phat ra phai co:
- direction
- entry_zone
- stop_loss
- take_profit_levels
- confluence_score
- rationale

## Timeframe policy

- 1m/5m: uu tien toc do, can bo loc nhiễu manh.
- 15m/1h: uu tien quality setup, dung cho intraday swing.
- 4h/1d: regime map va key levels.

## Rule quan tri rui ro

- Khong trade neu duoi nguong confluence.
- Co cooldown de tranh overtrading.
- Position sizing phai theo risk cap.

## Tuyen bo gia tri

Muc tieu cua Trend Matrix khong phai bat moi song.
Muc tieu la vao dung song co xac suat cao, dung thoi diem, dung ky luat.
