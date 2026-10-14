import type { ApprovalState, ProcessId, RoleName, Scenario, ScenarioType } from '@/lib/types'
import { P1_SCENARIOS } from './scenarios.p1'
import { P2_SCENARIOS } from './scenarios.p2'
import { P3_SCENARIOS } from './scenarios.p3'
import { P4_SCENARIOS } from './scenarios.p4'
import { P5_SCENARIOS } from './scenarios.p5'
import { P6_SCENARIOS } from './scenarios.p6'

/** Scenarios whose approval is still open - they drive the Approvals queue. */
const APPROVAL_OVERRIDES: Record<string, { approval: ApprovalState; approvedByRole?: RoleName }> = {
  'P1-REG-02': { approval: 'Pending approval' },
  'P2-REG-02': { approval: 'Pending approval' },
  'P4-REG-01': { approval: 'Pending approval' },
  'P6-REG-01': { approval: 'Draft' },
}

export const SCENARIOS: Scenario[] = [
  ...P1_SCENARIOS,
  ...P2_SCENARIOS,
  ...P3_SCENARIOS,
  ...P4_SCENARIOS,
  ...P5_SCENARIOS,
  ...P6_SCENARIOS,
].map((scenario) => {
  const override = APPROVAL_OVERRIDES[scenario.code]
  if (!override) return scenario
  return { ...scenario, approval: override.approval, approvedByRole: override.approvedByRole }
})

export const SCENARIO_BY_ID = new Map(SCENARIOS.map((s) => [s.id, s]))

export function scenariosFor(processId: ProcessId | 'ALL'): Scenario[] {
  return processId === 'ALL' ? SCENARIOS : SCENARIOS.filter((s) => s.processId === processId)
}

export const SCENARIO_TYPES: ScenarioType[] = ['Positive', 'Negative', 'Regression']

/** The scenarios pre-selected for the Run Centre demo run on P1. */
export const DEMO_RUN_SCENARIO_IDS = ['P1-POS-01', 'P1-NEG-01', 'P1-NEG-02', 'P1-REG-01']
