import { SentryDetail, SentryRisk } from '../types/sentry';

const SENTRY_URL = 'https://ssd-api.jpl.nasa.gov/sentry.api';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

/** Sentry gives diameter in km; the app works in metres. */
export function normalizeSentryRow(row: Record<string, unknown>): SentryRisk {
  return {
    designation: String(row.des ?? ''),
    name: String(row.fullname ?? row.des ?? ''),
    impactProb: num(row.ip),
    palermoCum: num(row.ps_cum),
    torinoMax: Math.round(num(row.ts_max)),
    estDiameterM: num(row.diameter) * 1000,
    nImpacts: Math.round(num(row.n_imp)),
    yearRange: String(row.range ?? ''),
  };
}

export function normalizeSentryDetail(s: Record<string, unknown>): SentryDetail {
  return {
    designation: String(s.des ?? ''),
    name: String(s.fullname ?? s.des ?? ''),
    impactProb: num(s.ip),
    palermoCum: num(s.ps_cum),
    palermoMax: num(s.ps_max),
    torinoMax: Math.round(num(s.ts_max)),
    energyMt: num(s.energy),
    estDiameterM: num(s.diameter) * 1000,
    massKg: num(s.mass),
    vInfKps: num(s.v_inf),
    firstObs: String(s.first_obs ?? ''),
    lastObs: String(s.last_obs ?? ''),
    nImpacts: Math.round(num(s.n_imp)),
  };
}

async function getJson(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Sentry API request failed (${res.status} ${res.statusText}).`);
  }
  return res.json();
}

/** Top risk-listed objects, highest cumulative impact probability first. */
export async function fetchSentryRisks(limit = 100, signal?: AbortSignal): Promise<SentryRisk[]> {
  const data = await getJson(SENTRY_URL, signal);
  const rows: Record<string, unknown>[] = data.data ?? [];
  return rows
    .map(normalizeSentryRow)
    .sort((a, b) => b.impactProb - a.impactProb)
    .slice(0, limit);
}

export async function fetchSentryDetail(des: string, signal?: AbortSignal): Promise<SentryDetail> {
  const data = await getJson(`${SENTRY_URL}?des=${encodeURIComponent(des)}`, signal);
  if (!data.summary) throw new Error(`No Sentry detail for ${des}.`);
  return normalizeSentryDetail(data.summary);
}
