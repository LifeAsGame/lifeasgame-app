export interface QuestBlueprint {
  code: string;
  title: string;
  category: string;
  descriptionMd: string;
  targetType: string;
  targetValue: number;
  repeatRule: string;
  rewardExp: number;
  rewardStats: Record<string, number>;
  dueAt: string | null;
}

export interface QuestAcceptance {
  id: number;
  questId: number;
  code: string;
  title: string;
  category: string;
  descriptionMd: string;
  targetType: string;
  targetValue: number;
  progress: number;
  status: string;
  repeatRule: string;
  periodStart: string | null;
  periodEnd: string | null;
  completedAt: string | null;
  dueAt: string | null;
}
