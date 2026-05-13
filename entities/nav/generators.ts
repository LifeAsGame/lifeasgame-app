import type { PanelDataItem, PanelMenuItem } from "./types";

export function pad(value: number, width = 2) {
  return value.toString().padStart(width, "0");
}

export function dateAt(index: number) {
  const m = (index % 12) + 1;
  const d = ((index * 3) % 28) + 1;
  return `2026-${pad(m)}-${pad(d)}`;
}

export const RARITY = ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;

export type MockListConfig = {
  count: number;
  idPrefix: string;
  slotPrefix: string;
  label: (index: number) => string;
  subtitle: (index: number) => string;
  detailTitle: string;
  detailDescription: (index: number) => string;
  detailRows: (index: number) => string[];
  contextTitle?: (index: number) => string;
  contextDescription?: (index: number) => string;
  contextRows?: (index: number) => string[];
};

export function makeList(config: MockListConfig): PanelDataItem[] {
  return Array.from({ length: config.count }, (_, index) => ({
    id: `${config.idPrefix}-${pad(index + 1, 3)}`,
    label: config.label(index),
    slotLabel: `${config.slotPrefix}${(index % 9) + 1}`,
    subtitle: config.subtitle(index),
    detailTitle: config.detailTitle,
    detailDescription: config.detailDescription(index),
    detailRows: config.detailRows(index),
    contextTitle: config.contextTitle?.(index),
    contextDescription: config.contextDescription?.(index),
    contextRows: config.contextRows?.(index),
  }));
}

export function makeStandardRows(index: number, kind: string) {
  return [
    `Kind: ${kind}`,
    `Rarity: ${RARITY[index % RARITY.length]}`,
    `Level: ${(index % 70) + 8}`,
    `Updated: ${dateAt(index + 2)}`,
  ];
}

export function makeStandardList(kind: string, prefix: string, slot: string, count: number, detailTitle: string) {
  return makeList({
    count,
    idPrefix: prefix,
    slotPrefix: slot,
    label: (index) => `${kind} ${pad(index + 1, 3)}`,
    subtitle: (index) =>
      `Lv.${(index % 70) + 8} | ${RARITY[index % RARITY.length]} | ${dateAt(index)}`,
    detailTitle,
    detailDescription: (index) => `${kind} detail snapshot for sequence ${pad(index + 1, 3)}.`,
    detailRows: (index) => makeStandardRows(index, kind),
  });
}

/** Returns unique categories in the order they first appear. */
export function uniqueOrderedCats<T extends { cat: string }>(data: T[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of data) {
    if (!seen.has(item.cat)) { seen.add(item.cat); result.push(item.cat); }
  }
  return result;
}

/** Converts a list of category strings into PanelMenuItem entries. */
export function catMenuItems(cats: string[]): PanelMenuItem[] {
  return cats.map((cat) => ({ id: cat, label: cat, slotLabel: cat.slice(0, 2).toUpperCase() }));
}
