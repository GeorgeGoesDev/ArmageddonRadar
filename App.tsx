import './global.css';

import React from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { configureNotifications } from './src/utils/notifications';
import { SettingsProvider } from './src/settings/SettingsContext';
import { queryClient, asyncPersister } from './src/query/persister';

configureNotifications();

const ONE_DAY = 24 * 60 * 60 * 1000;

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncPersister, maxAge: ONE_DAY, buster: 'v1' }}
    >
      <SettingsProvider>
        <SafeAreaProvider>
          <DashboardScreen />
        </SafeAreaProvider>
      </SettingsProvider>
    </PersistQueryClientProvider>
  );
}
