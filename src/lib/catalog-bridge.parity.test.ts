// The sidebar's folder list is built here, and the path-status probe is keyed by
// the folder's host (D03a-057). If the bridge drops the host stamps, every folder
// reads as local and a remote repo reuses this machine's answer — the exact bug
// this file locks out.
import { describe, expect, it } from "vitest";
import { catalogToSidebarModel } from "./catalog-bridge";
import type { CatalogEnvelope } from "./catalog-types";

const ENVELOPE: CatalogEnvelope = {
  schemaVersion: 1,
  projectGroups: [],
  repos: [],
  folderWorkspaces: [
    {
      id: "fw_local",
      projectGroupId: "grp_1",
      name: "Local",
      folderPath: "/home/renan/src/local",
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "fw_ssh",
      projectGroupId: "grp_1",
      name: "Remote",
      folderPath: "/srv/remote",
      executionHostId: "ssh:box",
      connectionId: null,
      sortOrder: 1,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "fw_legacy",
      projectGroupId: "grp_1",
      name: "Legacy remote",
      folderPath: "/srv/legacy",
      connectionId: "old-box",
      sortOrder: 2,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
};

describe("catalogToSidebarModel folder workspaces", () => {
  it("keeps the host stamps the path-status cache keys on", () => {
    const [local, remote, legacy] = catalogToSidebarModel(ENVELOPE).folderWorkspaces;

    expect(local.executionHostId).toBeNull();
    expect(local.connectionId).toBeNull();
    expect(remote.executionHostId).toBe("ssh:box");
    expect(legacy.connectionId).toBe("old-box");
    expect(legacy.executionHostId).toBeNull();
  });
});
