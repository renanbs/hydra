// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SidebarProjectFilterPanel.tsx
//
// Search + selection body of the Projects filter. Orca mounts this panel from the
// submenu, so the query dies with the panel instead of reopening onto a stale,
// pre-filtered list. Hydra's menu is not Radix, so the panel owns the keyboard
// contract Radix's `Command` would otherwise provide: ArrowUp/ArrowDown move the
// highlight, Enter selects, Backspace on an empty query removes the last pill, and
// every other key stays inside the input instead of reaching the menu's typeahead.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Server, X } from "lucide-react";
import type { HydraProject } from "./types";
import { searchProjects } from "./project-filter-search";

export type ProjectFilterPanelProps = {
  /** Projects that are NOT selected yet — the list the query narrows. */
  availableRepos: readonly HydraProject[];
  /** Selected projects, painted as removable pills above the query. */
  selectedRepos: readonly HydraProject[];
  hasRepoFilter: boolean;
  /** Controlled allow-list; empty means "no project filter". */
  filterRepoIds: readonly string[];
  setFilterRepoIds: (ids: string[]) => void;
};

/** The repo label Orca's `RepoBadgeLabel` renders: colour dot + display name. */
function RepoBadgeLabel({ project }: { project: HydraProject }) {
  return (
    <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: project.color || "#10b981" }}
      />
      <span className="truncate">{project.displayName || project.name}</span>
      {project.connectionId ? (
        <span
          data-project-filter-ssh-badge=""
          className="inline-flex shrink-0 items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[9px] font-medium leading-none text-muted-foreground"
        >
          <Server className="size-2.5" />
          SSH
        </span>
      ) : null}
    </span>
  );
}

function SelectedProjectPills({
  selectedRepos,
  onRemoveProject,
}: {
  selectedRepos: readonly HydraProject[];
  onRemoveProject: (repoId: string) => void;
}) {
  if (selectedRepos.length === 0) return null;
  return (
    <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto px-2 py-1">
      {selectedRepos.map((project) => (
        <span
          key={project.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] text-foreground"
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full"
            style={{ backgroundColor: project.color || "#10b981" }}
          />
          <span className="max-w-[8rem] truncate">{project.displayName || project.name}</span>
          <button
            type="button"
            aria-label={`Remove ${project.displayName || project.name} filter`}
            onClick={() => onRemoveProject(project.id)}
            className="ml-0.5 cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function SidebarProjectFilterPanel({
  availableRepos,
  selectedRepos,
  hasRepoFilter,
  filterRepoIds,
  setFilterRepoIds,
}: ProjectFilterPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [highlightedRepoId, setHighlightedRepoId] = useState<string | null>(null);

  // Why a frame and not `autoFocus`: this panel mounts inside a menu that traps
  // focus on commit, so an immediate focus call is yanked back to the trigger.
  // One frame later the menu's focus settling is done and this focus sticks.
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const filteredRepos = useMemo(
    () => searchProjects(availableRepos, query),
    [availableRepos, query]
  );

  const handleSelectRepo = useCallback(
    (repoId: string) => {
      if (!filterRepoIds.includes(repoId)) {
        setFilterRepoIds([...filterRepoIds, repoId]);
      }
      setHighlightedRepoId(null);
      setQuery("");
    },
    [filterRepoIds, setFilterRepoIds]
  );

  const handleRemoveProject = useCallback(
    (repoId: string) => {
      setFilterRepoIds(filterRepoIds.filter((id) => id !== repoId));
    },
    [filterRepoIds, setFilterRepoIds]
  );

  // Why the derived default: Orca's `Command` starts with its first match selected,
  // so the first ArrowDown steps to the SECOND row. Deriving instead of seeding
  // state keeps the highlight valid when the filtered list changes under it.
  const effectiveHighlightedRepoId = highlightedRepoId ?? filteredRepos[0]?.id ?? null;

  const moveHighlight = useCallback(
    (delta: 1 | -1) => {
      if (filteredRepos.length === 0) return;
      const currentId = highlightedRepoId ?? filteredRepos[0]?.id ?? null;
      const currentIndex = filteredRepos.findIndex((repo) => repo.id === currentId);
      const nextIndex = (currentIndex + delta + filteredRepos.length) % filteredRepos.length;
      setHighlightedRepoId(filteredRepos[nextIndex]?.id ?? null);
    },
    [filteredRepos, highlightedRepoId]
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && query) {
        // Orca: Escape clears a non-empty query first and keeps the menu open.
        event.stopPropagation();
        setQuery("");
        setHighlightedRepoId(null);
        return;
      }

      if (event.key === "Enter") {
        const highlighted =
          filteredRepos.find((repo) => repo.id === effectiveHighlightedRepoId) ??
          filteredRepos[0];
        if (highlighted) {
          event.preventDefault();
          event.stopPropagation();
          handleSelectRepo(highlighted.id);
        }
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        moveHighlight(event.key === "ArrowDown" ? 1 : -1);
        return;
      }

      if (event.key === "Backspace" && query === "" && selectedRepos.length > 0) {
        const last = selectedRepos[selectedRepos.length - 1];
        if (last) {
          event.preventDefault();
          event.stopPropagation();
          handleRemoveProject(last.id);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        // Why: only claim ArrowLeft while the caret still has somewhere to move,
        // otherwise keyboard users could not step back out of the panel.
        const { selectionStart, selectionEnd } = event.currentTarget;
        if (selectionStart !== 0 || selectionEnd !== 0) {
          event.stopPropagation();
        }
        return;
      }

      // Everything else stays in the search field instead of the menu typeahead.
      event.stopPropagation();
    },
    [
      effectiveHighlightedRepoId,
      filteredRepos,
      handleRemoveProject,
      handleSelectRepo,
      moveHighlight,
      query,
      selectedRepos,
    ]
  );

  const placeholder = selectedRepos.length > 0 ? "Add project..." : "Filter projects...";

  return (
    <div data-project-filter-panel="">
      <SelectedProjectPills selectedRepos={selectedRepos} onRemoveProject={handleRemoveProject} />
      <div className="px-1 py-1">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="sidebar-project-filter-list"
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              // Why: a new query builds a new list, so keyboard selection must
              // fall back to its first match instead of a row that moved away.
              setHighlightedRepoId(null);
              setQuery(event.target.value);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-muted/50 py-1 pl-2 pr-6 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            onClick={(event) => event.stopPropagation()}
          />
          {query ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setQuery("");
                setHighlightedRepoId(null);
                inputRef.current?.focus();
              }}
              aria-label="Clear project search"
              title="Clear project search"
              className="absolute right-1.5 top-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="size-2.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div
        id="sidebar-project-filter-list"
        role="listbox"
        aria-label="Projects"
        className="max-h-48 space-y-0.5 overflow-y-auto px-1"
      >
        {filteredRepos.length === 0 ? (
          <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">
            {hasRepoFilter ? "No unselected projects match" : "No projects match"}
          </div>
        ) : (
          filteredRepos.map((project) => {
            const isHighlighted = project.id === effectiveHighlightedRepoId;
            return (
              <button
                key={project.id}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                data-active-project={isHighlighted || undefined}
                onClick={() => handleSelectRepo(project.id)}
                onMouseEnter={() => setHighlightedRepoId(project.id)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] transition ${
                  isHighlighted
                    ? "bg-accent text-foreground ring-1 ring-ring/50"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <RepoBadgeLabel project={project} />
                {filterRepoIds.includes(project.id) ? (
                  <Check className="size-3 shrink-0 text-primary" strokeWidth={3} />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
