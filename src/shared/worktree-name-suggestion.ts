import { MARINE_CREATURES } from './marine-creatures'
import { clampExhaustedTiers, creatureNameAtTier } from './worktree/retired-name-registry'

/** Shared selection core for generated workspace names.
 *
 *  Both sources of a suggestion (the new-workspace composer and any bulk create
 *  path) must agree: dedupe on the on-disk directory basename, lowercase to match
 *  the branch convention, and degrade to suffixed tiers instead of recycling a
 *  spent name. Callers assemble the used set themselves because they source it
 *  differently and retired names arrive from a different place. */

export function normalizeSuggestedName(name: string): string {
  return name.trim().toLowerCase()
}

function stripTrailingSeparators(path: string): string {
  return path.replace(/[\\/]+$/, '')
}

/** Cross-platform basename: worktree paths can be POSIX, Windows, or SSH-host
 *  paths, and the collision that matters is the directory name rather than the
 *  user-facing display name. */
export function suggestionPathBasename(path: string): string {
  const normalized = stripTrailingSeparators(path)
  const index = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  return index === -1 ? normalized : normalized.slice(index + 1)
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

/** Picks a name no one has taken, at random rather than in list order so fresh
 *  workspaces don't all start at the same creature and march down the list.
 *
 *  `usedNames` must include retired names as well as live ones. A name whose
 *  workspace was deleted still owns its old directory path in any agent CLI that
 *  keys conversation state by cwd, so reissuing it hands the next occupant
 *  someone else's history. Once every base name is spent the pool degrades to
 *  `name-2`, `name-3`, and those variants are equally subject to retirement.
 *
 *  `exhaustedTiers` is the retirement registry's compaction watermark: a tier it
 *  folds away is absent from `usedNames` precisely because every name in it is
 *  spent, so it must be skipped rather than looked up. */
export function selectSuggestedCreatureName(
  usedNames: Iterable<string>,
  random: () => number = Math.random,
  exhaustedTiers = 0
): string {
  const used = new Set<string>()
  for (const name of usedNames) {
    used.add(normalizeSuggestedName(name))
  }

  let tier = clampExhaustedTiers(exhaustedTiers) + 1
  while (true) {
    const available = MARINE_CREATURES.map((name) =>
      creatureNameAtTier(normalizeSuggestedName(name), tier)
    ).filter((name) => !used.has(name))
    if (available.length > 0) {
      return pickRandom(available, random)
    }
    tier += 1
  }
}
