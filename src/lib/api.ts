/**
 * Typed mock API client. Function names match the endpoints a real backend
 * would expose, so the UI can be pointed at a server later without changes.
 * Every call has a small delay; long running work returns a job id to poll.
 */
import {
  type ApprovalRequest,
  type ChangeItem,
  type CommandCentreData,
  type DataCheckKind,
  type DataCheckResult,
  type DataSource,
  type EvidenceBundle,
  type EvidenceItem,
  type EvidenceKind,
  type Finding,
  type HealingEvent,
  type InterfaceLink,
  type InterfaceRecord,
  type LoadProfile,
  type LoadRunResult,
  type PlainRuleResult,
  type ProcessId,
  type ReconSet,
  type RequirementId,
  type RoleName,
  type RunSelection,
  type Scenario,
  type ScenarioType,
  type SiteCode,
  type SodConflict,
  type Step,
  type StepResult,
  type TestDataSet,
  type TestRun,
  type TrendPoint,
  type Verdict,
} from './types'
import { db, bumpDb, find } from './db'
import { createJob, getJob, logLine, setJobSpeed, cancelJob, type JobEvent } from './jobs'
import {
  confidenceScore,
  manualHoursSaved,
  openFindings,
  processAutomationPct,
  processHealth,
  processOpenFindings,
  processPassRate,
  projectedFreezeDays,
  releaseGate,
  requirementCoveragePct,
  requirementRunIds,
  requirementScenarioIds,
  requirementStatus,
  requirementsForStep,
  closeReadinessPct,
} from './score'
import { statusForOutcome, runStatusFor } from '@/data/runs'
import { generateRecords } from '@/data/testdata'
import { buildSeries, LOAD_PROFILE_LABELS } from '@/data/load'
import { DATA_CHECK_DEFINITIONS } from '@/data/testdata'
import { hashId, sleep, unique } from './utils'
import { CLOSE_DATE_ISO, CLOSE_PERIOD_LABEL, NOW_ISO } from './clock'
import { a, q, rows } from '@/data/scenario-helpers'

const SHORT = 160
const MEDIUM = 320

let sequence = 5000
function nextId(prefix: string): string {
  sequence += 1
  return `${prefix}-${sequence}`
}

function toneFor(line: string): 'info' | 'ai' | 'ok' | 'warn' | 'error' {
  const lower = line.toLowerCase()
  if (lower.includes('ai ') || lower.includes('healing') || lower.includes('confidence')) return 'ai'
  if (lower.includes('failed') || lower.includes('raised') || lower.includes('lost') || lower.includes('expected 4'))
    return 'error'
  if (lower.includes('blocked') || lower.includes('not found') || lower.includes('outside') || lower.includes('warn'))
    return 'warn'
  if (lower.includes('passed') || lower.includes('matched') || lower.includes('created') || lower.includes('ok'))
    return 'ok'
  return 'info'
}

/* ------------------------------------------------------------ landscape */

export async function getSystems() {
  await sleep(SHORT)
  return db.systems
}

export async function getDataSources(systemId?: string): Promise<DataSource[]> {
  await sleep(SHORT)
  return systemId ? db.dataSources.filter((d) => d.systemId === systemId) : db.dataSources
}

export async function getInterfaces(): Promise<InterfaceLink[]> {
  await sleep(SHORT)
  return db.interfaces
}

export async function getInterfaceRecords(interfaceIds?: string[], site?: SiteCode | 'ALL'): Promise<InterfaceRecord[]> {
  await sleep(SHORT)
  return db.interfaceRecords.filter(
    (record) =>
      (!interfaceIds || interfaceIds.length === 0 || interfaceIds.includes(record.interfaceId)) &&
      (!site || site === 'ALL' || record.site === site),
  )
}

export interface VehicleTraceStep {
  order: number
  systemId: string
  interfaceId?: string
  title: string
  detail: string
  at: string
  status: 'ok' | 'warn' | 'error'
  recordId?: string
  findingId?: string
}

export async function traceVehicle(vehicle: string): Promise<{ vehicle: string; steps: VehicleTraceStep[] }> {
  await sleep(MEDIUM)
  const records = db.interfaceRecords
    .filter((r) => r.vehicle === vehicle)
    .sort((x, y) => (x.sentAt < y.sentAt ? -1 : 1))
  const steps: VehicleTraceStep[] = []
  records.forEach((record, index) => {
    const link = find.interface(record.interfaceId)
    steps.push({
      order: index + 1,
      systemId: link?.sourceSystemId ?? '',
      interfaceId: record.interfaceId,
      title: `${link?.name ?? record.interfaceId}`,
      detail: `${record.key} - ${record.reference}`,
      at: record.sentAt,
      status: record.status === 'Matched' ? 'ok' : record.status === 'Mismatched' ? 'error' : 'warn',
      recordId: record.id,
      findingId: record.findingId,
    })
  })
  return { vehicle, steps }
}

/* -------------------------------------------------------------- processes */

export async function getProcesses() {
  await sleep(SHORT)
  return db.processes
}

export async function getRequirements() {
  await sleep(SHORT)
  return db.requirements
}

export async function getRequirementCoverage() {
  await sleep(MEDIUM)
  return db.requirements.map((requirement) => ({
    requirement,
    status: requirementStatus(requirement.id),
    coveragePct: requirementCoveragePct(requirement.id),
    scenarioIds: requirementScenarioIds(requirement.id),
    runIds: requirementRunIds(requirement.id),
    openFindings: openFindings().filter((f) => f.requirementIds.includes(requirement.id)),
  }))
}

/* -------------------------------------------------------------- discovery */

export async function listDiscoverySessions() {
  await sleep(SHORT)
  return { sessions: db.discoverySessions, logSources: db.logSources }
}

export function startDiscovery(input: {
  processId: ProcessId
  sessionIds: string[]
  logSourceIds: string[]
}): string {
  const process = find.process(input.processId)
  const sessions = db.discoverySessions.filter((s) => input.sessionIds.includes(s.id))
  const logs = db.logSources.filter((l) => input.logSourceIds.includes(l.id))
  const map = db.discoveredMaps[input.processId]
  const actions = sessions.reduce((total, s) => total + s.actionCount, 0)
  const logRows = logs.reduce((total, l) => total + l.rows, 0)

  const lines: string[] = [
    `Discovery started for ${input.processId} ${process?.name ?? ''}`,
    `Reading ${sessions.length} recorded key-user sessions (${actions} captured actions)`,
    ...sessions.map((s) => `  session ${s.id}: ${s.keyUserRole}, ${s.durationMin} min, ${s.actionCount} actions`),
    `Reading ${logs.length} system log sources (${logRows.toLocaleString('en-GB')} rows)`,
    ...logs.map((l) => `  log ${l.id}: ${l.name}`),
    'AI: aligning user actions with system events on business keys (gate pass, batch, invoice)',
    `AI: ${map.nodes.length} activities identified across ${unique(map.nodes.map((n) => n.systemId)).length} systems`,
    `AI: ${map.edges.length} transitions, ${map.variants} process variants`,
    ...map.reworkLoops.map((loop) => `AI: rework loop found - ${loop.label} (${loop.count} cases)`),
    `AI: coverage of the recorded behaviour is ${map.coveragePct} %`,
    `AI: proposing ${map.proposedScenarios.length} scenarios (positive, negative and regression)`,
    'Discovery finished - process map ready',
  ]

  const events: JobEvent[] = lines.map((line, index) => ({
    ms: index < 2 ? 420 : 260,
    log: logLine(line, toneFor(line)),
    label: index === 0 ? 'Reading sessions' : index < lines.length - 4 ? 'Mining the process' : 'Proposing scenarios',
  }))

  return createJob({ kind: 'discovery', events, label: 'Starting discovery', onComplete: () => map })
}

/* ------------------------------------------------------------- scenarios */

export async function listScenarios(filter?: {
  processId?: ProcessId | 'ALL'
  types?: ScenarioType[]
  systemIds?: string[]
  interfaceIds?: string[]
  site?: SiteCode | 'ALL'
}): Promise<Scenario[]> {
  await sleep(SHORT)
  return db.scenarios.filter((scenario) => {
    if (filter?.processId && filter.processId !== 'ALL' && scenario.processId !== filter.processId) return false
    if (filter?.types && filter.types.length > 0 && !filter.types.includes(scenario.type)) return false
    if (filter?.systemIds && filter.systemIds.length > 0 && !filter.systemIds.some((id) => scenario.systemIds.includes(id)))
      return false
    if (
      filter?.interfaceIds &&
      filter.interfaceIds.length > 0 &&
      !filter.interfaceIds.some((id) => scenario.interfaceIds.includes(id))
    )
      return false
    if (filter?.site && filter.site !== 'ALL' && !scenario.sites.includes(filter.site)) return false
    return true
  })
}

export async function getScenario(id: string): Promise<Scenario | undefined> {
  await sleep(SHORT)
  return find.scenario(id)
}

