import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";

import type { DirectChatState } from "./useDirectChat";
import DirectChatDrawer, { MessageTimestamp } from "./DirectChatDrawer";

vi.mock("@/features/auth/AuthContext", () => ({ useAuth: () => ({ playerId: 6 }) }));

it("renders canonical identity fields and opens an existing read-only channel without a friend-open POST", () => {
  const selectChannel = vi.fn();
  const openFriendChat = vi.fn();
  const chat = {
    open: true,
    setOpen: vi.fn(),
    channels: [
      { channelId: 10, peer: { playerId: 70, name: "A", job: null, level: 1 }, readOnly: false },
      { channelId: 20, peer: { playerId: 80, name: "B", job: "Mage", level: 2 }, readOnly: true },
    ],
    channelsLoading: false,
    channelsError: null,
    channelsRetry: vi.fn(),
    selectedChannelId: 20,
    selectChannel,
    messages: [
      { id: 1, channelId: 20, senderId: 80, content: "peer canonical", edited: true, createdAt: "2026-08-17T00:00:00Z" },
      { id: 2, channelId: 20, senderId: 6, content: "my canonical", edited: false, createdAt: "2026-08-18T00:00:00Z" },
    ],
    messagesLoading: false,
    messagesError: null,
    loadLatest: vi.fn(),
    hasMore: false,
    nextCursor: null,
    olderLoading: false,
    loadOlder: vi.fn(),
    draft: "",
    setDraft: vi.fn(),
    sending: false,
    sendError: null,
    send: vi.fn(),
    openingPeerId: null,
    openError: null,
    openFriendChat,
  } as unknown as DirectChatState;

  render(<DirectChatDrawer chat={chat} />);
  expect(screen.getByRole("dialog", { name: "친구와 직접 채팅" })).toBeInTheDocument();
  expect(screen.getAllByText("Mage · 레벨 2")).toHaveLength(2);
  expect(screen.getByText("나")).toBeInTheDocument();
  expect(screen.getByLabelText("내 메시지")).toHaveAttribute("data-owner", "mine");
  expect(screen.getByLabelText("B의 메시지")).toHaveAttribute("data-owner", "peer");
  expect(screen.getByText("수정됨")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "메시지" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "메시지 보내기" })).toBeDisabled();
  expect(screen.getByText("이 대화는 읽기 전용입니다.")).toHaveAttribute("role", "status");
  expect(screen.queryByText(/presence|typing|unread/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /A\s*레벨 1/i }));
  expect(selectChannel).toHaveBeenCalledWith(10);
  expect(openFriendChat).not.toHaveBeenCalled();

  const source = readFileSync("features/social/chat/DirectChatDrawer.tsx", "utf8");
  expect(source).not.toMatch(/group|guild|party|Role Relation|presence|data-theme/i);
  const css = readFileSync("app/globals.css", "utf8");
  const socialCss = css.slice(css.indexOf("/* v7 Social utilities"), css.indexOf(".lag-semantic-controls"));
  expect(socialCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
  expect(css).toContain("grid-template-rows: auto minmax(0, 1fr)");
  expect(css).toContain("height: calc(100dvh - 112px - env(safe-area-inset-bottom)");
});

it("keeps blocked history visible and requires explicit open or send retry", () => {
  const retryBlockedSend = vi.fn();
  const openFriendChat = vi.fn();
  const send = vi.fn();
  const chat = {
    open: true,
    setOpen: vi.fn(),
    channels: [{ channelId: 10, peer: { playerId: 70, name: "A", job: null, level: 1 }, readOnly: false }],
    channelsLoading: false,
    channelsError: null,
    selectedChannelId: 10,
    messages: [{ id: 1, channelId: 10, senderId: 6, content: "history", edited: false, createdAt: "2026-08-18T00:00:00Z" }],
    messagesLoading: false,
    messagesError: null,
    hasMore: true,
    olderLoading: false,
    loadOlder: vi.fn(),
    draft: "saved draft",
    setDraft: vi.fn(),
    sending: false,
    blocked: true,
    sendError: null,
    send,
    retryBlockedSend,
    openingPeerId: null,
    openError: { peerPlayerId: 70, blocked: true, message: "Direct Chat is blocked." },
    openFriendChat,
  } as unknown as DirectChatState;

  render(<DirectChatDrawer chat={chat} />);
  expect(screen.getByText("history")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "이전 메시지" })).toBeEnabled();
  expect(screen.getByRole("textbox", { name: "메시지" })).toHaveValue("saved draft");
  expect(screen.getByRole("button", { name: "메시지 보내기" })).toBeDisabled();
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "다시 열기" }));
  fireEvent.click(screen.getByRole("button", { name: "전송 재시도" }));
  expect(openFriendChat).toHaveBeenCalledWith(70);
  expect(retryBlockedSend).toHaveBeenCalledTimes(1);
});

