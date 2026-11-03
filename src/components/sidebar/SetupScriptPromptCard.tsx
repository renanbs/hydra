// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SetupScriptPromptCard.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { useMountedRef } from '@/hooks/useMountedRef'
import {
  buildImportedHookSettings,
  formatCandidateProvenance,
  formatCandidateSource,
  ignoresSharedSetupScripts,
  inspectSetupScriptPromptState,
  isSetupScriptPromptDismissed
} from '@/lib/setup-script-prompt'
import { checkRuntimeHooks, inspectRuntimeSetupScriptImports } from '@/runtime/runtime-hooks-client'
import { isGitRepoKind } from '../../shared/repo-kind'
import type { SetupScriptImportCandidate } from '../../shared/setup-script-imports'
import { buildSetupScriptPromptActionTelemetry, type SetupScriptPromptAction } from '../../shared/setup-script-telemetry'
import { SetupScriptPromptCardShell } from './SetupScriptPromptCardShell'
import { showSavedInProjectSettingsToast } from './SetupScriptPromptToast'
import { openSetupScriptSettings } from './open-setup-script-settings'
import { trackSetupScriptPromptExposure } from './setup-script-prompt-exposure-telemetry'
import {
  findSetupScriptPromptRepo,
  markSetupScriptPromptSaved,
  type SetupScriptPromptState
} from './setup-script-prompt-render-state'
import { useSetupScriptPromptRevalidation } from './useSetupScriptPromptRevalidation'
import { useRenderedSetupScriptPromptState } from './useRenderedSetupScriptPromptState'
import { getRepoHostIdentity } from '@/store/slices/repo-host-identity'
import { getRepoExecutionHostId, type ExecutionHostId } from '../../shared/execution-host'
import { track } from '@/lib/telemetry'
import type { AppState } from '@/store/types'
import type { RepoHookSettings } from '../../shared/orca-yaml-hook-types'

/** UI-slice members the live store exposes at runtime but `AppState` does not declare. */
type SetupPromptUiState = {
  sidebarOpen: boolean
  openSettingsPage: () => void
  openSettingsTarget: (target: {
    pane: 'repo'
    repoId: string
    hostId: ExecutionHostId
    sectionId: string
  }) => void
  setSettingsSearchQuery: (query: string) => void
  setupScriptPromptDismissedRepoIds: readonly string[]
  dismissSetupScriptPrompt: (repoHostIdentity: string) => void
  updateRepo: (
    repoId: string,
    updates: { hookSettings: RepoHookSettings },
    options: { hostId: ExecutionHostId }
  ) => Promise<boolean>
}

const useSetupPromptStore = <T,>(selector: (state: AppState & SetupPromptUiState) => T): T =>
  // Reason: the composed UI slice is typed as `any` on this branch; the runtime
  // shape is checked by the selectors themselves.
  useAppStore((state) => selector(state as AppState & SetupPromptUiState))

/**
 * Sidebar setup-script suggestion card. Inspects the active repo's hooks and
 * import candidates, then offers the detected package-manager command, a
 * local-setup save, or a path into the repo's local command settings.
 */
