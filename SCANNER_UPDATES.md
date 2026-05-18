# Scanner Updates - Operating Notes

## Muc tieu

Scanner duoc nang cap theo 3 huong:
- Nhanh hon
- Chinh xac hon
- Scale de hon

## Nhung thay doi chinh

- Hop nhat signal schema cho toan bo modules.
- Them confluence scoring layer de cat false positives.
- Cai tien fetch pipeline voi retry + exponential backoff.
- Theo doi scanner performance theo module va theo symbol cluster.

## Runtime states

State machine scanner:
- preparing
- fetching
- scanning
- finalizing

Telemetry can theo doi:
- scanner latency
- candle fetch errors
- signal hit rate theo timeframe
- score distribution

## Tiep theo

- Regime-aware threshold tuning.
- Cross-timeframe confirmation gate.
- Policy gate truoc khi day recommendation sang execution.
