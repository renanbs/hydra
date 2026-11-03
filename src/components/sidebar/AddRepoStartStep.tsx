// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AddRepoStartSteps.tsx
//
// D02a-006/041: the Add Project start screen. A roving selection (white wash +
// trailing ⏎ chip) follows keyboard focus so Enter always activates the
// highlighted row; ArrowUp/ArrowDown move between the action buttons. While a
// folder scan is running the busy notice offers Stop for the active scan.
import { useEffect, useRef, useState } from 'react'
import { CircleStop, Loader2 } from 'lucide-react'
import type { AddRepoStartAction } from './add-repo-local-start-actions'

type AddRepoStartStreamProps = {
  repoCount: number
  isAdding: boolean
  addProjectBusyLabel: string | null
  nestedScanInProgress: boolean
  nestedScanId: string | null
  hostSelector?: React.ReactNode
  actionsDisabled?: boolean
  primaryAction: AddRepoStartAction
  secondaryActions: AddRepoStartAction[]
  onStopNestedScan: () => void
}

function AddRepoEnterChip(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="shrink-0">
      <span className="inline-flex min-w-5 items-center justify-center rounded border border-[#3a3b40] bg-[#0e0f11]/70 px-1 py-0.5 text-[10px] font-medium leading-none text-neutral-400">
        ⏎
      </span>
    </span>
  )
}

function AddRepoScanProgressNotice({
  busyLabel,
  nestedScanInProgress,
  nestedScanId,
  onStopNestedScan
}: {
  busyLabel: string
  nestedScanInProgress: boolean
  nestedScanId: string | null
  onStopNestedScan: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#2a2b30] bg-[#18191d] px-3 py-2 text-xs text-neutral-400">
      <Loader2 className="size-3.5 shrink-0 animate-spin" />
      <span className="min-w-0 flex-1">{busyLabel}</span>
      {nestedScanInProgress && nestedScanId ? (
        <button
          type="button"
          aria-label="Stop scan"
          title="Scanning repositories. Click to stop."
          onClick={onStopNestedScan}
          className="group inline-flex size-6 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
        >
          <Loader2 className="size-3.5 animate-spin group-hover:hidden" />
          <CircleStop className="hidden size-3.5 group-hover:block" />
        </button>
      ) : null}
    </div>
  )
}

type AddRepoStartActionProps = {
  action: AddRepoStartAction
  selected: boolean
  disabled: boolean
  onFocus: () => void
  buttonRef?: React.Ref<HTMLButtonElement>
}

function AddRepoPrimaryStartAction({
  action,
  selected,
  disabled,
  onFocus,
  buttonRef
}: AddRepoStartActionProps): React.JSX.Element {
  const Icon = action.icon
  return (
    <button
      ref={buttonRef}
      type="button"
      data-add-repo-action
      onClick={action.onClick}
      onFocus={onFocus}
      disabled={disabled}
      className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition disabled:opacity-50 cursor-pointer ${
        selected
          ? 'border-emerald-500/60 bg-emerald-500/10 text-neutral-100'
          : 'border-[#2a2b30] bg-neutral-900/60 hover:bg-neutral-800/80 text-neutral-100'
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-xs flex items-center gap-1.5">
          <span>{action.title}</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 uppercase font-bold">
            Existing
          </span>
        </div>
        <div className="text-[11px] text-neutral-400">{action.description}</div>
      </div>
      {selected ? <AddRepoEnterChip /> : null}
    </button>
  )
}

function AddRepoSecondaryStartAction({
  action,
  selected,
  disabled,
  onFocus
}: AddRepoStartActionProps): React.JSX.Element {
  const Icon = action.icon
  return (
    <button
      type="button"
      data-add-repo-action
      onClick={action.onClick}
      onFocus={onFocus}
      disabled={disabled}
      className={`flex w-full min-h-[3.25rem] items-center gap-3 border px-3 py-2.5 text-left transition disabled:pointer-events-none disabled:opacity-40 cursor-pointer ${
        selected
          ? 'border-emerald-500/50 bg-emerald-500/10 text-neutral-100'
          : 'border-transparent bg-[#0e0f11] hover:bg-neutral-800/60 text-neutral-100'
      }`}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-neutral-900 border border-[#2a2b30] text-neutral-300">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium leading-5">{action.title}</span>
        <span className="block text-[11px] text-neutral-500">{action.description}</span>
      </span>
      {selected ? <AddRepoEnterChip /> : null}
    </button>
  )
}

export function AddRepoStartStep({
  repoCount,
  isAdding,
  addProjectBusyLabel,
  nestedScanInProgress,
  nestedScanId,
  hostSelector,
  actionsDisabled = false,
  primaryAction,
  secondaryActions,
  onStopNestedScan
}: AddRepoStartStreamProps): React.JSX.Element {
  const actionsRef = useRef<HTMLDivElement | null>(null)
  const primaryRef = useRef<HTMLButtonElement | null>(null)
  const actionsUnavailable = isAdding || actionsDisabled
  // Roving selection: Browse is focused on open, so it starts selected.
  const [selectedKind, setSelectedKind] = useState<string | null>(
    actionsUnavailable ? null : primaryAction.kind
  )
  const visibleSelectedKind = actionsUnavailable ? null : selectedKind

  useEffect(() => {
    if (!actionsUnavailable) {
      primaryRef.current?.focus()
    }
  }, [actionsUnavailable])

  const handleArrowNavigation = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }
    const buttons = Array.from(
      actionsRef.current?.querySelectorAll<HTMLButtonElement>('button[data-add-repo-action]') ?? []
    )
    if (buttons.length === 0) return
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const delta = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = (currentIndex + delta + buttons.length) % buttons.length
    event.preventDefault()
    buttons[nextIndex]?.focus()
  }

  const handleActionsBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
    const related = event.relatedTarget
    if (!(related instanceof HTMLButtonElement) || !related.matches('button[data-add-repo-action]')) {
      setSelectedKind(null)
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">Add a project</h2>
        {repoCount === 0 ? (
          <p className="mt-1 text-xs text-neutral-400">
            Add a project to get started with Hydra.
          </p>
        ) : null}
      </div>

      <div
        className="space-y-3"
        ref={actionsRef}
        onBlur={handleActionsBlur}
        onKeyDown={handleArrowNavigation}
      >
        {hostSelector}

        <AddRepoPrimaryStartAction
          action={primaryAction}
          selected={visibleSelectedKind === primaryAction.kind}
          disabled={actionsUnavailable}
          onFocus={() => setSelectedKind(primaryAction.kind)}
          buttonRef={primaryRef}
        />

        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Other ways to add
          </p>
          <div className="overflow-hidden rounded-md border border-[#2a2b30] bg-[#0e0f11]">
            {secondaryActions.map((action, index) => (
              <div
                key={action.kind}
                className={index === 0 ? '' : 'border-t border-[#222327]'}
              >
                <AddRepoSecondaryStartAction
                  action={action}
                  selected={visibleSelectedKind === action.kind}
                  disabled={actionsUnavailable || Boolean(action.disabled)}
                  onFocus={() => setSelectedKind(action.kind)}
                />
              </div>
            ))}
          </div>
        </div>

        {isAdding && addProjectBusyLabel ? (
          <AddRepoScanProgressNotice
            busyLabel={addProjectBusyLabel}
            nestedScanInProgress={nestedScanInProgress}
            nestedScanId={nestedScanId}
            onStopNestedScan={onStopNestedScan}
          />
        ) : null}
      </div>
    </div>
  )
}
