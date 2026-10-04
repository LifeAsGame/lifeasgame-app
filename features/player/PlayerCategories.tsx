"use client";

import { useState } from "react";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { RecordRow, SwipeButton } from "@/features/role/RecordRow";
import CreateSlot, { useCreateMode } from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { categoryKey, type PersonalCategory } from "./personalCategories";
import { categoryLabel, Feedback } from "./PlayerDetail";
import { usePersonalCategories } from "./usePersonalCategories";

export default function PlayerCategories({ title, stageKey, model, createRequest, selectedKey, onSelect, onCreate, onDeleted, onBack }: {
  title: string; stageKey: string; model: ReturnType<typeof usePersonalCategories>; createRequest: number;
  selectedKey: string | null; onSelect: (category: PersonalCategory) => void; onCreate: (category: PersonalCategory) => void;
  onDeleted: (id: number) => void; onBack?: () => void;
}) {
  const creation = useCreateMode(createRequest), { confirm, dialog } = useSaoConfirm(), compact = useMediaQuery("(max-width: 1199px)");
  const [renaming, setRenaming] = useState<PersonalCategory | null>(null);
  const [name, setName] = useState("");
  const formOpen = creation.creating || renaming !== null;
  const close = () => { creation.close(); setRenaming(null); setName(""); model.clearMutationError(); };
  const startRename = (category: PersonalCategory) => { creation.close(); setRenaming(category); setName(category.name); model.clearMutationError(); };
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = renaming ? await model.rename(renaming.id!, name) : await model.create(name);
    if (saved) close();
  };
  const remove = async (category: PersonalCategory) => {
    if (category.id === null || !await confirm("“" + category.name + "” 분류를 삭제할까요? 자격증·취미 항목은 유지되고 개인 분류 연결만 해제됩니다.")) return;
    if (await model.remove(category.id)) onDeleted(category.id);
  };
  return <PanelStage stageKey={stageKey} parentStageKey="player-stage-0" panelRole="list" inactive={compact && selectedKey !== null && !formOpen}>{dialog}
    <PanelFrame title={formOpen ? renaming ? "내 분류 이름 수정" : "내 분류 만들기" : title + " 분류"} centerSelected={!formOpen} centerTargetKey={formOpen ? null : selectedKey} centerBehavior="spring" backButton={formOpen ? <BackButton label="분류 목록으로" onClick={close} /> : onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
      <CreateSlot creating={formOpen} pending={model.pending} onClose={close} showCancel={false} list={<div className="lag-player-content">
        {model.loading ? <InfoCard>분류를 불러오는 중…</InfoCard> : null}
        {model.error ? <Feedback message={"개인 분류를 사용할 수 없습니다. 기본 분류만 표시합니다. " + model.error} retry={() => void model.reload()} /> : null}
        {model.mutationError ? <Feedback message={model.mutationError} /> : null}
        <p className="lag-player-category-heading">기본 분류</p>
        <div className="lag-role-node-list">{model.categories.filter((category) => category.source === "SYSTEM").map((category) => <SwipeButton key={categoryKey(category)} creation className="lag-role-node" aria-pressed={selectedKey === categoryKey(category)} data-scroll-center-target={selectedKey === categoryKey(category) ? "true" : undefined} onClick={() => onSelect(category)} onDoubleClick={() => onCreate(category)}><span className="lag-role-node-mark" aria-hidden>{categoryLabel(category.name).slice(0, 1)}</span><strong>{categoryLabel(category.name)}</strong></SwipeButton>)}</div>
        <p className="lag-player-category-heading">내 분류</p>
        <div className="lag-role-node-list">{model.categories.filter((category) => category.source === "PERSONAL").map((category) => <RecordRow key={categoryKey(category)} title={category.name} subtitle="내 분류" selected={selectedKey === categoryKey(category)} disabled={model.pending} onSelect={() => onSelect(category)} onCreate={() => onCreate(category)} onEdit={() => startRename(category)} onArchive={() => void remove(category)} />)}</div>
        {!model.loading && !model.categories.some((category) => category.source === "PERSONAL") ? <p>내 분류가 없습니다.</p> : null}
      </div>}>
        <form className="lag-player-form lag-personal-category-form" onSubmit={submit}>
          <label className="lag-player-field"><span>분류 이름</span><input aria-label="분류 이름" autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
          {model.mutationError ? <Feedback message={model.mutationError} /> : null}
          <button type="submit" className="lag-player-button" disabled={model.pending}>{model.pending ? "저장 중…" : "분류 저장"}</button>
        </form>
      </CreateSlot>
    </PanelFrame>
  </PanelStage>;
}
