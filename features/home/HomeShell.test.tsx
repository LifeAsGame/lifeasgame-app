import { readFileSync } from "node:fs";
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

      expect(screen.getByText("Distributed Systems Notes").closest("button")).toHaveTextContent("수집 기록 · 간편 기록");
      expect(screen.getByRole("button", { name: /달리기/ })).toHaveTextContent("2026-08-12");
      expect(screen.getByRole("button", { name: /Designing Data-Intensive Applications/ })).toHaveTextContent("250/616");
      expect(screen.getByText("First World Trace")).toBeInTheDocument();
      expect(screen.getByText(/목표 도달 · 25 \/ 25/)).toBeInTheDocument();
      expect(screen.getByText("Begin with Records")).toBeInTheDocument();
      expect(screen.getByText("Build a Recovery Rhythm")).toBeInTheDocument();
      expect(screen.getByText("5건 · 62.5%")).toBeInTheDocument();
      expect(screen.getByText("역할 지정").closest("div")).toHaveTextContent("8");
      expect(screen.getByText("역할 미지정").closest("div")).toHaveTextContent("2");
      expect(screen.getByText("전체 기록").closest("div")).toHaveTextContent("10");
      expect(screen.getByRole("button", { name: /Begin with Records/ })).not.toHaveTextContent("%");
      expect(screen.getByTestId("home-shell")).not.toHaveTextContent(/streak|life score|productivity score|\bXP\b/i);
    });

    it("nullable metadata와 raw relationship ID를 primary copy로 노출하지 않는다", () => {
      render(<HomeShell {...callbacks} />);

      expect(screen.getByText("이름 없는 역할")).toBeInTheDocument();
      expect(screen.getByTestId("home-shell")).not.toHaveTextContent(/null|undefined|not recorded/i);
      expect(screen.getByTestId("home-shell")).not.toHaveTextContent(/Role #|Event #|Current Step #/);
    });

    it("cards를 canonical feature callback에만 연결한다", () => {
      render(<HomeShell {...callbacks} />);

      fireEvent.click(screen.getByRole("button", { name: /Distributed Systems Notes/ }));
      fireEvent.click(screen.getByRole("button", { name: /First World Trace/ }));
      fireEvent.click(screen.getByRole("button", { name: /Focus for 25 Minutes/ }));
      fireEvent.click(screen.getByRole("button", { name: /Begin with Records/ }));
      fireEvent.click(screen.getByRole("button", { name: /Developer/ }));

      expect(callbacks.onOpenJournal).toHaveBeenCalledOnce();
      expect(callbacks.onOpenJournal).toHaveBeenCalledWith(301);
      expect(callbacks.onOpenAchievements).toHaveBeenCalledOnce();
      expect(callbacks.onOpenAchievements).toHaveBeenCalledWith(601);
      expect(callbacks.onOpenCurrentQuests).toHaveBeenCalledOnce();
      expect(callbacks.onOpenCurrentQuests).toHaveBeenCalledWith(401);
      expect(callbacks.onOpenRoutes).toHaveBeenCalledOnce();
      expect(callbacks.onOpenRoutes).toHaveBeenCalledWith(501);
      expect(callbacks.onOpenRole).toHaveBeenCalledWith(31);
    });
  });

  describe("Journal preview의 optional field가 null이면", () => {
    it("Exercise date를 생략하고 실제 metric zero는 표시한다", () => {
      query.state.data = {
        ...structuredClone(MOCK_HOME_SUMMARY),
        recentJournal: [{
          lifeLogId: 701,
          sourceType: "EXERCISE",
          subtype: null,
          entryMode: "QUICK",
          primaryRoleId: null,
          roleEventId: null,
          recordedAt: "2026-08-13T00:00:00Z",
          preview: {
            category: "STRETCHING",
            durationMinutes: 0,
            distanceKm: 0,
            calories: 0,
            exercisedOn: null,
            memo: null,
          },
        }],
      };
      render(<HomeShell {...callbacks} />);

      const exercise = screen.getByRole("button", { name: /STRETCHING/ });
      expect(exercise).toHaveTextContent("0분 · 0 km · 0 kcal");
      expect(exercise).not.toHaveTextContent(/null|undefined|not recorded/i);
    });

    it("Media optional metadata가 모두 null이면 title/category만 표시한다", () => {
      query.state.data = {
        ...structuredClone(MOCK_HOME_SUMMARY),
        recentJournal: [{
          lifeLogId: 702,
          sourceType: "MEDIA",
          subtype: null,
          entryMode: null,
          primaryRoleId: null,
          roleEventId: null,
          recordedAt: "2026-08-13T00:00:00Z",
          preview: {
            category: "BOOK",
            title: "Sparse Media",
            currentEpisode: null,
            totalEpisode: null,
            status: null,
            rating: null,
          },
        }],
      };
      render(<HomeShell {...callbacks} />);

      const media = screen.getByRole("button", { name: /Sparse Media/ });
      expect(media).toHaveTextContent("Sparse Media");
      expect(media).toHaveTextContent("도서");
      expect(media).not.toHaveTextContent(/null|undefined|not recorded|\//i);
    });

    it("Media episode의 current 또는 total만 있으면 알려진 값만 표시하고 zero도 보존한다", () => {
      query.state.data = {
        ...structuredClone(MOCK_HOME_SUMMARY),
        recentJournal: [
          {
            lifeLogId: 703,
            sourceType: "MEDIA",
            subtype: null,
            entryMode: null,
            primaryRoleId: null,
            roleEventId: null,
            recordedAt: "2026-08-13T00:00:00Z",
            preview: { category: "ANIME", title: "Current Only", currentEpisode: 0, totalEpisode: null, status: null, rating: null },
          },
          {
            lifeLogId: 704,
            sourceType: "MEDIA",
            subtype: null,
            entryMode: null,
            primaryRoleId: null,
            roleEventId: null,
            recordedAt: "2026-08-13T00:00:00Z",
            preview: { category: "SERIES", title: "Total Only", currentEpisode: null, totalEpisode: 12, status: null, rating: null },
          },
        ],
      };
      render(<HomeShell {...callbacks} />);

      const current = screen.getByRole("button", { name: /Current Only/ });
      const total = screen.getByRole("button", { name: /Total Only/ });
      expect(current).toHaveTextContent("회차 0");
      expect(total).toHaveTextContent("전체 12");
      expect(current).not.toHaveTextContent("/");
      expect(total).not.toHaveTextContent("/");
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

      expect(screen.getByText("최근 기록이 없습니다.")).toBeInTheDocument();
      expect(screen.getByText("최근 획득한 업적이 없습니다.")).toBeInTheDocument();
      expect(screen.getByText("진행 중인 퀘스트가 없습니다.")).toBeInTheDocument();
      expect(screen.getByText("선택한 경로가 없습니다.")).toBeInTheDocument();
      expect(screen.getByText("역할에 연결된 활동이 없습니다.")).toBeInTheDocument();
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe("Home request state가 바뀌면", () => {
    it("initial loading과 Home-level error/retry를 표시한다", () => {
      query.state = { data: null, loading: true, error: null, reload: vi.fn() };
      const { rerender } = render(<HomeShell {...callbacks} />);
      expect(screen.getByText("홈을 불러오는 중…")).toBeInTheDocument();

      query.state = { data: null, loading: false, error: "Home unavailable", reload: vi.fn() };
      rerender(<HomeShell {...callbacks} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Home unavailable");
      fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
      expect(query.state.reload).toHaveBeenCalledOnce();
    });
  });

  it("semantic CSS로 compact dashboard를 한 열에 쌓고 Home inline style을 두지 않는다", () => {
    const source = readFileSync("features/home/HomeShell.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(source).not.toContain("style=");
    expect(css).toMatch(/@media \(min-width: 1200px\)[\s\S]*?\.lag-home-section-journey\s*\{[\s\S]*?grid-row: 1 \/ span 2/);
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.lag-home-grid\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.lag-home-role-summary,[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.lag-home-section-journal \.lag-home-list\s*\{[\s\S]*?grid-auto-flow: column;[\s\S]*?overflow-x: auto/);
  });
});
