import type { LifelogSubId, PanelDataItem, PanelMenuItem, FormFieldSpec } from "@/entities/nav";
import { CRUD_ACTIONS, pad } from "@/entities/nav";

// ─── Raw data ────────────────────────────────────────────────────────────────

const COLLECTION_DATA = [
  { title: "Kirito 1/7 Scale Figure", cat: "Figure", qty: 1, cond: "Mint in box", from: "Good Smile" },
  { title: "Asuna ALO Ver. Figure", cat: "Figure", qty: 1, cond: "Mint", from: "Kotobukiya" },
  { title: "SAO Progressive Manga", cat: "Manga", qty: 8, cond: "Like new", from: "Kyobo" },
  { title: "SAO Light Novel JP Complete", cat: "Light Novel", qty: 27, cond: "JP edition", from: "Amazon JP" },
  { title: "SAO Artbook Vol. 1", cat: "Artbook", qty: 1, cond: "Like new", from: "Comiket" },
  { title: "Elucidator Replica Sword", cat: "Merchandise", qty: 1, cond: "Display", from: "Animax Shop" },
  { title: "SAO Complete Series Bluray", cat: "Bluray", qty: 1, cond: "Sealed", from: "Aniplex" },
  { title: "SAO Enamel Pin Set", cat: "Merchandise", qty: 12, cond: "Complete set", from: "CR Shop" },
];

const MEDIA_DATA = [
  { title: "Sword Art Online", cat: "Anime", cur: 25, total: 25, status: "COMPLETED", rating: 9.5 },
  { title: "Attack on Titan", cat: "Anime", cur: 87, total: 87, status: "COMPLETED", rating: 9.8 },
  { title: "Demon Slayer", cat: "Anime", cur: 26, total: 26, status: "COMPLETED", rating: 9.2 },
  { title: "Clean Code", cat: "Book", cur: 464, total: 464, status: "COMPLETED", rating: 9.0 },
  { title: "Fullmetal Alchemist: Brotherhood", cat: "Anime", cur: 48, total: 64, status: "WATCHING", rating: null },
  { title: "The Pragmatic Programmer", cat: "Book", cur: 100, total: 352, status: "READING", rating: null },
  { title: "Your Name", cat: "Movie", cur: 1, total: 1, status: "COMPLETED", rating: 10.0 },
  { title: "Overlord", cat: "Anime", cur: 0, total: 13, status: "PLAN_TO_WATCH", rating: null },
  { title: "Designing Data-Intensive Apps", cat: "Book", cur: 250, total: 616, status: "READING", rating: null },
  { title: "Spirited Away", cat: "Movie", cur: 1, total: 1, status: "COMPLETED", rating: 9.9 },
];

const EXERCISE_DATA = [
  { cat: "Running", dur: 32, dist: 5.2, cal: 310, date: "2026-03-02" },
  { cat: "Cycling", dur: 75, dist: 28.4, cal: 620, date: "2026-03-01" },
  { cat: "Strength Training", dur: 55, dist: null, cal: 380, date: "2026-02-28" },
  { cat: "Swimming", dur: 40, dist: 1.5, cal: 420, date: "2026-02-26" },
  { cat: "Running", dur: 28, dist: 4.8, cal: 285, date: "2026-02-25" },
  { cat: "Yoga", dur: 45, dist: null, cal: 120, date: "2026-02-24" },
  { cat: "Hiking", dur: 180, dist: 12.0, cal: 850, date: "2026-02-22" },
  { cat: "Strength Training", dur: 60, dist: null, cal: 420, date: "2026-02-21" },
  { cat: "Running", dur: 35, dist: 6.0, cal: 360, date: "2026-02-19" },
  { cat: "Cycling", dur: 90, dist: 35.2, cal: 750, date: "2026-02-16" },
  { cat: "Jump Rope", dur: 20, dist: null, cal: 200, date: "2026-02-15" },
  { cat: "Swimming", dur: 50, dist: 2.0, cal: 530, date: "2026-02-12" },
];

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

// ─── Lifelog category panels ──────────────────────────────────────────────────

function uniqueOrderedCats<T extends { cat: string }>(data: T[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of data) {
    if (!seen.has(item.cat)) { seen.add(item.cat); result.push(item.cat); }
  }
  return result;
}

