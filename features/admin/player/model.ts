export type AdminPlayerSummary = {
  playerId: number;
  userId: number;
  name: string;
};

export type AdminPlayerInfo = {
  playerId: number;
  name: string;
  gender: string;
  job: string;
  level: number;
  totalExp: number;
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
  effects: Array<{ code: string; category: string }>;
  representativeTitleId: number | null;
};
