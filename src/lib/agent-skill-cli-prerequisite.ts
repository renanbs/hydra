// Adapter over `src/reference/lib/agent-skill-cli-prerequisite.ts`
// (verbatim Orca — copy pending; the reference is the contract).
//
// Rosetta D02c-004 (CLI half): Orca checks the Orca CLI via
// `window.api.cli.getInstallStatus()` and offers interactive registration.
// Hydra probes PATH through the Tauri `cli_install_status` command; there is
// no interactive registration, so an absent CLI surfaces as guidance to
// install it, and `isOrcaCliAvailableOnPath` reduces to the probe result.
import { loadCliInstallStatus } from './cli-install-status'

export const AGENT_SKILL_CLI_PREREQUISITE_NOTICE =
  'Before opening setup, Hydra checks that the Orca CLI command is on PATH.'

export function isOrcaCliAvailableOnPath(statuses: { id: string; installed: boolean }[] | null | undefined): boolean {
  return (statuses ?? []).some((entry) => entry.id === 'orca' && entry.installed === true)
}

export async function loadOrcaCliAvailableOnPath(): Promise<boolean> {
  try {
    const statuses = await loadCliInstallStatus()
    return isOrcaCliAvailableOnPath(statuses)
  } catch {
    return false
  }
}
