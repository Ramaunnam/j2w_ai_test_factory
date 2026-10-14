import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  BugPlay,
  CheckCircle2,
  FileText,
  Gauge,
  Play,
  RefreshCw,
  Rocket,
  Square,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip,
  EmptyState,
  KeyValue,
  Progress,
} from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import { LiveLog } from '@/components/common/LiveLog'
import { MockDocument, MockScreenshot, PayloadView, RowsTable } from '@/components/common/evidence'
import { DiffView } from '@/components/common/views'
import {
  AiBadge,
  RunStatusBadge,
  ScenarioTypeBadge,
  SeverityBadge,
  StepKindBadge,
  StepKindIcon,
  StepStatusBadge,
  VerdictBadge,
} from '@/components/common/badges'
import {
  DateRangePicker,
  EnvironmentPicker,
  InterfacePicker,
  ProcessPicker,
  ScenarioTypeChips,
  SelectionSummary,
  SitePicker,
  SystemPicker,
  TestDataSetPicker,
} from '@/components/common/selectors'
import {
  BundleRef,
  FindingRef,
  HealingRef,
  InterfaceRef,
  PageRef,
  ScenarioRef,
  SystemRef,
  VehicleRef,
} from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import { useRole } from '@/lib/role'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { openEvidencePack, openRunSummary } from '@/lib/report-link'
import { DEMO_RUN_SCENARIO_IDS } from '@/data/scenarios'
import { dateTime, durationShort, ms, timeShort } from '@/lib/format'
import { cn, vehicleInRow } from '@/lib/utils'
import type { Scenario, Step, StepResult, TestRun } from '@/lib/types'

interface StepRef {
  scenarioId: string
  stepId: string
}

function stepFor(ref: StepRef | null): { scenario?: Scenario; step?: Step } {
  if (!ref) return {}
  const scenario = find.scenario(ref.scenarioId)
  return { scenario, step: scenario?.steps.find((s) => s.id === ref.stepId) }
}

