export type QuestRouteStatus = "IN_PROGRESS" | "COMPLETED";
export type QuestRouteStepState = "COMPLETED" | "CURRENT" | "READY_TO_ADVANCE" | "LOCKED";

export interface QuestRoutePlayerProgress {
  id: number;
  currentStepId: number;
  status: QuestRouteStatus;
  selectedAt: string;
  completedAt: string | null;
}

export interface QuestRouteQuestLink {
  questId: number;
  requirementType: string;
}

export interface QuestRouteStep {
  id: number;
  stepCode: string;
  stepOrder: number;
  title: string;
  description: string | null;
  criterionType: string;
  requiredEvidenceCount: number;
  userAdvanceRequired: boolean;
  retroactiveEvidenceAllowed: boolean;
  skipAllowed: boolean;
  criteriaSatisfied: boolean;
  state: QuestRouteStepState;
  questLinks: QuestRouteQuestLink[];
}

export interface QuestRoute {
  id: number;
  code: string;
  definitionVersion: number;
  title: string;
  description: string | null;
  primaryRoleTemplateCode: string | null;
  playerProgress: QuestRoutePlayerProgress | null;
  steps: QuestRouteStep[];
}

export interface QuestRoutesResponse {
  routes: QuestRoute[];
}

export interface QuestRouteStepDetail {
  routeId: number;
  routeCode: string;
  playerProgress: QuestRoutePlayerProgress;
  step: QuestRouteStep;
}

export interface AdvanceQuestRouteRequest {
  expectedStepId: number;
}
