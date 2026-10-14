import type { TestDataEntity, TestDataRecord, TestDataSet } from '@/lib/types'
import { daysAgo } from '@/lib/clock'
import { seededInt } from '@/lib/utils'

/* --------------------------------------------------------------- entities */

export const TEST_DATA_ENTITIES: TestDataEntity[] = [
  {
    key: 'vendor',
    label: 'Vendor (scrap supplier)',
    description: 'Scrap supplier with address, payment terms and bank details.',
    systemIds: ['SYS-SAP-STEEL', 'SYS-D365'],
    dataType: 'Master data',
    processIds: ['P1', 'P3'],
    linkedEntities: ['material'],
    fields: [
      { name: 'vendorId', label: 'Vendor', kind: 'id', sample: 'VEND-1042' },
      { name: 'name', label: 'Name', kind: 'text', sample: 'Scrap Supplier Alpha' },
      { name: 'country', label: 'Country', kind: 'enum', sample: 'NL' },
      { name: 'paymentTerms', label: 'Payment terms', kind: 'enum', sample: '30 days net' },
      { name: 'bankAccount', label: 'Bank account', kind: 'text', sample: 'NL91 ABNA 0417 1643 00' },
      { name: 'site', label: 'Site', kind: 'enum', sample: 'PL01' },
    ],
  },
  {
    key: 'customer',
    label: 'Customer',
    description: 'Service centre customer with credit limit and delivery terms.',
    systemIds: ['SYS-SAP-SC'],
    dataType: 'Master data',
    processIds: ['P5'],
    linkedEntities: ['material'],
    fields: [
      { name: 'customerId', label: 'Customer', kind: 'id', sample: 'CUST-2210' },
      { name: 'name', label: 'Name', kind: 'text', sample: 'Service Centre Buyer Nord' },
      { name: 'creditLimit', label: 'Credit limit', kind: 'number', sample: '250000' },
      { name: 'incoterms', label: 'Delivery terms', kind: 'enum', sample: 'DAP' },
      { name: 'site', label: 'Site', kind: 'enum', sample: 'PL03' },
    ],
  },
  {
    key: 'material',
    label: 'Material',
    description: 'Scrap grade or coil material with base unit and alternative units.',
    systemIds: ['SYS-SAP-STEEL', 'SYS-D365', 'SYS-MES'],
    dataType: 'Master data',
    processIds: ['P1', 'P2', 'P4', 'P5'],
    linkedEntities: [],
    fields: [
      { name: 'materialId', label: 'Material', kind: 'id', sample: 'MAT-SCR-304-BALE' },
      { name: 'description', label: 'Description', kind: 'text', sample: 'Stainless scrap 304 baled' },
      { name: 'baseUnit', label: 'Base unit', kind: 'enum', sample: 'KG' },
      { name: 'grade', label: 'Grade', kind: 'enum', sample: '304' },
    ],
  },
  {
    key: 'scrapGrade',
    label: 'Scrap grade',
    description: 'Scrap grade with its chemistry specification window.',
    systemIds: ['SYS-SCRAP', 'SYS-D365'],
    dataType: 'Master data',
    processIds: ['P2'],
    linkedEntities: ['material'],
    fields: [
      { name: 'gradeCode', label: 'Grade', kind: 'id', sample: 'SCR-316L-SOLID' },
      { name: 'niRange', label: 'Ni window', kind: 'text', sample: '10.0 - 14.0 %' },
      { name: 'crRange', label: 'Cr window', kind: 'text', sample: '16.0 - 18.5 %' },
      { name: 'moRange', label: 'Mo window', kind: 'text', sample: '2.0 - 3.0 %' },
    ],
  },
  {
    key: 'role',
    label: 'Role and user',
    description: 'Test user with role assignments, used for access and SoD testing.',
    systemIds: ['SYS-SAP-STEEL', 'SYS-D365', 'SYS-YARD'],
    dataType: 'Access data',
    processIds: ['P3', 'P6'],
    linkedEntities: [],
    fields: [
      { name: 'userId', label: 'User', kind: 'id', sample: 'TU-0007' },
      { name: 'label', label: 'Role label', kind: 'text', sample: 'Key User A' },
      { name: 'roles', label: 'Roles', kind: 'text', sample: 'Z_GR_CLERK, Z_INV_VIEW' },
      { name: 'site', label: 'Site', kind: 'enum', sample: 'PL01' },
    ],
  },
  {
    key: 'purchaseOrder',
    label: 'Purchase order',
    description: 'Purchase order linked to a vendor and a material, with an open quantity.',
    systemIds: ['SYS-SAP-STEEL', 'SYS-D365'],
    dataType: 'Transactions',
    processIds: ['P1', 'P3'],
    linkedEntities: ['vendor', 'material'],
    fields: [
      { name: 'poNumber', label: 'Purchase order', kind: 'id', sample: '4500018823' },
      { name: 'vendorId', label: 'Vendor', kind: 'link', linkEntity: 'vendor', sample: 'VEND-1042' },
      { name: 'materialId', label: 'Material', kind: 'link', linkEntity: 'material', sample: 'MAT-SCR-304-BALE' },
      { name: 'quantityKg', label: 'Quantity', kind: 'number', sample: '40000' },
      { name: 'price', label: 'Unit price', kind: 'number', sample: '0.74' },
    ],
  },
  {
    key: 'weighbridgeTicket',
    label: 'Weighbridge ticket',
    description: 'Gate pass with gross, tare and net weight for a vehicle, wagon or container.',
    systemIds: ['SYS-YARD'],
    dataType: 'Measurements',
    processIds: ['P1', 'P2'],
    linkedEntities: ['purchaseOrder', 'material'],
    fields: [
      { name: 'ticketNo', label: 'Ticket', kind: 'id', sample: 'WB-2610442' },
      { name: 'gatePassNo', label: 'Gate pass', kind: 'text', sample: 'GP-PL01-2026-04821' },
      { name: 'vehicleNo', label: 'Vehicle', kind: 'text', sample: 'VH-7741' },
      { name: 'grossKg', label: 'Gross', kind: 'number', sample: '38420' },
      { name: 'tareKg', label: 'Tare', kind: 'number', sample: '13560' },
      { name: 'netKg', label: 'Net', kind: 'number', sample: '24860' },
    ],
  },
  {
    key: 'goodsReceipt',
    label: 'Goods receipt',
    description: 'Material document posted against a purchase order.',
    systemIds: ['SYS-SAP-STEEL'],
    dataType: 'Transactions',
    processIds: ['P1', 'P3'],
    linkedEntities: ['purchaseOrder', 'weighbridgeTicket'],
    fields: [
      { name: 'materialDocument', label: 'Material document', kind: 'id', sample: '5000041122' },
      { name: 'poNumber', label: 'Purchase order', kind: 'link', linkEntity: 'purchaseOrder', sample: '4500018823' },
      { name: 'quantityKg', label: 'Quantity', kind: 'number', sample: '24860' },
      { name: 'movementType', label: 'Movement type', kind: 'enum', sample: '101' },
    ],
  },
  {
    key: 'supplierInvoice',
    label: 'Supplier invoice',
    description: 'Captured supplier invoice with purchase order reference and amounts.',
    systemIds: ['SYS-ESKER', 'SYS-SAP-STEEL', 'SYS-D365'],
    dataType: 'Documents',
    processIds: ['P1', 'P3'],
    linkedEntities: ['vendor', 'purchaseOrder'],
    fields: [
      { name: 'invoiceNo', label: 'Supplier invoice', kind: 'id', sample: 'SI-2026-118442' },
      { name: 'vendorId', label: 'Vendor', kind: 'link', linkEntity: 'vendor', sample: 'VEND-1042' },
      { name: 'poNumber', label: 'Purchase order', kind: 'link', linkEntity: 'purchaseOrder', sample: '4500018823' },
      { name: 'netAmount', label: 'Net amount', kind: 'number', sample: '18402.50' },
    ],
  },
  {
    key: 'productionOrder',
    label: 'Production order',
    description: 'Production order with heat and coil references.',
    systemIds: ['SYS-SAP-STEEL', 'SYS-MES'],
    dataType: 'Transactions',
    processIds: ['P4'],
    linkedEntities: ['heat', 'coil', 'material'],
    fields: [
      { name: 'orderNo', label: 'Production order', kind: 'id', sample: '1000045621' },
      { name: 'materialId', label: 'Material', kind: 'link', linkEntity: 'material', sample: 'MAT-COIL-316L-2.0' },
      { name: 'quantityKg', label: 'Quantity', kind: 'number', sample: '36600' },
    ],
  },
  {
    key: 'delivery',
    label: 'Delivery',
    description: 'Outbound delivery with items and net weight.',
    systemIds: ['SYS-SAP-STEEL', 'SYS-SAP-SC'],
    dataType: 'Transactions',
    processIds: ['P4', 'P5'],
    linkedEntities: ['customer', 'coil'],
    fields: [
      { name: 'deliveryNo', label: 'Delivery', kind: 'id', sample: '80001244' },
      { name: 'customerId', label: 'Customer', kind: 'link', linkEntity: 'customer', sample: 'CUST-2210' },
      { name: 'netWeightKg', label: 'Net weight', kind: 'number', sample: '36600' },
    ],
  },
  {
    key: 'heat',
    label: 'Heat',
    description: 'Heat with melt chemistry and charge weight.',
    systemIds: ['SYS-MES'],
    dataType: 'Measurements',
    processIds: ['P4'],
    linkedEntities: ['material'],
    fields: [
      { name: 'heatNo', label: 'Heat', kind: 'id', sample: 'HT-26-10412' },
      { name: 'grade', label: 'Grade', kind: 'enum', sample: '316L' },
      { name: 'chargeKg', label: 'Charge weight', kind: 'number', sample: '62400' },
      { name: 'niPct', label: 'Ni %', kind: 'number', sample: '10.4' },
      { name: 'crPct', label: 'Cr %', kind: 'number', sample: '17.2' },
      { name: 'moPct', label: 'Mo %', kind: 'number', sample: '2.3' },
    ],
  },
  {
    key: 'coil',
    label: 'Coil',
    description: 'Coil linked to its heat, with weight and thickness.',
    systemIds: ['SYS-MES', 'SYS-SAP-STEEL'],
    dataType: 'Transactions',
    processIds: ['P4', 'P5'],
    linkedEntities: ['heat'],
    fields: [
      { name: 'coilNo', label: 'Coil', kind: 'id', sample: 'CL-26-884201' },
      { name: 'heatNo', label: 'Heat', kind: 'link', linkEntity: 'heat', sample: 'HT-26-10412' },
      { name: 'weightKg', label: 'Weight', kind: 'number', sample: '18420' },
      { name: 'thicknessMm', label: 'Thickness', kind: 'number', sample: '2.0' },
    ],
  },
  {
    key: 'scrapBatch',
    label: 'Scrap batch with chemistry',
    description: 'Sorted scrap batch with its grade, weight and chemistry sample.',
    systemIds: ['SYS-SCRAP', 'SYS-JAVA', 'SYS-D365'],
    dataType: 'Measurements',
    processIds: ['P2'],
    linkedEntities: ['scrapGrade', 'weighbridgeTicket'],
    fields: [
      { name: 'batchNo', label: 'Batch', kind: 'id', sample: 'SB-26-41180' },
      { name: 'gradeCode', label: 'Grade', kind: 'link', linkEntity: 'scrapGrade', sample: 'SCR-316L-SOLID' },
      { name: 'sortedKg', label: 'Sorted weight', kind: 'number', sample: '61480' },
      { name: 'sampleNo', label: 'Sample', kind: 'text', sample: 'SMP-26-41180' },
      { name: 'niPct', label: 'Ni %', kind: 'number', sample: '8.12' },
      { name: 'crPct', label: 'Cr %', kind: 'number', sample: '18.30' },
      { name: 'moPct', label: 'Mo %', kind: 'number', sample: '2.14' },
    ],
  },
]

