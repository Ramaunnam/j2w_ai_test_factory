/**
 * J2W AI Test Factory - domain types.
 * Every entity has a stable string id so cross-page links never break.
 */

/* ------------------------------------------------------------------ shared */

export type SiteCode = 'PL01' | 'PL03' | 'YD02' | 'YD05'

export type RoleName = 'Key User' | 'QA Lead' | 'IT Admin' | 'Auditor'

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

export type Health = 'Healthy' | 'Attention' | 'At risk' | 'Not tested'

export type ApprovalState = 'Draft' | 'Pending approval' | 'Approved' | 'Rejected'

export type Verdict = 'GO' | 'CONDITIONAL' | 'NO-GO'

export type Environment = 'TEST' | 'QA' | 'PRE-PROD'

export interface Trend {
  direction: 'up' | 'down' | 'flat'
  value: number
  label: string
}

/* ----------------------------------------------------------------- systems */

export type BackendType = 'Dataverse' | 'SQL database' | 'SAP HANA' | 'SQL Server' | 'Files'

export type AccessMethod = 'REST' | 'OData' | 'IDoc' | 'GUI' | 'SFTP' | 'Files' | 'SQL'

export type DataTypeKind =
  | 'Master data'
  | 'Transactions'
  | 'Measurements'
  | 'Messages'
  | 'Documents'
  | 'Access data'

export type SystemBand = 'Shop floor' | 'Core ERP' | 'Finance and output'

export type ConnectionStatus = 'Connected' | 'Degraded' | 'Not connected'

export interface DataSource {
  id: string
  systemId: string
  /** table, view, collection, entity or file set */
  kind: 'Table' | 'View' | 'Collection' | 'OData entity' | 'File set'
  name: string
  description: string
  rowCount: number
  /** ISO timestamp of the last change seen in the source */
  lastChangedAt: string
  dataType: DataTypeKind
  keyFields: string[]
}

export interface SystemNode {
  id: string
  name: string
  role: string
  band: SystemBand
  backend: BackendType
  access: AccessMethod[]
  dataTypes: DataTypeKind[]
  connection: ConnectionStatus
  sites: SiteCode[]
  owner: RoleName
  /** diagram position in a 1000 x 560 viewBox */
  x: number
  y: number
  notes: string
}

/* -------------------------------------------------------------- interfaces */

export type InterfaceCategory = 'Shop-floor' | 'Financial'

export type MessageType = 'IDoc' | 'OData' | 'REST JSON' | 'File' | 'SFTP'

export type RecordMatchStatus = 'Matched' | 'Mismatched' | 'Missing' | 'Duplicated'

export interface FieldCompare {
  name: string
  label: string
  sourceValue: string
  targetValue: string
  match: boolean
  note?: string
}

export interface InterfaceRecord {
  id: string
  interfaceId: string
  /** business key shown in lists (gate pass, invoice no, heat no ...) */
  key: string
  reference: string
  vehicle?: string
  site: SiteCode
  sentAt: string
  receivedAt?: string
  status: RecordMatchStatus
  messageId: string
  fields: FieldCompare[]
  findingId?: string
}

export interface InterfaceStats {
  sent: number
  received: number
  matched: number
  mismatched: number
  missing: number
  duplicated: number
}

export interface InterfaceLink {
  id: string
  name: string
  sourceSystemId: string
  targetSystemId: string
  category: InterfaceCategory
  messageType: MessageType
  messageRef: string
  volumePerDay: number
  slaMinutes: number
  stats: InterfaceStats
  lastTestRunId?: string
  dataSourceIds: string[]
  description: string
}

/* ---------------------------------------------------------------- processes */

export type ProcessId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'

export type ProcessStream = 'Steel' | 'Recycling' | 'Finance'

export interface ProcessStage {
  key: string
  label: string
  systemId: string
  description: string
}

export interface BusinessProcess {
  id: ProcessId
  name: string
  stream: ProcessStream
  summary: string
  systemIds: string[]
  interfaceIds: string[]
  stages: ProcessStage[]
  closeCritical: boolean
  sites: SiteCode[]
  manualHoursPerMonth: number
  depth: 'Full' | 'Light'
}

/* ------------------------------------------------------------- requirements */

export type RequirementId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10'

export interface Requirement {
  id: RequirementId
  title: string
  description: string
  demoRoute: string
  demoPageName: string
  secondaryRoutes: { route: string; pageName: string }[]
  howDemonstrated: string
}

