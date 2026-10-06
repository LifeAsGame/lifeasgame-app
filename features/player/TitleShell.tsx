"use client";

import { AnimatePresence } from "framer-motion";
import { navigateConsumer } from "@/shared/hooks/useConsumerLocation";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { acquiredAtFromActivation, evidenceLabel, readableDate, TITLE_CONDITIONS } from "./activation";
import { DetailLine, Feedback } from "./PlayerDetail";
import { useTitleQueries } from "./useTitleQueries";

export default function TitleShell({ onBack }: { onBack?: () => void }) {
  const titles = useTitleQueries();
  const compact = useMediaQuery("(max-width: 1199px)");
  const owned = titles.titles.items;
  const browsing = titles.view === "catalog";
  const catalog = titles.activated.items;
  const activation = titles.selectedActivation ? catalog.find(({ code }) => code === titles.selectedActivation?.code) ?? titles.selectedActivation : null;
  const representative = titles.representativeTitleId;
  const representativeAvailable = representative === null || owned.some(({ titleId }) => titleId === representative);
  const selectedOwned = owned.find(({ titleId }) => titleId === titles.selectedId);
  const selected = activation ?? selectedOwned;
  const condition = selected ? TITLE_CONDITIONS[selected.code] : null;
  const acquired = activation ? titles.activated.error ? null : activation.status === "ACQUIRED" : titles.titles.error ? null : Boolean(selectedOwned);
  const description = activation ? condition?.description : selectedOwned?.descMd;
  const close = () => {
    const row = document.querySelector<HTMLButtonElement>('[data-stage-key="player-title-list"] button[aria-pressed="true"]');
    titles.clearSelection(); requestStageFocus("player-title-list", "back");
    requestAnimationFrame(() => row?.focus({ preventScroll: true }));
  };

  return <div className="lag-panel-rail lag-player-shell relative" data-testid="title-shell">
    <PanelStage stageKey="player-title-list" parentStageKey="player-stage-0" panelRole="list" inactive={compact && titles.selectedId !== null}>
      <PanelFrame title={browsing ? "전체 활성 칭호" : "보유 칭호"} depth={1} centerSelected centerTargetKey={titles.selectedId} backButton={onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
        <div className="lag-player-content">
          <div className="lag-player-actions"><button type="button" className="lag-player-button" aria-pressed={!browsing} onClick={() => { titles.clearSelection(); titles.setView("owned"); }}>보유 칭호</button><button type="button" className="lag-player-button" aria-pressed={browsing} onClick={() => { titles.clearSelection(); titles.setView("catalog"); }}>전체 활성 칭호 보기</button></div>
          {titles.player.loading && !titles.player.data ? <InfoCard>플레이어를 불러오는 중…</InfoCard> : null}
          {titles.player.error ? <Feedback message={titles.player.error} retry={() => void titles.player.reload()} /> : null}
          {titles.titles.error ? <Feedback message={titles.titles.error} retry={() => void titles.titles.reload()} /> : null}
          {browsing && titles.activated.error ? <Feedback message={titles.activated.error} retry={() => void titles.activated.reload()} /> : null}
          {(browsing ? titles.activated.loading : titles.titles.loading) && (browsing ? catalog : owned).length === 0 ? <InfoCard>칭호를 불러오는 중…</InfoCard> : null}
          {!browsing && !titles.titles.loading && !titles.titles.error && owned.length === 0 ? <InfoCard>보유한 칭호가 없습니다. 첫 기록을 남기면 ‘기록의 시작’을 얻을 수 있어요.</InfoCard> : null}
          {browsing && !titles.activated.loading && !titles.activated.error && catalog.length === 0 ? <InfoCard>활성 칭호 정보가 없습니다.</InfoCard> : null}
          {!representativeAvailable && !titles.titles.error ? <Feedback message="대표 칭호가 보유 목록에 없습니다. 상태를 다시 확인해 주세요." retry={() => { void titles.player.reload(); void titles.titles.reload(); }} /> : null}
          {titles.mutationError && !selected ? <Feedback message={titles.mutationError} /> : null}
          <div className="grid gap-3">{browsing ? catalog.map((title, index) => <PanelCard key={title.code} label={title.name} slotLabel={title.name.slice(0, 1)} subtitle={title.status === "ACQUIRED" ? representative === title.definitionId ? "대표 칭호" : "보유" : "미보유"} selected={titles.selectedId === title.definitionId} centerTarget={titles.selectedId === title.definitionId} index={index} onClick={() => { titles.selectActivation(title); requestStageFocus("player-title-detail", "forward"); }} />) : owned.map((title, index) => <PanelCard key={title.titleId} label={title.name} slotLabel={title.name.slice(0, 1)} subtitle={`${readableDate(acquiredAtFromActivation(title.code, title.acquiredAt, catalog))}${representative === title.titleId ? " · 대표 칭호" : ""}`} selected={titles.selectedId === title.titleId} centerTarget={titles.selectedId === title.titleId} index={index} onClick={() => { titles.select(title.titleId); requestStageFocus("player-title-detail", "forward"); }} />)}</div>
        </div>
      </PanelFrame>
    </PanelStage>
    <AnimatePresence initial={false} mode="popLayout">{titles.selectedId !== null ? <PanelStage key="player-title-detail" stageKey="player-title-detail" parentStageKey="player-title-list" panelRole="detail" index={1}>
      <PanelFrame title="칭호 상세" depth={0} contentKey={titles.selectedId} backButton={<BackButton label="칭호 목록으로" onClick={close} />}>
        {selected ? <div className="lag-player-content"><h4>{selected.name}</h4><DetailLine label="상태">{acquired === null ? "확인 불가" : acquired ? representative === (activation?.definitionId ?? selectedOwned?.titleId) ? "대표 칭호" : "보유" : "미보유"}</DetailLine><DetailLine label="설명">{description || "설명이 제공되지 않았습니다."}</DetailLine><DetailLine label="획득 조건">{condition?.condition ?? activation?.condition ?? "조건 정보가 제공되지 않았습니다."}</DetailLine>{activation ? <DetailLine label="획득 근거">{evidenceLabel(activation.evidenceStatus)}</DetailLine> : null}{acquired ? <DetailLine label="획득 시각">{readableDate(acquiredAtFromActivation(selected.code, activation?.acquiredAt ?? selectedOwned?.acquiredAt, catalog))}</DetailLine> : null}{titles.mutationError ? <Feedback message={titles.mutationError} retry={() => { void titles.player.reload(); void titles.titles.reload(); }} /> : null}{acquired && selectedOwned && titles.player.data && !titles.player.error && !titles.titles.error ? <div className="lag-player-actions">{representative === selectedOwned.titleId ? <button type="button" className="lag-player-button" disabled={titles.pendingMutation} onClick={() => void titles.clearRepresentative()}>{titles.pendingMutation ? "저장 중…" : "대표 칭호 해제"}</button> : <button type="button" className="lag-player-button" disabled={titles.pendingMutation} onClick={() => void titles.setRepresentative(selectedOwned.titleId)}>{titles.pendingMutation ? "저장 중…" : "대표 칭호로 설정"}</button>}</div> : null}{acquired === false && condition ? <button type="button" className="lag-player-button" onClick={() => navigateConsumer(...condition.destination)}>{condition.action}</button> : null}</div> : <InfoCard>칭호 정보를 다시 조회해 주세요.</InfoCard>}
      </PanelFrame>
    </PanelStage> : null}</AnimatePresence>
  </div>;
}
