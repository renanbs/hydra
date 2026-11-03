import { MARINE_CREATURE_NAMES_PRIMARY } from './marine-creature-names-primary'
import { MARINE_CREATURE_NAMES_SECONDARY } from './marine-creature-names-secondary'

// Why shared: the auto-generated workspace name pool must be recognizable outside
// the renderer (create paths decide whether a generated branch name may be
// overwritten), so the pool lives with the other cross-surface data.
export const MARINE_CREATURES = [
  ...MARINE_CREATURE_NAMES_PRIMARY,
  ...MARINE_CREATURE_NAMES_SECONDARY
] as const