/* ---------------------------------------------------------------- scenarios */

export type ScenarioType = 'Positive' | 'Negative' | 'Regression'

export type StepKind =
  | 'DATA_SETUP'
  | 'UI_ACTION'
  | 'API_CALL'
  | 'MESSAGE_CHECK'
  | 'DATA_CHECK'
  | 'DOCUMENT_CHECK'
  | 'EVIDENCE'

export interface Assertion {
  expr: string
  plain: string
}

export interface ApiSpec {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT'
  url: string
  headers?: Record<string, string>
  body?: string
  responseStatus?: number
  responseBody?: string
}

export interface QuerySpec {
  language: 'SQL' | 'OData' | 'NoSQL' | 'REST'
  source: string
  text: string
}

export interface TechnicalDetail {
  uiSelector?: string
  screen?: string
  transaction?: string
  api?: ApiSpec
  query?: QuerySpec
  messageRef?: string
  documentRef?: string
  assertions: Assertion[]
}

export interface MockScreenshotSpec {
  systemId: string
  screen: string
  transaction?: string
  fields: { label: string; value: string; state?: 'normal' | 'highlight' | 'error' }[]
  note?: string
  blocked?: boolean
}

export interface MockRowsSpec {
  columns: string[]
  rows: string[][]
  /** row indexes that fail the assertion */
  failRows?: number[]
  caption?: string
}

export interface MockDocumentSpec {
  docType: string
  number: string
  issuedBy: string
  metaRows: { label: string; value: string }[]
  lines: { description: string; qty: string; unit: string; value: string }[]
  totals: { label: string; value: string }[]
  checks: { label: string; ok: boolean }[]
}

export type StepOutcome =
  | 'pass'
  | 'fail'
  | 'heal-then-pass'
  | 'blocked-as-expected'
  | 'finding'
  | 'skip'

export interface StepMock {
  outcome: StepOutcome
  durationMs: number
  logLines: string[]
  screenshot?: MockScreenshotSpec
  rows?: MockRowsSpec
  document?: MockDocumentSpec
  payload?: { request?: string; response?: string; status?: number }
  findingId?: string
  healingEventId?: string
  evidenceTitles: string[]
}

export interface Step {
  id: string
  order: number
  kind: StepKind
  title: string
  plain: string
  expected: string
  systemId?: string
  interfaceId?: string
  dataSourceIds?: string[]
  technical: TechnicalDetail
  mock: StepMock
  aiGenerated: boolean
  healingEventIds?: string[]
}

export interface Scenario {
  id: string
  code: string
  name: string
  processId: ProcessId
  type: ScenarioType
  plain: string
  systemIds: string[]
  interfaceIds: string[]
  requirementIds: RequirementId[]
  sites: SiteCode[]
  riskLevel: Severity
  author: 'AI' | RoleName
  approval: ApprovalState
  approvedByRole?: RoleName
  approvalComment?: string
  createdAt: string
  lastRunId?: string
  tags: string[]
  steps: Step[]
  testDataSetId?: string
}

/* --------------------------------------------------------------------- runs */

export type RunType = 'Functional' | 'Regression' | 'Load' | 'SoD' | 'Reconciliation'

export type RunStatus = 'Queued' | 'Running' | 'Passed' | 'Passed with findings' | 'Failed'

export type StepStatus =
  | 'Pending'
  | 'Running'
  | 'Passed'
  | 'Failed'
  | 'Healed'
  | 'Blocked as expected'
  | 'Skipped'

export interface StepResult {
  scenarioId: string
  stepId: string
  status: StepStatus
  startedAt?: string
  durationMs: number
  logLines: string[]
  evidenceIds: string[]
  findingId?: string
  healingEventId?: string
}

export interface RunSelection {
  processId: ProcessId | 'ALL'
  scenarioIds: string[]
  systemIds: string[]
  interfaceIds: string[]
  scenarioTypes: ScenarioType[]
  site: SiteCode | 'ALL'
  dateFrom: string
  dateTo: string
  testDataSetId?: string
  environment: Environment
}

export interface TestRun {
  id: string
  runType: RunType
  processId?: ProcessId
  label: string
  scenarioIds: string[]
  selection: RunSelection
  environment: Environment
  triggeredByRole: RoleName
  startedAt: string
  finishedAt?: string
  status: RunStatus
  stepResults: StepResult[]
  findingIds: string[]
  evidenceBundleId?: string
  verdict: Verdict
  passedSteps: number
  failedSteps: number
  healedSteps: number
  blockedSteps: number
  baselineRunId?: string
}

