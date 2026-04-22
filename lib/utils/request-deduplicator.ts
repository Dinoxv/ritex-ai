/**
 * Request Deduplication Utility
 * 
 * Prevents duplicate concurrent requests to the same endpoint
 * by sharing the same Promise for identical requests.
 * 
 * Usage:
 * ```typescript
 * const data = await dedupedFetch('binance-meta', () => 
 *   fetch('https://fapi.binance.com/fapi/v1/exchangeInfo')
 * );
 * ```
 */

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

const pendingRequests = new Map<string, PendingRequest<any>>();
const REQUEST_TIMEOUT = 10_000; // 10s timeout for stuck requests

/**
 * Cleanup expired pending requests
 */
function cleanupExpiredRequests() {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_TIMEOUT) {
      pendingRequests.delete(key);
      console.warn(`[RequestDedup] Cleaned up expired request: ${key}`);
    }
  }
}

/**
 * Deduplicated fetch - prevents duplicate concurrent requests
 */
export async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    bypassCache?: boolean;
    timeout?: number;
  }
): Promise<T> {
  // Cleanup old requests periodically
  if (Math.random() < 0.1) {
    cleanupExpiredRequests();
  }

  // Bypass cache if requested
  if (options?.bypassCache) {
    return fetcher();
  }

  // Check if request is already pending
  const pending = pendingRequests.get(key);
  if (pending) {
    console.log(`[RequestDedup] Reusing pending request: ${key}`);
    return pending.promise;
  }

  // Create new request
  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
  });

  return promise;
}

/**
 * Clear all pending requests (useful for cleanup)
 */
export function clearPendingRequests() {
  const count = pendingRequests.size;
  pendingRequests.clear();
  if (count > 0) {
    console.log(`[RequestDedup] Cleared ${count} pending requests`);
  }
}

/**
 * Get pending request count (for monitoring)
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}
