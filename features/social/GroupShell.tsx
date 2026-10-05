"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { SwipeButton } from "@/features/role/RecordRow";
import { ApiError } from "@/shared/api/client";
import { groupCommand, groupCreate, groupInfo, groupMe, groupMembers, groupMine, groupPending, groupPreview, groupSearch, groupWaiters } from "./groups";
import MemberPersonPanel, { type MemberRoleOrigin } from "./MemberPersonPanel";
import GuildGroupPanels from "./GuildGroupPanels";
import GuildEventPanels from "./GuildEventPanels";
import type { GroupCreate, GroupInfo, GroupKind, GroupMe, GroupMember, GroupPage, GroupPending, GroupSummary, MyGroup } from "./groups";

type ListMode = "mine" | "search" | "requests" | "invitations";
type SubMode = "members" | "pending" | "invite" | "rename" | "description" | "policy";
const names = { guilds: "길드", parties: "파티" };
const words: Record<string, string> = { PUBLIC: "공개", PRIVATE: "비공개", OPEN: "자유 가입", APPROVAL: "승인 후 가입", INVITE_ONLY: "초대 전용", ACTIVE: "활동 중", LEADER: "리더", OFFICER: "운영진", MEMBER: "멤버" };
const word = (value: string | null | undefined) => value ? words[value] ?? value : "없음";
const errorText = (error: unknown) => error instanceof ApiError ? error.status === 404 ? "모임을 찾을 수 없거나 조회 권한이 없습니다." : error.status === 403 ? "이 작업을 수행할 권한이 없습니다." : `${error.message} (HTTP ${error.status})` : error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";

