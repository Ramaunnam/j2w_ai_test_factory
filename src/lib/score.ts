/**
 * Deterministic scoring. No randomness, no model calls: every number below is
 * computed from the mock store, so the figures agree on every page.
 */
import { db } from './db'
import type {
  ConfidenceScore,
  Finding,
  GateComponent,
  Health,
  ProcessId,
  ReleaseGate,
  RequirementId,
  ScoreComponent,
  TestRun,
  Verdict,
} from './types'
import { clamp, pct, sum } from './utils'

const OPEN_STATUSES: Finding['status'][] = ['Open', 'Triaged']

export function openFindings(): Finding[] {
  return db.findings.filter((f) => OPEN_STATUSES.includes(f.status))
}

export function openCriticalFindings(): Finding[] {
  return openFindings().filter((f) => f.severity === 'Critical')
}

/* ------------------------------------------------------------- components */

export function automationCoverageScore(): number {
  // Full processes count fully, light processes count for their scenario depth.
  const perProcess = db.processes.map((process) => {
    const scenarios = db.scenarios.filter((s) => s.processId === process.id)
    const approved = scenarios.filter((s) => s.approval === 'Approved')
    const types = new Set(approved.map((s) => s.type))
    const typeScore = (types.size / 3) * 60
    const depthScore = clamp((approved.length / 7) * 40, 0, 40)
    return typeScore + depthScore
  })
  return Math.round(sum(perProcess) / db.processes.length)
}

export function passRateScore(): number {
  const steps = db.runs.flatMap((r) => r.stepResults)
  if (steps.length === 0) return 0
  const good = steps.filter(
    (s) => s.status === 'Passed' || s.status === 'Blocked as expected' || s.status === 'Healed',
  ).length
  return pct(good, steps.length)
}

export function interfaceIntegrityScore(): number {
  const perInterface = db.interfaces.map((link) => {
    const { sent, matched, mismatched, missing, duplicated } = link.stats
    if (sent === 0) return 100
    const bad = mismatched + missing + duplicated
    return clamp(Math.round(((matched - 0) / Math.max(sent, matched + bad)) * 100), 0, 100)
  })
  return Math.round(sum(perInterface) / perInterface.length)
}

export function evidenceCompletenessScore(): number {
  const runsWithBundle = db.runs.filter((r) => r.evidenceBundleId)
  if (runsWithBundle.length === 0) return 0
  const locked = db.bundles.filter((b) => b.approvalState === 'Approved').length
  const withEvidence = runsWithBundle.filter((r) => db.evidence.some((e) => e.runId === r.id)).length
  return Math.round((pct(withEvidence, runsWithBundle.length) + pct(locked, db.bundles.length)) / 2)
}

export function selfHealingStabilityScore(): number {
  if (db.healing.length === 0) return 100
  const good = db.healing.filter((h) => h.status === 'Approved' && h.reRunPassed).length
  const pending = db.healing.filter((h) => h.status === 'Pending approval').length
  const base = pct(good, db.healing.length)
  return clamp(base - pending * 4, 0, 100)
}

export function sodCleanlinessScore(): number {
  if (db.sodConflicts.length === 0) return 100
  const proven = db.sodConflicts.filter((c) => c.proof?.outcome === 'Allowed').length
  const unproven = db.sodConflicts.filter((c) => !c.proof).length
  return clamp(100 - proven * 22 - unproven * 6, 0, 100)
}

export function reconciliationScore(): number {
  if (db.reconSets.length === 0) return 0
  return Math.round(sum(db.reconSets.map((r) => r.matchPct)) / db.reconSets.length)
}

