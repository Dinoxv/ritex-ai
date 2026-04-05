'use client';

import type { TimeInterval } from '@/types';

interface ChartControlsProps {
  currentInterval: TimeInterval;
  onIntervalChange: (interval: TimeInterval) => void;
}

const INTERVALS: { value: TimeInterval; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '2h', label: '2h' },
  { value: '4h', label: '4h' },
  { value: '8h', label: '8h' },
  { value: '12h', label: '12h' },
  { value: '1d', label: '1D' },
  { value: '3d', label: '3D' },
  { value: '1w', label: '1W' },
  { value: '1M', label: '1M' },
];

export default function ChartControls({ currentInterval, onIntervalChange }: ChartControlsProps) {
  return (
    <div className="flex flex-wrap gap-1 mb-4">
      {INTERVALS.map((interval) => (
        <button
          key={interval.value}
          onClick={() => onIntervalChange(interval.value)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            currentInterval === interval.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {interval.label}
        </button>
      ))}
    </div>
  );
}
