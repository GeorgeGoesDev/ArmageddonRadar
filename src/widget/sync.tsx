import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { NeoWeek } from '../api/nasa';
import type { ThreatThresholds } from '../utils/threat';
import { isExpoGo } from '../utils/notifications';
import { buildWidgetSnapshot, selectNextApproach } from './snapshot';
import { writeWidgetSnapshot } from './storage';
import { NextApproachWidget } from './NextApproachWidget';

const WIDGET_NAME = 'NextApproach';

/**
 * Rebuilds the widget snapshot from the cached week feed and repaints any live
 * widget immediately. No-ops in Expo Go (the native module throws there), and
 * never lets a widget failure break the caller.
 */
export async function syncWidget(
  week: NeoWeek,
  thresholds: ThreatThresholds,
  now: number = Date.now(),
): Promise<void> {
  if (isExpoGo) return;
  try {
    const snapshot = buildWidgetSnapshot(week, thresholds, now);
    await writeWidgetSnapshot(snapshot);
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <NextApproachWidget state={selectNextApproach(snapshot, Date.now())} />,
      widgetNotFound: () => {},
    });
  } catch {
    /* widget is non-critical — never surface to the dashboard */
  }
}
