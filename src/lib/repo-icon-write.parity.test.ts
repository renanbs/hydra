// The repo-icon write path's pure pieces: App's optimistic patch (the header
// redraws from it) and the catalog IPC the picker confirms with. The sidebar
// test in `WorktreeSidebar.project-group-menus.parity.test.tsx` covers the menu
// flow; these pin the state update and the command contract.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { sanitizeRepoIcon } from "../shared/repo-icon";
import type { CatalogEnvelope } from "./catalog-types";
import {
  applyProjectIconEvent,
  applyRepoIconToProjects,
  PROJECT_ICON_OPTIMISTIC_EVENT,
  REPO_ICON_EMOJI_CHOICES,
} from "./repo-icon-write";
import { catalogRepoIdFromProjectId, setCatalogRepoIcon } from "./catalog-client";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

type ProjectRow = { id: string; name: string; repo_icon?: { type: "emoji"; emoji: string } | null };

const PROJECTS: ProjectRow[] = [
  { id: "repo_a", name: "hydra" },
  { id: "repo_b", name: "orca" },
];

describe("applyRepoIconToProjects", () => {
  it("patches only the target project and never mutates the input rows", () => {
    const rocket = { type: "emoji" as const, emoji: "🚀" };
    const next = applyRepoIconToProjects(PROJECTS, "repo_a", rocket);

    expect(next).not.toBe(PROJECTS);
    expect(next[0]).toEqual({ id: "repo_a", name: "hydra", repo_icon: rocket });
    // Untouched rows keep their identity, so only the edited header re-renders.
    expect(next[1]).toBe(PROJECTS[1]);
    expect(PROJECTS[0].repo_icon).toBeUndefined();
  });

  it("clears the glyph with null and leaves an unknown project untouched", () => {
    const withIcon: ProjectRow[] = [{ ...PROJECTS[0], repo_icon: { type: "emoji", emoji: "📦" } }];

    expect(applyRepoIconToProjects(withIcon, "repo_a", null)[0].repo_icon).toBeNull();
    expect(applyRepoIconToProjects(withIcon, "repo_missing", null)).toEqual(withIcon);
  });

  it("turns the picker's optimistic event into the patched project list", () => {
    // Exactly what App's listener receives when the picker confirms.
    const event = new CustomEvent(PROJECT_ICON_OPTIMISTIC_EVENT, {
      detail: { projectId: "repo_b", repoIcon: { type: "emoji", emoji: "🧩" } },
    });
    const next = applyProjectIconEvent(PROJECTS, event);

    expect(next?.[1]).toEqual({
      id: "repo_b",
      name: "orca",
      repo_icon: { type: "emoji", emoji: "🧩" },
    });
    expect(next?.[0]).toBe(PROJECTS[0]);
    // A dispatch without a project keeps the caller's list (no re-render).
    expect(
      applyProjectIconEvent(PROJECTS, new CustomEvent(PROJECT_ICON_OPTIMISTIC_EVENT))
    ).toBeNull();
  });
});

describe("repo icon catalog contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the sidebar project id back to the catalog row id", () => {
    expect(catalogRepoIdFromProjectId("repo_a")).toBe("a");
    expect(catalogRepoIdFromProjectId("a")).toBe("a");
  });

  it("writes through `catalog_set_repo_icon` with camelCase args", async () => {
    const envelope = { schemaVersion: 1, projectGroups: [], folderWorkspaces: [], repos: [] };
    vi.mocked(invoke).mockResolvedValueOnce(envelope);

    await expect(
      setCatalogRepoIcon("a", { type: "emoji", emoji: "🚀" })
    ).resolves.toEqual(envelope);
    expect(invoke).toHaveBeenCalledWith("catalog_set_repo_icon", {
      repoId: "a",
      repoIcon: { type: "emoji", emoji: "🚀" },
    });
  });

  it("clears through the same command with a null payload", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({} satisfies Partial<CatalogEnvelope>);

    await setCatalogRepoIcon("a", null);
    expect(invoke).toHaveBeenCalledWith("catalog_set_repo_icon", {
      repoId: "a",
      repoIcon: null,
    });
  });

  it("keeps every curated emoji inside the shared sanitizer's contract", () => {
    const labels = new Set<string>();
    const emojis = new Set<string>();
    for (const choice of REPO_ICON_EMOJI_CHOICES) {
      expect(labels.has(choice.label)).toBe(false);
      expect(emojis.has(choice.emoji)).toBe(false);
      labels.add(choice.label);
      emojis.add(choice.emoji);
      // Why: the picker writes through `sanitizeRepoIcon`'s 16-char emoji cap;
      // a curated glyph over it would be accepted by the UI and rejected on write.
      expect(sanitizeRepoIcon({ type: "emoji", emoji: choice.emoji })).toEqual({
        type: "emoji",
        emoji: choice.emoji,
      });
    }
  });
});
