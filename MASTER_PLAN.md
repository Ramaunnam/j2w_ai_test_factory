# J2W AI Test Factory — MASTER PLAN

**Status:** awaiting your "go" before any code is written.
**One application.** React 18 + TypeScript + Vite + Tailwind + shadcn-style components + lucide-react + recharts + react-router-dom. Mock data only, no backend.
**Positioning:** AI-generated, self-maintaining test automation across a steel + recycling application landscape. Build → Run → Hand over.

---

## 1. Product shape in one paragraph

One sidebar, four groups (Overview / Build / Run / Prove and Decide), 17 pages. Everything is organised around **one core object: a Scenario** — an end-to-end business journey made of **mixed steps** (DATA SETUP, UI ACTION, API CALL, MESSAGE CHECK, DATA CHECK, DOCUMENT CHECK, EVIDENCE). The same execution engine runs Functional, Regression, Load (R6), SoD (R7) and Reconciliation (R8) run types. Pass/fail and all scores are **deterministic TypeScript** (`src/lib/score.ts`); the "AI" produces only scripts, explanations and fixes, and every AI-authored or AI-healed script carries an approval state. Plain business language is always the first thing on screen; technical detail (selectors, payloads, SQL/OData) sits behind a "Technical detail" toggle.

---

## 2. Sitemap, with what each page must prove

