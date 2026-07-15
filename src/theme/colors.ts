/**
 * Design tokens for Armageddon Radar.
 *
 * These mirror the Tailwind colour scale in `tailwind.config.js` but are exposed
 * as plain strings so they can be handed to `react-native-svg` (which cannot use
 * NativeWind class names) and to inline styles for glows/shadows.
 */
export const colors = {
  // Backgrounds
  spaceBlack: '#0B0C10',
  spaceSlate: '#1F2833',
  charcoal: '#131720',

  // Primary / info accents
  accentBlue: '#66FCF1',
  accentPurple: '#8A2BE2',

  // Threat gradient
  threatYellow: '#FAD02C',
  threatOrange: '#FF4500',
  safeGreen: '#3DF07A',

  // Text
  textPrimary: '#E8F6F5',
  textMuted: '#8A9BA8',

  // Lines / structure
  gridLine: 'rgba(102, 252, 241, 0.14)',
  gridLineFaint: 'rgba(102, 252, 241, 0.06)',
  cardBorder: 'rgba(102, 252, 241, 0.18)',
} as const;

export type ColorToken = keyof typeof colors;
