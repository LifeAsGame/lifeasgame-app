"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConnectionPage } from "@/shared/api/types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import GroupShell from "@/features/social/GroupShell";
import RolePartyPanels from "./RolePartyPanels";
import { RecordRow, SwipeButton } from "./RecordRow";
import { groupKey, groupTypeName, linkRoleGroup, roleGroupCandidates, roleGroupLinks, unlinkRoleGroup, type RoleGroupCandidate, type RoleGroupLink, type RoleGroupType } from "./contextApi";

export default function RoleGroupLinks({ roleId, roleName, roleStatus, playerId, createRequest, reentryRequest, onBack }: {
  roleId: number; roleName: string; roleStatus: string; playerId: number; createRequest: number; reentryRequest: number; onBack: () => void;
}) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const { confirm, dialog } = useSaoConfirm();
  const [creating, setCreating] = useState(Boolean(createRequest && roleStatus === "ACTIVE")), [page, setPage] = useState(0), [candidatePage, setCandidatePage] = useState(0);
  const [type, setType] = useState<RoleGroupType>("GUILD"), [keyword, setKeyword] = useState(""), [term, setTerm] = useState("");
  const [links, setLinks] = useState<ConnectionPage<RoleGroupLink> | null>(null), [candidates, setCandidates] = useState<ConnectionPage<RoleGroupCandidate> | null>(null);
  const [selected, setSelected] = useState<RoleGroupLink | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const seq = useRef(0), busy = useRef(false);
  const load = useCallback(async () => {
    const id = ++seq.current; setLoading(true); setError(null); setLinks(null); setCandidates(null);
    try {
      if (creating) { const next = await roleGroupCandidates(roleId, type, candidatePage, term); if (id === seq.current) setCandidates(next); }
      else { const next = await roleGroupLinks(roleId, page); if (id === seq.current) setLinks(next); }
      return true;
    } catch (caught) { if (id === seq.current) { setSelected(null); setError(caught instanceof Error ? caught.message : "모임을 조회하지 못했습니다."); } return false; }
    finally { if (id === seq.current) setLoading(false); }
  }, [roleId, creating, type, candidatePage, term, page]);
  useEffect(() => { const counter = seq; void load(); return () => { counter.current++; }; }, [load, reentryRequest]);
  useEffect(() => { setSelected(null); setCreating(Boolean(createRequest && roleStatus === "ACTIVE")); setCandidatePage(0); setKeyword(""); setTerm(""); }, [createRequest, reentryRequest, roleStatus]);
  // Revalidate on returning to the window; the old detail is removed before reads.
  useEffect(() => { const refresh = () => { setSelected(null); void load(); }; window.addEventListener("focus", refresh); return () => window.removeEventListener("focus", refresh); }, [load]);
  const accessLost = useCallback(() => {
    const linkId = selected?.linkId;
    setSelected((current) => current?.linkId === linkId ? null : current);
    setLinks((current) => current ? { ...current, contents: current.contents.map((row) => row.linkId === linkId ? { ...row, access: "UNAVAILABLE", group: null } : row) } : null);
  }, [selected?.linkId]);
  const linkedGroup = useMemo(() => selected ? { id: selected.groupId, onAccessLost: accessLost } : undefined, [selected, accessLost]);
  const add = async (group: RoleGroupCandidate) => {
    if (busy.current || roleStatus !== "ACTIVE") return;
    const version = seq.current; busy.current = true; setPending(true); setError(null);
    try { await linkRoleGroup(roleId, group); if (version === seq.current) { setCreating(false); setSelected(null); setPage(0); } }
    catch (caught) { setError(caught instanceof Error ? caught.message : "모임을 연결하지 못했습니다."); }
    finally { busy.current = false; setPending(false); }
  };
  const unlink = async (row: RoleGroupLink) => {
    if (busy.current || !await confirm("이 역할의 연결만 해제할까요? 모임과 멤버십은 그대로 유지됩니다.")) return;
    busy.current = true; setPending(true); setError(null);
    try {
      await unlinkRoleGroup(roleId, row.linkId); setSelected(null);
      // A saved DELETE is never retried when the following GET fails.
      setLinks((current) => current ? { ...current, contents: current.contents.filter((item) => item.linkId !== row.linkId) } : null);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "연결을 해제하지 못했습니다."); }
    finally { busy.current = false; setPending(false); }
  };
  const rows = links?.contents.filter((row, index, all) => all.findIndex((other) => groupKey(other) === groupKey(row)) === index) ?? [];
  return <>{dialog}<PanelStage stageKey="role-group-links" parentStageKey="role-summary" inactive={compact && selected !== null}>
    <PanelFrame title={creating ? "내 모임 선택" : `${roleName} · 연결된 모임`} centerSelected={!creating} centerTargetKey={selected ? groupKey(selected) : null} backButton={<BackButton label={creating ? "연결된 모임 목록으로" : `역할 ${roleName}로`} onClick={creating ? () => { setCreating(false); setSelected(null); } : onBack} />}>
      <CreateSlot creating={creating} showCancel={false} pending={pending} onClose={() => setCreating(false)} list={<div className="lag-role-detail">
        {loading ? <p role="status">연결된 모임을 불러오는 중…</p> : null}
        {error ? <p role="alert">{error} <button className="lag-role-button" onClick={() => { setSelected(null); void load(); }}>다시 조회</button></p> : null}
        {!loading && !error && !rows.length ? <p>연결된 모임이 없습니다. ‘연결된 모임’을 두 번 누르거나 Alt+Enter로 내 모임을 선택하세요.</p> : null}
        {rows.map((row) => <RecordRow key={groupKey(row)} title={row.access === "AVAILABLE" && row.group ? row.group.name : "접근 불가"} subtitle={groupTypeName[row.groupType]} selected={selected?.linkId === row.linkId} disabled={pending} onSelect={() => { setSelected(row.access === "AVAILABLE" && row.group ? row : null); }} onArchive={() => void unlink(row)} archiveLabel="연결 해제" />)}
        <div className="lag-connection-pagination"><button className="lag-role-button" disabled={loading || page === 0} onClick={() => { setSelected(null); setPage(page - 1); }}>이전</button><span>{page + 1} / {Math.max(1, links?.totalPages ?? 0)}</span><button className="lag-role-button" disabled={loading || !links || page + 1 >= links.totalPages} onClick={() => { setSelected(null); setPage(page + 1); }}>다음</button></div>
      </div>}>
        <div className="lag-role-form"><p>현재 가입한 활성 모임을 이 역할에서 봅니다. 가입이나 모임 간 연결 승인은 바뀌지 않습니다.</p>
          <label>모임 종류<select className="lag-role-control" value={type} onChange={(event) => { setType(event.target.value as RoleGroupType); setCandidatePage(0); }}>{Object.entries(groupTypeName).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <form className="lag-role-form" onSubmit={(event) => { event.preventDefault(); setTerm(keyword.trim()); setCandidatePage(0); }}><label>내 모임 이름 검색<input className="lag-role-control" value={keyword} maxLength={120} onChange={(event) => setKeyword(event.target.value)} /></label><button className="lag-role-button">검색</button></form>
          {loading ? <p role="status">내 모임을 불러오는 중…</p> : null}{error ? <p role="alert">{error} <button onClick={() => void load()}>다시 조회</button></p> : null}
          {!loading && !error && !candidates?.contents.length ? <p>연결할 수 있는 내 모임이 없습니다.</p> : null}
          {candidates?.contents.map((row) => <SwipeButton key={groupKey(row)} className="lag-role-node" disabled={pending} onClick={() => void add(row)}><span className="lag-role-node-mark" aria-hidden>{groupTypeName[row.groupType][0]}</span><span><strong>{row.name}</strong><small>이 역할에서 보기</small></span></SwipeButton>)}
          <div className="lag-connection-pagination"><button className="lag-role-button" disabled={loading || candidatePage === 0} onClick={() => setCandidatePage(candidatePage - 1)}>이전</button><span>{candidatePage + 1} / {Math.max(1, candidates?.totalPages ?? 0)}</span><button className="lag-role-button" disabled={loading || !candidates || candidatePage + 1 >= candidates.totalPages} onClick={() => setCandidatePage(candidatePage + 1)}>다음</button></div>
        </div>
      </CreateSlot>
    </PanelFrame>
  </PanelStage>
  {selected && linkedGroup ? selected.groupType === "ROLE_PARTY" ? <RolePartyPanels key={groupKey(selected)} playerId={playerId} linkedGroup={linkedGroup} onBack={() => setSelected(null)} /> : <GroupShell key={groupKey(selected)} kind={selected.groupType === "GUILD" ? "guilds" : "parties"} playerId={playerId} linkedGroup={linkedGroup} onBack={() => setSelected(null)} /> : null}
  </>;
}
