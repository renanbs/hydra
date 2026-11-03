// Windows drive handling for a remote host. The client platform must not decide the shape:
// a POSIX folder literally named `M:` is a folder, not a drive.
import { describe, expect, it } from 'vitest'
import {
  driveBreadcrumbPath,
  driveRootOf,
  isDrivePath,
  isDriveRoot,
  joinDrivePath,
  parentOfDrivePath,
  splitBrowsePath
} from './remote-file-browser-drive-paths'

describe('drive anchors', () => {
  it('detects drive paths and roots only with an anchor or a separator', () => {
    expect(isDrivePath('M:')).toBe(true)
    expect(isDrivePath('M:\\work')).toBe(true)
    expect(isDrivePath('M:/work')).toBe(true)
    expect(isDrivePath('M:docs')).toBe(false)
    expect(isDriveRoot('M:')).toBe(true)
    expect(isDriveRoot('M:\\')).toBe(true)
    expect(isDriveRoot('M:\\work')).toBe(false)
  })

  it('normalizes the root to an upper-case drive with a backslash', () => {
    expect(driveRootOf('m:\\work')).toBe('M:\\')
    expect(driveRootOf('M:/')).toBe('M:\\')
  })
})

describe('split/join/parent', () => {
  it('splits drive paths on either separator and posix paths on slashes', () => {
    expect(splitBrowsePath('M:\\work/app', 'win32')).toEqual({
      kind: 'drive',
      driveRoot: 'M:\\',
      segments: ['work', 'app']
    })
    expect(splitBrowsePath('/srv/app')).toEqual({ kind: 'posix', segments: ['srv', 'app'] })
    // A POSIX folder named like a drive stays a posix name.
    expect(splitBrowsePath('/M:/work')).toEqual({ kind: 'posix', segments: ['M:', 'work'] })
  })

  it('joins with backslashes and walks up to the host drive list', () => {
    expect(joinDrivePath('M:\\work\\', 'app')).toBe('M:\\work\\app')
    expect(parentOfDrivePath('M:\\work\\app')).toBe('M:\\work')
    expect(parentOfDrivePath('M:\\work')).toBe('M:\\')
    expect(parentOfDrivePath('M:\\')).toBe('/')
  })

  it('rebuilds a breadcrumb path for a segment index', () => {
    expect(driveBreadcrumbPath('M:\\', ['work', 'app'], 1)).toBe('M:\\work\\app')
    expect(driveBreadcrumbPath('M:\\', [], 0)).toBe('M:\\')
  })
})
