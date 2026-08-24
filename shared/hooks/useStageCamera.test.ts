import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cameraInsets,
  cameraProfileForWidth,
  cameraScrollTarget,
  focusStage,
  requestStageFocus,
  stageFocusPlan,
  useStageCamera,
} from "./useStageCamera";

const domRect = (left: number, width: number) => ({
  left,
  right: left + width,
  top: 0,
  bottom: 600,
  width,
  height: 600,
  x: left,
  y: 0,
  toJSON: () => ({}),
});

function cameraOwner(clientWidth = 400, scrollWidth = 1200) {
  const owner = document.createElement("div");
  const scrollTo = vi.fn(({ left }: { left: number }) => { owner.scrollLeft = left; });
  Object.defineProperties(owner, {
    scrollLeft: { configurable: true, writable: true, value: 0 },
    scrollTo: { configurable: true, value: scrollTo },
    clientWidth: { configurable: true, value: clientWidth },
    scrollWidth: { configurable: true, value: scrollWidth },
  });
  owner.getBoundingClientRect = () => domRect(0, clientWidth);
  return { owner, scrollTo };
}

function appendStage(owner: HTMLElement, key: string, left: number, width = 300, autoFocus = true) {
  const stage = document.createElement("div");
  stage.dataset.stageKey = key;
  if (!autoFocus) stage.dataset.stageAutoFocus = "false";
  stage.getBoundingClientRect = () => domRect(left - owner.scrollLeft, width);
  owner.append(stage);
  return stage;
}

