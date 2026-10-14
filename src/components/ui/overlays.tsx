import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './primitives'

/* ------------------------------------------------------------------ drawer */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'w-full max-w-xl',
  badges,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
  badges?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'relative flex h-full flex-col border-l border-line bg-surface shadow-pop animate-slide-in',
          width,
        )}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight text-text">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
            {badges ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div> : null}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="scroll-thin min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer ? <footer className="border-t border-line bg-surface2/60 px-5 py-3">{footer}</footer> : null}
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------------- modal */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg border border-line bg-surface shadow-pop animate-fade-in',
          width,
        )}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-text">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="scroll-thin max-h-[70vh] min-w-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface2/60 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- popover */

export function Popover({
  trigger,
  children,
  align = 'left',
  width = 'w-72',
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'left' | 'right'
  width?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div
          className={cn(
            'absolute top-[calc(100%+6px)] z-40 rounded-lg border border-line bg-surface p-3 shadow-pop animate-fade-in',
            align === 'left' ? 'left-0' : 'right-0',
            width,
          )}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  )
}
