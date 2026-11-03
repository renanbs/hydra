// Parity guard for D10-078/D10-079: Orca's feedback dialog highlights a native
// file drag, accepts the dragover, and claims the drop on window capture so the
// screenshot attaches here instead of being opened by the native-drop lane
// behind the dialog. A drop outside the dialog content is ignored.
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useFeedbackImageDrop } from './use-feedback-image-drop'

function imageFile(name = 'shot.png'): File {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' })
}

function Harness({
  open = true,
  onAddFiles,
}: {
  open?: boolean
  onAddFiles: (files: readonly File[]) => void
}) {
  const { isDragActive, contentRef, dragHandlers } = useFeedbackImageDrop(open, onAddFiles)
  return (
    <div data-testid="dialog" {...dragHandlers}>
      <span>{isDragActive ? 'drag-active' : 'drag-idle'}</span>
      <div ref={contentRef} data-testid="content" />
    </div>
  )
}

function dropOn(target: Element, files: File[]): Event {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files },
  })
  target.dispatchEvent(event)
  return event
}

describe('useFeedbackImageDrop (D10-078)', () => {
  it('highlights only for a native file drag', () => {
    render(<Harness onAddFiles={vi.fn()} />)

    fireEvent.dragEnter(screen.getByTestId('dialog'), {
      dataTransfer: { types: ['text/plain'] },
    })
    expect(screen.getByText('drag-idle')).toBeInTheDocument()

    fireEvent.dragEnter(screen.getByTestId('dialog'), {
      dataTransfer: { types: ['Files'] },
    })
    expect(screen.getByText('drag-active')).toBeInTheDocument()
  })

  it('keeps the highlight until the drag leaves every nested child', () => {
    render(<Harness onAddFiles={vi.fn()} />)
    const dialog = screen.getByTestId('dialog')

    fireEvent.dragEnter(dialog, { dataTransfer: { types: ['Files'] } })
    fireEvent.dragEnter(screen.getByTestId('content'), { dataTransfer: { types: ['Files'] } })
    fireEvent.dragLeave(screen.getByTestId('content'), { dataTransfer: { types: ['Files'] } })
    expect(screen.getByText('drag-active')).toBeInTheDocument()

    fireEvent.dragLeave(dialog, { dataTransfer: { types: ['Files'] } })
    expect(screen.getByText('drag-idle')).toBeInTheDocument()
  })

  it('accepts the dragover so the browser refuses to navigate to the file', () => {
    render(<Harness onAddFiles={vi.fn()} />)
    const dataTransfer = { types: ['Files'], dropEffect: 'none' }

    const allowDefault = fireEvent.dragOver(screen.getByTestId('dialog'), { dataTransfer })

    // fireEvent returns false when the handler cancelled the default action.
    expect(allowDefault).toBe(false)
    expect(dataTransfer.dropEffect).toBe('copy')
  })

  it('ignores an internal drag (no Files type)', () => {
    render(<Harness onAddFiles={vi.fn()} />)
    const dataTransfer = { types: ['text/x-orca-file-path'], dropEffect: 'none' }

    expect(fireEvent.dragOver(screen.getByTestId('dialog'), { dataTransfer })).toBe(true)
    expect(dataTransfer.dropEffect).toBe('none')
  })

  it('claims an image drop inside the dialog and stops the native lane', () => {
    const onAddFiles = vi.fn()
    render(<Harness onAddFiles={onAddFiles} />)
    const content = screen.getByTestId('content')
    const file = imageFile()
    const nativeLane = vi.fn()
    // A bubble listener on the target stands in for the preload/native drop lane:
    // a claimed drop must not reach it.
    content.addEventListener('drop', nativeLane)

    const event = dropOn(content, [file])

    expect(event.defaultPrevented).toBe(true)
    expect(nativeLane).not.toHaveBeenCalled()
    expect(onAddFiles).toHaveBeenCalledWith([file])
  })

  it('cancels a non-image drop without attaching anything', () => {
    const onAddFiles = vi.fn()
    render(<Harness onAddFiles={onAddFiles} />)
    const content = screen.getByTestId('content')
    const text = new File(['hello'], 'notes.txt', { type: 'text/plain' })

    const event = dropOn(content, [text])

    expect(event.defaultPrevented).toBe(true)
    expect(onAddFiles).not.toHaveBeenCalled()
  })

  it('does not claim a drop outside the dialog content', () => {
    const onAddFiles = vi.fn()
    render(<Harness onAddFiles={onAddFiles} />)

    const event = dropOn(document.body, [imageFile()])

    expect(event.defaultPrevented).toBe(false)
    expect(onAddFiles).not.toHaveBeenCalled()
  })

  it('resets the highlight on dragend and when the dialog closes mid-drag', () => {
    const { rerender } = render(<Harness onAddFiles={vi.fn()} />)
    const dialog = screen.getByTestId('dialog')

    fireEvent.dragEnter(dialog, { dataTransfer: { types: ['Files'] } })
    fireEvent.dragEnd(window, { dataTransfer: { types: ['Files'] } })
    expect(screen.getByText('drag-idle')).toBeInTheDocument()

    fireEvent.dragEnter(dialog, { dataTransfer: { types: ['Files'] } })
    rerender(<Harness open={false} onAddFiles={vi.fn()} />)
    expect(screen.getByText('drag-idle')).toBeInTheDocument()
  })

  it('does not listen for drops while closed', () => {
    const onAddFiles = vi.fn()
    render(<Harness open={false} onAddFiles={onAddFiles} />)

    dropOn(screen.getByTestId('content'), [imageFile()])

    expect(onAddFiles).not.toHaveBeenCalled()
  })
})
