"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { ConnectionPage } from "@/shared/api/types";
import { RecordRow, SwipeButton } from "@/features/role/RecordRow";
import { rolePartyMembers } from "@/features/role/roleParties";
import { groupMembers } from "./groups";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { activities, activity, activityEditors, activityParticipants, activityRsvp, cancelActivityRsvp, createActivity, finishActivity, grantActivityEditor, revokeActivityEditor, updateActivity } from "./groupActivitiesApi";
import type { ActivityEditor, ActivityFields, ActivityGroup, ActivityPage, ActivityParticipant, GroupActivity } from "./groupActivitiesApi";

const errorText = (error: unknown) => error instanceof ApiError ? error.status === 409 ? "다른 변경이 먼저 저장됐습니다. 초안은 유지했습니다. 최신 내용을 확인하고 다시 저장해주세요." : error.status === 403 ? "현재 활동 편집 권한이 없습니다." : error.status === 404 ? "활동 또는 모임 접근 권한이 없습니다." : error.message : error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";
const localDate = (value?: string) => value ? new Date(value).toLocaleString("sv-SE").replace(" ", "T").slice(0, 16) : "";
const statusName = { PLANNED: "예정", COMPLETED: "완료", CANCELED: "취소" };
const label = (type: ActivityGroup) => type === "PARTY" ? "파티" : "역할 소모임";

