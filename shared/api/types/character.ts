export interface StatusEffect {
  code: string;
  effect: string;
}

export interface PlayerInfo {
  playerId: number;
  name: string;
  gender: string;
  job: string;
  level: number;
  exp: number;
  currentHealth: number;
  healthCapacity: number;
  currentMana: number;
  manaCapacity: number;
  str: number;
  agi: number;
  dex: number;
  intel: number;
  vit: number;
  luc: number;
  extraStats: Record<string, number>;
  effects: StatusEffect[];
  representativeTitleId: number | null;
}

export interface RepresentativeTitle {
  titleId: number;
  code: string;
  name: string;
  category: string;
}

export interface EquipmentView {
  slotId: number;
  slotCode: string;
  slotName: string;
  slotCategory: string;
  slotRole: string;
  itemInstanceId: number | null;
}

export interface CharacterSheet {
  player: PlayerInfo;
  title: RepresentativeTitle | null;
  equipments: EquipmentView[];
  representativeGuildName?: string;
}

export interface PlayerAchievementInfo {
  achievementId: number;
  code: string;
  name: string;
  category: string;
  descMd: string;
  acquiredAt: string;
}

export interface PlayerCertificationInfo {
  certificationId: number;
  name: string;
  issuer: string;
  category: string;
  acquiredDate: string | null;
  expiresDate: string | null;
  grantedAt: string;
}

export interface CertificationCatalogInfo {
  certificationId: number;
  name: string;
  issuer: string;
  category: string;
}

export type PlayerCertificationDatesRequest = {
  acquiredDate?: string | null;
  expiresDate?: string | null;
};

export type PlayerCertificationMutationResult = {
  certificationId: number;
  acquiredDate: string | null;
  expiresDate: string | null;
};

export interface PlayerHobbyInfo {
  hobbyId: number;
  name: string;
  category: string;
  customName: string;
  detail: string;
  proficiency: number;
  status: string;
  startedOn: string;
  xp: number;
}

export interface PlayerTitleInfo {
  titleId: number;
  code: string;
  name: string;
  category: string;
  descMd: string;
  acquiredAt: string;
}
