import { useMemo, useState, useCallback, useEffect } from "react";
import { List } from "react-window";
import { AgentBrandIcon } from "../AgentIcon";
import { WorktreeSession } from "./WorktreeSidebar";

type SidebarAgentsListProps = {
  sessions: WorktreeSession[];
  projects: any[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  compactCards?: boolean;
  onSelectNextSession?: (direction: "up" | "down") => void;
  onSelectPrevSession?: (direction: "up" | "down") => void;
  isModalOpen?: boolean;
};

export function SidebarAgentsList({
  sessions,
  projects,
  onSelectSession,
  onDeleteSession,
  compactCards = false,
  onSelectNextSession,
  onSelectPrevSession,
  isModalOpen = false,
}: SidebarAgentsListProps) {
  const [filter, setFilter] = useState("");
  const [groupBy, setGroupBy] = useState<"state" | "project">("state");
  const [statusFilter, setStatusFilter] = useState<"all" | "blocked" | "working" | "idle">("all");
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  // Get project name for a session
  const getProjectName = useCallback(
    (projectPath: string) => {
      const proj = projects.find((p) => projectPath.startsWith(p.path));
      return proj?.name || "Unknown";
    },
    [projects]
  );

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(lowerFilter) ||
          s.branch.toLowerCase().includes(lowerFilter) ||
          s.agentName.toLowerCase().includes(lowerFilter) ||
          getProjectName(s.project_path).toLowerCase().includes(lowerFilter)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((s) => s.state === statusFilter);
    }
    return result;
  }, [sessions, filter, statusFilter, getProjectName]);

  // Group sessions
  const groupedSessions = useMemo(() => {
    if (groupBy === "project") {
      const groups: Record<string, WorktreeSession[]> = {};
      for (const session of filteredSessions) {
        const projectName = getProjectName(session.project_path);
        if (!groups[projectName]) groups[projectName] = [];
        groups[projectName].push(session);
      }
      return Object.entries(groups).map(([projectName, sessions]) => ({
        label: projectName,
        state: "project" as const,
        sessions,
      }));
    }

    // Group by state: blocked > working > idle
    const stateOrder: Array<"blocked" | "working" | "idle" | "unknown"> = [
      "blocked",
      "working",
      "idle",
      "unknown",
    ];
    const stateGroups: Record<string, WorktreeSession[]> = {
      blocked: [],
      working: [],
      idle: [],
      unknown: [],
    };

    for (const session of filteredSessions) {
      stateGroups[session.state].push(session);
    }

    return stateOrder
      .filter((state) => stateGroups[state].length > 0)
      .map((state) => ({
        label:
          state === "blocked"
            ? "Blocked"
            : state === "working"
            ? "Working"
            : state === "idle"
            ? "Idle"
            : "Unknown",
        state: state as "blocked" | "working" | "idle" | "unknown",
        sessions: stateGroups[state],
      }));
  }, [filteredSessions, groupBy, getProjectName]);

  // Virtualization: flatten grouped sessions into rows for react-window (500+ sessions)
  type AgentFlatRow =
    | { type: "group-header"; label: string; state: string; count: number }
    | { type: "session"; session: WorktreeSession };

  const agentFlatRows: AgentFlatRow[] = useMemo(() => {
    const rows: AgentFlatRow[] = [];
    for (const group of groupedSessions) {
      rows.push({ type: "group-header", label: group.label, state: group.state, count: group.sessions.length });
      for (const s of group.sessions) {
        rows.push({ type: "session", session: s });
      }
    }
    return rows;
  }, [groupedSessions]);

  const getAgentRowHeight = useCallback((index: number) => {
    const row = agentFlatRows[index];
    if (!row) return 40;
    if (row.type === "group-header") return 28;
    return compactCards ? 52 : 68;
  }, [agentFlatRows, compactCards]);

  const useAgentVirtualization = agentFlatRows.length > 30 || filteredSessions.length > 50;

  const AgentVirtualRow = ({ index, style, ariaAttributes }: { index: number; style: React.CSSProperties; ariaAttributes?: any }) => {
    const row = agentFlatRows[index];
    if (!row) return null;
    const rowStyle: React.CSSProperties = { ...style, left: 0, right: 0, width: "100%" };
    if (row.type === "group-header") {
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2">
          <div className="flex items-center gap-2 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-worktree-sidebar-foreground/50">
            {row.state !== "project" && (
              <span
                className={`inline-flex size-3 shrink-0 items-center justify-center ${
                  row.state === "blocked"
                    ? "bg-red-400/20 text-red-400"
                    : row.state === "working"
                    ? "bg-amber-400/20 text-amber-400"
                    : row.state === "idle"
                    ? "bg-emerald-400/20 text-emerald-400"
                    : "bg-neutral-700 text-neutral-400"
                } rounded`}
              />
            )}
            <span className="truncate">{row.label}</span>
            <span className="ml-auto rounded-full border border-worktree-sidebar-border/80 bg-worktree-sidebar-accent/50 px-1.5 py-0.25 text-[9px] font-mono tabular-nums text-worktree-sidebar-foreground/70">
              {row.count}
            </span>
          </div>
        </div>
      );
    }
    const session = row.session;
    return (
      <div style={rowStyle} {...ariaAttributes} className="px-2">
        <div
          onClick={(e) => {
            e.stopPropagation();
            const ctrlKey = e.ctrlKey || e.metaKey;
            if (ctrlKey) {
              setSelectedSessions((prev) => {
                const n = new Set(prev);
                if (n.has(session.id)) n.delete(session.id);
                else n.add(session.id);
                return n;
              });
              return;
            }
            onSelectSession(session.id);
            setSelectedSessions(new Set());
          }}
          className={`group relative ${compactCards ? "py-1.5 px-2" : "p-2.5"} rounded-lg text-xs cursor-pointer select-none transition-all ${
            session.active
              ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border shadow-xs"
              : "worktree-sidebar-card-hover text-worktree-sidebar-foreground/70 hover:text-worktree-sidebar-foreground"
          } ${focusedSessionId === session.id ? "border-indigo-500/50 ring-indigo-500/20" : ""} ${
            selectedSessions.has(session.id) ? "bg-indigo-500/20 select-none" : ""
          }`}
        >
          {session.active && <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />}
          <div className="flex items-center justify-between mb-1 pl-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <AgentBrandIcon agentId={session.agentName} size={13} />
              <span className="font-medium truncate text-[11px]">{session.title}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${getStateBadge(session.state)}`} title={`Herdr State: ${getStateLabel(session.state)}`} />
              <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition" aria-label="Delete session">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-worktree-sidebar-foreground/50 pl-1 font-mono">
            <span className="flex items-center gap-1 truncate">
              <svg className="w-2.5 h-2.5 text-worktree-sidebar-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><line x1="18" y1="3" x2="18" y2="15"></line><path d="M4 21h16"></path><path d="M8 3h8"></path></svg>
              {session.branch}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[9px] bg-worktree-sidebar-border/50 border border-worktree-sidebar-border px-1.5 py-0.2 rounded">{session.agentName}</span>
              <span className="text-[9px] text-worktree-sidebar-foreground/40">{getProjectName(session.project_path)}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  // State badge colors
  const getStateBadge = (state: WorktreeSession["state"]) => {
    switch (state) {
      case "working":
        return "bg-amber-400 animate-pulse";
      case "blocked":
        return "bg-red-400 ring-2 ring-red-500/30";
      case "idle":
        return "bg-emerald-400";
      default:
        return "bg-neutral-500";
    }
  };

  const getStateLabel = (state: WorktreeSession["state"]) => {
    switch (state) {
      case "working":
        return "Working";
      case "blocked":
        return "Blocked";
      case "idle":
        return "Idle";
      default:
        return "Unknown";
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto p-6 bg-worktree-sidebar">
        <div className="p-2 shrink-0">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter agents..."
            className="w-full bg-worktree-sidebar-accent/50 border border-worktree-sidebar-border rounded-md px-2.5 py-1 text-[11px] text-worktree-sidebar-foreground placeholder:text-worktree-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-worktree-sidebar-ring"
          />
        </div>
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="text-neutral-500 text-xs space-y-3 p-6">
            <svg
              className="w-12 h-12 mx-auto text-neutral-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="font-medium">No agent sessions</p>
            <p className="text-[11px]">Start an agent from a worktree to see it here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-worktree-sidebar">
      {/* Search Bar */}
      <div className="p-2 shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter agents..."
          className="w-full bg-worktree-sidebar-accent/50 border border-worktree-sidebar-border rounded-md px-2.5 py-1 text-[11px] text-worktree-sidebar-foreground placeholder:text-worktree-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-worktree-sidebar-ring"
        />
      </div>

      {/* Toolbar: Status Filter Pills + Group By Toggle */}
      <div className="px-2 pb-1.5 shrink-0 flex flex-col gap-1.5">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5" role="group" aria-label="Filter by state">
          {(
            [
              { value: "all", label: "All" },
              { value: "blocked", label: "Blocked" },
              { value: "working", label: "Working" },
              { value: "idle", label: "Idle" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition ${
                statusFilter === value
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-worktree-sidebar-foreground/50 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/50"
              }`}
              aria-pressed={statusFilter === value}
            >
              {value !== "all" && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    value === "working"
                      ? "bg-amber-400"
                      : value === "blocked"
                      ? "bg-red-400"
                      : "bg-emerald-400"
                  }`}
                />
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Group By Toggle */}
        <div className="flex items-center gap-1.5 text-[10px] text-worktree-sidebar-foreground/50">
          <span className="shrink-0">Group by:</span>
          <div className="flex items-center gap-0.5 bg-worktree-sidebar-accent/50 rounded-md p-0.5">
            <button
              onClick={() => setGroupBy("state")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                groupBy === "state"
                  ? "bg-worktree-sidebar text-worktree-sidebar-foreground shadow-xs"
                  : "text-worktree-sidebar-foreground/50 hover:text-worktree-sidebar-foreground"
              }`}
              aria-pressed={groupBy === "state"}
            >
              State
            </button>
            <button
              onClick={() => setGroupBy("project")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                groupBy === "project"
                  ? "bg-worktree-sidebar text-worktree-sidebar-foreground shadow-xs"
                  : "text-worktree-sidebar-foreground/50 hover:text-worktree-sidebar-foreground"
              }`}
              aria-pressed={groupBy === "project"}
            >
              Project
            </button>
          </div>
        </div>
      </div>

      {/* Session List — virtualized when >30 rows (500+ sessions) */}
      {useAgentVirtualization ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <List
            rowCount={agentFlatRows.length}
            rowHeight={getAgentRowHeight}
            rowComponent={AgentVirtualRow}
            // @ts-ignore
            rowProps={{}}
            style={{ height: "100%", width: "100%" }}
            className="py-2"
            overscanCount={8}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
          {groupedSessions.map((group) => (
            <div key={group.label} className="space-y-1">
              {/* Group Header */}
              <div className="flex items-center gap-2 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-worktree-sidebar-foreground/50">
                {group.state !== "project" && (
                  <span
                    className={`inline-flex size-3 shrink-0 items-center justify-center ${
                      group.state === "blocked"
                        ? "bg-red-400/20 text-red-400"
                        : group.state === "working"
                        ? "bg-amber-400/20 text-amber-400"
                        : group.state === "idle"
                        ? "bg-emerald-400/20 text-emerald-400"
                        : "bg-neutral-700 text-neutral-400"
                    } rounded`}
                  />
                )}
                <span className="truncate">{group.label}</span>
                <span className="ml-auto rounded-full border border-worktree-sidebar-border/80 bg-worktree-sidebar-accent/50 px-1.5 py-0.25 text-[9px] font-mono tabular-nums text-worktree-sidebar-foreground/70">
                  {group.sessions.length}
                </span>
              </div>

              {/* Session Cards */}
              {group.sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={(e) => {
                  e.stopPropagation();
                  const ctrlKey = e.ctrlKey || e.metaKey;
                  
                  if (ctrlKey) {
                    setSelectedSessions(prev => {
                      const n = new Set(prev);
                      if (n.has(session.id)) n.delete(session.id);
                      else n.add(session.id);
                      return n;
                    });
                    return;
                  }
                  
                  onSelectSession(session.id);
                  setSelectedSessions(new Set());
                }}
                  className={`group relative ${compactCards ? "py-1.5 px-2" : "p-2.5"} rounded-lg text-xs cursor-pointer select-none transition-all ${
                    session.active
                      ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border shadow-xs"
                      : "worktree-sidebar-card-hover text-worktree-sidebar-foreground/70 hover:text-worktree-sidebar-foreground"
                  } ${
                    focusedSessionId === session.id
                      ? "border-indigo-500/50 ring-indigo-500/20"
                      : ""
                  } ${
                    selectedSessions.has(session.id)
                      ? "bg-indigo-500/20 select-none"
                      : ""
                  }`}
                >
                  {session.active && (
                    <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />
                  )}

                  <div className="flex items-center justify-between mb-1 pl-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AgentBrandIcon agentId={session.agentName} size={13} />
                      <span className="font-medium truncate text-[11px]">
                        {session.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${getStateBadge(session.state)}`}
                        title={`Herdr State: ${getStateLabel(session.state)}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"
                        aria-label="Delete session"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-worktree-sidebar-foreground/50 pl-1 font-mono">
                    <span className="flex items-center gap-1 truncate">
                      <svg className="w-2.5 h-2.5 text-worktree-sidebar-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="6" y1="3" x2="6" y2="15"></line>
                        <line x1="18" y1="3" x2="18" y2="15"></line>
                        <path d="M4 21h16"></path>
                        <path d="M8 3h8"></path>
                      </svg>
                      {session.branch}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-[9px] bg-worktree-sidebar-border/50 border border-worktree-sidebar-border px-1.5 py-0.2 rounded">
                        {session.agentName}
                      </span>
                      <span className="text-[9px] text-worktree-sidebar-foreground/40">
                        {getProjectName(session.project_path)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Footer with batch delete — only for explicit multi-select */}
      {selectedSessions.size > 1 && (
        <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-2 flex items-center justify-between text-[11px] shrink-0">
          <span className="text-red-300 font-medium">{selectedSessions.size} selected</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedSessions(new Set())}
              className="px-2 py-1 rounded text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-foreground transition cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => {
                selectedSessions.forEach((id) => onDeleteSession(id));
                setSelectedSessions(new Set());
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition cursor-pointer"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || Boolean(target.isContentEditable);

      if (isInputFocused) return;

      // Flatten grouped sessions for navigation
      const allSessions = groupedSessions.flatMap((g) => g.sessions);

      // Escape: clear focus + clear batch selection
      if (e.key === "Escape") {
        e.preventDefault();
        setFocusedSessionId(null);
        setSelectedSessions(new Set());
        return;
      }

      // Enter: activate focused session
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedSessionId) {
          onSelectSession(focusedSessionId);
        }
        return;
      }

      // F2: Rename focused session
      if (e.key === "F2" && focusedSessionId) {
        e.preventDefault();
        const session = sessions.find((s) => s.id === focusedSessionId);
        if (session) {
          const newTitle = window.prompt("Enter new session title:", session.title);
          if (newTitle && newTitle.trim()) {
            // The actual rename is handled by parent via onSessionContextMenu
            // We just update local focus state here; parent handles persistence
          }
        }
        return;
      }

      // Arrow navigation
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const direction = e.key === "ArrowDown" ? "down" : "up";
        const currentFocused = focusedSessionId;
        
        if (!currentFocused) {
          // No focus - start with first item
          const first = allSessions[0];
          if (first) {
            setFocusedSessionId(first.id);
            onSelectNextSession?.(direction);
          }
          return;
        }

        const currentIdx = allSessions.findIndex((s) => s.id === currentFocused);
        if (currentIdx === -1) return;

        const nextIdx = direction === "down" ? currentIdx + 1 : currentIdx - 1;
        if (nextIdx < 0 || nextIdx >= allSessions.length) return;

        const next = allSessions[nextIdx];
        setFocusedSessionId(next.id);
        onSelectNextSession?.(direction);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessions, groupedSessions, onSelectNextSession, onSelectPrevSession, onSelectSession, isModalOpen, focusedSessionId]);
}