import type { ComposerModel } from './composer-model'

type EligibleRepo = { id: string; path: string }

type GitLabProviderSelectionInput = Pick<
  ComposerModel,
  | 'applyLinkedGitLabWorkItem'
  | 'branchAutoNameRef'
  | 'eligibleRepos'
  | 'handleBaseBranchMrSelect'
  | 'isProjectGroupTarget'
  | 'lastAutoNameRef'
  | 'name'
  | 'selectedRepo'
  | 'setBaseBranch'
  | 'setBranchNameOverride'
  | 'setBranchNameOverridePreservesNameEdits'
  | 'setCompareBaseRef'
  | 'setForkPushWarning'
  | 'setLinkedGitLabIssue'
  | 'setLinkedGitLabMR'
  | 'setLinkedIssue'
  | 'setLinkedPR'
  | 'setLinkedTaskSourceContext'
  | 'setLinkedWorkItem'
  | 'setName'
  | 'setPushTarget'
  | 'setStartFromResetHint'
  | 'settings'
>

import { useCallback } from 'react'
import type { GitLabWorkItem } from '@/shared/gitlab-types'
import {
  toGitLabLinkedWorkItem,
  getLinkedItemDisplayName
} from '@/components/sidebar/folder-workspace-composer-helpers'
import { shouldApplyWorkspaceSourceAutoName } from '@/shared/new-workspace/workspace-source'
import { invoke } from '@tauri-apps/api/core'
import type { GitPushTarget } from '@/shared/worktree/types'

type PrStartPointLike = {
  baseBranch: string
  compareBaseRef?: string | null
  pushTarget?: GitPushTarget | null
}
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'

export function useGitLabProviderSelection(input: GitLabProviderSelectionInput) {
  const {
    applyLinkedGitLabWorkItem,
    branchAutoNameRef,
    eligibleRepos,
    handleBaseBranchMrSelect,
    isProjectGroupTarget,
    lastAutoNameRef,
    name,
    selectedRepo,
    setBaseBranch,
    setBranchNameOverride,
    setBranchNameOverridePreservesNameEdits,
    setCompareBaseRef,
    setForkPushWarning,
    setLinkedGitLabIssue,
    setLinkedGitLabMR,
    setLinkedIssue,
    setLinkedPR,
    setLinkedTaskSourceContext,
    setLinkedWorkItem,
    setName,
    setPushTarget,
    setStartFromResetHint,
    settings
  } = input

  // Why: GitLab parallel of handleSmartGitHubItemSelect — resolves MR base via worktrees:resolveMrBase (refs/merge-requests/<iid>/head); issues short-circuit.
  const handleSmartGitLabItemSelect = useCallback(
    (item: GitLabWorkItem): void => {
      if (isProjectGroupTarget) {
        const linkedItem = toGitLabLinkedWorkItem(item)
        setLinkedGitLabIssue(item.type === 'issue' ? item.number : null)
        setLinkedGitLabMR(item.type === 'mr' ? item.number : null)
        setLinkedIssue('')
        setLinkedPR(null)
        setLinkedTaskSourceContext(null)
        setLinkedWorkItem(linkedItem)
        const nextName = getLinkedItemDisplayName(linkedItem)
        if (
          nextName &&
          shouldApplyWorkspaceSourceAutoName({
            currentName: name,
            lastAutoName: lastAutoNameRef.current
          })
        ) {
          setName(nextName)
          lastAutoNameRef.current = nextName
        }
        return
      }
      applyLinkedGitLabWorkItem(item)
      setStartFromResetHint(null)
      setBranchNameOverride(undefined)
      setBranchNameOverridePreservesNameEdits(false)
      setForkPushWarning(null)
      branchAutoNameRef.current = ''
      // Why: MR metadata can be sourced from one host/account while the workspace is created on another for the same logical project.
      const runRepo = selectedRepo ?? eligibleRepos.find((repo: EligibleRepo) => repo.id === item.repoId)
      if (item.type !== 'mr' || !runRepo) {
        setCompareBaseRef(undefined)
        return
      }
      setCompareBaseRef(undefined)
      // Hydra local-only: no runtime-RPC branch (no remote execution hosts).
      const resolveMrBase = invoke<PrStartPointLike | { error: string }>('worktrees_resolve_mr_base', {
        repoPath: runRepo.path,
        mrIid: item.number,
        ...(item.branchName ? { sourceBranch: item.branchName } : {}),
        ...(item.baseRefName ? { targetBranch: item.baseRefName } : {}),
        ...(item.isCrossRepository !== undefined
          ? { isCrossRepository: item.isCrossRepository }
          : {})
      })
      void resolveMrBase
        .then((result) => {
          if ('error' in result) {
            // Why: an unsurfaced failure silently falls back to the repo default branch, so clear stale base state and toast — mirrors the GitHub PR path.
            setBaseBranch(undefined)
            setCompareBaseRef(undefined)
            setPushTarget(undefined)
            toast.error(result.error)
            return
          }
          handleBaseBranchMrSelect(
            result.baseBranch,
            item,
            result.pushTarget,
            result.compareBaseRef
          )
        })
        .catch((error: unknown) => {
          setBaseBranch(undefined)
          setCompareBaseRef(undefined)
          setPushTarget(undefined)
          toast.error(
            error instanceof Error
              ? error.message
              : translate('auto.hooks.useComposerState.5f3d2c8a1b', 'Failed to resolve MR base.')
          )
        })
    },
    [
      applyLinkedGitLabWorkItem,
      eligibleRepos,
      handleBaseBranchMrSelect,
      isProjectGroupTarget,
      name,
      selectedRepo,
      settings,
      branchAutoNameRef,
      lastAutoNameRef,
      setBaseBranch,
      setBranchNameOverride,
      setBranchNameOverridePreservesNameEdits,
      setCompareBaseRef,
      setForkPushWarning,
      setLinkedGitLabIssue,
      setLinkedGitLabMR,
      setLinkedIssue,
      setLinkedPR,
      setLinkedTaskSourceContext,
      setLinkedWorkItem,
      setName,
      setPushTarget,
      setStartFromResetHint
    ]
  )

  return {
    handleSmartGitLabItemSelect
  }
}
