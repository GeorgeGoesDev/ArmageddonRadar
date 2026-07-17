import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readWidgetSnapshot } from './storage';
import { selectNextApproach } from './snapshot';
import { NextApproachWidget } from './NextApproachWidget';

const WIDGET_NAME = 'NextApproach';

// Runs in a bare headless JS context (no providers, NativeWind, or query client).
// Reads the cached snapshot and renders — never fetches, never reads settings.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const snapshot = await readWidgetSnapshot();
  const state = selectNextApproach(snapshot, Date.now());
  props.renderWidget(<NextApproachWidget state={state} />);
}
