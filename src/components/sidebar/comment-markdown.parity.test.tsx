import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import { CommentMarkdown } from "./comment-markdown";

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
});

describe("CommentMarkdown compact variant (Orca parity)", () => {
  it("renders strong, emphasis, inline code and safe links", () => {
    render(
      <CommentMarkdown text={"**bold** _em_ `code` [docs](https://example.com/x)"} />
    );
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("em").tagName).toBe("EM");
    expect(screen.getByText("code").tagName).toBe("CODE");
    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveAttribute("href", "https://example.com/x");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("keeps raw HTML as text and refuses unsafe protocols", () => {
    const { container } = render(
      <CommentMarkdown text={"<img src=x onerror=alert(1)> [bad](javascript:alert(1))"} />
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(screen.queryByRole("link")).toBeNull();
    expect(container).toHaveTextContent("[bad](javascript:alert(1))");
  });

  it("opens links through the external command instead of navigating the webview", () => {
    render(<CommentMarkdown text={"[issue](https://example.com/issue/1)"} />);
    const link = screen.getByRole("link", { name: "issue" });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("open_external_url_cmd", {
      url: "https://example.com/issue/1",
    });
  });

  it("preserves line breaks, bullets and flattens headings", () => {
    const { container } = render(
      <CommentMarkdown text={"# Title\n- one\n- two\n\nlast"} />
    );
    expect(screen.getByText("Title").parentElement).toHaveClass("font-semibold");
    expect(screen.getAllByText("•")).toHaveLength(2);
    expect(container.textContent).toContain("one");
    expect(container.textContent).toContain("last");
    expect(container.querySelector("h1")).toBeNull();
  });
});