export function generateScenarios(input: { processId: ProcessId; types: ScenarioType[] }): string {
  const process = find.process(input.processId)
  const map = db.discoveredMaps[input.processId]
  const existing = db.scenarios.filter((s) => s.processId === input.processId)
  const stages = process?.stages ?? []

  const lines: string[] = [
    `AI: reading the discovered process map for ${input.processId} ${process?.name ?? ''}`,
    `AI: ${map.nodes.length} activities, ${map.variants} variants, ${map.reworkLoops.length} rework loops`,
    `AI: ${existing.length} scenarios already exist - avoiding duplicates`,
    'AI: writing the main path as a positive scenario with mixed steps',
    ...stages.slice(0, 4).map((stage) => `AI:   step for ${stage.label} in ${find.system(stage.systemId)?.name ?? stage.systemId}`),
    'AI: deriving negative scenarios from the rework loops and refused attempts in the log',
    'AI: adding a regression scenario covering the whole journey',
    'AI: adding data checks: quantity and unit on both sides, duplicates per business key',
    'AI: adding document checks on every generated document',
    'AI: scenarios written, waiting for key-user approval',
  ]

  const events: JobEvent[] = lines.map((line, index) => ({
    ms: index === 0 ? 420 : 280,
    log: logLine(line, toneFor(line)),
    label: index < 3 ? 'Reading the process map' : 'Writing scenarios',
  }))

  return createJob({
    kind: 'scenario-generation',
    events,
    label: 'Starting generation',
    onComplete: () => {
      const created: Scenario[] = []
      const wanted = input.types.length > 0 ? input.types : (['Positive', 'Negative', 'Regression'] as ScenarioType[])
      wanted.forEach((type, typeIndex) => {
        const proposal =
          map.proposedScenarios.find(
            (p) => p.type === type && !db.scenarios.some((s) => s.name.toLowerCase() === p.name.toLowerCase()),
          ) ?? null
        const code = `${input.processId}-${type.slice(0, 3).toUpperCase()}-G${String(typeIndex + 1).padStart(2, '0')}`
        if (db.scenarios.some((s) => s.code === code)) return
        const steps: Step[] = stages.slice(0, 5).map((stage, stepIndex) => ({
          id: `${code}-S${String(stepIndex + 1).padStart(2, '0')}`,
          order: stepIndex + 1,
          kind:
            stepIndex === 0
              ? 'DATA_SETUP'
              : stepIndex === 1
                ? 'UI_ACTION'
                : stepIndex === 2
                  ? 'API_CALL'
                  : stepIndex === 3
                    ? 'MESSAGE_CHECK'
                    : 'DATA_CHECK',
          title: `${stage.label} in ${find.system(stage.systemId)?.name ?? stage.systemId}`,
          plain: stage.description,
          expected:
            type === 'Negative'
              ? 'The forbidden action is refused with a clear business error.'
              : 'The step completes and the data arrives unchanged in the next system.',
          systemId: stage.systemId,
          technical: {
            assertions: [
              a(
                type === 'Negative' ? 'response.status >= 400' : 'response.status < 300',
                type === 'Negative' ? 'The action is refused.' : 'The action succeeds.',
              ),
            ],
            query:
              stepIndex === 4
                ? q('SQL', `${find.system(stage.systemId)?.name ?? ''} check`, `SELECT COUNT(*) FROM target WHERE business_key = :key;`)
                : undefined,
          },
          mock: {
            outcome: type === 'Negative' && stepIndex === 2 ? 'blocked-as-expected' : 'pass',
            durationMs: 900,
            logLines: [`AI generated step for ${stage.label}`],
            evidenceTitles: ['Screenshot: generated step'],
          },
          aiGenerated: true,
        }))
        const scenario: Scenario = {
          id: code,
          code,
          name: proposal?.name ?? `${process?.name ?? input.processId} - ${type.toLowerCase()} path (AI draft)`,
          processId: input.processId,
          type,
          plain:
            proposal?.plain ??
            `AI draft covering the ${type.toLowerCase()} path of ${process?.name ?? input.processId} across ${stages.length} stages.`,
          systemIds: unique(stages.map((s) => s.systemId)),
          interfaceIds: process?.interfaceIds ?? [],
          requirementIds: ['R1', 'R2'],
          sites: process?.sites ?? [],
          riskLevel: type === 'Negative' ? 'High' : 'Medium',
          author: 'AI',
          approval: 'Pending approval',
          createdAt: new Date().toISOString(),
          tags: ['ai-generated', 'from-discovery'],
          steps,
        }
        db.scenarios.push(scenario)
        db.approvals.unshift({
          id: nextId('APR'),
          kind: 'scenario',
          refId: scenario.id,
          title: `${scenario.code} ${scenario.name}`,
          plain: scenario.plain,
          detail: `${steps.length} steps generated from the discovered process map. Needs a key user to confirm the business rules.`,
          confidencePct: 86,
          requestedAt: new Date().toISOString(),
          forRole: 'Key User',
          status: 'Pending',
          processId: input.processId,
          requirementIds: ['R1', 'R2'],
        })
        created.push(scenario)
      })
      bumpDb()
      return created
    },
  })
}

export async function approveScenario(id: string, role: RoleName, comment?: string) {
  await sleep(SHORT)
  const scenario = find.scenario(id)
  if (!scenario) return undefined
  scenario.approval = 'Approved'
  scenario.approvedByRole = role
  scenario.approvalComment = comment
  db.approvals
    .filter((approval) => approval.kind === 'scenario' && approval.refId === id && approval.status === 'Pending')
    .forEach((approval) => {
      approval.status = 'Approved'
      approval.decidedByRole = role
      approval.decidedAt = new Date().toISOString()
      approval.comment = comment
    })
  bumpDb()
  return scenario
}

export async function rejectScenario(id: string, role: RoleName, comment?: string) {
  await sleep(SHORT)
  const scenario = find.scenario(id)
  if (!scenario) return undefined
  scenario.approval = 'Rejected'
  scenario.approvedByRole = role
  scenario.approvalComment = comment
  db.approvals
    .filter((approval) => approval.kind === 'scenario' && approval.refId === id && approval.status === 'Pending')
    .forEach((approval) => {
      approval.status = 'Rejected'
      approval.decidedByRole = role
      approval.decidedAt = new Date().toISOString()
      approval.comment = comment
    })
  bumpDb()
  return scenario
}

export async function updateScenarioStep(
  scenarioId: string,
  stepId: string,
  patch: Partial<Pick<Step, 'title' | 'plain' | 'expected'>>,
) {
  await sleep(SHORT)
  const scenario = find.scenario(scenarioId)
  const step = scenario?.steps.find((s) => s.id === stepId)
  if (!scenario || !step) return undefined
  Object.assign(step, patch)
  scenario.approval = 'Pending approval'
  bumpDb()
  return step
}

export async function addStepToScenario(scenarioId: string, step: Step) {
  await sleep(SHORT)
  const scenario = find.scenario(scenarioId)
  if (!scenario) return undefined
  scenario.steps.push({ ...step, order: scenario.steps.length + 1 })
  scenario.approval = 'Pending approval'
  if (!db.approvals.some((approval) => approval.refId === scenarioId && approval.status === 'Pending')) {
    db.approvals.unshift({
      id: nextId('APR'),
      kind: 'scenario',
      refId: scenarioId,
      title: `${scenario.code} ${scenario.name}`,
      plain: 'A step was added from a plain-English rule and needs approval.',
      detail: step.plain,
      confidencePct: 90,
      requestedAt: new Date().toISOString(),
      forRole: 'Key User',
      status: 'Pending',
      processId: scenario.processId,
      requirementIds: scenario.requirementIds,
    })
  }
  bumpDb()
  return scenario
}

/* -------------------------------------------- plain English rule -> check */

export async function translateRuleToCheck(input: {
  rule: string
  dataSourceId?: string
  processId?: ProcessId
}): Promise<Step> {
  await sleep(600)
  return buildRuleCheck(input)
}

