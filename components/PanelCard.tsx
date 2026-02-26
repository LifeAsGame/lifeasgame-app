"use client";

import { motion } from "framer-motion";

import { MOTION } from "@/lib/motion";
import { UI_CONSTS } from "@/lib/uiConsts";

import IconSlot from "./IconSlot";

type PanelCardProps = {
  label: string;
  slotLabel: string;
  subtitle?: string;
  selected?: boolean;
  centerTarget?: boolean;
  compact?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  index?: number;
};

export default function PanelCard({
  label,
  slotLabel,
  subtitle,
  selected = false,
  centerTarget = false,
  compact = false,
  onClick,
  disabled = false,
  index = 0,
}: PanelCardProps) {
  const isInteractive = Boolean(onClick) && !disabled;

  return (
    <motion.button
      layout="position"
      data-drag-scroll-allow
      data-scroll-center-target={centerTarget ? "true" : undefined}
      type="button"
      draggable={false}
      disabled={!isInteractive}
      onClick={onClick}
      initial={MOTION.listItem.initial}
      animate={MOTION.listItem.animate}
      exit={MOTION.listItem.exit}
      transition={{
        ...MOTION.listItem.transition,
        delay: index * 0.045,
        layout: { type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
      }}
      whileTap={isInteractive ? { scale: 0.995 } : undefined}
      className={[
        "group relative flex w-full items-center gap-4 overflow-hidden",
        "border text-left transition-colors duration-300",
        isInteractive ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      style={{
        height: UI_CONSTS.rightPanels.rowHeight,
        background: selected
          ? "linear-gradient(180deg, rgba(234,239,246,0.92), rgba(223,230,240,0.88))"
          : "linear-gradient(180deg, rgba(234,238,244,0.86), rgba(224,230,238,0.8))",
        borderColor: selected ? "rgba(246, 192, 61, 0.72)" : "rgba(19, 23, 28, 0.7)",
        boxShadow: selected
          ? "inset 0 0 0 1px rgba(255,222,138,0.55), 0 0 22px rgba(244, 188, 58, 0.08)"
          : "inset 0 0 0 1px rgba(255,255,255,0.45)",
      }}
    >
      <div
        className="absolute inset-y-0 left-0 w-[5px]"
        style={{ background: selected ? "rgba(244, 192, 72, 0.95)" : "rgba(42,48,57,0.18)" }}
      />
      <div style={{ paddingLeft: UI_CONSTS.rightPanels.cardPaddingX }}>
        <IconSlot label={slotLabel} active={selected} size={44} subtle />
      </div>
      <div
        className="min-w-0 flex-1"
        style={{
          paddingRight: UI_CONSTS.rightPanels.cardPaddingX,
          paddingBlock: UI_CONSTS.rightPanels.cardPaddingY,
        }}
      >
        <p
          className="break-words font-semibold uppercase tracking-[0.08em]"
          style={{
            color: "rgba(34, 38, 43, 0.92)",
            fontSize: compact ? "1.02rem" : "1.55rem",
            lineHeight: compact ? 1.15 : 1.02,
            display: "-webkit-box",
            WebkitLineClamp: compact ? 1 : 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {label}
        </p>
        {subtitle ? (
          <p
            className="mt-1 break-words text-sm tracking-[0.08em]"
            style={{
              color: "rgba(53, 59, 66, 0.72)",
              display: "-webkit-box",
              WebkitLineClamp: compact ? 1 : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </motion.button>
  );
}
