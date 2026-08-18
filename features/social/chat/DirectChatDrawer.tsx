"use client";

import { useEffect } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { SAO } from "@/shared/design/tokens";
import type { DirectChatState } from "./useDirectChat";

const buttonStyle = {
  border: `1px solid ${SAO.color.border.inner}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.input,
} as const;

export default function DirectChatDrawer({ chat, onOpen }: { chat: DirectChatState; onOpen?: () => void }) {
  const { playerId } = useAuth();
  const { open, setOpen } = chat;
  const selected = chat.channels.find(({ channelId }) => channelId === chat.selectedChannelId) ?? null;

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
        aria-label="Direct Chat"
        aria-expanded={chat.open}
        onClick={() => {
          if (!chat.open) onOpen?.();
          chat.setOpen(!chat.open);
        }}
        className="h-[34px] rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={buttonStyle}
      >
        Chat
      </button>

      {chat.open ? (
        <aside
          role="dialog"
          aria-label="Direct Friend Chat"
          className="fixed right-6 top-6 z-[500000] flex h-[min(680px,calc(100vh-3rem))] w-[min(720px,calc(100vw-3rem))] flex-col overflow-hidden p-4"
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
              <h2 className="text-lg font-semibold tracking-[0.08em]" style={{ color: SAO.color.text.primary }}>Direct Chat</h2>
            </div>
            <button type="button" aria-label="Close Direct Chat" onClick={() => chat.setOpen(false)} className="px-3 py-2 text-xs" style={buttonStyle}>Close</button>
          </header>

          {chat.openError ? <p role="alert" className="mt-2 text-xs" style={{ color: SAO.color.action.red }}>{chat.openError}</p> : null}
          <div className="mt-4 grid min-h-0 flex-1 grid-cols-[190px_1fr] gap-3">
            <section aria-label="Friend channels" className="min-h-0 overflow-y-auto border-r pr-3" style={{ borderColor: SAO.color.border.subtle }}>
              {chat.channelsLoading ? <p className="py-4 text-xs" style={{ color: SAO.color.text.secondary }}>Loading channels...</p> : null}
              {chat.channelsError ? <div><p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{chat.channelsError}</p><button type="button" className="mt-2 px-2 py-1 text-xs" style={buttonStyle} onClick={() => void chat.channelsRetry()}>Retry</button></div> : null}
              {!chat.channelsLoading && !chat.channelsError && chat.channels.length === 0 ? <p className="py-4 text-xs" style={{ color: SAO.color.text.secondary }}>No friend channels.</p> : null}
              <div className="space-y-2">
                {chat.channels.map((channel) => (
                  <button
                    key={channel.channelId}
                    type="button"
                    aria-pressed={channel.channelId === chat.selectedChannelId}
                    onClick={() => void chat.selectChannel(channel.channelId)}
                    className="w-full p-2 text-left"
                    style={{ ...buttonStyle, borderColor: channel.channelId === chat.selectedChannelId ? SAO.color.border.gold : SAO.color.border.inner }}
                  >
                    <strong className="block truncate text-xs">{channel.peer.name}</strong>
                    <span className="block truncate text-[10px]" style={{ color: SAO.color.text.label }}>{channel.peer.job ? `${channel.peer.job} · ` : ""}Level {channel.peer.level}</span>
                    {channel.readOnly ? <span className="text-[10px] uppercase" style={{ color: SAO.color.action.red }}>Read only</span> : null}
                  </button>
                ))}
              </div>
            </section>

            <section aria-label="Messages" className="flex min-h-0 flex-col">
              {!selected ? <p className="m-auto text-sm" style={{ color: SAO.color.text.secondary }}>Select a friend channel.</p> : playerId === null ? <p role="alert" className="m-auto text-sm" style={{ color: SAO.color.action.red }}>Authenticated player identity is unavailable.</p> : (
                <>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {chat.hasMore ? <button type="button" disabled={chat.olderLoading} onClick={() => void chat.loadOlder()} className="mx-auto block px-3 py-1 text-xs disabled:opacity-40" style={buttonStyle}>{chat.olderLoading ? "Loading..." : "Load older"}</button> : null}
                    {chat.messagesError ? <div className="text-center"><p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{chat.messagesError}</p><button type="button" className="mt-2 px-2 py-1 text-xs" style={buttonStyle} onClick={() => void chat.loadLatest()}>Retry</button></div> : null}
                    {chat.messagesLoading ? <p className="py-8 text-center text-sm" style={{ color: SAO.color.text.secondary }}>Loading messages...</p> : null}
                    {!chat.messagesLoading && chat.messages.map((message) => {
                      const mine = message.senderId === playerId;
                      return (
                        <article key={message.id} className={`max-w-[85%] rounded-sm border p-2 ${mine ? "ml-auto" : "mr-auto"}`} style={{ borderColor: SAO.color.border.inner, background: SAO.color.bg.inset }}>
                          <div className="flex gap-2 text-[10px]" style={{ color: SAO.color.text.label }}><span>{mine ? "You" : selected.peer.name}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>{message.edited ? <span>Edited</span> : null}</div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm" style={{ color: SAO.color.text.primary }}>{message.content}</p>
                        </article>
                      );
                    })}
                  </div>
                  <form className="mt-3 border-t pt-3" style={{ borderColor: SAO.color.border.subtle }} onSubmit={(event) => { event.preventDefault(); void chat.send(); }}>
                    {selected.readOnly ? <p className="mb-2 text-xs" style={{ color: SAO.color.text.label }}>This channel is read-only.</p> : null}
                    {chat.sendError ? <p role="alert" className="mb-2 text-xs" style={{ color: SAO.color.action.red }}>{chat.sendError}</p> : null}
                    <div className="flex gap-2">
                      <textarea aria-label="Message" rows={2} disabled={selected.readOnly || chat.sending} value={chat.draft} onChange={(event) => chat.setDraft(event.target.value)} className="min-w-0 flex-1 resize-none px-3 py-2 text-sm disabled:opacity-40" style={buttonStyle} />
                      <button type="submit" disabled={selected.readOnly || chat.sending || !chat.draft.trim()} className="px-4 text-xs disabled:opacity-40" style={buttonStyle}>{chat.sending ? "Sending..." : "Send"}</button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>
        </aside>
      ) : null}
    </>
  );
}
