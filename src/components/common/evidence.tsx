import type { ReactNode } from 'react'
import { AlertTriangle, Ban, Camera, CheckCircle2, FileText, Lock, Table2, Webhook, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/primitives'
import { find } from '@/lib/db'
import { dateTimeSec } from '@/lib/format'
import type { EvidenceItem, MockDocumentSpec, MockRowsSpec, MockScreenshotSpec } from '@/lib/types'

/* ------------------------------------------------------- mock screen shot */

export function MockScreenshot({ spec, className }: { spec: MockScreenshotSpec; className?: string }) {
  const system = find.system(spec.systemId)
  return (
    <figure className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)}>
      <div className="flex items-center gap-2 border-b border-line bg-surface2 px-3 py-2">
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-danger/60" />
          <span className="h-2 w-2 rounded-full bg-accent/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-text">
          {system?.name ?? spec.systemId} · {spec.screen}
        </span>
        {spec.transaction ? (
          <Badge tone="primary" className="shrink-0 font-mono">
            {spec.transaction}
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-x-6 gap-y-2 p-3.5 sm:grid-cols-2">
        {spec.fields.map((field, index) => (
          <div
            key={index}
            className={cn(
              'rounded-md border px-2.5 py-1.5',
              field.state === 'highlight' && 'border-primary/40 bg-primary-soft',
              field.state === 'error' && 'border-danger/40 bg-danger-soft',
              (!field.state || field.state === 'normal') && 'border-line bg-surface2/50',
            )}
          >
            <p className="label">{field.label}</p>
            <p
              className={cn(
                'mono mt-0.5 font-medium',
                field.state === 'error' ? 'text-danger' : field.state === 'highlight' ? 'text-primary' : 'text-text',
              )}
            >
              {field.value}
            </p>
          </div>
        ))}
      </div>
      {spec.blocked ? (
        <div className="flex items-center gap-2 border-t border-line bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
          <Ban className="h-3.5 w-3.5" aria-hidden />
          Action refused by the system
        </div>
      ) : null}
      {spec.note ? (
        <figcaption className="border-t border-line bg-surface2/60 px-3 py-2 text-xs text-muted">{spec.note}</figcaption>
      ) : null}
      <div className="flex items-center gap-1.5 border-t border-line px-3 py-1.5 text-2xs text-muted">
        <Camera className="h-3 w-3" aria-hidden />
        Mock screenshot: rendered panel, not a client screen
      </div>
    </figure>
  )
}

/* ------------------------------------------------------------ result rows */

export function RowsTable({
  spec,
  className,
  onRowClick,
}: {
  spec: MockRowsSpec
  className?: string
  /** makes every row clickable, for example to follow the vehicle in that row */
  onRowClick?: (row: string[], index: number) => void
}) {
  const failRows = new Set(spec.failRows ?? [])
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line', className)}>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-surface2">
            <tr>
              {spec.columns.map((column) => (
                <th key={column} className="label whitespace-nowrap px-3 py-2">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                className={cn(
                  'border-t border-line',
                  failRows.has(rowIndex) && 'bg-danger-soft/50',
                  onRowClick && 'cursor-pointer hover:bg-surface2',
                )}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      'mono whitespace-nowrap px-3 py-2',
                      failRows.has(rowIndex) ? 'text-danger' : 'text-text',
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {spec.caption ? (
        <p className="flex items-center gap-1.5 border-t border-line bg-surface2/60 px-3 py-2 text-xs text-muted">
          <Table2 className="h-3 w-3 shrink-0" aria-hidden />
          {spec.caption}
        </p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------- documents */

export function MockDocument({ spec, className }: { spec: MockDocumentSpec; className?: string }) {
  return (
    <figure className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface2 px-3 py-2">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-text">
          <FileText className="h-3.5 w-3.5 text-muted" aria-hidden />
          {spec.docType}
        </span>
        <span className="mono text-muted">{spec.number}</span>
      </div>
      <div className="bg-white p-5 text-slate-900 dark:bg-surface dark:text-text">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3 dark:border-line">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">{spec.docType}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-muted">{spec.issuedBy}</p>
          </div>
          <p className="font-mono text-xs">{spec.number}</p>
        </div>
        <dl className="mb-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {spec.metaRows.map((meta) => (
            <div key={meta.label} className="flex justify-between gap-3 text-xs">
              <dt className="text-slate-500 dark:text-muted">{meta.label}</dt>
              <dd className="font-mono">{meta.value}</dd>
            </div>
          ))}
        </dl>
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-y border-slate-200 dark:border-line">
              <th className="py-1.5 pr-2 font-semibold">Description</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Quantity</th>
              <th className="py-1.5 pr-2 font-semibold">Unit</th>
              <th className="py-1.5 text-right font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {spec.lines.map((line, index) => (
              <tr key={index} className="border-b border-slate-100 dark:border-line/60">
                <td className="py-1.5 pr-2">{line.description}</td>
                <td className="py-1.5 pr-2 text-right font-mono">{line.qty}</td>
                <td className="py-1.5 pr-2 font-mono">{line.unit}</td>
                <td className="py-1.5 text-right font-mono">{line.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-col items-end gap-1">
          {spec.totals.map((total) => (
            <div key={total.label} className="flex w-56 justify-between text-xs">
              <span className="text-slate-500 dark:text-muted">{total.label}</span>
              <span className="font-mono font-semibold">{total.value}</span>
            </div>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {spec.checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 px-3 py-1.5 text-xs">
            {check.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
            )}
            <span className={check.ok ? 'text-text' : 'text-danger'}>{check.label}</span>
          </li>
        ))}
      </ul>
      <figcaption className="border-t border-line px-3 py-1.5 text-2xs text-muted">
        Document preview: rendered mock, not a real PDF file
      </figcaption>
    </figure>
  )
}

/* --------------------------------------------------------------- payloads */

export function PayloadView({
  payload,
  className,
}: {
  payload: { request?: string; response?: string; status?: number }
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {payload.request ? (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-surface2 px-3 py-1.5">
            <Webhook className="h-3.5 w-3.5 text-muted" aria-hidden />
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted">Request</span>
          </div>
          <pre className="scroll-thin overflow-x-auto bg-surface px-3 py-2 font-mono text-[0.75rem] leading-relaxed text-text">
            {payload.request}
          </pre>
        </div>
      ) : null}
      {payload.response ? (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-surface2 px-3 py-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted">Response</span>
            {payload.status ? (
              <Badge tone={payload.status < 300 ? 'success' : payload.status < 400 ? 'info' : 'danger'}>
                {payload.status}
              </Badge>
            ) : null}
          </div>
          <pre className="scroll-thin overflow-x-auto bg-surface px-3 py-2 font-mono text-[0.75rem] leading-relaxed text-text">
            {payload.response}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

export function LogView({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <pre
      className={cn(
        'scroll-thin max-h-64 overflow-auto rounded-lg border border-line bg-surface2/60 px-3 py-2 font-mono text-[0.75rem] leading-relaxed text-muted',
        className,
      )}
    >
      {lines.join('\n')}
    </pre>
  )
}

/* ------------------------------------------------------------- evidence item */

export function EvidenceBody({ item }: { item: EvidenceItem }) {
  if (item.kind === 'screenshot' && item.screenshot) return <MockScreenshot spec={item.screenshot} />
  if (item.kind === 'document' && item.document) return <MockDocument spec={item.document} />
  if (item.kind === 'query-result' && item.rows) return <RowsTable spec={item.rows} />
  if (item.kind === 'payload' && item.payload) return <PayloadView payload={item.payload} />
  if (item.log && item.log.length > 0) return <LogView lines={item.log} />
  return (
    <p className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-6 text-xs text-muted">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      No preview stored for this evidence item.
    </p>
  )
}

export function EvidenceCard({ item, children }: { item: EvidenceItem; children?: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{item.title}</p>
          <p className="mt-0.5 text-2xs text-muted">
            Captured {dateTimeSec(item.capturedAt)} · {item.kind.replace('-', ' ')}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {item.locked ? (
            <Badge tone="success">
              <Lock className="h-3 w-3" aria-hidden /> Locked
            </Badge>
          ) : null}
          {item.approvedByRole ? <Badge tone="primary">Approved by {item.approvedByRole}</Badge> : null}
        </div>
      </div>
      <p className="mono break-all text-2xs text-muted">{item.hash}</p>
      <EvidenceBody item={item} />
      {children}
    </div>
  )
}
