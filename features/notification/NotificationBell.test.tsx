import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("uses unread authority and opens inbox without an implicit read mutation", () => {
    render(<NotificationBell />);
    const trigger = screen.getByRole("button", { name: "Notifications, 7 unread" });
    expect(trigger).toHaveTextContent("7");
    expect(state.loadInbox).not.toHaveBeenCalled();

    fireEvent.click(trigger);
    expect(state.loadInbox).toHaveBeenCalledTimes(1);
    expect(state.markRead).not.toHaveBeenCalled();
    expect(state.markAllRead).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all read" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Load older" })).toBeInTheDocument();
    expect(screen.queryByText(/clear|delete/i)).not.toBeInTheDocument();
  });

  it("selects a stable local detail without marking read, then reads only through explicit actions", () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 7 unread" }));

    fireEvent.click(screen.getByText("Canonical body").closest("button")!);
    const detail = screen.getByLabelText("Notification detail");
    expect(detail).toBeInTheDocument();
    expect(within(detail).getByText("System notice")).toBeInTheDocument();
    expect(within(detail).getByText("Canonical body")).toBeInTheDocument();
    expect(state.markRead).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Future body").closest("button")!);
    expect(screen.getByLabelText("Notification detail")).toBe(detail);
    expect(within(detail).getByRole("img", { name: "Notification" })).toHaveTextContent("!");
    expect(state.markRead).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Canonical body").closest("button")!);
    fireEvent.click(within(detail).getByRole("button", { name: "Mark read" }));
    expect(state.markRead).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(state.markAllRead).toHaveBeenCalledTimes(1);

    fireEvent.click(within(detail).getByRole("button", { name: /Back to inbox/ }));
    expect(screen.queryByLabelText("Notification detail")).not.toBeInTheDocument();
  });

  it("renders canonical known/unknown rows with structural read state and readable timestamps", () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 7 unread" }));

    expect(screen.getByText("Future title")).toBeInTheDocument();
    expect(screen.getByText("Future body")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Notification" })).toHaveTextContent("!");
    expect(screen.getByRole("img", { name: "Mail received" })).toHaveTextContent("✉");
    expect(screen.getByText("Canonical body").closest("article")).toHaveAttribute("data-read", "false");
    expect(screen.getByText("Older body").closest("article")).toHaveAttribute("data-read", "true");
    expect(screen.getByText("2026-08-18 12:34 UTC").closest("time")).toHaveAttribute("dateTime", "2026-08-18T12:34:56Z");
  });

  it("closes on outside click while retaining viewport placement wiring", async () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 7 unread" }));
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument());

    const source = readFileSync("features/notification/NotificationBell.tsx", "utf8");
    expect(source).toContain("notificationPopupPosition");
    expect(source).toContain("ResizeObserver");
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain("max-height: calc(100dvh - 112px - env(safe-area-inset-bottom)");
  });

  it("renders deterministic initial timestamp text without render-time Date.now", () => {
    const now = vi.spyOn(Date, "now");
    const first = renderToStaticMarkup(<NotificationTimestamp occurredAt="2026-08-18T12:34:56.789Z" />);
    const second = renderToStaticMarkup(<NotificationTimestamp occurredAt="2026-08-18T12:34:56.789Z" />);
    expect(first).toBe(second);
    expect(first).toContain("2026-08-18 12:34 UTC");
    expect(now).not.toHaveBeenCalled();
  });

  it("uses local semantic styling without filters, screenshot content, or theme branches", () => {
    const source = readFileSync("features/notification/NotificationBell.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");
    const notificationCss = css.slice(css.indexOf("/* Notification inbox utility"), css.indexOf(".lag-semantic-controls"));

    expect(source).not.toMatch(/RoleEvent|Archive Trace|Focus \/ Depth|Wish|data-theme|category filter|unread filter/i);
    expect(source).not.toContain("--lag-meta");
    expect(notificationCss).toContain(".lag-notification-time");
    expect(notificationCss).toContain("color: var(--lag-text-2)");
    expect(notificationCss).not.toContain("--lag-meta");
    expect(notificationCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(css).toContain('.lag-notification-dropdown[data-view="detail"] .lag-notification-inbox');
  });
});
