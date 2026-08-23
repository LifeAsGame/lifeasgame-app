"use client";

import { useCallback, useEffect, useState } from "react";

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
        <small>{peer.job ? `${peer.job} · ` : ""}Level {peer.level}</small>
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

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, setOpen]);

  return (
    <>
      <button type="button" aria-label="Connections" aria-expanded={open} title="Connections" onClick={() => setOpen(!open)} className="lag-utility-button">
        <span className="lag-utility-label">CN</span>
      </button>

      {open ? (
        <UtilityPortal>
          <aside ref={floating.windowRef} role="dialog" aria-label="Current Player Connections" aria-busy={locked} className="lag-utility-drawer lag-social-drawer lag-connections-drawer" style={floating.windowStyle}>
            <header className="lag-utility-drag-handle lag-social-header" {...floating.dragHandleProps}>
              <div><p>Current Player</p><h2>Connections</h2></div>
              <button type="button" aria-label="Close Connections" onClick={() => setOpen(false)} className="lag-social-button">Close</button>
            </header>

            <div className="lag-connection-tabs" role="tablist" aria-label="Connection direction">
              {(["followings", "followers"] as const).map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={state.activeTab === tab} data-selected={state.activeTab === tab} onClick={() => state.setActiveTab(tab)}>
                  {tab === "followings" ? "Followings" : "Followers"}
                </button>
              ))}
            </div>

            <div className="lag-connections-summary"><span>{state.activeTab === "followings" ? "People you follow" : "People following you"}</span><strong>{page.totalElements} total</strong></div>
            {queryError ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">{queryError}</p><button type="button" className="lag-social-button" onClick={() => void retry()}>Retry</button></div> : null}
            {state.mutationError ? <p role="alert" className="lag-social-feedback" data-state="error">{state.mutationError}</p> : null}
            {locked ? <p role="status" className="lag-social-feedback" data-state="pending">Updating relationship...</p> : null}

            <div className="lag-connection-list">
              {state.loading[state.activeTab] ? <p role="status" className="lag-social-empty">Loading connections...</p> : null}
              {!state.loading[state.activeTab] && page.contents.length === 0 ? <p className="lag-social-empty">No connections.</p> : null}

              {state.activeTab === "followings" ? state.followings.contents.map((following) => (
                <article key={following.followId} className="lag-connection-row">
                  <div className="lag-connection-row-main">
                    <Peer peer={following.peer} />
                    <span className="lag-connection-state">{[following.muted && "Muted", following.blocked && "Blocked"].filter(Boolean).join(" · ") || "Following"}</span>
                  </div>
                  <div className="lag-connection-actions">
                    <button type="button" disabled={locked} onClick={() => void state.toggleMute(following)} className="lag-social-button">{following.muted ? "Unmute" : "Mute"}</button>
                    <button type="button" disabled={locked} onClick={() => void state.toggleBlock(following)} className="lag-social-button">{following.blocked ? "Unblock" : "Block"}</button>
                    <button type="button" disabled={locked} onClick={() => void state.unfollowFollowing(following)} className="lag-social-button" data-variant="destructive">Unfollow</button>
                  </div>
                </article>
              )) : state.followers.contents.map((follower) => {
                const inconsistent = follower.followedBack && follower.outboundFollowId === null;
                return (
                  <article key={follower.peer.playerId} className="lag-connection-row">
                    <div className="lag-connection-row-main">
                      <Peer peer={follower.peer} />
                      <span className="lag-connection-state">{follower.followedBack ? "Followed back" : "Follower"}</span>
                    </div>
                    <div className="lag-connection-actions">
                      {follower.followedBack && onMessage ? <button type="button" onClick={() => onMessage(follower.peer.playerId)} className="lag-social-button" data-variant="primary">Message</button> : null}
                      <button type="button" disabled={locked || inconsistent} onClick={() => void (follower.followedBack ? state.unfollowFollower(follower) : state.followBack(follower))} className="lag-social-button">
                        {inconsistent ? "Unavailable" : follower.followedBack ? "Unfollow" : "Follow back"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="lag-connection-pagination">
              <button type="button" disabled={pageIndex === 0} onClick={() => setPage((current) => current - 1)} className="lag-social-button">Previous</button>
              <span>Page {page.totalPages === 0 ? 0 : page.page + 1} of {page.totalPages}</span>
              <button type="button" disabled={pageIndex + 1 >= page.totalPages} onClick={() => setPage((current) => current + 1)} className="lag-social-button">Next</button>
            </footer>
          </aside>
        </UtilityPortal>
      ) : null}
    </>
  );
}