describe("stage camera contract", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });

  it("targets only genuine stage topology changes and returns to the immediate parent", () => {
    expect(stageFocusPlan(["root"], ["root", "detail"])).toEqual({ key: "detail", align: "forward" });
    expect(stageFocusPlan(["root", "detail"], ["root", "detail"])).toBeNull();
    expect(stageFocusPlan(["root", "list", "detail"], ["root", "list"])).toEqual({ key: "list", align: "back" });
  });

  it("selects wide, compact, and mobile policy from viewport width", () => {
    expect(cameraProfileForWidth(1440)).toBe("wide");
    expect(cameraProfileForWidth(1000)).toBe("compact");
    expect(cameraProfileForWidth(390)).toBe("mobile");
  });

  it("clamps both scroll bounds and aligns an over-wide target from its readable start", () => {
    const base = { scrollLeft: 0, scrollWidth: 900, clientWidth: 400, targetWidth: 300, profile: "mobile" as const, align: "forward" as const, insets: { leading: 24, trailing: 24 } };
    expect(cameraScrollTarget({ ...base, targetLeft: -80 })).toBe(0);
    expect(cameraScrollTarget({ ...base, targetLeft: 1_200 })).toBe(500);
    expect(cameraScrollTarget({ ...base, targetLeft: 500, targetWidth: 460 })).toBe(500);
  });

  it.each([
    ["wide", 164],
    ["compact", 628],
    ["mobile", 676],
  ] as const)("uses the %s forward composition policy", (profile, expected) => {
    expect(cameraScrollTarget({
      scrollLeft: 0,
      scrollWidth: 2_000,
      clientWidth: 1_000,
      targetLeft: 700,
      targetWidth: 344,
      profile,
      align: "forward",
      insets: profile === "wide" ? { leading: 32, trailing: 120 } : profile === "compact" ? { leading: 72, trailing: 32 } : { leading: 24, trailing: 24 },
    })).toBe(expected);
  });

  it.each([
    ["wide", 164],
    ["compact", 628],
    ["mobile", 676],
  ] as const)("uses the %s Back composition policy", (profile, expected) => {
    expect(cameraScrollTarget({
      scrollLeft: 900,
      scrollWidth: 2_000,
      clientWidth: 1_000,
      targetLeft: 700,
      targetWidth: 344,
      profile,
      align: "back",
      insets: profile === "wide" ? { leading: 32, trailing: 120 } : profile === "compact" ? { leading: 72, trailing: 32 } : { leading: 24, trailing: 24 },
    })).toBe(expected);
  });

  it("centers a mobile near-viewport-width stage instead of preserving a desktop-style parent peek", () => {
    expect(cameraScrollTarget({
      scrollLeft: 0,
      scrollWidth: 1_200,
      clientWidth: 400,
      targetLeft: 500,
      targetWidth: 368,
      profile: "mobile",
      align: "forward",
      insets: { leading: 48, trailing: 24 },
    })).toBe(484);
  });

  it("uses non-animated scrolling for reduced motion", () => {
    const { owner, scrollTo } = cameraOwner(400, 900);
    const target = appendStage(owner, "detail", 500);

    focusStage(owner, target, "forward", true);

    expect(scrollTo).toHaveBeenCalledWith({ left: 448, behavior: "auto" });
  });

  it("focuses a new child topology but ignores arbitrary child-list changes", async () => {
    const { owner, scrollTo } = cameraOwner();
    const root = appendStage(owner, "root", 100);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => appendStage(owner, "detail", 600));
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    scrollTo.mockClear();

    act(() => root.append(document.createElement("span")));
    await act(async () => { await Promise.resolve(); });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("preserves a spatial stage that opts out of forward auto-focus", async () => {
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "profile", 100);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => appendStage(owner, "history", 420, 300, false));
    await act(async () => { await Promise.resolve(); });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("focuses the immediate surviving parent when the deepest stage is removed", async () => {
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "root", 100);
    const list = appendStage(owner, "list", 420);
    const detail = appendStage(owner, "detail", 740);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => detail.remove());

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(list.dataset.stageKey).toBe("list");
  });

  it("moves an existing stage only for explicit focus intent", () => {
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "detail", 500);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => requestStageFocus("detail", "center"));

    expect(scrollTo).toHaveBeenCalledWith({ left: 450, behavior: "smooth" });
  });

  it("keeps a same-context request until its stage mounts", async () => {
    const { owner, scrollTo } = cameraOwner();
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));

    act(() => requestStageFocus("late-detail", "forward"));
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => appendStage(owner, "late-detail", 600));

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
  });

  it("does not keep a focus target that exists outside the active camera owner", async () => {
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "root", 100);
    const outside = appendStage(document.body, "left-context", 0);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "role"));
    scrollTo.mockClear();

    act(() => requestStageFocus("left-context", "back"));
    act(() => appendStage(owner, "role-summary", 420));

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    outside.remove();
  });

  it("invalidates stale pending focus on main context switch and ignores its late old mount", async () => {
    const { owner, scrollTo } = cameraOwner();
    const oldRoot = appendStage(owner, "player-root", 100);
    const ref = { current: owner };
    const view = renderHook(({ context }) => useStageCamera(ref, ref, context), { initialProps: { context: "player" } });
    scrollTo.mockClear();
    act(() => requestStageFocus("player-late-detail", "forward"));

    act(() => {
      oldRoot.remove();
      appendStage(owner, "inventory-root", 100);
      view.rerender({ context: "inventory" });
    });
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    scrollTo.mockClear();

    act(() => appendStage(owner, "player-late-detail", 600));
    await act(async () => { await Promise.resolve(); });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("coalesces rapid explicit requests to the final valid target", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "list", 400);
    appendStage(owner, "detail", 720);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    frames.clear();

    act(() => {
      requestStageFocus("list", "forward");
      requestStageFocus("detail", "forward");
    });
    [...frames.values()].forEach((callback) => callback(0));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 668, behavior: "smooth" });
  });

  it.each([
    ["wide", 1440, 1300, 1000, 800, 700, 296],
    ["compact", 1100, 900, 1000, 600, 700, 628],
    ["mobile", 700, 500, 700, 500, 600, 576],
  ] as const)("recomposes the active detail after a same-profile %s resize", async (
    _profile,
    initialViewportWidth,
    resizedViewportWidth,
    initialOwnerWidth,
    resizedOwnerWidth,
    resizedTargetLeft,
    expectedLeft,
  ) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: initialViewportWidth });
    const { owner, scrollTo } = cameraOwner(initialOwnerWidth, 2_000);
    appendStage(owner, "root", 100);
    const detail = appendStage(owner, "detail", 700);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    act(() => requestStageFocus("detail", "forward"));
    scrollTo.mockClear();

    Object.defineProperty(owner, "clientWidth", { configurable: true, value: resizedOwnerWidth });
    owner.getBoundingClientRect = () => domRect(0, resizedOwnerWidth);
    detail.getBoundingClientRect = () => domRect(resizedTargetLeft - owner.scrollLeft, 300);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: resizedViewportWidth });
    act(() => window.dispatchEvent(new Event("resize")));

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo).toHaveBeenCalledWith({ left: expectedLeft, behavior: "smooth" });
  });

  it("coalesces a resize burst into one camera recomposition", async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    const { owner, scrollTo } = cameraOwner(1_000, 2_000);
    appendStage(owner, "root", 100);
    appendStage(owner, "detail", 700);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));

    act(() => {
      const initialFocus = [...frames.values()];
      frames.clear();
      initialFocus.forEach((callback) => callback(0));
    });
    scrollTo.mockClear();

    Object.defineProperty(owner, "clientWidth", { configurable: true, value: 800 });
    owner.getBoundingClientRect = () => domRect(0, 800);
    act(() => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1380 });
      window.dispatchEvent(new Event("resize"));
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1340 });
      window.dispatchEvent(new Event("resize"));
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1300 });
      window.dispatchEvent(new Event("resize"));
    });
    expect(frames.size).toBe(1);

    act(() => {
      const resize = [...frames.values()];
      frames.clear();
      resize.forEach((callback) => callback(0));
    });
    await waitFor(() => expect(frames.size).toBe(1));
    act(() => {
      const focus = [...frames.values()];
      frames.clear();
      focus.forEach((callback) => callback(0));
    });

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 296, behavior: "smooth" });
  });

  it("preserves the semantic active stage when switching from desktop to mobile owner", async () => {
    const { owner: viewport, scrollTo: viewportScroll } = cameraOwner();
    const { owner: workspace, scrollTo: workspaceScroll } = cameraOwner();
    viewport.append(workspace);
    appendStage(workspace, "root", 100);
    appendStage(workspace, "detail", 600);
    const viewportRef = { current: viewport };
    const workspaceRef = { current: workspace };
    renderHook(() => useStageCamera(viewportRef, workspaceRef, "player"));
    viewportScroll.mockClear();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    act(() => window.dispatchEvent(new Event("resize")));

    await waitFor(() => expect(viewportScroll).toHaveBeenCalledTimes(1));
    expect(workspaceScroll).toHaveBeenLastCalledWith({ left: 0, behavior: "auto" });
  });

  it("restores contextual wide composition when switching from mobile to desktop owner", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { owner: viewport } = cameraOwner();
    const { owner: workspace, scrollTo: workspaceScroll } = cameraOwner();
    viewport.append(workspace);
    appendStage(workspace, "root", 100);
    appendStage(workspace, "detail", 600);
    const viewportRef = { current: viewport };
    const workspaceRef = { current: workspace };
    renderHook(() => useStageCamera(viewportRef, workspaceRef, "player"));
    workspaceScroll.mockClear();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
    act(() => window.dispatchEvent(new Event("resize")));

    await waitFor(() => expect(workspaceScroll).toHaveBeenCalledTimes(1));
    expect(workspaceScroll).toHaveBeenCalledWith({ left: 548, behavior: "smooth" });
  });

  it("falls back to the deepest surviving stage when the active stage is missing after profile switch", async () => {
    const { owner: viewport, scrollTo: viewportScroll } = cameraOwner();
    const { owner: workspace } = cameraOwner();
    viewport.append(workspace);
    const root = appendStage(workspace, "root", 100);
    const detail = appendStage(workspace, "detail", 600);
    const viewportRef = { current: viewport };
    const workspaceRef = { current: workspace };
    renderHook(() => useStageCamera(viewportRef, workspaceRef, "player"));
    detail.remove();
    viewportScroll.mockClear();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    act(() => window.dispatchEvent(new Event("resize")));

    await waitFor(() => expect(viewportScroll).toHaveBeenCalledTimes(1));
    expect(root.dataset.stageKey).toBe("root");
  });

  it("does not reassert the camera for manual scrolling alone", () => {
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "root", 100);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => {
      owner.scrollLeft = 275;
      owner.dispatchEvent(new Event("scroll"));
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("derives profile insets without carrying the old mobile parent-peek minimum", () => {
    const { owner } = cameraOwner(400);
    expect(cameraInsets(owner, "mobile")).toEqual({ leading: 24, trailing: 24 });
    expect(cameraInsets(owner, "compact")).toEqual({ leading: 48, trailing: 32 });
  });
});
