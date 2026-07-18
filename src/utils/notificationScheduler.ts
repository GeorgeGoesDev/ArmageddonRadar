import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { NeoWeek } from '../api/nasa';
import { Settings } from '../settings/settingsModel';
import { ThreatThresholds } from './threat';
import { isExpoGo } from './notifications';
import { planDailyDigests, planSmartAlerts } from './notificationPlan';
import type { TFunc } from '../i18n/LocaleContext';
import type { Locale } from '../i18n/i18n';

const SCHEDULED_KEY = 'scheduledAuto:v1';

// Lazy require so the native module never initialises inside Expo Go.
function getNotifications() {
  return require('expo-notifications') as typeof import('expo-notifications');
}

async function ensureAutoChannels(t: TFunc): Promise<void> {
  if (Platform.OS !== 'android') return;
  const N = getNotifications();
  await N.setNotificationChannelAsync('daily-digest', {
    name: t('notify.channelDigest'),
    importance: N.AndroidImportance.DEFAULT,
    lightColor: '#66FCF1',
  });
  await N.setNotificationChannelAsync('smart-alerts', {
    name: t('notify.channelAlerts'),
    importance: N.AndroidImportance.HIGH,
    lightColor: '#FF4500',
  });
}

/**
 * Reschedules the app's *auto* notifications (daily digests + smart alerts) from
 * the currently cached week feed. No-ops in Expo Go. Cancels only the ids we
 * previously scheduled (tracked in `scheduledAuto:v1`) so the user's manual
 * telescope reminders are never touched.
 */
export async function syncAutoNotifications(
  week: NeoWeek,
  settings: Settings,
  thresholds: ThreatThresholds,
  t: TFunc,
  locale: Locale,
  now: number = Date.now(),
): Promise<void> {
  if (isExpoGo) return;
  const N = getNotifications();

  const perm = await N.getPermissionsAsync();
  if (!perm.granted) {
    const req = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    if (!req.granted) return;
  }
  await ensureAutoChannels(t);

  // Cancel the previous auto set.
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_KEY);
    const prior: string[] = raw ? JSON.parse(raw) : [];
    await Promise.all(prior.map((id) => N.cancelScheduledNotificationAsync(id).catch(() => {})));
  } catch {
    /* ignore a corrupt/missing record */
  }

  const digests = settings.dailyDigestEnabled
    ? planDailyDigests(week, settings.digestHour, thresholds, now, t, locale)
    : [];
  const alerts = settings.smartAlertsEnabled ? planSmartAlerts(week, settings.dangerLD, now, t, locale) : [];

  const newIds: string[] = [];
  for (const d of digests) {
    const id = await N.scheduleNotificationAsync({
      content: { title: d.title, body: d.body, data: { kind: 'digest', dayKey: d.dayKey } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: d.fireDate, channelId: 'daily-digest' },
    });
    newIds.push(id);
  }
  for (const a of alerts) {
    const id = await N.scheduleNotificationAsync({
      content: { title: a.title, body: a.body, data: { kind: 'alert', asteroidId: a.asteroidId } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: a.fireDate, channelId: 'smart-alerts' },
    });
    newIds.push(id);
  }
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(newIds)).catch(() => {});
}