/** Synchronous version used by the job runner. */
function buildRuleCheck(input: { rule: string; dataSourceId?: string; processId?: ProcessId }): Step {
  const rule = input.rule.trim()
  const lower = rule.toLowerCase()
  const weightRule = lower.includes('net') && (lower.includes('gross') || lower.includes('tare'))
  const duplicateRule = lower.includes('duplicate') || lower.includes('twice') || lower.includes('once')
  const unitRule = lower.includes('unit') || lower.includes('kg') || lower.includes('tonne')
  const source = input.dataSourceId ? find.dataSource(input.dataSourceId) : undefined

  const id = nextId('STEP')
  const query = weightRule
    ? q(
        'SQL',
        'Yard Management weighbridge_ticket + SAP MSEG',
        `SELECT y.vehicle_no, y.gate_pass_no, y.gross_weight_kg, y.tare_weight_kg, y.net_weight_kg,
       (y.gross_weight_kg - y.tare_weight_kg) AS calculated_net,
       s.menge AS posted_qty, s.meins AS posted_uom
  FROM yard.weighbridge_ticket y
  LEFT JOIN sap.mseg s ON s.gate_pass_no = y.gate_pass_no
 WHERE y.weighed_on = CURRENT_DATE
   AND y.net_weight_kg <> (y.gross_weight_kg - y.tare_weight_kg);`,
      )
    : duplicateRule
      ? q(
          'SQL',
          source?.name ?? 'SAP MSEG',
          `SELECT business_key, COUNT(*) AS occurrences
  FROM ${source?.name.split(' ')[0] ?? 'sap.mseg'}
 GROUP BY business_key
HAVING COUNT(*) > 1;`,
        )
      : unitRule
        ? q(
            'SQL',
            source?.name ?? 'D365 InventTrans',
            `SELECT ItemId, Unit, COUNT(*) AS postings
  FROM d365.InventTrans
 WHERE Unit <> (SELECT BaseUnit FROM d365.InventTable t WHERE t.ItemId = InventTrans.ItemId)
 GROUP BY ItemId, Unit;`,
          )
        : q(
            'SQL',
            source?.name ?? 'selected data source',
            `-- AI translation of: ${rule}\nSELECT *\n  FROM ${source?.name.split(' ')[0] ?? 'target_table'}\n WHERE NOT (${lower.replace(/must (be|equal)/g, '=').replace(/ /g, '_').slice(0, 60)});`,
          )

  return {
    id,
    order: 0,
    kind: 'DATA_CHECK',
    title: rule.length > 70 ? `${rule.slice(0, 67)}...` : rule,
    plain: rule,
    expected: 'No row breaks the rule. Any row that does is reported as a finding.',
    systemId: source?.systemId,
    dataSourceIds: input.dataSourceId ? [input.dataSourceId] : undefined,
    technical: {
      query,
      assertions: [
        a(
          weightRule
            ? 'net_weight_kg == gross_weight_kg - tare_weight_kg'
            : duplicateRule
              ? 'count(business_key) == 1'
              : unitRule
                ? 'unit == item.baseUnit'
                : 'rows_breaking_rule == 0',
          rule,
        ),
      ],
    },
    mock: {
      outcome: weightRule ? 'finding' : 'pass',
      durationMs: 1600,
      logLines: weightRule
        ? [
            'AI translated the rule into a cross-system data check',
            'Running against 412 receipts for today',
            '3 receipts break the rule - finding F-001',
          ]
        : ['AI translated the rule into a data check', 'Running against the selected data source', 'No rows break the rule'],
      rows: weightRule
        ? rows(
            ['Vehicle', 'Gate pass', 'Gross', 'Tare', 'Net stored', 'Net calculated', 'Result'],
            [
              ['VH-7741', 'GP-PL01-2026-04821', '38 420', '13 560', '24 860', '24 860', 'stored net ok, posted 2 486'],
              ['VH-8126', 'GP-PL01-2026-04822', '37 120', '15 180', '21 940', '21 940', 'tare not re-weighed'],
              ['VH-9043', 'GP-PL01-2026-04825', '35 000', '13 560', '21 440', '21 440', 'posted twice'],
            ],
            { failRows: [0, 1, 2] },
          )
        : rows(['Rows checked', 'Rows breaking the rule'], [['412', '0']]),
      findingId: weightRule ? 'F-001' : undefined,
      evidenceTitles: ['Query and result rows: plain-English rule'],
    },
    aiGenerated: true,
  }
}

export function runPlainRule(input: { rule: string; dataSourceId: string }): string {
  const source = find.dataSource(input.dataSourceId)
  const lines = [
    `AI: reading the rule "${input.rule}"`,
    `AI: mapping it to ${source?.name ?? input.dataSourceId} in ${find.system(source?.systemId ?? '')?.name ?? ''}`,
    'AI: writing the query and the assertion',
    'Running the check',
    'Check finished',
  ]
  const events: JobEvent[] = lines.map((line) => ({ ms: 320, log: logLine(line, toneFor(line)), label: 'Checking' }))
  return createJob({
    kind: 'data-checks',
    events,
    label: 'Translating the rule',
    onComplete: () => {
      const step = buildRuleCheck({ rule: input.rule, dataSourceId: input.dataSourceId })
      const failed = step.mock.rows?.failRows?.length ?? 0
      const result: PlainRuleResult = {
        id: nextId('RULE'),
        rule: input.rule,
        dataSourceId: input.dataSourceId,
        generatedQuery: step.technical.query ?? q('SQL', source?.name ?? '', '--'),
        assertion: step.technical.assertions[0],
        status: failed > 0 ? 'Failed' : 'Passed',
        checkedRows: source?.rowCount ?? 0,
        failedRows: failed,
        rows: step.mock.rows,
        explanation:
          failed > 0
            ? 'Rows break the rule. The AI linked them to the open critical finding on the receipt interface.'
            : 'Every row satisfies the rule.',
        ranAt: new Date().toISOString(),
      }
      db.plainRuleResults.unshift(result)
      bumpDb()
      return result
    },
  })
}

/* ------------------------------------------------------------ data checks */

export function runDataChecks(input: { dataSourceIds: string[]; kinds: DataCheckKind[] }): string {
  const sources = db.dataSources.filter((s) => input.dataSourceIds.includes(s.id))
  const lines: string[] = [
    `Running ${input.kinds.length} check types on ${sources.length} data sources`,
    ...sources.flatMap((source) =>
      input.kinds.map(
        (kind) =>
          `  ${DATA_CHECK_DEFINITIONS.find((d) => d.kind === kind)?.label ?? kind} on ${source.name} (${source.rowCount.toLocaleString('en-GB')} rows)`,
      ),
    ),
    'AI: explaining the rows that failed',
    'Checks finished',
  ]
  const events: JobEvent[] = lines.map((line) => ({ ms: 260, log: logLine(line, toneFor(line)), label: 'Checking data' }))

  return createJob({
    kind: 'data-checks',
    events,
    label: 'Starting data checks',
    onComplete: () => {
      const results: DataCheckResult[] = []
      sources.forEach((source) => {
        input.kinds.forEach((kind) => {
          const problem = decideDataCheckProblem(source, kind)
          const result: DataCheckResult = {
            id: nextId('DC'),
            dataSourceId: source.id,
            kind,
            status: problem ? (problem.severityWarning ? 'Warning' : 'Failed') : 'Passed',
            checkedRows: source.rowCount,
            failedRows: problem?.failedRows ?? 0,
            plain: problem?.plain ?? `${DATA_CHECK_DEFINITIONS.find((d) => d.kind === kind)?.label} passed on ${source.name}.`,
            query: problem?.query ?? q('SQL', source.name, `SELECT COUNT(*) FROM ${source.name} WHERE 1 = 0;`),
            rows: problem?.rows,
            findingId: problem?.findingId,
            ranAt: new Date().toISOString(),
          }
          results.push(result)
          db.dataCheckResults.unshift(result)
        })
      })
      bumpDb()
      return results
    },
  })
}

function decideDataCheckProblem(
  source: DataSource,
  kind: DataCheckKind,
):
  | {
      failedRows: number
      plain: string
      query: ReturnType<typeof q>
      rows?: ReturnType<typeof rows>
      findingId?: string
      severityWarning?: boolean
    }
  | undefined {
  if (kind === 'cross-system-match' && source.id === 'DS-YARD-TICKET') {
    return {
      failedRows: 3,
      findingId: 'F-001',
      plain: '3 of 412 receipts do not match the posted goods receipt quantity in the core ERP.',
      query: q(
        'SQL',
        'Yard weighbridge_ticket + SAP MSEG',
        `SELECT y.vehicle_no, y.net_weight_kg, s.menge
  FROM yard.weighbridge_ticket y JOIN sap.mseg s ON s.gate_pass_no = y.gate_pass_no
 WHERE y.net_weight_kg <> s.menge;`,
      ),
      rows: rows(
        ['Vehicle', 'Weighbridge net', 'Posted quantity', 'Difference'],
        [
          ['VH-7741', '24 860 kg', '2 486 kg', '22 374 kg'],
          ['VH-8126', '23 180 kg', '21 940 kg', '1 240 kg'],
          ['VH-9043', '21 440 kg', '42 880 kg', '-21 440 kg'],
        ],
        { failRows: [0, 1, 2] },
      ),
    }
  }
  if (kind === 'valid-ranges' && source.id === 'DS-D365-INVENT') {
    return {
      failedRows: 2,
      findingId: 'F-002',
      plain: '2 stock postings use the unit TON for a kilogram quantity, which inflates stock by a factor of 1000.',
      query: q(
        'SQL',
        'D365 InventTrans',
        `SELECT ItemId, Unit, SUM(Quantity) AS qty FROM d365.InventTrans WHERE Unit <> 'KG' GROUP BY ItemId, Unit;`,
      ),
      rows: rows(
        ['Item', 'Unit', 'Quantity', 'Expected unit'],
        [
          ['SCR-316L-SOLID', 'TON', '61 480', 'KG'],
          ['SCR-304-BALE', 'TON', '18 400', 'KG'],
        ],
        { failRows: [0, 1] },
      ),
    }
  }
  if (kind === 'duplicates' && source.id === 'DS-SAP-MSEG') {
    return {
      failedRows: 3,
      findingId: 'F-001',
      plain: '3 gate passes created two material documents each.',
      query: q(
        'SQL',
        'SAP MSEG',
        `SELECT gate_pass_no, COUNT(DISTINCT mblnr) AS docs FROM sap.mseg GROUP BY gate_pass_no HAVING COUNT(DISTINCT mblnr) > 1;`,
      ),
      rows: rows(
        ['Gate pass', 'Material documents'],
        [
          ['GP-PL01-2026-04825', '2'],
          ['GP-PL01-2026-04812', '2'],
          ['GP-PL01-2026-04790', '2'],
        ],
        { failRows: [0, 1, 2] },
      ),
    }
  }
  if (kind === 'completeness' && source.id === 'DS-SCRAP-CHEM') {
    return {
      failedRows: 4,
      findingId: 'F-011',
      plain: '4 chemistry rows store 0.00 % molybdenum although the laboratory measured a value.',
      query: q(
        'SQL',
        'Scrap chemistry_sample + Java lab_result',
        `SELECT c.sample_no, l.mo_pct AS lab_mo, c.mo_pct FROM scrap.chemistry_sample c JOIN java.lab_result l ON l.sample_no = c.sample_no WHERE l.mo_pct > 0 AND c.mo_pct = 0;`,
      ),
      rows: rows(
        ['Sample', 'Laboratory Mo %', 'Stored Mo %'],
        [
          ['SMP-26-41180', '2.14', '0.00'],
          ['SMP-26-41132', '2.08', '0.00'],
        ],
        { failRows: [0, 1] },
      ),
    }
  }
  if (kind === 'freshness' && source.id === 'DS-REVAL-PAYRUN') {
    return {
      failedRows: 1,
      severityWarning: true,
      findingId: 'F-009',
      plain: 'The newest treasury acknowledgement is 45 minutes old, against a 30 minute window.',
      query: q('SQL', 'Reval payment_run_in', `SELECT MAX(received_at) FROM reval.payment_run_in;`),
      rows: rows(['Latest file', 'Age', 'Window'], [['PAYMUL_20261014_02.txt', '45 min', '30 min']], { failRows: [0] }),
    }
  }
  return undefined
}

