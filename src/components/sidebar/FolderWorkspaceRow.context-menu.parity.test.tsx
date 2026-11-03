import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FolderWorkspaceRow } from "./FolderWorkspaceRow";

describe("FolderWorkspaceRow context menu (Orca parity)", () => {
  it("exposes the workspace identity and forwards right-click to the menu handler", () => {
    const onContextMenu = vi.fn();
    render(
      <FolderWorkspaceRow
        name="docs"
        folderPath="/work/docs"
        workspaceId="folder-1"
        hostIdentity="local|folder-1"
        status="inactive"
        onContextMenu={onContextMenu}
      />
    );
    const row = screen.getByRole("option", { name: "docs" });
    expect(row).toHaveAttribute("data-worktree-id", "folder-1");
    expect(row).toHaveAttribute("data-worktree-host-identity", "local|folder-1");
    expect(row).toHaveAttribute("data-worktree-context-menu-scope");

    fireEvent.contextMenu(row);
    expect(onContextMenu).toHaveBeenCalledOnce();
  });
});
