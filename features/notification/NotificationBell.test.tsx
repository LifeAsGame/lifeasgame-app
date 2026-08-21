import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationBell, NotificationTimestamp } from "./NotificationBell";

const state = vi.hoisted(() => ({
  inbox: [
    { id: 2, type: "SYSTEM_NOTICE" as const, title: "Unread", body: "Canonical body", occurredAt: "2026-08-18T12:34:56Z", read: false },
    { id: 1, type: "MAIL_RECEIVED" as const, title: "Read", body: "Older body", occurredAt: "2026-08-17T11:22:33Z", read: true },
    { id: 0, type: "FUTURE_ANNOUNCEMENT", title: "Future title", body: "Future body", occurredAt: "2026-08-16T10:20:30Z", read: true },
  ],
  inboxLoaded: false,
  inboxLoading: false,
  inboxError: null,
  loadInbox: vi.fn(),
  inboxRetry: vi.fn(),
  hasMore: true,
  nextCursor: 1,
  olderLoading: false,
  loadOlder: vi.fn(),
  unreadCount: 7,
  unreadLoading: false,
  unreadError: null,
  unreadRetry: vi.fn(),
  pendingId: null,
  markAllPending: false,
  mutationError: null,
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));
vi.mock("./useNotifications", () => ({ useNotifications: () => state }));

describe("NotificationBell canonical surface", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses unread authority, loads inbox on open without auto-reading, and exposes no clear/delete", () => {
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "알림 7건" })).toHaveTextContent("7");
    expect(state.loadInbox).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "알림 7건" }));
    expect(state.loadInbox).toHaveBeenCalledTimes(1);
    expect(state.markAllRead).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Mark read" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "모두 읽음" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Load older" })).toBeInTheDocument();
    expect(screen.queryByText(/전체 삭제|clear|delete/i)).not.toBeInTheDocument();
    expect(screen.getByText("Future title")).toBeInTheDocument();
    expect(screen.getByText("Future body")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Notification" })).toHaveTextContent("!");

    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    expect(state.markRead).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "모두 읽음" }));
    expect(state.markAllRead).toHaveBeenCalledTimes(1);
  });

  it("renders deterministic initial timestamp text without render-time Date.now", () => {
    const now = vi.spyOn(Date, "now");
    const first = renderToStaticMarkup(<NotificationTimestamp occurredAt="2026-08-18T12:34:56.789Z" />);
    const second = renderToStaticMarkup(<NotificationTimestamp occurredAt="2026-08-18T12:34:56.789Z" />);
    expect(first).toBe(second);
    expect(first).toContain("2026-08-18 12:34 UTC");
    expect(now).not.toHaveBeenCalled();
  });

  it("uses dual-theme semantic surfaces without the fixed dark/gold container", () => {
    const source = readFileSync("features/notification/NotificationBell.tsx", "utf8");

    expect(source).toContain("lag-utility-button");
    expect(source).toContain("lag-notification-dropdown");
    expect(source).toContain("var(--lag-control-bg)");
    expect(source).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}/);
  });
});
