import { describe, expect, it, vi } from "vitest";
import {
  createWorktreeContextMenuDeleteIntent,
  deferWorktreeContextMenuDeleteIntent,
  dedupeDeleteIntentTargets,
} from "./worktree-context-menu-delete-intent";
import {
  isContextWorktreeDeletable,
  isWorktreeParentPickerDisabled,
  selectMenuScopedMap,
  shouldIgnoreNestedWorktreeContextMenuScope,
  shouldRevealWorktreeDeveloperMenu,
  shouldUseNativeContextMenu,
  WORKTREE_CONTEXT_MENU_SCOPE_ATTR,
  WORKTREE_NATIVE_CONTEXT_MENU_ATTR,
} from "./worktree-context-menu-policy";

describe("worktree context-menu policy (Orca parity)", () => {
  it("returns the same empty sentinel while the menu is closed", () => {
    const live = { a: 1 };
    const empty = {};
    expect(selectMenuScopedMap(false, live, empty)).toBe(empty);
    expect(selectMenuScopedMap(true, live, empty)).toBe(live);
  });

  it("hides the developer rows unless Option/Alt was held at open", () => {
    expect(shouldRevealWorktreeDeveloperMenu({ developerMenuRevealed: true, isMultiContext: false })).toBe(true);
    expect(shouldRevealWorktreeDeveloperMenu({ developerMenuRevealed: true, isMultiContext: true })).toBe(false);
    expect(shouldRevealWorktreeDeveloperMenu({ developerMenuRevealed: false, isMultiContext: false })).toBe(false);
  });

  it("honours the native-menu opt-out and nested scope isolation", () => {
    const native = document.createElement("div");
    native.setAttribute(WORKTREE_NATIVE_CONTEXT_MENU_ATTR, "");
    const child = document.createElement("span");
    native.appendChild(child);
    expect(shouldUseNativeContextMenu(child)).toBe(true);
    expect(shouldUseNativeContextMenu(document.createElement("div"))).toBe(false);

    const outer = document.createElement("div");
    outer.setAttribute(WORKTREE_CONTEXT_MENU_SCOPE_ATTR, "");
    const inner = document.createElement("div");
    inner.setAttribute(WORKTREE_CONTEXT_MENU_SCOPE_ATTR, "");
    outer.appendChild(inner);
    const nestedTarget = document.createElement("i");
    inner.appendChild(nestedTarget);
    expect(shouldIgnoreNestedWorktreeContextMenuScope(outer, nestedTarget)).toBe(true);
    expect(shouldIgnoreNestedWorktreeContextMenuScope(outer, outer)).toBe(false);
  });

  it("disables parent picking while deleting and requires a resolvable repo for delete", () => {
    expect(isWorktreeParentPickerDisabled({ isDeleting: true, eligibleParentCount: 3 })).toBe(true);
    expect(isWorktreeParentPickerDisabled({ isDeleting: false, eligibleParentCount: 0 })).toBe(true);
    expect(isWorktreeParentPickerDisabled({ isDeleting: false, eligibleParentCount: 1 })).toBe(false);
    expect(isContextWorktreeDeletable({ isMainWorktree: false }, { id: "repo" })).toBe(true);
    expect(isContextWorktreeDeletable({ isMainWorktree: false }, null)).toBe(false);
    expect(isContextWorktreeDeletable({ isMainWorktree: true }, { id: "repo" })).toBe(false);
  });
});

describe("worktree context-menu delete intent (Orca parity)", () => {
  it("creates single, batch and folder intents that keep host identity", () => {
    const worktree = { id: "repo::/w/a", hostId: "ssh:box" as const };
    expect(
      createWorktreeContextMenuDeleteIntent({
        worktree,
        batchDeleteWorktrees: [],
        isMultiContext: false,
      })
    ).toEqual({ kind: "worktree", worktree: { id: "repo::/w/a", instanceId: undefined, hostId: "ssh:box" } });

    expect(
      createWorktreeContextMenuDeleteIntent({
        worktree,
        batchDeleteWorktrees: [worktree, { id: "repo::/w/b" }],
        isMultiContext: true,
      })
    ).toEqual({
      kind: "batch",
      worktrees: [
        { id: "repo::/w/a", instanceId: undefined, hostId: "ssh:box" },
        { id: "repo::/w/b", instanceId: undefined, hostId: undefined },
      ],
    });

    expect(
      createWorktreeContextMenuDeleteIntent({
        worktree,
        batchDeleteWorktrees: [],
        isMultiContext: false,
        folderWorkspaceId: "folder-1",
      })
    ).toEqual({ kind: "folder", folderWorkspaceId: "folder-1", executionHostId: "ssh:box" });
  });

  it("defers the modal open to a macrotask after the menu closes", () => {
    const openDelete = vi.fn();
    const deferred: (() => void)[] = [];
    deferWorktreeContextMenuDeleteIntent(
      { kind: "worktree", worktree: { id: "a" } },
      { openDelete, deleteFolderWorkspace: async () => false },
      undefined,
      (callback) => deferred.push(callback)
    );
    expect(openDelete).not.toHaveBeenCalled();
    deferred.forEach((callback) => callback());
    expect(openDelete).toHaveBeenCalledWith([{ id: "a" }]);
  });

  it("dedupes by (id, host), dropping main checkouts and in-flight rows", () => {
    const targets = [
      { id: "a", hostId: "local" as const },
      { id: "a", hostId: "local" as const },
      { id: "a", hostId: "ssh:box" as const },
      { id: "main", hostId: "local" as const },
      { id: "busy", hostId: "local" as const },
    ];
    expect(
      dedupeDeleteIntentTargets(targets, {
        isMainWorktree: (target) => target.id === "main",
        isDeleting: (target) => target.id === "busy",
      }).map((target) => `${target.hostId}|${target.id}`)
    ).toEqual(["local|a", "ssh:box|a"]);
  });
});
