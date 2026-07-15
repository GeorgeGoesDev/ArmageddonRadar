import { useQuery } from '@tanstack/react-query';
import { Asteroid } from '../types/neo';
import { DEFAULT_API_KEY, fetchNeoFeed } from '../api/nasa';
import { getMockAsteroids } from '../data/mockNeo';
import { getLocalDateKey } from '../utils/dates';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface UseNeoFeedOptions {
  apiKey?: string;
  /** When true, serves the bundled mock data instead of calling NASA. */
  useMock?: boolean;
}

/**
 * React Query hook for today's near-Earth objects.
 *
 * The feed only changes once per day, so we cache aggressively: `staleTime` is
 * a full day and the query key is scoped to the local date, meaning the app
 * makes at most one network request per calendar day.
 */
export function useNeoFeed({ apiKey = DEFAULT_API_KEY, useMock = false }: UseNeoFeedOptions = {}) {
  const dateKey = getLocalDateKey();

  return useQuery<Asteroid[], Error>({
    queryKey: ['neo-feed', dateKey, useMock ? 'mock' : apiKey],
    queryFn: async ({ signal }) => {
      if (useMock) return getMockAsteroids();
      return fetchNeoFeed({ apiKey, signal });
    },
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
