import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarDialogPortal } from "./SidebarDialogPortal";

describe("SidebarDialogPortal (Orca dialog placement)", () => {
  it("renders its children outside the sidebar subtree", () => {
    render(
      <aside data-sidebar="">
        <div data-sidebar-body="">
          <SidebarDialogPortal>
            <div role="dialog" aria-label="Remove folder" />
          </SidebarDialogPortal>
        </div>
      </aside>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.closest("[data-sidebar]")).toBeNull();
  });
});
