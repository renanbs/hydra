// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Sources: project-header-drag-contract.ts, project-header-drag-start.ts,
// project-header-drag.ts, project-header-drag-commit.ts
//
// Repo-header reordering by pointer, not HTML5 DnD: the headers live in a virtualized
// list, so rows unmount and remount while scrolling and `dragover` lands on stale
// targets. A pointer session caches the bucket's header rects, re-measures them each
// frame, and commits one of two writes:
//   - project-group mode: the dragged repo's manual rank inside its group (tabOrder),
//   - global repo mode: the logical repo order, with every host-qualified occurrence of
//     the repo moving as one block.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Repo } from "../../../../shared/repo-types";
import {
  applyAllRepoInsertAt,
  computeProjectHeaderDropPreview,
  getLogicalRepoOrderRankById,
  getProjectGroupOrderForSidebarDrop,
  getProjectHeaderDragBucketKey,
  getSidebarOrderedRepoHeaderIdsByBucket,
  mapSidebarProjectHeaderDropIndexToSiblingInsertIndex,
  mapSidebarRepoDropIndexToAllRepoInsertAt,
  measureProjectHeaderDragRects,
  type ProjectHeaderDragBucketKey,
  type ProjectHeaderDragRect,
} from "../../project-header-drop";
import { getWorktreeSidebarDragAutoscroll } from "../../worktree-sidebar-drag-autoscroll";
import {
  isProjectHeaderDragHandleTarget,
  isRepoHeaderActionTarget
} from "../../project-header-drag-contract";
import {
  hasPointerBeenReleased,
  isHeaderDragPromoted,
  swallowNextClickOnDragHandle,
  type HeaderDragTimeoutHandle,
} from "./header-pointer-session";
import type { Row } from "../grouping/row-types";

export type RepoHeaderDragState = {
  draggingRepoId: string | null;
  dropIndex: number | null;
  dropIndicatorY: number | null;
};

export const INITIAL_REPO_HEADER_DRAG_STATE: RepoHeaderDragState = {
  draggingRepoId: null,
  dropIndex: null,
  dropIndicatorY: null,
};

export type RepoHeaderDragSession = {
  repoId: string;
  bucketKey: ProjectHeaderDragBucketKey;
  sidebarRepoHeaderIds: readonly string[];
  pointerId: number;
  headerRects: ProjectHeaderDragRect[];
  handleEl: HTMLElement;
  startX: number;
  startY: number;
  latestPointerY: number;
  promoted: boolean;
};

/** Orca `createProjectHeaderDragSession`: qualification + first rect measurement. */
export function createRepoHeaderDragSession(args: {
  event: Pick<ReactPointerEvent<HTMLElement>, "button" | "pointerId" | "clientX" | "clientY" | "target" | "currentTarget">;
  repoId: string;
  repoById: ReadonlyMap<string, Repo>;
  sidebarRepoHeaderIdsByBucket: ReadonlyMap<ProjectHeaderDragBucketKey, readonly string[]>;
  getScrollContainer: () => HTMLElement | null;
}): RepoHeaderDragSession | null {
  if (args.event.button !== 0) {
    return null;
  }
  if (!isProjectHeaderDragHandleTarget(args.event.target, args.event.currentTarget)) {
    return null;
  }
  if (isRepoHeaderActionTarget(args.event.target, args.event.currentTarget)) {
    return null;
  }
  const repo = args.repoById.get(args.repoId);
  if (!repo) {
    return null;
  }
  const bucketKey = getProjectHeaderDragBucketKey(repo);
  const sidebarRepoHeaderIds = args.sidebarRepoHeaderIdsByBucket.get(bucketKey) ?? [];
  // Why: a single repo in its bucket has nowhere to land, so let the click collapse it.
  if (sidebarRepoHeaderIds.length <= 1) {
    return null;
  }
  const container = args.getScrollContainer();
  if (!container) {
    return null;
  }
  return {
    repoId: args.repoId,
    bucketKey,
    sidebarRepoHeaderIds,
    pointerId: args.event.pointerId,
    headerRects: measureProjectHeaderDragRects(container, bucketKey),
    handleEl: args.event.currentTarget,
    startX: args.event.clientX,
    startY: args.event.clientY,
    latestPointerY: args.event.clientY,
    promoted: false,
  };
}

