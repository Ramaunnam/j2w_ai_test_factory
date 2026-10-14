import type {
  EvidenceBundle,
  EvidenceItem,
  EvidenceKind,
  Environment,
  ProcessId,
  RequirementId,
  RoleName,
  RunStatus,
  RunType,
  Step,
  StepResult,
  StepStatus,
  TestRun,
  Verdict,
} from '@/lib/types'
import { SCENARIO_BY_ID } from './scenarios'
import { daysAgo, plusSeconds } from '@/lib/clock'
import { hashId, unique } from '@/lib/utils'

/* ------------------------------------------------------- outcome -> status */

export function statusForOutcome(outcome: Step['mock']['outcome']): StepStatus {
  switch (outcome) {
    case 'pass':
      return 'Passed'
    case 'heal-then-pass':
      return 'Healed'
    case 'blocked-as-expected':
      return 'Blocked as expected'
    case 'skip':
      return 'Skipped'
    case 'fail':
    case 'finding':
      return 'Failed'
    default:
      return 'Passed'
  }
}

export function runStatusFor(stepResults: StepResult[]): RunStatus {
  const failed = stepResults.filter((r) => r.status === 'Failed')
  if (failed.length === 0) return 'Passed'
  const withoutFinding = failed.filter((r) => !r.findingId)
  return withoutFinding.length > 0 ? 'Failed' : 'Passed with findings'
}

export function verdictFor(status: RunStatus, hasCritical: boolean): Verdict {
  if (status === 'Failed') return 'NO-GO'
  if (status === 'Passed with findings') return hasCritical ? 'CONDITIONAL' : 'CONDITIONAL'
  return 'GO'
}

/* ----------------------------------------------------------- run builders */

interface RunInput {
  id: string
  runType: RunType
  processId?: ProcessId
  label: string
  scenarioIds: string[]
  startedDaysAgo: number
  startedHoursAgo?: number
  triggeredByRole: RoleName
  environment?: Environment
  baselineRunId?: string
  site?: 'ALL' | 'PL01' | 'PL03' | 'YD02' | 'YD05'
  criticalFindingIds?: string[]
}

const EVIDENCE_ITEMS_BUILD: EvidenceItem[] = []

function evidenceKindFor(title: string, step: Step): EvidenceKind {
  if (title.toLowerCase().startsWith('screenshot')) return 'screenshot'
  if (title.toLowerCase().startsWith('document preview')) return 'document'
  if (title.toLowerCase().startsWith('query and result')) return 'query-result'
  if (title.toLowerCase().startsWith('request and response') || title.toLowerCase().startsWith('message payload'))
    return 'payload'
  if (step.mock.screenshot) return 'screenshot'
  if (step.mock.document) return 'document'
  if (step.mock.rows) return 'query-result'
  if (step.mock.payload) return 'payload'
  return 'log'
}

