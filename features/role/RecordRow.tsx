"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";

export function SwipeButton({ onSwipeLeft, onSwipeRight, onClick, onKeyDown, style, children, restingOffset = 0, creation = false, ...props }: ComponentProps<"button"> & { onSwipeLeft?: () => void; onSwipeRight?: () => void; restingOffset?: number; creation?: boolean }) {
  const hintId = useId();
  const start = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null; dx: number } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState<number | null>(null);
  const reset = () => { start.current = null; setOffset(null); };
  return <>{creation && onSwipeLeft ? <span id={hintId} className="sr-only">클릭하면 목록. 왼쪽으로 80픽셀 이상 당긴 후 놓거나 Alt+Enter로 등록.</span> : null}<button {...props} type="button" draggable={false} data-drag-scroll-allow
    aria-keyshortcuts={creation && onSwipeLeft ? "Alt+Enter" : undefined}
    aria-describedby={creation && onSwipeLeft ? hintId : undefined}
    style={{ ...style, touchAction: "pan-y", transform: `translateX(${offset ?? restingOffset}px)`, transition: offset === null ? "transform var(--lag-motion-normal) ease-out" : "none" }}
    onKeyDown={(event) => { if (creation && onSwipeLeft && event.altKey && event.key === "Enter") { event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); onSwipeLeft(); } else onKeyDown?.(event); }}
    onPointerDown={(event) => {
      if (!event.isPrimary || event.button !== 0 || props.disabled) return;
      suppressClick.current = false;
      event.currentTarget.focus({ preventScroll: true });
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null, dx: 0 };
    }}
    onPointerMove={(event) => {
      const point = start.current;
      if (!point || point.id !== event.pointerId) return;
      const dx = event.clientX - point.x, dy = event.clientY - point.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 10) suppressClick.current = true;
      if (!point.axis) {
        if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) point.axis = "y";
        else if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2 && (dx < 0 ? onSwipeLeft : onSwipeRight)) { point.axis = "x"; event.currentTarget.setPointerCapture?.(event.pointerId); }
      }
      if (point.axis === "x") {
        point.dx = dx;
        setOffset(Math.max(-160, Math.min(0, restingOffset + dx)));
        event.preventDefault(); event.stopPropagation();
      }
    }}
    onPointerUp={(event) => {
      const point = start.current;
      if (!point || point.id !== event.pointerId) return;
      const dx = point.axis === "x" ? point.dx : 0;
      reset();
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (dx <= -80) onSwipeLeft?.(); else if (dx >= 40) onSwipeRight?.();
    }}
    onPointerCancel={() => { suppressClick.current = true; reset(); }} onLostPointerCapture={(event) => { if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) reset(); }}
    onClick={(event) => {
      if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; event.preventDefault(); return; }
      event.currentTarget.focus({ preventScroll: true }); onClick?.(event);
    }}
  >{children}</button></>;
}

export function RecordRow({ title, subtitle, selected, disabled, onSelect, onEdit, onArchive, archiveLabel = "보관" }: {
  title: string; subtitle?: string; selected?: boolean; disabled?: boolean; archiveLabel?: string;
  onSelect: () => void; onEdit: () => void; onArchive: () => void;
}) {
  const [actions, setActions] = useState(false);
  const root = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null);
  const announce = () => root.current?.dispatchEvent(new Event("sao-row-open", { bubbles: true }));
  const close = () => { setActions(false); requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true })); };
  useEffect(() => {
    const scope = root.current?.closest(".lag-panel-body, .lag-role-node-list") ?? root.current?.parentElement;
    const closeOther = (event: Event) => { if (event.target !== root.current) setActions(false); };
    scope?.addEventListener("sao-row-open", closeOther);
    return () => scope?.removeEventListener("sao-row-open", closeOther);
  }, []);
  return <div ref={root} className="lag-role-record-row" data-actions-open={actions} onKeyDown={(event) => { if (event.key === "Escape" && actions) { event.stopPropagation(); close(); } }}>
    <div className="lag-row-action-area" role="group" aria-label={`${title} 작업 선택`} aria-hidden={!actions} inert={!actions}>
      <button type="button" disabled={disabled} onClick={onEdit}><span aria-hidden>✎</span>수정</button>
      <button type="button" disabled={disabled} onClick={onArchive}><span aria-hidden>{archiveLabel === "보관" ? "▣" : "×"}</span>{archiveLabel}</button>
    </div>
    <SwipeButton className="lag-role-node lag-record-body" aria-pressed={Boolean(selected)} data-selected={Boolean(selected)} restingOffset={actions ? -144 : 0} onClick={() => { announce(); setActions(false); onSelect(); }} onSwipeLeft={() => { announce(); setActions(true); }} onSwipeRight={close}>
      <span className="lag-role-node-mark" aria-hidden>{title.charAt(0)}</span>
      <span><strong>{title}</strong>{subtitle ? <small>{subtitle}</small> : null}</span><span aria-hidden>→</span>
    </SwipeButton>
    <button ref={toggle} type="button" className="lag-row-action-toggle" style={{ transform: actions ? "translateX(-144px)" : undefined }} aria-label={`${title} 작업`} aria-expanded={actions} onClick={() => { announce(); setActions(!actions); }}>⋯</button>
  </div>;
}
