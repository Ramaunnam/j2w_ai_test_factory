import type { DiscoveredMap, DiscoverySession, LogSource, ProcessId } from '@/lib/types'
import { daysAgo } from '@/lib/clock'

export const DISCOVERY_SESSIONS: DiscoverySession[] = [
  {
    id: 'DS-001',
    keyUserRole: 'Key User A - gate and weighbridge',
    processId: 'P1',
    systemIds: ['SYS-YARD'],
    site: 'PL01',
    durationMin: 42,
    actionCount: 118,
    capturedAt: daysAgo(9, 3),
    selected: true,
  },
  {
    id: 'DS-002',
    keyUserRole: 'Key User B - goods receipt clerk',
    processId: 'P1',
    systemIds: ['SYS-SAP-STEEL'],
    site: 'PL01',
    durationMin: 36,
    actionCount: 94,
    capturedAt: daysAgo(9, 1),
    selected: true,
  },
  {
    id: 'DS-003',
    keyUserRole: 'Key User C - accounts payable',
    processId: 'P1',
    systemIds: ['SYS-ESKER', 'SYS-SAP-STEEL'],
    site: 'PL01',
    durationMin: 51,
    actionCount: 142,
    capturedAt: daysAgo(8, 5),
    selected: true,
  },
  {
    id: 'DS-004',
    keyUserRole: 'Key User D - scrap yard supervisor',
    processId: 'P2',
    systemIds: ['SYS-YARD', 'SYS-SCRAP'],
    site: 'YD02',
    durationMin: 48,
    actionCount: 131,
    capturedAt: daysAgo(8, 2),
    selected: true,
  },
  {
    id: 'DS-005',
    keyUserRole: 'Key User E - laboratory technician',
    processId: 'P2',
    systemIds: ['SYS-JAVA', 'SYS-SCRAP'],
    site: 'YD02',
    durationMin: 29,
    actionCount: 76,
    capturedAt: daysAgo(7, 6),
    selected: true,
  },
  {
    id: 'DS-006',
    keyUserRole: 'Key User F - treasury and payments',
    processId: 'P3',
    systemIds: ['SYS-SAP-STEEL', 'SYS-REVAL'],
    site: 'PL01',
    durationMin: 33,
    actionCount: 88,
    capturedAt: daysAgo(7, 2),
    selected: false,
  },
  {
    id: 'DS-007',
    keyUserRole: 'Key User G - service centre sales',
    processId: 'P5',
    systemIds: ['SYS-ESKER', 'SYS-SAP-SC'],
    site: 'PL03',
    durationMin: 39,
    actionCount: 104,
    capturedAt: daysAgo(6, 4),
    selected: false,
  },
]

export const LOG_SOURCES: LogSource[] = [
  {
    id: 'LOG-YARD',
    systemId: 'SYS-YARD',
    name: 'Yard Management audit log and weighbridge events',
    rows: 184_210,
    periodDays: 90,
    selected: true,
  },
  {
    id: 'LOG-SAP',
    systemId: 'SYS-SAP-STEEL',
    name: 'Core ERP change documents and transaction log',
    rows: 2_914_330,
    periodDays: 90,
    selected: true,
  },
  {
    id: 'LOG-GATEWAY',
    systemId: 'SYS-SAP-STEEL',
    name: 'Interface gateway message log',
    rows: 1_204_880,
    periodDays: 60,
    selected: true,
  },
  {
    id: 'LOG-SCRAP',
    systemId: 'SYS-SCRAP',
    name: 'Scrap Yard Operations application log',
    rows: 418_440,
    periodDays: 90,
    selected: true,
  },
  {
    id: 'LOG-D365',
    systemId: 'SYS-D365',
    name: 'Recycling ERP database audit trail',
    rows: 1_880_440,
    periodDays: 90,
    selected: false,
  },
]

