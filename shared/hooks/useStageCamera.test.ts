import { describe, expect, it, vi } from "vitest";

import { focusStage, stageFocusPlan } from "./useStageCamera";

describe("stage camera contract", () => {
  it("targets a newly opened stage and replacement detail identity", () => {
    expect(stageFocusPlan(["root"], ["root", "detail-a"])).toEqual({ key: "detail-a", align: "nearest" });
    expect(stageFocusPlan(["root", "detail-a"], ["root", "detail-b"])).toEqual({ key: "detail-b", align: "center" });
  });

  it("returns focus to the parent when a stage closes", () => {
    expect(stageFocusPlan(["root", "list", "detail"], ["root", "list"])).toEqual({ key: "list", align: "center" });
  });

  it("uses non-animated scrolling for reduced motion", () => {
    const owner = document.createElement("div");
    const target = document.createElement("div");
    const scrollTo = vi.fn();
    Object.defineProperties(owner, {
      scrollTo: { configurable: true, value: scrollTo },
      clientWidth: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 900 },
    });
    owner.getBoundingClientRect = () => ({ left: 0, right: 400, top: 0, bottom: 600, width: 400, height: 600, x: 0, y: 0, toJSON: () => ({}) });
    target.getBoundingClientRect = () => ({ left: 500, right: 800, top: 100, bottom: 500, width: 300, height: 400, x: 500, y: 100, toJSON: () => ({}) });

    focusStage(owner, target, "nearest", true);

    expect(scrollTo).toHaveBeenCalledWith({ left: 424, behavior: "auto" });
  });
});
