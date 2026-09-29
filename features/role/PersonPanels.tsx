"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonDetail } from "@/shared/api/types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { archivePersonApi, createPersonApi, getPersonApi, listPersonsApi, updatePersonApi } from "./api";
import { RecordRow } from "./RecordRow";
import { formNullable, formValue } from "./RoleForm";
import { useRoleQuery } from "./useRoleQuery";

export default function PersonPanels({ active, createRequest, onBack }: { active: boolean; createRequest: number; onBack: () => void }) {
  const list = useRoleQuery<PersonDetail[]>([], listPersonsApi, active);
  const compact = useMediaQuery("(max-width: 1199px)");
  const root = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [mode, setMode] = useState<"detail" | "edit" | "create">("detail");
  const [loading, setLoading] = useState(false), [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0), locked = useRef(false), mounted = useRef(true);
  const restore = useRef<{ target: HTMLElement | null; scroll: HTMLElement | null; top: number }>({ target: null, scroll: null, top: 0 });
  const remember = () => {
    const target = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroll = root.current?.querySelector<HTMLElement>('[data-stage-key="person-list"] .lag-panel-body') ?? null;
    restore.current = { target, scroll, top: scroll?.scrollTop ?? 0 };
  };
  const close = () => {
    request.current++; setDetailOpen(false); setMode("detail"); setError(null); setLoading(false);
    requestStageFocus("person-list", "back");
    requestAnimationFrame(() => {
      const { target, scroll, top } = restore.current;
      if (scroll) scroll.scrollTop = top;
      (target?.isConnected && root.current?.contains(target) ? target : root.current?.querySelector<HTMLElement>(`[data-person-id="${selectedId}"] button`))?.focus({ preventScroll: true });
    });
  };
  useEffect(() => { const counter = request; mounted.current = true; return () => { mounted.current = false; counter.current++; }; }, []);
  useEffect(() => { if (!active) request.current++; }, [active]);
  useEffect(() => {
    if (!createRequest) return;
    remember(); request.current++; setMode("create"); setError(null); setLoading(false);
  }, [createRequest]);

  const select = async (personId: number, editing = false) => {
    remember(); const id = ++request.current;
    setDetailOpen(true); setSelectedId(personId); setDetail(null); setMode(editing ? "edit" : "detail"); setError(null); setLoading(true);
    try {
      const next = await getPersonApi(personId);
      if (id === request.current) setDetail(next);
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "인물을 조회하지 못했습니다."); }
    finally { if (id === request.current) setLoading(false); }
  };
  const archive = async (person: PersonDetail) => {
    if (locked.current || !window.confirm(`인물 “${person.displayName}”을 보관할까요? 연결된 역할 관계는 유지됩니다.`)) return;
    const id = ++request.current; locked.current = true; setPending(true); setError(null);
    try {
      await archivePersonApi(person.id);
      if (!mounted.current) return;
      await list.refresh();
      if (id === request.current && selectedId === person.id) { setSelectedId(null); setDetail(null); close(); }
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "인물을 보관하지 못했습니다."); }
    finally { locked.current = false; if (mounted.current) setPending(false); }
  };
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (locked.current) return;
    const form = new FormData(event.currentTarget);
    const body = { displayName: formValue(form, "displayName"), birthday: formNullable(form, "birthday"), contact: formNullable(form, "contact"), notes: formNullable(form, "notes") };
    if (!body.displayName) { setError("인물 이름을 입력해주세요."); return; }
    const creating = mode === "create", personId = selectedId, id = ++request.current;
    locked.current = true; setPending(true); setError(null);
    try {
      const saved = creating ? await createPersonApi(body) : await updatePersonApi(personId!, body);
      if (!mounted.current) return;
      await list.refresh();
      if (id === request.current) { if (!creating) setDetail(saved); close(); }
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "인물을 저장하지 못했습니다."); }
    finally { locked.current = false; if (mounted.current) setPending(false); }
  };
  const form = (person?: PersonDetail) => <form key={person?.id ?? "new"} className="lag-role-form" onSubmit={save}>
    <label>인물 이름<input className="lag-role-control" name="displayName" autoFocus required maxLength={80} defaultValue={person?.displayName ?? ""} /></label>
    <label>생일<input className="lag-role-control" name="birthday" type="date" defaultValue={person?.birthday ?? ""} /></label>
    <label>연락처<input className="lag-role-control" name="contact" maxLength={120} defaultValue={person?.contact ?? ""} /></label>
    <label>인물 메모<textarea className="lag-role-control" name="notes" rows={3} defaultValue={person?.notes ?? ""} /></label>
    {error ? <p role="alert">{error}</p> : null}
    <div className="lag-role-actions"><button className="lag-role-action" type="submit" disabled={pending}>{pending ? "저장 중…" : creatingLabel(person)}</button><button className="lag-role-button" type="button" onClick={close}>취소</button></div>
  </form>;
  return <div ref={root} style={{ display: active ? undefined : "none" }} className="lag-panel-rail lag-person-panels">
    <PanelStage stageKey="person-list" autoFocus={active} inactive={compact && mode !== "create" && detailOpen}>
      <PanelFrame title={mode === "create" ? "인물 등록" : "내 인물 목록"} backButton={<BackButton label={mode === "create" ? "인물 목록으로" : "인물 · 역할로"} onClick={mode === "create" ? close : onBack} />}>
        <div hidden={mode === "create"} className="lag-role-detail">
          <button className="lag-role-action" type="button" onClick={() => { remember(); request.current++; setMode("create"); setError(null); }}>인물 추가</button>
          {list.loading ? <p role="status">인물을 불러오는 중…</p> : null}
          {list.error ? <p role="alert">{list.error} <button type="button" className="lag-role-button" onClick={() => void list.refresh()}>다시 조회</button></p> : null}
          {error && mode === "detail" ? <p role="alert">{error}</p> : null}
          {!list.loading && !list.error && list.data.length === 0 ? <p>등록된 인물이 없습니다.</p> : null}
          {list.data.map((person) => <div key={person.id} data-person-id={person.id}><RecordRow title={person.displayName} subtitle={person.status === "ARCHIVED" ? "보관된 인물" : "인물"} selected={selectedId === person.id} disabled={pending || person.status !== "ACTIVE"} onSelect={() => void select(person.id)} onEdit={() => void select(person.id, true)} onArchive={() => void archive(person)} /></div>)}
        </div>
        {mode === "create" ? form() : null}
      </PanelFrame>
    </PanelStage>
    {mode !== "create" && detailOpen && selectedId !== null ? <PanelStage stageKey="person-detail" autoFocus={active}>
      <PanelFrame title={mode === "edit" ? "인물 수정" : "인물 상세"} backButton={<BackButton label="인물 목록으로" onClick={close} />}>
        {loading ? <p role="status">인물 상세를 불러오는 중…</p> : null}
        {error && !detail ? <p role="alert">{error} <button type="button" className="lag-role-button" onClick={() => void select(selectedId, mode === "edit")}>다시 조회</button></p> : null}
        {detail && mode === "edit" ? form(detail) : detail ? <article className="lag-role-detail">
          <h4>{detail.displayName}</h4><p>{detail.status === "ARCHIVED" ? "보관된 인물" : detail.status === "ACTIVE" ? "사용 중인 인물" : "인물 상태 미확인"}</p>
          <dl>{[["생일", detail.birthday], ["연락처", detail.contact], ["인물 메모", detail.notes]].map(([label, text]) => <div key={label} className="lag-role-data-row"><dt>{label}</dt><dd>{text ?? "미등록"}</dd></div>)}</dl>
          <div className="lag-role-actions"><button type="button" className="lag-role-button" disabled={detail.status !== "ACTIVE" || pending} onClick={() => { remember(); request.current++; setMode("edit"); setError(null); }}>인물 수정</button><button type="button" className="lag-role-button" disabled={detail.status !== "ACTIVE" || pending} onClick={() => void archive(detail)}>인물 보관</button></div>
        </article> : null}
      </PanelFrame>
    </PanelStage> : null}
  </div>;
}
function creatingLabel(person?: PersonDetail) { return person ? "인물 저장" : "인물 등록"; }
