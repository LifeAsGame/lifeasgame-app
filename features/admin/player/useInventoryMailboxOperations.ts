"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditDataSource } from "../api/audit.source";
import type { AdminEntitlementCommandBody, AdminInventoryOperationsCommandSource } from "../api/inventory.command";
import { validateAdminEntitlementReason } from "../api/inventory.command";
import type {
  AdminInventoryEntries,
  AdminInventoryOperationsDataSource,
  AdminItemDetail,
  AdminMailboxEntries,
} from "../api/inventory.source";

export type EntitlementDestination = "INVENTORY" | "MAILBOX";
export type EntitlementDraft = AdminEntitlementCommandBody & { destination: EntitlementDestination };

export type EntitlementIntent = EntitlementDraft & {
  playerId: number;
  playerName: string;
  item: AdminItemDetail;
  fingerprint: string;
  idempotencyKey: string;
  correlationId: string;
};

export type EntitlementOperationPhase =
  | "IDLE"
  | "REVIEWING"
  | "SUBMITTING"
  | "SUCCEEDED_RELOADING"
  | "UNKNOWN_RESULT"
  | "RECONCILING"
  | "RECONCILED_RETRYABLE"
  | "CONFLICT_RECONCILING"
  | "CONFLICT_RECONCILED"
  | "SUCCEEDED";

type OperationState = {
  phase: EntitlementOperationPhase;
  intent: EntitlementIntent | null;
  error: { status: number | null; message: string } | null;
  receipt: { correlationId: string; idempotencyKey: string; destinationStale: boolean; evidence: "DIRECT" | "AUDIT" } | null;
};

const INITIAL_STATE: OperationState = { phase: "IDLE", intent: null, error: null, receipt: null };

function operationId(prefix: string) {
  return `${prefix}:${globalThis.crypto.randomUUID()}`;
}

function operationError(caught: unknown) {
  return {
    status: caught instanceof ApiError ? caught.status : null,
    message: caught instanceof Error ? caught.message : "Inventory or Mailbox operation failed.",
  };
}

function auditIdentity(intent: EntitlementIntent) {
  return intent.destination === "INVENTORY"
    ? { action: "INVENTORY_ITEM_ADD", targetType: "PLAYER_INVENTORY" }
    : { action: "MAILBOX_ITEM_DELIVERY", targetType: "PLAYER_MAILBOX" };
}

async function hasExactSuccessAudit(intent: EntitlementIntent, auditSource: AdminAuditDataSource) {
  const identity = auditIdentity(intent);
  const targetId = String(intent.playerId);
  const page = await auditSource.getEvents({
    ...identity,
    targetId,
    result: "SUCCESS",
    correlationId: intent.correlationId,
  });
  return page.items.some((event) => event.action === identity.action
    && event.targetType === identity.targetType
    && event.targetId === targetId
    && event.result === "SUCCESS"
    && event.correlationId === intent.correlationId
    && event.idempotencyKey === intent.idempotencyKey);
}

