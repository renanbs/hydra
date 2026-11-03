// D02a-042: the group-name prefill strips trailing separators and keeps the last
// segment for POSIX, Windows and root paths; scan ids are unique per call.
import { describe, expect, it } from 'vitest'
import {
  createNestedRepoScanId,
  defaultProjectGroupNameForPath
} from './add-repo-dialog-types'

describe('defaultProjectGroupNameForPath (D02a-042)', () => {
  it('returns the last segment of a POSIX path', () => {
    expect(defaultProjectGroupNameForPath('/home/acme/monorepo')).toBe('monorepo')
  })

  it('normalizes Windows separators and trailing slashes', () => {
    expect(defaultProjectGroupNameForPath('C:\\work\\acme\\monorepo\\\\')).toBe('monorepo')
    expect(defaultProjectGroupNameForPath('/home/acme/monorepo/')).toBe('monorepo')
  })

  it('keeps a root path verbatim when it has no segment', () => {
    expect(defaultProjectGroupNameForPath('/')).toBe('/')
  })
})

describe('createNestedRepoScanId (D02a-042)', () => {
  it('prefixes the scan id and returns a fresh value per call', () => {
    const first = createNestedRepoScanId()
    const second = createNestedRepoScanId()
    expect(first).toMatch(/^nested-repo-scan-\d+-[a-z0-9]+$/)
    expect(first).not.toBe(second)
  })
})
