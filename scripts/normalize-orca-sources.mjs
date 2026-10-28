#!/usr/bin/env node
// Normalize the `Source:` line of every file that claims to be an Orca port.
// Dry-run by default; pass --write to rewrite the headers.
import fs from 'node:fs'
import path from 'node:path'

const ORCA = path.join(process.env.HOME, 'src/orca')
const ORCA_SRC = path.join(ORCA, 'src')
const ROOTS = [path.join(ORCA_SRC, 'renderer/src'), path.join(ORCA_SRC, 'shared')]
const write = process.argv.includes('--write')

const byBasename = new Map()
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      const list = byBasename.get(entry.name) ?? []
      list.push(full)
      byBasename.set(entry.name, list)
    }
  }
}
for (const root of ROOTS) walk(root)

function relToOrca(file) {
  for (const root of ROOTS) {
    if (file.startsWith(root + path.sep)) return path.relative(root, file)
  }
  return null
}

function resolves(rel) {
  return ROOTS.some((root) => fs.existsSync(path.join(root, rel)))
}

function walkHydra(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkHydra(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full)
  }
  return out
}

const SOURCE = /^\/\/\s*Source:\s*(.+)$/m
const stats = { ok: 0, rewritten: 0, added: 0, unresolved: 0, ambiguous: 0, noAttribution: 0 }
const unresolved = []

for (const file of walkHydra('src')) {
  const text = fs.readFileSync(file, 'utf8')
  if (!/Ported from Orca/i.test(text)) {
    stats.noAttribution += 1
    continue
  }
  const match = SOURCE.exec(text.slice(0, 1200))
  const rawDeclared = match ? match[1].trim().split(/\s+/)[0].replace(/^orca\//, '') : null
  const declared = rawDeclared
    ? rawDeclared.replace(/^src\/renderer\/src\//, '').replace(/^src\//, '')
    : null
  if (declared && resolves(declared)) {
    stats.ok += 1
    continue
  }
  const candidates = byBasename.get(path.basename(file)) ?? []
  if (candidates.length !== 1) {
    if (candidates.length > 1) stats.ambiguous += 1
    else stats.unresolved += 1
    unresolved.push(`${candidates.length} ${file}${declared ? ` (declared ${declared})` : ''}`)
    continue
  }
  const resolved = relToOrca(candidates[0])
  if (!resolved) {
    stats.unresolved += 1
    unresolved.push(`no-root ${file}`)
    continue
  }
  if (!write) {
    stats[match ? 'rewritten' : 'added'] += 1
    continue
  }
  const line = `// Source: ${resolved}`
  const next = match
    ? text.replace(match[0], line)
    : text.replace(/(\/\/ Ported from Orca[^\n]*\n)/, `$1${line}\n`)
  fs.writeFileSync(file, next)
  stats[match ? 'rewritten' : 'added'] += 1
}

console.log(`${write ? 'APPLIED' : 'DRY-RUN'}`, JSON.stringify(stats))
for (const line of unresolved.slice(0, 40)) console.log('  ', line)
