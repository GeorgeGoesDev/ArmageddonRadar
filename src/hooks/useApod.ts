import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchApod } from '../api/apod';
import { Apod } from '../types/apod';
import { useSettings } from '../settings/SettingsContext';
import { resolveApiKey } from '../settings/settingsModel';
import { getLocalDateKey } from '../utils/dates';

const ONE_DAY = 24 * 60 * 60 * 1000;

export function useApod(): UseQueryResult<Apod, Error> {
  const { settings } = useSettings();
  const apiKey = resolveApiKey(settings);
  return useQuery<Apod, Error>({
    queryKey: ['apod', getLocalDateKey()],
    queryFn: ({ signal }) => fetchApod(apiKey, signal),
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
