// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/HostRemoveDialog.tsx
// Removing an SSH host: says what happens to its workspaces, optionally clears them first
// (local forget is backed by `ssh_forget_workspace`; remote deletion runs
// `ssh_remote_delete_worktree` on the host and keeps branches it cannot prove merged), aborts
// atomically when a workspace fails so no ghost rows survive, then deletes the target and
// drops its now-orphaned display-name override.
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { invoke } from '@tauri-apps/api/core'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SwitchIndicator } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { getAllWorktreesFromState } from '@/store/selectors'
import { hydrateSshTargets, removeSshTarget } from '@/store/ssh-bridge'
import { PROJECTS_REFRESH_EVENT } from '@/lib/refresh-projects-awaitable'
import type { CatalogEnvelope } from '@/lib/catalog-types'
import type { ExecutionHostId } from '../../shared/execution-host'
import { clearHostRename } from './host-rename-remove'
import { selectSshHostCatalogRows, type SshHostCatalogRow } from './ssh-host-remove-catalog'
import { resolveSshHostRemoval } from './ssh-host-remove-resolution'
import { clearSshHostWorkspaces } from './ssh-host-remove-workspaces'

type HostRemoveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  hostId: ExecutionHostId
  /** The label the host shows, used in the dialog copy and the success toast. */
  label: string
  /** Registry id to delete (SSH hosts). */
  targetId?: string
  /** Paired environment id (runtime hosts — Orca deep-links removal into the servers pane). */
  runtimeEnvironmentId?: string
}

export function HostRemoveDialog({
  open,
  onOpenChange,
  hostId,
  label,
  targetId,
  runtimeEnvironmentId
}: HostRemoveDialogProps): React.JSX.Element | null {
  // Runtime hosts remove through the paired servers pane: the Orca servers pane owns
  // active-environment switching and the removal error context, so the sidebar menu
  // deep-links there instead of duplicating that flow (Orca `handleRemoveRuntime` parity).
  if (runtimeEnvironmentId !== undefined) {
    return (
      <RuntimeHostRemoveRedirect
        open={open}
        onOpenChange={onOpenChange}
        label={label}
        environmentId={runtimeEnvironmentId}
      />
    )
  }
  if (targetId === undefined) {
    return null
  }
  return (
    <SshHostRemoveDialog
      open={open}
      onOpenChange={onOpenChange}
      hostId={hostId}
      label={label}
      targetId={targetId}
    />
  )
}

