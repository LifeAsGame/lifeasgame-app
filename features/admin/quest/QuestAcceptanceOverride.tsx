"use client";

import { useEffect, useRef, useState } from "react";

import { adminQuestCommandSource } from "../api/quest.command";
import type { AdminQuestCommandSource, AdminQuestStatusCommand } from "../api/quest.command";
import type { AdminQuestDataSource } from "../api/quest.source";
import type { AdminAccess } from "../model";
import styles from "../admin.module.css";
import type { AdminQuestAcceptance } from "./model";
import {
  adminQuestOverrideRisk,
  allowedAdminQuestStatusTargets,
  useQuestAcceptanceOverride,
} from "./useQuestAcceptanceOverride";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 759px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return mobile;
}

function operationLabel(intent: NonNullable<ReturnType<typeof useQuestAcceptanceOverride>["intent"]>) {
  return intent.kind === "progress" ? `Add ${intent.delta} progress` : `Change status to ${intent.status}`;
}

export function QuestAcceptanceOverride({
  acceptance,
  access,
  readSource,
  commandSource = adminQuestCommandSource,
  onCanonicalAcceptance,
  onOpenAudit,
}: {
  acceptance: AdminQuestAcceptance;
  access: AdminAccess;
  readSource: AdminQuestDataSource;
  commandSource?: AdminQuestCommandSource;
  onCanonicalAcceptance: (acceptance: AdminQuestAcceptance) => void;
  onOpenAudit?: () => void;
}) {
  const statusTargets = allowedAdminQuestStatusTargets(acceptance.status);
  const [kind, setKind] = useState<"progress" | "status">(acceptance.status === "IN_PROGRESS" ? "progress" : "status");
  const [delta, setDelta] = useState("0");
  const [status, setStatus] = useState<AdminQuestStatusCommand | "">(statusTargets[0] ?? "");
  const [reason, setReason] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [verifiedId, setVerifiedId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement | null>(null);
  const mobile = useIsMobile();
  const override = useQuestAcceptanceOverride({
    acceptance,
    enabled: access === "ready",
    commandSource,
    readSource,
    onCanonicalAcceptance,
  });

  useEffect(() => {
    setKind(acceptance.status === "IN_PROGRESS" ? "progress" : "status");
    setDelta("0");
    setStatus(allowedAdminQuestStatusTargets(acceptance.status)[0] ?? "");
    setReason("");
    setValidation(null);
    setVerifiedId("");
    setConfirmed(false);
  }, [acceptance.id, acceptance.status]);

  useEffect(() => {
    if (override.phase === "REVIEWING") reviewHeading.current?.focus();
  }, [override.phase]);

  if (!commandSource.available) {
    return (
      <section className={styles.questOverrideUnavailable} aria-labelledby="quest-override-title">
        <p className={styles.eyebrow}>Acceptance operation</p>
        <h3 id="quest-override-title">Operational command unavailable</h3>
        <p>Real API mode is required. Mock mode remains read-only and does not simulate a successful high-risk operation.</p>
      </section>
    );
  }

  if (override.error?.status === 401 || override.error?.status === 403) {
    return <section className={styles.questOverrideState} role="alert"><h3>{override.error.status === 401 ? "Authentication required" : "Admin access denied"}</h3><p>{override.error.message}</p></section>;
  }

  if (override.phase === "SUCCEEDED" && override.receipt) {
    return (
      <section className={styles.questOverrideState} data-state="success" aria-labelledby="quest-operation-complete">
        <p className={styles.eyebrow}>Canonical state reconciled</p>
        <h3 id="quest-operation-complete">Operation completed</h3>
        <p>The exact Acceptance was reloaded after the server accepted the command.</p>
        <dl className={styles.questOperationReceipt}>
          <div><dt>Correlation ID</dt><dd><code>{override.receipt.correlationId}</code></dd></div>
          <div><dt>Idempotency key</dt><dd><code>{override.receipt.idempotencyKey}</code></dd></div>
        </dl>
        <div className={styles.questOverrideActions}>
          {onOpenAudit ? <button type="button" className={styles.secondaryButton} onClick={onOpenAudit}>Open Audit Explorer</button> : null}
          <button type="button" className={styles.primaryButton} onClick={override.newIntent}>Start another operation</button>
        </div>
      </section>
    );
  }

  if (override.phase === "UNKNOWN_RESULT" || override.phase === "RECONCILING") {
    return (
      <section className={styles.questOverrideState} data-state="unknown" role="alert">
        <p className={styles.eyebrow}>Unknown result</p>
        <h3>{override.phase === "RECONCILING" ? "Reconciling exact Acceptance" : "Do not retry yet"}</h3>
        <p>{override.phase === "RECONCILING" ? "Loading the authoritative Acceptance state." : `${override.error?.message ?? "The command result is unknown."} Reconcile before deciding whether to retry.`}</p>
        <button type="button" className={styles.primaryButton} onClick={() => void override.reconcile()} disabled={override.phase === "RECONCILING"}>Reconcile current state</button>
      </section>
    );
  }

  if (override.phase === "RECONCILED" && override.intent) {
    return (
      <section className={styles.questOverrideState}>
        <p className={styles.eyebrow}>Reconciled · unchanged intent</p>
        <h3>Operation was not reflected</h3>
        <p>The authoritative Acceptance does not show the requested outcome. A manual retry will reuse the same idempotency key.</p>
        <code className={styles.detailId}>{override.intent.idempotencyKey}</code>
        <div className={styles.questOverrideActions}>
          <button type="button" className={styles.secondaryButton} onClick={override.newIntent}>Cancel operation</button>
          <button type="button" className={styles.primaryButton} onClick={() => void override.submit()}>Retry same operation</button>
        </div>
      </section>
    );
  }

  if ((override.phase === "CONFLICT_RECONCILING" || override.phase === "CONFLICT_RECONCILED") && override.intent) {
    return (
      <section className={styles.questOverrideState} data-state="conflict" role="alert">
        <p className={styles.eyebrow}>409 conflict</p>
        <h3>{override.phase === "CONFLICT_RECONCILING" ? "Reconciling current state" : "Current state reconciled"}</h3>
        <p>{override.phase === "CONFLICT_RECONCILING" ? "The command is not being retried." : "Review the reloaded Acceptance before creating a new operation."}</p>
        {override.phase === "CONFLICT_RECONCILED" ? <button type="button" className={styles.primaryButton} onClick={override.newIntent}>Review current Acceptance</button> : null}
      </section>
    );
  }

  if (override.intent && ["REVIEWING", "SUBMITTING", "SUCCEEDED_RECONCILING"].includes(override.phase)) {
    const intent = override.intent;
    const level3Unavailable = intent.risk === "L3" && mobile;
    const level3Confirmed = intent.risk === "L2" || (verifiedId === String(intent.acceptanceId) && confirmed);
    return (
      <section className={styles.questOverrideReview} data-risk={intent.risk} aria-labelledby="quest-override-review-title">
        <div className={styles.questOverrideReviewHeader}>
          <span aria-hidden="true">{intent.risk === "L3" ? "3" : "2"}</span>
          <div><p className={styles.eyebrow}>Level {intent.risk.slice(1)} review</p><h3 id="quest-override-review-title" ref={reviewHeading} tabIndex={-1}>Confirm Acceptance operation</h3></div>
        </div>
        <dl className={styles.questOverrideSummary}>
          <div><dt>Acceptance</dt><dd><code>{intent.acceptanceId}</code> · {intent.questCode}</dd></div>
          <div><dt>Player ID</dt><dd><code>{intent.playerId}</code></dd></div>
          <div><dt>Current state</dt><dd>{intent.originalStatus} · {intent.originalProgress} / {intent.targetValue}</dd></div>
          <div><dt>Requested change</dt><dd>{operationLabel(intent)}</dd></div>
          <div><dt>Reason</dt><dd>{intent.reason}</dd></div>
          <div><dt>Audit</dt><dd>Successful commands append an Admin Audit event with the correlation ID.</dd></div>
        </dl>
        {intent.risk === "L3" ? (
          <div className={styles.questLevel3Warning}>
            <strong>High-impact operation</strong>
            <p>This can reach a target or enter a terminal state. It does not advance a QuestRoute or repair rewards.</p>
            {level3Unavailable ? <p role="alert">Level 3 confirmation is unavailable on mobile. Use a desktop or tablet viewport.</p> : (
              <>
                <label>Re-enter Acceptance ID<input value={verifiedId} onChange={(event) => setVerifiedId(event.target.value)} inputMode="numeric" autoComplete="off" /></label>
                <label className={styles.questConfirmCheck}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I verified the target and understand the terminal or downstream effects.</label>
              </>
            )}
          </div>
        ) : <p className={styles.questLevel2Note}>This operation remains scoped to the selected Acceptance and will be verified by an exact reload.</p>}
        {override.error ? <p className={styles.questOverrideError} role="alert">{override.error.message}</p> : null}
        <div className={styles.questOverrideActions}>
          <button type="button" className={styles.secondaryButton} onClick={override.cancelReview} disabled={override.phase !== "REVIEWING"}>Cancel</button>
          <button type="button" className={styles.primaryButton} onClick={() => void override.submit()} disabled={override.phase !== "REVIEWING" || level3Unavailable || !level3Confirmed}>
            {override.phase === "SUBMITTING" ? "Submitting…" : override.phase === "SUCCEEDED_RECONCILING" ? "Reconciling…" : `Confirm Level ${intent.risk.slice(1)} operation`}
          </button>
        </div>
      </section>
    );
  }

  const canAdjustProgress = acceptance.status === "IN_PROGRESS";
  const hasActions = canAdjustProgress || statusTargets.length > 0;

  if (!hasActions) {
    return <section className={styles.questOverrideUnavailable}><p className={styles.eyebrow}>Acceptance operation</p><h3>No available operation</h3><p>This terminal Acceptance remains available for read-only inspection.</p></section>;
  }

  const review = () => {
    setValidation(null);
    try {
      if (kind === "progress") {
        if (!delta.trim()) throw new RangeError("Progress delta is required.");
        override.beginReview({ kind, delta: Number(delta), reason });
      } else if (status) {
        override.beginReview({ kind, status, reason });
      } else {
        throw new RangeError("Choose an allowed target status.");
      }
    } catch (caught) {
      setValidation(caught instanceof Error ? caught.message : "Review the command values.");
    }
  };

  const draftRisk = kind === "progress"
    ? adminQuestOverrideRisk(acceptance, { kind, delta: Number(delta), reason })
    : status ? adminQuestOverrideRisk(acceptance, { kind, status, reason }) : "L2";

  return (
    <section className={styles.questOverrideForm} aria-labelledby="quest-override-title">
      <div><p className={styles.eyebrow}>Acceptance operation</p><h3 id="quest-override-title">Prepare controlled override</h3></div>
      {canAdjustProgress && statusTargets.length ? <label>Operation<select value={kind} onChange={(event) => setKind(event.target.value as "progress" | "status")}><option value="progress">Adjust progress</option><option value="status">Change status</option></select></label> : null}
      {kind === "progress" && canAdjustProgress ? <label>Progress delta<input type="number" min={0} step={1} value={delta} onChange={(event) => setDelta(event.target.value)} /></label> : (
        <label>Target status<select value={status} onChange={(event) => setStatus(event.target.value as AdminQuestStatusCommand)}>{statusTargets.map((target) => <option key={target} value={target}>{target}</option>)}</select></label>
      )}
      <label>Reason *<input type="text" maxLength={512} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required operational reason" /></label>
      <p className={styles.questRiskPreview}>Review level: <strong>{draftRisk}</strong>{draftRisk === "L3" ? " · desktop or tablet confirmation required" : ""}</p>
      {validation ? <p className={styles.questOverrideError} role="alert">{validation}</p> : null}
      <button type="button" className={styles.primaryButton} onClick={review}>Review operation</button>
    </section>
  );
}
