// D02a-004: host-scoped Add Project state resets on close and on host change.
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAddRepoHostChangeReset } from './useAddRepoHostChangeReset'

describe('useAddRepoHostChangeReset (D02a-004)', () => {
  it('resets host-scoped state when the selected host changes while open', () => {
    const onResetClosed = vi.fn()
    const onResetHostScopedState = vi.fn()
    const { rerender } = renderHook(
      (props: { isOpen: boolean; selectedHostId: string | null }) =>
        useAddRepoHostChangeReset({ ...props, onResetClosed, onResetHostScopedState }),
      { initialProps: { isOpen: true, selectedHostId: 'local' } }
    )

    expect(onResetHostScopedState).not.toHaveBeenCalled()
    rerender({ isOpen: true, selectedHostId: 'ssh:host-1' })
    expect(onResetHostScopedState).toHaveBeenCalledTimes(1)
    expect(onResetClosed).not.toHaveBeenCalled()
  })

  it('resets every scoped field when the dialog closes', () => {
    const onResetClosed = vi.fn()
    const onResetHostScopedState = vi.fn()
    const { rerender } = renderHook(
      (props: { isOpen: boolean; selectedHostId: string | null }) =>
        useAddRepoHostChangeReset({ ...props, onResetClosed, onResetHostScopedState }),
      { initialProps: { isOpen: true, selectedHostId: 'local' } }
    )

    rerender({ isOpen: false, selectedHostId: 'local' })
    expect(onResetClosed).toHaveBeenCalledTimes(1)
    expect(onResetHostScopedState).not.toHaveBeenCalled()
  })

  it('does not reset on host changes while closed', () => {
    const onResetHostScopedState = vi.fn()
    const { rerender } = renderHook(
      (props: { isOpen: boolean; selectedHostId: string | null }) =>
        useAddRepoHostChangeReset({
          ...props,
          onResetClosed: vi.fn(),
          onResetHostScopedState
        }),
      { initialProps: { isOpen: false, selectedHostId: 'local' } }
    )

    rerender({ isOpen: false, selectedHostId: 'ssh:host-1' })
    expect(onResetHostScopedState).not.toHaveBeenCalled()
  })
})
