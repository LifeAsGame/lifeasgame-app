import { GOLD_BTN_STYLE, SAO_ICON } from "@/shared/design/tokens";
import type { MainNavId } from "@/entities/nav";

export function getFrameBackground(depth: number) {
  return depth === 0 ? "var(--lag-panel)" : depth === 1 ? "var(--lag-panel-2)" : "var(--lag-personal)";
}

export function getFrameStyle(depth: number) {
  const background = getFrameBackground(depth);

  return {
    background,
    border: "1px solid var(--lag-border)",
    boxShadow: "0 18px 40px color-mix(in srgb, var(--lag-shadow) 24%, transparent)",
    borderRadius: "var(--lag-radius-md)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };
}

export const D = {
  text:    "var(--lag-text)",
  textSub: "var(--lag-text-2)",
  label:   "var(--lag-text-2)",
} as const;

export const cellStyle = {
  background: "var(--lag-paper)",
  border: "1px solid var(--lag-border)",
  borderRadius: "var(--lag-radius-sm)",
} as const;

export const actionBtnStyle = {
  ...GOLD_BTN_STYLE,
  background: "var(--lag-panel-2)",
  color: "var(--lag-text)",
  border: "1px solid var(--lag-focus)",
  borderRadius: "var(--lag-radius-sm)",
  boxShadow: "none",
  padding: "8px 12px",
  fontSize: "0.7rem",
  width: "100%",
  display: "block",
} as const;

export const NAV_ICONS: Partial<Record<MainNavId, string>> = {
  player:    SAO_ICON.player,
  inventory: SAO_ICON.items,
  quests:    SAO_ICON.quest,
  role:      SAO_ICON.social,
  lifelog:   SAO_ICON.lifelog,
  market:    SAO_ICON.market,
  system:    SAO_ICON.config,
};
