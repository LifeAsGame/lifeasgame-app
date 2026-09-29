import { describe, expect, it } from "vitest";
import { navigateConsumer, parseConsumerLocation } from "./useConsumerLocation";

describe("consumer navigation", () => {
  it("keeps navigation identifiers separate from commands", () => {
    expect(parseConsumerLocation("#/menu/quests/current/31")).toEqual({ open: true, main: "quests", sub: "current", detail: "31" });
    expect(parseConsumerLocation("#/menu/system/logout").sub).toBeNull();
    expect(parseConsumerLocation("#/menu/social").main).toBeNull();
    expect(parseConsumerLocation("#/menu/quests/catalog/%EA%B8%B0%EB%A1%9D").detail).toBe("기록");
    expect(parseConsumerLocation("#/%zz").open).toBe(false);
  });
  it("preserves unrelated search params, avoids duplicate entries and closes to Home", () => {
    window.history.replaceState(null, "", "/?source=test");
    navigateConsumer("quests", "current", "31");
    expect(window.location.hash).toBe("#/menu/quests/current/31");
    expect(window.location.search).toBe("?source=test");
    const length = window.history.length;
    navigateConsumer("quests", "current", "31");
    expect(window.history.length).toBe(length);
    navigateConsumer(null, null, null, false);
    expect(window.location.hash).toBe("");
  });
});
