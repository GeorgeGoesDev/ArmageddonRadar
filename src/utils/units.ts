/** Formatting helpers. All numbers arrive already parsed as `number`. */

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function formatInt(n: number): string {
  return nf0.format(n);
}

export function formatKph(kph: number): string {
  return `${nf0.format(kph)} km/h`;
}

export function formatMiles(miles: number): string {
  return `${nf0.format(miles)} mi`;
}

export function formatKm(km: number): string {
  return `${nf0.format(km)} km`;
}

/** Lunar distance to one decimal, e.g. "3.4 LD". */
export function formatLunar(lunar: number): string {
  return `${nf1.format(lunar)} LD`;
}

/** Diameter range in metres, e.g. "28 – 62 m". */
export function formatDiameterRange(minM: number, maxM: number): string {
  return `${nf0.format(minM)} – ${nf0.format(maxM)} m`;
}
