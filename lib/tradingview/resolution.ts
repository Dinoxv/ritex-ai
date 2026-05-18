import type { TimeInterval } from '@/types';
import type { TvResolutionString, TvSupportedResolution } from './types';

const RESOLUTION_TO_INTERVAL: Record<TvResolutionString, TimeInterval> = {
  '1': '1m',
  '3': '3m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  '120': '2h',
  '240': '4h',
  '480': '8h',
  '720': '12h',
  '1D': '1d',
  '3D': '3d',
  '1W': '1w',
  '1M': '1M',
};

const INTERVAL_TO_RESOLUTION: Record<TimeInterval, TvResolutionString> = {
  '1m': '1',
  '3m': '3',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '2h': '120',
  '4h': '240',
  '8h': '480',
  '12h': '720',
  '1d': '1D',
  '3d': '3D',
  '1w': '1W',
  '1M': '1M',
};

export const TV_SUPPORTED_RESOLUTIONS: TvSupportedResolution[] = [
  '1',
  '3',
  '5',
  '15',
  '30',
  '60',
  '120',
  '240',
  '480',
  '720',
  '1D',
  '3D',
  '1W',
  '1M',
];

export function toInternalInterval(resolution: string): TimeInterval {
  if (resolution in RESOLUTION_TO_INTERVAL) {
    return RESOLUTION_TO_INTERVAL[resolution as TvResolutionString];
  }

  if (resolution === 'D') return '1d';
  if (resolution === 'W') return '1w';
  if (resolution === 'M') return '1M';

  return '1m';
}

export function toTvResolution(interval: TimeInterval): TvResolutionString {
  return INTERVAL_TO_RESOLUTION[interval];
}
