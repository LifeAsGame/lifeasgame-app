import type { SkillsSubId, PanelDataItem } from "@/entities/nav";
import { makeStandardList } from "@/entities/nav";

export const SKILLS_LISTS: Record<SkillsSubId, PanelDataItem[]> = {
  passive: makeStandardList("Passive Skill", "skill-passive", "PS", 40, "Passive Detail"),
  active: makeStandardList("Active Skill", "skill-active", "AS", 42, "Active Detail"),
};
