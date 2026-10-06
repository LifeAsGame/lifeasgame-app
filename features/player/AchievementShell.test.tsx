import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerAchievementInfo } from "@/shared/api/types";
import AchievementShell from "./AchievementShell";

const api = vi.hoisted(() => ({ getPlayerAchievementApi: vi.fn(), getPlayerAchievementsApi: vi.fn(), getAchievementDefinitionsApi: vi.fn(), getActivatedContentApi: vi.fn() }));

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
    api.getAchievementDefinitionsApi.mockResolvedValue([]);
    api.getActivatedContentApi.mockResolvedValue({ entries: [], page: 0, size: 20, hasNext: false });
  });

  it("선택 전에는 detail stage가 없고 선택 replacement 때 frame identity를 유지한다", async () => {
    api.getPlayerAchievementsApi.mockResolvedValue([listItem, secondListItem]);
    api.getPlayerAchievementApi.mockImplementation(async (id: number) => ({ ...detail, achievementId: id }));
    render(<AchievementShell />);

    const entries = await screen.findAllByTestId("achievement-entry");
    expect(screen.queryByText("업적 상세")).not.toBeInTheDocument();

    fireEvent.click(entries[0]);
    const detailStage = document.querySelector('[data-stage-key="player-achievement-detail"]');
    expect(detailStage).toBeInTheDocument();

    fireEvent.click(entries[1]);
    expect(document.querySelector('[data-stage-key="player-achievement-detail"]')).toBe(detailStage);
  });

  it("acquired list/detail fields와 empty state만 렌더하고 fabricated rows는 만들지 않는다", async () => {
    const view = render(<AchievementShell />);
    const entry = await screen.findByTestId("achievement-entry");
    expect(entry).toHaveTextContent("List name · 2026. 8. 13.");
    fireEvent.click(entry);

    expect(await screen.findByText("Server detail name")).toBeInTheDocument();
    expect(screen.queryByText("SERVER_CODE")).not.toBeInTheDocument();
    expect(screen.getByText(/2026. 8. 14./)).toBeInTheDocument();
    expect(screen.getByText("**Server-owned** description")).toBeInTheDocument();
    expect(api.getPlayerAchievementApi).toHaveBeenCalledWith(31);
    expect(screen.queryByText(/Status: Unlocked|source quest|reward|rarity|progress/i)).not.toBeInTheDocument();
    view.unmount();

    api.getPlayerAchievementsApi.mockResolvedValueOnce([]);
    render(<AchievementShell />);
    expect(await screen.findByText(/첫 기록을 남기면 업적을 얻을 수 있어요/)).toBeInTheDocument();
  });

  it("opens the Home-selected achievement detail", async () => {
    render(<AchievementShell initialAchievementId={31} />);
    expect(await screen.findByText("Server detail name")).toBeInTheDocument();
    expect(api.getPlayerAchievementApi).toHaveBeenCalledTimes(1);
    expect(api.getPlayerAchievementApi).toHaveBeenCalledWith(31);
  });

  it("서버 활성 상태를 보여주고 보유 목록의 기존 업적은 유지한다", async () => {
    api.getActivatedContentApi.mockResolvedValue({ entries: [{ kind: "ACHIEVEMENT", code: "ACH_FIRST_ITEM_CLAIM", definitionId: 42, name: "첫 아이템 수령", definitionVersion: 1, condition: "우편 아이템 수령", status: "UNACQUIRED", evidenceStatus: "NONE", acquiredAt: null, sourceOccurredAt: null }], page: 0, size: 20, hasNext: false });
    render(<AchievementShell />);
    expect(await screen.findByText(/List name/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "전체 활성 업적 보기" }));
    const entry = await screen.findByText(/첫 아이템 수령 · 미획득/);
    fireEvent.click(entry);
    expect(screen.getByText(/우편 도착만으로는 획득하지 않습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수신함 보기" })).toBeInTheDocument();
    expect(screen.queryByText("ACH_FIRST_ITEM_CLAIM")).not.toBeInTheDocument();
  });

  it("활성 업적은 보유 API와 시각이 다를 때 활성화의 획득 시각을 보여준다", async () => {
    api.getPlayerAchievementsApi.mockResolvedValue([{ ...listItem, code: "ACH_FIRST_LIFELOG", acquiredAt: "2026-10-06T12:52:08Z" }]);
    api.getPlayerAchievementApi.mockResolvedValue({ ...detail, code: "ACH_FIRST_LIFELOG", acquiredAt: "2026-10-06T12:52:08Z" });
    api.getActivatedContentApi.mockResolvedValue({ entries: [{ kind: "ACHIEVEMENT", code: "ACH_FIRST_LIFELOG", definitionId: 31, name: "첫 기록", definitionVersion: 1, condition: "첫 기록", status: "ACQUIRED", evidenceStatus: "CONFIRMED", acquiredAt: "2026-10-06T03:52:08Z", sourceOccurredAt: "2026-10-06T03:52:08Z" }], page: 0, size: 7, hasNext: false });
    render(<AchievementShell />);
    const entry = await screen.findByTestId("achievement-entry");
    await waitFor(() => expect(entry).toHaveTextContent("오후 12:52"));
    fireEvent.click(entry);
    await waitFor(() => expect(screen.getByText("2026. 10. 6. 오후 12:52")).toBeInTheDocument());
  });

  it("활성 조회 실패를 미획득으로 표시하지 않는다", async () => {
    api.getActivatedContentApi.mockRejectedValue(new Error("activation unavailable"));
    render(<AchievementShell />);
    fireEvent.click(screen.getByRole("button", { name: "전체 활성 업적 보기" }));
    expect(await screen.findByText("activation unavailable")).toBeInTheDocument();
    expect(screen.queryByText("미획득")).not.toBeInTheDocument();
  });
});
