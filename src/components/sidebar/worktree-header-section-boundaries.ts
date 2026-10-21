// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-header-section-boundaries.ts
//
// The sidebar needs each repo/group header's section end (in estimated virtual-row
// pixels) for header drag previews. Indexing the headers and their bucket successors
// once keeps the pass linear instead of a full row scan per header.
import { estimateRenderRowSize } from "./worktree-list/viewport/virtual-rows";
import type { HostSectionRow } from "./host-section-rows";
import type { GroupHeaderRow } from "./worktree-list/grouping/row-types";

const UNGROUPED_BUCKET = "ungrouped";

function buildRowStarts(rows: readonly HostSectionRow[], firstHeaderIndex: number): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (let index = 0; index < rows.length; index++) {
    starts[index] = offset;
    offset += estimateRenderRowSize(rows, index, firstHeaderIndex);
  }
  starts[rows.length] = offset;
  return starts;
}

function indexHeadersBy(
  rows: readonly HostSectionRow[],
  keyOf: (row: GroupHeaderRow) => string | null | undefined
): Map<string, number> {
  const indexByKey = new Map<string, number>();
  rows.forEach((row, index) => {
    const key = row.type === "header" ? keyOf(row) : undefined;
    if (typeof key === "string" && !indexByKey.has(key)) {
      indexByKey.set(key, index);
    }
  });
  return indexByKey;
}

function indexSuccessors(idsByBucket: ReadonlyMap<string, readonly string[]>): Map<string, Map<string, string>> {
  const successorByBucket = new Map<string, Map<string, string>>();
  for (const [bucketKey, ids] of idsByBucket) {
    const successors = new Map<string, string>();
    ids.forEach((id, index) => {
      const next = ids[index + 1];
      if (next !== undefined && !successors.has(id)) {
        successors.set(id, next);
      }
    });
    successorByBucket.set(bucketKey, successors);
  }
  return successorByBucket;
}

function repoBucketOf(row: GroupHeaderRow): string {
  return row.repo?.projectGroupId ? `group:${row.repo.projectGroupId}` : UNGROUPED_BUCKET;
}

function nextHeaderIndex(rows: readonly HostSectionRow[], startIndex: number): number {
  for (let index = startIndex; index < rows.length; index++) {
    const row = rows[index];
    if (row?.type === "header" || row?.type === "host-header") {
      return index;
    }
  }
  return rows.length;
}

function projectGroupSectionEndIndex(
  rows: readonly HostSectionRow[],
  startIndex: number,
  depth: number
): number {
  for (let index = startIndex; index < rows.length; index++) {
    const row = rows[index];
    if (!row) continue;
    if (row.type === "host-header") return index;
    if (row.type !== "header") continue;
    const rowDepth = row.projectGroupDepth ?? 0;
    if (rowDepth <= depth || (!row.repo && !row.projectGroup)) {
      return index;
    }
  }
  return rows.length;
}

export type HeaderSectionBounds = {
  repoSectionEndByRepoId: Map<string, number>;
  projectGroupSectionEndByGroupId: Map<string, number>;
};

export function computeHeaderSectionBounds(args: {
  rows: readonly HostSectionRow[];
  firstHeaderIndex: number;
}): HeaderSectionBounds {
  const { rows, firstHeaderIndex } = args;
  const rowStarts = buildRowStarts(rows, firstHeaderIndex);
  const repoHeaderIndexByRepoId = indexHeadersBy(rows, (row) => row.repo?.id);
  const groupHeaderIndexByGroupId = indexHeadersBy(rows, (row) =>
    row.repo ? undefined : row.projectGroup?.id
  );

  const repoIdsByBucket = new Map<string, string[]>();
  const repoBucketByRepoId = new Map<string, string>();
  const groupIdsByDepthBucket = new Map<string, string[]>();
  const groupBucketByGroupId = new Map<string, string>();
  const groupStack: (string | null)[] = [];

  for (const row of rows) {
    if (row.type !== "header") continue;
    if (row.repo) {
      const bucket = repoBucketOf(row);
      repoBucketByRepoId.set(row.repo.id, bucket);
      const ids = repoIdsByBucket.get(bucket) ?? [];
      ids.push(row.repo.id);
      repoIdsByBucket.set(bucket, ids);
      continue;
    }
    const groupId =
      row.projectGroup && typeof row.projectGroup.id === "string" ? row.projectGroup.id : null;
    if (!groupId) continue;
    const depth = row.projectGroupDepth ?? 0;
    const parentId = depth > 0 ? (groupStack[depth - 1] ?? null) : null;
    const bucket = parentId ? `parent:${parentId}` : "root";
    groupBucketByGroupId.set(groupId, bucket);
    const ids = groupIdsByDepthBucket.get(bucket) ?? [];
    ids.push(groupId);
    groupIdsByDepthBucket.set(bucket, ids);
    groupStack[depth] = groupId;
  }

  const repoSuccessors = indexSuccessors(repoIdsByBucket);
  const groupSuccessors = indexSuccessors(groupIdsByDepthBucket);
  const repoSectionEndByRepoId = new Map<string, number>();
  const projectGroupSectionEndByGroupId = new Map<string, number>();

  rows.forEach((row, index) => {
    if (row.type !== "header") return;
    if (row.repo) {
      const bucket = repoBucketByRepoId.get(row.repo.id);
      const nextRepoId = bucket ? repoSuccessors.get(bucket)?.get(row.repo.id) : undefined;
      const endIndex = nextRepoId
        ? (repoHeaderIndexByRepoId.get(nextRepoId) ?? -1)
        : nextHeaderIndex(rows, index + 1);
      repoSectionEndByRepoId.set(
        row.repo.id,
        rowStarts[endIndex >= 0 ? endIndex : rows.length] ?? rowStarts[rows.length] ?? 0
      );
      return;
    }
    const groupId =
      row.projectGroup && typeof row.projectGroup.id === "string" ? row.projectGroup.id : null;
    if (!groupId) return;
    const bucket = groupBucketByGroupId.get(groupId);
    const nextGroupId = bucket ? groupSuccessors.get(bucket)?.get(groupId) : undefined;
    const endIndex = nextGroupId
      ? (groupHeaderIndexByGroupId.get(nextGroupId) ?? -1)
      : projectGroupSectionEndIndex(rows, index + 1, row.projectGroupDepth ?? 0);
    projectGroupSectionEndByGroupId.set(
      groupId,
      rowStarts[endIndex >= 0 ? endIndex : rows.length] ?? rowStarts[rows.length] ?? 0
    );
  });

  return { repoSectionEndByRepoId, projectGroupSectionEndByGroupId };
}
