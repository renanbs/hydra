// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ExternalLink,
  Copy,
  Check,
  GitBranch,
  Plug,
  Square,
  Folder,
} from "lucide-react";
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeReviewStatus } from "./types";
import { WorktreeCardReviewBadge } from "./WorktreeCardReviewBadge";

export interface WorktreeCardDetailsHoverProps {
  worktree: GitWorktreeInfo;
  project: HydraProject;
  ports?: WorkspacePort[];
  review?: WorktreeReviewStatus;
  children: React.ReactNode;
  onPortKilled?: () => void;
}

export function WorktreeCardDetailsHover({
  worktree,
  project,
  ports = [],
  review,
  children,
  onPortKilled,
}: WorktreeCardDetailsHoverProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedBranch, setCopiedBranch] = useState(false);
  const [stoppingPid, setStoppingPid] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    return clearTimers;
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!isOpen && openTimerRef.current === null) {
      openTimerRef.current = window.setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const popoverWidth = 288; // w-72 = 18rem = 288px
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // Position to the right of the card, or to the left if overflowing
          let left = rect.right + 6;
          if (left + popoverWidth > viewportWidth - 10) {
            left = Math.max(10, rect.left - popoverWidth - 6);
          }

          // Position top aligned, clamped so it doesn't overflow bottom
          let top = rect.top;
          if (top + 280 > viewportHeight - 10) {
            top = Math.max(10, viewportHeight - 290);
          }

          setCoords({ top, left });
          setIsOpen(true);
        }
      }, 150);
    }
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (isOpen && closeTimerRef.current === null) {
      closeTimerRef.current = window.setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
  };

  const copyText = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, []);

  const handleStopPort = async (pid: number) => {
    setStoppingPid(pid);
    try {
      await invoke("kill_port_process", { pid, worktreePath: worktree.path });
      onPortKilled?.();
      window.dispatchEvent(new CustomEvent("hydra:refresh-ports"));
    } catch (e) {
      console.error("Failed to stop port process:", e);
    } finally {
      setStoppingPid(null);
    }
  };

  const cardTitle =
    worktree.display_name?.trim() ||
    worktree.branch?.trim() ||
    worktree.path.split("/").filter(Boolean).pop() ||
    "worktree";

  const branchName = worktree.branch?.trim() || "HEAD";
  const commitSha = worktree.head_commit ? worktree.head_commit.slice(0, 7) : "";

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-full"
    >
      {children}

      {isOpen && (
        <div
          ref={popoverRef}
          onMouseEnter={() => {
            if (closeTimerRef.current !== null) {
              window.clearTimeout(closeTimerRef.current);
              closeTimerRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed z-[99999] w-72 rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl p-3 text-xs text-neutral-200 space-y-2.5 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Header: Title and Branch */}
          <div className="pb-2 border-b border-neutral-800 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="font-semibold text-[13px] text-neutral-100 truncate">
                {cardTitle}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                {project.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1 min-w-0">
                <GitBranch className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{branchName}</span>
                {commitSha && (
                  <span className="font-mono text-[9px] text-neutral-500">
                    ({commitSha})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => copyText(branchName, setCopiedBranch)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                title="Copy branch name"
              >
                {copiedBranch ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Ports Section */}
          {ports.length > 0 && (
            <div className="space-y-1.5 pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <Plug className="w-3 h-3 shrink-0" />
                <span>Live Ports ({ports.length})</span>
              </div>
              <div className="space-y-1">
                {ports.map((p) => {
                  const url = `http://localhost:${p.port}`;
                  return (
                    <div
                      key={p.port}
                      className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-emerald-300 font-medium">
                          :{p.port}
                        </span>
                        {p.process_name && (
                          <span className="text-[10px] text-neutral-400 truncate">
                            {p.process_name}
                          </span>
                        )}
                        {p.pid && (
                          <span className="font-mono text-[9px] text-neutral-500">
                            PID {p.pid}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => window.open(url, "_blank")}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition cursor-pointer"
                          title={`Open ${url} in browser`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        {p.pid && (
                          <button
                            type="button"
                            disabled={stoppingPid === p.pid}
                            onClick={() => handleStopPort(p.pid!)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
                            title={`Stop process (PID ${p.pid})`}
                          >
                            <Square className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PR / Review Section */}
          {review && (
            <div className="space-y-1 pb-2 border-b border-neutral-800">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Pull Request
              </div>
              <div className="flex items-center gap-2">
                <WorktreeCardReviewBadge review={review} />
                {review.title && (
                  <span className="text-[11px] text-neutral-300 truncate">
                    {review.title}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Absolute Path */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[10px] text-neutral-400">
              <div className="flex items-center gap-1">
                <Folder className="w-3 h-3 text-neutral-500" />
                <span>Path</span>
              </div>
              <button
                type="button"
                onClick={() => copyText(worktree.path, setCopiedPath)}
                className="inline-flex items-center gap-1 text-[9px] text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
              >
                {copiedPath ? (
                  <>
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div
              className="font-mono text-[10px] text-neutral-400 bg-neutral-900/80 p-1.5 rounded border border-neutral-800/80 break-all select-all"
              title={worktree.path}
            >
              {worktree.path}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
