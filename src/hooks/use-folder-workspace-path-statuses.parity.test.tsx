import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { FOLDER_WORKSPACE_PATH_STATUS_TTL_MS } from "../shared/folder-workspace-path-status";

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

describe("useFolderWorkspacePathStatuses host isolation", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  afterEach(() => {
    invokeMock.mockReset();
    vi.restoreAllMocks();
  });

  it("never probes a remote host's folder with the local command", async () => {
    invokeMock.mockResolvedValue({ path: "/local/repo", exists: true });
    const { result } = renderHook(() =>
      useFolderWorkspacePathStatuses({
        folderWorkspaces: [
          { id: "remote", folderPath: "/hosts/shared", executionHostId: "ssh:box" },
          { id: "local", folderPath: "/local/repo" },
        ],
        epoch: "1:1:0",
      })
    );
    await waitFor(() => expect(result.current.statusByPath.has("/local/repo")).toBe(true));
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("folder_path_status", { path: "/local/repo" });
    expect(result.current.statusByPath.has("/hosts/shared")).toBe(false);
    expect(result.current.missingFolderPaths.has("/hosts/shared")).toBe(false);
    expect(result.current.getFreshFolderWorkspacePathStatus("/hosts/shared")).toBeNull();
  });

  it("does not reuse a local answer after the same path moves to an ssh host", async () => {
    invokeMock.mockResolvedValue({ path: "/srv/repo", exists: false, reason: "missing" });
    const { result, rerender } = renderHook(
      ({ folderWorkspaces }: { folderWorkspaces: { id: string; folderPath: string; connectionId?: string }[] }) =>
        useFolderWorkspacePathStatuses({ folderWorkspaces, epoch: "1:0:0" }),
      { initialProps: { folderWorkspaces: [{ id: "one", folderPath: "/srv/repo" }] } }
    );
    await waitFor(() => expect(result.current.missingFolderPaths.has("/srv/repo")).toBe(true));
    expect(invokeMock).toHaveBeenCalledTimes(1);

    rerender({ folderWorkspaces: [{ id: "one", folderPath: "/srv/repo", connectionId: "box" }] });
    await waitFor(() => expect(result.current.statusByPath.has("/srv/repo")).toBe(false));
    expect(result.current.missingFolderPaths.has("/srv/repo")).toBe(false);
    expect(result.current.getFreshFolderWorkspacePathStatus("/srv/repo")).toBeNull();
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("stops serving a probe once it ages past the TTL", async () => {
    invokeMock.mockResolvedValue({ path: "/gone", exists: false, reason: "missing" });
    const { result } = renderHook(() =>
      useFolderWorkspacePathStatuses({
        folderWorkspaces: [{ id: "gone", folderPath: "/gone" }],
        epoch: "1:0:0",
      })
    );
    await waitFor(() => expect(result.current.missingFolderPaths.has("/gone")).toBe(true));
    expect(result.current.getFreshFolderWorkspacePathStatus("/gone")?.reason).toBe("missing");

    const expiredAt = Date.now() + FOLDER_WORKSPACE_PATH_STATUS_TTL_MS;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(expiredAt);
    expect(result.current.getFreshFolderWorkspacePathStatus("/gone")).toBeNull();
    // The badge keeps its last answer; only the gates lose trust in it.
    expect(result.current.statusByPath.get("/gone")?.reason).toBe("missing");
    nowSpy.mockRestore();
    expect(result.current.getFreshFolderWorkspacePathStatus("/gone")?.reason).toBe("missing");
  });
});
