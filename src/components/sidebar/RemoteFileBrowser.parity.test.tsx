// The remote folder picker: navigation, typed entries, path mode and keyboard commands. The
// listing transport is mocked at the module boundary (the real one is blocked on
// `ssh_browse_dir`), so these tests pin the picker's own behavior.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { RemoteFileBrowser } from './RemoteFileBrowser'

const { browseSshDirectory, browseRuntimeServerDirectory } = vi.hoisted(() => ({
  browseSshDirectory: vi.fn(),
  browseRuntimeServerDirectory: vi.fn()
}))
vi.mock('@/store/remote-browse-bridge', () => ({
  browseSshDirectory,
  browseRuntimeServerDirectory
}))

type Listing = { resolvedPath: string; entries: { name: string; isDirectory: boolean }[] }

const LISTINGS: Record<string, Listing> = {
  '/home/deploy': {
    resolvedPath: '/home/deploy',
    entries: [
      { name: 'projects', isDirectory: true },
      { name: 'notes.md', isDirectory: false }
    ]
  },
  '/home': {
    resolvedPath: '/home',
    entries: [{ name: 'deploy', isDirectory: true }]
  },
  '/home/deploy/projects': {
    resolvedPath: '/home/deploy/projects',
    entries: [{ name: 'hydra', isDirectory: true }]
  },
  '/': {
    resolvedPath: '/',
    entries: [{ name: 'home', isDirectory: true }]
  }
}

function installListingMock(): void {
  browseSshDirectory.mockImplementation((_targetId: string, dirPath: string) => {
    const key = dirPath === '~' ? '/home/deploy' : dirPath
    const listing = LISTINGS[key]
    return listing
      ? Promise.resolve({ ...listing, pathFlavor: 'posix' })
      : Promise.reject(new Error(`no such directory: ${dirPath}`))
  })
}

async function renderBrowser(onSelect = vi.fn(), onCancel = vi.fn()) {
  render(
    <RemoteFileBrowser
      source={{ kind: 'ssh', targetId: 'srv' }}
      onSelect={onSelect}
      onCancel={onCancel}
    />
  )
  await act(async () => {})
  return { onSelect, onCancel }
}

beforeEach(() => {
  browseSshDirectory.mockReset()
  browseRuntimeServerDirectory.mockReset()
  installListingMock()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RemoteFileBrowser', () => {
  it('resolves home on open and lists typed entries', async () => {
    await renderBrowser()

    expect(browseSshDirectory).toHaveBeenCalledWith('srv', '~')
    expect(screen.getByRole('button', { name: /projects/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /notes\.md/ })).toBeInTheDocument()
    expect(screen.getByText(/Opens as a project on this host/)).toHaveTextContent(
      '/home/deploy'
    )
  })

  it('navigates into a folder on a debounced single click', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await renderBrowser()

    fireEvent.click(screen.getByRole('button', { name: /projects/ }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(219)
    })
    expect(browseSshDirectory).not.toHaveBeenCalledWith('srv', '/home/deploy/projects')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(browseSshDirectory).toHaveBeenCalledWith('srv', '/home/deploy/projects')
  })

  it('selects a folder immediately on double click', async () => {
    const { onSelect } = await renderBrowser()

    fireEvent.doubleClick(screen.getByRole('button', { name: /projects/ }))

    expect(onSelect).toHaveBeenCalledWith('/home/deploy/projects')
  })

  it('warns that a file cannot open as a project', async () => {
    await renderBrowser()

    fireEvent.click(screen.getByRole('button', { name: /notes\.md/ }))

    expect(await screen.findByText("Files can't be opened as a project")).toBeInTheDocument()
  })

  it('navigates on Enter when the filter leaves exactly one folder', async () => {
    await renderBrowser()
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'proj' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await act(async () => {})

    expect(browseSshDirectory).toHaveBeenCalledWith('srv', '/home/deploy/projects')
  })

  it('clears the filter on Escape, then cancels on a second Escape', async () => {
    const { onCancel } = await renderBrowser()
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'proj' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('')

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('walks up on Backspace from an empty input', async () => {
    await renderBrowser()
    const input = screen.getByRole('textbox')

    fireEvent.keyDown(input, { key: 'Backspace' })
    await act(async () => {})

    expect(browseSshDirectory).toHaveBeenCalledWith('srv', '/home')
  })

  it('resolves a typed path after the debounce and previews its listing', async () => {
    await renderBrowser()
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: '/home/deploy/projects/' } })

    expect(await screen.findByRole('button', { name: /hydra/ })).toBeInTheDocument()
    // Each committed segment is walked from the base; the final preview directory is
    // already cached from the initial '~' listing, so no fourth request is issued.
    expect(browseSshDirectory).toHaveBeenCalledWith('srv', '/')
    expect(browseSshDirectory).toHaveBeenCalledWith('srv', '/home')
    expect(browseSshDirectory).toHaveBeenCalledWith('srv', '/home/deploy/projects')
  })

  it('renders the listing error and keeps Select disabled', async () => {
    browseSshDirectory.mockRejectedValue(new Error('browse unavailable'))
    await renderBrowser()

    expect(screen.getByText('browse unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select folder' })).toBeDisabled()
  })

  it('navigates through breadcrumb segments', async () => {
    await renderBrowser()

    fireEvent.click(screen.getByRole('button', { name: 'home' }))
    await act(async () => {})

    expect(browseSshDirectory).toHaveBeenCalledWith('srv', '/home')
  })
})
