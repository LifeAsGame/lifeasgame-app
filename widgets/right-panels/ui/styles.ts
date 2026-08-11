import { GOLD_BTN_STYLE, SAO_ICON } from "@/shared/design/tokens";
import type { MainNavId } from "@/entities/nav";

export function getFrameStyle(depth: number) {
  const baseR = depth === 0 ? "16,14,10" : depth === 1 ? "14,12,9" : "12,10,7";
  const bgA   = depth === 0 ? 0.97 : depth === 1 ? 0.94 : 0.91;
  const borderA = depth === 0 ? 0.42 : depth === 1 ? 0.30 : 0.22;

  return {
    background: `linear-gradient(155deg, rgba(${baseR},${bgA}), rgba(${baseR},${bgA - 0.02}))`,
    border: `1px solid rgba(200,165,50,${borderA})`,
    boxShadow: [
      `inset 0 0 0 1px rgba(218,178,55,0.06)`,
      `0 0 0 1px rgba(0,0,0,0.35)`,
      `0 22px 55px rgba(0,0,0,0.80)`,
    ].join(", "),
    borderRadius: "6px",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };
}

export const D = {
  text:    "rgba(235,218,175,0.96)",
  textSub: "rgba(185,170,132,0.88)",
  label:   "rgba(148,135,98,0.80)",
} as const;

export const cellStyle = {
  background: "rgba(218,178,55,0.07)",
  border: "1px solid rgba(200,165,50,0.28)",
  borderRadius: "18px",
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
  role:      SAO_ICON.social,
  social:    SAO_ICON.social,
  lifelog:   SAO_ICON.lifelog,
  market:    SAO_ICON.market,
  system:    SAO_ICON.config,
};
