"use client";

import { useEffect, useRef, useState } from "react";
import type { ConnectionPage } from "@/shared/api/types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { RecordRow } from "@/features/role/RecordRow";
import { deleteGuildNote, personGuildNotes, type GuildNote } from "./memberPersonApi";
import PrivatePersonBoundary from "./PrivatePersonBoundary";

export default function PersonGuildNotes(props: { personId: number; onBack: () => void }) { return <PrivatePersonBoundary><Notes {...props} /></PrivatePersonBoundary>; }
function Notes({ personId, onBack }: { personId: number; onBack: () => void }) {
  const [page, setPage] = useState(0), [data, setData] = useState<ConnectionPage<GuildNote> | null>(null), [selected, setSelected] = useState<GuildNote | null>(null);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const seq = useRef(0), busy = useRef(false), mounted = useRef(true);
  const compact = useMediaQuery("(max-width: 1199px)"), { confirm, dialog } = useSaoConfirm();
  const load = async () => {
    const id = ++seq.current; setSelected(null); setData(null); setLoading(true); setError(null);
    try { const next = await personGuildNotes(personId, page); if (id === seq.current) setData(next); }
    catch (caught) { if (id === seq.current) setError(caught instanceof Error ? caught.message : "길드별 메모를 불러오지 못했습니다."); }
    finally { if (id === seq.current) setLoading(false); }
  };
  useEffect(() => {
    const counter = seq; mounted.current = true; void load();
    const refresh = () => { void load(); }; window.addEventListener("focus", refresh);
    return () => { mounted.current = false; counter.current++; window.removeEventListener("focus", refresh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, page]);
  const remove = async (note: GuildNote) => {
    if (busy.current || !await confirm("이 길드의 개인 메모만 삭제할까요?")) return;
    busy.current = true; setPending(true); setError(null);
    try { await deleteGuildNote(note.id); if (mounted.current) { setSelected(null); setData((current) => current ? { ...current, contents: current.contents.filter((row) => row.id !== note.id) } : null); await load(); } }
    catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : "메모를 삭제하지 못했습니다."); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const label = (note: GuildNote) => note.guildName ?? `이전 길드 #${note.guildId}`;
  return <>{dialog}<PanelStage stageKey="person-guild-notes" parentStageKey="person-detail" inactive={compact && selected !== null}><PanelFrame title="길드별 메모" centerSelected centerTargetKey={selected?.id} backButton={<BackButton label="인물 상세로" onClick={onBack} />}><div className="lag-role-detail"><p>나에게만 보임 · 공통 인물 메모와 별도로 저장합니다.</p>
    {loading ? <p role="status">길드별 메모를 불러오는 중…</p> : null}{error ? <p role="alert">{error} <button className="lag-role-button" onClick={() => void load()}>다시 조회</button></p> : null}
    {!loading && !error && !data?.contents.length ? <p>저장된 길드별 메모가 없습니다.</p> : null}
    {data?.contents.map((note) => <RecordRow key={note.id} title={label(note)} subtitle={note.availability === "CURRENT" ? "현재 길드 · 개인 메모" : "이전 기록 · 개인 메모"} selected={selected?.id === note.id} disabled={pending} onSelect={() => setSelected(note)} onArchive={() => void remove(note)} archiveLabel="메모 삭제" />)}
    <div className="lag-connection-pagination"><button className="lag-role-button" disabled={loading || page === 0} onClick={() => { setSelected(null); setPage(page - 1); }}>이전</button><span>{page + 1} / {Math.max(1, data?.totalPages ?? 0)}</span><button className="lag-role-button" disabled={loading || !data || page + 1 >= data.totalPages} onClick={() => { setSelected(null); setPage(page + 1); }}>다음</button></div>
  </div></PanelFrame></PanelStage>{selected ? <PanelStage stageKey="person-guild-note-detail" parentStageKey="person-guild-notes"><PanelFrame title={label(selected)} backButton={<BackButton label="길드별 메모 목록으로" onClick={() => setSelected(null)} />}><article className="lag-role-detail"><p>나에게만 보임</p><p style={{ whiteSpace: "pre-wrap" }}>{selected.text || "빈 메모"}</p>{selected.availability === "HISTORY" ? <p>이전 개인 기록입니다. 현재 모임 정보는 표시하지 않습니다.</p> : <p>메모 수정은 길드의 멤버 상세에서 할 수 있습니다.</p>}</article></PanelFrame></PanelStage> : null}</>;
}
