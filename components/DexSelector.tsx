'use client';

import { useDexStore, type MarketType } from '@/stores/useDexStore';
import { useTopSymbolsStore } from '@/stores/useTopSymbolsStore';
import { useGlobalPollingStore } from '@/stores/useGlobalPollingStore';

export default function DexSelector() {
  const dexes = useDexStore((state) => state.dexes);
  const selectedDex = useDexStore((state) => state.selectedDex);
  const setSelectedDex = useDexStore((state) => state.setSelectedDex);
  const marketType = useDexStore((state) => state.marketType);
  const setMarketType = useDexStore((state) => state.setMarketType);

  const handleDexChange = (dex: string | undefined) => {
    setSelectedDex(dex);
    useTopSymbolsStore.getState().fetchTopSymbols();
    useGlobalPollingStore.getState().fetchSlowData();
  };

  const handleMarketTypeChange = (type: MarketType) => {
    setMarketType(type);
    if (type === 'spot') {
      setSelectedDex(undefined); // spot has no dex selector
    }
    useTopSymbolsStore.getState().fetchTopSymbols();
  };

  return (
    <div className="mt-2 space-y-1">
      {/* Market Type Toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => handleMarketTypeChange('perp')}
          className={`px-2 py-1 text-[10px] font-mono rounded transition-colors cursor-pointer ${
            marketType === 'perp'
              ? 'bg-primary/20 text-primary border border-primary'
              : 'bg-bg-secondary text-primary-muted border border-frame hover:text-primary hover:bg-primary/10'
          }`}
        >
          PERP
        </button>
        <button
          onClick={() => handleMarketTypeChange('spot')}
          className={`px-2 py-1 text-[10px] font-mono rounded transition-colors cursor-pointer ${
            marketType === 'spot'
              ? 'bg-primary/20 text-primary border border-primary'
              : 'bg-bg-secondary text-primary-muted border border-frame hover:text-primary hover:bg-primary/10'
          }`}
        >
          SPOT
        </button>
      </div>
      {/* Dex Selector (perp only) */}
      {marketType === 'perp' && dexes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handleDexChange(undefined)}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors cursor-pointer ${
              selectedDex === undefined
                ? 'bg-primary/20 text-primary border border-primary'
                : 'bg-bg-secondary text-primary-muted border border-frame hover:text-primary hover:bg-primary/10'
            }`}
          >
            MAIN
          </button>
          {dexes.map((dex) => (
            <button
              key={dex.name}
              onClick={() => handleDexChange(dex.name)}
              className={`px-2 py-1 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                selectedDex === dex.name
                  ? 'bg-primary/20 text-primary border border-primary'
                  : 'bg-bg-secondary text-primary-muted border border-frame hover:text-primary hover:bg-primary/10'
              }`}
            >
              {dex.name.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
