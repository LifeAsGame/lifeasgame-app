"use client";

import { useEffect, useRef, useState } from "react";

type StageFocusPlan = { key: string; align: "center" | "nearest" } | null;
type StageFocusDetail = NonNullable<StageFocusPlan>;
export type CameraProfile = "wide" | "compact" | "mobile";

export const STAGE_FOCUS_EVENT = "lag:stage-focus";
let pendingFocus: StageFocusDetail | null = null;

export function requestStageFocus(key: string, align: StageFocusDetail["align"] = "nearest") {
  if (typeof window === "undefined") return;
  pendingFocus = { key, align };
  window.dispatchEvent(new CustomEvent<StageFocusDetail>(STAGE_FOCUS_EVENT, { detail: pendingFocus }));
}

export function pendingStageFocus(): StageFocusDetail | null {
  return pendingFocus;
}

export function stageFocusPlan(previous: string[], next: string[]): StageFocusPlan {
  const previousSet = new Set(previous);
  const added = next.filter((key) => !previousSet.has(key));
  if (added.length > 0) {
    return { key: added.at(-1)!, align: next.length === previous.length ? "center" : "nearest" };
  }
  if (previous.at(-1) && !next.includes(previous.at(-1)!) && next.at(-1)) {
    return { key: next.at(-1)!, align: "center" };
  }
  return null;
}

export function focusStage(
  owner: HTMLElement,
  target: HTMLElement,
  align: "center" | "nearest",
  reducedMotion: boolean,
  insets = cameraInsets(owner, "wide"),
  profile: CameraProfile = "wide",
) {
  const ownerRect = owner.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetLeft = owner.scrollLeft + targetRect.left - ownerRect.left;
  let left = owner.scrollLeft;

  if (align === "center") {
    left = targetLeft + targetRect.width / 2 - owner.clientWidth / 2;
  } else if (profile !== "wide") {
    left = targetLeft - insets.leading;
  } else if (targetLeft < owner.scrollLeft + insets.leading) {
    left = targetLeft - insets.leading;
  } else if (targetLeft + targetRect.width > owner.scrollLeft + owner.clientWidth - insets.trailing) {
    left = targetLeft + targetRect.width - owner.clientWidth + insets.trailing;
  }

  owner.scrollTo({
    left: Math.max(0, Math.min(left, Math.max(0, owner.scrollWidth - owner.clientWidth))),
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
    return { leading: Math.max(cssLeading, 64), trailing: Math.max(cssTrailing, 24) };
  }
  if (profile === "compact") {
    return {
      leading: Math.max(cssLeading, Math.min(128, Math.max(72, owner.clientWidth * 0.16))),
      trailing: Math.max(cssTrailing, 32),
    };
  }
  return {
    leading: Math.max(cssLeading, 32),
    trailing: Math.max(cssTrailing, Math.min(160, Math.max(48, owner.clientWidth * 0.12))),
  };
}

function stages(owner: HTMLElement) {
  return [...owner.querySelectorAll<HTMLElement>("[data-stage-key]")];
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useStageCamera(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  workspaceRef: React.RefObject<HTMLDivElement | null>,
  mainSelectionKey: string,
) {
  const [profile, setProfile] = useState<CameraProfile>(() =>
    cameraProfileForWidth(typeof window === "undefined" ? 1200 : window.innerWidth),
  );
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const lastFocusedStage = useRef<string | null>(null);

  useEffect(() => {
    const update = () => setProfile(cameraProfileForWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const owner = profile === "mobile" ? viewportRef.current : workspaceRef.current;
    if (!owner) return;
    let previous = stages(owner).map((stage) => stage.dataset.stageKey!);
    let frame = 0;
    const focus = (detail: StageFocusDetail) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = stages(owner).find((stage) => stage.dataset.stageKey === detail.key);
        if (!target) return;
        focusStage(owner, target, detail.align, prefersReducedMotion(), cameraInsets(owner, profile), profile);
        lastFocusedStage.current = detail.key;
        if (pendingFocus?.key === detail.key) pendingFocus = null;
      });
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextStages = stages(owner);
        if (pendingFocus) {
          const target = nextStages.find((stage) => stage.dataset.stageKey === pendingFocus?.key);
          if (target) {
            const detail = pendingFocus;
            focusStage(owner, target, detail.align, prefersReducedMotion(), cameraInsets(owner, profile), profile);
            lastFocusedStage.current = detail.key;
            if (pendingFocus?.key === detail.key) pendingFocus = null;
          }
          previous = nextStages.map((stage) => stage.dataset.stageKey!);
          return;
        }
        const plan = stageFocusPlan(previous, nextStages.map((stage) => stage.dataset.stageKey!));
        previous = nextStages.map((stage) => stage.dataset.stageKey!);
        const target = plan && nextStages.find((stage) => stage.dataset.stageKey === plan.key);
        if (plan && target) {
          focusStage(owner, target, plan.align, prefersReducedMotion(), cameraInsets(owner, profile), profile);
          lastFocusedStage.current = plan.key;
        }
      });
    });
    const focusRequested = (event: Event) => {
      focus((event as CustomEvent<StageFocusDetail>).detail);
    };
    observer.observe(owner, { childList: true, subtree: true });
    window.addEventListener(STAGE_FOCUS_EVENT, focusRequested);
    if (pendingFocus) focus(pendingFocus);
    else if (lastFocusedStage.current) focus({ key: lastFocusedStage.current, align: "nearest" });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener(STAGE_FOCUS_EVENT, focusRequested);
    };
  }, [profile, viewportRef, workspaceRef]);

  useEffect(() => {
    const currentProfile = profileRef.current;
    const owner = currentProfile === "mobile" ? viewportRef.current : workspaceRef.current;
    const target = owner && stages(owner)[0];
    if (!owner || !target || pendingFocus) return;
    const frame = requestAnimationFrame(() => {
      focusStage(owner, target, currentProfile === "wide" ? "center" : "nearest", prefersReducedMotion(), cameraInsets(owner, currentProfile), currentProfile);
      lastFocusedStage.current = target.dataset.stageKey ?? null;
    });
    return () => cancelAnimationFrame(frame);
  }, [mainSelectionKey, viewportRef, workspaceRef]);
}
