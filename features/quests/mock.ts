import type {
  PlayerQuestDetail,
  QuestAcceptance,
  QuestBlueprint,
  QuestRoute,
  QuestRouteStep,
  QuestRouteStepDetail,
} from "@/shared/api/types";

const blueprintDefaults = {
  category: null,
  targetType: "COUNT",
  repeatRule: "ONCE",
  completionPolicy: "AUTO" as const,
  definitionVersion: 1,
  rewardProfileCode: "RP_NONE",
  rewardExp: null,
  rewardStats: null,
  dueAt: null,
  semanticCategory: "RECORD",
  progressSource: "RECORD_CREATED",
  repeatPolicy: "ONCE",
  roleTemplateCode: null,
};

export const MOCK_QUEST_BLUEPRINTS: QuestBlueprint[] = [
  { ...blueprintDefaults, code: "Q_RECORD_FIRST_TRACE", title: "첫 흔적 남기기", descriptionMd: "오늘의 생각·행동·기억 중 하나를 짧게 남겨보세요.", targetValue: 1, rewardProfileCode: "RP_EXP_TINY_10" },
  { ...blueprintDefaults, code: "Q_RECORD_THREE_TRACES", title: "흔적 세 개 이어보기", descriptionMd: "서로 다른 순간의 기록을 세 개 남겨 작은 흐름을 만들어보세요.", targetValue: 3, rewardProfileCode: "RP_EXP_AND_ITEM_FIRST_STEP_20" },
  { ...blueprintDefaults, code: "Q_RECORD_WEEKLY_LOOKBACK", title: "이번 주 흔적 돌아보기", descriptionMd: "이번 주 기록 중 하나를 골라 지금의 나에게 남길 한 줄을 적어보세요.", targetValue: 1, repeatRule: "WEEKLY", repeatPolicy: "WEEKLY" },
  { ...blueprintDefaults, code: "Q_GROWTH_ONE_FOCUS", title: "한 가지에 25분 집중하기", descriptionMd: "지금 가장 작은 한 가지를 골라 25분만 집중해보세요.", targetType: "MINUTES", targetValue: 25, repeatRule: "DAILY", repeatPolicy: "DAILY", completionPolicy: "USER_CONFIRM", semanticCategory: "GROWTH", progressSource: "MANUAL_CHECK" },
  { ...blueprintDefaults, code: "Q_RECOVERY_REST_TEN", title: "10분 쉬어가기", descriptionMd: "아무것도 증명하지 않아도 되는 10분을 가져보세요.", targetType: "MINUTES", targetValue: 10, repeatRule: "DAILY", repeatPolicy: "DAILY", completionPolicy: "USER_CONFIRM", semanticCategory: "RECOVERY", progressSource: "MANUAL_CHECK" },
];

const questIds: Record<string, number> = {
  Q_RECORD_FIRST_TRACE: 101,
  Q_RECORD_THREE_TRACES: 102,
  Q_RECORD_WEEKLY_LOOKBACK: 103,
  Q_GROWTH_ONE_FOCUS: 104,
  Q_RECOVERY_REST_TEN: 105,
};

function acceptance(code: string, status: QuestAcceptance["status"], progressValue: number, id: number): QuestAcceptance {
  const blueprint = MOCK_QUEST_BLUEPRINTS.find((item) => item.code === code)!;
  return {
    ...blueprint,
    id,
    questId: questIds[code],
    progressValue,
    status,
    acceptedAt: "2026-08-10T01:00:00Z",
    periodStart: "2026-08-10",
    periodEnd: blueprint.repeatPolicy === "DAILY" ? "2026-08-10" : null,
    periodKey: null,
    goalReachedAt: status === "GOAL_REACHED" || status === "COMPLETED" ? "2026-08-10T02:00:00Z" : null,
    completedAt: status === "COMPLETED" ? "2026-08-10T02:01:00Z" : null,
  };
}

let acceptances: QuestAcceptance[] = [];
let selectedRoute = false;
let currentStepId = 11;
let routeCompleted = false;

export function resetJourneyMock(): void {
  acceptances = [
    acceptance("Q_RECORD_FIRST_TRACE", "COMPLETED", 1, 1),
    acceptance("Q_RECORD_THREE_TRACES", "IN_PROGRESS", 1, 2),
    acceptance("Q_RECORD_WEEKLY_LOOKBACK", "CANCELED", 0, 3),
    acceptance("Q_GROWTH_ONE_FOCUS", "GOAL_REACHED", 25, 4),
  ];
  selectedRoute = false;
  currentStepId = 11;
  routeCompleted = false;
}

resetJourneyMock();

function copy<T>(value: T): T {
  return structuredClone(value);
}

function latest(code: string): QuestAcceptance | null {
  return acceptances
    .filter((item) => item.code === code)
    .sort((left, right) => right.acceptedAt.localeCompare(left.acceptedAt) || right.id - left.id)[0] ?? null;
}

