// Parity guard for the discovery-notice host glyph (Orca
// `components/sidebar/NoticeHostGlyph.tsx`): one host vocabulary — a monitor for this
// computer, a server for a remote host — the worktree card's "Project on …" tooltip, and
// a "disconnected" verdict ONLY when a runtime probe actually answered unreachable. An
// absent probe entry means "not asked yet", never "down".
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";
import ja from "@/i18n/locales/ja.json";
import ko from "@/i18n/locales/ko.json";
import zh from "@/i18n/locales/zh.json";
import type { ExecutionHostId } from "../../shared/execution-host";

const testState = vi.hoisted(() => ({
  runtimeStatusByEnvironmentId: new Map<string, unknown>(),
}));

vi.mock("@/store", () => ({
  useAppStore: (selector: (state: typeof testState) => unknown) => selector(testState),
}));

// Radix only mounts TooltipContent once the trigger is hovered/focused; the tooltip copy
// is under test here, so paint it alongside the trigger.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <span data-testid="tooltip">{children}</span>
  ),
}));

import NoticeHostGlyph from "./NoticeHostGlyph";

function renderGlyph(
  hostId: ExecutionHostId,
  hostLabel = "openclaw",
  keyboardFocusable = false
): HTMLElement {
  return render(
    <NoticeHostGlyph
      hostId={hostId}
      hostLabel={hostLabel}
      keyboardFocusable={keyboardFocusable}
    />
  ).container;
}

function tooltipText(): string | null {
  return screen.getByTestId("tooltip").textContent;
}

function glyphClass(container: HTMLElement): string {
  return container.querySelector("svg")?.getAttribute("class") ?? "";
}

describe("NoticeHostGlyph (Orca parity)", () => {
  beforeEach(() => {
    testState.runtimeStatusByEnvironmentId.clear();
  });

  it("names the SSH host it would act on with the server glyph", () => {
    const container = renderGlyph("ssh:openclaw-target");

    expect(container.querySelector('[data-notice-host-kind="ssh"]')).not.toBeNull();
    expect(tooltipText()).toBe("Project on SSH host openclaw");
    expect(glyphClass(container)).toContain("lucide-server");
  });

  it("gives the local host the monitor glyph the run-target rows use", () => {
    const container = renderGlyph("local", "Local Mac");

    expect(container.querySelector('[data-notice-host-kind="local"]')).not.toBeNull();
    expect(tooltipText()).toBe("Project on this host");
    expect(glyphClass(container)).toContain("lucide-monitor");
  });

  it("names a paired runtime separately from the SSH host of the same name", () => {
    testState.runtimeStatusByEnvironmentId.set("openclaw-env", { status: {} });
    const container = renderGlyph("runtime:openclaw-env");

    expect(container.querySelector('[data-notice-host-kind="runtime"]')).not.toBeNull();
    expect(tooltipText()).toBe("Project on openclaw");
  });

  it("does not call a host disconnected before its first probe answers", () => {
    // No entry means "not asked yet", not "asked and unreachable" — collapsing the two
    // painted every remote row destructive between launch and the first probe.
    const container = renderGlyph("runtime:openclaw-env");

    expect(tooltipText()).toBe("Project on openclaw");
    expect(glyphClass(container)).not.toContain("text-destructive");
  });

  it("marks a paired runtime a probe found unreachable as disconnected", () => {
    testState.runtimeStatusByEnvironmentId.set("openclaw-env", { status: null });
    const container = renderGlyph("runtime:openclaw-env");

    expect(tooltipText()).toBe("openclaw disconnected");
    expect(glyphClass(container)).toContain("text-destructive");
  });

  it("makes a passive row glyph keyboard reachable with an accessible name", () => {
    renderGlyph("ssh:openclaw-target", "openclaw", true);

    // A passive rows' glyph (notice header) is reachable; the label is the tooltip copy.
    const trigger = screen.getByRole("img", { name: "Project on SSH host openclaw" });
    expect(trigger).toHaveAttribute("tabindex", "0");
  });

  it("does not add a nested tab stop when the glyph sits inside a button", () => {
    const container = renderGlyph("ssh:openclaw-target");

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("[data-notice-host-kind]")).not.toHaveAttribute("tabindex");
  });

  it("draws one glyph vocabulary: a monitor for local, a server for remote", () => {
    const local = renderGlyph("local", "Local Mac");
    const localClass = glyphClass(local);
    cleanup();
    const remote = renderGlyph("ssh:openclaw-target");
    const remoteClass = glyphClass(remote);

    // Same size and tone tokens, so neither row reads as decorated.
    const tokens = (value: string): string[] =>
      value.split(" ").filter((entry) => !entry.startsWith("lucide"));
    expect(tokens(localClass)).toEqual(tokens(remoteClass));
  });

  it("keeps its copy in the English catalog", () => {
    // A key referenced only in the component silently falls back to its inline
    // default and never reaches translators.
    expect(en.auto.components.sidebar.NoticeHostGlyph).toMatchObject({
      hostDisconnected: "{{hostName}} disconnected",
      sshHostProject: "Project on SSH host {{hostName}}",
      localHostProject: "Project on this host",
      runtimeHostProject: "Project on {{hostName}}",
    });
  });

  it.each(Object.entries({ es, ja, ko, zh }))(
    "keeps its copy in the %s catalog",
    (_locale, catalog) => {
      expect(catalog.auto.components.sidebar.NoticeHostGlyph).toMatchObject({
        hostDisconnected: expect.stringContaining("{{hostName}}"),
        sshHostProject: expect.stringContaining("{{hostName}}"),
        localHostProject: expect.any(String),
        runtimeHostProject: expect.stringContaining("{{hostName}}"),
      });
    }
  );
});
