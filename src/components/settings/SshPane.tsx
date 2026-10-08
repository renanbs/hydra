// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/settings/SshPane.tsx`, restricted to what the Hydra registry
// can actually do: list the targets, add one through the shared Add-host dialog, edit one
// through the form, and remove one through the shared workspace-aware Remove dialog. The
// connection half of Orca's pane (connect/disconnect/test/terminate/relay) has no backend
// here — the SshTargetCard renders none of it when those props are absent — and the
// `~/.ssh/config` bulk import stays the Add-host picker's `Add all` path.
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import type { SshTarget } from '../../shared/ssh-types'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '../ui/button'
import { translate } from '@/i18n/i18n'
import { hydrateSshTargets, updateSshTarget } from '@/store/ssh-bridge'
import { AddRemoteHostDialog } from '../sidebar/AddRemoteHostDialog'
import { HostRemoveDialog } from '../sidebar/HostRemoveDialog'
import { SshTargetCard } from './SshTargetCard'
import { SshTargetForm } from './SshTargetForm'
import { EMPTY_FORM, getEditingTargetForSshTarget, type EditingTarget } from './ssh-target-draft'
import { buildSshTargetSavePayload } from './ssh-target-save-payload'

export function SshPane(): React.JSX.Element {
  const [targets, setTargets] = useState<SshTarget[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditingTarget>(EMPTY_FORM)
  // Why: gates the submit button and the Enter path so a double click cannot land two
  // `ssh_update_target` writes for one draft.
  const [saving, setSaving] = useState(false)
  // Why: removal goes through the shared workspace-aware dialog, so the user is told what
  // happens to any workspace still pointing at the host before it is deleted.
  const [removing, setRemoving] = useState<{ id: string; label: string } | null>(null)
  const mountedRef = useMountedRef()

  const loadTargets = useCallback(async (): Promise<void> => {
    try {
      // One read of the registry, once on open and once after every mutation — no polling.
      const list = await hydrateSshTargets()
      if (mountedRef.current) {
        setTargets(list)
      }
    } catch {
      if (mountedRef.current) {
        toast.error(
          translate('auto.components.settings.SshPane.f1fc50dad2', 'Failed to load SSH targets')
        )
      }
    }
  }, [mountedRef])

  useEffect(() => {
    void loadTargets()
  }, [loadTargets])

  const cancelForm = (): void => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleEdit = (target: SshTarget): void => {
    setEditingId(target.id)
    setForm(getEditingTargetForSshTarget(target))
  }

  const handleSave = async (): Promise<void> => {
    if (editingId === null || saving) {
      return
    }
    const savePayload = buildSshTargetSavePayload(form)
    if (!savePayload.ok) {
      toast.error(savePayload.error)
      return
    }
    setSaving(true)
    try {
      const updated = await updateSshTarget(editingId, savePayload.payload.updates)
      if (!mountedRef.current) {
        return
      }
      // Why: `null` means main holds no target with that id any more — the host went away
      // between opening the form and the write, so a silent "updated" toast would lie.
      if (updated === null) {
        toast.error(
          translate('auto.components.settings.SshPane.2227ce47b6', 'Failed to save target')
        )
      } else {
        toast.success(translate('auto.components.settings.SshPane.b4ba0ce33d', 'Target updated'))
      }
      cancelForm()
      await loadTargets()
    } catch (err) {
      if (mountedRef.current) {
        toast.error(
          err instanceof Error
            ? err.message
            : translate('auto.components.settings.SshPane.2227ce47b6', 'Failed to save target')
        )
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {translate('auto.components.settings.SshPane.94c5284560', 'Targets')}
          </p>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.SshPane.a7d28dff81',
              'Add a remote host to connect to it in Orca.'
            )}
          </p>
        </div>
        <Button variant="outline" size="xs" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="size-3" />
          {translate('auto.components.settings.SshPane.639ceb3698', 'Add Target')}
        </Button>
      </div>

      {targets.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-5 text-sm text-muted-foreground">
          {translate('auto.components.settings.SshPane.c0f1c80166', 'No SSH targets configured.')}
        </div>
      ) : (
        <div className="space-y-2">
          {targets.map((target) => (
            <SshTargetCard
              key={target.id}
              target={target}
              onEdit={handleEdit}
              onRemove={(id) => setRemoving({ id, label: target.label })}
            />
          ))}
        </div>
      )}

      {/* Why: adding keeps the one form the sidebar already uses (SSH-config picker included). */}
      <AddRemoteHostDialog
        mode={addOpen ? 'ssh' : null}
        onOpenChange={(mode) => {
          setAddOpen(mode !== null)
          if (mode === null) {
            void loadTargets()
          }
        }}
      />

      <SshTargetForm
        open={editingId !== null}
        form={form}
        saving={saving}
        onFormChange={setForm}
        onSave={() => void handleSave()}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            cancelForm()
          }
        }}
      />

      {removing ? (
        <HostRemoveDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setRemoving(null)
              // Re-read after a delete or a cancel alike: the dialog owns the write, so the
              // pane cannot tell which happened and the read is idempotent.
              void loadTargets()
            }
          }}
          targetId={removing.id}
          label={removing.label}
        />
      ) : null}
    </div>
  )
}
