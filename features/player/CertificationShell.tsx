"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type { PlayerCertificationDatesRequest } from "@/shared/api/types";
import { SEMANTIC_CONTROL_STYLE } from "@/shared/design/tokens";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
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
      <button type="button" style={buttonStyle} onClick={retry}>Retry</button>
    </div>
  );
}

export default function CertificationShell({ onBack }: { onBack?: () => void }) {
  const certifications = useCertificationQueries();
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
  const selected = selectedCertification && (category === "ALL" || selectedCertification.category === category)
    ? selectedCertification
    : null;

  useEffect(() => {
    if (selectedCertification && !selected) clearSelection();
  }, [clearSelection, selected, selectedCertification]);

  const changeCategory = (next: string) => {
    setCategory(next);
    if (selectedCertification && next !== "ALL" && selectedCertification.category !== next) clearSelection();
  };

  return (
    <div className="lag-panel-rail lag-semantic-controls relative" data-testid="certification-shell">
      <PanelStage stageKey="player-certification-catalog">
        <PanelFrame title="Certification Catalog" depth={2} backButton={onBack ? <BackButton label="Back to Player" onClick={onBack} /> : undefined}>
        <div className="space-y-3 px-3">
          {certifications.catalog.loading && certifications.catalog.items.length === 0 ? <InfoCard>Loading Certification catalog...</InfoCard> : null}
          {certifications.catalog.error ? <ErrorState message={certifications.catalog.error} retry={() => void certifications.catalog.retry()} /> : null}
          {!certifications.catalog.loading && !certifications.catalog.error ? (
            <>
            <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>
              Certification category
              <select aria-label="Certification category" value={category} onChange={(event) => changeCategory(event.target.value)} style={SEMANTIC_CONTROL_STYLE}>
                <option value="ALL">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <form className="space-y-2" onSubmit={async (event) => {
              event.preventDefault();
              const element = event.currentTarget;
              const saved = await certifications.register(Number(catalogId), dates(new FormData(element)));
              if (saved) {
                element.reset();
                setCatalogId("");
              }
            }}>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>
                Certification
                <select aria-label="Certification" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={SEMANTIC_CONTROL_STYLE}>
                  <option value="">Select...</option>
                  {available.map((item) => <option key={item.certificationId} value={item.certificationId}>{item.name} · {item.issuer}</option>)}
                </select>
              </label>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>Acquired date<input name="acquiredDate" type="date" disabled={pending} style={SEMANTIC_CONTROL_STYLE} /></label>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>Expires date<input name="expiresDate" type="date" disabled={pending} style={SEMANTIC_CONTROL_STYLE} /></label>
              <button type="submit" disabled={pending || available.length === 0} style={buttonStyle}>{pending ? "Working..." : "Register Certification"}</button>
            </form>
            </>
          ) : null}
        </div>
        </PanelFrame>
      </PanelStage>

      <PanelStage stageKey="player-certification-list" focusKey={category} index={1}>
        <PanelFrame title="My Certifications" depth={1} backButton={onBack ? <BackButton label="Back to Player" onClick={onBack} /> : undefined}>
        <div className="space-y-3">
          {certifications.owned.loading && certifications.owned.items.length === 0 ? <InfoCard>Loading Certifications...</InfoCard> : null}
          {certifications.owned.error ? <ErrorState message={certifications.owned.error} retry={() => void certifications.owned.reload()} /> : null}
          {!certifications.owned.loading && !certifications.owned.error && certifications.owned.items.length === 0 ? <InfoCard>No owned Certifications.</InfoCard> : null}
          {!certifications.owned.loading && !certifications.owned.error && certifications.owned.items.length > 0 && filteredOwned.length === 0 ? <InfoCard>No matching Certifications.</InfoCard> : null}
          {certifications.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: "var(--lag-state-error)" }}>{certifications.mutationError}</p> : null}
          <div className="space-y-2">
            {filteredOwned.map((item, index) => (
              <PanelCard key={item.certificationId} label={item.name} slotLabel={item.category.slice(0, 2).toUpperCase()} subtitle={`${item.issuer} · Acquired: ${item.acquiredDate ?? "Not recorded"}`} selected={certifications.selectedId === item.certificationId} index={index} onClick={() => certifications.select(item.certificationId)} />
            ))}
          </div>
        </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <PanelStage key="player-certification-detail" stageKey="player-certification-detail" focusKey={selected.certificationId} index={2}>
            <PanelFrame title="Certification Detail" depth={0} contentKey={selected.certificationId} backButton={<BackButton label="Back to My Certifications" onClick={() => {
              clearSelection();
              requestStageFocus("player-certification-list", "center");
            }} />}>
              <div className="space-y-3 px-3">
            <InfoCard>{selected.name}</InfoCard>
            <GoldRow>Issuer: {selected.issuer}</GoldRow>
            <GoldRow>Category: {selected.category}</GoldRow>
            <GoldRow>Acquired: {selected.acquiredDate ?? "Not recorded"}</GoldRow>
            <GoldRow>Expires: {selected.expiresDate ?? "Not recorded"}</GoldRow>
            <GoldRow>Granted: {selected.grantedAt}</GoldRow>
            <form className="space-y-2" onSubmit={(event) => {
              event.preventDefault();
              const body = dates(new FormData(event.currentTarget));
              if (Object.keys(body).length > 0) void certifications.update(selected.certificationId, body);
            }}>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>New acquired date<input name="acquiredDate" type="date" disabled={pending} style={SEMANTIC_CONTROL_STYLE} /></label>
              <label className="block text-xs" style={{ color: "var(--lag-text-2)" }}>New expires date<input name="expiresDate" type="date" disabled={pending} style={SEMANTIC_CONTROL_STYLE} /></label>
              <p className="text-xs" style={{ color: "var(--lag-text-2)" }}>Blank dates preserve current values; dates cannot be cleared.</p>
              <div className="flex gap-2">
                <button type="submit" disabled={pending} style={{ ...buttonStyle, flex: 1 }}>{pending ? "Working..." : "Update Dates"}</button>
                <button type="button" disabled={pending} style={buttonStyle} onClick={() => {
                  if (window.confirm(`Delete ${selected.name}?`)) void certifications.remove(selected.certificationId);
                }}>Delete</button>
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
