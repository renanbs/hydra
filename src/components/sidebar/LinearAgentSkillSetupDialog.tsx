// Linear skill setup dialog: install/update the Orca CLI + Linear skill
// through an embedded terminal, or confirm the ready state.
//
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/LinearAgentSkillSetupDialog.tsx
//
// Hydra reduction: Orca embeds `AgentSkillSetupPanel` (live PTY terminal +
// recheck-on-exit). Hydra has no inline setup terminal, so the command runs the
// same way every other skill install does here — copy to clipboard, run in the
// user's own terminal — and the dialog re-checks on demand. The states the
// audit locks (install / success / dismiss / close paths) are all preserved.
import { useState } from 'react'
import { CheckCircle2, Copy, EyeOff, Info, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'

export type LinearAgentSkillSetupDialogProps = {
  open: boolean
  /** True once CLI + skill both verify installed: the Done state. */
  showSuccess?: boolean
  successDescription?: string
  missingLabel?: string | null
  /** Install command for the copy/run step. */
  command: string
  /** Update command once installed (re-install path). */
  installedCommand?: string
  installed?: boolean
  loading?: boolean
  onRecheck?: () => void | Promise<void>
  onOpenChange?: (open: boolean) => void
  onDismissPermanently?: () => void
  onDone?: () => void
}

export function LinearAgentSkillSetupDialog({
  open,
  showSuccess = false,
  successDescription,
  missingLabel,
  command,
  installedCommand,
  installed = false,
  loading = false,
  onRecheck,
  onOpenChange,
  onDismissPermanently,
  onDone
}: LinearAgentSkillSetupDialogProps): React.JSX.Element | null {
  const [copied, setCopied] = useState(false)
  if (!open) {
    return null
  }
  const activeCommand = installed && installedCommand ? installedCommand : command

  const copyCommand = (): void => {
    void navigator.clipboard
      .writeText(activeCommand)
      .then(() => {
        setCopied(true)
        toast.success(
          translate(
            'auto.components.sidebar.LinearAgentSkillSetupDialog.commandCopied',
            'Install command copied'
          ),
          { description: activeCommand }
        )
      })
      .catch(() => {
        toast.error(
          translate(
            'auto.components.sidebar.LinearAgentSkillSetupDialog.commandCopyFailed',
            'Could not copy the install command'
          )
        )
      })
  }

  const close = (nextOpen: boolean): void => {
    if (!nextOpen) {
      if (showSuccess) {
        onDone?.()
        return
      }
      onOpenChange?.(false)
    }
  }

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={() => close(false)}
        onPointerDownOutside={() => close(false)}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle>
              {showSuccess
                ? translate(
                    'auto.components.sidebar.LinearAgentSkillSetupDialog.successTitle',
                    'Linear ticket access is ready'
                  )
                : translate(
                    'auto.components.sidebar.LinearAgentSkillSetupDialog.title',
                    'Set up Linear agent skill'
                  )}
            </DialogTitle>
            {/* Dismissal is permanent and out of the tab order's way: a quiet
                icon button pinned beside the close affordance. */}
            {onDismissPermanently ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0"
                      aria-label={translate(
                        'auto.components.sidebar.LinearAgentSkillSetupDialog.dismissForever',
                        "Don't show again"
                      )}
                      onClick={onDismissPermanently}
                    >
                      <EyeOff className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {translate(
                      'auto.components.sidebar.LinearAgentSkillSetupDialog.dismissForever',
                      "Don't show again"
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          <DialogDescription>
            {showSuccess
              ? (successDescription ??
                translate(
                  'auto.components.sidebar.LinearAgentSkillSetupDialog.successDescription',
                  'Agents can now read and update linked Linear tickets from this workspace.'
                ))
              : (missingLabel ??
                translate(
                  'auto.components.sidebar.LinearAgentSkillSetupDialog.description',
                  'Enable agents to read and edit the attached Linear ticket.'
                ))}
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {translate(
                'auto.components.sidebar.LinearAgentSkillSetupDialog.connected',
                'Connected'
              )}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p className="leading-snug">
                {translate(
                  'auto.components.sidebar.LinearAgentSkillSetupDialog.installPrompt',
                  'Run this command in your terminal to install the CLI and skill, then Re-check.'
                )}
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2">
              <div className="break-all font-mono text-[11px] leading-relaxed">{activeCommand}</div>
              <div className="mt-2 flex items-center gap-1.5">
                <Button type="button" variant="outline" size="xs" className="gap-1" onClick={copyCommand}>
                  <Copy className="size-3" />
                  {copied
                    ? translate(
                        'auto.components.sidebar.LinearAgentSkillSetupDialog.copied',
                        'Copied'
                      )
                    : translate(
                        'auto.components.sidebar.LinearAgentSkillSetupDialog.copyCommand',
                        'Copy command'
                      )}
                </Button>
                {onRecheck ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="gap-1"
                    disabled={loading}
                    onClick={() => void onRecheck()}
                  >
                    <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
                    {translate(
                      'auto.components.sidebar.LinearAgentSkillSetupDialog.recheck',
                      'Re-check'
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {translate(
                'auto.components.sidebar.LinearAgentSkillSetupDialog.prerequisiteNotice',
                'Before opening setup, Hydra may check that the Orca CLI command is on PATH.'
              )}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {showSuccess ? (
            <Button type="button" onClick={() => onDone?.()}>
              {translate('auto.components.sidebar.LinearAgentSkillSetupDialog.done', 'Done')}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => close(false)}>
              {translate('auto.components.sidebar.LinearAgentSkillSetupDialog.close', 'Close')}
            </Button>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LinearAgentSkillSetupDialog
