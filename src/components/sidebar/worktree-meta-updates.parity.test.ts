import { describe, expect, it } from "vitest";
import { buildWorktreeMetaUpdates, isIssueFieldDirty } from "./worktree-meta-updates";
import type {
  WorktreeMetaDraft,
  WorktreeMetaLiveLinks,
  WorktreeMetaSnapshot,
} from "./worktree-meta-updates";

function snapshot(overrides: Partial<WorktreeMetaSnapshot> = {}): WorktreeMetaSnapshot {
  return {
    displayName: "Nautilus",
    comment: "note",
    issueInput: "",
    issueProvider: "github",
    prInput: "",
    ...overrides,
  };
}

function draft(overrides: Partial<WorktreeMetaDraft> = {}): WorktreeMetaDraft {
  return {
    displayNameInput: "Nautilus",
    commentInput: "note",
    issueInput: "",
    issueProvider: "github",
    reviewInput: "",
    ...overrides,
  };
}

const live: WorktreeMetaLiveLinks = {
  linkedIssue: null,
  linkedPR: null,
  linkedLinearIssue: null,
  linkedWorkItemProvider: null,
  linkedWorkItemType: null,
};

describe("worktree meta update payload (Orca parity)", () => {
  it("emits nothing for an untouched draft", () => {
    expect(buildWorktreeMetaUpdates(draft(), snapshot(), live)).toEqual({});
  });

  it("clears a GitHub issue and suppresses a cleared review", () => {
    expect(
      buildWorktreeMetaUpdates(
        draft({ issueInput: "" }),
        snapshot({ issueInput: "#42", prInput: "7" }),
        { ...live, linkedIssue: 42, linkedPR: 7 },
        "github"
      )
    ).toEqual({ linkedIssue: null, linkedPR: null, suppressedGitHubPR: 7 });
  });

  it("normalizes #42 and 42 to the same identity", () => {
    expect(
      isIssueFieldDirty(draft({ issueInput: "#42" }), snapshot({ issueInput: "42" }))
    ).toBe(false);
  });

  it("keeps a re-stated issue instead of displacing it", () => {
    const updates = buildWorktreeMetaUpdates(
      draft({ issueInput: "https://github.com/o/r/issues/42" }),
      snapshot({ issueInput: "42" }),
      {
        ...live,
        linkedIssue: 42,
        linkedWorkItemProvider: "github",
        linkedWorkItemType: "issue",
      }
    );
    expect(updates).toEqual({});
  });

  it("writes a Linear identifier with its org key and clears the GitHub slot", () => {
    expect(
      buildWorktreeMetaUpdates(
        draft({
          issueProvider: "linear",
          issueInput: "https://linear.app/acme/issue/STA-335/title",
        }),
        snapshot(),
        live
      )
    ).toEqual({
      linkedIssue: null,
      linkedLinearIssue: "STA-335",
      linkedLinearIssueWorkspaceId: null,
      linkedLinearIssueOrganizationUrlKey: "acme",
    });
  });

  it("emits no key holding undefined", () => {
    const updates = buildWorktreeMetaUpdates(
      draft({ displayNameInput: "  ", commentInput: "" }),
      snapshot(),
      live
    );
    for (const value of Object.values(updates)) {
      expect(value).not.toBeUndefined();
    }
  });
});
