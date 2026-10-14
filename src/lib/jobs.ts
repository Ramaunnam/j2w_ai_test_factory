/**
 * Live job engine for the mock backend.
 * A job is a list of events that are played out over time, so the UI can poll
 * it and show a live log, a progress bar and step-by-step results.
 */
import type { JobKind, JobLogLine, JobSnapshot, JobStatus, StepStatus, TestRun } from './types'
import { bumpDb } from './db'

export interface JobEvent {
  /** milliseconds this event takes before the next one is played */
  ms: number
  log?: JobLogLine
  label?: string
  stepStart?: { scenarioId: string; stepId: string }
  stepEnd?: {
    scenarioId: string
    stepId: string
    status: StepStatus
    findingId?: string
    healingEventId?: string
    evidenceIds?: string[]
    logLines?: string[]
    /** measured step duration, so the run summary and the report show real time */
    durationMs?: number
  }
}

interface JobRecord {
  id: string
  kind: JobKind
  status: JobStatus
  startedAt: string
  finishedAt?: string
  events: JobEvent[]
  cursor: number
  log: JobLogLine[]
  currentLabel: string
  run?: TestRun
  result?: unknown
  speed: number
  timer?: number
  onComplete?: (job: JobRecord) => unknown
}

const jobs = new Map<string, JobRecord>()
let counter = 0

export function logLine(text: string, tone: JobLogLine['tone'] = 'info'): JobLogLine {
  return { at: new Date().toISOString(), text, tone }
}

function schedule(job: JobRecord): void {
  if (job.cursor >= job.events.length) {
    job.status = 'done'
    job.finishedAt = new Date().toISOString()
    job.currentLabel = 'Finished'
    if (job.onComplete) job.result = job.onComplete(job)
    bumpDb()
    return
  }
  const event = job.events[job.cursor]
  const delay = Math.max(60, event.ms / job.speed)
  job.timer = window.setTimeout(() => {
    apply(job, event)
    job.cursor += 1
    bumpDb()
    schedule(job)
  }, delay)
}

function apply(job: JobRecord, event: JobEvent): void {
  if (event.log) job.log.push({ ...event.log, at: new Date().toISOString() })
  if (event.label) job.currentLabel = event.label
  if (event.stepStart && job.run) {
    const result = job.run.stepResults.find(
      (r) => r.stepId === event.stepStart!.stepId && r.scenarioId === event.stepStart!.scenarioId,
    )
    if (result) {
      result.status = 'Running'
      result.startedAt = new Date().toISOString()
    }
  }
  if (event.stepEnd && job.run) {
    const end = event.stepEnd
    const result = job.run.stepResults.find((r) => r.stepId === end.stepId && r.scenarioId === end.scenarioId)
    if (result) {
      result.status = end.status
      result.findingId = end.findingId
      result.healingEventId = end.healingEventId
      result.evidenceIds = end.evidenceIds ?? []
      result.logLines = end.logLines ?? []
      // real elapsed time where we have a start, the scripted duration otherwise
      const elapsed = result.startedAt ? Date.now() - new Date(result.startedAt).getTime() : 0
      result.durationMs = Math.max(end.durationMs ?? 0, Math.round(elapsed))
    }
    if (end.findingId && !job.run.findingIds.includes(end.findingId)) job.run.findingIds.push(end.findingId)
    job.run.passedSteps = job.run.stepResults.filter((r) => r.status === 'Passed').length
    job.run.failedSteps = job.run.stepResults.filter((r) => r.status === 'Failed').length
    job.run.healedSteps = job.run.stepResults.filter((r) => r.status === 'Healed').length
    job.run.blockedSteps = job.run.stepResults.filter((r) => r.status === 'Blocked as expected').length
  }
}

export function createJob(input: {
  kind: JobKind
  events: JobEvent[]
  run?: TestRun
  label?: string
  speed?: number
  onComplete?: (job: JobRecord) => unknown
}): string {
  counter += 1
  const id = `JOB-${String(counter).padStart(4, '0')}`
  const job: JobRecord = {
    id,
    kind: input.kind,
    status: 'running',
    startedAt: new Date().toISOString(),
    events: input.events,
    cursor: 0,
    log: [],
    currentLabel: input.label ?? 'Starting',
    run: input.run,
    speed: input.speed ?? 1,
    onComplete: input.onComplete,
  }
  jobs.set(id, job)
  schedule(job)
  bumpDb()
  return id
}

export function getJob<T = unknown>(id: string): JobSnapshot<T> | undefined {
  const job = jobs.get(id)
  if (!job) return undefined
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    progressPct: job.events.length === 0 ? 100 : Math.round((job.cursor / job.events.length) * 100),
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    log: [...job.log],
    currentLabel: job.currentLabel,
    result: job.result as T,
    run: job.run ? { ...job.run, stepResults: job.run.stepResults.map((r) => ({ ...r })) } : undefined,
  }
}

export function setJobSpeed(id: string, speed: number): void {
  const job = jobs.get(id)
  if (job) job.speed = speed
}

export function cancelJob(id: string): void {
  const job = jobs.get(id)
  if (!job) return
  if (job.timer) window.clearTimeout(job.timer)
  job.status = 'failed'
  job.currentLabel = 'Cancelled'
  job.log.push(logLine('Run cancelled by the user', 'warn'))
  bumpDb()
}

export function clearJobs(): void {
  jobs.forEach((job) => job.timer && window.clearTimeout(job.timer))
  jobs.clear()
}
