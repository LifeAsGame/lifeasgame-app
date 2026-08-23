import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { directChatMock } from "./chat/mock";
import { connectionsMock } from "./mock";
import SocialUtilityHub from "./SocialUtilityHub";

vi.mock("@/features/auth/AuthContext", () => ({ useAuth: () => ({ playerId: 6 }) }));

describe("global Social utility ownership", () => {
  beforeEach(() => {
    connectionsMock.reset();
    directChatMock.reset();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  });

  it("Connections와 Direct Chat을 상호 배타적으로 열고 Escape로 닫는다", async () => {
    render(<SocialUtilityHub />);

    fireEvent.click(screen.getByRole("button", { name: "Connections" }));
    expect(screen.getByRole("dialog", { name: "Current Player Connections" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Direct Chat" }));
    expect(screen.queryByRole("dialog", { name: "Current Player Connections" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Direct Friend Chat" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Connections" }));
    expect(screen.queryByRole("dialog", { name: "Direct Friend Chat" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Current Player Connections" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Current Player Connections" })).not.toBeInTheDocument();
  });

  it("eligible Follower Message가 Connections를 닫고 canonical friend channel을 선택한다", async () => {
    render(<SocialUtilityHub />);
    fireEvent.click(screen.getByRole("button", { name: "Connections" }));
    fireEvent.click(screen.getByRole("tab", { name: "Followers" }));
    fireEvent.click(await screen.findByRole("button", { name: "Message" }));

    expect(screen.queryByRole("dialog", { name: "Current Player Connections" })).not.toBeInTheDocument();
    const chat = screen.getByRole("dialog", { name: "Direct Friend Chat" });
    await waitFor(() => expect(within(chat).getByRole("button", { name: /Asuna/ })).toHaveAttribute("aria-pressed", "true"));
    expect(within(chat).getByText("Canonical message 55")).toBeInTheDocument();
  });
});
