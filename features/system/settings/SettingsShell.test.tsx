import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserSettingsResponse } from "@/shared/api/types";
import SettingsShell from "./SettingsShell";

const api = vi.hoisted(() => ({ getSettingsApi: vi.fn(), updateSettingsApi: vi.fn() }));
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("@/lib/api/endpoints/settings.api", () => api);
vi.mock("@/context/ToastContext", () => ({ useToast: () => toast }));

const canonical: UserSettingsResponse = {
  userId: 7,
  volume: 70,
  uiLayoutJson: "layout",
  flagsJson: JSON.stringify({ graphicsQuality: "HIGH", inputPreset: "ADVANCED", uiScale: 125 }),
  updatedAt: "2026-08-18T00:00:00Z",
};

describe("System Options surface save timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getSettingsApi.mockResolvedValue(canonical);
  });

  it("keeps the failed draft open and closes only after a successful canonical response", async () => {
    api.updateSettingsApi.mockRejectedValueOnce(new Error("save failed")).mockResolvedValueOnce({ ...canonical, volume: 25 });
    render(<SettingsShell />);
    expect(await screen.findByText("Master Volume: 70%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "설정 편집" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Master Volume" }), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Master Volume" })).toHaveValue(25);

    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));
    await waitFor(() => expect(screen.queryByRole("spinbutton", { name: "Master Volume" })).not.toBeInTheDocument());
    expect(screen.getByText("Master Volume: 25%")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledTimes(1);
  });
});
