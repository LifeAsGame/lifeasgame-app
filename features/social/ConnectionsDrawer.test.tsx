import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "./api";
import ConnectionsDrawer from "./ConnectionsDrawer";
import { connectionsMock } from "./mock";

describe("Connections utility drawer surface", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    connectionsMock.reset();
  });

  it("opens outside OrbNav and renders only canonical peer fields and directional actions", async () => {
    const onMessage = vi.fn();
    render(<ConnectionsDrawer onMessage={onMessage} />);
    fireEvent.click(screen.getByRole("button", { name: "Connections" }));

    expect(screen.getByRole("dialog", { name: "Current Player Connections" })).toBeInTheDocument();
    expect(await screen.findByText("Asuna")).toBeInTheDocument();
    expect(screen.getByText("Fencer · Level 76")).toBeInTheDocument();
    expect(screen.queryByText(/online|last seen/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message|gift/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Followers" }));
    expect(await screen.findByText("Lisbeth")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Message" })).toHaveLength(1);
    expect(screen.getByText("Lisbeth").closest("article")).not.toHaveTextContent("Message");
    fireEvent.click(screen.getByRole("button", { name: "Message" }));
    expect(onMessage).toHaveBeenCalledWith(7);
    expect(screen.queryByRole("button", { name: /^mute|unmute|block|unblock$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Follow back" })[0]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Unfollow" }).length).toBeGreaterThan(1));
  });

  it("active-tab read failure exposes a direction-specific Retry", async () => {
    const followings = vi.spyOn(api, "getFollowingsApi").mockRejectedValueOnce(new Error("followings failed")).mockResolvedValueOnce(connectionsMock.listFollowings(0, 20));
    const followers = vi.spyOn(api, "getFollowersApi").mockResolvedValue(connectionsMock.listFollowers(0, 20));
    render(<ConnectionsDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Connections" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("followings failed");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByText("followings failed")).not.toBeInTheDocument());
    expect(followings).toHaveBeenCalledTimes(2);
    expect(followers).toHaveBeenCalledTimes(1);
  });
});
