"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type { HobbyStatus, PlayerHobbyMutationRequest } from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import CreateSlot, { CreateCategory, useCreateMode } from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useHobbyQueries } from "./useHobbyQueries";

const STATUSES: HobbyStatus[] = ["ACTIVE", "PAUSED", "DROPPED"];
const buttonStyle = {
  border: `1px solid ${SAO.color.border.panel}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.panel,
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

function value(form: FormData, key: string): string | undefined {
  return String(form.get(key) ?? "").trim() || undefined;
}

function fields(form: FormData): PlayerHobbyMutationRequest {
  const proficiency = value(form, "proficiency");
  return {
    ...(value(form, "customName") ? { customName: value(form, "customName") } : {}),
    ...(value(form, "detail") ? { detail: value(form, "detail") } : {}),
    ...(proficiency !== undefined ? { proficiency: Number(proficiency) } : {}),
    ...(value(form, "status") ? { status: value(form, "status") as HobbyStatus } : {}),
    ...(value(form, "startedOn") ? { startedOn: value(form, "startedOn") } : {}),
  };
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="space-y-2 px-3"><p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{message}</p><button type="button" style={buttonStyle} onClick={retry}>다시 시도</button></div>;
}

export default function HobbyShell({ onBack, createRequest = 0 }: { onBack?: () => void; createRequest?: number }) {
  const creation = useCreateMode(createRequest);
  const { confirm, dialog } = useSaoConfirm();
  const hobbies = useHobbyQueries();
  const [detailVisible, setDetailVisible] = useState(true);
  useEffect(() => { if (creation.creating) setDetailVisible(false); }, [creation.creating]);
  const select = (id: number) => { setDetailVisible(true); hobbies.select(id); };
  const [catalogId, setCatalogId] = useState("");
  const pending = hobbies.pendingMutation !== null;
  const available = hobbies.catalog.items.filter((item) => !hobbies.owned.items.some((owned) => owned.hobbyId === item.hobbyId));
  const selected = detailVisible && !creation.creating && hobbies.selected;

  return (
    <div className="lag-panel-rail relative" data-testid="hobby-shell">{dialog}
      <PanelStage stageKey="player-hobby-list" index={1}>
        <PanelFrame title="내 취미" depth={1} backButton={creation.creating ? <BackButton label="목록으로" onClick={creation.close} /> : onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
        <CreateCategory title="취미" onOpen={creation.close} onCreate={creation.open} />
        <CreateSlot creating={creation.creating} pending={pending} onClose={creation.close} list={<>
        <div className="space-y-3">
          {hobbies.owned.loading && hobbies.owned.items.length === 0 ? <InfoCard>취미를 불러오는 중…</InfoCard> : null}
          {hobbies.owned.error ? <ErrorState message={hobbies.owned.error} retry={() => void hobbies.owned.reload()} /> : null}
          {!hobbies.owned.loading && !hobbies.owned.error && hobbies.owned.items.length === 0 ? <InfoCard>등록된 취미가 없습니다.</InfoCard> : null}
          {hobbies.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{hobbies.mutationError}</p> : null}
          <div className="space-y-2">{hobbies.owned.items.map((item, index) => <PanelCard key={item.hobbyId} label={item.customName} slotLabel={item.category.slice(0, 2).toUpperCase()} subtitle={`${item.name} · ${item.status} · ${item.proficiency}/100`} selected={hobbies.selectedId === item.hobbyId} index={index} actions={[{ type: "edit", label: "수정" }, { type: "delete", label: "삭제" }]} onAction={async (type) => { if (type === "edit") select(item.hobbyId); else if (await confirm(`“${item.customName}”을 삭제할까요? 내 취미 등록이 제거됩니다.`)) await hobbies.remove(item.hobbyId); }} onClick={() => select(item.hobbyId)} />)}</div>
        </div>
        </>}>
        <div className="space-y-3 px-3">
          {hobbies.catalog.loading && hobbies.catalog.items.length === 0 ? <InfoCard>취미 카탈로그를 불러오는 중…</InfoCard> : null}
          {hobbies.catalog.error ? <ErrorState message={hobbies.catalog.error} retry={() => void hobbies.catalog.retry()} /> : null}
          {!hobbies.catalog.loading && !hobbies.catalog.error ? (
            <form className="space-y-2" onSubmit={async (event) => {
              event.preventDefault();
              const element = event.currentTarget;
              const saved = await creation.save(() => hobbies.register(Number(catalogId), fields(new FormData(element))));
              if (saved) { element.reset(); setCatalogId(""); }
            }}>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>취미<select aria-label="취미" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={INPUT_STYLE}><option value="">선택…</option>{available.map((item) => <option key={item.hobbyId} value={item.hobbyId}>{item.name} · {item.category}</option>)}</select></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>취미 이름<input name="customName" required disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>설명<textarea name="detail" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>숙련도<input name="proficiency" type="number" min="0" max="100" required disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>상태<select name="status" required defaultValue="ACTIVE" disabled={pending} style={INPUT_STYLE}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>시작일<input name="startedOn" type="date" disabled={pending} style={INPUT_STYLE} /></label>
              <button type="submit" disabled={pending || available.length === 0} style={buttonStyle}>{pending ? "처리 중…" : "취미 저장"}</button>
            </form>
          ) : null}
        </div>
        </CreateSlot>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <PanelStage key="player-hobby-detail" stageKey="player-hobby-detail" index={2}>
            <PanelFrame title="취미 상세" depth={0} contentKey={selected.hobbyId} backButton={<BackButton label="내 취미 목록으로" onClick={() => {
              hobbies.clearSelection();
              requestStageFocus("player-hobby-list", "back");
            }} />}>
              <div className="space-y-3 px-3">
            <InfoCard>{selected.customName}</InfoCard>
            <GoldRow>취미: {selected.name}</GoldRow><GoldRow>분류: {selected.category}</GoldRow><GoldRow>상태: {selected.status}</GoldRow><GoldRow>숙련도: {selected.proficiency}/100</GoldRow><GoldRow>시작일: {selected.startedOn ?? "미등록"}</GoldRow><GoldRow>경험치: {selected.xp}</GoldRow><InfoCard label="설명">{selected.detail ?? "미등록"}</InfoCard>
            <form key={selected.hobbyId} className="space-y-2" onSubmit={(event) => { event.preventDefault(); void hobbies.update(selected.hobbyId, fields(new FormData(event.currentTarget))); }}>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 취미 이름<input name="customName" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 설명<textarea name="detail" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 숙련도<input name="proficiency" type="number" min="0" max="100" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 상태<select name="status" defaultValue="" disabled={pending} style={INPUT_STYLE}><option value="">현재 값 유지…</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 시작일<input name="startedOn" type="date" disabled={pending} style={INPUT_STYLE} /></label>
              <p className="text-xs" style={{ color: SAO.color.text.label }}>빈 항목은 현재 값을 유지합니다. 항목 지우기는 지원하지 않습니다.</p>
              <div className="flex gap-2"><button type="submit" disabled={pending} style={{ ...buttonStyle, flex: 1 }}>{pending ? "처리 중…" : "취미 저장"}</button><button type="button" disabled={pending} style={buttonStyle} onClick={async () => { if (await confirm(`“${selected.customName}”을 삭제할까요? 내 취미 등록이 제거됩니다.`)) void hobbies.remove(selected.hobbyId); }}>삭제</button></div>
            </form>
              </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
