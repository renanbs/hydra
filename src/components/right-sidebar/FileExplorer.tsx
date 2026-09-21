import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, RefreshCw, Search, X, ListCollapse, Ellipsis, Loader2, Copy, Trash2, Pencil, FilePlus, FolderPlus, ExternalLink } from "lucide-react";
import { CustomContextMenu, type ContextMenuItem } from "../CustomContextMenu";
import { getWorktreeOpenInEntries, openWorktreePath } from "./WorktreeOpenInMenu";
import { OpenInApplicationIcon } from "../../lib/open-in-app-catalog";
import type { OpenInApplication } from "../../shared/settings-types";
import { DEFAULT_OPEN_IN_APPLICATIONS } from "../../shared/settings-types";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_hidden: boolean;
}
interface DirectoryListing {
  path: string;
  entries: FileEntry[];
}
interface SearchResult {
  path: string;
  line: number;
  col: number;
  text: string;
  relative_path: string;
}

type Props = {
  rootPath: string | null;
  openInApps?: OpenInApplication[];
  onOpenFile?: (path: string) => void;
  onOpenSettings?: () => void;
};

function FileIcon({ isDir, expanded, name }: { isDir: boolean; expanded?: boolean; name: string }) {
  if (isDir) {
    return expanded ? <FolderOpen className="w-3.5 h-3.5 text-[#dcb67a] shrink-0" /> : <Folder className="w-3.5 h-3.5 text-[#dcb67a] shrink-0" />;
  }
  if (name.endsWith(".rs")) return <File className="w-3.5 h-3.5 text-[#e06c75] shrink-0" />;
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return <File className="w-3.5 h-3.5 text-[#61afef] shrink-0" />;
  if (name.endsWith(".json")) return <File className="w-3.5 h-3.5 text-[#98c379] shrink-0" />;
  return <File className="w-3.5 h-3.5 text-neutral-500 shrink-0" />;
}

type ViewMode = "files" | "search";

