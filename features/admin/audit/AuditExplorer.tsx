"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import type { AdminAccess, AdminAuditEvent, AdminAuditQuery, AdminAuditResult } from "../model";
import styles from "../admin.module.css";
import { useAuditEvents } from "./useAuditEvents";

type FilterDraft = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  result: "" | AdminAuditResult;
  correlationId: string;
  from: string;
  to: string;
  size: "25" | "50" | "100";
};

const EMPTY_FILTERS: FilterDraft = {
  actorUserId: "",
  action: "",
  targetType: "",
  targetId: "",
  result: "",
  correlationId: "",
  from: "",
  to: "",
  size: "50",
};

function toQuery(filters: FilterDraft, cursor?: string): AdminAuditQuery {
  return {
    ...(filters.actorUserId ? { actorUserId: Number(filters.actorUserId) } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
    ...(filters.targetId ? { targetId: filters.targetId.trim() } : {}),
    ...(filters.result ? { result: filters.result } : {}),
    ...(filters.correlationId ? { correlationId: filters.correlationId.trim() } : {}),
    ...(filters.from ? { from: new Date(filters.from).toISOString() } : {}),
    ...(filters.to ? { to: new Date(filters.to).toISOString() } : {}),
    ...(cursor ? { cursor } : {}),
    size: Number(filters.size),
  };
}

function hasFilters(filters: FilterDraft) {
  return Boolean(filters.actorUserId || filters.action || filters.targetType || filters.targetId || filters.result || filters.correlationId || filters.from || filters.to);
}

function formatOccurredAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

function StatePanel({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <section className={styles.statePanel} role="status" aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </section>
  );
}

function AuditFilters({
  draft,
  error,
  disabled,
  onChange,
  onSubmit,
  onClear,
}: {
  draft: FilterDraft;
  error: string | null;
  disabled: boolean;
  onChange: (key: keyof FilterDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  const change = (key: keyof FilterDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(key, event.target.value);
  return (
    <form className={styles.filterPanel} aria-label="Audit filters" onSubmit={onSubmit}>
      <div className={styles.filterGrid}>
        <label>Actor ID<input type="number" min="1" step="1" value={draft.actorUserId} onChange={change("actorUserId")} placeholder="User ID" /></label>
        <label>Action<input value={draft.action} onChange={(event) => onChange("action", event.target.value.toUpperCase())} pattern="[A-Z][A-Z0-9_]{2,63}" maxLength={64} placeholder="ACTION_CODE" /></label>
        <label>Target Type<input value={draft.targetType} onChange={(event) => onChange("targetType", event.target.value.toUpperCase())} pattern="[A-Z][A-Z0-9_]{2,63}" maxLength={64} placeholder="TARGET_TYPE" /></label>
        <label>Target ID<input value={draft.targetId} onChange={change("targetId")} pattern="[A-Za-z0-9][A-Za-z0-9._:-]{0,127}" maxLength={128} placeholder="Canonical ID" /></label>
        <label>Result<select value={draft.result} onChange={change("result")}><option value="">All</option><option value="SUCCESS">SUCCESS</option><option value="FAILED">FAILED</option></select></label>
        <label>Correlation ID<input value={draft.correlationId} onChange={change("correlationId")} pattern="[A-Za-z0-9][A-Za-z0-9._:-]{0,99}" maxLength={100} placeholder="Correlation ID" /></label>
        <label>From <span>(inclusive)</span><input type="datetime-local" value={draft.from} onChange={change("from")} /></label>
        <label>To <span>(exclusive)</span><input type="datetime-local" value={draft.to} onChange={change("to")} /></label>
        <label>Page size<select value={draft.size} onChange={change("size")}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
      </div>
      <div className={styles.filterActions}>
        {error ? <p role="alert">{error}</p> : <span />}
        <button type="button" className={styles.secondaryButton} onClick={onClear} disabled={disabled}>Clear filters</button>
        <button type="submit" className={styles.primaryButton} disabled={disabled}>Apply filters</button>
      </div>
    </form>
  );
}

function AuditDetail({ event, headingRef, onClose }: { event: AdminAuditEvent; headingRef: React.RefObject<HTMLHeadingElement | null>; onClose: () => void }) {
  const rows = [
    ["Audit ID", event.id],
    ["Actor user ID", event.actorUserId],
    ["Action", event.action],
    ["Target type", event.targetType],
    ["Target ID", event.targetId],
    ["Result", event.result],
    ["Reason", event.reason ?? "Not supplied"],
    ["Correlation ID", event.correlationId],
    ["Idempotency key", event.idempotencyKey ?? "Not supplied"],
    ["Occurred at", formatOccurredAt(event.occurredAt)],
  ] as const;

  return (
    <aside className={styles.detail} aria-labelledby="audit-detail-title">
      <div className={styles.detailHeader}>
        <div><p className={styles.eyebrow}>Safe read-only summary</p><h2 id="audit-detail-title" ref={headingRef} tabIndex={-1}>Audit detail</h2></div>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>Close detail</button>
      </div>
      <code className={styles.detailId}>AUD-{event.id}</code>
      <dl className={styles.detailList}>
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label.includes("ID") || label.includes("key") ? styles.mono : undefined}>{value}</dd></div>)}
      </dl>
      <div className={styles.privacyNote}>
        <span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span>
        <strong>Audit-safe fields only</strong>
        <p>Private Journal, LifeLog, Person, or Direct Chat bodies and raw request/response payloads are not displayed.</p>
      </div>
    </aside>
  );
}

export function AuditExplorer({ access, onLogin }: { access: AdminAccess; onLogin: () => void }) {
  const [draft, setDraft] = useState<FilterDraft>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<FilterDraft>(EMPTY_FILTERS);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedTrigger = useRef<HTMLButtonElement | null>(null);
  const detailHeading = useRef<HTMLHeadingElement | null>(null);
  const query = useMemo(() => toQuery(applied, cursor), [applied, cursor]);
  const audit = useAuditEvents(access === "ready", query);
  const selected = audit.data?.items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId !== null) detailHeading.current?.focus();
  }, [selectedId]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.from && draft.to && new Date(draft.from) >= new Date(draft.to)) {
      setFilterError("To must be later than From.");
      return;
    }
    setFilterError(null);
    setApplied({ ...draft });
    setCursor(undefined);
    setCursorHistory([]);
    setSelectedId(null);
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setCursor(undefined);
    setCursorHistory([]);
    setSelectedId(null);
    setFilterError(null);
  };

  const showOlder = () => {
    if (!audit.data?.nextCursor) return;
    setCursorHistory((history) => [...history, cursor]);
    setCursor(audit.data.nextCursor!);
    setSelectedId(null);
  };

  const showNewer = () => {
    if (cursorHistory.length === 0) return;
    setCursor(cursorHistory[cursorHistory.length - 1]);
    setCursorHistory((history) => history.slice(0, -1));
    setSelectedId(null);
  };

  const closeDetail = () => {
    setSelectedId(null);
    requestAnimationFrame(() => selectedTrigger.current?.focus());
  };

  const data = audit.data;
  const authRequired = access === "unauthenticated" || audit.error?.status === 401;
  const forbidden = audit.error?.status === 403;
  const emptyTitle = hasFilters(applied) ? "No matching audit events" : "No audit events";

  return (
    <div className={styles.auditScreen}>
      <div className={styles.screenHeader}>
        <div><p className={styles.eyebrow}>System / Admin Audit</p><h1>Admin Audit Explorer</h1><p>Investigate operator actions without exposing private user body content.</p></div>
        <div className={styles.screenActions}>
          <span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span>
          <button type="button" className={styles.secondaryButton} onClick={() => void audit.reload()} disabled={access !== "ready" || audit.loading}>Refresh</button>
        </div>
      </div>

      {access === "ready" ? (
        <AuditFilters
          draft={draft}
          error={filterError}
          disabled={audit.loading}
          onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
          onSubmit={submit}
          onClear={clearFilters}
        />
      ) : null}

      <div className={styles.feedMeta}>
        <span>Canonical cursor feed · newest first</span>
        <span>Source: <code>/admin/v1/audit-events</code>{audit.loadedAt ? ` · refreshed ${audit.loadedAt.toLocaleTimeString()}` : ""}</span>
      </div>

      {access === "loading" ? <StatePanel title="Validating session" message="Checking the authenticated operator session." /> : null}
      {authRequired ? <StatePanel title="Authentication required" message="Sign in with an authorized operator account, then retry Admin Audit." action={<button type="button" className={styles.primaryButton} onClick={onLogin}>Go to login</button>} /> : null}
      {forbidden ? <StatePanel title="Admin access denied" message="The server did not authorize this session for Admin Audit. No audit content is shown." /> : null}
      {access === "ready" && audit.loading && !data ? <StatePanel title="Loading Admin Audit" message="Requesting the newest canonical audit page." /> : null}
      {access === "ready" && audit.error && !authRequired && !forbidden ? (
        <StatePanel title={audit.error.status === 409 ? "Audit query conflict" : "Unable to load Admin Audit"} message={audit.error.message} action={<button type="button" className={styles.primaryButton} onClick={() => void audit.reload()}>Retry</button>} />
      ) : null}
      {access === "ready" && data && data.items.length === 0 ? <StatePanel title={emptyTitle} message={hasFilters(applied) ? "The current server query returned no matching records." : "The canonical audit dataset is empty."} /> : null}

      {access === "ready" && data && data.items.length > 0 ? (
        <>
          {audit.loading ? <p className={styles.refreshing} role="status">Refreshing canonical results…</p> : null}
          <div className={styles.auditLayout}>
            <div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption>Admin audit events ordered by the backend</caption>
                  <thead><tr><th>Audit ID</th><th>Occurred</th><th>Actor</th><th>Action</th><th>Target</th><th>Result</th></tr></thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id} data-selected={selectedId === item.id || undefined}>
                        <td><button type="button" className={styles.idButton} aria-pressed={selectedId === item.id} onClick={(event) => { selectedTrigger.current = event.currentTarget; setSelectedId(item.id); }}>AUD-{item.id}</button></td>
                        <td><time dateTime={item.occurredAt}>{formatOccurredAt(item.occurredAt)}</time></td>
                        <td className={styles.mono}>{item.actorUserId}</td>
                        <td className={styles.codeCell}>{item.action}</td>
                        <td><span>{item.targetType}</span><code>{item.targetId}</code></td>
                        <td><span className={styles.resultBadge} data-result={item.result}>{item.result}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination} aria-label="Audit pagination">
                <span>Page {cursorHistory.length + 1} · {data.items.length} records</span>
                <div><button type="button" className={styles.secondaryButton} onClick={showNewer} disabled={cursorHistory.length === 0 || audit.loading}>Newer</button><button type="button" className={styles.secondaryButton} onClick={showOlder} disabled={!data.nextCursor || audit.loading}>Older</button></div>
              </div>
            </div>
            {selected ? <AuditDetail event={selected} headingRef={detailHeading} onClose={closeDetail} /> : <aside className={styles.detailPlaceholder}><span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span><h2>Audit detail</h2><p>Select an Audit ID to inspect canonical safe fields.</p></aside>}
          </div>
        </>
      ) : null}
    </div>
  );
}
