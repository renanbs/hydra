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

  it("parses raw HTML through the sanitizer and refuses unsafe protocols", () => {
    const { container } = render(
      <CommentMarkdown text={"<img src=x onerror=alert(1)> [bad](javascript:alert(1))"} />
    );
    // rehype-raw parses the tag, rehype-sanitize strips the event handler.
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    const link = container.querySelector("a");
    if (link) {
      expect(link.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
    }
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

  it("flattens headings to spans and keeps list items inline", () => {
    const { container } = render(
      <CommentMarkdown text={"# Title\n- one\n- two\n\nlast"} />
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.tagName).toBe("SPAN");
    expect(heading).toHaveClass("font-bold");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).toContain("one");
    expect(container.textContent).toContain("last");
    expect(container.querySelector("h1")).toBeNull();
  });
});


describe("CommentMarkdown document variant", () => {
  it("renders block headings, quotes, GFM tables and task lists", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        content={"## Heading\n\n> quoted\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done"}
      />
    );
    expect(container.querySelector("h2")).toHaveTextContent("Heading");
    expect(container.querySelector("blockquote")).toHaveTextContent("quoted");
    expect(container.querySelector("table")).not.toBeNull();
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBeChecked();
  });

  it("autolinks same-repo and cross-repo GitHub references", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        githubRepo={{ owner: "acme", repo: "widgets" }}
        content="see #12 and other/tool#7"
      />
    );
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://github.com/acme/widgets/issues/12");
    expect(hrefs).toContain("https://github.com/other/tool/issues/7");
  });

  it("renders trusted data images inline and degrades remote ones to links in compact cards", () => {
    const inline = render(
      <CommentMarkdown
        content={"![shot](data:image/png;base64,iVBORw0KGgo=)"}
      />
    );
    expect(inline.container.querySelector("img")).not.toBeNull();
    inline.unmount();

    const remote = render(<CommentMarkdown content={"![shot](https://example.com/a.png)"} />);
    expect(remote.container.querySelector("img")).toBeNull();
    expect(remote.container.querySelector("a")).toHaveAttribute(
      "href",
      "https://example.com/a.png"
    );
  });
});
