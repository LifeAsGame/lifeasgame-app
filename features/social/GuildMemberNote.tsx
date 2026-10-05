"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { RecordRow } from "@/features/role/RecordRow";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { deleteGuildNote, getGuildNote, getMemberPerson, saveGuildNote, type GuildNote, type MemberContext } from "./memberPersonApi";

export default function GuildMemberNote({ context, personId, editable, onDenied, onEditingChange, closeRequest = 0 }: { onEditingChange?: (editing: boolean) => void; closeRequest?: number; context: MemberContext; personId: number; editable: boolean; onDenied: () => void }) {
  const [note, setNote] = useState<GuildNote | null>(null), [loading, setLoading] = useState(true), [editing, setEditing] = useState(false), [opened, setOpened] = useState(false);
  const [text, setText] = useState(""), [error, setError] = useState<string | null>(null), [conflict, setConflict] = useState(false), [denied, setDenied] = useState(false), [pending, setPending] = useState(false);
  useEffect(() => { onEditingChange?.(editing); }, [editing, onEditingChange]);
  useEffect(() => { setEditing(false); }, [closeRequest]);
  const samePerson = !note || note.personId === personId;
  const mounted = useRef(true), busy = useRef(false);
  const { confirm, dialog } = useSaoConfirm();
  const fail = (caught: unknown) => {
    if (!mounted.current) return;
    if (caught instanceof ApiError && [403, 404].includes(caught.status)) { setDenied(true); setNote(null); onDenied(); }
    if (caught instanceof ApiError && caught.status === 409) setConflict(true);
    setError(caught instanceof ApiError && caught.status === 409 ? "메모가 변경됐습니다. 입력은 보존했습니다. 최신 상태를 확인한 뒤 다시 저장하세요." : caught instanceof Error ? caught.message : "메모를 처리하지 못했습니다.");
  };
  const read = async (preserveDraft = false) => {
    setLoading(true); setError(null);
    try {
      let next: GuildNote | null;
      try { next = await getGuildNote(context.groupId, context.memberPlayerId); }
      catch (caught) {
        if (!(caught instanceof ApiError) || caught.status !== 404) throw caught;
        // An absent note and lost membership both use 404. Verify live access first.
        await getMemberPerson(context); next = null;
      }
      if (!mounted.current) return;
      setNote(next); if (!preserveDraft) setText(next?.text ?? ""); setConflict(false); setDenied(false);
    } catch (caught) { fail(caught); }
    finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => { mounted.current = true; void read(); return () => { mounted.current = false; }; /* identity is keyed by parent */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy.current || conflict || denied || !editable || !samePerson) return;
    busy.current = true; setPending(true); setError(null);
    try { const next = await saveGuildNote(context.groupId, context.memberPlayerId, { personId, text: text.trim(), ...(note ? { version: note.version } : {}) }); if (mounted.current) { setNote(next); setText(next.text ?? ""); setEditing(false); setOpened(true); } }
    catch (caught) { fail(caught); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const remove = async () => {
    if (!note || busy.current || !await confirm("이 길드의 개인 메모만 삭제할까요?")) return;
    busy.current = true; setPending(true);
    try { await deleteGuildNote(note.id); if (mounted.current) { setNote(null); setText(""); setEditing(false); setError(null); } }
    catch (caught) { fail(caught); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  return <section aria-label="길드 개인 메모">{dialog}<p>나에게만 보임 · 이 길드의 개인 메모</p>
    {!samePerson ? <p>이 메모는 이전에 연결한 내 인물 #{note?.personId}의 기록입니다.</p> : null}
    {loading ? <p role="status">메모를 불러오는 중…</p> : null}
    {error ? <p role="alert">{error} <button className="lag-role-button" onClick={() => void read(true)}>{conflict ? "최신 상태 확인" : "메모 다시 조회"}</button></p> : null}
    {editing ? <form className="lag-role-form" onSubmit={save}><label>나만의 메모<textarea className="lag-role-control" rows={5} maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} /></label><p>비워서 저장하면 이 메모만 비워집니다.</p><button className="lag-role-action" disabled={pending || loading || denied || conflict || !editable || !samePerson}>메모 저장</button></form> : !loading && !denied && !error ? <>
      {note ? <RecordRow title="나만의 메모" subtitle="나에게만 보임" selected={opened} onSelect={() => setOpened(true)} onEdit={editable && samePerson ? () => { setText(note.text ?? ""); setEditing(true); } : undefined} onArchive={() => void remove()} archiveLabel="메모 삭제" disabled={pending} /> : <button className="lag-role-button" disabled={!editable} onClick={() => { setText(""); setEditing(true); }}>나만의 메모 쓰기</button>}
      {opened || !note ? <p style={{ whiteSpace: "pre-wrap" }}>{note?.text || "저장된 메모가 없습니다."}</p> : null}
    </> : null}
  </section>;
}
