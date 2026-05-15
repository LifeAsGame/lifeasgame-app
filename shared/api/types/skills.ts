export interface SkillCatalogInfo {
  code: string;
  name: string;
  type: "ACTIVE" | "PASSIVE";
  category: string;
  maxLevel: number;
  descriptionMd: string;
  statsPerLevel: Record<string, number>;
  iconKey?: string;
}

export interface PlayerSkillInfo {
  id: number;
  skillCode: string;
  skillName: string;
  type: "ACTIVE" | "PASSIVE";
  category: string;
  level: number;
  exp: number;
  expToNext: number;
  equipped: boolean;
  equippedSlot: number | null;
  acquiredAt: string;
}

export interface SkillEquipResponse {
  skillCode: string;
  slot: number;
}

export interface SkillLevelUpResponse {
  skillCode: string;
  newLevel: number;
  currentExp: number;
  expToNext: number;
}
