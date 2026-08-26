"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditDataSource } from "../api/audit.source";
import type {
  AdminQuestCommandSource,
  AdminQuestStatusCommand,
} from "../api/quest.command";
import { validateAdminQuestOverrideReason } from "../api/quest.command";
import { assertAdminQuestAcceptanceIdentity } from "../api/quest.query";
import type { AdminQuestDataSource } from "../api/quest.source";
import type { AdminQuestAcceptance } from "./model";

export type QuestOverrideRisk = "L2" | "L3";
export type QuestOverrideDraft =
  | { kind: "progress"; delta: number; reason: string }
  | { kind: "status"; status: AdminQuestStatusCommand; reason: string };

export type QuestOverrideIntent = QuestOverrideDraft & {
  acceptanceId: number;
  questCode: string;
  playerId: number;
  originalProgress: number;
  originalStatus: AdminQuestAcceptance["status"];
  targetValue: number;
  risk: QuestOverrideRisk;
  fingerprint: string;
  idempotencyKey: string;
  correlationId: string;
};

export type QuestOverridePhase =
  | "IDLE"
  | "REVIEWING"
  | "SUBMITTING"
  | "SUCCEEDED_RECONCILING"
  | "CONFLICT_RECONCILING"
  | "UNKNOWN_RESULT"
  | "RECONCILING"
  | "RECONCILED_RETRYABLE"
  | "RECONCILED_UNVERIFIED"
  | "CONFLICT_RECONCILED"
  | "SUCCEEDED";

type QuestOverrideState = {
  phase: QuestOverridePhase;
  intent: QuestOverrideIntent | null;
  error: { status: number | null; message: string } | null;
  receipt: { correlationId: string; idempotencyKey: string } | null;
};

const INITIAL_STATE: QuestOverrideState = { phase: "IDLE", intent: null, error: null, receipt: null };

export function allowedAdminQuestStatusTargets(status: AdminQuestAcceptance["status"]): AdminQuestStatusCommand[] {
  if (status === "IN_PROGRESS") return ["GOAL_REACHED", "CANCELED"];
  if (status === "GOAL_REACHED") return ["COMPLETED", "CANCELED"];
  return [];
}

export function adminQuestOverrideRisk(acceptance: AdminQuestAcceptance, draft: QuestOverrideDraft): QuestOverrideRisk {
  if (draft.kind === "progress") return acceptance.progressValue + draft.delta >= acceptance.targetValue ? "L3" : "L2";
  return draft.status === "COMPLETED" || draft.status === "CANCELED" ? "L3" : "L2";
}

function operationId(prefix: string) {
  return `${prefix}:${globalThis.crypto.randomUUID()}`;
}

function commandError(caught: unknown) {
  return {
    status: caught instanceof ApiError ? caught.status : null,
    message: caught instanceof Error ? caught.message : "Quest Acceptance command failed.",
  };
}

function requestedOutcomeIsReflected(intent: QuestOverrideIntent, acceptance: AdminQuestAcceptance) {
  if (intent.kind === "status") return acceptance.status === intent.status;
  return intent.delta > 0 && acceptance.progressValue >= intent.originalProgress + intent.delta;
}

function auditAction(intent: QuestOverrideIntent) {
  return intent.kind === "progress" ? "QUEST_ACCEPTANCE_PROGRESS_ADJUST" : "QUEST_ACCEPTANCE_STATUS_CHANGE";
}

async function hasExactSuccessAudit(intent: QuestOverrideIntent, auditSource: AdminAuditDataSource) {
  const action = auditAction(intent);
  const targetId = String(intent.acceptanceId);
  const page = await auditSource.getEvents({
    action,
    targetType: "QUEST_ACCEPTANCE",
    targetId,
    result: "SUCCESS",
    correlationId: intent.correlationId,
  });
  return page.items.some((event) => event.action === action
    && event.targetType === "QUEST_ACCEPTANCE"
    && event.targetId === targetId
    && event.result === "SUCCESS"
    && event.correlationId === intent.correlationId
    && event.idempotencyKey === intent.idempotencyKey);
}

