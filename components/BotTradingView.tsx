'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTopSymbolsStore } from '@/stores/useTopSymbolsStore';
import { useBotTradingStore } from '@/stores/useBotTradingStore';
import { useDexStore } from '@/stores/useDexStore';
import type { BotIndicatorType } from '@/models/Settings';
import type { BotLogEntry } from '@/stores/useBotTradingStore';
import toast from 'react-hot-toast';

export default function BotTradingView() {
  const { settings, updateBotSettings } = useSettingsStore();
  const botSettings = settings.bot;
  const topSymbols = useTopSymbolsStore((state) => state.symbols);
  const selectedExchange = useDexStore((state) => state.selectedExchange);
  const {
    isRunning,
    isExecuting,
    trackedSymbols,
    desiredAutoSymbols,
    positions,
    lastSignals,
    dailyStats,
    logs,
    start,
    stop,
    closeAllPositionsNow,
    clearLogs,
    importLogs,
    toggleManualSymbol,
  } = useBotTradingStore();
  const [riskAck, setRiskAck] = useState(false);
  const [riskAutoCloseAck, setRiskAutoCloseAck] = useState(false);
  const [logSymbolFilter, setLogSymbolFilter] = useState('ALL');

  const leverage = botSettings.leverageByExchange[botSettings.exchange];
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

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="fixed top-3 right-3 z-20 pointer-events-none">
        <div
          className={`px-4 py-2 text-sm font-bold tracking-widest border rounded shadow-lg ${
            botSettings.paperMode
              ? 'text-bullish border-bullish bg-bullish/20'
              : 'text-bearish border-bearish bg-bearish/20'
          }`}
        >
          {botSettings.paperMode ? 'PAPER MODE' : 'LIVE MODE'}
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
          <label className="flex items-center gap-2 text-xs font-mono">
            <input
              type="checkbox"
              checked={botSettings.paperMode}
              onChange={(e) => updateBotSettings({ paperMode: e.target.checked })}
            />
            Paper mode (simulate only, no real orders)
          </label>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <label className="flex flex-col gap-1">
              Exchange
              <select
                value={botSettings.exchange}
                onChange={(e) => updateBotSettings({ exchange: e.target.value as 'binance' | 'hyperliquid' })}
                className="bg-bg-secondary border border-frame rounded px-2 py-1"
              >
                <option value="binance">Binance</option>
                <option value="hyperliquid">Hyperliquid</option>
              </select>
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
                <option value="auto">Auto top 3 volatility</option>
                <option value="manual">Manual</option>
              </select>
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
          <div className={`${botSettings.paperMode ? 'text-bullish' : 'text-yellow-300'}`}>
            Mode: {botSettings.paperMode ? 'PAPER (safe test)' : 'LIVE (real orders)'}
          </div>
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
              onClick={isRunning ? stop : start}
              disabled={!botSettings.enabled || !riskAck}
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
          </div>
        </div>

        <div className="terminal-border p-3 text-xs font-mono space-y-1">
          <div>Status: {isRunning ? 'RUNNING' : 'STOPPED'} {isExecuting ? '(processing...)' : ''}</div>
          <div>Selected Exchange: {selectedExchange.toUpperCase()} (bot target: {botSettings.exchange.toUpperCase()})</div>
          <div>Tracked symbols: {trackedSymbols.join(', ') || '-'}</div>
          <div>Auto top3 now: {desiredAutoSymbols.join(', ') || '-'}</div>
          <div>Daily traded notional: ${dailyStats.totalTradedNotional.toFixed(2)}</div>
          <div>Daily realized PnL: ${dailyStats.realizedPnl.toFixed(2)}</div>
          <div>Daily loss limit hit: {dailyStats.tradingDisabled ? 'YES' : 'NO'}</div>
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
          <div className="space-y-1 text-xs font-mono">
            {Object.keys(positions).length === 0 && <div className="text-primary-muted">No bot-managed position</div>}
            {Object.values(positions).map((position) => (
              <div key={position.symbol} className="flex justify-between">
                <span>{position.symbol}</span>
                <span>{position.side.toUpperCase()} | size {position.size.toFixed(4)} | entry {position.entryPrice.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-border p-3">
          <h3 className="text-primary text-xs font-bold tracking-wider mb-2">LAST SIGNALS</h3>
          <div className="space-y-1 text-xs font-mono">
            {trackedSymbols.map((symbol) => (
              <div key={symbol} className="flex justify-between">
                <span>{symbol}</span>
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
