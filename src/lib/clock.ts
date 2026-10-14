/**
 * Demo clock. Every mock timestamp is derived from this anchor so the
 * freeze calendar, trend chart and run history always read as "current".
 */
export const NOW_ISO = '2026-10-14T09:40:00Z'
export const NOW_MS = new Date(NOW_ISO).getTime()

export const CLOSE_DATE_ISO = '2026-10-31'
export const CLOSE_PERIOD_LABEL = 'October 2026 close'

const DAY = 86_400_000

export function daysAgo(days: number, hours = 0, minutes = 0): string {
  return new Date(NOW_MS - days * DAY - hours * 3_600_000 - minutes * 60_000).toISOString()
}

export function daysAhead(days: number, hours = 0): string {
  return new Date(NOW_MS + days * DAY + hours * 3_600_000).toISOString()
}

export function minutesAgo(minutes: number): string {
  return new Date(NOW_MS - minutes * 60_000).toISOString()
}

export function plusMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

export function plusSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString()
}

export function nowIso(): string {
  return new Date().toISOString()
}
