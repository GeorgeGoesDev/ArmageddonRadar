import * as Haptics from 'expo-haptics';

/** Warning buzz for hazardous/high-threat moments. No-op when disabled. */
export function hapticWarning(enabled: boolean): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Success buzz for completed actions (reminder set, image shared). */
export function hapticSuccess(enabled: boolean): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
