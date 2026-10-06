"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { ConnectionPeer } from "@/shared/api/types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { RecordRow } from "@/features/role/RecordRow";
import { getFollowersApi, getFollowingsApi } from "./api";
import { groupMembers } from "./groups";
import { cancelRosterInvitation, createRosterRow, deleteRosterRow, inviteRosterRow, pendingRosterInvitations, rosterRows, updateRosterRow } from "./rosterApi";
import type { RosterGroupType, RosterInvitation, RosterPage, RosterRow } from "./rosterApi";
import type { GroupPage } from "./groups";

const message = (error: unknown) => error instanceof ApiError ? error.status === 409 ? "상태가 바뀌었습니다. 입력은 유지했습니다. 최신 명부를 조회한 뒤 다시 시도하세요." : error.status === 403 || error.status === 404 ? "현재 모임 또는 작업에 접근할 수 없습니다." : error.message : error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";
const statusText = (row: RosterRow, pending: boolean) => row.status === "LINKED" ? row.memberStatus === "ACTIVE" ? "가입 멤버" : "탈퇴한 멤버" : pending ? "연결 초대 대기" : "계정 미연결";

export default function RosterPanels({ groupType, groupId, maxMembers, creating, onBack, onAccessLost, onMemberOpen }: {
  groupType: RosterGroupType; groupId: number; maxMembers: number; creating: boolean;
  onBack: () => void; onAccessLost?: () => void; onMemberOpen?: (playerId: number) => void;
}) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const { confirm, dialog } = useSaoConfirm();
  const [page, setPage] = useState(0), [filter, setFilter] = useState<"ALL" | "UNLINKED" | "LINKED">("ALL"), [keyword, setKeyword] = useState(""), [term, setTerm] = useState("");
  const [rows, setRows] = useState<RosterPage | null>(null), [pendingInvites, setPendingInvites] = useState<GroupPage<RosterInvitation> | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null), [unlinkedCount, setUnlinkedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(creating), [selected, setSelected] = useState<RosterRow | null>(null), [editOpen, setEditOpen] = useState(false), [inviteOpen, setInviteOpen] = useState(false);
  const [draft, setDraft] = useState({ displayName: "", groupRoleLabel: "" }), [peers, setPeers] = useState<ConnectionPeer[]>([]), [peerId, setPeerId] = useState(0), [peerError, setPeerError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0), seq = useRef(0), lock = useRef(false);

  const load = useCallback(async () => {
    const current = ++seq.current; setLoading(true); setError(null);
    try {
      const next = await rosterRows(groupType, groupId, page, filter, term);
      if (current !== seq.current) return;
      setRows(next);
      const [actual, unlinked] = await Promise.all([
        groupMembers(groupType === "GUILD" ? "guilds" : "parties", groupId, 0),
        !term && filter === "UNLINKED" ? Promise.resolve(next) : rosterRows(groupType, groupId, 0, "UNLINKED"),
      ]);
      if (current === seq.current) { setMemberCount(actual.totalElements); setUnlinkedCount(unlinked.totalElements); }
      if (next.capabilities.canManageRoster) {
        try {
          const first = await pendingRosterInvitations(groupType, groupId);
          const all = [...first.contents];
          for (let index = 1; index < first.totalPages; index++) all.push(...(await pendingRosterInvitations(groupType, groupId, index)).contents);
          if (current === seq.current) setPendingInvites({ ...first, contents: all });
        }
        catch (caught) { if (current === seq.current) setPeerError(message(caught)); }
      } else setPendingInvites(null);
    } catch (caught) {
      if (current !== seq.current) return;
      setRows(null); setPendingInvites(null); setError(message(caught));
      if (caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.();
    } finally { if (current === seq.current) setLoading(false); }
  }, [groupType, groupId, page, filter, term, onAccessLost]);
  useEffect(() => { const counter = seq; void load(); return () => { counter.current++; }; }, [load, revision]);
  useEffect(() => { setCreateOpen(creating); setSelected(null); setEditOpen(false); setInviteOpen(false); }, [creating]);
  const refresh = () => setRevision((value) => value + 1);
  const select = (row: RosterRow) => { setSelected(row); setEditOpen(false); setInviteOpen(false); setPeerError(null); };
  const edit = (row: RosterRow) => { setSelected(row); setDraft({ displayName: row.displayName, groupRoleLabel: row.groupRoleLabel ?? "" }); setEditOpen(true); setInviteOpen(false); setPeerError(null); };
  const write = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current) return;
    const displayName = draft.displayName.trim(), groupRoleLabel = draft.groupRoleLabel.trim() || null;
    if (!displayName || displayName.length > 80 || (groupRoleLabel?.length ?? 0) > 120) { setError("공유 이름(1~80자)과 모임 내 역할(120자 이하)을 확인해주세요."); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const saved = editOpen && selected ? await updateRosterRow(groupType, groupId, selected.rosterEntryId, { displayName, groupRoleLabel, version: selected.version }) : await createRosterRow(groupType, groupId, { displayName, groupRoleLabel });
      setSelected(saved); setCreateOpen(false); setEditOpen(false); setDraft({ displayName: "", groupRoleLabel: "" }); refresh();
    } catch (caught) { setError(message(caught)); if (caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.(); }
    finally { lock.current = false; setBusy(false); }
  };
  const remove = async (row: RosterRow) => {
    if (lock.current || !await confirm(`${row.displayName} 항목을 명부에서 삭제할까요? 실제 계정 삭제나 모임 강퇴는 아닙니다.`)) return;
    lock.current = true; setBusy(true); setError(null);
    try { await deleteRosterRow(groupType, groupId, row.rosterEntryId, row.version); setSelected(null); refresh(); }
    catch (caught) { setError(message(caught)); if (caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.(); }
    finally { lock.current = false; setBusy(false); }
  };
  const latest = async () => {
    if (!selected) return;
    try {
      const first = await rosterRows(groupType, groupId, 0);
      let current = first.contents.find((row) => row.rosterEntryId === selected.rosterEntryId);
      for (let index = 1; !current && index < first.totalPages; index++) current = (await rosterRows(groupType, groupId, index)).contents.find((row) => row.rosterEntryId === selected.rosterEntryId);
      if (current) setSelected(current);
      else setError("이 항목을 현재 목록에서 찾지 못했습니다. 목록을 다시 조회하세요.");
    } catch (caught) { setError(message(caught)); }
  };
  const openInvite = async (row: RosterRow) => {
    setSelected(row); setEditOpen(false); setInviteOpen(true); setPeerId(0); setPeerError(null);
    try {
      const candidates = new Map<number, ConnectionPeer>();
      for (let index = 0; ; index++) { const result = await getFollowersApi(index, 100); result.contents.forEach((item) => candidates.set(item.peer.playerId, item.peer)); if (index + 1 >= result.totalPages) break; }
      for (let index = 0; ; index++) { const result = await getFollowingsApi(index, 100); result.contents.filter((item) => !item.blocked).forEach((item) => candidates.set(item.peer.playerId, item.peer)); if (index + 1 >= result.totalPages) break; }
      setPeers([...candidates.values()]);
    } catch (caught) { setPeerError(message(caught)); }
  };
  const invite = async () => {
    if (!selected || lock.current) return;
    const peer = peers.find((item) => item.playerId === peerId);
    if (!peer || !await confirm(`${peer.name} 계정을 ${selected.displayName} 명부에 연결하도록 초대할까요?`)) return;
    lock.current = true; setBusy(true); setError(null);
    try { await inviteRosterRow(groupType, groupId, selected.rosterEntryId, peer.playerId); setInviteOpen(false); refresh(); }
    catch (caught) { setError(message(caught)); if (caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.(); }
    finally { lock.current = false; setBusy(false); }
  };
  const cancelInvite = async (item: RosterInvitation) => {
    if (lock.current || !await confirm(`${item.rosterDisplayName} 명부 연결 초대를 취소할까요?`)) return;
    lock.current = true; setBusy(true); setError(null);
    try { await cancelRosterInvitation(groupType, groupId, item.invitationId); refresh(); }
    catch (caught) { setError(message(caught)); }
    finally { lock.current = false; setBusy(false); }
  };
  const canManage = Boolean(rows?.capabilities.canManageRoster), canInvite = Boolean(rows?.capabilities.canInvite);
  const pendingIds = new Set(pendingInvites?.contents.map((item) => item.rosterEntryId) ?? []);
  const form = <form className="lag-role-form" onSubmit={(event) => void write(event)}>
    <label>공유 이름<input className="lag-role-control" required maxLength={80} value={draft.displayName} onChange={(event) => setDraft((value) => ({ ...value, displayName: event.target.value }))} /></label>
    <label>모임 내 역할·소개<textarea className="lag-role-control" maxLength={120} rows={3} value={draft.groupRoleLabel} onChange={(event) => setDraft((value) => ({ ...value, groupRoleLabel: event.target.value }))} /></label>
    <p>이 항목은 공유 명부입니다. 실제 가입·정원·권한에 영향을 주지 않습니다.</p>
    {error ? <p role="alert">{error} {editOpen ? <button type="button" onClick={() => void latest()}>최신 조회</button> : null}</p> : null}
    <button className="lag-role-action" disabled={busy}>{busy ? "저장 중…" : editOpen ? "명부 수정 저장" : "명부 등록"}</button>
  </form>;
  return <>{dialog}
    <PanelStage stageKey="roster-list" parentStageKey="social-detail" instant inactive={compact && selected !== null}>
      <PanelFrame title={createOpen && canManage ? "명부 등록" : "공유 명부"} backButton={<BackButton label={createOpen && canManage ? "명부 목록으로" : "모임 상세로"} onClick={createOpen && canManage ? () => { setCreateOpen(false); setError(null); } : onBack} />}>
        <CreateSlot creating={createOpen && canManage} pending={busy} showCancel={false} onClose={() => setCreateOpen(false)} list={<div className="lag-role-detail lag-group-main">
          <p>실제 가입 {memberCount ?? "…"}/{maxMembers}명 · 계정 미연결 명부 {unlinkedCount ?? "…"}건 · 현재 목록 {rows?.totalElements ?? "…"}건</p>
          <div className="lag-group-tabs" role="group" aria-label="명부 상태">{(["ALL", "UNLINKED", "LINKED"] as const).map((item) => <button key={item} type="button" className="lag-role-button" aria-pressed={filter === item} onClick={() => { setFilter(item); setPage(0); setSelected(null); }}>{ { ALL: "전체", UNLINKED: "미연결", LINKED: "계정 연결" }[item] }</button>)}</div>
          <form className="lag-group-search" onSubmit={(event) => { event.preventDefault(); setTerm(keyword.trim()); setPage(0); }}><input aria-label="명부 이름 검색" value={keyword} onChange={(event) => setKeyword(event.target.value)} /><button className="lag-role-button">검색</button></form>
          {loading ? <p role="status">명부를 불러오는 중…</p> : null}
          {error ? <p role="alert">{error} <button type="button" onClick={() => void load()}>다시 조회</button></p> : null}
          {!loading && !error && !rows?.contents.length ? <p>명부 항목이 없습니다.</p> : null}
          {rows?.contents.map((row) => <RecordRow key={row.rosterEntryId} title={row.displayName} subtitle={`${row.groupRoleLabel ? `${row.groupRoleLabel} · ` : ""}${statusText(row, pendingIds.has(row.rosterEntryId))}`} selected={selected?.rosterEntryId === row.rosterEntryId} disabled={busy} onSelect={() => select(row)} onEdit={canManage ? () => edit(row) : undefined} onArchive={canManage ? () => void remove(row) : undefined} archiveLabel="명부에서 삭제" />)}
          <div className="lag-connection-pagination"><button type="button" disabled={page === 0} onClick={() => { setPage(page - 1); setSelected(null); }}>이전</button><span>{page + 1} / {Math.max(1, rows?.totalPages ?? 0)}</span><button type="button" disabled={!rows || page + 1 >= rows.totalPages} onClick={() => { setPage(page + 1); setSelected(null); }}>다음</button></div>
          {canManage ? <section><h5 className="lag-role-subheading">대기 중인 연결 초대</h5>{peerError ? <p role="alert">{peerError}</p> : null}{pendingInvites?.contents.length === 0 ? <p>대기 초대가 없습니다.</p> : null}{pendingInvites?.contents.map((item) => <div className="lag-group-member" key={item.invitationId}><span>{item.rosterDisplayName}{item.targetPlayerId ? ` · 플레이어 #${item.targetPlayerId}` : ""} · {new Date(item.expiresAt).toLocaleString("ko-KR")}까지</span><button className="lag-role-button" disabled={busy} onClick={() => void cancelInvite(item)}>초대 취소</button></div>)}</section> : null}
        </div>}>{form}</CreateSlot>
      </PanelFrame>
    </PanelStage>
    {selected ? <PanelStage stageKey="roster-detail" parentStageKey="roster-list" instant><PanelFrame title={editOpen ? "명부 수정" : inviteOpen ? "명부 연결 초대" : "명부 항목"} backButton={<BackButton label="명부 목록으로" onClick={() => { setSelected(null); setEditOpen(false); setInviteOpen(false); setError(null); }} />}><div className="lag-role-detail lag-group-main">
      {editOpen ? form : <><h4>{selected.displayName}</h4><p>{selected.groupRoleLabel || "모임 내 역할·소개 없음"}</p><p>{statusText(selected, pendingIds.has(selected.rosterEntryId))}</p>{selected.linkedPlayerId ? <p>연결 계정: 플레이어 #{selected.linkedPlayerId}</p> : null}
        {selected.status === "LINKED" && selected.memberStatus === "ACTIVE" && selected.linkedPlayerId && onMemberOpen ? <button className="lag-role-button" onClick={() => onMemberOpen(selected.linkedPlayerId!)}>실제 멤버에서 내 인물 연결</button> : null}
        {inviteOpen && canInvite && selected.status === "UNLINKED" ? <div className="lag-role-form"><label>연결할 실제 계정<select className="lag-role-control" value={peerId} onChange={(event) => setPeerId(Number(event.target.value))}><option value={0}>계정 선택</option>{peers.map((peer) => <option key={peer.playerId} value={peer.playerId}>{peer.name} · #{peer.playerId}</option>)}</select></label>{!peers.length && !peerError ? <p>선택할 계정이 없습니다. 대상이 가입한 뒤 연결 화면에서 팔로우 관계를 맺어주세요.</p> : null}<p>대상이 명부 이름과 가입 여부를 확인한 뒤 직접 수락해야 연결됩니다.</p>{peerError ? <p role="alert">{peerError}</p> : null}<button className="lag-role-action" disabled={busy || !peerId} onClick={() => void invite()}>연결 초대 전송</button></div> : null}
        {!inviteOpen && canInvite && selected.status === "UNLINKED" && !pendingIds.has(selected.rosterEntryId) ? <button className="lag-role-button" onClick={() => void openInvite(selected)}>연결 초대</button> : null}
        {error ? <p role="alert">{error} <button onClick={() => void latest()}>최신 조회</button></p> : null}
      </>}
    </div></PanelFrame></PanelStage> : null}
  </>;
}
