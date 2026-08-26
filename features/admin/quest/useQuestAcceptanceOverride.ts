"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/client";
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

type QuestOverrideIntent = QuestOverrideDraft & {
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
  | "RECONCILED"
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

function completedIntent(intent: QuestOverrideIntent, acceptance: AdminQuestAcceptance) {
  if (intent.kind === "status") return acceptance.status === intent.status;
  return intent.delta > 0 && acceptance.progressValue >= intent.originalProgress + intent.delta;
}

export function useQuestAcceptanceOverride({
  acceptance,
  enabled,
  commandSource,
  readSource,
  onCanonicalAcceptance,
}: {
  acceptance: AdminQuestAcceptance;
  enabled: boolean;
  commandSource: AdminQuestCommandSource;
  readSource: AdminQuestDataSource;
  onCanonicalAcceptance: (acceptance: AdminQuestAcceptance) => void;
}) {
  const [state, setState] = useState<QuestOverrideState>(INITIAL_STATE);
  const submitting = useRef(false);

  useEffect(() => {
    if (!enabled || !commandSource.available) {
      submitting.current = false;
      setState(INITIAL_STATE);
      return;
    }
    setState((current) => current.intent && (
      current.intent.acceptanceId !== acceptance.id || current.intent.questCode !== acceptance.code
    ) ? INITIAL_STATE : current);
  }, [acceptance.code, acceptance.id, commandSource.available, enabled]);

  const loadCanonical = useCallback(async (intent: QuestOverrideIntent) => {
    const canonical = assertAdminQuestAcceptanceIdentity(
      await readSource.getAcceptance(intent.acceptanceId),
      intent.acceptanceId,
      intent.questCode,
    );
    onCanonicalAcceptance(canonical);
    return canonical;
  }, [onCanonicalAcceptance, readSource]);

  const beginReview = useCallback((draft: QuestOverrideDraft) => {
    if (!enabled || !commandSource.available) return false;
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
  }, [acceptance, commandSource.available, enabled]);

  const submit = useCallback(async () => {
    const intent = state.intent;
    if (!intent || !enabled || !commandSource.available || submitting.current) return;
    submitting.current = true;
    setState((current) => ({ ...current, phase: "SUBMITTING", error: null }));

    try {
      const metadata = { idempotencyKey: intent.idempotencyKey, correlationId: intent.correlationId };
      if (intent.kind === "progress") {
        await commandSource.adjustProgress(intent.acceptanceId, { delta: intent.delta, reason: intent.reason }, metadata);
      } else {
        await commandSource.changeStatus(intent.acceptanceId, { status: intent.status, reason: intent.reason }, metadata);
      }
      setState((current) => ({ ...current, phase: "SUCCEEDED_RECONCILING" }));
      await loadCanonical(intent);
      setState({
        phase: "SUCCEEDED",
        intent: null,
        error: null,
        receipt: { correlationId: intent.correlationId, idempotencyKey: intent.idempotencyKey },
      });
    } catch (caught) {
      const error = commandError(caught);
      if (error.status === 401 || error.status === 403) {
        setState({ ...INITIAL_STATE, error });
      } else if (error.status === 409) {
        setState((current) => ({ ...current, phase: "CONFLICT_RECONCILING", error }));
        try {
          await loadCanonical(intent);
          setState((current) => ({ ...current, phase: "CONFLICT_RECONCILED", error }));
        } catch (reconcileError) {
          setState((current) => ({ ...current, phase: "UNKNOWN_RESULT", error: commandError(reconcileError) }));
        }
      } else if (error.status === null || error.status >= 500) {
        setState((current) => ({ ...current, phase: "UNKNOWN_RESULT", error }));
      } else {
        setState((current) => ({ ...current, phase: "REVIEWING", error }));
      }
    } finally {
      submitting.current = false;
    }
  }, [commandSource, enabled, loadCanonical, state.intent]);

  const reconcile = useCallback(async () => {
    const intent = state.intent;
    if (!intent || submitting.current) return;
    submitting.current = true;
    setState((current) => ({ ...current, phase: "RECONCILING", error: null }));
    try {
      const canonical = await loadCanonical(intent);
      if (completedIntent(intent, canonical)) {
        setState({
          phase: "SUCCEEDED",
          intent: null,
          error: null,
          receipt: { correlationId: intent.correlationId, idempotencyKey: intent.idempotencyKey },
        });
      } else {
        setState((current) => ({ ...current, phase: "RECONCILED", error: null }));
      }
    } catch (caught) {
      const error = commandError(caught);
      setState(error.status === 401 || error.status === 403
        ? { ...INITIAL_STATE, error }
        : (current) => ({ ...current, phase: "UNKNOWN_RESULT", error }));
    } finally {
      submitting.current = false;
    }
  }, [loadCanonical, state.intent]);

  return {
    ...state,
    beginReview,
    submit,
    reconcile,
    cancelReview: () => setState((current) => ({ ...current, phase: "IDLE", error: null, receipt: null })),
    newIntent: () => setState(INITIAL_STATE),
  };
}
