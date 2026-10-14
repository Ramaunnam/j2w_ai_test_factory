import { cn } from '@/lib/utils'

/** J2W text logo mark - no external asset, works in both themes. */
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg">
        <span className="font-mono text-xs font-semibold tracking-tight">J2W</span>
      </span>
      {!compact ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold text-text">AI Test Factory</span>
          <span className="block truncate text-2xs font-medium uppercase tracking-wider text-muted">
            Steel and recycling
          </span>
        </span>
      ) : null}
    </span>
  )
}
