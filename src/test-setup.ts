import "@testing-library/jest-dom/vitest";

// ─── Synthetic layout for the virtualized workspaces list ────────────────────
//
// jsdom performs no layout: every element reports 0px for offsetWidth/offsetHeight. The
// virtualized sidebar reads the scroll container's height and each row's height straight from
// the DOM, and TanStack Virtual treats a 0px viewport as "nothing is visible" — so without a
// synthetic viewport the list would paint zero rows in every component test.
//
// The shim is deliberately narrow: only the attributes the virtualized surfaces themselves
// publish get a size, so no other test's geometry changes. Numbers match realistic windows.
const VIRTUAL_VIEWPORT_HEIGHT_PX = 480;
const VIRTUAL_ROW_HEIGHT_PX = 40;
const WORKSPACE_BOARD_LANE_VIEWPORT_WIDTH_PX = 2000;
const WORKSPACE_BOARD_CARD_VIEWPORT_HEIGHT_PX = 480;

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get(this: HTMLElement): number {
    if (this.hasAttribute("data-worktree-sidebar")) {
      return VIRTUAL_VIEWPORT_HEIGHT_PX;
    }
    if (this.hasAttribute("data-worktree-virtual-row")) {
      return VIRTUAL_ROW_HEIGHT_PX;
    }
    // The board's lane body is the virtualized card list's scroll element.
    if (this.hasAttribute("data-workspace-board-card-scroller")) {
      return WORKSPACE_BOARD_CARD_VIEWPORT_HEIGHT_PX;
    }
    return 0;
  },
});

// The board's lane row reads its width from the same kind of DOM measurement, on the horizontal
// axis. The width is wide enough that every lane of a test fixture is inside the first window;
// a test that wants a narrower window overrides this getter with its own.
Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  get(this: HTMLElement): number {
    if (this.hasAttribute("data-workspace-board-lanes-scroller")) {
      return WORKSPACE_BOARD_LANE_VIEWPORT_WIDTH_PX;
    }
    return 0;
  },
});

// jsdom implements no Web Animations API, and the sidebar's row-removal animation issues one
// `Element.animate` per surviving row when a workspace is deleted. A no-op keeps component
// tests able to render a removal; the motion itself is asserted on the pure builder.
Object.defineProperty(Element.prototype, "animate", {
  configurable: true,
  writable: true,
  value: (): undefined => undefined,
});
