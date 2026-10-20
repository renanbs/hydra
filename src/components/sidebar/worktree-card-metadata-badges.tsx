// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeCardMetaBadges.tsx
//
// The icon row that tells the card at a glance which metadata exists. Each badge is
// icon-only, so the label lives in the tooltip and in the accessible name.
import type React from "react";
import { CalendarClock, CircleDot, SquareTerminal, StickyNote } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
export type WorktreeCardMetadata = {
  comment: string;
  linkedIssue: number | null;
  linkedLinearIssue: string | null;
};

export type WorktreeCardDetailInput = {
  comment?: string | null;
  linkedIssue?: number | null;
  linkedLinearIssue?: string | null;
  automationProvenance?: unknown;
  cliProvenance?: unknown;
  hasReview?: boolean;
};

export function hasWorktreeCardDetails(input: WorktreeCardDetailInput): boolean {
  return Boolean(
    (input.comment ?? "").trim().length > 0 ||
      input.linkedIssue ||
      input.linkedLinearIssue ||
      input.automationProvenance ||
      input.cliProvenance ||
      input.hasReview
  );
}

function MetaIconBadge({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={label}
          className="inline-flex size-3.5 shrink-0 items-center justify-center [&>svg]:size-3"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function WorktreeCardMetaBadges({
  metadata,
  automationCreated = false,
  cliCreated = false,
  hasReview,
  className = "",
}: {
  metadata?: WorktreeCardMetadata | null;
  automationCreated?: boolean;
  cliCreated?: boolean;
  hasReview: boolean;
  className?: string;
}): React.JSX.Element | null {
  if (
    !hasWorktreeCardDetails({
      comment: metadata?.comment,
      linkedIssue: metadata?.linkedIssue,
      linkedLinearIssue: metadata?.linkedLinearIssue,
      automationProvenance: automationCreated,
      cliProvenance: cliCreated,
      hasReview,
    })
  ) {
    return null;
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-1 ${className}`}
      aria-label="Workspace metadata"
    >
      {(metadata?.comment ?? "").trim() ? (
        <MetaIconBadge label="Workspace notes">
          <StickyNote className="text-muted-foreground" />
        </MetaIconBadge>
      ) : null}
      {automationCreated ? (
        <MetaIconBadge label="Created by automation">
          <CalendarClock className="text-muted-foreground" />
        </MetaIconBadge>
      ) : null}
      {cliCreated ? (
        <MetaIconBadge label="Created by CLI">
          <SquareTerminal className="text-muted-foreground" />
        </MetaIconBadge>
      ) : null}
      {metadata?.linkedIssue ? (
        <MetaIconBadge label={`Linked issue #${metadata.linkedIssue}`}>
          <CircleDot className="text-muted-foreground" />
        </MetaIconBadge>
      ) : null}
      {metadata?.linkedLinearIssue ? (
        <MetaIconBadge label={`Linked Linear ${metadata.linkedLinearIssue}`}>
          <CircleDot className="text-muted-foreground" />
        </MetaIconBadge>
      ) : null}
    </div>
  );
}
