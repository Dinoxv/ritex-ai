'use client';

import { useLanguageStore } from '@/stores/useLanguageStore';
import type { Locale } from '@/lib/i18n/types';
import { DropdownMenu } from '@/components/ui/DropdownMenu';

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

export function LanguageDropdown() {
  const { locale, setLocale } = useLanguageStore();

  const current = languages.find((l) => l.code === locale) || languages[0];

  return (
    <DropdownMenu
      title="Language"
      align="right"
      minWidth="min-w-[200px]"
      trigger={(open) => (
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-full transition-all backdrop-blur-xl"
          aria-label="Change language"
        >
          <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9 9 0 0 1 3 12c0-1.185.228-2.315.644-3.35" />
          </svg>
          <span className="text-sm">{current.flag}</span>
          <span className="text-[10px] text-white/70">{open ? '▲' : '▼'}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="bg-[#0b1320]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code);
                close();
              }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                locale === lang.code
                  ? 'bg-white/10 text-white'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="text-sm font-medium">{lang.label}</span>
              {locale === lang.code && (
                <svg className="w-4 h-4 ml-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </DropdownMenu>
  );
}
