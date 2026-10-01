"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ConnectionPeer } from "@/shared/api/types";
import { useDraggableWindow } from "@/shared/hooks/useDraggableWindow";
import UtilityPortal from "@/shared/ui/UtilityPortal";
import { useConnectionsQueries } from "./useConnectionsQueries";

function Peer({ peer }: { peer: ConnectionPeer }) {
  return (
    <div className="lag-social-peer">
      <span className="lag-social-peer-mark" aria-hidden>{peer.name.trim().charAt(0).toUpperCase() || "?"}</span>
      <span className="lag-social-peer-copy">
        <strong>{peer.name}</strong>
        <small>{peer.job ? `${peer.job} · ` : ""}레벨 {peer.level}</small>
      </span>
    </div>
  );
}

type ConnectionsDrawerProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onMessage?: (peerPlayerId: number) => void;
};

export default function ConnectionsDrawer({ open: controlledOpen, onOpenChange, onMessage }: ConnectionsDrawerProps = {}) {
  const [localOpen, setLocalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionRow, setActionRow] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = useCallback((next: boolean) => {
    if (controlledOpen === undefined) setLocalOpen(next);
    onOpenChange?.(next);
  }, [controlledOpen, onOpenChange]);
  const state = useConnectionsQueries();
  const locked = state.pendingKey !== null;
  const page = state.activeTab === "followings" ? state.followings : state.followers;
  const pageIndex = state.activeTab === "followings" ? state.followingPage : state.followerPage;
  const setPage = state.activeTab === "followings" ? state.setFollowingPage : state.setFollowerPage;
  const queryError = state.queryErrors[state.activeTab];
  const retry = state.activeTab === "followings" ? state.reloadFollowings : state.reloadFollowers;
  const floating = useDraggableWindow(open);
  const selected = page.contents.find((item) => item.peer.playerId === selectedId) ?? null;

  useEffect(() => {
    if (!open) {
      setSelectedId(null); setActionRow(null);
      if (wasOpen.current) triggerRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);
  const swipe = (key: string, endX: number) => {
    if (touchStartX.current !== null) {
      if (touchStartX.current - endX > 30) setActionRow(key);
      if (endX - touchStartX.current > 30) setActionRow(null);
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, setOpen]);

  return (
    <>
      <button ref={triggerRef} type="button" aria-label="연결" aria-expanded={open} title="연결" onClick={() => setOpen(!open)} className="lag-utility-button">
        <span className="lag-utility-label">CN</span>
      </button>

      {open ? (
        <UtilityPortal>
          <aside ref={floating.windowRef} role="dialog" aria-label="내 연결" aria-busy={locked} className="lag-utility-drawer lag-social-drawer lag-connections-drawer" style={floating.windowStyle}>
            <header className="lag-utility-drag-handle lag-social-header" {...floating.dragHandleProps}>
              <div><p>내 계정</p><h2>연결</h2></div>
              <button type="button" aria-label="연결 닫기" onClick={() => setOpen(false)} className="lag-social-button">닫기</button>
            </header>

            <div className="lag-connection-tabs" role="tablist" aria-label="연결 방향">
              {(["followings", "followers"] as const).map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={state.activeTab === tab} data-selected={state.activeTab === tab} onClick={() => { setSelectedId(null); setActionRow(null); state.setActiveTab(tab); }}>
                  {tab === "followings" ? "팔로잉" : "팔로워"}
                </button>
              ))}
            </div>

            <div className="lag-connections-summary"><span>{state.activeTab === "followings" ? "내가 팔로우한 사람" : "나를 팔로우한 사람"}</span><strong>전체 {page.totalElements}명</strong></div>
            {queryError ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">{queryError}</p><button type="button" className="lag-social-button" onClick={() => void retry()}>다시 조회</button></div> : null}
            {state.mutationError ? <p role="alert" className="lag-social-feedback" data-state="error">{state.mutationError}</p> : null}
            {locked ? <p role="status" className="lag-social-feedback" data-state="pending">관계를 변경하는 중…</p> : null}

            <div className="lag-connection-layout" data-detail={selected !== null}>
            <div className="lag-connection-list">
              {state.loading[state.activeTab] ? <p role="status" className="lag-social-empty">연결을 불러오는 중…</p> : null}
              {!state.loading[state.activeTab] && page.contents.length === 0 ? <p className="lag-social-empty">연결된 사람이 없습니다.</p> : null}

              {state.activeTab === "followings" ? state.followings.contents.map((following) => (
                <article key={following.followId} className="lag-connection-row" data-actions={actionRow === `following:${following.peer.playerId}`} onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => swipe(`following:${following.peer.playerId}`, event.changedTouches[0]?.clientX ?? 0)}>
                  <button type="button" className="lag-connection-row-main" aria-pressed={selectedId === following.peer.playerId} onClick={() => setSelectedId(following.peer.playerId)}>
                    <Peer peer={following.peer} />
                    <span className="lag-connection-state">{[following.muted && "뮤트됨", following.blocked && "차단됨"].filter(Boolean).join(" · ") || "팔로잉"}</span>
                  </button>
                  <button type="button" className="lag-connection-action-toggle" aria-expanded={actionRow === `following:${following.peer.playerId}`} onClick={() => setActionRow(actionRow === `following:${following.peer.playerId}` ? null : `following:${following.peer.playerId}`)}>{following.peer.name} 작업</button>
                  <div className="lag-connection-actions" hidden={actionRow !== `following:${following.peer.playerId}`}>
                    <button type="button" disabled={locked} onClick={() => void state.toggleMute(following)} className="lag-social-button">{following.muted ? "뮤트 해제" : "뮤트"}</button>
                    <button type="button" disabled={locked} onClick={() => void state.toggleBlock(following)} className="lag-social-button">{following.blocked ? "차단 해제" : "차단"}</button>
                    <button type="button" disabled={locked} onClick={() => void state.unfollowFollowing(following)} className="lag-social-button" data-variant="destructive">팔로우 취소</button>
                  </div>
                </article>
              )) : state.followers.contents.map((follower) => {
                const inconsistent = follower.followedBack && follower.outboundFollowId === null;
                return (
                  <article key={follower.peer.playerId} className="lag-connection-row" data-actions={actionRow === `follower:${follower.peer.playerId}`} onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => swipe(`follower:${follower.peer.playerId}`, event.changedTouches[0]?.clientX ?? 0)}>
                    <button type="button" className="lag-connection-row-main" aria-pressed={selectedId === follower.peer.playerId} onClick={() => setSelectedId(follower.peer.playerId)}>
                      <Peer peer={follower.peer} />
                      <span className="lag-connection-state">{follower.followedBack ? "맞팔로우" : "팔로워"}</span>
                    </button>
                    <button type="button" className="lag-connection-action-toggle" aria-expanded={actionRow === `follower:${follower.peer.playerId}`} onClick={() => setActionRow(actionRow === `follower:${follower.peer.playerId}` ? null : `follower:${follower.peer.playerId}`)}>{follower.peer.name} 작업</button>
                    <div className="lag-connection-actions" hidden={actionRow !== `follower:${follower.peer.playerId}`}>
                      {follower.followedBack && onMessage ? <button type="button" onClick={() => onMessage(follower.peer.playerId)} className="lag-social-button" data-variant="primary">메시지</button> : null}
                      <button type="button" disabled={locked || inconsistent} onClick={() => void (follower.followedBack ? state.unfollowFollower(follower) : state.followBack(follower))} className="lag-social-button">
                        {inconsistent ? "사용할 수 없음" : follower.followedBack ? "팔로우 취소" : "맞팔로우"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="lag-connection-pagination">
              <button type="button" disabled={pageIndex === 0} onClick={() => { setSelectedId(null); setActionRow(null); setPage((current) => current - 1); }} className="lag-social-button">이전</button>
              <span>{page.totalPages === 0 ? 0 : page.page + 1} / {page.totalPages} 페이지</span>
              <button type="button" disabled={pageIndex + 1 >= page.totalPages} onClick={() => { setSelectedId(null); setActionRow(null); setPage((current) => current + 1); }} className="lag-social-button">다음</button>
            </footer>
            {selected ? <section className="lag-connection-detail" aria-label="연결 상세">
              <button type="button" className="lag-social-button lag-group-back" onClick={() => setSelectedId(null)}>← 목록으로</button>
              <Peer peer={selected.peer} />
              <p>{state.activeTab === "followings" ? "내가 팔로우한 사람" : "나를 팔로우한 사람"}</p>
              <dl><div><dt>레벨</dt><dd>{selected.peer.level}</dd></div><div><dt>직업</dt><dd>{selected.peer.job || "정보 없음"}</dd></div></dl>
            </section> : null}
            </div>
          </aside>
        </UtilityPortal>
      ) : null}
    </>
  );
}