export type ProjectHeaderDragCommitArgs = {
  session: RepoHeaderDragSession;
  sidebarDropIndex: number;
  orderedRepoIds: readonly string[];
  repoById: ReadonlyMap<string, Repo>;
  usesProjectGroupOrdering: boolean;
  onCommitRepoOrder: (orderedIds: string[]) => void;
  onCommitProjectGroupOrder: (
    repoId: string,
    projectGroupId: string | null,
    order: number
  ) => void;
};

/** Orca `commitProjectHeaderDragDrop`: one write per drop, in the mode's own vocabulary. */
export function commitProjectHeaderDragDrop(args: ProjectHeaderDragCommitArgs): void {
  const draggedRepo = args.repoById.get(args.session.repoId);
  if (!draggedRepo) {
    return;
  }
  const sidebarRepoHeaderIds = args.session.sidebarRepoHeaderIds;
  const sourceIndex = sidebarRepoHeaderIds.indexOf(args.session.repoId);
  // Why: both slots bordering the dragged header are visual no-ops; an unchanged drop
  // must not compact paired-host occurrences.
  if (
    sourceIndex === -1 ||
    args.sidebarDropIndex === sourceIndex ||
    args.sidebarDropIndex === sourceIndex + 1
  ) {
    return;
  }

  if (args.usesProjectGroupOrdering) {
    const siblings = sidebarRepoHeaderIds
      .filter((repoId) => repoId !== args.session.repoId)
      .map((repoId) => args.repoById.get(repoId))
      .filter((repo): repo is Repo => repo !== undefined);
    const siblingDropIndex = mapSidebarProjectHeaderDropIndexToSiblingInsertIndex({
      sidebarDropIndex: args.sidebarDropIndex,
      sourceIndex,
      siblingCount: siblings.length,
    });
    const sourceIndexInSiblings = Math.min(sourceIndex, siblings.length);
    if (siblingDropIndex === sourceIndexInSiblings) {
      return;
    }
    const order = getProjectGroupOrderForSidebarDrop({
      siblings,
      dropIndex: siblingDropIndex,
      repoOrderRankById: getLogicalRepoOrderRankById(args.orderedRepoIds),
    });
    args.onCommitProjectGroupOrder(
      args.session.repoId,
      draggedRepo.projectGroupId ?? null,
      order
    );
    return;
  }

  const insertAt = mapSidebarRepoDropIndexToAllRepoInsertAt(
    args.sidebarDropIndex,
    sidebarRepoHeaderIds,
    args.orderedRepoIds
  );
  const next = applyAllRepoInsertAt(args.orderedRepoIds, args.session.repoId, insertAt);
  if (!next) {
    return;
  }
  args.onCommitRepoOrder(next);
}