function buildRun(input: RunInput): TestRun {
  const startedAt = daysAgo(input.startedDaysAgo, input.startedHoursAgo ?? 0)
  const stepResults: StepResult[] = []
  const findingIds: string[] = []
  let cursor = 0

  for (const scenarioId of input.scenarioIds) {
    const scenario = SCENARIO_BY_ID.get(scenarioId)
    if (!scenario) continue
    for (const step of scenario.steps) {
      const status = statusForOutcome(step.mock.outcome)
      const startedStep = plusSeconds(startedAt, cursor)
      cursor += Math.round(step.mock.durationMs / 1000) + 1
      const evidenceIds: string[] = []

      step.mock.evidenceTitles.forEach((title, index) => {
        const evidenceId = `EV-${input.id.replace('RUN-', '')}-${step.id}-${index + 1}`
        evidenceIds.push(evidenceId)
        EVIDENCE_ITEMS_BUILD.push({
          id: evidenceId,
          runId: input.id,
          scenarioId,
          stepId: step.id,
          kind: evidenceKindFor(title, step),
          title,
          capturedAt: startedStep,
          hash: hashId('sha256:', `${input.id}${step.id}${index}`),
          locked: true,
          approvedByRole: input.id === 'RUN-1042' ? undefined : 'Key User',
          screenshot: step.mock.screenshot,
          rows: step.mock.rows,
          document: step.mock.document,
          payload: step.mock.payload,
          log: step.mock.logLines,
        })
      })

      if (step.mock.findingId) findingIds.push(step.mock.findingId)

      stepResults.push({
        scenarioId,
        stepId: step.id,
        status,
        startedAt: startedStep,
        durationMs: step.mock.durationMs,
        logLines: step.mock.logLines,
        evidenceIds,
        findingId: step.mock.findingId,
        healingEventId: step.mock.healingEventId,
      })
    }
  }

  const status = runStatusFor(stepResults)
  const hasCritical = (input.criticalFindingIds ?? []).length > 0
  const passedSteps = stepResults.filter((r) => r.status === 'Passed').length
  const failedSteps = stepResults.filter((r) => r.status === 'Failed').length
  const healedSteps = stepResults.filter((r) => r.status === 'Healed').length
  const blockedSteps = stepResults.filter((r) => r.status === 'Blocked as expected').length

  return {
    id: input.id,
    runType: input.runType,
    processId: input.processId,
    label: input.label,
    scenarioIds: input.scenarioIds,
    selection: {
      processId: input.processId ?? 'ALL',
      scenarioIds: input.scenarioIds,
      systemIds: unique(input.scenarioIds.flatMap((id) => SCENARIO_BY_ID.get(id)?.systemIds ?? [])),
      interfaceIds: unique(input.scenarioIds.flatMap((id) => SCENARIO_BY_ID.get(id)?.interfaceIds ?? [])),
      scenarioTypes: unique(input.scenarioIds.map((id) => SCENARIO_BY_ID.get(id)?.type).filter(Boolean) as never[]),
      site: input.site ?? 'ALL',
      dateFrom: startedAt.slice(0, 10),
      dateTo: startedAt.slice(0, 10),
      environment: input.environment ?? 'TEST',
    },
    environment: input.environment ?? 'TEST',
    triggeredByRole: input.triggeredByRole,
    startedAt,
    finishedAt: plusSeconds(startedAt, cursor),
    status,
    stepResults,
    findingIds: unique(findingIds),
    evidenceBundleId: `EVB-${input.id.replace('RUN-', '')}`,
    verdict: verdictFor(status, hasCritical),
    passedSteps,
    failedSteps,
    healedSteps,
    blockedSteps,
    baselineRunId: input.baselineRunId,
  }
}

/* ------------------------------------------------------------ synthetic runs */

interface SyntheticStep {
  label: string
  status: StepStatus
  durationMs: number
  log: string[]
  findingId?: string
  evidence?: { title: string; kind: EvidenceKind; log?: string[] }[]
}

