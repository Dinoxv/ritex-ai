import type { ExchangeWebSocketService } from './exchange-websocket.interface';
import { HyperliquidWebSocketService } from './hyperliquid-websocket.service';
import { BinanceWebSocketService } from './binance-websocket.service';

class WebSocketServiceManager {
  private static instance: ExchangeWebSocketService | null = null;
  private static instanceType: 'hyperliquid' | 'binance' | 'bybit' | null = null;
  private static activeSubscriptions = 0;
  private static disconnectTimeout: NodeJS.Timeout | null = null;

  static getService(type: 'hyperliquid' | 'binance' | 'bybit' = 'hyperliquid', isTestnet: boolean = false): ExchangeWebSocketService {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    if (this.instance && this.instanceType && this.instanceType !== type) {
      this.instance.disconnect();
      this.instance = null;
      this.instanceType = null;
      this.activeSubscriptions = 0;
    }

    if (!this.instance) {
      switch (type) {
        case 'hyperliquid':
          this.instance = new HyperliquidWebSocketService(isTestnet);
          this.instanceType = type;
          break;
        case 'binance':
          this.instance = new BinanceWebSocketService(isTestnet);
          this.instanceType = type;
          break;
        case 'bybit':
          throw new Error('Bybit WebSocket service not yet implemented');
        default:
          throw new Error(`Unsupported exchange type: ${type}`);
      }
    }
    return this.instance;
  }

  static incrementSubscriptions(): void {
    this.activeSubscriptions++;
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
  }

  static decrementSubscriptions(): void {
    this.activeSubscriptions--;

    if (this.activeSubscriptions <= 0) {
      this.activeSubscriptions = 0;

      if (this.disconnectTimeout) {
        clearTimeout(this.disconnectTimeout);
      }

      this.disconnectTimeout = setTimeout(() => {
        if (this.activeSubscriptions === 0 && this.instance) {
          this.instance.disconnect();
          this.instance = null;
        }
      }, 30000);
    }
  }

  static reset(): void {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
      this.instanceType = null;
    }
    this.activeSubscriptions = 0;
  }
}

export function useWebSocketService(type: 'hyperliquid' | 'binance' | 'bybit' = 'hyperliquid', isTestnet: boolean = false): {
  service: ExchangeWebSocketService;
  trackSubscription: () => () => void;
} {
  const service = WebSocketServiceManager.getService(type, isTestnet);

  const trackSubscription = () => {
    WebSocketServiceManager.incrementSubscriptions();
    return () => {
      WebSocketServiceManager.decrementSubscriptions();
    };
  };

  return { service, trackSubscription };
}
