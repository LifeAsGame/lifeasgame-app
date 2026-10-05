"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { PersonDetail, PersonInput, RoleDetail } from "@/shared/api/types";
import { createRoleRelationApi, getPersonApi, listPersonsApi, listRolesApi, updateRoleRelationApi } from "@/features/role/api";
import { personRoleContexts, type PersonRoleContext } from "@/features/role/contextApi";
import { PersonProfileDetail, PersonProfileForm } from "@/features/role/PersonProfile";
import { RelationNoteFields } from "@/features/role/PersonRoleContexts";
import { RecordRow } from "@/features/role/RecordRow";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { createMemberPerson, getMemberPerson, selectMemberPerson, type MemberContext } from "./memberPersonApi";
import GuildMemberNote from "./GuildMemberNote";
import PrivatePersonBoundary from "./PrivatePersonBoundary";

export type MemberRoleOrigin = { id: number; name: string; status: string };
type Props = { context: MemberContext; member: { role: string; joinedAt: string }; originRole?: MemberRoleOrigin; parentStageKey: string; registration: boolean; onBack: () => void; onPrivacyLost: () => void };
type Mode = "read" | "choose" | "existing" | "new" | "relation";

async function contextsFor(personId: number) {
  const rows: PersonRoleContext[] = [];
  for (let page = 0; ; page++) { const result = await personRoleContexts(personId, page, true); rows.push(...result.contents); if (page + 1 >= result.totalPages) return rows; }
}

export default function MemberPersonPanel(props: Props) {
  return <PrivatePersonBoundary><MemberPersonContent {...props} /></PrivatePersonBoundary>;
}

