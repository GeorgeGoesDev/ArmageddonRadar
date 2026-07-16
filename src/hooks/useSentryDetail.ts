import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchSentryDetail } from '../api/sentry';
import { SentryDetail } from '../types/sentry';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function useSentryDetail(des: string | null): UseQueryResult<SentryDetail, Error> {
  return useQuery<SentryDetail, Error>({
    queryKey: ['sentry-detail', des],
    queryFn: ({ signal }) => fetchSentryDetail(des as string, signal),
    enabled: !!des,
    staleTime: SEVEN_DAYS,
    gcTime: SEVEN_DAYS,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
