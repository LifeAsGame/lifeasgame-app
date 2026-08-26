"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { adminAuditDataSource } from "../api/audit.source";
import type { AdminAuditDataSource } from "../api/audit.source";
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
import type { QuestOverrideIntent, QuestOverridePhase } from "./useQuestAcceptanceOverride";

function useIsMobile() {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") { setMobile(false); return; }
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

function QuestLevel3Review({
  intent,
  phase,
  error,
  onCancel,
  onSubmit,
}: {
  intent: QuestOverrideIntent;
  phase: QuestOverridePhase;
  error: { status: number | null; message: string } | null;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [verifiedId, setVerifiedId] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    headingRef.current?.focus();
    return () => {
      if (dialog.open && typeof dialog.close === "function") dialog.close();
    };
  }, []);

  if (typeof document === "undefined") return null;
  const busy = phase !== "REVIEWING";
  const requested = intent.kind === "progress"
    ? `Add ${intent.delta}; projected progress ${intent.originalProgress + intent.delta} / ${intent.targetValue}`
    : `Change status to ${intent.status}`;
  const dependency = intent.kind === "progress"
    ? "Reaching or crossing the target can trigger the existing Quest goal/completion policy."
    : "This terminal status change affects the selected Acceptance.";
  const reversibility = intent.kind === "progress"
    ? "This slice exposes additive, non-negative progress only; it does not expose a progress reduction command."
    : "This slice exposes no reverse command from COMPLETED or CANCELED.";

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.questLevel3Dialog}
      aria-labelledby="quest-level3-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
    >
      <div className={styles.questLevel3Header}>
        <span aria-hidden="true">3</span>
        <div><p className={styles.eyebrow}>Level 3 · high-impact review</p><h2 id="quest-level3-title" ref={headingRef} tabIndex={-1}>Review target and consequences before confirmation</h2></div>
      </div>

      <section className={styles.questLevel3Section} aria-labelledby="quest-level3-target">
        <div className={styles.questLevel3SectionHeader}><h3 id="quest-level3-target">Target identity</h3><span>Re-verify before execution</span></div>
        <dl className={styles.questLevel3Identity}>
          <div><dt>Acceptance ID</dt><dd><code>{intent.acceptanceId}</code></dd></div>
          <div><dt>Player ID</dt><dd><code>{intent.playerId}</code></dd></div>
          <div><dt>Quest code</dt><dd><code>{intent.questCode}</code></dd></div>
          <div><dt>Current state</dt><dd>{intent.originalStatus} · {intent.originalProgress} / {intent.targetValue}</dd></div>
          <div><dt>Requested state</dt><dd>{requested}</dd></div>
        </dl>
      </section>

      <section className={styles.questLevel3Section} aria-labelledby="quest-level3-impact">
        <div className={styles.questLevel3SectionHeader}><h3 id="quest-level3-impact">Dependency / blast-radius review</h3><span>Only proven command effects</span></div>
        <dl className={styles.questLevel3Safeguards}>
          <div><dt>◇ Dependencies</dt><dd>{dependency} QuestRoute is not automatically advanced, and reward repair is not performed.</dd></div>
          <div><dt>△ Reversibility</dt><dd>{reversibility}</dd></div>
          <div><dt>▧ Stale safety</dt><dd>Server/domain state is authoritative. There is no optimistic mutation; 409 or unknown results require reconciliation before any retry.</dd></div>
          <div><dt>◎ Audit expectation</dt><dd>Durable Admin Audit evidence must match this correlation and idempotency identity.</dd></div>
        </dl>
      </section>

      <section className={styles.questLevel3Section} aria-labelledby="quest-level3-reason">
        <div className={styles.questLevel3SectionHeader}><h3 id="quest-level3-reason">Mandatory reason</h3></div>
        <p className={styles.questLevel3Reason}>{intent.reason}</p>
        <dl className={styles.questOperationReceipt}>
          <div><dt>Correlation ID</dt><dd><code>{intent.correlationId}</code></dd></div>
          <div><dt>Idempotency key</dt><dd><code>{intent.idempotencyKey}</code></dd></div>
        </dl>
      </section>

      <div className={styles.questLevel3Confirmation}>
        <label>Re-enter Acceptance ID<input value={verifiedId} onChange={(event) => setVerifiedId(event.target.value)} inputMode="numeric" autoComplete="off" disabled={busy} /></label>
        <label className={styles.questConfirmCheck}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} /> I verified the target and understand the terminal or downstream effects.</label>
      </div>
      {error ? <p className={styles.questOverrideError} role="alert">{error.message}</p> : null}
      <div className={styles.questOverrideActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={styles.primaryButton} onClick={onSubmit} disabled={busy || verifiedId !== String(intent.acceptanceId) || !confirmed}>
          {phase === "SUBMITTING" ? "Submitting…" : phase === "SUCCEEDED_RECONCILING" ? "Reconciling…" : "Confirm Level 3 operation"}
        </button>
      </div>
      <p className={styles.questLevel3FocusNote}>The confirm action is never initial focus.</p>
    </dialog>,
    document.body,
  );
}

