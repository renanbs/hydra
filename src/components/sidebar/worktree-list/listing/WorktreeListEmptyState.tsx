// Ported from Orca (`renderer/src/components/sidebar/worktree-list/listing/EmptyState.tsx`).
// The single "No workspaces found" surface: it wins when filters hide every row, and
// only offers the Clear Filters escape hatch while filters are actually the cause.
import React from "react";
import { CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translate } from "@/i18n/i18n";

export interface WorktreeListEmptyStateProps {
  hasFilters: boolean;
  /** The filters' own reset path. Without it the escape hatch is not painted — a button with no writer would be inert. */
  onClearFilters?: () => void;
}

export function WorktreeListEmptyState({
  hasFilters,
  onClearFilters,
}: WorktreeListEmptyStateProps): React.JSX.Element {
  return (
    <div data-worktree-sidebar-container className="relative min-h-0 flex-1">
      <div className="worktree-sidebar-scrollbar flex h-full flex-col overflow-y-auto overflow-x-hidden pl-1 scrollbar-sleek pt-px">
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-[11px] text-muted-foreground">
          <span>
            {translate("auto.components.sidebar.WorktreeList.b7acbf038b", "No workspaces found")}
          </span>
          {hasFilters && onClearFilters && (
            <Button
              variant="secondary"
              size="xs"
              onClick={onClearFilters}
              className="gap-1.5 border border-border/80 text-[11px]"
            >
              <CircleX className="size-3.5" />
              {translate("auto.components.sidebar.WorktreeList.370c6a55dd", "Clear Filters")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorktreeListEmptyState;