function buildSyntheticRun(
  input: Omit<RunInput, 'scenarioIds'> & { steps: SyntheticStep[]; requirementIds: RequirementId[] },
): TestRun {
  const startedAt = daysAgo(input.startedDaysAgo, input.startedHoursAgo ?? 0)
  const stepResults: StepResult[] = []
  const findingIds: string[] = []
  let cursor = 0

  input.steps.forEach((step, index) => {
    const stepId = `${input.id}-S${String(index + 1).padStart(2, '0')}`
    const startedStep = plusSeconds(startedAt, cursor)
    cursor += Math.round(step.durationMs / 1000) + 1
    const evidenceIds: string[] = []

    ;(step.evidence ?? []).forEach((ev, evIndex) => {
      const evidenceId = `EV-${input.id.replace('RUN-', '')}-S${index + 1}-${evIndex + 1}`
      evidenceIds.push(evidenceId)
      EVIDENCE_ITEMS_BUILD.push({
        id: evidenceId,
        runId: input.id,
        scenarioId: '',
        stepId,
        kind: ev.kind,
        title: ev.title,
        capturedAt: startedStep,
        hash: hashId('sha256:', `${input.id}${stepId}${evIndex}`),
        locked: true,
        approvedByRole: 'Auditor',
        log: ev.log ?? step.log,
      })
    })

    if (step.findingId) findingIds.push(step.findingId)

    stepResults.push({
      scenarioId: '',
      stepId,
      status: step.status,
      startedAt: startedStep,
      durationMs: step.durationMs,
      logLines: step.log,
      evidenceIds,
      findingId: step.findingId,
    })
  })

  const status = runStatusFor(stepResults)
  return {
    id: input.id,
    runType: input.runType,
    processId: input.processId,
    label: input.label,
    scenarioIds: [],
    selection: {
      processId: input.processId ?? 'ALL',
      scenarioIds: [],
      systemIds: [],
      interfaceIds: [],
      scenarioTypes: [],
      site: input.site ?? 'ALL',
      dateFrom: startedAt.slice(0, 10),
      dateTo: startedAt.slice(0, 10),
      environment: input.environment ?? 'TEST',
    },
    environment: input.environment ?? 'TEST',
    triggeredByRole: input.triggeredByRole,
    startedAt,
    finishedAt: plusSeconds(startedAt, cursor),
    status,
    stepResults,
    findingIds: unique(findingIds),
    evidenceBundleId: `EVB-${input.id.replace('RUN-', '')}`,
    verdict: verdictFor(status, (input.criticalFindingIds ?? []).length > 0),
    passedSteps: stepResults.filter((r) => r.status === 'Passed').length,
    failedSteps: stepResults.filter((r) => r.status === 'Failed').length,
    healedSteps: stepResults.filter((r) => r.status === 'Healed').length,
    blockedSteps: stepResults.filter((r) => r.status === 'Blocked as expected').length,
  }
}

/* ------------------------------------------------------------------- runs */

