import "@testing-library/jest-dom/vitest";

// ─── Synthetic layout for the virtualized workspaces list ────────────────────
//
// jsdom performs no layout: every element reports 0px for offsetWidth/offsetHeight. The
// virtualized sidebar reads the scroll container's height and each row's height straight from
// the DOM, and TanStack Virtual treats a 0px viewport as "nothing is visible" — so without a
// synthetic viewport the list would paint zero rows in every component test.
//
// The shim is deliberately narrow: only the two attributes the viewport itself publishes get a
// height, so no other test's geometry changes. Numbers match a realistic sidebar window.
const VIRTUAL_VIEWPORT_HEIGHT_PX = 480;
const VIRTUAL_ROW_HEIGHT_PX = 40;

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get(this: HTMLElement): number {
    if (this.hasAttribute("data-worktree-sidebar")) {
      return VIRTUAL_VIEWPORT_HEIGHT_PX;
    }
    if (this.hasAttribute("data-worktree-virtual-row")) {
      return VIRTUAL_ROW_HEIGHT_PX;
    }
    return 0;
  },
});
