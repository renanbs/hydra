// Repository local commands section (Rosetta port).
//
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/settings/RepositoryHookScriptSetting.tsx (field editor +
// env-var chips + shared/local notices) + repository-hook-settings-draft.ts
// (field labels/descriptions/placeholders).
//
// Rosetta rule: same fields, same copy, same section anchor contract
// (`getRepositoryLocalCommandsSectionId`). The only deliberate reduction is the
// command-source policy row — Hydra's `RepoHookSettings` has no
// `commandSourcePolicy` UI yet, and the setup card owns that policy today.
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { getRepositoryLocalCommandsSectionId } from './open-setup-script-settings'

export type LocalHookName = 'setup' | 'archive'

export type LocalHookField = {
  name: LocalHookName
  label: string
  description: string
  placeholder: string
}

export function getLocalHookFields(): readonly [LocalHookField, LocalHookField] {
  return [
    {
      name: 'setup',
      label: translate(
        'auto.components.settings.RepositoryHooksSection.52b31baf02',
        'Setup Script'
      ),
      description: translate(
        'auto.components.settings.RepositoryHooksSection.f0710e1c83',
        'Runs after a new worktree is created; install deps, copy env files, run migrations.'
      ),
      placeholder: translate(
        'auto.components.settings.RepositoryHooksSection.a3fc966677',
        '# e.g. pnpm install cp "$ORCA_ROOT_PATH/.env" "$ORCA_WORKTREE_PATH/.env"'
      )
    },
    {
      name: 'archive',
      label: translate(
        'auto.components.settings.RepositoryHooksSection.9a100323ff',
        'Archive Script'
      ),
      description: translate(
        'auto.components.settings.RepositoryHooksSection.6f90ebe3fd',
        'Runs before a worktree is archived or removed.'
      ),
      placeholder: translate(
        'auto.components.settings.RepositoryHooksSection.9b821fa19d',
        '# e.g. echo "Cleaning up $ORCA_WORKSPACE_NAME"'
      )
    }
  ]
}

function EnvVarChips(): React.JSX.Element {
  const envVars = [
    {
      name: '$ORCA_ROOT_PATH',
      description: translate(
        'auto.components.settings.RepositoryHooksSection.30952c4aa4',
        'Path to the main repo checkout. Useful for copying shared files, like .env, into a worktree.'
      )
    },
    {
      name: '$ORCA_WORKTREE_PATH',
      description: translate(
        'auto.components.settings.RepositoryHooksSection.54c73d88d0',
        'Path to the worktree being created. Setup commands run from this directory.'
      )
    },
    {
      name: '$ORCA_WORKSPACE_NAME',
      description: translate(
        'auto.components.settings.RepositoryHooksSection.0fa21e19ec',
        'Name of the workspace, usually based on the branch name.'
      )
    }
  ]
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">
        {translate(
          'auto.components.settings.RepositoryHooksSection.b2b06c7ce8',
          'Available environment variables (hover for details):'
        )}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {envVars.map(({ name, description }) => (
          <code
            key={name}
            tabIndex={0}
            title={description}
            className="cursor-help rounded-md border border-worktree-sidebar-border bg-worktree-sidebar-foreground/5 px-2 py-1 font-mono text-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground"
          >
            {name}
          </code>
        ))}
      </div>
    </div>
  )
}

