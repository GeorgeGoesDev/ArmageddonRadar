/**
 * How long an APOD payload may be treated as fresh.
 *
 * NASA sometimes publishes late, so a response can still be yesterday's picture
 * even when we asked for today's. Pinning that for a full day is exactly what
 * made the banner show a stale image all day: anything that isn't the requested
 * day must go stale fast so the next app open self-corrects.
 */
export const APOD_FRESH_MS = 24 * 60 * 60 * 1000;
export const APOD_RECHECK_MS = 5 * 60 * 1000;

export function apodStaleTime(dataDate: string | undefined, apodDay: string): number {
  return dataDate === apodDay ? APOD_FRESH_MS : APOD_RECHECK_MS;
}
