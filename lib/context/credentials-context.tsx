'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { encryptData, decryptData, generateDeviceKey } from '@/lib/utils/crypto';
import {
  BINANCE_STORAGE_KEY,
  DEVICE_KEY_STORAGE,
  HYPERLIQUID_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  clearStoredCredentials,
} from '@/lib/context/credentials-storage';

interface HyperliquidCredentials {
  privateKey: string;
  walletAddress: string;
  isTestnet: boolean;
}

interface BinanceCredentials {
  binanceApiKey?: string;
  binanceApiSecret?: string;
}

interface Credentials {
  privateKey: string;
  walletAddress: string;
  isTestnet: boolean;
  binanceApiKey?: string;
  binanceApiSecret?: string;
}

interface CredentialsMigrationInfo {
  migrated: boolean;
  hyperliquidMigrated: boolean;
  binanceMigrated: boolean;
}

interface CredentialsContextType {
  credentials: Credentials | null;
  isLoaded: boolean;
  hasCredentials: boolean;
  hasHyperliquidCredentials: boolean;
  hasBinanceCredentials: boolean;
  migrationInfo: CredentialsMigrationInfo | null;
  updateHyperliquidCredentials: (
    privateKey: string,
    walletAddress: string,
    isTestnet: boolean,
    password?: string
  ) => Promise<void>;
  saveCredentials: (
    privateKey: string,
    walletAddress: string,
    isTestnet: boolean,
    password?: string,
    extras?: { binanceApiKey?: string; binanceApiSecret?: string }
  ) => Promise<void>;
  loadCredentials: (password?: string) => Promise<boolean>;
  clearCredentials: () => void;
  clearHyperliquidCredentials: () => Promise<void>;
  clearBinanceCredentials: () => Promise<void>;
  updateNetwork: (isTestnet: boolean) => Promise<void>;
  updateBinanceCredentials: (apiKey: string, apiSecret: string, password?: string) => Promise<void>;
}

const CredentialsContext = createContext<CredentialsContextType | undefined>(undefined);

// Keep bootstrap state outside React to avoid infinite loading if provider remounts.
let credentialsBootstrapComplete = false;
let credentialsBootstrapCache: Credentials | null = null;

