"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

import { useLongPress } from "@/hooks/useLongPress";
import { SAO, SAO_ICON } from "@/lib/design/tokens";

const RARITY_KEYS = Object.keys(SAO.color.rarity) as Array<keyof typeof SAO.color.rarity>;
function rarityColor(text: string): string | undefined {
  const key = RARITY_KEYS.find((k) => k === text);
  return key ? SAO.color.rarity[key] : undefined;
}
import { MOTION } from "@/lib/motion";
import type { PanelItemAction } from "@/lib/nav";
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
  actions?: PanelItemAction[];
  onAction?: (type: string) => void;
};

type ActionStyle = { bg: string; icon: string; iconFallback: string };

function actionStyle(type: string): ActionStyle {
  if (type === "edit")    return { bg: SAO.color.action.gold,  icon: SAO_ICON.details, iconFallback: "✎" };
  if (type === "equip")   return { bg: SAO.color.action.blue,  icon: SAO_ICON.start,   iconFallback: "▶" };
  if (type === "delete")  return { bg: SAO.color.action.red,   icon: SAO_ICON.minus,   iconFallback: "−" };
  if (type === "cancel")  return { bg: SAO.color.action.red,   icon: SAO_ICON.cancel,  iconFallback: "✕" };
  if (type === "unequip") return { bg: "#64748b",               icon: SAO_ICON.cancel,  iconFallback: "↩" };
  if (type === "gift")    return { bg: SAO.color.action.gold,  icon: SAO_ICON.details, iconFallback: "♦" };
  return { bg: "#64748b", icon: SAO_ICON.list, iconFallback: "…" };
}

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
  actions,
  onAction,
}: PanelCardProps) {
  const isInteractive = Boolean(onClick) && !disabled;
  const hasActions = Boolean(actions?.length && onAction);
  const [showActions, setShowActions] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const longPress = useLongPress(() => {
    if (hasActions) {
      setIsLongPressing(false);
      setShowActions(true);
    }
  }, 600);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!hasActions) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setIsLongPressing(true);
    longPress.onPointerDown(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!hasActions || !pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) >= 5) {
      setIsLongPressing(false);
      pointerStartRef.current = null;
      longPress.onPointerCancel(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsLongPressing(false);
    pointerStartRef.current = null;
    longPress.onPointerUp(e);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    setIsLongPressing(false);
    pointerStartRef.current = null;
    longPress.onPointerLeave(e);
  };

  const handleClick = () => {
    if (longPress.didLongPress()) return;
    onClick?.();
  };

  const handleActionClick = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    setShowActions(false);
    onAction?.(type);
  };

  return (
    <motion.div
      layout="position"
      data-drag-scroll-allow
      data-scroll-center-target={centerTarget ? "true" : undefined}
      className="relative"
      initial={MOTION.listItem.initial}
      animate={MOTION.listItem.animate}
      exit={MOTION.listItem.exit}
      transition={{
        ...MOTION.listItem.transition,
        delay: index * 0.045,
        layout: { type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <motion.button
        type="button"
        data-drag-scroll-allow
        draggable={false}
        disabled={!isInteractive && !hasActions}
        onClick={handleClick}
        onPointerDown={hasActions ? handlePointerDown : undefined}
        onPointerMove={hasActions ? handlePointerMove : undefined}
        onPointerUp={hasActions ? handlePointerUp : undefined}
        onPointerLeave={hasActions ? handlePointerLeave : undefined}
        onPointerCancel={hasActions ? longPress.onPointerCancel : undefined}
        whileTap={isInteractive ? { scale: 0.995 } : undefined}
        className={[
          "group relative flex w-full items-center gap-4 overflow-hidden",
          "border text-left",
          isInteractive || hasActions ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
        style={{
          height: UI_CONSTS.rightPanels.rowHeight,
          background: showActions
            ? `rgba(255,198,68,0.10)`
            : selected
            ? "linear-gradient(180deg, rgba(255,198,68,0.97), rgba(240,178,44,0.96))"
            : "linear-gradient(180deg, rgba(244,247,253,0.97), rgba(237,242,250,0.95))",
          borderColor: showActions
            ? `rgba(249,208,105,0.7)`
            : isLongPressing
            ? `rgba(249,208,105,0.5)`
            : selected
            ? "rgba(255,215,80,0.85)"
            : "rgba(188,195,218,0.48)",
          boxShadow: selected
            ? `inset 0 0 0 1px rgba(255,222,100,0.4), 0 0 16px rgba(244,188,58,0.1)`
            : "inset 0 0 0 1px rgba(255,255,255,0.72)",
          transition: "border-color 0.6s ease, background 0.3s ease",
        }}
      >
        <div
          className="absolute inset-y-0 left-0 w-[5px]"
          style={{ background: selected ? "rgba(244,192,72,0.95)" : "rgba(175,182,208,0.52)" }}
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
              color: selected ? "rgba(15,14,10,0.92)" : "rgba(22,32,55,0.85)",
              fontSize: compact ? "0.9rem" : "1.1rem",
              lineHeight: compact ? 1.2 : 1.15,
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
                color: rarityColor(subtitle) ?? (selected ? "rgba(30,28,22,0.72)" : "rgba(78,92,128,0.68)"),
                display: "-webkit-box",
                WebkitLineClamp: compact ? 1 : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontWeight: rarityColor(subtitle) ? 600 : undefined,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </motion.button>

      {/* Long press action overlay */}
      <AnimatePresence>
        {showActions && hasActions ? (
          <>
            {/* Dismiss backdrop */}
            <div
              className="fixed inset-0 z-[400000]"
              onPointerDown={() => setShowActions(false)}
            />
            <motion.div
              key="action-overlay"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="absolute inset-0 z-[400001] flex items-center justify-end gap-2 overflow-hidden rounded-[2px] border"
              style={{
                background: "linear-gradient(180deg, rgba(248,249,251,0.98), rgba(240,243,249,0.97))",
                borderColor: `rgba(249,208,105,0.7)`,
                paddingInline: 12,
              }}
            >
              <span
                className="mr-auto uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(112,125,158,0.70)" }}
              >
                Action
              </span>
              {actions!.map((action, i) => {
                const style = actionStyle(action.type);
                return (
                  <motion.button
                    key={action.type}
                    type="button"
                    initial={{ scale: 0, opacity: 0, x: -10 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={{
                      delay: i * 0.06,
                      type: "spring",
                      stiffness: 400,
                      damping: 24,
                    }}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
                    style={{ background: style.bg }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleActionClick(e, action.type)}
                    title={action.label}
                  >
                    <img
                      src={style.icon}
                      alt={action.label}
                      width={22}
                      height={22}
                      draggable={false}
                      style={{ filter: "brightness(0) invert(1)" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const span = document.createElement("span");
                        span.textContent = style.iconFallback;
                        span.style.cssText = "color:#fff;font-size:1rem;font-weight:700;";
                        e.currentTarget.parentElement?.appendChild(span);
                      }}
                    />
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
