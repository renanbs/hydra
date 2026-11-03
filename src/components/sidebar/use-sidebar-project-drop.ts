// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/useSidebarProjectDrop.ts + sidebar-project-drop.ts
//
// Native OS drag-and-drop is webview-wide, so the sidebar decides for itself whether the
// pointer is over its own surface. While a folder drag is over the sidebar the shell paints
// the "Drop folder to add project" affordance; the release validates the path and routes it
// into the Add Project wizard (`hydra:add-project-from-folder`), which owns the catalog write.
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { toast } from "sonner";
import { useAppStore } from "@/store";
import { hasNativeFileDragTypes, NATIVE_FILE_DROP_TARGET } from "../../shared/native-file-drop";

type PhysicalPosition = { x: number; y: number };

export type SidebarProjectDropPathResolution =
  | { status: "ready"; path: string }
  | { status: "empty" }
  | { status: "multiple"; count: number };

export type SidebarProjectDropAffordance =
  | { visible: false }
  | { visible: true; tone: "ready" | "blocked" | "busy"; label: string; description: string };

export type SidebarProjectDropHandlers = {
  onDragEnter: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
};

type FolderPathStatus = { path: string; exists: boolean; reason: string | null };

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

/** Orca `resolveSidebarProjectDropPath`: the wizard takes exactly one folder. */
export function resolveSidebarProjectDropPath(
  paths: readonly string[]
): SidebarProjectDropPathResolution {
  const usablePaths = paths.filter((path) => path.trim().length > 0);
  if (usablePaths.length === 0) {
    return { status: "empty" };
  }
  if (usablePaths.length > 1) {
    return { status: "multiple", count: usablePaths.length };
  }
  return { status: "ready", path: usablePaths[0]! };
}

/** Orca `getSidebarProjectDropAffordance`: the overlay's tone and copy. */
export function getSidebarProjectDropAffordance(args: {
  isDragOver: boolean;
  isHandlingDrop: boolean;
  remoteRuntimeActive: boolean;
}): SidebarProjectDropAffordance {
  if (!args.isDragOver && !args.isHandlingDrop) {
    return { visible: false };
  }
  if (args.isHandlingDrop) {
    return {
      visible: true,
      tone: "busy",
      label: "Checking folder",
      description: "Preparing the project add flow",
    };
  }
  if (args.remoteRuntimeActive) {
    return {
      visible: true,
      tone: "blocked",
      label: "Server runtime active",
      description: "Use Add Project for host paths",
    };
  }
  return {
    visible: true,
    tone: "ready",
    label: "Drop folder to add project",
    description: "Local folders and Git repositories",
  };
}

export function useSidebarProjectDrop(args: {
  enabled: boolean;
  sidebarRef: RefObject<HTMLElement | null>;
}): {
  isProjectDropActive: boolean;
  affordance: SidebarProjectDropAffordance;
  dropHandlers: SidebarProjectDropHandlers;
  nativeDropTarget: string;
} {
  const { enabled, sidebarRef } = args;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHandlingDrop, setIsHandlingDrop] = useState(false);
  // Orca tracks depth because dragenter/dragleave fire for every child; the outline must
  // survive crossing the sidebar's own rows and disappear only when the drag really leaves.
  const dragDepthRef = useRef(0);
  const remoteRuntimeActive = useAppStore((state) => {
    const settings = state.settings as { activeRuntimeEnvironmentId?: string | null } | null;
    return Boolean(settings?.activeRuntimeEnvironmentId?.trim());
  });

  const clearDragState = useCallback(() => {
    dragDepthRef.current = 0;
    setIsDragOver(false);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("drop", clearDragState, true);
    document.addEventListener("dragend", clearDragState, true);
    return () => {
      document.removeEventListener("drop", clearDragState, true);
      document.removeEventListener("dragend", clearDragState, true);
    };
  }, [clearDragState]);

  const routeDroppedFolder = useCallback(
    async (paths: readonly string[]): Promise<void> => {
      const resolution = resolveSidebarProjectDropPath(paths);
      if (resolution.status === "empty") {
        return;
      }
      if (resolution.status === "multiple") {
        toast.warning("Drop one folder at a time.");
        return;
      }
      if (remoteRuntimeActive) {
        toast.error("Local folder drops are unavailable for server runtimes.", {
          description: "Use Add Project to enter a host path.",
        });
        return;
      }

      setIsHandlingDrop(true);
      try {
        // The only local directory probe this frontend has: `folder_path_status` answers
        // exists/not-directory/missing. It replaces Orca's `fs.stat` gate without new IPC.
        const status = await invoke<FolderPathStatus>("folder_path_status", {
          path: resolution.path,
        });
        if (!status.exists) {
          toast.error("Drop a folder to add it as a project.", {
            description:
              status.reason === "not-directory"
                ? "That path is a file."
                : status.reason === "missing"
                  ? "That folder no longer exists."
                  : "The folder could not be inspected.",
          });
          return;
        }
        // Route into the Add Project wizard (Orca `openModal('add-repo', { droppedLocalPath })`).
        window.dispatchEvent(
          new CustomEvent("hydra:add-project-from-folder", {
            detail: { path: resolution.path },
          })
        );
      } catch (error) {
        toast.error("Could not add dropped folder.", {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsHandlingDrop(false);
      }
    },
    [remoteRuntimeActive]
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }
    // Why the internals guard: tests and the plain Vite preview render without a Tauri
    // host, where `getCurrentWebview()` throws before any promise exists.
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
          setIsDragOver(false);
          return;
        }
        if (payload.type === "enter" || payload.type === "over") {
          // Why position: Tauri's over event carries no paths, and a drag that started
          // elsewhere must not paint the sidebar outline.
          if (payload.type === "enter") {
            setIsDragOver(isPointInsideElement(sidebarRef.current, toClientPoint(payload.position)));
          }
          return;
        }
        const inside = isPointInsideElement(sidebarRef.current, toClientPoint(payload.position));
        setIsDragOver(false);
        if (!inside) {
          return;
        }
        void routeDroppedFolder(payload.paths);
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
    // Why not depend on isDragOver: the listener only tracks position; re-registering per
    // state change would drop events mid-drag.
  }, [enabled, routeDroppedFolder, sidebarRef]);

  const dropHandlers = useMemo<SidebarProjectDropHandlers>(
    () => ({
      onDragEnter: (event) => {
        if (!hasNativeFileDragTypes(event.dataTransfer.types)) return;
        dragDepthRef.current += 1;
        setIsDragOver(true);
      },
      onDragOver: (event) => {
        if (!hasNativeFileDragTypes(event.dataTransfer.types)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = remoteRuntimeActive ? "none" : "copy";
        setIsDragOver(true);
      },
      onDragLeave: (event) => {
        if (!hasNativeFileDragTypes(event.dataTransfer.types)) return;
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
          setIsDragOver(false);
        }
      },
    }),
    [remoteRuntimeActive]
  );

  return {
    isProjectDropActive: isDragOver || isHandlingDrop,
    affordance: getSidebarProjectDropAffordance({ isDragOver, isHandlingDrop, remoteRuntimeActive }),
    dropHandlers,
    nativeDropTarget: NATIVE_FILE_DROP_TARGET.projectSidebar,
  };
}
