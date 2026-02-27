"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type EdgeFadeScrollAreaProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children: ReactNode;
  fadeSize?: number;
  fadeColor?: string;
  centerTargetSelector?: string;
  centerTargetKey?: string | number | null;
  resetScrollKey?: string | number | null;
  centerBehavior?: ScrollBehavior | "spring";
};

type FadeState = {
  canScrollUp: boolean;
  canScrollDown: boolean;
};

type DragState = {
  activePointerId: number | null;
  dragging: boolean;
  startX: number;
  startY: number;
  startScrollTop: number;
  lastY: number;
  lastTs: number;
  velocityY: number;
  overscrollY: number;
  suppressClick: boolean;
};

const DRAG_BLOCK_SELECTOR =
  "input,textarea,select,button:not([data-drag-scroll-allow]),a:not([data-drag-scroll-allow]),[data-no-drag-scroll]";
const DRAG_START_THRESHOLD_PX = 6;
const MAX_OVERSCROLL_PX = 24;
const OVERSCROLL_DAMPING = 0.25;
const INERTIA_STOP_VELOCITY = 0.009; // px/ms
const INERTIA_FRICTION_PER_FRAME = 0.96;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function EdgeFadeScrollArea({
  children,
  className,
  style,
  fadeSize = 22,
  fadeColor = "rgba(229, 235, 243, 0.96)",
  centerTargetSelector,
  centerTargetKey = null,
  resetScrollKey = null,
  centerBehavior = "smooth",
  ...rest
}: EdgeFadeScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const updateFadeStateRef = useRef<(() => void) | null>(null);
  const dragStateRef = useRef<DragState>({
    activePointerId: null,
    dragging: false,
    startX: 0,
    startY: 0,
    startScrollTop: 0,
    lastY: 0,
    lastTs: 0,
    velocityY: 0,
    overscrollY: 0,
    suppressClick: false,
  });
  const inertiaFrameRef = useRef<number | null>(null);
  const bounceFrameRef = useRef<number | null>(null);
  const centerFrameRef = useRef<number | null>(null);
  const centerVelocityRef = useRef(0);
  const [fadeState, setFadeState] = useState<FadeState>({
    canScrollUp: false,
    canScrollDown: false,
  });

  const cancelCenterAnimation = useCallback(() => {
    if (centerFrameRef.current !== null) {
      window.cancelAnimationFrame(centerFrameRef.current);
      centerFrameRef.current = null;
    }
    centerVelocityRef.current = 0;
  }, []);

  const startSpringCenterScroll = useCallback(
    (el: HTMLDivElement, targetScrollTop: number) => {
      cancelCenterAnimation();
      centerVelocityRef.current = 0;

      const SPRING_STIFFNESS = 190;
      const SPRING_DAMPING = 24;
      const MIN_DT_SECONDS = 1 / 240;
      const MAX_DT_SECONDS = 1 / 30;
      const SETTLE_DISTANCE_PX = 0.5;
      const SETTLE_VELOCITY_PX_PER_SECOND = 8;

      let lastTs = performance.now();

      const step = (ts: number) => {
        const dt = clamp((ts - lastTs) / 1000, MIN_DT_SECONDS, MAX_DT_SECONDS);
        lastTs = ts;

        const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
        const clampedTarget = clamp(targetScrollTop, 0, maxTop);
        const current = el.scrollTop;
        const distance = clampedTarget - current;

        const acceleration = distance * SPRING_STIFFNESS - centerVelocityRef.current * SPRING_DAMPING;
        centerVelocityRef.current += acceleration * dt;

        const next = current + centerVelocityRef.current * dt;
        const clampedNext = clamp(next, 0, maxTop);

        if (clampedNext !== current) {
          el.scrollTop = clampedNext;
        }

        if ((clampedNext === 0 || clampedNext === maxTop) && clampedNext !== next) {
          centerVelocityRef.current = 0;
        }

        if (
          Math.abs(clampedTarget - clampedNext) <= SETTLE_DISTANCE_PX &&
          Math.abs(centerVelocityRef.current) <= SETTLE_VELOCITY_PX_PER_SECOND
        ) {
          el.scrollTop = clampedTarget;
          centerFrameRef.current = null;
          centerVelocityRef.current = 0;
          updateFadeStateRef.current?.();
          return;
        }

        centerFrameRef.current = window.requestAnimationFrame(step);
      };

      centerFrameRef.current = window.requestAnimationFrame(step);
    },
    [cancelCenterAnimation],
  );

  useEffect(() => {
    const el = scrollRef.current;
    const contentEl = contentRef.current;
    if (!el || !contentEl) return;

    const dragState = dragStateRef.current;

    const setOverscrollVisual = (nextOverscroll: number) => {
      const clamped = clamp(nextOverscroll, -MAX_OVERSCROLL_PX, MAX_OVERSCROLL_PX);
      dragState.overscrollY = clamped;

      contentEl.style.transform = clamped ? `translateY(${clamped}px)` : "";
      contentEl.style.willChange = clamped ? "transform" : "";
    };

    const cancelInertia = () => {
      if (inertiaFrameRef.current !== null) {
        window.cancelAnimationFrame(inertiaFrameRef.current);
        inertiaFrameRef.current = null;
      }
    };

    const cancelBounce = () => {
      if (bounceFrameRef.current !== null) {
        window.cancelAnimationFrame(bounceFrameRef.current);
        bounceFrameRef.current = null;
      }
    };

    const cancelAllMotion = () => {
      cancelInertia();
      cancelBounce();
      cancelCenterAnimation();
    };

    const updateFadeState = () => {
      const canScroll = el.scrollHeight > el.clientHeight + 1;
      const canScrollUp = canScroll && el.scrollTop > 1;
      const canScrollDown = canScroll && el.scrollTop + el.clientHeight < el.scrollHeight - 1;

      setFadeState((prev) => {
        if (prev.canScrollUp === canScrollUp && prev.canScrollDown === canScrollDown) {
          return prev;
        }
        return { canScrollUp, canScrollDown };
      });
    };

    const startBounceBack = () => {
      cancelBounce();

      if (Math.abs(dragState.overscrollY) <= 0.1) {
        return;
      }

      let lastTs = performance.now();
      const step = (ts: number) => {
        const dt = Math.max(ts - lastTs, 1);
        lastTs = ts;

        const decay = Math.pow(0.75, dt / 16.67);
        const next = dragState.overscrollY * decay;

        if (Math.abs(next) < 0.35) {
          setOverscrollVisual(0);
          bounceFrameRef.current = null;
          return;
        }

        setOverscrollVisual(next);
        bounceFrameRef.current = window.requestAnimationFrame(step);
      };

      bounceFrameRef.current = window.requestAnimationFrame(step);
    };

    const maxScrollTop = () => Math.max(0, el.scrollHeight - el.clientHeight);

    const applyDragScroll = (pointerClientY: number, eventTimeStamp: number) => {
      const dy = dragState.startY - pointerClientY;
      const desiredScrollTop = dragState.startScrollTop + dy;
      const maxTop = maxScrollTop();
      const clampedTop = clamp(desiredScrollTop, 0, maxTop);

      if (clampedTop !== el.scrollTop) {
        el.scrollTop = clampedTop;
      }

      if (desiredScrollTop < 0) {
        setOverscrollVisual(clamp(-desiredScrollTop * OVERSCROLL_DAMPING, 0, MAX_OVERSCROLL_PX));
      } else if (desiredScrollTop > maxTop) {
        setOverscrollVisual(
          -clamp((desiredScrollTop - maxTop) * OVERSCROLL_DAMPING, 0, MAX_OVERSCROLL_PX),
        );
      } else if (dragState.overscrollY !== 0) {
        setOverscrollVisual(0);
      }

      const dt = Math.max(eventTimeStamp - dragState.lastTs, 1);
      const pointerDelta = dragState.lastY - pointerClientY;
      const instantVelocity = pointerDelta / dt;
      dragState.velocityY = dragState.velocityY * 0.74 + instantVelocity * 0.26;
      dragState.lastY = pointerClientY;
      dragState.lastTs = eventTimeStamp;
    };

    const startInertia = () => {
      cancelInertia();

      let lastTs = performance.now();
      const step = (ts: number) => {
        const dt = Math.max(ts - lastTs, 1);
        lastTs = ts;

        if (Math.abs(dragState.velocityY) < INERTIA_STOP_VELOCITY) {
          inertiaFrameRef.current = null;
          startBounceBack();
          return;
        }

        const maxTop = maxScrollTop();
        const next = el.scrollTop + dragState.velocityY * dt;
        const clampedTop = clamp(next, 0, maxTop);

        if (clampedTop !== el.scrollTop) {
          el.scrollTop = clampedTop;
        }

        if (next < 0) {
          setOverscrollVisual(clamp(-next * 0.16, 0, MAX_OVERSCROLL_PX));
          dragState.velocityY = 0;
          inertiaFrameRef.current = null;
          startBounceBack();
          return;
        }

        if (next > maxTop) {
          setOverscrollVisual(-clamp((next - maxTop) * 0.16, 0, MAX_OVERSCROLL_PX));
          dragState.velocityY = 0;
          inertiaFrameRef.current = null;
          startBounceBack();
          return;
        }

        const friction = Math.pow(INERTIA_FRICTION_PER_FRAME, dt / 16.67);
        dragState.velocityY *= friction;
        inertiaFrameRef.current = window.requestAnimationFrame(step);
      };

      inertiaFrameRef.current = window.requestAnimationFrame(step);
    };

    const previousCursor = el.style.cursor;
    const previousTouchAction = el.style.touchAction;
    let previousBodyUserSelect = "";
    let previousBodyCursor = "";

    const activateDraggingVisuals = () => {
      previousBodyUserSelect = document.body.style.userSelect;
      previousBodyCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      el.style.cursor = "grabbing";
      el.setAttribute("data-drag-scrolling", "true");
    };

    const deactivateDraggingVisuals = () => {
      el.style.cursor = "grab";
      el.removeAttribute("data-drag-scrolling");

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

    el.style.cursor = "grab";
    el.style.touchAction = "none";

    const endPointerInteraction = (pointerId: number | null) => {
      if (dragState.activePointerId === null) {
        return;
      }
      if (pointerId !== null && dragState.activePointerId !== pointerId) {
        return;
      }

      const wasDragging = dragState.dragging;
      const activePointerId = dragState.activePointerId;

      if (activePointerId !== null && el.hasPointerCapture(activePointerId)) {
        el.releasePointerCapture(activePointerId);
      }

      const shouldInertia =
        wasDragging &&
        Math.abs(dragState.velocityY) >= INERTIA_STOP_VELOCITY &&
        Math.abs(dragState.overscrollY) < 0.5;

      dragState.activePointerId = null;
      dragState.dragging = false;
      dragState.velocityY = shouldInertia ? dragState.velocityY : 0;

      deactivateDraggingVisuals();

      if (shouldInertia) {
        startInertia();
      } else {
        startBounceBack();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (dragState.activePointerId !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const target = event.target;
      if (target instanceof Element && target.closest(DRAG_BLOCK_SELECTOR)) {
        return;
      }

      cancelAllMotion();
      dragState.suppressClick = false;
      dragState.velocityY = 0;

      dragState.activePointerId = event.pointerId;
      dragState.dragging = false;
      dragState.startX = event.clientX;
      dragState.startY = event.clientY;
      dragState.startScrollTop = el.scrollTop;
      dragState.lastY = event.clientY;
      dragState.lastTs = event.timeStamp;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (dragState.activePointerId !== event.pointerId) {
        return;
      }

      if (!dragState.dragging) {
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;

        if (
          Math.abs(deltaY) < DRAG_START_THRESHOLD_PX ||
          Math.abs(deltaY) < Math.abs(deltaX)
        ) {
          return;
        }

        dragState.dragging = true;
        dragState.suppressClick = true;
        dragState.lastY = event.clientY;
        dragState.lastTs = event.timeStamp;
        if (!el.hasPointerCapture(event.pointerId)) {
          el.setPointerCapture(event.pointerId);
        }
        activateDraggingVisuals();
      }

      applyDragScroll(event.clientY, event.timeStamp);

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      const endedDraggedScroll =
        dragState.activePointerId === event.pointerId && dragState.dragging;

      endPointerInteraction(event.pointerId);

      if (endedDraggedScroll && event.cancelable) {
        event.preventDefault();
      }
    };

    const onLostPointerCapture = () => {
      endPointerInteraction(null);
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!dragState.suppressClick) {
        return;
      }

      dragState.suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    const onDragStart = (event: DragEvent) => {
      if (dragState.dragging && event.cancelable) {
        event.preventDefault();
      }
    };

    const onSelectStart = (event: Event) => {
      if (dragState.dragging && event.cancelable) {
        event.preventDefault();
      }
    };

    updateFadeStateRef.current = updateFadeState;
    updateFadeState();
    el.addEventListener("scroll", updateFadeState, { passive: true });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    el.addEventListener("lostpointercapture", onLostPointerCapture);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    el.addEventListener("selectstart", onSelectStart);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateFadeState();
          })
        : null;

    resizeObserver?.observe(el);
    resizeObserver?.observe(contentEl);

    return () => {
      el.removeEventListener("scroll", updateFadeState);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
      el.removeEventListener("lostpointercapture", onLostPointerCapture);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      el.removeEventListener("selectstart", onSelectStart);
      resizeObserver?.disconnect();

      cancelAllMotion();
      setOverscrollVisual(0);
      dragState.activePointerId = null;
      dragState.dragging = false;
      dragState.velocityY = 0;
      dragState.suppressClick = false;

      deactivateDraggingVisuals();
      el.style.cursor = previousCursor;
      el.style.touchAction = previousTouchAction;
      el.removeAttribute("data-drag-scrolling");
      updateFadeStateRef.current = null;
    };
  }, [cancelCenterAnimation]);

  useEffect(() => {
    let frameId: number | null = null;

    frameId = window.requestAnimationFrame(() => {
      updateFadeStateRef.current?.();
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [children]);

  useEffect(() => {
    let frameId: number | null = null;

    frameId = window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      cancelCenterAnimation();
      el.scrollTo({ top: 0, behavior: "auto" });
      updateFadeStateRef.current?.();
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [cancelCenterAnimation, resetScrollKey]);

  useEffect(() => {
    let frameId: number | null = null;

    frameId = window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;

      updateFadeStateRef.current?.();

      if (!centerTargetSelector || centerTargetKey == null) {
        cancelCenterAnimation();
        return;
      }

      const target = el.querySelector(centerTargetSelector);
      if (!(target instanceof HTMLElement)) {
        cancelCenterAnimation();
        return;
      }

      const containerRect = el.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);

      const targetCenter =
        el.scrollTop + (targetRect.top - containerRect.top) + targetRect.height / 2;
      const nextScrollTop = clamp(targetCenter - el.clientHeight / 2, 0, maxScrollTop);

      if (Math.abs(nextScrollTop - el.scrollTop) < 1) {
        cancelCenterAnimation();
        return;
      }

      if (centerBehavior === "spring") {
        startSpringCenterScroll(el, nextScrollTop);
      } else {
        cancelCenterAnimation();
        el.scrollTo({ top: nextScrollTop, behavior: centerBehavior });
      }
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      cancelCenterAnimation();
    };
  }, [
    cancelCenterAnimation,
    centerBehavior,
    centerTargetKey,
    centerTargetSelector,
    startSpringCenterScroll,
  ]);

  const mergedClassName = useMemo(
    () =>
      [
        "relative z-10 overflow-y-auto overflow-x-hidden overscroll-y-contain",
        "touch-none",
        className,
      ]
        .filter(Boolean)
        .join(" "),
    [className],
  );

  return (
    <div className="relative min-h-0">
      <div ref={scrollRef} {...rest} className={mergedClassName} style={style}>
        <div ref={contentRef}>{children}</div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 transition-opacity duration-150"
        style={{
          height: fadeSize,
          opacity: fadeState.canScrollUp ? 1 : 0,
          background: `linear-gradient(180deg, ${fadeColor} 0%, rgba(229,235,243,0.72) 42%, rgba(229,235,243,0) 100%)`,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 transition-opacity duration-150"
        style={{
          height: fadeSize + 2,
          opacity: fadeState.canScrollDown ? 1 : 0,
          background: `linear-gradient(0deg, ${fadeColor} 0%, rgba(229,235,243,0.72) 42%, rgba(229,235,243,0) 100%)`,
        }}
      />
    </div>
  );
}
