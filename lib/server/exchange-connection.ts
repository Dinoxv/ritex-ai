import { createHmac } from 'node:crypto';
import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';

const BINANCE_MAINNET_URL = 'https://fapi.binance.com';
const BINANCE_TESTNET_URL = 'https://testnet.binancefuture.com';
const PUBLIC_IP_ENDPOINTS = [
  'https://api.ipify.org?format=json',
  'https://ipv4.icanhazip.com',
  'https://ifconfig.me/ip',
];

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

type HyperliquidConnectionInput = {
  privateKey: string;
  walletAddress: string;
  isTestnet?: boolean;
};

type BinanceConnectionInput = {
  apiKey: string;
  apiSecret: string;
  isTestnet?: boolean;
};

const HYPERLIQUID_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseServerIp(raw: string): string {
  return raw.trim().replace(/\n/g, '');
}

function isValidIpv4(value: string): boolean {
  return IPV4_REGEX.test(value);
}

export async function getServerPublicIp(): Promise<string | null> {
  for (const endpoint of PUBLIC_IP_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, { method: 'GET' }, 4000);
      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = (await response.json()) as { ip?: string };
        const ip = payload.ip ? parseServerIp(payload.ip) : '';
        if (isValidIpv4(ip)) {
          return ip;
        }
      } else {
        const body = await response.text();
        const ip = parseServerIp(body);
        if (isValidIpv4(ip)) {
          return ip;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function formatBinanceError(status: number, bodyText: string, serverIp: string | null): string {
  let message = `Binance API loi (${status}).`;

  try {
    const payload = JSON.parse(bodyText) as { code?: number; msg?: string };
    if (payload.msg) {
      message += ` ${payload.msg}`;
    }

    if (payload.code === -2015) {
      const parsedIp = payload.msg?.match(/request ip: ([\d.]+)/)?.[1] || serverIp || 'khong xac dinh';
      message += ` Kiem tra API permissions va them IP whitelist: ${parsedIp}.`;
    }
  } catch {
    if (bodyText) {
      message += ` ${bodyText}`;
    }
  }

  return message;
}

export async function testHyperliquidConnection(input: HyperliquidConnectionInput): Promise<{ message: string }> {
  if (!input.privateKey?.trim()) {
    throw new Error('Private key la bat buoc');
  }

  if (!input.walletAddress?.trim()) {
    throw new Error('Wallet address la bat buoc');
  }

  if (!input.privateKey.startsWith('0x')) {
    throw new Error('Private key phai bat dau bang 0x');
  }

  if (!HYPERLIQUID_ADDRESS_REGEX.test(input.walletAddress.trim())) {
    throw new Error('Wallet address khong hop le');
  }

  privateKeyToAccount(input.privateKey.trim() as `0x${string}`);

  const client = new InfoClient({
    transport: new HttpTransport({
      isTestnet: Boolean(input.isTestnet),
      fetchOptions: {
        keepalive: false,
      },
    }),
  });

  const state = await client.clearinghouseState({
    user: input.walletAddress.trim() as `0x${string}`,
  });

  return {
    message: `Hyperliquid ket noi thanh cong. Account value: ${state.marginSummary.accountValue}`,
  };
}

export async function testBinanceConnection(
  input: BinanceConnectionInput,
  serverIp: string | null
): Promise<{ message: string }> {
  if (!input.apiKey?.trim() || !input.apiSecret?.trim()) {
    throw new Error('Binance API Key va API Secret la bat buoc');
  }

  const params = new URLSearchParams({
    recvWindow: '5000',
    timestamp: String(Date.now()),
  });
  const signature = createHmac('sha256', input.apiSecret.trim()).update(params.toString()).digest('hex');
  const baseUrl = input.isTestnet ? BINANCE_TESTNET_URL : BINANCE_MAINNET_URL;

  const response = await fetchWithTimeout(
    `${baseUrl}/fapi/v2/balance?${params.toString()}&signature=${signature}`,
    {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': input.apiKey.trim(),
      },
    },
    8000
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(formatBinanceError(response.status, bodyText, serverIp));
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const bodyText = await response.text();
    throw new Error(formatBinanceError(response.status, bodyText || 'Phan hoi khong phai JSON hop le.', serverIp));
  }

  const bodyText = await response.text();
  let balances: Array<{ asset: string; balance: string; availableBalance: string }>;

  try {
    balances = JSON.parse(bodyText) as Array<{ asset: string; balance: string; availableBalance: string }>;
  } catch {
    throw new Error(formatBinanceError(response.status, bodyText || 'Phan hoi JSON khong hop le.', serverIp));
  }

  const usdtBalance = balances.find((balance) => balance.asset === 'USDT');

  return {
    message: `Binance ket noi thanh cong. USDT available balance: ${usdtBalance?.availableBalance || '0'}`,
  };
}