import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, GraduationCap, Users } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, KeyValue, Progress } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import { PageRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi } from '@/lib/useApi'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { DeliveryMilestone, DeliveryTarget, PodRole } from '@/lib/types'

const PHASE_TONE: Record<string, string> = {
  Build: 'border-primary/40 bg-primary-soft/40',
  Run: 'border-accent/40 bg-accent-soft/40',
  'Hand over': 'border-success/40 bg-success-soft/40',
}

export default function DeliveryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: model } = useApi(() => api.getDeliveryModel(), [])
  const [openMilestone, setOpenMilestone] = useState<DeliveryMilestone | null>(null)
  const [openTarget, setOpenTarget] = useState<DeliveryTarget | null>(null)
  const [openPod, setOpenPod] = useState<PodRole | null>(null)
  const [phaseFilter, setPhaseFilter] = useState<'Build' | 'Run' | 'Hand over' | 'ALL'>('ALL')

  if (!model) {
    return (
      <>
        <PageHeader title="Delivery Model" description="Loading the delivery picture." />
        <Card>
          <CardBody className="h-40 animate-pulse-soft" />
        </Card>
      </>
    )
  }

  const trainingDone = model.training.filter((item) => item.done).length

  return (
    <>
      <PageHeader
        title="Delivery Model"
        description="One pod builds the framework, runs it for every change and every close, and hands it over to the client team. Vendor headcount ends at zero; the platform and the knowledge stay."
        requirements={['R10']}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/coverage')}>
            Requirement coverage
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        {model.phases.map((phase, index) => (
          <Card
            key={phase.key}
            className={cn(
              'cursor-pointer border transition-colors hover:bg-surface2/40',
              PHASE_TONE[phase.key],
              phaseFilter === phase.key && 'ring-2 ring-primary/40',
            )}
            onClick={() => setPhaseFilter((current) => (current === phase.key ? 'ALL' : phase.key))}
            title={`Show the ${phase.key} milestones`}
          >
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text">
                  {index + 1}. {phase.key}
                </p>
                <Badge tone={phase.progressPct >= 70 ? 'success' : phase.progressPct >= 40 ? 'accent' : 'neutral'}>
                  {phase.progressPct} %
                </Badge>
              </div>
              <Progress
                value={phase.progressPct}
                tone={phase.key === 'Build' ? 'primary' : phase.key === 'Run' ? 'accent' : 'success'}
              />
              <p className="text-xs text-muted">{phase.summary}</p>
              <p className="text-2xs text-muted">
                {model.milestones.filter((milestone) => milestone.phase === phase.key && milestone.status === 'Done').length}{' '}
                of {model.milestones.filter((milestone) => milestone.phase === phase.key).length} milestones done
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Outcome targets" description="What the client is buying, measured. Click a target for the detail." />
          <CardBody className="space-y-2">
            {model.targets.map((target) => {
              const improving = target.target >= target.current
              const progress = improving
                ? Math.round((target.current / Math.max(target.target, 1)) * 100)
                : Math.round(((target.current - target.target) / Math.max(target.current, 1)) * 100)
              return (
                <button
                  key={target.key}
                  type="button"
                  onClick={() => setOpenTarget(target)}
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:bg-surface2/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text">{target.label}</span>
                    <span className="flex items-baseline gap-1.5 text-sm">
                      <span className="font-semibold tabular-nums text-text">{target.current}</span>
                      <ArrowRight className="h-3 w-3 text-muted" />
                      <span className="font-semibold tabular-nums text-success">{target.target}</span>
                      <span className="text-2xs text-muted">{target.unit}</span>
                    </span>
                  </div>
                  <Progress
                    className="mt-1.5"
                    height="h-1.5"
                    value={improving ? progress : 100 - progress}
                    tone={improving ? 'success' : 'accent'}
                  />
                  <p className="mt-1 text-xs text-muted">{target.plain}</p>
                </button>
              )
            })}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Pod roles"
              description="Who does what in each phase, and who it hands over to."
              icon={<Users className="h-4 w-4 text-primary" />}
            />
            <DataTable
              rows={model.podRoles}
              getRowId={(row) => row.id}
              onRowClick={(row) => setOpenPod(row)}
              activeRowId={openPod?.id ?? null}
              dense
              columns={[
                {
                  key: 'role',
                  header: 'Role',
                  sortValue: (row) => row.role,
                  render: (row: PodRole) => (
                    <span className="block">
                      <span className="text-xs font-medium text-text">{row.role}</span>
                      <span className="mt-0.5 block text-2xs text-muted">{row.focus}</span>
                    </span>
                  ),
                },
                {
                  key: 'phase',
                  header: 'Phase',
                  sortValue: (row) => row.phase,
                  render: (row) => <Badge tone="primary">{row.phase}</Badge>,
                },
                {
                  key: 'allocation',
                  header: 'Allocation',
                  align: 'right',
                  sortValue: (row) => row.allocationPct,
                  render: (row) => <span className="mono">{row.allocationPct} %</span>,
                },
                {
                  key: 'handover',
                  header: 'Hands over to',
                  render: (row) => <span className="text-2xs text-muted">{row.handoverTo}</span>,
                  hideBelow: 'sm',
                },
              ]}
              caption="Roles only, no names: the pod is a capability, not a set of individuals."
            />
          </Card>

          <Card>
            <CardHeader
              title="Handover training"
              description="Tick an item when the client team has it."
              icon={<GraduationCap className="h-4 w-4 text-primary" />}
              actions={
                <Badge tone={trainingDone === model.training.length ? 'success' : 'accent'}>
                  {trainingDone} of {model.training.length}
                </Badge>
              }
            />
            <CardBody className="space-y-1.5">
              {model.training.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-lg border px-2.5 py-2',
                    item.done ? 'border-success/40 bg-success-soft/25' : 'border-line',
                  )}
                >
                  <Checkbox
                    checked={item.done}
                    onChange={() => {
                      void api.setTrainingDone(item.id, !item.done).then(() =>
                        toast({
                          title: item.done ? 'Marked as not done' : 'Marked as done',
                          description: item.label,
                          tone: item.done ? 'info' : 'success',
                        }),
                      )
                    }}
                    label={item.label}
                    description={`${item.owner} · ${item.detail}`}
                  />
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader
          title={phaseFilter === 'ALL' ? 'Milestones' : `Milestones - ${phaseFilter}`}
          description="Click a milestone for the detail. Build and Run are vendor led; Hand over moves everything to the client team."
          actions={
            phaseFilter === 'ALL' ? undefined : (
              <Button variant="ghost" size="sm" onClick={() => setPhaseFilter('ALL')}>
                Show every phase
              </Button>
            )
          }
        />
        <CardBody>
          <div className="space-y-2">
            {model.milestones
              .filter((milestone) => phaseFilter === 'ALL' || milestone.phase === phaseFilter)
              .map((milestone) => (
              <button
                key={milestone.id}
                type="button"
                onClick={() => setOpenMilestone(milestone)}
                className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-surface2/60"
              >
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-2xs font-semibold',
                    milestone.status === 'Done'
                      ? 'border-success bg-success text-white'
                      : milestone.status === 'In progress'
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-surface text-muted',
                  )}
                >
                  {milestone.status === 'Done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : milestone.id.split('-')[1]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text">{milestone.label}</span>
                  <span className="mt-0.5 block text-2xs text-muted">{milestone.detail}</span>
                </span>
                <Badge tone="primary">{milestone.phase}</Badge>
                <Badge
                  tone={
                    milestone.status === 'Done' ? 'success' : milestone.status === 'In progress' ? 'accent' : 'neutral'
                  }
                >
                  {milestone.status}
                </Badge>
                <span className="inline-flex items-center gap-1 text-2xs text-muted">
                  <Clock className="h-3 w-3" />
                  {milestone.week}
                </span>
                </button>
              ))}
          </div>
        </CardBody>
      </Card>

      <Drawer
        open={Boolean(openPod)}
        onClose={() => setOpenPod(null)}
        title={openPod?.role ?? ''}
        subtitle={openPod?.focus}
        badges={
          openPod ? (
            <>
              <Badge tone="primary">{openPod.phase}</Badge>
              <Badge tone="neutral">{openPod.allocationPct} % allocated</Badge>
            </>
          ) : undefined
        }
      >
        {openPod ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Phase', value: openPod.phase },
                { label: 'Allocation', value: `${openPod.allocationPct} %` },
                { label: 'Focus', value: openPod.focus },
                { label: 'Hands over to', value: openPod.handoverTo },
              ]}
            />
            <p className="text-xs text-muted">
              This is a role, not a person. During Hand over the work moves to {openPod.handoverTo} and the vendor
              allocation for this role goes to zero.
            </p>
            <div>
              <p className="label mb-1.5">Milestones this role owns</p>
              <div className="space-y-1">
                {model.milestones
                  .filter((milestone) => milestone.phase === openPod.phase)
                  .map((milestone) => (
                    <button
                      key={milestone.id}
                      type="button"
                      onClick={() => {
                        setOpenPod(null)
                        setOpenMilestone(milestone)
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5 text-left hover:bg-surface2"
                    >
                      <span className="text-xs text-text">{milestone.label}</span>
                      <Badge
                        tone={
                          milestone.status === 'Done'
                            ? 'success'
                            : milestone.status === 'In progress'
                              ? 'accent'
                              : 'neutral'
                        }
                      >
                        {milestone.status}
                      </Badge>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={Boolean(openMilestone)}
        onClose={() => setOpenMilestone(null)}
        title={openMilestone?.label ?? ''}
        subtitle={openMilestone ? `${openMilestone.phase} phase · ${openMilestone.week}` : ''}
        badges={
          openMilestone ? (
            <Badge
              tone={
                openMilestone.status === 'Done' ? 'success' : openMilestone.status === 'In progress' ? 'accent' : 'neutral'
              }
            >
              {openMilestone.status}
            </Badge>
          ) : undefined
        }
      >
        {openMilestone ? (
          <div className="space-y-4">
            <p className="text-sm text-text">{openMilestone.detail}</p>
            <KeyValue
              columns={2}
              rows={[
                { label: 'Phase', value: openMilestone.phase },
                { label: 'Week', value: openMilestone.week },
                { label: 'Status', value: openMilestone.status },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <PageRef to="/">Command Centre</PageRef>
              <PageRef to="/coverage">Requirement coverage</PageRef>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={Boolean(openTarget)}
        onClose={() => setOpenTarget(null)}
        title={openTarget?.label ?? ''}
        subtitle={openTarget?.plain}
        badges={
          openTarget ? (
            <>
              <Badge tone="neutral">
                now {openTarget.current} {openTarget.unit}
              </Badge>
              <Badge tone="success">
                target {openTarget.target} {openTarget.unit}
              </Badge>
            </>
          ) : undefined
        }
      >
        {openTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-text">{openTarget.plain}</p>
            {openTarget.key === 'freeze' ? (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  The freeze is the headline outcome: ten days of frozen change around the close today, three days once
                  regression, reconciliation and load testing run automatically.
                </p>
                <PageRef to="/release">Open the freeze calendar</PageRef>
              </div>
            ) : null}
            {openTarget.key === 'processes' ? <PageRef to="/studio">See the scenarios per process</PageRef> : null}
            {openTarget.key === 'manual-hours' ? <PageRef to="/">See the hours saved on the Command Centre</PageRef> : null}
            {openTarget.key === 'defects' ? <PageRef to="/run">See the findings</PageRef> : null}
            {openTarget.key === 'coverage' ? <PageRef to="/coverage">Open requirement coverage</PageRef> : null}
            {openTarget.key === 'headcount' ? (
              <p className="text-xs text-muted">
                Build and Run are delivered by the pod. During Hand over the pod moves to on call only, and after two
                closes run by the client team the vendor allocation is zero.
              </p>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
