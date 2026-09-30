import { answerDialog } from "@/shared/ui/dialogTest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXERCISE_CATEGORIES } from "@/shared/api/types";
import type { ExerciseInfo } from "@/shared/api/types";
import ExerciseShell from "./ExerciseShell";

const api = vi.hoisted(() => ({
  createExerciseApi: vi.fn(),
  deleteExerciseApi: vi.fn(),
  getExerciseApi: vi.fn(),
  searchExercisesApi: vi.fn(),
  updateExerciseApi: vi.fn(),
}));

vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, onClick }: { label: string; onClick: () => void }) => <button type="button" data-testid="exercise-entry" onClick={onClick}>{label}</button>,
}));

const item: ExerciseInfo = { id: 41, playerId: 7, category: "RUNNING", durationMinutes: 30, distanceKm: 5, calories: 250, exercisedOn: "2026-08-14", memo: "Morning run", createdAt: "2026-08-14T00:00:00Z", updatedAt: "2026-08-14T00:00:00Z" };

describe("운동 기록 source surface를 사용할 때", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchExercisesApi.mockResolvedValue([item]);
    api.getExerciseApi.mockResolvedValue(item);
    api.createExerciseApi.mockResolvedValue({ id: 99 });
    api.updateExerciseApi.mockResolvedValue({ ...item, distanceKm: 5, calories: 250, memo: null });
    api.deleteExerciseApi.mockResolvedValue(undefined);
  });

  it("빈 목록 클릭은 생성하지 않고 Alt+Enter·Escape가 같은 슬롯을 전환한다", async () => {
    api.searchExercisesApi.mockReset().mockResolvedValue([]);
    render(<ExerciseShell />);
    await screen.findByText("운동 기록이 없습니다.");
    const category = screen.getByRole("button", { name: "운동 기록" });
    const slot = document.querySelector(".lag-create-slot");
    fireEvent.click(category);
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    fireEvent.keyDown(category, { key: "Enter", altKey: true });
    expect(document.querySelector("[data-create-form]")?.closest(".lag-create-slot")).toBe(slot);
    fireEvent.keyDown(document.querySelector("[data-create-form]")!, { key: "Escape" });
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("운동 기록이 없습니다.")).toBeVisible());
  });

  it("canonical filters/create fields와 supported partial update만 노출한다", async () => {
    render(<ExerciseShell />);
    await screen.findByTestId("exercise-entry");

    const filter = screen.getByLabelText("분류 필터") as HTMLSelectElement;
    expect(Array.from(filter.options, ({ value }) => value).slice(1)).toEqual([...EXERCISE_CATEGORIES]);
    expect(screen.queryByText(/CARDIO|STRENGTH|STRETCHING|SPORTS/)).not.toBeInTheDocument();
    fireEvent.change(filter, { target: { value: "RUNNING" } });
    fireEvent.change(screen.getByLabelText("시작 날짜"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("종료 날짜"), { target: { value: "2026-08-14" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() => expect(api.searchExercisesApi).toHaveBeenLastCalledWith({ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 0, size: 20 }));

    fireEvent.keyDown(screen.getByRole("button", { name: "운동 기록" }), { key: "Enter", altKey: true });
    expect(screen.getByLabelText("등록할 분류")).toBeRequired();
    expect(screen.getByLabelText("운동 시간 (분)")).toBeRequired();
    expect(screen.getByLabelText("운동 날짜")).toBeRequired();
    expect(screen.queryByLabelText(/intensity|duration$|calories burned|notes/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    fireEvent.click(screen.getByTestId("exercise-entry"));
    await screen.findByText("운동 기록 #41");
    expect(screen.getByText(/빈 수치 항목/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("변경할 분류"), { target: { value: "YOGA" } });
    fireEvent.change(screen.getByLabelText("변경할 운동 시간 (분)"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("변경할 거리 (km)"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("변경할 칼로리"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("변경할 운동 날짜"), { target: { value: "2026-08-15" } });
    fireEvent.change(screen.getByLabelText("변경할 메모"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "운동 기록 저장" }));

    await waitFor(() => expect(api.updateExerciseApi).toHaveBeenCalledWith(41, {
      category: "YOGA",
      durationMinutes: 45,
      exercisedOn: "2026-08-15",
      memo: "",
    }));
    expect(api.updateExerciseApi.mock.calls[0][1]).not.toHaveProperty("distanceKm");
    expect(api.updateExerciseApi.mock.calls[0][1]).not.toHaveProperty("calories");
  });

  it("SAO confirm cancel leaves the row; confirmed 204 removes it without an error", async () => {
    api.searchExercisesApi.mockReset().mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
    render(<ExerciseShell />);
    fireEvent.click(await screen.findByTestId("exercise-entry"));
    await screen.findByText("운동 기록 #41");
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog(false);
    expect(api.deleteExerciseApi).not.toHaveBeenCalled();
    expect(screen.getByText("운동 기록 #41")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog();
    await waitFor(() => expect(api.deleteExerciseApi).toHaveBeenCalledWith(item.id));
    await waitFor(() => expect(screen.queryByTestId("exercise-entry")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelector('[data-stage-key="lifelog-exercise-detail"]')).toHaveAttribute("aria-hidden", "true");
  });
});
