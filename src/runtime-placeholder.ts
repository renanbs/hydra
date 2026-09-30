// Hydra runtime placeholder: Orca's runtime RPC client has no Hydra equivalent yet.
// The status-bar provider menus degrade gracefully: snapshot fetches return empty
// and account switching is a no-op until the runtime layer lands.
export type RuntimeTarget = { kind: 'local' | 'ssh' | 'runtime'; id: string | null }

export function getActiveRuntimeTarget(_settings: unknown): RuntimeTarget {
  return { kind: 'local', id: null }
}

export async function fetchProviderAccountsSnapshot(_args: {
  activeRuntimeEnvironmentId?: string | null
}): Promise<Record<string, never>> {
  return {}
}

export async function switchProviderAccount(_args: {
  provider: string
  accountId: string
}): Promise<void> {}

export async function selectClaudeProviderAccount(
  _settings: unknown,
  _args: { accountId: string }
): Promise<Record<string, never>> {
  return {}
}
