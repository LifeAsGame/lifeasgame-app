"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { useDraggableWindow } from "@/shared/hooks/useDraggableWindow";
import UtilityPortal from "@/shared/ui/UtilityPortal";
import type { DirectChatState } from "./useDirectChat";

export function MessageTimestamp({ createdAt }: { createdAt: string }) {
  const [label, setLabel] = useState(createdAt);
  useEffect(() => setLabel(new Date(createdAt).toLocaleString()), [createdAt]);
  return <time dateTime={createdAt}>{label}</time>;
}

export default function DirectChatDrawer({ chat, onOpen }: { chat: DirectChatState; onOpen?: () => void }) {
  const { playerId } = useAuth();
  const { open, setOpen } = chat;
  const selected = chat.channels.find(({ channelId }) => channelId === chat.selectedChannelId) ?? null;
  const floating = useDraggableWindow(open);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, setOpen]);

  return (
    <>
      <button type="button" aria-label="Direct Chat" aria-expanded={chat.open} title="Direct Chat" onClick={() => {
        if (!chat.open) onOpen?.();
        chat.setOpen(!chat.open);
      }} className="lag-utility-button">
        <span className="lag-utility-label">CH</span>
      </button>

      {chat.open ? (
        <UtilityPortal>
          <aside ref={floating.windowRef} role="dialog" aria-label="Direct Friend Chat" className="lag-utility-drawer lag-social-drawer lag-direct-chat-drawer" style={floating.windowStyle}>
            <header className="lag-utility-drag-handle lag-social-header" {...floating.dragHandleProps}>
              <div><p>Current Player</p><h2>Direct Chat</h2></div>
              <button type="button" aria-label="Close Direct Chat" onClick={() => chat.setOpen(false)} className="lag-social-button">Close</button>
            </header>

            {chat.openError ? <p role="alert" className="lag-social-feedback" data-state="error">{chat.openError}</p> : null}
            <div className="lag-chat-layout">
              <section aria-label="Friend channels" className="lag-chat-channels">
                <header><span>Friend Channels</span><strong>{chat.channels.length}</strong></header>
                {chat.channelsLoading ? <p role="status" className="lag-social-empty">Loading channels...</p> : null}
                {chat.channelsError ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">{chat.channelsError}</p><button type="button" className="lag-social-button" onClick={() => void chat.channelsRetry()}>Retry</button></div> : null}
                {!chat.channelsLoading && !chat.channelsError && chat.channels.length === 0 ? <p className="lag-social-empty">No friend channels.</p> : null}
                <div className="lag-chat-channel-list">
                  {chat.channels.map((channel) => (
                    <button key={channel.channelId} type="button" aria-pressed={channel.channelId === chat.selectedChannelId} data-selected={channel.channelId === chat.selectedChannelId} onClick={() => void chat.selectChannel(channel.channelId)} className="lag-chat-channel">
                      <span className="lag-social-peer-mark" aria-hidden>{channel.peer.name.trim().charAt(0).toUpperCase() || "?"}</span>
                      <span><strong>{channel.peer.name}</strong><small>{channel.peer.job ? `${channel.peer.job} · ` : ""}Level {channel.peer.level}</small>{channel.readOnly ? <small className="lag-chat-read-only">Read only</small> : null}</span>
                      <b aria-hidden>→</b>
                    </button>
                  ))}
                </div>
              </section>

              <section aria-label="Messages" className="lag-chat-conversation">
                {!selected ? <p className="lag-social-empty lag-chat-placeholder">Select a friend channel.</p> : playerId === null ? <p role="alert" className="lag-social-feedback" data-state="error">Authenticated player identity is unavailable.</p> : (
                  <>
                    <header className="lag-chat-conversation-header">
                      <div><span>Direct Chat</span><h3>{selected.peer.name}</h3><p>{selected.peer.job ? `${selected.peer.job} · ` : ""}Level {selected.peer.level}</p></div>
                      {selected.readOnly ? <strong>Read only</strong> : null}
                    </header>

                    <div className="lag-chat-message-list">
                      {chat.hasMore ? <button type="button" disabled={chat.olderLoading} onClick={() => void chat.loadOlder()} className="lag-chat-load-older">{chat.olderLoading ? "Loading..." : "Load older"}</button> : null}
                      {chat.messagesError ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">{chat.messagesError}</p><button type="button" className="lag-social-button" onClick={() => void chat.loadLatest()}>Retry</button></div> : null}
                      {chat.messagesLoading ? <p role="status" className="lag-social-empty">Loading messages...</p> : null}
                      {!chat.messagesLoading && !chat.messagesError && chat.messages.length === 0 ? <p className="lag-social-empty">No messages yet.</p> : null}
                      {!chat.messagesLoading && chat.messages.map((message) => {
                        const mine = message.senderId === playerId;
                        return (
                          <article key={message.id} className="lag-chat-message" data-owner={mine ? "mine" : "peer"} aria-label={mine ? "Message from you" : `Message from ${selected.peer.name}`}>
                            <div><strong>{mine ? "You" : selected.peer.name}</strong><MessageTimestamp createdAt={message.createdAt} />{message.edited ? <span>Edited</span> : null}</div>
                            <p>{message.content}</p>
                          </article>
                        );
                      })}
                    </div>

                    <form className="lag-chat-composer" onSubmit={(event) => { event.preventDefault(); void chat.send(); }}>
                      {selected.readOnly ? <p role="status">This channel is read-only.</p> : null}
                      {chat.sendError ? <p role="alert" className="lag-social-feedback" data-state="error">{chat.sendError}</p> : null}
                      <div>
                        <textarea aria-label="Message" rows={2} placeholder={selected.readOnly ? "Read-only channel" : "Write a message"} disabled={selected.readOnly || chat.sending} value={chat.draft} onChange={(event) => chat.setDraft(event.target.value)} />
                        <button type="submit" aria-label="Send message" disabled={selected.readOnly || chat.sending || !chat.draft.trim()}>{chat.sending ? "Sending..." : <><span>Send</span><b aria-hidden>↑</b></>}</button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            </div>
          </aside>
        </UtilityPortal>
      ) : null}
    </>
  );
}
