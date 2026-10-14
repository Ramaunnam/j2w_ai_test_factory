import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Boxes,
  Database,
  FileCheck2,
  GitCompareArrows,
  Network,
  Route,
  ShieldAlert,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSelection } from '@/lib/selection'
import { find } from '@/lib/db'
import type { ProcessId } from '@/lib/types'

function LinkChip({
  children,
  onClick,
  icon,
  title,
  className,
  tone = 'default',
}: {
  children: ReactNode
  onClick: () => void
  icon?: ReactNode
  title?: string
  className?: string
  tone?: 'default' | 'danger' | 'accent' | 'mono'
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm font-medium transition-colors hover:bg-primary-soft hover:text-primary',
        tone === 'danger' && 'text-danger',
        tone === 'accent' && 'text-accent',
        tone === 'mono' && 'font-mono text-[0.8125rem] tabular-nums',
        tone === 'default' && 'text-primary',
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  )
}

export function SystemRef({ id, label, compact }: { id: string; label?: string; compact?: boolean }) {
  const navigate = useNavigate()
  const { patch } = useSelection()
  const system = find.system(id)
  return (
    <LinkChip
      icon={compact ? undefined : <Network className="h-3 w-3 shrink-0" aria-hidden />}
      title={`Open ${system?.name ?? id} in the landscape`}
      onClick={() => {
        patch({ systemIds: [id] })
        navigate(`/landscape?system=${id}`)
      }}
    >
      {label ?? system?.name ?? id}
    </LinkChip>
  )
}

export function DataSourceRef({ id }: { id: string }) {
  const navigate = useNavigate()
  const { patch } = useSelection()
  const source = find.dataSource(id)
  return (
    <LinkChip
      icon={<Database className="h-3 w-3 shrink-0" aria-hidden />}
      title={`Open ${source?.name ?? id} and its checks`}
      onClick={() => {
        patch({ dataSourceIds: [id], systemIds: source ? [source.systemId] : [] })
        navigate(`/landscape?system=${source?.systemId ?? ''}&ds=${id}`)
      }}
      tone="mono"
    >
      {source?.name ?? id}
    </LinkChip>
  )
}

export function InterfaceRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  const { patch } = useSelection()
  const link = find.interface(id)
  return (
    <LinkChip
      icon={<GitCompareArrows className="h-3 w-3 shrink-0" aria-hidden />}
      title={`Open ${link?.name ?? id} and its records`}
      onClick={() => {
        patch({ interfaceIds: [id] })
        navigate(`/interfaces?if=${id}`)
      }}
    >
      {label ?? link?.name ?? id}
    </LinkChip>
  )
}

export function ProcessRef({ id, to = '/studio', label }: { id: ProcessId; to?: string; label?: string }) {
  const navigate = useNavigate()
  const { patch } = useSelection()
  const process = find.process(id)
  return (
    <LinkChip
      icon={<Boxes className="h-3 w-3 shrink-0" aria-hidden />}
      title={`Open ${process?.name ?? id}`}
      onClick={() => {
        patch({ processId: id })
        navigate(to)
      }}
    >
      {label ?? `${id} ${process?.name ?? ''}`}
    </LinkChip>
  )
}

export function ScenarioRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  const { patch } = useSelection()
  const scenario = find.scenario(id)
  return (
    <LinkChip
      icon={<Sparkles className="h-3 w-3 shrink-0" aria-hidden />}
      title={`Open scenario ${scenario?.code ?? id}`}
      onClick={() => {
        if (scenario) patch({ processId: scenario.processId, scenarioIds: [scenario.id] })
        navigate(`/studio?scenario=${id}`)
      }}
    >
      {label ?? `${scenario?.code ?? id}${scenario ? ` ${scenario.name}` : ''}`}
    </LinkChip>
  )
}

