import { describe, expect, it, vi } from "vitest";
import {
  WORKTREE_SIDEBAR_REVEAL_TOP_INSET,
  getScrollTopToRevealBounds,
  revealElementInScrollContainer,
} from "./worktree-sidebar-reveal";

function makeContainer(scrollTop: number, clientHeight: number) {
  const scrollTo = vi.fn();
  const container = {
    clientHeight,
    scrollTop,
    contains: () => true,
    getBoundingClientRect: () => ({ top: 0, bottom: clientHeight }) as DOMRect,
    scrollTo,
  };
  return { container: container as unknown as HTMLElement, scrollTo };
}

function makeElement(top: number, bottom: number): Element {
  return {
    getBoundingClientRect: () => ({ top, bottom }) as DOMRect,
  } as unknown as Element;
}

describe("revealElementInScrollContainer", () => {
  it("reports the scroll target it issues so callers can guard the animation", () => {
    const { container, scrollTo } = makeContainer(0, 673);
    const onScrollIssued = vi.fn();

    const revealed = revealElementInScrollContainer(
      container,
      makeElement(1005, 1060),
      "smooth",
      onScrollIssued
    );

    expect(revealed).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 387, behavior: "smooth" });
    expect(onScrollIssued).toHaveBeenCalledWith(387);
  });

  it("does not report a scroll when the element is already in view", () => {
    const { container, scrollTo } = makeContainer(0, 673);
    const onScrollIssued = vi.fn();

    const revealed = revealElementInScrollContainer(
      container,
      makeElement(200, 260),
      "smooth",
      onScrollIssued
    );

    expect(revealed).toBe(true);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(onScrollIssued).not.toHaveBeenCalled();
  });

  it("returns false when the element is not mounted inside the container", () => {
    const { container, scrollTo } = makeContainer(0, 400);
    container.contains = () => false;

    expect(
      revealElementInScrollContainer(container, makeElement(10, 50), "smooth")
    ).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe("getScrollTopToRevealBounds", () => {
  it("reserves the sticky header when the card is above the viewport", () => {
    const { container } = makeContainer(500, 600);

    // Card sits 400px above the viewport: start = 500 - 400 = 100.
    expect(
      getScrollTopToRevealBounds(container, { start: 100, end: 160 }, 34)
    ).toBe(66);
  });

  it("aligns the card bottom when it is below the viewport", () => {
    const { container } = makeContainer(500, 600);

    expect(
      getScrollTopToRevealBounds(container, { start: 1200, end: 1260 }, 34)
    ).toBe(660);
  });

  it("returns null when the card is fully visible", () => {
    const { container } = makeContainer(500, 600);

    expect(
      getScrollTopToRevealBounds(container, { start: 540, end: 600 }, 34)
    ).toBeNull();
  });

  it("clamps an oversized inset to the viewport height", () => {
    const { container } = makeContainer(0, 40);

    // Inset clamps to 40, so the top edge of the usable viewport is 40 and the card
    // above it would land at 10 - 40; the reveal clamps the result to 0.
    expect(
      getScrollTopToRevealBounds(container, { start: 10, end: 30 }, 200)
    ).toBe(-30);
  });

  it("uses the sticky header height plus clearance as the default reveal inset", () => {
    expect(WORKTREE_SIDEBAR_REVEAL_TOP_INSET).toBe(34);
  });
});
