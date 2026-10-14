import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react'
import { ReportFrame, ReportSection, ReportTable, SignOffBlock } from './ReportFrame'
import { Badge, Button, Progress } from '@/components/ui/primitives'
import { HealthDot, SeverityBadge, VerdictBadge } from '@/components/common/badges'
import { useApi } from '@/lib/useApi'
import * as api from '@/lib/api'
import { dateMedium } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function ReleaseReport() {
  const { releaseId } = useParams()
  const navigate = useNavigate()
  const { data, loading } = useApi(() => api.getReleaseReport(releaseId ?? 'REL-2026-10'), [releaseId])

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-muted">Building the release report...</p>
      </div>
    )
  }

  const openTotal = data.findingsBySeverity.reduce((total, entry) => total + entry.count, 0)

  return (
    <ReportFrame
      docType="Release report"
      title={data.label}
      subtitle="One to two pages for the people who decide: the verdict, what is behind the score, the open risk and the recommendation."
      generatedAt={data.generatedAt}
      backTo="/release"
      backLabel="Back to release readiness"
      badges={
        <>
          <VerdictBadge verdict={data.gate.verdict} />
          <Badge tone="neutral" className="font-mono">
            {data.releaseId}
          </Badge>
          <Badge tone="primary">Gate score {data.gate.score} / 100</Badge>
          <Badge tone="neutral">Confidence {data.confidence.score} / 100</Badge>
        </>
      }
      meta={[
        { label: 'Period', value: data.periodLabel },
        { label: 'Close date', value: dateMedium(data.closeDate) },
        { label: 'Open findings', value: `${openTotal}` },
        { label: 'Close readiness', value: `${data.closeRisk.readinessPct} %` },
      ]}
    >
      <ReportSection title="1. Verdict" description="The gate rule is the same every time, so the decision is not a matter of opinion.">
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-4">
          <VerdictBadge verdict={data.gate.verdict} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text">{data.recommendation.headline}</p>
            <p className="mt-1 text-xs text-muted">{data.recommendation.detail}</p>
            {data.gate.cappedReason ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-accent">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {data.gate.cappedReason}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="label">Gate score</p>
            <p className="text-3xl font-semibold tabular-nums text-text">{data.gate.score}</p>
            <p className="text-2xs text-muted">GO 85+ · CONDITIONAL 60-84 · NO-GO below 60</p>
          </div>
        </div>
      </ReportSection>

      <ReportSection title="2. Score breakdown" description="Six weighted components, all computed from the run, interface, evidence and access data.">
        <div className="space-y-2">
          {data.gate.components.map((component) => (
            <div key={component.key} className="rounded-lg border border-line px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-text">{component.label}</span>
                <span className="text-2xs tabular-nums text-muted">
                  {component.score} / 100 · weight {component.weight} % · contributes{' '}
                  {Math.round((component.score * component.weight) / 100)} points
                </span>
              </div>
              <Progress
                className="mt-1.5"
                height="h-1.5"
                value={component.score}
                tone={component.score >= 85 ? 'success' : component.score >= 60 ? 'accent' : 'danger'}
              />
              <p className="mt-1 text-xs text-muted">{component.detail}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="3. Open findings by severity" description="Each finding has an owner, a cause and a recommended fix on its own card.">
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          {data.findingsBySeverity.map((entry) => (
            <div key={entry.severity} className="rounded-lg border border-line px-3 py-2">
              <p className="label">{entry.severity}</p>
              <p
                className={cn(
                  'text-2xl font-semibold tabular-nums',
                  entry.severity === 'Critical' && entry.count > 0
                    ? 'text-danger'
                    : entry.severity === 'High' && entry.count > 0
                      ? 'text-accent'
                      : 'text-text',
                )}
              >
                {entry.count}
              </p>
            </div>
          ))}
        </div>
        <ReportTable
          head={['Finding', 'Severity', 'Process', 'Owner', 'Business impact', '']}
          rows={data.findingsBySeverity
            .flatMap((entry) => entry.findings)
            .slice(0, 10)
            .map((finding) => [
              <span>
                <span className="mono font-semibold">{finding.id}</span>
                <span className="block text-2xs text-muted">{finding.title}</span>
              </span>,
              <SeverityBadge severity={finding.severity} />,
              finding.processId,
              finding.ownerRole ?? 'not assigned',
              <span className="text-2xs">{finding.impact}</span>,
              <Button
                variant="ghost"
                size="sm"
                className="no-print"
                onClick={() => navigate(`/finding/${finding.id}`)}
              >
                Open finding
              </Button>,
            ])}
        />
      </ReportSection>

      <ReportSection title="4. Processes tested" description="Close-critical processes first. Pass rate is steps that passed, healed or were blocked as expected.">
        <ReportTable
          head={['Process', 'Close critical', 'Scenarios', 'Pass rate', 'Automated', 'Open findings']}
          rows={[...data.processes]
            .sort((a, b) => Number(b.closeCritical) - Number(a.closeCritical))
            .map((process) => [
              <span className="flex items-center gap-1.5">
                <HealthDot
                  health={process.openFindings > 0 ? 'Attention' : process.passRate >= 90 ? 'Healthy' : 'Attention'}
                />
                <span>
                  <span className="mono font-semibold">{process.processId}</span> {process.name}
                </span>
              </span>,
              process.closeCritical ? 'yes' : 'no',
              <span className="mono">{process.scenarios}</span>,
              <span className="mono">{process.passRate} %</span>,
              <span className="mono">{process.automationPct} %</span>,
              <span className={cn('mono', process.openFindings > 0 && 'text-danger')}>{process.openFindings}</span>,
            ])}
        />
      </ReportSection>

      <ReportSection title="5. Risk before the month-end close" description="The freeze is the number the business feels.">
        <div className="flex flex-wrap items-end gap-6 rounded-lg border border-line p-4">
          <div>
            <p className="label">Freeze today</p>
            <p className="text-2xl font-semibold tabular-nums text-text">{data.closeRisk.freezeDays} days</p>
          </div>
          <TrendingDown className="mb-2 h-5 w-5 text-success" aria-hidden />
          <div>
            <p className="label">Projected at this readiness</p>
            <p className="text-2xl font-semibold tabular-nums text-success">{data.closeRisk.projectedFreezeDays} days</p>
          </div>
          <div>
            <p className="label">Target</p>
            <p className="text-2xl font-semibold tabular-nums text-text">{data.closeRisk.targetFreezeDays} days</p>
          </div>
          <div className="min-w-[12rem] flex-1">
            <p className="label">Close readiness</p>
            <Progress
              className="mt-1"
              value={data.closeRisk.readinessPct}
              tone={data.closeRisk.readinessPct >= 85 ? 'success' : 'accent'}
            />
            <p className="mt-1 text-2xs text-muted">{data.closeRisk.readinessPct} % ready</p>
          </div>
        </div>

        <div className="mt-3">
          <p className="label mb-1.5">Changes that are not safe before the close</p>
          {data.closeRisk.unsafeChanges.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Every change in the pipeline is safe before the close.
            </p>
          ) : (
            <ReportTable
              head={['Change', 'What it is', 'Why it is not safe']}
              rows={data.closeRisk.unsafeChanges.map((entry) => [
                <span className="mono font-semibold">{entry.ref}</span>,
                entry.title,
                <span className="text-2xs">{entry.reason}</span>,
              ])}
            />
          )}
        </div>
      </ReportSection>

      <ReportSection title="6. Recommendation" description="What we advise, and what has to happen first.">
        <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-4">
          <p className="text-sm font-semibold text-text">{data.recommendation.headline}</p>
          <p className="mt-1 text-xs text-text">{data.recommendation.detail}</p>
          <ul className="mt-2 space-y-1">
            {data.recommendation.actions.map((action) => (
              <li key={action} className="flex items-start gap-1.5 text-xs text-text">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      </ReportSection>

      <ReportSection title="7. Sign-off" description="The verdict stands once these three roles have signed.">
        <SignOffBlock roles={data.signOffRoles.map((entry) => ({ role: entry.role, purpose: entry.purpose }))} />
      </ReportSection>
    </ReportFrame>
  )
}