export const RUNS: TestRun[] = [
  buildRun({
    id: 'RUN-1042',
    runType: 'Functional',
    processId: 'P1',
    label: 'P1 Gate to Invoice - full set',
    scenarioIds: ['P1-POS-01', 'P1-POS-02', 'P1-NEG-01', 'P1-NEG-02', 'P1-NEG-03', 'P1-REG-01', 'P1-REG-02'],
    startedDaysAgo: 0,
    startedHoursAgo: 2,
    triggeredByRole: 'QA Lead',
    site: 'PL01',
    baselineRunId: 'RUN-1030',
    criticalFindingIds: ['F-001'],
  }),
  buildRun({
    id: 'RUN-1041',
    runType: 'Functional',
    processId: 'P1',
    label: 'P1 invoice posting scenarios',
    scenarioIds: ['P1-POS-03', 'P1-NEG-04'],
    startedDaysAgo: 1,
    startedHoursAgo: 3,
    triggeredByRole: 'QA Lead',
    site: 'PL01',
  }),
  buildRun({
    id: 'RUN-1040',
    runType: 'Functional',
    processId: 'P2',
    label: 'P2 Scrap to Stock - full set',
    scenarioIds: ['P2-POS-01', 'P2-POS-02', 'P2-NEG-01', 'P2-NEG-02', 'P2-NEG-03', 'P2-REG-01', 'P2-REG-02'],
    startedDaysAgo: 1,
    startedHoursAgo: 6,
    triggeredByRole: 'QA Lead',
    site: 'YD02',
    baselineRunId: 'RUN-1029',
    criticalFindingIds: ['F-002'],
  }),
  buildRun({
    id: 'RUN-1039',
    runType: 'Functional',
    processId: 'P4',
    label: 'P4 Produce to Dispatch',
    scenarioIds: ['P4-POS-01', 'P4-NEG-01', 'P4-REG-01'],
    startedDaysAgo: 2,
    startedHoursAgo: 4,
    triggeredByRole: 'QA Lead',
    site: 'PL01',
  }),
  buildRun({
    id: 'RUN-1038',
    runType: 'Functional',
    processId: 'P5',
    label: 'P5 Order to Cash',
    scenarioIds: ['P5-POS-01', 'P5-POS-02', 'P5-NEG-01', 'P5-REG-01'],
    startedDaysAgo: 2,
    startedHoursAgo: 8,
    triggeredByRole: 'Key User',
    site: 'PL03',
  }),
  buildRun({
    id: 'RUN-1037',
    runType: 'Functional',
    processId: 'P3',
    label: 'P3 Procure to Pay including treasury',
    scenarioIds: ['P3-POS-01', 'P3-POS-02', 'P3-NEG-01', 'P3-REG-01'],
    startedDaysAgo: 3,
    startedHoursAgo: 5,
    triggeredByRole: 'QA Lead',
  }),
  buildRun({
    id: 'RUN-1036',
    runType: 'Functional',
    processId: 'P6',
    label: 'P6 Month-End Close dry run',
    scenarioIds: ['P6-POS-01', 'P6-POS-02', 'P6-NEG-01', 'P6-REG-01'],
    startedDaysAgo: 3,
    startedHoursAgo: 9,
    triggeredByRole: 'QA Lead',
  }),
  buildSyntheticRun({
    id: 'RUN-1035',
    runType: 'SoD',
    label: 'Segregation of duties proof tests',
    processId: 'P3',
    startedDaysAgo: 4,
    startedHoursAgo: 3,
    triggeredByRole: 'IT Admin',
    requirementIds: ['R7'],
    criticalFindingIds: [],
    steps: [
      {
        label: 'Load role assignments from all four systems',
        status: 'Passed',
        durationMs: 2400,
        log: ['Reading role assignments from the steel ERP, service centre ERP, recycling ERP and yard', '14 roles and 12 users loaded'],
        evidence: [{ title: 'Query and result rows: role assignments', kind: 'query-result' }],
      },
      {
        label: 'Build the conflict matrix',
        status: 'Passed',
        durationMs: 1800,
        log: ['Applying 6 conflict rules to 12 users', '5 conflicts found'],
        evidence: [{ title: 'Query and result rows: conflict matrix', kind: 'query-result' }],
      },
      {
        label: 'Prove it: create a vendor and pay it with one user',
        status: 'Failed',
        durationMs: 3200,
        findingId: 'F-013',
        log: [
          'Signing in as Key User C in the steel ERP',
          'Vendor VEND-9901 created successfully',
          'Payment run started successfully by the same user',
          'The forbidden combination was allowed - finding F-013 raised',
        ],
        evidence: [{ title: 'Screenshot: vendor created and payment run started', kind: 'screenshot' }],
      },
      {
        label: 'Prove it: change bank details and run the payment run with one user',
        status: 'Failed',
        durationMs: 3000,
        findingId: 'F-014',
        log: [
          'Signing in as Key User F',
          'Vendor bank account changed on VEND-1042',
          'Payment run executed by the same user',
          'The forbidden combination was allowed - finding F-014 raised',
        ],
        evidence: [{ title: 'Screenshot: bank change and payment run', kind: 'screenshot' }],
      },
      {
        label: 'Prove it: post a goods receipt and the matching invoice with one user',
        status: 'Blocked as expected',
        durationMs: 2600,
        log: [
          'Signing in as Key User B',
          'Goods receipt posted',
          'Invoice posting refused: user is not authorised for invoice entry',
          'Blocked as expected - control is effective',
        ],
        evidence: [{ title: 'Screenshot: invoice entry refused', kind: 'screenshot' }],
      },
    ],
  }),
  buildSyntheticRun({
    id: 'RUN-1034',
    runType: 'Load',
    label: 'Month-end load test at five times volume',
    startedDaysAgo: 5,
    startedHoursAgo: 6,
    triggeredByRole: 'QA Lead',
    requirementIds: ['R6'],
    steps: [
      {
        label: 'Ramp up to five times month-end volume',
        status: 'Passed',
        durationMs: 4200,
        log: ['Ramping to 5x: 2 060 documents per hour across 6 interfaces', 'Steady state reached after 4 minutes'],
        evidence: [{ title: 'Query and result rows: load profile', kind: 'query-result' }],
      },
      {
        label: 'Measure throughput, response time and error rate',
        status: 'Passed',
        durationMs: 5200,
        log: ['Peak throughput 412 documents per minute', 'p95 response time 2 480 ms', 'Error rate 0.9 %'],
        evidence: [{ title: 'Query and result rows: load metrics', kind: 'query-result' }],
      },
      {
        label: 'Check nothing was lost or duplicated under load',
        status: 'Failed',
        durationMs: 4800,
        findingId: 'F-015',
        log: [
          'Comparing sent and received counts per interface',
          'Invoice interface: 1 610 sent, 1 608 received, 2 lost',
          'All other interfaces balanced',
          'Finding F-015 raised, severity High',
        ],
        evidence: [{ title: 'Query and result rows: integrity under load', kind: 'query-result' }],
      },
    ],
  }),
  buildSyntheticRun({
    id: 'RUN-1033',
    runType: 'Reconciliation',
    label: 'Migration and cross-system reconciliation',
    startedDaysAgo: 6,
    startedHoursAgo: 4,
    triggeredByRole: 'IT Admin',
    requirementIds: ['R8'],
    steps: [
      {
        label: 'Compare counts and totals for nine reconciliation sets',
        status: 'Passed',
        durationMs: 5600,
        log: ['Nine sets compared', 'Seven sets at 100 % match', 'Two sets below target'],
        evidence: [{ title: 'Query and result rows: reconciliation summary', kind: 'query-result' }],
      },
      {
        label: 'Compare vendor bank details row by row',
        status: 'Failed',
        durationMs: 4200,
        findingId: 'F-016',
        log: ['9 880 vendors compared', '9 bank accounts truncated in the target', 'Finding F-016 raised'],
        evidence: [{ title: 'Query and result rows: vendor bank comparison', kind: 'query-result' }],
      },
      {
        label: 'Explain the differences',
        status: 'Passed',
        durationMs: 2200,
        log: ['Grouping 15 differences into 3 causes', 'Field length, missing unit mapping, tax rounding'],
        evidence: [{ title: 'Query and result rows: difference causes', kind: 'query-result' }],
      },
    ],
  }),
  buildRun({
    id: 'RUN-1030',
    runType: 'Functional',
    processId: 'P1',
    label: 'P1 baseline before the yard release',
    scenarioIds: ['P1-POS-02', 'P1-NEG-01', 'P1-NEG-02'],
    startedDaysAgo: 14,
    startedHoursAgo: 5,
    triggeredByRole: 'QA Lead',
    site: 'PL01',
  }),
  buildRun({
    id: 'RUN-1029',
    runType: 'Functional',
    processId: 'P2',
    label: 'P2 baseline before the recycling ERP update',
    scenarioIds: ['P2-POS-02', 'P2-NEG-01'],
    startedDaysAgo: 15,
    startedHoursAgo: 7,
    triggeredByRole: 'QA Lead',
    site: 'YD02',
  }),
]

