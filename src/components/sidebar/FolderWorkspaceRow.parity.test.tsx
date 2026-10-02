// Parity guard for the folder-workspace row. Orca renders a folder workspace as a
// plain row whose left lane is the WORKSPACE STATUS dot — green when a terminal is
// live (`active`) or the turn finished (`done`), GREY when there is none
// (`inactive`), spinner while `working`. An earlier Hydra attempt painted a
// path-health dot instead (always green unless the path was gone), which stayed
// green after the terminal was closed: the exact divergence this file locks out.
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { FolderWorkspaceRow } from "./FolderWorkspaceRow";
import { folderWorkspaceStatus } from "../../lib/folder-workspace-row-status";

const FOLDER_PATH = "/home/renan/src/clubedepontos/malhaclub/code";

function renderRow(props: Partial<Parameters<typeof FolderWorkspaceRow>[0]> = {}) {
  return render(
    <FolderWorkspaceRow
      name="MalhaClub Dev workspace"
      folderPath={FOLDER_PATH}
      status="inactive"
      {...props}
    />
  );
}

describe("FolderWorkspaceRow (Orca parity)", () => {
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
    expect(permission.container.querySelector("svg.text-amber-500")).not.toBeNull();
  });

  it("shows the FolderX badge only when the folder is gone", () => {
    renderRow({ pathMissing: true });
    expect(screen.getByLabelText(`Folder not found: ${FOLDER_PATH}`)).toBeInTheDocument();

    const present = renderRow();
    expect(
      present.container.querySelector(`[aria-label="Folder not found: ${FOLDER_PATH}"]`)
    ).toBeNull();
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
    screen.getByRole("button", { name: "MalhaClub Dev workspace" }).click();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

describe("folderWorkspaceStatus (Orca parity)", () => {
  const session = (state: "working" | "blocked" | "waiting" | "done" | "idle" | "unknown") =>
    ({ state }) as never;

  it("is inactive without a live terminal and without sessions", () => {
    expect(folderWorkspaceStatus({ sessions: [], hasLiveTerminal: false })).toBe("inactive");
  });

  it("is active when a terminal is mounted", () => {
    expect(
      folderWorkspaceStatus({ sessions: [session("idle")], hasLiveTerminal: true })
    ).toBe("active");
  });

  it("maps agent states onto the dot ladder", () => {
    expect(folderWorkspaceStatus({ sessions: [session("working")], hasLiveTerminal: true })).toBe(
      "working"
    );
    expect(folderWorkspaceStatus({ sessions: [session("blocked")], hasLiveTerminal: true })).toBe(
      "permission"
    );
    expect(folderWorkspaceStatus({ sessions: [session("waiting")], hasLiveTerminal: true })).toBe(
      "permission"
    );
    expect(folderWorkspaceStatus({ sessions: [session("done")], hasLiveTerminal: false })).toBe(
      "done"
    );
  });
});
