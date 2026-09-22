import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, X, Clock3, Terminal, Loader2, ShieldCheck, ShieldX } from "lucide-react";

export type ToolApprovalStatus = "pending" | "approved" | "rejected" | string;

export type ToolCardProps = {
  id: string;
  sessionId: string;
  toolName: string;
  command: string;
  status: ToolApprovalStatus;
  createdAt: number;
  onResolved?: () => void;
};

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "approved") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s === "rejected") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (s === "pending") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-neutral-800 text-neutral-300 border-neutral-700";
}

function formatTime(ts: number): string {
  try {
    const d = new Date(ts < 1e12 ? ts * 1000 : ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return String(ts);
  }
}

export function ToolCard({ id, sessionId, toolName, command, status, createdAt, onResolved }: ToolCardProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const lower = status.toLowerCase();
  const isPending = lower === "pending" || lower === "" || lower === "unknown";
  const isApproved = lower === "approved";
  const isRejected = lower === "rejected";

  const handleResolve = async (approved: boolean) => {
    if (loading) return;
    setLoading(approved ? "approve" : "reject");
    try {
      // P0 spec: {id, approved: bool}. Also support legacy {approval_id, session_id, status}
      try {
        await invoke("resolve_tool_approval", { id, approved });
      } catch (err) {
        // fallback to legacy shape
        const legacyStatus = approved ? "approved" : "rejected";
        await invoke("resolve_tool_approval", {
          approvalId: id,
          approval_id: id,
          sessionId: sessionId,
          session_id: sessionId,
          status: legacyStatus,
          approved,
          id,
        } as unknown as Record<string, unknown>);
        void err;
      }
      onResolved?.();
    } catch (e) {
      console.error("[ToolCard] resolve failed", e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border/60 bg-sidebar/60">
        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-semibold text-foreground truncate">{toolName || "tool"}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none shrink-0 ${statusBadge(status)}`}>
              {isPending ? <Clock3 className="w-3 h-3" /> : isApproved ? <ShieldCheck className="w-3 h-3" /> : isRejected ? <ShieldX className="w-3 h-3" /> : null}
              {status || "pending"}
            </span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground truncate flex items-center gap-1.5">
            <span>{formatTime(createdAt)}</span>
            <span className="opacity-60">·</span>
            <span className="truncate">{sessionId.slice(0, 18)}</span>
          </div>
        </div>
      </div>

      {/* command */}
      <div className="px-2.5 py-2">
        <div className="text-[11px] font-mono text-foreground/90 bg-background border border-border rounded px-2 py-1.5 break-all whitespace-pre-wrap max-h-[96px] overflow-y-auto scrollbar-sleek">
          {command ? command : <span className="text-muted-foreground italic">no command payload</span>}
        </div>
        {!isPending && (
          <div className="mt-1.5 text-[10px] font-mono text-muted-foreground">
            {isApproved ? "Approved — agent may continue" : isRejected ? "Rejected — agent blocked" : null}
          </div>
        )}
      </div>

      {/* actions */}
      {isPending ? (
        <div className="flex items-center gap-1.5 px-2.5 pb-2">
          <button
            onClick={() => void handleResolve(true)}
            disabled={!!loading}
            title="Approve — allow tool to run"
            className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-medium transition cursor-pointer"
          >
            {loading === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Approve
          </button>
          <button
            onClick={() => void handleResolve(false)}
            disabled={!!loading}
            title="Reject — deny tool execution"
            className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-md bg-muted hover:bg-accent disabled:opacity-60 text-foreground border border-border text-[11px] font-medium transition cursor-pointer"
          >
            {loading === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            Reject
          </button>
        </div>
      ) : (
        <div className="px-2.5 pb-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>ID {id.slice(0, 12)}</span>
          <span className={`px-1.5 py-0.5 rounded border text-[10px] ${statusBadge(status)}`}>{status}</span>
        </div>
      )}
    </div>
  );
}
