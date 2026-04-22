'use client';

import { useState, useEffect } from 'react';
import { useCredentials } from '@/lib/context/credentials-context';

interface CredentialsSettingsProps {
  initialWalletAddress?: string | null;
}

type LastAction = {
  label: string;
  at: number;
};

const formatTimeAgo = (timestamp: number, now: number): string => {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export function CredentialsSettings({ initialWalletAddress }: CredentialsSettingsProps = {}) {
  const {
    credentials,
    saveCredentials,
    clearCredentials,
    clearHyperliquidCredentials,
    clearBinanceCredentials,
    updateNetwork,
    updateBinanceCredentials,
    hasHyperliquidCredentials,
    hasBinanceCredentials,
    migrationInfo,
  } = useCredentials();
  const [privateKey, setPrivateKey] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [binanceApiKey, setBinanceApiKey] = useState('');
  const [binanceApiSecret, setBinanceApiSecret] = useState('');
  const [isTestnet, setIsTestnet] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [hyperStatus, setHyperStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [binanceStatus, setBinanceStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [hyperErrorMessage, setHyperErrorMessage] = useState('');
  const [binanceErrorMessage, setBinanceErrorMessage] = useState('');
  const [walletAddressError, setWalletAddressError] = useState('');
  const [hyperInfoMessage, setHyperInfoMessage] = useState('');
  const [binanceInfoMessage, setBinanceInfoMessage] = useState('');
  const [hyperLastAction, setHyperLastAction] = useState<LastAction | null>(null);
  const [binanceLastAction, setBinanceLastAction] = useState<LastAction | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (credentials) {
      setPrivateKey(credentials.privateKey);
      setWalletAddress(credentials.walletAddress);
      setBinanceApiKey(credentials.binanceApiKey || '');
      setBinanceApiSecret(credentials.binanceApiSecret || '');
      setIsTestnet(credentials.isTestnet);
    } else if (initialWalletAddress) {
      setWalletAddress(initialWalletAddress);
    }
  }, [credentials, initialWalletAddress]);

  useEffect(() => {
    if (!migrationInfo?.migrated) {
      return;
    }

    if (migrationInfo.hyperliquidMigrated) {
      setHyperInfoMessage('Da migrate Hyperliquid credentials tu legacy key sang hyperliquid_credentials.');
      setHyperLastAction({ label: 'migrated', at: Date.now() });
    }

    if (migrationInfo.binanceMigrated) {
      setBinanceInfoMessage('Da migrate Binance credentials tu legacy key sang binance_credentials.');
      setBinanceLastAction({ label: 'migrated', at: Date.now() });
    }
  }, [migrationInfo]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const handleSaveHyperliquid = async () => {
    try {
      setHyperStatus('saving');
      setHyperErrorMessage('');

      if (!privateKey) {
        throw new Error('Private key is required');
      }

      if (!privateKey.startsWith('0x')) {
        throw new Error('Private key must start with 0x');
      }

      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }

      if (walletAddress.startsWith('0x') && walletAddress.length === 66) {
        throw new Error('Wallet address cannot be a private key. Please enter a valid wallet address.');
      }

      await saveCredentials(privateKey, walletAddress, isTestnet, undefined, {
        binanceApiKey,
        binanceApiSecret,
      });
      setHyperStatus('success');
      setHyperInfoMessage('Da luu Hyperliquid credentials vao localStorage key: hyperliquid_credentials.');
      setHyperLastAction({ label: 'saved', at: Date.now() });
      setTimeout(() => setHyperStatus('idle'), 2000);
    } catch (error) {
      setHyperStatus('error');
      setHyperErrorMessage(error instanceof Error ? error.message : 'Failed to save Hyperliquid credentials');
    }
  };

  const handleSaveBinance = async () => {
    try {
      setBinanceStatus('saving');
      setBinanceErrorMessage('');

      if (!binanceApiKey.trim() || !binanceApiSecret.trim()) {
        throw new Error('Binance API Key và API Secret là bắt buộc');
      }

      await updateBinanceCredentials(binanceApiKey.trim(), binanceApiSecret.trim());
      setBinanceStatus('success');
      setBinanceInfoMessage('Da luu Binance credentials vao localStorage key: binance_credentials.');
      setBinanceLastAction({ label: 'saved', at: Date.now() });
      setTimeout(() => setBinanceStatus('idle'), 2000);
    } catch (error) {
      setBinanceStatus('error');
      setBinanceErrorMessage(error instanceof Error ? error.message : 'Failed to save Binance credentials');
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear your credentials? This action cannot be undone.')) {
      clearCredentials();
      setPrivateKey('');
      setWalletAddress('');
      setBinanceApiKey('');
      setBinanceApiSecret('');
      setIsTestnet(false);
      setHyperStatus('idle');
      setBinanceStatus('idle');
      setHyperErrorMessage('');
      setBinanceErrorMessage('');
      setHyperInfoMessage('Da xoa Hyperliquid credentials (hyperliquid_credentials).');
      setBinanceInfoMessage('Da xoa Binance credentials (binance_credentials).');
      setHyperLastAction({ label: 'cleared', at: Date.now() });
      setBinanceLastAction({ label: 'cleared', at: Date.now() });
    }
  };

  const handleClearHyperliquid = async () => {
    if (!confirm('Clear only Hyperliquid credentials?')) {
      return;
    }

    await clearHyperliquidCredentials();
    setPrivateKey('');
    setWalletAddress('');
    setWalletAddressError('');
    setHyperStatus('idle');
    setHyperErrorMessage('');
    setHyperInfoMessage('Da xoa Hyperliquid credentials (hyperliquid_credentials).');
    setHyperLastAction({ label: 'cleared', at: Date.now() });
  };

  const handleClearBinance = async () => {
    if (!confirm('Clear only Binance credentials?')) {
      return;
    }

    await clearBinanceCredentials();
    setBinanceApiKey('');
    setBinanceApiSecret('');
    setBinanceStatus('idle');
    setBinanceErrorMessage('');
    setBinanceInfoMessage('Da xoa Binance credentials (binance_credentials).');
    setBinanceLastAction({ label: 'cleared', at: Date.now() });
  };

  const handleNetworkChange = async (testnet: boolean) => {
    setIsTestnet(testnet);
    if (credentials) {
      try {
        await updateNetwork(testnet);
        setHyperStatus('success');
        setHyperLastAction({ label: 'network updated', at: Date.now() });
        setTimeout(() => setHyperStatus('idle'), 2000);
      } catch (error) {
        setHyperStatus('error');
        setHyperErrorMessage('Failed to update network');
      }
    }
  };

  const handleWalletAddressChange = (value: string) => {
    setWalletAddressError('');

    if (value.startsWith('0x') && value.length === 66) {
      setWalletAddressError('⚠️ This looks like a private key! Do NOT enter your private key here. Use the Private Key field above.');
      return;
    }

    setWalletAddress(value);
  };


  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-lg">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Exchange Credentials</h2>
        <p className="text-sm text-gray-400">
          Credentials are encrypted and stored locally. Hyperliquid và Binance được tách riêng để tránh nhầm lẫn.
        </p>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-yellow-500 font-semibold mb-1">Security Warning</h3>
            <p className="text-sm text-gray-300">
              Your private key is stored encrypted in your browser. Never share your private key with anyone.
              This app runs entirely in your browser - we never transmit your keys to any server.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 border border-gray-700 rounded-lg p-4 bg-gray-800/40">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Hyperliquid Credentials</h3>
          {hyperLastAction && (
            <span className="text-xs px-2.5 py-1 rounded-full border border-blue-700/60 text-blue-300 bg-blue-900/20 whitespace-nowrap">
              {hyperLastAction.label} {formatTimeAgo(hyperLastAction.at, nowTs)}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400">Dành cho giao dịch Hyperliquid (Private Key + Wallet).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Network
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleNetworkChange(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !isTestnet
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Mainnet
            </button>
            <button
              type="button"
              onClick={() => handleNetworkChange(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isTestnet
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Testnet
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="privateKey" className="block text-sm font-medium text-gray-300 mb-2">
            Private Key
          </label>
          <div className="relative">
            <input
              id="privateKey"
              type={showKey ? 'text' : 'password'}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm pr-20"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-300 mb-2">
            Wallet Address
          </label>
          <input
            id="walletAddress"
            type="text"
            value={walletAddress}
            onChange={(e) => handleWalletAddressChange(e.target.value)}
            placeholder="0x..."
            className={`w-full px-4 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 font-mono text-sm ${
              walletAddressError
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-700 focus:ring-blue-500'
            }`}
          />
          {walletAddressError && (
            <div className="mt-2 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-sm text-red-400 font-medium">{walletAddressError}</p>
            </div>
          )}
        </div>

        {hyperErrorMessage && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
            <p className="text-sm text-red-400">{hyperErrorMessage}</p>
          </div>
        )}

        {hyperInfoMessage && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
            <p className="text-sm text-blue-300">{hyperInfoMessage}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSaveHyperliquid}
            disabled={hyperStatus === 'saving' || !privateKey || !walletAddress || !!walletAddressError}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            {hyperStatus === 'saving' ? 'Saving...' : hyperStatus === 'success' ? 'Saved!' : 'Save Hyperliquid'}
          </button>
          {hasHyperliquidCredentials && (
            <button
              onClick={handleClearHyperliquid}
              className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium transition-colors"
            >
              Clear Hyperliquid Only
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 border border-gray-700 rounded-lg p-4 bg-gray-800/40">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Binance Futures Credentials</h3>
          {binanceLastAction && (
            <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-700/60 text-emerald-300 bg-emerald-900/20 whitespace-nowrap">
              {binanceLastAction.label} {formatTimeAgo(binanceLastAction.at, nowTs)}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400">Dành cho Binance USDT-M Futures (API Key + Secret).</p>
        </div>

        {/* API Configuration Warning */}
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-yellow-300 mb-1">Cấu hình API Key đúng:</p>
              <ul className="text-[11px] text-yellow-200/90 space-y-0.5 list-disc list-inside">
                <li>API Key phải có quyền <strong>"Enable Futures"</strong></li>
                <li>Bật thêm <strong>"Enable Reading"</strong> và <strong>"Enable Spot & Margin Trading"</strong></li>
                <li>Nếu bật IP Whitelist → thêm IP hiện tại của bạn</li>
                <li>Không dùng API Key Spot cho Futures trading</li>
              </ul>
              <p className="text-[10px] text-yellow-400/70 mt-2">
                💡 Error -2015? Kiểm tra lại permissions trong Binance API Management
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="binanceApiKey" className="block text-sm font-medium text-gray-300 mb-2">
            Binance API Key (USDT-M Futures)
          </label>
          <input
            id="binanceApiKey"
            type="text"
            value={binanceApiKey}
            onChange={(e) => setBinanceApiKey(e.target.value)}
            placeholder="Binance API Key"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        <div>
          <label htmlFor="binanceApiSecret" className="block text-sm font-medium text-gray-300 mb-2">
            Binance API Secret (USDT-M Futures)
          </label>
          <input
            id="binanceApiSecret"
            type="password"
            value={binanceApiSecret}
            onChange={(e) => setBinanceApiSecret(e.target.value)}
            placeholder="Binance API Secret"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        {binanceErrorMessage && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
            <p className="text-sm text-red-400">{binanceErrorMessage}</p>
          </div>
        )}

        {binanceInfoMessage && (
          <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
            <p className="text-sm text-emerald-300">{binanceInfoMessage}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSaveBinance}
            disabled={binanceStatus === 'saving' || !binanceApiKey.trim() || !binanceApiSecret.trim()}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            {binanceStatus === 'saving' ? 'Saving...' : binanceStatus === 'success' ? 'Saved!' : 'Save Binance'}
          </button>
          {hasBinanceCredentials && (
            <button
              onClick={handleClearBinance}
              className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium transition-colors"
            >
              Clear Binance Only
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        {(hasHyperliquidCredentials || hasBinanceCredentials) && (
          <button
            onClick={handleClear}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Clear All Credentials
          </button>
        )}
      </div>

      {(hasHyperliquidCredentials || hasBinanceCredentials) && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
          <p className="text-sm text-green-400">
            ✓ Hyperliquid: {hasHyperliquidCredentials ? 'Configured' : 'Not configured'} ({credentials?.isTestnet ? 'Testnet' : 'Mainnet'})
          </p>
          <p className="text-sm text-green-400 mt-1">
            ✓ Binance: {hasBinanceCredentials ? 'Configured' : 'Not configured'}
          </p>
        </div>
      )}
    </div>
  );
}
