"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import type { PersonDetail, RoleRelationDetail } from "@/shared/api/types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { archiveRoleRelationApi, createRoleRelationApi, getRoleRelationApi, listPersonsApi, listRoleRelationsApi, resolveRelationPersonStatus, updateRoleRelationApi, getPersonApi, updatePersonApi } from "./api";
import { PersonProfileDetail, PersonProfileForm } from "./PersonProfile";
import { RelationNoteFields } from "./PersonRoleContexts";
import { RecordRow } from "./RecordRow";
import { formNullable, formValue } from "./RoleForm";
import { useRoleQuery } from "./useRoleQuery";

function personState(status: string | null | undefined) {
  return status === "ARCHIVED" ? "보관된 인물" : status === "ACTIVE" ? "사용 중인 인물" : "인물 상태 미확인";
}

export default function RelationPanels({ roleId, roleName, roleStatus = "ACTIVE", createRequest, reentryRequest = 0, onBack }: { roleId: number; roleName: string; roleStatus?: string; createRequest: number; reentryRequest?: number; onBack: () => void }) {
  const { confirm, dialog } = useSaoConfirm();
  const load = useCallback(async () => {
    const [relations, persons] = await Promise.all([listRoleRelationsApi(roleId), listPersonsApi().catch(() => null)]);
    return { relations: await resolveRelationPersonStatus(relations, persons ?? []), persons: persons ?? [], personsUnavailable: persons === null };
  }, [roleId]);
  const list = useRoleQuery<{ relations: RoleRelationDetail[]; persons: PersonDetail[]; personsUnavailable: boolean }>({ relations: [], persons: [], personsUnavailable: false }, load);
  const [person, setPerson] = useState<PersonDetail | null>(null), [personEditing, setPersonEditing] = useState(false);
  const [mode, setMode] = useState<"list" | "detail" | "create" | "edit">("list");
  const [selectedId, setSelectedId] = useState<number | null>(null), [detail, setDetail] = useState<RoleRelationDetail | null>(null);
  const [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false), [loading, setLoading] = useState(false);
  const compact = useMediaQuery("(max-width: 1199px)");
  const root = useRef<HTMLDivElement>(null), request = useRef(0), lock = useRef(false), active = useRef(true);
  const restore = useRef<{ target: HTMLElement | null; scroll: HTMLElement | null; top: number }>({ target: null, scroll: null, top: 0 });
  const remember = () => {
    const scroll = root.current?.querySelector<HTMLElement>('[data-stage-key="role-detail"] .lag-panel-body') ?? null;
    restore.current = { target: document.activeElement instanceof HTMLElement ? document.activeElement : null, scroll, top: scroll?.scrollTop ?? 0 };
  };
  const close = () => {
    request.current++; setPerson(null); setPersonEditing(false); setMode("list"); setSelectedId(null); setDetail(null); setError(null); setLoading(false);
    requestStageFocus("role-detail", "back");
    requestAnimationFrame(() => {
      const { target, scroll, top } = restore.current; if (scroll) scroll.scrollTop = top;
      (target?.isConnected && root.current?.contains(target) ? target : root.current?.querySelector<HTMLElement>(`[data-relation-id="${selectedId}"] button`))?.focus({ preventScroll: true });
    });
  };
  const cancelEdit = () => { request.current++; setMode("detail"); setError(null); setLoading(false); };
  useEffect(() => { const counter = request; active.current = true; return () => { active.current = false; counter.current++; }; }, []);
  useEffect(() => { if (createRequest) { remember(); request.current++; setMode("create"); setError(null); } }, [createRequest]);
  useEffect(() => { if (reentryRequest && !createRequest) { request.current++; setPerson(null); setPersonEditing(false); setMode("list"); setSelectedId(null); setDetail(null); setError(null); setLoading(false); } }, [reentryRequest, createRequest]);
  const select = async (relationId: number, editing = false) => {
    remember(); const id = ++request.current;
    setPerson(null); setPersonEditing(false); setSelectedId(relationId); setDetail(null); setMode(editing ? "edit" : "detail"); setLoading(true); setError(null);
    try {
      const next = await getRoleRelationApi(roleId, relationId);
      const [resolved] = await resolveRelationPersonStatus([next], list.data.persons);
      const common = await getPersonApi(next.personId);
      if (id === request.current) { setDetail(resolved); setPerson(common); if (editing && (common.status !== "ACTIVE" || roleStatus !== "ACTIVE" || next.status !== "ACTIVE")) setMode("detail"); }
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "관계를 조회하지 못했습니다."); }
    finally { if (id === request.current) setLoading(false); }
  };
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current || roleStatus !== "ACTIVE" || mode === "edit" && (person?.status !== "ACTIVE" || detail?.status !== "ACTIVE")) return;
    const form = new FormData(event.currentTarget), creating = mode === "create";
    const body = { relationType: formValue(form, "relationType"), roleNotes: formNullable(form, "roleNotes") };
    const personId = Number(formValue(form, "personId"));
    if (!body.relationType || (creating && !list.data.persons.some((person) => person.id === personId && person.status === "ACTIVE"))) { setError("연결할 인물과 관계 유형을 확인해주세요."); return; }
    const id = ++request.current; lock.current = true; setPending(true); setError(null);
    try {
      if (creating) await createRoleRelationApi(roleId, { personId, ...body }); else await updateRoleRelationApi(roleId, selectedId!, body);
      if (!active.current) return;
      await list.refresh();
      if (id === request.current) close();
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "관계를 저장하지 못했습니다."); }
    finally { lock.current = false; if (active.current) setPending(false); }
  };
  const archive = async (relation: RoleRelationDetail) => {
    if (lock.current || !await confirm(`이 역할에서 “${relation.personDisplayName}” 관계를 삭제할까요? 인물 정보와 다른 역할의 관계는 유지됩니다.`)) return;
    const id = ++request.current; lock.current = true; setPending(true); setError(null);
    try {
      await archiveRoleRelationApi(roleId, relation.id);
      if (!active.current) return;
      await list.refresh(); if (id === request.current) close();
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "관계를 삭제하지 못했습니다."); }
    finally { lock.current = false; if (active.current) setPending(false); }
  };
  const form = (relation?: RoleRelationDetail) => <form key={relation?.id ?? "new"} className="lag-role-form" onSubmit={save}>
    {relation ? <p>{relation.personDisplayName} · {personState(relation.personStatus)}</p> : <label>기존 인물<select className="lag-role-control" name="personId" required defaultValue="" autoFocus><option value="" disabled>인물 선택</option>{list.data.persons.filter((person) => person.status === "ACTIVE").map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>}
    <RelationNoteFields relation={relation} />
    {error ? <p role="alert">{error}</p> : null}
    {list.data.personsUnavailable && !relation ? <p role="alert">연결할 인물을 조회하지 못했습니다. <button type="button" onClick={() => void list.refresh()}>다시 조회</button></p> : null}
    <div className="lag-role-actions"><button type="submit" className="lag-role-action" disabled={pending || roleStatus !== "ACTIVE" || Boolean(relation && relation.personStatus !== "ACTIVE") || (!relation && !list.data.persons.some((person) => person.status === "ACTIVE"))}>{pending ? "저장 중…" : "관계 저장"}</button></div>
  </form>;
  return <div ref={root} className="lag-panel-rail lag-role-relations">{dialog}
    <PanelStage stageKey="role-detail" parentStageKey="role-summary" instant inactive={compact && (mode === "detail" || mode === "edit")}>
      <PanelFrame title={mode === "create" ? "기존 인물 연결" : `${roleName} · 관계`} backButton={<BackButton label={mode === "create" ? "관계 목록으로" : `역할 ${roleName}로`} onClick={mode === "create" ? close : onBack} />}>
        <CreateSlot showCancel={false} creating={mode === "create"} pending={pending} onClose={close} list={<div className="lag-role-detail">
          {list.loading ? <p role="status">관계를 불러오는 중…</p> : null}
          {list.error ? <p role="alert">{list.error} <button type="button" className="lag-role-button" onClick={() => void list.refresh()}>다시 조회</button></p> : null}
          {error && mode === "list" ? <p role="alert">{error}</p> : null}
          {!list.loading && !list.error && !list.data.relations.length ? <p>연결된 인물이 없습니다.</p> : null}
          {list.data.relations.map((relation) => <div key={relation.id} data-relation-id={relation.id}><RecordRow title={relation.personDisplayName} subtitle={`${consumerLabel(relation.relationType)} · ${personState(relation.personStatus)}`} selected={selectedId === relation.id} disabled={pending} onSelect={() => void select(relation.id)} onCreate={() => { request.current++; setPerson(null); setPersonEditing(false); setMode("create"); setError(null); }} onEdit={() => void select(relation.id, true)} onArchive={() => void archive(relation)} /></div>)}
        </div>}>{form()}</CreateSlot>
      </PanelFrame>
    </PanelStage>
    {mode === "detail" || mode === "edit" ? <PanelStage stageKey="role-relation-detail" parentStageKey="role-detail" instant>
      <PanelFrame title={personEditing ? "공통 인물 정보 수정" : mode === "edit" ? "관계 수정" : "관계 상세"} backButton={<BackButton label={personEditing || mode === "edit" ? "관계 상세로" : "관계 목록으로"} onClick={personEditing ? () => setPersonEditing(false) : mode === "edit" ? cancelEdit : close} />}>
        {loading ? <p role="status">관계 상세를 불러오는 중…</p> : null}
        {error && !detail ? <p role="alert">{error} <button type="button" className="lag-role-button" onClick={() => void select(selectedId!, mode === "edit")}>다시 조회</button></p> : null}
        {personEditing && person ? <PersonProfileForm person={person} pending={pending} error={error} onSave={async (body) => {
          if (lock.current) return; const id = request.current; lock.current = true; setPending(true); setError(null);
          try { const saved = await updatePersonApi(person.id, body); if (id === request.current) { setPerson(saved); setPersonEditing(false); } await list.refresh(); }
          catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "인물을 저장하지 못했습니다."); }
          finally { lock.current = false; if (active.current) setPending(false); }
        }} /> : detail && mode === "edit" ? form(detail) : detail ? <article className="lag-role-detail"><h4>이 역할에서의 관계 · {roleName}</h4><p>{person?.displayName ?? detail.personDisplayName}</p><p>{personState(detail.personStatus)}</p><dl><div className="lag-role-data-row"><dt>관계 유형</dt><dd>{consumerLabel(detail.relationType)}</dd></div><div className="lag-role-data-row"><dt>역할 메모</dt><dd>{detail.roleNotes ?? "미등록"}</dd></div></dl>{person?.status === "ACTIVE" && roleStatus === "ACTIVE" && detail.status === "ACTIVE" ? <button className="lag-role-button" onClick={() => setMode("edit")}>이 역할의 관계 수정</button> : null}{person ? <section><h4>공통 인물 정보</h4><PersonProfileDetail person={person} />{person.status === "ACTIVE" ? <button className="lag-role-button" onClick={() => { setError(null); setPersonEditing(true); }}>공통 인물 정보 수정</button> : null}</section> : null}</article> : null}
      </PanelFrame>
    </PanelStage> : null}
  </div>;
}
