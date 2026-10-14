/** Formatting helpers - all locale-stable so the demo always reads the same. */

const NBSP = ' '

export function num(value: number | null | undefined, decimals = 0): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
    .replace(/(\d)(?=(\d{3})+\.)/g, '$1')
}

export function kg(value: number): string {
  return `${num(value)} kg`
}

export function tonnes(value: number, decimals = 3): string {
  return `${num(value, decimals)} t`
}

export function percent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)} %`
}

export function money(value: number, currency = 'EUR'): string {
  return `${num(value, 2)} ${currency}`
}

export function ms(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`
  return `${Math.round(value)} ms`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parse(iso: string): Date {
  return new Date(iso)
}

export function dateShort(iso: string): string {
  const d = parse(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]}`
}

export function dateMedium(iso: string): string {
  const d = parse(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function timeShort(iso: string): string {
  const d = parse(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export function dateTime(iso: string): string {
  return `${dateMedium(iso)} ${timeShort(iso)}`
}

export function dateTimeSec(iso: string): string {
  const d = parse(iso)
  return `${dateTime(iso)}:${String(d.getUTCSeconds()).padStart(2, '0')}`
}

export function isoDate(iso: string): string {
  return iso.slice(0, 10)
}

export function durationShort(msValue: number): string {
  const totalSeconds = Math.round(msValue / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m < 60) return `${m}m ${String(s).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}

export function relativeTo(iso: string, nowIso: string): string {
  const diff = parse(nowIso).getTime() - parse(iso).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} d ago`
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function stepKindLabel(kind: string): string {
  return kind.replace('_', ' ')
}
