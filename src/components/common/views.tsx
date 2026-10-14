import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { FieldCompare, HealingEvent } from '@/lib/types'
import { CheckCircle2, XCircle } from 'lucide-react'

/* ------------------------------------------------------------------- diff */

export function DiffView({
  lines,
  before,
  after,
  className,
}: {
  lines: HealingEvent['diffLines']
  before?: string
  after?: string
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line', className)}>
      {before || after ? (
        <div className="grid gap-px bg-line sm:grid-cols-2">
          <div className="bg-danger-soft/40 px-3 py-2">
            <p className="label mb-1 text-danger">Before</p>
            <code className="mono block break-all text-danger">{before}</code>
          </div>
          <div className="bg-success-soft/40 px-3 py-2">
            <p className="label mb-1 text-success">After the AI fix</p>
            <code className="mono block break-all text-success">{after}</code>
          </div>
        </div>
      ) : null}
      <pre className="scroll-thin max-h-64 overflow-auto bg-surface font-mono text-[0.75rem] leading-relaxed">
        {lines.map((line, index) => (
          <div
            key={index}
            className={cn(
              'px-3 py-0.5',
              line.type === 'removed' && 'bg-danger-soft/50 text-danger',
              line.type === 'added' && 'bg-success-soft/50 text-success',
              line.type === 'context' && 'text-muted',
            )}
          >
            <span className="select-none pr-2 opacity-60">
              {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
            </span>
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  )
}

/* --------------------------------------------------------------- timeline */

export interface TimelineEntry {
  id: string
  title: ReactNode
  detail?: ReactNode
  meta?: ReactNode
  status: 'ok' | 'warn' | 'error' | 'muted'
  onClick?: () => void
}

export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn('relative space-y-0', className)}>
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'mt-1 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full ring-4',
                entry.status === 'ok' && 'bg-success ring-success-soft',
                entry.status === 'warn' && 'bg-accent ring-accent-soft',
                entry.status === 'error' && 'bg-danger ring-danger-soft',
                entry.status === 'muted' && 'bg-muted ring-surface2',
              )}
            />
            {index < entries.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" /> : null}
          </div>
          <div
            className={cn(
              'min-w-0 flex-1 rounded-lg px-2.5 py-1.5 transition-colors',
              entry.onClick && 'cursor-pointer hover:bg-surface2',
            )}
            onClick={entry.onClick}
            role={entry.onClick ? 'button' : undefined}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-text">{entry.title}</p>
              {entry.meta ? <span className="text-2xs text-muted">{entry.meta}</span> : null}
            </div>
            {entry.detail ? <div className="mt-0.5 text-xs text-muted">{entry.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ------------------------------------------------------- field comparison */

export function FieldCompareTable({ fields, className }: { fields: FieldCompare[]; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line', className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface2">
          <tr>
            <th className="label px-3 py-2">Field</th>
            <th className="label px-3 py-2">Source</th>
            <th className="label px-3 py-2">Target</th>
            <th className="label px-3 py-2 text-center">Match</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name} className={cn('border-t border-line', !field.match && 'bg-danger-soft/40')}>
              <td className="px-3 py-2 text-xs font-medium text-text">{field.label}</td>
              <td className="mono px-3 py-2">{field.sourceValue}</td>
              <td className={cn('mono px-3 py-2', !field.match && 'text-danger')}>{field.targetValue}</td>
              <td className="px-3 py-2 text-center">
                {field.match ? (
                  <CheckCircle2 className="mx-auto h-4 w-4 text-success" aria-hidden />
                ) : (
                  <XCircle className="mx-auto h-4 w-4 text-danger" aria-hidden />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {fields.some((field) => field.note) ? (
        <ul className="divide-y divide-line border-t border-line bg-surface2/60">
          {fields
            .filter((field) => field.note)
            .map((field) => (
              <li key={`${field.name}-note`} className="px-3 py-1.5 text-xs text-muted">
                <span className="font-medium text-text">{field.label}:</span> {field.note}
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  )
}
