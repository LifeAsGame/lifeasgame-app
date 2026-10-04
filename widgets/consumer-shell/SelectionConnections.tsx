"use client";

import { useEffect, useRef } from "react";

type Connection = { source: Element; target: Element; id: string };

export function visibleConnections(root: Element): Connection[] {
  const stages = [...root.querySelectorAll<HTMLElement>(".lag-workspace [data-stage-key]:not([aria-hidden='true']):not([data-inactive='true'])")]
    .filter((stage) => stage.querySelector(".lag-panel-frame") && !stage.closest("[inert], [aria-hidden='true']"));
  const byKey = new Map(stages.map((stage) => [stage.dataset.stageKey, stage]));
  const main = root.querySelector('[data-menu-id][aria-pressed="true"] .lag-orb-icon');
  return stages.flatMap((stage, index) => {
    const parent = stage.dataset.parentStageKey
      ? byKey.get(stage.dataset.parentStageKey)
      : index ? stages[index - 1] : null;
    const source = parent?.querySelector('[aria-pressed="true"], [data-selected="true"]') ?? (index === 0 ? main : null);
    const target = stage.querySelector(".lag-panel-frame");
    return source && target ? [{ source, target, id: `${parent?.dataset.stageKey ?? "main"}-${stage.dataset.stageKey}` }] : [];
  });
}

export default function SelectionConnections({ active }: { active: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const surface = svg.current;
    const root = surface?.parentElement;
    if (!surface || !root) return;
    let frame = 0;
    let trackingUntil = 0;
    let previous = "";
    const paint = () => {
      frame = 0;
      const origin = surface.getBoundingClientRect();
      const paths = active && window.innerWidth >= 900 ? visibleConnections(root).flatMap(({ source, target, id }) => {
        const from = source.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const body = source.closest("[data-stage-key]")?.querySelector(".lag-panel-body")?.getBoundingClientRect();
        const center = from.top + from.height / 2;
        if (body && (center < body.top || center > body.bottom)) return [];
        const rightward = to.left >= from.right;
        const leftward = to.right <= from.left;
        if (!rightward && !leftward) return [];
        const fromX = (rightward ? from.right : from.left) - origin.left;
        const toX = (rightward ? to.left : to.right) - origin.left;
        const fromY = center - origin.top;
        const toY = Math.max(to.top + 18, Math.min(to.bottom - 18, center)) - origin.top;
        const bend = rightward ? toX - 16 : toX + 16;
        if (rightward && bend <= fromX || leftward && bend >= fromX) return [];
        return [`<path data-connection="${id}" d="M${fromX},${fromY} H${bend} V${toY} H${toX}" fill="none" stroke="var(--lag-gold)" stroke-width="1.5"/>`];
      }) : [];
      const markup = paths.join("");
      if (previous !== markup) { surface.innerHTML = markup; previous = markup; }
      if (performance.now() < trackingUntil) frame = requestAnimationFrame(paint);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const track = () => { trackingUntil = performance.now() + 420; schedule(); };
    const observer = new MutationObserver(track);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed", "aria-hidden", "data-selected", "data-inactive"] });
    const resize = new ResizeObserver(track);
    resize.observe(root);
    root.addEventListener("scroll", track, true);
    window.addEventListener("resize", track);
    track();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect(); resize.disconnect();
      root.removeEventListener("scroll", track, true);
      window.removeEventListener("resize", track);
    };
  }, [active]);
  return <svg ref={svg} className="sao-selection-connections" aria-hidden="true" />;
}
