import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, FileText } from 'lucide-react'
import { ReportFrame, ReportSection, ReportTable, SignOffBlock } from './ReportFrame'
import { Badge, Button } from '@/components/ui/primitives'
import { ApprovalBadge, RunStatusBadge, SeverityBadge, VerdictBadge } from '@/components/common/badges'
import { useApi } from '@/lib/useApi'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { dateTime, dateTimeSec, durationShort } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function RunSummary() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const { data: report, loading } = useApi(() => api.getRunReport(runId ?? ''), [runId])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-muted">Building the run summary for {runId}...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <ReportFrame docType="Run summary" title="That run is not in this tab" generatedAt={new Date().toISOString()} backTo="/run">
        <p className="text-sm text-muted">
          No run with the id <span className="mono">{runId}</span> could be read here. A run started in another tab is
          saved to this browser, so reloading usually finds it; otherwise open it from the Run Centre in the same tab.
        </p>
        <div className="mt-4">
          <p className="label mb-1.5">Run summaries that are available</p>
          <ul className="space-y-1">
            {db.runs.slice(0, 8).map((run) => (
              <li key={run.id}>
                <a className="link text-sm" href={`/report/${run.id}`}>
                  <span className="mono">{run.id}</span> {run.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </ReportFrame>
    )
  }

  const { run, bundle, scenarios, evidence, findings, approvals, scenarioBundles } = report
  const stepTime = run.stepResults.reduce((total, result) => total + result.durationMs, 0)

  const counts = [
    ['Passed', run.passedSteps, 'text-success'],
    ['Healed', run.healedSteps, 'text-accent'],
    ['Blocked as expected', run.blockedSteps, 'text-info'],
    ['Failed', run.failedSteps, run.failedSteps > 0 ? 'text-danger' : 'text-text'],
  ] as const

  return (
    <ReportFrame
      docType="Run summary"
      title={run.label}
      subtitle={`${run.runType} run with ${run.stepResults.length} steps across ${scenarios.length} scenarios. Everything on this page links to the detail behind it.`}
      generatedAt={report.generatedAt}
      backTo="/run"
      backLabel="Back to the Run Centre"
      badges={
        <>
          <VerdictBadge verdict={report.verdict} />
          <RunStatusBadge status={run.status} />
          <Badge tone="neutral" className="font-mono">
            {run.id}
          </Badge>
          <Badge tone="primary">{run.environment}</Badge>
          {bundle ? <ApprovalBadge state={bundle.approvalState} /> : null}
        </>
      }
      meta={[
        { label: 'Process', value: run.processId ? `${run.processId} ${find.process(run.processId)?.name ?? ''}` : 'several' },
        { label: 'Date', value: dateTime(run.startedAt) },
        { label: 'Environment', value: run.environment },
        { label: 'Triggered by', value: `${run.triggeredByRole} role` },
      ]}
      actions={
        <Button variant="secondary" size="sm" onClick={() => navigate(`/evidence-pack/${run.id}`)}>
          <FileText className="h-3.5 w-3.5" />
          View full audit evidence
        </Button>
      }
    >
      <ReportSection title="Result" description="Step outcomes, findings and the time the steps took.">
        <div className="grid gap-2 sm:grid-cols-4">
          {counts.map(([label, value, tone]) => (
            <div key={label} className="rounded-lg border border-line px-3 py-2">
              <p className="label">{label}</p>
              <p className={cn('text-2xl font-semibold tabular-nums', tone)}>{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-line px-3 py-2">
            <p className="label">Steps</p>
            <p className="text-lg font-semibold tabular-nums text-text">{run.stepResults.length}</p>
          </div>
          <div className="rounded-lg border border-line px-3 py-2">
            <p className="label">Findings</p>
            <p className={cn('text-lg font-semibold tabular-nums', findings.length > 0 ? 'text-danger' : 'text-text')}>
              {findings.length}
            </p>
          </div>
          <div className="rounded-lg border border-line px-3 py-2">
            <p className="label">Evidence items</p>
            <p className="text-lg font-semibold tabular-nums text-text">{evidence.length}</p>
          </div>
          <div className="rounded-lg border border-line px-3 py-2">
            <p className="label">Step time</p>
            <p className="text-lg font-semibold tabular-nums text-text">{durationShort(stepTime)}</p>
          </div>
        </div>
      </ReportSection>

      <ReportSection
        title="Findings"
        description={
          findings.length > 0
            ? 'Each one opens as its own finding card with the business impact and the fix.'
            : 'This run found nothing.'
        }
      >
        {findings.length === 0 ? (
          <p className="rounded-lg border border-success/40 bg-success-soft/30 p-3 text-sm text-success">
            No findings: every step either passed, healed, or was blocked as expected.
          </p>
        ) : (
          <div className="space-y-2">
            {findings.map((finding) => (
              <div key={finding.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-line p-3">
                <AlertTriangle
                  className={cn('mt-0.5 h-4 w-4 shrink-0', finding.severity === 'Critical' ? 'text-danger' : 'text-accent')}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mono text-xs font-semibold text-text">{finding.id}</span>
                    <SeverityBadge severity={finding.severity} />
                    <Badge tone={finding.status === 'Open' ? 'danger' : 'neutral'}>{finding.status}</Badge>
                    {finding.ownerRole ? <Badge tone="neutral">Owner: {finding.ownerRole}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-text">{finding.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{finding.impact}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="no-print"
                  onClick={() => navigate(`/finding/${finding.id}`)}
                >
                  Open finding
                </Button>
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection title="Result per scenario" description="What each scenario did in this run.">
        <ReportTable
          head={['Scenario', 'Type', 'Steps', 'Passed', 'Healed', 'Blocked', 'Failed', 'Approval', 'Evidence bundle']}
          rows={scenarios.map((scenario) => {
            const results = run.stepResults.filter((result) => result.scenarioId === scenario.id)
            const bundleId = scenarioBundles.find((entry) => entry.scenarioId === scenario.id)?.bundleId ?? '-'
            return [
              <span>
                <span className="mono font-semibold">{scenario.code}</span>
                <span className="block text-2xs text-muted">{scenario.name}</span>
              </span>,
              scenario.type,
              <span className="mono">{results.length}</span>,
              <span className="mono text-success">{results.filter((r) => r.status === 'Passed').length}</span>,
              <span className="mono text-accent">{results.filter((r) => r.status === 'Healed').length}</span>,
              <span className="mono text-info">{results.filter((r) => r.status === 'Blocked as expected').length}</span>,
              <span className={cn('mono', results.some((r) => r.status === 'Failed') && 'text-danger')}>
                {results.filter((r) => r.status === 'Failed').length}
              </span>,
              scenario.approval,
              <span className="mono text-2xs">{bundleId}</span>,
            ]
          })}
        />
      </ReportSection>

      <ReportSection title="Approvals and sign-off" description="Who has signed what for this run.">
        <ReportTable
          head={['Item', 'Kind', 'Status', 'Decided by', 'When', 'Comment']}
          rows={[
            ...(bundle
              ? [
                  [
                    <span className="mono">{bundle.id}</span>,
                    'evidence bundle',
                    <ApprovalBadge state={bundle.approvalState} />,
                    bundle.approvedByRole ?? 'not signed off yet',
                    dateTimeSec(bundle.lockedAt),
                    <span className="mono break-all text-2xs">{bundle.hash}</span>,
                  ],
                ]
              : []),
            ...scenarios.map((scenario) => [
              <span className="mono">{scenario.code}</span>,
              'scenario',
              scenario.approval,
              scenario.approvedByRole ?? '-',
              '-',
              scenario.approvalComment ?? '-',
            ]),
            ...approvals.map((approval) => [
              <span className="mono">{approval.refId}</span>,
              approval.kind,
              approval.status,
              approval.decidedByRole ?? '-',
              approval.decidedAt ? dateTime(approval.decidedAt) : '-',
              approval.comment ?? '-',
            ]),
          ]}
        />
        <div className="mt-4">
          <SignOffBlock
            roles={[
              { role: 'Key User', purpose: 'Confirms the business result' },
              { role: 'QA Lead', purpose: 'Confirms the test result and the verdict' },
              { role: 'Auditor', purpose: 'Confirms the evidence is complete' },
            ]}
          />
        </div>
      </ReportSection>

      <p className="no-print rounded-lg border border-line bg-surface2/60 p-3 text-xs text-muted">
        This is the one-screen summary. Every screenshot, payload, query result and document, with hashes and the healed
        scripts, is in the{' '}
        <button type="button" className="link" onClick={() => navigate(`/evidence-pack/${run.id}`)}>
          audit evidence pack
        </button>
        .
      </p>
    </ReportFrame>
  )
}
