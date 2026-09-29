import { answerDialog } from "@/shared/ui/dialogTest";
import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  getQuestRewardSettlementApi: vi.fn(),
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

function routeVariant(id: number, title: string, stepTitle: string): QuestRoute {
  const variant = structuredClone(selectedRoute);
  variant.id = id;
  variant.code = `ROUTE_${id}`;
  variant.title = title;
  variant.description = `${title} description`;
  variant.playerProgress = { ...variant.playerProgress!, id };
  variant.steps = variant.steps.map((step) => step.id === variant.playerProgress!.currentStepId ? { ...step, title: stepTitle } : step);
  return variant;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function renderCurrentJourney() {
  return render(<JourneyShell initialSurface="current" />);
}

describe("Journey에서 Quest와 QuestRoute를 볼 때", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.resetAllMocks();
    api.listPlayerQuestsApi.mockResolvedValue(current);
    api.listQuestCatalogApi.mockResolvedValue(catalog);
    api.listQuestRoutesApi.mockResolvedValue([unselectedRoute]);
    api.listMyQuestRoutesApi.mockResolvedValue([]);
    api.getPlayerQuestApi.mockImplementation(async (code: string) => detail(code));
    api.getQuestRouteApi.mockResolvedValue(unselectedRoute);
    api.getMyQuestRouteApi.mockResolvedValue(selectedRoute);
    api.getMyQuestRouteStepApi.mockResolvedValue(readyStepDetail);
    api.getQuestRewardSettlementApi.mockRejectedValue(new Error("Settlement unavailable"));
    api.acceptQuestApi.mockResolvedValue(current[0]);
    api.manualCheckQuestApi.mockResolvedValue(current[0]);
    api.cancelQuestApi.mockResolvedValue({ playerId: 1, questId: 1, questCode: "Q_ONE" });
    api.selectQuestRouteApi.mockResolvedValue(selectedRoute);
    api.advanceQuestRouteApi.mockResolvedValue(advancedRoute);
  });

  describe("canonical Home callback이 initial surface를 지정하면", () => {
    it("Routes에서 바로 시작한다", async () => {
      render(<JourneyShell initialSurface="routes" />);

      expect(await screen.findByText(unselectedRoute.title)).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "경로 목록" })).toBeInTheDocument();
      expect(screen.queryByText("선택할 수 있는 경로가 없습니다.")).not.toBeInTheDocument();
    });

    it("opens the existing selected Route as the progression surface", async () => {
      api.listQuestRoutesApi.mockResolvedValue([]);
      api.listMyQuestRoutesApi.mockResolvedValue([selectedRoute]);
      render(<JourneyShell initialSurface="routes" />);

      expect(await screen.findByText("경로 진행")).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="journey-detail"]')).toBeInTheDocument();
      expect(api.getMyQuestRouteApi).not.toHaveBeenCalled();
    });

    it("previews the first progressed Route in displayed order", async () => {
      const earlierCatalog = routeVariant(31, "Earlier Catalog Progress", "Earlier Step");
      const laterMineOnly = routeVariant(32, "Later Mine-only Progress", "Later Step");
      api.listQuestRoutesApi.mockResolvedValue([{ ...earlierCatalog, playerProgress: null }]);
      api.listMyQuestRoutesApi.mockResolvedValue([laterMineOnly, earlierCatalog]);
      render(<JourneyShell initialSurface="routes" />);

      expect(await screen.findByText("Earlier Catalog Progress description")).toBeInTheDocument();
      expect(screen.queryByText("Later Mine-only Progress description")).not.toBeInTheDocument();
    });
  });

  describe("Journey main navigation으로 직접 진입하면", () => {
    it("root stage만 열고 subsection과 detail은 선택 전까지 만들지 않는다", async () => {
      render(<JourneyShell />);

      expect(screen.getByRole("button", { name: /진행 퀘스트/ })).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="journey-root"]')).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="journey-list"]')).not.toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="journey-detail"]')).not.toBeInTheDocument();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /진행 퀘스트/ }));
      expect(await screen.findByText("진행 중")).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="journey-list"]')).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="journey-detail"]')).not.toBeInTheDocument();
    });

    it("detail/list Back과 surface reset을 staged disclosure로 유지한다", async () => {
      render(<JourneyShell initialSurface={null} />);

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /진행 퀘스트/ }));
      fireEvent.click(await screen.findByRole("button", { name: /흔적 세 개 이어보기/ }));
      await screen.findByText(/퀘스트 진행률/);
      expect(document.querySelector('[data-stage-key="journey-detail"]')).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "진행 퀘스트으로 돌아가기" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="journey-detail"]')).not.toBeInTheDocument());
      expect(document.querySelector('[data-stage-key="journey-list"]')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole("button", { name: /흔적 세 개 이어보기/ })).toHaveFocus());

      fireEvent.click(screen.getByRole("button", { name: /흔적 세 개 이어보기/ }));
      await screen.findByText(/퀘스트 진행률/);
      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /퀘스트 목록/ }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="journey-detail"]')).not.toBeInTheDocument());
      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /진행 퀘스트/ }));
      expect(document.querySelector('[data-stage-key="journey-detail"]')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="journey-list"]')).not.toBeInTheDocument());
      expect(document.querySelector('[data-stage-key="journey-root"]')).toBeInTheDocument();
    });

    it("같은 list의 selection 변경 시 detail stage DOM을 유지한다", async () => {
      renderCurrentJourney();

      fireEvent.click(await screen.findByRole("button", { name: /흔적 세 개 이어보기/ }));
      await screen.findByText(/퀘스트 진행률/);
      const detailStage = document.querySelector('[data-stage-key="journey-detail"]');
      fireEvent.click(screen.getByRole("button", { name: /한 가지에 25분 집중하기/ }));
      await screen.findByText("목표에 도달했습니다. 완료 확정과는 다릅니다.");

      expect(document.querySelector('[data-stage-key="journey-detail"]')).toBe(detailStage);
    });
  });

  it("uses semantic Journey styling without screenshot-only domain data", () => {
    const source = readFileSync("features/quests/JourneyShell.tsx", "utf8");
    expect(source).toContain("lag-route-thread");
    expect(source).not.toMatch(/Backend Developer Route|Spring Core|\bXP\b|fake milestone/i);

    const css = readFileSync("app/globals.css", "utf8");
    const journeyCss = css.slice(css.indexOf("/* v7 Journey"), css.indexOf(".lag-state-error"));
    expect(journeyCss).toContain("var(--lag-muted-surface)");
    expect(journeyCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(css).toMatch(/@media \(min-width: 1500px\)[\s\S]*?\[data-stage-key="journey-list"\] \.lag-panel-frame\s*\{[\s\S]*?width: 760px/);
  });

  describe("Current Quest의 상태와 next action을 확인하면", () => {
    it("IN_PROGRESS/GOAL_REACHED/COMPLETED/CANCELED를 구분하고 Party/Guild surface나 reward claim을 노출하지 않는다", async () => {
      renderCurrentJourney();

      expect(await screen.findByText("진행 중")).toBeInTheDocument();
      expect(screen.getByText("목표 도달")).toBeInTheDocument();
      expect(screen.getByText("완료")).toBeInTheDocument();
      expect(screen.getByText("취소됨")).toBeInTheDocument();
      expect(screen.getByRole("progressbar", { name: "흔적 세 개 이어보기 진행률" })).toHaveAttribute("aria-valuetext", "1 / 3 (33%)");
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
      renderCurrentJourney();

      fireEvent.click(await screen.findByRole("button", { name: /한 가지에 25분 집중하기/ }));
      expect(await screen.findByText("목표에 도달했습니다. 완료 확정과는 다릅니다.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "직접 확인" }));

      await waitFor(() => expect(api.manualCheckQuestApi).toHaveBeenCalledWith("Q_GROWTH_ONE_FOCUS"));
      await waitFor(() => expect(screen.getByText("상태: 완료")).toBeInTheDocument());
      expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
      expect(api.advanceQuestRouteApi).not.toHaveBeenCalled();
    });

    it("valid cancel 후 authoritative list를 reload해 CANCELED history로 표시한다", async () => {
      const canceled = current.map((quest) => quest.code === "Q_RECORD_THREE_TRACES" ? { ...quest, status: "CANCELED" as const } : quest);
      api.listPlayerQuestsApi.mockResolvedValueOnce(current).mockResolvedValue(canceled);
      renderCurrentJourney();

      fireEvent.click(await screen.findByRole("button", { name: /흔적 세 개 이어보기/ }));
      fireEvent.click(await screen.findByRole("button", { name: "퀘스트 취소" }));
    await answerDialog();

      await waitFor(() => expect(api.cancelQuestApi).toHaveBeenCalledWith("Q_RECORD_THREE_TRACES"));
      await waitFor(() => expect(screen.getByText("상태: 취소됨")).toBeInTheDocument());
      expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
    });
  });

  describe("Quest detail 선택을 빠르게 바꾸면", () => {
    it("stale success가 최신 Quest detail을 덮어쓰지 않는다", async () => {
      const stale = deferred<PlayerQuestDetail>();
      const latest = deferred<PlayerQuestDetail>();
      api.getPlayerQuestApi.mockImplementation((code: string) => code === "Q_RECORD_THREE_TRACES" ? stale.promise : latest.promise);
      renderCurrentJourney();

      fireEvent.click(await screen.findByRole("button", { name: /흔적 세 개 이어보기/ }));
      fireEvent.click(screen.getByRole("button", { name: /한 가지에 25분 집중하기/ }));
      await act(async () => {
        latest.resolve({ ...detail("Q_GROWTH_ONE_FOCUS"), descriptionMd: "Latest Quest detail" });
        await latest.promise;
      });
      expect(screen.getByText("Latest Quest detail")).toBeInTheDocument();

      await act(async () => {
        stale.resolve({ ...detail("Q_RECORD_THREE_TRACES"), descriptionMd: "Stale Quest detail" });
        await stale.promise;
      });
      expect(screen.getByText("Latest Quest detail")).toBeInTheDocument();
      expect(screen.queryByText("Stale Quest detail")).not.toBeInTheDocument();
    });

    it("stale error가 최신 Quest의 loading과 detail을 바꾸지 않는다", async () => {
      const stale = deferred<PlayerQuestDetail>();
      const latest = deferred<PlayerQuestDetail>();
      api.getPlayerQuestApi.mockImplementation((code: string) => code === "Q_RECORD_THREE_TRACES" ? stale.promise : latest.promise);
      renderCurrentJourney();

      fireEvent.click(await screen.findByRole("button", { name: /흔적 세 개 이어보기/ }));
      fireEvent.click(screen.getByRole("button", { name: /한 가지에 25분 집중하기/ }));
      await act(async () => {
        stale.reject(new Error("stale Quest failure"));
        await stale.promise.catch(() => undefined);
      });
      expect(screen.getAllByText("퀘스트 상세를 불러오는 중…").length).toBeGreaterThan(0);
      expect(screen.queryByText("stale Quest failure")).not.toBeInTheDocument();

      await act(async () => {
        latest.resolve({ ...detail("Q_GROWTH_ONE_FOCUS"), descriptionMd: "Latest Quest after stale error" });
        await latest.promise;
      });
      expect(screen.getByText("Latest Quest after stale error")).toBeInTheDocument();
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
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /퀘스트 목록/ }));
      fireEvent.click(await screen.findByRole("button", { name: /흔적 세 개 이어보기/ }));
      await screen.findByText("수락 상태: 진행 중");
      expect(screen.queryByRole("button", { name: "퀘스트 수락" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /10분 쉬어가기/ }));
      fireEvent.click(await screen.findByRole("button", { name: "퀘스트 수락" }));
    await answerDialog();

      await waitFor(() => expect(api.acceptQuestApi).toHaveBeenCalledTimes(1));
      expect(await screen.findByText(/요청 결과가 확정되지 않았습니다/)).toBeInTheDocument();
      expect(screen.getAllByText("수락 상태: 진행 중").length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: "퀘스트 수락" })).not.toBeInTheDocument();
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
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /퀘스트 목록/ }));
      fireEvent.click(await screen.findByRole("button", { name: /한 가지에 25분 집중하기/ }));
      expect((await screen.findAllByText("수락 상태: 완료")).length).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole("button", { name: "다시 수락" }));
    await answerDialog();

      await waitFor(() => expect(api.acceptQuestApi).toHaveBeenCalledWith("Q_GROWTH_ONE_FOCUS"));
      expect(api.acceptQuestApi).toHaveBeenCalledTimes(1);
      expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
      expect(api.listQuestCatalogApi).toHaveBeenCalledTimes(2);
      expect((await screen.findAllByText("수락 상태: 진행 중")).length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: "다시 수락" })).not.toBeInTheDocument();
      expect(api.advanceQuestRouteApi).not.toHaveBeenCalled();
    });

    it("same period backend rejection 시 한 번만 요청하고 reload한 COMPLETED context와 error를 보존한다", async () => {
      const completed = { ...current.find((quest) => quest.code === "Q_GROWTH_ONE_FOCUS")!, status: "COMPLETED" as const, completedAt: "2026-08-10T02:01:00Z" };
      const before = current.map((quest) => quest.code === completed.code ? completed : quest);
      api.listPlayerQuestsApi.mockResolvedValue(before);
      api.getPlayerQuestApi.mockResolvedValue(detail(completed.code, completed));
      api.acceptQuestApi.mockRejectedValue(new Error("Quest acceptance already exists"));
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /퀘스트 목록/ }));
      fireEvent.click(await screen.findByRole("button", { name: /한 가지에 25분 집중하기/ }));
      fireEvent.click(await screen.findByRole("button", { name: "다시 수락" }));
    await answerDialog();

      await waitFor(() => expect(api.acceptQuestApi).toHaveBeenCalledTimes(1));
      expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
      expect(api.listQuestCatalogApi).toHaveBeenCalledTimes(2);
      expect(await screen.findByText(/요청 결과가 확정되지 않았습니다/)).toBeInTheDocument();
      expect(screen.getAllByText("수락 상태: 완료").length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "다시 수락" })).toBeInTheDocument();
      expect(api.advanceQuestRouteApi).not.toHaveBeenCalled();
    });
  });

  describe("QuestRoute를 명시적으로 선택하고 진행하면", () => {
    it("multiple progress와 실제 stepOrder/currentStepId/criteria/questLinks를 표시한다", async () => {
      const first = routeVariant(41, "First Direction", "Current First Step");
      const second = routeVariant(42, "Second Direction", "Current Second Step");
      first.steps = first.steps.slice().reverse();
      first.playerProgress = { ...first.playerProgress!, currentStepId: 12 };
      first.steps = first.steps.map((step) => ({
        ...step,
        criteriaSatisfied: step.id === 11,
        state: step.id === 11 ? "COMPLETED" : step.id === 12 ? "CURRENT" : "LOCKED",
      }));
      api.listQuestRoutesApi.mockResolvedValue([]);
      api.listMyQuestRoutesApi.mockResolvedValue([first, second]);
      api.getMyQuestRouteApi.mockResolvedValue(first);
      api.getMyQuestRouteStepApi.mockResolvedValue(routeStep(first));
      render(<JourneyShell initialSurface="routes" />);

      expect(await screen.findByRole("button", { name: /First Direction/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Second Direction/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /First Direction/ }));

      const thread = await screen.findByRole("region", { name: "경로의 단계 순서" });
      const steps = Array.from(thread.querySelectorAll(":scope > .lag-route-thread-track > ol > li"));
      expect(steps.map((step) => step.querySelector("strong")?.textContent)).toEqual([
        "1. Current First Step",
        "2. 흔적 연결하기",
        "3. 돌아보기",
      ]);
      expect(steps[1]).toHaveAttribute("data-current", "true");
      expect(within(thread).getByText("조건: 충족")).toBeInTheDocument();
      expect(within(thread).getByText(/필요 조건: 첫 흔적 남기기/)).toBeInTheDocument();
    });

    it("catalog에 없는 My Route도 보존하고 My Route detail과 step을 표시한다", async () => {
      api.listQuestRoutesApi.mockResolvedValue([]);
      api.listMyQuestRoutesApi.mockResolvedValue([selectedRoute]);
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      fireEvent.click(await screen.findByRole("button", { name: /기록으로 시작하기/ }));

      expect(await screen.findByText("현재 단계 상세: 첫 흔적 남기기 · 전진 가능")).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="journey-detail"] .lag-panel-body')).toHaveClass("lag-panel-body");
      expect(api.getMyQuestRouteApi).toHaveBeenCalledWith(selectedRoute.id);
      expect(api.getQuestRouteApi).not.toHaveBeenCalled();
    });

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
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      fireEvent.click(await screen.findByRole("button", { name: /기록으로 시작하기/ }));
      expect(await screen.findByText("상태: 선택 안 함")).toBeInTheDocument();
      expect(screen.getAllByText("잠김")).toHaveLength(3);
      expect(screen.getAllByText("조건: 미충족")).toHaveLength(2);
      expect(screen.getByText("조건: 충족")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "경로 선택" }));
    await answerDialog();
      expect(await screen.findByText("현재 단계 상세: 첫 흔적 남기기 · 전진 가능")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "다음 단계로" }));
    await answerDialog();

      await waitFor(() => expect(api.advanceQuestRouteApi).toHaveBeenCalledWith(1, 11));
      expect(api.advanceQuestRouteApi).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/ID 12/)).toBeInTheDocument();
      expect(screen.getByText("현재 단계 상세: 흔적 연결하기 · 현재 단계")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "다음 단계로" })).not.toBeInTheDocument();
    });

    it("stale Route response가 최신 Route detail을 덮어쓰거나 step을 요청하지 않는다", async () => {
      const staleRoute = routeVariant(21, "Stale Route", "Stale Route Step");
      const latestRoute = routeVariant(22, "Latest Route", "Latest Route Step");
      const stale = deferred<QuestRoute>();
      const latest = deferred<QuestRoute>();
      api.listQuestRoutesApi.mockResolvedValue([]);
      api.listMyQuestRoutesApi.mockResolvedValue([staleRoute, latestRoute]);
      api.getMyQuestRouteApi.mockImplementation((routeId: number) => routeId === staleRoute.id ? stale.promise : latest.promise);
      api.getMyQuestRouteStepApi.mockImplementation(async (routeId: number) => routeStep(routeId === staleRoute.id ? staleRoute : latestRoute));
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Stale Route/ }));
      fireEvent.click(screen.getByRole("button", { name: /Latest Route/ }));
      await act(async () => {
        latest.resolve(latestRoute);
        await latest.promise;
      });
      expect(await screen.findByText("현재 단계 상세: Latest Route Step · 전진 가능")).toBeInTheDocument();

      await act(async () => {
        stale.resolve(staleRoute);
        await stale.promise;
      });
      expect(screen.getByText("현재 단계 상세: Latest Route Step · 전진 가능")).toBeInTheDocument();
      expect(screen.queryByText(/현재 단계 상세: Stale Route Step/)).not.toBeInTheDocument();
      expect(api.getMyQuestRouteStepApi).toHaveBeenCalledTimes(1);
      expect(api.getMyQuestRouteStepApi).toHaveBeenCalledWith(latestRoute.id, latestRoute.playerProgress!.currentStepId);
    });

    it("stale current-step response가 최신 Route의 loading과 detail을 바꾸지 않는다", async () => {
      const staleRoute = routeVariant(31, "Route With Stale Step", "Stale Step");
      const latestRoute = routeVariant(32, "Route With Latest Step", "Latest Step");
      const staleStep = deferred<QuestRouteStepDetail>();
      const latest = deferred<QuestRoute>();
      api.listQuestRoutesApi.mockResolvedValue([]);
      api.listMyQuestRoutesApi.mockResolvedValue([staleRoute, latestRoute]);
      api.getMyQuestRouteApi.mockImplementation((routeId: number) => routeId === staleRoute.id ? Promise.resolve(staleRoute) : latest.promise);
      api.getMyQuestRouteStepApi.mockImplementation((routeId: number) => routeId === staleRoute.id ? staleStep.promise : Promise.resolve(routeStep(latestRoute)));
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Route With Stale Step/ }));
      await waitFor(() => expect(api.getMyQuestRouteStepApi).toHaveBeenCalledWith(staleRoute.id, staleRoute.playerProgress!.currentStepId));
      fireEvent.click(screen.getByRole("button", { name: /Route With Latest Step/ }));
      await act(async () => {
        staleStep.resolve(routeStep(staleRoute));
        await staleStep.promise;
      });
      expect(screen.getByText("경로 상세를 불러오는 중…")).toBeInTheDocument();

      await act(async () => {
        latest.resolve(latestRoute);
        await latest.promise;
      });
      expect(await screen.findByText("현재 단계 상세: Latest Step · 전진 가능")).toBeInTheDocument();
      expect(screen.queryByText(/현재 단계 상세: Stale Step/)).not.toBeInTheDocument();
    });

    it("stale advance 실패 시 retry 없이 My Route를 reload하고 현재 context를 보존한다", async () => {
      api.listQuestRoutesApi.mockResolvedValue([selectedRoute]);
      api.listMyQuestRoutesApi.mockResolvedValue([selectedRoute]);
      api.getMyQuestRouteApi.mockResolvedValue(selectedRoute);
      api.getMyQuestRouteStepApi.mockResolvedValue(readyStepDetail);
      api.advanceQuestRouteApi.mockRejectedValue(new Error("stale step"));
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      fireEvent.click(await screen.findByRole("button", { name: /기록으로 시작하기/ }));
      fireEvent.click(await screen.findByRole("button", { name: "다음 단계로" }));
    await answerDialog();

      await waitFor(() => expect(api.advanceQuestRouteApi).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(api.getMyQuestRouteApi).toHaveBeenCalledTimes(2));
      expect(await screen.findByText(/요청 결과가 확정되지 않았습니다/)).toBeInTheDocument();
      expect(screen.getByText(/ID 11/)).toBeInTheDocument();
    });

    it("completed Route에는 select/advance를 다시 노출하지 않는다", async () => {
      api.listQuestRoutesApi.mockResolvedValue([completedRoute]);
      api.listMyQuestRoutesApi.mockResolvedValue([completedRoute]);
      api.getMyQuestRouteApi.mockResolvedValue(completedRoute);
      api.getMyQuestRouteStepApi.mockResolvedValue(routeStep(completedRoute));
      renderCurrentJourney();

      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      fireEvent.click(await screen.findByRole("button", { name: /기록으로 시작하기/ }));

      expect(await screen.findByText(/마지막 단계 전진을 통해 경로를 완료했습니다/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "경로 선택" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "다음 단계로" })).not.toBeInTheDocument();
    });
  });

  describe("독립 query가 empty 또는 실패하면", () => {
    it("Current/퀘스트 목록/Routes 각각의 empty state를 표시한다", async () => {
      api.listPlayerQuestsApi.mockResolvedValue([]);
      api.listQuestCatalogApi.mockResolvedValue([]);
      api.listQuestRoutesApi.mockResolvedValue([]);
      renderCurrentJourney();

      expect(await screen.findByText("수락한 퀘스트가 없습니다.")).toBeInTheDocument();
      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /퀘스트 목록/ }));
      expect(await screen.findByText("선택할 수 있는 퀘스트가 없습니다.")).toBeInTheDocument();
      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      expect(await screen.findByText("선택할 수 있는 경로가 없습니다.")).toBeInTheDocument();
    });

    it("Quest failure와 무관하게 Route를 사용할 수 있다", async () => {
      api.listPlayerQuestsApi.mockRejectedValue(new Error("Quest unavailable"));
      renderCurrentJourney();

      expect(await screen.findByText(/Quest unavailable/)).toBeInTheDocument();
      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      expect(await screen.findByRole("button", { name: /기록으로 시작하기/ })).toBeInTheDocument();
    });

    it("Route failure는 Current를 막지 않고 자체 Retry로 복구한다", async () => {
      api.listQuestRoutesApi.mockRejectedValueOnce(new Error("Route unavailable")).mockResolvedValue([unselectedRoute]);
      renderCurrentJourney();

      expect(await screen.findByText("진행 중")).toBeInTheDocument();
      if (screen.queryByRole("button", { name: "여정으로" })) fireEvent.click(screen.getByRole("button", { name: "여정으로" }));
      fireEvent.click(screen.getByRole("button", { name: /경로/ }));
      expect(await screen.findByText(/Route unavailable/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
      expect(await screen.findByRole("button", { name: /기록으로 시작하기/ })).toBeInTheDocument();
    });
  });
  it("restores a direct acceptance address with reads only", async () => {
    const quest = current.find((item) => item.code === "Q_RECORD_THREE_TRACES")!;
    render(<JourneyShell navigation={{ surface: "current", detail: String(quest.id) }} onNavigate={vi.fn()} />);
    expect(await screen.findByText("퀘스트 진행률")).toBeInTheDocument();
    expect(api.getPlayerQuestApi).toHaveBeenCalledWith(quest.code);
    expect(api.acceptQuestApi).not.toHaveBeenCalled();
    expect(api.manualCheckQuestApi).not.toHaveBeenCalled();
    expect(api.advanceQuestRouteApi).not.toHaveBeenCalled();
  });

  it.each(["current", "routes"] as const)("restores direct %s detail only after the failed list recovers, without commands or navigation", async (surface) => {
    const quest = current[0];
    const navigation = { surface, detail: String(surface === "routes" ? selectedRoute.id : quest.id) };
    const onNavigate = vi.fn();
    const list = surface === "routes" ? api.listMyQuestRoutesApi : api.listPlayerQuestsApi;
    list.mockRejectedValueOnce(new Error("Initial list failure"))
      .mockRejectedValueOnce(new Error("Retry list failure"))
      .mockResolvedValue(surface === "routes" ? [selectedRoute] : current);
    const view = render(<JourneyShell navigation={navigation} onNavigate={onNavigate} />);

    for (const error of ["Initial list failure", "Retry list failure"]) {
      await screen.findByText(`조회 실패: ${error}`);
      expect(screen.queryByText(/현재 목록에서 요청한 상세를 찾을 수 없습니다/)).not.toBeInTheDocument();
      expect(api.getQuestRouteApi).not.toHaveBeenCalled();
      expect(api.getMyQuestRouteApi).not.toHaveBeenCalled();
      expect(api.getPlayerQuestApi).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "경로 선택" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
    }

    if (surface === "routes") {
      await screen.findByText("현재 단계 상세: 첫 흔적 남기기 · 전진 가능");
      expect(screen.getByText("상태: 진행 중")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "경로 선택" })).not.toBeInTheDocument();
      expect(api.getMyQuestRouteApi.mock.calls).toEqual([[selectedRoute.id]]);
      expect(api.getMyQuestRouteStepApi.mock.calls).toEqual([[selectedRoute.id, selectedRoute.playerProgress!.currentStepId]]);
      expect(api.getQuestRouteApi).not.toHaveBeenCalled();
    } else {
      await screen.findByText("퀘스트 진행률");
      expect(api.getPlayerQuestApi.mock.calls).toEqual([[quest.code]]);
    }
    const stage = document.querySelector('[data-stage-key="journey-detail"]');
    const calls = Object.fromEntries(Object.entries(api).map(([name, mock]) => [name, mock.mock.calls.length]));
    view.rerender(<JourneyShell navigation={{ ...navigation }} onNavigate={onNavigate} />);
    expect(document.querySelector('[data-stage-key="journey-detail"]')).toBe(stage);
    expect(Object.fromEntries(Object.entries(api).map(([name, mock]) => [name, mock.mock.calls.length]))).toEqual(calls);
    expect(list).toHaveBeenCalledTimes(3);
    expect(onNavigate).not.toHaveBeenCalled();
    for (const command of [api.acceptQuestApi, api.cancelQuestApi, api.manualCheckQuestApi, api.selectQuestRouteApi, api.advanceQuestRouteApi]) {
      expect(command).not.toHaveBeenCalled();
    }
  });

  it("does not restore an abandoned Route URL when its delayed Retry finishes", async () => {
    const retry = deferred<QuestRoute[]>();
    api.listMyQuestRoutesApi.mockRejectedValueOnce(new Error("Route list failure")).mockReturnValueOnce(retry.promise);
    const onNavigate = vi.fn();
    const view = render(<JourneyShell navigation={{ surface: "routes", detail: String(selectedRoute.id) }} onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByRole("button", { name: "다시 조회" }));
    view.rerender(<JourneyShell navigation={{ surface: "current", detail: String(current[0].id) }} onNavigate={onNavigate} />);
    await screen.findByText("퀘스트 진행률");
    await act(async () => { retry.resolve([selectedRoute]); await retry.promise; });
    expect(screen.getByText("퀘스트 진행률")).toBeInTheDocument();
    expect(api.getMyQuestRouteApi).not.toHaveBeenCalled();
    expect(api.getQuestRouteApi).not.toHaveBeenCalled();
    expect(api.getPlayerQuestApi).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("restores the previous URL after leaving it for a still-pending list", async () => {
    const routes = deferred<QuestRoute[]>();
    api.listMyQuestRoutesApi.mockReturnValueOnce(routes.promise);
    const onNavigate = vi.fn();
    const currentNavigation = { surface: "current" as const, detail: String(current[0].id) };
    const view = render(<JourneyShell navigation={currentNavigation} onNavigate={onNavigate} />);
    await screen.findByText("퀘스트 진행률");
    view.rerender(<JourneyShell navigation={{ surface: "routes", detail: String(selectedRoute.id) }} onNavigate={onNavigate} />);
    await screen.findByText("경로를 불러오는 중…");
    view.rerender(<JourneyShell navigation={currentNavigation} onNavigate={onNavigate} />);
    await screen.findByText("퀘스트 진행률");
    await act(async () => { routes.resolve([selectedRoute]); await routes.promise; });
    expect(screen.getByText("퀘스트 진행률")).toBeInTheDocument();
    expect(api.getPlayerQuestApi.mock.calls).toEqual([[current[0].code], [current[0].code]]);
    expect(api.getMyQuestRouteApi).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("refreshes reads after a late command without replacing the newer Quest selection", async () => {
    const pending = deferred<QuestAcceptance>();
    api.manualCheckQuestApi.mockReturnValue(pending.promise);
    renderCurrentJourney();
    fireEvent.click(await screen.findByRole("button", { name: /한 가지에 25분 집중하기/ }));
    fireEvent.click(await screen.findByRole("button", { name: "직접 확인" }));
    fireEvent.click(screen.getByRole("button", { name: /흔적 세 개 이어보기/ }));
    await waitFor(() => expect(api.getPlayerQuestApi).toHaveBeenLastCalledWith("Q_RECORD_THREE_TRACES"));
    const reads = api.getPlayerQuestApi.mock.calls.length;
    await act(async () => { pending.resolve(current[0]); await pending.promise; });
    expect(api.manualCheckQuestApi).toHaveBeenCalledTimes(1);
    expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(2);
    expect(api.getPlayerQuestApi).toHaveBeenCalledTimes(reads);
    expect(api.getPlayerQuestApi).toHaveBeenLastCalledWith("Q_RECORD_THREE_TRACES");
  });

});
