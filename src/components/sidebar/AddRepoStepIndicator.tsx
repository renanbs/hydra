// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AddRepoStepIndicator.tsx
//
// D02a-002: the Back control is the only step indicator once the user leaves the
// start screen. It hides on the start step and stays disabled while a nested
// import is in flight, because backing out mid-import would strand the writes.
import { ArrowLeft } from 'lucide-react'
import type { AddRepoDialogStep } from './add-repo-dialog-types'

const STEPS_WITH_BACK: Record<AddRepoDialogStep, true | undefined> = {
  add: undefined,
  clone: true,
  remote: true,
  'server-path': true,
  create: true,
  nested: true,
  folder: true
}

export function AddRepoStepIndicator({
  step,
  isAdding,
  onBack
}: {
  step: AddRepoDialogStep
  isAdding: boolean
  onBack: () => void
}): React.JSX.Element | null {
  if (!STEPS_WITH_BACK[step]) {
    return null
  }

  return (
    <div className="-mt-1 flex min-h-5 items-center">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-neutral-100 disabled:cursor-default disabled:opacity-40 cursor-pointer"
        disabled={step === 'nested' && isAdding}
        onClick={onBack}
      >
        <ArrowLeft className="size-3" />
        Back
      </button>
    </div>
  )
}
