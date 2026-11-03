import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

const { invokeMock, openPathMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  openPathMock: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openPath: openPathMock }));
vi.mock("@/components/editor/MermaidBlock", () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="mermaid-rendered">{content}</div>
  ),
}));
vi.mock("@/lib/document-theme", () => ({ resolveDocumentTheme: () => false }));

import { NATIVE_CHAT_FILE_HREF_PREFIX } from "../../shared/native-chat-href-routing";
import { WorktreeNotesDocumentDialog } from "./WorktreeNotesDocumentDialog";
import { WorktreeCardDetailsHover } from "./WorktreeCardDetailsHover";

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
  openPathMock.mockReset();
  openPathMock.mockResolvedValue(undefined);
});

describe("WorktreeNotesDocumentDialog (Orca document markdown parity)", () => {
  it("renders document-density markdown for the card note", async () => {
    render(
      <WorktreeNotesDocumentDialog
        open
        onOpenChange={() => {}}
        title="feat/x"
        content={"## Plan\n\n> quoted\n\n| a | b |\n| - | - |\n| 1 | 2 |"}
      />
    );

    expect(
      (await screen.findByRole("heading", { name: "Plan" }, { timeout: 15000 })).tagName
    ).toBe("H2");
    expect(document.querySelector("blockquote")).toHaveTextContent("quoted");
    expect(document.querySelector("table")).not.toBeNull();
  }, 20000);

  it("renders trusted images through the accessible lightbox (D12-009)", async () => {
    render(
      <WorktreeNotesDocumentDialog
        open
        onOpenChange={() => {}}
        title="feat/x"
        content={"![shot](data:image/png;base64,iVBORw0KGgo=)"}
      />
    );

    const trigger = await screen.findByRole("button", { name: "Expand image" });
    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "shot" }).length).toBeGreaterThan(0);
  });

  it("upgrades GitHub user-attachment videos with a fallback link (D12-010)", async () => {
    render(
      <WorktreeNotesDocumentDialog
        open
        onOpenChange={() => {}}
        title="feat/x"
        content="https://github.com/user-attachments/assets/1234-demo.mp4"
      />
    );

    const video = await waitFor(() => document.querySelector("video"));
    expect(video).toHaveAttribute(
      "src",
      "https://github.com/user-attachments/assets/1234-demo.mp4"
    );
    expect(video).toHaveAttribute("controls");
  });

  it("routes Mermaid fences to the diagram renderer (D12-011)", async () => {
    render(
      <WorktreeNotesDocumentDialog
        open
        onOpenChange={() => {}}
        title="feat/x"
        content={"```mermaid\ngraph TD\n  A --> B\n```"}
      />
    );

    const diagram = await screen.findByTestId("mermaid-rendered");
    expect(diagram.textContent).toContain("graph TD");
    expect(document.querySelector("pre code.language-mermaid")).toBeNull();
  });

  it("delegates fenced code to the language-aware block renderer (D12-012)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <WorktreeNotesDocumentDialog
        open
        onOpenChange={() => {}}
        title="feat/x"
        content={"```ts\nconst answer = 42\n```"}
      />
    );

    expect(await screen.findByText("ts")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    });
    expect(writeText).toHaveBeenCalledWith("const answer = 42");
  });
});

const WORKTREE = {
  path: "/repo/wt",
  branch: "feat/x",
  head_commit: "abcdef1234",
  is_bare: false,
  is_locked: false,
};

function openHover(comment: string) {
  render(
    <TooltipProvider>
      <WorktreeCardDetailsHover
        worktree={WORKTREE}
        project={{ id: "p", name: "hydra", path: "/repo", is_git: true, current_branch: "main" }}
        metadata={{
          comment,
          linkedIssue: null,
          linkedPR: null,
          linkedLinearIssue: null,
        }}
      >
        <span>card</span>
      </WorktreeCardDetailsHover>
    </TooltipProvider>
  );
  act(() => {
    vi.advanceTimersByTime(400);
  });
  fireEvent.pointerEnter(screen.getByText("card"));
  act(() => {
    vi.advanceTimersByTime(400);
  });
}

describe("WorktreeCardDetailsHover notes markdown wiring", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the document view from the notes header", async () => {
    vi.useFakeTimers();
    openHover("## Heading");

    fireEvent.click(screen.getByRole("button", { name: "Open notes document view" }));
    vi.useRealTimers();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Heading" })).toBeInTheDocument();
  });

  it("enables the compact image lightbox in card notes (D12-009)", async () => {
    vi.useFakeTimers();
    openHover("![shot](data:image/png;base64,iVBORw0KGgo=)");
    vi.useRealTimers();

    expect(await screen.findByRole("button", { name: "Expand image" })).toBeInTheDocument();
  });

  it("linkifies note paths and opens them against the worktree root (D12-006)", async () => {
    vi.useFakeTimers();
    openHover("Open src/foo.ts");
    vi.useRealTimers();

    const anchor = await waitFor(() => {
      const found = document.querySelector<HTMLAnchorElement>(
        `a[href^="${NATIVE_CHAT_FILE_HREF_PREFIX}"]`
      );
      expect(found).not.toBeNull();
      return found!;
    });
    fireEvent.click(anchor);
    expect(openPathMock).toHaveBeenCalledWith("/repo/wt/src/foo.ts");
  });
});
