import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  Clock,
  Database,
  FileText,
  GitCompareArrows,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Progress } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { ScoreBreakdown, ScoreGauge, StatTile } from '@/components/common/tiles'
import {
  HealthBadge,
  HealthDot,
  HealthLegend,
  RunStatusBadge,
  SeverityBadge,
  VerdictBadge,
} from '@/components/common/badges'
import { CategoryBars, TrendChart } from '@/components/charts/charts'
import { FindingRef, PageRef, ProcessRef, RunRef } from '@/components/common/links'
import { useApi } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { REQUIREMENT_STATUS_MEANING } from '@/lib/score'
import { dateMedium, dateTime, num, relativeTo } from '@/lib/format'
import { NOW_ISO } from '@/lib/clock'
import { cn } from '@/lib/utils'
import type { CommandCentreData, Severity, TrendPoint } from '@/lib/types'

export default function CommandCentrePage() {
  const navigate = useNavigate()
  const { patch } = useSelection()
  const { data, loading } = useApi<CommandCentreData>(() => api.getCommandCentre(), [])

  const [showBreakdown, setShowBreakdown] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null)
  const [trendDay, setTrendDay] = useState<TrendPoint | null>(null)

  const severityCounts = useMemo(() => {
    const severities: Severity[] = ['Critical', 'High', 'Medium', 'Low']
    return severities.map((severity) => ({
      key: severity,
      label: severity,
      value: (data?.openFindings ?? []).filter((finding) => finding.severity === severity).length,
      tone: (severity === 'Critical' ? 'danger' : severity === 'High' ? 'accent' : 'default') as
        | 'danger'
        | 'accent'
        | 'default',
    }))
  }, [data?.openFindings])

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Command Centre" description="Loading the current picture of the test landscape." />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index}>
              <CardBody className="h-40 animate-pulse-soft" />
            </Card>
          ))}
        </div>
      </>
    )
  }

  const findingsForDrawer = severityFilter
    ? data.openFindings.filter((finding) => finding.severity === severityFilter)
    : []
  const runsForDay = trendDay
    ? db.runs.filter((run) => run.startedAt.slice(0, 10) === trendDay.date.slice(0, 10))
    : []

  return (
    <>
      <PageHeader
        title="Command Centre"
        description="One picture of where testing stands: a confidence score calculated by code, the ten requirements, the six business processes, and how ready the month-end close is."
        requirements={['R1', 'R2', 'R3', 'R6', 'R10']}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/release')}>
              <CalendarClock className="h-3.5 w-3.5" />
              Release readiness
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/run')}>
              <Sparkles className="h-3.5 w-3.5" />
              Open Run Centre
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[auto_minmax(0,1fr)]">
        <Card className="xl:w-[21rem]">
          <CardHeader
            title="Confidence score"
            description="Deterministic: seven weighted components, no AI in the number."
            actions={
              <Button variant="ghost" size="sm" onClick={() => setShowBreakdown(true)}>
                How is this calculated?
              </Button>
            }
          />
          <CardBody className="flex flex-col items-center gap-3">
            <ScoreGauge
              score={data.confidence.score}
              verdict={data.confidence.band}
              onClick={() => setShowBreakdown(true)}
            />
            {data.confidence.cappedReason ? (
              <p className="flex items-start gap-1.5 rounded-md bg-accent-soft px-2.5 py-2 text-xs text-accent">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {data.confidence.cappedReason}
              </p>
            ) : null}
            <div className="grid w-full grid-cols-2 gap-2">
              <StatTile
                label="Scenarios"
                value={data.counters.scenarios}
                hint={`${data.counters.approvedScenarios} approved`}
                icon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={() => navigate('/studio')}
              />
              <StatTile
                label="Approvals open"
                value={data.counters.pendingApprovals}
                tone={data.counters.pendingApprovals > 0 ? 'accent' : 'success'}
                hint="Key-user queue"
                icon={<CheckSquare className="h-3.5 w-3.5" />}
                onClick={() => navigate('/approvals')}
              />
              <StatTile
                label="Interfaces"
                value={data.counters.interfaces}
                hint="Shop-floor and financial"
                icon={<GitCompareArrows className="h-3.5 w-3.5" />}
                onClick={() => navigate('/interfaces')}
              />
              <StatTile
                label="Scripts healed"
                value={data.counters.healedThisMonth}
                hint="This month, AI repairs"
                tone="accent"
                icon={<Wrench className="h-3.5 w-3.5" />}
                onClick={() => navigate('/self-healing')}
              />
              <StatTile
                label="Evidence items"
                value={num(data.counters.evidenceItems)}
                hint="Locked and hashed"
                icon={<FileText className="h-3.5 w-3.5" />}
                onClick={() => navigate('/evidence')}
              />
              <StatTile
                label="Manual hours saved"
                value={data.counters.manualHoursSaved}
                unit="per month"
                tone="success"
                icon={<Clock className="h-3.5 w-3.5" />}
                onClick={() => navigate('/delivery')}
              />
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Month-end readiness"
              description={`Close on ${dateMedium(data.monthEnd.closeDate)}. The freeze is what we are shortening.`}
              actions={<VerdictBadge verdict={data.monthEnd.verdict} />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <p className="label">Change freeze today</p>
                    <p className="text-3xl font-semibold tabular-nums text-text">
                      {data.monthEnd.freezeDays} <span className="text-sm font-medium text-muted">days</span>
                    </p>
                  </div>
                  <TrendingUp className="mb-2 h-5 w-5 rotate-180 text-success" aria-hidden />
                  <div>
                    <p className="label">Target with automated testing</p>
                    <p className="text-3xl font-semibold tabular-nums text-success">
                      {data.monthEnd.targetFreezeDays} <span className="text-sm font-medium text-muted">days</span>
                    </p>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Close readiness</span>
                    <span className="font-semibold tabular-nums text-text">{data.monthEnd.readinessPct} %</span>
                  </div>
                  <Progress
                    value={data.monthEnd.readinessPct}
                    tone={data.monthEnd.readinessPct >= 85 ? 'success' : 'accent'}
                  />
                </div>
                <p className="text-xs text-muted">
                  Today the business freezes changes for ten days around the close because the checks are manual. With the
                  automated regression, reconciliation and load tests in this platform the same assurance takes three
                  days.
                </p>
              </div>
              <div className="flex flex-col justify-center gap-2 sm:w-44">
                <Button variant="secondary" size="sm" onClick={() => navigate('/release')}>
                  <CalendarClock className="h-3.5 w-3.5" />
                  Freeze calendar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/load')}>
                  Month-end load
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/reconciliation')}>
                  <Database className="h-3.5 w-3.5" />
                  Reconciliation
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Last 30 days"
              description="Confidence and pass rate move as scenarios are approved and findings are closed."
            />
            <CardBody>
              <TrendChart points={data.trend} onPointClick={(point) => setTrendDay(point)} />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Requirements R1 to R10"
            description="Click a requirement to see the page and the scenarios that prove it."
            actions={
              <span className="flex flex-wrap items-center gap-3">
                <HealthLegend />
                <PageRef to="/coverage">Coverage page</PageRef>
              </span>
            }
          />
          <CardBody className="grid gap-2 sm:grid-cols-2">
            {data.requirementStatus.map((requirement) => (
              <button
                key={requirement.id}
                type="button"
                onClick={() => {
                  patch({ requirementId: requirement.id })
                  navigate(`/coverage?req=${requirement.id}`)
                }}
                className="group rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-surface2/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Badge tone="primary">{requirement.id}</Badge>
                    <HealthDot
                      health={requirement.status}
                      title={REQUIREMENT_STATUS_MEANING[requirement.status]}
                    />
                  </span>
                  <span className="text-2xs font-semibold tabular-nums text-muted">{requirement.coveragePct} %</span>
                </div>
                <p className="mt-1.5 text-xs font-medium leading-snug text-text">{requirement.title}</p>
                <Progress
                  className="mt-2"
                  height="h-1"
                  value={requirement.coveragePct}
                  tone={requirement.coveragePct >= 80 ? 'success' : requirement.coveragePct >= 60 ? 'accent' : 'danger'}
                />
                <p className="mt-1.5 text-2xs text-muted">
                  {requirement.scenarioCount} scenarios · {requirement.runCount} runs
                </p>
              </button>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Process health"
              description="P1 and P2 are fully built, P3 to P6 have a first set. Click a process to open its scenarios."
            />
            <CardBody className="space-y-1.5">
              {data.processHealth.map((process) => (
                <div
                  key={process.processId}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2"
                >
                  <HealthDot health={process.health} />
                  <span className="min-w-0 flex-1">
                    <ProcessRef id={process.processId} label={`${process.processId} ${process.name}`} />
                    <span className="mt-0.5 block text-2xs text-muted">
                      {process.scenarioCount} scenarios · {process.openFindings} open findings
                      {process.closeCritical ? ' · close critical' : ''}
                    </span>
                  </span>
                  <span className="w-24">
                    <span className="flex items-center justify-between text-2xs text-muted">
                      pass <span className="font-semibold text-text">{process.passRate} %</span>
                    </span>
                    <Progress
                      height="h-1"
                      value={process.passRate}
                      tone={process.passRate >= 90 ? 'success' : process.passRate >= 70 ? 'accent' : 'danger'}
                    />
                  </span>
                  <span className="w-24">
                    <span className="flex items-center justify-between text-2xs text-muted">
                      automated <span className="font-semibold text-text">{process.automationPct} %</span>
                    </span>
                    <Progress height="h-1" value={process.automationPct} tone="primary" />
                  </span>
                  <HealthBadge health={process.health} />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Open findings"
              description="Click a bar to see the findings behind it."
              actions={<Badge tone="danger">{data.openFindings.length} open</Badge>}
            />
            <CardBody>
              <CategoryBars
                data={severityCounts}
                height="h-44"
                onBarClick={(key) => setSeverityFilter(key as Severity)}
                tableHeader={['Severity', 'Open findings']}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Last runs"
          description="Every run keeps its evidence. Click one to open its steps."
          actions={<PageRef to="/run">Run Centre</PageRef>}
        />
        <CardBody className="space-y-1.5">
          {data.lastRuns.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => navigate(`/run?run=${run.id}`)}
              className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-surface2/60"
            >
              <span className="mono text-xs font-semibold text-text">{run.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-text">{run.label}</span>
              <Badge tone="neutral">{run.runType}</Badge>
              <RunStatusBadge status={run.status} />
              <VerdictBadge verdict={run.verdict} />
              <span className="text-2xs text-muted">{relativeTo(run.startedAt, NOW_ISO)}</span>
            </button>
          ))}
        </CardBody>
      </Card>

      {/* ------------------------------------------------- score breakdown */}
      <Drawer
        open={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        title="How the confidence score is calculated"
        subtitle="Seven weighted components, all computed from the run and interface data. Click a component to open the page behind it."
        badges={<Badge tone="primary">{data.confidence.score} of 100</Badge>}
      >
        <ScoreBreakdown
          components={data.confidence.components}
          cappedReason={data.confidence.cappedReason}
          onComponentClick={(route) => {
            setShowBreakdown(false)
            navigate(route)
          }}
        />
        <p className="mt-4 text-xs text-muted">
          The score is deterministic code in <span className="mono">src/lib/score.ts</span>. The AI writes scripts,
          explanations and fixes; it never writes a number on this page.
        </p>
      </Drawer>

      {/* ----------------------------------------------- findings by severity */}
      <Drawer
        open={Boolean(severityFilter)}
        onClose={() => setSeverityFilter(null)}
        title={`${severityFilter} findings`}
        subtitle={`${findingsForDrawer.length} open`}
      >
        {findingsForDrawer.length === 0 ? (
          <EmptyState title={`No open ${severityFilter?.toLowerCase()} findings`} />
        ) : (
          <div className="space-y-2">
            {findingsForDrawer.map((finding) => (
              <div key={finding.id} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <Badge tone="neutral">{finding.processId}</Badge>
                  <Badge tone={finding.status === 'Open' ? 'danger' : 'neutral'}>{finding.status}</Badge>
                </div>
                <p className="mt-1.5 text-sm font-medium text-text">{finding.title}</p>
                <p className="mt-1 text-xs text-muted">{finding.plain}</p>
                <div className="mt-2">
                  <FindingRef id={finding.id} label={`Open ${finding.id}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* ------------------------------------------------------ trend day */}
      <Drawer
        open={Boolean(trendDay)}
        onClose={() => setTrendDay(null)}
        title={trendDay ? `Runs on ${trendDay.label}` : ''}
        subtitle={
          trendDay
            ? `Confidence ${trendDay.confidence}, pass rate ${trendDay.passRate} %, ${trendDay.openFindings} findings open that day`
            : ''
        }
      >
        {runsForDay.length === 0 ? (
          <EmptyState
            title="No runs recorded on that day"
            description="The trend line also moves when scenarios are approved or findings are closed."
          />
        ) : (
          <div className="space-y-2">
            {runsForDay.map((run) => (
              <div key={run.id} className={cn('rounded-lg border border-line p-3')}>
                <div className="flex flex-wrap items-center gap-2">
                  <RunRef id={run.id} label={run.id} />
                  <RunStatusBadge status={run.status} />
                  <VerdictBadge verdict={run.verdict} />
                </div>
                <p className="mt-1 text-xs text-text">{run.label}</p>
                <p className="mt-1 text-2xs text-muted">
                  {dateTime(run.startedAt)} · {run.stepResults.length} steps · {run.findingIds.length} findings
                  {run.processId ? ` · ${find.process(run.processId)?.name}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  )
}
