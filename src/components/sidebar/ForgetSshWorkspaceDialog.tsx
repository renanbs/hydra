// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/ForgetSshWorkspaceDialog.tsx
// A disconnected or ghost SSH host cannot run the remote worktree removal. The
// frontend contract is: explain the state, offer reconnect-and-delete (when the
// host is still configured) and a local-only forget. Hydra has no per-worktree
// forget IPC yet, so the forget action reports the missing command instead of
// pretending the remote checkout was removed.
import type { SshWorkspaceForgetResolution } from './ssh-workspace-forget-resolution'

export interface ForgetSshWorkspaceDialogProps {
  open: boolean
  displayName: string
  resolution: Exclude<SshWorkspaceForgetResolution, { kind: 'not-ssh' } | { kind: 'connected' }>
  onOpenChange: (open: boolean) => void
  /** Reconnect the SSH target, then retry the delete. */
  onReconnectAndDelete?: () => void
  /** Forget the workspace locally; rejected while the IPC is missing. */
  onForgetWorkspace?: () => Promise<boolean>
}

export function ForgetSshWorkspaceDialog({
  open,
  displayName,
  resolution,
  onOpenChange,
  onReconnectAndDelete,
}: ForgetSshWorkspaceDialogProps): React.JSX.Element | null {
  if (!open) return null
  const isGhost = resolution.kind === 'ghost'
  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[#2a2b30] bg-[#141518] p-5 text-xs text-neutral-200 shadow-2xl"
      >
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
          {isGhost ? 'SSH host no longer exists' : 'SSH host is disconnected'}
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
          <span className="break-all font-medium text-foreground">{displayName}</span> lives on{' '}
          <span className="font-mono text-neutral-300">{resolution.targetId}</span>.{' '}
          {isGhost
            ? 'The target was removed from Settings, so Hydra cannot reach the checkout to delete it. Only the local workspace entry can be forgotten.'
            : 'Reconnect the host to remove the worktree, or forget the workspace locally.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800"
          >
            Cancel
          </button>
          {!isGhost && onReconnectAndDelete ? (
            <button
              type="button"
              onClick={() => {
                onReconnectAndDelete()
                onOpenChange(false)
              }}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-100 transition hover:bg-neutral-800"
            >
              Reconnect & Delete
            </button>
          ) : null}
          <button
            type="button"
            disabled
            title="Hydra has no per-workspace forget command yet"
            className="cursor-not-allowed rounded-lg bg-neutral-700 px-3.5 py-1.5 text-xs font-medium text-neutral-300 opacity-60"
          >
            Forget Workspace
          </button>
        </div>
      </div>
    </div>
  )
}

export default ForgetSshWorkspaceDialog
