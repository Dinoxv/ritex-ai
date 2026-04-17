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

export function CredentialsProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [migrationInfo, setMigrationInfo] = useState<CredentialsMigrationInfo | null>(null);

  useEffect(() => {
    loadCredentials().catch(() => {
      setIsLoaded(true);
    });
    // Safety timeout: if credentials loading hangs, force loaded state
    const timeout = setTimeout(() => {
      setIsLoaded(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const getDeviceKey = (): string => {
    let deviceKey = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (!deviceKey) {
      deviceKey = generateDeviceKey();
      localStorage.setItem(DEVICE_KEY_STORAGE, deviceKey);
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
    localStorage.setItem(key, JSON.stringify(encrypted));
  };

  const loadEncryptedSection = async <T,>(key: string, password?: string): Promise<T | null> => {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return null;
    }

    const encryptionKey = password || getDeviceKey();
    const encrypted = JSON.parse(stored);
    const decrypted = await decryptData(encrypted, encryptionKey);
    return JSON.parse(decrypted) as T;
  };

  const setCredentialsFromParts = (
    hyperliquid: Partial<HyperliquidCredentials> | null,
    binance: Partial<BinanceCredentials> | null
  ): void => {
    setCredentials(buildMergedCredentials(hyperliquid, binance));
  };

  const migrateLegacyCredentials = async (password?: string): Promise<Credentials | null> => {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    try {
      const encryptionKey = password || getDeviceKey();
      const encrypted = JSON.parse(stored);
      const decrypted = await decryptData(encrypted, encryptionKey);
      const raw = JSON.parse(decrypted) as Partial<Credentials>;

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

      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const merged = buildMergedCredentials(hyperliquid, binance);
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

  const loadCredentials = async (password?: string): Promise<boolean> => {
    try {
      const hyperliquid = await loadEncryptedSection<HyperliquidCredentials>(HYPERLIQUID_STORAGE_KEY, password);
      const binance = await loadEncryptedSection<BinanceCredentials>(BINANCE_STORAGE_KEY, password);

      let merged = buildMergedCredentials(hyperliquid, binance);

      if (!merged) {
        merged = await migrateLegacyCredentials(password);
      } else {
        setCredentials(merged);
      }

      setIsLoaded(true);
      return Boolean(merged);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      setIsLoaded(true);
      return false;
    }
  };

  const clearCredentials = (): void => {
    clearStoredCredentials(localStorage, 'all');
    setCredentials(null);
  };

  const clearHyperliquidCredentials = async (): Promise<void> => {
    clearStoredCredentials(localStorage, 'hyperliquid');
    const binance = await loadEncryptedSection<BinanceCredentials>(BINANCE_STORAGE_KEY).catch(() => null);
    setCredentialsFromParts(null, binance);
  };

  const clearBinanceCredentials = async (): Promise<void> => {
    clearStoredCredentials(localStorage, 'binance');
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
