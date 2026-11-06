// Rosetta D02c-009 (Orca `NonGitFolderDialog.addRemote`): SSH folders take the
// dedicated remote branch — `catalog_add_remote_repo` kind folder + upsert +
// fetchWorktrees with the ssh: execution host.
import { describe, expect, it, vi, beforeEach } from 'vitest'

const catalogCalls: Array<Record<string, unknown>> = []
vi.mock('../../lib/catalog-client', () => ({
  addRemoteCatalogRepo: vi.fn(async (args: Record<string, unknown>) => {
    catalogCalls.push(args)
    return { repos: [{ path: args.path, connectionId: args.connectionId }] }
  })
}))

const upsertCalls: Array<unknown> = []
vi.mock('../../components/sidebar/add-repo-store-upsert', () => ({
  upsertAddedRepoWithProjectHostSetup: vi.fn((repo: unknown) => {
    upsertCalls.push(repo)
    return { repo: { ...(repo as object), id: 'r1', connectionId: 'nas' } }
  })
}))

vi.mock('../../lib/catalog-store-projection', () => ({
  catalogRepoToRepo: vi.fn((row: unknown) => row)
}))

vi.mock('@/lib/onboarding-folder-agent-launch', () => ({
  resolveDismissedOnboardingFolderAgentLaunch: vi.fn(() => null),
  revealOnboardingFolderWithAgentLaunch: vi.fn(async () => {})
}))

vi.mock('@/lib/native-chat-transcript-readability', () => ({
  isNativeChatTranscriptLocalReadable: vi.fn(() => true)
}))

vi.mock('@/lib/onboarding-project-checklist', () => ({
  markOnboardingProjectAdded: vi.fn(async () => {})
}))

import { createRepoAddActions } from './repo-add-actions'

function makeStore() {
  const state = {
    repos: [] as Array<Record<string, unknown>>,
    worktreesByRepo: {} as Record<string, Array<{ id: string; hostId: string }>>,
    fetchWorktrees: vi.fn(async () => {})
  }
  const get = () => state as unknown as Parameters<Parameters<typeof createRepoAddActions>[1]>[0] extends never ? never : ReturnType<Parameters<typeof createRepoAddActions>[1]>
  const set = vi.fn()
  return { state, get: get as () => never, set }
}

describe('addNonGitFolder SSH branch (D02c-009)', () => {
  beforeEach(() => {
    catalogCalls.length = 0
    upsertCalls.length = 0
  })

  it('registers SSH folders via catalog_add_remote_repo kind folder', async () => {
    const { state, get, set } = makeStore()
    const actions = createRepoAddActions(set as never, get as never)
    const repo = await actions.addNonGitFolder('/remote/docs', { connectionId: 'nas' })
    expect(catalogCalls).toEqual([
      {
        path: '/remote/docs',
        connectionId: 'nas',
        executionHostId: 'ssh:nas',
        kind: 'folder'
      }
    ])
    expect(repo).toMatchObject({ id: 'r1' })
    expect(state.fetchWorktrees).toHaveBeenCalledWith('r1', { executionHostId: 'ssh:nas' })
  })
})
