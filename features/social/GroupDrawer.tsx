"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, USE_MOCK, apiGet, apiPost } from "@/shared/api/client";
import { useDraggableWindow } from "@/shared/hooks/useDraggableWindow";
import UtilityPortal from "@/shared/ui/UtilityPortal";

type Kind = "guilds" | "parties";
type Summary = { id: number; name: string; code: string; visibility: string; joinPolicy: string; status: string; maxMembers: number };
type Detail = Summary & { descriptionMd: string | null; tags: string[]; leaderPlayerId: number; createdAt: string };
type Page = { contents: Summary[]; page: number; totalPages: number; totalElements: number };
const label = { guilds: "길드", parties: "파티" };
const word = (value: string) => ({ PUBLIC: "공개", PRIVATE: "비공개", OPEN: "자유 가입", APPROVAL: "승인 후 가입", INVITE_ONLY: "초대 전용", ACTIVE: "활동 중" })[value as "PUBLIC"] ?? value;
const message = (caught: unknown, fallback: string) => caught instanceof ApiError ? `${fallback} (HTTP ${caught.status})` : caught instanceof Error ? caught.message : fallback;

export default function GroupDrawer({ kind }: { kind: Kind }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const request = useRef(0);
  const detailRequest = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const floating = useDraggableWindow(open);

  const load = useCallback(async () => {
    const current = ++request.current;
    setError(null);
    setLoading(true);
    try {
      const result = await apiGet<Page>(`/api/v1/${kind}/search?page=${page}&size=20${term ? `&keyword=${encodeURIComponent(term)}` : ""}`);
      if (current === request.current) setData(result);
    } catch (caught) {
      if (current === request.current) setError(message(caught, "목록을 불러오지 못했습니다."));
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [kind, page, term]);

  useEffect(() => {
    if (open && !USE_MOCK) void load();
    const listRequest = request;
    const selectedRequest = detailRequest;
    return () => { listRequest.current++; selectedRequest.current++; };
  }, [open, load]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null); setCreating(false); setDetail(null);
      if (wasOpen.current) triggerRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  const select = async (id: number) => {
    const current = ++detailRequest.current;
    setSelectedId(id);
    setCreating(false);
    setDetail(null);
    setDetailError(null);
    try {
      const result = await apiGet<Detail>(`/api/v1/${kind}/${id}`);
      if (current === detailRequest.current) setDetail(result);
    } catch (caught) {
      if (current === detailRequest.current) setDetailError(message(caught, "상세를 불러오지 못했습니다."));
    }
  };

  const create = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !name.trim() || !code.trim()) return;
    setSaving(true);
    setDetailError(null);
    try {
      const created = await apiPost<Detail>(`/api/v1/${kind}`, {
        name: name.trim(), code: code.trim(), descriptionMd: null,
        ...(kind === "guilds" ? { emblemImageUrl: null, emblemBgColor: null } : { bannerImageUrl: null, bannerBgColor: null }),
        visibility: "PUBLIC", joinPolicy: "OPEN", maxMembers: 20,
      });
      setCreating(false);
      setName(""); setCode("");
      setTerm(""); setQuery(""); setPage(0);
      await select(created.id);
      if (page === 0 && !term) void load();
    } catch (caught) {
      setDetailError(message(caught, "생성하지 못했습니다."));
    } finally { setSaving(false); }
  };

  return <>
    <button ref={triggerRef} type="button" className="lag-utility-button" aria-label={label[kind]} aria-expanded={open} onClick={() => { setOpen(!open); if (open) { detailRequest.current++; setSelectedId(null); setCreating(false); } }}><span className="lag-utility-label">{kind === "guilds" ? "GI" : "PA"}</span></button>
    {open ? <UtilityPortal>
      <aside ref={floating.windowRef} role="dialog" aria-label={`${label[kind]} 목록`} className="lag-utility-drawer lag-social-drawer lag-group-drawer" style={floating.windowStyle}>
        <header className="lag-utility-drag-handle lag-social-header" {...floating.dragHandleProps}><div><p>모임</p><h2>{label[kind]}</h2></div><button type="button" className="lag-social-button" onClick={() => setOpen(false)}>닫기</button></header>
        {USE_MOCK ? <p className="lag-social-empty">모임 목록은 실제 서버에서 확인할 수 있습니다.</p> : <>
          <form className="lag-group-search" onSubmit={(event) => { event.preventDefault(); setPage(0); setTerm(query.trim()); setSelectedId(null); setCreating(false); }}>
            <input aria-label={`${label[kind]} 검색어`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름으로 검색" />
            <button type="submit" className="lag-social-button">검색</button>
            <button type="button" className="lag-social-button" onClick={() => { detailRequest.current++; setSelectedId(null); setCreating(true); }}>새 {label[kind]}</button>
          </form>
          {error ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">{error}</p><button type="button" className="lag-social-button" onClick={() => void load()}>다시 조회</button></div> : null}
          <div className="lag-group-layout" data-detail={selectedId !== null || creating}>
            <section className="lag-group-list" aria-label={`${label[kind]} 검색 결과`}>
              <p className="lag-connections-summary">{data ? `전체 ${data.totalElements}개` : loading ? "불러오는 중…" : error ? "목록 조회 실패" : ""}</p>
              {data && data.contents.length === 0 && !error ? <p className="lag-social-empty">검색 결과가 없습니다.</p> : null}
              {data?.contents.map((item) => <button key={item.id} type="button" className="lag-group-row" aria-pressed={selectedId === item.id} onClick={() => void select(item.id)}><strong>{item.name}</strong><small>{item.code} · {word(item.visibility)} · {word(item.status)}</small><span aria-hidden>›</span></button>)}
              <div className="lag-connection-pagination"><button type="button" className="lag-social-button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span>{data ? `${data.page + 1} / ${Math.max(1, data.totalPages)}` : ""}</span><button type="button" className="lag-social-button" disabled={!data || page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>다음</button></div>
            </section>
            {creating || selectedId !== null ? <section className="lag-group-detail" aria-label={creating ? `${label[kind]} 생성` : `${label[kind]} 상세`}>
              <button type="button" className="lag-social-button lag-group-back" onClick={() => { detailRequest.current++; setCreating(false); setSelectedId(null); }}>← 목록으로</button>
              {detailError ? <p role="alert" className="lag-social-feedback" data-state="error">{detailError}</p> : null}
              {creating ? <form className="lag-group-form" onSubmit={(event) => void create(event)}><h3>새 {label[kind]}</h3><label>이름<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>코드<input required value={code} onChange={(event) => setCode(event.target.value)} /></label><p>공개 · 자유 가입 · 최대 20명</p><button type="submit" className="lag-social-button" data-variant="primary" disabled={saving}>{saving ? "저장 중…" : "생성"}</button></form> : detail ? <div className="lag-group-info"><h3>{detail.name}</h3><p>{detail.descriptionMd || "설명이 없습니다."}</p><dl><div><dt>코드</dt><dd>{detail.code}</dd></div><div><dt>공개 범위</dt><dd>{word(detail.visibility)}</dd></div><div><dt>가입 방식</dt><dd>{word(detail.joinPolicy)}</dd></div><div><dt>정원</dt><dd>{detail.maxMembers}명</dd></div><div><dt>상태</dt><dd>{word(detail.status)}</dd></div></dl>{detail.tags?.length ? <p>태그: {detail.tags.join(", ")}</p> : null}</div> : <p role="status" className="lag-social-empty">상세를 불러오는 중…</p>}
            </section> : null}
          </div>
        </>}
      </aside>
    </UtilityPortal> : null}
  </>;
}
