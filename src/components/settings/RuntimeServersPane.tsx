// Paired Orca servers pane: list, add (same verify-then-save flow as the
// sidebar dialog), and remove. Ported from Orca (https://github.com/stablyai/orca) —
// Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/settings/RuntimeEnvironmentsPane.tsx (connect section only).
//
// Scope, deliberately: Orca's pane also does connect/disconnect/switch, cloud VMs,
// remote updates and share links. Hydra's backend owns the paired registry (SQLite
// `runtime_environments`) but has no live remote transport, so this pane renders the
// durable half — the saved servers with their endpoints — plus add/remove. Every
// row carries `data-settings-section={environment.id}` so the host-header menu's
// "Manage host…" deep link lands on the concrete server (Orca `sectionId` parity).
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Server, Trash2 } from 'lucide-react'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { AddRemoteHostDialog } from '../sidebar/AddRemoteHostDialog'
import {
  listRuntimeEnvironments,
  removeRuntimeEnvironment,
  type RuntimeEnvironmentSummary
} from '@/store/runtime-environment-bridge'

export function RuntimeServersPane(): React.JSX.Element {
  const [environments, setEnvironments] = useState<RuntimeEnvironmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<RuntimeEnvironmentSummary | null>(null)
  const [removingBusy, setRemovingBusy] = useState(false)
  const mountedRef = useMountedRef()

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const list = await listRuntimeEnvironments()
      if (mountedRef.current) {
        setEnvironments(list)
      }
    } catch {
      if (mountedRef.current) {
        toast.error(
          translate('auto.components.settings.RuntimeServersPane.loadFailed', 'Failed to load paired servers')
        )
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [mountedRef])

  useEffect(() => {
    void load()
  }, [load])

  const runRemove = async (): Promise<void> => {
    if (!removing || removingBusy) {
      return
    }
    setRemovingBusy(true)
    try {
      const removed = await removeRuntimeEnvironment(removing.id)
      if (!mountedRef.current) {
        return
      }
      if (!removed) {
        toast.error(
          translate('auto.components.settings.RuntimeServersPane.removeMissing', 'That server is already gone.')
        )
      } else {
        toast.success(
          translate('auto.components.settings.RuntimeServersPane.removed', 'Removed {{value0}}.', {
            value0: removing.name
          })
        )
      }
      setRemoving(null)
      await load()
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : translate('auto.components.settings.RuntimeServersPane.removeFailed', 'Failed to remove server')
        )
      }
    } finally {
      if (mountedRef.current) {
        setRemovingBusy(false)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {translate('auto.components.settings.RuntimeServersPane.title', 'Paired servers')}
          </p>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.RuntimeServersPane.description',
              'Hydra runtimes paired from another computer. Saved on this machine; remove one when it is retired.'
            )}
          </p>
        </div>
        <Button variant="outline" size="xs" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="size-3" />
          {translate('auto.components.settings.RuntimeServersPane.add', 'Add Server')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 px-4 py-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {translate('auto.components.settings.RuntimeServersPane.loading', 'Loading paired servers…')}
        </div>
      ) : environments.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-5 text-sm text-muted-foreground">
          {translate('auto.components.settings.RuntimeServersPane.empty', 'No paired servers yet.')}
        </div>
      ) : (
        <div className="divide-y divide-border/50 rounded-lg border border-border/50 bg-card/30">
          {environments.map((environment) => (
            <div
              key={environment.id}
              data-settings-section={environment.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Server className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{environment.name}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setRemoving(environment)}
                aria-label={translate(
                  'auto.components.settings.RuntimeServersPane.removeLabel',
                  'Remove {{value0}}',
                  { value0: environment.name }
                )}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Reuses the sidebar's server form so Add Server behaves identically in both places. */}
      <AddRemoteHostDialog
        mode={addOpen ? 'server' : null}
        onOpenChange={(mode) => {
          setAddOpen(mode !== null)
          if (mode === null) {
            void load()
          }
        }}
      />

      <Dialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null)
          }
        }}
      >
        <DialogContent className="max-w-sm sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-sm">
              {translate('auto.components.settings.RuntimeServersPane.removeTitle', 'Remove Server')}
            </DialogTitle>
            <DialogDescription>
              {translate(
                'auto.components.settings.RuntimeServersPane.removeDescription',
                'This removes the saved server from this computer.'
              )}
            </DialogDescription>
          </DialogHeader>
          {removing ? (
            <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2 text-xs">
              <div className="truncate font-medium">{removing.name}</div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoving(null)}
              disabled={removingBusy}
            >
              {translate('auto.components.settings.RuntimeServersPane.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void runRemove()} disabled={removingBusy}>
              {removingBusy ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {translate('auto.components.settings.RuntimeServersPane.remove', 'Remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
