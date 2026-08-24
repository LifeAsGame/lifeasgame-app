"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

import type { SkillsSubId } from "@/entities/nav";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { skillDetails } from "./model";
import { useSkillsQuery } from "./useSkillsQuery";

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{message}</p>
      <button type="button" className="lag-button-secondary" onClick={retry}>Retry</button>
    </div>
  );
}

export default function SkillsShell({ surface, onBack }: { surface: SkillsSubId | null; onBack: () => void }) {
  const query = useSkillsQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const type = surface === "passive" ? "PASSIVE" : surface === "active" ? "ACTIVE" : null;
  const items = type ? query.skills.filter((skill) => skill.type === type) : [];
  const selected = items.find((skill) => skill.id === selectedId) ?? null;
  const catalog = selected ? query.catalog.find((item) => item.code === selected.skillCode) : undefined;

  useEffect(() => setSelectedId(null), [surface]);

  if (!surface) return null;

  const closeList = () => {
    setSelectedId(null);
    onBack();
  };
  const closeDetail = () => {
    setSelectedId(null);
    requestStageFocus("skills-stage-1", "back");
  };

  return (
    <div className="lag-panel-rail relative" data-testid="skills-shell">
      <PanelStage stageKey="skills-stage-1">
        <PanelFrame title={`${surface === "passive" ? "Passive" : "Active"} Skills`} depth={1} contentKey={surface} backButton={<BackButton label="Back to Skills" onClick={closeList} />}>
          <div className="space-y-3">
            {query.loading && query.skills.length === 0 ? <InfoCard>Loading Skills...</InfoCard> : null}
            {query.error ? <ErrorState message={query.error} retry={() => void query.reload()} /> : null}
            {!query.loading && !query.error && items.length === 0 ? <InfoCard>No {surface} Skills.</InfoCard> : null}
            <div className="space-y-2">
              {items.map((skill, index) => (
                <PanelCard
                  key={skill.id}
                  label={skill.skillName}
                  slotLabel={`Lv.${skill.level}`}
                  subtitle={`${skill.category} · ${skill.equipped ? `Slot ${skill.equippedSlot}` : "Not equipped"}`}
                  selected={selected?.id === skill.id}
                  index={index}
                  onClick={() => setSelectedId((current) => current === skill.id ? null : skill.id)}
                />
              ))}
            </div>
          </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <PanelStage key="skills-stage-2" stageKey="skills-stage-2" index={1}>
            <PanelFrame title="Skill Detail" depth={0} contentKey={selected.id} backButton={<BackButton label={`Back to ${surface === "passive" ? "Passive" : "Active"} Skills`} onClick={closeDetail} />}>
              <div className="space-y-3 px-3">
                <InfoCard>{selected.skillName}</InfoCard>
                {catalog ? <InfoCard label="Description"><span style={{ whiteSpace: "pre-wrap" }}>{catalog.descriptionMd}</span></InfoCard> : <InfoCard>Catalog details are unavailable for this Skill.</InfoCard>}
                {skillDetails(selected, catalog).map((row) => <GoldRow key={row}>{row}</GoldRow>)}
              </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
