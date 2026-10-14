import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, GitCompareArrows, Play, Search, Truck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, Chip, EmptyState, KeyValue, Select } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { Tabs } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/table'
import { FieldCompareTable, Timeline, type TimelineEntry } from '@/components/common/views'
import { HealthBadge, HealthDot } from '@/components/common/badges'
import { InterfacePicker, SelectionSummary, SitePicker } from '@/components/common/selectors'
import { FindingRef, InterfaceRef, PageRef, SystemRef, VehicleRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { TRACEABLE_VEHICLES } from '@/data/interfaces'
import { dateTime, num, timeShort } from '@/lib/format'
import { cn, pct } from '@/lib/utils'
import type { Health, InterfaceLink, InterfaceRecord } from '@/lib/types'

function interfaceHealth(link: InterfaceLink): Health {
  const bad = link.stats.mismatched + link.stats.missing + link.stats.duplicated
  if (link.stats.sent === 0) return 'Not tested'
  const ratio = bad / link.stats.sent
  if (ratio === 0) return 'Healthy'
  if (ratio < 0.02) return 'Attention'
  return 'At risk'
}

function latencyMinutes(record: InterfaceRecord): number | null {
  if (!record.receivedAt) return null
  return Math.round((new Date(record.receivedAt).getTime() - new Date(record.sentAt).getTime()) / 60000)
}

export default function InterfacesPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { selection, patch } = useSelection()

  const [tab, setTab] = useState<'interfaces' | 'records' | 'trace'>('interfaces')
  const [category, setCategory] = useState<'ALL' | 'Shop-floor' | 'Financial'>('ALL')
  const [openInterfaceId, setOpenInterfaceId] = useState<string | null>(params.get('if'))
  const [openRecordId, setOpenRecordId] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState(params.get('trace') ?? selection.vehicle ?? 'VH-7741')
  const [trace, setTrace] = useState<{ vehicle: string; steps: api.VehicleTraceStep[] } | null>(null)

  const { data: interfaces } = useApi(() => api.getInterfaces(), [])
  const { data: records } = useApi(
    () => api.getInterfaceRecords(selection.interfaceIds, selection.site),
    [selection.interfaceIds.join(), selection.site],
  )

  useEffect(() => {
    const traceParam = params.get('trace')
    if (traceParam) {
      setVehicle(traceParam)
      setTab('trace')
      void api.traceVehicle(traceParam).then(setTrace)
    }
    const ifParam = params.get('if')
    if (ifParam) {
      setOpenInterfaceId(ifParam)
      setTab('interfaces')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const openInterface = openInterfaceId ? find.interface(openInterfaceId) : undefined
  const openRecord = openRecordId ? db.interfaceRecords.find((record) => record.id === openRecordId) : undefined

  const shownInterfaces = (interfaces ?? []).filter(
    (link) =>
      (category === 'ALL' || link.category === category) &&
      (selection.interfaceIds.length === 0 || selection.interfaceIds.includes(link.id)),
  )

  const interfaceRecords = (records ?? []).filter((record) =>
    category === 'ALL' ? true : find.interface(record.interfaceId)?.category === category,
  )

  const totals = useMemo(() => {
    return shownInterfaces.reduce(
      (acc, link) => ({
        sent: acc.sent + link.stats.sent,
        received: acc.received + link.stats.received,
        matched: acc.matched + link.stats.matched,
        mismatched: acc.mismatched + link.stats.mismatched,
        missing: acc.missing + link.stats.missing,
        duplicated: acc.duplicated + link.stats.duplicated,
      }),
      { sent: 0, received: 0, matched: 0, mismatched: 0, missing: 0, duplicated: 0 },
    )
  }, [shownInterfaces])

  const traceEntries: TimelineEntry[] = (trace?.steps ?? []).map((step) => ({
    id: `${step.order}-${step.recordId}`,
    title: (
      <span className="flex flex-wrap items-center gap-2">
        <span>{step.title}</span>
        {step.interfaceId ? <Badge tone="neutral">{step.interfaceId}</Badge> : null}
      </span>
    ),
    detail: (
      <span className="flex flex-wrap items-center gap-2">
        <span className="mono">{step.detail}</span>
        {step.findingId ? <FindingRef id={step.findingId} label={step.findingId} /> : null}
      </span>
    ),
    meta: `${timeShort(step.at)} · ${step.status === 'ok' ? 'matched' : step.status === 'error' ? 'mismatched' : 'not matched'}`,
    status: step.status === 'ok' ? 'ok' : step.status === 'error' ? 'error' : 'warn',
    onClick: step.recordId ? () => setOpenRecordId(step.recordId!) : undefined,
  }))

  return (
    <>
      <PageHeader
        title="Interfaces"
        description="Every shop-floor and financial interface: what was sent, what arrived, what matched, and what went missing or twice. Then follow one vehicle across every system."
        requirements={['R5']}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTab('trace')
                void api.traceVehicle(vehicle).then(setTrace)
              }}
            >
              <Truck className="h-3.5 w-3.5" />
              Follow the truck
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                patch({ interfaceIds: selection.interfaceIds })
                navigate('/run')
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Test selected interfaces
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <InterfacePicker selected={selection.interfaceIds} onChange={(values) => patch({ interfaceIds: values })} />
          <div className="inline-flex items-center gap-1.5">
            {(['ALL', 'Shop-floor', 'Financial'] as const).map((value) => (
              <Chip key={value} active={category === value} onClick={() => setCategory(value)}>
                {value === 'ALL' ? 'All' : value}
              </Chip>
            ))}
          </div>
          <SitePicker value={selection.site} onChange={(value) => patch({ site: value })} />
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
        {(
          [
            ['Sent', totals.sent, 'default'],
            ['Received', totals.received, 'default'],
            ['Matched', totals.matched, 'success'],
            ['Mismatched', totals.mismatched, 'danger'],
            ['Missing', totals.missing, 'danger'],
            ['Duplicated', totals.duplicated, 'accent'],
          ] as const
        ).map(([label, value, tone]) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab('records')}
            className="card px-3 py-2 text-left transition-colors hover:bg-surface2/60"
          >
            <p className="label">{label}</p>
            <p
              className={cn(
                'text-xl font-semibold tabular-nums',
                tone === 'success' && 'text-success',
                tone === 'danger' && value > 0 && 'text-danger',
                tone === 'accent' && value > 0 && 'text-accent',
              )}
            >
              {num(value)}
            </p>
          </button>
        ))}
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'interfaces', label: 'Interfaces', count: shownInterfaces.length },
          { value: 'records', label: 'Records', count: interfaceRecords.length },
          { value: 'trace', label: 'Follow the truck', icon: <Truck className="h-3.5 w-3.5" /> },
        ]}
      />

      {tab === 'interfaces' ? (
        <Card>
          <CardHeader
            title="Interface results"
            description="Click an interface to see its records and the field-by-field compare."
          />
          <DataTable
            rows={shownInterfaces}
            getRowId={(row) => row.id}
            searchText={(row) => `${row.id} ${row.name} ${row.messageType} ${row.messageRef}`}
            searchPlaceholder="Search interfaces"
            onRowClick={(row) => {
              setOpenInterfaceId(row.id)
              setParams({ if: row.id })
            }}
            activeRowId={openInterfaceId}
            initialSort={{ key: 'health', dir: 'asc' }}
            filters={[
              {
                key: 'messageType',
                label: 'Message type',
                options: Array.from(new Set(shownInterfaces.map((row) => row.messageType))).map((value) => ({
                  value,
                  label: value,
                })),
                match: (row, value) => row.messageType === value,
              },
              {
                key: 'health',
                label: 'Health',
                options: [
                  { value: 'Healthy', label: 'Healthy' },
                  { value: 'Attention', label: 'Attention' },
                  { value: 'At risk', label: 'At risk' },
                ],
                match: (row, value) => interfaceHealth(row) === value,
              },
            ]}
            columns={[
              {
                key: 'name',
                header: 'Interface',
                sortValue: (row) => row.name,
                render: (row) => (
                  <span className="block">
                    <span className="flex items-center gap-2 text-sm font-medium text-text">
                      <HealthDot health={interfaceHealth(row)} />
                      <span className="mono text-2xs text-muted">{row.id}</span>
                      {row.name}
                    </span>
                    <span className="mt-0.5 block text-2xs text-muted">
                      {row.messageType} · {row.messageRef}
                    </span>
                  </span>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                sortValue: (row) => row.category,
                render: (row) => <Badge tone={row.category === 'Shop-floor' ? 'primary' : 'info'}>{row.category}</Badge>,
                hideBelow: 'sm',
              },
              { key: 'sent', header: 'Sent', align: 'right', sortValue: (row) => row.stats.sent, render: (row) => <span className="mono">{num(row.stats.sent)}</span> },
              {
                key: 'matched',
                header: 'Matched',
                align: 'right',
                sortValue: (row) => row.stats.matched,
                render: (row) => (
                  <span className="mono text-success">
                    {num(row.stats.matched)} <span className="text-2xs text-muted">{pct(row.stats.matched, row.stats.sent)} %</span>
                  </span>
                ),
              },
              {
                key: 'mismatched',
                header: 'Mismatched',
                align: 'right',
                sortValue: (row) => row.stats.mismatched,
                render: (row) => (
                  <span className={cn('mono', row.stats.mismatched > 0 && 'text-danger')}>{row.stats.mismatched}</span>
                ),
              },
              {
                key: 'missing',
                header: 'Missing',
                align: 'right',
                sortValue: (row) => row.stats.missing,
                render: (row) => <span className={cn('mono', row.stats.missing > 0 && 'text-danger')}>{row.stats.missing}</span>,
              },
              {
                key: 'duplicated',
                header: 'Duplicated',
                align: 'right',
                sortValue: (row) => row.stats.duplicated,
                render: (row) => (
                  <span className={cn('mono', row.stats.duplicated > 0 && 'text-accent')}>{row.stats.duplicated}</span>
                ),
              },
              {
                key: 'sla',
                header: 'Window',
                align: 'right',
                sortValue: (row) => row.slaMinutes,
                render: (row) => <span className="mono text-2xs text-muted">{row.slaMinutes} min</span>,
                hideBelow: 'md',
              },
            ]}
          />
        </Card>
      ) : null}

      {tab === 'records' ? (
        <Card>
          <CardHeader
            title="Records that crossed the interfaces"
            description="Click a record for the field-by-field compare between source and target."
          />
          <DataTable
            rows={interfaceRecords}
            getRowId={(row) => row.id}
            searchText={(row) => `${row.key} ${row.reference} ${row.vehicle ?? ''} ${row.messageId}`}
            searchPlaceholder="Search by key, reference, vehicle or message id"
            onRowClick={(row) => setOpenRecordId(row.id)}
            activeRowId={openRecordId}
            rowTone={(row) =>
              row.status === 'Mismatched' || row.status === 'Missing'
                ? 'danger'
                : row.status === 'Duplicated'
                  ? 'accent'
                  : undefined
            }
            filters={[
              {
                key: 'status',
                label: 'Status',
                options: ['Matched', 'Mismatched', 'Missing', 'Duplicated'].map((value) => ({ value, label: value })),
                match: (row, value) => row.status === value,
              },
              {
                key: 'interface',
                label: 'Interface',
                options: Array.from(new Set(interfaceRecords.map((row) => row.interfaceId))).map((value) => ({
                  value,
                  label: value,
                })),
                match: (row, value) => row.interfaceId === value,
              },
              {
                key: 'site',
                label: 'Site',
                options: ['PL01', 'PL03', 'YD02', 'YD05'].map((value) => ({ value, label: value })),
                match: (row, value) => row.site === value,
              },
            ]}
            columns={[
              {
                key: 'key',
                header: 'Business key',
                sortValue: (row) => row.key,
                render: (row) => (
                  <span className="block">
                    <span className="mono text-xs font-medium text-text">{row.key}</span>
                    <span className="mt-0.5 block text-2xs text-muted">{row.reference}</span>
                  </span>
                ),
              },
              {
                key: 'interface',
                header: 'Interface',
                sortValue: (row) => row.interfaceId,
                render: (row) => <InterfaceRef id={row.interfaceId} label={row.interfaceId} />,
                hideBelow: 'sm',
              },
              {
                key: 'vehicle',
                header: 'Vehicle',
                sortValue: (row) => row.vehicle ?? '',
                render: (row) => (row.vehicle ? <VehicleRef vehicle={row.vehicle} /> : <span className="text-2xs text-muted">-</span>),
              },
              {
                key: 'status',
                header: 'Status',
                sortValue: (row) => row.status,
                render: (row) => (
                  <Badge
                    tone={
                      row.status === 'Matched'
                        ? 'success'
                        : row.status === 'Duplicated'
                          ? 'accent'
                          : 'danger'
                    }
                  >
                    {row.status}
                  </Badge>
                ),
              },
              {
                key: 'latency',
                header: 'Latency',
                align: 'right',
                sortValue: (row) => latencyMinutes(row) ?? 9999,
                render: (row) => {
                  const minutes = latencyMinutes(row)
                  const link = find.interface(row.interfaceId)
                  const late = minutes !== null && link ? minutes > link.slaMinutes : false
                  return (
                    <span className={cn('mono', late && 'text-danger')}>
                      {minutes === null ? 'not received' : `${minutes} min`}
                    </span>
                  )
                },
                hideBelow: 'sm',
              },
              {
                key: 'sent',
                header: 'Sent at',
                align: 'right',
                sortValue: (row) => row.sentAt,
                render: (row) => <span className="text-2xs text-muted">{dateTime(row.sentAt)}</span>,
                hideBelow: 'md',
              },
            ]}
          />
        </Card>
      ) : null}

      {tab === 'trace' ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <Card>
            <CardHeader
              title="Follow the truck"
              description="Pick a vehicle, wagon or container and trace it across every system on a timeline."
              icon={<Truck className="h-4 w-4 text-primary" />}
            />
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  size="sm"
                  className="min-w-[11rem]"
                  value={vehicle}
                  onChange={(event) => setVehicle(event.target.value)}
                  options={TRACEABLE_VEHICLES.map((value) => ({ value, label: value }))}
                  aria-label="Vehicle"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    patch({ vehicle })
                    setParams({ trace: vehicle })
                    void api.traceVehicle(vehicle).then((result) => {
                      setTrace(result)
                      toast({
                        title: `Tracing ${vehicle}`,
                        description: `${result.steps.length} interface records found.`,
                        tone: 'info',
                      })
                    })
                  }}
                >
                  <Search className="h-3.5 w-3.5" />
                  Trace
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRACEABLE_VEHICLES.slice(0, 8).map((value) => (
                  <Chip
                    key={value}
                    active={vehicle === value}
                    onClick={() => {
                      setVehicle(value)
                      setParams({ trace: value })
                      void api.traceVehicle(value).then(setTrace)
                    }}
                  >
                    {value}
                  </Chip>
                ))}
              </div>
              <p className="text-2xs text-muted">
                VH-7741, VH-8126 and VH-9043 are the three trucks in the open critical weight finding. WGN-20418 is the
                recycling wagon whose molybdenum value was lost.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={trace ? `${trace.vehicle} across the landscape` : 'Trace'}
              description={
                trace
                  ? `${trace.steps.length} steps, ${trace.steps.filter((step) => step.status !== 'ok').length} not clean. Click a step to open the record compare.`
                  : 'Press Trace to follow a vehicle.'
              }
            />
            <CardBody>
              {!trace ? (
                <EmptyState title="Nothing traced yet" icon={<Truck className="h-5 w-5" />} />
              ) : trace.steps.length === 0 ? (
                <EmptyState
                  title={`No records found for ${trace.vehicle}`}
                  description="Pick another vehicle from the list."
                />
              ) : (
                <Timeline entries={traceEntries} />
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {/* ----------------------------------------------------- interface drawer */}
      <Drawer
        open={Boolean(openInterface)}
        onClose={() => {
          setOpenInterfaceId(null)
          setParams({})
        }}
        width="w-full max-w-2xl"
        title={openInterface?.name ?? ''}
        subtitle={openInterface?.description}
        badges={
          openInterface ? (
            <>
              <HealthBadge health={interfaceHealth(openInterface)} />
              <Badge tone="primary">{openInterface.messageType}</Badge>
              <Badge>{openInterface.category}</Badge>
            </>
          ) : undefined
        }
        footer={
          openInterface ? (
            <div className="flex items-center justify-between gap-2">
              <PageRef to={`/landscape?if=${openInterface.id}`}>See it in the landscape</PageRef>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  patch({ interfaceIds: [openInterface.id] })
                  navigate('/run')
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Test this interface
              </Button>
            </div>
          ) : undefined
        }
      >
        {openInterface ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Source', value: <SystemRef id={openInterface.sourceSystemId} /> },
                { label: 'Target', value: <SystemRef id={openInterface.targetSystemId} /> },
                { label: 'Message', value: openInterface.messageRef },
                { label: 'Volume', value: `${num(openInterface.volumePerDay)} per day` },
                { label: 'Interface window', value: `${openInterface.slaMinutes} minutes` },
                {
                  label: 'Match rate',
                  value: `${pct(openInterface.stats.matched, openInterface.stats.sent)} %`,
                },
              ]}
            />
            <div>
              <p className="label mb-1.5">Records</p>
              <DataTable
                rows={db.interfaceRecords.filter((record) => record.interfaceId === openInterface.id)}
                getRowId={(row) => row.id}
                dense
                maxHeight="max-h-80"
                onRowClick={(row) => setOpenRecordId(row.id)}
                columns={[
                  {
                    key: 'key',
                    header: 'Key',
                    render: (row) => <span className="mono text-xs">{row.key}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <Badge tone={row.status === 'Matched' ? 'success' : row.status === 'Duplicated' ? 'accent' : 'danger'}>
                        {row.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'vehicle',
                    header: 'Vehicle',
                    render: (row) => (row.vehicle ? <VehicleRef vehicle={row.vehicle} /> : <span className="text-2xs text-muted">-</span>),
                  },
                ]}
                emptyTitle="No sample records for this interface"
              />
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* -------------------------------------------------------- record drawer */}
      <Drawer
        open={Boolean(openRecord)}
        onClose={() => setOpenRecordId(null)}
        width="w-full max-w-2xl"
        title={openRecord ? `Record ${openRecord.key}` : ''}
        subtitle={openRecord ? `${find.interface(openRecord.interfaceId)?.name} · ${openRecord.reference}` : ''}
        badges={
          openRecord ? (
            <>
              <Badge
                tone={openRecord.status === 'Matched' ? 'success' : openRecord.status === 'Duplicated' ? 'accent' : 'danger'}
              >
                {openRecord.status}
              </Badge>
              <Badge tone="neutral">{openRecord.site}</Badge>
              {openRecord.findingId ? <FindingRef id={openRecord.findingId} label={openRecord.findingId} /> : null}
            </>
          ) : undefined
        }
        footer={
          openRecord?.vehicle ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setVehicle(openRecord.vehicle!)
                setOpenRecordId(null)
                setTab('trace')
                setParams({ trace: openRecord.vehicle! })
                void api.traceVehicle(openRecord.vehicle!).then(setTrace)
              }}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Follow {openRecord.vehicle}
            </Button>
          ) : undefined
        }
      >
        {openRecord ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Message id', value: <span className="mono">{openRecord.messageId}</span> },
                { label: 'Sent at', value: dateTime(openRecord.sentAt) },
                {
                  label: 'Received at',
                  value: openRecord.receivedAt ? dateTime(openRecord.receivedAt) : 'never received',
                },
                {
                  label: 'Latency',
                  value:
                    latencyMinutes(openRecord) === null ? 'not received' : `${latencyMinutes(openRecord)} minutes`,
                },
              ]}
            />
            <div>
              <p className="label mb-1.5">Field-by-field compare</p>
              <FieldCompareTable fields={openRecord.fields} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GitCompareArrows className="h-3.5 w-3.5 text-muted" />
              <InterfaceRef id={openRecord.interfaceId} />
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
