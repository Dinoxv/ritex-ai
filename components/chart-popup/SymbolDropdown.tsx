'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSymbolMetaStore } from '@/stores/useSymbolMetaStore';
import { DropdownMenu } from '@/components/ui/DropdownMenu';

interface SymbolDropdownProps {
  currentSymbol: string;
  onSymbolChange: (symbol: string) => void;
  currentPrice?: number;
  decimals?: number;
}

export function SymbolDropdown({ currentSymbol, onSymbolChange, currentPrice, decimals = 2 }: SymbolDropdownProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const metadata = useSymbolMetaStore((state) => state.metadata);

  const allSymbols = useMemo(() => {
    return Object.keys(metadata).sort();
  }, [metadata]);

  const filteredSymbols = useMemo(() => {
    if (!searchQuery) return allSymbols;
    const query = searchQuery.toUpperCase();
    return allSymbols.filter(symbol => symbol.includes(query));
  }, [allSymbols, searchQuery]);

  const handleSymbolSelect = (symbol: string) => {
    onSymbolChange(symbol);
    setSearchQuery('');
  };

  return (
    <DropdownMenu
      minWidth="min-w-72"
      title="Symbol"
      align="left"
      trigger={(open) => (
        <button
          className="flex items-center gap-2 px-3 py-1.5 terminal-border bg-bg-primary hover:bg-primary/5 transition-colors"
          type="button"
        >
          <span className="text-primary text-lg font-bold tracking-wider">
            {currentSymbol}/USD
          </span>
          {currentPrice && currentPrice > 0 && (
            <span className="text-primary-muted text-sm">
              ${currentPrice.toFixed(decimals)}
            </span>
          )}
          <span className="text-primary text-xs ml-1">{open ? '▲' : '▼'}</span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="px-3 py-3 border-b border-gray-700 bg-[#0b1320]">
            <div className="flex items-center gap-2 rounded border border-gray-700 bg-[#101827] px-3 py-2 text-gray-300">
              <span className="text-gray-500">⌕</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbols..."
                autoFocus
                className="w-full bg-transparent text-sm text-gray-200 placeholder:text-gray-500 outline-none"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto bg-[#0b1320]">
            {filteredSymbols.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm font-mono">
                No symbols found
              </div>
            ) : (
              filteredSymbols.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => {
                    handleSymbolSelect(symbol);
                    close();
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm font-mono hover:bg-gray-800/80 transition-colors ${
                    symbol === currentSymbol
                      ? 'bg-white/5 text-white font-bold'
                      : 'text-gray-300'
                  }`}
                >
                  {symbol}/USD
                </button>
              ))
            )}
          </div>
        </>
      )}
    </DropdownMenu>
  );
}
