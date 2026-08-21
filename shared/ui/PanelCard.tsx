"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

import { useLongPress } from "@/shared/hooks/useLongPress";
import { SAO, SAO_ICON } from "@/shared/design/tokens";

const RARITY_KEYS = Object.keys(SAO.color.rarity) as Array<keyof typeof SAO.color.rarity>;
function rarityColor(text: string): string | undefined {
  const key = RARITY_KEYS.find((k) => k === text);
  return key ? SAO.color.rarity[key] : undefined;
}
import { MOTION } from "@/shared/lib/motion";
import type { PanelItemAction } from "@/entities/nav";
import { UI_CONSTS } from "@/shared/lib/uiConsts";

import IconSlot from "@/shared/ui/IconSlot";

type PanelCardProps = {
  label: string;
  slotLabel: string;
  subtitle?: string;
  selected?: boolean;
  centerTarget?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
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
  if (type === "claim")  return { bg: "#16a34a",               icon: SAO_ICON.start,   iconFallback: "↓" };
  if (type === "start")  return { bg: SAO.color.action.blue,  icon: SAO_ICON.start,   iconFallback: "▶" };
  if (type === "sell")   return { bg: "#ca8a04",               icon: SAO_ICON.details, iconFallback: "₩" };
  return { bg: "#64748b", icon: SAO_ICON.list, iconFallback: "…" };
}

const SWIPE_DELETE_THRESHOLD = -80;
const SWIPE_MAX = -120;
const SWIPE_DETECT_X = 20;    // px horizontal before entering swipe phase
const SWIPE_LOCK_RATIO = 1.2; // |dx| must be this * |dy| to lock horizontal

