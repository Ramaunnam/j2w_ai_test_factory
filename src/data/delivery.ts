import type { CloseCalendarDay, CloseReadiness, DeliveryModel, TrendPoint } from '@/lib/types'
import { CLOSE_DATE_ISO, daysAgo } from '@/lib/clock'
import { seededInt } from '@/lib/utils'

/* --------------------------------------------------------------- delivery */

export const DELIVERY_MODEL: DeliveryModel = {
  phases: [
    {
      key: 'Build',
      progressPct: 78,
      summary:
        'Framework, process discovery, scenario generation and test data for the first two processes are in place. P3 to P6 have a working first set.',
    },
    {
      key: 'Run',
      progressPct: 42,
      summary:
        'The pod runs the suite for every change and every close. Findings are triaged with the key users and the release gate is used for go and no-go decisions.',
    },
    {
      key: 'Hand over',
      progressPct: 15,
      summary:
        'Training material and runbooks are started. The client team already owns approvals; script maintenance moves over after two closes.',
    },
  ],
  milestones: [
    {
      id: 'M-01',
      label: 'Framework and landscape model in place',
      phase: 'Build',
      status: 'Done',
      week: 'Week 1-2',
      detail: 'All systems, interfaces and data sources modelled, with connection checks per system.',
    },
    {
      id: 'M-02',
      label: 'P1 Gate to Invoice fully automated',
      phase: 'Build',
      status: 'Done',
      week: 'Week 3-5',
      detail: 'Nine scenarios with mixed steps, evidence and the first self-healing events.',
    },
    {
      id: 'M-03',
      label: 'P2 Scrap to Stock fully automated',
      phase: 'Build',
      status: 'Done',
      week: 'Week 5-7',
      detail: 'Seven scenarios including the laboratory app and the chemistry interface.',
    },
    {
      id: 'M-04',
      label: 'P3 to P6 first scenario set',
      phase: 'Build',
      status: 'In progress',
      week: 'Week 7-10',
      detail: 'Procure to pay, produce to dispatch, order to cash and month-end close have a working set, depth grows per sprint.',
    },
    {
      id: 'M-05',
      label: 'Month-end load and SoD testing in the suite',
      phase: 'Run',
      status: 'In progress',
      week: 'Week 9-11',
      detail: 'Five times volume profile and six segregation of duties rules with proof tests.',
    },
    {
      id: 'M-06',
      label: 'Freeze reduced from ten to five days',
      phase: 'Run',
      status: 'In progress',
      week: 'Week 12',
      detail: 'First close with automated regression and close readiness in use.',
    },
    {
      id: 'M-07',
      label: 'Freeze reduced to three days',
      phase: 'Run',
      status: 'Planned',
      week: 'Week 16',
      detail: 'Target state: automated regression and reconciliation replace the manual close freeze checks.',
    },
    {
      id: 'M-08',
      label: 'Client team maintains scripts without the vendor',
      phase: 'Hand over',
      status: 'Planned',
      week: 'Week 18-20',
      detail: 'Two closes run by the client team with the pod only on call, then vendor headcount goes to zero.',
    },
  ],
  podRoles: [
    {
      id: 'POD-01',
      role: 'Test architect',
      focus: 'Framework, landscape model, scoring and release gate',
      allocationPct: 60,
      handoverTo: 'Client QA Lead',
      phase: 'Build',
    },
    {
      id: 'POD-02',
      role: 'Automation engineer (UI and API)',
      focus: 'Mixed step scripts, self-healing rules, interface checks',
      allocationPct: 100,
      handoverTo: 'Client IT Admin',
      phase: 'Build',
    },
    {
      id: 'POD-03',
      role: 'Data engineer',
      focus: 'Test data generation, reconciliation sets, data checks',
      allocationPct: 80,
      handoverTo: 'Client data owner',
      phase: 'Build',
    },
    {
      id: 'POD-04',
      role: 'Process analyst',
      focus: 'Process discovery, plain language scenarios, key-user workshops',
      allocationPct: 60,
      handoverTo: 'Client key users',
      phase: 'Run',
    },
    {
      id: 'POD-05',
      role: 'Test manager',
      focus: 'Run plan, findings triage, release and close readiness',
      allocationPct: 50,
      handoverTo: 'Client QA Lead',
      phase: 'Run',
    },
    {
      id: 'POD-06',
      role: 'Trainer and documentation',
      focus: 'Runbooks, training, handover checklist',
      allocationPct: 40,
      handoverTo: 'Client training owner',
      phase: 'Hand over',
    },
  ],
  targets: [
    {
      key: 'processes',
      label: 'Processes automated end to end',
      current: 2,
      target: 6,
      unit: 'of 6',
      plain: 'P1 and P2 are complete. P3 to P6 have a first set and grow each sprint.',
    },
    {
      key: 'manual-hours',
      label: 'Manual test hours saved each month',
      current: 160,
      target: 410,
      unit: 'hours',
      plain: 'Measured against the 410 hours the key users and IT staff spend on manual testing today.',
    },
    {
      key: 'freeze',
      label: 'Month-end change freeze',
      current: 10,
      target: 3,
      unit: 'days',
      plain: 'Automated regression and reconciliation replace the manual checks that make the freeze long.',
    },
    {
      key: 'headcount',
      label: 'Vendor headcount after handover',
      current: 4,
      target: 0,
      unit: 'people',
      plain: 'Build and Run are vendor led, Hand over moves everything to the client team.',
    },
    {
      key: 'coverage',
      label: 'Requirement coverage',
      current: 10,
      target: 10,
      unit: 'of 10',
      plain: 'All ten requirements are demonstrated in the platform; depth per process keeps growing.',
    },
    {
      key: 'defects',
      label: 'Defects found before production',
      current: 16,
      target: 16,
      unit: 'findings',
      plain: 'Sixteen real defects found so far, two of them critical, all with evidence.',
    },
  ],
  training: [
    {
      id: 'TR-01',
      label: 'Key user: approve scenarios and healed scripts',
      owner: 'Key users A to G',
      done: true,
      detail: 'One hour session plus a runbook. Key users already approve in the platform.',
    },
    {
      id: 'TR-02',
      label: 'Key user: read a test report and sign off evidence',
      owner: 'Key users A to G',
      done: true,
      detail: 'Covers the evidence hash, the approver and what the auditor expects.',
    },
    {
      id: 'TR-03',
      label: 'QA Lead: plan and run a selected suite',
      owner: 'Client QA Lead',
      done: true,
      detail: 'Select process, systems, interfaces and scenarios, run, triage findings.',
    },
    {
      id: 'TR-04',
      label: 'IT Admin: maintain selectors, queries and interfaces',
      owner: 'Client IT Admin',
      done: false,
      detail: 'Two half-day sessions, planned for week 17.',
    },
    {
      id: 'TR-05',
      label: 'IT Admin: self-healing rules and confidence thresholds',
      owner: 'Client IT Admin',
      done: false,
      detail: 'Includes when to approve a fix and when to ask for a rewrite.',
    },
    {
      id: 'TR-06',
      label: 'QA Lead: month-end load profile and close readiness',
      owner: 'Client QA Lead',
      done: false,
      detail: 'Planned right after the next close.',
    },
    {
      id: 'TR-07',
      label: 'Auditor: evidence and report walk-through',
      owner: 'Internal audit',
      done: true,
      detail: 'Auditor role has read-only access and has signed off the report format.',
    },
  ],
}

