import { useState, useEffect, useCallback } from "react";
import { Files, GitBranch, Bot } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FileExplorer } from "./FileExplorer";
import { SourceControl } from "./SourceControl";
import { AgentFeed } from "./AgentFeed";
import { ToolCard } from "./ToolCard";
import { PromptBar } from "./PromptBar";
import type { OpenInApplication } from "../../shared/settings-types";

type TabId = "explorer" | "source-control" | "agent";

type Props = {
  rootPath: string | null;
  isGit: boolean;
  openInApps?: OpenInApplication[];
  onOpenFile?: (path: string) => void;
  onOpenDiff?: (path: string, staged: boolean) => void;
  onOpenSettings?: () => void;
  activeSessionId?: string | null;
};

type ToolApprovalRecord = {
  id: string;
  session_id: string;
  tool_name: string;
  command: string;
  status: string;
  created_at: number;
};

export function RightSidebar({ rootPath, isGit, openInApps, onOpenFile, onOpenDiff, onOpenSettings, activeSessionId }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("agent");
  const [approvals, setApprovals] = useState<ToolApprovalRecord[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    try {
      // Try session-scoped first, then fallback to all
      const args: Record<string, unknown> = {};
      if (activeSessionId) {
        args.sessionId = activeSessionId;
        args.session_id = activeSessionId;
      }
      const res = await invoke<ToolApprovalRecord[]>("list_tool_approvals", args);
      setApprovals(res ?? []);
    } catch {
      // fallback to unfiltered
      try {
        const res2 = await invoke<ToolApprovalRecord[]>("list_tool_approvals", {});
        setApprovals(res2 ?? []);
      } catch {
        // keep empty if backend not yet available (browser preview)
      }
    } finally {
      setApprovalsLoading(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    void fetchApprovals();
    const id = window.setInterval(() => void fetchApprovals(), 2000);
    return () => window.clearInterval(id);
  }, [fetchApprovals]);

  // Live push: tool approval request / resolved refreshes list immediately
  useEffect(() => {
    let unlisteners: Array<() => void> = [];
    let cancelled = false;
    const setup = async () => {
      const tryListen = async (evt: string) => {
        try {
          const un = await listen(evt, () => void fetchApprovals());
          if (!cancelled) unlisteners.push(un);
          else un();
        } catch {}
      };
      await tryListen("tool:approval:request");
      await tryListen("tool_approval:request");
      await tryListen("tool:approval:resolved");
      await tryListen("tool_approval:resolved");
      await tryListen("tool:request");
    };
    void setup();
    return () => {
      cancelled = true;
      for (const u of unlisteners) try { u(); } catch {}
    };
  }, [fetchApprovals]);

  const pending = approvals.filter((a) => a.status.toLowerCase() === "pending");
  const rest = approvals.filter((a) => a.status.toLowerCase() !== "pending");

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* Activity bar — topo — copia Orca activity-bar-buttons.tsx: icon 16px, 36x36 hit, active underline 2px */}
      <div className="flex items-center gap-0 border-b border-border bg-sidebar shrink-0 h-[36px] px-1">
        <button
          onClick={() => setActiveTab("agent")}
          title="Agent Feed & Tools (Sprint 2 P0)"
          className={`relative flex h-[36px] w-9 items-center justify-center transition-colors ${activeTab === "agent" ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
        >
          <Bot size={16} />
          {activeTab === "agent" && <div className="absolute bottom-0 left-[25%] right-[25%] h-[2px] bg-foreground rounded-t" />}
          {pending.length > 0 && (
            <span className="absolute top-1.5 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse border border-sidebar" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("explorer")}
          title="Explorer (Files)"
          className={`relative flex h-[36px] w-9 items-center justify-center transition-colors ${activeTab === "explorer" ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
        >
          <Files size={16} />
          {activeTab === "explorer" && <div className="absolute bottom-0 left-[25%] right-[25%] h-[2px] bg-foreground rounded-t" />}
        </button>
        <button
          onClick={() => setActiveTab("source-control")}
          title="Source Control"
          className={`relative flex h-[36px] w-9 items-center justify-center transition-colors ${activeTab === "source-control" ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
        >
          <GitBranch size={16} />
          {activeTab === "source-control" && <div className="absolute bottom-0 left-[25%] right-[25%] h-[2px] bg-foreground rounded-t" />}
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground font-mono pr-2">
          {activeTab === "agent" ? (pending.length > 0 ? `AGENT · ${pending.length} pending` : "AGENT") : activeTab === "explorer" ? "EXPLORER" : "SOURCE CONTROL"}
        </span>
      </div>

      {/* Panel content — copia Orca right-sidebar-panel-content.tsx com lazy */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === "agent" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Agent feed — flex-1 */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AgentFeed activeSessionId={activeSessionId} />
            </div>

            {/* Tool execution cards — collapsible, max ~40% height, scroll */}
            <div className="shrink-0 border-t border-border bg-sidebar flex flex-col max-h-[42%]">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/60 shrink-0">
                <span className="text-[11px] font-semibold tracking-wide flex items-center gap-1.5">
                  Tool Approvals
                  {pending.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {pending.length} pending
                    </span>
                  )}
                  {!pending.length && approvals.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                      {approvals.length} total
                    </span>
                  )}
                </span>
                <button
                  onClick={() => void fetchApprovals()}
                  title="Refresh approvals"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition"
                >
                  <span className={`text-[10px] font-mono ${approvalsLoading ? "animate-pulse" : ""}`}>↻</span>
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-sleek p-2 space-y-2 bg-sidebar">
                {approvals.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="mx-auto w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">No tool approvals yet</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60">
                      Approve/Reject cards aparecerão aqui quando um agente pedir permissão
                    </p>
                  </div>
                ) : (
                  <>
                    {pending.map((a) => (
                      <ToolCard
                        key={a.id}
                        id={a.id}
                        sessionId={a.session_id}
                        toolName={a.tool_name}
                        command={a.command}
                        status={a.status}
                        createdAt={a.created_at}
                        onResolved={() => void fetchApprovals()}
                      />
                    ))}
                    {pending.length > 0 && rest.length > 0 && (
                      <div className="pt-1 border-t border-border/40 text-[10px] font-mono text-muted-foreground px-1">
                        Recent · {rest.length}
                      </div>
                    )}
                    {rest.slice(0, 6).map((a) => (
                      <ToolCard
                        key={a.id}
                        id={a.id}
                        sessionId={a.session_id}
                        toolName={a.tool_name}
                        command={a.command}
                        status={a.status}
                        createdAt={a.created_at}
                        onResolved={() => void fetchApprovals()}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* PromptBar — pinned bottom */}
            <PromptBar activeSessionId={activeSessionId} />
          </div>
        )}
        {activeTab === "explorer" && <FileExplorer rootPath={rootPath} openInApps={openInApps} onOpenFile={onOpenFile} onOpenSettings={onOpenSettings} />}
        {activeTab === "source-control" && (
          isGit ? <SourceControl repoPath={rootPath} openInApps={openInApps} onOpenDiff={onOpenDiff} onOpenSettings={onOpenSettings} /> : (
            <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground px-4 text-center">
              Source Control só disponível para repositórios Git
            </div>
          )
        )}
      </div>
    </div>
  );
}