export function useQuestAcceptanceOverride({
  acceptance,
  enabled,
  commandSource,
  readSource,
  auditSource,
  onCanonicalAcceptance,
}: {
  acceptance: AdminQuestAcceptance;
  enabled: boolean;
  commandSource: AdminQuestCommandSource;
  readSource: AdminQuestDataSource;
  auditSource: AdminAuditDataSource;
  onCanonicalAcceptance: (acceptance: AdminQuestAcceptance) => void;
}) {
  const [state, setState] = useState<QuestOverrideState>(INITIAL_STATE);
  const [reviewVersion, setReviewVersion] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    if (!enabled || !commandSource.available || auditSource.descriptor.mode !== "api") {
      submitting.current = false;
      setState(INITIAL_STATE);
      return;
    }
    setState((current) => current.intent && (
      current.intent.acceptanceId !== acceptance.id || current.intent.questCode !== acceptance.code
    ) ? INITIAL_STATE : current);
  }, [acceptance.code, acceptance.id, auditSource.descriptor.mode, commandSource.available, enabled]);

  const loadCanonical = useCallback(async (intent: QuestOverrideIntent) => {
    const canonical = assertAdminQuestAcceptanceIdentity(
      await readSource.getAcceptance(intent.acceptanceId),
      intent.acceptanceId,
      intent.questCode,
    );
    onCanonicalAcceptance(canonical);
    return canonical;
  }, [onCanonicalAcceptance, readSource]);

  const reconcileEvidence = useCallback(async (intent: QuestOverrideIntent) => {
    const canonical = await loadCanonical(intent);
    return { canonical, exactAudit: await hasExactSuccessAudit(intent, auditSource) };
  }, [auditSource, loadCanonical]);

  const beginReview = useCallback((draft: QuestOverrideDraft) => {
    if (!enabled || !commandSource.available || auditSource.descriptor.mode !== "api") return false;
    const reason = validateAdminQuestOverrideReason(draft.reason);
    if (draft.kind === "progress") {
      if (acceptance.status !== "IN_PROGRESS") throw new RangeError("Progress can only be adjusted for an IN_PROGRESS Acceptance.");
      if (!Number.isInteger(draft.delta) || draft.delta < 0) throw new RangeError("Progress delta must be a non-negative integer.");
    } else if (!allowedAdminQuestStatusTargets(acceptance.status).includes(draft.status)) {
      throw new RangeError("The requested status is not an allowed transition from the current Acceptance state.");
    }

    const normalizedDraft = { ...draft, reason } as QuestOverrideDraft;
    const fingerprint = JSON.stringify([
      acceptance.id,
      acceptance.code,
      acceptance.playerId,
      acceptance.progressValue,
      acceptance.status,
      acceptance.targetValue,
      normalizedDraft,
    ]);
    setReviewVersion((current) => current + 1);
    setState((current) => {
      const reusable = current.intent?.fingerprint === fingerprint ? current.intent : null;
      const intent: QuestOverrideIntent = reusable ?? {
        ...normalizedDraft,
        acceptanceId: acceptance.id,
        questCode: acceptance.code,
        playerId: acceptance.playerId,
        originalProgress: acceptance.progressValue,
        originalStatus: acceptance.status,
        targetValue: acceptance.targetValue,
        risk: adminQuestOverrideRisk(acceptance, normalizedDraft),
        fingerprint,
        idempotencyKey: operationId("quest-override"),
        correlationId: operationId("quest-operation"),
      };
      return { phase: "REVIEWING", intent, error: null, receipt: null };
    });
    return true;
  }, [acceptance, auditSource.descriptor.mode, commandSource.available, enabled]);

  const submit = useCallback(async () => {
    const intent = state.intent;
    if (!intent || !enabled || !commandSource.available || auditSource.descriptor.mode !== "api" || submitting.current) return;
    submitting.current = true;
    setState((current) => ({ ...current, phase: "SUBMITTING", error: null }));

    const metadata = { idempotencyKey: intent.idempotencyKey, correlationId: intent.correlationId };
    try {
      if (intent.kind === "progress") {
        await commandSource.adjustProgress(intent.acceptanceId, { delta: intent.delta, reason: intent.reason }, metadata);
      } else {
        await commandSource.changeStatus(intent.acceptanceId, { status: intent.status, reason: intent.reason }, metadata);
      }
    } catch (caught) {
      const error = commandError(caught);
      if (error.status === 401 || error.status === 403) {
        setState({ ...INITIAL_STATE, error });
      } else if (error.status === 409) {
        setState((current) => ({ ...current, phase: "CONFLICT_RECONCILING", error }));
        try {
          const { exactAudit } = await reconcileEvidence(intent);
          setState(exactAudit ? {
            phase: "SUCCEEDED",
            intent: null,
            error: null,
            receipt: { correlationId: intent.correlationId, idempotencyKey: intent.idempotencyKey },
          } : (current) => ({ ...current, phase: "CONFLICT_RECONCILED", error }));
        } catch (reconcileError) {
          const reconcileFailure = commandError(reconcileError);
          setState(reconcileFailure.status === 401 || reconcileFailure.status === 403
            ? { ...INITIAL_STATE, error: reconcileFailure }
            : (current) => ({ ...current, phase: "UNKNOWN_RESULT", error: reconcileFailure }));
        }
      } else if (error.status === null || error.status >= 500) {
        setState((current) => ({ ...current, phase: "UNKNOWN_RESULT", error }));
      } else {
        setReviewVersion((current) => current + 1);
        setState((current) => ({ ...current, phase: "REVIEWING", error }));
      }
      submitting.current = false;
      return;
    }

    setState((current) => ({ ...current, phase: "SUCCEEDED_RECONCILING" }));
    try {
      await loadCanonical(intent);
      setState({
        phase: "SUCCEEDED",
        intent: null,
        error: null,
        receipt: { correlationId: intent.correlationId, idempotencyKey: intent.idempotencyKey },
      });
    } catch (caught) {
      const error = commandError(caught);
      setState(error.status === 401 || error.status === 403
        ? { ...INITIAL_STATE, error }
        : (current) => ({ ...current, phase: "UNKNOWN_RESULT", error }));
    } finally {
      submitting.current = false;
    }
  }, [auditSource.descriptor.mode, commandSource, enabled, loadCanonical, reconcileEvidence, state.intent]);

  const reconcile = useCallback(async () => {
    const intent = state.intent;
    if (!intent || submitting.current) return;
    submitting.current = true;
    setState((current) => ({ ...current, phase: "RECONCILING", error: null }));
    try {
      const { canonical, exactAudit } = await reconcileEvidence(intent);
      if (exactAudit) {
        setState({
          phase: "SUCCEEDED",
          intent: null,
          error: null,
          receipt: { correlationId: intent.correlationId, idempotencyKey: intent.idempotencyKey },
        });
      } else if (requestedOutcomeIsReflected(intent, canonical)) {
        setState((current) => ({ ...current, phase: "RECONCILED_UNVERIFIED", error: null }));
      } else {
        setState((current) => ({ ...current, phase: "RECONCILED_RETRYABLE", error: null }));
      }
    } catch (caught) {
      const error = commandError(caught);
      setState(error.status === 401 || error.status === 403
        ? { ...INITIAL_STATE, error }
        : (current) => ({ ...current, phase: "UNKNOWN_RESULT", error }));
    } finally {
      submitting.current = false;
    }
  }, [reconcileEvidence, state.intent]);

  return {
    ...state,
    reviewVersion,
    beginReview,
    submit,
    reconcile,
    cancelReview: () => setState((current) => ({ ...current, phase: "IDLE", error: null, receipt: null })),
    newIntent: () => setState(INITIAL_STATE),
  };
}
