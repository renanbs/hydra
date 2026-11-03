import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  MAX_FEEDBACK_IMAGE_COUNT,
  extractImageFilesFromDataTransfer,
  formatFeedbackImageSize,
  hasAttachableFeedbackImage,
  readFeedbackImageFiles
} from "./feedback-image-attachments";
import {
  appendClientEnvironmentFooter,
  formatClientEnvironmentFooter,
  hasClientEnvironmentFooter,
  stripClientEnvironmentFooter
} from "../shared/client-environment-info";

// A 1x1 transparent PNG: valid enough for the raster preview header reader.
const PNG_1X1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  ),
  (char) => char.charCodeAt(0)
);

function pngFile(name = "shot.png"): File {
  return new File([PNG_1X1], name, { type: "image/png" });
}

describe("feedback image attachments (D01-042)", () => {
  beforeEach(() => {
    // jsdom implements no object URLs; the hook only needs stable, revocable strings.
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:feedback"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("reads supported images into drafts with byte metadata", async () => {
    const { images, errors } = await readFeedbackImageFiles([pngFile(), pngFile("two.png")], 0);

    expect(errors).toEqual([]);
    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({
      name: "shot.png",
      contentType: "image/png",
      bytes: PNG_1X1.length,
      previewUrl: "blob:feedback",
    });
    expect(images[1].name).toBe("two.png");
  });

  it("reports unsupported types and files over capacity instead of dropping them", async () => {
    const text = new File(["hello"], "notes.txt", { type: "text/plain" });
    const { images, errors } = await readFeedbackImageFiles([text, pngFile()], 0);
    expect(images).toHaveLength(1);
    expect(errors.join(" ")).toContain("notes.txt is not a supported image type.");

    const overflow = await readFeedbackImageFiles(
      [pngFile()],
      MAX_FEEDBACK_IMAGE_COUNT
    );
    expect(overflow.images).toEqual([]);
    expect(overflow.errors.join(" ")).toContain(`up to ${MAX_FEEDBACK_IMAGE_COUNT} images`);
  });

  it("only claims a paste when an attachable image remains", () => {
    expect(hasAttachableFeedbackImage([pngFile()], 0)).toBe(true);
    expect(hasAttachableFeedbackImage([pngFile()], MAX_FEEDBACK_IMAGE_COUNT)).toBe(false);
    expect(
      hasAttachableFeedbackImage([new File(["x"], "note.txt", { type: "text/plain" })])
    ).toBe(false);
  });

  it("extracts image files from a data transfer and formats sizes", () => {
    const data = {
      files: [pngFile(), new File(["x"], "readme.md", { type: "text/markdown" })],
    } as unknown as DataTransfer;

    expect(extractImageFilesFromDataTransfer(data).map((file) => file.name)).toEqual([
      "shot.png",
    ]);
    expect(formatFeedbackImageSize(512)).toBe("1 KB");
    expect(formatFeedbackImageSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("client environment footer (D01-040)", () => {
  const info = {
    appVersion: "1.2.3",
    platform: "linux",
    osRelease: "6.9",
    arch: "x86_64",
    shell: "/bin/zsh",
  };

  it("appends one footer and strips only that block", () => {
    const withFooter = appendClientEnvironmentFooter({ message: "It broke", info });
    expect(hasClientEnvironmentFooter(withFooter)).toBe(true);
    expect(formatClientEnvironmentFooter(info)).toContain("Hydra: 1.2.3");
    expect(withFooter).toContain("OS: linux 6.9 (x86_64)");
    expect(withFooter).toContain("Shell: /bin/zsh");

    expect(stripClientEnvironmentFooter(withFooter).trim()).toBe("It broke");
    expect(stripClientEnvironmentFooter(`${withFooter}\nthanks`).trim().replace(/\n+/g, "\n")).toBe(
      "It broke\nthanks"
    );
  });

  it("does not duplicate an existing footer", () => {
    const once = appendClientEnvironmentFooter({ message: "body", info });
    expect(appendClientEnvironmentFooter({ message: once, info })).toBe(once);
  });
});
