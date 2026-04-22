/**
 * Enhanced Fetch Utility with Connection Pooling & Keep-Alive
 * 
 * Optimizes network performance by:
 * - Reusing TCP connections (keep-alive)
 * - Adding timeout controls
 * - Providing retry logic
 * - Logging performance metrics
 */

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  logPerformance?: boolean;
}

interface FetchPerformanceMetrics {
  url: string;
  duration: number;
  status: number;
  cached: boolean;
  timestamp: number;
}

// Performance metrics storage
const performanceMetrics: FetchPerformanceMetrics[] = [];
const MAX_METRICS = 100;

/**
 * Enhanced fetch with keep-alive and performance tracking
 */
export async function enhancedFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    timeout = 15000,
    retries = 0,
    retryDelay = 1000,
    logPerformance = false,
    ...fetchOptions
  } = options;

  const startTime = Date.now();

  // Add keep-alive headers for connection pooling
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Connection')) {
    headers.set('Connection', 'keep-alive');
  }

  const enhancedOptions: RequestInit = {
    ...fetchOptions,
    headers,
    keepalive: true, // Enable keep-alive
  };

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...enhancedOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      // Log performance metrics
      if (logPerformance || duration > 1000) {
        const metric: FetchPerformanceMetrics = {
          url: url.substring(0, 100),
          duration,
          status: response.status,
          cached: false,
          timestamp: Date.now(),
        };

        performanceMetrics.push(metric);
        if (performanceMetrics.length > MAX_METRICS) {
          performanceMetrics.shift();
        }

        if (duration > 1000) {
          console.warn(`[Fetch] Slow request: ${url.substring(0, 80)} (${duration}ms)`);
        } else if (logPerformance) {
          console.log(`[Fetch] ${url.substring(0, 80)} (${duration}ms)`);
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries) {
        console.warn(`[Fetch] Retry ${attempt + 1}/${retries} for ${url}: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        attempt++;
      } else {
        break;
      }
    }
  }

  // All retries failed
  const duration = Date.now() - startTime;
  console.error(`[Fetch] Failed after ${attempt} retries (${duration}ms): ${url}`);
  throw lastError || new Error('Request failed');
}

/**
 * Get performance metrics for monitoring
 */
export function getPerformanceMetrics(): FetchPerformanceMetrics[] {
  return [...performanceMetrics];
}

/**
 * Get average response time
 */
export function getAverageResponseTime(): number {
  if (performanceMetrics.length === 0) return 0;
  const sum = performanceMetrics.reduce((acc, m) => acc + m.duration, 0);
  return Math.round(sum / performanceMetrics.length);
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics(): void {
  performanceMetrics.length = 0;
}

/**
 * Batch fetch utility - fetch multiple URLs in parallel with concurrency limit
 */
export async function batchFetch<T = any>(
  urls: string[],
  options: FetchOptions = {},
  concurrency: number = 5
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(url => enhancedFetch<T>(url, options))
    );
    results.push(...batchResults);
  }

  return results;
}