function catMenuItems(cats: string[]): PanelMenuItem[] {
  return cats.map((cat) => ({ id: cat, label: cat, slotLabel: cat.slice(0, 2).toUpperCase() }));
}

export const LIFELOG_CATEGORY_ITEMS: Record<LifelogSubId, PanelMenuItem[]> = {
  collection: catMenuItems(uniqueOrderedCats(COLLECTION_DATA)),
  media:      catMenuItems(uniqueOrderedCats(MEDIA_DATA)),
  exercise:   catMenuItems(uniqueOrderedCats(EXERCISE_DATA)),
};

// ─── Form Fields ─────────────────────────────────────────────────────────────

export const EXERCISE_FORM_FIELDS: FormFieldSpec[] = [
  { key: "category", label: "Category", type: "select", options: [
    { value: "CARDIO", label: "Cardio" }, { value: "STRENGTH", label: "Strength" },
    { value: "YOGA", label: "Yoga" }, { value: "STRETCHING", label: "Stretching" },
    { value: "WALKING", label: "Walking" }, { value: "CYCLING", label: "Cycling" },
    { value: "SWIMMING", label: "Swimming" }, { value: "SPORTS", label: "Sports" },
    { value: "OTHER", label: "Other" },
  ], required: true },
  { key: "duration", label: "Duration (min)", type: "number", placeholder: "30", required: true },
  { key: "intensity", label: "Intensity", type: "select", options: [
    { value: "LOW", label: "Low" }, { value: "MODERATE", label: "Moderate" },
    { value: "HIGH", label: "High" }, { value: "VERY_HIGH", label: "Very High" },
  ], required: true },
  { key: "caloriesBurned", label: "Calories Burned", type: "number", placeholder: "300" },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Session notes..." },
];

export const COLLECTION_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name", label: "Item Name", type: "text", placeholder: "e.g. Kirito 1/7 Figure", required: true },
  { key: "category", label: "Category", type: "select", options: [
    { value: "FIGURE", label: "Figure" }, { value: "BOOK", label: "Book" },
    { value: "GAME", label: "Game" }, { value: "ART", label: "Art" },
    { value: "MUSIC", label: "Music" }, { value: "OTHER", label: "Other" },
  ], required: true },
  { key: "rarity", label: "Rarity", type: "select", options: [
    { value: "COMMON", label: "Common" }, { value: "UNCOMMON", label: "Uncommon" },
    { value: "RARE", label: "Rare" }, { value: "EPIC", label: "Epic" },
    { value: "LEGENDARY", label: "Legendary" },
  ], required: true },
  { key: "condition", label: "Condition", type: "select", options: [
    { value: "MINT", label: "Mint" }, { value: "EXCELLENT", label: "Excellent" },
    { value: "GOOD", label: "Good" }, { value: "FAIR", label: "Fair" },
    { value: "POOR", label: "Poor" },
  ], required: true },
  { key: "acquiredAt", label: "Acquired Date", type: "date", required: true },
  { key: "source", label: "Source", type: "text", placeholder: "e.g. Amazon JP" },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Notes..." },
];

export const MEDIA_FORM_FIELDS: FormFieldSpec[] = [
  { key: "type", label: "Type", type: "select", options: [
    { value: "ANIME", label: "Anime" }, { value: "BOOK", label: "Book" },
    { value: "MOVIE", label: "Movie" }, { value: "GAME", label: "Game" },
    { value: "SERIES", label: "Series" },
  ], required: true },
  { key: "title", label: "Title", type: "text", placeholder: "e.g. Sword Art Online", required: true },
  { key: "status", label: "Status", type: "select", options: [
    { value: "PLANNING", label: "Planning" }, { value: "WATCHING", label: "Watching/Reading" },
    { value: "COMPLETED", label: "Completed" }, { value: "DROPPED", label: "Dropped" },
  ], required: true },
  { key: "progress", label: "Progress (ep/pages)", type: "number", placeholder: "0" },
  { key: "totalEpisodes", label: "Total Episodes/Pages", type: "number", placeholder: "12" },
  { key: "rating", label: "Rating (1-10)", type: "number", placeholder: "8" },
];
