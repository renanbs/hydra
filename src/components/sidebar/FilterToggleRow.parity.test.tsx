import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FilterToggleRow } from "./FilterToggleRow";

describe("FilterToggleRow (Orca parity)", () => {
  it("is a switch that reports its checked state and inverts on click", () => {
    const onChange = vi.fn();
    render(
      <FilterToggleRow
        icon={<span />}
        label="Hide sleeping"
        checked={false}
        onChange={onChange}
      />
    );

    const row = screen.getByRole("switch", { name: "Hide sleeping" });
    expect(row).toHaveAttribute("aria-checked", "false");
    fireEvent.click(row);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders a shortcut badge only when the registry supplies one", () => {
    const { rerender } = render(
      <FilterToggleRow icon={<span />} label="Hide sleeping" checked={false} onChange={vi.fn()} />
    );
    expect(screen.queryByText("Ctrl+Shift+S")).toBeNull();

    rerender(
      <FilterToggleRow
        icon={<span />}
        label="Hide sleeping"
        checked
        onChange={vi.fn()}
        shortcutLabel="Ctrl+Shift+S"
      />
    );
    expect(screen.getByText("Ctrl+Shift+S")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("indents a sub-option and exposes the full aria label", () => {
    render(
      <FilterToggleRow
        indented
        icon={<span />}
        label="Except default branch"
        ariaLabel="Keep the default branch visible while hiding sleeping workspaces"
        checked
        onChange={vi.fn()}
      />
    );

    const row = screen.getByRole("switch", {
      name: "Keep the default branch visible while hiding sleeping workspaces",
    });
    expect(row.className).toContain("pl-7");
    expect(row).toHaveTextContent("Except default branch");
  });
});