/* ----------------------------------------------------------------- evidence */

export type EvidenceKind = 'screenshot' | 'payload' | 'query-result' | 'document' | 'log'

export interface EvidenceItem {
  id: string
  runId: string
  scenarioId: string
  stepId: string
  kind: EvidenceKind
  title: string
  capturedAt: string
  hash: string
  locked: boolean
  approvedByRole?: RoleName
  screenshot?: MockScreenshotSpec
  rows?: MockRowsSpec
  document?: MockDocumentSpec
  payload?: { request?: string; response?: string; status?: number }
  log?: string[]
}

export interface EvidenceBundle {
  id: string
  runId: string
  hash: string
  lockedAt: string
  approvedByRole?: RoleName
  approvalState: ApprovalState
  itemCounts: Record<EvidenceKind, number>
  verdict: Verdict
  requirementIds: RequirementId[]
}

/* ----------------------------------------------------------------- findings */

export type FindingStatus = 'Open' | 'Triaged' | 'Defect raised' | 'Fixed'

export interface Finding {
  id: string
  runId: string
  scenarioId?: string
  stepId?: string
  severity: Severity
  title: string
  plain: string
  cause: string
  aiExplanation: string
  recommendedFix: string
  /** what it costs the business, in kilograms, euros, days or documents */
  impact: string
  systemIds: string[]
  interfaceIds: string[]
  processId: ProcessId
  requirementIds: RequirementId[]
  rows?: MockRowsSpec
  status: FindingStatus
  defectRef?: string
  detectedAt: string
  vehicles?: string[]
  /** the role that owns the fix */
  ownerRole?: RoleName
}

/* ------------------------------------------------------------------ changes */

export type ChangeKind =
  | 'SAP transport'
  | 'D365 update'
  | 'Power Platform release'
  | 'MES change'
  | 'Schema change'
  | 'API change'

export interface ChangeItem {
  id: string
  kind: ChangeKind
  ref: string
  title: string
  description: string
  systemId: string
  plannedDate: string
  riskScore: number
  impactedProcessIds: ProcessId[]
  impactedScenarioIds: string[]
  aiAssessment: string
  closeSafe: boolean
  closeSafeReason: string
  healingEventIds: string[]
}

/* ------------------------------------------------------------- self-healing */

export type HealingChangeKind = 'UI' | 'Schema' | 'API'

export interface HealingEvent {
  id: string
  scenarioId: string
  stepId: string
  changeItemId?: string
  changeKind: HealingChangeKind
  detectedAt: string
  summary: string
  before: string
  after: string
  diffLines: { type: 'context' | 'removed' | 'added'; text: string }[]
  confidencePct: number
  rationale: string
  status: ApprovalState
  approvedByRole?: RoleName
  reRunPassed: boolean
}

/* --------------------------------------------------------------- test data */

export interface TestDataField {
  name: string
  label: string
  kind: 'id' | 'text' | 'number' | 'date' | 'enum' | 'link'
  linkEntity?: string
  sample: string
}

export interface TestDataEntity {
  key: string
  label: string
  description: string
  systemIds: string[]
  dataType: DataTypeKind
  fields: TestDataField[]
  linkedEntities: string[]
  processIds: ProcessId[]
}

export interface TestDataRecord {
  id: string
  entityKey: string
  values: Record<string, string>
  links: { entityKey: string; id: string; label: string }[]
}

export interface TestDataSet {
  id: string
  name: string
  entityKey: string
  processId: ProcessId | 'ALL'
  site: SiteCode | 'ALL'
  count: number
  generatedAt: string
  generatedBy: 'AI' | RoleName
  loaded: boolean
  loadedTo: string[]
  records: TestDataRecord[]
  containsPersonalData: false
}

/* --------------------------------------------------------------- discovery */

export interface DiscoverySession {
  id: string
  keyUserRole: string
  processId: ProcessId
  systemIds: string[]
  site: SiteCode
  durationMin: number
  actionCount: number
  capturedAt: string
  selected: boolean
}

export interface LogSource {
  id: string
  systemId: string
  name: string
  rows: number
  periodDays: number
  selected: boolean
}

