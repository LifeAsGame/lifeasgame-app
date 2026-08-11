"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { MainNavId } from "@/entities/nav";
import { MOTION } from "@/shared/lib/motion";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import { SAO_ICON } from "@/shared/design/tokens";
import { usePanScroll } from "@/shared/hooks/usePanScroll";

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

// 기본 (비선택) 아이콘 — 흰 원 + 회색 픽토그램
const ORB_ICONS: Partial<Record<MainNavId, string>> = {
  player:    SAO_ICON.player,
  skills:    SAO_ICON.skills,
  inventory: SAO_ICON.items,
  quests:    SAO_ICON.quest,
  role:      SAO_ICON.social,
  social:    SAO_ICON.social,
  lifelog:   SAO_ICON.lifelog,
  market:    SAO_ICON.market,
  system:    SAO_ICON.config,
};

// 선택 상태 아이콘 — 금색 원 + 흰 픽토그램
const ORB_ICONS_ON: Partial<Record<MainNavId, string>> = {
  player:    SAO_ICON.playerOn,
  skills:    SAO_ICON.skillsOn,
  inventory: SAO_ICON.itemsOn,
  quests:    SAO_ICON.questOn,
  role:      SAO_ICON.socialOn,
  social:    SAO_ICON.socialOn,
  lifelog:   SAO_ICON.lifelogOn,
  market:    SAO_ICON.marketOn,
  system:    SAO_ICON.configOn,
};

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
        className="relative flex items-center justify-center overflow-hidden px-3"
        style={{
          width: UI_CONSTS.layout.centerWidth,
          height: viewportHeight + framePaddingY * 2,
          borderRadius: "18px",
          border: "1px solid rgba(200,165,50,0.42)",
          background: "linear-gradient(155deg, rgba(16,14,10,0.97), rgba(12,10,7,0.96))",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: [
            "inset 0 0 0 1px rgba(218,178,55,0.07)",
            "0 20px 50px rgba(0,0,0,0.78)",
          ].join(", "),
        }}
      >
        {/* 시안 탑 액센트 */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0, left: "12%", right: "12%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(218,178,60,0.55) 40%, rgba(218,178,60,0.55) 60%, transparent)",
            pointerEvents: "none",
          }}
        />
        {/* 바텀 액센트 */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 0, left: "12%", right: "12%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(180,145,45,0.22) 40%, rgba(180,145,45,0.22) 60%, transparent)",
            pointerEvents: "none",
          }}
        />

        <div
          ref={scrollRef}
          data-no-pan
          className="scrollbar-hide relative w-full overflow-y-auto overflow-x-hidden"
          style={{ height: viewportHeight, scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <motion.div
            initial={{ opacity: 0.96 }}
            animate={{ opacity: 1 }}
            transition={MOTION.orbTrack.transition}
            className="flex flex-col items-center"
            style={{ paddingTop: safePaddingY, paddingBottom: safePaddingY, gap: orbGap }}
          >
            {items.map((item) => {
              const selected = item.id === selectedId;
              const iconSrc    = ORB_ICONS[item.id];
              const iconSrcOn  = ORB_ICONS_ON[item.id];
              const activeSrc  = selected ? (iconSrcOn ?? iconSrc) : iconSrc;

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
                  className="group relative flex flex-col items-center overflow-visible py-[1px]"
                  style={{ minHeight: itemBlockHeight }}
                  aria-pressed={selected}
                  aria-label={item.label}
                >
                  {/* 오브 컨테이너 — SVG가 원형 배경을 포함하므로 래퍼는 최소한 */}
                  <div
                    className="relative"
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
                        background: "radial-gradient(circle, rgba(248,180,40,0.40) 0%, rgba(248,180,40,0.14) 48%, rgba(248,180,40,0) 72%)",
                        filter: "blur(4px)",
                      }}
                    />

                    {/* 호버 시안 글로우 */}
                    <div
                      className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{
                        inset: -12,
                        background: "radial-gradient(circle, rgba(220,200,140,0.18) 0%, rgba(200,178,90,0.06) 50%, transparent 72%)",
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
                            style={{ background: "rgba(248,197,78,0.40)" }}
                            initial={{ scale: 0.3, opacity: 0.75 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            exit={{}}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* 아이콘 이미지 — SVG에 원형 배경 내장, 필터 없이 원본 색상 사용 */}
                    {activeSrc ? (
                      <img
                        src={activeSrc}
                        alt={item.label}
                        width={orbSize}
                        height={orbSize}
                        draggable={false}
                        style={{
                          display: "block",
                          width: orbSize,
                          height: orbSize,
                          opacity: selected ? 1 : 0.72,
                          transition: "opacity 0.28s ease",
                          position: "relative",
                          zIndex: 1,
                        }}
                        onError={(e) => {
                          // SVG 로드 실패 시 텍스트 레이블로 대체
                          const img = e.currentTarget;
                          const span = document.createElement("span");
                          span.textContent = item.slotLabel;
                          span.style.cssText = [
                            `width:${orbSize}px`,
                            `height:${orbSize}px`,
                            "display:grid",
                            "place-items:center",
                            "border-radius:9999px",
                            `background:${selected ? "rgba(248,197,78,0.15)" : "rgba(0,40,90,0.55)"}`,
                            `border:1px solid ${selected ? "rgba(249,208,105,0.70)" : "rgba(0,155,215,0.32)"}`,
                            `font-size:${Math.max(10, Math.round(orbSize * 0.22))}px`,
                            "font-weight:600",
                            "letter-spacing:0.12em",
                            `color:${selected ? "rgba(255,235,184,0.95)" : "rgba(200,220,245,0.80)"}`,
                            "position:relative",
                            "z-index:1",
                          ].join(";");
                          img.parentElement?.replaceChild(span, img);
                        }}
                      />
                    ) : (
                      // iconSrc가 없는 경우 텍스트 레이블
                      <div
                        className="grid place-items-center rounded-full"
                        style={{
                          width: orbSize,
                          height: orbSize,
                          background: selected
                            ? "radial-gradient(circle, rgba(255,215,100,0.20), rgba(248,197,78,0.08) 60%, transparent)"
                            : "radial-gradient(circle, rgba(0,70,150,0.30), rgba(0,30,80,0.14) 60%, transparent)",
                          border: `1px solid ${selected ? "rgba(249,208,105,0.70)" : "rgba(0,155,215,0.32)"}`,
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        <span
                          className="select-none font-semibold tracking-[0.14em]"
                          style={{
                            fontSize: Math.max(10, Math.round(orbSize * 0.24)),
                            color: selected ? "rgba(255,235,184,0.95)" : "rgba(200,220,245,0.80)",
                            lineHeight: 1,
                          }}
                        >
                          {item.slotLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 레이블 */}
                  <motion.span
                    animate={selected ? { opacity: 1 } : { opacity: 0.60 }}
                    className="flex items-center justify-center text-center text-xs uppercase tracking-[0.26em]"
                    style={{
                      marginTop: labelGap,
                      minHeight: labelHeight + labelPaddingY * 2,
                      lineHeight: 1.2,
                      paddingInline: 4,
                      paddingBlock: labelPaddingY,
                      color: selected ? "rgba(242,220,148,0.96)" : "rgba(175,162,122,0.72)",
                      textShadow: selected ? "0 0 10px rgba(248,200,100,0.35)" : "none",
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
