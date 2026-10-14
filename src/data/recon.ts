import type { FieldCompare, ReconRow, ReconSet } from '@/lib/types'
import { daysAgo } from '@/lib/clock'

function f(label: string, source: string, target: string, match?: boolean, note?: string): FieldCompare {
  return {
    name: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    label,
    sourceValue: source,
    targetValue: target,
    match: match ?? source === target,
    note,
  }
}

function row(key: string, label: string, status: ReconRow['status'], fields: FieldCompare[], causeGroup?: string): ReconRow {
  return { key, label, status, fields, causeGroup }
}

export const RECON_SETS: ReconSet[] = [
  {
    id: 'RC-01',
    name: 'Vendor master migration into the recycling ERP',
    scope: 'Migration',
    sourceSystemId: 'SYS-SAP-STEEL',
    targetSystemId: 'SYS-D365',
    dataSourceIds: ['DS-SAP-LFA1', 'DS-D365-VENDTABLE'],
    site: 'ALL',
    counts: { source: 9_912, target: 9_880, matched: 9_871, missing: 32, extra: 9 },
    totals: { label: 'Vendors with bank details', source: 9_440, target: 9_431, delta: -9, unit: 'records' },
    matchPct: 99.6,
    lastRunAt: daysAgo(6, 4),
    findingIds: ['F-016'],
    sample: [
      row('VEND-2208', 'Scrap Supplier Alpha', 'Mismatched', [
        f('Vendor', 'VEND-2208', 'VEND-2208'),
        f('Name', 'Scrap Supplier Alpha', 'Scrap Supplier Alpha'),
        f('Country', 'NL', 'NL'),
        f('Bank account', 'NL91 ABNA 0417 1643 0012 0098 11', 'NL91 ABNA 0417 1643 00', false, 'Target field is 24 characters, source is 34.'),
        f('Payment terms', '30 days net', '30 days net'),
      ], 'Field length'),
      row('VEND-2214', 'Metal Trader North', 'Mismatched', [
        f('Vendor', 'VEND-2214', 'VEND-2214'),
        f('Name', 'Metal Trader North', 'Metal Trader North'),
        f('Bank account', 'DE89 3704 0044 0532 0130 0045 22', 'DE89 3704 0044 0532 01', false, 'Truncated on migration.'),
      ], 'Field length'),
      row('VEND-2220', 'Recycling Partner East', 'Matched', [
        f('Vendor', 'VEND-2220', 'VEND-2220'),
        f('Name', 'Recycling Partner East', 'Recycling Partner East'),
        f('Bank account', 'BE68 5390 0754 7034', 'BE68 5390 0754 7034'),
      ]),
      row('VEND-2231', 'Metal Trader South', 'Missing', [
        f('Vendor', 'VEND-2231', 'not found', false),
        f('Status', 'Blocked for posting', '-', false, 'Blocked vendors were excluded by the migration filter.'),
      ], 'Migration filter'),
    ],
    differenceGroups: [
      {
        id: 'RC-01-G1',
        cause: 'Bank account field shorter in the target',
        count: 9,
        severity: 'High',
        aiExplanation:
          'The source holds up to 34 characters for the bank account, the migrated target field holds 24. Nine vendors with long international account numbers were cut off, which would make their payments fail.',
        recommendedFix: 'Widen the target field to 34 characters and re-migrate the nine affected vendors.',
      },
      {
        id: 'RC-01-G2',
        cause: 'Blocked vendors excluded by the migration filter',
        count: 32,
        severity: 'Low',
        aiExplanation:
          'The migration selected only vendors that are open for posting. The 32 missing vendors are all blocked and have no open items, so excluding them is correct, but it has to be documented for the auditor.',
        recommendedFix: 'Document the filter in the migration sign-off, no re-migration needed.',
      },
      {
        id: 'RC-01-G3',
        cause: 'Vendors created directly in the target',
        count: 9,
        severity: 'Medium',
        aiExplanation:
          'Nine vendors exist only in the recycling ERP. They were created after the migration cut-off, which is expected, but they are not in the group master, so they will not be governed centrally.',
        recommendedFix: 'Create the nine vendors in the group master and link them.',
      },
    ],
  },
  {
    id: 'RC-02',
    name: 'Customer master migration into the service centre ERP',
    scope: 'Migration',
    sourceSystemId: 'SYS-SAP-STEEL',
    targetSystemId: 'SYS-SAP-SC',
    dataSourceIds: ['DS-SAP-LFA1', 'DS-SC-VBAK'],
    site: 'PL03',
    counts: { source: 4_218, target: 4_218, matched: 4_214, missing: 0, extra: 0 },
    totals: { label: 'Total credit limit', source: 184_220_000, target: 184_220_000, delta: 0, unit: 'EUR' },
    matchPct: 99.9,
    lastRunAt: daysAgo(6, 3),
    findingIds: [],
    sample: [
      row('CUST-2210', 'Service Centre Buyer Nord', 'Matched', [
        f('Customer', 'CUST-2210', 'CUST-2210'),
        f('Credit limit', '250 000.00 EUR', '250 000.00 EUR'),
        f('Delivery terms', 'DAP', 'DAP'),
      ]),
      row('CUST-2244', 'Processing Partner One', 'Mismatched', [
        f('Customer', 'CUST-2244', 'CUST-2244'),
        f('Delivery terms', 'FCA', 'EXW', false, 'Delivery terms mapping table has no entry for FCA.'),
      ], 'Missing mapping'),
    ],
    differenceGroups: [
      {
        id: 'RC-02-G1',
        cause: 'Delivery terms mapping incomplete',
        count: 4,
        severity: 'Medium',
        aiExplanation:
          'Four customers use delivery terms that are not in the mapping table, so the migration fell back to the default EXW. Invoices for those customers would show the wrong terms.',
        recommendedFix: 'Complete the delivery terms mapping table and re-migrate the four customers.',
      },
    ],
  },
  {
    id: 'RC-03',
    name: 'Material master migration into the recycling ERP',
    scope: 'Migration',
    sourceSystemId: 'SYS-SAP-STEEL',
    targetSystemId: 'SYS-D365',
    dataSourceIds: ['DS-SAP-MARA', 'DS-D365-INVENT'],
    site: 'ALL',
    counts: { source: 1_240, target: 1_240, matched: 1_236, missing: 0, extra: 0 },
    totals: { label: 'Materials with a unit of measure', source: 1_240, target: 1_236, delta: -4, unit: 'records' },
    matchPct: 99.7,
    lastRunAt: daysAgo(6, 2),
    findingIds: [],
    sample: [
      row('SCR-316L-SOLID', 'Stainless scrap 316L solid', 'Matched', [
        f('Item', 'SCR-316L-SOLID', 'SCR-316L-SOLID'),
        f('Base unit', 'KG', 'KG'),
        f('Grade', '316L', '316L'),
      ]),
      row('SCR-430-TURN', 'Stainless scrap 430 turnings', 'Mismatched', [
        f('Item', 'SCR-430-TURN', 'SCR-430-TURN'),
        f('Base unit', 'KG', 'empty', false, 'No unit of measure mapping for this item group.'),
      ], 'Missing unit mapping'),
    ],
    differenceGroups: [
      {
        id: 'RC-03-G1',
        cause: 'Missing unit of measure mapping',
        count: 4,
        severity: 'High',
        aiExplanation:
          'Four items arrived without a base unit. Postings for those items fall back to the system default, which is how the kilogram and tonne mix-up on the stock interface became possible.',
        recommendedFix: 'Add the missing unit mappings and make the unit mandatory on item creation.',
      },
    ],
  },
  {
    id: 'RC-04',
    name: 'Open items migration, recycling company',
    scope: 'Migration',
    sourceSystemId: 'SYS-SAP-STEEL',
    targetSystemId: 'SYS-D365',
    dataSourceIds: ['DS-SAP-BKPF', 'DS-D365-VENDINV'],
    site: 'ALL',
    counts: { source: 3_118, target: 3_118, matched: 3_112, missing: 0, extra: 0 },
    totals: { label: 'Open item value', source: 8_441_220.4, target: 8_441_220.09, delta: -0.31, unit: 'EUR' },
    matchPct: 99.8,
    lastRunAt: daysAgo(6, 1),
    findingIds: ['F-010'],
    sample: [
      row('IC-2026-10-0441', 'Intercompany open item', 'Mismatched', [
        f('Document', 'IC-2026-10-0441', 'IC-2026-10-0441'),
        f('Amount', '248 118.44 EUR', '248 118.37 EUR', false, 'Tax rounded per line instead of per document.'),
      ], 'Tax rounding'),
      row('5105600781', 'Supplier invoice open item', 'Matched', [
        f('Document', '5105600781', '5105600781'),
        f('Amount', '22 267.03 EUR', '22 267.03 EUR'),
      ]),
    ],
    differenceGroups: [
      {
        id: 'RC-04-G1',
        cause: 'Tax rounding rule differs between the two ERPs',
        count: 6,
        severity: 'Medium',
        aiExplanation:
          'One ERP rounds tax per line, the other per document. Six documents differ by a few cents, which leaves the group position 0.31 EUR out.',
        recommendedFix: 'Align the rounding rule to per document and allow a 0.05 EUR tolerance per document in the check.',
      },
    ],
  },
  {
    id: 'RC-05',
    name: 'Role and user migration for access testing',
    scope: 'Migration',
    sourceSystemId: 'SYS-SAP-STEEL',
    targetSystemId: 'SYS-D365',
    dataSourceIds: ['DS-SAP-ROLES', 'DS-D365-ROLES'],
    site: 'ALL',
    counts: { source: 1_712, target: 1_640, matched: 1_634, missing: 72, extra: 6 },
    totals: { label: 'Role assignments', source: 1_712, target: 1_640, delta: -72, unit: 'assignments' },
    matchPct: 95.4,
    lastRunAt: daysAgo(5, 8),
    findingIds: [],
    sample: [
      row('USR-F', 'Key User F role set', 'Mismatched', [
        f('User', 'Key User F', 'Key User F'),
        f('Payment role', 'Z_PAYMENT_RUN', 'Payment processing'),
        f('Vendor role', 'Z_VENDOR_MASTER', 'Vendor maintenance'),
        f('Conflict flag', 'set', 'not set', false, 'The conflict flag did not migrate, so the conflict is invisible in the target.'),
      ], 'Conflict flag not migrated'),
    ],
    differenceGroups: [
      {
        id: 'RC-05-G1',
        cause: 'Segregation of duties flags not migrated',
        count: 6,
        severity: 'High',
        aiExplanation:
          'Six users carry a conflict flag in the source that did not come across. Without the flag the recycling ERP shows no warning when the conflicting roles are used together.',
        recommendedFix: 'Re-create the conflict flags in the target or run the conflict matrix from this platform instead.',
      },
      {
        id: 'RC-05-G2',
        cause: 'Obsolete assignments intentionally dropped',
        count: 72,
        severity: 'Low',
        aiExplanation: 'The 72 missing assignments all belong to roles that no longer exist in the target design.',
        recommendedFix: 'Document in the migration sign-off.',
      },
    ],
  },
  {
    id: 'RC-06',
    name: 'Yard receipts against core ERP goods receipts',
    scope: 'Cross-system',
    sourceSystemId: 'SYS-YARD',
    targetSystemId: 'SYS-SAP-STEEL',
    dataSourceIds: ['DS-YARD-TICKET', 'DS-SAP-MSEG'],
    site: 'PL01',
    counts: { source: 412, target: 411, matched: 404, missing: 1, extra: 3 },
    totals: { label: 'Received weight', source: 9_884_220, target: 9_902_180, delta: 17_960, unit: 'kg' },
    matchPct: 98.1,
    lastRunAt: daysAgo(0, 2),
    findingIds: ['F-001', 'F-005'],
    sample: [
      row('GP-PL01-2026-04821', 'Receipt VH-7741', 'Mismatched', [
        f('Gate pass', 'GP-PL01-2026-04821', 'GP-PL01-2026-04821'),
        f('Vehicle', 'VH-7741', 'VH-7741'),
        f('Net weight', '24 860 kg', '2 486 kg', false, 'Kilogram and tonne mix-up.'),
      ], 'Unit mix-up'),
      row('GP-PL01-2026-04822', 'Receipt VH-8126', 'Mismatched', [
        f('Gate pass', 'GP-PL01-2026-04822', 'GP-PL01-2026-04822'),
        f('Tare weight', '13 940 kg', '15 180 kg', false, 'Vehicle master tare used instead of the re-weighed tare.'),
        f('Net weight', '23 180 kg', '21 940 kg', false),
      ], 'Tare handling'),
      row('GP-PL01-2026-04825', 'Receipt VH-9043', 'Duplicated', [
        f('Gate pass', 'GP-PL01-2026-04825', 'GP-PL01-2026-04825'),
        f('Material documents', '1', '2', false, 'Message delivered twice.'),
      ], 'Duplicate message'),
      row('GP-PL01-2026-04831', 'Receipt VH-7742', 'Missing', [
        f('Gate pass', 'GP-PL01-2026-04831', 'not found', false),
        f('Net weight', '22 980 kg', '-', false),
      ], 'Lost message'),
      row('GP-PL01-2026-04826', 'Receipt VH-7118', 'Matched', [
        f('Gate pass', 'GP-PL01-2026-04826', 'GP-PL01-2026-04826'),
        f('Net weight', '26 120 kg', '26 120 kg'),
      ]),
    ],
    differenceGroups: [
      {
        id: 'RC-06-G1',
        cause: 'Unit and tare handling on the receipt interface',
        count: 4,
        severity: 'Critical',
        aiExplanation:
          'Two receipts differ because the unit was interpreted as tonnes and because the registered tare was used instead of the re-weighed tare. Both are interface defects, not data entry mistakes.',
        recommendedFix: 'Send the unit with every quantity, reject unknown units and always use the ticket tare.',
      },
      {
        id: 'RC-06-G2',
        cause: 'Duplicated and lost messages',
        count: 4,
        severity: 'Critical',
        aiExplanation:
          'Three gate passes created two material documents each after a gateway retry, and one message was lost after being taken off the queue.',
        recommendedFix: 'Add an idempotency key on the gate pass and a daily missing message check.',
      },
    ],
  },
  {
    id: 'RC-07',
    name: 'Scrap batches against recycling ERP stock',
    scope: 'Cross-system',
    sourceSystemId: 'SYS-SCRAP',
    targetSystemId: 'SYS-D365',
    dataSourceIds: ['DS-SCRAP-BATCH', 'DS-D365-INVENT'],
    site: 'YD02',
    counts: { source: 246, target: 246, matched: 240, missing: 0, extra: 0 },
    totals: { label: 'Stock weight', source: 6_418_440, target: 67_898_440, delta: 61_480_000, unit: 'kg' },
    matchPct: 97.6,
    lastRunAt: daysAgo(1, 2),
    findingIds: ['F-002'],
    sample: [
      row('SB-26-41180', 'Batch 316L solid', 'Mismatched', [
        f('Batch', 'SB-26-41180', 'SB-26-41180'),
        f('Quantity', '61 480', '61 480'),
        f('Unit', 'KG', 'TON', false, 'Unit not validated against the item base unit.'),
      ], 'Unit mix-up'),
      row('SB-26-41186', 'Batch 304 baled', 'Matched', [
        f('Batch', 'SB-26-41186', 'SB-26-41186'),
        f('Quantity', '24 640', '24 640'),
        f('Unit', 'KG', 'KG'),
      ]),
    ],
    differenceGroups: [
      {
        id: 'RC-07-G1',
        cause: 'Unit not validated on the stock interface',
        count: 2,
        severity: 'Critical',
        aiExplanation:
          'Two postings arrived with unit TON while the quantity was in kilograms, which inflates stock by a factor of 1000. The missing unit mapping in the material migration made this possible.',
        recommendedFix: 'Reject any unit that is not the item base unit and correct the two stock postings.',
      },
      {
        id: 'RC-07-G2',
        cause: 'Chemistry value lost on the laboratory interface',
        count: 4,
        severity: 'High',
        aiExplanation:
          'Four batches show 0.00 % molybdenum although the laboratory measured a value, because the field arrives as text and is discarded.',
        recommendedFix: 'Type all chemistry values as numbers and reject unparsable values.',
      },
    ],
  },
  {
    id: 'RC-08',
    name: 'Intercompany documents, both directions',
    scope: 'Cross-system',
    sourceSystemId: 'SYS-D365',
    targetSystemId: 'SYS-SAP-STEEL',
    dataSourceIds: ['DS-D365-VENDINV', 'DS-SAP-BKPF'],
    site: 'ALL',
    counts: { source: 64, target: 64, matched: 58, missing: 0, extra: 0 },
    totals: { label: 'Intercompany value', source: 4_118_220.44, target: 4_118_220.13, delta: -0.31, unit: 'EUR' },
    matchPct: 90.6,
    lastRunAt: daysAgo(3, 2),
    findingIds: ['F-010'],
    sample: [
      row('IC-2026-10-0441', 'Recycling to steel', 'Mismatched', [
        f('Document', 'IC-2026-10-0441', 'IC-2026-10-0441'),
        f('Company pair', 'YD02 -> PL01', 'YD02 -> PL01'),
        f('Amount', '248 118.44 EUR', '248 118.37 EUR', false),
      ], 'Tax rounding'),
      row('IC-2026-10-0442', 'Recycling to service centre', 'Matched', [
        f('Document', 'IC-2026-10-0442', 'IC-2026-10-0442'),
        f('Amount', '96 440.00 EUR', '96 440.00 EUR'),
      ]),
    ],
    differenceGroups: [
      {
        id: 'RC-08-G1',
        cause: 'Tax rounding rule differs',
        count: 6,
        severity: 'Medium',
        aiExplanation: 'Six pairs differ between 0.03 and 0.07 EUR because of the per line against per document rounding rule.',
        recommendedFix: 'Align the rounding rule and add a per document tolerance to the close check.',
      },
    ],
  },
  {
    id: 'RC-09',
    name: 'Captured invoices against posted invoices',
    scope: 'Cross-system',
    sourceSystemId: 'SYS-ESKER',
    targetSystemId: 'SYS-SAP-STEEL',
    dataSourceIds: ['DS-ESK-INVOICE', 'DS-SAP-RBKP', 'DS-D365-VENDINV'],
    site: 'ALL',
    counts: { source: 470, target: 471, matched: 454, missing: 3, extra: 3 },
    totals: { label: 'Invoice value', source: 2_884_118.0, target: 2_893_598.0, delta: 9_480, unit: 'EUR' },
    matchPct: 96.6,
    lastRunAt: daysAgo(1, 3),
    findingIds: ['F-003', 'F-007', 'F-015'],
    sample: [
      row('SI-2026-118463', 'Recycling invoice', 'Duplicated', [
        f('Supplier invoice', 'SI-2026-118463', 'SI-2026-118463'),
        f('Posted documents', '1', '2', false, 'Retry without an idempotency key.'),
        f('Amount', '9 480.00 EUR', '18 960.00 EUR', false),
      ], 'Duplicate posting'),
      row('SI-2026-118447', 'Steel invoice without purchase order', 'Mismatched', [
        f('Supplier invoice', 'SI-2026-118447', 'SI-2026-118447'),
        f('Status', 'Posted expected', 'Parked', false, 'No purchase order reference on the captured document.'),
      ], 'Parked invoice'),
      row('SI-2026-118490', 'Steel invoice lost under load', 'Missing', [
        f('Supplier invoice', 'SI-2026-118490', 'not found', false),
        f('Queue', 'accepted', 'dropped at queue depth limit', false),
      ], 'Lost under load'),
    ],
    differenceGroups: [
      {
        id: 'RC-09-G1',
        cause: 'Duplicate postings from client retries',
        count: 3,
        severity: 'High',
        aiExplanation: 'Three invoices were posted twice after the capture platform retried a timed-out call.',
        recommendedFix: 'Add a uniqueness rule on vendor plus supplier invoice number and send an idempotency key.',
      },
      {
        id: 'RC-09-G2',
        cause: 'Invoices lost at month-end volume',
        count: 2,
        severity: 'High',
        aiExplanation: 'Two invoices were dropped when the queue reached its depth limit during the five times volume test.',
        recommendedFix: 'Add a dead letter queue with retry and raise the queue depth for the close window.',
      },
      {
        id: 'RC-09-G3',
        cause: 'Parked invoices without a purchase order reference',
        count: 1,
        severity: 'Medium',
        aiExplanation: 'One captured invoice has no purchase order reference and has been parked for seven days.',
        recommendedFix: 'Add a daily data check on parked invoices older than two days.',
      },
    ],
  },
]

export const RECON_SET_BY_ID = new Map(RECON_SETS.map((r) => [r.id, r]))
