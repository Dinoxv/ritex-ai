'use client';

import { useEffect } from 'react';
import { useExchangeService } from '@/lib/hooks/use-exchange-service';
import { useAddressFromUrl } from '@/lib/hooks/use-address-from-url';
import { usePositionStore } from '@/stores/usePositionStore';
import { useSymbolMetaStore } from '@/stores/useSymbolMetaStore';
import { useOrderStore } from '@/stores/useOrderStore';
import { useCandleStore } from '@/stores/useCandleStore';
import { useTradingStore } from '@/stores/useTradingStore';
import { useTopSymbolsStore } from '@/stores/useTopSymbolsStore';
import { useUserFillsStore } from '@/stores/useUserFillsStore';
import { useScannerStore } from '@/stores/useScannerStore';
import { useSymbolVolatilityStore } from '@/stores/useSymbolVolatilityStore';
import { useGlobalPollingStore } from '@/stores/useGlobalPollingStore';
import { useSymbolCandlesStore } from '@/stores/useSymbolCandlesStore';
import { useBotTradingStore } from '@/stores/useBotTradingStore';
import type { ExchangeTradingService } from '@/lib/services/types';

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const addressFromUrl = useAddressFromUrl();
  const service = useExchangeService(addressFromUrl || undefined);
  const setPositionService = usePositionStore((state) => state.setService);
  const fetchAndStoreAllOpenPositions = usePositionStore((state) => state.fetchAndStoreAllOpenPositions);
  const setMetaService = useSymbolMetaStore((state) => state.setService);
  const fetchMetadata = useSymbolMetaStore((state) => state.fetchMetadata);
  const setOrderService = useOrderStore((state) => state.setService);
  const setCandleService = useCandleStore((state) => state.setService);
  const setTradingService = useTradingStore((state) => state.setService);
  const setTopSymbolsService = useTopSymbolsStore((state) => state.setService);
  const setUserFillsService = useUserFillsStore((state) => state.setService);
  const setScannerService = useScannerStore((state) => state.setService);
  const setVolatilityService = useSymbolVolatilityStore((state) => state.setService);
  const setGlobalPollingService = useGlobalPollingStore((state) => state.setService);
  const setSymbolCandlesService = useSymbolCandlesStore((state) => state.setService);
  const setBotService = useBotTradingStore((state) => state.setService);

  useEffect(() => {
    console.log('[ServiceProvider] Service changed, updating all stores');
    if (!service) {
      console.log('[ServiceProvider] No service available (credentials or wallet address not set)');
      return;
    }

    const exchangeService = service as ExchangeTradingService;

    setPositionService(exchangeService);
    setMetaService(exchangeService);
    setOrderService(exchangeService);
    setCandleService(exchangeService);
    setTradingService(exchangeService);
    setTopSymbolsService(exchangeService);
    setUserFillsService(exchangeService);
    setScannerService(exchangeService);
    setVolatilityService(exchangeService);
    setGlobalPollingService(exchangeService);
    setSymbolCandlesService(exchangeService);
    setBotService(exchangeService);

    fetchMetadata();
    fetchAndStoreAllOpenPositions();
  }, [service]);

  return <>{children}</>;
}
