import { useEffect, useState, useCallback } from "react";
import React from "react";
import { invoke } from "@tauri-apps/api/core";
import { openExternalUrl } from "@/lib/sidebar-desktop-contracts";
import {
  GitBranch,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
  File as FileIcon,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  History,
  GitCommit,
  List,
  FolderTree,
  Upload,
  Download,
  ArrowUpFromLine,
  ArrowDownToLine,
  ExternalLink,
} from "lucide-react";
import { CustomContextMenu, type ContextMenuItem } from "../CustomContextMenu";
import { PromptDialog } from "../PromptDialog";
import { getWorktreeOpenInEntries, openWorktreePath } from "./WorktreeOpenInMenu";
import { OpenInApplicationIcon } from "../../lib/open-in-app-catalog";
import type { OpenInApplication } from "../../shared/settings-types";
import { DEFAULT_OPEN_IN_APPLICATIONS } from "../../shared/settings-types";

interface DetailedFileStatus {
  path: string;
  index_status: string;
  worktree_status: string;
  is_staged: boolean;
  is_unstaged: boolean;
  is_untracked: boolean;
  is_conflicted: boolean;
}
interface DetailedGitStatus {
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  is_clean: boolean;
  head_commit: string;
  head_commit_full: string;
  files: DetailedFileStatus[];
  staged_count: number;
  unstaged_count: number;
  untracked_count: number;
  conflicted_count: number;
}
interface GitCommitEntry {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
}
interface DiffNumStat {
  path: string;
  added: number;
  deleted: number;
}

type Props = {
  repoPath: string | null;
  openInApps?: OpenInApplication[];
  onOpenDiff?: (path: string, staged: boolean) => void;
  onOpenSettings?: () => void;
};

function StatusBadge({ s }: { s: string }) {
  const cls =
    s === "M"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : s === "A"
        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        : s === "D"
          ? "bg-red-500/15 text-red-400 border-red-500/30"
          : s === "R"
            ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
            : s === "?"
              ? "bg-neutral-700 text-neutral-300 border-neutral-600"
              : "bg-neutral-800 text-neutral-400 border-neutral-700";
  return <span className={`text-[9px] font-mono px-1 py-0.5 rounded border leading-none ${cls}`}>{s}</span>;
}

