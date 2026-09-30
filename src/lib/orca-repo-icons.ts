import { sanitizeRepoIcon, type RepoIcon } from "../shared/repo-icon";

function normalizeProjectPath(path: string): string {
  let normalized = path.replace(/\\/g, "/");
  while (normalized.endsWith("/") && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Glyphs saved in the Orca profile (`repo.repoIcon`), keyed by repo path.
 * Vite picks up `orca-repo-icon-index.json` when it is present so the running
 * dev window can paint them before the Tauri process is rebuilt. `list_projects`
 * is the source once that binary is current.
 */
export function loadBundledOrcaRepoIcons(): Record<string, RepoIcon> {
  const glob = (
    import.meta as unknown as {
      glob?: (
        pattern: string,
        options: { eager: true; import: "default" }
      ) => Record<string, unknown>;
    }
  ).glob;
  if (!glob) return {};
  const modules = glob("./orca-repo-icon-index.json", {
    eager: true,
    import: "default",
  });
  const raw = Object.values(modules)[0];
  if (!raw || typeof raw !== "object") return {};

  const icons: Record<string, RepoIcon> = {};
  for (const [path, value] of Object.entries(raw as Record<string, unknown>)) {
    const icon = sanitizeRepoIcon(value);
    if (!icon) continue;
    icons[normalizeProjectPath(path)] = icon;
  }
  return icons;
}

export function repoIconForPath(
  icons: Record<string, RepoIcon>,
  path: string
): RepoIcon | undefined {
  return icons[normalizeProjectPath(path)];
}

/** Git repo discovered under a folder the user added. Orca does not give that
 * child the origin avatar; the glyph stays on the folder. */
export function isDiscoveredFolderChild(
  path: string,
  projects: readonly { path: string; is_git: boolean }[]
): boolean {
  const key = normalizeProjectPath(path);
  return projects.some((project) => {
    if (project.is_git) return false;
    const root = normalizeProjectPath(project.path);
    return root !== key && key.startsWith(`${root}/`);
  });
}
