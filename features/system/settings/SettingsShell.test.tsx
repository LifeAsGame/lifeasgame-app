import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserSettingsResponse } from "@/shared/api/types";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import SettingsShell from "./SettingsShell";

const api = vi.hoisted(() => ({ getSettingsApi: vi.fn(), updateSettingsApi: vi.fn() }));
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("@/lib/api/endpoints/settings.api", () => api);
vi.mock("@/context/ToastContext", () => ({ useToast: () => toast }));

const canonical: UserSettingsResponse = {
  userId: 7,
  volume: 70,
  uiLayoutJson: "layout",
  flagsJson: JSON.stringify({ graphicsQuality: "HIGH", inputPreset: "ADVANCED", uiScale: 125, futureFlag: "keep" }),
  updatedAt: "2026-08-18T00:00:00Z",
};

describe("System Options surface save timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.updateSettingsApi.mockReset();
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    api.getSettingsApi.mockResolvedValue(canonical);
  });

  it("keeps the failed draft open and closes only after a successful canonical response", async () => {
    api.updateSettingsApi.mockRejectedValueOnce(new Error("save failed")).mockResolvedValueOnce({ ...canonical, volume: 25 });
    render(<ThemeProvider><SettingsShell /></ThemeProvider>);
    expect(await screen.findByText("70%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "설정 수정" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "전체 음량" }), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "전체 음량" })).toHaveValue(25);

    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));
    await waitFor(() => expect(screen.queryByRole("spinbutton", { name: "전체 음량" })).not.toBeInTheDocument());
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledTimes(1);
  });

  it("keeps the Settings camera stable between summary and edit content", async () => {
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    render(<ThemeProvider><SettingsShell /></ThemeProvider>);
    expect(await screen.findByText("70%")).toBeInTheDocument();
    focus.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "설정 수정" }));

    expect(screen.getByRole("button", { name: "설정 저장" })).toBeInTheDocument();
    expect(focus).not.toHaveBeenCalled();
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });

  it("applies theme selection immediately and keeps it applied when focused persistence fails", async () => {
    api.updateSettingsApi.mockRejectedValueOnce(new Error("theme save failed"));
    render(<ThemeProvider><SettingsShell /></ThemeProvider>);
    expect(await screen.findByText("70%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /아스트랄/ }));
    expect(document.documentElement.dataset.theme).toBe("astral");
    expect(localStorage.getItem("lifeasgame.themePreference")).toBe("ASTRAL");
    expect(await screen.findByText("theme save failed")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /아스트랄/ })).toBeChecked();
    expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();

    const request = api.updateSettingsApi.mock.calls[0][0];
    expect(request).toEqual({ flagsJson: expect.any(String) });
    expect(JSON.parse(request.flagsJson)).toMatchObject({ themePreference: "ASTRAL", futureFlag: "keep" });
  });

  it("groups every canonical field without GoldRow and exposes only canonical theme choices", async () => {
    render(<ThemeProvider><SettingsShell /></ThemeProvider>);
    expect(await screen.findByRole("heading", { name: "기본 설정" })).toBeInTheDocument();

    for (const heading of ["화면", "소리", "그래픽과 플레이", "조작", "공개 범위", "알림", "언어"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["ASTRAL", "WARM_BEIGE", "SYSTEM"]);
    expect(screen.getByTestId("settings-shell")).toHaveTextContent(/테마[\s\S]*화면 크기[\s\S]*전체 음량[\s\S]*음성 채팅[\s\S]*그래픽 품질[\s\S]*피해량 숫자[\s\S]*파티클 효과[\s\S]*조작 방식[\s\S]*온라인 상태 표시[\s\S]*게임 알림[\s\S]*이메일 알림[\s\S]*언어/);
    expect(screen.getByTestId("settings-shell").querySelector(".lag-row")).toBeNull();
  });

  it("restores the canonical draft on Cancel and preserves integer volume validation", async () => {
    render(<ThemeProvider><SettingsShell /></ThemeProvider>);
    expect(await screen.findByText("70%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "설정 수정" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "전체 음량" }), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    fireEvent.click(screen.getByRole("button", { name: "설정 수정" }));
    expect(screen.getByRole("spinbutton", { name: "전체 음량" })).toHaveValue(70);
    fireEvent.change(screen.getByRole("spinbutton", { name: "전체 음량" }), { target: { value: "25.5" } });
    fireEvent.submit(screen.getByRole("button", { name: "설정 저장" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("0부터 100까지의 정수");
    expect(api.updateSettingsApi).not.toHaveBeenCalled();
  });

  it("keeps responsive Settings groups semantic and free of local visual inline styles", () => {
    const source = readFileSync("features/system/settings/SettingsShell.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(source).not.toContain("GoldRow");
    expect(source).not.toContain("style=");
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.lag-settings-group-grid[\s\S]*?grid-template-columns: 1fr/);
  });
});
