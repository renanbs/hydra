import React from 'react'
import { Check, Copy } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'
import { CommentMarkdownAsync } from './comment-markdown-lazy'
import type { DocumentCodeBlockRenderer } from './comment-markdown-element-renderers'

export type WorktreeNotesDocumentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  content: string
  /** Resolves relative file links against the workspace root. */
  fileLinkBasePath?: string
  githubRepo?: { owner: string; repo: string } | null
}

function reactNodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(reactNodeText).join('')
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return reactNodeText(node.props.children)
  }
  return ''
}

/**
 * Document-density code block with a language badge and copy affordance.
 * Passed to the markdown renderer so fenced blocks keep the language the fence
 * declared instead of collapsing into an anonymous `<pre>`.
 */
export const WorktreeNotesCodeBlock: DocumentCodeBlockRenderer = ({ children, language }) => {
  const [copied, setCopied] = React.useState(false)
  const source = reactNodeText(children).replace(/\n$/, '')
  const label = language?.trim() || 'text'

  React.useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = React.useCallback(() => {
    void navigator.clipboard?.writeText(source).then(
      () => setCopied(true),
      (error) => console.error('Failed to copy code:', error)
    )
  }, [source])

  return (
    <div className="my-3 max-w-full overflow-hidden rounded-md border border-border/60">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/50 px-2 py-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label={translate('auto.components.sidebar.WorktreeNotesDocument.copyCode', 'Copy code')}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          <span>
            {copied
              ? translate('auto.components.sidebar.WorktreeNotesDocument.copied', 'Copied')
              : translate('auto.components.sidebar.WorktreeNotesDocument.copyCode', 'Copy code')}
          </span>
        </button>
      </div>
      <pre className="max-h-80 max-w-full overflow-auto bg-accent/60 p-3 font-mono text-[12px]">
        {children}
      </pre>
    </div>
  )
}

/**
 * Full-document view of a workspace note. The card hover stays compact; this
 * dialog is the document surface: block headings, Mermaid diagrams, GitHub
 * attachment media, code blocks with language delegation and a lightbox for
 * images.
 */
export function WorktreeNotesDocumentDialog({
  open,
  onOpenChange,
  title,
  content,
  fileLinkBasePath,
  githubRepo
}: WorktreeNotesDocumentDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85dvh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-sm font-semibold text-foreground">
              {title}
            </DialogTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {translate('auto.components.sidebar.WorktreeNotesDocument.subtitle', 'Workspace notes')}
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-editor">
          <CommentMarkdownAsync
            content={content}
            variant="document"
            expandImages
            linkifyFilePaths
            fileLinkBasePath={fileLinkBasePath}
            githubRepo={githubRepo}
            renderCodeBlock={WorktreeNotesCodeBlock}
            className="text-[13px] leading-relaxed text-foreground"
            fallbackClassName="whitespace-pre-wrap"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
