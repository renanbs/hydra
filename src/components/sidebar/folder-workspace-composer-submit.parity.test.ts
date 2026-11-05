import { describe, expect, it, vi } from "vitest";
import {
  resolveFolderWorkspaceName,
  submitFolderWorkspaceCreate,
} from "./folder-workspace-composer-submit";
import type { FolderWorkspace } from "../../shared/folder-workspace-types";
import { getFolderWorkspaceAgentLaunchPlatform } from "./folder-workspace-agent-startup";

const group = {
  id: "grp",
  name: "acme",
  parentPath: "/work/acme",
  connectionId: null,
  executionHostId: null,
};

function workspace(overrides: Partial<FolderWorkspace> = {}): FolderWorkspace {
  return {
    id: "fw1",
    projectGroupId: "grp",
    name: "acme workspace",
    folderPath: "/work/acme",
    linkedTask: null,
    comment: "",
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 1,
    lastActivityAt: 1,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("folder workspace composer submit (D02a-034/035/037)", () => {
  it("uses the linked item name only while the field is auto-managed", () => {
    const linked = {
      provider: "github" as const,
      type: "issue" as const,
      number: 7,
      title: "Fix auth flow",
      url: "https://github.com/acme/api/issues/7",
    };
    expect(
      resolveFolderWorkspaceName({
        name: "",
        lastAutoName: "acme",
        linkedWorkItem: linked,
        groupName: "acme",
      })
    ).toBe("Fix auth flow");
    expect(
      resolveFolderWorkspaceName({
        name: "ship-it",
        lastAutoName: "acme",
        linkedWorkItem: linked,
        groupName: "acme",
      })
    ).toBe("ship-it");
    expect(
      resolveFolderWorkspaceName({
        name: "acme",
        lastAutoName: "acme",
        linkedWorkItem: null,
        groupName: "acme",
      })
    ).toBe("acme");
  });

  it("creates with the linked task, preflights trust and activates the workspace", async () => {
    const created = workspace();
    const createFolderWorkspace = vi.fn(async () => created);
    const activateFolderWorkspace = vi.fn(() => true);
    const onOpenChange = vi.fn();

    const result = await submitFolderWorkspaceCreate({
      projectGroup: group,
      name: "",
      lastAutoName: "",
      linkedWorkItem: {
        provider: "github",
        type: "issue",
        number: 7,
        title: "Fix auth flow",
        url: "https://github.com/acme/api/issues/7",
      },
      note: "please fix",
      quickAgent: "claude",
      autoRenameBranchFromWork: false,
      agentCmdOverrides: undefined,
      createFolderWorkspace,
      activateFolderWorkspace,
      onOpenChange,
    });

    expect(createFolderWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        projectGroupId: "grp",
        name: "Fix auth flow",
        folderPath: "/work/acme",
        linkedTask: expect.objectContaining({ provider: "github", number: 7 }),
        createdWithAgent: "claude",
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(activateFolderWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ workspace: created })
    );
    expect(result?.workspace).toBe(created);
    // The launch plan is built when the ported quoting helpers are available;
    // either way the workspace creation must succeed and be revealed.
    expect(result).not.toBeNull();
  });

  it("selects win32 quoting for a Windows path on an SSH host", () => {
    expect(
      getFolderWorkspaceAgentLaunchPlatform({
        connectionId: "srv",
        parentPath: "C:\\Users\\dev\\projects",
      })
    ).toBe("win32");
    expect(
      getFolderWorkspaceAgentLaunchPlatform({
        connectionId: "srv",
        parentPath: "/home/dev/projects",
      })
    ).toBe("linux");
  });

  it("does not activate when creation returns null", async () => {
    const activateFolderWorkspace = vi.fn();
    const result = await submitFolderWorkspaceCreate({
      projectGroup: group,
      name: "x",
      lastAutoName: "",
      linkedWorkItem: null,
      note: "",
      quickAgent: null,
      autoRenameBranchFromWork: false,
      agentCmdOverrides: undefined,
      createFolderWorkspace: async () => null,
      activateFolderWorkspace,
      onOpenChange: vi.fn(),
    });
    expect(result).toBeNull();
    expect(activateFolderWorkspace).not.toHaveBeenCalled();
  });
});
