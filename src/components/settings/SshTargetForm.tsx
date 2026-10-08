// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/settings/SshTargetForm.tsx`, restricted to the one job the
// Hydra pane gives it: editing a registered target (label, host, port, username, identity
// file). Adding a host stays the shared Add-host dialog's job. Orca's `Advanced Connection`
// section (GSSAPI/proxy/jump/relay timeout) and its dirty-draft outside-dismiss guard land
// with that section's PR; Cancel/×/Escape are the explicit discard paths meanwhile.
import { FileKey } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { translate } from '@/i18n/i18n'
import { applyParsedSshHostInput, type EditingTarget } from './ssh-target-draft'

type SshTargetFormProps = {
  open: boolean
  form: EditingTarget
  saving: boolean
  onFormChange: (updater: (prev: EditingTarget) => EditingTarget) => void
  onSave: () => void
  onOpenChange: (open: boolean) => void
}

function editingEndpointSummary(form: EditingTarget): string {
  const host = form.host.trim()
  if (!host) {
    return form.label.trim()
  }
  const username = form.username.trim()
  const port = form.port.trim()
  const userHost = username ? `${username}@${host}` : host
  return port ? `${userHost}:${port}` : userHost
}

export function SshTargetForm({
  open,
  form,
  saving,
  onFormChange,
  onSave,
  onOpenChange
}: SshTargetFormProps): React.JSX.Element {
  const editingLabel = form.label.trim()
  const endpointSummary = editingEndpointSummary(form)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-3rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            // Why: Enter still submits while the button is disabled, so gate here too.
            if (saving) {
              return
            }
            onSave()
          }}
        >
          <DialogHeader className="shrink-0 gap-1.5 border-b border-border/60 px-6 pt-6 pr-12 pb-4 text-left">
            <DialogTitle>
              {translate('auto.components.settings.SshTargetForm.editTitle', 'Edit SSH host')}
            </DialogTitle>
            <DialogDescription>
              {translate(
                'auto.components.settings.SshTargetForm.editDescription',
                'Update connection details for this machine. Changes apply on next connect.'
              )}
            </DialogDescription>
            {editingLabel !== '' || endpointSummary !== '' ? (
              <p className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                {translate('auto.components.settings.SshTargetForm.editingPrefix', 'Editing')}
                {editingLabel !== '' ? (
                  <span className="font-medium text-foreground">{editingLabel}</span>
                ) : null}
                {editingLabel !== '' && endpointSummary !== '' && endpointSummary !== editingLabel ? (
                  <span aria-hidden="true">·</span>
                ) : null}
                {endpointSummary !== '' && endpointSummary !== editingLabel ? (
                  <span className="truncate font-mono text-[11px] text-foreground">
                    {endpointSummary}
                  </span>
                ) : null}
              </p>
            ) : null}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 scrollbar-sleek">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ssh-target-label">
                  {translate('auto.components.settings.SshTargetForm.298de87a88', 'Label')}
                </Label>
                <Input
                  id="ssh-target-label"
                  value={form.label}
                  onChange={(e) => onFormChange((f) => ({ ...f, label: e.target.value }))}
                  placeholder={translate(
                    'auto.components.settings.SshTargetForm.b8dab0aa7b',
                    'My Server'
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ssh-target-host">
                  {translate('auto.components.settings.SshTargetForm.ce370ce674', 'Host or alias *')}
                </Label>
                <Input
                  id="ssh-target-host"
                  value={form.host}
                  autoFocus
                  onChange={(e) => onFormChange((f) => ({ ...f, host: e.target.value }))}
                  onBlur={() => onFormChange(applyParsedSshHostInput)}
                  placeholder={translate(
                    'auto.components.settings.SshTargetForm.2ee9bcd2e8',
                    'server, deploy@server:2222, ssh://server'
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ssh-target-username">
                  {translate('auto.components.settings.SshTargetForm.dc1dc52aaa', 'Username')}
                </Label>
                <Input
                  id="ssh-target-username"
                  value={form.username}
                  onChange={(e) => onFormChange((f) => ({ ...f, username: e.target.value }))}
                  placeholder={translate('auto.components.settings.SshTargetForm.47e082bc17', 'deploy')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ssh-target-port">
                  {translate('auto.components.settings.SshTargetForm.c94cfa634c', 'Port')}
                </Label>
                <Input
                  id="ssh-target-port"
                  type="number"
                  value={form.port}
                  onChange={(e) => onFormChange((f) => ({ ...f, port: e.target.value }))}
                  placeholder="22"
                  min={1}
                  max={65535}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ssh-target-identity" className="flex items-center gap-1.5">
                  <FileKey className="size-3.5" />
                  {translate('auto.components.settings.SshTargetForm.63c0c145c1', 'Identity File')}
                </Label>
                <Input
                  id="ssh-target-identity"
                  value={form.identityFile}
                  onChange={(e) => onFormChange((f) => ({ ...f, identityFile: e.target.value }))}
                  placeholder={translate(
                    'auto.components.settings.SshTargetForm.d6a5f2ee5c',
                    '~/.ssh/id_ed25519 (leave empty for SSH agent)'
                  )}
                />
                <p className="text-[11px] text-muted-foreground">
                  {translate(
                    'auto.components.settings.SshTargetForm.cb91f6375c',
                    'Optional. SSH agent is used by default.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {translate('auto.components.settings.SshTargetForm.fea9cb402e', 'Cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {translate('auto.components.settings.SshTargetForm.a62b4cb39a', 'Save Changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
