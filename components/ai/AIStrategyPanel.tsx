'use client';

import { useAIStrategyStore } from '@/stores/useAIStrategyStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

export default function AIStrategyPanel() {
  const { isAnalyzing, lastResult, history, callsThisHour, error } = useAIStrategyStore();
  const { settings } = useSettingsStore();

  if (!settings.ai.enabled) return null;

  return (
    <div className="border border-frame rounded bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-frame">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-yellow-400 animate-pulse' : settings.ai.claudeApiKey ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs font-mono text-primary uppercase tracking-wider">AI Strategy</span>
        </div>
        <span className="text-[10px] font-mono text-primary-muted">{callsThisHour} calls/h</span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
          <span className="text-[10px] font-mono text-red-400">{error}</span>
        </div>
      )}

      {/* No API Key Warning */}
      {!settings.ai.claudeApiKey && (
        <div className="px-3 py-4 text-center">
          <span className="text-[10px] font-mono text-primary-muted">Set Claude API key in Settings → AI</span>
        </div>
      )}

      {/* Analyzing */}
      {isAnalyzing && (
        <div className="px-3 py-3 text-center">
          <span className="text-xs font-mono text-yellow-400 animate-pulse">Analyzing signal...</span>
        </div>
      )}

      {/* Latest Result */}
      {lastResult && !isAnalyzing && (
        <div className="p-3 space-y-2">
          {/* Action Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                lastResult.action === 'BUY' ? 'bg-green-500/20 text-green-400' :
                lastResult.action === 'SELL' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {lastResult.action}
              </span>
              <span className="text-xs font-mono text-primary">{lastResult.symbol}</span>
            </div>
            <span className="text-[10px] font-mono text-primary-muted">
              {new Date(lastResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Confidence Bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-mono text-primary-muted">Confidence</span>
              <span className={`text-[10px] font-mono ${
                lastResult.confidence >= 0.8 ? 'text-green-400' :
                lastResult.confidence >= 0.6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {(lastResult.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  lastResult.confidence >= 0.8 ? 'bg-green-400' :
                  lastResult.confidence >= 0.6 ? 'bg-yellow-400' :
                  'bg-red-400'
                }`}
                style={{ width: `${lastResult.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Price Levels */}
          {lastResult.action !== 'WAIT' && (
            <div className="grid grid-cols-3 gap-2">
              {lastResult.entryPrice && (
                <div className="bg-bg-primary rounded px-2 py-1.5">
                  <div className="text-[9px] font-mono text-primary-muted">ENTRY</div>
                  <div className="text-[11px] font-mono text-primary">${lastResult.entryPrice}</div>
                </div>
              )}
              {lastResult.tp && (
                <div className="bg-bg-primary rounded px-2 py-1.5">
                  <div className="text-[9px] font-mono text-green-400">TP</div>
                  <div className="text-[11px] font-mono text-green-400">${lastResult.tp}</div>
                </div>
              )}
              {lastResult.sl && (
                <div className="bg-bg-primary rounded px-2 py-1.5">
                  <div className="text-[9px] font-mono text-red-400">SL</div>
                  <div className="text-[11px] font-mono text-red-400">${lastResult.sl}</div>
                </div>
              )}
            </div>
          )}

          {/* Reasoning */}
          <div className="bg-bg-primary rounded px-2 py-1.5">
            <div className="text-[9px] font-mono text-primary-muted mb-0.5">REASONING</div>
            <div className="text-[10px] font-mono text-primary leading-relaxed">{lastResult.reasoning}</div>
          </div>

          {/* R:R */}
          {lastResult.riskReward && (
            <div className="text-[10px] font-mono text-primary-muted text-right">
              R:R {lastResult.riskReward.toFixed(1)}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="border-t border-frame">
          <div className="px-3 py-1.5">
            <span className="text-[9px] font-mono text-primary-muted uppercase tracking-wider">Recent ({history.length})</span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {history.slice(1, 6).map((r, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1 border-t border-frame/50 hover:bg-bg-primary/50">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold ${
                    r.action === 'BUY' ? 'text-green-400' :
                    r.action === 'SELL' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {r.action}
                  </span>
                  <span className="text-[10px] font-mono text-primary">{r.symbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-primary-muted">{(r.confidence * 100).toFixed(0)}%</span>
                  <span className="text-[9px] font-mono text-primary-muted/50">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
