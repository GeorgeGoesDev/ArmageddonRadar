import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getApodDayKey, getLocalDateKey } from '../utils/dates';

/**
 * Builds the AppState handler that re-reads a day key on foreground.
 *
 * Date-derived query keys are computed during render and nothing watches the
 * clock, so an app left resident across midnight keeps yesterday's key until
 * something happens to re-render. Resuming is that something.
 */
export function onForegroundChange(
  compute: () => string,
  set: (value: string) => void,
): (state: AppStateStatus) => void {
  return (state) => {
    if (state === 'active') set(compute());
  };
}

function useForegroundValue(compute: () => string): string {
  const [value, setValue] = useState(compute);
  useEffect(() => {
    const sub = AppState.addEventListener('change', onForegroundChange(compute, setValue));
    return () => sub.remove();
  }, [compute]);
  return value;
}

/** The device's local date key, re-read whenever the app returns to the foreground. */
export const useLocalDateKey = (): string => useForegroundValue(getLocalDateKey);

/** The APOD publication day key, re-read whenever the app returns to the foreground. */
export const useApodDayKey = (): string => useForegroundValue(getApodDayKey);
