"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";

import type { MainNavId } from "@/lib/nav";
import { MOTION } from "@/lib/motion";
import { UI_CONSTS } from "@/lib/uiConsts";

import IconSlot from "./IconSlot";

type OrbItem = {
  id: MainNavId;
  label: string;
  slotLabel: string;
};

type OrbNavProps = {
  items: OrbItem[];
  selectedId: MainNavId;
  onSelect: (id: MainNavId) => void;
  zIndex?: number;
  onFocus?: () => void;
};

export default function OrbNav({ items, selectedId, onSelect, zIndex, onFocus }: OrbNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    orbSize,
    orbGap,
    outerRingPadding,
    labelGap,
    labelHeight,
    labelPaddingY,
    safePaddingY,
    framePaddingY,
    viewportHeight,
  } = UI_CONSTS.orbNav;

  const itemBlockHeight = useMemo(() => {
    const orbButtonVisual = orbSize + outerRingPadding * 2;
    return orbButtonVisual + labelGap + labelHeight + labelPaddingY * 2;
  }, [labelGap, labelHeight, labelPaddingY, orbSize, outerRingPadding]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedId]);

  return (
    <div
      className="relative flex h-full items-center justify-center"
      onPointerDownCapture={onFocus}
      style={zIndex ? { zIndex } : undefined}
    >
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-full border border-white/8 bg-white/[0.015] px-3"
        style={{
          width: UI_CONSTS.layout.centerWidth,
          height: viewportHeight + framePaddingY * 2,
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.025), 0 0 24px rgba(104,130,200,0.04)",
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 w-px -translate-x-1/2 bg-white/8"
          style={{ top: framePaddingY, bottom: framePaddingY }}
        />
        <div
          ref={scrollRef}
          data-no-pan
          className="scrollbar-hide relative w-full overflow-y-auto overflow-x-hidden"
          style={{
            height: viewportHeight,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <motion.div
            initial={{ opacity: 0.96 }}
            animate={{ opacity: 1 }}
            transition={MOTION.orbTrack.transition}
            className="flex flex-col items-center"
            style={{
              paddingTop: safePaddingY,
              paddingBottom: safePaddingY,
              gap: orbGap,
            }}
          >
            {items.map((item) => {
              const selected = item.id === selectedId;

              return (
                <motion.button
                  layout="position"
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  whileTap={{ scale: 0.988 }}
                  transition={{
                    layout: { type: "tween", duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                  }}
                  className="group relative flex flex-col items-center overflow-visible py-[1px]"
                  style={{ minHeight: itemBlockHeight }}
                  aria-pressed={selected}
                  aria-label={item.label}
                >
                  <div
                    className="absolute rounded-full transition-opacity duration-300"
                    style={{
                      width: UI_CONSTS.orbNav.orbSize + 16,
                      height: UI_CONSTS.orbNav.orbSize + 16,
                      opacity: selected ? 1 : 0,
                      background:
                        "radial-gradient(circle, rgba(248, 201, 87, 0.22) 0%, rgba(248, 201, 87, 0.08) 48%, rgba(248, 201, 87, 0) 72%)",
                      filter: "blur(1px)",
                    }}
                  />
                  <div
                    className="relative rounded-full p-[4px]"
                    style={{
                      border: selected
                        ? "1px solid rgba(249, 208, 105, 0.9)"
                        : "1px solid rgba(229, 236, 246, 0.68)",
                      boxShadow: selected
                        ? "0 0 0 1px rgba(248, 197, 78, 0.35), 0 0 18px rgba(247, 196, 70, 0.16)"
                        : "0 0 0 1px rgba(255,255,255,0.03)",
                      background: "rgba(0,0,0,0.22)",
                    }}
                  >
                    <IconSlot
                      label={item.slotLabel}
                      active={selected}
                      size={UI_CONSTS.orbNav.orbSize}
                    />
                  </div>
                  <span
                    className="flex items-center justify-center text-center text-xs uppercase tracking-[0.28em] transition-colors duration-300"
                    style={{
                      marginTop: labelGap,
                      minHeight: labelHeight + labelPaddingY * 2,
                      lineHeight: 1.2,
                      paddingInline: 4,
                      paddingBlock: labelPaddingY,
                      color: selected
                        ? "rgba(248, 220, 152, 0.95)"
                        : "rgba(220, 228, 240, 0.72)",
                    }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
