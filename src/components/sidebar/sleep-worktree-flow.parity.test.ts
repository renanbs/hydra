import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runSleepWorktrees,
  scheduleSleepWorktreesAfterMenuClose,
  type SleepWorktreePorts,
} from "./sleep-worktree-flow";
import { clearWorktreeSleepIntent, hasWorktreeSleepIntent } from "../../lib/worktree-sleep-intent";

function createPorts(overrides: Partial<SleepWorktreePorts> = {}) {
  const calls: string[] = [];
  let active: string | null = "/w/a";
  const ports: SleepWorktreePorts = {
    getActiveWorktreeId: () => active,
    setActiveWorktree: (id) => {
      active = id;
      calls.push(`active:${id ?? "null"}`);
    },
    shutdownWorktreeBrowsers: async (id) => {
      calls.push(`browsers:${id}`);
    },
    shutdownWorktreeTerminals: async (id, options) => {
      calls.push(`terminals:${id}:${options.keepIdentifiers}`);
    },
    ...overrides,
  };
  return { ports, calls };
}

afterEach(() => {
  clearWorktreeSleepIntent("/w/a");
  clearWorktreeSleepIntent("/w/b");
  vi.useRealTimers();
});

describe("sleep-worktree-flow (Orca parity)", () => {
  it("tears browsers down before terminals with keepIdentifiers and clears the active row", async () => {
    const { ports, calls } = createPorts();
    const result = await runSleepWorktrees(["/w/a"], ports);
    expect(result.errors).toEqual([]);
    expect(calls).toEqual(["active:null", "browsers:/w/a", "terminals:/w/a:true"]);
    expect(hasWorktreeSleepIntent("/w/a")).toBe(true);
  });

  it("captures the scroll anchor before clearing the active workspace", async () => {
    const anchors: string[] = [];
    const { ports } = createPorts({ captureScrollAnchor: (id) => anchors.push(id) });
    await runSleepWorktrees(["/w/a"], ports);
    expect(anchors).toEqual(["/w/a"]);
  });

  it("keeps the workspace open and restores it when teardown fails", async () => {
    const { ports, calls } = createPorts({
      shutdownWorktreeTerminals: async () => {
        throw new Error("terminal_runtime connection lost");
      },
    });
    const result = await runSleepWorktrees(["/w/a"], ports);
    expect(result.failedWorktreeIds).toEqual(["/w/a"]);
    // Active workspace was cleared, then restored because the sleep failed.
    expect(calls).toEqual(["active:null", "browsers:/w/a", "active:/w/a"]);
    expect(hasWorktreeSleepIntent("/w/a")).toBe(false);
  });

  it("does not sleep an active workspace re-activated during the batch", async () => {
    let active: string | null = "/w/a";
    const { ports } = createPorts({
      getActiveWorktreeId: () => active,
      setActiveWorktree: (id) => {
        active = id;
      },
      // Re-activate during teardown, as a user click would.
      shutdownWorktreeTerminals: async () => {
        active = "/w/a";
      },
    });
    await runSleepWorktrees(["/w/a"], ports);
    expect(hasWorktreeSleepIntent("/w/a")).toBe(false);
  });

  it("schedules after a 50ms menu-close delay", () => {
    vi.useFakeTimers();
    const sleep = vi.fn();
    const close = vi.fn();
    scheduleSleepWorktreesAfterMenuClose(["/w/a"], sleep, close);
    expect(close).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(sleep).toHaveBeenCalledWith(["/w/a"]);
  });
});