export default function GroupShell({ kind, createRequest = 0, playerId, onBack, linkedGroup, originRole }: { originRole?: MemberRoleOrigin; linkedGroup?: { id: number; onAccessLost: () => void; onPrivacyLost?: () => void; onMemberOpen?: (open: boolean) => void }; kind: GroupKind; createRequest?: number; playerId: number; onBack: () => void }) {
  const { confirm, dialog } = useSaoConfirm();
  const compact = useMediaQuery("(max-width: 1199px)");
  const [mode, setMode] = useState<ListMode>("mine"), [page, setPage] = useState(0), [keyword, setKeyword] = useState(""), [term, setTerm] = useState("");
  const [list, setList] = useState<GroupPage<GroupSummary | MyGroup | GroupPending> | null>(null), [listError, setListError] = useState<string | null>(null), [listLoading, setListLoading] = useState(false);
  const [creating, setCreating] = useState(false), [selectedId, setSelectedId] = useState<number | null>(null), [summary, setSummary] = useState<GroupSummary | null>(null);
  const [invitation, setInvitation] = useState<{ name: string; code: string } | null>(null);
  const [ownRequest, setOwnRequest] = useState<{ name: string; code: string } | null>(null);
  const [info, setInfo] = useState<GroupInfo | null>(null), [me, setMe] = useState<GroupMe | null>(null), [detailError, setDetailError] = useState<string | null>(null), [detailLoading, setDetailLoading] = useState(false);
  const [sub, setSub] = useState<SubMode | null>(null), [subPage, setSubPage] = useState(0), [subList, setSubList] = useState<GroupPage<GroupMember | GroupPending> | null>(null), [subError, setSubError] = useState<string | null>(null);
  const [guildCategory, setGuildCategory] = useState<"members" | "groups" | "events" | null>(null), [guildCategoryKey, setGuildCategoryKey] = useState(0), [guildCreating, setGuildCreating] = useState(false);
  const [pending, setPending] = useState(false), [actionError, setActionError] = useState<string | null>(null);
  const [memberSelection, setMemberSelection] = useState<{ member: GroupMember; registration: boolean; entry: number } | null>(null);
  const memberEntry = useRef(0);
  const notifyMemberOpen = linkedGroup?.onMemberOpen;
  useEffect(() => { notifyMemberOpen?.(memberSelection !== null); return () => notifyMemberOpen?.(false); }, [memberSelection, notifyMemberOpen]);
  const privacyLost = () => { setInfo(null); setSummary(null); setMe(null); setSubList(null); setList(null); linkedGroup?.onPrivacyLost?.(); };
  const listSeq = useRef(0), detailSeq = useRef(0), subSeq = useRef(0), busy = useRef(false);
  const loadList = useCallback(async (nextMode = mode, nextPage = page) => {
    if (linkedGroup) return;
    const seq = ++listSeq.current; setList(null); setListLoading(true); setListError(null);
    try {
      const next = nextMode === "mine" ? await groupMine(kind, nextPage) : nextMode === "search" ? await groupSearch(kind, term, nextPage) : await groupPending(kind, nextMode, nextPage);
      if (seq === listSeq.current) setList(next);
    } catch (error) { if (seq === listSeq.current) { setList(null); setListError(errorText(error)); } }
    finally { if (seq === listSeq.current) setListLoading(false); }
  }, [kind, mode, page, term, linkedGroup]);
  useEffect(() => { const counter = listSeq; void loadList(); return () => { counter.current++; }; }, [loadList]);
  useEffect(() => { if (createRequest) { detailSeq.current++; setSelectedId(null); setSub(null); setMemberSelection(null); setCreating(true); } }, [createRequest]);
  useEffect(() => () => { detailSeq.current++; subSeq.current++; }, []);

  const select = async (id: number) => {
    const seq = ++detailSeq.current; subSeq.current++;
    setCreating(false); setSelectedId(id); setSummary(null); setInfo(null); setMe(null); setSub(null); setMemberSelection(null); setGuildCategory(null); setDetailError(null); setDetailLoading(true); setActionError(null);
    const pendingRecord = mode === "invitations" || mode === "requests" ? list?.contents.find((item) => "type" in item && (kind === "guilds" ? item.guildId : item.partyId) === id) as GroupPending | undefined : undefined;
    const pendingInvitation = mode === "invitations" ? pendingRecord : undefined;
    setInvitation(pendingInvitation ? { name: pendingInvitation.name ?? names[kind], code: pendingInvitation.code ?? "" } : null);
    setOwnRequest(mode === "requests" && pendingRecord ? { name: pendingRecord.name ?? names[kind], code: pendingRecord.code ?? "" } : null);
    try {
      const status = await groupMe(kind, id);
      if (linkedGroup && !status.myRole) { linkedGroup.onAccessLost(); return; }
      const record = status.myRole ? await groupInfo(kind, id) : status.pendingInvitation && pendingInvitation ? null : await groupPreview(kind, id);
      if (seq === detailSeq.current) { setMe(status); if (status.myRole) setInfo(record as GroupInfo); else setSummary(record); }
    } catch (error) {
      if (seq === detailSeq.current) {
        if (mode === "requests" && pendingRecord && error instanceof ApiError && error.status === 404) setMe({ myRole: null, pendingJoin: true, pendingInvitation: false, actions: ["cancel-join"] });
        else { setDetailError(errorText(error)); if (linkedGroup && error instanceof ApiError && [403, 404].includes(error.status)) linkedGroup.onAccessLost(); }
      }
    }
    finally { if (seq === detailSeq.current) setDetailLoading(false); }
  };
  useEffect(() => {
    if (linkedGroup) void select(linkedGroup.id);
    // Selection is driven by the bookmark identity, not list state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedGroup?.id]);
  const refresh = async (id: number, close: boolean, seq: number) => { if (seq !== detailSeq.current) return false; await loadList(); if (seq !== detailSeq.current) return false; if (close) { if (linkedGroup) { linkedGroup.onAccessLost(); return true; } detailSeq.current++; setSelectedId(null); setSub(null); setMemberSelection(null); } else await select(id); return true; };
  const run = async (action: string, body: object = {}, close = false, confirmation?: string) => {
    if (selectedId === null || busy.current) return false;
    const id = selectedId, seq = detailSeq.current;
    if (confirmation && !await confirm(confirmation)) return false;
    if (busy.current || seq !== detailSeq.current) return false;
    busy.current = true; setPending(true); setActionError(null);
    try { await groupCommand(kind, id, action, body); return await refresh(id, close, seq); }
    catch (error) { if (seq === detailSeq.current) { setActionError(errorText(error)); if (linkedGroup && error instanceof ApiError && [403, 404].includes(error.status)) linkedGroup.onAccessLost(); } return false; }
    finally { busy.current = false; setPending(false); }
  };
  const create = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy.current) return;
    const form = new FormData(event.currentTarget);
    const body: GroupCreate = { name: String(form.get("name") ?? "").trim(), code: String(form.get("code") ?? "").trim(), descriptionMd: String(form.get("descriptionMd") ?? "").trim() || null, visibility: String(form.get("visibility")) as GroupCreate["visibility"], joinPolicy: String(form.get("joinPolicy")) as GroupCreate["joinPolicy"], maxMembers: Number(form.get("maxMembers")) };
    if (!body.name || body.name.length > 128 || !body.code || body.code.length > 32 || !Number.isInteger(body.maxMembers) || body.maxMembers < 1 || body.maxMembers > 500) { setActionError("이름(128자), 코드(32자), 정원(1~500명)을 확인해주세요."); return; }
    const seq = detailSeq.current;
    busy.current = true; setPending(true); setActionError(null);
    try { const made = await groupCreate(kind, body); if (seq === detailSeq.current) { setCreating(false); setMode("mine"); setPage(0); void loadList("mine", 0); await select(made.id); } }
    catch (error) { if (seq === detailSeq.current) setActionError(errorText(error)); }
    finally { busy.current = false; setPending(false); }
  };
  const loadSub = useCallback(async (view: SubMode, id: number, nextPage: number) => {
    if (view !== "members" && view !== "pending") return;
    const seq = ++subSeq.current; setSubList(null); setSubError(null);
    try { const result = view === "members" ? await groupMembers(kind, id, nextPage) : await groupWaiters(kind, id, nextPage); if (seq === subSeq.current) setSubList(result); }
    catch (error) { if (seq === subSeq.current) { setSubError(errorText(error)); if (linkedGroup && error instanceof ApiError && [403, 404].includes(error.status)) linkedGroup.onAccessLost(); } }
  }, [kind, linkedGroup]);
  const openSub = (view: SubMode) => { setMemberSelection(null); if (selectedId === null) return; setGuildCategory(null); setSub(view); setSubPage(0); setSubError(null); setActionError(null); void loadSub(view, selectedId, 0); };
  const openGuildCategory = (category: "members" | "groups" | "events", create = false) => { setMemberSelection(null); if (!me?.myRole || selectedId === null) return; setSub(category === "members" ? "members" : null); if (category === "members") { setSubPage(0); void loadSub("members", selectedId, 0); } setGuildCategory(category); setGuildCreating(create && (category === "groups" || me.myRole === "LEADER")); setGuildCategoryKey((value) => value + 1); };
  const changeSubPage = (next: number) => { setMemberSelection(null); if (selectedId === null || !sub) return; setSubPage(next); void loadSub(sub, selectedId, next); };
  const manage = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!sub || selectedId === null) return;
    const form = new FormData(event.currentTarget);
    const body = sub === "rename" ? { name: String(form.get("name") ?? "").trim() } : sub === "description" ? { descriptionMd: String(form.get("descriptionMd") ?? "") } : sub === "policy" ? { visibility: form.get("visibility"), joinPolicy: form.get("joinPolicy"), maxMembers: Number(form.get("maxMembers")) } : { inviteePlayerId: Number(form.get("inviteePlayerId")), message: String(form.get("message") ?? "") || null, expiresAt: null };
    if (sub === "invite" && (!Number.isInteger((body as { inviteePlayerId: number }).inviteePlayerId) || (body as { inviteePlayerId: number }).inviteePlayerId < 1)) { setActionError("초대할 플레이어 ID를 확인해주세요."); return; }
    if (await run(sub, body)) setSub(null); setMemberSelection(null);
  };
  const actions = new Set(me?.actions ?? []);
  const current = info ?? summary;
  const label = names[kind];
  return <div className="lag-panel-rail lag-group-shell">{dialog}
    {!linkedGroup ? <PanelStage stageKey="social-list" instant inactive={compact && (creating || selectedId !== null)}>
      <PanelFrame title={`${label} 목록`} backButton={<BackButton label={creating ? `${label} 목록으로` : "모임 분류로"} onClick={creating ? () => { detailSeq.current++; setCreating(false); setActionError(null); } : onBack} />}>
        <CreateSlot creating={creating} showCancel={false} pending={pending} onClose={() => { detailSeq.current++; setCreating(false); setActionError(null); }} list={<div className="lag-role-detail lag-group-main">
          <div className="lag-group-tabs" role="group" aria-label={`${label} 목록 종류`}>{(["mine", "search", "requests", "invitations"] as const).map((item) => <button key={item} type="button" className="lag-role-button" aria-pressed={mode === item} onClick={() => { setMode(item); setPage(0); setSelectedId(null); setSub(null); setMemberSelection(null); }}>{{ mine: "내 모임", search: "검색", requests: "내 신청", invitations: "받은 초대" }[item]}</button>)}</div>
          {mode === "search" ? <form className="lag-group-search" onSubmit={(event) => { event.preventDefault(); setPage(0); setTerm(keyword.trim()); }}><input aria-label="모임 검색어" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="이름 또는 코드 검색" /><button className="lag-role-button" type="submit">검색</button></form> : null}
          {listLoading ? <p role="status">목록을 불러오는 중…</p> : null}
          {listError ? <p role="alert">{listError} <button type="button" onClick={() => void loadList()}>다시 조회</button></p> : null}
          {!listLoading && !listError && !list?.contents.length ? <p>표시할 모임이 없습니다.</p> : null}
          {list?.contents.map((item) => { const id = "guildId" in item ? item.guildId : "partyId" in item ? item.partyId : item.id; const text = "type" in item ? `${item.name ?? label} · ${item.code ?? ""}` : `${item.name} · ${item.code}`; return id ? <SwipeButton key={`${mode}-${item.id}`} className="lag-role-node lag-group-list-row" aria-pressed={selectedId === id} onClick={() => void select(id)}><span className="lag-role-node-mark" aria-hidden>{label[0]}</span><span><strong>{text}</strong><small>{"myRole" in item ? word(item.myRole) : "type" in item ? word(item.status) : word(item.visibility)}</small></span>{!linkedGroup ? <span aria-hidden>→</span> : null}</SwipeButton> : null; })}
          <div className="lag-connection-pagination"><button type="button" className="lag-role-button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span>{list ? `${page + 1} / ${Math.max(1, list.totalPages)}` : ""}</span><button type="button" className="lag-role-button" disabled={!list || page + 1 >= list.totalPages} onClick={() => setPage(page + 1)}>다음</button></div>
        </div>}>
          <form className="lag-role-form" onSubmit={create}><h4>새 {label}</h4><label>이름<input className="lag-role-control" name="name" required maxLength={128} autoFocus /></label><label>코드 (직접 입력)<input className="lag-role-control" name="code" required maxLength={32} /></label><label>설명<textarea className="lag-role-control" name="descriptionMd" rows={3} /></label><label>공개 범위<select className="lag-role-control" name="visibility" defaultValue="PUBLIC"><option value="PUBLIC">공개</option><option value="PRIVATE">비공개</option></select></label><label>가입 방식<select className="lag-role-control" name="joinPolicy" defaultValue="OPEN"><option value="OPEN">자유 가입</option><option value="APPROVAL">승인 후 가입</option><option value="INVITE_ONLY">초대 전용</option></select></label><label>정원<input className="lag-role-control" name="maxMembers" type="number" min="1" max="500" defaultValue="20" required /></label>{actionError ? <p role="alert">{actionError}</p> : null}<button type="submit" className="lag-role-action" disabled={pending}>{pending ? "저장 중…" : `${label} 생성`}</button></form>
        </CreateSlot>
      </PanelFrame>
    </PanelStage> : null}
    {selectedId !== null ? <PanelStage stageKey="social-detail" parentStageKey={linkedGroup ? "role-group-links" : "social-list"} instant inactive={compact && (sub !== null || guildCategory !== null)}><PanelFrame title={`${label} 상세`} backButton={<BackButton label="모임 목록으로" onClick={() => { if (linkedGroup) { onBack(); return; } detailSeq.current++; subSeq.current++; setSelectedId(null); setSub(null); setMemberSelection(null); setGuildCategory(null); requestStageFocus("social-list", "back"); }} />}>
      <article className="lag-role-detail lag-group-main">
        {detailLoading ? <p role="status">상세를 불러오는 중…</p> : null}
        {detailError ? <p role="alert">{detailError} <button type="button" onClick={() => void select(selectedId)}>다시 조회</button></p> : null}
        {invitation && !current ? <><h4>{invitation.name}</h4><p>초대받은 모임 · 코드 {invitation.code}</p></> : null}
        {ownRequest && !current ? <><h4>{ownRequest.name}</h4><p>가입 신청한 모임 · 코드 {ownRequest.code}</p></> : null}
        {current ? <><h4>{current.name}</h4>{info?.descriptionMd ? <p>{info.descriptionMd}</p> : null}<dl><div className="lag-role-data-row"><dt>코드</dt><dd>{current.code}</dd></div><div className="lag-role-data-row"><dt>공개 범위</dt><dd>{word(current.visibility)}</dd></div><div className="lag-role-data-row"><dt>가입 방식</dt><dd>{word(current.joinPolicy)}</dd></div><div className="lag-role-data-row"><dt>정원</dt><dd>{current.maxMembers}명</dd></div><div className="lag-role-data-row"><dt>내 역할</dt><dd>{word(me?.myRole)}</dd></div></dl></> : null}
        {actionError ? <p role="alert">{actionError}</p> : null}
        {me ? <div className="lag-group-actions">{(["request-join", "cancel-join", "accept-invitation", "decline-invitation", "leave", "disband"] as const).filter((action) => actions.has(action)).map((action) => <button key={action} type="button" className="lag-role-button" disabled={pending} onClick={() => void run(action, action === "request-join" ? { message: null } : {}, ["leave", "disband", "decline-invitation"].includes(action), ["leave", "disband"].includes(action) ? `${label}에서 ${action === "leave" ? "탈퇴" : "해산"}할까요?` : undefined)}>{{ "request-join": "가입 신청", "cancel-join": "신청 취소", "accept-invitation": "초대 수락", "decline-invitation": "초대 거절", leave: "탈퇴", disband: "해산" }[action]}</button>)}</div> : null}
        {info && me?.myRole && kind === "guilds" ? <section className="lag-role-surface-grid" aria-label="길드 내부 분류">{(["members", "groups", "events"] as const).map((category) => <SwipeButton key={category} className="lag-role-surface-card" aria-label={{ members: "멤버", groups: "모임", events: "행사" }[category]} creation={category === "groups" || category === "events" && me.myRole === "LEADER"} onClick={() => openGuildCategory(category)} onDoubleClick={category === "groups" || category === "events" && me.myRole === "LEADER" ? () => openGuildCategory(category, true) : undefined} aria-pressed={guildCategory === category} data-selected={guildCategory === category}><span aria-hidden>{ { members: "ME", groups: "GR", events: "EV" }[category]}</span><strong>{ { members: "멤버", groups: "모임", events: "행사" }[category]}</strong><small>{ { members: "길드 구성원", groups: "연결된 모임", events: "공유 행사" }[category]}</small>{!linkedGroup ? <span aria-hidden>→</span> : null}</SwipeButton>)}</section> : null}
        {info && me?.myRole ? <div className="lag-group-actions">{(["members", "pending", "invite", "rename", "description", "policy"] as const).filter((view) => (kind !== "guilds" || view !== "members") && (view === "members" || view !== "pending" && actions.has(view) || view === "pending" && actions.has("approve"))).map((view) => <button key={view} type="button" className="lag-role-button" onClick={() => openSub(view)}>{{ members: "멤버", pending: "대기 신청", invite: "초대", rename: "이름 수정", description: "설명 수정", policy: "정책 수정" }[view]}</button>)}</div> : null}
      </article>
    </PanelFrame></PanelStage> : null}
    {selectedId !== null && sub ? <PanelStage stageKey="social-sub" parentStageKey="social-detail" instant inactive={compact && memberSelection !== null}><PanelFrame title={{ members: "멤버", pending: "대기 신청", invite: "멤버 초대", rename: "이름 수정", description: "설명 수정", policy: "정책 수정" }[sub]} backButton={<BackButton label="모임 상세로" onClick={() => { subSeq.current++; setSub(null); setMemberSelection(null); setGuildCategory(null); setActionError(null); requestStageFocus("social-detail", "back"); }} />}>
      <div className="lag-role-detail lag-group-main">
        {subError ? <p role="alert">{subError} <button type="button" onClick={() => void loadSub(sub, selectedId, subPage)}>다시 조회</button></p> : null}
        {(sub === "members" || sub === "pending") ? <>{!subList && !subError ? <p role="status">불러오는 중…</p> : null}{subList?.contents.length === 0 ? <p>표시할 항목이 없습니다.</p> : null}{subList?.contents.map((item) => <div className="lag-group-member" key={item.playerId}>{"role" in item ? <SwipeButton className="lag-role-node" creation aria-pressed={memberSelection?.member.playerId === item.playerId} onClick={() => setMemberSelection({ member: item, registration: false, entry: ++memberEntry.current })} onDoubleClick={() => setMemberSelection({ member: item, registration: true, entry: ++memberEntry.current })}><span className="lag-role-node-mark" aria-hidden>멤</span><span><strong>플레이어 #{item.playerId}</strong><small>{word(item.role)}</small></span></SwipeButton> : <><strong>플레이어 #{item.playerId}</strong><small>{item.message || "가입 대기"}</small></>}<div className="lag-group-actions">{"role" in item ? (["promote", "demote", "kick", "transfer-leader"] as const).filter((action) => actions.has(action) && item.playerId !== playerId && (action !== "promote" || item.role === "MEMBER") && (action !== "demote" || item.role === "OFFICER")).map((action) => <button key={action} className="lag-role-button" type="button" disabled={pending} onClick={() => void run(action, action === "transfer-leader" ? kind === "guilds" ? { toPlayerId: item.playerId } : { fromLeaderPlayerId: info?.leaderPlayerId, toPlayerId: item.playerId } : { targetPlayerId: item.playerId }, false, ["kick", "transfer-leader"].includes(action) ? `플레이어 #${item.playerId}에게 ${action === "kick" ? "멤버 제외" : "리더 위임"}할까요?` : undefined).then((ok) => { if (ok) { setSub(sub); void loadSub(sub, selectedId, subPage); } })}>{ { promote: "승격", demote: "강등", kick: "멤버 제외", "transfer-leader": "리더 위임" }[action] }</button>) : (["approve", "reject"] as const).filter((action) => actions.has(action)).map((action) => <button key={action} className="lag-role-button" type="button" disabled={pending} onClick={() => void run(action, { applicantPlayerId: item.playerId }).then((ok) => { if (ok) { setSub(sub); void loadSub(sub, selectedId, subPage); } })}>{action === "approve" ? "승인" : "거절"}</button>)}</div></div>)}<div className="lag-connection-pagination"><button type="button" className="lag-role-button" disabled={subPage === 0} onClick={() => changeSubPage(subPage - 1)}>이전</button><span>{subList ? `${subPage + 1} / ${Math.max(1, subList.totalPages)}` : ""}</span><button type="button" className="lag-role-button" disabled={!subList || subPage + 1 >= subList.totalPages} onClick={() => changeSubPage(subPage + 1)}>다음</button></div></> : <form className="lag-role-form" onSubmit={(event) => void manage(event)}>
          {sub === "rename" ? <label>이름<input className="lag-role-control" name="name" required defaultValue={info?.name} /></label> : sub === "description" ? <label>설명<textarea className="lag-role-control" name="descriptionMd" rows={4} defaultValue={info?.descriptionMd ?? ""} /></label> : sub === "policy" ? <><label>공개 범위<select className="lag-role-control" name="visibility" defaultValue={info?.visibility}><option value="PUBLIC">공개</option><option value="PRIVATE">비공개</option></select></label><label>가입 방식<select className="lag-role-control" name="joinPolicy" defaultValue={info?.joinPolicy}><option value="OPEN">자유 가입</option><option value="APPROVAL">승인 후 가입</option><option value="INVITE_ONLY">초대 전용</option></select></label><label>정원<input className="lag-role-control" name="maxMembers" type="number" min="1" max="500" required defaultValue={info?.maxMembers} /></label></> : <><label>플레이어 ID<input className="lag-role-control" name="inviteePlayerId" type="number" min="1" required /></label><label>메시지<textarea className="lag-role-control" name="message" rows={3} /></label></>}
          {actionError ? <p role="alert">{actionError}</p> : null}<button type="submit" className="lag-role-action" disabled={pending}>{pending ? "처리 중…" : "저장"}</button></form>}
      </div>
    </PanelFrame></PanelStage> : null}
    {selectedId !== null && sub === "members" && memberSelection ? <MemberPersonPanel key={`${selectedId}:${memberSelection.member.playerId}:${memberSelection.entry}`} context={{ groupType: kind === "guilds" ? "GUILD" : "PARTY", groupId: selectedId, memberPlayerId: memberSelection.member.playerId }} member={memberSelection.member} originRole={originRole} parentStageKey="social-sub" registration={memberSelection.registration} onBack={() => setMemberSelection(null)} onPrivacyLost={privacyLost} /> : null}
    {kind === "guilds" && selectedId !== null && me?.myRole && guildCategory === "groups" ? <GuildGroupPanels key={`${selectedId}-${guildCategoryKey}`} guildId={selectedId} onAccessLost={linkedGroup?.onAccessLost} playerId={playerId} creating={guildCreating} onBack={() => { setGuildCategory(null); requestStageFocus("social-detail", "back"); }} /> : null}
    {kind === "guilds" && selectedId !== null && me?.myRole && guildCategory === "events" ? <GuildEventPanels key={`${selectedId}-${guildCategoryKey}`} guildId={selectedId} onAccessLost={linkedGroup?.onAccessLost} creating={guildCreating} onBack={() => { setGuildCategory(null); requestStageFocus("social-detail", "back"); }} /> : null}
  </div>;
}
