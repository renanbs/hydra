// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// useResourceUsageStatusController: Controller hook managing resource usage pane state.
import { useState } from 'react'
import { useAppStore } from '../../store'

export function useResourceUsageStatusController(): {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  activeTabCount: number
} {
  const [isOpen, setIsOpen] = useState(false)
  const tabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  const activeTabCount = Object.values(tabsByWorktree).flat().length

  return { isOpen, setIsOpen, activeTabCount }
}