export default function PanelCard({
  label,
  slotLabel,
  subtitle,
  selected = false,
  centerTarget = false,
  compact = false,
  onClick,
  onDoubleClick,
  disabled = false,
  index = 0,
  actions,
  onAction,
}: PanelCardProps) {
  const isInteractive = Boolean(onClick) && !disabled;
  const hasActions = Boolean(actions?.length && onAction);
  const hasDelete = actions?.some((a) => a.type === "delete");

  const [showActions, setShowActions] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Swipe-left state
  const [swipeX, setSwipeX] = useState(0);
  const swipePhaseRef = useRef<"idle" | "swiping" | "scrolling">("idle");
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const longPress = useLongPress(() => {
    if (hasActions) {
      setIsLongPressing(false);
      setShowActions(true);
    }
  }, 600);

  // Single + double click detection via 300ms timer
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClickRef = useRef(0);
  // Set when a swipe fires, prevents the subsequent click event
  const swipeFiredRef = useRef(false);

  const resetSwipe = () => {
    setSwipeX(0);
    swipePhaseRef.current = "idle";
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!hasActions && !onDoubleClick) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    swipePhaseRef.current = "idle";
    if (hasActions) {
      setIsLongPressing(true);
      longPress.onPointerDown(e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const phase = swipePhaseRef.current;

    if (phase === "idle") {
      // Cancel long press if moved more than 5px
      if (Math.sqrt(dx * dx + dy * dy) >= 5 && hasActions) {
        setIsLongPressing(false);
        longPress.onPointerCancel(e);
      }
      // Enter swiping phase for left swipe
      if (hasDelete && dx < -SWIPE_DETECT_X && Math.abs(dx) > Math.abs(dy) * SWIPE_LOCK_RATIO) {
        swipePhaseRef.current = "swiping";
        e.stopPropagation();
      } else if (Math.abs(dy) > SWIPE_DETECT_X && Math.abs(dy) > Math.abs(dx)) {
        // Primarily vertical — let EdgeFadeScrollArea handle it
        swipePhaseRef.current = "scrolling";
      }
    } else if (phase === "swiping") {
      e.stopPropagation();
      setSwipeX(Math.max(dx, SWIPE_MAX));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsLongPressing(false);
    const phase = swipePhaseRef.current;
    const currentSwipeX = swipeX;
    resetSwipe();
    pointerStartRef.current = null;

    if (phase === "swiping") {
      swipeFiredRef.current = true;
      if (currentSwipeX <= SWIPE_DELETE_THRESHOLD) {
        onAction?.("delete");
      }
      return;
    }

    longPress.onPointerUp(e);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    setIsLongPressing(false);
    resetSwipe();
    pointerStartRef.current = null;
    longPress.onPointerLeave(e);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsLongPressing(false);
    resetSwipe();
    pointerStartRef.current = null;
    longPress.onPointerCancel(e);
  };

  const handleClick = () => {
    if (swipeFiredRef.current) { swipeFiredRef.current = false; return; }
    if (longPress.didLongPress()) return;

    if (!onDoubleClick) {
      onClick?.();
      return;
    }

    // Delayed single-click / immediate double-click detection
    pendingClickRef.current += 1;
    if (pendingClickRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        pendingClickRef.current = 0;
        onClick?.();
      }, 300);
    } else {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      pendingClickRef.current = 0;
      onDoubleClick();
    }
  };

  const handleActionClick = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    setShowActions(false);
    onAction?.(type);
  };

  const swipeDeleteProgress = Math.min(Math.abs(swipeX) / Math.abs(SWIPE_DELETE_THRESHOLD), 1);
  const showSwipeHint = swipeX < -10;
  const swipeTriggered = swipeX <= SWIPE_DELETE_THRESHOLD;

  return (
    <motion.div
      layout="position"
      data-drag-scroll-allow
      data-scroll-center-target={centerTarget ? "true" : undefined}
      className="relative overflow-hidden"
      initial={MOTION.listItem.initial}
      animate={MOTION.listItem.animate}
      exit={MOTION.listItem.exit}
      transition={{
        ...MOTION.listItem.transition,
        delay: index * 0.045,
        layout: { type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      {/* Swipe-left delete hint — revealed behind the card */}
      {hasDelete ? (
        <div
          className="absolute inset-0 flex items-center justify-end"
          style={{
            background: `color-mix(in srgb, var(--lag-state-error) ${82 + swipeDeleteProgress * 18}%, transparent)`,
            paddingRight: 20,
          }}
          aria-hidden
        >
          <motion.div
            animate={{
              opacity: showSwipeHint ? 1 : 0,
              scale: swipeTriggered ? 1.2 : 1,
            }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-1"
          >
            <img
              src={SAO_ICON.minus}
              alt="delete"
              width={24}
              height={24}
              draggable={false}
              style={{ filter: "brightness(0) invert(1)" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <span style={{ fontSize: "9px", color: "#fff", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              {swipeTriggered ? "Release!" : "Delete"}
            </span>
          </motion.div>
        </div>
      ) : null}

      {/* Card — shifts left during swipe */}
      <motion.div
        animate={{ x: swipeX }}
        transition={
          swipePhaseRef.current === "swiping"
            ? { type: "tween", duration: 0 }
            : { type: "spring", stiffness: 400, damping: 32 }
        }
      >
        <motion.button
          type="button"
          data-drag-scroll-allow
          draggable={false}
          disabled={!isInteractive && !hasActions && !onDoubleClick}
          onClick={handleClick}
          onPointerDown={(hasActions || hasDelete || onDoubleClick) ? handlePointerDown : undefined}
          onPointerMove={(hasActions || hasDelete || onDoubleClick) ? handlePointerMove : undefined}
          onPointerUp={(hasActions || hasDelete || onDoubleClick) ? handlePointerUp : undefined}
          onPointerLeave={(hasActions || hasDelete || onDoubleClick) ? handlePointerLeave : undefined}
          onPointerCancel={(hasActions || hasDelete || onDoubleClick) ? handlePointerCancel : undefined}
          whileTap={isInteractive ? { scale: 0.97 } : undefined}
          aria-pressed={selected}
          transition={{ type: "spring", stiffness: 480, damping: 28 }}
          className={[
            "group relative flex w-full items-center gap-4 overflow-hidden",
            "border text-left",
            "lag-panel-card sao-card-shimmer",
            isInteractive || hasActions || onDoubleClick ? "cursor-pointer" : "cursor-default",
          ].join(" ")}
          style={{
            height: UI_CONSTS.rightPanels.rowHeight,
            borderRadius: "var(--lag-radius-sm)",
            background: showActions
              ? "var(--lag-personal)"
              : selected
              ? "var(--lag-selected-surface)"
              : "var(--lag-control-bg)",
            borderColor: showActions
              ? "var(--lag-focus)"
              : isLongPressing
              ? "var(--lag-focus)"
              : selected
              ? "var(--lag-state-selected)"
              : "var(--lag-control-border)",
            boxShadow: selected
              ? "0 0 0 1px var(--lag-state-selected)"
              : isLongPressing
              ? "0 0 0 2px color-mix(in srgb, var(--lag-focus) 30%, transparent)"
              : "none",
            transition: "border-color var(--lag-motion-normal) ease, background-color var(--lag-motion-normal) ease, box-shadow var(--lag-motion-normal) ease",
          }}
        >
          <div
            className="absolute inset-y-0 left-0 w-[4px]"
            style={{
              borderRadius: "0 3px 3px 0",
              background: selected
                ? "var(--lag-state-selected)"
                : showActions
                ? "var(--lag-focus)"
                : "var(--lag-divider)",
              boxShadow: selected
                ? "0 0 8px color-mix(in srgb, var(--lag-state-selected) 50%, transparent)"
                : showActions
                ? "0 0 8px color-mix(in srgb, var(--lag-focus) 40%, transparent)"
                : "none",
            }}
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
                color: selected ? "var(--lag-text)" : "var(--lag-text-2)",
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
                  color: rarityColor(subtitle) ?? (selected ? "var(--lag-text-2)" : "var(--lag-meta)"),
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
      </motion.div>

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
              className="absolute inset-0 z-[400001] flex items-center justify-end gap-2 overflow-hidden border"
              style={{
                borderRadius: "9px",
                background: "var(--lag-raised-surface)",
                borderColor: "var(--lag-focus)",
                boxShadow: "0 0 20px color-mix(in srgb, var(--lag-shadow) 20%, transparent)",
                paddingInline: 12,
              }}
            >
              <span
                className="mr-auto uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}
              >
                Action
              </span>
              {actions!.map((action, i) => {
                const style = actionStyle(action.type);
                return (
                  <motion.button
                    key={action.type}
                    type="button"
                    initial={MOTION.actionPop.initial}
                    animate={MOTION.actionPop.animate}
                    exit={MOTION.actionPop.exit}
                    transition={{
                      ...MOTION.actionPop.transition,
                      delay: i * 0.07,
                    }}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.90 }}
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
