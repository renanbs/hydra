#!/usr/bin/env node
// Orca drift report. For every Hydra file that declares `Ported from Orca` and a
// `Source:` path, compare it with the upstream file at the pinned Orca checkout.
// Exit code is always 0: this is a report, not a gate.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ORCA = process.env.ORCA_ROOT ?? path.join(process.env.HOME, 'src/orca')
const ORCA_RENDERER = path.join(ORCA, 'src/renderer/src')
const HYDRA_SRC = path.resolve('src')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

const SOURCE_LINE = /^\/\/\s*Source:\s*(.+)$/m

/** The attribution/parity comment block is Hydra's; upstream never has it. */
function stripAttribution(text) {
  const lines = text.split('\n')
  let index = 0
  while (index < lines.length && lines[index].startsWith('//')) index += 1
  return lines.slice(index).join('\n')
}
const ATTRIBUTION = /Ported from Orca/i

// Basename index for files that carry attribution but no machine-readable Source.
const orcaFiles = []
function walkOrca(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkOrca(full)
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) orcaFiles.push(full)
  }
}
walkOrca(path.join(ORCA_RENDERER, 'components'))
const byBasename = new Map()
for (const file of orcaFiles) {
  const list = byBasename.get(path.basename(file)) ?? []
  list.push(file)
  byBasename.set(path.basename(file), list)
}

const rows = []
for (const file of walk(HYDRA_SRC)) {
  const text = fs.readFileSync(file, 'utf8')
  if (!ATTRIBUTION.test(text)) continue
  const match = SOURCE_LINE.exec(text.slice(0, 1200))
  if (!match) {
    const candidates = byBasename.get(path.basename(file)) ?? []
    if (candidates.length === 1) {
      const upstreamText = fs.readFileSync(candidates[0], 'utf8')
      rows.push({
        file,
        rel: path.relative(ORCA_RENDERER, candidates[0]),
        status: stripAttribution(upstreamText) === stripAttribution(text) ? 'identical' : 'drifted',
        inferred: true,
        upstreamLines: upstreamText.split('\n').length,
        hydraLines: text.split('\n').length
      })
    } else {
      rows.push({ file, status: candidates.length === 0 ? 'no-source' : 'ambiguous' })
    }
    continue
  }
  const rel = match[1]
    .trim()
    .split(/\s+/)[0]
    .replace(/^orca\//, '')
    .replace(/^src\/renderer\/src\//, '')
    .replace(/^src\//, '')
  const candidates = [
    path.join(ORCA_RENDERER, rel),
    path.join(ORCA_RENDERER, 'components', rel),
    path.join(ORCA_RENDERER, 'components/sidebar', rel),
    path.join(ORCA, 'src', rel),
    path.join(ORCA, 'src/shared', rel)
  ]
  const upstream = candidates.find((candidate) => fs.existsSync(candidate))
  if (!upstream) {
    rows.push({ file, status: 'missing-upstream', rel })
    continue
  }
  const upstreamText = fs.readFileSync(upstream, 'utf8')
  rows.push({
    file,
    rel,
    status: stripAttribution(upstreamText) === stripAttribution(text) ? 'identical' : 'drifted',
    upstreamLines: upstreamText.split('\n').length,
    hydraLines: text.split('\n').length
  })
}

let sha = 'unknown'
try {
  sha = execFileSync('git', ['-C', ORCA, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
} catch {}

const counts = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {})
console.log(`Orca @ ${sha}`)
console.log(Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('  '))
for (const row of rows.filter((r) => r.status !== 'identical')) {
  const detail = row.status === 'drifted' ? ` (${row.upstreamLines} upstream / ${row.hydraLines} hydra)` : ` ${row.rel ?? ''}`
  console.log(`${row.status.padEnd(16)} ${path.relative(process.cwd(), row.file)}${detail}`)
}
