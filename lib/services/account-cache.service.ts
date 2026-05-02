import type { AccountBalance, ExchangeTradingService } from './types';

export class AccountBalanceCache {
  private static instance: AccountBalanceCache;
  private balances: Map<string, { balance: AccountBalance; lastFetch: number }> = new Map();
  private readonly TTL = 5000;

  private constructor() {}

  static getInstance(): AccountBalanceCache {
    if (!AccountBalanceCache.instance) {
      AccountBalanceCache.instance = new AccountBalanceCache();
    }
    return AccountBalanceCache.instance;
  }

  async getBalance(service: ExchangeTradingService, user?: string): Promise<AccountBalance> {
    const cacheKey = `${service.getExchangeKey()}:${user || '__default__'}`;
    const cached = this.balances.get(cacheKey);
    if (cached && Date.now() - cached.lastFetch < this.TTL) {
      return cached.balance;
    }

    const balance = await service.getAccountBalance(user);
    this.balances.set(cacheKey, { balance, lastFetch: Date.now() });
    return balance;
  }

  invalidate(): void {
    this.balances.clear();
  }
}

export const accountCache = AccountBalanceCache.getInstance();
