import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchApod } from '../api/apod';
import { Apod } from '../types/apod';
import { useSettings } from '../settings/SettingsContext';
import { resolveApiKey } from '../settings/settingsModel';
import { useApodDayKey } from './useDayKey';
import { apodStaleTime } from '../utils/apodFreshness';

const ONE_DAY = 24 * 60 * 60 * 1000;

export function useApod(): UseQueryResult<Apod, Error> {
  const { settings } = useSettings();
  const apiKey = resolveApiKey(settings);
  const apodDay = useApodDayKey();

  return useQuery<Apod, Error>({
    // Key on NASA's publication day, not the device's. NASA rolls APOD at
    // midnight US Eastern; keying on the device's date cached yesterday's
    // payload under today's key for the whole local morning.
    queryKey: ['apod', apodDay],
    // Keep asking for "latest" rather than sending &date= — requesting a day
    // NASA has not published yet is an error, whereas latest-plus-validation
    // degrades gracefully.
    queryFn: ({ signal }) => fetchApod(apiKey, signal),
    staleTime: (query) => apodStaleTime(query.state.data?.date, apodDay),
    gcTime: ONE_DAY,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
