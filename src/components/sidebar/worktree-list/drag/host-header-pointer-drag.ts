// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Sources: host-header-drag-dom.ts + host-header-drag.ts
//
// The host tier is the outer card: dragging one temporarily force-collapses every host
// section so the section bound is the header itself. The drag paints a floating clone of
// the pressed header, an insertion line resolved by the section midpoint, and commits by
// splicing the host id array (Orca's `handleReorderHostSections` writer persists it).
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { normalizeExecutionHostId, type ExecutionHostId } from "../../../../shared/execution-host";
import {
  createSidebarDragPreview,
  setSidebarPointerDragDocumentStyles,
  updateSidebarDragPreviewPosition,
} from "../pointer-drag-dom";
import {
  hasPointerBeenReleased,
  isHeaderDragPromoted,
  swallowNextClickOnDragHandle,
  type HeaderDragTimeoutHandle,
} from "./header-pointer-session";

export type HostHeaderRect = {
  hostId: ExecutionHostId;
  top: number;
  bottom: number;
};

export type HostHeaderDragState = {
  draggingHostId: ExecutionHostId | null;
  dropIndex: number | null;
  dropIndicatorY: number | null;
};

const INITIAL_STATE: HostHeaderDragState = {
  draggingHostId: null,
  dropIndex: null,
  dropIndicatorY: null,
};

const HOST_HEADER_ACTION_SELECTOR =
  '[data-host-header-action], button, a, input, textarea, select, [contenteditable=""], [contenteditable="true"]';

const INDICATOR_GAP_PX = 4;

export function isHostHeaderActionTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  // Why Element: an <svg> icon inside a host action is an SVGElement.
  if (!(target instanceof Element) || target === currentTarget) {
    return false;
  }
  return currentTarget.contains(target) && target.closest(HOST_HEADER_ACTION_SELECTOR) !== null;
}

export function readHostHeaderRects(container: HTMLElement): HostHeaderRect[] {
  const containerRect = container.getBoundingClientRect();
  const rects: HostHeaderRect[] = [];
  for (const header of Array.from(
    container.querySelectorAll<HTMLElement>("[data-host-header-drag-id]")
  )) {
    const hostId = normalizeExecutionHostId(header.dataset.hostHeaderDragId);
    if (!hostId) continue;
    const rect = header.getBoundingClientRect();
    rects.push({
      hostId,
      top: rect.top - containerRect.top + container.scrollTop,
      bottom: rect.bottom - containerRect.top + container.scrollTop,
    });
  }
  return rects;
}

/**
 * Section-midpoint insertion slot, Orca `computeDrop`: the pointer lands before the first
 * header whose midpoint it has not passed, and the line hangs in the gap above it.
 */
export function computeHostHeaderDropPreview(args: {
  pointerY: number;
  containerRect: { top: number };
  scrollTop: number;
  rects: readonly HostHeaderRect[];
}): { dropIndex: number; dropIndicatorY: number } | null {
  const { rects } = args;
  if (rects.length === 0) {
    return null;
  }
  const localY = args.pointerY - args.containerRect.top + args.scrollTop;
  let insertBefore = rects.length;
  for (let index = 0; index < rects.length; index++) {
    const mid = (rects[index]!.top + rects[index]!.bottom) / 2;
    if (localY < mid) {
      insertBefore = index;
      break;
    }
  }
  const rawIndicatorY =
    insertBefore >= rects.length
      ? rects[rects.length - 1]!.bottom + INDICATOR_GAP_PX
      : Math.max(0, rects[insertBefore]!.top - INDICATOR_GAP_PX);
  return {
    dropIndex: insertBefore,
    dropIndicatorY: Math.max(args.scrollTop, rawIndicatorY),
  };
}

/** Orca's commit: splice the dragged id out and back in at the resolved slot. */
export function moveHostIdForDrop(
  orderedHostIds: readonly ExecutionHostId[],
  draggedHostId: ExecutionHostId,
  dropIndex: number
): ExecutionHostId[] | null {
  const fromIndex = orderedHostIds.indexOf(draggedHostId);
  if (fromIndex === -1) {
    return null;
  }
  const next = orderedHostIds.slice();
  next.splice(fromIndex, 1);
  const insertAt = dropIndex > fromIndex ? dropIndex - 1 : dropIndex;
  if (insertAt === fromIndex) {
    return null;
  }
  next.splice(insertAt, 0, draggedHostId);
  return next;
}

