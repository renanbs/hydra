// Parity guard for Orca's prompt-cache countdown (D01-049). The pre-port Hydra
// component returned null the moment the cache expired, so the expensive re-send
// was never signalled; it now paints Orca's three states: muted while healthy,
// yellow inside the last minute, and red with the icon alone once expired.
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CacheTimer } from "./CacheTimer";

// Freeze the shared clock so the three states are exact rather than wall-clock.
const NOW = 1_700_000_000_000;
vi.mock("./prompt-cache-countdown-clock", () => ({
  usePromptCacheCountdownNow: () => 1_700_000_000_000,
}));

const TTL_MS = 300_000;

function renderTimer(startedAt: number) {
  return render(
    <TooltipProvider>
      <CacheTimer startedAt={startedAt} ttlMs={TTL_MS} />
    </TooltipProvider>
  );
}

describe("CacheTimer (Orca parity)", () => {
  it("counts down in M:SS while the cache is healthy", () => {
    const { container } = renderTimer(NOW);
    expect(container.textContent).toContain("5:00");
    expect(container.querySelector(".text-muted-foreground")).not.toBeNull();
    expect(container.querySelector(".text-yellow-400")).toBeNull();
    expect(container.querySelector(".text-red-400")).toBeNull();
  });

  it("turns yellow inside the last minute", () => {
    const { container } = renderTimer(NOW - (TTL_MS - 30_000));
    expect(container.textContent).toContain("0:30");
    expect(container.querySelector(".text-yellow-400")).not.toBeNull();
  });

  it("turns red and drops the countdown once expired", () => {
    const { container } = renderTimer(NOW - TTL_MS);
    expect(container.querySelector(".text-red-400")).not.toBeNull();
    // The red icon alone conveys state — a 0:00 label would be noise.
    expect(container.textContent).not.toMatch(/\d+:\d{2}/);
  });

  it("names the timer with the tooltip copy, switching to the re-send warning on expiry", () => {
    const live = renderTimer(NOW - (TTL_MS - 30_000));
    expect(live.getByRole("timer").getAttribute("aria-label")).toContain("Prompt cache expires in 0:30");
    live.unmount();

    const expired = renderTimer(NOW - TTL_MS);
    expect(expired.getByRole("timer").getAttribute("aria-label")).toContain("uncached tokens");
  });
});
