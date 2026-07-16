import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchNeoDetail } from '../api/neoDetail';
import { NeoDetail } from '../types/neoDetail';
import { useSettings } from '../settings/SettingsContext';
import { resolveApiKey } from '../settings/settingsModel';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function useNeoDetail(id: string | null): UseQueryResult<NeoDetail, Error> {
  const { settings } = useSettings();
  const apiKey = resolveApiKey(settings);
  return useQuery<NeoDetail, Error>({
    queryKey: ['neo-detail', id],
    queryFn: ({ signal }) => fetchNeoDetail(id as string, apiKey, signal),
    enabled: !!id,
    staleTime: SEVEN_DAYS,
    gcTime: SEVEN_DAYS,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
