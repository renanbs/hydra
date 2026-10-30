import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RepoScanUnavailableIndicator } from "./RepoScanUnavailableIndicator";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("RepoScanUnavailableIndicator", () => {
  it("paints nothing when no scan failed", () => {
    const { container } = render(
      <RepoScanUnavailableIndicator failures={[]} onRetry={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("names a single failing repository and retries", () => {
    const onRetry = vi.fn();
    render(
      <RepoScanUnavailableIndicator
        failures={[{ repoPath: "/repo/hydra", message: "boom" }]}
        onRetry={onRetry}
      />
    );
    expect(screen.getByText("Worktree scan unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Retry scan"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("counts multiple failures", () => {
    render(
      <RepoScanUnavailableIndicator
        failures={[
          { repoPath: "/a", message: "x" },
          { repoPath: "/b", message: "y" },
        ]}
        onRetry={vi.fn()}
      />
    );
    expect(
      screen.getByText("Worktree scan unavailable for 2 repositories")
    ).toBeInTheDocument();
  });
});
