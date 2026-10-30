import { describe, expect, it } from "vitest";
import { moveHostSectionForDrop, orderHostSectionOptions } from "./host-section-order";

describe("host section order", () => {
  it("moves a dragged host into the target slot", () => {
    expect(moveHostSectionForDrop(["local", "a", "b"], "b", "local")).toEqual(["b", "local", "a"]);
    expect(moveHostSectionForDrop(["local", "a", "b"], "local", "b")).toEqual(["a", "b", "local"]);
  });

  it("leaves the order untouched for same-host or unknown drops", () => {
    expect(moveHostSectionForDrop(["local", "a"], "a", "a")).toEqual(["local", "a"]);
    expect(moveHostSectionForDrop(["local"], "ghost", "local")).toEqual(["local"]);
  });

  it("keeps persisted order first and appends unseen hosts", () => {
    const options = [{ id: "local" }, { id: "ssh:a" }, { id: "runtime:1" }] as never[];
    expect(orderHostSectionOptions(options, ["ssh:a"]).map((host) => host.id)).toEqual([
      "ssh:a",
      "local",
      "runtime:1",
    ]);
  });
});
