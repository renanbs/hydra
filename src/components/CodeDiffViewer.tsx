import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { MessageSquarePlus, Send, Trash2, X } from "lucide-react";
import { useAppStore } from "@/store";

interface CodeDiffViewerProps {
  original: string;
  modified: string;
  language?: string;
  theme?: string;
  /** Workspace key (`worktree:<id>` / `folder:<id>`) that owns the review notes. */
  notesKey?: string;
  /** Diffed file path, stamped on each note. */
  filePath?: string;
}

/**
 * Hydra port of Orca's diff review notes: select lines in the modified side, add a
 * note, then send the unsent notes to a running agent. Notes persist per workspace
 * (see the diff-comments slice) and survive tab switches.
 */
export function CodeDiffViewer({
  original,
  modified,
  language = "rust",
  theme = "vs-dark",
  notesKey,
  filePath,
}: CodeDiffViewerProps) {
  const notes = useAppStore((s) => (notesKey ? s.diffCommentsByWorktree[notesKey] : undefined));
  const getDiffComments = useAppStore((s) => s.getDiffComments);
  const addDiffComment = useAppStore((s) => s.addDiffComment);
  const deleteDiffComment = useAppStore((s) => s.deleteDiffComment);
  const openAgentSendPopoverTargetMode = useAppStore(
    (s) => s.openAgentSendPopoverTargetMode
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diffEditorRef = useRef<any>(null);
  const [selection, setSelection] = useState<{
    startLine: number;
    lineNumber: number;
    selectedText: string;
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (!notesKey) return;
    // Hydrates the workspace's notes on first mount.
    getDiffComments(notesKey);
  }, [getDiffComments, notesKey]);

  useEffect(() => {
    const disposable = diffEditorRef.current
      ?.getModifiedEditor()
      .onDidChangeCursorSelection((event: any) => {
        const model = diffEditorRef.current?.getModifiedEditor().getModel();
        if (!model) {
          setSelection(null);
          return;
        }
        const startLine = event.selection.startLineNumber;
        const endLine = event.selection.endLineNumber;
        const selectedText = model.getValueInRange(event.selection).trim();
        setSelection({
          startLine,
          lineNumber: Math.max(startLine, endLine),
          selectedText,
        });
      });
    return () => disposable?.dispose();
  }, [modified]);

  const workspaceNotes = notes ?? [];
  const unsentCount = useMemo(
    () => workspaceNotes.filter((note) => !note.sentAt).length,
    [workspaceNotes]
  );

  const handleSaveNote = useCallback(async () => {
    if (!notesKey || !selection || !draft.trim()) return;
    const created = await addDiffComment({
      worktreeId: notesKey,
      body: draft.trim(),
      filePath: filePath ?? "(unknown file)",
      lineNumber: selection.lineNumber,
      ...(selection.startLine < selection.lineNumber ? { startLine: selection.startLine } : {}),
      ...(selection.selectedText ? { selectedText: selection.selectedText } : {}),
      source: "diff",
    } as never);
    if (created) {
      setDraft("");
      setComposing(false);
    }
  }, [addDiffComment, draft, filePath, notesKey, selection]);

  const handleSend = useCallback(() => {
    if (!notesKey || unsentCount === 0) return;
    openAgentSendPopoverTargetMode({
      id: `diff-notes:${notesKey}`,
      worktreeId: notesKey,
      launchSource: "diff-notes",
    } as never);
  }, [notesKey, openAgentSendPopoverTargetMode, unsentCount]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ background: "var(--app-bg)" }}>
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2 text-[11px]">
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {filePath ?? "Diff"}
        </span>
        {selection ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setComposing((value) => !value)}
            title={`Add review note at line ${selection.lineNumber}`}
          >
            <MessageSquarePlus className="size-3" />
            Add note
          </button>
        ) : null}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          onClick={handleSend}
          disabled={unsentCount === 0}
          title={unsentCount === 0 ? "No unsent review notes" : "Send review notes to a running agent"}
        >
          <Send className="size-3" />
          Send{unsentCount > 0 ? ` (${unsentCount})` : ""}
        </button>
        <span className="tabular-nums text-muted-foreground" data-review-note-count>
          {workspaceNotes.length}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <DiffEditor
          height="100%"
          width="100%"
          theme={theme}
          language={language}
          original={original}
          modified={modified}
          onMount={(editor) => {
            diffEditorRef.current = editor;
          }}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: "on",
            renderWhitespace: "none",
            smoothScrolling: true,
          }}
        />

        {composing && selection ? (
          <div className="absolute right-3 top-3 z-10 w-72 rounded-lg border border-border bg-popover p-2 shadow-xl">
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                Note at line {selection.lineNumber}
                {selection.selectedText ? " (selection)" : ""}
              </span>
              <button type="button" onClick={() => setComposing(false)} aria-label="Cancel note">
                <X className="size-3" />
              </button>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void handleSaveNote();
                }
                if (event.key === "Escape") setComposing(false);
              }}
              rows={3}
              placeholder="What should change here?"
              className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-[11px] outline-none"
            />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => void handleSaveNote()}
                className="rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground disabled:opacity-40"
              >
                Save note
              </button>
            </div>
          </div>
        ) : null}

        {workspaceNotes.length > 0 ? (
          <div
            data-review-notes-panel
            className="absolute bottom-2 right-2 z-10 max-h-48 w-72 overflow-y-auto rounded-lg border border-border bg-popover p-2 text-[11px] shadow-xl"
          >
            {workspaceNotes.map((note) => (
              <div key={note.id} className="flex items-start gap-1 border-b border-border/40 py-1 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-muted-foreground">
                    {note.filePath}:{note.lineNumber}
                    {note.sentAt ? " · sent" : ""}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{note.body}</div>
                </div>
                <button
                  type="button"
                  aria-label="Delete note"
                  onClick={() => void deleteDiffComment(notesKey!, note.id)}
                  className="mt-0.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
