import { USE_MOCK, apiGet, apiPost, apiDelete } from "../client";
import { MOCK_PLAYER_SKILLS, MOCK_SKILL_CATALOG } from "../mock/skills.mock";
import type { PlayerSkillInfo, SkillCatalogInfo, SkillEquipResponse, SkillLevelUpResponse } from "@/shared/api/types";

export async function getSkillCatalogApi(): Promise<SkillCatalogInfo[]> {
  if (USE_MOCK) return MOCK_SKILL_CATALOG;
  const res = await apiGet<{ skills: SkillCatalogInfo[] }>("/api/v1/skills/catalog");
  return res.skills;
}

export async function getPlayerSkillsApi(): Promise<PlayerSkillInfo[]> {
  if (USE_MOCK) return MOCK_PLAYER_SKILLS;
  const res = await apiGet<{ skills: PlayerSkillInfo[] }>("/api/v1/players/skills");
  return res.skills;
}

export async function equipSkillApi(skillCode: string, slot: number): Promise<SkillEquipResponse> {
  if (USE_MOCK) {
    return { skillCode, slot };
  }
  return apiPost<SkillEquipResponse>(`/api/v1/players/skills/${skillCode}/equip`, { slot });
}

export async function unequipSkillApi(skillCode: string): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/players/skills/${skillCode}/equip`);
}

export async function levelUpSkillApi(skillCode: string): Promise<SkillLevelUpResponse> {
  if (USE_MOCK) {
    const skill = MOCK_PLAYER_SKILLS.find((s) => s.skillCode === skillCode);
    if (!skill) throw new Error("Skill not found");
    return {
      skillCode,
      newLevel: skill.level + 1,
      currentExp: 0,
      expToNext: (skill.level + 1) * 100,
    };
  }
  return apiPost<SkillLevelUpResponse>(`/api/v1/players/skills/${skillCode}/levelup`, {});
}
