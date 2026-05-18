# Bot Trading Binance - Phase 1

![Toilabap Logo](toilabap.com/toilabap.com-logo-dark.svg)
![Toilabap Icon](toilabap.com/toilabap.com-icon.svg)

## Muc tieu phase 1

Dat duoc mot bot flow on dinh, audit duoc, va tuan thu risk rails truoc khi scale sang exchanges khac.

## Scope

- Symbol universe selection
- Signal intake + confluence gate
- Risk sizing + order placement
- Position management + logging
- Recovery va rollback readiness

## Core execution flow

1. Chon symbol theo liquidity va volatility profile.
2. Chay scanner, tinh confluence score.
3. Chi kich hoat setup khi score vuot policy threshold.
4. Tinh position size theo risk cap.
5. Dat lenh kem stop va TP ladder.
6. Theo doi order lifecycle va cap nhat state runtime.

## Risk rails

- Max risk per trade
- Max daily loss cap
- Max concurrent positions
- Cooldown sau chuoi thua

## Acceptance criteria

- Bot start/stop an toan, khong race condition.
- Moi decision co log payload day du.
- Retry/fallback ro rang khi API loi.
- Khong vi pham cac gioi han risk da cau hinh.

## KPI theo doi

- Fill reliability
- Avg slippage
- Decision latency
- Max drawdown theo profile
