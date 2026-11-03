import { resolveHookCommandSourcePolicy } from '../shared/hook-command-source-policy'
import type { Repo } from '../shared/repo-types'
import type { HookCheckResult } from '@/runtime/runtime-hooks-client'

/**
 * Whether the repo already has a setup command that will actually run.
 *
 * The effective command depends on the source policy: `local-only` ignores the
 * committed `orca.yaml`, `run-both` accepts either source, and the default
 * `shared-only` only counts the shared hook. An empty trim counts as absent so
 * whitespace in settings never suppresses the setup prompt.
 */
export function hasEffectiveSetupCommand(repo: Repo, hooksResult: HookCheckResult): boolean {
  const localSetup = repo.hookSettings?.scripts?.setup?.trim()
  const sharedSetup = hooksResult.hooks?.scripts?.setup?.trim()
  const sourcePolicy = resolveHookCommandSourcePolicy(repo.hookSettings?.commandSourcePolicy, {
    hasLocalScript: Boolean(localSetup)
  })

  if (sourcePolicy === 'local-only') {
    return Boolean(localSetup)
  }
  if (sourcePolicy === 'run-both') {
    return Boolean(sharedSetup || localSetup)
  }
  return Boolean(sharedSetup)
}
