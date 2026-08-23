import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserSettingsResponse } from "@/shared/api/types";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
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
    fireEvent.click(screen.getByRole("button", { name: "Edit Settings" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Master Volume" }), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Master Volume" })).toHaveValue(25);

    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));
    await waitFor(() => expect(screen.queryByRole("spinbutton", { name: "Master Volume" })).not.toBeInTheDocument());
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledTimes(1);
  });

  it("applies theme selection immediately and keeps it applied when focused persistence fails", async () => {
    api.updateSettingsApi.mockRejectedValueOnce(new Error("theme save failed"));
    render(<ThemeProvider><SettingsShell /></ThemeProvider>);
    expect(await screen.findByText("70%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Astral Neutral/ }));
    expect(document.documentElement.dataset.theme).toBe("astral");
    expect(localStorage.getItem("lifeasgame.themePreference")).toBe("ASTRAL");
    expect(await screen.findByText("theme save failed")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Astral Neutral/ })).toBeChecked();
    expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();

    const request = api.updateSettingsApi.mock.calls[0][0];
    expect(request).toEqual({ flagsJson: expect.any(String) });
    expect(JSON.parse(request.flagsJson)).toMatchObject({ themePreference: "ASTRAL", futureFlag: "keep" });
  });

  it("groups every canonical field without GoldRow and exposes only canonical theme choices", async () => {
    render(<ThemeProvider><SettingsShell /></ThemeProvider>);
    expect(await screen.findByRole("heading", { name: "Preferences" })).toBeInTheDocument();

    for (const heading of ["Appearance", "Audio", "Display & Gameplay", "Controls", "Privacy & Presence", "Notifications", "Language"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["ASTRAL", "WARM_BEIGE", "SYSTEM"]);
    expect(screen.getByTestId("settings-shell")).toHaveTextContent(/Theme[\s\S]*UI Scale[\s\S]*Master Volume[\s\S]*Voice Chat[\s\S]*Graphics Quality[\s\S]*Damage Numbers[\s\S]*Particle Effects[\s\S]*Input Preset[\s\S]*Show Online Status[\s\S]*In-Game Notifications[\s\S]*Email Alerts[\s\S]*Language/);
    expect(screen.getByTestId("settings-shell").querySelector(".lag-row")).toBeNull();
  });

  it("restores the canonical draft on Cancel and preserves integer volume validation", async () => {
    render(<ThemeProvider><SettingsShell /></ThemeProvider>);
    expect(await screen.findByText("70%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Settings" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Master Volume" }), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Edit Settings" }));
    expect(screen.getByRole("spinbutton", { name: "Master Volume" })).toHaveValue(70);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Master Volume" }), { target: { value: "25.5" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Settings" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("whole number from 0 to 100");
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
