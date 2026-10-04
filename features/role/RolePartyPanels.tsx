"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { ConnectionPage, ConnectionPeer } from "@/shared/api/types";
import { getFollowersApi } from "@/features/social/api";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { RecordRow, SwipeButton } from "./RecordRow";
import { answerRolePartyInvitation, cancelRolePartyInvitation, createRoleParty, disbandRoleParty, inviteToRoleParty, leaveRoleParty, myRoleParties, myRolePartyInvitations, rolePartiesForRole, rolePartyDetail, rolePartyInvitations, rolePartyMembers, transferRolePartyLeader, updateRoleParty } from "./roleParties";
import type { MyRoleParty, RolePartyDetail, RolePartyInput, RolePartyInvitation, RolePartyMember, RolePartySummary } from "./roleParties";

type View = "mine" | "invitations";
type Child = "members" | "edit" | "invite";
const errorText = (error: unknown) => error instanceof ApiError ? error.status === 409 ? "상태가 변경되었거나 정원·초대 기한을 확인해주세요. 목록을 다시 조회할 수 있습니다." : error.status === 404 ? "소모임을 찾을 수 없거나 접근할 수 없습니다." : error.status === 403 ? "이 작업을 수행할 권한이 없습니다." : error.message : error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";

export default function RolePartyPanels({ roleId, roleName, roleStatus = "ACTIVE", playerId, createRequest = 0, reentryRequest = 0, onBack }: { roleId?: number; roleName?: string; roleStatus?: string; playerId: number; createRequest?: number; reentryRequest?: number; onBack: () => void }) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const { confirm, dialog } = useSaoConfirm();
  const [view, setView] = useState<View>("mine"), [page, setPage] = useState(0);
  const [list, setList] = useState<ConnectionPage<RolePartySummary | MyRoleParty | RolePartyInvitation> | null>(null), [listError, setListError] = useState<string | null>(null), [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false), [selectedId, setSelectedId] = useState<number | null>(null), [detail, setDetail] = useState<RolePartyDetail | null>(null);
  const [invitation, setInvitation] = useState<RolePartyInvitation | null>(null), [child, setChild] = useState<Child | null>(null), [members, setMembers] = useState<ConnectionPage<RolePartyMember> | null>(null), [memberPage, setMemberPage] = useState(0);
  const [peers, setPeers] = useState<ConnectionPeer[]>([]), [peersError, setPeersError] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<ConnectionPage<RolePartyInvitation> | null>(null), [invitePage, setInvitePage] = useState(0), [invitesError, setInvitesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false), [detailLoading, setDetailLoading] = useState(false);
  const listSeq = useRef(0), detailSeq = useRef(0), inviteSeq = useRef(0), busy = useRef(false);
  const loadList = useCallback(async (nextView = view, nextPage = page) => {
    const seq = ++listSeq.current; setLoadingList(true); setListError(null);
    try { const next = nextView === "invitations" ? await myRolePartyInvitations(nextPage) : roleId ? await rolePartiesForRole(roleId, nextPage) : await myRoleParties(nextPage); if (seq === listSeq.current) setList(next); }
    catch (caught) { if (seq === listSeq.current) { setList(null); setListError(errorText(caught)); } }
    finally { if (seq === listSeq.current) setLoadingList(false); }
  }, [view, page, roleId]);
  useEffect(() => { const seq = listSeq; void loadList(); return () => { seq.current++; }; }, [loadList, reentryRequest]);
  useEffect(() => { if (createRequest || reentryRequest) { detailSeq.current++; setSelectedId(null); setDetail(null); setChild(null); setCreating(Boolean(createRequest && roleId && roleStatus === "ACTIVE")); } }, [createRequest, reentryRequest, roleId, roleStatus]);
  useEffect(() => () => { detailSeq.current++; }, []);
  const closeDetail = () => { detailSeq.current++; setSelectedId(null); setDetail(null); setInvitation(null); setChild(null); setError(null); requestStageFocus("role-party-list", "back"); };
  const select = async (id: number, invite: RolePartyInvitation | null = null): Promise<RolePartyDetail | null> => {
    const seq = ++detailSeq.current; setSelectedId(id); setInvitation(invite); setDetail(null); setChild(null); setError(null); setDetailLoading(!invite);
    if (invite) return null;
    try { const next = await rolePartyDetail(id); if (seq === detailSeq.current) { setDetail(next); return next; } }
    catch (caught) { if (seq === detailSeq.current) setError(errorText(caught)); }
    finally { if (seq === detailSeq.current) setDetailLoading(false); }
    return null;
  };
  const reloadDetail = async (id: number) => { const seq = detailSeq.current, next = await rolePartyDetail(id); if (seq === detailSeq.current) setDetail(next); return next; };
  const afterCommand = async (id: number, close = false) => { await loadList(); if (close) closeDetail(); else await reloadDetail(id); };
  const command = async (request: () => Promise<unknown>, close = false, ask?: string) => {
    if (selectedId === null || busy.current || ask && !await confirm(ask)) return false;
    const id = selectedId, seq = detailSeq.current; if (seq !== detailSeq.current || busy.current) return false;
    busy.current = true; setPending(true); setError(null);
    try {
      try { await request(); }
      catch (caught) { if (seq === detailSeq.current) setError(errorText(caught)); return false; }
      try { if (seq === detailSeq.current) await afterCommand(id, close); }
      catch { if (seq === detailSeq.current) setError("작업은 완료됐지만 최신 정보를 불러오지 못했습니다. 다시 조회해주세요."); }
      return true;
    }
    finally { busy.current = false; setPending(false); }
  };
  const body = (form: FormData): RolePartyInput => ({ name: String(form.get("name") ?? "").trim(), description: String(form.get("description") ?? "").trim() || null, maxMembers: Number(form.get("maxMembers")) });
  const valid = (input: RolePartyInput) => input.name.length > 0 && input.name.length <= 120 && (input.description?.length ?? 0) <= 1000 && Number.isInteger(input.maxMembers) && input.maxMembers >= 2 && input.maxMembers <= 50;
  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy.current) return; const input = body(new FormData(event.currentTarget));
    if (!valid(input)) { setError("이름(1~120자), 설명(1000자 이하), 정원(2~50명)을 확인해주세요."); return; }
    if (child !== "edit" && (!roleId || roleStatus !== "ACTIVE")) { setError("활성 역할에서만 소모임을 만들 수 있습니다."); return; }
    busy.current = true; setPending(true); setError(null);
    try { if (child === "edit" && selectedId !== null) { const saved = await updateRoleParty(selectedId, input); setDetail(saved); setChild(null); await loadList(); } else if (roleId && roleStatus === "ACTIVE") { const saved = await createRoleParty(roleId, input); setCreating(false); await loadList(); await select(saved.id); } }
    catch (caught) { setError(errorText(caught)); }
    finally { busy.current = false; setPending(false); }
  };
  const loadMembers = async (id: number, nextPage = 0) => { setMembers(null); try { setMembers(await rolePartyMembers(id, nextPage)); } catch (caught) { setError(errorText(caught)); } };
  const loadInvites = async (id: number, nextPage = 0) => { const seq = ++inviteSeq.current, detail = detailSeq.current; setSentInvites(null); setInvitesError(null); try { const next = await rolePartyInvitations(id, nextPage); if (seq === inviteSeq.current && detail === detailSeq.current) setSentInvites(next); } catch (caught) { if (seq === inviteSeq.current && detail === detailSeq.current) setInvitesError(errorText(caught)); } };
  const openChild = (next: Child) => { if (selectedId === null) return; setChild(next); setError(null); if (next === "members") { setMemberPage(0); void loadMembers(selectedId); } if (next === "invite" && detail?.status === "ACTIVE" && detail.leaderPlayerId === playerId) { setInvitePage(0); void loadPeers(); void loadInvites(selectedId); } };
  const loadPeers = async () => {
    setPeersError(null);
    try { const friends: ConnectionPeer[] = []; for (let page = 0; ; page++) { const result = await getFollowersApi(page, 100); friends.push(...result.contents.filter((item) => item.followedBack).map((item) => item.peer)); if (page + 1 >= result.totalPages) break; } setPeers(friends); }
    catch (caught) { setPeersError(errorText(caught)); }
  };
  const sendInvite = async (event: React.SubmitEvent<HTMLFormElement>) => { event.preventDefault(); if (selectedId === null) return; const id = selectedId, peerId = Number(new FormData(event.currentTarget).get("peer")); if (!peers.some((peer) => peer.playerId === peerId)) return; if (await command(() => inviteToRoleParty(id, peerId))) { setInvitePage(0); await loadInvites(id); } };
  const disbandFromRow = async (id: number) => { if (busy.current || !await confirm("이 역할 소모임을 해산할까요?")) return; busy.current = true; setPending(true); setListError(null); try { await disbandRoleParty(id); await loadList(); if (selectedId === id) await select(id); } catch (caught) { setListError(errorText(caught)); } finally { busy.current = false; setPending(false); } };
  const leader = detail?.leaderPlayerId === playerId, active = detail?.status === "ACTIVE";
  const form = (record?: RolePartyDetail) => <form className="lag-role-form" onSubmit={(event) => void save(event)}><label>이름<input className="lag-role-control" name="name" required maxLength={120} autoFocus defaultValue={record?.name ?? ""} /></label><label>설명<textarea className="lag-role-control" name="description" maxLength={1000} rows={3} defaultValue={record?.description ?? ""} /></label><label>정원 (리더 포함)<input className="lag-role-control" name="maxMembers" type="number" min="2" max="50" required defaultValue={record?.maxMembers ?? 10} /></label><p>초대 전용 · 생성자는 리더이자 첫 멤버입니다.</p>{error ? <p role="alert">{error}</p> : null}<button className="lag-role-action" type="submit" disabled={pending}>{pending ? "저장 중…" : record ? "변경 저장" : "소모임 생성"}</button></form>;
  return <div className="lag-panel-rail lag-role-party-shell">{dialog}
    <PanelStage stageKey="role-party-list" instant inactive={compact && (selectedId !== null || creating)}><PanelFrame title={roleName ? `${roleName} · 소모임` : "내 역할 소모임"} backButton={<BackButton label={creating ? "소모임 목록으로" : roleName ? `역할 ${roleName}로` : "모임 분류로"} onClick={creating ? () => { setCreating(false); setError(null); } : onBack} />}><CreateSlot creating={creating} showCancel={false} pending={pending} onClose={() => setCreating(false)} list={<div className="lag-role-detail">
      {!roleId ? <div className="lag-group-tabs" role="group" aria-label="역할 소모임 목록 종류"><button type="button" className="lag-role-button" aria-pressed={view === "mine"} onClick={() => { setView("mine"); setPage(0); closeDetail(); }}>내 소모임</button><button type="button" className="lag-role-button" aria-pressed={view === "invitations"} onClick={() => { setView("invitations"); setPage(0); closeDetail(); }}>받은 초대</button></div> : null}
      {loadingList ? <p role="status">소모임을 불러오는 중…</p> : null}{listError ? <p role="alert">{listError} <button type="button" onClick={() => void loadList()}>다시 조회</button></p> : null}{!loadingList && !listError && !list?.contents.length ? <p>{view === "invitations" ? "받은 초대가 없습니다." : "역할 소모임이 없습니다."}</p> : null}
      {list?.contents.map((item) => {
        if ("invitationId" in item) return <SwipeButton key={item.invitationId} className="lag-role-node" aria-pressed={selectedId === item.rolePartyId} onClick={() => void select(item.rolePartyId, item)}><span className="lag-role-node-mark" aria-hidden>초</span><span><strong>{item.groupName}</strong><small>역할 소모임 초대 · {item.status}</small></span><span aria-hidden>→</span></SwipeButton>;
        const group = "group" in item ? item.group : item;
        const left = "membershipStatus" in item && item.membershipStatus === "LEFT";
        const subtitle = `${left ? "탈퇴" : group.status === "ACTIVE" ? "활동 중" : "해산"} · ${group.memberCount}/${group.maxMembers}명`;
        if (left) return <div key={group.id} className="lag-role-node"><span className="lag-role-node-mark" aria-hidden>소</span><span><strong>{group.name}</strong><small>{subtitle}</small></span></div>;
        return group.status === "ACTIVE" && group.leaderPlayerId === playerId ? <RecordRow key={group.id} title={group.name} subtitle={subtitle} selected={selectedId === group.id} disabled={pending} onSelect={() => void select(group.id)} onEdit={() => void select(group.id).then((next) => { if (next?.status === "ACTIVE" && next.leaderPlayerId === playerId) setChild("edit"); })} onArchive={() => void disbandFromRow(group.id)} archiveLabel="해산" /> : <SwipeButton key={group.id} className="lag-role-node" aria-pressed={selectedId === group.id} onClick={() => void select(group.id)}><span className="lag-role-node-mark" aria-hidden>소</span><span><strong>{group.name}</strong><small>{subtitle}</small></span><span aria-hidden>→</span></SwipeButton>;
      })}
      <div className="lag-connection-pagination"><button type="button" className="lag-role-button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span>{list ? `${page + 1} / ${Math.max(1, list.totalPages)}` : ""}</span><button type="button" className="lag-role-button" disabled={!list || page + 1 >= list.totalPages} onClick={() => setPage(page + 1)}>다음</button></div>
    </div>}>{form()}</CreateSlot></PanelFrame></PanelStage>
    {selectedId !== null ? <PanelStage stageKey="role-party-detail" parentStageKey="role-party-list" instant inactive={compact && child !== null}><PanelFrame title="역할 소모임 상세" backButton={<BackButton label="소모임 목록으로" onClick={closeDetail} />}><article className="lag-role-detail">
      {detailLoading ? <p role="status">상세를 불러오는 중…</p> : null}{error && !child ? <p role="alert">{error} <button type="button" onClick={() => invitation ? void loadList() : void select(selectedId)}>다시 조회</button></p> : null}
      {invitation ? <><h4>{invitation.groupName}</h4><p>역할 소모임 초대 · {new Date(invitation.expiresAt).toLocaleString("ko-KR")}까지</p><div className="lag-role-actions"><button type="button" className="lag-role-action" disabled={pending} onClick={() => void command(() => answerRolePartyInvitation(selectedId, invitation.invitationId, "accept"), true).then((ok) => { if (ok) { setView("mine"); setPage(0); } })}>수락</button><button type="button" className="lag-role-button" disabled={pending} onClick={() => void command(() => answerRolePartyInvitation(selectedId, invitation.invitationId, "decline"), true)}>거절</button></div></> : null}
      {detail ? <><h4>{detail.name}</h4><p>{detail.description || "설명 없음"}</p><dl><div className="lag-role-data-row"><dt>상태</dt><dd>{active ? "활동 중" : "해산"}</dd></div><div className="lag-role-data-row"><dt>가입</dt><dd>초대 전용</dd></div><div className="lag-role-data-row"><dt>인원</dt><dd>{detail.memberCount}/{detail.maxMembers}명</dd></div><div className="lag-role-data-row"><dt>내 역할</dt><dd>{leader ? "리더" : "멤버"}</dd></div></dl><div className="lag-role-actions"><button type="button" className="lag-role-button" onClick={() => openChild("members")}>멤버</button>{active && leader ? <button type="button" className="lag-role-button" onClick={() => openChild("invite")}>초대</button> : null}{active && !leader ? <button type="button" className="lag-role-button" disabled={pending} onClick={() => void command(() => leaveRoleParty(selectedId), true, "이 소모임에서 탈퇴할까요?")}>탈퇴</button> : null}</div></> : null}
    </article></PanelFrame></PanelStage> : null}
    {selectedId !== null && child ? <PanelStage stageKey="role-party-child" parentStageKey="role-party-detail" instant><PanelFrame title={{ members: "멤버", edit: "소모임 수정", invite: "멤버 초대" }[child]} backButton={<BackButton label="소모임 상세로" onClick={() => { setChild(null); setError(null); requestStageFocus("role-party-detail", "back"); }} />}><div className="lag-role-detail">
      {child === "edit" && detail && leader && active ? form(detail) : null}
      {child === "members" ? <>{!members && !error ? <p role="status">멤버를 불러오는 중…</p> : null}{members?.contents.map((member) => <div className="lag-group-member" key={member.playerId}><strong>플레이어 #{member.playerId}</strong><small>{member.role === "LEADER" ? "리더" : "멤버"}</small>{leader && active && member.playerId !== playerId ? <button type="button" className="lag-role-button" disabled={pending} onClick={() => void command(() => transferRolePartyLeader(selectedId, member.playerId), false, `플레이어 #${member.playerId}에게 리더를 이전할까요?`).then((ok) => { if (ok) void loadMembers(selectedId, memberPage); })}>리더 이전</button> : null}</div>)}{members?.contents.length === 0 ? <p>멤버가 없습니다.</p> : null}<div className="lag-connection-pagination"><button type="button" disabled={memberPage === 0} onClick={() => { setMemberPage(memberPage - 1); void loadMembers(selectedId, memberPage - 1); }}>이전</button><span>{members ? `${memberPage + 1} / ${Math.max(1, members.totalPages)}` : ""}</span><button type="button" disabled={!members || memberPage + 1 >= members.totalPages} onClick={() => { setMemberPage(memberPage + 1); void loadMembers(selectedId, memberPage + 1); }}>다음</button></div></> : null}
      {child === "invite" && leader && active ? <><form className="lag-role-form" onSubmit={(event) => void sendInvite(event)}><label>연결된 친구<select className="lag-role-control" name="peer" required defaultValue=""><option value="" disabled>친구 선택</option>{peers.filter((peer) => peer.playerId !== playerId).map((peer) => <option key={peer.playerId} value={peer.playerId}>{peer.name}</option>)}</select></label>{peersError ? <p role="alert">{peersError} <button type="button" onClick={() => void loadPeers()}>다시 조회</button></p> : null}{!peersError && !peers.length ? <p>초대할 수 있는 연결된 친구가 없습니다.</p> : null}<button type="submit" className="lag-role-action" disabled={pending || !peers.length}>초대 보내기</button></form>
        <h5 className="lag-role-subheading">대기 초대</h5>{invitesError ? <p role="alert">{invitesError} <button type="button" onClick={() => void loadInvites(selectedId, invitePage)}>다시 조회</button></p> : null}{!sentInvites && !invitesError ? <p role="status">대기 초대를 불러오는 중…</p> : null}{sentInvites?.contents.length === 0 ? <p>대기 초대가 없습니다.</p> : null}
        {sentInvites?.contents.map((item) => <div className="lag-group-member" key={item.invitationId}><span>플레이어 #{item.inviteePlayerId} · {new Date(item.expiresAt).toLocaleString("ko-KR")}까지</span><button type="button" className="lag-role-button" disabled={pending} onClick={() => void command(() => cancelRolePartyInvitation(selectedId, item.invitationId)).then((ok) => { if (ok) void loadInvites(selectedId, invitePage); })}>초대 취소</button></div>)}
        {sentInvites && sentInvites.totalPages > 1 ? <div className="lag-connection-pagination"><button type="button" disabled={invitePage === 0} onClick={() => { setInvitePage(invitePage - 1); void loadInvites(selectedId, invitePage - 1); }}>이전</button><span>{invitePage + 1} / {sentInvites.totalPages}</span><button type="button" disabled={invitePage + 1 >= sentInvites.totalPages} onClick={() => { setInvitePage(invitePage + 1); void loadInvites(selectedId, invitePage + 1); }}>다음</button></div> : null}</> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div></PanelFrame></PanelStage> : null}
  </div>;
}
