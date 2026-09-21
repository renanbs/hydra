import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  ExternalLink,
  FolderPlus,
  GitBranchPlus,
  Star,
  X,
} from "lucide-react";
import { ShortcutKeyCombo } from "./ShortcutKeyCombo";
import hydraLogo from "../assets/hydra-logo.svg";

const HYDRA_GITHUB_URL = "https://github.com/renanbs/hydra";

export type LandingStarState = "loading" | "starred" | "not-starred" | "web-fallback" | "hidden";

interface PreflightIssue {
  id: string;
  title: string;
  description: string;
  fixLabel: string;
  fixUrl: string;
  dismissible?: boolean;
}

interface PreflightStatusResult {
  git_installed: boolean;
  gh_installed: boolean;
  gh_authenticated: boolean;
}

function PreflightBanner({ issues }: { issues: PreflightIssue[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("hydra:dismissedPreflight");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const visibleIssues = issues.filter((issue) => !dismissed.has(issue.id));
  if (visibleIssues.length === 0) {
    return null;
  }

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem("hydra:dismissedPreflight", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };
  return (
    <div className="w-full max-w-sm space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
      {visibleIssues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-start gap-3 rounded-md px-1 py-1.5 first:pt-0 last:pb-0"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500/70" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[13px] font-medium leading-snug text-foreground">{issue.title}</p>
            <p className="text-xs leading-snug text-muted-foreground">{issue.description}</p>
            <button
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline cursor-pointer"
              onClick={() => invoke("open_external_url_cmd", { url: issue.fixUrl }).catch(() => window.open(issue.fixUrl, "_blank"))}
            >
              {issue.fixLabel}
              <ExternalLink className="size-3" />
            </button>
          </div>
          {issue.dismissible && (
            <button
              className="-mr-1 -mt-0.5 shrink-0 rounded p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              onClick={() => dismiss(issue.id)}
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function GitHubStarButton({ hasProjects }: { hasProjects: boolean }) {
  const [state, setState] = useState<LandingStarState>(() => {
    try {
      if (localStorage.getItem("hydra:hideStarButton") === "true") {
        return "hidden";
      }
    } catch {}
    return "loading";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (state === "hidden") return;
    let cancelled = false;
    invoke<boolean | null>("check_github_starred_cmd", { repo: "renanbs/hydra" })
      .then((res) => {
        if (cancelled) return;
        if (res === null) {
          setState("web-fallback");
        } else {
          setState(res ? "starred" : "not-starred");
        }
      })
      .catch(() => {
        if (!cancelled) setState("web-fallback");
      });

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const handleClick = async () => {
    if (state === "starred") {
      setMenuOpen((v) => !v);
      return;
    }
    if (state === "web-fallback") {
      invoke("open_external_url_cmd", { url: HYDRA_GITHUB_URL }).catch(() => window.open(HYDRA_GITHUB_URL, "_blank"));
      return;
    }
    if (state !== "not-starred") return;

    setState("starred"); // optimistic
    try {
      const ok = await invoke<boolean>("star_github_repo_cmd", { repo: "renanbs/hydra" });
      if (!ok) {
        setState("web-fallback");
      }
    } catch {
      setState("web-fallback");
    }
  };

  if (state === "hidden" || (state === "starred" && hasProjects)) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ${
          state === "loading"
            ? "pointer-events-none opacity-0"
            : state !== "starred"
            ? "cursor-pointer border-amber-500/60 text-amber-700 hover:border-amber-500/80 hover:bg-amber-400/10 dark:border-amber-400/30 dark:text-amber-300/90 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/[0.08]"
            : "cursor-pointer border-amber-500/50 bg-amber-400/10 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/[0.06] dark:text-amber-400/60"
        }`}
        onClick={handleClick}
        onContextMenu={(event) => {
          if (state === "starred") {
            event.preventDefault();
            setMenuOpen(true);
          }
        }}
        disabled={state === "loading"}
      >
        {state === "web-fallback" ? (
          <ExternalLink className="size-3.5 text-amber-600 transition-all duration-300 dark:text-amber-400/80" />
        ) : (
          <Star
            className={`size-3.5 transition-all duration-300 ${
              state === "starred"
                ? "fill-amber-500/70 text-amber-500/70 dark:fill-amber-400/60 dark:text-amber-400/60"
                : "text-amber-600 dark:text-amber-400/80"
            }`}
          />
        )}
        {state === "starred"
          ? "Starred on GitHub"
          : "Star on GitHub"}
      </button>
      {state === "starred" && menuOpen && (
        <div className="absolute right-0 bottom-[calc(100%+4px)] z-10 min-w-[100px] rounded-md border border-border bg-popover py-1 shadow-2xl">
          <button
            className="w-full px-3 py-1.5 text-left text-[13px] text-foreground hover:bg-muted cursor-pointer"
            onClick={() => {
              setMenuOpen(false);
              setState("hidden");
              try {
                localStorage.setItem("hydra:hideStarButton", "true");
              } catch {}
            }}
          >
            Hide
          </button>
        </div>
      )}
    </div>
  );
}

interface LandingProps {
  hasProjects: boolean;
  onAddProject: () => void;
  onCreateWorktree: () => void;
  onNavigateWorkspace?: (direction: "up" | "down") => void;
  onNewTab?: () => void;
  createTargetLabel?: string;
}

export function Landing({
  hasProjects,
  onAddProject,
  onCreateWorktree,
  onNavigateWorkspace,
  onNewTab,
  createTargetLabel = "worktree",
}: LandingProps) {
  const [preflightIssues, setPreflightIssues] = useState<PreflightIssue[]>([]);

  useEffect(() => {
    let cancelled = false;
    invoke<PreflightStatusResult>("check_preflight_tools_cmd")
      .then((status) => {
        if (cancelled) return;
        const issues: PreflightIssue[] = [];
        if (!status.git_installed) {
          issues.push({
            id: "git",
            title: "Git is not installed",
            description: "Git is required for Git projects, source control, and workspace management.",
            fixLabel: "Install Git",
            fixUrl: "https://git-scm.com/downloads",
          });
        }
        if (!status.gh_installed) {
          issues.push({
            id: "gh",
            title: "GitHub CLI is not installed",
            description: "Hydra uses the GitHub CLI (gh) to show pull requests, issues, and checks.",
            fixLabel: "Install GitHub CLI",
            fixUrl: "https://cli.github.com",
            dismissible: true,
          });
        } else if (!status.gh_authenticated) {
          issues.push({
            id: "gh-auth",
            title: "GitHub CLI is not authenticated",
            description: 'Run "gh auth login" in a terminal to connect your GitHub account.',
            fixLabel: "Learn more",
            fixUrl: "https://cli.github.com/manual/gh_auth_login",
            dismissible: true,
          });
        }
        setPreflightIssues(issues);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
  const modKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = useMemo(
    () => [
      {
        id: "create",
        action: `Create ${createTargetLabel.toLowerCase()}`,
        keys: [modKey, "N"],
        onClick: onCreateWorktree,
      },
      ...(onNewTab
        ? [
            {
              id: "terminal",
              action: "New terminal",
              keys: [modKey, "T"],
              onClick: onNewTab,
            },
          ]
        : []),
      {
        id: "up",
        action: "Move up workspace",
        keys: [modKey, "Shift", "↑"],
        onClick: () => onNavigateWorkspace?.("up"),
      },
      {
        id: "down",
        action: "Move down workspace",
        keys: [modKey, "Shift", "↓"],
        onClick: () => onNavigateWorkspace?.("down"),
      },
    ],
    [createTargetLabel, modKey, onCreateWorktree, onNewTab, onNavigateWorkspace]
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background select-none">
      <div className="w-full max-w-lg px-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <div
            className="flex items-center justify-center size-20 rounded-2xl border border-emerald-500/30 shadow-lg shadow-black/60 overflow-hidden"
            style={{ backgroundColor: "#020a08" }}
          >
            <img
              src={hydraLogo}
              alt="Hydra logo"
              className="size-16 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            HYDRA
          </h1>

          {preflightIssues.length > 0 && <PreflightBanner issues={preflightIssues} />}

          <p className="text-sm text-muted-foreground text-center">
            {hasProjects
              ? "Select a workspace from the sidebar to begin."
              : "Add a project to get started."}
          </p>

          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            <button
              className="inline-flex items-center gap-1.5 bg-secondary/70 border border-border/80 text-foreground font-medium text-sm px-4 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
              onClick={onAddProject}
            >
              <FolderPlus className="size-3.5" />
              Add project
            </button>

            <button
              className="inline-flex items-center gap-1.5 bg-secondary/70 border border-border/80 text-foreground font-medium text-sm px-4 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
              onClick={onCreateWorktree}
            >
              <GitBranchPlus className="size-3.5" />
              Create {createTargetLabel.toLowerCase()}
            </button>
          </div>

          <div className="mt-6 w-full max-w-xs space-y-1.5">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                onClick={shortcut.onClick}
                className="w-full grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/60 text-left transition-colors cursor-pointer group"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {shortcut.action}
                </span>
                <ShortcutKeyCombo
                  keys={shortcut.keys}
                  separatorClassName="mx-0.5 text-[10px] text-muted-foreground"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <GitHubStarButton hasProjects={hasProjects} />
      </div>
    </div>
  );
}
