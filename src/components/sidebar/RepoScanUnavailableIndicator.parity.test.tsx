// Parity guard for D03a-075: scan-failure indicator.
//
// Orca paints a destructive warning on the repo header, retries the scan on click,
// explains the failure kind, and copies either the payload's fix command or the
// diagnostics. Hydra omitted the surface entirely; these tests pin the adapted
// contract, including "Copy command only when the payload carries one".
import { beforeAll, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DetectedWorktreeListResult } from "../../shared/worktree/types";
import { RepoScanUnavailableIndicator } from "./RepoScanUnavailableIndicator";

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
});

const REPO = {
  id: "repo_a",
  displayName: "hydra",
  path: "/home/renan/src/hydra",
  executionHostId: "local" as const,
};

function detected(
  overrides: Partial<Pick<DetectedWorktreeListResult, "authoritative" | "unavailableReason" | "failureKind">> = {}
) {
  return {
    authoritative: false,
    unavailableReason:
      "Agreeing to the Xcode/iOS license requires admin privileges, please run sudo xcodebuild -license",
    ...overrides,
  };
}

function renderIndicator(
  props: Partial<Parameters<typeof RepoScanUnavailableIndicator>[0]> = {}
) {
  return render(
    <RepoScanUnavailableIndicator
      repo={REPO}
      detected={detected()}
      retryScan={vi.fn()}
      {...props}
    />
  );
}

describe("RepoScanUnavailableIndicator (Orca parity)", () => {
  it("stays hidden for an authoritative scan or a scan without a reason", () => {
    const authoritative = renderIndicator({ detected: detected({ authoritative: true }) });
    expect(authoritative.container).toBeEmptyDOMElement();

    const healthy = renderIndicator({ detected: { authoritative: false } });
    expect(healthy.container).toBeEmptyDOMElement();

    const absent = renderIndicator({ detected: null });
    expect(absent.container).toBeEmptyDOMElement();
  });

  it("retries the scan on click and disables while pending", async () => {
    const retryGate = Promise.withResolvers<void>();
    const retryScan = vi.fn(() => retryGate.promise);
    renderIndicator({ retryScan });

    fireEvent.click(screen.getByRole("button", { name: /Worktree scan failed for hydra/ }));
    expect(retryScan).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Worktree scan failed for hydra/ })).toBeDisabled();

    retryGate.resolve();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Worktree scan failed for hydra/ })
      ).not.toBeDisabled()
    );
  });

  it("classifies the failure string when the payload has no kind", async () => {
    renderIndicator({
      detected: detected({
        unavailableReason: "xcode-select: error: no developer tools were found at '/'",
      }),
    });
    const trigger = screen.getByRole("button", { name: /Worktree scan failed for hydra/ });
    fireEvent.focus(trigger);
    expect(
      await screen.findByText("Apple command-line developer tools are missing or unavailable.")
    ).toBeInTheDocument();
  });

  it("offers Copy command only when the failure payload carries a command", async () => {
    const copyText = vi.fn(async () => {});
    const withCommand = renderIndicator({
      fixCommand: "sudo xcodebuild -license",
      copyText,
    });
    fireEvent.focus(withCommand.getByRole("button", { name: /Worktree scan failed/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy command" }));
    expect(copyText).toHaveBeenCalledWith("sudo xcodebuild -license");
  });

  it("always copies diagnostics and never invents a command", async () => {
    const copyText = vi.fn(async () => {});
    renderIndicator({ copyText });
    fireEvent.focus(screen.getByRole("button", { name: /Worktree scan failed/ }));

    expect(screen.queryByRole("button", { name: "Copy command" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Copy diagnostics" }));
    expect(copyText).toHaveBeenCalledTimes(1);
    const diagnostics = copyText.mock.calls[0][0] as string;
    expect(diagnostics).toContain("Repository: hydra");
    expect(diagnostics).toContain("Path: /home/renan/src/hydra");
    expect(diagnostics).toContain("Execution host: local");
    expect(diagnostics).toContain("Failure: Agreeing to the Xcode/iOS license");
  });
});
