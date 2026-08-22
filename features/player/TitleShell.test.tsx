import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerTitleInfo } from "@/shared/api/types";
import { MOCK_CHARACTER_SHEET } from "./mock";
import TitleShell from "./TitleShell";

const api = vi.hoisted(() => ({
  getCurrentPlayerApi: vi.fn(),
  getPlayerTitlesApi: vi.fn(),
  setRepresentativeTitleApi: vi.fn(),
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
  });

  it("선택 전에는 detail stage가 없고 선택 교체 시 frame identity를 유지한다", async () => {
    api.getPlayerTitlesApi.mockResolvedValue([title, secondTitle]);
    render(<TitleShell />);

    const entries = await screen.findAllByTestId("title-entry");
    expect(screen.queryByText("Title Detail")).not.toBeInTheDocument();

    fireEvent.click(entries[0]);
    const detailStage = document.querySelector('[data-stage-key="player-title-detail"]');
    expect(detailStage).toBeInTheDocument();

    fireEvent.click(entries[1]);
    expect(document.querySelector('[data-stage-key="player-title-detail"]')).toBe(detailStage);
    expect(screen.getByText("Beater")).toBeInTheDocument();
  });

  it("acquired fields와 representative marker를 표시하고 fabricated state는 만들지 않는다", async () => {
    const { unmount } = render(<TitleShell />);
    const entry = await screen.findByTestId("title-entry");
    expect(entry).toHaveTextContent("Combat · 2026-08-01T00:00:00Z · Representative Title");
    fireEvent.click(entry);
    expect(screen.getByText("Code: BLACK_SWORDSMAN")).toBeInTheDocument();
    expect(screen.getByText("Canonical description.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Representative Title" })).toBeDisabled();
    expect(screen.queryByText(/Status: Unlocked/)).not.toBeInTheDocument();
    unmount();

    api.getCurrentPlayerApi.mockResolvedValue({ ...MOCK_CHARACTER_SHEET.player, representativeTitleId: 99 });
    api.getPlayerTitlesApi.mockResolvedValue([]);
    render(<TitleShell />);
    expect(await screen.findByText("No acquired Titles.")).toBeInTheDocument();
    expect(screen.getByText("Representative Title #99 is unavailable in acquired Titles.")).toBeInTheDocument();
  });
});
