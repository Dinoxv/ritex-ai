# Upstream Lock - Branch Governance

![Toilabap Logo](toilabap.com/toilabap.com-logo-dark.svg)
![Toilabap Icon](toilabap.com/toilabap.com-icon.svg)

## Muc tieu

Dong bo nguon voi upstream nhung khong lam vo tan bo wiring da exchange cua Toilabap runtime.

## Lock rules

- Khong tu y doi service contracts da exchange.
- Files lien quan abstraction layer bat buoc manual review.
- Moi divergence phai co ly do va tai lieu kem theo.

## Sync checklist

1. So sanh cac files service/store cot loi.
2. Chay typecheck va lint.
3. Smoke test scanner + timeframe switching.
4. Xac nhan deployment guardrails con nguyen ven.
