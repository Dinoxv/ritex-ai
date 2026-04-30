'use client';

import { useMemo, useState } from 'react';
import { BINANCE_ROUTE_SLUG } from '@/lib/constants/routing';

type CheckStatus = 'ok' | 'warning' | 'error';

type CheckItem = {
  key: string;
  status: CheckStatus;
  detail: string;
};

const STORAGE_KEYS = [
  'device_key',
  'hyperliquid_credentials',
  'binance_credentials',
  'credentials',
  'hyperscalper-settings',
];

function parseJsonSafe(raw: string | null): unknown {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return '__INVALID_JSON__';
  }
}

function inspectStorage(): CheckItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  return STORAGE_KEYS.map((key) => {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return {
        key,
        status: 'warning',
        detail: 'Missing',
      };
    }

    const parsed = parseJsonSafe(raw);

    if (parsed === '__INVALID_JSON__') {
      return {
        key,
        status: 'error',
        detail: 'Invalid JSON payload',
      };
    }

    if (typeof raw === 'string' && raw.length > 0) {
      return {
        key,
        status: 'ok',
        detail: `Present (${raw.length} chars)`,
      };
    }

    return {
      key,
      status: 'warning',
      detail: 'Unexpected empty payload',
    };
  });
}

export default function AgencyAgentPage() {
  const [refreshTs, setRefreshTs] = useState(Date.now());
  const [actionMsg, setActionMsg] = useState('');

  const checks = useMemo(() => inspectStorage(), [refreshTs]);

  const clearCredentialsOnly = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem('hyperliquid_credentials');
    window.localStorage.removeItem('binance_credentials');
    window.localStorage.removeItem('credentials');
    setActionMsg('Cleared credential keys.');
    setRefreshTs(Date.now());
  };

  const clearAllAppCache = () => {
    if (typeof window === 'undefined') {
      return;
    }

    STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    setActionMsg('Cleared all app cache keys.');
    setRefreshTs(Date.now());
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Agency Agent</h1>
          <p className="text-sm text-gray-400">
            Diagnostic tool for credential loading and local cache integrity.
          </p>
        </header>

        <section className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Storage Checks</h2>
          <div className="space-y-2">
            {checks.map((item) => (
              <div key={item.key} className="flex items-center justify-between text-sm border-b border-gray-800 pb-2">
                <span className="font-mono">{item.key}</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    item.status === 'ok'
                      ? 'bg-emerald-900/40 text-emerald-300'
                      : item.status === 'warning'
                        ? 'bg-amber-900/40 text-amber-300'
                        : 'bg-red-900/40 text-red-300'
                  }`}
                >
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setRefreshTs(Date.now())}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm"
            >
              Refresh Checks
            </button>
            <button
              onClick={clearCredentialsOnly}
              className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-sm"
            >
              Clear Credentials Only
            </button>
            <button
              onClick={clearAllAppCache}
              className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-sm"
            >
              Clear All App Cache
            </button>
            <a
              href={`/${BINANCE_ROUTE_SLUG}/`}
              className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-sm"
            >
              Open Binance Mode
            </a>
          </div>
          {actionMsg && <p className="text-xs text-emerald-300">{actionMsg}</p>}
        </section>
      </div>
    </main>
  );
}
