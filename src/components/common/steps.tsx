import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Code2, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, Button } from '@/components/ui/primitives'
import { StepKindBadge, StepKindIcon, StepStatusBadge } from './badges'
import { DataSourceRef, HealingRef, InterfaceRef, SystemRef } from './links'
import { MockDocument, MockScreenshot, PayloadView, RowsTable } from './evidence'
import type { Step, StepResult, TechnicalDetail as TechnicalDetailType } from '@/lib/types'

export function AssertionList({ assertions }: { assertions: TechnicalDetailType['assertions'] }) {
  return (
    <ul className="space-y-1.5">
      {assertions.map((assertion, index) => (
        <li key={index} className="flex items-start gap-2 text-xs">
          <Target className="mt-0.5 h-3 w-3 shrink-0 text-muted" aria-hidden />
          <span className="min-w-0">
            <span className="block text-text">{assertion.plain}</span>
            <code className="mono mt-0.5 block break-all text-muted">{assertion.expr}</code>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function TechnicalDetail({ technical }: { technical: TechnicalDetailType }) {
  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface2/50 p-3">
      {technical.screen || technical.transaction || technical.uiSelector ? (
        <div>
          <p className="label mb-1">Screen and selector</p>
          <div className="space-y-1 text-xs">
            {technical.screen ? (
              <p className="text-text">
                Screen <span className="font-medium">{technical.screen}</span>
                {technical.transaction ? (
                  <>
                    {' '}
                    · transaction <code className="mono">{technical.transaction}</code>
                  </>
                ) : null}
              </p>
            ) : null}
            {technical.uiSelector ? <code className="mono block break-all text-muted">{technical.uiSelector}</code> : null}
          </div>
        </div>
      ) : null}

      {technical.api ? (
        <div>
          <p className="label mb-1">API call</p>
          <p className="mono break-all text-xs text-text">
            <span className="font-semibold">{technical.api.method}</span> {technical.api.url}
          </p>
          {technical.api.headers ? (
            <p className="mono mt-1 text-2xs text-muted">
              {Object.entries(technical.api.headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join('  ·  ')}
            </p>
          ) : null}
          {technical.api.body ? (
            <pre className="scroll-thin mt-1.5 max-h-48 overflow-auto rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-[0.72rem] leading-relaxed text-text">
              {technical.api.body}
            </pre>
          ) : null}
          {technical.api.responseBody ? (
            <>
              <p className="label mb-1 mt-2">Expected response {technical.api.responseStatus ?? ''}</p>
              <pre className="scroll-thin max-h-40 overflow-auto rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-[0.72rem] leading-relaxed text-text">
                {technical.api.responseBody}
              </pre>
            </>
          ) : null}
        </div>
      ) : null}

      {technical.query ? (
        <div>
          <p className="label mb-1">
            {technical.query.language} query · {technical.query.source}
          </p>
          <pre className="scroll-thin max-h-56 overflow-auto rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-[0.72rem] leading-relaxed text-text">
            {technical.query.text}
          </pre>
        </div>
      ) : null}

      {technical.messageRef ? (
        <div>
          <p className="label mb-1">Message</p>
          <code className="mono text-xs text-text">{technical.messageRef}</code>
        </div>
      ) : null}

      {technical.documentRef ? (
        <div>
          <p className="label mb-1">Document</p>
          <code className="mono text-xs text-text">{technical.documentRef}</code>
        </div>
      ) : null}

      <div>
        <p className="label mb-1">Assertions</p>
        <AssertionList assertions={technical.assertions} />
      </div>
    </div>
  )
}

export function StepCard({
  step,
  result,
  defaultTechnical = false,
  onOpen,
  actions,
  showEvidence = false,
  compact = false,
  active = false,
}: {
  step: Step
  result?: StepResult
  defaultTechnical?: boolean
  onOpen?: () => void
  actions?: ReactNode
  showEvidence?: boolean
  compact?: boolean
  active?: boolean
}) {
  const [showTechnical, setShowTechnical] = useState(defaultTechnical)
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'rounded-lg border bg-surface transition-colors',
        active ? 'border-primary/50 bg-primary-soft/30' : 'border-line',
        result?.status === 'Failed' && 'border-danger/40',
        result?.status === 'Healed' && 'border-accent/40',
      )}
    >
      <div
        className={cn('flex items-start gap-3 px-3', compact ? 'py-2' : 'py-3')}
        onClick={onOpen}
        role={onOpen ? 'button' : undefined}
      >
        <span className="mt-0.5 flex shrink-0 items-center gap-2">
          <span className="w-5 text-right text-xs font-semibold tabular-nums text-muted">{step.order}</span>
          <StepKindIcon kind={step.kind} size={compact ? 'sm' : 'md'} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className={cn('font-medium text-text', compact ? 'text-xs' : 'text-sm')}>{step.title}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              {result ? <StepStatusBadge status={result.status} /> : null}
              {step.healingEventIds?.length ? <Badge tone="accent">Healed</Badge> : null}
              {actions}
            </div>
          </div>
          <p className={cn('mt-1 text-muted', compact ? 'text-2xs' : 'text-xs')}>{step.plain}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
            <StepKindBadge kind={step.kind} />
            {step.systemId ? <SystemRef id={step.systemId} compact /> : null}
            {step.interfaceId ? <InterfaceRef id={step.interfaceId} /> : null}
            {(step.dataSourceIds ?? []).map((id) => (
              <DataSourceRef key={id} id={id} />
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                setShowTechnical((value) => !value)
              }}
            >
              <Code2 className="h-3.5 w-3.5" />
              {showTechnical ? 'Hide technical detail' : 'Technical detail'}
              {showTechnical ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
            {showEvidence && (step.mock.screenshot || step.mock.rows || step.mock.document || step.mock.payload) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  setExpanded((value) => !value)
                }}
              >
                {expanded ? 'Hide evidence' : 'Evidence'}
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            ) : null}
            <span className="text-2xs text-muted">Expected: {step.expected}</span>
          </div>

          {showTechnical ? (
            <div className="mt-2">
              <TechnicalDetail technical={step.technical} />
            </div>
          ) : null}

          {expanded ? (
            <div className="mt-2 space-y-2">
              {step.mock.screenshot ? <MockScreenshot spec={step.mock.screenshot} /> : null}
              {step.mock.rows ? <RowsTable spec={step.mock.rows} /> : null}
              {step.mock.document ? <MockDocument spec={step.mock.document} /> : null}
              {step.mock.payload ? <PayloadView payload={step.mock.payload} /> : null}
              {step.healingEventIds?.map((id) => (
                <div key={id} className="text-xs">
                  <HealingRef id={id} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