function RuntimeHostRemoveRedirect({
  open,
  onOpenChange,
  label,
  environmentId
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  environmentId: string
}): React.JSX.Element {
  const handleOpenSettings = (): void => {
    window.dispatchEvent(
      new CustomEvent('hydra:open-settings', {
        detail: { section: 'servers', sectionId: environmentId }
      })
    )
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {translate(
              'auto.components.sidebar.HostRemoveDialog.3c4d5e6f7a',
              'Remove {{value0}}?',
              { value0: label }
            )}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.sidebar.HostRemoveDialog.4d5e6f7a8b',
              'This opens the paired servers settings where you can remove this server.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {translate('auto.components.sidebar.HostRemoveDialog.6f7a8b9c0d', 'Cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={handleOpenSettings}>
            {translate('auto.components.sidebar.HostRemoveDialog.7a8b9c0d1e', 'Open settings')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SshHostRemoveDialog({
  open,
  onOpenChange,
  hostId,
  label,
  targetId
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hostId: ExecutionHostId
  label: string
  targetId: string
}): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  // Why: removing the host only (keeping workspaces) is the safe, reversible default.
  // Deleting the remote workspaces is destructive, so it lives behind an Advanced
  // disclosure and must be opted into explicitly.
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [deleteWorkspaces, setDeleteWorkspaces] = useState(false)
  const mountedRef = useMountedRef()

  const repos = useAppStore((s) => s.repos)
  const worktreesByRepo = useAppStore((s) => s.worktreesByRepo)
  const sshConnectionStates = useAppStore((s) => s.sshConnectionStates)
  // Why the catalog too: the live store composes no repo ring, so its rows can be empty
  // while the sidebar still shows projects on this host. The catalog is the projection
  // App renders, so it is the only source that can name those rows.
  const [catalogRows, setCatalogRows] = useState<SshHostCatalogRow[]>([])

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    invoke<CatalogEnvelope>('catalog_get')
      .then((envelope) => {
        if (!cancelled) {
          setCatalogRows(selectSshHostCatalogRows(envelope, targetId))
        }
      })
      // Why not fatal: the store rows (when present) still drive the dialog, and a
      // catalog read failure must not block removing the host itself.
      .catch(() => {
        if (!cancelled) {
          setCatalogRows([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, targetId])

  // Why: read the count off live state, not a cached row badge, so a workspace
  // created or removed since the menu opened is reflected in what the user is told.
  const resolution = useMemo(
    () =>
      resolveSshHostRemoval({
        targetId,
        repos,
        worktrees: getAllWorktreesFromState({ worktreesByRepo }),
        sshConnectionStates,
        catalogRows
      }),
    [targetId, repos, worktreesByRepo, sshConnectionStates, catalogRows]
  )

  const workspaceCount = resolution.workspaceCount
  const hasWorkspaces = workspaceCount > 0
  const isConnected = resolution.isConnected

  const dropOverridesForHost = (): void => {
    const state = useAppStore.getState()
    // Why: dropping a host should also drop its now-orphaned label override so a future
    // host reusing the same id doesn't inherit a stale rename.
    void state.updateSettings({
      hostSettingOverrides: clearHostRename(state.settings, hostId)
    })
  }

  const runRemoval = async (): Promise<void> => {
    setBusy(true)
    try {
      if (deleteWorkspaces && hasWorkspaces) {
        const worktreeRows = getAllWorktreesFromState({ worktreesByRepo }).map((worktree) => ({
          id: worktree.id,
          path: worktree.path,
          repoPath: repos.find((repo) => repo.id === worktree.repoId)?.path ?? ''
        }))
        const { failedIds, error, preservedBranches } = await clearSshHostWorkspaces({
          resolution,
          worktrees: worktreeRows,
          repos: repos.map((repo) => ({ id: repo.id, path: repo.path })),
          // Connected hosts delete the checkout on the host; offline/ghost hosts can only forget.
          mode: isConnected ? 'delete-remote' : 'forget-local'
        })
        // Why: never remove the target while some workspaces failed — that would strand
        // ghost rows behind a now-gone host. Surface the failure and keep the target.
        if (failedIds.length > 0) {
          // The rows that did clear are already gone from the catalog; App has to
          // re-read it even though the host stays for a retry.
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(PROJECTS_REFRESH_EVENT))
          }
          toast.error(
            translate(
              'auto.components.sidebar.HostRemoveDialog.workspacesFailed',
              'Could not remove {{count}} of this host’s workspaces. The host was kept so you can retry.',
              { count: failedIds.length }
            ),
            error ? { description: error } : undefined
          )
          return
        }
        if (preservedBranches.length > 0) {
          // A worktree removal never deletes branches, so say what stayed behind.
          toast.info(
            translate(
              'auto.components.sidebar.HostRemoveDialog.branchesPreserved',
              'Kept {{count}} branches on the host',
              { count: preservedBranches.length }
            ),
            { description: preservedBranches.join(', ') }
          )
        }
      }
      await removeSshTarget(targetId)
      // Why: drop the target's local leftovers (connection state, tab bindings, labels)
      // before re-reading the registry, so nothing keeps pointing at a dead id.
      useAppStore.getState().clearRemovedSshTargetState(targetId)
      dropOverridesForHost()
      await hydrateSshTargets()
      // Why refresh: the cascade may have dropped catalog rows, and the host itself is
      // gone from the registry. App owns the sidebar projection, so this is the only
      // way it drops the stale host section without a reload.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PROJECTS_REFRESH_EVENT))
      }
      if (mountedRef.current) {
        onOpenChange(false)
      }
      toast.success(
        translate('auto.components.sidebar.HostRemoveDialog.1a2b3c4d5e', 'Removed {{value0}}', {
          value0: label
        })
      )
    } catch (err) {
      if (!mountedRef.current) {
        return
      }
      toast.error(
        err instanceof Error
          ? err.message
          : translate('auto.components.sidebar.HostRemoveDialog.2b3c4d5e6f', 'Failed to remove host')
      )
    } finally {
      if (mountedRef.current) {
        setBusy(false)
      }
    }
  }

  const workspaceCountLabel =
    workspaceCount === 1
      ? translate('auto.components.sidebar.HostRemoveDialog.oneWorkspace', '1 workspace')
      : translate(
          'auto.components.sidebar.HostRemoveDialog.manyWorkspaces',
          '{{count}} workspaces',
          { count: workspaceCount }
        )

  const description = hasWorkspaces
    ? translate(
        'auto.components.sidebar.HostRemoveDialog.hostHasWorkspacesDefault',
        'Removes {{value0}} and its credentials from this computer. Its {{value1}} stay in Orca — remote files are not touched.',
        { value0: label, value1: workspaceCountLabel }
      )
    : translate(
        'auto.components.sidebar.HostRemoveDialog.5e6f7a8b9c',
        'This removes the saved SSH host and its credentials from this computer. Remote files are not deleted.'
      )

  // The destructive opt-in wording depends on whether we delete remote files or only
  // forget Orca's records (offline/ghost host).
  const deleteOptionLabel = isConnected
    ? translate(
        'auto.components.sidebar.HostRemoveDialog.alsoDeleteRemote',
        'Also delete these {{value0}} on {{value1}}',
        { value0: workspaceCountLabel, value1: label }
      )
    : translate(
        'auto.components.sidebar.HostRemoveDialog.alsoForgetLocal',
        'Also remove these {{value0}} from Orca',
        { value0: workspaceCountLabel }
      )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {translate(
              'auto.components.sidebar.HostRemoveDialog.3c4d5e6f7a',
              'Remove {{value0}}?',
              { value0: label }
            )}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {hasWorkspaces ? (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
              className="-ml-2 text-xs"
            >
              {translate('auto.components.sidebar.HostRemoveDialog.advanced', 'Advanced')}
              <ChevronDown
                className={cn('size-4 transition-transform', advancedOpen && 'rotate-180')}
              />
            </Button>
            {advancedOpen ? (
              <div className="flex items-start gap-3 px-1 pt-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={deleteWorkspaces}
                  aria-label={deleteOptionLabel}
                  onClick={() => setDeleteWorkspaces((value) => !value)}
                  className="group mt-0.5 flex shrink-0 cursor-pointer items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <SwitchIndicator checked={deleteWorkspaces} />
                </button>
                <span className="min-w-0 flex-1 text-xs leading-snug">
                  <span className="font-medium text-foreground">{deleteOptionLabel}</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {isConnected
                      ? translate(
                          'auto.components.sidebar.HostRemoveDialog.alsoDeleteRemoteHint',
                          'Permanently deletes the remote Git worktrees and their branches. Cannot be undone.'
                        )
                      : translate(
                          'auto.components.sidebar.HostRemoveDialog.alsoForgetLocalHint',
                          'Clears them from Orca only. Remote files, worktrees, and branches are left untouched.'
                        )}
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {translate('auto.components.sidebar.HostRemoveDialog.6f7a8b9c0d', 'Cancel')}
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => void runRemoval()}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {translate('auto.components.sidebar.HostRemoveDialog.8b9c0d1e2f', 'Remove host')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