/* --------------------------------------------------------------- test data */

export async function listTestDataEntities() {
  await sleep(SHORT)
  return db.testDataEntities
}

export async function listTestDataSets() {
  await sleep(SHORT)
  return db.testDataSets
}

export function generateTestData(input: {
  entityKey: string
  count: number
  processId: ProcessId | 'ALL'
  site: SiteCode | 'ALL'
}): string {
  const entity = db.testDataEntities.find((e) => e.key === input.entityKey)
  const lines = [
    `AI: generating ${input.count} ${entity?.label ?? input.entityKey} records`,
    `AI: reading the field rules for ${entity?.label ?? input.entityKey} (${entity?.fields.length ?? 0} fields)`,
    ...(entity?.linkedEntities ?? []).map((linked) => `AI: linking each record to a ${linked}`),
    'AI: using realistic value patterns (vehicle numbers, gate passes, weights, grades, chemistry)',
    'AI: no real personal data is generated',
    'Preview ready',
  ]
  const events: JobEvent[] = lines.map((line) => ({
    ms: 300,
    log: logLine(line, toneFor(line)),
    label: 'Generating records',
  }))
  return createJob({
    kind: 'test-data-generation',
    events,
    label: 'Starting generation',
    onComplete: () => {
      const id = nextId('TDS')
      const set: TestDataSet = {
        id,
        name: `${entity?.label ?? input.entityKey} set, ${input.count} records`,
        entityKey: input.entityKey,
        processId: input.processId,
        site: input.site,
        count: input.count,
        generatedAt: new Date().toISOString(),
        generatedBy: 'AI',
        loaded: false,
        loadedTo: [],
        records: generateRecords(input.entityKey, input.count, id),
        containsPersonalData: false,
      }
      db.testDataSets.unshift(set)
      bumpDb()
      return set
    },
  })
}

export function loadTestData(setId: string): string {
  const set = find.testDataSet(setId)
  const entity = db.testDataEntities.find((e) => e.key === set?.entityKey)
  const targets = entity?.systemIds ?? []
  const lines = [
    `Loading ${set?.count ?? 0} records into the test environment`,
    ...targets.map((systemId) => `  writing to ${find.system(systemId)?.name ?? systemId}`),
    'Verifying the loaded records and their links',
    'Load finished',
  ]
  const events: JobEvent[] = lines.map((line) => ({ ms: 340, log: logLine(line, toneFor(line)), label: 'Loading' }))
  return createJob({
    kind: 'test-data-load',
    events,
    label: 'Starting load',
    onComplete: () => {
      if (set) {
        set.loaded = true
        set.loadedTo = targets
      }
      bumpDb()
      return set
    },
  })
}

/* -------------------------------------------------------------------- runs */

export async function listRuns(filter?: { processId?: ProcessId | 'ALL'; runType?: string }) {
  await sleep(SHORT)
  return db.runs
    .filter((run) => {
      if (filter?.processId && filter.processId !== 'ALL' && run.processId !== filter.processId) return false
      if (filter?.runType && filter.runType !== 'ALL' && run.runType !== filter.runType) return false
      return true
    })
    .sort((x, y) => (x.startedAt < y.startedAt ? 1 : -1))
}

export async function getRun(id: string) {
  await sleep(SHORT)
  return find.run(id)
}

function evidenceKindFor(title: string, step: Step): EvidenceKind {
  const lower = title.toLowerCase()
  if (lower.startsWith('screenshot')) return 'screenshot'
  if (lower.startsWith('document preview')) return 'document'
  if (lower.startsWith('query and result')) return 'query-result'
  if (lower.startsWith('request and response') || lower.startsWith('message payload')) return 'payload'
  if (step.mock.screenshot) return 'screenshot'
  if (step.mock.document) return 'document'
  if (step.mock.rows) return 'query-result'
  if (step.mock.payload) return 'payload'
  return 'log'
}