| # | Page | Route | Req. | Core content |
|---|------|-------|------|--------------|
| | **OVERVIEW** | | | |
| 1 | Command Centre | `/` | all | Confidence score /100 (deterministic, with breakdown), R1–R10 requirement cards + status, process health P1–P6, last 5 runs, open findings by severity, month-end readiness tile ("10-day freeze → target 3"), 30-day trend chart (confidence + pass rate) |
| 2 | Landscape | `/landscape` | R5 | Hand-built SVG data-flow diagram: 10 systems as nodes in 3 bands (shop-floor / core ERP / financial + output), 13 interfaces as directed edges coloured by health. Click a system → drawer: role, backend type, access methods, data types, connection status, sites, scenarios touching it. Click an interface → drawer: message type, daily volume, last test result, sent/received/matched/mismatched/missing/duplicated, link to Interfaces page |
| | **BUILD** | | | |
| 3 | Process Discovery | `/discovery` | R1 | Inputs: 7 recorded key-user sessions (role, systems, duration, action count) + 5 system log sources with row counts. "Discover" → simulated job with a live log (polling) and progress → discovered process map (nodes across systems, edge frequency, variant count, 2 rework loops flagged) → "Generate scenarios" hands off to Test Studio |
| 4 | Test Studio | `/studio` | R1, R2, R9 | Pick a process → "Generate scenarios with AI" (job + live log) → grouped Positive / Negative / Regression lists with a coverage bar. Open a scenario → step list with step-type icons, plain-language description first, "Technical detail" toggle per step (UI selector + SAP transaction, API request/response, SQL/OData/NoSQL query, assertions). Plain-English rule box: type "net weight must equal gross minus tare" → AI returns a DATA CHECK step with query + assertion, insertable into the scenario. Approve / Edit / Reject (writes an Approval record) |
| 5 | Test Data | `/test-data` | R4 | Entity picker (vendor, customer, material, scrap grade, role, PO, goods receipt, invoice, production order, delivery, weighbridge ticket, heat, coil, scrap batch) + count → "Generate" → realistic **linked** records (PO → vendor + material; coil → heat; scrap batch → chemistry Ni/Cr/Mo) in a preview table with a linkage column → "Load into test environment" (mock job, returns IDs + target systems). Badge: "No real personal data" |
| | **RUN** | | | |
| 6 | Run Centre | `/run` | R2, R3, R5, R9 | **The main demo.** Pick process + scenarios + environment → Run → live step-by-step view driven by polling: mock screenshot panel for UI steps, request/response for API steps, result-row table for data checks, document preview for document checks, evidence chips appearing per step. The P1 demo run shows: (a) one **self-healed** step — renamed field `netWeightKg` → `net_weight_kg`, AI fix, re-run, amber "Healed" badge, then pass; (b) negative steps ending "Blocked as expected"; (c) a DATA CHECK that finds **3 trucks whose weighbridge net weight ≠ SAP goods receipt quantity**; ends with the release verdict card + "Open report" |
| 7 | Interfaces | `/interfaces` | R5 | All 13 interfaces in a table: sent / received / matched / mismatched / missing / duplicated, SLA, last run. Open one → field-by-field record compare (source vs target, per-field match highlighting). **"Follow the truck"**: pick a vehicle number → timeline of that vehicle traced across Yard Mgmt → SAP → Esker → Lasernet (and Scrap Yard → D365 for recycling), with the mismatch visible on the timeline |
| 8 | Regression & Change Impact | `/regression` | R2, R9 | Change feed: SAP transport, D365 update, Power Platform release, MES change, DB schema change → AI impact assessment (processes, scenarios, risk score, reasoning) → "Run regression" (job) → baseline vs current comparison (new failures, fixed, unchanged, duration delta) |
| 9 | Month-End Load | `/load` | R6 | Profile selector normal / 2× / 5× → run → time-series charts: throughput (docs/min), p95 response time, error rate, interface backlog; plus **data checks under load** (nothing lost, nothing duplicated: counts in vs out per interface) → verdict + link to Release & Close Readiness |
| 10 | Access & SoD | `/access-sod` | R7 | Roles from SAP Steel, SAP Service Centre, D365 and Yard Mgmt → conflict matrix (create vs pay vendor, create vs approve PO, GR vs invoice, bank details vs payment run) → users in conflict with severity → **"Prove it"** test: executes the forbidden action and records blocked / **allowed (= finding)** with evidence |
| 11 | Reconciliation | `/reconciliation` | R8 | Recon sets (migration: vendors, customers, materials, open items; cross-system: SAP ↔ D365 intercompany, Yard ↔ SAP receipts) → counts, totals, match %, row-by-row sample with per-field diff, differences grouped by AI-explained cause (unit mix-up kg/t, truncated bank detail, rounding, missing mapping) |
| 12 | Self-Healing | `/self-healing` | R9 | Change feed (UI rename, schema change, API version/field change) → affected scripts → before/after **diff view** of the AI fix with confidence %, rationale, Approve / Reject (writes Approval). History of past healings with outcome |
| | **PROVE AND DECIDE** | | | |
| 13 | Evidence & Reports | `/evidence` | R3 | Locked evidence bundles per run: hash, captured time, approver, item counts by kind. Filters (process, requirement, run type, date, verdict). "Open report" → `window.open('/report/:runId')` → formatted standalone **HTML** report page (print-ready): summary, verdict, results per requirement and per process, screenshots, payloads, query results, healed scripts, approvals, sign-off block. No .txt anywhere |
| 14 | Release & Close Readiness | `/release` | R3, R6 | Release gate: weighted component scores → score + verdict GO / CONDITIONAL / NO-GO (any open critical defect caps at CONDITIONAL; two or more criticals → NO-GO), blockers listed. Month-end view: freeze calendar (current 10 days vs target 3), close-critical processes with status, "Safe to change before close?" check against the change feed |
| 15 | Approvals | `/approvals` | R1, R9 | Key-user queue: AI-generated scenarios, healed scripts, evidence bundles. Each item: what changed, plain-language rationale, confidence, Approve / Reject + comment. Role-aware |
| 16 | Delivery Model | `/delivery` | R10 | Build → Run → Hand over phase tracker with progress; pod roles and allocation (roles only, no real people); outcome targets current vs target (processes automated, manual hours saved/month, freeze days 10 → 3, vendor headcount → 0); training/handover checklist |
| 17 | Requirement Coverage | `/coverage` | all | R1–R10 → the page that demonstrates it → status + linked scenarios/runs, with the note: *"Mapping to be verified against the client's requirement document."* |

**Header:** J2W text logo mark + "AI Test Factory", role switcher (Key User / QA Lead / IT Admin / Auditor — landing pages: Key User → Approvals, QA Lead → Run Centre, IT Admin → Landscape, Auditor → Evidence & Reports), environment pill (TEST), light/dark toggle.
**Footer:** "J2W · POC – mock data for demonstration".

---

## 3. Data model (`src/lib/types.ts`)

Key entities and fields (all IDs are stable string literals so cross-page links never break):

