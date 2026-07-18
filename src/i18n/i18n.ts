import { I18n } from 'i18n-js';
import { en } from './en';
import { el } from './el';

export type Locale = 'en' | 'el';

export const i18n = new I18n(
  { en, el },
  { defaultLocale: 'en', enableFallback: true },
);
