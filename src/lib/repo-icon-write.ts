// The repository-icon write path shared by the sidebar picker and App's project
// state. The picker patches App's `projects` immediately (the header redraws
// before the disk write lands); the catalog command then owns the truth and the
// authoritative `hydra:refresh-projects` replaces the optimistic row.
import type { RepoIcon } from "../shared/repo-icon";

/**
 * Optimistic echo for a project glyph: `{projectId, repoIcon}`. A failed write
 * re-emits the previous icon through this same event, so a header never keeps a
 * glyph the catalog refused.
 */
export const PROJECT_ICON_OPTIMISTIC_EVENT = "hydra:project-icon-optimistic";

/** Why there is no write for SSH/runtime projects: the catalog file is local,
 *  and remote projects keep their own on the host. Mirrors the create gate's
 *  disabled-entry pattern instead of writing a local row that paints nothing. */
export const REPO_ICON_REMOTE_DISABLED_REASON =
  "Project icons are stored on this computer; remote projects keep theirs on the host";

export type ProjectIconSelection = { emoji: string; label: string };

/** Curated grid: the common repo identities, each with an accessible name. */
export const REPO_ICON_EMOJI_CHOICES: readonly ProjectIconSelection[] = [
  { emoji: "🚀", label: "Rocket" },
  { emoji: "📦", label: "Package" },
  { emoji: "💻", label: "Terminal" },
  { emoji: "🤖", label: "Robot" },
  { emoji: "🌐", label: "Globe" },
  { emoji: "🗄️", label: "Database" },
  { emoji: "🛠️", label: "Tools" },
  { emoji: "🎨", label: "Palette" },
  { emoji: "📚", label: "Library" },
  { emoji: "📊", label: "Chart" },
  { emoji: "✨", label: "Sparkles" },
  { emoji: "🧩", label: "Puzzle" },
];

export interface ProjectIconOptimisticDetail {
  projectId: string;
  repoIcon: RepoIcon | null;
}

/**
 * Applies a glyph to one project row. Structural type (not `HydraProject`) so
 * App's state and unit tests share the function without importing the sidebar.
 */
export function applyRepoIconToProjects<T extends { id: string; repo_icon?: RepoIcon | null }>(
  projects: readonly T[],
  projectId: string,
  repoIcon: RepoIcon | null
): T[] {
  return projects.map((project) =>
    project.id === projectId ? { ...project, repo_icon: repoIcon } : project
  );
}

/**
 * App's `PROJECT_ICON_OPTIMISTIC_EVENT` listener body: `null` means the event
 * carries no project (a malformed or unrelated dispatch), so the caller keeps
 * its current list instead of re-rendering it.
 */
export function applyProjectIconEvent<T extends { id: string; repo_icon?: RepoIcon | null }>(
  projects: readonly T[],
  event: Event
): T[] | null {
  const detail = (event as CustomEvent<ProjectIconOptimisticDetail | undefined>).detail;
  if (!detail?.projectId) return null;
  return applyRepoIconToProjects(projects, detail.projectId, detail.repoIcon ?? null);
}
