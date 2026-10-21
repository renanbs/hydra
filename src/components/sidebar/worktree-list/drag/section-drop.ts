// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/status-target.ts
//
// A card dropped on the list's own "Pinned" header or a workspace-status lane header
// is a membership write, not a reorder. The headers carry the same data attributes the
// workspace board uses; the pointer drag reads them under the release point and the
// native HTML5 path handles them with per-header handlers.
export type SidebarSectionDropTarget =
  | { kind: "pin" }
  | { kind: "status"; status: string }
  | null;

const SECTION_DROP_HOVER_ATTRIBUTE = "data-workspace-section-drop-hover";

function matchingHeader(selector: string, x: number, y: number): HTMLElement | null {
  if (typeof document === "undefined" || typeof document.elementFromPoint !== "function") {
    return null;
  }
  const element = document.elementFromPoint(x, y);
  return element?.closest<HTMLElement>(selector) ?? null;
}

export function findSidebarSectionDropTarget(x: number, y: number): SidebarSectionDropTarget {
  const pinned = matchingHeader("[data-workspace-pin-drop-target]", x, y);
  if (pinned) {
    return { kind: "pin" };
  }
  const statusHeader = matchingHeader("[data-workspace-status-drop-target]", x, y);
  const status = statusHeader?.getAttribute("data-workspace-status");
  return status ? { kind: "status", status } : null;
}

let activeDropHeader: HTMLElement | null = null;

export function updateSidebarSectionDropVisual(target: SidebarSectionDropTarget): void {
  if (typeof document === "undefined") {
    return;
  }
  const nextSelector = !target
    ? null
    : target.kind === "pin"
      ? "[data-workspace-pin-drop-target]"
      : `[data-workspace-status-drop-target][data-workspace-status="${target.status}"]`;
  const nextHeader = nextSelector ? document.querySelector<HTMLElement>(nextSelector) : null;
  if (activeDropHeader && activeDropHeader !== nextHeader) {
    activeDropHeader.removeAttribute(SECTION_DROP_HOVER_ATTRIBUTE);
    activeDropHeader = null;
  }
  if (nextHeader) {
    nextHeader.setAttribute(SECTION_DROP_HOVER_ATTRIBUTE, "true");
    activeDropHeader = nextHeader;
  }
}

export function clearSidebarSectionDropVisual(): void {
  activeDropHeader?.removeAttribute(SECTION_DROP_HOVER_ATTRIBUTE);
  activeDropHeader = null;
}
