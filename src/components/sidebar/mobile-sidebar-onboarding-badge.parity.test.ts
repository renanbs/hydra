import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => ({ devices: [] }))
}));

 import {
   shouldShowMobileSidebarOnboardingBadge,
   useMobileSidebarOnboardingBadge,
 } from "./mobile-sidebar-onboarding-badge";

const DISMISS_KEY = "hydra.mobile.sidebar-onboarding-dismissed";

describe("mobile sidebar onboarding badge (D01-024)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows only while the entry is enabled and the badge was never dismissed", () => {
    expect(shouldShowMobileSidebarOnboardingBadge(true, false)).toBe(true);
    expect(shouldShowMobileSidebarOnboardingBadge(true, true)).toBe(false);
    expect(shouldShowMobileSidebarOnboardingBadge(false, false)).toBe(false);
  });

  it("starts hidden until the device list loads, then shows when empty", async () => {
    const { result } = renderHook(() => useMobileSidebarOnboardingBadge(true));

    await waitFor(() => expect(result.current.visible).toBe(true));
    expect(result.current.hasPairedDevice).toBe(false);
  });

  it("dismisses once and persists the dismissal for the next launch", () => {
    const { result } = renderHook(() => useMobileSidebarOnboardingBadge(true));

    act(() => result.current.dismiss());

    expect(result.current.visible).toBe(false);
    expect(window.localStorage.getItem(DISMISS_KEY)).toBe("1");
  });

  it("stays hidden for a dismissed badge even when re-enabled", () => {
    window.localStorage.setItem(DISMISS_KEY, "1");

    const { result } = renderHook(() => useMobileSidebarOnboardingBadge(true));

    expect(result.current.visible).toBe(false);
  });

  it("hides immediately when the sidebar entry is disabled", () => {
    const { result } = renderHook(() => useMobileSidebarOnboardingBadge(false));

    expect(result.current.visible).toBe(false);
  });
});
