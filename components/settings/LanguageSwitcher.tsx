'use client';

import { useLanguageStore } from '@/stores/useLanguageStore';
import type { Locale } from '@/lib/i18n/types';

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguageStore();

  return (
    <div className="p-3 bg-bg-secondary border border-frame rounded">
      <div className="text-primary font-mono text-xs font-bold mb-3">█ LANGUAGE</div>
      <div className="grid grid-cols-3 gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors font-mono text-[10px] ${
              locale === lang.code
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-bg-primary border-frame text-primary-muted hover:border-primary/50'
            }`}
          >
            <span className="text-sm">{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
