// Parity guard for the sidebar feedback composer (D10-078..D10-082): the
// dialog must highlight and claim image drops/pastes, prefill the environment
// footer, attach/remove previews without leaking object URLs, and turn a real
// submission refusal into an inline alert instead of a fake success.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SidebarFeedbackDialog } from './SidebarFeedbackDialog'

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))
const { submitMock } = vi.hoisted(() => ({ submitMock: vi.fn() }))
const { resolveInfoMock } = vi.hoisted(() => ({ resolveInfoMock: vi.fn() }))

vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/lib/sidebar-feedback-submit', () => ({ submitSidebarFeedback: submitMock }))
vi.mock('@/lib/client-environment-info', () => ({
  resolveClientEnvironmentInfo: resolveInfoMock,
}))

const PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
])

function imageFile(name = 'shot.png'): File {
  return new File([PNG_BYTES], name, { type: 'image/png' })
}

beforeEach(() => {
  toastMock.success.mockReset()
  toastMock.warning.mockReset()
  toastMock.error.mockReset()
  submitMock.mockReset()
  resolveInfoMock.mockResolvedValue({
    appVersion: '1.4.2',
    platform: 'linux',
    osRelease: '6.12',
    arch: 'x64',
  })
  URL.createObjectURL = vi.fn(() => 'blob:feedback-preview')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderDialog() {
  const onOpenChange = vi.fn()
  render(<SidebarFeedbackDialog open onOpenChange={onOpenChange} />)
  return { onOpenChange }
}

/** The environment footer resolves asynchronously; settle it before acting. */
async function settlePrefill(): Promise<void> {
  const textarea = screen.getByLabelText('What could we improve?') as HTMLTextAreaElement
  await waitFor(() => expect(textarea.value).toContain('Hydra: 1.4.2'))
}

describe('SidebarFeedbackDialog attachments (D10-078/D10-079)', () => {
  it('automatically highlights for a native file drag over the dialog', async () => {
    renderDialog()
    await settlePrefill()

    fireEvent.dragEnter(screen.getByRole('dialog'), {
      dataTransfer: { types: ['Files'] },
    })

    expect(screen.getByText(/Attach up to 4 screenshots/).closest('.border-dashed')).toHaveClass(
      'border-ring'
    )
  })

  it('does not highlight for an internal drag', async () => {
    renderDialog()
    await settlePrefill()

    fireEvent.dragEnter(screen.getByRole('dialog'), {
      dataTransfer: { types: ['text/x-orca-file-path'] },
    })

    expect(
      screen.getByText(/Attach up to 4 screenshots/).closest('.border-dashed')
    ).not.toHaveClass('border-ring')
  })

  it('claims a paste of a screenshot and attaches it', async () => {
    renderDialog()

    fireEvent.paste(screen.getByRole('dialog'), {
      clipboardData: { files: [imageFile()] },
    })

    await waitFor(() => expect(screen.getByAltText('shot.png')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Remove shot.png' })).toBeInTheDocument()
  })

  it('claims a drop of a screenshot and attaches it', async () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', {
      value: { types: ['Files'], files: [imageFile('dropped.png')] },
    })

    fireEvent(dialog, drop)

    expect(drop.defaultPrevented).toBe(true)
    await waitFor(() => expect(screen.getByAltText('dropped.png')).toBeInTheDocument())
  })
})

describe('SidebarFeedbackDialog prefill and image lifecycle (D10-080..D10-082)', () => {
  it('prefills the environment footer when it opens', async () => {
    renderDialog()

    const textarea = screen.getByLabelText('What could we improve?') as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toContain('Hydra: 1.4.2'))
    expect(textarea.value).toContain('OS: linux 6.12 (x64)')
  })

  it('revokes the preview URL when an attached image is removed', async () => {
    renderDialog()

    fireEvent.paste(screen.getByRole('dialog'), {
      clipboardData: { files: [imageFile()] },
    })
    await waitFor(() => expect(screen.getByAltText('shot.png')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Remove shot.png' }))

    expect(screen.queryByAltText('shot.png')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:feedback-preview')
  })
})

describe('SidebarFeedbackDialog submission', () => {
  it('disables Send until the user writes feedback beyond the footer', async () => {
    renderDialog()
    await waitFor(() =>
      expect(
        (screen.getByLabelText('What could we improve?') as HTMLTextAreaElement).value
      ).toContain('Hydra: 1.4.2')
    )

    const send = screen.getByRole('button', { name: 'Send' })
    expect(send).toBeDisabled()

    fireEvent.change(screen.getByLabelText('What could we improve?'), {
      target: { value: 'The sidebar flickers on resize.' },
    })
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('submits the typed feedback and closes on success', async () => {
    submitMock.mockResolvedValue({ ok: true })
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText('What could we improve?'), {
      target: { value: 'The sidebar flickers on resize.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1))
    expect(submitMock.mock.calls[0]?.[0]).toMatchObject({
      feedback: 'The sidebar flickers on resize.',
      images: [],
    })
    expect(toastMock.success).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('surfaces a submission refusal inline instead of reporting success', async () => {
    submitMock.mockResolvedValue({ ok: false, error: 'submit_sidebar_feedback not found' })
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText('What could we improve?'), {
      target: { value: 'Keep the report.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Failed to submit feedback')
    expect(alert).toHaveTextContent('submit_sidebar_feedback not found')
    expect(toastMock.success).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('warns when the backend cannot confirm image delivery', async () => {
    submitMock.mockResolvedValue({ ok: true, imagesDelivered: false })
    renderDialog()

    fireEvent.change(screen.getByLabelText('What could we improve?'), {
      target: { value: 'Screenshot attached.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(toastMock.warning).toHaveBeenCalledTimes(1))
    expect(toastMock.warning.mock.calls[0]?.[0]).toContain('image delivery could not be confirmed')
    expect(toastMock.success).not.toHaveBeenCalled()
  })
})
