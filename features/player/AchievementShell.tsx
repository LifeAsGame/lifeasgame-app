"use client";

import { AnimatePresence } from "framer-motion";

import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useAchievementQueries } from "./useAchievementQueries";

const buttonStyle = {
  border: "1px solid var(--lag-control-border)",
  background: "var(--lag-control-bg)",
  color: "var(--lag-control-text)",
  borderRadius: "var(--lag-radius-sm)",
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{message}</p>
      <button type="button" style={buttonStyle} onClick={retry}>Retry</button>
    </div>
  );
}

export default function AchievementShell() {
  const achievements = useAchievementQueries();
  const detail = achievements.detail.data;

  return (
    <div className="lag-panel-rail relative" data-testid="achievement-shell">
      <PanelStage stageKey="player-achievement-list">
        <PanelFrame title="Acquired Achievements" depth={1}>
        <div className="space-y-3">
          {achievements.list.loading && achievements.list.items.length === 0 ? <InfoCard>Loading Achievements...</InfoCard> : null}
          {achievements.list.error ? <ErrorState message={achievements.list.error} retry={() => void achievements.list.reload()} /> : null}
          {!achievements.list.loading && !achievements.list.error && achievements.list.items.length === 0 ? <InfoCard>No acquired Achievements.</InfoCard> : null}
          <div className="space-y-2">
            {achievements.list.items.map((item, index) => (
              <PanelCard
                key={item.achievementId}
                label={item.name}
                slotLabel={item.code.slice(0, 2)}
                subtitle={`${item.category} · ${item.acquiredAt}`}
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
          <PanelStage key="player-achievement-detail" stageKey="player-achievement-detail" focusKey={achievements.selectedId} index={1}>
            <PanelFrame title="Achievement Detail" depth={0} contentKey={achievements.selectedId}>
              {achievements.detail.loading && !detail ? <InfoCard>Loading Achievement...</InfoCard> : null}
              {achievements.detail.error ? <ErrorState message={achievements.detail.error} retry={() => void achievements.detail.retry()} /> : null}
              {detail ? (
                <div className="space-y-3 px-3">
                  <InfoCard>{detail.name}</InfoCard>
                  <GoldRow>Code: {detail.code}</GoldRow>
                  <GoldRow>Category: {detail.category}</GoldRow>
                  <GoldRow>Acquired: {detail.acquiredAt}</GoldRow>
                  <InfoCard label="Description"><span style={{ whiteSpace: "pre-wrap" }}>{detail.descMd}</span></InfoCard>
                </div>
              ) : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
