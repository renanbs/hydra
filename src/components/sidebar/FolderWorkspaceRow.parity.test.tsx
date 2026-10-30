// Parity guard for the folder-workspace row. Orca renders a folder workspace as a
// plain row whose left lane is the WORKSPACE STATUS dot — green when a terminal is
// live (`active`) or the turn finished (`done`), GREY when there is none
// (`inactive`), spinner while `working`. An earlier Hydra attempt painted a
// path-health dot instead (always green unless the path was gone), which stayed
// green after the terminal was closed: the exact divergence this file locks out.
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getFolderWorkspacePathStatusDescription } from "@/lib/folder-workspace-path-status";
import { FolderWorkspaceRow } from "./FolderWorkspaceRow";
import { workspaceStatusFrom } from "../../lib/workspace-status-signals";

const FOLDER_PATH = "/home/renan/src/clubedepontos/malhaclub/code";

function renderRow(props: Partial<Parameters<typeof FolderWorkspaceRow>[0]> = {}) {
  return render(
    <TooltipProvider delayDuration={0}>
      <FolderWorkspaceRow
        name="MalhaClub Dev workspace"
        folderPath={FOLDER_PATH}
        status="inactive"
        {...props}
      />
    </TooltipProvider>
  );
}

describe("FolderWorkspaceRow (Orca parity)", () => {
  it("offers a remove action that does not activate the row", () => {
    const onDelete = vi.fn();
    const onActivate = vi.fn();
    renderRow({ onDelete, onActivate });

    fireEvent.click(screen.getByRole("button", { name: "Remove workspace MalhaClub Dev workspace" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("paints the status dot, the name and the path line", () => {
    const { container } = renderRow({ status: "active" });

    expect(screen.getByText("MalhaClub Dev workspace")).toBeInTheDocument();

    const pathLine = screen.getByText(FOLDER_PATH);
    expect(pathLine).toHaveAttribute("title", FOLDER_PATH);
    expect(pathLine.className).toContain("truncate");
    expect(pathLine.className).toContain("font-mono");

    expect(container.querySelector("span.bg-emerald-500")).not.toBeNull();
  });

  it("turns the dot GREY when no terminal is live (closing the terminal)", () => {
    const { container } = renderRow({ status: "inactive" });
    expect(container.querySelector("span.bg-emerald-500")).toBeNull();
    expect(container.querySelector("span.bg-neutral-500\\/40")).not.toBeNull();
  });

  it("uses spinner/icon states for working and permission", () => {
    const working = renderRow({ status: "working" });
    expect(working.container.querySelector("span.bg-emerald-500")).toBeNull();
    expect(working.container.querySelector("span.animate-spin")).not.toBeNull();

    const permission = renderRow({ status: "permission" });
    // Orca paints the shared AgentQuestionIcon (`text-agent-question`), not a raw lucide glyph.
    expect(permission.container.querySelector("svg.text-agent-question")).not.toBeNull();
  });

  it("shows the FolderX badge only when the folder is gone", () => {
    const { container } = renderRow({ pathMissing: true });
    const badge = screen.getByLabelText("Folder not found");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-destructive");

    const present = renderRow();
    expect(present.container.querySelector('[aria-label="Folder not found"]')).toBeNull();
    expect(container).not.toBeNull();
  });

  it("tells a confirmed stale path from an ambiguous connection", () => {
    const stale = renderRow({
      pathStatus: { path: FOLDER_PATH, exists: false, reason: "missing" },
    });
    expect(screen.getByLabelText("Folder not found")).toHaveClass("text-destructive");
    expect((stale.container.firstElementChild as HTMLElement).dataset.folderWorkspacePathStatus).toBe(
      "confirmed-stale"
    );

    const ambiguous = renderRow({
      pathStatus: { path: FOLDER_PATH, exists: false, reason: "ambiguous-connection" },
    });
    const ambiguousBadge = screen.getByLabelText("Cannot determine connection");
    expect(ambiguousBadge).not.toHaveClass("text-destructive");
    expect(
      (ambiguous.container.firstElementChild as HTMLElement).dataset.folderWorkspacePathStatus
    ).toBe("ambiguous-connection");
    // Distinct explanation, not the stale-path copy.
    expect(
      getFolderWorkspacePathStatusDescription({
        path: FOLDER_PATH,
        exists: false,
        reason: "ambiguous-connection",
      })
    ).not.toBe(
      getFolderWorkspacePathStatusDescription({
        path: FOLDER_PATH,
        exists: false,
        reason: "missing",
      })
    );
    expect(ambiguous.container.querySelector('[aria-label="Folder not found"]')).toBeNull();
    expect(stale.container.querySelector('[aria-label="Cannot determine connection"]')).toBeNull();
  });

  it("never badges a status that proves the path exists", () => {
    const { container } = renderRow({
      pathStatus: { path: FOLDER_PATH, exists: true },
    });
    expect(container.querySelector('[aria-label="Folder not found"]')).toBeNull();
    expect(container.querySelector('[aria-label="Cannot determine connection"]')).toBeNull();
  });

  it("carries no card chrome (Orca draws no border at rest)", () => {
    const { container } = renderRow();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain("border");
  });

  it("indents the row so the dot aligns with card titles", () => {
    const { container } = renderRow();
    expect((container.firstElementChild as HTMLElement).className).toContain("pl-6");
  });

  it("activates on click and on Enter", () => {
    const onActivate = vi.fn();
    renderRow({ onActivate });
    // Orca exposes the row as a listbox option, not a button.
    screen.getByRole("option", { name: "MalhaClub Dev workspace" }).click();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("refuses activation when the path is confirmed stale", () => {
    const onActivate = vi.fn();
    renderRow({ onActivate, pathMissing: true });
    const row = screen.getByRole("option", { name: "MalhaClub Dev workspace" });
    expect(row).toHaveAttribute("aria-disabled", "true");
    row.click();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("refuses activation when the owning connection is ambiguous", () => {
    const onActivate = vi.fn();
    const ambiguous = renderRow({
      onActivate,
      pathStatus: { path: FOLDER_PATH, exists: false, reason: "ambiguous-connection" },
    });
    const row = screen.getByRole("option", { name: "MalhaClub Dev workspace" });
    expect(row).toHaveAttribute("aria-disabled", "true");
    row.click();
    expect(onActivate).not.toHaveBeenCalled();
    ambiguous.unmount();

    const healthy = vi.fn();
    renderRow({ onActivate: healthy, pathStatus: { path: FOLDER_PATH, exists: true } });
    const healthyRow = screen.getByRole("option", { name: "MalhaClub Dev workspace" });
    expect(healthyRow).not.toHaveAttribute("aria-disabled");
    healthyRow.click();
    expect(healthy).toHaveBeenCalledTimes(1);
  });
});

describe("workspaceStatusFrom (Orca parity)", () => {
  const session = (state: "working" | "blocked" | "waiting" | "done" | "idle" | "unknown") =>
    ({ state }) as never;

  it("is inactive without a live terminal and without sessions", () => {
    expect(workspaceStatusFrom({ sessions: [], hasLiveTerminal: false })).toBe("inactive");
  });

  it("is active when a terminal is mounted", () => {
    expect(
      workspaceStatusFrom({ sessions: [session("idle")], hasLiveTerminal: true })
    ).toBe("active");
  });

  it("maps agent states onto the dot ladder", () => {
    expect(workspaceStatusFrom({ sessions: [session("working")], hasLiveTerminal: true })).toBe(
      "working"
    );
    expect(workspaceStatusFrom({ sessions: [session("blocked")], hasLiveTerminal: true })).toBe(
      "permission"
    );
    expect(workspaceStatusFrom({ sessions: [session("waiting")], hasLiveTerminal: true })).toBe(
      "permission"
    );
    expect(workspaceStatusFrom({ sessions: [session("done")], hasLiveTerminal: false })).toBe(
      "done"
    );
  });
});
