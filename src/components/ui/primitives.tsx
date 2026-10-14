import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'ai' | 'subtle'
type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary/90 border border-transparent',
  secondary: 'bg-surface text-text border border-line hover:bg-surface2',
  ghost: 'bg-transparent text-text border border-transparent hover:bg-surface2',
  subtle: 'bg-surface2 text-text border border-transparent hover:bg-surface2/70',
  danger: 'bg-danger text-white hover:bg-danger/90 border border-transparent',
  accent: 'bg-accent text-white hover:bg-accent/90 border border-transparent',
  ai: 'bg-ai text-white hover:bg-ai/90 border border-transparent',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-8 w-8 justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
})

/* -------------------------------------------------------------------- card */

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  className,
  onTitleClick,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  className?: string
  onTitleClick?: () => void
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-line px-4 py-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <div className="mt-0.5 text-muted">{icon}</div> : null}
        <div className="min-w-0">
          <h2
            className={cn('truncate text-sm font-semibold text-text', onTitleClick && 'link')}
            onClick={onTitleClick}
          >
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------- badge */

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger' | 'accent' | 'info' | 'ai'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface2 text-muted border-line',
  primary: 'bg-primary-soft text-primary border-primary/20',
  success: 'bg-success-soft text-success border-success/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  accent: 'bg-accent-soft text-accent border-accent/25',
  info: 'bg-info-soft text-info border-info/20',
  ai: 'bg-ai-soft text-ai border-ai/20',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
  icon,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; icon?: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-2xs font-semibold',
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------- chip */

export function Chip({
  active,
  onClick,
  children,
  className,
  tone = 'primary',
  title,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  tone?: 'primary' | 'accent' | 'success' | 'danger' | 'ai'
  title?: string
}) {
  const activeTone = {
    primary: 'border-primary bg-primary text-primary-fg',
    accent: 'border-accent bg-accent text-white',
    success: 'border-success bg-success text-white',
    danger: 'border-danger bg-danger text-white',
    ai: 'border-ai bg-ai text-white',
  }[tone]
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active ? activeTone : 'border-line bg-surface text-muted hover:bg-surface2 hover:text-text',
        className,
      )}
    >
      {active ? <Check className="h-3 w-3" aria-hidden /> : null}
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- controls */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-text placeholder:text-muted/70',
        className,
      )}
      {...props}
    />
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70',
          className,
        )}
        {...props}
      />
    )
  },
)

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

export function Select({
  options,
  className,
  size = 'md',
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  options: SelectOption[]
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        className={cn(
          'w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-sm font-medium text-text',
          size === 'sm' ? 'h-8 text-xs' : 'h-9',
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  className,
  indeterminate,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  label?: ReactNode
  description?: ReactNode
  className?: string
  indeterminate?: boolean
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer select-none items-start gap-2',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          checked || indeterminate ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface',
        )}
      >
        {indeterminate && !checked ? (
          <span className="h-0.5 w-2 rounded bg-primary-fg" />
        ) : checked ? (
          <Check className="h-3 w-3" aria-hidden />
        ) : null}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      {label || description ? (
        <span className="min-w-0">
          {label ? <span className="block text-sm leading-tight text-text">{label}</span> : null}
          {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
        </span>
      ) : null}
    </label>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean
  onChange: () => void
  label?: ReactNode
  className?: string
}) {
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-2', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          'relative h-5 w-9 rounded-full border transition-colors',
          checked ? 'border-primary bg-primary' : 'border-line bg-surface2',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-surface shadow transition-all',
            checked ? 'left-[1.15rem] bg-primary-fg' : 'left-0.5',
          )}
        />
      </button>
      {label ? <span className="text-xs font-medium text-text">{label}</span> : null}
    </label>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cn('inline-flex rounded-lg border border-line bg-surface2 p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.hint}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === option.value
              ? 'bg-surface text-text shadow-card'
              : 'text-muted hover:text-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- feedback */

export function Progress({
  value,
  className,
  tone = 'primary',
  height = 'h-2',
}: {
  value: number
  className?: string
  tone?: 'primary' | 'success' | 'danger' | 'accent' | 'ai'
  height?: string
}) {
  const toneClass = {
    primary: 'bg-primary',
    success: 'bg-success',
    danger: 'bg-danger',
    accent: 'bg-accent',
    ai: 'bg-ai',
  }[tone]
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-surface2', height, className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', toneClass)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-line', className)} />
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded-md bg-surface2', className)} />
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? <div className="text-muted">{icon}</div> : null}
      <p className="text-sm font-semibold text-text">{title}</p>
      {description ? <p className="max-w-md text-xs text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function KeyValue({
  rows,
  className,
  columns = 1,
}: {
  rows: { label: ReactNode; value: ReactNode }[]
  className?: string
  columns?: 1 | 2
}) {
  return (
    <dl
      className={cn('grid gap-x-6 gap-y-2.5', columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1', className)}
    >
      {rows.map((row, i) => (
        <div key={i} className="min-w-0">
          <dt className="label">{row.label}</dt>
          <dd className="mt-0.5 text-sm text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-2xs font-medium text-text shadow-pop group-hover:block">
        {text}
      </span>
    </span>
  )
}
