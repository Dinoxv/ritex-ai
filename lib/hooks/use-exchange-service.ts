import { useMemo } from 'react';
import { useCredentials } from '@/lib/context/credentials-context';
import { HyperliquidService } from '@/lib/services/hyperliquid.service';
import { BinanceService } from '@/lib/services/binance.service';
import type { ExchangeTradingService } from '@/lib/services/types';
import { useDexStore } from '@/stores/useDexStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBotTradingStore } from '@/stores/useBotTradingStore';
import { isBinanceRouteSlug } from '@/lib/constants/routing';

function isLikelyEvmAddress(value?: string): boolean {
  if (!value) {
    return false;
  }

  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function useExchangeService(walletAddress?: string): ExchangeTradingService | null {
  const { credentials, hasHyperliquidCredentials, hasBinanceCredentials } = useCredentials();
  const selectedExchange = useDexStore((state) => state.selectedExchange);
  const botExchange = useSettingsStore((state) => state.settings.bot.exchange);
  const botIsRunning = useBotTradingStore((state) => state.isRunning);
  const botKeepRunning = useBotTradingStore((state) => state.keepRunning);

  return useMemo(() => {
    const routeForcesBinance = isBinanceRouteSlug(walletAddress);
    const preferBotExchange = botIsRunning || botKeepRunning;
    const shouldUseBinance =
      routeForcesBinance ||
      (preferBotExchange ? botExchange === 'binance' : selectedExchange === 'binance') ||
      (!hasHyperliquidCredentials && hasBinanceCredentials);

    if (shouldUseBinance) {
      if (!hasBinanceCredentials) {
        return null;
      }

      return new BinanceService(
        credentials?.binanceApiKey || null,
        credentials?.binanceApiSecret || null,
        credentials?.isTestnet ?? false
      );
    }

    if (!hasHyperliquidCredentials) {
      return null;
    }

    const explicitAddress = routeForcesBinance ? undefined : walletAddress;
    const addressToUse = explicitAddress || credentials?.walletAddress;

    if (!credentials || !addressToUse || !isLikelyEvmAddress(addressToUse)) {
      return null;
    }

    const isOwnWallet = addressToUse.toLowerCase() === credentials.walletAddress.toLowerCase();

    return new HyperliquidService(
      isOwnWallet ? credentials.privateKey : null,
      addressToUse,
      credentials.isTestnet
    );
  }, [
    selectedExchange,
    botExchange,
    botIsRunning,
    botKeepRunning,
    hasHyperliquidCredentials,
    hasBinanceCredentials,
    credentials?.privateKey,
    credentials?.walletAddress,
    credentials?.isTestnet,
    credentials?.binanceApiKey,
    credentials?.binanceApiSecret,
    walletAddress,
  ]);
}