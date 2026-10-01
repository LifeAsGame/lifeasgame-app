import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "./api";
import ConnectionsDrawer from "./ConnectionsDrawer";
import { connectionsMock } from "./mock";

vi.mock("@/shared/api/client", async (importOriginal) => ({ ...await importOriginal<typeof import("@/shared/api/client")>(), USE_MOCK: true }));

describe("Connections utility drawer surface", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    connectionsMock.reset();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  });

  it("opens outside OrbNav and renders only canonical peer fields and directional actions", async () => {
    const onMessage = vi.fn();
    render(<ConnectionsDrawer onMessage={onMessage} />);
    fireEvent.click(screen.getByRole("button", { name: "연결" }));

    expect(screen.getByRole("dialog", { name: "내 연결" })).toBeInTheDocument();
    expect(await screen.findByText("Asuna")).toBeInTheDocument();
    expect(screen.getByText("Fencer · 레벨 76")).toBeInTheDocument();
    expect(screen.queryByText(/online|last seen|presence|unread|group/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message|gift/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "팔로워" }));
    expect(await screen.findByText("Lisbeth")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "메시지" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Asuna 작업" }));
    expect(screen.getAllByRole("button", { name: "메시지" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "메시지" }));
    expect(onMessage).toHaveBeenCalledWith(7);
    expect(screen.queryByRole("button", { name: /^mute|unmute|block|unblock$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lisbeth 작업" }));
    fireEvent.click(screen.getAllByRole("button", { name: "맞팔로우" })[0]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "팔로우 취소" }).length).toBeGreaterThan(0));

    const source = readFileSync("features/social/ConnectionsDrawer.tsx", "utf8");
    expect(source).not.toMatch(/data-theme|민준|서연|현우|밴드 선배|가족 그룹|Backend Study/);
    const css = readFileSync("app/globals.css", "utf8");
    const socialCss = css.slice(css.indexOf("/* v7 Social utilities"), css.indexOf(".lag-semantic-controls"));
    expect(socialCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
  });

  it("active-tab read failure exposes a direction-specific Retry", async () => {
    const followings = vi.spyOn(api, "getFollowingsApi").mockRejectedValueOnce(new Error("followings failed")).mockResolvedValueOnce(connectionsMock.listFollowings(0, 20));
    const followers = vi.spyOn(api, "getFollowersApi").mockResolvedValue(connectionsMock.listFollowers(0, 20));
    render(<ConnectionsDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "연결" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("followings failed");
    fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
    await waitFor(() => expect(screen.queryByText("followings failed")).not.toBeInTheDocument());
    expect(followings).toHaveBeenCalledTimes(2);
    expect(followers).toHaveBeenCalledTimes(1);
  });

  it("reveals relationship actions on a left swipe", async () => {
    render(<ConnectionsDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    const row = (await screen.findByText("Asuna")).closest("article")!;
    fireEvent.touchStart(row, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 120 }] });
    expect(screen.getByRole("button", { name: "뮤트" })).toBeInTheDocument();
  });

  it("drags by the shared header handle and re-clamps after viewport resize", () => {
    render(<ConnectionsDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    const dialog = screen.getByRole("dialog", { name: "내 연결" });
    dialog.getBoundingClientRect = () => ({ left: 0, right: 420, top: 0, bottom: 500, width: 420, height: 500, x: 0, y: 0, toJSON: () => ({}) });
    const handle = dialog.querySelector("header")!;

    fireEvent.pointerDown(handle, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: -2000, clientY: 1200 });
    expect(dialog).toHaveStyle({ left: "16px", top: "284px" });

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 900 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 650 });
    fireEvent.resize(window);
    expect(dialog).toHaveStyle({ left: "16px", top: "134px" });
  });

  it("initializes the first desktop portal position after the dialog ref mounts", async () => {
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, right: 420, top: 0, bottom: 500, width: 420, height: 500, x: 0, y: 0, toJSON: () => ({}) });
    render(<ConnectionsDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "연결" }));

    await waitFor(() => expect(screen.getByRole("dialog", { name: "내 연결" })).toHaveStyle({ left: "756px", top: "24px" }));
    rect.mockRestore();
  });

  it("keeps the mobile header above OrbNav within a dynamic viewport bound", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 520 });
    render(<ConnectionsDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    const dialog = screen.getByRole("dialog", { name: "내 연결" });

    await waitFor(() => expect(dialog.style.bottom).toContain("safe-area-inset-bottom"));
    expect(dialog.style.maxHeight).toContain("100dvh");
    expect(dialog.style.maxHeight).toContain("safe-area-inset-top");
    expect(dialog.querySelector("header")).toBeInTheDocument();
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain("max-height: calc(100dvh - 112px - env(safe-area-inset-bottom) - max(16px, env(safe-area-inset-top)))");
  });
});
