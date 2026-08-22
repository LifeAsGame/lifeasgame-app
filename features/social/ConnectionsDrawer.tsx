"use client";

import { useCallback, useEffect, useState } from "react";

import type { ConnectionPeer } from "@/shared/api/types";
import { useDraggableWindow } from "@/shared/hooks/useDraggableWindow";
import UtilityPortal from "@/shared/ui/UtilityPortal";
import { useConnectionsQueries } from "./useConnectionsQueries";

const buttonStyle = {
  border: "1px solid var(--lag-control-border)",
  background: "var(--lag-control-bg)",
  color: "var(--lag-control-text)",
  borderRadius: "var(--lag-radius-sm)",
} as const;

function Peer({ peer }: { peer: ConnectionPeer }) {
  return (
    <div className="min-w-0 flex-1">
      <strong className="block truncate text-sm" style={{ color: "var(--lag-text)" }}>{peer.name}</strong>
      <span className="block truncate text-xs" style={{ color: "var(--lag-text-2)" }}>
        {peer.job ? `${peer.job} · ` : ""}Level {peer.level}
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
      <button
        type="button"
        aria-label="Connections"
        aria-expanded={open}
        title="Connections"
        onClick={() => setOpen(!open)}
        className="lag-utility-button"
      >
        <span className="lag-utility-label">CN</span>
      </button>

      {open ? (
        <UtilityPortal>
          <aside
          ref={floating.windowRef}
          role="dialog"
          aria-label="Current Player Connections"
          className="lag-utility-drawer flex max-h-[calc(100vh-3rem)] w-[min(420px,calc(100vw-3rem))] flex-col overflow-hidden p-4"
          style={floating.windowStyle}
        >
          <header className="lag-utility-drag-handle flex shrink-0 items-center justify-between gap-3" {...floating.dragHandleProps}>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--lag-text-2)" }}>Current Player</p>
              <h2 className="text-lg font-semibold tracking-[0.08em]" style={{ color: "var(--lag-text)" }}>Connections</h2>
            </div>
            <button type="button" aria-label="Close Connections" onClick={() => setOpen(false)} className="px-3 py-2 text-xs" style={buttonStyle}>Close</button>
          </header>

          <div className="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Connection direction">
            {(["followings", "followers"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={state.activeTab === tab}
                onClick={() => state.setActiveTab(tab)}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                style={{ ...buttonStyle, background: state.activeTab === tab ? "var(--lag-selected-surface)" : "var(--lag-control-bg)", borderColor: state.activeTab === tab ? "var(--lag-focus)" : "var(--lag-control-border)" }}
              >
                {tab === "followings" ? "Followings" : "Followers"}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs" style={{ color: "var(--lag-text-2)" }}>{page.totalElements} total</p>
          {queryError ? <div className="mt-2 flex items-center gap-2"><p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{queryError}</p><button type="button" className="px-2 py-1 text-xs" style={buttonStyle} onClick={() => void retry()}>Retry</button></div> : null}
          {state.mutationError ? <p role="alert" className="mt-2 text-xs" style={{ color: "var(--lag-state-error)" }}>{state.mutationError}</p> : null}

          <div className="mt-3 min-h-28 flex-1 space-y-2 overflow-y-auto">
            {state.loading[state.activeTab] ? <p className="py-6 text-center text-sm" style={{ color: "var(--lag-text-2)" }}>Loading...</p> : null}
            {!state.loading[state.activeTab] && page.contents.length === 0 ? <p className="py-6 text-center text-sm" style={{ color: "var(--lag-text-2)" }}>No connections.</p> : null}

            {state.activeTab === "followings" ? state.followings.contents.map((following) => (
              <article key={following.followId} className="lag-utility-row rounded-sm border p-3">
                <div className="flex items-start gap-3">
                  <Peer peer={following.peer} />
                  <span className="text-[10px] uppercase" style={{ color: "var(--lag-text-2)" }}>
                    {[following.muted && "Muted", following.blocked && "Blocked"].filter(Boolean).join(" · ") || "Following"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={locked} onClick={() => void state.toggleMute(following)} className="px-2 py-1 text-xs disabled:opacity-40" style={buttonStyle}>{following.muted ? "Unmute" : "Mute"}</button>
                  <button type="button" disabled={locked} onClick={() => void state.toggleBlock(following)} className="px-2 py-1 text-xs disabled:opacity-40" style={buttonStyle}>{following.blocked ? "Unblock" : "Block"}</button>
                  <button type="button" disabled={locked} onClick={() => void state.unfollowFollowing(following)} className="px-2 py-1 text-xs disabled:opacity-40" style={{ ...buttonStyle, color: "var(--lag-state-error)" }}>Unfollow</button>
                </div>
              </article>
            )) : state.followers.contents.map((follower) => {
              const inconsistent = follower.followedBack && follower.outboundFollowId === null;
              return (
                <article key={follower.peer.playerId} className="lag-utility-row flex items-center gap-3 rounded-sm border p-3">
                  <Peer peer={follower.peer} />
                  <div className="flex flex-wrap justify-end gap-2">
                    {follower.followedBack && onMessage ? <button type="button" onClick={() => onMessage(follower.peer.playerId)} className="px-2 py-1 text-xs" style={buttonStyle}>Message</button> : null}
                    <button
                      type="button"
                      disabled={locked || inconsistent}
                      onClick={() => void (follower.followedBack ? state.unfollowFollower(follower) : state.followBack(follower))}
                      className="px-2 py-1 text-xs disabled:opacity-40"
                      style={buttonStyle}
                    >
                      {inconsistent ? "Unavailable" : follower.followedBack ? "Unfollow" : "Follow back"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <footer className="mt-3 flex shrink-0 items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--lag-divider)" }}>
            <button type="button" disabled={pageIndex === 0} onClick={() => setPage((current) => current - 1)} className="px-3 py-1.5 text-xs disabled:opacity-40" style={buttonStyle}>Previous</button>
            <span className="text-xs" style={{ color: "var(--lag-text-2)" }}>Page {page.totalPages === 0 ? 0 : page.page + 1} of {page.totalPages}</span>
            <button type="button" disabled={pageIndex + 1 >= page.totalPages} onClick={() => setPage((current) => current + 1)} className="px-3 py-1.5 text-xs disabled:opacity-40" style={buttonStyle}>Next</button>
          </footer>
          </aside>
        </UtilityPortal>
      ) : null}
    </>
  );
}
