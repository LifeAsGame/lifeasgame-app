import type { PlayerSubId, PanelDataItem, PanelMenuItem } from "@/entities/nav";
import { CRUD_ACTIONS, pad, uniqueOrderedCats, catMenuItems } from "@/entities/nav";
import { HOBBY_DATA } from "./data";

export * from "./forms";

type LegacyPlayerSubId = Exclude<PlayerSubId, "achievement" | "credentials" | "title">;

export const PLAYER_LISTS: Record<LegacyPlayerSubId, PanelDataItem[]> = {
  interests: HOBBY_DATA.map((h, i) => ({
    id: `hobby-${pad(i + 1, 3)}`,
    label: h.custom,
    slotLabel: h.cat.slice(0, 2).toUpperCase(),
    subtitle: `${h.cat} | Proficiency: ${h.proficiency}/100 | ${h.status}`,
    category: h.cat,
    detailTitle: "Interest Detail",
    detailDescription: `${h.name} — ${h.custom}`,
    detailRows: [
      `Category: ${h.cat}`,
      `Status: ${h.status}`,
      `Proficiency: ${h.proficiency}/100`,
      `XP: ${h.xp.toLocaleString()}`,
    ],
    actions: CRUD_ACTIONS,
  })),
};

export const PLAYER_CATEGORY_ITEMS: Record<LegacyPlayerSubId, PanelMenuItem[]> = {
  interests:   catMenuItems(uniqueOrderedCats(HOBBY_DATA)),
};
