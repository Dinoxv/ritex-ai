import { create } from 'zustand';
import type { Locale, Translations } from '@/lib/i18n/types';
import { en } from '@/lib/i18n/en';
import { vi } from '@/lib/i18n/vi';
import { zh } from '@/lib/i18n/zh';

const translations: Record<Locale, Translations> = { en, vi, zh };

function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem('locale');
    if (stored === 'en' || stored === 'vi' || stored === 'zh') {
      return stored;
    }
  } catch {
  }

  return null;
}

function writeStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem('locale', locale);
  } catch {
  }
}

function getInitialLocale(): Locale {
  return readStoredLocale() ?? 'en';
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
      writeStoredLocale(locale);
      set({ locale, t: translations[locale] });
    },
  };
});
