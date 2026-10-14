import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'info' | 'success' | 'warning' | 'error' | 'ai'

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
  actionLabel?: string
  onAction?: () => void
}

interface ToastContextValue {
  toast: (toast: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_STYLES: Record<ToastTone, { ring: string; icon: ReactNode }> = {
  info: { ring: 'border-l-info', icon: <Info className="h-4 w-4 text-info" /> },
  success: { ring: 'border-l-success', icon: <CheckCircle2 className="h-4 w-4 text-success" /> },
  warning: { ring: 'border-l-accent', icon: <AlertTriangle className="h-4 w-4 text-accent" /> },
  error: { ring: 'border-l-danger', icon: <AlertTriangle className="h-4 w-4 text-danger" /> },
  ai: { ring: 'border-l-ai', icon: <Sparkles className="h-4 w-4 text-ai" /> },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (input: Omit<ToastItem, 'id'>) => {
      counter.current += 1
      const id = counter.current
      setItems((prev) => [...prev.slice(-3), { ...input, id }])
      window.setTimeout(() => remove(id), 5200)
    },
    [remove],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[22rem] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line border-l-4 bg-surface p-3 shadow-pop animate-fade-in',
              TONE_STYLES[item.tone].ring,
            )}
          >
            <div className="mt-0.5">{TONE_STYLES[item.tone].icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">{item.title}</p>
              {item.description ? <p className="mt-0.5 text-xs text-muted">{item.description}</p> : null}
              {item.actionLabel ? (
                <button
                  type="button"
                  className="link mt-1.5 text-xs"
                  onClick={() => {
                    item.onAction?.()
                    remove(item.id)
                  }}
                >
                  {item.actionLabel}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="text-muted hover:text-text"
              onClick={() => remove(item.id)}
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
