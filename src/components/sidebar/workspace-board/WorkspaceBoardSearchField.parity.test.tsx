import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspaceBoardSearchField, { overlayReserve } from './WorkspaceBoardSearchField'

type FieldProps = React.ComponentProps<typeof WorkspaceBoardSearchField>

function fieldProps(overrides: Partial<FieldProps> = {}): FieldProps {
  return {
    query: '',
    isFiltering: false,
    isTooLarge: false,
    matchCount: 0,
    totalCount: 0,
    onQueryChange: vi.fn(),
    onClear: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
}

function searchBox(): HTMLInputElement {
  return screen.getByRole('textbox', { name: 'Search workspaces' })
}

function liveRegion(): HTMLElement {
  return screen.getByRole('status')
}

describe('WorkspaceBoardSearchField (Orca WorkspaceKanbanSearchField parity)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('reports typing and shows the clear button only once there is text', () => {
    const onQueryChange = vi.fn()
    const { rerender } = render(<WorkspaceBoardSearchField {...fieldProps({ onQueryChange })} />)

    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()

    fireEvent.change(searchBox(), { target: { value: 'feat' } })
    expect(onQueryChange).toHaveBeenCalledWith('feat')

    rerender(<WorkspaceBoardSearchField {...fieldProps({ query: 'feat', isFiltering: true })} />)
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument()
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
  })

  it('keeps the focus in the field when the clear button is pressed', () => {
    const onClear = vi.fn()
    render(<WorkspaceBoardSearchField {...fieldProps({ query: 'feat', onClear })} />)

    const clear = screen.getByRole('button', { name: 'Clear search' })
    fireEvent.mouseDown(clear)
    fireEvent.click(clear)

    expect(onClear).toHaveBeenCalledTimes(1)
    expect(searchBox()).toHaveFocus()
  })

  it('clears the text on Escape when there is a query', () => {
    const onClear = vi.fn()
    const onClose = vi.fn()
    render(<WorkspaceBoardSearchField {...fieldProps({ query: 'feat', onClear, onClose })} />)

    fireEvent.keyDown(searchBox(), { key: 'Escape' })

    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes the board on Escape when the field is empty', () => {
    const onClear = vi.fn()
    const onClose = vi.fn()
    render(<WorkspaceBoardSearchField {...fieldProps({ query: '', onClear, onClose })} />)

    fireEvent.keyDown(searchBox(), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClear).not.toHaveBeenCalled()
  })

  it('leaves Escape to the IME while a composition is in progress', () => {
    const onClear = vi.fn()
    const onClose = vi.fn()
    render(
      <WorkspaceBoardSearchField {...fieldProps({ query: 'ニ', onClear, onClose })} />
    )

    fireEvent.keyDown(searchBox(), { key: 'Escape', isComposing: true })

    expect(onClear).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('announces the result only after the debounce', () => {
    render(
      <WorkspaceBoardSearchField
        {...fieldProps({ query: 'feat', isFiltering: true, matchCount: 1, totalCount: 2 })}
      />
    )

    expect(liveRegion()).toHaveTextContent('')

    act(() => vi.advanceTimersByTime(400))
    expect(liveRegion()).toHaveTextContent('1 of 2 workspaces match')
  })

  it('announces a zero-match result and clears the announcement when the query goes away', () => {
    const { rerender } = render(
      <WorkspaceBoardSearchField
        {...fieldProps({ query: 'zzz', isFiltering: true, matchCount: 0, totalCount: 2 })}
      />
    )

    act(() => vi.advanceTimersByTime(400))
    expect(liveRegion()).toHaveTextContent('No workspaces match')

    rerender(<WorkspaceBoardSearchField {...fieldProps({ query: '' })} />)
    expect(liveRegion()).toHaveTextContent('')
  })

  it('warns immediately when the text was discarded for length', () => {
    render(
      <WorkspaceBoardSearchField
        {...fieldProps({ query: 'x'.repeat(4096), isTooLarge: true, isFiltering: false })}
      />
    )

    expect(searchBox()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Too long')).toBeInTheDocument()
    expect(liveRegion()).toHaveTextContent('the board is unfiltered')
  })

  it('reserves room for the counter without letting it squeeze the text', () => {
    expect(overlayReserve(null)).toBe('32px')
    expect(overlayReserve('9 / 9')).toBe('min(calc(36px + 5ch), 55%)')
  })
})
