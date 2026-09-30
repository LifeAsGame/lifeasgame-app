"use client";

import { CreateCategory } from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { categoryLabel, Feedback } from "./PlayerDetail";

export default function PlayerCategories({ title, stageKey, categories, loading, error, retry, selected, onSelect, onCreate, onBack }: {
  title: string; stageKey: string; categories: string[]; loading: boolean; error: string | null;
  retry: () => void; selected: string | null; onSelect: (category: string) => void; onCreate: (category: string) => void; onBack?: () => void;
}) {
  return <PanelStage stageKey={stageKey}>
    <PanelFrame title={`${title} 분류`} backButton={onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
      <div className="lag-player-content">
        {loading ? <InfoCard>분류를 불러오는 중…</InfoCard> : null}
        {error ? <Feedback message={error} retry={retry} /> : null}
        {!loading && !error && !categories.length ? <InfoCard>등록 가능한 분류가 없습니다.</InfoCard> : null}
        {categories.map((category) => <div key={category} data-selected={selected === category}><CreateCategory title={categoryLabel(category)} onOpen={() => onSelect(category)} onCreate={() => onCreate(category)} /></div>)}
      </div>
    </PanelFrame>
  </PanelStage>;
}
