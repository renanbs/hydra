// Parity guard for Orca's `StatusIndicator.tsx` dot ladder (D01-048): working is a
// yellow spinner ring, monitoring a static Activity glyph, interrupted a red dot,
// permission the shared `AgentQuestionIcon` (`text-agent-question` token), done/active
// an emerald dot and inactive a translucent grey one. Only the agent-derived states
// carry a label; the passive ones stay decorative.
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { WorktreeStatusIndicator } from "./WorktreeStatusIndicator";
import type { WorktreeStatus } from "../../lib/worktree-status";
import { i18n } from "@/i18n/i18n";

function renderStatus(status: WorktreeStatus, showLabel?: boolean) {
  return render(<WorktreeStatusIndicator status={status} showLabel={showLabel} />);
}

describe("WorktreeStatusIndicator (Orca parity)", () => {
  it("paints working as the yellow spinner ring", () => {
    const { container } = renderStatus("working");
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".border-yellow-500")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Working" })).toBeInTheDocument();
  });

  it("paints monitoring as the static Activity glyph", () => {
    const { container } = renderStatus("monitoring");
    expect(container.querySelector(".lucide-activity")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Monitoring background tasks" })).toBeInTheDocument();
  });

  it("paints interrupted as a red dot", () => {
    const { container } = renderStatus("interrupted");
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Interrupted" })).toBeInTheDocument();
  });

  it("paints permission with Orca's shared question glyph", () => {
    const { container } = renderStatus("permission");
    expect(container.querySelector(".text-agent-question")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Needs attention" })).toBeInTheDocument();
  });

  it("paints done and active as the emerald dot, with only done labelled", () => {
    const done = renderStatus("done");
    expect(done.container.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Done" })).toBeInTheDocument();
    done.unmount();

    const active = renderStatus("active");
    expect(active.container.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(active.container.querySelector("[aria-label]")).toBeNull();
  });

  it("paints inactive as the translucent grey dot with no label", () => {
    const { container } = renderStatus("inactive");
    expect(container.querySelector(".bg-neutral-500\\/40")).not.toBeNull();
    expect(container.querySelector("[aria-label]")).toBeNull();
  });

  it("lets a row that already carries the label keep the dot decorative", () => {
    const { container } = renderStatus("working", false);
    expect(container.querySelector("[aria-label]")).toBeNull();
    expect(container.querySelector("[title]")).toBeNull();
  });

  it("localizes the label through the shared catalog", async () => {
    await i18n.changeLanguage("es");
    try {
      renderStatus("permission");
      expect(await screen.findByRole("img", { name: "Requiere atención" })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage("en");
    }
  });
});
