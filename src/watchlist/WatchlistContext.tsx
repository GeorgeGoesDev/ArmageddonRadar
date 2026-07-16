import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'watchlist:v1';

/** Pure toggle: add `id` if absent, remove it if present. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

interface WatchlistValue {
  ids: string[];
  isWatched: (id: string) => boolean;
  toggle: (id: string) => void;
}

const WatchlistContext = createContext<WatchlistValue | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          setIds(parsed.filter((x): x is string => typeof x === 'string'));
        }
      } catch {
        /* ignore a corrupt record — start empty */
      }
    })();
  }, []);

  const value = useMemo<WatchlistValue>(
    () => ({
      ids,
      isWatched: (id) => ids.includes(id),
      toggle: (id) =>
        setIds((prev) => {
          const next = toggleId(prev, id);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [ids],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider');
  return ctx;
}