export type UseRepoHeaderPointerDragArgs = {
  rows: readonly Row[];
  repoById: ReadonlyMap<string, Repo>;
  /** Logical project order (one id per project, repeats for paired hosts). */
  orderedRepoIds: readonly string[];
  /** `groupBy === 'repo'` commits a group rank; every other mode commits global order. */
  usesProjectGroupOrdering: boolean;
  onCommitRepoOrder: (orderedIds: string[]) => void;
  onCommitProjectGroupOrder: (
    repoId: string,
    projectGroupId: string | null,
    order: number
  ) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

export type RepoHeaderPointerDragController = {
  state: RepoHeaderDragState;
  onHandlePointerDown: (event: ReactPointerEvent<HTMLElement>, repoId: string) => void;
};

export function useRepoHeaderPointerDrag(
  args: UseRepoHeaderPointerDragArgs
): RepoHeaderPointerDragController {
  const [state, setState] = useState<RepoHeaderDragState>(INITIAL_REPO_HEADER_DRAG_STATE);
  const [armed, setArmed] = useState(false);
  const latestDropIndexRef = useRef<number | null>(null);
  const sessionRef = useRef<RepoHeaderDragSession | null>(null);
  const clickSwallowRef = useRef<HeaderDragTimeoutHandle | null>(null);
  const autoscrollFrameRef = useRef<number | null>(null);
  const autoscrollLastFrameRef = useRef<number | null>(null);
  const argsRef = useRef(args);
  argsRef.current = args;

  const buckets = useRef(new Map<ProjectHeaderDragBucketKey, readonly string[]>());
  buckets.current = getSidebarOrderedRepoHeaderIdsByBucket(args.rows);
  const repoByIdRef = useRef(args.repoById);
  repoByIdRef.current = args.repoById;

  const refreshRects = useCallback((): ProjectHeaderDragRect[] => {
    const container = argsRef.current.scrollRef.current;
    const session = sessionRef.current;
    if (!container || !session) return [];
    const rects = measureProjectHeaderDragRects(container, session.bucketKey);
    session.headerRects = rects;
    return rects;
  }, []);

  const computeDrop = useCallback(
    (pointerY: number): { dropIndex: number; dropIndicatorY: number } | null => {
      const session = sessionRef.current;
      const container = argsRef.current.scrollRef.current;
      if (!session || !container) return null;
      return computeProjectHeaderDropPreview({
        pointerY,
        containerTop: container.getBoundingClientRect().top,
        scrollTop: container.scrollTop,
        rects: session.headerRects,
        sidebarRepoHeaderIds: session.sidebarRepoHeaderIds,
        contentBottom: container.scrollHeight,
      });
    },
    []
  );

  const applyDrop = useCallback(
    (repoId: string, drop: { dropIndex: number; dropIndicatorY: number } | null): void => {
      latestDropIndexRef.current = drop?.dropIndex ?? null;
      const next: RepoHeaderDragState = drop
        ? { draggingRepoId: repoId, ...drop }
        : { draggingRepoId: repoId, dropIndex: null, dropIndicatorY: null };
      setState((previous) =>
        previous.draggingRepoId === next.draggingRepoId &&
        previous.dropIndex === next.dropIndex &&
        previous.dropIndicatorY === next.dropIndicatorY
          ? previous
          : next
      );
    },
    []
  );

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
        setState(INITIAL_REPO_HEADER_DRAG_STATE);
        setArmed(false);
        return;
      }
      try {
        session.handleEl.releasePointerCapture(session.pointerId);
      } catch {
        // Capture may already be gone (pointercancel, element unmounted).
      }
      if (session.promoted) {
        clickSwallowRef.current = swallowNextClickOnDragHandle(session.handleEl);
      }
      const sidebarDropIndex =
        commit && session.promoted && latestDropIndexRef.current !== null
          ? latestDropIndexRef.current
          : null;
      sessionRef.current = null;
      setState(INITIAL_REPO_HEADER_DRAG_STATE);
      setArmed(false);
      if (sidebarDropIndex === null) {
        return;
      }
      commitProjectHeaderDragDrop({
        session,
        sidebarDropIndex,
        orderedRepoIds: argsRef.current.orderedRepoIds,
        repoById: repoByIdRef.current,
        usesProjectGroupOrdering: argsRef.current.usesProjectGroupOrdering,
        onCommitRepoOrder: argsRef.current.onCommitRepoOrder,
        onCommitProjectGroupOrder: argsRef.current.onCommitProjectGroupOrder,
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
      applyDrop(session.repoId, computeDrop(session.latestPointerY));
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
            // Global listeners still drive the drag without capture.
          }
        }
        refreshRects();
        setState({ draggingRepoId: session.repoId, dropIndex: null, dropIndicatorY: null });
      }
      refreshRects();
      applyDrop(session.repoId, computeDrop(event.clientY));
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
    if (state.draggingRepoId === null) return;
    const body = document.body;
    const previousCursor = body.style.cursor;
    const previousUserSelect = body.style.userSelect;
    body.style.cursor = "grabbing";
    body.style.userSelect = "none";
    return () => {
      body.style.cursor = previousCursor;
      body.style.userSelect = previousUserSelect;
    };
  }, [state.draggingRepoId]);

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, repoId: string): void => {
      const session = createRepoHeaderDragSession({
        event,
        repoId,
        repoById: repoByIdRef.current,
        sidebarRepoHeaderIdsByBucket: buckets.current,
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
