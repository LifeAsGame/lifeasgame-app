"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";

const PAN_START_BLOCK_SELECTOR = "input,textarea,select,button,a,[data-no-pan]";

type PointerPanState = {
  activePointerId: number | null;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
  dragging: boolean;
};

export function usePanScroll<T extends HTMLElement>(ref: RefObject<T | null>) {
  const stateRef = useRef<PointerPanState>({
    activePointerId: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
    dragging: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const previousCursor = el.style.cursor;
    const previousTouchAction = el.style.touchAction;
    let previousBodyUserSelect = "";
    let previousBodyCursor = "";

    el.style.cursor = "grab";
    // Keep native touch scrolling available for nested opt-out scroll regions.
    el.style.touchAction = "pan-x pan-y";

    const resetDraggingState = () => {
      const state = stateRef.current;
      if (!state.dragging && state.activePointerId === null) {
        return;
      }

      if (state.activePointerId !== null && el.hasPointerCapture(state.activePointerId)) {
        el.releasePointerCapture(state.activePointerId);
      }

      state.activePointerId = null;
      state.dragging = false;
      el.style.cursor = "grab";
      el.removeAttribute("data-pan-dragging");

      if (previousBodyUserSelect) {
        document.body.style.userSelect = previousBodyUserSelect;
      } else {
        document.body.style.removeProperty("user-select");
      }

      if (previousBodyCursor) {
        document.body.style.cursor = previousBodyCursor;
      } else {
        document.body.style.removeProperty("cursor");
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (stateRef.current.activePointerId !== null) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const target = event.target;
      if (target instanceof Element && target.closest(PAN_START_BLOCK_SELECTOR)) {
        return;
      }

      const state = stateRef.current;
      state.activePointerId = event.pointerId;
      state.dragging = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.startScrollLeft = el.scrollLeft;
      state.startScrollTop = el.scrollTop;

      previousBodyUserSelect = document.body.style.userSelect;
      previousBodyCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      el.style.cursor = "grabbing";
      el.setAttribute("data-pan-dragging", "true");
      el.setPointerCapture(event.pointerId);

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const state = stateRef.current;
      if (!state.dragging || state.activePointerId !== event.pointerId) {
        return;
      }

      const dx = state.startX - event.clientX;
      const dy = state.startY - event.clientY;

      el.scrollLeft = state.startScrollLeft + dx;
      el.scrollTop = state.startScrollTop + dy;

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (stateRef.current.activePointerId !== event.pointerId) {
        return;
      }
      resetDraggingState();
    };

    const onDragStart = (event: DragEvent) => {
      if (stateRef.current.dragging && event.cancelable) {
        event.preventDefault();
      }
    };

    const onSelectStart = (event: Event) => {
      if (stateRef.current.dragging && event.cancelable) {
        event.preventDefault();
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    el.addEventListener("lostpointercapture", resetDraggingState);
    el.addEventListener("dragstart", onDragStart);
    el.addEventListener("selectstart", onSelectStart);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
      el.removeEventListener("lostpointercapture", resetDraggingState);
      el.removeEventListener("dragstart", onDragStart);
      el.removeEventListener("selectstart", onSelectStart);
      resetDraggingState();
      el.style.cursor = previousCursor;
      el.style.touchAction = previousTouchAction;
      el.removeAttribute("data-pan-dragging");
    };
  }, [ref]);
}
