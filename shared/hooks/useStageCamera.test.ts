import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { focusStage, requestStageFocus, stageFocusPlan, useStageCamera } from "./useStageCamera";

describe("stage camera contract", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });

  it("targets a newly opened stage while stable detail replacement uses explicit intent", () => {
    expect(stageFocusPlan(["root"], ["root", "detail-a"])).toEqual({ key: "detail-a", align: "nearest" });
    expect(stageFocusPlan(["root", "detail"], ["root", "detail"])).toBeNull();
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

  it("keeps the larger mobile leading inset when revealing a stage", () => {
    const owner = document.createElement("div");
    const target = document.createElement("div");
    const scrollTo = vi.fn();
    Object.defineProperties(owner, {
      scrollLeft: { configurable: true, writable: true, value: 100 },
      scrollTo: { configurable: true, value: scrollTo },
      clientWidth: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 900 },
    });
    owner.getBoundingClientRect = () => ({ left: 0, right: 400, top: 0, bottom: 600, width: 400, height: 600, x: 0, y: 0, toJSON: () => ({}) });
    target.getBoundingClientRect = () => ({ left: 10, right: 310, top: 0, bottom: 400, width: 300, height: 400, x: 10, y: 0, toJSON: () => ({}) });

    focusStage(owner, target, "nearest", false, { leading: 48, trailing: 24 });

    expect(scrollTo).toHaveBeenCalledWith({ left: 62, behavior: "smooth" });
  });

  it("moves the camera when an existing stage sends explicit focus intent", () => {
    const owner = document.createElement("div");
    const target = document.createElement("div");
    target.dataset.stageKey = "detail";
    owner.append(target);
    const scrollTo = vi.fn();
    Object.defineProperties(owner, {
      scrollTo: { configurable: true, value: scrollTo },
      clientWidth: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 900 },
    });
    owner.getBoundingClientRect = () => ({ left: 0, right: 400, top: 0, bottom: 600, width: 400, height: 600, x: 0, y: 0, toJSON: () => ({}) });
    target.getBoundingClientRect = () => ({ left: 500, right: 800, top: 0, bottom: 400, width: 300, height: 400, x: 500, y: 0, toJSON: () => ({}) });
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => requestStageFocus("detail", "center"));

    expect(scrollTo).toHaveBeenCalledWith({ left: 450, behavior: "smooth" });
  });
});
