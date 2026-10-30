import { describe, expect, it } from "vitest";
import { getFolderWorkspaceCreateDisabledReason } from "./folder-workspace-path-status";

describe("getFolderWorkspaceCreateDisabledReason", () => {
  it("is null for a healthy folder", () => {
    expect(
      getFolderWorkspaceCreateDisabledReason({ path: "/ok", exists: true })
    ).toBeNull();
  });

  it("explains a missing folder instead of a generic 'not found'", () => {
    const reason = getFolderWorkspaceCreateDisabledReason({
      path: "/gone",
      exists: false,
      reason: "missing",
    });
    expect(reason).toContain("/gone");
    expect(reason?.toLowerCase()).toContain("cannot find");
  });

  it("explains an ambiguous connection distinctly", () => {
    const ambiguous = getFolderWorkspaceCreateDisabledReason({
      path: "/srv/work",
      exists: false,
      reason: "ambiguous-connection",
    });
    const missing = getFolderWorkspaceCreateDisabledReason({
      path: "/srv/work",
      exists: false,
      reason: "missing",
    });
    expect(ambiguous).not.toEqual(missing);
    expect(ambiguous?.length).toBeGreaterThan(0);
  });
});
