import type { QuestAcceptance } from "@/shared/api/types";

export const QUEST_STATUS_LABEL: Record<QuestAcceptance["status"], string> = {
  IN_PROGRESS: "In Progress",
  GOAL_REACHED: "Goal Reached",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

export function questProgressPercent(quest: QuestAcceptance): number {
  return quest.targetValue > 0
    ? Math.min(100, Math.round((quest.progressValue / quest.targetValue) * 100))
    : 0;
}

export function canCancelQuest(quest: QuestAcceptance): boolean {
  return quest.status === "IN_PROGRESS" || quest.status === "GOAL_REACHED";
}

export function canManualCheckQuest(quest: QuestAcceptance): boolean {
  return canCancelQuest(quest)
    && quest.completionPolicy === "USER_CONFIRM"
    && quest.progressSource === "MANUAL_CHECK";
}

export function latestAcceptance(acceptances: QuestAcceptance[], code: string): QuestAcceptance | null {
  return acceptances
    .filter((acceptance) => acceptance.code === code)
    .sort((left, right) => right.acceptedAt.localeCompare(left.acceptedAt) || right.id - left.id)[0] ?? null;
}

export function canAcceptQuest(acceptance: QuestAcceptance | null): boolean {
  // ponytail: hide completed periodic re-accept until the backend exposes player-timezone eligibility.
  return !acceptance || acceptance.status === "CANCELED";
}
