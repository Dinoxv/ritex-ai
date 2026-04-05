import { create } from 'zustand';
import type { Locale, Translations } from '@/lib/i18n/types';
import { en } from '@/lib/i18n/en';
import { vi } from '@/lib/i18n/vi';
import { zh } from '@/lib/i18n/zh';

const translations: Record<Locale, Translations> = { en, vi, zh };

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('locale');
  if (stored && (stored === 'en' || stored === 'vi' || stored === 'zh')) {
    return stored;
  }
  return 'en';
}

interface LanguageStore {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => {
  const initialLocale = getInitialLocale();
  return {
    locale: initialLocale,
    t: translations[initialLocale],
    setLocale: (locale: Locale) => {
      localStorage.setItem('locale', locale);
      set({ locale, t: translations[locale] });
    },
  };
});
