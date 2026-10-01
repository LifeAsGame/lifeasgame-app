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
  instant = false,
  side = "right",
  panelRole,
}: {
  stageKey: string;
  autoFocus?: boolean;
  index?: number;
  children: React.ReactNode;
  onPointerDownCapture?: () => void;
  zIndex?: number;
  inactive?: boolean;
  instant?: boolean;
  side?: "left" | "right";
  panelRole?: "list" | "detail";
}) {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();

  useLayoutEffect(() => {
    if (!autoFocus || inactive) return;
    requestStageFocus(stageKey, "forward");
  }, [autoFocus, stageKey, inactive]);

  return (
    <motion.div
      layout={false}
      className="lag-panel-stage relative"
      data-stage-key={stageKey}
      data-panel-role={panelRole}
      data-panel-side={side}
      data-stage-auto-focus={autoFocus ? undefined : "false"}
      data-inactive={inactive}
      inert={inactive || !isPresent}
      aria-hidden={isPresent && !inactive ? undefined : true}
      onPointerDownCapture={onPointerDownCapture}
      initial={reducedMotion || instant ? false : { opacity: 0 }}
      animate={{ opacity: inactive ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion || instant ? 0 : 0.16 }}
      style={{ willChange: "opacity", pointerEvents: isPresent && !inactive ? undefined : "none", zIndex }}
    >
      {children}
    </motion.div>
  );
}

export function StageContentTransition({ identity, children }: { identity: React.Key; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const opacity = useMotionValue(1);

  useLayoutEffect(() => {
    if (reducedMotion) {
      opacity.set(1);
      return;
    }
    // Value animations retain the rendered frame when a selection interrupts them.
    const fade = animate(opacity, [opacity.get(), 0.82, 1], MOTION.panelContentSwap.transition);
    return () => { fade.stop(); };
  }, [identity, reducedMotion, opacity]);

  return (
    <motion.div data-content-identity={identity} initial={false} style={{ opacity }}>
      <Fragment key={identity}>{children}</Fragment>
    </motion.div>
  );
}
