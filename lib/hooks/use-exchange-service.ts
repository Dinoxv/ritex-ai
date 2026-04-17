import { useMemo } from 'react';
import { useCredentials } from '@/lib/context/credentials-context';
import { HyperliquidService } from '@/lib/services/hyperliquid.service';
import { BinanceService } from '@/lib/services/binance.service';
import type { ExchangeTradingService } from '@/lib/services/types';
import { useDexStore } from '@/stores/useDexStore';

export function useExchangeService(walletAddress?: string): ExchangeTradingService | null {
  const { credentials } = useCredentials();
  const selectedExchange = useDexStore((state) => state.selectedExchange);

  return useMemo(() => {
    if (selectedExchange === 'binance') {
      const isTestnet = credentials?.isTestnet || false;
      return new BinanceService(credentials?.binanceApiKey || null, credentials?.binanceApiSecret || null, isTestnet);
    }

    if (!credentials && !walletAddress) {
      return null;
    }

    if (!credentials && walletAddress) {
      return new HyperliquidService(null, walletAddress, false);
    }

    const addressToUse = walletAddress || credentials!.walletAddress;
    const isOwnWallet = addressToUse.toLowerCase() === credentials!.walletAddress.toLowerCase();

    return new HyperliquidService(
      isOwnWallet ? credentials!.privateKey : null,
      addressToUse,
      credentials!.isTestnet
    );
  }, [
    selectedExchange,
    credentials?.privateKey,
    credentials?.walletAddress,
    credentials?.isTestnet,
    credentials?.binanceApiKey,
    credentials?.binanceApiSecret,
    walletAddress,
  ]);
}