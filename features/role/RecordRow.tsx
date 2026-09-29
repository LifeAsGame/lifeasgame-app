"use client";

import { useRef, useState, type ComponentProps } from "react";

// The existing PanelCard swipe invokes delete directly. These records only reveal choices.
export function SwipeButton({ onSwipeLeft, onClick, style, children, ...props }: ComponentProps<"button"> & { onSwipeLeft: () => void }) {
  const start = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null; dx: number } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  const reset = () => { start.current = null; setOffset(0); };
  return <button {...props} type="button" draggable={false} data-drag-scroll-allow
    style={{ ...style, touchAction: "pan-y", transform: `translateX(${offset}px)` }}
    onPointerDown={(event) => {
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick.current = false;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null, dx: 0 };
    }}
    onPointerMove={(event) => {
      const point = start.current;
      if (!point || point.id !== event.pointerId) return;
      const dx = event.clientX - point.x, dy = event.clientY - point.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 10) suppressClick.current = true;
      if (!point.axis) {
        if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) point.axis = "y";
        else if (dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.2) { point.axis = "x"; event.currentTarget.setPointerCapture?.(event.pointerId); }
      }
      if (point.axis === "x") {
        point.dx = dx;
        setOffset(Math.max(-100, Math.min(0, dx)));
        event.preventDefault();
        event.stopPropagation();
      }
    }}
    onPointerUp={(event) => {
      const point = start.current;
      if (!point || point.id !== event.pointerId) return;
      const reveal = point.axis === "x" && point.dx <= -80;
      reset();
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (reveal) onSwipeLeft();
    }}
    onPointerCancel={() => { suppressClick.current = true; reset(); }}
    onLostPointerCapture={reset}
    onClick={(event) => {
      if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; event.preventDefault(); return; }
      onClick?.(event);
    }}
  >{children}</button>;
}

export function RecordRow({ title, subtitle, selected, disabled, onSelect, onEdit, onArchive }: {
  title: string; subtitle?: string; selected?: boolean; disabled?: boolean;
  onSelect: () => void; onEdit: () => void; onArchive: () => void;
}) {
  const [actions, setActions] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => { setActions(false); requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true })); };
  return <div className="lag-role-record-row" onKeyDown={(event) => { if (event.key === "Escape" && actions) { event.stopPropagation(); close(); } }}>
    <SwipeButton className="lag-role-node" aria-pressed={Boolean(selected)} data-selected={Boolean(selected)} onClick={onSelect} onSwipeLeft={() => setActions(true)}>
      <span className="lag-role-node-mark" aria-hidden>{title.charAt(0)}</span>
      <span><strong>{title}</strong>{subtitle ? <small>{subtitle}</small> : null}</span><span aria-hidden>→</span>
    </SwipeButton>
    <button ref={toggle} type="button" className="lag-role-button" aria-label={`${title} 작업`} aria-expanded={actions} onClick={() => setActions(!actions)}>작업</button>
    {actions ? <div className="lag-role-actions" role="group" aria-label={`${title} 작업 선택`}>
      <button type="button" className="lag-role-button" disabled={disabled} onClick={onEdit}>수정</button>
      <button type="button" className="lag-role-button" disabled={disabled} data-variant="destructive" onClick={onArchive}>보관</button>
      <button type="button" className="lag-role-button" onClick={close}>닫기</button>
    </div> : null}
  </div>;
}