export function MemberPersonContent({ context, member, originRole, parentStageKey, registration, onBack, onPrivacyLost }: Props) {
  const [mode, setMode] = useState<Mode>(registration ? "choose" : "read"), [personId, setPersonId] = useState<number | null>(null), [person, setPerson] = useState<PersonDetail | null>(null);
  const [persons, setPersons] = useState<PersonDetail[]>([]), [roles, setRoles] = useState<RoleDetail[]>([]), [roleId, setRoleId] = useState<number | null>(originRole?.id ?? null), [contexts, setContexts] = useState<PersonRoleContext[]>([]);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null), [denied, setDenied] = useState(false), [verified, setVerified] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false), [noteCloseRequest, setNoteCloseRequest] = useState(0);
  const privacyCallback = useRef(onPrivacyLost);
  privacyCallback.current = onPrivacyLost;
  const [selectedPerson, setSelectedPerson] = useState(""), [editingRelation, setEditingRelation] = useState(false);
  const mounted = useRef(true), busy = useRef(false), seq = useRef(0);
  const relation = contexts.find((row) => row.roleId === roleId);
  const role = originRole ?? roles.find((row) => row.id === roleId);
  const canWrite = !denied && verified && person?.status === "ACTIVE";
  const fail = (caught: unknown) => {
    if (!mounted.current) return;
    if (caught instanceof ApiError && [403, 404].includes(caught.status) && !caught.code.startsWith("PER-")) { setDenied(true); onPrivacyLost(); }
    setError(caught instanceof ApiError && caught.status === 409 ? "인물 연결 또는 관계 상태가 변경됐습니다. 기존 연결을 확인하거나 다른 인물을 선택하세요." : caught instanceof Error ? caught.message : "내 인물 정보를 처리하지 못했습니다.");
  };
  const readPerson = async (id: number, nextMode?: Mode) => {
    const generation = ++seq.current; setLoading(true); setVerified(false); setPersonId(id);
    try {
      const [nextPerson, nextContexts] = await Promise.all([getPersonApi(id), contextsFor(id)]);
      if (!mounted.current || generation !== seq.current) return;
      setPerson(nextPerson); setContexts(nextContexts); setVerified(true);
      if (nextMode) setMode(nextPerson.status === "ACTIVE" ? nextMode : "read");
    } catch (caught) { if (generation === seq.current) fail(caught); }
    finally { if (mounted.current && generation === seq.current) setLoading(false); }
  };
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const link = await getMemberPerson(context);
      if (!mounted.current) return;
      setDenied(false);
      if (!originRole) { const next = await listRolesApi(); if (!mounted.current) return; setRoles(next.filter((row) => row.status === "ACTIVE")); }
      if (link.personId !== null) {
        // Persist the successful identity before any following read or relation command.
        setPersonId(link.personId); await readPerson(link.personId, registration ? "relation" : "read");
      } else { setPersonId(null); setPerson(null); setContexts([]); setVerified(true); }
    } catch (caught) { fail(caught); }
    finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => { const counter = seq; mounted.current = true; void load(); return () => { mounted.current = false; counter.current++; };
    // The parent keys the panel by group/member/entry identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const revalidate = async () => {
      try { await getMemberPerson(context); }
      catch (caught) { if (mounted.current && caught instanceof ApiError && [403, 404].includes(caught.status)) { setDenied(true); privacyCallback.current(); } }
    };
    window.addEventListener("focus", revalidate);
    return () => window.removeEventListener("focus", revalidate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.groupType, context.groupId, context.memberPlayerId]);
  const chooseExisting = async () => {
    setMode("existing"); setLoading(true); setError(null);
    try { const next = await listPersonsApi(); if (mounted.current) setPersons(next.filter((row) => row.status === "ACTIVE")); }
    catch (caught) { fail(caught); }
    finally { if (mounted.current) setLoading(false); }
  };
  const link = async (body?: PersonInput) => {
    if (busy.current || denied || !verified || (!body && !selectedPerson)) return;
    busy.current = true; setPending(true); setError(null);
    try {
      const saved = body ? await createMemberPerson(context, body) : await selectMemberPerson(context, Number(selectedPerson));
      if (!mounted.current) return;
      if (saved.personId === null) throw new Error("연결된 인물을 확인하지 못했습니다.");
      setPersonId(saved.personId); setMode("relation");
      await readPerson(saved.personId);
    } catch (caught) { if (mounted.current) { fail(caught); if (caught instanceof ApiError && caught.status === 409) { setMode("choose"); setSelectedPerson(""); } } }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const saveRelation = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!canWrite || personId === null || !roleId || role?.status !== "ACTIVE" || busy.current || relation && (!editingRelation || relation.relationStatus !== "ACTIVE")) return;
    const form = new FormData(event.currentTarget), relationType = String(form.get("relationType") ?? "").trim(), roleNotes = String(form.get("roleNotes") ?? "").trim() || null;
    if (!relationType) return;
    busy.current = true; setPending(true); setError(null);
    try {
      const saved = relation ? await updateRoleRelationApi(roleId, relation.relationId, { relationType, roleNotes }) : await createRoleRelationApi(roleId, { personId, relationType, roleNotes });
      if (!mounted.current) return;
      setContexts((rows) => [...rows.filter((row) => row.roleId !== roleId), { relationId: saved.id, personId, roleId, roleName: role.name, roleStatus: role.status, relationStatus: saved.status, relationType: saved.relationType, roleNotes: saved.roleNotes, version: saved.version }]);
      setEditingRelation(false); setMode("read");
    } catch (caught) {
      fail(caught);
      if (caught instanceof ApiError && caught.status === 409) {
        // Reconcile only reads; an existing relation is never overwritten/restored.
        try { const next = await contextsFor(personId); if (mounted.current) { setContexts(next); if (next.some((row) => row.roleId === roleId)) { setMode("read"); setEditingRelation(false); } } } catch { /* Keep the original conflict and the successful Person ID. */ }
      }
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const back = () => { if (pending) return; if (noteEditing) { setNoteCloseRequest((value) => value + 1); return; } if (mode === "read" || mode === "choose" && !personId) onBack(); else { setMode(personId ? "read" : "choose"); setEditingRelation(false); setError(null); } };
  const relationView = <>
    {originRole ? <p>선택한 역할: {originRole.name}</p> : <label>내 활성 역할<select className="lag-role-control" value={roleId ?? ""} onChange={(event) => { setRoleId(Number(event.target.value) || null); setEditingRelation(false); setError(null); }}><option value="">역할 선택</option>{roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    {!originRole && !roles.length ? <p>관계를 추가하려면 먼저 내 역할을 등록하세요.</p> : null}
    {relation && !editingRelation ? <><dl><div className="lag-role-data-row"><dt>관계 유형</dt><dd>{consumerLabel(relation.relationType)}</dd></div><div className="lag-role-data-row"><dt>역할 메모</dt><dd style={{ whiteSpace: "pre-wrap" }}>{relation.roleNotes || "미등록"}</dd></div></dl>{relation.relationStatus !== "ACTIVE" || relation.roleStatus !== "ACTIVE" || person?.status !== "ACTIVE" ? <p>보관된 인물·관계·역할은 조회만 할 수 있습니다.</p> : <RecordRow title="이 역할의 관계" subtitle="이미 연결된 관계" selected onSelect={() => setMode("read")} onEdit={canWrite ? () => { setMode("relation"); setEditingRelation(true); } : undefined} />}</> : null}
    {mode === "relation" && roleId && (!relation || editingRelation) ? <form className="lag-role-form" onSubmit={saveRelation}><RelationNoteFields relation={relation} /><button className="lag-role-action" disabled={pending || loading || !canWrite || role?.status !== "ACTIVE"}>관계 저장</button></form> : !relation && roleId ? <><p>이 역할에 연결된 관계가 없습니다.</p><button className="lag-role-button" disabled={!canWrite || role?.status !== "ACTIVE"} onClick={() => setMode("relation")}>역할 관계 등록</button></> : null}
  </>;
  return <PanelStage stageKey="member-person-detail" parentStageKey={parentStageKey}><PanelFrame title={noteEditing ? "나만의 메모 수정" : mode === "new" ? "내 인물에 등록" : mode === "choose" || mode === "existing" ? "내 인물 연결" : "멤버와 내 인물"} backButton={<BackButton label={noteEditing ? "메모 읽기로" : mode === "read" ? "멤버 목록으로" : "이전 단계로"} onClick={back} />}>
    <div className="lag-role-detail"><h4>공개 멤버 정보</h4><p>플레이어 #{context.memberPlayerId}</p>{!denied ? <p>{({ LEADER: "리더", OFFICER: "운영진", MEMBER: "멤버" } as Record<string, string>)[member.role] ?? consumerLabel(member.role)} · {new Date(member.joinedAt).toLocaleDateString("ko-KR")} 가입</p> : <p>모임에 접근할 수 없습니다. 작성 중인 입력은 이 화면에 남아 있습니다.</p>}
      {loading ? <p role="status">내 인물 정보를 불러오는 중…</p> : null}
      {error ? <p role="alert">{error} <button className="lag-role-button" onClick={() => { setError(null); if (personId && !denied) void readPerson(personId); else void load(); }}>다시 조회</button></p> : null}
      {!personId && mode === "read" && verified ? <><p>아직 내 인물에 연결하지 않았습니다.</p><button className="lag-role-button" disabled={denied} onClick={() => setMode("choose")}>내 인물에 등록</button></> : null}
      {!personId && mode === "choose" ? <div className="lag-role-form"><p>내 인물을 직접 선택하세요. 공개 멤버 목록에는 이름이 없어 새 인물 이름을 직접 입력합니다.</p><button className="lag-role-button" disabled={loading || denied || !verified} onClick={() => void chooseExisting()}>기존 인물 선택</button><button className="lag-role-button" disabled={loading || denied || !verified} onClick={() => { setError(null); setMode("new"); }}>새 인물 등록</button></div> : null}
      {!personId && mode === "existing" ? <form className="lag-role-form" onSubmit={(event) => { event.preventDefault(); void link(); }}><label>내 기존 인물<select className="lag-role-control" required value={selectedPerson} onChange={(event) => setSelectedPerson(event.target.value)}><option value="">인물 선택</option>{persons.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><button className="lag-role-action" disabled={pending || loading || denied || !selectedPerson}>이 인물 연결</button></form> : null}
    </div>
    {!personId && mode === "new" ? <PersonProfileForm pending={pending || denied} error={error} onSave={(body) => void link(body)} /> : null}
    {person ? <><PersonProfileDetail person={person} /><div className="lag-role-detail"><h4>이 역할에서의 관계</h4>{relationView}{context.groupType === "GUILD" ? <GuildMemberNote key={`${context.groupId}:${context.memberPlayerId}:${person.id}`} context={context} personId={person.id} editable={Boolean(canWrite)} onEditingChange={setNoteEditing} closeRequest={noteCloseRequest} onDenied={() => { setDenied(true); onPrivacyLost(); }} /> : null}</div></> : null}
  </PanelFrame></PanelStage>;
}