```
System            id, name, role, band, backend: 'Dataverse'|'SQL'|'SAP HANA'|'SQL Server'|'Files',
                  access: ('REST'|'OData'|'IDoc'|'GUI'|'SFTP'|'Files'|'SQL')[], dataTypes[],
                  connection: 'Connected'|'Degraded'|'Not connected', sites[], x, y
Interface         id, name, sourceSystemId, targetSystemId, category:'Shop-floor'|'Financial',
                  messageType:'IDoc'|'OData'|'REST JSON'|'File'|'SFTP', idocType?, volumePerDay,
                  slaMinutes, health, stats{sent,received,matched,mismatched,missing,duplicated},
                  lastTestRunId, records: InterfaceRecord[]
InterfaceRecord   id, key, sentAt, receivedAt?, status:'Matched'|'Mismatched'|'Missing'|'Duplicated',
                  fields: {name, sourceValue, targetValue, match}[]
Process           id (P1–P6), name, stream:'Steel'|'Recycling'|'Finance', summary, systemIds[],
                  interfaceIds[], stages[], closeCritical, health, automationPct
Requirement       id (R1–R10), title, description, demoRoute, demoPageName, status, coveragePct,
                  scenarioIds[], evidenceRunIds[]
Scenario          id, code, name, processId, type:'Positive'|'Negative'|'Regression', systemIds[],
                  interfaceIds[], requirementIds[], riskLevel, author:'AI'|role, approval,
                  steps: Step[], lastRunId?, createdAt, tags[]
Step              id, order, kind: StepKind, title (plain language), systemId?, expected (plain),
                  technical: { uiSelector?, transaction?, screen?, api?{method,url,headers,body},
                  query?{language:'SQL'|'OData'|'NoSQL'|'REST', text}, messageRef?, document?,
                  assertions: {expr, plain}[] }, healingHistory?: HealingEventId[]
StepKind          'DATA_SETUP'|'UI_ACTION'|'API_CALL'|'MESSAGE_CHECK'|'DATA_CHECK'|
                  'DOCUMENT_CHECK'|'EVIDENCE'
Run               id, runType:'Functional'|'Regression'|'Load'|'SoD'|'Reconciliation', processId?,
                  scenarioIds[], environment, triggeredByRole, startedAt, finishedAt?,
                  status:'Queued'|'Running'|'Passed'|'Failed'|'Passed with findings',
                  stepResults: StepResult[], findingIds[], evidenceBundleId?, verdict, score
StepResult        stepId, scenarioId, status:'Pending'|'Running'|'Passed'|'Failed'|'Healed'|
                  'Blocked as expected'|'Skipped', durationMs, logLines[], evidenceIds[],
                  findingId?, healingEventId?, rows?, payload?, screenshot?
Evidence          id, runId, stepId, kind:'screenshot'|'payload'|'query-result'|'document'|'log',
                  title, capturedAt, hash, locked, approvedByRole?, body (mock content)
EvidenceBundle    id, runId, hash, lockedAt, approvedByRole, itemCounts, verdict
Finding           id, runId, severity:'Critical'|'High'|'Medium'|'Low', title, plain, cause,
                  aiExplanation, systemIds[], processId, requirementIds[], rows[], status
ChangeItem        id, source, type:'SAP transport'|'D365 update'|'Power Platform release'|
                  'MES change'|'Schema change'|'API change', ref, plannedDate, description,
                  impact{processIds[], scenarioIds[], riskScore, aiAssessment}, closeSafe
HealingEvent      id, scenarioId, stepId, changeItemId, detectedAt, changeKind:'UI'|'Schema'|'API',
                  before, after, diffLines[], confidencePct, rationale, status, approvedByRole?
TestDataEntity    key, label, systemIds[], fields[], linkedEntities[]
TestDataRecord    id, entityKey, values{}, links[{entityKey, id}], generatedAt, loadedTo[]
LoadRun           id, profile:'normal'|'2x'|'5x', series[{minute, throughput, p95Ms, errorRatePct,
                  backlog}], integrityChecks[{interfaceId, sentIn, receivedOut, duplicated, lost}],
                  verdict, bottlenecks[]
Role / UserAccount  roles {id, systemId, name, permissions[]}; users {id, label 'Key User A',
                  roleIds[], site}
SodRule           id, name, leftPermission, rightPermission, severity, requirementIds
SodConflict       id, userId, ruleId, severity, systems[],
                  proof?{runId, action, outcome:'Blocked'|'Allowed', evidenceId}
ReconSet          id, name, scope:'Migration'|'Cross-system', sourceSystemId, targetSystemId,
                  counts{source,target,matched,missing,extra}, totals{source,target,delta,unit},
                  matchPct, sample: ReconRow[], differenceGroups[{cause, count, aiExplanation}]
ReleaseGate       components[{key, label, weight, score, detail}], score, verdict, blockers[]
CloseReadiness    freezeDays, targetFreezeDays, calendar[{date, state}], closeCriticalProcesses[],
                  changeSafety[]
Approval          id, kind:'scenario'|'healed-script'|'evidence', refId, title, requestedAt,
                  forRole, status:'Pending'|'Approved'|'Rejected', decidedByRole?, comment?
DiscoverySession  id, keyUserRole, systemIds[], durationMin, actionCount, capturedAt
DiscoveredMap     processId, nodes[{id, systemId, label, frequency}], edges[{from,to,count,avgMin}],
                  variants, reworkLoops[]
TrendPoint        date, confidence, passRate, scenarios, findingsOpen
DeliveryPhase     key:'Build'|'Run'|'Hand over', progressPct, milestones[], podRoles[], targets[]
```

