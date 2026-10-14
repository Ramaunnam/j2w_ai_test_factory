#!/usr/bin/env node
/**
 * Smoke test.
 *
 * Part 1 loads every route in jsdom and fails on any runtime error or empty page.
 * Part 2 clicks through the mock flows (run, generate, discover, check, trace,
 * load, approve, reconcile, heal) and asserts the expected result appears.
 *
 * Run `npm run smoke` (it builds the classic-script bundle first).
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { JSDOM, VirtualConsole } from 'jsdom'

const DIST = join(process.cwd(), 'dist-smoke')
const PORT = 4178

const ROUTES = [
  '/',
  '/landscape',
  '/discovery',
  '/studio',
  '/test-data',
  '/run',
  '/interfaces',
  '/regression',
  '/load',
  '/access-sod',
  '/reconciliation',
  '/self-healing',
  '/evidence',
  '/release',
  '/approvals',
  '/delivery',
  '/coverage',
  '/finding/F-001',
  '/finding/F-006',
  '/report/RUN-1042',
  '/release-report/REL-2026-10',
  '/evidence-pack/RUN-1042',
]

/** Each flow: open a route, click things, then expect text to appear. */
const FLOWS = [
  {
    name: 'Run Centre: live P1 demo run (healed step, blocked step, weight finding)',
    route: '/run',
    steps: [
      { click: 'Run the P1 demo now', wait: 16000 },
      { expect: ['step 1:', 'net weight', 'f-001'] },
    ],
  },
  {
    name: 'Test Studio: AI generates scenarios',
    route: '/studio',
    steps: [
      { click: 'Generate scenarios with AI', wait: 5000 },
      { expect: ['ai: reading the discovered process map'] },
    ],
  },
  {
    name: 'Process Discovery: mine sessions and logs into a process map',
    route: '/discovery',
    steps: [
      { click: 'Discover', wait: 6500 },
      { expect: ['session ds-001'] },
    ],
  },
  {
    name: 'Landscape: plain-English rule becomes a data check',
    route: '/landscape',
    steps: [
      { click: 'Data sources and checks', wait: 800 },
      { click: 'Translate and run', wait: 3500 },
      { expect: ['ai: reading the rule'] },
    ],
  },
  {
    name: 'Month-End Load: run a profile and check integrity',
    route: '/load',
    steps: [
      { click: 'Run load test', wait: 6500 },
      { expect: ['load test started', 'minute 4'] },
    ],
  },
  {
    name: 'Interfaces: follow the truck across every system',
    route: '/interfaces',
    steps: [
      { click: 'Follow the truck', wait: 2000 },
      { expect: ['vh-7741'] },
    ],
  },
  {
    name: 'Test Data: generate a linked data set',
    route: '/test-data',
    steps: [
      { click: 'Generate', wait: 4500 },
      { expect: ['ai: generating'] },
    ],
  },
  {
    name: 'Approvals: approve the first item in the queue',
    route: '/approvals',
    steps: [
      { click: 'Approve', wait: 1800 },
      { expect: ['decided'] },
    ],
  },
  {
    name: 'Reconciliation: run a reconciliation set',
    route: '/reconciliation',
    steps: [
      { click: 'Run this reconciliation', wait: 5000 },
      { expect: ['reconciliation started'] },
    ],
  },
  {
    name: 'Self-Healing: analyse a change and propose a repair',
    route: '/self-healing',
    steps: [
      { click: 'Analyse', wait: 4500 },
      { expect: ['ai: analysing change'] },
    ],
  },
  {
    name: 'Report: a run started in this session opens its full report',
    route: '/run',
    steps: [
      { click: 'Run the P1 demo now', wait: 1200 },
      { click: '4x', wait: 26000 },
      // the step time must be real, not 0s
      { expectNot: ['0s of step time'] },
      { click: 'Open run summary', wait: 2500 },
      { expect: ['run summary', 'result per scenario', 'approvals and sign-off'] },
      { expectNot: ['that run is not in this tab'] },
    ],
  },
  {
    name: 'Finding card: impact, records and Create defect',
    route: '/finding/F-001',
    steps: [
      { expect: ['business impact', 'affected records', 'recommended fix', 'open run summary'] },
      { click: 'Create defect', wait: 1500 },
      { expect: ['def-2026'] },
    ],
  },
  {
    name: 'Audit evidence pack: expand all shows the steps and their assertions',
    route: '/evidence-pack/RUN-1042',
    steps: [
      { expect: ['audit evidence pack', 'result per requirement', 'bundle and hashes'] },
      { click: 'Expand all', wait: 1200 },
      { expect: ['assertions', 'expected', 'evb-1042-01'] },
    ],
  },
  {
    name: 'Release report: verdict, breakdown, risk and recommendation',
    route: '/release-report/REL-2026-10',
    steps: [
      {
        expect: [
          'release report',
          'score breakdown',
          'open findings by severity',
          'risk before the month-end close',
          'recommendation',
          'sign-off',
        ],
      },
    ],
  },
  {
    name: 'Regression: the baseline comparison is computed from the real step results',
    route: '/regression',
    steps: [
      { click: 'MES-2026.10-SCHEMA', wait: 1200 },
      { click: 'Run regression for this change', wait: 32000 },
      { expect: ['baseline comparison', 'not comparable', 'step time', 'baseline'] },
      { expectNot: ['duration change'] },
    ],
  },
]

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

