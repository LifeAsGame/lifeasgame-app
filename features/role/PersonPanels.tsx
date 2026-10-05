"use client";

import { useEffect, useRef, useState } from "react";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import type { PersonDetail, PersonInput } from "@/shared/api/types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { archivePersonApi, createPersonApi, getPersonApi, listPersonsApi, updatePersonApi } from "./api";
import PersonGuildNotes from "@/features/social/PersonGuildNotes";
import PersonRoleContexts from "./PersonRoleContexts";
import { RecordRow, SwipeButton } from "./RecordRow";
import { PersonProfileDetail, PersonProfileForm, personProfile } from "./PersonProfile";
import { useRoleQuery } from "./useRoleQuery";

export default function PersonPanels({ active, createRequest, reentryRequest = 0, onBack }: { active: boolean; createRequest: number; reentryRequest?: number; onBack: () => void }) {
  const { confirm, dialog } = useSaoConfirm();
  const list = useRoleQuery<PersonDetail[]>([], listPersonsApi, active);
  const compact = useMediaQuery("(max-width: 1199px)");
  const root = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contextsOpen, setContextsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [contextEntry, setContextEntry] = useState(0);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [mode, setMode] = useState<"detail" | "edit" | "create">("detail");
  const [loading, setLoading] = useState(false), [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedCreate, setUnverifiedCreate] = useState(false);
  const request = useRef(0), locked = useRef(false), mounted = useRef(true);
  const restore = useRef<{ target: HTMLElement | null; scroll: HTMLElement | null; top: number }>({ target: null, scroll: null, top: 0 });
  const remember = () => {
    const target = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroll = root.current?.querySelector<HTMLElement>('[data-stage-key="person-list"] .lag-panel-body') ?? null;
    restore.current = { target, scroll, top: scroll?.scrollTop ?? 0 };
  };
  const close = () => {
    request.current++; setContextsOpen(false); setNotesOpen(false); setDetailOpen(false); setSelectedId(null); setDetail(null); setMode("detail"); setError(null); setLoading(false); setUnverifiedCreate(false);
    requestStageFocus("person-list", "back");
    requestAnimationFrame(() => {
      const { target, scroll, top } = restore.current;
      if (scroll) scroll.scrollTop = top;
      (target?.isConnected && root.current?.contains(target) ? target : root.current?.querySelector<HTMLElement>(`[data-person-id="${selectedId}"] button`))?.focus({ preventScroll: true });
    });
  };
  const cancelEdit = () => { request.current++; setMode("detail"); setError(null); setLoading(false); };
  useEffect(() => { const counter = request; mounted.current = true; return () => { mounted.current = false; counter.current++; }; }, []);
  useEffect(() => { if (!active) { request.current++; setContextsOpen(false); setNotesOpen(false); setDetailOpen(false); setSelectedId(null); setDetail(null); setMode("detail"); setError(null); setLoading(false); } }, [active]);
  useEffect(() => { if (reentryRequest) { request.current++; setContextsOpen(false); setNotesOpen(false); setDetailOpen(false); setSelectedId(null); setDetail(null); setMode("detail"); setError(null); setLoading(false); } }, [reentryRequest]);
  useEffect(() => {
    if (!createRequest) return;
    remember(); request.current++; setContextsOpen(false); setNotesOpen(false); setDetailOpen(false); setMode("create"); setError(null); setLoading(false); setUnverifiedCreate(false);
  }, [createRequest]);

  const select = async (personId: number, editing = false) => {
    setContextsOpen(false); setNotesOpen(false); remember(); const id = ++request.current;
    setDetailOpen(true); setSelectedId(personId); setDetail(null); setMode(editing ? "edit" : "detail"); setError(null); setLoading(true);
    try {
      const next = await getPersonApi(personId);
      if (id === request.current) setDetail(next);
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "인물을 조회하지 못했습니다."); }
    finally { if (id === request.current) setLoading(false); }
  };
  const archive = async (person: PersonDetail) => {
    if (locked.current || !await confirm(`인물 “${person.displayName}”을 삭제할까요? 연결된 역할 관계는 이력에 남습니다.`)) return;
    const id = ++request.current; locked.current = true; setPending(true); setError(null);
    try {
      await archivePersonApi(person.id);
      if (!mounted.current) return;
      await list.refresh();
      if (id === request.current && selectedId === person.id) { setSelectedId(null); setDetail(null); close(); }
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "인물을 삭제하지 못했습니다."); }
    finally { locked.current = false; if (mounted.current) setPending(false); }
  };
  const save = async (body: PersonInput) => {
    if (locked.current || unverifiedCreate) return;
    const creating = mode === "create", personId = selectedId, id = ++request.current;
    if (list.loading || list.error || (creating ? list.data.some((person) => !person.profile) : !detail?.profile)) {
      setError("현재 서버에서 인물 확장 계약을 확인할 수 없습니다. 저장하지 않았습니다."); return;
    }
    locked.current = true; setPending(true); setError(null);
    try {
      const saved = creating ? await createPersonApi(body) : await updatePersonApi(personId!, body);
      if (!mounted.current) return;
      const verified = await getPersonApi(saved.id);
      if (JSON.stringify(personProfile(verified.profile)) !== JSON.stringify(body.profile)) {
        if (creating) setUnverifiedCreate(true);
        throw new Error(`인물 #${saved.id}의 확장 정보가 재조회에서 확인되지 않았습니다. 서버 계약을 확인해주세요.${creating ? " 중복 생성을 막기 위해 이 화면에서 다시 저장할 수 없습니다." : ""}`);
      }
      await list.refresh();
      if (id === request.current) { if (creating) close(); else { setDetail(verified); setMode("detail"); } }
    } catch (caught) { if (id === request.current) setError(caught instanceof Error ? caught.message : "인물을 저장하지 못했습니다."); }
    finally { locked.current = false; if (mounted.current) setPending(false); }
  };
  const form = (person?: PersonDetail) => <PersonProfileForm key={person?.id ?? "new"} person={person} pending={pending || unverifiedCreate} error={error} onSave={(body) => void save(body)} />;
  return <div ref={root} style={{ display: active ? undefined : "none" }} className="lag-panel-rail lag-person-panels">{dialog}
    <PanelStage stageKey="person-list" autoFocus={active} inactive={compact && mode !== "create" && detailOpen}>
      <PanelFrame title={mode === "create" ? "인물 등록" : "내 인물 목록"} backButton={<BackButton label={mode === "create" ? "인물 목록으로" : "인물 · 역할로"} onClick={mode === "create" ? close : onBack} />}>
        <CreateSlot showCancel={false} creating={mode === "create"} pending={pending} onClose={close} list={<div className="lag-role-detail">
          {list.loading ? <p role="status">인물을 불러오는 중…</p> : null}
          {list.error ? <p role="alert">{list.error} <button type="button" className="lag-role-button" onClick={() => void list.refresh()}>다시 조회</button></p> : null}
          {error && mode === "detail" ? <p role="alert">{error}</p> : null}
          {!list.loading && !list.error && list.data.length === 0 ? <p>등록된 인물이 없습니다.</p> : null}
          {list.data.map((person) => <div key={person.id} data-person-id={person.id}><RecordRow title={person.displayName} subtitle={person.status === "ARCHIVED" ? "보관된 인물" : "인물"} selected={selectedId === person.id} disabled={pending} onSelect={() => void select(person.id)} onCreate={() => { remember(); setContextsOpen(false); setNotesOpen(false); setDetailOpen(false); setMode("create"); setError(null); }} onEdit={person.status === "ACTIVE" ? () => void select(person.id, true) : undefined} onArchive={() => void archive(person)} /></div>)}
        </div>}>{form()}</CreateSlot>
      </PanelFrame>
    </PanelStage>
    {mode !== "create" && detailOpen && selectedId !== null ? <PanelStage stageKey="person-detail" parentStageKey="person-list" autoFocus={active} inactive={compact && (contextsOpen || notesOpen)}>
      <PanelFrame title={mode === "edit" ? "인물 수정" : "인물 상세"} backButton={<BackButton label={mode === "edit" ? "인물 상세로" : "인물 목록으로"} onClick={mode === "edit" ? cancelEdit : close} />}>
        {loading ? <p role="status">인물 상세를 불러오는 중…</p> : null}
        {error && !detail ? <p role="alert">{error} <button type="button" className="lag-role-button" onClick={() => void select(selectedId, mode === "edit")}>다시 조회</button></p> : null}
        {detail && mode === "edit" ? form(detail) : detail ? <><PersonProfileDetail person={detail} /><div className="lag-role-form"><button className="lag-role-button" onClick={() => { setContextsOpen(false); setNotesOpen(false); setMode("edit"); }}>공통 인물 정보 수정</button><SwipeButton className="lag-role-node" aria-pressed={contextsOpen} onClick={() => { setContextEntry((value) => value + 1); setNotesOpen(false); setContextsOpen(true); }}><span className="lag-role-node-mark" aria-hidden>관</span><span><strong>역할별 관계</strong><small>역할마다 남긴 관계와 메모</small></span></SwipeButton><SwipeButton className="lag-role-node" aria-pressed={notesOpen} onClick={() => { setContextsOpen(false); setNotesOpen(true); setContextEntry((value) => value + 1); }}><span className="lag-role-node-mark" aria-hidden>메</span><span><strong>길드별 메모</strong><small>길드마다 남긴 나만의 메모</small></span></SwipeButton></div></> : null}
      </PanelFrame>
    </PanelStage> : null}
    {active && detail && notesOpen && mode === "detail" ? <PersonGuildNotes key={`${detail.id}:${contextEntry}`} personId={detail.id} onBack={() => setNotesOpen(false)} /> : null}
    {active && detail && contextsOpen && mode === "detail" ? <PersonRoleContexts key={`${detail.id}:${contextEntry}`} person={detail} onBack={() => setContextsOpen(false)} /> : null}
  </div>;
}
