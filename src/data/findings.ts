import type { Finding } from '@/lib/types'
import { daysAgo, minutesAgo } from '@/lib/clock'
import { rows } from './scenario-helpers'

/**
 * Deliberate defects in the mock landscape, so the tests have something to find.
 * Exactly two are open and Critical, which caps the release verdict at CONDITIONAL.
 */
export const FINDINGS: Finding[] = [
  {
    id: 'F-001',
    runId: 'RUN-1042',
    scenarioId: 'P1-POS-01',
    stepId: 'P1-POS-01-S07',
    severity: 'Critical',
    title: 'Three trucks: weighbridge net weight does not match the posted goods receipt',
    plain:
      'For three of six receipts today, the weight posted in the core ERP is not the weight measured on the weighbridge. One is a kilogram and tonne mix-up, one used the registered tare instead of the re-weighed tare, and one was posted twice.',
    cause: 'Unit conversion, tare handling and a missing duplicate check on the receipt interface.',
    aiExplanation:
      'VH-7741: the net weight 24 860 kg was treated as tonnes and then multiplied by 100, giving 2 486 kg. VH-8126: the target used the vehicle master tare of 15 180 kg instead of the re-weighed tare of 13 940 kg, so the receipt is 1 240 kg light. VH-9043: the message was delivered twice after a gateway retry and the interface has no idempotency key, so the same gate pass created two material documents and double the quantity.',
    recommendedFix:
      'Send the unit with every quantity and reject unknown units; always use the ticket tare, not the vehicle master tare; add an idempotency key on the gate pass number so a repeated message cannot post twice.',
    impact:
      '45 054 kg of receipts wrong in one day: 22 374 kg short on VH-7741, 1 240 kg short on VH-8126 and 21 440 kg counted twice on VH-9043. At the 304 scrap price that is roughly 33 000 EUR of stock value.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-YARD', 'SYS-SAP-STEEL'],
    interfaceIds: ['IF-01'],
    processId: 'P1',
    requirementIds: ['R2', 'R5', 'R8'],
    status: 'Open',
    detectedAt: minutesAgo(38),
    vehicles: ['VH-7741', 'VH-8126', 'VH-9043'],
    rows: rows(
      ['Vehicle', 'Gate pass', 'Weighbridge net', 'Posted quantity', 'Material docs', 'Difference', 'Cause'],
      [
        ['VH-7741', 'GP-PL01-2026-04821', '24 860 kg', '2 486 kg', '1', '22 374 kg', 'kg and t mix-up'],
        ['VH-8126', 'GP-PL01-2026-04822', '23 180 kg', '21 940 kg', '1', '1 240 kg', 'tare not re-weighed'],
        ['VH-9043', 'GP-PL01-2026-04825', '21 440 kg', '42 880 kg', '2', '-21 440 kg', 'duplicate message'],
      ],
      { failRows: [0, 1, 2] },
    ),
  },
  {
    id: 'F-002',
    runId: 'RUN-1040',
    scenarioId: 'P2-POS-01',
    stepId: 'P2-POS-01-S09',
    severity: 'Critical',
    title: 'Scrap stock posted with unit TON while the quantity is in kilograms',
    plain:
      'A scrap batch of 61 480 kg was posted into the recycling ERP with the unit TON. Stock is now a thousand times too high for that item.',
    cause: 'The stock interface does not validate the unit against the item base unit.',
    aiExplanation:
      'The scrap yard sends quantity and unit separately. The recycling ERP accepted the unit TON although the item base unit is KG, so 61 480 kg became 61 480 t. Two postings in the last 30 days are affected.',
    recommendedFix:
      'Reject any posting whose unit is not the item base unit, and add a plausibility check on stock per item and site.',
    impact:
      '61 480 kg posted as 61 480 t: stock overstated by 61 418 520 kg on one item, which distorts the inventory valuation of the whole recycling site.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-SCRAP', 'SYS-D365'],
    interfaceIds: ['IF-03'],
    processId: 'P2',
    requirementIds: ['R5', 'R8'],
    status: 'Triaged',
    defectRef: 'DEF-2026-0184',
    detectedAt: daysAgo(1, 2),
    rows: rows(
      ['Batch', 'Item', 'Quantity', 'Unit', 'Expected unit', 'Stock impact'],
      [
        ['SB-26-41180', 'SCR-316L-SOLID', '61 480', 'TON', 'KG', '61 480 000 kg'],
        ['SB-26-41140', 'SCR-304-BALE', '18 400', 'TON', 'KG', '18 400 000 kg'],
      ],
      { failRows: [0, 1] },
    ),
  },
  {
    id: 'F-003',
    runId: 'RUN-1041',
    scenarioId: 'P1-NEG-04',
    stepId: 'P1-NEG-04-S03',
    severity: 'High',
    title: 'Parked supplier invoice older than the five day rule',
    plain:
      'A supplier invoice captured without a purchase order reference has been parked for seven days. Parked invoices hold up the close.',
    cause: 'No follow-up on captured invoices that park because the purchase order reference is missing.',
    aiExplanation:
      'The invoice was captured without a purchase order reference, so it parked instead of posting. Nothing re-queues parked documents, so it stayed untouched for seven days and will be in the close backlog.',
    recommendedFix:
      'Add a daily data check on parked invoices older than two days and route them to the responsible key user.',
    impact:
      '7 740 EUR parked and a second invoice of 4 180 EUR already 7 days old: both sit in the close backlog until someone clears them by hand.',
    ownerRole: 'Key User',
    systemIds: ['SYS-ESKER', 'SYS-SAP-STEEL'],
    interfaceIds: ['IF-06'],
    processId: 'P1',
    requirementIds: ['R2', 'R5'],
    status: 'Open',
    detectedAt: daysAgo(1, 5),
    rows: rows(
      ['Invoice document', 'Vendor', 'Net amount', 'Document date', 'Age in days'],
      [['5105600770', 'VEND-1066', '4 180.00 EUR', '07 Oct 2026', '7']],
      { failRows: [0] },
    ),
  },
  {
    id: 'F-004',
    runId: 'RUN-1039',
    scenarioId: 'P4-POS-01',
    severity: 'Medium',
    title: 'Production confirmation arrived 32 minutes after the interface window',
    plain:
      'A coil confirmation reached the core ERP 47 minutes after it was created, against a 15 minute window. Stock and production figures were out of date in between.',
    cause: 'The confirmation file scheduler runs every 30 minutes instead of every 5.',
    aiExplanation:
      'The mill execution system writes confirmation files continuously, but the pick-up job runs every 30 minutes. Seven of 188 confirmations in the last day missed the 15 minute interface window.',
    recommendedFix: 'Run the pick-up job every five minutes, and alert when a file is older than ten minutes.',
    impact:
      '7 of 188 confirmations arrive late, so stock and production figures are wrong for up to 47 minutes at a time.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-MES', 'SYS-SAP-STEEL'],
    interfaceIds: ['IF-04'],
    processId: 'P4',
    requirementIds: ['R5', 'R6'],
    status: 'Open',
    detectedAt: daysAgo(1, 8),
    rows: rows(
      ['Coil', 'File', 'Age at arrival', 'Window'],
      [['CL-26-884201', 'CONF_20261014_0712.csv', '47 min', '15 min']],
      { failRows: [0] },
    ),
  },
  {
    id: 'F-005',
    runId: 'RUN-1042',
    severity: 'High',
    title: 'Receipt message sent but no goods receipt created',
    plain:
      'One receipt message left the yard with status sent, but no material document exists in the core ERP. The receipt is lost between the two systems.',
    cause: 'Message accepted by the gateway queue and never processed.',
    aiExplanation:
      'The message for gate pass GP-PL01-2026-04831 has outbound status sent, but there is no inbound record and no material document. The gateway queue shows the message as consumed, so it was dropped after being taken off the queue.',
    recommendedFix: 'Add a daily missing-message check per interface and alert on messages without an inbound record.',
    impact:
      '22 980 kg received at the gate and never posted: about 17 000 EUR of scrap is missing from stock.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-YARD', 'SYS-SAP-STEEL'],
    interfaceIds: ['IF-01'],
    processId: 'P1',
    requirementIds: ['R5'],
    status: 'Open',
    detectedAt: minutesAgo(52),
    vehicles: ['VH-7742'],
    rows: rows(
      ['Gate pass', 'Vehicle', 'Outbound status', 'Inbound record', 'Material document'],
      [['GP-PL01-2026-04831', 'VH-7742', 'sent', 'none', 'none']],
      { failRows: [0] },
    ),
  },
  {
    id: 'F-006',
    runId: 'RUN-1040',
    severity: 'Medium',
    title: 'Yard receipt never arrived in the scrap yard application',
    plain:
      'A gate receipt was accepted by the scrap yard queue but no batch was created, so the material is physically on site but invisible to the system.',
    cause: 'Queue consumer stopped without a retry.',
    aiExplanation:
      'The handover returned 202 accepted, which only means the queue took the message. The consumer stopped at 08:12 and nothing retried the message, so no batch was created for gate pass GP-YD02-2026-07719.',
    recommendedFix: 'Return 201 only after the batch exists, and add a retry with alerting on the consumer.',
    impact:
      'One wagon receipt on site and invisible to the system: the material cannot be sorted, sampled or invoiced.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-YARD', 'SYS-SCRAP'],
    interfaceIds: ['IF-02'],
    processId: 'P2',
    requirementIds: ['R5'],
    status: 'Open',
    detectedAt: minutesAgo(46),
    vehicles: ['VH-3380'],
  },
  {
    id: 'F-007',
    runId: 'RUN-1041',
    severity: 'High',
    title: 'Vendor invoice posted twice in the recycling ERP',
    plain: 'The same captured invoice was posted twice, so the supplier would be paid 18 960 EUR instead of 9 480 EUR.',
    cause: 'Client retry without an idempotency key.',
    aiExplanation:
      'The capture platform timed out waiting for the response and retried the call. The recycling ERP has no duplicate check on the supplier invoice number, so two invoice journals were created for SI-2026-118463.',
    recommendedFix:
      'Add a uniqueness rule on vendor plus supplier invoice number, and send an idempotency key from the capture platform.',
    impact:
      '9 480 EUR posted twice: 18 960 EUR would leave the bank unless somebody spots it.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-ESKER', 'SYS-D365'],
    interfaceIds: ['IF-07'],
    processId: 'P3',
    requirementIds: ['R5', 'R8'],
    status: 'Defect raised',
    defectRef: 'DEF-2026-0180',
    detectedAt: daysAgo(1, 3),
    rows: rows(
      ['Supplier invoice', 'Vendor', 'Journals', 'Amount posted', 'Expected'],
      [['SI-2026-118463', 'VEND-2214', '2', '18 960.00 EUR', '9 480.00 EUR']],
      { failRows: [0] },
    ),
  },
  {
    id: 'F-008',
    runId: 'RUN-1039',
    severity: 'Medium',
    title: 'Mill certificate not produced for grade 430',
    plain: 'A delivery of grade 430 material left without its mill certificate because no template exists for that grade.',
    cause: 'Missing document template for grade 430 at site PL01.',
    aiExplanation:
      'The output engine has certificate templates for 304 and 316L but not for 430. The print request stayed in the queue with no error raised back to the core ERP, so nobody noticed until the data check ran.',
    recommendedFix: 'Add the grade 430 template and fail the print request loudly when no template matches.',
    impact:
      'One delivery of grade 430 dispatched without its mill certificate: the customer can refuse the load.',
    ownerRole: 'Key User',
    systemIds: ['SYS-SAP-STEEL', 'SYS-LASERNET'],
    interfaceIds: ['IF-09'],
    processId: 'P4',
    requirementIds: ['R3', 'R5'],
    status: 'Open',
    detectedAt: daysAgo(1, 6),
  },
  {
    id: 'F-009',
    runId: 'RUN-1037',
    scenarioId: 'P6-POS-02',
    severity: 'Medium',
    title: 'Treasury acknowledgement arrived 62 minutes outside the window',
    plain:
      'The month-end payment file was acknowledged by treasury after 92 minutes against a 30 minute window, which delays the close by that time.',
    cause: 'Slow test treasury endpoint and no alert on the missing acknowledgement.',
    aiExplanation:
      'The payment file was delivered on time, but the treasury acknowledgement took 92 minutes. Nothing alerts when an acknowledgement is late, so the close team waits without knowing why.',
    recommendedFix: 'Alert when an acknowledgement is older than 30 minutes and show the status on the close dashboard.',
    impact:
      '62 minutes of the close spent waiting for a treasury acknowledgement nobody is alerted about.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-SAP-STEEL', 'SYS-REVAL'],
    interfaceIds: ['IF-11'],
    processId: 'P6',
    requirementIds: ['R5', 'R6'],
    status: 'Open',
    detectedAt: daysAgo(2, 4),
  },
  {
    id: 'F-010',
    runId: 'RUN-1036',
    scenarioId: 'P6-POS-01',
    severity: 'Medium',
    title: 'Intercompany rounding differences of 0.31 EUR in the period',
    plain:
      'Six intercompany documents differ by a few cents between the two ERPs, which leaves the group position unbalanced by 0.31 EUR.',
    cause: 'Different tax rounding rules in the two ERPs.',
    aiExplanation:
      'The recycling ERP rounds tax per line, the steel ERP rounds per document. On six documents this gives differences between 0.03 and 0.07 EUR, totalling 0.31 EUR for the period.',
    recommendedFix: 'Align the rounding rule to per document in both systems, and add a tolerance of 0.05 EUR per document to the check.',
    impact:
      '0.31 EUR unbalanced across six intercompany documents: small in money, but the group position does not tie out until it is explained.',
    ownerRole: 'Key User',
    systemIds: ['SYS-D365', 'SYS-SAP-STEEL'],
    interfaceIds: ['IF-13'],
    processId: 'P6',
    requirementIds: ['R8'],
    status: 'Triaged',
    detectedAt: daysAgo(3, 2),
  },
  {
    id: 'F-011',
    runId: 'RUN-1040',
    scenarioId: 'P2-POS-01',
    stepId: 'P2-POS-01-S06',
    severity: 'High',
    title: 'Molybdenum result lost between the laboratory app and the scrap batch',
    plain:
      'The laboratory measured 2.14 % molybdenum but the scrap batch stores 0.00 %, so the batch looks out of specification and the document prints the wrong chemistry.',
    cause: 'The laboratory app sends the molybdenum value as text, and the receiver discards values it cannot parse.',
    aiExplanation:
      'In the request the field mo_pct is a string "2.14" while ni_pct and cr_pct are numbers. The scrap yard application parses only numbers and writes 0.00 without raising an error, so the loss is silent.',
    recommendedFix:
      'Send all chemistry values as numbers, reject the message when a value cannot be parsed, and add a data check for stored zero against a measured value.',
    impact:
      'Molybdenum 2.14 % stored as 0.00 %: a 61 480 kg batch reads out of specification and the self-billing document shows the wrong chemistry.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-JAVA', 'SYS-SCRAP'],
    interfaceIds: ['IF-14'],
    processId: 'P2',
    requirementIds: ['R5', 'R8'],
    status: 'Open',
    detectedAt: daysAgo(1, 1),
    rows: rows(
      ['Sample', 'Batch', 'Laboratory Mo %', 'Stored Mo %', 'Grade window'],
      [['SMP-26-41180', 'SB-26-41180', '2.14', '0.00', '2.00 - 3.00']],
      { failRows: [0] },
    ),
  },
  {
    id: 'F-012',
    runId: 'RUN-1036',
    scenarioId: 'P6-POS-01',
    severity: 'High',
    title: 'Period backlog not empty: six unmatched goods receipt and invoice items',
    plain:
      'Four receipts have no invoice and two invoices have no receipt for the period. Each one has to be cleared manually before the books can close.',
    cause: 'Receipts and invoices that fail the three-way match are not re-queued.',
    aiExplanation:
      'All six items trace back to the receipt and invoice defects already found: the weight mismatches block the three-way match, and the parked invoice has no receipt reference. Clearing those defects removes the backlog.',
    recommendedFix: 'Fix the receipt interface defects and add a daily backlog check with an owner per item.',
    impact:
      'Six unmatched goods receipt and invoice items hold the close: about 7 hours of manual clearing per period.',
    ownerRole: 'Key User',
    systemIds: ['SYS-SAP-STEEL'],
    interfaceIds: ['IF-01', 'IF-06'],
    processId: 'P6',
    requirementIds: ['R6', 'R8'],
    status: 'Open',
    detectedAt: daysAgo(3, 1),
  },
  {
    id: 'F-013',
    runId: 'RUN-1035',
    severity: 'High',
    title: 'One user can create a vendor and pay it',
    plain:
      'Key User C can create a vendor in the core ERP and also release the payment run, which means one person could create and pay a supplier.',
    cause: 'Two roles assigned to the same user without a mitigating control.',
    aiExplanation:
      'The vendor master role and the payment run role are both assigned to this user at site PL01. The proof test created a vendor and then started a payment run successfully, so the conflict is real and not mitigated.',
    recommendedFix: 'Remove the payment run role, or add a second approval step on the payment proposal.',
    impact:
      'One person can create a supplier and pay it: there is no limit on what could be paid out.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-SAP-STEEL'],
    interfaceIds: [],
    processId: 'P3',
    requirementIds: ['R7'],
    status: 'Open',
    detectedAt: daysAgo(4, 3),
  },
  {
    id: 'F-014',
    runId: 'RUN-1035',
    severity: 'High',
    title: 'One user can change bank details and run the payment run',
    plain:
      'Key User F can change vendor bank details and also execute the payment run. The proof test shows the forbidden combination is allowed.',
    cause: 'Bank data role and payment execution role assigned to the same user.',
    aiExplanation:
      'The proof test changed a vendor bank account and then executed a payment run with the same user. Both actions succeeded, so a payment could be redirected without a second pair of eyes.',
    recommendedFix: 'Split the bank data role from the payment execution role and log all bank detail changes for review.',
    impact:
      'One person can change bank details and execute the payment run: a run of 1 884 220 EUR could be redirected.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-SAP-STEEL', 'SYS-D365'],
    interfaceIds: [],
    processId: 'P3',
    requirementIds: ['R7'],
    status: 'Open',
    detectedAt: daysAgo(4, 2),
  },
  {
    id: 'F-015',
    runId: 'RUN-1034',
    severity: 'High',
    title: 'Two supplier invoices lost at five times month-end volume',
    plain:
      'At five times normal volume the invoice interface backlog grew and two invoices never reached the core ERP. Nothing is lost at normal and double volume.',
    cause: 'Queue overflow with no dead letter handling on the invoice interface.',
    aiExplanation:
      'At 5x volume the invoice interface received 1 610 documents and posted 1 608. The queue reached its depth limit for four minutes and two messages were dropped without a dead letter entry, so nothing retried them.',
    recommendedFix: 'Add a dead letter queue with automatic retry, and raise the queue depth for the close window.',
    impact:
      '2 of 1 610 invoices lost at five times volume, roughly 24 000 EUR not posted, exactly when the close needs them.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-ESKER', 'SYS-SAP-STEEL'],
    interfaceIds: ['IF-06'],
    processId: 'P3',
    requirementIds: ['R6', 'R5'],
    status: 'Open',
    detectedAt: daysAgo(5, 6),
    rows: rows(
      ['Interface', 'Sent in', 'Received out', 'Duplicated', 'Lost'],
      [['Esker -> SAP Steel: supplier invoices', '1 610', '1 608', '0', '2']],
      { failRows: [0] },
    ),
  },
  {
    id: 'F-016',
    runId: 'RUN-1033',
    severity: 'High',
    title: 'Nine migrated vendor bank details truncated',
    plain:
      'Nine vendors came out of the migration with a shortened bank account number, so payments to those vendors would fail or go to the wrong account.',
    cause: 'Target field is shorter than the source field.',
    aiExplanation:
      'The source bank account field holds up to 34 characters, the migrated target field 24. Nine vendors with long account numbers were cut off, and no migration check compared field lengths.',
    recommendedFix: 'Widen the target field, re-migrate the nine vendors and add a field length check to the migration test set.',
    impact:
      '9 vendors with a truncated bank account: their payments fail or go to the wrong account.',
    ownerRole: 'IT Admin',
    systemIds: ['SYS-D365', 'SYS-SAP-STEEL'],
    interfaceIds: [],
    processId: 'P3',
    requirementIds: ['R8'],
    status: 'Triaged',
    defectRef: 'DEF-2026-0176',
    detectedAt: daysAgo(6, 4),
    rows: rows(
      ['Vendor', 'Source bank account', 'Migrated bank account', 'Result'],
      [
        ['VEND-2208', 'NL91 ABNA 0417 1643 0012 0098 11', 'NL91 ABNA 0417 1643 00', 'truncated'],
        ['VEND-2214', 'DE89 3704 0044 0532 0130 0045 22', 'DE89 3704 0044 0532 01', 'truncated'],
      ],
      { failRows: [0, 1] },
    ),
  },
]

export const FINDING_BY_ID = new Map(FINDINGS.map((f) => [f.id, f]))

export const OPEN_FINDING_STATUSES = ['Open', 'Triaged'] as const
