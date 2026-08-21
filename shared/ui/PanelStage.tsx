"use client";

import { motion, useReducedMotion } from "framer-motion";

import { MOTION } from "@/shared/lib/motion";

export default function PanelStage({
  stageKey,
  index = 0,
  children,
  onPointerDownCapture,
  zIndex,
}: {
  stageKey: string;
  index?: number;
  children: React.ReactNode;
  onPointerDownCapture?: () => void;
  zIndex?: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      layout="position"
      className="lag-panel-stage relative"
      data-stage-key={stageKey}
      onPointerDownCapture={onPointerDownCapture}
      initial={reducedMotion ? false : MOTION.panelSlot.initial}
      animate={MOTION.panelSlot.animate}
      exit={MOTION.panelSlot.exit}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 28, delay: index * 0.055 }}
      style={{ willChange: "transform, opacity", zIndex }}
    >
      {children}
    </motion.div>
  );
}
