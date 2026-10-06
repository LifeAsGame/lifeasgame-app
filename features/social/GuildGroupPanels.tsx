"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { RoleDetail } from "@/shared/api/types";
import { rolePartyDetail, myRoleParties } from "@/features/role/roleParties";
import { listRolesApi } from "@/features/role/api";
import { linkRoleGroup } from "@/features/role/contextApi";
import { RoleForm } from "@/features/role/RoleForm";
import { SwipeButton } from "@/features/role/RecordRow";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import PanelStage from "@/shared/ui/PanelStage";
import CreateSlot from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { groupInfo, groupMe, groupMine, groupPreview } from "./groups";
import { createGuildGroup, decideGuildLink, guildLinks, guildPendingLinks, proposeGuildLink, unlinkGuildGroup } from "./guildInsideApi";
import type { GuildGroupCreateInput, GuildGroupCreateResult, GuildLink } from "./guildInsideApi";

const errorText = (error: unknown) => error instanceof ApiError ? error.status === 404 ? "모임을 찾을 수 없거나 접근 권한이 없습니다." : error.status === 403 ? "현재 리더 권한이 없습니다." : error.status === 409 ? "상태가 바뀌었습니다. 다시 조회해주세요." : error.message : error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";
const kindName = (type: GuildLink["groupType"]) => type === "PARTY" ? "일반 파티" : "역할 소모임";
type FormMode = "NEW_PARTY" | "NEW_ROLE_PARTY" | "EXISTING_PARTY" | "EXISTING_ROLE_PARTY";

