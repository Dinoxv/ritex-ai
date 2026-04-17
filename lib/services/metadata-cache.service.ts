import type { ExchangeTradingService } from './types';

export interface SymbolMetadata {
  coinIndex: number;
  tickSize: number;
  sizeDecimals: number;
  timestamp: number;
}

export class MetadataCache {
  private static instance: MetadataCache;
  private cache: Map<string, SymbolMetadata> = new Map();
  private readonly TTL = 60000;

  private constructor() {}

  static getInstance(): MetadataCache {
    if (!MetadataCache.instance) {
      MetadataCache.instance = new MetadataCache();
    }
    return MetadataCache.instance;
  }

  private getCacheKey(coin: string, service: ExchangeTradingService): string {
    return `${service.getExchangeKey()}:${coin.toUpperCase()}`;
  }

  async getMetadata(coin: string, service: ExchangeTradingService): Promise<SymbolMetadata> {
    const cacheKey = this.getCacheKey(coin, service);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached;
    }

    const metadata = await service.resolveSymbolMetadata(coin);
    this.cache.set(cacheKey, metadata);
    return metadata;
  }

  formatPrice(price: number, metadata: SymbolMetadata): string {
    const rounded = Math.round(price / metadata.tickSize) * metadata.tickSize;
    const decimals = this.getDecimalsFromTickSize(metadata.tickSize);
    return parseFloat(rounded.toFixed(decimals)).toFixed(decimals);
  }

  formatSize(size: number, metadata: SymbolMetadata): string {
    const minSize = Math.pow(10, -metadata.sizeDecimals);
    const clampedSize = Math.max(size, minSize);
    return clampedSize.toFixed(metadata.sizeDecimals);
  }

  /**
   * Ensure a coin size meets the minimum notional value ($10 on Hyperliquid).
   * If the size * price < minNotional, returns the minimum size needed.
   * Returns the formatted size string and whether it was bumped up.
   */
  ensureMinNotional(size: number, price: number, metadata: SymbolMetadata, minNotional: number = 10): { size: string; wasBumped: boolean } {
    const formatted = this.formatSize(size, metadata);
    const notional = parseFloat(formatted) * price;
    if (notional >= minNotional) {
      return { size: formatted, wasBumped: false };
    }
    const minSize = this.getMinSizeForPrice(price, metadata, minNotional);
    return { size: minSize, wasBumped: true };
  }

  /**
   * Check if an order size meets the minimum notional value ($10 on Hyperliquid).
   * Returns the minimum coin size needed at the given price, or the formatted size if it already meets the requirement.
   */
  getMinSizeForPrice(price: number, metadata: SymbolMetadata, minNotional: number = 10): string {
    const minCoinSize = minNotional / price;
    const minLot = Math.pow(10, -metadata.sizeDecimals);
    const size = Math.max(minCoinSize, minLot);
    // Round up to nearest lot to ensure we meet the minimum
    const rounded = Math.ceil(size / minLot) * minLot;
    return rounded.toFixed(metadata.sizeDecimals);
  }

  private getDecimalsFromTickSize(tickSize: number): number {
    if (tickSize >= 1) return 0;
    if (tickSize >= 0.1) return 1;
    if (tickSize >= 0.01) return 2;
    if (tickSize >= 0.001) return 3;
    if (tickSize >= 0.0001) return 4;
    if (tickSize >= 0.00001) return 5;
    return 6;
  }

  invalidate(coin: string, service?: ExchangeTradingService): void {
    if (service) {
      this.cache.delete(this.getCacheKey(coin, service));
      return;
    }

    for (const key of Array.from(this.cache.keys())) {
      if (key.endsWith(`:${coin.toUpperCase()}`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const metadataCache = MetadataCache.getInstance();
