import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchNeoWeek, NeoWeek } from '../api/nasa';
import { buildMockWeek } from '../data/mockNeo';
import { getLocalDateKey } from '../utils/dates';
import { useSettings } from '../settings/SettingsContext';
import { resolveApiKey } from '../settings/settingsModel';

const ONE_DAY = 24 * 60 * 60 * 1000;

export function useNeoWeek({ useMock = false }: { useMock?: boolean } = {}): UseQueryResult<NeoWeek, Error> {
  const { settings } = useSettings();
  const apiKey = resolveApiKey(settings);
  const startKey = getLocalDateKey();

  return useQuery<NeoWeek, Error>({
    queryKey: ['neo-week', startKey, useMock ? 'mock' : apiKey],
    queryFn: async ({ signal }) => {
      if (useMock) return buildMockWeek();
      return fetchNeoWeek({ apiKey, signal });
    },
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
