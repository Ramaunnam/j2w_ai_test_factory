import type { LoadIntegrityCheck, LoadPoint, LoadProfile, LoadRunResult } from '@/lib/types'
import { daysAgo } from '@/lib/clock'
import { seededInt } from '@/lib/utils'

const PROFILE_SETTINGS: Record<
  LoadProfile,
  { label: string; factor: number; baseThroughput: number; baseP95: number; baseError: number; backlogGrowth: number }
> = {
  normal: { label: 'Normal day', factor: 1, baseThroughput: 84, baseP95: 640, baseError: 0.1, backlogGrowth: 0 },
  '2x': { label: 'Two times month-end', factor: 2, baseThroughput: 168, baseP95: 1080, baseError: 0.3, backlogGrowth: 4 },
  '5x': { label: 'Five times month-end', factor: 5, baseThroughput: 412, baseP95: 2480, baseError: 0.9, backlogGrowth: 42 },
}

export const LOAD_PROFILE_LABELS = PROFILE_SETTINGS

/** Deterministic 20 minute series per profile - same numbers every time. */
export function buildSeries(profile: LoadProfile): LoadPoint[] {
  const settings = PROFILE_SETTINGS[profile]
  const points: LoadPoint[] = []
  for (let minute = 1; minute <= 20; minute++) {
    const ramp = Math.min(1, minute / 4)
    const jitter = seededInt(`${profile}-${minute}`, -4, 4) / 100
    const stress = profile === '5x' && minute > 8 ? 1 + (minute - 8) * 0.03 : 1
    points.push({
      minute,
      throughput: Math.round(settings.baseThroughput * ramp * (1 + jitter)),
      p95Ms: Math.round(settings.baseP95 * ramp * stress * (1 + jitter)),
      errorRatePct: Number((settings.baseError * stress * (1 + jitter)).toFixed(2)),
      backlog:
        profile === '5x'
          ? Math.max(0, Math.round(settings.backlogGrowth * Math.max(0, minute - 6) * (1 + jitter)))
          : Math.round(settings.backlogGrowth * ramp * (1 + jitter)),
    })
  }
  return points
}

function integrity(profile: LoadProfile): LoadIntegrityCheck[] {
  const factor = PROFILE_SETTINGS[profile].factor
  const base: { interfaceId: string; perRun: number }[] = [
    { interfaceId: 'IF-01', perRun: 412 },
    { interfaceId: 'IF-03', perRun: 246 },
    { interfaceId: 'IF-04', perRun: 188 },
    { interfaceId: 'IF-06', perRun: 322 },
    { interfaceId: 'IF-09', perRun: 540 },
    { interfaceId: 'IF-13', perRun: 64 },
  ]
  return base.map((item) => {
    const sentIn = item.perRun * factor
    const lost = profile === '5x' && item.interfaceId === 'IF-06' ? 2 : 0
    const duplicated = profile === '5x' && item.interfaceId === 'IF-01' ? 1 : 0
    const receivedOut = sentIn - lost + duplicated
    return {
      interfaceId: item.interfaceId,
      sentIn,
      receivedOut,
      duplicated,
      lost,
      ok: lost === 0 && duplicated === 0,
    }
  })
}

function buildLoadRun(profile: LoadProfile, id: string, daysOld: number): LoadRunResult {
  const series = buildSeries(profile)
  const checks = integrity(profile)
  const peakThroughput = Math.max(...series.map((p) => p.throughput))
  const p95Ms = Math.max(...series.map((p) => p.p95Ms))
  const errorRatePct = Number((series.reduce((a, p) => a + p.errorRatePct, 0) / series.length).toFixed(2))
  const maxBacklog = Math.max(...series.map((p) => p.backlog))
  const allOk = checks.every((c) => c.ok)
  return {
    id,
    profile,
    processIds: ['P1', 'P2', 'P3', 'P5', 'P6'],
    interfaceIds: checks.map((c) => c.interfaceId),
    startedAt: daysAgo(daysOld, 6),
    series,
    integrityChecks: checks,
    peakThroughput,
    p95Ms,
    errorRatePct,
    maxBacklog,
    verdict: allOk ? (p95Ms < 1500 ? 'GO' : 'CONDITIONAL') : 'CONDITIONAL',
    bottlenecks:
      profile === '5x'
        ? [
            {
              interfaceId: 'IF-06',
              plain:
                'The invoice interface queue reached its depth limit for four minutes and dropped two documents without a dead letter entry.',
              severity: 'High',
            },
            {
              interfaceId: 'IF-09',
              plain:
                'Document output response time rose to 2.5 seconds at the 95th percentile, which is slow but inside the agreed limit of 3 seconds.',
              severity: 'Medium',
            },
            {
              interfaceId: 'IF-01',
              plain: 'One receipt message was delivered twice under load, because the interface has no idempotency key.',
              severity: 'High',
            },
          ]
        : profile === '2x'
          ? [
              {
                interfaceId: 'IF-09',
                plain: 'Document output response time doubles but stays well inside the limit.',
                severity: 'Low',
              },
            ]
          : [],
    findingIds: profile === '5x' ? ['F-015'] : [],
  }
}

export const LOAD_RUNS: LoadRunResult[] = [
  buildLoadRun('normal', 'LOAD-1012', 7),
  buildLoadRun('2x', 'LOAD-1018', 6),
  buildLoadRun('5x', 'LOAD-1024', 5),
]

export const LOAD_RUN_BY_PROFILE = new Map(LOAD_RUNS.map((r) => [r.profile, r]))
export const LOAD_RUN_BY_ID = new Map(LOAD_RUNS.map((r) => [r.id, r]))
