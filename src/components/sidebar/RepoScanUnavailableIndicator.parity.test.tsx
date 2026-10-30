import { beforeAll, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RepoScanUnavailableIndicator } from "./RepoScanUnavailableIndicator";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Radix popper measures the trigger/content; jsdom ships no ResizeObserver.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  );
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(async () => {}) },
  });
});

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

  it("classifies the raw error for the failure tooltip", async () => {
    render(
      <RepoScanUnavailableIndicator
        failures={[
          {
            repoPath: "/repo/hydra",
            message:
              "xcode-select: error: no developer tools were found at '/', install the command line developer tools",
          },
        ]}
        onRetry={vi.fn()}
      />
    );
    fireEvent.pointerMove(screen.getByLabelText("Worktree scan failure details"));
    expect(
      await screen.findByText(
        "Apple command-line developer tools are missing or unavailable."
      )
    ).toBeInTheDocument();
  });

  it("trusts a structured failureKind over the raw message", async () => {
    render(
      <RepoScanUnavailableIndicator
        failures={[
          {
            repoPath: "/repo/hydra",
            message: "verbose host output",
            failureKind: "architecture-mismatch",
          },
        ]}
        onRetry={vi.fn()}
      />
    );
    fireEvent.pointerMove(screen.getByLabelText("Worktree scan failure details"));
    expect(
      await screen.findByText(/CPU architecture is incompatible/)
    ).toBeInTheDocument();
  });

  it("offers Copy command only when the payload carries one", () => {
    const withoutCommand = render(
      <RepoScanUnavailableIndicator
        failures={[{ repoPath: "/repo/hydra", message: "boom" }]}
        onRetry={vi.fn()}
      />
    );
    expect(screen.queryByTitle("Copy command")).toBeNull();
    withoutCommand.unmount();

    render(
      <RepoScanUnavailableIndicator
        failures={[
          {
            repoPath: "/repo/hydra",
            message: "license",
            failureKind: "xcode-license",
            fixCommand: "sudo xcodebuild -license",
          },
        ]}
        onRetry={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("Copy command"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("sudo xcodebuild -license");
  });

  it("decodes the host's JSON failure payload", async () => {
    render(
      <RepoScanUnavailableIndicator
        failures={[
          {
            repoPath: "/repo/hydra",
            message: JSON.stringify({
              failureKind: "developer-tools",
              message: "xcode-select: error: no developer tools were found at '/'",
              fixCommand: "xcode-select --install",
            }),
          },
        ]}
        onRetry={vi.fn()}
      />
    );
    fireEvent.pointerMove(screen.getByLabelText("Worktree scan failure details"));
    expect(
      await screen.findByText(
        "Apple command-line developer tools are missing or unavailable."
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Copy command"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("xcode-select --install");
    // Diagnostics carry the human error, not the encoded payload.
    fireEvent.click(screen.getByTitle("Copy diagnostics"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "/repo/hydra\nxcode-select: error: no developer tools were found at '/'"
    );
  });

  it("copies the raw diagnostics, not the classified copy", () => {
    render(
      <RepoScanUnavailableIndicator
        failures={[{ repoPath: "/repo/hydra", message: "boom" }]}
        onRetry={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("Copy diagnostics"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("/repo/hydra\nboom");
  });
});
