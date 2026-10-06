"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { consumerLabel } from "@/shared/lib/consumerLabels";
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
      <button type="button" className="lag-growth-button" onClick={retry}>다시 조회</button>
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
  const shell = useRef<HTMLDivElement>(null);
  const focusBack = (key: string) => requestAnimationFrame(() => shell.current?.querySelector<HTMLButtonElement>(`[data-stage-key="${key}"]:not([aria-hidden="true"]) button[data-panel-back]`)?.focus({ preventScroll: true }));
  const compact = useMediaQuery("(max-width: 1199px)");
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyButton = useRef<HTMLButtonElement>(null);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  const [selectedChangeId, setSelectedChangeId] = useState<number | null>(null);
  const current = growth.data?.current;
  const changes = growth.data?.recentExpChanges ?? [];
  const selectedChange = changes.find(({ changeId }) => changeId === selectedChangeId) ?? null;

  useEffect(() => { focusBack("player-growth-profile"); }, []);
  const openHistory = () => { setHistoryOpen(true); requestStageFocus("player-growth-history", "forward"); focusBack("player-growth-history"); };
  const closeHistory = () => {
    setSelectedChangeId(null); setHistoryOpen(false);
    requestStageFocus("player-growth-profile", "back");
    requestAnimationFrame(() => historyButton.current?.focus({ preventScroll: true }));
  };
  const closeDetail = () => {
    setSelectedChangeId(null);
    requestAnimationFrame(() => selectedButton.current?.focus({ preventScroll: true }));
    requestStageFocus("player-growth-history", "back");
  };

  return (
    <div ref={shell} className="lag-panel-rail lag-growth-shell relative" data-testid="growth-shell">
      <PanelStage stageKey="player-growth-profile" inactive={compact && historyOpen}>
        <PanelFrame title="성장" depth={2} backButton={onBack ? <BackButton label="플레이어로" onClick={onBack} /> : undefined}>
          <section className="lag-growth-profile" aria-label="성장">
            {growth.loading && !growth.data ? <div role="status" className="lag-growth-state">성장을 불러오는 중…</div> : null}
            {growth.error ? <ErrorState text={growth.error} retry={() => void growth.retry()} /> : null}
            {current ? (
              <>
                <header className="lag-growth-identity">
                  <span>현재 성장</span>
                  <div className="lag-growth-level-mark">
                    <span className="lag-growth-rings" aria-hidden><i /></span>
                    <div><small>레벨</small><strong>{current.level}</strong></div>
                  </div>
                  {current.maxLevelReached === true ? <p><strong>최고 레벨</strong></p>
                    : current.expIntoLevel !== undefined && current.capForLevel !== undefined && current.expToNext !== undefined && current.progressRatio !== undefined && current.maxLevelReached === false ? <>
                      <p><span>레벨 경험치</span><strong>{current.expIntoLevel} / {current.capForLevel}</strong></p>
                      <progress aria-label="레벨 경험치 진행" value={current.progressRatio} max={1} />
                      <p><span>다음 레벨까지</span><strong>{current.expToNext}</strong></p>
                    </> : <p role="status">레벨 진행값 미제공</p>}
                  <p><span>누적 경험치</span><strong>{current.exp}</strong></p>
                </header>

                <section className="lag-growth-section" aria-labelledby="growth-core-stats">
                  <h4 id="growth-core-stats">기본 능력치</h4>
                  <dl className="lag-growth-stat-grid">
                    {CORE_STATS.map(([label, key]) => (
                      <div key={key} className="lag-growth-stat"><dt>{label}</dt><dd>{current[key]}</dd></div>
                    ))}
                  </dl>
                </section>

                <section className="lag-growth-section" aria-labelledby="growth-extra-stats">
                  <h4 id="growth-extra-stats">추가 능력치</h4>
                  {Object.keys(current.extraStats).length === 0
                    ? <p className="lag-growth-empty">추가 능력치가 없습니다.</p>
                    : <dl className="lag-growth-extra-list">{Object.entries(current.extraStats).map(([name, value]) => <DetailRow key={name} label={name}>{value}</DetailRow>)}</dl>}
                </section>

                <button type="button" ref={historyButton} className="lag-growth-action" onClick={openHistory}>경험치 이력 보기 <span aria-hidden>→</span></button>
              </>
            ) : null}
          </section>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
      {historyOpen ? <PanelStage stageKey="player-growth-history" inactive={compact && Boolean(selectedChange)}>
        <PanelFrame title="최근 경험치 이력" depth={1} backButton={<BackButton label="성장으로" onClick={closeHistory} />}>
          <section className="lag-growth-history" aria-label="최근 경험치 이력">
            <header><p>확정된 경험치 이력</p><span>{changes.length}건</span></header>
            {growth.loading && !growth.data ? <div role="status" className="lag-growth-state">경험치 이력을 불러오는 중…</div> : null}
            {growth.data && changes.length === 0 ? <p className="lag-growth-empty">최근 경험치 변동이 없습니다.</p> : null}
            <div className="lag-growth-change-list">
              {changes.map((change) => (
                <button
                  key={change.changeId}
                  type="button"
                  className="lag-growth-change"
                  aria-pressed={selectedChangeId === change.changeId}
                  data-selected={selectedChangeId === change.changeId}
                  onClick={(event) => { selectedButton.current = event.currentTarget; setSelectedChangeId(change.changeId); focusBack("player-growth-change-detail"); }}
                >
                  <span className="lag-growth-change-mark" aria-hidden>XP</span>
                  <span><strong>{signedExp(change.appliedExp)}</strong><small>레벨 {change.beforeLevel} → {change.afterLevel}</small><time dateTime={change.occurredAt}>{change.occurredAt}</time></span>
                  <span><small>{change.sourceType ? consumerLabel(change.sourceType) : "출처 정보 없음"}</small><b aria-hidden>→</b></span>
                </button>
              ))}
            </div>
          </section>
        </PanelFrame>
      </PanelStage> : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {selectedChange ? (
          <PanelStage stageKey="player-growth-change-detail">
            <PanelFrame title="경험치 변동 상세" depth={0} contentKey={selectedChange.changeId} backButton={<BackButton label="경험치 이력으로" onClick={closeDetail} />}>
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
        <span>변동 #{change.changeId}</span>
        <h4>{signedExp(change.appliedExp)}</h4>
        <p>레벨 {change.beforeLevel} → {change.afterLevel}</p>
      </header>
      <section className="lag-growth-section">
        <h4>경험치 반영</h4>
        <dl>
          <DetailRow label="변동 번호">{change.changeId}</DetailRow>
          <DetailRow label="요청 경험치">{change.requestedExp}</DetailRow>
          <DetailRow label="반영 경험치">{change.appliedExp}</DetailRow>
          <DetailRow label="미반영 경험치">{change.leftoverExp}</DetailRow>
        </dl>
      </section>
      <section className="lag-growth-section">
        <h4>성장 변화</h4>
        <dl>
          <DetailRow label="이전 레벨">{change.beforeLevel}</DetailRow>
          <DetailRow label="이후 레벨">{change.afterLevel}</DetailRow>
          <DetailRow label="이전 누적 경험치">{change.beforeTotalExp}</DetailRow>
          <DetailRow label="이후 누적 경험치">{change.afterTotalExp}</DetailRow>
        </dl>
      </section>
      <section className="lag-growth-section">
        <h4>기록 정보</h4>
        <dl>
          <DetailRow label="발생 시각"><time dateTime={change.occurredAt}>{change.occurredAt}</time></DetailRow>
          <DetailRow label="출처 유형">{change.sourceType ? consumerLabel(change.sourceType) : "출처 정보 없음"}</DetailRow>
          <DetailRow label="출처 번호">{change.sourceType === null ? "출처 유형이 없어 확인할 수 없습니다" : change.sourceId ?? "기록 없음"}</DetailRow>
        </dl>
      </section>
    </article>
  );
}
