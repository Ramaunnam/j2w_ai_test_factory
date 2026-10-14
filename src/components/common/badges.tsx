import {
  AlertTriangle,
  Ban,
  Camera,
  CheckCircle2,
  CircleDashed,
  Database,
  FileText,
  Loader2,
  MinusCircle,
  MousePointerClick,
  Sparkles,
  Table2,
  Webhook,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import type {
  ApprovalState,
  Health,
  RunStatus,
  ScenarioType,
  Severity,
  StepKind,
  StepStatus,
  Verdict,
} from '@/lib/types'

/* ------------------------------------------------------------- step status */

const STEP_STATUS: Record<StepStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  Pending: { tone: 'neutral', icon: CircleDashed },
  Running: { tone: 'info', icon: Loader2 },
  Passed: { tone: 'success', icon: CheckCircle2 },
  Failed: { tone: 'danger', icon: XCircle },
  Healed: { tone: 'accent', icon: Wrench },
  'Blocked as expected': { tone: 'info', icon: Ban },
  Skipped: { tone: 'neutral', icon: MinusCircle },
}

export function StepStatusBadge({ status, className }: { status: StepStatus; className?: string }) {
  const config = STEP_STATUS[status]
  const Icon = config.icon
  return (
    <Badge tone={config.tone} className={className}>
      <Icon className={cn('h-3 w-3', status === 'Running' && 'animate-spin')} aria-hidden />
      {status}
    </Badge>
  )
}

/* -------------------------------------------------------------- run status */

const RUN_STATUS: Record<RunStatus, BadgeTone> = {
  Queued: 'neutral',
  Running: 'info',
  Passed: 'success',
  'Passed with findings': 'accent',
  Failed: 'danger',
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <Badge tone={RUN_STATUS[status]}>{status}</Badge>
}

/* ---------------------------------------------------------------- verdict */

const VERDICT_TONE: Record<Verdict, BadgeTone> = { GO: 'success', CONDITIONAL: 'accent', 'NO-GO': 'danger' }

export function VerdictBadge({ verdict, size = 'sm' }: { verdict: Verdict; size?: 'sm' | 'lg' }) {
  if (size === 'lg') {
    const tone = {
      GO: 'border-success/30 bg-success-soft text-success',
      CONDITIONAL: 'border-accent/30 bg-accent-soft text-accent',
      'NO-GO': 'border-danger/30 bg-danger-soft text-danger',
    }[verdict]
    return (
      <span className={cn('inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-base font-semibold', tone)}>
        {verdict === 'GO' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : verdict === 'CONDITIONAL' ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        {verdict}
      </span>
    )
  }
  return <Badge tone={VERDICT_TONE[verdict]}>{verdict}</Badge>
}

/* --------------------------------------------------------------- severity */

const SEVERITY_TONE: Record<Severity, BadgeTone> = {
  Critical: 'danger',
  High: 'accent',
  Medium: 'info',
  Low: 'neutral',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{severity}</Badge>
}

/* ----------------------------------------------------------------- health */

const HEALTH_TONE: Record<Health, BadgeTone> = {
  Healthy: 'success',
  Attention: 'accent',
  'At risk': 'danger',
  'Not tested': 'neutral',
}

export function HealthBadge({ health }: { health: Health }) {
  return <Badge tone={HEALTH_TONE[health]}>{health}</Badge>
}

export function HealthDot({
  health,
  className,
  title,
}: {
  health: Health
  className?: string
  title?: string
}) {
  const tone = {
    Healthy: 'bg-success',
    Attention: 'bg-accent',
    'At risk': 'bg-danger',
    'Not tested': 'bg-muted',
  }[health]
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', tone, className)}
      aria-label={health}
      title={title ?? health}
    />
  )
}

