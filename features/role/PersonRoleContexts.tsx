"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionPage, PersonDetail } from "@/shared/api/types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { personRoleContexts, type PersonRoleContext } from "./contextApi";
import { updateRoleRelationApi } from "./api";
import { SwipeButton } from "./RecordRow";
import { useRoleQuery } from "./useRoleQuery";

export function RelationNoteFields({ relation }: { relation?: { relationType: string; roleNotes: string | null } }) {
  return <><label>관계 유형<input className="lag-role-control" name="relationType" required defaultValue={relation?.relationType ?? ""} /></label><label>역할 메모<textarea className="lag-role-control" name="roleNotes" rows={4} defaultValue={relation?.roleNotes ?? ""} /></label></>;
}

export default function PersonRoleContexts({ person, onBack }: { person: PersonDetail; onBack: () => void }) {
  const [page, setPage] = useState(0), [history, setHistory] = useState(false), [keyword, setKeyword] = useState(""), [term, setTerm] = useState("");
  const load = useCallback(() => personRoleContexts(person.id, page, history, term), [person.id, page, history, term]);
  const query = useRoleQuery<ConnectionPage<PersonRoleContext> | null>(null, load);
  const [selected, setSelected] = useState<PersonRoleContext | null>(null), [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const generation = useRef(0), busy = useRef(false);
  const compact = useMediaQuery("(max-width: 1199px)");
  useEffect(() => { const ref = generation; return () => { ref.current++; }; }, []);
  const clear = () => { generation.current++; setSelected(null); setEditing(false); setError(null); };
  const editable = selected?.roleStatus === "ACTIVE" && selected.relationStatus === "ACTIVE" && person.status === "ACTIVE";
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected || !editable || busy.current) return;
    const form = new FormData(event.currentTarget), relationType = String(form.get("relationType") ?? "").trim(), roleNotes = String(form.get("roleNotes") ?? "").trim() || null;
    if (!relationType) return;
    const version = generation.current; busy.current = true; setPending(true); setError(null);
    try {
      const saved = await updateRoleRelationApi(selected.roleId, selected.relationId, { relationType, roleNotes });
      if (version !== generation.current) return;
      setSelected({ ...selected, relationType: saved.relationType, roleNotes: saved.roleNotes, version: saved.version }); setEditing(false);
      if (!await query.refresh() && version === generation.current) setError("관계는 저장됐지만 목록을 다시 조회하지 못했습니다. 다시 조회해 주세요.");
    } catch (caught) { if (version === generation.current) setError(caught instanceof Error ? caught.message : "관계를 저장하지 못했습니다."); }
    finally { busy.current = false; setPending(false); }
  };
  return <>
    <PanelStage stageKey="person-role-contexts" parentStageKey="person-detail" inactive={compact && selected !== null}>
      <PanelFrame title={`${person.displayName} · 역할별 관계`} centerSelected centerTargetKey={selected?.relationId} backButton={<BackButton label="인물 상세로" onClick={onBack} />}>
        <div className="lag-role-detail">
          <form className="lag-role-form" onSubmit={(event) => { event.preventDefault(); clear(); setPage(0); setTerm(keyword.trim()); }}><label>역할 이름 검색<input className="lag-role-control" value={keyword} maxLength={120} onChange={(event) => setKeyword(event.target.value)} /></label><button className="lag-role-button">검색</button></form>
          <label><input type="checkbox" checked={history} onChange={(event) => { clear(); setPage(0); setHistory(event.target.checked); }} />보관된 역할·관계 포함</label>
          {query.loading ? <p role="status">역할별 관계를 불러오는 중…</p> : query.error ? <p role="alert">{query.error} <button className="lag-role-button" onClick={() => { clear(); void query.refresh(); }}>다시 조회</button></p> : <>
            {!query.data?.contents.length ? <p>연결된 역할이 없습니다.</p> : null}
            {query.data?.contents.map((row) => <SwipeButton key={row.relationId} className="lag-role-node" aria-pressed={selected?.relationId === row.relationId} onClick={() => { clear(); setSelected(row); }}><span className="lag-role-node-mark" aria-hidden>{row.roleName[0]}</span><span><strong>{row.roleName}</strong><small>{consumerLabel(row.relationType)} · {row.roleStatus === "ACTIVE" && row.relationStatus === "ACTIVE" ? "현재 관계" : "보관된 이력"}</small></span></SwipeButton>)}
          </>}
          <div className="lag-connection-pagination"><button className="lag-role-button" disabled={query.loading || page === 0} onClick={() => { clear(); setPage(page - 1); }}>이전</button><span>{page + 1} / {Math.max(1, query.data?.totalPages ?? 0)}</span><button className="lag-role-button" disabled={query.loading || !query.data || page + 1 >= query.data.totalPages} onClick={() => { clear(); setPage(page + 1); }}>다음</button></div>
        </div>
      </PanelFrame>
    </PanelStage>
    {selected ? <PanelStage stageKey="person-role-context-detail" parentStageKey="person-role-contexts"><PanelFrame title={editing ? "역할 관계 수정" : selected.roleName} backButton={<BackButton label={editing ? "관계 상세로" : "역할별 관계 목록으로"} onClick={editing ? () => setEditing(false) : clear} />}>
      {editing ? <form className="lag-role-form" onSubmit={save}><p>이 역할의 관계와 메모만 변경합니다.</p><RelationNoteFields relation={selected} />{error ? <p role="alert">{error}</p> : null}<button className="lag-role-action" disabled={pending}>관계 저장</button></form> : <article className="lag-role-detail"><h4>이 역할에서의 관계</h4><dl><div className="lag-role-data-row"><dt>관계 유형</dt><dd>{consumerLabel(selected.relationType)}</dd></div><div className="lag-role-data-row"><dt>역할 메모</dt><dd style={{ whiteSpace: "pre-wrap" }}>{selected.roleNotes || "미등록"}</dd></div></dl>{error ? <p role="alert">{error} <button onClick={() => void query.refresh()}>다시 조회</button></p> : null}{editable ? <button className="lag-role-button" onClick={() => { setError(null); setEditing(true); }}>이 역할의 관계 수정</button> : <p>보관된 인물·역할·관계는 조회만 할 수 있습니다.</p>}</article>}
    </PanelFrame></PanelStage> : null}
  </>;
}
