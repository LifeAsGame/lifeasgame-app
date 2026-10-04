"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { RecordRow, SwipeButton } from "@/features/role/RecordRow";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { groupMe } from "./groups";
import type { GroupPage } from "./groups";
import { cancelGuildEventRsvp, createGuildEvent, finishGuildEvent, guildEvent, guildEventParticipants, guildEventRsvp, guildEvents, updateGuildEvent } from "./guildInsideApi";
import type { GuildEvent, GuildEventInput, GuildEventParticipant } from "./guildInsideApi";

const localDate = (value?: string) => value ? new Date(value).toLocaleString("sv-SE").replace(" ", "T").slice(0, 16) : "";
const errorText = (error: unknown) => error instanceof ApiError ? error.status === 404 ? "행사를 찾을 수 없거나 길드 접근 권한이 없습니다." : error.status === 403 ? "현재 권한으로 이 작업을 할 수 없습니다." : error.status === 409 ? "행사 상태가 바뀌었습니다. 다시 조회해주세요." : error.message : error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";

export default function GuildEventPanels({ guildId, creating, onBack }: { guildId: number; creating: boolean; onBack: () => void }) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const { confirm, dialog } = useSaoConfirm();
  const [events, setEvents] = useState<GuildEvent[]>([]), [page, setPage] = useState(0), [totalPages, setTotalPages] = useState(0), [listLoading, setListLoading] = useState(true), [listError, setListError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(creating), [editing, setEditing] = useState(false), [selectedId, setSelectedId] = useState<number | null>(null), [detail, setDetail] = useState<GuildEvent | null>(null);
  const [leader, setLeader] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [participants, setParticipants] = useState<GroupPage<GuildEventParticipant> | null>(null), [participantPage, setParticipantPage] = useState(0), [participantsError, setParticipantsError] = useState<string | null>(null);
  const listSeq = useRef(0), detailSeq = useRef(0), participantSeq = useRef(0), lock = useRef(false);
  const loadList = useCallback(async () => {
    const seq = ++listSeq.current; setListLoading(true); setListError(null);
    try { const [me, result] = await Promise.all([groupMe("guilds", guildId), guildEvents(guildId, page)]); if (seq === listSeq.current) { setLeader(me.myRole === "LEADER"); setEvents(result.contents); setTotalPages(result.totalPages); } }
    catch (caught) { if (seq === listSeq.current) { setEvents([]); setListError(errorText(caught)); } }
    finally { if (seq === listSeq.current) setListLoading(false); }
  }, [guildId, page]);
  useEffect(() => { const listCounter = listSeq, detailCounter = detailSeq, participantCounter = participantSeq; void loadList(); return () => { listCounter.current++; detailCounter.current++; participantCounter.current++; }; }, [loadList]);
  useEffect(() => { setFormOpen(creating); setSelectedId(null); setDetail(null); setEditing(false); }, [creating]);
  const close = () => { detailSeq.current++; participantSeq.current++; setSelectedId(null); setDetail(null); setEditing(false); setError(null); };
  const open = async (id: number, edit = false) => {
    const seq = ++detailSeq.current; setSelectedId(id); setDetail(null); setParticipants(null); setParticipantPage(0); setEditing(false); setError(null); setLoading(true);
    try {
      const [me, result] = await Promise.all([groupMe("guilds", guildId), guildEvent(guildId, id)]);
      if (seq === detailSeq.current) { setLeader(me.myRole === "LEADER"); setDetail(result); setEditing(edit && me.myRole === "LEADER" && result.status === "PLANNED"); }
    } catch (caught) { if (seq === detailSeq.current) setError(errorText(caught)); }
    finally { if (seq === detailSeq.current) setLoading(false); }
  };
  const loadParticipants = async (id: number, index = 0) => {
    const seq = ++participantSeq.current; setParticipants(null); setParticipantsError(null);
    try { const result = await guildEventParticipants(guildId, id, index); if (seq === participantSeq.current) setParticipants(result); }
    catch (caught) { if (seq === participantSeq.current) setParticipantsError(errorText(caught)); }
  };
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current) return;
    const data = new FormData(event.currentTarget);
    const startsAt = String(data.get("startsAt") ?? ""), endsAt = String(data.get("endsAt") ?? ""), startTime = Date.parse(startsAt), endTime = Date.parse(endsAt);
    const title = String(data.get("title") ?? "").trim(), sharedDescription = String(data.get("sharedDescription") ?? "").trim() || null, location = String(data.get("location") ?? "").trim() || null;
    if (!title || title.length > 120 || (sharedDescription?.length ?? 0) > 2000 || (location?.length ?? 0) > 200 || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) { setError("제목·시간·설명·장소를 확인해주세요. 종료는 시작 이후여야 합니다."); return; }
    const body: GuildEventInput = { title, sharedDescription, startsAt: new Date(startTime).toISOString(), endsAt: new Date(endTime).toISOString(), location };
    const seq = detailSeq.current; lock.current = true; setBusy(true); setError(null);
    try {
      if ((await groupMe("guilds", guildId)).myRole !== "LEADER") { setLeader(false); setEditing(false); setError("현재 리더 권한이 없습니다."); return; }
      const result = editing && selectedId !== null ? await updateGuildEvent(guildId, selectedId, body) : await createGuildEvent(guildId, body);
      await loadList(); if (seq === detailSeq.current) { setFormOpen(false); await open(result.id); }
    } catch (caught) { if (seq === detailSeq.current) setError(errorText(caught)); }
    finally { lock.current = false; setBusy(false); }
  };
  const command = async (id: number, action: "complete" | "cancel" | "join" | "leave") => {
    if (lock.current) return;
    const seq = detailSeq.current;
    if ((action === "complete" || action === "cancel") && !await confirm(`행사를 ${action === "complete" ? "완료" : "취소"}할까요?`)) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const me = await groupMe("guilds", guildId);
      if (!me.myRole || (action === "complete" || action === "cancel") && me.myRole !== "LEADER") { setLeader(false); setError("현재 길드 권한이 없습니다."); return; }
      if (action === "join") await guildEventRsvp(guildId, id);
      else if (action === "leave") await cancelGuildEventRsvp(guildId, id);
      else await finishGuildEvent(guildId, id, action);
      await loadList(); if (seq === detailSeq.current && selectedId === id) await open(id);
    } catch (caught) { if (seq === detailSeq.current) setError(errorText(caught)); await loadList(); }
    finally { lock.current = false; setBusy(false); }
  };
  const form = (record?: GuildEvent) => <form className="lag-role-form" onSubmit={(event) => void save(event)}><label>행사 제목<input className="lag-role-control" name="title" required maxLength={120} defaultValue={record?.title ?? ""} /></label><label>공유 설명<textarea className="lag-role-control" name="sharedDescription" rows={3} maxLength={2000} defaultValue={record?.sharedDescription ?? ""} /></label><label>시작<input className="lag-role-control" name="startsAt" type="datetime-local" min="1000-01-01T00:00" required defaultValue={localDate(record?.startsAt)} /></label><label>종료<input className="lag-role-control" name="endsAt" type="datetime-local" min="1000-01-01T00:00" required defaultValue={localDate(record?.endsAt)} /></label><label>장소<input className="lag-role-control" name="location" maxLength={200} defaultValue={record?.location ?? ""} /></label><p>길드 공유 행사이며 개인 역할 일정과 별개입니다.</p>{error ? <p role="alert">{error}</p> : null}<button className="lag-role-action" type="submit" disabled={busy}>{busy ? "저장 중…" : "행사 저장"}</button></form>;
  return <>{dialog}<PanelStage stageKey="guild-events-list" instant inactive={compact && selectedId !== null}><PanelFrame title={formOpen ? "새 공유 행사" : "길드 행사"} backButton={<BackButton label={formOpen ? "행사 목록으로" : "길드 상세로"} onClick={formOpen ? () => { setFormOpen(false); setError(null); } : onBack} />}><CreateSlot creating={formOpen} showCancel={false} pending={busy} onClose={() => setFormOpen(false)} list={<div className="lag-role-detail lag-group-main">{listLoading ? <p role="status">행사를 불러오는 중…</p> : null}{listError ? <p role="alert">{listError} <button type="button" onClick={() => void loadList()}>다시 조회</button></p> : null}{!listLoading && !listError && !events.length ? <p>행사가 없습니다.</p> : null}{events.map((item) => item.status === "PLANNED" && leader ? <RecordRow key={item.id} title={item.title} subtitle={new Date(item.startsAt).toLocaleString("ko-KR")} selected={selectedId === item.id} disabled={busy} onSelect={() => void open(item.id)} onEdit={() => void open(item.id, true)} onArchive={() => void command(item.id, "cancel")} archiveLabel="행사 취소" /> : <SwipeButton key={item.id} className="lag-role-node" aria-pressed={selectedId === item.id} onClick={() => void open(item.id)}><span className="lag-role-node-mark" aria-hidden>{item.status === "COMPLETED" ? "✓" : item.status === "CANCELED" ? "×" : "행"}</span><span><strong>{item.title}</strong><small>{item.status === "PLANNED" ? new Date(item.startsAt).toLocaleString("ko-KR") : item.status === "COMPLETED" ? "완료" : "취소"}</small></span><span aria-hidden>→</span></SwipeButton>)}<div className="lag-connection-pagination"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span>{page + 1} / {Math.max(1, totalPages)}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>다음</button></div></div>}>{form()}</CreateSlot></PanelFrame></PanelStage>
    {selectedId !== null ? <PanelStage stageKey="guild-events-detail" instant><PanelFrame title={editing ? "행사 수정" : "행사 상세"} backButton={<BackButton label={editing ? "행사 상세로" : "행사 목록으로"} onClick={editing ? () => { setEditing(false); setError(null); } : close} />}>{loading ? <p role="status">행사를 불러오는 중…</p> : null}{error && !detail ? <p role="alert">{error} <button type="button" onClick={() => void open(selectedId)}>다시 조회</button></p> : null}{detail && editing ? form(detail) : detail ? <article className="lag-role-detail lag-group-main"><h4>{detail.title}</h4><p>{detail.sharedDescription || "설명 없음"}</p><dl><div className="lag-role-data-row"><dt>상태</dt><dd>{detail.status === "PLANNED" ? "예정" : detail.status === "COMPLETED" ? "완료" : "취소"}</dd></div><div className="lag-role-data-row"><dt>시작</dt><dd>{new Date(detail.startsAt).toLocaleString("ko-KR")}</dd></div><div className="lag-role-data-row"><dt>종료</dt><dd>{new Date(detail.endsAt).toLocaleString("ko-KR")}</dd></div><div className="lag-role-data-row"><dt>장소</dt><dd>{detail.location || "미정"}</dd></div><div className="lag-role-data-row"><dt>참가</dt><dd>{detail.participantCount}명</dd></div></dl>{detail.status === "PLANNED" ? <div className="lag-role-actions">{leader ? <button type="button" className="lag-role-action" disabled={busy} onClick={() => void command(detail.id, "complete")}>행사 완료</button> : null}<button type="button" className="lag-role-button" disabled={busy} onClick={() => void command(detail.id, detail.myRsvp ? "leave" : "join")}>{detail.myRsvp ? "참가 취소" : "참가"}</button></div> : null}<button type="button" className="lag-role-button" onClick={() => { setParticipantPage(0); void loadParticipants(detail.id); }}>참가자 보기</button>{participantsError ? <p role="alert">{participantsError} <button type="button" onClick={() => void loadParticipants(detail.id, participantPage)}>다시 조회</button></p> : null}{participants ? <><h5 className="lag-role-subheading">참가자</h5>{participants.contents.length ? participants.contents.map((item) => <div className="lag-group-member" key={item.playerId}>플레이어 #{item.playerId} · {new Date(item.joinedAt).toLocaleString("ko-KR")}</div>) : <p>참가자가 없습니다.</p>}<div className="lag-connection-pagination"><button type="button" disabled={participantPage === 0} onClick={() => { setParticipantPage(participantPage - 1); void loadParticipants(detail.id, participantPage - 1); }}>이전</button><span>{participantPage + 1} / {Math.max(1, participants.totalPages)}</span><button type="button" disabled={participantPage + 1 >= participants.totalPages} onClick={() => { setParticipantPage(participantPage + 1); void loadParticipants(detail.id, participantPage + 1); }}>다음</button></div></> : null}{error ? <p role="alert">{error}</p> : null}</article> : null}</PanelFrame></PanelStage> : null}</>;
}
