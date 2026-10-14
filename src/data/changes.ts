import type { ChangeItem } from '@/lib/types'
import { daysAgo, daysAhead } from '@/lib/clock'

/** The change feed that drives change impact, regression and self-healing. */
export const CHANGES: ChangeItem[] = [
  {
    id: 'CHG-001',
    kind: 'Power Platform release',
    ref: 'YARD-REL-2026.10',
    title: 'Yard release 2026.10: weighbridge screen rework',
    description:
      'The weighbridge ticket screen was rebuilt. Field attributes were renamed from camel case to snake case, labels and layout stayed the same.',
    systemId: 'SYS-YARD',
    plannedDate: daysAgo(1),
    riskScore: 72,
    impactedProcessIds: ['P1', 'P2'],
    impactedScenarioIds: ['P1-POS-01', 'P1-POS-02', 'P1-NEG-01', 'P1-NEG-02', 'P1-REG-01', 'P2-POS-01', 'P2-POS-02'],
    aiAssessment:
      'Seven scenarios touch the weighbridge screen. Only the net weight field selector broke; the AI repaired it with 96 % confidence and the key user approved it. Re-running P1 and P2 positive scenarios is enough to close this change out, and the regression run after the release showed no other difference.',
    closeSafe: true,
    closeSafeReason: 'Already released and regression tested before the freeze window starts.',
    healingEventIds: ['HEAL-001'],
  },
  {
    id: 'CHG-002',
    kind: 'SAP transport',
    ref: 'S4DK912844',
    title: 'Core ERP transport: goods movement display dynpro and mapping notes',
    description:
      'A transport replaces the goods movement display screen and touches the goods receipt message mapping for the steel company.',
    systemId: 'SYS-SAP-STEEL',
    plannedDate: daysAhead(2),
    riskScore: 84,
    impactedProcessIds: ['P1', 'P3', 'P4', 'P6'],
    impactedScenarioIds: ['P1-POS-01', 'P1-REG-02', 'P3-POS-01', 'P4-POS-01', 'P6-POS-01'],
    aiAssessment:
      'This transport touches the receipt message mapping that already carries a critical finding (F-001). Five scenarios are affected, two of them close critical. The display field id changes, which breaks one step; the AI proposed a fix at 88 % confidence that still needs approval. Recommendation: run the P1 regression set and the mapping comparison scenario before importing into production.',
    closeSafe: false,
    closeSafeReason:
      'Planned two days before the freeze window and it touches close critical processes P3 and P6 while a critical finding is still open.',
    healingEventIds: ['HEAL-002'],
  },
  {
    id: 'CHG-003',
    kind: 'API change',
    ref: 'LAB-API-V2',
    title: 'Laboratory app chemistry endpoint moved to version 2',
    description:
      'The in-house laboratory app publishes /api/v2/lab-results and retires v1. The molybdenum field is renamed and all values are typed as numbers.',
    systemId: 'SYS-JAVA',
    plannedDate: daysAgo(1, 2),
    riskScore: 58,
    impactedProcessIds: ['P2'],
    impactedScenarioIds: ['P2-POS-01', 'P2-POS-02', 'P2-NEG-02', 'P2-REG-02'],
    aiAssessment:
      'Four scenarios call the chemistry endpoint. The AI rewrote the call for v2 at 93 % confidence, waiting for approval. This change also fixes the root cause of finding F-011, because v2 types molybdenum as a number, so the regression scenario should prove the value is no longer lost.',
    closeSafe: true,
    closeSafeReason: 'Shop-floor only, no finance postings, and it closes an open High finding.',
    healingEventIds: ['HEAL-003'],
  },
  {
    id: 'CHG-004',
    kind: 'MES change',
    ref: 'MES-2026.10-SCHEMA',
    title: 'Mill execution database: heat number column widened',
    description: 'The heat number column was widened from 12 to 24 characters to allow a longer site prefix.',
    systemId: 'SYS-MES',
    plannedDate: daysAgo(2),
    riskScore: 44,
    impactedProcessIds: ['P4'],
    impactedScenarioIds: ['P4-POS-01', 'P4-REG-01'],
    aiAssessment:
      'Two scenarios read the heat number directly from the database. The AI added a TRIM to both queries at 97 % confidence, which works on the old and the new width, and the IT Admin approved it. No message mapping is affected.',
    closeSafe: true,
    closeSafeReason: 'Shop-floor schema only, already healed and re-run successfully.',
    healingEventIds: ['HEAL-004'],
  },
  {
    id: 'CHG-005',
    kind: 'D365 update',
    ref: '10.0.42',
    title: 'Recycling ERP update 10.0.42: mandatory warehouse on stock postings',
    description:
      'The monthly service update makes the warehouse field mandatory on inventory postings and adds a new validation on units.',
    systemId: 'SYS-D365',
    plannedDate: daysAhead(5),
    riskScore: 76,
    impactedProcessIds: ['P2', 'P3', 'P6'],
    impactedScenarioIds: ['P2-POS-01', 'P2-POS-02', 'P2-NEG-03', 'P2-REG-01', 'P3-POS-02', 'P6-POS-01'],
    aiAssessment:
      'Six scenarios post stock or invoices into the recycling ERP. The new mandatory warehouse field breaks three calls; the AI proposed adding warehouse RAW at 84 % confidence, which needs a key user to confirm per site. The new unit validation may also fix finding F-002, so the negative unit scenario should be re-run right after the update.',
    closeSafe: false,
    closeSafeReason: 'Lands inside the freeze window and touches close critical process P6.',
    healingEventIds: ['HEAL-005'],
  },
  {
    id: 'CHG-006',
    kind: 'Schema change',
    ref: 'SCRAP-DB-2026-10',
    title: 'Scrap yard database: chemistry table gains a tolerance column',
    description:
      'The chemistry table gains a tolerance column per element so out of specification results can be flagged automatically.',
    systemId: 'SYS-SCRAP',
    plannedDate: daysAhead(9),
    riskScore: 36,
    impactedProcessIds: ['P2'],
    impactedScenarioIds: ['P2-POS-01', 'P2-NEG-02'],
    aiAssessment:
      'Two scenarios read the chemistry table. The new column is additive and nullable, so existing queries keep working. The AI recommends extending the grade specification check to use the new tolerance column instead of hard coded windows, which is an improvement rather than a repair.',
    closeSafe: true,
    closeSafeReason: 'Additive change, shop-floor only, planned after the close.',
    healingEventIds: [],
  },
]

export const CHANGE_BY_ID = new Map(CHANGES.map((c) => [c.id, c]))
