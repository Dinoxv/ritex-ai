'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCredentials } from '@/lib/context/credentials-context';
import { useAddressFromUrl } from '@/lib/hooks/use-address-from-url';
import { useDexStore } from '@/stores/useDexStore';
import { CredentialsSettings } from '@/components/settings/CredentialsSettings';
import { BINANCE_ROUTE_SLUG, isBinanceRouteSlug } from '@/lib/constants/routing';

interface RequireCredentialsProps {
  children: ReactNode;
}

let credentialsGateStartAt: number | null = null;

export function RequireCredentials({ children }: RequireCredentialsProps) {
  const { hasHyperliquidCredentials, hasBinanceCredentials, isLoaded, credentials } = useCredentials();
  const selectedExchange = useDexStore((state) => state.selectedExchange);
  const setSelectedExchange = useDexStore((state) => state.setSelectedExchange);
  const addressFromUrl = useAddressFromUrl();
  const router = useRouter();
  const pathname = usePathname();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const requiresHyperliquid = selectedExchange === 'hyperliquid';
  const hasSelectedExchangeCredentials = requiresHyperliquid ? hasHyperliquidCredentials : hasBinanceCredentials;

  useEffect(() => {
    if (isLoaded) {
      credentialsGateStartAt = null;
      setLoadingTimedOut(false);
      return;
    }

    if (credentialsGateStartAt === null) {
      credentialsGateStartAt = Date.now();
    }

    const elapsed = Date.now() - credentialsGateStartAt;
    const timeoutMs = 5000;

    if (elapsed >= timeoutMs) {
      setLoadingTimedOut(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoadingTimedOut(true);
    }, timeoutMs - elapsed);

    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (pathname === '/') return;

    if (isBinanceRouteSlug(addressFromUrl) && selectedExchange !== 'binance') {
      setSelectedExchange('binance');
      return;
    }

    if (!hasHyperliquidCredentials && hasBinanceCredentials && selectedExchange !== 'binance') {
      setSelectedExchange('binance');
      return;
    }

    if (!hasSelectedExchangeCredentials && !addressFromUrl) {
      return;
    }

    if (requiresHyperliquid && hasHyperliquidCredentials && !addressFromUrl && credentials?.walletAddress) {
      router.replace(`/${credentials.walletAddress}/trades`);
      return;
    }

    if (!requiresHyperliquid && hasBinanceCredentials && !addressFromUrl) {
      router.replace(`/${BINANCE_ROUTE_SLUG}/trades`);
    }
  }, [isLoaded, hasSelectedExchangeCredentials, requiresHyperliquid, hasHyperliquidCredentials, hasBinanceCredentials, selectedExchange, setSelectedExchange, addressFromUrl, credentials?.walletAddress, router, pathname]);

  // Never block explicit address routes (e.g. chart-popup) behind credential bootstrap.
  // This avoids sticky loading screens on reload when local credential init is delayed.
  if (pathname === '/') {
    return <>{children}</>;
  }

  if (addressFromUrl) {
    return <>{children}</>;
  }

  if (!isLoaded && !loadingTimedOut) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading credentials...</p>
        </div>
      </div>
    );
  }

  if (!isLoaded && loadingTimedOut) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Credential Init Timeout</h1>
            <p className="text-gray-400">
              Credential loading took too long. You can continue by re-saving credentials below.
            </p>
          </div>
          <CredentialsSettings />
        </div>
      </div>
    );
  }

  if (!hasSelectedExchangeCredentials) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome to RITEX AI</h1>
            <p className="text-gray-400">
              Configure your {requiresHyperliquid ? 'Hyperliquid' : 'Binance'} credentials to get started
            </p>
          </div>
          <CredentialsSettings />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
