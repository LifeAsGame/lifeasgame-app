"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonDetail, RoleRelationDetail } from "@/shared/api/types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { archiveRoleRelationApi, createRoleRelationApi, getRoleRelationApi, listPersonsApi, listRoleRelationsApi, resolveRelationPersonStatus, updateRoleRelationApi } from "./api";
import { RecordRow } from "./RecordRow";
import { formNullable, formValue } from "./RoleForm";
import { useRoleQuery } from "./useRoleQuery";

function personState(status: string | null | undefined) {
  return status === "ARCHIVED" ? "보관된 인물" : status === "ACTIVE" ? "사용 중인 인물" : "인물 상태 미확인";
}

export default function RelationPanels({ roleId, roleName, createRequest, onBack }: { roleId: number; roleName: string; createRequest: number; onBack: () => void }) {
  const load = useCallback(async () => {
    const [relations, persons] = await Promise.all([listRoleRelationsApi(roleId), listPersonsApi().catch(() => null)]);
    return { relations: await resolveRelationPersonStatus(relations, persons ?? []), persons: persons ?? [], personsUnavailable: persons === null };
  }, [roleId]);
  const list = useRoleQuery<{ relations: RoleRelationDetail[]; persons: PersonDetail[]; personsUnavailable: boolean }>({ relations: [], persons: [], personsUnavailable: false }, load);
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
    request.current++; setMode("list"); setError(null); setLoading(false);
    requestStageFocus("role-detail", "back");
    requestAnimationFrame(() => {
      const { target, scroll, top } = restore.current; if (scroll) scroll.scrollTop = top;
      (target?.isConnected && root.current?.contains(target) ? target : root.current?.querySelector<HTMLElement>(`[data-relation-id="${selectedId}"] button`))?.focus({ preventScroll: true });
    });
  };
  useEffect(() => { const counter = request; active.current = true; return () => { active.current = false; counter.current++; }; }, []);
  useEffect(() => { if (createRequest) { remember(); request.current++; setMode("create"); setError(null); } }, [createRequest]);
  const select = async (relationId: number, editing = false) => {
    remember(); const id = ++request.current;
    setSelectedId(relationId); setDetail(null); setMode(editing ? "edit" : "detail"); setLoading(true); setError(null);
    try {
      const next = await getRoleRelationApi(roleId, relationId);
      const [resolved] = await resolveRelationPersonStatus([next], list.data.persons);
      if (id === request.current) setDetail(resolved);
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "관계를 조회하지 못했습니다."); }
    finally { if (id === request.current) setLoading(false); }
  };
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current) return;
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
    if (lock.current || !window.confirm(`역할 “${roleName}”의 “${relation.personDisplayName}” 관계를 보관할까요? 인물과 다른 역할의 관계는 유지됩니다.`)) return;
    const id = ++request.current; lock.current = true; setPending(true); setError(null);
    try {
      await archiveRoleRelationApi(roleId, relation.id);
      if (!active.current) return;
      await list.refresh(); if (id === request.current) close();
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "관계를 보관하지 못했습니다."); }
    finally { lock.current = false; if (active.current) setPending(false); }
  };
  const form = (relation?: RoleRelationDetail) => <form key={relation?.id ?? "new"} className="lag-role-form" onSubmit={save}>
    {relation ? <p>{relation.personDisplayName} · {personState(relation.personStatus)}</p> : <label>기존 인물<select className="lag-role-control" name="personId" required defaultValue="" autoFocus><option value="" disabled>인물 선택</option>{list.data.persons.filter((person) => person.status === "ACTIVE").map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>}
    <label>관계 유형<input className="lag-role-control" name="relationType" required defaultValue={relation?.relationType ?? ""} autoFocus={Boolean(relation)} /></label>
    <label>역할 메모<textarea className="lag-role-control" name="roleNotes" rows={3} defaultValue={relation?.roleNotes ?? ""} /></label>
    {error ? <p role="alert">{error}</p> : null}
    {list.data.personsUnavailable && !relation ? <p role="alert">연결할 인물을 조회하지 못했습니다. <button type="button" onClick={() => void list.refresh()}>다시 조회</button></p> : null}
    <div className="lag-role-actions"><button type="submit" className="lag-role-action" disabled={pending || (!relation && !list.data.persons.some((person) => person.status === "ACTIVE"))}>{pending ? "저장 중…" : relation ? "관계 저장" : "관계 연결"}</button><button type="button" className="lag-role-button" onClick={close}>취소</button></div>
  </form>;
  return <div ref={root} className="lag-panel-rail lag-role-relations">
    <PanelStage stageKey="role-detail" inactive={compact && (mode === "detail" || mode === "edit")}>
      <PanelFrame title={mode === "create" ? "기존 인물 연결" : `${roleName} · 관계`} backButton={<BackButton label={mode === "create" ? "관계 목록으로" : `역할 ${roleName}로`} onClick={mode === "create" ? close : onBack} />}>
        <div hidden={mode === "create"} className="lag-role-detail">
          <button type="button" className="lag-role-action" onClick={() => { remember(); request.current++; setMode("create"); setError(null); }}>관계 추가</button>
          {list.loading ? <p role="status">관계를 불러오는 중…</p> : null}
          {list.error ? <p role="alert">{list.error} <button type="button" className="lag-role-button" onClick={() => void list.refresh()}>다시 조회</button></p> : null}
          {error && mode === "list" ? <p role="alert">{error}</p> : null}
          {!list.loading && !list.error && !list.data.relations.length ? <p>연결된 인물이 없습니다.</p> : null}
          {list.data.relations.map((relation) => <div key={relation.id} data-relation-id={relation.id}><RecordRow title={relation.personDisplayName} subtitle={`${relation.relationType} · ${personState(relation.personStatus)}`} selected={selectedId === relation.id} disabled={pending} onSelect={() => void select(relation.id)} onEdit={() => void select(relation.id, true)} onArchive={() => void archive(relation)} /></div>)}
        </div>
        {mode === "create" ? form() : null}
      </PanelFrame>
    </PanelStage>
    {mode === "detail" || mode === "edit" ? <PanelStage stageKey="role-relation-detail">
      <PanelFrame title={mode === "edit" ? "관계 수정" : "관계 상세"} backButton={<BackButton label="관계 목록으로" onClick={close} />}>
        {loading ? <p role="status">관계 상세를 불러오는 중…</p> : null}
        {error && !detail ? <p role="alert">{error} <button type="button" className="lag-role-button" onClick={() => void select(selectedId!, mode === "edit")}>다시 조회</button></p> : null}
        {detail && mode === "edit" ? form(detail) : detail ? <article className="lag-role-detail"><h4>{detail.personDisplayName}</h4><p>{personState(detail.personStatus)}</p><dl><div className="lag-role-data-row"><dt>관계 유형</dt><dd>{detail.relationType}</dd></div><div className="lag-role-data-row"><dt>역할 메모</dt><dd>{detail.roleNotes ?? "미등록"}</dd></div></dl><div className="lag-role-actions"><button type="button" className="lag-role-button" disabled={pending} onClick={() => { remember(); request.current++; setMode("edit"); }}>관계 수정</button><button type="button" className="lag-role-button" disabled={pending} onClick={() => void archive(detail)}>관계 보관</button></div></article> : null}
      </PanelFrame>
    </PanelStage> : null}
  </div>;
}
