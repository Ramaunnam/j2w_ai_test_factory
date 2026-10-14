import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BugPlay, Camera, CheckCircle2, FileText, Play, Table2, UserCog, Webhook } from 'lucide-react'
import { ReportFrame, ReportSection } from './ReportFrame'
import { Badge, Button, Select } from '@/components/ui/primitives'
import { RowsTable } from '@/components/common/evidence'
import { SeverityBadge } from '@/components/common/badges'
import { useToast } from '@/components/ui/toast'
import { useApi } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import { useRole } from '@/lib/role'
import { ROLES } from '@/lib/role'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { dateTime } from '@/lib/format'
import { vehicleInRow } from '@/lib/utils'
import type { EvidenceItem, RoleName } from '@/lib/types'

const KIND_ICON = {
  screenshot: Camera,
  payload: Webhook,
  'query-result': Table2,
  document: FileText,
  log: FileText,
} as const

export default function FindingCard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { role } = useRole()
  const { patch } = useSelection()
  const [owner, setOwner] = useState<RoleName | ''>('')

  const { data: findings } = useApi(() => api.listFindings(), [])
  const finding = findings?.find((item) => item.id === id) ?? find.finding(id ?? '')

  if (!finding) {
    return (
      <ReportFrame docType="Finding card" title="Finding not found" generatedAt={new Date().toISOString()} backTo="/run">
        <p className="text-sm text-muted">
          No finding with the id <span className="mono">{id}</span> exists. Open one from the Run Centre, the Interfaces
          page or the Command Centre.
        </p>
      </ReportFrame>
    )
  }

  const run = find.run(finding.runId)
  const scenario = finding.scenarioId ? find.scenario(finding.scenarioId) : undefined
  const step = scenario?.steps.find((item) => item.id === finding.stepId)
  const evidence: EvidenceItem[] = db.evidence
    .filter((item) => item.runId === finding.runId && (!finding.stepId || item.stepId === finding.stepId))
    .slice(0, 3)

  return (
    <ReportFrame
      docType="Finding card"
      title={finding.title}
      subtitle={finding.plain}
      generatedAt={new Date().toISOString()}
      backTo="/run"
      backLabel="Back to the Run Centre"
      width="max-w-4xl"
      badges={
        <>
          <Badge tone="neutral" className="font-mono">
            {finding.id}
          </Badge>
          <SeverityBadge severity={finding.severity} />
          <Badge
            tone={
              finding.status === 'Open'
                ? 'danger'
                : finding.status === 'Fixed'
                  ? 'success'
                  : finding.status === 'Defect raised'
                    ? 'primary'
                    : 'accent'
            }
          >
            {finding.status}
          </Badge>
          {finding.defectRef ? <Badge tone="primary">{finding.defectRef}</Badge> : null}
          <Badge tone="neutral">Owner: {finding.ownerRole ?? 'not assigned'}</Badge>
        </>
      }
      meta={[
        { label: 'Process', value: `${finding.processId} ${find.process(finding.processId)?.name ?? ''}` },
        {
          label: 'Systems',
          value: finding.systemIds.map((systemId) => find.system(systemId)?.name ?? systemId).join(' → ') || '-',
        },
        {
          label: 'Interface',
          value:
            finding.interfaceIds.length > 0
              ? finding.interfaceIds.map((interfaceId) => interfaceId).join(', ')
              : 'not interface related',
        },
        { label: 'Detected', value: dateTime(finding.detectedAt) },
      ]}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={Boolean(finding.defectRef)}
            onClick={() => {
              void api.createDefect(finding.id, role.name).then((ref) =>
                toast({
                  title: `Defect ${ref} created`,
                  description: 'The finding is linked to the defect and the release gate is updated.',
                  tone: 'warning',
                }),
              )
            }}
          >
            <BugPlay className="h-3.5 w-3.5" />
            {finding.defectRef ? `Defect ${finding.defectRef}` : 'Create defect'}
          </Button>
          {finding.status === 'Fixed' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (scenario) patch({ processId: scenario.processId, scenarioIds: [scenario.id] })
                navigate('/run')
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Retest
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void api.markFindingFixed(finding.id).then(() =>
                  toast({
                    title: 'Marked as fixed',
                    description: 'Press Retest to run the scenario that found it again.',
                    tone: 'success',
                  }),
                )
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark fixed
            </Button>
          )}
        </>
      }
    >
      <ReportSection title="What is wrong" description="One sentence, in business language.">
        <p className="text-sm text-text">{finding.plain}</p>
      </ReportSection>

      <ReportSection title="Business impact" description="What it costs if nobody fixes it.">
        <p className="rounded-lg border border-accent/40 bg-accent-soft/40 p-3 text-sm font-medium text-text">
          {finding.impact}
        </p>
      </ReportSection>

      {finding.rows ? (
        <ReportSection
          title="Affected records"
          description="Click a row with a vehicle, wagon or container to follow it across every system."
        >
          <RowsTable
            spec={finding.rows}
            onRowClick={(row) => {
              const vehicle = vehicleInRow(row)
              if (!vehicle) return
              patch({ vehicle })
              navigate(`/interfaces?trace=${vehicle}`)
            }}
          />
        </ReportSection>
      ) : null}

      <ReportSection title="Cause and fix" description="Why it happens and what closes it.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-3">
            <p className="label mb-1">Cause</p>
            <p className="text-sm text-text">{finding.cause}</p>
            <p className="mt-2 text-xs text-muted">{finding.aiExplanation}</p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="label mb-1">Recommended fix</p>
            <p className="text-sm text-text">{finding.recommendedFix}</p>
            <div className="no-print mt-3 flex flex-wrap items-center gap-2">
              <UserCog className="h-3.5 w-3.5 text-muted" />
              <Select
                size="sm"
                aria-label="Assign owner"
                value={owner || (finding.ownerRole ?? '')}
                onChange={(event) => setOwner(event.target.value as RoleName)}
                options={[
                  { value: '', label: 'Assign owner' },
                  ...ROLES.map((item) => ({ value: item.name, label: item.name })),
                ]}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={!owner}
                onClick={() => {
                  if (!owner) return
                  void api.assignFindingOwner(finding.id, owner).then(() =>
                    toast({ title: `Assigned to ${owner}`, description: finding.id, tone: 'info' }),
                  )
                }}
              >
                Assign owner
              </Button>
            </div>
          </div>
        </div>
      </ReportSection>

      <ReportSection title="Found by" description="The run and the step that produced this finding.">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3">
          <div className="min-w-0">
            <p className="text-sm text-text">
              <span className="mono">{finding.runId}</span> {run?.label ?? ''}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {scenario ? `${scenario.code} ${scenario.name}` : 'no scenario recorded'}
              {step ? ` · step ${step.order}: ${step.title}` : ''}
            </p>
          </div>
          <div className="no-print ml-auto flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/report/${finding.runId}`)}>
              Open run summary
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/evidence-pack/${finding.runId}`)}>
              Audit evidence pack
            </Button>
          </div>
        </div>
      </ReportSection>

      {evidence.length > 0 ? (
        <ReportSection
          title="Evidence"
          description={`The first ${evidence.length} item${evidence.length === 1 ? '' : 's'} captured at that step. The full set is in the audit evidence pack.`}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {evidence.map((item) => {
              const Icon = KIND_ICON[item.kind]
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/evidence-pack/${finding.runId}`)}
                  className="rounded-lg border border-line p-3 text-left transition-colors hover:bg-surface2/60"
                >
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted" />
                    <span className="text-2xs font-semibold uppercase tracking-wide text-muted">
                      {item.kind.replace('-', ' ')}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-medium text-text">{item.title}</span>
                  <span className="mono mt-1 block truncate text-2xs text-muted">{item.hash}</span>
                </button>
              )
            })}
          </div>
        </ReportSection>
      ) : null}
    </ReportFrame>
  )
}
