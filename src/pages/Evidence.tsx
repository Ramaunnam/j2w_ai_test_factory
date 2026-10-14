import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Check, FileText, Lock, Table2, Webhook } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, KeyValue, Textarea } from '@/components/ui/primitives'
import { Drawer, Modal } from '@/components/ui/overlays'
import { Tabs } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/table'
import { EvidenceCard } from '@/components/common/evidence'
import { ApprovalBadge, RunStatusBadge, VerdictBadge } from '@/components/common/badges'
import { ProcessPicker, SelectionSummary } from '@/components/common/selectors'
import { PageRef, RequirementRef, RunRef, ScenarioRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import { useRole } from '@/lib/role'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { openEvidencePack, openRunSummary } from '@/lib/report-link'
import { dateTime, dateTimeSec, num } from '@/lib/format'
import type { EvidenceBundle, EvidenceItem, EvidenceKind } from '@/lib/types'

const KIND_ICON: Record<EvidenceKind, typeof Camera> = {
  screenshot: Camera,
  payload: Webhook,
  'query-result': Table2,
  document: FileText,
  log: FileText,
}

export default function EvidencePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { role } = useRole()
  const { selection, patch } = useSelection()

  const [tab, setTab] = useState<'bundles' | 'items'>('bundles')
  const [openBundleId, setOpenBundleId] = useState<string | null>(params.get('bundle'))
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [approving, setApproving] = useState<EvidenceBundle | null>(null)
  const [comment, setComment] = useState('')

  const { data: bundles } = useApi(() => api.listEvidenceBundles(), [])
  const { data: items } = useApi(() => api.listEvidence({ processId: selection.processId }), [selection.processId])

  useEffect(() => {
    if (params.get('bundle')) setOpenBundleId(params.get('bundle'))
    const runParam = params.get('run')
    if (runParam) {
      const bundle = db.bundles.find((item) => item.runId === runParam)
      if (bundle) setOpenBundleId(bundle.id)
    }
  }, [params])

  const openBundle = openBundleId ? find.bundle(openBundleId) : undefined
  const openBundleRun = openBundle ? find.run(openBundle.runId) : undefined
  const openBundleItems = openBundle ? db.evidence.filter((item) => item.runId === openBundle.runId) : []
  const openItem = openItemId ? find.evidence(openItemId) : undefined

  const shownBundles = (bundles ?? []).filter((bundle) => {
    if (selection.processId === 'ALL') return true
    return find.run(bundle.runId)?.processId === selection.processId
  })

  const counts = useMemo(() => {
    const all = items ?? []
    return {
      total: all.length,
      screenshot: all.filter((item) => item.kind === 'screenshot').length,
      payload: all.filter((item) => item.kind === 'payload').length,
      query: all.filter((item) => item.kind === 'query-result').length,
      document: all.filter((item) => item.kind === 'document').length,
      locked: all.filter((item) => item.locked).length,
    }
  }, [items])

  return (
    <>
      <PageHeader
        title="Evidence & Reports"
        description="Every run leaves a locked evidence bundle: screenshots, request and response payloads, query results and documents, each hashed with the time and the approver. The report opens as a formatted page you can print or save as PDF."
        requirements={['R3']}
        actions={
          openBundle ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => openRunSummary(openBundle.runId, navigate)}>
                Open run summary
              </Button>
              <Button variant="primary" size="sm" onClick={() => openEvidencePack(openBundle.runId, navigate)}>
                <FileText className="h-3.5 w-3.5" />
                Audit evidence pack
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProcessPicker value={selection.processId} onChange={(value) => patch({ processId: value })} />
          {(
            [
              [num(counts.total) + ' evidence items', 'neutral'],
              [num(counts.locked) + ' locked', 'success'],
              [counts.screenshot + ' screenshots', 'neutral'],
              [counts.payload + ' payloads', 'neutral'],
              [counts.query + ' query results', 'neutral'],
              [counts.document + ' documents', 'neutral'],
            ] as const
          ).map(([label, tone]) => (
            <Badge
              key={label}
              tone={tone}
              className="cursor-pointer"
              title="Open the evidence items"
              onClick={() => setTab('items')}
            >
              {label}
            </Badge>
          ))}
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'bundles', label: 'Evidence bundles', count: shownBundles.length },
          { value: 'items', label: 'Evidence items', count: items?.length ?? 0 },
        ]}
      />

      {tab === 'bundles' ? (
        <Card>
          <CardHeader
            title="Locked evidence bundles"
            description="One bundle per run, hashed and locked. Click a bundle to see the items, sign it off, or open the run summary and the audit evidence pack."
          />
          <DataTable
            rows={shownBundles}
            getRowId={(row) => row.id}
            searchText={(row) => `${row.id} ${row.runId} ${find.run(row.runId)?.label ?? ''} ${row.hash}`}
            searchPlaceholder="Search bundles, runs or hashes"
            onRowClick={(row) => {
              setOpenBundleId(row.id)
              setParams({ bundle: row.id })
            }}
            activeRowId={openBundleId}
            initialSort={{ key: 'locked', dir: 'desc' }}
            rowTone={(row) => (row.approvalState === 'Pending approval' ? 'accent' : undefined)}
            filters={[
              {
                key: 'verdict',
                label: 'Verdict',
                options: ['GO', 'CONDITIONAL', 'NO-GO'].map((value) => ({ value, label: value })),
                match: (row, value) => row.verdict === value,
              },
              {
                key: 'approval',
                label: 'Sign-off',
                options: [
                  { value: 'Approved', label: 'Approved' },
                  { value: 'Pending approval', label: 'Pending approval' },
                  { value: 'Rejected', label: 'Rejected' },
                ],
                match: (row, value) => row.approvalState === value,
              },
              {
                key: 'runType',
                label: 'Run type',
                options: ['Functional', 'Regression', 'Load', 'SoD', 'Reconciliation'].map((value) => ({
                  value,
                  label: value,
                })),
                match: (row, value) => find.run(row.runId)?.runType === value,
              },
            ]}
            columns={[
              {
                key: 'id',
                header: 'Bundle',
                sortValue: (row) => row.id,
                render: (row) => (
                  <span className="block">
                    <span className="mono text-xs font-semibold text-text">{row.id}</span>
                    <span className="mt-0.5 block text-2xs text-muted">{find.run(row.runId)?.label}</span>
                  </span>
                ),
              },
              {
                key: 'run',
                header: 'Run',
                render: (row) => <RunRef id={row.runId} label={row.runId} />,
                hideBelow: 'sm',
              },
              {
                key: 'items',
                header: 'Items',
                align: 'right',
                sortValue: (row) => Object.values(row.itemCounts).reduce((a, b) => a + b, 0),
                render: (row) => (
                  <span className="mono">{Object.values(row.itemCounts).reduce((a, b) => a + b, 0)}</span>
                ),
              },
              {
                key: 'kinds',
                header: 'Kinds',
                render: (row) => (
                  <span className="flex flex-wrap gap-1">
                    {(Object.entries(row.itemCounts) as [EvidenceKind, number][])
                      .filter(([, value]) => value > 0)
                      .map(([kind, value]) => {
                        const Icon = KIND_ICON[kind]
                        return (
                          <Badge key={kind} tone="neutral" title={kind}>
                            <Icon className="h-3 w-3" />
                            {value}
                          </Badge>
                        )
                      })}
                  </span>
                ),
                hideBelow: 'md',
              },
              { key: 'verdict', header: 'Verdict', render: (row) => <VerdictBadge verdict={row.verdict} /> },
              {
                key: 'approval',
                header: 'Sign-off',
                sortValue: (row) => row.approvalState,
                render: (row) => (
                  <span className="block">
                    <ApprovalBadge state={row.approvalState} />
                    {row.approvedByRole ? (
                      <span className="mt-0.5 block text-2xs text-muted">by {row.approvedByRole}</span>
                    ) : null}
                  </span>
                ),
              },
              {
                key: 'locked',
                header: 'Locked at',
                align: 'right',
                sortValue: (row) => row.lockedAt,
                render: (row) => <span className="text-2xs text-muted">{dateTime(row.lockedAt)}</span>,
                hideBelow: 'md',
              },
            ]}
            caption="Hashes are SHA-256 over the bundle content. A locked bundle cannot be changed, only superseded by a new run."
          />
        </Card>
      ) : null}

      {tab === 'items' ? (
        <Card>
          <CardHeader title="Evidence items" description="Click an item to see the captured screenshot, payload, rows or document." />
          <DataTable
            rows={items ?? []}
            getRowId={(row) => row.id}
            searchText={(row) => `${row.id} ${row.title} ${row.runId} ${row.scenarioId} ${row.hash}`}
            searchPlaceholder="Search evidence"
            onRowClick={(row) => setOpenItemId(row.id)}
            activeRowId={openItemId}
            filters={[
              {
                key: 'kind',
                label: 'Kind',
                options: (['screenshot', 'payload', 'query-result', 'document', 'log'] as EvidenceKind[]).map((value) => ({
                  value,
                  label: value.replace('-', ' '),
                })),
                match: (row, value) => row.kind === value,
              },
              {
                key: 'run',
                label: 'Run',
                options: Array.from(new Set((items ?? []).map((row) => row.runId))).map((value) => ({
                  value,
                  label: value,
                })),
                match: (row, value) => row.runId === value,
              },
            ]}
            columns={[
              {
                key: 'title',
                header: 'Evidence',
                sortValue: (row) => row.title,
                render: (row: EvidenceItem) => {
                  const Icon = KIND_ICON[row.kind]
                  return (
                    <span className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-text">{row.title}</span>
                        <span className="mono mt-0.5 block truncate text-2xs text-muted">{row.id}</span>
                      </span>
                    </span>
                  )
                },
              },
              {
                key: 'scenario',
                header: 'Scenario',
                render: (row) => (row.scenarioId ? <ScenarioRef id={row.scenarioId} label={row.scenarioId} /> : <span className="text-2xs text-muted">-</span>),
                hideBelow: 'sm',
              },
              { key: 'run', header: 'Run', render: (row) => <RunRef id={row.runId} label={row.runId} />, hideBelow: 'md' },
              {
                key: 'locked',
                header: 'Locked',
                render: (row) =>
                  row.locked ? (
                    <Badge tone="success">
                      <Lock className="h-3 w-3" />
                      locked
                    </Badge>
                  ) : (
                    <Badge tone="accent">open</Badge>
                  ),
              },
              {
                key: 'captured',
                header: 'Captured',
                align: 'right',
                sortValue: (row) => row.capturedAt,
                render: (row) => <span className="text-2xs text-muted">{dateTime(row.capturedAt)}</span>,
                hideBelow: 'md',
              },
            ]}
          />
        </Card>
      ) : null}

      {/* ------------------------------------------------------- bundle drawer */}
      <Drawer
        open={Boolean(openBundle)}
        onClose={() => {
          setOpenBundleId(null)
          setParams({})
        }}
        width="w-full max-w-3xl"
        title={openBundle ? `Evidence bundle ${openBundle.id}` : ''}
        subtitle={openBundleRun?.label}
        badges={
          openBundle ? (
            <>
              <VerdictBadge verdict={openBundle.verdict} />
              <ApprovalBadge state={openBundle.approvalState} />
              {openBundleRun ? <RunStatusBadge status={openBundleRun.status} /> : null}
              <Badge tone="success">
                <Lock className="h-3 w-3" />
                locked
              </Badge>
            </>
          ) : undefined
        }
        footer={
          openBundle ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={openBundle.approvalState === 'Approved' || !role.canApprove}
                title={role.canApprove ? 'Sign off this evidence' : `The ${role.name} role cannot approve`}
                onClick={() => {
                  setApproving(openBundle)
                  setComment('')
                }}
              >
                <Check className="h-3.5 w-3.5" />
                Sign off evidence
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => openRunSummary(openBundle.runId, navigate)}>
                  Open run summary
                </Button>
                <Button variant="primary" size="sm" onClick={() => openEvidencePack(openBundle.runId, navigate)}>
                  <FileText className="h-3.5 w-3.5" />
                  Audit evidence pack
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {openBundle ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Run', value: <RunRef id={openBundle.runId} /> },
                { label: 'Locked at', value: dateTimeSec(openBundle.lockedAt) },
                { label: 'Approved by', value: openBundle.approvedByRole ?? 'not signed off yet' },
                { label: 'Items', value: Object.values(openBundle.itemCounts).reduce((a, b) => a + b, 0) },
                {
                  label: 'Requirements covered',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {openBundle.requirementIds.map((id) => (
                        <RequirementRef key={id} id={id} />
                      ))}
                    </span>
                  ),
                },
                { label: 'Hash', value: <span className="mono break-all text-2xs">{openBundle.hash}</span> },
              ]}
            />

            <div>
              <p className="label mb-1.5">Items in this bundle</p>
              <div className="space-y-1">
                {openBundleItems.slice(0, 40).map((item) => {
                  const Icon = KIND_ICON[item.kind]
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOpenItemId(item.id)}
                      className="flex w-full items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-left transition-colors hover:bg-surface2"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-text">{item.title}</span>
                        <span className="mono block truncate text-2xs text-muted">
                          {item.stepId} · {item.hash.slice(0, 24)}...
                        </span>
                      </span>
                      <Badge tone="neutral">{item.kind.replace('-', ' ')}</Badge>
                    </button>
                  )
                })}
                {openBundleItems.length > 40 ? (
                  <p className="pt-1 text-2xs text-muted">and {openBundleItems.length - 40} more items in the report.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* --------------------------------------------------------- item drawer */}
      <Drawer
        open={Boolean(openItem)}
        onClose={() => setOpenItemId(null)}
        width="w-full max-w-2xl"
        title={openItem?.title ?? ''}
        subtitle={openItem ? `${openItem.runId} · ${openItem.stepId}` : ''}
      >
        {openItem ? (
          <div className="space-y-4">
            <EvidenceCard item={openItem} />
            <div className="flex flex-wrap items-center gap-2">
              <RunRef id={openItem.runId} />
              {openItem.scenarioId ? <ScenarioRef id={openItem.scenarioId} /> : null}
              <PageRef to={`/evidence-pack/${openItem.runId}`}>In the audit evidence pack</PageRef>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* -------------------------------------------------------- sign-off modal */}
      <Modal
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        title="Sign off the evidence"
        subtitle={approving ? `${approving.id} · verdict ${approving.verdict}` : ''}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setApproving(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!approving) return
                void api.approveEvidenceBundle(approving.id, role.name, comment).then(() => {
                  toast({
                    title: 'Evidence signed off',
                    description: `${approving.id} is now part of the audit file.`,
                    tone: 'success',
                  })
                })
                setApproving(null)
              }}
            >
              <Check className="h-3.5 w-3.5" />
              Sign off
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Signing as the <span className="font-semibold text-text">{role.name}</span> role. Your role and the time are
            stored with the bundle and printed on the report.
          </p>
          <Textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Comment (optional)"
          />
        </div>
      </Modal>

      {(bundles ?? []).length === 0 ? (
        <Card className="mt-4">
          <CardBody>
            <EmptyState title="No evidence yet" description="Run something in the Run Centre." />
          </CardBody>
        </Card>
      ) : null}
    </>
  )
}
