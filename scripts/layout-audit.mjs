#!/usr/bin/env node
/**
 * Layout audit: static checks for the rules that keep every page inside the
 * screen width at 1366, 1536 and 1920 px.
 *
 * 1. multi-column grids are responsive, so they stack on narrower screens
 * 2. fraction columns use minmax(0, ...), so a wide table cannot push the grid
 * 3. a fixed min-width of 40rem or more only sits inside a horizontal scroller
 * 4. the global guards are in place (page overflow, grid child min-width)
 * 5. the shell resets the scroll position of the scrolling element on navigation
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(process.cwd(), 'src')
const read = (path) => readFileSync(join(SRC, path), 'utf8')

const problems = []
const note = (file, message) => problems.push(`${file}: ${message}`)

/* ---------------------------------------------------- global guards */

const css = read('index.css')
const cssChecks = [
  ['body horizontal overflow hidden', /body\s*\{[^}]*overflow-x:\s*hidden/s],
  ['grid children may shrink', /\.grid\s*>\s*\*\s*\{\s*min-width:\s*0/],
  ['cards, tables and payloads may shrink', /\.card,\s*\n?\s*table,\s*\n?\s*pre\s*\{\s*min-width:\s*0/],
]
for (const [label, pattern] of cssChecks) {
  if (!pattern.test(css)) note('index.css', `missing guard: ${label}`)
}

const shell = read('components/layout/AppShell.tsx')
if (!/overflow-x-hidden/.test(shell)) note('AppShell.tsx', 'the scrolling main element may scroll sideways')
if (!/scrollTop = 0/.test(shell)) note('AppShell.tsx', 'no scroll reset on navigation')
if (!/location\.key/.test(shell)) note('AppShell.tsx', 'the scroll reset does not run on every navigation')

const sidebar = read('components/layout/Sidebar.tsx')
if (!/scrollTop/.test(sidebar)) note('Sidebar.tsx', 'the sidebar does not manage its own scroll position')

const overlays = read('components/ui/overlays.tsx')
if (!/fixed inset-0 z-50/.test(overlays)) note('overlays.tsx', 'drawers and dialogs are not fixed on top')
if ((overlays.match(/event\.key === 'Escape'/g) ?? []).length < 2) note('overlays.tsx', 'Esc does not close both overlays')

/* ----------------------------------------------------- page checks */

const SCROLL_WRAPPERS = /overflow-x-auto|overflow-auto|scroll-thin overflow/
const pages = readdirSync(join(SRC, 'pages')).filter((name) => name.endsWith('.tsx'))
const reports = readdirSync(join(SRC, 'report')).filter((name) => name.endsWith('.tsx'))
const files = [...pages.map((name) => `pages/${name}`), ...reports.map((name) => `report/${name}`)]

const results = []

for (const file of files) {
  const text = read(file)
  const found = []

  // 1 + 2: explicit column templates
  for (const match of text.matchAll(/grid-cols-\[([^\]]+)\]/g)) {
    const template = match[1]
    const full = match[0]
    const prefixed = new RegExp(`(sm|md|lg|xl|2xl):${full.replace(/[[\]().,]/g, (c) => '\\' + c)}`).test(text)
    if (!prefixed) found.push(`"${full}" has no responsive prefix, so it never stacks`)
    if (/\d+(\.\d+)?fr/.test(template) && !/minmax\(0/.test(template)) {
      found.push(`"${full}" uses fr columns without minmax(0, ...), so wide content can push the page`)
    }
  }

  // 3: wide fixed widths must live inside a horizontal scroller
  for (const match of text.matchAll(/min-w-\[(\d+(?:\.\d+)?)rem\]/g)) {
    const rem = Number(match[1])
    if (rem < 40) continue
    const around = text.slice(Math.max(0, match.index - 400), match.index)
    if (!SCROLL_WRAPPERS.test(around)) {
      found.push(`min-w-[${rem}rem] is not inside a horizontal scroller`)
    }
  }

  // 4: raw tables must be wrapped; the shared components already are
  for (const match of text.matchAll(/<table\b/g)) {
    const around = text.slice(Math.max(0, match.index - 300), match.index)
    if (!SCROLL_WRAPPERS.test(around)) found.push('a raw <table> is not inside a horizontal scroller')
  }

  results.push({ file, found })
  found.forEach((message) => note(file, message))
}

/* ------------------------------------------------------------ report */

const NAMES = {
  'pages/CommandCentre.tsx': '1. Command Centre',
  'pages/Landscape.tsx': '2. Landscape',
  'pages/Discovery.tsx': '3. Process Discovery',
  'pages/TestStudio.tsx': '4. Test Studio',
  'pages/TestData.tsx': '5. Test Data',
  'pages/RunCentre.tsx': '6. Run Centre',
  'pages/Interfaces.tsx': '7. Interfaces',
  'pages/Regression.tsx': '8. Regression & Change Impact',
  'pages/LoadTest.tsx': '9. Month-End Load',
  'pages/AccessSod.tsx': '10. Access & SoD',
  'pages/Reconciliation.tsx': '11. Reconciliation',
  'pages/SelfHealing.tsx': '12. Self-Healing',
  'pages/Evidence.tsx': '13. Evidence & Reports',
  'pages/Release.tsx': '14. Release & Close Readiness',
  'pages/Approvals.tsx': '15. Approvals',
  'pages/Delivery.tsx': '16. Delivery Model',
  'pages/Coverage.tsx': '17. Requirement Coverage',
  'report/FindingCard.tsx': '18. Finding card',
  'report/RunSummary.tsx': '19. Run summary',
  'report/ReleaseReport.tsx': '20. Release report',
  'report/EvidencePack.tsx': '21. Audit evidence pack',
  'report/ReportFrame.tsx': '22. Report frame (shared)',
}

console.log('page width audit (1366 / 1536 / 1920 px rules)')
for (const { file, found } of results.sort((a, b) =>
  (NAMES[a.file] ?? a.file).localeCompare(NAMES[b.file] ?? b.file, 'en', { numeric: true }),
)) {
  console.log(`  ${found.length === 0 ? 'OK  ' : 'FAIL'} ${NAMES[file] ?? file}`)
  found.forEach((message) => console.log(`       - ${message}`))
}

if (problems.length > 0) {
  console.error(`\nlayout-audit: ${problems.length} problem(s)`)
  process.exit(1)
}
console.log('\nlayout-audit: all pages pass the width and scroll rules')