export function FileExplorer({ rootPath, openInApps, onOpenFile, onOpenSettings }: Props) {
  const [view, setView] = useState<ViewMode>("files");
  const [filter, setFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showGitIgnored, setShowGitIgnored] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [treeData, setTreeData] = useState<Map<string, FileEntry[]>>(new Map());
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [ignoredSet, setIgnoredSet] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(400);
  const ROW_H = 22;
  const overscan = 8;
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [dragSrc, setDragSrc] = useState<string | null>(null);
  const [inlineInput, setInlineInput] = useState<null | { dir: string; type: 'file'|'folder'|'rename'; target?: string; value: string; depth: number }>(null);

  const loadDir = useCallback(async (dir: string) => {
    setLoadingPath(dir);
    try {
      const res = await invoke<DirectoryListing>("list_directory_cmd", { path: dir });
      setTreeData(prev => {
        const next = new Map(prev);
        next.set(dir, res.entries);
        return next;
      });
      if (!showGitIgnored && rootPath) {
        const relPaths = res.entries.map(e => e.path.startsWith(rootPath + "/") ? e.path.slice(rootPath.length + 1) : e.name);
        if (relPaths.length > 0) {
          try {
            const ignored = await invoke<string[]>("check_git_ignored_cmd", { repoPath: rootPath, paths: relPaths });
            if (ignored.length > 0) {
              setIgnoredSet(prev => {
                const n = new Set(prev);
                for (const p of ignored) n.add(rootPath + "/" + p);
                return n;
              });
            }
          } catch {}
        }
      }
    } catch (e) { console.error(e); } finally { setLoadingPath(null); }
  }, [rootPath, showGitIgnored]);

  useEffect(() => {
    if (rootPath) {
      loadDir(rootPath);
      setExpandedSet(new Set());
      setIgnoredSet(new Set());
      setSelectedPath(null);
    } else setTreeData(new Map());
  }, [rootPath, loadDir]);

  useEffect(() => {
    if (!rootPath || showGitIgnored) return;
    if (ignoredSet.size === 0 && treeData.size > 0) {
      const allEntries: FileEntry[] = [];
      for (const entries of treeData.values()) allEntries.push(...entries);
      if (allEntries.length === 0) return;
      const relPaths = allEntries.map(e => e.path.startsWith(rootPath + "/") ? e.path.slice(rootPath.length + 1) : e.name);
      invoke<string[]>("check_git_ignored_cmd", { repoPath: rootPath, paths: relPaths }).then(ignored => {
        if (ignored.length > 0) {
          setIgnoredSet(prev => {
            const n = new Set(prev);
            for (const p of ignored) n.add(rootPath + "/" + p);
            return n;
          });
        }
      }).catch(()=>{});
    }
  }, [showGitIgnored, rootPath, treeData, ignoredSet.size]);

  // watcher auto-refresh poll (Orca useFileExplorerWatch) — Rust list_directory every 4s, só quando files view sem filter
  useEffect(() => {
    if (!rootPath || view !== "files" || filter.trim()) return;
    const id = setInterval(() => {
      if (loadingPath) return;
      const dirs = [rootPath, ...Array.from(expandedSet)];
      Promise.all(dirs.map(d => invoke<DirectoryListing>("list_directory_cmd", { path: d }).then(r => ({ dir: d, entries: r.entries })).catch(()=> null))).then(results => {
        setTreeData(prev => {
          const n = new Map(prev);
          for (const r of results) if (r) n.set(r.dir, r.entries);
          return n;
        });
      });
    }, 4000);
    return () => clearInterval(id);
  }, [rootPath, view, filter, expandedSet, loadingPath]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight));
    ro.observe(el);
    setContainerH(el.clientHeight);
    return () => ro.disconnect();
  }, [view]);

  const toggleExpand = useCallback(async (entry: FileEntry) => {
    setSelectedPath(entry.path);
    if (!entry.is_dir) { onOpenFile?.(entry.path); return; }
    const isExpanded = expandedSet.has(entry.path);
    if (isExpanded) {
      setExpandedSet(prev => { const n = new Set(prev); n.delete(entry.path); return n; });
    } else {
      if (!treeData.has(entry.path)) await loadDir(entry.path);
      setExpandedSet(prev => { const n = new Set(prev); n.add(entry.path); return n; });
    }
  }, [expandedSet, treeData, loadDir, onOpenFile]);

  const handleRefresh = useCallback(() => {
    if (!rootPath) return;
    setTreeData(new Map());
    setIgnoredSet(new Set());
    loadDir(rootPath);
    for (const p of expandedSet) loadDir(p);
  }, [rootPath, expandedSet, loadDir]);

  const handleCollapseAll = useCallback(() => setExpandedSet(new Set()), []);
  const canCollapseAll = expandedSet.size > 0;
  const canRefresh = view === "files";

  // CRUD via Rust fs_ops inline (Orca FileExplorerInlineInputRow) — performance Rust fs direto
  const depthFor = useCallback((p: string) => {
    if (!rootPath) return 0;
    if (p === rootPath) return 0;
    const rel = p.startsWith(rootPath+"/") ? p.slice(rootPath.length+1) : p;
    return rel.split("/").length;
  }, [rootPath]);
  const handleCreateFile = useCallback((baseDir: string) => {
    const d = depthFor(baseDir) + (baseDir===rootPath ? 0 : 1);
    setInlineInput({ dir: baseDir, type: 'file', value: '', depth: d });
    // ensure dir expanded
    if (!expandedSet.has(baseDir) && baseDir!==rootPath) {
      setExpandedSet(prev => { const n=new Set(prev); n.add(baseDir); return n; });
      if (!treeData.has(baseDir)) loadDir(baseDir);
    }
  }, [depthFor, rootPath, expandedSet, treeData, loadDir]);
  const handleCreateFolder = useCallback((baseDir: string) => {
    const d = depthFor(baseDir) + (baseDir===rootPath ? 0 : 1);
    setInlineInput({ dir: baseDir, type: 'folder', value: '', depth: d });
    if (!expandedSet.has(baseDir) && baseDir!==rootPath) {
      setExpandedSet(prev => { const n=new Set(prev); n.add(baseDir); return n; });
      if (!treeData.has(baseDir)) loadDir(baseDir);
    }
  }, [depthFor, rootPath, expandedSet, treeData, loadDir]);
  const handleRename = useCallback((targetPath: string) => {
    const base = targetPath.split("/").slice(0, -1).join("/") || rootPath || "/";
    const cur = targetPath.split("/").pop() ?? "";
    const d = depthFor(targetPath);
    setInlineInput({ dir: base, type: 'rename', target: targetPath, value: cur, depth: d });
  }, [depthFor, rootPath]);
  const handleInlineSubmit = useCallback(async () => {
    if (!inlineInput) return;
    const v = inlineInput.value.trim();
    if (!v) { setInlineInput(null); return; }
    try {
      if (inlineInput.type === 'rename' && inlineInput.target) {
        const base = inlineInput.target.split("/").slice(0, -1).join("/") || "/";
        const newPath = base + "/" + v;
        if (newPath !== inlineInput.target) await invoke("rename_path_cmd", { oldPath: inlineInput.target, newPath });
      } else if (inlineInput.type === 'file') {
        const full = inlineInput.dir.endsWith("/") ? inlineInput.dir + v : inlineInput.dir + "/" + v;
        await invoke("create_file_cmd", { path: full });
        await loadDir(inlineInput.dir);
      } else if (inlineInput.type === 'folder') {
        const full = inlineInput.dir.endsWith("/") ? inlineInput.dir + v : inlineInput.dir + "/" + v;
        await invoke("create_folder_cmd", { path: full });
        await loadDir(inlineInput.dir);
      }
      handleRefresh();
    } catch (e) { alert(String(e)); }
    setInlineInput(null);
  }, [inlineInput, loadDir, handleRefresh]);
  const handleInlineCancel = useCallback(() => setInlineInput(null), []);
  const handleDelete = useCallback(async (targetPath: string) => {
    if (!confirm(`Delete "${targetPath.split("/").pop()}"?`)) return;
    try { await invoke("delete_path_cmd", { path: targetPath }); handleRefresh(); } catch(e){ alert(String(e)); }
  }, [handleRefresh]);

  const handleDragStart = useCallback((e: React.DragEvent, path: string) => {
    setDragSrc(path);
    e.dataTransfer.setData("text/plain", path);
    e.dataTransfer.effectAllowed = "move";
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent, targetPath: string, isDir: boolean) => {
    if (!dragSrc || dragSrc === targetPath) return;
    // só permite drop em diretórios (Orca file-explorer-row-file-transfer)
    if (!isDir) return;
    e.preventDefault();
    setDragOverPath(targetPath);
  }, [dragSrc]);
  const handleDrop = useCallback(async (e: React.DragEvent, targetPath: string, isDir: boolean) => {
    e.preventDefault();
    setDragOverPath(null);
    const src = e.dataTransfer.getData("text/plain") || dragSrc;
    if (!src || src === targetPath || !isDir) return;
    const base = targetPath;
    const name = src.split("/").pop() ?? "file";
    const dest = base.endsWith("/") ? base + name : base + "/" + name;
    if (dest === src) return;
    try { await invoke("rename_path_cmd", { oldPath: src, newPath: dest }); handleRefresh(); } catch(err){ alert(String(err)); }
    setDragSrc(null);
  }, [dragSrc, handleRefresh]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || !rootPath) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await invoke<SearchResult[]>("search_files_cmd", { repoPath: rootPath, query: q, maxResults: 100 });
      setSearchResults(res);
    } catch (e) { console.error(e); setSearchResults([]); } finally { setSearchLoading(false); }
  }, [searchQuery, rootPath]);

  useEffect(() => {
    if (view !== "search") return;
    const t = setTimeout(() => { if (searchQuery.trim().length >= 2) handleSearch(); else if (!searchQuery.trim()) setSearchResults([]); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, view, handleSearch]);

  // keyboard nav (Orca file-explorer-keyboard-navigation)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedPath || view !== "files") return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      // find rows order
      const flat: string[] = [];
      const dfs = (dir: string) => {
        const entries = treeData.get(dir);
        if (!entries) return;
        for (const en of entries) {
          if (!showHidden && en.is_hidden) continue;
          if (!showGitIgnored && ignoredSet.has(en.path)) continue;
          flat.push(en.path);
          if (en.is_dir && expandedSet.has(en.path)) dfs(en.path);
        }
      };
      if (rootPath) dfs(rootPath);
      const idx = flat.indexOf(selectedPath);
      if (idx >= 0) {
        const nextIdx = e.key === "ArrowDown" ? Math.min(idx+1, flat.length-1) : Math.max(idx-1, 0);
        const nextPath = flat[nextIdx];
        setSelectedPath(nextPath);
        // scroll into view?
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      onOpenFile?.(selectedPath);
    } else if (e.key === "Delete") {
      e.preventDefault();
      handleDelete(selectedPath);
    } else if (e.key === "F2") {
      e.preventDefault();
      handleRename(selectedPath);
    }
  }, [selectedPath, view, treeData, expandedSet, showHidden, showGitIgnored, ignoredSet, rootPath, onOpenFile, handleDelete, handleRename]);

  const rows = useMemo(() => {
    if (!rootPath || view !== "files") return [];
    const out: Array<{ entry: FileEntry; depth: number; expanded: boolean; loading: boolean }> = [];
    const filterLower = filter.trim().toLowerCase();
    const shouldInclude = (e: FileEntry) => {
      if (!showHidden && e.is_hidden) return false;
      if (!showGitIgnored && ignoredSet.has(e.path)) return false;
      if (!filterLower) return true;
      return e.name.toLowerCase().includes(filterLower);
    };
    const dfs = (dirPath: string, depth: number) => {
      const entries = treeData.get(dirPath);
      if (!entries) return;
      for (const e of entries) {
        const isDir = e.is_dir;
        const expanded = expandedSet.has(e.path);
        const matchesSelf = shouldInclude(e);
        let hasMatchingDescendant = false;
        if (filterLower && isDir) {
          const children = treeData.get(e.path);
          if (children) {
            const stack = [...children];
            while (stack.length) {
              const c = stack.pop()!;
              if (!showHidden && c.is_hidden) continue;
              if (!showGitIgnored && ignoredSet.has(c.path)) continue;
              if (c.name.toLowerCase().includes(filterLower)) { hasMatchingDescendant = true; break; }
              if (c.is_dir) { const sub = treeData.get(c.path); if (sub) stack.push(...sub); }
            }
          }
        }
        const visible = filterLower ? (matchesSelf || hasMatchingDescendant) : matchesSelf;
        if (!visible) continue;
        const effectiveExpanded = expanded || (!!filterLower && hasMatchingDescendant);
        const loading = loadingPath === e.path;
        out.push({ entry: e, depth, expanded: effectiveExpanded, loading });
        if (isDir && effectiveExpanded) dfs(e.path, depth + 1);
      }
    };
    dfs(rootPath, 0);
    if (out.length > 5000) out.splice(5000);
    return out;
  }, [rootPath, view, treeData, expandedSet, filter, showHidden, showGitIgnored, ignoredSet, loadingPath]);

  if (!rootPath) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground px-4 text-center">
        Selecione um workspace para navegar nos arquivos
      </div>
    );
  }
  const repoName = rootPath.split("/").pop() ?? rootPath;

  const openContextForEntry = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPath(entry.path);
    const baseDir = entry.is_dir ? entry.path : entry.path.split("/").slice(0,-1).join("/") || rootPath;
    const apps = openInApps ?? DEFAULT_OPEN_IN_APPLICATIONS;
    const openEntries = getWorktreeOpenInEntries(apps, "File Manager");
    const openItems: ContextMenuItem[] = openEntries.map(en => ({
      label: en.target === "file-manager" ? "Reveal in File Manager" : `Open in ${en.label}`,
      icon: en.target === "file-manager" ? <Folder className="w-3.5 h-3.5" /> : en.command ? <OpenInApplicationIcon application={{ command: en.command }} size={14} /> : <ExternalLink className="w-3.5 h-3.5" />,
      onClick: () => openWorktreePath({ target: en.target, worktreePath: entry.path, command: en.command }),
    }));
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "New File…", icon: <FilePlus className="w-3.5 h-3.5" />, onClick: () => handleCreateFile(baseDir) },
        { label: "New Folder…", icon: <FolderPlus className="w-3.5 h-3.5" />, onClick: () => handleCreateFolder(baseDir) },
        ...openItems,
        { label: "Customize…", icon: <ExternalLink className="w-3.5 h-3.5" />, onClick: () => onOpenSettings?.() },
        { label: "Rename…", icon: <Pencil className="w-3.5 h-3.5" />, shortcut: "F2", onClick: () => handleRename(entry.path) },
        { label: "Delete", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, separator: true, onClick: () => handleDelete(entry.path) },
        { label: "Copy Path", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(entry.path) },
        { label: "Copy Relative Path", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(entry.path.startsWith(rootPath+"/") ? entry.path.slice(rootPath.length+1) : entry.path) },
      ]
    });
  };
  const openContextForBackground = (e: React.MouseEvent) => {
    e.preventDefault();
    const apps = openInApps ?? DEFAULT_OPEN_IN_APPLICATIONS;
    const openEntries = getWorktreeOpenInEntries(apps, "File Manager");
    const openItems: ContextMenuItem[] = openEntries.map(en => ({
      label: en.target === "file-manager" ? "Reveal in File Manager" : `Open in ${en.label}`,
      icon: en.target === "file-manager" ? <Folder className="w-3.5 h-3.5" /> : en.command ? <OpenInApplicationIcon application={{ command: en.command }} size={14} /> : <ExternalLink className="w-3.5 h-3.5" />,
      onClick: () => openWorktreePath({ target: en.target, worktreePath: rootPath!, command: en.command }),
    }));
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "New File…", icon: <FilePlus className="w-3.5 h-3.5" />, onClick: () => handleCreateFile(rootPath) },
        { label: "New Folder…", icon: <FolderPlus className="w-3.5 h-3.5" />, onClick: () => handleCreateFolder(rootPath) },
        ...openItems,
        { label: "Customize…", icon: <ExternalLink className="w-3.5 h-3.5" />, onClick: () => onOpenSettings?.() },
        { label: "Refresh", icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: handleRefresh },
        { label: "Collapse All", icon: <ListCollapse className="w-3.5 h-3.5" />, onClick: handleCollapseAll },
      ]
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} onContextMenu={openContextForBackground}>
      {/* Toolbar — copia Orca FileExplorerToolbar */}
      <div className="flex h-8 min-h-8 items-center gap-1 border-b border-border px-2 shrink-0">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground" title={repoName}>{repoName}</span>
        <button type="button" onClick={handleCollapseAll} disabled={!canCollapseAll || !canRefresh} title="Collapse All" className={`p-1 rounded hover:bg-neutral-800 text-muted-foreground hover:text-foreground ${!canCollapseAll ? "opacity-50 cursor-not-allowed" : ""}`}>
          <ListCollapse className="size-3" />
        </button>
        <button type="button" onClick={handleRefresh} disabled={!canRefresh} title="Refresh Explorer" className={`p-1 rounded hover:bg-neutral-800 text-muted-foreground hover:text-foreground ${!canRefresh ? "opacity-50 cursor-not-allowed" : ""}`}>
          {loadingPath ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        </button>
        <div className="relative">
          <button type="button" onClick={() => setShowMoreMenu(!showMoreMenu)} title="More Explorer Actions" className="p-1 rounded hover:bg-neutral-800 text-muted-foreground hover:text-foreground">
            <Ellipsis className="size-3" />
          </button>
          {showMoreMenu && (
            <div className="absolute right-0 top-7 z-50 min-w-[14rem] rounded-md border border-border bg-popover p-1 shadow-xl text-popover-foreground">
              <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent rounded cursor-pointer">
                <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} className="accent-emerald-500" /> Show Dotfiles
              </label>
              <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent rounded cursor-pointer">
                <input type="checkbox" checked={showGitIgnored} onChange={e => setShowGitIgnored(e.target.checked)} className="accent-emerald-500" /> Show Git Ignored Files
              </label>
              <div className="h-px bg-border my-1" />
              <button onClick={() => { setShowMoreMenu(false); handleCreateFile(rootPath); }} className="w-full text-left px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent rounded">New File…</button>
              <button onClick={() => { setShowMoreMenu(false); handleCreateFolder(rootPath); }} className="w-full text-left px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent rounded">New Folder…</button>
              <div className="h-px bg-border my-1" />
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Open in</div>
              {getWorktreeOpenInEntries(openInApps ?? DEFAULT_OPEN_IN_APPLICATIONS, "File Manager").map(en => (
                <button
                  key={en.id}
                  onClick={() => { setShowMoreMenu(false); openWorktreePath({ target: en.target, worktreePath: rootPath, command: en.command }); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs text-popover-foreground hover:bg-accent"
                >
                  {en.target === "file-manager" ? <Folder className="w-3.5 h-3.5" /> : en.command ? <OpenInApplicationIcon application={{ command: en.command }} size={14} /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{en.target === "file-manager" ? "File Manager" : en.label}</span>
                </button>
              ))}
              <button onClick={() => { setShowMoreMenu(false); onOpenSettings?.(); }} className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded">Customize…</button>
            </div>
          )}
        </div>
      </div>

      {/* QueryStrip — ViewSwitch */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-sidebar shrink-0">
        <div className="flex rounded-md border border-border overflow-hidden text-[11px]">
          <button onClick={() => setView("files")} className={`px-2 py-1 ${view==="files" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Files</button>
          <button onClick={() => setView("search")} className={`px-2 py-1 ${view==="search" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Search</button>
        </div>
        <div className="flex-1 relative ml-1">
          {view === "files" ? (
            <>
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by name…" className="w-full bg-background border border-border rounded-md pl-7 pr-7 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              {filter && <button onClick={() => setFilter("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent text-muted-foreground"><X className="w-3 h-3" /></button>}
            </>
          ) : (
            <>
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key==="Enter") handleSearch(); }} placeholder="Search content… (rg)" className="w-full bg-background border border-border rounded-md pl-7 pr-7 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              {searchLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />}
            </>
          )}
        </div>
      </div>

      {view === "files" ? (
        <>
          {/* inline create (Orca FileExplorerInlineInputRow) */}
          {inlineInput && inlineInput.type !== 'rename' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-accent/40 border-b border-border shrink-0" style={{ paddingLeft: `${8 + inlineInput.depth * 14}px` }}>
              <File className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <input
                autoFocus
                value={inlineInput.value}
                onChange={e => setInlineInput(prev => prev ? { ...prev, value: e.target.value } : prev)}
                onKeyDown={e => { if (e.key==="Enter") handleInlineSubmit(); if (e.key==="Escape") handleInlineCancel(); }}
                onBlur={handleInlineSubmit}
                placeholder={inlineInput.type==='file' ? "filename" : "folder name"}
                className="flex-1 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground focus:outline-none"
              />
              <button onClick={handleInlineSubmit} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">OK</button>
              <button onClick={handleInlineCancel} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-white">Cancel</button>
            </div>
          )}
          <div
            ref={listRef}
            onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-sleek py-1"
            onDragOver={e => {
              e.preventDefault();
              const el = e.currentTarget as HTMLDivElement;
              const rect = el.getBoundingClientRect();
              if (e.clientY < rect.top + 40) el.scrollTop -= 20;
              else if (e.clientY > rect.bottom - 40) el.scrollTop += 20;
            }}
            onDrop={e => {
              e.preventDefault();
              if (!dragSrc || !rootPath) return;
              const name = dragSrc.split("/").pop() ?? "";
              const dest = rootPath + "/" + name;
              if (dest === dragSrc) return;
              invoke("rename_path_cmd", { oldPath: dragSrc, newPath: dest }).then(()=>handleRefresh()).catch(()=>{});
              setDragSrc(null); setDragOverPath(null);
            }}
            onDragLeave={() => setDragOverPath(null)}
          >
            {rows.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-neutral-500">{filter ? "No files matching filter" : loadingPath ? "Loading…" : "Empty directory"}</div>
            ) : (() => {
              const totalH = rows.length * ROW_H;
              const start = Math.max(0, Math.floor(scrollTop / ROW_H) - overscan);
              const end = Math.min(rows.length, Math.ceil((scrollTop + containerH) / ROW_H) + overscan);
              const visible = rows.slice(start, end);
              return (
                <div style={{ height: totalH, position: "relative" }}>
                  <div style={{ transform: `translateY(${start * ROW_H}px)` }}>
                    {visible.map(({ entry, depth, expanded, loading }) => {
                      const isSelected = selectedPath===entry.path || selectedPaths.has(entry.path);
                      const isRenaming = inlineInput?.type==='rename' && inlineInput.target===entry.path;
                      if (isRenaming) {
                        return (
                          <div key={entry.path} className="flex items-center gap-1 px-2 bg-accent/40 border border-ring/40" style={{ paddingLeft: `${8 + depth * 14}px`, height: ROW_H }}>
                            <FileIcon isDir={entry.is_dir} expanded={expanded} name={entry.name} />
                            <input
                              autoFocus
                              value={inlineInput!.value}
                              onChange={e => setInlineInput(prev => prev ? { ...prev, value: e.target.value } : prev)}
                              onKeyDown={e => { if (e.key==="Enter") handleInlineSubmit(); if (e.key==="Escape") handleInlineCancel(); }}
                              onBlur={handleInlineSubmit}
                              className="flex-1 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground focus:outline-none"
                            />
                          </div>
                        );
                      }
                      return (
                        <div
                          key={entry.path}
                          draggable
                          onDragStart={e => handleDragStart(e, entry.path)}
                          onDragEnd={() => { setDragSrc(null); setDragOverPath(null); }}
                          onDragOver={e => handleDragOver(e, entry.path, entry.is_dir)}
                          onDragLeave={() => setDragOverPath(null)}
                          onDrop={e => handleDrop(e, entry.path, entry.is_dir)}
                          onClick={e => {
                            // multi-select (Orca useFileExplorerSelection)
                            if (e.metaKey || e.ctrlKey) {
                              setSelectedPaths(prev => { const n=new Set(prev); if (n.has(entry.path)) n.delete(entry.path); else n.add(entry.path); return n; });
                              setSelectedPath(entry.path);
                            } else if (e.shiftKey && selectedPath) {
                              const flat = rows.map(r=>r.entry.path);
                              const a = flat.indexOf(selectedPath);
                              const b = flat.indexOf(entry.path);
                              if (a>=0 && b>=0) {
                                const [s,ex] = a<b ? [a,b] : [b,a];
                                setSelectedPaths(new Set(flat.slice(s, ex+1)));
                              }
                              setSelectedPath(entry.path);
                            } else {
                              setSelectedPath(entry.path);
                              setSelectedPaths(new Set([entry.path]));
                              toggleExpand(entry);
                            }
                          }}
                          onContextMenu={e => openContextForEntry(e, entry)}
                          className={`group flex items-center gap-1 px-2 cursor-pointer text-[12px] select-none ${isSelected ? "bg-accent text-foreground font-medium" : dragOverPath===entry.path ? "bg-amber-500/20 ring-1 ring-amber-500/30" : "hover:bg-accent/40 text-foreground/80 hover:text-foreground"}`}
                          style={{ paddingLeft: `${8 + depth * 14}px`, height: ROW_H, lineHeight: `${ROW_H}px` }}
                          title={entry.path}
                        >
                          {entry.is_dir ? (
                            <span className="shrink-0 text-neutral-500">{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>
                          ) : <span className="w-3 shrink-0" />}
                          <FileIcon isDir={entry.is_dir} expanded={expanded} name={entry.name} />
                          <span className={`truncate ${entry.is_dir ? "font-medium" : ""} ${isSelected ? "text-white" : entry.is_dir ? "text-neutral-300" : "text-neutral-400"}`}>{entry.name}</span>
                          {ignoredSet.has(entry.path) && <span className="ml-auto text-[9px] text-neutral-600 font-mono">ignored</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="px-2 py-1 border-t border-border text-[10px] text-muted-foreground font-mono bg-sidebar shrink-0">
            {rows.length}{rows.length>=5000 ? "+" : ""} items {filter ? `· filter: "${filter}"` : ""} {showHidden ? "· dotfiles" : ""} {!showGitIgnored ? "· no-ignored" : ""} · virtualized {selectedPaths.size>1 ? `· ${selectedPaths.size} selected` : ""} {dragSrc ? "· drag" : ""}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-sleek py-1">
          {searchLoading ? (
            <div className="px-3 py-6 text-center text-[11px] text-neutral-500 flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Searching via Rust rg…</div>
          ) : searchResults.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11px] text-neutral-500">{searchQuery.trim() ? "No matches — Rust backend respeita .gitignore" : "Type to search (ripgrep backend)"}</div>
          ) : (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-[10px] text-neutral-500 font-mono border-b border-[#222]">{searchResults.length} matches (max 100, Rust rg)</div>
              {searchResults.map((r, i) => (
                <div key={`${r.path}:${r.line}:${i}`} onClick={() => onOpenFile?.(r.path)} onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, items: [{ label:"Copy Path", icon:<Copy className="w-3.5 h-3.5" />, onClick:()=>navigator.clipboard.writeText(r.path)}]});}} className="px-2 py-1 hover:bg-accent/50 cursor-pointer group">
                  <div className="text-[11px] text-neutral-300 truncate"><span className="text-[#dcb67a]">{r.relative_path}</span><span className="text-neutral-500">:{r.line}:{r.col}</span></div>
                  <div className="text-[11px] font-mono text-neutral-400 truncate pl-2 border-l-2 border-neutral-700 ml-1">{r.text.trim()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {contextMenu && <CustomContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
    </div>
  );
}
