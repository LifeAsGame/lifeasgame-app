"use client";

import { SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useTitleQueries } from "./useTitleQueries";

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

export default function TitleShell() {
  const titles = useTitleQueries();
  const selected = titles.selected;
  const representative = titles.representativeTitleId;
  const representativeAvailable = representative === null || titles.titles.items.some(({ titleId }) => titleId === representative);

  return (
    <div className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center gap-3" data-testid="title-shell">
      <PanelFrame title="Acquired Titles" depth={1}>
        <div className="space-y-3">
          {titles.player.loading && !titles.player.data ? <InfoCard>Loading Current Player...</InfoCard> : null}
          {titles.player.error ? <ErrorState message={titles.player.error} retry={() => void titles.player.reload()} /> : null}
          {titles.titles.loading && titles.titles.items.length === 0 ? <InfoCard>Loading Titles...</InfoCard> : null}
          {titles.titles.error ? <ErrorState message={titles.titles.error} retry={() => void titles.titles.reload()} /> : null}
          {!titles.titles.loading && !titles.titles.error && titles.titles.items.length === 0 ? <InfoCard>No acquired Titles.</InfoCard> : null}
          {!representativeAvailable ? <InfoCard>Representative Title #{representative} is unavailable in acquired Titles.</InfoCard> : null}
          {titles.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{titles.mutationError}</p> : null}
          <div className="space-y-2">
            {titles.titles.items.map((title, index) => (
              <PanelCard
                key={title.titleId}
                label={title.name}
                slotLabel={title.code.slice(0, 2)}
                subtitle={`${title.category} · ${title.acquiredAt}${representative === title.titleId ? " · Representative Title" : ""}`}
                selected={titles.selectedId === title.titleId}
                index={index}
                onClick={() => titles.select(title.titleId)}
              />
            ))}
          </div>
        </div>
      </PanelFrame>

      <PanelFrame title="Title Detail" depth={0}>
        {!selected ? <InfoCard>Select an acquired Title.</InfoCard> : (
          <div className="space-y-3 px-3">
            <InfoCard>{selected.name}</InfoCard>
            <GoldRow>Code: {selected.code}</GoldRow>
            <GoldRow>Category: {selected.category}</GoldRow>
            <GoldRow>Acquired: {selected.acquiredAt}</GoldRow>
            {representative === selected.titleId ? <GoldRow>Representative Title</GoldRow> : null}
            <InfoCard label="Description"><span style={{ whiteSpace: "pre-wrap" }}>{selected.descMd}</span></InfoCard>
            <button
              type="button"
              disabled={titles.pendingMutation || representative === selected.titleId}
              style={buttonStyle}
              onClick={() => void titles.setRepresentative(selected.titleId)}
            >
              {titles.pendingMutation ? "Working..." : representative === selected.titleId ? "Representative Title" : "Set Representative"}
            </button>
          </div>
        )}
      </PanelFrame>
    </div>
  );
}
