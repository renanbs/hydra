import { describe, expect, it } from "vitest";
import {
  catalogEnvelopeToRepos,
  catalogRepoToRepo,
  projectCatalogEnvelope,
} from "../../lib/catalog-store-projection";
import type { CatalogEnvelope } from "../../lib/catalog-types";

const envelope: CatalogEnvelope = {
  schemaVersion: 1,
  projectGroups: [],
  folderWorkspaces: [],
  repos: [
    {
      id: "abc",
      path: "/work/api/",
      displayName: "api",
      addedAt: 123,
      kind: "git",
      projectGroupId: "grp",
      connectionId: "srv",
      executionHostId: "ssh:srv",
      externalWorktreeVisibility: "show",
    },
    {
      id: "def",
      path: "/work/notes",
      displayName: "",
      addedAt: 456,
      kind: "folder",
    },
  ],
};

describe("catalog → store projection (D02a-032)", () => {
  it("keeps the sidebar repo id and host stamps", () => {
    const repo = catalogRepoToRepo(envelope.repos[0]);
    expect(repo.id).toBe("repo_abc");
    expect(repo.path).toBe("/work/api/");
    expect(repo.kind).toBe("git");
    expect(repo.connectionId).toBe("srv");
    expect(repo.executionHostId).toBe("ssh:srv");
    expect(repo.projectGroupId).toBe("grp");
    expect(repo.externalWorktreeVisibility).toBe("show");
  });

  it("falls back to the path basename for an empty display name", () => {
    expect(catalogRepoToRepo(envelope.repos[1]).displayName).toBe("notes");
  });

  it("returns repo rows even when the project projection is unavailable", () => {
    const projection = projectCatalogEnvelope(envelope);
    expect(catalogEnvelopeToRepos(envelope)).toHaveLength(2);
    expect(projection.repos).toHaveLength(2);
    // The port's project/setup projector still imports stubs; the guard keeps
    // the catalog read alive instead of throwing.
    expect(Array.isArray(projection.projects)).toBe(true);
    expect(Array.isArray(projection.projectHostSetups)).toBe(true);
  });
});