export function RepositoryLocalHookScriptField({
  field,
  value,
  sharedScript,
  onChange,
  onCommit,
  sectionId,
  autoFocus = false
}: {
  field: LocalHookField
  value: string
  /** Shared orca.yaml script shown read-only above the local editor. */
  sharedScript?: string
  onChange: (next: string) => void
  onCommit: () => void
  sectionId?: string
  autoFocus?: boolean
}): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [showLocal, setShowLocal] = useState(value.length > 0)
  // Rosetta Orca deep-link: the section anchor focuses its editor on mount.
  // A callback ref (not autoFocus) so jsdom and real browsers agree.
  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus()
    }
  }, [autoFocus])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const lastValueRef = useRef(value)
  const savedTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (value === lastValueRef.current) {
      return
    }
    lastValueRef.current = value
    setSaveStatus('saving')
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current)
    }
    savedTimerRef.current = window.setTimeout(() => {
      setSaveStatus('saved')
      savedTimerRef.current = window.setTimeout(() => {
        setSaveStatus('idle')
        savedTimerRef.current = null
      }, 1500)
    }, 250)
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current)
        savedTimerRef.current = null
      }
    }
  }, [value])

  const showLocalEditor = showLocal || value.length > 0 || !sharedScript
  return (
    <div className="space-y-2 rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar-foreground/5 p-3" id={sectionId}>
      <div className="space-y-1">
        <h5 className="text-[12px] font-semibold">{field.label}</h5>
        <p className="text-[11px] text-muted-foreground">{field.description}</p>
      </div>
      <EnvVarChips />
      {sharedScript ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
              {translate('auto.components.settings.RepositoryHooksSection.39da2ae12f', 'orca.yaml')}
              <span className="font-normal opacity-80">
                {translate(
                  'auto.components.settings.RepositoryHooksSection.39da2ae12f-shared',
                  '- shared with your team'
                )}
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {translate('auto.components.settings.RepositoryHooksSection.b113344b6a', 'Edit')}{' '}
              <code className="rounded bg-muted px-1 py-0.5">orca.yaml</code>{' '}
              {translate('auto.components.settings.RepositoryHooksSection.7e4427b4a2', 'to change.')}
            </span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar-foreground/5 p-3 font-mono text-[11px] leading-5">
            {sharedScript}
          </pre>
        </div>
      ) : null}
      {showLocalEditor ? (
        <div className="space-y-2">
          <div className="flex items-center justify-end gap-2">
            {saveStatus !== 'idle' ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
                <span
                  className={`size-1.5 rounded-full ${saveStatus === 'saving' ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`}
                />
                {saveStatus === 'saving'
                  ? translate('auto.components.settings.RepositoryHooksSection.81057d5f71', 'Saving...')
                  : translate('auto.components.settings.RepositoryHooksSection.2b6356e744', 'Saved')}
              </span>
            ) : null}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            aria-label={field.label}
            {...(autoFocus && sectionId ? { 'data-autofocus-section': sectionId } : {})}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onCommit}
            placeholder={field.placeholder}
            spellCheck={false}
            rows={Math.max(3, Math.min(12, value.split('\n').length + 1))}
            className="w-full min-w-0 resize-y rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar px-3 py-2 font-mono text-[11px] leading-[1.55] outline-none placeholder:italic placeholder:text-muted-foreground/60 focus-visible:border-worktree-sidebar-ring/60"
          />
          <p className="text-[10px] text-muted-foreground">
            {translate(
              'auto.components.settings.RepositoryHooksSection.8c2893fae0',
              'Runs as a single shell script. Saved on this machine.'
            )}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowLocal(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-worktree-sidebar-border px-2.5 py-1.5 text-[11px] transition hover:bg-worktree-sidebar-accent"
        >
          <AlertTriangle className="hidden size-3.5" />
          {translate('auto.components.settings.RepositoryHooksSection.5d940bde5c', 'Add local script')}
        </button>
      )}
    </div>
  )
}

export function RepositoryLocalCommandsSection({
  repoId,
  setupScript,
  archiveScript,
  sharedSetupScript,
  sharedArchiveScript,
  onSetupChange,
  onArchiveChange,
  onCommit,
  autoFocusSectionId
}: {
  repoId: string
  setupScript: string
  archiveScript: string
  sharedSetupScript?: string
  sharedArchiveScript?: string
  onSetupChange: (next: string) => void
  onArchiveChange: (next: string) => void
  onCommit: () => void
  /** When set, that field's editor receives autofocus (deep-link landing). */
  autoFocusSectionId?: string | null
}): React.JSX.Element {
  const [setupField, archiveField] = getLocalHookFields()
  const sectionId = getRepositoryLocalCommandsSectionId(repoId)
  return (
    <div className="space-y-3" data-repo-local-commands-section={repoId}>
      <div className="space-y-1">
        <h4 className="text-[12px] font-semibold">
          {translate('auto.components.sidebar.RepoSettingsDialog.localCommands', 'Local commands')}
        </h4>
        <p className="text-[11px] text-muted-foreground">
          {translate(
            'auto.components.sidebar.RepoSettingsDialog.localCommandsDescription',
            'Scripts that run when worktrees are created or archived. Saved on this machine.'
          )}
        </p>
      </div>
      <RepositoryLocalHookScriptField
        field={setupField!}
        value={setupScript}
        sharedScript={sharedSetupScript}
        onChange={onSetupChange}
        onCommit={onCommit}
        sectionId={sectionId}
        autoFocus={autoFocusSectionId === sectionId}
      />
      <RepositoryLocalHookScriptField
        field={archiveField!}
        value={archiveScript}
        sharedScript={sharedArchiveScript}
        onChange={onArchiveChange}
        onCommit={onCommit}
      />
    </div>
  )
}
