// A duplicate host in the registry is indistinguishable from the one being added: the same
// alias resolves to the same OpenSSH block, and the sidebar would show two rows that connect
// to the same machine. `ssh_add_target` accepts duplicates, so the check lives here.
import type { SshTarget } from '../../shared/ssh-types'

type SshAliasFields = Pick<SshTarget, 'configHost' | 'host' | 'username'>

function normalizedAlias(target: SshAliasFields): string {
  return (target.configHost?.trim() || target.host.trim()).toLowerCase()
}

function normalizedUsername(target: SshAliasFields): string {
  return target.username.trim().toLowerCase()
}

/**
 * True when `candidate` names a host the registry already holds. Aliases compare
 * case-insensitively because OpenSSH host matching is case-insensitive; the username only
 * breaks the tie when both sides carry one (`deploy@box` and `root@box` are different hosts).
 */
export function isDuplicateSshTargetAlias(
  candidate: SshAliasFields,
  targets: readonly SshAliasFields[]
): boolean {
  const alias = normalizedAlias(candidate)
  if (!alias) {
    return false
  }
  const username = normalizedUsername(candidate)
  return targets.some(
    (target) =>
      normalizedAlias(target) === alias &&
      (username === '' || normalizedUsername(target) === '' || normalizedUsername(target) === username)
  )
}
