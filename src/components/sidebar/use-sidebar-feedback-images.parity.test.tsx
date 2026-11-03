// Parity guard for D10-081/D10-082: Orca's feedback attachment hook reserves
// capacity for in-flight reads, warns instead of silently dropping a rejected
// image, and revokes every object URL when its draft is removed, cleared or the
// dialog unmounts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useSidebarFeedbackImages } from './use-sidebar-feedback-images'

const { toastMock } = vi.hoisted(() => ({
  toastMock: { warning: vi.fn(), error: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: toastMock }))

// Minimal PNG: signature + IHDR length/type + 1x1 dimensions. The attachment
// reader validates encoded dimensions before creating a preview URL.
const PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
])

let previewCounter = 0

function imageFile(name: string, type = 'image/png'): File {
  return new File([PNG_BYTES], name, { type })
}

function mountedRef() {
  return { current: true }
}

beforeEach(() => {
  previewCounter = 0
  toastMock.warning.mockReset()
  toastMock.error.mockReset()
  URL.createObjectURL = vi.fn(() => `blob:preview-${++previewCounter}`)
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderImages(isSubmitting = false) {
  return renderHook(() =>
    useSidebarFeedbackImages({ open: true, isSubmitting, mountedRef: mountedRef() })
  )
}

describe('useSidebarFeedbackImages (D10-081)', () => {
  it('reads a valid image into a draft with a preview URL', async () => {
    const { result } = renderImages()

    act(() => {
      result.current.handleAddFiles([imageFile('shot.png')])
    })

    await waitFor(() => expect(result.current.images).toHaveLength(1))
    expect(result.current.images[0]).toMatchObject({
      name: 'shot.png',
      contentType: 'image/png',
      previewUrl: 'blob:preview-1',
    })
    expect(result.current.getReservedImageSlots()).toBe(1)
    expect(result.current.hasPendingImageReads()).toBe(false)
    expect(toastMock.warning).not.toHaveBeenCalled()
  })

  it('warns about an unsupported file instead of dropping it silently', async () => {
    const { result } = renderImages()

    act(() => {
      result.current.handleAddFiles([imageFile('notes.txt', 'text/plain')])
    })

    await waitFor(() => expect(toastMock.warning).toHaveBeenCalledTimes(1))
    expect(toastMock.warning.mock.calls[0]?.[0]).toContain('not a supported image type')
    expect(result.current.images).toHaveLength(0)
  })

  it('caps the attachments at four and reports the overflow', async () => {
    const { result } = renderImages()

    act(() => {
      result.current.handleAddFiles([
        imageFile('a.png'),
        imageFile('b.png'),
        imageFile('c.png'),
        imageFile('d.png'),
        imageFile('e.png'),
        imageFile('f.png'),
      ])
    })

    await waitFor(() => expect(result.current.images).toHaveLength(4))
    expect(result.current.getReservedImageSlots()).toBe(4)
    expect(toastMock.warning).toHaveBeenCalledTimes(1)
    expect(toastMock.warning.mock.calls[0]?.[0]).toContain('up to 4 images')
  })

  it('reserves capacity for images still being read across quick batches', async () => {
    const { result } = renderImages()

    act(() => {
      result.current.handleAddFiles([imageFile('a.png'), imageFile('b.png')])
      result.current.handleAddFiles([imageFile('c.png'), imageFile('d.png')])
    })

    await waitFor(() => expect(result.current.images).toHaveLength(4))
    expect(result.current.getReservedImageSlots()).toBe(4)
    expect(result.current.pendingImageReadCount).toBe(0)
  })

  it('refuses a new attachment while a submission is in flight', async () => {
    const { result } = renderImages(true)

    act(() => {
      result.current.handleAddFiles([imageFile('a.png')])
    })

    expect(result.current.images).toHaveLength(0)
    expect(toastMock.warning).toHaveBeenCalledTimes(1)
    expect(toastMock.warning.mock.calls[0]?.[0]).toContain('finish sending')
  })
})

describe('useSidebarFeedbackImages (D10-082)', () => {
  it('revokes the object URL when an image is removed', async () => {
    const { result } = renderImages()

    act(() => {
      result.current.handleAddFiles([imageFile('a.png'), imageFile('b.png')])
    })
    await waitFor(() => expect(result.current.images).toHaveLength(2))

    const removed = result.current.images[0]!
    act(() => {
      result.current.handleRemoveImage(removed.id)
    })

    expect(result.current.images.map((image) => image.name)).toEqual(['b.png'])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(removed.previewUrl)
  })

  it('revokes every remaining preview when the draft is cleared', async () => {
    const { result } = renderImages()

    act(() => {
      result.current.handleAddFiles([imageFile('a.png'), imageFile('b.png')])
    })
    await waitFor(() => expect(result.current.images).toHaveLength(2))

    act(() => {
      result.current.clearImages()
    })

    expect(result.current.images).toHaveLength(0)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('revokes previews that were still live when the dialog unmounted', async () => {
    const { result, unmount } = renderImages()

    act(() => {
      result.current.handleAddFiles([imageFile('a.png')])
    })
    await waitFor(() => expect(result.current.images).toHaveLength(1))

    unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
  })
})
