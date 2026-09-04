import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  activeHorizontalBounds,
  cameraInsets,
  cameraProfileForWidth,
  cameraScrollTarget,
  focusStage,
  horizontalBounds,
  requestStageFocus,
  stageFocusPlan,
  useStageCamera,
  wideCameraScrollTarget,
  wideCompositionScrollDelta,
  wideStageMaxWidth,
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

function cameraOwner(clientWidth = 400, scrollWidth = 1200, left = 0) {
  const owner = document.createElement("div");
  const scrollTo = vi.fn(({ left }: { left: number }) => { owner.scrollLeft = left; });
  Object.defineProperties(owner, {
    scrollLeft: { configurable: true, writable: true, value: 0 },
    scrollTo: { configurable: true, value: scrollTo },
    clientWidth: { configurable: true, value: clientWidth },
    scrollWidth: { configurable: true, value: scrollWidth },
  });
  owner.getBoundingClientRect = () => domRect(left, clientWidth);
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

function layoutElement(left: number, width: number, display = "block") {
  const element = document.createElement("div");
  element.style.display = display;
  element.getBoundingClientRect = () => domRect(left, width);
  return element;
}

describe("stage camera contract", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal("ResizeObserver", undefined);
  });

  it.each([
    { name: "two-stage", clientWidth: 924, naturalWidths: [520, 660] },
    { name: "three-stage", clientWidth: 1_440, naturalWidths: [344, 720, 620] },
  ])("allocates a wide $name composition inside 24px safe bounds", ({ clientWidth, naturalWidths }) => {
    const maxWidth = wideStageMaxWidth(clientWidth, naturalWidths.length);
    const renderedWidth = naturalWidths.reduce((total, width) => total + Math.min(width, maxWidth), 0)
      + 18 * (naturalWidths.length - 1);

    expect(renderedWidth).toBeLessThanOrEqual(clientWidth - 48);
  });

  it("excludes a hidden context and includes it as soon as it owns visible geometry", () => {
    const context = layoutElement(24, 500, "none");
    const navigation = layoutElement(24, 96);
    const primary = layoutElement(136, 1_440);
    document.body.append(context, navigation, primary);

    expect(activeHorizontalBounds([context, navigation, primary])).toEqual({ left: 24, right: 1_576, width: 1_552 });

    context.style.display = "block";
    expect(activeHorizontalBounds([context, navigation, primary])).toEqual({ left: 24, right: 1_576, width: 1_552 });
    expect(activeHorizontalBounds([context, navigation])?.right).toBe(524);
    context.remove();
    navigation.remove();
    primary.remove();
  });

  it("fits representative Quick Record and Role compositions at 1600px without theme geometry", () => {
    const quickMax = wideStageMaxWidth(1_440, 3);
    const quickBounds = horizontalBounds([
      domRect(24, 96),
      domRect(160, Math.min(344, quickMax)),
      domRect(516, Math.min(720, quickMax)),
      domRect(980, Math.min(620, quickMax)),
    ])!;
    const roleMax = wideStageMaxWidth(924, 2);
    const roleBounds = horizontalBounds([
      domRect(24, 500),
      domRect(540, 96),
      domRect(676, roleMax),
      domRect(676 + roleMax + 12, roleMax),
    ])!;

    expect(wideCompositionScrollDelta(quickBounds, 1_600)).toBe(0);
    expect(wideCompositionScrollDelta(roleBounds, 1_600)).toBe(0);
    expect(quickBounds.right).toBeLessThanOrEqual(1_576);
    expect(roleBounds.right).toBeLessThanOrEqual(1_576);

    document.documentElement.dataset.theme = "warm-beige";
    const warm = wideStageMaxWidth(1_440, 3);
    document.documentElement.dataset.theme = "astral";
    expect(wideStageMaxWidth(1_440, 3)).toBe(warm);
    delete document.documentElement.dataset.theme;
  });

  it("honors wide center and nearest preferences inside the composition-safe interval", () => {
    const base = {
      scrollWidth: 2_000,
      clientWidth: 1_000,
      bounds: { left: 800, right: 1_200, width: 400 },
      safeLeft: 524,
      safeRight: 1_476,
      targetLeft: 500,
      targetWidth: 200,
      insets: { leading: 32, trailing: 120 },
    };

    expect(wideCameraScrollTarget({ ...base, scrollLeft: 0, align: "center" })).toBe(100);
    expect(wideCameraScrollTarget({
      ...base,
      scrollLeft: 120,
      bounds: { left: 700, right: 1_100, width: 400 },
      targetLeft: 420,
      align: "nearest",
    })).toBe(120);
  });

  it.each(["forward", "back"] as const)("honors wide %s preference while the whole composition remains safe", (align) => {
    expect(wideCameraScrollTarget({
      scrollLeft: 0,
      scrollWidth: 2_000,
      clientWidth: 1_000,
      bounds: { left: 700, right: 1_450, width: 750 },
      safeLeft: 524,
      safeRight: 1_476,
      targetLeft: 600,
      targetWidth: 350,
      align,
      insets: { leading: 32, trailing: 120 },
    })).toBe(70);
  });

  it("keeps wide composition safety authoritative over a conflicting center preference", () => {
    expect(wideCameraScrollTarget({
      scrollLeft: 0,
      scrollWidth: 2_000,
      clientWidth: 1_000,
      bounds: { left: 524, right: 1_476, width: 952 },
      safeLeft: 524,
      safeRight: 1_476,
      targetLeft: 700,
      targetWidth: 200,
      align: "center",
      insets: { leading: 32, trailing: 120 },
    })).toBe(0);
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

  it("reallocates wide stage width when active topology changes", async () => {
    const { owner: viewport } = cameraOwner(1_600, 1_600);
    const { owner: workspace } = cameraOwner(924, 1_600);
    viewport.append(workspace);
    document.body.append(viewport);
    appendStage(workspace, "root", 676, 520);
    const view = renderHook(() => useStageCamera({ current: viewport }, { current: workspace }, "role"));

    expect(workspace.style.getPropertyValue("--lag-wide-stage-max")).toBe("876px");
    act(() => appendStage(workspace, "detail", 1_208, 660));

    await waitFor(() => expect(workspace.style.getPropertyValue("--lag-wide-stage-max")).toBe("429px"));
    view.unmount();
    viewport.remove();
  });

  it("rescans and recomposes when a non-stage loading owner is replaced by the Home surface", async () => {
    const observed: Element[] = [];
    class TestResizeObserver {
      observe = (element: Element) => { observed.push(element); };
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const { owner: viewport } = cameraOwner(1_600, 1_600);
    const { owner: workspace, scrollTo } = cameraOwner(1_440, 2_000, 136);
    const loading = layoutElement(160, 400);
    workspace.append(loading);
    viewport.append(workspace);
    document.body.append(viewport);
    const view = renderHook(() => useStageCamera({ current: viewport }, { current: workspace }, "home"));
    expect(observed).toContain(loading);
    observed.length = 0;
    scrollTo.mockClear();

    const loaded = loading;
    act(() => {
      loaded.dataset.cameraLayoutOwner = "surface";
      loaded.getBoundingClientRect = () => domRect(160, 1_540);
      loaded.replaceChildren(document.createElement("section"));
    });

    await waitFor(() => expect(observed).toContain(loaded));
    expect(scrollTo).toHaveBeenCalledWith({ left: 148, behavior: "smooth" });
    scrollTo.mockClear();

    act(() => loaded.append(document.createElement("span")));
    await act(async () => { await Promise.resolve(); });
    expect(scrollTo).not.toHaveBeenCalled();
    view.unmount();
    viewport.remove();
  });

  it("rescans wide layout owners when a fixed viewport sibling changes", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1_600 });
    const { owner: viewport } = cameraOwner(1_600, 1_600);
    const { owner: workspace, scrollTo } = cameraOwner(1_440, 2_000, 136);
    const fixed = layoutElement(24, 500);
    fixed.dataset.cameraLayoutOwner = "fixed";
    fixed.setAttribute("aria-hidden", "true");
    let stageLeft = 1_000;
    const stage = appendStage(workspace, "overview", stageLeft, 300);
    stage.getBoundingClientRect = () => domRect(stageLeft - workspace.scrollLeft, 300);
    viewport.append(fixed, workspace);
    document.body.append(viewport);
    const view = renderHook(() => useStageCamera({ current: viewport }, { current: workspace }, "role"));
    scrollTo.mockClear();

    act(() => {
      Object.defineProperty(workspace, "clientWidth", { configurable: true, value: 900 });
      workspace.getBoundingClientRect = () => domRect(676, 900);
      stageLeft = 1_450;
      fixed.removeAttribute("aria-hidden");
    });

    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ left: 198, behavior: "smooth" }));
    expect(workspace.style.getPropertyValue("--lag-wide-stage-max")).toBe("852px");
    view.unmount();
    viewport.remove();
  });

  it("passes wide center and nearest intent through the hook", () => {
    const { owner: viewport } = cameraOwner(1_600, 1_600);
    const { owner: workspace, scrollTo } = cameraOwner(1_000, 2_000, 500);
    viewport.append(workspace);
    document.body.append(viewport);
    appendStage(workspace, "detail", 1_000, 200);
    const view = renderHook(() => useStageCamera({ current: viewport }, { current: workspace }, "player"));
    scrollTo.mockClear();

    act(() => requestStageFocus("detail", "center"));
    expect(scrollTo).toHaveBeenCalledWith({ left: 100, behavior: "smooth" });

    workspace.scrollLeft = 0;
    scrollTo.mockClear();
    act(() => requestStageFocus("detail", "nearest"));
    expect(scrollTo).not.toHaveBeenCalled();
    view.unmount();
    viewport.remove();
  });

  it("recomposes wide bounds after a relevant measured-size change", () => {
    let resizeCallback: ResizeObserverCallback = () => {};
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const { owner: viewport } = cameraOwner(1_600, 1_600);
    const { owner: workspace, scrollTo } = cameraOwner(900, 2_000, 676);
    viewport.append(workspace);
    document.body.append(viewport);
    let detailLeft = 1_100;
    const detail = appendStage(workspace, "detail", detailLeft, 300);
    detail.getBoundingClientRect = () => domRect(detailLeft - workspace.scrollLeft, 300);
    const view = renderHook(() => useStageCamera({ current: viewport }, { current: workspace }, "player"));
    scrollTo.mockClear();

    detailLeft = 1_450;
    act(() => resizeCallback([], {} as ResizeObserver));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 198, behavior: "smooth" });
    view.unmount();
    viewport.remove();
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

  it("keeps a same-context request through unrelated mutations until its stage mounts", async () => {
    const { owner, scrollTo } = cameraOwner();
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));

    act(() => requestStageFocus("late-detail", "forward"));
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => owner.append(document.createElement("span")));
    await act(async () => { await Promise.resolve(); });
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => appendStage(owner, "late-detail", 600));

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo).toHaveBeenCalledWith({ left: 548, behavior: "smooth" });
  });

  it("allows a later valid topology focus while a pending target is unresolved", async () => {
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "root", 100);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => requestStageFocus("missing-detail", "forward"));
    act(() => appendStage(owner, "actual-detail", 600));

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo).toHaveBeenCalledWith({ left: 548, behavior: "smooth" });
  });

  it("does not let an unresolved target steal focus after a newer topology takes ownership", async () => {
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "root", 100);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => requestStageFocus("stale-detail", "forward"));
    act(() => appendStage(owner, "actual-detail", 600));
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo).toHaveBeenCalledWith({ left: 548, behavior: "smooth" });
    scrollTo.mockClear();

    act(() => appendStage(owner, "stale-detail", 900));
    await act(async () => { await Promise.resolve(); });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("lets a newer explicit request supersede an older unresolved target", async () => {
    const { owner, scrollTo } = cameraOwner();
    appendStage(owner, "root", 100);
    const ref = { current: owner };
    renderHook(() => useStageCamera(ref, ref, "player"));
    scrollTo.mockClear();

    act(() => {
      requestStageFocus("old-detail", "forward");
      requestStageFocus("new-detail", "forward");
      appendStage(owner, "old-detail", 600);
    });
    await act(async () => { await Promise.resolve(); });
    expect(scrollTo).not.toHaveBeenCalled();

    act(() => appendStage(owner, "new-detail", 900));

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo).toHaveBeenCalledWith({ left: 800, behavior: "smooth" });
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

  it("recomposes the complete wide composition after a same-profile viewport resize", async () => {
    const { owner: viewport } = cameraOwner(1_600, 1_600);
    const { owner: workspace, scrollTo } = cameraOwner(900, 2_000, 400);
    viewport.append(workspace);
    document.body.append(viewport);
    let detailLeft = 1_100;
    const detail = appendStage(workspace, "detail", detailLeft, 300);
    detail.getBoundingClientRect = () => domRect(detailLeft - workspace.scrollLeft, 300);
    const viewportRef = { current: viewport };
    const workspaceRef = { current: workspace };
    const view = renderHook(() => useStageCamera(viewportRef, workspaceRef, "player"));
    scrollTo.mockClear();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1_300 });
    Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 1_300 });
    detailLeft = 1_500;
    act(() => window.dispatchEvent(new Event("resize")));

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo).toHaveBeenCalledWith({ left: 608, behavior: "smooth" });
    view.unmount();
    viewport.remove();
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
    expect(workspaceScroll).toHaveBeenCalledWith({ left: 524, behavior: "smooth" });
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
