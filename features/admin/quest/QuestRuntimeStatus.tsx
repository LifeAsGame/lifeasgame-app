"use client";

import { useEffect, useRef } from "react";

import { adminQuestDataSource } from "../api/quest.source";
import type { AdminQuestDataSource } from "../api/quest.source";
import { adminQuestCommandSource } from "../api/quest.command";
import type { AdminQuestCommandSource } from "../api/quest.command";
import type { AdminAccess } from "../model";
import styles from "../admin.module.css";
import { ADMIN_QUEST_ACCEPTANCE_STATUSES } from "./model";
import type { AdminQuestAcceptance, AdminQuestAcceptanceStatus, AdminQuestDefinition } from "./model";
import { QuestAcceptanceOverride } from "./QuestAcceptanceOverride";
import { useQuestRuntimeStatus } from "./useQuestRuntimeStatus";

const UNAVAILABLE_COMMAND_SOURCE: AdminQuestCommandSource = { available: false };

function StatePanel({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <section className={styles.statePanel} role="status" aria-live="polite"><h2>{title}</h2><p>{message}</p>{action}</section>;
}

function shown(value: string | number | Record<string, number> | null) {
  if (value === null) return "Not set";
  if (typeof value === "object") return Object.keys(value).length ? JSON.stringify(value) : "None";
  return value;
}

function QuestStatusBadge({ status }: { status: AdminQuestAcceptanceStatus }) {
  return <span className={styles.questStatus} data-status={status}>◎ {status}</span>;
}

function DefinitionDetail({ definition, headingRef }: { definition: AdminQuestDefinition; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const fields = [
    ["Definition ID", definition.id], ["Category", shown(definition.category)], ["Target type", definition.targetType],
    ["Target value", definition.targetValue], ["Repeat rule", definition.repeatRule], ["Completion policy", definition.completionPolicy],
    ["Definition version", definition.definitionVersion], ["Reward profile code", shown(definition.rewardProfileCode)],
    ["Reward EXP", shown(definition.rewardExp)], ["Reward stats", shown(definition.rewardStats)], ["Due at", shown(definition.dueAt)],
    ["Semantic category", shown(definition.semanticCategory)], ["Progress source", shown(definition.progressSource)],
    ["Repeat policy", shown(definition.repeatPolicy)], ["Role template code", shown(definition.roleTemplateCode)],
  ] as const;

  return (
    <section className={styles.questPanel} aria-labelledby="quest-definition-title">
      <div className={styles.detailHeader}>
        <div><p className={styles.eyebrow}>Quest Definition</p><h2 id="quest-definition-title" ref={headingRef} tabIndex={-1}>{definition.title}</h2></div>
        <span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span>
      </div>
      <code className={styles.detailId}>{definition.code}</code>
      <p className={styles.questDescription}>{definition.descriptionMd}</p>
      <dl className={`${styles.detailList} ${styles.questDefinitionFields}`}>
        {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label.includes("ID") || label.includes("code") ? styles.mono : undefined}>{value}</dd></div>)}
      </dl>
    </section>
  );
}

function AcceptanceDetail({ acceptance, headingRef, onClose, children }: { acceptance: AdminQuestAcceptance; headingRef: React.RefObject<HTMLHeadingElement | null>; onClose: () => void; children: React.ReactNode }) {
  const fields = [
    ["Acceptance ID", acceptance.id], ["Quest ID", acceptance.questId], ["Player ID", acceptance.playerId], ["Quest code", acceptance.code],
    ["Category", shown(acceptance.category)], ["Target type", acceptance.targetType], ["Target value", acceptance.targetValue],
    ["Progress value", acceptance.progressValue], ["Completion policy", acceptance.completionPolicy], ["Repeat rule", acceptance.repeatRule],
    ["Period start", shown(acceptance.periodStart)], ["Period end", shown(acceptance.periodEnd)], ["Accepted at", acceptance.acceptedAt],
    ["Period key", shown(acceptance.periodKey)], ["Goal reached at", shown(acceptance.goalReachedAt)], ["Completed at", shown(acceptance.completedAt)],
    ["Due at", shown(acceptance.dueAt)], ["Semantic category", shown(acceptance.semanticCategory)],
    ["Progress source", shown(acceptance.progressSource)], ["Repeat policy", shown(acceptance.repeatPolicy)],
    ["Role template code", shown(acceptance.roleTemplateCode)],
  ] as const;

  return (
    <aside className={styles.detail} aria-labelledby="quest-acceptance-title">
      <div className={styles.detailHeader}>
        <div><p className={styles.eyebrow}>Quest Acceptance</p><h2 id="quest-acceptance-title" ref={headingRef} tabIndex={-1}>{acceptance.title}</h2></div>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>Close detail</button>
      </div>
      <QuestStatusBadge status={acceptance.status} />
      <dl className={styles.detailList}>
        {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label.includes("ID") || label.includes("code") ? styles.mono : undefined}>{value}</dd></div>)}
      </dl>
      {children}
    </aside>
  );
}