export function useInventoryMailboxOperations({
  playerId,
  playerName,
  item,
  enabled,
  readSource,
  commandSource,
  auditSource,
  onCanonicalInventory,
  onCanonicalMailbox,
  onSecurityFailure,
}: {
  playerId: number;
  playerName: string;
  item: AdminItemDetail | null;
  enabled: boolean;
  readSource: AdminInventoryOperationsDataSource;
  commandSource: AdminInventoryOperationsCommandSource;
  auditSource: AdminAuditDataSource;
  onCanonicalInventory: (inventory: AdminInventoryEntries) => void;
  onCanonicalMailbox: (mailbox: AdminMailboxEntries) => void;
  onSecurityFailure?: (error: { status: 401 | 403; message: string }) => void;
}) {
  const [state, setState] = useState<OperationState>(INITIAL_STATE);
  const [reviewVersion, setReviewVersion] = useState(0);
  const submitting = useRef(false);
  const realApi = readSource.descriptor.mode === "api" && auditSource.descriptor.mode === "api" && commandSource.available;
  const failSecurity = useCallback((error: { status: number | null; message: string }) => {
    if (error.status !== 401 && error.status !== 403) return false;
    submitting.current = false;
    setState({ ...INITIAL_STATE, error });
    onSecurityFailure?.({ status: error.status, message: error.message });
    return true;
  }, [onSecurityFailure]);

  useEffect(() => {
    if (!enabled || !realApi) {
      submitting.current = false;
      setState(INITIAL_STATE);
      return;
    }
    setState((current) => current.intent && current.intent.playerId !== playerId ? INITIAL_STATE : current);
  }, [enabled, playerId, realApi]);

  const loadCanonical = useCallback(async (intent: EntitlementIntent) => {
    if (intent.destination === "INVENTORY") {
      const inventory = await readSource.getInventory(intent.playerId);
      if (inventory.playerId !== intent.playerId) throw new Error("Inventory response did not match the requested Player ID.");
      onCanonicalInventory(inventory);
      return;
    }
    const mailbox = await readSource.getMailbox(intent.playerId);
    if (mailbox.playerId !== intent.playerId) throw new Error("Mailbox response did not match the requested Player ID.");
    onCanonicalMailbox(mailbox);
  }, [onCanonicalInventory, onCanonicalMailbox, readSource]);

  const reconcileEvidence = useCallback(async (intent: EntitlementIntent) => {
    let destinationError: unknown = null;
    let destinationFresh = false;
    try {
      await loadCanonical(intent);
      destinationFresh = true;
    } catch (caught) {
      destinationError = caught;
    }

    try {
      return { destinationFresh, destinationError, exactAudit: await hasExactSuccessAudit(intent, auditSource), auditError: null };
    } catch (auditError) {
      return { destinationFresh, destinationError, exactAudit: false, auditError };
    }
  }, [auditSource, loadCanonical]);

  const beginReview = useCallback((draft: EntitlementDraft) => {
    if (!enabled || !realApi || !item) return false;
    if (!Number.isInteger(playerId) || playerId < 1) throw new RangeError("playerId must be a positive integer.");
    if (!Number.isInteger(item.id) || item.id < 1 || draft.itemId !== item.id) throw new Error("Exact Item detail is required before review.");
    if (!Number.isInteger(draft.quantity) || draft.quantity < 1) throw new RangeError("Quantity must be a positive integer.");
    const normalized: EntitlementDraft = { ...draft, reason: validateAdminEntitlementReason(draft.reason) };
    const fingerprint = JSON.stringify([playerId, normalized.destination, item.id, normalized.quantity, normalized.bound, normalized.reason]);
    setReviewVersion((version) => version + 1);
    setState((current) => {
      const reusable = current.intent?.fingerprint === fingerprint ? current.intent : null;
      const intent: EntitlementIntent = reusable ?? {
        ...normalized,
        playerId,
        playerName,
        item,
        fingerprint,
        idempotencyKey: operationId("entitlement"),
        correlationId: operationId("admin-operation"),
      };
      return { phase: "REVIEWING", intent, error: null, receipt: null };
    });
    return true;
  }, [enabled, item, playerId, playerName, realApi]);

  const finishReconciliation = useCallback(async (intent: EntitlementIntent, conflict: boolean) => {
    const evidence = await reconcileEvidence(intent);
    if (evidence.destinationError && failSecurity(operationError(evidence.destinationError))) return;
    if (evidence.auditError) {
      const error = operationError(evidence.auditError);
      if (!failSecurity(error)) setState((current) => ({ ...current, phase: "UNKNOWN_RESULT", error }));
      return;
    }
    if (evidence.exactAudit) {
      setState({
        phase: "SUCCEEDED",
        intent: null,
        error: evidence.destinationFresh ? null : operationError(evidence.destinationError),
        receipt: { correlationId: intent.correlationId, idempotencyKey: intent.idempotencyKey, destinationStale: !evidence.destinationFresh, evidence: "AUDIT" },
      });
      return;
    }
    if (!evidence.destinationFresh) {
      setState((current) => ({ ...current, phase: "UNKNOWN_RESULT", error: operationError(evidence.destinationError) }));
      return;
    }
    setState((current) => ({ ...current, phase: conflict ? "CONFLICT_RECONCILED" : "RECONCILED_RETRYABLE", error: null }));
  }, [failSecurity, reconcileEvidence]);

  const submit = useCallback(async () => {
    const intent = state.intent;
    if (!intent || !enabled || !realApi || !commandSource.available || submitting.current) return;
    submitting.current = true;
    setState((current) => ({ ...current, phase: "SUBMITTING", error: null }));
    const body = { itemId: intent.itemId, quantity: intent.quantity, bound: intent.bound, reason: intent.reason };
    const metadata = { idempotencyKey: intent.idempotencyKey, correlationId: intent.correlationId };
    try {
      if (intent.destination === "INVENTORY") await commandSource.addInventory(intent.playerId, body, metadata);
      else await commandSource.deliverMailbox(intent.playerId, body, metadata);
    } catch (caught) {
      const error = operationError(caught);
      if (failSecurity(error)) {
        submitting.current = false;
        return;
      } else if (error.status === 409) {
        setState((current) => ({ ...current, phase: "CONFLICT_RECONCILING", error }));
        await finishReconciliation(intent, true);
      } else if (error.status === null || error.status >= 500) {
        setState((current) => ({ ...current, phase: "UNKNOWN_RESULT", error }));
      } else {
        setReviewVersion((version) => version + 1);
        setState((current) => ({ ...current, phase: "REVIEWING", error }));
      }
      submitting.current = false;
      return;
    }

    setState((current) => ({ ...current, phase: "SUCCEEDED_RELOADING" }));
    try {
      await loadCanonical(intent);
      setState({
        phase: "SUCCEEDED",
        intent: null,
        error: null,
        receipt: { correlationId: intent.correlationId, idempotencyKey: intent.idempotencyKey, destinationStale: false, evidence: "DIRECT" },
      });
    } catch (caught) {
      const error = operationError(caught);
      if (!failSecurity(error)) setState((current) => ({ ...current, phase: "UNKNOWN_RESULT", error }));
    } finally {
      submitting.current = false;
    }
  }, [commandSource, enabled, failSecurity, finishReconciliation, loadCanonical, realApi, state.intent]);

  const reconcile = useCallback(async () => {
    const intent = state.intent;
    if (!intent || submitting.current) return;
    submitting.current = true;
    setState((current) => ({ ...current, phase: "RECONCILING", error: null }));
    await finishReconciliation(intent, false);
    submitting.current = false;
  }, [finishReconciliation, state.intent]);

  return {
    ...state,
    reviewVersion,
    beginReview,
    submit,
    reconcile,
    cancelReview: () => setState((current) => ({ ...current, phase: "IDLE", error: null, receipt: null })),
    returnToReview: () => { setReviewVersion((version) => version + 1); setState((current) => ({ ...current, phase: "REVIEWING", error: null })); },
    newIntent: () => setState(INITIAL_STATE),
  };
}