export function SetupScriptPromptCard(): React.JSX.Element | null {
  const sidebarOpen = useSetupPromptStore((s) => s.sidebarOpen)
  const repos = useAppStore((s) => s.repos)
  const activeRepoId = useAppStore((s) => s.activeRepoId)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const activeWorktree = useAppStore((s) => {
    if (!activeWorktreeId) return null
    const byId = s.worktreesById?.get(activeWorktreeId)
    if (byId) return byId
    for (const rows of Object.values(s.worktreesByRepo)) {
      const found = rows.find((row) => row.id === activeWorktreeId)
      if (found) return found
    }
    return null
  })
  const settings = useAppStore((s) => s.settings)
  const updateRepo = useSetupPromptStore((s) => s.updateRepo)
  const openSettingsPage = useSetupPromptStore((s) => s.openSettingsPage)
  const openSettingsTarget = useSetupPromptStore((s) => s.openSettingsTarget)
  const setSettingsSearchQuery = useSetupPromptStore((s) => s.setSettingsSearchQuery)
  const dismissedRepoIds = useSetupPromptStore((s) => s.setupScriptPromptDismissedRepoIds) ?? []
  const dismissSetupScriptPrompt = useSetupPromptStore((s) => s.dismissSetupScriptPrompt)
  const [promptState, setPromptState] = useState<SetupScriptPromptState | null>(null)
  const [detectedSetupDraft, setDetectedSetupDraft] = useState('')
  const [importingRepoHostIdentity, setImportingRepoHostIdentity] = useState<string | null>(null)
  const [inspectionRetryKey, setInspectionRetryKey] = useState(0)
  const trackedPromptKeysRef = useRef<Set<string>>(new Set())
  const mountedRef = useMountedRef()

  const activeRepo = useMemo(
    () => findSetupScriptPromptRepo({ repos, activeRepoId, activeWorktree, settings }),
    [activeRepoId, activeWorktree, repos, settings]
  )
  const activeRepoHostIdentity = activeRepo ? getRepoHostIdentity(activeRepo) : null
  const isDismissed = activeRepoHostIdentity
    ? isSetupScriptPromptDismissed(activeRepoHostIdentity, dismissedRepoIds)
    : false

  useEffect(() => {
    if (!sidebarOpen || !activeRepo || !isGitRepoKind(activeRepo) || isDismissed) {
      setPromptState(null)
      setDetectedSetupDraft('')
      return
    }

    const repo = activeRepo
    let cancelled = false
    setPromptState(null)

    async function inspectRepoSetup(): Promise<void> {
      const hostId = getRepoExecutionHostId(repo)
      const inspection = await inspectSetupScriptPromptState({
        repo,
        checkHooks: () => checkRuntimeHooks(settings, repo.id, hostId),
        inspectImports: () => inspectRuntimeSetupScriptImports(settings, repo.id, hostId)
      })
      if (cancelled) return
      const nextState = { ...inspection, repoHostIdentity: getRepoHostIdentity(repo) }
      setPromptState(nextState)
      setDetectedSetupDraft(
        nextState.status === 'ok' && nextState.candidate?.provider === 'package-manager'
          ? nextState.candidate.setup
          : ''
      )
    }

    void inspectRepoSetup()

    return () => {
      cancelled = true
    }
  }, [activeRepo, inspectionRetryKey, isDismissed, settings, sidebarOpen])

  const openLocalCommandSettings = useCallback(
    (repoId: string, hostId: ExecutionHostId) => {
      openSetupScriptSettings({
        repoId,
        hostId,
        setSettingsSearchQuery,
        openSettingsTarget,
        openSettingsPage
      })
    },
    [openSettingsPage, openSettingsTarget, setSettingsSearchQuery]
  )

  const handleRetryInspection = useCallback(() => {
    setInspectionRetryKey((value) => value + 1)
  }, [])

  useSetupScriptPromptRevalidation({
    activeRepo,
    isDismissed,
    sidebarOpen,
    promptState,
    requestRevalidation: handleRetryInspection
  })

  useEffect(() => {
    if (
      !sidebarOpen ||
      !activeRepo ||
      !isGitRepoKind(activeRepo) ||
      isDismissed ||
      promptState?.repoId !== activeRepo.id ||
      promptState.repoHostIdentity !== activeRepoHostIdentity ||
      promptState.status !== 'ok' ||
      promptState.hasEffectiveSetup
    ) {
      return
    }

    trackSetupScriptPromptExposure({
      repoId: activeRepo.id,
      repoHostIdentity: activeRepoHostIdentity,
      promptState,
      trackedPromptKeys: trackedPromptKeysRef.current
    })
  }, [activeRepo, activeRepoHostIdentity, isDismissed, promptState, sidebarOpen])

  const trackPromptAction = useCallback(
    (action: SetupScriptPromptAction, editedBeforeSave?: boolean) => {
      if (promptState?.status !== 'ok' || promptState.hasEffectiveSetup) return
      track(
        'setup_script_prompt_action',
        buildSetupScriptPromptActionTelemetry({
          action,
          candidate: promptState.candidate,
          hasSharedHooks: promptState.hasSharedHooks,
          ...(editedBeforeSave !== undefined ? { editedBeforeSave } : {})
        })
      )
    },
    [promptState]
  )

  const handleConfigure = useCallback(() => {
    if (!activeRepo) return
    trackPromptAction('configure_clicked')
    openLocalCommandSettings(activeRepo.id, getRepoExecutionHostId(activeRepo))
  }, [activeRepo, openLocalCommandSettings, trackPromptAction])

  const handleDismiss = useCallback(() => {
    if (!activeRepo || !activeRepoHostIdentity) return
    trackPromptAction('dismissed')
    dismissSetupScriptPrompt(activeRepoHostIdentity)
  }, [activeRepo, activeRepoHostIdentity, dismissSetupScriptPrompt, trackPromptAction])

  const saveSetupCandidate = useCallback(
    async (input: {
      candidate: SetupScriptImportCandidate
      hasSharedHooks: boolean
      actionPrefix: 'save_detected_setup' | 'import'
      editedBeforeSave?: boolean
    }) => {
      const { candidate, hasSharedHooks, actionPrefix, editedBeforeSave } = input
      if (!activeRepo) return
      const importedRepoHostIdentity = getRepoHostIdentity(activeRepo)
      const importedHostId = getRepoExecutionHostId(activeRepo)
      setImportingRepoHostIdentity(importedRepoHostIdentity)
      try {
        const importedRepoId = activeRepo.id
        const nextSettings = buildImportedHookSettings(activeRepo, candidate, hasSharedHooks)
        const didUpdate = await updateRepo(
          activeRepo.id,
          { hookSettings: nextSettings },
          { hostId: importedHostId }
        )
        if (!didUpdate) {
          trackPromptAction(
            actionPrefix === 'save_detected_setup' ? 'save_detected_setup_failed' : 'import_failed',
            editedBeforeSave
          )
          if (mountedRef.current) toast.error('Failed to save setup script')
          return
        }
        trackPromptAction(
          actionPrefix === 'save_detected_setup' ? 'save_detected_setup_completed' : 'import_completed',
          editedBeforeSave
        )
        if (!mountedRef.current) return
        setPromptState((current) =>
          markSetupScriptPromptSaved(current, importedRepoHostIdentity)
        )
        if (actionPrefix === 'save_detected_setup') {
          showSavedInProjectSettingsToast({
            onOpenSettings: () => openLocalCommandSettings(importedRepoId, importedHostId),
            description: 'Runs when Orca creates a new worktree.'
          })
          return
        }
        const skippedCount = candidate.unsupportedFields?.length ?? 0
        showSavedInProjectSettingsToast({
          onOpenSettings: () => openLocalCommandSettings(importedRepoId, importedHostId),
          description:
            skippedCount > 0
              ? `${skippedCount} unsupported field${skippedCount === 1 ? '' : 's'} skipped. Saved the setup command.`
              : 'Saved the setup command.'
        })
      } catch (error) {
        trackPromptAction(
          actionPrefix === 'save_detected_setup' ? 'save_detected_setup_failed' : 'import_failed',
          editedBeforeSave
        )
        console.warn('[setup-script-prompt] Failed to save setup script:', error)
        if (mountedRef.current) toast.error('Failed to save setup script')
      } finally {
        if (mountedRef.current) {
          setImportingRepoHostIdentity((current) =>
            current === importedRepoHostIdentity ? null : current
          )
        }
      }
    },
    [activeRepo, mountedRef, openLocalCommandSettings, trackPromptAction, updateRepo]
  )

  const handleImport = useCallback(async () => {
    if (!activeRepo || promptState?.status !== 'ok' || !promptState.candidate) return
    const isPackageManagerCandidate = promptState.candidate.provider === 'package-manager'
    const actionPrefix = isPackageManagerCandidate ? 'save_detected_setup' : 'import'
    const editedBeforeSave =
      isPackageManagerCandidate && detectedSetupDraft.trim() !== promptState.candidate.setup.trim()
    const candidate = isPackageManagerCandidate
      ? { ...promptState.candidate, setup: detectedSetupDraft.trim() }
      : promptState.candidate
    if (!candidate.setup) {
      toast.error('Setup script cannot be empty')
      return
    }
    if (actionPrefix === 'save_detected_setup') {
      trackPromptAction('save_detected_setup_clicked', editedBeforeSave)
    }
    await saveSetupCandidate({
      candidate,
      hasSharedHooks: promptState.hasSharedHooks,
      actionPrefix,
      ...(editedBeforeSave ? { editedBeforeSave } : {})
    })
  }, [activeRepo, detectedSetupDraft, promptState, saveSetupCandidate, trackPromptAction])

  const renderedPromptState = useRenderedSetupScriptPromptState({
    promptState,
    activeRepoId: activeRepoId ?? null,
    activeRepoHostIdentity,
    promptTargetHidden: !sidebarOpen || !activeRepo || !isGitRepoKind(activeRepo) || isDismissed
  })

  if (
    !activeRepo ||
    !renderedPromptState ||
    renderedPromptState.status === 'forbidden' ||
    (renderedPromptState.status === 'ok' && renderedPromptState.hasEffectiveSetup)
  ) {
    return null
  }

  const isInspectionError = renderedPromptState.status === 'error'
  const sharedSetupIgnored = ignoresSharedSetupScripts(activeRepo)
  const candidate = renderedPromptState.status === 'ok' ? renderedPromptState.candidate : null
  const isPackageManagerSuggestion = candidate?.provider === 'package-manager'
  const hasCandidate = candidate !== null
  const isImporting = importingRepoHostIdentity === activeRepoHostIdentity

  return (
    <SetupScriptPromptCardShell
      repoBadgeColor={activeRepo.badgeColor}
      repoDisplayName={activeRepo.displayName}
      isInspectionError={isInspectionError}
      sharedSetupIgnored={sharedSetupIgnored}
      isPackageManagerSuggestion={isPackageManagerSuggestion}
      hasCandidate={hasCandidate}
      candidateSource={candidate ? formatCandidateSource(candidate) : null}
      candidateProvenance={candidate ? formatCandidateProvenance(candidate) : null}
      detectedSetupDraft={detectedSetupDraft}
      isImporting={isImporting}
      renderedStateOk={renderedPromptState.status === 'ok'}
      onDismiss={handleDismiss}
      onRetryInspection={handleRetryInspection}
      onConfigure={handleConfigure}
      onImport={() => void handleImport()}
      onSetupDraftChange={setDetectedSetupDraft}
    />
  )
}

export default SetupScriptPromptCard
