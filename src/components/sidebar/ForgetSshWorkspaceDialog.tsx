// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/ForgetSshWorkspaceDialog.tsx
// A disconnected or ghost SSH host cannot run the remote worktree removal. The dialog
// explains which case it is, names the host (live label → removed label → raw id), and offers
// "Remove from Orca" plus — only when the target still exists — "Reconnect & Delete".
import { useState } from 'react'
import { Loader2, Server, ServerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { SshWorkspaceForgetResolution } from './ssh-workspace-forget-resolution'

type ForgetResolution = Exclude<
  SshWorkspaceForgetResolution,
  { kind: 'not-ssh' } | { kind: 'connected' }
>

export interface ForgetSshWorkspaceDialogProps {
  open: boolean
  displayName: string
  resolution: ForgetResolution
  onOpenChange: (open: boolean) => void
  /** Reconnect the SSH target, then retry the delete. */
  onReconnectAndDelete?: () => void | Promise<boolean>
  /** Forget the workspace locally. Resolves false when the IPC rejected. */
  onForgetWorkspace?: () => Promise<boolean>
}

export function ForgetSshWorkspaceDialog({
  open,
  displayName,
  resolution,
  onOpenChange,
  onReconnectAndDelete,
  onForgetWorkspace
}: ForgetSshWorkspaceDialogProps): React.JSX.Element | null {
  const [busy, setBusy] = useState<null | 'reconnect' | 'forget'>(null)
  const hostLabel = useAppStore(
    (s) =>
      s.sshTargetLabels.get(resolution.targetId) ??
      s.removedSshTargetLabels.get(resolution.targetId) ??
      resolution.targetId
  )
  if (!open) {
    return null
  }
  const canReconnect = resolution.kind === 'disconnected'

  const run = async (
    kind: 'reconnect' | 'forget',
    action?: () => void | Promise<boolean>
  ): Promise<void> => {
    if (!action || busy !== null) {
      return
    }
    setBusy(kind)
    try {
      const applied = await action()
      if (applied !== false) {
        onOpenChange(false)
      }
    } catch {
      // The action owner reports its own failure toast; never close on throw.
    } finally {
      setBusy(null)
    }
  }

  const forgetDescription = translate(
    'auto.components.sidebar.ForgetSshWorkspaceDialog.forgetBody',
    'Removes this workspace from Hydra only. Files, the Git worktree, and branches on {{host}} are left untouched.',
    { host: hostLabel }
  )

  return (
    <Dialog open onOpenChange={(nextOpen) => (!nextOpen ? onOpenChange(false) : undefined)}>
      <DialogContent className="gap-3 p-5 sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="gap-1">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <ServerOff className="size-4 text-muted-foreground" />
            {translate(
              'auto.components.sidebar.ForgetSshWorkspaceDialog.title',
              'Delete “{{name}}”?',
              { name: displayName }
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {canReconnect
              ? translate(
                  'auto.components.sidebar.ForgetSshWorkspaceDialog.disconnectedBody',
                  'The SSH host for this workspace is not connected. Reconnect to delete it on the remote too, or remove it from Hydra only.'
                )
              : translate(
                  'auto.components.sidebar.ForgetSshWorkspaceDialog.ghostBody',
                  '{{host}} is no longer a saved SSH host, so this workspace is no longer connected to a live host. It can only be removed from Hydra — files and branches on the remote are left untouched.',
                  { host: hostLabel }
                )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2.5 rounded-md border border-border/50 bg-card/40 px-3 py-2">
          <Server className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{hostLabel}</span>
        </div>

        {/* Why: the ghost description already says files are untouched, so only repeat the
            reassurance on the reconnect (disconnected) path. */}
        {canReconnect ? (
          <p className="text-[11px] leading-snug text-muted-foreground">{forgetDescription}</p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy !== null}
          >
            {translate('auto.components.sidebar.ForgetSshWorkspaceDialog.cancel', 'Cancel')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void run('forget', onForgetWorkspace)}
            disabled={busy !== null || !onForgetWorkspace}
          >
            {busy === 'forget' ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {translate('auto.components.sidebar.ForgetSshWorkspaceDialog.forget', 'Remove from Hydra')}
          </Button>
          {canReconnect ? (
            <Button
              size="sm"
              onClick={() => void run('reconnect', onReconnectAndDelete)}
              disabled={busy !== null || !onReconnectAndDelete}
            >
              {busy === 'reconnect' ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {translate(
                'auto.components.sidebar.ForgetSshWorkspaceDialog.reconnectAndDelete',
                'Reconnect & Delete'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ForgetSshWorkspaceDialog
