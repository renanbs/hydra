// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SidebarFilter.tsx `searchRepos`
//
// Project filter search matches the displayed name and the checkout path, then ranks
// prefix hits above mid-string hits so typing "hydra" puts the project named hydra
// above /src/hydra-tools.
export type ProjectSearchCandidate = {
  id: string;
  name: string;
  displayName?: string | null;
  path: string;
};

function scoreField(value: string | null | undefined, query: string, weight: number): number {
  if (!value) return 0;
  const normalized = value.trim().toLowerCase();
  const index = normalized.indexOf(query);
  if (index === -1) return 0;
  return weight + 1 / (index + 1);
}

export function searchProjects<T extends ProjectSearchCandidate>(
  projects: readonly T[],
  rawQuery: string
): T[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return [...projects];
  }
  return projects
    .map((project) => ({
      project,
      score: Math.max(
        scoreField(project.displayName || project.name, query, 2),
        scoreField(project.name, query, 2),
        scoreField(project.path, query, 1)
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.project);
}
