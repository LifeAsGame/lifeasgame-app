import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PanelStackItem } from "@/entities/nav";
import type { RoleDetail } from "@/shared/api/types";
import RightPanels from "@/widgets/right-panels/RightPanels";
import LeftContext from "./LeftContext";

const roles: RoleDetail[] = [
  { id: 3, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
];

function FollowChatHarness() {
  const [panel, setPanel] = useState<Extract<PanelStackItem, { kind: "message" }> | null>(null);
  return (
    <div>
      <LeftContext
        mode="role"
        roles={roles}
        selectedRoleId={3}
        socialContext={null}
        onFriendAction={(action, followId) => {
          if (action !== "message") return;
          setPanel({ id: `message-${followId}`, kind: "message", title: "Message — Asuna", friendId: followId, friendName: "Asuna", context: { main: "social", route: "social-message" } });
        }}
      />
      {panel ? <RightPanels selectedMain="role" panelStack={[panel]} panelStackKey="follow-chat" onPanelItemSelect={() => {}} /> : null}
    </div>
  );
}

describe("LeftContext에서 Role과 기존 Follow를 사용할 때", () => {
  describe("Player context의 실제 Role badge를 선택하면", () => {
    it("선택한 Role ID를 primary Role navigation callback에 전달한다", () => {
      const selectRole = vi.fn();
      render(<LeftContext mode="player" roles={roles} selectedRoleId={null} socialContext={null} onRoleSelect={selectRole} />);

      fireEvent.click(screen.getByRole("button", { name: "Backend Engineer" }));

      expect(selectRole).toHaveBeenCalledWith(3);
    });
  });

  describe("Role context에서 Following에게 message를 보내면", () => {
    it("Follow를 Relation으로 바꾸지 않고 기존 direct Chat history를 연다", async () => {
      render(<FollowChatHarness />);

      fireEvent.click(screen.getAllByRole("button", { name: "Message" })[0]);

      expect(await screen.findByText("어제 보스 레이드 어땠어?")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Message — Asuna/i })).toBeInTheDocument();
    });
  });
});
