import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity,
  Database,
  GitCompareArrows,
  Network,
  Play,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, Chip, EmptyState, Input, KeyValue, Progress } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { Tabs } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/ui/table'
import { LiveLog } from '@/components/common/LiveLog'
import { RowsTable } from '@/components/common/evidence'
import { HealthBadge, HealthDot, SeverityBadge } from '@/components/common/badges'
import { DataSourcePicker, SelectionSummary, SystemPicker } from '@/components/common/selectors'
import { FindingRef, InterfaceRef, PageRef, ProcessRef, ScenarioRef, SystemRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import { db, find } from '@/lib/db'
import * as api from '@/lib/api'
import { DATA_CHECK_DEFINITIONS } from '@/data/testdata'
import { dateTime, num, relativeTo } from '@/lib/format'
import { NOW_ISO } from '@/lib/clock'
import { cn, pct, vehicleInRow } from '@/lib/utils'
import type {
  DataCheckKind,
  DataCheckResult,
  DataSource,
  Health,
  InterfaceLink,
  PlainRuleResult,
  SystemNode,
} from '@/lib/types'

/* --------------------------------------------------------------- helpers */

function interfaceHealth(link: InterfaceLink): Health {
  const bad = link.stats.mismatched + link.stats.missing + link.stats.duplicated
  if (link.stats.sent === 0) return 'Not tested'
  const ratio = bad / link.stats.sent
  if (ratio === 0) return 'Healthy'
  if (ratio < 0.02) return 'Attention'
  return 'At risk'
}

function systemHealth(system: SystemNode): Health {
  const links = db.interfaces.filter((l) => l.sourceSystemId === system.id || l.targetSystemId === system.id)
  if (system.connection === 'Not connected') return 'At risk'
  const healths = links.map(interfaceHealth)
  if (healths.includes('At risk')) return 'At risk'
  if (healths.includes('Attention') || system.connection === 'Degraded') return 'Attention'
  return 'Healthy'
}

const HEALTH_STROKE: Record<Health, string> = {
  Healthy: 'hsl(var(--success))',
  Attention: 'hsl(var(--accent))',
  'At risk': 'hsl(var(--danger))',
  'Not tested': 'hsl(var(--border))',
}

function wrapLabel(name: string): string[] {
  const words = name.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > 20) {
      lines.push(current.trim())
      current = word
    } else {
      current = `${current} ${word}`
    }
  }
  if (current.trim()) lines.push(current.trim())
  return lines.slice(0, 2)
}

/* -------------------------------------------------------------- diagram */

const NODE_W = 182
const NODE_H = 66

