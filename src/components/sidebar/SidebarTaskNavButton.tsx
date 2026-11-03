// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SidebarTaskNavButton.tsx
import React from 'react'
import { EyeOff, List } from 'lucide-react'
import { GithubIcon, GitlabIcon } from '@/components/icons/BrandIcons'
import { JiraIcon } from '@/components/icons/JiraIcon'
import { LinearIcon } from '@/components/icons/LinearIcon'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { PER_REPO_FETCH_LIMIT } from '@/shared/work-items'
import { cn } from '@/lib/utils'
import { isGitRepoKind } from '@/shared/repo-kind'
import { translate } from '@/i18n/i18n'
import {
  normalizeVisibleTaskProviders,
  restoreAvailableDefaultTaskProvider,
  resolveVisibleTaskProvider,
  type TaskProvider,
  type TaskProviderAvailability
} from '@/shared/task-providers'
import type { HydraSettings } from '@/shared/settings-types'
import { useLinearProviderConnected } from '@/hooks/useLinearProviderConnected'
import { useSidebarUiStore } from './sidebar-ui-store'

function HideTaskSidebarMenu({ onHide }: { onHide: () => void }): React.JSX.Element {
  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={onHide}>
        <EyeOff className="size-3.5" />
        {translate('auto.components.sidebar.SidebarNav.d599269755', 'Hide from sidebar')}
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

function TaskProviderShortcut({
  label,
  onOpen,
  children
}: {
  label: string
  onOpen: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-worktree-sidebar-ring"
      aria-label={label}
    >
      {children}
    </button>
  )
}

/**
 * Task provider availability Hydra can prove today.
 *
 * `gitlabInstalled` stays false: no command reports `glab`. Linear comes from
 * the live provider connection so the shortcut appears only when the Tasks
 * surface can actually query it. GitHub is always available (see
 * `task-providers.ts`), so it needs no probe here.
 */
export function resolveSidebarTaskProviderAvailability(overrides?: {
  linearConnected?: boolean
}): TaskProviderAvailability {
  return { gitlabInstalled: false, linearConnected: overrides?.linearConnected === true }
}

export function resolveVisibleSidebarTaskProviders(
  settings: HydraSettings | null,
  availability: TaskProviderAvailability = resolveSidebarTaskProviderAvailability()
): {
  visibleTaskProviders: TaskProvider[]
  resolvedDefaultTaskSource: TaskProvider
} {
  const preferredVisibleTaskProviders = normalizeVisibleTaskProviders(
    settings?.visibleTaskProviders
  )
  const visibleTaskProviders = restoreAvailableDefaultTaskProvider(
    preferredVisibleTaskProviders,
    availability,
    settings?.defaultTaskSource ?? 'github'
  )
  return {
    visibleTaskProviders,
    resolvedDefaultTaskSource: resolveVisibleTaskProvider(
      settings?.defaultTaskSource ?? 'github',
      visibleTaskProviders
    )
  }
}

type SidebarTaskNavButtonProps = {
  settings: HydraSettings | null
  onUpdateSettings?: (patch: Partial<HydraSettings>) => void
}

export function SidebarTaskNavButton({
  settings,
  onUpdateSettings
}: SidebarTaskNavButtonProps): React.JSX.Element | null {
  const openTaskPage = useSidebarUiStore((state) => state.openTaskPage)
  const repos = useSidebarUiStore((state) => state.repos)
  const activeRepoId = useSidebarUiStore((state) => state.activeRepoId)
  const prefetchWorkItems = useSidebarUiStore((state) => state.prefetchWorkItems)
  const activeView = useSidebarUiStore((state) => state.activeView)
  const linearConnected = useLinearProviderConnected()
  const showTasksButton = settings?.showTasksButton !== false
  const { visibleTaskProviders, resolvedDefaultTaskSource } = resolveVisibleSidebarTaskProviders(
    settings,
    resolveSidebarTaskProviderAvailability({ linearConnected })
  )

  const handlePrefetch = React.useCallback(() => {
    if (resolvedDefaultTaskSource !== 'github') {
      return
    }
    const activeRepo = activeRepoId
      ? (repos.find((repo) => repo.id === activeRepoId) ?? null)
      : null
    const activeGitRepo = activeRepo && isGitRepoKind(activeRepo) ? activeRepo : null
    const firstGitRepo = activeGitRepo ?? repos.find((repo) => isGitRepoKind(repo))
    if (firstGitRepo?.path) {
      prefetchWorkItems(firstGitRepo.id, firstGitRepo.path, PER_REPO_FETCH_LIMIT, '')
    }
  }, [activeRepoId, prefetchWorkItems, repos, resolvedDefaultTaskSource])

  const hideTasksButton = React.useCallback(() => {
    onUpdateSettings?.({ showTasksButton: false })
  }, [onUpdateSettings])

  if (!showTasksButton) {
    return null
  }

  const tasksActive = activeView === 'tasks'

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* Why: shortcuts sit beside the Tasks button, not inside it, so each stays keyboard-reachable. */}
        <div className="group relative">
          <button
            type="button"
            onClick={() => openTaskPage()}
            onPointerEnter={handlePrefetch}
            onFocus={handlePrefetch}
            aria-current={tasksActive ? 'page' : undefined}
            data-contextual-tour-target="sidebar-tasks"
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
              tasksActive
                ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
                : 'text-worktree-sidebar-foreground/60 group-hover:bg-worktree-sidebar-foreground/8'
            )}
          >
            <List
              className={cn(
                'size-4 shrink-0',
                !tasksActive && 'text-worktree-sidebar-foreground/30'
              )}
              strokeWidth={tasksActive ? 2.25 : 1.75}
            />
            <span className="flex-1">
              {translate('auto.components.sidebar.SidebarNav.fee535205b', 'Tasks')}
            </span>
          </button>
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 can-hover:pointer-events-none can-hover:opacity-0 can-hover:group-hover:pointer-events-auto can-hover:group-hover:opacity-100 can-hover:group-focus-within:pointer-events-auto can-hover:group-focus-within:opacity-100">
            {visibleTaskProviders.includes('github') ? (
              <TaskProviderShortcut
                label={translate(
                  'auto.components.sidebar.SidebarNav.0ccba862b8',
                  'Open GitHub tasks'
                )}
                onOpen={() => openTaskPage({ taskSource: 'github' })}
              >
                <GithubIcon className="size-3.5" />
              </TaskProviderShortcut>
            ) : null}
            {visibleTaskProviders.includes('gitlab') ? (
              <TaskProviderShortcut
                label={translate(
                  'auto.components.sidebar.SidebarNav.196c1b5362',
                  'Open GitLab tasks'
                )}
                onOpen={() => openTaskPage({ taskSource: 'gitlab' })}
              >
                <GitlabIcon className="size-3.5" />
              </TaskProviderShortcut>
            ) : null}
            {visibleTaskProviders.includes('linear') ? (
              <TaskProviderShortcut
                label={translate(
                  'auto.components.sidebar.SidebarNav.c39ab10000',
                  'Open Linear tasks'
                )}
                onOpen={() => openTaskPage({ taskSource: 'linear' })}
              >
                <LinearIcon className="size-3.5" />
              </TaskProviderShortcut>
            ) : null}
            {visibleTaskProviders.includes('jira') ? (
              <TaskProviderShortcut
                label={translate(
                  'auto.components.sidebar.SidebarNav.e7ad3c540d',
                  'Open Jira tasks'
                )}
                onOpen={() => openTaskPage({ taskSource: 'jira' })}
              >
                <JiraIcon className="size-3.5" />
              </TaskProviderShortcut>
            ) : null}
          </span>
        </div>
      </ContextMenuTrigger>
      <HideTaskSidebarMenu onHide={hideTasksButton} />
    </ContextMenu>
  )
}
