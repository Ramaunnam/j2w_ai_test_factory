import type { ApprovalRequest, RequirementId } from '@/lib/types'
import { SCENARIOS } from './scenarios'
import { HEALING_EVENTS } from './healing'
import { EVIDENCE_BUNDLES, RUN_BY_ID } from './runs'
import { daysAgo, minutesAgo } from '@/lib/clock'

const pendingScenarioApprovals: ApprovalRequest[] = SCENARIOS.filter(
  (s) => s.approval === 'Pending approval' || s.approval === 'Draft',
).map((scenario, index) => ({
  id: `APR-S-${index + 1}`,
  kind: 'scenario',
  refId: scenario.id,
  title: `${scenario.code} ${scenario.name}`,
  plain: scenario.plain,
  detail: `${scenario.steps.length} steps across ${scenario.systemIds.length} systems. Written by the AI from the discovered process and the change feed. ${
    scenario.approval === 'Draft' ? 'Still a draft: the AI wants a key user to confirm the business rule first.' : ''
  }`,
  confidencePct: scenario.approval === 'Draft' ? 71 : 89,
  requestedAt: daysAgo(index + 1, 2),
  forRole: 'Key User',
  status: 'Pending',
  processId: scenario.processId,
  requirementIds: scenario.requirementIds,
}))

const pendingHealingApprovals: ApprovalRequest[] = HEALING_EVENTS.filter(
  (h) => h.status === 'Pending approval',
).map((event, index) => ({
  id: `APR-H-${index + 1}`,
  kind: 'healed-script',
  refId: event.id,
  title: event.summary,
  plain: `The AI repaired a ${event.changeKind.toLowerCase()} change in scenario ${event.scenarioId}, step ${event.stepId}.`,
  detail: event.rationale,
  confidencePct: event.confidencePct,
  requestedAt: event.detectedAt,
  forRole: 'Key User',
  status: 'Pending',
  requirementIds: ['R9'],
}))

const pendingEvidenceApprovals: ApprovalRequest[] = EVIDENCE_BUNDLES.filter(
  (b) => b.approvalState === 'Pending approval',
).map((bundle, index) => {
  const run = RUN_BY_ID.get(bundle.runId)
  return {
    id: `APR-E-${index + 1}`,
    kind: 'evidence' as const,
    refId: bundle.id,
    title: `Evidence bundle ${bundle.id} for ${run?.label ?? bundle.runId}`,
    plain: `Locked evidence from run ${bundle.runId}: ${Object.values(bundle.itemCounts).reduce((a, b2) => a + b2, 0)} items, verdict ${bundle.verdict}.`,
    detail: `Hash ${bundle.hash}. Screenshots ${bundle.itemCounts.screenshot}, payloads ${bundle.itemCounts.payload}, query results ${bundle.itemCounts['query-result']}, documents ${bundle.itemCounts.document}. Sign-off is needed before the report goes into the audit file.`,
    requestedAt: minutesAgo(32),
    forRole: 'Key User',
    status: 'Pending' as const,
    processId: run?.processId,
    requirementIds: bundle.requirementIds as RequirementId[],
  }
})

const decidedApprovals: ApprovalRequest[] = [
  {
    id: 'APR-D-1',
    kind: 'healed-script',
    refId: 'HEAL-001',
    title: 'Net weight field renamed on the weighbridge ticket screen',
    plain: 'The AI repaired the renamed net weight field in the gate to invoice scenario.',
    detail:
      'Confidence 96 %. The field label, type and position were unchanged, only the attribute was renamed by the yard release.',
    confidencePct: 96,
    requestedAt: minutesAgo(44),
    forRole: 'Key User',
    status: 'Approved',
    decidedByRole: 'Key User',
    decidedAt: minutesAgo(39),
    comment: 'Same field, confirmed on the new screen.',
    processId: 'P1',
    requirementIds: ['R9'],
  },
  {
    id: 'APR-D-2',
    kind: 'scenario',
    refId: 'P1-POS-01',
    title: 'P1-POS-01 Truck receipt to posted supplier invoice',
    plain: 'The main gate to invoice journey, generated from the discovered process.',
    detail: '12 steps across four systems, including the weight data check that found the three trucks.',
    confidencePct: 94,
    requestedAt: daysAgo(18),
    forRole: 'Key User',
    status: 'Approved',
    decidedByRole: 'Key User',
    decidedAt: daysAgo(17),
    comment: 'Matches how we work at the gate.',
    processId: 'P1',
    requirementIds: ['R1', 'R2', 'R3'],
  },
  {
    id: 'APR-D-3',
    kind: 'healed-script',
    refId: 'HEAL-007',
    title: 'Invoice capture endpoint added pagination to the queue read',
    plain: 'The AI added page parameters to the invoice queue read.',
    detail: 'Rejected: paging only the first page would silently ignore documents beyond page one.',
    confidencePct: 76,
    requestedAt: daysAgo(7, 1),
    forRole: 'QA Lead',
    status: 'Rejected',
    decidedByRole: 'QA Lead',
    decidedAt: daysAgo(6, 20),
    comment: 'Loop over all pages instead, then resubmit.',
    processId: 'P1',
    requirementIds: ['R9'],
  },
  {
    id: 'APR-D-4',
    kind: 'evidence',
    refId: 'EVB-1040',
    title: 'Evidence bundle EVB-1040 for P2 Scrap to Stock',
    plain: 'Locked evidence from the scrap to stock run, verdict CONDITIONAL.',
    detail: 'Approved with a note: the molybdenum finding must be fixed before the next close.',
    requestedAt: daysAgo(1, 4),
    forRole: 'Key User',
    status: 'Approved',
    decidedByRole: 'Key User',
    decidedAt: daysAgo(1, 2),
    comment: 'Signed off, finding F-011 tracked separately.',
    processId: 'P2',
    requirementIds: ['R3', 'R5'],
  },
]

export const APPROVALS: ApprovalRequest[] = [
  ...pendingEvidenceApprovals,
  ...pendingHealingApprovals,
  ...pendingScenarioApprovals,
  ...decidedApprovals,
]
