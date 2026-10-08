// Jump-to-top: the affordance appears only for an intentional hard scroll up a long list,
// disappears when the list is back near the top, and dismisses itself when used.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorktreeListScrollToTopButton } from "../../WorktreeListScrollToTopButton";
import { useWorktreeListScrollToTop } from "./use-scroll-to-top";

const SCROLL_HEIGHT = 2000;
const CLIENT_HEIGHT = 400;
const DEEP_SCROLL_TOP = 600;

function Harness({ onUserScrollIntent }: { onUserScrollIntent: () => void }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const { showScrollToTop, scrollToTop } = useWorktreeListScrollToTop({
    scrollElement: element,
    onUserScrollIntent,
  });
  const captureElement = useCallback((node: HTMLDivElement | null) => setElement(node), []);
  return (
    <TooltipProvider>
      <div>
        <div data-testid="scroller" ref={captureElement} />
        {showScrollToTop ? <WorktreeListScrollToTopButton onClick={scrollToTop} /> : null}
      </div>
    </TooltipProvider>
  );
}

/** jsdom lays nothing out: give the scroller the geometry of a long, deeply-scrolled list. */
function makeScrollable(element: HTMLElement, scrollTop: number): { scrollTo: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn> } {
  Object.defineProperty(element, "scrollTop", { configurable: true, writable: true, value: scrollTop });
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: SCROLL_HEIGHT });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: CLIENT_HEIGHT });
  const scrollTo = vi.fn();
  const focus = vi.fn();
  Object.defineProperty(element, "scrollTo", { configurable: true, value: scrollTo });
  Object.defineProperty(element, "focus", { configurable: true, value: focus });
  return { scrollTo, focus };
}

function renderHarness() {
  const onUserScrollIntent = vi.fn();
  const view = render(<Harness onUserScrollIntent={onUserScrollIntent} />);
  const scroller = screen.getByTestId("scroller");
  return { ...view, scroller, onUserScrollIntent };
}

describe("worktree list jump to top", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("stays hidden for a plain downward scroll", () => {
    const { scroller } = renderHarness();
    makeScrollable(scroller, DEEP_SCROLL_TOP);

    fireEvent.wheel(scroller, { deltaY: 200 });
    fireEvent.wheel(scroller, { deltaY: 200 });
    fireEvent.wheel(scroller, { deltaY: 200 });

    expect(screen.queryByRole("button", { name: "Jump to top" })).toBeNull();
  });

  it("appears on a sustained hard scroll up, deep in the list", () => {
    const { scroller } = renderHarness();
    makeScrollable(scroller, DEEP_SCROLL_TOP);

    fireEvent.wheel(scroller, { deltaY: -300 });
    fireEvent.wheel(scroller, { deltaY: -300 });
    fireEvent.wheel(scroller, { deltaY: -300 });

    expect(screen.getByRole("button", { name: "Jump to top" })).toBeInTheDocument();
  });

  it("hides again once the list is back near the top", () => {
    const { scroller } = renderHarness();
    const { scrollTo } = makeScrollable(scroller, DEEP_SCROLL_TOP);

    fireEvent.wheel(scroller, { deltaY: -300 });
    fireEvent.wheel(scroller, { deltaY: -300 });
    fireEvent.wheel(scroller, { deltaY: -300 });
    expect(screen.getByRole("button", { name: "Jump to top" })).toBeInTheDocument();

    scroller.scrollTop = 10;
    fireEvent.wheel(scroller, { deltaY: -300 });

    expect(screen.queryByRole("button", { name: "Jump to top" })).toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("jumps to the top and dismisses itself", () => {
    const { scroller, onUserScrollIntent } = renderHarness();
    const { scrollTo, focus } = makeScrollable(scroller, DEEP_SCROLL_TOP);

    fireEvent.wheel(scroller, { deltaY: -300 });
    fireEvent.wheel(scroller, { deltaY: -300 });
    fireEvent.wheel(scroller, { deltaY: -300 });

    fireEvent.click(screen.getByRole("button", { name: "Jump to top" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    // The click is a scroll the user owns, so the virtualizer's guards are told about it.
    expect(onUserScrollIntent).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Jump to top" })).toBeNull();
  });

  it("stays hidden on a short list that cannot scroll far", () => {
    const { scroller } = renderHarness();
    const { scrollTo } = makeScrollable(scroller, DEEP_SCROLL_TOP);
    Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 420 });

    fireEvent.wheel(scroller, { deltaY: -300 });
    fireEvent.wheel(scroller, { deltaY: -300 });
    fireEvent.wheel(scroller, { deltaY: -300 });

    expect(screen.queryByRole("button", { name: "Jump to top" })).toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
