#!/usr/bin/env node
// Copy one Hydra port back to its Orca source (verbatim body + attribution header).
// Resolves the upstream file by basename under the Orca sidebar tree.
import fs from 'node:fs'
import path from 'node:path'

const ORCA_ROOT = path.join(process.env.HOME, 'src/orca')
const ORCA_COMPONENTS = path.join(ORCA_ROOT, 'src/renderer/src/components')

function findOrca(basename) {
  const matches = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name === basename && !/\.test\./.test(entry.name)) matches.push(full)
    }
  }
  walk(ORCA_COMPONENTS)
  return matches
}

const [hydraRel] = process.argv.slice(2)
if (!hydraRel) {
  console.error('usage: node scripts/copy-orca.mjs <hydra-file>')
  process.exit(1)
}
const matches = findOrca(path.basename(hydraRel))
if (matches.length !== 1) {
  console.error(`${hydraRel}: ${matches.length} upstream matches — resolve manually`)
  process.exit(2)
}
const upstreamRel = path.relative(path.join(ORCA_ROOT, 'src/renderer/src'), matches[0])
let body = fs.readFileSync(matches[0], 'utf8')
// Drop any leading comment block so the canonical header is the only one.
const lines = body.split('\n')
let index = 0
while (index < lines.length && lines[index].startsWith('//')) index += 1
body = lines.slice(index).join('\n')
const header = [
  '// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)',
  `// Source: ${upstreamRel}`,
  ''
].join('\n')
// Orca's deep relative imports assume its own directory depth. Hydra aliases
// `@/` to src/, so escaping relative imports become aliases instead of `../` runs.
body = body.replace(/(?:\.\.\/)+(?=(shared|lib|i18n|runtime)\/)/g, '@/')
body = body.replace(/\/@\//g, '@/')
fs.writeFileSync(hydraRel, header + body)
console.log(`copied ${hydraRel} <- ${upstreamRel}`)
