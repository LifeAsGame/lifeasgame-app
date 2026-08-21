"use client";

import { useEffect, useState } from "react";

type StageFocusPlan = { key: string; align: "center" | "nearest" } | null;

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
) {
  const ownerRect = owner.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetLeft = owner.scrollLeft + targetRect.left - ownerRect.left;
  const safe = 24;
  let left = owner.scrollLeft;

  if (align === "center") {
    left = targetLeft + targetRect.width / 2 - owner.clientWidth / 2;
  } else if (targetLeft < owner.scrollLeft + safe) {
    left = targetLeft - safe;
  } else if (targetLeft + targetRect.width > owner.scrollLeft + owner.clientWidth - safe) {
    left = targetLeft + targetRect.width - owner.clientWidth + safe;
  }

  owner.scrollTo({
    left: Math.max(0, Math.min(left, Math.max(0, owner.scrollWidth - owner.clientWidth))),
    behavior: reducedMotion ? "auto" : "smooth",
  });
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
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const owner = mobile ? viewportRef.current : workspaceRef.current;
    if (!owner) return;
    let previous = stages(owner).map((stage) => stage.dataset.stageKey!);
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextStages = stages(owner);
        const plan = stageFocusPlan(previous, nextStages.map((stage) => stage.dataset.stageKey!));
        previous = nextStages.map((stage) => stage.dataset.stageKey!);
        const target = plan && nextStages.find((stage) => stage.dataset.stageKey === plan.key);
        if (plan && target) focusStage(owner, target, plan.align, prefersReducedMotion());
      });
    });
    observer.observe(owner, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [mobile, viewportRef, workspaceRef]);

  useEffect(() => {
    const owner = mobile ? viewportRef.current : workspaceRef.current;
    const target = owner && stages(owner)[0];
    if (!owner || !target) return;
    const frame = requestAnimationFrame(() => focusStage(owner, target, "center", prefersReducedMotion()));
    return () => cancelAnimationFrame(frame);
  }, [mainSelectionKey, mobile, viewportRef, workspaceRef]);
}
