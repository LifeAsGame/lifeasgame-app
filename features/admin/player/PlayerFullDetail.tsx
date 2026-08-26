"use client";

import { useState } from "react";

import type { AdminAuditDataSource } from "../api/audit.source";
import type { AdminInventoryOperationsCommandSource } from "../api/inventory.command";
import type { AdminInventoryOperationsDataSource } from "../api/inventory.source";
import type { AdminAccess } from "../model";
import styles from "../admin.module.css";
import type { AdminPlayerInfo } from "./model";
import { PlayerInventoryMailbox } from "./PlayerInventoryMailbox";

function Overview({ player }: { player: AdminPlayerInfo }) {
  const fields = [
    ["Level", player.level], ["Job", player.job], ["Gender", player.gender], ["Total EXP", player.totalExp],
    ["Health", `${player.currentHealth} / ${player.healthCapacity}`], ["Mana", `${player.currentMana} / ${player.manaCapacity}`],
    ["Representative title ID", player.representativeTitleId ?? "Not set"],
  ] as const;
  return (
    <section className={styles.playerFullPanel} aria-labelledby="player-overview-title">
      <div className={styles.playerFullPanelHeader}><div><p className={styles.eyebrow}>Safe overview</p><h2 id="player-overview-title">Player state</h2></div><span className={styles.badge} data-state="READ_ONLY">▣ READ_ONLY</span></div>
      <dl className={`${styles.detailList} ${styles.playerOverviewFields}`}>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <section className={styles.playerStats} aria-label="Core stats"><h3>Core stats</h3><dl>{[["STR", player.str], ["AGI", player.agi], ["DEX", player.dex], ["INT", player.intel], ["VIT", player.vit], ["LUC", player.luc]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <div className={styles.privacyNote}><span className={styles.badge} data-state="PRIVACY_GATED">◆ PRIVACY_GATED</span><p>Private LifeLog, Person, Connections, and Direct Chat content remains outside this Player detail.</p></div>
    </section>
  );
}

export function PlayerFullDetail({
  player,
  userId,
  access,
  readSource,
  commandSource,
  auditSource,
  onBack,
  onOpenAudit,
}: {
  player: AdminPlayerInfo;
  userId?: number;
  access: AdminAccess;
  readSource: AdminInventoryOperationsDataSource;
  commandSource: AdminInventoryOperationsCommandSource;
  auditSource: AdminAuditDataSource;
  onBack: () => void;
  onOpenAudit?: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "inventory">("overview");
  return (
    <div className={styles.auditScreen}>
      <div className={styles.playerFullHeader}>
        <button type="button" className={styles.secondaryButton} onClick={onBack}>← Back to Player Lookup</button>
        <div className={styles.playerFullIdentity}>
          <div><p className={styles.eyebrow}>Players / Full Player detail</p><h1>{player.name}</h1></div>
          <dl>
            <div><dt>Player ID</dt><dd><code>{player.playerId}</code></dd></div>
            {userId !== undefined ? <div><dt>User ID</dt><dd><code>{userId}</code></dd></div> : null}
          </dl>
        </div>
      </div>
      <nav className={styles.playerLocalTabs} aria-label="Player detail sections">
        <button type="button" data-active={tab === "overview" || undefined} aria-current={tab === "overview" ? "page" : undefined} onClick={() => setTab("overview")}>Overview</button>
        <button type="button" data-active={tab === "inventory" || undefined} aria-current={tab === "inventory" ? "page" : undefined} onClick={() => setTab("inventory")}>Inventory / Mailbox</button>
      </nav>
      {tab === "overview" ? <Overview player={player} /> : <PlayerInventoryMailbox player={player} access={access} readSource={readSource} commandSource={commandSource} auditSource={auditSource} onOpenAudit={onOpenAudit} />}
    </div>
  );
}
