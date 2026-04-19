"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { MainNavId } from "@/entities/nav";
import { MOTION } from "@/shared/lib/motion";
import { UI_CONSTS } from "@/shared/lib/uiConsts";

import IconSlot from "@/shared/ui/IconSlot";

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

type Ripple = { id: number };

export default function OrbNav({ items, selectedId, onSelect, zIndex, onFocus }: OrbNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

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
    // 리플이 사라진 후 정리
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650);
  };

  return (
    <div
      className="relative flex h-full items-center justify-center"
      onPointerDownCapture={onFocus}
      style={zIndex ? { zIndex } : undefined}
    >
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-full px-3"
        style={{
          width: UI_CONSTS.layout.centerWidth,
          height: viewportHeight + framePaddingY * 2,
          border: "1px solid rgba(82,127,214,0.22)",
          background: "rgba(8,12,24,0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: [
            "inset 0 0 0 1px rgba(120,160,255,0.08)",
            "inset 0 0 60px rgba(0,0,0,0.40)",
            "0 0 0 1px rgba(82,127,214,0.10)",
            "0 0 44px rgba(82,127,214,0.14)",
          ].join(", "),
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
                  onClick={() => {
                    addRipple();
                    onSelect(item.id);
                  }}
                  // 선택 → 살짝 줄어드는 스냅, 호버 → 올라오는 느낌
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{
                    layout: { type: "tween", duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                    scale:  { type: "spring", stiffness: 480, damping: 24 },
                  }}
                  className="group relative flex flex-col items-center overflow-visible py-[1px]"
                  style={{ minHeight: itemBlockHeight }}
                  aria-pressed={selected}
                  aria-label={item.label}
                >
                  {/* ── 선택 글로우 — framer-motion 키프레임으로 숨쉬기 ── */}
                  <motion.div
                    className="absolute rounded-full"
                    animate={
                      selected
                        ? { opacity: [0.55, 1, 0.55], scale: [0.88, 1.14, 0.88] }
                        : { opacity: 0, scale: 1 }
                    }
                    transition={
                      selected
                        ? {
                            duration: 2.8,
                            repeat: Infinity,
                            ease: "easeInOut",
                            repeatType: "loop",
                          }
                        : { duration: 0.28 }
                    }
                    style={{
                      width: orbSize + 20,
                      height: orbSize + 20,
                      background:
                        "radial-gradient(circle, rgba(248,201,87,0.30) 0%, rgba(248,201,87,0.12) 50%, rgba(248,201,87,0) 75%)",
                      filter: "blur(2px)",
                    }}
                  />

                  {/* ── 오브 컨테이너 (테두리 + 리플 + 아이콘) ────────── */}
                  <div
                    className="relative rounded-full p-[4px]"
                    style={{
                      border: selected
                        ? "1px solid rgba(249, 208, 105, 0.9)"
                        : "1px solid rgba(229, 236, 246, 0.68)",
                      boxShadow: selected
                        ? "0 0 0 1px rgba(248,197,78,0.35), 0 0 22px rgba(247,196,70,0.20)"
                        : "0 0 0 1px rgba(255,255,255,0.03)",
                      background: selected
                        ? "rgba(248,197,78,0.06)"
                        : "rgba(0,0,0,0.22)",
                      transition: "border 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
                    }}
                  >
                    {/* 클릭 리플 — overflow hidden으로 잘림 */}
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                    >
                      <AnimatePresence>
                        {ripples.map((r) => (
                          <motion.div
                            key={r.id}
                            className="absolute inset-0 rounded-full"
                            style={{ background: "rgba(248,197,78,0.40)" }}
                            initial={{ scale: 0.3, opacity: 0.8 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            exit={{}}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    <IconSlot
                      label={item.slotLabel}
                      active={selected}
                      size={UI_CONSTS.orbNav.orbSize}
                    />
                  </div>

                  {/* ── 레이블 ──────────────────────────────────────────── */}
                  <motion.span
                    animate={selected ? { opacity: 1 } : { opacity: 0.72 }}
                    className="flex items-center justify-center text-center text-xs uppercase tracking-[0.28em]"
                    style={{
                      marginTop: labelGap,
                      minHeight: labelHeight + labelPaddingY * 2,
                      lineHeight: 1.2,
                      paddingInline: 4,
                      paddingBlock: labelPaddingY,
                      color: selected
                        ? "rgba(248, 220, 152, 0.95)"
                        : "rgba(220, 228, 240, 0.72)",
                      transition: "color 0.25s ease",
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