export const TEST_DATA_ENTITY_BY_KEY = new Map(TEST_DATA_ENTITIES.map((e) => [e.key, e]))

/* ------------------------------------------------- deterministic generator */

const VENDOR_NAMES = [
  'Scrap Supplier Alpha',
  'Scrap Supplier Beta',
  'Scrap Supplier Gamma',
  'Metal Trader North',
  'Metal Trader South',
  'Recycling Partner East',
  'Recycling Partner West',
]
const CUSTOMER_NAMES = [
  'Service Centre Buyer Nord',
  'Service Centre Buyer Sud',
  'Processing Partner One',
  'Processing Partner Two',
  'Coil Distributor Central',
]
const GRADES = ['SCR-304-BALE', 'SCR-316L-SOLID', 'SCR-430-TURN']
const COIL_GRADES = ['MAT-COIL-304-1.5', 'MAT-COIL-316L-2.0', 'MAT-COIL-430-2.5']
const SITES = ['PL01', 'PL03', 'YD02', 'YD05'] as const

/**
 * Generates realistic linked records. Deterministic: the same entity, count and
 * seed always produce the same rows, so the demo never changes under your feet.
 */
export function generateRecords(entityKey: string, count: number, seed: string): TestDataRecord[] {
  const records: TestDataRecord[] = []
  for (let i = 0; i < count; i++) {
    const s = `${seed}-${entityKey}-${i}`
    const id = `${entityKey.toUpperCase().slice(0, 3)}-${1000 + i}`
    switch (entityKey) {
      case 'vendor': {
        const number = 1040 + seededInt(s, 1, 400)
        records.push({
          id: `VEND-${number}`,
          entityKey,
          values: {
            vendorId: `VEND-${number}`,
            name: VENDOR_NAMES[seededInt(s + 'n', 0, VENDOR_NAMES.length - 1)],
            country: ['NL', 'DE', 'BE', 'FR'][seededInt(s + 'c', 0, 3)],
            paymentTerms: ['30 days net', '45 days net', '14 days 2 % discount'][seededInt(s + 'p', 0, 2)],
            bankAccount: `NL${seededInt(s + 'b', 10, 99)} ABNA 0${seededInt(s + 'b2', 100, 999)} ${seededInt(s + 'b3', 1000, 9999)} ${seededInt(s + 'b4', 10, 99)}`,
            site: SITES[seededInt(s + 's', 0, 3)],
          },
          links: [],
        })
        break
      }
      case 'customer': {
        const number = 2200 + seededInt(s, 1, 90)
        records.push({
          id: `CUST-${number}`,
          entityKey,
          values: {
            customerId: `CUST-${number}`,
            name: CUSTOMER_NAMES[seededInt(s + 'n', 0, CUSTOMER_NAMES.length - 1)],
            creditLimit: String(seededInt(s + 'cl', 5, 50) * 10000),
            incoterms: ['DAP', 'FCA', 'EXW'][seededInt(s + 'i', 0, 2)],
            site: 'PL03',
          },
          links: [],
        })
        break
      }
      case 'material': {
        const grade = [...GRADES, ...COIL_GRADES][seededInt(s, 0, 5)]
        records.push({
          id: grade.startsWith('SCR') ? `MAT-${grade}` : grade,
          entityKey,
          values: {
            materialId: grade.startsWith('SCR') ? `MAT-${grade}` : grade,
            description: grade.startsWith('SCR') ? 'Stainless scrap' : 'Stainless coil',
            baseUnit: 'KG',
            grade: grade.includes('304') ? '304' : grade.includes('316L') ? '316L' : '430',
          },
          links: [],
        })
        break
      }
      case 'scrapGrade': {
        const grade = GRADES[seededInt(s, 0, 2)]
        records.push({
          id: grade,
          entityKey,
          values: {
            gradeCode: grade,
            niRange: grade.includes('430') ? '0.0 - 0.75 %' : grade.includes('316L') ? '10.0 - 14.0 %' : '8.0 - 10.5 %',
            crRange: grade.includes('430') ? '16.0 - 18.0 %' : '16.0 - 18.5 %',
            moRange: grade.includes('316L') ? '2.0 - 3.0 %' : '0.0 - 0.6 %',
          },
          links: [],
        })
        break
      }
      case 'role': {
        const label = `Key User ${String.fromCharCode(65 + (i % 7))}`
        records.push({
          id: `TU-${String(i + 1).padStart(4, '0')}`,
          entityKey,
          values: {
            userId: `TU-${String(i + 1).padStart(4, '0')}`,
            label,
            roles: ['Z_GR_CLERK', 'Z_INV_CLERK', 'Z_VENDOR_MASTER', 'Z_PAYMENT_RUN'][seededInt(s, 0, 3)],
            site: SITES[seededInt(s + 's', 0, 3)],
          },
          links: [],
        })
        break
      }
      case 'purchaseOrder': {
        const vendor = `VEND-${1040 + seededInt(s + 'v', 1, 60)}`
        const material = `MAT-${GRADES[seededInt(s + 'm', 0, 2)]}`
        const quantity = seededInt(s + 'q', 18, 42) * 1000
        records.push({
          id: `45000${18800 + i}`,
          entityKey,
          values: {
            poNumber: `45000${18800 + i}`,
            vendorId: vendor,
            materialId: material,
            quantityKg: String(quantity),
            price: (0.6 + seededInt(s + 'p', 0, 30) / 100).toFixed(2),
          },
          links: [
            { entityKey: 'vendor', id: vendor, label: vendor },
            { entityKey: 'material', id: material, label: material },
          ],
        })
        break
      }
      case 'weighbridgeTicket': {
        const gross = seededInt(s + 'g', 30, 44) * 1000 + seededInt(s + 'g2', 0, 999)
        const tare = seededInt(s + 't', 11, 15) * 1000 + seededInt(s + 't2', 0, 999)
        const site = SITES[seededInt(s + 's', 0, 3)]
        records.push({
          id: `WB-26${10400 + i}`,
          entityKey,
          values: {
            ticketNo: `WB-26${10400 + i}`,
            gatePassNo: `GP-${site}-2026-${String(4800 + i).padStart(5, '0')}`,
            vehicleNo: `VH-${seededInt(s + 'v', 3000, 9900)}`,
            grossKg: String(gross),
            tareKg: String(tare),
            netKg: String(gross - tare),
          },
          links: [],
        })
        break
      }
      case 'goodsReceipt': {
        const po = `45000${18800 + (i % 10)}`
        const quantity = seededInt(s + 'q', 18, 30) * 1000
        records.push({
          id: `50000${41200 + i}`,
          entityKey,
          values: {
            materialDocument: `50000${41200 + i}`,
            poNumber: po,
            quantityKg: String(quantity),
            movementType: '101',
          },
          links: [{ entityKey: 'purchaseOrder', id: po, label: po }],
        })
        break
      }
      case 'supplierInvoice': {
        const vendor = `VEND-${1040 + seededInt(s + 'v', 1, 60)}`
        const po = `45000${18800 + (i % 10)}`
        records.push({
          id: `SI-2026-${118500 + i}`,
          entityKey,
          values: {
            invoiceNo: `SI-2026-${118500 + i}`,
            vendorId: vendor,
            poNumber: po,
            netAmount: (seededInt(s + 'a', 4000, 32000) + 0.5).toFixed(2),
          },
          links: [
            { entityKey: 'vendor', id: vendor, label: vendor },
            { entityKey: 'purchaseOrder', id: po, label: po },
          ],
        })
        break
      }
      case 'productionOrder': {
        const material = COIL_GRADES[seededInt(s + 'm', 0, 2)]
        records.push({
          id: `10000${45700 + i}`,
          entityKey,
          values: {
            orderNo: `10000${45700 + i}`,
            materialId: material,
            quantityKg: String(seededInt(s + 'q', 16, 38) * 1000),
          },
          links: [{ entityKey: 'material', id: material, label: material }],
        })
        break
      }
      case 'delivery': {
        const customer = `CUST-${2200 + seededInt(s + 'c', 1, 90)}`
        records.push({
          id: `800${14400 + i}`,
          entityKey,
          values: {
            deliveryNo: `800${14400 + i}`,
            customerId: customer,
            netWeightKg: String(seededInt(s + 'w', 8, 36) * 1000),
          },
          links: [{ entityKey: 'customer', id: customer, label: customer }],
        })
        break
      }
      case 'heat': {
        const grade = ['304', '316L', '430'][seededInt(s + 'g', 0, 2)]
        records.push({
          id: `HT-26-${10500 + i}`,
          entityKey,
          values: {
            heatNo: `HT-26-${10500 + i}`,
            grade,
            chargeKg: String(seededInt(s + 'c', 58, 66) * 1000),
            niPct: grade === '430' ? (0.2 + seededInt(s + 'n', 0, 40) / 100).toFixed(2) : (8 + seededInt(s + 'n', 0, 500) / 100).toFixed(2),
            crPct: (16 + seededInt(s + 'cr', 0, 250) / 100).toFixed(2),
            moPct: grade === '316L' ? (2 + seededInt(s + 'mo', 0, 90) / 100).toFixed(2) : (seededInt(s + 'mo', 0, 50) / 100).toFixed(2),
          },
          links: [],
        })
        break
      }
      case 'coil': {
        const heat = `HT-26-${10500 + (i % 6)}`
        records.push({
          id: `CL-26-${884300 + i}`,
          entityKey,
          values: {
            coilNo: `CL-26-${884300 + i}`,
            heatNo: heat,
            weightKg: String(seededInt(s + 'w', 160, 196) * 100),
            thicknessMm: ['1.5', '2.0', '2.5'][seededInt(s + 't', 0, 2)],
          },
          links: [{ entityKey: 'heat', id: heat, label: heat }],
        })
        break
      }
      case 'scrapBatch': {
        const grade = GRADES[seededInt(s + 'g', 0, 2)]
        const site = ['YD02', 'YD05'][seededInt(s + 's', 0, 1)]
        records.push({
          id: `SB-26-${41300 + i}`,
          entityKey,
          values: {
            batchNo: `SB-26-${41300 + i}`,
            gradeCode: grade,
            sortedKg: String(seededInt(s + 'w', 18, 64) * 1000 + seededInt(s + 'w2', 0, 900)),
            sampleNo: `SMP-26-${41300 + i}`,
            niPct: grade.includes('430') ? (0.2 + seededInt(s + 'n', 0, 40) / 100).toFixed(2) : (8 + seededInt(s + 'n', 0, 450) / 100).toFixed(2),
            crPct: (16 + seededInt(s + 'c', 0, 250) / 100).toFixed(2),
            moPct: grade.includes('316L') ? (2 + seededInt(s + 'm', 0, 90) / 100).toFixed(2) : (seededInt(s + 'm', 0, 50) / 100).toFixed(2),
            site,
          },
          links: [{ entityKey: 'scrapGrade', id: grade, label: grade }],
        })
        break
      }
      default: {
        records.push({ id, entityKey, values: { id }, links: [] })
      }
    }
  }
  return records
}

