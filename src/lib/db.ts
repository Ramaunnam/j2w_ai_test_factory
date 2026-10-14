import { useSyncExternalStore } from 'react'
import type {
  ApprovalRequest,
  BusinessProcess,
  ChangeItem,
  CloseReadiness,
  DataCheckResult,
  DataSource,
  DeliveryModel,
  DiscoveredMap,
  DiscoverySession,
  EvidenceBundle,
  EvidenceItem,
  Finding,
  HealingEvent,
  InterfaceLink,
  InterfaceRecord,
  LoadRunResult,
  LogSource,
  PlainRuleResult,
  ProcessId,
  ReconSet,
  Requirement,
  Scenario,
  SodConflict,
  SodRule,
  SystemNode,
  SystemRole,
  TestDataEntity,
  TestDataSet,
  TestRun,
  TrendPoint,
  UserAccount,
} from './types'

import { DATA_SOURCES, SYSTEMS } from '@/data/systems'
import { INTERFACES, INTERFACE_RECORDS } from '@/data/interfaces'
import { PROCESSES } from '@/data/processes'
import { REQUIREMENTS } from '@/data/requirements'
import { SCENARIOS } from '@/data/scenarios'
import { EVIDENCE_BUNDLES, EVIDENCE_ITEMS, RUNS } from '@/data/runs'
import { FINDINGS } from '@/data/findings'
import { CHANGES } from '@/data/changes'
import { HEALING_EVENTS } from '@/data/healing'
import { TEST_DATA_ENTITIES, TEST_DATA_SETS } from '@/data/testdata'
import { DISCOVERED_MAPS, DISCOVERY_SESSIONS, LOG_SOURCES } from '@/data/discovery'
import { SOD_CONFLICTS, SOD_RULES, SYSTEM_ROLES, USER_ACCOUNTS } from '@/data/sod'
import { RECON_SETS } from '@/data/recon'
import { LOAD_RUNS } from '@/data/load'
import { APPROVALS } from '@/data/approvals'
import { CLOSE_READINESS, DELIVERY_MODEL, TREND } from '@/data/delivery'

export interface Defect {
  id: string
  findingId: string
  title: string
  severity: Finding['severity']
  createdAt: string
  createdByRole: string
  status: 'Raised' | 'In progress' | 'Fixed'
}

export interface Db {
  systems: SystemNode[]
  dataSources: DataSource[]
  interfaces: InterfaceLink[]
  interfaceRecords: InterfaceRecord[]
  processes: BusinessProcess[]
  requirements: Requirement[]
  scenarios: Scenario[]
  runs: TestRun[]
  evidence: EvidenceItem[]
  bundles: EvidenceBundle[]
  findings: Finding[]
  changes: ChangeItem[]
  healing: HealingEvent[]
  testDataEntities: TestDataEntity[]
  testDataSets: TestDataSet[]
  discoverySessions: DiscoverySession[]
  logSources: LogSource[]
  discoveredMaps: Record<ProcessId, DiscoveredMap>
  roles: SystemRole[]
  users: UserAccount[]
  sodRules: SodRule[]
  sodConflicts: SodConflict[]
  reconSets: ReconSet[]
  loadRuns: LoadRunResult[]
  approvals: ApprovalRequest[]
  delivery: DeliveryModel
  closeReadiness: CloseReadiness
  trend: TrendPoint[]
  defects: Defect[]
  dataCheckResults: DataCheckResult[]
  plainRuleResults: PlainRuleResult[]
}

/**
 * In-memory mock store. Everything the user does in the app (approve, reject,
 * run, generate, heal, raise a defect) mutates this store and bumps a revision,
 * so every page that reads it updates - including the Command Centre numbers.
 */
