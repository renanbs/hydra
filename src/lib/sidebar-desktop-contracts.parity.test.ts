import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  checkForAppUpdates,
  isAppRestartAvailable,
  isUpdateCheckAvailable,
  loadGitHubViewer,
  openExternalUrl,
  restartApp,
  submitSidebarFeedback
} from "./sidebar-desktop-contracts";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));

describe("sidebar desktop contracts (D01-037/D01-038/D01-039/D01-041/D01-043)", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockClear();
    // Tauri has no Orca preload bridge; every probe must degrade, never throw.
    delete (window as unknown as { api?: unknown }).api;
  });

  it("opens URLs through the real Tauri command", async () => {
    await openExternalUrl("https://github.com/renanbs/hydra");
    expect(invoke).toHaveBeenCalledWith("open_external_url_cmd", {
      url: "https://github.com/renanbs/hydra",
    });
  });

  it("reports the missing feedback backend instead of pretending to send", async () => {
    const result = await submitSidebarFeedback({
      feedback: "body",
      submitAnonymously: false,
      githubLogin: null,
      githubEmail: null,
      images: [],
    });

    expect(result).toEqual({
      ok: false,
      error: "Feedback submission backend is not available in this build.",
    });
  });

  it("loads the viewer through the gh_viewer command", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      login: "octocat",
      email: "octo@example.com",
    });

    await expect(loadGitHubViewer()).resolves.toEqual({
      login: "octocat",
      email: "octo@example.com",
    });
    expect(invoke).toHaveBeenCalledWith("gh_viewer");
  });

  it("falls back to the anonymous path when gh is not authenticated", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(
      "gh-not-authenticated: gh auth login required"
    );

    await expect(loadGitHubViewer()).resolves.toBeNull();
  });

  it("keeps unexpected command failures visible", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("spawn failed"));

    await expect(loadGitHubViewer()).rejects.toThrow("spawn failed");
  });

  it("surfaces the absent updater and restart commands precisely", async () => {
    expect(isUpdateCheckAvailable()).toBe(false);
    expect(isAppRestartAvailable()).toBe(false);
    await expect(checkForAppUpdates({ includePrerelease: true })).rejects.toThrow(
      "Update checks are not available in this build."
    );
    await expect(restartApp()).rejects.toThrow(
      "Application restart is not available in this build."
    );
  });
});
