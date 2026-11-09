// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/components/status-bar/workspace-space-status-badge.tsx
// (+ decision-hover-card content inlined as title tooltip: Hydra has no
// HoverCard port; the readiness detail surfaces via title text).
import { Loader2 } from 'lucide-react'
import type { WorkspaceSpaceWorktree } from '@/store/slices/workspace-space-types'
import { Badge } from '../ui/badge'
import { getWorkspaceSpaceStatusLabel } from './workspace-space-format'
import { translate } from '@/i18n/i18n'
import type { WorkspaceDecisionDetails } from './workspace-space-decision-details'

export function WorkspaceSpaceStatusBadge({
  worktree,
  decisionDetails,
  deleteState
}: {
  worktree: WorkspaceSpaceWorktree
  decisionDetails?: WorkspaceDecisionDetails
  deleteState?: { isDeleting?: boolean; error?: string | null }
}): React.JSX.Element {
  if (deleteState?.isDeleting) {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.33653dbac2', 'Deleting')}
      </Badge>
    )
  }
  if (deleteState?.error) {
    return (
      <Badge variant="outline" className="border-destructive/30 text-destructive">
        {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.39801484e0', 'Failed')}
      </Badge>
    )
  }
  if (worktree.status !== 'ok') {
    return (
      <Badge variant="outline" className="border-destructive/30 text-destructive">
        {getWorkspaceSpaceStatusLabel(worktree.status)}
      </Badge>
    )
  }
  if (worktree.isMainWorktree) {
    return (
      <Badge variant="outline">
        {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.2b501ee391', 'Keep: main')}
      </Badge>
    )
  }
  if (decisionDetails?.isActive) {
    return (
      <Badge variant="outline">
        {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.7f7895514e', 'Keep: active')}
      </Badge>
    )
  }
  if ((decisionDetails?.changedFileCount ?? 0) > 0) {
    return (
      <Badge variant="outline">
        {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.7ab8d7e2d7', 'Keep: changed files')}
      </Badge>
    )
  }
  if (decisionDetails?.changedFileCount === null) {
    return (
      <Badge variant="outline">
        {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.ec7b076a75', 'Keep: git not checked')}
      </Badge>
    )
  }
  if ((decisionDetails?.dirtyEditorBufferCount ?? 0) > 0) {
    return (
      <Badge variant="outline">
        {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.2055bc6a5a', 'Keep: unsaved edits')}
      </Badge>
    )
  }
  if (
    (decisionDetails?.activeAgentCount ?? 0) > 0 ||
    (decisionDetails?.liveTerminalCount ?? 0) > 0 ||
    (decisionDetails?.browserTabCount ?? 0) > 0
  ) {
    return (
      <Badge variant="outline">
        {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.cbc343a7a8', 'Keep: in use')}
      </Badge>
    )
  }
  if (decisionDetails?.reviewLabel) {
    return <Badge variant="outline">{decisionDetails.reviewLabel}</Badge>
  }
  if (decisionDetails?.issueLabel) {
    return <Badge variant="outline">{decisionDetails.issueLabel}</Badge>
  }
  if (decisionDetails?.linearIssueLabel) {
    return <Badge variant="outline">{decisionDetails.linearIssueLabel}</Badge>
  }
  return (
    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
      {translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.deletable', 'Deletable')}
    </Badge>
  )
}
