export const LEGACY_STORAGE_KEY = 'hyperscalper_credentials';
export const HYPERLIQUID_STORAGE_KEY = 'hyperliquid_credentials';
export const BINANCE_STORAGE_KEY = 'binance_credentials';
export const DEVICE_KEY_STORAGE = 'hyperscalper_device_key';

export type CredentialStorageScope = 'all' | 'hyperliquid' | 'binance';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function clearStoredCredentials(storage: StorageLike, scope: CredentialStorageScope): void {
  if (scope === 'all' || scope === 'hyperliquid') {
    storage.removeItem(HYPERLIQUID_STORAGE_KEY);
  }

  if (scope === 'all' || scope === 'binance') {
    storage.removeItem(BINANCE_STORAGE_KEY);
  }

  if (scope === 'all') {
    storage.removeItem(LEGACY_STORAGE_KEY);
  }
}