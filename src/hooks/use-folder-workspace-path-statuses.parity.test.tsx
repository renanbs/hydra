import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, args?: unknown) => invokeMock(command, args),
}));

import { useFolderWorkspacePathStatuses } from "./use-folder-workspace-path-statuses";

describe("useFolderWorkspacePathStatuses", () => {
  it("badges only confirmed-stale folders", async () => {
    invokeMock.mockImplementation((_command: string, args: { path: string }) =>
      Promise.resolve(
        args.path === "/gone"
          ? { path: "/gone", exists: false, reason: "missing" }
          : args.path === "/blocked"
            ? { path: "/blocked", exists: false, reason: "unavailable" }
            : { path: args.path, exists: true }
      )
    );
    const { result } = renderHook(() =>
      useFolderWorkspacePathStatuses({
        folderWorkspaces: [
          { id: "a", folderPath: "/ok" },
          { id: "b", folderPath: "/gone" },
          { id: "c", folderPath: "/blocked" },
        ],
        epoch: "1:0:0",
      })
    );
    await waitFor(() => expect(result.current.missingFolderPaths.has("/gone")).toBe(true));
    expect(result.current.missingFolderPaths.has("/blocked")).toBe(false);
    expect(result.current.missingFolderPaths.has("/ok")).toBe(false);
    expect(result.current.statusByPath.get("/blocked")?.reason).toBe("unavailable");
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });
});
