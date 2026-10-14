import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Info, Play } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Progress } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import {
  HealthBadge,
  HealthDot,
  HealthLegend,
  ScenarioTypeBadge,
  SeverityBadge,
  VerdictBadge,
} from '@/components/common/badges'
import { FindingRef, PageRef, RunRef, ScenarioRef } from '@/components/common/links'
import { useApi } from '@/lib/useApi'
import * as api from '@/lib/api'
import { find } from '@/lib/db'
import { COVERAGE_NOTE } from '@/data/requirements'
import { REQUIREMENT_STATUS_MEANING } from '@/lib/score'
import { cn } from '@/lib/utils'
import type { Health, RequirementId } from '@/lib/types'

export default function CoveragePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { data } = useApi(() => api.getRequirementCoverage(), [])
  const [openId, setOpenId] = useState<RequirementId | null>((params.get('req') as RequirementId) ?? null)

  useEffect(() => {
    const req = params.get('req') as RequirementId | null
    if (req) setOpenId(req)
  }, [params])

  const open = data?.find((entry) => entry.requirement.id === openId)

  const covered = (data ?? []).filter((entry) => entry.status === 'Healthy').length
  const attention = (data ?? []).filter((entry) => entry.status === 'Attention').length
  const atRisk = (data ?? []).filter((entry) => entry.status === 'At risk').length

  return (
    <>
      <PageHeader
        title="Requirement Coverage"
        description="R1 to R10 mapped to the page that demonstrates it, the scenarios that exercise it and the runs that produced the evidence."
        requirements={['R1', 'R2', 'R3', 'R4', 'R5']}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/evidence')}>
            Evidence and reports
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" title={REQUIREMENT_STATUS_MEANING.Healthy}>
            {covered} demo-ready
          </Badge>
          <Badge tone="accent" title={REQUIREMENT_STATUS_MEANING.Attention}>
            {attention} partial
          </Badge>
          <Badge tone="danger" title={REQUIREMENT_STATUS_MEANING['At risk']}>
            {atRisk} missing
          </Badge>
          <HealthLegend />
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface2 px-2 py-1 text-2xs text-muted">
            <Info className="h-3 w-3" />
            {COVERAGE_NOTE}
          </span>
        </div>
      </PageHeader>

      <Card className="mb-4">
        <CardHeader
          title="R1 to R10"
          description="Click a requirement for the detail, or open the page that demonstrates it directly."
        />
        <DataTable
          rows={data ?? []}
          getRowId={(row) => row.requirement.id}
          searchText={(row) => `${row.requirement.id} ${row.requirement.title} ${row.requirement.description}`}
          searchPlaceholder="Search requirements"
          onRowClick={(row) => {
            setOpenId(row.requirement.id)
            setParams({ req: row.requirement.id })
          }}
          activeRowId={openId}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: (['Healthy', 'Attention', 'At risk', 'Not tested'] as Health[]).map((value) => ({
                value,
                label: value,
              })),
              match: (row, value) => row.status === value,
            },
          ]}
          columns={[
            {
              key: 'id',
              header: 'Requirement',
              sortValue: (row) => row.requirement.id,
              render: (row) => (
                <span className="flex items-start gap-2">
                  <Badge tone="primary">{row.requirement.id}</Badge>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-text">{row.requirement.title}</span>
                    <span className="mt-0.5 block text-2xs text-muted">{row.requirement.description}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'page',
              header: 'Demonstrated on',
              render: (row) => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(row.requirement.demoRoute)
                  }}
                >
                  {row.requirement.demoPageName}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              ),
            },
            {
              key: 'coverage',
              header: 'Coverage',
              align: 'right',
              sortValue: (row) => row.coveragePct,
              render: (row) => (
                <span className="inline-flex w-24 flex-col items-end">
                  <span className="mono text-xs font-semibold text-text">{row.coveragePct} %</span>
                  <Progress
                    value={row.coveragePct}
                    height="h-1"
                    tone={row.coveragePct >= 80 ? 'success' : row.coveragePct >= 60 ? 'accent' : 'danger'}
                  />
                </span>
              ),
            },
            {
              key: 'scenarios',
              header: 'Scenarios',
              align: 'right',
              sortValue: (row) => row.scenarioIds.length,
              render: (row) => <span className="mono">{row.scenarioIds.length}</span>,
            },
            {
              key: 'runs',
              header: 'Runs',
              align: 'right',
              sortValue: (row) => row.runIds.length,
              render: (row) => <span className="mono">{row.runIds.length}</span>,
              hideBelow: 'sm',
            },
            {
              key: 'findings',
              header: 'Open findings',
              align: 'right',
              sortValue: (row) => row.openFindings.length,
              render: (row) => (
                <span className={cn('mono', row.openFindings.length > 0 && 'text-danger')}>
                  {row.openFindings.length}
                </span>
              ),
              hideBelow: 'md',
            },
            {
              key: 'status',
              header: 'Status',
              sortValue: (row) => row.status,
              render: (row) => (
                <span className="flex items-center gap-1.5" title={REQUIREMENT_STATUS_MEANING[row.status]}>
                  <HealthDot health={row.status} title={REQUIREMENT_STATUS_MEANING[row.status]} />
                  <HealthBadge health={row.status} />
                </span>
              ),
            },
          ]}
          caption={COVERAGE_NOTE}
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((entry) => (
          <Card key={entry.requirement.id}>
            <CardHeader
              title={`${entry.requirement.id} ${entry.requirement.title}`}
              description={entry.requirement.description}
              actions={<HealthDot health={entry.status} title={REQUIREMENT_STATUS_MEANING[entry.status]} />}
            />
            <CardBody className="space-y-2">
              <Progress
                value={entry.coveragePct}
                tone={entry.coveragePct >= 80 ? 'success' : entry.coveragePct >= 60 ? 'accent' : 'danger'}
              />
              <p className="text-xs text-muted">{entry.requirement.howDemonstrated}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={() => navigate(entry.requirement.demoRoute)}>
                  <Play className="h-3.5 w-3.5" />
                  {entry.requirement.demoPageName}
                </Button>
                {entry.requirement.secondaryRoutes.map((secondary) => (
                  <PageRef key={secondary.route} to={secondary.route}>
                    {secondary.pageName}
                  </PageRef>
                ))}
              </div>
              <p className="text-2xs text-muted">
                {entry.scenarioIds.length} scenarios · {entry.runIds.length} runs · {entry.openFindings.length} open
                findings
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Drawer
        open={Boolean(open)}
        onClose={() => {
          setOpenId(null)
          setParams({})
        }}
        width="w-full max-w-2xl"
        title={open ? `${open.requirement.id} ${open.requirement.title}` : ''}
        subtitle={open?.requirement.description}
        badges={
          open ? (
            <>
              <HealthBadge health={open.status} />
              <Badge tone="primary">{open.coveragePct} % coverage</Badge>
            </>
          ) : undefined
        }
        footer={
          open ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  navigate(open.requirement.demoRoute)
                }}
              >
                Open {open.requirement.demoPageName}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <span className="text-2xs text-muted">{COVERAGE_NOTE}</span>
            </div>
          ) : undefined
        }
      >
        {open ? (
          <div className="space-y-5">
            <div>
              <p className="label mb-1">How it is demonstrated</p>
              <p className="text-sm text-text">{open.requirement.howDemonstrated}</p>
            </div>

            <div>
              <p className="label mb-1.5">Pages</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => navigate(open.requirement.demoRoute)}>
                  {open.requirement.demoPageName}
                </Button>
                {open.requirement.secondaryRoutes.map((secondary) => (
                  <Button
                    key={secondary.route}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(secondary.route)}
                  >
                    {secondary.pageName}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="label mb-1.5">Scenarios that exercise it ({open.scenarioIds.length})</p>
              {open.scenarioIds.length === 0 ? (
                <p className="text-xs text-muted">
                  This requirement is demonstrated by a page rather than by scenarios.
                </p>
              ) : (
                <div className="space-y-1">
                  {open.scenarioIds.slice(0, 12).map((id) => {
                    const scenario = find.scenario(id)
                    return (
                      <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                        <ScenarioRef id={id} />
                        <span className="flex items-center gap-1.5">
                          {scenario ? <ScenarioTypeBadge type={scenario.type} /> : null}
                          {scenario?.lastRunId ? <RunRef id={scenario.lastRunId} label={scenario.lastRunId} /> : null}
                        </span>
                      </div>
                    )
                  })}
                  {open.scenarioIds.length > 12 ? (
                    <p className="pt-1 text-2xs text-muted">and {open.scenarioIds.length - 12} more.</p>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <p className="label mb-1.5">Runs with evidence ({open.runIds.length})</p>
              <div className="space-y-1">
                {open.runIds.slice(0, 8).map((id) => {
                  const run = find.run(id)
                  return (
                    <div key={id} className="flex flex-wrap items-center justify-between gap-2">
                      <RunRef id={id} />
                      {run ? <VerdictBadge verdict={run.verdict} /> : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="label mb-1.5">Open findings on this requirement</p>
              {open.openFindings.length === 0 ? (
                <p className="text-xs text-success">No open findings.</p>
              ) : (
                <div className="space-y-1.5">
                  {open.openFindings.map((finding) => (
                    <div key={finding.id} className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={finding.severity} />
                      <FindingRef id={finding.id} label={finding.title} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-line bg-surface2/60 p-3">
              <p className="flex items-start gap-1.5 text-xs text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {COVERAGE_NOTE}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState title="Select a requirement" />
        )}
      </Drawer>
    </>
  )
}
