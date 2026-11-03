import { useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { List } from "react-window";
import { invoke } from "@tauri-apps/api/core";
import { useShallow } from "zustand/react/shallow";

import { AgentBrandIcon } from "../AgentIcon";
import { CompactAgentRow } from "./CompactAgentRow";
import { AgentsThreadOptionsMenu } from "./AgentsThreadOptionsMenu";
import { WorktreeSession } from "./WorktreeSidebar";
import type { AgentsGroupBy, AgentsReadFilter, HydraProject } from "./types";
import type { AgentRow } from "./worktree-card-agent-summary";
import {
  buildAgentsThreads,
  filterAgentsThreads,
  groupAgentsThreads,
  planClearCompletedThreads,
  type AgentsThread,
  type AgentsThreadState,
} from "./agents-thread-model";
import { useAppStore } from "../../store";
import { useNow } from "../../hooks/use-now";

const EMPTY_UNREAD_RECORD: Record<string, never> = Object.freeze({})

type AgentsThreadsStore = AgentsThreadState & {
  acknowledgedAgentsByPaneKey: Record<string, number>;
  unreadTerminalPanes: Record<string, unknown>;
  unreadAgentCompletionPanes: Record<string, unknown>;
  manuallyUnreadTurnsByPaneKey: Record<string, number>;
  activityClearedAtByPaneKey: Record<string, number>;
};

type AgentFlatRow =
  | { type: "group-header"; label: string; state?: string; count: number }
  | { type: "thread"; thread: AgentsThread };

export type SidebarAgentsListProps = {
  sessions: WorktreeSession[];
  projects: HydraProject[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  compactCards?: boolean;
  onSelectNextSession?: (direction: "up" | "down") => void;
  onSelectPrevSession?: (direction: "up" | "down") => void;
  isModalOpen?: boolean;
  /** Shell-owned (App persists in the `ui.sidebar` blob). */
  groupBy: AgentsGroupBy;
  onGroupByChange: (groupBy: AgentsGroupBy) => void;
  readFilter: AgentsReadFilter;
  onReadFilterChange: (filter: AgentsReadFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** SidebarHeader slot the options menu portals into (Orca `optionsTarget`). */
  optionsTarget?: HTMLElement | null;
  /** D03B contract: omitted => internal state (preserves pre-lift behaviour). */
  focusedSessionId?: string | null;
  onFocusedSessionIdChange?: (id: string | null) => void;
  selectedSessionIds?: ReadonlySet<string>;
  onSelectedSessionIdsChange?: (ids: ReadonlySet<string>) => void;
  scrollTopRef?: React.MutableRefObject<number>;
};

function toAgentRow(thread: AgentsThread): AgentRow {
  return {
    paneKey: thread.paneKey,
    entry: thread.entry,
    agentType: thread.agentType,
    tab: thread.tab,
    rowSource: thread.rowSource,
    state: thread.state,
    startedAt: thread.startedAt,
    prompt: thread.title,
    terminalTitle: thread.entry.terminalTitle ?? thread.tab.title,
    displayAgent: thread.agentType,
    sessionId: thread.sessionId,
  };
}

function threadStateLabel(state: string): string {
  switch (state) {
    case "working":
      return "Working";
    case "blocked":
      return "Blocked";
    case "waiting":
      return "Waiting";
    case "done":
      return "Done";
    case "idle":
      return "Idle";
    case "unverifiable":
      return "Unverifiable";
    default:
      return "Unknown";
  }
}

function threadStateBadgeClass(state: string): string {
  switch (state) {
    case "working":
      return "bg-amber-400 animate-pulse";
    case "blocked":
      return "bg-red-400 ring-2 ring-red-500/30";
    case "waiting":
      return "bg-orange-400 animate-pulse";
    case "done":
      return "bg-blue-400";
    case "idle":
      return "bg-emerald-400";
    default:
      return "bg-neutral-500";
  }
}

export function SidebarAgentsList({
  sessions,
  projects,
  onSelectSession,
  onDeleteSession,
  compactCards = false,
  onSelectNextSession,
  onSelectPrevSession,
  isModalOpen = false,
  groupBy,
  onGroupByChange,
  readFilter,
  onReadFilterChange,
  query,
  onQueryChange,
  optionsTarget,
  focusedSessionId: controlledFocusedSessionId,
  onFocusedSessionIdChange,
  selectedSessionIds: controlledSelectedSessionIds,
  onSelectedSessionIdsChange,
  scrollTopRef,
}: SidebarAgentsListProps) {
  const now = useNow(30_000);
  const threadState = useAppStore(
    useShallow((s) => {
      const view = s as unknown as AgentsThreadsStore
      return {
      tabsByWorktree: view.tabsByWorktree,
      agentStatusByPaneKey: view.agentStatusByPaneKey,
      retainedAgentsByPaneKey: view.retainedAgentsByPaneKey,
      migrationUnsupportedByPtyId: view.migrationUnsupportedByPtyId,
      runtimeAgentOrchestrationByPaneKey: view.runtimeAgentOrchestrationByPaneKey,
      terminalLayoutsByTabId: view.terminalLayoutsByTabId,
      ptyIdsByTabId: view.ptyIdsByTabId,
      acknowledgedAgentsByPaneKey: view.acknowledgedAgentsByPaneKey ?? EMPTY_UNREAD_RECORD,
      unreadTerminalPanes: view.unreadTerminalPanes ?? EMPTY_UNREAD_RECORD,
      unreadAgentCompletionPanes: view.unreadAgentCompletionPanes ?? EMPTY_UNREAD_RECORD,
      manuallyUnreadTurnsByPaneKey: view.manuallyUnreadTurnsByPaneKey ?? EMPTY_UNREAD_RECORD,
      activityClearedAtByPaneKey: view.activityClearedAtByPaneKey ?? EMPTY_UNREAD_RECORD,
      }
    })
  );

  // Persisted Agents-view prefs: single writer is `uiPrefsBridge` via these setters.
  // Why the boundary cast: the composed store's UI slice is still an auto-stub (`any`),
  // so `AppState` does not declare these keys even though the runtime slice owns them.
  type AgentsPrefsSlice = {
    agentsCompactMode?: boolean
    setAgentsCompactMode: (value: boolean) => void
    agentsShowSearch?: boolean
    setAgentsShowSearch: (value: boolean) => void
    agentsShowChildAgents?: boolean
    setAgentsShowChildAgents: (value: boolean) => void
    acknowledgeAgents: (paneKeys: string[]) => void
    clearTerminalPaneUnread: (paneKey: string) => void
    applyActivityClearedAt: (patch: Record<string, number | null>) => void
    dismissRetainedAgents: (paneKeys: readonly string[]) => void
  }
  const prefs = useAppStore((s) => s as unknown as AgentsPrefsSlice)
  const compactMode = prefs.agentsCompactMode !== false
  const setCompactMode = prefs.setAgentsCompactMode
  const showSearch = prefs.agentsShowSearch !== false
  const setShowSearch = prefs.setAgentsShowSearch
  const showChildAgents = prefs.agentsShowChildAgents === true
  const setShowChildAgents = prefs.setAgentsShowChildAgents
  const acknowledgeAgents = prefs.acknowledgeAgents
  const clearPaneUnread = prefs.clearTerminalPaneUnread
  const applyActivityClearedAt = prefs.applyActivityClearedAt
  const dismissRetainedAgents = prefs.dismissRetainedAgents

  const [internalFocusedSessionId, setInternalFocusedSessionId] = useState<string | null>(null);
  const [internalSelectedSessionIds, setInternalSelectedSessionIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const focusedSessionId =
    controlledFocusedSessionId !== undefined
      ? controlledFocusedSessionId
      : internalFocusedSessionId;
  const setFocusedSessionId = onFocusedSessionIdChange ?? setInternalFocusedSessionId;
  const selectedSessions =
    controlledSelectedSessionIds !== undefined
      ? controlledSelectedSessionIds
      : internalSelectedSessionIds;
  const setSelectedSessions = onSelectedSessionIdsChange ?? setInternalSelectedSessionIds;

  const [selectedPaneKey, setSelectedPaneKey] = useState<string | null>(null);
  const filterInputRef = useRef<HTMLInputElement | null>(null);

  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const virtualListRef = useRef<{
    element: HTMLDivElement | null;
    scrollToRow: (config: {
      align?: "auto" | "center" | "end" | "smart" | "start";
      behavior?: "auto" | "instant" | "smooth";
      index: number;
    }) => void;
  } | null>(null);

  const handleListScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (scrollTopRef) {
        scrollTopRef.current = event.currentTarget.scrollTop;
      }
    },
    [scrollTopRef]
  );

  const threads = useMemo(
    () => buildAgentsThreads({ state: threadState, sessions, projects, now }),
    [threadState, sessions, projects, now]
  );
  const visibleThreads = useMemo(
    () => filterAgentsThreads(threads, { query, readFilter, groupBy, showChildAgents }),
    [threads, query, readFilter, groupBy, showChildAgents]
  );
  const groupedThreads = useMemo(
    () => groupAgentsThreads(visibleThreads, groupBy),
    [visibleThreads, groupBy]
  );

  const hasUnreadThreads = useMemo(() => threads.some((thread) => thread.unread), [threads]);
  const hasCompletedThreads = useMemo(
    () => visibleThreads.some((thread) => thread.state === "done" || thread.isRetained),
    [visibleThreads]
  );

  // Orca parity: a selected pane whose row disappeared must not stay a ghost selection.
  const selectedPaneKeyIsLive = useMemo(
    () =>
      selectedPaneKey !== null &&
      threads.some((thread) => thread.paneKey === selectedPaneKey && thread.isLive),
    [selectedPaneKey, threads]
  );
  useEffect(() => {
    if (!selectedPaneKeyIsLive) {
      setSelectedPaneKey(null);
    }
  }, [selectedPaneKeyIsLive]);

  const handleShowSearchChange = useCallback(
    (visible: boolean) => {
      setShowSearch(visible);
      if (!visible) {
        onQueryChange("");
        filterInputRef.current?.blur();
        return;
      }
      // Why not autoFocus: the body mounts in the middle of a navigation click; the
      // input only exists after this frame, so focus waits for the newly visible node.
      requestAnimationFrame(() => filterInputRef.current?.focus());
    },
    [setShowSearch, onQueryChange]
  );

  const handleMarkAllThreadsRead = useCallback(() => {
    const paneKeys = threads.map((thread) => thread.paneKey);
    acknowledgeAgents(paneKeys);
    for (const paneKey of paneKeys) {
      clearPaneUnread(paneKey);
    }
  }, [threads, acknowledgeAgents, clearPaneUnread]);

  const handleClearCompleted = useCallback(() => {
    const plan = planClearCompletedThreads(visibleThreads, threadState, now);
    if (Object.keys(plan.cutoffs).length > 0) {
      applyActivityClearedAt(plan.cutoffs);
    }
    if (plan.retainedPaneKeys.length > 0) {
      dismissRetainedAgents(plan.retainedPaneKeys);
    }
  }, [visibleThreads, threadState, now, applyActivityClearedAt, dismissRetainedAgents]);

  const activateThread = useCallback(
    (thread: AgentsThread) => {
      // Why inert: a closed thread stays listed; its pane/session is gone, so the
      // reveal must no-op instead of selecting an unrelated workspace.
      if (!thread.sessionId) {
        return;
      }
      onSelectSession(thread.sessionId);
      setSelectedPaneKey(thread.paneKey);
      setSelectedSessions(new Set());
    },
    [onSelectSession, setSelectedSessions]
  );

  const toggleThreadSelection = useCallback(
    (thread: AgentsThread) => {
      if (!thread.sessionId) {
        return;
      }
      const next = new Set(selectedSessions);
      if (next.has(thread.sessionId)) {
        next.delete(thread.sessionId);
      } else {
        next.add(thread.sessionId);
      }
      setSelectedSessions(next);
    },
    [selectedSessions, setSelectedSessions]
  );

  const agentFlatRows: AgentFlatRow[] = useMemo(() => {
    const rows: AgentFlatRow[] = [];
    for (const group of groupedThreads) {
      rows.push({
        type: "group-header",
        label: group.label,
        state: group.state,
        count: group.threads.length,
      });
      for (const thread of group.threads) {
        rows.push({ type: "thread", thread });
      }
    }
    return rows;
  }, [groupedThreads]);

  const getAgentRowHeight = useCallback(
    (index: number) => {
      const row = agentFlatRows[index];
      if (!row) return 40;
      if (row.type === "group-header") return 28;
      return compactMode ? 26 : 52;
    },
    [agentFlatRows, compactMode]
  );
  const useAgentVirtualization = agentFlatRows.length > 30 || visibleThreads.length > 50;

  useLayoutEffect(() => {
    if (!scrollTopRef) {
      return;
    }
    const target = useAgentVirtualization ? virtualListRef.current?.element : listScrollRef.current;
    if (target) {
      target.scrollTop = scrollTopRef.current;
    }
  }, [scrollTopRef, useAgentVirtualization]);

  // Keyboard navigation over the thread rows (Orca arrow/Enter/Escape model).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        Boolean(target.isContentEditable);
      if (isInputFocused) return;

      const ordered = visibleThreads.filter((thread) => thread.sessionId);
      const focusedThread =
        focusedSessionId !== null
          ? ordered.find((thread) => thread.sessionId === focusedSessionId)
          : undefined;

      if (e.key === "Escape") {
        e.preventDefault();
        setFocusedSessionId(null);
        setSelectedSessions(new Set());
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedThread) {
          activateThread(focusedThread);
        }
        return;
      }
      if (e.key === "F2" && focusedSessionId) {
        e.preventDefault();
        const session = sessions.find((candidate) => candidate.id === focusedSessionId);
        if (!session) return;
        const rename = window.prompt("Rename session", session.title);
        if (rename?.trim()) {
          invoke("save_session_record", {
            record: {
              id: session.id,
              project_path: session.project_path,
              title: rename.trim(),
              branch: session.branch,
              agent_name: session.agentName,
              executable: session.executable,
              created_at: Date.now(),
              updated_at: Date.now(),
            },
          }).catch(console.error);
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const direction = e.key === "ArrowDown" ? 1 : -1;
        const currentIndex = focusedThread ? ordered.indexOf(focusedThread) : -1;
        const next =
          currentIndex === -1
            ? ordered[0]
            : ordered[currentIndex + direction];
        if (!next?.sessionId) return;
        setFocusedSessionId(next.sessionId);
        (direction === 1 ? onSelectNextSession : onSelectPrevSession)?.(
          direction === 1 ? "down" : "up"
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    visibleThreads,
    focusedSessionId,
    sessions,
    isModalOpen,
    activateThread,
    setFocusedSessionId,
    setSelectedSessions,
    onSelectNextSession,
    onSelectPrevSession,
  ]);

  const renderThreadRow = (thread: AgentsThread): React.JSX.Element => {
    const isInert = thread.sessionId === undefined;
    const isFocused = thread.sessionId !== undefined && thread.sessionId === focusedSessionId;
    const isMultiselected =
      thread.sessionId !== undefined && selectedSessions.has(thread.sessionId);
    const onClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        toggleThreadSelection(thread);
        return;
      }
      activateThread(thread);
    };

    if (compactMode) {
      return (
        <div
          key={thread.paneKey}
          className={`px-2 ${isInert ? "opacity-60" : ""}`}
          aria-current={selectedPaneKey === thread.paneKey ? "true" : undefined}
          aria-disabled={isInert || undefined}
          data-inert={isInert ? "true" : undefined}
        >
          <CompactAgentRow
            agent={toAgentRow(thread)}
            now={now}
            onActivate={() => activateThread(thread)}
            isFocusedPane={isFocused}
          />
        </div>
      );
    }

    return (
      <div key={thread.paneKey} className="px-2">
        <div
          onClick={onClick}
          aria-current={selectedPaneKey === thread.paneKey ? "true" : undefined}
          aria-disabled={isInert || undefined}
          data-inert={isInert ? "true" : undefined}
          className={`group relative rounded-lg text-xs select-none transition-all ${compactCards ? "px-2 py-1.5" : "p-2.5"} ${
            isInert
              ? "cursor-default opacity-60"
              : "cursor-pointer worktree-sidebar-card-hover text-worktree-sidebar-foreground/70 hover:text-worktree-sidebar-foreground"
          } ${
            isFocused ? "border border-indigo-500/50 ring-1 ring-indigo-500/20" : ""
          } ${isMultiselected ? "bg-indigo-500/20" : ""}`}
        >
          <div className="mb-1 flex items-center justify-between gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <AgentBrandIcon agentId={thread.agentType} size={13} />
              <span className="truncate text-[11px] font-medium">{thread.title}</span>
              {thread.unread && (
                <span className="size-1.5 shrink-0 rounded-full bg-sky-400" aria-label="Unread" />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`size-2 shrink-0 rounded-full ${threadStateBadgeClass(thread.state)}`}
                title={threadStateLabel(thread.state)}
              />
              {thread.sessionId && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteSession(thread.sessionId as string);
                  }}
                  className="rounded p-0.5 text-neutral-500 opacity-0 transition hover:bg-neutral-800 hover:text-red-400 group-hover:opacity-100"
                  aria-label="Delete session"
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-1 pl-1 font-mono text-[10px] text-worktree-sidebar-foreground/50">
            <span className="truncate">{thread.branch || thread.worktreePath}</span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="rounded border border-worktree-sidebar-border bg-worktree-sidebar-border/50 px-1.5 py-0.5 text-[9px]">
                {thread.agentType}
              </span>
              <span className="text-[9px] text-worktree-sidebar-foreground/40">
                {thread.projectName}
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const AgentVirtualRow = ({
    index,
    style,
    ariaAttributes,
  }: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes?: Record<string, unknown>;
  }) => {
    const row = agentFlatRows[index];
    if (!row) return null;
    const rowStyle: React.CSSProperties = { ...style, left: 0, right: 0, width: "100%" };
    if (row.type === "group-header") {
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2">
          <div className="flex items-center gap-2 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-worktree-sidebar-foreground/50">
            {row.state !== undefined && (
              <span className={`inline-flex size-3 shrink-0 items-center justify-center ${threadStateGroupClass(row.state)} rounded`} />
            )}
            <span className="truncate">{row.label}</span>
            <span className="ml-auto rounded-full border border-worktree-sidebar-border/80 bg-worktree-sidebar-accent/50 px-1.5 text-[9px] font-mono tabular-nums text-worktree-sidebar-foreground/70">
              {row.count}
            </span>
          </div>
        </div>
      );
    }
    return (
      <div style={rowStyle} {...ariaAttributes}>
        {renderThreadRow(row.thread)}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-worktree-sidebar">
      {showSearch ? (
        <div className="shrink-0 p-2">
          <input
            ref={filterInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                handleShowSearchChange(false);
              }
            }}
            placeholder="Filter agents..."
            aria-label="Search agents"
            className="w-full rounded-md border border-worktree-sidebar-border bg-worktree-sidebar-accent/50 px-2.5 py-1 text-[11px] text-worktree-sidebar-foreground placeholder:text-worktree-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-worktree-sidebar-ring"
          />
        </div>
      ) : null}

      {visibleThreads.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-center">
          <div className="space-y-3 p-6 text-xs text-neutral-500">
            <svg className="mx-auto size-12 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="font-medium">No agent threads</p>
            <p className="text-[11px]">Start an agent from a worktree to see it here.</p>
          </div>
        </div>
      ) : useAgentVirtualization ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <List
            listRef={virtualListRef}
            rowCount={agentFlatRows.length}
            rowHeight={getAgentRowHeight}
            rowComponent={AgentVirtualRow}
            // @ts-ignore react-window rowProps typing is wider than this row shape
            rowProps={{}}
            style={{ height: "100%", width: "100%" }}
            className="py-2"
            overscanCount={8}
            onScroll={handleListScroll}
          />
        </div>
      ) : (
        <div
          ref={listScrollRef}
          onScroll={handleListScroll}
          className="flex-1 space-y-2 overflow-y-auto px-2 pb-2"
        >
          {groupedThreads.map((group) => (
            <div key={group.key} className="space-y-1">
              <div className="flex items-center gap-2 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-worktree-sidebar-foreground/50">
                {group.state !== undefined && (
                  <span className={`inline-flex size-3 shrink-0 items-center justify-center ${threadStateGroupClass(group.state)} rounded`} />
                )}
                <span className="truncate">{group.label}</span>
                <span className="ml-auto rounded-full border border-worktree-sidebar-border/80 bg-worktree-sidebar-accent/50 px-1.5 text-[9px] font-mono tabular-nums text-worktree-sidebar-foreground/70">
                  {group.threads.length}
                </span>
              </div>
              {group.threads.map((thread) => renderThreadRow(thread))}
            </div>
          ))}
        </div>
      )}

      {selectedSessions.size > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px]">
          <span className="font-medium text-red-300">{selectedSessions.size} selected</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedSessions(new Set())}
              className="cursor-pointer rounded px-2 py-1 text-worktree-sidebar-foreground/60 transition hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-foreground"
            >
              Clear
            </button>
            <button
              onClick={() => {
                selectedSessions.forEach((id) => onDeleteSession(id));
                setSelectedSessions(new Set());
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-red-400 transition hover:bg-red-500/25"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {optionsTarget
        ? createPortal(
            <AgentsThreadOptionsMenu
              groupBy={groupBy}
              onGroupByChange={onGroupByChange}
              compactMode={compactMode}
              onCompactModeChange={setCompactMode}
              showChildAgents={showChildAgents}
              onShowChildAgentsChange={setShowChildAgents}
              showSearch={showSearch}
              onShowSearchChange={handleShowSearchChange}
              unreadOnly={readFilter === "unread"}
              onUnreadOnlyChange={(unreadOnly) =>
                onReadFilterChange(unreadOnly ? "unread" : "all")
              }
              hasUnreadThreads={hasUnreadThreads}
              hasCompletedThreads={hasCompletedThreads}
              onMarkAllThreadsRead={handleMarkAllThreadsRead}
              onClearCompleted={handleClearCompleted}
            />,
            optionsTarget
          )
        : null}
    </div>
  );
}

function threadStateGroupClass(state?: string): string {
  switch (state) {
    case "blocked":
      return "bg-red-400/20 text-red-400";
    case "waiting":
      return "bg-orange-400/20 text-orange-400";
    case "working":
      return "bg-amber-400/20 text-amber-400";
    case "done":
      return "bg-blue-400/20 text-blue-400";
    case "idle":
      return "bg-emerald-400/20 text-emerald-400";
    default:
      return "bg-neutral-700 text-neutral-400";
  }
}

