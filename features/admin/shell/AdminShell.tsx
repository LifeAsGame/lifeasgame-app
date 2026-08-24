"use client";

import { useState } from "react";

import type { AdminDataSourceDescriptor } from "../api/audit.source";
import { ADMIN_AREAS } from "../model";
import type { AdminAreaId, AdminCapabilityState } from "../model";
import styles from "../admin.module.css";

function CapabilityBadge({ state, compact = false }: { state: AdminCapabilityState; compact?: boolean }) {
  const marker = state === "SUPPORTED" ? "✓" : state === "GATED" ? "◇" : state === "DEFERRED" ? "…" : state === "LEGACY" ? "L" : state === "PRIVACY_GATED" ? "◆" : "▣";
  return <span className={styles.badge} data-state={state} data-compact={compact || undefined}>{marker} {state}</span>;
}

export function AdminShell({ operator, audit, source }: { operator: string; audit: React.ReactNode; source: AdminDataSourceDescriptor }) {
  const [activeArea, setActiveArea] = useState<AdminAreaId>("system");
  const active = ADMIN_AREAS.find((area) => area.id === activeArea)!;

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>LifeAsGame <span>ADMIN</span></div>
        <span className={styles.environment} data-source-mode={source.mode}>{source.badge}</span>
        <div className={styles.source}>Source: <code>{source.label}</code></div>
        <div className={styles.operator}>{operator}</div>
      </header>

      <aside className={styles.sidebar}>
        <p className={styles.navHeading}>Operations</p>
        <nav aria-label="Admin operations" className={styles.navList}>
          {ADMIN_AREAS.map((area) => (
            <div key={area.id} className={styles.navGroup}>
              <button
                type="button"
                className={styles.navItem}
                data-active={activeArea === area.id || undefined}
                aria-current={activeArea === area.id ? "page" : undefined}
                aria-label={`${area.label}, ${area.state}`}
                onClick={() => setActiveArea(area.id)}
              >
                <span className={styles.navMarker} aria-hidden="true">{area.shortLabel}</span>
                <span className={styles.navLabel}>{area.label}</span>
                {area.id !== "system" ? <span className={styles.navBadge}><CapabilityBadge state={area.state} compact /></span> : null}
              </button>
              {area.id === "system" && activeArea === "system" ? (
                <div className={styles.subnav} aria-label="System capabilities">
                  <span>Admin Audit</span>
                  <CapabilityBadge state="SUPPORTED" compact />
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <div className={styles.sessionNote}>
          <span>{source.mode === "mock" ? "Mock session" : "Session"}</span>
          <strong>{source.mode === "mock" ? "Server Admin authority not evaluated" : "Authority enforced by server"}</strong>
        </div>
      </aside>

      <main className={styles.workspace}>
        {activeArea === "system" ? audit : (
          <section className={styles.capabilityPanel} aria-labelledby="admin-capability-title">
            <div className={styles.capabilityHeader}>
              <div>
                <p className={styles.eyebrow}>Phase A1 capability boundary</p>
                <h1 id="admin-capability-title">{active.label}</h1>
              </div>
              <CapabilityBadge state={active.state} />
            </div>
            <p>{active.reason}</p>
            <p className={styles.safeNote}>No data or command API is connected for this area in Phase A1.</p>
          </section>
        )}
      </main>
    </div>
  );
}
