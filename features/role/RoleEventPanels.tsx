"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonDetail, RoleEventDetail, RoleEventInput } from "@/shared/api/types";
import { ApiError } from "@/shared/api/client";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { RecordRow, SwipeButton } from "./RecordRow";
import { addRoleEventParticipantApi, cancelRoleEventApi, completeRoleEventApi, createRoleEventApi, getRoleEventApi, listPersonsApi, listRoleEventsApi, removeRoleEventParticipantApi, updateRoleEventApi } from "./api";

type Mode = "list" | "create" | "detail" | "edit";
const localDate = (value: string | null) => value ? new Date(value).toLocaleString("sv-SE").replace(" ", "T").slice(0, 16) : "";
const instant = (value: FormDataEntryValue | null) => value ? new Date(String(value)).toISOString() : null;
const message = (error: unknown, fallback: string) => error instanceof ApiError && error.code === "ROL-403-EVENT-COMMAND-GATED" ? "현재 서버에서 일정 변경이 허용되지 않습니다." : error instanceof Error ? error.message : fallback;

export default function RoleEventPanels({ roleId, roleName, createRequest, reentryRequest, onBack }: { roleId: number; roleName: string; createRequest: number; reentryRequest: number; onBack: () => void }) {
  const { confirm, dialog } = useSaoConfirm();
  const compact = useMediaQuery("(max-width: 1199px)");
  const [events, setEvents] = useState<RoleEventDetail[]>([]), [listError, setListError] = useState<string | null>(null), [listLoading, setListLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list"), [selectedId, setSelectedId] = useState<number | null>(null), [detail, setDetail] = useState<RoleEventDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null), [loading, setLoading] = useState(false), [pending, setPending] = useState(false);
  const [persons, setPersons] = useState<PersonDetail[]>([]), [participantType, setParticipantType] = useState<"PERSON" | "SERVICE_USER">("PERSON");
  const listSeq = useRef(0), detailSeq = useRef(0), busy = useRef(false);
  const load = useCallback(async () => { const seq = ++listSeq.current; setListLoading(true); setListError(null); try { const next = await listRoleEventsApi(roleId); if (seq === listSeq.current) setEvents(next); } catch (error) { if (seq === listSeq.current) setListError(error instanceof Error ? error.message : "일정을 불러오지 못했습니다."); } finally { if (seq === listSeq.current) setListLoading(false); } }, [roleId]);
  useEffect(() => { const listCounter = listSeq, detailCounter = detailSeq; void load(); return () => { listCounter.current++; detailCounter.current++; }; }, [load]);
  useEffect(() => { if (createRequest || reentryRequest) { detailSeq.current++; setMode(createRequest ? "create" : "list"); setDetail(null); setSelectedId(null); setDetailError(null); } }, [createRequest, reentryRequest]);
  useEffect(() => { void listPersonsApi().then(setPersons).catch(() => setPersons([])); }, []);
  const close = () => { detailSeq.current++; setMode("list"); setDetail(null); setSelectedId(null); setDetailError(null); requestStageFocus("role-detail", "back"); };
  const select = async (id: number, nextMode: Mode = "detail") => { const seq = ++detailSeq.current; setMode(nextMode); setSelectedId(id); setDetail(null); setDetailError(null); setLoading(true); try { const next = await getRoleEventApi(roleId, id); if (seq === detailSeq.current) setDetail(next); } catch (error) { if (seq === detailSeq.current) setDetailError(error instanceof Error ? error.message : "일정 상세를 불러오지 못했습니다."); } finally { if (seq === detailSeq.current) setLoading(false); } };
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy.current) return;
    const form = new FormData(event.currentTarget);
    const body: RoleEventInput = { title: String(form.get("title") ?? "").trim(), description: String(form.get("description") ?? "").trim() || null, startsAt: instant(form.get("startsAt")), endsAt: instant(form.get("endsAt")) };
    if (!body.title || body.title.length > 120 || body.description && body.description.length > 1000 || body.startsAt && body.endsAt && body.startsAt > body.endsAt) { setDetailError("제목·설명 길이와 시작·종료 시간을 확인해주세요."); return; }
    const seq = detailSeq.current;
    busy.current = true; setPending(true); setDetailError(null);
    try { const saved = mode === "edit" && selectedId !== null ? await updateRoleEventApi(roleId, selectedId, body) : await createRoleEventApi(roleId, body); await load(); if (seq === detailSeq.current) await select(saved.id); }
    catch (error) { if (seq === detailSeq.current) setDetailError(message(error, "일정을 저장하지 못했습니다.")); }
    finally { busy.current = false; setPending(false); }
  };
  const transition = async (action: "complete" | "cancel", id: number) => {
    if (busy.current) return;
    const seq = detailSeq.current;
    if (!await confirm(`이 일정을 ${action === "complete" ? "완료" : "취소"}할까요?`) || busy.current || seq !== detailSeq.current) return;
    busy.current = true; setPending(true); setDetailError(null);
    try { const next = action === "complete" ? await completeRoleEventApi(roleId, id) : await cancelRoleEventApi(roleId, id); if (seq === detailSeq.current) setDetail(next); await load(); }
    catch (error) { if (seq === detailSeq.current) setDetailError(message(error, "상태를 변경하지 못했습니다.")); }
    finally { busy.current = false; setPending(false); }
  };
  const addParticipant = async (event: React.SubmitEvent<HTMLFormElement>) => { event.preventDefault(); if (!detail || busy.current) return; const form = new FormData(event.currentTarget); const participantId = Number(form.get("participantId")); if (!Number.isInteger(participantId) || participantId < 1) { setDetailError("참가자 ID를 확인해주세요."); return; } busy.current = true; setPending(true); setDetailError(null); try { await addRoleEventParticipantApi(roleId, detail.id, { participantType, participantId }); await select(detail.id); } catch (error) { setDetailError(error instanceof Error ? error.message : "참가자를 추가하지 못했습니다."); } finally { busy.current = false; setPending(false); } };
  const removeParticipant = async (linkId: number) => { if (!detail || busy.current || !await confirm("이 일정에서 참가자를 제외할까요?")) return; busy.current = true; setPending(true); setDetailError(null); try { await removeRoleEventParticipantApi(roleId, detail.id, linkId); await select(detail.id); } catch (error) { setDetailError(error instanceof Error ? error.message : "참가자를 제외하지 못했습니다."); } finally { busy.current = false; setPending(false); } };
  const form = (record?: RoleEventDetail) => <form key={record?.id ?? "new"} className="lag-role-form" onSubmit={(event) => void save(event)}><label>제목<input className="lag-role-control" name="title" required maxLength={120} autoFocus defaultValue={record?.title ?? ""} /></label><label>설명<textarea className="lag-role-control" name="description" maxLength={1000} rows={3} defaultValue={record?.description ?? ""} /></label><label>시작<input className="lag-role-control" name="startsAt" type="datetime-local" defaultValue={localDate(record?.startsAt ?? null)} /></label><label>종료<input className="lag-role-control" name="endsAt" type="datetime-local" defaultValue={localDate(record?.endsAt ?? null)} /></label>{detailError ? <p role="alert">{detailError}</p> : null}<button type="submit" className="lag-role-action" disabled={pending}>{pending ? "저장 중…" : "일정 저장"}</button></form>;
  return <div className="lag-panel-rail lag-role-events">{dialog}
    <PanelStage stageKey="role-detail" instant inactive={compact && (mode === "detail" || mode === "edit")}><PanelFrame title={mode === "create" ? "새 일정" : `${roleName} · 일정`} backButton={<BackButton label={mode === "create" ? "일정 목록으로" : `역할 ${roleName}로`} onClick={mode === "create" ? close : onBack} />}>
      <CreateSlot creating={mode === "create"} showCancel={false} pending={pending} onClose={close} list={<div className="lag-role-detail">
        {listLoading ? <p role="status">일정을 불러오는 중…</p> : null}{listError ? <p role="alert">{listError} <button type="button" onClick={() => void load()}>다시 조회</button></p> : null}{mode === "list" && detailError ? <p role="alert">{detailError}</p> : null}{!listLoading && !listError && !events.length ? <p>이 역할의 일정이 없습니다.</p> : null}
        {events.map((item) => item.status === "PLANNED" ? <div key={item.id} data-event-id={item.id}><RecordRow title={item.title} subtitle={item.startsAt ? new Date(item.startsAt).toLocaleString("ko-KR") : "시간 미등록"} selected={selectedId === item.id} disabled={pending} onSelect={() => void select(item.id)} onEdit={() => void select(item.id, "edit")} onArchive={() => void transition("cancel", item.id)} archiveLabel="일정 취소" /></div> : <SwipeButton key={item.id} className="lag-role-node" aria-pressed={selectedId === item.id} onClick={() => void select(item.id)}><span className="lag-role-node-mark" aria-hidden>{item.status === "COMPLETED" ? "✓" : "×"}</span><span><strong>{item.title}</strong><small>{item.status === "COMPLETED" ? "완료" : "취소"}</small></span><span aria-hidden>→</span></SwipeButton>)}
      </div>}>{form()}</CreateSlot>
    </PanelFrame></PanelStage>
    {(mode === "detail" || mode === "edit") && selectedId !== null ? <PanelStage stageKey="role-event-detail" instant><PanelFrame title={mode === "edit" ? "일정 수정" : "일정 상세"} backButton={<BackButton label={mode === "edit" ? "일정 상세로" : "일정 목록으로"} onClick={mode === "edit" ? () => { setMode("detail"); setDetailError(null); } : close} />}>
      {loading ? <p role="status">일정 상세를 불러오는 중…</p> : null}{detailError && !detail ? <p role="alert">{detailError} <button type="button" onClick={() => void select(selectedId, mode)}>다시 조회</button></p> : null}
      {detail && mode === "edit" ? form(detail) : detail ? <article className="lag-role-detail"><h4>{detail.title}</h4><p>{detail.description || "설명 없음"}</p><dl><div className="lag-role-data-row"><dt>상태</dt><dd>{detail.status === "PLANNED" ? "계획" : detail.status === "COMPLETED" ? "완료" : "취소"}</dd></div><div className="lag-role-data-row"><dt>시작</dt><dd>{detail.startsAt ? new Date(detail.startsAt).toLocaleString("ko-KR") : "미등록"}</dd></div><div className="lag-role-data-row"><dt>종료</dt><dd>{detail.endsAt ? new Date(detail.endsAt).toLocaleString("ko-KR") : "미등록"}</dd></div></dl>
        {detailError ? <p role="alert">{detailError}</p> : null}
        {detail.status === "PLANNED" ? <div className="lag-role-actions"><button type="button" className="lag-role-button" disabled={pending} onClick={() => setMode("edit")}>수정</button><button type="button" className="lag-role-action" disabled={pending} onClick={() => void transition("complete", detail.id)}>완료</button><button type="button" className="lag-role-button" disabled={pending} onClick={() => void transition("cancel", detail.id)}>취소</button></div> : null}
        <h5 className="lag-role-subheading">참가자</h5>{detail.participants.length ? detail.participants.map((person) => <div className="lag-group-member" key={person.participantLinkId}><span>{person.participantType === "PERSON" ? "개인 인물" : "서비스 사용자"} #{person.participantId}</span>{detail.status === "PLANNED" ? <button type="button" className="lag-role-button" disabled={pending} onClick={() => void removeParticipant(person.participantLinkId)}>참가자 제외</button> : null}</div>) : <p>참가자가 없습니다.</p>}
        {detail.status === "PLANNED" ? <form className="lag-role-form" onSubmit={(event) => void addParticipant(event)}><label>참가자 종류<select className="lag-role-control" value={participantType} onChange={(event) => setParticipantType(event.target.value as typeof participantType)}><option value="PERSON">내 인물 기록</option><option value="SERVICE_USER">서비스 사용자</option></select></label>{participantType === "PERSON" ? <label>내 인물<select className="lag-role-control" name="participantId" required defaultValue=""><option value="" disabled>인물 선택</option>{persons.filter((person) => person.status === "ACTIVE").map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label> : <label>서비스 사용자 ID<input className="lag-role-control" name="participantId" type="number" min="1" required /></label>}<button type="submit" className="lag-role-button" disabled={pending || participantType === "PERSON" && !persons.some((person) => person.status === "ACTIVE")}>참가자 추가</button></form> : null}
      </article> : null}
    </PanelFrame></PanelStage> : null}
  </div>;
}
