'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { EmaConfig, ThemeName, ScannerSettings, OrderSettings } from '@/models/Settings';
import { useDexStore } from '@/stores/useDexStore';
import { CredentialsSettings } from '@/components/settings/CredentialsSettings';
import { LanguageSwitcher } from '@/components/settings/LanguageSwitcher';
import { useLanguageStore } from '@/stores/useLanguageStore';

export default function SettingsPanel() {
  const { isPanelOpen, activeTab, closePanel, setActiveTab, settings, updateStochasticSettings, updateEmaSettings, updateMacdSettings, updateKalmanTrendSettings, updateSieuXuHuongSettings, updateScannerSettings, updateOrderSettings, updateThemeSettings, updateAISettings } = useSettingsStore();
  const { t } = useLanguageStore();
  const selectedExchange = useDexStore((state) => state.selectedExchange);
  const [isStochasticExpanded, setIsStochasticExpanded] = useState(false);
  const [isEmaExpanded, setIsEmaExpanded] = useState(false);
  const [isMacdExpanded, setIsMacdExpanded] = useState(false);
  const [isKalmanExpanded, setIsKalmanExpanded] = useState(false);
  const [isRitchiExpanded, setIsRitchiExpanded] = useState(false);
  const [isScannerStochExpanded, setIsScannerStochExpanded] = useState(false);
  const [isScannerEmaExpanded, setIsScannerEmaExpanded] = useState(false);
  const [isScannerDivExpanded, setIsScannerDivExpanded] = useState(false);
  const [isScannerMacdExpanded, setIsScannerMacdExpanded] = useState(false);
  const [isScannerRsiExpanded, setIsScannerRsiExpanded] = useState(false);
  const [isScannerVolumeExpanded, setIsScannerVolumeExpanded] = useState(false);
  const [isScannerSRExpanded, setIsScannerSRExpanded] = useState(false);

  const clampScannerNumber = useCallback((value: number, min: number, max: number, fallback: number) => {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, value));
  }, []);

  const scannerTelegramByExchange = settings.scanner.telegramByExchange ?? {
    hyperliquid: {
      enabled: settings.scanner.telegramEnabled || false,
      botToken: settings.scanner.telegramBotToken || '',
      chatId: settings.scanner.telegramChatId || '',
      signalFilter: settings.scanner.telegramSignalFilter || 'all',
      showTpSl: settings.scanner.telegramShowTpSl || false,
    },
    binance: {
      enabled: false,
      botToken: '',
      chatId: '',
      signalFilter: 'all',
      showTpSl: false,
    },
  };

  const scannerRuntimeByExchange = settings.scanner.runtimeByExchange ?? {
    hyperliquid: {
      enabled: settings.scanner.enabled,
      scanInterval: settings.scanner.scanInterval,
      topMarkets: settings.scanner.topMarkets,
      playSound: settings.scanner.playSound,
    },
    binance: {
      enabled: settings.scanner.enabled,
      scanInterval: settings.scanner.scanInterval,
      topMarkets: settings.scanner.topMarkets,
      playSound: settings.scanner.playSound,
    },
  };

  const activeScannerRuntime = scannerRuntimeByExchange[selectedExchange];

  const orderSettingsByExchange = settings.orders.byExchange ?? {
    hyperliquid: {
      cloudPercentage: settings.orders.cloudPercentage,
      smallPercentage: settings.orders.smallPercentage,
      bigPercentage: settings.orders.bigPercentage,
      leverage: settings.orders.leverage,
    },
    binance: {
      cloudPercentage: settings.orders.cloudPercentage,
      smallPercentage: settings.orders.smallPercentage,
      bigPercentage: settings.orders.bigPercentage,
      leverage: settings.orders.leverage,
    },
  };

  const activeOrderSettings = orderSettingsByExchange[selectedExchange];

  const updateOrderSettingsExchange = useCallback((
    exchange: 'hyperliquid' | 'binance',
    updates: Partial<OrderSettings['byExchange']['hyperliquid']>
  ) => {
    updateOrderSettings({
      byExchange: {
        ...orderSettingsByExchange,
        [exchange]: {
          ...orderSettingsByExchange[exchange],
          ...updates,
        },
      },
    });
  }, [orderSettingsByExchange, updateOrderSettings]);

  const aiTelegramByExchange = settings.ai.telegramByExchange ?? {
    hyperliquid: {
      enabled: settings.ai.telegramEnabled,
      botToken: settings.ai.telegramBotToken,
      chatId: settings.ai.telegramChatId,
    },
    binance: {
      enabled: settings.ai.telegramEnabled,
      botToken: settings.ai.telegramBotToken,
      chatId: settings.ai.telegramChatId,
    },
  };

  const activeAiTelegramSettings = aiTelegramByExchange[selectedExchange];

  const updateAiTelegramExchange = useCallback((
    exchange: 'hyperliquid' | 'binance',
    updates: Partial<{ enabled: boolean; botToken: string; chatId: string }>
  ) => {
    updateAISettings({
      telegramByExchange: {
        ...aiTelegramByExchange,
        [exchange]: {
          ...aiTelegramByExchange[exchange],
          ...updates,
        },
      },
    });
  }, [aiTelegramByExchange, updateAISettings]);

  const updateScannerRuntimeExchange = useCallback((
    exchange: 'hyperliquid' | 'binance',
    updates: Partial<ScannerSettings['runtimeByExchange']['hyperliquid']>
  ) => {
    updateScannerSettings({
      runtimeByExchange: {
        ...scannerRuntimeByExchange,
        [exchange]: {
          ...scannerRuntimeByExchange[exchange],
          ...updates,
        },
      },
    });
  }, [scannerRuntimeByExchange, updateScannerSettings]);

  const updateScannerTelegramExchange = useCallback((
    exchange: 'hyperliquid' | 'binance',
    updates: Partial<ScannerSettings['telegramByExchange']['hyperliquid']>
  ) => {
    updateScannerSettings({
      telegramByExchange: {
        ...scannerTelegramByExchange,
        [exchange]: {
          ...scannerTelegramByExchange[exchange],
          ...updates,
        },
      },
    });
  }, [scannerTelegramByExchange, updateScannerSettings]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closePanel();
    }
  }, [closePanel]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPanelOpen) {
        closePanel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPanelOpen, closePanel]);

  if (!isPanelOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-start justify-center md:justify-end p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>

      <div className="terminal-border bg-bg-primary w-full md:w-[600px] h-[100dvh] md:h-[calc(100dvh-2rem)] md:max-h-[900px] flex flex-col animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-frame flex justify-between items-center bg-bg-primary relative z-20">
          <div className="flex items-center gap-2">
            <span className="text-primary text-2xl">⚙</span>
            <h2 className="text-primary text-sm font-bold uppercase tracking-wider">{t.settings.title}</h2>
          </div>
          <button
            onClick={closePanel}
            className="text-primary-muted hover:text-primary active:scale-90 transition-all text-2xl leading-none"
            title={t.settings.title}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-frame bg-bg-secondary overflow-x-auto md:overflow-x-hidden relative z-10 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent min-h-[48px]">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-mono uppercase tracking-wider leading-none transition-all whitespace-nowrap flex items-center justify-center ${
              activeTab === 'scanner'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-primary-muted hover:text-primary hover:bg-primary/5'
            }`}
          >
            {t.settings.scannerTab}
          </button>
          <button
            onClick={() => setActiveTab('indicators')}
            className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-mono uppercase tracking-wider leading-none transition-all whitespace-nowrap flex items-center justify-center ${
              activeTab === 'indicators'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-primary-muted hover:text-primary hover:bg-primary/5'
            }`}
          >
            {t.settings.indicatorsTab}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-mono uppercase tracking-wider leading-none transition-all whitespace-nowrap flex items-center justify-center ${
              activeTab === 'orders'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-primary-muted hover:text-primary hover:bg-primary/5'
            }`}
          >
            {t.settings.ordersTab}
          </button>
          <button
            onClick={() => setActiveTab('ui')}
            className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-mono uppercase tracking-wider leading-none transition-all whitespace-nowrap flex items-center justify-center ${
              activeTab === 'ui'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-primary-muted hover:text-primary hover:bg-primary/5'
            }`}
          >
            {t.settings.uiTab}
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-mono uppercase tracking-wider leading-none transition-all whitespace-nowrap flex items-center justify-center ${
              activeTab === 'credentials'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-primary-muted hover:text-primary hover:bg-primary/5'
            }`}
          >
            {t.settings.credentialsTab}
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-mono uppercase tracking-wider leading-none transition-all whitespace-nowrap flex items-center justify-center ${
              activeTab === 'ai'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-primary-muted hover:text-primary hover:bg-primary/5'
            }`}
          >
            {t.settings.aiTab}
          </button>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-6 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'max(6rem, env(safe-area-inset-bottom, 96px))' }}
        >
          {activeTab === 'scanner' && (
            <div className="space-y-4 pb-8">
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-primary-muted text-xs font-mono">{t.settings.enableScanner}</span>
                  <input
                    type="checkbox"
                    checked={activeScannerRuntime.enabled}
                    onChange={(e) => updateScannerRuntimeExchange(selectedExchange, { enabled: e.target.checked })}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                </label>
              </div>

              {activeScannerRuntime.enabled && (
                <>
                  <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                    <div>
                      <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.scanInterval} - {selectedExchange.toUpperCase()}</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={activeScannerRuntime.scanInterval}
                        onChange={(e) => updateScannerRuntimeExchange(selectedExchange, {
                          scanInterval: clampScannerNumber(Number(e.target.value), 1, 60, 5)
                        })}
                        className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.topMarkets} - {selectedExchange.toUpperCase()}</label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={activeScannerRuntime.topMarkets}
                        onChange={(e) => updateScannerRuntimeExchange(selectedExchange, {
                          topMarkets: clampScannerNumber(Number(e.target.value), 5, 500, 50)
                        })}
                        className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.candleCacheDuration}</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.scanner.candleCacheDuration}
                        onChange={(e) => updateScannerSettings({
                          candleCacheDuration: clampScannerNumber(Number(e.target.value), 1, 10, 5)
                        })}
                        className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.mediumDurationWarning}</label>
                      <input
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.1"
                        value={settings.scanner.mediumDurationWarningSec}
                        onChange={(e) => updateScannerSettings({
                          mediumDurationWarningSec: clampScannerNumber(Number(e.target.value), 0.5, 10, 1.5)
                        })}
                        className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.highDurationWarning}</label>
                      <input
                        type="number"
                        min="0.5"
                        max="15"
                        step="0.1"
                        value={settings.scanner.highDurationWarningSec}
                        onChange={(e) => {
                          const highValue = clampScannerNumber(Number(e.target.value), 0.5, 15, 2.5);
                          const mediumValue = settings.scanner.mediumDurationWarningSec;
                          updateScannerSettings({
                            highDurationWarningSec: highValue,
                            mediumDurationWarningSec: Math.min(mediumValue, highValue),
                          });
                        }}
                        className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-primary-muted text-xs font-mono">{t.settings.playSoundOnResults} - {selectedExchange.toUpperCase()}</span>
                        <input
                          type="checkbox"
                          checked={activeScannerRuntime.playSound}
                          onChange={(e) => updateScannerRuntimeExchange(selectedExchange, { playSound: e.target.checked })}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Scanner Telegram Alerts */}
                  <div className="border border-frame rounded overflow-hidden">
                    <div className="p-3 bg-bg-secondary">
                      <div className="text-primary text-xs font-mono mb-3 uppercase tracking-wider">📲 {t.settings.scannerTelegramAlerts}</div>

                      <div className="space-y-4">
                        <div className="border border-frame rounded p-3 bg-bg-primary/40">
                          <div className="text-primary text-xs font-mono mb-2">{t.settings.exchangeHyperliquid}</div>

                          <label className="flex items-center justify-between cursor-pointer mb-3">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableExchangeAlerts} {t.settings.exchangeHyperliquid}</span>
                            <input
                              type="checkbox"
                              checked={scannerTelegramByExchange.hyperliquid.enabled}
                              onChange={(e) => updateScannerTelegramExchange('hyperliquid', { enabled: e.target.checked })}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>

                          {scannerTelegramByExchange.hyperliquid.enabled && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-primary-muted text-xs font-mono mb-1">{t.settings.botToken}</label>
                                <input
                                  type="password"
                                  value={scannerTelegramByExchange.hyperliquid.botToken}
                                  onChange={(e) => updateScannerTelegramExchange('hyperliquid', { botToken: e.target.value })}
                                  placeholder="123456:ABC-..."
                                  className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary placeholder:text-primary-muted/40 focus:outline-none focus:border-primary"
                                />
                              </div>

                              <div>
                                <label className="block text-primary-muted text-xs font-mono mb-1">{t.settings.chatId}</label>
                                <input
                                  type="text"
                                  value={scannerTelegramByExchange.hyperliquid.chatId}
                                  onChange={(e) => updateScannerTelegramExchange('hyperliquid', { chatId: e.target.value })}
                                  placeholder="-100..."
                                  className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary placeholder:text-primary-muted/40 focus:outline-none focus:border-primary"
                                />
                              </div>

                              <div>
                                <label className="block text-primary-muted text-xs font-mono mb-1">{t.settings.signalFilter}</label>
                                <select
                                  value={scannerTelegramByExchange.hyperliquid.signalFilter}
                                  onChange={(e) => updateScannerTelegramExchange('hyperliquid', { signalFilter: e.target.value as 'all' | 'bullish' | 'bearish' })}
                                  className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-primary"
                                >
                                  <option value="all">{t.settings.allSignals}</option>
                                  <option value="bullish">{t.settings.bullishOnly}</option>
                                  <option value="bearish">{t.settings.bearishOnly}</option>
                                </select>
                              </div>

                              <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-primary-muted text-xs font-mono">{t.settings.showTpSlInMessage}</span>
                                <input
                                  type="checkbox"
                                  checked={scannerTelegramByExchange.hyperliquid.showTpSl}
                                  onChange={(e) => updateScannerTelegramExchange('hyperliquid', { showTpSl: e.target.checked })}
                                  className="w-4 h-4 accent-primary cursor-pointer"
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        <div className="border border-frame rounded p-3 bg-bg-primary/40">
                          <div className="text-primary text-xs font-mono mb-2">{t.settings.exchangeBinance}</div>

                          <label className="flex items-center justify-between cursor-pointer mb-3">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableExchangeAlerts} {t.settings.exchangeBinance}</span>
                            <input
                              type="checkbox"
                              checked={scannerTelegramByExchange.binance.enabled}
                              onChange={(e) => updateScannerTelegramExchange('binance', { enabled: e.target.checked })}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>

                          {scannerTelegramByExchange.binance.enabled && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-primary-muted text-xs font-mono mb-1">{t.settings.botToken}</label>
                                <input
                                  type="password"
                                  value={scannerTelegramByExchange.binance.botToken}
                                  onChange={(e) => updateScannerTelegramExchange('binance', { botToken: e.target.value })}
                                  placeholder="123456:ABC-..."
                                  className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary placeholder:text-primary-muted/40 focus:outline-none focus:border-primary"
                                />
                              </div>

                              <div>
                                <label className="block text-primary-muted text-xs font-mono mb-1">{t.settings.chatId}</label>
                                <input
                                  type="text"
                                  value={scannerTelegramByExchange.binance.chatId}
                                  onChange={(e) => updateScannerTelegramExchange('binance', { chatId: e.target.value })}
                                  placeholder="-100..."
                                  className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary placeholder:text-primary-muted/40 focus:outline-none focus:border-primary"
                                />
                              </div>

                              <div>
                                <label className="block text-primary-muted text-xs font-mono mb-1">{t.settings.signalFilter}</label>
                                <select
                                  value={scannerTelegramByExchange.binance.signalFilter}
                                  onChange={(e) => updateScannerTelegramExchange('binance', { signalFilter: e.target.value as 'all' | 'bullish' | 'bearish' })}
                                  className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-primary"
                                >
                                  <option value="all">{t.settings.allSignals}</option>
                                  <option value="bullish">{t.settings.bullishOnly}</option>
                                  <option value="bearish">{t.settings.bearishOnly}</option>
                                </select>
                              </div>

                              <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-primary-muted text-xs font-mono">{t.settings.showTpSlInMessage}</span>
                                <input
                                  type="checkbox"
                                  checked={scannerTelegramByExchange.binance.showTpSl}
                                  onChange={(e) => updateScannerTelegramExchange('binance', { showTpSl: e.target.checked })}
                                  className="w-4 h-4 accent-primary cursor-pointer"
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        <div className="text-primary-muted font-mono text-[10px]">
                          {t.settings.scannerTelegramNote}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-frame rounded overflow-hidden">
                    <button
                      onClick={() => setIsScannerStochExpanded(!isScannerStochExpanded)}
                      className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.stochasticScanner}</span>
                      </div>
                      <span className="text-primary text-base">{isScannerStochExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isScannerStochExpanded && (
                      <div className="p-4 space-y-4 bg-bg-primary">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableStochastic}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.stochasticScanner.enabled}
                              onChange={(e) =>
                                updateScannerSettings({
                                  stochasticScanner: {
                                    ...settings.scanner.stochasticScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.stochasticScanner.enabled && (
                          <div className="p-3 bg-bg-secondary border border-frame rounded">
                            <div className="text-primary font-mono text-xs font-bold mb-3">{t.settings.thresholds}</div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="text-primary-muted font-mono block mb-1">OVERSOLD</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  value={settings.scanner.stochasticScanner.oversoldThreshold}
                                  onChange={(e) =>
                                    updateScannerSettings({
                                      stochasticScanner: {
                                        ...settings.scanner.stochasticScanner,
                                        oversoldThreshold: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-primary-muted font-mono block mb-1">OVERBOUGHT</label>
                                <input
                                  type="number"
                                  min="50"
                                  max="100"
                                  value={settings.scanner.stochasticScanner.overboughtThreshold}
                                  onChange={(e) =>
                                    updateScannerSettings({
                                      stochasticScanner: {
                                        ...settings.scanner.stochasticScanner,
                                        overboughtThreshold: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                />
                              </div>
                            </div>
                            <div className="mt-3 text-primary-muted font-mono text-[10px]">
                              {t.settings.stochasticNote}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border border-frame rounded overflow-hidden">
                    <button
                      onClick={() => setIsScannerEmaExpanded(!isScannerEmaExpanded)}
                      className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.emaAlignmentScanner}</span>
                      </div>
                      <span className="text-primary text-base">{isScannerEmaExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isScannerEmaExpanded && (
                      <div className="p-4 space-y-4 bg-bg-primary">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableEmaAlignment}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.emaAlignmentScanner.enabled}
                              onChange={(e) =>
                                updateScannerSettings({
                                  emaAlignmentScanner: {
                                    ...settings.scanner.emaAlignmentScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.emaAlignmentScanner.enabled && (
                          <>
                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary-muted text-xs font-mono mb-2">
                                {t.settings.usesChartEmaSettings} (EMA1: {settings.indicators.ema.ema1.period}, EMA2: {settings.indicators.ema.ema2.period}, EMA3: {settings.indicators.ema.ema3.period})
                              </div>
                              <div className="text-primary-muted text-xs font-mono">
                                {t.settings.emaAlignmentNote}
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                              <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.timeframesToScan}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {(['1m', '5m'] as const).map((tf) => (
                                  <label key={tf} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={settings.scanner.emaAlignmentScanner.timeframes.includes(tf)}
                                      onChange={(e) => {
                                        const newTimeframes = e.target.checked
                                          ? [...settings.scanner.emaAlignmentScanner.timeframes, tf]
                                          : settings.scanner.emaAlignmentScanner.timeframes.filter((t) => t !== tf);
                                        updateScannerSettings({
                                          emaAlignmentScanner: {
                                            ...settings.scanner.emaAlignmentScanner,
                                            timeframes: newTimeframes,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 accent-primary cursor-pointer"
                                    />
                                    <span className="text-primary-muted font-mono text-xs">{tf.toUpperCase()}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary font-mono text-xs font-bold mb-3">{t.settings.lookbackPeriod}</div>
                              <div>
                                <label className="text-primary-muted font-mono block mb-1 text-xs">BARS TO CHECK</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={settings.scanner.emaAlignmentScanner.lookbackBars}
                                  onChange={(e) =>
                                    updateScannerSettings({
                                      emaAlignmentScanner: {
                                        ...settings.scanner.emaAlignmentScanner,
                                        lookbackBars: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                />
                                <div className="text-primary-muted text-xs font-mono mt-1">
                                  {t.settings.lookbackNote}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border border-frame rounded overflow-hidden">
                    <button
                      onClick={() => setIsScannerDivExpanded(!isScannerDivExpanded)}
                      className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.divergenceScanner}</span>
                      </div>
                      <span className="text-primary text-base">{isScannerDivExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isScannerDivExpanded && (
                      <div className="p-4 space-y-4 bg-bg-primary">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableDivergence}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.divergenceScanner.enabled}
                              onChange={(e) =>
                                updateScannerSettings({
                                  divergenceScanner: {
                                    ...settings.scanner.divergenceScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.divergenceScanner.enabled && (
                          <>
                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary font-mono text-xs font-bold mb-3">{t.settings.divergenceTypes}</div>
                              <div className="space-y-2">
                                <label className="flex items-center justify-between cursor-pointer">
                                  <span className="text-primary-muted text-xs font-mono">{t.settings.bullishDivergence}</span>
                                  <input
                                    type="checkbox"
                                    checked={settings.scanner.divergenceScanner.scanBullish}
                                    onChange={(e) =>
                                      updateScannerSettings({
                                        divergenceScanner: {
                                          ...settings.scanner.divergenceScanner,
                                          scanBullish: e.target.checked,
                                        },
                                      })
                                    }
                                    className="w-4 h-4 accent-primary cursor-pointer"
                                  />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                  <span className="text-primary-muted text-xs font-mono">{t.settings.bearishDivergence}</span>
                                  <input
                                    type="checkbox"
                                    checked={settings.scanner.divergenceScanner.scanBearish}
                                    onChange={(e) =>
                                      updateScannerSettings({
                                        divergenceScanner: {
                                          ...settings.scanner.divergenceScanner,
                                          scanBearish: e.target.checked,
                                        },
                                      })
                                    }
                                    className="w-4 h-4 accent-primary cursor-pointer"
                                  />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                  <span className="text-primary-muted text-xs font-mono">{t.settings.hiddenDivergences}</span>
                                  <input
                                    type="checkbox"
                                    checked={settings.scanner.divergenceScanner.scanHidden}
                                    onChange={(e) =>
                                      updateScannerSettings({
                                        divergenceScanner: {
                                          ...settings.scanner.divergenceScanner,
                                          scanHidden: e.target.checked,
                                        },
                                      })
                                    }
                                    className="w-4 h-4 accent-primary cursor-pointer"
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary-muted text-xs font-mono">
                                {t.settings.usesEnabledStochasticVariants}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MACD Reversal Scanner - Collapsible Section */}
                  <div className="border border-frame rounded overflow-hidden">
                    <button
                      onClick={() => setIsScannerMacdExpanded(!isScannerMacdExpanded)}
                      className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.macdReversalScanner}</span>
                      </div>
                      <span className="text-primary text-base">{isScannerMacdExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isScannerMacdExpanded && (
                      <div className="p-4 space-y-4 bg-bg-primary">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableMacdReversal}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.macdReversalScanner.enabled}
                              onChange={(e) =>
                                updateScannerSettings({
                                  macdReversalScanner: {
                                    ...settings.scanner.macdReversalScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.macdReversalScanner.enabled && (
                          <>
                            <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                              <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.timeframesToScan}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {(['1m', '5m'] as const).map((tf) => (
                                  <label key={tf} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={settings.scanner.macdReversalScanner.timeframes.includes(tf)}
                                      onChange={(e) => {
                                        const newTimeframes = e.target.checked
                                          ? [...settings.scanner.macdReversalScanner.timeframes, tf]
                                          : settings.scanner.macdReversalScanner.timeframes.filter((t) => t !== tf);
                                        updateScannerSettings({
                                          macdReversalScanner: {
                                            ...settings.scanner.macdReversalScanner,
                                            timeframes: newTimeframes,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 accent-primary cursor-pointer"
                                    />
                                    <span className="text-primary-muted text-xs font-mono">{tf.toUpperCase()}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary-muted text-xs font-mono">
                                {t.settings.detectsMacdCross} (Fast: {settings.scanner.macdReversalScanner.fastPeriod}, Slow: {settings.scanner.macdReversalScanner.slowPeriod}, Signal: {settings.scanner.macdReversalScanner.signalPeriod})
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RSI Reversal Scanner - Collapsible Section */}
                  <div className="border border-frame rounded overflow-hidden">
                    <button
                      onClick={() => setIsScannerRsiExpanded(!isScannerRsiExpanded)}
                      className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.rsiReversalScanner}</span>
                      </div>
                      <span className="text-primary text-base">{isScannerRsiExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isScannerRsiExpanded && (
                      <div className="p-4 space-y-4 bg-bg-primary">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableRsiReversal}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.rsiReversalScanner.enabled}
                              onChange={(e) =>
                                updateScannerSettings({
                                  rsiReversalScanner: {
                                    ...settings.scanner.rsiReversalScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.rsiReversalScanner.enabled && (
                          <>
                            <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                              <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.timeframesToScan}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {(['1m', '5m'] as const).map((tf) => (
                                  <label key={tf} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={settings.scanner.rsiReversalScanner.timeframes.includes(tf)}
                                      onChange={(e) => {
                                        const newTimeframes = e.target.checked
                                          ? [...settings.scanner.rsiReversalScanner.timeframes, tf]
                                          : settings.scanner.rsiReversalScanner.timeframes.filter((t) => t !== tf);
                                        updateScannerSettings({
                                          rsiReversalScanner: {
                                            ...settings.scanner.rsiReversalScanner,
                                            timeframes: newTimeframes,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 accent-primary cursor-pointer"
                                    />
                                    <span className="text-primary-muted text-xs font-mono">{tf.toUpperCase()}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary-muted text-xs font-mono">
                                {t.settings.detectsRsiZones} ({'>'}{settings.scanner.rsiReversalScanner.overboughtLevel}) / ({'<'}{settings.scanner.rsiReversalScanner.oversoldLevel}) (Period: {settings.scanner.rsiReversalScanner.period})
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Volume Spike Scanner - Collapsible Section */}
                  <div className="border border-frame rounded overflow-hidden">
                    <button
                      onClick={() => setIsScannerVolumeExpanded(!isScannerVolumeExpanded)}
                      className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.volumeSpikeScanner}</span>
                      </div>
                      <span className="text-primary text-base">{isScannerVolumeExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isScannerVolumeExpanded && (
                      <div className="p-4 space-y-4 bg-bg-primary">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableVolumeSpike}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.volumeSpikeScanner.enabled}
                              onChange={(e) =>
                                updateScannerSettings({
                                  volumeSpikeScanner: {
                                    ...settings.scanner.volumeSpikeScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.volumeSpikeScanner.enabled && (
                          <>
                            <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                              <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.timeframesToScan}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {(['1m', '5m'] as const).map((tf) => (
                                  <label key={tf} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={settings.scanner.volumeSpikeScanner.timeframes.includes(tf)}
                                      onChange={(e) => {
                                        const newTimeframes = e.target.checked
                                          ? [...settings.scanner.volumeSpikeScanner.timeframes, tf]
                                          : settings.scanner.volumeSpikeScanner.timeframes.filter((t) => t !== tf);
                                        updateScannerSettings({
                                          volumeSpikeScanner: {
                                            ...settings.scanner.volumeSpikeScanner,
                                            timeframes: newTimeframes,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 accent-primary cursor-pointer"
                                    />
                                    <span className="text-primary-muted text-xs font-mono">{tf.toUpperCase()}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary font-mono text-xs font-bold mb-3">{t.settings.thresholds}</div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">VOLUME MULTIPLIER</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={settings.scanner.volumeSpikeScanner.volumeThreshold}
                                    onChange={(e) =>
                                      updateScannerSettings({
                                        volumeSpikeScanner: {
                                          ...settings.scanner.volumeSpikeScanner,
                                          volumeThreshold: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                  <div className="text-primary-muted font-mono text-[10px] mt-1">
                                    {t.settings.currentAverage}: {settings.scanner.volumeSpikeScanner.volumeThreshold}x
                                  </div>
                                </div>
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">PRICE CHANGE %</label>
                                  <input
                                    type="number"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    value={settings.scanner.volumeSpikeScanner.priceChangeThreshold}
                                    onChange={(e) =>
                                      updateScannerSettings({
                                        volumeSpikeScanner: {
                                          ...settings.scanner.volumeSpikeScanner,
                                          priceChangeThreshold: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                  <div className="text-primary-muted font-mono text-[10px] mt-1">
                                    {t.settings.minimum}: {settings.scanner.volumeSpikeScanner.priceChangeThreshold}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary font-mono text-xs font-bold mb-3">{t.settings.lookbackPeriod}</div>
                              <div>
                                <label className="text-primary-muted font-mono block mb-1 text-xs">CANDLES FOR AVG VOLUME</label>
                                <input
                                  type="number"
                                  min="5"
                                  max="100"
                                  value={settings.scanner.volumeSpikeScanner.lookbackPeriod}
                                  onChange={(e) =>
                                    updateScannerSettings({
                                      volumeSpikeScanner: {
                                        ...settings.scanner.volumeSpikeScanner,
                                        lookbackPeriod: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                />
                                <div className="text-primary-muted font-mono text-[10px] mt-1">
                                  {t.settings.avgVolumeCalculatedFromLast} {settings.scanner.volumeSpikeScanner.lookbackPeriod}
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary-muted text-xs font-mono">
                                {t.settings.detectsVolumeAndPriceChange} ≥{settings.scanner.volumeSpikeScanner.volumeThreshold}x / ≥{settings.scanner.volumeSpikeScanner.priceChangeThreshold}%
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Support/Resistance Scanner - Collapsible Section */}
                  <div className="border border-frame rounded overflow-hidden">
                    <button
                      onClick={() => setIsScannerSRExpanded(!isScannerSRExpanded)}
                      className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.supportResistanceScanner}</span>
                      </div>
                      <span className="text-primary text-base">{isScannerSRExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isScannerSRExpanded && (
                      <div className="p-4 space-y-4 bg-bg-primary">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableSupportResistance}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.supportResistanceScanner?.enabled || false}
                              onChange={(e) =>
                                updateScannerSettings({
                                  supportResistanceScanner: {
                                    ...settings.scanner.supportResistanceScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.supportResistanceScanner?.enabled && (
                          <>
                            <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                              <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.timeframesToScan}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {(['1m', '5m'] as const).map((tf) => (
                                  <label key={tf} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={settings.scanner.supportResistanceScanner?.timeframes.includes(tf) || false}
                                      onChange={(e) => {
                                        const newTimeframes = e.target.checked
                                          ? [...(settings.scanner.supportResistanceScanner?.timeframes || []), tf]
                                          : (settings.scanner.supportResistanceScanner?.timeframes || []).filter((t) => t !== tf);
                                        updateScannerSettings({
                                          supportResistanceScanner: {
                                            ...settings.scanner.supportResistanceScanner,
                                            timeframes: newTimeframes,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 accent-primary cursor-pointer"
                                    />
                                    <span className="text-primary-muted text-xs font-mono">{tf.toUpperCase()}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary font-mono text-xs font-bold mb-3">{t.settings.thresholds}</div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">DISTANCE THRESHOLD (%)</label>
                                  <input
                                    type="number"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={settings.scanner.supportResistanceScanner?.distanceThreshold || 1.0}
                                    onChange={(e) =>
                                      updateScannerSettings({
                                        supportResistanceScanner: {
                                          ...settings.scanner.supportResistanceScanner,
                                          distanceThreshold: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                  <div className="text-primary-muted font-mono text-[10px] mt-1">
                                    {t.settings.alertWhenWithinOfLevel} {settings.scanner.supportResistanceScanner?.distanceThreshold || 1.0}%
                                  </div>
                                </div>
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">MIN TOUCHES</label>
                                  <input
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={settings.scanner.supportResistanceScanner?.minTouches || 3}
                                    onChange={(e) =>
                                      updateScannerSettings({
                                        supportResistanceScanner: {
                                          ...settings.scanner.supportResistanceScanner,
                                          minTouches: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                  <div className="text-primary-muted font-mono text-[10px] mt-1">
                                    {t.settings.minimumTouchesLabel}: {settings.scanner.supportResistanceScanner?.minTouches || 3}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary-muted text-xs font-mono">
                                {t.settings.supportResistanceNote}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Kalman Trend Scanner */}
                    {activeScannerRuntime.enabled && (
                      <div className="space-y-3">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableKalmanTrendScanner}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.kalmanTrendScanner?.enabled || false}
                              onChange={(e) =>
                                updateScannerSettings({
                                  kalmanTrendScanner: {
                                    ...settings.scanner.kalmanTrendScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.kalmanTrendScanner?.enabled && (
                          <>
                            <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                              <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.timeframesToScan}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {(['1m', '5m'] as const).map((tf) => (
                                  <label key={tf} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={settings.scanner.kalmanTrendScanner?.timeframes.includes(tf) || false}
                                      onChange={(e) => {
                                        const newTimeframes = e.target.checked
                                          ? [...(settings.scanner.kalmanTrendScanner?.timeframes || []), tf]
                                          : (settings.scanner.kalmanTrendScanner?.timeframes || []).filter((t: string) => t !== tf);
                                        updateScannerSettings({
                                          kalmanTrendScanner: {
                                            ...settings.scanner.kalmanTrendScanner,
                                            timeframes: newTimeframes,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 accent-primary cursor-pointer"
                                    />
                                    <span className="text-primary-muted text-xs font-mono">{tf.toUpperCase()}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary-muted text-xs font-mono">
                                {t.settings.detectsKalmanTrendReversals}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Ritchi Trend Scanner */}
                    {activeScannerRuntime.enabled && (
                      <div className="space-y-3">
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted text-xs font-mono">{t.settings.enableRitchiTrendScanner}</span>
                            <input
                              type="checkbox"
                              checked={settings.scanner.ritchiTrendScanner?.enabled || false}
                              onChange={(e) =>
                                updateScannerSettings({
                                  ritchiTrendScanner: {
                                    ...settings.scanner.ritchiTrendScanner,
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {settings.scanner.ritchiTrendScanner?.enabled && (
                          <>
                            <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                              <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.timeframesToScan}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {(['1m', '5m'] as const).map((tf) => (
                                  <label key={tf} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={settings.scanner.ritchiTrendScanner?.timeframes.includes(tf) || false}
                                      onChange={(e) => {
                                        const newTimeframes = e.target.checked
                                          ? [...(settings.scanner.ritchiTrendScanner?.timeframes || []), tf]
                                          : (settings.scanner.ritchiTrendScanner?.timeframes || []).filter((t: string) => t !== tf);
                                        updateScannerSettings({
                                          ritchiTrendScanner: {
                                            ...settings.scanner.ritchiTrendScanner,
                                            timeframes: newTimeframes,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 accent-primary cursor-pointer"
                                    />
                                    <span className="text-primary-muted text-xs font-mono">{tf.toUpperCase()}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded space-y-2">
                              <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.parameters}</div>
                              
                              <div className="space-y-1">
                                <label className="text-primary-muted text-xs font-mono">{t.settings.pivotLength}</label>
                                <input
                                  type="number"
                                  min="3"
                                  max="20"
                                  value={settings.scanner.ritchiTrendScanner?.pivLen || 5}
                                  onChange={(e) =>
                                    updateScannerSettings({
                                      ritchiTrendScanner: {
                                        ...settings.scanner.ritchiTrendScanner,
                                        pivLen: parseInt(e.target.value) || 5,
                                      },
                                    })
                                  }
                                  className="w-full px-2 py-1 bg-bg-primary border border-frame text-primary text-xs font-mono rounded"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-primary-muted text-xs font-mono">{t.settings.smaMin}</label>
                                <input
                                  type="number"
                                  min="3"
                                  max="50"
                                  value={settings.scanner.ritchiTrendScanner?.smaMin || 5}
                                  onChange={(e) =>
                                    updateScannerSettings({
                                      ritchiTrendScanner: {
                                        ...settings.scanner.ritchiTrendScanner,
                                        smaMin: parseInt(e.target.value) || 5,
                                      },
                                    })
                                  }
                                  className="w-full px-2 py-1 bg-bg-primary border border-frame text-primary text-xs font-mono rounded"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-primary-muted text-xs font-mono">{t.settings.smaMax}</label>
                                <input
                                  type="number"
                                  min="10"
                                  max="200"
                                  value={settings.scanner.ritchiTrendScanner?.smaMax || 50}
                                  onChange={(e) =>
                                    updateScannerSettings({
                                      ritchiTrendScanner: {
                                        ...settings.scanner.ritchiTrendScanner,
                                        smaMax: parseInt(e.target.value) || 50,
                                      },
                                    })
                                  }
                                  className="w-full px-2 py-1 bg-bg-primary border border-frame text-primary text-xs font-mono rounded"
                                />
                              </div>
                            </div>

                            <div className="p-3 bg-bg-secondary border border-frame rounded">
                              <div className="text-primary-muted text-xs font-mono">
                                {t.settings.detectsRitchiTrendReversals}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'indicators' && (
            <div className="space-y-4 pb-8">
              {/* Stochastic Settings - Expandable */}
              <div className="border border-frame rounded overflow-hidden">
                <button
                  onClick={() => setIsStochasticExpanded(!isStochasticExpanded)}
                  className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-mono text-xs font-bold">{t.settings.multiTimeframeStochastic}</span>
                  </div>
                  <span className="text-primary text-base">{isStochasticExpanded ? '▼' : '▶'}</span>
                </button>

                {isStochasticExpanded && (
                  <div className="p-4 space-y-4 bg-bg-primary">
                    {/* Global Toggle */}
                    <div className="p-3 bg-bg-secondary border border-frame rounded">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-primary-muted text-xs font-mono">{t.settings.showStochasticVariants}</span>
                        <input
                          type="checkbox"
                          checked={settings.indicators.stochastic.showMultiVariant}
                          onChange={(e) => updateStochasticSettings({ showMultiVariant: e.target.checked })}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* Divergence Settings */}
                    <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-primary-muted text-xs font-mono">{t.settings.showDivergenceLines}</span>
                        <input
                          type="checkbox"
                          checked={settings.indicators.stochastic.showDivergence}
                          onChange={(e) => updateStochasticSettings({ showDivergence: e.target.checked })}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>

                      {settings.indicators.stochastic.showDivergence && (
                        <div>
                          <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.divergenceVariant}</label>
                          <select
                            value={settings.indicators.stochastic.divergenceVariant}
                            onChange={(e) => updateStochasticSettings({ divergenceVariant: e.target.value as any })}
                            className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                          >
                            <option value="ultraFast">{t.settings.ultraFast}</option>
                            <option value="fast">{t.settings.fast}</option>
                            <option value="medium">{t.settings.medium}</option>
                            <option value="slow">{t.settings.slow}</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Variant Configuration */}
                    <div className="space-y-2">
                      <div className="text-primary text-xs font-mono mb-2">{t.settings.variantConfiguration}</div>

                      {(Object.keys(settings.indicators.stochastic.variants) as Array<keyof typeof settings.indicators.stochastic.variants>).map((variant) => {
                        const config = settings.indicators.stochastic.variants[variant];
                        const variantLabel =
                          variant === 'ultraFast' ? t.settings.ultraFast :
                          variant === 'fast' ? t.settings.fast :
                          variant === 'medium' ? t.settings.medium :
                          t.settings.slow;
                        return (
                          <div key={variant} className="p-3 bg-bg-secondary border border-frame rounded">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-primary font-mono text-xs font-bold">{variantLabel}</span>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={config.enabled}
                                  onChange={(e) => {
                                    updateStochasticSettings({
                                      variants: {
                                        ...settings.indicators.stochastic.variants,
                                        [variant]: { ...config, enabled: e.target.checked },
                                      },
                                    });
                                  }}
                                  className="w-4 h-4 accent-primary cursor-pointer"
                                />
                              </label>
                            </div>

                            {config.enabled && (
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">{t.settings.period}</label>
                                  <input
                                    type="number"
                                    min="5"
                                    max="100"
                                    value={config.period}
                                    onChange={(e) => {
                                      updateStochasticSettings({
                                        variants: {
                                          ...settings.indicators.stochastic.variants,
                                          [variant]: { ...config, period: Number(e.target.value) },
                                        },
                                      });
                                    }}
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">{t.settings.smoothK}</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={config.smoothK}
                                    onChange={(e) => {
                                      updateStochasticSettings({
                                        variants: {
                                          ...settings.indicators.stochastic.variants,
                                          [variant]: { ...config, smoothK: Number(e.target.value) },
                                        },
                                      });
                                    }}
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">{t.settings.smoothD}</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={config.smoothD}
                                    onChange={(e) => {
                                      updateStochasticSettings({
                                        variants: {
                                          ...settings.indicators.stochastic.variants,
                                          [variant]: { ...config, smoothD: Number(e.target.value) },
                                        },
                                      });
                                    }}
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* EMA Settings - Expandable */}
              <div className="border border-frame rounded overflow-hidden">
                <button
                  onClick={() => setIsEmaExpanded(!isEmaExpanded)}
                  className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-mono text-xs font-bold">{t.settings.ema}</span>
                  </div>
                  <span className="text-primary text-base">{isEmaExpanded ? '▼' : '▶'}</span>
                </button>

                {isEmaExpanded && (
                  <div className="p-4 space-y-3 bg-bg-primary">
                    {/* EMA 1 */}
                    <div className="p-3 bg-bg-secondary border border-frame rounded">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.ema1}</span>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.indicators.ema.ema1.enabled}
                            onChange={(e) => {
                              updateEmaSettings({
                                ema1: { ...settings.indicators.ema.ema1, enabled: e.target.checked },
                              });
                            }}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                        </label>
                      </div>
                      {settings.indicators.ema.ema1.enabled && (
                        <div>
                          <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.period}</label>
                          <input
                            type="number"
                            min="2"
                            max="200"
                            value={settings.indicators.ema.ema1.period}
                            onChange={(e) => {
                              updateEmaSettings({
                                ema1: { ...settings.indicators.ema.ema1, period: Number(e.target.value) },
                              });
                            }}
                            className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>

                    {/* EMA 2 */}
                    <div className="p-3 bg-bg-secondary border border-frame rounded">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.ema2}</span>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.indicators.ema.ema2.enabled}
                            onChange={(e) => {
                              updateEmaSettings({
                                ema2: { ...settings.indicators.ema.ema2, enabled: e.target.checked },
                              });
                            }}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                        </label>
                      </div>
                      {settings.indicators.ema.ema2.enabled && (
                        <div>
                          <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.period}</label>
                          <input
                            type="number"
                            min="2"
                            max="200"
                            value={settings.indicators.ema.ema2.period}
                            onChange={(e) => {
                              updateEmaSettings({
                                ema2: { ...settings.indicators.ema.ema2, period: Number(e.target.value) },
                              });
                            }}
                            className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>

                    {/* EMA 3 */}
                    <div className="p-3 bg-bg-secondary border border-frame rounded">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.ema3}</span>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.indicators.ema.ema3.enabled}
                            onChange={(e) => {
                              updateEmaSettings({
                                ema3: { ...settings.indicators.ema.ema3, enabled: e.target.checked },
                              });
                            }}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                        </label>
                      </div>
                      {settings.indicators.ema.ema3.enabled && (
                        <div>
                          <label className="text-primary-muted font-mono block mb-1 text-xs">{t.settings.period}</label>
                          <input
                            type="number"
                            min="2"
                            max="200"
                            value={settings.indicators.ema.ema3.period}
                            onChange={(e) => {
                              updateEmaSettings({
                                ema3: { ...settings.indicators.ema.ema3, period: Number(e.target.value) },
                              });
                            }}
                            className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* MACD Settings - Expandable */}
              <div className="border border-frame rounded overflow-hidden">
                <button
                  onClick={() => setIsMacdExpanded(!isMacdExpanded)}
                  className="w-full p-3 bg-bg-secondary flex items-center justify-between hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-mono text-xs font-bold">{t.settings.multiTimeframeMacd}</span>
                  </div>
                  <span className="text-primary text-base">{isMacdExpanded ? '▼' : '▶'}</span>
                </button>

                {isMacdExpanded && (
                  <div className="p-4 space-y-4 bg-bg-primary">
                    {/* Global Toggle */}
                    <div className="p-3 bg-bg-secondary border border-frame rounded">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-primary-muted text-xs font-mono">{t.settings.showMultiTimeframeMacd}</span>
                        <input
                          type="checkbox"
                          checked={settings.indicators.macd.showMultiTimeframe}
                          onChange={(e) => updateMacdSettings({ showMultiTimeframe: e.target.checked })}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* Timeframe Configuration */}
                    <div className="space-y-2">
                      <div className="text-primary text-xs font-mono mb-2">{t.settings.timeframeConfiguration}</div>

                      {(Object.keys(settings.indicators.macd.timeframes) as Array<keyof typeof settings.indicators.macd.timeframes>).map((timeframe) => {
                        const config = settings.indicators.macd.timeframes[timeframe];
                        return (
                          <div key={timeframe} className="p-3 bg-bg-secondary border border-frame rounded">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-primary font-mono text-xs font-bold">{timeframe.toUpperCase()}</span>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={config.enabled}
                                  onChange={(e) => {
                                    updateMacdSettings({
                                      timeframes: {
                                        ...settings.indicators.macd.timeframes,
                                        [timeframe]: { ...config, enabled: e.target.checked },
                                      },
                                    });
                                  }}
                                  className="w-4 h-4 accent-primary cursor-pointer"
                                />
                              </label>
                            </div>

                            {config.enabled && (
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">{t.settings.fastPeriod}</label>
                                  <input
                                    type="number"
                                    min="2"
                                    max="50"
                                    value={config.fastPeriod}
                                    onChange={(e) => {
                                      updateMacdSettings({
                                        timeframes: {
                                          ...settings.indicators.macd.timeframes,
                                          [timeframe]: { ...config, fastPeriod: Number(e.target.value) },
                                        },
                                      });
                                    }}
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">{t.settings.slowPeriod}</label>
                                  <input
                                    type="number"
                                    min="2"
                                    max="100"
                                    value={config.slowPeriod}
                                    onChange={(e) => {
                                      updateMacdSettings({
                                        timeframes: {
                                          ...settings.indicators.macd.timeframes,
                                          [timeframe]: { ...config, slowPeriod: Number(e.target.value) },
                                        },
                                      });
                                    }}
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-primary-muted font-mono block mb-1">{t.settings.signalPeriod}</label>
                                  <input
                                    type="number"
                                    min="2"
                                    max="50"
                                    value={config.signalPeriod}
                                    onChange={(e) => {
                                      updateMacdSettings({
                                        timeframes: {
                                          ...settings.indicators.macd.timeframes,
                                          [timeframe]: { ...config, signalPeriod: Number(e.target.value) },
                                        },
                                      });
                                    }}
                                    className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Kalman Volume Trend */}
              <div className="border border-frame rounded overflow-hidden">
                <button
                  onClick={() => setIsKalmanExpanded(!isKalmanExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-primary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-mono text-xs font-bold">█ {t.settings.kalmanVolumeTrend}</span>
                  </div>
                  <span className="text-primary text-base">{isKalmanExpanded ? '▼' : '▶'}</span>
                </button>

                {isKalmanExpanded && (
                  <div className="p-4 space-y-3 bg-bg-primary">
                    {/* Enable Toggle */}
                    <div className="p-3 bg-bg-secondary border border-frame rounded">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.enabled}</span>
                        <input
                          type="checkbox"
                          checked={settings.indicators.kalmanTrend.enabled}
                          onChange={(e) => updateKalmanTrendSettings({ enabled: e.target.checked })}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>
                    </div>

                    {settings.indicators.kalmanTrend.enabled && (
                      <div className="space-y-3">
                        {/* Show Signals */}
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted font-mono text-xs">{t.settings.showBuySellSignals}</span>
                            <input
                              type="checkbox"
                              checked={settings.indicators.kalmanTrend.showSignals}
                              onChange={(e) => updateKalmanTrendSettings({ showSignals: e.target.checked })}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {/* Volume Confirmation */}
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted font-mono text-xs">{t.settings.volumeConfirmation}</span>
                            <input
                              type="checkbox"
                              checked={settings.indicators.kalmanTrend.volConfirm}
                              onChange={(e) => updateKalmanTrendSettings({ volConfirm: e.target.checked })}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {/* Parameters */}
                        <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                          <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.parameters}</div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.processNoise}</label>
                              <input
                                type="number"
                                min="0.0001"
                                max="0.01"
                                step="0.0001"
                                value={settings.indicators.kalmanTrend.processNoise}
                                onChange={(e) => updateKalmanTrendSettings({ processNoise: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.measurementNoise}</label>
                              <input
                                type="number"
                                min="0.01"
                                max="2.0"
                                step="0.01"
                                value={settings.indicators.kalmanTrend.measurementNoise}
                                onChange={(e) => updateKalmanTrendSettings({ measurementNoise: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.bandMultiplier}</label>
                              <input
                                type="number"
                                min="0.5"
                                max="5.0"
                                step="0.1"
                                value={settings.indicators.kalmanTrend.bandMultiplier}
                                onChange={(e) => updateKalmanTrendSettings({ bandMultiplier: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.volThreshold}</label>
                              <input
                                type="number"
                                min="0.0"
                                max="2.0"
                                step="0.1"
                                value={settings.indicators.kalmanTrend.volThreshold}
                                onChange={(e) => updateKalmanTrendSettings({ volThreshold: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ritchi Trend */}
              <div className="border border-frame rounded overflow-hidden">
                <button
                  onClick={() => setIsRitchiExpanded(!isRitchiExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-primary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-mono text-xs font-bold">█ {t.settings.ritchiTrend}</span>
                  </div>
                  <span className="text-primary text-base">{isRitchiExpanded ? '▼' : '▶'}</span>
                </button>

                {isRitchiExpanded && (
                  <div className="p-4 space-y-3 bg-bg-primary">
                    {/* Enable Toggle */}
                    <div className="p-3 bg-bg-secondary border border-frame rounded">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-primary font-mono text-xs font-bold">{t.settings.enabled}</span>
                        <input
                          type="checkbox"
                          checked={settings.indicators.sieuXuHuong.enabled}
                          onChange={(e) => updateSieuXuHuongSettings({ enabled: e.target.checked })}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>
                    </div>

                    {settings.indicators.sieuXuHuong.enabled && (
                      <div className="space-y-3">
                        {/* Show Signals */}
                        <div className="p-3 bg-bg-secondary border border-frame rounded">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-primary-muted font-mono text-xs">{t.settings.showBuySellSignals}</span>
                            <input
                              type="checkbox"
                              checked={settings.indicators.sieuXuHuong.showSignals}
                              onChange={(e) => updateSieuXuHuongSettings({ showSignals: e.target.checked })}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>

                        {/* Pivot & SMA Parameters */}
                        <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                          <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.pivotAndSma}</div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.pivotLength}</label>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                step="1"
                                value={settings.indicators.sieuXuHuong.pivLen}
                                onChange={(e) => updateSieuXuHuongSettings({ pivLen: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.smaMin}</label>
                              <input
                                type="number"
                                min="2"
                                max="20"
                                step="1"
                                value={settings.indicators.sieuXuHuong.smaMin}
                                onChange={(e) => updateSieuXuHuongSettings({ smaMin: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.smaMax}</label>
                              <input
                                type="number"
                                min="10"
                                max="200"
                                step="1"
                                value={settings.indicators.sieuXuHuong.smaMax}
                                onChange={(e) => updateSieuXuHuongSettings({ smaMax: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.smaMultiplier}</label>
                              <input
                                type="number"
                                min="0.1"
                                max="5.0"
                                step="0.1"
                                value={settings.indicators.sieuXuHuong.smaMult}
                                onChange={(e) => updateSieuXuHuongSettings({ smaMult: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Trend & Risk Parameters */}
                        <div className="p-3 bg-bg-secondary border border-frame rounded space-y-3">
                          <div className="text-primary font-mono text-xs font-bold mb-2">{t.settings.trendAndRisk}</div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.trendLengthColor}</label>
                              <input
                                type="number"
                                min="10"
                                max="500"
                                step="10"
                                value={settings.indicators.sieuXuHuong.trendLen}
                                onChange={(e) => updateSieuXuHuongSettings({ trendLen: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.atrMultSl}</label>
                              <input
                                type="number"
                                min="0.5"
                                max="10.0"
                                step="0.1"
                                value={settings.indicators.sieuXuHuong.atrMult}
                                onChange={(e) => updateSieuXuHuongSettings({ atrMult: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-primary-muted font-mono block mb-1">{t.settings.tpMultiplier}</label>
                              <input
                                type="number"
                                min="0.5"
                                max="10.0"
                                step="0.1"
                                value={settings.indicators.sieuXuHuong.tpMult}
                                onChange={(e) => updateSieuXuHuongSettings({ tpMult: Number(e.target.value) })}
                                className="w-full bg-bg-primary border border-frame text-primary px-2 py-1 rounded font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4 pb-8">
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <div className="text-primary font-mono text-xs font-bold mb-3">█ {t.settings.positionSize} - {selectedExchange.toUpperCase()}</div>
                <p className="text-primary-muted text-[10px] mb-4 leading-relaxed">
                  {t.settings.positionSizeDesc}
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-primary-muted font-mono block mb-2 text-xs flex items-center justify-between">
                      <span>{t.settings.cloudOrders}</span>
                      <span className="text-accent-blue">{activeOrderSettings.cloudPercentage}%</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={activeOrderSettings.cloudPercentage}
                      onChange={(e) => updateOrderSettingsExchange(selectedExchange, { cloudPercentage: Number(e.target.value) })}
                      className="w-full h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-accent-blue"
                    />
                    <div className="flex justify-between text-[10px] text-primary-muted mt-1">
                      <span>1%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-primary-muted font-mono block mb-2 text-xs flex items-center justify-between">
                      <span>{t.settings.smallOrders}</span>
                      <span className="text-primary">{activeOrderSettings.smallPercentage}%</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={activeOrderSettings.smallPercentage}
                      onChange={(e) => updateOrderSettingsExchange(selectedExchange, { smallPercentage: Number(e.target.value) })}
                      className="w-full h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-primary-muted mt-1">
                      <span>1%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-primary-muted font-mono block mb-2 text-xs flex items-center justify-between">
                      <span>{t.settings.bigOrders}</span>
                      <span className="text-accent-rose">{activeOrderSettings.bigPercentage}%</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={activeOrderSettings.bigPercentage}
                      onChange={(e) => updateOrderSettingsExchange(selectedExchange, { bigPercentage: Number(e.target.value) })}
                      className="w-full h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-accent-rose"
                    />
                    <div className="flex justify-between text-[10px] text-primary-muted mt-1">
                      <span>1%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <div className="text-primary font-mono text-xs font-bold mb-3">█ {t.settings.leverage} - {selectedExchange.toUpperCase()}</div>
                <p className="text-primary-muted text-[10px] mb-4 leading-relaxed">
                  {t.settings.leverageDesc}
                </p>
                <div>
                  <label className="text-primary-muted font-mono block mb-2 text-xs flex items-center justify-between">
                    <span>{t.settings.leverage}</span>
                    <span className="text-accent-yellow">{activeOrderSettings.leverage}x</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={activeOrderSettings.leverage}
                    onChange={(e) => updateOrderSettingsExchange(selectedExchange, { leverage: Number(e.target.value) })}
                    className="w-full h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-accent-yellow"
                  />
                  <div className="flex justify-between text-[10px] text-primary-muted mt-1">
                    <span>1x</span>
                    <span>25x</span>
                    <span>50x</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <div className="text-primary-muted text-[10px] leading-relaxed">
                  {t.settings.leverageNote}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ui' && (
            <div className="space-y-4 pb-8">
              <LanguageSwitcher />
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <div className="text-primary font-mono text-xs font-bold mb-3">█ {t.settings.theme.toUpperCase()}</div>
                <p className="text-primary-muted text-[10px] mb-4 leading-relaxed">
                  {t.settings.themeDesc}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['hyper', 'hyper-black', 'dark', 'dark-blue', 'midnight', 'light', 'afternoon', 'psychedelic', 'nintendo', 'gameboy', 'sega', 'playstation', 'cyberpunk', 'vaporwave', 'matrix', 'synthwave', 'ocean', 'c64', 'amber', 'girly'] as ThemeName[]).map((themeName) => (
                    <label
                      key={themeName}
                      className="flex items-center gap-2 p-2 bg-bg-primary border border-frame rounded cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={themeName}
                        checked={settings.theme.selected === themeName}
                        onChange={() => updateThemeSettings({ selected: themeName })}
                        className="w-3 h-3 accent-primary cursor-pointer flex-shrink-0"
                      />
                      <div className="text-primary font-mono text-[10px] capitalize leading-tight">{themeName.replace('-', ' ')}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <div className="text-primary font-mono text-xs font-bold mb-3">█ {t.settings.chart.toUpperCase()}</div>
                <p className="text-primary-muted text-[10px] mb-4 leading-relaxed">
                  {t.settings.chartDesc}
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-bg-primary border border-frame rounded">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-primary-muted text-xs font-mono block">{t.settings.showPivotMarkers}</span>
                        <span className="text-primary-muted text-[10px] block mt-1">
                          {t.settings.showPivotMarkersDesc}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.chart?.showPivotMarkers ?? true)}
                        onChange={(e) => {
                          const { updateSettings } = useSettingsStore.getState();
                          updateSettings({ chart: { ...settings.chart, showPivotMarkers: e.target.checked } });
                        }}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>
                  </div>
                  <div className="p-3 bg-bg-primary border border-frame rounded">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-primary-muted text-xs font-mono block">{t.settings.schmecklesMode}</span>
                        <span className="text-primary-muted text-[10px] block mt-1">
                          {t.settings.schmecklesModeDesc}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.chart?.schmecklesMode ?? false)}
                        onChange={(e) => {
                          const { updateSettings } = useSettingsStore.getState();
                          updateSettings({ chart: { ...settings.chart, schmecklesMode: e.target.checked } });
                        }}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>
                  </div>
                  <div className="p-3 bg-bg-primary border border-frame rounded">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-primary-muted text-xs font-mono block">{t.settings.invertedMode}</span>
                        <span className="text-primary-muted text-[10px] block mt-1">
                          {t.settings.invertedModeDesc}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.chart?.invertedMode ?? false)}
                        onChange={(e) => {
                          const { updateSettings } = useSettingsStore.getState();
                          updateSettings({ chart: { ...settings.chart, invertedMode: e.target.checked } });
                        }}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <div className="text-primary font-mono text-xs font-bold mb-3">█ {t.settings.sounds.toUpperCase()}</div>
                <p className="text-primary-muted text-[10px] mb-4 leading-relaxed">
                  {t.settings.soundsDesc}
                </p>
                <div className="p-3 bg-bg-primary border border-frame rounded">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-primary-muted text-xs font-mono block">{t.settings.playSoundOnTrades}</span>
                      <span className="text-primary-muted text-[10px] block mt-1">
                        {t.settings.playSoundOnTradesDesc}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.theme.playTradeSound}
                      onChange={(e) => updateThemeSettings({ playTradeSound: e.target.checked })}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credentials' && (
            <div className="space-y-4 pb-8">
              <CredentialsSettings />
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4 pb-8">
              {/* Enable AI Strategy */}
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-primary-muted text-xs font-mono">{t.ai.enableAI}</span>
                  <input
                    type="checkbox"
                    checked={settings.ai.enabled}
                    onChange={(e) => updateAISettings({ enabled: e.target.checked })}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                </label>
              </div>

              {/* Claude API Key */}
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <label className="block text-primary-muted text-xs font-mono mb-2">{t.ai.claudeApiKey}</label>
                <input
                  type="password"
                  value={settings.ai.claudeApiKey}
                  onChange={(e) => updateAISettings({ claudeApiKey: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary placeholder:text-primary-muted/40 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Claude Model */}
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <label className="block text-primary-muted text-xs font-mono mb-2">{t.ai.claudeModel}</label>
                <select
                  value={settings.ai.claudeModel}
                  onChange={(e) => updateAISettings({ claudeModel: e.target.value })}
                  className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-primary"
                >
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                  <option value="claude-haiku-4-20250514">Claude Haiku 4</option>
                </select>
              </div>

              {/* Confidence Threshold */}
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <label className="block text-primary-muted text-xs font-mono mb-2">
                  {t.ai.confidenceThreshold}: {(settings.ai.confidenceThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={settings.ai.confidenceThreshold}
                  onChange={(e) => updateAISettings({ confidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-primary-muted/50 mt-1">
                  <span>50%</span>
                  <span>95%</span>
                </div>
              </div>

              {/* Strategy */}
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <label className="block text-primary-muted text-xs font-mono mb-2">{t.ai.strategy}</label>
                <div className="bg-bg-primary border border-frame rounded px-3 py-2">
                  <div className="text-xs font-mono text-primary">{t.ai.stochasticReversalScalp}</div>
                  <div className="text-[10px] font-mono text-primary-muted mt-1">
                    {t.ai.stochasticReversalScalpDesc}
                  </div>
                </div>
              </div>

              {/* Max Calls Per Hour */}
              <div className="p-3 bg-bg-secondary border border-frame rounded">
                <label className="block text-primary-muted text-xs font-mono mb-2">
                  {t.ai.maxCallsPerHour}: {settings.ai.maxCallsPerHour}
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={settings.ai.maxCallsPerHour}
                  onChange={(e) => updateAISettings({ maxCallsPerHour: parseInt(e.target.value) })}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Telegram Section */}
              <div className="border-t border-frame pt-3 mt-3">
                <div className="text-primary text-xs font-mono mb-3 uppercase tracking-wider">{t.ai.telegramNotifications} - {selectedExchange.toUpperCase()}</div>

                <div className="p-3 bg-bg-secondary border border-frame rounded mb-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-primary-muted text-xs font-mono">{t.ai.enableTelegram} - {selectedExchange.toUpperCase()}</span>
                    <input
                      type="checkbox"
                      checked={activeAiTelegramSettings.enabled}
                      onChange={(e) => updateAiTelegramExchange(selectedExchange, { enabled: e.target.checked })}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </label>
                </div>

                <div className="p-3 bg-bg-secondary border border-frame rounded mb-3">
                  <label className="block text-primary-muted text-xs font-mono mb-2">{t.ai.botToken}</label>
                  <input
                    type="password"
                    value={activeAiTelegramSettings.botToken}
                    onChange={(e) => updateAiTelegramExchange(selectedExchange, { botToken: e.target.value })}
                    placeholder="123456:ABC-..."
                    className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary placeholder:text-primary-muted/40 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="p-3 bg-bg-secondary border border-frame rounded">
                  <label className="block text-primary-muted text-xs font-mono mb-2">{t.ai.chatId}</label>
                  <input
                    type="text"
                    value={activeAiTelegramSettings.chatId}
                    onChange={(e) => updateAiTelegramExchange(selectedExchange, { chatId: e.target.value })}
                    placeholder="-100..."
                    className="w-full bg-bg-primary border border-frame rounded px-3 py-2 text-xs font-mono text-primary placeholder:text-primary-muted/40 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
