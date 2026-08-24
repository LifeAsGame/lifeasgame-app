"use client";

import { useEffect, useRef, useState } from "react";

export type CameraProfile = "wide" | "compact" | "mobile";
export type CameraFocusIntent = "forward" | "back" | "center" | "nearest";
type StageFocusPlan = { key: string; align: CameraFocusIntent } | null;
type StageFocusDetail = NonNullable<StageFocusPlan>;

export const STAGE_FOCUS_EVENT = "lag:stage-focus";

export function requestStageFocus(key: string, align: CameraFocusIntent = "nearest") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StageFocusDetail>(STAGE_FOCUS_EVENT, { detail: { key, align } }));
}

export function stageFocusPlan(previous: string[], next: string[]): StageFocusPlan {
  const previousSet = new Set(previous);
  const added = next.filter((key) => !previousSet.has(key));
  if (added.length > 0) return { key: added.at(-1)!, align: "forward" };
  if (previous.at(-1) && !next.includes(previous.at(-1)!) && next.at(-1)) {
    return { key: next.at(-1)!, align: "back" };
  }
  return null;
}

export function cameraScrollTarget({
  scrollLeft,
  scrollWidth,
  clientWidth,
  targetLeft,
  targetWidth,
  profile,
  align,
  insets,
}: {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  targetLeft: number;
  targetWidth: number;
  profile: CameraProfile;
  align: CameraFocusIntent;
  insets: { leading: number; trailing: number };
}) {
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  const clamp = (value: number) => Math.max(0, Math.min(value, maxScroll));
  if (align === "center") return clamp(targetLeft + targetWidth / 2 - clientWidth / 2);

  const visibleLeft = scrollLeft + insets.leading;
  const visibleRight = scrollLeft + clientWidth - insets.trailing;
  if (align === "nearest" && targetLeft >= visibleLeft && targetLeft + targetWidth <= visibleRight) {
    return clamp(scrollLeft);
  }

  const usableWidth = Math.max(0, clientWidth - insets.leading - insets.trailing);
  const targetViewportLeft = targetWidth > usableWidth
    ? Math.max(0, clientWidth - targetWidth) / 2
    : profile === "wide"
      ? Math.max(insets.leading, clientWidth - insets.trailing - targetWidth)
      : insets.leading;
  return clamp(targetLeft - targetViewportLeft);
}

export function focusStage(
  owner: HTMLElement,
  target: HTMLElement,
  align: CameraFocusIntent,
  reducedMotion: boolean,
  insets = cameraInsets(owner, "wide"),
  profile: CameraProfile = "wide",
) {
  const ownerRect = owner.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetLeft = owner.scrollLeft + targetRect.left - ownerRect.left;
  owner.scrollTo({
    left: cameraScrollTarget({
      scrollLeft: owner.scrollLeft,
      scrollWidth: owner.scrollWidth,
      clientWidth: owner.clientWidth,
      targetLeft,
      targetWidth: targetRect.width,
      profile,
      align,
      insets,
    }),
    behavior: reducedMotion ? "auto" : "smooth",
  });
}

export function cameraProfileForWidth(width: number): CameraProfile {
  if (width < 768) return "mobile";
  if (width < 1200) return "compact";
  return "wide";
}

export function cameraInsets(owner: HTMLElement, profile: CameraProfile) {
  const style = getComputedStyle(owner);
  const cssLeading = Number.parseFloat(style.scrollPaddingLeft) || 24;
  const cssTrailing = Number.parseFloat(style.scrollPaddingRight) || 24;
  if (profile === "mobile") {
    return { leading: Math.max(cssLeading, 16), trailing: Math.max(cssTrailing, 16) };
  }
  if (profile === "compact") {
    return {
      leading: Math.max(cssLeading, Math.min(112, Math.max(48, owner.clientWidth * 0.12))),
      trailing: Math.max(cssTrailing, 32),
    };
  }
  return {
    leading: Math.max(cssLeading, 32),
    trailing: Math.max(cssTrailing, Math.min(160, Math.max(48, owner.clientWidth * 0.12))),
  };
}

