// Parity guard for D10-080: the feedback dialog prefills a version/OS footer
// (so a pasted report always carries the environment) without moving the caret
// when the user is already typing in the textarea.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen, waitFor } from '@testing-library/react'
import { useRef, useState } from 'react'
import { useSidebarFeedbackEnvironmentPrefill } from './use-sidebar-feedback-environment-prefill'

const ENV_INFO = {
  appVersion: '1.4.2',
  platform: 'linux',
  osRelease: '6.12',
  arch: 'x64',
}

const { resolveInfoMock } = vi.hoisted(() => ({ resolveInfoMock: vi.fn() }))
vi.mock('@/lib/client-environment-info', () => ({
  resolveClientEnvironmentInfo: resolveInfoMock,
}))

function Harness({ open, initial = '' }: { open: boolean; initial?: string }) {
  const [feedback, setFeedback] = useState(initial)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mountedRef = useRef(true)
  useSidebarFeedbackEnvironmentPrefill({
    open,
    feedback,
    setFeedback,
    textareaRef,
    mountedRef,
  })
  return (
    <textarea
      ref={textareaRef}
      aria-label="feedback"
      value={feedback}
      onChange={(event) => setFeedback(() => event.target.value)}
    />
  )
}

describe('useSidebarFeedbackEnvironmentPrefill (D10-080)', () => {
  beforeEach(() => {
    resolveInfoMock.mockReset()
  })

  it('appends the environment footer when the dialog opens', async () => {
    resolveInfoMock.mockResolvedValue(ENV_INFO)
    render(<Harness open />)

    const textarea = screen.getByLabelText('feedback') as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toContain('Hydra: 1.4.2'))

    expect(textarea.value).toContain('---\nHydra: 1.4.2\nOS: linux 6.12 (x64)')
  })

  it('does not append a second footer on rerender or reopen', async () => {
    resolveInfoMock.mockResolvedValue(ENV_INFO)
    const { rerender } = render(<Harness open />)
    const textarea = screen.getByLabelText('feedback') as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toContain('Hydra: 1.4.2'))

    rerender(<Harness open />)
    await act(async () => {})

    expect(textarea.value.match(/Hydra: 1\.4\.2/g)).toHaveLength(1)
  })

  it('keeps the caret where the user left it while the footer loads', async () => {
    const { promise, resolve } = Promise.withResolvers<typeof ENV_INFO>()
    resolveInfoMock.mockReturnValue(promise)
    render(<Harness open initial="hello" />)
    const textarea = screen.getByLabelText('feedback') as HTMLTextAreaElement
    textarea.focus()
    textarea.setSelectionRange(2, 2)

    act(() => resolve(ENV_INFO))
    await waitFor(() => expect(textarea.value).toContain('Hydra: 1.4.2'))

    expect(textarea.selectionStart).toBe(2)
    expect(textarea.selectionEnd).toBe(2)
  })

  it('leaves the caret alone when the textarea is not focused', async () => {
    resolveInfoMock.mockResolvedValue(ENV_INFO)
    render(<Harness open />)
    const textarea = screen.getByLabelText('feedback') as HTMLTextAreaElement

    await waitFor(() => expect(textarea.value).toContain('Hydra: 1.4.2'))
    expect(document.activeElement).not.toBe(textarea)
  })

  it('does nothing while the dialog is closed', async () => {
    resolveInfoMock.mockResolvedValue(ENV_INFO)
    render(<Harness open={false} />)

    const textarea = screen.getByLabelText('feedback') as HTMLTextAreaElement
    await act(async () => {})

    expect(textarea.value).toBe('')
    expect(resolveInfoMock).not.toHaveBeenCalled()
  })
})
