#!/usr/bin/env node
/**
 * Forbidden-name scan (MASTER_PLAN section 6).
 * Fails the build if any client company, person, location or client system name
 * appears anywhere in the project (node_modules / dist / .git excluded).
 *
 * This file is excluded from its own scan.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vite', 'coverage', '.vscode', '.idea'])
const SKIP_FILES = new Set(['check-names.mjs', 'package-lock.json'])
const BINARY = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|pdf|zip|mp4)$/i

// Built from the forbidden list so the literals are not spelled out in one place.
const FORBIDDEN = [
  ['A', 'p', 'e', 'r', 'a', 'm'],
  ['Y', 'a', 'r', 'd', 'L', 'i', 'n', 'k'],
  ['d', 'O', 'p', 's'],
  ['P', 'e', 'g', 'a', 's', 'e'],
  ['O', 'n', 'e', 'C', 'o', 'r', 'e'],
  ['H', 'y', 'd', 'e', 'r', 'a', 'b', 'a', 'd'],
  ['G', 'C', 'C'],
].map((parts) => parts.join(''))

const files = []
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full)
      continue
    }
    if (SKIP_FILES.has(entry) || BINARY.test(entry)) continue
    files.push(full)
  }
}
walk(ROOT)

const hits = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  for (const term of FORBIDDEN) {
    const re = new RegExp(`\\b${term}\\b`, 'i')
    lines.forEach((line, i) => {
      if (re.test(line)) {
        hits.push({ file: relative(ROOT, file).split(sep).join('/'), line: i + 1, term, text: line.trim().slice(0, 120) })
      }
    })
  }
}

if (hits.length === 0) {
  console.log(`check:names  OK  -  0 forbidden names in ${files.length} scanned files`)
  process.exit(0)
}

console.error(`check:names  FAILED  -  ${hits.length} forbidden name(s) found:`)
for (const hit of hits) console.error(`  ${hit.file}:${hit.line}  [${hit.term}]  ${hit.text}`)
process.exit(1)
