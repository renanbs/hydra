// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/useSidebarProjectDrop.ts
//
// Native OS drag-and-drop is webview-wide, so the sidebar has to decide for itself
// whether the pointer is over its own surface. While a drop is over the sidebar the
// shell paints the "Drop folder to add project" outline; the release adds every
// dropped directory through the same catalog writer the Add Project dialog uses.
import { useEffect, useState, type RefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";

type PhysicalPosition = { x: number; y: number };

/** Physical pixels → CSS pixels; Tauri reports positions in device pixels. */
function toClientPoint(position: PhysicalPosition): { x: number; y: number } {
  const ratio = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
  return { x: position.x / ratio, y: position.y / ratio };
}

export function isPointInsideElement(
  element: HTMLElement | null,
  point: { x: number; y: number }
): boolean {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

export function useSidebarProjectDrop(args: {
  enabled: boolean;
  sidebarRef: RefObject<HTMLElement | null>;
  /** Called after at least one folder was added, so the shell can refresh. */
  onProjectAdded: () => void;
}): { isProjectDropActive: boolean } {
  const { enabled, sidebarRef, onProjectAdded } = args;
  const [isProjectDropActive, setIsProjectDropActive] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }
    // Why the internals guard: tests and the plain Vite preview render without a
    // Tauri host, where `getCurrentWebview()` throws before any promise exists.
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }
    let disposed = false;
    let unlisten: (() => void) | null = null;

    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (disposed) return;
        const payload = event.payload;
        if (payload.type === "leave") {
          setIsProjectDropActive(false);
          return;
        }
        if (payload.type === "enter" || payload.type === "over") {
          // Why position for `over`: Tauri's over event carries no paths, and a
          // drag that started elsewhere must not paint the sidebar outline.
          setIsProjectDropActive(
            payload.type === "enter"
              ? isPointInsideElement(sidebarRef.current, toClientPoint(payload.position))
              : isProjectDropActive
          );
          return;
        }
        const point = toClientPoint(payload.position);
        const inside = isPointInsideElement(sidebarRef.current, point);
        setIsProjectDropActive(false);
        if (!inside || payload.paths.length === 0) {
          return;
        }
        let added = 0;
        for (const path of payload.paths) {
          void invoke("catalog_add_folder", { path })
            .then(() => {
              added += 1;
              if (added === 1) onProjectAdded();
            })
            .catch((error) => console.error("Failed to add dropped folder:", error));
        }
      })
      .then((dispose) => {
        if (disposed) {
          dispose();
        } else {
          unlisten = dispose;
        }
      })
      .catch((error) => {
        console.error("Failed to listen for native drops:", error);
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
    // Why not depend on isProjectDropActive: the listener reads the latest
    // position only; re-registering per state change would drop events mid-drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sidebarRef, onProjectAdded]);

  return { isProjectDropActive };
}