if (!existsSync(DIST)) {
  console.error('smoke: dist-smoke/ not found - run the smoke build first')
  process.exit(1)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`)
  const filePath = join(DIST, normalize(url.pathname))
  try {
    if (extname(url.pathname) && existsSync(filePath)) {
      const body = await readFile(filePath)
      response.writeHead(200, { 'Content-Type': TYPES[extname(url.pathname)] ?? 'application/octet-stream' })
      response.end(body)
      return
    }
    const html = (await readFile(join(DIST, 'index.html'), 'utf8'))
      .replace(/ type="module"/g, '')
      .replace(/ crossorigin/g, '')
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(html)
  } catch (error) {
    response.writeHead(500)
    response.end(String(error))
  }
})

await new Promise((resolve) => server.listen(PORT, resolve))

// jsdom gaps, not application errors. window.open is deliberately left
// unimplemented so the flow exercises the same-tab fallback.
const IGNORED =
  /Could not parse CSS|Not implemented: HTMLCanvasElement|Not implemented: Window's open|css parsing|getComputedStyle/i

async function open(route) {
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => errors.push(error.message))
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')))

  const dom = await JSDOM.fromURL(`http://localhost:${PORT}${route}`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      window.matchMedia =
        window.matchMedia ??
        (() => ({
          matches: false,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {},
        }))
      window.scrollTo = () => {}
      window.HTMLElement.prototype.scrollIntoView = () => {}
      window.Element.prototype.scrollTo = () => {}
      window.print = () => {}
    },
  })
  return { dom, errors }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const textOf = (dom) => (dom.window.document.body.textContent ?? '').replace(/\s+/g, ' ')

function clickByText(dom, label) {
  const nodes = Array.from(dom.window.document.querySelectorAll('button, a, tr'))
  const target = nodes.find((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim().includes(label))
  if (!target) return false
  target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, view: dom.window }))
  return true
}

let failures = 0

console.log('--- routes')
for (const route of ROUTES) {
  const { dom, errors } = await open(route)
  await sleep(2200)
  const text = textOf(dom).trim()
  const rendered = (dom.window.document.getElementById('root')?.children.length ?? 0) > 0 && text.length > 60
  const realErrors = errors.filter((message) => !IGNORED.test(message))

  if (!rendered || realErrors.length > 0) {
    failures += 1
    console.error(`FAIL ${route}`)
    if (!rendered) console.error(`     nothing rendered (text length ${text.length})`)
    realErrors.slice(0, 3).forEach((message) => console.error(`     ${message.split('\n')[0]}`))
  } else {
    console.log(`ok   ${route}  (${text.length} chars)`)
  }
  dom.window.close()
}

console.log('\n--- flows')
for (const flow of FLOWS) {
  const { dom, errors } = await open(flow.route)
  await sleep(2400)
  let problem = null

  for (const step of flow.steps) {
    if (step.click) {
      if (!clickByText(dom, step.click)) {
        problem = `button "${step.click}" not found`
        break
      }
      await sleep(step.wait ?? 1500)
    }
    if (step.expect) {
      const text = textOf(dom).toLowerCase()
      const missing = step.expect.filter((needle) => !text.includes(needle.toLowerCase()))
      if (missing.length > 0) {
        problem = `expected text missing: ${missing.join(' | ')}`
        break
      }
    }
    if (step.expectNot) {
      const text = textOf(dom).toLowerCase()
      const present = step.expectNot.filter((needle) => text.includes(needle.toLowerCase()))
      if (present.length > 0) {
        problem = `text that should be gone is still there: ${present.join(' | ')}`
        break
      }
    }
  }

  const realErrors = errors.filter((message) => !IGNORED.test(message))
  if (problem || realErrors.length > 0) {
    failures += 1
    console.error(`FAIL ${flow.name}`)
    if (problem) console.error(`     ${problem}`)
    realErrors.slice(0, 3).forEach((message) => console.error(`     ${message.split('\n')[0]}`))
  } else {
    console.log(`ok   ${flow.name}`)
  }
  dom.window.close()
}

server.close()

if (failures > 0) {
  console.error(`\nsmoke: ${failures} check(s) failed`)
  process.exit(1)
}
console.log(`\nsmoke: ${ROUTES.length} routes and ${FLOWS.length} mock flows all passed`)
