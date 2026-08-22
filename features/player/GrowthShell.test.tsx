import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerGrowthOverview } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import GrowthShell from "./GrowthShell";

const api = vi.hoisted(() => ({ getPlayerGrowthApi: vi.fn() }));
vi.mock("./api", () => api);

const overview = {
  current: {
    level: 8,
    exp: 842,
    str: 21,
    agi: 22,
    dex: 23,
    intel: 24,
    vit: 25,
    luc: 26,
    extraStats: { Focus: 7, Balance: 9 },
    representativeTitleId: 41,
  },
  recentExpChanges: [
    { changeId: 71, requestedExp: 100, appliedExp: 80, leftoverExp: 20, beforeLevel: 7, afterLevel: 8, beforeTotalExp: 762, afterTotalExp: 842, occurredAt: "2026-08-20T09:00:00Z", sourceType: "QUEST", sourceId: 31 },
    { changeId: 70, requestedExp: 30, appliedExp: 30, leftoverExp: 0, beforeLevel: 7, afterLevel: 7, beforeTotalExp: 732, afterTotalExp: 762, occurredAt: "2026-08-19T09:00:00Z", sourceType: null, sourceId: 999 },
  ],
} satisfies PlayerGrowthOverview;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("v7 Growth surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getPlayerGrowthApi.mockResolvedValue(overview);
  });

  it("canonical Growth 값만 semantic dual-theme composition으로 표시한다", async () => {
    render(<GrowthShell />);

    expect(await screen.findByText("842")).toBeInTheDocument();
    for (const value of ["21", "22", "23", "24", "25", "26", "7", "9"]) expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.getByText("Focus")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("Representative title ID · 41")).toBeInTheDocument();
    expect(screen.queryByText(/1,230|1,600|Knowledge|Health|Relation|Creativity|Achievement|progress|%/i)).not.toBeInTheDocument();

    const source = readFileSync("features/player/GrowthShell.tsx", "utf8");
    expect(source).not.toMatch(/AchievementShell|getPlayerAchievements|GoldRow|InfoCard|data-theme/);
    const css = readFileSync("app/globals.css", "utf8");
    const growthCss = css.slice(css.indexOf("/* v7 Growth"), css.indexOf(".lag-semantic-controls"));
    expect(growthCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toContain('[data-stage-key="player-growth-change-detail"]');
  });

  it("empty extra stats와 real history를 표시하되 첫 change를 자동 선택하지 않는다", async () => {
    api.getPlayerGrowthApi.mockResolvedValue({ ...overview, current: { ...overview.current, extraStats: {} } });
    render(<GrowthShell />);

    expect(await screen.findByText("No extra stats.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+80 EXP/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("QUEST")).toBeInTheDocument();
    expect(screen.getByText("Source unavailable")).toBeInTheDocument();
    expect(document.querySelector('[data-stage-key="player-growth-change-detail"]')).not.toBeInTheDocument();
  });

  it("명시 선택으로 canonical detail을 열고 change 교체 시 outer frame을 유지한다", async () => {
    render(<GrowthShell />);
    fireEvent.click(await screen.findByRole("button", { name: /\+80 EXP/ }));

    const detail = document.querySelector('[data-stage-key="player-growth-change-detail"]');
    expect(detail).toBeInTheDocument();
    for (const value of ["71", "100", "80", "20", "762", "842", "2026-08-20T09:00:00Z", "QUEST", "31"]) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    }

    fireEvent.click(screen.getByRole("button", { name: /\+30 EXP/ }));
    expect(document.querySelector('[data-stage-key="player-growth-change-detail"]')).toBe(detail);
    expect(screen.getAllByText("70").length).toBeGreaterThan(0);
    expect(screen.getByText("Not available without source type")).toBeInTheDocument();
    expect(screen.queryByText("999")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to EXP History" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="player-growth-change-detail"]')).not.toBeInTheDocument());
  });

  it("Profile → History → Detail focus와 fresh mount reset을 유지한다", async () => {
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    const view = render(<GrowthShell />);
    await screen.findByText("842");

    focus.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /View EXP History/ }));
    expect(focus.mock.calls.at(-1)?.[0]).toMatchObject({ detail: { key: "player-growth-history", align: "center" } });
    fireEvent.click(screen.getByRole("button", { name: /\+80 EXP/ }));
    expect(document.querySelector('[data-stage-key="player-growth-change-detail"]')).toBeInTheDocument();

    view.unmount();
    render(<GrowthShell />);
    await screen.findByText("842");
    expect(document.querySelector('[data-stage-key="player-growth-change-detail"]')).not.toBeInTheDocument();
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });

  it("loading/error/retry query semantics를 보존한다", async () => {
    const pending = deferred<PlayerGrowthOverview>();
    api.getPlayerGrowthApi.mockReturnValueOnce(pending.promise);
    const view = render(<GrowthShell />);
    expect(screen.getByText("Loading Growth...")).toHaveAttribute("role", "status");

    await act(async () => { pending.resolve(overview); await pending.promise; });
    await screen.findByText("842");
    view.unmount();

    api.getPlayerGrowthApi.mockRejectedValueOnce(new Error("Growth unavailable")).mockResolvedValueOnce({ ...overview, recentExpChanges: [] });
    render(<GrowthShell />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Growth unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No recent EXP changes.")).toBeInTheDocument();
  });
});
