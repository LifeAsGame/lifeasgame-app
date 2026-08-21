"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import type { PlayerCertificationDatesRequest } from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useCertificationQueries } from "./useCertificationQueries";

const buttonStyle = {
  border: `1px solid ${SAO.color.border.panel}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.panel,
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
      <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{message}</p>
      <button type="button" style={buttonStyle} onClick={retry}>Retry</button>
    </div>
  );
}

export default function CertificationShell() {
  const certifications = useCertificationQueries();
  const [catalogId, setCatalogId] = useState("");
  const pending = certifications.pendingMutation !== null;
  const available = certifications.catalog.items.filter((item) => !certifications.owned.items.some((owned) => owned.certificationId === item.certificationId));
  const selected = certifications.selected;

  return (
    <div className="lag-panel-rail relative" data-testid="certification-shell">
      <PanelStage stageKey="player-certification-catalog">
        <PanelFrame title="Certification Catalog" depth={2}>
        <div className="space-y-3 px-3">
          {certifications.catalog.loading && certifications.catalog.items.length === 0 ? <InfoCard>Loading Certification catalog...</InfoCard> : null}
          {certifications.catalog.error ? <ErrorState message={certifications.catalog.error} retry={() => void certifications.catalog.retry()} /> : null}
          {!certifications.catalog.loading && !certifications.catalog.error ? (
            <form className="space-y-2" onSubmit={async (event) => {
              event.preventDefault();
              const element = event.currentTarget;
              const saved = await certifications.register(Number(catalogId), dates(new FormData(element)));
              if (saved) {
                element.reset();
                setCatalogId("");
              }
            }}>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>
                Certification
                <select aria-label="Certification" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={INPUT_STYLE}>
                  <option value="">Select...</option>
                  {available.map((item) => <option key={item.certificationId} value={item.certificationId}>{item.name} · {item.issuer}</option>)}
                </select>
              </label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>Acquired date<input name="acquiredDate" type="date" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>Expires date<input name="expiresDate" type="date" disabled={pending} style={INPUT_STYLE} /></label>
              <button type="submit" disabled={pending || available.length === 0} style={buttonStyle}>{pending ? "Working..." : "Register Certification"}</button>
            </form>
          ) : null}
        </div>
        </PanelFrame>
      </PanelStage>

      <PanelStage stageKey="player-certification-list" index={1}>
        <PanelFrame title="My Certifications" depth={1}>
        <div className="space-y-3">
          {certifications.owned.loading && certifications.owned.items.length === 0 ? <InfoCard>Loading Certifications...</InfoCard> : null}
          {certifications.owned.error ? <ErrorState message={certifications.owned.error} retry={() => void certifications.owned.reload()} /> : null}
          {!certifications.owned.loading && !certifications.owned.error && certifications.owned.items.length === 0 ? <InfoCard>No owned Certifications.</InfoCard> : null}
          {certifications.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{certifications.mutationError}</p> : null}
          <div className="space-y-2">
            {certifications.owned.items.map((item, index) => (
              <PanelCard key={item.certificationId} label={item.name} slotLabel={item.category.slice(0, 2).toUpperCase()} subtitle={`${item.issuer} · Acquired: ${item.acquiredDate ?? "Not recorded"}`} selected={certifications.selectedId === item.certificationId} index={index} onClick={() => certifications.select(item.certificationId)} />
            ))}
          </div>
        </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <PanelStage key={`player-certification-detail-${selected.certificationId}`} stageKey={`player-certification-detail-${selected.certificationId}`} index={2}>
            <PanelFrame title="Certification Detail" depth={0}>
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
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>New acquired date<input name="acquiredDate" type="date" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>New expires date<input name="expiresDate" type="date" disabled={pending} style={INPUT_STYLE} /></label>
              <p className="text-xs" style={{ color: SAO.color.text.label }}>Blank dates preserve current values; dates cannot be cleared.</p>
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
