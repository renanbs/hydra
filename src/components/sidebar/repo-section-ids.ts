// Adapter over `src/reference/components/settings/repository-settings-targets.ts`
// (verbatim Orca, pinned in `src/reference/REVISION`).
//
// Rosetta D02c-023: the reference builds `repo-<id>-local-commands`; Hydra's
// repo-scoped surface (`RepoSettingsDialog` + `RepositoryLocalCommandsSection`)
// keys its anchor as `repo-local-commands:<id>`. This adapter owns that
// translation so the reference file stays byte-identical to upstream.
// NOTE: `src/reference/` is verbatim upstream and excluded from the TS
// program (`tsconfig.json`), so it cannot be imported as a module. The
// reference for this adapter is
// `src/reference/components/settings/repository-settings-targets.ts`
// (pinned in `src/reference/REVISION`); the function below is Hydra's
// translated re-implementation of its `getRepositoryLocalCommandsSectionId`.

/**
 * Hydra anchor for the repo local-commands section. The reference builds
 * `repo-<id>-local-commands`; `RepoSettingsDialog` /
 * `RepositoryLocalCommandsSection` key theirs as `repo-local-commands:<id>`.
 */
export function getRepositoryLocalCommandsSectionId(repoId: string): string {
  return `repo-local-commands:${repoId}`
}