/** Shown as a legend wherever requirement status colours appear. */
export function HealthLegend({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-2.5 text-2xs text-muted', className)}>
      <span className="inline-flex items-center gap-1" title="Green: a page demonstrates it, scenarios are approved and have run, evidence is locked">
        <HealthDot health="Healthy" title="Demo-ready" /> demo-ready
      </span>
      <span className="inline-flex items-center gap-1" title="Amber: demonstrated, but some scenarios are not approved, not run, or have no locked evidence yet">
        <HealthDot health="Attention" title="Partial" /> partial
      </span>
      <span className="inline-flex items-center gap-1" title="Red: almost nothing in the platform demonstrates this yet">
        <HealthDot health="At risk" title="Missing" /> missing
      </span>
    </span>
  )
}

/* --------------------------------------------------------------- approval */

const APPROVAL_TONE: Record<ApprovalState, BadgeTone> = {
  Draft: 'neutral',
  'Pending approval': 'accent',
  Approved: 'success',
  Rejected: 'danger',
}

export function ApprovalBadge({ state }: { state: ApprovalState }) {
  return <Badge tone={APPROVAL_TONE[state]}>{state}</Badge>
}

/* ---------------------------------------------------------- scenario type */

const TYPE_TONE: Record<ScenarioType, BadgeTone> = {
  Positive: 'success',
  Negative: 'danger',
  Regression: 'info',
}

export function ScenarioTypeBadge({ type }: { type: ScenarioType }) {
  return <Badge tone={TYPE_TONE[type]}>{type}</Badge>
}

export function AiBadge({ label = 'AI generated' }: { label?: string }) {
  return (
    <Badge tone="ai">
      <Sparkles className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  )
}

/* -------------------------------------------------------------- step kinds */

export const STEP_KIND_META: Record<
  StepKind,
  { label: string; icon: LucideIcon; tone: string; soft: string; plain: string }
> = {
  DATA_SETUP: {
    label: 'Data setup',
    icon: Database,
    tone: 'text-ai',
    soft: 'bg-ai-soft',
    plain: 'Create or link the test data this step needs.',
  },
  UI_ACTION: {
    label: 'UI action',
    icon: MousePointerClick,
    tone: 'text-primary',
    soft: 'bg-primary-soft',
    plain: 'Do something on a screen: navigate, fill, click, select.',
  },
  API_CALL: {
    label: 'API call',
    icon: Webhook,
    tone: 'text-info',
    soft: 'bg-info-soft',
    plain: 'Call an API or send a message to another system.',
  },
  MESSAGE_CHECK: {
    label: 'Message check',
    icon: CheckCircle2,
    tone: 'text-success',
    soft: 'bg-success-soft',
    plain: 'Verify the message crossed the interface with the right status and fields.',
  },
  DATA_CHECK: {
    label: 'Data check',
    icon: Table2,
    tone: 'text-accent',
    soft: 'bg-accent-soft',
    plain: 'Query the target system and assert the values.',
  },
  DOCUMENT_CHECK: {
    label: 'Document check',
    icon: FileText,
    tone: 'text-danger',
    soft: 'bg-danger-soft',
    plain: 'Open the generated document and check fields and totals.',
  },
  EVIDENCE: {
    label: 'Evidence',
    icon: Camera,
    tone: 'text-muted',
    soft: 'bg-surface2',
    plain: 'Collect, hash and lock the evidence for the audit file.',
  },
}

export function StepKindIcon({ kind, size = 'md' }: { kind: StepKind; size?: 'sm' | 'md' }) {
  const meta = STEP_KIND_META[kind]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-md',
        meta.soft,
        meta.tone,
        size === 'sm' ? 'h-5 w-5' : 'h-7 w-7',
      )}
      title={`${meta.label}: ${meta.plain}`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden />
    </span>
  )
}

export function StepKindBadge({ kind }: { kind: StepKind }) {
  const meta = STEP_KIND_META[kind]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-semibold',
        meta.soft,
        meta.tone,
      )}
      title={meta.plain}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </span>
  )
}
