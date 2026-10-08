// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/HostRemoveDialog.tsx`, reduced to the one removal
// Hydra can execute: delete the SSH target from this computer's registry.
//
// Orca's `Advanced` switch ("also delete these workspaces / forget them locally") is
// absent, not inert: clearing a host's workspaces needs the remote-execution path
// (delete-remote) or the ghost-workspace forget flow, both of which land with the
// settings/removal PR. What remains here is the safe, reversible half — the host goes,
// its workspaces stay in Orca pointing at the tombstoned id, and the dialog says so.
import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { resolveSshHostRemoval } from './ssh-host-remove-resolution'

type HostRemoveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Registry id to delete. */
  targetId: string
  /** The label the host shows, used in the dialog copy and the success toast. */
  label: string
}

export function HostRemoveDialog({
  open,
  onOpenChange,
  targetId,
  label
}: HostRemoveDialogProps): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const mountedRef = useMountedRef()
  const repos = useAppStore((s) => s.repos)
  const worktreesByRepo = useAppStore((s) => s.worktreesByRepo)

  // Why: read the count off live store state, not a cached row badge, so a workspace
  // created or removed since the menu opened is reflected in what the user is told.
  const workspaceCount = useMemo(
    () =>
      resolveSshHostRemoval({
        targetId,
        repos,
        worktrees: getAllWorktreesFromState({ worktreesByRepo })
      }).workspaceCount,
    [targetId, repos, worktreesByRepo]
  )

  const runRemoval = async (): Promise<void> => {
    setBusy(true)
    try {
      await removeSshTarget(targetId)
      // Why: drop the target's local leftovers (connection state, tab bindings, labels)
      // before re-reading the registry, so nothing keeps pointing at a dead id.
      useAppStore.getState().clearRemovedSshTargetState(targetId)
      await hydrateSshTargets()
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
            {workspaceCount > 0
              ? translate(
                  'auto.components.sidebar.HostRemoveDialog.hostHasWorkspacesDefault',
                  'Removes {{value0}} and its credentials from this computer. Its {{value1}} stay in Orca — remote files are not touched.',
                  { value0: label, value1: workspaceCountLabel }
                )
              : translate(
                  'auto.components.sidebar.HostRemoveDialog.5e6f7a8b9c',
                  'This removes the saved SSH host and its credentials from this computer. Remote files are not deleted.'
                )}
          </DialogDescription>
        </DialogHeader>
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
