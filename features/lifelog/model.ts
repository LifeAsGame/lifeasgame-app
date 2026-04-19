import type { LifelogSubId, PanelDataItem, PanelMenuItem } from "@/entities/nav";
import { CRUD_ACTIONS, pad, uniqueOrderedCats, catMenuItems } from "@/entities/nav";
import { COLLECTION_DATA, MEDIA_DATA, EXERCISE_DATA } from "./data";

export * from "./forms";

export const LIFELOG_LISTS: Record<LifelogSubId, PanelDataItem[]> = {
  collection: COLLECTION_DATA.map((c, i) => ({
    id: `lifelog-collection-${pad(i + 1, 3)}`,
    label: c.title,
    slotLabel: c.cat.slice(0, 2).toUpperCase(),
    subtitle: `${c.cat} | Qty: ${c.qty} | ${c.cond}`,
    category: c.cat,
    detailTitle: "Collection Detail",
    detailDescription: `${c.title} — ${c.cat}`,
    detailRows: [
      `Category: ${c.cat}`,
      `Quantity: ${c.qty}`,
      `Condition: ${c.cond}`,
      `Source: ${c.from}`,
    ],
    actions: CRUD_ACTIONS,
  })),
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
  exercise: EXERCISE_DATA.map((e, i) => ({
    id: `lifelog-exercise-${pad(i + 1, 3)}`,
    label: `${e.cat} — ${e.date}`,
    slotLabel: e.cat.slice(0, 2).toUpperCase(),
    subtitle: `${e.dur}min | ${e.cal} kcal${e.dist !== null ? ` | ${e.dist}km` : ""}`,
    category: e.cat,
    detailTitle: "Exercise Detail",
    detailDescription: `${e.cat} session on ${e.date}.`,
    detailRows: [
      `Category: ${e.cat}`,
      `Duration: ${e.dur} min`,
      `Calories Burned: ${e.cal} kcal`,
      e.dist !== null ? `Distance: ${e.dist} km` : `No distance tracked`,
    ],
    actions: CRUD_ACTIONS,
  })),
};

export const LIFELOG_CATEGORY_ITEMS: Record<LifelogSubId, PanelMenuItem[]> = {
  collection: catMenuItems(uniqueOrderedCats(COLLECTION_DATA)),
  media:      catMenuItems(uniqueOrderedCats(MEDIA_DATA)),
  exercise:   catMenuItems(uniqueOrderedCats(EXERCISE_DATA)),
};
