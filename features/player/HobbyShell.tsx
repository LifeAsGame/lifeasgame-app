"use client";

import { useState } from "react";

import type { HobbyStatus, PlayerHobbyMutationRequest } from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
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
  return <div className="space-y-2 px-3"><p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{message}</p><button type="button" style={buttonStyle} onClick={retry}>Retry</button></div>;
}

export default function HobbyShell() {
  const hobbies = useHobbyQueries();
  const [catalogId, setCatalogId] = useState("");
  const pending = hobbies.pendingMutation !== null;
  const available = hobbies.catalog.items.filter((item) => !hobbies.owned.items.some((owned) => owned.hobbyId === item.hobbyId));
  const selected = hobbies.selected;

  return (
    <div className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center gap-3" data-testid="hobby-shell">
      <PanelFrame title="Hobby Catalog" depth={2}>
        <div className="space-y-3 px-3">
          {hobbies.catalog.loading && hobbies.catalog.items.length === 0 ? <InfoCard>Loading Hobby catalog...</InfoCard> : null}
          {hobbies.catalog.error ? <ErrorState message={hobbies.catalog.error} retry={() => void hobbies.catalog.retry()} /> : null}
          {!hobbies.catalog.loading && !hobbies.catalog.error ? (
            <form className="space-y-2" onSubmit={async (event) => {
              event.preventDefault();
              const element = event.currentTarget;
              const saved = await hobbies.register(Number(catalogId), fields(new FormData(element)));
              if (saved) { element.reset(); setCatalogId(""); }
            }}>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>Hobby<select aria-label="Hobby" value={catalogId} onChange={(event) => setCatalogId(event.target.value)} required disabled={pending} style={INPUT_STYLE}><option value="">Select...</option>{available.map((item) => <option key={item.hobbyId} value={item.hobbyId}>{item.name} · {item.category}</option>)}</select></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>Custom name<input name="customName" required disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>Detail<textarea name="detail" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>Proficiency<input name="proficiency" type="number" min="0" max="100" required disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>Status<select name="status" required defaultValue="ACTIVE" disabled={pending} style={INPUT_STYLE}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>Started on<input name="startedOn" type="date" disabled={pending} style={INPUT_STYLE} /></label>
              <button type="submit" disabled={pending || available.length === 0} style={buttonStyle}>{pending ? "Working..." : "Register Hobby"}</button>
            </form>
          ) : null}
        </div>
      </PanelFrame>

      <PanelFrame title="My Hobbies" depth={1}>
        <div className="space-y-3">
          {hobbies.owned.loading && hobbies.owned.items.length === 0 ? <InfoCard>Loading Hobbies...</InfoCard> : null}
          {hobbies.owned.error ? <ErrorState message={hobbies.owned.error} retry={() => void hobbies.owned.reload()} /> : null}
          {!hobbies.owned.loading && !hobbies.owned.error && hobbies.owned.items.length === 0 ? <InfoCard>No owned Hobbies.</InfoCard> : null}
          {hobbies.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{hobbies.mutationError}</p> : null}
          <div className="space-y-2">{hobbies.owned.items.map((item, index) => <PanelCard key={item.hobbyId} label={item.customName} slotLabel={item.category.slice(0, 2).toUpperCase()} subtitle={`${item.name} · ${item.status} · ${item.proficiency}/100`} selected={hobbies.selectedId === item.hobbyId} index={index} onClick={() => hobbies.select(item.hobbyId)} />)}</div>
        </div>
      </PanelFrame>

      <PanelFrame title="Hobby Detail" depth={0}>
        {!selected ? <InfoCard>Select an owned Hobby.</InfoCard> : (
          <div className="space-y-3 px-3">
            <InfoCard>{selected.customName}</InfoCard>
            <GoldRow>Hobby: {selected.name}</GoldRow><GoldRow>Category: {selected.category}</GoldRow><GoldRow>Status: {selected.status}</GoldRow><GoldRow>Proficiency: {selected.proficiency}/100</GoldRow><GoldRow>Started: {selected.startedOn ?? "Not recorded"}</GoldRow><GoldRow>XP: {selected.xp}</GoldRow><InfoCard label="Detail">{selected.detail ?? "Not recorded"}</InfoCard>
            <form key={selected.hobbyId} className="space-y-2" onSubmit={(event) => { event.preventDefault(); void hobbies.update(selected.hobbyId, fields(new FormData(event.currentTarget))); }}>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>New custom name<input name="customName" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>New detail<textarea name="detail" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>New proficiency<input name="proficiency" type="number" min="0" max="100" disabled={pending} style={INPUT_STYLE} /></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>New status<select name="status" defaultValue="" disabled={pending} style={INPUT_STYLE}><option value="">Preserve...</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>New started date<input name="startedOn" type="date" disabled={pending} style={INPUT_STYLE} /></label>
              <p className="text-xs" style={{ color: SAO.color.text.label }}>Blank fields preserve current values; fields cannot be cleared.</p>
              <div className="flex gap-2"><button type="submit" disabled={pending} style={{ ...buttonStyle, flex: 1 }}>{pending ? "Working..." : "Update Hobby"}</button><button type="button" disabled={pending} style={buttonStyle} onClick={() => { if (window.confirm(`Delete ${selected.customName}?`)) void hobbies.remove(selected.hobbyId); }}>Delete</button></div>
            </form>
          </div>
        )}
      </PanelFrame>
    </div>
  );
}