export const RUN_BY_ID = new Map(RUNS.map((r) => [r.id, r]))

/* --------------------------------------------------------------- evidence */

export const EVIDENCE_ITEMS: EvidenceItem[] = EVIDENCE_ITEMS_BUILD

function countKinds(items: EvidenceItem[]): Record<EvidenceKind, number> {
  const counts: Record<EvidenceKind, number> = {
    screenshot: 0,
    payload: 0,
    'query-result': 0,
    document: 0,
    log: 0,
  }
  for (const item of items) counts[item.kind] += 1
  return counts
}

export const EVIDENCE_BUNDLES: EvidenceBundle[] = RUNS.map((run) => {
  const items = EVIDENCE_ITEMS.filter((e) => e.runId === run.id)
  const requirementIds = unique(
    run.scenarioIds.flatMap((id) => SCENARIO_BY_ID.get(id)?.requirementIds ?? []),
  ) as RequirementId[]
  return {
    id: run.evidenceBundleId as string,
    runId: run.id,
    hash: hashId('sha256:', `bundle${run.id}`),
    lockedAt: run.finishedAt ?? run.startedAt,
    approvedByRole: run.id === 'RUN-1042' ? undefined : 'Key User',
    approvalState: run.id === 'RUN-1042' ? 'Pending approval' : 'Approved',
    itemCounts: countKinds(items),
    verdict: run.verdict,
    requirementIds: requirementIds.length > 0 ? requirementIds : ['R3'],
  }
})

export const EVIDENCE_BUNDLE_BY_ID = new Map(EVIDENCE_BUNDLES.map((b) => [b.id, b]))
