import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HobbyCatalogInfo, PlayerHobbyInfo } from "@/shared/api/types";
import HobbyShell from "./HobbyShell";

const api = vi.hoisted(() => ({ deletePlayerHobbyApi: vi.fn(), getHobbyCatalogApi: vi.fn(), getPlayerHobbiesApi: vi.fn(), registerPlayerHobbyApi: vi.fn(), updatePlayerHobbyApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({ default: ({ label, subtitle, onClick }: { label: string; subtitle: string; onClick: () => void }) => <button type="button" data-testid="hobby-entry" onClick={onClick}>{label} · {subtitle}</button> }));

const catalog: HobbyCatalogInfo[] = [{ hobbyId: 1, name: "Reading", category: "Learning" }, { hobbyId: 2, name: "Running", category: "Fitness" }];
const owned: PlayerHobbyInfo = { ...catalog[0], customName: "Books", detail: null, proficiency: 40, status: "PAUSED", startedOn: null, xp: 100 };

describe("Hobby management surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getHobbyCatalogApi.mockResolvedValue(catalog);
    api.getPlayerHobbiesApi.mockResolvedValue([owned]);
  });

  it("canonical statuses, nullable fields와 catalog-only selector를 표시하고 stale values를 제거한다", async () => {
    render(<HobbyShell />);
    const entry = await screen.findByTestId("hobby-entry");
    expect(entry).toHaveTextContent("Reading · PAUSED · 40/100");
    expect(Array.from((screen.getByLabelText("Hobby") as HTMLSelectElement).options, ({ text }) => text)).toEqual(["Select...", "Running · Fitness"]);
    fireEvent.click(entry);
    expect(screen.getByText("Started: Not recorded")).toBeInTheDocument();
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
    expect(Array.from((screen.getByLabelText("New status") as HTMLSelectElement).options, ({ value }) => value)).toEqual(["", "ACTIVE", "PAUSED", "DROPPED"]);
    expect(screen.queryByText(/ON_HOLD|INACTIVE/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Update Hobby" }));
    expect(api.updatePlayerHobbyApi).not.toHaveBeenCalled();
  });
});
