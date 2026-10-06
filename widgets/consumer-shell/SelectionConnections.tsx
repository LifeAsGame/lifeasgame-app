"use client";

import { useEffect, useRef } from "react";

type Connection = { source: Element; sourcePanel: Element | null; target: Element; id: string };

export function visibleConnections(root: Element): Connection[] {
  const stages = [...root.querySelectorAll<HTMLElement>(".lag-workspace [data-stage-key]:not([aria-hidden='true']):not([data-inactive='true'])")]
    .filter((stage) => stage.querySelector(".lag-panel-frame") && !stage.closest("[inert], [aria-hidden='true']"));
  const byKey = new Map(stages.map((stage) => [stage.dataset.stageKey, stage]));
  const main = root.querySelector('[data-menu-id][aria-pressed="true"] .lag-orb-icon');
  return stages.flatMap((stage) => {
    const parent = stage.dataset.parentStageKey ? byKey.get(stage.dataset.parentStageKey) : null;
    const sourcePanel = parent?.querySelector(".lag-panel-frame") ?? null;
    const source = parent?.querySelector('.lag-panel-frame .lag-role-node[data-selected="true"]')
      ?? parent?.querySelector('.lag-panel-frame [aria-pressed="true"], .lag-panel-frame [data-selected="true"]')
      ?? (stage.dataset.parentStageKey === "main" ? main : null);
    const target = stage.querySelector(".lag-panel-frame");
    return source && target && (sourcePanel || stage.dataset.parentStageKey === "main") ? [{ source, sourcePanel, target, id: `${parent?.dataset.stageKey ?? "main"}-${stage.dataset.stageKey}` }] : [];
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
      const paths = active && window.innerWidth >= 900 ? visibleConnections(root).flatMap(({ source, sourcePanel, target, id }) => {
        const from = source.getBoundingClientRect();
        const panel = sourcePanel?.getBoundingClientRect() ?? from;
        const to = target.getBoundingClientRect();
        const body = source.closest("[data-stage-key]")?.querySelector(".lag-panel-body")?.getBoundingClientRect();
        const targetBody = target.querySelector(".lag-panel-body")?.getBoundingClientRect();
        const center = from.top + from.height / 2;
        if (body && (center < body.top || center > body.bottom)) return [];
        if (!panel.width || !panel.height || !to.width || !to.height) return [];
        const sourceStage = source.closest("[data-stage-key]");
        const targetStage = target.closest("[data-stage-key]");
        if ([sourceStage, targetStage].some((stage) => stage && Number(getComputedStyle(stage).opacity) < 0.05)) return [];
        const rightward = to.left >= panel.right;
        const leftward = to.right <= panel.left;
        if (!rightward && !leftward) return [];
        const fromX = (rightward ? panel.right : panel.left) - origin.left;
        const toX = (rightward ? to.left : to.right) - origin.left;
        const fromY = center - origin.top;
        const toY = Math.max((targetBody?.top ?? to.top + 18), Math.min((targetBody?.bottom ?? to.bottom - 18), center)) - origin.top;
        const bend = (fromX + toX) / 2;
        return [`<path data-connection="${id}" d="M${fromX},${fromY} H${bend} V${toY} H${toX}" fill="none" stroke="var(--lag-gold)" stroke-width="1.5"/>`];
      }) : [];
      const markup = paths.join("");
      if (previous !== markup) { surface.innerHTML = markup; previous = markup; }
      if (performance.now() < trackingUntil) frame = requestAnimationFrame(paint);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const track = () => { trackingUntil = performance.now() + 420; schedule(); };
    const observer = new MutationObserver((changes) => {
      if (changes.some(({ target }) => target !== surface && !surface.contains(target))) track();
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed", "aria-hidden", "data-selected", "data-inactive", "style", "class", "inert"] });
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