/* --------------------------------------------------------- close readiness */

function buildCalendar(): CloseCalendarDay[] {
  const days: CloseCalendarDay[] = []
  for (let day = 14; day <= 31; day++) {
    const date = `2026-10-${String(day).padStart(2, '0')}`
    let state: CloseCalendarDay['state'] = 'open'
    let note: string | undefined
    if (day === 14) {
      state = 'today'
      note = 'Today'
    } else if (day >= 22 && day <= 31) {
      state = 'freeze-current'
      note = day === 22 ? 'Current freeze starts, ten days before close' : undefined
    }
    if (day >= 29 && day <= 31) {
      state = 'freeze-target'
      note = day === 29 ? 'Target freeze starts, three days before close' : undefined
    }
    if (day === 31) {
      state = 'close'
      note = 'Close'
    }
    days.push({ date, label: `${day} Oct`, state, note })
  }
  return days
}

export const CLOSE_READINESS: CloseReadiness = {
  freezeDays: 10,
  targetFreezeDays: 3,
  closeDate: CLOSE_DATE_ISO,
  calendar: buildCalendar(),
  closeCriticalProcessIds: ['P1', 'P2', 'P3', 'P5', 'P6'],
  readinessPct: 72,
  changeSafety: [
    { changeId: 'CHG-001', safe: true, reason: 'Already released and regression tested before the freeze.' },
    {
      changeId: 'CHG-002',
      safe: false,
      reason: 'Touches the receipt mapping with a critical finding still open, two days before the freeze.',
    },
    { changeId: 'CHG-003', safe: true, reason: 'Shop-floor only and it closes an open High finding.' },
    { changeId: 'CHG-004', safe: true, reason: 'Healed, re-run and approved.' },
    { changeId: 'CHG-005', safe: false, reason: 'Lands inside the freeze window and touches the close process.' },
    { changeId: 'CHG-006', safe: true, reason: 'Additive schema change planned after the close.' },
  ],
}

/* ------------------------------------------------------------------ trend */

/** 30 days of deterministic history, rising as automation grows. */
export const TREND: TrendPoint[] = Array.from({ length: 30 }, (_, index) => {
  const dayOffset = 29 - index
  const iso = daysAgo(dayOffset)
  const progress = index / 29
  const jitter = seededInt(`trend-${index}`, -2, 2)
  return {
    date: iso,
    label: `${new Date(iso).getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date(iso).getUTCMonth()]}`,
    confidence: Math.round(52 + progress * 26 + jitter),
    passRate: Math.round(74 + progress * 18 + jitter),
    scenarios: Math.round(11 + progress * 20),
    openFindings: Math.max(4, Math.round(18 - progress * 8 + jitter / 2)),
    runs: Math.max(0, Math.round(1 + progress * 3 + (jitter > 1 ? 1 : 0))),
  }
})