export const db: Db = {
  systems: [...SYSTEMS],
  dataSources: [...DATA_SOURCES],
  interfaces: [...INTERFACES],
  interfaceRecords: [...INTERFACE_RECORDS],
  processes: [...PROCESSES],
  requirements: [...REQUIREMENTS],
  scenarios: SCENARIOS.map((s) => ({ ...s })),
  runs: RUNS.map((r) => ({ ...r })),
  evidence: EVIDENCE_ITEMS.map((e) => ({ ...e })),
  bundles: EVIDENCE_BUNDLES.map((b) => ({ ...b })),
  findings: FINDINGS.map((f) => ({ ...f })),
  changes: [...CHANGES],
  healing: HEALING_EVENTS.map((h) => ({ ...h })),
  testDataEntities: [...TEST_DATA_ENTITIES],
  testDataSets: TEST_DATA_SETS.map((s) => ({ ...s })),
  discoverySessions: DISCOVERY_SESSIONS.map((s) => ({ ...s })),
  logSources: LOG_SOURCES.map((l) => ({ ...l })),
  discoveredMaps: DISCOVERED_MAPS,
  roles: [...SYSTEM_ROLES],
  users: [...USER_ACCOUNTS],
  sodRules: [...SOD_RULES],
  sodConflicts: SOD_CONFLICTS.map((c) => ({ ...c })),
  reconSets: RECON_SETS.map((r) => ({ ...r })),
  loadRuns: LOAD_RUNS.map((r) => ({ ...r })),
  approvals: APPROVALS.map((a) => ({ ...a })),
  delivery: DELIVERY_MODEL,
  closeReadiness: CLOSE_READINESS,
  trend: [...TREND],
  defects: [],
  dataCheckResults: [],
  plainRuleResults: [],
}

/* --------------------------------------------------- runtime persistence */

/**
 * Runs, evidence, findings and approvals created or changed while the app is
 * open are written to localStorage, so a run started in one tab can be opened
 * as a report in another tab and survives a reload. Everything is wrapped in
 * try/catch: blocked or full storage must never break the app.
 */
const STORAGE_KEY = 'j2w.runtime.v2'
const MAX_PERSISTED_RUNS = 6

const SEED_RUN_IDS = new Set(RUNS.map((run) => run.id))

interface PersistedState {
  version: 2
  savedAt: string
  runs: TestRun[]
  evidence: EvidenceItem[]
  bundles: EvidenceBundle[]
  findings: { id: string; status: Finding['status']; defectRef?: string }[]
  defects: Defect[]
  approvals: ApprovalRequest[]
  scenarios: { id: string; approval: Scenario['approval']; approvedByRole?: Scenario['approvedByRole']; lastRunId?: string }[]
}

function runtimeRuns(): TestRun[] {
  return db.runs.filter((run) => !SEED_RUN_IDS.has(run.id)).slice(0, MAX_PERSISTED_RUNS)
}