function safeGetStorageItem(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorageItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveStorageItem(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
  }
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function CredentialsProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<Credentials | null>(credentialsBootstrapCache);
  const [isLoaded, setIsLoaded] = useState(credentialsBootstrapComplete);
  const [migrationInfo, setMigrationInfo] = useState<CredentialsMigrationInfo | null>(null);

  useEffect(() => {
    if (credentialsBootstrapComplete) {
      setIsLoaded(true);
      if (credentialsBootstrapCache !== null) {
        setCredentials(credentialsBootstrapCache);
      }
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      const timeoutMs = 4000;

      await Promise.race([
        loadCredentials().catch(() => false),
        new Promise<boolean>((resolve) => {
          window.setTimeout(() => resolve(false), timeoutMs);
        }),
      ]);

      if (cancelled) {
        return;
      }

      credentialsBootstrapComplete = true;
      setIsLoaded(true);
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const getDeviceKey = (): string => {
    let deviceKey = safeGetStorageItem(DEVICE_KEY_STORAGE);
    if (!deviceKey) {
      deviceKey = generateDeviceKey();
      safeSetStorageItem(DEVICE_KEY_STORAGE, deviceKey);
    }
    return deviceKey;
  };

  const buildMergedCredentials = (
    hyperliquid: Partial<HyperliquidCredentials> | null,
    binance: Partial<BinanceCredentials> | null
  ): Credentials | null => {
    const merged: Credentials = {
      privateKey: hyperliquid?.privateKey || '',
      walletAddress: hyperliquid?.walletAddress || '',
      isTestnet: Boolean(hyperliquid?.isTestnet),
      binanceApiKey: binance?.binanceApiKey || '',
      binanceApiSecret: binance?.binanceApiSecret || '',
    };

    const hasHyper = Boolean(merged.privateKey && merged.walletAddress);
    const hasBinance = Boolean(merged.binanceApiKey && merged.binanceApiSecret);

    return hasHyper || hasBinance ? merged : null;
  };

  const saveEncryptedSection = async (key: string, value: object, password?: string): Promise<void> => {
    const encryptionKey = password || getDeviceKey();
    const encrypted = await encryptData(JSON.stringify(value), encryptionKey);
    if (!safeSetStorageItem(key, JSON.stringify(encrypted))) {
      throw new Error(`Unable to persist credentials for ${key}`);
    }
  };

  const loadEncryptedSection = async <T,>(key: string, password?: string): Promise<T | null> => {
    const stored = safeGetStorageItem(key);
    if (!stored) {
      return null;
    }

    const encryptionKey = password || getDeviceKey();
    const encrypted = safeParseJson<Parameters<typeof decryptData>[0]>(stored);
    if (!encrypted) {
      safeRemoveStorageItem(key);
      return null;
    }
    const decrypted = await decryptData(encrypted, encryptionKey);
    const parsed = safeParseJson<T>(decrypted);
    if (!parsed) {
      safeRemoveStorageItem(key);
      return null;
    }

    return parsed;
  };

  const setCredentialsFromParts = (
    hyperliquid: Partial<HyperliquidCredentials> | null,
    binance: Partial<BinanceCredentials> | null
  ): void => {
    const merged = buildMergedCredentials(hyperliquid, binance);
    credentialsBootstrapCache = merged;
    setCredentials(merged);
  };

  const migrateLegacyCredentials = async (password?: string): Promise<Credentials | null> => {
    const stored = safeGetStorageItem(LEGACY_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    try {
      const encryptionKey = password || getDeviceKey();
      const encrypted = safeParseJson<Parameters<typeof decryptData>[0]>(stored);
      if (!encrypted) {
        safeRemoveStorageItem(LEGACY_STORAGE_KEY);
        return null;
      }
      const decrypted = await decryptData(encrypted, encryptionKey);
      const raw = safeParseJson<Partial<Credentials>>(decrypted);
      if (!raw) {
        safeRemoveStorageItem(LEGACY_STORAGE_KEY);
        return null;
      }

      const hyperliquid: HyperliquidCredentials = {
        privateKey: raw.privateKey || '',
        walletAddress: raw.walletAddress || '',
        isTestnet: Boolean(raw.isTestnet),
      };

      const binance: BinanceCredentials = {
        binanceApiKey: raw.binanceApiKey || '',
        binanceApiSecret: raw.binanceApiSecret || '',
      };

      const hyperliquidMigrated = Boolean(hyperliquid.privateKey || hyperliquid.walletAddress);
      const binanceMigrated = Boolean(binance.binanceApiKey || binance.binanceApiSecret);

      if (hyperliquidMigrated) {
        await saveEncryptedSection(HYPERLIQUID_STORAGE_KEY, hyperliquid, password);
      }

      if (binanceMigrated) {
        await saveEncryptedSection(BINANCE_STORAGE_KEY, binance, password);
      }

      setMigrationInfo({
        migrated: hyperliquidMigrated || binanceMigrated,
        hyperliquidMigrated,
        binanceMigrated,
      });

      safeRemoveStorageItem(LEGACY_STORAGE_KEY);
      const merged = buildMergedCredentials(hyperliquid, binance);
      credentialsBootstrapCache = merged;
      setCredentials(merged);
      return merged;
    } catch (error) {
      console.error('Failed to migrate legacy credentials:', error);
      return null;
    }
  };

  const saveCredentials = async (
    privateKey: string,
    walletAddress: string,
    isTestnet: boolean,
    password?: string,
    extras?: { binanceApiKey?: string; binanceApiSecret?: string }
  ): Promise<void> => {
    const hyperliquidData: HyperliquidCredentials = {
      privateKey,
      walletAddress,
      isTestnet,
    };

    const binanceData: BinanceCredentials = {
      binanceApiKey: extras?.binanceApiKey ?? credentials?.binanceApiKey ?? '',
      binanceApiSecret: extras?.binanceApiSecret ?? credentials?.binanceApiSecret ?? '',
    };

    await saveEncryptedSection(HYPERLIQUID_STORAGE_KEY, hyperliquidData, password);

    if (binanceData.binanceApiKey || binanceData.binanceApiSecret) {
      await saveEncryptedSection(BINANCE_STORAGE_KEY, binanceData, password);
    }

    setCredentialsFromParts(hyperliquidData, binanceData);
  };

  const updateHyperliquidCredentials = async (
    privateKey: string,
    walletAddress: string,
    isTestnet: boolean,
    password?: string
  ): Promise<void> => {
    const hyperliquidData: HyperliquidCredentials = {
      privateKey,
      walletAddress,
      isTestnet,
    };

    await saveEncryptedSection(HYPERLIQUID_STORAGE_KEY, hyperliquidData, password);

    const binanceData: BinanceCredentials | null = credentials
      ? {
          binanceApiKey: credentials.binanceApiKey || '',
          binanceApiSecret: credentials.binanceApiSecret || '',
        }
      : await loadEncryptedSection<BinanceCredentials>(BINANCE_STORAGE_KEY, password).catch(() => null);

    setCredentialsFromParts(hyperliquidData, binanceData);
  };

  const loadCredentials = async (password?: string): Promise<boolean> => {
    try {
      const hyperliquid = await loadEncryptedSection<HyperliquidCredentials>(HYPERLIQUID_STORAGE_KEY, password);
      const binance = await loadEncryptedSection<BinanceCredentials>(BINANCE_STORAGE_KEY, password);

      let merged = buildMergedCredentials(hyperliquid, binance);

      if (!merged) {
        merged = await migrateLegacyCredentials(password);
      } else {
        credentialsBootstrapCache = merged;
        setCredentials(merged);
      }

      credentialsBootstrapComplete = true;
      setIsLoaded(true);
      return Boolean(merged);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      credentialsBootstrapComplete = true;
      setIsLoaded(true);
      return false;
    }
  };

  const clearCredentials = (): void => {
    if (typeof window !== 'undefined') {
      clearStoredCredentials(window.localStorage, 'all');
    }
    credentialsBootstrapCache = null;
    setCredentials(null);
  };

  const clearHyperliquidCredentials = async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      clearStoredCredentials(window.localStorage, 'hyperliquid');
    }
    const binance = await loadEncryptedSection<BinanceCredentials>(BINANCE_STORAGE_KEY).catch(() => null);
    setCredentialsFromParts(null, binance);
  };

  const clearBinanceCredentials = async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      clearStoredCredentials(window.localStorage, 'binance');
    }
    const hyperliquid = await loadEncryptedSection<HyperliquidCredentials>(HYPERLIQUID_STORAGE_KEY).catch(() => null);
    setCredentialsFromParts(hyperliquid, null);
  };

  const updateNetwork = async (isTestnet: boolean): Promise<void> => {
    if (!credentials) {
      throw new Error('No credentials to update');
    }

    await saveCredentials(
      credentials.privateKey,
      credentials.walletAddress,
      isTestnet,
      undefined,
      {
        binanceApiKey: credentials.binanceApiKey || '',
        binanceApiSecret: credentials.binanceApiSecret || '',
      }
    );
  };

  const updateBinanceCredentials = async (apiKey: string, apiSecret: string, password?: string): Promise<void> => {
    const binanceData: BinanceCredentials = {
      binanceApiKey: apiKey,
      binanceApiSecret: apiSecret,
    };

    await saveEncryptedSection(BINANCE_STORAGE_KEY, binanceData, password);

    const hyperliquidData: HyperliquidCredentials | null = credentials
      ? {
          privateKey: credentials.privateKey,
          walletAddress: credentials.walletAddress,
          isTestnet: credentials.isTestnet,
        }
      : await loadEncryptedSection<HyperliquidCredentials>(HYPERLIQUID_STORAGE_KEY, password).catch(() => null);

    setCredentialsFromParts(hyperliquidData, binanceData);
  };

  const hasHyperliquidCredentials = Boolean(credentials?.privateKey && credentials?.walletAddress);
  const hasBinanceCredentials = Boolean(credentials?.binanceApiKey && credentials?.binanceApiSecret);
  const hasCredentials = hasHyperliquidCredentials || hasBinanceCredentials;

  return (
    <CredentialsContext.Provider
      value={{
        credentials,
        isLoaded,
        hasCredentials,
        hasHyperliquidCredentials,
        hasBinanceCredentials,
        migrationInfo,
        updateHyperliquidCredentials,
        saveCredentials,
        loadCredentials,
        clearCredentials,
        clearHyperliquidCredentials,
        clearBinanceCredentials,
        updateNetwork,
        updateBinanceCredentials,
      }}
    >
      {children}
    </CredentialsContext.Provider>
  );
}

export function useCredentials(): CredentialsContextType {
  const context = useContext(CredentialsContext);
  if (!context) {
    throw new Error('useCredentials must be used within CredentialsProvider');
  }
  return context;
}
