import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import type { RoleDetail } from "@/shared/api/types";
import { MOCK_CHARACTER_SHEET } from "@/features/player/mock";
import LeftContext from "./LeftContext";

const roles: RoleDetail[] = [
  { id: 3, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
];

describe("LeftContext에서 Role을 사용할 때", () => {
  it("legacy Astral frame 대신 shared semantic material을 사용한다", () => {
    const frame = readFileSync("widgets/left-context/LeftContext.tsx", "utf8");
    const children = ["PlayerPanel.tsx", "RoleContextPanel.tsx"]
      .map((file) => readFileSync(`widgets/left-context/ui/${file}`, "utf8"))
      .join("\n");

    expect(frame).toContain("lag-left-context");
    expect(`${frame}\n${children}`).toContain("var(--lag-control-bg)");
    expect(`${frame}\n${children}`).not.toMatch(/PANEL_STYLE|GRID_OVERLAY_STYLE|SAO\.color|rgba\(/);
    expect(children).not.toMatch(/exp\s*%\s*10000|\/\s*10000/);
  });

  describe("Player context의 실제 Role badge를 선택하면", () => {
    it("선택한 Role ID를 primary Role navigation callback에 전달한다", () => {
      const selectRole = vi.fn();
      render(<LeftContext mode="player" playerInfo={MOCK_CHARACTER_SHEET.player} roles={roles} selectedRoleId={null} onRoleSelect={selectRole} />);

      fireEvent.click(screen.getByRole("button", { name: "Backend Engineer" }));

      expect(selectRole).toHaveBeenCalledWith(3);
    });
  });

  it("Player와 Role이 같은 lane/frame을 유지하고 내부 content만 교체한다", () => {
    const { container, rerender } = render(
      <LeftContext mode="player" playerInfo={MOCK_CHARACTER_SHEET.player} roles={roles} selectedRoleId={null} />,
    );
    const lane = container.querySelector(".lag-left-anchor");
    const frame = container.querySelector(".lag-left-context");

    rerender(<LeftContext mode="role" roles={roles} selectedRoleId={null} />);

    expect(container.querySelector(".lag-left-anchor")).toBe(lane);
    expect(container.querySelector(".lag-left-context")).toBe(frame);
    expect(lane).toHaveAttribute("data-context-present", "true");
  });

  it("Role mode에서 canonical Role Nodes selector를 유지하며 selection을 전달한다", () => {
    const selectRole = vi.fn();
    const { container, rerender } = render(
      <LeftContext mode="role" roles={roles} selectedRoleId={null} onRoleSelect={selectRole} />,
    );
    const selector = container.querySelector("[data-role-selector]");

    fireEvent.click(screen.getByRole("button", { name: /Backend Engineer/ }));
    expect(selectRole).toHaveBeenCalledWith(3);

    rerender(<LeftContext mode="role" roles={roles} selectedRoleId={3} onRoleSelect={selectRole} />);
    expect(container.querySelector("[data-role-selector]")).toBe(selector);
    expect(screen.getByRole("button", { name: /Backend Engineer/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Create Role" })).toHaveAttribute("href", "/roles/create");
  });

  it("keeps a stable collapsible lane and shared bounded content scroll", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const { container, rerender } = render(
      <LeftContext mode="player" playerInfo={MOCK_CHARACTER_SHEET.player} roles={roles} selectedRoleId={null} />,
    );
    const lane = container.querySelector(".lag-left-anchor");

    rerender(<LeftContext mode="hidden" />);

    expect(container.querySelector(".lag-left-anchor")).toBe(lane);
    expect(lane).toHaveAttribute("data-context-present", "false");
    expect(css).not.toContain("display: contents");
    expect(css).toMatch(/\.lag-left-anchor\[data-context-present="false"\]\s*{[^}]*width:\s*0;[^}]*flex-basis:\s*0;/);
    expect(css).toMatch(/\.lag-left-context-content\s*{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/);
  });

  it("shows explicit Player loading/error states and retries without placeholder identity", () => {
    const retry = vi.fn();
    const view = render(<LeftContext mode="player" playerLoading onPlayerRetry={retry} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Player context");
    expect(screen.queryByText("Adventurer")).not.toBeInTheDocument();

    view.rerender(<LeftContext mode="player" playerError="Player unavailable" onPlayerRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Player unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps proven Player identity visible when secondary Equipment loading fails", () => {
    const retry = vi.fn();
    render(
      <LeftContext
        mode="player"
        playerInfo={MOCK_CHARACTER_SHEET.player}
        equipments={[]}
        playerError="Equipment unavailable"
        onPlayerRetry={retry}
      />,
    );

    expect(screen.getByRole("heading", { name: MOCK_CHARACTER_SHEET.player.name })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Equipment unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders only canonical equipment slot data instead of mock item metadata", () => {
    const equipment = [{ ...MOCK_CHARACTER_SHEET.equipments[0], itemInstanceId: 999 }];
    render(<LeftContext mode="player" playerInfo={MOCK_CHARACTER_SHEET.player} equipments={equipment} />);

    expect(screen.getByText("Equipped · Item #999")).toBeInTheDocument();
    expect(screen.queryByText("Elucidator")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Main Hand/ }));
    expect(screen.getByText("Item ID").parentElement).toHaveTextContent("999");
  });
});
