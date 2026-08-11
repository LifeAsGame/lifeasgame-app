import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerQuestDetail, QuestAcceptance, QuestRoute, QuestRouteStepDetail } from "@/shared/api/types";
import JourneyShell from "./JourneyShell";
import { journeyMock, resetJourneyMock } from "./mock";

const api = vi.hoisted(() => ({
  acceptQuestApi: vi.fn(),
  advanceQuestRouteApi: vi.fn(),
  cancelQuestApi: vi.fn(),
  getMyQuestRouteApi: vi.fn(),
  getMyQuestRouteStepApi: vi.fn(),
  getPlayerQuestApi: vi.fn(),
  getQuestRouteApi: vi.fn(),
  listMyQuestRoutesApi: vi.fn(),
  listPlayerQuestsApi: vi.fn(),
  listQuestCatalogApi: vi.fn(),
  listQuestRoutesApi: vi.fn(),
  manualCheckQuestApi: vi.fn(),
  selectQuestRouteApi: vi.fn(),
}));

vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, slotLabel, subtitle, onClick }: { label: string; slotLabel: string; subtitle?: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      <span>{label}</span><span>{slotLabel}</span>{subtitle ? <span>{subtitle}</span> : null}
    </button>
  ),
}));

resetJourneyMock();
const catalog = journeyMock.catalog();
const current = journeyMock.acceptances();
const unselectedRoute = journeyMock.routes()[0];
journeyMock.selectRoute();
const selectedRoute = journeyMock.myRoute();
const readyStepDetail = journeyMock.step(selectedRoute.playerProgress!.currentStepId);
resetJourneyMock();

const advancedRoute: QuestRoute = structuredClone(selectedRoute);
advancedRoute.playerProgress!.currentStepId = 12;
advancedRoute.steps = advancedRoute.steps.map((step) => ({
  ...step,
  criteriaSatisfied: step.id === 11,
  state: step.id === 11 ? "COMPLETED" : step.id === 12 ? "CURRENT" : "LOCKED",
}));
const advancedStepDetail: QuestRouteStepDetail = {
  routeId: advancedRoute.id,
  routeCode: advancedRoute.code,
  playerProgress: advancedRoute.playerProgress!,
  step: advancedRoute.steps.find((step) => step.id === 12)!,
};
const completedRoute: QuestRoute = structuredClone(selectedRoute);
completedRoute.playerProgress = { ...completedRoute.playerProgress!, currentStepId: 13, status: "COMPLETED", completedAt: "2026-08-11T01:00:00Z" };
completedRoute.steps = completedRoute.steps.map((step) => ({ ...step, criteriaSatisfied: true, state: "COMPLETED" }));

function detail(code: string, acceptance?: QuestAcceptance | null): PlayerQuestDetail {
  const blueprint = catalog.find((item) => item.code === code)!;
  return { ...blueprint, acceptance: acceptance === undefined ? current.find((item) => item.code === code) ?? null : acceptance };
}

function routeStep(route: QuestRoute): QuestRouteStepDetail {
  const step = route.steps.find((item) => item.id === route.playerProgress!.currentStepId)!;
  return { routeId: route.id, routeCode: route.code, playerProgress: route.playerProgress!, step };
}

