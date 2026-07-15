import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Asteroid } from '../types/neo';
import { formatLocalTime } from './dates';

/**
 * Notification engine for "Set Telescope Reminder".
 *
 * Uses the Expo SDK 57 API: a `NotificationBehavior` handler with
 * `shouldShowBanner` / `shouldShowList`, and a `SchedulableTriggerInputTypes.DATE`
 * trigger fired at the asteroid's closest-approach time.
 */

/** Registers how notifications behave while the app is foregrounded. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('telescope-reminders', {
    name: 'Telescope Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#66FCF1',
  });
}

/** Requests permission, returning true when granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  await ensureAndroidChannel();
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;

  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return req.granted;
}

export interface ScheduledReminder {
  id: string;
  /** The instant the reminder will fire. */
  fireDate: Date;
  /** True when the real approach was in the past and we nudged it to soon. */
  adjusted: boolean;
}

/**
 * Schedules a local notification for an asteroid's closest approach. If that
 * moment has already passed today, we schedule a short demo reminder ~10s out
 * so the feature is still observable.
 */
export async function scheduleApproachReminder(
  asteroid: Asteroid,
): Promise<ScheduledReminder> {
  const granted = await requestNotificationPermissions();
  if (!granted) {
    throw new Error('Notification permission was not granted.');
  }

  const now = Date.now();
  const approach = asteroid.approachEpochMs;
  const adjusted = !approach || approach <= now + 5_000;
  const fireDate = adjusted ? new Date(now + 10_000) : new Date(approach);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔭 ${asteroid.displayName} at closest approach`,
      body: adjusted
        ? `Demo reminder — ${asteroid.displayName} passes ${asteroid.missLunar.toFixed(1)} lunar distances away.`
        : `Point your telescope up! Closest approach ~${formatLocalTime(approach)}, ${asteroid.missLunar.toFixed(1)} LD away.`,
      data: { asteroidId: asteroid.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: 'telescope-reminders',
    },
  });

  return { id, fireDate, adjusted };
}
