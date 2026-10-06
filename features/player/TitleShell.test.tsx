import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerTitleInfo } from "@/shared/api/types";
import { MOCK_CHARACTER_SHEET } from "./mock";
import TitleShell from "./TitleShell";

const api = vi.hoisted(() => ({
  getCurrentPlayerApi: vi.fn(),
  getPlayerTitlesApi: vi.fn(),
  setRepresentativeTitleApi: vi.fn(),
  clearRepresentativeTitleApi: vi.fn(),
  getTitleDefinitionsApi: vi.fn(),
  getActivatedContentApi: vi.fn(),
}));

vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, subtitle, onClick }: { label: string; subtitle: string; onClick: () => void }) => <button type="button" data-testid="title-entry" onClick={onClick}>{label} · {subtitle}</button>,
}));

const title: PlayerTitleInfo = { titleId: 1, code: "BLACK_SWORDSMAN", name: "Black Swordsman", category: "Combat", descMd: "Canonical description.", acquiredAt: "2026-08-01T00:00:00Z" };
const secondTitle: PlayerTitleInfo = { ...title, titleId: 2, code: "BEATER", name: "Beater" };

describe("Title surface와 routing을 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCurrentPlayerApi.mockResolvedValue({ ...MOCK_CHARACTER_SHEET.player, representativeTitleId: 1 });
    api.getPlayerTitlesApi.mockResolvedValue([title]);
    api.getTitleDefinitionsApi.mockResolvedValue([]);
    api.getActivatedContentApi.mockResolvedValue({ entries: [], page: 0, size: 20, hasNext: false });
    api.clearRepresentativeTitleApi.mockResolvedValue(undefined);
  });

  it("선택 전에는 detail stage가 없고 선택 교체 시 frame identity를 유지한다", async () => {
    api.getPlayerTitlesApi.mockResolvedValue([title, secondTitle]);
    render(<TitleShell />);

    const entries = await screen.findAllByTestId("title-entry");
    expect(document.querySelector('[data-stage-key="player-title-detail"]')).not.toBeInTheDocument();

    fireEvent.click(entries[0]);
    const detailStage = document.querySelector('[data-stage-key="player-title-detail"]');
    expect(detailStage).toBeInTheDocument();

    fireEvent.click(entries[1]);
    expect(document.querySelector('[data-stage-key="player-title-detail"]')).toBe(detailStage);
    expect(within(detailStage as HTMLElement).getByText("Beater")).toBeInTheDocument();
  });

  it("acquired fields와 representative marker를 표시하고 fabricated state는 만들지 않는다", async () => {
    const { unmount } = render(<TitleShell />);
    const entry = await screen.findByTestId("title-entry");
    expect(entry).toHaveTextContent("2026. 8. 1.");
    fireEvent.click(entry);
    expect(screen.queryByText("BLACK_SWORDSMAN")).not.toBeInTheDocument();
    expect(screen.getByText("Canonical description.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "대표 칭호 해제" })).toBeEnabled();
    expect(screen.queryByText(/Status: Unlocked/)).not.toBeInTheDocument();
    unmount();

    api.getCurrentPlayerApi.mockResolvedValue({ ...MOCK_CHARACTER_SHEET.player, representativeTitleId: 99 });
    api.getPlayerTitlesApi.mockResolvedValue([]);
    render(<TitleShell />);
    expect(await screen.findByText(/보유한 칭호가 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/대표 칭호가 보유 목록에 없습니다/)).toBeInTheDocument();
  });

  it("미보유 활성 칭호는 탐색만 가능하고 대표 설정을 제공하지 않는다", async () => {
    api.getPlayerTitlesApi.mockResolvedValue([]);
    api.getCurrentPlayerApi.mockResolvedValue({ ...MOCK_CHARACTER_SHEET.player, representativeTitleId: null });
    api.getActivatedContentApi.mockResolvedValue({ entries: [{ kind: "TITLE", code: "TITLE_BACKEND_GUIDE", definitionId: 53, name: "백엔드 길잡이", definitionVersion: 1, condition: "완주", status: "UNACQUIRED", evidenceStatus: "NONE", acquiredAt: null, sourceOccurredAt: null }], page: 0, size: 20, hasNext: false });
    render(<TitleShell />);
    fireEvent.click(screen.getByRole("button", { name: "전체 활성 칭호 보기" }));
    fireEvent.click(await screen.findByText(/백엔드 길잡이 · 미보유/));
    expect(screen.getByText(/마지막 단계까지 진행해/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "대표 칭호로 설정" })).not.toBeInTheDocument();
    expect(api.setRepresentativeTitleApi).not.toHaveBeenCalled();
  });
});