**Deterministic scoring — `src/lib/score.ts`** (pure functions over mock data, no randomness):

- `confidenceScore()` → 0–100 from weighted components: automation coverage 25, pass rate 25, interface integrity 15, evidence completeness 10, self-healing stability 10, SoD cleanliness 8, reconciliation match 7. Any open **Critical** finding caps the total at 79; the UI shows the breakdown.
- `processHealth(processId)`, `requirementStatus(rId)`, `interfaceHealth(iId)` — same style, all derived.
- `releaseGate()` → score + verdict: ≥85 GO, 60–84 CONDITIONAL, <60 NO-GO; ≥1 open critical ⇒ at most CONDITIONAL; ≥2 open criticals ⇒ NO-GO. Blockers listed explicitly.
- `runVerdict(run)` → per-step pass/fail is a plain comparison of actual vs expected in the step results, never a model call.

---

## 4. Architecture and file layout

```
src/
  main.tsx, App.tsx                 router, providers (role, theme, toast)
  index.css                         design tokens (CSS vars, light + dark)
  lib/
    types.ts                        every type above
    api.ts                          typed mock client, endpoint-shaped names, 150–600ms delays
    jobs.ts                         in-memory job runner for live runs (start → tick → poll)
    score.ts                        deterministic scoring
    format.ts                       kg/t, %, dates, numbers, ids
    utils.ts                        cn(), grouping helpers
  data/
    systems.ts  interfaces.ts  processes.ts  requirements.ts
    scenarios.p1.ts ... scenarios.p6.ts      step-level scripts
    runs.ts  findings.ts  evidence.ts
    testdata.ts  discovery.ts  changes.ts  healing.ts
    sod.ts  recon.ts  load.ts  approvals.ts  delivery.ts  trend.ts
  components/
    ui/        shadcn-style primitives, hand-written: button, card, badge, tabs, table, dialog,
               drawer, select, input, textarea, switch, checkbox, progress, tooltip, accordion,
               separator, skeleton, toast, scroll-area
    layout/    AppShell, Sidebar, Header, RoleSwitcher, ThemeToggle, Footer
    common/    PageHeader, StatTile, ScoreGauge, StatusPill, StepKindIcon, VerdictBadge,
               PlainTechToggle, LiveLog, EmptyState, DataTable, DiffView, Timeline,
               MockScreenshot, MockDocument
    charts/    TrendChart, LoadChart, CoverageBar (recharts, shared theme)
  pages/                            one file per page in section 2
  report/ReportPage.tsx             standalone HTML report route (/report/:runId), no app shell
```

**Live runs:** `api.startRun(req)` registers a job in `jobs.ts` that advances one step per tick (~700–1200 ms, deterministic order with scripted outcomes including the heal and the finding) and appends log lines; pages poll `api.getRunStatus(jobId)` every 500 ms. Same mechanism for Discovery, scenario generation, test-data generation/load, Regression, Load and SoD proof runs.