export function QuestAcceptanceOverride({
  acceptance,
  access,
  readSource,
  auditSource = adminAuditDataSource,
  commandSource = adminQuestCommandSource,
  onCanonicalAcceptance,
  onOpenAudit,
}: {
  acceptance: AdminQuestAcceptance;
  access: AdminAccess;
  readSource: AdminQuestDataSource;
  auditSource?: AdminAuditDataSource;
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
  const reviewHeading = useRef<HTMLHeadingElement | null>(null);
  const mobile = useIsMobile();
  const override = useQuestAcceptanceOverride({
    acceptance,
    enabled: access === "ready",
    commandSource,
    readSource,
    auditSource,
    onCanonicalAcceptance,
  });

  useEffect(() => {
    setKind(acceptance.status === "IN_PROGRESS" ? "progress" : "status");
    setDelta("0");
    setStatus(allowedAdminQuestStatusTargets(acceptance.status)[0] ?? "");
    setReason("");
    setValidation(null);
  }, [acceptance.id, acceptance.status]);

  useEffect(() => {
    if (override.phase === "REVIEWING") reviewHeading.current?.focus();
  }, [override.phase, override.reviewVersion]);

  if (!commandSource.available || auditSource.descriptor.mode !== "api") {
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
        <p>The exact Acceptance was reloaded, and this operation was proven by its direct response or matching Audit evidence.</p>
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

  if (override.phase === "RECONCILED_RETRYABLE" && override.intent) {
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

  if (override.phase === "RECONCILED_UNVERIFIED" && override.intent) {
    return (
      <section className={styles.questOverrideState} data-state="unknown" role="alert">
        <p className={styles.eyebrow}>Ambiguous · unverified</p>
        <h3>Current state matches, but this operation is not proven</h3>
        <p>No exact success Audit matched this operation. Another action may have produced the current state, so this intent cannot be marked successful or retried.</p>
        <dl className={styles.questOperationReceipt}>
          <div><dt>Correlation ID</dt><dd><code>{override.intent.correlationId}</code></dd></div>
          <div><dt>Idempotency key</dt><dd><code>{override.intent.idempotencyKey}</code></dd></div>
        </dl>
        <div className={styles.questOverrideActions}>
          {onOpenAudit ? <button type="button" className={styles.secondaryButton} onClick={onOpenAudit}>Open Audit Explorer</button> : null}
          <button type="button" className={styles.primaryButton} onClick={override.newIntent}>Close investigation</button>
        </div>
      </section>
    );
  }

  if ((override.phase === "CONFLICT_RECONCILING" || override.phase === "CONFLICT_RECONCILED") && override.intent) {
    return (
      <section className={styles.questOverrideState} data-state="conflict" role="alert">
        <p className={styles.eyebrow}>409 conflict</p>
        <h3>{override.phase === "CONFLICT_RECONCILING" ? "Reconciling current state" : "Current state reconciled"}</h3>
        <p>{override.phase === "CONFLICT_RECONCILING" ? "The command is not being retried." : "No exact success Audit matched this operation. Review the reloaded Acceptance before creating a new intent."}</p>
        {override.phase === "CONFLICT_RECONCILED" ? <div className={styles.questOverrideActions}>{onOpenAudit ? <button type="button" className={styles.secondaryButton} onClick={onOpenAudit}>Open Audit Explorer</button> : null}<button type="button" className={styles.primaryButton} onClick={override.newIntent}>Review current Acceptance</button></div> : null}
      </section>
    );
  }

  if (override.intent && ["REVIEWING", "SUBMITTING", "SUCCEEDED_RECONCILING"].includes(override.phase)) {
    const intent = override.intent;
    if (intent.risk === "L3") {
      if (mobile !== false) {
        return <section className={styles.questOverrideUnavailable} role="status"><p className={styles.eyebrow}>Level 3 review</p><h3>{mobile ? "Level 3 unavailable on mobile" : "Preparing safe review"}</h3><p>{mobile ? "Use a desktop or tablet viewport for this high-impact operation." : "Checking the responsive safety profile."}</p><button type="button" className={styles.secondaryButton} onClick={override.cancelReview}>Cancel review</button></section>;
      }
      return <QuestLevel3Review key={override.reviewVersion} intent={intent} phase={override.phase} error={override.error} onCancel={override.cancelReview} onSubmit={() => void override.submit()} />;
    }
    return (
      <section className={styles.questOverrideReview} data-risk={intent.risk} aria-labelledby="quest-override-review-title">
        <div className={styles.questOverrideReviewHeader}>
          <span aria-hidden="true">2</span>
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
        <p className={styles.questLevel2Note}>This operation remains scoped to the selected Acceptance and will be verified by an exact reload.</p>
        {override.error ? <p className={styles.questOverrideError} role="alert">{override.error.message}</p> : null}
        <div className={styles.questOverrideActions}>
          <button type="button" className={styles.secondaryButton} onClick={override.cancelReview} disabled={override.phase !== "REVIEWING"}>Cancel</button>
          <button type="button" className={styles.primaryButton} onClick={() => void override.submit()} disabled={override.phase !== "REVIEWING"}>
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
