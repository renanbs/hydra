// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/LinearAgentSkillSetupPrompt.tsx
//
// Hydra has the Linear skill discovery/reminder primitives but no setup dialog
// surface, so the card prompt carries the actionable half inline: it states what is
// missing and hands the user the exact install command. It stays out of the way on
// cards without a linked ticket and disappears once the skill is installed.
import React, { useCallback, useState } from 'react'
import { Copy, TicketCheck, X } from 'lucide-react'
import { toast } from 'sonner'

import { translate } from '@/i18n/i18n'
import { buildAgentFeatureSkillInstallCommand } from '../../shared/agent-feature-install-commands'
import { LINEAR_AGENT_SKILL_NAMES } from '../../shared/agent-feature-install-commands'
import { useInstalledAgentSkillNames } from '../../hooks/useInstalledAgentSkills'
import { Button } from '../ui/button'
import { getLinearAgentSkillSetupMissingLabel } from './linear-agent-skill-setup-copy'

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
}

export function LinearAgentSkillSetupPrompt({
  linked,
  remote = false,
  className
}: LinearAgentSkillSetupPromptProps): React.JSX.Element | null {
  const [dismissed, setDismissed] = useState(readDismissed)
  const skill = useInstalledAgentSkillNames(LINEAR_AGENT_SKILL_NAMES, {
    enabled: linked && !dismissed
  })

  const dismiss = useCallback(() => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LINEAR_SKILL_SETUP_DISMISSED_KEY, '1')
    }
  }, [])

  const copyInstallCommand = useCallback(() => {
    const command = buildAgentFeatureSkillInstallCommand(LINEAR_AGENT_SKILL_NAMES)
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

  if (!linked || dismissed) {
    return null
  }
  if (skill.loading) {
    return null
  }
  if (skill.installed) {
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
            {getLinearAgentSkillSetupMissingLabel(false, false)}
            {remote
              ? translate(
                  'auto.components.sidebar.LinearAgentSkillSetupPrompt.remoteCopy',
                  'This installs host setup; remote agent environments may need separate setup.'
                )
              : translate(
                  'auto.components.sidebar.LinearAgentSkillSetupPrompt.hostCopy',
                  'Install it for host agent handoffs from linked Linear work.'
                )}
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
          onClick={dismiss}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="outline" size="xs" className="gap-1" onClick={copyInstallCommand}>
          <Copy className="size-3" />
          {translate(
            'auto.components.sidebar.LinearAgentSkillSetupPrompt.copyCommand',
            'Copy install command'
          )}
        </Button>
      </div>
    </div>
  )
}

export default LinearAgentSkillSetupPrompt
