"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type { PlayerCertificationDatesRequest } from "@/shared/api/types";
import { SEMANTIC_CONTROL_STYLE } from "@/shared/design/tokens";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot, { CreateCategory, useCreateMode } from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useCertificationQueries } from "./useCertificationQueries";

const buttonStyle = {
  border: "1px solid var(--lag-control-border)",
  background: "var(--lag-control-bg)",
  color: "var(--lag-control-text)",
  borderRadius: "var(--lag-radius-sm)",
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

function optionalDate(form: FormData, key: string): string | undefined {
  return String(form.get(key) ?? "").trim() || undefined;
}

function dates(form: FormData): PlayerCertificationDatesRequest {
  const acquiredDate = optionalDate(form, "acquiredDate");
  const expiresDate = optionalDate(form, "expiresDate");
  return {
    ...(acquiredDate ? { acquiredDate } : {}),
    ...(expiresDate ? { expiresDate } : {}),
  };
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{message}</p>
      <button type="button" style={buttonStyle} onClick={retry}>다시 시도</button>
    </div>
  );
}

export default function CertificationShell({ onBack, createRequest = 0 }: { onBack?: () => void; createRequest?: number }) {
  const creation = useCreateMode(createRequest);
  const { confirm, dialog } = useSaoConfirm();
  const certifications = useCertificationQueries();
  const clearMutationError = certifications.clearMutationError;
  const [detailVisible, setDetailVisible] = useState(true);
  useEffect(() => { if (creation.creating) { setDetailVisible(false); clearMutationError(); } }, [creation.creating, clearMutationError]);
  const closeCreation = () => { if (creation.creating) clearMutationError(); creation.close(); };
  const select = (id: number) => { setDetailVisible(true); certifications.select(id); };
  const [catalogId, setCatalogId] = useState("");
  const [category, setCategory] = useState("ALL");
  const pending = certifications.pendingMutation !== null;
  const available = certifications.catalog.items.filter((item) => !certifications.owned.items.some((owned) => owned.certificationId === item.certificationId));
  const categories = [...new Set(certifications.catalog.items.map((item) => item.category))].sort();
  const filteredOwned = category === "ALL"
    ? certifications.owned.items
    : certifications.owned.items.filter((item) => item.category === category);
  const selectedCertification = certifications.selected;
  const clearSelection = certifications.clearSelection;
  const selected = detailVisible && !creation.creating && selectedCertification && (category === "ALL" || selectedCertification.category === category)
    ? selectedCertification
    : null;

  useEffect(() => {
    if (selectedCertification && category !== "ALL" && selectedCertification.category !== category) {
      clearSelection();
      requestStageFocus("player-certification-list", "back");
    }
  }, [clearSelection, category, selectedCertification]);

  const changeCategory = (next: string) => setCategory(next);

  return (
    <div className="lag-panel-rail lag-semantic-controls relative" data-testid="certification-shell">{dialog}
      <PanelStage stageKey="player-certification-list" index={1}>
        <PanelFrame title="내 자격증" depth={1} backButton={creation.creating ? <BackButton label="목록으로" onClick={closeCreation} /> : onBack ? <BackButton label="플레이어 목록으로" onClick={onBack} /> : undefined}>
        <CreateCategory title="자격증" onOpen={closeCreation} onCreate={creation.open} />
        {certifications.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: "var(--lag-state-error)" }}>{certifications.mutationError}</p> : null}
        <CreateSlot creating={creation.creating} pending={pending} onClose={closeCreation} list={<>
            <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>
              자격증 분류
              <select aria-label="자격증 분류" value={category} onChange={(event) => changeCategory(event.target.value)} style={SEMANTIC_CONTROL_STYLE}>
                <option value="ALL">전체 분류</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
        <div className="space-y-3">
          {certifications.owned.loading && certifications.owned.items.length === 0 ? <InfoCard>자격증을 불러오는 중…</InfoCard> : null}
          {certifications.owned.error ? <ErrorState message={certifications.owned.error} retry={() => void certifications.owned.reload()} /> : null}
          {!certifications.owned.loading && !certifications.owned.error && certifications.owned.items.length === 0 ? <InfoCard>등록된 자격증이 없습니다.</InfoCard> : null}
          {!certifications.owned.loading && !certifications.owned.error && certifications.owned.items.length > 0 && filteredOwned.length === 0 ? <InfoCard>해당 분류의 자격증이 없습니다.</InfoCard> : null}
          <div className="space-y-2">
            {filteredOwned.map((item, index) => (
              <PanelCard key={item.certificationId} label={item.name} slotLabel={item.category.slice(0, 2).toUpperCase()} subtitle={`${item.issuer} · 취득일: ${item.acquiredDate ?? "미등록"}`} selected={certifications.selectedId === item.certificationId} index={index} actions={[{ type: "edit", label: "수정" }, { type: "delete", label: "삭제" }]} onAction={async (type) => { if (type === "edit") select(item.certificationId); else if (await confirm(`“${item.name}”을 삭제할까요? 내 자격증 등록이 제거됩니다.`)) await certifications.remove(item.certificationId); }} onClick={() => select(item.certificationId)} />
            ))}
          </div>
        </div>
        </>}>
        <div className="space-y-3 px-3">
          {certifications.catalog.loading && certifications.catalog.items.length === 0 ? <InfoCard>자격증 카탈로그를 불러오는 중…</InfoCard> : null}
          {certifications.catalog.error ? <ErrorState message={certifications.catalog.error} retry={() => void certifications.catalog.retry()} /> : null}
          {!certifications.catalog.loading && !certifications.catalog.error ? (
            <>
            <form className="space-y-2" onSubmit={async (event) => {
              event.preventDefault();
              const element = event.currentTarget;
              const saved = await creation.save(() => certifications.register(Number(catalogId), dates(new FormData(element))));
              if (saved) {
                element.reset();
                setCatalogId("");
              }
            }}>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>
                자격증
                <select aria-label="자격증" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={SEMANTIC_CONTROL_STYLE}>
                  <option value="">선택…</option>
                  {available.map((item) => <option key={item.certificationId} value={item.certificationId}>{item.name} · {item.issuer}</option>)}
                </select>
              </label>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>취득일<input name="acquiredDate" type="date" disabled={pending} style={SEMANTIC_CONTROL_STYLE} /></label>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>만료일<input name="expiresDate" type="date" disabled={pending} style={SEMANTIC_CONTROL_STYLE} /></label>
              <button type="submit" disabled={pending || available.length === 0} style={buttonStyle}>{pending ? "처리 중…" : "자격증 저장"}</button>
            </form>
            </>
          ) : null}
        </div>
        </CreateSlot>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <PanelStage key="player-certification-detail" stageKey="player-certification-detail" index={2}>
            <PanelFrame title="자격증 상세" depth={0} contentKey={selected.certificationId} backButton={<BackButton label="내 자격증 목록으로" onClick={() => {
              clearSelection();
              requestStageFocus("player-certification-list", "back");
            }} />}>
              <div className="space-y-3 px-3">
            <InfoCard>{selected.name}</InfoCard>
            <GoldRow>발급기관: {selected.issuer}</GoldRow>
            <GoldRow>분류: {selected.category}</GoldRow>
            <GoldRow>취득일: {selected.acquiredDate ?? "미등록"}</GoldRow>
            <GoldRow>만료일: {selected.expiresDate ?? "미등록"}</GoldRow>
            <GoldRow>등록일: {selected.grantedAt}</GoldRow>
            <form className="space-y-2" onSubmit={(event) => {
              event.preventDefault();
              const body = dates(new FormData(event.currentTarget));
              if (Object.keys(body).length > 0) void certifications.update(selected.certificationId, body);
            }}>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>변경할 취득일<input name="acquiredDate" type="date" disabled={pending} style={SEMANTIC_CONTROL_STYLE} /></label>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>변경할 만료일<input name="expiresDate" type="date" disabled={pending} style={SEMANTIC_CONTROL_STYLE} /></label>
              <p className="text-xs" style={{ color: "var(--lag-text-2)" }}>빈 날짜는 현재 값을 유지합니다. 날짜 지우기는 지원하지 않습니다.</p>
              <div className="flex gap-2">
                <button type="submit" disabled={pending} style={{ ...buttonStyle, flex: 1 }}>{pending ? "처리 중…" : "날짜 저장"}</button>
                <button type="button" disabled={pending} style={buttonStyle} onClick={async () => {
                  if (await confirm(`“${selected.name}”을 삭제할까요? 내 자격증 등록이 제거됩니다.`)) void certifications.remove(selected.certificationId);
                }}>삭제</button>
              </div>
            </form>
              </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
