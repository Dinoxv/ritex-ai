# AI Trading Logic - Toilabap Execution Playbook

![Toilabap Logo](docs/toilabap.com/toilabap.com-logo-dark.svg)
![Toilabap Icon](docs/toilabap.com/toilabap.com-icon.svg)

## Muc tieu

Bien scanner signal thanh quyet dinh thuc thi theo format production:
- Nhan biet boi canh.
- Cham diem do tin cay.
- De xuat hanh dong co risk rails.
- Dua ket qua den UI/bot/runtime khong mat tinh nhat quan.

## Triet ly van hanh

- Ca Map hanh dong truoc, retail thay sau.
- Logic can uu tien speed of thinking va speed of execution.
- Cung mot logic cho simulation, paper va live.

## Pipeline quyet dinh

1. Signal ingest: scanner phat hien setup theo schema chung.
2. Context pack: timeframe, regime, volatility, liquidity map.
3. Confluence scoring: structure + liquidity + momentum + volume.
4. Risk construction: ATR stop, position sizing, partial TP ladder.
5. Action gate: BUY/SELL/HOLD theo nguong confidence.
6. Delivery + audit: push recommendation, log full decision payload.

## Confluence scoring framework

Nguon diem goi y:
- Structure: CHoCH, BOS, break quality.
- Liquidity: sweep, reclaim, imbalance interaction.
- Momentum: xu huong va pha toc cua dong gia.
- Volume: notional spike, side pressure, trigger persistence.

Rule bat buoc:
- Khong phat hanh action neu score duoi nguong policy.
- Confidence phai co explainability ngan gon, khong hype.

## Output contract (bat buoc)

Moi decision payload:
- action: BUY | SELL | HOLD
- confidence: 0-100
- entry_zone
- stop_loss_logic
- tp_levels
- invalid_condition
- reasoning_summary

## Guardrails

- Dedupe theo signal fingerprint de tranh spam.
- Cooldown theo symbol/timeframe.
- Fallback mode khi AI service loi.
- Audit log day du de truy vet va review hau kiem.

## KPI danh gia

- Time-to-decision
- Win-rate theo confidence bucket
- Max adverse excursion
- Distribution cua false-positive sau confluence gate
