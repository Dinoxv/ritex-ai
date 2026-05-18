'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ExchangeType } from '@/stores/useDexStore';
import type { TradingViewDatafeed } from '@/lib/tradingview/types';

type TradingViewWidgetInstance = {
  remove?: () => void;
};

type TradingViewWidgetCtor = new (options: Record<string, unknown>) => TradingViewWidgetInstance;

declare global {
  interface Window {
    TradingView?: {
      widget: TradingViewWidgetCtor;
    };
  }
}

let chartingLibraryLoader: Promise<void> | null = null;

function loadChartingLibraryScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('TradingView script can only load in browser'));
  }

  if (window.TradingView?.widget) {
    return Promise.resolve();
  }

  if (chartingLibraryLoader) {
    return chartingLibraryLoader;
  }

  chartingLibraryLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/charting_library/charting_library.js';
    script.async = true;

    script.onload = () => {
      if (window.TradingView?.widget) {
        resolve();
      } else {
        reject(new Error('TradingView widget constructor not found after script load'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load /charting_library/charting_library.js'));
    };

    document.head.appendChild(script);
  });

  return chartingLibraryLoader;
}

function toTvSymbol(exchange: ExchangeType, coin: string): string {
  const upper = coin.toUpperCase();
  if (exchange === 'binance') {
    const symbol = upper.endsWith('USDT') ? upper : `${upper}USDT`;
    return `BINANCE:${symbol}`;
  }

  return `HYPERLIQUID:${upper}`;
}

interface TradingViewExchangeChartProps {
  coin: string;
  exchange: ExchangeType;
  datafeed: TradingViewDatafeed;
  className?: string;
  onLibraryUnavailable?: (reason: string) => void;
}

export default function TradingViewExchangeChart({
  coin,
  exchange,
  datafeed,
  className,
  onLibraryUnavailable,
}: TradingViewExchangeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<TradingViewWidgetInstance | null>(null);

  const tvSymbol = useMemo(() => toTvSymbol(exchange, coin), [exchange, coin]);

  useEffect(() => {
    let disposed = false;

    const init = async () => {
      try {
        await loadChartingLibraryScript();
        if (disposed || !containerRef.current || !window.TradingView?.widget) {
          return;
        }

        const widget = new window.TradingView.widget({
          symbol: tvSymbol,
          interval: '1',
          datafeed,
          container: containerRef.current,
          library_path: '/charting_library/',
          locale: 'en',
          timezone: 'Etc/UTC',
          autosize: true,
          fullscreen: false,
          theme: 'Dark',
          style: '1',
          save_image: true,
          withdateranges: true,
          hide_top_toolbar: false,
          hide_legend: false,
          hide_side_toolbar: false,
          details: true,
          hotlist: false,
          calendar: false,
          allow_symbol_change: true,
          loading_screen: {
            backgroundColor: '#020b1f',
            foregroundColor: '#00d9ff',
          },
          disabled_features: ['symbol_search_hot_key', 'border_around_the_chart'],
          enabled_features: [
            'header_widget',
            'left_toolbar',
            'timeframes_toolbar',
            'study_templates',
            'use_localstorage_for_settings',
            'show_zoom_and_move_buttons_on_touch',
          ],
        });

        widgetRef.current = widget;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown TradingView initialization error';
        onLibraryUnavailable?.(reason);
      }
    };

    void init();

    return () => {
      disposed = true;
      if (widgetRef.current?.remove) {
        widgetRef.current.remove();
      }
      widgetRef.current = null;
    };
  }, [datafeed, tvSymbol, onLibraryUnavailable]);

  return <div ref={containerRef} className={className || 'h-full w-full'} />;
}
