import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchSentryRisks } from '../api/sentry';
import { SentryRisk } from '../types/sentry';

const ONE_DAY = 24 * 60 * 60 * 1000;

export function useSentryRisks(): UseQueryResult<SentryRisk[], Error> {
  return useQuery<SentryRisk[], Error>({
    queryKey: ['sentry-risks'],
    queryFn: ({ signal }) => fetchSentryRisks(100, signal),
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