export function startRun(input: { selection: RunSelection; role: RoleName; label?: string; runType?: TestRun['runType'] }): {
  jobId: string
  runId: string
} {
  const scenarios = input.selection.scenarioIds
    .map((id) => find.scenario(id))
    .filter((s): s is Scenario => Boolean(s))

  const runId = nextId('RUN')
  const stepResults: StepResult[] = scenarios.flatMap((scenario) =>
    scenario.steps.map((step) => ({
      scenarioId: scenario.id,
      stepId: step.id,
      status: 'Pending' as const,
      durationMs: 0,
      logLines: [],
      evidenceIds: [],
    })),
  )

  const run: TestRun = {
    id: runId,
    runType: input.runType ?? 'Functional',
    processId: input.selection.processId === 'ALL' ? undefined : input.selection.processId,
    label:
      input.label ??
      `${input.selection.processId === 'ALL' ? 'All processes' : input.selection.processId} - ${scenarios.length} scenarios`,
    scenarioIds: scenarios.map((s) => s.id),
    selection: input.selection,
    environment: input.selection.environment,
    triggeredByRole: input.role,
    startedAt: new Date().toISOString(),
    status: 'Running',
    stepResults,
    findingIds: [],
    verdict: 'CONDITIONAL',
    passedSteps: 0,
    failedSteps: 0,
    healedSteps: 0,
    blockedSteps: 0,
  }

  const events: JobEvent[] = [
    {
      ms: 300,
      log: logLine(
        `Run ${runId} started on ${input.selection.environment} by the ${input.role} role: ${scenarios.length} scenarios, ${stepResults.length} steps`,
        'info',
      ),
      label: 'Starting run',
    },
    {
      ms: 240,
      log: logLine(
        `Selection: ${input.selection.processId}, sites ${input.selection.site}, types ${input.selection.scenarioTypes.join(', ') || 'all'}`,
        'info',
      ),
    },
  ]

  scenarios.forEach((scenario) => {
    events.push({
      ms: 260,
      log: logLine(`Scenario ${scenario.code} ${scenario.name} (${scenario.type})`, 'info'),
      label: `${scenario.code}`,
    })
    scenario.steps.forEach((step) => {
      const evidenceIds = step.mock.evidenceTitles.map(
        (_title, index) => `EV-${runId.replace('RUN-', '')}-${step.id}-${index + 1}`,
      )
      events.push({
        ms: 200,
        stepStart: { scenarioId: scenario.id, stepId: step.id },
        log: logLine(`  step ${step.order}: ${step.title}`, 'info'),
        label: `${scenario.code} step ${step.order}`,
      })
      const lines = step.mock.logLines.length > 0 ? step.mock.logLines : [step.expected]
      lines.forEach((line) => {
        events.push({ ms: Math.max(180, Math.round(step.mock.durationMs / (lines.length + 1))), log: logLine(`    ${line}`, toneFor(line)) })
      })
      const status = statusForOutcome(step.mock.outcome)
      events.push({
        ms: 180,
        stepEnd: {
          scenarioId: scenario.id,
          stepId: step.id,
          status,
          findingId: step.mock.findingId,
          healingEventId: step.mock.healingEventId,
          evidenceIds,
          logLines: step.mock.logLines,
          durationMs: step.mock.durationMs,
        },
        log: logLine(
          `  step ${step.order} ${status.toLowerCase()}${step.mock.findingId ? ` - finding ${step.mock.findingId}` : ''}`,
          status === 'Failed' ? 'error' : status === 'Healed' ? 'ai' : status === 'Blocked as expected' ? 'warn' : 'ok',
        ),
      })
    })
  })

  events.push({ ms: 300, log: logLine('Collecting and locking evidence', 'info'), label: 'Collecting evidence' })
  events.push({ ms: 300, log: logLine('Run finished - release verdict calculated', 'ok'), label: 'Finished' })

  const jobId = createJob({
    kind: input.runType === 'Regression' ? 'regression' : 'run',
    events,
    run,
    label: 'Starting run',
    onComplete: (job) => {
      const finished = job.run as TestRun
      finished.finishedAt = new Date().toISOString()
      finished.status = runStatusFor(finished.stepResults)
      const criticalLinked = finished.findingIds.some((id) => find.finding(id)?.severity === 'Critical')
      const unexplained = finished.stepResults.some((r) => r.status === 'Failed' && !r.findingId)
      finished.verdict = unexplained
        ? 'NO-GO'
        : finished.failedSteps > 0
          ? 'CONDITIONAL'
          : criticalLinked
            ? 'CONDITIONAL'
            : 'GO'

      // evidence
      const bundleId = `EVB-${runId.replace('RUN-', '')}`
      finished.evidenceBundleId = bundleId
      const created: EvidenceItem[] = []
      finished.stepResults.forEach((result) => {
        const scenario = find.scenario(result.scenarioId)
        const step = scenario?.steps.find((s) => s.id === result.stepId)
        if (!step) return
        step.mock.evidenceTitles.forEach((title, index) => {
          created.push({
            id: `EV-${runId.replace('RUN-', '')}-${step.id}-${index + 1}`,
            runId,
            scenarioId: result.scenarioId,
            stepId: step.id,
            kind: evidenceKindFor(title, step),
            title,
            capturedAt: result.startedAt ?? finished.startedAt,
            hash: hashId('sha256:', `${runId}${step.id}${index}`),
            locked: true,
            screenshot: step.mock.screenshot,
            rows: step.mock.rows,
            document: step.mock.document,
            payload: step.mock.payload,
            log: step.mock.logLines,
          })
        })
      })
      db.evidence.unshift(...created)

      const counts: Record<EvidenceKind, number> = { screenshot: 0, payload: 0, 'query-result': 0, document: 0, log: 0 }
      created.forEach((item) => {
        counts[item.kind] += 1
      })
      const bundle: EvidenceBundle = {
        id: bundleId,
        runId,
        hash: hashId('sha256:', `bundle${runId}`),
        lockedAt: new Date().toISOString(),
        approvalState: 'Pending approval',
        itemCounts: counts,
        verdict: finished.verdict,
        requirementIds: unique(scenarios.flatMap((s) => s.requirementIds)) as RequirementId[],
      }
      db.bundles.unshift(bundle)
      db.approvals.unshift({
        id: nextId('APR'),
        kind: 'evidence',
        refId: bundle.id,
        title: `Evidence bundle ${bundle.id} for ${finished.label}`,
        plain: `Locked evidence from run ${runId}: ${created.length} items, verdict ${finished.verdict}.`,
        detail: `Hash ${bundle.hash}. Sign-off is needed before the report goes into the audit file.`,
        requestedAt: new Date().toISOString(),
        forRole: 'Key User',
        status: 'Pending',
        processId: finished.processId,
        requirementIds: bundle.requirementIds,
      })

      scenarios.forEach((scenario) => {
        scenario.lastRunId = runId
      })
      db.runs.unshift(finished)
      bumpDb()
      return finished
    },
  })

  return { jobId, runId }
}

export function getRunStatus(jobId: string) {
  return getJob<TestRun>(jobId)
}

export function setRunSpeed(jobId: string, speed: number) {
  setJobSpeed(jobId, speed)
}

export function stopRun(jobId: string) {
  cancelJob(jobId)
}

/* ---------------------------------------------------------------- findings */

export async function listFindings(filter?: { processId?: ProcessId | 'ALL'; status?: Finding['status'] | 'ALL' }) {
  await sleep(SHORT)
  return db.findings.filter((finding) => {
    if (filter?.processId && filter.processId !== 'ALL' && finding.processId !== filter.processId) return false
    if (filter?.status && filter.status !== 'ALL' && finding.status !== filter.status) return false
    return true
  })
}

export async function createDefect(findingId: string, role: RoleName) {
  await sleep(MEDIUM)
  const finding = find.finding(findingId)
  if (!finding) return undefined
  const id = `DEF-2026-${String(190 + db.defects.length).padStart(4, '0')}`
  finding.status = 'Defect raised'
  finding.defectRef = id
  db.defects.unshift({
    id,
    findingId,
    title: finding.title,
    severity: finding.severity,
    createdAt: new Date().toISOString(),
    createdByRole: role,
    status: 'Raised',
  })
  bumpDb()
  return id
}

export async function updateFindingStatus(findingId: string, status: Finding['status']) {
  await sleep(SHORT)
  const finding = find.finding(findingId)
  if (!finding) return undefined
  finding.status = status
  bumpDb()
  return finding
}

/* ----------------------------------------------------------------- changes */

export async function listChanges() {
  await sleep(SHORT)
  return db.changes
}

export function assessChangeImpact(changeId: string): string {
  const change = find.change(changeId)
  const scenarios = (change?.impactedScenarioIds ?? []).map((id) => find.scenario(id)).filter(Boolean) as Scenario[]
  const lines = [
    `AI: reading change ${change?.ref ?? changeId} on ${find.system(change?.systemId ?? '')?.name ?? ''}`,
    `AI: ${change?.impactedProcessIds.length ?? 0} processes and ${scenarios.length} scenarios touch the changed objects`,
    ...scenarios.slice(0, 6).map((s) => `AI:   ${s.code} ${s.name} (${s.type})`),
    `AI: risk score ${change?.riskScore ?? 0} of 100`,
    `AI: ${change?.healingEventIds.length ?? 0} script repairs proposed for this change`,
    change?.closeSafe
      ? 'AI: safe to import before the close'
      : 'AI: not safe before the close - it touches close critical processes',
    'Impact assessment finished',
  ]
  const events: JobEvent[] = lines.map((line) => ({ ms: 300, log: logLine(line, toneFor(line)), label: 'Assessing impact' }))
  return createJob({
    kind: 'regression',
    events,
    label: 'Reading the change',
    onComplete: () => ({ change, scenarios }),
  })
}

export interface RegressionStepDiff {
  scenarioId: string
  stepId: string
  title: string
  reason: string
  findingId?: string
  severity?: Finding['severity']
}

export interface RegressionComparison {
  runId: string
  baselineRunId: string
  newFailures: RegressionStepDiff[]
  fixed: RegressionStepDiff[]
  unchanged: number
  /** steps with no counterpart in the baseline run, so nothing could be compared */
  notComparable: number
  comparedSteps: number
  durationMs: number
  baselineDurationMs: number
  /** null when the baseline has no measured time, so no percentage can be honest */
  durationDeltaPct: number | null
  newFindings: { id: string; title: string; severity: Finding['severity'] }[]
  fixedFindings: { id: string; title: string; severity: Finding['severity'] }[]
  note?: string
}

/**
 * Compares the real step results of a run with the real step results of a
 * baseline run. Steps are matched on scenario and step id; a step the baseline
 * never ran is reported as not comparable, and a failure on such a step is
 * still a new failure. Any finding this run raised that the baseline did not is
 * listed, and a critical or high finding always appears as a new failure.
 */