function LandscapeDiagram({
  onSystemClick,
  onInterfaceClick,
  activeSystemId,
  categoryFilter,
}: {
  onSystemClick: (id: string) => void
  onInterfaceClick: (id: string) => void
  activeSystemId?: string | null
  categoryFilter: 'ALL' | 'Shop-floor' | 'Financial'
}) {
  const [hoverSystem, setHoverSystem] = useState<string | null>(null)
  const [hoverInterface, setHoverInterface] = useState<string | null>(null)

  const links = db.interfaces.filter((link) => categoryFilter === 'ALL' || link.category === categoryFilter)

  const centre = (id: string) => {
    const system = find.system(id)
    return { x: (system?.x ?? 0) + NODE_W / 2, y: (system?.y ?? 0) + NODE_H / 2 }
  }

  return (
    <div className="scroll-thin overflow-x-auto">
      <svg viewBox="0 0 1000 620" className="h-[32rem] w-full min-w-[56rem]" role="img" aria-label="Landscape diagram">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--text-muted))" />
          </marker>
        </defs>

        {(['Shop floor', 'Core ERP', 'Finance and output'] as const).map((band, index) => (
          <g key={band}>
            <rect
              x={index * 340 + 10}
              y={10}
              width={320}
              height={600}
              rx={12}
              fill="hsl(var(--surface-2) / 0.5)"
              stroke="hsl(var(--border))"
              strokeDasharray="4 4"
            />
            <text x={index * 340 + 24} y={34} className="fill-muted text-[11px] font-semibold uppercase tracking-wider">
              {band}
            </text>
          </g>
        ))}

        {links.map((link) => {
          const from = centre(link.sourceSystemId)
          const to = centre(link.targetSystemId)
          const health = interfaceHealth(link)
          const connected =
            !activeSystemId || link.sourceSystemId === activeSystemId || link.targetSystemId === activeSystemId
          const hovered = hoverInterface === link.id
          const highlight =
            hovered ||
            (hoverSystem && (link.sourceSystemId === hoverSystem || link.targetSystemId === hoverSystem))
          const midX = (from.x + to.x) / 2
          const path =
            Math.abs(from.x - to.x) < 20
              ? `M ${from.x + NODE_W / 2 - 10} ${from.y} C ${from.x + 150} ${from.y}, ${to.x + 150} ${to.y}, ${to.x + NODE_W / 2 - 10} ${to.y}`
              : `M ${from.x + NODE_W / 2 - 6} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - NODE_W / 2 + 6} ${to.y}`
          return (
            <g
              key={link.id}
              className="cursor-pointer"
              opacity={connected ? 1 : 0.18}
              onClick={() => onInterfaceClick(link.id)}
              onMouseEnter={() => setHoverInterface(link.id)}
              onMouseLeave={() => setHoverInterface(null)}
            >
              <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
              <path
                d={path}
                fill="none"
                stroke={HEALTH_STROKE[health]}
                strokeWidth={highlight ? 3.2 : 1.8}
                strokeDasharray={link.messageType === 'File' || link.messageType === 'SFTP' ? '6 4' : undefined}
                markerEnd="url(#arrow)"
              />
              {highlight ? (
                <g>
                  <rect
                    x={midX - 58}
                    y={(from.y + to.y) / 2 - 12}
                    width={116}
                    height={22}
                    rx={6}
                    fill="hsl(var(--surface))"
                    stroke="hsl(var(--border))"
                  />
                  <text
                    x={midX}
                    y={(from.y + to.y) / 2 + 3}
                    textAnchor="middle"
                    className="fill-text text-[10px] font-semibold"
                  >
                    {link.id} · {link.messageType}
                  </text>
                </g>
              ) : null}
            </g>
          )
        })}

        {db.systems.map((system) => {
          const health = systemHealth(system)
          const isActive = activeSystemId === system.id
          const lines = wrapLabel(system.name)
          return (
            <g
              key={system.id}
              transform={`translate(${system.x - NODE_W / 2 + 91} ${system.y})`}
              className="cursor-pointer"
              onClick={() => onSystemClick(system.id)}
              onMouseEnter={() => setHoverSystem(system.id)}
              onMouseLeave={() => setHoverSystem(null)}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="hsl(var(--surface))"
                stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeWidth={isActive ? 2.5 : 1.4}
              />
              <circle cx={14} cy={16} r={4} fill={HEALTH_STROKE[health]} />
              {lines.map((line, index) => (
                <text key={index} x={26} y={20 + index * 13} className="fill-text text-[11px] font-semibold">
                  {line}
                </text>
              ))}
              <text x={12} y={NODE_H - 22} className="fill-muted text-[9.5px]">
                {system.backend}
              </text>
              <text x={12} y={NODE_H - 9} className="fill-muted text-[9.5px]">
                {system.access.slice(0, 4).join(' · ')}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ----------------------------------------------------------------- page */

export default function LandscapePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { selection, patch } = useSelection()

  const [tab, setTab] = useState<'diagram' | 'systems' | 'checks'>('diagram')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Shop-floor' | 'Financial'>('ALL')
  const [openSystemId, setOpenSystemId] = useState<string | null>(params.get('system'))
  const [openInterfaceId, setOpenInterfaceId] = useState<string | null>(params.get('if'))
  const [checkKinds, setCheckKinds] = useState<DataCheckKind[]>(['completeness', 'duplicates', 'cross-system-match'])
  const [checkJobId, setCheckJobId] = useState<string | null>(null)
  const [rule, setRule] = useState('Net weight must equal gross weight minus tare weight')
  const [ruleSourceId, setRuleSourceId] = useState('DS-YARD-TICKET')
  const [ruleJobId, setRuleJobId] = useState<string | null>(null)
  const [openRows, setOpenRows] = useState<DataCheckResult | null>(null)

  const checkJob = useJob<DataCheckResult[]>(checkJobId)
  const ruleJob = useJob<PlainRuleResult>(ruleJobId)
  const { data: systems } = useApi(() => api.getSystems(), [])
  const { data: interfaces } = useApi(() => api.getInterfaces(), [])

  useEffect(() => {
    const ds = params.get('ds')
    if (ds && !selection.dataSourceIds.includes(ds)) {
      patch({ dataSourceIds: [ds] })
      setTab('checks')
    }
    if (params.get('system')) setOpenSystemId(params.get('system'))
    if (params.get('if')) setOpenInterfaceId(params.get('if'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const openSystem = openSystemId ? find.system(openSystemId) : undefined
  const openInterface = openInterfaceId ? find.interface(openInterfaceId) : undefined

  const visibleSources = useMemo(
    () =>
      db.dataSources.filter(
        (source) => selection.systemIds.length === 0 || selection.systemIds.includes(source.systemId),
      ),
    [selection.systemIds],
  )

  function traceRow(row: string[]) {
    const vehicle = vehicleInRow(row)
    if (!vehicle) return
    patch({ vehicle })
    navigate(`/interfaces?trace=${vehicle}`)
  }

  const results = checkJob?.status === 'done' ? (checkJob.result ?? []) : db.dataCheckResults.slice(0, 12)
  const ruleResult = ruleJob?.status === 'done' ? ruleJob.result : db.plainRuleResults[0]

  const sourceColumns: Column<DataSource>[] = [
    {
      key: 'name',
      header: 'Data source',
      sortValue: (row) => row.name,
      render: (row) => (
        <span className="block">
          <span className="mono font-medium text-text">{row.name}</span>
          <span className="mt-0.5 block text-2xs text-muted">{row.description}</span>
        </span>
      ),
    },
    {
      key: 'system',
      header: 'System',
      sortValue: (row) => row.systemId,
      render: (row) => <SystemRef id={row.systemId} />,
      hideBelow: 'sm',
    },
    { key: 'kind', header: 'Kind', sortValue: (row) => row.kind, render: (row) => <Badge>{row.kind}</Badge> },
    {
      key: 'dataType',
      header: 'Data type',
      sortValue: (row) => row.dataType,
      render: (row) => <span className="text-xs text-muted">{row.dataType}</span>,
      hideBelow: 'md',
    },
    {
      key: 'rows',
      header: 'Rows',
      align: 'right',
      sortValue: (row) => row.rowCount,
      render: (row) => <span className="mono">{num(row.rowCount)}</span>,
    },
    {
      key: 'changed',
      header: 'Last change',
      align: 'right',
      sortValue: (row) => row.lastChangedAt,
      render: (row) => <span className="text-xs text-muted">{relativeTo(row.lastChangedAt, NOW_ISO)}</span>,
      hideBelow: 'md',
    },
  ]

  return (
    <>
      <PageHeader
        title="Landscape"
        description="Every system, interface and data source in scope. Click a system to see what it holds and run checks on it, click an interface to see the messages that crossed it."
        requirements={['R5', 'R8']}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/interfaces')}>
              <GitCompareArrows className="h-3.5 w-3.5" />
              Interface results
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setTab('checks')
              }}
            >
              <Database className="h-3.5 w-3.5" />
              Choose data to check
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SystemPicker selected={selection.systemIds} onChange={(values) => patch({ systemIds: values })} />
          <DataSourcePicker
            selected={selection.dataSourceIds}
            onChange={(values) => patch({ dataSourceIds: values })}
            systemIds={selection.systemIds}
          />
          <div className="inline-flex items-center gap-1.5">
            {(['ALL', 'Shop-floor', 'Financial'] as const).map((value) => (
              <Chip key={value} active={categoryFilter === value} onClick={() => setCategoryFilter(value)}>
                {value === 'ALL' ? 'All interfaces' : value}
              </Chip>
            ))}
          </div>
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'diagram', label: 'Data flow diagram', icon: <Network className="h-3.5 w-3.5" /> },
          { value: 'systems', label: 'Systems', count: systems?.length ?? 0 },
          { value: 'checks', label: 'Data sources and checks', count: visibleSources.length },
        ]}
      />

      {tab === 'diagram' ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader
              title="How data moves"
              description="Solid lines are messages and API calls, dashed lines are files. Line colour is the interface health. Click any node or line."
              actions={
                <div className="flex items-center gap-2 text-2xs">
                  <span className="inline-flex items-center gap-1">
                    <HealthDot health="Healthy" /> clean
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HealthDot health="Attention" /> watch
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HealthDot health="At risk" /> failing
                  </span>
                </div>
              }
            />
            <CardBody className="p-1.5">
              <LandscapeDiagram
                activeSystemId={openSystemId ?? selection.systemIds[0] ?? null}
                categoryFilter={categoryFilter}
                onSystemClick={(id) => {
                  setOpenSystemId(id)
                  setParams({ system: id })
                }}
                onInterfaceClick={(id) => {
                  setOpenInterfaceId(id)
                  setParams({ if: id })
                }}
              />
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Interfaces by health" description="Click an interface to open its records." />
              <CardBody className="space-y-1.5 p-2">
                {(interfaces ?? [])
                  .filter((link) => categoryFilter === 'ALL' || link.category === categoryFilter)
                  .map((link) => {
                    const health = interfaceHealth(link)
                    const bad = link.stats.mismatched + link.stats.missing + link.stats.duplicated
                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => {
                          setOpenInterfaceId(link.id)
                          setParams({ if: link.id })
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface2"
                      >
                        <HealthDot health={health} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-text">{link.name}</span>
                          <span className="block text-2xs text-muted">
                            {link.messageType} · {num(link.volumePerDay)} per day · {bad} not clean
                          </span>
                        </span>
                        <Badge tone={health === 'Healthy' ? 'success' : health === 'Attention' ? 'accent' : 'danger'}>
                          {pct(link.stats.matched, link.stats.sent)} %
                        </Badge>
                      </button>
                    )
                  })}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Processes across this landscape" />
              <CardBody className="space-y-1.5 p-2">
                {db.processes.map((process) => (
                  <div key={process.id} className="flex items-center justify-between gap-2 px-1 py-0.5">
                    <ProcessRef id={process.id} />
                    <span className="text-2xs text-muted">
                      {process.systemIds.length} systems · {process.interfaceIds.length} interfaces
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'systems' ? (
        <Card>
          <CardHeader title="Systems in scope" description="Click a row for backend, data types, connection status and the scenarios that touch it." />
          <DataTable
            rows={(systems ?? []).filter(
              (system) => selection.systemIds.length === 0 || selection.systemIds.includes(system.id),
            )}
            getRowId={(row) => row.id}
            searchText={(row) => `${row.name} ${row.role} ${row.backend} ${row.access.join(' ')}`}
            searchPlaceholder="Search systems"
            onRowClick={(row) => {
              setOpenSystemId(row.id)
              setParams({ system: row.id })
            }}
            filters={[
              {
                key: 'band',
                label: 'Band',
                options: [
                  { value: 'Shop floor', label: 'Shop floor' },
                  { value: 'Core ERP', label: 'Core ERP' },
                  { value: 'Finance and output', label: 'Finance and output' },
                ],
                match: (row, value) => row.band === value,
              },
              {
                key: 'connection',
                label: 'Connection',
                options: [
                  { value: 'Connected', label: 'Connected' },
                  { value: 'Degraded', label: 'Degraded' },
                  { value: 'Not connected', label: 'Not connected' },
                ],
                match: (row, value) => row.connection === value,
              },
            ]}
            columns={[
              {
                key: 'name',
                header: 'System',
                sortValue: (row) => row.name,
                render: (row) => (
                  <span className="block">
                    <span className="flex items-center gap-2 text-sm font-medium text-text">
                      <HealthDot health={systemHealth(row)} />
                      {row.name}
                    </span>
                    <span className="mt-0.5 block text-2xs text-muted">{row.role}</span>
                  </span>
                ),
              },
              { key: 'band', header: 'Band', sortValue: (row) => row.band, render: (row) => <Badge>{row.band}</Badge>, hideBelow: 'sm' },
              {
                key: 'backend',
                header: 'Backend',
                sortValue: (row) => row.backend,
                render: (row) => <span className="text-xs text-text">{row.backend}</span>,
              },
              {
                key: 'access',
                header: 'Access',
                render: (row) => <span className="mono text-2xs text-muted">{row.access.join(', ')}</span>,
                hideBelow: 'md',
              },
              {
                key: 'sites',
                header: 'Sites',
                render: (row) => <span className="mono text-2xs">{row.sites.join(' ')}</span>,
                hideBelow: 'md',
              },
              {
                key: 'connection',
                header: 'Connection',
                sortValue: (row) => row.connection,
                render: (row) => (
                  <Badge tone={row.connection === 'Connected' ? 'success' : row.connection === 'Degraded' ? 'accent' : 'danger'}>
                    {row.connection}
                  </Badge>
                ),
              },
            ]}
          />
        </Card>
      ) : null}

      {tab === 'checks' ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Choose what data to check"
                description="Tick the tables or collections, pick the checks and run them. Only the selected ones are run."
                actions={
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={selection.dataSourceIds.length === 0 || checkKinds.length === 0}
                    onClick={() => {
                      const jobId = api.runDataChecks({ dataSourceIds: selection.dataSourceIds, kinds: checkKinds })
                      setCheckJobId(jobId)
                      toast({
                        title: 'Data checks started',
                        description: `${checkKinds.length} check types on ${selection.dataSourceIds.length} data sources.`,
                        tone: 'info',
                      })
                    }}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run selected checks
                  </Button>
                }
              />
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="label mr-1">Checks</span>
                  {DATA_CHECK_DEFINITIONS.map((definition) => (
                    <Chip
                      key={definition.kind}
                      active={checkKinds.includes(definition.kind)}
                      title={definition.plain}
                      onClick={() =>
                        setCheckKinds((kinds) =>
                          kinds.includes(definition.kind)
                            ? kinds.filter((kind) => kind !== definition.kind)
                            : [...kinds, definition.kind],
                        )
                      }
                    >
                      {definition.label}
                    </Chip>
                  ))}
                </div>
                <div className="overflow-hidden rounded-lg border border-line">
                  <DataTable
                    rows={visibleSources}
                    columns={sourceColumns}
                    getRowId={(row) => row.id}
                    dense
                    maxHeight="max-h-80"
                    searchText={(row) => `${row.name} ${row.description} ${row.kind} ${row.dataType}`}
                    searchPlaceholder="Search tables and collections"
                    selectable
                    selectedIds={selection.dataSourceIds}
                    onToggleSelect={(id) =>
                      patch({
                        dataSourceIds: selection.dataSourceIds.includes(id)
                          ? selection.dataSourceIds.filter((value) => value !== id)
                          : [...selection.dataSourceIds, id],
                      })
                    }
                    onToggleAll={(ids, allSelected) =>
                      patch({
                        dataSourceIds: allSelected
                          ? selection.dataSourceIds.filter((id) => !ids.includes(id))
                          : Array.from(new Set([...selection.dataSourceIds, ...ids])),
                      })
                    }
                    onRowClick={(row) => {
                      setOpenSystemId(row.systemId)
                    }}
                    filters={[
                      {
                        key: 'dataType',
                        label: 'Data type',
                        options: Array.from(new Set(visibleSources.map((source) => source.dataType))).map((value) => ({
                          value,
                          label: value,
                        })),
                        match: (row, value) => row.dataType === value,
                      },
                      {
                        key: 'kind',
                        label: 'Kind',
                        options: Array.from(new Set(visibleSources.map((source) => source.kind))).map((value) => ({
                          value,
                          label: value,
                        })),
                        match: (row, value) => row.kind === value,
                      },
                    ]}
                    emptyTitle="No data sources for this system selection"
                  />
                </div>
                <p className="text-2xs text-muted">
                  {selection.dataSourceIds.length} data sources and {checkKinds.length} check types selected. Tick rows to
                  choose what is checked; click a row to open the system.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Check results"
                description="Click a result to see the rows behind it."
                actions={
                  results.length > 0 ? <Badge tone="neutral">{results.length} results</Badge> : undefined
                }
              />
              {results.length === 0 ? (
                <CardBody>
                  <EmptyState
                    title="No checks run yet"
                    description="Select data sources and check types, then press Run selected checks."
                    icon={<Database className="h-5 w-5" />}
                  />
                </CardBody>
              ) : (
                <CardBody className="space-y-2">
                  {results.map((result) => {
                    const source = find.dataSource(result.dataSourceId)
                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => setOpenRows(result)}
                        className="flex w-full items-start gap-3 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-surface2"
                      >
                        <Badge
                          tone={result.status === 'Passed' ? 'success' : result.status === 'Warning' ? 'accent' : 'danger'}
                        >
                          {result.status}
                        </Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-text">
                            {DATA_CHECK_DEFINITIONS.find((d) => d.kind === result.kind)?.label} ·{' '}
                            <span className="mono">{source?.name}</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">{result.plain}</span>
                          <span className="mt-1 block text-2xs text-muted">
                            {num(result.checkedRows)} rows checked · {result.failedRows} failed
                          </span>
                        </span>
                        {result.findingId ? <FindingRef id={result.findingId} label={result.findingId} /> : null}
                      </button>
                    )
                  })}
                </CardBody>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Plain-English rule"
                description="Write the business rule in your own words. The AI turns it into a query and runs it."
                icon={<Wand2 className="h-4 w-4 text-ai" />}
              />
              <CardBody className="space-y-2.5">
                <Input value={rule} onChange={(event) => setRule(event.target.value)} placeholder="Write a rule" />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={ruleSourceId}
                    onChange={(event) => setRuleSourceId(event.target.value)}
                    className="h-8 min-w-[12rem] flex-1 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-text"
                    aria-label="Data source for the rule"
                  >
                    {db.dataSources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ai"
                    size="sm"
                    disabled={rule.trim().length < 6}
                    onClick={() => {
                      setRuleJobId(api.runPlainRule({ rule, dataSourceId: ruleSourceId }))
                      toast({ title: 'Rule sent to the AI', description: 'Translating it into a data check.', tone: 'ai' })
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Translate and run
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Net weight must equal gross weight minus tare weight',
                    'A gate pass must create only one goods receipt',
                    'Stock unit must be the item base unit',
                  ].map((example) => (
                    <Chip key={example} onClick={() => setRule(example)}>
                      {example.length > 38 ? `${example.slice(0, 36)}...` : example}
                    </Chip>
                  ))}
                </div>
                {ruleJob ? (
                  <LiveLog
                    lines={ruleJob.log}
                    status={ruleJob.status}
                    progressPct={ruleJob.progressPct}
                    currentLabel={ruleJob.currentLabel}
                    height="h-32"
                    title="AI translation"
                  />
                ) : null}
                {ruleResult ? (
                  <div className="space-y-2 rounded-lg border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={ruleResult.status === 'Passed' ? 'success' : 'danger'}>{ruleResult.status}</Badge>
                      <span className="text-2xs text-muted">
                        {num(ruleResult.checkedRows)} rows checked · {ruleResult.failedRows} failed
                      </span>
                    </div>
                    <p className="text-xs text-text">{ruleResult.assertion.plain}</p>
                    <pre className="scroll-thin max-h-40 overflow-auto rounded-md border border-line bg-surface2/60 px-2.5 py-2 font-mono text-[0.72rem] leading-relaxed text-text">
                      {ruleResult.generatedQuery.text}
                    </pre>
                    {ruleResult.rows ? <RowsTable spec={ruleResult.rows} onRowClick={traceRow} /> : null}
                    <p className="text-xs text-muted">{ruleResult.explanation}</p>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            {checkJob ? (
              <Card>
                <CardHeader title="Check run log" />
                <CardBody>
                  <LiveLog
                    lines={checkJob.log}
                    status={checkJob.status}
                    progressPct={checkJob.progressPct}
                    currentLabel={checkJob.currentLabel}
                    height="h-48"
                  />
                </CardBody>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------- system drawer */}
      <Drawer
        open={Boolean(openSystem)}
        onClose={() => {
          setOpenSystemId(null)
          setParams({})
        }}
        title={openSystem?.name ?? ''}
        subtitle={openSystem?.role}
        badges={
          openSystem ? (
            <>
              <HealthBadge health={systemHealth(openSystem)} />
              <Badge tone="primary">{openSystem.backend}</Badge>
              <Badge
                tone={
                  openSystem.connection === 'Connected'
                    ? 'success'
                    : openSystem.connection === 'Degraded'
                      ? 'accent'
                      : 'danger'
                }
              >
                {openSystem.connection}
              </Badge>
            </>
          ) : undefined
        }
        footer={
          openSystem ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  patch({ systemIds: [openSystem.id] })
                  setTab('checks')
                  setOpenSystemId(null)
                }}
              >
                <Database className="h-3.5 w-3.5" />
                Check this system's data
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  patch({ systemIds: [openSystem.id] })
                  navigate('/run')
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Test scenarios on this system
              </Button>
            </div>
          ) : undefined
        }
      >
        {openSystem ? (
          <div className="space-y-5">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Backend', value: openSystem.backend },
                { label: 'Access methods', value: openSystem.access.join(', ') },
                { label: 'Band', value: openSystem.band },
                { label: 'Sites', value: openSystem.sites.join(', ') },
                { label: 'Owner role', value: openSystem.owner },
                { label: 'Data types', value: openSystem.dataTypes.join(', ') },
              ]}
            />
            <p className="text-xs text-muted">{openSystem.notes}</p>

            <div>
              <p className="label mb-1.5">Data sources ({db.dataSources.filter((s) => s.systemId === openSystem.id).length})</p>
              <div className="space-y-1">
                {db.dataSources
                  .filter((source) => source.systemId === openSystem.id)
                  .map((source) => (
                    <div key={source.id} className="flex items-start justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                      <Checkbox
                        checked={selection.dataSourceIds.includes(source.id)}
                        onChange={() =>
                          patch({
                            dataSourceIds: selection.dataSourceIds.includes(source.id)
                              ? selection.dataSourceIds.filter((id) => id !== source.id)
                              : [...selection.dataSourceIds, source.id],
                          })
                        }
                        label={<span className="mono">{source.name}</span>}
                        description={`${source.kind} · ${num(source.rowCount)} rows · changed ${relativeTo(source.lastChangedAt, NOW_ISO)}`}
                      />
                      <Badge>{source.dataType}</Badge>
                    </div>
                  ))}
              </div>
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                disabled={selection.dataSourceIds.length === 0}
                onClick={() => {
                  const jobId = api.runDataChecks({ dataSourceIds: selection.dataSourceIds, kinds: checkKinds })
                  setCheckJobId(jobId)
                  setOpenSystemId(null)
                  setTab('checks')
                  toast({ title: 'Data checks started', tone: 'info', description: `${selection.dataSourceIds.length} data sources.` })
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Run selected checks
              </Button>
            </div>

            <div>
              <p className="label mb-1.5">Interfaces</p>
              <div className="space-y-1">
                {db.interfaces
                  .filter((link) => link.sourceSystemId === openSystem.id || link.targetSystemId === openSystem.id)
                  .map((link) => (
                    <div key={link.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                      <span className="min-w-0">
                        <InterfaceRef id={link.id} />
                        <span className="block text-2xs text-muted">
                          {link.messageType} · {num(link.volumePerDay)} messages per day
                        </span>
                      </span>
                      <HealthBadge health={interfaceHealth(link)} />
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <p className="label mb-1.5">Scenarios that touch this system</p>
              <div className="space-y-1">
                {db.scenarios
                  .filter((scenario) => scenario.systemIds.includes(openSystem.id))
                  .slice(0, 8)
                  .map((scenario) => (
                    <div key={scenario.id} className="text-xs">
                      <ScenarioRef id={scenario.id} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* ---------------------------------------------------- interface drawer */}
      <Drawer
        open={Boolean(openInterface)}
        onClose={() => {
          setOpenInterfaceId(null)
          setParams({})
        }}
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
              <PageRef to={`/interfaces?if=${openInterface.id}`}>Open records and field compare</PageRef>
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
          <div className="space-y-5">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Source', value: <SystemRef id={openInterface.sourceSystemId} /> },
                { label: 'Target', value: <SystemRef id={openInterface.targetSystemId} /> },
                { label: 'Message type', value: `${openInterface.messageType} · ${openInterface.messageRef}` },
                { label: 'Volume', value: `${num(openInterface.volumePerDay)} per day` },
                { label: 'Interface window', value: `${openInterface.slaMinutes} minutes` },
                {
                  label: 'Last test run',
                  value: openInterface.lastTestRunId ? (
                    <PageRef to={`/run?run=${openInterface.lastTestRunId}`}>{openInterface.lastTestRunId}</PageRef>
                  ) : (
                    'not tested'
                  ),
                },
              ]}
            />

            <div>
              <p className="label mb-1.5">Message counts over the last day</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['Sent', openInterface.stats.sent, 'neutral'],
                    ['Received', openInterface.stats.received, 'neutral'],
                    ['Matched', openInterface.stats.matched, 'success'],
                    ['Mismatched', openInterface.stats.mismatched, 'danger'],
                    ['Missing', openInterface.stats.missing, 'danger'],
                    ['Duplicated', openInterface.stats.duplicated, 'accent'],
                  ] as const
                ).map(([label, value, tone]) => (
                  <div key={label} className="rounded-md border border-line px-2 py-1.5">
                    <p className="label">{label}</p>
                    <p
                      className={cn(
                        'text-sm font-semibold tabular-nums',
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
              <Progress
                className="mt-2"
                value={pct(openInterface.stats.matched, openInterface.stats.sent)}
                tone={interfaceHealth(openInterface) === 'Healthy' ? 'success' : 'accent'}
              />
            </div>

            <div>
              <p className="label mb-1.5">Data sources on both sides</p>
              <div className="flex flex-wrap gap-1.5">
                {openInterface.dataSourceIds.map((id) => (
                  <Badge key={id} tone="neutral" className="font-mono">
                    {find.dataSource(id)?.name ?? id}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="label mb-1.5">Open findings on this interface</p>
              {db.findings.filter((finding) => finding.interfaceIds.includes(openInterface.id)).length === 0 ? (
                <p className="text-xs text-muted">No findings on this interface.</p>
              ) : (
                <div className="space-y-1.5">
                  {db.findings
                    .filter((finding) => finding.interfaceIds.includes(openInterface.id))
                    .map((finding) => (
                      <div key={finding.id} className="flex items-start gap-2">
                        <SeverityBadge severity={finding.severity} />
                        <FindingRef id={finding.id} label={finding.title} />
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* ----------------------------------------------------- check rows drawer */}
      <Drawer
        open={Boolean(openRows)}
        onClose={() => setOpenRows(null)}
        title={openRows ? `${DATA_CHECK_DEFINITIONS.find((d) => d.kind === openRows.kind)?.label} result` : ''}
        subtitle={openRows ? find.dataSource(openRows.dataSourceId)?.name : ''}
        badges={
          openRows ? (
            <Badge tone={openRows.status === 'Passed' ? 'success' : openRows.status === 'Warning' ? 'accent' : 'danger'}>
              {openRows.status}
            </Badge>
          ) : undefined
        }
      >
        {openRows ? (
          <div className="space-y-4">
            <p className="text-sm text-text">{openRows.plain}</p>
            <KeyValue
              columns={2}
              rows={[
                { label: 'Rows checked', value: num(openRows.checkedRows) },
                { label: 'Rows failed', value: num(openRows.failedRows) },
                { label: 'Run at', value: dateTime(openRows.ranAt) },
                {
                  label: 'Finding',
                  value: openRows.findingId ? <FindingRef id={openRows.findingId} label={openRows.findingId} /> : 'none',
                },
              ]}
            />
            <div>
              <p className="label mb-1">{openRows.query.language} query · {openRows.query.source}</p>
              <pre className="scroll-thin max-h-48 overflow-auto rounded-md border border-line bg-surface2/60 px-2.5 py-2 font-mono text-[0.72rem] leading-relaxed text-text">
                {openRows.query.text}
              </pre>
            </div>
            {openRows.rows ? <RowsTable spec={openRows.rows} onRowClick={traceRow} /> : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigate('/reconciliation')
              }}
            >
              <Activity className="h-3.5 w-3.5" />
              Reconcile this data across systems
            </Button>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
