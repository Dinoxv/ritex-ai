export const BINANCE_ROUTE_SLUG = 'binance-apikey';
export const LEGACY_BINANCE_ROUTE_SLUG = 'binance+apikey';

export function isBinanceRouteSlug(value?: string | null): boolean {
  const raw = (value || '').trim();
  if (!raw) {
    return false;
  }

  let normalized = raw;
  try {
    normalized = decodeURIComponent(raw);
  } catch {
    normalized = raw;
  }

  const slug = normalized.toLowerCase();
  return slug === BINANCE_ROUTE_SLUG || slug === LEGACY_BINANCE_ROUTE_SLUG;
}
