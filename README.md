# J2W AI Test Factory

AI-generated, self-maintaining test automation for a steel and recycling application landscape:
process discovery, mixed-step scenarios, live runs with audit-ready evidence, interface and data
checks, month-end load, segregation of duties, reconciliation and a release gate.

**This is a POC. All data is mock data, there is no backend, and nothing calls an AI model at
runtime.** Every "AI" output (scenarios, explanations, fixes) is pre-authored content presented the
way a real engine would present it. All scores and every pass or fail are deterministic TypeScript in
`src/lib/score.ts`.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type check, then production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:names` | Fails if any client company, person, location or client system name appears anywhere in the project |
| `npm run smoke` | Builds a classic-script bundle and loads all 21 routes in jsdom, then clicks through 15 mock flows and asserts the results appear |
| `npm run layout:audit` | Static width and scroll audit of all 17 pages plus the four report screens: responsive columns, `minmax(0, …)` fraction columns, wide content only inside its own scroller, global guards and the navigation scroll reset |
| `npm run verify` | typecheck + build + check:names + layout:audit + smoke, in one go |

Tested with Node 24 and npm 11. No backend, no network calls, no environment variables.

---

## The 15-minute demo path

Switch role in the header at any point: Key User, QA Lead, IT Admin and Auditor each land on their own
start page. Light and dark mode are both designed; the toggle is in the header.

1. **Command Centre** (1 min) - confidence score 79 of 100, capped because two critical findings are
   open. Click the gauge to see all seven weighted components. Read the month-end tile: the freeze is
   **10 days today, 3 days is the target**.
2. **Landscape** (1.5 min) - the data-flow diagram: 10 systems in three bands, 14 interfaces coloured
   by health. Click **Yard Management**, then its interface to SAP Steel. Switch to *Data sources and
   checks*, tick `weighbridge_ticket` and `MSEG`, choose *Cross-system match* and press **Run selected
   checks**.
3. **Process Discovery** (1.5 min) - keep P1 selected, press **Discover**. Watch the live log read 3
   key-user sessions and 3 log sources, then produce the process map with **3 rework loops** (re-weighs,
   corrected receipts, parked invoices) and 6 proposed scenarios.
4. **Test Studio** (2 min) - press **Generate scenarios with AI** and watch the log; the new scenarios
   arrive as *Pending approval*. Open **P1-POS-01**, expand a step's *Technical detail* (selector, API
   payload, SQL, assertions). In the plain-English rule box type *"net weight must equal gross weight
   minus tare weight"*, press **Write the data check**, then **Add to P1-POS-01** and **Approve**.
5. **Test Data** (1 min) - entity *Scrap batch with chemistry*, count 10, **Generate**, then **Load into
   test environment**. Click a record to see its linked grade and chemistry. Badge: no real personal data.
6. **Run Centre** (3.5 min, the main demo) - press **Load P1 demo selection**, then **Run 4 selected**
   (speed 2x or 4x if you are short of time). Watch:
   - step 4 **heals itself**: the yard release renamed `netWeightKg` to `net_weight_kg`, the AI repairs
     the selector at 96 % confidence, the step goes amber **Healed** and then passes - click it to see
     the before and after diff;
   - the negative scenarios end **Blocked as expected**, with proof that nothing was posted;
   - the data check finds **3 trucks whose weighbridge net weight does not match the SAP goods receipt**
     (VH-7741 kg/t mix-up, VH-8126 tare not re-weighed, VH-9043 posted twice) - press **Open finding** for
     the one-screen **finding card**: business impact in kg and EUR, the affected records (click a row to
     follow that truck), cause, recommended fix, evidence thumbnails, then **Create defect**, **Assign
     owner** or **Mark fixed → Retest**;
   - the run ends with a **CONDITIONAL** verdict, a locked evidence bundle, **Open run summary** and
     **Audit evidence pack**.
7. **Interfaces** (1 min) - *Follow the truck*: **VH-7741** traced across Yard Management, SAP Steel,
   Esker and Lasernet on a timeline. Click a step for the field-by-field compare that shows 24 860 kg
   against 2 486 kg.
8. **Self-Healing** (1 min) - the change feed, the repair for the yard release, the diff, the confidence
   and the key-user approval. One repair was **rejected** on purpose, to show the control works.
9. **Month-End Load** (1 min) - profile **5x month-end**, **Run load test**: throughput, p95, error rate
   and backlog as four separate charts, and the integrity check that finds **2 invoices lost** at 5x.
10. **Access & SoD** (1 min) - the conflict matrix. Open *Key User C* on *create vendor and pay vendor*
    and press **Prove it**: the forbidden combination is **Allowed**, which is a finding with evidence.
11. **Reconciliation** (1 min) - *Yard receipts against core ERP goods receipts* at 98.1 %, then the
    migration set with **9 truncated vendor bank details** and the AI-explained cause.
12. **Evidence & Reports** (1 min) - a locked bundle with its hash and approver, **Sign off evidence**,
    then the two reader-specific outputs: **Open run summary** (one screen: verdict, counts, findings,
    result per scenario, sign-off) and **Audit evidence pack** (the long one: collapsible scenarios and
    steps, every evidence item once, hashes, healed scripts, approvals). Both print as PDF.
13. **Release & Close Readiness** (1 min) - gate score and verdict, what is holding it back, the freeze
    calendar (10 days now, 3 days target) and *Safe to change before the close?* per change. Press
    **Release report** for the one to two page manager version: verdict, score breakdown, open findings by
    severity, processes tested, risk before the close, recommendation and sign-off.
14. **Delivery Model and Requirement Coverage** (1 min) - Build → Run → Hand over, pod roles, outcome
    targets including vendor headcount to zero, then R1 to R10 mapped to the page that proves each one.

Everything is clickable: a system, interface, process, scenario, step, run, record, vehicle, finding,
change, user, role, requirement, chart bar and trend point all open their own detail. Selections carry
over: pick a process in Discovery and the Run Centre opens with it pre-selected; approve something and
the Command Centre numbers change.

---

## The four reporting outputs

Reporting is split by reader, and each one is a standalone, print-ready page with the J2W header, a
**Print / Save as PDF** button and the POC footer.

| Output | Route | For whom | What it holds |
|---|---|---|---|
| **Finding card** | `/finding/:id` | whoever has to fix it | One screen per issue: severity, status, owner, systems and interface, what is wrong in one sentence, business impact in kg or EUR, affected records (click a row to follow that vehicle), cause, recommended fix, the run and step that found it, up to three evidence thumbnails, and the actions: Create defect, Assign owner, Mark fixed then Retest |
| **Run summary** | `/report/:runId` | the QA Lead and key users | One screen per run: verdict, run id, process, date, environment, counts (passed, healed, blocked as expected, failed), the findings with a link to each card, result per scenario with its evidence bundle, approvals and sign-off status, and **View full audit evidence** |
| **Release report** | `/release-report/:releaseId` | managers | One to two pages per release: verdict, gate score with the six-component breakdown, open findings by severity, processes tested, risk before the month-end close (freeze days, unsafe changes), the recommendation with concrete actions, and the sign-off block |
| **Audit evidence pack** | `/evidence-pack/:runId` | auditors | The long one: bundle and hashes (`EVB-5001`, `EVB-5001-01` per scenario, always derived from the run), result per requirement where a step counts only against the requirement it tests, findings, every scenario and step collapsible with Expand all and Collapse all, each evidence item shown once with the duplicates listed as references, the AI repairs dated inside the run window, approvals and sign-off |

Buttons use the same four names everywhere: **Open finding**, **Open run summary**, **Release report**,
**Audit evidence pack**.

## What is in the data

- **10 systems**: Yard Management (Power Platform, Dataverse), Scrap Yard Operations (SQL), SAP S/4HANA
  Steel, SAP S/4HANA Service Centre, D365 F&O Recycling, Mill Execution System, Lasernet, Esker, Reval,
  in-house Java apps. **31 data sources** (tables, collections, OData entities, file sets).
- **14 interfaces**, 6 shop-floor and 8 financial, with sent / received / matched / mismatched / missing
  / duplicated counts and field-level records.
- **6 processes**: P1 Gate to Invoice and P2 Scrap to Stock are built in full; P3 Procure to Pay, P4
  Produce to Dispatch, P5 Order to Cash and P6 Month-End Close have a complete but lighter set.
- **31 scenarios / 231 steps** across the seven step kinds (data setup, UI action, API call, message
  check, data check, document check, evidence), grouped positive, negative and regression.
- **16 deliberate defects** so the tests find something real: the 3-truck weight mismatch, a kg/t unit
  mix-up on scrap stock, a parked invoice ageing past the rule, a late production confirmation, a lost
  receipt message, a duplicated vendor invoice, a missing certificate template, a late treasury
  acknowledgement, intercompany rounding, a chemistry value lost on an interface, an unmatched period
  backlog, two proven SoD conflicts, 2 invoices lost at 5x load and 9 truncated bank details.
- Sites **PL01** (steel), **PL03** (service centre), **YD02** and **YD05** (recycling). Generic names
  only; people are roles (Key User A to G, QA Lead, IT Admin, Auditor).

## How it is built

```
src/lib/types.ts      every domain type
src/lib/api.ts        typed mock client; function names match future endpoints
src/lib/jobs.ts       live job engine (discovery, generation, runs, load, proofs) with a live log
src/lib/score.ts      deterministic scoring: confidence, process health, release gate
src/lib/db.ts         in-memory store; every action mutates it and bumps a revision
src/data/             the mock landscape, scenarios, runs, evidence, findings, recon, SoD, delivery
src/components/       UI primitives, shared components (tables, drawers, step cards, evidence views)
src/pages/            the 17 pages
src/report/           the standalone print-ready HTML report at /report/:runId
scripts/check-names.mjs, scripts/smoke.mjs
```

Scoring rules, in words: the confidence score is seven weighted components (automation coverage 25,
pass rate 25, interface integrity 15, evidence completeness 10, self-healing stability 10, segregation
of duties 8, reconciliation match 7) and any open critical finding caps it at 79. The release gate is
six weighted components; **85 or more with no open critical finding is GO, 60 to 84 is CONDITIONAL, an
open critical finding can never be better than CONDITIONAL, and below 60 - or a step that failed
without an explanation - is NO-GO**.

## Notes and known limits

- Mock screenshots are rendered panels, not images, and the document checks render a styled document
  preview rather than a real PDF file. No client screens or binary assets are used.
- Dates are anchored to **October 2026** (close on 31 Oct 2026) so the freeze calendar and the 30-day
  trend read as current.
- The requirement mapping R1 to R10 is taken from the brief. The Requirement Coverage page carries the
  note: *"Mapping to be verified against the client's requirement document."*
- Two small changes against `MASTER_PLAN.md`: the landscape has **14 interfaces** rather than 13 (a
  shop-floor interface was added for the in-house laboratory app), and NO-GO is triggered by a score
  below 60, an unexplained failure or four or more open critical findings, rather than by two criticals.

J2W · POC – mock data for demonstration
