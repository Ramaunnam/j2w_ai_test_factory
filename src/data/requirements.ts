import type { Requirement } from '@/lib/types'

/**
 * R1-R10 as given in the brief.
 * Mapping to be verified against the client's requirement document.
 */
export const REQUIREMENTS: Requirement[] = [
  {
    id: 'R1',
    title: 'Script generation from process discovery',
    description:
      'Recorded key-user sessions and system logs are turned into a process map, and test scenarios are generated from it.',
    demoRoute: '/discovery',
    demoPageName: 'Process Discovery',
    secondaryRoutes: [{ route: '/studio', pageName: 'Test Studio' }],
    howDemonstrated:
      'Run Discover on a process: the live log shows sessions and logs being read, a process map is produced, then Generate scenarios creates draft scenarios in Test Studio for key-user approval.',
  },
  {
    id: 'R2',
    title: 'Positive, negative and regression testing',
    description:
      'Every process has positive, negative and regression scenarios, selectable and runnable in any combination.',
    demoRoute: '/studio',
    demoPageName: 'Test Studio',
    secondaryRoutes: [
      { route: '/run', pageName: 'Run Centre' },
      { route: '/regression', pageName: 'Regression & Change Impact' },
    ],
    howDemonstrated:
      'Scenarios are grouped by type in Test Studio. In the Run Centre a negative step ends as "Blocked as expected". Regression runs compare against a baseline run.',
  },
  {
    id: 'R3',
    title: 'Audit-ready evidence with screenshots and standard reports',
    description:
      'Every step captures evidence automatically: screenshots, payloads, query results and documents, locked with a hash and an approver.',
    demoRoute: '/evidence',
    demoPageName: 'Evidence & Reports',
    secondaryRoutes: [
      { route: '/run', pageName: 'Run Centre' },
      { route: '/release', pageName: 'Release & Close Readiness' },
    ],
    howDemonstrated:
      'Evidence bundles per run carry a hash, time and approver. Four outputs read that evidence: a finding card per issue, a one-screen run summary, a release report for managers and the long audit evidence pack, each printable as PDF.',
  },
  {
    id: 'R4',
    title: 'AI-driven test master data',
    description:
      'Realistic, linked test master and transaction data is generated on demand and loaded into the test environment.',
    demoRoute: '/test-data',
    demoPageName: 'Test Data',
    secondaryRoutes: [{ route: '/run', pageName: 'Run Centre' }],
    howDemonstrated:
      'Choose an entity and a count: the generator produces linked records (purchase order with vendor and material, coil with its heat, scrap batch with chemistry), previews them and loads them into the selected systems.',
  },
  {
    id: 'R5',
    title: 'Integration and API testing across shop-floor and financial interfaces',
    description:
      'Each interface is testable on its own and inside an end-to-end journey, with message and data checks on both sides.',
    demoRoute: '/interfaces',
    demoPageName: 'Interfaces',
    secondaryRoutes: [
      { route: '/landscape', pageName: 'Landscape' },
      { route: '/run', pageName: 'Run Centre' },
    ],
    howDemonstrated:
      'Sent, received, matched, mismatched, missing and duplicated per interface, field-by-field record compare, and Follow the truck tracing one vehicle across every system on a timeline.',
  },
  {
    id: 'R6',
    title: 'Month-end load testing',
    description:
      'Month-end volume is simulated at normal, 2x and 5x with throughput, response time, error rate, interface backlog and data integrity checks.',
    demoRoute: '/load',
    demoPageName: 'Month-End Load',
    secondaryRoutes: [{ route: '/release', pageName: 'Release & Close Readiness' }],
    howDemonstrated:
      'Select a profile and run: charts show throughput, p95 response time, error rate and backlog, and the integrity checks prove nothing was lost or duplicated. The verdict feeds close readiness.',
  },
  {
    id: 'R7',
    title: 'Segregation of duties and role testing',
    description:
      'Role data from all systems is combined into a conflict matrix, users in conflict are listed and each conflict can be proven by test.',
    demoRoute: '/access-sod',
    demoPageName: 'Access & SoD',
    secondaryRoutes: [{ route: '/evidence', pageName: 'Evidence & Reports' }],
    howDemonstrated:
      'The matrix covers create versus pay vendor, create versus approve purchase order, goods receipt versus invoice, and bank details versus payment run. Prove it executes the forbidden action and records blocked or allowed with evidence.',
  },
  {
    id: 'R8',
    title: 'Data migration reconciliation',
    description:
      'Migration and cross-system reconciliation with counts, totals, row-level comparison and explained differences.',
    demoRoute: '/reconciliation',
    demoPageName: 'Reconciliation',
    secondaryRoutes: [{ route: '/landscape', pageName: 'Landscape' }],
    howDemonstrated:
      'Each reconciliation set shows counts, totals, match percentage, a row-by-row sample with field differences, and difference groups with an AI-explained cause and recommended fix.',
  },
  {
    id: 'R9',
    title: 'Self-maintaining (self-healing) scripts',
    description:
      'When a screen, schema or API changes, the affected scripts are repaired automatically and the fix is offered for approval.',
    demoRoute: '/self-healing',
    demoPageName: 'Self-Healing',
    secondaryRoutes: [
      { route: '/run', pageName: 'Run Centre' },
      { route: '/approvals', pageName: 'Approvals' },
    ],
    howDemonstrated:
      'The change feed lists UI, schema and API changes. Each healing event shows a before and after diff, a confidence percentage and a rationale, and must be approved by a key user. The Run Centre shows a healed step going amber then passing.',
  },
  {
    id: 'R10',
    title: 'End-to-end testing framework and outcome-based testing pod',
    description:
      'One framework covering all processes and run types, delivered by a pod that builds, runs and hands over to the client team.',
    demoRoute: '/delivery',
    demoPageName: 'Delivery Model',
    secondaryRoutes: [
      { route: '/', pageName: 'Command Centre' },
      { route: '/coverage', pageName: 'Requirement Coverage' },
    ],
    howDemonstrated:
      'Build, Run and Hand over phases with progress and milestones, pod roles by phase, outcome targets (processes automated, manual hours saved, freeze days, vendor headcount to zero) and the handover training checklist.',
  },
]

export const REQUIREMENT_BY_ID = new Map(REQUIREMENTS.map((r) => [r.id, r]))

export const COVERAGE_NOTE = "Mapping to be verified against the client's requirement document."
