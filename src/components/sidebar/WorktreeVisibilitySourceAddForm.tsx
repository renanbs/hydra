// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeVisibilitySourceAddForm.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translate } from '@/i18n/i18n'

export type WorktreeVisibilitySourceAddResult =
  | 'added'
  | 'invalid-path'
  | 'duplicate-path'
  | 'limit'
  | 'save-failed'

export function WorktreeVisibilitySourceAddForm({
  disabled,
  onAdd
}: {
  disabled: boolean
  onAdd: (rootPath: string) => Promise<WorktreeVisibilitySourceAddResult>
}): React.JSX.Element {
  const [rootPath, setRootPath] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    setInputError(null)
    const result = await onAdd(rootPath)
    if (result === 'added') {
      setRootPath('')
      return
    }
    if (result === 'save-failed') {
      return
    }
    setInputError(
      result === 'limit'
        ? translate(
            'auto.components.sidebar.WorktreeVisibilitySourceList.limit',
            'Remove a custom location before adding another.'
          )
        : result === 'duplicate-path'
          ? translate(
              'auto.components.sidebar.WorktreeVisibilitySourceList.duplicatePath',
              'This location is already listed.'
            )
          : translate(
              'auto.components.sidebar.WorktreeVisibilitySourceList.invalidPath',
              'Enter an absolute path for this host.'
            )
    )
  }

  return (
    <form
      className="grid gap-2 px-0"
      aria-label={translate(
        'auto.components.sidebar.WorktreeVisibilitySourceList.addLocation',
        'Add location'
      )}
      onSubmit={(event) => void handleAdd(event)}
    >
      <Label htmlFor="custom-worktree-root" className="text-[12px] text-neutral-300">
        {translate(
          'auto.components.sidebar.WorktreeVisibilitySourceList.worktreeRoot',
          'Worktree root'
        )}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="custom-worktree-root"
          className="h-8 flex-1 rounded-lg border-neutral-800 bg-neutral-950 font-mono text-[11px] text-neutral-100"
          value={rootPath}
          placeholder="/path/to/worktrees"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={inputError ? true : undefined}
          aria-describedby="custom-worktree-root-help"
          onChange={(event) => {
            setRootPath(event.target.value)
            setInputError(null)
          }}
        />
        <Button type="submit" size="sm" disabled={disabled || !rootPath.trim()}>
          {translate('auto.components.sidebar.WorktreeVisibilitySourceList.add', 'Add')}
        </Button>
      </div>
      <p
        id="custom-worktree-root-help"
        className={`text-[11px] ${inputError ? 'text-destructive' : 'text-neutral-500'}`}
        role={inputError ? 'alert' : undefined}
      >
        {inputError ??
          translate(
            'auto.components.sidebar.WorktreeVisibilitySourceList.rootHelp',
            'Hydra will recognize worktrees beneath this folder.'
          )}
      </p>
    </form>
  )
}
