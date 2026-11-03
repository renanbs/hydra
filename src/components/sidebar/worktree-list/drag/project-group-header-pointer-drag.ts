// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Sources: project-group-header-drop.ts, project-group-header-drag-contract.ts,
// project-group-header-drag-start.ts, project-group-header-drag.ts,
// project-group-header-drag-commit.ts
//
// Project-group headers reorder inside their parent bucket (siblings share a parent group).
// The drop writes discrete tabOrder values for every sibling, because legacy groups can all
// carry tabOrder 0 and a single midpoint update cannot express an insertion in that block.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ProjectGroup } from "../../../../shared/project-group-types";
import {
  computeWorktreeSidebarHeaderDropPreview,
  type WorktreeSidebarHeaderDropPreview,
} from "../../worktree-sidebar-header-drop-preview";
import { getWorktreeSidebarDragAutoscroll } from "../../worktree-sidebar-drag-autoscroll";
import {
  hasPointerBeenReleased,
  isHeaderDragPromoted,
  swallowNextClickOnDragHandle,
  type HeaderDragTimeoutHandle,
} from "./header-pointer-session";
import {
  isProjectGroupHeaderActionTarget,
  isProjectGroupHeaderDragHandleTarget
} from "../../project-group-header-drag-contract";
import type { Row } from "../grouping/row-types";

export type ProjectGroupHeaderDragBucketKey = string;

export type ProjectGroupHeaderDragRect = {
  groupId: string;
  bucketKey: ProjectGroupHeaderDragBucketKey;
  /** Index among sibling group headers in the row model, not the mounted DOM subset. */
  headerIndex: number;
  top: number;
  bottom: number;
  sectionBottom?: number;
};

export type ProjectGroupTabOrderUpdate = { groupId: string; tabOrder: number };

const ROOT_PROJECT_GROUP_HEADER_BUCKET = "root";
type SidebarProjectGroupHeader = ProjectGroup | { id: null } | undefined;

function isConcreteProjectGroup(
  projectGroup: SidebarProjectGroupHeader
): projectGroup is ProjectGroup {
  return typeof projectGroup?.id === "string";
}

export function getProjectGroupHeaderDragBucketKey(
  group: Pick<ProjectGroup, "parentGroupId">,
  projectGroupById?: ReadonlyMap<string, ProjectGroup>
): ProjectGroupHeaderDragBucketKey {
  const parentGroupId = group.parentGroupId ?? null;
  if (!parentGroupId) {
    return ROOT_PROJECT_GROUP_HEADER_BUCKET;
  }
  // Why: an orphaned parent id falls back to the root bucket the row pipeline paints.
  if (projectGroupById && !projectGroupById.has(parentGroupId)) {
    return ROOT_PROJECT_GROUP_HEADER_BUCKET;
  }
  return `parent:${parentGroupId}`;
}

export function getSidebarOrderedProjectGroupHeaderIdsByBucket(
  rows: readonly Row[],
  projectGroupById?: ReadonlyMap<string, ProjectGroup>
): Map<ProjectGroupHeaderDragBucketKey, string[]> {
  const buckets = new Map<ProjectGroupHeaderDragBucketKey, string[]>();
  for (const row of rows) {
    if (row.type !== "header" || row.repo || !isConcreteProjectGroup(row.projectGroup)) {
      continue;
    }
    const bucketKey = getProjectGroupHeaderDragBucketKey(row.projectGroup, projectGroupById);
    const list = buckets.get(bucketKey) ?? [];
    list.push(row.projectGroup.id);
    buckets.set(bucketKey, list);
  }
  return buckets;
}

export function mapSidebarProjectGroupDropIndexToSiblingInsertIndex(args: {
  sidebarDropIndex: number;
  sourceIndex: number;
  siblingCount: number;
}): number {
  // Why: drop indices include the dragged header; tabOrder is computed against the
  // sibling list after that header is removed.
  const adjusted =
    args.sourceIndex >= 0 && args.sidebarDropIndex > args.sourceIndex
      ? args.sidebarDropIndex - 1
      : args.sidebarDropIndex;
  return Math.max(0, Math.min(args.siblingCount, adjusted));
}

