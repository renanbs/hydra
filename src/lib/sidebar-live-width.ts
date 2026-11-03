// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/index.tsx
// (`setLiveSidebarWidth` in `Sidebar`).
//
// Why a document-level variable: panels that anchor to the left sidebar (the workspace
// board sheet, the agent dashboard drawer) must follow the sidebar WHILE it is being
// dragged. During a drag the width never round-trips React state, so those panels read
// the live draft from the document instead of from a prop that only updates on release.

export const WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR = "--workspace-sidebar-live-width";

/**
 * Publishes the sidebar's current width to `--workspace-sidebar-live-width`.
 *
 * @param width CSS pixels of the sidebar container, or `null` to drop the variable so
 *        consumers fall back to their own committed default.
 * @param root element that owns the custom property (defaults to the document root,
 *        where every anchored panel can inherit it).
 */
export function applyWorkspaceSidebarLiveWidth(
  width: number | null,
  root: Pick<HTMLElement, "style"> | null =
    typeof document === "undefined" ? null : document.documentElement
): void {
  if (!root) {
    return;
  }
  if (width === null || !Number.isFinite(width)) {
    root.style.removeProperty(WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR);
    return;
  }
  // Why rounded: a fractional drag width would churn the custom property string
  // (`280.0000001px`) without changing any painted pixel.
  root.style.setProperty(WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR, `${Math.round(width)}px`);
}

/** The variable's read-back form, for panels that need a width value, not the declaration. */
export function getWorkspaceSidebarLiveWidthCss(fallbackWidth: number): string {
  return `var(${WORKSPACE_SIDEBAR_LIVE_WIDTH_VAR}, ${fallbackWidth}px)`;
}
