// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/HostRenameDialog.tsx`, with one deliberate
// difference: Orca stores the rename as a client-only display-label override, while Hydra
// writes the registry label itself through `ssh_update_target`. So the field starts on the
// host's real label (not an override), a blank name is refused instead of meaning "reset",
// and there is no "Reset to default" affordance — there is no override to reset.
import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { hydrateSshTargets, updateSshTarget } from '@/store/ssh-bridge'
import { validateHostLabel, type HostLabelValidationError } from './host-rename-validation'

type HostRenameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Registry id the rename writes. */
  targetId: string
  /** The label the host currently shows, used to seed the field. */
  currentLabel: string
}

export function HostRenameDialog({
  open,
  onOpenChange,
  targetId,
  currentLabel
}: HostRenameDialogProps): React.JSX.Element {
  const sshTargetLabels = useAppStore((s) => s.sshTargetLabels)
  const [value, setValue] = useState(currentLabel)
  const [error, setError] = useState<HostLabelValidationError | null>(null)
  const [busy, setBusy] = useState(false)
  const mountedRef = useMountedRef()

  // Why: reseed from the host's live label on every open, so a cancelled edit doesn't
  // leak into the next one and a rename that landed elsewhere isn't shown as pending.
  useEffect(() => {
    if (open) {
      setValue(currentLabel)
      setError(null)
    }
  }, [open, currentLabel])

  const submit = async (): Promise<void> => {
    const validation = validateHostLabel({
      value,
      currentTargetId: targetId,
      sshTargetLabels
    })
    if (!validation.ok) {
      setError(validation.reason)
      return
    }
    setBusy(true)
    try {
      // A `null` result means main no longer holds the target (removed mid-edit). The
      // re-read below is what drops it from the sidebar, but the rename itself did not
      // land, so it is reported instead of closing the dialog as though it had.
      const updated = await updateSshTarget(targetId, { label: validation.label })
      await hydrateSshTargets()
      if (!mountedRef.current) {
        return
      }
      if (updated === null) {
        toast.error(
          translate('auto.components.sidebar.HostRenameDialog.renameFailed', 'Failed to rename host.')
        )
        return
      }
      onOpenChange(false)
    } catch (err) {
      if (!mountedRef.current) {
        return
      }
      toast.error(
        err instanceof Error
          ? err.message
          : translate('auto.components.sidebar.HostRenameDialog.renameFailed', 'Failed to rename host.')
      )
    } finally {
      if (mountedRef.current) {
        setBusy(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {translate('auto.components.sidebar.HostRenameDialog.1a2b3c4d5e', 'Rename host')}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.sidebar.HostRenameDialog.description',
              'The saved SSH host is renamed everywhere it appears — sidebar, pickers and settings.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="host-rename-input">
            {translate('auto.components.sidebar.HostRenameDialog.3c4d5e6f7a', 'Display name')}
          </Label>
          <Input
            id="host-rename-input"
            autoFocus
            value={value}
            aria-invalid={error !== null}
            aria-describedby={error ? 'host-rename-error' : undefined}
            onChange={(event) => {
              setValue(event.target.value)
              setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void submit()
              }
            }}
          />
          {error ? (
            <p id="host-rename-error" className="text-[12px] text-destructive">
              {error === 'empty'
                ? translate(
                    'auto.components.sidebar.HostRenameDialog.labelRequired',
                    'Enter a name for this host.'
                  )
                : translate(
                    'auto.components.sidebar.HostRenameDialog.labelDuplicate',
                    'Another host already uses this name.'
                  )}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {translate('auto.components.sidebar.HostRenameDialog.5e6f7a8b9c', 'Cancel')}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {translate('auto.components.sidebar.HostRenameDialog.6f7a8b9c0d', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