export async function compareToBaseline(runId: string, baselineRunId: string): Promise<RegressionComparison> {
  await sleep(MEDIUM)
  const run = find.run(runId)
  const baseline = find.run(baselineRunId)

  const newFailures: RegressionStepDiff[] = []
  const fixed: RegressionStepDiff[] = []
  let unchanged = 0
  let notComparable = 0
  let comparedSteps = 0

  const titleFor = (scenarioId: string, stepId: string) => {
    const scenario = find.scenario(scenarioId)
    const step = scenario?.steps.find((item) => item.id === stepId)
    return step ? `${scenario?.code ?? scenarioId} step ${step.order}: ${step.title}` : stepId
  }

  const baselineByKey = new Map<string, StepResult>()
  const baselineByStep = new Map<string, StepResult>()
  for (const result of baseline?.stepResults ?? []) {
    baselineByKey.set(`${result.scenarioId}:${result.stepId}`, result)
    if (!baselineByStep.has(result.stepId)) baselineByStep.set(result.stepId, result)
  }

  for (const result of run?.stepResults ?? []) {
    const before =
      baselineByKey.get(`${result.scenarioId}:${result.stepId}`) ?? baselineByStep.get(result.stepId)
    const failedNow = result.status === 'Failed'
    const finding = result.findingId ? find.finding(result.findingId) : undefined

    if (!before) {
      notComparable += 1
      if (failedNow) {
        newFailures.push({
          scenarioId: result.scenarioId,
          stepId: result.stepId,
          title: titleFor(result.scenarioId, result.stepId),
          reason: 'failed, and the baseline run never covered this step',
          findingId: result.findingId,
          severity: finding?.severity,
        })
      }
      continue
    }

    comparedSteps += 1
    const failedBefore = before.status === 'Failed'
    if (failedNow && !failedBefore) {
      newFailures.push({
        scenarioId: result.scenarioId,
        stepId: result.stepId,
        title: titleFor(result.scenarioId, result.stepId),
        reason: `failed now, was ${before.status.toLowerCase()} in the baseline`,
        findingId: result.findingId,
        severity: finding?.severity,
      })
    } else if (!failedNow && failedBefore) {
      fixed.push({
        scenarioId: result.scenarioId,
        stepId: result.stepId,
        title: titleFor(result.scenarioId, result.stepId),
        reason: `${result.status.toLowerCase()} now, failed in the baseline`,
      })
    } else {
      unchanged += 1
    }
  }

  const baselineFindingIds = new Set(baseline?.findingIds ?? [])
  const runFindingIds = new Set(run?.findingIds ?? [])

  const newFindings = (run?.findingIds ?? [])
    .filter((id) => !baselineFindingIds.has(id))
    .map((id) => find.finding(id))
    .filter(Boolean)
    .map((finding) => ({ id: finding!.id, title: finding!.title, severity: finding!.severity }))

  const fixedFindings = (baseline?.findingIds ?? [])
    .filter((id) => !runFindingIds.has(id))
    .map((id) => find.finding(id))
    .filter(Boolean)
    .map((finding) => ({ id: finding!.id, title: finding!.title, severity: finding!.severity }))

  // a critical or high finding must always show up as a new failure
  for (const finding of newFindings) {
    if (finding.severity !== 'Critical' && finding.severity !== 'High') continue
    if (newFailures.some((failure) => failure.findingId === finding.id)) continue
    const carrier = (run?.stepResults ?? []).find((result) => result.findingId === finding.id)
    newFailures.push({
      scenarioId: carrier?.scenarioId ?? '',
      stepId: carrier?.stepId ?? finding.id,
      title: carrier ? titleFor(carrier.scenarioId, carrier.stepId) : finding.title,
      reason: `new ${finding.severity.toLowerCase()} finding ${finding.id} that the baseline did not have`,
      findingId: finding.id,
      severity: finding.severity,
    })
  }

  const durationMs = (run?.stepResults ?? []).reduce((total, result) => total + result.durationMs, 0)
  const baselineDurationMs = (baseline?.stepResults ?? []).reduce((total, result) => total + result.durationMs, 0)

  const note =
    notComparable > 0
      ? `${notComparable} of ${run?.stepResults.length ?? 0} steps have no counterpart in ${baselineRunId}, so only ${comparedSteps} steps could be compared. Pick a baseline that ran the same scenarios for a like-for-like comparison.`
      : undefined

  return {
    runId,
    baselineRunId,
    newFailures,
    fixed,
    unchanged,
    notComparable,
    comparedSteps,
    durationMs,
    baselineDurationMs,
    durationDeltaPct:
      baselineDurationMs === 0 ? null : Math.round(((durationMs - baselineDurationMs) / baselineDurationMs) * 100),
    newFindings,
    fixedFindings,
    note,
  }
}