describe("Journey에서 Quest와 QuestRoute를 볼 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.listPlayerQuestsApi.mockResolvedValue(current);
    api.listQuestCatalogApi.mockResolvedValue(catalog);
    api.listQuestRoutesApi.mockResolvedValue([unselectedRoute]);
    api.listMyQuestRoutesApi.mockResolvedValue([]);
    api.getPlayerQuestApi.mockImplementation(async (code: string) => detail(code));
    api.getQuestRouteApi.mockResolvedValue(unselectedRoute);
    api.getMyQuestRouteApi.mockResolvedValue(selectedRoute);
    api.getMyQuestRouteStepApi.mockResolvedValue(readyStepDetail);
    api.acceptQuestApi.mockResolvedValue(current[0]);
    api.manualCheckQuestApi.mockResolvedValue(current[0]);
    api.cancelQuestApi.mockResolvedValue({ playerId: 1, questId: 1, questCode: "Q_ONE" });
    api.selectQuestRouteApi.mockResolvedValue(selectedRoute);
    api.advanceQuestRouteApi.mockResolvedValue(advancedRoute);
  });

  describe("Current Quest의 상태와 next action을 확인하면", () => {
    it("IN_PROGRESS/GOAL_REACHED/COMPLETED/CANCELED를 구분하고 Party/Guild surface나 reward claim을 노출하지 않는다", async () => {
      render(<JourneyShell />);

      expect(await screen.findByText(/In Progress · 1\/3/)).toBeInTheDocument();
      expect(screen.getByText(/Goal Reached · 25\/25/)).toBeInTheDocument();
      expect(screen.getByText(/Completed · 1\/1/)).toBeInTheDocument();
      expect(screen.getByText(/Canceled · 0\/1/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Party/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Guild/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reward|claim/i })).not.toBeInTheDocument();
    });

    it("manual completion 후 Quest만 reload하고 Route를 자동 advance하지 않는다", async () => {
      const completed = current.map((quest) => quest.code === "Q_GROWTH_ONE_FOCUS"
        ? { ...quest, status: "COMPLETED" as const, completedAt: "2026-08-11T01:00:00Z" }
        : quest);
      api.listPlayerQuestsApi.mockResolvedValueOnce(current).mockResolvedValue(completed);
      api.getPlayerQuestApi.mockImplementation(async (code: string) => detail(code, completed.find((item) => item.code === code) ?? null));
      render(<JourneyShell />);

      fireEvent.click(await screen.findByRole("button", { name: /한 가지에 25분 집중하기/ }));
      expect(await screen.findByText("Goal reached. This is not the same as Completed.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Manual Check" }));

      await waitFor(() => expect(api.manualCheckQuestApi).toHaveBeenCalledWith("Q_GROWTH_ONE_FOCUS"));
      await waitFor(() => expect(screen.getByText("Status: Completed")).toBeInTheDocument());
      expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
      expect(api.advanceQuestRouteApi).not.toHaveBeenCalled();
    });

    it("valid cancel 후 authoritative list를 reload해 CANCELED history로 표시한다", async () => {
      const canceled = current.map((quest) => quest.code === "Q_RECORD_THREE_TRACES" ? { ...quest, status: "CANCELED" as const } : quest);
      api.listPlayerQuestsApi.mockResolvedValueOnce(current).mockResolvedValue(canceled);
      render(<JourneyShell />);

      fireEvent.click(await screen.findByRole("button", { name: /흔적 세 개 이어보기/ }));
      fireEvent.click(await screen.findByRole("button", { name: "Cancel Quest" }));

      await waitFor(() => expect(api.cancelQuestApi).toHaveBeenCalledWith("Q_RECORD_THREE_TRACES"));
      await waitFor(() => expect(screen.getByText("Status: Canceled")).toBeInTheDocument());
      expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
    });
  });

  describe("Catalog에서 acceptance와 blueprint를 합치면", () => {
    it("active acceptance의 중복 Accept를 막고 response-loss 뒤에도 reload 결과와 선택 context를 유지한다", async () => {
      const restBlueprint = catalog.find((item) => item.code === "Q_RECOVERY_REST_TEN")!;
      const acceptedRest: QuestAcceptance = {
        ...current[1],
        ...restBlueprint,
        id: 99,
        questId: 105,
        progressValue: 0,
        status: "IN_PROGRESS",
        acceptedAt: "2026-08-11T01:00:00Z",
        periodStart: "2026-08-11",
        periodEnd: "2026-08-11",
        periodKey: null,
        goalReachedAt: null,
        completedAt: null,
      };
      api.listPlayerQuestsApi.mockResolvedValueOnce(current).mockResolvedValue([...current, acceptedRest]);
      api.acceptQuestApi.mockRejectedValue(new Error("connection lost"));
      render(<JourneyShell />);

      fireEvent.click(screen.getByRole("button", { name: /Catalog/ }));
      fireEvent.click(await screen.findByRole("button", { name: /흔적 세 개 이어보기/ }));
      await screen.findByText("Acceptance: In Progress");
      expect(screen.queryByRole("button", { name: "Accept Quest" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /10분 쉬어가기/ }));
      fireEvent.click(await screen.findByRole("button", { name: "Accept Quest" }));

      await waitFor(() => expect(api.acceptQuestApi).toHaveBeenCalledTimes(1));
      expect(await screen.findByText(/Request outcome was not confirmed/)).toBeInTheDocument();
      expect(screen.getByText("Acceptance: In Progress")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Accept Quest" })).not.toBeInTheDocument();
    });
  });

  describe("Catalog에서 반복 Quest를 다시 수락할 때", () => {
    it("next period accept 성공 후 reload된 새 IN_PROGRESS acceptance만 반영한다", async () => {
      const completed = { ...current.find((quest) => quest.code === "Q_GROWTH_ONE_FOCUS")!, status: "COMPLETED" as const, completedAt: "2026-08-10T02:01:00Z" };
      const before = current.map((quest) => quest.code === completed.code ? completed : quest);
      const nextAcceptance: QuestAcceptance = {
        ...completed,
        id: 88,
        progressValue: 0,
        status: "IN_PROGRESS",
        acceptedAt: "2026-08-11T01:00:00Z",
        periodStart: "2026-08-11",
        periodEnd: "2026-08-11",
        goalReachedAt: null,
        completedAt: null,
      };
      api.listPlayerQuestsApi.mockResolvedValueOnce(before).mockResolvedValue([...before, nextAcceptance]);
      api.getPlayerQuestApi
        .mockResolvedValueOnce(detail(completed.code, completed))
        .mockResolvedValue(detail(completed.code, nextAcceptance));
      api.acceptQuestApi.mockResolvedValue(completed);
      render(<JourneyShell />);

      fireEvent.click(screen.getByRole("button", { name: /Catalog/ }));
      fireEvent.click(await screen.findByRole("button", { name: /한 가지에 25분 집중하기/ }));
      expect(await screen.findByText("Acceptance: Completed")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Accept Again" }));

      await waitFor(() => expect(api.acceptQuestApi).toHaveBeenCalledWith("Q_GROWTH_ONE_FOCUS"));
      expect(api.acceptQuestApi).toHaveBeenCalledTimes(1);
      expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
      expect(api.listQuestCatalogApi).toHaveBeenCalledTimes(2);
      expect(await screen.findByText("Acceptance: In Progress")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Accept Again" })).not.toBeInTheDocument();
      expect(api.advanceQuestRouteApi).not.toHaveBeenCalled();
    });

    it("same period backend rejection 시 한 번만 요청하고 reload한 COMPLETED context와 error를 보존한다", async () => {
      const completed = { ...current.find((quest) => quest.code === "Q_GROWTH_ONE_FOCUS")!, status: "COMPLETED" as const, completedAt: "2026-08-10T02:01:00Z" };
      const before = current.map((quest) => quest.code === completed.code ? completed : quest);
      api.listPlayerQuestsApi.mockResolvedValue(before);
      api.getPlayerQuestApi.mockResolvedValue(detail(completed.code, completed));
      api.acceptQuestApi.mockRejectedValue(new Error("Quest acceptance already exists"));
      render(<JourneyShell />);

      fireEvent.click(screen.getByRole("button", { name: /Catalog/ }));
      fireEvent.click(await screen.findByRole("button", { name: /한 가지에 25분 집중하기/ }));
      fireEvent.click(await screen.findByRole("button", { name: "Accept Again" }));

      await waitFor(() => expect(api.acceptQuestApi).toHaveBeenCalledTimes(1));
      expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
      expect(api.listQuestCatalogApi).toHaveBeenCalledTimes(2);
      expect(await screen.findByText(/Request outcome was not confirmed/)).toBeInTheDocument();
      expect(screen.getByText("Acceptance: Completed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Accept Again" })).toBeInTheDocument();
      expect(api.advanceQuestRouteApi).not.toHaveBeenCalled();
    });
  });

  describe("QuestRoute를 명시적으로 선택하고 진행하면", () => {
    it("unselected Route를 확인·select한 뒤 READY_TO_ADVANCE currentStepId로 정확히 한 Step만 advance한다", async () => {
      api.listQuestRoutesApi
        .mockResolvedValueOnce([unselectedRoute])
        .mockResolvedValueOnce([selectedRoute])
        .mockResolvedValueOnce([advancedRoute]);
      api.listMyQuestRoutesApi
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([selectedRoute])
        .mockResolvedValueOnce([advancedRoute]);
      api.getMyQuestRouteApi.mockResolvedValueOnce(selectedRoute).mockResolvedValueOnce(advancedRoute);
      api.getMyQuestRouteStepApi.mockResolvedValueOnce(readyStepDetail).mockResolvedValueOnce(advancedStepDetail);
      render(<JourneyShell />);

      fireEvent.click(screen.getByRole("button", { name: /Routes/ }));
      fireEvent.click(await screen.findByRole("button", { name: /기록으로 시작하기/ }));
      expect(await screen.findByText("Status: NOT_SELECTED")).toBeInTheDocument();
      expect(screen.getAllByText(/LOCKED · criteria/)).toHaveLength(3);
      fireEvent.click(screen.getByRole("button", { name: "Select Route" }));

      expect(window.confirm).toHaveBeenCalledWith("Select Route 기록으로 시작하기?");
      expect(await screen.findByText("Current Step Detail: 첫 흔적 남기기 · READY_TO_ADVANCE")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Advance Current Step" }));

      await waitFor(() => expect(api.advanceQuestRouteApi).toHaveBeenCalledWith(1, 11));
      expect(api.advanceQuestRouteApi).toHaveBeenCalledTimes(1);
      expect(await screen.findByText("Current Step ID: 12")).toBeInTheDocument();
      expect(screen.getByText("Current Step Detail: 흔적 연결하기 · CURRENT")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Advance Current Step" })).not.toBeInTheDocument();
    });

    it("stale advance 실패 시 retry 없이 My Route를 reload하고 현재 context를 보존한다", async () => {
      api.listQuestRoutesApi.mockResolvedValue([selectedRoute]);
      api.listMyQuestRoutesApi.mockResolvedValue([selectedRoute]);
      api.getMyQuestRouteApi.mockResolvedValue(selectedRoute);
      api.getMyQuestRouteStepApi.mockResolvedValue(readyStepDetail);
      api.advanceQuestRouteApi.mockRejectedValue(new Error("stale step"));
      render(<JourneyShell />);

      fireEvent.click(screen.getByRole("button", { name: /Routes/ }));
      fireEvent.click(await screen.findByRole("button", { name: /기록으로 시작하기/ }));
      fireEvent.click(await screen.findByRole("button", { name: "Advance Current Step" }));

      await waitFor(() => expect(api.advanceQuestRouteApi).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(api.getMyQuestRouteApi).toHaveBeenCalledTimes(2));
      expect(await screen.findByText(/Request outcome was not confirmed/)).toBeInTheDocument();
      expect(screen.getByText("Current Step ID: 11")).toBeInTheDocument();
    });

    it("completed Route에는 select/advance를 다시 노출하지 않는다", async () => {
      api.listQuestRoutesApi.mockResolvedValue([completedRoute]);
      api.listMyQuestRoutesApi.mockResolvedValue([completedRoute]);
      api.getMyQuestRouteApi.mockResolvedValue(completedRoute);
      api.getMyQuestRouteStepApi.mockResolvedValue(routeStep(completedRoute));
      render(<JourneyShell />);

      fireEvent.click(screen.getByRole("button", { name: /Routes/ }));
      fireEvent.click(await screen.findByRole("button", { name: /기록으로 시작하기/ }));

      expect(await screen.findByText("Route completed by an explicit final Step advance.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Select Route" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Advance Current Step" })).not.toBeInTheDocument();
    });
  });

  describe("독립 query가 empty 또는 실패하면", () => {
    it("Current/Catalog/Routes 각각의 empty state를 표시한다", async () => {
      api.listPlayerQuestsApi.mockResolvedValue([]);
      api.listQuestCatalogApi.mockResolvedValue([]);
      api.listQuestRoutesApi.mockResolvedValue([]);
      render(<JourneyShell />);

      expect(await screen.findByText("No Quest acceptances yet.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Catalog/ }));
      expect(await screen.findByText("No active Quest blueprints.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Routes/ }));
      expect(await screen.findByText("No active Quest Routes.")).toBeInTheDocument();
    });

    it("Quest failure와 무관하게 Route를 사용할 수 있다", async () => {
      api.listPlayerQuestsApi.mockRejectedValue(new Error("Quest unavailable"));
      render(<JourneyShell />);

      expect(await screen.findByText("Quest unavailable")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Routes/ }));
      expect(await screen.findByRole("button", { name: /기록으로 시작하기/ })).toBeInTheDocument();
    });

    it("Route failure는 Current를 막지 않고 자체 Retry로 복구한다", async () => {
      api.listQuestRoutesApi.mockRejectedValueOnce(new Error("Route unavailable")).mockResolvedValue([unselectedRoute]);
      render(<JourneyShell />);

      expect(await screen.findByText(/In Progress · 1\/3/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Routes/ }));
      expect(await screen.findByText("Route unavailable")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(await screen.findByRole("button", { name: /기록으로 시작하기/ })).toBeInTheDocument();
    });
  });
});
