import { getLocales } from 'expo-localization';
import type { Locale } from './i18n';

/**
 * Formats a number with locale-specific separators, without relying on Intl's
 * per-locale ICU data (not guaranteed on Hermes for el-GR). en: 1,234.5 ·
 * el: 1.234,5.
 */
export function formatNumber(value: number, locale: Locale, fractionDigits = 0): string {
  const neg = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [intPart, fracPart] = fixed.split('.');
  const groupSep = locale === 'el' ? '.' : ',';
  const decimalSep = locale === 'el' ? ',' : '.';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
  const body = fracPart ? `${grouped}${decimalSep}${fracPart}` : grouped;
  return neg ? `-${body}` : body;
}

/** Device language on first launch: Greek device → 'el', else 'en'. */
export function detectDeviceLocale(): Locale {
  try {
    return getLocales()[0]?.languageCode === 'el' ? 'el' : 'en';
  } catch {
    return 'en';
  }
}