export const DISCOVERED_MAPS: Record<ProcessId, DiscoveredMap> = {
  P1: {
    processId: 'P1',
    coveragePct: 92,
    variants: 7,
    nodes: [
      { id: 'n1', label: 'Create gate pass', systemId: 'SYS-YARD', frequency: 412, avgMinutes: 3, variant: false },
      { id: 'n2', label: 'Weigh gross', systemId: 'SYS-YARD', frequency: 412, avgMinutes: 2, variant: false },
      { id: 'n3', label: 'Tip and weigh tare', systemId: 'SYS-YARD', frequency: 412, avgMinutes: 14, variant: false },
      { id: 'n4', label: 'Re-weigh after dispute', systemId: 'SYS-YARD', frequency: 38, avgMinutes: 11, variant: true },
      { id: 'n5', label: 'Confirm receipt', systemId: 'SYS-YARD', frequency: 410, avgMinutes: 1, variant: false },
      { id: 'n6', label: 'Post goods receipt', systemId: 'SYS-SAP-STEEL', frequency: 404, avgMinutes: 3, variant: false },
      { id: 'n7', label: 'Correct goods receipt', systemId: 'SYS-SAP-STEEL', frequency: 46, avgMinutes: 9, variant: true },
      { id: 'n8', label: 'Capture supplier invoice', systemId: 'SYS-ESKER', frequency: 322, avgMinutes: 4, variant: false },
      { id: 'n9', label: 'Post supplier invoice', systemId: 'SYS-SAP-STEEL', frequency: 310, avgMinutes: 3, variant: false },
      { id: 'n10', label: 'Clarify parked invoice', systemId: 'SYS-SAP-STEEL', frequency: 12, avgMinutes: 180, variant: true },
      { id: 'n11', label: 'Produce document', systemId: 'SYS-LASERNET', frequency: 536, avgMinutes: 2, variant: false },
    ],
    edges: [
      { from: 'n1', to: 'n2', count: 412, avgMinutes: 4 },
      { from: 'n2', to: 'n3', count: 412, avgMinutes: 16 },
      { from: 'n3', to: 'n4', count: 38, avgMinutes: 12, rework: true },
      { from: 'n4', to: 'n3', count: 38, avgMinutes: 9, rework: true },
      { from: 'n3', to: 'n5', count: 410, avgMinutes: 2 },
      { from: 'n5', to: 'n6', count: 404, avgMinutes: 3 },
      { from: 'n6', to: 'n7', count: 46, avgMinutes: 22, rework: true },
      { from: 'n7', to: 'n6', count: 46, avgMinutes: 8, rework: true },
      { from: 'n6', to: 'n8', count: 322, avgMinutes: 1440 },
      { from: 'n8', to: 'n9', count: 310, avgMinutes: 18 },
      { from: 'n8', to: 'n10', count: 12, avgMinutes: 220, rework: true },
      { from: 'n9', to: 'n11', count: 536, avgMinutes: 2 },
    ],
    reworkLoops: [
      {
        label: 'Re-weigh after a weight dispute',
        count: 38,
        explanation:
          'In 9 % of receipts the truck is weighed again because gross and tare do not add up to the declared load. This is the behaviour the net weight data check protects.',
      },
      {
        label: 'Goods receipt corrected after posting',
        count: 46,
        explanation:
          'In 11 % of receipts the material document is reversed and posted again, mostly after a unit or tare problem. This maps directly to the critical weight finding.',
      },
      {
        label: 'Parked invoice clarified by hand',
        count: 12,
        explanation:
          'Invoices without a purchase order reference park and wait on average three hours of working time before a key user clears them.',
      },
    ],
    proposedScenarios: [
      {
        name: 'Truck receipt to posted supplier invoice',
        type: 'Positive',
        plain: 'The main path seen in 404 of 412 receipts, including the invoice and the document.',
      },
      {
        name: 'Wagon receipt with two materials to two goods receipt lines',
        type: 'Positive',
        plain: 'Split receipt variant seen 64 times in the period.',
      },
      {
        name: 'Receipt without a purchase order must be blocked',
        type: 'Negative',
        plain: 'Derived from 18 attempts in the log where no purchase order was referenced.',
      },
      {
        name: 'Net weight above the declared tolerance must be refused',
        type: 'Negative',
        plain: 'Derived from the 38 re-weigh loops found in the log.',
      },
      {
        name: 'Duplicate receipt message must not create a second goods receipt',
        type: 'Negative',
        plain: 'Derived from 3 duplicated gate passes in the gateway log.',
      },
      {
        name: 'Regression: gate to invoice after the Power Platform release',
        type: 'Regression',
        plain: 'Covers the whole journey after every yard release.',
      },
    ],
  },
  P2: {
    processId: 'P2',
    coveragePct: 88,
    variants: 5,
    nodes: [
      { id: 'n1', label: 'Weigh wagon or container', systemId: 'SYS-YARD', frequency: 268, avgMinutes: 6, variant: false },
      { id: 'n2', label: 'Hand over to scrap yard', systemId: 'SYS-YARD', frequency: 266, avgMinutes: 1, variant: false },
      { id: 'n3', label: 'Sort into grade batch', systemId: 'SYS-SCRAP', frequency: 264, avgMinutes: 38, variant: false },
      { id: 'n4', label: 'Re-sort after grade dispute', systemId: 'SYS-SCRAP', frequency: 22, avgMinutes: 44, variant: true },
      { id: 'n5', label: 'Take chemistry sample', systemId: 'SYS-SCRAP', frequency: 258, avgMinutes: 8, variant: false },
      { id: 'n6', label: 'Enter laboratory result', systemId: 'SYS-JAVA', frequency: 256, avgMinutes: 12, variant: false },
      { id: 'n7', label: 'Post stock', systemId: 'SYS-D365', frequency: 246, avgMinutes: 2, variant: false },
      { id: 'n8', label: 'Produce self-billing document', systemId: 'SYS-LASERNET', frequency: 212, avgMinutes: 2, variant: false },
    ],
    edges: [
      { from: 'n1', to: 'n2', count: 266, avgMinutes: 2 },
      { from: 'n2', to: 'n3', count: 264, avgMinutes: 46 },
      { from: 'n3', to: 'n4', count: 22, avgMinutes: 52, rework: true },
      { from: 'n4', to: 'n3', count: 22, avgMinutes: 40, rework: true },
      { from: 'n3', to: 'n5', count: 258, avgMinutes: 12 },
      { from: 'n5', to: 'n6', count: 256, avgMinutes: 94 },
      { from: 'n6', to: 'n7', count: 246, avgMinutes: 14 },
      { from: 'n7', to: 'n8', count: 212, avgMinutes: 3 },
    ],
    reworkLoops: [
      {
        label: 'Re-sort after a grade dispute',
        count: 22,
        explanation:
          'In 8 % of receipts the batch is sorted again because the chemistry does not match the declared grade. The grade specification check covers this.',
      },
      {
        label: 'Chemistry entered twice',
        count: 14,
        explanation:
          'The laboratory re-enters a result in 5 % of samples, usually because one element did not save. This points at the molybdenum defect on the laboratory interface.',
      },
    ],
    proposedScenarios: [
      {
        name: 'Wagon receipt to sorted stock with chemistry confirmed',
        type: 'Positive',
        plain: 'The main path seen in 246 of 268 receipts.',
      },
      {
        name: 'Container receipt of a single grade to stock',
        type: 'Positive',
        plain: 'Single grade variant seen 88 times.',
      },
      {
        name: 'Batch without a chemistry result must not post to stock',
        type: 'Negative',
        plain: 'Derived from 9 attempts to release a batch before the laboratory result existed.',
      },
      {
        name: 'Chemistry outside the declared grade must be flagged before stock',
        type: 'Negative',
        plain: 'Derived from the 22 re-sort loops.',
      },
      {
        name: 'Regression: scrap to stock after the recycling ERP update',
        type: 'Regression',
        plain: 'Covers the journey after every monthly ERP update.',
      },
    ],
  },
  P3: {
    processId: 'P3',
    coveragePct: 74,
    variants: 4,
    nodes: [
      { id: 'n1', label: 'Create purchase order', systemId: 'SYS-SAP-STEEL', frequency: 288, avgMinutes: 6, variant: false },
      { id: 'n2', label: 'Post goods receipt', systemId: 'SYS-SAP-STEEL', frequency: 284, avgMinutes: 3, variant: false },
      { id: 'n3', label: 'Capture invoice', systemId: 'SYS-ESKER', frequency: 322, avgMinutes: 4, variant: false },
      { id: 'n4', label: 'Post invoice', systemId: 'SYS-SAP-STEEL', frequency: 310, avgMinutes: 3, variant: false },
      { id: 'n5', label: 'Create payment run', systemId: 'SYS-SAP-STEEL', frequency: 24, avgMinutes: 18, variant: false },
      { id: 'n6', label: 'Treasury acknowledgement', systemId: 'SYS-REVAL', frequency: 24, avgMinutes: 34, variant: false },
    ],
    edges: [
      { from: 'n1', to: 'n2', count: 284, avgMinutes: 2880 },
      { from: 'n2', to: 'n3', count: 282, avgMinutes: 1440 },
      { from: 'n3', to: 'n4', count: 310, avgMinutes: 18 },
      { from: 'n4', to: 'n5', count: 280, avgMinutes: 4320 },
      { from: 'n5', to: 'n6', count: 24, avgMinutes: 38 },
    ],
    reworkLoops: [
      {
        label: 'Invoice blocked and released by hand',
        count: 26,
        explanation: 'Price and quantity differences are cleared manually in 8 % of invoices.',
      },
    ],
    proposedScenarios: [
      { name: 'Purchase order to payment with treasury acknowledgement', type: 'Positive', plain: 'The main path through both ERPs and treasury.' },
      { name: 'Payment run without approval must not create a bank file', type: 'Negative', plain: 'Derived from 2 attempts in the log.' },
    ],
  },
  P4: {
    processId: 'P4',
    coveragePct: 70,
    variants: 3,
    nodes: [
      { id: 'n1', label: 'Cast heat', systemId: 'SYS-MES', frequency: 188, avgMinutes: 52, variant: false },
      { id: 'n2', label: 'Produce coils', systemId: 'SYS-MES', frequency: 188, avgMinutes: 36, variant: false },
      { id: 'n3', label: 'Confirm production', systemId: 'SYS-SAP-STEEL', frequency: 181, avgMinutes: 4, variant: false },
      { id: 'n4', label: 'Create delivery', systemId: 'SYS-SAP-STEEL', frequency: 164, avgMinutes: 8, variant: false },
      { id: 'n5', label: 'Produce certificate', systemId: 'SYS-LASERNET', frequency: 160, avgMinutes: 3, variant: false },
    ],
    edges: [
      { from: 'n1', to: 'n2', count: 188, avgMinutes: 44 },
      { from: 'n2', to: 'n3', count: 181, avgMinutes: 24 },
      { from: 'n3', to: 'n4', count: 164, avgMinutes: 180 },
      { from: 'n4', to: 'n5', count: 160, avgMinutes: 6 },
    ],
    reworkLoops: [
      {
        label: 'Confirmation re-sent after a late file',
        count: 7,
        explanation: 'Seven confirmations were sent again because the first file missed the interface window.',
      },
    ],
    proposedScenarios: [
      { name: 'Heat and coil to delivery with mill certificate', type: 'Positive', plain: 'The main production and dispatch path.' },
      { name: 'Confirmation for a closed production order must be refused', type: 'Negative', plain: 'Derived from 4 attempts in the log.' },
    ],
  },
  P5: {
    processId: 'P5',
    coveragePct: 72,
    variants: 4,
    nodes: [
      { id: 'n1', label: 'Capture customer order', systemId: 'SYS-ESKER', frequency: 96, avgMinutes: 5, variant: false },
      { id: 'n2', label: 'Create sales order', systemId: 'SYS-SAP-SC', frequency: 94, avgMinutes: 4, variant: false },
      { id: 'n3', label: 'Release credit block', systemId: 'SYS-SAP-SC', frequency: 11, avgMinutes: 240, variant: true },
      { id: 'n4', label: 'Deliver', systemId: 'SYS-SAP-SC', frequency: 92, avgMinutes: 14, variant: false },
      { id: 'n5', label: 'Bill', systemId: 'SYS-SAP-SC', frequency: 92, avgMinutes: 3, variant: false },
      { id: 'n6', label: 'Produce invoice document', systemId: 'SYS-LASERNET', frequency: 92, avgMinutes: 2, variant: false },
    ],
    edges: [
      { from: 'n1', to: 'n2', count: 94, avgMinutes: 12 },
      { from: 'n2', to: 'n3', count: 11, avgMinutes: 260, rework: true },
      { from: 'n3', to: 'n4', count: 11, avgMinutes: 36 },
      { from: 'n2', to: 'n4', count: 81, avgMinutes: 1440 },
      { from: 'n4', to: 'n5', count: 92, avgMinutes: 60 },
      { from: 'n5', to: 'n6', count: 92, avgMinutes: 2 },
    ],
    reworkLoops: [
      {
        label: 'Credit block released by hand',
        count: 11,
        explanation: 'One in nine orders waits for a credit release, on average four hours.',
      },
    ],
    proposedScenarios: [
      { name: 'Captured customer order to invoice document', type: 'Positive', plain: 'The main order to cash path.' },
      { name: 'Order above the credit limit must be blocked, not delivered', type: 'Negative', plain: 'Derived from the credit block variant.' },
    ],
  },
  P6: {
    processId: 'P6',
    coveragePct: 66,
    variants: 3,
    nodes: [
      { id: 'n1', label: 'Clear receipt and invoice backlog', systemId: 'SYS-SAP-STEEL', frequency: 12, avgMinutes: 420, variant: false },
      { id: 'n2', label: 'Match intercompany', systemId: 'SYS-D365', frequency: 12, avgMinutes: 180, variant: false },
      { id: 'n3', label: 'Treasury and FX', systemId: 'SYS-REVAL', frequency: 12, avgMinutes: 92, variant: false },
      { id: 'n4', label: 'Close report', systemId: 'SYS-JAVA', frequency: 12, avgMinutes: 46, variant: false },
    ],
    edges: [
      { from: 'n1', to: 'n2', count: 12, avgMinutes: 240 },
      { from: 'n2', to: 'n3', count: 12, avgMinutes: 120 },
      { from: 'n3', to: 'n4', count: 12, avgMinutes: 60 },
    ],
    reworkLoops: [
      {
        label: 'Backlog cleared item by item',
        count: 12,
        explanation:
          'Every close starts with seven hours of manual backlog clearing. This is the single biggest reason the freeze lasts ten days.',
      },
    ],
    proposedScenarios: [
      { name: 'Period postings cleared and intercompany matched both ways', type: 'Positive', plain: 'The close dry run.' },
      { name: 'Posting into a closed period must be refused', type: 'Negative', plain: 'Derived from 3 attempts in the log.' },
    ],
  },
}
