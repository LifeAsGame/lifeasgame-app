"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { clampFloatingPosition, type FloatingPosition } from "@/shared/lib/viewport";

const MOBILE_BREAKPOINT = 768;
const WINDOW_PADDING = 16;

export function useDraggableWindow(open: boolean) {
  const windowRef = useRef<HTMLElement>(null);
  const drag = useRef<{ pointerX: number; pointerY: number; origin: FloatingPosition } | null>(null);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const [mobile, setMobile] = useState(false);

  const clampPosition = useCallback((candidate: FloatingPosition) => {
    const element = windowRef.current;
    if (!element) return candidate;
    const rect = element.getBoundingClientRect();
    return clampFloatingPosition(
      candidate,
      { width: rect.width, height: rect.height },
      { width: window.innerWidth, height: window.innerHeight },
      WINDOW_PADDING,
    );
  }, []);

  useLayoutEffect(() => {
    const nextMobile = window.innerWidth < MOBILE_BREAKPOINT;
    setMobile(nextMobile);
    if (!open || nextMobile) return;
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) setPosition((current) => clampPosition(current ?? { x: window.innerWidth - rect.width - 24, y: 24 }));
  }, [clampPosition, open]);

  useEffect(() => {
    if (!open) return;
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      setPosition(clampPosition({
        x: drag.current.origin.x + event.clientX - drag.current.pointerX,
        y: drag.current.origin.y + event.clientY - drag.current.pointerY,
      }));
    };
    const end = () => { drag.current = null; };
    const resize = () => {
      drag.current = null;
      const nextMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setMobile(nextMobile);
      if (!nextMobile) setPosition((current) => current && clampPosition(current));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("resize", resize);
    };
  }, [clampPosition, open]);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || window.innerWidth < MOBILE_BREAKPOINT) return;
    if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    const origin = position ?? { x: rect.left, y: rect.top };
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, origin };
    setPosition(clampPosition(origin));
  };

  return {
    windowRef,
    dragHandleProps: { onPointerDown, style: { cursor: "move", touchAction: "none" } as const },
    windowStyle: mobile
      ? { position: "fixed", left: 16, right: 16, bottom: 112, top: "auto", zIndex: 600000 } as const
      : { position: "fixed", left: position?.x, top: position?.y, right: position ? "auto" : 24, zIndex: 600000 } as const,
  };
}
