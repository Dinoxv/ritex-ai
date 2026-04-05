'use client';

import { ReactNode, useEffect } from 'react';

interface TradesLayoutProps {
  children: ReactNode;
}

export default function TradesLayout({ children }: TradesLayoutProps) {
  useEffect(() => {
    document.title = 'Today\'s Trades - RITEX AI';
  }, []);

  return (
    <>
      <style jsx global>{`
        body {
          background: var(--background-primary);
          font-family: var(--font-binance), 'BinancePlex', sans-serif;
        }
        .terminal-border {
          border: 1px solid var(--border-frame);
        }
        .terminal-text {
        }
      `}</style>

      {children}
    </>
  );
}
