'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTopSymbolsStore } from '@/stores/useTopSymbolsStore';
import { useBotTradingStore } from '@/stores/useBotTradingStore';
import { useDexStore } from '@/stores/useDexStore';
import type { BotIndicatorType } from '@/models/Settings';
import type { BotLogEntry } from '@/stores/useBotTradingStore';
import toast from 'react-hot-toast';
import { memo } from 'react';
import { useSidebarPricesStore } from '@/stores/useSidebarPricesStore';

const POSITION_VALUE_DRIFT_WARN_PCT = 35;
const STALE_OPEN_ORDER_MINUTES = 8;

type OpenOrderCheckItem = {
  oid: number;
  coin: string;
  side: 'B' | 'A';
  sz: number;
  limitPx: number;
  orderType: string;
  reduceOnly: boolean;
  isPositionTpsl: boolean;
  ageSec: number;
};

type OpenOrderCheckResult = {
  checkedAt: number;
  total: number;
  trackedRelated: number;
  stalePotential: number;
  bySymbol: Record<string, number>;
  items: OpenOrderCheckItem[];
};

interface BotTrackedPositionProps {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  notional: number;
  expectedNotional: number;
  leverage: number;
  onClose: (symbol: string) => void;
}

const BotPositionCard = memo(function BotPositionCard({
  symbol,
  side,
  size,
  entryPrice,
  notional,
  expectedNotional,
  leverage,
  onClose,
}: BotTrackedPositionProps) {
  const livePrice = useSidebarPricesStore((state) => state.prices[symbol]);

  const unrealizedPnlUsd = livePrice != null
    ? (side === 'long' ? livePrice - entryPrice : entryPrice - livePrice) * size
    : null;

  const unrealizedPnlPct = unrealizedPnlUsd != null && notional > 0
    ? (unrealizedPnlUsd / notional) * 100
    : null;

  const currentValue = livePrice != null ? livePrice * size : null;
  const openNotionalDriftPct = expectedNotional > 0
    ? ((notional - expectedNotional) / expectedNotional) * 100
    : null;
  const currentValueDriftPct = currentValue != null && expectedNotional > 0
    ? ((currentValue - expectedNotional) / expectedNotional) * 100
    : null;
  const isCurrentValueDriftWarn = currentValueDriftPct != null
    && Math.abs(currentValueDriftPct) >= POSITION_VALUE_DRIFT_WARN_PCT;

  const isProfit = unrealizedPnlUsd != null && unrealizedPnlUsd >= 0;
  const pnlColor = unrealizedPnlUsd == null ? 'text-primary-muted' : isProfit ? 'text-bullish' : 'text-bearish';
  const borderColor = unrealizedPnlUsd == null ? 'border-frame' : isProfit ? 'border-bullish' : 'border-bearish';

  return (
    <div className={`border rounded p-2.5 ${borderColor}`}>
      <div className="text-xs font-bold text-primary-muted mb-1.5">{symbol}</div>
      <div className="flex justify-between items-center">
        <span className={`text-xs font-bold ${side === 'long' ? 'text-bullish' : 'text-bearish'}`}>
          {side.toUpperCase()}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold ${pnlColor}`}>
            {unrealizedPnlUsd == null
              ? '...'
              : `${unrealizedPnlUsd >= 0 ? '+' : ''}$${unrealizedPnlUsd.toFixed(2)}`}
          </span>
          {unrealizedPnlPct != null && (
            <span className={`text-[10px] font-mono ${pnlColor}`}>
              ({unrealizedPnlPct >= 0 ? '+' : ''}{unrealizedPnlPct.toFixed(2)}%)
            </span>
          )}
          <button
            onClick={() => onClose(symbol)}
            className="text-primary-muted hover:text-bearish text-xs leading-none px-1"
            title="Close position"
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs font-mono text-primary-muted">
          {entryPrice.toFixed(4)}
        </span>
        <span className="text-xs font-mono text-primary-muted">
          {currentValue != null ? `$${currentValue.toFixed(2)}` : '...'}
        </span>
      </div>
      <div className="mt-1 text-[10px] font-mono text-primary-muted flex justify-between">
        <span>Lev {leverage}x</span>
        <span>Open ${notional.toFixed(2)} | Exp ${expectedNotional.toFixed(2)}</span>
      </div>
      <div className="mt-1 text-[10px] font-mono flex justify-between">
        <span className="text-primary-muted">
          Open drift: {openNotionalDriftPct == null ? '...' : `${openNotionalDriftPct >= 0 ? '+' : ''}${openNotionalDriftPct.toFixed(1)}%`}
        </span>
        <span className={isCurrentValueDriftWarn ? 'text-yellow-300' : 'text-primary-muted'}>
          Curr drift: {currentValueDriftPct == null ? '...' : `${currentValueDriftPct >= 0 ? '+' : ''}${currentValueDriftPct.toFixed(1)}%`}
        </span>
      </div>
      {isCurrentValueDriftWarn && (
        <div className="mt-1 text-[10px] font-mono text-yellow-300">
          Warning: Current value lech {POSITION_VALUE_DRIFT_WARN_PCT}%+ so voi expected notional.
        </div>
      )}
    </div>
  );
});

const BINANCE_PHASE1_LOCK = true;

type ServerIpStatus = {
  loading: boolean;
  ip: string;
  expectedIp: string;
  ipWhitelistConfigured: boolean;
  matchesExpected: boolean | null;
  error: string;
};

export default function BotTradingView() {
  const { settings, updateBotSettings } = useSettingsStore();
  const botSettings = settings.bot;
  const topSymbols = useTopSymbolsStore((state) => state.symbols);
  const selectedExchange = useDexStore((state) => state.selectedExchange);
  const setSelectedExchange = useDexStore((state) => state.setSelectedExchange);
  const {
    isRunning,
    isExecuting,
    trackedSymbols,
    desiredAutoSymbols,
    positions,
    lastSignals,
    reversalPendingVerification,
    dailyStats,
    logs,
    isBacktesting,
    backtestResult,
    backtestPresetResults,
    start,
    stop,
    runRitchiBacktest,
    runRitchiBacktestPresetCompare,
    closeAllPositionsNow,
    clearLogs,
    importLogs,
    toggleManualSymbol,
    syncTrackedSymbols,
  } = useBotTradingStore();
  const [riskAck, setRiskAck] = useState(false);
  const [isScanningSymbols, setIsScanningSymbols] = useState(false);
  const [riskAutoCloseAck, setRiskAutoCloseAck] = useState(false);
  const [logSymbolFilter, setLogSymbolFilter] = useState('ALL');
  const [backtestBars, setBacktestBars] = useState(600);
  const [serverIpStatus, setServerIpStatus] = useState<ServerIpStatus>({
    loading: true,
    ip: '',
    expectedIp: '',
    ipWhitelistConfigured: false,
    matchesExpected: null,
    error: '',
  });
  const [openOrderCheck, setOpenOrderCheck] = useState<OpenOrderCheckResult | null>(null);
  const [isCheckingOpenOrders, setIsCheckingOpenOrders] = useState(false);

  useEffect(() => {
    if (BINANCE_PHASE1_LOCK && botSettings.exchange !== 'binance') {
      updateBotSettings({ exchange: 'binance' });
    }
    if (BINANCE_PHASE1_LOCK && selectedExchange !== 'binance') {
      setSelectedExchange('binance');
    }
  }, [botSettings.exchange, selectedExchange, setSelectedExchange, updateBotSettings]);

  useEffect(() => {
    if (botSettings.paperMode) {
      updateBotSettings({ paperMode: false });
    }
  }, [botSettings.paperMode, updateBotSettings]);

  const refreshServerIpStatus = useCallback(async (): Promise<ServerIpStatus> => {
    setServerIpStatus((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetch('/api/server-ip', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        const nextState: ServerIpStatus = {
          loading: false,
          ip: '',
          expectedIp: typeof payload?.expectedIp === 'string' ? payload.expectedIp : '',
          ipWhitelistConfigured: false,
          matchesExpected: null,
          error: payload?.error || 'Khong lay duoc server IP',
        };
        setServerIpStatus(nextState);
        return nextState;
      }

      const nextState: ServerIpStatus = {
        loading: false,
        ip: payload.ip || '',
        expectedIp: payload.expectedIp || '',
        ipWhitelistConfigured: Boolean(payload.ipWhitelistConfigured),
        matchesExpected: typeof payload.matchesExpected === 'boolean' ? payload.matchesExpected : null,
        error: '',
      };
      setServerIpStatus(nextState);
      return nextState;
    } catch (error) {
      const nextState: ServerIpStatus = {
        loading: false,
        ip: '',
        expectedIp: '',
        ipWhitelistConfigured: false,
        matchesExpected: null,
        error: error instanceof Error ? error.message : 'Khong lay duoc server IP',
      };
      setServerIpStatus(nextState);
      return nextState;
    }
  }, []);

  useEffect(() => {
    void refreshServerIpStatus();
  }, [refreshServerIpStatus]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(async () => {
      const status = await refreshServerIpStatus();
      const liveReady = status.ipWhitelistConfigured && status.matchesExpected === true;
      if (!liveReady) {
        stop();
        if (!status.ipWhitelistConfigured) {
          toast.error('Auto-stop bot: BINANCE_WHITELIST_IP chua duoc cau hinh tren server');
        } else if (status.matchesExpected === false) {
          toast.error(`Auto-stop bot: IP server ${status.ip || '-'} khong khop whitelist ${status.expectedIp || '-'}`);
        } else {
          toast.error('Auto-stop bot: khong xac minh duoc IP server');
        }
      }
    }, 360 * 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, refreshServerIpStatus, stop]);

  const canStartLive = useMemo(() => {
    return serverIpStatus.ipWhitelistConfigured && serverIpStatus.matchesExpected === true;
  }, [serverIpStatus.ipWhitelistConfigured, serverIpStatus.matchesExpected]);

  const handleStartStop = async () => {
    if (isRunning) {
      stop();
      return;
    }

    if (!canStartLive) {
      if (!serverIpStatus.ipWhitelistConfigured) {
        toast.error('Live mode bi khoa: thieu BINANCE_WHITELIST_IP tren server');
      } else if (serverIpStatus.matchesExpected === false) {
        toast.error(`Live mode bi khoa: IP hien tai ${serverIpStatus.ip} khong khop whitelist ${serverIpStatus.expectedIp}`);
      } else {
        toast.error('Live mode bi khoa: chua xac minh duoc server IP');
      }
      return;
    }

    await start();
  };

  const leverage = botSettings.leverageByExchange[botSettings.exchange];
  const expectedNotionalPerPosition = botSettings.initialMarginUsdt * leverage;
  const availableSymbols = useMemo(() => topSymbols.map((item) => item.name).slice(0, 30), [topSymbols]);
  const riskScore = useMemo(() => {
    let score = 0;
    if (leverage >= 20) score += 2;
    else if (leverage >= 10) score += 1;
    if (botSettings.maxLossPercentPerDay >= 5) score += 2;
    else if (botSettings.maxLossPercentPerDay >= 3) score += 1;
    if (botSettings.initialMarginUsdt >= 100) score += 2;
    else if (botSettings.initialMarginUsdt >= 50) score += 1;
    return score;
  }, [leverage, botSettings.maxLossPercentPerDay, botSettings.initialMarginUsdt]);
  const riskLevel = riskScore >= 5 ? 'HIGH' : riskScore >= 3 ? 'MEDIUM' : 'LOW';
  const filteredLogs = useMemo(
    () => logs.filter((log) => (logSymbolFilter === 'ALL' ? true : log.symbol === logSymbolFilter)),
    [logs, logSymbolFilter]
  );
  const pnlBySymbolRows = useMemo(
    () =>
      Object.entries(dailyStats.realizedPnlBySymbol)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])),
    [dailyStats.realizedPnlBySymbol]
  );
  const winRateBySymbol = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const closedActions = new Set(['close-reversal', 'close-manual']);
    const stats: Record<string, { closed: number; wins: number }> = {};
    for (const log of logs) {
      if (log.symbol === 'SYSTEM') continue;
      if (!closedActions.has(log.action)) continue;
      if (typeof log.realizedPnl !== 'number') continue;
      if (new Date(log.timestamp).toISOString().slice(0, 10) !== today) continue;
      if (!stats[log.symbol]) {
        stats[log.symbol] = { closed: 0, wins: 0 };
      }
      stats[log.symbol].closed += 1;
      if (log.realizedPnl > 0) stats[log.symbol].wins += 1;
    }
    return stats;
  }, [logs]);

  const hasAnyValueDriftWarning = useMemo(() => {
    if (expectedNotionalPerPosition <= 0) return false;
    return Object.values(positions).some((position) => {
      const livePrice = useSidebarPricesStore.getState().prices[position.symbol];
      if (livePrice == null) return false;
      const currentValue = livePrice * position.size;
      const driftPct = ((currentValue - expectedNotionalPerPosition) / expectedNotionalPerPosition) * 100;
      return Math.abs(driftPct) >= POSITION_VALUE_DRIFT_WARN_PCT;
    });
  }, [positions, expectedNotionalPerPosition]);

  const checkOpenOrdersNow = useCallback(async () => {
    const service = useBotTradingStore.getState().service;
    if (!service) {
      toast.error('Trading service chua san sang');
      return;
    }

    setIsCheckingOpenOrders(true);
    try {
      const raw = (await service.getOpenOrders()) as Array<Record<string, unknown>>;
      const now = Date.now();
      const trackedSet = new Set(trackedSymbols);
      const items: OpenOrderCheckItem[] = raw.map((order) => {
        const oid = Number(order.oid ?? 0);
        const coin = String(order.coin ?? '').toUpperCase();
        const side = String(order.side ?? 'B').toUpperCase() === 'A' ? 'A' : 'B';
        const sz = Number(order.sz ?? 0);
        const limitPx = Number(order.limitPx ?? 0);
        const timestamp = Number(order.timestamp ?? now);
        const ageSec = Math.max(0, Math.floor((now - timestamp) / 1000));
        return {
          oid,
          coin,
          side,
          sz: Number.isFinite(sz) ? sz : 0,
          limitPx: Number.isFinite(limitPx) ? limitPx : 0,
          orderType: String(order.orderType ?? 'unknown'),
          reduceOnly: Boolean(order.reduceOnly),
          isPositionTpsl: Boolean(order.isPositionTpsl),
          ageSec,
        };
      });

      const bySymbol: Record<string, number> = {};
      for (const item of items) {
        bySymbol[item.coin] = (bySymbol[item.coin] || 0) + 1;
      }

      const stalePotential = items.filter((item) =>
        item.ageSec >= STALE_OPEN_ORDER_MINUTES * 60
        && !item.reduceOnly
        && !item.isPositionTpsl
      ).length;

      const trackedRelated = items.filter((item) => trackedSet.has(item.coin)).length;
      const nextResult: OpenOrderCheckResult = {
        checkedAt: now,
        total: items.length,
        trackedRelated,
        stalePotential,
        bySymbol,
        items: items.sort((a, b) => b.ageSec - a.ageSec),
      };

      setOpenOrderCheck(nextResult);

      if (nextResult.total === 0) {
        toast.success('Khong co open orders tren Binance');
      } else if (nextResult.stalePotential > 0) {
        toast.error(`Phat hien ${nextResult.stalePotential} open order co dau hieu bi treo`);
      } else {
        toast.success(`Open orders: ${nextResult.total} (tracked: ${nextResult.trackedRelated})`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Check open orders failed');
    } finally {
      setIsCheckingOpenOrders(false);
    }
  }, [trackedSymbols]);

  const exportLogsCsv = () => {
    const header = [
      'timestamp',
      'symbol',
      'indicator',
      'action',
      'side',
      'signal',
      'price',
      'size',
      'realizedPnl',
      'message',
    ];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.symbol,
      log.indicator,
      log.action,
      log.side || '',
      log.signal || '',
      typeof log.price === 'number' ? log.price.toString() : '',
      typeof log.size === 'number' ? log.size.toString() : '',
      typeof log.realizedPnl === 'number' ? log.realizedPnl.toString() : '',
      `"${String(log.message).replaceAll('"', '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bot-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length <= 1) {
        toast.error('CSV file has no data rows');
        return;
      }
      const rows = lines.slice(1);
      const parsed: Array<Omit<BotLogEntry, 'id'>> = [];
      for (const row of rows) {
        const cols = parseCsvLine(row);
        if (cols.length < 10) continue;
        const timestamp = Date.parse(cols[0]);
        const symbol = cols[1] || 'UNKNOWN';
        const indicator = (cols[2] as BotIndicatorType) || 'ritchi';
        const action = (cols[3] as BotLogEntry['action']) || 'skip';
        const side = cols[4] ? (cols[4] as BotLogEntry['side']) : undefined;
        const signal = cols[5] ? (cols[5] as BotLogEntry['signal']) : undefined;
        const price = cols[6] ? Number(cols[6]) : undefined;
        const size = cols[7] ? Number(cols[7]) : undefined;
        const realizedPnl = cols[8] ? Number(cols[8]) : undefined;
        const message = cols[9] || 'Imported log';
        parsed.push({
          timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
          symbol,
          indicator: ['ritchi', 'kalmanTrend', 'macdReversal'].includes(indicator) ? indicator : 'ritchi',
          action: ['open', 'close-reversal', 'close-manual', 'skip', 'error'].includes(action) ? action : 'skip',
          side: side === 'long' || side === 'short' ? side : undefined,
          signal: signal === 'bullish' || signal === 'bearish' ? signal : null,
          price: typeof price === 'number' && Number.isFinite(price) ? price : undefined,
          size: typeof size === 'number' && Number.isFinite(size) ? size : undefined,
          realizedPnl: typeof realizedPnl === 'number' && Number.isFinite(realizedPnl) ? realizedPnl : undefined,
          message,
        });
      }
      if (parsed.length === 0) {
        toast.error('No valid log rows found in CSV');
        return;
      }
      importLogs(parsed);
      toast.success(`Imported ${parsed.length} logs from CSV`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import CSV');
    } finally {
      event.target.value = '';
    }
  };

  const exportBacktestCsv = () => {
    if (!backtestResult && backtestPresetResults.length === 0) {
      toast.error('No backtest data to export');
      return;
    }

    const rows: string[] = [];
    rows.push('section,key,value');

    if (backtestResult) {
      rows.push(`single,generatedAt,${new Date(backtestResult.generatedAt).toISOString()}`);
      rows.push(`single,timeframe,${backtestResult.timeframe}`);
      rows.push(`single,bars,${backtestResult.bars}`);
      rows.push(`single,symbols,"${backtestResult.symbols.join(' ')}"`);
      rows.push(`single,totalTrades,${backtestResult.totalTrades}`);
      rows.push(`single,winRate,${backtestResult.winRate}`);
      rows.push(`single,totalPnl,${backtestResult.totalPnl}`);
      rows.push(`single,avgPnl,${backtestResult.avgPnl}`);
      rows.push(`single,maxDrawdown,${backtestResult.maxDrawdown}`);
      rows.push(`single,profitFactor,${backtestResult.profitFactor}`);
    }

    rows.push('');
    rows.push('single_symbol,symbol,trades,wins,losses,winRate,totalPnl,avgPnl,maxDrawdown,profitFactor');
    if (backtestResult) {
      for (const item of backtestResult.bySymbol) {
        rows.push(
          `single_symbol,${item.symbol},${item.trades},${item.wins},${item.losses},${item.winRate},${item.totalPnl},${item.avgPnl},${item.maxDrawdown},${item.profitFactor}`
        );
      }
    }

    if (backtestPresetResults.length > 0) {
      rows.push('');
      rows.push('preset_summary,preset,timeframe,bars,totalTrades,winRate,totalPnl,maxDrawdown,profitFactor');
      for (const preset of backtestPresetResults) {
        rows.push(
          `preset_summary,${preset.preset},${preset.result.timeframe},${preset.result.bars},${preset.result.totalTrades},${preset.result.winRate},${preset.result.totalPnl},${preset.result.maxDrawdown},${preset.result.profitFactor}`
        );
      }

      rows.push('');
      rows.push('preset_symbol,preset,symbol,trades,wins,losses,winRate,totalPnl,avgPnl,maxDrawdown,profitFactor');
      for (const preset of backtestPresetResults) {
        for (const item of preset.result.bySymbol) {
          rows.push(
            `preset_symbol,${preset.preset},${item.symbol},${item.trades},${item.wins},${item.losses},${item.winRate},${item.totalPnl},${item.avgPnl},${item.maxDrawdown},${item.profitFactor}`
          );
        }
      }
    }

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ritchi-backtest-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Backtest CSV exported');
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="fixed top-3 right-3 z-20 pointer-events-none">
        <div
          className="px-4 py-2 text-sm font-bold tracking-widest border rounded shadow-lg text-bearish border-bearish bg-bearish/20"
        >
          LIVE MODE
        </div>
      </div>
      <div className="flex flex-col h-full w-full p-2 gap-2 overflow-y-auto">
        <div className="terminal-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-primary text-sm font-bold tracking-wider">BOT TRADING - RITCHI</h2>
              <p className="text-primary-muted text-[10px] mt-1">
                Auto execute from Ritchi signals. TP/SL by indicator reversal.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-mono">
            <input
              type="checkbox"
              checked={botSettings.enabled}
              onChange={(e) => updateBotSettings({ enabled: e.target.checked })}
            />
            Bot enabled
          </label>
          <div className="text-xs font-mono text-bearish">Mode locked: LIVE TRADING</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <label className="flex flex-col gap-1">
              Exchange
              <select
                value={botSettings.exchange}
                onChange={(e) => updateBotSettings({ exchange: e.target.value as 'binance' | 'hyperliquid' })}
                disabled={BINANCE_PHASE1_LOCK}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              >
                <option value="binance">Binance</option>
                {!BINANCE_PHASE1_LOCK && <option value="hyperliquid">Hyperliquid</option>}
              </select>
              {BINANCE_PHASE1_LOCK && (
                <span className="text-[10px] text-yellow-300">Phase 1 lock: Hyperliquid will be enabled in phase 2</span>
              )}
            </label>

            <label className="flex flex-col gap-1">
              Indicator
              <select
                value={botSettings.indicator}
                onChange={(e) => updateBotSettings({ indicator: e.target.value as BotIndicatorType })}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              >
                <option value="ritchi">Ritchi Trend</option>
                <option value="kalmanTrend">Kalman Trend</option>
                <option value="macdReversal">MACD Reversal</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              Timeframe
              <select
                value={botSettings.timeframe}
                onChange={(e) => updateBotSettings({ timeframe: e.target.value as '1m' | '5m' })}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              Symbol mode
              <select
                value={botSettings.symbolMode}
                onChange={(e) => updateBotSettings({ symbolMode: e.target.value as 'auto' | 'manual' })}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              >
                <option value="auto">Auto top volatility</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              Auto symbols count
              <div className="flex gap-1">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={botSettings.autoTopSymbolsCount}
                  onChange={(e) =>
                    updateBotSettings({
                      autoTopSymbolsCount: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                    })
                  }
                  disabled={botSettings.symbolMode !== 'auto'}
                  className="bg-bg-secondary border border-frame rounded px-2 py-1 disabled:opacity-50 w-16"
                />
                <button
                  onClick={() => {
                    if (botSettings.symbolMode !== 'auto') return;
                    setIsScanningSymbols(true);
                    syncTrackedSymbols();
                    setTimeout(() => setIsScanningSymbols(false), 600);
                  }}
                  disabled={botSettings.symbolMode !== 'auto' || isScanningSymbols}
                  className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider border rounded disabled:opacity-50 text-primary border-primary bg-primary/10"
                >
                  {isScanningSymbols ? '...' : 'Scan'}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1">
              Scan interval (sec)
              <input
                type="number"
                min={5}
                value={botSettings.scanIntervalSec}
                onChange={(e) => updateBotSettings({ scanIntervalSec: Number(e.target.value) || 5 })}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
            <label className="flex flex-col gap-1">
              Initial Margin (USDT)
              <input
                type="number"
                min={1}
                value={botSettings.initialMarginUsdt}
                onChange={(e) => updateBotSettings({ initialMarginUsdt: Number(e.target.value) || 1 })}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              Leverage ({botSettings.exchange})
              <input
                type="number"
                min={1}
                max={125}
                value={leverage}
                onChange={(e) =>
                  updateBotSettings({
                    leverageByExchange: {
                      ...botSettings.leverageByExchange,
                      [botSettings.exchange]: Number(e.target.value) || 1,
                    },
                  })
                }
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              Max loss/day (% of total traded)
              <input
                type="number"
                min={0}
                step={0.1}
                value={botSettings.maxLossPercentPerDay}
                onChange={(e) => updateBotSettings({ maxLossPercentPerDay: Number(e.target.value) || 0 })}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              />
            </label>
          </div>

          {botSettings.symbolMode === 'manual' && (
            <div className="space-y-1">
              <div className="text-xs font-mono text-primary-muted">Manual symbols (from sorted list)</div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
                {availableSymbols.map((symbol) => {
                  const selected = botSettings.manualSymbols.includes(symbol);
                  return (
                    <button
                      key={symbol}
                      onClick={() => toggleManualSymbol(symbol)}
                      className={`px-2 py-1 text-[10px] border rounded ${
                        selected ? 'border-primary text-primary bg-primary/10' : 'border-frame text-primary-muted'
                      }`}
                    >
                      {symbol}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="terminal-border p-3 space-y-2 text-xs font-mono">
          <div className="text-primary font-bold tracking-wider">ADVANCED RISK WARNING</div>
          <div className={`${riskLevel === 'HIGH' ? 'text-bearish' : riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-bullish'}`}>
            Risk level: {riskLevel} | leverage {leverage}x | max loss/day {botSettings.maxLossPercentPerDay}% | margin {botSettings.initialMarginUsdt} USDT
          </div>
          <div className="text-primary-muted">
            This bot executes real market orders automatically. Fast reversals and low liquidity can cause slippage and losses beyond expectation.
          </div>
          <div className="text-yellow-300">Mode: LIVE (real orders)</div>
          <div className="text-primary-muted">
            Server IP: {serverIpStatus.loading ? 'checking...' : serverIpStatus.ip || '-'}
            {serverIpStatus.ipWhitelistConfigured ? ` | Whitelist: ${serverIpStatus.expectedIp}` : ' | Whitelist: not configured'}
            <span className={canStartLive ? ' text-bullish' : ' text-bearish'}>
              {canStartLive ? ' | LIVE READY' : ' | LIVE BLOCKED'}
            </span>
          </div>
          <div className="text-[10px] text-yellow-300">
            Luu y: Binance signed orders da duoc gui qua server route, vi vay IP Binance kiem tra la IP VPS.
          </div>
          {serverIpStatus.error && <div className="text-bearish">IP check error: {serverIpStatus.error}</div>}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={riskAck} onChange={(e) => setRiskAck(e.target.checked)} />
            I understand auto-trading risk and accept responsibility.
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={riskAutoCloseAck} onChange={(e) => setRiskAutoCloseAck(e.target.checked)} />
            I allow emergency close-all when needed.
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleStartStop}
              disabled={!botSettings.enabled || !riskAck || !canStartLive}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border rounded disabled:opacity-50 ${
                isRunning
                  ? 'text-bearish border-bearish bg-bearish/10'
                  : 'text-bullish border-bullish bg-bullish/10'
              }`}
            >
              {isRunning ? 'Stop Bot' : 'Start Bot'}
            </button>
            <button
              onClick={closeAllPositionsNow}
              disabled={!riskAutoCloseAck || Object.keys(positions).length === 0}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border rounded disabled:opacity-50 text-yellow-300 border-yellow-300 bg-yellow-300/10"
            >
              Close all bot positions now
            </button>
            <button
              onClick={checkOpenOrdersNow}
              disabled={isCheckingOpenOrders}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border rounded disabled:opacity-50 text-primary border-primary bg-primary/10"
            >
              {isCheckingOpenOrders ? 'Checking...' : 'Check Binance open orders'}
            </button>
          </div>
          {openOrderCheck && (
            <div className="border border-frame rounded px-2 py-2 space-y-1">
              <div>
                Open orders @{new Date(openOrderCheck.checkedAt).toLocaleTimeString()} | total {openOrderCheck.total} | tracked {openOrderCheck.trackedRelated}
              </div>
              <div className={openOrderCheck.stalePotential > 0 ? 'text-yellow-300' : 'text-primary-muted'}>
                Potential stuck orders (&gt;{STALE_OPEN_ORDER_MINUTES}m, non-reduceOnly): {openOrderCheck.stalePotential}
              </div>
              <div className="text-primary-muted">
                By symbol: {Object.keys(openOrderCheck.bySymbol).length === 0
                  ? '-'
                  : Object.entries(openOrderCheck.bySymbol)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([symbol, count]) => `${symbol}:${count}`)
                    .join(', ')}
              </div>
            </div>
          )}
        </div>

        <div className="terminal-border p-3 text-xs font-mono space-y-1">
          <div>Status: {isRunning ? 'RUNNING' : 'STOPPED'} {isExecuting ? '(processing...)' : ''}</div>
          <div>Selected Exchange: {selectedExchange.toUpperCase()} (bot target: {botSettings.exchange.toUpperCase()})</div>
          <div>Tracked symbols: {trackedSymbols.join(', ') || '-'}</div>
          <div>Auto top{botSettings.autoTopSymbolsCount} now: {desiredAutoSymbols.join(', ') || '-'}</div>
          <div>Daily traded notional: ${dailyStats.totalTradedNotional.toFixed(2)}</div>
          <div>Daily realized PnL: ${dailyStats.realizedPnl.toFixed(2)}</div>
          <div>Expected notional/open: ${expectedNotionalPerPosition.toFixed(2)} ({botSettings.initialMarginUsdt} * {leverage}x)</div>
          <div className={hasAnyValueDriftWarning ? 'text-yellow-300' : 'text-primary-muted'}>
            Current value drift warn ({POSITION_VALUE_DRIFT_WARN_PCT}%+): {hasAnyValueDriftWarning ? 'YES' : 'NO'}
          </div>
          <div>Daily loss limit hit: {dailyStats.tradingDisabled ? 'YES' : 'NO'}</div>
        </div>

        <div className="terminal-border p-3 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <h3 className="text-primary text-xs font-bold tracking-wider">RITCHI MINI BACKTEST</h3>
            <div className="flex gap-2">
              <button
                onClick={() => runRitchiBacktest(backtestBars)}
                disabled={isBacktesting}
                className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border rounded disabled:opacity-50 text-primary border-primary bg-primary/10"
              >
                {isBacktesting ? 'Running...' : 'Run Backtest'}
              </button>
              <button
                onClick={() => runRitchiBacktestPresetCompare(backtestBars)}
                disabled={isBacktesting}
                className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border rounded disabled:opacity-50 text-yellow-300 border-yellow-300 bg-yellow-300/10"
              >
                Compare Presets
              </button>
              <button
                onClick={exportBacktestCsv}
                disabled={!backtestResult && backtestPresetResults.length === 0}
                className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border rounded disabled:opacity-50 text-bullish border-bullish bg-bullish/10"
              >
                Export Backtest CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <label className="flex flex-col gap-1">
              Backtest bars
              <input
                type="number"
                min={120}
                max={5000}
                value={backtestBars}
                onChange={(e) => setBacktestBars(Math.max(120, Math.min(5000, Number(e.target.value) || 120)))}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span>Mode</span>
              <span className="bg-bg-secondary border border-frame rounded px-2 py-1">{botSettings.symbolMode.toUpperCase()}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span>Timeframe</span>
              <span className="bg-bg-secondary border border-frame rounded px-2 py-1">{botSettings.timeframe}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span>Exchange</span>
              <span className="bg-bg-secondary border border-frame rounded px-2 py-1">BINANCE (phase 1)</span>
            </div>
          </div>
          {backtestResult ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>Total trades: {backtestResult.totalTrades}</div>
                <div>Win rate: {backtestResult.winRate.toFixed(2)}%</div>
                <div className={backtestResult.totalPnl >= 0 ? 'text-bullish' : 'text-bearish'}>
                  Total PnL: {backtestResult.totalPnl.toFixed(2)} USDT
                </div>
                <div>Max DD: {backtestResult.maxDrawdown.toFixed(2)} USDT</div>
              </div>
              <div>
                Symbols: {backtestResult.symbols.join(', ') || '-'} | Generated: {new Date(backtestResult.generatedAt).toLocaleString()}
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {backtestResult.bySymbol.map((item) => (
                  <div key={item.symbol} className="border border-frame rounded px-2 py-1 flex justify-between">
                    <span>{item.symbol} | trades {item.trades} | WR {item.winRate.toFixed(1)}%</span>
                    <span className={item.totalPnl >= 0 ? 'text-bullish' : 'text-bearish'}>
                      PnL {item.totalPnl.toFixed(2)} | DD {item.maxDrawdown.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-primary-muted">No backtest result yet</div>
          )}

          {backtestPresetResults.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-frame">
              <h4 className="text-primary text-xs font-bold tracking-wider">PRESET COMPARISON</h4>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {backtestPresetResults.map((preset) => (
                  <div key={preset.preset} className="border border-frame rounded px-2 py-1">
                    <div className="flex justify-between">
                      <span className="font-bold">{preset.preset}</span>
                      <span className={preset.result.totalPnl >= 0 ? 'text-bullish' : 'text-bearish'}>
                        PnL {preset.result.totalPnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-primary-muted">
                      Trades {preset.result.totalTrades} | WR {preset.result.winRate.toFixed(2)}% | DD {preset.result.maxDrawdown.toFixed(2)} | PF {Number.isFinite(preset.result.profitFactor) ? preset.result.profitFactor.toFixed(2) : 'INF'}
                    </div>
                    <div className="text-primary-muted">
                      piv {preset.config.pivLen} | sma {preset.config.smaMin}-{preset.config.smaMax} | mul {preset.config.smaMult.toFixed(2)} | trendLen {preset.config.trendLen} | atr {preset.config.atrMult.toFixed(2)} | tp {preset.config.tpMult.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="terminal-border p-3">
          <h3 className="text-primary text-xs font-bold tracking-wider mb-2">DAILY PNL BY SYMBOL</h3>
          <div className="space-y-1 text-xs font-mono">
            {pnlBySymbolRows.length === 0 && <div className="text-primary-muted">No closed trades today</div>}
            {pnlBySymbolRows.map(([symbol, pnl]) => (
              <div key={symbol} className="flex justify-between">
                <span>{symbol}</span>
                <span className="flex gap-3">
                  <span className={pnl >= 0 ? 'text-bullish' : 'text-bearish'}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)}
                  </span>
                  <span className="text-primary-muted">
                    WR {(() => {
                      const stat = winRateBySymbol[symbol];
                      if (!stat || stat.closed === 0) return '-';
                      return `${((stat.wins / stat.closed) * 100).toFixed(1)}%`;
                    })()}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-border p-3">
          <h3 className="text-primary text-xs font-bold tracking-wider mb-2">BOT POSITIONS</h3>
          <div className="space-y-2">
            {Object.keys(positions).length === 0 && (
              <div className="text-primary-muted text-xs font-mono">No bot-managed position</div>
            )}
            {Object.values(positions).map((position) => (
              <BotPositionCard
                key={position.symbol}
                symbol={position.symbol}
                side={position.side}
                size={position.size}
                entryPrice={position.entryPrice}
                notional={position.notional}
                expectedNotional={expectedNotionalPerPosition}
                leverage={leverage}
                onClose={(sym) => {
                  useBotTradingStore.getState().closePositionNow?.(sym);
                }}
              />
            ))}
          </div>
        </div>

        <div className="terminal-border p-3">
          <h3 className="text-primary text-xs font-bold tracking-wider mb-2">LAST SIGNALS</h3>
          <div className="space-y-1 text-xs font-mono">
            {trackedSymbols.map((symbol) => (
              <div key={symbol} className="flex justify-between">
                <span className="flex items-center gap-1">
                  {symbol}
                  {reversalPendingVerification[symbol] && (
                    <span className="text-yellow-400 text-[10px]" title="Reversal open failed — pending verification">⚠</span>
                  )}
                </span>
                <span>{lastSignals[symbol] || '-'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-primary text-xs font-bold tracking-wider">BOT ORDER LOGS</h3>
            <div className="flex gap-2">
              <select
                value={logSymbolFilter}
                onChange={(e) => setLogSymbolFilter(e.target.value)}
                className="bg-bg-secondary border border-frame rounded px-2 py-1 text-[10px] font-mono"
              >
                <option value="ALL">ALL</option>
                {Array.from(new Set(logs.map((log) => log.symbol))).map((symbol) => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
              <button
                onClick={clearLogs}
                className="px-2 py-1 text-[10px] font-mono border border-frame rounded text-primary-muted hover:text-primary"
              >
                Clear
              </button>
              <button
                onClick={exportLogsCsv}
                className="px-2 py-1 text-[10px] font-mono border border-primary rounded text-primary hover:bg-primary/10"
              >
                Export CSV
              </button>
              <label className="px-2 py-1 text-[10px] font-mono border border-frame rounded text-primary-muted hover:text-primary cursor-pointer">
                Import CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
              </label>
            </div>
          </div>
          <div className="space-y-1 text-[10px] font-mono max-h-72 overflow-y-auto">
            {filteredLogs.length === 0 && <div className="text-primary-muted">No logs</div>}
            {filteredLogs.map((log) => (
              <div key={log.id} className="border border-frame rounded px-2 py-1">
                <div className="flex justify-between">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span>{log.symbol}</span>
                </div>
                <div className="text-primary-muted">
                  {log.indicator} | {log.action} {log.side ? `| ${log.side}` : ''} {log.signal ? `| signal ${log.signal}` : ''}
                </div>
                <div>{log.message}</div>
                {(log.price || log.size || typeof log.realizedPnl === 'number') && (
                  <div className="text-primary-muted">
                    {typeof log.price === 'number' ? `price ${log.price.toFixed(4)} ` : ''}
                    {typeof log.size === 'number' ? `size ${log.size.toFixed(4)} ` : ''}
                    {typeof log.realizedPnl === 'number' ? `pnl ${log.realizedPnl.toFixed(4)}` : ''}
                  </div>
                )}
                {typeof log.slippageBps === 'number' && (
                  <div className="text-yellow-400/80">
                    {typeof log.closePrice === 'number' ? `close ${log.closePrice.toFixed(4)} ` : ''}
                    {typeof log.openPrice === 'number' ? `open ${log.openPrice.toFixed(4)} ` : ''}
                    {`slip ${log.slippageBps.toFixed(1)} bps`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
