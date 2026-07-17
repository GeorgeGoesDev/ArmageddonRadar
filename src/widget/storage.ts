import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetSnapshot } from './snapshot';

export const WIDGET_SNAPSHOT_KEY = 'widget:snapshot:v1';

/** Reads the persisted snapshot, or null if missing/unreadable/unparseable. */
export async function readWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}

/** Persists the snapshot; swallows write errors (the widget is non-critical). */
export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* non-fatal */
  }
}
