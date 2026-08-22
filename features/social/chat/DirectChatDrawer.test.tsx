import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    messages: [{ id: 1, channelId: 20, senderId: 6, content: "canonical", edited: false, createdAt: "2026-08-18T00:00:00Z" }],
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
  expect(screen.getByRole("dialog", { name: "Direct Friend Chat" })).toBeInTheDocument();
  expect(screen.getByText("Mage · Level 2")).toBeInTheDocument();
  expect(screen.getByText("You")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Message" })).toBeDisabled();
  expect(screen.queryByText(/presence|typing|unread/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /A\s*Level 1/i }));
  expect(selectChannel).toHaveBeenCalledWith(10);
  expect(openFriendChat).not.toHaveBeenCalled();
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
  const dialog = screen.getByRole("dialog", { name: "Direct Friend Chat" });
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

  await waitFor(() => expect(screen.getByRole("dialog", { name: "Direct Friend Chat" })).toHaveStyle({ left: "456px", top: "24px" }));
  rect.mockRestore();
});
