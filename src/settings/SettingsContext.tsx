import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, mergeSettings, Settings } from './settingsModel';

const STORAGE_KEY = 'armageddon-radar/settings/v1';

interface SettingsContextValue {
  settings: Settings;
  hydrated: boolean;
  update: (partial: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setSettings(mergeSettings(raw ? JSON.parse(raw) : undefined));
      } catch {
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      hydrated,
      update: (partial) =>
        setSettings((prev) => {
          const next = mergeSettings({ ...prev, ...partial });
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [settings, hydrated],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
