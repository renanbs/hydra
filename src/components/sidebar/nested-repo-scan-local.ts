// D02a-022/023/041: local nested-repository scan.
//
// Orca runs this scan in the host process (`projectGroups.scanNested`) and streams
// progress + a cancellable scan id. Hydra's backend has no nested-scan command, so
// the renderer discovers candidates with two IPC surfaces it already owns:
// `list_directory_cmd` (directory entries, hidden included) and the `.git` marker
// in those entries. That keeps the Add Project review honest: every repository it
// lists is a real directory the host reported, and Stop aborts the traversal.
import { invoke } from '@tauri-apps/api/core'
import type {
  NestedRepoCandidate,
  NestedRepoScanOptions,
  NestedRepoScanResult
} from '../../shared/project-group-types'

type DirectoryEntry = {
  name: string
  path: string
  is_dir: boolean
  is_hidden: boolean
}

type DirectoryListing = {
  path: string
  entries: DirectoryEntry[]
}

/** Directories that never hold a project the user wants in the review list. */
const SKIPPED_DIRECTORY_NAMES: Record<string, true> = {
  node_modules: true,
  '.git': true,
  target: true,
  dist: true,
  build: true,
  '.cache': true,
  vendor: true,
  '.venv': true,
  __pycache__: true,
  '.next': true,
  '.turbo': true
}

const DEFAULT_MAX_DEPTH = 3
const DEFAULT_MAX_REPOS = 100
/** Safety valve for pathological trees; marks the scan as truncated. */
const MAX_VISITED_DIRECTORIES = 500

type LocalNestedScan = {
  controller: AbortController
}

const activeLocalScans = new Map<string, LocalNestedScan>()

function normalizePath(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length > 1 && /[\\/]$/.test(trimmed)) return trimmed.slice(0, -1)
  return trimmed
}

function hasGitMarker(entries: readonly DirectoryEntry[]): boolean {
  return entries.some((entry) => entry.name === '.git')
}

function isSkippedEntry(entry: DirectoryEntry): boolean {
  return !entry.is_dir || entry.is_hidden || SKIPPED_DIRECTORY_NAMES[entry.name] === true
}

function snapshot(args: {
  selectedPath: string
  selectedPathKind: NestedRepoScanResult['selectedPathKind']
  repos: NestedRepoCandidate[]
  truncated: boolean
  timedOut: boolean
  stopped: boolean
  startedAt: number
  maxDepth: number
  maxRepos: number
  timeoutMs: number | null
}): NestedRepoScanResult {
  return {
    selectedPath: args.selectedPath,
    selectedPathKind: args.selectedPathKind,
    repos: [...args.repos],
    truncated: args.truncated,
    timedOut: args.timedOut,
    stopped: args.stopped,
    durationMs: Date.now() - args.startedAt,
    maxDepth: args.maxDepth,
    maxRepos: args.maxRepos,
    timeoutMs: args.timeoutMs
  }
}

/**
 * Abort an in-flight local scan by its scan id. Returns false when the id is
 * unknown (already settled or never started), matching Orca's cancellation API.
 */
export function cancelLocalNestedRepoScan(scanId: string): boolean {
  const active = activeLocalScans.get(scanId)
  if (!active) return false
  active.controller.abort()
  activeLocalScans.delete(scanId)
  return true
}

export async function scanNestedReposLocal(args: {
  path: string
  scanId?: string
  onProgress?: (scan: NestedRepoScanResult) => void
  options?: NestedRepoScanOptions
}): Promise<NestedRepoScanResult> {
  const selectedPath = normalizePath(args.path)
  const maxDepth = args.options?.maxDepth ?? DEFAULT_MAX_DEPTH
  const maxRepos = args.options?.maxRepos ?? DEFAULT_MAX_REPOS
  const timeoutMs = args.options?.timeoutMs ?? null
  const startedAt = Date.now()
  const controller = new AbortController()
  if (args.scanId) {
    activeLocalScans.set(args.scanId, { controller })
  }

  const repos: NestedRepoCandidate[] = []
  let truncated = false
  let timedOut = false
  let visited = 0

  const emit = (selectedPathKind: NestedRepoScanResult['selectedPathKind']) => {
    args.onProgress?.(
      snapshot({
        selectedPath,
        selectedPathKind,
        repos,
        truncated,
        timedOut,
        stopped: controller.signal.aborted,
        startedAt,
        maxDepth,
        maxRepos,
        timeoutMs
      })
    )
  }

  const list = async (directory: string): Promise<DirectoryEntry[]> => {
    const listing = await invoke<DirectoryListing>('list_directory_cmd', { path: directory })
    return listing.entries ?? []
  }

  try {
    const rootEntries = await list(selectedPath)
    if (hasGitMarker(rootEntries)) {
      emit('git_repo')
      return snapshot({
        selectedPath,
        selectedPathKind: 'git_repo',
        repos,
        truncated,
        timedOut,
        stopped: false,
        startedAt,
        maxDepth,
        maxRepos,
        timeoutMs
      })
    }

    const queue: Array<{ path: string; depth: number }> = rootEntries
      .filter((entry) => !isSkippedEntry(entry))
      .map((entry) => ({ path: entry.path, depth: 1 }))

    while (queue.length > 0) {
      if (controller.signal.aborted) break
      if (timeoutMs !== null && Date.now() - startedAt >= timeoutMs) {
        timedOut = true
        break
      }
      if (repos.length >= maxRepos) {
        truncated = true
        break
      }
      if (visited >= MAX_VISITED_DIRECTORIES) {
        truncated = true
        break
      }
      const next = queue.shift()
      if (!next || next.depth > maxDepth) continue
      visited += 1

      let entries: DirectoryEntry[]
      try {
        entries = await list(next.path)
      } catch {
        // Why: an unreadable child must not abort the whole review; the host
        // already answered for the parent, so skip just this subtree.
        continue
      }
      if (hasGitMarker(entries)) {
        repos.push({
          path: next.path,
          displayName: next.path.split(/[\\/]/).findLast(Boolean) ?? next.path,
          depth: next.depth
        })
        emit('non_git_folder')
        continue
      }
      if (next.depth < maxDepth) {
        for (const entry of entries) {
          if (!isSkippedEntry(entry)) {
            queue.push({ path: entry.path, depth: next.depth + 1 })
          }
        }
      }
    }

    if (controller.signal.aborted && repos.length === 0) {
      // Why: aborting before any repository was found still settles the review
      // with the empty result, so the Stop button can leave the scanning state.
      return snapshot({
        selectedPath,
        selectedPathKind: 'non_git_folder',
        repos,
        truncated,
        timedOut,
        stopped: true,
        startedAt,
        maxDepth,
        maxRepos,
        timeoutMs
      })
    }

    return snapshot({
      selectedPath,
      selectedPathKind: 'non_git_folder',
      repos,
      truncated,
      timedOut,
      stopped: controller.signal.aborted,
      startedAt,
      maxDepth,
      maxRepos,
      timeoutMs
    })
  } finally {
    if (args.scanId) {
      activeLocalScans.delete(args.scanId)
    }
  }
}

/** Selected paths in the order the scan reported them. */
export function getSelectedNestedRepoPathsInScanOrder(
  scan: Pick<NestedRepoScanResult, 'repos'>,
  selectedPaths: ReadonlySet<string>
): string[] {
  return scan.repos
    .map((repo) => repo.path)
    .filter((path) => selectedPaths.has(path))
}