it("marks only a visible peer message and never submits during IME composition", () => {
  const markVisibleRead = vi.fn();
  const send = vi.fn();
  const chat = {
    open: true, setOpen: vi.fn(),
    channels: [{ channelId: 10, peer: { playerId: 70, name: "A", job: null, level: 1 }, readOnly: false }],
    selectedChannelId: 10,
    messages: [{ id: 8, channelId: 10, senderId: 70, content: "hello", edited: false, createdAt: "2026-08-18T00:00:00Z" }],
    messagesLoading: false, hasMore: false, olderLoading: false, draft: "reply", sending: false,
    markVisibleRead, send,
  } as unknown as DirectChatState;
  render(<DirectChatDrawer chat={chat} />);
  const list = document.querySelector(".lag-chat-message-list")!;
  const peer = document.querySelector("article[data-owner=peer]")!;
  list.getBoundingClientRect = () => ({ top: 0, bottom: 100 } as DOMRect);
  peer.getBoundingClientRect = () => ({ top: 20, bottom: 60 } as DOMRect);
  fireEvent.scroll(list);
  expect(markVisibleRead).toHaveBeenCalledWith(8);
  markVisibleRead.mockClear();
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  fireEvent.scroll(list);
  expect(markVisibleRead).not.toHaveBeenCalled();
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  const input = screen.getByRole("textbox", { name: "메시지" });
  fireEvent.compositionStart(input);
  fireEvent.submit(input.closest("form")!);
  expect(send).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  fireEvent.submit(input.closest("form")!);
  expect(send).toHaveBeenCalledTimes(1);
});

it("renders an authoritative deterministic timestamp before client localization", () => {
  const createdAt = "2026-08-18T00:00:00Z";
  const localize = vi.spyOn(Date.prototype, "toLocaleString");
  const html = renderToString(<MessageTimestamp createdAt={createdAt} />);

  expect(localize).not.toHaveBeenCalled();
  expect(html).toContain(`dateTime="${createdAt}"`);
  expect(html).toContain(`>${createdAt}</time>`);
  localize.mockRestore();
});

it("uses the same bounded shared drag behavior as Connections", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  const chat = {
    open: true,
    setOpen: vi.fn(),
    channels: [],
    channelsLoading: false,
    channelsError: null,
    channelsRetry: vi.fn(),
    selectedChannelId: null,
    selectChannel: vi.fn(),
    messages: [],
    messagesLoading: false,
    messagesError: null,
    loadLatest: vi.fn(),
    hasMore: false,
    olderLoading: false,
    loadOlder: vi.fn(),
    draft: "",
    setDraft: vi.fn(),
    sending: false,
    sendError: null,
    send: vi.fn(),
    openError: null,
  } as unknown as DirectChatState;
  render(<DirectChatDrawer chat={chat} />);
  const dialog = screen.getByRole("dialog", { name: "친구와 직접 채팅" });
  dialog.getBoundingClientRect = () => ({ left: 0, right: 720, top: 0, bottom: 680, width: 720, height: 680, x: 0, y: 0, toJSON: () => ({}) });

  fireEvent.pointerDown(dialog.querySelector("header")!, { button: 0, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(window, { clientX: 2000, clientY: 2000 });

  expect(dialog).toHaveStyle({ left: "464px", top: "104px" });
});

it("initializes the first desktop portal position after the Chat dialog mounts", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, right: 720, top: 0, bottom: 680, width: 720, height: 680, x: 0, y: 0, toJSON: () => ({}) });
  const chat = {
    open: true,
    setOpen: vi.fn(),
    channels: [],
    channelsLoading: false,
    channelsError: null,
    channelsRetry: vi.fn(),
    selectedChannelId: null,
    selectChannel: vi.fn(),
    messages: [],
    messagesLoading: false,
    messagesError: null,
    loadLatest: vi.fn(),
    hasMore: false,
    olderLoading: false,
    loadOlder: vi.fn(),
    draft: "",
    setDraft: vi.fn(),
    sending: false,
    sendError: null,
    send: vi.fn(),
    openError: null,
  } as unknown as DirectChatState;

  render(<DirectChatDrawer chat={chat} />);

  await waitFor(() => expect(screen.getByRole("dialog", { name: "친구와 직접 채팅" })).toHaveStyle({ left: "456px", top: "24px" }));
  rect.mockRestore();
});
