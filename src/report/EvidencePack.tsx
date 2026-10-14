import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, FileText, Lock } from 'lucide-react'
import { ReportFrame, ReportSection, ReportTable, SignOffBlock } from './ReportFrame'
import { Badge, Button } from '@/components/ui/primitives'
import { MockDocument, MockScreenshot, PayloadView, RowsTable } from '@/components/common/evidence'
import { DiffView } from '@/components/common/views'
import { ApprovalBadge, SeverityBadge, StepStatusBadge, VerdictBadge } from '@/components/common/badges'
import { useApi } from '@/lib/useApi'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { requirementsForStep } from '@/lib/score'
import { dateTime, dateTimeSec, durationShort, ms } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EvidenceItem, Scenario, StepResult } from '@/lib/types'

/** One preview per kind, the rest listed as references, so nothing is shown twice. */
function dedupe(items: EvidenceItem[]): { primary: EvidenceItem[]; references: EvidenceItem[] } {
  const seen = new Set<string>()
  const primary: EvidenceItem[] = []
  const references: EvidenceItem[] = []
  for (const item of items) {
    if (seen.has(item.kind)) {
      references.push(item)
      continue
    }
    seen.add(item.kind)
    primary.push(item)
  }
  return { primary, references }
}

export default function EvidencePack() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const { data: report, loading } = useApi(() => api.getRunReport(runId ?? ''), [runId])
  const [openScenarios, setOpenScenarios] = useState<Record<string, boolean>>({})
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({})

  const bundleId = report?.bundle?.id ?? `EVB-${(runId ?? '').replace('RUN-', '')}`

  /** Step logs mention a bundle; make it the bundle of this run. */
  const normaliseLog = useMemo(
    () => (line: string) => line.replace(/EVB-[0-9]+(-[0-9]+)?/g, bundleId),
    [bundleId],
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-muted">Building the audit evidence pack for {runId}...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <ReportFrame
        docType="Audit evidence pack"
        title="That run is not in this tab"
        generatedAt={new Date().toISOString()}
        backTo="/evidence"
      >
        <p className="text-sm text-muted">
          No run with the id <span className="mono">{runId}</span> could be read here. Open it from Evidence & Reports or
          from the run summary in the same tab.
        </p>
        <div className="mt-4">
          <p className="label mb-1.5">Packs that are available</p>
          <ul className="space-y-1">
            {db.runs.slice(0, 8).map((run) => (
              <li key={run.id}>
                <a className="link text-sm" href={`/evidence-pack/${run.id}`}>
                  <span className="mono">{run.id}</span> {run.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </ReportFrame>
    )
  }

  const { run, bundle, scenarios, evidence, findings, perRequirement, healing, healingDates, approvals, scenarioBundles } =
    report
  const stepTime = run.stepResults.reduce((total, result) => total + result.durationMs, 0)

  const allScenarioOpen = scenarios.every((scenario) => openScenarios[scenario.id])

  const setAll = (open: boolean) => {
    const nextScenarios: Record<string, boolean> = {}
    const nextSteps: Record<string, boolean> = {}
    for (const scenario of scenarios) {
      nextScenarios[scenario.id] = open
      for (const step of scenario.steps) nextSteps[`${scenario.id}:${step.id}`] = open
    }
    setOpenScenarios(nextScenarios)
    setOpenSteps(nextSteps)
  }

  const resultsFor = (scenario: Scenario): StepResult[] =>
    run.stepResults.filter((result) => result.scenarioId === scenario.id)

  return (
    <ReportFrame
      docType="Audit evidence pack"
      title={`${run.label} - full evidence`}
      subtitle="Every step with its assertions, its captured evidence and its hash, the scripts the AI repaired, and the approvals. Collapsed for reading, printed in full."
      generatedAt={report.generatedAt}
      width="max-w-5xl"
      backTo="/evidence"
      backLabel="Back to Evidence & Reports"
      badges={
        <>
          <VerdictBadge verdict={report.verdict} />
          <Badge tone="neutral" className="font-mono">
            {run.id}
          </Badge>
          <Badge tone="neutral" className="font-mono">
            {bundleId}
          </Badge>
          {bundle ? <ApprovalBadge state={bundle.approvalState} /> : null}
          <Badge tone="success">
            <Lock className="h-3 w-3" />
            {evidence.length} items locked
          </Badge>
        </>
      }
      meta={[
        { label: 'Process', value: run.processId ? `${run.processId} ${find.process(run.processId)?.name ?? ''}` : 'several' },
        { label: 'Date', value: dateTimeSec(run.startedAt) },
        { label: 'Environment', value: run.environment },
        { label: 'Step time', value: durationShort(stepTime) },
      ]}
      actions={
        <Button variant="secondary" size="sm" onClick={() => navigate(`/report/${run.id}`)}>
          <FileText className="h-3.5 w-3.5" />
          Open run summary
        </Button>
      }
    >
      <ReportSection title="1. Bundle and hashes" description="One bundle for the run, one sub-bundle per scenario, all derived from the run id.">
        <ReportTable
          head={['Bundle', 'Covers', 'Items', 'Locked at', 'Hash']}
          rows={[
            [
              <span className="mono font-semibold">{bundleId}</span>,
              `the whole run (${scenarios.length} scenarios)`,
              <span className="mono">{evidence.length}</span>,
              bundle ? dateTimeSec(bundle.lockedAt) : dateTimeSec(run.finishedAt ?? run.startedAt),
              <span className="mono break-all text-2xs">{bundle?.hash ?? 'not locked'}</span>,
            ],
            ...scenarioBundles.map((entry) => {
              const scenario = scenarios.find((item) => item.id === entry.scenarioId)
              const items = evidence.filter((item) => item.scenarioId === entry.scenarioId)
              return [
                <span className="mono">{entry.bundleId}</span>,
                `${scenario?.code ?? entry.scenarioId} ${scenario?.name ?? ''}`,
                <span className="mono">{items.length}</span>,
                items[0] ? dateTimeSec(items[0].capturedAt) : '-',
                <span className="mono break-all text-2xs">{items[0]?.hash ?? '-'}</span>,
              ]
            }),
          ]}
        />
      </ReportSection>

      <ReportSection
        title="2. Result per requirement"
        description="A step counts only against the requirement it tests: a cross-system data check counts against R5, a document check against R3, a repaired step against R9."
      >
        <ReportTable
          head={['Requirement', 'Title', 'Steps', 'Passed', 'Failed']}
          rows={perRequirement.map((entry) => [
            <Badge tone="primary">{entry.requirementId}</Badge>,
            entry.title,
            <span className="mono">{entry.steps}</span>,
            <span className="mono text-success">{entry.passed}</span>,
            <span className={cn('mono', entry.failed > 0 && 'text-danger')}>{entry.failed}</span>,
          ])}
        />
      </ReportSection>

      {findings.length > 0 ? (
        <ReportSection title="3. Findings" description="Each finding also has its own one-screen card.">
          <div className="space-y-3">
            {findings.map((finding) => (
              <div key={finding.id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-xs font-semibold text-text">{finding.id}</span>
                  <SeverityBadge severity={finding.severity} />
                  <Badge tone="neutral">{finding.status}</Badge>
                  {finding.defectRef ? <Badge tone="primary">{finding.defectRef}</Badge> : null}
                  <Badge tone="neutral">Owner: {finding.ownerRole ?? 'not assigned'}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="no-print ml-auto"
                    onClick={() => navigate(`/finding/${finding.id}`)}
                  >
                    Open finding
                  </Button>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-text">{finding.title}</h3>
                <p className="mt-1 text-xs text-text">{finding.plain}</p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div>
                    <dt className="label">Business impact</dt>
                    <dd className="text-text">{finding.impact}</dd>
                  </div>
                  <div>
                    <dt className="label">Cause</dt>
                    <dd className="text-text">{finding.cause}</dd>
                  </div>
                  <div>
                    <dt className="label">Explanation</dt>
                    <dd className="text-text">{finding.aiExplanation}</dd>
                  </div>
                  <div>
                    <dt className="label">Recommended fix</dt>
                    <dd className="text-text">{finding.recommendedFix}</dd>
                  </div>
                </dl>
                {finding.rows ? (
                  <div className="mt-2">
                    <RowsTable spec={finding.rows} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </ReportSection>
      ) : null}

      <ReportSection
        title={`${findings.length > 0 ? '4' : '3'}. Step by step with evidence`}
        description="Every scenario and every step, each evidence item shown once."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAll(true)}>
              Expand all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
              Collapse all
            </Button>
          </>
        }
      >
        <p className="no-print mb-2 text-2xs text-muted">
          {allScenarioOpen ? 'All scenarios are expanded.' : 'Click a scenario to expand it. Printing always includes everything.'}
        </p>
        <div className="space-y-3">
          {scenarios.map((scenario) => {
            const results = resultsFor(scenario)
            const scenarioOpen = openScenarios[scenario.id] ?? false
            const scenarioBundleId = scenarioBundles.find((entry) => entry.scenarioId === scenario.id)?.bundleId
            return (
              <div key={scenario.id} className="print-page rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => setOpenScenarios((prev) => ({ ...prev, [scenario.id]: !scenarioOpen }))}
                  className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface2/60"
                >
                  {scenarioOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-text">
                      <span className="mono">{scenario.code}</span> {scenario.name}
                    </span>
                    <span className="mt-0.5 block text-2xs text-muted">
                      {scenario.type} · {results.length} steps · {results.filter((r) => r.status === 'Failed').length}{' '}
                      failed · approved by {scenario.approvedByRole ?? 'nobody'} · bundle{' '}
                      <span className="mono">{scenarioBundleId}</span>
                    </span>
                  </span>
                  <Badge tone="neutral">{scenario.steps.length} steps</Badge>
                </button>

                <div className={cn('space-y-2 border-t border-line p-3', !scenarioOpen && 'hidden print:block')}>
                  {results.map((result) => {
                    const step = scenario.steps.find((item) => item.id === result.stepId)
                    if (!step) return null
                    const key = `${scenario.id}:${step.id}`
                    const stepOpen = openSteps[key] ?? false
                    const items = evidence.filter((item) => item.stepId === step.id)
                    const { primary, references } = dedupe(items)
                    const stepRequirements = requirementsForStep(step, scenario, result.status === 'Healed')
                    return (
                      <div key={step.id} className="rounded-lg border border-line">
                        <button
                          type="button"
                          onClick={() => setOpenSteps((prev) => ({ ...prev, [key]: !stepOpen }))}
                          className="flex w-full flex-wrap items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-surface2/60"
                        >
                          {stepOpen ? (
                            <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-text">
                              {step.order}. {step.title}
                            </span>
                            <span className="mt-0.5 block text-2xs text-muted">{step.plain}</span>
                          </span>
                          <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                            {stepRequirements.map((requirementId) => (
                              <Badge key={requirementId} tone="primary">
                                {requirementId}
                              </Badge>
                            ))}
                            <Badge tone="neutral">{step.kind.replace('_', ' ')}</Badge>
                            <StepStatusBadge status={result.status} />
                          </span>
                        </button>

                        <div className={cn('space-y-3 border-t border-line p-3', !stepOpen && 'hidden print:block')}>
                          <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                            <div>
                              <dt className="label">Expected</dt>
                              <dd className="text-text">{step.expected}</dd>
                            </div>
                            <div>
                              <dt className="label">Duration</dt>
                              <dd className="mono text-text">{ms(result.durationMs)}</dd>
                            </div>
                            {step.technical.screen || step.technical.transaction ? (
                              <div>
                                <dt className="label">Screen</dt>
                                <dd className="text-text">
                                  {step.technical.screen}
                                  {step.technical.transaction ? ` (${step.technical.transaction})` : ''}
                                </dd>
                              </div>
                            ) : null}
                            {step.technical.api ? (
                              <div>
                                <dt className="label">API</dt>
                                <dd className="mono break-all text-text">
                                  {step.technical.api.method} {step.technical.api.url}
                                </dd>
                              </div>
                            ) : null}
                          </dl>

                          <div>
                            <p className="label mb-1">Assertions</p>
                            <ul className="space-y-0.5 text-xs">
                              {step.technical.assertions.map((assertion, index) => (
                                <li key={index} className="text-text">
                                  {assertion.plain} <code className="mono text-muted">{assertion.expr}</code>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {step.technical.query ? (
                            <div>
                              <p className="label mb-1">
                                {step.technical.query.language} query · {step.technical.query.source}
                              </p>
                              <pre className="scroll-thin overflow-auto rounded-md border border-line bg-surface2/60 px-2.5 py-2 font-mono text-[0.7rem] leading-relaxed text-text">
                                {step.technical.query.text}
                              </pre>
                            </div>
                          ) : null}

                          {primary.length > 0 ? (
                            <div className="space-y-3">
                              <p className="label">Evidence</p>
                              {primary.map((item) => (
                                <div key={item.id}>
                                  <p className="mb-1 text-2xs text-muted">
                                    {item.title} · {item.kind.replace('-', ' ')} · {dateTimeSec(item.capturedAt)} ·{' '}
                                    <span className="mono break-all">{item.hash}</span>
                                  </p>
                                  {item.screenshot ? <MockScreenshot spec={item.screenshot} /> : null}
                                  {item.rows ? <RowsTable spec={item.rows} /> : null}
                                  {item.document ? <MockDocument spec={item.document} /> : null}
                                  {item.payload ? <PayloadView payload={item.payload} /> : null}
                                </div>
                              ))}
                              {references.length > 0 ? (
                                <div>
                                  <p className="label mb-1">Also captured at this step, same content</p>
                                  <ul className="space-y-0.5">
                                    {references.map((item) => (
                                      <li key={item.id} className="text-2xs text-muted">
                                        {item.title} · <span className="mono break-all">{item.hash}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {result.logLines.length > 0 ? (
                            <div>
                              <p className="label mb-1">Step log</p>
                              <pre className="scroll-thin overflow-auto rounded-md border border-line bg-surface2/60 px-2.5 py-2 font-mono text-[0.7rem] leading-relaxed text-muted">
                                {result.logLines.map(normaliseLog).join('\n')}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </ReportSection>

      {healing.length > 0 ? (
        <ReportSection
          title={`${findings.length > 0 ? '5' : '4'}. Scripts the AI repaired`}
          description="Each repair is dated before or during this run, with the confidence and the approver."
        >
          <div className="space-y-4">
            {healing.map((event) => {
              const dates = healingDates.find((entry) => entry.id === event.id)
              return (
                <div key={event.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text">{event.summary}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge tone="ai">{event.confidencePct} % confidence</Badge>
                      <Badge tone={event.status === 'Approved' ? 'success' : 'accent'}>{event.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {event.changeKind} change · detected {dateTime(dates?.shownAt ?? event.detectedAt)}
                    {dates?.duringRun ? ' (during this run)' : ' (before this run)'} · scenario {event.scenarioId} step{' '}
                    {event.stepId} · approved by {event.approvedByRole ?? 'nobody yet'}
                  </p>
                  <div className="mt-2">
                    <DiffView lines={event.diffLines} before={event.before} after={event.after} />
                  </div>
                  <p className="mt-2 text-xs text-text">{event.rationale}</p>
                </div>
              )
            })}
          </div>
        </ReportSection>
      ) : null}

      <ReportSection
        title={`${findings.length > 0 ? (healing.length > 0 ? '6' : '5') : healing.length > 0 ? '5' : '4'}. Approvals`}
        description="Who approved what, and when."
      >
        <ReportTable
          head={['Item', 'Kind', 'Status', 'Decided by', 'When', 'Comment']}
          rows={[
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
      </ReportSection>

      <ReportSection title="Sign-off" description="This pack is produced from locked evidence. Signatures confirm the verdict.">
        <SignOffBlock
          roles={[
            { role: 'Key User', purpose: 'Confirms the business result' },
            { role: 'QA Lead', purpose: 'Confirms the test result and the verdict' },
            { role: 'Auditor', purpose: 'Confirms the evidence is complete' },
          ]}
        />
        <p className="mt-4 text-xs text-muted">
          Verdict rule: GO means every step passed and the evidence is complete. CONDITIONAL means findings exist and are
          explained. NO-GO means a step failed without an explanation. An open critical finding can never be better than
          CONDITIONAL.
        </p>
      </ReportSection>
    </ReportFrame>
  )
}