**API function names (shaped like future endpoints):** `getCommandCentre`, `getSystems`, `getInterfaces`, `getInterfaceRecords`, `traceVehicle`, `getProcesses`, `getRequirements`, `getRequirementCoverage`, `listDiscoverySessions`, `startDiscovery`, `getDiscoveryStatus`, `generateScenarios`, `listScenarios`, `getScenario`, `updateScenario`, `translateRuleToCheck`, `approveScenario`, `rejectScenario`, `listTestDataEntities`, `generateTestData`, `loadTestData`, `startRun`, `getRunStatus`, `getRun`, `listRuns`, `listFindings`, `listChanges`, `assessChangeImpact`, `startRegressionRun`, `compareToBaseline`, `startLoadRun`, `getLoadRunStatus`, `getSodMatrix`, `runSodProof`, `listReconSets`, `getReconSet`, `listHealingEvents`, `approveHealing`, `listEvidence`, `getEvidenceBundle`, `getRunReport`, `getReleaseGate`, `getCloseReadiness`, `listApprovals`, `decideApproval`, `getDeliveryModel`.

---

## 5. Design system

- **Primary** deep steel blue (`#14395C`, scale 50–900), **neutrals** slate, **accent** amber (`#D98A0B`) for warnings and "Healed", green pass, red fail, violet for "AI generated".
- CSS custom properties in `index.css`, Tailwind `darkMode: 'class'`, both themes designed (not inverted). Explicit page background, 8-pt spacing, `rounded-lg`, one border style, no gradients, **no emoji**, lucide icons only.
- Step kinds have fixed icons and colours: DATA SETUP (database), UI ACTION (mouse-pointer), API CALL (webhook), MESSAGE CHECK (arrow-left-right), DATA CHECK (table), DOCUMENT CHECK (file-text), EVIDENCE (camera).
- Readable at laptop (1280) and tablet (834): sidebar collapses to icons under 1024; dense tables become stacked cards under 768 where needed.
- Plain language first; every technical block behind a `PlainTechToggle`.

---

## 6. Mock data plan

**Naming rules enforced:** generic system names only (Yard Management, Scrap Yard Operations, SAP S/4HANA – Steel, SAP S/4HANA – Service Centre, D365 F&O – Recycling, Mill Execution System, Lasernet, Esker, Reval, Java Apps). People are roles only: Key User A–G, QA Lead, IT Admin, Auditor. **No** client company, people, locations or client system names anywhere; `npm run check:names` greps the repo (excluding `node_modules`) for the forbidden list and must return 0 matches.

**Sites:** PL01 Steel, PL03 Service Centre, YD02 Recycling, YD05 Recycling.

**Value conventions**

| Thing | Pattern | Examples |
|---|---|---|
| Vehicle / wagon / container | `VH-####`, `WGN-#####`, `CNU-#######` | VH-7741, WGN-20418, CNU-4419087 |
| Gate pass / weighbridge ticket | `GP-<site>-2026-#####`, `WB-#######` | GP-PL01-2026-04821, WB-2610442 |
| Weights | gross / tare / net in kg (t where the system uses t) | 38 420 / 13 560 / 24 860 kg = 24.860 t |
| Scrap grades + chemistry | generic grades | SCR-304-BALE, SCR-316L-SOLID, SCR-430-TURN; Ni 8.1 %, Cr 18.3 %, Mo 2.1 % |
| Stainless grades | 304, 316L, 430 | MAT-COIL-316L-2.0 |
| Heat / coil | `HT-26-#####`, `CL-26-######` | HT-26-10412, CL-26-884201 |
| PO / GR / invoice / delivery / production order | SAP number ranges | 4500018823 / 5000041122 / 5105600781 / 80001244 / 1000045621 |
| SAP transactions | real t-codes | ME21N, MIGO, MIRO, VA01, VL01N, VF01, F110, FB60, FBL1N |
| IDoc types | real types | MBGMCR03, INVOIC02, ORDERS05, DELVRY07, PEXR2002 |
| Payment / bank files | file names | PAYMUL_20261031_01.txt, pain.001.001.03_PL01_2026-10-31.xml |
| Vendors / customers / materials | `VEND-####`, `CUST-####`, `MAT-...` | VEND-1042 "Scrap Supplier Alpha", CUST-2210 "Service Centre Buyer Nord" |

**Volumes:** 10 systems, 13 interfaces, 6 processes, 10 requirements, ~34 scenarios (≈14 Positive, ≈11 Negative, ≈9 Regression) of 6–14 steps each; 12 historic runs + 1 scripted live P1 run; ~60 interface records; ~45 evidence items in 4 locked bundles; 11 findings; 6 change items; 7 healing events; 9 recon sets; 3 load profiles; 14 roles / 12 users / 6 SoD rules / 5 conflicts; 30 trend points.

