// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/ProjectAddedDialog.tsx
//
// D02a-027: compatibility handoff for a `project-added` modal. Older onboarding
// builds wrote `projectId` (not `repoId`), and the repo may not be in the store
// yet, so the dialog accepts both keys and hydrates before deciding.
import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store'
import type {
  ProjectAddedHandoffDeps,
  ProjectAddedHandoffResult,
} from './project-added-default-checkout'
import { finishProjectAddWithDefaultCheckout } from './project-added-default-checkout'
import type { ExecutionHostId } from '../../shared/execution-host'

export type ProjectAddedRepo = {
  id: string
  path: string
  kind?: 'git' | 'folder'
  connectionId?: string | null
  executionHostId?: string | null
}

export type ProjectAddedDialogProps = {
  /** Re-reads the catalog into the store (`fetchRepos` equivalent). */
  hydrateRepos: () => Promise<void>
  findRepo: (repoId: string) => ProjectAddedRepo | null
  /** Folder repos own a synthetic workspace; refresh its list then reveal it. */
  revealFolderWorkspace: (repo: ProjectAddedRepo) => Promise<void>
  handoffDeps: (repo: ProjectAddedRepo) => ProjectAddedHandoffDeps
  onHandoff?: (result: ProjectAddedHandoffResult) => void
}

type ProjectAddedModalData = {
  repoId?: string
  projectId?: string
}

export function ProjectAddedDialog({
  hydrateRepos,
  findRepo,
  revealFolderWorkspace,
  handoffDeps,
  onHandoff,
}: ProjectAddedDialogProps): null {
  const activeModal = useAppStore((s) => s.activeModal)
  const modalData = useAppStore((s) => s.modalData as ProjectAddedModalData)
  const closeModal = useAppStore((s) => s.closeModal)
  const setHideDefaultBranchWorkspace = useAppStore((s) => s.setHideDefaultBranchWorkspace)
  const handoffRunRef = useRef(0)
  const pendingRepoHydrationRef = useRef<string | null>(null)

  // Why: older onboarding builds wrote `projectId`; accepting both prevents a
  // stale project-added modal from blocking follow-up contextual tours.
  const repoId =
    typeof modalData?.repoId === 'string'
      ? modalData.repoId
      : typeof modalData?.projectId === 'string'
        ? modalData.projectId
        : ''
  const repo = repoId ? findRepo(repoId) : null

  useEffect(() => {
    if (activeModal !== 'project-added') {
      handoffRunRef.current++
      pendingRepoHydrationRef.current = null
      return
    }
    if (!repoId) {
      closeModal()
      return
    }
    if (!repo) {
      // Why: one hydration attempt per repo; a failed read must settle the
      // modal instead of spinning, but StrictMode's double effect must not
      // launch a second read before the first answers.
      if (pendingRepoHydrationRef.current === repoId) {
        return
      }
      pendingRepoHydrationRef.current = repoId
      let cancelled = false
      void (async () => {
        await hydrateRepos()
        if (cancelled) {
          return
        }
        const hydrated = findRepo(repoId)
        if (!hydrated) {
          closeModal()
        }
        pendingRepoHydrationRef.current = null
      })()
      return () => {
        cancelled = true
        pendingRepoHydrationRef.current = null
      }
    }
    pendingRepoHydrationRef.current = null
    const runId = ++handoffRunRef.current
    let cancelled = false

    if (repo.kind === 'folder') {
      void (async () => {
        try {
          await revealFolderWorkspace(repo)
        } finally {
          if (!cancelled) {
            closeModal()
          }
        }
      })()
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      const result = await finishProjectAddWithDefaultCheckout({
        repoId,
        source: 'project_added_compat',
        executionHostId: (repo.executionHostId as ExecutionHostId | null) ?? undefined,
        closeModal,
        deps: {
          ...handoffDeps(repo),
          setHideDefaultBranchWorkspace,
        },
      })
      if (!cancelled && handoffRunRef.current === runId) {
        onHandoff?.(result)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    activeModal,
    closeModal,
    findRepo,
    handoffDeps,
    hydrateRepos,
    onHandoff,
    repo,
    repoId,
    revealFolderWorkspace,
    setHideDefaultBranchWorkspace,
  ])

  return null
}
