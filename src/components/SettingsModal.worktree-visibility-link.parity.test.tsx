// Parity guard for D10-050: Global Settings exposes the worktree-visibility
// sources card as a deep-link target and reveals it when the shell asks for it
// (Orca `openSettingsTarget({ pane: 'general', sectionId })`).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { GLOBAL_WORKTREE_VISIBILITY_SETTINGS_TARGET_ID } from '../lib/settings-navigation-types'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
// Why: the appearance panes pull the terminal preview (xterm + addons), which is
// unrelated to the deep-link target under test and unresolved in this worktree.
vi.mock('./settings/AppearancePane', () => ({ AppearancePane: () => null }))
vi.mock('./settings/SshPane', () => ({ SshPane: () => null }))

import { SettingsModal } from './SettingsModal'

const scrollIntoView = vi.fn()
let scrolledElement: Element | null = null

beforeEach(() => {
  invokeMock.mockResolvedValue(undefined)
  scrolledElement = null
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolledElement = this
    scrollIntoView()
  }
  scrollIntoView.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsModal worktree visibility deep link (D10-050)', () => {
  it('renders the sources card with the stable deep-link id', async () => {
    render(
      <SettingsModal
        isOpen
        onClose={vi.fn()}
        initialSection="general"
        initialSectionId={GLOBAL_WORKTREE_VISIBILITY_SETTINGS_TARGET_ID}
      />
    )
    await act(async () => {})

    const target = document.getElementById(GLOBAL_WORKTREE_VISIBILITY_SETTINGS_TARGET_ID)
    expect(target).not.toBeNull()
    expect(target?.getAttribute('data-settings-section')).toBe(
      GLOBAL_WORKTREE_VISIBILITY_SETTINGS_TARGET_ID
    )
  })

  it('scrolls the requested subsection into view after the pane mounts', async () => {
    render(
      <SettingsModal
        isOpen
        onClose={vi.fn()}
        initialSection="general"
        initialSectionId={GLOBAL_WORKTREE_VISIBILITY_SETTINGS_TARGET_ID}
      />
    )

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(scrolledElement).toBe(
      document.getElementById(GLOBAL_WORKTREE_VISIBILITY_SETTINGS_TARGET_ID)
    )
  })
})