**Deliberate defects (so the tests find something)**

1. **Weight mismatch, 3 trucks** (the P1 demo finding): VH-7741 kg/t unit mix-up (24 860 kg posted as 24.86 → 2 486 kg), VH-8126 tare re-weigh missed (+1 240 kg), VH-9043 duplicate ticket counted twice. Severity Critical.
2. **Duplicated IDoc** MBGMCR03 on Yard Mgmt → SAP (same gate pass sent twice).
3. **Missing PO reference** on an Esker supplier invoice → parked, not posted.
4. **Late message** MES → SAP production confirmation beyond the 15-minute SLA.
5. **Unit mix-up kg vs t** on Scrap Yard → D365 stock posting.
6. **SoD conflicts:** Key User C can create *and* pay a vendor; Key User F can change bank details *and* run the payment run (the "Prove it" test returns **Allowed** = finding).
7. **Migration differences:** 9 vendor bank details truncated, 4 materials with missing UoM mapping, intercompany open-item rounding delta 0.03 %.
8. **Load defect:** at 5× volume the Esker → SAP interface backlog grows and 2 invoices are lost → integrity check fails.
9. **Self-healing triggers:** Power Platform release renames `netWeightKg` → `net_weight_kg`; MES schema changes a column length; an OData API version bump moves a field.

---

## 7. Build order (each step ends with `tsc --noEmit` + `vite build` passing)

1. Scaffold: Vite + TS + Tailwind + router; design tokens; AppShell, Sidebar (4 groups, 17 items), Header (role switcher, theme toggle), Footer; all 17 routes as stubs.
2. `types.ts` → `data/*` → `api.ts` → `jobs.ts` → `score.ts`; UI primitives and common components.
3. Landscape (diagram + drawers).
4. Test Studio (generation job, grouped scenarios, step detail, plain-English rule box, approvals).
5. **Run Centre** — the demo: live run, heal, negative blocked, 3-truck finding, verdict.
6. Command Centre (score, requirement cards, process health, trend).
7. Remaining pages in sidebar order: Process Discovery, Test Data, Interfaces (+ Follow the truck), Regression & Change Impact, Month-End Load, Access & SoD, Reconciliation, Self-Healing, Release & Close Readiness, Approvals, Delivery Model.
8. Evidence & Reports + standalone `/report/:runId` HTML report (print-ready, opens in a new tab).
9. Requirement Coverage (+ verification note).
10. Final pass: forbidden-name scan = 0, type check, production build, manual smoke of every mock flow, `README.md` with run instructions and a 15-minute demo path.

**15-minute demo path (to go into README):** Command Centre (confidence + freeze target) → Landscape (open the Yard Mgmt → SAP interface) → Process Discovery (discover P1) → Test Studio (generated P1 scenarios, plain-English rule → data check, approve) → Test Data (10 linked scrap batches, load) → **Run Centre P1 live run** (healed step, blocked-as-expected, 3-truck finding, verdict) → Interfaces ("Follow the truck" VH-7741) → Self-Healing (approve the fix) → Month-End Load (5× verdict) → Access & SoD ("Prove it" = Allowed) → Reconciliation (bank-detail truncation) → Evidence & Reports (open the HTML report) → Release & Close Readiness (CONDITIONAL and why) → Delivery Model + Requirement Coverage.

---

## 8. Assumptions and open points

1. **No backend, no network calls** — all "AI" output is pre-authored mock content presented as AI-generated; nothing calls a model at runtime.
2. **Requirement mapping** R1–R10 is taken from your brief; the Requirement Coverage page carries the note "Mapping to be verified against the client's requirement document."
3. Mock screenshots are rendered **mock UI panels** (styled markup/SVG), not images — no binary assets and no client screens.
4. The document check renders a styled HTML "document preview", not a real PDF file.
5. Scores are illustrative but deterministic and recomputed from the mock data, so numbers agree across every page.
6. Dates are anchored around **October 2026** (close window 31 Oct 2026) so the freeze calendar and trend chart read as current.

---

**Next step: your "go".** On approval I build in the order in section 7 and report after each step.
