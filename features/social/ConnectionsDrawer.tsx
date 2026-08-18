"use client";

import { useCallback, useEffect, useState } from "react";

import type { ConnectionPeer } from "@/shared/api/types";
import { SAO } from "@/shared/design/tokens";
import { useConnectionsQueries } from "./useConnectionsQueries";

const buttonStyle = {
  border: `1px solid ${SAO.color.border.inner}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.input,
} as const;

function Peer({ peer }: { peer: ConnectionPeer }) {
  return (
    <div className="min-w-0 flex-1">
      <strong className="block truncate text-sm" style={{ color: SAO.color.text.primary }}>{peer.name}</strong>
      <span className="block truncate text-xs" style={{ color: SAO.color.text.label }}>
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
        onClick={() => setOpen(!open)}
        className="h-[34px] rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={buttonStyle}
      >
        Connections
      </button>

      {open ? (
        <aside
          role="dialog"
          aria-label="Current Player Connections"
          className="fixed right-6 top-6 z-[500000] flex max-h-[calc(100vh-3rem)] w-[min(420px,calc(100vw-3rem))] flex-col overflow-hidden p-4"
          style={{
            background: "linear-gradient(160deg, rgba(18,15,10,0.99), rgba(14,12,8,0.99))",
            border: `1px solid ${SAO.color.border.panel}`,
            borderRadius: SAO.radius.panel,
            boxShadow: SAO.shadow.panel,
          }}
        >
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: SAO.color.text.label }}>Current Player</p>
              <h2 className="text-lg font-semibold tracking-[0.08em]" style={{ color: SAO.color.text.primary }}>Connections</h2>
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
                style={{ ...buttonStyle, borderColor: state.activeTab === tab ? SAO.color.border.gold : SAO.color.border.inner }}
              >
                {tab === "followings" ? "Followings" : "Followers"}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs" style={{ color: SAO.color.text.label }}>{page.totalElements} total</p>
          {queryError ? <div className="mt-2 flex items-center gap-2"><p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{queryError}</p><button type="button" className="px-2 py-1 text-xs" style={buttonStyle} onClick={() => void retry()}>Retry</button></div> : null}
          {state.mutationError ? <p role="alert" className="mt-2 text-xs" style={{ color: SAO.color.action.red }}>{state.mutationError}</p> : null}

          <div className="mt-3 min-h-28 flex-1 space-y-2 overflow-y-auto">
            {state.loading[state.activeTab] ? <p className="py-6 text-center text-sm" style={{ color: SAO.color.text.secondary }}>Loading...</p> : null}
            {!state.loading[state.activeTab] && page.contents.length === 0 ? <p className="py-6 text-center text-sm" style={{ color: SAO.color.text.secondary }}>No connections.</p> : null}

            {state.activeTab === "followings" ? state.followings.contents.map((following) => (
              <article key={following.followId} className="rounded-sm border p-3" style={{ borderColor: SAO.color.border.inner, background: SAO.color.bg.inset }}>
                <div className="flex items-start gap-3">
                  <Peer peer={following.peer} />
                  <span className="text-[10px] uppercase" style={{ color: SAO.color.text.label }}>
                    {[following.muted && "Muted", following.blocked && "Blocked"].filter(Boolean).join(" · ") || "Following"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={locked} onClick={() => void state.toggleMute(following)} className="px-2 py-1 text-xs disabled:opacity-40" style={buttonStyle}>{following.muted ? "Unmute" : "Mute"}</button>
                  <button type="button" disabled={locked} onClick={() => void state.toggleBlock(following)} className="px-2 py-1 text-xs disabled:opacity-40" style={buttonStyle}>{following.blocked ? "Unblock" : "Block"}</button>
                  <button type="button" disabled={locked} onClick={() => void state.unfollowFollowing(following)} className="px-2 py-1 text-xs disabled:opacity-40" style={{ ...buttonStyle, color: SAO.color.action.red }}>Unfollow</button>
                </div>
              </article>
            )) : state.followers.contents.map((follower) => {
              const inconsistent = follower.followedBack && follower.outboundFollowId === null;
              return (
                <article key={follower.peer.playerId} className="flex items-center gap-3 rounded-sm border p-3" style={{ borderColor: SAO.color.border.inner, background: SAO.color.bg.inset }}>
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

          <footer className="mt-3 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: SAO.color.border.subtle }}>
            <button type="button" disabled={pageIndex === 0} onClick={() => setPage((current) => current - 1)} className="px-3 py-1.5 text-xs disabled:opacity-40" style={buttonStyle}>Previous</button>
            <span className="text-xs" style={{ color: SAO.color.text.label }}>Page {page.totalPages === 0 ? 0 : page.page + 1} of {page.totalPages}</span>
            <button type="button" disabled={pageIndex + 1 >= page.totalPages} onClick={() => setPage((current) => current + 1)} className="px-3 py-1.5 text-xs disabled:opacity-40" style={buttonStyle}>Next</button>
          </footer>
        </aside>
      ) : null}
    </>
  );
}
