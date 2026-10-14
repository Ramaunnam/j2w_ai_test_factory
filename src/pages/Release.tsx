import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Info, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Progress } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { ScoreGauge } from '@/components/common/tiles'
import { HealthBadge, HealthDot, SeverityBadge, VerdictBadge } from '@/components/common/badges'
import { ChangeRef, FindingRef, PageRef, ProcessRef } from '@/components/common/links'
import { useApi } from '@/lib/useApi'
import { openReleaseReport } from '@/lib/report-link'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { dateMedium } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { GateComponent } from '@/lib/types'

/** One release per close period in this POC. */
const RELEASE_ID = 'REL-2026-10'

export default function ReleasePage() {
  const navigate = useNavigate()
  const { data: gate } = useApi(() => api.getReleaseGate(), [])
  const { data: close } = useApi(() => api.getCloseReadiness(), [])
  const [openComponent, setOpenComponent] = useState<GateComponent | null>(null)

  if (!gate || !close) {
    return (
      <>
        <PageHeader title="Release & Close Readiness" description="Calculating the release gate." />
        <Card>
          <CardBody className="h-40 animate-pulse-soft" />
        </Card>
      </>
    )
  }

  const freezeSaving = close.freezeDays - close.projectedFreezeDays

  return (
    <>
      <PageHeader
        title="Release & Close Readiness"
        description="One gate score with a clear verdict, and the month-end view: how long the freeze needs to be, which close-critical processes are healthy, and whether the changes in the pipeline are safe before the close."
        requirements={['R3', 'R6']}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/evidence')}>
              Evidence and reports
            </Button>
            <Button
              variant="primary"
              size="sm"
              title="One to two pages for managers: verdict, score breakdown, open findings, risk before the close and the recommendation"
              onClick={() => openReleaseReport(RELEASE_ID, navigate)}
            >
              <FileText className="h-3.5 w-3.5" />
              Release report
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[auto_minmax(0,1fr)]">
        <Card className="xl:w-[22rem]">
          <CardHeader title="Release gate" description="Six weighted components, calculated by code." />
          <CardBody className="flex flex-col items-center gap-3">
            <ScoreGauge score={gate.score} verdict={gate.verdict} />
            <VerdictBadge verdict={gate.verdict} size="lg" />
            {gate.cappedReason ? (
              <p className="flex items-start gap-1.5 rounded-md bg-accent-soft px-2.5 py-2 text-xs text-accent">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {gate.cappedReason}
              </p>
            ) : null}
            <p className="text-2xs text-muted">
              GO needs 85 or more with no open critical finding. CONDITIONAL is 60 to 84, or any score with an open
              critical finding. Below 60 is NO-GO.
            </p>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="What makes up the score"
              description="Click a component to see what is behind it and open that page."
            />
            <CardBody className="space-y-2">
              {gate.components.map((component) => (
                <button
                  key={component.key}
                  type="button"
                  onClick={() => setOpenComponent(component)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-surface2/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text">{component.label}</span>
                    <span className="text-2xs tabular-nums text-muted">
                      {component.score} / 100 · weight {component.weight} %
                    </span>
                  </div>
                  <Progress
                    className="mt-1.5"
                    height="h-1.5"
                    value={component.score}
                    tone={component.score >= 85 ? 'success' : component.score >= 60 ? 'accent' : 'danger'}
                  />
                  <p className="mt-1 text-xs text-muted">{component.detail}</p>
                </button>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="What is holding the verdict back"
              description="Fix or formally accept these to move the verdict."
              actions={<Badge tone={gate.blockers.length > 0 ? 'danger' : 'success'}>{gate.blockers.length}</Badge>}
            />
            <CardBody className="space-y-1.5">
              {gate.blockers.length === 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Nothing is blocking a release.
                </p>
              ) : (
                gate.blockers.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <SeverityBadge severity={blocker.severity} />
                      <span className="min-w-0 truncate text-xs text-text">{blocker.label}</span>
                    </span>
                    {blocker.id === 'APPROVALS' ? (
                      <PageRef to="/approvals">Open the approval queue</PageRef>
                    ) : (
                      <FindingRef id={blocker.refId} label={`Open ${blocker.refId}`} />
                    )}
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Month-end freeze calendar"
            description={`Close on ${dateMedium(close.closeDate)}. The amber band is today's ten-day freeze, the green band is the target.`}
            actions={
              <div className="text-right">
                <p className="label">Readiness</p>
                <p className="text-sm font-semibold tabular-nums text-text">{close.readinessPct} %</p>
              </div>
            }
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {close.calendar.map((day) => (
                <div
                  key={day.date}
                  title={day.note ?? day.label}
                  className={cn(
                    'w-[4.4rem] rounded-md border px-2 py-1.5 text-center',
                    day.state === 'open' && 'border-line bg-surface',
                    day.state === 'today' && 'border-primary bg-primary-soft',
                    day.state === 'freeze-current' && 'border-accent/40 bg-accent-soft',
                    day.state === 'freeze-target' && 'border-success/50 bg-success-soft',
                    day.state === 'close' && 'border-primary bg-primary text-primary-fg',
                  )}
                >
                  <p className="text-xs font-semibold">{day.label}</p>
                  <p
                    className={cn(
                      'mt-0.5 text-[0.6rem] leading-tight',
                      day.state === 'close' ? 'text-primary-fg/80' : 'text-muted',
                    )}
                  >
                    {day.state === 'today'
                      ? 'today'
                      : day.state === 'freeze-target'
                        ? 'target freeze'
                        : day.state === 'freeze-current'
                          ? 'freeze now'
                          : day.state === 'close'
                            ? 'close'
                            : 'open'}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-6 rounded-lg border border-line p-3">
              <div>
                <p className="label">Freeze today</p>
                <p className="text-2xl font-semibold tabular-nums text-text">{close.freezeDays} days</p>
              </div>
              <TrendingDown className="mb-2 h-5 w-5 text-success" aria-hidden />
              <div>
                <p className="label">Projected with this test suite</p>
                <p className="text-2xl font-semibold tabular-nums text-success">{close.projectedFreezeDays} days</p>
              </div>
              <div>
                <p className="label">Target</p>
                <p className="text-2xl font-semibold tabular-nums text-text">{close.targetFreezeDays} days</p>
              </div>
              <p className="min-w-[14rem] flex-1 text-xs text-muted">
                {freezeSaving > 0
                  ? `At today's readiness the freeze can already be ${freezeSaving} days shorter. Closing the open critical findings and the approval queue takes it to the ${close.targetFreezeDays} day target.`
                  : 'The freeze cannot be shortened yet: close the open critical findings first.'}
              </p>
            </div>

            <div>
              <p className="label mb-1.5">Close-critical processes</p>
              <div className="space-y-1.5">
                {close.closeCriticalProcesses.map((entry) => (
                  <div
                    key={entry.process.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2"
                  >
                    <HealthDot health={entry.health} />
                    <span className="min-w-0 flex-1">
                      <ProcessRef id={entry.process.id} label={`${entry.process.id} ${entry.process.name}`} to="/run" />
                      <span className="mt-0.5 block text-2xs text-muted">
                        {entry.openFindings} open findings · {entry.process.manualHoursPerMonth} manual hours a month today
                      </span>
                    </span>
                    <span className="w-28">
                      <span className="flex items-center justify-between text-2xs text-muted">
                        pass <span className="font-semibold text-text">{entry.passRate} %</span>
                      </span>
                      <Progress
                        height="h-1"
                        value={entry.passRate}
                        tone={entry.passRate >= 90 ? 'success' : entry.passRate >= 70 ? 'accent' : 'danger'}
                      />
                    </span>
                    <HealthBadge health={entry.health} />
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Safe to change before the close?"
            description="Every change in the pipeline, judged against the freeze window and the close-critical processes."
          />
          <CardBody className="space-y-2">
            {close.changes.map((entry) => (
              <div
                key={entry.changeId}
                className={cn(
                  'rounded-lg border p-3',
                  entry.safe ? 'border-success/40 bg-success-soft/25' : 'border-danger/40 bg-danger-soft/25',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ChangeRef id={entry.changeId} />
                  <Badge tone={entry.safe ? 'success' : 'danger'}>{entry.safe ? 'Safe' : 'Not safe'}</Badge>
                </div>
                <p className="mt-1 text-xs text-text">{entry.change?.title}</p>
                <p className="mt-1 text-2xs text-muted">{entry.reason}</p>
                <p className="mt-1 text-2xs text-muted">Planned {dateMedium(entry.change?.plannedDate ?? '')}</p>
              </div>
            ))}
            <p className="flex items-start gap-1.5 pt-1 text-2xs text-muted">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              A change is only safe when its regression set has run clean and it does not touch a close-critical process
              inside the freeze window.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="How the verdict is built"
          description="The same rule every time, so the decision is not a matter of opinion."
          icon={<CalendarClock className="h-4 w-4 text-primary" />}
        />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-success/40 bg-success-soft/30 p-3">
            <VerdictBadge verdict="GO" />
            <p className="mt-2 text-xs text-text">
              Score 85 or more, no open critical finding, evidence signed off. Release and shorten the freeze.
            </p>
          </div>
          <div className="rounded-lg border border-accent/40 bg-accent-soft/30 p-3">
            <VerdictBadge verdict="CONDITIONAL" />
            <p className="mt-2 text-xs text-text">
              Score 60 to 84, or any score with an open critical finding. Release only with the findings accepted in
              writing and a fix date.
            </p>
          </div>
          <div className="rounded-lg border border-danger/40 bg-danger-soft/30 p-3">
            <VerdictBadge verdict="NO-GO" />
            <p className="mt-2 text-xs text-text">
              Score below 60, or a step failed without an explanation, or four or more open critical findings.
            </p>
          </div>
        </CardBody>
      </Card>

      <Drawer
        open={Boolean(openComponent)}
        onClose={() => setOpenComponent(null)}
        title={openComponent?.label ?? ''}
        subtitle={openComponent?.detail}
        badges={
          openComponent ? (
            <>
              <Badge tone="primary">{openComponent.score} / 100</Badge>
              <Badge tone="neutral">weight {openComponent.weight} %</Badge>
            </>
          ) : undefined
        }
        footer={
          openComponent ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                navigate(openComponent.route)
                setOpenComponent(null)
              }}
            >
              Open the page behind this number
            </Button>
          ) : undefined
        }
      >
        {openComponent ? (
          <div className="space-y-4">
            <Progress
              value={openComponent.score}
              tone={openComponent.score >= 85 ? 'success' : openComponent.score >= 60 ? 'accent' : 'danger'}
            />
            <p className="text-sm text-text">{openComponent.detail}</p>
            <p className="text-xs text-muted">
              This component contributes {Math.round((openComponent.score * openComponent.weight) / 100)} points of the{' '}
              {openComponent.weight} available. Every input is read from the run, interface, evidence and access data in
              this platform.
            </p>
            {openComponent.key === 'functional' ? (
              <div className="space-y-1.5">
                <p className="label">Recent runs</p>
                {db.runs.slice(0, 5).map((run) => (
                  <div key={run.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="mono text-text">{run.id}</span>
                    <span className="text-muted">{run.label}</span>
                    <VerdictBadge verdict={run.verdict} />
                  </div>
                ))}
              </div>
            ) : null}
            {openComponent.key === 'load' ? (
              <div className="space-y-1.5">
                <p className="label">Load profiles</p>
                {db.loadRuns.map((loadRun) => (
                  <div key={loadRun.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-text">{loadRun.profile}</span>
                    <span className="text-muted">
                      {loadRun.integrityChecks.filter((check) => !check.ok).length} integrity failures
                    </span>
                    <VerdictBadge verdict={loadRun.verdict} />
                  </div>
                ))}
              </div>
            ) : null}
            {openComponent.key === 'access' ? (
              <div className="space-y-1.5">
                <p className="label">Conflicts proven allowed</p>
                {db.sodConflicts
                  .filter((conflict) => conflict.proof?.outcome === 'Allowed')
                  .map((conflict) => (
                    <div key={conflict.id} className="text-xs text-text">
                      {find.user(conflict.userId)?.label} · {find.sodRule(conflict.ruleId)?.name}
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState title="Select a component" />
        )}
      </Drawer>
    </>
  )
}
