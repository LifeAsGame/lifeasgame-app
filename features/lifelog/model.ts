import type { LifelogSubId, PanelDataItem, PanelMenuItem } from "@/entities/nav";
import { CRUD_ACTIONS, pad, uniqueOrderedCats, catMenuItems } from "@/entities/nav";
import { MEDIA_DATA } from "./data";

export * from "./forms";

type LegacySourceLifelogSubId = Extract<LifelogSubId, "media">;

export const LIFELOG_LISTS: Record<LegacySourceLifelogSubId, PanelDataItem[]> = {
  media: MEDIA_DATA.map((m, i) => ({
    id: `lifelog-media-${pad(i + 1, 3)}`,
    label: m.title,
    slotLabel: m.cat.slice(0, 2).toUpperCase(),
    subtitle: `${m.cat} | ${m.status}${m.rating !== null ? ` | ★${m.rating}` : ""}`,
    category: m.cat,
    detailTitle: "Media Log Detail",
    detailDescription: `${m.title} — ${m.cat}`,
    detailRows: [
      `Type: ${m.cat}`,
      `Status: ${m.status}`,
      `Progress: ${m.cur}/${m.total}`,
      m.rating !== null ? `Rating: ★${m.rating}` : `Not rated yet`,
    ],
    actions: CRUD_ACTIONS,
  })),
};

export const LIFELOG_CATEGORY_ITEMS: Record<LegacySourceLifelogSubId, PanelMenuItem[]> = {
  media:      catMenuItems(uniqueOrderedCats(MEDIA_DATA)),
};
