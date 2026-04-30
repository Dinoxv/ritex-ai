'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { BINANCE_ROUTE_SLUG } from '@/lib/constants/routing';

type MobileTabType = 'scanner' | 'symbols' | 'chart' | 'actions' | 'orders-positions';

interface TabConfig {
  id: MobileTabType;
  label: string;
}

const tabs: TabConfig[] = [
  { id: 'scanner', label: 'Scanner' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'chart', label: 'Chart' },
  { id: 'actions', label: 'Actions' },
  { id: 'orders-positions', label: 'Orders' },
];

export const MobileTabBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const mobileActiveTab = useSettingsStore((state) => state.mobileActiveTab);
  const setMobileActiveTab = useSettingsStore((state) => state.setMobileActiveTab);
  const isBotView = pathname?.includes('/bot');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t-2 border-border-frame md:hidden z-50 max-w-full overflow-hidden">
      <div className="grid grid-cols-6 h-14 w-full max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMobileActiveTab(tab.id)}
            className={`h-full flex items-center justify-center text-[11px] font-medium transition-colors whitespace-nowrap border-r border-border-frame/40 ${
              mobileActiveTab === tab.id
                ? 'text-primary border-t-2 border-primary'
                : 'text-primary-muted hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => router.push(`/${BINANCE_ROUTE_SLUG}/bot`)}
          className={`h-full flex items-center justify-center text-[11px] font-semibold transition-colors whitespace-nowrap ${
            isBotView
              ? 'text-primary border-t-2 border-primary bg-primary/10'
              : 'text-primary-muted hover:text-primary border-l border-border-frame/40'
          }`}
        >
          BOT
        </button>
      </div>
    </div>
  );
};
