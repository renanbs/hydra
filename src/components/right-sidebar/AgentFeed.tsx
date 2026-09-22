import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Bot, Zap, Clock3, Terminal, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export type AgentFeedEvent = {
  id: string;
  ts: number;
  agentName: string;
  sessionId: string;
  state: "working" | "blocked" | "idle" | "unknown" | "tool" | "completed";
  snippet: string;
  toolName?: string;
};

type Props = {
  activeSessionId?: string | null;
  className?: string;
};

function stateBadge(state: string) {
  const s = state.toLowerCase();
  if (s === "working") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (s === "blocked") return "bg-red-500/15 text-red-400 border-red-500/30 ring-1 ring-red-500/20";
  if (s === "idle") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s === "tool") return "bg-sky-500/15 text-sky-400 border-sky-500/30";
  if (s === "completed") return "bg-emerald-600/15 text-emerald-300 border-emerald-600/30";
  return "bg-neutral-800 text-neutral-400 border-neutral-700";
}

function stateDot(state: string) {
  const s = state.toLowerCase();
  if (s === "working") return "bg-amber-400 animate-pulse";
  if (s === "blocked") return "bg-red-400 ring-2 ring-red-500/30";
  if (s === "idle") return "bg-emerald-400";
  if (s === "tool") return "bg-sky-400 animate-pulse";
  if (s === "completed") return "bg-emerald-400";
  return "bg-neutral-500";
}

function formatTs(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return String(ts);
  }
}