export type UseHostHeaderPointerDragArgs = {
  orderedHostIds: readonly ExecutionHostId[];
  onCommit: (orderedIds: ExecutionHostId[]) => void;
  onHostDragActiveChange?: (active: boolean) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

export function useHostHeaderPointerDrag(args: UseHostHeaderPointerDragArgs): {
  state: HostHeaderDragState;
  onHandlePointerDown: (event: ReactPointerEvent<HTMLElement>, hostId: ExecutionHostId) => void;
  isDropTarget: (hostId: ExecutionHostId) => boolean;
} {
  const [state, setState] = useState<HostHeaderDragState>(INITIAL_STATE);
  const [armed, setArmed] = useState(false);
  const latestDropIndexRef = useRef<number | null>(null);
  latestDropIndexRef.current = state.dropIndex;
  const argsRef = useRef(args);
  argsRef.current = args;
  const sessionRef = useRef<{
    hostId: ExecutionHostId;
    pointerId: number;
    headerRects: HostHeaderRect[];
    handleEl: HTMLElement;
    startX: number;
    startY: number;
    promoted: boolean;
    preview: HTMLElement | null;
    previewOffsetX: number;
    previewOffsetY: number;
  } | null>(null);
  const deferredFrameRef = useRef<number | null>(null);
  const clickSwallowRef = useRef<HeaderDragTimeoutHandle | null>(null);

  const clearDeferredFrame = useCallback(() => {
    if (deferredFrameRef.current !== null) {
      window.cancelAnimationFrame(deferredFrameRef.current);
      deferredFrameRef.current = null;
    }
  }, []);

  const computeDrop = useCallback(
    (pointerY: number): { dropIndex: number; dropIndicatorY: number } | null => {
      const session = sessionRef.current;
      const container = argsRef.current.scrollRef.current;
      if (!session || !container) {
        return null;
      }
      // Why live rects: dragging host headers force-collapses their sections, so only the
      // rects read after promotion describe what is painted.
      const rects = readHostHeaderRects(container);
      if (rects.length === 0 || rects.length < argsRef.current.orderedHostIds.length) {
        return null;
      }
      session.headerRects = rects;
      return computeHostHeaderDropPreview({
        pointerY,
        containerRect: container.getBoundingClientRect(),
        scrollTop: container.scrollTop,
        rects,
      });
    },
    []
  );

  const applyDrop = useCallback((drop: { dropIndex: number; dropIndicatorY: number } | null): void => {
    if (!drop) return;
    latestDropIndexRef.current = drop.dropIndex;
    setState((previous) =>
      previous.dropIndex === drop.dropIndex && previous.dropIndicatorY === drop.dropIndicatorY
        ? previous
        : { draggingHostId: sessionRef.current?.hostId ?? previous.draggingHostId, ...drop }
    );
  }, []);

  /**
   * Host sections re-collapse after promotion, so the first frame after the pointer moves
   * may still measure the pre-collapse layout. Deferring one frame resolves the drop
   * against the settled sections instead of committing the stale slot.
   */
  const scheduleDeferredDropCompute = useCallback(
    (pointerY: number) => {
      clearDeferredFrame();
      deferredFrameRef.current = window.requestAnimationFrame(() => {
        deferredFrameRef.current = null;
        applyDrop(computeDrop(pointerY));
      });
    },
    [applyDrop, clearDeferredFrame, computeDrop]
  );

  const endDrag = useCallback(
    (commit: boolean, pointerY?: number): void => {
      const session = sessionRef.current;
      if (!session) {
        clearDeferredFrame();
        setState(INITIAL_STATE);
        setArmed(false);
        return;
      }
      clearDeferredFrame();
      try {
        session.handleEl.releasePointerCapture(session.pointerId);
      } catch {
        // Capture may already be gone (element unmounted).
      }
      session.preview?.remove();
      setSidebarPointerDragDocumentStyles(false);
      if (session.promoted) {
        clickSwallowRef.current = swallowNextClickOnDragHandle(session.handleEl);
      }
      const finalIndex =
        commit && session.promoted
          ? (latestDropIndexRef.current ??
            (pointerY === undefined ? null : (computeDrop(pointerY)?.dropIndex ?? null)))
          : null;
      sessionRef.current = null;
      setState(INITIAL_STATE);
      setArmed(false);
      if (finalIndex === null) return;
      const next = moveHostIdForDrop(argsRef.current.orderedHostIds, session.hostId, finalIndex);
      if (next) {
        argsRef.current.onCommit(next);
      }
    },
    [clearDeferredFrame, computeDrop]
  );

  useEffect(() => {
    if (!armed) return;
    const onPointerMove = (event: PointerEvent): void => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      if (hasPointerBeenReleased(event)) {
        endDrag(false);
        return;
      }
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
        const { preview, offsetX, offsetY } = createSidebarDragPreview({
          sourceRow: session.handleEl,
          pointerX: event.clientX,
          pointerY: event.clientY,
          draggedCount: 1,
        });
        session.preview = preview;
        session.previewOffsetX = offsetX;
        session.previewOffsetY = offsetY;
        setSidebarPointerDragDocumentStyles(true);
        setState({ draggingHostId: session.hostId, dropIndex: null, dropIndicatorY: null });
      }
      if (session.preview) {
        updateSidebarDragPreviewPosition({
          preview: session.preview,
          pointerX: event.clientX,
          pointerY: event.clientY,
          offsetX: session.previewOffsetX,
          offsetY: session.previewOffsetY,
        });
      }
      const drop = computeDrop(event.clientY);
      if (!drop) {
        scheduleDeferredDropCompute(event.clientY);
        return;
      }
      applyDrop(drop);
    };
    const onPointerUp = (event: PointerEvent): void => {
      const session = sessionRef.current;
      if (session && event.pointerId === session.pointerId) {
        endDrag(true, event.clientY);
      }
    };
    const onPointerCancel = (event: PointerEvent): void => {
      const session = sessionRef.current;
      if (session && event.pointerId === session.pointerId) {
        endDrag(false);
      }
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
    };
  }, [applyDrop, armed, computeDrop, endDrag, scheduleDeferredDropCompute]);

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, hostId: ExecutionHostId): void => {
      if (event.button !== 0 || isHostHeaderActionTarget(event.target, event.currentTarget)) {
        return;
      }
      const container = argsRef.current.scrollRef.current;
      if (!container || argsRef.current.orderedHostIds.length <= 1) {
        return;
      }
      sessionRef.current = {
        hostId,
        pointerId: event.pointerId,
        headerRects: readHostHeaderRects(container),
        handleEl: event.currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        promoted: false,
        preview: null,
        previewOffsetX: 0,
        previewOffsetY: 0,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setArmed(true);
    },
    []
  );

  // Orca `use-header-drag`: report whether a host drag owns the gesture so the row model
  // can force-collapse every host section while it lasts.
  const dragActive = state.draggingHostId !== null;
  const onHostDragActiveChange = args.onHostDragActiveChange;
  useEffect(() => {
    onHostDragActiveChange?.(dragActive);
  }, [dragActive, onHostDragActiveChange]);
  useEffect(() => () => onHostDragActiveChange?.(false), [onHostDragActiveChange]);

  // Teardown on unmount: the preview is appended to the body and outlives the tree.
  useEffect(
    () => () => {
      clearDeferredFrame();
      sessionRef.current?.preview?.remove();
      setSidebarPointerDragDocumentStyles(false);
      if (clickSwallowRef.current !== null) {
        clearTimeout(clickSwallowRef.current);
        clickSwallowRef.current = null;
      }
    },
    [clearDeferredFrame]
  );

  const isDropTarget = useCallback(
    (hostId: ExecutionHostId) =>
      state.draggingHostId !== null &&
      state.dropIndex !== null &&
      argsRef.current.orderedHostIds[state.dropIndex] === hostId,
    [state.draggingHostId, state.dropIndex]
  );

  return { state, onHandlePointerDown, isDropTarget };
}
