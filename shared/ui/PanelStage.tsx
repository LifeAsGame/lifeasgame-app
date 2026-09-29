"use client";

import { animate, motion, useIsPresent, useMotionValue, useReducedMotion } from "framer-motion";
import { Fragment, useLayoutEffect } from "react";

import { MOTION } from "@/shared/lib/motion";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";

export default function PanelStage({
  stageKey,
  autoFocus = true,
  children,
  onPointerDownCapture,
  zIndex,
  inactive = false,
  side = "right",
}: {
  stageKey: string;
  autoFocus?: boolean;
  index?: number;
  children: React.ReactNode;
  onPointerDownCapture?: () => void;
  zIndex?: number;
  inactive?: boolean;
  side?: "left" | "right";
}) {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();

  useLayoutEffect(() => {
    if (!autoFocus || inactive) return;
    requestStageFocus(stageKey, "forward");
  }, [autoFocus, stageKey, inactive]);

  return (
    <motion.div
      layout="position"
      className="lag-panel-stage relative"
      data-stage-key={stageKey}
      data-stage-auto-focus={autoFocus ? undefined : "false"}
      data-inactive={inactive}
      inert={inactive || !isPresent}
      aria-hidden={isPresent && !inactive ? undefined : true}
      onPointerDownCapture={onPointerDownCapture}
      initial={reducedMotion ? false : { opacity: 0, x: side === "left" ? -24 : 24 }}
      animate={{ opacity: inactive ? 0 : 1, x: inactive && !reducedMotion ? -24 : 0 }}
      exit={{ opacity: 0, x: reducedMotion ? 0 : side === "left" ? -24 : 24 }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 576, damping: 48, mass: 1 }}
      style={{ willChange: "transform, opacity", pointerEvents: isPresent && !inactive ? undefined : "none", zIndex }}
    >
      {children}
    </motion.div>
  );
}

export function StageContentTransition({ identity, children }: { identity: React.Key; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const opacity = useMotionValue(1);
  const x = useMotionValue(0);
  useLayoutEffect(() => {
    if (reducedMotion) {
      opacity.set(1);
      x.set(0);
      return;
    }
    // Value animations retain the rendered frame when a selection interrupts them.
    const fade = animate(opacity, [opacity.get(), 0.82, 1], MOTION.panelContentSwap.transition);
    const shift = animate(x, [x.get(), 3, 0], MOTION.panelContentSwap.transition);
    return () => { fade.stop(); shift.stop(); };
  }, [identity, reducedMotion, opacity, x]);

  return (
    <motion.div data-content-identity={identity} initial={false} style={{ opacity, x }}>
      <Fragment key={identity}>{children}</Fragment>
    </motion.div>
  );
}
