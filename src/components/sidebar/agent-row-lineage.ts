// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/dashboard/agent-row-lineage.ts
import { buildAgentRowLineageTree } from './agent-row-lineage-model'
import type {
  AgentRowLineagePresentation,
  WorktreeAgentRow,
  WorktreeAgentRowWithLineage
} from './worktree-agent-row-types'

const ROOT_LINEAGE: AgentRowLineagePresentation = {
  depth: 0,
  isFirstSibling: true,
  isLastSibling: true,
  childCount: 0
}

export function applyAgentRowLineage(
  rows: WorktreeAgentRow[]
): WorktreeAgentRowWithLineage[] {
  if (rows.length <= 1) {
    return rows.map((row) => ({ ...row, lineage: ROOT_LINEAGE }))
  }

  const { rootRows, childrenByParentPaneKey, childPaneKeys } = buildAgentRowLineageTree(rows)

  if (childPaneKeys.size === 0) {
    return rows.map((row) => ({ ...row, lineage: ROOT_LINEAGE }))
  }

  const ordered: WorktreeAgentRowWithLineage[] = []
  const emitted = new Set<string>()
  const emitRow = (row: WorktreeAgentRow, lineage: AgentRowLineagePresentation): boolean => {
    if (emitted.has(row.paneKey)) {
      return false
    }
    emitted.add(row.paneKey)
    ordered.push({ ...row, lineage })
    return true
  }

  const emitSubtree = (row: WorktreeAgentRow, lineage: AgentRowLineagePresentation): void => {
    const children = childrenByParentPaneKey.get(row.paneKey) ?? []
    if (!emitRow(row, { ...lineage, childCount: children.length })) {
      return
    }
    children.forEach((child, index) => {
      emitSubtree(child, {
        // Why: nested dispatches should still stay under their nearest
        // visible parent, but visual depth remains capped so dense sidebar
        // rows don't lose too much prompt width.
        depth: 1,
        parentPaneKey: row.paneKey,
        isFirstSibling: index === 0,
        isLastSibling: index === children.length - 1,
        childCount: 0
      })
    })
  }

  for (const row of rootRows) {
    emitSubtree(row, ROOT_LINEAGE)
  }

  for (const row of rows) {
    emitRow(row, ROOT_LINEAGE)
  }

  return ordered
}

export function dashboardCardParentPaneKey(row: WorktreeAgentRowWithLineage): string | undefined {
  const directParentPaneKey = row.entry.orchestration?.parentPaneKey
  return (
    row.lineage.parentPaneKey ??
    (directParentPaneKey === row.paneKey ? undefined : directParentPaneKey)
  )
}
