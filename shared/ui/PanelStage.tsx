"use client";

import { motion, useIsPresent, useReducedMotion } from "framer-motion";
import { useLayoutEffect } from "react";

import { MOTION } from "@/shared/lib/motion";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";

export default function PanelStage({
  stageKey,
  autoFocus = true,
  children,
  onPointerDownCapture,
  zIndex,
}: {
  stageKey: string;
  autoFocus?: boolean;
  index?: number;
  children: React.ReactNode;
  onPointerDownCapture?: () => void;
  zIndex?: number;
}) {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();

  useLayoutEffect(() => {
    if (!autoFocus) return;
    requestStageFocus(stageKey, "forward");
  }, [autoFocus, stageKey]);

  return (
    <motion.div
      layout="position"
      className="lag-panel-stage relative"
      data-stage-key={stageKey}
      data-stage-auto-focus={autoFocus ? undefined : "false"}
      aria-hidden={isPresent ? undefined : true}
      onPointerDownCapture={onPointerDownCapture}
      initial={reducedMotion ? false : MOTION.panelSlot.initial}
      animate={MOTION.panelSlot.animate}
      exit={reducedMotion ? { opacity: 0 } : MOTION.panelSlot.exit}
      transition={reducedMotion ? { duration: 0 } : MOTION.panelSlot.transition}
      style={{ willChange: "transform, opacity", pointerEvents: isPresent ? undefined : "none", zIndex }}
    >
      {children}
    </motion.div>
  );
}

export function StageContentTransition({ identity, children }: { identity: React.Key; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      key={identity}
      initial={reducedMotion ? false : MOTION.panelContentSwap.initial}
      animate={MOTION.panelContentSwap.animate}
      transition={reducedMotion ? { duration: 0 } : MOTION.panelContentSwap.transition}
    >
      {children}
    </motion.div>
  );
}
