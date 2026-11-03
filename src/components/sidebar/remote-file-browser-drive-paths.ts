// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/remote-file-browser-drive-paths.ts
// Windows drive paths on a remote host: the client's own platform must never decide the shape.
import type { FilesystemPathFlavor } from '../../shared/filesystem-entry-types'

export type BrowsePathParts =
  | { kind: 'posix'; segments: string[] }
  | { kind: 'drive'; driveRoot: string; segments: string[] }

// Bare `M:` is a root here because forwarding it would be drive-relative.
const DRIVE_ANCHOR_RE = /^[A-Za-z]:([\\/]|$)/

export function isDrivePath(path: string): boolean {
  return DRIVE_ANCHOR_RE.test(path)
}

export function isDriveRoot(path: string): boolean {
  return /^[A-Za-z]:[\\/]?$/.test(path)
}

export function driveRootOf(path: string): string {
  return `${path[0]!.toUpperCase()}:\\`
}

/** Splits a browse path, accepting either separator on Windows hosts. */
export function splitBrowsePath(
  path: string,
  pathFlavor: FilesystemPathFlavor = 'posix'
): BrowsePathParts {
  if (pathFlavor === 'win32' && isDrivePath(path)) {
    return {
      kind: 'drive',
      driveRoot: driveRootOf(path),
      segments: path.slice(2).split(/[\\/]/).filter(Boolean)
    }
  }
  return { kind: 'posix', segments: path.split('/').filter(Boolean) }
}

// Backslash targets the remote Windows host regardless of the client's platform.
export function joinDrivePath(base: string, name: string): string {
  return `${base.replace(/[\\/]+$/, '')}\\${name}`
}

// Up from a drive root returns to the host drive list.
export function parentOfDrivePath(path: string): string {
  if (isDriveRoot(path)) {
    return '/'
  }
  const parts = splitBrowsePath(path, 'win32')
  if (parts.kind !== 'drive') {
    return path
  }
  const parentSegments = parts.segments.slice(0, -1)
  return parentSegments.length === 0
    ? parts.driveRoot
    : `${parts.driveRoot}${parentSegments.join('\\')}`
}

export function driveBreadcrumbPath(
  driveRoot: string,
  segments: string[],
  endIndex: number
): string {
  const kept = segments.slice(0, endIndex + 1)
  return kept.length === 0 ? driveRoot : `${driveRoot}${kept.join('\\')}`
}
