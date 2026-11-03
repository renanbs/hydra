import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render } from "@testing-library/react";

const { invokeMock, openPathMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  openPathMock: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openPath: openPathMock }));

import {
  NATIVE_CHAT_FILE_HREF_PREFIX,
  routeNativeChatHref,
} from "../../shared/native-chat-href-routing";
import { CommentMarkdown } from "./comment-markdown";

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
  openPathMock.mockReset();
  openPathMock.mockResolvedValue(undefined);
});

function linkRoutes(container: HTMLElement) {
  return Array.from(container.querySelectorAll("a")).map((anchor) =>
    routeNativeChatHref(anchor.getAttribute("href"))
  );
}

describe("CommentMarkdown file-path autolinking (Orca remarkNativeChatFileLinks parity)", () => {
  it("linkifies bare POSIX and Windows paths, including suffixes and extensionless roots", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        content={String.raw`Open /tmp/faq.html, docs/review.docx, C:\Reports\final.pages, ./scripts/release, ~/file, and src/release:12:3.`}
      />
    );

    expect(linkRoutes(container)).toEqual([
      { kind: "file", pathText: "/tmp/faq.html", line: null },
      { kind: "file", pathText: "docs/review.docx", line: null },
      { kind: "file", pathText: String.raw`C:\Reports\final.pages`, line: null },
      { kind: "file", pathText: "./scripts/release", line: null },
      { kind: "file", pathText: "~/file", line: null },
      { kind: "file", pathText: "src/release:12:3", line: null },
    ]);
    expect(container.querySelectorAll("a")).toHaveLength(6);
  });

  it("supports Unicode paths and extensions that begin with a digit", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        content="Open /tmp/报告.html, docs/café/report.pdf, and docs/archive.7z."
      />
    );

    expect(Array.from(container.querySelectorAll("a")).map((a) => a.textContent)).toEqual([
      "/tmp/报告.html",
      "docs/café/report.pdf",
      "docs/archive.7z",
    ]);
  });

  it("turns inline code paths into links while preserving code styling", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        content={"Open `C:\\Reports\\release.docx`."}
      />
    );

    const code = container.querySelector("code");
    const anchor = code?.closest("a");
    expect(anchor).not.toBeNull();
    expect(code).toHaveClass("font-mono");
    expect(routeNativeChatHref(anchor?.getAttribute("href"))).toEqual({
      kind: "file",
      pathText: String.raw`C:\Reports\release.docx`,
      line: null,
    });
  });

  it("links quoted paths with apostrophes in directory names", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        content={"Don't skip \"Brennan's Folder/notes.md\"; open 'My Folder/guide.md'."}
      />
    );

    const anchors = container.querySelectorAll<HTMLAnchorElement>("a");
    expect(Array.from(anchors).map((anchor) => anchor.textContent)).toEqual([
      "Brennan's Folder/notes.md",
      "My Folder/guide.md",
    ]);
    expect(container.textContent).toBe(
      "Don't skip \"Brennan's Folder/notes.md\"; open 'My Folder/guide.md'."
    );
  });

  it("does not link prose tokens or versions that merely look path-shaped", () => {
    const prose = ["and/or", "TCP/IP", "24/7", "N/A", "km/h", "A/B test"];
    const inlineCode = ["origin/main", "v1.2.3", "1.0"];
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        content={`${prose.join(", ")}; ${inlineCode.map((value) => `\`${value}\``).join(", ")}; "and/or"; "aspect 16:9"; "John 3:16".`}
      />
    );

    expect(container.querySelectorAll("a")).toHaveLength(0);
    for (const value of prose) {
      expect(container.textContent).toContain(value);
    }
    expect(Array.from(container.querySelectorAll("code")).map((code) => code.textContent)).toEqual(
      inlineCode
    );
  });

  it("links adjacent relative paths separately when prose joins them", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        content="Updated src/foo.ts and src/bar.ts, then docs/My Folder/notes.md."
      />
    );

    expect(Array.from(container.querySelectorAll("a")).map((a) => a.textContent)).toEqual([
      "src/foo.ts",
      "src/bar.ts",
      "docs/My Folder/notes.md",
    ]);
  });

  it("respects sentence, Unicode punctuation and CLI assignment boundaries", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        content="Run --config=./config.yaml。然后打开 docs/指南.md！再看 docs/报告.pdf？Open src/foo.ts! Read docs/guide.md?"
      />
    );

    expect(Array.from(container.querySelectorAll("a")).map((a) => a.textContent)).toEqual([
      "./config.yaml",
      "docs/指南.md",
      "docs/报告.pdf",
      "src/foo.ts",
      "docs/guide.md",
    ]);
  });

  it("rejects partial paths next to unsupported characters and keeps fenced code raw", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        content={[
          "Leave /tmp/$draft/report.html as one path or plain text.",
          "Leave src/foo.ts!draft/file.html, src/foo.ts—draft/file.html.",
          "",
          "```text",
          "/tmp/not-a-link.html",
          "```",
        ].join("\n")}
      />
    );

    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(container.querySelector("pre")?.textContent).toContain("/tmp/not-a-link.html");
  });

  it("renders native file hrefs with the Orca prefix and opens them against the base path", () => {
    const { container } = render(
      <CommentMarkdown
        variant="document"
        linkifyFilePaths
        fileLinkBasePath="/repo/worktree"
        content="Open src/foo.ts."
      />
    );

    const anchor = container.querySelector<HTMLAnchorElement>("a");
    expect(anchor?.getAttribute("href")).toMatch(
      new RegExp(`^${NATIVE_CHAT_FILE_HREF_PREFIX}`)
    );

    fireEvent.click(anchor!);
    expect(openPathMock).toHaveBeenCalledWith("/repo/worktree/src/foo.ts");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("keeps web links on the external-browser path", () => {
    const { container } = render(
      <CommentMarkdown content="[docs](https://example.com/docs)" />
    );

    fireEvent.click(container.querySelector("a")!);
    expect(invokeMock).toHaveBeenCalledWith("open_external_url_cmd", {
      url: "https://example.com/docs",
    });
    expect(openPathMock).not.toHaveBeenCalled();
  });
});
