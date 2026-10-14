import { useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/primitives'
import type { LoadPoint, TrendPoint } from '@/lib/types'

/**
 * Chart layer. Two validated categorical series colours (blue, aqua), one axis
 * per chart, small multiples instead of a second y-axis, legend plus direct end
 * labels so identity is never colour alone, and a table view for every chart.
 */

const AXIS = 'hsl(var(--viz-axis))'
const GRID = 'hsl(var(--viz-grid))'
const SERIES_1 = 'hsl(var(--viz-1))'
const SERIES_2 = 'hsl(var(--viz-2))'

const axisProps = {
  stroke: AXIS,
  tick: { fill: AXIS, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: GRID },
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2 shadow-pop">
      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-1.5 text-xs text-text">
          {row.color ? <span className="h-2 w-2 rounded-sm" style={{ background: row.color }} /> : null}
          <span className="text-muted">{row.label}</span>
          <span className="ml-auto font-mono font-medium tabular-nums">{row.value}</span>
        </p>
      ))}
    </div>
  )
}

function ChartFrame({
  children,
  table,
  legend,
  height = 'h-56',
}: {
  children: ReactNode
  table: ReactNode
  legend?: ReactNode
  height?: string
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">{legend}</div>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((value) => !value)}>
          <Table2 className="h-3.5 w-3.5" />
          {showTable ? 'Hide table' : 'Table view'}
        </Button>
      </div>
      {showTable ? (
        <div className="scroll-thin max-h-64 overflow-auto rounded-lg border border-line">{table}</div>
      ) : (
        <div className={cn('w-full', height)}>{children}</div>
      )}
    </div>
  )
}

function LegendItem({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-muted">{label}</span>
      {value ? <span className="font-mono font-medium tabular-nums text-text">{value}</span> : null}
    </span>
  )
}

/* -------------------------------------------------------------- trend chart */

