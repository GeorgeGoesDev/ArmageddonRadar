import './global.css';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { configureNotifications } from './src/utils/notifications';

// Register the foreground notification behaviour once, at module load.
configureNotifications();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The NeoWs feed only changes once a day; avoid needless refetches.
      staleTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <DashboardScreen />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
