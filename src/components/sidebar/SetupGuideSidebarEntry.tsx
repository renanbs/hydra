// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SetupGuideSidebarEntry.tsx
import React from 'react'
import { EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  getFirstIncompleteFeatureWallSetupStepId,
  type FeatureWallSetupStepId
} from '../../shared/feature-wall-setup-steps'
import type { HydraSettings } from '../../shared/settings-types'
import type { FeatureWallSetupProgress } from '../setup-guide/feature-wall-setup-progress'
import { isFeatureWallSetupProgressComplete } from '../setup-guide/feature-wall-setup-progress'
import { SetupGuideProgressRing } from '../setup-guide/SetupGuideProgressRing'
import { useSetupGuideProgress } from '../setup-guide/use-setup-guide-progress'
import { useSidebarUiStore } from './sidebar-ui-store'
import { translate } from '@/i18n/i18n'

export type SetupGuideEntryVisibilityInput = {
  ready: boolean
  setupComplete: boolean
  dismissed: boolean
}

export function shouldShowSetupGuideEntry(input: SetupGuideEntryVisibilityInput): boolean {
  return input.ready && !input.setupComplete && !input.dismissed
}

export function getSetupGuideSidebarEntryReady(
  persistedUIReady: boolean,
  setupProgressReady: boolean
): boolean {
  return persistedUIReady && setupProgressReady
}

export function SetupGuideSidebarEntry({
  settings
}: {
  settings?: HydraSettings | null
}): React.JSX.Element | null {
  const openModal = useSidebarUiStore((state) => state.openModal)
  const activeModal = useSidebarUiStore((state) => state.activeModal)
  const persistedUIReady = useSidebarUiStore((state) => state.persistedUIReady)
  const setupGuideSidebarDismissed = useSidebarUiStore(
    (state) => state.setupGuideSidebarDismissed
  )
  const setSetupGuideSidebarDismissed = useSidebarUiStore(
    (state) => state.setSetupGuideSidebarDismissed
  )
  const setupProgress = useSetupGuideProgress(settings, true)
  const setupActive = activeModal === 'setup-guide'
  const showSetupGuideEntry = shouldShowSetupGuideEntry({
    ready: getSetupGuideSidebarEntryReady(persistedUIReady, setupProgress.ready),
    setupComplete: isFeatureWallSetupProgressComplete(setupProgress),
    dismissed: setupGuideSidebarDismissed
  })
  const lastVisibleProgressRef = React.useRef<FeatureWallSetupProgress | null>(null)
  if (showSetupGuideEntry) {
    lastVisibleProgressRef.current = setupProgress
  }
  // Why: host/workspace switches can briefly refresh store state. Once the
  // checklist is visibly available, keep that stable row through the refresh.
  const renderedProgress = showSetupGuideEntry
    ? setupProgress
    : !setupProgress.ready && !setupGuideSidebarDismissed
      ? lastVisibleProgressRef.current
      : null

  if (!renderedProgress) {
    return null
  }
  const firstUnfinishedSetupStepId: FeatureWallSetupStepId =
    getFirstIncompleteFeatureWallSetupStepId(renderedProgress.stepDone)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          data-contextual-tour-target="setup-guide-entry"
          onClick={() =>
            openModal('setup-guide', {
              setupStepId: firstUnfinishedSetupStepId,
              telemetrySource: 'sidebar'
            })
          }
          aria-current={setupActive ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
            setupActive
              ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
              : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
          )}
        >
          <SetupGuideProgressRing
            done={renderedProgress.coreDoneCount}
            total={renderedProgress.coreTotal}
            sizeClassName="size-4"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">
              {translate(
                'auto.components.sidebar.SetupGuideSidebarEntry.88d402b71d',
                'Onboarding checklist'
              )}
            </span>
          </span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => setSetupGuideSidebarDismissed(true)}>
          <EyeOff className="size-3.5" />
          {translate(
            'auto.components.sidebar.SetupGuideSidebarEntry.b0a7bfc34c',
            'Hide from sidebar'
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
