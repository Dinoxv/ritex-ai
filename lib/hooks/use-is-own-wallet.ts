'use client';

import { useCredentials } from '@/lib/context/credentials-context';
import { useAddressFromUrl } from './use-address-from-url';
import { isBinanceRouteSlug } from '@/lib/constants/routing';

export function useIsOwnWallet(): boolean {
  const { credentials, hasBinanceCredentials } = useCredentials();
  const addressFromUrl = useAddressFromUrl();

  if (!addressFromUrl) {
    return false;
  }

  if (isBinanceRouteSlug(addressFromUrl)) {
    return hasBinanceCredentials;
  }

  if (!credentials) {
    return false;
  }

  return credentials.walletAddress.toLowerCase() === addressFromUrl.toLowerCase();
}
