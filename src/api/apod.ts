import { Apod } from '../types/apod';
import { DEFAULT_API_KEY } from './nasa';

const APOD_URL = 'https://api.nasa.gov/planetary/apod';

export function normalizeApod(raw: any): Apod {
  const isImage = raw.media_type === 'image';
  return {
    date: String(raw.date ?? ''),
    title: String(raw.title ?? ''),
    explanation: String(raw.explanation ?? ''),
    mediaType: isImage ? 'image' : 'video',
    imageUrl: isImage ? String(raw.url ?? '') : '',
    hdImageUrl: String(raw.hdurl ?? ''),
    siteUrl: String(raw.url ?? ''),
    copyright: String(raw.copyright ?? '').trim(),
  };
}

export async function fetchApod(apiKey: string = DEFAULT_API_KEY, signal?: AbortSignal): Promise<Apod> {
  const res = await fetch(`${APOD_URL}?api_key=${encodeURIComponent(apiKey)}`, { signal });
  if (!res.ok) {
    throw new Error(`APOD request failed (${res.status} ${res.statusText}).`);
  }
  return normalizeApod(await res.json());
}
