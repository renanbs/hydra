// D03b-029: the repo-header order persists through the SQLite UI prefs (not only the
// per-webview localStorage key), and hydrates back with the legacy key as a fallback.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import {
  PROJECT_ORDER_PREF_KEY,
  orderItemsByProjectOrder,
  persistProjectOrderPreference,
  readProjectOrderPreference,
} from "./project-order-preference";

const ITEMS = [
  { id: "a", path: "/a" },
  { id: "b", path: "/b" },
  { id: "c", path: "/c" },
];

describe("project order preference (D03b-029)", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it("writes the order through the existing sidebar-pref IPC and mirrors localStorage", () => {
    persistProjectOrderPreference(["c", "a", "b"]);
    expect(invokeMock).toHaveBeenCalledWith("save_sidebar_pref", {
      key: PROJECT_ORDER_PREF_KEY,
      json: JSON.stringify(["c", "a", "b"]),
    });
    expect(JSON.parse(localStorage.getItem("hydra:projects_order")!)).toEqual(["c", "a", "b"]);
  });

  it("reads the SQLite pref first", async () => {
    invokeMock.mockResolvedValueOnce(JSON.stringify(["b", "a"]));
    await expect(readProjectOrderPreference()).resolves.toEqual(["b", "a"]);
  });

  it("falls back to the legacy localStorage key when the pref is absent", async () => {
    invokeMock.mockResolvedValue(null);
    localStorage.setItem("hydra:projects_order", JSON.stringify(["c", "b"]));
    await expect(readProjectOrderPreference()).resolves.toEqual(["c", "b"]);
  });

  it("orders by id with unknown items last", () => {
    expect(orderItemsByProjectOrder(ITEMS, ["c", "a"])).toEqual([
      { id: "c", path: "/c" },
      { id: "a", path: "/a" },
      { id: "b", path: "/b" },
    ]);
    expect(orderItemsByProjectOrder(ITEMS, null)).toEqual(ITEMS);
  });
});
