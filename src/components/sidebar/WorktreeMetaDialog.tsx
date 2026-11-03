// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeMetaDialog.tsx
// Parity with Orca's worktree metadata editor: display name, issue, review and
// free-form notes persisted in `worktree_metadata`. The dialog edits a draft and
// only the Save handler writes, so Cancel never touches the store.
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { Label } from '@/components/ui/label'
import { translate } from '@/i18n/i18n'
import { WorktreeDisplayNameField } from './WorktreeDisplayNameField'
import { WorktreeIssueLinkField, type WorktreeIssueProvider } from './WorktreeIssueLinkField'
import { WorktreeReviewLinkField } from './WorktreeReviewLinkField'
import { getDisplacedLinkLabels } from './worktree-issue-displacement'
import type { WorktreeMetadataDraft } from './worktree-metadata-types'

export interface WorktreeMetaDialogProps {
  open: boolean;
  worktreeName: string;
  initial: WorktreeMetadataDraft;
  /** Provider of the linked review, so the field speaks PR or MR. */
  reviewProvider?: 'github' | 'gitlab';
  onOpenChange: (open: boolean) => void;
  onSave: (draft: WorktreeMetadataDraft) => void;
}

function parsePositiveInteger(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/^#/, ''));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function WorktreeMetaDialog({
  open,
  worktreeName,
  initial,
  reviewProvider = 'github',
  onOpenChange,
  onSave,
}: WorktreeMetaDialogProps): React.JSX.Element | null {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [issueProvider, setIssueProvider] = useState<WorktreeIssueProvider>(
    initial.linkedLinearIssue && initial.linkedIssue == null ? 'linear' : 'github'
  );
  const [issueInput, setIssueInput] = useState(
    initial.linkedLinearIssue ??
      (initial.linkedIssue == null ? '' : String(initial.linkedIssue))
  );
  const [linkedPR, setLinkedPR] = useState(initial.linkedPR == null ? '' : String(initial.linkedPR));
  const [comment, setComment] = useState(initial.comment);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const issueInputRef = useRef<HTMLInputElement>(null);
  const reviewInputRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const nameFieldId = useId();
  // Why a ref: the caller rebuilds `initial` every render; seeding on that identity
  // would wipe the draft mid-typing. Seed only when the dialog opens.
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    if (!open) return;
    const seed = initialRef.current;
    setDisplayName(seed.displayName);
    setIssueProvider(seed.linkedLinearIssue && seed.linkedIssue == null ? 'linear' : 'github');
    setIssueInput(
      seed.linkedLinearIssue ?? (seed.linkedIssue == null ? '' : String(seed.linkedIssue))
    );
    setLinkedPR(seed.linkedPR == null ? '' : String(seed.linkedPR));
    setComment(seed.comment);
    setError(null);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, [open]);

  // Why: the notes grow with their content instead of scrolling inside a fixed
  // three-row box, so a long handoff stays readable while editing.
  useEffect(() => {
    const node = commentRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [comment, open]);

  const draftCandidate: WorktreeMetadataDraft = {
    displayName,
    comment,
    linkedIssue: issueProvider === 'github' ? (parsePositiveInteger(issueInput) ?? null) : null,
    linkedPR: parsePositiveInteger(linkedPR) ?? null,
    linkedLinearIssue: issueProvider === 'linear' ? issueInput.trim() || null : null,
  };

  const displacedLinkLabels = getDisplacedLinkLabels({
    draft: draftCandidate,
    snapshot: initial,
    isFolderWorkspace: false,
  });

  const isIssueInvalid = Boolean(issueInput.trim()) && draftCandidate.linkedIssue === null && issueProvider === 'github';

  const submit = useCallback(() => {
    const pullRequest = parsePositiveInteger(linkedPR);
    if (isIssueInvalid || pullRequest === undefined) {
      setError(
        translate(
          'auto.components.sidebar.WorktreeMetaDialog.invalidLinks',
          'Issue and review must be positive numbers.'
        )
      );
      return;
    }
    const issue = issueProvider === 'github' ? parsePositiveInteger(issueInput) : null;
    if (issueProvider === 'github' && issue === undefined) {
      setError(
        translate(
          'auto.components.sidebar.WorktreeMetaDialog.invalidLinks',
          'Issue and review must be positive numbers.'
        )
      );
      return;
    }
    const linear = issueProvider === 'linear' ? issueInput.trim() : '';
    onSave({
      displayName: displayName.trim() || worktreeName,
      comment,
      linkedIssue: issue ?? null,
      linkedPR: pullRequest ?? null,
      linkedLinearIssue: linear || null,
    });
  }, [
    comment,
    displayName,
    isIssueInvalid,
    issueInput,
    issueProvider,
    linkedPR,
    onSave,
    worktreeName,
  ]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      // Orca's submit chord: the dialog can be long, so Save must not require a
      // trip to the footer.
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, submit]);

  const handleIssueKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  if (!open) return null;

  const fieldClass =
    'w-full rounded border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-ring';

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-popover p-5 text-xs text-popover-foreground shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={nameFieldId}
      >
        <h2 id={nameFieldId} className="text-sm font-semibold tracking-tight text-foreground">
          {translate('auto.components.sidebar.WorktreeMetaDialog.title', 'Workspace metadata')}
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">{worktreeName}</p>

        <div className="mt-3 space-y-2.5">
          <WorktreeDisplayNameField
            disabled={false}
            inputRef={nameInputRef}
            value={displayName}
            onValueChange={setDisplayName}
            onEnter={submit}
          />

          <div className="grid grid-cols-2 gap-2">
            <WorktreeIssueLinkField
              inputRef={issueInputRef}
              value={issueInput}
              provider={issueProvider}
              isInvalid={isIssueInvalid}
              displacedLinkLabels={displacedLinkLabels}
              onValueChange={setIssueInput}
              onProviderChange={(next) => {
                setIssueProvider(next);
                setIssueInput('');
                setError(null);
              }}
              onKeyDown={handleIssueKeyDown}
            />
            <WorktreeReviewLinkField
              inputRef={reviewInputRef}
              value={linkedPR}
              provider={reviewProvider}
              onValueChange={setLinkedPR}
              onKeyDown={handleIssueKeyDown}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              {translate('auto.components.sidebar.WorktreeMetaDialog.notes', 'Notes')}
            </Label>
            <textarea
              ref={commentRef}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className={`${fieldClass} resize-none overflow-hidden`}
            />
            <p className="text-[10px] text-muted-foreground">
              {translate(
                'auto.components.sidebar.WorktreeMetaDialog.submitHint',
                'Markdown supported. Press Ctrl/Cmd+Enter to save.'
              )}
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-[11px] text-red-500">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded border border-border px-4 py-1.5 font-medium text-foreground transition hover:bg-accent"
          >
            {translate('auto.components.sidebar.WorktreeMetaDialog.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="cursor-pointer rounded bg-emerald-600 px-4 py-1.5 font-medium text-white transition hover:bg-emerald-500"
          >
            {translate('auto.components.sidebar.WorktreeMetaDialog.save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}