/* ------------------------------------------------------------------- sets */

function set(
  id: string,
  name: string,
  entityKey: string,
  processId: TestDataSet['processId'],
  site: TestDataSet['site'],
  count: number,
  loaded: boolean,
  loadedTo: string[],
  daysOld: number,
): TestDataSet {
  return {
    id,
    name,
    entityKey,
    processId,
    site,
    count,
    generatedAt: daysAgo(daysOld),
    generatedBy: 'AI',
    loaded,
    loadedTo,
    records: generateRecords(entityKey, count, id),
    containsPersonalData: false,
  }
}

export const TEST_DATA_SETS: TestDataSet[] = [
  set('TDS-P1-RECEIPT', 'P1 gate to invoice receipt set', 'purchaseOrder', 'P1', 'PL01', 12, true, ['SYS-SAP-STEEL', 'SYS-YARD'], 18),
  set('TDS-P1-TICKETS', 'P1 weighbridge tickets', 'weighbridgeTicket', 'P1', 'PL01', 10, true, ['SYS-YARD'], 17),
  set('TDS-P2-BATCH', 'P2 scrap batches with chemistry', 'scrapBatch', 'P2', 'YD02', 14, true, ['SYS-SCRAP', 'SYS-JAVA', 'SYS-D365'], 17),
  set('TDS-P3-VENDOR', 'P3 vendors with bank details', 'vendor', 'P3', 'ALL', 10, true, ['SYS-SAP-STEEL', 'SYS-D365'], 12),
  set('TDS-P4-COIL', 'P4 heats and coils', 'coil', 'P4', 'PL01', 9, true, ['SYS-MES', 'SYS-SAP-STEEL'], 12),
  set('TDS-P5-CUSTOMER', 'P5 customers with credit limits', 'customer', 'P5', 'PL03', 8, true, ['SYS-SAP-SC'], 12),
  set('TDS-P6-CLOSE', 'P6 close test postings', 'supplierInvoice', 'P6', 'ALL', 16, false, [], 10),
]

export const TEST_DATA_SET_BY_ID = new Map(TEST_DATA_SETS.map((s) => [s.id, s]))

export const DATA_CHECK_DEFINITIONS = [
  {
    kind: 'completeness' as const,
    label: 'Completeness',
    plain: 'Every record that should exist does exist, and mandatory fields are filled.',
  },
  {
    kind: 'duplicates' as const,
    label: 'Duplicates',
    plain: 'No business key appears twice.',
  },
  {
    kind: 'valid-ranges' as const,
    label: 'Valid ranges',
    plain: 'Numbers and units stay inside a plausible range, for example weights and chemistry.',
  },
  {
    kind: 'cross-system-match' as const,
    label: 'Cross-system match',
    plain: 'The same record matches field by field in the target system.',
  },
  {
    kind: 'freshness' as const,
    label: 'Freshness',
    plain: 'The data was updated recently enough for the process to rely on it.',
  },
]