export function RunRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  const run = find.run(id)
  return (
    <LinkChip
      icon={<Route className="h-3 w-3 shrink-0" aria-hidden />}
      title={`Open run ${id}`}
      onClick={() => navigate(`/run?run=${id}`)}
      tone="mono"
    >
      {label ?? `${id}${run ? ` ${run.label}` : ''}`}
    </LinkChip>
  )
}

export function FindingRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  const finding = find.finding(id)
  return (
    <LinkChip
      icon={<ShieldAlert className="h-3 w-3 shrink-0" aria-hidden />}
      title={finding?.title ?? `Open finding ${id}`}
      onClick={() => navigate(`/finding/${id}`)}
      tone="danger"
    >
      {label ?? `${id}${finding ? ` ${finding.title}` : ''}`}
    </LinkChip>
  )
}

export function VehicleRef({ vehicle, label }: { vehicle: string; label?: string }) {
  const navigate = useNavigate()
  const { patch } = useSelection()
  return (
    <LinkChip
      icon={<Truck className="h-3 w-3 shrink-0" aria-hidden />}
      title={`Follow ${vehicle} across every system`}
      onClick={() => {
        patch({ vehicle })
        navigate(`/interfaces?trace=${vehicle}`)
      }}
      tone="mono"
    >
      {label ?? vehicle}
    </LinkChip>
  )
}

export function RequirementRef({ id }: { id: string }) {
  const navigate = useNavigate()
  const { patch } = useSelection()
  const requirement = find.requirement(id)
  return (
    <LinkChip
      title={requirement?.title ?? `Open ${id}`}
      onClick={() => {
        patch({ requirementId: id })
        navigate(`/coverage?req=${id}`)
      }}
    >
      {id}
    </LinkChip>
  )
}

export function ChangeRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  const change = find.change(id)
  return (
    <LinkChip
      icon={<Route className="h-3 w-3 shrink-0" aria-hidden />}
      title={change?.title ?? `Open change ${id}`}
      onClick={() => navigate(`/regression?change=${id}`)}
    >
      {label ?? change?.ref ?? id}
    </LinkChip>
  )
}

export function HealingRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  const event = find.healing(id)
  return (
    <LinkChip
      icon={<Wrench className="h-3 w-3 shrink-0" aria-hidden />}
      title={event?.summary ?? `Open healing event ${id}`}
      onClick={() => navigate(`/self-healing?heal=${id}`)}
      tone="accent"
    >
      {label ?? event?.summary ?? id}
    </LinkChip>
  )
}

export function ReconRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  const { patch } = useSelection()
  const set = find.reconSet(id)
  return (
    <LinkChip
      icon={<FileCheck2 className="h-3 w-3 shrink-0" aria-hidden />}
      title={set?.name ?? `Open reconciliation set ${id}`}
      onClick={() => {
        patch({ reconSetId: id })
        navigate(`/reconciliation?set=${id}`)
      }}
    >
      {label ?? set?.name ?? id}
    </LinkChip>
  )
}

export function UserRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  const user = find.user(id)
  return (
    <LinkChip
      icon={<ShieldAlert className="h-3 w-3 shrink-0" aria-hidden />}
      title={`Open ${user?.label ?? id} roles and conflicts`}
      onClick={() => navigate(`/access-sod?user=${id}`)}
    >
      {label ?? user?.label ?? id}
    </LinkChip>
  )
}

export function BundleRef({ id, label }: { id: string; label?: string }) {
  const navigate = useNavigate()
  return (
    <LinkChip
      title={`Open evidence bundle ${id}`}
      onClick={() => navigate(`/evidence?bundle=${id}`)}
      tone="mono"
    >
      {label ?? id}
    </LinkChip>
  )
}

export function PageRef({ to, children, title }: { to: string; children: ReactNode; title?: string }) {
  const navigate = useNavigate()
  return (
    <LinkChip
      icon={<ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />}
      onClick={() => navigate(to)}
      title={title}
    >
      {children}
    </LinkChip>
  )
}
