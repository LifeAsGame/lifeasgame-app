"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";

import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import type { PlayerGrowthOverview } from "@/shared/api/types";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { useGrowthQuery } from "./useGrowthQuery";

const CORE_STATS = [
  ["STR", "str"], ["AGI", "agi"], ["DEX", "dex"],
  ["INT", "intel"], ["VIT", "vit"], ["LUC", "luc"],
] as const;

type ExpChange = PlayerGrowthOverview["recentExpChanges"][number];

function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="lag-growth-state">
      <p role="alert" className="lag-growth-feedback" data-state="error">{text}</p>
      <button type="button" className="lag-growth-button" onClick={retry}>Retry</button>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="lag-growth-data-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

function signedExp(value: number) {
  return `${value > 0 ? "+" : ""}${value} EXP`;
}

export default function GrowthShell({ onBack }: { onBack?: () => void }) {
  const growth = useGrowthQuery();
  const [selectedChangeId, setSelectedChangeId] = useState<number | null>(null);
  const current = growth.data?.current;
  const changes = growth.data?.recentExpChanges ?? [];
  const selectedChange = changes.find(({ changeId }) => changeId === selectedChangeId) ?? null;

  const openHistory = () => requestStageFocus("player-growth-history", "center");
  const closeDetail = () => {
    setSelectedChangeId(null);
    requestStageFocus("player-growth-history", "back");
  };

  return (
    <div className="lag-panel-rail lag-growth-shell relative" data-testid="growth-shell">
      <PanelStage stageKey="player-growth-profile">
        <PanelFrame title="Growth Profile" depth={2} backButton={onBack ? <BackButton label="Back to Player" onClick={onBack} /> : undefined}>
          <section className="lag-growth-profile" aria-label="Growth Profile">
            {growth.loading && !growth.data ? <div role="status" className="lag-growth-state">Loading Growth...</div> : null}
            {growth.error ? <ErrorState text={growth.error} retry={() => void growth.retry()} /> : null}
            {current ? (
              <>
                <header className="lag-growth-identity">
                  <span>Current Growth</span>
                  <div className="lag-growth-level-mark">
                    <span className="lag-growth-rings" aria-hidden><i /></span>
                    <div><small>Level</small><strong>{current.level}</strong></div>
                  </div>
                  <p><span>Current EXP</span><strong>{current.exp}</strong></p>
                </header>

                <section className="lag-growth-section" aria-labelledby="growth-core-stats">
                  <h4 id="growth-core-stats">Core Stats</h4>
                  <dl className="lag-growth-stat-grid">
                    {CORE_STATS.map(([label, key]) => (
                      <div key={key} className="lag-growth-stat"><dt>{label}</dt><dd>{current[key]}</dd></div>
                    ))}
                  </dl>
                </section>

                <section className="lag-growth-section" aria-labelledby="growth-extra-stats">
                  <h4 id="growth-extra-stats">Extra Stats</h4>
                  {Object.keys(current.extraStats).length === 0
                    ? <p className="lag-growth-empty">No extra stats.</p>
                    : <dl className="lag-growth-extra-list">{Object.entries(current.extraStats).map(([name, value]) => <DetailRow key={name} label={name}>{value}</DetailRow>)}</dl>}
                </section>

                {current.representativeTitleId === null ? null : <p className="lag-growth-meta">Representative title ID · {current.representativeTitleId}</p>}
                <button type="button" className="lag-growth-action" onClick={openHistory}>View EXP History <span aria-hidden>→</span></button>
              </>
            ) : null}
          </section>
        </PanelFrame>
      </PanelStage>

      <PanelStage stageKey="player-growth-history" autoFocus={false}>
        <PanelFrame title="Recent EXP Changes" depth={1} backButton={<BackButton label="Back to Growth Profile" onClick={() => requestStageFocus("player-growth-profile", "back")} />}>
          <section className="lag-growth-history" aria-label="Recent EXP Changes">
            <header><p>Canonical EXP history</p><span>{changes.length} changes</span></header>
            {growth.loading && !growth.data ? <div role="status" className="lag-growth-state">Loading EXP history...</div> : null}
            {growth.data && changes.length === 0 ? <p className="lag-growth-empty">No recent EXP changes.</p> : null}
            <div className="lag-growth-change-list">
              {changes.map((change) => (
                <button
                  key={change.changeId}
                  type="button"
                  className="lag-growth-change"
                  aria-pressed={selectedChangeId === change.changeId}
                  data-selected={selectedChangeId === change.changeId}
                  onClick={() => setSelectedChangeId(change.changeId)}
                >
                  <span className="lag-growth-change-mark" aria-hidden>XP</span>
                  <span><strong>{signedExp(change.appliedExp)}</strong><small>Level {change.beforeLevel} → {change.afterLevel}</small><time dateTime={change.occurredAt}>{change.occurredAt}</time></span>
                  <span><small>{change.sourceType ?? "Source unavailable"}</small><b aria-hidden>→</b></span>
                </button>
              ))}
            </div>
          </section>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {selectedChange ? (
          <PanelStage stageKey="player-growth-change-detail">
            <PanelFrame title="EXP Change Detail" depth={0} contentKey={selectedChange.changeId} backButton={<BackButton label="Back to EXP History" onClick={closeDetail} />}>
              <ExpChangeDetail change={selectedChange} />
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ExpChangeDetail({ change }: { change: ExpChange }) {
  return (
    <article className="lag-growth-detail">
      <header>
        <span>Change #{change.changeId}</span>
        <h4>{signedExp(change.appliedExp)}</h4>
        <p>Level {change.beforeLevel} → {change.afterLevel}</p>
      </header>
      <section className="lag-growth-section">
        <h4>EXP Application</h4>
        <dl>
          <DetailRow label="Change ID">{change.changeId}</DetailRow>
          <DetailRow label="Requested EXP">{change.requestedExp}</DetailRow>
          <DetailRow label="Applied EXP">{change.appliedExp}</DetailRow>
          <DetailRow label="Leftover EXP">{change.leftoverExp}</DetailRow>
        </dl>
      </section>
      <section className="lag-growth-section">
        <h4>Growth Transition</h4>
        <dl>
          <DetailRow label="Before level">{change.beforeLevel}</DetailRow>
          <DetailRow label="After level">{change.afterLevel}</DetailRow>
          <DetailRow label="Before total EXP">{change.beforeTotalExp}</DetailRow>
          <DetailRow label="After total EXP">{change.afterTotalExp}</DetailRow>
        </dl>
      </section>
      <section className="lag-growth-section">
        <h4>Record Context</h4>
        <dl>
          <DetailRow label="Occurred at"><time dateTime={change.occurredAt}>{change.occurredAt}</time></DetailRow>
          <DetailRow label="Source type">{change.sourceType ?? "Source unavailable"}</DetailRow>
          <DetailRow label="Source ID">{change.sourceType === null ? "Not available without source type" : change.sourceId ?? "Not recorded"}</DetailRow>
        </dl>
      </section>
    </article>
  );
}
