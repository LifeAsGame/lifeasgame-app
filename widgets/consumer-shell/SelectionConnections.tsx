"use client";

import { useEffect, useRef } from "react";

/** Measure rendered bounds, including spring transforms and scroll clipping. */
export default function SelectionConnections({ active }: { active: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const surface = svg.current;
    const root = surface?.parentElement;
    if (!surface || !root) return;
    const paths = [...surface.querySelectorAll("path")];
    const write = (values: string[]) => paths.forEach((path, index) => {
      const value = values[index] ?? "";
      if (path.getAttribute("d") !== value) path.setAttribute("d", value);
    });
    if (!active) { write([]); return; }
    let frame = 0;
    const paint = () => {
      const source = root.querySelector('[data-menu-id][aria-pressed="true"] .lag-orb-icon');
      const target = root.querySelector(':is([data-stage-key="journey-list"], [data-stage-key="lifelog-journal"]):not([aria-hidden="true"]) .lag-panel-frame') ?? root.querySelector('.lag-workspace [data-stage-key]:not([aria-hidden="true"]) .lag-panel-frame');
      const detail = root.querySelector(':is([data-stage-key="journey-detail"], [data-stage-key="lifelog-journal-detail"], [data-stage-key="lifelog-quick-record"]):not([aria-hidden="true"]) .lag-panel-frame');
      if (source && target && window.innerWidth >= 900) {
        const origin = surface.getBoundingClientRect(), a = source.getBoundingClientRect(), b = target.getBoundingClientRect();
        const body = target.querySelector('.lag-panel-body')?.getBoundingClientRect() ?? b;
        const row = target.querySelector('[aria-pressed="true"], [data-selected="true"]') ?? target.querySelector('.lag-journey-card');
        const rowBounds = row?.getBoundingClientRect();
        const x = b.left - origin.left, y = a.top + a.height / 2 - origin.top;
        const rowY = Math.max(body.top + 9, Math.min(body.bottom - 9, rowBounds ? rowBounds.top + rowBounds.height / 2 : a.top + a.height / 2)) - origin.top;
        const values = b.left >= a.right ? [
          `M${a.right - origin.left + 7},${y} H${x - 16} V${rowY} H${x}`,
          `M${x - 9},${rowY} L${x},${rowY - 6} V${rowY + 6} Z`,
        ] : [];
        if (detail) {
          const d = detail.getBoundingClientRect();
          const dx = d.right - origin.left;
          const dy = Math.max(d.top + 25, Math.min(d.bottom - 25, a.top + a.height / 2)) - origin.top;
          if (d.right <= a.left) {
            values[2] = `M${a.left - origin.left - 7},${y} H${dx + 18} V${dy} H${dx}`;
            values[3] = `M${dx},${dy - 7} L${dx + 11},${dy} L${dx},${dy + 7} Z`;
          }
        }
        write(values);
      } else write([]);
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return <svg ref={svg} className="sao-selection-connections" aria-hidden="true">
    <path data-connection="list" fill="none" stroke="var(--lag-gold)" strokeWidth="1.5" />
    <path data-connection="list-contact" fill="var(--lag-gold)" />
    <path data-connection="detail" fill="none" stroke="var(--lag-gold)" strokeWidth="1.5" />
    <path data-connection="detail-contact" fill="var(--lag-gold)" />
  </svg>;
}
