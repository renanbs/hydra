// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/LinearAgentSkillSetupPrompt.tsx
//
// Hydra has the Linear skill discovery/reminder primitives but no setup dialog
// surface, so the card prompt carries the actionable half inline: it states what is
// missing and hands the user the exact install command. It stays out of the way on
// cards without a linked ticket and disappears once the skill is installed.
import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Copy, RefreshCw, TicketCheck, X } from 'lucide-react'
import { toast } from 'sonner'

import { translate } from '@/i18n/i18n'
import {
  LINEAR_AGENT_SKILL_NAMES,
  ORCA_LINEAR_SKILL_INSTALL_COMMAND
} from '../../shared/agent-feature-install-commands'
import { useInstalledAgentSkillNames } from '../../hooks/useInstalledAgentSkills'
import { Button } from '../ui/button'
import {
  getLinearAgentSkillSetupInlineRuntimeCopy,
  getLinearAgentSkillSetupMissingLabel,
  getLinearAgentSkillSetupToastDescription,
  getLinearAgentSkillSetupToastTitle
} from './linear-agent-skill-setup-copy'
import type { LinearAgentRuntime } from './linear-agent-skill-runtime'
import {
  dismissLinearAgentSkillSetupReminderToast,
  resetLinearAgentSkillSetupReminderToastForRuntime,
  snoozeLinearAgentSkillSetupReminderToast,
  useLinearAgentSkillSetupReminderToast
} from './linear-agent-skill-setup-reminder-toast'
import { LinearAgentSkillSetupDialog } from './LinearAgentSkillSetupDialog'

const LINEAR_SKILL_SETUP_DISMISSED_KEY = 'hydra.linearTicketsSkill.setupDismissed'

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(LINEAR_SKILL_SETUP_DISMISSED_KEY) === '1'
}

export interface LinearAgentSkillSetupPromptProps {
  /** The workspace card has a Linear ticket linked, so the skill earns its space. */
  linked: boolean
  /** The workspace lives on an SSH/runtime host; the install targets this device. */
  remote?: boolean
  className?: string
  /**
   * Orca `surface`: the card renders `inline` (Set up + Re-check buttons); a
   * modal host renders `modal` (dialog only, opened by the reminder state
   * machine). Defaults to inline to preserve every existing callsite.
   */
  surface?: 'inline' | 'modal'
}

/**
 * D02c-004/007: detection (skill discovery), manual Re-check, generation-guarded
 * refresh, permanent per-runtime dismissal, lazy dialog, and the reminder
 * state machine (first activation opens the modal; later ones toast ≤3x).
 *
 * D02c-003 lives in `LinearAgentSkillSetupDialog`: success/install states,
 * copy-command step, Re-check, Don't-show-again and all close paths.
 */
