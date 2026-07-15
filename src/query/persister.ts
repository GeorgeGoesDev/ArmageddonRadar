import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const ONE_DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: ONE_DAY, gcTime: ONE_DAY, retry: 1, refetchOnWindowFocus: false },
  },
});

export const asyncPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'armageddon-radar/query-cache/v1',
});
