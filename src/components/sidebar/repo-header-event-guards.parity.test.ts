import { describe, expect, it } from "vitest";
import { shouldIgnoreRepoHeaderToggle } from "./repo-header-event-guards";

function element(markup: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = markup;
  return root.firstElementChild as HTMLElement;
}

describe("repo header event guards", () => {
  it("ignores Enter/Space coming from a nested button or menu", () => {
    const button = element('<div data-repo-header-id="r"><button>menu</button></div>');
    expect(
      shouldIgnoreRepoHeaderToggle({ target: button.querySelector("button"), key: "Enter" })
    ).toBe(true);
    expect(
      shouldIgnoreRepoHeaderToggle({ target: button.querySelector("button"), key: " " })
    ).toBe(true);
  });

  it("keeps handling Enter/Space on the header itself", () => {
    const header = element('<div data-repo-header-id="r">hydra</div>');
    expect(shouldIgnoreRepoHeaderToggle({ target: header, key: "Enter" })).toBe(false);
  });

  it("ignores other keys", () => {
    const button = element('<div data-repo-header-id="r"><button>menu</button></div>');
    expect(
      shouldIgnoreRepoHeaderToggle({ target: button.querySelector("button"), key: "ArrowDown" })
    ).toBe(false);
  });
});
