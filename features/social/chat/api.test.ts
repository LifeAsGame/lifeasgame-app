import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFriendChannelsApi, getFriendMessagesApi, markFriendReadApi, openFriendChannelApi, sendFriendMessageApi } from "./api";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Direct Friend Chat API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue([]);
    client.apiPost.mockResolvedValue({ id: 900 });
  });

  it("uses canonical channel and cursor routes without inferred identity fields", async () => {
    await getFriendChannelsApi();
    await openFriendChannelApi(77);
    await getFriendMessagesApi(900);
    await getFriendMessagesApi(900, 41, 20);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/chat/channels/friends");
    expect(client.apiPost).toHaveBeenNthCalledWith(1, "/api/v1/chat/channels/friend/77", {});
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/chat/channels/900/messages?size=50");
    expect(client.apiGet).toHaveBeenNthCalledWith(3, "/api/v1/chat/channels/900/messages?cursor=41&size=20");
  });

  it("sends the stable message key once and targets the read command", async () => {
    await sendFriendMessageApi(900, "hello", "key-1");
    await markFriendReadApi(900, 123);
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/chat/channels/900/messages",
      { content: "hello", clientMessageId: "key-1" },
      { retry: false },
    );
    expect(client.apiPost).toHaveBeenCalledWith("/api/v1/chat/channels/900/read", { lastReadMessageId: 123 });
  });
});
