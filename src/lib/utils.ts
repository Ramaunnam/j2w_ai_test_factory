import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item)
      acc[k] = acc[k] ?? []
      acc[k].push(item)
      return acc
    },
    {} as Record<K, T[]>,
  )
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

export function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((i) => i !== item) : [...items, item]
}

export function sum(items: number[]): number {
  return items.reduce((a, b) => a + b, 0)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

/** Deterministic pseudo-random number from a string seed (no Math.random anywhere). */
export function seeded(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h % 100000) / 100000
}

export function seededInt(seed: string, min: number, max: number): number {
  return min + Math.floor(seeded(seed) * (max - min + 1))
}

export function pick<T>(seed: string, items: T[]): T {
  return items[seededInt(seed, 0, items.length - 1)]
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function hashId(prefix: string, seed: string): string {
  const value = Math.round(seeded(seed) * 0xffffff)
    .toString(16)
    .padStart(6, '0')
  const value2 = Math.round(seeded(seed + 'x') * 0xffffff)
    .toString(16)
    .padStart(6, '0')
  return `${prefix}${value}${value2}`
}

export function sortByKey<T>(items: T[], key: (item: T) => string | number, dir: 'asc' | 'desc' = 'asc'): T[] {
  return [...items].sort((a, b) => {
    const av = key(a)
    const bv = key(b)
    if (av === bv) return 0
    const result = av > bv ? 1 : -1
    return dir === 'asc' ? result : -result
  })
}

/** Finds a vehicle, wagon or container number in a row of result cells. */
export function vehicleInRow(row: string[]): string | null {
  const match = row.find((cell) => /^(VH|WGN|CNU)-[A-Z0-9]+$/i.test(cell.trim()))
  return match ? match.trim() : null
}
