'use client';

import { useEffect, useState } from 'react';

const RETRY_STORAGE_KEY = 'ritex-chunk-recovery';
const TELEMETRY_STORAGE_KEY = 'ritex-chunk-recovery-telemetry';
const RETRY_WINDOW_MS = 2 * 60 * 1000;

interface RecoveryTelemetrySnapshot {
  totalCount: number;
  windowCount: number;
  lastEventAt: number;
  lastWindowStartAt: number;
  lastReason: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

function isChunkLoadMessage(message: string): boolean {
  if (!message) {
    return false;
  }

  return /ChunkLoadError|Failed to load chunk|Loading chunk|dynamically imported module|module script/i.test(message);
}

function isStaticAssetPath(value: string): boolean {
  if (!value) {
    return false;
  }

  return /\/_next\/static\/(chunks|css)\//i.test(value);
}

function readRetryTimestamp(): number {
  try {
    const raw = window.sessionStorage.getItem(RETRY_STORAGE_KEY);
    if (!raw) {
      return 0;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeRetryTimestamp(now: number): void {
  try {
    window.sessionStorage.setItem(RETRY_STORAGE_KEY, String(now));
  } catch {
  }
}

function clearRetryTimestamp(): void {
  try {
    window.sessionStorage.removeItem(RETRY_STORAGE_KEY);
  } catch {
  }
}

function performHardReload(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('__refresh', Date.now().toString());
  window.location.replace(url.toString());
}

function readTelemetrySnapshot(): RecoveryTelemetrySnapshot {
  try {
    const raw = window.localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) {
      return {
        totalCount: 0,
        windowCount: 0,
        lastEventAt: 0,
        lastWindowStartAt: 0,
        lastReason: '',
      };
    }

    const parsed = JSON.parse(raw) as Partial<RecoveryTelemetrySnapshot>;
    return {
      totalCount: Number.isFinite(parsed.totalCount) ? Number(parsed.totalCount) : 0,
      windowCount: Number.isFinite(parsed.windowCount) ? Number(parsed.windowCount) : 0,
      lastEventAt: Number.isFinite(parsed.lastEventAt) ? Number(parsed.lastEventAt) : 0,
      lastWindowStartAt: Number.isFinite(parsed.lastWindowStartAt) ? Number(parsed.lastWindowStartAt) : 0,
      lastReason: typeof parsed.lastReason === 'string' ? parsed.lastReason : '',
    };
  } catch {
    return {
      totalCount: 0,
      windowCount: 0,
      lastEventAt: 0,
      lastWindowStartAt: 0,
      lastReason: '',
    };
  }
}

function writeTelemetrySnapshot(snapshot: RecoveryTelemetrySnapshot): void {
  try {
    window.localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
  }
}

function updateTelemetrySnapshot(reason: string, eventTime: number): RecoveryTelemetrySnapshot {
  const previous = readTelemetrySnapshot();
  const withinWindow = previous.lastWindowStartAt > 0 && eventTime - previous.lastWindowStartAt <= RETRY_WINDOW_MS;

  const next: RecoveryTelemetrySnapshot = {
    totalCount: previous.totalCount + 1,
    windowCount: withinWindow ? previous.windowCount + 1 : 1,
    lastEventAt: eventTime,
    lastWindowStartAt: withinWindow ? previous.lastWindowStartAt : eventTime,
    lastReason: reason,
  };

  writeTelemetrySnapshot(next);
  return next;
}

function reportRecoveryTelemetry(reason: string, blockedInRetryWindow: boolean, snapshot: RecoveryTelemetrySnapshot): void {
  const payload = {
    reason,
    blockedInRetryWindow,
    timestamp: Date.now(),
    totalCount: snapshot.totalCount,
    windowCount: snapshot.windowCount,
    deploymentId: process.env.NEXT_PUBLIC_DEPLOYMENT_ID ?? '',
    path: window.location.pathname,
    userAgent: navigator.userAgent,
  };

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/telemetry/static-load-recovery/', blob);
      return;
    }
  } catch {
  }

  try {
    void fetch('/api/telemetry/static-load-recovery/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      cache: 'no-store',
    });
  } catch {
  }
}

export default function ChunkLoadRecovery() {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const lastRetry = readRetryTimestamp();

    if (now - lastRetry > RETRY_WINDOW_MS) {
      clearRetryTimestamp();
    }

    const tryRecover = (reason: string) => {
      const attemptTime = Date.now();
      const retryAt = readRetryTimestamp();
      const withinRetryWindow = retryAt > 0 && attemptTime - retryAt <= RETRY_WINDOW_MS;
      const snapshot = updateTelemetrySnapshot(reason, attemptTime);

      reportRecoveryTelemetry(reason, withinRetryWindow, snapshot);

      if (withinRetryWindow) {
        setShowFallback(true);
        return;
      }

      writeRetryTimestamp(attemptTime);
      performHardReload();
    };

    const onWindowError = (event: Event) => {
      const errorEvent = event as ErrorEvent;
      const message = getErrorMessage(errorEvent.error) || errorEvent.message || '';

      if (isChunkLoadMessage(message)) {
        event.preventDefault();
        tryRecover('window-error:chunk-message');
        return;
      }

      const target = errorEvent.target as (HTMLScriptElement | HTMLLinkElement) | null;
      if (target?.tagName === 'SCRIPT' && isStaticAssetPath((target as HTMLScriptElement).src)) {
        event.preventDefault();
        tryRecover('window-error:static-script');
        return;
      }

      if (target?.tagName === 'LINK' && isStaticAssetPath((target as HTMLLinkElement).href)) {
        event.preventDefault();
        tryRecover('window-error:static-style');
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = getErrorMessage(event.reason);
      if (!isChunkLoadMessage(message)) {
        return;
      }

      event.preventDefault();
      tryRecover('unhandled-rejection:chunk-message');
    };

    window.addEventListener('error', onWindowError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onWindowError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (!showFallback) {
    return null;
  }

  return (
    <div className="fixed top-2 left-1/2 z-[9999] -translate-x-1/2 rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 backdrop-blur">
      App update detected. If this tab is stuck, please reload once.
      <button
        type="button"
        onClick={performHardReload}
        className="ml-2 rounded border border-amber-400/70 px-2 py-0.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-400/20"
      >
        Reload
      </button>
    </div>
  );
}
