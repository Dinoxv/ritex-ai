'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';
import { useShallow } from 'zustand/shallow';

interface LegendToggleItem {
  color: string;
  label: string;
  description: string;
  shape?: 'circle' | 'line';
  settingKey: string;
}

interface ChartLegendProps {
  className?: string;
}

const SIGNAL_COLORS = {
  ema: '#00D9FF',
  macd: '#FF6B35',
  rsi: '#FFD700',
  divergence: '#9D4EDD',
  hiddenDivergence: '#00FF7F',
  pivot: '#888888',
  breakeven: '#FFFF00',
};

const SIGNAL_LEGEND_ITEMS: LegendToggleItem[] = [
  { color: SIGNAL_COLORS.ema, label: 'EMA', description: 'EMA Alignment signals', shape: 'circle', settingKey: 'showEmaSignals' },
  { color: SIGNAL_COLORS.macd, label: 'MACD', description: 'MACD Crossover signals', shape: 'circle', settingKey: 'showMacdSignals' },
  { color: SIGNAL_COLORS.rsi, label: 'RSI', description: 'RSI Reversal signals', shape: 'circle', settingKey: 'showRsiSignals' },
  { color: SIGNAL_COLORS.divergence, label: 'Div', description: 'Stochastic Divergence signals', shape: 'circle', settingKey: 'showDivergenceSignals' },
  { color: SIGNAL_COLORS.hiddenDivergence, label: 'H-Div', description: 'Hidden Divergence signals', shape: 'circle', settingKey: 'showHiddenDivergence' },
  { color: SIGNAL_COLORS.pivot, label: 'Pivot', description: 'Price Pivot Points', shape: 'circle', settingKey: 'showPivotMarkers' },
  { color: SIGNAL_COLORS.breakeven, label: 'Breakeven', description: 'Fee breakeven zone', shape: 'line', settingKey: 'showBreakeven' },
];

export default function ChartLegend({ className = '' }: ChartLegendProps) {
  const { chartSettings, updateSettings, emaSettings, updateEmaSettings, stochasticSettings, updateStochasticSettings } = useSettingsStore(
    useShallow((s) => ({
      chartSettings: s.settings.chart,
      updateSettings: s.updateSettings,
      emaSettings: s.settings.indicators.ema,
      updateEmaSettings: s.updateEmaSettings,
      stochasticSettings: s.settings.indicators.stochastic,
      updateStochasticSettings: s.updateStochasticSettings,
    }))
  );

  const toggleSignal = (key: string) => {
    const current = (chartSettings as any)[key];
    updateSettings({ chart: { ...chartSettings, [key]: !current } });
  };

  const toggleEma = (emaKey: 'ema1' | 'ema2' | 'ema3') => {
    const current = emaSettings[emaKey];
    updateEmaSettings({ [emaKey]: { ...current, enabled: !current.enabled } });
  };

  const toggleStochVariant = (variant: string) => {
    const current = (stochasticSettings.variants as any)[variant];
    updateStochasticSettings({
      variants: { ...stochasticSettings.variants, [variant]: { ...current, enabled: !current.enabled } },
    });
  };

  const emaLineItems = [
    { key: 'ema1' as const, color: 'var(--accent-blue)', period: emaSettings.ema1.period, enabled: emaSettings.ema1.enabled },
    { key: 'ema2' as const, color: 'var(--accent-rose)', period: emaSettings.ema2.period, enabled: emaSettings.ema2.enabled },
    { key: 'ema3' as const, color: 'var(--status-bullish)', period: emaSettings.ema3.period, enabled: emaSettings.ema3.enabled },
  ];

  const stochVariants = [
    { key: 'ultraFast', label: 'UF', color: '#FF10FF', enabled: stochasticSettings.variants.ultraFast.enabled },
    { key: 'fast', label: 'F', color: '#00D9FF', enabled: stochasticSettings.variants.fast.enabled },
    { key: 'medium', label: 'M', color: '#FF8C00', enabled: stochasticSettings.variants.medium.enabled },
    { key: 'slow', label: 'S', color: '#00FF7F', enabled: stochasticSettings.variants.slow.enabled },
  ];

  return (
    <div className={`text-[9px] flex items-center gap-2 flex-wrap ${className}`}>
      {SIGNAL_LEGEND_ITEMS.map((item) => {
        const enabled = (chartSettings as any)[item.settingKey] ?? true;
        return (
          <button
            key={item.settingKey}
            onClick={() => toggleSignal(item.settingKey)}
            title={`${item.description} (click to toggle)`}
            className={`flex items-center gap-1 cursor-pointer select-none transition-opacity duration-150 ${
              enabled ? 'opacity-100' : 'opacity-30'
            }`}
          >
            {item.shape === 'line' ? (
              <div className="w-4 h-[3px] flex-shrink-0" style={{ backgroundColor: item.color }} />
            ) : (
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            )}
            <span className={`whitespace-nowrap ${enabled ? 'text-primary' : 'text-primary-muted line-through'}`}>
              {item.label}
            </span>
          </button>
        );
      })}

      <div className="w-px h-3 bg-frame mx-0.5" />

      {emaLineItems.map((ema) => (
        <button
          key={ema.key}
          onClick={() => toggleEma(ema.key)}
          title={`EMA ${ema.period} line (click to toggle)`}
          className={`flex items-center gap-1 cursor-pointer select-none transition-opacity duration-150 ${
            ema.enabled ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div className="w-4 h-0.5" style={{ backgroundColor: ema.color }} />
          <span className={`whitespace-nowrap ${ema.enabled ? 'text-primary' : 'text-primary-muted line-through'}`}>
            EMA {ema.period}
          </span>
        </button>
      ))}

      <div className="w-px h-3 bg-frame mx-0.5" />

      {stochVariants.map((sv) => (
        <button
          key={sv.key}
          onClick={() => toggleStochVariant(sv.key)}
          title={`Stochastic ${sv.label} (click to toggle)`}
          className={`flex items-center gap-1 cursor-pointer select-none transition-opacity duration-150 ${
            sv.enabled ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div className="w-4 h-0.5" style={{ backgroundColor: sv.color }} />
          <span className={`whitespace-nowrap ${sv.enabled ? 'text-primary' : 'text-primary-muted line-through'}`}>
            STOCH {sv.label}
          </span>
        </button>
      ))}
    </div>
  );
}
