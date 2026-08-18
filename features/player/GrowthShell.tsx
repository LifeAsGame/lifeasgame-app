"use client";

import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useGrowthQuery } from "./useGrowthQuery";

const CORE_STATS = [
  ["STR", "str"], ["AGI", "agi"], ["DEX", "dex"],
  ["INT", "intel"], ["VIT", "vit"], ["LUC", "luc"],
] as const;

export default function GrowthShell() {
  const growth = useGrowthQuery();
  const current = growth.data?.current;
  const changes = growth.data?.recentExpChanges ?? [];

  return (
    <div className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center gap-3" data-testid="growth-shell">
      <PanelFrame title="Current Growth" depth={1}>
        <div className="space-y-2 px-3">
          {growth.loading && !growth.data ? <InfoCard>Loading Growth...</InfoCard> : null}
          {growth.error ? <><p role="alert" className="text-xs text-red-400">{growth.error}</p><button type="button" onClick={() => void growth.retry()}>Retry</button></> : null}
          {current ? <>
            <GoldRow>Level: {current.level}</GoldRow>
            <GoldRow>EXP: {current.exp}</GoldRow>
            {CORE_STATS.map(([label, key]) => <GoldRow key={key}>{label}: {current[key]}</GoldRow>)}
            {Object.keys(current.extraStats).length === 0 ? <InfoCard>No extra stats.</InfoCard> : null}
            {Object.entries(current.extraStats).map(([name, value]) => <GoldRow key={name}>{name}: {value}</GoldRow>)}
          </> : null}
        </div>
      </PanelFrame>

      <PanelFrame title="Recent EXP Changes" depth={0}>
        <div className="space-y-3 px-3">
          {growth.data && changes.length === 0 ? <InfoCard>No recent EXP changes.</InfoCard> : null}
          {changes.map((change) => (
            <InfoCard key={change.changeId} label={`Change #${change.changeId}`}>
              <div>Requested EXP: {change.requestedExp}</div>
              <div>Applied EXP: {change.appliedExp}</div>
              <div>Leftover EXP: {change.leftoverExp}</div>
              <div>Level: {change.beforeLevel} → {change.afterLevel}</div>
              <div>Total EXP: {change.beforeTotalExp} → {change.afterTotalExp}</div>
              <div>Occurred: {change.occurredAt}</div>
              {change.sourceType === null ? <div>Source unavailable.</div> : <>
                <div>Source Type: {change.sourceType}</div>
                {change.sourceId === null ? null : <div>Source ID: {change.sourceId}</div>}
              </>}
            </InfoCard>
          ))}
        </div>
      </PanelFrame>
    </div>
  );
}