const COMPONENT_DEFS: { key: string; label: string; weight: number; route: string; score: () => number; plain: (score: number) => string }[] = [
  {
    key: 'automation',
    label: 'Automation coverage',
    weight: 25,
    route: '/studio',
    score: automationCoverageScore,
    plain: (s) => `Approved positive, negative and regression scenarios per process. Currently ${s} of 100.`,
  },
  {
    key: 'pass-rate',
    label: 'Pass rate',
    weight: 25,
    route: '/run',
    score: passRateScore,
    plain: (s) => `Steps that passed, healed or were blocked as expected across all runs: ${s} %.`,
  },
  {
    key: 'interfaces',
    label: 'Interface integrity',
    weight: 15,
    route: '/interfaces',
    score: interfaceIntegrityScore,
    plain: (s) => `Matched messages against everything sent across all interfaces: ${s} %.`,
  },
  {
    key: 'evidence',
    label: 'Evidence completeness',
    weight: 10,
    route: '/evidence',
    score: evidenceCompletenessScore,
    plain: (s) => `Runs with locked, approved evidence bundles: ${s} of 100.`,
  },
  {
    key: 'healing',
    label: 'Self-healing stability',
    weight: 10,
    route: '/self-healing',
    score: selfHealingStabilityScore,
    plain: (s) => `Approved fixes that passed on re-run, minus a penalty for fixes still waiting: ${s} of 100.`,
  },
  {
    key: 'sod',
    label: 'Segregation of duties',
    weight: 8,
    route: '/access-sod',
    score: sodCleanlinessScore,
    plain: (s) => `Conflicts proven to be allowed cost the most, untested conflicts cost less: ${s} of 100.`,
  },
  {
    key: 'recon',
    label: 'Reconciliation match',
    weight: 7,
    route: '/reconciliation',
    score: reconciliationScore,
    plain: (s) => `Average match across all reconciliation sets: ${s} %.`,
  },
]

export function scoreComponents(): ScoreComponent[] {
  return COMPONENT_DEFS.map((def) => {
    const score = def.score()
    return { key: def.key, label: def.label, weight: def.weight, score, plain: def.plain(score), route: def.route }
  })
}

export function confidenceScore(): ConfidenceScore {
  const components = scoreComponents()
  const weighted = sum(components.map((c) => (c.score * c.weight) / 100))
  let score = Math.round(weighted)
  const criticals = openCriticalFindings()
  let cappedAt: number | undefined
  let cappedReason: string | undefined
  if (criticals.length > 0 && score > 79) {
    cappedAt = 79
    cappedReason = `${criticals.length} open critical finding${criticals.length > 1 ? 's' : ''} cap the score at 79 until they are fixed or formally accepted.`
    score = 79
  }
  const band: ConfidenceScore['band'] = score >= 80 ? 'Strong' : score >= 60 ? 'Acceptable' : 'Weak'
  return { score, components, cappedAt, cappedReason, band }
}

/* ------------------------------------------------------------------ health */

export function healthFromScore(score: number, hasCritical = false): Health {
  if (hasCritical) return 'At risk'
  if (score >= 85) return 'Healthy'
  if (score >= 65) return 'Attention'
  return 'At risk'
}

export function processPassRate(processId: ProcessId): number {
  const runs = db.runs.filter((r) => r.processId === processId)
  const steps = runs.flatMap((r) => r.stepResults)
  if (steps.length === 0) return 0
  const good = steps.filter(
    (s) => s.status === 'Passed' || s.status === 'Blocked as expected' || s.status === 'Healed',
  ).length
  return pct(good, steps.length)
}

export function processAutomationPct(processId: ProcessId): number {
  const scenarios = db.scenarios.filter((s) => s.processId === processId)
  if (scenarios.length === 0) return 0
  const approved = scenarios.filter((s) => s.approval === 'Approved').length
  const types = new Set(scenarios.filter((s) => s.approval === 'Approved').map((s) => s.type)).size
  return clamp(Math.round((approved / 7) * 60 + (types / 3) * 40), 0, 100)
}

export function processOpenFindings(processId: ProcessId): Finding[] {
  return openFindings().filter((f) => f.processId === processId)
}

export function processHealth(processId: ProcessId): Health {
  const findings = processOpenFindings(processId)
  if (db.runs.filter((r) => r.processId === processId).length === 0) return 'Not tested'
  const hasCritical = findings.some((f) => f.severity === 'Critical')
  const score = Math.round((processPassRate(processId) + processAutomationPct(processId)) / 2)
  return healthFromScore(score, hasCritical)
}

/* ------------------------------------------------------------ requirements */

export function requirementScenarioIds(id: RequirementId): string[] {
  return db.scenarios.filter((s) => s.requirementIds.includes(id)).map((s) => s.id)
}

export function requirementRunIds(id: RequirementId): string[] {
  const scenarioIds = new Set(requirementScenarioIds(id))
  return db.runs.filter((r) => r.scenarioIds.some((sid) => scenarioIds.has(sid))).map((r) => r.id)
}

/**
 * What the app really demonstrates for a requirement:
 * 25 a page demonstrates it, 30 approved scenarios, 25 scenarios that have run,
 * 20 runs with locked evidence. A requirement shown by a page alone can reach 45,
 * which reads as partial rather than missing.
 */
