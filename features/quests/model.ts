import type { QuestsSubId, PanelDataItem } from "@/entities/nav";
import type { QuestAcceptance, QuestBlueprint } from "@/shared/api/types";
import {
  MOCK_DAILY_BLUEPRINTS,
  MOCK_GUILD_QUEST_ACCEPTANCES,
  MOCK_PARTY_QUEST_ACCEPTANCES,
  MOCK_STORY_ACCEPTANCES,
  MOCK_SUGGESTED_BLUEPRINTS,
} from "@/lib/api/mock/quest.mock";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소됨",
  EXPIRED: "만료됨",
};

function blueprintToPanel(bp: QuestBlueprint): PanelDataItem {
  const rewardStr = Object.entries(bp.rewardStats)
    .map(([k, v]) => `${k.toUpperCase()} +${v}`)
    .join(", ");

  return {
    id: bp.code,
    label: bp.title,
    slotLabel: bp.category,
    subtitle: `${bp.repeatRule === "DAILY" ? "매일" : "단건"} | EXP +${bp.rewardExp}`,
    detailTitle: bp.title,
    detailDescription: bp.descriptionMd,
    detailRows: [
      `카테고리: ${bp.category}`,
      `목표: ${bp.targetType} × ${bp.targetValue}`,
      `보상 EXP: +${bp.rewardExp}`,
      ...(rewardStr ? [`보상 스탯: ${rewardStr}`] : []),
      ...(bp.dueAt ? [`기한: ${new Date(bp.dueAt).toLocaleDateString("ko-KR")}`] : []),
    ],
    actions: [{ type: "start", label: "수락" }],
  };
}

function acceptanceToPanel(qa: QuestAcceptance): PanelDataItem {
  const pct = qa.targetValue > 0
    ? Math.min(100, Math.round((qa.progress / qa.targetValue) * 100))
    : 0;
  const statusLabel = STATUS_LABEL[qa.status] ?? qa.status;

  const actions: PanelDataItem["actions"] = [];
  if (qa.status === "IN_PROGRESS" || qa.status === "PENDING") {
    actions.push({ type: "cancel", label: "취소" });
  }
  if (qa.status === "COMPLETED") {
    actions.push({ type: "claim", label: "보상 수령" });
  }

  return {
    id: qa.code,
    label: qa.title,
    slotLabel: statusLabel,
    subtitle: `${qa.category} | ${pct}%`,
    detailTitle: qa.title,
    detailDescription: qa.descriptionMd,
    detailRows: [
      `카테고리: ${qa.category}`,
      `상태: ${statusLabel}`,
      `진행: ${qa.progress} / ${qa.targetValue} (${pct}%)`,
      ...(qa.periodStart ? [`시작: ${qa.periodStart}`] : []),
      ...(qa.dueAt ? [`기한: ${new Date(qa.dueAt).toLocaleDateString("ko-KR")}`] : []),
      ...(qa.completedAt ? [`완료: ${new Date(qa.completedAt).toLocaleDateString("ko-KR")}`] : []),
    ],
    actions,
  };
}

export const QUEST_LISTS: Record<QuestsSubId, PanelDataItem[]> = {
  story: MOCK_STORY_ACCEPTANCES.map(acceptanceToPanel),
  suggested: MOCK_SUGGESTED_BLUEPRINTS.map(blueprintToPanel),
  daily: MOCK_DAILY_BLUEPRINTS.map(blueprintToPanel),
  party: MOCK_PARTY_QUEST_ACCEPTANCES.map(acceptanceToPanel),
  guild: MOCK_GUILD_QUEST_ACCEPTANCES.map(acceptanceToPanel),
};
