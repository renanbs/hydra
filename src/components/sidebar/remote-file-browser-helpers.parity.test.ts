// Remote file-browser path grammar: filter vs path mode, parent/join navigation, per-segment
// resolution, and the guards that keep huge or structurally hostile input away from the
// remote shell. These are the decisions the picker makes; the listing transport is separate.
import { describe, expect, it } from 'vitest'
import {
  decideEnterAction,
  decideEscAction,
  filterEntries,
  isPathMode,
  isRemoteFileBrowserFilterQueryTooLarge,
  joinPath,
  parsePathInput,
  parentPath,
  resolveSegmentStep,
  shouldDeferRemoteFileBrowserPasteResolve
} from './remote-file-browser-helpers'

const entries = [
  { name: 'Documents', isDirectory: true },
  { name: 'downloads', isDirectory: true },
  { name: 'readme.md', isDirectory: false }
]

describe('filterEntries', () => {
  it('is case-insensitive and keeps everything for a blank filter', () => {
    expect(filterEntries(entries, 'DOC').map((entry) => entry.name)).toEqual(['Documents'])
    expect(filterEntries(entries, '  ')).toHaveLength(3)
  })

  it('returns nothing for an over-limit query', () => {
    expect(isRemoteFileBrowserFilterQueryTooLarge('x'.repeat(2049))).toBe(true)
    expect(filterEntries(entries, 'x'.repeat(2049))).toEqual([])
  })
})

describe('keyboard decisions', () => {
  it('navigates into the single folder match, even beside files', () => {
    expect(decideEnterAction([entries[0]!, entries[2]!])).toEqual({
      type: 'navigate',
      name: 'Documents'
    })
  })

  it('hints at files and no-ops on ambiguity', () => {
    expect(decideEnterAction([entries[2]!])).toEqual({ type: 'fileHint' })
    expect(decideEnterAction(entries)).toEqual({ type: 'noop' })
    expect(decideEnterAction([])).toEqual({ type: 'noop' })
  })

  it('clears a non-empty filter before closing on Escape', () => {
    expect(decideEscAction('doc')).toEqual({ type: 'clearFilter' })
    expect(decideEscAction('')).toEqual({ type: 'cancel' })
  })
})

describe('navigation paths', () => {
  it('joins posix and win32 paths', () => {
    expect(joinPath('/', 'srv')).toBe('/srv')
    expect(joinPath('/srv', 'app')).toBe('/srv/app')
    expect(joinPath('M:\\work', 'app', 'win32')).toBe('M:\\work\\app')
    expect(joinPath('/', 'M:', 'win32')).toBe('M:\\')
  })

  it('walks up to the root and from a drive root to the host list', () => {
    expect(parentPath('/srv/app')).toBe('/srv')
    expect(parentPath('/srv')).toBe('/')
    expect(parentPath('/', 'posix')).toBe('/')
    expect(parentPath('M:\\work\\app', 'win32')).toBe('M:\\work')
    expect(parentPath('M:\\work', 'win32')).toBe('M:\\')
    expect(parentPath('M:\\', 'win32')).toBe('/')
  })
})

describe('path mode', () => {
  it('detects separators, base markers and drive anchors', () => {
    expect(isPathMode('/srv')).toBe(true)
    expect(isPathMode('~')).toBe(true)
    expect(isPathMode('..')).toBe(true)
    expect(isPathMode('doc')).toBe(false)
    expect(isPathMode('M:', 'win32')).toBe(true)
    expect(isPathMode('M:', 'posix')).toBe(false)
  })

  it('parses absolute, home, cwd and drive inputs', () => {
    expect(parsePathInput('/srv/ap')).toEqual({
      mode: 'path',
      base: 'root',
      committedSegments: ['srv'],
      trailingFilter: 'ap'
    })
    expect(parsePathInput('~/work/')).toEqual({
      mode: 'path',
      base: 'home',
      committedSegments: ['work'],
      trailingFilter: ''
    })
    expect(parsePathInput('..')).toEqual({
      mode: 'path',
      base: 'cwd',
      committedSegments: ['..'],
      trailingFilter: ''
    })
    expect(parsePathInput('M:\\work\\a', 'win32')).toEqual({
      mode: 'path',
      base: 'drive',
      driveRoot: 'M:\\',
      committedSegments: ['work'],
      trailingFilter: 'a'
    })
  })

  it('rejects repeated separators and control characters', () => {
    expect(parsePathInput('/srv//app')).toMatchObject({
      invalid: 'Invalid path: repeated separators'
    })
    expect(parsePathInput('/srv\u0000app')).toMatchObject({
      invalid: 'Invalid path: control characters are not allowed'
    })
    expect(parsePathInput('/srv\napp')).toMatchObject({
      invalid: 'Invalid path: control characters are not allowed'
    })
  })

  it('defers oversized paste resolution', () => {
    expect(shouldDeferRemoteFileBrowserPasteResolve('x'.repeat(4096))).toBe(true)
    expect(shouldDeferRemoteFileBrowserPasteResolve('/srv/app')).toBe(false)
  })
})

describe('resolveSegmentStep', () => {
  it('prefers an exact match, then case-insensitive, then a unique prefix', () => {
    expect(resolveSegmentStep('Documents', '/', entries)).toEqual({
      type: 'descend',
      name: 'Documents'
    })
    expect(resolveSegmentStep('documents', '/', entries)).toEqual({
      type: 'descend',
      name: 'Documents'
    })
    expect(resolveSegmentStep('down', '/', entries)).toEqual({
      type: 'descend',
      name: 'downloads'
    })
  })

  it('stays put for . and ..', () => {
    expect(resolveSegmentStep('.', '/', entries)).toEqual({ type: 'stay' })
    expect(resolveSegmentStep('..', '/', entries)).toEqual({ type: 'stay' })
  })

  it('explains a file, a missing folder and an ambiguous prefix', () => {
    expect(resolveSegmentStep('readme.md', '/', entries)).toMatchObject({
      type: 'error',
      message: "readme.md isn't a directory in /"
    })
    expect(resolveSegmentStep('nope', '/', entries)).toMatchObject({
      type: 'error',
      message: "nope isn't a directory in /"
    })
    const ambiguous = [
      { name: 'drafts', isDirectory: true },
      { name: 'downloads', isDirectory: true }
    ]
    expect(resolveSegmentStep('d', '/', ambiguous)).toMatchObject({
      type: 'error',
      message: 'd matches multiple directories in /'
    })
  })
})
