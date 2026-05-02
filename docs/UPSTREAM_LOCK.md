# Upstream Lock Note

Repo upstream for chart/realtime sync: `upstream-hyperscalper/master` from `https://github.com/jestersimpps/hyperscalper.git`.

## Locked divergence

Only one intentional divergence should remain when syncing these files from upstream:

- `stores/useCandleStore.ts`
  - Keep `ExchangeTradingService` for `service` and `setService`.
  - Do not revert this to `HyperliquidService`.

## Why

This repo routes the candle store through multi-exchange providers (`ServiceProvider` and `MinimalServiceProvider`).
Those providers pass an `ExchangeTradingService`, so forcing the upstream `HyperliquidService` type breaks the local wiring.

## Sync rule

When re-syncing from upstream, `components/ScalpingChart.tsx` should match upstream exactly.
`stores/useCandleStore.ts` should also match upstream except for the `ExchangeTradingService` typing noted above.
