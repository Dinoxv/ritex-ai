# Realtime Volume Trigger Engine

![Toilabap Logo](toilabap.com/toilabap.com-logo-dark.svg)
![Toilabap Icon](toilabap.com/toilabap.com-icon.svg)

## Muc tieu

Phat hien som dong tien bat thuong de bo sung goc nhin cho setup SMC, khong doi den candle close.

## Design model

- Ingest trade stream theo symbol.
- Gom volume/notional tren rolling windows.
- So sanh voi baseline (EWMA, quantile, z-score).
- Emit trigger khi vuot nguong va dung context regime.

## Inputs

- Realtime trades
- Buy/sell pressure
- Symbol liquidity profile
- Optional HTF regime tag

## Outputs

- spike_score
- direction_bias
- confidence
- trigger_timestamp
- cooldown_hint

## Tich hop voi Trend Matrix

Volume trigger la bo loc bo sung.
No khong thay the CHoCH/liquidity structure cua Trend Matrix.

Khuyen nghi ket hop:
- Trend Matrix xac nhan structure.
- Volume trigger xac nhan urgency va quality cua dong tien.

## Guardrails

- Min liquidity threshold de tranh fake spikes.
- Cooldown theo symbol/timeframe de tranh spam.
- Exchange normalization de can bang data quality.