function stages(owner: HTMLElement, invalidated: Set<string>) {
  return [...owner.querySelectorAll<HTMLElement>("[data-stage-key]")]
    .filter((stage) => stage.getAttribute("aria-hidden") !== "true" && !invalidated.has(stage.dataset.stageKey!));
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type ScopedFocus = StageFocusDetail & { context: string; id: number; awaitingMount: boolean };

export function useStageCamera(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  workspaceRef: React.RefObject<HTMLDivElement | null>,
  mainSelectionKey: string,
) {
  const [profile, setProfile] = useState<CameraProfile>(() =>
    cameraProfileForWidth(typeof window === "undefined" ? 1200 : window.innerWidth),
  );
  const [viewportRevision, setViewportRevision] = useState(0);
  const contextRef = useRef(mainSelectionKey);
  const pendingFocus = useRef<ScopedFocus | null>(null);
  const invalidatedKeys = useRef(new Set<string>());
  const lastFocusedStage = useRef<{ context: string; key: string } | null>(null);
  const focusId = useRef(0);

  if (contextRef.current !== mainSelectionKey) {
    invalidatedKeys.current.clear();
    if (pendingFocus.current) invalidatedKeys.current.add(pendingFocus.current.key);
    pendingFocus.current = null;
    lastFocusedStage.current = null;
    contextRef.current = mainSelectionKey;
  }

  useEffect(() => {
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setProfile(cameraProfileForWidth(window.innerWidth));
        setViewportRevision((value) => value + 1);
      });
    };
    setProfile(cameraProfileForWidth(window.innerWidth));
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const context = mainSelectionKey;
    const owner = profile === "mobile" ? viewportRef.current : workspaceRef.current;
    if (!owner) return;
    const inactiveOwner = profile === "mobile" ? workspaceRef.current : viewportRef.current;
    if (inactiveOwner && inactiveOwner !== owner && inactiveOwner.scrollLeft !== 0) {
      inactiveOwner.scrollTo({ left: 0, behavior: "auto" });
    }
    let previous = stages(owner, invalidatedKeys.current).map((stage) => stage.dataset.stageKey!);
    let frame = 0;
    let scheduledFocus = 0;

    const focus = (detail: StageFocusDetail, pendingId?: number) => {
      const scheduled = ++scheduledFocus;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (scheduled !== scheduledFocus || contextRef.current !== context) return;
        const target = stages(owner, invalidatedKeys.current).find((stage) => stage.dataset.stageKey === detail.key);
        if (!target) return;
        focusStage(owner, target, detail.align, prefersReducedMotion(), cameraInsets(owner, profile), profile);
        lastFocusedStage.current = { context, key: detail.key };
        if (pendingId && pendingFocus.current?.id === pendingId) pendingFocus.current = null;
      });
    };

    const observer = new MutationObserver(() => {
      if (contextRef.current !== context) return;
      const nextStages = stages(owner, invalidatedKeys.current);
      const next = nextStages.map((stage) => stage.dataset.stageKey!);
      const pending = pendingFocus.current?.context === context ? pendingFocus.current : null;
      const pendingTarget = pending && nextStages.find((stage) => stage.dataset.stageKey === pending.key);
      if (pendingTarget) {
        previous = next;
        focus(pending, pending.id);
        return;
      }
      const plan = stageFocusPlan(previous, next);
      previous = next;
      const target = plan && nextStages.find((stage) => stage.dataset.stageKey === plan.key);
      if (!plan || !target || lastFocusedStage.current?.context === context && lastFocusedStage.current.key === plan.key) return;
      if (plan.align === "forward" && target.dataset.stageAutoFocus === "false") return;
      if (pending) {
        invalidatedKeys.current.add(pending.key);
        pendingFocus.current = null;
      }
      focus(plan);
    });

    const focusRequested = (event: Event) => {
      if (contextRef.current !== context) return;
      const detail = (event as CustomEvent<StageFocusDetail>).detail;
      const previousPending = pendingFocus.current?.context === context ? pendingFocus.current : null;
      if (previousPending?.awaitingMount && previousPending.key !== detail.key) {
        invalidatedKeys.current.add(previousPending.key);
      }
      invalidatedKeys.current.delete(detail.key);
      const targetInOwner = stages(owner, invalidatedKeys.current).some((stage) => stage.dataset.stageKey === detail.key);
      const targetOutsideOwner = !targetInOwner && [...document.querySelectorAll<HTMLElement>("[data-stage-key]")]
        .some((stage) => stage.getAttribute("aria-hidden") !== "true" && stage.dataset.stageKey === detail.key);
      if (targetOutsideOwner) {
        pendingFocus.current = null;
        return;
      }
      const pending = { ...detail, context, id: ++focusId.current, awaitingMount: !targetInOwner };
      pendingFocus.current = pending;
      focus(pending, pending.id);
    };

    observer.observe(owner, { childList: true, subtree: true });
    window.addEventListener(STAGE_FOCUS_EVENT, focusRequested);

    const currentPending = pendingFocus.current?.context === context ? pendingFocus.current : null;
    const currentStages = stages(owner, invalidatedKeys.current);
    const pendingTarget = currentPending && currentStages.find((stage) => stage.dataset.stageKey === currentPending.key);
    if (currentPending && pendingTarget) focus(currentPending, currentPending.id);
    else {
      const active = lastFocusedStage.current?.context === context
        ? currentStages.find((stage) => stage.dataset.stageKey === lastFocusedStage.current?.key)
        : null;
      const fallback = active ?? currentStages.at(-1);
      if (fallback) focus({ key: fallback.dataset.stageKey!, align: "forward" });
    }

    return () => {
      scheduledFocus += 1;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener(STAGE_FOCUS_EVENT, focusRequested);
    };
  }, [mainSelectionKey, profile, viewportRef, viewportRevision, workspaceRef]);
}
