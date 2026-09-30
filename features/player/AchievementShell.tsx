"use client";

import { AnimatePresence } from "framer-motion";

import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { categoryLabel, DetailLine } from "./PlayerDetail";
import { useAchievementQueries } from "./useAchievementQueries";

const buttonStyle = {
  border: "1px solid var(--lag-control-border)",
  background: "var(--lag-control-bg)",
  color: "var(--lag-control-text)",
  borderRadius: "var(--lag-radius-sm)",
  padding: "8px 12px",
  minHeight: 44,
  fontSize: "0.875rem",
} as const;

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{message}</p>
      <button type="button" style={buttonStyle} onClick={retry}>다시 시도</button>
    </div>
  );
}

export default function AchievementShell({ onBack }: { onBack?: () => void }) {
  const achievements = useAchievementQueries();
  const detail = achievements.detail.data;

  return (
    <div className="lag-panel-rail lag-player-shell relative" data-testid="achievement-shell">
      <PanelStage stageKey="player-achievement-list">
        <PanelFrame title="획득한 업적" depth={1} backButton={onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
        <div className="lag-player-content">
          {achievements.list.loading && achievements.list.items.length === 0 ? <InfoCard>업적을 불러오는 중…</InfoCard> : null}
          {achievements.list.error ? <ErrorState message={achievements.list.error} retry={() => void achievements.list.reload()} /> : null}
          {!achievements.list.loading && !achievements.list.error && achievements.list.items.length === 0 ? <InfoCard>획득한 업적이 없습니다.</InfoCard> : null}
          <div className="grid gap-3">
            {achievements.list.items.map((item, index) => (
              <PanelCard
                key={item.achievementId}
                label={item.name}
                slotLabel={item.code.slice(0, 2)}
                subtitle={`${categoryLabel(item.category)} · ${item.acquiredAt ?? "획득 시각 미제공"}`}
                selected={achievements.selectedId === item.achievementId}
                index={index}
                onClick={() => achievements.select(item.achievementId)}
              />
            ))}
          </div>
        </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false} mode="popLayout">
        {achievements.selectedId ? (
          <PanelStage key="player-achievement-detail" stageKey="player-achievement-detail" index={1}>
            <PanelFrame title="업적 상세" depth={0} contentKey={achievements.selectedId} backButton={<BackButton label="획득한 업적 목록으로" onClick={() => {
              achievements.clearSelection();
              requestStageFocus("player-achievement-list", "back");
            }} />}>
              {achievements.detail.loading && !detail ? <InfoCard>업적 상세를 불러오는 중…</InfoCard> : null}
              {achievements.detail.error ? <ErrorState message={achievements.detail.error} retry={() => void achievements.detail.retry()} /> : null}
              {detail ? (
                <div className="lag-player-content">
                  <h4>{detail.name}</h4>
                  <DetailLine label="상태">획득</DetailLine>
                  <DetailLine label="분류">{categoryLabel(detail.category)}</DetailLine>
                  <DetailLine label="획득 시각">{detail.acquiredAt ?? "제공되지 않음"}</DetailLine>
                  <DetailLine label="코드">{detail.code}</DetailLine>
                  <DetailLine label="설명">{detail.descMd}</DetailLine>
                </div>
              ) : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
