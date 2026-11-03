// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-add-repo-host-change-reset.ts
//
// D02a-004: Add Project form fields are host-path scoped, so closing the dialog
// or switching hosts must clear typed paths and pending defaults before they can
// be submitted against the wrong machine.
import { useEffect, useRef } from 'react'

export function useAddRepoHostChangeReset({
  isOpen,
  selectedHostId,
  onResetClosed,
  onResetHostScopedState
}: {
  isOpen: boolean
  selectedHostId: string | null
  onResetClosed: () => void
  onResetHostScopedState: () => void
}): void {
  const previousSelectedHostIdRef = useRef(selectedHostId)

  useEffect(() => {
    if (!isOpen) {
      previousSelectedHostIdRef.current = selectedHostId
      onResetClosed()
    }
  }, [isOpen, onResetClosed, selectedHostId])

  useEffect(() => {
    if (!isOpen || previousSelectedHostIdRef.current === selectedHostId) {
      return
    }
    previousSelectedHostIdRef.current = selectedHostId
    onResetHostScopedState()
  }, [isOpen, onResetHostScopedState, selectedHostId])
}
