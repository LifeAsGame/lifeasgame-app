import type { PlayerSkillInfo, SkillCatalogInfo } from "@/shared/api/types";

export function skillDetails(skill: PlayerSkillInfo, catalog: SkillCatalogInfo | undefined) {
  const stats = catalog
    ? Object.entries(catalog.statsPerLevel).map(([key, value]) => `${key.toUpperCase()} +${value * skill.level}`)
    : [];
  return [
    `Type: ${skill.type}`,
    `Category: ${skill.category}`,
    `Level: ${skill.level}${catalog ? ` / ${catalog.maxLevel}` : ""}`,
    `EXP: ${skill.exp} / ${skill.expToNext}`,
    ...stats.map((value) => `Stat bonus: ${value}`),
    skill.equipped ? `Equipped slot: ${skill.equippedSlot}` : "Not equipped",
  ];
}
