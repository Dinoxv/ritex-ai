import type { TimeInterval } from '@/types';
import { DEFAULT_CANDLE_COUNT, STANDARD_CANDLES } from '@/lib/constants';

export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const INTERVAL_TO_MS: Record<TimeInterval, number> = {
  '1m': 60 * 1000,
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
};

export function getCandleTimeWindow(interval: TimeInterval, candleCount: number = DEFAULT_CANDLE_COUNT): { startTime: number; endTime: number } {
  const endTime = Date.now();
  const intervalMs = INTERVAL_TO_MS[interval];
  const startTime = endTime - (candleCount * intervalMs);

  return { startTime, endTime };
}

export function getStandardTimeWindow(): { startTime: number; endTime: number } {
  return getCandleTimeWindow('1m', STANDARD_CANDLES);
}

function getDatePartsInTimeZone(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.formatToParts(date).reduce<Record<string, string>>((parts, part) => {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
    return parts;
  }, {});
}

export function formatDateKeyInTimeZone(date: Date, timeZone: string = VIETNAM_TIME_ZONE): string {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatVietnamTimestamp(date: Date): string {
  const parts = getDatePartsInTimeZone(date, VIETNAM_TIME_ZONE);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} GMT+7`;
}

function normalizeChartTimeToDate(time: unknown): Date | null {
  if (typeof time === 'number') {
    const ms = time < 1_000_000_000_000 ? time * 1000 : time;
    return new Date(ms);
  }

  if (typeof time === 'string') {
    const parsed = new Date(time);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (time && typeof time === 'object') {
    const maybeBusinessDay = time as { year?: number; month?: number; day?: number };
    if (
      typeof maybeBusinessDay.year === 'number' &&
      typeof maybeBusinessDay.month === 'number' &&
      typeof maybeBusinessDay.day === 'number'
    ) {
      return new Date(Date.UTC(maybeBusinessDay.year, maybeBusinessDay.month - 1, maybeBusinessDay.day));
    }
  }

  return null;
}

export function formatChartTimeInVietnam(
  time: unknown,
  options: { includeDate?: boolean; includeSeconds?: boolean } = {}
): string {
  const date = normalizeChartTimeToDate(time);
  if (!date) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIME_ZONE,
    ...(options.includeDate ? { day: '2-digit', month: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    ...(options.includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });

  return formatter.format(date).replace(',', '');
}