/** The run that shares the most scenarios with these, so the comparison is like for like. */
export function suggestBaselineRun(scenarioIds: string[], excludeRunId?: string): string | undefined {
  const candidates = db.runs
    .filter((run) => run.id !== excludeRunId && run.stepResults.length > 0)
    .map((run) => ({
      run,
      overlap: run.scenarioIds.filter((id) => scenarioIds.includes(id)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap || (a.run.startedAt < b.run.startedAt ? 1 : -1))
  return candidates[0]?.overlap > 0 ? candidates[0].run.id : candidates[0]?.run.id
}

/* -------------------------------------------------------------------- load */

export async function listLoadRuns() {
  await sleep(SHORT)
  return db.loadRuns
}

export function startLoadRun(input: {
  profile: LoadProfile
  processIds: ProcessId[]
  interfaceIds: string[]
}): string {
  const settings = LOAD_PROFILE_LABELS[input.profile]
  const series = buildSeries(input.profile)
  const base = db.loadRuns.find((r) => r.profile === input.profile)
  const lines = [
    `Load test started: ${settings.label} (${settings.factor}x month-end volume)`,
    `Processes ${input.processIds.join(', ') || 'all'}, ${input.interfaceIds.length} interfaces under test`,
    ...series
      .filter((point) => point.minute % 4 === 0)
      .map(
        (point) =>
          `minute ${point.minute}: ${point.throughput} documents per minute, p95 ${point.p95Ms} ms, errors ${point.errorRatePct} %, backlog ${point.backlog}`,
      ),
    ...(base?.integrityChecks ?? [])
      .filter((check) => input.interfaceIds.length === 0 || input.interfaceIds.includes(check.interfaceId))
      .map(
        (check) =>
          `integrity ${find.interface(check.interfaceId)?.name ?? check.interfaceId}: ${check.sentIn} in, ${check.receivedOut} out, ${check.lost} lost, ${check.duplicated} duplicated`,
      ),
    input.profile === '5x'
      ? 'Integrity check failed on the invoice interface - 2 documents lost'
      : 'All integrity checks passed',
    'Load test finished',
  ]
  const events: JobEvent[] = lines.map((line, index) => ({
    ms: index < 2 ? 380 : 260,
    log: logLine(line, toneFor(line)),
    label: index < 2 ? 'Ramping up' : index < lines.length - 3 ? 'Measuring' : 'Checking integrity',
  }))

  return createJob({
    kind: 'load',
    events,
    label: 'Starting load test',
    onComplete: () => {
      if (!base) return undefined
      const result: LoadRunResult = {
        ...base,
        id: nextId('LOAD'),
        startedAt: new Date().toISOString(),
        processIds: input.processIds.length > 0 ? input.processIds : base.processIds,
        interfaceIds: input.interfaceIds.length > 0 ? input.interfaceIds : base.interfaceIds,
        integrityChecks:
          input.interfaceIds.length > 0
            ? base.integrityChecks.filter((c) => input.interfaceIds.includes(c.interfaceId))
            : base.integrityChecks,
        series,
      }
      db.loadRuns.unshift(result)
      bumpDb()
      return result
    },
  })
}

/* --------------------------------------------------------------- access/SoD */

export async function getSodMatrix() {
  await sleep(MEDIUM)
  return {
    rules: db.sodRules,
    users: db.users,
    roles: db.roles,
    conflicts: db.sodConflicts,
  }
}

export function runSodProof(conflictId: string): string {
  const conflict = db.sodConflicts.find((c) => c.id === conflictId)
  const rule = conflict ? find.sodRule(conflict.ruleId) : undefined
  const user = conflict ? find.user(conflict.userId) : undefined
  const alreadyAllowed = conflict?.proof?.outcome === 'Allowed'
  const lines = [
    `Proof test started for ${user?.label ?? conflict?.userId} against rule ${rule?.name ?? ''}`,
    `Signing in as ${user?.label ?? ''} in ${(conflict?.systemIds ?? []).map((id) => find.system(id)?.name ?? id).join(' and ')}`,
    `Attempting the first action: ${rule?.leftPermission ?? ''}`,
    'First action succeeded',
    `Attempting the forbidden second action: ${rule?.rightPermission ?? ''}`,
    alreadyAllowed || !conflict?.proof
      ? 'Second action succeeded - the forbidden combination is ALLOWED'
      : 'Second action refused - the control is effective, BLOCKED as expected',
    'Evidence captured and locked',
    'Proof test finished',
  ]
  const events: JobEvent[] = lines.map((line) => ({ ms: 320, log: logLine(line, toneFor(line)), label: 'Proving' }))

  return createJob({
    kind: 'sod-proof',
    events,
    label: 'Starting proof test',
    onComplete: () => {
      if (!conflict) return undefined
      const outcome: SodConflict['proof'] = {
        runId: 'RUN-1035',
        action: `${rule?.leftPermission} then ${rule?.rightPermission}`,
        outcome: conflict.proof?.outcome ?? 'Allowed',
        testedAt: new Date().toISOString(),
        evidenceId: conflict.proof?.evidenceId ?? 'EV-1035-S3-1',
        plain:
          conflict.proof?.plain ??
          'Both actions succeeded, so the forbidden combination is possible for this user.',
      }
      conflict.proof = outcome
      bumpDb()
      return outcome
    },
  })
}

/* ------------------------------------------------------------ reconciliation */

export async function listReconSets() {
  await sleep(SHORT)
  return db.reconSets
}

export async function getReconSet(id: string): Promise<ReconSet | undefined> {
  await sleep(SHORT)
  return find.reconSet(id)
}

export function runRecon(setId: string): string {
  const set = find.reconSet(setId)
  const lines = [
    `Reconciliation started: ${set?.name ?? setId}`,
    `Reading ${set?.counts.source.toLocaleString('en-GB') ?? 0} source records from ${find.system(set?.sourceSystemId ?? '')?.name ?? ''}`,
    `Reading ${set?.counts.target.toLocaleString('en-GB') ?? 0} target records from ${find.system(set?.targetSystemId ?? '')?.name ?? ''}`,
    'Comparing counts and totals',
    `Counts: ${set?.counts.matched.toLocaleString('en-GB') ?? 0} matched, ${set?.counts.missing ?? 0} missing, ${set?.counts.extra ?? 0} extra`,
    `Totals: difference ${set?.totals.delta ?? 0} ${set?.totals.unit ?? ''}`,
    'Comparing a sample row by row, field by field',
    ...(set?.differenceGroups ?? []).map((group) => `AI: ${group.count} differences - ${group.cause}`),
    `Match ${set?.matchPct ?? 0} %`,
    'Reconciliation finished',
  ]
  const events: JobEvent[] = lines.map((line) => ({ ms: 280, log: logLine(line, toneFor(line)), label: 'Reconciling' }))
  return createJob({
    kind: 'recon',
    events,
    label: 'Starting reconciliation',
    onComplete: () => {
      if (set) set.lastRunAt = new Date().toISOString()
      bumpDb()
      return set
    },
  })
}

/* --------------------------------------------------------------- self-healing */

export async function listHealingEvents() {
  await sleep(SHORT)
  return db.healing
}

export function runHealing(changeId: string): string {
  const change = find.change(changeId)
  const events_ = (change?.healingEventIds ?? []).map((id) => find.healing(id)).filter(Boolean) as HealingEvent[]
  const lines = [
    `AI: analysing change ${change?.ref ?? changeId}`,
    'AI: replaying the affected steps against the changed system',
    ...events_.flatMap((event) => [
      `AI: ${event.summary}`,
      `AI:   before ${event.before}`,
      `AI:   after  ${event.after}`,
      `AI:   confidence ${event.confidencePct} %`,
    ]),
    events_.length === 0 ? 'AI: no script repair needed for this change' : 'AI: repairs ready for approval',
    'Healing finished',
  ]
  const jobEvents: JobEvent[] = lines.map((line) => ({ ms: 300, log: logLine(line, 'ai'), label: 'Repairing scripts' }))
  return createJob({ kind: 'healing', events: jobEvents, label: 'Analysing the change', onComplete: () => events_ })
}

export async function approveHealing(id: string, role: RoleName, comment?: string) {
  await sleep(SHORT)
  const event = find.healing(id)
  if (!event) return undefined
  event.status = 'Approved'
  event.approvedByRole = role
  db.approvals
    .filter((approval) => approval.kind === 'healed-script' && approval.refId === id && approval.status === 'Pending')
    .forEach((approval) => {
      approval.status = 'Approved'
      approval.decidedByRole = role
      approval.decidedAt = new Date().toISOString()
      approval.comment = comment
    })
  bumpDb()
  return event
}

export async function rejectHealing(id: string, role: RoleName, comment?: string) {
  await sleep(SHORT)
  const event = find.healing(id)
  if (!event) return undefined
  event.status = 'Rejected'
  event.approvedByRole = role
  db.approvals
    .filter((approval) => approval.kind === 'healed-script' && approval.refId === id && approval.status === 'Pending')
    .forEach((approval) => {
      approval.status = 'Rejected'
      approval.decidedByRole = role
      approval.decidedAt = new Date().toISOString()
      approval.comment = comment
    })
  bumpDb()
  return event
}

/* ------------------------------------------------------------------ evidence */

export async function listEvidence(filter?: {
  runId?: string
  kind?: EvidenceKind | 'ALL'
  processId?: ProcessId | 'ALL'
}) {
  await sleep(SHORT)
  return db.evidence.filter((item) => {
    if (filter?.runId && item.runId !== filter.runId) return false
    if (filter?.kind && filter.kind !== 'ALL' && item.kind !== filter.kind) return false
    if (filter?.processId && filter.processId !== 'ALL') {
      const run = find.run(item.runId)
      if (run?.processId !== filter.processId) return false
    }
    return true
  })
}

export async function listEvidenceBundles() {
  await sleep(SHORT)
  return db.bundles
}

export async function getEvidenceBundle(id: string) {
  await sleep(SHORT)
  const bundle = find.bundle(id)
  if (!bundle) return undefined
  return { bundle, items: db.evidence.filter((e) => e.runId === bundle.runId), run: find.run(bundle.runId) }
}

export async function approveEvidenceBundle(id: string, role: RoleName, comment?: string) {
  await sleep(SHORT)
  const bundle = find.bundle(id)
  if (!bundle) return undefined
  bundle.approvalState = 'Approved'
  bundle.approvedByRole = role
  db.evidence.filter((e) => e.runId === bundle.runId).forEach((e) => (e.approvedByRole = role))
  db.approvals
    .filter((approval) => approval.kind === 'evidence' && approval.refId === id && approval.status === 'Pending')
    .forEach((approval) => {
      approval.status = 'Approved'
      approval.decidedByRole = role
      approval.decidedAt = new Date().toISOString()
      approval.comment = comment
    })
  bumpDb()
  return bundle
}

export interface RunReport {
  run: TestRun
  bundle?: EvidenceBundle
  scenarios: Scenario[]
  evidence: EvidenceItem[]
  findings: Finding[]
  perRequirement: { requirementId: RequirementId; title: string; steps: number; passed: number; failed: number }[]
  healing: HealingEvent[]
  approvals: ApprovalRequest[]
  verdict: Verdict
  generatedAt: string
  /** one sub-bundle id per scenario, always derived from this run */
  scenarioBundles: { scenarioId: string; bundleId: string }[]
  /** healing events with a date inside the run window, for the audit trail */
  healingDates: { id: string; shownAt: string; duringRun: boolean }[]
}

export async function getRunReport(runId: string): Promise<RunReport | undefined> {
  await sleep(MEDIUM)
  const run = find.run(runId)
  if (!run) return undefined
  const scenarios = run.scenarioIds.map((id) => find.scenario(id)).filter(Boolean) as Scenario[]
  const evidence = db.evidence.filter((e) => e.runId === runId)
  const findings = run.findingIds.map((id) => find.finding(id)).filter(Boolean) as Finding[]
  const healingIds = unique(run.stepResults.map((r) => r.healingEventId).filter(Boolean) as string[])

  // A step is only counted against the requirement it actually tests.
  const perRequirementMap = new Map<RequirementId, { steps: number; passed: number; failed: number }>()
  for (const result of run.stepResults) {
    const scenario = scenarios.find((item) => item.id === result.scenarioId)
    if (!scenario) continue
    const step = scenario.steps.find((item) => item.id === result.stepId)
    if (!step) continue
    const ids = requirementsForStep(step, scenario, result.status === 'Healed')
    const good = result.status === 'Passed' || result.status === 'Blocked as expected' || result.status === 'Healed'
    for (const id of ids) {
      const entry = perRequirementMap.get(id) ?? { steps: 0, passed: 0, failed: 0 }
      entry.steps += 1
      if (good) entry.passed += 1
      if (result.status === 'Failed') entry.failed += 1
      perRequirementMap.set(id, entry)
    }
  }

  const perRequirement = Array.from(perRequirementMap.entries())
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
    .map(([requirementId, entry]) => ({
      requirementId,
      title: find.requirement(requirementId)?.title ?? requirementId,
      ...entry,
    }))

  const runBundleId = run.evidenceBundleId ?? `EVB-${runId.replace('RUN-', '')}`
  const scenarioBundles = scenarios.map((scenario, index) => ({
    scenarioId: scenario.id,
    bundleId: `${runBundleId}-${String(index + 1).padStart(2, '0')}`,
  }))

  // a repair is only credible in the audit trail if it was detected before or
  // during the run that used it
  const runStart = new Date(run.startedAt).getTime()
  const runEnd = new Date(run.finishedAt ?? run.startedAt).getTime()
  const healingDates = healingIds.map((id) => {
    const event = find.healing(id)
    const detected = event ? new Date(event.detectedAt).getTime() : runStart
    if (detected <= runEnd) return { id, shownAt: event?.detectedAt ?? run.startedAt, duringRun: detected >= runStart }
    return { id, shownAt: run.startedAt, duringRun: true }
  })

  return {
    run,
    bundle: run.evidenceBundleId ? find.bundle(run.evidenceBundleId) : undefined,
    scenarios,
    evidence,
    findings,
    perRequirement,
    healing: healingIds.map((id) => find.healing(id)).filter(Boolean) as HealingEvent[],
    approvals: db.approvals.filter((approval) => approval.refId === run.evidenceBundleId),
    verdict: run.verdict,
    generatedAt: new Date().toISOString(),
    scenarioBundles,
    healingDates,
  }
}

/* ------------------------------------------------- findings: owner and fix */

export async function assignFindingOwner(findingId: string, role: RoleName) {
  await sleep(SHORT)
  const finding = find.finding(findingId)
  if (!finding) return undefined
  finding.ownerRole = role
  if (finding.status === 'Open') finding.status = 'Triaged'
  bumpDb()
  return finding
}

export async function markFindingFixed(findingId: string) {
  await sleep(SHORT)
  const finding = find.finding(findingId)
  if (!finding) return undefined
  finding.status = 'Fixed'
  bumpDb()
  return finding
}

/* ---------------------------------------------------------- release report */

export interface ReleaseReport {
  releaseId: string
  label: string
  periodLabel: string
  closeDate: string
  generatedAt: string
  gate: ReturnType<typeof releaseGate>
  confidence: ReturnType<typeof confidenceScore>
  findingsBySeverity: { severity: Finding['severity']; count: number; findings: Finding[] }[]
  processes: {
    processId: ProcessId
    name: string
    closeCritical: boolean
    passRate: number
    automationPct: number
    scenarios: number
    openFindings: number
  }[]
  closeRisk: {
    freezeDays: number
    targetFreezeDays: number
    projectedFreezeDays: number
    readinessPct: number
    unsafeChanges: { ref: string; title: string; reason: string }[]
  }
  recommendation: { headline: string; detail: string; actions: string[] }
  signOffRoles: { role: RoleName; purpose: string }[]
}

export async function getReleaseReport(releaseId: string): Promise<ReleaseReport> {
  await sleep(MEDIUM)
  const gate = releaseGate()
  const confidence = confidenceScore()
  const open = openFindings()
  const severities: Finding['severity'][] = ['Critical', 'High', 'Medium', 'Low']
  const criticals = open.filter((finding) => finding.severity === 'Critical')
  const unsafe = db.closeReadiness.changeSafety
    .filter((entry) => !entry.safe)
    .map((entry) => {
      const change = find.change(entry.changeId)
      return { ref: change?.ref ?? entry.changeId, title: change?.title ?? '', reason: entry.reason }
    })

  const projected = projectedFreezeDays()
  const readiness = closeReadinessPct()

  const recommendation =
    gate.verdict === 'GO'
      ? {
          headline: 'Release, and shorten the freeze to the target',
          detail:
            'Every component is above the gate threshold and no critical finding is open. The automated suite covers the close-critical processes, so the freeze can go to the target length.',
          actions: ['Sign off the evidence bundles', `Set the freeze to ${db.closeReadiness.targetFreezeDays} days`],
        }
      : gate.verdict === 'CONDITIONAL'
        ? {
            headline: 'Release only with the open findings accepted in writing',
            detail: `${criticals.length} critical and ${open.filter((f) => f.severity === 'High').length} high findings are open. Each one has an explained cause and a recommended fix, so the business can accept them with a fix date, but they must not be silent.`,
            actions: [
              ...criticals.slice(0, 3).map((finding) => `Decide on ${finding.id}: ${finding.title}`),
              unsafe.length > 0
                ? `Hold ${unsafe.map((entry) => entry.ref).join(', ')} until after the close`
                : 'Keep the change pipeline frozen for close-critical processes',
              `Keep the freeze at ${projected} days until the criticals are closed`,
            ],
          }
        : {
            headline: 'Do not release',
            detail:
              'A step failed without an explanation, or the gate score is below 60. The cause has to be understood before anything goes to production.',
            actions: ['Triage every failed step', 'Re-run the affected processes', 'Re-assess the gate'],
          }

  return {
    releaseId,
    label: `Release gate for ${CLOSE_PERIOD_LABEL}`,
    periodLabel: CLOSE_PERIOD_LABEL,
    closeDate: CLOSE_DATE_ISO,
    generatedAt: new Date().toISOString(),
    gate,
    confidence,
    findingsBySeverity: severities.map((severity) => ({
      severity,
      count: open.filter((finding) => finding.severity === severity).length,
      findings: open.filter((finding) => finding.severity === severity),
    })),
    processes: db.processes.map((process) => ({
      processId: process.id,
      name: process.name,
      closeCritical: process.closeCritical,
      passRate: processPassRate(process.id),
      automationPct: processAutomationPct(process.id),
      scenarios: db.scenarios.filter((scenario) => scenario.processId === process.id).length,
      openFindings: processOpenFindings(process.id).length,
    })),
    closeRisk: {
      freezeDays: db.closeReadiness.freezeDays,
      targetFreezeDays: db.closeReadiness.targetFreezeDays,
      projectedFreezeDays: projected,
      readinessPct: readiness,
      unsafeChanges: unsafe,
    },
    recommendation,
    signOffRoles: [
      { role: 'QA Lead', purpose: 'Confirms the test result and the gate verdict' },
      { role: 'Key User', purpose: 'Accepts the open findings for the business' },
      { role: 'IT Admin', purpose: 'Confirms the landscape and the change pipeline' },
    ],
  }
}

/* ----------------------------------------------------------------- approvals */

export async function listApprovals(filter?: { role?: RoleName; status?: ApprovalRequest['status'] | 'ALL' }) {
  await sleep(SHORT)
  return db.approvals.filter((approval) => {
    if (filter?.status && filter.status !== 'ALL' && approval.status !== filter.status) return false
    return true
  })
}

export async function decideApproval(
  id: string,
  decision: 'Approved' | 'Rejected',
  role: RoleName,
  comment?: string,
) {
  const approval = find.approval(id)
  if (!approval) return undefined
  if (approval.kind === 'scenario') {
    return decision === 'Approved'
      ? approveScenario(approval.refId, role, comment)
      : rejectScenario(approval.refId, role, comment)
  }
  if (approval.kind === 'healed-script') {
    return decision === 'Approved'
      ? approveHealing(approval.refId, role, comment)
      : rejectHealing(approval.refId, role, comment)
  }
  if (decision === 'Approved') return approveEvidenceBundle(approval.refId, role, comment)
  await sleep(SHORT)
  approval.status = 'Rejected'
  approval.decidedByRole = role
  approval.decidedAt = new Date().toISOString()
  approval.comment = comment
  const bundle = find.bundle(approval.refId)
  if (bundle) bundle.approvalState = 'Rejected'
  bumpDb()
  return bundle
}

/* ------------------------------------------------------- release and close */

export async function getReleaseGate() {
  await sleep(MEDIUM)
  return releaseGate()
}

export async function getCloseReadiness() {
  await sleep(MEDIUM)
  const readiness = closeReadinessPct()
  return {
    ...db.closeReadiness,
    readinessPct: readiness,
    projectedFreezeDays: projectedFreezeDays(),
    closeCriticalProcesses: db.processes
      .filter((p) => p.closeCritical)
      .map((p) => ({
        process: p,
        health: processHealth(p.id),
        passRate: processPassRate(p.id),
        openFindings: processOpenFindings(p.id).length,
      })),
    changes: db.closeReadiness.changeSafety.map((entry) => ({
      ...entry,
      change: find.change(entry.changeId) as ChangeItem,
    })),
  }
}

/* --------------------------------------------------------------- delivery */

export async function getDeliveryModel() {
  await sleep(SHORT)
  return db.delivery
}

/* --------------------------------------------------------- command centre */

export async function getCommandCentre(): Promise<CommandCentreData> {
  await sleep(MEDIUM)
  const confidence = confidenceScore()
  const gate = releaseGate()
  const trend: TrendPoint[] = db.trend

  return {
    confidence,
    requirementStatus: db.requirements.map((requirement) => ({
      id: requirement.id,
      title: requirement.title,
      status: requirementStatus(requirement.id),
      coveragePct: requirementCoveragePct(requirement.id),
      route: requirement.demoRoute,
      scenarioCount: requirementScenarioIds(requirement.id).length,
      runCount: requirementRunIds(requirement.id).length,
    })),
    processHealth: db.processes.map((process) => ({
      processId: process.id,
      name: process.name,
      health: processHealth(process.id),
      passRate: processPassRate(process.id),
      scenarioCount: db.scenarios.filter((s) => s.processId === process.id).length,
      openFindings: processOpenFindings(process.id).length,
      automationPct: processAutomationPct(process.id),
      closeCritical: process.closeCritical,
    })),
    lastRuns: [...db.runs].sort((x, y) => (x.startedAt < y.startedAt ? 1 : -1)).slice(0, 5),
    openFindings: openFindings(),
    trend,
    monthEnd: {
      freezeDays: db.closeReadiness.freezeDays,
      targetFreezeDays: db.closeReadiness.targetFreezeDays,
      closeDate: CLOSE_DATE_ISO,
      readinessPct: closeReadinessPct(),
      verdict: gate.verdict,
    },
    counters: {
      scenarios: db.scenarios.length,
      approvedScenarios: db.scenarios.filter((s) => s.approval === 'Approved').length,
      pendingApprovals: db.approvals.filter((approval) => approval.status === 'Pending').length,
      interfaces: db.interfaces.length,
      healedThisMonth: db.healing.length,
      evidenceItems: db.evidence.length,
      manualHoursSaved: manualHoursSaved(),
    },
  }
}

export const NOW = NOW_ISO

export async function setTrainingDone(id: string, done: boolean) {
  await sleep(SHORT)
  const item = db.delivery.training.find((entry) => entry.id === id)
  if (!item) return undefined
  item.done = done
  bumpDb()
  return item
}
