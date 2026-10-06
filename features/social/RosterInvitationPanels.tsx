"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { GroupPage } from "./groups";
import { groupMembers, groupMine } from "./groups";
import { answerRosterInvitation, myRosterInvitations, rosterRows } from "./rosterApi";
import type { RosterInvitation } from "./rosterApi";
import { SwipeButton } from "@/features/role/RecordRow";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";

const errorText = (error: unknown) => error instanceof ApiError ? error.status === 409 ? "초대 상태 또는 정원이 바뀌었습니다. 다시 조회해주세요." : error.status === 403 || error.status === 404 ? "이 초대에 더 이상 접근할 수 없습니다. 다시 조회해주세요." : error.message : error instanceof Error ? error.message : "초대를 처리하지 못했습니다.";

export default function RosterInvitationPanels({ onBack }: { onBack: () => void }) {
  const { confirm, dialog } = useSaoConfirm();
  const [page, setPage] = useState(0), [list, setList] = useState<GroupPage<RosterInvitation> | null>(null), [selected, setSelected] = useState<RosterInvitation | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const seq = useRef(0), lock = useRef(false);
  const load = useCallback(async () => {
    const current = ++seq.current; setLoading(true);
    try { const next = await myRosterInvitations(page); if (current === seq.current) { setList(next); setError(null); } }
    catch (caught) { if (current === seq.current) { setList(null); setError(errorText(caught)); } }
    finally { if (current === seq.current) setLoading(false); }
  }, [page]);
  useEffect(() => { const counter = seq; void load(); return () => { counter.current++; }; }, [load]);
  const answer = async (action: "accept" | "decline") => {
    if (!selected || lock.current) return;
    const item = selected;
    if (!await confirm(action === "accept" ? `${item.groupName}의 ${item.rosterDisplayName} 명부에 연결할까요?${item.membershipWillBeCreated ? " 모임 가입도 함께 진행됩니다." : " 기존 가입은 유지됩니다."}` : `${item.rosterDisplayName} 명부 연결 초대를 거절할까요?`)) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      await answerRosterInvitation(item.invitationId, action);
      if (action === "accept") {
        const kind = item.groupType === "GUILD" ? "guilds" : "parties";
        await Promise.allSettled([groupMine(kind, 0), groupMembers(kind, item.groupId, 0), rosterRows(item.groupType, item.groupId, 0)]);
      }
      setSelected(null); await load();
    } catch (caught) { await load().catch(() => {}); if (caught instanceof ApiError && [403, 404].includes(caught.status)) setSelected(null); setError(errorText(caught)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <>{dialog}<PanelStage stageKey="roster-invitation-list" parentStageKey="social-stage-0" instant inactive={selected !== null}><PanelFrame title="받은 명부 연결 초대" backButton={<BackButton label="모임 분류로" onClick={onBack} />}><div className="lag-role-detail lag-group-main">
    {loading ? <p role="status">초대를 불러오는 중…</p> : null}
    {error && !selected ? <p role="alert">{error} <button onClick={() => void load()}>다시 조회</button></p> : null}
    {!loading && !error && !list?.contents.length ? <p>받은 명부 연결 초대가 없습니다.</p> : null}
    {list?.contents.map((item) => <SwipeButton key={item.invitationId} className="lag-role-node" aria-pressed={selected?.invitationId === item.invitationId} onClick={() => setSelected(item)}><span className="lag-role-node-mark" aria-hidden>초</span><span><strong>{item.groupName}</strong><small>{item.rosterDisplayName} 명부 · 연결 대기</small></span><span aria-hidden>→</span></SwipeButton>)}
    <div className="lag-connection-pagination"><button disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span>{page + 1} / {Math.max(1, list?.totalPages ?? 0)}</span><button disabled={!list || page + 1 >= list.totalPages} onClick={() => setPage(page + 1)}>다음</button></div>
  </div></PanelFrame></PanelStage>
  {selected ? <PanelStage stageKey="roster-invitation-detail" parentStageKey="roster-invitation-list" instant><PanelFrame title="명부 연결 확인" backButton={<BackButton label="받은 초대 목록으로" onClick={() => { setSelected(null); setError(null); }} />}><div className="lag-role-detail lag-group-main">
    <h4>{selected.groupName}</h4><p>연결될 공유 명부: <strong>{selected.rosterDisplayName}</strong></p>
    <p>{selected.membershipWillBeCreated ? "수락하면 모임 가입과 명부 연결이 함께 진행됩니다." : "이미 모임 멤버입니다. 수락하면 명부만 연결됩니다."}</p>
    <p>{new Date(selected.expiresAt).getTime() <= Date.now() ? "만료됨" : `${new Date(selected.expiresAt).toLocaleString("ko-KR")}까지`}</p>
    {error ? <p role="alert">{error} <button onClick={() => void load()}>초대 다시 조회</button></p> : null}
    <div className="lag-role-actions"><button className="lag-role-action" disabled={busy || new Date(selected.expiresAt).getTime() <= Date.now()} onClick={() => void answer("accept")}>○ 수락</button><button className="lag-role-button" disabled={busy} onClick={() => void answer("decline")}>× 거절</button></div>
  </div></PanelFrame></PanelStage> : null}</>;
}
