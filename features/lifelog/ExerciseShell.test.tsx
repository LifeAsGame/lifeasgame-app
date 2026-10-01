import { answerDialog } from "@/shared/ui/dialogTest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { ExerciseInfo } from "@/shared/api/types";
import ExerciseShell from "./ExerciseShell";

const api = vi.hoisted(() => ({ createExerciseApi: vi.fn(), deleteExerciseApi: vi.fn(), getExerciseApi: vi.fn(), searchExercisesApi: vi.fn(), updateExerciseApi: vi.fn() }));
vi.mock("./api", () => api);
const item: ExerciseInfo = { id: 41, playerId: 7, category: "RUNNING", durationMinutes: 30, distanceKm: 0, calories: null, exercisedOn: "2026-08-14", memo: "Morning run", createdAt: "2026-08-14T00:00:00Z", updatedAt: "2026-08-14T00:00:00Z" };
beforeEach(() => {
  vi.clearAllMocks();
  api.searchExercisesApi.mockResolvedValue([item]);
  api.getExerciseApi.mockResolvedValue(item);
  api.createExerciseApi.mockResolvedValue({ id: 99 });
  api.updateExerciseApi.mockResolvedValue({ ...item, memo: null });
  api.deleteExerciseApi.mockResolvedValue(undefined);
});

it("실제 분류가 첫 패널이고 더블클릭은 목록 슬롯에서 생성한다", async () => {
  api.searchExercisesApi.mockResolvedValue([]);
  render(<ExerciseShell />);
  expect(screen.getByRole("button", { name: "달리기" })).toBeInTheDocument();
  expect(screen.queryByText("운동 기록이 없습니다.")).not.toBeInTheDocument();
  const category = screen.getByRole("button", { name: "달리기" });
  fireEvent.click(category, { detail: 0 });
  expect(await screen.findByText("운동 기록이 없습니다.")).toBeInTheDocument();
  fireEvent.keyDown(category, { key: "Enter", altKey: true });
  expect(within(document.querySelector('[data-stage-key="lifelog-exercise-list"]') as HTMLElement).getByRole("button", { name: "운동 기록 저장" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "운동 목록으로" }));
  expect(screen.queryByRole("button", { name: "운동 기록 저장" })).not.toBeInTheDocument();
});

it("기본 상세는 읽기 전용이고 0과 미등록을 구별하며 수정은 밀기로 연다", async () => {
  render(<ExerciseShell />);
  fireEvent.click(screen.getByRole("button", { name: "달리기" }), { detail: 0 });
  const row = await screen.findByRole("button", { name: /달리기 · 2026-08-14/ });
  fireEvent.click(row);
  const detail = document.querySelector('[data-stage-key="lifelog-exercise-detail"]') as HTMLElement;
  await within(detail).findByText("0 km");
  expect(within(detail).getByText("미등록")).toBeInTheDocument();
  expect(within(detail).queryByRole("spinbutton", { name: "운동 시간 (분)" })).not.toBeInTheDocument();
  fireEvent.keyDown(row, { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  fireEvent.change(await screen.findByRole("spinbutton", { name: "운동 시간 (분)" }), { target: { value: "45" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "거리 (km)" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "운동 기록 저장" }));
  await waitFor(() => expect(api.updateExerciseApi).toHaveBeenCalledWith(41, expect.objectContaining({ category: "RUNNING", durationMinutes: 45, exercisedOn: "2026-08-14", memo: "Morning run" })));
  expect(api.updateExerciseApi.mock.calls[0][1]).not.toHaveProperty("distanceKm");
});

it("삭제 취소와 확정된 204를 구분한다", async () => {
  api.searchExercisesApi.mockResolvedValueOnce([item]).mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
  render(<ExerciseShell />);
  fireEvent.click(screen.getByRole("button", { name: "달리기" }), { detail: 0 });
  const row = await screen.findByRole("button", { name: /달리기 · 2026-08-14/ });
  fireEvent.keyDown(row, { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  await answerDialog(false);
  expect(api.deleteExerciseApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  await answerDialog();
  await waitFor(() => expect(api.deleteExerciseApi).toHaveBeenCalledWith(41));
  await waitFor(() => expect(screen.queryByRole("button", { name: /달리기 · 2026-08-14/ })).not.toBeInTheDocument());
});