export interface DiscoveredNode {
  id: string
  label: string
  systemId: string
  frequency: number
  avgMinutes: number
  variant: boolean
}

export interface DiscoveredEdge {
  from: string
  to: string
  count: number
  avgMinutes: number
  rework?: boolean
}

export interface DiscoveredMap {
  processId: ProcessId
  nodes: DiscoveredNode[]
  edges: DiscoveredEdge[]
  variants: number
  reworkLoops: { label: string; count: number; explanation: string }[]
  coveragePct: number
  proposedScenarios: { name: string; type: ScenarioType; plain: string }[]
}

/* -------------------------------------------------------------------- load */

export type LoadProfile = 'normal' | '2x' | '5x'

export interface LoadPoint {
  minute: number
  throughput: number
  p95Ms: number
  errorRatePct: number
  backlog: number
}

export interface LoadIntegrityCheck {
  interfaceId: string
  sentIn: number
  receivedOut: number
  duplicated: number
  lost: number
  ok: boolean
}

export interface LoadRunResult {
  id: string
  profile: LoadProfile
  processIds: ProcessId[]
  interfaceIds: string[]
  startedAt: string
  series: LoadPoint[]
  integrityChecks: LoadIntegrityCheck[]
  peakThroughput: number
  p95Ms: number
  errorRatePct: number
  maxBacklog: number
  verdict: Verdict
  bottlenecks: { interfaceId: string; plain: string; severity: Severity }[]
  findingIds: string[]
}

/* --------------------------------------------------------------- access/SoD */

export interface SystemRole {
  id: string
  systemId: string
  name: string
  description: string
  permissions: string[]
}

export interface UserAccount {
  id: string
  label: string
  businessRole: string
  site: SiteCode
  roleIds: string[]
  systemIds: string[]
  lastReviewedAt: string
}

export interface SodRule {
  id: string
  name: string
  plain: string
  leftPermission: string
  rightPermission: string
  severity: Severity
  requirementIds: RequirementId[]
}

export interface SodProof {
  runId: string
  action: string
  outcome: 'Blocked' | 'Allowed'
  testedAt: string
  evidenceId: string
  plain: string
}

export interface SodConflict {
  id: string
  userId: string
  ruleId: string
  severity: Severity
  systemIds: string[]
  detail: string
  proof?: SodProof
  findingId?: string
}

/* ---------------------------------------------------------- reconciliation */

export interface ReconRow {
  key: string
  label: string
  fields: FieldCompare[]
  status: RecordMatchStatus
  causeGroup?: string
}

export interface ReconDifferenceGroup {
  id: string
  cause: string
  count: number
  aiExplanation: string
  severity: Severity
  recommendedFix: string
}

export interface ReconSet {
  id: string
  name: string
  scope: 'Migration' | 'Cross-system'
  sourceSystemId: string
  targetSystemId: string
  dataSourceIds: string[]
  site: SiteCode | 'ALL'
  counts: { source: number; target: number; matched: number; missing: number; extra: number }
  totals: { label: string; source: number; target: number; delta: number; unit: string }
  matchPct: number
  lastRunAt: string
  sample: ReconRow[]
  differenceGroups: ReconDifferenceGroup[]
  findingIds: string[]
}

/* ---------------------------------------------------------- data-source checks */

export type DataCheckKind =
  | 'completeness'
  | 'duplicates'
  | 'valid-ranges'
  | 'cross-system-match'
  | 'freshness'

export interface DataCheckDefinition {
  kind: DataCheckKind
  label: string
  plain: string
}

export interface DataCheckResult {
  id: string
  dataSourceId: string
  kind: DataCheckKind
  status: 'Passed' | 'Failed' | 'Warning'
  checkedRows: number
  failedRows: number
  plain: string
  query: QuerySpec
  rows?: MockRowsSpec
  findingId?: string
  ranAt: string
}

export interface PlainRuleResult {
  id: string
  rule: string
  dataSourceId: string
  generatedQuery: QuerySpec
  assertion: Assertion
  status: 'Passed' | 'Failed'
  checkedRows: number
  failedRows: number
  rows?: MockRowsSpec
  explanation: string
  ranAt: string
}

/* ---------------------------------------------------------------- approvals */

export type ApprovalKind = 'scenario' | 'healed-script' | 'evidence'