export function requirementCoveragePct(id: RequirementId): number {
  const requirement = db.requirements.find((item) => item.id === id)
  const scenarios = db.scenarios.filter((s) => s.requirementIds.includes(id))
  const runIds = requirementRunIds(id)

  const pageScore = requirement ? 25 : 0
  const extraPageScore = requirement && requirement.secondaryRoutes.length > 0 ? 5 : 0

  if (scenarios.length === 0) {
    const evidenceOnly = runIds.some((runId) => db.bundles.some((b) => b.runId === runId)) ? 15 : 0
    return clamp(pageScore + extraPageScore + evidenceOnly, 0, 100)
  }

  const approved = pct(scenarios.filter((s) => s.approval === 'Approved').length, scenarios.length)
  const run = pct(scenarios.filter((s) => s.lastRunId).length, scenarios.length)
  const withEvidence = runIds.filter((runId) => db.bundles.some((b) => b.runId === runId)).length
  const evidence = runIds.length === 0 ? 0 : pct(withEvidence, runIds.length)

  return clamp(Math.round(pageScore + approved * 0.3 + run * 0.25 + evidence * 0.2), 0, 100)
}

/**
 * Status colour: green is demo-ready, amber is partial, red is missing.
 * A finding never turns a requirement red - finding something is the requirement
 * working, and open findings are shown separately.
 */
export function requirementStatus(id: RequirementId): Health {
  const coverage = requirementCoveragePct(id)
  if (coverage >= 75) return 'Healthy'
  if (coverage >= 45) return 'Attention'
  if (coverage > 0) return 'At risk'
  return 'Not tested'
}

/**
 * Which requirement a single step actually tests, so a failed step is only
 * counted against that requirement. The weight comparison is a cross-system
 * data check, so it counts against R5 (integration and API testing) and not
 * against every requirement its scenario happens to touch.
 */
const STEP_KIND_REQUIREMENTS: Record<string, RequirementId[]> = {
  DATA_SETUP: ['R4'],
  UI_ACTION: ['R2'],
  API_CALL: ['R5'],
  MESSAGE_CHECK: ['R5'],
  DATA_CHECK: ['R5', 'R8'],
  DOCUMENT_CHECK: ['R3'],
  EVIDENCE: ['R3'],
}

export function requirementsForStep(
  step: { kind: string; healingEventIds?: string[] },
  scenario: { requirementIds: RequirementId[]; type: string },
  healed = false,
): RequirementId[] {
  const base = [...(STEP_KIND_REQUIREMENTS[step.kind] ?? [])]
  if (healed || (step.healingEventIds?.length ?? 0) > 0) base.push('R9')
  if (scenario.type === 'Regression') base.push('R2')
  const scoped = base.filter((id) => scenario.requirementIds.includes(id))
  return scoped.length > 0 ? Array.from(new Set(scoped)) : scenario.requirementIds
}

export const REQUIREMENT_STATUS_MEANING: Record<Health, string> = {
  Healthy: 'Demo-ready: a page demonstrates it, the scenarios are approved and have run, and the evidence is locked.',
  Attention: 'Partial: it is demonstrated, but some scenarios are not approved, not run, or have no locked evidence yet.',
  'At risk': 'Missing: almost nothing in the platform demonstrates this requirement yet.',
  'Not tested': 'Not covered in this build.',
}

/* ----------------------------------------------------------- release gate */

