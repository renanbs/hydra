// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-list/rows/item-row.tsx
// (`getWorktreeItemRowGeometry`).
//
// The worktree card's geometry differs three ways: a plain grouped row, a lineage
// child inheriting its parent's surface, and a row inside a folder-backed project
// group. Keeping the three in one projection means the painted row and the drag
// preview cannot drift (D03a-079/D03a-080).
import type { WorktreeGroupBy } from '../grouping/row-types'
import type { WorktreeRow } from '../grouping/row-types'
import {
  getFolderBackedRepoWorktreeCardContentIndent,
  getFolderBackedRepoWorktreeCardSurfaceInset,
  getLineageNestedRowGeometry,
  getWorktreeCardContentIndent,
  getWorktreeCardSurfaceInset,
  LINEAGE_CHILDREN_INLINE_OFFSET
} from './indentation'

export type WorktreeItemRowGeometry = {
  surfaceInset: number
  cardContentIndent: number
  lineageChildrenInlineOffset: number
}

export function getWorktreeItemRowGeometry(args: {
  row: Pick<WorktreeRow, 'depth' | 'groupDepth'>
  groupBy: WorktreeGroupBy
  experimentalNewWorktreeCardStyle: boolean
  isFolderBackedRepoChild: boolean
}): WorktreeItemRowGeometry {
  const { row, groupBy, isFolderBackedRepoChild } = args
  const nested = row.depth > 0
  const paddingDepth = nested ? Math.max(0, row.depth - 1) : row.depth
  const getCardContentIndent = (lineageDepth: number): number =>
    isFolderBackedRepoChild
      ? getFolderBackedRepoWorktreeCardContentIndent({
          groupDepth: row.groupDepth,
          lineageDepth
        })
      : getWorktreeCardContentIndent({
          isGrouped: groupBy !== 'none',
          groupDepth: row.groupDepth,
          lineageDepth
        })
  const nestedLineageGeometry = nested
    ? getLineageNestedRowGeometry({
        experimentalNewWorktreeCardStyle: args.experimentalNewWorktreeCardStyle,
        inheritedCardContentIndent: getCardContentIndent(0),
        lineageDepth: row.depth
      })
    : null
  // Why: grouped rows inherit their header depth, but the card surface still spans the full row.
  const paddingLeft =
    nested && groupBy !== 'none'
      ? getWorktreeCardContentIndent({
          isGrouped: false,
          groupDepth: row.groupDepth,
          lineageDepth: paddingDepth
        })
      : getCardContentIndent(paddingDepth)
  const surfaceInset = nestedLineageGeometry
    ? nestedLineageGeometry.surfaceInset
    : isFolderBackedRepoChild
      ? getFolderBackedRepoWorktreeCardSurfaceInset({
          groupDepth: row.groupDepth,
          lineageDepth: paddingDepth
        })
      : getWorktreeCardSurfaceInset({
          isGrouped: groupBy !== 'none',
          groupDepth: row.groupDepth
        })
  return {
    surfaceInset,
    cardContentIndent: nestedLineageGeometry
      ? nestedLineageGeometry.cardContentIndent
      : Math.max(0, paddingLeft - surfaceInset),
    lineageChildrenInlineOffset:
      nestedLineageGeometry?.lineageChildrenInlineOffset ?? LINEAGE_CHILDREN_INLINE_OFFSET
  }
}
