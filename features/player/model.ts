import type { PlayerSubId, PanelDataItem, PanelMenuItem } from "@/entities/nav";
import { CRUD_ACTIONS, pad, dateAt, uniqueOrderedCats, catMenuItems } from "@/entities/nav";
import { ACHIEVEMENT_DATA, CERTIFICATION_DATA, TITLE_DATA, HOBBY_DATA } from "./data";

export * from "./forms";

export const PLAYER_LISTS: Record<PlayerSubId, PanelDataItem[]> = {
  achievement: ACHIEVEMENT_DATA.map((a, i) => ({
    id: `achievement-${pad(i + 1, 3)}`,
    label: a.name,
    slotLabel: a.code.slice(0, 2),
    subtitle: `${a.cat} | Acquired: ${dateAt(i)}`,
    category: a.cat,
    detailTitle: "Achievement Detail",
    detailDescription: a.desc,
    detailRows: [
      `Code: ${a.code}`,
      `Category: ${a.cat}`,
      `Acquired: ${dateAt(i)}`,
      `Status: Unlocked`,
    ],
  })),
  credentials: CERTIFICATION_DATA.map((c, i) => ({
    id: `credential-${pad(i + 1, 3)}`,
    label: c.name,
    slotLabel: c.cat.slice(0, 2).toUpperCase(),
    subtitle: `${c.issuer} | ${c.cat}`,
    category: c.cat,
    detailTitle: "Credential Detail",
    detailDescription: `${c.name} issued by ${c.issuer}.`,
    detailRows: [
      `Issuer: ${c.issuer}`,
      `Category: ${c.cat}`,
      `Acquired: ${dateAt(i)}`,
      c.expires ? `Expires: ${c.expires}` : `Expires: Never`,
    ],
    actions: CRUD_ACTIONS,
  })),
  title: TITLE_DATA.map((t, i) => ({
    id: `title-${pad(i + 1, 3)}`,
    label: t.name,
    slotLabel: t.code.slice(0, 2),
    subtitle: `${t.cat} | Acquired: ${dateAt(i)}`,
    category: t.cat,
    detailTitle: "Title Detail",
    detailDescription: t.desc,
    detailRows: [
      `Code: ${t.code}`,
      `Category: ${t.cat}`,
      `Acquired: ${dateAt(i)}`,
      `Status: Unlocked`,
    ],
  })),
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

export const PLAYER_CATEGORY_ITEMS: Record<PlayerSubId, PanelMenuItem[]> = {
  achievement: catMenuItems(uniqueOrderedCats(ACHIEVEMENT_DATA)),
  credentials: catMenuItems(uniqueOrderedCats(CERTIFICATION_DATA)),
  title:       catMenuItems(uniqueOrderedCats(TITLE_DATA)),
  interests:   catMenuItems(uniqueOrderedCats(HOBBY_DATA)),
};
