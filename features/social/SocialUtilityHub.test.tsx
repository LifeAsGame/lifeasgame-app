import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { directChatMock } from "./chat/mock";
import { connectionsMock } from "./mock";
import SocialUtilityHub from "./SocialUtilityHub";

vi.mock("@/features/auth/AuthContext", () => ({ useAuth: () => ({ playerId: 6 }) }));
vi.mock("@/shared/api/client", async (importOriginal) => ({ ...await importOriginal<typeof import("@/shared/api/client")>(), USE_MOCK: true }));

describe("global Social utility ownership", () => {
  beforeEach(() => {
    connectionsMock.reset();
    directChatMock.reset();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  });

  it("Connections와 Direct Chat을 상호 배타적으로 열고 Escape로 닫는다", async () => {
    render(<SocialUtilityHub />);

    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    expect(screen.getByRole("dialog", { name: "내 연결" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "직접 채팅" }));
    expect(screen.queryByRole("dialog", { name: "내 연결" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "친구와 직접 채팅" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    expect(screen.queryByRole("dialog", { name: "친구와 직접 채팅" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "내 연결" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "내 연결" })).not.toBeInTheDocument();
  });

  it("eligible Follower Message가 Connections를 닫고 canonical friend channel을 선택한다", async () => {
    render(<SocialUtilityHub />);
    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    fireEvent.click(screen.getByRole("tab", { name: "팔로워" }));
    fireEvent.click(await screen.findByRole("button", { name: "Asuna 작업" }));
    fireEvent.click(await screen.findByRole("button", { name: "메시지" }));

    expect(screen.queryByRole("dialog", { name: "내 연결" })).not.toBeInTheDocument();
    const chat = screen.getByRole("dialog", { name: "친구와 직접 채팅" });
    await waitFor(() => expect(within(chat).getByRole("button", { name: /Asuna/ })).toHaveAttribute("aria-pressed", "true"));
    expect(within(chat).getByText("Canonical message 55")).toBeInTheDocument();
  });
});
