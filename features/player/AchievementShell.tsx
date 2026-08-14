"use client";

import { SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useAchievementQueries } from "./useAchievementQueries";

const buttonStyle = {
  border: `1px solid ${SAO.color.border.panel}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.panel,
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{message}</p>
      <button type="button" style={buttonStyle} onClick={retry}>Retry</button>
    </div>
  );
}

export default function AchievementShell() {
  const achievements = useAchievementQueries();
  const detail = achievements.detail.data;

  return (
    <div className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center gap-3" data-testid="achievement-shell">
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

      <PanelFrame title="Achievement Detail" depth={0}>
        {!achievements.selectedId ? <InfoCard>Select an acquired Achievement.</InfoCard> : null}
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
    </div>
  );
}
