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

import { useSidebarProjectDrop } from "./use-sidebar-project-drop";

function Harness({ onAdded }: { onAdded: () => void }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { isProjectDropActive } = useSidebarProjectDrop({
    enabled: true,
    sidebarRef: ref,
    onProjectAdded: onAdded,
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
      {isProjectDropActive ? <div data-testid="overlay" /> : null}
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
  invokeMock.mockResolvedValue(undefined);
  state.handler = null;
});

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

  it("adds every dropped folder and reports once when the drop lands inside", async () => {
    const onAdded = vi.fn();
    render(<Harness onAdded={onAdded} />);
    await act(async () => {});

    await emit({ type: "drop", paths: ["/a", "/b"], position: { x: 20, y: 20 } });

    expect(invokeMock).toHaveBeenCalledWith("catalog_add_folder", { path: "/a" });
    expect(invokeMock).toHaveBeenCalledWith("catalog_add_folder", { path: "/b" });
    await act(async () => {});
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("overlay")).toBeNull();
  });

  it("ignores a drop outside the sidebar", async () => {
    const onAdded = vi.fn();
    render(<Harness onAdded={onAdded} />);
    await act(async () => {});

    await emit({ type: "drop", paths: ["/a"], position: { x: 900, y: 20 } });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });
});
