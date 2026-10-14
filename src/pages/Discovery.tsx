import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, RefreshCcw, ScanSearch, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, EmptyState, Progress } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { LiveLog } from '@/components/common/LiveLog'
import { ScenarioTypeBadge } from '@/components/common/badges'
import { ProcessPicker, SelectionSummary } from '@/components/common/selectors'
import { PageRef, SystemRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { dateTime, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DiscoveredMap, DiscoveredNode, ProcessId } from '@/lib/types'

export default function DiscoveryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { selection, patch } = useSelection()

  const processId: ProcessId = selection.processId === 'ALL' ? 'P1' : selection.processId
  const { data } = useApi(() => api.listDiscoverySessions(), [])

  const [sessionIds, setSessionIds] = useState<string[]>([])
  const [logIds, setLogIds] = useState<string[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [map, setMap] = useState<DiscoveredMap | null>(null)
  const [openNode, setOpenNode] = useState<DiscoveredNode | null>(null)

  const job = useJob<DiscoveredMap>(jobId)

  useEffect(() => {
    if (!data) return
    setSessionIds(data.sessions.filter((session) => session.processId === processId).map((session) => session.id))
    setLogIds(data.logSources.filter((source) => source.selected).map((source) => source.id))
    setMap(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, processId])

  useEffect(() => {
    if (job?.status === 'done' && job.result) {
      setMap(job.result)
      toast({
        title: 'Process map ready',
        description: `${job.result.nodes.length} activities, ${job.result.variants} variants, ${job.result.proposedScenarios.length} scenarios proposed.`,
        tone: 'ai',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status])

  const sessions = (data?.sessions ?? []).filter((session) => session.processId === processId)
  const otherSessions = (data?.sessions ?? []).filter((session) => session.processId !== processId)
  const shownMap = map ?? (job?.status === 'running' ? null : db.discoveredMaps[processId])

  const nodesBySystem = useMemo(() => {
    if (!shownMap) return []
    const systems = Array.from(new Set(shownMap.nodes.map((node) => node.systemId)))
    return systems.map((systemId) => ({
      systemId,
      nodes: shownMap.nodes.filter((node) => node.systemId === systemId),
    }))
  }, [shownMap])

  const maxFrequency = shownMap ? Math.max(...shownMap.nodes.map((node) => node.frequency)) : 1

  return (
    <>
      <PageHeader
        title="Process Discovery"
        description="Recorded key-user sessions and system logs are mined into a process map, including the rework loops nobody documents. The map is what the AI writes scenarios from."
        requirements={['R1']}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={!shownMap}
              onClick={() => {
                patch({ processId })
                navigate('/studio')
              }}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Generate scenarios in Test Studio
            </Button>
            <Button
              variant="ai"
              size="sm"
              loading={job?.status === 'running'}
              disabled={sessionIds.length === 0 || logIds.length === 0}
              onClick={() => {
                setJobId(api.startDiscovery({ processId, sessionIds, logSourceIds: logIds }))
                toast({ title: 'Discovery started', description: 'Watch the live log.', tone: 'ai' })
              }}
            >
              <ScanSearch className="h-3.5 w-3.5" />
              Discover
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProcessPicker
            value={processId}
            includeAll={false}
            onChange={(value) => patch({ processId: value })}
          />
          <Badge tone="neutral">{sessionIds.length} sessions selected</Badge>
          <Badge tone="neutral">{logIds.length} log sources selected</Badge>
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Recorded key-user sessions"
              description={`For ${processId} ${find.process(processId)?.name ?? ''}. Tick the ones to mine.`}
              actions={
                <Button variant="ghost" size="sm" onClick={() => setSessionIds(sessions.map((s) => s.id))}>
                  Select all
                </Button>
              }
            />
            <CardBody className="space-y-1.5">
              {sessions.length === 0 ? (
                <EmptyState title="No sessions recorded for this process yet" />
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'rounded-lg border px-2.5 py-2',
                      sessionIds.includes(session.id) ? 'border-primary/50 bg-primary-soft/30' : 'border-line',
                    )}
                  >
                    <Checkbox
                      checked={sessionIds.includes(session.id)}
                      onChange={() =>
                        setSessionIds((ids) =>
                          ids.includes(session.id) ? ids.filter((id) => id !== session.id) : [...ids, session.id],
                        )
                      }
                      label={session.keyUserRole}
                      description={
                        <span>
                          {session.durationMin} min · {session.actionCount} actions · site {session.site} ·{' '}
                          {dateTime(session.capturedAt)}
                        </span>
                      }
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1 pl-6">
                      {session.systemIds.map((id) => (
                        <SystemRef key={id} id={id} compact />
                      ))}
                    </div>
                  </div>
                ))
              )}
              {otherSessions.length > 0 ? (
                <p className="pt-1 text-2xs text-muted">
                  {otherSessions.length} more sessions exist for other processes. Switch the process above to use them.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="System log sources" description="Logs give the volumes and the timings." />
            <CardBody className="space-y-1.5">
              {(data?.logSources ?? []).map((source) => (
                <div
                  key={source.id}
                  className={cn(
                    'rounded-lg border px-2.5 py-2',
                    logIds.includes(source.id) ? 'border-primary/50 bg-primary-soft/30' : 'border-line',
                  )}
                >
                  <Checkbox
                    checked={logIds.includes(source.id)}
                    onChange={() =>
                      setLogIds((ids) => (ids.includes(source.id) ? ids.filter((id) => id !== source.id) : [...ids, source.id]))
                    }
                    label={source.name}
                    description={`${num(source.rows)} rows over ${source.periodDays} days`}
                  />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Discovery log"
              description="Exactly what the AI reads and concludes."
              icon={<Sparkles className="h-4 w-4 text-ai" />}
            />
            <CardBody>
              <LiveLog
                lines={job?.log ?? []}
                status={job?.status}
                progressPct={job?.progressPct}
                currentLabel={job?.currentLabel}
                height="h-64"
                emptyHint="Press Discover to mine the selected sessions and logs."
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {!shownMap ? (
            <Card>
              <CardBody>
                <EmptyState
                  title="No process map yet"
                  description="Select sessions and logs, then press Discover."
                  icon={<ScanSearch className="h-6 w-6" />}
                />
              </CardBody>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader
                  title={`Discovered process map · ${processId}`}
                  description={`${shownMap.nodes.length} activities across ${nodesBySystem.length} systems, ${shownMap.variants} variants. Click an activity for its numbers.`}
                  actions={
                    <div className="text-right">
                      <p className="label">Behaviour covered</p>
                      <p className="text-sm font-semibold tabular-nums text-text">{shownMap.coveragePct} %</p>
                    </div>
                  }
                />
                <CardBody className="space-y-3">
                  <Progress value={shownMap.coveragePct} tone="primary" />
                  <div className="space-y-3">
                    {nodesBySystem.map((group) => (
                      <div key={group.systemId}>
                        <div className="mb-1.5">
                          <SystemRef id={group.systemId} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.nodes.map((node) => (
                            <button
                              key={node.id}
                              type="button"
                              onClick={() => setOpenNode(node)}
                              className={cn(
                                'rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:bg-surface2',
                                node.variant ? 'border-accent/50 bg-accent-soft/40' : 'border-line',
                              )}
                              style={{ minWidth: '9rem' }}
                            >
                              <span className="block text-xs font-medium text-text">{node.label}</span>
                              <span className="mt-0.5 block text-2xs text-muted">
                                {num(node.frequency)} cases · {node.avgMinutes} min
                              </span>
                              <span className="mt-1 block h-1 rounded-full bg-surface2">
                                <span
                                  className={cn('block h-1 rounded-full', node.variant ? 'bg-accent' : 'bg-primary')}
                                  style={{ width: `${Math.round((node.frequency / maxFrequency) * 100)}%` }}
                                />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Rework loops found"
                  description="These are the places where people redo work today - and where tests pay off."
                  icon={<RefreshCcw className="h-4 w-4 text-accent" />}
                />
                <CardBody className="space-y-2">
                  {shownMap.reworkLoops.map((loop) => (
                    <div key={loop.label} className="rounded-lg border border-accent/40 bg-accent-soft/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-text">{loop.label}</p>
                        <Badge tone="accent">{loop.count} cases</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">{loop.explanation}</p>
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Scenarios proposed from this map"
                  description="These go to Test Studio as drafts for key-user approval."
                  actions={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        patch({ processId })
                        navigate('/studio')
                      }}
                    >
                      Open in Test Studio
                    </Button>
                  }
                />
                <CardBody className="space-y-1.5">
                  {shownMap.proposedScenarios.map((proposal) => {
                    const existing = db.scenarios.find(
                      (scenario) => scenario.name.toLowerCase() === proposal.name.toLowerCase(),
                    )
                    return (
                      <button
                        key={proposal.name}
                        type="button"
                        title={existing ? `Open ${existing.code} in Test Studio` : 'Generate this scenario in Test Studio'}
                        onClick={() => {
                          patch({ processId })
                          navigate(existing ? `/studio?scenario=${existing.id}` : '/studio')
                        }}
                        className="w-full rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-surface2/60"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <ScenarioTypeBadge type={proposal.type} />
                          <p className="text-sm font-medium text-text">{proposal.name}</p>
                          {existing ? <Badge tone="success">built as {existing.code}</Badge> : <Badge tone="accent">not built yet</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted">{proposal.plain}</p>
                      </button>
                    )
                  })}
                  <p className="pt-1 text-2xs text-muted">
                    Already built: {db.scenarios.filter((scenario) => scenario.processId === processId).length} scenarios
                    for this process. <PageRef to="/studio">See them</PageRef>
                  </p>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <Drawer
        open={Boolean(openNode)}
        onClose={() => setOpenNode(null)}
        title={openNode?.label ?? ''}
        subtitle={openNode ? `Activity in ${find.system(openNode.systemId)?.name}` : ''}
        badges={openNode?.variant ? <Badge tone="accent">Variant path</Badge> : <Badge tone="success">Main path</Badge>}
      >
        {openNode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line px-3 py-2">
                <p className="label">Cases in the period</p>
                <p className="text-lg font-semibold tabular-nums text-text">{num(openNode.frequency)}</p>
              </div>
              <div className="rounded-lg border border-line px-3 py-2">
                <p className="label">Average time</p>
                <p className="text-lg font-semibold tabular-nums text-text">{openNode.avgMinutes} min</p>
              </div>
            </div>
            <div>
              <p className="label mb-1.5">Transitions into and out of this activity</p>
              <div className="space-y-1">
                {(shownMap?.edges ?? [])
                  .filter((edge) => edge.from === openNode.id || edge.to === openNode.id)
                  .map((edge, index) => {
                    const fromNode = shownMap?.nodes.find((node) => node.id === edge.from)
                    const toNode = shownMap?.nodes.find((node) => node.id === edge.to)
                    return (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs',
                          edge.rework ? 'border-accent/40 bg-accent-soft/30' : 'border-line',
                        )}
                      >
                        <span className="text-text">
                          {fromNode?.label} <ArrowRight className="inline h-3 w-3" /> {toNode?.label}
                        </span>
                        <span className="text-2xs text-muted">
                          {num(edge.count)} cases · {edge.avgMinutes} min{edge.rework ? ' · rework' : ''}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                patch({ processId, systemIds: [openNode.systemId] })
                navigate('/studio')
              }}
            >
              Write a scenario for this activity
            </Button>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
