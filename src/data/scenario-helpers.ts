import type {
  ApiSpec,
  Assertion,
  MockDocumentSpec,
  MockRowsSpec,
  MockScreenshotSpec,
  ProcessId,
  QuerySpec,
  RequirementId,
  RoleName,
  Scenario,
  ScenarioType,
  Severity,
  SiteCode,
  Step,
  StepKind,
  StepMock,
  StepOutcome,
  TechnicalDetail,
} from '@/lib/types'
import { daysAgo } from '@/lib/clock'

/* ------------------------------------------------------------ small builders */

export function a(expr: string, plain: string): Assertion {
  return { expr, plain }
}

export function q(language: QuerySpec['language'], source: string, text: string): QuerySpec {
  return { language, source, text }
}

export function api(
  method: ApiSpec['method'],
  url: string,
  opts?: { body?: string; headers?: Record<string, string>; responseStatus?: number; responseBody?: string },
): ApiSpec {
  return {
    method,
    url,
    headers: opts?.headers,
    body: opts?.body,
    responseStatus: opts?.responseStatus,
    responseBody: opts?.responseBody,
  }
}

export function shot(
  systemId: string,
  screen: string,
  fields: [string, string, ('normal' | 'highlight' | 'error')?][],
  opts?: { transaction?: string; note?: string; blocked?: boolean },
): MockScreenshotSpec {
  return {
    systemId,
    screen,
    transaction: opts?.transaction,
    note: opts?.note,
    blocked: opts?.blocked,
    fields: fields.map(([label, value, state]) => ({ label, value, state: state ?? 'normal' })),
  }
}

export function rows(
  columns: string[],
  data: string[][],
  opts?: { failRows?: number[]; caption?: string },
): MockRowsSpec {
  return { columns, rows: data, failRows: opts?.failRows, caption: opts?.caption }
}

export function doc(input: MockDocumentSpec): MockDocumentSpec {
  return input
}

/* --------------------------------------------------------------------- steps */

export interface StepInput {
  kind: StepKind
  title: string
  plain: string
  expected: string
  systemId?: string
  interfaceId?: string
  dataSourceIds?: string[]
  /** technical detail - assertions are required, everything else optional */
  assertions: Assertion[]
  uiSelector?: string
  screen?: string
  transaction?: string
  apiSpec?: ApiSpec
  query?: QuerySpec
  messageRef?: string
  documentRef?: string
  /** simulation */
  outcome?: StepOutcome
  durationMs?: number
  log?: string[]
  screenshot?: MockScreenshotSpec
  resultRows?: MockRowsSpec
  document?: MockDocumentSpec
  payload?: { request?: string; response?: string; status?: number }
  findingId?: string
  healingEventId?: string
  evidence?: string[]
  aiGenerated?: boolean
}

export function buildSteps(scenarioCode: string, inputs: StepInput[]): Step[] {
  return inputs.map((input, index) => {
    const technical: TechnicalDetail = {
      uiSelector: input.uiSelector,
      screen: input.screen,
      transaction: input.transaction,
      api: input.apiSpec,
      query: input.query,
      messageRef: input.messageRef,
      documentRef: input.documentRef,
      assertions: input.assertions,
    }
    const mock: StepMock = {
      outcome: input.outcome ?? 'pass',
      durationMs: input.durationMs ?? 900,
      logLines: input.log ?? [],
      screenshot: input.screenshot,
      rows: input.resultRows,
      document: input.document,
      payload: input.payload,
      findingId: input.findingId,
      healingEventId: input.healingEventId,
      evidenceTitles: input.evidence ?? [],
    }
    return {
      id: `${scenarioCode}-S${String(index + 1).padStart(2, '0')}`,
      order: index + 1,
      kind: input.kind,
      title: input.title,
      plain: input.plain,
      expected: input.expected,
      systemId: input.systemId,
      interfaceId: input.interfaceId,
      dataSourceIds: input.dataSourceIds,
      technical,
      mock,
      aiGenerated: input.aiGenerated ?? true,
      healingEventIds: input.healingEventId ? [input.healingEventId] : undefined,
    }
  })
}

/* ----------------------------------------------------------------- scenarios */

export interface ScenarioInput {
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
  tags: string[]
  steps: StepInput[]
  author?: 'AI' | RoleName
  approval?: Scenario['approval']
  approvedByRole?: RoleName
  createdDaysAgo?: number
  lastRunId?: string
  testDataSetId?: string
}

export function buildScenario(input: ScenarioInput): Scenario {
  return {
    id: input.code,
    code: input.code,
    name: input.name,
    processId: input.processId,
    type: input.type,
    plain: input.plain,
    systemIds: input.systemIds,
    interfaceIds: input.interfaceIds,
    requirementIds: input.requirementIds,
    sites: input.sites,
    riskLevel: input.riskLevel,
    author: input.author ?? 'AI',
    approval: input.approval ?? 'Approved',
    approvedByRole: input.approval === 'Approved' || !input.approval ? input.approvedByRole ?? 'Key User' : undefined,
    createdAt: daysAgo(input.createdDaysAgo ?? 12),
    lastRunId: input.lastRunId,
    tags: input.tags,
    steps: buildSteps(input.code, input.steps),
    testDataSetId: input.testDataSetId,
  }
}
