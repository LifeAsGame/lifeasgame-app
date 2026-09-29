import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HobbyCatalogInfo, PlayerHobbyInfo } from "@/shared/api/types";
import HobbyShell from "./HobbyShell";

const api = vi.hoisted(() => ({ deletePlayerHobbyApi: vi.fn(), getHobbyCatalogApi: vi.fn(), getPlayerHobbiesApi: vi.fn(), registerPlayerHobbyApi: vi.fn(), updatePlayerHobbyApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({ default: ({ label, subtitle, onClick }: { label: string; subtitle: string; onClick: () => void }) => <button type="button" data-testid="hobby-entry" onClick={onClick}>{label} · {subtitle}</button> }));

const catalog: HobbyCatalogInfo[] = [{ hobbyId: 1, name: "Reading", category: "Learning" }, { hobbyId: 2, name: "Running", category: "Fitness" }];
const owned: PlayerHobbyInfo = { ...catalog[0], customName: "Books", detail: null, proficiency: 40, status: "PAUSED", startedOn: null, xp: 100 };

describe("취미 management surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getHobbyCatalogApi.mockResolvedValue(catalog);
    api.getPlayerHobbiesApi.mockResolvedValue([owned]);
  });

  it("빈 목록 클릭은 생성하지 않고 Alt+Enter·Escape가 같은 슬롯을 전환한다", async () => {
    api.getPlayerHobbiesApi.mockReset().mockResolvedValue([]);
    render(<HobbyShell />);
    await screen.findByText("등록된 취미가 없습니다.");
    const category = screen.getByRole("button", { name: "취미" });
    const slot = document.querySelector(".lag-create-slot");
    fireEvent.click(category);
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    fireEvent.keyDown(category, { key: "Enter", altKey: true });
    expect(document.querySelector("[data-create-form]")?.closest(".lag-create-slot")).toBe(slot);
    fireEvent.keyDown(document.querySelector("[data-create-form]")!, { key: "Escape" });
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    expect(screen.getByText("등록된 취미가 없습니다.")).toBeVisible();
  });

  it("canonical statuses, nullable fields와 catalog-only selector를 표시하고 stale values를 제거한다", async () => {
    render(<HobbyShell />);
    const entry = await screen.findByTestId("hobby-entry");
    expect(entry).toHaveTextContent("Reading · PAUSED · 40/100");
    expect(screen.queryByLabelText("취미")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "취미" }), { key: "Enter", altKey: true });
    expect(Array.from((screen.getByLabelText("취미") as HTMLSelectElement).options, ({ text }) => text)).toEqual(["선택…", "Running · Fitness"]);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(entry);
    expect(screen.getByText("시작일: 미등록")).toBeInTheDocument();
    expect(screen.getByText("미등록")).toBeInTheDocument();
    expect(Array.from((screen.getByLabelText("변경할 상태") as HTMLSelectElement).options, ({ value }) => value)).toEqual(["", "ACTIVE", "PAUSED", "DROPPED"]);
    expect(screen.queryByText(/ON_HOLD|INACTIVE/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
    expect(api.updatePlayerHobbyApi).not.toHaveBeenCalled();
  });
});
