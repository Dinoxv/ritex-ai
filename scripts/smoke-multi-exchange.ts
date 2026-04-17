import { HyperliquidService } from '@/lib/services/hyperliquid.service';
import { BinanceService } from '@/lib/services/binance.service';
import {
  BINANCE_STORAGE_KEY,
  HYPERLIQUID_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  clearStoredCredentials,
  type StorageLike,
} from '@/lib/context/credentials-storage';
import { getRawPositionSignedSize, getRawPositionSymbol } from '@/lib/utils/exchange-normalizers';

type ExchangeName = 'hyperliquid' | 'binance';
type FlowStatus = 'pass' | 'fail' | 'skip';

type FlowResult = {
  flow: string;
  status: FlowStatus;
  code: number;
  details: string;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const REQUIRE_PRIVATE = process.env.SMOKE_REQUIRE_PRIVATE === 'true';

const EXIT_CODES = {
  credentialsStorage: 11,
  privateEnvValidation: 21,
  hyperPublic: 31,
  hyperPrivate: 32,
  binancePublic: 41,
  binancePrivate: 42,
  unknown: 99,
} as const;

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function log(message: string): void {
  console.log(`[smoke] ${message}`);
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function printSummary(results: FlowResult[]): void {
  console.log('\n[smoke] summary');
  console.table(
    results.map((result) => ({
      flow: result.flow,
      status: result.status,
      code: result.code,
      details: result.details,
    }))
  );
}

async function runFlow(
  results: FlowResult[],
  flow: string,
  code: number,
  executor: () => Promise<string | void>
): Promise<void> {
  try {
    const details = (await executor()) || 'ok';
    results.push({ flow, status: 'pass', code: 0, details });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    results.push({ flow, status: 'fail', code, details });
  }
}

function skipFlow(results: FlowResult[], flow: string, details: string): void {
  results.push({ flow, status: 'skip', code: 0, details });
}

function getFailedExitCode(results: FlowResult[]): number {
  const failed = results.find((result) => result.status === 'fail');
  return failed?.code || 0;
}

function validatePrivateEnv(): string {
  const missing: string[] = [];

  if (!process.env.SMOKE_HYPER_WALLET_ADDRESS) {
    missing.push('SMOKE_HYPER_WALLET_ADDRESS');
  }

  if (!process.env.SMOKE_BINANCE_API_KEY) {
    missing.push('SMOKE_BINANCE_API_KEY');
  }

  if (!process.env.SMOKE_BINANCE_API_SECRET) {
    missing.push('SMOKE_BINANCE_API_SECRET');
  }

  if (process.env.SMOKE_EXECUTE_CLOSE_POSITION === 'true' && !process.env.SMOKE_HYPER_PRIVATE_KEY) {
    missing.push('SMOKE_HYPER_PRIVATE_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required private smoke env: ${missing.join(', ')}`);
  }

  return 'required private env present';
}

async function runCredentialStorageSmoke(): Promise<string> {
  const storage = new MemoryStorage();
  storage.setItem(HYPERLIQUID_STORAGE_KEY, 'hyper');
  storage.setItem(BINANCE_STORAGE_KEY, 'binance');
  storage.setItem(LEGACY_STORAGE_KEY, 'legacy');

  clearStoredCredentials(storage, 'hyperliquid');
  assert(storage.getItem(HYPERLIQUID_STORAGE_KEY) === null, 'Hyperliquid credentials should be cleared');
  assert(storage.getItem(BINANCE_STORAGE_KEY) === 'binance', 'Binance credentials should remain after Hyperliquid clear');

  clearStoredCredentials(storage, 'binance');
  assert(storage.getItem(BINANCE_STORAGE_KEY) === null, 'Binance credentials should be cleared');
  assert(storage.getItem(LEGACY_STORAGE_KEY) === 'legacy', 'Legacy key should remain until full clear');

  storage.setItem(HYPERLIQUID_STORAGE_KEY, 'hyper');
  storage.setItem(BINANCE_STORAGE_KEY, 'binance');
  clearStoredCredentials(storage, 'all');
  assert(storage.getItem(HYPERLIQUID_STORAGE_KEY) === null, 'Hyperliquid credentials should be cleared by full clear');
  assert(storage.getItem(BINANCE_STORAGE_KEY) === null, 'Binance credentials should be cleared by full clear');
  assert(storage.getItem(LEGACY_STORAGE_KEY) === null, 'Legacy key should be cleared by full clear');

  log('credentials storage clear flow: ok');
  return 'storage clear semantics verified';
}

async function runPublicChecks(name: ExchangeName, service: HyperliquidService | BinanceService, symbol: string): Promise<string> {
  const metadata = await service.getMetadataCache(symbol);
  assert(metadata.coinIndex >= 0, `${name}: metadata coinIndex missing for ${symbol}`);

  const resolvedMetadata = await service.resolveSymbolMetadata(symbol);
  assert(resolvedMetadata.sizeDecimals >= 0, `${name}: resolved metadata invalid for ${symbol}`);

  const midPrice = await service.getMidPrice(symbol);
  assert(Number(midPrice) >= 0, `${name}: invalid mid price for ${symbol}`);

  const endTime = Date.now();
  const startTime = endTime - 60 * 60 * 1000;
  const candles = await service.getCandles({ coin: symbol, interval: '1m', startTime, endTime });
  assert(candles.length > 0, `${name}: no candles returned for ${symbol}`);

  const trades = await service.getRecentTrades({ coin: symbol });
  assert(Array.isArray(trades), `${name}: trades response not array`);

  log(`${name}: public checks ok for ${symbol}`);
  return `symbol=${symbol}, candles=${candles.length}, trades=${trades.length}`;
}

async function runPrivateChecks(name: ExchangeName, service: HyperliquidService | BinanceService, closeSymbol?: string): Promise<string> {
  const [orders, positions, balance] = await Promise.all([
    service.getOpenOrders(),
    service.getOpenPositions(),
    service.getAccountBalanceCached(),
  ]);

  assert(Array.isArray(orders), `${name}: open orders response not array`);
  assert(Array.isArray(positions), `${name}: open positions response not array`);
  assert(Number(balance.accountValue) >= 0, `${name}: invalid account value`);

  const targetSymbol = closeSymbol || (positions[0] ? getRawPositionSymbol(positions[0]) : undefined);
  if (!targetSymbol) {
    log(`${name}: no open position found, close-position preflight skipped`);
    return `orders=${orders.length}, positions=${positions.length}, no open position for close preflight`;
  }

  const targetPosition = positions.find((position) => getRawPositionSymbol(position) === targetSymbol);
  if (!targetPosition) {
    log(`${name}: target position ${targetSymbol} not found, close-position preflight skipped`);
    return `orders=${orders.length}, positions=${positions.length}, target position missing`;
  }

  const [midPrice, metadata] = await Promise.all([
    service.getMidPrice(targetSymbol),
    service.getMetadataCache(targetSymbol),
  ]);

  const signedSize = getRawPositionSignedSize(targetPosition);
  const currentPrice = Number(midPrice);
  const closePrice = signedSize > 0
    ? service.formatPriceCached(currentPrice * 0.995, metadata)
    : service.formatPriceCached(currentPrice * 1.005, metadata);

  assert(Number(closePrice) > 0, `${name}: invalid close price preflight for ${targetSymbol}`);

  if (process.env.SMOKE_EXECUTE_CLOSE_POSITION === 'true') {
    await service.closePosition({ coin: targetSymbol }, closePrice, metadata, targetPosition as any);
    log(`${name}: live close position executed for ${targetSymbol}`);
    return `orders=${orders.length}, positions=${positions.length}, live close executed for ${targetSymbol}`;
  } else {
    log(`${name}: close-position preflight ok for ${targetSymbol} (live execution disabled)`);
    return `orders=${orders.length}, positions=${positions.length}, close preflight ok for ${targetSymbol}`;
  }
}

async function runHyperliquidSmoke(results: FlowResult[]): Promise<void> {
  const symbol = process.env.SMOKE_HYPER_SYMBOL || 'BTC';
  const walletAddress = process.env.SMOKE_HYPER_WALLET_ADDRESS || ZERO_ADDRESS;
  const service = new HyperliquidService(
    process.env.SMOKE_HYPER_PRIVATE_KEY || null,
    walletAddress,
    process.env.SMOKE_HYPER_TESTNET === 'true'
  );

  await runFlow(results, 'hyperliquid-public', EXIT_CODES.hyperPublic, () => runPublicChecks('hyperliquid', service, symbol));

  if (process.env.SMOKE_HYPER_WALLET_ADDRESS) {
    await runFlow(results, 'hyperliquid-private', EXIT_CODES.hyperPrivate, () => runPrivateChecks('hyperliquid', service, process.env.SMOKE_HYPER_CLOSE_SYMBOL));
  } else if (REQUIRE_PRIVATE) {
    await runFlow(results, 'hyperliquid-private', EXIT_CODES.privateEnvValidation, async () => validatePrivateEnv());
  } else {
    log('hyperliquid: private checks skipped (wallet address not provided)');
    skipFlow(results, 'hyperliquid-private', 'wallet address not provided');
  }
}

async function runBinanceSmoke(results: FlowResult[]): Promise<void> {
  const symbol = process.env.SMOKE_BINANCE_SYMBOL || 'BTC';
  const service = new BinanceService(
    process.env.SMOKE_BINANCE_API_KEY || null,
    process.env.SMOKE_BINANCE_API_SECRET || null,
    process.env.SMOKE_BINANCE_TESTNET === 'true'
  );

  await runFlow(results, 'binance-public', EXIT_CODES.binancePublic, () => runPublicChecks('binance', service, symbol));

  if (process.env.SMOKE_BINANCE_API_KEY && process.env.SMOKE_BINANCE_API_SECRET) {
    await runFlow(results, 'binance-private', EXIT_CODES.binancePrivate, () => runPrivateChecks('binance', service, process.env.SMOKE_BINANCE_CLOSE_SYMBOL));
  } else if (REQUIRE_PRIVATE) {
    await runFlow(results, 'binance-private', EXIT_CODES.privateEnvValidation, async () => validatePrivateEnv());
  } else {
    log('binance: private checks skipped (API credentials not provided)');
    skipFlow(results, 'binance-private', 'API credentials not provided');
  }
}

async function main(): Promise<void> {
  const results: FlowResult[] = [];

  log('starting multi-exchange smoke test');
  if (REQUIRE_PRIVATE) {
    await runFlow(results, 'private-env-validation', EXIT_CODES.privateEnvValidation, async () => validatePrivateEnv());
  } else {
    skipFlow(results, 'private-env-validation', 'private env validation disabled');
  }

  await runFlow(results, 'credentials-storage', EXIT_CODES.credentialsStorage, runCredentialStorageSmoke);
  await runHyperliquidSmoke(results);
  await runBinanceSmoke(results);

  printSummary(results);

  const exitCode = getFailedExitCode(results);
  if (exitCode !== 0) {
    throw Object.assign(new Error(`smoke run failed with exit code ${exitCode}`), { exitCode });
  }

  log('all smoke checks passed');
}

main().catch((error) => {
  const exitCode = typeof (error as { exitCode?: unknown })?.exitCode === 'number'
    ? (error as { exitCode: number }).exitCode
    : EXIT_CODES.unknown;
  console.error('[smoke] failed:', error instanceof Error ? error.message : error);
  process.exitCode = exitCode;
});