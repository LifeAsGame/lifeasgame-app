"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { adminAuditDataSource } from "../api/audit.source";
import type { AdminAuditDataSource } from "../api/audit.source";
import { adminInventoryOperationsCommandSource } from "../api/inventory.command";
import type { AdminInventoryOperationsCommandSource } from "../api/inventory.command";
import { adminInventoryOperationsDataSource } from "../api/inventory.source";
import type { AdminInventoryOperationsDataSource } from "../api/inventory.source";
import { adminPlayerDataSource } from "../api/player.source";
import type { AdminPlayerDataSource } from "../api/player.source";
import type { AdminAccess } from "../model";
import styles from "../admin.module.css";
import type { AdminPlayerInfo } from "./model";
import { PlayerFullDetail } from "./PlayerFullDetail";
import { usePlayerLookup } from "./usePlayerLookup";

function StatePanel({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <section className={styles.statePanel} role="status" aria-live="polite"><h2>{title}</h2><p>{message}</p>{action}</section>;
}

function PlayerDetail({ player, headingRef, onClose, onOpenFull }: { player: AdminPlayerInfo; headingRef: React.RefObject<HTMLHeadingElement | null>; onClose: () => void; onOpenFull: () => void }) {
  const identity = [
    ["Player ID", player.playerId],
    ["Name", player.name],
    ["Gender", player.gender],
    ["Job", player.job],
    ["Level", player.level],
    ["Total EXP", player.totalExp],
    ["Current health", player.currentHealth],
    ["Health capacity", player.healthCapacity],
    ["Current mana", player.currentMana],
    ["Mana capacity", player.manaCapacity],
    ["Representative title ID", player.representativeTitleId ?? "Not set"],
  ] as const;
  const stats = [["STR", player.str], ["AGI", player.agi], ["DEX", player.dex], ["INT", player.intel], ["VIT", player.vit], ["LUC", player.luc]] as const;

  return (
    <aside className={styles.detail} aria-labelledby="player-detail-title">
      <div className={styles.detailHeader}>
        <div><p className={styles.eyebrow}>Read-only quick detail</p><h2 id="player-detail-title" ref={headingRef} tabIndex={-1}>{player.name}</h2></div>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>Close detail</button>
      </div>
      <span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span>
      <code className={styles.detailId}>{player.playerId}</code>
      <dl className={styles.detailList}>
        {identity.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label.includes("ID") ? styles.mono : undefined}>{value}</dd></div>)}
      </dl>
      <section className={styles.playerStats} aria-labelledby="player-stats-title">
        <h3 id="player-stats-title">Core stats</h3>
        <dl>{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <section className={styles.playerEffects} aria-labelledby="player-effects-title">
        <h3 id="player-effects-title">Status effects</h3>
        {player.effects.length > 0 ? <ul>{player.effects.map((effect) => <li key={`${effect.code}:${effect.category}`}><code>{effect.code}</code><span>{effect.category}</span></li>)}</ul> : <p>None</p>}
      </section>
      <div className={styles.privacyNote}><span className={styles.badge} data-state="PRIVACY_GATED">◆ PRIVACY_GATED</span><p>Private LifeLog, Person, and Direct Chat content is not part of Player detail.</p></div>
      <button type="button" className={`${styles.primaryButton} ${styles.openFullPlayerButton}`} onClick={onOpenFull}>Open full Player detail</button>
    </aside>
  );
}

