import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Play, Sparkles, Wrench, X } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, KeyValue, Progress, Textarea } from '@/components/ui/primitives'
import { Drawer, Modal } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import { LiveLog } from '@/components/common/LiveLog'
import { DiffView } from '@/components/common/views'
import { StepCard } from '@/components/common/steps'
import { AiBadge, ApprovalBadge } from '@/components/common/badges'
import { ChangeRef, PageRef, ScenarioRef, SystemRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useRole } from '@/lib/role'
import * as api from '@/lib/api'
import { find } from '@/lib/db'
import { dateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { HealingEvent } from '@/lib/types'

export default function SelfHealingPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { role } = useRole()

  const [openId, setOpenId] = useState<string | null>(params.get('heal'))
  const [jobId, setJobId] = useState<string | null>(null)
  const [decision, setDecision] = useState<{ id: string; mode: 'approve' | 'reject' } | null>(null)
  const [comment, setComment] = useState('')

  const job = useJob<HealingEvent[]>(jobId)
  const { data: events } = useApi(() => api.listHealingEvents(), [])
  const { data: changes } = useApi(() => api.listChanges(), [])

  useEffect(() => {
    if (params.get('heal')) setOpenId(params.get('heal'))
  }, [params])

  useEffect(() => {
    if (job?.status === 'done') {
      toast({ title: 'Analysis finished', description: 'Any proposed repair is in the list.', tone: 'ai' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status])

  const open = openId ? find.healing(openId) : undefined
  const openScenario = open ? find.scenario(open.scenarioId) : undefined
  const openStep = openScenario?.steps.find((step) => step.id === open?.stepId)

  const pending = (events ?? []).filter((event) => event.status === 'Pending approval')
  const approved = (events ?? []).filter((event) => event.status === 'Approved')

  return (
    <>
      <PageHeader
        title="Self-Healing"
        description="When a screen, a schema or an API changes, the AI repairs the affected scripts and shows exactly what it changed, with a confidence percentage. A key user approves before the fix becomes part of the suite."
        requirements={['R9']}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/regression')}>
              Change feed
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/approvals')}>
              Approval queue
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="card px-3 py-2">
          <p className="label">Repairs this month</p>
          <p className="text-xl font-semibold tabular-nums text-text">{events?.length ?? 0}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/approvals')}
          className="card px-3 py-2 text-left transition-colors hover:bg-surface2/60"
          title="Open the approval queue"
        >
          <p className="label">Waiting for approval</p>
          <p className="text-xl font-semibold tabular-nums text-accent">{pending.length}</p>
          <p className="text-2xs text-muted">open the queue</p>
        </button>
        <div className="card px-3 py-2">
          <p className="label">Approved and re-run</p>
          <p className="text-xl font-semibold tabular-nums text-success">{approved.length}</p>
        </div>
        <div className="card px-3 py-2">
          <p className="label">Average confidence</p>
          <p className="text-xl font-semibold tabular-nums text-text">
            {events && events.length > 0
              ? Math.round(events.reduce((total, event) => total + event.confidencePct, 0) / events.length)
              : 0}{' '}
            %
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Change feed and the scripts it touched"
            description="Click a repair to see the before and after diff."
          />
          <DataTable
            rows={events ?? []}
            getRowId={(row) => row.id}
            searchText={(row) => `${row.summary} ${row.scenarioId} ${row.changeKind} ${row.before} ${row.after}`}
            searchPlaceholder="Search repairs"
            onRowClick={(row) => {
              setOpenId(row.id)
              setParams({ heal: row.id })
            }}
            activeRowId={openId}
            initialSort={{ key: 'detected', dir: 'desc' }}
            rowTone={(row) => (row.status === 'Pending approval' ? 'accent' : row.status === 'Rejected' ? 'danger' : undefined)}
            filters={[
              {
                key: 'kind',
                label: 'Change kind',
                options: [
                  { value: 'UI', label: 'UI change' },
                  { value: 'Schema', label: 'Schema change' },
                  { value: 'API', label: 'API change' },
                ],
                match: (row, value) => row.changeKind === value,
              },
              {
                key: 'status',
                label: 'Status',
                options: [
                  { value: 'Pending approval', label: 'Pending approval' },
                  { value: 'Approved', label: 'Approved' },
                  { value: 'Rejected', label: 'Rejected' },
                ],
                match: (row, value) => row.status === value,
              },
            ]}
            columns={[
              {
                key: 'summary',
                header: 'Repair',
                sortValue: (row) => row.summary,
                render: (row) => (
                  <span className="block">
                    <span className="text-sm font-medium text-text">{row.summary}</span>
                    <span className="mt-0.5 block text-2xs text-muted">
                      {row.scenarioId} · step {row.stepId.split('-').pop()}
                    </span>
                  </span>
                ),
              },
              {
                key: 'kind',
                header: 'Change',
                sortValue: (row) => row.changeKind,
                render: (row) => (
                  <Badge tone={row.changeKind === 'UI' ? 'primary' : row.changeKind === 'API' ? 'info' : 'ai'}>
                    {row.changeKind}
                  </Badge>
                ),
              },
              {
                key: 'confidence',
                header: 'Confidence',
                align: 'right',
                sortValue: (row) => row.confidencePct,
                render: (row) => (
                  <span className="inline-flex w-20 flex-col items-end">
                    <span
                      className={cn(
                        'mono text-xs font-semibold',
                        row.confidencePct >= 90 ? 'text-success' : row.confidencePct >= 80 ? 'text-accent' : 'text-danger',
                      )}
                    >
                      {row.confidencePct} %
                    </span>
                    <Progress
                      value={row.confidencePct}
                      height="h-1"
                      tone={row.confidencePct >= 90 ? 'success' : row.confidencePct >= 80 ? 'accent' : 'danger'}
                    />
                  </span>
                ),
              },
              {
                key: 'rerun',
                header: 'Re-run',
                render: (row) =>
                  row.reRunPassed ? <Badge tone="success">passed</Badge> : <Badge tone="danger">not passed</Badge>,
                hideBelow: 'sm',
              },
              {
                key: 'status',
                header: 'Approval',
                sortValue: (row) => row.status,
                render: (row) => <ApprovalBadge state={row.status} />,
              },
              {
                key: 'detected',
                header: 'Detected',
                align: 'right',
                sortValue: (row) => row.detectedAt,
                render: (row) => <span className="text-2xs text-muted">{dateTime(row.detectedAt)}</span>,
                hideBelow: 'md',
              },
            ]}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Run the AI over a change"
              description="Pick a change from the feed and let the AI replay the affected steps."
              icon={<Sparkles className="h-4 w-4 text-ai" />}
            />
            <CardBody className="space-y-2">
              {(changes ?? []).map((change) => (
                <div key={change.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2">
                  <span className="min-w-0">
                    <ChangeRef id={change.id} />
                    <span className="mt-0.5 block text-2xs text-muted">
                      {change.kind} · {change.healingEventIds.length} repairs
                    </span>
                  </span>
                  <Button
                    variant="ai"
                    size="sm"
                    onClick={() => {
                      setJobId(api.runHealing(change.id))
                      toast({ title: 'AI is analysing the change', description: change.ref, tone: 'ai' })
                    }}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Analyse
                  </Button>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Healing log" />
            <CardBody>
              <LiveLog
                lines={job?.log ?? []}
                status={job?.status}
                progressPct={job?.progressPct}
                currentLabel={job?.currentLabel}
                height="h-56"
                emptyHint="Press Analyse on a change to watch the AI repair the scripts."
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* --------------------------------------------------------- diff drawer */}
      <Drawer
        open={Boolean(open)}
        onClose={() => {
          setOpenId(null)
          setParams({})
        }}
        width="w-full max-w-3xl"
        title={open?.summary ?? ''}
        subtitle={open ? `${open.changeKind} change detected ${dateTime(open.detectedAt)}` : ''}
        badges={
          open ? (
            <>
              <ApprovalBadge state={open.status} />
              <Badge tone={open.confidencePct >= 90 ? 'success' : 'accent'}>{open.confidencePct} % confidence</Badge>
              {open.reRunPassed ? <Badge tone="success">re-run passed</Badge> : <Badge tone="danger">re-run not passed</Badge>}
              <AiBadge label="AI fix" />
            </>
          ) : undefined
        }
        footer={
          open ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={open.status === 'Approved'}
                  onClick={() => {
                    setDecision({ id: open.id, mode: 'approve' })
                    setComment('')
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve fix
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={open.status === 'Rejected'}
                  onClick={() => {
                    setDecision({ id: open.id, mode: 'reject' })
                    setComment('')
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  if (!openScenario) return
                  navigate('/run')
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Re-run the scenario
              </Button>
            </div>
          ) : undefined
        }
      >
        {open ? (
          <div className="space-y-5">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Scenario', value: <ScenarioRef id={open.scenarioId} /> },
                { label: 'Step', value: openStep ? `${openStep.order}. ${openStep.title}` : open.stepId },
                {
                  label: 'Change',
                  value: open.changeItemId ? <ChangeRef id={open.changeItemId} /> : 'detected during a run',
                },
                {
                  label: 'System',
                  value: openStep?.systemId ? <SystemRef id={openStep.systemId} compact /> : '-',
                },
                { label: 'Confidence', value: `${open.confidencePct} %` },
                { label: 'Approved by', value: open.approvedByRole ?? 'nobody yet' },
              ]}
            />

            <div>
              <p className="label mb-1.5">What changed and what the AI did</p>
              <DiffView lines={open.diffLines} before={open.before} after={open.after} />
            </div>

            <div>
              <p className="label mb-1 flex items-center gap-1.5">
                Why the AI is confident <AiBadge label="rationale" />
              </p>
              <p className="rounded-lg border border-ai/30 bg-ai-soft/40 p-3 text-sm text-text">{open.rationale}</p>
            </div>

            {openStep ? (
              <div>
                <p className="label mb-1.5">The step as it stands now</p>
                <StepCard step={openStep} defaultTechnical showEvidence />
              </div>
            ) : null}

            <p className="text-2xs text-muted">
              Approving a fix updates the script and the self-healing component of the confidence score.{' '}
              <PageRef to="/">See the Command Centre</PageRef>
            </p>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.mode === 'approve' ? 'Approve the AI fix' : 'Reject the AI fix'}
        subtitle={decision ? find.healing(decision.id)?.summary : ''}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={decision?.mode === 'approve' ? 'primary' : 'danger'}
              size="sm"
              onClick={() => {
                if (!decision) return
                const action =
                  decision.mode === 'approve'
                    ? api.approveHealing(decision.id, role.name, comment)
                    : api.rejectHealing(decision.id, role.name, comment)
                void action.then(() => {
                  toast({
                    title: decision.mode === 'approve' ? 'Fix approved' : 'Fix rejected',
                    description:
                      decision.mode === 'approve'
                        ? 'The repaired script is part of the suite.'
                        : 'The script stays as it was and goes back to the AI.',
                    tone: decision.mode === 'approve' ? 'success' : 'warning',
                  })
                })
                setDecision(null)
              }}
            >
              {decision?.mode === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Signing as the <span className="font-semibold text-text">{role.name}</span> role. The decision is recorded on
            the repair and in the approval queue.
          </p>
          <Textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Comment (optional)"
          />
        </div>
      </Modal>

      {(events ?? []).length === 0 ? (
        <Card className="mt-4">
          <CardBody>
            <EmptyState title="No repairs yet" icon={<Wrench className="h-5 w-5" />} />
          </CardBody>
        </Card>
      ) : null}
    </>
  )
}
