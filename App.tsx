import './global.css';

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OnboardingCarousel } from './src/components/OnboardingCarousel';
import { configureNotifications } from './src/utils/notifications';
import { SettingsProvider, useSettings } from './src/settings/SettingsContext';
import { WatchlistProvider } from './src/watchlist/WatchlistContext';
import { queryClient, asyncPersister } from './src/query/persister';
import { colors } from './src/theme/colors';

// Register the foreground notification behaviour once, at module load.
configureNotifications();

const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Gate rendering on settings hydration so the very first data fetch already
 * sees the resolved API key (a saved override would otherwise fetch under the
 * default key and miss the persisted cache).
 */
function Gate() {
  const { hydrated, settings, update } = useSettings();
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.spaceBlack }}>
        <ActivityIndicator color={colors.accentBlue} />
      </View>
    );
  }
  if (!settings.onboardingComplete) {
    return <OnboardingCarousel onDone={() => update({ onboardingComplete: true })} />;
  }
  return <DashboardScreen />;
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncPersister, maxAge: ONE_DAY, buster: 'v1' }}
    >
      <SettingsProvider>
        <WatchlistProvider>
          <SafeAreaProvider>
            <Gate />
          </SafeAreaProvider>
        </WatchlistProvider>
      </SettingsProvider>
    </PersistQueryClientProvider>
  );
}
