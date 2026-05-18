'use client';

import { type ReactNode, useState } from 'react';
import type { TimeInterval } from '@/types';
import { DropdownMenu } from '@/components/ui/DropdownMenu';

export type ChartType =
  | 'bar'
  | 'candlestick'
  | 'hollow-candles'
  | 'line'
  | 'line-with-markers'
  | 'step-line'
  | 'area'
  | 'hlc-area'
  | 'baseline'
  | 'columns'
  | 'high-low'
  | 'heikin-ashi';

interface IntervalItem {
  value: TimeInterval;
  label: string;
  favorite?: boolean;
}

const INTERVAL_GROUPS: { title: string; items: IntervalItem[] }[] = [
  {
    title: 'Minutes',
    items: [
      { value: '1m', label: '1 min' },
      { value: '3m', label: '3 min' },
      { value: '5m', label: '5 min' },
      { value: '15m', label: '15 min' },
      { value: '30m', label: '30 min' },
    ],
  },
  {
    title: 'Hours',
    items: [
      { value: '1h', label: '1 hour', favorite: true },
      { value: '2h', label: '2 hours' },
      { value: '4h', label: '4 hours' },
      { value: '8h', label: '8 hours' },
      { value: '12h', label: '12 hours' },
    ],
  },
  {
    title: 'Days',
    items: [
      { value: '1d', label: '1 day', favorite: true },
      { value: '3d', label: '3 days' },
      { value: '1w', label: '1 week' },
      { value: '1M', label: '1 month' },
    ],
  },
];

const FAVORITE_INTERVALS: { value: TimeInterval; label: string }[] = [
  { value: '5m', label: '5m' },
  { value: '1h', label: '1h' },
  { value: '1d', label: '1d' },
];

const SHORT_LABEL: Record<TimeInterval, string> = {
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '8h': '8h', '12h': '12h',
  '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M',
};

// ---------------- chart-type icons ----------------

