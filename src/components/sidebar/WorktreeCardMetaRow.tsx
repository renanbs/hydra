// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from "react";
import { GitBranch, GitCommit } from "lucide-react";
import type { GitWorktreeInfo } from "./types";

export interface WorktreeCardMetaRowProps {
  worktree: GitWorktreeInfo;
  compactCards?: boolean;
  children?: React.ReactNode;
}

export function WorktreeCardMetaRow({
  worktree,
  compactCards = false,
  children,
}: WorktreeCardMetaRowProps): React.JSX.Element {
  const branchName = (worktree.branch ?? "").trim();
  const isDetached =
    branchName === "" ||
    branchName === "HEAD" ||
    branchName === "(detached)" ||
    branchName.startsWith("(HEAD detached");

  const commitSha = worktree.head_commit ? worktree.head_commit.slice(0, 7) : "";

  return (
    <div
      className={`flex items-center justify-between gap-1.5 min-w-0 w-full pl-4.5 ${compactCards ? "text-[10px]" : "text-[11px]"}`}
      data-worktree-card-meta-row="true"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {isDetached ? (
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] px-1 py-0.2 rounded bg-neutral-800/80 text-amber-300/80 border border-neutral-700/60 leading-tight"
            title={`Detached HEAD at commit ${worktree.head_commit}`}
          >
            <GitCommit className="w-2.5 h-2.5 shrink-0" />
            <span>{commitSha || "detached"}</span>
          </span>
        ) : (
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <GitBranch className="w-2.5 h-2.5 text-emerald-400/80 shrink-0" />
            <span
              className="truncate text-[11px] text-neutral-400 font-normal leading-none"
              title={branchName}
            >
              {branchName}
            </span>
          </div>
        )}
        {worktree.status && (
          <span
            className={`inline-flex items-center gap-1 font-mono text-[9px] font-medium px-1.5 py-0.2 rounded border leading-tight capitalize shrink-0 ${
              worktree.status === "blocked"
                ? "bg-red-950/60 text-red-300 border-red-800/60"
                : worktree.status === "waiting"
                ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                : worktree.status === "working"
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                : worktree.status === "done"
                ? "bg-blue-950/60 text-blue-300 border-blue-800/60"
                : "bg-neutral-800 text-neutral-400 border-neutral-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                worktree.status === "blocked"
                  ? "bg-red-400"
                  : worktree.status === "waiting"
                  ? "bg-amber-400"
                  : worktree.status === "working"
                  ? "bg-emerald-400 animate-pulse"
                  : worktree.status === "done"
                  ? "bg-blue-400"
                  : "bg-neutral-400"
              }`}
            />
            {worktree.status}
          </span>
        )}
      </div>

      {children && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {children}
        </div>
      )}
    </div>
  );
}
