"use client";

import { AnimatePresence } from "framer-motion";

import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { categoryLabel, DetailLine, Feedback } from "./PlayerDetail";
import { useTitleQueries } from "./useTitleQueries";

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

export default function TitleShell({ onBack }: { onBack?: () => void }) {
  const titles = useTitleQueries();
  const selected = titles.selected;
  const representative = titles.representativeTitleId;
  const representativeAvailable = representative === null || titles.titles.items.some(({ titleId }) => titleId === representative);

  return (
    <div className="lag-panel-rail lag-player-shell relative" data-testid="title-shell">
      <PanelStage stageKey="player-title-list">
        <PanelFrame title="획득한 칭호" depth={1} backButton={onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
        <div className="lag-player-content">
          {titles.player.loading && !titles.player.data ? <InfoCard>플레이어를 불러오는 중…</InfoCard> : null}
          {titles.player.error ? <ErrorState message={titles.player.error} retry={() => void titles.player.reload()} /> : null}
          {titles.titles.loading && titles.titles.items.length === 0 ? <InfoCard>칭호를 불러오는 중…</InfoCard> : null}
          {titles.titles.error ? <ErrorState message={titles.titles.error} retry={() => void titles.titles.reload()} /> : null}
          {!titles.titles.loading && !titles.titles.error && titles.titles.items.length === 0 ? <InfoCard>획득한 칭호가 없습니다.</InfoCard> : null}
          {!representativeAvailable ? <InfoCard>대표 칭호 #{representative}을 획득 목록에서 찾을 수 없습니다.</InfoCard> : null}
          {titles.mutationError && !selected ? <Feedback message={titles.mutationError} /> : null}
          <div className="grid gap-3">
            {titles.titles.items.map((title, index) => (
              <PanelCard
                key={title.titleId}
                label={title.name}
                slotLabel={title.code.slice(0, 2)}
                subtitle={`${categoryLabel(title.category)} · ${title.acquiredAt ?? "획득 시각 미제공"}${representative === title.titleId ? " · 대표 칭호" : ""}`}
                selected={titles.selectedId === title.titleId}
                index={index}
                onClick={() => titles.select(title.titleId)}
              />
            ))}
          </div>
        </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <PanelStage key="player-title-detail" stageKey="player-title-detail" index={1}>
            <PanelFrame title="칭호 상세" depth={0} contentKey={selected.titleId} backButton={<BackButton label="획득한 칭호 목록으로" onClick={() => {
              titles.clearSelection();
              requestStageFocus("player-title-list", "back");
            }} />}>
              <div className="lag-player-content">
                <h4>{selected.name}</h4>
                <DetailLine label="상태">{representative === selected.titleId ? "대표 칭호" : "획득"}</DetailLine>
                <DetailLine label="분류">{categoryLabel(selected.category)}</DetailLine>
                <DetailLine label="획득 시각">{selected.acquiredAt ?? "제공되지 않음"}</DetailLine>
                <DetailLine label="코드">{selected.code}</DetailLine>
                <DetailLine label="설명">{selected.descMd}</DetailLine>
                {titles.mutationError ? <Feedback message={titles.mutationError} /> : null}
                <button
                  type="button"
                  disabled={titles.pendingMutation || representative === selected.titleId}
                  style={buttonStyle}
                  onClick={() => void titles.setRepresentative(selected.titleId)}
                >
                  {titles.pendingMutation ? "저장 중…" : representative === selected.titleId ? "대표 칭호" : "대표 칭호로 설정"}
                </button>
              </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