export default function GroupActivityPanels({ groupType, groupId, parentStageKey, selectedActivityId, detailOnly = false, creating = false, onBack, onChanged, onAccessLost }: {
  groupType: ActivityGroup; groupId: number; parentStageKey: string; selectedActivityId?: number; detailOnly?: boolean; creating?: boolean;
  onBack: () => void; onChanged?: () => void; onAccessLost?: () => void;
}) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const { confirm, dialog } = useSaoConfirm();
  const [list, setList] = useState<ActivityPage | null>(null), [page, setPage] = useState(0), [listError, setListError] = useState<string | null>(null), [listLoading, setListLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false), [createKey, setCreateKey] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null), [detail, setDetail] = useState<GroupActivity | null>(null), [detailLoading, setDetailLoading] = useState(false), [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const [participants, setParticipants] = useState<ConnectionPage<ActivityParticipant> | null>(null), [participantPage, setParticipantPage] = useState(0);
  const [editorsOpen, setEditorsOpen] = useState(false), [editors, setEditors] = useState<ConnectionPage<ActivityEditor> | null>(null), [members, setMembers] = useState<{ playerId: number }[]>([]), [memberPage, setMemberPage] = useState(0), [memberPages, setMemberPages] = useState(0);
  const listSeq = useRef(0), detailSeq = useRef(0), childSeq = useRef(0), lock = useRef(false), selectedRef = useRef<number | null>(null), createRequested = useRef(creating);
  selectedRef.current = selectedId;
  const accessLost = useRef(onAccessLost); accessLost.current = onAccessLost;
  const loadList = useCallback(async () => {
    if (detailOnly) return;
    const seq = ++listSeq.current; setListLoading(true); setListError(null); setList(null);
    try { const next = await activities(groupType, groupId, page); if (seq === listSeq.current) { setList(next); if (createRequested.current) { createRequested.current = false; setCreateOpen(next.capabilities.canCreate); } else if (!next.capabilities.canCreate) setCreateOpen(false); if (!next.capabilities.canManageEditors) setEditorsOpen(false); } }
    catch (caught) { if (seq === listSeq.current) { setListError(errorText(caught)); if (caught instanceof ApiError && [403, 404].includes(caught.status)) accessLost.current?.(); } }
    finally { if (seq === listSeq.current) setListLoading(false); }
  }, [detailOnly, groupType, groupId, page]);
  const open = useCallback(async (id: number) => {
    const seq = ++detailSeq.current; setSelectedId(id); setDetail(null); setError(null); setEditing(false); setEditorsOpen(false); setParticipants(null); setDetailLoading(true);
    try { const next = await activity(groupType, groupId, id); if (seq === detailSeq.current) { setDetail(next); return next; } }
    catch (caught) { if (seq === detailSeq.current) { setError(errorText(caught)); if (caught instanceof ApiError && [403, 404].includes(caught.status)) accessLost.current?.(); } }
    finally { if (seq === detailSeq.current) setDetailLoading(false); }
    return null;
  }, [groupType, groupId]);
  useEffect(() => { const counter = listSeq; void loadList(); return () => { counter.current++; }; }, [loadList]);
  useEffect(() => { const detailCounter = detailSeq, childCounter = childSeq; if (detailOnly && selectedActivityId != null) void open(selectedActivityId); const refresh = () => { if (detailOnly && selectedActivityId != null) void open(selectedActivityId); else { void loadList(); if (selectedRef.current != null) void open(selectedRef.current); } }; window.addEventListener("focus", refresh); return () => { window.removeEventListener("focus", refresh); detailCounter.current++; childCounter.current++; }; }, [detailOnly, selectedActivityId, open, loadList]);
  const close = () => { detailSeq.current++; childSeq.current++; setSelectedId(null); setDetail(null); setEditing(false); setEditorsOpen(false); setError(null); requestStageFocus("group-activities-list", "back"); };
  const refreshDetail = async (id: number, seq: number, keepDraft = false) => {
    try { const latest = await activity(groupType, groupId, id); if (seq === detailSeq.current) { setDetail(latest); if (!keepDraft) setEditing(false); } }
    catch (caught) { if (seq === detailSeq.current) { setError(errorText(caught)); if (caught instanceof ApiError && [403, 404].includes(caught.status)) { setDetail(null); accessLost.current?.(); } } }
  };
  const fields = (form: FormData): ActivityFields => ({ title: String(form.get("title") ?? "").trim(), sharedDescription: String(form.get("sharedDescription") ?? "").trim() || null, location: String(form.get("location") ?? "").trim() || null, startsAt: new Date(String(form.get("startsAt"))).toISOString(), endsAt: new Date(String(form.get("endsAt"))).toISOString() });
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current) return;
    const data = new FormData(event.currentTarget), start = Date.parse(String(data.get("startsAt"))), end = Date.parse(String(data.get("endsAt")));
    const title = String(data.get("title") ?? "").trim(), description = String(data.get("sharedDescription") ?? "").trim(), location = String(data.get("location") ?? "").trim();
    if (!title || title.length > 120 || description.length > 2000 || location.length > 200 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) { setError("제목·설명·장소·시간을 확인해주세요. 종료는 시작 이후여야 합니다."); return; }
    const body = fields(data), seq = detailSeq.current;
    lock.current = true; setPending(true); setError(null);
    try {
      const key = createKey ?? crypto.randomUUID();
      if (!editing) setCreateKey(key);
      const saved = editing && detail ? await updateActivity(groupType, groupId, detail.id, body, detail.version) : await createActivity(groupType, groupId, body, key);
      if (seq === detailSeq.current) { setCreateKey(null); setCreateOpen(false); setEditing(false); await loadList(); onChanged?.(); await open(saved.id); }
    } catch (caught) {
      if (seq === detailSeq.current) { setError(errorText(caught)); if (caught instanceof ApiError && [403, 409].includes(caught.status) && detail) void refreshDetail(detail.id, seq, caught.status === 409); if (caught instanceof ApiError && caught.status === 404) { setDetail(null); accessLost.current?.(); } }
    } finally { lock.current = false; setPending(false); }
  };
  const command = async (action: "complete" | "cancel" | "join" | "leave", record = detail) => {
    if (!record || lock.current) return;
    const id = record.id, seq = detailSeq.current;
    if ((action === "complete" || action === "cancel") && !await confirm(`활동을 ${action === "complete" ? "완료" : "취소"}할까요?`)) return;
    if (seq !== detailSeq.current) return;
    lock.current = true; setPending(true); setError(null);
    try {
      if (action === "join") await activityRsvp(groupType, groupId, id);
      else if (action === "leave") await cancelActivityRsvp(groupType, groupId, id);
      else await finishActivity(groupType, groupId, id, action, record.version);
      await loadList(); onChanged?.(); if (seq === detailSeq.current && selectedId === id) await open(id);
    } catch (caught) {
      if (seq === detailSeq.current) { setError(errorText(caught)); if (caught instanceof ApiError && [403, 409].includes(caught.status)) void refreshDetail(id, seq); if (caught instanceof ApiError && caught.status === 404) { setDetail(null); accessLost.current?.(); } }
    } finally { lock.current = false; setPending(false); }
  };
  const loadParticipants = async (index = 0) => { if (!detail) return; const seq = ++childSeq.current; setParticipants(null); setParticipantPage(index); try { const next = await activityParticipants(groupType, groupId, detail.id, index); if (seq === childSeq.current) setParticipants(next); } catch (caught) { if (seq === childSeq.current) setError(errorText(caught)); } };
  const loadEditors = async (nextMemberPage = 0) => {
    const seq = ++childSeq.current; setEditors(null); setMemberPage(nextMemberPage); setError(null);
    try { const [first, roster] = await Promise.all([activityEditors(groupType, groupId), groupType === "PARTY" ? groupMembers("parties", groupId, nextMemberPage) : rolePartyMembers(groupId, nextMemberPage)]); const all = [...first.contents]; for (let index = 1; index < first.totalPages; index++) all.push(...(await activityEditors(groupType, groupId, index)).contents); if (seq === childSeq.current) { setEditors({ ...first, contents: all }); setMembers(roster.contents.filter((member) => member.role !== "LEADER")); setMemberPages(roster.totalPages); } }
    catch (caught) { if (seq === childSeq.current) { setError(errorText(caught)); if (caught instanceof ApiError && caught.status === 403) { setEditorsOpen(false); accessLost.current?.(); } if (caught instanceof ApiError && caught.status === 404) { setDetail(null); accessLost.current?.(); } } }
  };
  const changeEditor = async (playerId: number, granted: boolean) => { if (lock.current) return; lock.current = true; setPending(true); setError(null); try { if (granted) await revokeActivityEditor(groupType, groupId, playerId); else await grantActivityEditor(groupType, groupId, playerId); await loadEditors(memberPage); } catch (caught) { setError(errorText(caught)); if (caught instanceof ApiError && caught.status === 403) { setEditorsOpen(false); accessLost.current?.(); } } finally { lock.current = false; setPending(false); } };
  const form = (record?: GroupActivity) => <form className="lag-role-form" onSubmit={(event) => void save(event)}><label>활동 제목<input className="lag-role-control" name="title" required maxLength={120} autoFocus defaultValue={record?.title ?? ""} /></label><label>만남 설명<textarea className="lag-role-control" name="sharedDescription" rows={3} maxLength={2000} defaultValue={record?.sharedDescription ?? ""} /></label><label>시작<input className="lag-role-control" name="startsAt" type="datetime-local" min="1000-01-01T00:00" required defaultValue={localDate(record?.startsAt)} /></label><label>종료<input className="lag-role-control" name="endsAt" type="datetime-local" min="1000-01-01T00:00" required defaultValue={localDate(record?.endsAt)} /></label><label>장소<input className="lag-role-control" name="location" maxLength={200} defaultValue={record?.location ?? ""} /></label>{error ? <p role="alert">{error}</p> : null}<button className="lag-role-action" type="submit" disabled={pending}>{pending ? "저장 중…" : record ? "변경 저장" : "활동 저장"}</button></form>;
  return <div className="lag-panel-rail">{dialog}
    {!detailOnly ? <PanelStage stageKey="group-activities-list" parentStageKey={parentStageKey} instant inactive={compact && (selectedId !== null || editorsOpen)}><PanelFrame title={createOpen ? "새 활동" : `${label(groupType)} 활동`} backButton={<BackButton label={createOpen ? "활동 목록으로" : `${label(groupType)} 상세로`} onClick={createOpen ? () => { setCreateOpen(false); setError(null); setCreateKey(null); } : onBack} />}><CreateSlot creating={createOpen} showCancel={false} pending={pending} onClose={() => { setCreateOpen(false); setCreateKey(null); }} list={<div className="lag-role-detail">
      {listLoading ? <p role="status">활동을 불러오는 중…</p> : null}{listError ? <p role="alert">{listError} <button type="button" onClick={() => void loadList()}>다시 조회</button></p> : null}{!listLoading && !listError && !list?.contents.length ? <p>활동이 없습니다.</p> : null}
      {list?.contents.map((item) => item.capabilities.canEdit && item.status === "PLANNED" ? <RecordRow key={item.id} title={item.title} subtitle={`${new Date(item.startsAt).toLocaleString("ko-KR")} · ${statusName[item.status]}`} selected={selectedId === item.id} disabled={pending} onSelect={() => void open(item.id)} onEdit={() => void open(item.id).then((next) => { if (next?.capabilities.canEdit) setEditing(true); })} onArchive={() => void command("cancel", item)} archiveLabel="활동 취소" /> : <SwipeButton key={item.id} className="lag-role-node" aria-pressed={selectedId === item.id} onClick={() => void open(item.id)}><span className="lag-role-node-mark" aria-hidden>활</span><span><strong>{item.title}</strong><small>{new Date(item.startsAt).toLocaleString("ko-KR")} · {statusName[item.status]}</small></span></SwipeButton>)}
      <div className="lag-connection-pagination"><button type="button" disabled={page === 0} onClick={() => { close(); setPage(page - 1); }}>이전</button><span>{page + 1} / {Math.max(1, list?.totalPages ?? 0)}</span><button type="button" disabled={!list || page >= 1000 || page + 1 >= list.totalPages} onClick={() => { close(); setPage(page + 1); }}>다음</button></div>
      {list?.capabilities.canManageEditors ? <button type="button" className="lag-role-button" onClick={() => { setEditorsOpen(true); void loadEditors(); }}>편집자</button> : null}
    </div>}>{form()}</CreateSlot></PanelFrame></PanelStage> : null}
    {selectedId !== null ? <PanelStage stageKey="group-activity-detail" parentStageKey={detailOnly ? parentStageKey : "group-activities-list"} instant inactive={compact && editorsOpen}><PanelFrame title={editing ? "활동 수정" : "활동 상세"} backButton={<BackButton label={editing ? "활동 상세로" : "활동 목록으로"} onClick={editing ? () => { setEditing(false); setError(null); } : detailOnly ? onBack : close} />}>
      {detailLoading ? <p role="status">활동을 불러오는 중…</p> : null}{error && !detail ? <p role="alert">{error} <button type="button" onClick={() => void open(selectedId)}>다시 조회</button></p> : null}
      {detail && editing ? form(detail) : detail ? <article className="lag-role-detail"><h4>{detail.title}</h4><p>{detail.sharedDescription || "설명 없음"}</p><dl><div className="lag-role-data-row"><dt>상태</dt><dd>{statusName[detail.status]}</dd></div><div className="lag-role-data-row"><dt>시작</dt><dd>{new Date(detail.startsAt).toLocaleString("ko-KR")}</dd></div><div className="lag-role-data-row"><dt>종료</dt><dd>{new Date(detail.endsAt).toLocaleString("ko-KR")}</dd></div><div className="lag-role-data-row"><dt>장소</dt><dd>{detail.location || "미정"}</dd></div><div className="lag-role-data-row"><dt>참가</dt><dd>{detail.participantCount}명</dd></div></dl>{error ? <p role="alert">{error}</p> : null}<div className="lag-role-actions">{detail.status === "PLANNED" && detail.capabilities.canEdit ? <><button type="button" className="lag-role-button" onClick={() => setEditing(true)}>활동 수정</button><button type="button" className="lag-role-action" disabled={pending} onClick={() => void command("complete")}>활동 완료</button><button type="button" className="lag-role-button" disabled={pending} onClick={() => void command("cancel")}>활동 취소</button></> : null}{detail.status === "PLANNED" && detail.capabilities.canRsvp ? <button type="button" className="lag-role-button" disabled={pending} onClick={() => void command(detail.myRsvp ? "leave" : "join")}>{detail.myRsvp ? "참가 취소" : "참가"}</button> : null}<button type="button" className="lag-role-button" onClick={() => void loadParticipants()}>참가자</button></div>{participants ? <><h5 className="lag-role-subheading">참가자</h5>{participants.contents.map((item) => <div className="lag-group-member" key={item.playerId}>플레이어 #{item.playerId}</div>)}<div className="lag-connection-pagination"><button type="button" disabled={participantPage === 0} onClick={() => void loadParticipants(participantPage - 1)}>이전</button><span>{participantPage + 1} / {Math.max(1, participants.totalPages)}</span><button type="button" disabled={participantPage + 1 >= participants.totalPages} onClick={() => void loadParticipants(participantPage + 1)}>다음</button></div></> : null}</article> : null}
    </PanelFrame></PanelStage> : null}
    {editorsOpen ? <PanelStage stageKey="group-activity-editors" parentStageKey="group-activities-list" instant><PanelFrame title="활동 편집자" backButton={<BackButton label="활동 목록으로" onClick={() => { childSeq.current++; setEditorsOpen(false); requestStageFocus("group-activities-list", "back"); }} />}><div className="lag-role-detail">{error ? <p role="alert">{error}</p> : null}{members.map((member) => { const granted = editors?.contents.some((item) => item.playerId === member.playerId) ?? false; return <div className="lag-group-member" key={member.playerId}><span>플레이어 #{member.playerId}</span><button type="button" className="lag-role-button" disabled={pending} onClick={() => void changeEditor(member.playerId, granted)}>{granted ? "지정 해제" : "편집자로 지정"}</button></div>; })}<div className="lag-connection-pagination"><button type="button" disabled={memberPage === 0} onClick={() => void loadEditors(memberPage - 1)}>이전</button><span>{memberPage + 1} / {Math.max(1, memberPages)}</span><button type="button" disabled={memberPage + 1 >= memberPages} onClick={() => void loadEditors(memberPage + 1)}>다음</button></div></div></PanelFrame></PanelStage> : null}
  </div>;
}
