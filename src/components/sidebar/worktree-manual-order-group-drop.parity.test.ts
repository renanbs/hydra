import { describe, expect, it } from "vitest";
import {
  buildManualOrderUpdatesForGroupDrop,
  shouldWriteManualOrderForGroupDrop,
  type WorktreeDragGroup,
} from "./worktree-manual-order";

const GROUPS: WorktreeDragGroup[] = [
  { key: "repo:a", worktreeIds: ["a1", "a2"] },
  { key: "workspace-status:todo", worktreeIds: ["t1", "t2"] },
];

describe("cross-lane manual order (D06-019)", () => {
  it("moves dragged ids into the target lane at the resolved slot", () => {
    const result = buildManualOrderUpdatesForGroupDrop({
      groups: GROUPS,
      targetGroupKey: "workspace-status:todo",
      draggedIds: ["a1"],
      dropIndex: 1,
      now: 1,
      allWorktreeIds: ["a1", "a2", "t1", "t2"],
    });

    expect(result.changed).toBe(true);
    expect(result.orderedIds).toEqual(["a2", "t1", "a1", "t2"]);
    expect(result.updates.size).toBeGreaterThan(0);
  });

  it("leaves the other lane's relative order intact", () => {
    const result = buildManualOrderUpdatesForGroupDrop({
      groups: GROUPS,
      targetGroupKey: "repo:a",
      draggedIds: ["t1"],
      dropIndex: 0,
      now: 1,
      allWorktreeIds: ["a1", "a2", "t1", "t2"],
    });

    expect(result.orderedIds).toEqual(["t1", "a1", "a2", "t2"]);
  });

  it("writes order only in manual mode or when the drop stays in the source group", () => {
    expect(
      shouldWriteManualOrderForGroupDrop({
        sortBy: "manual",
        sourceGroupKeys: ["repo:a"],
        targetGroupKey: "workspace-status:todo",
      })
    ).toBe(true);
    expect(
      shouldWriteManualOrderForGroupDrop({
        sortBy: "smart",
        sourceGroupKeys: ["repo:a"],
        targetGroupKey: "workspace-status:todo",
      })
    ).toBe(false);
    expect(
      shouldWriteManualOrderForGroupDrop({
        sortBy: "smart",
        sourceGroupKeys: ["repo:a"],
        targetGroupKey: "repo:a",
      })
    ).toBe(true);
  });
});
