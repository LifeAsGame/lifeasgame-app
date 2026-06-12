import type { PanelDataItem } from "@/entities/nav";
import { MOCK_PLAYER_SKILLS, MOCK_SKILL_CATALOG } from "@/lib/api/mock/skills.mock";

function skillToPanelItem(skill: (typeof MOCK_PLAYER_SKILLS)[number]): PanelDataItem {
  const catalog = MOCK_SKILL_CATALOG.find((c) => c.code === skill.skillCode);
  const statsLabel = catalog
    ? Object.entries(catalog.statsPerLevel)
        .map(([k, v]) => `${k.toUpperCase()} +${v * skill.level}`)
        .join(" / ")
    : "";

  const expPct = skill.expToNext > 0 ? Math.round((skill.exp / skill.expToNext) * 100) : 100;

  return {
    id: String(skill.id),
    label: skill.skillName,
    slotLabel: `Lv.${skill.level}`,
    subtitle: `${skill.category} | ${skill.equipped ? `슬롯 ${skill.equippedSlot}` : "미장착"}`,
    detailTitle: skill.skillName,
    detailDescription: catalog?.descriptionMd ?? "",
    detailRows: [
      `타입: ${skill.type === "ACTIVE" ? "액티브" : "패시브"}`,
      `카테고리: ${skill.category}`,
      `레벨: ${skill.level} / ${catalog?.maxLevel ?? "?"}`,
      `EXP: ${skill.exp} / ${skill.expToNext} (${expPct}%)`,
      ...(statsLabel ? [`스탯 보너스: ${statsLabel}`] : []),
      skill.equipped ? `장착 슬롯: ${skill.equippedSlot}` : "미장착",
    ],
    contextTitle: "스킬 코드",
    contextDescription: skill.skillCode,
  };
}

const passiveSkills = MOCK_PLAYER_SKILLS.filter((s) => s.type === "PASSIVE");
const activeSkills = MOCK_PLAYER_SKILLS.filter((s) => s.type === "ACTIVE");

export const SKILLS_LISTS: Record<"passive" | "active", PanelDataItem[]> = {
  passive: passiveSkills.map(skillToPanelItem),
  active: activeSkills.map(skillToPanelItem),
};