export function AgentFeed({ activeSessionId }: Props) {
  const [events, setEvents] = useState<AgentFeedEvent[]>(() => {
    // seed with a welcome event so feed is not empty before any real event
    return [
      {
        id: "feed_welcome",
        ts: Date.now(),
        agentName: "hydra",
        sessionId: activeSessionId ?? "—",
        state: "idle",
        snippet: "Agent feed live — listening for agent:state, tool:approval:request, session:created, terminal:output",
      },
    ];
  });
  const [filter, setFilter] = useState<"all" | "working" | "blocked" | "tool">("all");
  const pollRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const pushEvent = useCallback((ev: AgentFeedEvent) => {
    setEvents((prev) => {
      // de-dupe by id+snippet quick
      if (prev.some((p) => p.id === ev.id)) return prev;
      const next = [ev, ...prev].slice(0, 80);
      return next;
    });
  }, []);

  // Tauri event listeners — P0 spec: agent:state, tool:request, session:created, tool:approval:request
  useEffect(() => {
    let unlisteners: Array<() => void> = [];
    let cancelled = false;

    const setup = async () => {
      const tryListen = async (event: string, handler: (payload: unknown) => void) => {
        try {
          const un = await listen<unknown>(event, (e) => handler(e.payload));
          if (!cancelled) unlisteners.push(un);
          else un();
        } catch (err) {
          // ignore if Tauri event not available in browser preview
          void err;
        }
      };

      await tryListen("agent:state", (payload: unknown) => {
        const p = payload as Record<string, unknown>;
        const state = String(p?.state ?? p?.agent_state ?? "unknown").toLowerCase();
        const sessionId = String(p?.session_id ?? p?.sessionId ?? activeSessionId ?? "—");
        const agentName = String(p?.agent_name ?? p?.agentName ?? p?.executable ?? "agent");
        const snippet = String(p?.snippet ?? p?.output ?? p?.text ?? "").slice(0, 220) || `state → ${state}`;
        pushEvent({
          id: `agent_state_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ts: Date.now(),
          agentName,
          sessionId,
          state: (state as AgentFeedEvent["state"]) ?? "unknown",
          snippet,
        });
      });

      await tryListen("tool:approval:request", (payload: unknown) => {
        const p = payload as Record<string, unknown>;
        const toolName = String(p?.tool_name ?? p?.toolName ?? "tool");
        const command = String(p?.command ?? p?.cmd ?? "").slice(0, 200);
        const sessionId = String(p?.session_id ?? p?.sessionId ?? "—");
        const agentName = String(p?.agent_name ?? toolName);
        pushEvent({
          id: (p?.id as string) ?? `tool_req_${Date.now()}`,
          ts: Number(p?.created_at ?? Date.now()),
          agentName,
          sessionId,
          state: "tool",
          snippet: command ? `${toolName}: ${command}` : `${toolName} approval requested`,
          toolName,
        });
      });

      await tryListen("tool_approval:request", (payload: unknown) => {
        const p = payload as Record<string, unknown>;
        const toolName = String(p?.tool_name ?? "tool");
        const command = String(p?.command ?? "").slice(0, 200);
        const sessionId = String(p?.session_id ?? "—");
        pushEvent({
          id: (p?.id as string) ?? `tool_req2_${Date.now()}`,
          ts: Number(p?.created_at ?? Date.now()),
          agentName: toolName,
          sessionId,
          state: "tool",
          snippet: command ? `${toolName}: ${command}` : `${toolName} approval requested`,
          toolName,
        });
      });

      await tryListen("tool:request", (payload: unknown) => {
        const p = payload as Record<string, unknown>;
        const toolName = String(p?.tool_name ?? p?.toolName ?? "tool");
        const snippet = String(p?.command ?? p?.prompt ?? "").slice(0, 220) || "tool request";
        const sessionId = String(p?.session_id ?? "—");
        pushEvent({
          id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ts: Date.now(),
          agentName: toolName,
          sessionId,
          state: "tool",
          snippet,
          toolName,
        });
      });

      await tryListen("session:created", (payload: unknown) => {
        const p = payload as Record<string, unknown>;
        const sessionId = String(p?.session_id ?? p?.id ?? "—");
        const agentName = String(p?.agent_name ?? p?.executable ?? "session");
        pushEvent({
          id: `sess_${Date.now()}`,
          ts: Date.now(),
          agentName,
          sessionId,
          state: "idle",
          snippet: `session created: ${sessionId}`,
        });
      });

      await tryListen("tool_approval:resolved", (payload: unknown) => {
        const p = payload as Record<string, unknown>;
        const status = String(p?.status ?? "resolved");
        const toolName = String(p?.tool_name ?? "tool");
        const sessionId = String(p?.session_id ?? "—");
        pushEvent({
          id: `resolved_${Date.now()}`,
          ts: Date.now(),
          agentName: toolName,
          sessionId,
          state: status === "approved" ? "completed" : status === "rejected" ? "blocked" : "tool",
          snippet: `${toolName} ${status}`,
          toolName,
        });
      });
      await tryListen("tool:approval:resolved", (payload: unknown) => {
        const p = payload as Record<string, unknown>;
        const status = String(p?.status ?? "resolved");
        const toolName = String(p?.tool_name ?? "tool");
        const sessionId = String(p?.session_id ?? "—");
        pushEvent({
          id: `resolved2_${Date.now()}`,
          ts: Date.now(),
          agentName: toolName,
          sessionId,
          state: status === "approved" ? "completed" : "blocked",
          snippet: `${toolName} ${status}`,
          toolName,
        });
      });
    };

    void setup();

    return () => {
      cancelled = true;
      for (const u of unlisteners) try { u(); } catch {}
      unlisteners = [];
    };
  }, [pushEvent, activeSessionId]);

  // Polling fallback — Herdr state engine + tool approvals + folded logs snippet
  useEffect(() => {
    let lastState: string | null = null;
    let lastSnippet = "";

    const poll = async () => {
      // 1) active session state
      if (activeSessionId) {
        try {
          const state = await invoke<string>("check_agent_state", { sessionId: activeSessionId });
          if (state && state !== lastState) {
            lastState = state;
            let snippet = "";
            try {
              const snap = await invoke<{ session_id: string; formatted: string; clean_text: string }>("get_terminal_snapshot", {
                sessionId: activeSessionId,
              });
              // last non-empty line as snippet
              const lines = snap.clean_text.split("\n").map((l) => l.trim()).filter(Boolean);
              snippet = lines.slice(-2).join(" · ").slice(0, 220) || state;
            } catch {
              snippet = `state → ${state}`;
            }
            if (snippet !== lastSnippet || state === "blocked" || state === "working") {
              lastSnippet = snippet;
              // fetch agent name? try sessions? fallback to activeSessionId
              pushEvent({
                id: `poll_state_${Date.now()}`,
                ts: Date.now(),
                agentName: activeSessionId.slice(0, 12),
                sessionId: activeSessionId,
                state: state as AgentFeedEvent["state"],
                snippet,
              });
            }
          }
        } catch {}
      }

      // 2) tool approvals as feed events (recent)
      try {
        const approvals = await invoke<Array<{ id: string; session_id: string; tool_name: string; command: string; status: string; created_at: number }>>(
          "list_tool_approvals",
          activeSessionId ? { sessionId: activeSessionId, session_id: activeSessionId } as unknown as Record<string, unknown> : {}
        );
        if (approvals && approvals.length > 0) {
          // push only pending or recent 3 as tool events, but de-dupe will handle
          for (const a of approvals.slice(0, 3)) {
            const existing = events.some((e) => e.id === a.id);
            if (!existing && a.status === "pending") {
              pushEvent({
                id: a.id,
                ts: a.created_at < 1e12 ? a.created_at * 1000 : a.created_at,
                agentName: a.tool_name,
                sessionId: a.session_id,
                state: "tool",
                snippet: a.command ? `${a.tool_name}: ${a.command.slice(0, 180)}` : `${a.tool_name} approval`,
                toolName: a.tool_name,
              });
            }
          }
        }
      } catch {}
    };

    poll();
    const id = window.setInterval(poll, 1500);
    pollRef.current = id as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, pushEvent]);

  const filtered = filter === "all" ? events : events.filter((e) => e.state === filter || (filter === "tool" && e.state === "tool"));

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* feed header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border bg-sidebar shrink-0">
        <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-[11px] font-semibold tracking-wide">Agent Feed</span>
        <span className="text-[10px] font-mono text-muted-foreground">· {events.length} events</span>
        {activeSessionId ? (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground hidden sm:inline truncate max-w-[120px]" title={activeSessionId}>
            {activeSessionId.slice(0, 18)}
          </span>
        ) : (
          <span className="ml-auto text-[10px] text-muted-foreground">no active session</span>
        )}
        <button
          onClick={() => setEvents((prev) => prev.slice(0, 1))}
          title="Clear feed (keep welcome)"
          className="ml-1 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition"
        >
          <Clock3 className="w-3 h-3" />
        </button>
      </div>

      {/* filter chips */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/60 bg-sidebar shrink-0">
        {(["all", "working", "blocked", "tool"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded text-[10px] font-medium border transition ${
              filter === f ? "bg-accent text-foreground border-border" : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {f === "all" ? "All" : f === "working" ? "Working" : f === "blocked" ? "Blocked" : "Tools"}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{filtered.length}</span>
      </div>

      {/* list */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-sleek">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center space-y-2">
            <div className="mx-auto w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Zap className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">No events for filter “{filter}”</p>
            <p className="text-[10px] font-mono text-muted-foreground/60">Listening for agent:state, tool:request, session:created</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((ev) => (
              <div key={ev.id} className="px-2.5 py-2 hover:bg-accent/40 transition group">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${stateDot(ev.state)}`} title={ev.state} />
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{formatTs(ev.ts)}</span>
                  <span className="text-[11px] font-medium text-foreground truncate flex-1 min-w-0" title={ev.agentName}>
                    {ev.agentName}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none shrink-0 ${stateBadge(ev.state)}`}>
                    {ev.state === "working" ? <Loader2 className="w-3 h-3 animate-spin" /> : ev.state === "blocked" ? <AlertTriangle className="w-3 h-3" /> : ev.state === "idle" ? <CheckCircle2 className="w-3 h-3" /> : ev.state === "tool" ? <Terminal className="w-3 h-3" /> : null}
                    {ev.state}
                  </span>
                </div>
                <div className="mt-1 pl-[14px]">
                  <div
                    className="text-[11px] font-mono leading-[14px] text-muted-foreground group-hover:text-foreground/80 line-clamp-2 break-all"
                    title={ev.snippet}
                  >
                    {ev.snippet || <span className="italic text-muted-foreground/60">no output snippet</span>}
                  </div>
                  <div className="mt-0.5 text-[10px] font-mono text-muted-foreground/60 truncate" title={ev.sessionId}>
                    {ev.sessionId ? ev.sessionId.slice(0, 28) : "—"}
                    {ev.toolName ? ` · ${ev.toolName}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-sidebar px-2 py-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          live — push via emit, poll 1.5s fallback
        </span>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
