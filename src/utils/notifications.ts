import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Asteroid } from '../types/neo';
import { formatLocalTime } from './dates';
import type { TFunc } from '../i18n/LocaleContext';
import type { Locale } from '../i18n/i18n';
import { formatNumber } from '../i18n/format';

/**
 * Notification engine for "Set Telescope Reminder".
 *
 * ⚠️ Expo Go caveat: since SDK 53, `expo-notifications` throws on Android the
 * moment its native module initialises inside Expo Go. So we:
 *   1. detect Expo Go via `expo-constants`, and
 *   2. only ever `require('expo-notifications')` when NOT in Expo Go.
 * In Expo Go the reminder gracefully no-ops; outside Expo Go it schedules a
 * real local notification.
 */

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy require so the module never initialises inside Expo Go.
function getNotifications() {
  return require('expo-notifications') as typeof import('expo-notifications');
}

/** Registers foreground notification behaviour (no-op in Expo Go). */
export function configureNotifications(): void {
  if (isExpoGo) return;
  const Notifications = getNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(t: TFunc): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  await Notifications.setNotificationChannelAsync('telescope-reminders', {
    name: t('notify.channelReminders'),
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#66FCF1',
  });
}

/** Requests permission, returning true when granted. */
export async function requestNotificationPermissions(t: TFunc): Promise<boolean> {
  const Notifications = getNotifications();
  await ensureAndroidChannel(t);
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
  t: TFunc,
  locale: Locale,
): Promise<ScheduledReminder> {
  if (isExpoGo) {
    // No-op: the native module isn't available here. Reject with a non-Error
    // so callers fall back to their own generic, already-localized failure
    // copy instead of us surfacing raw English from this non-React layer.
    return Promise.reject();
  }

  const Notifications = getNotifications();
  const granted = await requestNotificationPermissions(t);
  if (!granted) {
    throw new Error(t('notify.permissionDenied'));
  }

  const now = Date.now();
  const approach = asteroid.approachEpochMs;
  const adjusted = !approach || approach <= now + 5_000;
  const fireDate = adjusted ? new Date(now + 10_000) : new Date(approach);
  const distance = `${formatNumber(asteroid.missLunar, locale, 1)} LD`;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notify.reminderTitle', { name: asteroid.displayName }),
      body: adjusted
        ? t('notify.reminderBodyDemo', { name: asteroid.displayName, distance })
        : t('notify.reminderBody', { time: formatLocalTime(approach), distance }),
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
