import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabDefinition<T extends string> {
  value: T
  label: string
  count?: number
  icon?: ReactNode
}

export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
  className,
  size = 'md',
}: {
  value: T
  tabs: TabDefinition<T>[]
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative -mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-line hover:text-text',
            )}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-2xs font-semibold',
                  active ? 'bg-primary-soft text-primary' : 'bg-surface2 text-muted',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
