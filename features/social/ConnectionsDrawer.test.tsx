import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import ConnectionsDrawer from "./ConnectionsDrawer";
import { connectionsMock } from "./mock";

describe("Connections utility drawer surface", () => {
  beforeEach(() => connectionsMock.reset());

  it("opens outside OrbNav and renders only canonical peer fields and directional actions", async () => {
    render(<ConnectionsDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Connections" }));

    expect(screen.getByRole("dialog", { name: "Current Player Connections" })).toBeInTheDocument();
    expect(await screen.findByText("Asuna")).toBeInTheDocument();
    expect(screen.getByText("Fencer · Level 76")).toBeInTheDocument();
    expect(screen.queryByText(/online|last seen/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /chat|gift/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Followers" }));
    expect(await screen.findByText("Lisbeth")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^mute|unmute|block|unblock$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Follow back" })[0]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Unfollow" }).length).toBeGreaterThan(1));
  });
});
