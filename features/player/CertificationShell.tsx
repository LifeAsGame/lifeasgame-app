"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { PlayerCertificationDatesRequest } from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot, { CreateCategory, useCreateMode } from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { categoryLabel, controlStyle, DetailLine, Feedback, Field } from "./PlayerDetail";
import { useCertificationQueries } from "./useCertificationQueries";

function dates(form: FormData): PlayerCertificationDatesRequest {
  const acquiredDate = String(form.get("acquiredDate") ?? "").trim();
  const expiresDate = String(form.get("expiresDate") ?? "").trim();
  return { ...(acquiredDate ? { acquiredDate } : {}), ...(expiresDate ? { expiresDate } : {}) };
}

export default function CertificationShell({ onBack, createRequest = 0 }: { onBack?: () => void; createRequest?: number }) {
  const creation = useCreateMode(createRequest);
  const { confirm, dialog } = useSaoConfirm();
  const certifications = useCertificationQueries();
  const [detailVisible, setDetailVisible] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [catalogId, setCatalogId] = useState("");
  const [category, setCategory] = useState("ALL");
  const pending = certifications.pendingMutation !== null;
  const selectedCertification = certifications.selected;
  const clearMutationError = certifications.clearMutationError;
  const clearSelection = certifications.clearSelection;
  const selected = detailVisible && !creation.creating && selectedCertification && (category === "ALL" || selectedCertification.category === category) ? selectedCertification : null;
  const categories = [...new Set(certifications.catalog.items.map((item) => item.category))].sort();
  const filteredOwned = certifications.owned.items.filter((item) => category === "ALL" || item.category === category);
  const available = certifications.catalog.items.filter((item) => !certifications.owned.items.some((owned) => owned.certificationId === item.certificationId));

  useEffect(() => { if (creation.creating) { setDetailVisible(false); setEditingId(null); clearMutationError(); } }, [creation.creating, clearMutationError]);
  useEffect(() => {
    if (selectedCertification && category !== "ALL" && selectedCertification.category !== category) {
      clearSelection(); setEditingId(null); requestStageFocus("player-certification-list", "back");
    }
  }, [category, selectedCertification, clearSelection]);
  const closeCreation = () => { certifications.clearMutationError(); creation.close(); };
  const select = (id: number, edit = false) => { setDetailVisible(true); setEditingId(edit ? id : null); certifications.select(id); requestStageFocus("player-certification-detail", "forward"); };
  const backToList = () => { setEditingId(null); certifications.clearSelection(); requestStageFocus("player-certification-list", "back"); };
  const deleteOwned = async (id: number, name: string) => { if (await confirm(`“${name}”을 삭제할까요? 내 자격증 등록이 제거됩니다.`)) await certifications.remove(id); };
  const error = certifications.mutationError;

  return <div className="lag-panel-rail lag-player-shell lag-semantic-controls relative" data-testid="certification-shell">{dialog}
    <PanelStage stageKey="player-certification-list" index={1}>
      <PanelFrame title="내 자격증" depth={1} backButton={creation.creating ? <BackButton label="목록으로" onClick={closeCreation} /> : onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
        <CreateCategory title="자격증" onOpen={closeCreation} onCreate={creation.open} />
        <CreateSlot creating={creation.creating} pending={pending} onClose={closeCreation} list={<div className="lag-player-content">
          <Field label="자격증 분류"><select aria-label="자격증 분류" value={category} onChange={(event) => setCategory(event.target.value)} style={controlStyle}><option value="ALL">전체 분류</option>{categories.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></Field>
          {certifications.owned.loading && !certifications.owned.items.length ? <InfoCard>자격증을 불러오는 중…</InfoCard> : null}
          {certifications.owned.error ? <Feedback message={certifications.owned.error} retry={() => void certifications.owned.reload()} /> : null}
          {error && certifications.mutationErrorKey?.startsWith("delete-") ? <Feedback message={error} /> : null}
          {!certifications.owned.loading && !certifications.owned.error && !filteredOwned.length ? <InfoCard>{certifications.owned.items.length ? "해당 분류의 자격증이 없습니다." : "등록된 자격증이 없습니다."}</InfoCard> : null}
          {filteredOwned.map((item, index) => <PanelCard key={item.certificationId} label={item.name} slotLabel={item.name.slice(0, 1)} subtitle={`${item.issuer} · 취득일 ${item.acquiredDate ?? "미등록"}`} selected={selected?.certificationId === item.certificationId} index={index} actions={[{ type: "edit", label: "수정" }, { type: "delete", label: "삭제" }]} onAction={(type) => { if (type === "edit") select(item.certificationId, true); else void deleteOwned(item.certificationId, item.name); }} onClick={() => select(item.certificationId)} />)}
        </div>}>
          <div className="lag-player-content">
            {certifications.catalog.loading && !certifications.catalog.items.length ? <InfoCard>자격증 카탈로그를 불러오는 중…</InfoCard> : null}
            {certifications.catalog.error ? <Feedback message={certifications.catalog.error} retry={() => void certifications.catalog.retry()} /> : null}
            {!certifications.catalog.loading && !certifications.catalog.error ? <form className="lag-player-form" onSubmit={async (event) => {
              event.preventDefault(); if (pending || !catalogId) return;
              const element = event.currentTarget;
              const saved = await creation.save(() => certifications.register(Number(catalogId), dates(new FormData(element))));
              if (saved) { element.reset(); setCatalogId(""); }
            }}>
              <Field label="자격증" required><select aria-label="자격증" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={controlStyle}><option value="">선택…</option>{available.map((item) => <option key={item.certificationId} value={item.certificationId}>{item.name} · {item.issuer}</option>)}</select></Field>
              <Field label="취득일"><input name="acquiredDate" type="date" disabled={pending} style={controlStyle} /></Field>
              <Field label="만료일"><input name="expiresDate" type="date" disabled={pending} style={controlStyle} /></Field>
              {error && certifications.mutationErrorKey === "register" ? <Feedback message={error} /> : null}
              <button type="submit" className="lag-player-button" disabled={pending || !available.length}>{pending ? "저장 중…" : "자격증 저장"}</button>
            </form> : null}
          </div>
        </CreateSlot>
      </PanelFrame>
    </PanelStage>
    <AnimatePresence initial={false} mode="popLayout">{selected ? <PanelStage key="player-certification-detail" stageKey="player-certification-detail" index={2}>
      <PanelFrame title={editingId === selected.certificationId ? "자격증 수정" : "자격증 상세"} depth={0} contentKey={selected.certificationId} backButton={<BackButton label={editingId === selected.certificationId ? "자격증 상세로" : "내 자격증 목록으로"} onClick={() => { if (editingId === selected.certificationId) { setEditingId(null); certifications.clearMutationError(); } else backToList(); }} />}>
        <div className="lag-player-content">
          <h4>{selected.name}</h4>
          {editingId === selected.certificationId ? <form key={selected.certificationId} className="lag-player-form" onSubmit={async (event) => {
            event.preventDefault(); if (pending) return;
            const saved = await certifications.update(selected.certificationId, dates(new FormData(event.currentTarget)));
            if (saved) setEditingId((id) => id === selected.certificationId ? null : id);
          }}>
            <Field label="변경할 취득일"><input name="acquiredDate" type="date" disabled={pending} style={controlStyle} /></Field>
            <Field label="변경할 만료일"><input name="expiresDate" type="date" disabled={pending} style={controlStyle} /></Field>
            <p className="text-xs">빈 날짜는 현재 값을 유지합니다. 날짜 지우기는 지원하지 않습니다.</p>
            {error && certifications.mutationErrorKey === `update-${selected.certificationId}` ? <Feedback message={error} /> : null}
            <div className="lag-player-actions"><button type="submit" className="lag-player-button" disabled={pending}>{pending ? "저장 중…" : "날짜 저장"}</button><button type="button" className="lag-player-button" disabled={pending} onClick={() => { setEditingId(null); certifications.clearMutationError(); }}>취소</button></div>
          </form> : <>
            <DetailLine label="발급기관">{selected.issuer}</DetailLine><DetailLine label="분류">{categoryLabel(selected.category)}</DetailLine><DetailLine label="취득일">{selected.acquiredDate}</DetailLine><DetailLine label="만료일">{selected.expiresDate}</DetailLine><DetailLine label="등록일">{selected.grantedAt}</DetailLine>
          </>}
        </div>
      </PanelFrame>
    </PanelStage> : null}</AnimatePresence>
  </div>;
}