export interface ApprovalRequest {
  id: string
  kind: ApprovalKind
  refId: string
  title: string
  plain: string
  detail: string
  confidencePct?: number
  requestedAt: string
  forRole: RoleName
  status: 'Pending' | 'Approved' | 'Rejected'
  decidedByRole?: RoleName
  decidedAt?: string
  comment?: string
  processId?: ProcessId
  requirementIds: RequirementId[]
}

/* ------------------------------------------------------------ release/close */

export interface GateComponent {
  key: string
  label: string
  weight: number
  score: number
  detail: string
  route: string
}

export interface ReleaseGate {
  score: number
  verdict: Verdict
  components: GateComponent[]
  blockers: { id: string; label: string; severity: Severity; route: string; refId: string }[]
  cappedReason?: string
}

export interface CloseCalendarDay {
  date: string
  label: string
  state: 'open' | 'freeze-current' | 'freeze-target' | 'close' | 'today'
  note?: string
}

export interface CloseReadiness {
  freezeDays: number
  targetFreezeDays: number
  closeDate: string
  calendar: CloseCalendarDay[]
  closeCriticalProcessIds: ProcessId[]
  readinessPct: number
  changeSafety: { changeId: string; safe: boolean; reason: string }[]
}

/* ------------------------------------------------------------------ delivery */

export interface DeliveryTarget {
  key: string
  label: string
  current: number
  target: number
  unit: string
  plain: string
}

export interface DeliveryMilestone {
  id: string
  label: string
  phase: 'Build' | 'Run' | 'Hand over'
  status: 'Done' | 'In progress' | 'Planned'
  week: string
  detail: string
}

export interface PodRole {
  id: string
  role: string
  focus: string
  allocationPct: number
  handoverTo: string
  phase: 'Build' | 'Run' | 'Hand over'
}

export interface TrainingItem {
  id: string
  label: string
  owner: string
  done: boolean
  detail: string
}

export interface DeliveryModel {
  phases: { key: 'Build' | 'Run' | 'Hand over'; progressPct: number; summary: string }[]
  milestones: DeliveryMilestone[]
  podRoles: PodRole[]
  targets: DeliveryTarget[]
  training: TrainingItem[]
}

/* -------------------------------------------------------------------- trend */

export interface TrendPoint {
  date: string
  label: string
  confidence: number
  passRate: number
  scenarios: number
  openFindings: number
  runs: number
}

/* ------------------------------------------------------------------- scores */

export interface ScoreComponent {
  key: string
  label: string
  weight: number
  score: number
  plain: string
  route: string
}

export interface ConfidenceScore {
  score: number
  components: ScoreComponent[]
  cappedAt?: number
  cappedReason?: string
  band: 'Strong' | 'Acceptable' | 'Weak'
}

/* --------------------------------------------------------------------- jobs */

export type JobKind =
  | 'discovery'
  | 'scenario-generation'
  | 'test-data-generation'
  | 'test-data-load'
  | 'run'
  | 'regression'
  | 'load'
  | 'sod-proof'
  | 'recon'
  | 'data-checks'
  | 'healing'

export type JobStatus = 'queued' | 'running' | 'done' | 'failed'

export interface JobLogLine {
  at: string
  text: string
  tone: 'info' | 'ai' | 'ok' | 'warn' | 'error'
}

export interface JobSnapshot<T = unknown> {
  id: string
  kind: JobKind
  status: JobStatus
  progressPct: number
  startedAt: string
  finishedAt?: string
  log: JobLogLine[]
  currentLabel: string
  result?: T
  /** live run payload (only for run jobs) */
  run?: TestRun
}

/* --------------------------------------------------------- command centre */

export interface CommandCentreData {
  confidence: ConfidenceScore
  requirementStatus: {
    id: RequirementId
    title: string
    status: Health
    coveragePct: number
    route: string
    scenarioCount: number
    runCount: number
  }[]
  processHealth: {
    processId: ProcessId
    name: string
    health: Health
    passRate: number
    scenarioCount: number
    openFindings: number
    automationPct: number
    closeCritical: boolean
  }[]
  lastRuns: TestRun[]
  openFindings: Finding[]
  trend: TrendPoint[]
  monthEnd: {
    freezeDays: number
    targetFreezeDays: number
    closeDate: string
    readinessPct: number
    verdict: Verdict
  }
  counters: {
    scenarios: number
    approvedScenarios: number
    pendingApprovals: number
    interfaces: number
    healedThisMonth: number
    evidenceItems: number
    manualHoursSaved: number
  }
}
