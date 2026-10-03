"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const olderAnchor = useRef<{ height: number; top: number } | null>(null);
  const composing = useRef(false);
  const [newBelow, setNewBelow] = useState(false);

  const visibleRead = () => {
    const list = listRef.current;
    if (!list || !open || document.hidden) return;
    const bounds = list.getBoundingClientRect();
    let lastVisible = 0;
    for (const item of list.querySelectorAll<HTMLElement>('article[data-owner="peer"]')) {
      const rect = item.getBoundingClientRect();
      if (rect.bottom > bounds.top && rect.top < bounds.bottom) lastVisible = Math.max(lastVisible, Number(item.dataset.messageId));
    }
    if (lastVisible) chat.markVisibleRead?.(lastVisible);
  };

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (olderAnchor.current && !chat.olderLoading) {
      list.scrollTop = olderAnchor.current.top + list.scrollHeight - olderAnchor.current.height;
      olderAnchor.current = null;
    } else if (nearBottom.current) {
      list.scrollTop = list.scrollHeight;
      setNewBelow(false);
    } else if (chat.messages.length) {
      setNewBelow(true);
    }
    visibleRead();
  // The message list is the trigger; callbacks intentionally read current DOM and props.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.messages, chat.olderLoading, chat.selectedChannelId, open]);

  useEffect(() => {
    nearBottom.current = true;
    setNewBelow(false);
  }, [chat.selectedChannelId]);

  useEffect(() => {
    document.addEventListener("visibilitychange", visibleRead);
    return () => document.removeEventListener("visibilitychange", visibleRead);
  });

  useEffect(() => {
    if (!open && wasOpen.current) triggerRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, setOpen]);

  return (
    <>
      <button ref={triggerRef} type="button" aria-label="직접 채팅" aria-expanded={chat.open} title="직접 채팅" onClick={() => {
        if (!chat.open) onOpen?.();
        chat.setOpen(!chat.open);
      }} className="lag-utility-button">
        <span className="lag-utility-label">CH</span>
      </button>

      {chat.open ? (
        <UtilityPortal>
          <aside ref={floating.windowRef} role="dialog" aria-label="친구와 직접 채팅" className="lag-utility-drawer lag-social-drawer lag-direct-chat-drawer" style={floating.windowStyle}>
            <header className="lag-utility-drag-handle lag-social-header" {...floating.dragHandleProps}>
              <div><p>내 계정</p><h2>직접 채팅</h2></div>
              <button type="button" aria-label="채팅 닫기" onClick={() => chat.setOpen(false)} className="lag-social-button">닫기</button>
            </header>

            {chat.openError ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">{chat.openError.message}</p>{chat.openError.blocked ? <button type="button" className="lag-social-button" disabled={chat.openingPeerId !== null} onClick={() => void chat.openFriendChat(chat.openError!.peerPlayerId)}>다시 열기</button> : null}</div> : null}
            <div className="lag-chat-layout">
              <section aria-label="친구 대화 목록" className="lag-chat-channels">
                <header><span>친구 대화</span><strong>{chat.channels.length}</strong></header>
                {chat.channelsLoading ? <p role="status" className="lag-social-empty">대화를 불러오는 중…</p> : null}
                {chat.channelsError ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">{chat.channelsError}</p><button type="button" className="lag-social-button" onClick={() => void chat.channelsRetry()}>다시 조회</button></div> : null}
                {!chat.channelsLoading && !chat.channelsError && chat.channels.length === 0 ? <p className="lag-social-empty">친구 대화가 없습니다.</p> : null}
                <div className="lag-chat-channel-list">
                  {chat.channels.map((channel) => (
                    <button key={channel.channelId} type="button" aria-pressed={channel.channelId === chat.selectedChannelId} data-selected={channel.channelId === chat.selectedChannelId} onClick={() => void chat.selectChannel(channel.channelId)} className="lag-chat-channel">
                      <span className="lag-social-peer-mark" aria-hidden>{channel.peer.name.trim().charAt(0).toUpperCase() || "?"}</span>
                      <span><strong>{channel.peer.name}</strong><small>{channel.peer.job ? `${channel.peer.job} · ` : ""}레벨 {channel.peer.level}</small>{channel.readOnly ? <small className="lag-chat-read-only">읽기 전용</small> : null}{channel.unreadCount ? <small className="lag-chat-unread" aria-label={`안 읽은 메시지 ${channel.unreadCount}개`}>안 읽음 {channel.unreadCount}</small> : null}</span>
                      <b aria-hidden>→</b>
                    </button>
                  ))}
                </div>
              </section>

              <section aria-label="메시지" className="lag-chat-conversation">
                {!selected ? <p className="lag-social-empty lag-chat-placeholder">대화를 선택하세요.</p> : playerId === null ? <p role="alert" className="lag-social-feedback" data-state="error">로그인한 플레이어를 확인할 수 없습니다.</p> : (
                  <>
                    <header className="lag-chat-conversation-header">
                      <div><span>Direct Chat</span><h3>{selected.peer.name}</h3><p>{selected.peer.job ? `${selected.peer.job} · ` : ""}레벨 {selected.peer.level}</p></div>
                      {selected.readOnly ? <strong>읽기 전용</strong> : null}
                    </header>

                    {chat.connectionStatus && chat.connectionStatus !== "connected" ? <p role="status" className="lag-chat-connection">{chat.connectionStatus === "connecting" ? "연결 중…" : chat.connectionStatus === "reconnecting" ? "연결을 다시 시도하는 중…" : "연결이 끊겼습니다. 메시지 조회와 전송은 사용할 수 있습니다."}</p> : null}

                    <div ref={listRef} className="lag-chat-message-list" onScroll={() => {
                      const list = listRef.current;
                      if (!list) return;
                      nearBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
                      if (nearBottom.current) setNewBelow(false);
                      visibleRead();
                    }}>
                      {chat.hasMore ? <button type="button" disabled={chat.olderLoading} onClick={() => {
                        const list = listRef.current;
                        if (list) olderAnchor.current = { height: list.scrollHeight, top: list.scrollTop };
                        void chat.loadOlder();
                      }} className="lag-chat-load-older">{chat.olderLoading ? "불러오는 중…" : "이전 메시지"}</button> : null}
                      {chat.messagesError ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">{chat.messagesError}</p><button type="button" className="lag-social-button" onClick={() => void chat.loadLatest()}>다시 조회</button></div> : null}
                      {chat.messagesLoading ? <p role="status" className="lag-social-empty">메시지를 불러오는 중…</p> : null}
                      {!chat.messagesLoading && !chat.messagesError && chat.messages.length === 0 ? <p className="lag-social-empty">아직 메시지가 없습니다.</p> : null}
                      {!chat.messagesLoading && chat.messages.map((message) => {
                        const mine = message.senderId === playerId;
                        return (
                          <article key={message.id} className="lag-chat-message" data-message-id={message.id} data-owner={mine ? "mine" : "peer"} aria-label={mine ? "내 메시지" : `${selected.peer.name}의 메시지`}>
                            <div><strong>{mine ? "나" : selected.peer.name}</strong><MessageTimestamp createdAt={message.createdAt} />{message.edited ? <span>수정됨</span> : null}</div>
                            <p>{message.content}</p>
                            {mine && selected.peerLastReadMessageId != null && message.id <= selected.peerLastReadMessageId ? <small>읽음</small> : null}
                          </article>
                        );
                      })}
                    </div>

                    {newBelow ? <button type="button" className="lag-chat-new-below" onClick={() => {
                      const list = listRef.current;
                      if (list) list.scrollTop = list.scrollHeight;
                      nearBottom.current = true;
                      setNewBelow(false);
                      visibleRead();
                    }}>새 메시지 보기</button> : null}

                    <form className="lag-chat-composer" onSubmit={(event) => { event.preventDefault(); if (!composing.current) void chat.send(); }}>
                      {selected.readOnly ? <p role="status">이 대화는 읽기 전용입니다.</p> : null}
                      {chat.blocked ? <div className="lag-social-state"><p role="alert" className="lag-social-feedback" data-state="error">이 대화는 차단되어 있습니다. 기존 메시지는 읽을 수 있습니다.</p>{!selected.readOnly ? <button type="button" className="lag-social-button" disabled={chat.sending || !chat.draft.trim()} onClick={() => void chat.retryBlockedSend()}>전송 재시도</button> : null}</div> : chat.sendError ? <p role="alert" className="lag-social-feedback" data-state="error">{chat.sendError}</p> : null}
                      <div>
                        <textarea aria-label="메시지" rows={2} placeholder={selected.readOnly ? "읽기 전용 대화" : "메시지를 입력하세요"} disabled={selected.readOnly || chat.sending} value={chat.draft} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onChange={(event) => chat.setDraft(event.target.value)} />
                        <button type="submit" aria-label="메시지 보내기" disabled={selected.readOnly || chat.blocked || chat.sending || !chat.draft.trim()}>{chat.sending ? "전송 중…" : <><span>보내기</span><b aria-hidden>↑</b></>}</button>
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
