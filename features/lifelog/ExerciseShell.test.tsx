import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("Exercise source surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchExercisesApi.mockResolvedValue([item]);
    api.getExerciseApi.mockResolvedValue(item);
    api.createExerciseApi.mockResolvedValue({ id: 99 });
    api.updateExerciseApi.mockResolvedValue({ ...item, distanceKm: 5, calories: 250, memo: null });
    api.deleteExerciseApi.mockResolvedValue({ id: item.id });
  });

  it("canonical filters/create fields와 supported partial update만 노출한다", async () => {
    render(<ExerciseShell />);
    await screen.findByTestId("exercise-entry");

    const filter = screen.getByLabelText("Category filter") as HTMLSelectElement;
    expect(Array.from(filter.options, ({ value }) => value).slice(1)).toEqual([...EXERCISE_CATEGORIES]);
    expect(screen.queryByText(/CARDIO|STRENGTH|STRETCHING|SPORTS/)).not.toBeInTheDocument();
    fireEvent.change(filter, { target: { value: "RUNNING" } });
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-08-14" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(api.searchExercisesApi).toHaveBeenLastCalledWith({ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 0, size: 20 }));

    fireEvent.click(screen.getByText("Add Exercise"));
    expect(screen.getByLabelText("Create category")).toBeRequired();
    expect(screen.getByLabelText("Duration minutes")).toBeRequired();
    expect(screen.getByLabelText("Exercised on")).toBeRequired();
    expect(screen.queryByLabelText(/intensity|duration$|calories burned|notes/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("exercise-entry"));
    await screen.findByText("Exercise source #41");
    expect(screen.getByText(/Blank numeric fields preserve/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Update category"), { target: { value: "YOGA" } });
    fireEvent.change(screen.getByLabelText("Update duration minutes"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Update distance km"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Update calories"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Update exercised on"), { target: { value: "2026-08-15" } });
    fireEvent.change(screen.getByLabelText("Update memo"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Exercise" }));

    await waitFor(() => expect(api.updateExerciseApi).toHaveBeenCalledWith(41, {
      category: "YOGA",
      durationMinutes: 45,
      exercisedOn: "2026-08-15",
      memo: "",
    }));
    expect(api.updateExerciseApi.mock.calls[0][1]).not.toHaveProperty("distanceKm");
    expect(api.updateExerciseApi.mock.calls[0][1]).not.toHaveProperty("calories");
  });
});
