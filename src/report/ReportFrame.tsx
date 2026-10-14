import type { ReactNode } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/primitives'
import { dateTimeSec } from '@/lib/format'

/**
 * Shared chrome for the four reporting outputs: finding card, run summary,
 * release report and audit evidence pack. No sidebar, J2W header, POC footer,
 * one print button, and print styles that drop the controls.
 */
export function ReportFrame({
  docType,
  title,
  subtitle,
  badges,
  meta,
  actions,
  children,
  width = 'max-w-4xl',
  generatedAt,
  backTo,
  backLabel = 'Back to the app',
}: {
  docType: string
  title: string
  subtitle?: ReactNode
  badges?: ReactNode
  meta?: { label: string; value: ReactNode }[]
  actions?: ReactNode
  children: ReactNode
  width?: string
  generatedAt: string
  backTo?: string
  backLabel?: string
}) {
  return (
    <div className="min-h-full w-full overflow-x-hidden bg-bg">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-3 px-6 py-3`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg">
              <span className="font-mono text-xs font-semibold">J2W</span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">AI Test Factory · {docType}</p>
              <p className="truncate text-2xs text-muted">Generated {dateTimeSec(generatedAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {backTo ? (
              <Button variant="ghost" size="sm" onClick={() => window.location.assign(backTo)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel}
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </header>

      <main className={`mx-auto ${width} px-6 py-7`}>
        {/* repeated on paper, where the sticky header is gone */}
        <div className="print-only mb-4 hidden items-center justify-between border-b border-line pb-2">
          <p className="text-xs font-semibold text-text">J2W AI Test Factory · {docType}</p>
          <p className="text-2xs text-muted">{dateTimeSec(generatedAt)}</p>
        </div>

        <div className="mb-6 border-b border-line pb-5">
          <p className="label">{docType}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-text">{title}</h1>
          {subtitle ? <p className="mt-1.5 max-w-3xl text-sm text-muted">{subtitle}</p> : null}
          {badges ? <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div> : null}
          {meta && meta.length > 0 ? (
            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              {meta.map((row) => (
                <div key={row.label} className="min-w-0">
                  <dt className="label">{row.label}</dt>
                  <dd className="mt-0.5 truncate text-sm text-text">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {children}

        <footer className="mt-8 border-t border-line pt-4 text-2xs text-muted">
          <p className="font-medium">J2W · POC – mock data for demonstration</p>
          <p className="mt-1">
            {docType} generated {dateTimeSec(generatedAt)}. Mapping of requirements to be verified against the client's
            requirement document.
          </p>
        </footer>
      </main>
    </div>
  )
}

export function ReportSection({
  title,
  description,
  actions,
  children,
  breakBefore,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  breakBefore?: boolean
}) {
  return (
    <section className={`print-page mb-7 ${breakBefore ? 'print-break' : ''}`}>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-1.5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="no-print flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function ReportTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-surface2">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="label whitespace-nowrap px-3 py-2">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-line">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-1.5 align-top text-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SignOffBlock({
  roles,
}: {
  roles: { role: string; purpose: string }[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {roles.map((signature) => (
        <div key={signature.role} className="rounded-lg border border-line p-4">
          <p className="text-xs font-semibold text-text">{signature.role}</p>
          <p className="mt-0.5 text-2xs text-muted">{signature.purpose}</p>
          <div className="mt-8 border-b border-dashed border-line" />
          <p className="mt-1 text-2xs text-muted">Name, role and date</p>
        </div>
      ))}
    </div>
  )
}
