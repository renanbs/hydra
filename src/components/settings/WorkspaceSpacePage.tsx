// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/components/workspace-space/WorkspaceSpacePage.tsx
// Adapted: Hydra mounts Space as a Settings section (no app-shell view router);
// no lazy boundary (SettingsModal owns mounting). Two tabs: Sizes (ported
// manager view) and Cleanup (portable classification over the same scan).
import { useEffect, useState } from 'react'
import { HardDrive } from 'lucide-react'
import { Badge } from '../ui/badge'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { useWorkspaceSpaceManagerPanel } from './use-workspace-space-manager-panel'
import { WorkspaceSpaceManagerView } from './workspace-space-manager-view'
import { useSpaceGitStatusHydration } from './use-space-git-status-hydration'
import { WorkspaceCleanupSection } from './workspace-cleanup-section'

export function WorkspaceSpacePage(): React.JSX.Element {
  const model = useWorkspaceSpaceManagerPanel()
  useSpaceGitStatusHydration(model.sourceRows)
  const [tab, setTab] = useState<'sizes' | 'cleanup'>('sizes')
  useEffect(() => {
    void useAppStore.getState().hydrateWorkspaceSpaceFromCache()
  }, [])
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-w-0 items-center gap-3 pb-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
          <HardDrive className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-semibold text-foreground">
              {translate('auto.components.workspace.space.WorkspaceSpacePage.45f6302dbc', 'Space')}
            </h1>
            <Badge variant="secondary">
              {translate('auto.components.workspace.space.WorkspaceSpacePage.e8ff1972a3', 'Beta')}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {translate(
              'auto.components.workspace.space.WorkspaceSpacePage.8d0048e1cb',
              'Workspace disk usage and reclaimable worktree storage.'
            )}
          </p>
        </div>
        <div className="flex shrink-0 rounded border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setTab('sizes')}
            className={`px-3 py-1.5 ${tab === 'sizes' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Sizes
          </button>
          <button
            type="button"
            onClick={() => setTab('cleanup')}
            className={`px-3 py-1.5 ${tab === 'cleanup' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Cleanup
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek">
        {tab === 'sizes' ? (
          <WorkspaceSpaceManagerView model={model} />
        ) : (
          <WorkspaceCleanupSection
            rows={model.rows}
            detailsById={model.decisionDetailsByWorktreeId}
            activeWorktreeId={model.activeWorktreeId}
            isScanning={model.isScanning}
            onDeleted={(paths) => model.removeWorkspaceSpaceWorktrees(paths)}
          />
        )}
      </div>
    </div>
  )
}
