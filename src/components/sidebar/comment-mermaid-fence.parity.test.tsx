// Parity guard for D15a-001/D15a-002: comment markdown renders a fenced
// ```mermaid block as a diagram, not as raw source, and unwraps the <pre> whose
// inner MermaidBlock paints a <div> (invalid inside <pre>).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render } from '@testing-library/react'

const { mermaidCalls } = vi.hoisted(() => ({ mermaidCalls: [] as Array<Record<string, unknown>> }))

vi.mock('@/components/editor/MermaidBlock', () => ({
  default: (props: Record<string, unknown>) => {
    mermaidCalls.push(props)
    return <div data-mermaid-stub="">{String(props.content)}</div>
  }
}))

import CommentMermaidBlock from './CommentMermaidBlock'
import { isMermaidFence, isMermaidPre, renderMermaidFence } from './comment-mermaid-fence'
import { useAppStore } from '@/store'

function codeElement(className: string): React.ReactElement {
  return <code className={className}>graph TD; A--&gt;B</code>
}

beforeEach(() => {
  mermaidCalls.length = 0
  useAppStore.setState({ settings: { theme: 'dark' } as never })
})

describe('mermaid fence detection (D15a-001)', () => {
  it('matches the language-mermaid class react-markdown emits', () => {
    expect(isMermaidFence('language-mermaid')).toBe(true)
    expect(isMermaidFence('my-language-mermaid-extra')).toBe(true)
    expect(isMermaidFence('language-ts')).toBe(false)
    expect(isMermaidFence(undefined)).toBe(false)
  })

  it('detects a mermaid fence behind the <pre> wrapper so it can be unwrapped', () => {
    expect(isMermaidPre(codeElement('language-mermaid'))).toBe(true)
    expect(isMermaidPre(codeElement('language-ts'))).toBe(false)
    expect(isMermaidPre('plain text')).toBe(false)
    expect(isMermaidPre(null)).toBe(false)
  })
})

describe('mermaid fence rendering (D15a-002)', () => {
  it('trims trailing whitespace and forwards the fence className', () => {
    render(<>{renderMermaidFence('graph TD;\n  A --> B\n\n', 'language-mermaid my-3')}</>)

    expect(mermaidCalls).toHaveLength(1)
    expect(mermaidCalls[0]).toMatchObject({
      content: 'graph TD;\n  A --> B',
      isDark: true,
      htmlLabels: false
    })
    expect(document.querySelector('.my-3')).not.toBeNull()
    expect(document.querySelector('.language-mermaid')).not.toBeNull()
  })

  it('reuses the editor renderer with html labels disabled', () => {
    render(<CommentMermaidBlock content="graph LR; X-->Y" />)

    expect(mermaidCalls).toHaveLength(1)
    expect(mermaidCalls[0]).toMatchObject({ content: 'graph LR; X-->Y', htmlLabels: false })
  })

  it('resolves the document theme for the editor renderer', () => {
    useAppStore.setState({ settings: { theme: 'light' } as never })
    render(<CommentMermaidBlock content="graph LR; X-->Y" />)

    expect(mermaidCalls[0]).toMatchObject({ isDark: false })
  })
})
