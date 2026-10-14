import type { HealingEvent } from '@/lib/types'
import { daysAgo, minutesAgo } from '@/lib/clock'

function diff(removed: string[], added: string[], context: string[] = []): HealingEvent['diffLines'] {
  return [
    ...context.map((text) => ({ type: 'context' as const, text })),
    ...removed.map((text) => ({ type: 'removed' as const, text })),
    ...added.map((text) => ({ type: 'added' as const, text })),
  ]
}

export const HEALING_EVENTS: HealingEvent[] = [
  {
    id: 'HEAL-001',
    scenarioId: 'P1-POS-01',
    stepId: 'P1-POS-01-S04',
    changeItemId: 'CHG-001',
    changeKind: 'UI',
    detectedAt: minutesAgo(44),
    summary: 'Net weight field renamed on the weighbridge ticket screen',
    before: "input[data-field='netWeightKg']",
    after: "input[data-field='net_weight_kg']",
    diffLines: diff(
      ["  await page.fill(\"input[data-field='netWeightKg']\", netWeight)"],
      ["  await page.fill(\"input[data-field='net_weight_kg']\", netWeight)"],
      ['  // step 4: confirm the net weight on the weighbridge ticket'],
    ),
    confidencePct: 96,
    rationale:
      'The field label, input type, position on the screen and surrounding labels are unchanged; only the data-field attribute was renamed by the yard release. The healed selector finds exactly one element and the step passed on re-run.',
    status: 'Approved',
    approvedByRole: 'Key User',
    reRunPassed: true,
  },
  {
    id: 'HEAL-002',
    scenarioId: 'P1-POS-01',
    stepId: 'P1-POS-01-S08',
    changeItemId: 'CHG-002',
    changeKind: 'UI',
    detectedAt: daysAgo(1, 4),
    summary: 'Material document field id changed on the core ERP display screen',
    before: "input[name='RM07M-MBLNR']",
    after: "input[name='GODYNPRO-MBLNR']",
    diffLines: diff(
      ["  await page.fill(\"input[name='RM07M-MBLNR']\", materialDocument)"],
      ["  await page.fill(\"input[name='GODYNPRO-MBLNR']\", materialDocument)"],
      ['  // step 8: display the material document'],
    ),
    confidencePct: 88,
    rationale:
      'The transport replaced the display dynpro. The new field carries the same label and the same technical data element MBLNR. Confidence is below the automatic threshold of 90, so a key user has to confirm.',
    status: 'Pending approval',
    reRunPassed: true,
  },
  {
    id: 'HEAL-003',
    scenarioId: 'P2-REG-02',
    stepId: 'P2-REG-02-S01',
    changeItemId: 'CHG-003',
    changeKind: 'API',
    detectedAt: daysAgo(1, 2),
    summary: 'Laboratory app endpoint moved to v2 and the molybdenum field was renamed',
    before: 'POST /api/v1/lab-results  { "mo_pct": 2.10 }',
    after: 'POST /api/v2/lab-results  { "molybdenum_pct": 2.10 }',
    diffLines: diff(
      ['  POST https://labapp.test.local/api/v1/lab-results', '  body: { ni_pct, cr_pct, mo_pct }'],
      ['  POST https://labapp.test.local/api/v2/lab-results', '  body: { ni_pct, cr_pct, molybdenum_pct }'],
      ['  // chemistry result call to the in-house laboratory app'],
    ),
    confidencePct: 93,
    rationale:
      'The v1 endpoint answers 410 gone and the published description of v2 lists molybdenum_pct with the same unit and range as mo_pct. All other fields are unchanged. The healed call returned 201 and the value arrived in the batch.',
    status: 'Pending approval',
    reRunPassed: true,
  },
  {
    id: 'HEAL-004',
    scenarioId: 'P4-REG-01',
    stepId: 'P4-REG-01-S01',
    changeItemId: 'CHG-004',
    changeKind: 'Schema',
    detectedAt: daysAgo(2, 3),
    summary: 'Heat number column widened in the mill execution database',
    before: 'heat_no char(12)  -- compared with = and no trim',
    after: 'heat_no varchar(24)  -- compared with TRIM()',
    diffLines: diff(
      ["  WHERE h.heat_no = 'HT-26-10418'"],
      ["  WHERE TRIM(h.heat_no) = 'HT-26-10418'"],
      ['  SELECT h.heat_no, c.coil_no, c.weight_kg', '    FROM mes.heat h JOIN mes.coil c ON c.heat_no = h.heat_no'],
    ),
    confidencePct: 97,
    rationale:
      'The column was widened, not renamed, and the data type stays character based. Adding TRIM keeps the comparison working on both the old and the new width, so the query is backwards compatible.',
    status: 'Approved',
    approvedByRole: 'IT Admin',
    reRunPassed: true,
  },
  {
    id: 'HEAL-005',
    scenarioId: 'P2-REG-01',
    stepId: 'P2-REG-01-S03',
    changeItemId: 'CHG-005',
    changeKind: 'Schema',
    detectedAt: daysAgo(3, 5),
    summary: 'Recycling ERP stock entity gained a mandatory warehouse field',
    before: '{ ItemId, BatchNo, Quantity, Unit, Site }',
    after: '{ ItemId, BatchNo, Quantity, Unit, Site, Warehouse }',
    diffLines: diff(
      ['  body: { ItemId, BatchNo, Quantity, Unit, Site }'],
      ['  body: { ItemId, BatchNo, Quantity, Unit, Site, Warehouse: "RAW" }'],
      ['  // stock posting to the recycling ERP'],
    ),
    confidencePct: 84,
    rationale:
      'The update made Warehouse mandatory. The value RAW is taken from the site configuration used by every other scrap posting, but the AI cannot prove that RAW is correct for every site, so a key user must confirm.',
    status: 'Pending approval',
    reRunPassed: true,
  },
  {
    id: 'HEAL-006',
    scenarioId: 'P2-POS-01',
    stepId: 'P2-POS-01-S04',
    changeKind: 'UI',
    detectedAt: daysAgo(5, 2),
    summary: 'Sortation confirm button moved into a toolbar',
    before: "button[data-action='confirmSortation']",
    after: "div[role='toolbar'] button[data-action='confirmSortation']",
    diffLines: diff(
      ["  await page.click(\"button[data-action='confirmSortation']\")"],
      ["  await page.click(\"div[role='toolbar'] button[data-action='confirmSortation']\")"],
    ),
    confidencePct: 91,
    rationale:
      'The button kept its data-action attribute and label but is now inside a toolbar element, so the old selector matched two elements. Scoping the selector to the toolbar makes it unique again.',
    status: 'Approved',
    approvedByRole: 'Key User',
    reRunPassed: true,
  },
  {
    id: 'HEAL-007',
    scenarioId: 'P1-POS-01',
    stepId: 'P1-POS-01-S09',
    changeKind: 'API',
    detectedAt: daysAgo(7, 1),
    summary: 'Invoice capture endpoint added pagination to the queue read',
    before: 'GET /api/supplier-invoices?status=new',
    after: 'GET /api/supplier-invoices?status=new&page=1&pageSize=50',
    diffLines: diff(
      ['  GET /api/supplier-invoices?status=new'],
      ['  GET /api/supplier-invoices?status=new&page=1&pageSize=50'],
    ),
    confidencePct: 76,
    rationale:
      'Adding pagination keeps the first page working but would silently ignore documents beyond page one. A key user rejected the fix and asked for a loop over all pages instead.',
    status: 'Rejected',
    approvedByRole: 'QA Lead',
    reRunPassed: false,
  },
]

export const HEALING_BY_ID = new Map(HEALING_EVENTS.map((h) => [h.id, h]))
