import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import React from "react";

type DragPayload =
  | { type: "enter"; paths: string[]; position: { x: number; y: number } }
  | { type: "over"; position: { x: number; y: number } }
  | { type: "drop"; paths: string[]; position: { x: number; y: number } }
  | { type: "leave" };

const { invokeMock, state } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  state: { handler: null as null | ((event: { payload: DragPayload }) => void) },
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: (handler: (event: { payload: DragPayload }) => void) => {
      state.handler = handler;
      return Promise.resolve(() => {});
    },
  }),
}));

import {
  getSidebarProjectDropAffordance,
  resolveSidebarProjectDropPath,
  useSidebarProjectDrop,
} from "./use-sidebar-project-drop";

function Harness() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { isProjectDropActive, affordance } = useSidebarProjectDrop({
    enabled: true,
    sidebarRef: ref,
  });
  return (
    <div
      ref={(node) => {
        ref.current = node;
        if (node) {
          node.getBoundingClientRect = () =>
            ({ left: 0, top: 0, right: 300, bottom: 800, x: 0, y: 0, width: 300, height: 800, toJSON: () => ({}) }) as DOMRect;
        }
      }}
      data-testid="sidebar"
    >
      {isProjectDropActive && affordance.visible ? (
        <div data-testid="overlay" data-tone={affordance.tone} />
      ) : null}
    </div>
  );
}

async function emit(payload: DragPayload) {
  await act(async () => {
    state.handler?.({ payload });
  });
}

beforeEach(() => {
  // The hook only registers against a real Tauri host; the test impersonates one.
  (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ path: "/a", exists: true, reason: null });
  state.handler = null;
});

function captureDroppedPaths(): string[] {
  const paths: string[] = [];
  const listener = (event: Event) => {
    const path = (event as CustomEvent<{ path?: string }>).detail?.path;
    if (path) paths.push(path);
  };
  window.addEventListener("hydra:add-project-from-folder", listener);
  return paths;
}

describe("useSidebarProjectDrop (D01-004)", () => {
  it("paints the outline only while the drag is over the sidebar", async () => {
    render(<Harness onAdded={vi.fn()} />);
    await act(async () => {});

    await emit({ type: "enter", paths: ["/repo"], position: { x: 100, y: 100 } });
    expect(screen.queryByTestId("overlay")).not.toBeNull();

    await emit({ type: "leave" });
    expect(screen.queryByTestId("overlay")).toBeNull();

    await emit({ type: "enter", paths: ["/repo"], position: { x: 900, y: 100 } });
    expect(screen.queryByTestId("overlay")).toBeNull();
  });

  it("routes a single dropped folder into the Add Project wizard after the directory gate", async () => {
    const routed = captureDroppedPaths();
    render(<Harness />);
    await act(async () => {});

    await emit({ type: "drop", paths: ["/a"], position: { x: 20, y: 20 } });

    expect(invokeMock).toHaveBeenCalledWith("folder_path_status", { path: "/a" });
    // The catalog write belongs to the wizard, not to the drop handler.
    expect(invokeMock).not.toHaveBeenCalledWith("catalog_add_folder", expect.anything());
    await act(async () => {});
    expect(routed).toEqual(["/a"]);
    expect(screen.queryByTestId("overlay")).toBeNull();
  });

  it("refuses a multi-folder drop instead of adding the first path", async () => {
    const routed = captureDroppedPaths();
    render(<Harness />);
    await act(async () => {});

    await emit({ type: "drop", paths: ["/a", "/b"], position: { x: 20, y: 20 } });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(routed).toEqual([]);
  });

  it("refuses a path the directory probe rejects", async () => {
    const routed = captureDroppedPaths();
    invokeMock.mockResolvedValue({ path: "/file.txt", exists: false, reason: "not-directory" });
    render(<Harness />);
    await act(async () => {});

    await emit({ type: "drop", paths: ["/file.txt"], position: { x: 20, y: 20 } });

    expect(invokeMock).toHaveBeenCalledWith("folder_path_status", { path: "/file.txt" });
    expect(routed).toEqual([]);
  });

  it("ignores a drop outside the sidebar", async () => {
    const routed = captureDroppedPaths();
    render(<Harness />);
    await act(async () => {});

    await emit({ type: "drop", paths: ["/a"], position: { x: 900, y: 20 } });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(routed).toEqual([]);
  });

  it("resolves one usable path and reports multi/empty drops", () => {
    expect(resolveSidebarProjectDropPath(["/a"])).toEqual({ status: "ready", path: "/a" });
    expect(resolveSidebarProjectDropPath(["/a", "  "])).toEqual({ status: "ready", path: "/a" });
    expect(resolveSidebarProjectDropPath([])).toEqual({ status: "empty" });
    expect(resolveSidebarProjectDropPath(["/a", "/b"])).toEqual({ status: "multiple", count: 2 });
  });

  it("tones the overlay for ready, blocked and busy drags", () => {
    expect(
      getSidebarProjectDropAffordance({ isDragOver: false, isHandlingDrop: false, remoteRuntimeActive: false })
    ).toEqual({ visible: false });
    expect(
      getSidebarProjectDropAffordance({ isDragOver: true, isHandlingDrop: false, remoteRuntimeActive: false })
    ).toMatchObject({ tone: "ready", label: "Drop folder to add project" });
    expect(
      getSidebarProjectDropAffordance({ isDragOver: true, isHandlingDrop: false, remoteRuntimeActive: true })
    ).toMatchObject({ tone: "blocked", label: "Server runtime active" });
    expect(
      getSidebarProjectDropAffordance({ isDragOver: true, isHandlingDrop: true, remoteRuntimeActive: false })
    ).toMatchObject({ tone: "busy" });
  });
});
