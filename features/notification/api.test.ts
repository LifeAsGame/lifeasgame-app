import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNotificationsApi, getUnreadCountApi, markAllNotificationsReadApi, markNotificationReadApi } from "./api";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Notification API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue({});
    client.apiPost.mockResolvedValue({});
  });

  it("uses canonical inbox, unread, and read command routes", async () => {
    await getNotificationsApi();
    await getNotificationsApi(81, 20);
    await getUnreadCountApi();
    await markNotificationReadApi(91);
    await markAllNotificationsReadApi();

    expect(client.apiGet.mock.calls).toEqual([
      ["/api/v1/notifications?size=20"],
      ["/api/v1/notifications?cursor=81&size=20"],
      ["/api/v1/notifications/unread-count"],
    ]);
    expect(client.apiPost.mock.calls).toEqual([
      ["/api/v1/notifications/91/read", {}],
      ["/api/v1/notifications/read-all", {}],
    ]);
  });
});