export default function GuildGroupPanels({ guildId, playerId, creating, onBack, onAccessLost }: { onAccessLost?: () => void; guildId: number; playerId: number; creating: boolean; onBack: () => void }) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const { confirm, dialog } = useSaoConfirm();
  const [tab, setTab] = useState<"active" | "pending">("active"), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [list, setList] = useState<GuildLink[]>([]), [totalPages, setTotalPages] = useState(0), [loading, setLoading] = useState(true), [listError, setListError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(creating), [formMode, setFormMode] = useState<FormMode>("NEW_PARTY");
  const [created, setCreated] = useState<{ result: GuildGroupCreateResult; roleId: number } | null>(null);
  const [roles, setRoles] = useState<RoleDetail[]>([]), [roleId, setRoleId] = useState<number | null>(null), [roleFormOpen, setRoleFormOpen] = useState(false);
  const [selected, setSelected] = useState<GuildLink | null>(null), [source, setSource] = useState<{ name: string; description?: string | null } | null>(null);
  const [guildLeader, setGuildLeader] = useState(false), [groupLeader, setGroupLeader] = useState(false), [detailLoading, setDetailLoading] = useState(false);
  const [sourceType, setSourceType] = useState<GuildLink["groupType"]>("PARTY"), [owned, setOwned] = useState<{ id: number; name: string }[]>([]), [ownedPage, setOwnedPage] = useState(0), [ownedPages, setOwnedPages] = useState(0);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const listSeq = useRef(0), detailSeq = useRef(0), ownedSeq = useRef(0), lock = useRef(false);
  const request = useRef<{ payload: string; key: string } | null>(null);
  const formDraft = useRef<Record<string, string>>({});
  const load = useCallback(async () => {
    const seq = ++listSeq.current; setLoading(true); setListError(null);
    try { const result = tab === "active" ? await guildLinks(guildId, page) : await guildPendingLinks(guildId, page); if (seq === listSeq.current) { setList(result.contents); setTotalPages(result.totalPages); } }
    catch (caught) { if (caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.(); if (seq === listSeq.current) { setList([]); setListError(errorText(caught)); } }
    finally { if (seq === listSeq.current) setLoading(false); }
  }, [guildId, tab, page, onAccessLost]);
  useEffect(() => { const listCounter = listSeq, detailCounter = detailSeq, ownedCounter = ownedSeq; void load(); return () => { listCounter.current++; detailCounter.current++; ownedCounter.current++; }; }, [load, revision]);
  useEffect(() => { setFormOpen(creating); setSelected(null); if (creating) { setFormMode("NEW_PARTY"); setCreated(null); setRoleFormOpen(false); request.current = null; formDraft.current = {}; } }, [creating]);
  useEffect(() => { if (formOpen && formMode === "NEW_ROLE_PARTY") void listRolesApi().then((items) => setRoles(items.filter((item) => item.status === "ACTIVE"))).catch((caught) => setError(errorText(caught))); }, [formOpen, formMode]);
  const authority = async (item: GuildLink) => {
    const ownGuild = await groupMe("guilds", guildId);
    let ownGroup = false;
    if (item.groupType === "PARTY") { try { ownGroup = (await groupMe("parties", item.groupId)).myRole === "LEADER"; } catch { /* Guild leader may not belong to the source group. */ } }
    else { try { ownGroup = (await rolePartyDetail(item.groupId)).leaderPlayerId === playerId; } catch { /* Source membership remains private. */ } }
    return { guild: ownGuild.myRole === "LEADER", group: ownGroup };
  };
  const open = async (item: GuildLink) => {
    const seq = ++detailSeq.current; setSelected(item); setSource(null); setError(null); setGuildLeader(false); setGroupLeader(false); setDetailLoading(true);
    try {
      const rights = await authority(item);
      let nextSource: typeof source = null;
      if (item.status === "ACTIVE" && item.entryAction === "OPEN_DETAIL") nextSource = item.groupType === "PARTY" ? await groupInfo("parties", item.groupId).then((result) => ({ name: result.name, description: result.descriptionMd })) : await rolePartyDetail(item.groupId);
      if (item.status === "ACTIVE" && item.entryAction === "OPEN_PUBLIC_PREVIEW" && item.groupType === "PARTY") nextSource = await groupPreview("parties", item.groupId);
      if (seq === detailSeq.current) { setGuildLeader(rights.guild); setGroupLeader(rights.group); setSource(nextSource); }
    } catch (caught) { if (caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.(); if (seq === detailSeq.current) setError(errorText(caught)); }
    finally { if (seq === detailSeq.current) setDetailLoading(false); }
  };
  const close = () => { detailSeq.current++; setSelected(null); setSource(null); setError(null); };
  const ownedGroups = useCallback(async () => {
    const seq = ++ownedSeq.current; setError(null); setOwned([]);
    try {
      if (sourceType === "PARTY") { const result = await groupMine("parties", ownedPage); if (seq === ownedSeq.current) { setOwnedPages(result.totalPages); setOwned(result.contents.filter((item) => item.myRole === "LEADER" && item.status === "ACTIVE").map((item) => ({ id: item.id, name: item.name }))); } }
      else { const result = await myRoleParties(ownedPage); if (seq === ownedSeq.current) { setOwnedPages(result.totalPages); setOwned(result.contents.filter((item) => item.membershipStatus === "ACTIVE" && item.group.status === "ACTIVE" && item.group.leaderPlayerId === playerId).map((item) => ({ id: item.group.id, name: item.group.name }))); } }
    } catch (caught) { if (caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.(); if (seq === ownedSeq.current) setError(errorText(caught)); }
  }, [sourceType, ownedPage, playerId, onAccessLost]);
  useEffect(() => { const counter = ownedSeq; if (formOpen && formMode.startsWith("EXISTING")) void ownedGroups(); return () => { counter.current++; }; }, [formOpen, formMode, ownedGroups]);
  const propose = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current) return;
    const form = new FormData(event.currentTarget), displayName = String(form.get("displayName") ?? "").trim();
    const existing = formMode.startsWith("EXISTING"), groupId = Number(form.get("groupId"));
    if (!created && (!displayName || displayName.length > 120 || existing && (!Number.isInteger(groupId) || groupId < 1))) { setError("길드 공개 이름(1~120자)과 모임을 확인해주세요."); return; }
    lock.current = true; setBusy(true); setError(null);
    let personalLink = false;
    try {
      if (existing) {
        const link = await proposeGuildLink(guildId, sourceType, groupId, displayName);
        setFormOpen(false); listSeq.current++; setPage(0);
        setTab(link.status === "PENDING" ? "pending" : "active"); setRevision((value) => value + 1);
      } else if (created) {
        personalLink = true;
        await linkRoleGroup(created.roleId, { groupType: "ROLE_PARTY", groupId: created.result.groupId });
        setCreated(null); setFormOpen(false);
      } else {
        const name = String(form.get("name") ?? "").trim(), maxMembers = Number(form.get("maxMembers"));
        if (!name || !Number.isInteger(maxMembers)) { setError("이름과 정원을 확인해주세요."); return; }
        const input: Omit<GuildGroupCreateInput, "clientRequestId"> = formMode === "NEW_PARTY" ? {
          groupType: "PARTY", displayName,
          party: { name, code: String(form.get("code") ?? "").trim(), descriptionMd: String(form.get("descriptionMd") ?? "").trim() || null, visibility: String(form.get("visibility")) as "PRIVATE" | "PUBLIC", joinPolicy: String(form.get("joinPolicy")) as "OPEN" | "APPROVAL" | "INVITE_ONLY", maxMembers },
        } : {
          groupType: "ROLE_PARTY", displayName,
          roleParty: { roleId: roleId ?? 0, name, description: String(form.get("description") ?? "").trim() || null, maxMembers },
        };
        if (formMode === "NEW_PARTY" && (!input.party?.code || name.length > 128 || input.party.code.length > 32 || maxMembers < 1 || maxMembers > 500) || formMode === "NEW_ROLE_PARTY" && (!roleId || !roles.some((role) => role.id === roleId) || name.length > 120 || maxMembers < 2 || maxMembers > 50)) { setError(formMode === "NEW_PARTY" ? "파티 이름·코드·정원을 확인해주세요." : "내 활성 역할·소모임 이름·정원을 확인해주세요."); return; }
        const payload = JSON.stringify(input);
        if (!request.current || request.current.payload !== payload) request.current = { payload, key: crypto.randomUUID() };
        const made = await createGuildGroup(guildId, { ...input, clientRequestId: request.current.key });
        listSeq.current++; setPage(0); setTab(made.linkStatus === "PENDING" ? "pending" : "active"); setRevision((value) => value + 1);
        if (made.groupType === "ROLE_PARTY" && made.capabilities.canLinkToPersonalRole && roleId) {
          setCreated({ result: made, roleId });
          personalLink = true;
          await linkRoleGroup(roleId, { groupType: "ROLE_PARTY", groupId: made.groupId });
          setCreated(null);
        }
        setFormOpen(false);
      }
    } catch (caught) { if (!personalLink && caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.(); setError(personalLink ? `모임 생성은 완료됐습니다. 내 역할 연결을 다시 시도해주세요. ${errorText(caught)}` : errorText(caught)); }
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
    } catch (caught) { if (caught instanceof ApiError && [403, 404].includes(caught.status)) onAccessLost?.();
      if (seq === detailSeq.current) {
        setError(errorText(caught)); setGuildLeader(false); setGroupLeader(false);
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
  const form = roleFormOpen ? <div className="lag-role-detail"><RoleForm roles={roles} onCancel={() => setRoleFormOpen(false)} onSaved={async (role) => { setRoles((items) => [...items, role]); setRoleId(role.id); setRoleFormOpen(false); }} /></div> : <form className="lag-role-form" onSubmit={(event) => void propose(event)}>
    <label>모임 방식<select className="lag-role-control" value={formMode} disabled={Boolean(created)} onChange={(event) => { const value = event.target.value as FormMode; setFormMode(value); setSourceType(value === "EXISTING_ROLE_PARTY" ? "ROLE_PARTY" : "PARTY"); setOwnedPage(0); setError(null); request.current = null; }}><option value="NEW_PARTY">새 일반 파티 만들기</option><option value="NEW_ROLE_PARTY">새 역할 소모임 만들기</option><option value="EXISTING_PARTY">기존 일반 파티 연결</option><option value="EXISTING_ROLE_PARTY">기존 역할 소모임 연결</option></select></label>
    {formMode.startsWith("EXISTING") ? <><label>내가 리더인 모임<select key={`${sourceType}-${ownedPage}`} className="lag-role-control" name="groupId" defaultValue="" required><option value="">모임 선택</option>{owned.map((item) => <option key={item.id} value={item.id}>{item.name} #{item.id}</option>)}</select></label><div className="lag-connection-pagination"><button type="button" disabled={ownedPage === 0} onClick={() => setOwnedPage(ownedPage - 1)}>이전</button><span>{ownedPage + 1} / {Math.max(1, ownedPages)}</span><button type="button" disabled={ownedPage + 1 >= ownedPages} onClick={() => setOwnedPage(ownedPage + 1)}>다음</button></div></> : created ? <p role="status">{kindName(created.result.groupType)} #{created.result.groupId} 생성 완료 · 내 역할 연결만 다시 시도합니다.</p> : <>
      {formMode === "NEW_ROLE_PARTY" ? <><label>내 활성 역할<select className="lag-role-control" value={roleId ?? ""} onChange={(event) => setRoleId(Number(event.target.value) || null)} required><option value="">역할 선택</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><button type="button" className="lag-role-button" onClick={(event) => { formDraft.current = Object.fromEntries(new FormData(event.currentTarget.form!).entries()) as Record<string, string>; setRoleFormOpen(true); }}>새 역할 만들기</button></> : null}
      <label>{formMode === "NEW_PARTY" ? "파티 이름" : "소모임 이름"}<input className="lag-role-control" name="name" required maxLength={formMode === "NEW_PARTY" ? 128 : 120} defaultValue={formDraft.current.name ?? ""} /></label>
      {formMode === "NEW_PARTY" ? <><label>파티 코드<input className="lag-role-control" name="code" required maxLength={32} defaultValue={formDraft.current.code ?? ""} /></label><label>파티 설명<textarea className="lag-role-control" name="descriptionMd" rows={3} defaultValue={formDraft.current.descriptionMd ?? ""} /></label><label>공개 범위<select className="lag-role-control" name="visibility" defaultValue={formDraft.current.visibility ?? "PRIVATE"}><option value="PRIVATE">비공개</option><option value="PUBLIC">공개</option></select></label><label>가입 방식<select className="lag-role-control" name="joinPolicy" defaultValue={formDraft.current.joinPolicy ?? "INVITE_ONLY"}><option value="INVITE_ONLY">초대 전용</option><option value="APPROVAL">승인 후 가입</option><option value="OPEN">자유 가입</option></select></label></> : <label>소모임 설명<textarea className="lag-role-control" name="description" maxLength={1000} rows={3} defaultValue={formDraft.current.description ?? ""} /></label>}
      <label>정원 (리더 포함)<input className="lag-role-control" name="maxMembers" type="number" min={formMode === "NEW_PARTY" ? 1 : 2} max={formMode === "NEW_PARTY" ? 500 : 50} defaultValue={formDraft.current.maxMembers ?? (formMode === "NEW_PARTY" ? 20 : 10)} required /></label>
    </>}
    {!created ? <><label>길드 멤버에게 보일 별도 이름<input className="lag-role-control" name="displayName" maxLength={120} required defaultValue={formDraft.current.displayName ?? ""} /></label><p>길드에는 이 이름만 공개됩니다. 소모임 가입은 별도로 관리됩니다.</p></> : null}
    {error ? <p role="alert">{error}</p> : null}<button type="submit" className="lag-role-action" disabled={busy}>{created ? "내 역할 연결 다시 시도" : formMode.startsWith("EXISTING") ? "기존 모임 연결 제안" : "길드에서 모임 만들기"}</button>
  </form>;
  return <>{dialog}<PanelStage stageKey="guild-groups-list" parentStageKey="social-detail" instant inactive={compact && selected !== null}><PanelFrame title={formOpen ? roleFormOpen ? "새 역할 만들기" : "길드에서 모임 만들기" : "길드 모임"} backButton={<BackButton label={roleFormOpen ? "모임 생성으로" : formOpen ? "모임 목록으로" : "길드 상세로"} onClick={roleFormOpen ? () => setRoleFormOpen(false) : formOpen ? () => { setFormOpen(false); setError(null); } : onBack} />}><CreateSlot creating={formOpen} showCancel={false} pending={busy} onClose={() => setFormOpen(false)} list={<div className="lag-role-detail lag-group-main"><div className="lag-group-tabs"><button type="button" className="lag-role-button" aria-pressed={tab === "active"} onClick={() => { setTab("active"); setPage(0); close(); }}>연결된 모임</button><button type="button" className="lag-role-button" aria-pressed={tab === "pending"} onClick={() => { setTab("pending"); setPage(0); close(); }}>대기 연결</button></div>{loading ? <p role="status">모임을 불러오는 중…</p> : null}{listError ? <p role="alert">{listError} <button type="button" onClick={() => void load()}>다시 조회</button></p> : null}{!loading && !listError && !list.length ? <p>표시할 모임이 없습니다.</p> : null}{list.map((item) => <SwipeButton key={item.id} className="lag-role-node" aria-pressed={selected?.id === item.id} onClick={() => void open(item)}><span className="lag-role-node-mark" aria-hidden>{item.groupType === "PARTY" ? "파" : "역"}</span><span><strong>{item.displayName}</strong><small>{kindName(item.groupType)} · {item.status === "PENDING" ? "승인 대기" : "연결됨"}</small></span><span aria-hidden>→</span></SwipeButton>)}<div className="lag-connection-pagination"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span>{page + 1} / {Math.max(1, totalPages)}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>다음</button></div></div>}>{form}</CreateSlot></PanelFrame></PanelStage>
    {selected ? <PanelStage stageKey="guild-groups-detail" parentStageKey="guild-groups-list" instant><PanelFrame title="길드 모임 상세" backButton={<BackButton label="모임 목록으로" onClick={close} />}><article className="lag-role-detail lag-group-main"><h4>{selected.displayName}</h4><p>{kindName(selected.groupType)} · {selected.status === "ACTIVE" ? "연결됨" : "승인 대기"}</p>{detailLoading ? <p role="status">현재 권한 확인 중…</p> : null}{source ? <><p>{source.name}</p>{source.description ? <p>{source.description}</p> : null}</> : selected.status === "ACTIVE" && selected.entryAction === "INVITE_REQUIRED" ? <p>모임 상세는 멤버 초대가 필요합니다. 길드 연결만으로 가입되지 않습니다.</p> : null}{selected.status === "ACTIVE" && selected.entryAction === "OPEN_PUBLIC_PREVIEW" ? <p>공개 미리보기입니다. 멤버 전용 내용은 모임 가입 후 볼 수 있습니다.</p> : null}
      {selected.status === "PENDING" && !detailLoading ? <>{guildLeader && !selected.guildLeaderApproved || groupLeader && !selected.groupLeaderApproved ? <form className="lag-role-form" onSubmit={(event) => { event.preventDefault(); void act(selected, "approve", selected.displayName); }}><p>승인할 길드 공개 이름: <strong>{selected.displayName}</strong></p><button className="lag-role-action" disabled={busy}>연결 승인</button></form> : null}<div className="lag-role-actions">{guildLeader || groupLeader ? <button type="button" className="lag-role-button" disabled={busy} onClick={() => void act(selected, "reject")}>제안 거절</button> : null}{selected.proposedByPlayerId === playerId ? <button type="button" className="lag-role-button" disabled={busy} onClick={() => void act(selected, "cancel")}>제안 취소</button> : null}</div><p>공개 이름을 바꾸려면 제안을 취소한 뒤 새로 제안하세요.</p></> : null}
      {selected.status === "ACTIVE" && !detailLoading && (guildLeader || groupLeader) ? <div className="lag-role-actions"><button type="button" className="lag-role-button" disabled={busy} onClick={() => void act(selected, "unlink")}>길드 연결 해제</button></div> : null}{error ? <p role="alert">{error} <button type="button" onClick={() => void open(selected)}>다시 조회</button></p> : null}</article></PanelFrame></PanelStage> : null}</>;
}
