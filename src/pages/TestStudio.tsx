import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Pencil, Play, Plus, Sparkles, ThumbsDown, Wand2, X } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  EmptyState,
  Input,
  KeyValue,
  Progress,
  Textarea,
} from '@/components/ui/primitives'
import { Drawer, Modal } from '@/components/ui/overlays'
import { LiveLog } from '@/components/common/LiveLog'
import { StepCard } from '@/components/common/steps'
import { RowsTable } from '@/components/common/evidence'
import {
  AiBadge,
  ApprovalBadge,
  ScenarioTypeBadge,
  SeverityBadge,
} from '@/components/common/badges'
import {
  InterfacePicker,
  ProcessPicker,
  ScenarioTypeChips,
  SelectionSummary,
  SitePicker,
  SystemPicker,
  TestDataSetPicker,
} from '@/components/common/selectors'
import { InterfaceRef, ProcessRef, RequirementRef, RunRef, SystemRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import { useRole } from '@/lib/role'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { dateMedium } from '@/lib/format'
import { cn, pct } from '@/lib/utils'
import type { Scenario, ScenarioType, Step } from '@/lib/types'

const TYPE_ORDER: ScenarioType[] = ['Positive', 'Negative', 'Regression']

export default function TestStudioPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { role } = useRole()
  const { selection, patch, toggleType, toggleIn } = useSelection()

  const [openScenarioId, setOpenScenarioId] = useState<string | null>(params.get('scenario'))
  const [generationJobId, setGenerationJobId] = useState<string | null>(null)
  const [rule, setRule] = useState('Net weight must equal gross weight minus tare weight')
  const [ruleStep, setRuleStep] = useState<Step | null>(null)
  const [ruleBusy, setRuleBusy] = useState(false)
  const [editStep, setEditStep] = useState<Step | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', plain: '', expected: '' })
  const [decision, setDecision] = useState<{ scenarioId: string; mode: 'approve' | 'reject' } | null>(null)
  const [comment, setComment] = useState('')

  const generationJob = useJob<Scenario[]>(generationJobId)

  const { data: scenarios } = useApi(
    () =>
      api.listScenarios({
        processId: selection.processId,
        types: selection.scenarioTypes,
        systemIds: selection.systemIds,
        interfaceIds: selection.interfaceIds,
        site: selection.site,
      }),
    [selection.processId, selection.scenarioTypes.join(), selection.systemIds.join(), selection.interfaceIds.join(), selection.site],
  )

  useEffect(() => {
    const scenarioParam = params.get('scenario')
    if (scenarioParam) setOpenScenarioId(scenarioParam)
  }, [params])

  useEffect(() => {
    if (generationJob?.status === 'done' && generationJob.result) {
      const created = generationJob.result
      if (created.length > 0) {
        toast({
          title: `${created.length} scenarios generated`,
          description: 'They are waiting for key-user approval.',
          tone: 'ai',
          actionLabel: 'Open the first one',
          onAction: () => setOpenScenarioId(created[0].id),
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationJob?.status])

  const openScenario = openScenarioId ? find.scenario(openScenarioId) : undefined
  const grouped = useMemo(() => {
    const result: Record<ScenarioType, Scenario[]> = { Positive: [], Negative: [], Regression: [] }
    for (const scenario of scenarios ?? []) result[scenario.type].push(scenario)
    return result
  }, [scenarios])

  const processScenarios = db.scenarios.filter(
    (scenario) => selection.processId === 'ALL' || scenario.processId === selection.processId,
  )
  const approvedCount = processScenarios.filter((scenario) => scenario.approval === 'Approved').length
  const coverage = pct(approvedCount, Math.max(processScenarios.length, 1))

  function handleApprove(scenarioId: string, text?: string) {
    void api.approveScenario(scenarioId, role.name, text).then(() => {
      toast({ title: 'Scenario approved', description: `${scenarioId} is now part of the suite.`, tone: 'success' })
    })
  }

  function handleReject(scenarioId: string, text?: string) {
    void api.rejectScenario(scenarioId, role.name, text).then(() => {
      toast({ title: 'Scenario rejected', description: `${scenarioId} will not run until it is rewritten.`, tone: 'warning' })
    })
  }

  return (
    <>
      <PageHeader
        title="Test Studio"
        description="AI writes the scenarios for a process, grouped positive, negative and regression. Plain language first, technical detail behind a toggle. Nothing runs until a key user approves it."
        requirements={['R1', 'R2', 'R9']}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={selection.scenarioIds.length === 0}
              onClick={() => navigate('/run')}
            >
              <Play className="h-3.5 w-3.5" />
              Run {selection.scenarioIds.length || ''} selected
            </Button>
            <Button
              variant="ai"
              size="sm"
              disabled={selection.processId === 'ALL' || generationJob?.status === 'running'}
              onClick={() => {
                if (selection.processId === 'ALL') return
                setGenerationJobId(
                  api.generateScenarios({ processId: selection.processId, types: selection.scenarioTypes }),
                )
                toast({ title: 'AI is writing scenarios', description: 'Watch the live log on the right.', tone: 'ai' })
              }}
              loading={generationJob?.status === 'running'}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate scenarios with AI
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProcessPicker value={selection.processId} onChange={(value) => patch({ processId: value })} />
          <ScenarioTypeChips selected={selection.scenarioTypes} onToggle={toggleType} />
          <SystemPicker selected={selection.systemIds} onChange={(values) => patch({ systemIds: values })} />
          <InterfacePicker selected={selection.interfaceIds} onChange={(values) => patch({ interfaceIds: values })} />
          <SitePicker value={selection.site} onChange={(value) => patch({ site: value })} />
          <TestDataSetPicker
            value={selection.testDataSetId}
            processId={selection.processId}
            onChange={(value) => patch({ testDataSetId: value })}
          />
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={
                selection.processId === 'ALL'
                  ? 'All processes'
                  : `${selection.processId} ${find.process(selection.processId)?.name ?? ''}`
              }
              description={
                selection.processId === 'ALL'
                  ? 'Pick one process to generate new scenarios for it.'
                  : find.process(selection.processId)?.summary
              }
              actions={
                <div className="text-right">
                  <p className="label">Approved coverage</p>
                  <p className="text-sm font-semibold tabular-nums text-text">{coverage} %</p>
                </div>
              }
            />
            <CardBody className="space-y-2">
              <Progress value={coverage} tone={coverage >= 80 ? 'success' : 'accent'} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted">
                <span>{processScenarios.length} scenarios</span>
                <span>{approvedCount} approved</span>
                <span>
                  {processScenarios.filter((scenario) => scenario.approval === 'Pending approval').length} waiting for
                  approval
                </span>
                <span>{processScenarios.reduce((total, scenario) => total + scenario.steps.length, 0)} steps</span>
                {selection.processId !== 'ALL' ? (
                  <span className="inline-flex items-center gap-1">
                    Systems:
                    {(find.process(selection.processId)?.systemIds ?? []).map((id) => (
                      <SystemRef key={id} id={id} compact />
                    ))}
                  </span>
                ) : null}
              </div>
            </CardBody>
          </Card>

          {TYPE_ORDER.filter((type) => selection.scenarioTypes.includes(type)).map((type) => (
            <Card key={type}>
              <CardHeader
                title={`${type} scenarios`}
                description={
                  type === 'Positive'
                    ? 'The journey as it should work.'
                    : type === 'Negative'
                      ? 'Things that must be refused, with proof that nothing was posted.'
                      : 'Whole journeys re-run after a change, compared with a baseline.'
                }
                actions={<Badge tone={type === 'Positive' ? 'success' : type === 'Negative' ? 'danger' : 'info'}>{grouped[type].length}</Badge>}
              />
              <CardBody className="space-y-2">
                {grouped[type].length === 0 ? (
                  <EmptyState
                    title={`No ${type.toLowerCase()} scenarios for this selection`}
                    description="Generate them with the AI, or widen the filters."
                    icon={<Sparkles className="h-5 w-5" />}
                  />
                ) : (
                  grouped[type].map((scenario) => (
                    <div
                      key={scenario.id}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 transition-colors',
                        selection.scenarioIds.includes(scenario.id)
                          ? 'border-primary/50 bg-primary-soft/30'
                          : 'border-line hover:bg-surface2/60',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selection.scenarioIds.includes(scenario.id)}
                          onChange={() => toggleIn('scenarioIds', scenario.id)}
                        />
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            setOpenScenarioId(scenario.id)
                            setParams({ scenario: scenario.id })
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="mono text-xs font-semibold text-primary">{scenario.code}</span>
                            <span className="text-sm font-medium text-text">{scenario.name}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted">{scenario.plain}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <ScenarioTypeBadge type={scenario.type} />
                            <ApprovalBadge state={scenario.approval} />
                            <SeverityBadge severity={scenario.riskLevel} />
                            {scenario.author === 'AI' ? <AiBadge /> : <Badge>By {scenario.author}</Badge>}
                            <Badge tone="neutral">{scenario.steps.length} steps</Badge>
                            {scenario.requirementIds.map((requirementId) => (
                              <RequirementRef key={requirementId} id={requirementId} />
                            ))}
                          </div>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {scenario.lastRunId ? <RunRef id={scenario.lastRunId} label={scenario.lastRunId} /> : null}
                          {scenario.approval !== 'Approved' ? (
                            <div className="flex gap-1">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApprove(scenario.id)}
                                title="Approve this scenario"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Reject this scenario"
                                onClick={() => {
                                  setDecision({ scenarioId: scenario.id, mode: 'reject' })
                                  setComment('')
                                }}
                              >
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                patch({ scenarioIds: [scenario.id], processId: scenario.processId })
                                navigate('/run')
                              }}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Run
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="AI scenario generation"
              description="The live log shows what the AI reads and writes."
              icon={<Sparkles className="h-4 w-4 text-ai" />}
            />
            <CardBody className="space-y-2">
              <LiveLog
                lines={generationJob?.log ?? []}
                status={generationJob?.status}
                progressPct={generationJob?.progressPct}
                currentLabel={generationJob?.currentLabel}
                height="h-64"
                title="Generation log"
                emptyHint="Pick a process and press Generate scenarios with AI."
              />
              <p className="text-2xs text-muted">
                Generated scenarios always arrive as Pending approval. Scores and pass or fail are calculated by code, not
                by the AI.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Plain-English rule"
              description="Write a business rule. The AI turns it into a data check step you can add to a scenario."
              icon={<Wand2 className="h-4 w-4 text-ai" />}
            />
            <CardBody className="space-y-2.5">
              <Textarea
                rows={2}
                value={rule}
                onChange={(event) => setRule(event.target.value)}
                placeholder="For example: net weight must equal gross minus tare"
              />
              <Button
                variant="ai"
                size="sm"
                loading={ruleBusy}
                disabled={rule.trim().length < 6}
                onClick={() => {
                  setRuleBusy(true)
                  void api
                    .translateRuleToCheck({
                      rule,
                      dataSourceId: 'DS-YARD-TICKET',
                      processId: selection.processId === 'ALL' ? undefined : selection.processId,
                    })
                    .then((step) => {
                      setRuleStep(step)
                      setRuleBusy(false)
                      toast({ title: 'Data check written', description: 'Review it and add it to a scenario.', tone: 'ai' })
                    })
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Write the data check
              </Button>

              {ruleStep ? (
                <div className="space-y-2 rounded-lg border border-ai/30 bg-ai-soft/40 p-2.5">
                  <StepCard step={ruleStep} defaultTechnical showEvidence compact />
                  {ruleStep.mock.rows ? <RowsTable spec={ruleStep.mock.rows} /> : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!openScenario}
                      title={openScenario ? `Add to ${openScenario.code}` : 'Open a scenario first'}
                      onClick={() => {
                        if (!openScenario || !ruleStep) return
                        void api.addStepToScenario(openScenario.id, ruleStep).then(() => {
                          toast({
                            title: 'Step added',
                            description: `${openScenario.code} is back in approval because it changed.`,
                            tone: 'success',
                          })
                          setRuleStep(null)
                        })
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to {openScenario?.code ?? 'a scenario'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRuleStep(null)}>
                      Discard
                    </Button>
                  </div>
                  {!openScenario ? (
                    <p className="text-2xs text-muted">Open a scenario on the left to add this step to it.</p>
                  ) : null}
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* --------------------------------------------------- scenario drawer */}
      <Drawer
        open={Boolean(openScenario)}
        onClose={() => {
          setOpenScenarioId(null)
          setParams({})
        }}
        width="w-full max-w-3xl"
        title={openScenario ? `${openScenario.code} ${openScenario.name}` : ''}
        subtitle={openScenario?.plain}
        badges={
          openScenario ? (
            <>
              <ScenarioTypeBadge type={openScenario.type} />
              <ApprovalBadge state={openScenario.approval} />
              <SeverityBadge severity={openScenario.riskLevel} />
              {openScenario.author === 'AI' ? <AiBadge /> : <Badge>By {openScenario.author}</Badge>}
              <ProcessRef id={openScenario.processId} />
            </>
          ) : undefined
        }
        footer={
          openScenario ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDecision({ scenarioId: openScenario.id, mode: 'approve' })
                    setComment('')
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDecision({ scenarioId: openScenario.id, mode: 'reject' })
                    setComment('')
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  patch({ scenarioIds: [openScenario.id], processId: openScenario.processId })
                  navigate('/run')
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Run this scenario
              </Button>
            </div>
          ) : undefined
        }
      >
        {openScenario ? (
          <div className="space-y-5">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Steps', value: `${openScenario.steps.length} across ${openScenario.systemIds.length} systems` },
                { label: 'Created', value: dateMedium(openScenario.createdAt) },
                {
                  label: 'Systems',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {openScenario.systemIds.map((id) => (
                        <SystemRef key={id} id={id} compact />
                      ))}
                    </span>
                  ),
                },
                {
                  label: 'Interfaces',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {openScenario.interfaceIds.map((id) => (
                        <InterfaceRef key={id} id={id} label={id} />
                      ))}
                    </span>
                  ),
                },
                {
                  label: 'Requirements',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {openScenario.requirementIds.map((id) => (
                        <RequirementRef key={id} id={id} />
                      ))}
                    </span>
                  ),
                },
                { label: 'Sites', value: openScenario.sites.join(', ') || 'all' },
                {
                  label: 'Test data set',
                  value: openScenario.testDataSetId ? (
                    <button type="button" className="link" onClick={() => navigate('/test-data')}>
                      {find.testDataSet(openScenario.testDataSetId)?.name ?? openScenario.testDataSetId}
                    </button>
                  ) : (
                    'none'
                  ),
                },
                {
                  label: 'Last run',
                  value: openScenario.lastRunId ? <RunRef id={openScenario.lastRunId} /> : 'not run yet',
                },
              ]}
            />

            {openScenario.approvalComment ? (
              <p className="rounded-md bg-surface2 px-3 py-2 text-xs text-muted">
                <span className="font-semibold text-text">{openScenario.approvedByRole} said:</span>{' '}
                {openScenario.approvalComment}
              </p>
            ) : null}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="label">Steps</p>
                <p className="text-2xs text-muted">Click Technical detail on a step for selectors, payloads and queries</p>
              </div>
              <div className="space-y-2">
                {openScenario.steps.map((step) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    showEvidence
                    actions={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit this step"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditStep(step)
                          setEditDraft({ title: step.title, plain: step.plain, expected: step.expected })
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* ------------------------------------------------------- edit a step */}
      <Modal
        open={Boolean(editStep)}
        onClose={() => setEditStep(null)}
        title={editStep ? `Edit step ${editStep.order}` : ''}
        subtitle="Business language is what the key users read. Editing a step sends the scenario back for approval."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditStep(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!editStep || !openScenario) return
                void api.updateScenarioStep(openScenario.id, editStep.id, editDraft).then(() => {
                  toast({
                    title: 'Step updated',
                    description: `${openScenario.code} is waiting for approval again.`,
                    tone: 'success',
                  })
                  setEditStep(null)
                })
              }}
            >
              Save step
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="label mb-1">Title</p>
            <Input value={editDraft.title} onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })} />
          </div>
          <div>
            <p className="label mb-1">Plain description</p>
            <Textarea
              rows={3}
              value={editDraft.plain}
              onChange={(event) => setEditDraft({ ...editDraft, plain: event.target.value })}
            />
          </div>
          <div>
            <p className="label mb-1">Expected result</p>
            <Textarea
              rows={2}
              value={editDraft.expected}
              onChange={(event) => setEditDraft({ ...editDraft, expected: event.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------- approve or reject */}
      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.mode === 'approve' ? 'Approve scenario' : 'Reject scenario'}
        subtitle={decision ? find.scenario(decision.scenarioId)?.name : ''}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={decision?.mode === 'approve' ? 'primary' : 'danger'}
              size="sm"
              onClick={() => {
                if (!decision) return
                if (decision.mode === 'approve') handleApprove(decision.scenarioId, comment)
                else handleReject(decision.scenarioId, comment)
                setDecision(null)
              }}
            >
              {decision?.mode === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            You are signing as the <span className="font-semibold text-text">{role.name}</span> role. The decision is
            recorded with your role and the time, and it changes the numbers on the Command Centre.
          </p>
          <Textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Comment (optional)"
          />
        </div>
      </Modal>
    </>
  )
}
