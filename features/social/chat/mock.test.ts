import { beforeEach, describe, expect, it } from "vitest";

import { connectionsMock } from "../mock";
import { directChatMock } from "./mock";

describe("Direct Friend Chat mock authority", () => {
  beforeEach(() => {
    connectionsMock.reset();
    directChatMock.reset();
  });

  it("matches backend oldest-to-newest cursor pages and persists sent messages", () => {
    const latest = directChatMock.listMessages(101, null, 50);
    expect(latest.messages.map(({ id }) => id)).toEqual(Array.from({ length: 50 }, (_, index) => index + 6));
    expect(latest).toMatchObject({ hasMore: true, nextCursor: 6 });

    const older = directChatMock.listMessages(101, latest.nextCursor, 50);
    expect(older.messages.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5]);
    expect(older).toMatchObject({ hasMore: false, nextCursor: null });

    const sent = directChatMock.sendMessage(101, "authoritative");
    expect(directChatMock.listMessages(101, null, 50).messages.at(-1)).toEqual(sent);
  });

  it("opens only current mutual peers while existing channels remain listable", () => {
    expect(directChatMock.listChannels().map(({ channelId }) => channelId)).toEqual([101, 102]);
    expect(directChatMock.openFriend(7).id).toBe(101);
    expect(() => directChatMock.openFriend(13)).toThrow(/mutual/i);

    connectionsMock.follow(34);
    const opened = directChatMock.openFriend(34);
    expect(directChatMock.listChannels().some(({ channelId, peer }) => channelId === opened.id && peer.playerId === 34)).toBe(true);
  });
});
