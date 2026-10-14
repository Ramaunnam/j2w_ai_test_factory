import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, CalendarClock, CheckCircle2, Play } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, EmptyState, KeyValue } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import { LiveLog } from '@/components/common/LiveLog'
import { LoadSmallMultiples } from '@/components/charts/charts'
import { SeverityBadge, VerdictBadge } from '@/components/common/badges'
import { InterfacePicker, LoadProfilePicker, SelectionSummary } from '@/components/common/selectors'
import { FindingRef, InterfaceRef, PageRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { LOAD_PROFILE_LABELS } from '@/data/load'
import { dateTime, ms, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { LoadIntegrityCheck, LoadRunResult, ProcessId } from '@/lib/types'

export default function LoadTestPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { selection, patch } = useSelection()

  const [processIds, setProcessIds] = useState<ProcessId[]>(['P1', 'P2', 'P3', 'P6'])
  const [jobId, setJobId] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [openCheck, setOpenCheck] = useState<LoadIntegrityCheck | null>(null)

  const job = useJob<LoadRunResult>(jobId)
  const { data: loadRuns } = useApi(() => api.listLoadRuns(), [])

  useEffect(() => {
    if (job?.status === 'done' && job.result) {
      setResultId(job.result.id)
      const failed = job.result.integrityChecks.filter((check) => !check.ok).length
      toast({
        title: `Load test finished: ${job.result.verdict}`,
        description:
          failed > 0
            ? `${failed} integrity checks failed - documents were lost or duplicated.`
            : 'Nothing was lost or duplicated under load.',
        tone: failed > 0 ? 'warning' : 'success',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status])

  const result = useMemo(() => {
    if (resultId) return db.loadRuns.find((run) => run.id === resultId)
    return (loadRuns ?? []).find((run) => run.profile === selection.loadProfile)
  }, [resultId, loadRuns, selection.loadProfile])

  const settings = LOAD_PROFILE_LABELS[selection.loadProfile]
  const failedChecks = (result?.integrityChecks ?? []).filter((check) => !check.ok)

  return (
    <>
      <PageHeader
        title="Month-End Load"
        description="Month-end volume, simulated. Throughput, response time, error rate and interface backlog, plus the data checks that prove nothing was lost or duplicated while the system was under pressure."
        requirements={['R6']}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/release')}>
              <CalendarClock className="h-3.5 w-3.5" />
              Close readiness
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={job?.status === 'running'}
              onClick={() => {
                setJobId(
                  api.startLoadRun({
                    profile: selection.loadProfile,
                    processIds,
                    interfaceIds: selection.interfaceIds,
                  }),
                )
                toast({
                  title: `Load test started at ${settings.label}`,
                  description: `${settings.factor}x normal volume across ${processIds.length} processes.`,
                  tone: 'info',
                })
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Run load test
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <LoadProfilePicker value={selection.loadProfile} onChange={(value) => patch({ loadProfile: value })} />
          <InterfacePicker selected={selection.interfaceIds} onChange={(values) => patch({ interfaceIds: values })} />
          <div className="inline-flex flex-wrap items-center gap-1.5">
            <span className="label mr-1">Processes</span>
            {db.processes.map((process) => (
              <Checkbox
                key={process.id}
                checked={processIds.includes(process.id)}
                onChange={() =>
                  setProcessIds((ids) =>
                    ids.includes(process.id) ? ids.filter((id) => id !== process.id) : [...ids, process.id],
                  )
                }
                label={<span className="text-xs">{process.id}</span>}
              />
            ))}
          </div>
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      {!result ? (
        <Card>
          <CardBody>
            <EmptyState
              title="No load test for this profile yet"
              description="Pick a profile and press Run load test."
              icon={<Activity className="h-6 w-6" />}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={`${settings.label} · ${settings.factor}x normal volume`}
              description={`Run ${result.id}, started ${dateTime(result.startedAt)}. ${result.processIds.length} processes and ${result.integrityChecks.length} interfaces under test.`}
              actions={<VerdictBadge verdict={result.verdict} size="lg" />}
            />
            <CardBody className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-line px-3 py-2">
                <p className="label">Peak throughput</p>
                <p className="text-xl font-semibold tabular-nums text-text">{num(result.peakThroughput)}</p>
                <p className="text-2xs text-muted">documents per minute</p>
              </div>
              <div className="rounded-lg border border-line px-3 py-2">
                <p className="label">Response time p95</p>
                <p className={cn('text-xl font-semibold tabular-nums', result.p95Ms > 3000 ? 'text-danger' : 'text-text')}>
                  {ms(result.p95Ms)}
                </p>
                <p className="text-2xs text-muted">limit 3 000 ms</p>
              </div>
              <div className="rounded-lg border border-line px-3 py-2">
                <p className="label">Error rate</p>
                <p
                  className={cn(
                    'text-xl font-semibold tabular-nums',
                    result.errorRatePct > 1 ? 'text-danger' : 'text-text',
                  )}
                >
                  {result.errorRatePct} %
                </p>
                <p className="text-2xs text-muted">limit 1 %</p>
              </div>
              <div className="rounded-lg border border-line px-3 py-2">
                <p className="label">Peak backlog</p>
                <p className={cn('text-xl font-semibold tabular-nums', result.maxBacklog > 100 ? 'text-accent' : 'text-text')}>
                  {num(result.maxBacklog)}
                </p>
                <p className="text-2xs text-muted">messages waiting</p>
              </div>
            </CardBody>
          </Card>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader
                title="Twenty minutes under load"
                description="Four separate charts, one measure each, so nothing is compared on a false axis."
              />
              <CardBody>
                <LoadSmallMultiples series={result.series} />
              </CardBody>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader
                  title="Data checks under load"
                  description="Counts in against counts out per interface. Click a row for the detail."
                  actions={
                    failedChecks.length > 0 ? (
                      <Badge tone="danger">{failedChecks.length} failed</Badge>
                    ) : (
                      <Badge tone="success">all clean</Badge>
                    )
                  }
                />
                <DataTable
                  rows={result.integrityChecks}
                  getRowId={(row) => row.interfaceId}
                  dense
                  onRowClick={(row) => setOpenCheck(row)}
                  rowTone={(row) => (row.ok ? undefined : 'danger')}
                  columns={[
                    {
                      key: 'interface',
                      header: 'Interface',
                      render: (row) => <InterfaceRef id={row.interfaceId} label={row.interfaceId} />,
                    },
                    {
                      key: 'in',
                      header: 'Sent in',
                      align: 'right',
                      sortValue: (row) => row.sentIn,
                      render: (row) => <span className="mono">{num(row.sentIn)}</span>,
                    },
                    {
                      key: 'out',
                      header: 'Received out',
                      align: 'right',
                      sortValue: (row) => row.receivedOut,
                      render: (row) => <span className="mono">{num(row.receivedOut)}</span>,
                    },
                    {
                      key: 'lost',
                      header: 'Lost',
                      align: 'right',
                      sortValue: (row) => row.lost,
                      render: (row) => <span className={cn('mono', row.lost > 0 && 'text-danger')}>{row.lost}</span>,
                    },
                    {
                      key: 'dup',
                      header: 'Duplicated',
                      align: 'right',
                      sortValue: (row) => row.duplicated,
                      render: (row) => (
                        <span className={cn('mono', row.duplicated > 0 && 'text-accent')}>{row.duplicated}</span>
                      ),
                    },
                    {
                      key: 'ok',
                      header: 'Result',
                      render: (row) =>
                        row.ok ? (
                          <Badge tone="success">
                            <CheckCircle2 className="h-3 w-3" /> clean
                          </Badge>
                        ) : (
                          <Badge tone="danger">
                            <AlertTriangle className="h-3 w-3" /> failed
                          </Badge>
                        ),
                    },
                  ]}
                />
              </Card>

              <Card>
                <CardHeader title="Bottlenecks the AI points at" />
                <CardBody className="space-y-2">
                  {result.bottlenecks.length === 0 ? (
                    <p className="text-xs text-muted">No bottleneck at this volume.</p>
                  ) : (
                    result.bottlenecks.map((bottleneck) => (
                      <div
                        key={bottleneck.interfaceId}
                        className={cn(
                          'rounded-lg border p-2.5',
                          bottleneck.severity === 'High' ? 'border-danger/40 bg-danger-soft/30' : 'border-line',
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <InterfaceRef id={bottleneck.interfaceId} />
                          <SeverityBadge severity={bottleneck.severity} />
                        </div>
                        <p className="mt-1 text-xs text-muted">{bottleneck.plain}</p>
                      </div>
                    ))
                  )}
                  {result.findingIds.map((id) => (
                    <div key={id}>
                      <FindingRef id={id} />
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Load log" />
                <CardBody>
                  <LiveLog
                    lines={job?.log ?? []}
                    status={job?.status}
                    progressPct={job?.progressPct}
                    currentLabel={job?.currentLabel}
                    height="h-48"
                    emptyHint="Press Run load test to see the ramp-up, the metrics and the integrity checks."
                  />
                </CardBody>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader
              title="Profiles compared"
              description="The same journeys at normal, double and five times month-end volume."
            />
            <DataTable
              rows={(loadRuns ?? []).filter((row, index, all) => all.findIndex((item) => item.profile === row.profile) === index)}
              getRowId={(row) => row.id}
              dense
              onRowClick={(row) => {
                patch({ loadProfile: row.profile })
                setResultId(row.id)
              }}
              activeRowId={result.id}
              columns={[
                {
                  key: 'profile',
                  header: 'Profile',
                  render: (row) => <Badge tone="primary">{LOAD_PROFILE_LABELS[row.profile].label}</Badge>,
                },
                {
                  key: 'throughput',
                  header: 'Peak throughput',
                  align: 'right',
                  sortValue: (row) => row.peakThroughput,
                  render: (row) => <span className="mono">{num(row.peakThroughput)}</span>,
                },
                {
                  key: 'p95',
                  header: 'p95',
                  align: 'right',
                  sortValue: (row) => row.p95Ms,
                  render: (row) => <span className="mono">{ms(row.p95Ms)}</span>,
                },
                {
                  key: 'errors',
                  header: 'Error rate',
                  align: 'right',
                  sortValue: (row) => row.errorRatePct,
                  render: (row) => <span className="mono">{row.errorRatePct} %</span>,
                },
                {
                  key: 'backlog',
                  header: 'Peak backlog',
                  align: 'right',
                  sortValue: (row) => row.maxBacklog,
                  render: (row) => <span className="mono">{num(row.maxBacklog)}</span>,
                },
                {
                  key: 'lost',
                  header: 'Lost or duplicated',
                  align: 'right',
                  render: (row) => {
                    const bad = row.integrityChecks.reduce((total, check) => total + check.lost + check.duplicated, 0)
                    return <span className={cn('mono', bad > 0 && 'text-danger')}>{bad}</span>
                  },
                },
                { key: 'verdict', header: 'Verdict', render: (row) => <VerdictBadge verdict={row.verdict} /> },
              ]}
              caption={
                <span>
                  The five times profile is the one that matters for the close.{' '}
                  <PageRef to="/release">It feeds the close readiness verdict</PageRef>
                </span>
              }
            />
          </Card>
        </div>
      )}

      <Drawer
        open={Boolean(openCheck)}
        onClose={() => setOpenCheck(null)}
        title={openCheck ? find.interface(openCheck.interfaceId)?.name ?? openCheck.interfaceId : ''}
        subtitle="Integrity check under load: every message sent must arrive exactly once."
        badges={openCheck ? openCheck.ok ? <Badge tone="success">clean</Badge> : <Badge tone="danger">failed</Badge> : undefined}
      >
        {openCheck ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Sent in', value: num(openCheck.sentIn) },
                { label: 'Received out', value: num(openCheck.receivedOut) },
                { label: 'Lost', value: openCheck.lost },
                { label: 'Duplicated', value: openCheck.duplicated },
              ]}
            />
            <p className="text-sm text-text">
              {openCheck.ok
                ? 'Counts match exactly, so nothing was lost or duplicated at this volume.'
                : 'Counts do not match. Under load the queue dropped documents without a dead letter entry, so nothing retried them.'}
            </p>
            {!openCheck.ok ? (
              <div className="space-y-2">
                {db.findings
                  .filter((finding) => finding.interfaceIds.includes(openCheck.interfaceId) && finding.id === 'F-015')
                  .map((finding) => (
                    <div key={finding.id} className="rounded-lg border border-danger/40 bg-danger-soft/30 p-3">
                      <p className="text-sm font-medium text-text">{finding.title}</p>
                      <p className="mt-1 text-xs text-muted">{finding.aiExplanation}</p>
                      <div className="mt-2">
                        <FindingRef id={finding.id} label={`Open ${finding.id}`} />
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}
            <InterfaceRef id={openCheck.interfaceId} />
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