export function PlayerLookup({
  access,
  onLogin,
  onOpenAudit,
  dataSource = adminPlayerDataSource,
  inventorySource = adminInventoryOperationsDataSource,
  commandSource = adminInventoryOperationsCommandSource,
  auditSource = adminAuditDataSource,
}: {
  access: AdminAccess;
  onLogin: () => void;
  onOpenAudit?: () => void;
  dataSource?: AdminPlayerDataSource;
  inventorySource?: AdminInventoryOperationsDataSource;
  commandSource?: AdminInventoryOperationsCommandSource;
  auditSource?: AdminAuditDataSource;
}) {
  const [userId, setUserId] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fullDetail, setFullDetail] = useState(false);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const detailHeading = useRef<HTMLHeadingElement | null>(null);
  const player = usePlayerLookup(access === "ready", dataSource);
  const source = dataSource.descriptor;

  useEffect(() => {
    if (player.detail) detailHeading.current?.focus();
  }, [player.detail]);

  useEffect(() => {
    if (access !== "ready") setFullDetail(false);
  }, [access]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) {
      setValidationError("User ID must be a positive integer.");
      return;
    }
    setValidationError(null);
    void player.lookupByUserId(id);
  };

  const closeDetail = () => {
    setFullDetail(false);
    player.closeDetail();
    requestAnimationFrame(() => detailTrigger.current?.focus());
  };

  const authRequired = access === "unauthenticated" || player.error?.status === 401;
  const forbidden = player.error?.status === 403;
  const lookupError = player.error?.kind === "lookup" && !authRequired && !forbidden ? player.error : null;
  const detailError = player.error?.kind === "detail" && !authRequired && !forbidden ? player.error : null;
  const lookupNotFound = lookupError?.status === 404;
  const detailNotFound = detailError?.status === 404;

  if (access === "ready" && fullDetail && player.detail) {
    return <PlayerFullDetail player={player.detail} userId={player.summary?.userId} access={access} readSource={inventorySource} commandSource={commandSource} auditSource={auditSource} onBack={() => setFullDetail(false)} onOpenAudit={onOpenAudit} />;
  }

  return (
    <div className={styles.auditScreen}>
      <div className={styles.screenHeader}>
        <div><p className={styles.eyebrow}>Players / Player Lookup</p><h1>Player Lookup</h1><p>Find one Player using an exact User ID.</p></div>
        <div className={styles.screenActions}>
          <span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span>
          <button type="button" className={styles.secondaryButton} onClick={() => void player.retry()} disabled={access !== "ready" || player.loading !== null || (!player.summary && !player.detail)}>Refresh</button>
        </div>
      </div>

      {access === "ready" ? (
        <form className={styles.playerLookupForm} aria-label="Player lookup" onSubmit={submit}>
          <label>User ID<input type="number" min="1" step="1" required value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Exact User ID" /></label>
          <button type="submit" className={styles.primaryButton} disabled={player.loading !== null}>Lookup Player</button>
          {validationError ? <p role="alert">{validationError}</p> : null}
        </form>
      ) : null}

      <div className={styles.feedMeta}>
        <span>Exact lookup key: User ID · no list or text search</span>
        <span>Source: <code>{source.playerLabel}</code>{player.loadedAt ? ` · refreshed ${player.loadedAt.toLocaleTimeString()}` : ""}</span>
      </div>

      {access === "loading" ? <StatePanel title="Validating session" message="Checking the authenticated operator session." /> : null}
      {authRequired ? <StatePanel title="Authentication required" message="Sign in with an authorized operator account, then retry Player Lookup." action={<button type="button" className={styles.primaryButton} onClick={onLogin}>Go to login</button>} /> : null}
      {forbidden ? <StatePanel title="Admin access denied" message="The server did not authorize this session for Player Lookup. No Player data is shown." /> : null}
      {access === "ready" && !player.summary && !player.error && player.loading === null ? <StatePanel title="Ready for exact lookup" message="Enter a positive User ID. Email, nickname, and unbounded Player search are not supported." /> : null}
      {access === "ready" && player.loading === "lookup" ? <StatePanel title="Loading Player" message={`Looking up User ID ${userId}.`} /> : null}
      {access === "ready" && lookupNotFound ? <StatePanel title="Player not found" message="No Player is linked to that User ID." action={<button type="button" className={styles.primaryButton} onClick={() => void player.retry()}>Retry</button>} /> : null}
      {access === "ready" && lookupError && !lookupNotFound ? <StatePanel title="Unable to load Player" message={lookupError.message} action={<button type="button" className={styles.primaryButton} onClick={() => void player.retry()}>Retry</button>} /> : null}

      {access === "ready" && player.summary ? (
        <div className={styles.playerLayout}>
          <section aria-labelledby="player-result-title">
            <h2 id="player-result-title" className={styles.resultTitle}>Lookup result</h2>
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.playerTable}`}>
                <caption>Exact Player lookup result</caption>
                <thead><tr><th>Player ID</th><th>User ID</th><th>Name</th><th>Detail</th></tr></thead>
                <tbody><tr><td className={styles.mono}>{player.summary.playerId}</td><td className={styles.mono}>{player.summary.userId}</td><td>{player.summary.name}</td><td><button ref={detailTrigger} type="button" className={styles.idButton} onClick={() => void player.openDetail(player.summary!.playerId)}>Open read-only detail</button></td></tr></tbody>
              </table>
            </div>
          </section>
          {player.detail ? <PlayerDetail player={player.detail} headingRef={detailHeading} onClose={closeDetail} onOpenFull={() => setFullDetail(true)} /> : player.loading === "detail" ? <StatePanel title="Loading Player detail" message={`Requesting Player ID ${player.summary.playerId}.`} /> : detailNotFound ? <StatePanel title="Player detail unavailable" message="The Player detail could not be found for the returned Player ID." action={<button type="button" className={styles.primaryButton} onClick={() => void player.retry()}>Retry</button>} /> : detailError ? <StatePanel title="Unable to load Player detail" message={detailError.message} action={<button type="button" className={styles.primaryButton} onClick={() => void player.retry()}>Retry</button>} /> : <aside className={styles.detailPlaceholder}><span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span><h2>Player quick detail</h2><p>Open the exact result to fetch allowed Player fields.</p></aside>}
        </div>
      ) : null}
    </div>
  );
}
