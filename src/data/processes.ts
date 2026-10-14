import type { BusinessProcess } from '@/lib/types'

export const PROCESSES: BusinessProcess[] = [
  {
    id: 'P1',
    name: 'Gate to Invoice (steel)',
    stream: 'Steel',
    summary:
      'Truck arrives at the gate, is weighed, the receipt becomes a goods receipt in the core ERP, the supplier invoice is captured and posted, and the document is produced.',
    systemIds: ['SYS-YARD', 'SYS-SAP-STEEL', 'SYS-ESKER', 'SYS-LASERNET'],
    interfaceIds: ['IF-01', 'IF-06', 'IF-09'],
    closeCritical: true,
    sites: ['PL01', 'PL03'],
    manualHoursPerMonth: 86,
    depth: 'Full',
    stages: [
      {
        key: 'gate',
        label: 'Gate and weighbridge',
        systemId: 'SYS-YARD',
        description: 'Gate pass created, gross and tare weighed, net weight calculated.',
      },
      {
        key: 'receipt',
        label: 'Goods receipt',
        systemId: 'SYS-SAP-STEEL',
        description: 'Receipt message creates the material document against the purchase order.',
      },
      {
        key: 'invoice-capture',
        label: 'Invoice capture',
        systemId: 'SYS-ESKER',
        description: 'Supplier invoice is captured with its purchase order reference.',
      },
      {
        key: 'invoice-post',
        label: 'Invoice posting',
        systemId: 'SYS-SAP-STEEL',
        description: 'Three-way match of purchase order, goods receipt and invoice, then posting.',
      },
      {
        key: 'document',
        label: 'Document output',
        systemId: 'SYS-LASERNET',
        description: 'Invoice copy and delivery documents are produced as PDF.',
      },
    ],
  },
  {
    id: 'P2',
    name: 'Scrap to Stock (recycling)',
    stream: 'Recycling',
    summary:
      'Wagon, truck or container receipt is sorted by grade, chemistry is sampled and entered in the lab app, and the batch becomes stock in the recycling ERP.',
    systemIds: ['SYS-YARD', 'SYS-SCRAP', 'SYS-JAVA', 'SYS-D365', 'SYS-LASERNET'],
    interfaceIds: ['IF-02', 'IF-14', 'IF-03', 'IF-10'],
    closeCritical: true,
    sites: ['YD02', 'YD05'],
    manualHoursPerMonth: 74,
    depth: 'Full',
    stages: [
      {
        key: 'receipt',
        label: 'Gate receipt',
        systemId: 'SYS-YARD',
        description: 'Wagon, truck or container weighed and handed to the scrap yard.',
      },
      {
        key: 'sortation',
        label: 'Sortation',
        systemId: 'SYS-SCRAP',
        description: 'Material is sorted into grade batches with weights per batch.',
      },
      {
        key: 'chemistry',
        label: 'Chemistry check',
        systemId: 'SYS-JAVA',
        description: 'Laboratory enters Ni, Cr and Mo results against the sample.',
      },
      {
        key: 'stock',
        label: 'Stock posting',
        systemId: 'SYS-D365',
        description: 'Batch becomes stock and a purchase line in the recycling ERP.',
      },
      {
        key: 'document',
        label: 'Document output',
        systemId: 'SYS-LASERNET',
        description: 'Weighbridge note and self-billing document are produced.',
      },
    ],
  },
  {
    id: 'P3',
    name: 'Procure to Pay',
    stream: 'Finance',
    summary:
      'Purchase order, goods receipt, supplier invoice, payment proposal and treasury execution across both ERPs.',
    systemIds: ['SYS-SAP-STEEL', 'SYS-D365', 'SYS-ESKER', 'SYS-REVAL'],
    interfaceIds: ['IF-06', 'IF-07', 'IF-11', 'IF-12'],
    closeCritical: true,
    sites: ['PL01', 'PL03', 'YD02', 'YD05'],
    manualHoursPerMonth: 58,
    depth: 'Light',
    stages: [
      { key: 'po', label: 'Purchase order', systemId: 'SYS-SAP-STEEL', description: 'Purchase order created and released.' },
      { key: 'gr', label: 'Goods receipt', systemId: 'SYS-SAP-STEEL', description: 'Goods receipt posted against the order.' },
      { key: 'invoice', label: 'Invoice', systemId: 'SYS-ESKER', description: 'Supplier invoice captured and posted.' },
      { key: 'payment', label: 'Payment run', systemId: 'SYS-SAP-STEEL', description: 'Payment proposal created and approved.' },
      { key: 'treasury', label: 'Treasury', systemId: 'SYS-REVAL', description: 'Payment file handed to treasury and acknowledged.' },
    ],
  },
  {
    id: 'P4',
    name: 'Produce to Dispatch',
    stream: 'Steel',
    summary:
      'Heat and coil production is confirmed in the core ERP, the delivery is created and the mill certificate is produced.',
    systemIds: ['SYS-MES', 'SYS-SAP-STEEL', 'SYS-JAVA', 'SYS-LASERNET'],
    interfaceIds: ['IF-04', 'IF-05', 'IF-09'],
    closeCritical: false,
    sites: ['PL01', 'PL03'],
    manualHoursPerMonth: 44,
    depth: 'Light',
    stages: [
      { key: 'heat', label: 'Heat and coil', systemId: 'SYS-MES', description: 'Heat is cast and coils are produced with genealogy.' },
      { key: 'confirm', label: 'Production confirmation', systemId: 'SYS-SAP-STEEL', description: 'Production order is confirmed and stock posted.' },
      { key: 'delivery', label: 'Delivery', systemId: 'SYS-SAP-STEEL', description: 'Delivery is created and picked for dispatch.' },
      { key: 'certificate', label: 'Certificate', systemId: 'SYS-LASERNET', description: 'Mill certificate is produced with heat chemistry.' },
    ],
  },
  {
    id: 'P5',
    name: 'Order to Cash',
    stream: 'Steel',
    summary:
      'Customer order is captured, becomes a sales order, is delivered and billed, and the invoice document is produced.',
    systemIds: ['SYS-ESKER', 'SYS-SAP-SC', 'SYS-LASERNET'],
    interfaceIds: ['IF-08', 'IF-09'],
    closeCritical: true,
    sites: ['PL03'],
    manualHoursPerMonth: 52,
    depth: 'Light',
    stages: [
      { key: 'capture', label: 'Order capture', systemId: 'SYS-ESKER', description: 'Customer order document is captured.' },
      { key: 'sales-order', label: 'Sales order', systemId: 'SYS-SAP-SC', description: 'Sales order is created and confirmed.' },
      { key: 'delivery', label: 'Delivery', systemId: 'SYS-SAP-SC', description: 'Delivery and goods issue are posted.' },
      { key: 'billing', label: 'Billing', systemId: 'SYS-SAP-SC', description: 'Billing document is created.' },
      { key: 'document', label: 'Invoice document', systemId: 'SYS-LASERNET', description: 'Customer invoice PDF is produced and archived.' },
    ],
  },
  {
    id: 'P6',
    name: 'Month-End Close',
    stream: 'Finance',
    summary:
      'Period postings, cross-system reconciliations, intercompany matching, treasury valuation and close reporting.',
    systemIds: ['SYS-SAP-STEEL', 'SYS-SAP-SC', 'SYS-D365', 'SYS-REVAL', 'SYS-JAVA'],
    interfaceIds: ['IF-11', 'IF-12', 'IF-13'],
    closeCritical: true,
    sites: ['PL01', 'PL03', 'YD02', 'YD05'],
    manualHoursPerMonth: 96,
    depth: 'Light',
    stages: [
      { key: 'postings', label: 'Period postings', systemId: 'SYS-SAP-STEEL', description: 'Goods receipt and invoice backlog cleared for the period.' },
      { key: 'intercompany', label: 'Intercompany', systemId: 'SYS-D365', description: 'Intercompany documents matched both ways.' },
      { key: 'treasury', label: 'Treasury and FX', systemId: 'SYS-REVAL', description: 'Payments acknowledged and FX rates loaded.' },
      { key: 'reporting', label: 'Close reporting', systemId: 'SYS-JAVA', description: 'Close report app shows balances per company and site.' },
    ],
  },
]

export const PROCESS_BY_ID = new Map(PROCESSES.map((p) => [p.id, p]))

export function processName(id: string): string {
  return PROCESS_BY_ID.get(id as never)?.name ?? id
}