export function QuestRuntimeStatus({
  access,
  onLogin,
  onOpenAudit,
  dataSource = adminQuestDataSource,
  commandSource = adminQuestCommandSource,
}: {
  access: AdminAccess;
  onLogin: () => void;
  onOpenAudit?: () => void;
  dataSource?: AdminQuestDataSource;
  commandSource?: AdminQuestCommandSource;
}) {
  const quest = useQuestRuntimeStatus(access === "ready", dataSource);
  const definitionHeading = useRef<HTMLHeadingElement | null>(null);
  const acceptanceHeading = useRef<HTMLHeadingElement | null>(null);
  const acceptanceTriggers = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => { if (quest.definition) definitionHeading.current?.focus(); }, [quest.definition]);
  useEffect(() => { if (quest.acceptance) acceptanceHeading.current?.focus(); }, [quest.acceptance]);

  const closeAcceptance = () => {
    const id = quest.acceptance?.id;
    quest.closeAcceptance();
    if (id) requestAnimationFrame(() => acceptanceTriggers.current.get(id)?.focus());
  };

  const authRequired = access === "unauthenticated" || quest.error?.status === 401;
  const forbidden = quest.error?.status === 403;
  const visibleError = quest.error && !authRequired && !forbidden ? quest.error : null;
  const indexError = visibleError?.kind === "index" ? visibleError : null;
  const definitionError = visibleError?.kind === "definition" ? visibleError : null;
  const acceptancesError = visibleError?.kind === "acceptances" ? visibleError : null;
  const acceptanceError = visibleError?.kind === "acceptance" ? visibleError : null;

  return (
    <div className={styles.auditScreen}>
      <div className={styles.screenHeader}>
        <div><p className={styles.eyebrow}>Content / Quest Runtime Status</p><h1>Quest Runtime Status</h1><p>Inspect Quest definitions and Acceptance state, then run the approved controlled Acceptance operations.</p></div>
        <div className={styles.screenActions}>
          <span className={styles.badge} data-state="SUPPORTED">✓ CONTROLLED</span>
          <button type="button" className={styles.secondaryButton} onClick={() => void quest.retry()} disabled={access !== "ready" || quest.loading !== null || (!quest.indexLoaded && !quest.error)}>Refresh</button>
        </div>
      </div>

      <div className={styles.feedMeta}>
        <span>Blueprint catalog: {quest.catalog.length} · Definitions: {quest.definitions.length}</span>
        <span>Source: <code>{dataSource.descriptor.questLabel}</code>{quest.loadedAt ? ` · refreshed ${quest.loadedAt.toLocaleTimeString()}` : ""}</span>
      </div>

      {access === "loading" ? <StatePanel title="Validating session" message="Checking the authenticated operator session." /> : null}
      {authRequired ? <StatePanel title="Authentication required" message="Sign in with an authorized operator account, then retry Quest Runtime Status." action={<button type="button" className={styles.primaryButton} onClick={onLogin}>Go to login</button>} /> : null}
      {forbidden ? <StatePanel title="Admin access denied" message="The server did not authorize this session for Quest Runtime Status. No Quest data is shown." /> : null}
      {access === "ready" && (quest.loading === "index" || (!quest.indexLoaded && !quest.error)) ? <StatePanel title="Loading Quest sources" message="Loading the Blueprint catalog and authored Quest definitions." /> : null}
      {access === "ready" && indexError ? <StatePanel title="Unable to load Quest sources" message={indexError.message} action={<button type="button" className={styles.primaryButton} onClick={() => void quest.retry()}>Retry</button>} /> : null}
      {access === "ready" && quest.indexLoaded && quest.definitions.length === 0 ? <StatePanel title="No Quest definitions" message="The authored Quest definition source is empty." /> : null}

      {access === "ready" && quest.indexLoaded && quest.definitions.length > 0 ? (
        <div className={styles.questLayout}>
          <section className={styles.questPanel} aria-labelledby="quest-definitions-title">
            <div className={styles.questPanelHeader}><div><p className={styles.eyebrow}>Definition source</p><h2 id="quest-definitions-title">Quest definitions</h2></div><span>{quest.definitions.length} records</span></div>
            <details className={styles.catalogDisclosure}>
              <summary>Blueprint catalog · {quest.catalog.length}</summary>
              <ul>{quest.catalog.map((blueprint) => <li key={blueprint.code}><code>{blueprint.code}</code><span>{blueprint.title}</span></li>)}</ul>
            </details>
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.questDefinitionTable}`}>
                <caption>Authored Quest definitions</caption>
                <thead><tr><th>Code</th><th>Title</th><th>Category</th><th>Version</th></tr></thead>
                <tbody>{quest.definitions.map((definition) => (
                  <tr key={definition.code} data-selected={quest.selectedCode === definition.code || undefined}>
                    <td><button type="button" className={styles.idButton} onClick={() => void quest.selectDefinition(definition.code)}>{definition.code}</button></td>
                    <td>{definition.title}</td><td>{shown(definition.category)}</td><td>{definition.definitionVersion}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <div className={styles.questWorkspace}>
            {quest.loading === "definition" ? <StatePanel title="Loading Quest definition" message={`Loading ${quest.selectedCode}.`} /> : definitionError ? <StatePanel title={definitionError.status === 404 ? "Quest definition not found" : "Unable to load Quest definition"} message={definitionError.message} action={<button type="button" className={styles.primaryButton} onClick={() => void quest.retry()}>Retry</button>} /> : quest.definition ? <DefinitionDetail definition={quest.definition} headingRef={definitionHeading} /> : <section className={styles.detailPlaceholder}><span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span><h2>Select a Quest definition</h2><p>Choose an exact Quest code to load its definition and runtime Acceptances.</p></section>}

            {quest.definition ? (
              <section className={styles.questPanel} aria-labelledby="quest-acceptances-title">
                <div className={styles.questAcceptanceHeader}>
                  <div><p className={styles.eyebrow}>Runtime state</p><h2 id="quest-acceptances-title">Quest Acceptances</h2></div>
                  <label>Acceptance status<select value={quest.statusFilter} onChange={(event) => void quest.filterAcceptances(event.target.value as AdminQuestAcceptanceStatus | "")} disabled={quest.loading !== null}><option value="">All statuses</option>{ADMIN_QUEST_ACCEPTANCE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                </div>
                <p className={styles.questSemantics}>Definition configuration and player Acceptance runtime state remain separate. Quest completion does not automatically advance a QuestRoute.</p>
                <div className={styles.questAcceptanceLayout}>
                  {quest.loading === "acceptances" ? <StatePanel title="Loading Quest Acceptances" message="Applying the exact runtime status filter." /> : acceptancesError ? <StatePanel title="Unable to load Quest Acceptances" message={acceptancesError.message} action={<button type="button" className={styles.primaryButton} onClick={() => void quest.retry()}>Retry</button>} /> : quest.acceptances.length === 0 ? <StatePanel title={quest.statusFilter ? "No matching Acceptances" : "No Quest Acceptances"} message={quest.statusFilter ? `No ${quest.statusFilter} Acceptance exists for this Quest.` : "No player Acceptance exists for this Quest definition."} /> : (
                    <div className={styles.tableWrap}>
                      <table className={`${styles.table} ${styles.questAcceptanceTable}`}>
                        <caption>Acceptances for {quest.definition.code}</caption>
                        <thead><tr><th>ID</th><th>Player ID</th><th>Progress</th><th>Status</th><th>Accepted</th></tr></thead>
                        <tbody>{quest.acceptances.map((acceptance) => <tr key={acceptance.id} data-selected={quest.acceptance?.id === acceptance.id || undefined}><td><button ref={(node) => { if (node) acceptanceTriggers.current.set(acceptance.id, node); else acceptanceTriggers.current.delete(acceptance.id); }} type="button" className={styles.idButton} onClick={() => void quest.openAcceptance(acceptance.id)}>{acceptance.id}</button></td><td className={styles.mono}>{acceptance.playerId}</td><td>{acceptance.progressValue} / {acceptance.targetValue}</td><td><QuestStatusBadge status={acceptance.status} /></td><td>{acceptance.acceptedAt}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                  {quest.loading === "acceptance" ? <StatePanel title="Loading Acceptance detail" message="Loading the selected Acceptance ID." /> : acceptanceError ? <StatePanel title={acceptanceError.status === 404 ? "Acceptance not found" : "Unable to load Acceptance detail"} message={acceptanceError.message} action={<button type="button" className={styles.primaryButton} onClick={() => void quest.retry()}>Retry</button>} /> : quest.acceptance ? (
                    <AcceptanceDetail acceptance={quest.acceptance} headingRef={acceptanceHeading} onClose={closeAcceptance}>
                      <QuestAcceptanceOverride
                        acceptance={quest.acceptance}
                        access={access}
                        readSource={dataSource}
                        commandSource={dataSource.descriptor.mode === "api" ? commandSource : UNAVAILABLE_COMMAND_SOURCE}
                        onCanonicalAcceptance={quest.applyCanonicalAcceptance}
                        onOpenAudit={onOpenAudit}
                      />
                    </AcceptanceDetail>
                  ) : <aside className={styles.detailPlaceholder}><span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span><h2>Acceptance detail</h2><p>Open an exact Acceptance ID to inspect its runtime state.</p></aside>}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