export function getProjectGroupTabOrderUpdatesForSidebarDrop(args: {
  sidebarProjectGroupHeaderIds: readonly string[];
  draggedGroupId: string;
  sidebarDropIndex: number;
  projectGroupById: ReadonlyMap<string, ProjectGroup>;
}): ProjectGroupTabOrderUpdate[] {
  const sourceIndex = args.sidebarProjectGroupHeaderIds.indexOf(args.draggedGroupId);
  if (sourceIndex === -1) {
    return [];
  }
  const siblingIds = args.sidebarProjectGroupHeaderIds.filter(
    (groupId) => groupId !== args.draggedGroupId
  );
  const siblingDropIndex = mapSidebarProjectGroupDropIndexToSiblingInsertIndex({
    sidebarDropIndex: args.sidebarDropIndex,
    sourceIndex,
    siblingCount: siblingIds.length,
  });
  const sourceIndexInSiblings = Math.min(sourceIndex, siblingIds.length);
  if (siblingDropIndex === sourceIndexInSiblings) {
    return [];
  }
  const orderedIds = siblingIds.slice();
  orderedIds.splice(siblingDropIndex, 0, args.draggedGroupId);
  const updates: ProjectGroupTabOrderUpdate[] = [];
  for (const [index, groupId] of orderedIds.entries()) {
    const group = args.projectGroupById.get(groupId);
    if (!group) continue;
    // Why every sibling: equal legacy ranks cannot express a single midpoint insertion.
    if (group.tabOrder !== index) {
      updates.push({ groupId, tabOrder: index });
    }
  }
  return updates;
}

function getVirtualRowStart(virtualRow: HTMLElement | null): number | null {
  if (!virtualRow) return null;
  const raw = virtualRow.getAttribute("data-worktree-virtual-row-start");
  if (raw === null) return null;
  const start = Number(raw);
  return Number.isFinite(start) ? start : null;
}

