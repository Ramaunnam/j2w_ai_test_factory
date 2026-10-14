import type { ReactNode } from 'react'
import { ChevronDown, Filter, X } from 'lucide-react'
import { cn, groupBy } from '@/lib/utils'
import { Badge, Button, Checkbox, Chip, Select } from '@/components/ui/primitives'
import { Popover } from '@/components/ui/overlays'
import { db } from '@/lib/db'
import { useSelection } from '@/lib/selection'
import type { Environment, LoadProfile, ProcessId, ScenarioType, SiteCode } from '@/lib/types'

export const SITES: SiteCode[] = ['PL01', 'PL03', 'YD02', 'YD05']
export const SITE_LABELS: Record<SiteCode, string> = {
  PL01: 'PL01 Steel',
  PL03: 'PL03 Service Centre',
  YD02: 'YD02 Recycling',
  YD05: 'YD05 Recycling',
}

/* ---------------------------------------------------------- multi select */

export interface MultiOption {
  value: string
  label: string
  group?: string
  hint?: string
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel = 'All',
  width = 'w-80',
  icon,
}: {
  label: string
  options: MultiOption[]
  selected: string[]
  onChange: (values: string[]) => void
  allLabel?: string
  width?: string
  icon?: ReactNode
}) {
  const grouped = groupBy(options, (option) => option.group ?? '')
  const groups = Object.keys(grouped)
  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((option) => option.value === selected[0])?.label ?? '1 selected')
        : `${selected.length} selected`

  return (
    <Popover
      width={width}
      trigger={({ toggle, open }) => (
        <Button variant="secondary" size="sm" onClick={toggle} aria-expanded={open} className="max-w-[16rem]">
          {icon ?? <Filter className="h-3.5 w-3.5" />}
          <span className="truncate">
            <span className="text-muted">{label}: </span>
            {summary}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </Button>
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="label">{label}</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onChange(options.map((option) => option.value))}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
        </div>
        <div className="scroll-thin max-h-72 space-y-2 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group}>
              {group ? <p className="label mb-1">{group}</p> : null}
              <div className="space-y-1.5">
                {grouped[group].map((option) => (
                  <Checkbox
                    key={option.value}
                    checked={selected.includes(option.value)}
                    onChange={() =>
                      onChange(
                        selected.includes(option.value)
                          ? selected.filter((value) => value !== option.value)
                          : [...selected, option.value],
                      )
                    }
                    label={option.label}
                    description={option.hint}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Popover>
  )
}

/* --------------------------------------------------------------- pickers */

export function ProcessPicker({
  value,
  onChange,
  includeAll = true,
  className,
}: {
  value: ProcessId | 'ALL'
  onChange: (value: ProcessId | 'ALL') => void
  includeAll?: boolean
  className?: string
}) {
  const options = [
    ...(includeAll ? [{ value: 'ALL', label: 'All processes' }] : []),
    ...db.processes.map((process) => ({ value: process.id, label: `${process.id} ${process.name}` })),
  ]
  return (
    <Select
      size="sm"
      className={cn('min-w-[13rem]', className)}
      value={value}
      onChange={(event) => onChange(event.target.value as ProcessId | 'ALL')}
      options={options}
      aria-label="Process"
    />
  )
}

export function SystemPicker({ selected, onChange }: { selected: string[]; onChange: (values: string[]) => void }) {
  return (
    <MultiSelect
      label="Systems"
      allLabel="All systems"
      selected={selected}
      onChange={onChange}
      options={db.systems.map((system) => ({
        value: system.id,
        label: system.name,
        group: system.band,
        hint: `${system.backend} · ${system.access.join(', ')}`,
      }))}
    />
  )
}

export function InterfacePicker({ selected, onChange }: { selected: string[]; onChange: (values: string[]) => void }) {
  return (
    <MultiSelect
      label="Interfaces"
      allLabel="All interfaces"
      width="w-96"
      selected={selected}
      onChange={onChange}
      options={db.interfaces.map((link) => ({
        value: link.id,
        label: `${link.id} ${link.name}`,
        group: link.category,
        hint: `${link.messageType} · ${link.volumePerDay} per day`,
      }))}
    />
  )
}

export function DataSourcePicker({
  selected,
  onChange,
  systemIds,
}: {
  selected: string[]
  onChange: (values: string[]) => void
  systemIds?: string[]
}) {
  const sources = db.dataSources.filter(
    (source) => !systemIds || systemIds.length === 0 || systemIds.includes(source.systemId),
  )
  return (
    <MultiSelect
      label="Data sources"
      allLabel="All data sources"
      width="w-96"
      selected={selected}
      onChange={onChange}
      options={sources.map((source) => ({
        value: source.id,
        label: source.name,
        group: db.systems.find((system) => system.id === source.systemId)?.name,
        hint: `${source.kind} · ${source.rowCount.toLocaleString('en-GB')} rows`,
      }))}
    />
  )
}

export function SitePicker({
  value,
  onChange,
  className,
}: {
  value: SiteCode | 'ALL'
  onChange: (value: SiteCode | 'ALL') => void
  className?: string
}) {
  return (
    <Select
      size="sm"
      className={cn('min-w-[11rem]', className)}
      value={value}
      onChange={(event) => onChange(event.target.value as SiteCode | 'ALL')}
      options={[{ value: 'ALL', label: 'All sites' }, ...SITES.map((site) => ({ value: site, label: SITE_LABELS[site] }))]}
      aria-label="Site"
    />
  )
}

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (range: { dateFrom?: string; dateTo?: string }) => void
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1">
      <span className="text-2xs font-medium text-muted">From</span>
      <input
        type="date"
        value={from}
        onChange={(event) => onChange({ dateFrom: event.target.value })}
        className="bg-transparent text-xs text-text outline-none"
        aria-label="Date from"
      />
      <span className="text-2xs font-medium text-muted">to</span>
      <input
        type="date"
        value={to}
        onChange={(event) => onChange({ dateTo: event.target.value })}
        className="bg-transparent text-xs text-text outline-none"
        aria-label="Date to"
      />
    </div>
  )
}

export function ScenarioTypeChips({
  selected,
  onToggle,
}: {
  selected: ScenarioType[]
  onToggle: (type: ScenarioType) => void
}) {
  const types: { type: ScenarioType; tone: 'success' | 'danger' | 'primary' }[] = [
    { type: 'Positive', tone: 'success' },
    { type: 'Negative', tone: 'danger' },
    { type: 'Regression', tone: 'primary' },
  ]
  return (
    <div className="inline-flex items-center gap-1.5">
      {types.map((item) => (
        <Chip
          key={item.type}
          active={selected.includes(item.type)}
          tone={item.tone}
          onClick={() => onToggle(item.type)}
          title={`Include ${item.type.toLowerCase()} scenarios`}
        >
          {item.type}
        </Chip>
      ))}
    </div>
  )
}

export function EnvironmentPicker({
  value,
  onChange,
}: {
  value: Environment
  onChange: (value: Environment) => void
}) {
  return (
    <Select
      size="sm"
      value={value}
      onChange={(event) => onChange(event.target.value as Environment)}
      options={[
        { value: 'TEST', label: 'TEST' },
        { value: 'QA', label: 'QA' },
        { value: 'PRE-PROD', label: 'PRE-PROD' },
      ]}
      aria-label="Environment"
    />
  )
}

export function TestDataSetPicker({
  value,
  onChange,
  processId,
}: {
  value: string | null
  onChange: (value: string | null) => void
  processId?: ProcessId | 'ALL'
}) {
  const sets = db.testDataSets.filter(
    (set) => !processId || processId === 'ALL' || set.processId === processId || set.processId === 'ALL',
  )
  return (
    <Select
      size="sm"
      className="min-w-[14rem]"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
      options={[
        { value: '', label: 'No test data set' },
        ...sets.map((set) => ({ value: set.id, label: `${set.name}${set.loaded ? '' : ' (not loaded)'}` })),
      ]}
      aria-label="Test data set"
    />
  )
}

export function LoadProfilePicker({
  value,
  onChange,
}: {
  value: LoadProfile
  onChange: (value: LoadProfile) => void
}) {
  const options: { value: LoadProfile; label: string }[] = [
    { value: 'normal', label: 'Normal day' },
    { value: '2x', label: '2x month-end' },
    { value: '5x', label: '5x month-end' },
  ]
  return (
    <div className="inline-flex items-center gap-1.5">
      {options.map((option) => (
        <Chip key={option.value} active={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </Chip>
      ))}
    </div>
  )
}

/* --------------------------------------------------------- selection bar */

export function SelectionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('card flex flex-wrap items-center gap-2 p-2.5', className)}>
      {children}
    </div>
  )
}

