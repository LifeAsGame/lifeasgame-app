import { SAO, GOLD_BTN_STYLE, SAO_ICON } from "@/shared/design/tokens";
import type { MainNavId } from "@/entities/nav";

export function getFrameStyle(depth: number) {
  const bg =
    depth === 0
      ? "linear-gradient(155deg, rgba(18,18,20,0.96), rgba(14,14,16,0.94))"
      : depth === 1
      ? "linear-gradient(155deg, rgba(16,16,18,0.94), rgba(12,12,14,0.92))"
      : "linear-gradient(155deg, rgba(14,14,16,0.92), rgba(10,10,12,0.90))";

  const borderAlpha = depth === 0 ? 0.26 : depth === 1 ? 0.20 : 0.15;
  const shadowAlpha = depth === 0 ? 0.10 : depth === 1 ? 0.06 : 0.04;

  return {
    background: bg,
    border: `1px solid rgba(200,200,205,${borderAlpha})`,
    boxShadow: [
      `inset 0 0 0 1px rgba(255,255,255,0.04)`,
      `0 0 0 1px rgba(0,0,0,${shadowAlpha})`,
      `0 14px 40px rgba(0,0,0,0.65)`,
    ].join(", "),
    borderRadius: SAO.radius.panel,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };
}

export const D = {
  text:    "rgba(228,228,232,0.92)",
  textSub: "rgba(170,170,178,0.82)",
  label:   "rgba(135,135,145,0.85)",
} as const;

export const cellStyle = {
  background: "rgba(0,0,0,0.22)",
  border: "1px solid rgba(200,200,205,0.14)",
  borderRadius: SAO.radius.panel,
} as const;

export const actionBtnStyle = {
  ...GOLD_BTN_STYLE,
  padding: "8px 12px",
  fontSize: "0.7rem",
  width: "100%",
  display: "block",
} as const;

export const NAV_ICONS: Partial<Record<MainNavId, string>> = {
  player:    SAO_ICON.player,
  skills:    SAO_ICON.skills,
  inventory: SAO_ICON.items,
  quests:    SAO_ICON.quest,
  social:    SAO_ICON.social,
  lifelog:   SAO_ICON.lifelog,
  market:    SAO_ICON.market,
  system:    SAO_ICON.config,
};