function getOptionalNumberAttribute(
  element: HTMLElement,
  attribute: string
): number | undefined {
  const raw = element.getAttribute(attribute);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function measureProjectGroupHeaderDragRects(
  container: HTMLElement,
  bucketKey?: ProjectGroupHeaderDragBucketKey
): ProjectGroupHeaderDragRect[] {
  const containerRect = container.getBoundingClientRect();
  const rects: ProjectGroupHeaderDragRect[] = [];
  container.querySelectorAll<HTMLElement>("[data-project-group-header-id]").forEach((element) => {
    const groupId = element.getAttribute("data-project-group-header-id");
    const elementBucketKey = element.getAttribute("data-project-group-header-bucket");
    const rawIndex = element.getAttribute("data-project-group-header-index");
    const headerIndex = rawIndex === null ? Number.NaN : Number(rawIndex);
    if (!groupId || !elementBucketKey || !Number.isFinite(headerIndex)) {
      return;
    }
    if (bucketKey !== undefined && elementBucketKey !== bucketKey) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const virtualRow = element.closest<HTMLElement>("[data-worktree-virtual-row]");
    const virtualRowStart = getVirtualRowStart(virtualRow);
    const top =
      virtualRow && virtualRowStart !== null
        ? virtualRowStart + rect.top - virtualRow.getBoundingClientRect().top
        : rect.top - containerRect.top + container.scrollTop;
    rects.push({
      groupId,
      bucketKey: elementBucketKey,
      headerIndex,
      top,
      bottom: top + rect.height,
      sectionBottom: getOptionalNumberAttribute(element, "data-project-group-header-section-end"),
    });
  });
  rects.sort((left, right) => left.top - right.top);
  return rects;
}

export function computeProjectGroupHeaderDropPreview(args: {
  pointerY: number;
  containerTop: number;
  scrollTop: number;
  rects: readonly ProjectGroupHeaderDragRect[];
  sidebarProjectGroupHeaderIds: readonly string[];
  contentBottom?: number;
}): WorktreeSidebarHeaderDropPreview | null {
  return computeWorktreeSidebarHeaderDropPreview({
    pointerY: args.pointerY,
    containerTop: args.containerTop,
    scrollTop: args.scrollTop,
    rects: args.rects,
    headerCount: args.sidebarProjectGroupHeaderIds.length,
    getId: (rect) => rect.groupId,
    contentBottom: args.contentBottom,
  });
}

export type ProjectGroupHeaderDragSession = {
  groupId: string;
  bucketKey: ProjectGroupHeaderDragBucketKey;
  sidebarProjectGroupHeaderIds: readonly string[];
  pointerId: number;
  headerRects: ProjectGroupHeaderDragRect[];
  handleEl: HTMLElement;
  startX: number;
  startY: number;
  latestPointerY: number;
  promoted: boolean;
};

export function createProjectGroupHeaderDragSession(args: {
  event: Pick<ReactPointerEvent<HTMLElement>, "button" | "pointerId" | "clientX" | "clientY" | "target" | "currentTarget">;
  groupId: string;
  projectGroupById: ReadonlyMap<string, ProjectGroup>;
  sidebarProjectGroupHeaderIdsByBucket: ReadonlyMap<
    ProjectGroupHeaderDragBucketKey,
    readonly string[]
  >;
  getScrollContainer: () => HTMLElement | null;
}): ProjectGroupHeaderDragSession | null {
  if (args.event.button !== 0) return null;
  if (!isProjectGroupHeaderDragHandleTarget(args.event.target, args.event.currentTarget)) {
    return null;
  }
  // The group header reuses ProjectHeaderActions markup, so the same action selector applies.
  if (isProjectGroupHeaderActionTarget(args.event.target, args.event.currentTarget)) {
    return null;
  }
  const group = args.projectGroupById.get(args.groupId);
  if (!group) return null;
  const bucketKey = getProjectGroupHeaderDragBucketKey(group, args.projectGroupById);
  const ids = args.sidebarProjectGroupHeaderIdsByBucket.get(bucketKey) ?? [];
  // Why: a lone group in a parent bucket cannot move without reparenting.
  if (ids.length <= 1) return null;
  const container = args.getScrollContainer();
  if (!container) return null;
  return {
    groupId: args.groupId,
    bucketKey,
    sidebarProjectGroupHeaderIds: ids,
    pointerId: args.event.pointerId,
    headerRects: measureProjectGroupHeaderDragRects(container, bucketKey),
    handleEl: args.event.currentTarget,
    startX: args.event.clientX,
    startY: args.event.clientY,
    latestPointerY: args.event.clientY,
    promoted: false,
  };
}

export type ProjectGroupDragState = {
  draggingGroupId: string | null;
  dropIndex: number | null;
  dropIndicatorY: number | null;
};

export const INITIAL_PROJECT_GROUP_HEADER_DRAG_STATE: ProjectGroupDragState = {
  draggingGroupId: null,
  dropIndex: null,
  dropIndicatorY: null,
};

export function commitProjectGroupHeaderDragDrop(args: {
  session: ProjectGroupHeaderDragSession;
  sidebarDropIndex: number;
  projectGroupById: ReadonlyMap<string, ProjectGroup>;
  onCommitProjectGroupTabOrder: (groupId: string, tabOrder: number) => void;
}): void {
  const updates = getProjectGroupTabOrderUpdatesForSidebarDrop({
    sidebarProjectGroupHeaderIds: args.session.sidebarProjectGroupHeaderIds,
    draggedGroupId: args.session.groupId,
    sidebarDropIndex: args.sidebarDropIndex,
    projectGroupById: args.projectGroupById,
  });
  for (const update of updates) {
    args.onCommitProjectGroupTabOrder(update.groupId, update.tabOrder);
  }
}

export type UseProjectGroupHeaderPointerDragArgs = {
  rows: readonly Row[];
  projectGroupById: ReadonlyMap<string, ProjectGroup>;
  onCommitProjectGroupTabOrder: (groupId: string, tabOrder: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

export function useProjectGroupHeaderPointerDrag(
  args: UseProjectGroupHeaderPointerDragArgs
): { state: ProjectGroupDragState; onHandlePointerDown: (event: ReactPointerEvent<HTMLElement>, groupId: string) => void } {
  const [state, setState] = useState<ProjectGroupDragState>(
    INITIAL_PROJECT_GROUP_HEADER_DRAG_STATE
  );
  const [armed, setArmed] = useState(false);
  const latestDropIndexRef = useRef<number | null>(null);
  const sessionRef = useRef<ProjectGroupHeaderDragSession | null>(null);
  const clickSwallowRef = useRef<HeaderDragTimeoutHandle | null>(null);
  const autoscrollFrameRef = useRef<number | null>(null);
  const autoscrollLastFrameRef = useRef<number | null>(null);
  const argsRef = useRef(args);
  argsRef.current = args;
  const bucketsRef = useRef(new Map<ProjectGroupHeaderDragBucketKey, readonly string[]>());
  bucketsRef.current = getSidebarOrderedProjectGroupHeaderIdsByBucket(
    args.rows,
    args.projectGroupById
  );
  const groupByIdRef = useRef(args.projectGroupById);
  groupByIdRef.current = args.projectGroupById;

  const refreshRects = useCallback((): ProjectGroupHeaderDragRect[] => {
    const container = argsRef.current.scrollRef.current;
    const session = sessionRef.current;
    if (!container || !session) return [];
    const rects = measureProjectGroupHeaderDragRects(container, session.bucketKey);
    session.headerRects = rects;
    return rects;
  }, []);

  const computeDrop = useCallback(
    (pointerY: number): { dropIndex: number; dropIndicatorY: number } | null => {
      const session = sessionRef.current;
      const container = argsRef.current.scrollRef.current;
      if (!session || !container) return null;
      return computeProjectGroupHeaderDropPreview({
        pointerY,
        containerTop: container.getBoundingClientRect().top,
        scrollTop: container.scrollTop,
        rects: session.headerRects,
        sidebarProjectGroupHeaderIds: session.sidebarProjectGroupHeaderIds,
        contentBottom: container.scrollHeight,
      });
    },
    []
  );

  const applyDrop = useCallback((groupId: string, drop: { dropIndex: number; dropIndicatorY: number } | null): void => {
    latestDropIndexRef.current = drop?.dropIndex ?? null;
    const next: ProjectGroupDragState = drop
      ? { draggingGroupId: groupId, ...drop }
      : { draggingGroupId: groupId, dropIndex: null, dropIndicatorY: null };
    setState((previous) =>
      previous.draggingGroupId === next.draggingGroupId &&
      previous.dropIndex === next.dropIndex &&
      previous.dropIndicatorY === next.dropIndicatorY
        ? previous
        : next
    );
  }, []);

  const cancelAutoscroll = useCallback(() => {
    if (autoscrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoscrollFrameRef.current);
      autoscrollFrameRef.current = null;
    }
    autoscrollLastFrameRef.current = null;
  }, []);

  const endDrag = useCallback(
    (commit: boolean): void => {
      cancelAutoscroll();
      const session = sessionRef.current;
      if (!session) {
        setState(INITIAL_PROJECT_GROUP_HEADER_DRAG_STATE);
        setArmed(false);
        return;
      }
      try {
        session.handleEl.releasePointerCapture(session.pointerId);
      } catch {
        // Capture may already be gone.
      }
      if (session.promoted) {
        clickSwallowRef.current = swallowNextClickOnDragHandle(session.handleEl);
      }
      const sidebarDropIndex =
        commit && session.promoted && latestDropIndexRef.current !== null
          ? latestDropIndexRef.current
          : null;
      sessionRef.current = null;
      setState(INITIAL_PROJECT_GROUP_HEADER_DRAG_STATE);
      setArmed(false);
      if (sidebarDropIndex === null) return;
      commitProjectGroupHeaderDragDrop({
        session,
        sidebarDropIndex,
        projectGroupById: groupByIdRef.current,
        onCommitProjectGroupTabOrder: argsRef.current.onCommitProjectGroupTabOrder,
      });
    },
    [cancelAutoscroll]
  );

  const runAutoscrollFrame = useCallback(
    (frameTime: number): void => {
      autoscrollFrameRef.current = null;
      const session = sessionRef.current;
      const container = argsRef.current.scrollRef.current;
      if (!session?.promoted || !container) {
        cancelAutoscroll();
        return;
      }
      const previous = autoscrollLastFrameRef.current ?? frameTime;
      autoscrollLastFrameRef.current = frameTime;
      const autoscroll = getWorktreeSidebarDragAutoscroll({
        point: { clientX: 0, clientY: session.latestPointerY },
        containerRect: container.getBoundingClientRect(),
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        elapsedMs: frameTime - previous,
      });
      if (autoscroll) {
        container.scrollTop = autoscroll.scrollTop;
        refreshRects();
      }
      applyDrop(session.groupId, computeDrop(session.latestPointerY));
      autoscrollFrameRef.current = window.requestAnimationFrame(runAutoscrollFrame);
    },
    [applyDrop, cancelAutoscroll, computeDrop, refreshRects]
  );

  const ensureAutoscroll = useCallback((): void => {
    if (autoscrollFrameRef.current !== null) return;
    autoscrollLastFrameRef.current = null;
    autoscrollFrameRef.current = window.requestAnimationFrame(runAutoscrollFrame);
  }, [runAutoscrollFrame]);

  useEffect(() => {
    if (!armed) return;
    const onPointerMove = (event: PointerEvent): void => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      if (hasPointerBeenReleased(event)) {
        endDrag(false);
        return;
      }
      session.latestPointerY = event.clientY;
      if (!session.promoted) {
        if (
          !isHeaderDragPromoted({
            startX: session.startX,
            startY: session.startY,
            clientX: event.clientX,
            clientY: event.clientY,
          })
        ) {
          return;
        }
        session.promoted = true;
        if (session.handleEl.isConnected) {
          try {
            session.handleEl.setPointerCapture(session.pointerId);
          } catch {
            // Global listeners still drive the drag.
          }
        }
        refreshRects();
        setState({ draggingGroupId: session.groupId, dropIndex: null, dropIndicatorY: null });
      }
      refreshRects();
      applyDrop(session.groupId, computeDrop(event.clientY));
      ensureAutoscroll();
    };
    const onPointerUp = (event: PointerEvent): void => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      endDrag(true);
    };
    const onPointerCancel = (event: PointerEvent): void => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      endDrag(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") endDrag(false);
    };
    const onBlur = (): void => endDrag(false);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      cancelAutoscroll();
      if (clickSwallowRef.current !== null) {
        clearTimeout(clickSwallowRef.current);
        clickSwallowRef.current = null;
      }
    };
  }, [applyDrop, armed, cancelAutoscroll, computeDrop, endDrag, ensureAutoscroll, refreshRects]);

  useEffect(() => {
    if (state.draggingGroupId === null) return;
    const body = document.body;
    const previousCursor = body.style.cursor;
    const previousUserSelect = body.style.userSelect;
    body.style.cursor = "grabbing";
    body.style.userSelect = "none";
    return () => {
      body.style.cursor = previousCursor;
      body.style.userSelect = previousUserSelect;
    };
  }, [state.draggingGroupId]);

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, groupId: string): void => {
      const session = createProjectGroupHeaderDragSession({
        event,
        groupId,
        projectGroupById: groupByIdRef.current,
        sidebarProjectGroupHeaderIdsByBucket: bucketsRef.current,
        getScrollContainer: () => argsRef.current.scrollRef.current,
      });
      if (!session) return;
      sessionRef.current = session;
      setArmed(true);
    },
    []
  );

  return { state, onHandlePointerDown };
}
