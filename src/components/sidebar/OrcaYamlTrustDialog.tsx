// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/OrcaYamlTrustDialog.tsx
import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'
import type { AppState } from '@/store/types'

type ScriptKind = 'setup' | 'archive' | 'issueCommand' | 'vmRecipe'

type OrcaYamlTrustState = {
  activeModal: string
  modalData: Record<string, unknown>
  closeModal: () => void
  markOrcaHookScriptConfirmed: (repoId: string, kind: ScriptKind, contentHash: string) => void
  markOrcaHookRepoAlwaysTrusted: (repoId: string) => void
}

const SCRIPT_KIND_LABEL: Record<ScriptKind, string> = {
  setup: 'setup script',
  archive: 'archive script',
  issueCommand: 'issue command',
  vmRecipe: 'VM recipe'
}

const SCRIPT_KIND_TRIGGER: Record<ScriptKind, string> = {
  setup: 'when this workspace is created',
  archive: 'when this workspace is removed',
  issueCommand: 'when this workspace launches with a linked issue',
  vmRecipe: 'before provisioning a VM'
}

function getScriptKind(value: unknown): ScriptKind {
  return value === 'archive' || value === 'issueCommand' || value === 'vmRecipe'
    ? value
    : 'setup'
}

/**
 * Confirmation gate for committed `orca.yaml` hooks. It renders only while the
 * host asks for a decision; renderer trust is UX state, the host remains the
 * authority that actually executes or skips the hook.
 */
export function OrcaYamlTrustDialog(): React.JSX.Element | null {
  // Reason: the composed UI slice is typed as `any` on this branch; these are the
  // modal and trust-action fields the hook gate opens with.
  const state = useAppStore((value) => value as AppState & OrcaYamlTrustState)
  const isOpen = state.activeModal === 'confirm-orca-yaml-hooks'
  const [alwaysTrustState, setAlwaysTrustState] = useState(() => ({ isOpen, value: false }))

  // Never show a stale "always trust" choice on a new hook prompt; reset during
  // render avoids one paint with the old decision checked.
  if (alwaysTrustState.isOpen !== isOpen) {
    setAlwaysTrustState({ isOpen, value: false })
  }
  const alwaysTrust = alwaysTrustState.isOpen === isOpen ? alwaysTrustState.value : false
  const setAlwaysTrust = (value: boolean): void => setAlwaysTrustState({ isOpen, value })

  const repoId = typeof state.modalData.repoId === 'string' ? state.modalData.repoId : ''
  const repoName =
    typeof state.modalData.repoName === 'string' ? state.modalData.repoName : 'this repository'
  const scriptKind = getScriptKind(state.modalData.scriptKind)
  const scriptContent =
    typeof state.modalData.scriptContent === 'string' ? state.modalData.scriptContent : ''
  const contentHash =
    typeof state.modalData.contentHash === 'string' ? state.modalData.contentHash : ''
  const previouslyApproved = state.modalData.previouslyApproved === true
  const onResolve =
    typeof state.modalData.onResolve === 'function'
      ? (state.modalData.onResolve as (decision: 'run' | 'skip') => void)
      : null

  const resolveAndClose = useCallback(
    (decision: 'run' | 'skip') => {
      if (decision === 'run' && repoId) {
        if (alwaysTrust) {
          state.markOrcaHookRepoAlwaysTrusted(repoId)
        } else if (contentHash) {
          state.markOrcaHookScriptConfirmed(repoId, scriptKind, contentHash)
        }
      }
      onResolve?.(decision)
      state.closeModal()
    },
    [
      alwaysTrust,
      contentHash,
      onResolve,
      repoId,
      scriptKind,
      state
    ]
  )

  if (!isOpen) return null

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) resolveAndClose('skip')
      }}
    >
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm">
            {previouslyApproved
              ? `${repoName}'s ${SCRIPT_KIND_LABEL[scriptKind]} changed — run the new version?`
              : `Run ${SCRIPT_KIND_LABEL[scriptKind]} from ${repoName}?`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {previouslyApproved ? (
              <>
                <code>orca.yaml</code> changed since you last approved. Re-review before it runs{' '}
                {SCRIPT_KIND_TRIGGER[scriptKind]}.
              </>
            ) : (
              <>
                This repository&apos;s <code>orca.yaml</code> runs on your machine{' '}
                {SCRIPT_KIND_TRIGGER[scriptKind]}. Only run if you trust {repoName}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {scriptContent && (
          <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {previouslyApproved
                ? `New ${scriptKind} script`
                : `${scriptKind} script`}
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-foreground scrollbar-sleek">
              {scriptContent}
            </pre>
          </div>
        )}

        <label
          className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors ${
            alwaysTrust
              ? 'border-primary/60 bg-primary/5'
              : 'border-border/70 bg-muted/25 hover:border-border hover:bg-muted/40'
          }`}
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={alwaysTrust}
            onChange={(event) => setAlwaysTrust(event.target.checked)}
          />
          <span className="text-xs font-medium text-foreground">
            Always trust <code>orca.yaml</code> in {repoName}
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => resolveAndClose('skip')}>
            Don&apos;t run
          </Button>
          <Button onClick={() => resolveAndClose('run')}>Run hooks</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OrcaYamlTrustDialog
