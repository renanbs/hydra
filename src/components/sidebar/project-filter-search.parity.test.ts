import { describe, expect, it } from "vitest";
import { searchProjects } from "./project-filter-search";

const PROJECTS = [
  { id: "a", name: "hydra", displayName: "Hydra", path: "/src/hydra" },
  { id: "b", name: "tools", displayName: "tools", path: "/src/hydra-tools" },
  { id: "c", name: "orca", displayName: "Orca", path: "/src/orca" },
];

describe("project filter search (Orca parity)", () => {
  it("matches name and path and ranks the name hit first", () => {
    expect(searchProjects(PROJECTS, "hydra").map((project) => project.id)).toEqual(["a", "b"]);
    expect(searchProjects(PROJECTS, "orca").map((project) => project.id)).toEqual(["c"]);
  });

  it("is case-insensitive, trims, and returns everything for an empty query", () => {
    expect(searchProjects(PROJECTS, "  HY  ").map((project) => project.id)).toEqual(["a", "b"]);
    expect(searchProjects(PROJECTS, "   ")).toHaveLength(3);
  });

  it("returns no rows when nothing matches", () => {
    expect(searchProjects(PROJECTS, "zzz")).toHaveLength(0);
  });
});
