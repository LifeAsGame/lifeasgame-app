"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { HobbyStatus, PlayerHobbyMutationRequest } from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import CreateSlot, { useCreateMode } from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { categoryLabel, controlStyle, DetailLine, Feedback, Field } from "./PlayerDetail";
import PlayerCategories from "./PlayerCategories";
import { assignPersonalCategoryApi, categoryKey, type PersonalCategory } from "./personalCategories";
import { useHobbyQueries } from "./useHobbyQueries";
import { usePersonalCategories } from "./usePersonalCategories";

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
  const creation = useCreateMode();
  const { confirm, dialog } = useSaoConfirm();
  const hobbies = useHobbyQueries();
  const personalCategories = usePersonalCategories("HOBBY");
  const compact = useMediaQuery("(max-width: 1199px)");
  const [detailVisible, setDetailVisible] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [catalogId, setCatalogId] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentPending, setAssignmentPending] = useState(false);
  const [registeredUnassignedId, setRegisteredUnassignedId] = useState<number | null>(null);
  const registrationLock = useRef(false);
  const registrationAttemptedIds = useRef(new Set<number>());
  const pending = hobbies.pendingMutation !== null || assignmentPending;
  const selectedCategory = personalCategories.categories.find((item) => categoryKey(item) === category) ?? null;
  const inCategory = (item: { category: string; personalCategoryId?: number | null }) => selectedCategory?.source === "PERSONAL" ? item.personalCategoryId === selectedCategory.id : item.category === selectedCategory?.code;
  const selected = detailVisible && !creation.creating && hobbies.selected && inCategory(hobbies.selected) ? hobbies.selected : null;
  const filteredOwned = hobbies.owned.items.filter(inCategory);
  const available = hobbies.catalog.items.filter((item) => (selectedCategory?.source === "PERSONAL" || item.category === selectedCategory?.code) && (!hobbies.owned.items.some((owned) => owned.hobbyId === item.hobbyId) || registeredUnassignedId === item.hobbyId));
  const error = hobbies.mutationError;
  const clearMutationError = hobbies.clearMutationError;

  useEffect(() => { if (creation.creating) { setDetailVisible(false); setEditingId(null); clearMutationError(); } }, [creation.creating, clearMutationError]);
  const closeCreation = () => { hobbies.clearMutationError(); creation.close(); };
  const chooseCategory = (next: PersonalCategory, create = false) => {
    setCategory(categoryKey(next)); setCatalogId(""); setDetailVisible(false); setEditingId(null); setAssignmentError(null); setRegisteredUnassignedId(null); hobbies.clearSelection(); hobbies.clearMutationError();
    if (create) creation.open(); else creation.close();
    requestStageFocus("player-hobby-list", "forward");
  };
  const select = (id: number, edit = false) => { setDetailVisible(true); setEditingId(edit ? id : null); hobbies.select(id); requestStageFocus("player-hobby-detail", "forward"); };
  const backToList = () => { setEditingId(null); hobbies.clearSelection(); requestStageFocus("player-hobby-list", "back"); };
  const deleteOwned = async (id: number, name: string) => { if (await confirm(`“${name}”을 삭제할까요? 내 취미 등록이 제거됩니다.`)) await hobbies.remove(id); };
  const registerOwned = async (id: number, body: PlayerHobbyMutationRequest) => {
    if (registrationLock.current) return false;
    registrationLock.current = true; setAssignmentPending(true); setAssignmentError(null);
    try {
      if (registrationAttemptedIds.current.has(id)) {
        const owned = await hobbies.owned.reload();
        if (!owned) throw new Error("등록 상태를 다시 조회하지 못했습니다. 중복 등록을 막기 위해 재시도하지 않았습니다.");
        const existing = owned.find((item) => item.hobbyId === id);
        if (!existing) throw new Error("등록 결과를 확인할 수 없습니다. 목록에서 서버 상태를 확인해 주세요.");
        if (selectedCategory?.source === "PERSONAL" && existing.personalCategoryId === selectedCategory.id) { registrationAttemptedIds.current.delete(id); return true; }
        setRegisteredUnassignedId(id);
      } else {
        registrationAttemptedIds.current.add(id);
        if (!await hobbies.register(id, body)) return false;
      }
      if (selectedCategory?.source === "PERSONAL") {
        setRegisteredUnassignedId(id);
        try { await assignPersonalCategoryApi("HOBBY", id, selectedCategory.id); }
        catch (caught) { throw new Error(`등록됨 / 분류 배정 실패: ${caught instanceof Error ? caught.message : "다시 시도해 주세요."}`); }
        if (!await hobbies.owned.reload()) throw new Error("분류 연결 후 취미 목록을 다시 조회하지 못했습니다.");
      }
      registrationAttemptedIds.current.delete(id); setRegisteredUnassignedId(null); return true;
    } catch (caught) { setAssignmentError(caught instanceof Error ? caught.message : "내 분류에 연결하지 못했습니다. 저장을 다시 누르면 연결만 재시도합니다."); return false; }
    finally { registrationLock.current = false; setAssignmentPending(false); }
  };
  const assignOwned = async (id: number, next: number | null) => {
    setAssignmentPending(true); setAssignmentError(null);
    try { await assignPersonalCategoryApi("HOBBY", id, next); if (!await hobbies.owned.reload()) throw new Error("분류 연결 후 목록을 다시 조회하지 못했습니다."); return true; }
    catch (caught) { setAssignmentError(caught instanceof Error ? caught.message : "내 분류를 변경하지 못했습니다."); return false; }
    finally { setAssignmentPending(false); }
  };

  return <div className="lag-panel-rail lag-player-shell lag-semantic-controls relative" data-testid="hobby-shell">{dialog}
    <PlayerCategories title="취미" stageKey="player-hobby-categories" model={personalCategories} createRequest={createRequest} selectedKey={category} onSelect={(next) => chooseCategory(next)} onCreate={(next) => chooseCategory(next, true)} onDeleted={(id) => { if (category === "personal:" + id) { setCategory(null); backToList(); } }} onBack={onBack} />
    {category !== null ? <PanelStage stageKey="player-hobby-list" parentStageKey="player-hobby-categories" index={1} panelRole="list" inactive={compact && selected !== null}>
      <PanelFrame title={creation.creating ? "취미 등록" : (selectedCategory?.source === "SYSTEM" ? categoryLabel(selectedCategory.name) : selectedCategory?.name ?? "") + " 취미"} depth={1} centerSelected={!creation.creating} centerTargetKey={creation.creating ? null : String(selected?.hobbyId ?? "")} centerBehavior="spring" backButton={<BackButton label={creation.creating ? "취미 목록으로" : "취미 분류로"} onClick={creation.creating ? closeCreation : () => { setCategory(null); backToList(); }} />}>
        <CreateSlot showCancel={false} creating={creation.creating} pending={pending} onClose={closeCreation} list={<div className="lag-player-content">
          {hobbies.owned.loading && !hobbies.owned.items.length ? <InfoCard>취미를 불러오는 중…</InfoCard> : null}
          {hobbies.owned.error ? <Feedback message={hobbies.owned.error} retry={() => void hobbies.owned.reload()} /> : null}
          {error && hobbies.mutationErrorKey?.startsWith("delete-") ? <Feedback message={error} /> : null}
          {!hobbies.owned.loading && !hobbies.owned.error && !filteredOwned.length ? <InfoCard>해당 분류의 취미가 없습니다.</InfoCard> : null}
          {filteredOwned.map((item, index) => <PanelCard key={item.hobbyId} label={item.customName} slotLabel={item.customName.slice(0, 1)} subtitle={`${item.name} · ${label(item.status)} · 숙련도 ${item.proficiency}/100`} selected={selected?.hobbyId === item.hobbyId} centerTarget={selected?.hobbyId === item.hobbyId} index={index} actions={[{ type: "edit", label: "수정" }, { type: "delete", label: "삭제" }]} onAction={(type) => { if (type === "edit") select(item.hobbyId, true); else void deleteOwned(item.hobbyId, item.customName); }} onClick={() => select(item.hobbyId)} />)}
        </div>}>
          <div className="lag-player-content">
            {hobbies.catalog.loading && !hobbies.catalog.items.length ? <InfoCard>취미 카탈로그를 불러오는 중…</InfoCard> : null}
            {hobbies.catalog.error ? <Feedback message={hobbies.catalog.error} retry={() => void hobbies.catalog.retry()} /> : null}
            {!hobbies.catalog.loading && !hobbies.catalog.error ? <form className="lag-player-form" onSubmit={async (event) => {
              event.preventDefault(); if (pending || !catalogId) return;
              const element = event.currentTarget;
              const saved = await creation.save(() => registerOwned(Number(catalogId), fields(new FormData(element))));
              if (saved) { element.reset(); setCatalogId(""); }
            }}>
              <Field label="취미" required><select aria-label="취미" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={controlStyle}><option value="">선택…</option>{available.map((item) => <option key={item.hobbyId} value={item.hobbyId}>{item.name} · {categoryLabel(item.category)}</option>)}</select></Field>
              <Field label="취미 이름" required><input name="customName" required disabled={pending} style={controlStyle} /></Field>
              <Field label="설명"><textarea name="detail" disabled={pending} style={controlStyle} /></Field>
              <Field label="숙련도" required><input name="proficiency" type="number" min="0" max="100" required disabled={pending} style={controlStyle} /></Field>
              <Field label="상태" required><select name="status" required defaultValue="ACTIVE" disabled={pending} style={controlStyle}><StatusOptions /></select></Field>
              <Field label="시작일"><input name="startedOn" type="date" min="1000-01-01" disabled={pending} style={controlStyle} /></Field>
              {error && hobbies.mutationErrorKey === "register" ? <Feedback message={error} /> : null}
              {assignmentError ? <Feedback message={assignmentError} /> : null}
              <button type="submit" className="lag-player-button" disabled={pending || !available.length}>{pending ? "저장 중…" : "취미 저장"}</button>
            </form> : null}
          </div>
        </CreateSlot>
      </PanelFrame>
    </PanelStage> : null}
    <AnimatePresence initial={false} mode="popLayout">{selected ? <PanelStage key="player-hobby-detail" stageKey="player-hobby-detail" parentStageKey="player-hobby-list" index={2} panelRole="detail">
      <PanelFrame title={editingId === selected.hobbyId ? "취미 수정" : "취미 상세"} depth={0} contentKey={selected.hobbyId} backButton={<BackButton label={editingId === selected.hobbyId ? "취미 상세로" : "내 취미 목록으로"} onClick={() => { if (editingId === selected.hobbyId) { setEditingId(null); hobbies.clearMutationError(); } else backToList(); }} />}>
        <div className="lag-player-content">
          <h4>{selected.customName}</h4>
          {editingId === selected.hobbyId ? <form key={selected.hobbyId} className="lag-player-form" onSubmit={async (event) => {
            event.preventDefault(); if (pending) return;
            const form = new FormData(event.currentTarget), body = fields(form), next = Number(form.get("personalCategoryId") || 0) || null;
            const fieldsSaved = Object.keys(body).length ? await hobbies.update(selected.hobbyId, body) : true;
            const saved = fieldsSaved && (next === (selected.personalCategoryId ?? null) || await assignOwned(selected.hobbyId, next));
            if (saved) setEditingId((id) => id === selected.hobbyId ? null : id);
          }}>
            <Field label="변경할 취미 이름"><input name="customName" disabled={pending} style={controlStyle} /></Field>
            <Field label="변경할 설명"><textarea name="detail" disabled={pending} style={controlStyle} /></Field>
            <Field label="변경할 숙련도"><input name="proficiency" type="number" min="0" max="100" disabled={pending} style={controlStyle} /></Field>
            <Field label="변경할 상태"><select name="status" defaultValue="" disabled={pending} style={controlStyle}><StatusOptions keep /></select></Field>
            <Field label="변경할 시작일"><input name="startedOn" type="date" min="1000-01-01" disabled={pending} style={controlStyle} /></Field>
            <p className="text-xs">빈 항목은 현재 값을 유지합니다. 항목 지우기는 지원하지 않습니다.</p>
            <Field label="내 분류"><select name="personalCategoryId" aria-label="내 분류" defaultValue={selected.personalCategoryId ?? ""} disabled={pending} style={controlStyle}><option value="">연결 안 함</option>{personalCategories.categories.filter((item) => item.source === "PERSONAL").map((item) => <option key={item.id} value={item.id!}>{item.name}</option>)}</select></Field>
            {error && hobbies.mutationErrorKey === `update-${selected.hobbyId}` ? <Feedback message={error} /> : null}
            {assignmentError ? <Feedback message={assignmentError} /> : null}
            <div className="lag-player-actions"><button type="submit" className="lag-player-button" disabled={pending}>{pending ? "저장 중…" : "취미 저장"}</button><button type="button" className="lag-player-button" disabled={pending} onClick={() => { setEditingId(null); hobbies.clearMutationError(); }}>취소</button></div>
          </form> : <>
            <DetailLine label="취미">{selected.name}</DetailLine><DetailLine label="기본 분류">{categoryLabel(selected.category)}</DetailLine><DetailLine label="내 분류">{personalCategories.categories.find((item) => item.id !== null && item.id === selected.personalCategoryId)?.name ?? "연결 안 함"}</DetailLine><DetailLine label="상태">{label(selected.status)}</DetailLine><DetailLine label="숙련도">{selected.proficiency}/100</DetailLine><DetailLine label="시작일">{selected.startedOn}</DetailLine><DetailLine label="경험치">{selected.xp}</DetailLine><DetailLine label="설명">{selected.detail}</DetailLine>
          </>}
        </div>
      </PanelFrame>
    </PanelStage> : null}</AnimatePresence>
  </div>;
}
