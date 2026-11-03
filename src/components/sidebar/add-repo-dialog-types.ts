// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/add-repo-dialog-types.ts
//
// D02a-042: shared step union + the two naming/id helpers the nested-scan review
// needs. Hydra keeps Orca's step names (`add`, `clone`, `remote`, `server-path`,
// `create`, `nested`) and adds `folder`, the confirm step for a folder dropped on
// the sidebar (Orca renders that as a separate AddProjectFromFolderDialog).

export type AddRepoDialogStep =
  | 'add'
  | 'clone'
  | 'remote'
  | 'server-path'
  | 'create'
  | 'nested'
  | 'folder'

/**
 * Last non-empty path segment, with both separators normalized. Used to prefill
 * the nested-import group name (and to tell an untouched prefill from a rename).
 */
export function defaultProjectGroupNameForPath(path: string): string {
  return (
    path
      .replace(/[\\/]+$/g, '')
      .split(/[\\/]/)
      .findLast(Boolean) ?? path
  )
}

/** Unique-enough id for one nested scan: timestamp plus randomness. */
export function createNestedRepoScanId(): string {
  return `nested-repo-scan-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