export function TrendChart({
  points,
  onPointClick,
  height = 'h-60',
}: {
  points: TrendPoint[]
  onPointClick?: (point: TrendPoint) => void
  height?: string
}) {
  const last = points[points.length - 1]

  return (
    <ChartFrame
      height={height}
      legend={
        <>
          <LegendItem color={SERIES_1} label="Confidence score" value={last ? `${last.confidence}` : undefined} />
          <LegendItem color={SERIES_2} label="Pass rate %" value={last ? `${last.passRate} %` : undefined} />
          <span className="text-2xs text-muted">Click a day to see the runs behind it</span>
        </>
      }
      table={
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-surface2">
            <tr>
              <th className="label px-3 py-1.5">Day</th>
              <th className="label px-3 py-1.5 text-right">Confidence</th>
              <th className="label px-3 py-1.5 text-right">Pass rate</th>
              <th className="label px-3 py-1.5 text-right">Scenarios</th>
              <th className="label px-3 py-1.5 text-right">Open findings</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((point) => (
              <tr key={point.date} className="border-t border-line">
                <td className="px-3 py-1.5">{point.label}</td>
                <td className="mono px-3 py-1.5 text-right">{point.confidence}</td>
                <td className="mono px-3 py-1.5 text-right">{point.passRate} %</td>
                <td className="mono px-3 py-1.5 text-right">{point.scenarios}</td>
                <td className="mono px-3 py-1.5 text-right">{point.openFindings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 44, bottom: 0, left: -18 }}
          onClick={(state: { activePayload?: { payload: TrendPoint }[] }) => {
            const payload = state?.activePayload?.[0]?.payload
            if (payload && onPointClick) onPointClick(payload)
          }}
        >
          <defs>
            <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_1} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SERIES_1} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval={4} />
          <YAxis domain={[40, 100]} {...axisProps} width={44} />
          <Tooltip
            cursor={{ stroke: AXIS, strokeDasharray: '3 3' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(label)}
                  rows={[
                    { label: 'Confidence', value: `${payload[0]?.payload.confidence}`, color: SERIES_1 },
                    { label: 'Pass rate', value: `${payload[0]?.payload.passRate} %`, color: SERIES_2 },
                    { label: 'Open findings', value: `${payload[0]?.payload.openFindings}` },
                    { label: 'Runs that day', value: `${payload[0]?.payload.runs}` },
                  ]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="confidence"
            stroke={SERIES_1}
            strokeWidth={2}
            fill="url(#confidenceFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--surface))' }}
            name="Confidence score"
          />
          <Area
            type="monotone"
            dataKey="passRate"
            stroke={SERIES_2}
            strokeWidth={2}
            fill="none"
            strokeDasharray="5 3"
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--surface))' }}
            name="Pass rate %"
          />
          <ReferenceLine y={80} stroke={GRID} strokeDasharray="4 4" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ---------------------------------------------------- load small multiples */

const LOAD_METRICS: {
  key: keyof LoadPoint
  label: string
  unit: string
  limit?: number
  limitLabel?: string
}[] = [
  { key: 'throughput', label: 'Throughput', unit: 'documents per minute' },
  { key: 'p95Ms', label: 'Response time p95', unit: 'milliseconds', limit: 3000, limitLabel: 'limit 3 000 ms' },
  { key: 'errorRatePct', label: 'Error rate', unit: 'percent', limit: 1, limitLabel: 'limit 1 %' },
  { key: 'backlog', label: 'Interface backlog', unit: 'messages waiting' },
]

export function LoadSmallMultiples({ series }: { series: LoadPoint[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {LOAD_METRICS.map((metric) => {
        const peak = Math.max(...series.map((point) => Number(point[metric.key])))
        return (
          <div key={String(metric.key)} className="rounded-lg border border-line p-2.5">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-text">{metric.label}</p>
              <p className="text-2xs text-muted">
                peak <span className="mono font-medium text-text">{peak}</span> · {metric.unit}
              </p>
            </div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="minute" {...axisProps} interval={3} />
                  <YAxis {...axisProps} width={42} />
                  <Tooltip
                    cursor={{ stroke: AXIS, strokeDasharray: '3 3' }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <TooltipBox
                          title={`Minute ${label}`}
                          rows={[
                            {
                              label: metric.label,
                              value: `${payload[0]?.value} ${metric.unit === 'percent' ? '%' : ''}`.trim(),
                              color: SERIES_1,
                            },
                          ]}
                        />
                      ) : null
                    }
                  />
                  {metric.limit ? (
                    <ReferenceLine
                      y={metric.limit}
                      stroke="hsl(var(--danger))"
                      strokeDasharray="4 4"
                      label={{ value: metric.limitLabel, fill: 'hsl(var(--danger))', fontSize: 10, position: 'insideTopRight' }}
                    />
                  ) : null}
                  <Line
                    type="monotone"
                    dataKey={String(metric.key)}
                    stroke={SERIES_1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--surface))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ bar chart */

export function CategoryBars({
  data,
  onBarClick,
  valueSuffix = '',
  height = 'h-56',
  tableHeader = ['Item', 'Value'],
}: {
  data: { key: string; label: string; value: number; tone?: 'default' | 'danger' | 'accent' | 'success' }[]
  onBarClick?: (key: string) => void
  valueSuffix?: string
  height?: string
  tableHeader?: [string, string]
}) {
  const colorFor = (tone?: string) =>
    tone === 'danger'
      ? 'hsl(var(--danger))'
      : tone === 'accent'
        ? 'hsl(var(--accent))'
        : tone === 'success'
          ? 'hsl(var(--success))'
          : SERIES_1

  return (
    <ChartFrame
      height={height}
      legend={<span className="text-2xs text-muted">Click a bar to open the list behind it</span>}
      table={
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-surface2">
            <tr>
              <th className="label px-3 py-1.5">{tableHeader[0]}</th>
              <th className="label px-3 py-1.5 text-right">{tableHeader[1]}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.key} className="border-t border-line">
                <td className="px-3 py-1.5">{row.label}</td>
                <td className="mono px-3 py-1.5 text-right">
                  {row.value}
                  {valueSuffix}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={40} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--surface-2) / 0.7)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(label)}
                  rows={[{ label: 'Value', value: `${payload[0]?.value}${valueSuffix}`, color: SERIES_1 }]}
                />
              ) : null
            }
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            onClick={(entry: { key?: string }) => entry?.key && onBarClick?.(entry.key)}
            className={onBarClick ? 'cursor-pointer' : undefined}
          >
            {data.map((row) => (
              <Cell key={row.key} fill={colorFor(row.tone)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ------------------------------------------------------------- sparkline */

export function Sparkline({
  points,
  dataKey,
  height = 40,
}: {
  points: Record<string, number | string>[]
  dataKey: string
  height?: number
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <Line type="monotone" dataKey={dataKey} stroke={SERIES_1} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
