'use client';

import { useMemo } from 'react';
import type { ExchangeTradingService } from '@/lib/services/types';
import type { ExchangeType } from '@/stores/useDexStore';
import type { TradingViewDatafeed } from '@/lib/tradingview/types';
import { createTradingViewExchangeDatafeed } from '@/lib/tradingview/exchange-datafeed';

export function useTradingViewDatafeed(
  service: ExchangeTradingService | null,
  exchange: ExchangeType,
  dexName?: string
): TradingViewDatafeed | null {
  return useMemo(() => {
    if (!service) {
      return null;
    }

    return createTradingViewExchangeDatafeed(service, {
      exchange,
      dexName,
    });
  }, [service, exchange, dexName]);
}