export default function RunCentrePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { role } = useRole()
  const { selection, patch, toggleType, toggleIn } = useSelection()

  const [jobId, setJobId] = useState<string | null>(null)
  const [liveRunId, setLiveRunId] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<StepRef | null>(null)
  const [openFindingId, setOpenFindingId] = useState<string | null>(params.get('finding'))
  const [historicRunId, setHistoricRunId] = useState<string | null>(params.get('run'))
  const [showFindings, setShowFindings] = useState(params.get('findings') === 'open')
  const [speed, setSpeed] = useState(1)

  const job = useJob<TestRun>(jobId, 350)
  const { data: runs } = useApi(() => api.listRuns(), [])

  const liveRun = job?.run
  const historicRun = historicRunId ? find.run(historicRunId) : undefined
  const finishedRun = liveRunId ? find.run(liveRunId) : undefined
  const shownRun: TestRun | undefined = liveRun ?? finishedRun ?? historicRun

  const scenarioPool = useMemo(
    () =>
      db.scenarios.filter(
        (scenario) =>
          (selection.processId === 'ALL' || scenario.processId === selection.processId) &&
          selection.scenarioTypes.includes(scenario.type) &&
          (selection.systemIds.length === 0 || selection.systemIds.some((id) => scenario.systemIds.includes(id))) &&
          (selection.interfaceIds.length === 0 ||
            selection.interfaceIds.some((id) => scenario.interfaceIds.includes(id))) &&
          (selection.site === 'ALL' || scenario.sites.includes(selection.site)),
      ),
    [selection],
  )

  const selectedScenarios = scenarioPool.filter((scenario) => selection.scenarioIds.includes(scenario.id))
  const totalSteps = selectedScenarios.reduce((total, scenario) => total + scenario.steps.length, 0)

  useEffect(() => {
    if (params.get('finding')) setOpenFindingId(params.get('finding'))
    if (params.get('run')) setHistoricRunId(params.get('run'))
    setShowFindings(params.get('findings') === 'open')
  }, [params])

  // Follow the running step automatically.
  useEffect(() => {
    if (!liveRun) return
    const running = liveRun.stepResults.find((result) => result.status === 'Running')
    if (running) setActiveStep({ scenarioId: running.scenarioId, stepId: running.stepId })
  }, [liveRun])

  useEffect(() => {
    if (job?.status === 'done' && liveRunId) {
      const run = find.run(liveRunId)
      toast({
        title: `Run finished: ${run?.verdict ?? ''}`,
        description: `${run?.passedSteps ?? 0} passed, ${run?.healedSteps ?? 0} healed, ${run?.blockedSteps ?? 0} blocked as expected, ${run?.failedSteps ?? 0} failed.`,
        tone: run?.verdict === 'GO' ? 'success' : 'warning',
        actionLabel: 'Open report',
        onAction: () => openRunSummary(liveRunId, navigate),
      })
      setJobId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status])

  const { step: activeStepData, scenario: activeScenario } = stepFor(activeStep)
  const activeResult = shownRun?.stepResults.find(
    (result) => result.stepId === activeStep?.stepId && result.scenarioId === activeStep?.scenarioId,
  )
  const openFinding = openFindingId ? find.finding(openFindingId) : undefined

  function startRun(scenarioIds: string[], label?: string) {
    if (scenarioIds.length === 0) return
    const { jobId: newJobId, runId } = api.startRun({
      role: role.name,
      label,
      selection: {
        processId: selection.processId,
        scenarioIds,
        systemIds: selection.systemIds,
        interfaceIds: selection.interfaceIds,
        scenarioTypes: selection.scenarioTypes,
        site: selection.site,
        dateFrom: selection.dateFrom,
        dateTo: selection.dateTo,
        testDataSetId: selection.testDataSetId ?? undefined,
        environment: selection.environment,
      },
    })
    setJobId(newJobId)
    setLiveRunId(runId)
    setHistoricRunId(null)
    setActiveStep(null)
    api.setRunSpeed(newJobId, speed)
    toast({
      title: 'Run started',
      description: `${scenarioIds.length} scenarios on ${selection.environment}.`,
      tone: 'info',
    })
  }

  const grouped = useMemo(() => {
    if (!shownRun) return []
    const map = new Map<string, StepResult[]>()
    for (const result of shownRun.stepResults) {
      const list = map.get(result.scenarioId) ?? []
      list.push(result)
      map.set(result.scenarioId, list)
    }
    return Array.from(map.entries())
  }, [shownRun])

  /** Clicking a result row that names a vehicle follows that vehicle across every system. */
  function traceRow(row: string[]) {
    const vehicle = vehicleInRow(row)
    if (!vehicle) return
    patch({ vehicle })
    navigate(`/interfaces?trace=${vehicle}`)
  }

  const openFindingsList = db.findings.filter(
    (finding) => finding.status === 'Open' || finding.status === 'Triaged',
  )

  const running = job?.status === 'running'
  const progress = job?.progressPct ?? (shownRun ? 100 : 0)

  return (
    <>
      <PageHeader
        title="Run Centre"
        description="Choose exactly what to test, run it, and watch every step: screens, API calls, messages, data checks and documents, with evidence captured as it goes."
        requirements={['R2', 'R3', 'R5', 'R9']}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              title="Every finding raised by a run that is still Open or Triaged"
              onClick={() => setShowFindings(true)}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Open findings ({openFindingsList.length})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                patch({
                  processId: 'P1',
                  scenarioIds: DEMO_RUN_SCENARIO_IDS,
                  scenarioTypes: ['Positive', 'Negative', 'Regression'],
                  systemIds: [],
                  interfaceIds: [],
                  site: 'PL01',
                })
                toast({
                  title: 'Demo selection loaded',
                  description: 'P1 Gate to Invoice: healed step, blocked-as-expected steps and the weight finding.',
                  tone: 'info',
                })
              }}
            >
              <Rocket className="h-3.5 w-3.5" />
              Load P1 demo selection
            </Button>
            {running ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (jobId) api.stopRun(jobId)
                  setJobId(null)
                }}
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={selection.scenarioIds.length === 0}
                onClick={() => startRun(selection.scenarioIds)}
              >
                <Play className="h-3.5 w-3.5" />
                Run {selection.scenarioIds.length || ''} selected
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProcessPicker value={selection.processId} onChange={(value) => patch({ processId: value })} />
          <ScenarioTypeChips selected={selection.scenarioTypes} onToggle={toggleType} />
          <SystemPicker selected={selection.systemIds} onChange={(values) => patch({ systemIds: values })} />
          <InterfacePicker selected={selection.interfaceIds} onChange={(values) => patch({ interfaceIds: values })} />
          <SitePicker value={selection.site} onChange={(value) => patch({ site: value })} />
          <DateRangePicker from={selection.dateFrom} to={selection.dateTo} onChange={(range) => patch(range)} />
          <TestDataSetPicker
            value={selection.testDataSetId}
            processId={selection.processId}
            onChange={(value) => patch({ testDataSetId: value })}
          />
          <EnvironmentPicker value={selection.environment} onChange={(value) => patch({ environment: value })} />
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
        {/* ------------------------------------------------- scenario picker */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader
              title="Scenarios to run"
              description={`${selection.scenarioIds.length} of ${scenarioPool.length} selected · ${totalSteps} steps`}
              actions={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => patch({ scenarioIds: scenarioPool.map((scenario) => scenario.id) })}
                  >
                    Select all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => patch({ scenarioIds: [] })}>
                    Clear
                  </Button>
                </div>
              }
            />
            <CardBody className="scroll-thin max-h-[26rem] space-y-1.5 overflow-y-auto">
              {scenarioPool.length === 0 ? (
                <EmptyState title="No scenarios match this selection" description="Widen the filters above." />
              ) : (
                scenarioPool.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={cn(
                      'rounded-lg border px-2.5 py-2',
                      selection.scenarioIds.includes(scenario.id)
                        ? 'border-primary/50 bg-primary-soft/30'
                        : 'border-line',
                    )}
                  >
                    <Checkbox
                      checked={selection.scenarioIds.includes(scenario.id)}
                      onChange={() => toggleIn('scenarioIds', scenario.id)}
                      label={
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="mono text-2xs font-semibold text-primary">{scenario.code}</span>
                          <span className="text-xs font-medium">{scenario.name}</span>
                        </span>
                      }
                      description={
                        <span className="mt-1 flex flex-wrap items-center gap-1">
                          <ScenarioTypeBadge type={scenario.type} />
                          <Badge tone="neutral">{scenario.steps.length} steps</Badge>
                          {scenario.approval !== 'Approved' ? <Badge tone="accent">{scenario.approval}</Badge> : null}
                        </span>
                      }
                    />
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Run history" description="Click a run to open its steps and evidence." />
            <DataTable
              rows={runs ?? []}
              getRowId={(row) => row.id}
              dense
              maxHeight="max-h-72"
              searchText={(row) => `${row.id} ${row.label} ${row.runType}`}
              searchPlaceholder="Search runs"
              onRowClick={(row) => {
                setHistoricRunId(row.id)
                setLiveRunId(null)
                setJobId(null)
                setActiveStep(row.stepResults[0] ? { scenarioId: row.stepResults[0].scenarioId, stepId: row.stepResults[0].stepId } : null)
              }}
              activeRowId={shownRun?.id ?? null}
              filters={[
                {
                  key: 'type',
                  label: 'Run type',
                  options: ['Functional', 'Regression', 'Load', 'SoD', 'Reconciliation'].map((value) => ({
                    value,
                    label: value,
                  })),
                  match: (row, value) => row.runType === value,
                },
              ]}
              columns={[
                {
                  key: 'id',
                  header: 'Run',
                  sortValue: (row) => row.startedAt,
                  render: (row) => (
                    <span className="block">
                      <span className="mono text-xs font-semibold text-text">{row.id}</span>
                      <span className="mt-0.5 block text-2xs text-muted">{row.label}</span>
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  sortValue: (row) => row.status,
                  render: (row) => <RunStatusBadge status={row.status} />,
                },
                {
                  key: 'verdict',
                  header: 'Verdict',
                  render: (row) => <VerdictBadge verdict={row.verdict} />,
                  hideBelow: 'sm',
                },
                {
                  key: 'started',
                  header: 'Started',
                  align: 'right',
                  sortValue: (row) => row.startedAt,
                  render: (row) => <span className="text-2xs text-muted">{dateTime(row.startedAt)}</span>,
                  hideBelow: 'md',
                },
              ]}
            />
          </Card>
        </div>

        {/* ------------------------------------------------------- live view */}
        <div className="min-w-0 space-y-4">
          {!shownRun ? (
            <Card>
              <CardBody>
                <EmptyState
                  title="Nothing running yet"
                  description="Select scenarios on the left and press Run, or load the P1 demo selection. You can also open a run from the history."
                  icon={<Rocket className="h-6 w-6" />}
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        patch({ processId: 'P1', scenarioIds: DEMO_RUN_SCENARIO_IDS, site: 'PL01' })
                        startRun(DEMO_RUN_SCENARIO_IDS, 'P1 Gate to Invoice - demo run')
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Run the P1 demo now
                    </Button>
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="mono">{shownRun.id}</span>
                      <span>{shownRun.label}</span>
                    </span>
                  }
                  description={`${shownRun.runType} run on ${shownRun.environment}, started by the ${shownRun.triggeredByRole} role at ${timeShort(shownRun.startedAt)}`}
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      {running ? (
                        <div className="flex items-center gap-1">
                          <Gauge className="h-3.5 w-3.5 text-muted" />
                          {[1, 2, 4].map((value) => (
                            <Chip
                              key={value}
                              active={speed === value}
                              onClick={() => {
                                setSpeed(value)
                                if (jobId) api.setRunSpeed(jobId, value)
                              }}
                            >
                              {value}x
                            </Chip>
                          ))}
                        </div>
                      ) : null}
                      <RunStatusBadge status={shownRun.status} />
                      <VerdictBadge verdict={shownRun.verdict} />
                    </div>
                  }
                />
                <CardBody className="space-y-3">
                  <Progress
                    value={progress}
                    tone={shownRun.failedSteps > 0 ? 'danger' : shownRun.healedSteps > 0 ? 'accent' : 'success'}
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(
                      [
                        ['Steps', shownRun.stepResults.length, 'default'],
                        ['Passed', shownRun.passedSteps, 'success'],
                        ['Healed', shownRun.healedSteps, 'accent'],
                        ['Blocked as expected', shownRun.blockedSteps, 'info'],
                        ['Failed', shownRun.failedSteps, 'danger'],
                      ] as const
                    ).map(([label, value, tone]) => (
                      <div key={label} className="rounded-md border border-line px-2 py-1.5">
                        <p className="label">{label}</p>
                        <p
                          className={cn(
                            'text-base font-semibold tabular-nums',
                            tone === 'success' && 'text-success',
                            tone === 'accent' && 'text-accent',
                            tone === 'info' && 'text-info',
                            tone === 'danger' && value > 0 && 'text-danger',
                          )}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {shownRun.findingIds.length > 0 ? (
                    <div className="space-y-1.5 rounded-lg border border-danger/30 bg-danger-soft/40 p-2.5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {shownRun.findingIds.length} finding{shownRun.findingIds.length > 1 ? 's' : ''} raised by this run
                      </p>
                      {shownRun.findingIds.map((id) => {
                        const finding = find.finding(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setOpenFindingId(id)}
                            className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left hover:bg-danger-soft"
                          >
                            {finding ? <SeverityBadge severity={finding.severity} /> : null}
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-medium text-text">{finding?.title ?? id}</span>
                              <span className="block text-2xs text-muted">{finding?.plain}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}

                  {!running && shownRun.finishedAt ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface2/60 p-2.5">
                      <VerdictBadge verdict={shownRun.verdict} size="lg" />
                      <p className="min-w-0 flex-1 text-xs text-muted">
                        {shownRun.verdict === 'GO'
                          ? 'Everything passed and the evidence is complete.'
                          : shownRun.verdict === 'CONDITIONAL'
                            ? 'Findings exist and are explained. A release is possible with the findings accepted or fixed.'
                            : 'A step failed without an explanation. This cannot go to production.'}{' '}
                        Finished {dateTime(shownRun.finishedAt)} ·{' '}
                        {durationShort(shownRun.stepResults.reduce((total, result) => total + result.durationMs, 0))} of
                        step time.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {shownRun.evidenceBundleId ? <BundleRef id={shownRun.evidenceBundleId} /> : null}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const where = openRunSummary(shownRun.id, navigate)
                            if (where === 'same-tab') {
                              toast({
                                title: 'Run summary opened in this tab',
                                description: 'Your browser blocked the new tab, so it opened here.',
                                tone: 'info',
                              })
                            }
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Open run summary
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEvidencePack(shownRun.id, navigate)}
                        >
                          Audit evidence pack
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => startRun(shownRun.scenarioIds, `${shownRun.label} (re-run)`)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Re-run
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardBody>
              </Card>

              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader title="Steps" description="Click a step to see its evidence." />
                  <CardBody className="scroll-thin max-h-[32rem] space-y-3 overflow-y-auto">
                    {grouped.map(([scenarioId, results]) => {
                      const scenario = find.scenario(scenarioId)
                      return (
                        <div key={scenarioId}>
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <ScenarioRef id={scenarioId} label={scenario?.code} />
                            {scenario ? <ScenarioTypeBadge type={scenario.type} /> : null}
                            <span className="text-2xs text-muted">
                              {results.filter((r) => r.status === 'Passed').length}/{results.length} passed
                            </span>
                          </div>
                          <ol className="space-y-1">
                            {results.map((result) => {
                              const step = scenario?.steps.find((s) => s.id === result.stepId)
                              if (!step) return null
                              const isActive =
                                activeStep?.stepId === result.stepId && activeStep?.scenarioId === result.scenarioId
                              return (
                                <li key={result.stepId}>
                                  <button
                                    type="button"
                                    onClick={() => setActiveStep({ scenarioId: result.scenarioId, stepId: result.stepId })}
                                    className={cn(
                                      'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                                      isActive ? 'border-primary/50 bg-primary-soft/40' : 'border-line hover:bg-surface2',
                                      result.status === 'Running' && 'border-info/50 bg-info-soft/40',
                                    )}
                                  >
                                    <span className="w-4 text-right text-2xs tabular-nums text-muted">{step.order}</span>
                                    <StepKindIcon kind={step.kind} size="sm" />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-xs font-medium text-text">{step.title}</span>
                                      {result.durationMs > 0 ? (
                                        <span className="block text-2xs text-muted">{ms(result.durationMs)}</span>
                                      ) : null}
                                    </span>
                                    {result.findingId ? <Badge tone="danger">finding</Badge> : null}
                                    <StepStatusBadge status={result.status} />
                                  </button>
                                </li>
                              )
                            })}
                          </ol>
                        </div>
                      )
                    })}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title={activeStepData ? activeStepData.title : 'Step evidence'}
                    description={activeStepData ? activeStepData.plain : 'Select a step on the left.'}
                    actions={activeResult ? <StepStatusBadge status={activeResult.status} /> : undefined}
                  />
                  <CardBody className="scroll-thin max-h-[32rem] space-y-3 overflow-y-auto">
                    {!activeStepData ? (
                      <EmptyState title="No step selected" description="The running step is selected automatically." />
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StepKindBadge kind={activeStepData.kind} />
                          {activeStepData.systemId ? <SystemRef id={activeStepData.systemId} compact /> : null}
                          {activeStepData.interfaceId ? <InterfaceRef id={activeStepData.interfaceId} label={activeStepData.interfaceId} /> : null}
                          {activeScenario ? <ScenarioRef id={activeScenario.id} label={activeScenario.code} /> : null}
                        </div>
                        <p className="text-xs text-muted">
                          <span className="font-semibold text-text">Expected: </span>
                          {activeStepData.expected}
                        </p>

                        {activeResult?.healingEventId ? (
                          <div className="space-y-2 rounded-lg border border-accent/40 bg-accent-soft/40 p-2.5">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                              <Wrench className="h-3.5 w-3.5" />
                              This step healed itself and then passed
                            </p>
                            {(() => {
                              const event = find.healing(activeResult.healingEventId!)
                              if (!event) return null
                              return (
                                <>
                                  <p className="text-xs text-text">{event.summary}</p>
                                  <DiffView lines={event.diffLines} before={event.before} after={event.after} />
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-2xs text-muted">
                                      Confidence {event.confidencePct} % · {event.status}
                                    </span>
                                    <HealingRef id={event.id} label="Open in Self-Healing" />
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        ) : null}

                        {activeStepData.mock.screenshot ? <MockScreenshot spec={activeStepData.mock.screenshot} /> : null}
                        {activeStepData.mock.payload ? <PayloadView payload={activeStepData.mock.payload} /> : null}
                        {activeStepData.mock.rows ? <RowsTable spec={activeStepData.mock.rows} onRowClick={traceRow} /> : null}
                        {activeStepData.mock.document ? <MockDocument spec={activeStepData.mock.document} /> : null}

                        {activeResult?.findingId ? (
                          <Button variant="danger" size="sm" onClick={() => setOpenFindingId(activeResult.findingId!)}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Open finding {activeResult.findingId}
                          </Button>
                        ) : null}

                        {activeResult && activeResult.logLines.length > 0 ? (
                          <div>
                            <p className="label mb-1">Step log</p>
                            <pre className="scroll-thin max-h-40 overflow-auto rounded-md border border-line bg-surface2/60 px-2.5 py-2 font-mono text-[0.72rem] leading-relaxed text-muted">
                              {activeResult.logLines.join('\n')}
                            </pre>
                          </div>
                        ) : null}

                        {activeResult && activeResult.evidenceIds.length > 0 ? (
                          <div>
                            <p className="label mb-1">Evidence captured</p>
                            <div className="flex flex-wrap gap-1.5">
                              {activeResult.evidenceIds.map((id) => (
                                <Badge key={id} tone="success" className="font-mono">
                                  {id}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardHeader
                  title="Run log"
                  description="Everything the engine and the AI did, in order."
                  actions={
                    job ? (
                      <Badge tone={job.status === 'running' ? 'info' : 'success'}>
                        {job.status === 'running' ? `${job.progressPct} %` : 'complete'}
                      </Badge>
                    ) : undefined
                  }
                />
                <CardBody>
                  <LiveLog
                    lines={job?.log ?? []}
                    status={job?.status}
                    progressPct={job?.progressPct}
                    currentLabel={job?.currentLabel}
                    height="h-60"
                    emptyHint={
                      shownRun
                        ? 'This run is from the history, so there is no live log. Press Re-run to see it live.'
                        : 'The log appears here while the run is going.'
                    }
                  />
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ----------------------------------------------- open findings list */}
      <Drawer
        open={showFindings}
        onClose={() => {
          setShowFindings(false)
          setParams({})
        }}
        width="w-full max-w-2xl"
        title="Open findings"
        subtitle="Everything the runs found that is still Open or Triaged. This is the number on the Run Centre badge in the sidebar."
        badges={<Badge tone="danger">{openFindingsList.length} open</Badge>}
      >
        <div className="space-y-2">
          {openFindingsList.map((finding) => (
            <button
              key={finding.id}
              type="button"
              onClick={() => navigate(`/finding/${finding.id}`)}
              className="w-full rounded-lg border border-line p-3 text-left transition-colors hover:bg-surface2/60"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono text-xs font-semibold text-text">{finding.id}</span>
                <SeverityBadge severity={finding.severity} />
                <Badge tone={finding.status === 'Open' ? 'danger' : 'neutral'}>{finding.status}</Badge>
                <Badge tone="neutral">{finding.processId}</Badge>
              </div>
              <p className="mt-1.5 text-sm font-medium text-text">{finding.title}</p>
              <p className="mt-1 text-xs text-muted">{finding.plain}</p>
            </button>
          ))}
          {openFindingsList.length === 0 ? (
            <EmptyState title="No open findings" description="Everything the runs found has been fixed or accepted." />
          ) : null}
        </div>
      </Drawer>

      {/* --------------------------------------------------- finding drawer */}
      <Drawer
        open={Boolean(openFinding)}
        onClose={() => {
          setOpenFindingId(null)
          setParams({})
        }}
        width="w-full max-w-2xl"
        title={openFinding?.title ?? ''}
        subtitle={openFinding?.plain}
        badges={
          openFinding ? (
            <>
              <SeverityBadge severity={openFinding.severity} />
              <Badge tone={openFinding.status === 'Open' ? 'danger' : 'neutral'}>{openFinding.status}</Badge>
              {openFinding.defectRef ? <Badge tone="primary">{openFinding.defectRef}</Badge> : null}
            </>
          ) : undefined
        }
        footer={
          openFinding ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={openFinding.status !== 'Open'}
                  onClick={() => {
                    void api.updateFindingStatus(openFinding.id, 'Triaged').then(() =>
                      toast({ title: 'Finding triaged', tone: 'info', description: openFinding.id }),
                    )
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Triage
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={Boolean(openFinding.defectRef)}
                  onClick={() => {
                    void api.createDefect(openFinding.id, role.name).then((ref) =>
                      toast({
                        title: `Defect ${ref} created`,
                        description: 'The finding is linked to the defect and the release gate is updated.',
                        tone: 'warning',
                      }),
                    )
                  }}
                >
                  <BugPlay className="h-3.5 w-3.5" />
                  {openFinding.defectRef ? `Defect ${openFinding.defectRef}` : 'Create defect'}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => navigate(`/finding/${openFinding.id}`)}>
                  Open finding
                </Button>
                <PageRef to="/release">See the effect on the release gate</PageRef>
              </div>
            </div>
          ) : undefined
        }
      >
        {openFinding ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Process', value: openFinding.processId },
                { label: 'Detected', value: dateTime(openFinding.detectedAt) },
                {
                  label: 'Systems',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {openFinding.systemIds.map((id) => (
                        <SystemRef key={id} id={id} compact />
                      ))}
                    </span>
                  ),
                },
                {
                  label: 'Interfaces',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {openFinding.interfaceIds.map((id) => (
                        <InterfaceRef key={id} id={id} label={id} />
                      ))}
                    </span>
                  ),
                },
                { label: 'From run', value: openFinding.runId },
                {
                  label: 'Vehicles',
                  value: openFinding.vehicles?.length ? (
                    <span className="flex flex-wrap gap-1">
                      {openFinding.vehicles.map((vehicle) => (
                        <VehicleRef key={vehicle} vehicle={vehicle} />
                      ))}
                    </span>
                  ) : (
                    'not vehicle related'
                  ),
                },
              ]}
            />

            <div>
              <p className="label mb-1">Cause</p>
              <p className="text-sm text-text">{openFinding.cause}</p>
            </div>
            <div>
              <p className="label mb-1 flex items-center gap-1.5">
                AI explanation <AiBadge label="written by AI" />
              </p>
              <p className="rounded-lg border border-ai/30 bg-ai-soft/40 p-3 text-sm text-text">
                {openFinding.aiExplanation}
              </p>
            </div>
            <div>
              <p className="label mb-1">Recommended fix</p>
              <p className="text-sm text-text">{openFinding.recommendedFix}</p>
            </div>
            {openFinding.rows ? (
              <div>
                <p className="label mb-1">Rows involved - click a row to follow that vehicle</p>
                <RowsTable spec={openFinding.rows} onRowClick={traceRow} />
              </div>
            ) : null}
            <div>
              <p className="label mb-1">Requirements affected</p>
              <div className="flex flex-wrap gap-1.5">
                {openFinding.requirementIds.map((id) => (
                  <FindingRef key={id} id={openFinding.id} label={id} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
