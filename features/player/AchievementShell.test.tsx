import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerAchievementInfo } from "@/shared/api/types";
import AchievementShell from "./AchievementShell";

const api = vi.hoisted(() => ({ getPlayerAchievementApi: vi.fn(), getPlayerAchievementsApi: vi.fn() }));

vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, subtitle, onClick }: { label: string; subtitle: string; onClick: () => void }) => <button type="button" data-testid="achievement-entry" onClick={onClick}>{label} · {subtitle}</button>,
}));

const listItem: PlayerAchievementInfo = { achievementId: 31, code: "LIST_CODE", name: "List name", category: "Growth", descMd: "List description", acquiredAt: "2026-08-13T00:00:00Z" };
const detail: PlayerAchievementInfo = { achievementId: 31, code: "SERVER_CODE", name: "Server detail name", category: "Milestone", descMd: "**Server-owned** description", acquiredAt: "2026-08-14T00:00:00Z" };
const secondListItem: PlayerAchievementInfo = { ...listItem, achievementId: 32, code: "SECOND", name: "Second achievement" };

describe("Current Player Achievement surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getPlayerAchievementsApi.mockResolvedValue([listItem]);
    api.getPlayerAchievementApi.mockResolvedValue(detail);
  });

  it("선택 전에는 detail stage가 없고 선택 replacement identity를 바꾼다", async () => {
    api.getPlayerAchievementsApi.mockResolvedValue([listItem, secondListItem]);
    api.getPlayerAchievementApi.mockImplementation(async (id: number) => ({ ...detail, achievementId: id }));
    render(<AchievementShell />);

    const entries = await screen.findAllByTestId("achievement-entry");
    expect(screen.queryByText("Achievement Detail")).not.toBeInTheDocument();

    fireEvent.click(entries[0]);
    expect(document.querySelector('[data-stage-key="player-achievement-detail-31"]')).toBeInTheDocument();

    fireEvent.click(entries[1]);
    expect(document.querySelector('[data-stage-key="player-achievement-detail-32"]')).toBeInTheDocument();
  });

  it("acquired list/detail fields와 empty state만 렌더하고 fabricated rows는 만들지 않는다", async () => {
    const view = render(<AchievementShell />);
    const entry = await screen.findByTestId("achievement-entry");
    expect(entry).toHaveTextContent("List name · Growth · 2026-08-13T00:00:00Z");
    fireEvent.click(entry);

    expect(await screen.findByText("Server detail name")).toBeInTheDocument();
    expect(screen.getByText("Code: SERVER_CODE")).toBeInTheDocument();
    expect(screen.getByText("Category: Milestone")).toBeInTheDocument();
    expect(screen.getByText("Acquired: 2026-08-14T00:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("**Server-owned** description")).toBeInTheDocument();
    expect(api.getPlayerAchievementApi).toHaveBeenCalledWith(31);
    expect(screen.queryByText(/Status: Unlocked|source quest|reward|rarity|progress/i)).not.toBeInTheDocument();
    view.unmount();

    api.getPlayerAchievementsApi.mockResolvedValueOnce([]);
    render(<AchievementShell />);
    expect(await screen.findByText("No acquired Achievements.")).toBeInTheDocument();
  });
});