export function SourceControl({ repoPath, openInApps, onOpenDiff, onOpenSettings }: Props) {
  const [status, setStatus] = useState<DetailedGitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [amend, setAmend] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["staged", "changes", "untracked", "conflicts", "history", "commits", "stash", "notes"]));
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GitCommitEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [numStats, setNumStats] = useState<Map<string, DiffNumStat>>(new Map());
  const [baseRef, setBaseRef] = useState("");
  const [branchCommits, setBranchCommits] = useState<GitCommitEntry[]>([]);
  const [branchCommitsLoading, setBranchCommitsLoading] = useState(false);
  const [submodules, setSubmodules] = useState<string[]>([]);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [conflictOp, setConflictOp] = useState<string>("unknown");
  const [aborting, setAborting] = useState(false);
  const [stashList, setStashList] = useState<GitCommitEntry[]>([]);
  const [stashLoading, setStashLoading] = useState(false);
  const [stashPromptOpen, setStashPromptOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [newNotePath, setNewNotePath] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<DetailedGitStatus>("get_detailed_git_status_cmd", { repoPath });
      setStatus(res);
      try {
        const op = await invoke<string>("git_conflict_operation_cmd", { repoPath });
        setConflictOp(op);
      } catch { setConflictOp("unknown"); }
      try {
        const [unstaged, stagedStats] = await Promise.all([
          invoke<DiffNumStat[]>("get_diff_numstat_cmd", { repoPath, staged: false }),
          invoke<DiffNumStat[]>("get_diff_numstat_cmd", { repoPath, staged: true }),
        ]);
        const m = new Map<string, DiffNumStat>();
        for (const s of unstaged) m.set(s.path, s);
        for (const s of stagedStats) if (!m.has(s.path)) m.set(s.path, s);
        setNumStats(m);
      } catch {}
      try {
        const subs = await invoke<string[]>("get_submodule_paths_cmd", { repoPath });
        setSubmodules(subs);
      } catch {}
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  const fetchHistory = useCallback(async () => {
    if (!repoPath) return;
    setHistoryLoading(true);
    try {
      const h = await invoke<GitCommitEntry[]>("get_git_history_cmd", { repoPath, limit: 20 });
      setHistory(h);
    } catch {}
    finally { setHistoryLoading(false); }
  }, [repoPath]);

  const fetchBranchCommits = useCallback(async () => {
    if (!repoPath) return;
    setBranchCommitsLoading(true);
    const ref = baseRef.trim() || status?.upstream || "origin/main";
    try {
      const c = await invoke<GitCommitEntry[]>("get_branch_commits_cmd", { repoPath, baseRef: ref, limit: 20 });
      setBranchCommits(c);
    } catch { setBranchCommits([]); }
    finally { setBranchCommitsLoading(false); }
  }, [repoPath, baseRef, status?.upstream]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => {
    if (status?.ahead && status.ahead > 0) fetchBranchCommits();
    else setBranchCommits([]);
  }, [status?.ahead, fetchBranchCommits]);

  // commit draft persist (Orca commit-drafts.ts) — localStorage per repoPath
  useEffect(() => {
    if (!repoPath) return;
    try {
      const d = localStorage.getItem(`hydra:commitDraft:${repoPath}`);
      if (d !== null) setCommitMsg(d);
      const n = localStorage.getItem(`hydra:notes:${repoPath}`);
      if (n) setNotes(JSON.parse(n));
    } catch {}
  }, [repoPath]);
  useEffect(() => {
    if (!repoPath) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(`hydra:commitDraft:${repoPath}`, commitMsg); } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [commitMsg, repoPath]);
  const fetchStash = useCallback(async () => {
    if (!repoPath) return;
    setStashLoading(true);
    try { const s = await invoke<GitCommitEntry[]>("git_stash_list_cmd", { repoPath }); setStashList(s); } catch { setStashList([]); } finally { setStashLoading(false); }
  }, [repoPath]);
  useEffect(() => { fetchStash(); }, [fetchStash]);

  const toggleGroup = (g: string) =>
    setExpandedGroups(prev => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  const handleStage = async (f: DetailedFileStatus) => {
    if (!repoPath) return;
    try { await invoke("git_stage", { repoPath, file: f.path }); fetchStatus(); } catch (e: any) { setError(String(e)); }
  };
  const handleUnstage = async (f: DetailedFileStatus) => {
    if (!repoPath) return;
    try { await invoke("git_unstage", { repoPath, file: f.path }); fetchStatus(); } catch (e: any) { setError(String(e)); }
  };
  const handleDiscard = async (f: DetailedFileStatus) => {
    if (!repoPath) return;
    if (!confirm(`Discard changes in "${f.path}"?`)) return;
    try { await invoke("git_discard", { repoPath, file: f.path }); fetchStatus(); } catch (e: any) { setError(String(e)); }
  };
  const handleStagePaths = async (paths: string[]) => {
    if (!repoPath || paths.length===0) return;
    try { await invoke("git_stage_paths_cmd", { repoPath, paths }); fetchStatus(); } catch(e:any){ setError(String(e)); }
  };
  const handleUnstagePaths = async (paths: string[]) => {
    if (!repoPath || paths.length===0) return;
    try { await invoke("git_unstage_paths_cmd", { repoPath, paths }); fetchStatus(); } catch(e:any){ setError(String(e)); }
  };
  const handleBulkDiscard = async (paths: string[], label: string) => {
    if (!repoPath || paths.length===0) return;
    if (!confirm(`Discard ${paths.length} ${label} file(s)? This cannot be undone.`)) return;
    try { await invoke("git_bulk_discard_cmd", { repoPath, paths }); fetchStatus(); } catch(e:any){ setError(String(e)); }
  };
  const openRemoteCommit = async (sha: string) => {
    if (!repoPath) return;
    try {
      const url = await invoke<string | null>("git_remote_commit_url_cmd", { repoPath, sha });
      if (!url) { setError("No hosted remote (GitHub/GitLab/Bitbucket) for this repo"); return; }
await openExternalUrl(url);
    } catch(e:any){ setError(String(e)); }
  };
  const handleFastForward = async () => {
    if (!repoPath) return;
    const ref = baseRef.trim() || status?.upstream || "origin/main";
    try { await invoke("git_fast_forward_cmd", { repoPath, targetRef: ref }); fetchStatus(); fetchHistory(); } catch(e:any){ setError(String(e)); }
  };
  const handleRebaseFromBase = async () => {
    if (!repoPath) return;
    const ref = baseRef.trim() || status?.upstream || "origin/main";
    if (!confirm(`Rebase current branch onto ${ref}?`)) return;
    try { await invoke("git_rebase_from_base_cmd", { repoPath, base: ref }); fetchStatus(); fetchHistory(); } catch(e:any){ setError(String(e)); }
  };
  const handleSyncFork = async () => {
    if (!repoPath) return;
    const branch = baseRef.trim() || "main";
    if (!confirm(`Sync fork from upstream/${branch}? (fetch + fast-forward merge)`)) return;
    try { await invoke("git_sync_fork_cmd", { repoPath, upstreamRemote: "upstream", branch }); fetchStatus(); fetchHistory(); } catch(e:any){ setError(String(e)); }
  };
  const handlePush = async () => {
    setPushing(true);
    try { await invoke("git_push_cmd", { repoPath }); fetchStatus(); } catch(e:any){ setError(String(e)); } finally{ setPushing(false); }
  };
  const handlePull = async () => {
    if (!repoPath) return;
    setPulling(true);
    try { await invoke("git_pull_cmd", { repoPath }); fetchStatus(); fetchHistory(); } catch(e:any){ setError(String(e)); } finally{ setPulling(false); }
  };
  const handleAbortOp = async () => {
    if (!repoPath || conflictOp === "unknown") return;
    setAborting(true);
    try {
      await invoke(conflictOp === "rebase" ? "git_abort_rebase_cmd" : "git_abort_merge_cmd", { repoPath });
      fetchStatus(); fetchHistory();
    } catch(e:any){ setError(String(e)); } finally{ setAborting(false); }
  };
  const handleCommit = async () => {
    const msg = commitMsg.trim();
    if (!amend && !msg) return;
    if (!repoPath) return;
    setCommitting(true);
    setError(null);
    try {
      if (amend) await invoke("git_commit_amend_cmd", { repoPath, message: msg });
      else await invoke("git_commit_cmd", { repoPath, message: msg });
      setCommitMsg("");
      try { localStorage.removeItem(`hydra:commitDraft:${repoPath}`); } catch {}
      fetchStatus();
      fetchHistory();
      fetchBranchCommits();
    } catch (e: any) { setError(String(e)); } finally { setCommitting(false); }
  };
  const handleStashPush = () => {
    if (!repoPath) return;
    setStashPromptOpen(true);
  };
  const handleStashPop = async () => {
    if (!repoPath) return;
    try { await invoke("git_stash_pop_cmd", { repoPath }); fetchStash(); fetchStatus(); } catch(e:any){ setError(String(e)); }
  };
  const handleAddNote = () => {
    const p = newNotePath.trim();
    const t = newNoteText.trim();
    if (!p || !t || !repoPath) return;
    const n = { ...notes, [p]: t };
    setNotes(n);
    try { localStorage.setItem(`hydra:notes:${repoPath}`, JSON.stringify(n)); } catch {}
    setNewNotePath(""); setNewNoteText("");
  };
  const handleFileContextMenu = (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    if (!repoPath) return;
    const full = repoPath + "/" + filePath;
    const apps = openInApps ?? DEFAULT_OPEN_IN_APPLICATIONS;
    const entries = getWorktreeOpenInEntries(apps, "File Manager");
    const items: ContextMenuItem[] = [
      ...entries.map(en => ({
        label: en.target === "file-manager" ? "Reveal in File Manager" : `Open in ${en.label}`,
        icon: en.target === "file-manager" ? <FolderTree className="w-3.5 h-3.5" /> : en.command ? <OpenInApplicationIcon application={{ command: en.command }} size={14} /> : <ExternalLink className="w-3.5 h-3.5" />,
        onClick: () => openWorktreePath({ target: en.target, worktreePath: full, command: en.command }),
      })),
      { label: "Customize…", icon: <ExternalLink className="w-3.5 h-3.5" />, onClick: () => onOpenSettings?.() },
      { label: "Copy Path", icon: <ExternalLink className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(full) },
      { label: "Copy Relative", icon: <ExternalLink className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(filePath) },
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  if (!repoPath) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground px-4 text-center">
        Selecione um workspace git para ver as mudanças
      </div>
    );
  }

  const conflicted = status?.files.filter(f => f.is_conflicted) ?? [];
  const conflictedPaths = new Set(conflicted.map(f => f.path));
  const staged = (status?.files.filter(f => f.is_staged && !conflictedPaths.has(f.path)) ?? []);
  const untracked = status?.files.filter(f => f.is_untracked) ?? [];
  const unstaged = status?.files.filter(f => f.is_unstaged && !f.is_untracked && !conflictedPaths.has(f.path)) ?? [];
  const hasAny = (staged.length + unstaged.length + untracked.length + conflicted.length) > 0;
  const tooMany = (status?.files.length ?? 0) > 300;

  const groupByDir = (files: DetailedFileStatus[]) => {
    const map = new Map<string, DetailedFileStatus[]>();
    for (const f of files) {
      const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : ".";
      if (!map.has(dir)) map.set(dir, []);
      map.get(dir)!.push(f);
    }
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header — Branch context + push/pull + viewMode */}
      <div className="shrink-0 border-b border-border bg-sidebar">
        <div className="flex items-center justify-between px-2.5 py-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <GitBranch className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate">{status?.branch ?? "—"}</span>
            {status?.upstream && <span className="text-[10px] text-muted-foreground truncate">→ {status.upstream}</span>}
            {(status?.ahead ?? 0) > 0 && <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1 py-0 rounded flex items-center gap-0.5"><Upload className="w-3 h-3" />{status?.ahead}</span>}
            {(status?.behind ?? 0) > 0 && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1 py-0 rounded flex items-center gap-0.5"><Download className="w-3 h-3" />{status?.behind}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePull} disabled={pulling} title="Pull (ff-only)" className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-white disabled:opacity-50">
              <ArrowDownToLine className={`w-3.5 h-3.5 ${pulling ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handlePush} disabled={pushing} title="Push" className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-white disabled:opacity-50">
              <ArrowUpFromLine className={`w-3.5 h-3.5 ${pushing ? "animate-spin" : ""}`} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <div className="flex rounded border border-border overflow-hidden text-[10px]">
              <button onClick={() => setViewMode("list")} title="List view" className={`p-1 ${viewMode==="list" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}><List className="w-3 h-3" /></button>
              <button onClick={() => setViewMode("tree")} title="Tree view" className={`p-1 ${viewMode==="tree" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}><FolderTree className="w-3 h-3" /></button>
            </div>
            <button onClick={fetchStatus} title="Refresh" className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-200">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {/* baseRef picker (Orca CompareSummary baseRef) */}
        <div className="px-2.5 pb-2 flex items-center gap-2">
          <input value={baseRef} onChange={e=>setBaseRef(e.target.value)} placeholder={status?.upstream || "origin/main"} className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <button onClick={fetchBranchCommits} disabled={branchCommitsLoading} className="text-[10px] px-2 py-1 rounded bg-accent hover:bg-accent/80 text-foreground transition-colors">
            {branchCommitsLoading ? "…" : "Compare"}
          </button>
        </div>
        {status && (
          <div className="px-2.5 pb-2 flex items-center gap-2 text-[10px] font-mono text-neutral-500">
            <span className="flex items-center gap-1"><GitCommit className="w-3 h-3" />{status.head_commit || "—"}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${status.is_clean ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
              {status.is_clean ? "clean" : `${status.files.length} changed`}
            </span>
            {conflictOp !== "unknown" && (
              <span className="flex items-center gap-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${conflictOp === "rebase" ? "bg-violet-500/15 text-violet-400" : conflictOp === "merge" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                  {conflictOp === "rebase" ? "Rebasing" : conflictOp === "merge" ? "Merging" : "Cherry-picking"}
                </span>
                <button onClick={handleAbortOp} disabled={aborting} title={`Abort ${conflictOp}`} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-colors disabled:opacity-50">
                  {aborting ? "Aborting…" : "Abort"}
                </button>
              </span>
            )}
            {submodules.length>0 && <span className="text-[10px] text-[#dcb67a]">{submodules.length} submodules</span>}
            {error && <span className="text-red-400 truncate">{error}</span>}
          </div>
        )}
        {tooMany && (
          <HugeFolderBanner repoPath={repoPath} onChanged={fetchStatus} />
        )}
      </div>

      {/* Commit area + draft/amend (Orca commit-drafts.ts) */}
      <div className="shrink-0 border-b border-border p-2.5 bg-card space-y-2">
        <textarea
          value={commitMsg}
          onChange={e => setCommitMsg(e.target.value)}
          placeholder="Message (Ctrl+Enter to commit)"
          rows={3}
          className="w-full bg-background border border-border rounded-md px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-sans"
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleCommit(); } }}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[10px] text-neutral-400 cursor-pointer">
            <input type="checkbox" checked={amend} onChange={e=>setAmend(e.target.checked)} className="accent-emerald-500" />
            amend
          </label>
          <span className="text-[10px] text-neutral-500 font-mono">{staged.length} staged · {commitMsg.trim().length} chars</span>
          <button
            onClick={handleCommit}
            disabled={committing || (!amend && !commitMsg.trim()) || (staged.length === 0 && !amend)}
            title={amend ? "Amend last commit" : staged.length === 0 ? "No staged changes" : "Commit staged changes (Ctrl+Enter)"}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-medium transition"
          >
            <Check className="w-3.5 h-3.5" />
            {committing ? "Committing…" : amend ? "Amend" : "Commit"}
          </button>
        </div>
        {staged.length === 0 && hasAny && !amend && (
          <p className="text-[10px] text-amber-400/80">Stage files with “+” before committing — Hydra staged-first flow</p>
        )}
      </div>

      {/* File listing */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-sleek">
        {!status ? (
          <div className="p-4 text-center text-[11px] text-neutral-500">{loading ? "Loading git status…" : "No status"}</div>
        ) : !hasAny ? (
          <div className="p-6 text-center space-y-2">
            <div className="mx-auto w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-neutral-400">No changes — working tree clean</p>
            <button onClick={fetchStatus} className="text-[11px] text-emerald-400 hover:underline">Refresh</button>
          </div>
        ) : (
          <div className="py-1">
            <Section
              id="staged"
              title="Staged Changes"
              count={staged.length}
              expanded={expandedGroups.has("staged")}
              onToggle={() => toggleGroup("staged")}
              actions={staged.length>0 ? <button onClick={()=>handleUnstagePaths(staged.map(f=>f.path))} className="text-[10px] text-neutral-400 hover:text-white px-1">Unstage All</button> : undefined}
            >
              {viewMode==="tree"
                ? groupByDir(staged).map(([dir, files]) => (
                    <div key={dir}>
                      <div className="px-6 py-1 text-[10px] font-mono text-muted-foreground bg-muted/40 border-y border-border/50">{dir}/</div>
                      {files.map(f => <FileRow key={`staged-${f.path}`} f={f} staged numStat={numStats.get(f.path)} isSubmodule={submodules.includes(f.path)} onUnstage={() => handleUnstage(f)} onOpenDiff={() => onOpenDiff?.(f.path, true)} onContextMenu={e => handleFileContextMenu(e, f.path)} />)}
                    </div>
                  ))
                : staged.map(f => <FileRow key={`staged-${f.path}`} f={f} staged numStat={numStats.get(f.path)} isSubmodule={submodules.includes(f.path)} onUnstage={() => handleUnstage(f)} onOpenDiff={() => onOpenDiff?.(f.path, true)} onContextMenu={e => handleFileContextMenu(e, f.path)} />)
              }
            </Section>

            <Section
              id="changes"
              title="Changes"
              count={unstaged.length}
              expanded={expandedGroups.has("changes")}
              onToggle={() => toggleGroup("changes")}
              actions={unstaged.length>0 ? <span className="flex items-center gap-1"><button onClick={()=>handleStagePaths(unstaged.map(f=>f.path))} className="text-[10px] px-1 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Stage All</button><button onClick={()=>void handleBulkDiscard(unstaged.map(f=>f.path), "changed")} className="text-[10px] text-neutral-400 hover:text-red-400 px-1">Discard All</button></span> : undefined}
            >
              {viewMode==="tree"
                ? groupByDir(unstaged).map(([dir, files])=> (
                    <div key={dir}>
                      <div className="px-6 py-1 text-[10px] font-mono text-muted-foreground bg-muted/40 border-y border-border/50">{dir}/</div>
                      {files.map(f => <FileRow key={`changes-${f.path}`} f={f} numStat={numStats.get(f.path)} isSubmodule={submodules.includes(f.path)} onStage={() => handleStage(f)} onDiscard={() => handleDiscard(f)} onOpenDiff={() => onOpenDiff?.(f.path, false)} onContextMenu={e => handleFileContextMenu(e, f.path)} />)}
                    </div>
                  ))
                : unstaged.map(f => <FileRow key={`changes-${f.path}`} f={f} numStat={numStats.get(f.path)} isSubmodule={submodules.includes(f.path)} onStage={() => handleStage(f)} onDiscard={() => handleDiscard(f)} onOpenDiff={() => onOpenDiff?.(f.path, false)} onContextMenu={e => handleFileContextMenu(e, f.path)} />)
              }
              {unstaged.length === 0 && <div className="px-8 py-2 text-[11px] text-neutral-600">No unstaged changes</div>}
            </Section>

            <Section
              id="untracked"
              title="Untracked"
              count={untracked.length}
              expanded={expandedGroups.has("untracked")}
              onToggle={() => toggleGroup("untracked")}
              actions={untracked.length>0 ? <button onClick={()=>handleStagePaths(untracked.map(f=>f.path))} className="text-[10px] px-1 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Stage All</button> : undefined}
            >
              {untracked.map(f => <FileRow key={`untracked-${f.path}`} f={f} isUntracked isSubmodule={submodules.includes(f.path)} onStage={() => handleStage(f)} onDiscard={() => handleDiscard(f)} onOpenDiff={() => onOpenDiff?.(f.path, false)} onContextMenu={e => handleFileContextMenu(e, f.path)} />)}
              {untracked.length === 0 && <div className="px-8 py-2 text-[11px] text-neutral-600">No untracked files</div>}
            </Section>

            {conflicted.length > 0 && (
              <Section id="conflicts" title="Conflicts" count={conflicted.length} expanded={expandedGroups.has("conflicts")} onToggle={() => toggleGroup("conflicts")} tone="error">
                {conflicted.map(f => <FileRow key={`conflict-${f.path}`} f={f} conflict onOpenDiff={() => onOpenDiff?.(f.path, false)} onContextMenu={e => handleFileContextMenu(e, f.path)} />)}
              </Section>
            )}
            {/* Submodule placeholder (Orca submodule-placeholder-row) */}
            {submodules.length>0 && (
              <Section id="submodules" title="Submodules" count={submodules.length} expanded={expandedGroups.has("submodules")} onToggle={() => toggleGroup("submodules")}>
                {submodules.map(p => (
                  <div key={p} className="flex items-center gap-1.5 pl-6 pr-1 py-[3px] text-[11px] text-[#dcb67a]">
                    <FolderTree className="w-3 h-3" />
                    <span className="truncate">{p}</span>
                    <span className="ml-auto text-[9px] font-mono bg-neutral-800 text-neutral-400 px-1 rounded border">submodule</span>
                  </div>
                ))}
              </Section>
            )}
          </div>
        )}

        {/* Branch Commits — copia Orca branch-section (commits ahead) */}
        {(status?.ahead ?? 0) > 0 && (
          <div className="border-t border-border bg-sidebar">
            <button onClick={() => toggleGroup("commits")} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold tracking-wide hover:bg-accent text-foreground transition-colors">
              {expandedGroups.has("commits") ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <GitCommit className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Commits ahead of {baseRef || status?.upstream || "base"}</span>
              <span className="ml-1 px-1 py-0 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400">{branchCommits.length || (status?.ahead ?? 0)}</span>
              <span className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span onClick={() => void handleFastForward()} title={`Fast-forward to ${baseRef || status?.upstream || "base"}`} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">FF</span>
                <span onClick={() => void handleRebaseFromBase()} title={`Rebase onto ${baseRef || status?.upstream || "base"}`} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">Rebase</span>
                <span onClick={() => void handleSyncFork()} title="Sync fork from upstream remote" className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">Sync fork</span>
              </span>
            </button>
            {expandedGroups.has("commits") && (
              <div className="max-h-[180px] overflow-y-auto border-t border-border">
                {branchCommitsLoading ? <div className="px-3 py-2 text-[11px] text-muted-foreground">Loading…</div> :
                  branchCommits.length===0 ? <div className="px-3 py-2 text-[11px] text-muted-foreground">No commits ahead or base not found</div> :
                  branchCommits.map(c => (
                    <div key={c.hash} className="flex items-center gap-2 px-2 py-1 hover:bg-accent border-b border-border/50 last:border-0 transition-colors">
                      <span className="text-[10px] font-mono text-amber-400">{c.short_hash}</span>
                      <span className="flex-1 truncate text-[11px] text-neutral-300" title={c.message}>{c.message}</span>
                      <span className="text-[10px] text-neutral-500">{c.date}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* Stash (Orca stash via git) */}
        <div className="border-t border-border bg-sidebar">
          <button onClick={() => toggleGroup("stash")} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold tracking-wide hover:bg-accent text-foreground transition-colors">
            {expandedGroups.has("stash") ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            <span>Stash</span>
            <span className="ml-1 px-1 py-0 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300">{stashList.length}</span>
            <span className="ml-auto flex items-center gap-1">
              <span onClick={e=>{e.stopPropagation(); handleStashPush();}} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">Push</span>
              <span onClick={e=>{e.stopPropagation(); handleStashPop();}} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">Pop</span>
            </span>
          </button>
          {expandedGroups.has("stash") && (
            <div className="max-h-[160px] overflow-y-auto border-t border-border">
              {stashLoading ? <div className="px-3 py-2 text-[11px] text-muted-foreground">Loading…</div> :
                stashList.length===0 ? <div className="px-3 py-2 text-[11px] text-muted-foreground text-center">No stash</div> :
                stashList.map(c => (
                  <div key={c.hash} className="flex items-center gap-2 px-2 py-1 hover:bg-accent border-b border-border/50 last:border-0 transition-colors">
                    <span className="text-[10px] font-mono text-amber-400">{c.short_hash}</span>
                    <span className="flex-1 truncate text-[11px] text-neutral-300" title={c.message}>{c.message}</span>
                    <span className="text-[10px] text-neutral-500">{c.date}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Notes shelf (Orca diff-comments notes) — local per repoPath */}
        <div className="border-t border-border bg-sidebar">
          <button onClick={() => toggleGroup("notes")} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold tracking-wide hover:bg-accent text-foreground transition-colors">
            {expandedGroups.has("notes") ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            <span>Notes</span>
            <span className="ml-1 px-1 py-0 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300">{Object.keys(notes).length}</span>
          </button>
          {expandedGroups.has("notes") && (
            <div className="p-2 space-y-2 border-t border-border">
              <div className="flex gap-1">
                <input value={newNotePath} onChange={e=>setNewNotePath(e.target.value)} placeholder="path" className="flex-1 bg-background border border-border rounded px-1.5 py-1 text-[10px] font-mono text-foreground" />
                <input value={newNoteText} onChange={e=>setNewNoteText(e.target.value)} placeholder="note" className="flex-1 bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground" />
                <button onClick={handleAddNote} className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white">Add</button>
              </div>
              {Object.keys(notes).length===0 ? <div className="text-[11px] text-neutral-500 text-center py-2">No notes — local shelf</div> :
                Object.entries(notes).map(([p, t]) => (
                  <div key={p} className="flex items-center gap-2 px-1 py-1 hover:bg-accent rounded transition-colors">
                    <span className="text-[10px] font-mono text-[#dcb67a] truncate flex-1" title={p}>{p}</span>
                    <span className="text-[11px] text-neutral-300 truncate flex-1" title={t}>{t}</span>
                    <button onClick={()=>{ const n={...notes}; delete n[p]; setNotes(n); try{ localStorage.setItem(`hydra:notes:${repoPath}`, JSON.stringify(n)); }catch{} }} className="text-[10px] text-red-400 hover:text-red-300">×</button>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Git History — docked bottom */}
        <div className="border-t border-border bg-sidebar">
          <button onClick={() => toggleGroup("history")} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold tracking-wide hover:bg-accent text-foreground transition-colors">
            {expandedGroups.has("history") ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span>History</span>
            <span className="ml-1 px-1 py-0 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300">{history.length}</span>
            <span className="ml-auto text-[10px] text-neutral-500 font-mono">{historyLoading ? "loading…" : ""}</span>
          </button>
          {expandedGroups.has("history") && (
            <div className="max-h-[200px] overflow-y-auto border-t border-[#1a1c1e]">
              {history.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-neutral-500 text-center">{historyLoading ? "Loading via Rust git log…" : "No commits"}</div>
              ) : (
                history.map(c => (
                  <div key={c.hash} className="group flex items-center gap-2 px-2 py-1 hover:bg-[#1a1c1e] border-b border-[#1a1c1e]/50 last:border-0">
                    <span className="text-[10px] font-mono text-amber-400">{c.short_hash}</span>
                    <span className="flex-1 truncate text-[11px] text-neutral-300" title={c.message}>{c.message}</span>
                    <span className="text-[10px] text-neutral-500">{c.author}</span>
                    <span className="text-[10px] font-mono text-neutral-600">{c.date}</span>
                    <button onClick={() => void openRemoteCommit(c.hash)} title="Open commit in browser" className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition">
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      {contextMenu && <CustomContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
      {stashPromptOpen && (
        <PromptDialog
          open={stashPromptOpen}
          title="Stash Changes"
          placeholder="hydra stash"
          initialValue="hydra stash"
          confirmLabel="Stash"
          onOpenChange={setStashPromptOpen}
          onSubmit={async (message) => {
            if (!repoPath) return;
            try {
              await invoke("git_stash_push_cmd", { repoPath, message });
              fetchStash();
              fetchStatus();
            } catch (e: unknown) {
              setError(String(e));
            }
          }}
        />
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-[#222] px-2 py-1 flex items-center justify-between text-[10px] text-neutral-500 font-mono bg-[#0e0f11]">
        <span className="flex items-center gap-1"><History className="w-3 h-3" />{status?.head_commit_full?.slice(0, 7) ?? "—"}</span>
        <span>{status ? `${staged.length} staged · ${unstaged.length + untracked.length} unstaged` : ""}</span>
      </div>
    </div>
  );
}


// Why: the overwhelmingly common cause of a status listing big enough to hit
// the entry limit is a dependency/build folder that should have been ignored
// (Orca `huge-folder-ignore.ts`). Offer to ignore by name instead of hand-edit.
function HugeFolderBanner({ repoPath, onChanged }: { repoPath: string | null; onChanged: () => void }) {
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!repoPath) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await invoke<string[]>("git_find_huge_folders_cmd", { repoPath });
        if (!cancelled) setCandidates(list);
      } catch { if (!cancelled) setCandidates([]); }
    })();
    return () => { cancelled = true; };
  }, [repoPath]);
  if (!candidates || candidates.length === 0) {
    return (
      <div className="mx-2 mb-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
        Too many changes — showing first 300. Commit or stash to improve performance.
      </div>
    );
  }
  const ignore = async (folder: string) => {
    if (!repoPath) return;
    setBusy(folder);
    try {
      await invoke("git_append_gitignore_cmd", { repoPath, folderName: folder });
      setCandidates((prev) => (prev ?? []).filter((c) => c !== folder));
      onChanged();
    } catch {}
    setBusy(null);
  };
  return (
    <div className="mx-2 mb-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
      <div>Too many changes — showing first 300. These folders look ignorable:</div>
      <div className="flex flex-wrap gap-1">
        {candidates.map((c) => (
          <button key={c} onClick={() => void ignore(c)} disabled={busy !== null} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition-colors disabled:opacity-50">
            {busy === c ? "Ignoring…" : `Ignore ${c}/`}
          </button>
        ))}
      </div>
    </div>
  );
}
function Section({ title, count, expanded, onToggle, children, actions, tone }: { title: string; count: number; expanded: boolean; onToggle: () => void; children: React.ReactNode; tone?: "error"; actions?: React.ReactNode; id: string }) {
  return (
    <div className="border-b border-[#1a1c1e] last:border-0">
      <div className="flex items-center">
        <button onClick={onToggle} className={`flex-1 flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold tracking-wide hover:bg-[#1a1c1e] transition ${tone === "error" ? "text-red-400" : "text-neutral-300"}`}>
          {expanded ? <ChevronDown className="w-3 h-3 text-neutral-500" /> : <ChevronRight className="w-3 h-3 text-neutral-500" />}
          <span>{title}</span>
          <span className={`ml-1 px-1 py-0 rounded text-[10px] font-mono ${count > 0 ? "bg-neutral-800 text-neutral-300" : "bg-transparent text-neutral-600"}`}>{count}</span>
        </button>
        {actions && <div className="pr-2">{actions}</div>}
      </div>
      {expanded && <div className="pb-1">{children}</div>}
    </div>
  );
}

function FileRow({ f, staged, isUntracked, conflict, numStat, isSubmodule, onStage, onUnstage, onDiscard, onOpenDiff, onContextMenu }: { f: DetailedFileStatus; staged?: boolean; isUntracked?: boolean; conflict?: boolean; numStat?: DiffNumStat; isSubmodule?: boolean; onStage?: () => void; onUnstage?: () => void; onDiscard?: () => void; onOpenDiff?: () => void; onContextMenu?: (e: React.MouseEvent) => void }) {
  return (
    <div onContextMenu={onContextMenu} className="group flex items-center gap-1.5 pl-6 pr-1 py-[3px] hover:bg-[#1e2023] cursor-pointer text-[11px] leading-[16px]">
      {isSubmodule ? <FolderTree className="w-3 h-3 text-[#dcb67a] shrink-0" /> : <FileIcon className="w-3 h-3 text-neutral-500 shrink-0" />}
      <span className="flex-1 min-w-0 truncate text-neutral-300" title={`${f.index_status}${f.worktree_status} ${f.path}`} onClick={onOpenDiff}>
        {f.path}
      </span>
      {isSubmodule && <span className="text-[9px] font-mono bg-[#dcb67a]/15 text-[#dcb67a] px-1 rounded border border-[#dcb67a]/30">submodule</span>}
      {numStat && (numStat.added>0 || numStat.deleted>0) && (
        <span className="text-[10px] font-mono flex items-center gap-1 shrink-0">
          <span className="text-emerald-400">+{numStat.added}</span>
          <span className="text-red-400">-{numStat.deleted}</span>
        </span>
      )}
      <span className="flex items-center gap-1 shrink-0">
        <StatusBadge s={staged ? f.index_status : isUntracked ? "?" : f.worktree_status} />
        {!staged && !conflict && onStage && (
          <button onClick={e => { e.stopPropagation(); onStage(); }} title="Stage" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-700 text-emerald-400 transition">
            <Plus className="w-3 h-3" />
          </button>
        )}
        {staged && onUnstage && (
          <button onClick={e => { e.stopPropagation(); onUnstage(); }} title="Unstage" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-700 text-amber-400 transition">
            <Minus className="w-3 h-3" />
          </button>
        )}
        {onDiscard && !staged && (
          <button onClick={e => { e.stopPropagation(); onDiscard(); }} title="Discard changes" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition">
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        {conflict && <AlertTriangle className="w-3 h-3 text-red-400" />}
      </span>
    </div>
  );
}
