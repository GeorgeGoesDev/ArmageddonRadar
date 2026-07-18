import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, Locale } from './i18n';
import { detectDeviceLocale } from './format';

const STORAGE_KEY = 'locale:v1';

export type TFunc = (key: string, params?: Record<string, unknown>) => string;

interface LocaleContextValue {
  t: TFunc;
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const detected = detectDeviceLocale();
    i18n.locale = detected;
    return detected;
  });

  // Hydrate a persisted override (async); falls back to the detected default.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'el') {
          i18n.locale = saved;
          setLocaleState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setLocale = useCallback((l: Locale) => {
    i18n.locale = l;
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback<TFunc>((key, params) => i18n.t(key, params), [locale]);

  const value = useMemo<LocaleContextValue>(() => ({ t, locale, setLocale }), [t, locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useTranslation must be used within LocaleProvider');
  return ctx;
}
