// Parity guard for the folder-workspace row. Orca renders a folder workspace as a
// plain row: status dot, name, and the TRUNCATED folder path carrying the full path
// in `title`. The first Hydra attempt rendered a bordered card with no dot and no
// path line — `tsc` was green because the props type-checked.
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { FolderWorkspaceRow } from "./FolderWorkspaceRow";

const FOLDER_PATH = "/home/renan/src/clubedepontos/malhaclub/code";

describe("FolderWorkspaceRow (Orca parity)", () => {
  it("paints the status dot, the name and the path line", () => {
    const { container } = render(
      <FolderWorkspaceRow name="MalhaClub Dev workspace" folderPath={FOLDER_PATH} />
    );

    expect(screen.getByText("MalhaClub Dev workspace")).toBeInTheDocument();

    const pathLine = screen.getByText(FOLDER_PATH);
    expect(pathLine).toHaveAttribute("title", FOLDER_PATH);
    // Truncated mono line, matching Orca's identity row.
    expect(pathLine.className).toContain("truncate");
    expect(pathLine.className).toContain("font-mono");

    const dot = container.querySelector("span.rounded-full");
    expect(dot, "folder row must paint its status dot").not.toBeNull();
    expect(dot?.className).toContain("bg-emerald-500");
  });

  it("carries no card chrome (Orca draws no border at rest)", () => {
    const { container } = render(
      <FolderWorkspaceRow name="ws" folderPath={FOLDER_PATH} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain("border");
    expect(root.className).not.toContain("rounded-lg border");
  });

  it("indents the row so the dot aligns with card titles", () => {
    const { container } = render(
      <FolderWorkspaceRow name="ws" folderPath={FOLDER_PATH} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("pl-6");
  });

  it("activates on click and on Enter", () => {
    const onSelect = vi.fn();
    render(<FolderWorkspaceRow name="ws" folderPath={FOLDER_PATH} onSelect={onSelect} />);
    const row = screen.getByRole("button", { name: "ws" });
    row.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marks a missing path with the destructive dot", () => {
    const { container } = render(<FolderWorkspaceRow name="ws" folderPath="" />);
    const dot = container.querySelector("span.rounded-full");
    expect(dot?.className).toContain("bg-destructive");
  });
});
