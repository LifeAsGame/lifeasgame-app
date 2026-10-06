"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { PlayerCertificationDatesRequest } from "@/shared/api/types";
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
import CatalogExplorer from "./CatalogExplorer";
import { getCatalogItemApi, getOwnedCategoriesApi, type CatalogItem } from "./catalog";
import { assignPersonalCategoryApi, categoryKey, type PersonalCategory } from "./personalCategories";
import { useCertificationQueries } from "./useCertificationQueries";
import { usePersonalCategories } from "./usePersonalCategories";

function dates(form: FormData): PlayerCertificationDatesRequest {
  const acquiredDate = String(form.get("acquiredDate") ?? "").trim();
  const expiresDate = String(form.get("expiresDate") ?? "").trim();
  return { ...(acquiredDate ? { acquiredDate } : {}), ...(expiresDate ? { expiresDate } : {}) };
}

export default function CertificationShell({ onBack, createRequest = 0 }: { onBack?: () => void; createRequest?: number }) {
  const creation = useCreateMode();
  const { confirm, dialog } = useSaoConfirm();
  const certifications = useCertificationQueries();
  const personalCategories = usePersonalCategories("CERTIFICATION");
  const compact = useMediaQuery("(max-width: 1199px)");
  const [detailVisible, setDetailVisible] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [catalogId, setCatalogId] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [ownedGroups, setOwnedGroups] = useState<PersonalCategory[] | null>(null);
  const [officialCodes, setOfficialCodes] = useState<Record<number, string>>({});
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentPending, setAssignmentPending] = useState(false);
  const [registeredUnassignedId, setRegisteredUnassignedId] = useState<number | null>(null);
  const registrationLock = useRef(false);
  const registrationAttemptedIds = useRef(new Set<number>());
  const pending = certifications.pendingMutation !== null || assignmentPending;
  const selectedCertification = certifications.selected;
  const selectableCategories = [...(ownedGroups ?? personalCategories.categories.filter((item) => item.source === "SYSTEM" && certifications.owned.items.some((owned) => owned.category === item.code))), ...personalCategories.categories.filter((item) => item.source === "PERSONAL")];
  const selectedCategory = selectableCategories.find((item) => categoryKey(item) === category) ?? null;
  const clearMutationError = certifications.clearMutationError;
  const inCategory = (item: { certificationId: number; category: string; personalCategoryId?: number | null }) => selectedCategory?.source === "PERSONAL" ? item.personalCategoryId === selectedCategory.id : selectedCategory?.source === "OFFICIAL" ? officialCodes[item.certificationId] === selectedCategory.code : item.category === selectedCategory?.code;
  const selected = detailVisible && !creation.creating && selectedCertification && inCategory(selectedCertification) ? selectedCertification : null;
  const filteredOwned = certifications.owned.items.filter(inCategory);
  const available = certifications.catalog.items.filter((item) => (selectedCategory?.source === "PERSONAL" || item.category === selectedCategory?.code) && (!certifications.owned.items.some((owned) => owned.certificationId === item.certificationId) || registeredUnassignedId === item.certificationId));

  const refreshGroups = () => { void getOwnedCategoriesApi("CERTIFICATION").then((groups) => setOwnedGroups(groups.filter((group) => group.source !== "PERSONAL")), () => setOwnedGroups(null)); };
  useEffect(() => { refreshGroups(); }, [certifications.owned.items]);
  useEffect(() => {
    if (!ownedGroups?.some((group) => group.source === "OFFICIAL")) return;
    let current = true;
    void Promise.all(certifications.owned.items.map(async (item) => {
      try {
        const detail = await getCatalogItemApi("CERTIFICATION", item.certificationId);
        return [item.certificationId, `HRDK:${detail.majorCode}:${detail.minorCode}`] as const;
      } catch { return null; }
    })).then((codes) => { if (current) setOfficialCodes(Object.fromEntries(codes.filter((value) => value !== null))); });
    return () => { current = false; };
  }, [ownedGroups, certifications.owned.items]);

  useEffect(() => { if (creation.creating) { setDetailVisible(false); setEditingId(null); clearMutationError(); } }, [creation.creating, clearMutationError]);
  const closeCreation = () => { certifications.clearMutationError(); creation.close(); };
  const chooseCategory = (next: PersonalCategory, create = false) => {
    setCatalogOpen(false);
    setCategory(categoryKey(next)); setCatalogId(""); setDetailVisible(false); setEditingId(null); setAssignmentError(null); setRegisteredUnassignedId(null); certifications.clearSelection(); certifications.clearMutationError();
    if (create) creation.open(); else creation.close();
    requestStageFocus("player-certification-list", "forward");
  };
  const select = (id: number, edit = false) => { setDetailVisible(true); setEditingId(edit ? id : null); certifications.select(id); requestStageFocus("player-certification-detail", "forward"); };
  const backToList = () => { setEditingId(null); certifications.clearSelection(); requestStageFocus("player-certification-list", "back"); };
  const deleteOwned = async (id: number, name: string) => { if (await confirm(`“${name}”을 삭제할까요? 내 자격증 등록이 제거됩니다.`)) await certifications.remove(id); };
  const registerOwned = async (id: number, body: PlayerCertificationDatesRequest, personalCategoryId?: number | null) => {
    if (registrationLock.current) return false;
    registrationLock.current = true; setAssignmentPending(true); setAssignmentError(null);
    try {
      let alreadyOwned = false;
      if (registrationAttemptedIds.current.has(id)) {
        const owned = await certifications.owned.reload();
        if (!owned) throw new Error("등록 상태를 다시 조회하지 못했습니다. 중복 등록을 막기 위해 재시도하지 않았습니다.");
        const existing = owned.find((item) => item.certificationId === id);
        if (existing) {
          alreadyOwned = true;
          if ((personalCategoryId ?? (selectedCategory?.source === "PERSONAL" ? selectedCategory.id : null)) === existing.personalCategoryId) { registrationAttemptedIds.current.delete(id); return true; }
          setRegisteredUnassignedId(id);
        }
      }
      if (!alreadyOwned) {
        registrationAttemptedIds.current.add(id);
        if (!await certifications.register(id, body)) return false;
      }
      const assignmentId = personalCategoryId ?? (selectedCategory?.source === "PERSONAL" ? selectedCategory.id : null);
      if (assignmentId !== null) {
        setRegisteredUnassignedId(id);
        try { await assignPersonalCategoryApi("CERTIFICATION", id, assignmentId); }
        catch (caught) { throw new Error(`등록됨 / 분류 배정 실패: ${caught instanceof Error ? caught.message : "다시 시도해 주세요."}`); }
        if (!await certifications.owned.reload()) throw new Error("분류 연결 후 자격증 목록을 다시 조회하지 못했습니다.");
      }
      registrationAttemptedIds.current.delete(id); setRegisteredUnassignedId(null); refreshGroups(); return true;
    } catch (caught) { setAssignmentError(caught instanceof Error ? caught.message : "내 분류에 연결하지 못했습니다. 저장을 다시 누르면 연결만 재시도합니다."); return false; }
    finally { registrationLock.current = false; setAssignmentPending(false); }
  };
  const assignOwned = async (id: number, next: number | null) => {
    setAssignmentPending(true); setAssignmentError(null);
    try { await assignPersonalCategoryApi("CERTIFICATION", id, next); if (!await certifications.owned.reload()) throw new Error("분류 연결 후 목록을 다시 조회하지 못했습니다."); return true; }
    catch (caught) { setAssignmentError(caught instanceof Error ? caught.message : "내 분류를 변경하지 못했습니다."); return false; }
    finally { setAssignmentPending(false); }
  };
  const error = certifications.mutationError;

  return <div className="lag-panel-rail lag-player-shell lag-semantic-controls relative" data-testid="certification-shell">{dialog}
    <PlayerCategories title="자격증" stageKey="player-certification-categories" model={personalCategories} createRequest={createRequest} selectedKey={catalogOpen ? "catalog" : category} visibleCategories={selectableCategories} onBrowse={() => { setCatalogOpen(true); setCategory(null); certifications.clearSelection(); requestStageFocus("player-certification-catalog-major", "forward"); }} onSelect={(next) => chooseCategory(next)} onCreate={(next) => chooseCategory(next, true)} onDeleted={(id) => { if (category === "personal:" + id) { setCategory(null); backToList(); } }} onBack={onBack} />
    {catalogOpen ? <CatalogExplorer kind="CERTIFICATION" categories={personalCategories.categories} registrationError={assignmentError} onClose={() => { setCatalogOpen(false); requestStageFocus("player-certification-categories", "back"); }} onRegister={(id, form, personalCategoryId) => registerOwned(id, dates(form), personalCategoryId)} onOwned={(item: CatalogItem) => { const owned = certifications.owned.items.find((entry) => entry.certificationId === item.catalogItemId); if (!owned) return; const code = item.source === "HRDK" ? `HRDK:${item.majorCode}:${item.minorCode}` : owned.category; if (item.source === "HRDK") setOfficialCodes((codes) => ({ ...codes, [item.catalogItemId]: code })); const next = selectableCategories.find((group) => group.source === "PERSONAL" && group.id === owned.personalCategoryId) ?? selectableCategories.find((group) => group.code === code); if (next) chooseCategory(next); select(item.catalogItemId); }} /> : null}
    {!catalogOpen && category !== null ? <PanelStage stageKey="player-certification-list" parentStageKey="player-certification-categories" index={1} panelRole="list" inactive={compact && selected !== null}>
      <PanelFrame title={creation.creating ? "자격증 등록" : (selectedCategory?.source === "SYSTEM" ? categoryLabel(selectedCategory.name) : selectedCategory?.name ?? "") + " 자격증"} depth={1} centerSelected={!creation.creating} centerTargetKey={creation.creating ? null : String(selected?.certificationId ?? "")} centerBehavior="spring" backButton={<BackButton label={creation.creating ? "자격증 목록으로" : "자격증 분류로"} onClick={creation.creating ? closeCreation : () => { setCategory(null); backToList(); }} />}>
        <CreateSlot showCancel={false} creating={creation.creating} pending={pending} onClose={closeCreation} list={<div className="lag-player-content">
          {certifications.owned.loading && !certifications.owned.items.length ? <InfoCard>자격증을 불러오는 중…</InfoCard> : null}
          {certifications.owned.error ? <Feedback message={certifications.owned.error} retry={() => void certifications.owned.reload()} /> : null}
          {error && certifications.mutationErrorKey?.startsWith("delete-") ? <Feedback message={error} /> : null}
          {!certifications.owned.loading && !certifications.owned.error && !filteredOwned.length ? <InfoCard>해당 분류의 자격증이 없습니다.</InfoCard> : null}
          {filteredOwned.map((item, index) => <PanelCard key={item.certificationId} label={item.name} slotLabel={item.name.slice(0, 1)} subtitle={`${item.issuer} · 취득일 ${item.acquiredDate ?? "미등록"}`} selected={selected?.certificationId === item.certificationId} centerTarget={selected?.certificationId === item.certificationId} index={index} actions={[{ type: "edit", label: "수정" }, { type: "delete", label: "삭제" }]} onAction={(type) => { if (type === "edit") select(item.certificationId, true); else void deleteOwned(item.certificationId, item.name); }} onClick={() => select(item.certificationId)} />)}
        </div>}>
          <div className="lag-player-content">
            {certifications.catalog.loading && !certifications.catalog.items.length ? <InfoCard>자격증 카탈로그를 불러오는 중…</InfoCard> : null}
            {certifications.catalog.error ? <Feedback message={certifications.catalog.error} retry={() => void certifications.catalog.retry()} /> : null}
            {!certifications.catalog.loading && !certifications.catalog.error ? <form className="lag-player-form" onSubmit={async (event) => {
              event.preventDefault(); if (pending || !catalogId) return;
              const element = event.currentTarget;
              const saved = await creation.save(() => registerOwned(Number(catalogId), dates(new FormData(element))));
              if (saved) { element.reset(); setCatalogId(""); }
            }}>
              <Field label="자격증" required><select aria-label="자격증" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={controlStyle}><option value="">선택…</option>{available.map((item) => <option key={item.certificationId} value={item.certificationId}>{item.name} · {item.issuer}</option>)}</select></Field>
              <Field label="취득일"><input name="acquiredDate" type="date" min="1000-01-01" disabled={pending} style={controlStyle} /></Field>
              <Field label="만료일"><input name="expiresDate" type="date" min="1000-01-01" disabled={pending} style={controlStyle} /></Field>
              {error && certifications.mutationErrorKey === "register" ? <Feedback message={error} /> : null}
              {assignmentError ? <Feedback message={assignmentError} /> : null}
              <button type="submit" className="lag-player-button" disabled={pending || !available.length}>{pending ? "저장 중…" : "자격증 저장"}</button>
            </form> : null}
          </div>
        </CreateSlot>
      </PanelFrame>
    </PanelStage> : null}
    <AnimatePresence initial={false} mode="popLayout">{selected ? <PanelStage key="player-certification-detail" stageKey="player-certification-detail" parentStageKey="player-certification-list" index={2} panelRole="detail">
      <PanelFrame title={editingId === selected.certificationId ? "자격증 수정" : "자격증 상세"} depth={0} contentKey={selected.certificationId} backButton={<BackButton label={editingId === selected.certificationId ? "자격증 상세로" : "내 자격증 목록으로"} onClick={() => { if (editingId === selected.certificationId) { setEditingId(null); certifications.clearMutationError(); } else backToList(); }} />}>
        <div className="lag-player-content">
          <h4>{selected.name}</h4>
          {editingId === selected.certificationId ? <form key={selected.certificationId} className="lag-player-form" onSubmit={async (event) => {
            event.preventDefault(); if (pending) return;
            const form = new FormData(event.currentTarget), body = dates(form), next = Number(form.get("personalCategoryId") || 0) || null;
            const datesSaved = Object.keys(body).length ? await certifications.update(selected.certificationId, body) : true;
            const saved = datesSaved && (next === (selected.personalCategoryId ?? null) || await assignOwned(selected.certificationId, next));
            if (saved) setEditingId((id) => id === selected.certificationId ? null : id);
          }}>
            <Field label="변경할 취득일"><input name="acquiredDate" type="date" min="1000-01-01" disabled={pending} style={controlStyle} /></Field>
            <Field label="변경할 만료일"><input name="expiresDate" type="date" min="1000-01-01" disabled={pending} style={controlStyle} /></Field>
            <p className="text-xs">빈 날짜는 현재 값을 유지합니다. 날짜 지우기는 지원하지 않습니다.</p>
            <Field label="내 분류"><select name="personalCategoryId" aria-label="내 분류" defaultValue={selected.personalCategoryId ?? ""} disabled={pending} style={controlStyle}><option value="">연결 안 함</option>{personalCategories.categories.filter((item) => item.source === "PERSONAL").map((item) => <option key={item.id} value={item.id!}>{item.name}</option>)}</select></Field>
            {error && certifications.mutationErrorKey === `update-${selected.certificationId}` ? <Feedback message={error} /> : null}
            {assignmentError ? <Feedback message={assignmentError} /> : null}
            <div className="lag-player-actions"><button type="submit" className="lag-player-button" disabled={pending}>{pending ? "저장 중…" : "날짜 저장"}</button><button type="button" className="lag-player-button" disabled={pending} onClick={() => { setEditingId(null); certifications.clearMutationError(); }}>취소</button></div>
          </form> : <>
            <DetailLine label="발급기관">{selected.issuer}</DetailLine><DetailLine label="기본 분류">{categoryLabel(selected.category)}</DetailLine><DetailLine label="내 분류">{personalCategories.categories.find((item) => item.id !== null && item.id === selected.personalCategoryId)?.name ?? "연결 안 함"}</DetailLine><DetailLine label="취득일">{selected.acquiredDate}</DetailLine><DetailLine label="만료일">{selected.expiresDate}</DetailLine><DetailLine label="등록일">{selected.grantedAt}</DetailLine>
          </>}
        </div>
      </PanelFrame>
    </PanelStage> : null}</AnimatePresence>
  </div>;
}
