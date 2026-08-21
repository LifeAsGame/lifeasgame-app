"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { MainNavId } from "@/entities/nav";
import { MOTION } from "@/shared/lib/motion";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import { usePanScroll } from "@/shared/hooks/usePanScroll";

type OrbItem = {
  id: MainNavId;
  label: string;
  slotLabel: string;
};

type OrbNavProps = {
  items: OrbItem[];
  selectedId: MainNavId | null;
  onSelect: (id: MainNavId) => void;
  zIndex?: number;
  onFocus?: () => void;
};

type Ripple = { id: number };

export default function OrbNav({ items, selectedId, onSelect, zIndex, onFocus }: OrbNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  usePanScroll(scrollRef);

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

  const addRipple = () => {
    const id = Date.now();
    setRipples((prev) => [...prev, { id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650);
  };

  return (
    <div
      className="relative flex h-full items-center justify-center"
      onPointerDownCapture={onFocus}
      style={zIndex ? { zIndex } : undefined}
    >
      <div
        className="lag-orb-nav relative flex items-center justify-center overflow-hidden px-3"
        style={{
          width: UI_CONSTS.layout.centerWidth,
          height: viewportHeight + framePaddingY * 2,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div
          ref={scrollRef}
          data-no-pan
          className="lag-orb-scroll scrollbar-hide relative w-full overflow-y-auto overflow-x-hidden"
          style={{ height: viewportHeight, scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <motion.div
            initial={{ opacity: 0.96 }}
            animate={{ opacity: 1 }}
            transition={MOTION.orbTrack.transition}
            className="lag-orb-track flex flex-col items-center"
            style={{ paddingTop: safePaddingY, paddingBottom: safePaddingY, gap: orbGap }}
          >
            {items.map((item) => {
              const selected = item.id === selectedId;

              return (
                <motion.button
                  layout="position"
                  key={item.id}
                  type="button"
                  onClick={() => { addRipple(); onSelect(item.id); }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{
                    layout: { type: "tween", duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                    scale:  { type: "spring", stiffness: 480, damping: 24 },
                  }}
                  className="lag-orb-item group relative flex flex-col items-center overflow-visible py-[1px]"
                  style={{ minHeight: itemBlockHeight }}
                  aria-pressed={selected}
                  aria-label={item.label}
                >
                  {/* 오브 컨테이너 — SVG가 원형 배경을 포함하므로 래퍼는 최소한 */}
                  <div
                    className="lag-orb-icon relative"
                    style={{ width: orbSize, height: orbSize, flexShrink: 0 }}
                  >
                    {/* 선택 글로우 — 배경에서 숨쉬는 금빛 광원 */}
                    <motion.div
                      className="pointer-events-none absolute rounded-full"
                      animate={
                        selected
                          ? { opacity: [0.35, 0.75, 0.35], scale: [0.95, 1.25, 0.95] }
                          : { opacity: 0, scale: 1 }
                      }
                      transition={
                        selected
                          ? { duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatType: "loop" }
                          : { duration: 0.28 }
                      }
                      style={{
                        inset: -18,
                        background: "radial-gradient(circle, color-mix(in srgb, var(--lag-focus) 40%, transparent), transparent 72%)",
                        filter: "blur(4px)",
                      }}
                    />

                    {/* 호버 시안 글로우 */}
                    <div
                      className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{
                        inset: -12,
                        background: "radial-gradient(circle, color-mix(in srgb, var(--lag-cyan) 18%, transparent), transparent 72%)",
                        filter: "blur(3px)",
                      }}
                    />

                    {/* 리플 클리핑 레이어 */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                      <AnimatePresence>
                        {ripples.map((r) => (
                          <motion.div
                            key={r.id}
                            className="absolute inset-0 rounded-full"
                            style={{ background: "color-mix(in srgb, var(--lag-focus) 40%, transparent)" }}
                            initial={{ scale: 0.3, opacity: 0.75 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            exit={{}}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    <div
                      className="grid h-full w-full place-items-center rounded-full"
                      style={{
                        background: selected ? "var(--lag-panel)" : "var(--lag-panel-2)",
                        border: `1px solid ${selected ? "var(--lag-focus)" : "var(--lag-border)"}`,
                        boxShadow: selected ? "0 0 0 4px color-mix(in srgb, var(--lag-focus) 12%, transparent)" : "none",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <span
                        className="select-none font-semibold tracking-[0.14em]"
                        style={{
                          fontSize: Math.max(10, Math.round(orbSize * 0.24)),
                          color: selected ? "var(--lag-text)" : "var(--lag-text-2)",
                          lineHeight: 1,
                        }}
                      >
                        {item.slotLabel}
                      </span>
                    </div>
                  </div>

                  {/* 레이블 */}
                  <motion.span
                    animate={selected ? { opacity: 1 } : { opacity: 0.60 }}
                    className="lag-orb-label flex items-center justify-center text-center text-xs uppercase tracking-[0.26em]"
                    style={{
                      marginTop: labelGap,
                      minHeight: labelHeight + labelPaddingY * 2,
                      lineHeight: 1.2,
                      paddingInline: 4,
                      paddingBlock: labelPaddingY,
                      color: selected ? "var(--lag-text)" : "var(--lag-meta)",
                      textShadow: selected ? "0 0 10px color-mix(in srgb, var(--lag-focus) 35%, transparent)" : "none",
                    }}
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
