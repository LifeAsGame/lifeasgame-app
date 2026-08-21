import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import type { RoleDetail } from "@/shared/api/types";
import LeftContext from "./LeftContext";

const roles: RoleDetail[] = [
  { id: 3, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
];

describe("LeftContext에서 Role을 사용할 때", () => {
  it("legacy Astral frame 대신 shared semantic material을 사용한다", () => {
    const frame = readFileSync("widgets/left-context/LeftContext.tsx", "utf8");
    const children = ["PlayerPanel.tsx", "RoleContextPanel.tsx", "SocialPanel.tsx"]
      .map((file) => readFileSync(`widgets/left-context/ui/${file}`, "utf8"))
      .join("\n");

    expect(frame).toContain("lag-left-context");
    expect(`${frame}\n${children}`).toContain("var(--lag-control-bg)");
    expect(`${frame}\n${children}`).not.toMatch(/PANEL_STYLE|GRID_OVERLAY_STYLE|SAO\.color|rgba\(/);
  });

  describe("Player context의 실제 Role badge를 선택하면", () => {
    it("선택한 Role ID를 primary Role navigation callback에 전달한다", () => {
      const selectRole = vi.fn();
      render(<LeftContext mode="player" roles={roles} selectedRoleId={null} socialContext={null} onRoleSelect={selectRole} />);

      fireEvent.click(screen.getByRole("button", { name: "Backend Engineer" }));

      expect(selectRole).toHaveBeenCalledWith(3);
    });
  });
});
