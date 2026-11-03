import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import {
  loadGitHubViewer,
  submitSidebarFeedback
} from "@/lib/sidebar-desktop-contracts";
import { SidebarFeedbackDialog } from "./SidebarFeedbackDialog";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue("1.2.3") }));

vi.mock("@/lib/sidebar-desktop-contracts", () => ({
  openExternalUrl: vi.fn().mockResolvedValue(undefined),
  submitSidebarFeedback: vi.fn(),
  loadGitHubViewer: vi.fn().mockResolvedValue(null),
  checkForAppUpdates: vi.fn(),
  restartApp: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const PNG_1X1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  ),
  (char) => char.charCodeAt(0)
);

function pngFile(name = "shot.png"): File {
  return new File([PNG_1X1], name, { type: "image/png" });
}

function renderDialog() {
  const onOpenChange = vi.fn();
  const utils = render(<SidebarFeedbackDialog open onOpenChange={onOpenChange} />);
  return { onOpenChange, ...utils };
}

async function waitForEnvPrefill(): Promise<HTMLTextAreaElement> {
  const textarea = screen.getByPlaceholderText("What could we improve?");
  await waitFor(() => expect(textarea.value).toContain("Hydra: 1.2.3"));
  return textarea as HTMLTextAreaElement;
}

describe("SidebarFeedbackDialog (D01-040/D01-041/D01-042/D01-043)", () => {
  beforeEach(() => {
    vi.mocked(submitSidebarFeedback).mockReset();
    vi.mocked(loadGitHubViewer).mockReset().mockResolvedValue(null);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:feedback"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("prefills a technical footer, keeps Send disabled until authored text exists", async () => {
    renderDialog();
    const textarea = await waitForEnvPrefill();

    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
    expect(textarea.value).toContain("OS:");

    fireEvent.change(textarea, { target: { value: `${textarea.value}\nIt crashes on launch` } });
    expect(send).not.toBeDisabled();

    vi.mocked(submitSidebarFeedback).mockResolvedValue({ ok: true });
    fireEvent.click(send);

    await waitFor(() => expect(submitSidebarFeedback).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(submitSidebarFeedback).mock.calls[0][0];
    expect(payload.feedback).toContain("It crashes on launch");
    expect(payload.feedback).toContain("Hydra: 1.2.3");
    expect(payload.images).toEqual([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it("surfaces the missing submit backend as an error instead of a fake success", async () => {
    const { onOpenChange } = renderDialog();
    const textarea = await waitForEnvPrefill();
    fireEvent.change(textarea, { target: { value: "broken" } });

    vi.mocked(submitSidebarFeedback).mockResolvedValue({
      ok: false,
      error: "Feedback submission backend is not available in this build.",
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to submit feedback. Please try again.",
        { description: "Feedback submission backend is not available in this build." }
      )
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("warns when the backend cannot confirm image delivery", async () => {
    renderDialog();
    const textarea = await waitForEnvPrefill();
    fireEvent.change(textarea, { target: { value: "with image" } });

    vi.mocked(submitSidebarFeedback).mockResolvedValue({
      ok: true,
      imagesDelivered: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        "Feedback sent, but image delivery could not be confirmed."
      )
    );
  });

  it("shows the viewer identity and omits it when submitting anonymously", async () => {
    vi.mocked(loadGitHubViewer).mockResolvedValue({
      login: "octocat",
      email: "octo@example.com",
    });
    renderDialog();
    const textarea = await waitForEnvPrefill();

    expect(await screen.findByText(/octocat/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Submit anonymously" }));
    fireEvent.change(textarea, { target: { value: "anonymous report" } });

    vi.mocked(submitSidebarFeedback).mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(submitSidebarFeedback).toHaveBeenCalledTimes(1));
    expect(vi.mocked(submitSidebarFeedback).mock.calls[0][0]).toMatchObject({
      submitAnonymously: true,
      githubLogin: null,
      githubEmail: null,
    });
  });

  it("attaches a pasted image with its bytes and lets the user remove it", async () => {
    renderDialog();
    await waitForEnvPrefill();
    const dialog = screen.getByRole("dialog");

    fireEvent.paste(dialog, { clipboardData: { files: [pngFile()] } });

    const thumbnail = await screen.findByAltText("shot.png");
    expect(thumbnail).toHaveAttribute("src", "blob:feedback");
    expect(screen.getByText("1 KB")).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif");

    fireEvent.click(screen.getByRole("button", { name: "Remove shot.png" }));
    await waitFor(() => expect(screen.queryByAltText("shot.png")).toBeNull());
  });

  it("sends attached image data through the submit contract", async () => {
    renderDialog();
    const textarea = await waitForEnvPrefill();
    fireEvent.change(textarea, { target: { value: "image attached" } });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [pngFile()] } });
    await screen.findByAltText("shot.png");

    vi.mocked(submitSidebarFeedback).mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(submitSidebarFeedback).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(submitSidebarFeedback).mock.calls[0][0];
    expect(payload.images).toHaveLength(1);
    expect(payload.images[0].contentType).toBe("image/png");
    expect(Array.from(payload.images[0].data)).toEqual(Array.from(PNG_1X1));
  });
});