export function persistRuntime(): void {
  try {
    const runs = runtimeRuns()
    const runIds = new Set(runs.map((run) => run.id))
    const state: PersistedState = {
      version: 2,
      savedAt: new Date().toISOString(),
      runs,
      evidence: db.evidence.filter((item) => runIds.has(item.runId)),
      bundles: db.bundles.filter((bundle) => runIds.has(bundle.runId)),
      findings: db.findings.map((finding) => ({
        id: finding.id,
        status: finding.status,
        defectRef: finding.defectRef,
      })),
      defects: db.defects,
      approvals: db.approvals,
      scenarios: db.scenarios.map((scenario) => ({
        id: scenario.id,
        approval: scenario.approval,
        approvedByRole: scenario.approvedByRole,
        lastRunId: scenario.lastRunId,
      })),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage can be blocked or full - the app keeps working from memory */
  }
}

function restoreRuntime(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const state = JSON.parse(raw) as PersistedState
    if (state.version !== 2) return

    for (const run of state.runs ?? []) {
      if (!db.runs.some((existing) => existing.id === run.id)) db.runs.unshift(run)
    }
    for (const item of state.evidence ?? []) {
      if (!db.evidence.some((existing) => existing.id === item.id)) db.evidence.unshift(item)
    }
    for (const bundle of state.bundles ?? []) {
      if (!db.bundles.some((existing) => existing.id === bundle.id)) db.bundles.unshift(bundle)
    }
    for (const entry of state.findings ?? []) {
      const finding = db.findings.find((item) => item.id === entry.id)
      if (finding) {
        finding.status = entry.status
        finding.defectRef = entry.defectRef
      }
    }
    db.defects = state.defects ?? []
    if (state.approvals?.length) {
      // only keep approvals whose subject still exists after the reload:
      // scenarios the AI generated in the previous session are not persisted
      db.approvals = state.approvals.filter((approval) => {
        if (approval.kind === 'scenario') return db.scenarios.some((item) => item.id === approval.refId)
        if (approval.kind === 'healed-script') return db.healing.some((item) => item.id === approval.refId)
        return db.bundles.some((item) => item.id === approval.refId)
      })
    }
    for (const entry of state.scenarios ?? []) {
      const scenario = db.scenarios.find((item) => item.id === entry.id)
      if (scenario) {
        scenario.approval = entry.approval
        scenario.approvedByRole = entry.approvedByRole
        scenario.lastRunId = entry.lastRunId
      }
    }
  } catch {
    /* unreadable storage is ignored, the seed data stands */
  }
}

/** True when this run can be opened in another tab (it is in storage or is seed data). */
export function isRunAvailableElsewhere(runId: string): boolean {
  if (SEED_RUN_IDS.has(runId)) return true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    return raw.includes(`"${runId}"`)
  } catch {
    return false
  }
}

restoreRuntime()

/* ------------------------------------------------------------- revision bus */

let revision = 0
const listeners = new Set<() => void>()
let persistTimer: number | undefined

export function bumpDb(): void {
  revision += 1
  listeners.forEach((listener) => listener())
  // debounced: a live run bumps on every step, we only need the last state
  try {
    if (persistTimer) window.clearTimeout(persistTimer)
    persistTimer = window.setTimeout(persistRuntime, 400)
  } catch {
    persistRuntime()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): number {
  return revision
}

/** Re-renders the caller whenever anything in the mock store changes. */
export function useDbRevision(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function dbRevision(): number {
  return revision
}

/* ------------------------------------------------------------------ lookups */

export const find = {
  system: (id: string) => db.systems.find((s) => s.id === id),
  dataSource: (id: string) => db.dataSources.find((d) => d.id === id),
  interface: (id: string) => db.interfaces.find((i) => i.id === id),
  process: (id: string) => db.processes.find((p) => p.id === id),
  requirement: (id: string) => db.requirements.find((r) => r.id === id),
  scenario: (id: string) => db.scenarios.find((s) => s.id === id),
  run: (id: string) => db.runs.find((r) => r.id === id),
  finding: (id: string) => db.findings.find((f) => f.id === id),
  change: (id: string) => db.changes.find((c) => c.id === id),
  healing: (id: string) => db.healing.find((h) => h.id === id),
  bundle: (id: string) => db.bundles.find((b) => b.id === id),
  evidence: (id: string) => db.evidence.find((e) => e.id === id),
  testDataSet: (id: string) => db.testDataSets.find((s) => s.id === id),
  reconSet: (id: string) => db.reconSets.find((r) => r.id === id),
  user: (id: string) => db.users.find((u) => u.id === id),
  role: (id: string) => db.roles.find((r) => r.id === id),
  sodRule: (id: string) => db.sodRules.find((r) => r.id === id),
  approval: (id: string) => db.approvals.find((a) => a.id === id),
}

export function systemName(id: string): string {
  return find.system(id)?.name ?? id
}

export function interfaceName(id: string): string {
  return find.interface(id)?.name ?? id
}

export function processName(id: string): string {
  return find.process(id)?.name ?? id
}

export function dataSourceName(id: string): string {
  const source = find.dataSource(id)
  return source ? source.name : id
}
