import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HomeSummary } from "./model";
import { MOCK_HOME_SUMMARY } from "./mock";
import HomeShell from "./HomeShell";

const query = vi.hoisted(() => ({
  state: { data: null as HomeSummary | null, loading: false, error: null as string | null, reload: vi.fn() },
}));

vi.mock("./useHomeQuery", () => ({ useHomeQuery: () => query.state }));

const callbacks = {
  onOpenJournal: vi.fn(),
  onOpenAchievements: vi.fn(),
  onOpenCurrentQuests: vi.fn(),
  onOpenRoutes: vi.fn(),
  onOpenRole: vi.fn(),
};

describe("Home world summary를 표시할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.state = { data: structuredClone(MOCK_HOME_SUMMARY), loading: false, error: null, reload: vi.fn() };
  });

  describe("populated summary가 있으면", () => {
    it("QUICK, Achievement, GOAL_REACHED, multiple Routes, server Role share와 unassigned를 그대로 표시한다", () => {
      render(<HomeShell {...callbacks} />);

      expect(screen.getByText("Distributed Systems Notes").closest("button")).toHaveTextContent("COLLECTION · QUICK");
      expect(screen.getByText("First World Trace")).toBeInTheDocument();
      expect(screen.getByText(/GOAL_REACHED · 25 \/ 25/)).toBeInTheDocument();
      expect(screen.getByText("Begin with Records")).toBeInTheDocument();
      expect(screen.getByText("Build a Recovery Rhythm")).toBeInTheDocument();
      expect(screen.getByText("5 records · 62.5%")).toBeInTheDocument();
      expect(screen.getByText("Assigned 8 · Unassigned 2 · Total 10")).toBeInTheDocument();
    });

    it("nullable metadata를 가짜 값 없이 생략하고 nullable Role name에는 실제 ID를 쓴다", () => {
      render(<HomeShell {...callbacks} />);

      expect(screen.getByText("Role #32")).toBeInTheDocument();
      expect(screen.getByTestId("home-shell")).not.toHaveTextContent(/null|undefined|not recorded/i);
      expect(screen.getByText("Build a Recovery Rhythm").closest("button")).not.toHaveTextContent("Current Step");
    });

    it("cards를 canonical feature callback에만 연결한다", () => {
      render(<HomeShell {...callbacks} />);

      fireEvent.click(screen.getByRole("button", { name: /Distributed Systems Notes/ }));
      fireEvent.click(screen.getByRole("button", { name: /First World Trace/ }));
      fireEvent.click(screen.getByRole("button", { name: /Focus for 25 Minutes/ }));
      fireEvent.click(screen.getByRole("button", { name: /Begin with Records/ }));
      fireEvent.click(screen.getByRole("button", { name: /Developer/ }));

      expect(callbacks.onOpenJournal).toHaveBeenCalledOnce();
      expect(callbacks.onOpenAchievements).toHaveBeenCalledOnce();
      expect(callbacks.onOpenCurrentQuests).toHaveBeenCalledOnce();
      expect(callbacks.onOpenRoutes).toHaveBeenCalledOnce();
      expect(callbacks.onOpenRole).toHaveBeenCalledWith(31);
    });
  });

  describe("summary sections가 비어 있으면", () => {
    it("Home을 유지하고 section별 empty와 zero Role state를 표시한다", () => {
      query.state.data = {
        ...structuredClone(MOCK_HOME_SUMMARY),
        recentJournal: [],
        recentAchievements: [],
        journey: { currentQuests: [], selectedRoutes: [] },
        roleActivity30d: { ...MOCK_HOME_SUMMARY.roleActivity30d, totalRecords: 0, assignedRecords: 0, unassignedRecords: 0, roles: [] },
      };
      render(<HomeShell {...callbacks} />);

      expect(screen.getByText("No recent Journal entries.")).toBeInTheDocument();
      expect(screen.getByText("No recent Achievements.")).toBeInTheDocument();
      expect(screen.getByText("No current Quests.")).toBeInTheDocument();
      expect(screen.getByText("No selected Routes.")).toBeInTheDocument();
      expect(screen.getByText("No assigned Role activity.")).toBeInTheDocument();
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe("Home request state가 바뀌면", () => {
    it("initial loading과 Home-level error/retry를 표시한다", () => {
      query.state = { data: null, loading: true, error: null, reload: vi.fn() };
      const { rerender } = render(<HomeShell {...callbacks} />);
      expect(screen.getByText("Loading Home...")).toBeInTheDocument();

      query.state = { data: null, loading: false, error: "Home unavailable", reload: vi.fn() };
      rerender(<HomeShell {...callbacks} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Home unavailable");
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(query.state.reload).toHaveBeenCalledOnce();
    });
  });
});
