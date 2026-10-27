import { beforeEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { markSidebarWorktreeActiveImmediately } from "./sidebar-worktree-active-dom";

function option(args: {
  id: string;
  rowKey: string;
  host: string;
  active?: boolean;
}): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("role", "option");
  element.dataset.worktreeId = args.id;
  element.dataset.worktreeRowKey = args.rowKey;
  element.dataset.worktreeHostIdentity = args.host;
  if (args.active) element.setAttribute("aria-current", "page");
  const surface = document.createElement("div");
  surface.dataset.worktreeCardSurface = "true";
  if (args.active) surface.dataset.worktreeCardActive = "primary";
  element.appendChild(surface);
  return element;
}

let sidebar: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "";
  sidebar = document.createElement("div");
  sidebar.dataset.worktreeSidebar = "true";
  document.body.appendChild(sidebar);
});

describe("markSidebarWorktreeActiveImmediately (D03b-016)", () => {
  it("moves aria-current and the active surface to the clicked row in the same frame", () => {
    const previous = option({ id: "repo::/a", rowKey: "all|a", host: "|repo::/a", active: true });
    const next = option({ id: "repo::/b", rowKey: "all|b", host: "|repo::/b" });
    sidebar.append(previous, next);

    markSidebarWorktreeActiveImmediately("repo::/b", "all|b");

    expect(previous).not.toHaveAttribute("aria-current");
    expect(previous.querySelector("[data-worktree-card-surface]")).not.toHaveAttribute(
      "data-worktree-card-active"
    );
    expect(next).toHaveAttribute("aria-current", "page");
    expect(next.querySelector("[data-worktree-card-surface]")).toHaveAttribute(
      "data-worktree-card-active",
      "primary"
    );
  });

  it("paints the Pinned mirror as secondary when the natural row owns the primary surface", () => {
    const pinned = option({ id: "repo::/b", rowKey: "pinned|b", host: "|repo::/b" });
    const natural = option({ id: "repo::/b", rowKey: "all|b", host: "|repo::/b" });
    sidebar.append(pinned, natural);

    markSidebarWorktreeActiveImmediately("repo::/b", "all|b");

    expect(natural.querySelector("[data-worktree-card-surface]")).toHaveAttribute(
      "data-worktree-card-active",
      "primary"
    );
    expect(pinned.querySelector("[data-worktree-card-surface]")).toHaveAttribute(
      "data-worktree-card-active",
      "secondary"
    );
  });

  it("leaves a same-id workspace on another host untouched", () => {
    const local = option({ id: "repo::/b", rowKey: "all|b", host: "local|repo::/b" });
    const remote = option({ id: "repo::/b", rowKey: "all|b2", host: "ssh:box|repo::/b" });
    sidebar.append(local, remote);

    markSidebarWorktreeActiveImmediately("repo::/b", "all|b");

    expect(local).toHaveAttribute("aria-current", "page");
    expect(remote).not.toHaveAttribute("aria-current");
  });

  it("is a no-op when the row is not mounted (virtualized away)", () => {
    const other = option({ id: "repo::/a", rowKey: "all|a", host: "|repo::/a", active: true });
    sidebar.append(other);

    markSidebarWorktreeActiveImmediately("repo::/missing", "all|missing");

    expect(other).toHaveAttribute("aria-current", "page");
  });
});