const IconCandles = (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <line x1="8" y1="6" x2="8" y2="26" stroke="currentColor" strokeWidth="1.5" />
    <rect x="6" y="10" width="4" height="10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" />
    <line x1="18" y1="5" x2="18" y2="25" stroke="currentColor" strokeWidth="1.5" />
    <rect x="16" y="8" width="4" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const IconBars = (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <line x1="6" y1="7" x2="6" y2="25" stroke="currentColor" strokeWidth="1.5" />
    <line x1="3" y1="11" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" />
    <line x1="6" y1="19" x2="9" y2="19" stroke="currentColor" strokeWidth="1.5" />
    <line x1="14" y1="5" x2="14" y2="23" stroke="currentColor" strokeWidth="1.5" />
    <line x1="11" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <line x1="14" y1="17" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" />
    <line x1="22" y1="9" x2="22" y2="27" stroke="currentColor" strokeWidth="1.5" />
    <line x1="22" y1="13" x2="25" y2="13" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconHollow = (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <line x1="8" y1="6" x2="8" y2="26" stroke="currentColor" strokeWidth="1.5" />
    <rect x="6" y="10" width="4" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="18" y1="5" x2="18" y2="25" stroke="currentColor" strokeWidth="1.5" />
    <rect x="16" y="8" width="4" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="24" y1="8" x2="28" y2="12" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconLine = (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <path d="M4 22 L10 18 L14 20 L20 12 L26 14 L28 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconLineMarkers = (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <path d="M4 22 L10 18 L14 20 L20 12 L26 14 L28 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="4" cy="22" r="1.6" fill="currentColor" />
    <circle cx="10" cy="18" r="1.6" fill="currentColor" />
    <circle cx="14" cy="20" r="1.6" fill="currentColor" />
    <circle cx="20" cy="12" r="1.6" fill="currentColor" />
    <circle cx="26" cy="14" r="1.6" fill="currentColor" />
    <circle cx="28" cy="10" r="1.6" fill="currentColor" />
  </svg>
);

const IconStep = (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <path d="M4 22 H10 V16 H16 V12 H22 V9 H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconArea = (
  <svg viewBox="0 0 32 32" fill="currentColor" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <path d="M4 28 L4 21 L10 17 L14 19 L20 12 L26 14 L28 11 L28 28 Z" opacity="0.45" />
    <path d="M4 21 L10 17 L14 19 L20 12 L26 14 L28 11" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconHlcArea = (
  <svg viewBox="0 0 32 32" fill="currentColor" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <path d="M4 28 L4 22 L10 19 L14 21 L20 16 L26 18 L28 15 L28 28 Z" opacity="0.35" />
    <path d="M4 22 L10 19 L14 21 L20 16 L26 18 L28 15" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M4 20 L10 15 L14 16 L20 9 L26 11 L28 8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.75" />
  </svg>
);

const IconBaseline = (
  <svg viewBox="0 0 32 32" fill="currentColor" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <line x1="4" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.55" />
    <path d="M4 20 L10 16 L14 18 L20 11 L26 13 L28 9" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M4 20 L10 16 L14 18 L20 11 L26 13 L28 9 L28 20 L4 20 Z" opacity="0.25" />
  </svg>
);

const IconColumns = (
  <svg viewBox="0 0 32 32" fill="currentColor" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <rect x="4" y="21" width="3" height="7" />
    <rect x="8" y="17" width="3" height="11" />
    <rect x="12" y="19" width="3" height="9" />
    <rect x="16" y="14" width="3" height="14" />
    <rect x="20" y="11" width="3" height="17" />
    <rect x="24" y="8" width="3" height="20" />
  </svg>
);

const IconHighLow = (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <line x1="8" y1="6" x2="8" y2="26" stroke="currentColor" strokeWidth="1.7" />
    <line x1="8" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1.7" />
    <line x1="16" y1="8" x2="16" y2="24" stroke="currentColor" strokeWidth="1.7" />
    <line x1="16" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="1.7" />
    <line x1="24" y1="5" x2="24" y2="27" stroke="currentColor" strokeWidth="1.7" />
    <line x1="24" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

const IconHeikin = (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 inline-block" style={{ verticalAlign: 'text-bottom' }}>
    <line x1="8" y1="6" x2="8" y2="26" stroke="currentColor" strokeWidth="1.5" />
    <rect x="6" y="11" width="4" height="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="18" y1="6" x2="18" y2="26" stroke="currentColor" strokeWidth="1.5" />
    <rect x="16" y="8" width="4" height="10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" />
    <path d="M23 20 L28 14" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

interface ChartTypeItem {
  value: ChartType;
  label: string;
  icon: ReactNode;
}

const CHART_TYPE_GROUPS: ChartTypeItem[][] = [
  [
    { value: 'bar', label: 'Bars', icon: IconBars },
    { value: 'candlestick', label: 'Candles', icon: IconCandles },
    { value: 'hollow-candles', label: 'Hollow candles', icon: IconHollow },
  ],
  [
    { value: 'line', label: 'Line', icon: IconLine },
    { value: 'line-with-markers', label: 'Line with markers', icon: IconLineMarkers },
    { value: 'step-line', label: 'Step line', icon: IconStep },
  ],
  [
    { value: 'area', label: 'Area', icon: IconArea },
    { value: 'hlc-area', label: 'HLC area', icon: IconHlcArea },
    { value: 'baseline', label: 'Baseline', icon: IconBaseline },
  ],
  [
    { value: 'columns', label: 'Columns', icon: IconColumns },
    { value: 'high-low', label: 'High-low', icon: IconHighLow },
  ],
  [
    { value: 'heikin-ashi', label: 'Heikin Ashi', icon: IconHeikin },
  ],
];

function getChartTypeIcon(value: ChartType): ReactNode {
  for (const grp of CHART_TYPE_GROUPS) {
    for (const item of grp) {
      if (item.value === value) return item.icon;
    }
  }
  return IconCandles;
}

// ---------------- props ----------------

export interface IndicatorOption {
  id: string;
  label: string;
  color: string;
}

export interface ChartToolbarProps {
  interval: TimeInterval;
  onIntervalChange: (next: TimeInterval) => void;
  chartType: ChartType;
  onChartTypeChange: (next: ChartType) => void;
  indicators: IndicatorOption[];
  enabledIndicators: Record<string, boolean>;
  onToggleIndicator: (id: string) => void;
  trendMatrixSettings?: {
    msLen: number;
    htfEmaLen: number;
    atrLength: number;
    atrMult: number;
    targetStepMult: number;
    riskPercent: number;
    maxLossPercent: number;
    partialTpPct: number;
    bullColor: string;
    bearColor: string;
    showSig: boolean;
    showTP: boolean;
    showStop: boolean;
    showHTF: boolean;
    showPending: boolean;
  };
  onTrendMatrixSettingsChange?: (next: Partial<NonNullable<ChartToolbarProps['trendMatrixSettings']>>) => void;
}

const EXCLUDED_INDICATOR_IDS = new Set([
  'ema5',
  'ema13',
  'ema21',
  'sma20',
  'bbUpper',
  'bbMid',
  'bbLower',
  'emaAlign',
]);

const EXCLUDED_INDICATOR_LABELS = [
  'ema 5',
  'ema 13',
  'ema 21',
  'sma 20',
  'bb upper',
  'bb basis',
  'bb lower',
  'ema alignment',
];

const isExcludedIndicator = (indicator: IndicatorOption): boolean => {
  if (EXCLUDED_INDICATOR_IDS.has(indicator.id)) {
    return true;
  }

  const normalizedLabel = indicator.label.trim().toLowerCase();
  return EXCLUDED_INDICATOR_LABELS.some((excludedLabel) => normalizedLabel.includes(excludedLabel));
};

const TREND_MATRIX_DEFAULTS: NonNullable<ChartToolbarProps['trendMatrixSettings']> = {
  msLen: 10,
  htfEmaLen: 50,
  atrLength: 14,
  atrMult: 4,
  targetStepMult: 2,
  riskPercent: 1,
  maxLossPercent: 3,
  partialTpPct: 25,
  bullColor: '#34e67e',
  bearColor: '#ff52f1',
  showSig: true,
  showTP: true,
  showStop: true,
  showHTF: true,
  showPending: true,
};

export function ChartToolbar({
  interval,
  onIntervalChange,
  chartType,
  onChartTypeChange,
  indicators,
  enabledIndicators,
  onToggleIndicator,
  trendMatrixSettings,
  onTrendMatrixSettingsChange,
}: ChartToolbarProps) {
  const activeClass = 'text-[#26a69a]';
  const idleClass = 'text-gray-300 hover:text-white hover:bg-gray-700';
  const [trendMatrixOpen, setTrendMatrixOpen] = useState(false);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const normalizedIndicatorSearch = indicatorSearch.trim().toLowerCase();
  const visibleIndicators = indicators.filter((indicator) => !isExcludedIndicator(indicator));
  const filteredIndicators = visibleIndicators.filter((indicator) =>
    indicator.label.toLowerCase().includes(normalizedIndicatorSearch) ||
    indicator.id.toLowerCase().includes(normalizedIndicatorSearch)
  );

  return (
    <div
      className="flex items-center border-b border-gray-700 px-4 pt-2 pb-1 w-full min-w-0 space-x-4 bg-[#0f1722]"
      data-parity-id="chart-toolbar"
    >
      {/* Timeframe group */}
      <div className="flex items-center space-x-1">
        {FAVORITE_INTERVALS.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => onIntervalChange(b.value)}
            className={`${interval === b.value ? activeClass : idleClass} relative px-3 py-1 text-sm font-medium rounded transition-colors`}
          >
            {b.label}
          </button>
        ))}

        <DropdownMenu
          title="Timeframes"
          trigger={() => (
            <button
              type="button"
              aria-label="More timeframes"
              className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <span className="inline-block transition-transform duration-200 ease-in-out">▼</span>
            </button>
          )}
        >
          <div className="bg-[#0b1320]">
            {INTERVAL_GROUPS.map((group, gi) => (
              <div key={group.title}>
                <div className={`px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-800 ${gi > 0 ? 'border-t border-gray-800' : ''}`}>
                  {group.title}
                </div>
                {group.items.map((it) => {
                  const active = interval === it.value;
                  return (
                    <button
                      key={it.value}
                      type="button"
                      onClick={() => onIntervalChange(it.value)}
                      className={`${active ? 'bg-white/5 text-white' : 'text-gray-300 hover:bg-gray-800/80'} ${it.favorite ? 'relative' : ''} block w-full text-left px-3 py-2.5 text-sm transition-colors`}
                    >
                      {it.label}
                      {it.favorite && (
                        <span className="absolute right-2 top-2.5 text-yellow-400 text-xs">⭐</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </DropdownMenu>
      </div>

      <div className="w-px h-6 bg-gray-700" />

      {/* Chart type */}
      <div className="flex items-center gap-1">
        <DropdownMenu
          minWidth="min-w-52"
          title="Chart types"
          trigger={() => (
            <button
              type="button"
              aria-label="Chart type"
              className="flex items-center justify-center h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <span className="inline-flex items-center justify-center leading-none">
                {getChartTypeIcon(chartType)}
              </span>
            </button>
          )}
        >
          <div className="bg-[#0b1320]">
            {CHART_TYPE_GROUPS.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && <div className="border-t border-gray-800" />}
                {group.map((it) => {
                  const active = chartType === it.value;
                  return (
                    <button
                      key={it.value}
                      type="button"
                      onClick={() => onChartTypeChange(it.value)}
                      className={`${active ? 'bg-white/5 text-white' : 'text-gray-300 hover:bg-gray-800/80'} block w-full text-left px-3 py-2.5 text-sm transition-colors`}
                    >
                      <span className="mr-2">{it.icon}</span>
                      {it.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </DropdownMenu>
      </div>

      <div className="w-px h-6 bg-gray-700" />

      {/* Indicators (stub) */}
      <div className="relative">
        <DropdownMenu
          minWidth="min-w-[22rem]"
          title="Indicators"
          trigger={() => (
            <button
              type="button"
              aria-label="Indicators"
              className="flex items-center gap-1.5 h-8 px-3 text-base font-medium rounded-none transition-colors text-gray-300 bg-gray-900/40 hover:text-white hover:bg-gray-800/70"
            >
              <span>Indicators</span>
              <span className="text-[10px] opacity-70">▾</span>
            </button>
          )}
        >
          <div className="px-3 py-3 border-b border-gray-700 bg-[#0b1320]">
            <div className="flex items-center gap-2 rounded border border-gray-700 bg-[#101827] px-3 py-2 text-gray-300">
              <span className="text-gray-500">⌕</span>
              <input
                type="text"
                value={indicatorSearch}
                onChange={(e) => setIndicatorSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm text-gray-200 placeholder:text-gray-500 outline-none"
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto bg-[#0b1320]">
            <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-800">
              Chart Indicators
            </div>
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-gray-300 opacity-80"
            >
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-[2px] bg-cyan-400" />
                Volume
              </span>
              <span className="text-xs text-gray-500">On</span>
            </button>

            <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-y border-gray-800">
              Script Name
            </div>

            {filteredIndicators.length > 0 ? (
              filteredIndicators.map((ind) => {
                const on = !!enabledIndicators[ind.id];
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => onToggleIndicator(ind.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-800/80 ${on ? 'text-white' : 'text-gray-300'}`}
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-[2px] border border-gray-500 text-[10px] font-bold" style={{ backgroundColor: on ? ind.color : 'transparent', color: on ? '#0b1320' : 'transparent' }}>
                      {on ? '✓' : ''}
                    </span>
                    <span className="inline-block h-[2px] w-4 rounded-full" style={{ backgroundColor: ind.color }} />
                    <span className="flex-1">{ind.label}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-gray-500">No indicators found.</div>
            )}
          </div>

          {trendMatrixSettings && onTrendMatrixSettingsChange && (
            <>
              <div className="border-t border-gray-700 mt-1" />
              <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setTrendMatrixOpen((v) => !v)}
                  className="text-xs text-gray-400 uppercase font-semibold hover:text-gray-200"
                >
                  Trend Matrix Settings {trendMatrixOpen ? '▲' : '▼'}
                </button>
                <button
                  type="button"
                  onClick={() => onTrendMatrixSettingsChange(TREND_MATRIX_DEFAULTS)}
                  className="text-[11px] text-cyan-300 hover:text-cyan-200"
                >
                  Reset
                </button>
              </div>

              {trendMatrixOpen && (
              <div className="px-3 py-2 grid grid-cols-2 gap-2 text-xs text-gray-300">
                <label className="flex flex-col gap-1">
                  <span>MS Len</span>
                  <input
                    type="number"
                    min={2}
                    value={trendMatrixSettings.msLen}
                    onChange={(e) => onTrendMatrixSettingsChange({ msLen: Number(e.target.value) || 2 })}
                    className="bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>HTF EMA</span>
                  <input
                    type="number"
                    min={2}
                    value={trendMatrixSettings.htfEmaLen}
                    onChange={(e) => onTrendMatrixSettingsChange({ htfEmaLen: Number(e.target.value) || 2 })}
                    className="bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>ATR Len</span>
                  <input
                    type="number"
                    min={1}
                    value={trendMatrixSettings.atrLength}
                    onChange={(e) => onTrendMatrixSettingsChange({ atrLength: Number(e.target.value) || 1 })}
                    className="bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>ATR Mult</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={trendMatrixSettings.atrMult}
                    onChange={(e) => onTrendMatrixSettingsChange({ atrMult: Number(e.target.value) || 0.1 })}
                    className="bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>TP Step Mult</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={trendMatrixSettings.targetStepMult}
                    onChange={(e) => onTrendMatrixSettingsChange({ targetStepMult: Number(e.target.value) || 0.1 })}
                    className="bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Risk %</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={trendMatrixSettings.riskPercent}
                    onChange={(e) => onTrendMatrixSettingsChange({ riskPercent: Number(e.target.value) || 0.1 })}
                    className="bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Max Loss %</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={trendMatrixSettings.maxLossPercent}
                    onChange={(e) => onTrendMatrixSettingsChange({ maxLossPercent: Number(e.target.value) || 0.1 })}
                    className="bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Partial TP %</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={trendMatrixSettings.partialTpPct}
                    onChange={(e) => onTrendMatrixSettingsChange({ partialTpPct: Number(e.target.value) || 0.1 })}
                    className="bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Bull Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={trendMatrixSettings.bullColor}
                      onChange={(e) => onTrendMatrixSettingsChange({ bullColor: e.target.value })}
                      className="h-7 w-10 bg-transparent border border-gray-700 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={trendMatrixSettings.bullColor}
                      onChange={(e) => onTrendMatrixSettingsChange({ bullColor: e.target.value })}
                      className="flex-1 bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span>Bear Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={trendMatrixSettings.bearColor}
                      onChange={(e) => onTrendMatrixSettingsChange({ bearColor: e.target.value })}
                      className="h-7 w-10 bg-transparent border border-gray-700 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={trendMatrixSettings.bearColor}
                      onChange={(e) => onTrendMatrixSettingsChange({ bearColor: e.target.value })}
                      className="flex-1 bg-[#0f1722] border border-gray-700 rounded px-2 py-1"
                    />
                  </div>
                </label>
              </div>
              )}

              {trendMatrixOpen && (
              <div className="px-3 pb-3 grid grid-cols-2 gap-2 text-xs text-gray-300">
                <label className="flex items-center gap-2"><input type="checkbox" checked={trendMatrixSettings.showSig} onChange={(e) => onTrendMatrixSettingsChange({ showSig: e.target.checked })} /> Show Signal</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={trendMatrixSettings.showTP} onChange={(e) => onTrendMatrixSettingsChange({ showTP: e.target.checked })} /> Show TP</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={trendMatrixSettings.showStop} onChange={(e) => onTrendMatrixSettingsChange({ showStop: e.target.checked })} /> Show Stop</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={trendMatrixSettings.showHTF} onChange={(e) => onTrendMatrixSettingsChange({ showHTF: e.target.checked })} /> Show HTF</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={trendMatrixSettings.showPending} onChange={(e) => onTrendMatrixSettingsChange({ showPending: e.target.checked })} /> Show Pending</label>
              </div>
              )}
            </>
          )}
        </DropdownMenu>
      </div>
    </div>
  );
}

export { SHORT_LABEL as INTERVAL_SHORT_LABEL };