/** Shows what is currently selected, with one-click removal. */
export function SelectionSummary({ className }: { className?: string }) {
  const { selection, patch } = useSelection()
  const chips: { key: string; label: string; clear: () => void }[] = []

  if (selection.processId !== 'ALL') {
    chips.push({
      key: 'process',
      label: `Process ${selection.processId}`,
      clear: () => patch({ processId: 'ALL' }),
    })
  }
  selection.systemIds.forEach((id) =>
    chips.push({
      key: `sys-${id}`,
      label: db.systems.find((system) => system.id === id)?.name ?? id,
      clear: () => patch({ systemIds: selection.systemIds.filter((value) => value !== id) }),
    }),
  )
  selection.interfaceIds.forEach((id) =>
    chips.push({
      key: `if-${id}`,
      label: id,
      clear: () => patch({ interfaceIds: selection.interfaceIds.filter((value) => value !== id) }),
    }),
  )
  selection.dataSourceIds.forEach((id) =>
    chips.push({
      key: `ds-${id}`,
      label: db.dataSources.find((source) => source.id === id)?.name ?? id,
      clear: () => patch({ dataSourceIds: selection.dataSourceIds.filter((value) => value !== id) }),
    }),
  )
  if (selection.site !== 'ALL') {
    chips.push({ key: 'site', label: SITE_LABELS[selection.site], clear: () => patch({ site: 'ALL' }) })
  }
  if (selection.scenarioIds.length > 0) {
    chips.push({
      key: 'scenarios',
      label: `${selection.scenarioIds.length} scenarios`,
      clear: () => patch({ scenarioIds: [] }),
    })
  }
  if (selection.vehicle) {
    chips.push({ key: 'vehicle', label: selection.vehicle, clear: () => patch({ vehicle: null }) })
  }

  if (chips.length === 0) {
    return <p className={cn('text-2xs text-muted', className)}>Nothing selected yet - everything is in scope.</p>
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="label">Selected</span>
      {chips.map((chip) => (
        <Badge key={chip.key} tone="primary" className="gap-1 pr-1">
          {chip.label}
          <button
            type="button"
            onClick={chip.clear}
            className="rounded p-0.5 hover:bg-primary/20"
            aria-label={`Remove ${chip.label}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
    </div>
  )
}
