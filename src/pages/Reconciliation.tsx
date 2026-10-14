import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, FileCheck2, Play, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, Chip, EmptyState, Progress } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import { LiveLog } from '@/components/common/LiveLog'
import { FieldCompareTable } from '@/components/common/views'
import { AiBadge, SeverityBadge } from '@/components/common/badges'
import { SelectionSummary, SitePicker } from '@/components/common/selectors'
import { DataSourceRef, FindingRef, PageRef, SystemRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import * as api from '@/lib/api'
import { find } from '@/lib/db'
import { dateTime, num, percent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReconDifferenceGroup, ReconRow, ReconSet } from '@/lib/types'

export default function ReconciliationPage() {
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()
  const { selection, patch } = useSelection()

  const [scope, setScope] = useState<'ALL' | 'Migration' | 'Cross-system'>('ALL')
  const [setId, setSetId] = useState<string | null>(params.get('set') ?? selection.reconSetId ?? 'RC-06')
  const [jobId, setJobId] = useState<string | null>(null)
  const [openRow, setOpenRow] = useState<ReconRow | null>(null)
  const [openGroup, setOpenGroup] = useState<ReconDifferenceGroup | null>(null)

  const job = useJob<ReconSet>(jobId)
  const { data: sets } = useApi(() => api.listReconSets(), [])

  useEffect(() => {
    const setParam = params.get('set')
    if (setParam) setSetId(setParam)
  }, [params])

  useEffect(() => {
    if (job?.status === 'done') {
      toast({ title: 'Reconciliation finished', description: 'Counts, totals and differences are up to date.', tone: 'success' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status])

  const shownSets = (sets ?? []).filter(
    (item) =>
      (scope === 'ALL' || item.scope === scope) &&
      (selection.site === 'ALL' || item.site === 'ALL' || item.site === selection.site),
  )
  const current = setId ? find.reconSet(setId) : undefined

  const matchTone = (value: number) => (value >= 99.5 ? 'success' : value >= 98 ? 'accent' : 'danger')

  const summary = useMemo(() => {
    const all = sets ?? []
    return {
      average: all.length === 0 ? 0 : all.reduce((total, item) => total + item.matchPct, 0) / all.length,
      below: all.filter((item) => item.matchPct < 99.5).length,
      differences: all.reduce(
        (total, item) => total + item.differenceGroups.reduce((groupTotal, group) => groupTotal + group.count, 0),
        0,
      ),
    }
  }, [sets])

  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="Migration and cross-system reconciliation: counts, totals, a row-by-row sample and every difference grouped by an explained cause."
        requirements={['R8']}
        actions={
          current ? (
            <Button
              variant="primary"
              size="sm"
              loading={job?.status === 'running'}
              onClick={() => {
                setJobId(api.runRecon(current.id))
                toast({ title: 'Reconciliation started', description: current.name, tone: 'info' })
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Run this reconciliation
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5">
            {(['ALL', 'Migration', 'Cross-system'] as const).map((value) => (
              <Chip key={value} active={scope === value} onClick={() => setScope(value)}>
                {value === 'ALL' ? 'All sets' : value}
              </Chip>
            ))}
          </div>
          <SitePicker value={selection.site} onChange={(value) => patch({ site: value })} />
          <Badge tone="neutral">Average match {percent(summary.average, 1)}</Badge>
          <Badge tone={summary.below > 0 ? 'accent' : 'success'}>{summary.below} sets below 99.5 %</Badge>
          <Badge tone="neutral">{summary.differences} differences explained</Badge>
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        <Card>
          <CardHeader title="Reconciliation sets" description="Click a set to open its comparison." />
          <DataTable
            rows={shownSets}
            getRowId={(row) => row.id}
            dense
            searchText={(row) => `${row.id} ${row.name} ${row.scope}`}
            searchPlaceholder="Search sets"
            onRowClick={(row) => {
              setSetId(row.id)
              patch({ reconSetId: row.id })
              setParams({ set: row.id })
            }}
            activeRowId={setId}
            rowTone={(row) => (row.matchPct < 98 ? 'danger' : row.matchPct < 99.5 ? 'accent' : undefined)}
            filters={[
              {
                key: 'scope',
                label: 'Scope',
                options: [
                  { value: 'Migration', label: 'Migration' },
                  { value: 'Cross-system', label: 'Cross-system' },
                ],
                match: (row, value) => row.scope === value,
              },
            ]}
            columns={[
              {
                key: 'name',
                header: 'Set',
                sortValue: (row) => row.name,
                render: (row) => (
                  <span className="block">
                    <span className="text-xs font-medium text-text">{row.name}</span>
                    <span className="mt-0.5 block text-2xs text-muted">
                      {find.system(row.sourceSystemId)?.name} → {find.system(row.targetSystemId)?.name}
                    </span>
                  </span>
                ),
              },
              {
                key: 'scope',
                header: 'Scope',
                sortValue: (row) => row.scope,
                render: (row) => <Badge tone={row.scope === 'Migration' ? 'primary' : 'info'}>{row.scope}</Badge>,
                hideBelow: 'sm',
              },
              {
                key: 'match',
                header: 'Match',
                align: 'right',
                sortValue: (row) => row.matchPct,
                render: (row) => (
                  <span className="inline-flex w-20 flex-col items-end">
                    <span
                      className={cn(
                        'mono text-xs font-semibold',
                        row.matchPct >= 99.5 ? 'text-success' : row.matchPct >= 98 ? 'text-accent' : 'text-danger',
                      )}
                    >
                      {percent(row.matchPct, 1)}
                    </span>
                    <Progress value={row.matchPct} height="h-1" tone={matchTone(row.matchPct)} />
                  </span>
                ),
              },
            ]}
          />
        </Card>

        <div className="min-w-0 space-y-4">
          {!current ? (
            <Card>
              <CardBody>
                <EmptyState title="Select a reconciliation set" icon={<FileCheck2 className="h-6 w-6" />} />
              </CardBody>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader
                  title={current.name}
                  description={`${current.scope} reconciliation, last run ${dateTime(current.lastRunAt)}`}
                  actions={
                    <Badge tone={current.matchPct >= 99.5 ? 'success' : current.matchPct >= 98 ? 'accent' : 'danger'}>
                      Match {percent(current.matchPct, 1)}
                    </Badge>
                  }
                />
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(
                      [
                        ['Source records', current.counts.source, 'default'],
                        ['Target records', current.counts.target, 'default'],
                        ['Matched', current.counts.matched, 'success'],
                        ['Missing in target', current.counts.missing, 'danger'],
                        ['Only in target', current.counts.extra, 'accent'],
                      ] as const
                    ).map(([label, value, tone]) => (
                      <div key={label} className="rounded-md border border-line px-2.5 py-1.5">
                        <p className="label">{label}</p>
                        <p
                          className={cn(
                            'text-base font-semibold tabular-nums',
                            tone === 'success' && 'text-success',
                            tone === 'danger' && value > 0 && 'text-danger',
                            tone === 'accent' && value > 0 && 'text-accent',
                          )}
                        >
                          {num(value)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-line p-3">
                    <p className="label mb-1">{current.totals.label}</p>
                    <div className="flex flex-wrap items-baseline gap-4">
                      <span className="text-sm text-muted">
                        source <span className="mono font-semibold text-text">{num(current.totals.source, current.totals.unit === 'EUR' ? 2 : 0)} {current.totals.unit}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted" />
                      <span className="text-sm text-muted">
                        target <span className="mono font-semibold text-text">{num(current.totals.target, current.totals.unit === 'EUR' ? 2 : 0)} {current.totals.unit}</span>
                      </span>
                      <span
                        className={cn(
                          'text-sm text-muted',
                          current.totals.delta !== 0 && 'font-semibold text-danger',
                        )}
                      >
                        difference{' '}
                        <span className="mono">
                          {num(current.totals.delta, current.totals.unit === 'EUR' ? 2 : 0)} {current.totals.unit}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="label">Data sources</span>
                    {current.dataSourceIds.map((id) => (
                      <DataSourceRef key={id} id={id} />
                    ))}
                    <span className="label ml-2">Systems</span>
                    <SystemRef id={current.sourceSystemId} compact />
                    <ArrowRight className="h-3 w-3 text-muted" />
                    <SystemRef id={current.targetSystemId} compact />
                  </div>

                  {current.findingIds.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="label">Findings</span>
                      {current.findingIds.map((id) => (
                        <FindingRef key={id} id={id} label={id} />
                      ))}
                    </div>
                  ) : null}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Differences grouped by cause"
                  description="Each group carries an AI explanation and a recommended fix. Click one for the detail."
                  icon={<Sparkles className="h-4 w-4 text-ai" />}
                />
                <CardBody className="space-y-2">
                  {current.differenceGroups.length === 0 ? (
                    <p className="text-xs text-success">No differences in this set.</p>
                  ) : (
                    current.differenceGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setOpenGroup(group)}
                        className="w-full rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-surface2/60"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-text">{group.cause}</span>
                          <span className="flex items-center gap-1.5">
                            <SeverityBadge severity={group.severity} />
                            <Badge tone="neutral">{group.count} rows</Badge>
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{group.aiExplanation}</p>
                      </button>
                    ))
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Row-by-row sample"
                  description="Click a row for the field-by-field compare."
                />
                <DataTable
                  rows={current.sample}
                  getRowId={(row) => row.key}
                  dense
                  searchText={(row) => `${row.key} ${row.label} ${row.causeGroup ?? ''}`}
                  searchPlaceholder="Search sample rows"
                  onRowClick={(row) => setOpenRow(row)}
                  rowTone={(row) => (row.status === 'Matched' ? undefined : row.status === 'Duplicated' ? 'accent' : 'danger')}
                  filters={[
                    {
                      key: 'status',
                      label: 'Status',
                      options: ['Matched', 'Mismatched', 'Missing', 'Duplicated'].map((value) => ({ value, label: value })),
                      match: (row, value) => row.status === value,
                    },
                  ]}
                  columns={[
                    {
                      key: 'key',
                      header: 'Record',
                      sortValue: (row) => row.key,
                      render: (row) => (
                        <span className="block">
                          <span className="mono text-xs font-medium text-text">{row.key}</span>
                          <span className="mt-0.5 block text-2xs text-muted">{row.label}</span>
                        </span>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      sortValue: (row) => row.status,
                      render: (row) => (
                        <Badge
                          tone={row.status === 'Matched' ? 'success' : row.status === 'Duplicated' ? 'accent' : 'danger'}
                        >
                          {row.status}
                        </Badge>
                      ),
                    },
                    {
                      key: 'cause',
                      header: 'Cause group',
                      render: (row) =>
                        row.causeGroup ? <Badge tone="neutral">{row.causeGroup}</Badge> : <span className="text-2xs text-muted">-</span>,
                      hideBelow: 'sm',
                    },
                    {
                      key: 'fields',
                      header: 'Fields differing',
                      align: 'right',
                      sortValue: (row) => row.fields.filter((field) => !field.match).length,
                      render: (row) => {
                        const count = row.fields.filter((field) => !field.match).length
                        return <span className={cn('mono', count > 0 && 'text-danger')}>{count}</span>
                      },
                    },
                  ]}
                />
              </Card>

              <Card>
                <CardHeader title="Reconciliation log" />
                <CardBody>
                  <LiveLog
                    lines={job?.log ?? []}
                    status={job?.status}
                    progressPct={job?.progressPct}
                    currentLabel={job?.currentLabel}
                    height="h-44"
                    emptyHint="Press Run this reconciliation to compare both sides again."
                  />
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <Drawer
        open={Boolean(openRow)}
        onClose={() => setOpenRow(null)}
        width="w-full max-w-2xl"
        title={openRow ? `Record ${openRow.key}` : ''}
        subtitle={openRow?.label}
        badges={
          openRow ? (
            <>
              <Badge tone={openRow.status === 'Matched' ? 'success' : 'danger'}>{openRow.status}</Badge>
              {openRow.causeGroup ? <Badge tone="neutral">{openRow.causeGroup}</Badge> : null}
            </>
          ) : undefined
        }
      >
        {openRow ? (
          <div className="space-y-4">
            <FieldCompareTable fields={openRow.fields} />
            {openRow.causeGroup && current ? (
              <div className="rounded-lg border border-ai/30 bg-ai-soft/40 p-3">
                <p className="label mb-1 flex items-center gap-1.5">
                  Why this differs <AiBadge label="AI" />
                </p>
                <p className="text-xs text-text">
                  {current.differenceGroups.find((group) => group.cause.includes(openRow.causeGroup ?? ''))?.aiExplanation ??
                    current.differenceGroups[0]?.aiExplanation}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={Boolean(openGroup)}
        onClose={() => setOpenGroup(null)}
        title={openGroup?.cause ?? ''}
        subtitle={openGroup ? `${openGroup.count} rows affected` : ''}
        badges={openGroup ? <SeverityBadge severity={openGroup.severity} /> : undefined}
      >
        {openGroup ? (
          <div className="space-y-4">
            <div>
              <p className="label mb-1 flex items-center gap-1.5">
                AI explanation <AiBadge label="written by AI" />
              </p>
              <p className="rounded-lg border border-ai/30 bg-ai-soft/40 p-3 text-sm text-text">
                {openGroup.aiExplanation}
              </p>
            </div>
            <div>
              <p className="label mb-1">Recommended fix</p>
              <p className="text-sm text-text">{openGroup.recommendedFix}</p>
            </div>
            <div>
              <p className="label mb-1.5">Sample rows in this group</p>
              <div className="space-y-1">
                {(current?.sample ?? [])
                  .filter((row) => openGroup.cause.toLowerCase().includes((row.causeGroup ?? 'x').toLowerCase()) || row.causeGroup)
                  .slice(0, 5)
                  .map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => {
                        setOpenGroup(null)
                        setOpenRow(row)
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5 text-left hover:bg-surface2"
                    >
                      <span className="mono text-xs text-text">{row.key}</span>
                      <Badge tone={row.status === 'Matched' ? 'success' : 'danger'}>{row.status}</Badge>
                    </button>
                  ))}
              </div>
            </div>
            <PageRef to="/release">See the effect on release readiness</PageRef>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
