import { invoke } from '@tauri-apps/api/core'

/** Agent CLIs probed by `cli_install_status`, in the sidebar's display order. */
export const AGENT_CLI_IDS = ['omp', 'claude', 'cursor-agent', 'codex', 'orca'] as const

export type AgentCliId = (typeof AGENT_CLI_IDS)[number]

export type CliInstallStatus = {
  id: AgentCliId
  installed: boolean
  /** First line of `<cli> --version`; absent when the probe is unavailable. */
  version?: string
}

/**
 * Reports which agent CLIs exist on the host PATH.
 *
 * Local only: the probe runs `which` + `<cli> --version` in the Tauri process,
 * so it answers for the machine Hydra runs on, not for an SSH or runtime host.
 */
export async function loadCliInstallStatus(): Promise<CliInstallStatus[]> {
  return invoke<CliInstallStatus[]>('cli_install_status')
}
