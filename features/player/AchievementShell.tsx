"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { navigateConsumer } from "@/shared/hooks/useConsumerLocation";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { ACHIEVEMENT_CONDITIONS, evidenceLabel, readableDate } from "./activation";
import { DetailLine, Feedback } from "./PlayerDetail";
import { useAchievementQueries } from "./useAchievementQueries";

export default function AchievementShell({ onBack, initialAchievementId }: { onBack?: () => void; initialAchievementId?: number | null }) {
  const achievements = useAchievementQueries();
  const compact = useMediaQuery("(max-width: 1199px)");
  const initialSelection = useRef(false);
  useEffect(() => {
    if (initialAchievementId && !initialSelection.current) {
      initialSelection.current = true;
      achievements.select(initialAchievementId);
    }
  }, [initialAchievementId, achievements]);

  const owned = achievements.list.items;
  const browsing = achievements.view === "catalog";
  const catalog = achievements.activated.items;
  const activation = achievements.selectedActivation ? catalog.find(({ code }) => code === achievements.selectedActivation?.code) ?? achievements.selectedActivation : null;
  const selectedOwned = owned.find(({ achievementId }) => achievementId === achievements.selectedId);
  const detail = activation ?? achievements.detail.data ?? selectedOwned;
  const condition = detail ? ACHIEVEMENT_CONDITIONS[detail.code] : null;
  const acquired = activation ? achievements.activated.error ? null : activation.status === "ACQUIRED" : achievements.list.error ? null : Boolean(selectedOwned || achievements.detail.data);
  const description = activation ? condition?.description : achievements.detail.data?.descMd ?? selectedOwned?.descMd;
  const close = () => {
    const row = document.querySelector<HTMLButtonElement>('[data-stage-key="player-achievement-list"] button[aria-pressed="true"]');
    achievements.clearSelection(); requestStageFocus("player-achievement-list", "back");
    requestAnimationFrame(() => row?.focus({ preventScroll: true }));
  };

  return <div className="lag-panel-rail lag-player-shell relative" data-testid="achievement-shell">
    <PanelStage stageKey="player-achievement-list" parentStageKey="player-stage-0" panelRole="list" inactive={compact && achievements.selectedId !== null}>
      <PanelFrame title={browsing ? "전체 활성 업적" : "획득한 업적"} depth={1} centerSelected centerTargetKey={achievements.selectedId} backButton={onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
        <div className="lag-player-content">
          <div className="lag-player-actions"><button type="button" className="lag-player-button" aria-pressed={!browsing} onClick={() => { achievements.clearSelection(); achievements.setView("owned"); }}>획득한 업적</button><button type="button" className="lag-player-button" aria-pressed={browsing} onClick={() => { achievements.clearSelection(); achievements.setView("catalog"); }}>전체 활성 업적 보기</button></div>
          {achievements.list.error ? <Feedback message={achievements.list.error} retry={() => void achievements.list.reload()} /> : null}
          {browsing && achievements.activated.error ? <Feedback message={achievements.activated.error} retry={() => void achievements.activated.reload()} /> : null}
          {(browsing ? achievements.activated.loading : achievements.list.loading) && (browsing ? catalog : owned).length === 0 ? <InfoCard>업적을 불러오는 중…</InfoCard> : null}
          {!browsing && !achievements.list.loading && !achievements.list.error && owned.length === 0 ? <><InfoCard>첫 기록을 남기면 업적을 얻을 수 있어요. 퀘스트 수락은 필요하지 않습니다.</InfoCard><button type="button" className="lag-player-button" onClick={() => navigateConsumer("lifelog", "journal")}>기록 남기기</button></> : null}
          {browsing && !achievements.activated.loading && !achievements.activated.error && catalog.length === 0 ? <InfoCard>활성 업적 정보가 없습니다.</InfoCard> : null}
          <div className="grid gap-3">{browsing ? catalog.map((item, index) => <PanelCard key={item.code} label={item.name} slotLabel={item.name.slice(0, 1)} subtitle={item.status === "ACQUIRED" ? "획득" : "미획득"} selected={achievements.selectedId === item.definitionId} centerTarget={achievements.selectedId === item.definitionId} index={index} onClick={() => { achievements.selectActivation(item); requestStageFocus("player-achievement-detail", "forward"); }} />) : owned.map((item, index) => <PanelCard key={item.achievementId} label={item.name} slotLabel={item.name.slice(0, 1)} subtitle={readableDate(item.acquiredAt)} selected={achievements.selectedId === item.achievementId} centerTarget={achievements.selectedId === item.achievementId} index={index} onClick={() => { achievements.select(item.achievementId); requestStageFocus("player-achievement-detail", "forward"); }} />)}</div>
        </div>
      </PanelFrame>
    </PanelStage>
    <AnimatePresence initial={false} mode="popLayout">{achievements.selectedId !== null ? <PanelStage key="player-achievement-detail" stageKey="player-achievement-detail" parentStageKey="player-achievement-list" panelRole="detail" index={1}>
      <PanelFrame title="업적 상세" depth={0} contentKey={achievements.selectedId} backButton={<BackButton label="업적 목록으로" onClick={close} />}>
        {achievements.detail.loading && !detail ? <InfoCard>업적 상세를 불러오는 중…</InfoCard> : null}
        {achievements.detail.error ? <Feedback message={achievements.detail.error} retry={() => void achievements.detail.retry()} /> : null}
        {detail ? <div className="lag-player-content"><h4>{detail.name}</h4><DetailLine label="상태">{acquired === null ? "확인 불가" : acquired ? "획득" : "미획득"}</DetailLine><DetailLine label="설명">{description || "설명이 제공되지 않았습니다."}</DetailLine><DetailLine label="획득 조건">{condition?.condition ?? activation?.condition ?? "조건 정보가 제공되지 않았습니다."}</DetailLine>{activation ? <DetailLine label="획득 근거">{evidenceLabel(activation.evidenceStatus)}</DetailLine> : null}{acquired ? <DetailLine label="획득 시각">{readableDate(activation?.acquiredAt ?? achievements.detail.data?.acquiredAt ?? selectedOwned?.acquiredAt)}</DetailLine> : null}{acquired === false && condition ? <button type="button" className="lag-player-button" onClick={() => navigateConsumer(...condition.destination)}>{condition.action}</button> : null}</div> : null}
      </PanelFrame>
    </PanelStage> : null}</AnimatePresence>
  </div>;
}
