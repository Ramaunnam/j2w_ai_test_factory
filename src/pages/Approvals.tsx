import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, CheckSquare, FileText, Sparkles, Wrench, X } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, Chip, EmptyState, KeyValue, Progress, Textarea } from '@/components/ui/primitives'
import { Drawer, Modal } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import { DiffView } from '@/components/common/views'
import { StepCard } from '@/components/common/steps'
import { AiBadge, ApprovalBadge, ScenarioTypeBadge, VerdictBadge } from '@/components/common/badges'
import { PageRef, RequirementRef, RunRef, ScenarioRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi } from '@/lib/useApi'
import { useRole } from '@/lib/role'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { openRunSummary } from '@/lib/report-link'
import { dateTime, relativeTo } from '@/lib/format'
import { NOW_ISO } from '@/lib/clock'
import { cn } from '@/lib/utils'
import type { ApprovalKind, ApprovalRequest } from '@/lib/types'

const KIND_LABEL: Record<ApprovalKind, string> = {
  scenario: 'Scenario',
  'healed-script': 'Healed script',
  evidence: 'Evidence bundle',
}

export default function ApprovalsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { role } = useRole()

  const [params] = useSearchParams()
  const pendingOnly = params.get('status') === 'pending'
  const [kindFilter, setKindFilter] = useState<ApprovalKind | 'ALL'>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)
  const [decision, setDecision] = useState<{ id: string; mode: 'Approved' | 'Rejected' } | null>(null)
  const [comment, setComment] = useState('')

  const { data: approvals } = useApi(() => api.listApprovals(), [])

  const pending = useMemo(
    () =>
      (approvals ?? []).filter(
        (approval) => approval.status === 'Pending' && (kindFilter === 'ALL' || approval.kind === kindFilter),
      ),
    [approvals, kindFilter],
  )
  const decided = useMemo(() => (approvals ?? []).filter((approval) => approval.status !== 'Pending'), [approvals])

  const open = openId ? find.approval(openId) : undefined
  const openScenario = open?.kind === 'scenario' ? find.scenario(open.refId) : undefined
  const openHealing = open?.kind === 'healed-script' ? find.healing(open.refId) : undefined
  const openBundle = open?.kind === 'evidence' ? find.bundle(open.refId) : undefined
  const openBundleRun = openBundle ? find.run(openBundle.runId) : undefined

  useEffect(() => {
    if (open && open.status !== 'Pending') {
      // keep the drawer open but show the decision
    }
  }, [open])

  function decide(id: string, mode: 'Approved' | 'Rejected', text?: string) {
    void api.decideApproval(id, mode, role.name, text).then(() => {
      toast({
        title: mode === 'Approved' ? 'Approved' : 'Rejected',
        description:
          mode === 'Approved'
            ? 'The item is now part of the suite and the Command Centre numbers are updated.'
            : 'The item goes back to the AI with your comment.',
        tone: mode === 'Approved' ? 'success' : 'warning',
      })
    })
  }

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Nothing the AI writes becomes part of the suite until a key user approves it: generated scenarios, repaired scripts and locked evidence."
        requirements={['R1', 'R9']}
        actions={
          <>
            <Badge tone={role.canApprove ? 'success' : 'accent'} className="h-8 px-2.5">
              {role.canApprove ? `${role.name} can approve` : `${role.name} cannot approve`}
            </Badge>
            <Button variant="secondary" size="sm" onClick={() => navigate('/studio')}>
              <Sparkles className="h-3.5 w-3.5" />
              Test Studio
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'scenario', 'healed-script', 'evidence'] as const).map((value) => (
            <Chip key={value} active={kindFilter === value} onClick={() => setKindFilter(value)}>
              {value === 'ALL' ? 'Everything' : KIND_LABEL[value]}
            </Chip>
          ))}
          <Badge tone="accent" title="Generated scenarios, healed scripts and evidence bundles waiting for a key user">
            {pending.length} waiting
          </Badge>
          <Badge tone="neutral">{decided.length} decided</Badge>
          {pendingOnly ? <Badge tone="primary">showing the waiting queue</Badge> : null}
        </div>
      </PageHeader>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Waiting for you"
            description="Click an item to see exactly what changed before you decide."
            actions={
              pending.length > 0 && role.canApprove ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    pending.forEach((approval) => decide(approval.id, 'Approved', 'Bulk approved'))
                    toast({
                      title: `${pending.length} items approved`,
                      description: 'All items in this filter were approved.',
                      tone: 'success',
                    })
                  }}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Approve all shown
                </Button>
              ) : undefined
            }
          />
          <CardBody className="space-y-2">
            {pending.length === 0 ? (
              <EmptyState
                title="Nothing is waiting"
                description="Generated scenarios, repaired scripts and new evidence bundles arrive here."
                icon={<CheckSquare className="h-5 w-5" />}
              />
            ) : (
              pending.map((approval) => (
                <div key={approval.id} className="rounded-lg border border-line px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(approval.id)}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={approval.kind === 'scenario' ? 'primary' : approval.kind === 'healed-script' ? 'accent' : 'info'}>
                          {approval.kind === 'healed-script' ? (
                            <Wrench className="h-3 w-3" />
                          ) : approval.kind === 'evidence' ? (
                            <FileText className="h-3 w-3" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {KIND_LABEL[approval.kind]}
                        </Badge>
                        {approval.confidencePct ? (
                          <Badge tone={approval.confidencePct >= 90 ? 'success' : 'accent'}>
                            {approval.confidencePct} % confidence
                          </Badge>
                        ) : null}
                        {approval.processId ? <Badge tone="neutral">{approval.processId}</Badge> : null}
                        <span className="text-2xs text-muted">{relativeTo(approval.requestedAt, NOW_ISO)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-text">{approval.title}</p>
                      <p className="mt-1 text-xs text-muted">{approval.plain}</p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!role.canApprove}
                        title={role.canApprove ? 'Approve' : `The ${role.name} role cannot approve`}
                        onClick={() => decide(approval.id, 'Approved')}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!role.canApprove}
                        title="Reject with a comment"
                        onClick={() => {
                          setDecision({ id: approval.id, mode: 'Rejected' })
                          setComment('')
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {approval.confidencePct ? (
                    <Progress
                      className="mt-2"
                      height="h-1"
                      value={approval.confidencePct}
                      tone={approval.confidencePct >= 90 ? 'success' : 'accent'}
                    />
                  ) : null}
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Decided" description="Every decision keeps the role, the time and the comment." />
          <DataTable
            rows={decided}
            getRowId={(row) => row.id}
            dense
            searchText={(row) => `${row.title} ${row.refId} ${row.decidedByRole ?? ''} ${row.comment ?? ''}`}
            searchPlaceholder="Search decisions"
            onRowClick={(row) => setOpenId(row.id)}
            activeRowId={openId}
            filters={[
              {
                key: 'status',
                label: 'Decision',
                options: [
                  { value: 'Approved', label: 'Approved' },
                  { value: 'Rejected', label: 'Rejected' },
                ],
                match: (row, value) => row.status === value,
              },
              {
                key: 'kind',
                label: 'Kind',
                options: (['scenario', 'healed-script', 'evidence'] as ApprovalKind[]).map((value) => ({
                  value,
                  label: KIND_LABEL[value],
                })),
                match: (row, value) => row.kind === value,
              },
            ]}
            columns={[
              {
                key: 'title',
                header: 'Item',
                sortValue: (row) => row.title,
                render: (row: ApprovalRequest) => (
                  <span className="block">
                    <span className="text-xs font-medium text-text">{row.title}</span>
                    <span className="mt-0.5 block text-2xs text-muted">
                      {KIND_LABEL[row.kind]} · {row.refId}
                    </span>
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Decision',
                sortValue: (row) => row.status,
                render: (row) => (
                  <Badge tone={row.status === 'Approved' ? 'success' : 'danger'}>{row.status}</Badge>
                ),
              },
              {
                key: 'by',
                header: 'By',
                render: (row) => <span className="text-2xs text-muted">{row.decidedByRole ?? '-'}</span>,
                hideBelow: 'sm',
              },
              {
                key: 'when',
                header: 'When',
                align: 'right',
                sortValue: (row) => row.decidedAt ?? '',
                render: (row) => (
                  <span className="text-2xs text-muted">{row.decidedAt ? dateTime(row.decidedAt) : '-'}</span>
                ),
                hideBelow: 'md',
              },
            ]}
          />
        </Card>
      </div>

      {/* ------------------------------------------------------ item drawer */}
      <Drawer
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        width="w-full max-w-3xl"
        title={open?.title ?? ''}
        subtitle={open?.plain}
        badges={
          open ? (
            <>
              <Badge tone="primary">{KIND_LABEL[open.kind]}</Badge>
              <Badge tone={open.status === 'Pending' ? 'accent' : open.status === 'Approved' ? 'success' : 'danger'}>
                {open.status}
              </Badge>
              {open.confidencePct ? <Badge tone="ai">{open.confidencePct} % confidence</Badge> : null}
              {open.kind !== 'evidence' ? <AiBadge /> : null}
            </>
          ) : undefined
        }
        footer={
          open && open.status === 'Pending' ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!role.canApprove}
                  onClick={() => {
                    setDecision({ id: open.id, mode: 'Approved' })
                    setComment('')
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!role.canApprove}
                  onClick={() => {
                    setDecision({ id: open.id, mode: 'Rejected' })
                    setComment('')
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
              {open.kind === 'evidence' && openBundle ? (
                <Button variant="secondary" size="sm" onClick={() => openRunSummary(openBundle.runId, navigate)}>
                  <FileText className="h-3.5 w-3.5" />
                  Open run summary
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {open ? (
          <div className="space-y-5">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Requested', value: dateTime(open.requestedAt) },
                { label: 'For role', value: open.forRole },
                { label: 'Decided by', value: open.decidedByRole ?? 'nobody yet' },
                { label: 'Decided at', value: open.decidedAt ? dateTime(open.decidedAt) : '-' },
                {
                  label: 'Requirements',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {open.requirementIds.map((id) => (
                        <RequirementRef key={id} id={id} />
                      ))}
                    </span>
                  ),
                },
                { label: 'Comment', value: open.comment ?? '-' },
              ]}
            />

            <div>
              <p className="label mb-1">What the AI says</p>
              <p className="rounded-lg border border-ai/30 bg-ai-soft/40 p-3 text-sm text-text">{open.detail}</p>
            </div>

            {openScenario ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ScenarioRef id={openScenario.id} />
                  <ScenarioTypeBadge type={openScenario.type} />
                  <ApprovalBadge state={openScenario.approval} />
                </div>
                <p className="label">Steps in this scenario</p>
                <div className="space-y-2">
                  {openScenario.steps.map((step) => (
                    <StepCard key={step.id} step={step} compact showEvidence />
                  ))}
                </div>
              </div>
            ) : null}

            {openHealing ? (
              <div className="space-y-2">
                <p className="label">What the AI changed</p>
                <DiffView lines={openHealing.diffLines} before={openHealing.before} after={openHealing.after} />
                <p className="text-xs text-text">{openHealing.rationale}</p>
                <p className="text-2xs text-muted">
                  Re-run after the fix: {openHealing.reRunPassed ? 'passed' : 'did not pass'} ·{' '}
                  <ScenarioRef id={openHealing.scenarioId} label={openHealing.scenarioId} />
                </p>
              </div>
            ) : null}

            {openBundle ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RunRef id={openBundle.runId} />
                  <VerdictBadge verdict={openBundle.verdict} />
                  <Badge tone="neutral">
                    {Object.values(openBundle.itemCounts).reduce((a, b) => a + b, 0)} items
                  </Badge>
                </div>
                <p className="mono break-all text-2xs text-muted">{openBundle.hash}</p>
                <p className="text-xs text-text">
                  {openBundleRun?.label}: {openBundleRun?.passedSteps} passed, {openBundleRun?.healedSteps} healed,{' '}
                  {openBundleRun?.blockedSteps} blocked as expected, {openBundleRun?.failedSteps} failed.
                </p>
                <PageRef to={`/evidence?bundle=${openBundle.id}`}>Open the bundle in Evidence</PageRef>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.mode === 'Approved' ? 'Approve this item' : 'Reject this item'}
        subtitle={decision ? find.approval(decision.id)?.title : ''}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={decision?.mode === 'Approved' ? 'primary' : 'danger'}
              size="sm"
              onClick={() => {
                if (!decision) return
                decide(decision.id, decision.mode, comment)
                setDecision(null)
              }}
            >
              {decision?.mode === 'Approved' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Signing as the <span className="font-semibold text-text">{role.name}</span> role.
          </p>
          <Textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Comment (optional)"
          />
        </div>
      </Modal>

      <Card className={cn('mt-4', db.approvals.length === 0 && 'hidden')}>
        <CardHeader
          title="Who approves what"
          description="Approval is a business decision, so it sits with the key users, not with the vendor."
        />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs font-semibold text-text">Scenarios</p>
            <p className="mt-1 text-xs text-muted">
              A key user confirms the business rules are right before the scenario can run in the suite.
            </p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs font-semibold text-text">Healed scripts</p>
            <p className="mt-1 text-xs text-muted">
              Any AI repair below 90 % confidence always needs a human decision; above that it still needs one before the
              next release.
            </p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs font-semibold text-text">Evidence</p>
            <p className="mt-1 text-xs text-muted">
              Sign-off locks the bundle into the audit file with the role and the time.
            </p>
          </div>
        </CardBody>
      </Card>
    </>
  )
}
