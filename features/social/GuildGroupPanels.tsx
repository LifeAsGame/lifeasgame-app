"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { rolePartyDetail, myRoleParties } from "@/features/role/roleParties";
import { SwipeButton } from "@/features/role/RecordRow";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import PanelStage from "@/shared/ui/PanelStage";
import CreateSlot from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { groupCreate, groupInfo, groupMe, groupMine, groupPreview } from "./groups";
import type { GroupCreate } from "./groups";
import { decideGuildLink, guildLinks, guildPendingLinks, proposeGuildLink, unlinkGuildGroup } from "./guildInsideApi";
import type { GuildLink } from "./guildInsideApi";

const errorText = (error: unknown) => error instanceof ApiError ? error.status === 404 ? "모임을 찾을 수 없거나 접근 권한이 없습니다." : error.status === 403 ? "현재 리더 권한이 없습니다." : error.status === 409 ? "상태가 바뀌었습니다. 다시 조회해주세요." : error.message : error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";
const kindName = (type: GuildLink["groupType"]) => type === "PARTY" ? "일반 파티" : "역할 소모임";

export default function GuildGroupPanels({ guildId, playerId, creating, onBack }: { guildId: number; playerId: number; creating: boolean; onBack: () => void }) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const { confirm, dialog } = useSaoConfirm();
  const [tab, setTab] = useState<"active" | "pending">("active"), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [list, setList] = useState<GuildLink[]>([]), [totalPages, setTotalPages] = useState(0), [loading, setLoading] = useState(true), [listError, setListError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(creating), [newParty, setNewParty] = useState(false), [createdParty, setCreatedParty] = useState<number | null>(null);
  const [selected, setSelected] = useState<GuildLink | null>(null), [source, setSource] = useState<{ name: string; description?: string | null } | null>(null);
  const [guildLeader, setGuildLeader] = useState(false), [groupLeader, setGroupLeader] = useState(false), [detailLoading, setDetailLoading] = useState(false);
  const [sourceType, setSourceType] = useState<GuildLink["groupType"]>("PARTY"), [owned, setOwned] = useState<{ id: number; name: string }[]>([]), [ownedPage, setOwnedPage] = useState(0), [ownedPages, setOwnedPages] = useState(0);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const listSeq = useRef(0), detailSeq = useRef(0), ownedSeq = useRef(0), lock = useRef(false);
  const load = useCallback(async () => {
    const seq = ++listSeq.current; setLoading(true); setListError(null);
    try { const result = tab === "active" ? await guildLinks(guildId, page) : await guildPendingLinks(guildId, page); if (seq === listSeq.current) { setList(result.contents); setTotalPages(result.totalPages); } }
    catch (caught) { if (seq === listSeq.current) { setList([]); setListError(errorText(caught)); } }
    finally { if (seq === listSeq.current) setLoading(false); }
  }, [guildId, tab, page]);
  useEffect(() => { const listCounter = listSeq, detailCounter = detailSeq, ownedCounter = ownedSeq; void load(); return () => { listCounter.current++; detailCounter.current++; ownedCounter.current++; }; }, [load, revision]);
  useEffect(() => { setFormOpen(creating); setSelected(null); }, [creating]);
  const authority = async (item: GuildLink) => {
    const ownGuild = await groupMe("guilds", guildId);
    let ownGroup = false;
    if (item.groupType === "PARTY") { try { ownGroup = (await groupMe("parties", item.groupId)).myRole === "LEADER"; } catch { /* Guild leader may not belong to the source group. */ } }
    else { try { ownGroup = (await rolePartyDetail(item.groupId)).leaderPlayerId === playerId; } catch { /* Source membership remains private. */ } }
    return { guild: ownGuild.myRole === "LEADER", group: ownGroup };
  };
  const open = async (item: GuildLink) => {
    const seq = ++detailSeq.current; setSelected(item); setSource(null); setError(null); setDetailLoading(true);
    try {
      const rights = await authority(item);
      let nextSource: typeof source = null;
      if (item.status === "ACTIVE" && item.entryAction === "OPEN_DETAIL") nextSource = item.groupType === "PARTY" ? await groupInfo("parties", item.groupId).then((result) => ({ name: result.name, description: result.descriptionMd })) : await rolePartyDetail(item.groupId);
      if (item.status === "ACTIVE" && item.entryAction === "OPEN_PUBLIC_PREVIEW" && item.groupType === "PARTY") nextSource = await groupPreview("parties", item.groupId);
      if (seq === detailSeq.current) { setGuildLeader(rights.guild); setGroupLeader(rights.group); setSource(nextSource); }
    } catch (caught) { if (seq === detailSeq.current) setError(errorText(caught)); }
    finally { if (seq === detailSeq.current) setDetailLoading(false); }
  };
  const close = () => { detailSeq.current++; setSelected(null); setSource(null); setError(null); };
  const ownedGroups = useCallback(async () => {
    const seq = ++ownedSeq.current; setError(null); setOwned([]);
    try {
      if (sourceType === "PARTY") { const result = await groupMine("parties", ownedPage); if (seq === ownedSeq.current) { setOwnedPages(result.totalPages); setOwned(result.contents.filter((item) => item.myRole === "LEADER" && item.status === "ACTIVE").map((item) => ({ id: item.id, name: item.name }))); } }
      else { const result = await myRoleParties(ownedPage); if (seq === ownedSeq.current) { setOwnedPages(result.totalPages); setOwned(result.contents.filter((item) => item.membershipStatus === "ACTIVE" && item.group.status === "ACTIVE" && item.group.leaderPlayerId === playerId).map((item) => ({ id: item.group.id, name: item.group.name }))); } }
    } catch (caught) { if (seq === ownedSeq.current) setError(errorText(caught)); }
  }, [sourceType, ownedPage, playerId]);
  useEffect(() => { const counter = ownedSeq; if (formOpen) void ownedGroups(); return () => { counter.current++; }; }, [formOpen, ownedGroups]);
  const propose = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current) return;
    const form = new FormData(event.currentTarget), displayName = String(form.get("displayName") ?? "").trim();
    const groupId = createdParty ?? Number(form.get("groupId"));
    if (!displayName || displayName.length > 120 || !newParty && (!Number.isInteger(groupId) || groupId < 1)) { setError("길드 공개 이름(1~120자)과 모임을 확인해주세요."); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      let id = groupId;
      if (newParty && createdParty === null) {
        const party: GroupCreate = { name: String(form.get("name") ?? "").trim(), code: String(form.get("code") ?? "").trim(), descriptionMd: String(form.get("descriptionMd") ?? "").trim() || null, visibility: String(form.get("visibility")) as GroupCreate["visibility"], joinPolicy: String(form.get("joinPolicy")) as GroupCreate["joinPolicy"], maxMembers: Number(form.get("maxMembers")) };
        if (!party.name || party.name.length > 128 || !party.code || party.code.length > 32 || !Number.isInteger(party.maxMembers) || party.maxMembers < 1 || party.maxMembers > 500) { setError("파티 이름·코드·정원을 확인해주세요."); return; }
        const made = await groupCreate("parties", party); id = made.id; setCreatedParty(id);
      }
      const link = await proposeGuildLink(guildId, newParty ? "PARTY" : sourceType, id, displayName);
      setCreatedParty(null); setFormOpen(false); listSeq.current++; setPage(0);
      setTab(link.status === "PENDING" ? "pending" : "active"); setRevision((value) => value + 1);
    } catch (caught) { setError(errorText(caught)); }
    finally { lock.current = false; setBusy(false); }
  };
  const act = async (item: GuildLink, action: "approve" | "reject" | "cancel" | "unlink", displayName?: string) => {
    if (lock.current) return;
    const seq = detailSeq.current;
    if ((action === "unlink" || action === "reject") && !await confirm(action === "unlink" ? "길드에서 이 모임 연결을 해제할까요? 모임 가입은 유지됩니다." : "연결 제안을 거절할까요?")) return;
    lock.current = true; setBusy(true); setError(null); setDetailLoading(true);
    try {
      const rights = await authority(item);
      if (seq !== detailSeq.current) return;
      setGuildLeader(rights.guild); setGroupLeader(rights.group);
      const canApprove = rights.guild && !item.guildLeaderApproved || rights.group && !item.groupLeaderApproved;
      if (action === "approve" && !canApprove || action === "cancel" && item.proposedByPlayerId !== playerId || (action === "reject" || action === "unlink") && !rights.guild && !rights.group) { setError("현재 권한이 바뀌었습니다. 다시 조회해주세요."); return; }
      const result = action === "unlink" ? await unlinkGuildGroup(guildId, item.id) : await decideGuildLink(guildId, item.id, action, displayName);
      close(); listSeq.current++; setPage(0);
      setTab(action === "approve" && result?.status === "ACTIVE" ? "active" : "pending"); setRevision((value) => value + 1);
    } catch (caught) {
      if (seq === detailSeq.current) {
        setError(errorText(caught));
        if (caught instanceof ApiError && caught.status === 409) {
          setDetailLoading(true);
          try {
            const listed = await (item.status === "ACTIVE" ? guildLinks(guildId, page) : guildPendingLinks(guildId, page));
            const current = listed.contents.find((link) => link.id === item.id) ?? (item.status === "PENDING" ? (await guildLinks(guildId, 0)).contents.find((link) => link.id === item.id) : undefined);
            if (current) { const rights = await authority(current); if (seq === detailSeq.current) { setSelected(current); setSource(null); setGuildLeader(rights.guild); setGroupLeader(rights.group); if (current.status === "ACTIVE") { setTab("active"); setPage(0); } } }
            else if (seq === detailSeq.current) close();
          } catch { if (seq === detailSeq.current) { setGuildLeader(false); setGroupLeader(false); } }
          finally { if (seq === detailSeq.current) setDetailLoading(false); }
        }
      }
      setRevision((value) => value + 1);
    }
    finally { lock.current = false; setBusy(false); if (seq === detailSeq.current) setDetailLoading(false); }
  };
  const form = <form className="lag-role-form" onSubmit={(event) => void propose(event)}>
    <label>연결 방식<select className="lag-role-control" value={newParty ? "NEW" : sourceType} disabled={createdParty !== null} onChange={(event) => { const value = event.target.value; setNewParty(value === "NEW"); if (value !== "NEW") setSourceType(value as GuildLink["groupType"]); setOwnedPage(0); setError(null); }}><option value="PARTY">기존 일반 파티</option><option value="ROLE_PARTY">기존 역할 소모임</option><option value="NEW">새 일반 파티 만들기</option></select></label>
    {!newParty ? <><label>내가 리더인 모임<select key={`${sourceType}-${ownedPage}`} className="lag-role-control" name="groupId" defaultValue="" required><option value="">모임 선택</option>{owned.map((item) => <option key={item.id} value={item.id}>{item.name} #{item.id}</option>)}</select></label><div className="lag-connection-pagination"><button type="button" disabled={ownedPage === 0} onClick={() => setOwnedPage(ownedPage - 1)}>이전</button><span>{ownedPage + 1} / {Math.max(1, ownedPages)}</span><button type="button" disabled={ownedPage + 1 >= ownedPages} onClick={() => setOwnedPage(ownedPage + 1)}>다음</button></div>{sourceType === "ROLE_PARTY" ? <p>역할 소모임은 자신의 활성 역할 화면에서 생성할 수 있습니다.</p> : null}</> : createdParty !== null ? <p>파티 #{createdParty} 생성 완료 · 연결만 다시 시도할 수 있습니다.</p> : <><label>파티 이름<input className="lag-role-control" name="name" required maxLength={128} /></label><label>파티 코드<input className="lag-role-control" name="code" required maxLength={32} /></label><label>파티 설명<textarea className="lag-role-control" name="descriptionMd" rows={3} /></label><label>공개 범위<select className="lag-role-control" name="visibility"><option value="PRIVATE">비공개</option><option value="PUBLIC">공개</option></select></label><label>가입 방식<select className="lag-role-control" name="joinPolicy"><option value="INVITE_ONLY">초대 전용</option><option value="APPROVAL">승인 후 가입</option><option value="OPEN">자유 가입</option></select></label><label>정원<input className="lag-role-control" name="maxMembers" type="number" min="1" max="500" defaultValue="20" required /></label></>}
    <label>길드 멤버에게 보일 별도 이름<input className="lag-role-control" name="displayName" maxLength={120} required /></label><p>이 이름만 길드에 공개됩니다. 기존 비공개 이름과 설명은 복사하지 않습니다.</p>{error ? <p role="alert">{error}</p> : null}<button type="submit" className="lag-role-action" disabled={busy}>{createdParty !== null ? "연결 다시 시도" : "연결 제안"}</button>
  </form>;
  return <>{dialog}<PanelStage stageKey="guild-groups-list" instant inactive={compact && selected !== null}><PanelFrame title={formOpen ? "모임 연결" : "길드 모임"} backButton={<BackButton label={formOpen ? "모임 목록으로" : "길드 상세로"} onClick={formOpen ? () => { setFormOpen(false); setError(null); } : onBack} />}><CreateSlot creating={formOpen} showCancel={false} pending={busy} onClose={() => setFormOpen(false)} list={<div className="lag-role-detail lag-group-main"><div className="lag-group-tabs"><button type="button" className="lag-role-button" aria-pressed={tab === "active"} onClick={() => { setTab("active"); setPage(0); close(); }}>연결된 모임</button><button type="button" className="lag-role-button" aria-pressed={tab === "pending"} onClick={() => { setTab("pending"); setPage(0); close(); }}>대기 연결</button></div>{loading ? <p role="status">모임을 불러오는 중…</p> : null}{listError ? <p role="alert">{listError} <button type="button" onClick={() => void load()}>다시 조회</button></p> : null}{!loading && !listError && !list.length ? <p>표시할 모임이 없습니다.</p> : null}{list.map((item) => <SwipeButton key={item.id} className="lag-role-node" aria-pressed={selected?.id === item.id} onClick={() => void open(item)}><span className="lag-role-node-mark" aria-hidden>{item.groupType === "PARTY" ? "파" : "역"}</span><span><strong>{item.displayName}</strong><small>{kindName(item.groupType)} · {item.status === "PENDING" ? "승인 대기" : "연결됨"}</small></span><span aria-hidden>→</span></SwipeButton>)}<div className="lag-connection-pagination"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span>{page + 1} / {Math.max(1, totalPages)}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>다음</button></div></div>}>{form}</CreateSlot></PanelFrame></PanelStage>
    {selected ? <PanelStage stageKey="guild-groups-detail" instant><PanelFrame title="길드 모임 상세" backButton={<BackButton label="모임 목록으로" onClick={close} />}><article className="lag-role-detail lag-group-main"><h4>{selected.displayName}</h4><p>{kindName(selected.groupType)} · {selected.status === "ACTIVE" ? "연결됨" : "승인 대기"}</p>{detailLoading ? <p role="status">현재 권한 확인 중…</p> : null}{source ? <><p>{source.name}</p>{source.description ? <p>{source.description}</p> : null}</> : selected.status === "ACTIVE" && selected.entryAction === "INVITE_REQUIRED" ? <p>모임 상세는 멤버 초대가 필요합니다. 길드 연결만으로 가입되지 않습니다.</p> : null}{selected.status === "ACTIVE" && selected.entryAction === "OPEN_PUBLIC_PREVIEW" ? <p>공개 미리보기입니다. 멤버 전용 내용은 모임 가입 후 볼 수 있습니다.</p> : null}
      {selected.status === "PENDING" && !detailLoading ? <>{guildLeader && !selected.guildLeaderApproved || groupLeader && !selected.groupLeaderApproved ? <form className="lag-role-form" onSubmit={(event) => { event.preventDefault(); void act(selected, "approve", selected.displayName); }}><p>승인할 길드 공개 이름: <strong>{selected.displayName}</strong></p><button className="lag-role-action" disabled={busy}>연결 승인</button></form> : null}<div className="lag-role-actions">{guildLeader || groupLeader ? <button type="button" className="lag-role-button" disabled={busy} onClick={() => void act(selected, "reject")}>제안 거절</button> : null}{selected.proposedByPlayerId === playerId ? <button type="button" className="lag-role-button" disabled={busy} onClick={() => void act(selected, "cancel")}>제안 취소</button> : null}</div><p>공개 이름을 바꾸려면 제안을 취소한 뒤 새로 제안하세요.</p></> : null}
      {selected.status === "ACTIVE" && !detailLoading && (guildLeader || groupLeader) ? <div className="lag-role-actions"><button type="button" className="lag-role-button" disabled={busy} onClick={() => void act(selected, "unlink")}>길드 연결 해제</button></div> : null}{error ? <p role="alert">{error} <button type="button" onClick={() => void open(selected)}>다시 조회</button></p> : null}</article></PanelFrame></PanelStage> : null}</>;
}
