import type { ReactNode } from 'react'
import { ArrowRight, Info, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/primitives'
import type { ConfidenceScore, Verdict } from '@/lib/types'

export function StatTile({
  label,
  value,
  unit,
  hint,
  onClick,
  tone = 'default',
  icon,
  delta,
  className,
}: {
  label: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  onClick?: () => void
  tone?: 'default' | 'success' | 'danger' | 'accent' | 'primary'
  icon?: ReactNode
  delta?: { value: number; label: string }
  className?: string
}) {
  const toneClass = {
    default: 'text-text',
    success: 'text-success',
    danger: 'text-danger',
    accent: 'text-accent',
    primary: 'text-primary',
  }[tone]

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) onClick()
      }}
      className={cn(
        'card group flex flex-col gap-1 p-3.5 text-left transition-colors',
        onClick && 'cursor-pointer hover:border-primary/40 hover:bg-surface2/60',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="label">{label}</p>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-2xl font-semibold tabular-nums leading-none', toneClass)}>{value}</span>
        {unit ? <span className="text-xs font-medium text-muted">{unit}</span> : null}
        {delta ? (
          <span
            className={cn(
              'ml-1 inline-flex items-center gap-0.5 text-2xs font-semibold',
              delta.value >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {delta.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta.value >= 0 ? '+' : ''}
            {delta.value} {delta.label}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p> : null}
      {onClick ? (
        <span className="mt-1 inline-flex items-center gap-1 text-2xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      ) : null}
    </div>
  )
}

export function ScoreGauge({
  score,
  max = 100,
  label,
  verdict,
  size = 132,
  onClick,
}: {
  score: number
  max?: number
  label?: string
  verdict?: Verdict | string
  size?: number
  onClick?: () => void
}) {
  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  const ratio = Math.max(0, Math.min(1, score / max))
  const stroke = score >= 80 ? 'hsl(var(--success))' : score >= 60 ? 'hsl(var(--accent))' : 'hsl(var(--danger))'

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) onClick()
      }}
      className={cn('relative inline-flex flex-col items-center', onClick && 'cursor-pointer')}
      title={onClick ? 'Show how this score is calculated' : undefined}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums leading-none text-text">{score}</span>
        <span className="text-2xs font-medium text-muted">of {max}</span>
        {verdict ? <span className="mt-1 text-2xs font-semibold uppercase tracking-wide text-muted">{verdict}</span> : null}
      </div>
      {label ? <p className="mt-1 text-xs font-medium text-muted">{label}</p> : null}
    </div>
  )
}

export function ScoreBreakdown({
  components,
  cappedReason,
  onComponentClick,
}: {
  components: ConfidenceScore['components']
  cappedReason?: string
  onComponentClick?: (route: string) => void
}) {
  return (
    <div className="space-y-2.5">
      {cappedReason ? (
        <p className="flex items-start gap-1.5 rounded-md bg-accent-soft px-2 py-1.5 text-xs text-accent">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {cappedReason}
        </p>
      ) : null}
      {components.map((component) => (
        <div
          key={component.key}
          className={cn('rounded-md p-1.5 transition-colors', onComponentClick && 'cursor-pointer hover:bg-surface2')}
          onClick={() => onComponentClick?.(component.route)}
          title={onComponentClick ? 'Open the page behind this number' : undefined}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-text">{component.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {component.score} / 100 · weight {component.weight} %
            </span>
          </div>
          <Progress
            value={component.score}
            height="h-1.5"
            className="mt-1"
            tone={component.score >= 80 ? 'success' : component.score >= 60 ? 'accent' : 'danger'}
          />
          <p className="mt-1 text-2xs leading-snug text-muted">{component.plain}</p>
        </div>
      ))}
    </div>
  )
}

export function MetricRow({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; tone?: 'default' | 'success' | 'danger' | 'accent' }[]
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-x-6 gap-y-2', className)}>
      {items.map((item, index) => (
        <div key={index}>
          <p className="label">{item.label}</p>
          <p
            className={cn(
              'text-sm font-semibold tabular-nums',
              item.tone === 'success' && 'text-success',
              item.tone === 'danger' && 'text-danger',
              item.tone === 'accent' && 'text-accent',
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
