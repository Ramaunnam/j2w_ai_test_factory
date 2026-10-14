import { useEffect, useRef } from 'react'
import { Sparkles, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/primitives'
import type { JobLogLine, JobStatus } from '@/lib/types'
import { timeShort } from '@/lib/format'

const TONE_CLASS: Record<JobLogLine['tone'], string> = {
  info: 'text-muted',
  ai: 'text-ai',
  ok: 'text-success',
  warn: 'text-accent',
  error: 'text-danger',
}

/**
 * The visible "AI is working" panel: a live log that scrolls as the job runs.
 * Used by Process Discovery, Test Studio, Self-Healing, Test Data, Load and runs.
 */
export function LiveLog({
  lines,
  status,
  progressPct,
  currentLabel,
  title = 'Live log',
  height = 'h-56',
  className,
  emptyHint = 'The log appears here while the job runs.',
}: {
  lines: JobLogLine[]
  status?: JobStatus
  progressPct?: number
  currentLabel?: string
  title?: string
  height?: string
  className?: string
  emptyHint?: string
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [lines.length])

  const aiLines = lines.filter((line) => line.tone === 'ai').length

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface2/60', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
          <span className="truncate text-xs font-semibold text-text">{title}</span>
          {currentLabel ? (
            <span className="truncate rounded bg-surface2 px-1.5 py-0.5 text-2xs font-medium text-muted">
              {currentLabel}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {aiLines > 0 ? (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-ai">
              <Sparkles className="h-3 w-3" aria-hidden />
              {aiLines} AI steps
            </span>
          ) : null}
          {status ? (
            <span
              className={cn(
                'text-2xs font-semibold uppercase tracking-wide',
                status === 'running' ? 'text-info' : status === 'done' ? 'text-success' : 'text-muted',
              )}
            >
              {status}
            </span>
          ) : null}
        </div>
      </div>
      {typeof progressPct === 'number' ? <Progress value={progressPct} height="h-1" tone="primary" /> : null}
      <div className={cn('scroll-thin overflow-y-auto px-3 py-2 font-mono text-[0.75rem] leading-relaxed', height)}>
        {lines.length === 0 ? (
          <p className="text-muted">{emptyHint}</p>
        ) : (
          lines.map((line, index) => (
            <div key={index} className="flex gap-2 animate-fade-in">
              <span className="shrink-0 text-muted/70">{timeShort(line.at)}</span>
              <span className={cn('whitespace-pre-wrap', TONE_CLASS[line.tone])}>{line.text}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
