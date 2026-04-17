'use client';

import { useEffect } from 'react';
import { useExchangeService } from '@/lib/hooks/use-exchange-service';
import { useAddressFromUrl } from '@/lib/hooks/use-address-from-url';
import { useSymbolMetaStore } from '@/stores/useSymbolMetaStore';
import { useCandleStore } from '@/stores/useCandleStore';
import type { ExchangeTradingService } from '@/lib/services/types';

export function MinimalServiceProvider({ children }: { children: React.ReactNode }) {
  const addressFromUrl = useAddressFromUrl();
  const service = useExchangeService(addressFromUrl || undefined);
  const setMetaService = useSymbolMetaStore((state) => state.setService);
  const fetchMetadata = useSymbolMetaStore((state) => state.fetchMetadata);
  const setCandleService = useCandleStore((state) => state.setService);

  useEffect(() => {
    if (service) {
      const exchangeService = service as ExchangeTradingService;
      setMetaService(exchangeService);
      setCandleService(exchangeService);
      fetchMetadata();
    }
  }, [service, setMetaService, setCandleService, fetchMetadata]);

  return <>{children}</>;
}
