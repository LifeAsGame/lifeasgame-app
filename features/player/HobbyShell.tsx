"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { HobbyStatus, PlayerHobbyMutationRequest } from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot, { CreateCategory, useCreateMode } from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { categoryLabel, controlStyle, DetailLine, Feedback, Field } from "./PlayerDetail";
import { useHobbyQueries } from "./useHobbyQueries";

const STATUS: Record<HobbyStatus, string> = { ACTIVE: "활동 중", PAUSED: "일시 중지", DROPPED: "그만둠" };
function label(value: string) { return STATUS[value as HobbyStatus] ?? value; }
function fields(form: FormData): PlayerHobbyMutationRequest {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const proficiency = value("proficiency");
  return {
    ...(value("customName") ? { customName: value("customName") } : {}),
    ...(value("detail") ? { detail: value("detail") } : {}),
    ...(proficiency ? { proficiency: Number(proficiency) } : {}),
    ...(value("status") ? { status: value("status") as HobbyStatus } : {}),
    ...(value("startedOn") ? { startedOn: value("startedOn") } : {}),
  };
}
function StatusOptions({ keep = false }: { keep?: boolean }) {
  return <>{keep ? <option value="">현재 값 유지…</option> : null}{Object.entries(STATUS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</>;
}

export default function HobbyShell({ onBack, createRequest = 0 }: { onBack?: () => void; createRequest?: number }) {
  const creation = useCreateMode(createRequest);
  const { confirm, dialog } = useSaoConfirm();
  const hobbies = useHobbyQueries();
  const [detailVisible, setDetailVisible] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [catalogId, setCatalogId] = useState("");
  const pending = hobbies.pendingMutation !== null;
  const selected = detailVisible && !creation.creating ? hobbies.selected : null;
  const available = hobbies.catalog.items.filter((item) => !hobbies.owned.items.some((owned) => owned.hobbyId === item.hobbyId));
  const error = hobbies.mutationError;
  const clearMutationError = hobbies.clearMutationError;

  useEffect(() => { if (creation.creating) { setDetailVisible(false); setEditingId(null); clearMutationError(); } }, [creation.creating, clearMutationError]);
  const closeCreation = () => { hobbies.clearMutationError(); creation.close(); };
  const select = (id: number, edit = false) => { setDetailVisible(true); setEditingId(edit ? id : null); hobbies.select(id); requestStageFocus("player-hobby-detail", "forward"); };
  const backToList = () => { setEditingId(null); hobbies.clearSelection(); requestStageFocus("player-hobby-list", "back"); };
  const deleteOwned = async (id: number, name: string) => { if (await confirm(`“${name}”을 삭제할까요? 내 취미 등록이 제거됩니다.`)) await hobbies.remove(id); };

  return <div className="lag-panel-rail lag-player-shell lag-semantic-controls relative" data-testid="hobby-shell">{dialog}
    <PanelStage stageKey="player-hobby-list" index={1}>
      <PanelFrame title="내 취미" depth={1} backButton={creation.creating ? <BackButton label="목록으로" onClick={closeCreation} /> : onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
        <CreateCategory title="취미" onOpen={closeCreation} onCreate={creation.open} />
        <CreateSlot creating={creation.creating} pending={pending} onClose={closeCreation} list={<div className="lag-player-content">
          {hobbies.owned.loading && !hobbies.owned.items.length ? <InfoCard>취미를 불러오는 중…</InfoCard> : null}
          {hobbies.owned.error ? <Feedback message={hobbies.owned.error} retry={() => void hobbies.owned.reload()} /> : null}
          {error && hobbies.mutationErrorKey?.startsWith("delete-") ? <Feedback message={error} /> : null}
          {!hobbies.owned.loading && !hobbies.owned.error && !hobbies.owned.items.length ? <InfoCard>등록된 취미가 없습니다.</InfoCard> : null}
          {hobbies.owned.items.map((item, index) => <PanelCard key={item.hobbyId} label={item.customName} slotLabel={item.customName.slice(0, 1)} subtitle={`${item.name} · ${label(item.status)} · 숙련도 ${item.proficiency}/100`} selected={selected?.hobbyId === item.hobbyId} index={index} actions={[{ type: "edit", label: "수정" }, { type: "delete", label: "삭제" }]} onAction={(type) => { if (type === "edit") select(item.hobbyId, true); else void deleteOwned(item.hobbyId, item.customName); }} onClick={() => select(item.hobbyId)} />)}
        </div>}>
          <div className="lag-player-content">
            {hobbies.catalog.loading && !hobbies.catalog.items.length ? <InfoCard>취미 카탈로그를 불러오는 중…</InfoCard> : null}
            {hobbies.catalog.error ? <Feedback message={hobbies.catalog.error} retry={() => void hobbies.catalog.retry()} /> : null}
            {!hobbies.catalog.loading && !hobbies.catalog.error ? <form className="lag-player-form" onSubmit={async (event) => {
              event.preventDefault(); if (pending || !catalogId) return;
              const element = event.currentTarget;
              const saved = await creation.save(() => hobbies.register(Number(catalogId), fields(new FormData(element))));
              if (saved) { element.reset(); setCatalogId(""); }
            }}>
              <Field label="취미" required><select aria-label="취미" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={controlStyle}><option value="">선택…</option>{available.map((item) => <option key={item.hobbyId} value={item.hobbyId}>{item.name} · {categoryLabel(item.category)}</option>)}</select></Field>
              <Field label="취미 이름" required><input name="customName" required disabled={pending} style={controlStyle} /></Field>
              <Field label="설명"><textarea name="detail" disabled={pending} style={controlStyle} /></Field>
              <Field label="숙련도" required><input name="proficiency" type="number" min="0" max="100" required disabled={pending} style={controlStyle} /></Field>
              <Field label="상태" required><select name="status" required defaultValue="ACTIVE" disabled={pending} style={controlStyle}><StatusOptions /></select></Field>
              <Field label="시작일"><input name="startedOn" type="date" disabled={pending} style={controlStyle} /></Field>
              {error && hobbies.mutationErrorKey === "register" ? <Feedback message={error} /> : null}
              <button type="submit" className="lag-player-button" disabled={pending || !available.length}>{pending ? "저장 중…" : "취미 저장"}</button>
            </form> : null}
          </div>
        </CreateSlot>
      </PanelFrame>
    </PanelStage>
    <AnimatePresence initial={false} mode="popLayout">{selected ? <PanelStage key="player-hobby-detail" stageKey="player-hobby-detail" index={2}>
      <PanelFrame title={editingId === selected.hobbyId ? "취미 수정" : "취미 상세"} depth={0} contentKey={selected.hobbyId} backButton={<BackButton label={editingId === selected.hobbyId ? "취미 상세로" : "내 취미 목록으로"} onClick={() => { if (editingId === selected.hobbyId) { setEditingId(null); hobbies.clearMutationError(); } else backToList(); }} />}>
        <div className="lag-player-content">
          <h4>{selected.customName}</h4>
          {editingId === selected.hobbyId ? <form key={selected.hobbyId} className="lag-player-form" onSubmit={async (event) => {
            event.preventDefault(); if (pending) return;
            const saved = await hobbies.update(selected.hobbyId, fields(new FormData(event.currentTarget)));
            if (saved) setEditingId((id) => id === selected.hobbyId ? null : id);
          }}>
            <Field label="변경할 취미 이름"><input name="customName" disabled={pending} style={controlStyle} /></Field>
            <Field label="변경할 설명"><textarea name="detail" disabled={pending} style={controlStyle} /></Field>
            <Field label="변경할 숙련도"><input name="proficiency" type="number" min="0" max="100" disabled={pending} style={controlStyle} /></Field>
            <Field label="변경할 상태"><select name="status" defaultValue="" disabled={pending} style={controlStyle}><StatusOptions keep /></select></Field>
            <Field label="변경할 시작일"><input name="startedOn" type="date" disabled={pending} style={controlStyle} /></Field>
            <p className="text-xs">빈 항목은 현재 값을 유지합니다. 항목 지우기는 지원하지 않습니다.</p>
            {error && hobbies.mutationErrorKey === `update-${selected.hobbyId}` ? <Feedback message={error} /> : null}
            <div className="lag-player-actions"><button type="submit" className="lag-player-button" disabled={pending}>{pending ? "저장 중…" : "취미 저장"}</button><button type="button" className="lag-player-button" disabled={pending} onClick={() => { setEditingId(null); hobbies.clearMutationError(); }}>취소</button></div>
          </form> : <>
            <DetailLine label="취미">{selected.name}</DetailLine><DetailLine label="분류">{categoryLabel(selected.category)}</DetailLine><DetailLine label="상태">{label(selected.status)}</DetailLine><DetailLine label="숙련도">{selected.proficiency}/100</DetailLine><DetailLine label="시작일">{selected.startedOn}</DetailLine><DetailLine label="경험치">{selected.xp}</DetailLine><DetailLine label="설명">{selected.detail}</DetailLine>
          </>}
        </div>
      </PanelFrame>
    </PanelStage> : null}</AnimatePresence>
  </div>;
}
