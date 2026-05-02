import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type SignedMethod = 'GET' | 'POST' | 'DELETE';

type SignedProxyBody = {
  method?: SignedMethod;
  path?: string;
  params?: Record<string, string | number | boolean>;
  apiKey?: string;
  apiSecret?: string;
  isTestnet?: boolean;
};

const USDM_MAINNET_HOSTS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
  'https://fapi4.binance.com',
];

const USDM_TESTNET_HOSTS = [
  'https://demo-fapi.binance.com',
  'https://testnet.binancefuture.com',
];

const COINM_MAINNET_HOSTS = [
  'https://dapi.binance.com',
  'https://dapi1.binance.com',
  'https://dapi2.binance.com',
  'https://dapi3.binance.com',
  'https://dapi4.binance.com',
];

const FAPI_TO_DAPI_FALLBACK_PATHS: Record<string, string> = {
  '/fapi/v2/account': '/dapi/v1/account',
  '/fapi/v1/positionSide/dual': '/dapi/v1/positionSide/dual',
  '/fapi/v1/openOrders': '/dapi/v1/openOrders',
  '/fapi/v1/allOpenOrders': '/dapi/v1/allOpenOrders',
  '/fapi/v1/leverage': '/dapi/v1/leverage',
  '/fapi/v2/positionRisk': '/dapi/v1/positionRisk',
};

const ALLOWED_SIGNED_PATHS = new Set<string>([
  '/fapi/v1/positionSide/dual',
  '/fapi/v1/order',
  '/fapi/v1/openOrders',
  '/fapi/v1/userTrades',
  '/fapi/v1/allOpenOrders',
  '/fapi/v1/leverage',
  '/fapi/v2/account',
  '/fapi/v2/positionRisk',
]);

const ALLOWED_METHODS = new Set<SignedMethod>(['GET', 'POST', 'DELETE']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeParams(input: unknown): Record<string, string | number | boolean> {
  if (!isPlainObject(input)) {
    return {};
  }

  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      output[key] = value;
    }
  }

  return output;
}

function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  if (apiKey.length <= 10) return `${apiKey.slice(0, 2)}***`;
  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
}

function shouldRetryOnNotFound(status: number, bodyText: string): boolean {
  if (status !== 404) return false;
  const lower = bodyText.toLowerCase();
  if (
    lower.includes('page not found') ||
    lower.includes('<html') ||
    lower.includes('saved from url=(0032)https://www.binance.com/en/error')
  ) {
    return true;
  }

  // Some Binance clusters return JSON/plain 404 bodies instead of HTML.
  return true;
}

function getCandidateUrls(path: string, isTestnet: boolean, queryWithSignature: string): string[] {
  const urls: string[] = [];

  if (path.startsWith('/fapi/')) {
    const fapiHosts = isTestnet ? USDM_TESTNET_HOSTS : USDM_MAINNET_HOSTS;
    for (const host of fapiHosts) {
      urls.push(`${host}${path}?${queryWithSignature}`);
    }

    const dapiFallbackPath = FAPI_TO_DAPI_FALLBACK_PATHS[path];
    if (!isTestnet && dapiFallbackPath) {
      for (const host of COINM_MAINNET_HOSTS) {
        urls.push(`${host}${dapiFallbackPath}?${queryWithSignature}`);
      }
    }
  }

  return urls;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignedProxyBody;
    const method = body?.method;
    const path = body?.path;
    const apiKey = String(body?.apiKey || '').trim();
    const apiSecret = String(body?.apiSecret || '').trim();
    const isTestnet = Boolean(body?.isTestnet);

    if (!method || !ALLOWED_METHODS.has(method)) {
      return NextResponse.json({ ok: false, error: 'Invalid method' }, { status: 400 });
    }

    if (!path || !ALLOWED_SIGNED_PATHS.has(path)) {
      return NextResponse.json({ ok: false, error: 'Path not allowed' }, { status: 400 });
    }

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ ok: false, error: 'Missing Binance API credentials' }, { status: 400 });
    }

    const finalParams: Record<string, string | number | boolean> = {
      ...normalizeParams(body?.params),
      recvWindow: 5000,
      timestamp: Date.now(),
    };

    const isOrderPath = path === '/fapi/v1/order';
    if (isOrderPath) {
      console.info('[BinanceSigned][Order][Request]', {
        method,
        path,
        symbol: String(finalParams.symbol || ''),
        side: String(finalParams.side || ''),
        positionSide: String(finalParams.positionSide || ''),
        quantity: String(finalParams.quantity || ''),
        apiKey: maskApiKey(apiKey),
      });
    }

    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(finalParams)) {
      qs.set(key, String(value));
    }

    const payload = qs.toString();
    const signature = createHmac('sha256', apiSecret).update(payload).digest('hex');
    const withSignature = `${payload}&signature=${signature}`;

    const candidateUrls = getCandidateUrls(path, isTestnet, withSignature);
    if (candidateUrls.length === 0) {
      return NextResponse.json({ ok: false, error: 'No candidate endpoint for signed path' }, { status: 400 });
    }

    let response: Response | null = null;
    let text = '';
    let lastStatus = 500;
    let attemptedUrl = '';

    for (const url of candidateUrls) {
      attemptedUrl = url;
      response = await fetch(url, {
        method,
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
        cache: 'no-store',
      });

      text = await response.text();
      lastStatus = response.status;

      if (response.ok) {
        if (isOrderPath) {
          console.info('[BinanceSigned][Order][Success]', {
            method,
            path,
            symbol: String(finalParams.symbol || ''),
            side: String(finalParams.side || ''),
            positionSide: String(finalParams.positionSide || ''),
          });
        }
        break;
      }

      if (shouldRetryOnNotFound(response.status, text)) {
        continue;
      }

      return NextResponse.json(
        {
          ok: false,
          status: response.status,
          errorText: text || `Binance HTTP ${response.status} (empty response body)`,
        },
        { status: response.status }
      );
    }

    if (!response || !response.ok) {
      if (isOrderPath) {
        console.warn('[BinanceSigned][Order][FailoverExhausted]', {
          method,
          path,
          symbol: String(finalParams.symbol || ''),
          side: String(finalParams.side || ''),
          positionSide: String(finalParams.positionSide || ''),
          status: lastStatus,
        });
      }
      return NextResponse.json(
        {
          ok: false,
          status: lastStatus,
          errorText: text || `Binance HTTP ${lastStatus} after failover (last tried: ${attemptedUrl})`,
        },
        { status: lastStatus }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected server error',
      },
      { status: 500 }
    );
  }
}
