import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CalendarClock, Play, Route, Sparkles, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, EmptyState, KeyValue, Progress, Select } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import { LiveLog } from '@/components/common/LiveLog'
import {
  AiBadge,
  RunStatusBadge,
  ScenarioTypeBadge,
  SeverityBadge,
  StepStatusBadge,
  VerdictBadge,
} from '@/components/common/badges'
import { FindingRef, HealingRef, PageRef, ProcessRef, RunRef, ScenarioRef, SystemRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import { useRole } from '@/lib/role'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { openRunSummary } from '@/lib/report-link'
import { dateMedium, durationShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChangeItem, TestRun } from '@/lib/types'

export default function RegressionPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { role } = useRole()
  const { selection } = useSelection()

  const [openChangeId, setOpenChangeId] = useState<string | null>(params.get('change'))
  const [assessJobId, setAssessJobId] = useState<string | null>(null)
  const [runJobId, setRunJobId] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [scenarioIds, setScenarioIds] = useState<string[]>([])
  const [baselineRunId, setBaselineRunId] = useState<string>('RUN-1030')
  const [comparison, setComparison] = useState<api.RegressionComparison | null>(null)

  const assessJob = useJob(assessJobId)
  const runJob = useJob<TestRun>(runJobId)
  const { data: changes } = useApi(() => api.listChanges(), [])
  const { data: runs } = useApi(() => api.listRuns(), [])

  const openChange = openChangeId ? find.change(openChangeId) : undefined

  useEffect(() => {
    if (params.get('change')) setOpenChangeId(params.get('change'))
  }, [params])

  useEffect(() => {
    if (!openChange) return
    setScenarioIds(openChange.impactedScenarioIds)
    const suggested = api.suggestBaselineRun(openChange.impactedScenarioIds)
    if (suggested) setBaselineRunId(suggested)
  }, [openChange])

  useEffect(() => {
    if (runJob?.status === 'done' && runId) {
      void api.compareToBaseline(runId, baselineRunId).then((result) => {
        setComparison(result)
        toast({
          title: 'Regression finished',
          description: `${result.newFailures.length} new failures, ${result.fixed.length} fixed, ${result.unchanged} unchanged.`,
          tone: result.newFailures.length > 0 ? 'warning' : 'success',
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runJob?.status])

  const run = runId ? find.run(runId) : undefined
  const sortedChanges = useMemo(
    () => [...(changes ?? [])].sort((a, b) => b.riskScore - a.riskScore),
    [changes],
  )

  function startRegression(change: ChangeItem | undefined, ids: string[]) {
    if (ids.length === 0) return
    const { jobId, runId: newRunId } = api.startRun({
      role: role.name,
      runType: 'Regression',
      label: change ? `Regression for ${change.ref}` : 'Regression run',
      selection: {
        processId: change?.impactedProcessIds[0] ?? selection.processId,
        scenarioIds: ids,
        systemIds: change ? [change.systemId] : selection.systemIds,
        interfaceIds: [],
        scenarioTypes: selection.scenarioTypes,
        site: selection.site,
        dateFrom: selection.dateFrom,
        dateTo: selection.dateTo,
        environment: selection.environment,
      },
    })
    setRunJobId(jobId)
    setRunId(newRunId)
    setComparison(null)
    toast({ title: 'Regression started', description: `${ids.length} scenarios re-run.`, tone: 'info' })
  }

  return (
    <>
      <PageHeader
        title="Regression & Change Impact"
        description="Every upcoming change is read by the AI: which processes and scenarios it touches, how risky it is, and whether it is safe before the close. Then the affected scenarios are re-run and compared with a baseline."
        requirements={['R2', 'R9']}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/self-healing')}>
              <Wrench className="h-3.5 w-3.5" />
              Script repairs
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={scenarioIds.length === 0}
              onClick={() => startRegression(openChange, scenarioIds)}
            >
              <Play className="h-3.5 w-3.5" />
              Run regression ({scenarioIds.length})
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader
              title="Change feed"
              description="Transports, ERP updates, platform releases, mill changes and schema changes. Click one for the AI impact assessment."
            />
            <DataTable
              rows={sortedChanges}
              getRowId={(row) => row.id}
              searchText={(row) => `${row.ref} ${row.title} ${row.kind}`}
              searchPlaceholder="Search changes"
              onRowClick={(row) => {
                setOpenChangeId(row.id)
                setParams({ change: row.id })
              }}
              activeRowId={openChangeId}
              rowTone={(row) => (row.closeSafe ? undefined : 'danger')}
              filters={[
                {
                  key: 'kind',
                  label: 'Kind',
                  options: Array.from(new Set(sortedChanges.map((row) => row.kind))).map((value) => ({
                    value,
                    label: value,
                  })),
                  match: (row, value) => row.kind === value,
                },
                {
                  key: 'close',
                  label: 'Close safety',
                  options: [
                    { value: 'safe', label: 'Safe before close' },
                    { value: 'unsafe', label: 'Not safe' },
                  ],
                  match: (row, value) => (value === 'safe' ? row.closeSafe : !row.closeSafe),
                },
              ]}
              columns={[
                {
                  key: 'ref',
                  header: 'Change',
                  sortValue: (row) => row.ref,
                  render: (row) => (
                    <span className="block">
                      <span className="mono text-xs font-semibold text-text">{row.ref}</span>
                      <span className="mt-0.5 block text-2xs text-muted">{row.title}</span>
                    </span>
                  ),
                },
                {
                  key: 'kind',
                  header: 'Kind',
                  sortValue: (row) => row.kind,
                  render: (row) => <Badge tone="primary">{row.kind}</Badge>,
                  hideBelow: 'sm',
                },
                {
                  key: 'system',
                  header: 'System',
                  render: (row) => <SystemRef id={row.systemId} compact />,
                  hideBelow: 'md',
                },
                {
                  key: 'date',
                  header: 'Planned',
                  sortValue: (row) => row.plannedDate,
                  render: (row) => <span className="text-2xs text-muted">{dateMedium(row.plannedDate)}</span>,
                },
                {
                  key: 'risk',
                  header: 'Risk',
                  align: 'right',
                  sortValue: (row) => row.riskScore,
                  render: (row) => (
                    <span className="inline-flex w-20 flex-col items-end">
                      <span
                        className={cn(
                          'mono text-xs font-semibold',
                          row.riskScore >= 75 ? 'text-danger' : row.riskScore >= 50 ? 'text-accent' : 'text-muted',
                        )}
                      >
                        {row.riskScore}
                      </span>
                      <Progress
                        value={row.riskScore}
                        height="h-1"
                        tone={row.riskScore >= 75 ? 'danger' : row.riskScore >= 50 ? 'accent' : 'primary'}
                      />
                    </span>
                  ),
                },
                {
                  key: 'scenarios',
                  header: 'Scenarios',
                  align: 'right',
                  sortValue: (row) => row.impactedScenarioIds.length,
                  render: (row) => <span className="mono">{row.impactedScenarioIds.length}</span>,
                },
                {
                  key: 'close',
                  header: 'Before close',
                  render: (row) =>
                    row.closeSafe ? <Badge tone="success">Safe</Badge> : <Badge tone="danger">Not safe</Badge>,
                },
              ]}
            />
          </Card>

          {comparison && run ? (
            <Card>
              <CardHeader
                title="Baseline comparison"
                description={`Run ${comparison.runId} against baseline ${comparison.baselineRunId}.`}
                actions={<VerdictBadge verdict={run.verdict} />}
              />
              <CardBody className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="min-w-0 rounded-md border border-line px-2.5 py-1.5">
                    <p className="label">New failures</p>
                    <p className={cn('text-lg font-semibold tabular-nums', comparison.newFailures.length > 0 && 'text-danger')}>
                      {comparison.newFailures.length}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-md border border-line px-2.5 py-1.5">
                    <p className="label">Fixed since baseline</p>
                    <p className="text-lg font-semibold tabular-nums text-success">{comparison.fixed.length}</p>
                  </div>
                  <div className="min-w-0 rounded-md border border-line px-2.5 py-1.5">
                    <p className="label">Unchanged</p>
                    <p className="text-lg font-semibold tabular-nums text-text">{comparison.unchanged}</p>
                  </div>
                  <div className="min-w-0 rounded-md border border-line px-2.5 py-1.5" title="Steps the baseline run never covered, so there is nothing to compare them with">
                    <p className="label">Not comparable</p>
                    <p className={cn('text-lg font-semibold tabular-nums', comparison.notComparable > 0 && 'text-accent')}>
                      {comparison.notComparable}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-md border border-line px-2.5 py-1.5">
                    <p className="label">Step time</p>
                    <p className="text-lg font-semibold tabular-nums text-text">
                      {durationShort(comparison.durationMs)}
                    </p>
                    <p className="text-2xs text-muted">
                      baseline {durationShort(comparison.baselineDurationMs)}
                      {comparison.durationDeltaPct === null
                        ? ' · no comparable time'
                        : ` · ${comparison.durationDeltaPct > 0 ? '+' : ''}${comparison.durationDeltaPct} %`}
                    </p>
                  </div>
                </div>

                {comparison.note ? (
                  <p className="flex items-start gap-1.5 rounded-md bg-accent-soft px-2.5 py-2 text-xs text-accent">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {comparison.note}
                  </p>
                ) : null}

                {comparison.newFailures.length > 0 ? (
                  <div className="space-y-1.5 rounded-lg border border-danger/40 bg-danger-soft/30 p-2.5">
                    <p className="text-xs font-semibold text-danger">New failures to look at</p>
                    {comparison.newFailures.map((failure) => (
                      <div key={`${failure.stepId}-${failure.findingId ?? ''}`} className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 text-text">{failure.title}</span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {failure.severity ? <SeverityBadge severity={failure.severity} /> : null}
                            {failure.findingId ? <FindingRef id={failure.findingId} label={failure.findingId} /> : null}
                            {failure.scenarioId ? <ScenarioRef id={failure.scenarioId} label={failure.scenarioId} /> : null}
                          </span>
                        </div>
                        <p className="text-2xs text-muted">{failure.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-success/40 bg-success-soft/30 p-2.5 text-xs text-success">
                    Nothing new failed against the baseline
                    {comparison.comparedSteps > 0 ? ` across the ${comparison.comparedSteps} comparable steps.` : '.'}
                  </p>
                )}

                {comparison.newFindings.length > 0 ? (
                  <div className="space-y-1 rounded-lg border border-line p-2.5">
                    <p className="text-xs font-semibold text-text">Findings this run raised and the baseline did not</p>
                    {comparison.newFindings.map((finding) => (
                      <div key={finding.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 text-text">{finding.title}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <SeverityBadge severity={finding.severity} />
                          <FindingRef id={finding.id} label={finding.id} />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {comparison.fixed.length > 0 ? (
                  <div className="space-y-1 rounded-lg border border-success/40 bg-success-soft/30 p-2.5">
                    <p className="text-xs font-semibold text-success">Fixed since the baseline</p>
                    {comparison.fixed.map((item) => (
                      <div key={item.stepId} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 text-text">{item.title}</span>
                        <ScenarioRef id={item.scenarioId} label={item.scenarioId} />
                      </div>
                    ))}
                  </div>
                ) : null}

                {comparison.fixedFindings.length > 0 ? (
                  <div className="space-y-1 rounded-lg border border-line p-2.5">
                    <p className="text-xs font-semibold text-text">Findings the baseline had and this run did not</p>
                    {comparison.fixedFindings.map((finding) => (
                      <div key={finding.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 text-text">{finding.title}</span>
                        <FindingRef id={finding.id} label={finding.id} />
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <RunRef id={comparison.runId} />
                  <Button variant="secondary" size="sm" onClick={() => openRunSummary(comparison.runId, navigate)}>
                    Open run summary
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader
              title="Regression run"
              description="Pick the baseline, then re-run the affected scenarios."
              icon={<Route className="h-4 w-4 text-primary" />}
            />
            <CardBody className="space-y-3">
              <div>
                <p className="label mb-1">Baseline run</p>
                <Select
                  size="sm"
                  className="w-full"
                  value={baselineRunId}
                  onChange={(event) => setBaselineRunId(event.target.value)}
                  options={(runs ?? [])
                    .filter((item) => item.stepResults.length > 0)
                    .map((item) => {
                      const overlap = item.scenarioIds.filter((id) => scenarioIds.includes(id)).length
                      return {
                        value: item.id,
                        label: `${item.id} ${item.label}${overlap > 0 ? ` - ${overlap} of the same scenarios` : ' - no overlap'}`,
                      }
                    })}
                  aria-label="Baseline run"
                />
                <p className="mt-1 text-2xs text-muted">
                  A baseline that ran the same scenarios gives a like-for-like comparison. With no overlap the steps
                  cannot be matched, and the comparison says so.
                </p>
              </div>
              <div>
                <p className="label mb-1">Scenarios in this regression ({scenarioIds.length})</p>
                <div className="scroll-thin max-h-56 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
                  {(openChange?.impactedScenarioIds ?? db.scenarios.slice(0, 8).map((s) => s.id)).map((id) => {
                    const scenario = find.scenario(id)
                    if (!scenario) return null
                    return (
                      <Checkbox
                        key={id}
                        checked={scenarioIds.includes(id)}
                        onChange={() =>
                          setScenarioIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]))
                        }
                        label={
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="mono text-2xs text-primary">{scenario.code}</span>
                            <span className="text-xs">{scenario.name}</span>
                          </span>
                        }
                        description={
                          <span className="flex items-center gap-1">
                            <ScenarioTypeBadge type={scenario.type} />
                            <span>{scenario.steps.length} steps</span>
                          </span>
                        }
                      />
                    )
                  })}
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={scenarioIds.length === 0 || runJob?.status === 'running'}
                loading={runJob?.status === 'running'}
                onClick={() => startRegression(openChange, scenarioIds)}
              >
                <Play className="h-3.5 w-3.5" />
                Run regression
              </Button>
              {run ? (
                <div className="space-y-2 rounded-lg border border-line p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <RunRef id={run.id} label={run.id} />
                    <RunStatusBadge status={run.status} />
                    <VerdictBadge verdict={run.verdict} />
                  </div>
                  <div className="space-y-0.5">
                    {run.stepResults.slice(0, 6).map((result) => {
                      const scenario = find.scenario(result.scenarioId)
                      const step = scenario?.steps.find((item) => item.id === result.stepId)
                      return (
                        <div key={result.stepId} className="flex items-center justify-between gap-2 text-2xs">
                          <span className="min-w-0 truncate text-muted">{step?.title}</span>
                          <StepStatusBadge status={result.status} />
                        </div>
                      )
                    })}
                    {run.stepResults.length > 6 ? (
                      <p className="pt-1 text-2xs text-muted">
                        and {run.stepResults.length - 6} more steps. <PageRef to={`/run?run=${run.id}`}>Open the run</PageRef>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Live log"
              description="Impact assessment and the regression run write here."
              icon={<Sparkles className="h-4 w-4 text-ai" />}
            />
            <CardBody>
              <LiveLog
                lines={runJob?.log ?? assessJob?.log ?? []}
                status={runJob?.status ?? assessJob?.status}
                progressPct={runJob?.progressPct ?? assessJob?.progressPct}
                currentLabel={runJob?.currentLabel ?? assessJob?.currentLabel}
                height="h-64"
                emptyHint="Open a change and press Assess impact, or run the regression."
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------- change drawer */}
      <Drawer
        open={Boolean(openChange)}
        onClose={() => {
          setOpenChangeId(null)
          setParams({})
        }}
        width="w-full max-w-2xl"
        title={openChange ? `${openChange.ref} ${openChange.title}` : ''}
        subtitle={openChange?.description}
        badges={
          openChange ? (
            <>
              <Badge tone="primary">{openChange.kind}</Badge>
              <Badge tone={openChange.riskScore >= 75 ? 'danger' : openChange.riskScore >= 50 ? 'accent' : 'neutral'}>
                Risk {openChange.riskScore}
              </Badge>
              {openChange.closeSafe ? (
                <Badge tone="success">Safe before close</Badge>
              ) : (
                <Badge tone="danger">Not safe before close</Badge>
              )}
            </>
          ) : undefined
        }
        footer={
          openChange ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ai"
                size="sm"
                loading={assessJob?.status === 'running'}
                onClick={() => {
                  setAssessJobId(api.assessChangeImpact(openChange.id))
                  toast({ title: 'AI is assessing the change', tone: 'ai', description: openChange.ref })
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Assess impact again
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  startRegression(openChange, openChange.impactedScenarioIds)
                  setOpenChangeId(null)
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Run regression for this change
              </Button>
            </div>
          ) : undefined
        }
      >
        {openChange ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'System', value: <SystemRef id={openChange.systemId} /> },
                { label: 'Planned', value: dateMedium(openChange.plannedDate) },
                {
                  label: 'Processes touched',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {openChange.impactedProcessIds.map((id) => (
                        <ProcessRef key={id} id={id} label={id} />
                      ))}
                    </span>
                  ),
                },
                { label: 'Scenarios touched', value: openChange.impactedScenarioIds.length },
              ]}
            />

            <div>
              <p className="label mb-1 flex items-center gap-1.5">
                AI impact assessment <AiBadge label="written by AI" />
              </p>
              <p className="rounded-lg border border-ai/30 bg-ai-soft/40 p-3 text-sm text-text">
                {openChange.aiAssessment}
              </p>
            </div>

            <div
              className={cn(
                'rounded-lg border p-3',
                openChange.closeSafe ? 'border-success/40 bg-success-soft/30' : 'border-danger/40 bg-danger-soft/30',
              )}
            >
              <p
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold',
                  openChange.closeSafe ? 'text-success' : 'text-danger',
                )}
              >
                {openChange.closeSafe ? <CalendarClock className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                Safe to change before the close?
              </p>
              <p className="mt-1 text-xs text-text">{openChange.closeSafeReason}</p>
              <div className="mt-1.5">
                <PageRef to="/release">Open close readiness</PageRef>
              </div>
            </div>

            <div>
              <p className="label mb-1.5">Scenarios affected</p>
              <div className="space-y-1">
                {openChange.impactedScenarioIds.map((id) => {
                  const scenario = find.scenario(id)
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                      <ScenarioRef id={id} />
                      {scenario ? <ScenarioTypeBadge type={scenario.type} /> : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {openChange.healingEventIds.length > 0 ? (
              <div>
                <p className="label mb-1.5">Script repairs proposed by the AI</p>
                <div className="space-y-1">
                  {openChange.healingEventIds.map((id) => {
                    const event = find.healing(id)
                    return (
                      <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent/40 bg-accent-soft/30 px-2.5 py-1.5">
                        <HealingRef id={id} />
                        <span className="text-2xs text-muted">
                          {event?.confidencePct} % confidence · {event?.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <EmptyState title="No script repairs needed for this change" className="py-6" />
            )}
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