export function releaseGate(): ReleaseGate {
  const criticals = openCriticalFindings()
  const highs = openFindings().filter((f) => f.severity === 'High')
  const pendingApprovals = db.approvals.filter((a) => a.status === 'Pending').length
  const loadRun = db.loadRuns.find((r) => r.profile === '5x')
  const closeCriticalProcesses = db.processes.filter((p) => p.closeCritical)

  const components: GateComponent[] = [
    {
      key: 'functional',
      label: 'Functional test result',
      weight: 30,
      score: passRateScore(),
      detail: `${db.runs.length} runs, ${db.runs.flatMap((r) => r.stepResults).filter((s) => s.status === 'Failed').length} failed steps.`,
      route: '/run',
    },
    {
      key: 'coverage',
      label: 'Process coverage',
      weight: 20,
      score: automationCoverageScore(),
      detail: `${closeCriticalProcesses.length} close critical processes, ${db.scenarios.filter((s) => s.approval === 'Approved').length} approved scenarios.`,
      route: '/coverage',
    },
    {
      key: 'interfaces',
      label: 'Interface integrity',
      weight: 15,
      score: interfaceIntegrityScore(),
      detail: `${db.interfaces.length} interfaces tested, ${sum(db.interfaces.map((i) => i.stats.mismatched + i.stats.missing + i.stats.duplicated))} messages not clean.`,
      route: '/interfaces',
    },
    {
      key: 'load',
      label: 'Month-end load',
      weight: 15,
      score: loadRun ? (loadRun.verdict === 'GO' ? 100 : loadRun.verdict === 'CONDITIONAL' ? 65 : 30) : 0,
      detail: loadRun
        ? `At five times volume: ${loadRun.peakThroughput} documents per minute, ${loadRun.integrityChecks.filter((c) => !c.ok).length} integrity checks failed.`
        : 'No load test yet.',
      route: '/load',
    },
    {
      key: 'access',
      label: 'Access and segregation of duties',
      weight: 10,
      score: sodCleanlinessScore(),
      detail: `${db.sodConflicts.length} conflicts, ${db.sodConflicts.filter((c) => c.proof?.outcome === 'Allowed').length} proven to be allowed.`,
      route: '/access-sod',
    },
    {
      key: 'evidence',
      label: 'Evidence and approvals',
      weight: 10,
      score: clamp(evidenceCompletenessScore() - pendingApprovals * 3, 0, 100),
      detail: `${db.bundles.length} evidence bundles, ${pendingApprovals} approvals still open.`,
      route: '/evidence',
    },
  ]

  const score = Math.round(sum(components.map((c) => (c.score * c.weight) / 100)))

  let verdict: Verdict = score >= 85 ? 'GO' : score >= 60 ? 'CONDITIONAL' : 'NO-GO'
  let cappedReason: string | undefined
  if (criticals.length > 0 && verdict === 'GO') {
    verdict = 'CONDITIONAL'
    cappedReason = `${criticals.length} open critical finding${criticals.length > 1 ? 's' : ''}: the verdict cannot be better than CONDITIONAL.`
  } else if (criticals.length > 0) {
    cappedReason = `${criticals.length} open critical finding${criticals.length > 1 ? 's' : ''} keep the verdict at CONDITIONAL or worse.`
  }
  if (criticals.length >= 4) {
    verdict = 'NO-GO'
    cappedReason = 'Four or more open critical findings force a NO-GO.'
  }

  const blockers = [
    ...criticals.map((f) => ({
      id: f.id,
      label: f.title,
      severity: f.severity,
      route: '/run',
      refId: f.id,
    })),
    ...highs.slice(0, 4).map((f) => ({
      id: f.id,
      label: f.title,
      severity: f.severity,
      route: '/run',
      refId: f.id,
    })),
    ...(pendingApprovals > 0
      ? [
          {
            id: 'APPROVALS',
            label: `${pendingApprovals} approvals still open`,
            severity: 'Medium' as const,
            route: '/approvals',
            refId: 'APPROVALS',
          },
        ]
      : []),
  ]

  return { score, verdict, components, blockers, cappedReason }
}

export function closeReadinessPct(): number {
  const gate = releaseGate()
  const closeProcesses = db.processes.filter((p) => p.closeCritical)
  const healthy = closeProcesses.filter((p) => processHealth(p.id) === 'Healthy').length
  const changeSafe = db.closeReadiness.changeSafety.filter((c) => c.safe).length
  return clamp(
    Math.round(
      gate.score * 0.5 +
        pct(healthy, closeProcesses.length) * 0.3 +
        pct(changeSafe, db.closeReadiness.changeSafety.length) * 0.2,
    ),
    0,
    100,
  )
}

export function projectedFreezeDays(): number {
  const readiness = closeReadinessPct()
  if (readiness >= 90) return 3
  if (readiness >= 80) return 4
  if (readiness >= 70) return 5
  if (readiness >= 60) return 7
  return 10
}

/* ------------------------------------------------------------- run verdict */

export function runVerdict(run: TestRun): Verdict {
  const failed = run.stepResults.filter((s) => s.status === 'Failed')
  if (failed.length === 0) return 'GO'
  const criticalLinked = failed.some((s) => {
    const finding = s.findingId ? db.findings.find((f) => f.id === s.findingId) : undefined
    return finding?.severity === 'Critical'
  })
  const unexplained = failed.some((s) => !s.findingId)
  if (unexplained) return 'NO-GO'
  return criticalLinked ? 'CONDITIONAL' : 'CONDITIONAL'
}

export function manualHoursSaved(): number {
  const automated = db.processes.filter((p) => processAutomationPct(p.id) >= 60)
  return Math.round(sum(automated.map((p) => p.manualHoursPerMonth * 0.72)))
}