const stepDefinitions: Array<Omit<QuestRouteStep, "criteriaSatisfied" | "state">> = [
  { id: 11, stepCode: "RS_RECORD_01_LEAVE_TRACE", stepOrder: 1, title: "첫 흔적 남기기", description: "첫 번째 기록 Quest를 완료하고 다음 단계로 직접 이동합니다.", criterionType: "QUEST_COMPLETION_SET", requiredEvidenceCount: 1, userAdvanceRequired: true, retroactiveEvidenceAllowed: true, skipAllowed: false, questLinks: [{ questId: 101, requirementType: "REQUIRED" }] },
  { id: 12, stepCode: "RS_RECORD_02_CONNECT_TRACES", stepOrder: 2, title: "흔적 연결하기", description: "세 개의 기록을 연결한 뒤 다음 단계로 직접 이동합니다.", criterionType: "QUEST_COMPLETION_SET", requiredEvidenceCount: 1, userAdvanceRequired: true, retroactiveEvidenceAllowed: true, skipAllowed: false, questLinks: [{ questId: 102, requirementType: "REQUIRED" }] },
  { id: 13, stepCode: "RS_RECORD_03_LOOK_BACK", stepOrder: 3, title: "돌아보기", description: "주간 회고 Quest를 완료하고 Route를 직접 완료합니다.", criterionType: "QUEST_COMPLETION_SET", requiredEvidenceCount: 1, userAdvanceRequired: true, retroactiveEvidenceAllowed: true, skipAllowed: false, questLinks: [{ questId: 103, requirementType: "REQUIRED" }] },
];

function route(): QuestRoute {
  const currentOrder = stepDefinitions.find((step) => step.id === currentStepId)?.stepOrder ?? 1;
  const steps = stepDefinitions.map((step): QuestRouteStep => {
    const criteriaSatisfied = acceptances.some((item) => item.questId === step.questLinks[0].questId && item.status === "COMPLETED");
    const state = !selectedRoute
      ? "LOCKED"
      : routeCompleted || step.stepOrder < currentOrder
        ? "COMPLETED"
        : step.id === currentStepId
          ? criteriaSatisfied ? "READY_TO_ADVANCE" : "CURRENT"
          : "LOCKED";
    return { ...step, criteriaSatisfied, state };
  });
  return {
    id: 1,
    code: "ROUTE_RECORD_START",
    definitionVersion: 1,
    title: "기록으로 시작하기",
    description: "작은 기록을 남기고 연결하며 돌아보는 장기 방향입니다.",
    primaryRoleTemplateCode: null,
    playerProgress: selectedRoute ? {
      id: 1,
      currentStepId,
      status: routeCompleted ? "COMPLETED" : "IN_PROGRESS",
      selectedAt: "2026-08-10T01:00:00Z",
      completedAt: routeCompleted ? "2026-08-10T03:00:00Z" : null,
    } : null,
    steps,
  };
}

export const journeyMock = {
  catalog: () => copy(MOCK_QUEST_BLUEPRINTS),
  acceptances: (status?: QuestAcceptance["status"]) => copy(status ? acceptances.filter((item) => item.status === status) : acceptances),
  quest: (code: string): PlayerQuestDetail => {
    const blueprint = MOCK_QUEST_BLUEPRINTS.find((item) => item.code === code);
    if (!blueprint) throw new Error("Quest not found.");
    return copy({ ...blueprint, acceptance: latest(code) });
  },
  accept: (code: string): QuestAcceptance => {
    const blueprint = MOCK_QUEST_BLUEPRINTS.find((item) => item.code === code);
    if (!blueprint) throw new Error("Quest not found.");
    const existing = latest(code);
    if (existing && existing.status !== "CANCELED") throw new Error("Quest already accepted.");
    const next = existing ?? acceptance(code, "IN_PROGRESS", 0, Math.max(0, ...acceptances.map((item) => item.id)) + 1);
    Object.assign(next, { progressValue: 0, status: "IN_PROGRESS", goalReachedAt: null, completedAt: null, acceptedAt: new Date().toISOString() });
    if (!existing) acceptances.push(next);
    return copy(next);
  },
  manualCheck: (code: string): QuestAcceptance => {
    const current = latest(code);
    if (!current || current.progressSource !== "MANUAL_CHECK" || current.completionPolicy !== "USER_CONFIRM" || current.status === "CANCELED") throw new Error("Manual check not allowed.");
    Object.assign(current, { progressValue: current.targetValue, status: "COMPLETED", goalReachedAt: current.goalReachedAt ?? new Date().toISOString(), completedAt: new Date().toISOString() });
    return copy(current);
  },
  cancel: (code: string) => {
    const current = latest(code);
    if (!current || current.status === "COMPLETED") throw new Error("Quest cannot be canceled.");
    current.status = "CANCELED";
    return copy({ playerId: 1, questId: current.questId, questCode: current.code });
  },
  routes: () => copy([route()]),
  route: () => copy(route()),
  selectRoute: () => {
    selectedRoute = true;
    return copy(route());
  },
  myRoutes: () => copy(selectedRoute ? [route()] : []),
  myRoute: () => {
    if (!selectedRoute) throw new Error("Route not selected.");
    return copy(route());
  },
  step: (stepId: number): QuestRouteStepDetail => {
    const selected = route();
    const step = selected.steps.find((item) => item.id === stepId);
    if (!selected.playerProgress || !step) throw new Error("Route step not found.");
    return copy({ routeId: selected.id, routeCode: selected.code, playerProgress: selected.playerProgress, step });
  },
  advance: (expectedStepId: number) => {
    const selected = route();
    const current = selected.steps.find((step) => step.id === currentStepId);
    if (!selected.playerProgress || expectedStepId !== currentStepId || current?.state !== "READY_TO_ADVANCE") throw new Error("Route step is stale or not ready.");
    const index = stepDefinitions.findIndex((step) => step.id === currentStepId);
    if (index === stepDefinitions.length - 1) routeCompleted = true;
    else currentStepId = stepDefinitions[index + 1].id;
    return copy(route());
  },
};