export function LinearAgentSkillSetupPrompt({
  linked,
  remote = false,
  className,
  surface = 'inline'
}: LinearAgentSkillSetupPromptProps): React.JSX.Element | null {
  const agentRuntime: LinearAgentRuntime = useMemo(
    () => ({ runtime: 'host', label: 'This device' }),
    []
  )
  const localDismissStorageKey = 'hydra.linearTicketsSkill.setupDismissed'
  const [localDismissed, setLocalDismissed] = useState(readDismissed)
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const setupCheckIdentity = useMemo(
    () => `host:${remote ? 'remote' : 'local'}`,
    [remote]
  )
  const checkGenerationRef = useRef(0)
  const checkIdentityRef = useRef(setupCheckIdentity)
  checkIdentityRef.current = setupCheckIdentity
  const skill = useInstalledAgentSkillNames(LINEAR_AGENT_SKILL_NAMES, {
    enabled: linked && !localDismissed
  })
  const [rechecking, setRechecking] = useState(false)

  const refreshSkill = useCallback(async (): Promise<void> => {
    const identity = checkIdentityRef.current
    const generation = ++checkGenerationRef.current
    setRechecking(true)
    try {
      await skill.refresh()
      if (checkIdentityRef.current !== identity || generation !== checkGenerationRef.current) {
        return
      }
    } finally {
      if (checkIdentityRef.current === identity && generation === checkGenerationRef.current) {
        setRechecking(false)
      }
    }
  }, [skill])

  const missingSetup = linked && !localDismissed && !skill.loading && !skill.installed
  const missingLabel = getLinearAgentSkillSetupMissingLabel(false, skill.installed)
  const toastTitle = getLinearAgentSkillSetupToastTitle(false, skill.installed)
  const toastDescription = getLinearAgentSkillSetupToastDescription(
    false,
    skill.installed,
    remote,
    agentRuntime
  )
  const openSetupDialog = useCallback(() => setSetupDialogOpen(true), [])

  useLinearAgentSkillSetupReminderToast({
    localDismissStorageKey,
    missingSetup,
    setupDialogOpen,
    surface,
    toastDescription,
    toastTitle,
    openSetupDialog
  })

  const dismissPermanently = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(localDismissStorageKey, '1')
    }
    setLocalDismissed(true)
    setSetupDialogOpen(false)
    dismissLinearAgentSkillSetupReminderToast(localDismissStorageKey)
  }, [localDismissStorageKey])

  const closeSuccessDialog = useCallback(() => {
    setSetupDialogOpen(false)
    resetLinearAgentSkillSetupReminderToastForRuntime(localDismissStorageKey)
  }, [localDismissStorageKey])

  const snoozeForSession = useCallback(() => {
    snoozeLinearAgentSkillSetupReminderToast(localDismissStorageKey)
    setSetupDialogOpen(false)
  }, [localDismissStorageKey])

  const copyInstallCommand = useCallback(() => {
    const command = ORCA_LINEAR_SKILL_INSTALL_COMMAND
    void navigator.clipboard
      .writeText(command)
      .then(() => {
        toast.success(
          translate(
            'auto.components.sidebar.LinearAgentSkillSetupPrompt.commandCopied',
            'Linear skill install command copied'
          ),
          { description: command }
        )
      })
      .catch(() => {
        toast.error(
          translate(
            'auto.components.sidebar.LinearAgentSkillSetupPrompt.commandCopyFailed',
            'Could not copy the install command'
          ),
          { description: command }
        )
      })
  }, [])

  if (surface === 'modal') {
    if (!setupDialogOpen) {
      return null
    }
    return (
      <Suspense fallback={null}>
        <LinearAgentSkillSetupDialog
          open
          showSuccess={false}
          command={ORCA_LINEAR_SKILL_INSTALL_COMMAND}
          installed={skill.installed}
          loading={rechecking || skill.loading}
          onRecheck={() => void refreshSkill()}
          onOpenChange={(nextOpen) => {
            if (nextOpen) {
              setSetupDialogOpen(true)
              return
            }
            snoozeForSession()
          }}
          onDismissPermanently={dismissPermanently}
          onDone={closeSuccessDialog}
        />
      </Suspense>
    )
  }

  if (!missingSetup) {
    return null
  }

  return (
    <div
      className={`mt-1.5 rounded-md border border-worktree-sidebar-border bg-worktree-sidebar-accent/35 px-2.5 py-2 text-[11px] text-muted-foreground${className ? ` ${className}` : ''}`}
      data-linear-agent-skill-setup-prompt=""
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-2">
        <TicketCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-medium text-foreground">
            {translate(
              'auto.components.sidebar.LinearAgentSkillSetupPrompt.title',
              'Set up Linear agent skill'
            )}
          </div>
          <p className="leading-snug">
            {missingLabel}{' '}
            {getLinearAgentSkillSetupInlineRuntimeCopy(remote, agentRuntime)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          aria-label={translate(
            'auto.components.sidebar.LinearAgentSkillSetupPrompt.dismiss',
            'Dismiss Linear agent skill setup'
          )}
          onClick={dismissPermanently}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="outline" size="xs" onClick={() => setSetupDialogOpen(true)}>
          {translate('auto.components.sidebar.LinearAgentSkillSetupPrompt.setup', 'Set up')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="gap-1"
          disabled={rechecking}
          onClick={() => void refreshSkill()}
        >
          <RefreshCw className={`size-3 ${rechecking ? 'animate-spin' : ''}`} />
          {translate('auto.components.sidebar.LinearAgentSkillSetupPrompt.recheck', 'Re-check')}
        </Button>
        <Button type="button" variant="ghost" size="xs" className="gap-1" onClick={copyInstallCommand}>
          <Copy className="size-3" />
          {translate(
            'auto.components.sidebar.LinearAgentSkillSetupPrompt.copyCommand',
            'Copy install command'
          )}
        </Button>
      </div>
      {setupDialogOpen ? (
        <Suspense fallback={null}>
          <LinearAgentSkillSetupDialog
            open
            showSuccess={false}
            command={ORCA_LINEAR_SKILL_INSTALL_COMMAND}
            installed={skill.installed}
            loading={rechecking || skill.loading}
            onRecheck={() => void refreshSkill()}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) {
                snoozeForSession()
              }
            }}
            onDismissPermanently={dismissPermanently}
            onDone={closeSuccessDialog}
          />
        </Suspense>
      ) : null}
    </div>
  )
}

export default LinearAgentSkillSetupPrompt
